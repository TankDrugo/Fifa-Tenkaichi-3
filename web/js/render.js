// Strike Legends (browser) - drawing. The same sheets as the Godot game (archive game/assets/sprites):
// one byte a pixel, a palette index, coloured on the GPU by a palette row per player, as
// palette_sprite.gdshader does. The camera is the sheets' own: orthographic, 46 degrees down
// (archive tools/render_sprites.py, TILT), so a metre on the ground is S px across and S*sin(46) deep.
"use strict";

(function () {
  const SL = window.SL;
  const TILT = 46 * Math.PI / 180, SIN = Math.sin(TILT), COS = Math.cos(TILT);
  const SHEET_PPM = 67.06;
  const P = 44;                       // px per metre of the pre-drawn ground texture
  const X0 = -20, X1 = 20, Z0 = -15.5, Z1 = 11.5, YTOP = 7.0;
  const SKIN = [2, 6, 7, 11, 15], HAIR = [20, 22];
  // Skin and hair of a look; 8-13 are the lore peoples (data.js, LORE): alien, vampire, pirate,
  // dragon, robot, yeti.
  const LOOKS = [["#f6ece5", "#5f4133"], ["#f1d3b8", "#1e1a1a"], ["#e8c09a", "#d9b25a"], ["#c68e63", "#1e1a1a"],
    ["#f4dccb", "#b0502a"], ["#8d5a3b", "#1a1616"], ["#5e3a26", "#141212"], ["#d8a47f", "#7a5230"],
    ["#86dc72", "#1f3a24"], ["#ece6f2", "#151018"], ["#c99a6e", "#2a1c14"], ["#e0703f", "#5a1208"],
    ["#aab5c0", "#39434f"], ["#f4f7fb", "#dfe8f0"]];

  let gl, prog, buf, loc = {}, W = 1, H = 1, dpr = 1;
  const sheets = {};             // name -> {meta, tex, w, h}
  let palette = null, palTex = null, palRows = 1, paletteJson = null;
  let groundTex = null, groundW = 0, groundH = 0, frontTex = null, frontH = 0;
  let tex = {};                  // small RGBA textures: ball, shadow, ring, arrow, spark
  const cam = { x: 0, z: 0, S: 40, shake: 0 };

  const VS = `attribute vec2 a_pos; attribute vec2 a_uv; varying vec2 v_uv;
    void main(){ v_uv = a_uv; gl_Position = vec4(a_pos, 0.0, 1.0); }`;
  // A player's palette has two rows: the kit and the kit's second colour, which differ only on
  // the kit entries. u_pattern picks where the second shows, in pixels of the 128 px cell:
  // 1 stripes, 2 hoops, 3 sash, 4 a glow that pulses, 5 halves, 6 zigzag (data.js, kits).
  const FS = `precision mediump float; varying vec2 v_uv;
    uniform sampler2D u_tex; uniform sampler2D u_pal; uniform float u_mode; uniform float u_row;
    uniform float u_rows; uniform vec4 u_tint; uniform float u_pattern; uniform vec4 u_cell; uniform float u_time;
    void main(){
      if (u_mode < 0.5) { vec4 c = texture2D(u_tex, v_uv); gl_FragColor = c * u_tint; return; }
      float i = floor(texture2D(u_tex, v_uv).r * 255.0 + 0.5);
      if (i < 0.5) discard;
      vec4 c = texture2D(u_pal, vec2((i + 0.5) / 256.0, (u_row + 0.5) / u_rows));
      if (u_pattern > 0.5) {
        vec4 c2 = texture2D(u_pal, vec2((i + 0.5) / 256.0, (u_row + 1.5) / u_rows));
        vec2 px = (v_uv - u_cell.xy) / (u_cell.zw - u_cell.xy) * 128.0;
        float m = 0.0;
        if (u_pattern < 1.5) m = step(0.5, fract(px.x / 6.0));
        else if (u_pattern < 2.5) m = step(0.5, fract(px.y / 6.0));
        else if (u_pattern < 3.5) m = step(0.62, fract((px.x + px.y) / 16.0));
        else if (u_pattern < 4.5) m = 0.5 + 0.5 * sin(u_time * 4.0 + px.y * 0.35);
        else if (u_pattern < 5.5) m = step(64.0, px.x);
        else m = step(0.5, fract((px.y + abs(fract(px.x / 10.0) - 0.5) * 8.0) / 7.0));
        c = mix(c, c2, m);
      }
      gl_FragColor = vec4(mix(c.rgb, u_tint.rgb, 1.0 - u_tint.a), 1.0);
    }`;

  function shader(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  function init(canvas) {
    gl = canvas.getContext("webgl", { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error("WebGL non disponibile");
    prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    for (const n of ["a_pos", "a_uv"]) loc[n] = gl.getAttribLocation(prog, n);
    for (const n of ["u_tex", "u_pal", "u_mode", "u_row", "u_rows", "u_tint", "u_pattern", "u_cell", "u_time"]) loc[n] = gl.getUniformLocation(prog, n);
    buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(loc.a_pos); gl.enableVertexAttribArray(loc.a_uv);
    gl.vertexAttribPointer(loc.a_pos, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(loc.a_uv, 2, gl.FLOAT, false, 16, 8);
    gl.uniform1i(loc.u_tex, 0); gl.uniform1i(loc.u_pal, 1);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    makeSmallTextures();
  }

  function texFrom(source, nearest, format) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    const f = format || gl.RGBA;
    gl.texImage2D(gl.TEXTURE_2D, 0, f, f, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, nearest ? gl.NEAREST : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, nearest ? gl.NEAREST : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  function canvas2d(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; }

  function makeSmallTextures() {
    let [c, g] = canvas2d(64, 64);
    const grad = g.createRadialGradient(26, 24, 4, 32, 32, 30);
    grad.addColorStop(0, "#ffffff"); grad.addColorStop(0.75, "#e9ece6"); grad.addColorStop(1, "#9aa39a");
    g.fillStyle = grad; g.beginPath(); g.arc(32, 32, 30, 0, 7); g.fill();
    g.fillStyle = "#1e2422";
    for (const [x, y, r] of [[32, 30, 8], [14, 20, 6], [50, 22, 6], [20, 48, 6], [46, 48, 6]]) {
      g.beginPath(); for (let k = 0; k < 5; k++) { const a = k * 1.2566 - 1.57; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.fill();
    }
    g.strokeStyle = "#1e2422"; g.lineWidth = 2.5; g.beginPath(); g.arc(32, 32, 29, 0, 7); g.stroke();
    tex.ball = texFrom(c, false);
    [c, g] = canvas2d(64, 32);
    const sg = g.createRadialGradient(32, 16, 2, 32, 16, 30);
    sg.addColorStop(0, "rgba(10,20,12,0.55)"); sg.addColorStop(1, "rgba(10,20,12,0)");
    g.fillStyle = sg; g.save(); g.scale(1, 0.5); g.beginPath(); g.arc(32, 32, 31, 0, 7); g.fill(); g.restore();
    tex.shadow = texFrom(c, false);
    [c, g] = canvas2d(128, 64);
    g.strokeStyle = "#fff"; g.lineWidth = 7; g.beginPath(); g.ellipse(64, 32, 54, 24, 0, 0, 7); g.stroke();
    tex.ring = texFrom(c, false);
    [c, g] = canvas2d(64, 64);
    g.fillStyle = "#fff"; g.strokeStyle = "#111"; g.lineWidth = 5; g.lineJoin = "round";
    g.beginPath(); g.moveTo(10, 10); g.lineTo(54, 10); g.lineTo(32, 50); g.closePath(); g.stroke(); g.fill();
    tex.arrow = texFrom(c, false);
    [c, g] = canvas2d(32, 32);
    const pg = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    pg.addColorStop(0, "rgba(255,255,255,1)"); pg.addColorStop(0.4, "rgba(255,240,180,0.8)"); pg.addColorStop(1, "rgba(255,200,80,0)");
    g.fillStyle = pg; g.fillRect(0, 0, 32, 32);
    tex.spark = texFrom(c, false);
    [c, g] = canvas2d(4, 4); g.fillStyle = "#fff"; g.fillRect(0, 0, 4, 4);
    tex.white = texFrom(c, true);
  }

  // ---- Assets ------------------------------------------------------------------------
  function loadImage(src) {
    return new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error("immagine mancante: " + src)); i.src = src; });
  }

  async function load(base, onProgress) {
    const index = await (await fetch(base + "sheets.json")).json();
    paletteJson = await (await fetch(base + "palette.json")).json();
    const names = Object.keys(index);
    let done = 0;
    await Promise.all(names.map(async (name) => {
      const img = await loadImage(base + (index[name].src || name + ".png"));
      // The index byte is the same in R, G and B of a greyscale PNG; LUMINANCE keeps one.
      gl.activeTexture(gl.TEXTURE0);
      const t = texFrom(img, true, gl.LUMINANCE);
      sheets[name] = { meta: index[name], tex: t, w: img.width, h: img.height, img };
      done++; if (onProgress) onProgress(done / names.length);
    }));
  }

  // ---- Palettes: one row per (kit colour, look), as sprite_sheets.gd palette_texture ----
  function hexRgb(h) { return [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]; }
  function rgbHsv([r, g, b]) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0;
    if (d > 0) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; }
    return [((h / 6) + 1) % 1, mx > 0 ? d / mx : 0, mx];
  }
  function hsvRgb(h, s, v) {
    const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    return [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][((i % 6) + 6) % 6];
  }
  // The 256 colours of one (kit, look), as sprite_sheets.gd palette_texture: the kit's
  // entries take the kit's hue, keeping their brightness against the brightest of them.
  function paletteFor(kitHex, look) {
    const cols = paletteJson.colours, kit = paletteJson.kit;
    let top = 0; for (const i of kit) top = Math.max(top, rgbHsv(hexRgb(cols[i]))[2]);
    const tops = [SKIN, HAIR].map((g) => Math.max(...g.map((i) => rgbHsv(hexRgb(cols[i]))[2])));
    const t = rgbHsv(hexRgb(kitHex));
    const L = LOOKS[((look % LOOKS.length) + LOOKS.length) % LOOKS.length];
    const out = [];
    for (let i = 0; i < 256; i++) {
      if (i === 0 || !cols[i]) { out.push(null); continue; }
      let c = hexRgb(cols[i]);
      const hsv = rgbHsv(c);
      if (kit.includes(i)) {
        // A white kit keeps its shading bands with a floor, or it reads as grey.
        const v = t[1] < 0.15 ? Math.min(1, 0.55 + 0.45 * hsv[2] / top) * t[2] : t[2] * hsv[2] / top;
        c = hsvRgb(t[0], t[1], v);
      } else if (look) {
        for (let g = 0; g < 2; g++) if ([SKIN, HAIR][g].includes(i)) {
          const w = rgbHsv(hexRgb(L[g]));
          c = hsvRgb(w[0], w[1], Math.min(1, w[2] * hsv[2] / tops[g]));
        }
      }
      out.push(c);
    }
    return out;
  }

  // Two rows a player, the kit and its second colour: a player's palRow is 2 * its index.
  function setPalettes(rows) {
    palRows = rows.length * 2;
    const data = new Uint8Array(256 * palRows * 4);
    rows.forEach((row, r) => {
      [row.kit, row.kit2 || row.kit].forEach((kit, half) => paletteFor(kit, row.look).forEach((c, i) => {
        if (!c) return;
        const o = ((r * 2 + half) * 256 + i) * 4;
        data[o] = c[0] * 255; data[o + 1] = c[1] * 255; data[o + 2] = c[2] * 255; data[o + 3] = 255;
      }));
    });
    gl.activeTexture(gl.TEXTURE1);
    if (!palTex) palTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, palTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, palRows, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.activeTexture(gl.TEXTURE0);
  }

  // ---- The ground: pitch, boards, goals and surroundings, drawn once in the tilted view ----
  // A theme is everything around the 28 x 16 m rectangle and its surface: the play area, the
  // goals and the line markings keep their measures (docs/DETTAGLI.md, "Campi").
  const THEMES = {
    notte: { name: "Stadio di notte", sky: ["#050a14", "#13202c"], around: "#2b3b33", turf: "grass", grass: ["#3f8f3c", "#4a9c45"], line: "rgba(250,252,245,0.92)", far: "stand", ends: "stand", seats: ["#1d2833", "#222f3b"], light: "flood", boards: ["#10161f"] },
    giorno: { name: "Stadio di giorno", sky: ["#4d9bd6", "#cde7f6"], around: "#a8754f", turf: "grass", grass: ["#5aa845", "#68b650"], line: "rgba(255,255,255,0.95)", far: "stand", ends: "stand", seats: ["#6f7d8a", "#7b8996"], light: "sun", boards: ["#1d3a6b"], tint: [1, 0.97, 0.88, 0.05] },
    tramonto: { name: "Tramonto", sky: ["#3b2357", "#f08a4b"], around: "#5a4036", turf: "grass", grass: ["#4f8a3a", "#5a9542"], line: "rgba(255,240,225,0.92)", far: "stand", ends: "stand", seats: ["#3a2d3e", "#433446"], light: "sunset", boards: ["#2a1a2e"], tint: [1, 0.62, 0.35, 0.12] },
    spiaggia: { name: "Spiaggia", sky: ["#58b4e8", "#e2f4fb"], around: "#ecd9a2", turf: "sand", grass: ["#e9d397", "#e2ca88"], line: "rgba(40,110,200,0.9)", far: "sea", ends: "palms", light: "sun", boards: ["#f2f0e6"], tint: [1, 0.96, 0.85, 0.06] },
    neve: { name: "Campo innevato", sky: ["#5d6f86", "#c9d6e2"], around: "#d9e2ea", turf: "snow", grass: ["#eef3f7", "#e3eaf0"], line: "rgba(214,40,40,0.9)", far: "stand", ends: "stand", seats: ["#9aa8b5", "#a6b3bf"], snowSeats: true, light: "flood", boards: ["#2a3b55"], weather: "snow", tint: [0.85, 0.92, 1, 0.08] },
    strada: { name: "Gabbia di quartiere", sky: ["#1a1f33", "#4a3c5c"], around: "#2a2c31", turf: "asphalt", grass: ["#3c3f45", "#383b41"], line: "rgba(250,210,60,0.9)", far: "city", ends: "fence", light: "street", boards: ["#1c1d22"], tint: [0.8, 0.75, 1, 0.08] },
    // the lore teams' grounds (data.js, LORE)
    luna: { name: "Cratere Lunare", sky: ["#000000", "#0b0d1a"], around: "#55565d", turf: "regolith", grass: ["#8b8c93", "#83848b"], line: "rgba(110,255,220,0.95)", glowLine: "#3cffd0", far: "space", ends: "domes", light: "none", boards: ["#15171f"], tint: [0.75, 0.85, 1, 0.1], gravity: 0.6 },
    cimitero: { name: "Cimitero di Nottefonda", sky: ["#0c0614", "#3a1838"], around: "#1f1a22", turf: "deadgrass", grass: ["#2c3a2a", "#263324"], line: "rgba(225,215,255,0.8)", far: "castle", ends: "graves", light: "moon", boards: ["#1a0f1f"], weather: "mist", tint: [0.6, 0.45, 0.85, 0.16] },
    vulcano: { name: "Bocca del Vulcano", sky: ["#120403", "#5a1408"], around: "#2a1814", turf: "basalt", grass: ["#3b2b26", "#35261f"], line: "rgba(255,170,60,0.95)", glowLine: "#ff7a1a", far: "lava", ends: "rocks", light: "lava", boards: ["#1d0d08"], weather: "embers", tint: [1, 0.55, 0.3, 0.12] },
    fabbrica: { name: "Officina Neon", sky: ["#07080d", "#1b1f2c"], around: "#23262d", turf: "plates", grass: ["#59626e", "#535c67"], line: "rgba(255,70,200,0.95)", glowLine: "#ff3cc8", far: "factory", ends: "machines", light: "neon", boards: ["#101218"], tint: [0.7, 0.85, 1, 0.08] },
    nave: { name: "Ponte del Galeone", sky: ["#2c6fa8", "#b9def0"], around: "#2a5d84", turf: "planks", grass: ["#8a5a32", "#7e5130"], line: "rgba(255,248,230,0.92)", far: "ship", ends: "sea", light: "sun", boards: ["#4a2c17"], tint: [1, 0.95, 0.85, 0.05] },
    ghiacciaio: { name: "Ghiacciaio", sky: ["#9fc6e6", "#edf6fc"], around: "#cfe6f2", turf: "ice", grass: ["#bfe2f1", "#b4dbec"], line: "rgba(30,70,150,0.9)", far: "mountains", ends: "ice", light: "sun", boards: ["#e8f2f8"], weather: "snow", tint: [0.85, 0.95, 1, 0.08] },
  };
  let theme = THEMES.notte, themeId = "notte", ambient = null;

  function gx(x) { return (x - X0) * P; }
  function gy(z, y) { return (z - Z0) * SIN * P - (y || 0) * COS * P + YTOP * COS * P; }

  function buildGround(cfg, home, away, id) {
    themeId = THEMES[id] ? id : "notte"; theme = THEMES[themeId];
    const T = theme;
    // the theme's light on the players: a share of its colour mixed into every sprite pixel
    ambient = T.tint ? [T.tint[0], T.tint[1], T.tint[2], 1 - T.tint[3]] : null;
    const L = cfg.length / 2, Wd = cfg.width / 2, gw = cfg.goalWidth / 2, gh = cfg.goalHeight, gd = cfg.goalDepth;
    groundW = Math.ceil((X1 - X0) * P);
    groundH = Math.ceil(gy(Z1, 0));
    const [c, g] = canvas2d(groundW, groundH);
    const r = SL.rng(7);
    // Sky over the far side, then the ground around the pitch
    const sky = g.createLinearGradient(0, 0, 0, gy(-8.5, 0));
    sky.addColorStop(0, T.sky[0]); sky.addColorStop(1, T.sky[1]);
    g.fillStyle = sky; g.fillRect(0, 0, groundW, groundH);
    drawSkyDetail(g, r, T);
    g.fillStyle = T.around;
    g.fillRect(gx(X0), gy(-10.6), groundW, gy(Z1) - gy(-10.6));
    drawSurface(g, r, T, Wd);
    // Lines
    const line = (pts) => { g.beginPath(); pts.forEach(([x, z], i) => (i ? g.lineTo(gx(x), gy(z)) : g.moveTo(gx(x), gy(z)))); g.stroke(); };
    g.save();
    if (T.glowLine) { g.shadowColor = T.glowLine; g.shadowBlur = 0.35 * P; }
    g.strokeStyle = T.line; g.lineWidth = 0.1 * P;
    line([[-L, -Wd], [L, -Wd], [L, Wd], [-L, Wd], [-L, -Wd]]);
    line([[0, -Wd], [0, Wd]]);
    g.beginPath(); g.ellipse(gx(0), gy(0), 2.6 * P, 2.6 * P * SIN, 0, 0, 7); g.stroke();
    g.fillStyle = T.line;
    g.beginPath(); g.ellipse(gx(0), gy(0), 0.16 * P, 0.16 * P * SIN, 0, 0, 7); g.fill();
    for (const s of [-1, 1]) {
      line([[s * L, -4.2], [s * (L - 2.2), -4.2], [s * (L - 2.2), 4.2], [s * L, 4.2]]);
      g.beginPath(); g.ellipse(gx(s * (L - 2.2)), gy(0), 1.6 * P, 1.6 * P * SIN, 0, s > 0 ? Math.PI / 2 : -Math.PI / 2, s > 0 ? Math.PI * 1.5 : Math.PI / 2); g.stroke();
      g.beginPath(); g.ellipse(gx(s * (L - 3.4)), gy(0), 0.13 * P, 0.13 * P * SIN, 0, 0, 7); g.fill();
      for (const zc of [-1, 1]) { g.beginPath(); g.ellipse(gx(s * L), gy(zc * Wd), 0.6 * P, 0.6 * P * SIN, 0, 0, 7); g.stroke(); }
    }
    g.restore();
    // Centre logo on the surface
    g.save(); g.globalAlpha = 0.16; g.fillStyle = "#ffffff"; g.font = `800 ${Math.round(1.2 * P)}px "Saira Extra Condensed", "Arial Narrow", sans-serif`;
    g.textAlign = "center"; g.textBaseline = "middle"; g.translate(gx(0), gy(0)); g.scale(1, SIN); g.fillText(T.logo || "SL", 0, 0); g.restore();

    // Far boards (z = -Wd - 0.5): a 0,7 m wall with sponsor panels
    drawBoards(g, -Wd - 0.45, L + 0.6, home, away, true);
    // Side walls of the closed pitch, behind the goals (x = +/-(L + gd + 0.3))
    for (const s of [-1, 1]) {
      g.fillStyle = T.boards[0];
      const x = s * (L + gd + 0.35);
      g.beginPath(); g.moveTo(gx(x), gy(-Wd - 0.45, 0.7)); g.lineTo(gx(x), gy(Wd + 0.45, 0.7)); g.lineTo(gx(x), gy(Wd + 0.45, 0)); g.lineTo(gx(x), gy(-Wd - 0.45, 0)); g.closePath(); g.fill();
    }
    drawSurroundings(g, r, T, L, Wd, home, away);
    // Goals (nets behind, frame in front) - static, so drawn into the ground
    for (const s of [-1, 1]) drawGoal(g, s, L, gw, gh, gd);
    gl.activeTexture(gl.TEXTURE0);
    if (groundTex) gl.deleteTexture(groundTex);
    groundTex = texFrom(c, false);

    // The near boards, drawn over the players (nothing stands beyond them)
    frontH = Math.ceil(gy(Wd + 1.4) - gy(Wd + 0.1));
    const [fc, fg] = canvas2d(groundW, frontH);
    fg.translate(0, -gy(Wd + 0.1));
    drawBoards(fg, Wd + 0.5, L + 0.6, home, away, false);
    if (frontTex) gl.deleteTexture(frontTex);
    frontTex = texFrom(fc, false);
  }

  // The playing surface, 2 m beyond the lines on every side.
  function drawSurface(g, r, T, Wd) {
    const z0 = -Wd - 1.6, z1 = Wd + 1.6, top = gy(z0), h = gy(z1) - top;
    const [a, b] = T.grass;
    const dots = (n, cols, w, hh) => { for (let k = 0; k < n; k++) { const x = -16 + r() * 32, z = z0 + r() * (z1 - z0); g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(gx(x), gy(z), w, hh); } };
    const blot = (x, z, rad, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(gx(x), gy(z), rad * P, rad * P * SIN, 0, 0, 7); g.fill(); };
    if (T.turf === "grass" || T.turf === "deadgrass") {
      for (let i = 0; i < 18; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect(gx(-18 + i * 2), top, 2 * P + 1, h); }
      dots(9000, ["rgba(255,255,255,0.035)", "rgba(0,0,0,0.05)"], 2, 1);
      if (T.turf === "deadgrass") for (let k = 0; k < 40; k++) blot(-15 + r() * 30, z0 + r() * (z1 - z0), 0.4 + r() * 1.2, "rgba(60,45,40,0.22)");
    } else if (T.turf === "sand" || T.turf === "snow") {
      g.fillStyle = a; g.fillRect(gx(-18), top, 36 * P, h);
      dots(14000, T.turf === "sand" ? ["rgba(150,110,50,0.12)", "rgba(255,255,255,0.18)", "rgba(120,90,40,0.08)"] : ["rgba(150,175,200,0.14)", "rgba(255,255,255,0.5)"], 2, 2);
      for (let k = 0; k < 26; k++) blot(-15 + r() * 30, z0 + r() * (z1 - z0), 0.5 + r() * 1.4, T.turf === "sand" ? "rgba(200,170,110,0.18)" : "rgba(170,195,215,0.16)");
    } else if (T.turf === "asphalt") {
      g.fillStyle = a; g.fillRect(gx(-18), top, 36 * P, h);
      dots(12000, ["rgba(255,255,255,0.05)", "rgba(0,0,0,0.12)"], 2, 1);
      g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = 2;
      for (let k = 0; k < 14; k++) { let x = -15 + r() * 30, z = z0 + r() * (z1 - z0); g.beginPath(); g.moveTo(gx(x), gy(z)); for (let s = 0; s < 5; s++) { x += (r() - 0.5) * 1.6; z += (r() - 0.5) * 1.2; g.lineTo(gx(x), gy(z)); } g.stroke(); }
    } else if (T.turf === "regolith") {
      g.fillStyle = a; g.fillRect(gx(-18), top, 36 * P, h);
      dots(16000, ["rgba(255,255,255,0.08)", "rgba(0,0,0,0.1)"], 2, 2);
      for (let k = 0; k < 30; k++) {
        const x = -15 + r() * 30, z = z0 + r() * (z1 - z0), rad = 0.3 + r() * 1.1;
        blot(x, z, rad, "rgba(40,40,50,0.28)"); blot(x + rad * 0.12, z + rad * 0.15, rad * 0.82, b);
        g.strokeStyle = "rgba(255,255,255,0.18)"; g.lineWidth = 2; g.beginPath(); g.ellipse(gx(x), gy(z), rad * P, rad * P * SIN, 0, Math.PI * 0.1, Math.PI * 0.9); g.stroke();
      }
    } else if (T.turf === "basalt") {
      g.fillStyle = a; g.fillRect(gx(-18), top, 36 * P, h);
      dots(10000, ["rgba(0,0,0,0.18)", "rgba(255,120,60,0.05)"], 2, 2);
      g.save(); g.shadowColor = "#ff5a10"; g.shadowBlur = 10; g.strokeStyle = "rgba(255,110,30,0.75)"; g.lineWidth = 2.5;
      for (let k = 0; k < 18; k++) { let x = -15 + r() * 30, z = z0 + r() * (z1 - z0); g.beginPath(); g.moveTo(gx(x), gy(z)); for (let s = 0; s < 6; s++) { x += (r() - 0.5) * 1.4; z += (r() - 0.5) * 1.0; g.lineTo(gx(x), gy(z)); } g.stroke(); }
      g.restore();
    } else if (T.turf === "plates") {
      for (let i = 0; i < 18; i++) for (let j = 0; j < 10; j++) {
        const x = -18 + i * 2, z = z0 + j * 2;
        g.fillStyle = (i + j) % 2 ? a : b; g.fillRect(gx(x), gy(z), 2 * P + 1, gy(z + 2) - gy(z) + 1);
        g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(gx(x), gy(z), 2 * P, 2); g.fillRect(gx(x), gy(z), 2, gy(z + 2) - gy(z));
        g.fillStyle = "rgba(255,255,255,0.25)"; for (const [dx, dz] of [[0.2, 0.2], [1.8, 0.2], [0.2, 1.8], [1.8, 1.8]]) g.fillRect(gx(x + dx) - 2, gy(z + dz) - 1, 4, 3);
      }
      dots(5000, ["rgba(255,255,255,0.04)", "rgba(0,0,0,0.08)"], 3, 1);
    } else if (T.turf === "planks") {
      for (let j = 0; j < 40; j++) {
        const z = z0 + j * 0.5;
        g.fillStyle = j % 2 ? a : b; g.fillRect(gx(-18), gy(z), 36 * P, gy(z + 0.5) - gy(z) + 1);
        g.fillStyle = "rgba(40,20,8,0.5)"; g.fillRect(gx(-18), gy(z), 36 * P, 1.5);
        for (let x = -18 + r() * 3; x < 18; x += 2.5 + r() * 3) { g.fillRect(gx(x), gy(z), 2, gy(z + 0.5) - gy(z)); g.fillStyle = "rgba(30,15,5,0.6)"; g.fillRect(gx(x + 0.15) - 1, gy(z + 0.25) - 1, 3, 2); g.fillStyle = "rgba(40,20,8,0.5)"; }
      }
      dots(8000, ["rgba(255,230,190,0.05)", "rgba(40,20,8,0.07)"], 3, 1);
    } else if (T.turf === "ice") {
      const ig = g.createLinearGradient(gx(-18), top, gx(18), top + h);
      ig.addColorStop(0, a); ig.addColorStop(0.5, "#d4eef8"); ig.addColorStop(1, b);
      g.fillStyle = ig; g.fillRect(gx(-18), top, 36 * P, h);
      g.strokeStyle = "rgba(255,255,255,0.55)"; g.lineWidth = 1.5;
      for (let k = 0; k < 22; k++) { let x = -15 + r() * 30, z = z0 + r() * (z1 - z0); g.beginPath(); g.moveTo(gx(x), gy(z)); for (let s = 0; s < 4; s++) { x += (r() - 0.5) * 2.2; z += (r() - 0.5) * 1.4; g.lineTo(gx(x), gy(z)); } g.stroke(); }
      dots(4000, ["rgba(255,255,255,0.4)"], 2, 1);
    }
  }

  // Far away, above the stands: stars, moons, planets.
  // The band of sky the cameras reach: from z = -14,2 m at ground height down to the boards.
  function drawSkyDetail(g, r, T) {
    const hor = gy(-8.5, 0), band = gy(-13.6, 0);
    if (["space", "castle", "lava", "factory", "city"].includes(T.far)) {
      for (let k = 0; k < (T.far === "space" ? 420 : 140); k++) { g.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.7})`; const s = r() < 0.1 ? 3 : 2; g.fillRect(r() * groundW, r() * hor * 0.9, s, s); }
    }
    if (T.far === "space") {
      const ex = groundW * 0.78, ey = band, er = 46;
      const eg = g.createRadialGradient(ex - 20, ey - 20, 10, ex, ey, er);
      eg.addColorStop(0, "#9fd4ff"); eg.addColorStop(0.6, "#2f6fc0"); eg.addColorStop(1, "#0c2350");
      g.fillStyle = eg; g.beginPath(); g.arc(ex, ey, er, 0, 7); g.fill();
      g.fillStyle = "rgba(90,170,90,0.85)"; for (const [dx, dy, rr] of [[-20, -10, 22], [18, 14, 16], [-6, 30, 12]]) { g.beginPath(); g.arc(ex + dx, ey + dy, rr, 0, 7); g.fill(); }
      g.fillStyle = "rgba(255,255,255,0.5)"; g.beginPath(); g.ellipse(ex + 10, ey - 30, 34, 8, 0.2, 0, 7); g.fill();
    }
    if (T.far === "castle" || T.light === "moon") {
      const mx = groundW * 0.2, my = band;
      const mg = g.createRadialGradient(mx, my, 10, mx, my, 120);
      mg.addColorStop(0, "rgba(255,90,90,0.5)"); mg.addColorStop(1, "rgba(255,90,90,0)");
      g.fillStyle = mg; g.fillRect(mx - 120, my - 120, 240, 240);
      g.fillStyle = "#e8443f"; g.beginPath(); g.arc(mx, my, 34, 0, 7); g.fill();
      g.fillStyle = "rgba(120,20,30,0.35)"; for (const [dx, dy, rr] of [[-12, -8, 9], [14, 10, 7], [4, -20, 5]]) { g.beginPath(); g.arc(mx + dx, my + dy, rr, 0, 7); g.fill(); }
    }
    if (T.light === "sun" || T.light === "sunset") {
      const sx0 = groundW * (T.light === "sunset" ? 0.5 : 0.85), sy0 = T.light === "sunset" ? hor - 10 : band;
      const sg = g.createRadialGradient(sx0, sy0, 10, sx0, sy0, T.light === "sunset" ? 260 : 160);
      sg.addColorStop(0, T.light === "sunset" ? "rgba(255,210,120,0.95)" : "rgba(255,255,230,0.95)"); sg.addColorStop(1, "rgba(255,230,180,0)");
      g.fillStyle = sg; g.fillRect(sx0 - 260, sy0 - 260, 520, 520);
      if (T.light === "sun") for (let k = 0; k < 6; k++) { g.fillStyle = "rgba(255,255,255,0.75)"; const cx = r() * groundW, cy = band - 30 + r() * 60; for (let j = 0; j < 4; j++) { g.beginPath(); g.ellipse(cx + j * 26, cy + (j % 2) * 6, 34, 14, 0, 0, 7); g.fill(); } }
    }
  }

  function drawSurroundings(g, r, T, L, Wd, home, away) {
    const far = T.far, ends = T.ends;
    if (far === "stand") drawStand(g, r, -Wd - 1.2, -Wd - 6.8, -L - 3, L + 3, home, away, T);
    else if (far === "sea" || far === "ship") drawSea(g, r, Wd, far === "ship");
    else if (far === "city") drawCity(g, r, Wd, L);
    else if (far === "space") drawCraterRim(g, r, Wd);
    else if (far === "castle") drawCastle(g, r, Wd);
    else if (far === "lava") drawVolcano(g, r, Wd);
    else if (far === "factory") drawFactory(g, r, Wd, L);
    else if (far === "mountains") drawMountains(g, r, Wd);
    for (const s of [-1, 1]) {
      if (ends === "stand") drawEndStand(g, r, s, L, Wd, s < 0 ? home : away, T);
      else drawEnd(g, r, s, L, Wd, ends, T);
    }
    // Lights
    if (T.light === "flood") for (const [x, z] of [[-L - 4, -Wd - 2.5], [L + 4, -Wd - 2.5]]) glow(g, gx(x), gy(z, 4), 6 * P, "255,255,235", 0.55);
    if (T.light === "street") for (let x = -L; x <= L; x += 7) { g.fillStyle = "#15161b"; g.fillRect(gx(x) - 3, gy(-Wd - 1.4, 3.4), 6, gy(-Wd - 1.4, 0) - gy(-Wd - 1.4, 3.4)); glow(g, gx(x), gy(-Wd - 1.4, 3.4), 2.5 * P, "255,200,120", 0.6); }
    if (T.light === "neon") for (const [x, col] of [[-9, "255,60,200"], [0, "60,220,255"], [9, "255,60,200"]]) glow(g, gx(x), gy(-Wd - 2, 2.5), 5 * P, col, 0.35);
    if (T.light === "lava") glow(g, gx(0), gy(-Wd - 2.2, 3), 12 * P, "255,90,20", 0.35);
  }

  function glow(g, x, y, rad, rgb, a) {
    const lg = g.createRadialGradient(x, y, 2, x, y, rad);
    lg.addColorStop(0, `rgba(${rgb},${a})`); lg.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = lg; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }

  function drawSea(g, r, Wd, ship) {
    const zFront = -Wd - 1.2, zHor = -Wd - 7.5;
    // sand strip, then water to the horizon
    g.fillStyle = ship ? "#6b4424" : "#ecd9a2"; g.fillRect(0, gy(zFront - 0.6), groundW, gy(zFront + 0.4) - gy(zFront - 0.6));
    const sea = g.createLinearGradient(0, gy(zHor, 0), 0, gy(zFront - 0.6));
    sea.addColorStop(0, "#1f6fa8"); sea.addColorStop(1, "#46b3d6");
    g.fillStyle = sea; g.fillRect(0, gy(zHor, 0), groundW, gy(zFront - 0.6) - gy(zHor, 0));
    g.strokeStyle = "rgba(255,255,255,0.55)"; g.lineWidth = 2;
    for (let k = 0; k < 60; k++) { const x = r() * groundW, y = gy(zHor, 0) + r() * (gy(zFront - 0.6) - gy(zHor, 0)); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - 4, x + 20, y); g.stroke(); }
    if (ship) {
      // the galleon's rail and two masts with sails
      g.fillStyle = "#4a2c17"; g.fillRect(0, gy(zFront, 1.0), groundW, gy(zFront, 0) - gy(zFront, 1.0));
      g.fillStyle = "#6e4426"; for (let x = -19; x < 20; x += 1.2) g.fillRect(gx(x), gy(zFront, 1.0), 6, gy(zFront, 0) - gy(zFront, 1.0));
      for (const mx of [-7, 7]) {
        g.fillStyle = "#3a2213"; g.fillRect(gx(mx) - 6, gy(zFront - 0.5, 5.2), 12, gy(zFront - 0.5, 0) - gy(zFront - 0.5, 5.2));
        for (const [h0, w] of [[4.8, 4], [3.1, 5]]) { g.fillStyle = "#f3ead2"; g.beginPath(); g.moveTo(gx(mx - w / 2), gy(zFront - 0.5, h0)); g.quadraticCurveTo(gx(mx), gy(zFront - 1.2, h0 - 0.5), gx(mx + w / 2), gy(zFront - 0.5, h0)); g.lineTo(gx(mx + w / 2), gy(zFront - 0.5, h0 - 1.4)); g.quadraticCurveTo(gx(mx), gy(zFront - 1.6, h0 - 1.9), gx(mx - w / 2), gy(zFront - 0.5, h0 - 1.4)); g.closePath(); g.fill(); }
        g.fillStyle = "#151515"; g.fillRect(gx(mx) - 18, gy(zFront - 0.5, 5.9), 36, 22);
        g.fillStyle = "#f3ead2"; g.beginPath(); g.arc(gx(mx), gy(zFront - 0.5, 5.9) + 9, 5, 0, 7); g.fill();
      }
    } else {
      for (let k = 0; k < 6; k++) { // umbrellas on the strip
        const x = -18 + k * 7 + r() * 2;
        g.fillStyle = "#e9e3cf"; g.fillRect(gx(x) - 2, gy(zFront - 0.2, 2), 4, gy(zFront - 0.2, 0) - gy(zFront - 0.2, 2));
        g.fillStyle = ["#e23b2e", "#2d6ce0", "#f2c935"][k % 3]; g.beginPath(); g.ellipse(gx(x), gy(zFront - 0.2, 2), 1.1 * P, 0.45 * P, 0, Math.PI, 0); g.fill();
      }
    }
  }

  function drawCity(g, r, Wd, L) {
    const z = -Wd - 1.6;
    for (let x = -21; x < 21;) {
      const w = 2 + r() * 3.5, h = 2.5 + r() * 3.5;
      g.fillStyle = ["#1d2033", "#232640", "#191b2c"][Math.floor(r() * 3)];
      g.fillRect(gx(x), gy(z - 1.2, h), w * P, gy(z - 1.2, 0) - gy(z - 1.2, h));
      for (let wy = 0.6; wy < h - 0.4; wy += 0.8) for (let wx = 0.4; wx < w - 0.4; wx += 0.9) if (r() < 0.45) { g.fillStyle = r() < 0.8 ? "rgba(255,210,120,0.85)" : "rgba(140,200,255,0.8)"; g.fillRect(gx(x + wx), gy(z - 1.2, wy + 0.4), 0.35 * P, 0.3 * P * COS); }
      x += w + 0.3;
    }
    drawFence(g, z, -L - 1.5, L + 1.5);
    // a few people leaning on the fence
    for (let x = -L; x < L; x += 0.9 + r() * 1.4) { g.fillStyle = ["#e23b2e", "#2d6ce0", "#2fa35a", "#f2c935", "#eef1f4", "#7a3fc2"][Math.floor(r() * 6)]; g.fillRect(gx(x) - 5, gy(z - 0.2, 1.3), 10, 16); g.fillStyle = ["#f1d3b8", "#c68e63", "#8d5a3b"][Math.floor(r() * 3)]; g.beginPath(); g.arc(gx(x), gy(z - 0.2, 1.55), 5, 0, 7); g.fill(); }
  }

  function drawFence(g, z, xa, xb) {
    g.strokeStyle = "rgba(190,200,210,0.55)"; g.lineWidth = 1;
    for (let x = xa; x < xb; x += 0.35) { g.beginPath(); g.moveTo(gx(x), gy(z, 0)); g.lineTo(gx(x + 0.35), gy(z, 2.6)); g.moveTo(gx(x + 0.35), gy(z, 0)); g.lineTo(gx(x), gy(z, 2.6)); g.stroke(); }
    g.fillStyle = "#5a6068"; for (let x = xa; x <= xb; x += 3) g.fillRect(gx(x) - 2, gy(z, 2.8), 4, gy(z, 0) - gy(z, 2.8));
    g.fillRect(gx(xa), gy(z, 2.8), (xb - xa) * P, 3);
  }

  function drawCraterRim(g, r, Wd) {
    const z = -Wd - 1.4;
    g.fillStyle = "#6b6c74"; g.beginPath(); g.moveTo(0, gy(z, 0));
    for (let x = -21; x <= 21; x += 1) g.lineTo(gx(x), gy(z - 2, 1.5 + Math.sin(x * 0.7) * 0.8 + r() * 1.2));
    g.lineTo(groundW, gy(z, 0)); g.closePath(); g.fill();
    g.fillStyle = "#4f5058"; g.beginPath(); g.moveTo(0, gy(z, 0));
    for (let x = -21; x <= 21; x += 1.5) g.lineTo(gx(x), gy(z - 1, 0.7 + r() * 0.8));
    g.lineTo(groundW, gy(z, 0)); g.closePath(); g.fill();
    // a lander and an antenna
    g.fillStyle = "#c9ced8"; g.fillRect(gx(-6), gy(z - 2.5, 3.2), 2.2 * P, gy(z - 2.5, 1.6) - gy(z - 2.5, 3.2));
    g.strokeStyle = "#c9ced8"; g.lineWidth = 3; g.beginPath(); g.moveTo(gx(-6), gy(z - 2.5, 1.6)); g.lineTo(gx(-6.6), gy(z - 2.5, 0.6)); g.moveTo(gx(-3.8), gy(z - 2.5, 1.6)); g.lineTo(gx(-3.2), gy(z - 2.5, 0.6)); g.stroke();
    g.fillStyle = "#f2c935"; g.fillRect(gx(-5.6), gy(z - 2.5, 2.9), 0.6 * P, 0.3 * P);
    g.strokeStyle = "#9aa0aa"; g.beginPath(); g.moveTo(gx(8), gy(z - 2, 0.5)); g.lineTo(gx(8), gy(z - 2, 5)); g.stroke();
    glow(g, gx(8), gy(z - 2, 5), 0.6 * P, "255,60,60", 0.9);
  }

  function drawCastle(g, r, Wd) {
    const z = -Wd - 2;
    g.fillStyle = "#120a18";
    // hills, then the castle on top
    g.beginPath(); g.moveTo(0, gy(-Wd - 1.4, 0));
    for (let x = -21; x <= 21; x += 1) g.lineTo(gx(x), gy(z, 0.6 + Math.cos(x * 0.25) * 0.5));
    g.lineTo(groundW, gy(-Wd - 1.4, 0)); g.closePath(); g.fill();
    const tower = (x, w, h, cone) => { g.fillRect(gx(x - w / 2), gy(z, h), w * P, gy(z, 1) - gy(z, h)); if (cone) { g.beginPath(); g.moveTo(gx(x - w / 2 - 0.2), gy(z, h)); g.lineTo(gx(x), gy(z, h + w * 1.6)); g.lineTo(gx(x + w / 2 + 0.2), gy(z, h)); g.fill(); } };
    g.fillStyle = "#1c1024";
    tower(0, 7, 2.6, false); tower(-4, 1.4, 3.4, true); tower(4, 1.4, 3.4, true); tower(-1, 1.0, 4.0, true); tower(2, 0.9, 3.2, true);
    for (let x = -3.4; x < 3.6; x += 0.7) g.fillRect(gx(x), gy(z, 2.85), 0.4 * P, gy(z, 2.6) - gy(z, 2.85));
    for (const [x, h] of [[-4, 2.9], [4, 3.0], [-1, 3.5], [0.8, 1.8], [-2.2, 2.0], [2.4, 1.5]]) { g.fillStyle = "rgba(255,190,90,0.9)"; g.fillRect(gx(x) - 3, gy(z, h), 6, 8); }
    // bats
    g.fillStyle = "#0a0510";
    for (let k = 0; k < 12; k++) { const x = r() * groundW, y = gy(-13.8, 0) + r() * 60; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x - 7, y - 7, x - 12, y - 1); g.quadraticCurveTo(x - 6, y - 2, x, y + 3); g.quadraticCurveTo(x + 6, y - 2, x + 12, y - 1); g.quadraticCurveTo(x + 7, y - 7, x, y); g.fill(); }
    // iron railings in front
    g.fillStyle = "#0e0a12"; for (let x = -21; x < 21; x += 0.45) g.fillRect(gx(x), gy(-Wd - 1.4, 1.6), 3, gy(-Wd - 1.4, 0) - gy(-Wd - 1.4, 1.6));
    g.fillRect(0, gy(-Wd - 1.4, 1.4), groundW, 3);
  }

  function drawVolcano(g, r, Wd) {
    const z = -Wd - 2.2;
    g.fillStyle = "#1c0d09";
    g.beginPath(); g.moveTo(gx(-21), gy(z, 0)); g.lineTo(gx(-6), gy(z, 3.6)); g.lineTo(gx(-2), gy(z, 4.2)); g.lineTo(gx(2), gy(z, 4.0)); g.lineTo(gx(7), gy(z, 3.3)); g.lineTo(gx(21), gy(z, 0.6)); g.lineTo(gx(21), gy(-Wd - 1.4, 0)); g.lineTo(gx(-21), gy(-Wd - 1.4, 0)); g.closePath(); g.fill();
    glow(g, gx(-0.5), gy(z, 4.2), 4 * P, "255,120,30", 0.75);
    g.save(); g.shadowColor = "#ff6a10"; g.shadowBlur = 14; g.strokeStyle = "#ff8a20"; g.lineWidth = 5;
    for (const [x0, dx] of [[-2, -5], [0.5, 3], [1.5, 8]]) { g.beginPath(); g.moveTo(gx(x0), gy(z, 4.0)); g.quadraticCurveTo(gx(x0 + dx * 0.4), gy(z, 2.4), gx(x0 + dx), gy(z, 0.6)); g.stroke(); }
    g.restore();
    // lava moat in front of the far boards
    const lg = g.createLinearGradient(0, gy(-Wd - 2.6), 0, gy(-Wd - 1.2));
    lg.addColorStop(0, "#ff4a10"); lg.addColorStop(0.5, "#ffb020"); lg.addColorStop(1, "#ff5a10");
    g.fillStyle = lg; g.fillRect(0, gy(-Wd - 2.6), groundW, gy(-Wd - 1.2) - gy(-Wd - 2.6));
    g.fillStyle = "rgba(60,15,5,0.6)"; for (let k = 0; k < 40; k++) { g.beginPath(); g.ellipse(r() * groundW, gy(-Wd - 2.6) + r() * (gy(-Wd - 1.2) - gy(-Wd - 2.6)), 6 + r() * 14, 3 + r() * 4, 0, 0, 7); g.fill(); }
  }

  function drawFactory(g, r, Wd, L) {
    const z = -Wd - 2;
    g.fillStyle = "#14171f"; g.fillRect(0, gy(z, 4.6), groundW, gy(-Wd - 1.4, 0) - gy(z, 4.6));
    // pipes, a gear, chimneys
    g.strokeStyle = "#2f3542"; g.lineWidth = 0.5 * P;
    for (const h of [1.2, 2.5, 3.6]) { g.beginPath(); g.moveTo(0, gy(z, h)); g.lineTo(groundW, gy(z, h)); g.stroke(); }
    g.strokeStyle = "#3a4252"; g.lineWidth = 0.3 * P; for (let x = -18; x < 19; x += 6) { g.beginPath(); g.moveTo(gx(x), gy(z, 4.6)); g.lineTo(gx(x), gy(z, 0)); g.stroke(); }
    const gear = (x, y, rad) => { g.fillStyle = "#262c38"; g.beginPath(); for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, rr = k % 2 ? rad : rad * 0.82; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); g.fillStyle = "#14171f"; g.beginPath(); g.arc(x, y, rad * 0.3, 0, 7); g.fill(); };
    gear(gx(-11), gy(z, 2.6), 1.4 * P); gear(gx(12), gy(z, 2.2), 1.0 * P);
    // neon signs
    g.save(); g.font = `800 ${Math.round(1.1 * P)}px "Saira Extra Condensed", "Arial Narrow", sans-serif`; g.textAlign = "center";
    for (const [x, t, col] of [[-3, "OFFICINA", "#ff3cc8"], [5, "VOLT", "#3cdcff"]]) { g.shadowColor = col; g.shadowBlur = 18; g.fillStyle = col; g.fillText(t, gx(x), gy(z, 1.9)); }
    g.restore();
    for (let x = -L; x < L; x += 2.5) { g.fillStyle = "#1e222c"; g.fillRect(gx(x), gy(-Wd - 1.6, 1.4), 1.6 * P, gy(-Wd - 1.6, 0) - gy(-Wd - 1.6, 1.4)); g.fillStyle = r() < 0.5 ? "#ff3cc8" : "#3cdcff"; g.fillRect(gx(x + 0.3), gy(-Wd - 1.6, 1.1), 0.25 * P, 0.15 * P); }
  }

  function drawMountains(g, r, Wd) {
    const z = -Wd - 2.5;
    for (const [col, base, amp, cap] of [["#8fa9c4", 2.2, 2.2, true], ["#6f8aa8", 0.8, 1.6, true]]) {
      g.fillStyle = col; g.beginPath(); g.moveTo(0, gy(-Wd - 1.4, 0));
      const pts = [];
      for (let x = -21; x <= 21; x += 3) pts.push([x, base + r() * amp]);
      for (const [x, h] of pts) g.lineTo(gx(x), gy(z, h));
      g.lineTo(groundW, gy(-Wd - 1.4, 0)); g.closePath(); g.fill();
      if (cap) { g.fillStyle = "rgba(255,255,255,0.9)"; for (let i = 1; i < pts.length - 1; i++) { const [x, h] = pts[i]; if (h > pts[i - 1][1] && h > pts[i + 1][1]) { g.beginPath(); g.moveTo(gx(x), gy(z, h)); g.lineTo(gx(x - 0.7), gy(z, h - 0.6)); g.lineTo(gx(x + 0.7), gy(z, h - 0.6)); g.fill(); } } }
    }
    g.fillStyle = "#e6f2f9"; g.fillRect(0, gy(-Wd - 2.2, 0), groundW, gy(-Wd - 1.2) - gy(-Wd - 2.2, 0));
    for (let k = 0; k < 9; k++) { const x = -19 + k * 4.6 + r(); g.fillStyle = "#cfe8f5"; g.fillRect(gx(x), gy(-Wd - 2, 1.4), 1.6 * P, gy(-Wd - 2, 0) - gy(-Wd - 2, 1.4)); g.fillStyle = "rgba(255,255,255,0.7)"; g.fillRect(gx(x), gy(-Wd - 2, 1.4), 1.6 * P, 4); }
  }

  // Behind each goal when there is no stand.
  function drawEnd(g, r, s, L, Wd, kind, T) {
    for (let i = 0; i < 9; i++) {
      const x = s * (L + 2.6 + (i % 3) * 1.4 + r() * 0.5), z = -Wd + 1 + (i * 1.9) % (2 * Wd - 1);
      const X = gx(x), Y = gy(z);
      if (kind === "palms") {
        g.strokeStyle = "#7a5530"; g.lineWidth = 6; g.beginPath(); g.moveTo(X, Y); g.quadraticCurveTo(X + s * 14, gy(z, 2.5), X + s * 6, gy(z, 4.2)); g.stroke();
        g.fillStyle = "#2f8a3e"; for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; g.beginPath(); g.ellipse(X + s * 6 + Math.cos(a) * 22, gy(z, 4.2) + Math.sin(a) * 8, 26, 7, a, 0, 7); g.fill(); }
      } else if (kind === "fence") {
        if (i === 0) drawFenceEnd(g, s, L, Wd);
      } else if (kind === "domes") {
        if (i % 3) continue;
        g.fillStyle = "rgba(170,220,255,0.35)"; g.strokeStyle = "rgba(200,240,255,0.8)"; g.lineWidth = 2;
        g.beginPath(); g.ellipse(X, Y, 1.5 * P, 1.3 * P, 0, Math.PI, 0); g.fill(); g.stroke();
        g.fillStyle = "rgba(255,240,170,0.8)"; g.fillRect(X - 6, Y - 22, 12, 10);
      } else if (kind === "graves") {
        g.fillStyle = "#3b3a44"; g.beginPath(); g.moveTo(X - 12, Y); g.lineTo(X - 12, Y - 26); g.arc(X, Y - 26, 12, Math.PI, 0); g.lineTo(X + 12, Y); g.closePath(); g.fill();
        g.fillStyle = "#24232b"; g.fillRect(X - 2, Y - 30, 4, 18); g.fillRect(X - 7, Y - 25, 14, 4);
        if (i === 4) { g.strokeStyle = "#140c16"; g.lineWidth = 5; g.beginPath(); g.moveTo(X + s * 30, Y + 10); g.lineTo(X + s * 30, Y - 80); g.moveTo(X + s * 30, Y - 50); g.lineTo(X + s * 55, Y - 75); g.moveTo(X + s * 30, Y - 62); g.lineTo(X + s * 10, Y - 90); g.stroke(); }
      } else if (kind === "rocks") {
        g.fillStyle = ["#2a1a15", "#33211a"][i % 2]; g.beginPath(); g.moveTo(X - 20, Y); g.lineTo(X - 14, Y - 22 - r() * 14); g.lineTo(X + 4, Y - 30 - r() * 10); g.lineTo(X + 18, Y - 8); g.lineTo(X + 20, Y); g.fill();
        g.strokeStyle = "rgba(255,110,30,0.7)"; g.lineWidth = 2; g.beginPath(); g.moveTo(X - 8, Y - 4); g.lineTo(X - 2, Y - 16); g.stroke();
      } else if (kind === "machines") {
        if (i % 2) continue;
        g.fillStyle = "#2a303c"; g.fillRect(X - 18, Y - 34, 36, 34); g.fillStyle = "#1a1e26"; g.fillRect(X - 14, Y - 30, 28, 14);
        g.fillStyle = i % 4 ? "#3cdcff" : "#ff3cc8"; g.fillRect(X - 10, Y - 26, 6, 6); g.fillRect(X + 2, Y - 26, 6, 6);
      } else if (kind === "sea") {
        if (i === 0) { const sea = g.createLinearGradient(0, gy(-Wd - 1), 0, gy(Wd + 2)); sea.addColorStop(0, "#2a7fb8"); sea.addColorStop(1, "#1f6fa8"); g.fillStyle = sea; const xa = s < 0 ? 0 : gx(L + 1.4), xb = s < 0 ? gx(-L - 1.4) : groundW; g.fillRect(xa, gy(-Wd - 1.2), xb - xa, gy(Wd + 2.5) - gy(-Wd - 1.2)); }
        g.fillStyle = "#6b4424"; g.beginPath(); g.ellipse(X, Y, 14, 9, 0, 0, 7); g.fill(); g.fillStyle = "#8a5a32"; g.fillRect(X - 12, Y - 26, 24, 24); g.fillStyle = "#4a2c17"; g.fillRect(X - 12, Y - 18, 24, 3); g.fillRect(X - 12, Y - 8, 24, 3);
      } else if (kind === "ice") {
        g.fillStyle = "rgba(200,235,250,0.95)"; g.beginPath(); g.moveTo(X - 16, Y); g.lineTo(X - 10, Y - 30 - r() * 12); g.lineTo(X + 6, Y - 36); g.lineTo(X + 16, Y); g.fill();
        g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 2; g.beginPath(); g.moveTo(X - 8, Y - 26); g.lineTo(X + 2, Y - 8); g.stroke();
      }
    }
  }

  function drawFenceEnd(g, s, L, Wd) {
    const x = s * (L + 1.6);
    g.strokeStyle = "rgba(190,200,210,0.5)"; g.lineWidth = 1;
    for (let z = -Wd - 1; z < Wd + 1; z += 0.4) { g.beginPath(); g.moveTo(gx(x), gy(z, 0)); g.lineTo(gx(x), gy(z + 0.4, 2.6)); g.stroke(); }
    g.fillStyle = "#5a6068"; g.fillRect(gx(x) - 2, gy(-Wd - 1, 2.8), 4, gy(Wd + 1, 0) - gy(-Wd - 1, 2.8));
  }

  function drawBoards(g, z, half, home, away, far) {
    const h = 0.7, panels = 10, w = (2 * half) / panels;
    const texts = theme.boardTexts || ["STRIKE LEGENDS", home.short, (theme.name || "ARCADE CUP").toUpperCase(), away.short, "4 CONTRO 4"];
    for (let i = 0; i < panels; i++) {
      const x0 = -half + i * w;
      const col = i % 2 === 0 ? theme.boards[0] : (i % 4 === 1 ? home.kit : away.kit);
      const top = gy(z, h), bot = gy(z, 0);
      g.fillStyle = col;
      g.fillRect(gx(x0), top, w * P, bot - top);
      g.save();
      g.beginPath(); g.rect(gx(x0) + 4, top, w * P - 8, bot - top); g.clip();
      const c = SL.hue(col);
      g.fillStyle = c.v > 0.7 && c.s < 0.3 ? "#10161f" : "rgba(255,255,255,0.92)";
      g.font = `700 ${Math.round(0.34 * P)}px "Saira Extra Condensed", "Arial Narrow", sans-serif`;
      g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(texts[i % texts.length], gx(x0 + w / 2), (top + bot) / 2, w * P - 10);
      g.restore();
      g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(gx(x0), top, 2, bot - top);
    }
    g.fillStyle = far ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.35)";
    g.fillRect(gx(-half), gy(z, 0) - 2, (2 * half) * P, 3);
  }

  function crowdColour(r, home, away, side) {
    const k = r();
    if (k < 0.42) return side === "away" ? away.kit : home.kit;
    if (k < 0.62) return side === "home" ? "#f2f0e6" : away.kit;
    return ["#d9c4b0", "#8f6a52", "#3a2f2a", "#c9a27e", "#f0dcc4", "#5b4033"][Math.floor(r() * 6)];
  }

  function drawStand(g, r, zFront, zBack, xa, xb, home, away, T) {
    const rows = 9, seats = (T && T.seats) || ["#1d2833", "#222f3b"];
    for (let i = rows - 1; i >= 0; i--) {
      const z = zFront + (zBack - zFront) * (i / rows), y = 0.9 + i * 0.62;
      g.fillStyle = seats[i % 2];
      g.fillRect(gx(xa), gy(z, y + 0.62), (xb - xa) * P, gy(z, y) - gy(z, y + 0.62) + 2);
      if (T && T.snowSeats) { g.fillStyle = "rgba(255,255,255,0.75)"; g.fillRect(gx(xa), gy(z, y + 0.62), (xb - xa) * P, 3); }
      for (let x = xa + 0.2; x < xb; x += 0.42 + r() * 0.12) {
        if (r() < 0.08) continue;
        const side = x < 0 ? "home" : "away";
        g.fillStyle = crowdColour(r, home, away, side);
        const px = gx(x), py = gy(z, y + 0.25);
        g.fillRect(px - 0.13 * P, py - 0.2 * P, 0.26 * P, 0.34 * P);
        g.fillStyle = ["#f1d3b8", "#c68e63", "#8d5a3b", "#e8c09a"][Math.floor(r() * 4)];
        g.beginPath(); g.arc(px, py - 0.3 * P, 0.1 * P, 0, 7); g.fill();
      }
    }
    // roof edge
    g.fillStyle = "#0b1118"; g.fillRect(gx(xa), gy(zBack, 0.9 + rows * 0.62 + 1.2), (xb - xa) * P, 0.35 * P);
  }

  function drawEndStand(g, r, s, L, Wd, team, T) {
    const rows = 7, seats = (T && T.seats) || ["#1d2833", "#222f3b"];
    for (let i = rows - 1; i >= 0; i--) {
      const x = s * (L + 3.2 + i * 0.5), y = 0.6 + i * 0.55;
      for (let z = -Wd + 0.3; z < Wd; z += 0.5) {
        if (r() < 0.1) continue;
        g.fillStyle = seats[i % 2];
        g.fillRect(gx(x) - 0.26 * P, gy(z, y + 0.55), 0.52 * P, 0.4 * P);
        g.fillStyle = crowdColour(r, team, team, "home");
        g.fillRect(gx(x) - 0.12 * P, gy(z, y + 0.4), 0.24 * P, 0.3 * P);
        g.fillStyle = ["#f1d3b8", "#c68e63", "#8d5a3b"][Math.floor(r() * 3)];
        g.beginPath(); g.arc(gx(x), gy(z, y + 0.6), 0.09 * P, 0, 7); g.fill();
      }
    }
  }

  function drawGoal(g, s, L, gw, gh, gd) {
    const x = s * L, xb = s * (L + gd);
    const P3 = (xx, zz, yy) => [gx(xx), gy(zz, yy)];
    // net: back and roof, a mesh of thin lines
    g.strokeStyle = "rgba(235,240,235,0.42)"; g.lineWidth = 1;
    for (let k = 0; k <= 12; k++) {
      const z = -gw + (2 * gw) * k / 12;
      g.beginPath(); g.moveTo(...P3(xb, z, 0)); g.lineTo(...P3(xb, z, gh * 0.85)); g.lineTo(...P3(x, z, gh)); g.stroke();
    }
    for (let k = 0; k <= 6; k++) {
      const y = gh * 0.85 * k / 6;
      g.beginPath(); g.moveTo(...P3(xb, -gw, y)); g.lineTo(...P3(xb, gw, y)); g.stroke();
    }
    for (let k = 0; k <= 4; k++) {
      const f = k / 4, xx = xb + (x - xb) * f, yy = gh * 0.85 + (gh - gh * 0.85) * f;
      g.beginPath(); g.moveTo(...P3(xx, -gw, yy)); g.lineTo(...P3(xx, gw, yy)); g.stroke();
    }
    // frame: posts and crossbar
    g.strokeStyle = "#f7f8f4"; g.lineWidth = 0.16 * P; g.lineCap = "round";
    g.beginPath(); g.moveTo(...P3(x, -gw, 0)); g.lineTo(...P3(x, -gw, gh)); g.lineTo(...P3(x, gw, gh)); g.lineTo(...P3(x, gw, 0)); g.stroke();
    g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 0.05 * P;
    g.beginPath(); g.moveTo(...P3(x, -gw, gh)); g.lineTo(...P3(x, gw, gh)); g.stroke();
  }

  // ---- Frame ---------------------------------------------------------------------------
  function resize(canvas) {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.floor(canvas.clientWidth * dpr), h = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    W = w; H = h;
    gl.viewport(0, 0, W, H);
  }

  // Pixels per metre: the whole width of the pitch and a little of the boards on screen,
  // and on a wide screen as much of the length as the zoom setting asks for.
  // Pixels per metre from the zoom setting: close and medium show part of the width and follow
  // the ball across it too, wide shows the whole pitch.
  function setCamera(x, z, zoom, length, width) {
    // the wide view also shows the far side's backdrop, the theme's sky and stands
    const depth = [10.5, 13.5, width + 7.5][zoom] || 13.5;
    const byH = H / (depth * SIN + 2.4);
    const byW = W / ([20, 24, 31][zoom] || 24);
    cam.S = Math.min(byH, byW);
    const halfView = W / cam.S / 2;
    const lim = Math.max(0, length / 2 + 2.6 - halfView);
    cam.x = Math.max(-lim, Math.min(lim, x));
    const halfDepth = (H / cam.S - 2.4) / SIN / 2;
    const limZ = Math.max(0, width / 2 + 2.0 - halfDepth);
    // 2 m more on the far side, where the backdrop is
    cam.z = zoom === 2 ? -2.2 : Math.max(-limZ - 2.0, Math.min(limZ, z));
  }

  function sx(x) { return W / 2 + (x - cam.x) * cam.S; }
  function sy(z, y) { return H / 2 + (z - cam.z) * cam.S * SIN - (y || 0) * cam.S * COS; }

  const quad = new Float32Array(24);
  function draw(t, x, y, w, h, u0, v0, u1, v1, mode, row, tint, pattern) {
    const X0c = x / W * 2 - 1, X1c = (x + w) / W * 2 - 1, Y0c = 1 - y / H * 2, Y1c = 1 - (y + h) / H * 2;
    quad.set([X0c, Y0c, u0, v0, X1c, Y0c, u1, v0, X0c, Y1c, u0, v1, X1c, Y0c, u1, v0, X1c, Y1c, u1, v1, X0c, Y1c, u0, v1]);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.DYNAMIC_DRAW);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.uniform1f(loc.u_mode, mode); gl.uniform1f(loc.u_row, row || 0); gl.uniform1f(loc.u_rows, palRows);
    const c = tint || [1, 1, 1, 1];
    gl.uniform4f(loc.u_tint, c[0], c[1], c[2], c[3]);
    gl.uniform1f(loc.u_pattern, pattern || 0);
    if (pattern) { gl.uniform4f(loc.u_cell, u0, v0, u1, v1); gl.uniform1f(loc.u_time, performance.now() / 1000); }
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function begin() {
    gl.clearColor(0.03, 0.05, 0.08, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    if (palTex) { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, palTex); gl.activeTexture(gl.TEXTURE0); }
    const k = cam.S / P;
    const ox = (Math.random() - 0.5) * cam.shake * H, oy = (Math.random() - 0.5) * cam.shake * H;
    cam.ox = ox; cam.oy = oy;
    draw(groundTex, sx(X0) + ox, sy(Z0, YTOP) + oy, groundW * k, groundH * k, 0, 0, 1, 1, 0);
  }

  function front() {
    const k = cam.S / P;
    draw(frontTex, sx(X0) + cam.ox, sy(8.1, 0) + cam.oy - (gy(8.1) - gy(8.1)) * k, groundW * k, frontH * k, 0, 0, 1, 1, 0);
  }

  // Row 0 up-screen (-z), then clockwise in 45 degree steps (sprite_body.gd, facing_row).
  function facingRow(dx, dz) { return ((Math.round(Math.atan2(dx, -dz) / (Math.PI / 4)) % 8) + 8) % 8; }

  // One cell of a sheet with its pivot on (x, z) on the ground. `column` is before the mirror.
  // A body's own sheet when it has one; its medium hit when it lacks the chosen look; else
  // player01's (the keeper's sheets exist only there).
  function resolve(body, name) {
    if (!body) return name;
    if (sheets[body + "/" + name]) return body + "/" + name;
    const fam = name.startsWith("shoulder_react_") ? "shoulder_react_medium" : name.startsWith("shoulder_") ? "shoulder_medium" : null;
    if (fam && sheets[body + "/" + fam]) return body + "/" + fam;
    return name;
  }

  function sprite(name, column, fx, fz, x, z, palRow, tint, lift, height, pattern) {
    const s = sheets[name]; if (!s) return;
    const m = s.meta, cell = m.cell, k = cam.S / SHEET_PPM * (height || 1);
    let row = facingRow(fx, fz), col = column, flip = false;
    const mir = m.mirrored || {};
    if (mir[row] !== undefined) { flip = true; row = mir[row]; col = (column + (m.mirror_column_shift || 0)) % m.columns; }
    const u0 = (col * cell) / s.w, u1 = ((col + 1) * cell) / s.w, v0 = (row * cell) / s.h, v1 = ((row + 1) * cell) / s.h;
    const px = sx(x) + cam.ox, py = sy(z, lift || 0) + cam.oy;
    const left = flip ? px - (cell - m.pivot[0]) * k : px - m.pivot[0] * k;
    draw(s.tex, left, py - m.pivot[1] * k, cell * k, cell * k, flip ? u1 : u0, v0, flip ? u0 : u1, v1, 1, palRow, tint || ambient, pattern);
  }

  function columnFor(name, value, byTime) {
    const s = sheets[name]; if (!s) return 0;
    const m = s.meta;
    if (!byTime) return Math.min(m.columns - 1, Math.floor(value * m.columns));
    const times = m.times_s || []; let c = 0;
    for (let i = 0; i < times.length; i++) if (times[i] <= value + 1e-6) c = i;
    return c;
  }

  function shadow(x, z, w) { const k = cam.S; draw(tex.shadow, sx(x) - w * k / 2 + cam.ox, sy(z) - w * 0.28 * k + cam.oy, w * k, w * 0.56 * k * SIN * 1.4, 0, 0, 1, 1, 0); }
  function ball(x, y, z, r) {
    const k = cam.S, d = r * 2 * k * 1.25;
    draw(tex.ball, sx(x) - d / 2 + cam.ox, sy(z, y) - d / 2 + cam.oy, d, d, 0, 0, 1, 1, 0);
  }
  function ring(x, z, colour, w) {
    const k = cam.S, ww = w * k, hh = w * k * 0.5 * SIN * 1.4;
    draw(tex.ring, sx(x) - ww / 2 + cam.ox, sy(z) - hh / 2 + cam.oy, ww, hh, 0, 0, 1, 1, 0, 0, colour);
  }
  function arrow(x, z, y, colour) {
    const k = cam.S, d = 0.42 * k;
    draw(tex.arrow, sx(x) - d / 2 + cam.ox, sy(z, y) - d + cam.oy, d, d, 0, 0, 1, 1, 0, 0, colour);
  }
  function spark(x, z, y, size, colour) {
    const k = cam.S, d = size * k;
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    draw(tex.spark, sx(x) - d / 2 + cam.ox, sy(z, y) - d / 2 + cam.oy, d, d, 0, 0, 1, 1, 0, 0, colour);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }
  function lineOnGround(points, colour, width) {
    const k = cam.S;
    for (let i = 0; i + 1 < points.length; i += 2) {
      const [x, z] = points[i];
      const d = width * k;
      draw(tex.white, sx(x) - d / 2 + cam.ox, sy(z) - d / 2 * SIN + cam.oy, d, d * SIN, 0, 0, 1, 1, 0, 0, colour);
    }
  }
  // Weather over the pitch, a few dozen particles placed by time alone (no state to keep).
  function weather(t) {
    const kind = theme.weather; if (!kind) return;
    const n = kind === "mist" ? 14 : 70;
    for (let i = 0; i < n; i++) {
      const h1 = ((i * 7919) % 1000) / 1000, h2 = ((i * 104729) % 1000) / 1000, h3 = ((i * 15485863) % 1000) / 1000;
      if (kind === "snow") {
        const y = 6 - ((t * (0.8 + h3 * 0.6) + h2 * 6) % 6), x = -16 + h1 * 32 + Math.sin(t * 0.7 + i) * 0.4, z = -9 + h2 * 18;
        spark(x, z, y, 0.16 + h3 * 0.08, [1, 1, 1, 0.85]);
      } else if (kind === "embers") {
        const y = (t * (0.6 + h3 * 0.8) + h2 * 5) % 5, x = -16 + h1 * 32 + Math.sin(t + i) * 0.3, z = -9 + h2 * 18;
        spark(x, z, y, 0.14 + h3 * 0.1, [1, 0.5 + h3 * 0.3, 0.15, Math.max(0, 1 - y / 5)]);
      } else if (kind === "mist") {
        const x = -18 + ((h1 * 36 + t * (0.3 + h3 * 0.3)) % 36), z = -9 + h2 * 18;
        spark(x, z, 0.3, 5 + h3 * 4, [0.75, 0.7, 0.95, 0.06]);
      }
    }
  }

  function flash(alpha, colour) {
    const c = colour || [1, 1, 1];
    draw(tex.white, 0, 0, W, H, 0, 0, 1, 1, 0, 0, [c[0], c[1], c[2], alpha]);
  }

  // One cell of a sheet coloured on the CPU into a 2D canvas: the faces on the cards.
  const indexCache = {};
  function portrait(canvas, name, column, row, kitHex, look) {
    const s = sheets[name]; if (!s) return;
    const m = s.meta, cell = m.cell;
    if (!indexCache[name]) {
      const [c, g] = canvas2d(s.w, s.h); g.drawImage(s.img, 0, 0);
      indexCache[name] = g.getImageData(0, 0, s.w, s.h).data;
    }
    const src = indexCache[name], pal = paletteFor(kitHex, look);
    const g = canvas.getContext("2d");
    canvas.width = cell; canvas.height = cell;
    const out = g.createImageData(cell, cell);
    for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
      const i = src[((row * cell + y) * s.w + column * cell + x) * 4];
      const c = pal[i]; if (!c) continue;
      const o = (y * cell + x) * 4;
      out.data[o] = c[0] * 255; out.data[o + 1] = c[1] * 255; out.data[o + 2] = c[2] * 255; out.data[o + 3] = 255;
    }
    g.putImageData(out, 0, 0);
  }

  function toScreen(x, z, y) { return [(sx(x) + cam.ox) / dpr, (sy(z, y) + cam.oy) / dpr]; }

  SL.Render = {
    init, load, resize, setPalettes, buildGround, setCamera, begin, front, sprite, columnFor, shadow, ball, ring, arrow, spark,
    lineOnGround, flash, toScreen, cam, sheets, facingRow, paletteFor, portrait, resolve, has: (n) => !!sheets[n], weather,
    THEMES, theme: () => theme, themeId: () => themeId,
    meta: (n) => (sheets[n] ? sheets[n].meta : null),
  };
})();

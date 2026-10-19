// Strike Legends (browser) - the shell: screens, focus navigation, the match session, HUD,
// pause, results and the main loop. The modes live in their own files (modes.js, ut.js,
// career.js, settings.js) and reach these helpers through SL.ui.
"use strict";

(function () {
  const SL = window.SL, R = SL.Render;
  const $ = (s, el) => (el || document).querySelector(s);
  const canvas = $("#field");
  let game = SL.load();
  let match = null, demo = null, mode = "boot", last = performance.now(), paused = false;
  let session = null;               // the match being played (launch)
  const screens = ["boot", "menu", "hud", "pause", "result", "reveal"];
  const show = (id) => { for (const s of screens) $("#" + s).hidden = s !== id && !(id === "pause" && s === "hud") && !(id === "result" && s === "hud"); };

  // ---- Helpers -----------------------------------------------------------------------
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const coin = () => `<i class="coin" aria-hidden="true"></i>`;
  const fmtN = (n) => Math.round(n).toLocaleString("it-IT");
  function badge(club, kit) {
    const k = kit || club.kit, light = SL.hue(k).v > 0.8 && SL.hue(k).s < 0.3;
    const stripe = club.kit2 && !kit ? `background:linear-gradient(135deg, ${k} 0 58%, ${club.kit2} 58% 100%)` : `background:${k}`;
    return `<span class="badge" style="${stripe};color:${light ? "#10161f" : "#fff"}">${esc(club.short)}</span>`;
  }
  function toast(text) { const t = $("#toast"); t.textContent = text; t.classList.add("show"); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove("show"), 1800); }
  const save = () => SL.save(game);
  const settings = () => game.settings;
  SL.currentSettings = () => game.settings;

  // ---- Focus navigation for keyboard and pad ----------------------------------------
  // The cursor is the game's own (navCur, drawn by the class .navcur), not the DOM focus: after
  // a mouse click a focus() from the pad lands without :focus-visible, so rows, cards and packs
  // showed nothing, and inside another site's frame a focus() can be refused outright.
  let navCur = null, navSigLast = "";
  const navSig = (e) => [...e.attributes].filter((a) => a.name.startsWith("data-") && a.name !== "data-first" && a.name !== "data-nav").map((a) => a.name + "=" + a.value).join("&");
  function focusables() {
    const root = screens.map((s) => $("#" + s)).find((el) => !el.hidden && el.id !== "hud" && el.querySelector("[data-nav]"));
    return root ? [...root.querySelectorAll("[data-nav]")].filter((e) => !e.disabled && e.offsetParent !== null) : [];
  }
  function setCur(e, focus) {
    if (navCur && navCur !== e) navCur.classList.remove("navcur");
    navCur = e || null; navSigLast = e ? navSig(e) : "";
    if (!e) return;
    e.classList.add("navcur");
    if (focus !== false && document.activeElement !== e) e.focus({ preventScroll: true });
  }
  // After a redraw the cursor moves to the element with the same data-* (the same row, tab or
  // card), so a screen that re-renders under the pad keeps its place.
  function curEl() {
    if (navCur && navCur.isConnected && navCur.offsetParent !== null) return navCur;
    const list = focusables();
    const same = navSigLast ? list.find((e) => navSig(e) === navSigLast) : null;
    if (same) { setCur(same, false); return same; }
    return null;
  }
  document.addEventListener("focusin", (e) => { const t = e.target; if (t && t.matches && t.matches("[data-nav]")) setCur(t, false); });
  // Only a mouse that moves takes the cursor: a redraw or a scroll under a resting mouse fires
  // pointerover too, and would pull the pad's cursor under the pointer.
  document.addEventListener("mousemove", (e) => { if (!e.movementX && !e.movementY) return; const t = e.target.closest && e.target.closest("[data-nav]"); if (t && t !== navCur) setCur(t, false); });
  function moveFocus(dx, dy) {
    const list = focusables(); if (!list.length) return;
    const cur = curEl();
    if (!cur || !list.includes(cur)) { focusFirst(); return; }
    const a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best = null, bd = 1e9;
    for (const e of list) {
      if (e === cur) continue;
      const b = e.getBoundingClientRect(), bx = b.left + b.width / 2, by = b.top + b.height / 2;
      const ddx = bx - ax, ddy = by - ay;
      if (dx && Math.sign(ddx) !== dx) continue; if (dy && Math.sign(ddy) !== dy) continue;
      if (dx && Math.abs(ddx) < 4) continue; if (dy && Math.abs(ddy) < 4) continue;
      const d = dx ? Math.abs(ddx) + Math.abs(ddy) * 2.5 : Math.abs(ddy) + Math.abs(ddx) * 2.5;
      if (d < bd) { bd = d; best = e; }
    }
    if (best) { setCur(best); best.scrollIntoView({ block: "nearest" }); SL.audio.ui(); }
  }
  function focusFirst() { const l = focusables(); const pref = l.find((e) => e.dataset.first); setCur(pref || l[0] || null); }
  // A press on the cursor: with nothing under it, the first button takes the cursor instead.
  function pressCur() { const c = curEl(); if (c && c.click) c.click(); else focusFirst(); }

  let backHandler = null;
  document.addEventListener("keydown", (e) => {
    SL.audio.unlock();
    if (mode === "boot") { if (!$("#press").hidden) { e.preventDefault(); goMenu(); } return; }
    if (mode === "walkout") { if (e.code === "Escape" || e.code === "Enter" || e.code === "Space") { e.preventDefault(); walkoutSkip && walkoutSkip(); } return; }
    if (mode === "play") {
      if (e.code === "Escape" || e.code === "KeyP") { e.preventDefault(); openPause(); }
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
      return;
    }
    const a = curEl();
    if (e.code === "ArrowUp" || e.code === "KeyW") { e.preventDefault(); moveFocus(0, -1); }
    else if (e.code === "ArrowDown" || e.code === "KeyS") { e.preventDefault(); moveFocus(0, 1); }
    else if (e.code === "ArrowLeft" || e.code === "KeyA") { e.preventDefault(); if (a && a.dataset.step) step(a, -1); else moveFocus(-1, 0); }
    else if (e.code === "ArrowRight" || e.code === "KeyD") { e.preventDefault(); if (a && a.dataset.step) step(a, 1); else moveFocus(1, 0); }
    else if (e.code === "Escape" || e.code === "Backspace") { e.preventDefault(); if (backHandler) { SL.audio.uiBack(); backHandler(); } }
    else if (e.code === "KeyQ" || e.code === "KeyE") { e.preventDefault(); tabStep(e.code === "KeyE" ? 1 : -1); }
    // Enter on a focused button clicks it by itself; the cursor may sit elsewhere after a hover.
    else if ((e.code === "Enter" || e.code === "NumpadEnter") && document.activeElement !== a) { e.preventDefault(); pressCur(); }
  });
  document.addEventListener("pointerdown", () => SL.audio.unlock(), { capture: true });
  function step(el, d) { const f = el._step; if (f) { f(d); SL.audio.ui(); } }
  // LB / RB on the pad, Q / E on the keyboard: the next or previous tab of the screen
  function tabStep(d) { const t = document.querySelector(".tab.on"); const all = [...document.querySelectorAll(".tab")]; if (t && all.length) all[(all.indexOf(t) + d + all.length) % all.length].click(); }

  // Pad edges for the menus (the match reads the pad itself, input.js).
  let padHook = null;               // a screen that reads the pad itself (Prova joypad)
  let walkoutSkip = null;
  function pollPadMenus() {
    const { now, edge } = SL.input.menuEdges();
    // A screen that reads the pad itself returns true to keep it; false lets the menus have it.
    if (padHook && padHook(now, edge) !== false) return;
    if (mode === "boot") { if (!$("#press").hidden && (edge.a || edge.menu)) { SL.audio.unlock(); goMenu(); } }
    else if (mode === "walkout") { if (edge.a || edge.b || edge.menu) walkoutSkip && walkoutSkip(); }
    else if (mode === "play") { if (edge.menu) openPause(); }
    else {
      if (navCur && !navCur.isConnected) curEl();
      const a = curEl();
      if ((edge.up || edge.down || edge.left || edge.right) && !a) { focusFirst(); return; }
      if (edge.up) moveFocus(0, -1);
      if (edge.down) moveFocus(0, 1);
      if (edge.left) { if (a && a.dataset.step) step(a, -1); else moveFocus(-1, 0); }
      if (edge.right) { if (a && a.dataset.step) step(a, 1); else moveFocus(1, 0); }
      if (edge.lb || edge.rb) tabStep(edge.rb ? 1 : -1);
      if (edge.a) pressCur();
      if ((edge.b || (mode === "pause" && edge.menu)) && backHandler) { SL.audio.uiBack(); backHandler(); }
    }
  }
  // A pad nobody recognised gets pointed to the wizard; a PlayStation pad read by its own table says so.
  SL.input.onPad((kind, p) => {
    const prof = kind === "on" && p ? SL.input.profileName(p) : "";
    toast(kind !== "on" ? "Joypad scollegato: " + shortPad(p && p.id)
      : prof === "guess" ? "Joypad non riconosciuto: Impostazioni → Comandi → Prova joypad → Assegna i tasti"
      : (prof === "ds4raw" || prof === "ds4linux" ? "Joypad PlayStation collegato: " : "Joypad collegato: ") + shortPad(p.id));
  });
  function shortPad(id) { return String(id || "").replace(/\(.*$/, "").trim().slice(0, 40) || "joypad"; }

  // ---- Boot ----------------------------------------------------------------------------
  async function boot() {
    try {
      R.init(canvas);
      R.resize(canvas);
      await R.load("assets/sprites/", (f) => { $("#loadbar i").style.width = Math.round(f * 100) + "%"; });
      if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);
      startDemo();
      $("#loadbar").hidden = true; $("#press").hidden = false;
    } catch (err) {
      $("#loadbar").hidden = true;
      const e = $("#loaderr"); e.hidden = false;
      e.textContent = "Il gioco non parte: " + err.message + ". Serve un browser con WebGL.";
    }
    requestAnimationFrame(loop);
  }
  document.addEventListener("click", () => { if (mode === "boot" && !$("#press").hidden) { SL.audio.unlock(); goMenu(); } });

  // A side of a match: a club and its five. kitFor picks the away kit against the home one.
  function side(club, squad, kit) {
    const k = kit || { kit: club.kit, kit2: club.kit2 || null, pattern: club.pattern || 0 };
    return { club, squad: squad || SL.clubSquad(club), kit: k.kit, kit2: k.kit2, pattern: k.pattern, formation: club.formation || "rombo", roles: club.roles || null };
  }
  function startDemo() {
    const r = SL.rng(Date.now() & 0xffff);
    const a = SL.CLUBS[Math.floor(r() * SL.CLUBS.length)];
    let b = SL.CLUBS[Math.floor(r() * SL.CLUBS.length)];
    if (b === a) b = SL.CLUBS[(SL.CLUBS.indexOf(a) + 3) % SL.CLUBS.length];
    demo = makeMatch(side(a), side(b, null, SL.awayKit(a, b)), [], { minutes: 99, difficulty: 2, opponentAi: 0, aiHits: false, goldenGoal: false, hitLook: settings().hitLook, weather: settings().weather }, a.pitch || "notte");
  }

  let groundIsMatch = false;      // the ground and palettes were last built for a played match
  const GROUND = () => ({ length: SL.C.length, width: SL.C.width, goalWidth: SL.C.goalWidth, goalHeight: SL.C.goalHeight, goalDepth: SL.C.goalDepth });
  function makeMatch(home, away, humans, s, pitch, extra) {
    groundIsMatch = humans.length > 0;
    const id = R.THEMES[pitch] ? pitch : "notte", theme = R.THEMES[id];
    const m = new SL.Match(Object.assign({ home, away, humans, settings: s, seed: (Date.now() & 0xffff) + 1, gravity: theme.gravity || 1, pitch: id }, extra || {}));
    R.setPalettes(m.paletteRows());
    R.buildGround(GROUND(), home.club, away.club, id);
    return m;
  }

  // ---- Main menu ---------------------------------------------------------------------
  function frame(crumb, title, body, sidePanel, wide) {
    return `<div class="menu-wrap ${wide ? "wide" : ""}">
      <div class="col">
        <div class="top"><div class="brand">Fifa <b>Tenkaichi 3</b></div><div class="coins">${coin()}<span>${fmtN(game.ut.coins)}</span></div></div>
        ${crumb ? `<div class="crumb">${esc(crumb)}</div>` : ""}
        ${title ? `<h2 class="title">${title}</h2>` : ""}
        ${body}
        <div class="hint"><span><kbd>↑</kbd><kbd>↓</kbd> scegli</span><span><kbd>Invio</kbd>/<kbd>A</kbd> conferma</span><span><kbd>Esc</kbd>/<kbd>B</kbd> indietro</span>${body.includes('class="tabs"') ? `<span><kbd>Q</kbd><kbd>E</kbd>/<kbd>LB</kbd><kbd>RB</kbd> schede</span>` : ""}</div>
      </div>
      <div class="col side">${sidePanel || ""}</div>
    </div>`;
  }
  function item(id, label, sub, first) { return `<button class="item" data-nav data-go="${id}" ${first ? "data-first=1" : ""}>${esc(label)}<small>${esc(sub || "")}</small></button>`; }
  function wire(root, handlers) {
    root.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => { SL.audio.ui(); handlers[b.dataset.go] && handlers[b.dataset.go](b); }));
  }
  // A list of rows, each stepping a value with left and right: [key, label, sub, value, onStep(d)].
  function stepRows(root, defs, redraw) {
    for (const [key, , , , f] of defs) {
      const el = root.querySelector(`[data-key="${key}"]`); if (!el || !f) continue;
      el._step = (d) => { f(d); save(); redraw(); root.querySelector(`[data-key="${key}"]`)?.focus(); };
      el.addEventListener("click", () => el._step(1));
    }
  }
  function rowsHtml(defs, firstKey) {
    return defs.map(([k, l, sub, v, f], i) => `<button class="row ${f && f.action ? "action" : ""}" data-nav ${f && !f.action ? 'data-step="1"' : ""} data-key="${k}" ${(firstKey ? k === firstKey : i === 0) ? "data-first=1" : ""}><span class="lbl">${l}${sub ? `<small>${sub}</small>` : ""}</span><span class="val">${v}</span></button>`).join("");
  }
  const menuScreen = (html) => { const m = $("#menu"); mode = "menu"; show("menu"); padHook = null; m.innerHTML = html; return m; };

  function goMenu() {
    if (demo && groundIsMatch) { groundIsMatch = false; R.setPalettes(demo.paletteRows()); R.buildGround(GROUND(), demo.opts.home.club, demo.opts.away.club, demo.opts.pitch); }
    SL.audio.crowd(0); SL.audio.setVolumes(settings());
    const u = game.ut, c = game.career;
    const done = Object.keys(game.challenges).length;
    const sidePanel = `<div class="panel">
        <h3>Ultimate Team · ${esc(u.club)}</h3>
        <div class="record"><div><b>${u.collection.length}</b><span>Carte</span></div><div><b>${u.stats.won}</b><span>Vinte</span></div><div><b>${u.stats.walkouts}</b><span>Walkout</span></div><div><b>${u.stats.cups}</b><span>Coppe</span></div></div>
      </div>
      <div class="panel"><h3>Carriera</h3>${c ? `${esc(c.kind === "player" ? c.player.name + " · " + c.clubName : c.clubName)} · stagione ${c.season}, giornata ${Math.min(c.round + 1, c.fixtures.length)} di ${c.fixtures.length}` : "Nessuna carriera in corso: allenatore o giocatore, stagioni, mercato e stipendi."}</div>
      <div class="panel"><h3>Sfide</h3>${done} completate su ${SL.CHALLENGES.length}</div>`;
    const m = menuScreen(frame("", "", `<div class="items">
        ${item("quick", "Amichevole rapida", "Contro l'IA o fra due persone sulla stessa macchina", true)}
        ${item("ut", "Ultimate Team", "Pacchetti, collezione e la tua squadra, salvati in questo browser")}
        ${item("career", "Carriera", c ? "Riprendi la stagione" : "Allenatore o giocatore: trasferimenti, rosa, stagioni")}
        ${item("challenges", "Sfide", "Base, media, difficile: si impara a giocare completandole")}
        ${item("lore", "Squadre leggendarie", "Alieni, vampiri, pirati, draghi, robot, yeti")}
        ${item("training", "Allenamento", "Avversari fermi: prova tiri, spallate e mosse speciali")}
        ${item("settings", "Impostazioni", "Formazione, comandi, audio, video, telecamera")}
      </div>`, sidePanel));
    wire(m, { quick: () => SL.modes.quick(), ut: () => SL.ut.hub(), career: () => SL.career.open(), challenges: () => SL.modes.challenges(), lore: () => SL.modes.lore(), training: () => SL.modes.training(), settings: () => SL.settingsUI.open("formazione") });
    backHandler = null;
    focusFirst();
  }

  // ---- Cards -------------------------------------------------------------------------
  // c: the card; o.entry: the collection entry (version, serial); o.small, o.sel, o.flip, o.mark.
  function cardHtml(c, o) {
    o = o || {};
    if (!c) return `<div class="card argento"></div>`;
    const e = o.entry, v = e ? e.v : "base";
    const inSquad = e && game.ut.squad.includes(e.k);
    const lore = c.lore ? SL.clubById(c.lore) : null;
    const style = lore ? `--lk:${lore.kit};--lk2:${lore.kit2};` : "";
    return `<button class="card ${c.rarity} v-${v} ${o.mark && inSquad ? "in" : ""} ${o.sel ? "sel" : ""} ${o.flip ? "flip" : ""}" ${o.nav === false ? "" : "data-nav"} data-card="${e ? e.k : c.id}" style="${style}${o.delay ? `animation-delay:${o.delay}s` : ""}" aria-label="${esc(c.name)}, ${c.role} ${c.ovr}">
      <span class="ovr">${c.ovr}</span><span class="rl">${c.role} ${SL.skillStars ? SL.skillStars(c) + "★" : ""}</span>
      ${v !== "base" ? `<span class="ver">${v === "num" ? e.n + "/10" : v === "holo" ? "HOLO" : "UNICA"}</span>` : ""}
      <canvas data-portrait="${c.id}" width="128" height="128"></canvas>
      <span class="nm">${esc(c.name.split(" ").slice(-1)[0])}</span>
      ${o.small ? "" : `<span class="st"><span><b>${c.vel}</b>VEL</span><span><b>${c.tir}</b>TIR</span><span><b>${c.pas}</b>PAS</span><span><b>${c.fis}</b>FIS</span></span>`}
    </button>`;
  }
  function hydrateCards(root, kit) {
    root.querySelectorAll("canvas[data-portrait]").forEach((cv) => {
      const c = SL.cardById(cv.dataset.portrait); if (!c) return;
      const sheet = c.role === "POR" ? "idle" : R.resolve(c.body, "idle_stand");
      const lore = c.lore ? SL.clubById(c.lore) : null;
      R.portrait(cv, sheet, 0, 3, lore ? lore.kit : (kit || game.ut.kit), c.look);
    });
  }

  // ---- Devices and launching a match -------------------------------------------------
  // Who plays with what. One person: the keyboard and the first pad together. Two people:
  // a pad each when there are two, else the first pad and the keyboard, else WASD and arrows.
  function pickDevices(two) {
    const n = SL.input.pads().length;
    if (!two) return [{ kb: "kb0", pad: 0 }];
    if (n >= 2) return [{ kb: "kbW", pad: 0 }, { kb: "kb1", pad: 1 }];
    if (n === 1) return [{ kb: "kb0", pad: null }, { kb: null, pad: 0 }];
    return [{ kb: "kbW", pad: null }, { kb: "kb1", pad: null }];
  }

  // s: {kind, title, home, away (sides), humans: [{team, lock?}], pitch, settings overrides,
  //     extra (Match options), onEnd(result) -> {html, coins, next}, restartable}
  function launch(s) {
    const st = Object.assign({}, settings(), s.settings || {});
    const devs = pickDevices(s.humans.length > 1);
    const humans = s.humans.map((h, i) => Object.assign({ device: devs[i] }, h));
    session = Object.assign({}, s, { settings: st });
    match = makeMatch(s.home, s.away, humans, st, s.pitch, s.extra);
    mode = "play"; show("hud"); paused = false; padHook = null;
    $("#keys").hidden = !st.showHints;
    renderKeys(devs[0]);
    SL.audio.crowd(1);
    if (SL.voice) SL.voice.start(match, session);
    backHandler = null;
    document.activeElement && document.activeElement.blur();
  }

  function renderKeys(dev) {
    const pad = dev && dev.pad != null && SL.input.pads().length > dev.pad;
    const lb = SL.input.labels(), L = SL.input.layout();
    const passWord = settings().passAssist === "assisted" ? "passaggio" : "passaggio (tieni: potenza)";
    const k = pad
      ? [[lb[L.pass], passWord], [lb[L.shoot], "tiro (tieni) · spallata"], [lb[L.feint], "finta · scivolata"], [lb[L.sprint], "scatto"], [lb[L.switch], "cambia"], [lb[L.mod], `+${lb[L.pass]} alto · +${lb[L.shoot]} pallonetto`], [lb[L.special], "carica · Cometa"], ["RS", "skill"], [lb.menu, "pausa"]]
      : [["J", passWord], ["K", "tiro (tieni) · spallata"], ["L", "finta · scivolata"], ["Shift", "scatto"], ["Q", "cambia"], ["U", "+J alto · +K pallonetto"], ["Spazio", "carica · Cometa"], ["1-9", "skill"], ["Esc", "pausa"]];
    $("#keys").innerHTML = (session.tip ? `<span class="tip">${esc(session.tip)}</span>` : "") + k.map(([a, b]) => `<span><span class="key">${a}</span>${b}</span>`).join("");
  }

  // ---- HUD ---------------------------------------------------------------------------
  function fmt(t) { const s = Math.max(0, Math.ceil(t)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
  let lastBug = "";
  function hud() {
    const m = match, h = session.home.club, a = session.away.club;
    const free = m.length > 5000;
    const clock = free ? "LIBERO" : m.golden ? "GOL D'ORO" : fmt(m.length - m.clock);
    const bug = `<div class="t"><i style="background:${m.opts.home.kit}"></i>${esc(h.short)}</div><div class="sc">${m.score[0]} – ${m.score[1]}</div><div class="t">${esc(a.short)}<i style="background:${m.opts.away.kit}"></i></div><div class="clk">${clock}</div>`;
    if (bug !== lastBug) { $("#bug").innerHTML = bug; lastBug = bug; }
    const g = $("#gauges");
    const pct = (v, mx) => Math.round(100 * v / mx);
    // the tension (match.js, C.tension): three notches; full, the seconds before it drops; a
    // charged shot armed
    const T = SL.C.tension, full = (t) => (m.mana[t] >= 100 ? "full" : "");
    const tLabel = (t) => {
      if (m.chargedUntil[t] > m.clock) return `Tiro caricato ${Math.ceil(m.chargedUntil[t] - m.clock)}`;
      if (m.mana[t] >= 100) return free ? "Cometa" : `Cometa ${Math.max(0, Math.ceil(T.fullHold - (m.clock - m.fullAt[t])))}`;
      return `Tensione ${Math.floor(m.mana[t] / T.notch + 1e-6)}/3`;
    };
    g.innerHTML = `<div class="gauge"><span>${tLabel(0)}</span><div class="meter notch ${full(0)}"><i style="width:${pct(m.mana[0], 100)}%"></i></div><span>Parate</span><div class="meter res"><i style="width:${pct(m.reserve[0], m.reserveMax[0])}%"></i></div></div>
      <div class="gauge r"><span>${tLabel(1)}</span><div class="meter notch ${full(1)}"><i style="width:${pct(m.mana[1], 100)}%"></i></div><span>Parate</span><div class="meter res"><i style="width:${pct(m.reserve[1], m.reserveMax[1])}%"></i></div></div>`;
    const goal = $("#goalbox");
    if (session.goalText) { goal.hidden = false; const t = session.goalText(m); if (goal._t !== t) { goal.innerHTML = t; goal._t = t; } } else goal.hidden = true;
    const ban = $("#banner");
    if (m.messageT > 0 && /GO+L|GOL D|COMETA|SFIDA/.test(m.message)) { ban.innerHTML = esc(m.message) + (m.phase === "goal" ? `<small>${esc((m.goalTeam === 0 ? h : a).name)}</small>` : ""); ban.classList.add("show"); }
    else ban.classList.remove("show");
    if (m.messageT > 0 && !/GO+L|GOL D|COMETA|SFIDA/.test(m.message)) toastOnce(m.message);
    // the special move's meter: two windows, the cursor, the presses
    const sp = m.special, box = $("#special");
    box.hidden = !sp || sp.state === "result";
    if (sp && sp.state !== "result") {
      const cv = $("#meter"), g2 = cv.getContext("2d"), W = cv.width, H = cv.height;
      g2.clearRect(0, 0, W, H);
      g2.fillStyle = "rgba(6,13,22,0.85)"; g2.fillRect(0, 10, W, H - 20);
      const C = SL.C, win = (C.window / C.sweep) * W;
      g2.fillStyle = "rgba(242,193,78,0.55)"; g2.fillRect(C.powerTarget * W - win, 10, win * 2, H - 20);
      g2.fillStyle = "rgba(127,208,255,0.55)"; g2.fillRect(C.aimTarget * W - win, 10, win * 2, H - 20);
      if (sp.state === "meter") {
        const x = m.cursorAt(sp.meter) * W;
        g2.fillStyle = "#fff"; g2.fillRect(x - 3, 2, 6, H - 4);
      }
      for (const t of sp.presses) { const x = m.cursorAt(t) * W; g2.fillStyle = "#ff5a3c"; g2.fillRect(x - 2, 0, 4, H); }
      $("#specialsub").textContent = sp.state === "charge" ? "Carica…" : sp.presses.length === 0 ? "Potenza: premi nella finestra gialla" : "Mira: premi nella finestra azzurra";
    }
    drawNames(m);
  }
  let lastToast = "";
  function toastOnce(t) { if (t !== lastToast) { lastToast = t; toast(t); } }
  // Names over the players (Impostazioni > Video): 0 none, 1 the human's only, 2 everyone.
  function drawNames(m) {
    const box = $("#names"), mode2 = settings().names;
    if (!mode2) { if (box.innerHTML) box.innerHTML = ""; return; }
    let html = "";
    for (const p of m.players) {
      if (mode2 === 1 && p.human < 0) continue;
      if (!p.card) continue;
      const [x, y] = R.toScreen(p.x, p.z, 1.85 * (p.height || 1));
      html += `<span style="transform:translate(${x.toFixed(0)}px,${y.toFixed(0)}px)" class="${p.human >= 0 ? "me" : ""}">${esc(p.card.name.split(" ").slice(-1)[0])}</span>`;
    }
    box.innerHTML = html;
  }

  // ---- Pause -------------------------------------------------------------------------
  function openPause() {
    if (!match || match.over) return;
    paused = true; mode = "pause"; show("pause");
    const p = $("#pause"), s = match.s;
    const vs = session.humans.length > 1;
    p.innerHTML = `<div class="menu-wrap"><div class="col">
      <div class="crumb">${esc(session.home.club.name)} ${match.score[0]} – ${match.score[1]} ${esc(session.away.club.name)}</div>
      <h2 class="title">Pausa</h2>
      ${session.tip ? `<div class="panel">${esc(session.tip)}</div>` : ""}
      <div class="items">${item("resume", "Riprendi", "", true)}${session.restartable === false ? "" : item("restart", "Ricomincia", "")}</div>
      <div class="rows">
        ${!vs ? `<button class="row" data-nav data-step="1" id="p-ai"><span class="lbl">IA avversaria</span><span class="val">${["Gioca", "Ferma, portiere attivo", "Ferma, anche il portiere"][s.opponentAi]}</span></button>` : ""}
        <button class="row" data-nav data-step="1" id="p-zoom"><span class="lbl">Inquadratura</span><span class="val">${["Vicina", "Media", "Larga"][s.zoom]}</span></button>
        <button class="row" data-nav data-step="1" id="p-look"><span class="lbl">Spallata</span><span class="val">${["Debole", "Media", "Forte", "Violenta"][s.hitLook]}</span></button>
        <button class="row" data-nav data-step="1" id="p-hints"><span class="lbl">Comandi a schermo</span><span class="val">${s.showHints ? "Sì" : "No"}</span></button>
      </div>
      <div class="items">${item("quit", session.free ? "Torna al menu" : "Abbandona la partita", session.free ? "" : "Conta come sconfitta")}</div>
    </div></div>`;
    const re = (id, f) => { const el = $("#" + id, p); if (!el) return; el._step = (d) => { f(d); match.applySettings(match.s); openPause(); $("#" + id).focus(); }; el.addEventListener("click", () => el._step(1)); };
    re("p-ai", (d) => { s.opponentAi = (s.opponentAi + d + 3) % 3; });
    re("p-zoom", (d) => { s.zoom = (s.zoom + d + 3) % 3; settings().zoom = s.zoom; save(); });
    re("p-look", (d) => { s.hitLook = (s.hitLook + d + 4) % 4; settings().hitLook = s.hitLook; save(); });
    re("p-hints", () => { s.showHints = !s.showHints; settings().showHints = s.showHints; save(); $("#keys").hidden = !s.showHints; });
    wire(p, {
      resume: resume,
      restart: () => launch(session),
      quit: () => { if (session.free) { match = null; if (SL.voice) SL.voice.stop(); (session.back || goMenu)(); } else finish(true); },
    });
    backHandler = resume;
    focusFirst();
  }
  function resume() { paused = false; mode = "play"; show("hud"); backHandler = null; document.activeElement && document.activeElement.blur(); last = performance.now(); }

  // ---- Result ------------------------------------------------------------------------
  function finish(abandoned) {
    const m = match; match = null;
    if (SL.voice) SL.voice.stop();
    const [g0, g1] = m.score;
    const res = abandoned ? "lost" : g0 > g1 ? "won" : g0 < g1 ? "lost" : "drawn";
    const out = (session.onEnd && session.onEnd({ match: m, res, abandoned, g0, g1 })) || {};
    if (out.coins) game.ut.coins += out.coins;
    save();
    mode = "result"; show("result");
    const p = $("#result"), h = session.home.club, a = session.away.club;
    const sc = (t) => m.scorers.filter((x) => x.team === t).map((x) => `${esc(x.name)} ${x.minute}'${x.worth === 2 ? " ×2" : ""}`).join("<br>") || "—";
    p.innerHTML = `<div class="menu-wrap"><div class="col">
      <div class="crumb">${esc(session.title || "Amichevole")} · Finale</div>
      <div class="final"><div>${badge(h, m.opts.home.kit)}<br><b>${esc(h.name)}</b></div><div class="s">${g0}–${g1}</div><div>${badge(a, m.opts.away.kit)}<br><b>${esc(a.name)}</b></div></div>
      <div class="scorers"><div>${sc(0)}</div><div>${sc(1)}</div></div>
      <div class="panel"><div class="scorers"><div>Tiri ${m.stats.shots[0]} · parate ${m.stats.saves[0]} · spallate ${m.stats.hits[0]} · possesso ${possession(m, 0)}%</div><div>Tiri ${m.stats.shots[1]} · parate ${m.stats.saves[1]} · spallate ${m.stats.hits[1]} · possesso ${possession(m, 1)}%</div></div></div>
      ${out.coins ? `<div class="reward">${coin()} +${fmtN(out.coins)} crediti</div>` : ""}
      ${out.html ? `<div class="panel">${out.html}</div>` : ""}
      <div class="items">${item("next", out.nextLabel || "Continua", "", true)}</div>
    </div></div>`;
    wire(p, { next: () => (out.next || goMenu)() });
    backHandler = out.next || goMenu;
    focusFirst();
    SL.audio.crowd(0);
  }
  function possession(m, t) { const a = m.stats.possession || [1, 1]; return Math.round(100 * a[t] / Math.max(1e-6, a[0] + a[1])); }

  // ---- Loop --------------------------------------------------------------------------
  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    R.resize(canvas);
    pollPadMenus();
    if (mode === "play" && match && !paused) {
      match.update(dt);
      if (SL.voice) SL.voice.events(match);
      if (session.onFrame) session.onFrame(match);
      if (match.over && match.phaseT > 2.2) finish(false);
    }
    const shown = (mode === "play" || mode === "pause" || mode === "result") && match ? match : demo;
    if (shown && mode !== "walkout") {
      if (shown === demo) demo.update(dt);
      if (shown === demo && demo.phase === "end") startDemo();
      shown.draw(shown === demo ? 2 : settings().zoom);
      if (shown === match && mode === "play") hud();
      else if ($("#names").innerHTML) $("#names").innerHTML = "";
    }
    if (mode === "walkout" && SL.ut.walkoutFrame) SL.ut.walkoutFrame(now);
    requestAnimationFrame(loop);
  }

  // The helpers the mode files use.
  SL.ui = {
    $, esc, coin, fmtN, badge, toast, frame, item, wire, stepRows, rowsHtml, menuScreen, cardHtml, hydrateCards, focusFirst, moveFocus, pressCur, curEl,
    game: () => game, setGame: (g) => { game = g; save(); }, save, settings, side, launch, goMenu, show,
    setBack: (f) => { backHandler = f; }, setMode: (m) => { mode = m; }, setPadHook: (f) => { padHook = f; }, setWalkoutSkip: (f) => { walkoutSkip = f; },
    shortPad, makeMatch, GROUND, demo: () => demo,
  };
  // For the automated checks and for anyone curious in the console.
  SL.debug = { match: () => match, demo: () => demo, game: () => game, finish: () => finish(false), mode: () => mode, session: () => session,
    pitch: (id) => { demo.opts.pitch = id; R.buildGround(GROUND(), demo.opts.home.club, demo.opts.away.club, id); } };
  window.addEventListener("resize", () => R.resize(canvas));
  window.addEventListener("load", boot);
})();

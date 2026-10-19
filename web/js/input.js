// Strike Legends (browser) - input: keyboard, gamepads, and the logical buttons both share.
//
// A pad is read through a profile that turns its raw buttons and axes into the Xbox names
// (a, b, x, y, lb, rb, lt, rt, view, menu, ls, rs, up, down, left, right, lx, ly, rx, ry):
//   - "standard": the W3C standard mapping, what Chrome, Edge and Safari report for an Xbox
//     Series pad over USB or Bluetooth (https://w3c.github.io/gamepad/#remapping);
//   - "xpad": the Linux driver's raw layout as Firefox reports it (mapping ""), triggers and
//     cross on axes;
//   - "ds4raw": a PlayStation 4 or 5 pad the browser does not recognise (clones with their own
//     ids, Windows without the Sony driver, Firefox on Windows): the DirectInput layout of SDL's
//     controller database, the same for the DualShock 4 and the DualSense
//     (cross b1, circle b2, square b0, triangle b3, right stick a2/a5, L2/R2 also on a3/a4) and
//     the cross on a hat axis, a9 (Chromium's gamepad_standard_mappings_win.cc);
//   - "ds4linux": a PlayStation 4 or 5 pad on Linux without the standard mapping (Firefox), the
//     order of the hid-sony and hid-playstation drivers: cross, circle, triangle, square
//     (BTN_SOUTH, EAST, NORTH, WEST);
//   - a per-pad table the player records in Impostazioni > Prova joypad, saved by pad id.
// A match reads a device {kb, pad}: the keyboard set and the n-th connected pad, merged, so a
// pad that wakes up during a match is read from its first press.
"use strict";

(function () {
  const SL = window.SL;
  const NAMES = ["a", "b", "x", "y", "lb", "rb", "lt", "rt", "view", "menu", "ls", "rs", "up", "down", "left", "right"];
  const PROFILES = {
    standard: { buttons: { a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, lt: 6, rt: 7, view: 8, menu: 9, ls: 10, rs: 11, up: 12, down: 13, left: 14, right: 15 }, axes: { lx: 0, ly: 1, rx: 2, ry: 3 } },
    xpad: { buttons: { a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, view: 6, menu: 7, ls: 9, rs: 10 }, axes: { lx: 0, ly: 1, rx: 3, ry: 4 }, triggerAxes: { lt: 2, rt: 5 }, crossAxes: [6, 7] },
    ds4raw: { buttons: { x: 0, a: 1, b: 2, y: 3, lb: 4, rb: 5, lt: 6, rt: 7, view: 8, menu: 9, ls: 10, rs: 11 }, axes: { lx: 0, ly: 1, rx: 2, ry: 5 }, hat: 9 },
    ds4linux: { buttons: { a: 0, b: 1, y: 2, x: 3, lb: 4, rb: 5, lt: 6, rt: 7, view: 8, menu: 9, ls: 11, rs: 12 }, axes: { lx: 0, ly: 1, rx: 3, ry: 4 }, triggerAxes: { lt: 2, rt: 5 }, crossAxes: [6, 7] },
  };
  SL.PAD_PROFILE_NAMES = { standard: "standard", xpad: "Xbox su Linux (xpad)", ds4raw: "PlayStation non riconosciuto (DirectInput)", ds4linux: "PlayStation su Linux", custom: "tasti assegnati da te", guess: "non riconosciuto: provo la disposizione standard" };
  const SONY = /054c|playstation|dualsense|dualshock|wireless controller|ps4|sony/i;
  // A DualSense (0ce6) or DualSense Edge (0df2) calls SHARE "CREATE".
  const PS5 = /054c.{0,12}0(ce6|df2)|dualsense|ps5/i;
  // A hat axis (one axis for the whole cross): -1 up, growing clockwise to 1 up-left, above 1 at
  // rest (9/7); Chromium's DpadFromAxis cuts it into the four directions with these bounds.
  function hatDirs(v) {
    if (!(v >= -1.01 && v <= 1.01) || v === 0) return { up: 0, right: 0, down: 0, left: 0 };
    return { up: (v < -0.7 || v >= 0.95) ? 1 : 0, right: (v >= -0.75 && v < -0.1) ? 1 : 0, down: (v >= -0.2 && v < 0.45) ? 1 : 0, left: (v >= 0.4) ? 1 : 0 };
  }
  const DEAD = 0.22;

  // ---- Keyboard ------------------------------------------------------------------------
  const keys = new Set();
  // A tap shorter than a frame still counts: every keydown is latched until the next step.
  const tapped = new Set();
  window.addEventListener("keydown", (e) => { keys.add(e.code); if (!e.repeat) tapped.add(e.code); });
  window.addEventListener("keyup", (e) => { keys.delete(e.code); });
  window.addEventListener("blur", () => keys.clear());
  const KB = [
    { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD", pass: "KeyJ", shoot: "KeyK", feint: "KeyL", sprint: "ShiftLeft", switch: "KeyQ", mod: "KeyU", special: "Space" },
    { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", pass: "Numpad1", shoot: "Numpad2", feint: "Numpad3", sprint: "Numpad0", switch: "Numpad5", mod: "Numpad4", special: "Numpad6" },
  ];

  // ---- Gamepads ------------------------------------------------------------------------
  // getGamepads() throws a SecurityError where the frame's Permissions Policy denies "gamepad"
  // (https://developer.mozilla.org/docs/Web/HTTP/Headers/Permissions-Policy/gamepad).
  const status = { api: !!navigator.getGamepads, blocked: false, error: "", policy: null, seen: 0 };
  try {
    const fp = document.permissionsPolicy || document.featurePolicy;
    if (fp && fp.allowsFeature) status.policy = fp.allowsFeature("gamepad");
  } catch (e) { status.policy = null; }
  function rawPads() {
    if (!status.api) return [];
    try { return [...navigator.getGamepads()].filter((p) => p && p.connected !== false); }
    catch (e) { status.blocked = true; status.error = e.name + ": " + e.message; return []; }
  }
  // The pads in the order the browser numbered them, so pad 0 stays pad 0 when pad 1 leaves.
  function pads() { return rawPads().sort((a, b) => a.index - b.index); }

  let custom = {};
  try { custom = JSON.parse(localStorage.getItem("strikelegends.pads.v1") || "{}") || {}; } catch (e) { custom = {}; }
  function saveCustom() { try { localStorage.setItem("strikelegends.pads.v1", JSON.stringify(custom)); } catch (e) { /* storage blocked */ } }

  // The profile a pad is read with; "guess" is a pad nobody recognised, read as standard.
  function profileName(p) {
    if (custom[p.id]) return "custom";
    if (p.mapping === "standard") return "standard";
    const sony = SONY.test(p.id);
    if (sony && p.buttons.length === 13 && p.axes.length >= 8 && p.axes.length < 10) return "ds4linux";
    if (p.buttons.length >= 13 && p.axes.length >= 10) return "ds4raw";
    if (!sony && p.axes.length >= 8 && p.buttons.length >= 11 && p.buttons.length <= 13) return "xpad";
    return "guess";
  }
  function profileOf(p) {
    const n = profileName(p);
    if (n === "custom") return customProfile(custom[p.id]);
    return PROFILES[n] || PROFILES.standard;
  }
  // A recorded table: each name bound to a button {b}, a direction of a hat axis {h} or an axis
  // moved from its rest {a, v, r}; the sticks to axes with a sign. Tables saved before the
  // sticks and axes existed held buttons only ({buttons: {name: index}}).
  function customProfile(c) {
    if (c.buttons && !c.binds) return { buttons: c.buttons, axes: PROFILES.standard.axes };
    return { binds: c.binds || {}, sticks: c.sticks || {} };
  }
  // Every logical button 0..1 and the four stick axes, through the pad's profile.
  function logical(p) {
    const pr = profileOf(p), out = {};
    const bv = (i) => { const b = p.buttons[i]; return b ? Math.max(b.pressed ? 1 : 0, b.value || 0) : 0; };
    if (pr.binds) {
      for (const n of NAMES) {
        const k = pr.binds[n];
        out[n] = !k ? 0 : k.b !== undefined ? bv(k.b) : k.h !== undefined ? (hatDirs(p.axes[k.h])[n] || (k.d && hatDirs(p.axes[k.h])[k.d]) || 0)
          : Math.max(0, Math.min(1, ((p.axes[k.a] || 0) - k.r) / ((k.v - k.r) || 1)));
      }
      for (const n of ["lx", "ly", "rx", "ry"]) { const st = pr.sticks[n] || { i: { lx: 0, ly: 1, rx: 2, ry: 3 }[n], s: 1 }; out[n] = (p.axes[st.i] || 0) * st.s; }
      return out;
    }
    for (const n of NAMES) out[n] = pr.buttons[n] !== undefined ? bv(pr.buttons[n]) : 0;
    if (pr.hat !== undefined && p.axes.length > pr.hat) { const h = hatDirs(p.axes[pr.hat]); for (const d of ["up", "down", "left", "right"]) out[d] = Math.max(out[d], h[d]); }
    for (const [n, i] of Object.entries(pr.triggerAxes || {})) if (p.axes.length > i) out[n] = Math.max(out[n], ((p.axes[i] || 0) + 1) / 2);
    if (pr.crossAxes && p.axes.length > pr.crossAxes[1]) {
      const cx = p.axes[pr.crossAxes[0]] || 0, cy = p.axes[pr.crossAxes[1]] || 0;
      out.left = Math.max(out.left, cx < -0.5 ? 1 : 0); out.right = Math.max(out.right, cx > 0.5 ? 1 : 0);
      out.up = Math.max(out.up, cy < -0.5 ? 1 : 0); out.down = Math.max(out.down, cy > 0.5 ? 1 : 0);
    }
    for (const [n, i] of Object.entries(pr.axes)) out[n] = p.axes[i] || 0;
    return out;
  }
  const down = (l, n) => l[n] > 0.5;

  // What each match action is on the pad. "classic" is the Godot game's layout (docs/DETTAGLI.md),
  // "fifa" moves the shot to B and the switch to LB, as EA Sports FC does on Xbox.
  const LAYOUTS = {
    classic: { pass: "a", shoot: "x", feint: "b", special: "y", mod: "lb", switch: "rb", sprint: "rt" },
    fifa: { pass: "a", shoot: "b", feint: "x", special: "y", mod: "rb", switch: "lb", sprint: "rt" },
  };
  SL.PAD_LAYOUTS = { classic: "Classico", fifa: "Stile FC" };
  function layout() { const s = SL.currentSettings && SL.currentSettings(); return LAYOUTS[(s && s.padLayout) || "classic"] || LAYOUTS.classic; }

  // ---- One player's input --------------------------------------------------------------
  // device: {kb: "kb0" | "kbW" | "kb1" | null, pad: n | null}
  function read(device) {
    const out = { x: 0, z: 0, rx: 0, rz: 0, skill: 0, sprint: false, pass: false, shoot: false, feint: false, switch: false, mod: false, special: false };
    const held = (code) => keys.has(code) || tapped.has(code);
    const kb = device && device.kb;
    if (kb) {
      // kb0: WASD and the arrows for one player alone; kbW: WASD only, when kb1 has the arrows.
      const k = KB[kb === "kb1" ? 1 : 0];
      const alt = kb === "kb0";
      out.x = (keys.has(k.right) || (alt && keys.has("ArrowRight")) ? 1 : 0) - (keys.has(k.left) || (alt && keys.has("ArrowLeft")) ? 1 : 0);
      out.z = (keys.has(k.down) || (alt && keys.has("ArrowDown")) ? 1 : 0) - (keys.has(k.up) || (alt && keys.has("ArrowUp")) ? 1 : 0);
      out.sprint = keys.has(k.sprint) || (alt && keys.has("ShiftRight"));
      out.pass = held(k.pass); out.shoot = held(k.shoot); out.feint = held(k.feint);
      out.switch = held(k.switch); out.mod = keys.has(k.mod); out.special = held(k.special);
      // the skill moves straight from the number row (skills.js, key)
      if (kb !== "kb1") for (let n = 1; n <= 9; n++) if (tapped.has("Digit" + n)) out.skill = n;
    }
    const p = device && device.pad != null ? pads()[device.pad] : null;
    if (p) {
      const l = logical(p), L = layout();
      let ax = l.lx, az = l.ly;
      if (down(l, "left")) ax = -1; if (down(l, "right")) ax = 1; if (down(l, "up")) az = -1; if (down(l, "down")) az = 1;
      const m = Math.hypot(ax, az);
      if (m > DEAD) { const s = Math.min(1, (m - DEAD) / 0.7) / m; out.x += ax * s; out.z += az * s; }
      for (const act of ["pass", "shoot", "feint", "special", "mod", "switch"]) out[act] = out[act] || down(l, L[act]);
      out.sprint = out.sprint || l[L.sprint] > 0.3;
      // the right stick, for the skill moves (skills.js)
      if (Math.hypot(l.rx, l.ry) > DEAD) { out.rx = l.rx; out.rz = l.ry; }
    }
    const m = Math.hypot(out.x, out.z); if (m > 1) { out.x /= m; out.z /= m; }
    return out;
  }

  // ---- Menus: edges of every pad, as named buttons ------------------------------------
  // Every connected pad drives the menus, so a receiver or a virtual pad the browser lists
  // first cannot take them. A stick direction counts only once that stick has been seen at
  // rest, so an axis resting at -1 cannot hold a direction down. A direction held repeats:
  // the first repeat after REPEAT_FIRST, then every REPEAT_EVERY (seconds).
  const REPEAT_FIRST = 0.35, REPEAT_EVERY = 0.15;
  const REPEATS = new Set(["up", "down", "left", "right"]);
  const prevMenu = {}, nextRepeat = {}, stickRest = {};
  function menuEdges() {
    const now = { up: false, down: false, left: false, right: false, a: false, b: false, menu: false, view: false, lb: false, rb: false };
    for (const p of pads()) {
      const l = logical(p), key = p.index + "|" + p.id;
      const rest = stickRest[key] || (stickRest[key] = { x: false, y: false });
      if (Math.abs(l.lx) < 0.3) rest.x = true;
      if (Math.abs(l.ly) < 0.3) rest.y = true;
      now.up = now.up || down(l, "up") || (rest.y && l.ly < -0.6); now.down = now.down || down(l, "down") || (rest.y && l.ly > 0.6);
      now.left = now.left || down(l, "left") || (rest.x && l.lx < -0.6); now.right = now.right || down(l, "right") || (rest.x && l.lx > 0.6);
      for (const n of ["a", "b", "menu", "view", "lb", "rb"]) now[n] = now[n] || down(l, n);
    }
    const t = performance.now() / 1000, edge = {};
    for (const k in now) {
      edge[k] = now[k] && !prevMenu[k];
      if (edge[k]) nextRepeat[k] = t + REPEAT_FIRST;
      else if (now[k] && REPEATS.has(k) && t >= nextRepeat[k]) { edge[k] = true; nextRepeat[k] = t + REPEAT_EVERY; }
    }
    Object.assign(prevMenu, now);
    return { now, edge };
  }

  // ---- Rumble: Chrome and Edge drive an Xbox pad's motors through vibrationActuator ----
  function rumble(device, strong, weak, ms) {
    const s = SL.currentSettings && SL.currentSettings();
    if (s && s.rumble === false) return;
    const p = device && device.pad != null ? pads()[device.pad] : null;
    const act = p && p.vibrationActuator;
    if (!act || !act.playEffect) return;
    try { act.playEffect("dual-rumble", { duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => {}); } catch (e) { /* not supported */ }
  }

  // A pad is exposed only after one of its buttons is pressed with the page in focus (Chrome,
  // Firefox): the first press fires gamepadconnected.
  const listeners = [];
  window.addEventListener("gamepadconnected", (e) => { status.seen++; for (const f of listeners) f("on", e.gamepad); });
  window.addEventListener("gamepaddisconnected", (e) => { for (const f of listeners) f("off", e.gamepad); });

  // Sony pads get their symbols, everything else the Xbox letters.
  function labels(p) {
    const sony = p && (SONY.test(p.id) || ["ds4raw", "ds4linux"].includes(profileName(p)));
    return sony
      ? { a: "✕", b: "○", x: "□", y: "△", lb: "L1", rb: "R1", lt: "L2", rt: "R2", view: PS5.test(p.id) ? "CREATE" : "SHARE", menu: "OPTIONS", ls: "L3", rs: "R3" }
      : { a: "A", b: "B", x: "X", y: "Y", lb: "LB", rb: "RB", lt: "LT", rt: "RT", view: "View", menu: "Menu", ls: "LS", rs: "RS" };
  }

  SL.input = {
    keys, tapped, clearTaps: () => tapped.clear(), read, pads, logical, profileName, menuEdges, rumble, status,
    labels: () => labels(pads()[0]), layout, LAYOUTS, NAMES, onPad: (f) => listeners.push(f),
    setCustom(id, table) { if (table) custom[id] = table; else delete custom[id]; saveCustom(); },
    hasCustom: (id) => !!custom[id], padLabels: labels, hatDirs,
  };
})();

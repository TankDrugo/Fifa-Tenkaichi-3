// Strike Legends (browser) - Impostazioni: formation, match, controls (with Prova joypad),
// audio, video, camera, save. Every value is kept in the browser with the game (data.js).
"use strict";

(function () {
  const SL = window.SL;
  const U = () => SL.ui;
  const esc = (t) => U().esc(t);
  const TABS = { formazione: "Formazione", partita: "Partita", comandi: "Comandi", audio: "Audio", video: "Video", camera: "Telecamera", salvataggio: "Salvataggio" };
  const pct = (v) => Math.round(v * 100) + "%";
  const cyc = (v, n, d) => (v + d + n) % n;
  const yes = (b) => (b ? "Sì" : "No");
  let resetArmed = "";
  const PASS_ASSIST = { assisted: "Assistito", semi: "Semi", manual: "Manuale" };

  function open(tab) {
    const ui = U(), s = ui.settings();
    tab = TABS[tab] ? tab : "formazione";
    const vol = (k) => (d) => { s[k] = Math.round(Math.max(0, Math.min(1, s[k] + d * 0.1)) * 10) / 10; SL.audio.setVolumes(s); };
    const tog = (k) => () => { s[k] = !s[k]; };
    const act = (f) => Object.assign(f, { action: true });
    const forms = Object.keys(SL.FORMATIONS);
    const rows = {
      formazione: [
        ["formation", "Formazione", "Dove stanno i quattro giocatori di movimento della tua squadra, senza palla", esc(SL.FORMATIONS[s.formation].name), (d) => { s.formation = forms[cyc(forms.indexOf(s.formation), forms.length, d)]; }],
        ["autoSwitch", "Cambio automatico", "Passi al compagno che riceve o raccoglie il pallone", yes(s.autoSwitch), tog("autoSwitch")],
        ["aiHits", "Spallate dell'IA", "Gli avversari possono colpire per primi", yes(s.aiHits), tog("aiHits")],
      ],
      partita: [
        ["minutes", "Durata", "Minuti di gioco effettivo", `${s.minutes} min`, (d) => { const v = [2, 3, 4, 6, 8], i = v.indexOf(s.minutes); s.minutes = v[cyc(i, v.length, d)]; }],
        ["difficulty", "Difficoltà", "Velocità, tempi di reazione e decisioni degli avversari", ["Facile", "Normale", "Difficile"][s.difficulty], (d) => { s.difficulty = cyc(s.difficulty, 3, d); }],
        ["goldenGoal", "Gol d'oro", "In parità allo scadere, vince il primo gol", yes(s.goldenGoal), tog("goldenGoal")],
        ["opponentAi", "IA avversaria", "Nelle amichevoli", ["Gioca", "Ferma, portiere attivo", "Ferma, anche il portiere"][s.opponentAi], (d) => { s.opponentAi = cyc(s.opponentAi, 3, d); }],
        ["hitLook", "Spallata", "Il disegno del colpo e della reazione", ["Debole", "Media", "Forte", "Violenta"][s.hitLook], (d) => { s.hitLook = cyc(s.hitLook, 4, d); }],
      ],
      comandi: [
        ["padTest", "Prova joypad", "Cosa vede il browser di ogni joypad, tasto per tasto", "Apri", act(() => padTest())],
        ["passAssist", "Passaggi", "Assistito: compagno e potenza li sceglie il gioco · Semi: il compagno lo sceglie la levetta, la potenza quanto tieni premuto · Manuale: la palla va dove punta la levetta, forte quanto tieni premuto", PASS_ASSIST[s.passAssist] || PASS_ASSIST.semi, (d) => { const k = Object.keys(PASS_ASSIST); s.passAssist = k[cyc(Math.max(0, k.indexOf(s.passAssist)), k.length, d)]; }],
        ["padLayout", "Disposizione joypad", "Classico: X tiro, B finta, RB cambia · Stile FC: B tiro, X finta, LB cambia", SL.PAD_LAYOUTS[s.padLayout] || "Classico", () => { s.padLayout = s.padLayout === "fifa" ? "classic" : "fifa"; }],
        ["rumble", "Vibrazione", "Spallate e gol (Chrome, Edge)", yes(s.rumble), tog("rumble")],
        ["showHints", "Comandi a schermo", "La riga dei tasti in basso durante la partita", yes(s.showHints), tog("showHints")],
        ["controls", "Schema dei comandi", "Tastiera e joypad, azione per azione", "Apri", act(() => controls())],
      ],
      audio: [
        ["master", "Volume generale", "", pct(s.master), vol("master")],
        ["sfx", "Effetti", "Calci, spallate, fischi", pct(s.sfx), vol("sfx")],
        ["crowd", "Pubblico", "Il brusio dello stadio", pct(s.crowd), vol("crowd")],
        ["voice", "Telecronaca", "Il volume del telecronista", pct(s.voice), vol("voice")],
        ["commentary", "Telecronista", "Frasi in italiano su gol, parate, spallate, inizio e fine", yes(s.commentary), tog("commentary")],
      ],
      video: [
        ["fullscreen", "Schermo intero", "Dove il browser lo consente", document.fullscreenElement ? "Sì" : "No", act(() => { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => ui.toast("Il browser non consente lo schermo intero qui")); } catch (e) { ui.toast("Il browser non consente lo schermo intero qui"); } })],
        ["names", "Nomi sui giocatori", "Il cognome sopra la testa", ["Nessuno", "Solo il tuo", "Tutti"][s.names], (d) => { s.names = cyc(s.names, 3, d); }],
        ["weather", "Tempo atmosferico", "Neve, braci e nebbia dei campi a tema", yes(s.weather), tog("weather")],
        ["shake", "Scossa dello schermo", "Su spallate e mossa speciale", yes(s.shake), tog("shake")],
      ],
      camera: [
        ["zoom", "Inquadratura", "Quanto campo si vede: vicina 10,5 m di profondità, media 13,5, larga tutto il campo", ["Vicina", "Media", "Larga"][s.zoom], (d) => { s.zoom = cyc(s.zoom, 3, d); }],
        ["camFollow", "Segui palla", "Quanto in fretta la telecamera raggiunge il pallone", ["Lenta", "Normale", "Rapida"][s.camFollow], (d) => { s.camFollow = cyc(s.camFollow, 3, d); }],
        ["camLead", "Anticipo", "La telecamera guarda dove va chi ha palla", yes(s.camLead), tog("camLead")],
      ],
      salvataggio: [
        ["resetUT", "Nuovo Ultimate Team", "Azzera crediti, collezione, divisione e coppe", "Azzera", act(() => arm("resetUT", () => { ui.game().ut = SL.newGame().ut; }))],
        ["resetCareer", "Cancella la carriera", "La carriera in corso", "Cancella", act(() => arm("resetCareer", () => { ui.game().career = null; SL.extraCards = {}; }))],
        ["resetAll", "Cancella tutto", "Impostazioni, Ultimate Team, carriera e sfide", "Cancella", act(() => arm("resetAll", () => { ui.setGame(SL.newGame()); }))],
      ],
    };
    function arm(k, f) { if (resetArmed === k) { f(); resetArmed = ""; ui.toast("Fatto"); } else { resetArmed = k; ui.toast("Premi di nuovo per confermare"); setTimeout(() => { if (resetArmed === k) resetArmed = ""; }, 3000); } }
    const side = tab === "formazione" ? `<div class="panel"><h3>${esc(SL.FORMATIONS[s.formation].name)}</h3>${formationSvg(s.formation)}<div class="crumb" style="letter-spacing:0;text-transform:none;font-family:var(--body)">La tua squadra attacca verso destra. Le posizioni sono quelle senza palla; l'IA dei compagni le sposta col pallone (docs/DETTAGLI.md, «IA»).</div></div>`
      : `<div class="panel"><h3>Salvataggio</h3>Impostazioni, Ultimate Team, carriera e sfide restano in questo browser.</div>`;
    const m = ui.menuScreen(ui.frame("Impostazioni", TABS[tab],
      `<div class="tabs">${Object.entries(TABS).map(([k, v]) => `<button class="tab ${k === tab ? "on" : ""}" data-nav data-tab="${k}">${v}</button>`).join("")}</div>
       <div class="rows scroll">${ui.rowsHtml(rows[tab])}</div>`, side));
    // actions keep their own screen; a step redraws this tab
    for (const [k, , , , f] of rows[tab]) {
      const el = m.querySelector(`[data-key="${k}"]`); if (!el) continue;
      if (f.action) { el.addEventListener("click", () => { SL.audio.ui(); f(); ui.save(); if (!["padTest", "controls"].includes(k)) { open(tab); m.querySelector(`[data-key="${k}"]`)?.focus(); } }); continue; }
      el._step = (d) => { f(d); ui.save(); open(tab); m.querySelector(`[data-key="${k}"]`)?.focus(); };
      el.addEventListener("click", () => el._step(1));
    }
    m.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { open(b.dataset.tab); m.querySelector(`[data-tab="${b.dataset.tab}"]`).focus(); }));
    ui.setBack(ui.goMenu); ui.focusFirst();
  }

  // The five spots of a formation on a small pitch, attacking right.
  function formationSvg(id) {
    const sp = SL.FORMATIONS[id].spots, roles = ["POR"].concat(SL.ut.formationRoles(id));
    const X = (x) => 8 + (x + 14) / 28 * 284, Y = (z) => 8 + (z + 8) / 16 * 160;
    return `<svg viewBox="0 0 300 176" class="formsvg" role="img" aria-label="Formazione ${esc(SL.FORMATIONS[id].name)}">
      <rect x="8" y="8" width="284" height="160" fill="#2f7a35" stroke="#eef3ea" stroke-width="2"/><line x1="150" y1="8" x2="150" y2="168" stroke="#eef3ea" stroke-width="2"/>
      <circle cx="150" cy="88" r="26" fill="none" stroke="#eef3ea" stroke-width="2"/><rect x="8" y="45" width="22" height="86" fill="none" stroke="#eef3ea" stroke-width="2"/><rect x="270" y="45" width="22" height="86" fill="none" stroke="#eef3ea" stroke-width="2"/>
      ${sp.map(([x, z], i) => `<g><circle cx="${X(x)}" cy="${Y(z)}" r="11" fill="${i ? "#e23b2e" : "#f2c14e"}" stroke="#060d16" stroke-width="2"/><text x="${X(x)}" y="${Y(z) + 25}" fill="#eef3ea" font-size="11" text-anchor="middle" font-family="Barlow, sans-serif">${roles[i]}</text></g>`).join("")}
    </svg>`;
  }

  // ---- Prova joypad: what the browser sees of each pad, live --------------------------------------
  // The check Tancredi runs by himself: whether the page may read pads
  // at all, which pads it sees, every raw button and axis, and the action a match reads.
  const PAD_PARTS = [["lt", "LT"], ["lb", "LB"], ["view", "View"], ["menu", "Menu"], ["rb", "RB"], ["rt", "RT"],
    ["up", "↑"], ["left", "←"], ["right", "→"], ["down", "↓"], ["ls", "LS"], ["rs", "RS"], ["y", "Y"], ["x", "X"], ["b", "B"], ["a", "A"]];
  const ACT_NAMES = { pass: "passaggio", shoot: "tiro / spallata", feint: "finta / scivolata", special: "mossa speciale", mod: "modificatore", switch: "cambia", sprint: "scatto" };
  function framed() { try { return window.top !== window.self; } catch (e) { return true; } }
  function padTest() {
    const ui = U(), st = SL.input.status;
    const policy = st.policy === true ? "consentita" : st.policy === false ? "NEGATA dalla pagina che contiene il gioco" : "non dichiarata (il browser la consente)";
    const m = ui.menuScreen(ui.frame("Impostazioni · Comandi", "Prova joypad",
      `<div class="panel padstat" id="pt-status"></div>
       <div id="pt-pads" class="padlist"></div>
       <div class="top"><button class="cta" data-nav data-go="map" data-first=1>Assegna i tasti</button>
         <button class="item" data-nav data-go="reset" style="font-size:22px">Tasti di serie</button>
         <button class="item" data-nav data-go="buzz" style="font-size:22px">Vibrazione</button>
         <button class="item" data-nav data-go="back" style="font-size:22px">Indietro</button></div>
       <div class="panel padstat"><div><b>Nei menu leggo</b> <span id="pt-menu"></span></div></div>
       <div class="crumb" style="letter-spacing:0;text-transform:none;font-family:var(--body)" id="pt-hint">Qui i tasti si provano soltanto. Croce o levetta: scegli un pulsante; tieni premuto A per un secondo: lo premi; tieni premuto B per un secondo: esci. View: assegna i tasti.</div>
       <div class="panel"><h3>Se non vedi il joypad</h3>
        1. Clicca una volta dentro il gioco: il browser manda tasti e joypad solo alla pagina selezionata.<br>
        2. Premi A sul joypad: Chrome, Edge e Firefox mostrano il joypad a una pagina solo dopo la prima pressione.<br>
        3. Se la riga «Permesso della pagina» dice NEGATA, il link che contiene il gioco blocca i joypad: va aperto il gioco fuori da quel riquadro.<br>
        4. Joypad PS4 e PS5, ufficiali e non: il gioco li riconosce e mostra ✕ ○ □ △. Se la riga «lettura» dice «non riconosciuto», o un tasto fa la cosa sbagliata, «Assegna i tasti» registra quel joypad: tasti, croce e levette, uno alla volta; vale per tutti i joypad con lo stesso nome.<br>
        5. Con più joypad, «Assegna i tasti» registra quello che si muove per primo.</div>`, "", true));
    const statusLine = () => `<div><b>API Gamepad</b> ${st.api ? "presente" : "assente in questo browser"}</div>
      <div><b>Permesso della pagina</b> ${policy}</div>
      <div><b>Dentro un riquadro</b> ${framed() ? "sì: la pagina che lo contiene decide se i joypad passano" : "no"}</div>
      ${st.blocked ? `<div class="bad"><b>Errore</b> ${esc(st.error)}</div>` : ""}
      <div><b>Joypad collegati</b> <span id="pt-n">0</span> · <b>Disposizione in partita</b> ${esc(SL.PAD_LAYOUTS[ui.settings().padLayout || "classic"])}</div>`;
    ui.$("#pt-status", m).innerHTML = statusLine();
    let mapping = null, holdA = 0, holdB = 0, lastPads = "";
    const MENU_NAMES = [["up", "su"], ["down", "giù"], ["left", "sinistra"], ["right", "destra"], ["a", "A"], ["b", "B"], ["lb", "LB"], ["rb", "RB"], ["menu", "Menu"], ["view", "View"]];
    // The names the wizard asks, in order; the four stick directions last. A pad's own names
    // (✕ ○ □ △ on a PlayStation pad) come from input.js, padLabels.
    const ORDER = ["a", "b", "x", "y", "lb", "rb", "lt", "rt", "view", "menu", "up", "down", "left", "right", "lx", "ly", "rx", "ry"];
    const DIR_NAMES = { up: "croce su", down: "croce giù", left: "croce sinistra", right: "croce destra", lx: "levetta sinistra verso destra", ly: "levetta sinistra verso il basso", rx: "levetta destra verso destra", ry: "levetta destra verso il basso" };
    const askName = (p, n) => DIR_NAMES[n] || SL.input.padLabels(p)[n];
    // Every pad's buttons and axes at rest, when the wizard starts: the pad that moves first is
    // the one being recorded.
    function startMapping() {
      const list = SL.input.pads();
      if (!list.length) { ui.toast("Prima premi un tasto sul joypad"); return; }
      mapping = { pad: -1, i: 0, binds: {}, sticks: {}, used: new Set(), wait: true, rest: list.map((p) => ({ b: p.buttons.map((x) => x.pressed || x.value > 0.5), a: p.axes.slice() })) };
    }
    const outOfRange = (v) => !(v >= -1.05 && v <= 1.05);   // a hat axis at rest (9/7)
    // One input that left its rest on pad i, as a binding for name n, or null.
    function capture(list, i, n) {
      const p = list[i], r = mapping.rest[i]; if (!p || !r) return null;
      const stick = ["lx", "ly", "rx", "ry"].includes(n);
      if (!stick) {
        const k = p.buttons.findIndex((x, j) => (x.pressed || x.value > 0.5) && !r.b[j] && !mapping.used.has("b" + j));
        if (k >= 0) return { key: "b" + k, bind: { b: k } };
      }
      let best = -1, bd = 0.6;
      p.axes.forEach((v, j) => { const d = outOfRange(r.a[j]) ? (outOfRange(v) ? 0 : 2) : Math.abs(v - r.a[j]); if (d > bd) { bd = d; best = j; } });
      if (best < 0) return null;
      const v = p.axes[best], r0 = r.a[best];
      if (outOfRange(r0)) {
        if (stick) return null;
        const h = SL.input.hatDirs(v), d = ["up", "right", "down", "left"].find((x) => h[x]);
        const key = "h" + best + d; if (!d || mapping.used.has(key)) return null;
        return { key, bind: { h: best, d } };
      }
      if (stick) { const key = "s" + best; if (mapping.used.has(key)) return null; return { key, stick: { i: best, s: Math.sign(v - r0) } }; }
      const to = Math.abs(v) > 0.9 ? Math.sign(v) : v, key = "a" + best + (to > r0 ? "+" : "-");
      if (mapping.used.has(key)) return null;
      return { key, bind: { a: best, v: to, r: r0 } };
    }
    // Back at rest: no button down and every axis within 0,3 of its rest (a hat back out of range).
    const atRest = (p, r) => p.buttons.every((x, j) => !(x.pressed || x.value > 0.5) || r.b[j]) && p.axes.every((v, j) => outOfRange(r.a[j]) ? outOfRange(v) || Math.abs(v - r.a[j]) < 0.3 : Math.abs(v - r.a[j]) < 0.3);
    function build(list) {
      if (!list.length) return `<div class="panel"><b>Nessun joypad visto.</b> Clicca nel gioco e premi A (✕ su un joypad PlayStation).</div>`;
      return list.map((p, i) => `<div class="panel pad" data-pad="${i}">
        <h3>Joypad ${i + 1} · ${esc(ui.shortPad(p.id))}</h3>
        <div class="padmeta">mapping «${esc(p.mapping || "")}» · lettura <b data-f="prof"></b> · ${p.buttons.length} tasti, ${p.axes.length} assi${p.vibrationActuator ? " · vibrazione" : ""}</div>
        <div class="padviz">
          <div class="stick"><i data-s="l"></i></div>
          <div class="pbtns">${PAD_PARTS.map(([k, l]) => `<span class="pb pb-${k}" data-b="${k}">${l}</span>`).join("")}</div>
          <div class="stick"><i data-s="r"></i></div>
        </div>
        <div class="raw" data-f="raw"></div>
        <div class="acts" data-f="acts"></div>
      </div>`).join("");
    }
    const leave = () => { ui.setPadHook(null); open("comandi"); };
    ui.setPadHook((now, edge) => {
      if (!ui.$("#pt-pads")) { ui.setPadHook(null); return; }
      const list = SL.input.pads();
      const sig = list.map((p) => p.index + p.id).join("|");
      if (sig !== lastPads) { ui.$("#pt-pads").innerHTML = build(list); lastPads = sig; ui.$("#pt-status").innerHTML = statusLine(); ui.$("#pt-n").textContent = list.length; }
      // What the menus receive from every pad together (input.js, menuEdges).
      ui.$("#pt-menu").innerHTML = MENU_NAMES.map(([k, l]) => `<span class="key" style="${now[k] ? "background:var(--gold);color:var(--night)" : "opacity:0.45"}">${l}</span>`).join(" ");
      list.forEach((p, i) => {
        const el = ui.$(`[data-pad="${i}"]`); if (!el) return;
        const l = SL.input.logical(p);
        el.querySelector('[data-f="prof"]').textContent = SL.PAD_PROFILE_NAMES[SL.input.profileName(p)] || SL.input.profileName(p);
        el.querySelectorAll("[data-b]").forEach((b) => { const v = l[b.dataset.b] || 0; b.classList.toggle("on", v > 0.5); b.style.setProperty("--v", v.toFixed(2)); });
        const dot = (sx, sy) => `translate(${(sx * 22).toFixed(1)}px, ${(sy * 22).toFixed(1)}px)`;
        el.querySelector('[data-s="l"]').style.transform = dot(l.lx, l.ly);
        el.querySelector('[data-s="r"]').style.transform = dot(l.rx, l.ry);
        el.querySelector('[data-f="raw"]').innerHTML = p.buttons.map((b, k) => `<span class="${b.pressed || b.value > 0.5 ? "on" : ""}">b${k}${b.value > 0.01 && b.value < 0.99 ? " " + b.value.toFixed(2) : ""}</span>`).join("")
          + p.axes.map((a, k) => `<span class="${Math.abs(a) > 0.3 ? "on" : ""}">a${k} ${a.toFixed(2)}</span>`).join("");
        const r = SL.input.read({ kb: null, pad: i });
        const acts = Object.keys(ACT_NAMES).filter((k) => r[k]).map((k) => ACT_NAMES[k]);
        el.querySelector('[data-f="acts"]').innerHTML = `<b>In partita:</b> levetta ${r.x.toFixed(2)}, ${r.z.toFixed(2)}${acts.length ? " · " + acts.join(", ") : ""}`;
      });
      // The wizard: each requested name takes the first button, cross direction or axis that
      // leaves its rest; between two names everything goes back to rest.
      if (mapping) {
        const n = ORDER[mapping.i], shown = mapping.pad >= 0 ? list[mapping.pad] : list[0];
        ui.$("#pt-hint").textContent = `Assegna (${mapping.i + 1} di ${ORDER.length}): ${["lx", "ly", "rx", "ry"].includes(n) ? "muovi la" : "premi"} ${askName(shown, n)}. Esc annulla.`;
        if (mapping.wait) { if ((mapping.pad >= 0 ? [mapping.pad] : list.map((_, i) => i)).every((i) => !list[i] || atRest(list[i], mapping.rest[i]))) mapping.wait = false; return; }
        const pads = mapping.pad >= 0 ? [mapping.pad] : list.map((_, i) => i);
        for (const i of pads) {
          const c = capture(list, i, n); if (!c) continue;
          mapping.pad = i; mapping.used.add(c.key);
          if (c.stick) mapping.sticks[n] = c.stick; else mapping.binds[n] = c.bind;
          mapping.i++; mapping.wait = true; SL.audio.ui();
          if (mapping.i >= ORDER.length) {
            SL.input.setCustom(list[i].id, { binds: mapping.binds, sticks: mapping.sticks });
            mapping = null; lastPads = "";
            ui.$("#pt-hint").textContent = "Tasti salvati per questo joypad. Per uscire: Esc, oppure tieni premuto B per un secondo.";
            ui.toast("Tasti del joypad salvati");
          }
          break;
        }
        return;
      }
      if (edge.view) { startMapping(); return; }
      // Moving the cursor tests nothing away; A and B act only when held, so a press is a test.
      if (edge.up) ui.moveFocus(0, -1); if (edge.down) ui.moveFocus(0, 1);
      if (edge.left) ui.moveFocus(-1, 0); if (edge.right) ui.moveFocus(1, 0);
      const t = performance.now();
      holdA = now.a ? (holdA || t) : 0;
      if (holdA > 0 && t - holdA >= 1000) { holdA = -1; ui.pressCur(); }
      holdB = now.b ? (holdB || t) : 0;
      if (holdB && t - holdB >= 1000) { holdB = 0; SL.audio.uiBack(); leave(); }
    });
    ui.wire(m, {
      map: startMapping,
      reset: () => { const list = SL.input.pads(); for (const p of list) SL.input.setCustom(p.id, null); lastPads = ""; ui.toast(list.length ? "Tasti di serie" : "Nessun joypad visto"); },
      buzz: () => SL.input.rumble({ pad: 0 }, 1, 1, 400),
      back: leave,
    });
    ui.setBack(() => { if (mapping) { mapping = null; ui.$("#pt-hint").textContent = "Assegnazione annullata."; return; } leave(); });
    ui.focusFirst();
  }

  function controls() {
    const ui = U(), lb = SL.input.labels(), L = SL.input.layout();
    const r = (a, k, p) => `<tr><td>${a}</td><td>${k.map((x) => `<span class="key">${x}</span>`).join("")}</td><td>${p.map((x) => `<span class="key">${x}</span>`).join("")}</td></tr>`;
    const m = ui.menuScreen(ui.frame("Impostazioni · Comandi", "Tastiera e joypad",
      `<div class="scroll panel"><table class="ctrl"><tr><td></td><td>Tastiera</td><td>Joypad · ${esc(SL.PAD_LAYOUTS[ui.settings().padLayout || "classic"])}</td></tr>
        ${r("Muoversi", ["W", "A", "S", "D"], ["Levetta sinistra", "Croce"])}
        ${r("Scatto", ["Shift"], [lb[L.sprint]])}
        ${r(ui.settings().passAssist === "assisted" ? "Passaggio · passaggio alto" : "Passaggio (tieni per la potenza) · passaggio alto", ["J", "U+J"], [lb[L.pass], lb[L.mod] + "+" + lb[L.pass]])}
        ${r("Tiro (tieni per caricare) · pallonetto", ["K", "U+K"], [lb[L.shoot], lb[L.mod] + "+" + lb[L.shoot]])}
        ${r("Senza palla: spallata", ["K"], [lb[L.shoot]])}
        ${r("Finta · senza palla: scivolata", ["L"], [lb[L.feint]])}
        ${r("Cambia giocatore", ["Q"], [lb[L.switch]])}
        ${r("Senza palla: chiedi il passaggio", ["J"], [lb[L.pass]])}
        ${r("Tensione: 1 tacca tiro caricato · 3 tacche Colpo della Cometa (metà avversaria)", ["Spazio"], [lb[L.special]])}
        ${r("Pausa", ["Esc"], [lb.menu])}
        ${r("Menu: conferma · indietro · schede", ["Invio", "Esc"], [lb.a, lb.b, lb.lb + "/" + lb.rb])}
        <tr><td>Giocatore 2 senza joypad</td><td colspan="2">Frecce · tastierino 1 passaggio, 2 tiro, 3 finta, 0 scatto, 5 cambia, 4 alto, 6 mossa speciale</td></tr>
      </table>
      <h3 style="margin-top:14px">Skill, col pallone</h3>
      <table class="ctrl"><tr><td>Skill · stelle che servono</td><td>Tastiera</td><td>Levetta destra</td></tr>
        ${Object.values(SL.SKILLS).map((k) => `<tr><td>${esc(k.name)} · ${"★".repeat(k.stars)}</td><td><span class="key">${k.key}</span></td><td>${esc(k.gesture)}</td></tr>`).join("")}
        <tr><td colspan="3">Le direzioni sono rispetto a dove guarda il giocatore. Le stelle di ogni giocatore sono sulla sua carta: chi ne ha meno non riesce la skill. Un difensore dell'IA a meno di 2,2 m davanti può abboccare e restare fermo, o sbilanciato, per 0,35-0,8 s.</td></tr>
      </table></div><button class="cta" data-nav data-go="back" data-first=1>Indietro</button>`,
      `<div class="panel"><h3>Le regole in breve</h3>Campo chiuso: niente falli, rimesse o fuorigioco. La palla si ruba con la spallata o la scivolata; il portiere non si colpisce. Ogni portiere ha una riserva di parata che cala a ogni tiro parato e si ricarica quando la palla è nell'altra metà. La barra della Tensione ha tre tacche e si carica battendo l'avversario: dal terzo passaggio di fila, intercetti, spallate e scivolate vinte, parate, e un po' per ogni gol subito. Una tacca dà un tiro caricato, che al portiere costa il doppio della riserva; tre tacche, nella metà avversaria, il Colpo della Cometa a due tempi, che vale due gol se prendi entrambe le finestre e che una spallata ferma mentre si carica. Piena, la barra resta piena 20 secondi, poi scende a due tacche.</div>`));
    ui.wire(m, { back: () => open("comandi") });
    ui.setBack(() => open("comandi")); ui.focusFirst();
  }

  SL.settingsUI = { open, padTest };
})();

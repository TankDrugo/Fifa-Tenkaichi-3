// Strike Legends (browser) - quick friendly, the lore teams, training and the challenges.
"use strict";

(function () {
  const SL = window.SL, R = SL.Render;
  const U = () => SL.ui;

  // Your Ultimate Team as a club, with its five on the pitch.
  function myClub() {
    const g = U().game(), u = g.ut;
    const cards = u.squad.map((k) => SL.cardById((SL.entryOf(g, k) || {}).id)).filter(Boolean);
    const rating = Math.round(cards.reduce((a, c) => a + c.ovr, 0) / Math.max(1, cards.length));
    // the roles chosen in Ultimate Team > Rosa, by card (ai.js, ROLES); match.js checks each fits its place
    const roles = u.squad.map((k) => (u.roles || {})[k] || null);
    return { id: "mine", name: u.club, short: "SFC", city: "Ultimate Team", kit: u.kit, kit2: u.kit2, pattern: u.pattern, alt: "#f2f0e6", rating, pitch: u.pitch, formation: U().settings().formation, cards, roles };
  }
  SL.myClub = myClub;
  const CLUB_LIST = () => [myClub()].concat(SL.CLUBS);
  const clubOf = (id) => (id === "mine" ? myClub() : SL.clubById(id));
  // A side for a match; the person's own team takes the formation of the settings.
  function sideOf(club, human, kit) {
    const s = U().side(club, club.id === "mine" ? club.cards : null, kit);
    if (human) s.formation = U().settings().formation;
    return s;
  }

  // ---- Quick friendly ---------------------------------------------------------------------
  const quickSet = { who: 0, home: "mine", away: "marea", pitch: "", minutes: 4 };
  const WHO = ["Tu contro l'IA", "Due persone, una contro l'altra", "Due persone insieme contro l'IA"];
  function quick() {
    const ui = U(), s = ui.settings(), q = quickSet;
    const list = CLUB_LIST(), ids = list.map((c) => c.id);
    const home = clubOf(q.home), away = clubOf(q.away);
    const pitchName = q.pitch ? R.THEMES[q.pitch].name : "Di casa: " + R.THEMES[home.pitch || "notte"].name;
    const defs = [
      ["who", "Chi gioca", "Una persona con la tastiera o un joypad; due persone con due joypad, o joypad e tastiera", WHO[q.who], (d) => { q.who = (q.who + d + 3) % 3; }],
      ["home", "Squadra di casa", q.who === 0 || q.who === 2 ? "La squadra delle persone" : "Giocatore 1", esc(home.name), (d) => { q.home = ids[(ids.indexOf(q.home) + d + ids.length) % ids.length]; }],
      ["away", "Squadra ospite", q.who === 1 ? "Giocatore 2" : "L'IA", esc(away.name), (d) => { q.away = ids[(ids.indexOf(q.away) + d + ids.length) % ids.length]; }],
      ["pitch", "Campo", "Di casa: quello della squadra di casa", esc(pitchName), (d) => { const l = [""].concat(Object.keys(R.THEMES)); q.pitch = l[(l.indexOf(q.pitch) + d + l.length) % l.length]; }],
      ["min", "Durata", "Tempo effettivo: il cronometro si ferma sui gol", `${s.minutes} min`, (d) => { const v = [2, 3, 4, 6, 8], i = v.indexOf(s.minutes); s.minutes = v[(i + d + v.length) % v.length]; }],
    ];
    if (q.who !== 1) defs.push(["dif", "Difficoltà", "Velocità e decisioni degli avversari", ["Facile", "Normale", "Difficile"][s.difficulty], (d) => { s.difficulty = (s.difficulty + d + 3) % 3; }]);
    const lorePanel = (c) => (c.lore ? `<div class="panel"><h3>${esc(c.name)} · ${esc(c.people)}</h3>${esc(c.story)}</div>` : "");
    const m = ui.menuScreen(ui.frame("Amichevole rapida", "Prepara la partita",
      `<div class="panel vs">
        <div class="team">${ui.badge(home)}<b>${esc(home.name)}</b><span>${q.who === 1 ? "Giocatore 1" : q.who === 2 ? "Giocatori 1 e 2" : "Tu"} · ${home.rating}</span></div>
        <div class="x">VS</div>
        <div class="team">${ui.badge(away)}<b>${esc(away.name)}</b><span>${q.who === 1 ? "Giocatore 2" : "IA"} · ${away.rating}</span></div>
      </div>
      <div class="rows scroll">${ui.rowsHtml(defs)}</div>
      <button class="cta" data-nav data-go="go">Calcio d'inizio</button>`,
      `${lorePanel(away)}${lorePanel(home)}<div class="panel"><h3>Premio</h3>${q.who === 1 ? "Nessun premio: si gioca per l'onore." : `Crediti per l'Ultimate Team: vittoria ${ui.coin()} 200, pareggio 100, sconfitta 50, più 30 a gol.`}</div>`));
    ui.stepRows(m, defs, quick);
    ui.wire(m, { go: () => {
      const humans = q.who === 0 ? [{ team: 0 }] : q.who === 1 ? [{ team: 0 }, { team: 1 }] : [{ team: 0 }, { team: 0 }];
      const awayKit = SL.awayKit(home, away);
      ui.launch({ kind: "quick", title: "Amichevole rapida", home: sideOf(home, true), away: sideOf(away, q.who === 1, awayKit), humans,
        pitch: q.pitch || home.pitch || "notte", settings: q.who === 1 ? { opponentAi: 0 } : {},
        onEnd: (r) => {
          if (q.who === 1) return { next: quick, nextLabel: "Ancora" };
          const coins = r.abandoned ? 0 : { won: 200, drawn: 100, lost: 50 }[r.res] + r.g0 * 30;
          const extra = loreReward(away, r);
          return { coins, html: extra, next: quick, nextLabel: "Continua" };
        } });
    } });
    ui.setBack(ui.goMenu); ui.focusFirst();
  }
  const esc = (t) => U().esc(t);

  // The first win against a lore team brings its striker's Mito card into the collection.
  function loreReward(club, r) {
    if (!club.lore || r.res !== "won" || r.abandoned) return "";
    const g = U().game();
    g.ut.loreBeaten = g.ut.loreBeaten || {};
    if (g.ut.loreBeaten[club.id]) return "";
    g.ut.loreBeaten[club.id] = true;
    const card = SL.POOL.find((c) => c.lore === club.id && c.role === "ATT");
    if (!SL.entryOf(g, card.id)) g.ut.collection.push({ k: card.id, id: card.id, v: "base", n: 0 });
    return `Prima vittoria contro ${esc(club.name)}: <b>${esc(card.name)}</b> (Mito, ${card.ovr}) entra nella tua collezione dell'Ultimate Team.`;
  }

  // ---- The lore teams ----------------------------------------------------------------------
  let loreSel = 0;
  function lore() {
    const ui = U(), t = SL.LORE[loreSel], club = SL.clubById(t.id);
    const g = ui.game(), beaten = (g.ut.loreBeaten || {})[t.id];
    const cards = SL.POOL.filter((c) => c.lore === t.id);
    const PAT = ["tinta unita", "righe", "cerchi", "fascia", "luminosa", "a metà", "zigzag"];
    const m = ui.menuScreen(ui.frame("Squadre leggendarie", esc(t.name),
      `<div class="filters">${SL.LORE.map((x, i) => `<button class="chip ${i === loreSel ? "on" : ""}" data-nav data-lore="${i}" ${i === loreSel ? "data-first=1" : ""}>${esc(x.people)}</button>`).join("")}</div>
       <div class="panel lorebox"><div class="next">${ui.badge(club)}<div><b>${esc(t.name)}</b><br>${esc(t.city)} · ${esc(t.people)} · valutazione ${t.rating}</div></div>
         <p>${esc(t.story)}</p>
         <div class="kitrow"><span class="sw" style="background:${t.kit}"></span><span class="sw" style="background:${t.kit2}"></span><span>Maglia ${PAT[t.pattern]} · campo: ${esc(R.THEMES[t.pitch].name)}</span></div></div>
       <div class="scroll"><div class="cards">${cards.map((c) => ui.cardHtml(c, { small: true, nav: false })).join("")}</div></div>
       <div class="top"><button class="cta" data-nav data-go="vs">Sfidali sul loro campo</button><button class="item" data-nav data-go="with" style="font-size:22px">Gioca con loro<small>Contro un club a caso, sul loro campo</small></button></div>`,
      `<div class="panel"><h3>Premio</h3>${beaten ? "Già battuti: la carta Mito del loro attaccante è nella tua collezione." : "La prima vittoria contro di loro porta la carta Mito del loro attaccante nella tua collezione dell'Ultimate Team."}</div>`));
    ui.hydrateCards(m);
    m.querySelectorAll("[data-lore]").forEach((b) => b.addEventListener("click", () => { loreSel = +b.dataset.lore; SL.audio.ui(); lore(); m.querySelector(`[data-lore="${loreSel}"]`).focus(); }));
    ui.wire(m, {
      vs: () => { Object.assign(quickSet, { who: 0, home: "mine", away: t.id, pitch: t.pitch }); quick(); },
      with: () => { const others = SL.NORMAL_CLUBS(); Object.assign(quickSet, { who: 0, home: t.id, away: others[Math.floor(Math.random() * others.length)].id, pitch: t.pitch }); quick(); },
    });
    ui.setBack(ui.goMenu); ui.focusFirst();
  }

  // ---- Training ----------------------------------------------------------------------------
  let trainPitch = "notte";
  function training() {
    const ui = U(), mine = myClub();
    const defs = [["pitch", "Campo", "", esc(R.THEMES[trainPitch].name), (d) => { const l = Object.keys(R.THEMES); trainPitch = l[(l.indexOf(trainPitch) + d + l.length) % l.length]; }]];
    const m = ui.menuScreen(ui.frame("Allenamento", "Allenamento libero",
      `<div class="rows">${ui.rowsHtml(defs)}</div><button class="cta" data-nav data-go="go">Entra in campo</button>`,
      `<div class="panel"><h3>Come funziona</h3>Gli avversari restano fermi, portiere compreso. Nessun cronometro: esci dalla pausa quando hai finito. Per imparare i comandi uno alla volta ci sono le sfide di livello base.</div>`));
    ui.stepRows(m, defs, training);
    ui.wire(m, { go: () => ui.launch({ kind: "training", title: "Allenamento", free: true, back: training, home: sideOf(mine, true), away: ui.side(SL.clubById("marea"), null, SL.awayKit(mine, SL.clubById("marea"))), humans: [{ team: 0 }], pitch: trainPitch, settings: { opponentAi: 2, minutes: 999 } }) });
    ui.setBack(ui.goMenu); ui.focusFirst();
  }

  // ---- Challenges --------------------------------------------------------------------------
  // win(st, m, end): true done, false failed, null not yet. st counts from the match events
  // (match.js, events): passes, hits won, tackles, sprint seconds, chip goals, two-goal moves.
  const T = { base: "Base", medio: "Media", difficile: "Difficile" };
  SL.CHALLENGES = [
    { id: "b1", tier: "base", title: "Primi passi", desc: "Porta un giocatore dentro l'area avversaria.", tip: "Muoviti con WASD o la levetta sinistra: l'area è il rettangolo davanti alla porta di destra.", train: true, win: (st, m) => (st.inBox ? true : null) },
    { id: "b2", tier: "base", title: "Il passaggio", desc: "Fai 3 passaggi a un compagno.", tip: "Passaggio: J o A. Con la levetta scegli a chi: il pallone va al compagno più vicino a quella direzione.", train: true, win: (st) => (st.passes >= 3 ? true : null), goal: (st) => `Passaggi ${Math.min(3, st.passes)}/3` },
    { id: "b3", tier: "base", title: "Il tiro", desc: "Segna un gol. Il portiere para.", tip: "Tiro: tieni premuto K o X per caricare, lascia per tirare. Più carichi, più forte va.", train: true, keeper: true, win: (st) => (st.goals >= 1 ? true : null) },
    { id: "b4", tier: "base", title: "Lo scatto", desc: "Scatta per 3 secondi in tutto.", tip: "Scatto: Shift o RT, tenuto premuto mentre corri.", train: true, win: (st) => (st.sprint >= 3 ? true : null), goal: (st) => `Scatto ${Math.min(3, st.sprint).toFixed(1)}/3 s` },
    { id: "b5", tier: "base", title: "La spallata", desc: "Ruba il pallone con una spallata.", tip: "Senza palla, vicino a chi ce l'ha: K o X. Chi ha appena preso palla è protetto per 0,8 secondi.", opp: "aurora", difficulty: 0, minutes: 3, win: (st, m, end) => (st.hitsWon >= 1 ? true : end ? false : null) },
    { id: "b6", tier: "base", title: "La scivolata", desc: "Vinci un pallone in scivolata.", tip: "Senza palla: L o B, nella direzione della levetta. Dopo la scivolata resti a terra 0,35 secondi.", opp: "aurora", difficulty: 0, minutes: 3, win: (st, m, end) => (st.tackles >= 1 ? true : end ? false : null) },
    { id: "b7", tier: "base", title: "Il pallonetto", desc: "Segna con un pallonetto.", tip: "Tieni U (o LB) e tira: la palla scavalca il portiere.", train: true, keeper: true, win: (st) => (st.chipGoals >= 1 ? true : null) },
    { id: "b8", tier: "base", title: "Il Colpo della Cometa", desc: "Usa la mossa speciale e prendi almeno una finestra.", tip: "La barra è piena: nella metà avversaria, col pallone, premi Spazio o Y. Poi premi ancora nella finestra gialla e in quella azzurra.", train: true, keeper: true, mana: true, win: (st) => (st.specialHits >= 1 ? true : null) },
    { id: "m1", tier: "medio", title: "Vinci di due", desc: "Batti la Marea Blu con almeno 2 gol di scarto.", opp: "marea", difficulty: 1, minutes: 3, win: (st, m, end) => (end ? m.score[0] - m.score[1] >= 2 : null) },
    { id: "m2", tier: "medio", title: "Porta inviolata", desc: "Tre minuti contro il Vulcano FC senza subire gol.", opp: "vulcano", difficulty: 1, minutes: 3, win: (st, m, end) => (m.score[1] > 0 ? false : end ? true : null) },
    { id: "m3", tier: "medio", title: "Rimonta", desc: "Sotto 0-2 contro i Lupi Verdi, tre minuti: vinci.", opp: "lupi", difficulty: 1, minutes: 3, score: [0, 2], golden: false, win: (st, m, end) => (end ? m.score[0] > m.score[1] : null) },
    { id: "m4", tier: "medio", title: "Tre spallate", desc: "Ruba palla 3 volte di spallata contro i Corvi Neri, e non perdere.", opp: "corvi", difficulty: 1, minutes: 4, win: (st, m, end) => (end ? st.hitsWon >= 3 && m.score[0] >= m.score[1] : null), goal: (st) => `Spallate vinte ${Math.min(3, st.hitsWon)}/3` },
    { id: "m5", tier: "medio", title: "All'arrembaggio", desc: "Batti la Ciurma del Mare Storto sul loro galeone.", opp: "marestorto", difficulty: 1, minutes: 4, win: (st, m, end) => (end ? m.score[0] > m.score[1] : null) },
    { id: "d1", tier: "difficile", title: "Il Conte", desc: "Batti i Conti di Nottefonda, difficoltà difficile.", opp: "nottefonda", difficulty: 2, minutes: 4, win: (st, m, end) => (end ? m.score[0] > m.score[1] : null) },
    { id: "d2", tier: "difficile", title: "Gol da due", desc: "Segna un gol da due con la mossa speciale contro la Viola Tempesta, e vinci.", opp: "tempesta", difficulty: 2, minutes: 4, win: (st, m, end) => (end ? st.twoGoals >= 1 && m.score[0] > m.score[1] : null) },
    { id: "d3", tier: "difficile", title: "Sulla Luna", desc: "Batti la Cometa Verde con 3 gol di scarto.", opp: "cometa", difficulty: 2, minutes: 4, win: (st, m, end) => (end ? m.score[0] - m.score[1] >= 3 : null) },
    { id: "d4", tier: "difficile", title: "Un gol basta", desc: "Contro l'Unità V-0LT: vinci senza subire gol.", opp: "volt", difficulty: 2, minutes: 4, win: (st, m, end) => (m.score[1] > 0 ? false : end ? m.score[0] > 0 : null) },
    { id: "d5", tier: "difficile", title: "Fuoco amico", desc: "Segna almeno 4 gol ai Draghi di Brace, e vinci.", opp: "brace", difficulty: 2, minutes: 4, win: (st, m, end) => (end ? m.score[0] >= 4 && m.score[0] > m.score[1] : null), goal: (st, m) => `Gol ${Math.min(4, m.score[0])}/4` },
  ];
  const REWARD = { base: 300, medio: 800, difficile: 2000 };
  let chTier = "base";
  function challenges() {
    const ui = U(), g = ui.game();
    const list = SL.CHALLENGES.filter((c) => c.tier === chTier);
    const m = ui.menuScreen(ui.frame("Sfide", "Livello " + T[chTier].toLowerCase(),
      `<div class="tabs">${Object.entries(T).map(([k, v]) => `<button class="tab ${k === chTier ? "on" : ""}" data-nav data-tier="${k}">${v} · ${SL.CHALLENGES.filter((c) => c.tier === k && g.challenges[c.id]).length}/${SL.CHALLENGES.filter((c) => c.tier === k).length}</button>`).join("")}</div>
       <div class="rows scroll">${list.map((c, i) => `<button class="row action" data-nav data-ch="${c.id}" ${i === 0 ? "data-first=1" : ""}><span class="lbl">${esc(c.title)}<small>${esc(c.desc)}</small></span><span class="val">${g.challenges[c.id] ? "✓ fatta" : ui.coin() + " " + REWARD[c.tier]}</span></button>`).join("")}</div>`,
      `<div class="panel"><h3>Come funzionano</h3>Le sfide di livello base insegnano i comandi uno alla volta, a campo libero. Quelle medie e difficili sono partite con un obiettivo. Ogni sfida completata la prima volta porta crediti all'Ultimate Team.</div>`));
    m.querySelectorAll("[data-tier]").forEach((b) => b.addEventListener("click", () => { chTier = b.dataset.tier; challenges(); m.querySelector(`[data-tier="${chTier}"]`).focus(); }));
    m.querySelectorAll("[data-ch]").forEach((b) => b.addEventListener("click", () => playChallenge(SL.CHALLENGES.find((c) => c.id === b.dataset.ch))));
    ui.setBack(ui.goMenu); ui.focusFirst();
  }

  function playChallenge(c) {
    const ui = U(), mine = myClub();
    const opp = SL.clubById(c.opp || "marea");
    const st = { passes: 0, hitsWon: 0, tackles: 0, sprint: 0, goals: 0, chipGoals: 0, specialHits: 0, twoGoals: 0, inBox: false, clock: 0, result: null, endAt: 0 };
    const settings = c.train ? { opponentAi: c.keeper ? 1 : 2, minutes: 999, goldenGoal: false } : { opponentAi: 0, difficulty: c.difficulty, minutes: c.minutes, goldenGoal: c.golden !== false };
    ui.launch({ kind: "challenge", title: "Sfida · " + c.title, free: !!c.train, back: challenges, restartable: true, tip: c.tip || c.desc,
      home: sideOf(mine, true), away: ui.side(opp, null, SL.awayKit(mine, opp)), humans: [{ team: 0 }],
      pitch: opp.lore ? opp.pitch : "notte", settings,
      extra: { score: c.score, mana: c.mana ? [100, 0] : null },
      goalText: (m) => `<b>${esc(c.title)}</b> · ${esc(c.goal ? c.goal(st, m) : c.desc)}`,
      onFrame: (m) => {
        for (const e of m.events) {
          if (e.type === "pass" && e.team === 0) st.passes++;
          if (e.type === "hit" && e.team === 0 && e.took) st.hitsWon++;
          if (e.type === "tackle" && e.team === 0) st.tackles++;
          if (e.type === "goal" && e.team === 0) { st.goals++; if (e.chip) st.chipGoals++; if (e.worth === 2) st.twoGoals++; }
          if (e.type === "specialResult" && e.team === 0 && e.hits >= 1) st.specialHits++;
        }
        const h = m.humans[0] && m.humans[0].player;
        if (h) {
          if (h.sprinting && m.phase === "live") st.sprint += m.clock - st.clock;
          if (h.x > SL.C.length / 2 - 2.2 && Math.abs(h.z) < 4.2) st.inBox = true;
        }
        st.clock = m.clock;
        if (st.result === null) {
          const w = c.win(st, m, m.over);
          if (w === true || w === false) { st.result = w; if (!m.over) { m.say(w ? "SFIDA COMPLETATA" : "SFIDA FALLITA", 2.2); st.endAt = m.clock + 1.6; } }
        }
        if (st.result !== null && !m.over && m.clock >= st.endAt) m.endMatch();
      },
      onEnd: (r) => {
        const g = ui.game();
        if (st.result === null) st.result = r.abandoned ? false : !!c.win(st, r.match, true);
        let coins = 0, html;
        if (st.result && !g.challenges[c.id]) { g.challenges[c.id] = Date.now(); coins = REWARD[c.tier]; }
        html = st.result ? `Sfida completata: <b>${esc(c.title)}</b>.` : `Sfida non riuscita: ${esc(c.desc)}`;
        return { coins, html, next: challenges, nextLabel: st.result ? "Alle sfide" : "Riprova dalle sfide" };
      } });
  }

  SL.modes = { quick, lore, training, challenges, myClub, quickSet };
})();

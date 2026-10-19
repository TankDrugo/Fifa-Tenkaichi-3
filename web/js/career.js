// Strike Legends (browser) - the career, as a manager or as one player: an 8-club league of
// 7 rounds a season, a squad that ages and grows, wages, a budget and a transfer market.
// No packs: players come and go by transfer (docs/DETTAGLI.md, "Carriera").
"use strict";

(function () {
  const SL = window.SL;
  const U = () => SL.ui;
  const esc = (t) => U().esc(t);
  const car = () => U().game().career;
  const ROUNDS = 7, ROSTER_MAX = 10;
  const eur = (k) => (Math.abs(k) >= 1000 ? (k / 1000).toFixed(1).replace(".", ",") + " M€" : Math.round(k) + " k€");

  // ---- Players of a career: copies of pool cards that keep their own rating and age ----------
  // value in k€ grows with the square of the rating over 55 and falls after 29; the wage of a
  // round is a 40th of it.
  function value(p) { const age = p.age > 29 ? Math.max(0.35, 1 - (p.age - 29) * 0.12) : p.age < 22 ? 1.15 : 1; return Math.round(Math.max(30, (p.ovr - 55) ** 2 * 7 * age)); }
  function wage(p) { return Math.max(2, Math.round(value(p) / 40)); }
  let serial = 0;
  function copyCard(c, extra) {
    const id = "k" + Date.now().toString(36) + (serial++);
    const p = Object.assign({}, c, { id, base: c.id, age: c.age || 24, xp: 0, apps: 0, goals: 0, pot: Math.min(94, c.ovr + (c.age < 23 ? 4 + Math.floor(Math.random() * 10) : Math.floor(Math.random() * 3))) }, extra || {});
    p.value = value(p); p.wage = wage(p);
    return p;
  }
  // A rating change carries the four statistics along.
  function setOvr(p, ovr) {
    const d = ovr - p.ovr; p.ovr = ovr;
    for (const k of ["vel", "tir", "pas", "fis"]) p[k] = Math.max(40, Math.min(99, p[k] + d));
    p.value = value(p); p.wage = wage(p);
  }
  function register() { const c = car(); SL.extraCards = {}; if (c) for (const p of c.roster) SL.extraCards[p.id] = p; }

  // ---- New career ------------------------------------------------------------------------------
  function newCareer(kind, clubId, player) {
    const club = SL.clubById(clubId);
    const roster = [];
    // the club's five, three more near its rating
    for (const c of SL.clubSquad(club)) roster.push(copyCard(c));
    const others = SL.POOL.filter((c) => !c.lore && c.rarity !== "leggenda" && !roster.some((r) => r.base === c.id) && Math.abs(c.ovr - club.rating + 4) < 6);
    for (let i = 0; i < 3 && others.length; i++) roster.push(copyCard(others.splice(Math.floor(Math.random() * others.length), 1)[0]));
    const c = { kind, clubId, clubName: club.name, season: 1, round: 0, budget: 1500 + (club.rating - 68) * 120, roster, starters: roster.slice(0, 5).map((p) => p.id),
      table: {}, fixtures: [], history: [], news: [], player: null };
    if (kind === "player") {
      const me = { id: "me", name: player.name, role: player.role, rarity: "argento", ovr: 62, vel: 62, tir: 62, pas: 62, fis: 62, look: player.look, body: player.body, club: clubId, age: 18, xp: 0, apps: 0, goals: 0, pot: 92, rating: [] };
      const tilt = { DIF: [-2, -8, 0, 8], CEN: [0, -2, 8, 0], ALA: [8, 0, 2, -6], ATT: [4, 8, -4, 2] }[player.role];
      ["vel", "tir", "pas", "fis"].forEach((k, i) => { me[k] = 62 + tilt[i]; });
      me.value = value(me); me.wage = 3;
      // you take the place of the starter in your role
      const at = roster.findIndex((p) => p.role === player.role);
      roster[at] = me; c.starters = roster.slice(0, 5).map((p) => p.id);
      c.player = { name: player.name, id: "me", offers: [] };
      c.budget = 0;
    }
    newSeason(c);
    U().game().career = c; register(); U().save();
    hubScreen();
  }
  function newSeason(c) {
    const clubs = SL.NORMAL_CLUBS().map((x) => x.id);
    c.table = Object.fromEntries(clubs.map((id) => [id, { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }]));
    // round robin by the circle method: every club meets every other once
    const ids = clubs.slice(), n = ids.length, fx = [];
    for (let r = 0; r < n - 1; r++) {
      const round = [];
      for (let i = 0; i < n / 2; i++) { const a = ids[i], b = ids[n - 1 - i]; round.push(r % 2 ? [b, a] : [a, b]); }
      fx.push(round);
      ids.splice(1, 0, ids.pop());
    }
    c.fixtures = fx; c.round = 0;
  }

  function open() { if (car()) { register(); hubScreen(); } else startScreen(); }

  // ---- Start: manager or player -----------------------------------------------------------------
  const startSet = { kind: "manager", club: "fulmini", name: "Nico Strike", role: "ATT", fig: "", look: 0 };
  function startScreen() {
    const ui = U(), s = startSet;
    const clubs = SL.NORMAL_CLUBS().map((c) => c.id), figs = SL.FIGURES;
    const cyc = (list, v, d) => list[(list.indexOf(v) + d + list.length) % list.length];
    const club = SL.clubById(s.club);
    const defs = [
      ["kind", "Ruolo nella carriera", "Allenatore: rosa, mercato, stipendi. Giocatore: controlli solo te stesso", s.kind === "manager" ? "Allenatore" : "Giocatore", (d) => { s.kind = s.kind === "manager" ? "player" : "manager"; }],
      ["club", s.kind === "manager" ? "Il club da allenare" : "Il club che ti fa esordire", "", esc(club.name) + " · " + club.rating, (d) => { s.club = cyc(clubs, s.club, d); }],
    ];
    if (s.kind === "player") defs.push(
      ["name", "Nome", "", esc(s.name), Object.assign(() => { const n = window.prompt("Nome del giocatore", s.name); if (n && n.trim()) s.name = n.trim().slice(0, 22); }, { action: true })],
      ["role", "Ruolo in campo", "", SL.ROLE_NAMES[s.role], (d) => { s.role = cyc(["DIF", "CEN", "ALA", "ATT"], s.role, d); }],
      ["fig", "Fisico", "Il corpo o il personaggio con cui scendi in campo", esc((figs.find((f) => f.id === s.fig) || figs[0]).name), (d) => { s.fig = cyc(figs.map((f) => f.id), s.fig, d); }],
      ["look", "Pelle e capelli", "", "Aspetto " + (s.look + 1), (d) => { s.look = (s.look + d + 8) % 8; }]);
    const m = ui.menuScreen(ui.frame("Carriera", "Nuova carriera",
      `<div class="rows scroll">${ui.rowsHtml(defs)}</div>${s.kind === "player" ? `<div class="panel kitprev"><canvas id="mefig" width="128" height="128"></canvas></div>` : ""}
       <button class="cta" data-nav data-go="go">Comincia</button>`,
      `<div class="panel"><h3>Come funziona</h3>${s.kind === "manager"
        ? "Un campionato a 8 club, 7 giornate a stagione. Hai un budget: compri e vendi giocatori, paghi gli stipendi a ogni giornata, incassi premi e biglietti. I giovani crescono giocando, chi passa i 30 anni cala a fine stagione. Ogni partita la giochi tu, o la simuli."
        : "Esordisci a 18 anni con valutazione 62. In campo controlli solo te stesso. Ogni partita ricevi un voto: gol, passaggi, contrasti e risultato fanno crescere la tua valutazione. A fine stagione arrivano le offerte dei club."}</div>`));
    ui.stepRows(m, defs, startScreen);
    const cv = m.querySelector("#mefig");
    if (cv) SL.Render.portrait(cv, SL.Render.resolve(s.fig, "idle_stand"), 0, 3, club.kit, s.look);
    ui.wire(m, { go: () => newCareer(s.kind, s.club, { name: s.name, role: s.role, body: s.fig, look: s.look }) });
    ui.setBack(ui.goMenu); ui.focusFirst();
  }

  // ---- Hub ------------------------------------------------------------------------------------------
  function sortedTable(c) { return Object.entries(c.table).sort((a, b) => b[1].pts - a[1].pts || (b[1].gf - b[1].ga) - (a[1].gf - a[1].ga) || b[1].gf - a[1].gf); }
  function nextFixture(c) { const r = c.fixtures[c.round]; return r ? r.find((f) => f.includes(c.clubId)) : null; }
  function hubScreen() {
    const ui = U(), c = car();
    const fx = nextFixture(c);
    const me = c.kind === "player" ? c.roster.find((p) => p.id === "me") : null;
    const opp = fx ? SL.clubById(fx[0] === c.clubId ? fx[1] : fx[0]) : null;
    const table = sortedTable(c);
    const pos = table.findIndex(([id]) => id === c.clubId) + 1;
    const items = [];
    if (fx) items.push(ui.item("play", `Giornata ${c.round + 1} · ${opp.short}`, `${fx[0] === c.clubId ? "In casa" : "In trasferta"} contro ${opp.name}: ${c.kind === "player" ? "scendi in campo" : "gioca la partita"}`, true));
    else items.push(ui.item("season", "Chiudi la stagione", "Premi, età, ritiri, nuovi giovani" + (c.kind === "player" ? " e offerte" : ""), true));
    if (fx && c.kind === "manager") items.push(ui.item("sim", "Simula la giornata", "Il risultato secondo le valutazioni delle squadre"));
    if (c.kind === "manager") items.push(ui.item("squad", "Rosa e formazione", `${c.roster.length} giocatori su ${ROSTER_MAX} · stipendi ${eur(c.roster.reduce((a, p) => a + p.wage, 0))} a giornata`), ui.item("market", "Mercato", `Budget ${eur(c.budget)}`));
    else items.push(ui.item("me", "Il mio giocatore", `${me.name} · ${me.ovr} · ${me.goals} gol in ${me.apps} partite`));
    items.push(ui.item("table", "Classifica", `${pos}° posto`), ui.item("quit", "Abbandona la carriera", "Si cancella: non si torna indietro"));
    const m = ui.menuScreen(ui.frame("Carriera · stagione " + c.season, esc(c.kind === "player" ? me.name : c.clubName),
      `<div class="items">${items.join("")}</div>`,
      `<div class="panel"><h3>${esc(c.clubName)} · ${pos}° in classifica</h3>${tableHtml(c, 4)}</div>
       ${c.kind === "manager" ? `<div class="panel"><h3>Conti</h3>Budget ${eur(c.budget)} · stipendi ${eur(c.roster.reduce((a, p) => a + p.wage, 0))} a giornata · incasso in casa 60 k€</div>` : `<div class="panel"><h3>Il tuo giocatore</h3>${esc(me.name)}, ${me.age} anni, ${SL.ROLE_NAMES[me.role]} · valutazione <b>${me.ovr}</b> · potenziale ${me.pot}<br>Voto medio ${avg(me.rating)} · ${me.goals} gol</div>`}
       ${c.news.length ? `<div class="panel"><h3>Notizie</h3>${c.news.slice(-4).reverse().map((n) => `<div>${esc(n)}</div>`).join("")}</div>` : ""}`));
    ui.wire(m, { play: () => playRound(false), sim: () => playRound(true), season: endSeason, squad: squadScreen, market: marketScreen, me: meScreen, table: tableScreen,
      quit: (b) => { if (b.dataset.armed) { U().game().career = null; SL.extraCards = {}; ui.save(); ui.goMenu(); } else { b.dataset.armed = 1; ui.toast("Premi di nuovo per cancellare la carriera"); } } });
    ui.setBack(ui.goMenu); ui.focusFirst();
  }
  const avg = (a) => (a && a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1).replace(".", ",") : "–");
  function tableHtml(c, rows) {
    const t = sortedTable(c).slice(0, rows || 8);
    return `<table class="ctrl tbl"><tr><td></td><td>G</td><td>V</td><td>N</td><td>P</td><td>DR</td><td>Pt</td></tr>${t.map(([id, r], i) => `<tr class="${id === c.clubId ? "me" : ""}"><td>${i + 1}. ${esc(SL.clubById(id).name)}</td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf - r.ga}</td><td><b>${r.pts}</b></td></tr>`).join("")}</table>`;
  }
  function tableScreen() {
    const ui = U(), c = car();
    const m = ui.menuScreen(ui.frame("Carriera", "Classifica · stagione " + c.season, `<div class="panel scroll">${tableHtml(c)}</div><button class="cta" data-nav data-go="back" data-first=1>Indietro</button>`,
      `<div class="panel"><h3>Albo</h3>${c.history.length ? c.history.map((h) => `<div>Stagione ${h.season}: ${h.pos}° · campione ${esc(h.champion)}</div>`).join("") : "Nessuna stagione conclusa."}</div>`));
    ui.wire(m, { back: hubScreen }); ui.setBack(hubScreen); ui.focusFirst();
  }

  // ---- A round: your match (played or simulated) and the others -------------------------------------
  function strength(id) {
    const c = car();
    if (id !== c.clubId) return SL.clubById(id).rating;
    const st = c.starters.map((k) => c.roster.find((p) => p.id === k)).filter(Boolean);
    return st.reduce((a, p) => a + p.ovr, 0) / Math.max(1, st.length);
  }
  function simGoals(ra, rb) { const lam = Math.max(0.3, 1.9 + (ra - rb) / 9); let k = 0, p = Math.exp(-lam), s = p, u = Math.random(); while (u > s && k < 9) { k++; p *= lam / k; s += p; } return k; }
  function addResult(c, a, b, ga, gb) {
    const A = c.table[a], B = c.table[b];
    A.p++; B.p++; A.gf += ga; A.ga += gb; B.gf += gb; B.ga += ga;
    if (ga > gb) { A.w++; B.l++; A.pts += 3; } else if (ga < gb) { B.w++; A.l++; B.pts += 3; } else { A.d++; B.d++; A.pts++; B.pts++; }
  }
  function playRound(simulate) {
    const ui = U(), c = car(), fx = nextFixture(c); if (!fx) return;
    const home = fx[0] === c.clubId, oppId = home ? fx[1] : fx[0], opp = SL.clubById(oppId), club = SL.clubById(c.clubId);
    const after = (gMine, gOpp, perf) => {
      const [ga, gb] = home ? [gMine, gOpp] : [gOpp, gMine];
      addResult(c, fx[0], fx[1], ga, gb);
      for (const f of c.fixtures[c.round]) if (f !== fx) addResult(c, f[0], f[1], simGoals(strength(f[0]), strength(f[1])), simGoals(strength(f[1]), strength(f[0])));
      const lines = [roundMoney(c, home, gMine, gOpp), growth(c, gMine, gOpp, perf)].filter(Boolean);
      c.round++;
      c.news.push(`G${c.round}: ${club.short} ${gMine}-${gOpp} ${opp.short}`);
      ui.save();
      return lines.join("<br>");
    };
    if (simulate) {
      const gm = simGoals(strength(c.clubId) + (home ? 2 : 0), strength(oppId)), go = simGoals(strength(oppId), strength(c.clubId) + (home ? 2 : 0));
      const html = after(gm, go, null);
      ui.toast(`Simulata: ${club.short} ${gm}-${go} ${opp.short}`);
      hubScreen();
      if (html) setTimeout(() => ui.toast(html.replace(/<[^>]+>/g, " ")), 1900);
      return;
    }
    const squad = c.starters.map((k) => c.roster.find((p) => p.id === k));
    const meSlot = c.kind === "player" ? squad.findIndex((p) => p.id === "me") : -1;
    const mineClub = Object.assign({}, club, { formation: U().settings().formation });
    const mineSide = ui.side(mineClub, squad); mineSide.formation = U().settings().formation;
    const oppSide = ui.side(opp, null, SL.awayKit(club, opp));
    const perf = { goals: 0, passes: 0, tackles: 0, hits: 0, shots: 0 };
    ui.launch({ kind: "career", title: `Carriera · giornata ${c.round + 1}`, home: mineSide, away: oppSide, humans: [meSlot >= 0 ? { team: 0, lock: meSlot } : { team: 0 }],
      pitch: home ? club.pitch : opp.pitch, settings: { opponentAi: 0 },
      onFrame: (m) => {
        if (meSlot < 0) return;
        const me = m.players[meSlot];
        for (const e of m.events) {
          if (e.type === "goal" && e.team === 0 && e.scorer === me) perf.goals++;
          if (e.type === "pass" && e.from === me) perf.passes++;
          if (e.type === "tackle" && e.by === me) perf.tackles++;
          if (e.type === "hit" && e.by === me && e.took) perf.hits++;
          if (e.type === "shot" && e.by === me) perf.shots++;
        }
      },
      onEnd: (r) => {
        const gm = r.abandoned ? 0 : r.g0, go = r.abandoned ? 3 : r.g1;
        const html = after(gm, go, meSlot >= 0 ? perf : null);
        return { html, next: hubScreen, nextLabel: "Alla carriera" };
      } });
  }
  // Money of a round: wages out, the gate in at home, a prize for a win.
  function roundMoney(c, home, gm, go) {
    if (c.kind !== "manager") return "";
    const wages = c.roster.reduce((a, p) => a + p.wage, 0), gate = home ? 60 : 0, prize = gm > go ? 80 : gm === go ? 30 : 0;
    c.budget += gate + prize - wages;
    return `Stipendi −${eur(wages)}${gate ? ` · incasso +${eur(gate)}` : ""}${prize ? ` · premio +${eur(prize)}` : ""} · budget ${eur(c.budget)}`;
  }
  // Growth: the starters gain experience; a young one under his potential gains a point every
  // 3 to 5 matches, faster with wins. The player of a player career is marked 4 to 10.
  function growth(c, gm, go, perf) {
    const out = [];
    const res = gm > go ? 1.4 : gm === go ? 1 : 0.7;
    for (const k of c.starters) {
      const p = c.roster.find((x) => x.id === k); if (!p) continue;
      p.apps++;
      let xp = res * (p.age < 23 ? 1.4 : p.age < 28 ? 1 : 0.5);
      if (p.id === "me" && perf) {
        const vote = Math.max(4, Math.min(10, 6 + perf.goals * 1.1 + perf.passes * 0.12 + perf.tackles * 0.35 + perf.hits * 0.3 + (gm > go ? 0.5 : gm < go ? -0.5 : 0) - Math.max(0, 2 - perf.passes - perf.shots) * 0.3));
        p.rating.push(Math.round(vote * 2) / 2);
        p.goals += perf.goals;
        xp *= vote / 6;
        out.push(`Il tuo voto: <b>${(Math.round(vote * 2) / 2).toString().replace(".", ",")}</b> · gol ${perf.goals}, passaggi ${perf.passes}, contrasti ${perf.tackles + perf.hits}`);
      }
      p.xp += xp;
      if (p.xp >= 4 && p.ovr < p.pot) { p.xp -= 4; setOvr(p, p.ovr + 1); out.push(`${esc(p.name)} cresce: ${p.ovr}`); }
    }
    return out.join("<br>");
  }

  // ---- End of season ------------------------------------------------------------------------------
  function endSeason() {
    const ui = U(), c = car();
    const table = sortedTable(c), pos = table.findIndex(([id]) => id === c.clubId) + 1;
    const champion = SL.clubById(table[0][0]).name;
    const lines = [`Stagione ${c.season} chiusa: ${pos}° posto. Campione: ${esc(champion)}.`];
    if (c.kind === "manager") { const prize = [900, 600, 450, 300, 200, 150, 100, 80][pos - 1]; c.budget += prize; lines.push(`Premio per il piazzamento: ${eur(prize)}.`); }
    c.history.push({ season: c.season, pos, champion });
    // age, decline, retirement
    for (const p of c.roster.slice()) {
      p.age++;
      if (p.age > 30 && p.id !== "me") { const d = p.age > 33 ? 3 : 1 + Math.floor(Math.random() * 2); setOvr(p, Math.max(50, p.ovr - d)); }
      if (p.age >= 35 && p.id !== "me" && Math.random() < 0.6) { c.roster = c.roster.filter((x) => x !== p); c.starters = c.starters.filter((k) => k !== p.id); lines.push(`${esc(p.name)} si ritira a ${p.age} anni.`); }
    }
    // two youngsters from the academy
    if (c.kind === "manager") for (let i = 0; i < 2 && c.roster.length < ROSTER_MAX; i++) {
      const role = SL.ROLES[1 + Math.floor(Math.random() * 4)], base = SL.POOL.filter((x) => x.rarity === "bronzo" && x.role === role)[0];
      const y = copyCard(base, { age: 17, name: base.name.split(" ")[0] + " " + ["Junior", "Nuovo", "Piccolo", "Vivaio"][i % 4] });
      setOvr(y, 58 + Math.floor(Math.random() * 5)); y.pot = 72 + Math.floor(Math.random() * 18);
      c.roster.push(y); lines.push(`Dal vivaio: ${esc(y.name)}, 17 anni, ${y.ovr} (potenziale ${y.pot}).`);
    }
    fillStarters(c);
    // offers for the player of a player career
    if (c.kind === "player") {
      const me = c.roster.find((p) => p.id === "me");
      c.player.offers = SL.NORMAL_CLUBS().filter((x) => x.id !== c.clubId && x.rating >= me.ovr - 6 && x.rating <= me.ovr + 10).sort(() => Math.random() - 0.5).slice(0, 3).map((x) => x.id);
      if (c.player.offers.length) lines.push(`Offerte per ${esc(me.name)}: ${c.player.offers.map((id) => esc(SL.clubById(id).name)).join(", ")}.`);
    }
    c.season++; newSeason(c); register(); ui.save();
    const m = ui.menuScreen(ui.frame("Carriera", "Fine della stagione " + (c.season - 1), `<div class="panel">${lines.map((l) => `<div>${l}</div>`).join("")}</div>
      ${c.kind === "player" && c.player.offers.length ? `<div class="items">${c.player.offers.map((id, i) => ui.item("o" + i, "Vai a " + SL.clubById(id).name, "Valutazione del club " + SL.clubById(id).rating, i === 0)).join("")}${ui.item("stay", "Resta al " + c.clubName, "")}</div>` : `<button class="cta" data-nav data-go="stay" data-first=1>Nuova stagione</button>`}`, ""));
    const h = { stay: hubScreen };
    (c.player ? c.player.offers : []).forEach((id, i) => { h["o" + i] = () => transferMe(id); });
    ui.wire(m, h); ui.setBack(hubScreen); ui.focusFirst();
  }
  function fillStarters(c) {
    c.starters = c.starters.filter((k) => c.roster.some((p) => p.id === k));
    for (const role of SL.ROLES) if (!c.starters.some((k) => c.roster.find((p) => p.id === k).role === role)) { const p = c.roster.filter((x) => x.role === role && !c.starters.includes(x.id)).sort((a, b) => b.ovr - a.ovr)[0]; if (p) c.starters.push(p.id); }
    for (const p of c.roster.slice().sort((a, b) => b.ovr - a.ovr)) if (c.starters.length < 5 && !c.starters.includes(p.id)) c.starters.push(p.id);
    c.starters = c.starters.slice(0, 5);
  }
  // The player of a player career moves: the new club's five, with him in his role.
  function transferMe(id) {
    const c = car(), me = c.roster.find((p) => p.id === "me"), club = SL.clubById(id);
    const roster = SL.clubSquad(club).map((x) => copyCard(x));
    const at = roster.findIndex((p) => p.role === me.role); roster[at] = me;
    me.club = id; c.clubId = id; c.clubName = club.name; c.roster = roster; c.starters = roster.map((p) => p.id);
    c.news.push(`${me.name} firma per ${club.name}.`); newSeason(c); register(); U().save(); hubScreen();
  }

  // ---- Squad (manager) -------------------------------------------------------------------------------
  let rosterSel = 0;
  function squadScreen() {
    const ui = U(), c = car();
    const sorted = c.roster.slice().sort((a, b) => SL.ROLES.indexOf(a.role) - SL.ROLES.indexOf(b.role) || b.ovr - a.ovr);
    const m = ui.menuScreen(ui.frame("Carriera · Rosa", esc(c.clubName),
      `<div class="rows scroll">${sorted.map((p, i) => `<button class="row action ${c.starters.includes(p.id) ? "on" : ""}" data-nav data-pl="${p.id}" ${i === rosterSel ? "data-first=1" : ""}><span class="lbl">${c.starters.includes(p.id) ? "● " : ""}${esc(p.name)} · ${p.role}<small>${p.age} anni · potenziale ${p.pot} · stipendio ${eur(p.wage)} · valore ${eur(p.value)} · ${p.apps} presenze</small></span><span class="val">${p.ovr}</span></button>`).join("")}</div>
       <div class="crumb" style="letter-spacing:0;text-transform:none;font-family:var(--body)">Seleziona per mettere in campo o in panchina (cinque in campo, un portiere). Due volte di seguito su un giocatore in panchina: lo vendi al ${Math.round(90)}% del valore.</div>`,
      `<div class="panel"><h3>In campo</h3>${c.starters.map((k) => { const p = c.roster.find((x) => x.id === k); return `<div>${p.role} · ${esc(p.name)} · ${p.ovr}</div>`; }).join("")}</div>`));
    m.querySelectorAll("[data-pl]").forEach((b, i) => b.addEventListener("click", () => {
      rosterSel = i;
      const id = b.dataset.pl, p = c.roster.find((x) => x.id === id);
      if (c.starters.includes(id)) {
        const sub = c.roster.filter((x) => !c.starters.includes(x.id) && (x.role === p.role || p.role !== "POR")).sort((a, b2) => b2.ovr - a.ovr)[0];
        if (!sub || (p.role === "POR" && sub.role !== "POR")) { ui.toast("Nessun sostituto adatto in panchina"); return; }
        c.starters[c.starters.indexOf(id)] = sub.id; ui.toast(`${sub.name} entra al posto di ${p.name}`);
      } else if (b.dataset.armed) {
        if (c.roster.length <= 6) { ui.toast("Servono almeno 6 giocatori"); return; }
        c.roster = c.roster.filter((x) => x !== p); c.budget += Math.round(p.value * 0.9); c.news.push(`Ceduto ${p.name} per ${eur(p.value * 0.9)}.`); ui.toast(`${p.name} venduto: +${eur(p.value * 0.9)}`);
      } else {
        const out = c.roster.filter((x) => c.starters.includes(x.id) && (p.role === "POR" ? x.role === "POR" : x.role !== "POR")).sort((a, b2) => a.ovr - b2.ovr)[0];
        if (out) { c.starters[c.starters.indexOf(out.id)] = p.id; ui.toast(`${p.name} in campo al posto di ${out.name}`); }
        b.dataset.armed = 1;
      }
      register(); ui.save(); squadScreen();
    }));
    ui.setBack(hubScreen); ui.focusFirst();
  }

  // ---- Market (manager) ------------------------------------------------------------------------------
  function marketList(c) {
    // the same list for a whole round: players of the other clubs and free agents near the squad's level
    if (c.market && c.market.round === c.round && c.market.season === c.season) return c.market.list;
    const level = strength(c.clubId);
    const cands = SL.POOL.filter((x) => !x.lore && x.rarity !== "leggenda" && x.club !== c.clubId && !c.roster.some((p) => p.base === x.id) && Math.abs(x.ovr - level) < 12);
    const list = cands.sort(() => Math.random() - 0.5).slice(0, 14).map((x) => { const p = copyCard(x); return { id: p.id, card: p }; });
    c.market = { round: c.round, season: c.season, list };
    return list;
  }
  function marketScreen() {
    const ui = U(), c = car(), list = marketList(c);
    const m = ui.menuScreen(ui.frame("Carriera · Mercato", "Budget " + eur(c.budget),
      `<div class="rows scroll">${list.map((x, i) => { const p = x.card; return `<button class="row action" data-nav data-buy="${x.id}" ${i === 0 ? "data-first=1" : ""}><span class="lbl">${esc(p.name)} · ${p.role}<small>${p.age} anni · ${p.club ? esc(SL.clubById(p.club).name) : "svincolato"} · stipendio ${eur(p.wage)} · potenziale ${p.pot}</small></span><span class="val">${p.ovr} · ${eur(p.value)}</span></button>`; }).join("")}</div>`,
      `<div class="panel"><h3>Regole</h3>Al massimo ${ROSTER_MAX} giocatori in rosa. Il prezzo è il valore del giocatore; lo stipendio si paga a ogni giornata. Il mercato cambia a ogni giornata. Per vendere: Rosa e formazione.</div>`));
    m.querySelectorAll("[data-buy]").forEach((b) => b.addEventListener("click", () => {
      const x = list.find((y) => y.id === b.dataset.buy); if (!x) return;
      const p = x.card;
      if (c.roster.length >= ROSTER_MAX) { ui.toast(`Rosa piena: ${ROSTER_MAX} giocatori`); return; }
      if (c.budget < p.value) { ui.toast(`Budget insufficiente: servono ${eur(p.value)}`); return; }
      if (!b.dataset.armed) { b.dataset.armed = 1; ui.toast(`Premi di nuovo per comprare ${p.name} a ${eur(p.value)}`); return; }
      c.budget -= p.value; c.roster.push(p); c.market.list = list.filter((y) => y !== x); c.news.push(`Acquistato ${p.name} per ${eur(p.value)}.`);
      register(); ui.save(); ui.toast(`${p.name} è tuo`); marketScreen();
    }));
    ui.setBack(hubScreen); ui.focusFirst();
  }

  // ---- Me (player) -----------------------------------------------------------------------------------
  function meScreen() {
    const ui = U(), c = car(), me = c.roster.find((p) => p.id === "me");
    const m = ui.menuScreen(ui.frame("Carriera · Il mio giocatore", esc(me.name),
      `<div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(160px,200px))">${ui.cardHtml(me, { nav: false })}</div>
       <div class="panel">${me.age} anni · ${SL.ROLE_NAMES[me.role]} · ${esc(c.clubName)}<br>Valutazione ${me.ovr} (potenziale ${me.pot}) · ${me.apps} presenze · ${me.goals} gol · voto medio ${avg(me.rating)}<br>Ultimi voti: ${me.rating.slice(-8).map((v) => String(v).replace(".", ",")).join(" · ") || "–"}</div>
       <button class="cta" data-nav data-go="back" data-first=1>Indietro</button>`, ""));
    ui.hydrateCards(m, SL.clubById(c.clubId).kit);
    ui.wire(m, { back: hubScreen }); ui.setBack(hubScreen); ui.focusFirst();
  }

  SL.career = { open, register };
  // the saved career's cards are known from the start
  window.addEventListener("load", () => register());
})();

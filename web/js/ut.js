// Strike Legends (browser) - Ultimate Team: divisions, cup, squad, collection, kits, packs
// and the walkout of a player of 85 or more. All of it is kept in this browser (data.js, save).
"use strict";

(function () {
  const SL = window.SL, R = SL.Render;
  const U = () => SL.ui;
  const esc = (t) => U().esc(t);
  const ut = () => U().game().ut;
  const cardOf = (k) => { const e = SL.entryOf(U().game(), k); return e ? SL.cardById(e.id) : null; };
  const rating = () => SL.myClub().rating;

  // ---- The club: one screen with tabs, LB and RB (or Q and E) to move between them ------------
  const TABS = { gioca: "Gioca", rosa: "Rosa", mercato: "Mercato", pacchetti: "Pacchetti", obiettivi: "Obiettivi", collezione: "Collezione", stadio: "Stadio" };
  let tab = "gioca";
  function frameUT(title, body, side, wide) {
    const ui = U(), u = ut();
    const tabs = `<div class="tabs tight">${Object.entries(TABS).map(([k, v]) => `<button class="tab ${k === tab ? "on" : ""}" data-nav data-tab="${k}">${v}${k === "obiettivi" && objectivesReady() ? " ●" : ""}</button>`).join("")}</div>`;
    return ui.frame("Ultimate Team · " + esc(u.club), title, tabs + body, side, wide);
  }
  function wireTabs(m) {
    m.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { tab = b.dataset.tab; SL.audio.ui(); hub(); U().$(`[data-tab="${tab}"]`).focus(); }));
    U().setBack(U().goMenu);
  }
  function hub(t) {
    if (typeof t === "string" && TABS[t]) tab = t;
    ({ gioca: playTab, rosa: squadScreen, mercato: marketScreen, pacchetti: packsScreen, obiettivi: objectivesScreen, collezione: collectionScreen, stadio: kitScreen })[tab]();
  }
  const toHub = () => hub();

  function playTab() {
    const ui = U(), u = ut();
    u.division = u.division || 5; u.season = u.season || { played: 0, pts: 0, n: 0 };
    const m = ui.menuScreen(frameUT("Gioca",
      `<div class="items">
        ${ui.item("div", "Divisione " + u.division, `Stagione di 5 partite: ${u.season.played}/5 giocate, ${u.season.pts} punti. 10 punti per salire, 3 o meno si scende`, true)}
        ${ui.item("cup", "Coppa Strike", u.cup ? "Riprendi la coppa in corso" : "Semifinale e finale, 2.500 crediti alla vincitrice")}
      </div>`,
      `<div class="panel"><h3>${esc(u.club)} · valutazione ${rating()}</h3><div class="cards" style="grid-template-columns:repeat(5,minmax(0,1fr))">${u.squad.map((k) => ui.cardHtml(cardOf(k), { small: true, entry: SL.entryOf(ui.game(), k), nav: false })).join("")}</div></div>
       <div class="panel"><h3>Record</h3><div class="record"><div><b>${u.stats.played}</b><span>Partite</span></div><div><b>${u.stats.won}</b><span>Vinte</span></div><div><b>${u.stats.goals}</b><span>Gol</span></div><div><b>${u.stats.cups}</b><span>Coppe</span></div></div></div>
       ${(u.selling || []).length ? `<div class="panel"><h3>Mercato</h3>${u.selling.length} carte in vendita: l'incasso arriva alla fine della prossima partita.</div>` : ""}`));
    ui.hydrateCards(m);
    ui.wire(m, { div: divisionMatch, cup: cupScreen });
    wireTabs(m); ui.focusFirst();
  }

  function mySide() { const c = SL.myClub(); const s = U().side(c, c.cards); s.formation = U().settings().formation; return s; }
  // After every Ultimate Team match: the record, the objectives' counters, the cards sold on the
  // market and a new list of offers.
  function record(r, kind) {
    const u = ut(), st = u.stats;
    st.played++; st[r.res]++; st.goals += r.abandoned ? 0 : r.g0;
    if (!r.abandoned) {
      const ms = r.match && r.match.stats;
      count("won", r.res === "won" ? 1 : 0); count("divWon", r.res === "won" && kind === "division" ? 1 : 0);
      count("goals", r.g0); count("clean", r.res === "won" && r.g1 === 0 ? 1 : 0);
      if (ms) { count("passes", ms.passes[0]); count("hits", ms.hits[0]); count("skills", (ms.skills || [0, 0])[0]); }
    }
    sellListed(); u.market = null;
  }



  // ---- Divisions -------------------------------------------------------------------------------
  // Division 5 is the lowest. The rival is the club closest to the division's rating; the AI's
  // difficulty climbs with it.
  const DIV_RATING = { 5: 68, 4: 72, 3: 76, 2: 80, 1: 85 };
  function divisionMatch() {
    const ui = U(), u = ut();
    const target = DIV_RATING[u.division];
    const pool = SL.CLUBS.filter((c) => Math.abs(c.rating - target) <= 5);
    const opp = pool[Math.floor(Math.random() * pool.length)] || SL.CLUBS[0];
    const mine = SL.myClub();
    const diff = u.division >= 4 ? 0 : u.division >= 2 ? 1 : 2;
    ui.launch({ kind: "division", title: "Divisione " + u.division, home: mySide(), away: ui.side(opp, null, SL.awayKit(mine, opp)), humans: [{ team: 0 }], pitch: u.pitch, settings: { difficulty: diff, opponentAi: 0 },
      onEnd: (r) => {
        record(r, "division");
        const s = u.season;
        s.played++; s.pts += r.abandoned ? 0 : { won: 3, drawn: 1, lost: 0 }[r.res];
        let coins = r.abandoned ? 0 : ({ won: 400, drawn: 200, lost: 100 }[r.res] + r.g0 * 60) * (1 + (5 - u.division) * 0.25);
        let html = `${s.pts} punti dopo ${s.played} partite su 5.`;
        if (s.played >= 5) {
          if (s.pts >= 10 && u.division > 1) { u.division--; coins += 1500; count("promoted", 1); html += ` <b>Promossi in divisione ${u.division}!</b> ${U().coin()} +1.500`; }
          else if (s.pts <= 3 && u.division < 5) { u.division++; html += ` Retrocessi in divisione ${u.division}.`; }
          else html += ` Si resta in divisione ${u.division}.`;
          u.season = { played: 0, pts: 0 };
        }
        return { coins: Math.round(coins), html, next: toHub, nextLabel: "All'Ultimate Team" };
      } });
  }

  // ---- Cup: four clubs, semi-final and final ---------------------------------------------------
  function cupScreen() {
    const ui = U(), u = ut();
    if (!u.cup) {
      const pool = [...SL.CLUBS].sort(() => Math.random() - 0.5).slice(0, 3).map((c) => c.id);
      u.cup = { semi: [["mine", pool[0]], [pool[1], pool[2]]], results: [null, null], round: 0, finalOpp: null, final: null };
      ui.save();
    }
    const c = u.cup;
    const name = (id) => (id === "mine" ? u.club : SL.clubById(id).name);
    const tie = (pair, res) => `<div class="tie"><div class="${res && res[0] > res[1] ? "win" : ""}"><span>${esc(name(pair[0]))}</span><b>${res ? res[0] : "–"}</b></div><div class="${res && res[1] > res[0] ? "win" : ""}"><span>${esc(name(pair[1]))}</span><b>${res ? res[1] : "–"}</b></div></div>`;
    const opp = SL.clubById(c.round === 0 ? c.semi[0][1] : c.finalOpp);
    const m = ui.menuScreen(ui.frame("Ultimate Team · Coppa Strike", c.round === 0 ? "Semifinale" : "Finale",
      `<div class="bracket"><div class="rows">${tie(c.semi[0], c.results[0])}${tie(c.semi[1], c.results[1])}</div>
        <div class="tie" style="text-align:center"><div style="justify-content:center"><b>FINALE</b></div>${c.round >= 1 ? tie(["mine", c.finalOpp], c.final) : "<div>In attesa delle semifinali</div>"}</div>
        <div class="panel"><h3>Premio</h3>${ui.coin()} 2.500 alla vincitrice<br>${ui.coin()} 800 alla finalista</div></div>
       <div class="vs panel"><div class="team">${ui.badge(SL.myClub())}<b>${esc(u.club)}</b></div><div class="x">VS</div><div class="team">${ui.badge(opp)}<b>${esc(opp.name)}</b></div></div>
       <div class="top"><button class="cta" data-nav data-go="play" data-first=1>Gioca la ${c.round === 0 ? "semifinale" : "finale"}</button><button class="item" data-nav data-go="drop" style="font-size:22px">Ritirati<small>La coppa ricomincia da capo</small></button></div>`));
    ui.wire(m, {
      play: () => ui.launch({ kind: "cup", title: "Coppa Strike", home: mySide(), away: ui.side(opp, null, SL.awayKit(SL.myClub(), opp)), humans: [{ team: 0 }], pitch: c.round === 1 ? "notte" : u.pitch,
        onEnd: (r) => { record(r, "cup"); const html = cupAfter(c.round, r.abandoned ? 0 : r.g0, r.abandoned ? 9 : r.g1); const coins = r.abandoned ? 0 : { won: 400, drawn: 200, lost: 100 }[r.res] + r.g0 * 60 + (ut().cupPrize || 0); ut().cupPrize = 0; return { coins, html, next: ut().cup ? cupScreen : toHub, nextLabel: ut().cup ? "Avanti nella coppa" : "All'Ultimate Team" }; } }),
      drop: () => { u.cup = null; ui.save(); hub(); },
    });
    ui.setBack(toHub); ui.focusFirst();
  }
  function cupAfter(round, g0, g1) {
    const u = ut(), c = u.cup; if (!c) return "";
    const tied = g0 === g1, won = g0 > g1 || (tied && Math.random() < 0.5), pens = tied ? " (vinta ai rigori)" : "";
    if (round === 0) {
      c.results[0] = [g0, g1];
      const other = c.semi[1], a = SL.clubById(other[0]), b = SL.clubById(other[1]);
      const ga = Math.max(0, Math.round(1 + Math.random() * 3 + (a.rating - b.rating) / 8)), gb = Math.max(0, Math.round(1 + Math.random() * 3 + (b.rating - a.rating) / 8));
      c.results[1] = [ga, gb === ga ? gb + 1 : gb];
      if (!won) { u.cup = null; return `Eliminati in semifinale${tied ? " ai rigori" : ""}.`; }
      c.round = 1; c.finalOpp = c.results[1][0] > c.results[1][1] ? other[0] : other[1];
      return `In finale${pens}! Avversario: ${esc(SL.clubById(c.finalOpp).name)}.`;
    }
    c.final = [g0, g1]; u.cup = null;
    if (won) { u.cupPrize = 2500; u.stats.cups++; count("cups", 1); return `Coppa Strike vinta${pens}! ${U().coin()} +2.500`; }
    u.cupPrize = 800; return `Finalisti${tied ? ", battuti ai rigori" : ""}. ${U().coin()} +800`;
  }

  // ---- Squad -----------------------------------------------------------------------------------
  let squadSel = 0, squadFilter = "TUTTI";
  function squadScreen() {
    const ui = U(), g = ui.game(), u = ut();
    const roles = ["POR", "DIF", "CEN", "ALA", "ATT"];
    const f = SL.FORMATIONS[ui.settings().formation] || SL.FORMATIONS.rombo;
    const slotNames = ["POR"].concat(formationRoles(ui.settings().formation));
    // the role of the selected place: the card's choice or its most familiar (ai.js, ROLES)
    u.roles = u.roles || {};
    const roleOfSlot = (i) => { const c = cardOf(u.squad[i]), pos = slotNames[i], chosen = u.roles[u.squad[i]]; return chosen && SL.AI.ROLES[chosen] && SL.AI.ROLES[chosen].pos === pos ? chosen : SL.AI.defaultRole(c, pos); };
    function roleLabel(i, short) { const id = roleOfSlot(i), R = SL.AI.ROLES[id], fam = SL.AI.cardRoles(cardOf(u.squad[i]))[id] || 0; return R.name + (fam ? " " + SL.AI.FAM_MARK[fam] : "") + (short ? "" : ` (${R.fc})`); }
    const selRole = SL.AI.ROLES[roleOfSlot(squadSel)], selFam = SL.AI.cardRoles(cardOf(u.squad[squadSel]));
    const roleDefs = [["role", `Ruolo · ${slotNames[squadSel]}`, `${selRole.desc}. Familiari: ${Object.entries(selFam).map(([k, v]) => SL.AI.ROLES[k].name + " " + SL.AI.FAM_MARK[v]).join(", ") || "nessuno"}; il ruolo conta per intero con +, al 125% con ++, al 60% senza familiarità.`, esc(roleLabel(squadSel)), (d) => {
      const list = SL.AI.rolesFor(slotNames[squadSel]), at = list.indexOf(roleOfSlot(squadSel));
      u.roles[u.squad[squadSel]] = list[(at + d + list.length) % list.length];
    }]];
    const coll = u.collection.filter((e) => !isSelling(e.k)).map((e) => ({ e, c: SL.cardById(e.id) })).filter((x) => x.c && (squadFilter === "TUTTI" || x.c.role === squadFilter)).sort((a, b) => b.c.ovr - a.c.ovr);
    const m = ui.menuScreen(frameUT("Rosa · " + esc(f.name),
      `<div class="slots">${slotNames.map((r, i) => `<div class="slot"><span>${r} · ${esc(roleLabel(i, true))}</span>${ui.cardHtml(cardOf(u.squad[i]), { sel: i === squadSel, small: true, entry: SL.entryOf(g, u.squad[i]) }).replace("data-card", `data-slot="${i}" data-c`)}</div>`).join("")}</div>
       <div class="rows">${ui.rowsHtml(roleDefs)}</div>
       <div class="filters">${["TUTTI", ...roles].map((r) => `<button class="chip ${r === squadFilter ? "on" : ""}" data-nav data-filter="${r}">${r}</button>`).join("")}</div>
       <div class="scroll"><div class="cards">${coll.map((x) => ui.cardHtml(x.c, { mark: true, entry: x.e })).join("")}</div></div>
       <div class="crumb" style="letter-spacing:0;text-transform:none;font-family:var(--body)">Scegli un posto in alto, poi una carta della collezione: entra in quel posto. VEL, TIR, PAS e FIS cambiano velocità, tiro, passaggio e quanto ti sposta una spallata; un portiere con valutazione alta ha più riserva di parata. La formazione si cambia in Impostazioni.</div>`,
      "", true));
    ui.hydrateCards(m, u.kit);
    ui.stepRows(m, roleDefs, squadScreen);
    m.querySelectorAll("[data-slot]").forEach((b) => b.addEventListener("click", () => { squadSel = +b.dataset.slot; SL.audio.ui(); squadScreen(); m.querySelector(`[data-slot="${squadSel}"]`).focus(); }));
    m.querySelectorAll(".cards [data-card]").forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.card, at = u.squad.indexOf(k);
      if (at >= 0) u.squad[at] = u.squad[squadSel];
      u.squad[squadSel] = k; ui.save(); SL.audio.ui();
      ui.toast(`${cardOf(k).name} in campo come ${slotNames[squadSel]}`);
      if (u.squad.every((x) => { const c = cardOf(x); return c && c.ovr >= 75; })) count("goldFive", 1, true);
      squadSel = (squadSel + 1) % 5; squadScreen();
    }));
    m.querySelectorAll("[data-filter]").forEach((b) => b.addEventListener("click", () => { squadFilter = b.dataset.filter; squadScreen(); m.querySelector(`[data-filter="${squadFilter}"]`).focus(); }));
    wireTabs(m); ui.focusFirst();
  }
  // The four outfield places a formation names, back to front (match.js, FORMATIONS).
  function formationRoles(id) { return (SL.FORMATIONS[id] || SL.FORMATIONS.rombo).places.slice(1); }

  // ---- Collection --------------------------------------------------------------------------------
  let collFilter = "tutte";
  function sellValue(e) { const c = SL.cardById(e.id); return SL.QUICKSELL[c.rarity] * SL.VERSION_SELL[e.v]; }
  function collectionScreen() {
    const ui = U(), u = ut();
    const filters = { tutte: "Tutte", speciali: "Versioni speciali", leggenda: "Leggende", mito: "Mito", campione: "Campioni", oro: "Oro", argento: "Argento", bronzo: "Bronzo" };
    const list = u.collection.map((e) => ({ e, c: SL.cardById(e.id) })).filter((x) => x.c && (collFilter === "tutte" || (collFilter === "speciali" ? x.e.v !== "base" : x.c.rarity === collFilter))).sort((a, b) => b.c.ovr - a.c.ovr);
    const m = ui.menuScreen(frameUT(`Collezione · ${u.collection.length} carte`,
      `<div class="filters">${Object.entries(filters).map(([k, v]) => `<button class="chip ${k === collFilter ? "on" : ""}" data-nav data-cf="${k}">${v}</button>`).join("")}</div>
       <div class="scroll"><div class="cards">${list.map((x) => ui.cardHtml(x.c, { mark: true, entry: x.e })).join("")}</div></div>
       <div class="crumb" style="letter-spacing:0;text-transform:none;font-family:var(--body)">Seleziona una carta per venderla. Le carte in campo non si vendono. Valore: ${Object.entries(SL.QUICKSELL).map(([k, v]) => `${SL.RARITY[k].name} ${ui.fmtN(v)}`).join(", ")}; olografica ×2, numerata ×3, oro unica ×5.</div>`,
      "", true));
    ui.hydrateCards(m, u.kit);
    m.querySelectorAll("[data-cf]").forEach((b) => b.addEventListener("click", () => { collFilter = b.dataset.cf; collectionScreen(); m.querySelector(`[data-cf="${collFilter}"]`).focus(); }));
    wireTabs(m);
    m.querySelectorAll(".cards [data-card]").forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.card, e = SL.entryOf(ui.game(), k), c = SL.cardById(e.id);
      if (u.squad.includes(k)) { ui.toast(`${c.name} è in campo: toglilo prima dalla squadra`); return; }
      if (isSelling(k)) { ui.toast(`${c.name} è in vendita sul mercato`); return; }
      if (b.dataset.armed) { u.collection = u.collection.filter((x) => x.k !== k); u.coins += sellValue(e); ui.save(); ui.toast(`${c.name} venduto: +${ui.fmtN(sellValue(e))} crediti`); collectionScreen(); return; }
      m.querySelectorAll("[data-armed]").forEach((x) => delete x.dataset.armed);
      b.dataset.armed = "1"; ui.toast(`Premi di nuovo per vendere ${c.name} a ${ui.fmtN(sellValue(e))} crediti`);
    }));
    ui.focusFirst();
  }

  // ---- Kits and home ground -------------------------------------------------------------------
  const KIT_COLOURS = ["#e23b2e", "#2d6ce0", "#2fa35a", "#f07a1a", "#7a3fc2", "#2b2d36", "#f2c935", "#eef1f4", "#18b6c9", "#c2185b", "#8a5a32", "#4fe36a"];
  const PATTERNS = ["Tinta unita", "Righe", "Cerchi", "Fascia", "Luminosa", "A metà", "Zigzag"];
  function kitScreen() {
    const ui = U(), u = ut();
    const cyc = (list, v, d) => list[(list.indexOf(v) + d + list.length) % list.length];
    const sw = (c) => `<i class="coin" style="background:${c}"></i>`;
    const defs = [
      ["kit", "Colore della maglia", "", sw(u.kit), (d) => { u.kit = cyc(KIT_COLOURS, u.kit, d); }],
      ["kit2", "Secondo colore", "Righe, cerchi, fascia e gli altri motivi", sw(u.kit2), (d) => { u.kit2 = cyc(KIT_COLOURS, u.kit2, d); }],
      ["pattern", "Motivo", "", PATTERNS[u.pattern || 0], (d) => { u.pattern = ((u.pattern || 0) + d + PATTERNS.length) % PATTERNS.length; }],
      ["pitch", "Campo di casa", "Dove giochi le partite di divisione e le semifinali di coppa", esc(R.THEMES[u.pitch].name), (d) => { u.pitch = cyc(Object.keys(R.THEMES), u.pitch, d); }],
      ["name", "Nome del club", "", esc(u.club), Object.assign(() => { const n = window.prompt("Nome del club", u.club); if (n && n.trim()) u.club = n.trim().slice(0, 24); }, { action: true })],
    ];
    const m = ui.menuScreen(frameUT("Stadio e maglie",
      `<div class="rows">${ui.rowsHtml(defs)}</div><div class="panel kitprev"><canvas id="kitprev" width="128" height="128"></canvas><canvas id="kitprev2" width="128" height="128"></canvas></div>`,
      `<div class="panel"><h3>Il motivo</h3>Il secondo colore si vede in partita, sopra la maglia: righe verticali, cerchi orizzontali, una fascia diagonale, una luce che pulsa, una maglia a metà o uno zigzag.</div>`));
    ui.stepRows(m, defs, kitScreen);
    // a step redraws the tab: the cursor stays on its row (ui.js, curEl)
    // a preview of the kit on the pitch: the match's own drawing would need a match; the card
    // portrait shows the primary
    R.portrait(m.querySelector("#kitprev"), "idle_stand", 0, 3, u.kit, 0);
    R.portrait(m.querySelector("#kitprev2"), "idle_stand", 0, 3, u.kit2, 0);
    wireTabs(m); ui.focusFirst();
  }

  // ---- Transfer market ---------------------------------------------------------------------------
  // Twelve offers, a new list after every Ultimate Team match (or for 100 credits). A chosen card
  // costs more than a pack's card of the same rarity: 5 to 8 times its quick-sell value along the
  // rarity's rating range, 6 to 9 for Mito and legends. A card put up for sale goes at 95% of its
  // market price (5% commission, as on EA FC's market) at the end of the next match.
  const MARKET_ODDS = [["bronzo", 0.34], ["argento", 0.3], ["oro", 0.22], ["campione", 0.1], ["mito", 0.03], ["leggenda", 0.01]];
  SL.marketPrice = function (c) {
    const R0 = SL.RARITY[c.rarity], f = Math.max(0, Math.min(1, (c.ovr - R0.min) / Math.max(1, R0.max - R0.min)));
    const lo = c.rarity === "mito" || c.rarity === "leggenda" ? 6 : 5;
    return Math.round(SL.QUICKSELL[c.rarity] * (lo + 3 * f) / 50) * 50;
  };
  const isSelling = (k) => (ut().selling || []).includes(k);
  function market() {
    const u = ut();
    if (u.market && u.market.list) return u.market;
    const owned = new Set(u.collection.map((e) => e.id));
    const r = SL.rng((u.stats.played * 7919 + (u.marketRolls || 0) * 104729 + 17) & 0x7fffffff);
    const list = [];
    for (let k = 0; k < 60 && list.length < 12; k++) {
      let x = r(), rar = "bronzo";
      for (const [name, w] of MARKET_ODDS) { if (x < w) { rar = name; break; } x -= w; }
      const cands = SL.POOL.filter((c) => c.rarity === rar && !owned.has(c.id) && !list.includes(c.id));
      if (cands.length) list.push(cands[Math.floor(r() * cands.length)].id);
    }
    u.market = { list };
    return u.market;
  }
  function sellListed() {
    const u = ut(); if (!(u.selling || []).length) return;
    let got = 0;
    for (const k of u.selling) { const e = SL.entryOf(U().game(), k); if (!e) continue; got += Math.round(SL.marketPrice(SL.cardById(e.id)) * 0.95 * SL.VERSION_SELL[e.v]); u.collection = u.collection.filter((x) => x.k !== k); }
    u.coins += got; u.lastSale = got; u.selling = [];
    U().toast(`Mercato: carte vendute, +${U().fmtN(got)} crediti`);
  }
  let marketView = "compra", marketRole = "TUTTI";
  function marketScreen() {
    const ui = U(), u = ut(), g = ui.game();
    u.selling = u.selling || [];
    const roles = ["TUTTI", "POR", "DIF", "CEN", "ALA", "ATT"];
    const offers = market().list.map((id) => SL.cardById(id)).filter((c) => c && (marketRole === "TUTTI" || c.role === marketRole));
    const mine = u.collection.filter((e) => !u.squad.includes(e.k)).map((e) => ({ e, c: SL.cardById(e.id) })).filter((x) => x.c && (marketRole === "TUTTI" || x.c.role === marketRole)).sort((a, b) => b.c.ovr - a.c.ovr);
    const price = (c, e) => Math.round(SL.marketPrice(c) * (e ? 0.95 * SL.VERSION_SELL[e.v] : 1));
    const body = marketView === "compra"
      ? `<div class="scroll"><div class="cards">${offers.map((c) => `<div>${ui.cardHtml(c, { nav: true }).replace("data-card", "data-buy")}<div class="dupe price">${ui.coin()} ${ui.fmtN(price(c))}</div></div>`).join("") || "Nessuna offerta per questo ruolo."}</div></div>`
      : `<div class="scroll"><div class="cards">${mine.map((x) => `<div>${ui.cardHtml(x.c, { entry: x.e }).replace("data-card", "data-sell")}<div class="dupe price">${isSelling(x.e.k) ? "In vendita · " : ""}${ui.coin()} ${ui.fmtN(price(x.c, x.e))}</div></div>`).join("") || "Nessuna carta fuori dalla squadra."}</div></div>`;
    const m = ui.menuScreen(frameUT("Mercato",
      `<div class="filters"><button class="chip ${marketView === "compra" ? "on" : ""}" data-nav data-mv="compra">Compra</button><button class="chip ${marketView === "vendi" ? "on" : ""}" data-nav data-mv="vendi">Vendi${u.selling.length ? " · " + u.selling.length : ""}</button>
        <span style="width:12px"></span>${roles.map((r) => `<button class="chip ${r === marketRole ? "on" : ""}" data-nav data-mr="${r}">${r}</button>`).join("")}
        ${marketView === "compra" ? `<button class="chip" data-nav data-go="roll">Nuove offerte · ${ui.coin()} 100</button>` : ""}</div>${body}`,
      "", true));
    ui.hydrateCards(m, u.kit);
    m.querySelectorAll("[data-mv]").forEach((b) => b.addEventListener("click", () => { marketView = b.dataset.mv; SL.audio.ui(); marketScreen(); m.querySelector(`[data-mv="${marketView}"]`).focus(); }));
    m.querySelectorAll("[data-mr]").forEach((b) => b.addEventListener("click", () => { marketRole = b.dataset.mr; SL.audio.ui(); marketScreen(); m.querySelector(`[data-mr="${marketRole}"]`).focus(); }));
    ui.wire(m, { roll: () => { if (u.coins < 100) { ui.toast("Servono 100 crediti"); return; } u.coins -= 100; u.marketRolls = (u.marketRolls || 0) + 1; u.market = null; ui.save(); marketScreen(); } });
    m.querySelectorAll("[data-buy]").forEach((b) => b.addEventListener("click", () => {
      const c = SL.cardById(b.dataset.buy), p = price(c);
      if (u.coins < p) { ui.toast(`Servono ${ui.fmtN(p)} crediti: ne hai ${ui.fmtN(u.coins)}`); SL.audio.uiBack(); return; }
      if (b.dataset.armed) {
        u.coins -= p; u.collection.push({ k: c.id, id: c.id, v: "base", n: 0 });
        u.market.list = u.market.list.filter((x) => x !== c.id); count("bought", 1); ui.save();
        ui.toast(`${c.name} è tuo: −${ui.fmtN(p)} crediti`); SL.audio.card(c.rarity); marketScreen(); return;
      }
      m.querySelectorAll("[data-armed]").forEach((x) => delete x.dataset.armed);
      b.dataset.armed = "1"; ui.toast(`Premi di nuovo per comprare ${c.name} a ${ui.fmtN(p)} crediti`);
    }));
    m.querySelectorAll("[data-sell]").forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.sell, e = SL.entryOf(g, k), c = SL.cardById(e.id);
      if (isSelling(k)) { u.selling = u.selling.filter((x) => x !== k); ui.toast(`${c.name} tolto dal mercato`); }
      else { u.selling.push(k); ui.toast(`${c.name} in vendita a ${ui.fmtN(price(c, e))} crediti: si vende alla fine della prossima partita`); }
      ui.save(); marketScreen();
    }));
    wireTabs(m); ui.focusFirst();
  }

  // ---- Objectives ------------------------------------------------------------------------------
  // Counters kept in u.obj.n, raised after every match (record) and by the screens; a reached
  // objective is claimed once, by hand, for its credits.
  const OBJECTIVES = [
    { id: "won1", title: "Prima vittoria", desc: "Vinci una partita dell'Ultimate Team", key: "won", need: 1, prize: 300 },
    { id: "div3", title: "Tris", desc: "Vinci 3 partite di divisione", key: "divWon", need: 3, prize: 800 },
    { id: "goals15", title: "Bomber", desc: "Segna 15 gol nell'Ultimate Team", key: "goals", need: 15, prize: 600 },
    { id: "pass60", title: "Regista", desc: "60 passaggi riusciti nell'Ultimate Team", key: "passes", need: 60, prize: 500 },
    { id: "hits10", title: "Muro", desc: "10 spallate andate a segno nell'Ultimate Team", key: "hits", need: 10, prize: 500 },
    { id: "skills10", title: "Fantasista", desc: "10 skill nell'Ultimate Team (levetta destra o 1-9)", key: "skills", need: 10, prize: 600 },
    { id: "clean1", title: "Porta inviolata", desc: "Vinci una partita senza subire gol", key: "clean", need: 1, prize: 600 },
    { id: "packs5", title: "Collezionista", desc: "Apri 5 pacchetti", key: "packs", need: 5, prize: 700 },
    { id: "buy1", title: "Primo acquisto", desc: "Compra un giocatore al mercato", key: "bought", need: 1, prize: 300 },
    { id: "gold5", title: "Squadra d'oro", desc: "Schiera cinque giocatori da 75 in su", key: "goldFive", need: 1, prize: 1000 },
    { id: "up1", title: "Promozione", desc: "Sali di divisione", key: "promoted", need: 1, prize: 2000 },
    { id: "cup1", title: "Coppa in bacheca", desc: "Vinci la Coppa Strike", key: "cups", need: 1, prize: 1000 },
  ];
  function obj() { const u = ut(); u.obj = u.obj || { n: {}, claimed: {} }; return u.obj; }
  // max: the counter holds a state (reached or not) rather than a sum
  function count(key, v, max) { const o = obj(); o.n[key] = max ? Math.max(o.n[key] || 0, v) : (o.n[key] || 0) + (v || 0); }
  function objectivesReady() { const o = obj(); return OBJECTIVES.some((x) => !o.claimed[x.id] && (o.n[x.key] || 0) >= x.need); }
  function objectivesScreen() {
    const ui = U(), u = ut(), o = obj();
    const rows = OBJECTIVES.map((x, i) => {
      const n = Math.min(x.need, o.n[x.key] || 0), done = n >= x.need, got = o.claimed[x.id];
      return `<button class="row action" data-nav data-obj="${x.id}" ${i === 0 ? "data-first=1" : ""}><span class="lbl">${esc(x.title)}<small>${esc(x.desc)} · ${n}/${x.need}</small></span><span class="val">${got ? "✓ riscattato" : done ? "Riscatta " + ui.coin() + " " + ui.fmtN(x.prize) : ui.coin() + " " + ui.fmtN(x.prize)}</span></button>`;
    }).join("");
    const left = OBJECTIVES.filter((x) => !o.claimed[x.id]).length;
    const m = ui.menuScreen(frameUT("Obiettivi", `<div class="rows scroll">${rows}</div>`,
      `<div class="panel"><h3>Come funzionano</h3>Le partite di divisione e di coppa fanno avanzare gli obiettivi; pacchetti, mercato e rosa contano appena li usi. Un obiettivo raggiunto si riscatta qui, una volta sola. Ne restano ${left} su ${OBJECTIVES.length}.</div>`));
    m.querySelectorAll("[data-obj]").forEach((b) => b.addEventListener("click", () => {
      const x = OBJECTIVES.find((y) => y.id === b.dataset.obj);
      if (o.claimed[x.id]) return;
      if ((o.n[x.key] || 0) < x.need) { ui.toast(`${x.title}: ${Math.min(x.need, o.n[x.key] || 0)} su ${x.need}`); return; }
      o.claimed[x.id] = Date.now(); u.coins += x.prize; ui.save(); SL.audio.card("oro");
      ui.toast(`${x.title}: +${ui.fmtN(x.prize)} crediti`); objectivesScreen(); m.querySelector(`[data-obj="${x.id}"]`)?.focus();
    }));
    wireTabs(m); ui.focusFirst();
  }

  // ---- Packs and the walkout ----------------------------------------------------------------------
  function packsScreen() {
    const ui = U(), u = ut();
    const m = ui.menuScreen(frameUT("Pacchetti",
      `<div class="packs">${SL.PACKS.map((p, i) => `<button class="pack ${p.id}" data-nav data-pack="${p.id}" ${i === 0 ? "data-first=1" : ""} aria-disabled="${u.coins < p.price}">
        <span class="pn">${esc(p.name.replace("Pacchetto ", ""))}</span>
        <span class="pd">${p.cards} giocatori<br>${Object.entries(p.odds).map(([k, v]) => `${SL.RARITY[k].name} ${(v * 100).toFixed(v < 0.05 ? 0 : 0)}%`).join(" · ")}</span>
        <span class="pp">${ui.coin()} ${ui.fmtN(p.price)}</span></button>`).join("")}</div>`,
      `<div class="panel"><h3>Versioni speciali</h3>Una carta da 85 in su può uscire olografica (12%), numerata da 1 a 10 (5%) o oro unica (1%, una sola copia per collezione): stesse statistiche, un'altra finitura. Un giocatore da 85 in su entra con il walkout.</div>
       <div class="panel"><h3>Leggende e Mito</h3>Le leggende sono campioni ritirati del calcio a quattro, rare anche nei pacchetti migliori. Le carte Mito sono i giocatori delle squadre leggendarie.</div>
       <div class="panel"><h3>Crediti</h3>Si guadagnano giocando partite di divisione, coppe, amichevoli e sfide. Un doppione torna in crediti.</div>`));
    m.querySelectorAll("[data-pack]").forEach((b) => b.addEventListener("click", () => openPack(SL.PACKS.find((p) => p.id === b.dataset.pack))));
    wireTabs(m); ui.focusFirst();
  }
  function openPack(pack) {
    const ui = U(), u = ut();
    if (u.coins < pack.price) { ui.toast(`Servono ${ui.fmtN(pack.price)} crediti: ne hai ${ui.fmtN(u.coins)}`); SL.audio.uiBack(); return; }
    u.coins -= pack.price; u.stats.packs++; count("packs", 1);
    const got = SL.openPack(pack, ui.game());
    let back = 0;
    for (const g of got) { if (g.dup) back += SL.QUICKSELL[g.card.rarity] * SL.VERSION_SELL[g.v]; else u.collection.push({ k: g.k, id: g.card.id, v: g.v, n: g.n }); }
    u.coins += back;
    const stars = got.filter((g) => g.card.ovr >= 85);
    u.stats.walkouts += stars.length;
    ui.save();
    const reveal = () => showPack(pack, got);
    if (stars.length) walkout(stars[stars.length - 1], reveal); else reveal();
  }
  function showPack(pack, got) {
    const ui = U();
    ui.setMode("reveal"); ui.show("reveal");
    const r = ui.$("#reveal");
    r.innerHTML = `<div class="crumb">${esc(pack.name)}</div><h2 class="title">${got.some((g) => g.card.rarity === "leggenda") ? "Una leggenda!" : got.some((g) => g.v !== "base") ? "Una versione speciale" : got.some((g) => g.card.ovr >= 85) ? "Un campione nel pacchetto" : "I tuoi nuovi giocatori"}</h2>
      <div class="cards">${got.map((g, i) => `<div>${ui.cardHtml(g.card, { flip: true, delay: 0.25 + i * 0.45, nav: false, entry: { k: g.k, v: g.v, n: g.n } })}<div class="dupe">${g.dup ? `Doppione: +${ui.fmtN(SL.QUICKSELL[g.card.rarity] * SL.VERSION_SELL[g.v])} crediti` : g.v !== "base" ? SL.VERSIONS[g.v].name + (g.v === "num" ? ` n. ${g.n}/10` : "") : "Nuovo"}</div></div>`).join("")}</div>
      <div class="top"><button class="cta gold" data-nav data-go="again" data-first=1>Apri un altro</button><button class="item" data-nav data-go="done" style="font-size:24px">Fatto</button></div>`;
    ui.hydrateCards(r, ut().kit);
    got.forEach((g, i) => setTimeout(() => SL.audio.card(g.card.rarity), 250 + i * 450));
    ui.wire(r, { again: () => openPack(pack), done: () => hub("pacchetti") });
    ui.setBack(() => hub("pacchetti")); ui.focusFirst();
  }

  // The walkout: the lights go down, the role, the club, the rating, then the player walks out
  // toward the camera and the card turns. About 6,5 s; A, Enter or Esc skips to the end.
  let wo = null;
  function walkout(g, then) {
    const ui = U(), c = g.card;
    const club = c.lore ? SL.clubById(c.lore) : c.club ? SL.clubById(c.club) : null;
    ui.setMode("walkout"); ui.show("reveal");
    const r = ui.$("#reveal");
    r.innerHTML = `<div class="walkout v-${g.v} ${c.rarity}">
      <div class="beams"><i></i><i></i><i></i></div>
      <div class="wo-step wo-role">${esc(SL.ROLE_NAMES[c.role])}</div>
      <div class="wo-step wo-club">${club ? ui.badge(club) + `<b>${esc(club.name)}</b>` : `<b>${c.rarity === "leggenda" ? "Leggenda" : "Senza club"}</b>`}</div>
      <div class="wo-step wo-ovr"><b>${c.ovr}</b></div>
      <canvas class="wo-step wo-fig" width="128" height="128"></canvas>
      <div class="wo-step wo-card">${ui.cardHtml(c, { nav: false, entry: { k: g.k, v: g.v, n: g.n } })}<div class="wo-name">${esc(c.name)}${g.v !== "base" ? ` · ${SL.VERSIONS[g.v].name}${g.v === "num" ? " " + g.n + "/10" : ""}` : ""}</div></div>
      <div class="wo-skip">A / Invio per saltare</div></div>`;
    ui.hydrateCards(r, ut().kit);
    const fig = r.querySelector(".wo-fig");
    const sheet = c.role === "POR" ? "idle" : R.resolve(c.body, "walk");
    const kit = club ? club.kit : ut().kit;
    const t0 = performance.now();
    SL.audio.special();
    // [class, from, to] in seconds
    const steps = [["wo-role", 0.6, 3.4], ["wo-club", 1.6, 3.4], ["wo-ovr", 2.6, 5.4], ["wo-fig", 3.4, 5.6], ["wo-card", 5.4, 99]];
    let sounded = 0;
    wo = { frame: (now) => {
      const t = (now - t0) / 1000;
      steps.forEach(([cls, from, to], i) => {
        r.querySelector("." + cls).classList.toggle("on", t >= from && t < to);
        if (t >= from && sounded <= i) { sounded = i + 1; SL.audio.card(c.rarity); }
      });
      if (t >= 3.4 && t < 5.6) {
        const meta = R.meta(sheet), cols = meta ? meta.columns : 1;
        R.portrait(fig, sheet, Math.floor(t * 8) % cols, Math.min(4, (meta && meta.rows || 5) - 1), kit, c.look);
        fig.style.transform = `scale(${(1 + (t - 3.4) * 0.6).toFixed(3)})`;
      }
      if (t >= 6.6) end();
    } };
    const end = () => { if (!wo) return; wo = null; ui.setWalkoutSkip(null); then(); };
    ui.setWalkoutSkip(end);
  }

  SL.ut = { hub, walkoutFrame: (now) => wo && wo.frame(now), formationRoles };
})();

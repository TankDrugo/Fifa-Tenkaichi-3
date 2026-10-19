// Strike Legends (browser) - clubs, lore teams, player cards, packs and the saved game.
// Everything here is invented: clubs, players, legends and badges (README.md, "Contenuti originali").
"use strict";

const SL = window.SL || (window.SL = {});

// A small seeded generator, so the card pool is the same for every player of the game.
SL.rng = function (seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Kits: the primary takes the palette's kit entries (archive game/systems/sprite_sheets.gd, TEAM_PRIMARY);
// the alternate is worn when two primaries are closer than 90 degrees of hue (archive ART-BIBLE.md §4.2).
// kit2 and pattern draw a second colour on the kit (render.js, FS): 1 stripes, 2 hoops, 3 sash,
// 4 glow, 5 halves, 6 zigzag.
SL.CLUBS = [
  { id: "fulmini", formation: "rombo", name: "Fulmini Rossi", short: "FUL", city: "Portoscuro", kit: "#e23b2e", alt: "#f2f0e6", rating: 74, pitch: "notte" },
  { id: "marea", formation: "quadrato", name: "Marea Blu", short: "MAR", city: "Bassavalle", kit: "#2d6ce0", alt: "#f2c14e", rating: 72, pitch: "spiaggia", kit2: "#f2f0e6", pattern: 2 },
  { id: "vulcano", formation: "offensivo", name: "Vulcano FC", short: "VUL", city: "Cenerario", kit: "#f07a1a", alt: "#2a2a2e", rating: 78, pitch: "tramonto" },
  { id: "lupi", formation: "piramide", name: "Lupi Verdi", short: "LUP", city: "Selvanera", kit: "#2fa35a", alt: "#e9e3cf", rating: 70, pitch: "giorno" },
  { id: "corvi", formation: "difensivo", name: "Corvi Neri", short: "COR", city: "Monteferro", kit: "#2b2d36", alt: "#e2384f", rating: 80, pitch: "strada", kit2: "#e2384f", pattern: 1 },
  { id: "aurora", formation: "rombo", name: "Aurora Gialla", short: "AUR", city: "Solaria", kit: "#f2c935", alt: "#3048a8", rating: 68, pitch: "giorno" },
  { id: "ghiaccio", formation: "quadrato", name: "Ghiaccio Bianco", short: "GHI", city: "Valbrina", kit: "#eef1f4", alt: "#1f3c78", rating: 76, pitch: "neve" },
  { id: "tempesta", formation: "offensivo", name: "Viola Tempesta", short: "TEM", city: "Ventarola", kit: "#7a3fc2", alt: "#f5e9b8", rating: 82, pitch: "notte", kit2: "#f5e9b8", pattern: 3 },
];

// ---- Lore teams: a people, a story, a ground and a kit of their own -----------------------
// look: the skin and hair of the people (render.js, LOOKS 8-13); figures: the bodies and
// characters their players are drawn with.
SL.LORE = [
  { id: "cometa", formation: "offensivo", name: "Cometa Verde", short: "CVR", city: "Kepler-Zeta", people: "Alieni", kit: "#4fe36a", kit2: "#123a8a", pattern: 4, alt: "#d9e4ff", rating: 85, pitch: "luna", look: 8,
    figures: ["testone", "spillo", "folletto", "vita", "bibi"],
    story: "Vengono da Kepler-Zeta, un pianeta dove nessuno aveva mai visto un pallone. Nel 2019 una loro sonda ha intercettato la finale di una coppa trasmessa via satellite, e da allora ne hanno registrate quattromila. Giocano sul Cratere Lunare perché da lì, dicono, la Terra si vede intera. Con la gravità della Luna, sei decimi della nostra, un loro pallonetto resta in aria il 67% di tempo in più.",
    players: [["Zorb", "POR", 84], ["Klaatu Vex", "DIF", 83], ["Nebula Prime", "CEN", 86], ["Orbis", "ALA", 85], ["Quasar Kix", "ATT", 89], ["Plink", "CEN", 81], ["Glorp", "DIF", 80]] },
  { id: "nottefonda", formation: "piramide", name: "Conti di Nottefonda", short: "NOT", city: "Nottefonda", people: "Vampiri", kit: "#8c1022", kit2: "#151018", pattern: 3, alt: "#e9e2ef", rating: 86, pitch: "cimitero", look: 9,
    figures: ["torre", "spillo", "shino", "ombra", "fumiriya"],
    story: "Una famiglia di conti che gioca dopo il tramonto da trecento anni, sul campo dietro il castello. Il loro portiere non si riflette negli specchi, e gli attaccanti avversari dicono che per questo non capiscono dove si butterà. Non hanno mai perso una partita cominciata a mezzanotte. Al sorgere del sole la partita è finita, qualunque sia il risultato.",
    players: [["Conte Vladimiro", "POR", 85], ["Morgana Velluto", "DIF", 84], ["Lucrezio Ombra", "CEN", 87], ["Selene Notturna", "ALA", 86], ["Barone Sanguinetti", "ATT", 88], ["Igor", "DIF", 79], ["Contessa Corvina", "ATT", 83]] },
  { id: "marestorto", formation: "quadrato", name: "Ciurma del Mare Storto", short: "CMS", city: "Isola Storta", people: "Pirati", kit: "#1e1e24", kit2: "#f2f0e6", pattern: 1, alt: "#c9a227", rating: 81, pitch: "nave", look: 10,
    figures: ["barile", "toro", "muro", "shibu", "ciuffo"],
    story: "Hanno vinto il loro galeone a una partita di dadi e ci hanno tracciato le righe sopra con la vernice delle vele. Giocano scalzi, perché il ponte bagnato fa scivolare le scarpe. Il capitano tiene il conto dei gol con tacche sull'albero maestro: sono 412. Chi perde contro di loro pulisce la stiva per una settimana.",
    players: [["Capitan Barbagrigia", "POR", 80], ["Uncino Malvezzi", "DIF", 81], ["Nostromo Pece", "CEN", 82], ["Mozzo Lesto", "ALA", 84], ["Sciabola Rossa", "ATT", 85], ["Pappagallo Gigi", "CEN", 78], ["Gamba di Legno", "DIF", 77]] },
  { id: "brace", formation: "offensivo", name: "Draghi di Brace", short: "DRB", city: "Monte Fumante", people: "Draghi", kit: "#ff6a1a", kit2: "#a3170e", pattern: 2, alt: "#2a1a15", rating: 84, pitch: "vulcano", look: 11,
    figures: ["roccia", "toro", "muro", "recluta", "vicky"],
    story: "Sono nati nelle grotte del Monte Fumante e hanno scoperto il pallone quando uno è rotolato nella lava senza sciogliersi. Si allenano sul basalto ancora caldo: un campo d'erba, per loro, è troppo freddo per correre. Quando segnano, il vulcano dietro la porta erutta, e i tifosi avversari hanno imparato a portarsi l'ombrello.",
    players: [["Ignis", "POR", 83], ["Scaglia", "DIF", 85], ["Fumarola", "CEN", 84], ["Lapillo", "ALA", 86], ["Magmar Fuoco", "ATT", 88], ["Tizzone", "CEN", 80], ["Cenere", "DIF", 79]] },
  { id: "volt", formation: "difensivo", name: "Unità V-0LT", short: "V0L", city: "Officina 9", people: "Robot", kit: "#3cdcff", kit2: "#ff3cc8", pattern: 5, alt: "#ff3cc8", rating: 83, pitch: "fabbrica", look: 12,
    figures: ["muro", "roccia", "torre", "matricola", "coda"],
    story: "Cinque robot da magazzino riprogrammati da un custode notturno che voleva qualcuno con cui giocare. Calcolano ogni passaggio in quattro millisecondi, ma la batteria dura due tempi e non uno di più. Il loro centravanti si chiama 0-9: il custode gli ha dato il numero di maglia come nome, e lui non ha mai chiesto perché.",
    players: [["Muro-1", "POR", 84], ["Bullone", "DIF", 83], ["Circuito", "CEN", 85], ["Scintilla", "ALA", 84], ["0-9", "ATT", 87], ["Ingranaggio", "DIF", 80], ["Diodo", "ALA", 79]] },
  { id: "passogelato", formation: "piramide", name: "Yeti del Passo Gelato", short: "YET", city: "Passo Gelato", people: "Yeti", kit: "#eef1f4", kit2: "#5fb4f0", pattern: 6, alt: "#1f3c78", rating: 82, pitch: "ghiacciaio", look: 13,
    figures: ["barile", "toro", "roccia", "muro", "recluta"],
    story: "Scendono dal ghiacciaio una volta all'anno, quando la neve è abbastanza dura da far rimbalzare il pallone. Nessuno li ha mai visti allenarsi, ma tutti hanno visto le loro impronte a centrocampo. Il portiere para di spalle, perché le mani gli servono per scaldarsi. Hanno imparato il calcio da una radio caduta da un aereo.",
    players: [["Grande Bruno", "POR", 82], ["Valanga", "DIF", 85], ["Brina", "CEN", 81], ["Slavina", "ALA", 83], ["Zanna Bianca", "ATT", 86], ["Fiocco", "CEN", 78], ["Ghiacciolo", "DIF", 79]] },
];
for (const t of SL.LORE) SL.CLUBS.push(Object.assign({ lore: true }, t));
SL.clubById = (id) => SL.CLUBS.find((c) => c.id === id);
SL.NORMAL_CLUBS = () => SL.CLUBS.filter((c) => !c.lore);

SL.hue = function (hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d > 0) {
    if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
  }
  return { h: (h * 60 + 360) % 360, s: mx > 0 ? d / mx : 0, v: mx };
};
// Two kits are told apart by hue when both are saturated, by brightness when one is not.
SL.kitsClash = function (a, b) {
  const A = SL.hue(a), B = SL.hue(b);
  if (A.s < 0.25 || B.s < 0.25) return Math.abs(A.v - B.v) < 0.35 && Math.abs(A.s - B.s) < 0.3;
  const dh = Math.min(Math.abs(A.h - B.h), 360 - Math.abs(A.h - B.h));
  return dh < 90;
};
// The away side's kit for a match: its own unless it clashes with the home one.
// A second colour close to the home kit goes too: Corvi Neri's red stripes against Fulmini Rossi.
SL.awayKit = function (home, away) {
  if (SL.kitsClash(home.kit, away.kit)) return { kit: away.alt, kit2: null, pattern: 0 };
  if (away.kit2 && away.pattern && SL.kitsClash(home.kit, away.kit2)) return { kit: away.kit, kit2: null, pattern: 0 };
  return { kit: away.kit, kit2: away.kit2 || null, pattern: away.pattern || 0 };
};

// ---- Figures -----------------------------------------------------------------------------
const FIRST = ["Dario", "Elio", "Nico", "Teo", "Ivo", "Lino", "Rafa", "Kenji", "Omar", "Sami", "Luca", "Pietro",
  "Bruno", "Tomas", "Yuri", "Ennio", "Mattia", "Aldo", "Kofi", "Iker", "Joel", "Milo", "Renzo", "Taro",
  "Ugo", "Vito", "Zeno", "Adel", "Bastian", "Ciro"];
const LAST = ["Ferrabosco", "Lunardi", "Okonkwo", "Varesi", "Montagna", "Kurosawa", "Belfiore", "Strazza",
  "Ramires", "Delvecchio", "Ostrowski", "Calò", "Ventura", "Nakamura", "Brezza", "Sartori", "Fiammetta",
  "Quercia", "Abara", "Rondinelli", "Galvani", "Moretto", "Saldana", "Tempesti", "Corvino", "Lombardi",
  "Ismaili", "Pellegrino", "Zanetto", "Aguado"];
// Figures made from player01 by the archive's tools/bodies.json and tools/render_bodies.py: "" is the
// figure as built. height scales the sprite on the pitch.
SL.BODIES = [
  { id: "", name: "Classico", height: 1.0 }, { id: "toro", name: "Toro", height: 1.0 },
  { id: "folletto", name: "Folletto", height: 0.92 }, { id: "torre", name: "Torre", height: 1.07 },
  { id: "muro", name: "Muro", height: 1.02 }, { id: "lampo", name: "Lampo", height: 1.0 },
  { id: "roccia", name: "Roccia", height: 0.97 }, { id: "testone", name: "Testone", height: 0.96 },
  { id: "spillo", name: "Spillo", height: 1.05 }, { id: "barile", name: "Barile", height: 0.95 },
  { id: "ragazzo", name: "Ragazzo", height: 0.93 },
];
// The VRoid Project characters (README.md, "Crediti"; the archive's tools/characters.json),
// rendered at their own height.
SL.CHARS = [
  { id: "shibu", name: "Shibu" }, { id: "ombra", name: "Ombra" }, { id: "bibi", name: "Bibi" }, { id: "vita", name: "Vita" },
  { id: "vicky", name: "Vicky" }, { id: "matricola", name: "Matricola" }, { id: "recluta", name: "Recluta" },
  { id: "coda", name: "Coda" }, { id: "ciuffo", name: "Ciuffo" }, { id: "fumiriya", name: "Fumiriya" }, { id: "shino", name: "Shino" },
];
SL.FIGURES = SL.BODIES.concat(SL.CHARS.map((c) => Object.assign({ height: 1.0, char: true }, c)));
SL.BODY_HEIGHT = Object.fromEntries(SL.FIGURES.map((b) => [b.id, b.height]));

// ---- Player cards -------------------------------------------------------------------------
SL.ROLES = ["POR", "DIF", "CEN", "ALA", "ATT"];
SL.ROLE_NAMES = { POR: "Portiere", DIF: "Difensore", CEN: "Centrocampista", ALA: "Ala", ATT: "Attaccante" };
// campione: today's top players, the only ones with special versions; leggenda: retired greats,
// rare in packs; mito: the lore teams' players.
SL.RARITY = {
  bronzo: { name: "Bronzo", min: 58, max: 66 },
  argento: { name: "Argento", min: 67, max: 74 },
  oro: { name: "Oro", min: 75, max: 84 },
  campione: { name: "Campione", min: 85, max: 91 },
  leggenda: { name: "Leggenda", min: 88, max: 95 },
  mito: { name: "Mito", min: 77, max: 89 },
};
// Same statistics, another finish (docs/DETTAGLI.md, "Ultimate Team"): holographic, numbered 1-10,
// the one gold. Only cards of 85 or more come in them.
SL.VERSIONS = {
  base: { name: "Base", odds: 1 },
  holo: { name: "Olografica", odds: 0.12 },
  num: { name: "Numerata", odds: 0.05 },
  unica: { name: "Oro unica", odds: 0.01 },
};
const TILT = { POR: [-8, -10, -2, 8], DIF: [-2, -8, 0, 8], CEN: [0, -2, 8, 0], ALA: [8, 0, 2, -6], ATT: [4, 8, -4, 2] };

// Retired greats of the invented world (never real people).
const LEGENDS = [
  ["Aurelio Mancuso", "POR", 91, "Tra i pali dei Fulmini Rossi per diciannove stagioni, parò l'ultimo rigore a 41 anni."],
  ["Bartolo Ferraiolo", "DIF", 90, "Detto «il Cancello»: in 300 partite non fu mai saltato in dribbling, secondo i giornali di Portoscuro."],
  ["Ilario Venturini", "DIF", 89, "Capitano della Marea Blu dei tre scudetti consecutivi."],
  ["Gaspare Lunetti", "CEN", 93, "Inventò il passaggio di tacco all'indietro che a Bassavalle chiamano ancora «la lunetta»."],
  ["Mirko Saltafossi", "CEN", 91, "Correva 14 chilometri a partita quando gli altri ne correvano 9."],
  ["Kwame Asantelli", "ALA", 92, "L'ala più veloce della sua epoca: 100 metri in 10,6 secondi col pallone."],
  ["Tiberio Scarlatti", "ALA", 90, "Segnò direttamente da calcio d'angolo in tre finali diverse."],
  ["Enzo Fiammafredda", "ATT", 95, "Il capocannoniere di sempre del calcio a quattro: 611 gol, l'ultimo in rovesciata."],
  ["Remo Castellani", "ATT", 92, "Vinse la Coppa Strike con quattro squadre diverse."],
  ["Hiro Takamatsu", "ATT", 91, "Arrivò da Osakava a 17 anni e in un mese era titolare del Vulcano FC."],
  ["Nadia Volkova", "CEN", 92, "La prima a vincere il Pallone di Platino: regia, gol e 200 assist."],
  ["Sofia Marangoni", "DIF", 90, "Mai un cartellino in carriera, mai un avversario solo davanti al portiere."],
];

function makePool() {
  const r = SL.rng(20260927);
  const pool = [];
  const rarities = [["bronzo", 34], ["argento", 30], ["oro", 22], ["campione", 10]];
  let id = 0;
  const stats = (role, ovr) => TILT[role].map((t) => Math.max(40, Math.min(99, Math.round(ovr + t + (r() - 0.5) * 8))));
  const figs = SL.FIGURES.filter((f) => f.id);
  for (const [rar, n] of rarities) {
    for (let i = 0; i < n; i++) {
      const role = SL.ROLES[(id * 7 + i) % 5];
      const R = SL.RARITY[rar];
      const ovr = Math.round(R.min + r() * (R.max - R.min));
      const st = stats(role, ovr);
      pool.push({
        id: "c" + id,
        name: FIRST[Math.floor(r() * FIRST.length)] + " " + LAST[Math.floor(r() * LAST.length)],
        role, rarity: rar, ovr,
        vel: st[0], tir: st[1], pas: st[2], fis: st[3],
        look: Math.floor(r() * 8),
        // keepers keep the built figure: the keeper's sheets exist only for it
        // 8 is prime with the 21 figures, so the cards go through all of them
        body: role === "POR" ? "" : figs[(id * 8 + 3) % figs.length].id,
        club: SL.CLUBS[Math.floor(r() * 8)].id,
        age: 18 + Math.floor(r() * 16),
      });
      id++;
    }
  }
  LEGENDS.forEach(([name, role, ovr, bio], i) => {
    const st = stats(role, ovr);
    pool.push({ id: "L" + i, name, role, rarity: "leggenda", ovr, vel: st[0], tir: st[1], pas: st[2], fis: st[3], look: (i * 3) % 8,
      body: role === "POR" ? "" : figs[(i * 5) % figs.length].id, club: null, bio, age: 40 + i });
  });
  for (const t of SL.LORE) t.players.forEach(([name, role, ovr], i) => {
    const st = stats(role, ovr);
    pool.push({ id: t.id + i, name, role, rarity: "mito", ovr, vel: st[0], tir: st[1], pas: st[2], fis: st[3], look: t.look,
      body: role === "POR" ? "" : t.figures[i % t.figures.length], club: t.id, lore: t.id, age: 20 + i * 3 });
  });
  return pool;
}
SL.POOL = makePool();
const BY_ID = Object.fromEntries(SL.POOL.map((c) => [c.id, c]));
// Cards made during a career (career.js) join the lookup while that career is loaded.
SL.extraCards = {};
SL.cardById = (id) => BY_ID[id] || SL.extraCards[id];
SL.hasVersions = (card) => !!card && card.ovr >= 85 && card.rarity !== "mito";

// What a card changes in a match: small, readable, never a chance (archive GDD.md §4.4).
SL.cardEffect = function (card) {
  if (!card) return { speed: 1, shot: 1, pass: 1, knock: 1, reserve: 0 };
  return {
    speed: 0.94 + (card.vel - 40) / 59 * 0.12,      // 0,94-1,06 of the run speed
    shot: 0.92 + (card.tir - 40) / 59 * 0.16,       // top shot speed x
    pass: 0.94 + (card.pas - 40) / 59 * 0.12,       // pass speed x
    knock: 1.15 - (card.fis - 40) / 59 * 0.3,       // knockback taken x
    reserve: card.role === "POR" ? Math.round((card.ovr - 75) * 0.8) : 0, // keeper's save reserve +/-
  };
};

// The five a club fields: one per role, the club's rating within the pool; a lore team its own.
SL.clubSquad = function (club) {
  const order = ["POR", "DIF", "CEN", "ALA", "ATT"];
  if (club.lore) return order.map((role) => SL.POOL.find((c) => c.lore === club.id && c.role === role));
  const r = SL.rng(club.id.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  const gen = SL.POOL.filter((c) => !c.lore && c.rarity !== "leggenda");
  return order.map((role) => {
    const cands = gen.filter((c) => c.role === role).sort((a, b) => Math.abs(a.ovr - club.rating) - Math.abs(b.ovr - club.rating));
    return cands[Math.floor(r() * Math.min(4, cands.length))];
  });
};

// ---- Packs ---------------------------------------------------------------------------------
SL.PACKS = [
  { id: "bronzo", name: "Pacchetto Bronzo", price: 400, cards: 3, odds: { bronzo: 0.8, argento: 0.2 } },
  { id: "argento", name: "Pacchetto Argento", price: 1200, cards: 4, odds: { bronzo: 0.25, argento: 0.6, oro: 0.15 } },
  { id: "oro", name: "Pacchetto Oro", price: 3000, cards: 4, odds: { argento: 0.3, oro: 0.6, campione: 0.07, mito: 0.02, leggenda: 0.01 } },
  { id: "campione", name: "Pacchetto Campioni", price: 7500, cards: 3, odds: { oro: 0.55, campione: 0.33, mito: 0.08, leggenda: 0.04 } },
  { id: "leggenda", name: "Pacchetto Leggende", price: 20000, cards: 2, odds: { campione: 0.6, mito: 0.25, leggenda: 0.15 } },
];
SL.QUICKSELL = { bronzo: 60, argento: 180, oro: 500, campione: 1500, mito: 1800, leggenda: 4000 };
SL.VERSION_SELL = { base: 1, holo: 2, num: 3, unica: 5 };

// A collection entry: {k: key, id, v: version, n: serial of a numbered one}. The key tells copies apart.
SL.entryKey = (id, v, n) => (v === "base" ? id : v === "num" ? id + ":num" + n : id + ":" + v);
SL.entryOf = (game, k) => game.ut.collection.find((e) => e.k === k);
SL.openPack = function (pack, game) {
  const r = Math.random;
  const out = [];
  const have = new Set(game.ut.collection.map((e) => e.k));
  for (let i = 0; i < pack.cards; i++) {
    let x = r(), rar = "bronzo";
    for (const [k, p] of Object.entries(pack.odds)) { if (x < p) { rar = k; break; } x -= p; rar = k; }
    const cands = SL.POOL.filter((c) => c.rarity === rar);
    const card = cands[Math.floor(r() * cands.length)];
    let v = "base", n = 0;
    if (SL.hasVersions(card)) {
      const y = r(), V = SL.VERSIONS;
      // the one gold exists once: a second pull of it comes as holographic
      if (y < V.unica.odds && !have.has(SL.entryKey(card.id, "unica"))) v = "unica";
      else if (y < V.unica.odds + V.num.odds) { v = "num"; n = 1 + Math.floor(r() * 10); }
      else if (y < V.unica.odds + V.num.odds + V.holo.odds) v = "holo";
    }
    const k = SL.entryKey(card.id, v, n);
    const dup = have.has(k) || out.some((o) => o.k === k);
    out.push({ card, v, n, k, dup });
  }
  out.sort((a, b) => a.card.ovr - b.card.ovr);
  return out;
};

// ---- The saved game (browser storage: this viewer's own progress) ---------------------------
const KEY = "strikelegends.save.v2";
const OLD_KEY = "strikelegends.career.v1";
SL.defaultSettings = () => ({
  minutes: 4, difficulty: 1, opponentAi: 0, aiHits: true, goldenGoal: true,
  hitLook: 1, showHints: true, padLayout: "classic", rumble: true,
  master: 0.8, sfx: 0.9, crowd: 0.6, voice: 0.9, commentary: true,
  zoom: 1, camFollow: 1, camLead: 1, shake: true, weather: true, names: 1,
  formation: "rombo", autoSwitch: true, passAssist: "semi",
});
function starterUT() {
  const pick = ["POR", "DIF", "CEN", "ALA", "ATT", "DIF", "ATT", "CEN"].map((role, i) => {
    const c = SL.POOL.filter((p) => p.role === role && (p.rarity === "bronzo" || p.rarity === "argento")).sort((a, b) => a.ovr - b.ovr);
    return c[Math.min(c.length - 1, i % 3)].id;
  });
  const ids = [...new Set(pick)];
  return {
    club: "Strike FC", kit: "#e23b2e", kit2: "#f2f0e6", pattern: 0, pitch: "notte",
    coins: 1500, collection: ids.map((id) => ({ k: id, id, v: "base", n: 0 })),
    squad: ["POR", "DIF", "CEN", "ALA", "ATT"].map((role) => ids.find((id) => SL.cardById(id).role === role) || ids[0]),
    stats: { played: 0, won: 0, drawn: 0, lost: 0, goals: 0, cups: 0, packs: 0, walkouts: 0 },
    cup: null,
  };
}
SL.newGame = function () {
  return { v: 2, settings: SL.defaultSettings(), ut: starterUT(), career: null, challenges: {} };
};
SL.load = function () {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const g = JSON.parse(raw), d = SL.newGame();
      g.settings = Object.assign(SL.defaultSettings(), g.settings || {});
      g.ut = Object.assign(d.ut, g.ut || {});
      g.ut.stats = Object.assign(starterUT().stats, g.ut.stats || {});
      g.ut.collection = (g.ut.collection || []).filter((e) => e && SL.cardById(e.id));
      if (!g.ut.collection.length) g.ut.collection = d.ut.collection;
      if (!Array.isArray(g.ut.squad) || g.ut.squad.length !== 5 || g.ut.squad.some((k) => !SL.entryOf(g, k))) g.ut.squad = d.ut.squad.filter((k) => SL.entryOf(g, k)).length === 5 ? d.ut.squad : g.ut.collection.slice(0, 5).map((e) => e.k);
      g.challenges = g.challenges || {};
      return g;
    }
    // The first browser save (v1) kept settings, coins and results: they carry over.
    const old = localStorage.getItem(OLD_KEY);
    if (old) {
      const o = JSON.parse(old), g = SL.newGame();
      g.settings = Object.assign(g.settings, o.settings || {});
      if (typeof o.coins === "number") g.ut.coins = o.coins;
      if (o.stats) Object.assign(g.ut.stats, o.stats);
      if (o.club) g.ut.club = o.club;
      if (o.kit) g.ut.kit = o.kit;
      return g;
    }
  } catch (e) { /* private window or blocked storage: a fresh game */ }
  return SL.newGame();
};
SL.save = function (game) {
  try { localStorage.setItem(KEY, JSON.stringify(game)); } catch (e) { /* nothing to keep it in */ }
};

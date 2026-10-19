// Strike Legends - the tension bar (docs/DETTAGLI.md, "Tensione") measured in AI matches without a
// browser: points a team gains, how often the bar fills and when first, comets, comets stopped by a
// hit, charged shots, full bars that dropped to two notches, goals. Same context as tools/ai_bench.js.
//
// Run: node tools/tension_bench.js [matches=48]
const fs = require("fs"), path = require("path"), vm = require("vm");
const web = path.join(__dirname, "..", "web"), N = +(process.argv[2] || 48);
const sheets = JSON.parse(fs.readFileSync(path.join(web, "assets", "sprites", "sheets.json"), "utf8"));
const noop = () => {};
const ctx = { console, Math, Date, JSON, Object, Array, Set, Map, Number, String, Promise, setTimeout, clearTimeout, performance: { now: () => 0 }, navigator: { getGamepads: () => [] }, document: { featurePolicy: null }, localStorage: { getItem: () => null, setItem: noop }, addEventListener: noop };
ctx.window = ctx; vm.createContext(ctx);
for (const f of ["data.js", "input.js"]) vm.runInContext(fs.readFileSync(path.join(web, "js", f), "utf8"), ctx);
ctx.SL.audio = new Proxy({}, { get: () => noop });
ctx.SL.Render = { meta: (n) => (sheets[n] || null), has: (n) => !!sheets[n], resolve: (b, n) => n };
for (const f of ["match.js", "ai.js", "skills.js"]) vm.runInContext(fs.readFileSync(path.join(web, "js", f), "utf8"), ctx);
const SL = ctx.SL;
const PAIRS = [["fulmini", "marea"], ["vulcano", "lupi"], ["corvi", "aurora"], ["ghiaccio", "tempesta"], ["marea", "vulcano"], ["lupi", "corvi"], ["aurora", "ghiaccio"], ["tempesta", "fulmini"], ["fulmini", "vulcano"], ["marea", "corvi"], ["lupi", "ghiaccio"], ["aurora", "tempesta"]];
function side(id) { const c = SL.clubById(id); return { club: c, squad: SL.clubSquad(c), kit: c.kit, kit2: null, pattern: 0, formation: c.formation || "rombo" }; }
const t = { gain: 0, fills: 0, first: [], specials: 0, two: 0, charged: 0, cancelled: 0, goals: 0, drop: 0 };
for (let i = 0; i < N; i++) {
  const [a, b] = PAIRS[i % 12];
  const s = Object.assign(SL.defaultSettings(), { minutes: 4, difficulty: 1, goldenGoal: false, aiHits: true, opponentAi: 0 });
  const m = new SL.Match({ home: side(a), away: side(b), humans: [], settings: s, seed: 1000 + i });
  const orig = m.addMana.bind(m);
  m.addMana = function (tm, w) { const before = m.mana[tm]; const r = orig(tm, w); t.gain += Math.max(0, m.mana[tm] - before); return r; };
  const was = [false, false], first = [null, null];
  let g = 0;
  while (!m.over && g++ < 4 * 3600 * 3) {
    m.events.length = 0; m.step();
    for (let k = 0; k < 2; k++) { const full = m.mana[k] >= 100; if (full && !was[k]) { t.fills++; if (first[k] === null) { first[k] = m.clock; t.first.push(m.clock); } } was[k] = full; }
    for (const e of m.events) {
      if (e.type === "special") t.specials++;
      if (e.type === "specialResult" && e.hits === 2) t.two++;
      if (e.type === "shot" && e.charged) t.charged++;
      if (e.type === "specialStopped") t.cancelled++;
      if (e.type === "tensionDrop") t.drop++;
      if (e.type === "goal") t.goals++;
    }
  }
}
const f = (v, d = 2) => v.toFixed(d).replace(".", ",");
console.log(`${N} partite: punti a squadra ${f(t.gain / (2 * N), 1)} · barre piene a squadra ${f(t.fills / (2 * N))} · prima piena al minuto ${f(t.first.reduce((x, y) => x + y, 0) / Math.max(1, t.first.length) / 60)} (${f(100 * t.first.length / (2 * N), 0)}% delle squadre) · mosse speciali ${f(t.specials / N)} a partita, 2 su 2 ${f(t.two / N)}, fermate ${f(t.cancelled / N)} · tiri caricati ${f(t.charged / N)} · barre scese a 2 tacche ${f(t.drop / N)} · gol ${f(t.goals / N)}`);

// The tension bench of the old browser game (removed on 29/10/2026) on packages/sim: the tension bar (docs/DETTAGLI.md, "Tensione") in AI
// matches: points a team gains, how often the bar fills and when first, comets, comets stopped by
// a hit, charged shots, full bars that dropped to two notches, goals.
//
// Run: node packages/sim/bench/tension_bench.ts [matches=48]
import { clubById, clubSquad, defaultSettings, Match, type MatchEvent, type Team } from "../src/index.ts";
import { PAIRS } from "./scenarios.ts";

const N = +(process.argv[2] || 48);
function side(id: string) { const c = clubById(id)!; return { club: c, squad: clubSquad(c), kit: c.kit, kit2: null, pattern: 0, formation: c.formation || "rombo" }; }
const t = { gain: 0, fills: 0, first: [] as number[], specials: 0, two: 0, charged: 0, cancelled: 0, goals: 0, drop: 0 };
for (let i = 0; i < N; i++) {
  const [a, b] = PAIRS[i % 12]!;
  const s = Object.assign(defaultSettings(), { minutes: 4, difficulty: 1, goldenGoal: false, aiHits: true, opponentAi: 0 });
  const m = new Match({ home: side(a), away: side(b), humans: [], settings: s, seed: 1000 + i });
  const orig = m.addMana.bind(m);
  m.addMana = (tm: Team, w: number) => { const before = m.mana[tm]; orig(tm, w); t.gain += Math.max(0, m.mana[tm] - before); };
  const was = [false, false], first: (number | null)[] = [null, null];
  let g = 0;
  while (!m.over && g++ < 4 * 3600 * 3) {
    m.events.length = 0; m.step();
    for (let k = 0; k < 2; k++) { const full = m.mana[k]! >= 100; if (full && !was[k]) { t.fills++; if (first[k] === null) { first[k] = m.clock; t.first.push(m.clock); } } was[k] = full; }
    for (const e of m.events as MatchEvent[]) {
      if (e.type === "special") t.specials++;
      if (e.type === "specialResult" && e.hits === 2) t.two++;
      if (e.type === "shot" && e.charged) t.charged++;
      if (e.type === "specialStopped") t.cancelled++;
      if (e.type === "tensionDrop") t.drop++;
      if (e.type === "goal") t.goals++;
    }
  }
}
const f = (v: number, d = 2) => v.toFixed(d).replace(".", ",");
console.log(`${N} partite: punti a squadra ${f(t.gain / (2 * N), 1)} · barre piene a squadra ${f(t.fills / (2 * N))} · prima piena al minuto ${f(t.first.reduce((x, y) => x + y, 0) / Math.max(1, t.first.length) / 60)} (${f(100 * t.first.length / (2 * N), 0)}% delle squadre) · mosse speciali ${f(t.specials / N)} a partita, 2 su 2 ${f(t.two / N)}, fermate ${f(t.cancelled / N)} · tiri caricati ${f(t.charged / N)} · barre scese a 2 tacche ${f(t.drop / N)} · gol ${f(t.goals / N)}`);

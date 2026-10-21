// tools/ai_bench.js on packages/sim: AI-against-AI matches at 60 Hz, averaged (docs/DETTAGLI.md, "IA"):
//   - the pace measures of web/PROMPT-WEB.md §0: goals, shots, hits, possession changes a minute,
//     the length of a possession (live seconds between two changes) and the time on the ball in it;
//   - passing: completed passes, the share of passes that reach a mate;
//   - shape: distance from each outfield player to the nearest mate, the defending team's length
//     and width, how many mates the carrier has an open lane to, how close the nearest opponent is
//     to the carrier, how often three or more outfield players of one team are within 3 m of the ball.
// Possession belongs to the team of the last player who had the ball at his feet.
//
// The old bench counts the passes through a wrapper that hands Match.pass only its first four
// arguments (tools/ai_bench.js:66), so in its matches the AI's pass goes to the mate the stick's
// direction picks (Match.bestReceiver), not to the one it chose (ai.ts, carrierThink). The same
// wrapper is kept here, so the numbers compare with the old ones; --real-pass hands on every
// argument and measures the game as it is played.
//
// Run: node packages/sim/bench/ai_bench.ts [matches=12] [minutes=4] [difficulty=1] [--json] [--real-pass]
// ROLES=base, SWAP=1, SKILLS=2,0 as in the old bench.
import { C, clubById, clubSquad, defaultSettings, FORMATIONS, Match, rolesFor, type Club, type FormationId, type MatchEvent, type Player, type Team } from "../src/index.ts";
import { PAIRS } from "./scenarios.ts";

const args = process.argv.slice(2);
const take = (k: string) => { const i = args.indexOf(k); if (i >= 0) args.splice(i, 1); return i >= 0; };
const asJson = take("--json"), realPass = take("--real-pass");
const MATCHES = +(args[0] || 12), MINUTES = +(args[1] || 4), DIFF = +(args[2] || 1);

const len = (x: number, z: number) => Math.hypot(x, z);
// ROLES=base gives every player his place's first role, the one without offsets (ai.ts, ROLES):
// the AI as it played before the roles; without it each player takes his card's familiar role.
function side(id: string, kit?: string) {
  const c = clubById(id)!, formation = c.formation || "rombo";
  const roles = process.env.ROLES === "base" ? FORMATIONS[formation as FormationId].places.map((pos) => rolesFor(pos)[0]!) : null;
  return { club: c, squad: clubSquad(c), kit: kit || c.kit, kit2: null, pattern: 0, formation, roles };
}

interface Tally {
  cause: Record<string, number>; shotOut: Record<string, number>;
  goals: number; shots: number; hits: number; keeperHits: number; skills: number; tackles: number; passes: number; passTries: number; changes: number;
  spells: number[]; carry: number[]; nearMate: number[]; length: number[]; width: number[]; options: number[]; pressure: number[];
  crowd: number; samples: number; live: number; score: number[];
}
const shotD: number[] = [];
function play(i: number): Tally {
  // SWAP=1 plays every pair with the sides exchanged: a difference that stays with the side, not
  // with the club, is in the code
  const [a, b] = process.env.SWAP ? PAIRS[i % PAIRS.length]!.slice().reverse() as [string, string] : PAIRS[i % PAIRS.length]!;
  const settings = Object.assign(defaultSettings(), { minutes: MINUTES, difficulty: DIFF, goldenGoal: false, aiHits: true, opponentAi: 0 });
  const m = new Match({ home: side(a), away: side(b, (clubById(b) as Club).alt), humans: [], settings, seed: 1000 + i });
  // SKILLS=2,0: the home side plays at difficulty 2, the away side at 0 (ai.ts, skillOverride)
  if (process.env.SKILLS) m.skillOverride = process.env.SKILLS.split(",").map(Number) as [number, number];
  const st: Tally = { cause: {}, shotOut: {}, goals: 0, shots: 0, hits: 0, keeperHits: 0, skills: 0, tackles: 0, passes: 0, passTries: 0, changes: 0, spells: [], carry: [], nearMate: [], length: [], width: [], options: [], pressure: [], crowd: 0, samples: 0, live: 0, score: [] };
  let owner = -1, spellStart = 0, carryT = 0, sampleT = 0, prevLoose: string | null = null, pending: string | null = null;
  const origPass = m.pass.bind(m);
  m.pass = realPass ? (...a) => { st.passTries++; return origPass(...a); } : (p, dx, dz, lob) => { st.passTries++; return origPass(p, dx, dz, lob); };
  const origKick = m.kick.bind(m);
  m.kick = (p, vx, vy, vz, kind) => { if (kind === "roll") st.passTries++; return origKick(p, vx, vy, vz, kind); };
  let guard = 0;
  while (!m.over && guard++ < MINUTES * 60 * 60 * 3) {
    m.events.length = 0;
    m.step();
    const events = m.events as MatchEvent[];
    const evs = events.map((e) => e.type + (e.type === "hit" && !e.took ? "-" : ""));
    for (const e of events) {
      if ((e.type === "hit" && e.on.isKeeper) || (e.type === "tackle" && e.on && e.on.isKeeper)) st.keeperHits++;
      if (e.type === "skill") st.skills++;
      if (e.type === "goal") st.goals++;
      else if (e.type === "shot") { st.shots++; if (pending) st.shotOut[pending] = (st.shotOut[pending] || 0) + 1; pending = "altro"; shotD.push(Math.abs(C.length / 2 - e.by.x * (e.by.team === 0 ? 1 : -1))); }
      if (pending && (e.type === "goal" || e.type === "save")) { st.shotOut[e.type === "goal" ? "gol" : "parata"] = (st.shotOut[e.type === "goal" ? "gol" : "parata"] || 0) + 1; pending = null; }
      else if (e.type === "hit") st.hits++;
      else if (e.type === "tackle") st.tackles++;
      else if (e.type === "pass") st.passes++;
    }
    const car = m.ball.carrier as Player | null;
    // a shot that is neither scored nor saved before someone else has the ball: blocked or wide
    if (pending && car) { const k = car.isKeeper ? "presa dal portiere" : "respinto o perso"; st.shotOut[k] = (st.shotOut[k] || 0) + 1; pending = null; }
    if (m.phase !== "live") continue;
    st.live += 1 / 60;
    if (!car && m.ball.shotBy) prevLoose = "tiro respinto o fuori";
    else if (!car && m.ball.passFrom && !prevLoose) prevLoose = "passaggio perso";
    if (car && car.team === owner) prevLoose = null;
    if (car) {
      carryT += 1 / 60;
      if (car.team !== owner) {
        if (owner >= 0) {
          st.changes++; st.spells.push(m.clock - spellStart); st.carry.push(carryT);
          // why it changed: what happened in this step, else since the last carrier the ball was loose
          const why = evs.includes("intercept") ? "intercetto" : evs.includes("hit") ? "spallata" : evs.includes("tackle") ? "scivolata" : evs.includes("claim") ? "presa del portiere" : car.isKeeper ? "portiere (tiro o palla vagante)" : prevLoose || "palla vagante";
          st.cause[why] = (st.cause[why] || 0) + 1;
        }
        owner = car.team; spellStart = m.clock; carryT = 0;
      }
    }
    sampleT += 1 / 60;
    if (sampleT >= 0.5) {
      sampleT = 0; st.samples++;
      for (let t = 0; t < 2; t++) {
        const out = m.players.filter((p) => p.team === t && !p.isKeeper);
        for (const p of out) st.nearMate.push(Math.min(...out.filter((q) => q !== p).map((q) => len(q.x - p.x, q.z - p.z))));
        if (owner >= 0 && t !== owner) {
          const xs = out.map((p) => p.x), zs = out.map((p) => p.z);
          st.length.push(Math.max(...xs) - Math.min(...xs)); st.width.push(Math.max(...zs) - Math.min(...zs));
        }
        if (out.filter((p) => len(p.x - m.ball.x, p.z - m.ball.z) < 3).length >= 3) st.crowd++;
      }
      if (car && !car.isKeeper) {
        let open = 0;
        for (const q of m.players) if (q.team === car.team && q !== car && !q.isKeeper) { const d = len(q.x - car.x, q.z - car.z); if (d > 2.5 && d < 13 && m.laneOpen(car.x, car.z, q.x, q.z, car.team) > 0.6) open++; }
        st.options.push(open);
        st.pressure.push(Math.min(...m.players.filter((o) => o.team !== (car.team as Team) && !o.isKeeper).map((o) => len(o.x - car.x, o.z - car.z))));
      }
    }
  }
  st.score = m.score.slice();
  return st;
}

const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const all: Tally[] = [];
for (let i = 0; i < MATCHES; i++) all.push(play(i));
const mins = all.map((s) => s.live / 60);
const res = {
  matches: MATCHES, minutes: MINUTES, difficulty: DIFF,
  home_goals: avg(all.map((s) => s.score[0]!)), away_goals: avg(all.map((s) => s.score[1]!)),
  home_wins: all.filter((s) => s.score[0]! > s.score[1]!).length, away_wins: all.filter((s) => s.score[0]! < s.score[1]!).length,
  goals: avg(all.map((s) => s.goals)), goals_in_4_8: all.filter((s) => s.goals >= 4 && s.goals <= 8).length,
  shots: avg(all.map((s) => s.shots)), hits: avg(all.map((s) => s.hits)), keeper_hits: avg(all.map((s) => s.keeperHits)), skills: avg(all.map((s) => s.skills)), tackles: avg(all.map((s) => s.tackles)),
  changes_per_min: avg(all.map((s, i) => s.changes / mins[i]!)), possession_s: avg(all.flatMap((s) => s.spells)), on_ball_s: avg(all.flatMap((s) => s.carry)),
  passes: avg(all.map((s) => s.passes)), pass_share: avg(all.map((s) => s.passes / Math.max(1, s.passTries))),
  nearest_mate_m: avg(all.flatMap((s) => s.nearMate)), def_length_m: avg(all.flatMap((s) => s.length)), def_width_m: avg(all.flatMap((s) => s.width)),
  shot_outcomes: Object.fromEntries([...new Set(all.flatMap((s) => Object.keys(s.shotOut)))].map((k) => [k, avg(all.map((s) => s.shotOut[k] || 0))])),
  shot_distance_m: avg(shotD),
  causes: Object.fromEntries([...new Set(all.flatMap((s) => Object.keys(s.cause)))].map((k) => [k, avg(all.map((s) => (s.cause[k] || 0) / (s.live / 60)))])),
  open_options: avg(all.flatMap((s) => s.options)), pressure_m: avg(all.flatMap((s) => s.pressure)), crowding_share: avg(all.map((s) => s.crowd / Math.max(1, s.samples * 2))),
};
if (asJson) console.log(JSON.stringify(res));
else {
  const f = (v: number, d?: number) => v.toFixed(d === undefined ? 2 : d).replace(".", ",");
  console.log(`${MATCHES} partite fra IA da ${MINUTES} minuti, difficoltà ${DIFF}${realPass ? ", passaggi al compagno scelto dall'IA" : ""}`);
  console.log(`gol a partita ${f(res.goals)} (${res.goals_in_4_8} fra 4 e 8) · tiri ${f(res.shots, 1)} · spallate ${f(res.hits, 1)} (al portiere ${f(res.keeper_hits, 1)}) · scivolate ${f(res.tackles, 1)} · skill ${f(res.skills, 1)}`);
  console.log(`casa ${f(res.home_goals)} gol, ospiti ${f(res.away_goals)} · vittorie casa ${res.home_wins}, ospiti ${res.away_wins}${process.env.SKILLS ? " (difficoltà " + process.env.SKILLS + ")" : ""}`);
  console.log(`cambi di possesso al minuto ${f(res.changes_per_min, 1)} · possesso ${f(res.possession_s)} s · palla al piede ${f(res.on_ball_s)} s`);
  console.log(`passaggi riusciti ${f(res.passes, 1)} · quota riusciti ${f(res.pass_share * 100, 0)}%`);
  console.log(`compagno più vicino ${f(res.nearest_mate_m)} m · squadra che difende: lunga ${f(res.def_length_m)} m, larga ${f(res.def_width_m)} m`);
  console.log(`tiri a partita per esito: ` + Object.entries(res.shot_outcomes).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${f(v, 1)}`).join(" · ") + ` · distanza media ${f(res.shot_distance_m, 1)} m`);
  console.log("cause dei cambi, al minuto: " + Object.entries(res.causes).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${f(v, 1)}`).join(" · "));
  console.log(`linee di passaggio aperte per chi ha palla ${f(res.open_options)} · avversario più vicino a chi ha palla ${f(res.pressure_m)} m · 3+ giocatori a 3 m dalla palla ${f(res.crowding_share * 100, 1)}%`);
}

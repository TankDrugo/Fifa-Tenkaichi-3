// The checks of the old browser game (tools/web_checks.js, removed on 29/10/2026) on packages/sim: the situations of a person with a pad, played without a
// browser, each with the number it must give (docs/DETTAGLI.md). Same situations, same seeds,
// same printed lines, so the two outputs can be compared with diff. A person's pad is replaced
// by a script of commands, one object per 1/60 s (Match.input).
//
// Run: node packages/sim/bench/checks.ts            (exit 1 if a check fails)
import {
  AI_ROLES, clubById, clubSquad, defaultSettings, FORMATIONS, Match, NONE, rng, rolesFor, SKILLS,
  type Command, type MatchEvent, type Player, type Settings, type SkillId,
} from "./api.ts";

const len = (x: number, z: number) => Math.hypot(x, z);

// A match with one person on team 0; m.input gives that person's command.
function setup(extra?: Partial<Settings> & { seed?: number }): Match {
  const { seed = 7, ...rest } = extra || {};
  const side = (id: string) => { const c = clubById(id)!; return { club: c, squad: clubSquad(c), kit: c.kit, kit2: null, pattern: 0, formation: "rombo" }; };
  const settings = Object.assign(defaultSettings(), { minutes: 4, difficulty: 1, goldenGoal: false, aiHits: true, opponentAi: 0 }, rest);
  const m = new Match({ home: side("fulmini"), away: side("marea"), humans: [{ team: 0, device: {} }], settings, seed: seed || 7 });
  m.phase = "live";
  return m;
}
const cmd = (c: Partial<Command>): Command => Object.assign({}, NONE, c);
function run(m: Match, frames: number, script?: (f: number) => Partial<Command>): void {
  for (let f = 0; f < frames; f++) {
    const c = cmd(script ? script(f) : {});
    m.input = () => c;
    m.events.length = 0;
    m.step();
  }
}
// Everyone but the listed players stands still (ai.ts skips a still player).
function freeze(m: Match, keep: Player[]): void { for (const p of m.players) p.still = !keep.includes(p); }
// who has the ball now: read through a call, since the checks set it to null before stepping
const holder = (m: Match): Player | null => m.ball.carrier;

const results: { name: string; value: number; ok: boolean; unit: string }[] = [];
function check(name: string, value: number, ok: boolean, unit?: string): void { results.push({ name, value, ok, unit: unit || "" }); }

// ---- 2. The keeper is never hit ------------------------------------------------------
{
  const m = setup(), h = m.humans[0]!.player!, gk = m.players[5]!;
  freeze(m, [h, gk]); gk.still = true;
  gk.x = 13.2; gk.z = 0; m.ball.carrier = null; m.take(gk); gk.shield = 0;
  h.x = 12.2; h.z = 0.2; h.fx = 1; h.fz = 0;
  run(m, 40, (f) => ({ shoot: f === 1 }));
  check("spallata sul portiere che ha palla: il portiere tiene la palla", holder(m) === gk ? 1 : 0, holder(m) === gk && gk.react === 0);
  // the same lunge on an outfield carrier takes the ball: the check can see a hit
  const m2 = setup(), h2 = m2.humans[0]!.player!, c2 = m2.players[6]!;
  freeze(m2, [h2]);
  c2.x = 5; c2.z = 0; m2.ball.carrier = null; m2.take(c2); c2.shield = 0;
  h2.x = 4; h2.z = 0.2;
  run(m2, 40, (f) => ({ shoot: f === 1 }));
  check("controprova: la stessa spallata su un giocatore di movimento gli toglie la palla", holder(m2) !== c2 ? 1 : 0, holder(m2) !== c2);
}

// ---- 3. A pass reaches the mate it was aimed at ----------------------------------------
// The person aims at a mate with the stick, presses pass and keeps the stick where it was for
// 2,5 s, as a hand does. Counted: the pass ends at the feet of the mate the game chose, at another
// mate's, at an opponent's, or nobody's. holdFrames: how long the pass button stays down.
interface PassOpts { frozen: boolean; holdFrames?: number; settings: Partial<Settings> }
function passTrials(n: number, opts: PassOpts) {
  const out = { aimed: 0, mate: 0, opp: 0, none: 0 };
  for (let k = 0; k < n; k++) {
    const r = rng(500 + k), m = setup(Object.assign({ seed: 500 + k }, opts.settings || {})), h = m.humans[0]!.player!;
    const mates = m.players.filter((q) => q.team === 0 && !q.isKeeper && q !== h);
    h.x = -10 + r() * 16; h.z = -6 + r() * 12;
    for (const q of mates) {
      for (let t = 0; t < 50; t++) {
        const a = r() * 6.283, d = 4 + r() * 6;
        q.x = Math.max(-13, Math.min(13, h.x + Math.cos(a) * d)); q.z = Math.max(-7.5, Math.min(7.5, h.z + Math.sin(a) * d));
        if (len(q.x - h.x, q.z - h.z) > 3.5 && mates.every((o) => o === q || len(o.x - q.x, o.z - q.z) > 2.5)) break;
      }
      q.vx = q.vz = 0;
    }
    if (opts.frozen) freeze(m, [h, ...mates]); else for (const q of mates) q.still = true;
    m.ball.carrier = null; m.take(h); h.shield = 0;
    const target = mates[Math.floor(r() * mates.length)]!;
    const d = len(target.x - h.x, target.z - h.z), ax = (target.x - h.x) / d, az = (target.z - h.z) / d;
    const hold = opts.holdFrames || 1;
    let aimed: Player | null = null, result: keyof typeof out = "none";
    for (let f = 0; f < 150 + hold && result === "none"; f++) {
      const c = cmd({ x: ax, z: az, pass: f >= 2 && f < 2 + hold });
      m.input = () => c;
      m.events.length = 0;
      m.step();
      if (!aimed && m.ball.passTo) aimed = m.ball.passTo;
      for (const e of m.events as MatchEvent[]) {
        if (e.type === "pass") result = e.to === aimed ? "aimed" : "mate";
        if (e.type === "intercept") result = "opp";
      }
      const c2 = holder(m);
      if (c2 && c2.team === 1 && result === "none") result = "opp";
    }
    out[result]++;
  }
  for (const k in out) out[k as keyof typeof out] /= n;
  return out;
}
const pct = (v: number) => Math.round(v * 100) + "%";
for (const [label, opts, need] of [
  ["Assistito, avversari fermi", { frozen: true, settings: { passAssist: "assisted" } }, 0.9],
  ["Assistito, avversari dell'IA, difficoltà normale", { frozen: false, settings: { passAssist: "assisted" } }, 0.6],
  ["Semi con un tocco, avversari fermi", { frozen: true, settings: { passAssist: "semi" } }, 0.9],
  ["Semi con un tocco, avversari dell'IA", { frozen: false, settings: { passAssist: "semi" } }, 0.6],
  ["Semi tenuto 0,25 s, avversari dell'IA", { frozen: false, holdFrames: 15, settings: { passAssist: "semi" } }, 0.6],
  ["Manuale tenuto 0,25 s, avversari fermi", { frozen: true, holdFrames: 15, settings: { passAssist: "manual" } }, 0],
] as [string, PassOpts, number][]) {
  const r = passTrials(200, opts);
  check(`passaggio con la levetta tenuta, ${label}: arriva al compagno scelto (altro compagno ${pct(r.mate)}, avversario ${pct(r.opp)}, nessuno ${pct(r.none)})`, r.aimed * 100, r.aimed >= need, "%");
}

// ---- 5. Skill moves -------------------------------------------------------------------
// Every gesture of the right stick starts its move: a five-star carrier facing +x, the stick
// swept through the quadrants frame by frame (F = +x, R = +z, B = -x, L = -z), then let go.
{
  const DIRS: Record<string, [number, number]> = { F: [1, 0], R: [0, 1], B: [-1, 0], L: [0, -1] };
  const cases = [["F", "tunnel"], ["L", "feint"], ["R", "feint"], ["FR", "stepover"], ["BL", "heelchop"], ["FRBL", "roulette"], ["RBL", "elastico"], ["B|F", "sombrero"], ["B", "dragback"], ["Rhold", "roll"]];
  let ok = 0; const miss: string[] = [];
  for (const [g, want] of cases as [string, string][]) {
    const m = setup(), h = m.humans[0]!.player!;
    freeze(m, [h]);
    h.card = Object.assign({}, h.card, { ovr: 99, rarity: "leggenda" as const, role: "ALA" as const });
    h.x = -4; h.z = 0; h.fx = 1; h.fz = 0; m.ball.carrier = null; m.take(h);
    const frames: [number, number][] = [];
    const sweep = (s: string) => { for (const c of s) for (let k = 0; k < 3; k++) frames.push(DIRS[c]!); for (let k = 0; k < 3; k++) frames.push([0, 0]); };
    if (g === "Rhold") for (let k = 0; k < 24; k++) frames.push(DIRS.R!);
    else for (const part of g.split("|")) sweep(part);
    let got: string | null = null;
    for (let f = 0; f < frames.length + 40 && !got; f++) {
      const r = frames[f] || [0, 0];
      const c = cmd({ rx: r[0], rz: r[1] });
      m.input = () => c;
      m.events.length = 0; m.step();
      for (const e of m.events as MatchEvent[]) if (e.type === "skill") got = e.id;
    }
    if (got === want) ok++; else miss.push(`${g}→${got}`);
  }
  check(`gesti della levetta destra riconosciuti${miss.length ? " (sbagliati: " + miss.join(", ") + ")" : ""}`, ok, ok === cases.length, ` su ${cases.length}`);
}
// A defender of the AI 2,4-3 m in front of a carrier who runs at him; the move starts when he is
// 1,6 m away, just outside the AI's hit distance (C.hitAiDistance 1,3 m). Counted: who has the ball
// 1,5 s later (200 tries each, difficulty normal). After the move the stick does what a hand does
// with it (FOLLOW: forward past him, around him, on along the cut, or back), with the sprint held;
// the two references are running straight on and running round him without a move.
const FOLLOW: Record<string, string> = { feint: "F", stepover: "F", elastico: "F", roll: "F", tunnel: "around", sombrero: "F", roulette: "around", heelchop: "cut", dragback: "back" };
function skillDuel(id: SkillId | null, n: number, follow?: string): number {
  let kept = 0;
  for (let k = 0; k < n; k++) {
    const r = rng(900 + k), m = setup({ seed: 900 + k }), h = m.humans[0]!.player!, d = m.players[6]!;
    freeze(m, [h, d]);
    h.card = Object.assign({}, h.card, { ovr: 99, rarity: "leggenda" as const, role: "ALA" as const });
    h.x = -2; h.z = -3 + r() * 6; h.fx = 1; h.fz = 0; h.vx = 3; m.ball.carrier = null; m.take(h); h.shield = 0;
    d.x = h.x + 2.4 + r() * 0.6; d.z = h.z + (r() - 0.5) * 0.6; d.hitCool = 0; m.teamHitAt = [-99, -99];
    const side = r() < 0.5 ? -1 : 1, how = follow || (id && FOLLOW[id]) || "F";
    let at = -1;
    for (let f = 0; f < 150 && (at < 0 || f < at + 90); f++) {
      if (at < 0 && len(d.x - h.x, d.z - h.z) <= 1.6) { at = f; if (id) m.trySkill(h, id, side); }
      let st = [1, 0];
      if (at >= 0 && f < at + 36) st = how === "around" ? [0.7, side * 0.7] : how === "cut" ? [0, side] : how === "back" ? [-1, side * 0.3] : [1, 0];
      // past the defender a hand sprints away
      const c = cmd({ x: st[0], z: st[1], sprint: at >= 0 });
      m.input = () => c;
      m.events.length = 0; m.step();
    }
    if (holder(m) === h || (!holder(m) && m.ball.last === h)) kept++;
  }
  return kept / n;
}
{
  const straight = skillDuel(null, 200, "F"), around = skillDuel(null, 200, "around");
  const rows = (Object.keys(SKILLS) as SkillId[]).map((id) => [id, skillDuel(id, 200)] as const);
  check(`un difensore dell'IA davanti, skill a 1,6 m, palla ancora tua dopo 1,5 s: dritto ${pct(straight)}, girandogli attorno ${pct(around)}; con la skill ` + rows.map(([id, v]) => `${SKILLS[id]!.name} ${pct(v)}`).join(", "), rows.filter(([, v]) => v > around).length, rows.every(([, v]) => v > around), ` skill su ${rows.length} sopra il giro attorno`);
}

// ---- 7. Player roles -----------------------------------------------------------------
// The home side plays rombo with every player in his place's first role, except one place that
// takes the role under test (familiarity +). Over 12 AI matches, for that player: how far up he
// stands with his team on the ball and with the other team attacking in his half (metres from his
// own goal), how far from the middle with the ball, his shots, passes and hits a match; for a
// keeper, how far off his line. Printed for every role, checked where the role says which way it moves.
function roleRun(roleId: string, n: number) {
  const R = AI_ROLES[roleId]!, places = FORMATIONS.rombo!.places, slot = places.indexOf(R.pos);
  const acc = { xa: 0, na: 0, xd: 0, nd: 0, za: 0, shots: 0, passes: 0, hits: 0, gk: 0, ngk: 0 };
  for (let k = 0; k < n; k++) {
    const pair = [["fulmini", "marea"], ["vulcano", "lupi"], ["corvi", "aurora"], ["ghiaccio", "tempesta"]][k % 4]!;
    const side = (id: string, own: boolean) => { const c = clubById(id)!; const roles = places.map((pos) => rolesFor(pos)[0]!); if (own) roles[slot] = roleId; return { club: c, squad: clubSquad(c), kit: c.kit, kit2: null, pattern: 0, formation: "rombo", roles }; };
    const settings = Object.assign(defaultSettings(), { minutes: 4, difficulty: 1, goldenGoal: false, aiHits: true, opponentAi: 0 });
    const m = new Match({ home: side(pair[0]!, true), away: side(pair[1]!, false), humans: [], settings, seed: 3000 + k });
    const p = m.players[slot]!; p.fam = 1; p.roleCache = null;
    let g = 0;
    while (!m.over && g++ < 4 * 3600 * 3) {
      m.events.length = 0; m.step();
      for (const e of m.events as MatchEvent[]) { if (e.type === "shot" && e.by === p) acc.shots++; if (e.type === "pass" && e.from === p) acc.passes++; if (e.type === "hit" && e.by === p) acc.hits++; }
      if (m.phase !== "live" || g % 6) continue;
      const own = m.ball.carrier ? m.ball.carrier.team === 0 : null, fromGoal = p.x + 14;
      if (p.isKeeper) { acc.gk += fromGoal; acc.ngk++; }
      else if (own === true) { acc.xa += fromGoal; acc.na++; acc.za += Math.abs(p.z); }
      else if (own === false && m.ball.x < 0) { acc.xd += fromGoal; acc.nd++; }
    }
  }
  return { xa: acc.xa / Math.max(1, acc.na), xd: acc.xd / Math.max(1, acc.nd), za: acc.za / Math.max(1, acc.na), shots: acc.shots / n, passes: acc.passes / n, hits: acc.hits / n, gk: acc.gk / Math.max(1, acc.ngk) };
}
{
  const f1 = (v: number) => String(+v.toFixed(1)).replace(".", ",");
  const res: Record<string, ReturnType<typeof roleRun>> = {};
  for (const id of Object.keys(AI_ROLES)) res[id] = roleRun(id, 12);
  for (const id of Object.keys(AI_ROLES)) {
    const r = res[id]!, R = AI_ROLES[id]!;
    console.log(`     ${R.pos} ${R.name.padEnd(20)} ` + (R.pos === "POR" ? `dalla linea di porta ${f1(r.gk)} m` : `dalla sua porta col pallone ${f1(r.xa)} m, quando difende ${f1(r.xd)} m · dal centro ${f1(r.za)} m · tiri ${f1(r.shots)}, passaggi ${f1(r.passes)}, spallate ${f1(r.hits)} a partita`));
  }
  const $ = (id: string) => res[id]!;
  const expect: [string, boolean][] = [
    ["la torre resta più alta senza palla dell'attaccante avanzato", $("torre").xd > $("avanzato").xd + 1],
    ["la torre sta più al centro dell'attaccante avanzato", $("torre").za < $("avanzato").za],
    ["il falso nueve sta più basso col pallone dell'attaccante avanzato", $("falso9").xa < $("avanzato").xa - 1],
    ["il rapinatore tira più dell'attaccante avanzato", $("rapinatore").shots > $("avanzato").shots],
    ["il mediano sta più basso col pallone del box to box", $("mediano").xa < $("boxtobox").xa - 1],
    ["l'ala interna sta più al centro dell'ala", $("alainterna").za < $("ala").za],
    ["lo stopper dà più spallate del difensore", $("stopper").hits > $("difensore").hits],
    ["il difensore regista sale più del difensore", $("impostatore").xa > $("difensore").xa],
    ["il portiere libero sta più fuori dai pali del portiere", $("libero").gk > $("portiere").gk],
  ];
  const bad = expect.filter((e) => !e[1]).map((e) => e[0]);
  check(`ruoli: ${expect.length - bad.length} su ${expect.length} si muovono come dicono${bad.length ? " (no: " + bad.join("; ") + ")" : ""}`, expect.length - bad.length, !bad.length, ` su ${expect.length}`);
}

let failed = 0;
for (const r of results) { if (!r.ok) failed++; console.log(`${r.ok ? "ok  " : "NO  "} ${r.name}: ${String(+r.value.toFixed(2)).replace(".", ",")}${r.unit}`); }
process.exit(failed ? 1 : 0);

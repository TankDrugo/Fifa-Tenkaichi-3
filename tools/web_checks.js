// Strike Legends - situations of the browser game played without a browser, each with the
// number it must give (docs/DETTAGLI.md). Same Node context as tools/ai_bench.js; a person's pad is
// replaced by a script of inputs, one object per 1/60 s.
//
// Run: node tools/web_checks.js            (exit 1 if a check fails)
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");

const web = path.join(__dirname, "..", "web");
const sheets = JSON.parse(fs.readFileSync(path.join(web, "assets", "sprites", "sheets.json"), "utf8"));
const noop = () => {};
const ctx = {
  console, Math, Date, JSON, Object, Array, Set, Map, Number, String, Promise, setTimeout, clearTimeout,
  performance: { now: () => 0 }, navigator: { getGamepads: () => [] }, document: { featurePolicy: null },
  localStorage: { getItem: () => null, setItem: noop }, addEventListener: noop,
};
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ["data.js", "input.js"]) vm.runInContext(fs.readFileSync(path.join(web, "js", f), "utf8"), ctx, { filename: f });
ctx.SL.audio = new Proxy({}, { get: () => noop });
ctx.SL.Render = { meta: (n) => (sheets[n] || null), has: (n) => !!sheets[n], resolve: (b, n) => n };
for (const f of ["match.js", "ai.js", "skills.js"]) vm.runInContext(fs.readFileSync(path.join(web, "js", f), "utf8"), ctx, { filename: f });
const SL = ctx.SL;
const len = (x, z) => Math.hypot(x, z);

// A match with one person on team 0; script(frame) gives that person's input.
function setup(extra) {
  extra = Object.assign({}, extra); const seed = extra.seed || 7; delete extra.seed;
  const side = (id) => { const c = SL.clubById(id); return { club: c, squad: SL.clubSquad(c), kit: c.kit, kit2: null, pattern: 0, formation: "rombo" }; };
  const settings = Object.assign(SL.defaultSettings(), { minutes: 4, difficulty: 1, goldenGoal: false, aiHits: true, opponentAi: 0 }, extra || {});
  const m = new SL.Match({ home: side("fulmini"), away: side("marea"), humans: [{ team: 0, device: {} }], settings, seed });
  m.phase = "live";
  return m;
}
const NONE = { x: 0, z: 0, sprint: false, pass: false, shoot: false, feint: false, switch: false, mod: false, special: false };
function run(m, frames, script) {
  for (let f = 0; f < frames; f++) {
    SL.input.read = () => Object.assign({}, NONE, script ? script(f) : {});
    m.events.length = 0;
    m.step();
  }
}
// Everyone but the listed players stands still (ai.js skips a still player).
function freeze(m, keep) { for (const p of m.players) p.still = !keep.includes(p); }

const results = [];
function check(name, value, ok, unit) { results.push({ name, value, ok, unit: unit || "" }); }

// ---- 2. The keeper is never hit ------------------------------------------------------
{
  const m = setup(), h = m.humans[0].player, gk = m.players[5];
  freeze(m, [h, gk]); gk.still = true;
  gk.x = 13.2; gk.z = 0; m.ball.carrier = null; m.take(gk); gk.shield = 0;
  h.x = 12.2; h.z = 0.2; h.fx = 1; h.fz = 0;
  run(m, 40, (f) => ({ shoot: f === 1 }));
  check("spallata sul portiere che ha palla: il portiere tiene la palla", m.ball.carrier === gk ? 1 : 0, m.ball.carrier === gk && gk.react === 0);
  // the same lunge on an outfield carrier takes the ball: the check can see a hit
  const m2 = setup(), h2 = m2.humans[0].player, c2 = m2.players[6];
  freeze(m2, [h2]);
  c2.x = 5; c2.z = 0; m2.ball.carrier = null; m2.take(c2); c2.shield = 0;
  h2.x = 4; h2.z = 0.2;
  run(m2, 40, (f) => ({ shoot: f === 1 }));
  check("controprova: la stessa spallata su un giocatore di movimento gli toglie la palla", m2.ball.carrier !== c2 ? 1 : 0, m2.ball.carrier !== c2);
}

// ---- 3. A pass reaches the mate it was aimed at ----------------------------------------
// The person aims at a mate with the stick, presses pass and keeps the stick where it was for
// 2,5 s, as a hand does. Counted: the pass ends at the feet of the mate the game chose, at another
// mate's, at an opponent's, or nobody's. holdFrames: how long the pass button stays down.
function passTrials(n, opts) {
  const out = { aimed: 0, mate: 0, opp: 0, none: 0 };
  for (let k = 0; k < n; k++) {
    const r = SL.rng(500 + k), m = setup(Object.assign({ seed: 500 + k }, opts.settings || {})), h = m.humans[0].player;
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
    const target = mates[Math.floor(r() * mates.length)];
    const d = len(target.x - h.x, target.z - h.z), ax = (target.x - h.x) / d, az = (target.z - h.z) / d;
    const hold = opts.holdFrames || 1;
    let aimed = null, result = "none";
    for (let f = 0; f < 150 + hold && result === "none"; f++) {
      SL.input.read = () => Object.assign({}, NONE, { x: ax, z: az, pass: f >= 2 && f < 2 + hold });
      m.events.length = 0;
      m.step();
      if (!aimed && m.ball.passTo) aimed = m.ball.passTo;
      for (const e of m.events) {
        if (e.type === "pass") result = e.to === aimed ? "aimed" : "mate";
        if (e.type === "intercept") result = "opp";
      }
      if (m.ball.carrier && m.ball.carrier.team === 1 && result === "none") result = "opp";
    }
    out[result]++;
  }
  for (const k in out) out[k] /= n;
  return out;
}
const pct = (v) => Math.round(v * 100) + "%";
for (const [label, opts, need] of [
  ["Assistito, avversari fermi", { frozen: true, settings: { passAssist: "assisted" } }, 0.9],
  ["Assistito, avversari dell'IA, difficoltà normale", { frozen: false, settings: { passAssist: "assisted" } }, 0.6],
  ["Semi con un tocco, avversari fermi", { frozen: true, settings: { passAssist: "semi" } }, 0.9],
  ["Semi con un tocco, avversari dell'IA", { frozen: false, settings: { passAssist: "semi" } }, 0.6],
  ["Semi tenuto 0,25 s, avversari dell'IA", { frozen: false, holdFrames: 15, settings: { passAssist: "semi" } }, 0.6],
  ["Manuale tenuto 0,25 s, avversari fermi", { frozen: true, holdFrames: 15, settings: { passAssist: "manual" } }, 0],
]) {
  const r = passTrials(200, opts);
  check(`passaggio con la levetta tenuta, ${label}: arriva al compagno scelto (altro compagno ${pct(r.mate)}, avversario ${pct(r.opp)}, nessuno ${pct(r.none)})`, r.aimed * 100, r.aimed >= need, "%");
}

// ---- 5. Skill moves -------------------------------------------------------------------
// Every gesture of the right stick starts its move: a five-star carrier facing +x, the stick
// swept through the quadrants frame by frame (F = +x, R = +z, B = -x, L = -z), then let go.
{
  const DIRS = { F: [1, 0], R: [0, 1], B: [-1, 0], L: [0, -1] };
  const cases = [["F", "tunnel"], ["L", "feint"], ["R", "feint"], ["FR", "stepover"], ["BL", "heelchop"], ["FRBL", "roulette"], ["RBL", "elastico"], ["B|F", "sombrero"], ["B", "dragback"], ["Rhold", "roll"]];
  let ok = 0; const miss = [];
  for (const [g, want] of cases) {
    const m = setup(), h = m.humans[0].player;
    freeze(m, [h]);
    h.card = Object.assign({}, h.card, { ovr: 99, rarity: "leggenda", role: "ALA" });
    h.x = -4; h.z = 0; h.fx = 1; h.fz = 0; m.ball.carrier = null; m.take(h);
    const frames = [];
    const sweep = (s) => { for (const c of s) for (let k = 0; k < 3; k++) frames.push(DIRS[c]); for (let k = 0; k < 3; k++) frames.push([0, 0]); };
    if (g === "Rhold") for (let k = 0; k < 24; k++) frames.push(DIRS.R);
    else for (const part of g.split("|")) sweep(part);
    let got = null;
    for (let f = 0; f < frames.length + 40 && !got; f++) {
      const r = frames[f] || [0, 0];
      SL.input.read = () => Object.assign({}, NONE, { rx: r[0], rz: r[1] });
      m.events.length = 0; m.step();
      for (const e of m.events) if (e.type === "skill") got = e.id;
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
const FOLLOW = { feint: "F", stepover: "F", elastico: "F", roll: "F", tunnel: "around", sombrero: "F", roulette: "around", heelchop: "cut", dragback: "back" };
function skillDuel(id, n, follow) {
  let kept = 0;
  for (let k = 0; k < n; k++) {
    const r = SL.rng(900 + k), m = setup({ seed: 900 + k }), h = m.humans[0].player, d = m.players[6];
    freeze(m, [h, d]);
    h.card = Object.assign({}, h.card, { ovr: 99, rarity: "leggenda", role: "ALA" });
    h.x = -2; h.z = -3 + r() * 6; h.fx = 1; h.fz = 0; h.vx = 3; m.ball.carrier = null; m.take(h); h.shield = 0;
    d.x = h.x + 2.4 + r() * 0.6; d.z = h.z + (r() - 0.5) * 0.6; d.hitCool = 0; m.teamHitAt = [-99, -99];
    const side = r() < 0.5 ? -1 : 1, how = follow || FOLLOW[id] || "F";
    let at = -1;
    for (let f = 0; f < 150 && (at < 0 || f < at + 90); f++) {
      if (at < 0 && len(d.x - h.x, d.z - h.z) <= 1.6) { at = f; if (id) m.trySkill(h, id, side); }
      let st = [1, 0];
      if (at >= 0 && f < at + 36) st = how === "around" ? [0.7, side * 0.7] : how === "cut" ? [0, side] : how === "back" ? [-1, side * 0.3] : [1, 0];
      // past the defender a hand sprints away
      SL.input.read = () => Object.assign({}, NONE, { x: st[0], z: st[1], sprint: at >= 0 });
      m.events.length = 0; m.step();
    }
    if (m.ball.carrier === h || (!m.ball.carrier && m.ball.last === h)) kept++;
  }
  return kept / n;
}
{
  const straight = skillDuel(null, 200, "F"), around = skillDuel(null, 200, "around");
  const rows = Object.keys(SL.SKILLS).map((id) => [id, skillDuel(id, 200)]);
  check(`un difensore dell'IA davanti, skill a 1,6 m, palla ancora tua dopo 1,5 s: dritto ${pct(straight)}, girandogli attorno ${pct(around)}; con la skill ` + rows.map(([id, v]) => `${SL.SKILLS[id].name} ${pct(v)}`).join(", "), rows.filter(([, v]) => v > around).length, rows.every(([, v]) => v > around), ` skill su ${rows.length} sopra il giro attorno`);
}

// ---- 7. Player roles -----------------------------------------------------------------
// The home side plays rombo with every player in his place's first role, except one place that
// takes the role under test (familiarity +). Over 12 AI matches, for that player: how far up he
// stands with his team on the ball and with the other team attacking in his half (metres from his
// own goal), how
// far from the middle with the ball, his shots, passes and hits a match; for a keeper, how far off
// his line. Printed for every role, checked where the role says which way it moves.
function roleRun(roleId, n) {
  const R = SL.AI.ROLES[roleId], places = SL.FORMATIONS.rombo.places, slot = places.indexOf(R.pos);
  const acc = { xa: 0, na: 0, xd: 0, nd: 0, za: 0, shots: 0, passes: 0, hits: 0, gk: 0, ngk: 0 };
  for (let k = 0; k < n; k++) {
    const pair = [["fulmini", "marea"], ["vulcano", "lupi"], ["corvi", "aurora"], ["ghiaccio", "tempesta"]][k % 4];
    const side = (id, own) => { const c = SL.clubById(id); const roles = places.map((pos) => SL.AI.rolesFor(pos)[0]); if (own) roles[slot] = roleId; return { club: c, squad: SL.clubSquad(c), kit: c.kit, kit2: null, pattern: 0, formation: "rombo", roles }; };
    const settings = Object.assign(SL.defaultSettings(), { minutes: 4, difficulty: 1, goldenGoal: false, aiHits: true, opponentAi: 0 });
    const m = new SL.Match({ home: side(pair[0], true), away: side(pair[1], false), humans: [], settings, seed: 3000 + k });
    const p = m.players[slot]; p.fam = 1; p._roleCache = null;
    let g = 0;
    while (!m.over && g++ < 4 * 3600 * 3) {
      m.events.length = 0; m.step();
      for (const e of m.events) { if (e.by === p && e.type === "shot") acc.shots++; if (e.from === p && e.type === "pass") acc.passes++; if (e.by === p && e.type === "hit") acc.hits++; }
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
  const f1 = (v) => String(+v.toFixed(1)).replace(".", ",");
  const res = {};
  for (const id of Object.keys(SL.AI.ROLES)) res[id] = roleRun(id, 12);
  for (const id of Object.keys(SL.AI.ROLES)) {
    const r = res[id], R = SL.AI.ROLES[id];
    console.log(`     ${R.pos} ${R.name.padEnd(20)} ` + (R.pos === "POR" ? `dalla linea di porta ${f1(r.gk)} m` : `dalla sua porta col pallone ${f1(r.xa)} m, quando difende ${f1(r.xd)} m · dal centro ${f1(r.za)} m · tiri ${f1(r.shots)}, passaggi ${f1(r.passes)}, spallate ${f1(r.hits)} a partita`));
  }
  const expect = [
    ["la torre resta più alta senza palla dell'attaccante avanzato", res.torre.xd > res.avanzato.xd + 1],
    ["la torre sta più al centro dell'attaccante avanzato", res.torre.za < res.avanzato.za],
    ["il falso nueve sta più basso col pallone dell'attaccante avanzato", res.falso9.xa < res.avanzato.xa - 1],
    ["il rapinatore tira più dell'attaccante avanzato", res.rapinatore.shots > res.avanzato.shots],
    ["il mediano sta più basso col pallone del box to box", res.mediano.xa < res.boxtobox.xa - 1],
    ["l'ala interna sta più al centro dell'ala", res.alainterna.za < res.ala.za],
    ["lo stopper dà più spallate del difensore", res.stopper.hits > res.difensore.hits],
    ["il difensore regista sale più del difensore", res.impostatore.xa > res.difensore.xa],
    ["il portiere libero sta più fuori dai pali del portiere", res.libero.gk > res.portiere.gk],
  ];
  const bad = expect.filter((e) => !e[1]).map((e) => e[0]);
  check(`ruoli: ${expect.length - bad.length} su ${expect.length} si muovono come dicono${bad.length ? " (no: " + bad.join("; ") + ")" : ""}`, expect.length - bad.length, !bad.length, ` su ${expect.length}`);
}

let failed = 0;
for (const r of results) { if (!r.ok) failed++; console.log(`${r.ok ? "ok  " : "NO  "} ${r.name}: ${typeof r.value === "number" ? String(+r.value.toFixed(2)).replace(".", ",") : r.value}${r.unit}`); }
process.exit(failed ? 1 : 0);

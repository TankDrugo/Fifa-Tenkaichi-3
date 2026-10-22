// The checks of the moves (docs/PIANO-3D-ONLINE.md, section 4.7), in Node, on matches of the AI:
//   - contact: for every kick, the step at which the kicking boot comes closest to where the ball
//     leaves, against the step the simulation lets it go (the plan: the same step); and how far the
//     boot's face is from the ball there;
//   - planted feet: how far a foot moves on the ground while the run says it is planted;
//   - which moves the matches show, and how often.
// Each step is posed at the instant of the frame before (alpha 0), as a screen at 60 Hz would.
//
// Run: node apps/web/scripts/moves3.ts [matches=4] [--json]
import { Matrix4, Vector3 } from "three";
import { C, CLUBS, DT } from "@ft3/sim";
import { makeBody } from "../game/body.ts";
import { Driver } from "../game/driver.ts";
import type { Action } from "../game/history.ts";
import { Animator, type MoveContext, type Pose } from "../game/moves.ts";
import { matchDesigns, teamKits } from "../game/players.ts";
import { ANKLE, BONES_PER_PLAYER, newJoints, skeleton } from "../game/rig.ts";

const args = process.argv.slice(2);
const json = args.includes("--json");
const matches = Number(args.find((a) => /^\d+$/.test(a)) ?? 4);
const KICKS = new Set(["pass", "lob", "shot", "chip", "charged", "comet", "roll", "touch"]);

const m4 = new Matrix4(), v = new Vector3();
// the boot's striking face: forward of the ankle along the foot, a little down (parts.ts, foot)
function bootFace(bones: Float32Array, base: number, s: number, b: ReturnType<typeof makeBody>): Vector3 {
  m4.fromArray(bones, (base + ANKLE[s]!) * 16);
  return v.set(0, -b.ankle * 0.3, b.footL * 0.95).applyMatrix4(m4);
}

interface Row { type: string; offset: number; gap: number }
const rows: Row[] = [];
const seen: Record<string, number> = {};
let slipSum = 0, slipFrames = 0, slipMax = 0;
const pairs = CLUBS.slice(0, 8);
for (let g = 0; g < matches; g++) {
  const home = pairs[g % 8]!.id, away = pairs[(g + 3) % 8]!.id;
  const d = new Driver(home, away, 101 + g, { minutes: 2 });
  const designs = matchDesigns(d.match, teamKits(d.colours[0], d.colours[1]), [home, away], "B");
  const bodies = designs.map((x) => makeBody(x.build));
  const animator = new Animator(designs.length, designs);
  const pose: Pose = { x: 0, z: 0, fx: 0, fz: 1, joints: newJoints(), expression: "neutral", ballInHands: null, contactMiss: -1 };
  const bones = new Float32Array(designs.length * BONES_PER_PLAYER * 16);
  // the boots of the last steps, to find the closest to each kick's contact afterwards
  const boots: Map<number, Vector3[][]> = new Map();
  const planted: (Vector3 | null)[][] = designs.map(() => [null, null]);
  const pending: Action[] = [];
  let steps = 0;
  while (d.match.phase !== "end" && steps < 60 * 60 * 3) {
    d.skip(1); steps++;
    const ctx: MoveContext = { frames: d.frames, before: d.before, after: d.after, alpha: 0, time: steps * DT, dt: DT };
    animator.begin(ctx);
    const at = d.before.step;
    const now: Vector3[][] = [];
    designs.forEach((ds, i) => {
      animator.pose(ctx, i, ds, bodies[i]!, pose);
      skeleton(pose.x, pose.z, pose.fx, pose.fz, ds.height, bodies[i]!, pose.joints, bones, i * BONES_PER_PLAYER);
      now.push([bootFace(bones, i * BONES_PER_PLAYER, 0, bodies[i]!).clone(), bootFace(bones, i * BONES_PER_PLAYER, 1, bodies[i]!).clone()]);
      // a planted foot: its ankle should not move on the ground
      for (let s = 0; s < 2; s++) {
        const busy = d.before.players[i]!;
        const plantedNow = animator.isPlanted(i, s) && !busy.hasBall && busy.kickT < 0 && busy.slideT < 0 && busy.hitT < 0 && !busy.skill && busy.react <= 0 && Math.hypot(busy.vx, busy.vz) > 0.25;
        m4.fromArray(bones, (i * BONES_PER_PLAYER + ANKLE[s]!) * 16);
        const p = new Vector3().setFromMatrixPosition(m4);
        const prev = planted[i]![s];
        if (plantedNow && prev) { const slip = Math.hypot(p.x - prev.x, p.z - prev.z); slipSum += slip; slipFrames++; slipMax = Math.max(slipMax, slip); }
        planted[i]![s] = plantedNow ? p : null;
      }
    });
    boots.set(at, now);
    if (boots.size > 12) boots.delete(boots.keys().next().value!);
    for (const a of d.after.actions) { seen[a.type] = (seen[a.type] ?? 0) + 1; if (KICKS.has(a.type) && a.type !== "roll") pending.push(a); }
    // a kick is judged once the frames 3 steps after its contact are posed
    for (let q = pending.length - 1; q >= 0; q--) {
      const a = pending[q]!;
      if (at < a.at + 3) continue;
      pending.splice(q, 1);
      let best = Infinity, bestStep = 0;
      for (let st = a.at - 3; st <= a.at + 3; st++) {
        const fr = boots.get(st);
        if (!fr) continue;
        for (let s = 0; s < 2; s++) {
          const bt = fr[a.player]![s]!, dist = Math.hypot(bt.x - a.x, bt.y - a.y, bt.z - a.z);
          if (dist < best) { best = dist; bestStep = st; }
        }
      }
      rows.push({ type: a.type, offset: bestStep - a.at, gap: best - C.ballRadius });
    }
  }
}

const by = (t: string) => rows.filter((r) => r.type === t);
const f = (x: number, dd = 3) => x.toLocaleString("it-IT", { minimumFractionDigits: dd, maximumFractionDigits: dd });
const summary = [...new Set(rows.map((r) => r.type))].map((t) => {
  const rs = by(t), on = rs.filter((r) => r.offset === 0).length;
  const gaps = rs.map((r) => Math.abs(r.gap)).sort((a, b) => a - b);
  return { type: t, kicks: rs.length, onStep: on, medianGap: gaps[gaps.length >> 1] ?? 0, worstGap: gaps[gaps.length - 1] ?? 0 };
});
if (json) console.log(JSON.stringify({ matches, summary, seen, slip: { meanMm: slipSum / Math.max(1, slipFrames) * 1000, maxMm: slipMax * 1000, frames: slipFrames } }));
else {
  console.log(`${matches} partite fra IA da 2 minuti`);
  for (const s of summary) console.log(`${s.type}: ${s.kicks} calci, scarpa più vicina alla palla nel passo del rilascio ${s.onStep} su ${s.kicks}; distanza della scarpa dalla superficie della palla mediana ${f(s.medianGap)} m, peggiore ${f(s.worstGap)} m`);
  console.log(`piedi appoggiati: ${slipFrames} fotogrammi, scivolamento medio ${f(slipSum / Math.max(1, slipFrames) * 1000, 2)} mm a fotogramma, massimo ${f(slipMax * 1000, 1)} mm`);
  console.log(`azioni viste: ${Object.entries(seen).map(([k, n]) => `${k} ${n}`).join(", ")}`);
}

// The footballers' moves (docs/PIANO-3D-ONLINE.md, section 4.7): keys written in code for each
// move, over procedural layers: a run whose feet stay where they land, the lean into turns, on
// acceleration and braking, the head toward the ball, and the inverse kinematics (ik.ts) that put a
// foot on the ball and the keeper's hands on it.
//
// The simulation decides, the animation follows. Each action carries the step of its contact
// (history.ts): a kick's foot reaches the ball on the instant the simulation lets it go, a take, a
// hit, a tackle or a save on their step. What comes before the contact comes from what the
// simulation already says: the charge of a shot (the AI always charges, ai.ts), the hold of a pass,
// the timeline of a skill, the flight of a ball toward the goal for the keeper's dive.
//
// A frame is posed in three passes: the body (pelvis, chest, head, arms) from the run and the
// moves; the points the feet and the hands are asked to reach; then the inverse kinematics, so a
// lean added by a move never lifts a planted foot or takes a foot off the ball.
import { Vector3 } from "three";
import { C, DT } from "@ft3/sim";
import { hipHeight, type Body } from "./body.ts";
import type { Expression } from "./faces.ts";
import type { Action, Frame, PlayerFrame } from "./history.ts";
import { anklePosition, armIK, fromRoot, legIK, levelFoot, toRoot } from "./ik.ts";
import type { Design } from "./looks.ts";
import { ARM, arm, J, LEG, leg, type Joints } from "./rig.ts";
import { CHARACTER_HEIGHT } from "./style.ts";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const smooth = (u: number): number => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
// Keys [t0, v0, t1, v1, ...]: eased from one to the next, held before the first and after the last.
export function key(t: number, k: readonly number[]): number {
  if (t <= k[0]!) return k[1]!;
  for (let i = 2; i < k.length; i += 2) {
    if (t <= k[i]!) { const t0 = k[i - 2]!, v0 = k[i - 1]!; return v0 + (k[i + 1]! - v0) * smooth((t - t0) / (k[i]! - t0)); }
  }
  return k[k.length - 1]!;
}
// 0 before a, 1 after b, eased between
const ramp = (t: number, a: number, b: number) => smooth((t - a) / (b - a));
// in over fadeIn, out over the last fadeOut of dur
const envelope = (t: number, dur: number, fadeIn: number, fadeOut: number) => ramp(t, 0, fadeIn) * (1 - ramp(t, dur - fadeOut, dur));
// a channel moved toward v by weight w
const mix = (j: Joints, c: number, v: number, w: number) => { j[c] = j[c]! + (v - j[c]!) * w; };

export const MOVE_DURATION: Record<string, number> = {
  pass: 0.36, lob: 0.45, shot: 0.6, chip: 0.55, charged: 0.75, comet: 0.9, roll: 0.55, touch: 0.25,
  take: 0.3, save: 1.1, claim: 0.5, hit: 0.35, tackle: 0.1,
};
const KICKS = new Set(["pass", "lob", "shot", "chip", "charged", "comet", "roll", "touch"]);
const SKILL_DUR: Record<string, number> = { tunnel: 0.3, dragback: 0.3, feint: 0.22, stepover: 0.32, roll: 0.6, heelchop: 0.2, roulette: 0.45, sombrero: 0.35, elastico: 0.35 };

interface Foot { planted: boolean; x: number; z: number; lx: number; lz: number; stepT: number }
interface Mem {
  phase: number;
  feet: [Foot, Foot];
  v: number;
  accel: number;
  yaw: number;
  turn: number;
  sides: Map<number, number>;     // the foot chosen for each kick, by its contact step
  celebrateKind: number;
}

export interface Pose {
  x: number; z: number; fx: number; fz: number;
  joints: Joints;
  expression: Expression;
  // where the ball is drawn, when a keeper holds it in his hands
  ballInHands: Vector3 | null;
  // how far the kicking foot's ankle was from where it was asked to be at a kick's contact (m),
  // -1 when no contact this frame: the measure of the contact (scripts/moves3.ts)
  contactMiss: number;
}

export interface MoveContext {
  frames: Frame[];          // kept frames, oldest first (driver.ts)
  before: Frame;
  after: Frame;
  alpha: number;
  time: number;
  dt: number;
}

const tmp = new Vector3(), tmp2 = new Vector3(), tmp3 = new Vector3();
const attackSign = (team: number) => (team === 0 ? 1 : -1);

// What the moves ask of the limbs, solved once the body is posed: a point for each foot (root
// frame) with its knee's twist and the toes' pitch, a point for each hand, and leg angles keyed on
// top of the solved legs.
interface Plan {
  foot: [Vector3, Vector3];
  footW: [number, number];
  run: [Vector3, Vector3];
  runToes: [number, number];
  twist: [number, number];
  toes: [number, number];
  hand: [Vector3, Vector3];
  handW: [number, number];
  after: ((j: Joints) => void)[];
  contact: number;                 // the leg whose foot must be on the ball now, -1 none
}
const plan: Plan = { foot: [new Vector3(), new Vector3()], footW: [0, 0], run: [new Vector3(), new Vector3()], runToes: [0, 0], twist: [0.08, 0.08], toes: [0, 0], hand: [new Vector3(), new Vector3()], handW: [0, 0], after: [], contact: -1 };
function resetPlan(): void { plan.footW[0] = plan.footW[1] = 0; plan.handW[0] = plan.handW[1] = 0; plan.after.length = 0; plan.contact = -1; plan.twist[0] = plan.twist[1] = 0.08; }
// a foot asked at p (root frame) over the run's point, by weight w
function footAt(s: number, p: Vector3, w: number, twist = 0.1, toes = 0): void {
  if (w < plan.footW[s]!) return;
  plan.foot[s]!.copy(p); plan.footW[s] = w; plan.twist[s] = twist; plan.toes[s] = toes;
}
function handAt(s: number, p: Vector3, w: number): void {
  if (w < plan.handW[s]!) return;
  plan.hand[s]!.copy(p); plan.handW[s] = w;
}
// leg angles mixed in after the legs are solved
const later = (f: (j: Joints) => void) => { plan.after.push(f); };

export class Animator {
  private mem: Mem[] = [];
  private recent: Action[][] = [];

  constructor(n: number, designs: Design[]) {
    for (let i = 0; i < n; i++) {
      const foot = (): Foot => ({ planted: false, x: NaN, z: NaN, lx: 0, lz: 0, stepT: -1 });
      // each player celebrates his own way, from his card
      const k = designs[i] ? Math.floor(designs[i]!.variant * 997) % 6 : i % 6;
      this.mem.push({ phase: (i * 0.37) % 1, feet: [foot(), foot()], v: 0, accel: 0, yaw: NaN, turn: 0, sides: new Map(), celebrateKind: k });
      this.recent.push([]);
    }
  }

  // The actions of every player seen up to the frame drawn, newest last. Once a frame.
  begin(ctx: MoveContext): void {
    for (const r of this.recent) r.length = 0;
    const last = ctx.after.step;
    for (const f of ctx.frames) {
      if (f.step > last) break;
      for (const a of f.actions) {
        if (a.player >= 0 && a.player < this.recent.length) this.recent[a.player]!.push(a);
        else if (a.type === "goal") for (const r of this.recent) r.push(a);
      }
    }
  }

  // Whether the run has foot s of player i planted on the ground (scripts/moves3.ts).
  isPlanted(i: number, s: number): boolean { return this.mem[i]!.feet[s]!.planted; }

  // The display's position in steps: the frame before plus alpha.
  static display(ctx: MoveContext): number { return ctx.before === ctx.after ? ctx.after.step : ctx.before.step + ctx.alpha; }

  pose(ctx: MoveContext, i: number, d: Design, b: Body, out: Pose): void {
    const A = ctx.before.players[i]!, B = ctx.after.players[i]!, a = ctx.alpha, m = this.mem[i]!;
    const j = out.joints;
    j.fill(0);
    resetPlan();
    out.ballInHands = null;
    out.contactMiss = -1;
    const x = A.x + (B.x - A.x) * a, z = A.z + (B.z - A.z) * a;
    let fx = A.fx + (B.fx - A.fx) * a, fz = A.fz + (B.fz - A.fz) * a;
    const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl;
    const vx = A.vx + (B.vx - A.vx) * a, vz = A.vz + (B.vz - A.vz) * a;
    const k = CHARACTER_HEIGHT * d.height, D = Animator.display(ctx), dt = ctx.dt;
    out.x = x; out.z = z; out.fx = fx; out.fz = fz;
    const ball = ctx.after.ball, pb = ctx.before.ball;
    const bx = pb.x + (ball.x - pb.x) * a, by = pb.y + (ball.y - pb.y) * a, bz = pb.z + (ball.z - pb.z) * a;
    const P = B;

    // turning rate and acceleration, for the lean
    const yaw = Math.atan2(fx, fz);
    let turn = Number.isNaN(m.yaw) ? 0 : yaw - m.yaw;
    if (turn > Math.PI) turn -= Math.PI * 2; else if (turn < -Math.PI) turn += Math.PI * 2;
    m.yaw = yaw;
    if (dt > 0) m.turn += ((turn / dt) - m.turn) * Math.min(1, dt * 10);
    const speed = Math.hypot(vx, vz);
    const fwdSpeed = vx * fx + vz * fz;
    if (dt > 0) { m.accel += (((fwdSpeed - m.v) / dt) - m.accel) * Math.min(1, dt * 8); m.v = fwdSpeed; }

    // ---- pass 1: the body from the run -------------------------------------------------------
    let look = Math.atan2(bx - x, bz - z) - yaw;
    if (look > Math.PI) look -= Math.PI * 2; else if (look < -Math.PI) look += Math.PI * 2;
    j[J.headY] = Math.abs(look) < 1.7 ? clamp(look, -1, 1) * 0.8 : 0;
    j[J.headX] = -0.04;
    const run = clamp(speed / 6, 0, 1);
    const brake = m.accel < -3 && speed > 1 ? clamp((-m.accel - 3) / 8, 0, 1) : 0;
    const lean = 0.03 + 0.24 * run + clamp(m.accel * 0.012, 0, 0.1) - 0.45 * brake;
    j[J.pelvisX] = lean * 0.4; j[J.chestX] = lean * 0.6; j[J.headX] = -0.04 - lean * 0.35;
    j[J.pelvisZ] = clamp(m.turn * speed * 0.012, -0.3, 0.3);
    j[J.hairX] = -0.15 - 0.5 * run; j[J.tailX] = -0.3 - 0.4 * run; j[J.tailY] = 0.35 * Math.sin(ctx.time * 3 + i); j[J.capeX] = 0.2 + 0.7 * run;
    this.gait(m, j, b, x, z, fx, fz, vx, vz, speed, k, dt);

    // ---- pass 2: the moves -----------------------------------------------------------------------
    const acts = this.recent[i]!;
    const latest = (type: string | Set<string>, maxT: number): [Action, number] | null => {
      for (let q = acts.length - 1; q >= 0; q--) {
        const ac = acts[q]!;
        if (typeof type === "string" ? ac.type !== type : !type.has(ac.type)) continue;
        const t = (D - ac.at) * DT;
        if (t >= -1e-9 && t <= maxT) return [ac, t];
        if (t > maxT) return null;
      }
      return null;
    };
    let expression: Expression = "neutral";
    const goal = acts.filter((ac) => ac.type === "goal").pop();
    const goalT = goal ? (D - goal.at) * DT : -1;
    const foot = d.variant < 0.22 ? 1 : 0;

    // the charge of a shot or a pass: the kicking leg goes back
    if (P.charge >= 0 || P.passCharge >= 0) {
      const c = P.charge >= 0 ? clamp(P.charge / 0.45, 0, 1) : clamp(P.passCharge / 0.4, 0, 1) * 0.6;
      windUp(j, foot, c, clamp((P.charge >= 0 ? P.charge : P.passCharge) / 0.06, 0, 1));
      expression = "effort";
    }
    const kick = latest(KICKS, 1.0);
    if (kick && kick[1] <= (MOVE_DURATION[kick[0].type] ?? 0.5)) {
      const [ac, t] = kick;
      let side = m.sides.get(ac.at);
      if (side === undefined) {
        // shots with the stronger foot; a pass with the foot already swinging forward
        const f0 = m.feet[0], f1 = m.feet[1];
        side = (ac.type === "pass" || ac.type === "lob" || ac.type === "touch") && f0.planted !== f1.planted ? (f0.planted ? 1 : 0) : foot;
        m.sides.set(ac.at, side);
        if (m.sides.size > 16) m.sides.delete(m.sides.keys().next().value!);
      }
      if (ac.type === "roll") throwBall(j, ac, t, x, z, fx, fz, k);
      else this.kickMove(m, j, b, ac, t, side, x, z, fx, fz, k);
      expression = ac.type === "pass" || ac.type === "roll" ? "focus" : "effort";
    }
    const take = latest("take", MOVE_DURATION.take!);
    if (take && !P.keeper) takeMove(j, b, take[0], take[1], x, z, fx, fz, k);
    const hit = latest("hit", MOVE_DURATION.hit!);
    if (P.hitT >= 0 || hit || P.recovery > 0) { shoulder(j, P, hit ? hit[1] : -1, d.variant > 0.5 ? 1 : 0); expression = "effort"; }
    if (P.slideT >= 0 || P.slideDownT > 0) { slide(j, b, P, foot); expression = P.slideT >= 0 ? "effort" : "pain"; }
    if (P.feintT >= 0) feint(j, P, fx, fz);
    if (P.skill) { skill(j, b, P, x, z, fx, fz, k, bx, by, bz); expression = "focus"; }
    if (P.react > 0 || P.knockT > 0) { reaction(j, P, fx, fz, ctx.time); expression = "pain"; }
    else if (P.fooled > 0) { fooled(j, P, fx, fz); expression = "surprise"; }
    if (P.keeper) { const ex = this.keeper(j, b, i, P, ctx, x, z, fx, fz, k, bx, by, bz, out); if (ex) expression = ex; }
    const sp = ctx.after.special;
    if (sp && sp.shooter === i) { comet(j, sp.state, sp.t, foot); expression = sp.state === "meter" ? "effort" : "focus"; }
    if (P.celebrate >= 0 && goalT >= 0) { celebrate(j, m.celebrateKind, P.celebrate, ctx.time + i); expression = "joy"; }
    else if (goal && goalT >= 0 && ctx.after.phase === "goal" && goal.side !== P.team) { dejected(j, m.celebrateKind, goalT); expression = "upset"; }

    // ---- pass 3: limbs on their points --------------------------------------------------------------
    for (let s = 0; s < 2; s++) {
      const w = plan.footW[s]!;
      tmp.copy(plan.run[s]!).lerp(plan.foot[s]!, w);
      legIK(j, b, s, tmp, plan.twist[s]! * w + 0.08 * (1 - w));
      levelFoot(j, s, plan.runToes[s]! * (1 - w) + plan.toes[s]! * w);
      if (plan.contact === s) out.contactMiss = anklePos(j, b, s).distanceTo(plan.foot[s]!) * k;
    }
    for (const f of plan.after) f(j);
    for (let s = 0; s < 2; s++) {
      const w = plan.handW[s]!;
      if (w <= 0) continue;
      const keep = j.slice(J.arm + s * 5, J.arm + s * 5 + 5);
      armIK(j, b, s, plan.hand[s]!);
      for (let c = 0; c < 5; c++) j[J.arm + s * 5 + c] = keep[c]! + (j[J.arm + s * 5 + c]! - keep[c]!) * w;
    }
    out.expression = expression === "neutral" && (ctx.time + i * 1.37) % (3.1 + (i % 4) * 0.45) < 0.12 ? "blink" : expression;
  }

  // ---- the run: cadence by speed, each foot planted where it lands ----------------------------
  private gait(m: Mem, j: Joints, b: Body, x: number, z: number, fx: number, fz: number, vx: number, vz: number, speed: number, k: number, dt: number): void {
    // steps a second: short legs take quick steps (a run at 4,6 m/s is 7 a second)
    const moving = speed > 0.25;
    const cadence = moving ? 2.4 + 1.0 * speed : 0;
    m.phase = (m.phase + dt * cadence / 2) % 1;
    const duty = moving ? clamp(0.62 - 0.055 * speed, 0.28, 0.62) : 1;
    const cycle = moving ? 2 / cadence : 1;
    const run = clamp(speed / 6, 0, 1);
    j[J.offY] = -0.012 - 0.03 * run + 0.022 * run * (0.5 - 0.5 * Math.cos(m.phase * Math.PI * 4));
    const legLen = (b.thigh + b.shin) * k;
    for (let s = 0; s < 2; s++) {
      const side = s === 0 ? 1 : -1, f = m.feet[s]!;
      // the spot under the hip
      fromRoot(x, z, fx, fz, k, -side * b.hipW * 1.15, 0, 0.01, tmp);
      const hx = tmp.x, hz = tmp.z;
      if (Number.isNaN(f.x)) { f.x = hx; f.z = hz; f.planted = true; }
      let tx: number, tz: number, lift = 0, toes = 0;
      if (moving) {
        f.stepT = -1;
        const ph = (m.phase + s * 0.5) % 1;
        const lx = hx + vx * duty * cycle * 0.5, lz = hz + vz * duty * cycle * 0.5;
        if (ph < duty) {
          // lands where the swing was heading, and stays there
          if (!f.planted) { f.planted = true; f.x = lx; f.z = lz; }
          // a foot left too far behind lifts early rather than stretch the leg
          if (Math.hypot(f.x - hx, f.z - hz) > legLen * 0.95) { f.x = hx; f.z = hz; }
          tx = f.x; tz = f.z;
        } else {
          if (f.planted) { f.planted = false; f.lx = f.x; f.lz = f.z; }
          const u = (ph - duty) / (1 - duty);
          tx = f.lx + (lx - f.lx) * smooth(u); tz = f.lz + (lz - f.lz) * smooth(u);
          lift = Math.sin(Math.PI * u) * (0.025 + 0.012 * speed);
          toes = key(u, [0, -0.5, 0.5, 0, 1, 0.15]);
        }
      } else {
        // standing: a foot far from its place steps back under the hip, one at a time
        const other = m.feet[1 - s]!;
        if (f.stepT < 0 && other.stepT < 0 && Math.hypot(f.x - hx, f.z - hz) > 0.045) { f.stepT = 0; f.lx = f.x; f.lz = f.z; f.planted = false; }
        if (f.stepT >= 0) {
          f.stepT = Math.min(1, f.stepT + dt / 0.16);
          const u = smooth(f.stepT);
          tx = f.lx + (hx - f.lx) * u; tz = f.lz + (hz - f.lz) * u; lift = Math.sin(Math.PI * f.stepT) * 0.025;
          if (f.stepT >= 1) { f.stepT = -1; f.planted = true; f.x = hx; f.z = hz; }
        } else { tx = f.x; tz = f.z; f.planted = true; }
      }
      toRoot(x, z, fx, fz, k, tx, lift, tz, plan.run[s]!);
      plan.run[s]!.y += b.ankle;
      plan.runToes[s] = toes;
    }
    // arms swing against the legs: each arm forward as the other side's foot is
    const armAmp = 0.1 + 0.85 * run;
    for (let s = 0; s < 2; s++) {
      const swing = moving ? clamp(plan.run[1 - s]!.z / 0.2, -1, 1) : 0;
      j[arm(s, ARM.forward)] = swing * armAmp;
      j[arm(s, ARM.out)] = 0.12;
      j[arm(s, ARM.elbow)] = 0.35 + 1.05 * run;
    }
  }

  // ---- kicks ------------------------------------------------------------------------------------
  // The kicking foot on the ball at the contact (t = 0), then through it along the ball's way; the
  // other foot planted beside it; arms out for balance, the chest turned into the kick.
  private kickMove(m: Mem, j: Joints, b: Body, ac: Action, t: number, s: number, x: number, z: number, fx: number, fz: number, k: number): void {
    const type = ac.type, dur = MOVE_DURATION[type] ?? 0.5, side = s === 0 ? 1 : -1, plant = 1 - s;
    const w = 1 - ramp(t, dur * 0.55, dur);
    const strong = type === "shot" || type === "charged" || type === "comet";
    const scoop = type === "lob" || type === "chip";
    // the body: over the ball for a shot, back for a scoop; arms wide, the chest turned in
    const lean = strong ? key(t, [0, 0.18, 0.15, 0.05, dur, 0]) : scoop ? key(t, [0, -0.2, 0.2, -0.1, dur, 0]) : 0.06;
    mix(j, J.pelvisX, lean * 0.5, w); mix(j, J.chestX, lean, w);
    mix(j, J.chestY, side * key(t, [0, -0.35, 0.18, 0.25, dur, 0]) * (strong ? 1 : 0.6), w);
    mix(j, arm(s, ARM.forward), -0.5, w); mix(j, arm(s, ARM.out), 0.7, w); mix(j, arm(s, ARM.elbow), 0.6, w);
    mix(j, arm(plant, ARM.forward), 0.55, w); mix(j, arm(plant, ARM.out), 0.85, w); mix(j, arm(plant, ARM.elbow), 0.5, w);
    // a shot lifts the body off the planted foot; the charged one and the comet leave the ground
    const hop = type === "charged" || type === "comet" ? 0.09 : strong ? 0.035 : 0;
    j[J.offY] = j[J.offY]! + hop * key(t, [0, 0, 0.12, 1, 0.3, 0]) * w;
    if (type === "charged") j[J.pelvisY] = j[J.pelvisY]! + side * 0.9 * key(t, [0, 0, 0.25, 1, 0.6, 0]) * w;
    // where the ankle goes: just behind the ball at the contact, then along its way and up
    const follow = strong ? 0.32 : scoop ? 0.2 : 0.16, rise = strong ? 0.22 : scoop ? 0.3 : 0.05;
    const u = ramp(t, 0.02, 0.22), r = C.ballRadius;
    tmp2.set(ac.x - ac.dx * (r + 0.02) + ac.dx * follow * u, Math.max(r * 0.7, ac.y - (scoop ? r * 0.6 : 0)) + rise * u, ac.z - ac.dz * (r + 0.02) + ac.dz * follow * u);
    // aside the ball's line for the inside of the foot
    if (type === "pass") { tmp2.x += -ac.dz * side * 0.03 * (1 - u); tmp2.z += ac.dx * side * 0.03 * (1 - u); }
    toRoot(x, z, fx, fz, k, tmp2.x, tmp2.y, tmp2.z, tmp);
    footAt(s, tmp, w, type === "pass" ? 0.7 : 0.1, strong ? -0.7 : scoop ? 0.6 : 0.15);
    if (t < DT * 0.5) plan.contact = s;
    // the planted foot beside the ball, until the follow-through ends
    if (t < dur * 0.6) {
      tmp2.set(ac.x - ac.dx * 0.16 + ac.dz * side * 0.15, 0, ac.z - ac.dz * 0.16 - ac.dx * side * 0.15);
      toRoot(x, z, fx, fz, k, tmp2.x, 0, tmp2.z, tmp);
      tmp.y = b.ankle;
      footAt(plant, tmp, 1 - ramp(t, dur * 0.35, dur * 0.6));
      if (t < 0.05) { const f = m.feet[plant]!; f.planted = true; f.x = tmp2.x; f.z = tmp2.z; }
    }
  }

  // ---- the keeper -------------------------------------------------------------------------------
  private keeper(j: Joints, b: Body, i: number, P: PlayerFrame, ctx: MoveContext, x: number, z: number, fx: number, fz: number, k: number, bx: number, by: number, bz: number, out: Pose): Expression | null {
    const ball = ctx.after.ball, team = P.team, s = attackSign(team), line = -s * C.length / 2;
    const D = Animator.display(ctx);
    let ex: Expression | null = null;
    // ready: crouched with the hands forward while the ball is in his half
    const near = clamp(1 - Math.abs(bx - line) / 12, 0, 1);
    if (!P.hasBall) {
      j[J.offY] = j[J.offY]! - 0.035 * near;
      for (let q = 0; q < 2; q++) { mix(j, arm(q, ARM.forward), 0.55, near); mix(j, arm(q, ARM.out), 0.55, near); mix(j, arm(q, ARM.elbow), 0.7, near); }
      mix(j, J.chestX, 0.15, near);
    }
    let save: [Action, number] | null = null;
    for (let q = this.recent[i]!.length - 1; q >= 0; q--) {
      const ac = this.recent[i]![q]!;
      if (ac.type !== "save" && ac.type !== "claim") continue;
      const t = (D - ac.at) * DT;
      if (t >= 0 && t <= (MOVE_DURATION[ac.type] ?? 1)) save = [ac, t];
      break;
    }
    // the dive: a shot on its way into his goal; he flies at the point where it crosses the plane
    // of his saves (match.ts, keeperSaves), reaching it on the step the save is decided
    let reach = 0;
    if (!save && ball.carrier < 0 && ball.shot && Math.sign(ball.vx) === -s && Math.abs(ball.vx) > 1) {
      const plane = line + s * C.savePlane, tc = (plane - bx) / ball.vx;
      const zAt = bz + ball.vz * (line - bx) / ball.vx, yAt = Math.max(C.ballRadius, by + ball.vy * tc - 0.5 * C.gravity * tc * tc);
      if (tc > 0 && tc < 0.45 && Math.abs(zAt) < C.goalWidth / 2 + 0.6 && yAt < C.goalHeight + 0.3) {
        reach = smooth(1 - tc / 0.45);
        toRoot(x, z, fx, fz, k, plane, yAt, bz + ball.vz * tc, tmp3);
      }
    }
    if (save) {
      const [ac, t] = save;
      if (ac.type === "save") {
        // he has it: down on his side with the ball, then up
        const sideOf = Math.sign((ac.x - x) * -fz + (ac.z - z) * fx) || 1;    // + to his right
        const fall = key(t, [0, 0, 0.3, 1, 0.65, 1, 1.05, 0]);
        j[J.offY] = j[J.offY]! * (1 - fall) - (hipHeight(b) - 0.09) * fall;
        mix(j, J.pelvisZ, -sideOf * 1.35, fall);
        later((jj) => { mix(jj, leg(0, LEG.knee), 0.6, fall); mix(jj, leg(1, LEG.knee), 0.9, fall); });
        ex = t < 0.3 ? "effort" : "joy";
      } else {
        // the claim: down to the carrier's ball, then up with it
        const dip = key(t, [0, 0.6, 0.25, 0.3, 0.5, 0]);
        j[J.offY] = j[J.offY]! - 0.08 * dip; mix(j, J.chestX, 0.6, dip);
      }
      this.hold(j, b, x, z, fx, fz, k, out, 0);
    } else if (reach > 0) {
      // reaching for the ball: the body flies at it, arms first
      const sh = hipHeight(b) + b.pelvisUp + b.torso * 0.75, armLen = b.upperArm + b.forearm;
      const dx = tmp3.x, dy = tmp3.y - sh, dz = tmp3.z, dist = Math.hypot(dx, dy, dz);
      const move = Math.max(0, dist - armLen * 0.9) * reach;
      if (dist > 1e-6) { j[J.offX] = j[J.offX]! + dx / dist * move; j[J.offY] = j[J.offY]! + dy / dist * move; j[J.offZ] = j[J.offZ]! + dz / dist * move; }
      mix(j, J.pelvisZ, -clamp(Math.atan2(dx, Math.max(0.05, tmp3.y)), -1.4, 1.4), reach);
      for (let q = 0; q < 2; q++) handAt(q, tmp.set(tmp3.x + (q === 0 ? -1 : 1) * C.ballRadius / k, tmp3.y, tmp3.z - C.ballRadius / k * 0.5), reach);
      later((jj) => { mix(jj, leg(0, LEG.knee), 0.5, reach); mix(jj, leg(1, LEG.knee), 0.2, reach); });
      ex = "effort";
    } else if (P.hasBall) {
      // holding it at the chest; raised over his head before the AI's throw (holdT, match.ts)
      const up = ramp(P.holdT, 0.75, 1.0);
      this.hold(j, b, x, z, fx, fz, k, out, up);
    } else if (ctx.after.phase === "goal") {
      const g = this.recent[i]!.filter((ac) => ac.type === "goal").pop();
      if (g && g.side !== team) ex = "upset";
    }
    return ex;
  }

  // Both hands on the ball, at the chest (up 0) or over the head (up 1), and the ball drawn there.
  private hold(j: Joints, b: Body, x: number, z: number, fx: number, fz: number, k: number, out: Pose, up: number): void {
    // in the chest's frame: in front of it, at the height of the shoulders, or above the head
    const r = C.ballRadius / k;
    const chestY = hipHeight(b) + j[J.offY]! + b.pelvisUp + b.torso * 0.62;
    tmp3.set(j[J.offX]!, chestY + up * (b.torso * 0.5 + b.headR * 2), j[J.offZ]! + b.chestD + r * 1.1 + up * 0.05);
    for (let q = 0; q < 2; q++) handAt(q, tmp.set(tmp3.x + (q === 0 ? -1 : 1) * r * 1.05, tmp3.y - 0.01, tmp3.z - 0.01), 1);
    out.ballInHands = fromRoot(x, z, fx, fz, k, tmp3.x, tmp3.y, tmp3.z, new Vector3());
  }
}

const anklePos = (j: Joints, b: Body, s: number) => anklePosition(j, b, s, tmp2);

// The keeper's throw over his head: hands on the ball at the release, arms through after it.
function throwBall(j: Joints, ac: Action, t: number, x: number, z: number, fx: number, fz: number, k: number): void {
  const dur = MOVE_DURATION.roll!, w = 1 - ramp(t, dur * 0.5, dur), r = C.ballRadius, u = ramp(t, 0, 0.2);
  for (let s = 0; s < 2; s++) {
    const side = s === 0 ? 1 : -1;
    tmp2.set(ac.x + ac.dx * 0.25 * u + ac.dz * side * r * 0.9, ac.y - 0.3 * u, ac.z + ac.dz * 0.25 * u - ac.dx * side * r * 0.9);
    handAt(s, toRoot(x, z, fx, fz, k, tmp2.x, tmp2.y, tmp2.z, tmp), w);
  }
  mix(j, J.chestX, key(t, [0, -0.1, 0.15, 0.35, dur, 0]), w);
  mix(j, J.pelvisX, 0.1, w);
}

// A take: the foot on the ball, the chest or the head.
function takeMove(j: Joints, b: Body, ac: Action, t: number, x: number, z: number, fx: number, fz: number, k: number): void {
  const dur = MOVE_DURATION.take!, w = 1 - ramp(t, dur * 0.4, dur);
  if (ac.y > 0.5) {
    // a header: up off the ground, the head nods into the ball
    j[J.offY] = j[J.offY]! + 0.06 * key(t, [0, 1, 0.2, 0]) * w;
    mix(j, J.headX, key(t, [0, 0.5, 0.12, -0.1, dur, 0]), w);
    mix(j, J.chestX, key(t, [0, 0.25, 0.15, -0.05, dur, 0]), w);
    for (let s = 0; s < 2; s++) { mix(j, arm(s, ARM.forward), -0.3, w); mix(j, arm(s, ARM.out), 0.9, w); }
  } else if (ac.y > 0.25) {
    // on the chest: leaning back to cushion it
    mix(j, J.chestX, key(t, [0, -0.35, 0.18, 0.05, dur, 0]), w);
    mix(j, J.pelvisX, -0.1, w);
    for (let s = 0; s < 2; s++) mix(j, arm(s, ARM.out), 0.7, w);
  } else {
    // the sole on the ball, then back down
    toRoot(x, z, fx, fz, k, ac.x, ac.y + C.ballRadius * 0.8, ac.z, tmp);
    const s = tmp.x > 0 ? 1 : 0;
    tmp.y = Math.max(tmp.y, b.ankle);
    footAt(s, tmp, 1 - ramp(t, 0.05, 0.2), 0.1, 0.4);
  }
}

// The kicking leg back while the shot charges, the other arm forward.
function windUp(j: Joints, s: number, c: number, w: number): void {
  const o = 1 - s, side = s === 0 ? 1 : -1;
  later((jj) => { mix(jj, leg(s, LEG.forward), -0.35 - 0.55 * c, w); mix(jj, leg(s, LEG.knee), 0.9 + 0.7 * c, w); mix(jj, leg(s, LEG.ankle), -0.3, w); });
  mix(j, arm(s, ARM.forward), -0.5 * c, w); mix(j, arm(s, ARM.out), 0.4 + 0.3 * c, w);
  mix(j, arm(o, ARM.forward), 0.5 * c, w); mix(j, arm(o, ARM.out), 0.7 * c, w);
  mix(j, J.chestY, -side * 0.35 * c, w); mix(j, J.chestX, -0.08 * c, w);
}

// The shoulder hit (match.ts, lunge): leaning in with the shoulder first, the contact, the stumble.
function shoulder(j: Joints, P: PlayerFrame, t: number, lead: number): void {
  const side = lead === 0 ? 1 : -1, o = 1 - lead;
  const lunge = P.hitT >= 0 ? ramp(P.hitT, 0, 0.06) : 0;
  const contact = t >= 0 ? 1 - ramp(t, 0.1, 0.35) : 0;
  const miss = P.recovery > 0 && t < 0 ? smooth(P.recovery / C.hitRecovery) : 0;
  const w = Math.max(lunge, contact, miss);
  if (w <= 0) return;
  mix(j, J.pelvisX, 0.25, w); mix(j, J.chestX, miss > 0 ? 0.55 : 0.35, w); mix(j, J.chestY, side * (contact > 0 ? 0.75 : 0.55), w);
  mix(j, arm(lead, ARM.forward), 0.15, w); mix(j, arm(lead, ARM.out), 0.15, w); mix(j, arm(lead, ARM.elbow), 1.9, w);
  mix(j, arm(o, ARM.forward), miss > 0 ? 1.2 : -0.6, w); mix(j, arm(o, ARM.out), miss > 0 ? 1.1 : 0.4, w);
  mix(j, J.headX, 0.2, w);
}

// Down on the hip along the slide, the leading leg straight at the ball, the other bent under;
// then up again. slideT runs 0-0,35 s, then slideDownT 0,35-0 s (packages/sim, C).
function slide(j: Joints, b: Body, P: PlayerFrame, s: number): void {
  const down = P.slideT >= 0 ? ramp(P.slideT, 0, 0.09) : smooth(P.slideDownT / C.slideDown);
  const o = 1 - s, side = s === 0 ? 1 : -1;
  j[J.offY] = j[J.offY]! * (1 - down) - (hipHeight(b) - 0.07) * down;
  mix(j, J.pelvisX, -0.55, down); mix(j, J.chestX, -0.2, down); mix(j, J.pelvisZ, side * 0.45, down);
  mix(j, J.headX, 0.4, down);
  later((jj) => {
    mix(jj, leg(s, LEG.forward), 1.45, down); mix(jj, leg(s, LEG.knee), 0.05, down); mix(jj, leg(s, LEG.ankle), 0.5, down); mix(jj, leg(s, LEG.out), 0.05, down);
    mix(jj, leg(o, LEG.forward), 0.75, down); mix(jj, leg(o, LEG.knee), 2.0, down); mix(jj, leg(o, LEG.out), 0.35, down);
  });
  mix(j, arm(o, ARM.forward), -0.6, down); mix(j, arm(o, ARM.out), 0.5, down); mix(j, arm(o, ARM.elbow), 0.2, down);
  mix(j, arm(s, ARM.forward), 0.9, down); mix(j, arm(s, ARM.out), 1.0, down);
}

function feint(j: Joints, P: PlayerFrame, fx: number, fz: number): void {
  // the fake's side in the body's frame: + its left
  const left = P.feintX * fz - P.feintZ * fx, u = clamp(P.feintT / C.feintTime, 0, 1), w = envelope(P.feintT, C.feintTime, 0.03, 0.06);
  mix(j, J.pelvisZ, -Math.sign(left || 1) * key(u, [0, 0.35, 1, 0.1]), w);
  mix(j, J.chestZ, -Math.sign(left || 1) * 0.25, w);
  mix(j, arm(0, ARM.out), 0.7, w); mix(j, arm(1, ARM.out), 0.7, w);
}

// The skill moves, keyed on their timeline (packages/sim, skills.ts); the foot follows the ball
// where the simulation places it.
function skill(j: Joints, b: Body, P: PlayerFrame, x: number, z: number, fx: number, fz: number, k: number, bx: number, by: number, bz: number): void {
  const id = P.skill, side = P.skillSide || 1, dur = SKILL_DUR[id] ?? 0.3, u = clamp(P.skillT / dur, 0, 1);
  // the foot on the side the move goes: side +1 is the player's right, our leg 0
  const s = side > 0 ? 0 : 1, o = 1 - s, sd = side > 0 ? 1 : -1;
  const w = envelope(P.skillT, dur, 0.04, 0.08), r = C.ballRadius;
  const rx = -fz, rz = fx;   // the body's right, in the world
  const foot = (wx: number, wy: number, wz: number, leg_: number, ww: number, toes = 0, twist = 0.1) => {
    toRoot(x, z, fx, fz, k, wx, wy, wz, tmp);
    tmp.y = Math.max(tmp.y, b.ankle * 0.9);
    footAt(leg_, tmp, ww, twist, toes);
  };
  switch (id) {
    case "tunnel":
      mix(j, J.pelvisX, 0.15, w); mix(j, J.chestX, 0.25, w);
      break;
    case "dragback":
      // the sole on top of the ball pulls it back while the body turns
      if (u < 0.55) foot(bx, by + r * 0.9, bz, s, w * (1 - ramp(u, 0.45, 0.55)), 0.3);
      mix(j, J.chestX, -0.15, w);
      break;
    case "feint":
      mix(j, J.pelvisZ, sd * key(u, [0, 0, 0.4, 0.35, 1, -0.2]), w);
      mix(j, J.chestZ, sd * key(u, [0, 0, 0.4, 0.3, 1, -0.2]), w);
      mix(j, arm(o, ARM.out), 0.9, w);
      break;
    case "stepover":
      // the leg circles over the ball from inside to outside, the body dips that way
      if (u < 0.5) {
        const a = Math.PI * ramp(u, 0.02, 0.45);
        foot(bx - rx * sd * Math.cos(a) * 0.13, by + Math.sin(a) * 0.12, bz - rz * sd * Math.cos(a) * 0.13, s, w);
      }
      mix(j, J.pelvisZ, -sd * key(u, [0, 0, 0.45, 0.3, 1, -0.15]), w);
      mix(j, arm(o, ARM.out), 0.8, w); mix(j, arm(s, ARM.out), 0.5, w);
      break;
    case "roll":
      // the sole rolls the ball across, the body steps sideways after it
      foot(bx, by + r * 0.9, bz, s, w * (1 - ramp(u, 0.85, 1)), 0.3);
      mix(j, J.pelvisZ, sd * 0.2, w); mix(j, arm(s, ARM.out), 0.7, w); mix(j, arm(o, ARM.out), 0.7, w);
      break;
    case "heelchop":
      // the heel behind the standing leg strikes the ball the other way
      later((jj) => {
        mix(jj, leg(s, LEG.forward), key(u, [0, -0.6, 0.3, -0.2, 1, 0]), w);
        mix(jj, leg(s, LEG.out), key(u, [0, -0.4, 0.4, -0.1, 1, 0]), w);
        mix(jj, leg(s, LEG.knee), key(u, [0, 1.1, 0.4, 0.4, 1, 0.2]), w);
      });
      mix(j, J.chestY, sd * 0.4, w); mix(j, arm(o, ARM.out), 0.8, w);
      break;
    case "roulette":
      // one sole, then the other, on the ball as the body turns round
      foot(bx, by + r * 0.9, bz, u < 0.5 ? s : o, w * (u < 0.5 ? 1 - ramp(u, 0.4, 0.5) : ramp(u, 0.5, 0.6) * (1 - ramp(u, 0.9, 1))), 0.3);
      j[J.offY] = j[J.offY]! - 0.02 * w; mix(j, arm(0, ARM.out), 0.8, w); mix(j, arm(1, ARM.out), 0.8, w);
      break;
    case "sombrero":
      // the toe under the ball, then the flick up over the defender at the contact (u = 0,8)
      if (!P.skillKicked) foot(bx - fx * r * 0.9, Math.max(0, by - r * 0.4) + 0.03 * ramp(u, 0.6, 0.8), bz - fz * r * 0.9, s, w, 0.4);
      mix(j, J.chestX, -0.12, w); mix(j, arm(0, ARM.out), 0.6, w); mix(j, arm(1, ARM.out), 0.6, w);
      break;
    case "elastico": {
      // the outside of the foot pushes the ball out, the inside snaps it back across
      const push = u < 0.4 ? 1 : -1;
      foot(bx - rx * sd * push * (r + 0.04), by, bz - rz * sd * push * (r + 0.04), s, w * (1 - ramp(u, 0.85, 1)), 0.1, push > 0 ? -0.5 : 0.6);
      mix(j, J.pelvisZ, sd * key(u, [0, 0, 0.4, 0.25, 1, -0.2]), w);
      mix(j, arm(o, ARM.out), 0.9, w);
      break;
    }
    default: break;
  }
}

// A hit taken: pushed along the knock, the arms thrown out, the head back; a violent one floors him.
function reaction(j: Joints, P: PlayerFrame, fx: number, fz: number, time: number): void {
  const strength = P.reactSheet.endsWith("violent") ? 1.3 : P.reactSheet.endsWith("strong") ? 1 : P.reactSheet.endsWith("weak") ? 0.5 : 0.75;
  const m = Math.hypot(P.knockX, P.knockZ) || 1, kx = P.knockX / m, kz = P.knockZ / m;
  const back = -(kx * fx + kz * fz), left = kx * fz - kz * fx;
  const t = C.hitReact - P.react, w = Math.min(1, envelope(t, C.hitReact, 0.04, 0.2) * strength);
  mix(j, J.pelvisX, -back * 0.35, w); mix(j, J.pelvisZ, -left * 0.45, w);
  mix(j, J.chestX, -back * 0.3, w); mix(j, J.headX, -0.35, w);
  for (let s = 0; s < 2; s++) { mix(j, arm(s, ARM.out), 1.2 + 0.2 * Math.sin(time * 18 + s), w); mix(j, arm(s, ARM.forward), 0.6 * Math.sin(time * 14 + s * 2), w); }
  if (strength > 1.2) {
    const down = key(t, [0, 0, 0.15, 1, 0.45, 1, C.hitReact, 0]);
    j[J.offY] = j[J.offY]! - 0.18 * down;
    mix(j, J.pelvisX, -1.1 * Math.sign(back || 1), down);
  }
}

function fooled(j: Joints, P: PlayerFrame, fx: number, fz: number): void {
  const left = P.foolX * fz - P.foolZ * fx, w = clamp(P.fooled / 0.15, 0, 1);
  mix(j, J.pelvisZ, -left * 0.35, w); mix(j, J.chestZ, -left * 0.25, w);
  later((jj) => { mix(jj, leg(0, LEG.out), -0.15, w); mix(jj, leg(1, LEG.out), -0.15, w); });
  mix(j, arm(0, ARM.out), 1.0, w); mix(j, arm(1, ARM.out), 1.0, w);
}

// The comet (match.ts, special): gathering, then turning slowly with the leg drawn high behind
// while the meter runs in the slowed world; the strike is the kick (kickMove, "comet").
function comet(j: Joints, state: string, t: number, s: number): void {
  const o = 1 - s, side = s === 0 ? 1 : -1;
  if (state === "charge") {
    const w = ramp(t, 0, 0.15);
    j[J.offY] = j[J.offY]! - 0.04 * w;
    mix(j, J.chestX, 0.35, w); mix(j, J.headX, 0.3, w);
    for (let q = 0; q < 2; q++) { mix(j, arm(q, ARM.forward), 0.9, w); mix(j, arm(q, ARM.out), -0.3, w); mix(j, arm(q, ARM.elbow), 1.8, w); }
  } else if (state === "meter") {
    const w = ramp(t, 0, 0.2);
    mix(j, J.pelvisY, side * 0.25 * Math.sin(t * 3), w);
    later((jj) => { mix(jj, leg(s, LEG.forward), -1.1, w); mix(jj, leg(s, LEG.knee), 1.6, w); });
    mix(j, J.chestX, -0.15, w); mix(j, J.chestY, -side * 0.45, w);
    mix(j, arm(s, ARM.forward), -0.8, w); mix(j, arm(s, ARM.out), 1.2, w);
    mix(j, arm(o, ARM.forward), 1.1, w); mix(j, arm(o, ARM.out), 0.9, w);
  }
}

// Six ways to celebrate, one per player (Animator, celebrateKind).
function celebrate(j: Joints, kind: number, t: number, time: number): void {
  const w = ramp(t, 0, 0.25);
  switch (kind) {
    case 0: { // jumping with a fist up
      const hop = Math.max(0, Math.sin(t * 8));
      j[J.offY] = j[J.offY]! + 0.08 * hop * w;
      mix(j, arm(0, ARM.forward), 2.9, w); mix(j, arm(0, ARM.elbow), 0.3 + 0.5 * hop, w); mix(j, arm(1, ARM.out), 0.6, w); mix(j, arm(1, ARM.elbow), 1.5, w);
      break;
    }
    case 1: // the aeroplane, banking side to side
      mix(j, arm(0, ARM.out), 1.5, w); mix(j, arm(1, ARM.out), 1.5, w); mix(j, arm(0, ARM.elbow), 0.05, w); mix(j, arm(1, ARM.elbow), 0.05, w);
      mix(j, J.pelvisZ, 0.3 * Math.sin(t * 3), w); mix(j, J.chestX, 0.2, w);
      break;
    case 2: // on his knees, arms to the sky
      j[J.offY] = j[J.offY]! - 0.12 * w;
      later((jj) => { mix(jj, leg(0, LEG.knee), 1.9, w); mix(jj, leg(1, LEG.knee), 1.9, w); mix(jj, leg(0, LEG.forward), 0.3, w); mix(jj, leg(1, LEG.forward), 0.3, w); });
      mix(j, J.chestX, -0.35, w); mix(j, J.headX, -0.4, w);
      mix(j, arm(0, ARM.forward), 2.7, w); mix(j, arm(1, ARM.forward), 2.7, w); mix(j, arm(0, ARM.out), 0.4, w); mix(j, arm(1, ARM.out), 0.4, w);
      break;
    case 3: // a dance: hips and arms in turn
      mix(j, J.pelvisZ, 0.18 * Math.sin(time * 9), w); mix(j, J.chestZ, -0.2 * Math.sin(time * 9), w);
      mix(j, arm(0, ARM.forward), 1.4 + 1.2 * Math.sin(time * 9), w); mix(j, arm(1, ARM.forward), 1.4 - 1.2 * Math.sin(time * 9), w);
      mix(j, arm(0, ARM.elbow), 1.2, w); mix(j, arm(1, ARM.elbow), 1.2, w);
      j[J.offY] = j[J.offY]! + 0.02 * Math.abs(Math.sin(time * 9)) * w;
      break;
    case 4: { // a backflip, then arms up
      const flip = ramp(t, 0.15, 0.85);
      j[J.offY] = j[J.offY]! + 0.35 * Math.sin(Math.PI * flip) * w;
      j[J.pelvisX] = j[J.pelvisX]! - Math.PI * 2 * flip * w;
      later((jj) => { mix(jj, leg(0, LEG.knee), 1.6 * Math.sin(Math.PI * flip), w); mix(jj, leg(1, LEG.knee), 1.6 * Math.sin(Math.PI * flip), w); });
      mix(j, arm(0, ARM.forward), 2.8, w * ramp(t, 0.85, 1.1)); mix(j, arm(1, ARM.forward), 2.8, w * ramp(t, 0.85, 1.1));
      break;
    }
    default: // both arms up, shaking the fists
      mix(j, arm(0, ARM.forward), 2.8, w); mix(j, arm(1, ARM.forward), 2.8, w);
      mix(j, arm(0, ARM.out), 0.5 + 0.15 * Math.sin(time * 16), w); mix(j, arm(1, ARM.out), 0.5 + 0.15 * Math.sin(time * 16 + 1), w);
      mix(j, J.headX, -0.3, w);
  }
}

// After a goal conceded: hands on the head, or on the knees.
function dejected(j: Joints, kind: number, t: number): void {
  const w = ramp(t, 0.2, 0.6);
  if (kind % 2 === 0) {
    for (let s = 0; s < 2; s++) { mix(j, arm(s, ARM.forward), 2.4, w); mix(j, arm(s, ARM.out), 0.9, w); mix(j, arm(s, ARM.elbow), 2.3, w); }
    mix(j, J.headX, 0.25, w);
  } else {
    j[J.offY] = j[J.offY]! - 0.03 * w;
    mix(j, J.pelvisX, 0.45, w); mix(j, J.chestX, 0.3, w); mix(j, J.headX, 0.35, w);
    for (let s = 0; s < 2; s++) { mix(j, arm(s, ARM.forward), 0.9, w); mix(j, arm(s, ARM.out), 0.25, w); mix(j, arm(s, ARM.elbow), 0.2, w); }
  }
}

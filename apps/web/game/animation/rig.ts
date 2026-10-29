// The stylised footballer's skeleton, written in TypeScript (docs/PIANO-3D-ONLINE.md, section 4.7):
// root, pelvis, chest, head, shoulders, elbows, hands, hips, knees, ankles, plus a tail, a lock of
// hair and a cape for the characters that have one. A pose is a list of joint angles (J); the
// forward kinematics turn it into one matrix a bone, written straight into the bone texture of the
// one SkinnedMesh that draws every player (character.ts).
//
// The run follows the simulation: the stride's phase and the gait (walk, run, sprint) come from
// packages/sim (Match.advanceGait), the speed sets how far legs and arms swing, the turn rate
// leans the body into the curve, the head turns toward the ball. The moves of section 4.7 are
// keyed clips layered on top (moves.ts).
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import type { PlayerMotion } from "./appearance";
import { hipHeight, type Body } from "../render/body";
import { CHARACTER_HEIGHT } from "../render/style";

export const BONE = {
  root: 0, pelvis: 1, chest: 2, head: 3,
  shoulderR: 4, elbowR: 5, handR: 6, shoulderL: 7, elbowL: 8, handL: 9,
  hipR: 10, kneeR: 11, ankleR: 12, hipL: 13, kneeL: 14, ankleL: 15,
  tail: 16, tailTip: 17, hair: 18, cape: 19,
} as const;
export type BoneName = keyof typeof BONE;
export const BONES_PER_PLAYER = 20;
// side 0 is the right (-x of a body facing +z), side 1 the left
export const SHOULDER = [BONE.shoulderR, BONE.shoulderL] as const;
export const ELBOW = [BONE.elbowR, BONE.elbowL] as const;
export const HAND = [BONE.handR, BONE.handL] as const;
export const HIP = [BONE.hipR, BONE.hipL] as const;
export const KNEE = [BONE.kneeR, BONE.kneeL] as const;
export const ANKLE = [BONE.ankleR, BONE.ankleL] as const;

// The joint channels of a pose, in radians unless said. Signs: + leans or swings forward, + bends
// a knee or an elbow, + turns to the body's left, + rolls toward the body's left side.
export const J = {
  offX: 0, offY: 1, offZ: 2,             // pelvis moved from where it stands, body units, x to the left, z forward
  pelvisX: 3, pelvisY: 4, pelvisZ: 5,    // the whole body about the pelvis: lean, turn, roll
  chestX: 6, chestY: 7, chestZ: 8,
  headX: 9, headY: 10, headZ: 11,
  arm: 12,                               // + side * 5: shoulder forward, out, twist, elbow, wrist
  leg: 22,                               // + side * 5: hip forward, out, twist, knee, ankle (toes up +)
  tailX: 32, tailY: 33, hairX: 34, hairY: 35, capeX: 36,
  count: 37,
} as const;
export const ARM = { forward: 0, out: 1, twist: 2, elbow: 3, wrist: 4 } as const;
export const LEG = { forward: 0, out: 1, twist: 2, knee: 3, ankle: 4 } as const;
export type Joints = Float32Array;
export const newJoints = (): Joints => new Float32Array(J.count);
export const arm = (side: number, k: number): number => J.arm + side * 5 + k;
export const leg = (side: number, k: number): number => J.leg + side * 5 + k;

// What the simulation says a player is doing (appearance.ts, the player look layer).
export type PoseInput = PlayerMotion;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ease = (u: number) => u * u * (3 - 2 * u);

// The run, the stance and the held states of the simulation, as joint angles.
export function locomotion(p: PoseInput, b: Body, j: Joints): void {
  j.fill(0);
  const run = clamp(p.speed / 7.5, 0, 1), still = p.speed < 0.3;
  const t = p.phase * Math.PI * 2;
  let thighAmp = 0.12 + 0.75 * run, kneeAmp = 0.25 + 1.25 * run, armAmp = 0.1 + 0.85 * run;
  let lean = 0.04 + 0.22 * run + (p.gait === "sprint" ? 0.08 : 0);
  let bob = still ? 0.006 * Math.sin(p.time * 2.2) : -Math.abs(Math.sin(t)) * (0.012 + 0.035 * run);
  const roll = clamp(p.turnRate * p.speed * 0.012, -0.32, 0.32);
  let crouch = 0;
  if (still) { thighAmp = 0; kneeAmp = 0.12; armAmp = 0; lean = 0.03; }
  const legs = [0, 0], knees = [0, 0], arms = [0, 0], elbows = [0, 0], armOut = [0.12, 0.12];
  for (let s = 0; s < 2; s++) {
    const ph = t + (s === 0 ? 0 : Math.PI);
    legs[s] = Math.sin(ph) * thighAmp;
    // the knee bends most while the leg swings forward under the body
    knees[s] = still ? kneeAmp : 0.1 + kneeAmp * Math.max(0, Math.cos(ph - 0.6));
    arms[s] = -Math.sin(ph) * armAmp;
    elbows[s] = 0.35 + 1.05 * run;
  }
  if (p.kick >= 0) {                // the right foot swings through the ball
    const u = p.kick, back = u < 0.35 ? ease(u / 0.35) : 1 - ease((u - 0.35) / 0.65);
    legs[0] = u < 0.35 ? -0.6 * back : 1.1 * ease(clamp((u - 0.35) / 0.3, 0, 1)) * (1 - 0.6 * ease(clamp((u - 0.65) / 0.35, 0, 1)));
    knees[0] = u < 0.35 ? 1.2 * back : 0.2;
    legs[1] = -0.1; knees[1] = 0.25; arms[0] = 0.5; arms[1] = -0.6; armOut[0] = 0.5; armOut[1] = 0.5; lean = 0.12;
  }
  if (p.charge >= 0) { legs[0] = -0.5 * p.charge; knees[0] = 0.9 * p.charge; arms[1] = 0.4 * p.charge; armOut[0] = 0.35; lean = 0.15; }
  if (p.slide >= 0) {               // down on the hip, the leading leg out in front
    const down = p.slide < 0.5 ? ease(p.slide / 0.5) : 1 - ease((p.slide - 0.5) / 0.5);
    crouch = 0.17 * down; lean = -0.5 * down; legs[0] = 1.35 * down; knees[0] = 0.1; legs[1] = 0.9 * down; knees[1] = 1.5 * down;
    arms[0] = -0.5 * down; arms[1] = -0.5 * down; armOut[0] = 0.6 * down; armOut[1] = 0.6 * down;
  }
  if (p.lunge) { lean = 0.35; armOut[0] = 0.05; armOut[1] = 0.05; arms[0] = -0.2; arms[1] = 0.2; }
  if (p.react > 0) { const r = clamp(p.react / 0.6, 0, 1); lean = -0.35 * r; armOut[0] = 0.7 * r; armOut[1] = 0.7 * r; arms[0] = 0.3 * r; arms[1] = 0.3 * r; }
  if (p.hold) { arms[0] = 1.25; arms[1] = 1.25; elbows[0] = 0.5; elbows[1] = 0.5; armOut[0] = 0.15; armOut[1] = 0.15; }
  if (p.celebrate >= 0 && still) {
    const jump = Math.max(0, Math.sin(p.celebrate * 7)) * 0.12;
    bob = jump; arms[0] = 2.9; arms[1] = 2.9; elbows[0] = 0.2; elbows[1] = 0.2; armOut[0] = 0.35; armOut[1] = 0.35;
  }
  const hip = hipHeight(b);
  j[J.offY] = hip * (Math.cos(Math.min(0.6, run * 0.25)) - 1) + bob - crouch;
  j[J.pelvisX] = lean * 0.35; j[J.pelvisZ] = roll;
  j[J.chestX] = lean * 0.65; j[J.chestY] = -arms[0]! * 0.12; j[J.chestZ] = roll * 0.4;
  j[J.headX] = -0.05 - lean * 0.4; j[J.headY] = clamp(p.lookYaw, -1.0, 1.0) * 0.8;
  for (let s = 0; s < 2; s++) {
    j[arm(s, ARM.forward)] = arms[s]!; j[arm(s, ARM.out)] = armOut[s]!; j[arm(s, ARM.elbow)] = elbows[s]!;
    j[leg(s, LEG.forward)] = legs[s]!; j[leg(s, LEG.knee)] = knees[s]!;
    // the boot stays level with the ground while the shin swings
    j[leg(s, LEG.ankle)] = -(knees[s]! - legs[s]!) * 0.6;
  }
  // the hair and the tail trail behind a running body
  j[J.hairX] = -0.15 - 0.5 * run + 0.06 * Math.sin(t * 2);
  j[J.tailX] = -0.3 - 0.4 * run; j[J.tailY] = 0.35 * Math.sin(t + p.time * 0.5);
  j[J.capeX] = 0.2 + 0.7 * run;
}

// Scratch objects: the pose of all the players is worked out without allocating.
const qa = new Quaternion(), ea = new Euler(), va = new Vector3(), sa = new Vector3(1, 1, 1);
function local(out: Matrix4, parent: Matrix4, tx: number, ty: number, tz: number, rx: number, ry: number, rz: number, order: "XYZ" | "YXZ" | "ZXY"): Matrix4 {
  qa.setFromEuler(ea.set(rx, ry, rz, order));
  out.compose(va.set(tx, ty, tz), qa, sa.set(1, 1, 1));
  return out.premultiply(parent);
}
const M = Array.from({ length: BONES_PER_PLAYER }, () => new Matrix4());
const IDENTITY = new Matrix4();

// Writes the bones of one player, from his place on the pitch and his joints, into out at bone
// index base (out holds 16 numbers a bone). breathe scales the chest's shapes when standing.
export function skeleton(x: number, z: number, fx: number, fz: number, height: number, b: Body, j: Joints, out: Float32Array, base: number, breathe = 1): void {
  const yaw = Math.atan2(fx, fz);
  const root = M[BONE.root]!;
  local(root, IDENTITY, x, 0, z, 0, yaw, 0, "YXZ");
  const k = CHARACTER_HEIGHT * height;
  root.scale(sa.set(k, k, k));
  const pelvis = local(M[BONE.pelvis]!, root, j[J.offX]!, hipHeight(b) + j[J.offY]!, j[J.offZ]!, j[J.pelvisX]!, j[J.pelvisY]!, j[J.pelvisZ]!, "ZXY");
  const chest = local(M[BONE.chest]!, pelvis, 0, b.pelvisUp, 0, j[J.chestX]!, j[J.chestY]!, j[J.chestZ]!, "YXZ");
  local(M[BONE.head]!, chest, 0, b.torso + b.neck, 0, j[J.headX]!, j[J.headY]!, j[J.headZ]!, "YXZ");
  for (let s = 0; s < 2; s++) {
    const side = s === 0 ? 1 : -1, a = J.arm + s * 5, l = J.leg + s * 5;
    const sh = local(M[SHOULDER[s]!]!, chest, -side * b.shoulderW, b.torso - 0.25 * b.torso, 0, -j[a]!, side * j[a + 2]!, -side * j[a + 1]!, "ZXY");
    const el = local(M[ELBOW[s]!]!, sh, 0, -b.upperArm, 0, -j[a + 3]!, 0, 0, "XYZ");
    local(M[HAND[s]!]!, el, 0, -b.forearm, 0, -j[a + 4]!, 0, 0, "XYZ");
    const hp = local(M[HIP[s]!]!, pelvis, -side * b.hipW, -0.02, 0, -j[l]!, side * j[l + 2]!, -side * (0.02 + j[l + 1]!), "XYZ");
    const kn = local(M[KNEE[s]!]!, hp, 0, -b.thigh, 0, j[l + 3]!, 0, 0, "XYZ");
    local(M[ANKLE[s]!]!, kn, 0, -b.shin, 0, -j[l + 4]!, 0, 0, "XYZ");
  }
  const tail = local(M[BONE.tail]!, pelvis, 0, 0.0, -b.chestD * 0.9, j[J.tailX]!, j[J.tailY]!, 0, "YXZ");
  local(M[BONE.tailTip]!, tail, 0, 0, -0.12, j[J.tailX]! * 0.7, j[J.tailY]! * 1.2, 0, "YXZ");
  local(M[BONE.hair]!, M[BONE.head]!, 0, b.headR * 1.35, -b.headR * 0.85, j[J.hairX]!, j[J.hairY]!, 0, "YXZ");
  local(M[BONE.cape]!, chest, 0, b.torso, -b.chestD * 0.9, j[J.capeX]!, 0, 0, "XYZ");
  for (let i = 0; i < BONES_PER_PLAYER; i++) {
    const m = M[i]!;
    if (i === BONE.chest && breathe !== 1) { m.scale(sa.set(breathe, 1, breathe)); m.toArray(out, (base + i) * 16); m.scale(sa.set(1 / breathe, 1, 1 / breathe)); }
    else m.toArray(out, (base + i) * 16);
  }
}

// Where a bone of player base is, from the matrices skeleton() wrote.
export function bonePosition(out: Float32Array, base: number, bone: number): Vector3 {
  const o = (base + bone) * 16;
  return new Vector3(out[o + 12], out[o + 13], out[o + 14]);
}

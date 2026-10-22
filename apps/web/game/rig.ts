// The stylised footballer's skeleton, written in TypeScript (docs/PIANO-3D-ONLINE.md, section 4.7):
// root, pelvis, chest, head, shoulders, elbows, hands, hips, knees, ankles, plus a tail, a lock of
// hair and a cape for the characters that have one. A pose is a list of joint angles (J); the
// forward kinematics turn it into one matrix a bone, written straight into the bone texture of the
// one SkinnedMesh that draws every player (character.ts). The poses come from moves.ts.
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { hipHeight, type Body } from "./body.ts";
import { CHARACTER_HEIGHT } from "./style.ts";

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

// Standing at ease: knees a little bent, arms loose, breathing; the head turned by lookYaw. The
// showroom's pose (showroom.ts); the match poses with moves.ts.
export function stance(j: Joints, time: number, lookYaw = 0): void {
  j.fill(0);
  j[J.offY] = 0.006 * Math.sin(time * 2.2) - 0.004;
  j[J.pelvisX] = 0.012; j[J.chestX] = 0.018;
  j[J.headX] = -0.05; j[J.headY] = Math.max(-1, Math.min(1, lookYaw)) * 0.8;
  for (let s = 0; s < 2; s++) {
    j[arm(s, ARM.out)] = 0.14; j[arm(s, ARM.elbow)] = 0.35;
    j[leg(s, LEG.knee)] = 0.12; j[leg(s, LEG.forward)] = 0.04;
    // the sole flat: the foot's pitch is the pelvis's, less the hip's swing, plus the knee's bend
    j[leg(s, LEG.ankle)] = j[J.pelvisX]! - j[leg(s, LEG.forward)]! + j[leg(s, LEG.knee)]!;
  }
  j[J.hairX] = -0.15; j[J.tailX] = -0.3; j[J.tailY] = 0.3 * Math.sin(time * 1.3); j[J.capeX] = 0.2;
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

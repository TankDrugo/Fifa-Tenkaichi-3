// The stylised footballer: a skeleton written in TypeScript (pelvis, chest, neck, head, shoulders,
// upper arms, forearms, hands, thighs, shins, feet) and the shapes hung on its bones
// (docs/PIANO-3D-ONLINE.md, section 4.7). Toy proportions as in Mario Strikers: Battle League:
// a head nearly 40% of the height, short legs, big gloves and boots, joints hidden by spheres.
// Each kind of shape is one InstancedMesh for all ten players (scene/Players.tsx), so the whole
// team costs one draw call per kind of shape, not one per shape.
//
// The run follows the simulation: the stride's phase and the gait (walk, run, sprint) come from
// packages/sim (Match.advanceGait), the speed sets how far legs and arms swing, the turn rate
// leans the body into the curve, the head turns toward the ball. Phase 3 replaces the poses with
// the moves of section 4.7; here the run, and a few states held long enough to be seen (shot,
// slide, hit taken, the keeper holding the ball, the celebration).
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { CHARACTER_HEIGHT } from "./style";

// Lengths of a body of height 1; on the pitch it is CHARACTER_HEIGHT (0,85 m) times the card's
// height (0,92-1,07).
export const BODY = {
  ankle: 0.035, shin: 0.13, thigh: 0.12, hipWidth: 0.072, pelvisUp: 0.03,
  torso: 0.24, shoulderWidth: 0.15, upperArm: 0.12, forearm: 0.11, neck: 0.015, headRadius: 0.2,
};
export const HIP_HEIGHT = BODY.ankle + BODY.shin + BODY.thigh;

// The shapes: what each instance is, its colour role, and how many each player has.
export type ColourRole = "skin" | "hair" | "eye" | "shirt" | "shorts" | "socks" | "boots" | "gloves";
export type PartKind = "head" | "hair" | "eye" | "neck" | "torso" | "pelvis" | "upperArm" | "forearm" | "hand" | "joint" | "thigh" | "shortsLeg" | "shin" | "foot";
export const PER_PLAYER: Record<PartKind, number> = {
  head: 1, hair: 1, eye: 2, neck: 1, torso: 1, pelvis: 1, upperArm: 2, forearm: 2, hand: 2,
  joint: 6, thigh: 2, shortsLeg: 2, shin: 2, foot: 2,
};
export const PART_KINDS = Object.keys(PER_PLAYER) as PartKind[];
// the joint spheres: shoulders (shirt), elbows and knees (skin)
export const JOINT_ROLES: ColourRole[] = ["shirt", "shirt", "skin", "skin", "skin", "skin"];
export const PART_ROLE: Record<PartKind, ColourRole | null> = {
  head: "skin", hair: "hair", eye: "eye", neck: "skin", torso: "shirt", pelvis: "shorts", upperArm: "shirt",
  forearm: "skin", hand: "gloves", joint: null, thigh: "skin", shortsLeg: "shorts", shin: "socks", foot: "boots",
};

export interface PoseInput {
  x: number; z: number; fx: number; fz: number;
  height: number;
  speed: number;
  gait: "walk" | "run" | "sprint";
  phase: number;            // 0..1 along the stride (packages/sim, Player.phase)
  turnRate: number;         // rad/s of the facing, + to the left
  lookYaw: number;          // rad, where the ball is from the facing, + to the left
  time: number;             // s, for breathing when still
  // states of packages/sim, -1 or 0 when off
  kick: number;             // 0..1 through a kick, -1 off
  slide: number;            // 0..1 through a slide and getting up, -1 off
  react: number;            // seconds left of a hit taken
  lunge: boolean;           // throwing a shoulder
  hold: boolean;            // a keeper with the ball in his hands
  celebrate: number;        // seconds into a celebration, -1 off
  charge: number;           // 0..1 of a shot being charged, -1 off
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ease = (u: number) => u * u * (3 - 2 * u);

// Scratch objects: the pose of all ten players is worked out without allocating.
const qa = new Quaternion(), ea = new Euler(), va = new Vector3(), sa = new Vector3();
function local(out: Matrix4, parent: Matrix4, tx: number, ty: number, tz: number, rx: number, ry: number, rz: number, order: "XYZ" | "YXZ" | "ZXY" = "XYZ"): Matrix4 {
  qa.setFromEuler(ea.set(rx, ry, rz, order));
  out.compose(va.set(tx, ty, tz), qa, sa.set(1, 1, 1));
  return out.premultiply(parent);
}
// a shape hung on a bone: offset along the bone and its own size
function shape(out: Matrix4, bone: Matrix4, tx: number, ty: number, tz: number, sx: number, sy: number, sz: number): Matrix4 {
  out.compose(va.set(tx, ty, tz), qa.identity(), sa.set(sx, sy, sz));
  return out.premultiply(bone);
}

const IDENTITY = new Matrix4();
const root = new Matrix4(), pelvis = new Matrix4(), chest = new Matrix4(), head = new Matrix4();
const shoulder = new Matrix4(), elbow = new Matrix4(), hip = new Matrix4(), knee = new Matrix4(), ankle = new Matrix4();

// Writes the matrices of one player's shapes into out[kind][index], index from the player's first slot.
export function posePlayer(p: PoseInput, out: Record<PartKind, Matrix4[]>, slot: number): void {
  const B = BODY, h = p.height;
  const run = clamp(p.speed / 7.5, 0, 1), still = p.speed < 0.3;
  const t = p.phase * Math.PI * 2;
  // swing of the legs and arms, the knee's bend and the body's lean by speed
  let thighAmp = 0.12 + 0.75 * run, kneeAmp = 0.25 + 1.25 * run, armAmp = 0.1 + 0.85 * run;
  let lean = 0.04 + 0.22 * run + (p.gait === "sprint" ? 0.08 : 0);
  let bob = still ? 0.006 * Math.sin(p.time * 2.2) : -Math.abs(Math.sin(t)) * (0.012 + 0.035 * run);
  const roll = clamp(p.turnRate * p.speed * 0.012, -0.32, 0.32);
  let crouch = 0;
  if (still) { thighAmp = 0; kneeAmp = 0.12; armAmp = 0; lean = 0.03; }
  // per side: thigh swing (forward +), knee bend, arm swing (forward +), elbow bend, arm out
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

  const yaw = Math.atan2(p.fx, p.fz);
  local(root, IDENTITY, p.x, 0, p.z, 0, yaw, 0, "YXZ");
  const k = CHARACTER_HEIGHT * h;
  root.scale(sa.set(k, k, k));
  const hipY = HIP_HEIGHT * Math.cos(Math.min(0.6, run * 0.25)) + bob - crouch;
  local(pelvis, root, 0, hipY, 0, lean * 0.35, 0, roll, "ZXY");
  local(chest, pelvis, 0, B.pelvisUp, 0, lean * 0.65, -arms[0]! * 0.12, roll * 0.4, "YXZ");
  shape(out.pelvis[slot]!, pelvis, 0, 0.0, 0, 0.15, 0.1, 0.12);
  // the torso: a capsule of radius 1 and half height 1 (scene/Players.tsx) stretched to the chest
  const breathe = still ? 1 + 0.015 * Math.sin(p.time * 2.2) : 1;
  shape(out.torso[slot]!, chest, 0, B.torso * 0.5, 0, 0.16 * breathe, B.torso * 0.5, 0.12 * breathe);
  local(head, chest, 0, B.torso + B.neck, 0, -0.05 - lean * 0.4, clamp(p.lookYaw, -1.0, 1.0) * 0.8, 0, "YXZ");
  shape(out.neck[slot]!, chest, 0, B.torso, 0, 0.06, 0.03, 0.06);
  const R = B.headRadius;
  shape(out.head[slot]!, head, 0, R * 0.95, 0, R, R * 0.97, R * 0.95);
  // the hair: a cap over the head, tilted so it leaves the forehead (scene/Players.tsx)
  shape(out.hair[slot]!, head, 0, R * 0.98, -0.01, R * 1.06, R * 1.05, R * 1.06);
  for (let e = 0; e < 2; e++) shape(out.eye[slot * 2 + e]!, head, (e === 0 ? 1 : -1) * 0.068, R * 1.0, R * 0.86, 0.034, 0.05, 0.022);

  for (let s = 0; s < 2; s++) {
    const side = s === 0 ? 1 : -1, k = slot * 2 + s;
    // arms: s 0 is the right side (+x of the body is its left: the body faces +z)
    local(shoulder, chest, -side * B.shoulderWidth, B.torso - 0.06, 0, -arms[s]!, 0, -side * armOut[s]!, "ZXY");
    shape(out.joint[slot * 6 + s]!, shoulder, 0, 0, 0, 0.065, 0.065, 0.065);
    shape(out.upperArm[k]!, shoulder, 0, -B.upperArm * 0.5, 0, 0.05, B.upperArm * 0.5, 0.05);
    local(elbow, shoulder, 0, -B.upperArm, 0, -elbows[s]!, 0, 0);
    shape(out.joint[slot * 6 + 2 + s]!, elbow, 0, 0, 0, 0.045, 0.045, 0.045);
    shape(out.forearm[k]!, elbow, 0, -B.forearm * 0.5, 0, 0.044, B.forearm * 0.5, 0.044);
    // big gloves, as the reference's
    shape(out.hand[k]!, elbow, 0, -B.forearm - 0.045, 0.005, 0.068, 0.072, 0.064);
    // legs
    local(hip, pelvis, -side * B.hipWidth, -0.02, 0, -legs[s]!, 0, -side * 0.02, "XYZ");
    shape(out.shortsLeg[k]!, hip, 0, -0.035, 0, 0.072, 0.05, 0.072);
    shape(out.thigh[k]!, hip, 0, -B.thigh * 0.5, 0, 0.058, B.thigh * 0.5, 0.058);
    local(knee, hip, 0, -B.thigh, 0, knees[s]!, 0, 0);
    shape(out.joint[slot * 6 + 4 + s]!, knee, 0, 0, 0, 0.056, 0.056, 0.056);
    shape(out.shin[k]!, knee, 0, -B.shin * 0.5, 0, 0.056, B.shin * 0.5, 0.056);
    // the boot stays level with the ground while the shin swings
    local(ankle, knee, 0, -B.shin, 0, -(knees[s]! - legs[s]!) * 0.6, 0, 0);
    shape(out.foot[k]!, ankle, 0, -B.ankle * 0.4, 0.035, 0.068, 0.05, 0.11);
  }
}

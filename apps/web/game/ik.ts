// Two-bone inverse kinematics on the skeleton's own angles (rig.ts): the leg reaches a point with
// hip and knee, the arm with shoulder and elbow. Points are in the root's frame: origin on the
// ground under the player, x to his left, y up, z where he faces, in body units (metres divided by
// CHARACTER_HEIGHT times the card's height). Used to keep a foot planted while the body runs over
// it, to put the foot on the ball at the contact of a kick and the keeper's hands on the ball.
import { Euler, Matrix4, Vector3 } from "three";
import type { Body } from "./body.ts";
import { hipHeight } from "./body.ts";
import { ARM, arm, J, type Joints } from "./rig.ts";

const e = new Euler(), mp = new Matrix4(), mc = new Matrix4(), mt = new Matrix4(), v = new Vector3(), w = new Vector3();
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

// The pelvis's rotation in the root frame (as skeleton() composes it).
function pelvisMatrix(j: Joints, b: Body): Matrix4 {
  mp.makeRotationFromEuler(e.set(j[J.pelvisX]!, j[J.pelvisY]!, j[J.pelvisZ]!, "ZXY"));
  mp.setPosition(j[J.offX]!, hipHeight(b) + j[J.offY]!, j[J.offZ]!);
  return mp;
}

// Where the ankle of side s is, in the root frame, for the joints as they are.
export function anklePosition(j: Joints, b: Body, s: number, out = new Vector3()): Vector3 {
  const side = s === 0 ? 1 : -1, l = J.leg + s * 5;
  const P = pelvisMatrix(j, b);
  mt.makeRotationFromEuler(e.set(-j[l]!, side * j[l + 2]!, -side * (0.02 + j[l + 1]!), "XYZ"));
  mt.setPosition(-side * b.hipW, -0.02, 0);
  mc.multiplyMatrices(P, mt);
  const kb = j[l + 3]!;
  out.set(0, -b.thigh - b.shin * Math.cos(kb), -b.shin * Math.sin(kb)).applyMatrix4(mc);
  return out;
}

// Hip and knee of side s so that the ankle reaches target (root frame). The knee bends in the
// plane that holds the leg and the body's sideways axis turned by twist (+ the toes out), so it
// points forward as a knee does; the hip's angles are read back from that rotation. Returns how
// far the ankle stays from the target (out of reach: the leg stretches toward it).
export function legIK(j: Joints, b: Body, s: number, target: Vector3, twist = 0): number {
  const side = s === 0 ? 1 : -1, l = J.leg + s * 5;
  const P = pelvisMatrix(j, b);
  w.set(-side * b.hipW, -0.02, 0).applyMatrix4(P);
  v.copy(target).sub(w);
  mt.copy(P).setPosition(0, 0, 0).invert();
  v.applyMatrix4(mt);
  const a = b.thigh, c = b.shin, full = v.length();
  const d = clamp(full, Math.abs(a - c) + 1e-4, a + c - 1e-4);
  if (full > 1e-6) v.multiplyScalar(1 / full); else v.set(0, -1, 0);
  const kb = Math.PI - Math.acos(clamp((a * a + c * c - d * d) / (2 * a * c), -1, 1));
  // the ankle in the leg's own frame, and the frame it has to be turned into
  lh.set(0, -a - c * Math.cos(kb), -c * Math.sin(kb)).normalize();
  n.set(1, 0, 0).addScaledVector(v, -v.x);
  if (n.lengthSq() < 1e-8) n.set(0, 0, 1).addScaledVector(v, -v.z);
  n.normalize().applyAxisAngle(v, side * twist);
  m1.makeBasis(n, v, x3.crossVectors(n, v));
  m2.makeBasis(x1.set(1, 0, 0), lh, x3.crossVectors(x1, lh)).transpose();
  e.setFromRotationMatrix(m1.multiply(m2), "XYZ");
  j[l] = -e.x;
  j[l + 2] = side * e.y;
  j[l + 1] = -side * e.z - 0.02;
  j[l + 3] = kb;
  return anklePosition(j, b, s, w).distanceTo(target);
}
const n = new Vector3(), lh = new Vector3(), x1 = new Vector3(), x3 = new Vector3(), m1 = new Matrix4(), m2 = new Matrix4();

// The ankle's angle that keeps the foot level (toes = 0) or pitched by toes (+ up): the foot's
// pitch is the pelvis's, less the hip's swing, plus the knee's bend, less the ankle's.
export function levelFoot(j: Joints, s: number, toes = 0): void {
  const l = J.leg + s * 5;
  j[l + 4] = j[J.pelvisX]! - j[l]! + j[l + 3]! + toes;
}

// Where the shoulder of side s is, and the chest's rotation, in the root frame.
function chestMatrix(j: Joints, b: Body): Matrix4 {
  const P = pelvisMatrix(j, b);
  mt.makeRotationFromEuler(e.set(j[J.chestX]!, j[J.chestY]!, j[J.chestZ]!, "YXZ"));
  mt.setPosition(0, b.pelvisUp, 0);
  return mc.multiplyMatrices(P, mt);
}

// Where the wrist of side s is, in the root frame.
export function wristPosition(j: Joints, b: Body, s: number, out = new Vector3()): Vector3 {
  const side = s === 0 ? 1 : -1, a = J.arm + s * 5;
  const Cm = chestMatrix(j, b);
  mt.makeRotationFromEuler(e.set(-j[a]!, side * j[a + 2]!, -side * j[a + 1]!, "ZXY"));
  mt.setPosition(-side * b.shoulderW, b.torso * 0.75, 0);
  const m = new Matrix4().multiplyMatrices(Cm, mt);
  const eb = j[a + 3]!;
  return out.set(0, -b.upperArm - b.forearm * Math.cos(eb), b.forearm * Math.sin(eb)).applyMatrix4(m);
}

// Shoulder and elbow of side s so that the wrist reaches target (root frame), the twist at 0.
export function armIK(j: Joints, b: Body, s: number, target: Vector3): number {
  const side = s === 0 ? 1 : -1;
  const Cm = chestMatrix(j, b);
  w.set(-side * b.shoulderW, b.torso * 0.75, 0).applyMatrix4(Cm);
  v.copy(target).sub(w);
  mt.copy(Cm).setPosition(0, 0, 0).invert();
  v.applyMatrix4(mt);
  const a = b.upperArm, c = b.forearm, full = v.length();
  const d = clamp(full, Math.abs(a - c) + 1e-4, a + c - 1e-4);
  if (full > 1e-6) v.multiplyScalar(d / full); else v.set(0, -d, 0);
  const eb = Math.PI - Math.acos(clamp((a * a + c * c - d * d) / (2 * a * c), -1, 1));
  // the wrist in the arm's frame: forearm bent forward by the elbow
  const Y = -a - c * Math.cos(eb), Z = c * Math.sin(eb);
  const y1 = -Math.sqrt(Math.max(0, d * d - v.z * v.z));
  const rx = Math.atan2(v.z, y1) - Math.atan2(Z, Y);
  const rz = Math.atan2(-v.x / (y1 || -1e-6), v.y / (y1 || -1e-6));
  j[arm(s, ARM.forward)] = -rx;
  j[arm(s, ARM.out)] = -side * rz;
  j[arm(s, ARM.twist)] = 0;
  j[arm(s, ARM.elbow)] = eb;
  return wristPosition(j, b, s, w).distanceTo(target);
}

// From the world to the root frame of a player at (x, z) facing (fx, fz), scale k.
export function toRoot(x: number, z: number, fx: number, fz: number, k: number, wx: number, wy: number, wz: number, out: Vector3): Vector3 {
  const dx = wx - x, dz = wz - z;
  // the body's +z is the facing, its +x is the facing turned to the left: (fz, -fx)
  return out.set((dx * fz - dz * fx) / k, wy / k, (dx * fx + dz * fz) / k);
}
export function fromRoot(x: number, z: number, fx: number, fz: number, k: number, rx: number, ry: number, rz: number, out: Vector3): Vector3 {
  return out.set(x + (rx * fz + rz * fx) * k, ry * k, z + (-rx * fx + rz * fz) * k);
}

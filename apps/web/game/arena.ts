// The stadium: pitch, electric fence, goals, stands with the crowd, screens. Every part is one
// merged geometry, the crowd one InstancedMesh a side, so the stadium costs a handful of draw calls
// (docs/PIANO-3D-ONLINE.md, section 4.6: at most 150 a frame).
//
// What it takes from Mario Strikers: Battle League (its match screenshots, docs/DETTAGLI.md,
// "Gioco nuovo · fase 2"): a low lit fence you see through on every side instead of lines to go
// out of, chunky goals, tiers of small fans packed close behind the fence, framed screens above the
// far stand. The fence's pattern, the fans and the screens are this game's own.
//
// Sizes from packages/sim (C): pitch 28 x 16 m, goal 4,5 x 2,2 m and 1 m deep. The fence stands on
// the side lines and the goal lines, where the simulation bounces the ball (match.ts, stepBall).
import {
  AdditiveBlending, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, Color, CylinderGeometry,
  DoubleSide, Group, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, RepeatWrapping,
  SphereGeometry, SRGBColorSpace, type Material,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { C, rng } from "@ft3/sim";
import { DAY } from "./style";
import { standardMaterial } from "./materials";

const L = C.length / 2, W = C.width / 2, GW = C.goalWidth / 2, GH = C.goalHeight, GD = C.goalDepth;
// between the fence and the first tier
export const APRON = 1.4;
const FENCE_H = 1.0, ROWS = 12, ROW_DEPTH = 0.75, ROW_RISE = 0.42, FRONT = 0.9;

function box(w: number, h: number, d: number, x: number, y: number, z: number): BufferGeometry {
  return new BoxGeometry(w, h, d).translate(x, y, z);
}
function merged(parts: BufferGeometry[]): BufferGeometry {
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)), false);
  if (!g) throw new Error("arena: geometries do not merge");
  g.computeBoundingSphere();
  return g;
}
function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")!];
}

// ---- Pitch -----------------------------------------------------------------------------------
// Mowing stripes, a large emblem painted lighter in the middle, the lines; 64 px a metre.
function pitchTexture(): CanvasTexture {
  const P = 64, w = C.length * P, h = C.width * P;
  const [c, g] = canvas(w, h);
  const stripes = 14;
  for (let i = 0; i < stripes; i++) { g.fillStyle = DAY.grass[i % 2]!; g.fillRect(i * w / stripes, 0, w / stripes + 1, h); }
  const r = rng(7);
  for (let i = 0; i < 12000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,255,230" : "0,50,0"},0.05)`; g.fillRect(r() * w, r() * h, 2 + r() * 5, 2 + r() * 5); }
  const X = (x: number) => (x + L) * P, Z = (z: number) => (z + W) * P;
  // the emblem: a ball in a ring of eight lightning teeth, under the lines
  g.save(); g.translate(X(0), Z(0)); g.fillStyle = DAY.emblem;
  for (let k = 0; k < 8; k++) { g.rotate(Math.PI / 4); g.beginPath(); g.moveTo(3.4 * P, 0); g.lineTo(4.6 * P, 0.5 * P); g.lineTo(4.1 * P, 0); g.lineTo(4.9 * P, -0.35 * P); g.closePath(); g.fill(); }
  g.beginPath(); g.arc(0, 0, 3.2 * P, 0, Math.PI * 2); g.fill(); g.restore();
  g.strokeStyle = DAY.line; g.fillStyle = DAY.line; g.lineWidth = 0.12 * P;
  const line = (pts: [number, number][]) => { g.beginPath(); pts.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z)))); g.stroke(); };
  const inset = 0.06;
  line([[-L + inset, -W + inset], [L - inset, -W + inset], [L - inset, W - inset], [-L + inset, W - inset], [-L + inset, -W + inset]]);
  line([[0, -W], [0, W]]);
  g.beginPath(); g.arc(X(0), Z(0), 2.6 * P, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(X(0), Z(0), 0.18 * P, 0, Math.PI * 2); g.fill();
  for (const s of [-1, 1]) {
    line([[s * L, -4.2], [s * (L - 2.2), -4.2], [s * (L - 2.2), 4.2], [s * L, 4.2]]);
    g.beginPath(); g.arc(X(s * (L - 2.2)), Z(0), 1.6 * P, s > 0 ? Math.PI / 2 : -Math.PI / 2, s > 0 ? Math.PI * 1.5 : Math.PI / 2); g.stroke();
    g.beginPath(); g.arc(X(s * (L - 3.4)), Z(0), 0.15 * P, 0, Math.PI * 2); g.fill();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// ---- Fence -----------------------------------------------------------------------------------
// The fence's light: a lattice of diamonds brightest at the foot, fading up, seen through.
function fenceTexture(): CanvasTexture {
  const [c, g] = canvas(128, 128);
  const grad = g.createLinearGradient(0, 128, 0, 0);
  grad.addColorStop(0, "rgba(140,250,255,0.55)"); grad.addColorStop(1, "rgba(140,250,255,0.06)");
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = "rgba(230,255,255,0.95)"; g.lineWidth = 5;
  g.beginPath(); g.moveTo(0, 64); g.lineTo(64, 0); g.lineTo(128, 64); g.lineTo(64, 128); g.closePath(); g.stroke();
  g.fillStyle = "rgba(255,255,255,0.9)"; g.fillRect(0, 122, 128, 6);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}
// one strip of panel along a straight piece of fence, uv in metres so the diamonds stay square
function panel(x0: number, z0: number, x1: number, z1: number): BufferGeometry {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const pos = [x0, 0, z0, x1, 0, z1, x1, FENCE_H, z1, x0, FENCE_H, z0];
  const uv = [0, 0, len, 0, len, FENCE_H, 0, FENCE_H];
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeVertexNormals();
  return g;
}

// ---- Nets ------------------------------------------------------------------------------------
function netTexture(): CanvasTexture {
  const [c, g] = canvas(64, 64);
  g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 4;
  g.beginPath(); g.moveTo(32, 0); g.lineTo(64, 32); g.lineTo(32, 64); g.lineTo(0, 32); g.closePath(); g.stroke();
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}
// a box of net behind each goal mouth: back, two sides, roof; uv in metres x 3
function netGeometry(): BufferGeometry {
  const quads: number[][][] = [];
  for (const s of [-1, 1]) {
    const a = s * L, b = s * (L + GD);
    quads.push([[b, 0, -GW], [b, 0, GW], [b, GH, GW], [b, GH, -GW]]);
    for (const z of [-GW, GW]) quads.push([[a, 0, z], [b, 0, z], [b, GH, z], [a, GH, z]]);
    quads.push([[a, GH, -GW], [b, GH, -GW], [b, GH, GW], [a, GH, GW]]);
  }
  const pos: number[] = [], uv: number[] = [];
  for (const q of quads) {
    const d = (i: number, j: number) => Math.hypot(q[i]![0]! - q[j]![0]!, q[i]![1]! - q[j]![1]!, q[i]![2]! - q[j]![2]!) * 3;
    const du = d(1, 0), dv = d(3, 0), uvs = [[0, 0], [du, 0], [du, dv], [0, dv]];
    for (const i of [0, 1, 2, 0, 2, 3]) { pos.push(...q[i]!); uv.push(...uvs[i]!); }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
  g.computeVertexNormals();
  return g;
}

// ---- Screens ---------------------------------------------------------------------------------
function screenTexture(): CanvasTexture {
  const [c, g] = canvas(512, 256);
  const grad = g.createLinearGradient(0, 0, 512, 256);
  grad.addColorStop(0, "#1b3fa8"); grad.addColorStop(1, "#11a6d8");
  g.fillStyle = grad; g.fillRect(0, 0, 512, 256);
  g.fillStyle = "rgba(255,255,255,0.12)";
  for (let i = -256; i < 512; i += 48) { g.beginPath(); g.moveTo(i, 256); g.lineTo(i + 24, 256); g.lineTo(i + 280, 0); g.lineTo(i + 256, 0); g.fill(); }
  g.fillStyle = "#ffffff"; g.beginPath(); g.arc(256, 128, 70, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#1b3fa8";
  for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5 - Math.PI / 2; g.beginPath(); g.arc(256 + Math.cos(a) * 42, 128 + Math.sin(a) * 42, 17, 0, Math.PI * 2); g.fill(); }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

// ---- Crowd -----------------------------------------------------------------------------------
// A small fan: a big head on a short body, 36 triangles. They jump in the shader (materials.ts).
function fanGeometry(): BufferGeometry {
  return merged([box(0.3, 0.3, 0.22, 0, 0.17, 0), new SphereGeometry(0.17, 6, 3).translate(0, 0.46, 0)]);
}

export interface Arena {
  group: Group;
  crowds: InstancedMesh[];
  people: number;
}

export function buildArena(): Arena {
  const group = new Group();
  const add = (geometry: BufferGeometry, material: Material, shadows: { cast?: boolean; receive?: boolean } = {}) => {
    const m = new Mesh(geometry, material);
    m.castShadow = !!shadows.cast; m.receiveShadow = !!shadows.receive;
    m.matrixAutoUpdate = false; m.updateMatrix();
    group.add(m);
    return m;
  };

  // pitch and the apron round it, both catching the shadows
  add(new PlaneGeometry(C.length, C.width).rotateX(-Math.PI / 2), standardMaterial({ map: pitchTexture(), roughness: 0.95 }), { receive: true });
  const apronW = C.length + 2 * (APRON + 1), apronD = C.width + 2 * (APRON + 1);
  add(new PlaneGeometry(apronW, apronD).rotateX(-Math.PI / 2).translate(0, -0.01, 0), standardMaterial({ color: DAY.apron, roughness: 1 }), { receive: true });

  // the fence: white posts every 2 m, a lit panel you see through, gaps at the goal mouths
  const posts: BufferGeometry[] = [], panels: BufferGeometry[] = [];
  const post = (x: number, z: number) => posts.push(new CylinderGeometry(0.07, 0.08, FENCE_H + 0.12, 10).translate(x, (FENCE_H + 0.12) / 2, z), new SphereGeometry(0.09, 10, 6).translate(x, FENCE_H + 0.13, z));
  for (let x = -L; x <= L + 1e-6; x += 2) for (const z of [-W, W]) post(x, z);
  for (const s of [-1, 1]) {
    for (const z of [-W + 2, -W + 4, W - 4, W - 2, -GW, GW]) post(s * L, z);
    panels.push(panel(s * L, -W, s * L, -GW), panel(s * L, GW, s * L, W));
  }
  for (const z of [-W, W]) panels.push(panel(-L, z, L, z));
  add(merged(posts), standardMaterial({ color: DAY.fencePost, roughness: 0.35, rim: 0.4 }), { cast: true });
  const fence = new Mesh(merged(panels), new MeshBasicMaterial({ map: fenceTexture(), transparent: true, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, toneMapped: false }));
  fence.matrixAutoUpdate = false; fence.renderOrder = 2;
  group.add(fence);

  // goals: thick white frame, net behind
  const frame: BufferGeometry[] = [];
  const bar = (len: number) => new CylinderGeometry(0.11, 0.11, len, 14);
  for (const s of [-1, 1]) {
    const x = s * (L + 0.11);
    for (const z of [-GW - 0.11, GW + 0.11]) frame.push(bar(GH + 0.11).translate(x, (GH + 0.11) / 2, z), new SphereGeometry(0.13, 12, 8).translate(x, GH + 0.11, z));
    frame.push(bar(C.goalWidth + 0.22).rotateX(Math.PI / 2).translate(x, GH + 0.11, 0));
    for (const z of [-GW - 0.11, GW + 0.11]) frame.push(new CylinderGeometry(0.06, 0.06, GD, 8).rotateZ(Math.PI / 2).translate(s * (L + GD / 2 + 0.11), GH, z));
  }
  add(merged(frame), standardMaterial({ color: "#f6f8fc", roughness: 0.3, rim: 0.3 }), { cast: true });
  const net = new Mesh(netGeometry(), new MeshBasicMaterial({ map: netTexture(), transparent: true, alphaTest: 0.3, side: DoubleSide, depthWrite: false }));
  net.matrixAutoUpdate = false;
  group.add(net);

  // the stands: a front wall, then tiers of steps on the four sides
  const steps: BufferGeometry[] = [], tops: BufferGeometry[] = [];
  const sides = [
    { len: C.length + 2 * APRON, along: "x" as const, at: W + APRON, sign: -1 },
    { len: C.width + 2 * APRON, along: "z" as const, at: L + APRON, sign: 1 },
    { len: C.width + 2 * APRON, along: "z" as const, at: L + APRON, sign: -1 },
    { len: C.length + 2 * APRON, along: "x" as const, at: W + APRON, sign: 1 },
  ];
  const seatsBySide: { x: number; y: number; z: number; face: number }[][] = [];
  for (const sd of sides) {
    const seats: { x: number; y: number; z: number; face: number }[] = [];
    for (let k = 0; k < ROWS; k++) {
      const d = sd.at + k * ROW_DEPTH + ROW_DEPTH / 2, top = FRONT + k * ROW_RISE;
      // each row is longer than the one in front by its depth on both ends, so the corners close
      const len = sd.len + 2 * (k + 1) * ROW_DEPTH;
      steps.push(sd.along === "x" ? box(len, top, ROW_DEPTH, 0, top / 2, sd.sign * d) : box(ROW_DEPTH, top, len, sd.sign * d, top / 2, 0));
      tops.push(sd.along === "x" ? box(len, 0.06, ROW_DEPTH, 0, top + 0.03, sd.sign * d) : box(ROW_DEPTH, 0.06, len, sd.sign * d, top + 0.03, 0));
      for (let u = -len / 2 + 0.4; u < len / 2 - 0.3; u += 0.46) {
        const x = sd.along === "x" ? u : sd.sign * d, z = sd.along === "x" ? sd.sign * d : u;
        seats.push({ x, y: top + 0.06, z, face: sd.along === "x" ? (sd.sign > 0 ? Math.PI : 0) : (sd.sign > 0 ? -Math.PI / 2 : Math.PI / 2) });
      }
    }
    seatsBySide.push(seats);
  }
  add(merged(steps), standardMaterial({ color: DAY.stand, roughness: 0.9 }), { receive: true });
  add(merged(tops), standardMaterial({ color: DAY.standTop, roughness: 0.9 }), { receive: true });

  // the crowd: one instance a seat, nine in ten seats taken, one mesh a side. The near side, behind
  // the match camera, stays empty as in the reference's matches: 45.000 triangles less a frame.
  const r = rng(2026), fan = fanGeometry(), crowdMaterial = standardMaterial({ roughness: 0.7, crowd: true });
  const o = new Object3D(), col = new Color();
  let people = 0;
  const crowds = seatsBySide.slice(0, 3).map((seats) => {
    const taken = seats.filter(() => r() < 0.9);
    const crowd = new InstancedMesh(fan, crowdMaterial, taken.length);
    taken.forEach((s, i) => {
      o.position.set(s.x + (r() - 0.5) * 0.08, s.y, s.z + (r() - 0.5) * 0.08);
      o.rotation.set(0, s.face + (r() - 0.5) * 0.5, 0);
      const k = 0.9 + r() * 0.2; o.scale.set(k, k, k);
      o.updateMatrix(); crowd.setMatrixAt(i, o.matrix);
      crowd.setColorAt(i, col.set(DAY.fans[Math.floor(r() * DAY.fans.length)]!));
    });
    crowd.computeBoundingSphere();
    people += taken.length;
    group.add(crowd);
    return crowd;
  });

  // two framed screens above the far stand, with a bar of lights on top
  const backZ = -(W + APRON + ROWS * ROW_DEPTH), screenY = FRONT + ROWS * ROW_RISE + 2.2;
  const frames: BufferGeometry[] = [], screens: BufferGeometry[] = [], lights: BufferGeometry[] = [];
  for (const x of [-8.5, 8.5]) {
    frames.push(box(7.4, 4.2, 0.5, x, screenY, backZ - 0.4), box(0.5, screenY, 0.5, x, screenY / 2, backZ - 0.6));
    screens.push(new PlaneGeometry(6.8, 3.6).translate(x, screenY, backZ - 0.14));
    for (let k = -3; k <= 3; k++) lights.push(new SphereGeometry(0.22, 8, 6).translate(x + k * 0.95, screenY + 2.35, backZ - 0.3));
  }
  add(merged(frames), standardMaterial({ color: DAY.screenFrame, roughness: 0.4, rim: 0.3 }));
  add(merged(screens), new MeshBasicMaterial({ map: screenTexture(), toneMapped: false }));
  add(merged(lights), new MeshBasicMaterial({ color: new Color(DAY.floodlight).multiplyScalar(4), toneMapped: false }));

  // the sky: a gradient on a sphere seen from inside
  const sky = new SphereGeometry(160, 24, 12);
  const top = new Color(DAY.sky[0]), bottom = new Color(DAY.sky[1]), cols: number[] = [];
  const p = sky.getAttribute("position");
  for (let i = 0; i < p.count; i++) { const t = Math.max(0, p.getY(i) / 160); const cc = bottom.clone().lerp(top, Math.pow(t, 0.5)); cols.push(cc.r, cc.g, cc.b); }
  sky.setAttribute("color", new BufferAttribute(new Float32Array(cols), 3));
  const skyMesh = new Mesh(sky, new MeshBasicMaterial({ vertexColors: true, side: 1, depthWrite: false }));
  skyMesh.renderOrder = -1; skyMesh.matrixAutoUpdate = false;
  group.add(skyMesh);

  return { group, crowds, people };
}

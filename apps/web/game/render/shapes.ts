// Shapes for the characters, built in the space of the bone they hang on: a limb hangs down (-y)
// from its joint, the body faces +z, its left is +x. Each helper returns an indexed geometry with
// positions and normals only; character.ts merges them and adds colours and bones.
import {
  BoxGeometry, BufferAttribute, BufferGeometry, ExtrudeGeometry, Shape, CapsuleGeometry, ConeGeometry, CylinderGeometry, Euler, LatheGeometry,
  Matrix4, Quaternion, SphereGeometry, TorusGeometry, Vector2, Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

const m4 = new Matrix4(), q = new Quaternion(), e = new Euler(), v = new Vector3(), s = new Vector3();

// Places a shape: scale, then rotate (x, y, z in radians, XYZ), then move.
export function place(g: BufferGeometry, at: [number, number, number] = [0, 0, 0], rot: [number, number, number] = [0, 0, 0], scale: [number, number, number] | number = 1): BufferGeometry {
  const sc = typeof scale === "number" ? [scale, scale, scale] : scale;
  m4.compose(v.set(at[0], at[1], at[2]), q.setFromEuler(e.set(rot[0], rot[1], rot[2])), s.set(sc[0]!, sc[1]!, sc[2]!));
  g.applyMatrix4(m4);
  return g;
}

// A sphere of radius 1 squashed to radii (rx, ry, rz).
export const ball = (rx: number, ry = rx, rz = rx, w = 10, h = 7): BufferGeometry => new SphereGeometry(1, w, h).scale(rx, ry, rz);
// A limb from the joint down: a capsule of radius r top and length len.
export const limb = (r: number, len: number, rBottom = r, segs = 8): BufferGeometry => {
  if (Math.abs(r - rBottom) < 1e-4) return new CapsuleGeometry(r, Math.max(1e-3, len), 2, segs).translate(0, -len / 2, 0);
  // a tapered limb: a lathe from the top sphere to the bottom one
  const pts: Vector2[] = [];
  const steps = 3;
  for (let i = 0; i <= steps; i++) { const a = (Math.PI / 2) * (i / steps); pts.push(new Vector2(Math.sin(a) * rBottom, -len - Math.cos(a) * rBottom)); }
  for (let i = 0; i <= steps; i++) { const a = (Math.PI / 2) * (i / steps); pts.push(new Vector2(Math.cos(a) * r, Math.sin(a) * r)); }
  return new LatheGeometry(pts, segs);
};
export const box = (w: number, h: number, d: number, radius = 0): BufferGeometry =>
  radius > 0 ? new RoundedBoxGeometry(w, h, d, 1, Math.min(radius, w / 2, h / 2, d / 2)) : new BoxGeometry(w, h, d);
export const cone = (r: number, h: number, segs = 10): BufferGeometry => new ConeGeometry(r, h, segs, 1).translate(0, h / 2, 0);
export const cylinder = (rTop: number, rBottom: number, h: number, segs = 12): BufferGeometry => new CylinderGeometry(rTop, rBottom, h, segs, 1);
export const ring = (r: number, tube: number, segs = 16, arc = Math.PI * 2): BufferGeometry => new TorusGeometry(r, tube, 5, segs, arc);
// A horn: a curved cone from its base at the origin, bending toward +z as it rises (bend > 0) or
// toward -z (bend < 0); bend is the angle turned from base to tip.
export function horn(r: number, len: number, bend: number, segs = 8, rings = 6): BufferGeometry {
  const g = new CylinderGeometry(0, 1, 1, segs, rings, false).translate(0, 0.5, 0);
  const p = g.getAttribute("position"), k = Math.abs(bend), sign = bend < 0 ? -1 : 1;
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i), a = k * t;
    const x = p.getX(i) * r, zr = p.getZ(i) * r * sign;
    // along a circle in the y-z plane, the section kept square to it
    const rad = k > 1e-3 ? len / k : 0;
    const by = k > 1e-3 ? Math.sin(a) * rad : t * len, bz = k > 1e-3 ? (1 - Math.cos(a)) * rad : 0;
    p.setXYZ(i, x, by - Math.sin(a) * zr, sign * (bz + Math.cos(a) * zr));
  }
  g.computeVertexNormals();
  return g;
}
// A flat shape from a 2D outline (x, y), extruded thin along z and centred on z = 0.
export function slab(outline: [number, number][], depth: number): BufferGeometry {
  const shape = new Shape(outline.map(([x, y]) => new Vector2(x, y)));
  const g = new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 }).translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}

// Moves each vertex along its direction from the origin by f(direction): bumps on a sphere.
export function bumpy(g: BufferGeometry, f: (x: number, y: number, z: number) => number): BufferGeometry {
  const p = g.getAttribute("position");
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i), p.getY(i), p.getZ(i));
    const l = v.length() || 1;
    const k = 1 + f(v.x / l, v.y / l, v.z / l);
    p.setXYZ(i, v.x * k, v.y * k, v.z * k);
  }
  g.computeVertexNormals();
  return g;
}

// Keeps the triangles whose centre passes the test, for caps and shells cut out of a sphere.
export function keep(g: BufferGeometry, test: (x: number, y: number, z: number) => boolean): BufferGeometry {
  if (!g.getAttribute("normal")) g.computeVertexNormals();
  const src = g.index ? g.toNonIndexed() : g;
  const p = src.getAttribute("position"), n = src.getAttribute("normal"), out: number[] = [], nor: number[] = [];
  for (let i = 0; i < p.count; i += 3) {
    const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    if (test(cx, cy, cz)) for (let k = 0; k < 3; k++) { out.push(p.getX(i + k), p.getY(i + k), p.getZ(i + k)); nor.push(n.getX(i + k), n.getY(i + k), n.getZ(i + k)); }
  }
  const r = new BufferGeometry();
  r.setAttribute("position", new BufferAttribute(new Float32Array(out), 3));
  r.setAttribute("normal", new BufferAttribute(new Float32Array(nor), 3));
  return r;
}

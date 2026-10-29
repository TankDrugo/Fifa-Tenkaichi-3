// The pieces of a footballer, in the space of their bones (rig.ts): body and kit, hair, nose and
// ears, beard, and the team's gear (looks.ts, style B). character.ts merges the pieces of all the
// players into one mesh.
import { LatheGeometry, Vector2, type BufferGeometry } from "three";
import type { Body } from "./body";
import { ANKLE, BONE, ELBOW, HAND, HIP, KNEE, SHOULDER } from "../animation/rig";
import { ball, box, bumpy, cone, cylinder, horn, keep, limb, place, ring, slab } from "./shapes";
import type { Design } from "./looks";

export const REGION = { plain: 0, face: 1, shirt: 2 } as const;

export interface Part {
  geo: BufferGeometry;
  bone: number;
  colour: string;
  top?: { colour: string; from: number; to: number };   // a gradient along the bone's y
  rough: number;
  metal: number;
  glow: number;
  region: number;
}

type Opts = Partial<Pick<Part, "rough" | "metal" | "glow" | "region" | "top">>;

// lighter or darker by f (-1..1), for trims and shading of gear
export function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f));
  const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}
const luminance = (hex: string) => { const n = parseInt(hex.slice(1), 16); return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
// a colour that reads on top of another
export const contrast = (hex: string): string => (luminance(hex) > 0.55 ? "#1a1d26" : "#f6f7fb");

// The hairline: hair is kept above it on a sphere round the head, higher in front (forehead),
// lower at the back (nape); bob and fur come down over the sides.
function hairline(_nx: number, ny: number, nz: number, front = 0.45, sides = 0.0, back = -0.45): boolean {
  const th = nz >= 0 ? sides + (front - sides) * Math.min(1, nz / 0.75) : sides + (back - sides) * Math.min(1, -nz / 0.75);
  return ny > th;
}

export function buildParts(d: Design, b: Body): Part[] {
  const parts: Part[] = [];
  const add = (geo: BufferGeometry, bone: number, colour: string, o: Opts = {}) => {
    parts.push({ geo, bone, colour, rough: o.rough ?? 0.55, metal: o.metal ?? 0, glow: o.glow ?? 0, region: o.region ?? REGION.plain, top: o.top });
  };
  const R = b.headR, cy = R * 0.95, T = b.torso;
  const robot = d.people === "robot", yeti = d.people === "yeti";
  const skinOpts: Opts = robot ? { rough: 0.32, metal: 0.7 } : { rough: 0.55 };
  const hairOpts: Opts = { rough: 0.62 };
  const kit = d.kit, trim = kit.second;
  const keeper = d.keeper;

  // ---- head -------------------------------------------------------------------------------
  if (robot && d.variant < 0.5) add(place(box(R * 1.86, R * 1.8, R * 1.76, R * 0.45), [0, cy, 0]), BONE.head, d.skin, { ...skinOpts, region: REGION.face });
  else add(place(ball(R, R * 0.97, R * 0.95, 22, 14), [0, cy, 0]), BONE.head, d.skin, { ...skinOpts, region: REGION.face });

  // nose
  const nz = R * 0.93;
  switch (d.nose) {
    case "button": add(place(ball(R * 0.1, R * 0.08, R * 0.08, 10, 6), [0, cy - R * 0.12, nz]), BONE.head, shade(d.skin, -0.04), skinOpts); break;
    case "round": add(place(ball(R * 0.17, R * 0.15, R * 0.14, 12, 8), [0, cy - R * 0.12, nz - R * 0.02]), BONE.head, shade(d.skin, yeti ? -0.25 : -0.03), skinOpts); break;
    case "big": add(place(ball(R * 0.22, R * 0.18, R * 0.18, 12, 8), [0, cy - R * 0.14, nz - R * 0.04]), BONE.head, shade(d.skin, -0.05), skinOpts); break;
    case "pointy": add(place(cone(R * 0.09, R * 0.28, 8), [0, cy - R * 0.08, nz - R * 0.08], [Math.PI / 2 - 0.25, 0, 0]), BONE.head, d.skin, skinOpts); break;
    case "snout":
      // a long muzzle under the eyes, nostrils on top of its tip, a ridge over each eye
      add(place(ball(R * 0.36, R * 0.27, R * 0.58, 16, 10), [0, cy - R * 0.36, R * 0.62], [0.12, 0, 0]), BONE.head, shade(d.skin, -0.04), skinOpts);
      for (const sx of [-1, 1]) {
        add(place(ball(R * 0.045, R * 0.025, R * 0.06, 6, 4), [sx * R * 0.12, cy - R * 0.17, R * 1.12], [0.5, 0, 0]), BONE.head, shade(d.skin, -0.6), { rough: 0.8 });
        add(place(ball(R * 0.2, R * 0.07, R * 0.12, 10, 6), [sx * R * 0.34, cy + R * 0.33, R * 0.83], [0, 0, -sx * 0.3]), BONE.head, shade(d.skin, -0.18), skinOpts);
      }
      break;
    default: break;
  }
  // ears
  for (const sx of [-1, 1]) {
    if (d.ears === "round") add(place(ball(R * 0.17, R * 0.23, R * 0.09, 10, 6), [sx * R * 0.97, cy - R * 0.05, -R * 0.02], [0, sx * 0.3, 0]), BONE.head, d.skin, skinOpts);
    else if (d.ears === "pointy") add(place(horn(R * 0.14, R * 0.55, 0.5, 6, 3), [sx * R * 0.9, cy - R * 0.02, -R * 0.05], [-0.4, 0, -sx * 1.15]), BONE.head, d.skin, skinOpts);
  }
  hair(d, b, add, cy, hairOpts);
  facial(d, b, add, cy, hairOpts);

  // ---- body and kit ------------------------------------------------------------------------
  // neck, from the chest's top into the head
  add(place(cylinder(b.neckR, b.neckR * 1.1, b.neck + R * 0.5, 12), [0, T + (b.neck + R * 0.5) / 2 - 0.01, 0]), BONE.chest, d.skin, skinOpts);
  // the shirt: wider at the chest than at the waist, an ellipse across
  add(torso(b), BONE.chest, kit.shirt, { rough: 0.5, region: REGION.shirt });
  // collar
  add(place(ring(b.neckR * 1.15, b.neckR * 0.32, 12), [0, T - 0.004, 0], [Math.PI / 2, 0, 0]), BONE.chest, keeper ? shade(kit.shirt, -0.25) : trim, { rough: 0.5 });
  if (b.belly > 0) add(place(ball(b.chestW * 0.86, T * 0.36, b.chestD * 0.8, 16, 10), [0, T * 0.28, b.chestD * 0.42]), BONE.chest, kit.shirt, { rough: 0.5, region: REGION.shirt });
  // shorts
  add(place(ball(b.waistW * 0.98, 0.08, b.chestD * 0.9, 12, 8), [0, 0.0, 0]), BONE.pelvis, kit.shorts, { rough: 0.6 });
  for (let s = 0; s < 2; s++) {
    const side = s === 0 ? 1 : -1;
    // shoulder, arm, sleeve
    add(ball(b.armR * 1.32, b.armR * 1.32, b.armR * 1.32, 10, 7), SHOULDER[s]!, kit.shirt, { rough: 0.5 });
    add(limb(b.armR * 1.18, b.upperArm * (keeper ? 0.9 : 0.5), b.armR * 1.12, 9), SHOULDER[s]!, kit.shirt, { rough: 0.5 });
    if (!keeper) add(place(ring(b.armR * 1.15, b.armR * 0.16, 12), [0, -b.upperArm * 0.5 - b.armR * 0.9, 0], [Math.PI / 2, 0, 0]), SHOULDER[s]!, trim, { rough: 0.5 });
    add(limb(b.armR, b.upperArm, b.foreR), SHOULDER[s]!, keeper ? kit.shirt : d.skin, keeper ? { rough: 0.5 } : skinOpts);
    add(ball(b.foreR * 1.12, b.foreR * 1.12, b.foreR * 1.12, 10, 7), ELBOW[s]!, robot ? "#3a4252" : keeper ? kit.shirt : d.skin, keeper ? { rough: 0.5 } : skinOpts);
    add(limb(b.foreR, b.forearm, b.foreR * 0.88), ELBOW[s]!, keeper ? kit.shirt : d.skin, keeper ? { rough: 0.5 } : skinOpts);
    // glove: a big round hand with its thumb, as the reference's
    const hr = b.handR * (keeper ? 1.12 : 1);
    add(place(ball(hr, hr * 1.06, hr * 0.9, 10, 8), [0, -hr * 0.78, 0.004]), HAND[s]!, kit.gloves, { rough: 0.45 });
    add(place(ball(hr * 0.42, hr * 0.5, hr * 0.42, 8, 6), [side * hr * 0.35, -hr * 0.5, hr * 0.66], [0.5, 0, 0]), HAND[s]!, kit.gloves, { rough: 0.45 });
    add(place(cylinder(hr * 0.72, hr * 0.68, hr * 0.42, 10), [0, -hr * 0.08, 0]), HAND[s]!, keeper ? shade(kit.shirt, -0.3) : trim, { rough: 0.5 });
    // legs: shorts over the thigh, knee, sock, boot
    add(limb(b.thighR * 1.24, b.thigh * 0.36, b.thighR * 1.18, 10), HIP[s]!, kit.shorts, { rough: 0.6 });
    add(limb(b.thighR, b.thigh, b.shinR * 0.98), HIP[s]!, d.skin, skinOpts);
    add(ball(b.shinR * 1.06, b.shinR * 1.06, b.shinR * 1.06, 10, 7), KNEE[s]!, robot ? "#3a4252" : d.skin, skinOpts);
    if (yeti || d.barefoot) {
      add(limb(b.shinR, b.shin, b.shinR * 0.85), KNEE[s]!, d.skin, skinOpts);
      add(place(ring(b.shinR * 1.02, b.shinR * 0.22, 12), [0, -b.shin * 0.2, 0], [Math.PI / 2, 0, 0]), KNEE[s]!, kit.socks, { rough: 0.6 });
    } else {
      add(limb(b.shinR * 1.06, b.shin * 0.92, b.shinR * 0.88), KNEE[s]!, kit.socks, { rough: 0.65 });
      add(place(ring(b.shinR * 1.06, b.shinR * 0.22, 12), [0, -b.shinR * 0.4, 0], [Math.PI / 2, 0, 0]), KNEE[s]!, keeper ? shade(kit.socks, -0.3) : trim, { rough: 0.6 });
    }
    foot(d, b, s, add, skinOpts);
  }
  if (d.style === "B") gear(d, b, add);
  return parts;
}

function torso(b: Body): BufferGeometry {
  const T = b.torso, w = b.waistW * 0.9, c = b.chestW;
  const pts: [number, number][] = [[0.001, -0.03 * T], [w * 0.8, -0.02 * T], [w, 0.1 * T], [(w + c) / 2, 0.38 * T], [c, 0.62 * T], [c * 0.97, 0.8 * T], [c * 0.8, 0.93 * T], [c * 0.42, 1.0 * T], [0.001, 1.02 * T]];
  // a lathe made by hand, so the uv-free geometry has the same attributes as the others
  const g = latheXY(pts, 16);
  g.scale(1, 1, b.chestD / b.chestW);
  g.computeVertexNormals();
  return g;
}
const latheXY = (pts: [number, number][], segs: number): BufferGeometry => new LatheGeometry(pts.map(([x, y]) => new Vector2(x, y)), segs);

type Add = (geo: BufferGeometry, bone: number, colour: string, o?: Opts) => void;

function foot(d: Design, b: Body, s: number, add: Add, skinOpts: Opts): void {
  const fl = b.footL, fw = b.footW;
  if (d.barefoot) {
    add(place(ball(fw * 0.95, b.ankle * 1.1, fl * 0.95, 12, 8), [0, -b.ankle * 0.45, fl * 0.3]), ANKLE[s]!, d.skin, skinOpts);
    for (let t = -1; t <= 1; t++) add(place(ball(fw * 0.26, fw * 0.24, fw * 0.28, 8, 5), [t * fw * 0.55, -b.ankle * 0.6, fl * 1.18]), ANKLE[s]!, d.people === "yeti" ? "#e8eef6" : d.skin, skinOpts);
    return;
  }
  // a chunky boot with its sole and a stripe of the team's second colour
  add(place(ball(fw, b.ankle * 1.35, fl, 12, 8), [0, -b.ankle * 0.25, fl * 0.32]), ANKLE[s]!, d.kit.boots, { rough: 0.28 });
  add(place(ball(fw * 1.0, 0.014, fl * 1.04, 12, 4), [0, -b.ankle + 0.012, fl * 0.32]), ANKLE[s]!, "#f2f4f8", { rough: 0.5 });
  const side = s === 0 ? 1 : -1;
  add(place(box(0.008, b.ankle * 0.9, fl * 0.9), [-side * fw * 0.93, -b.ankle * 0.2, fl * 0.3]), ANKLE[s]!, d.keeper ? "#ffd23f" : d.kit.second, { rough: 0.4 });
}

// ---- hair -------------------------------------------------------------------------------------
function hair(d: Design, b: Body, add: Add, cy: number, o: Opts): void {
  const R = b.headR, col = d.hair, H = BONE.head;
  // a shell round the head, kept above the hairline
  const shell = (k: number, front = 0.45, sides = 0.0, back = -0.45, w = 22, h = 14) => {
    const g = ball(R * k, R * k * 0.98, R * k, w, h);
    return place(keep(g, (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return hairline(x / l, y / l, z / l, front, sides, back); }), [0, cy, 0]);
  };
  const tuft = (r: number, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) => place(ball(r * sx, r * sy, r * sz, 10, 7), [x, y, z]);
  switch (d.hairStyle) {
    case "none": break;
    case "crop": add(shell(1.05), H, col, o); break;
    case "buzz": add(shell(1.025, 0.5, 0.05, -0.4), H, shade(col, 0.06), o); break;
    case "spiky": {
      add(shell(1.04), H, col, o);
      for (let i = 0; i < 11; i++) {
        const a = (i / 11) * Math.PI * 2, up = i % 2 ? 0.55 : 0.85;
        const dx = Math.sin(a) * Math.cos(up) * 0.9, dz = Math.cos(a) * Math.cos(up) * 0.9 - 0.25, dy = Math.sin(up);
        const l = Math.hypot(dx, dy, dz);
        const nx = dx / l, ny = dy / l, nzz = dz / l;
        const g = cone(R * 0.15, R * 0.5, 7);
        // point the cone along (nx, ny, nz)
        const rx = Math.atan2(nzz, ny), rz = -Math.atan2(nx, Math.hypot(ny, nzz));
        add(place(g, [nx * R * 0.82, cy + ny * R * 0.82, nzz * R * 0.82], [rx, 0, rz]), H, col, o);
      }
      break;
    }
    case "mohawk":
      add(shell(1.02, 0.5, 0.1, -0.35), H, shade(col, -0.2), o);
      for (let i = 0; i < 6; i++) {
        const a = -0.9 + i * 0.42;
        add(place(cone(R * 0.16, R * (0.5 - Math.abs(i - 2.5) * 0.05), 6), [0, cy + Math.cos(a) * R * 0.95, Math.sin(a) * R * 0.95], [a, 0, 0], [0.45, 1, 1.4]), H, col, o);
      }
      break;
    case "afro": {
      const g = bumpy(ball(R * 1.36, R * 1.24, R * 1.3, 24, 16), (x, y, z) => 0.05 * Math.sin(x * 11) * Math.sin(y * 9 + z * 7));
      add(place(keep(g, (x, y, z) => { const px = x, py = y + R * 0.22, pz = z - R * 0.12; const l = Math.hypot(px, py, pz) || 1; return hairline(px / l, py / l, pz / l, 0.42, -0.05, -0.5); }), [0, cy + R * 0.22, -R * 0.12]), H, col, o);
      break;
    }
    case "curly":
      add(shell(1.04), H, col, o);
      for (let i = 0; i < 22; i++) {
        const a = i * 2.39996, yy = 1 - (i / 21) * 1.15;
        const rr = Math.sqrt(Math.max(0, 1 - yy * yy)), x = Math.cos(a) * rr, z = Math.sin(a) * rr;
        if (!hairline(x, yy, z, 0.5, 0.05, -0.4)) continue;
        add(tuft(R * 0.2, x * R * 1.02, cy + yy * R * 1.0, z * R * 1.02), H, col, o);
      }
      break;
    case "slick":
      add(place(keep(ball(R * 1.06, R * 1.03, R * 1.14, 26, 18), (x, y, z) => {
        const l = Math.hypot(x, y, z) || 1, nx = x / l, ny = y / l, nzz = z / l;
        // a widow's peak: the hairline dips in the middle of the forehead
        return hairline(nx, ny + (nzz > 0.6 ? 0.18 * Math.max(0, 1 - Math.abs(nx) * 4) : 0), nzz, 0.5, 0.0, -0.5);
      }), [0, cy, -R * 0.05]), H, col, { rough: 0.3 });
      break;
    case "quiff":
      add(shell(1.04), H, col, o);
      add(place(ball(R * 0.55, R * 0.36, R * 0.62, 14, 10), [0, cy + R * 0.82, R * 0.42], [-0.45, 0, 0]), H, col, o);
      break;
    case "sidepart":
      add(shell(1.05, 0.48), H, col, { rough: 0.45 });
      add(place(ball(R * 0.6, R * 0.25, R * 0.55, 14, 8), [R * 0.28, cy + R * 0.78, R * 0.38], [-0.3, 0, -0.35]), H, col, { rough: 0.45 });
      break;
    case "ponytail":
      add(shell(1.04), H, col, o);
      add(place(ring(R * 0.13, R * 0.05, 10), [0, 0, 0], [0.5, 0, 0]), BONE.hair, d.kit.second, { rough: 0.5 });
      add(place(limb(R * 0.2, R * 0.85, R * 0.07, 9), [0, -R * 0.05, -R * 0.06], [0.25, 0, 0]), BONE.hair, col, o);
      break;
    case "buns":
      add(shell(1.04), H, col, o);
      for (const sx of [-1, 1]) add(tuft(R * 0.34, sx * R * 0.6, cy + R * 0.8, -R * 0.12), H, col, o);
      break;
    case "long":
      add(shell(1.05, 0.48, -0.1, -0.5), H, col, o);
      // the curtain down the back and two locks in front of the ears
      add(place(keep(limb(R * 0.98, R * 1.25, R * 0.82, 20), (x, _y, z) => z < R * 0.2 && !(Math.abs(x) < R * 0.45 && z > 0)), [0, cy + R * 0.25, -R * 0.12], [0, 0, 0], [1, 1, 0.82]), H, col, o);
      for (const sx of [-1, 1]) add(place(limb(R * 0.2, R * 1.0, R * 0.12, 8), [sx * R * 0.82, cy + R * 0.2, R * 0.3], [0.05, 0, sx * 0.08]), H, col, o);
      break;
    case "bob":
      add(shell(1.08, 0.48, -0.55, -0.6), H, col, o);
      break;
    case "twintails":
      add(shell(1.04), H, col, o);
      for (const sx of [-1, 1]) {
        add(tuft(R * 0.16, sx * R * 0.8, cy + R * 0.45, -R * 0.2), H, d.kit.second, { rough: 0.5 });
        add(place(limb(R * 0.24, R * 1.2, R * 0.08, 9), [sx * R * 0.9, cy + R * 0.42, -R * 0.24], [0.15, 0, sx * 0.35]), H, col, o);
      }
      break;
    case "fringe":
      add(shell(1.05, 0.5, -0.15, -0.5), H, col, o);
      add(place(ball(R * 0.62, R * 0.32, R * 0.26, 14, 8), [-R * 0.28, cy + R * 0.48, R * 0.84], [0.2, 0.25, 0.55]), H, col, o);
      break;
    case "topknot":
      add(shell(1.025, 0.5, 0.05, -0.4), H, col, o);
      add(tuft(R * 0.3, 0, cy + R * 1.08, -R * 0.32), H, col, o);
      add(place(ring(R * 0.14, R * 0.06, 10), [0, cy + R * 0.92, -R * 0.26], [Math.PI / 2 - 0.3, 0, 0]), H, d.kit.second, { rough: 0.5 });
      break;
    case "dreads":
      add(shell(1.04), H, col, o);
      for (let i = 0; i < 12; i++) {
        const a = Math.PI * (0.25 + 1.5 * (i / 11));
        const x = Math.cos(a) * R * 0.88, z = Math.sin(a) * R * -0.88;
        if (z > R * 0.3) continue;
        add(place(limb(R * 0.085, R * (0.9 + (i % 3) * 0.18), R * 0.07, 6), [x, cy + R * 0.25, z], [-0.12 * Math.sign(-z || 1), 0, x * 0.4]), H, col, o);
      }
      break;
    case "fur":
      add(place(bumpy(keep(ball(R * 1.12, R * 1.1, R * 1.1, 26, 18), (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return hairline(x / l, y / l, z / l, 0.5, -0.65, -0.75) && !(z / l > 0.55 && y / l < 0.45 && y / l > -0.75 && Math.abs(x / l) < 0.6); }), (x, y, z) => 0.07 * Math.sin(x * 17 + y * 13) * Math.sin(z * 15 + x * 5)), [0, cy, 0]), H, col, { rough: 0.85 });
      break;
    case "crest":
      add(place(slab([[0, 0], [-R * 0.1, R * 0.2], [R * 0.25, R * 0.55], [R * 0.75, R * 0.62], [R * 1.25, R * 0.4], [R * 1.3, R * 0.1], [R * 0.9, -R * 0.15]], R * 0.12), [0, cy + R * 0.55, R * 0.55], [0, -Math.PI / 2, 0]), H, shade(d.skin, -0.25), { rough: 0.4 });
      break;
  }
}

function facial(d: Design, b: Body, add: Add, cy: number, o: Opts): void {
  const R = b.headR, col = d.hair, H = BONE.head;
  switch (d.facial) {
    case "beard":
      add(place(keep(ball(R * 1.05, R * 1.02, R * 1.03, 24, 16), (x, y, z) => {
        const l = Math.hypot(x, y, z) || 1, nx = x / l, ny = y / l, nzz = z / l;
        // under the mouth in front, up to the ears on the sides
        return nzz > -0.35 && (nzz > 0.55 ? ny < -0.56 - 0.0 * nx : ny < -0.12 - 0.55 * Math.max(0, nzz));
      }), [0, cy, 0]), H, col, o);
      break;
    case "mustache":
      for (const sx of [-1, 1]) add(place(ball(R * 0.2, R * 0.075, R * 0.08, 10, 6), [sx * R * 0.16, cy - R * 0.31, R * 0.9], [0, sx * -0.35, sx * -0.3]), H, col, o);
      break;
    case "goatee":
      add(place(ball(R * 0.17, R * 0.2, R * 0.12, 10, 7), [0, cy - R * 0.78, R * 0.66]), H, col, o);
      break;
    default: break;
  }
}

// ---- the team's gear (style B) ---------------------------------------------------------------
function gear(d: Design, b: Body, add: Add): void {
  const R = b.headR, cy = R * 0.95, T = b.torso, H = BONE.head, C = BONE.chest;
  const kit = d.kit, main = kit.shirt, second = d.keeper ? kit.shorts : kit.second;
  const shoulderAt = (s: number): [number, number, number] => [-(s === 0 ? 1 : -1) * (b.shoulderW + b.armR * 0.35), T * 0.75 + b.armR * 0.75, 0];
  const band = (colour: string, y = cy + R * 0.42, k = 1.04) => add(place(ring(R * k, R * 0.09, 24), [0, y, 0], [Math.PI / 2 - 0.12, 0, 0]), H, colour, { rough: 0.45 });
  const glossy: Opts = { rough: 0.3 };
  switch (d.people) {
    case "alien": {
      const n = d.variant < 0.3 ? 1 : d.variant < 0.75 ? 2 : 3, tip = d.variant > 0.5 ? "#f6ff6a" : "#ff6af0";
      for (let i = 0; i < n; i++) {
        const a = n === 1 ? 0 : (i / (n - 1) - 0.5) * 0.9;
        add(place(limb(R * 0.035, R * 0.75, R * 0.03, 6), [Math.sin(a) * R * 0.5, cy + R * 0.88, -R * 0.05], [Math.PI + 0.25, 0, a * 1.4]), H, shade(d.skin, -0.2), { rough: 0.5 });
        add(place(ball(R * 0.12), [Math.sin(a) * R * 0.5 + Math.sin(a * 1.4) * R * 0.74, cy + R * 0.88 + Math.cos(a * 1.4) * R * 0.72, R * 0.14]), H, tip, { rough: 0.2, glow: 1.6 });
      }
      for (let s = 0; s < 2; s++) add(place(ball(b.armR * 1.5, b.armR * 0.8, b.armR * 1.4, 14, 8), shoulderAt(s)), C, second, glossy);
      return;
    }
    case "vampire":
      // a high collar standing behind the head, and a short cape that flies when running
      for (const sx of [-1, 1]) add(place(slab([[0, 0], [R * 0.75, R * 0.1], [R * 0.95, R * 0.95], [R * 0.2, R * 0.65]], 0.012), [sx * R * 0.08, T * 0.98, -b.chestD * 0.55], [-0.35, sx * 0.55 + (sx < 0 ? Math.PI : 0), 0]), C, "#151018", { rough: 0.4 });
      add(place(slab([[-b.chestW * 1.05, 0], [b.chestW * 1.05, 0], [b.chestW * 1.25, -T * 1.25], [0, -T * 1.12], [-b.chestW * 1.25, -T * 1.25]], 0.012), [0, 0, -0.012]), BONE.cape, "#8c1022", { rough: 0.5 });
      return;
    case "pirate": {
      if (d.keeper) {
        // the captain's three-cornered hat
        add(place(cylinder(R * 0.78, R * 0.9, R * 0.5, 16), [0, cy + R * 0.92, -R * 0.04]), H, "#1e1e24", { rough: 0.7 });
        add(place(cylinder(R * 1.45, R * 1.45, R * 0.06, 3), [0, cy + R * 0.7, -R * 0.04], [0, Math.PI / 6, 0]), H, "#1e1e24", { rough: 0.7 });
        add(place(ring(R * 1.36, R * 0.04, 3 * 6), [0, cy + R * 0.74, -R * 0.04], [Math.PI / 2, 0, 0]), H, "#c9a227", { rough: 0.3, metal: 0.8 });
      } else {
        const cloth = ["#c8202a", "#f2f0e6", "#1e1e24", "#2d5fb0"][Math.floor(d.variant * 4)]!;
        add(place(keep(ball(R * 1.08, R * 1.05, R * 1.08, 24, 16), (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return hairline(x / l, y / l, z / l, 0.48, 0.2, -0.2); }), [0, cy, 0]), H, cloth, { rough: 0.7 });
        add(place(ball(R * 0.16, R * 0.14, R * 0.12), [0, 0, 0]), BONE.hair, cloth, { rough: 0.7 });
        for (const sx of [-1, 1]) add(place(limb(R * 0.07, R * 0.5, R * 0.05, 6), [sx * R * 0.08, 0, -R * 0.05], [0.4, 0, sx * 0.3], [1, 1, 0.5]), BONE.hair, cloth, { rough: 0.7 });
      }
      add(place(ring(R * 0.1, R * 0.025, 10), [-R * 0.98, cy - R * 0.3, R * 0.02], [0, Math.PI / 2, 0]), H, "#e8c547", { rough: 0.25, metal: 0.9 });
      return;
    }
    case "dragon":
      for (const sx of [-1, 1]) add(place(horn(R * 0.17, R * 1.05, -1.3, 8, 6), [sx * R * 0.45, cy + R * 0.72, -R * 0.1], [0.1, 0, -sx * 0.4]), H, "#f3e6c8", { rough: 0.45, top: { colour: "#a8946c", from: cy + R * 0.9, to: cy + R * 1.6 } });
      for (let i = 0; i < 4; i++) add(place(cone(R * 0.12 * (1 - i * 0.15), R * 0.32 * (1 - i * 0.15), 6), [0, T * (0.95 - i * 0.24), -b.chestD * 0.92], [-1.25, 0, 0]), C, shade(d.skin, -0.3), { rough: 0.45 });
      add(place(limb(b.waistW * 0.42, 0.13, b.waistW * 0.3, 10), [0, 0, 0], [-Math.PI / 2, 0, 0]), BONE.tail, d.skin, { rough: 0.5 });
      add(place(limb(b.waistW * 0.3, 0.14, 0.008, 10), [0, 0, 0], [-Math.PI / 2, 0, 0]), BONE.tailTip, d.skin, { rough: 0.5, top: { colour: shade(d.skin, -0.35), from: 0, to: -0.14 } });
      add(place(cone(b.waistW * 0.3, 0.08, 4), [0, 0, -0.13], [-Math.PI / 2, 0, 0], [1.4, 1, 0.35]), BONE.tailTip, shade(d.skin, -0.3), { rough: 0.45 });
      for (const sx of [-1, 1]) add(place(slab([[0, 0], [0.16, 0.12], [0.2, 0.02], [0.14, -0.02], [0.08, -0.06]], 0.01), [sx * b.chestW * 0.4, T * 0.82, -b.chestD * 0.75], [0, sx > 0 ? -0.6 : Math.PI + 0.6, 0]), C, shade(d.skin, -0.18), { rough: 0.5 });
      return;
    case "robot":
      add(place(box(R * 1.55, R * 0.36, R * 0.16, R * 0.08), [0, cy + R * 0.1, R * 0.84]), H, d.variant > 0.5 ? "#3cdcff" : "#ff3cc8", { rough: 0.15, glow: 1.8 });
      add(place(cylinder(R * 0.035, R * 0.035, R * 0.55, 6), [0, cy + R * 1.1, 0]), H, "#3a4252", { rough: 0.3, metal: 0.8 });
      add(place(ball(R * 0.09), [0, cy + R * 1.38, 0]), H, "#ff3cc8", { rough: 0.2, glow: 1.6 });
      for (const sx of [-1, 1]) add(place(cylinder(R * 0.22, R * 0.22, R * 0.14, 12), [sx * R * 0.95, cy, 0], [0, 0, Math.PI / 2]), H, "#3a4252", { rough: 0.3, metal: 0.8 });
      for (let s = 0; s < 2; s++) add(place(box(b.armR * 2.8, b.armR * 1.4, b.armR * 2.6, b.armR * 0.5), shoulderAt(s)), C, second, { rough: 0.3, metal: 0.5 });
      return;
    case "yeti":
      for (let s = 0; s < 2; s++) {
        add(place(bumpy(ball(b.armR * 1.9, b.armR * 1.4, b.armR * 1.8, 14, 10), (x, y, z) => 0.12 * Math.sin(x * 13 + z * 9) * Math.sin(y * 11)), shoulderAt(s)), C, "#f7fbff", { rough: 0.9 });
        add(place(bumpy(limb(b.foreR * 1.5, b.forearm * 0.45, b.foreR * 1.35, 12), (x, y, z) => 0.1 * Math.sin(x * 40 + y * 30 + z * 35)), [0, -b.forearm * 0.4, 0]), ELBOW[s]!, "#f7fbff", { rough: 0.9 });
        add(place(bumpy(limb(b.shinR * 1.45, b.shin * 0.5, b.shinR * 1.3, 12), (x, y, z) => 0.1 * Math.sin(x * 40 + y * 30 + z * 35)), [0, -b.shin * 0.1, 0]), KNEE[s]!, "#f7fbff", { rough: 0.9 });
      }
      return;
    default: break;
  }
  // the clubs: gear shaped on each club's name, in its colours
  switch (d.team) {
    case "fulmini":
      for (let s = 0; s < 2; s++) {
        add(place(box(b.armR * 2.6, b.armR * 1.1, b.armR * 2.4, b.armR * 0.5), shoulderAt(s)), C, second, glossy);
        const [x, y, z] = shoulderAt(s);
        // a bolt standing on each pad, facing forward
        add(place(slab([[0, 0], [0.04, 0.075], [0.008, 0.075], [0.048, 0.16], [-0.032, 0.055], [0.0, 0.055], [-0.032, 0]], 0.016), [x, y + b.armR * 0.1, z + 0.005]), C, "#ffd23f", { rough: 0.3, glow: 0.5 });
      }
      band(second);
      add(place(slab([[0, 0], [R * 0.3, R * 0.42], [R * 0.06, R * 0.42], [R * 0.36, R * 0.95], [-R * 0.24, R * 0.3], [0, R * 0.3], [-R * 0.3, 0]], 0.014), [0, cy + R * 0.3, R * 0.98], [-0.25, 0, 0]), H, "#ffd23f", { rough: 0.3, glow: 0.5 });
      return;
    case "marea":
      band("#1a2a4a", cy + R * 0.5, 1.05);
      for (const sx of [-1, 1]) {
        add(place(cylinder(R * 0.22, R * 0.22, R * 0.12, 16), [sx * R * 0.3, cy + R * 0.6, R * 0.9], [Math.PI / 2 - 0.5, 0, 0]), H, "#1a2a4a", { rough: 0.3 });
        add(place(cylinder(R * 0.17, R * 0.17, R * 0.13, 16), [sx * R * 0.3, cy + R * 0.6, R * 0.92], [Math.PI / 2 - 0.5, 0, 0]), H, "#7fd8ff", { rough: 0.05, metal: 0.3, glow: 0.2 });
      }
      for (let s = 0; s < 2; s++) {
        const side = s === 0 ? 1 : -1;
        add(place(ring(b.armR * 1.25, b.armR * 0.55, 14, Math.PI * 1.3), shoulderAt(s), [0, Math.PI / 2, side * 0.3 + Math.PI * 0.85]), C, second, glossy);
      }
      return;
    case "vulcano":
      for (let s = 0; s < 2; s++) {
        add(place(bumpy(ball(b.armR * 1.7, b.armR * 1.2, b.armR * 1.6, 7, 5), (x, y) => 0.15 * Math.sin(x * 7 + y * 5)), shoulderAt(s)), C, "#2a2a2e", { rough: 0.85 });
        const [x, y, z] = shoulderAt(s);
        add(place(ring(b.armR * 1.45, b.armR * 0.16, 14), [x, y - b.armR * 0.45, z], [Math.PI / 2, 0, 0]), C, "#ff7a1a", { rough: 0.3, glow: 1.4 });
        add(place(bumpy(ball(b.shinR * 1.3, b.shinR * 1.1, b.shinR * 1.0, 7, 5), (xx, yy) => 0.15 * Math.sin(xx * 9 + yy * 5)), [0, -0.01, b.shinR * 0.5]), KNEE[s]!, "#2a2a2e", { rough: 0.85 });
      }
      add(place(ring(R * 1.04, R * 0.07, 24), [0, cy + R * 0.42, 0], [Math.PI / 2 - 0.12, 0, 0]), H, "#ff7a1a", { rough: 0.3, glow: 1.2 });
      return;
    case "lupi":
      band(shade(main, -0.35));
      for (const sx of [-1, 1]) {
        add(place(cone(R * 0.36, R * 0.72, 4), [sx * R * 0.52, cy + R * 0.68, -R * 0.05], [0, Math.PI / 4, -sx * 0.35], [1, 1, 0.42]), H, "#8a9098", { rough: 0.7 });
        add(place(cone(R * 0.22, R * 0.46, 4), [sx * R * 0.53, cy + R * 0.74, R * 0.02], [0, Math.PI / 4, -sx * 0.35], [1, 1, 0.3]), H, "#f3c6c0", { rough: 0.6 });
      }
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        add(place(cone(b.neckR * 0.5, b.neckR * 0.9, 5), [Math.sin(a) * b.neckR * 1.5, T * 0.97, Math.cos(a) * b.neckR * 1.3], [Math.cos(a) * 1.2, 0, -Math.sin(a) * 1.2]), C, "#d9dde3", { rough: 0.85 });
      }
      add(place(bumpy(limb(b.waistW * 0.32, 0.12, b.waistW * 0.25, 10), (x, y, z) => 0.1 * Math.sin(x * 50 + y * 40 + z * 30)), [0, 0, 0], [-Math.PI / 2 + 0.6, 0, 0]), BONE.tail, "#9aa1aa", { rough: 0.9 });
      add(place(bumpy(limb(b.waistW * 0.26, 0.12, 0.02, 10), (x, y, z) => 0.1 * Math.sin(x * 50 + y * 40 + z * 30)), [0, 0, 0], [-Math.PI / 2 + 0.3, 0, 0]), BONE.tailTip, "#e8ebef", { rough: 0.9 });
      return;
    case "corvi":
      add(place(keep(ball(R * 1.08, R * 1.05, R * 1.08, 24, 14), (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return hairline(x / l, y / l, z / l, 0.5, 0.15, -0.15); }), [0, cy, 0]), H, main, { rough: 0.35 });
      add(place(cone(R * 0.28, R * 0.55, 4), [0, cy + R * 0.5, R * 0.95], [Math.PI / 2 - 0.25, Math.PI / 4, 0], [1, 1, 0.4]), H, second, { rough: 0.35 });
      for (let k = 0; k < 3; k++) add(place(slab([[0, 0], [R * 0.12, R * 0.6], [0, R * 0.9], [-R * 0.12, R * 0.6]], 0.01), [0, cy + R * 0.8, -R * 0.55], [-0.9 - k * 0.25, 0, (k - 1) * 0.35]), H, k === 1 ? second : main, { rough: 0.4 });
      for (let s = 0; s < 2; s++) for (let k = 0; k < 3; k++) {
        const [x, y, z] = shoulderAt(s);
        add(place(ball(b.armR * 1.6, b.armR * 0.45, b.armR * 1.1, 12, 6), [x, y - k * b.armR * 0.55, z - b.armR * 0.1], [0, 0, (s === 0 ? 1 : -1) * (0.35 + k * 0.15)]), C, k === 2 ? second : main, { rough: 0.4, top: { colour: shade(main, 0.15), from: 0, to: 1 } });
      }
      return;
    case "aurora":
      band("#f2c935", cy + R * 0.48, 1.03);
      for (let i = 0; i < 9; i++) {
        const a = -1.2 + (i / 8) * 2.4;
        add(place(cone(R * 0.08, R * 0.32, 5), [Math.sin(a) * R * 1.02, cy + R * 0.52 + Math.cos(a) * R * 0.08, Math.cos(a) * R * 1.0], [0.3 + Math.cos(a) * 0.2, a, 0]), H, "#ffe27a", { rough: 0.25, metal: 0.5, glow: 0.4 });
      }
      for (let s = 0; s < 2; s++) {
        const side = s === 0 ? 1 : -1;
        add(place(cylinder(b.armR * 1.6, b.armR * 1.6, b.armR * 0.35, 18), shoulderAt(s), [0, 0, side * 0.35]), C, second, glossy);
        add(place(ring(b.armR * 1.6, b.armR * 0.12, 18), shoulderAt(s), [Math.PI / 2, side * 0.35, 0]), C, "#f2c935", { rough: 0.25, metal: 0.6 });
      }
      return;
    case "ghiaccio": {
      const ice: Opts = { rough: 0.08, metal: 0.1, glow: 0.18 };
      for (let s = 0; s < 2; s++) {
        const side = s === 0 ? 1 : -1, [x, y, z] = shoulderAt(s);
        for (let k = 0; k < 3; k++) add(place(cylinder(0, b.armR * (0.55 - k * 0.1), b.armR * (2.2 - k * 0.4), 6), [x - side * b.armR * 0.3 * k, y + b.armR * 0.6, z + (k - 1) * b.armR * 0.6], [(k - 1) * 0.35, 0, side * (0.25 + k * 0.25)]), C, "#bfe9ff", ice);
        add(place(cylinder(b.shinR * 1.05, b.shinR * 0.9, b.shin * 0.5, 6), [0, -b.shin * 0.45, b.shinR * 0.25]), KNEE[s]!, "#d6f2ff", ice);
      }
      band(second, cy + R * 0.45);
      for (let k = -1; k <= 1; k++) add(place(cylinder(0, R * 0.09, R * (k === 0 ? 0.5 : 0.32), 6), [k * R * 0.28, cy + R * 0.62, R * 0.9], [0.25, 0, -k * 0.3]), H, "#bfe9ff", ice);
      return;
    }
    case "tempesta":
      for (let s = 0; s < 2; s++) {
        const [x, y, z] = shoulderAt(s), side = s === 0 ? 1 : -1;
        for (let k = 0; k < 4; k++) add(place(ball(b.armR * (1.0 - k * 0.12)), [x - side * (k % 2) * b.armR * 0.5, y + b.armR * 0.25 * (k % 3), z + (k - 1.5) * b.armR * 0.7]), C, shade(second, -0.08), { rough: 0.8 });
        add(place(slab([[0, 0], [0.02, 0.04], [0.006, 0.04], [0.022, 0.08], [-0.015, 0.028], [0.0, 0.028], [-0.015, 0]], 0.01), [x, y - b.armR * 1.4, z], [Math.PI, Math.PI / 2, 0]), C, "#fff27a", { rough: 0.3, glow: 1.0 });
      }
      band(second);
      for (const sx of [-1, 1]) add(place(limb(R * 0.06, R * 0.75, R * 0.03, 6), [sx * R * 0.06, -R * 0.1, 0], [0.6, 0, sx * 0.35], [1.8, 1, 0.4]), BONE.hair, second, { rough: 0.5 });
      return;
    default: return;
  }
}

// The ten footballers and the ball on screen, read from packages/sim every frame. Each kind of
// shape of the rig (rig.ts) is one InstancedMesh for all ten players: 14 draw calls for the
// team bodies whatever the number of players, plus their shadows.
import {
  CanvasTexture, CapsuleGeometry, Color, Group, InstancedMesh, Matrix4, Mesh, Quaternion, SphereGeometry,
  SRGBColorSpace, Vector3, type BufferGeometry,
} from "three";
import { C, CLIP_DURATION, kitsClash, type Match } from "@ft3/sim";
import type { Driver } from "./driver";
import { standardMaterial } from "./materials";
import { JOINT_ROLES, PART_KINDS, PART_ROLE, PER_PLAYER, posePlayer, type ColourRole, type PartKind, type PoseInput } from "./rig";
import { BOOTS, EYES, GLOVES, KEEPER_COLOURS, LOOK_COLOURS } from "./style";

// a capsule of radius 1 and half height 1, so a limb's scale is (radius, half length, radius)
const limb = () => new CapsuleGeometry(1, 2, 3, 10).scale(1, 0.5, 1);
const GEOMETRY: Record<PartKind, () => BufferGeometry> = {
  head: () => new SphereGeometry(1, 20, 14),
  // a cap over the top of the head, tilted back so the forehead and the eyes show
  hair: () => new SphereGeometry(1, 18, 7, 0, Math.PI * 2, 0, Math.PI * 0.52).rotateX(-0.55),
  eye: () => new SphereGeometry(1, 8, 5),
  neck: limb, torso: limb, upperArm: limb, forearm: limb, thigh: limb, shortsLeg: limb, shin: limb,
  pelvis: () => new SphereGeometry(1, 14, 10),
  hand: () => new SphereGeometry(1, 12, 8),
  joint: () => new SphereGeometry(1, 10, 7),
  foot: () => new SphereGeometry(1, 12, 8),
};
const ROUGHNESS: Record<ColourRole, number> = { skin: 0.55, hair: 0.7, eye: 0.15, shirt: 0.55, shorts: 0.6, socks: 0.65, boots: 0.3, gloves: 0.45 };

export interface PlayerKit {
  shirt: string;
  shorts: string;
  socks: string;
}

// The two teams' kits and their keepers', the keepers in a colour neither shirt is near.
export function teamKits(home: { kit: string; second: string }, away: { kit: string; second: string }): PlayerKit[][] {
  const keepers: string[] = [];
  for (const c of KEEPER_COLOURS) if (!kitsClash(c, home.kit) && !kitsClash(c, away.kit) && !keepers.some((k) => kitsClash(k, c))) keepers.push(c);
  while (keepers.length < 2) keepers.push(KEEPER_COLOURS[KEEPER_COLOURS.length - 1 - keepers.length]!);
  return [home, away].map((t, team) => [0, 1, 2, 3, 4].map((slot) => slot === 0
    ? { shirt: keepers[team]!, shorts: "#2a2f3a", socks: keepers[team]! }
    : { shirt: t.kit, shorts: t.second, socks: t.kit }));
}

const BALL_TEXTURE = (): CanvasTexture => {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f7f7f2"; g.fillRect(0, 0, 256, 128);
  g.fillStyle = "#e23b2e";
  for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(20 + k * 44, k % 2 ? 40 : 88, 15, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = "#1d2433"; g.fillRect(0, 60, 256, 8);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
};

export interface Actors {
  group: Group;
  update(driver: Driver, time: number, dt: number): void;
}

export function buildActors(match: Match, kits: PlayerKit[][]): Actors {
  const group = new Group();
  const meshes = {} as Record<PartKind, InstancedMesh>;
  const matrices = {} as Record<PartKind, Matrix4[]>;
  const n = match.players.length;
  const colour = new Color();
  for (const kind of PART_KINDS) {
    const count = n * PER_PLAYER[kind];
    const role = PART_ROLE[kind];
    const mesh = new InstancedMesh(GEOMETRY[kind](), standardMaterial({ roughness: role ? ROUGHNESS[role] : 0.55, rim: kind === "eye" ? 0 : 0.55 }), count);
    mesh.castShadow = kind !== "eye"; mesh.receiveShadow = true; mesh.frustumCulled = false;
    match.players.forEach((p, i) => {
      const kit = kits[p.team]![p.slot]!, [skin, hair] = LOOK_COLOURS[p.look % LOOK_COLOURS.length]!;
      const of = (r: ColourRole) => ({ skin, hair, eye: EYES, shirt: kit.shirt, shorts: kit.shorts, socks: kit.socks, boots: BOOTS, gloves: GLOVES })[r];
      for (let j = 0; j < PER_PLAYER[kind]; j++) mesh.setColorAt(i * PER_PLAYER[kind] + j, colour.set(of(role ?? JOINT_ROLES[j]!)));
    });
    meshes[kind] = mesh;
    matrices[kind] = Array.from({ length: count }, () => new Matrix4());
    group.add(mesh);
  }

  const ball = new Mesh(new SphereGeometry(C.ballRadius, 28, 18), standardMaterial({ map: BALL_TEXTURE(), roughness: 0.35, rim: 0.3 }));
  ball.castShadow = true;
  group.add(ball);

  const prevYaw = new Float64Array(n).fill(NaN);
  const spin = new Quaternion(), axis = new Vector3();
  const pose: PoseInput = { x: 0, z: 0, fx: 1, fz: 0, height: 1, speed: 0, gait: "walk", phase: 0, turnRate: 0, lookYaw: 0, time: 0, kick: -1, slide: -1, react: 0, lunge: false, hold: false, celebrate: -1, charge: -1 };

  return {
    group,
    update(driver: Driver, time: number, dt: number) {
      const a = driver.alpha, A = driver.before, B = driver.after, m = driver.match;
      const bx = A.ballX + (B.ballX - A.ballX) * a, bz = A.ballZ + (B.ballZ - A.ballZ) * a;
      m.players.forEach((p, i) => {
        const x = A.x[i]! + (B.x[i]! - A.x[i]!) * a, z = A.z[i]! + (B.z[i]! - A.z[i]!) * a;
        let fx = A.fx[i]! + (B.fx[i]! - A.fx[i]!) * a, fz = A.fz[i]! + (B.fz[i]! - A.fz[i]!) * a;
        const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl;
        const yaw = Math.atan2(fx, fz);
        let turn = Number.isNaN(prevYaw[i]!) ? 0 : yaw - prevYaw[i]!;
        if (turn > Math.PI) turn -= Math.PI * 2; else if (turn < -Math.PI) turn += Math.PI * 2;
        prevYaw[i] = yaw;
        let look = Math.atan2(bx - x, bz - z) - yaw;
        if (look > Math.PI) look -= Math.PI * 2; else if (look < -Math.PI) look += Math.PI * 2;
        pose.x = x; pose.z = z; pose.fx = fx; pose.fz = fz;
        pose.height = p.isKeeper ? 1 : p.height;
        pose.speed = Math.hypot(p.vx, p.vz);
        pose.gait = p.gait; pose.phase = p.phase;
        pose.turnRate = dt > 0 ? turn / dt : 0;
        pose.lookYaw = Math.abs(look) < 1.6 ? look : 0;
        pose.time = time + i * 0.7;
        pose.kick = p.kickT >= 0 && p.kickClip ? Math.min(1, p.kickT / (CLIP_DURATION[p.kickClip] ?? 0.3)) : -1;
        pose.slide = p.slideT >= 0 ? 0.5 * Math.min(1, p.slideT / C.slideTime) : p.slideDownT > 0 ? 0.5 + 0.5 * (1 - p.slideDownT / C.slideDown) : -1;
        pose.react = p.react;
        pose.lunge = p.hitT >= 0;
        pose.hold = p.isKeeper && m.ball.carrier === p;
        pose.celebrate = p.celebrate;
        pose.charge = p.charge >= 0 ? p.charge / C.shotCharge : -1;
        posePlayer(pose, matrices, i);
      });
      for (const kind of PART_KINDS) {
        const mesh = meshes[kind], list = matrices[kind];
        for (let k = 0; k < list.length; k++) mesh.setMatrixAt(k, list[k]!);
        mesh.instanceMatrix.needsUpdate = true;
      }
      // the ball, rolling on the ground by the way it moves
      const by = A.ballY + (B.ballY - A.ballY) * a;
      const vx = m.ball.vx, vz = m.ball.vz, sp = Math.hypot(vx, vz);
      ball.position.set(bx, by, bz);
      if (sp > 0.01 && dt > 0) {
        axis.set(vz / sp, 0, -vx / sp);
        ball.quaternion.premultiply(spin.setFromAxisAngle(axis, sp * dt / C.ballRadius));
      }
    },
  };
}

// The ten footballers and the ball on screen, read from packages/sim every frame. All the players
// are one SkinnedMesh (character.ts): one draw call for the bodies and one for their shadows,
// whatever their hair, gear and bodies.
import { CanvasTexture, Group, Mesh, Quaternion, SphereGeometry, SRGBColorSpace, Vector3 } from "three";
import { C, clubById, kitsClash, type Match } from "@ft3/sim";
import { buildCast, type Cast } from "./character.ts";
import type { Driver } from "./driver.ts";
import { EXPRESSION } from "./faces.ts";
import { designFor, type Design, type Style } from "./looks.ts";
import { standardMaterial } from "./materials.ts";
import { Animator, type MoveContext, type Pose } from "./moves.ts";
import { BONES_PER_PLAYER, newJoints, skeleton } from "./rig.ts";
import { KEEPER_COLOURS } from "./style.ts";

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

// The designs of a match's players: each card's own face and body, its team's kit and gear.
export function matchDesigns(match: Match, kits: PlayerKit[][], clubs: [string, string], style: Style): Design[] {
  return match.players.map((p) => designFor(p.card, clubById(clubs[p.team])!, kits[p.team]![p.slot]!, style, p.isKeeper, p.slot));
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
  cast: Cast;
  update(driver: Driver, time: number, dt: number): void;
}

export function buildActors(designs: Design[]): Actors {
  const group = new Group();
  const cast = buildCast(designs);
  group.add(cast.mesh);

  const ball = new Mesh(new SphereGeometry(C.ballRadius, 28, 18), standardMaterial({ map: BALL_TEXTURE(), roughness: 0.35, rim: 0.3 }));
  ball.castShadow = true;
  group.add(ball);

  const animator = new Animator(designs.length, designs);
  const pose: Pose = { x: 0, z: 0, fx: 0, fz: 1, joints: newJoints(), expression: "neutral", ballInHands: null, contactMiss: -1 };
  const spin = new Quaternion(), axis = new Vector3();
  const ctx: MoveContext = { frames: [], before: undefined!, after: undefined!, alpha: 0, time: 0, dt: 0 };

  return {
    group,
    cast,
    update(driver: Driver, time: number, dt: number) {
      ctx.frames = driver.frames; ctx.before = driver.before; ctx.after = driver.after; ctx.alpha = driver.alpha; ctx.time = time; ctx.dt = dt;
      animator.begin(ctx);
      let hands: Vector3 | null = null;
      cast.designs.forEach((d, i) => {
        const body = cast.bodies[i]!;
        animator.pose(ctx, i, d, body, pose);
        const still = Math.hypot(ctx.after.players[i]!.vx, ctx.after.players[i]!.vz) < 0.3;
        skeleton(pose.x, pose.z, pose.fx, pose.fz, d.height, body, pose.joints, cast.bones, i * BONES_PER_PLAYER, still ? 1 + 0.015 * Math.sin((time + i * 0.7) * 2.2) : 1);
        cast.expressions[i] = EXPRESSION[pose.expression];
        if (pose.ballInHands) hands = pose.ballInHands;
      });
      cast.time.value = time;
      cast.commit();
      const A = driver.before.ball, B = driver.after.ball, a = driver.alpha, m = driver.match;
      // the ball, rolling on the ground by the way it moves
      const vx = m.ball.vx, vz = m.ball.vz, sp = Math.hypot(vx, vz);
      // a ball in the keeper's hands is drawn there (the simulation carries it at 0,75 m)
      if (hands) ball.position.copy(hands);
      else ball.position.set(A.x + (B.x - A.x) * a, A.y + (B.y - A.y) * a, A.z + (B.z - A.z) * a);
      if (sp > 0.01 && dt > 0) {
        axis.set(vz / sp, 0, -vx / sp);
        ball.quaternion.premultiply(spin.setFromAxisAngle(axis, sp * dt / C.ballRadius));
      }
    },
  };
}

// The ten footballers and the ball on screen, read from packages/sim every frame. The players are
// drawn through the player look layer (appearance.ts): this file says where each one is and what
// he is doing, not how he looks.
import { CanvasTexture, Group, Mesh, Quaternion, SphereGeometry, SRGBColorSpace, Vector3, type Object3D } from "three";
import { C, CLIP_DURATION, clubById, kitsClash, type Match, type Player } from "@ft3/sim";
import { createAppearance, newFrame, type Appearance } from "./appearance";
import type { Driver } from "./driver";
import type { Expression } from "./faces";
import { designFor, type Design, type Style } from "./looks";
import { standardMaterial } from "./materials";
import { KEEPER_COLOURS } from "./style";

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

// What the face shows, from what the simulation says the player is doing.
export function expressionOf(p: Player, m: Match, time: number, i: number): Expression {
  if (p.celebrate >= 0) return "joy";
  if (p.react > 0 || p.knockT > 0 || p.slideDownT > 0) return "pain";
  if (p.fooled > 0) return "surprise";
  if (p.kickT >= 0 || p.charge >= 0 || p.hitT >= 0 || p.slideT >= 0) return "effort";
  if (m.ball.carrier === p) return "focus";
  // a blink every few seconds, each player on his own beat
  const beat = (time + i * 1.37) % (3.1 + (i % 4) * 0.45);
  return beat < 0.12 ? "blink" : "neutral";
}

export interface Actors {
  group: Group;
  players: Appearance;
  update(driver: Driver, time: number, dt: number): void;
  dispose(): void;
}

// model: the GLB to draw every player with; without it, the pieces in code
export function buildActors(designs: Design[], model?: Object3D): Actors {
  const group = new Group();
  const players = createAppearance(designs, model);
  group.add(players.object);

  const ball = new Mesh(new SphereGeometry(C.ballRadius, 28, 18), standardMaterial({ map: BALL_TEXTURE(), roughness: 0.35, rim: 0.3 }));
  ball.castShadow = true;
  group.add(ball);

  const n = designs.length;
  const prevYaw = new Float64Array(n).fill(NaN);
  const spin = new Quaternion(), axis = new Vector3();
  const pose = newFrame();

  return {
    group,
    players,
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
        const d = designs[i]!;
        pose.x = x; pose.z = z; pose.fx = fx; pose.fz = fz;
        pose.height = d.height;
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
        pose.expression = expressionOf(p, m, time, i);
        players.set(i, pose);
      });
      players.commit(time);
      // the ball, rolling on the ground by the way it moves
      const by = A.ballY + (B.ballY - A.ballY) * a;
      const vx = m.ball.vx, vz = m.ball.vz, sp = Math.hypot(vx, vz);
      ball.position.set(bx, by, bz);
      if (sp > 0.01 && dt > 0) {
        axis.set(vz / sp, 0, -vx / sp);
        ball.quaternion.premultiply(spin.setFromAxisAngle(axis, sp * dt / C.ballRadius));
      }
    },
    dispose() { players.dispose(); },
  };
}

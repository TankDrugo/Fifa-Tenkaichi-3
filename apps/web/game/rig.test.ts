// The body is drawn where the simulation puts the player: a root matrix composed with itself as
// parent once drew the player at twice his distance from the middle (22/10/2026).
import { describe, expect, it } from "vitest";
import { Matrix4, Vector3 } from "three";
import { HIP_HEIGHT, PART_KINDS, PER_PLAYER, posePlayer, type PartKind, type PoseInput } from "./rig";
import { CHARACTER_HEIGHT } from "./style";

const pose = (x: number, z: number, fx: number, fz: number): PoseInput => ({ x, z, fx, fz, height: 1, speed: 0, gait: "walk", phase: 0, turnRate: 0, lookYaw: 0, time: 0, kick: -1, slide: -1, react: 0, lunge: false, hold: false, celebrate: -1, charge: -1 });
const fresh = () => Object.fromEntries(PART_KINDS.map((k) => [k, Array.from({ length: PER_PLAYER[k] }, () => new Matrix4())])) as Record<PartKind, Matrix4[]>;
const at = (m: Matrix4) => new Vector3().setFromMatrixPosition(m);

describe("lo scheletro sta dove lo mette la simulazione", () => {
  for (const [x, z] of [[-13.47, -0.33], [13.48, -0.82], [2.72, -3.8], [0, 7.75]] as const) {
    it(`giocatore a (${x}; ${z}): testa e bacino sopra quel punto`, () => {
      const out = fresh();
      posePlayer(pose(x, z, 1, 0), out, 0);
      const head = at(out.head[0]!), pelvis = at(out.pelvis[0]!);
      for (const p of [head, pelvis]) { expect(Math.abs(p.x - x)).toBeLessThan(0.15); expect(Math.abs(p.z - z)).toBeLessThan(0.15); }
      expect(pelvis.y).toBeGreaterThan(HIP_HEIGHT * CHARACTER_HEIGHT * 0.8);
      expect(head.y).toBeLessThan(CHARACTER_HEIGHT * 1.1);
    });
  }
  it("guarda dove guarda il giocatore: gli occhi stanno davanti", () => {
    const out = fresh();
    posePlayer(pose(0, 0, 0, -1), out, 0);
    expect(at(out.eye[0]!).z).toBeLessThan(at(out.head[0]!).z);
  });
});

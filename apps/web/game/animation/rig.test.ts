// The body is drawn where the simulation puts the player: a root matrix composed with itself as
// parent once drew the player at twice his distance from the middle (22/10/2026). And every figure
// keeps the classic height, so the card's height (0,92-1,07) is the only size on the pitch.
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { CLUBS, clubSquad, FIGURES } from "@ft3/sim";
import { CLASSIC_HEIGHT, FIGURE_BUILD, hipHeight, makeBody } from "../render/body";
import { designFor } from "../render/looks";
import { buildParts } from "../render/parts";
import { BONE, BONES_PER_PLAYER, bonePosition, locomotion, newJoints, skeleton, type PoseInput } from "./rig";
import { CHARACTER_HEIGHT } from "../render/style";

const pose = (x: number, z: number, fx: number, fz: number): PoseInput => ({ x, z, fx, fz, height: 1, speed: 0, gait: "walk", phase: 0, turnRate: 0, lookYaw: 0, time: 0, kick: -1, slide: -1, react: 0, lunge: false, hold: false, celebrate: -1, charge: -1 });

describe("lo scheletro sta dove lo mette la simulazione", () => {
  const body = makeBody({});
  for (const [x, z] of [[-13.47, -0.33], [13.48, -0.82], [2.72, -3.8], [0, 7.75]] as const) {
    it(`giocatore a (${x}; ${z}): testa e bacino sopra quel punto`, () => {
      const out = new Float32Array(BONES_PER_PLAYER * 16), j = newJoints();
      locomotion(pose(x, z, 1, 0), body, j);
      skeleton(x, z, 1, 0, 1, body, j, out, 0);
      const head = bonePosition(out, 0, BONE.head), pelvis = bonePosition(out, 0, BONE.pelvis);
      for (const p of [head, pelvis]) { expect(Math.abs(p.x - x)).toBeLessThan(0.15); expect(Math.abs(p.z - z)).toBeLessThan(0.15); }
      expect(pelvis.y).toBeGreaterThan(hipHeight(body) * CHARACTER_HEIGHT * 0.8);
      expect(head.y).toBeLessThan(CHARACTER_HEIGHT * 1.1);
    });
  }
  it("guarda dove guarda il giocatore: la faccia sta davanti", () => {
    const out = new Float32Array(BONES_PER_PLAYER * 16), j = newJoints();
    locomotion(pose(0, 0, 0, -1), body, j);
    skeleton(0, 0, 0, -1, 1, body, j, out, 0);
    // the head bone's +z (where the face is drawn) points along the facing
    const o = BONE.head * 16, forward = new Vector3(out[o + 8], out[o + 9], out[o + 10]).normalize();
    expect(forward.z).toBeLessThan(-0.9);
  });
  it("il secondo giocatore scrive le sue ossa e non quelle del primo", () => {
    const out = new Float32Array(2 * BONES_PER_PLAYER * 16), j = newJoints();
    locomotion(pose(5, 2, 1, 0), body, j);
    skeleton(5, 2, 1, 0, 1, body, j, out, BONES_PER_PLAYER);
    expect(bonePosition(out, 0, BONE.pelvis).length()).toBe(0);
    expect(Math.abs(bonePosition(out, BONES_PER_PLAYER, BONE.pelvis).x - 5)).toBeLessThan(0.15);
  });
});

describe("corpi e pezzi", () => {
  it("ogni figura ha l'altezza della classica", () => {
    for (const f of FIGURES) {
      const b = makeBody(FIGURE_BUILD[f.id] ?? {});
      const h = b.ankle + b.shin + b.thigh + b.pelvisUp + b.torso + b.neck + b.headR * 1.92;
      expect(Math.abs(h - CLASSIC_HEIGHT)).toBeLessThan(1e-9);
    }
  });
  it("14 squadre per 2 stili: pezzi costruiti, al massimo 9.000 triangoli a giocatore", () => {
    let most = 0;
    for (const club of CLUBS) for (const style of ["A", "B"] as const) clubSquad(club).forEach((card, slot) => {
      const kit = { shirt: club.kit, shorts: club.kit2 || club.alt, socks: club.kit };
      const d = designFor(card, club, kit, style, slot === 0, slot);
      let tris = 0;
      for (const p of buildParts(d, makeBody(d.build))) {
        expect(p.bone).toBeGreaterThanOrEqual(0);
        expect(p.bone).toBeLessThan(BONES_PER_PLAYER);
        tris += (p.geo.index ? p.geo.index.count : p.geo.getAttribute("position").count) / 3;
      }
      most = Math.max(most, tris);
    });
    expect(most).toBeLessThan(9000);
  });
});

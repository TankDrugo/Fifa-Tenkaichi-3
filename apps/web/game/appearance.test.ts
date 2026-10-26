// The player look layer (appearance.ts) with a GLB model: each copy stands where the simulation
// puts the player, turned the way he faces, on its feet and as tall as the card says, whatever
// height and origin the model came with, dressed in the team's kit and moved by the model's clips.
// The pieces in code are checked by rig.test.ts and by the photos of /partita and /personaggi,
// which need a canvas for the faces.
import { describe, expect, it } from "vitest";
import {
  AnimationClip, Bone, Box3, BoxGeometry, Color, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  Skeleton, SkinnedMesh, Uint16BufferAttribute, Vector3, VectorKeyframeTrack,
} from "three";
import { CLUBS, clubSquad } from "@ft3/sim";
import { createAppearance, newFrame } from "./appearance";
import { designFor } from "./looks";
import { trianglesOf } from "./modelAppearance";
import { CHARACTER_HEIGHT } from "./style";

const club = CLUBS[0]!;
const kit = { shirt: club.kit, shorts: club.alt, socks: club.kit };
const designs = clubSquad(club).map((card, slot) => designFor(card, club, kit, "A", slot === 0, slot));

// A model 1,8 units tall with its origin at the waist, its nose toward +Z.
function model(): Group {
  const g = new Group();
  const body = new Mesh(new BoxGeometry(0.5, 1.8, 0.3), new MeshBasicMaterial());
  const nose = new Mesh(new BoxGeometry(0.1, 0.1, 0.1), new MeshBasicMaterial());
  nose.name = "nose";
  nose.position.set(0, 0.7, 0.2);
  g.add(body, nose);
  return g;
}

describe("aspetto del giocatore con un modello GLB", () => {
  it("una copia a giocatore, triangoli contati", () => {
    const a = createAppearance(designs, model());
    expect(a.count).toBe(designs.length);
    expect(a.object.children.length).toBe(designs.length);
    expect(a.triangles).toBe(24 * designs.length);
  });
  for (const [x, z, fx, fz, height] of [[0, 0, 0, 1, 1], [-13.47, -0.33, 1, 0, 0.92], [2.72, -3.8, -0.6, 0.8, 1.07]] as const) {
    it(`a (${x}; ${z}), alto ${height}: piedi a terra, sopra quel punto, naso verso dove guarda`, () => {
      const a = createAppearance(designs, model());
      const f = newFrame();
      Object.assign(f, { x, z, fx, fz, height });
      a.set(1, f);
      a.commit(0);
      a.object.updateMatrixWorld(true);
      const copy = a.object.children[1]!;
      const box = new Box3().setFromObject(copy);
      expect(box.min.y).toBeCloseTo(0, 5);
      expect(box.max.y).toBeCloseTo(CHARACTER_HEIGHT * height, 5);
      const mid = box.getCenter(new Vector3());
      expect(Math.abs(mid.x - x)).toBeLessThan(0.2);
      expect(Math.abs(mid.z - z)).toBeLessThan(0.2);
      const nose = copy.getObjectByName("nose")!.getWorldPosition(new Vector3());
      const ahead = (nose.x - x) * fx + (nose.z - z) * fz;
      expect(ahead).toBeGreaterThan(0);
      expect(Math.abs((nose.x - x) * fz - (nose.z - z) * fx)).toBeLessThan(1e-6);
    });
  }
  it("i materiali con il nome della squadra prendono i colori del completo, gli altri restano", () => {
    const g = model();
    const body = g.children[0] as Mesh;
    body.material = new MeshStandardMaterial({ name: "maglia", color: "#ffffff" });
    (g.children[1] as Mesh).material = new MeshStandardMaterial({ name: "fissi", color: "#123456" });
    const a = createAppearance(designs, g);
    const shirt = (a.object.children[2]!.getObjectByProperty("isMesh", true) as Mesh).material as MeshStandardMaterial;
    expect(shirt.color.getHexString()).toBe(new Color(designs[2]!.kit.shirt).getHexString());
    expect(((a.object.children[2]!.getObjectByName("nose") as Mesh).material as MeshStandardMaterial).color.getHexString()).toBe("123456");
    expect((body.material as MeshStandardMaterial).color.getHexString()).toBe("ffffff");
  });
  it("l'altezza scritta negli extras del modello vale più del riquadro (la cresta non lo accorcia)", () => {
    const g = model();
    g.userData.height = 1.5;
    const a = createAppearance(designs, g);
    a.set(0, newFrame());
    a.object.updateMatrixWorld(true);
    expect(a.object.children[0]!.scale.y).toBeCloseTo(CHARACTER_HEIGHT / 1.5, 6);
  });
  it("le clip seguono la simulazione: corsa dalla fase del passo, ferma sotto 0,3 m/s, tiro dal suo avanzamento", () => {
    const bone = new Bone();
    bone.name = "hips";
    const g = model();
    g.add(bone);
    // each clip moves the bone along its own axis, 1 m per second of clip
    const track = (axis: number) => new VectorKeyframeTrack("hips.position", [0, 1], [0, 0, 0, ...[0, 1, 2].map((k) => (k === axis ? 1 : 0))]);
    g.animations = [new AnimationClip("idle", 1, [track(1)]), new AnimationClip("run", 1, [track(0)]), new AnimationClip("kick", 1, [track(2)])];
    const a = createAppearance(designs, g);
    const at = (f: Partial<ReturnType<typeof newFrame>>) => {
      a.set(0, Object.assign(newFrame(), f));
      a.commit(0);
      return a.object.children[0]!.getObjectByName("hips")!.position.toArray().map((v) => Math.round(v * 1000) / 1000);
    };
    expect(at({ speed: 5, phase: 0.25 })).toEqual([0.25, 0, 0]);
    expect(at({ speed: 0.1, time: 0.4 })).toEqual([0, 0.4, 0]);
    expect(at({ speed: 1.6, phase: 0.5, time: 0.2 })).toEqual([0.25, 0.1, 0]);
    expect(at({ speed: 5, kick: 0.6 })).toEqual([0, 0, 0.6]);
  });
  it("un modello con lo scheletro: ogni copia ha le sue ossa", () => {
    const geo = new BoxGeometry(0.4, 1.6, 0.3, 1, 4, 1);
    const n = geo.getAttribute("position").count;
    geo.setAttribute("skinIndex", new Uint16BufferAttribute(new Uint16Array(n * 4), 4));
    geo.setAttribute("skinWeight", new Float32BufferAttribute(new Float32Array(n * 4).map((_, k) => (k % 4 === 0 ? 1 : 0)), 4));
    const root = new Bone();
    const mesh = new SkinnedMesh(geo, new MeshBasicMaterial());
    const g = new Group();
    g.add(root, mesh);
    mesh.bind(new Skeleton([root]));
    const a = createAppearance(designs, g);
    const bones = new Set<Bone>();
    a.object.traverse((o) => { if ((o as SkinnedMesh).isSkinnedMesh) bones.add((o as SkinnedMesh).skeleton.bones[0]!); });
    expect(bones.size).toBe(designs.length);
    expect(bones.has(root)).toBe(false);
    expect(trianglesOf(g)).toBe(36);
  });
});

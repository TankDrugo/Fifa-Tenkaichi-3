// The look of the players drawn by a GLB model (appearance.ts): one copy of the model a player,
// stood where the simulation puts him and turned the way he faces. The model is read as the guide
// for Tancredi's files asks (docs/STUDIO-PERSONAGGI.md, section 11): standing, looking toward +Z,
// any height, which the game brings to CHARACTER_HEIGHT times the card's height, the feet put on
// the ground. The height is the model's box, or the number in a node's extras `height` when the
// model has one (hair above the head does not make the player shorter). Materials named for the
// team take the kit's colours (point 3). Clips named idle, run and kick, when the model has them,
// follow the simulation (point 6): the run by the stride's phase, blended with idle by the speed,
// the kick by its progress. The other actions and the faces' expressions belong to the pieces in
// code.
import { AnimationMixer, Box3, Group, LoopOnce, LoopRepeat, type AnimationAction, type Material, type Mesh, type Object3D } from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Appearance, PlayerFrame } from "./appearance";
import type { Design, Kit } from "../render/looks";
import { CHARACTER_HEIGHT } from "../render/style";

// The triangles of every mesh in an object.
export function trianglesOf(object: Object3D): number {
  let n = 0;
  object.traverse((o) => {
    const g = (o as Mesh).isMesh ? (o as Mesh).geometry : undefined;
    if (g) n += (g.index ? g.index.count : g.getAttribute("position").count) / 3;
  });
  return n;
}

// The material names a model gives the parts that take the team's colours, and which colour.
export const TEAM_MATERIALS: Record<string, (k: Kit) => string> = {
  maglia: (k) => k.shirt,
  maglia2: (k) => k.second,
  pantaloncini: (k) => k.shorts,
  calzettoni: (k) => k.socks,
  scarpe: (k) => k.boots,
};

// The model's height in its own units: a node's extras `height`, or its box.
export function modelHeight(model: Object3D, box: Box3): number {
  let h = 0;
  model.traverse((o) => { const v = Number(o.userData?.height); if (!h && v > 0) h = v; });
  return h || box.max.y - box.min.y || 1;
}

// speed in m/s where the run clip has all the weight (the simulation runs above 3,2, RUN_ABOVE)
const FULL_RUN = 3.2;
const STILL = 0.3;

interface Copy {
  holder: Group;
  mixer?: AnimationMixer;
  idle?: AnimationAction;
  run?: AnimationAction;
  kick?: AnimationAction;
}

function start(mixer: AnimationMixer, model: Object3D, name: string, once = false): AnimationAction | undefined {
  const clip = model.animations.find((c) => c.name === name);
  if (!clip) return undefined;
  const a = mixer.clipAction(clip);
  a.setLoop(once ? LoopOnce : LoopRepeat, Infinity);
  a.clampWhenFinished = once;
  a.play();
  // the time is set from the simulation every frame, never advanced by the mixer
  a.paused = true;
  a.setEffectiveWeight(0);
  return a;
}

export function modelAppearance(designs: Design[], model: Object3D): Appearance {
  const object = new Group();
  const box = new Box3().setFromObject(model, true);
  const tall = modelHeight(model, box);
  // one material per team part and colour, shared by the copies that wear it
  const kitMaterials = new Map<string, Material>();
  const dressed = (m: Material, kit: Kit): Material => {
    const colour = TEAM_MATERIALS[m.name]?.(kit);
    if (!colour) return m;
    const key = `${m.name}|${colour}`;
    let out = kitMaterials.get(key);
    if (!out) {
      out = m.clone();
      (out as Material & { color?: { set(c: string): void } }).color?.set(colour);
      kitMaterials.set(key, out);
    }
    return out;
  };
  const copies: Copy[] = designs.map((d) => {
    // the copy stands on its feet inside a holder the frame moves
    const holder = new Group(), copy = clone(model);
    copy.position.y -= box.min.y;
    copy.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map((m) => dressed(m, d.kit)) : dressed(mesh.material, d.kit);
    });
    holder.add(copy);
    object.add(holder);
    if (!model.animations.length) return { holder };
    const mixer = new AnimationMixer(copy);
    return { holder, mixer, idle: start(mixer, model, "idle"), run: start(mixer, model, "run"), kick: start(mixer, model, "kick", true) };
  });
  const each = trianglesOf(model);
  return {
    object,
    count: copies.length,
    triangles: each * copies.length,
    set(i: number, f: PlayerFrame) {
      const c = copies[i];
      if (!c) return;
      const h = c.holder;
      h.position.set(f.x, 0, f.z);
      h.rotation.set(0, Math.atan2(f.fx, f.fz), 0);
      h.scale.setScalar((CHARACTER_HEIGHT * f.height) / tall);
      if (!c.mixer) return;
      const kicking = f.kick >= 0 && c.kick !== undefined;
      const run = kicking || f.speed < STILL ? 0 : Math.min(1, f.speed / FULL_RUN);
      if (c.kick) {
        c.kick.setEffectiveWeight(kicking ? 1 : 0);
        c.kick.time = kicking ? f.kick * c.kick.getClip().duration : 0;
      }
      if (c.run) {
        c.run.setEffectiveWeight(run);
        c.run.time = f.phase * c.run.getClip().duration;
      }
      if (c.idle) {
        c.idle.setEffectiveWeight(kicking ? 0 : 1 - run);
        const d = c.idle.getClip().duration;
        c.idle.time = ((f.time % d) + d) % d;
      }
    },
    commit() {
      for (const c of copies) c.mixer?.update(0);
    },
    // the geometries and the loaded model's materials are shared by the copies: whoever loaded the
    // model disposes of them; the team's materials were made here
    dispose() {
      for (const c of copies) c.mixer?.stopAllAction();
      for (const m of kitMaterials.values()) m.dispose();
      object.clear();
    },
  };
}

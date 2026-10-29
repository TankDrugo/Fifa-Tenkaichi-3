// The look of the players drawn by a GLB model (appearance.ts): one copy of the model a player,
// stood where the simulation puts him and turned the way he faces. The model is read as the guide
// for Tancredi's files asks (docs/STUDIO-PERSONAGGI.md, section 11): standing, looking toward +Z,
// any height, which the game brings to CHARACTER_HEIGHT times the card's height, the feet put on
// the ground. The height is the model's box, or the number in a node's extras `height` when the
// model has one (hair above the head does not make the player shorter). Materials named for the
// team take the kit's colours (point 3). The model's table of clips (models.ts, in userData.clips;
// without one, clips named idle, run and kick) says which clip plays each state, and the clips
// follow the simulation (point 6): walk and run by the stride's phase, blended with idle and with
// each other by the speed, the shot and the pass each by its kick's progress. The other actions and
// the faces' expressions belong to the pieces in code.
import { AnimationMixer, Box3, Group, LoopOnce, LoopRepeat, type AnimationAction, type Material, type Mesh, type Object3D } from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Appearance, PlayerFrame } from "./appearance";
import type { Design, Kit } from "../render/looks";
import { CODE_CLIPS, type ClipState, type ClipTable, type ClipUse } from "./models";
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

// speeds in m/s: below STILL the player stands; with a walk clip, idle gives way to the walk by
// WALKING and the walk to the run between WALK_UP and FULL_RUN (the simulation walks below 2,8 and
// runs above 3,2, WALK_BELOW and RUN_ABOVE); without one, idle gives way to the run by FULL_RUN
const STILL = 0.3, WALKING = 1.2, WALK_UP = 2.6, FULL_RUN = 3.2;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// A clip of the table, playing in one copy.
interface Played { use: ClipUse; action: AnimationAction; duration: number }

interface Copy {
  holder: Group;
  mixer?: AnimationMixer;
  states: Partial<Record<ClipState, Played>>;
  // every action once, with the weight it gets this frame (shot and pass can share a clip)
  actions: Map<AnimationAction, number>;
}

const STATES: ClipState[] = ["idle", "walk", "run", "shot", "pass"];

function start(copy: Copy, model: Object3D, table: ClipTable): void {
  for (const state of STATES) {
    const use = table[state];
    const clip = use && model.animations.find((c) => c.name === use.clip);
    if (!use || !clip) continue;
    const a = copy.mixer!.clipAction(clip), once = state === "shot" || state === "pass";
    if (!copy.actions.has(a)) {
      a.setLoop(once ? LoopOnce : LoopRepeat, Infinity);
      a.clampWhenFinished = once;
      a.play();
      // the time is set from the simulation every frame, never advanced by the mixer
      a.paused = true;
      a.setEffectiveWeight(0);
      copy.actions.set(a, 0);
    }
    copy.states[state] = { use, action: a, duration: clip.duration };
  }
}

export function modelAppearance(designs: Design[], model: Object3D): Appearance {
  const object = new Group();
  // a copy made by SkeletonUtils.clone has its bones' world matrices still to compute, and the box
  // of a skinned mesh is read through them
  model.updateMatrixWorld(true);
  const box = new Box3().setFromObject(model, true);
  const tall = modelHeight(model, box);
  const table = (model.userData.clips as ClipTable | undefined) ?? CODE_CLIPS;
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
    const c: Copy = { holder, states: {}, actions: new Map() };
    if (!model.animations.length) return c;
    c.mixer = new AnimationMixer(copy);
    start(c, model, table);
    return c;
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
      const st = c.states;
      for (const a of c.actions.keys()) c.actions.set(a, 0);
      const weigh = (p: Played | undefined, w: number) => { if (p && w > 0) c.actions.set(p.action, c.actions.get(p.action)! + w); };
      // a stride clip at the simulation's phase, its left foot ahead at phase 0
      const stride = (p: Played | undefined) => { if (p) p.action.time = ((f.phase + (p.use.offset ?? 0)) % 1) * p.duration; };
      const kick = f.kick >= 0 ? st[f.kickKind] : undefined;
      if (kick) {
        const from = kick.use.from ?? 0, to = Math.min(kick.use.to ?? kick.duration, kick.duration);
        kick.action.time = from + f.kick * (to - from);
        weigh(kick, 1);
      } else {
        const moving = f.speed < STILL ? 0 : 1;
        if (st.walk) {
          const go = moving * clamp01(f.speed / WALKING), run = st.run ? clamp01((f.speed - WALK_UP) / (FULL_RUN - WALK_UP)) : 0;
          weigh(st.idle, 1 - go); weigh(st.walk, go * (1 - run)); weigh(st.run, go * run);
        } else {
          const run = st.run ? moving * Math.min(1, f.speed / FULL_RUN) : 0;
          weigh(st.idle, 1 - run); weigh(st.run, run);
        }
        stride(st.walk); stride(st.run);
        if (st.idle) {
          const d = st.idle.duration;
          st.idle.action.time = ((f.time % d) + d) % d;
        }
      }
      for (const [a, w] of c.actions) a.setEffectiveWeight(w);
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

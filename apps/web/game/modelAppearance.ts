// The look of the players drawn by a GLB model (appearance.ts): one copy of the model a player,
// stood where the simulation puts him and turned the way he faces. The model is read as the guide
// for Tancredi's files asks (docs/STUDIO-PERSONAGGI.md, section 11): standing, looking toward +Z,
// any height, which the game brings to CHARACTER_HEIGHT times the card's height, the feet put on
// the ground. Gait and actions do not move it yet: that is point 5 of the plan, the colours of the
// team point 3, the faces' expressions belong to the pieces in code.
import { Box3, Group, type Mesh, type Object3D } from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Appearance, PlayerFrame } from "./appearance";
import type { Design } from "./looks";
import { CHARACTER_HEIGHT } from "./style";

// The triangles of every mesh in an object.
export function trianglesOf(object: Object3D): number {
  let n = 0;
  object.traverse((o) => {
    const g = (o as Mesh).isMesh ? (o as Mesh).geometry : undefined;
    if (g) n += (g.index ? g.index.count : g.getAttribute("position").count) / 3;
  });
  return n;
}

export function modelAppearance(designs: Design[], model: Object3D): Appearance {
  const object = new Group();
  const box = new Box3().setFromObject(model, true);
  const tall = box.max.y - box.min.y || 1;
  const copies = designs.map(() => {
    // the copy stands on its feet inside a holder the frame moves
    const holder = new Group(), copy = clone(model);
    copy.position.y -= box.min.y;
    copy.traverse((o) => { if ((o as Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    holder.add(copy);
    object.add(holder);
    return holder;
  });
  const each = trianglesOf(model);
  return {
    object,
    count: copies.length,
    triangles: each * copies.length,
    set(i: number, f: PlayerFrame) {
      const h = copies[i];
      if (!h) return;
      h.position.set(f.x, 0, f.z);
      h.rotation.set(0, Math.atan2(f.fx, f.fz), 0);
      h.scale.setScalar((CHARACTER_HEIGHT * f.height) / tall);
    },
    commit() {},
    // the geometries and materials are the loaded model's, shared by the copies: whoever loaded
    // the model disposes of them
    dispose() { object.clear(); },
  };
}

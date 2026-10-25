// The look of the players built in code (appearance.ts): the pieces of parts.ts merged into the
// one SkinnedMesh of character.ts, posed by the run and the held states of rig.ts. It stays as
// the fallback for the cards without a GLB model (docs/STUDIO-PERSONAGGI.md, section 11).
import type { Appearance, PlayerFrame } from "./appearance";
import { buildCast } from "./character";
import { EXPRESSION } from "./faces";
import type { Design } from "./looks";
import { BONES_PER_PLAYER, locomotion, newJoints, skeleton } from "./rig";

export function pieceAppearance(designs: Design[]): Appearance {
  const cast = buildCast(designs);
  const joints = newJoints();
  return {
    object: cast.mesh,
    count: cast.designs.length,
    triangles: cast.triangles,
    set(i: number, f: PlayerFrame) {
      const body = cast.bodies[i];
      if (!body) return;
      locomotion(f, body, joints);
      // standing still, the chest breathes
      const breathe = f.speed < 0.3 ? 1 + 0.015 * Math.sin(f.time * 2.2) : 1;
      skeleton(f.x, f.z, f.fx, f.fz, f.height, body, joints, cast.bones, i * BONES_PER_PLAYER, breathe);
      cast.expressions[i] = EXPRESSION[f.expression];
    },
    commit(time: number) {
      cast.time.value = time;
      cast.commit();
    },
    dispose() { cast.dispose(); },
  };
}

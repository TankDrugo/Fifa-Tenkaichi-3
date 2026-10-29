// The GLB models the game can draw the players with (docs/STUDIO-PERSONAGGI.md, section 11, point
// 2): files in apps/web/public/models, chosen by id in the address, /partita?modello=fulmine and
// /personaggi?modello=fulmine. Without an id, or with one not listed here, the pieces in code draw.
// Each model has its table of clips (docs/PERSONAGGI.md): which of the file's clips plays each
// state of the game, by the name the file gives it; the code reads no bone names.

// The states of the game a clip plays (modelAppearance.ts).
export type ClipState = "idle" | "walk" | "run" | "shot" | "pass";

export interface ClipUse {
  // the clip's name in the GLB
  clip: string;
  // a stride (walk, run): the share of the clip where the left foot is furthest ahead, so that walk
  // and run start their stride on the same foot (scripts/clipsheet.ts --feet)
  offset?: number;
  // a kick (shot, pass): the seconds of the clip the game plays, from just before the foot meets
  // the ball to the end of the follow-through; the simulation's kick goes from 0 to 1 over them
  from?: number;
  to?: number;
}

export type ClipTable = Partial<Record<ClipState, ClipUse>>;

export interface ModelEntry {
  url: string;
  clips: ClipTable;
}

// the clips of the models made in code (art/CH_Fulmine/build/08_anim.py, art/CH_GoldenStriker/build/rig.py),
// also the table of a model given without one: one kick for both shot and pass
export const CODE_CLIPS: ClipTable = { idle: { clip: "idle" }, run: { clip: "run" }, shot: { clip: "kick" }, pass: { clip: "kick" } };

export const MODELS: Record<string, ModelEntry> = {
  // CH_Fulmine, built from Tancredi's reference by art/CH_Fulmine/build (26/10/2026)
  fulmine: { url: "/models/fulmine.glb", clips: CODE_CLIPS },
  // Golden Striker, Tancredi's Meshy model rigged by art/CH_GoldenStriker/build/rig.py (26/10/2026)
  golden: { url: "/models/golden.glb", clips: CODE_CLIPS },
  // CH_Portiere1, Tancredi's Meshy model rigged again by Meshy's API, all clips from Meshy
  // (docs/PERSONAGGI.md, 29/10/2026): idle 243 «Idle 3», shot 410 «Kick a Soccer Ball», walk and run
  // from the rigging task, pass from Text to Motion
  portiere1: {
    url: "/models/portiere1.glb",
    clips: {
      idle: { clip: "Idle_3" },
      walk: { clip: "Armature|walking_man|baselayer", offset: 0.281 },
      run: { clip: "Armature|running|baselayer", offset: 0.25 },
      shot: { clip: "Kick_a_Soccer_Ball", from: 0.55, to: 1.15 },
      pass: { clip: "Side_Foot_Pass", from: 1.05, to: 1.6 },
    },
  },
};

export const modelEntry = (id: string): ModelEntry | undefined => (Object.hasOwn(MODELS, id) ? MODELS[id] : undefined);
export const modelUrl = (id: string): string | undefined => modelEntry(id)?.url;

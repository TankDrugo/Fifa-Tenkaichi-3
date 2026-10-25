// The player look layer (docs/STUDIO-PERSONAGGI.md, section 11, point 1): the one interface the
// rest of the game draws footballers through. In, a frame a player: where the simulation puts him,
// where he faces, his gait and what he is doing. Out, one Object3D to add to the scene. Two makers
// sit behind it: the pieces built in code (pieceAppearance.ts, on character.ts and rig.ts) and a
// GLB model (modelAppearance.ts); players.ts and showroom.ts never see which one draws.
import type { Object3D } from "three";
import type { Design } from "./looks";
import type { Expression } from "./faces";
import { modelAppearance } from "./modelAppearance";
import { pieceAppearance } from "./pieceAppearance";

// What the simulation says a player is doing, as the drawing needs it.
export interface PlayerMotion {
  x: number; z: number; fx: number; fz: number;
  height: number;           // the card's height, 0,92-1,07 of CHARACTER_HEIGHT (style.ts)
  speed: number;
  gait: "walk" | "run" | "sprint";
  phase: number;            // 0..1 along the stride (packages/sim, Player.phase)
  turnRate: number;         // rad/s of the facing, + to the left
  lookYaw: number;          // rad, where the ball is from the facing, + to the left
  time: number;             // s, for breathing when still
  // states of packages/sim, -1 or 0 when off
  kick: number;             // 0..1 through a kick, -1 off
  slide: number;            // 0..1 through a slide and getting up, -1 off
  react: number;            // seconds left of a hit taken
  lunge: boolean;           // throwing a shoulder
  hold: boolean;            // a keeper with the ball in his hands
  celebrate: number;        // seconds into a celebration, -1 off
  charge: number;           // 0..1 of a shot being charged, -1 off
}

export interface PlayerFrame extends PlayerMotion {
  expression: Expression;
}

export const newFrame = (): PlayerFrame => ({
  x: 0, z: 0, fx: 0, fz: 1, height: 1, speed: 0, gait: "walk", phase: 0, turnRate: 0, lookYaw: 0, time: 0,
  kick: -1, slide: -1, react: 0, lunge: false, hold: false, celebrate: -1, charge: -1, expression: "neutral",
});

export interface Appearance {
  // add it to the scene once; set() and commit() move what is inside
  readonly object: Object3D;
  readonly count: number;
  // of all the players together, as built (shadows not counted)
  readonly triangles: number;
  // player i takes this frame's pose; nothing reaches the screen before commit()
  set(i: number, frame: PlayerFrame): void;
  commit(time: number): void;
  dispose(): void;
}

// The players of designs, drawn by the pieces in code, or by model when there is one.
export function createAppearance(designs: Design[], model?: Object3D): Appearance {
  return model ? modelAppearance(designs, model) : pieceAppearance(designs);
}

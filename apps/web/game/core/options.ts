// The match the page shows, from its address: /partita?home=fulmini&away=marea&seed=7, and for
// the camera's photos pitch (degrees down), fov (vertical, degrees), span (metres across the
// middle of the screen), aim (metres across the pitch the camera aims at, + toward it), skip (steps
// played before the first frame), focus (a player 0-9 to look at), paused=1, post=0; style=A or B,
// the characters' style (game/render/looks.ts); modello=<id>, every player drawn by that GLB (game/animation/models.ts).
// /prova takes the same address and plays the practice (game/core/practice.ts): the camera follows the
// person's footballer from closer, 9 m across the screen unless span says otherwise.
import { clubById } from "@ft3/sim";
import type { Style } from "../render/looks";
import { modelUrl } from "../animation/models";
import { PRACTICE_PLAYER } from "./practice";
import { CAMERA, STYLE } from "../render/style";

export interface StageOptions {
  home: string;
  away: string;
  seed: number;
  pitchDeg: number;
  fovDeg: number;
  spanM: number;
  aimZ: number;
  // a player (0-9) the camera looks at instead of the ball, -1 none: the close photos
  focus: number;
  // steps the match plays before the first frame, and whether it then stands still (photos)
  skip: number;
  paused: boolean;
  post: boolean;
  style: Style;
  // a model of game/animation/models.ts, "" for the pieces in code
  model: string;
  // the practice of /prova: one person with one footballer and the ball
  practice: boolean;
}

export const DEFAULT_STAGE: StageOptions = { home: "fulmini", away: "marea", seed: 7, pitchDeg: CAMERA.pitchDeg, fovDeg: CAMERA.fovDeg, spanM: CAMERA.spanM, aimZ: CAMERA.aimZ, focus: -1, skip: 0, paused: false, post: true, style: STYLE, model: "", practice: false };

type Params = Record<string, string | string[] | undefined>;

const PRACTICE_SPAN = 9;

export function stageOptions(sp: Params, practice = false): StageOptions {
  const one = (k: string) => { const v = sp[k]; return Array.isArray(v) ? v[0] : v; };
  const num = (k: string, d: number, lo: number, hi: number) => { const v = Number(one(k)); return Number.isFinite(v) && one(k) !== undefined ? Math.max(lo, Math.min(hi, v)) : d; };
  const club = (k: string, d: string) => { const v = one(k); return v && clubById(v) ? v : d; };
  return {
    home: club("home", DEFAULT_STAGE.home),
    away: club("away", DEFAULT_STAGE.away),
    seed: Math.round(num("seed", DEFAULT_STAGE.seed, 1, 1e9)),
    pitchDeg: num("pitch", DEFAULT_STAGE.pitchDeg, 10, 89),
    fovDeg: num("fov", DEFAULT_STAGE.fovDeg, 5, 90),
    spanM: num("span", practice ? PRACTICE_SPAN : DEFAULT_STAGE.spanM, 6, 60),
    aimZ: num("aim", DEFAULT_STAGE.aimZ, -8, 8),
    focus: practice ? PRACTICE_PLAYER : Math.round(num("focus", -1, -1, 9)),
    skip: Math.round(num("skip", 0, 0, 60 * 60 * 10)),
    paused: one("paused") === "1",
    post: one("post") !== "0",
    style: one("style") === "A" ? "A" : one("style") === "B" ? "B" : DEFAULT_STAGE.style,
    model: modelUrl(one("modello") ?? "") ? one("modello")! : "",
    practice,
  };
}

// The match the page shows, from its address: /partita?home=fulmini&away=marea&seed=7, and for
// the camera's photos pitch (degrees down), fov (vertical, degrees), span (metres across the
// middle of the screen), aim (metres across the pitch the camera aims at, + toward it), skip (steps
// played before the first frame), focus (a player 0-9 to look at), paused=1, post=0; style=A or B,
// the characters' style (game/looks.ts); modello=<id>, every player drawn by that GLB (game/models.ts).
import { clubById } from "@ft3/sim";
import type { Style } from "./looks";
import { modelUrl } from "./models";
import { CAMERA, STYLE } from "./style";

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
  // a model of game/models.ts, "" for the pieces in code
  model: string;
}

export const DEFAULT_STAGE: StageOptions = { home: "fulmini", away: "marea", seed: 7, pitchDeg: CAMERA.pitchDeg, fovDeg: CAMERA.fovDeg, spanM: CAMERA.spanM, aimZ: CAMERA.aimZ, focus: -1, skip: 0, paused: false, post: true, style: STYLE, model: "" };

type Params = Record<string, string | string[] | undefined>;

export function stageOptions(sp: Params): StageOptions {
  const one = (k: string) => { const v = sp[k]; return Array.isArray(v) ? v[0] : v; };
  const num = (k: string, d: number, lo: number, hi: number) => { const v = Number(one(k)); return Number.isFinite(v) && one(k) !== undefined ? Math.max(lo, Math.min(hi, v)) : d; };
  const club = (k: string, d: string) => { const v = one(k); return v && clubById(v) ? v : d; };
  return {
    home: club("home", DEFAULT_STAGE.home),
    away: club("away", DEFAULT_STAGE.away),
    seed: Math.round(num("seed", DEFAULT_STAGE.seed, 1, 1e9)),
    pitchDeg: num("pitch", DEFAULT_STAGE.pitchDeg, 10, 89),
    fovDeg: num("fov", DEFAULT_STAGE.fovDeg, 5, 90),
    spanM: num("span", DEFAULT_STAGE.spanM, 6, 60),
    aimZ: num("aim", DEFAULT_STAGE.aimZ, -8, 8),
    focus: Math.round(num("focus", -1, -1, 9)),
    skip: Math.round(num("skip", 0, 0, 60 * 60 * 10)),
    paused: one("paused") === "1",
    post: one("post") !== "0",
    style: one("style") === "A" ? "A" : one("style") === "B" ? "B" : DEFAULT_STAGE.style,
    model: modelUrl(one("modello") ?? "") ? one("modello")! : "",
  };
}

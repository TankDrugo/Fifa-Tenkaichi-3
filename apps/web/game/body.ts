// The proportions of a footballer. Every card has a figure (packages/sim, Card.body): the old
// game's ten bodies (Toro, Folletto, Torre, Muro, Lampo, Roccia, Testone, Spillo, Barile, Ragazzo)
// and eleven characters (Shibu ... Shino), plus the classic one. Here each figure is a set of
// multipliers on a classic toy body (a head nearly 40% of the height, as Mario Strikers: Battle
// League's characters, docs/DETTAGLI.md, "Gioco nuovo · fase 2"); the result is brought back to
// the classic total height, and the card's height (0,92-1,07) scales the whole body on the pitch.

// Lengths and thicknesses of a body of height about 1 (rig.ts multiplies by CHARACTER_HEIGHT and
// the card's height).
export interface Body {
  headR: number;     // radius of the head
  neck: number;      // from the chest's top to the head's base
  torso: number;     // from the pelvis to the shoulders' line
  pelvisUp: number;  // from the hips' line to the torso's base
  shoulderW: number; // half the distance between the shoulders
  hipW: number;      // half the distance between the hips
  upperArm: number;
  forearm: number;
  thigh: number;
  shin: number;
  ankle: number;     // height of the ankle above the sole
  chestW: number;    // half widths and depths of the shapes
  chestD: number;
  waistW: number;
  belly: number;     // 0 none, 1 a round belly
  armR: number;
  foreR: number;
  handR: number;
  thighR: number;
  shinR: number;
  footL: number;
  footW: number;
  neckR: number;
}

export const CLASSIC: Body = {
  headR: 0.2, neck: 0.015, torso: 0.24, pelvisUp: 0.03, shoulderW: 0.15, hipW: 0.072,
  upperArm: 0.12, forearm: 0.11, thigh: 0.12, shin: 0.13, ankle: 0.035,
  chestW: 0.16, chestD: 0.12, waistW: 0.15, belly: 0, armR: 0.05, foreR: 0.044, handR: 0.068,
  thighR: 0.058, shinR: 0.056, footL: 0.11, footW: 0.068, neckR: 0.06,
};

const total = (b: Body) => b.ankle + b.shin + b.thigh + b.pelvisUp + b.torso + b.neck + b.headR * 1.92;
export const CLASSIC_HEIGHT = total(CLASSIC);

// Multipliers: head size, torso length, shoulder width, chest width and depth, thickness of arms
// and legs, length of arms and legs, belly, neck, hands, feet.
export interface Build {
  head?: number; torso?: number; shoulders?: number; chest?: number; depth?: number;
  arms?: number; legs?: number; armLen?: number; legLen?: number; belly?: number;
  neck?: number; hands?: number; feet?: number; hips?: number;
}

// The figures of packages/sim (data.ts, FIGURES): what each name says, in shapes.
export const FIGURE_BUILD: Record<string, Build> = {
  "": {},
  toro: { shoulders: 1.25, chest: 1.25, depth: 1.15, arms: 1.3, legs: 1.15, neck: 1.8, head: 0.88 },
  folletto: { head: 1.12, legLen: 0.85, chest: 0.88, arms: 0.85, legs: 0.85, torso: 0.92 },
  torre: { legLen: 1.2, torso: 1.12, head: 0.86, chest: 0.92, arms: 0.9, armLen: 1.15, legs: 0.95 },
  muro: { chest: 1.38, depth: 1.25, shoulders: 1.32, arms: 1.32, legs: 1.3, head: 0.9, hands: 1.15, feet: 1.1, hips: 1.2 },
  lampo: { chest: 0.9, depth: 0.88, arms: 0.88, legs: 0.9, legLen: 1.12, head: 0.94, feet: 1.05 },
  roccia: { legLen: 0.8, chest: 1.22, arms: 1.42, legs: 1.2, hands: 1.3, head: 0.9, neck: 1.5, shoulders: 1.15 },
  testone: { head: 1.28, chest: 0.95, legLen: 0.95 },
  spillo: { chest: 0.78, depth: 0.8, arms: 0.72, legs: 0.72, legLen: 1.15, torso: 1.1, armLen: 1.1, head: 0.94, shoulders: 0.9 },
  barile: { belly: 1, chest: 1.25, depth: 1.35, legLen: 0.86, legs: 1.15, arms: 1.1, hips: 1.25 },
  ragazzo: { head: 1.15, chest: 0.88, legLen: 0.9, arms: 0.85, legs: 0.88, shoulders: 0.9 },
  // the eleven characters: their silhouettes come mostly from the hair (looks.ts)
  shibu: { chest: 0.95, legLen: 1.05, arms: 0.95 },
  ombra: { chest: 0.86, depth: 0.88, arms: 0.85, legs: 0.85, legLen: 1.1, torso: 1.05 },
  bibi: { head: 1.12, chest: 0.84, shoulders: 0.86, arms: 0.8, legs: 0.86, legLen: 0.92 },
  vita: { chest: 0.86, shoulders: 0.86, arms: 0.8, legs: 0.88, legLen: 1.08, hips: 1.1 },
  vicky: { chest: 0.92, shoulders: 0.92, arms: 0.9, legs: 0.95, legLen: 1.04 },
  matricola: { head: 1.05, chest: 0.94 },
  recluta: { chest: 1.08, shoulders: 1.08, arms: 1.1, legs: 1.08 },
  coda: { chest: 0.88, shoulders: 0.9, arms: 0.85, legs: 0.9, legLen: 1.08 },
  ciuffo: { chest: 1.0, legLen: 1.02 },
  fumiriya: { head: 1.1, chest: 0.84, shoulders: 0.86, arms: 0.8, legs: 0.85, legLen: 0.95 },
  shino: { chest: 0.86, shoulders: 0.88, arms: 0.82, legs: 0.88, legLen: 1.12, torso: 1.04 },
};

export function makeBody(build: Build): Body {
  const m = (k: keyof Build) => build[k] ?? 1;
  const c = CLASSIC;
  const b: Body = {
    headR: c.headR * m("head"),
    neck: c.neck * m("neck"),
    torso: c.torso * m("torso"),
    pelvisUp: c.pelvisUp,
    shoulderW: c.shoulderW * m("shoulders") * (0.5 + 0.5 * m("chest")),
    hipW: c.hipW * m("hips") * (0.6 + 0.4 * m("legs")),
    upperArm: c.upperArm * m("armLen"),
    forearm: c.forearm * m("armLen"),
    thigh: c.thigh * m("legLen"),
    shin: c.shin * m("legLen"),
    ankle: c.ankle,
    chestW: c.chestW * m("chest"),
    chestD: c.chestD * m("depth"),
    waistW: c.waistW * m("hips") * (0.7 + 0.3 * m("chest")),
    belly: build.belly ?? 0,
    armR: c.armR * m("arms"),
    foreR: c.foreR * m("arms"),
    handR: c.handR * m("hands") * (0.7 + 0.3 * m("arms")),
    thighR: c.thighR * m("legs"),
    shinR: c.shinR * m("legs"),
    footL: c.footL * m("feet"),
    footW: c.footW * m("feet") * (0.8 + 0.2 * m("legs")),
    neckR: c.neckR * (0.6 + 0.4 * m("neck")) * (0.7 + 0.3 * m("chest")),
  };
  // back to the classic total height: the card's height is the only size on the pitch
  const s = CLASSIC_HEIGHT / total(b);
  for (const k of Object.keys(b) as (keyof Body)[]) if (k !== "belly") b[k] *= s;
  return b;
}

export const hipHeight = (b: Body): number => b.ankle + b.shin + b.thigh;

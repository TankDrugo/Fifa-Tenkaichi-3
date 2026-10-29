// The match's numbers, carried over from web/js/match.js unchanged: pitch 28 x 16 m, the hit, the
// keeper's save reserve, the special move. Why each one is what it is: docs/DETTAGLI.md.
import type { Role, Vec2 } from "./types.ts";

export const DT = 1 / 60;

export const C = {
  length: 28, width: 16, goalWidth: 4.5, goalHeight: 2.2, goalDepth: 1.0,
  // Paced for a 28 m pitch: real peak speeds (8,3 m/s at a World Cup) cross it in 3 s, too
  // fast to build a move; 4,6 m/s takes 6 s, the sprint 4,5 s (docs/DETTAGLI.md, "Ritmo").
  run: 4.6, sprintMult: 1.35, accelTime: 0.22, stopRateMult: 0.3,
  bodyRadius: 0.3, ballRadius: 0.11, gravity: 14, restitution: 0.65, drag: 0.55,
  pickup: 0.55, passSpeed: 12, lobSpeed: 10.5, passCone: 30, shotMax: 28, shotMin: 14, shotCharge: 0.9,
  // Semi and manual passes take their power from the hold (docs/DETTAGLI.md, "Passaggi"); the mate
  // a pass is meant for runs to meet it for at most receiveMax seconds.
  passCharge: 0.5, receiveMax: 2.5,
  hitSpeed: 7.2, hitTime: 0.28, hitRecovery: 0.5, hitReact: 0.6, knock: 0.9, knockTime: 0.2,
  slowTime: 1.0, slowFactor: 0.6, hitAiDistance: 1.3, hitAiCooldown: 11, teamHitGap: 20, shield: 0.8,
  slideDist: 2.15, slideTime: 0.35, slideDown: 0.35, feintDist: 1.0, feintTime: 0.2,
  keeperReach: 1.0, keeperHold: 1.0, reserveMax: 100, saveCost: 34, recharge: 0.7, savePlane: 1.5,
  goalPause: 2.5, kickoffHold: 1.0,
  // The team's tension (docs/DETTAGLI.md, "Tensione"): three notches of 100/3. Points for actions
  // that beat the other team: from the 3rd pass in a row without an opponent's touch, an
  // interception, a hit that takes the ball, a won slide, a save; and for a goal conceded.
  // A full bar stays full fullHold seconds, then drops to two notches. One notch buys a charged
  // shot (the keeper pays double reserve for it, within chargedFor seconds); three, the comet.
  tension: { notch: 100 / 3, chainFrom: 3, chain: 2, intercept: 4, hitWon: 3, tackle: 4, save: 2, conceded: 6, fullHold: 20, chargedFor: 5 },
  chargeTime: 0.5, sweep: 0.75, powerTarget: 0.8, aimTarget: 0.2, window: 0.05, slow: 0.4,
} as const;

export interface Formation {
  name: string;
  spots: Vec2[];
  places: Role[];
}
export type FormationId = "rombo" | "quadrato" | "piramide" | "difensivo" | "offensivo";

// Formation spots in the frame of the team that attacks toward +x, keeper first
// (Impostazioni > Formazione). z is mirrored for the team attacking -x.
export const FORMATIONS: Record<FormationId, Formation> = {
  rombo: { name: "Rombo 1-2-1", spots: [[-13.3, 0], [-8.5, 0.5], [-4, -3.2], [-1.5, 4.2], [-1, -0.8]], places: ["POR", "DIF", "CEN", "ALA", "ATT"] },
  quadrato: { name: "Quadrato 2-2", spots: [[-13.3, 0], [-8.5, -3], [-8.5, 3], [-2.5, -3.2], [-2.5, 3.2]], places: ["POR", "DIF", "DIF", "ATT", "ATT"] },
  piramide: { name: "Piramide 2-1-1", spots: [[-13.3, 0], [-9, -3], [-9, 3], [-5, 0.5], [-1.5, -0.5]], places: ["POR", "DIF", "DIF", "CEN", "ATT"] },
  difensivo: { name: "Muro 3-1", spots: [[-13.3, 0], [-9, -4.5], [-9.5, 0], [-9, 4.5], [-2, 0]], places: ["POR", "DIF", "DIF", "DIF", "ATT"] },
  offensivo: { name: "Tridente 1-1-2", spots: [[-13.3, 0], [-8.5, 0], [-5, 0.5], [-1.5, -3.2], [-1.5, 3.2]], places: ["POR", "DIF", "CEN", "ATT", "ATT"] },
};
export const formationOf = (id: string): Formation => FORMATIONS[id as FormationId] || FORMATIONS.rombo;

// The clocks of the body's clips, from the sprite sheets the old game draws
// (web/assets/sprites/sheets.json, speed_mps x cycle_s and duration_s). They decide only what the
// body shows; phase 3 replaces them with the lengths of the animations written in code.
export const GAIT_STRIDE = { walk: 2.1 * 0.575, run: 7 * 0.31667, sprint: 9.45 * 0.29167 };
export const CLIP_DURATION: Record<string, number> = {
  hit_react: 0.6, shoulder_react_weak: 0.83333, shoulder_react_medium: 0.83333,
  shoulder_react_strong: 0.83333, shoulder_react_violent: 0.83333,
  pass: 0.33333, shot: 0.6, keeper_roll: 0.73333,
};

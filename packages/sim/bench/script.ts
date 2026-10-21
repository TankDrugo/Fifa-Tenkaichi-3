// Commands a person could give, drawn from a seeded generator: the left stick turns every
// 10-40 steps, buttons are pressed and held for 1-30 steps, the right stick sweeps a gesture now
// and then, a skill key is tapped. The same seed gives the same commands, so a match driven by
// them can be played twice (by the old game and by packages/sim, in Node and in Chromium): the
// stick's direction comes from src/fmath.ts, since Math.sin and Math.cos differ between engines.
import { cos, rng, sin, type Command } from "../src/index.ts";

const BUTTONS = ["sprint", "pass", "shoot", "feint", "switch", "mod", "special"] as const;
// chance a step that a button not held starts a press, and the longest press in steps
const PRESS: Record<(typeof BUTTONS)[number], [number, number]> = {
  sprint: [0.02, 90], pass: [0.03, 30], shoot: [0.02, 50], feint: [0.01, 4], switch: [0.01, 3], mod: [0.01, 40], special: [0.01, 3],
};
const SWEEPS: [number, number][][] = [[[1, 0]], [[-1, 0]], [[0, 1]], [[0, -1]], [[1, 0], [0, 1]], [[-1, 0], [0, -1]], [[1, 0], [0, 1], [-1, 0], [0, -1]], [[0, 1], [-1, 0], [0, -1]]];

export function commandScript(seed: number): () => Command {
  const r = rng(seed);
  let stick: [number, number] = [0, 0], stickLeft = 0;
  const held: Record<string, number> = {};
  const gesture: [number, number][] = [];
  return () => {
    if (stickLeft-- <= 0) {
      stickLeft = 10 + Math.floor(r() * 30);
      const a = r() * Math.PI * 2, m = r() < 0.15 ? 0 : 0.4 + r() * 0.6;
      stick = [cos(a) * m, sin(a) * m];
    }
    const c: Command = { x: stick[0], z: stick[1], rx: 0, rz: 0, skill: 0, sprint: false, pass: false, shoot: false, feint: false, switch: false, mod: false, special: false };
    for (const b of BUTTONS) {
      const [p, longest] = PRESS[b];
      if ((held[b] || 0) > 0) { held[b]!--; c[b] = true; }
      else if (r() < p) { held[b] = Math.floor(r() * longest); c[b] = true; }
    }
    if (!gesture.length && r() < 0.01) {
      for (const d of SWEEPS[Math.floor(r() * SWEEPS.length)]!) for (let k = 0; k < 3; k++) gesture.push(d);
      for (let k = 0; k < 3; k++) gesture.push([0, 0]);
    }
    if (gesture.length) { const [x, z] = gesture.shift()!; c.rx = x; c.rz = z; }
    if (r() < 0.003) c.skill = 1 + Math.floor(r() * 9);
    return c;
  };
}

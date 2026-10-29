// A small seeded generator (the old browser game's SL.rng): the same seed gives the same numbers in
// Node and in the browser, so a match with the same seed and the same commands plays the same.
export type Rng = () => number;

export function rng(seed: number): Rng {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

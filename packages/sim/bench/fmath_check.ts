// src/fmath.ts against the engine's Math, bit for bit, on random arguments: the ranges the
// simulation uses (angles to 10 rad, exp of -60..60, any atan2, distances to 40 m) and wider ones.
// In Node 22 every function must match (it is fdlibm there); a browser or a later V8 may differ
// on sin and cos, which is why the simulation uses fmath.
//
// Run: node packages/sim/bench/fmath_check.ts [samples=1000000]   (exit 1 if Node 22 differs)
import { atan2, cos, exp, hypot, rng, sin } from "../src/index.ts";

const N = +(process.argv[2] || 1e6), r = rng(20261021);
const u = (a: number, b: number) => a + (b - a) * r();
const cases: [string, (x: number, y: number) => number, (x: number, y: number) => number, () => [number, number]][] = [
  ["sin, angoli fino a 10 rad", (x) => sin(x), (x) => Math.sin(x), () => [u(-10, 10), 0]],
  ["sin, fino a 1e5 rad", (x) => sin(x), (x) => Math.sin(x), () => [u(-1e5, 1e5), 0]],
  ["cos, angoli fino a 10 rad", (x) => cos(x), (x) => Math.cos(x), () => [u(-10, 10), 0]],
  ["cos, fino a 1e5 rad", (x) => cos(x), (x) => Math.cos(x), () => [u(-1e5, 1e5), 0]],
  ["exp da -60 a 60", (x) => exp(x), (x) => Math.exp(x), () => [u(-60, 60), 0]],
  ["exp da -745 a 709", (x) => exp(x), (x) => Math.exp(x), () => [u(-745, 709), 0]],
  ["exp vicino a 0", (x) => exp(x), (x) => Math.exp(x), () => [u(-1e-6, 1e-6), 0]],
  ["atan2, metri del campo", (y, x) => atan2(y, x), (y, x) => Math.atan2(y, x), () => [u(-30, 30), u(-30, 30)]],
  ["atan2, scale diverse", (y, x) => atan2(y, x), (y, x) => Math.atan2(y, x), () => [u(-1, 1) * 10 ** u(-20, 20), u(-1, 1) * 10 ** u(-20, 20)]],
  ["hypot, metri del campo", (x, z) => hypot(x, z), (x, z) => Math.hypot(x, z), () => [u(-40, 40), u(-40, 40)]],
  ["hypot, scale diverse", (x, z) => hypot(x, z), (x, z) => Math.hypot(x, z), () => [u(-1, 1) * 10 ** u(-200, 200), u(-1, 1) * 10 ** u(-200, 200)]],
];
const special = [0, -0, 1, -1, Math.PI / 4, Math.PI / 2, Math.PI, 2 * Math.PI, 6.283, Infinity, -Infinity, NaN, 1e-300, 5e-324];
let bad = 0;
for (const [name, mine, engine, arg] of cases) {
  let differ = 0, example = "";
  const one = (a: number, b: number) => { const p = mine(a, b), q = engine(a, b); if (!Object.is(p, q)) { differ++; if (!example) example = ` (per esempio ${a}, ${b}: ${p} contro ${q})`; } };
  for (let i = 0; i < N; i++) { const [a, b] = arg(); one(a, b); }
  for (const a of special) for (const b of special) one(a, b);
  if (differ) bad++;
  console.log(`${differ ? "NO  " : "ok  "} ${name}: ${differ} diversi su ${N + special.length ** 2}${example}`);
}
console.log(`Node ${process.version}: ${cases.length - bad} funzioni su ${cases.length} uguali a Math bit per bit`);
process.exit(bad && process.versions.node.startsWith("22.") ? 1 : 0);

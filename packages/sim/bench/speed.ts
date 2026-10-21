// How many matches one core simulates at 60 Hz (docs/PIANO-3D-ONLINE.md, phase 1): the matches of
// bench/scenarios.ts in three groups (AI against AI; one against one, two people and eight AI
// players, as an online 1 v 1; two against two), every Match.step timed on its own. Prints the
// steps a second, the mean, 99th percentile and longest step, the steps that think (the AI thinks
// every 8 steps: match.ts, step), and the matches a core holds: 1 s / (60 x the mean step).
//
// Run: node packages/sim/bench/speed.ts [rounds=1]
import os from "node:os";
import { performance } from "node:perf_hooks";
import * as sim from "../src/index.ts";
import { play, SCENARIOS, type Scenario } from "./scenarios.ts";

const rounds = +(process.argv[2] || 1);
const groups: [string, Scenario[]][] = [
  ["IA contro IA (12 partite)", SCENARIOS.filter((s) => !s.humans.length && !s.settings.goldenGoal)],
  ["una contro una: 2 persone, 8 giocatori dell'IA", SCENARIOS.filter((s) => s.humans.length === 2)],
  ["due contro due: 4 persone, 6 giocatori dell'IA", SCENARIOS.filter((s) => s.humans.length === 4)],
];
const f = (v: number, d = 1) => v.toFixed(d).replace(".", ",");
console.log(`Node ${process.version}, ${os.cpus()[0]?.model ?? "?"}, ${os.cpus().length} core; ogni passo misurato a parte`);
// a first pass warms the compiler up, so the timings are of the code as it runs for hours
for (const s of SCENARIOS.slice(0, 2)) play(sim, s, (m, read) => { m.input = read; });
for (const [name, list] of groups) {
  const times: number[] = [], thinks: number[] = [];
  for (let r = 0; r < rounds; r++) for (const sc of list) {
    // Match.step directly, a step at a time, with the people's commands of the scenario
    play(sim, { ...sc, frame: undefined }, (m, read) => {
      m.input = read;
      const step = m.step.bind(m);
      m.step = () => { const thinking = m.aiTick <= 0; const t0 = performance.now(); step(); const dt = performance.now() - t0; times.push(dt); if (thinking) thinks.push(dt); };
    });
  }
  const sorted = times.slice().sort((a, b) => a - b), total = times.reduce((a, b) => a + b, 0), mean = total / times.length;
  const p99 = sorted[Math.floor(sorted.length * 0.99)]!, max = sorted[sorted.length - 1]!, thinkMean = thinks.reduce((a, b) => a + b, 0) / thinks.length;
  console.log(`${name}: ${times.length} passi in ${f(total / 1000, 2)} s · ${f(times.length / (total / 1000), 0)} passi al secondo · passo medio ${f(mean * 1000)} µs, 99° percentile ${f(p99 * 1000)} µs, più lungo ${f(max * 1000)} µs · passi che pensano ${f(thinkMean * 1000)} µs di media · partite a 60 Hz per core ${f(1000 / (60 * mean), 0)}`);
}

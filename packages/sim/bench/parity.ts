// The old game and packages/sim play the same matches (bench/scenarios.ts) side by side; after
// every frame the two fingerprints (src/fingerprint.ts) must be equal. Prints, for each match,
// the frames compared, the score and the first frame where the two part, if any.
//
// Run: node packages/sim/bench/parity.ts [--engine-math]   (exit 1 if a match parts)
// --engine-math: the old game with the engine's Math, as in the browser (bench/old_game.ts).
import * as sim from "../src/index.ts";
import { fingerprint } from "../src/index.ts";
import { loadOldGame } from "./old_game.ts";
import { play, SCENARIOS } from "./scenarios.ts";

const engineMath = process.argv.includes("--engine-math");
const old = loadOldGame(undefined, engineMath ? "engine" : "fmath");
let parted = 0, frames = 0;
for (const sc of SCENARIOS) {
  const prints: string[] = [];
  const a = play(old, sc, (_m, read) => { old.input.read = (device) => read((device as { k: number }).k); }, (m) => { prints.push(fingerprint(m)); });
  let first = -1, n = 0;
  const b = play(sim, sc, (m, read) => { m.input = read; }, (m, f) => { n++; if (first < 0 && fingerprint(m) !== prints[f]) first = f; });
  if (n !== prints.length && first < 0) first = Math.min(n, prints.length);
  frames += n;
  if (first >= 0) parted++;
  console.log(`${first < 0 ? "ok  " : "NO  "} ${sc.name}: ${n} fotogrammi, ${a.score.join("-")} / ${b.score.join("-")}${first >= 0 ? `, si separano al fotogramma ${first}` : ""}`);
}
console.log(`Node ${process.version}, gioco vecchio con ${engineMath ? "il Math del motore" : "le funzioni di src/fmath.ts"}: ${SCENARIOS.length - parted} partite su ${SCENARIOS.length} uguali in ogni fotogramma, ${frames} fotogrammi`);
process.exit(parted ? 1 : 0);

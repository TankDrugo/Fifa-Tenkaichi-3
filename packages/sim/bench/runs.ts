// The matches of bench/scenarios.ts played on packages/sim, each summed up as the score, the
// frames, the last fingerprint and a chain of every frame's fingerprint: two engines that agree
// on the chain agree on every frame. Runs in Node and, bundled by bench/browser.ts, in Chromium.
import * as sim from "../src/index.ts";
import { play, SCENARIOS } from "./scenarios.ts";

export interface RunResult {
  name: string;
  frames: number;
  score: string;
  last: string;
  chain: string;
}

// which: the first n matches, or the matches at these places in SCENARIOS
export function runScenarios(which: number | number[] = SCENARIOS.length): RunResult[] {
  const list = typeof which === "number" ? SCENARIOS.slice(0, which) : which.map((i) => SCENARIOS[i]!);
  return list.map((sc) => {
    let chain = "", last = "", frames = 0;
    const m = play(sim, sc, (match, read) => { match.input = read; }, (match) => {
      last = sim.fingerprint(match); frames++;
      // FNV-1a of the previous chain and this frame's fingerprint
      let h = 0x811c9dc5;
      for (const ch of chain + last) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193);
      chain = (h >>> 0).toString(16).padStart(8, "0");
    });
    return { name: sc.name, frames, score: m.score.join("-"), last, chain };
  });
}

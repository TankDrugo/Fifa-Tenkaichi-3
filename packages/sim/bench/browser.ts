// Same seed and same commands give the same match in Node and in Chromium (docs/PIANO-3D-ONLINE.md,
// phase 1): bench/runs.ts is bundled with esbuild for the browser, played in headless Chromium
// through Playwright and in this Node process, and the two lists of fingerprints compared.
//
// Run: node packages/sim/bench/browser.ts [matches=all]     (exit 1 if one differs)
// Chromium comes from Playwright: `pnpm --filter @ft3/sim exec playwright install chromium` where
// it is missing; the cloud chats have it in /opt/pw-browsers.
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";
import { runScenarios, type RunResult } from "./runs.ts";

const count = process.argv[2] ? +process.argv[2] : undefined;
const bundle = await build({
  entryPoints: [path.join(import.meta.dirname, "runs.ts")], bundle: true, write: false, format: "iife", globalName: "Runs",
  platform: "browser", target: "es2023",
});
const code = bundle.outputFiles[0]!.text;

const t0 = Date.now();
const inNode = runScenarios(count);
const nodeS = (Date.now() - t0) / 1000;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.addScriptTag({ content: code });
const agent = await page.evaluate(() => navigator.userAgent);
const t1 = Date.now();
const inChromium = await page.evaluate((n) => (globalThis as unknown as { Runs: { runScenarios: (n?: number) => RunResult[] } }).Runs.runScenarios(n), count);
const chromeS = (Date.now() - t1) / 1000;
await browser.close();

let differ = 0, frames = 0;
inNode.forEach((a, i) => {
  const b = inChromium[i]!, same = a.chain === b.chain && a.last === b.last && a.frames === b.frames;
  if (!same) differ++;
  frames += a.frames;
  console.log(`${same ? "ok  " : "NO  "} ${a.name}: ${a.frames} fotogrammi, ${a.score}, impronta ${a.last} catena ${a.chain}${same ? "" : ` · Chromium: ${b.frames} fotogrammi, ${b.score}, ${b.last} ${b.chain}`}`);
});
const f = (v: number) => v.toFixed(1).replace(".", ",");
console.log(`Node ${process.version} (${f(nodeS)} s) e ${agent.match(/HeadlessChrome\/[\d.]+|Chrome\/[\d.]+/)?.[0] ?? agent} (${f(chromeS)} s): ${inNode.length - differ} partite su ${inNode.length} uguali, ${frames} fotogrammi; pacchetto per il navigatore ${f(code.length / 1024)} kB`);
process.exit(differ ? 1 : 0);

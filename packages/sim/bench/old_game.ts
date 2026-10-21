// The old game's simulation (web/js/data.js, input.js, match.js, ai.js, skills.js) loaded into a
// Node context the way tools/web_checks.js and tools/ai_bench.js load it: drawing and sound
// stubbed out, the sprite sheets' timings read from web/assets/sprites/sheets.json. The benches
// run it next to packages/sim to compare the two step by step.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { atan2, cos, exp, hypot, sin, type Card, type Club, type Command, type Formation, type Match, type MatchOptions, type RoleDef, type Rng, type Settings, type SkillDef } from "../src/index.ts";

export interface OldGame {
  Match: new (opts: MatchOptions) => Match;
  clubById: (id: string) => Club;
  clubSquad: (club: Club) => (Card | undefined)[];
  defaultSettings: () => Settings;
  rng: (seed: number) => Rng;
  FORMATIONS: Record<string, Formation>;
  SKILLS: Record<string, SkillDef>;
  AI: { ROLES: Record<string, RoleDef>; rolesFor: (pos: string) => string[] };
  input: { read: (device: unknown) => Command; clearTaps: () => void };
}

export const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..");

// math "fmath": the old game's Math.sin, cos, exp, atan2 and hypot are packages/sim's (src/fmath.ts),
// so the comparison holds on any Node; in Node 22 they are the same bits as the engine's
// (bench/fmath_check.ts). "engine": the engine's own, as the old game runs in the browser.
export function loadOldGame(root = repoRoot, math: "fmath" | "engine" = "fmath"): OldGame {
  const web = path.join(root, "web");
  const sheets = JSON.parse(fs.readFileSync(path.join(web, "assets", "sprites", "sheets.json"), "utf8")) as Record<string, unknown>;
  const noop = () => {};
  const ctx: Record<string, unknown> = {
    console, Math: math === "engine" ? Math : Object.assign(Object.create(Math) as Math, { sin, cos, exp, atan2, hypot }), Date, JSON, Object, Array, Set, Map, Number, String, Promise, setTimeout, clearTimeout,
    performance: { now: () => 0 }, navigator: { getGamepads: () => [] }, document: { featurePolicy: null },
    localStorage: { getItem: () => null, setItem: noop }, addEventListener: noop,
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  const run = (f: string) => vm.runInContext(fs.readFileSync(path.join(web, "js", f), "utf8"), ctx, { filename: f });
  for (const f of ["data.js", "input.js"]) run(f);
  const SL = ctx.SL as Record<string, unknown>;
  SL.audio = new Proxy({}, { get: () => noop });
  SL.Render = { meta: (n: string) => sheets[n] || null, has: (n: string) => !!sheets[n], resolve: (_b: string, n: string) => n };
  for (const f of ["match.js", "ai.js", "skills.js"]) run(f);
  return SL as unknown as OldGame;
}

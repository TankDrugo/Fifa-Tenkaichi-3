// The simulation plays the same match from the same seed and the same commands: twice in a row,
// and on another engine (the chains below are those of Node 22.22 and Chromium 141,
// bench/browser.ts; CI runs Node 24).
// A change that alters the play on purpose changes these chains: the phase that makes it writes
// the new ones and why in docs/DETTAGLI.md.
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { runScenarios } from "../bench/runs.ts";
import { SCENARIOS } from "../bench/scenarios.ts";
import * as sim from "./index.ts";

const RECORDED: Record<number, { frames: number; score: string; last: string; chain: string }> = {
  0: { frames: 14969, score: "0-2", last: "e2b7dc45c3229532", chain: "8044c70b" },
  15: { frames: 15796, score: "1-4", last: "410fd86cb39441fb", chain: "c7cd5a3e" },
  19: { frames: 9421, score: "1-0", last: "ed2b0042433848ed", chain: "a5578e9c" },
  21: { frames: 16933, score: "2-15", last: "cdf2a89c946fad4f", chain: "564c65a8" },
};

describe("stessa partita dagli stessi comandi", () => {
  for (const [i, want] of Object.entries(RECORDED)) {
    it(`${SCENARIOS[+i]!.name}: la catena di Node 22 e Chromium 141`, { timeout: 30_000 }, () => {
      const r = runScenarios([+i])[0]!;
      expect({ frames: r.frames, score: r.score, last: r.last, chain: r.chain }).toEqual(want);
    });
  }
  it("giocata due volte di seguito dà la stessa catena", { timeout: 30_000 }, () => {
    expect(runScenarios([16])).toEqual(runScenarios([16]));
  });
});

describe("fmath: gli stessi bit in ogni motore", () => {
  const view = new DataView(new ArrayBuffer(8));
  const bits = (x: number) => { view.setFloat64(0, x); return view.getBigUint64(0).toString(16).padStart(16, "0"); };
  const args = [0.5, 1, 2.5, -3, 6.283, 7.5];
  it("sin e cos", () => {
    expect(args.map((a) => bits(sim.sin(a)))).toEqual(["3fdeaee8744b05f0", "3feaed548f090cee", "3fe326af0dcfcab0", "bfc210386db6d55b", "bf2849e08aff9bed", "3fee041886fcae30"]);
    expect(args.map((a) => bits(sim.cos(a)))).toEqual(["3fec1528065b7d50", "3fe14a280fb5068c", "bfe9a2f7ef858b7d", "bfefae04be85e5d2", "3feffffff6c8424f", "3fd62f45e66f5c2f"]);
  });
  it("exp, atan2, hypot", () => {
    expect([-0.55 / 60, -1.2, 3.7, -20].map((a) => bits(sim.exp(a)))).toEqual(["3fefb53ff293f475", "3fd346c4167a12de", "4044394144eeec81", "3e21b48655f37267"]);
    expect([[1, 2], [-3, 0.5], [0.2, -4], [-1, -1]].map(([y, x]) => bits(sim.atan2(y!, x!)))).toEqual(["3fddac670561bb4f", "bff67d8863bc99bd", "4008bbaabde5e29c", "c002d97c7f3321d2"]);
    expect([[3, 4], [0.1, 0.2], [-7.3, 2.9]].map(([x, z]) => bits(sim.hypot(x!, z!)))).toEqual(["4014000000000000", "3fcc9f25c5bfedda", "401f6b74042df39b"]);
  });
  it("NaN, infiniti e zeri come Math", () => {
    for (const f of ["sin", "cos", "exp"] as const) for (const x of [0, -0, Infinity, -Infinity, NaN]) expect(Object.is(sim[f](x), Math[f](x))).toBe(true);
    for (const [y, x] of [[0, -1], [-0, -1], [1, 0], [Infinity, Infinity], [NaN, 1]] as const) expect(Object.is(sim.atan2(y, x), Math.atan2(y, x))).toBe(true);
    for (const [a, b] of [[Infinity, NaN], [NaN, 1], [0, -0]] as const) expect(Object.is(sim.hypot(a, b), Math.hypot(a, b))).toBe(true);
  });
});

describe("dati", () => {
  it("le 150 carte non cambiano senza volerlo", () => {
    expect(sim.POOL.length).toBe(34 + 30 + 22 + 10 + 12 + 6 * 7);
    // the cards as the old browser game had them (removed on 29/10/2026); a change on purpose
    // writes the new hash here
    const cards = sim.POOL.map((c) => `${c.id}:${c.ovr}:${c.vel}:${c.tir}:${c.pas}:${c.fis}:${c.body}:${c.club}`).join("|");
    expect(createHash("sha256").update(cards).digest("hex").slice(0, 16)).toBe("fbf22484619fdc16");
  });
  it("un pacchetto aperto con lo stesso seme dà le stesse carte", () => {
    const open = (seed: number) => sim.openPack(sim.PACKS[2]!, [], sim.rng(seed)).map((p) => p.k);
    expect(open(5)).toEqual(open(5));
    expect(open(5)).toHaveLength(4);
  });
});

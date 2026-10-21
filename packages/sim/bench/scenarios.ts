// Matches that the old game and packages/sim both play, with the same seed and the same commands:
// AI against AI on the 12 pairs of tools/ai_bench.js, and people driven by bench/script.ts in
// every pass assistance, difficulty, two people, two against two, a locked player, the moon's
// gravity, still opponents, the golden goal, a challenge that starts from a score.
import type { Card, Club, Command, HumanSpec, Match, MatchOptions, Settings } from "../src/index.ts";
import { commandScript } from "./script.ts";

// what both games offer: packages/sim's exports and the old game's SL
export interface Game {
  Match: new (opts: MatchOptions) => Match;
  clubById: (id: string) => Club | undefined;
  clubSquad: (club: Club) => (Card | undefined)[];
  defaultSettings: () => Settings;
}

export interface Scenario {
  name: string;
  home: string;
  away: string;
  seed: number;
  humans: HumanSpec[];
  settings: Partial<Settings>;
  // update: Match.update with this many real seconds a frame (the special move's slow motion
  // and its meter run only there); step: Match.step, as the benches do
  frame?: number;
  gravity?: number;
  score?: [number, number];
  mana?: [number, number];
}

export const PAIRS: [string, string][] = [["fulmini", "marea"], ["vulcano", "lupi"], ["corvi", "aurora"], ["ghiaccio", "tempesta"], ["marea", "vulcano"], ["lupi", "corvi"],
  ["aurora", "ghiaccio"], ["tempesta", "fulmini"], ["fulmini", "vulcano"], ["marea", "corvi"], ["lupi", "ghiaccio"], ["aurora", "tempesta"]];

const one: HumanSpec[] = [{ team: 0 }];
export const SCENARIOS: Scenario[] = [
  ...PAIRS.map(([home, away], i): Scenario => ({ name: `IA contro IA, ${home}-${away}`, home, away, seed: 1000 + i, humans: [], settings: {} })),
  { name: "una persona, passaggi Semi, difficoltà normale", home: "fulmini", away: "marea", seed: 7, humans: one, settings: { passAssist: "semi" }, frame: 1 / 60 },
  { name: "una persona, passaggi Assistiti, difficoltà difficile", home: "corvi", away: "vulcano", seed: 8, humans: one, settings: { passAssist: "assisted", difficulty: 2 }, frame: 1 / 60 },
  { name: "una persona, passaggi Manuali, difficoltà facile", home: "lupi", away: "tempesta", seed: 9, humans: one, settings: { passAssist: "manual", difficulty: 0 }, frame: 1 / 60 },
  { name: "due persone, una contro una", home: "aurora", away: "ghiaccio", seed: 10, humans: [{ team: 0 }, { team: 1 }], settings: {}, frame: 1 / 60 },
  { name: "quattro persone, due contro due", home: "marea", away: "fulmini", seed: 11, humans: [{ team: 0 }, { team: 0 }, { team: 1 }, { team: 1 }], settings: {}, frame: 1 / 60 },
  { name: "squadre leggendarie, gravità della Luna, schermo a 144 Hz", home: "cometa", away: "nottefonda", seed: 12, humans: one, settings: {}, frame: 1 / 144, gravity: 0.6 },
  { name: "avversari fermi (Allenamento)", home: "vulcano", away: "corvi", seed: 13, humans: one, settings: { opponentAi: 1 }, frame: 1 / 60 },
  { name: "gol d'oro, un minuto, IA contro IA", home: "ghiaccio", away: "aurora", seed: 14, humans: [], settings: { goldenGoal: true, minutes: 1 } },
  { name: "giocatore bloccato (Carriera), schermo a 30 Hz", home: "tempesta", away: "lupi", seed: 15, humans: [{ team: 0, lock: 3 }], settings: {}, frame: 1 / 30 },
  { name: "sfida che parte da 1-2 con la barra piena", home: "fulmini", away: "corvi", seed: 16, humans: one, settings: {}, frame: 1 / 60, score: [1, 2], mana: [100, 50] },
];

// Plays a scenario; after every frame calls each(m, frame). Returns the match.
export function play(game: Game, sc: Scenario, setInput: (m: Match, read: (k: number) => Command) => void, each?: (m: Match, frame: number) => void): Match {
  const side = (id: string) => {
    const c = game.clubById(id)!;
    return { club: c, squad: game.clubSquad(c), kit: c.kit, kit2: null, pattern: 0, formation: c.formation || "rombo" };
  };
  const settings = Object.assign(game.defaultSettings(), { minutes: 4, difficulty: 1, goldenGoal: false, aiHits: true, opponentAi: 0 }, sc.settings);
  const humans = sc.humans.map((h, k) => ({ ...h, device: { k } }));
  const m = new game.Match({ home: side(sc.home), away: side(sc.away), humans, settings, seed: sc.seed, gravity: sc.gravity, score: sc.score, mana: sc.mana });
  const scripts = humans.map((_, k) => commandScript(sc.seed * 100 + k));
  let now: Command[] = [];
  setInput(m, (k) => now[k]!);
  const most = Math.ceil((settings.minutes * 60 + 120) * 60 * 3);
  for (let f = 0; f < most && !m.over; f++) {
    now = scripts.map((s) => s());
    if (sc.frame) m.update(sc.frame);
    else { m.events.length = 0; m.step(); }
    if (each) each(m, f);
  }
  return m;
}

// A match of packages/sim played in real time for the scene: the simulation steps at 60 Hz
// (Match.update), the scene draws at the screen's rate between the last two steps. After each step
// the driver keeps a frame of what the animation needs (history.ts): where each player was, what
// he was doing and the actions the step began; a 144 Hz screen sees him move between steps
// instead of in jumps of 1/60 s, and a kick's contact falls on the step that decided it.
import { awayKit, clubById, clubSquad, defaultSettings, DT, Match, type Club, type Settings } from "@ft3/sim";
import { capture, type Frame } from "./history.ts";

// A side's shirt and second colour (shorts), as the scene dresses it (players.ts, teamKits).
export interface SideColours {
  kit: string;
  second: string;
}

// frames kept: 3 s at 60 a second, enough for the longest move to find its start
const KEEP = 180;

export class Driver {
  readonly match: Match;
  readonly colours: [SideColours, SideColours];
  readonly home: Club;
  readonly away: Club;
  // every frame since the start when keepAll (the contact sheets), else the last KEEP
  readonly frames: Frame[] = [];
  private keepAll: boolean;
  private steps = 0;

  constructor(homeId: string, awayId: string, seed: number, settings?: Partial<Settings>, keepAll = false) {
    this.home = clubById(homeId)!;
    this.away = clubById(awayId)!;
    this.keepAll = keepAll;
    const away = awayKit(this.home, this.away);
    const side = (c: Club, kit: string) => ({ club: c, squad: clubSquad(c), kit, kit2: null, pattern: 0, formation: c.formation || "rombo" });
    const s = Object.assign(defaultSettings(), { minutes: 4, difficulty: 1, goldenGoal: false, aiHits: true, opponentAi: 0 }, settings);
    this.match = new Match({ home: side(this.home, this.home.kit), away: side(this.away, away.kit), humans: [], settings: s, seed });
    // the shorts: the kit's second colour where it has one, else the other kit's colour
    this.colours = [
      { kit: this.home.kit, second: this.home.kit2 || this.home.alt },
      { kit: away.kit, second: this.away.kit2 || (away.kit === this.away.alt ? this.away.kit : this.away.alt) },
    ];
    const m = this.match, step = m.step.bind(m);
    m.step = () => {
      const from = m.events.length;
      step();
      this.steps++;
      this.push(capture(m, this.steps, this.last, from));
    };
    this.push(capture(m, 0, null, 0));
  }

  private get last(): Frame | null { return this.frames[this.frames.length - 1] ?? null; }
  private push(f: Frame): void {
    this.frames.push(f);
    if (!this.keepAll && this.frames.length > KEEP) this.frames.splice(0, this.frames.length - KEEP);
  }

  // Real seconds since the last frame, at most 0,1 s.
  advance(realDt: number): void { this.match.update(Math.min(realDt, 0.1)); }

  // Plays n steps at once, before the first frame: the photos of the camera start from the same
  // moment of the match.
  skip(n: number): void {
    for (let i = 0; i < n; i++) { this.match.events.length = 0; this.match.step(); }
  }

  // The frame of a step, if still kept.
  frame(step: number): Frame | undefined {
    const first = this.frames[0]!.step, f = this.frames[step - first];
    return f && f.step === step ? f : undefined;
  }

  // Between the last two steps: 0 at the one before, 1 at the last.
  get alpha(): number { return this.frames.length < 2 ? 1 : Math.max(0, Math.min(1, this.match.acc / DT)); }
  get before(): Frame { return this.frames[this.frames.length - 2] ?? this.frames[this.frames.length - 1]!; }
  get after(): Frame { return this.frames[this.frames.length - 1]!; }
  get stepCount(): number { return this.steps; }
}

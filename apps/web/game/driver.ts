// A match of packages/sim played in real time for the scene: the simulation steps at 60 Hz
// (Match.update), the scene draws at the screen's rate between the last two steps. For each player
// the driver keeps where he was before the last step, so a 144 Hz screen sees him move between
// steps instead of in jumps of 1/60 s.
import { awayKit, clubById, clubSquad, defaultSettings, DT, Match, type Club, type MatchOptions, type Settings } from "@ft3/sim";

export interface Snapshot {
  x: Float64Array;
  z: Float64Array;
  fx: Float64Array;
  fz: Float64Array;
  ballX: number;
  ballY: number;
  ballZ: number;
}

// A side's shirt and second colour (shorts), as the scene dresses it (players.ts, teamKits).
export interface SideColours {
  kit: string;
  second: string;
}

const snapshot = (n: number): Snapshot => ({ x: new Float64Array(n), z: new Float64Array(n), fx: new Float64Array(n), fz: new Float64Array(n), ballX: 0, ballY: 0, ballZ: 0 });

export class Driver {
  readonly match: Match;
  readonly colours: [SideColours, SideColours];
  readonly home: Club;
  readonly away: Club;
  private prev = snapshot(10);
  private cur = snapshot(10);
  private steps = 0;

  // humans: the people who play (practice.ts), none for a match of the AI
  constructor(homeId: string, awayId: string, seed: number, settings?: Partial<Settings>, humans: MatchOptions["humans"] = []) {
    this.home = clubById(homeId)!;
    this.away = clubById(awayId)!;
    const away = awayKit(this.home, this.away);
    const side = (c: Club, kit: string) => ({ club: c, squad: clubSquad(c), kit, kit2: null, pattern: 0, formation: c.formation || "rombo" });
    const s = Object.assign(defaultSettings(), { minutes: 4, difficulty: 1, goldenGoal: false, aiHits: true, opponentAi: 0 }, settings);
    this.match = new Match({ home: side(this.home, this.home.kit), away: side(this.away, away.kit), humans, settings: s, seed });
    // the shorts: the kit's second colour where it has one, else the other kit's colour
    this.colours = [
      { kit: this.home.kit, second: this.home.kit2 || this.home.alt },
      { kit: away.kit, second: this.away.kit2 || (away.kit === this.away.alt ? this.away.kit : this.away.alt) },
    ];
    const step = this.match.step.bind(this.match);
    this.match.step = () => { this.steps++; step(); };
    this.copy(this.cur);
    this.copy(this.prev);
  }

  private copy(to: Snapshot): void {
    const m = this.match;
    m.players.forEach((p, i) => { to.x[i] = p.x; to.z[i] = p.z; to.fx[i] = p.fx; to.fz[i] = p.fz; });
    to.ballX = m.ball.x; to.ballY = m.ball.y; to.ballZ = m.ball.z;
  }

  // Real seconds since the last frame, in pieces of at most one step, so each piece steps the
  // match at most once and the position before that step is kept.
  advance(realDt: number): void {
    let left = Math.min(realDt, 0.1);
    while (left > 1e-9) {
      const piece = Math.min(left, DT);
      left -= piece;
      const before = this.steps;
      [this.prev, this.cur] = [this.cur, this.prev];
      this.copy(this.prev);
      this.match.update(piece);
      if (this.steps === before) [this.prev, this.cur] = [this.cur, this.prev];
      this.copy(this.cur);
    }
  }

  // Plays n steps at once, before the first frame: the photos of the camera start from the same
  // moment of the match.
  skip(n: number): void {
    for (let i = 0; i < n; i++) { this.match.events.length = 0; this.match.step(); }
    this.copy(this.prev);
    this.copy(this.cur);
  }

  // Between the last two steps: 0 at the one before, 1 at the last.
  get alpha(): number { return Math.max(0, Math.min(1, this.match.acc / DT)); }
  get before(): Snapshot { return this.prev; }
  get after(): Snapshot { return this.cur; }
  get stepCount(): number { return this.steps; }
}

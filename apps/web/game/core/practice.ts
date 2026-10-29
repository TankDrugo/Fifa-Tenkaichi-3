// The practice match of /prova: one person, one footballer and the ball on an empty pitch, to see
// a model run and kick (Tancredi, 26/10/2026). packages/sim always plays five a side, so the
// other nine are parked in a far corner every step, out of the way and unable to pick the ball up,
// and the scene draws only the person's footballer (players.ts, `only`). The settings are the old
// game's free training (its modes.js): opponents still, keeper included, no clock; every kickoff
// is the person's, so after a goal the ball is at his feet again.
import { C, type Match } from "@ft3/sim";
import { Driver } from "./driver";
import type { Input } from "./input";

// the player the person plays: the striker who takes the kickoff (Match.resetKickoff)
export const PRACTICE_PLAYER = 4;
// the corner the others wait in: far side, the person's own half
const PARK_X = -C.length / 2 + 0.5, PARK_Z = -C.width / 2 + 0.5;

export function park(m: Match): void {
  m.players.forEach((p, i) => {
    if (i === PRACTICE_PLAYER) return;
    p.x = PARK_X; p.z = PARK_Z; p.vx = p.vz = 0;
    p.stick = [0, 0]; p.still = true;
    p.pickupLock = 1e9;
  });
}

export function practiceDriver(home: string, away: string, seed: number, input: Pick<Input, "read" | "clearTaps">): Driver {
  const d = new Driver(home, away, seed, { opponentAi: 2, minutes: 999, goldenGoal: false, autoSwitch: false }, [{ team: 0, lock: PRACTICE_PLAYER }]);
  const m = d.match;
  m.input = () => input.read();
  m.clearTaps = () => input.clearTaps();
  const reset = m.resetKickoff.bind(m), step = m.step.bind(m);
  m.resetKickoff = () => { reset(0); park(m); };
  m.step = () => { step(); park(m); };
  park(m);
  d.skip(0);
  return d;
}

// The practice of /prova (practice.ts): the person's footballer runs where the stick says and
// shoots, the other nine stay parked and never touch the ball, and after a goal the ball is at his
// feet again.
import { describe, expect, it } from "vitest";
import { C, NONE, type Command } from "@ft3/sim";
import { PRACTICE_PLAYER, practiceDriver } from "./practice";

function pad() {
  let now: Command = { ...NONE };
  return { set(c: Partial<Command>) { now = { ...NONE, ...c }; }, read: () => now, clearTaps() {} };
}

const seconds = (d: ReturnType<typeof practiceDriver>, s: number) => { for (let t = 0; t < s; t += 1 / 60) d.advance(1 / 60); };

describe("practice", () => {
  it("runs with the stick, carrying the ball, while the others stay parked", () => {
    const input = pad(), d = practiceDriver("fulmini", "marea", 7, input), m = d.match, me = m.players[PRACTICE_PLAYER]!;
    expect(m.ball.carrier).toBe(me);
    input.set({ x: 1 });
    seconds(d, 1.5);
    expect(me.x).toBeGreaterThan(2);
    expect(Math.hypot(me.vx, me.vz)).toBeGreaterThan(3);
    expect(m.ball.carrier).toBe(me);
    for (const p of m.players) if (p !== me) expect([p.x, p.z]).toEqual([-C.length / 2 + 0.5, -C.width / 2 + 0.5]);
  });

  it("kicks when the shot is pressed, and a goal gives the ball back at the kickoff", () => {
    const input = pad(), d = practiceDriver("fulmini", "marea", 7, input), m = d.match, me = m.players[PRACTICE_PLAYER]!;
    input.set({ x: 1 });
    seconds(d, 2.2);
    // the shot is charged while held and goes on release
    input.set({ x: 1, shoot: true });
    seconds(d, 0.2);
    input.set({});
    let kicked = false;
    for (let k = 0; k < 30; k++) { d.advance(1 / 60); kicked ||= me.kickT >= 0; }
    expect(kicked).toBe(true);
    seconds(d, 8);
    expect(m.score[0]).toBeGreaterThan(0);
    expect(m.phase).not.toBe("goal");
    expect(m.ball.carrier).toBe(me);
  });
});

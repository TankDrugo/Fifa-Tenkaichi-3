// A fingerprint of everything that decides what happens next in a match: the clock, the score,
// the bars, the ball and every player's place, speed, timers and memory. Two matches with the
// same fingerprint at a step play on the same from there. It reads the field names that the old
// game (web/js/match.js) and this package share, so the two can be compared step by step.
// FNV-1a over the bytes of each number, in two lanes with different seeds: 16 hex digits.

interface Body {
  x: number; z: number; vx: number; vz: number; fx: number; fz: number;
  react: number; recovery: number; hitT: number; slideT: number; slideDownT: number; feintT: number;
  charge: number; passCharge: number; pickupLock: number; shield?: number; hitCool: number; skillCool: number;
  fooled: number; slow: number; knockT: number; holdT: number; human: number; aiHold?: number;
  skill: { id: string; t: number } | null;
}
export interface FingerprintSource {
  clock: number; phase: string; phaseT: number; aiTick?: number; hitstop: number;
  score: number[]; mana: number[]; reserve: number[]; chain: number[]; fullAt: number[]; chargedUntil: number[];
  players: Body[];
  ball: {
    x: number; y: number; z: number; vx: number; vy: number; vz: number;
    carrier: Body | null; last: Body | null; passTo: Body | null; passFrom?: Body | null; shotBy?: Body | null;
    unstoppable: boolean; inGoal?: boolean; charged?: boolean;
  };
}

const view = new DataView(new ArrayBuffer(8));
export function fingerprint(m: FingerprintSource): string {
  let a = 0x811c9dc5, b = 0x01000193 ^ 0x5bd1e995;
  // a value the old game had not set yet (undefined) and NaN count as 0, as does -0
  const num = (v: number | undefined | null) => {
    view.setFloat64(0, v || 0);
    for (let i = 0; i < 8; i++) { const c = view.getUint8(i); a = Math.imul(a ^ c, 0x01000193); b = Math.imul(b ^ c, 0x01000193); }
  };
  const text = (s: string) => { for (let i = 0; i < s.length; i++) num(s.charCodeAt(i)); num(-1); };
  const who = (p: Body | null | undefined) => num(p ? m.players.indexOf(p) + 1 : 0);
  num(m.clock); text(m.phase); num(m.phaseT); num(m.aiTick); num(m.hitstop);
  for (const list of [m.score, m.mana, m.reserve, m.chain, m.fullAt, m.chargedUntil]) for (const v of list) num(v);
  const ball = m.ball;
  for (const v of [ball.x, ball.y, ball.z, ball.vx, ball.vy, ball.vz]) num(v);
  who(ball.carrier); who(ball.last); who(ball.passTo); who(ball.passFrom); who(ball.shotBy);
  num(ball.unstoppable ? 1 : 0); num(ball.inGoal ? 1 : 0); num(ball.charged ? 1 : 0);
  for (const p of m.players) {
    for (const v of [p.x, p.z, p.vx, p.vz, p.fx, p.fz, p.react, p.recovery, p.hitT, p.slideT, p.slideDownT, p.feintT,
      p.charge, p.passCharge, p.pickupLock, p.shield, p.hitCool, p.skillCool, p.fooled, p.slow, p.knockT, p.holdT, p.human, p.aiHold]) num(v);
    if (p.skill) { text(p.skill.id); num(p.skill.t); } else num(-2);
  }
  const hex = (h: number) => (h >>> 0).toString(16).padStart(8, "0");
  return hex(a) + hex(b);
}

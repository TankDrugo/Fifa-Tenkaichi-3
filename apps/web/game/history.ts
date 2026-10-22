// What the animation reads of the match, one frame a simulation step: where each player is and
// what he is doing, where the ball is, and the actions the step began (a kick, a take, a hit...).
// The scene draws between the last two frames; the moves (moves.ts) read the actions with the step
// of their contact, so the frame of the contact falls on the instant the simulation decides it
// (docs/PIANO-3D-ONLINE.md, section 4.7).
import { DT, type Match, type Player } from "@ft3/sim";

export interface PlayerFrame {
  x: number; z: number; fx: number; fz: number; vx: number; vz: number;
  kickT: number; kickClip: string;
  charge: number;        // seconds of a shot being charged, -1 off
  passCharge: number;
  slideT: number; slideDownT: number; slideX: number; slideZ: number;
  hitT: number; recovery: number; hitX: number; hitZ: number;
  react: number; knockT: number; knockX: number; knockZ: number; reactSheet: string;
  feintT: number; feintX: number; feintZ: number;
  skill: string; skillT: number; skillSide: number; skillKicked: boolean;
  fooled: number; foolX: number; foolZ: number;
  celebrate: number; specialPose: number;
  hasBall: boolean; keeper: boolean; still: boolean; holdT: number; team: number;
}

export interface BallFrame { x: number; y: number; z: number; vx: number; vy: number; vz: number; carrier: number; charged: boolean; unstoppable: boolean; shot: boolean; }

export type ActionType = "pass" | "lob" | "shot" | "chip" | "charged" | "comet" | "roll" | "touch" | "take" | "save" | "claim" | "hit" | "tackle" | "skill" | "goal" | "special";

// One action of a player. at is the step of the contact in the frames' count: a kick's ball is
// already in flight in the frame of its step, so its contact is the frame before; a take, a save,
// a hit or a tackle happen in the frame of their step.
export interface Action {
  type: ActionType;
  player: number;
  at: number;
  x: number; y: number; z: number;     // where the ball is at the contact
  dx: number; dz: number;              // its direction after (kicks), or the hit's direction
  speed: number;
  other: number;                       // the player hit or tackled, -1 none
  id: string;                          // the skill's id, the hit's strength
  side: number;
}

export interface Frame {
  step: number;
  phase: string;
  players: PlayerFrame[];
  ball: BallFrame;
  special: { shooter: number; state: string; t: number } | null;
  reserve: [number, number];     // the keepers' save reserve (match.ts, keeperSaves)
  actions: Action[];
}

function playerFrame(p: Player, m: Match): PlayerFrame {
  const s = p.skill;
  return {
    x: p.x, z: p.z, fx: p.fx, fz: p.fz, vx: p.vx, vz: p.vz,
    kickT: p.kickT, kickClip: p.kickClip ?? "", charge: p.charge, passCharge: p.passCharge,
    slideT: p.slideT, slideDownT: p.slideDownT, slideX: p.slideDir[0], slideZ: p.slideDir[1],
    hitT: p.hitT, recovery: p.recovery, hitX: p.hitDir[0], hitZ: p.hitDir[1],
    react: p.react, knockT: p.knockT, knockX: p.knock[0], knockZ: p.knock[1], reactSheet: p.reactSheet ?? "",
    feintT: p.feintT, feintX: p.feintDir[0], feintZ: p.feintDir[1],
    skill: s ? s.id : "", skillT: s ? s.t : 0, skillSide: s ? s.side : 0, skillKicked: !!(s && s.kicked),
    fooled: p.fooled, foolX: p.foolDir[0], foolZ: p.foolDir[1],
    celebrate: p.celebrate, specialPose: p.specialPose,
    hasBall: m.ball.carrier === p, keeper: p.isKeeper, still: p.still, holdT: p.holdT, team: p.team,
  };
}

const action = (type: ActionType, player: number, at: number, o: Partial<Action> = {}): Action =>
  ({ type, player, at, x: 0, y: 0, z: 0, dx: 0, dz: 0, speed: 0, other: -1, id: "", side: 0, ...o });

// The frame after a step, with the actions found by comparing it with the frame before and from
// the events the step pushed (events: m.events from index `from`).
export function capture(m: Match, step: number, prev: Frame | null, from: number): Frame {
  const b = m.ball, idx = (p: Player | null | undefined) => (p ? m.players.indexOf(p) : -1);
  const players = m.players.map((p) => playerFrame(p, m));
  const ball: BallFrame = { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, carrier: idx(b.carrier), charged: b.charged, unstoppable: b.unstoppable, shot: !!b.shotBy };
  const sp = m.special;
  const actions: Action[] = [];
  const events = m.events.slice(from) as { type: string; by?: Player; on?: Player; id?: string; took?: boolean; team?: number }[];
  const had = prev ? prev.ball.carrier : -1;
  // a kick: the carrier of the frame before let the ball go, and it flies
  if (had >= 0 && ball.carrier !== had) {
    const p = m.players[had]!, v = Math.hypot(b.vx, b.vz);
    // where the ball was at the contact: one step of flight back from this frame
    const at = { x: b.x - b.vx * DT, y: Math.max(0.11, b.y - b.vy * DT), z: b.z - b.vz * DT, dx: v > 0.01 ? b.vx / v : p.fx, dz: v > 0.01 ? b.vz / v : p.fz, speed: v };
    const comet = events.some((e) => e.type === "specialResult");
    const pf = prev!.players[had]!;
    let type: ActionType | null = null;
    if (b.shotBy === p) type = comet ? "comet" : b.chip ? "chip" : b.charged ? "charged" : "shot";
    else if (b.passFrom === p) type = p.isKeeper && p.kickClip === "keeper_roll" ? "roll" : b.vy > 1 ? "lob" : "pass";
    else if (pf.skill === "tunnel" || pf.skill === "sombrero" || (p.skill && (p.skill.id === "tunnel" || p.skill.id === "sombrero"))) type = "touch";
    if (type && ball.carrier < 0) actions.push(action(type, had, step - 1, { ...at, id: pf.skill || (p.skill ? p.skill.id : "") }));
  }
  // a take: the ball comes to a player's feet, or a keeper's hands
  if (ball.carrier >= 0 && ball.carrier !== had) {
    const save = events.some((e) => e.type === "save"), claim = events.some((e) => e.type === "claim");
    const pb = prev ? prev.ball : ball;
    actions.push(action(save ? "save" : claim ? "claim" : "take", ball.carrier, step, { x: pb.x + pb.vx * DT, y: pb.y, z: pb.z + pb.vz * DT, speed: Math.hypot(pb.vx, pb.vz) }));
  }
  for (const e of events) {
    if (e.type === "hit" && e.by) { const p = e.by; actions.push(action("hit", idx(p), step, { x: p.x, z: p.z, dx: p.hitDir[0], dz: p.hitDir[1], other: idx(e.on), id: e.took ? "took" : "" })); }
    else if (e.type === "tackle" && e.by) actions.push(action("tackle", idx(e.by), step, { x: b.x, y: b.y, z: b.z, other: idx(e.on) }));
    else if (e.type === "skill" && e.by) actions.push(action("skill", idx(e.by), step, { id: e.id ?? "", side: e.by.skill ? e.by.skill.side : 1 }));
    else if (e.type === "special" && sp) actions.push(action("special", idx(sp.shooter), step));
    else if (e.type === "goal") actions.push(action("goal", -1, step, { side: e.team ?? 0 }));
  }
  return { step, phase: m.phase, players, ball, special: sp ? { shooter: idx(sp.shooter), state: sp.state, t: sp.t } : null, reserve: [m.reserve[0]!, m.reserve[1]!], actions };
}

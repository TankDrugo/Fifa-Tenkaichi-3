// The shapes the simulation works on. Field names are the ones of the old browser game, whose
// checks were ported onto the same state (docs/DETTAGLI.md, "Gioco nuovo · fase 1").

export type Vec2 = [number, number];
export type Team = 0 | 1;
export type Role = "POR" | "DIF" | "CEN" | "ALA" | "ATT";
export type Rarity = "bronzo" | "argento" | "oro" | "campione" | "leggenda" | "mito";
export type Version = "base" | "holo" | "num" | "unica";

export interface Card {
  id: string;
  name: string;
  role: Role;
  rarity: Rarity;
  ovr: number;
  vel: number;
  tir: number;
  pas: number;
  fis: number;
  look: number;
  body: string;
  club: string | null;
  age: number;
  bio?: string;
  lore?: string;
}

export interface Club {
  id: string;
  formation: string;
  name: string;
  short: string;
  city: string;
  kit: string;
  alt: string;
  rating: number;
  pitch: string;
  kit2?: string;
  pattern?: number;
  lore?: boolean;
  people?: string;
  look?: number;
  figures?: string[];
  story?: string;
  players?: [string, Role, number][];
}

// What a card changes in a match (data.ts, cardEffect).
export interface CardEffect {
  speed: number;
  shot: number;
  pass: number;
  knock: number;
  reserve: number;
}

export type PassAssist = "assisted" | "semi" | "manual";

export interface Settings {
  minutes: number;
  difficulty: number;
  opponentAi: number;
  aiHits: boolean;
  goldenGoal: boolean;
  hitLook: number;
  showHints: boolean;
  padLayout: string;
  rumble: boolean;
  master: number;
  sfx: number;
  crowd: number;
  voice: number;
  commentary: boolean;
  zoom: number;
  camFollow: number;
  camLead: number;
  shake: boolean;
  weather: boolean;
  names: number;
  formation: string;
  autoSwitch: boolean;
  passAssist: PassAssist;
}

// One person's pad for 1/60 s: the left stick (x, z), the right stick (rx, rz) for the skill
// moves, a skill picked by number (1-9, 0 none) and the seven buttons.
export interface Command {
  x: number;
  z: number;
  rx: number;
  rz: number;
  skill: number;
  sprint: boolean;
  pass: boolean;
  shoot: boolean;
  feint: boolean;
  switch: boolean;
  mod: boolean;
  special: boolean;
}

export interface Side {
  club: Club;
  squad: (Card | null | undefined)[];
  kit: string;
  kit2: string | null;
  pattern: number;
  formation: string;
  roles?: (string | null)[] | null;
}

export interface HumanSpec {
  team: Team;
  device?: unknown;
  lock?: number | null;
}

export interface MatchOptions {
  home: Side;
  away: Side;
  humans?: HumanSpec[];
  settings: Settings;
  seed?: number;
  // the ground's gravity: the moon's is lighter
  gravity?: number;
  // a challenge may start from a score and a tension
  score?: Vec2;
  mana?: Vec2;
  demo?: boolean;
}

export type Gait = "walk" | "run" | "sprint";
export type SkillId = "tunnel" | "dragback" | "feint" | "stepover" | "roll" | "heelchop" | "roulette" | "sombrero" | "elastico";

export interface SkillState {
  id: SkillId;
  t: number;
  side: number;
  f: Vec2;
  r: Vec2;
  a0: number;
  dir: Vec2;
  kicked?: boolean;
  released?: boolean;
}

// A role's offsets for one player, scaled by his familiarity (ai.ts, roleOf).
export interface RoleOffsets {
  id: string;
  push: number;
  width: number;
  central: number;
  threat: number;
  safe: number;
  near: number;
  back: number;
  press: number;
  jockey: number;
  shoot: number;
  pass: number;
  dribble: number;
  depth: number;
}

export interface Player {
  team: Team;
  slot: number;
  isKeeper: boolean;
  card: Card | null | undefined;
  look: number;
  eff: CardEffect;
  body: string;
  height: number;
  pattern: number;
  pos: Role;
  role: string;
  fam: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  fx: number;
  fz: number;
  gait: Gait;
  phase: number;
  sprinting: boolean;
  idleTime: number;
  human: number;
  ai: boolean;
  still: boolean;
  speedScale: number;
  stick: Vec2;
  wantSprint: boolean;
  hitT: number;
  hitDir: Vec2;
  rival: Player | null;
  lungeStep: boolean;
  recovery: number;
  react: number;
  knockT: number;
  knock: Vec2;
  slow: number;
  hitCool: number;
  shield: number;
  sh: number;
  shExit: boolean;
  shFrom: Vec2;
  shLen: number;
  shDir: Vec2;
  reactClip: number;
  reactDir: Vec2;
  reactSheet: string;
  slideT: number;
  slideDir: Vec2;
  slideDownT: number;
  slideCool: number;
  feintT: number;
  feintDir: Vec2;
  feintCool: number;
  kickClip: string | null;
  kickT: number;
  kickDir: Vec2;
  holdT: number;
  rollT: number;
  charge: number;
  passCharge: number;
  celebrate: number;
  pickupLock: number;
  specialPose: number;
  skill: SkillState | null;
  skillCool: number;
  fooled: number;
  foolDir: Vec2;
  // the AI's memory (ai.ts): time on the ball, the aim and strength of a shot being charged, the
  // support spot and when and for which carrier it was chosen. The aim and the strength are NaN
  // until the AI first chooses them, as the old game's undefined: a comparison with them is false.
  aiHold: number;
  aiAim: number;
  aiChargeTo: number;
  aiSpot: Vec2 | null;
  aiSpotT: number;
  aiSpotFor: Player | null | undefined;
  roleCache: RoleOffsets | null;
}

export interface Ball {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  carrier: Player | null;
  last: Player | null;
  lastTeam: number;
  lastOwnerTeam: number;
  unstoppable: boolean;
  worth: number;
  charged: boolean;
  chip: boolean;
  inGoal: boolean;
  passFrom: Player | null;
  passTo: Player | null;
  passAt: number;
  shotBy: Player | null;
}

// The right stick's gesture being read (skills.ts, humanSkills).
export interface Gesture {
  seq: string[];
  start: number;
  fired: boolean;
  pendingB: number;
}

export interface Human {
  team: Team;
  device: unknown;
  lock: number | null | undefined;
  player: Player | null;
  prev: Command;
  prevSp: boolean;
  rsg: Gesture | null;
}

export interface Special {
  team: Team;
  shooter: Player;
  state: "charge" | "meter" | "result";
  t: number;
  meter: number;
  presses: number[];
  hits: number;
}

export interface Particle {
  x: number;
  z: number;
  y: number;
  vx: number;
  vz: number;
  vy: number;
  t: number;
}

export interface Scorer {
  team: Team;
  name: string;
  minute: number;
  worth: number;
}

export interface MatchStats {
  shots: Vec2;
  saves: Vec2;
  hits: Vec2;
  passes: Vec2;
  tackles: Vec2;
  possession: Vec2;
  skills: Vec2;
}

export type Phase = "kickoff" | "live" | "goal" | "end";

// What happened in a step, for the interface, the commentary and the checks.
export type MatchEvent =
  | { type: "pass"; team: Team; from: Player; to: Player }
  | { type: "intercept"; team: Team; by: Player }
  | { type: "charged"; team: Team }
  | { type: "shot"; team: Team; by: Player; speed: number; charged: boolean }
  | { type: "hit"; team: Team; by: Player; on: Player; took: boolean }
  | { type: "specialStopped"; team: Team }
  | { type: "tackle"; team: Team; by: Player; on: Player }
  | { type: "post" }
  | { type: "save"; team: Team }
  | { type: "goal"; team: Team; worth: number; chip: boolean; scorer: Player | null; own: boolean }
  | { type: "end" }
  | { type: "special"; team: Team }
  | { type: "specialResult"; hits: number; team: Team }
  | { type: "claim"; team: Team }
  | { type: "tensionDrop"; team: Team }
  | { type: "golden" }
  | { type: "skill"; team: Team; by: Player; id: SkillId };

export type Sound = "kick" | "pass" | "whoosh" | "hit" | "post" | "save" | "goal" | "whistle" | "meter" | "special";

// What the old game sent to the speakers and the pads (audio.js, input.js rumble); here
// the simulation only says it, and whoever plays the match decides what to do with it.
export type Cue =
  | { kind: "sound"; sound: Sound; value?: number | boolean }
  | { kind: "rumble"; human: number; strong: number; weak: number; ms: number };

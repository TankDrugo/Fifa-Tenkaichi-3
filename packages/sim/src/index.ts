// The shared simulation of the new game (docs/PIANO-3D-ONLINE.md, phase 1): the same code runs in
// the browser, in Next.js, in apps/realtime and in the benches.
export * from "./types.ts";
export { C, CLIP_DURATION, DT, FORMATIONS, formationOf, GAIT_STRIDE, type Formation, type FormationId } from "./constants.ts";
export { rng, type Rng } from "./rng.ts";
export * from "./data.ts";
export { anchor, cardRoles, control, defaultRole, FAM_MARK, passSafety, roleOf, ROLES, rolesFor, SKILL, skillOf, think, threat, type AiSkill, type RoleDef } from "./ai.ts";
export { POSE, SKILL_IDS, SKILLS, skillStars, type SkillDef, type SkillPose } from "./skills.ts";
export { Match, NONE, type PassHow } from "./match.ts";
export { fingerprint, type FingerprintSource } from "./fingerprint.ts";
export { atan2, cos, exp, hypot, sin } from "./fmath.ts";

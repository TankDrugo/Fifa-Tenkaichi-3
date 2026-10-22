// Look and sizes of the new game's scene. The reference is Mario Strikers: Battle League
// (Tancredi, 22/10/2026); the numbers below are measured on two official screenshots of a match at
// 1280 x 720 (docs/DETTAGLI.md, "Gioco nuovo · fase 2"). Nothing here copies its characters,
// stadiums or patterns.

// Its pitch is about 35 character heights long and its goal about 2,4 character heights high; on
// the simulation's pitch (28 m, goal 2,2 m) that is a footballer of about 0,85 m.
export const CHARACTER_HEIGHT = 0.85;

// Its match camera looks down about 29 degrees (the centre circle is 0,47-0,49 times as high as it
// is wide) with a vertical field of view of about 18 degrees (the lines across the pitch meet 883 px
// above the top of the screen), and puts the near side line at 690 px and the far one at 160 px.
// On the simulation's pitch the same rows come with 19,8 m across the middle of the screen and the
// camera aiming 0,35 m beyond the halfway point of the width (game/loop.ts).
export const CAMERA = { pitchDeg: 29, fovDeg: 18, spanM: 19.8, aimZ: -0.35 };

// Skin and hair for the cards' look 0-13 (packages/sim, Card.look): 0-7 people, 8-13 the lore
// peoples (alien, vampire, pirate, dragon, robot, yeti).
export const LOOK_COLOURS: [skin: string, hair: string][] = [
  ["#ffd9c2", "#6b3a1f"], ["#f7c9a3", "#1c1714"], ["#e9b080", "#f0c24a"], ["#c98a5a", "#22180f"],
  ["#ffe1cf", "#d8542a"], ["#9a6141", "#140f0c"], ["#6a4029", "#100c0a"], ["#ddaa7c", "#8a5426"],
  ["#7ee36a", "#1d6b34"], ["#efe6f8", "#2a1033"], ["#d39c6b", "#3a2416"], ["#ff7b3a", "#8c1a0c"],
  ["#b7c4d4", "#3e4c60"], ["#f7fbff", "#cfe3f5"],
];

// Keepers wear a colour that is not either team's: the first of these the two shirts leave free.
export const KEEPER_COLOURS = ["#ffd23f", "#2ee6a6", "#ff8c42", "#b07cff", "#2f3b4c"];
export const GLOVES = "#f4f6fb";
export const BOOTS = "#20242c";
export const EYES = "#141820";

// The first ground, by day: saturated grass with mowing stripes, a lit fence, tiers of stands.
export const DAY = {
  sky: ["#5aa9ef", "#d8eefc"] as const,
  grass: ["#3a9c34", "#4cb442"] as const,
  emblem: "rgba(20,90,30,0.16)",
  apron: "#3d8a3a",
  line: "#fbfff4",
  fencePost: "#e9eef5",
  fenceGlow: "#7ff0ff",
  stand: "#c9875a",
  standTop: "#5cb84c",
  screenFrame: "#e23b2e",
  floodlight: "#fffaf0",
  sun: "#fff4e0",
  hemiSky: "#cfe6ff",
  hemiGround: "#5a7a3a",
  fans: ["#e8384f", "#2f6df0", "#f4c430", "#f2f2f2", "#40c070", "#ff7a2f", "#b06cff", "#ff8fc7"] as const,
};

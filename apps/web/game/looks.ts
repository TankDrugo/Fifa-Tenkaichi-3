// Who each footballer looks like. A card gives the figure (packages/sim, Card.body: the body and,
// for the eleven characters, the hair), the look (skin and hair colours) and its id, from which a
// fixed draw picks what the card does not say: hair for the bodies, eyes, brows, nose, beard.
// So the five players of a team never look alike, and a card looks the same in every match.
//
// The team adds its style (Tancredi, 22/10/2026: "personaggi con gli stili delle squadre"), in two
// variants to choose from on photos (scripts/photos3.ts):
//   A, "sportivo": the footballer in the team's kit; the lore peoples only by their colours;
//   B, "a tema": gear shaped on the team's name (bolts for Fulmini Rossi, wolf ears for Lupi
//      Verdi...) and the lore peoples as what they are (antennae, fangs, horns and tail, a robot's
//      visor, a yeti's fur).
// Mario Strikers: Battle League dresses its teams in gear of the team's colours; the shapes here
// are this game's own (docs/PIANO-3D-ONLINE.md, section 4.7: no character copied).
import { BODY_HEIGHT, type Card, type Club } from "@ft3/sim";
import { FIGURE_BUILD, type Build } from "./body";
import { LOOK_COLOURS } from "./style";

export type HairStyle = "none" | "crop" | "buzz" | "spiky" | "mohawk" | "afro" | "curly" | "slick" | "quiff" | "ponytail" | "buns" | "long" | "bob" | "twintails" | "fringe" | "topknot" | "dreads" | "sidepart" | "fur" | "crest";
export type Facial = "none" | "beard" | "mustache" | "goatee";
export type People = "human" | "alien" | "vampire" | "pirate" | "dragon" | "robot" | "yeti";
export type EyeStyle = "round" | "almond" | "narrow" | "big" | "sleepy" | "sharp" | "alien" | "reptile" | "visor" | "cyclops";
export type BrowStyle = "thick" | "thin" | "arched" | "flat" | "bushy" | "none";
export type Nose = "button" | "round" | "big" | "pointy" | "snout" | "none";
export type Ears = "round" | "pointy" | "none";
export type Style = "A" | "B";

export interface FaceDesign {
  eyes: EyeStyle;
  brows: BrowStyle;
  eyeColour: string;
  lashes: boolean;
  freckles: boolean;
  blush: boolean;
  scar: boolean;
  patch: 0 | 1 | 2;          // an eyepatch: 0 none, 1 right eye, 2 left eye
  fangs: boolean;
  stubble: boolean;
  wide: number;              // 0,85-1,15: how far apart the eyes are
}

export interface Kit {
  shirt: string;
  shorts: string;
  socks: string;
  second: string;            // the kit's second colour: pattern and trims
  pattern: number;           // packages/sim, Club.pattern: 1 stripes, 2 hoops, 3 sash, 4 glow, 5 halves, 6 zigzag
  boots: string;
  gloves: string;
}

export interface Design {
  key: string;
  name: string;
  number: number;
  keeper: boolean;
  figure: string;
  build: Build;
  height: number;
  people: People;
  style: Style;
  team: string;              // the club whose gear the player wears (style B)
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  facial: Facial;
  nose: Nose;
  ears: Ears;
  face: FaceDesign;
  kit: Kit;
  barefoot: boolean;
  variant: number;           // 0..1, a fixed draw for the small differences (antennae, horns, gear)
}

// A fixed draw from a text: the same card always gives the same face.
function draws(text: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(r: () => number, list: readonly T[]): T => list[Math.floor(r() * list.length) % list.length]!;

// The eleven characters keep the hair that makes them who they are.
const CHARACTER_HAIR: Record<string, HairStyle> = {
  shibu: "spiky", ombra: "fringe", bibi: "buns", vita: "long", vicky: "bob", matricola: "sidepart",
  recluta: "buzz", coda: "ponytail", ciuffo: "quiff", fumiriya: "twintails", shino: "long",
};
const SOFT_FACES = new Set(["bibi", "vita", "vicky", "fumiriya", "shino", "coda"]);
const SHORT_HAIR: HairStyle[] = ["crop", "spiky", "mohawk", "afro", "curly", "slick", "quiff", "buzz", "none", "dreads", "topknot", "sidepart"];
const EYE_COLOURS = ["#4a2c1a", "#2a1a12", "#2f6db5", "#3f8a4a", "#8a6a2a", "#5a6670"];
const PEOPLE: Record<string, People> = { cometa: "alien", nottefonda: "vampire", marestorto: "pirate", brace: "dragon", volt: "robot", passogelato: "yeti" };

// Shirt numbers by role, as a five-a-side team would wear them.
const NUMBERS: Record<string, number> = { POR: 1, DIF: 5, CEN: 8, ALA: 7, ATT: 9 };

export interface KitColours {
  shirt: string;
  shorts: string;
  socks: string;
}

export function designFor(card: Card | null | undefined, club: Club, kit: KitColours, style: Style, keeper: boolean, slot: number): Design {
  const key = card ? card.id : `${club.id}-${slot}`;
  const r = draws(key);
  const look = card ? card.look : (club.look ?? slot);
  const people: People = card?.lore ? PEOPLE[card.lore] ?? "human" : "human";
  const themed = style === "B" && people !== "human";
  // keepers keep the built figure on the cards (the old game had a keeper's sheets only for it);
  // here they get a keeper's frame from the draw
  const figure = card?.body || (keeper ? pick(r, ["", "torre", "muro", "toro"]) : "");
  const build: Build = { ...(FIGURE_BUILD[figure] ?? {}) };
  const [skin0, hair0] = LOOK_COLOURS[look % LOOK_COLOURS.length]!;
  let skin = skin0, hair = hair0;
  const character = figure in CHARACTER_HAIR;
  let hairStyle: HairStyle = character ? CHARACTER_HAIR[figure]! : pick(r, SHORT_HAIR);
  const soft = SOFT_FACES.has(figure);
  const young = figure === "ragazzo" || figure === "folletto";
  const age = card?.age ?? 25;
  const fr = r();
  let facial: Facial = soft || young ? "none" : fr < 0.12 + (age > 29 ? 0.12 : 0) ? "beard" : fr < 0.3 ? "mustache" : fr < 0.38 ? "goatee" : "none";
  const big = ["toro", "muro", "barile", "roccia"].includes(figure);
  let nose: Nose = big ? pick(r, ["big", "round"] as const) : figure === "spillo" || figure === "folletto" ? "pointy" : pick(r, ["button", "button", "round", "pointy"] as const);
  let ears: Ears = figure === "folletto" ? "pointy" : "round";
  const face: FaceDesign = {
    eyes: soft ? pick(r, ["big", "almond", "round"] as const) : pick(r, ["round", "almond", "narrow", "big", "sleepy", "sharp"] as const),
    brows: soft ? pick(r, ["thin", "arched"] as const) : pick(r, ["thick", "thin", "arched", "flat", "bushy"] as const),
    eyeColour: pick(r, EYE_COLOURS),
    lashes: soft || r() < 0.12,
    freckles: r() < 0.16,
    blush: soft || r() < 0.25,
    scar: !soft && r() < 0.07,
    patch: 0,
    fangs: false,
    stubble: !soft && !young && facial === "none" && r() < 0.18,
    wide: 0.9 + r() * 0.2,
  };
  let barefoot = false;
  const variant = r();
  if (themed) {
    switch (people) {
      case "alien":
        build.head = (build.head ?? 1) * 1.14;
        hairStyle = variant < 0.35 ? "crest" : "none";
        facial = "none"; nose = "none"; ears = "none"; face.brows = "none"; face.freckles = false; face.stubble = false; face.scar = false;
        face.eyes = variant > 0.82 ? "cyclops" : "alien";
        skin = pick(r, ["#7ee36a", "#5fd6a8", "#a6e64a", "#6fd0e0"]);
        hair = "#1d6b34";
        break;
      case "vampire":
        hairStyle = pick(r, ["slick", "long", "sidepart"] as const);
        face.eyeColour = "#c8102e"; face.fangs = true; face.blush = false; face.freckles = false;
        ears = "pointy"; face.brows = face.brows === "bushy" ? "arched" : face.brows;
        if (facial === "beard") facial = "goatee";
        break;
      case "pirate":
        face.patch = variant < 0.45 ? (variant < 0.22 ? 1 : 2) : 0;
        if (!soft && facial === "none" && r() < 0.6) facial = pick(r, ["beard", "mustache"] as const);
        barefoot = true;
        break;
      case "dragon":
        hairStyle = "none"; facial = "none"; nose = "snout"; ears = "none";
        face.eyes = "reptile"; face.eyeColour = "#ffd23f"; face.brows = "flat"; face.freckles = false; face.blush = false; face.stubble = false;
        skin = pick(r, ["#ff7b3a", "#e8502a", "#f2a03a", "#d83a2a"]);
        hair = "#8c1a0c";
        break;
      case "robot":
        hairStyle = "none"; facial = "none"; nose = "none"; ears = "none";
        face.eyes = "visor"; face.brows = "none"; face.freckles = false; face.blush = false; face.stubble = false; face.scar = false; face.lashes = false;
        skin = pick(r, ["#b7c4d4", "#c9ced6", "#9fb0c4", "#d4c49a"]);
        break;
      case "yeti":
        hairStyle = "fur"; facial = "none"; nose = "round"; ears = "none";
        face.brows = "bushy"; face.freckles = false; face.stubble = false;
        skin = "#9fb6cc"; hair = "#f7fbff";
        barefoot = true;
        break;
      default: break;
    }
  }
  const second = club.kit2 || club.alt;
  return {
    key, name: card?.name ?? club.name, number: NUMBERS[card?.role ?? (keeper ? "POR" : "CEN")] ?? 10 + slot, keeper, figure, build,
    height: keeper ? 1 : BODY_HEIGHT[figure] ?? 1, people: themed ? people : "human", style, team: club.id,
    skin, hair, hairStyle, facial, nose, ears, face,
    kit: { shirt: kit.shirt, shorts: kit.shorts, socks: kit.socks, second: keeper ? kit.shorts : second, pattern: keeper ? 0 : club.pattern ?? 0, boots: "#20242c", gloves: "#f4f6fb" },
    barefoot, variant,
  };
}

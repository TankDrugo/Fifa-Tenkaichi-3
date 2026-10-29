// Faces and shirt numbers drawn with canvas (docs/PIANO-3D-ONLINE.md, section 4.7: "faccia
// disegnata su una texture fatta con canvas ... con espressioni che cambiano"). One row of the face
// atlas a player, one tile an expression; the shader of character.ts projects the tile on the front
// of the head and picks the column the match asks for. The tile spans the head's width: x from -R
// to R, y from the head's centre -R to +R.
import { CanvasTexture, SRGBColorSpace } from "three";
import type { Design } from "./looks";
import { contrast, shade } from "./parts";

export const EXPRESSIONS = ["neutral", "focus", "effort", "joy", "pain", "surprise", "upset", "blink"] as const;
export type Expression = (typeof EXPRESSIONS)[number];
export const EXPRESSION: Record<Expression, number> = Object.fromEntries(EXPRESSIONS.map((e, i) => [e, i])) as Record<Expression, number>;
export const TILE = 128;
export const NUMBER_COLUMNS = 4;

const INK = "#1a1210";

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")!];
}

// One face in one expression, in a tile of TILE pixels with its centre at (0, 0) and 1 = R.
function drawFace(g: CanvasRenderingContext2D, d: Design, e: Expression): void {
  const f = d.face, S = TILE / 2;
  g.save();
  g.scale(S, S);                    // now the tile is -1..1 both ways, y down
  g.lineCap = "round"; g.lineJoin = "round";
  const eyeY = -0.08, browY = -0.33, mouthY = 0.43, dx = 0.34 * f.wide;
  const brow = d.hairStyle === "none" || d.hairStyle === "fur" ? shade(d.skin, -0.45) : shade(d.hair, -0.15);

  // cheeks, freckles, stubble under everything
  if (f.blush) { g.fillStyle = "rgba(255,110,120,0.32)"; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 0.5, 0.2, 0.15, 0.08, 0, 0, Math.PI * 2); g.fill(); } }
  if (f.freckles) { g.fillStyle = shade(d.skin, -0.35); for (const sx of [-1, 1]) for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(sx * (0.4 + (k % 3) * 0.07), 0.14 + Math.floor(k / 3) * 0.06 + (k % 2) * 0.02, 0.017, 0, Math.PI * 2); g.fill(); } }
  if (f.stubble) { g.fillStyle = "rgba(40,30,30,0.14)"; g.beginPath(); g.ellipse(0, 0.62, 0.62, 0.36, 0, 0, Math.PI); g.fill(); g.beginPath(); g.ellipse(0, 0.42, 0.25, 0.1, 0, Math.PI, 0); g.fill(); }

  // ---- eyes -------------------------------------------------------------------------------
  const open = e === "blink" ? 0 : e === "effort" ? 0.25 : e === "focus" || e === "upset" ? 0.7 : e === "surprise" ? 1.25 : 1;
  const happy = e === "joy", hurt = e === "pain";
  const eye = (cx: number, sx: number) => {
    let rx = 0.13, ry = 0.17;
    switch (f.eyes) {
      case "big": rx = 0.16; ry = 0.21; break;
      case "narrow": ry = 0.11; break;
      case "almond": case "sharp": rx = 0.15; ry = 0.13; break;
      case "sleepy": ry = 0.15; break;
      case "alien": rx = 0.2; ry = 0.24; break;
      case "reptile": rx = 0.15; ry = 0.17; break;
      case "cyclops": rx = 0.3; ry = 0.3; break;
      default: break;
    }
    g.save(); g.translate(cx, eyeY);
    if (f.eyes === "sharp" || f.eyes === "alien") g.rotate(sx * -0.32);
    if (happy || hurt || open === 0) {
      // closed: an arch for joy, a chevron for pain, a line to blink
      g.strokeStyle = INK; g.lineWidth = 0.055;
      g.beginPath();
      if (happy) { g.moveTo(-rx, 0.03); g.quadraticCurveTo(0, -ry * 1.1, rx, 0.03); }
      else if (hurt) { g.moveTo(-rx * sx, -ry * 0.6); g.lineTo(rx * sx, 0); g.lineTo(-rx * sx, ry * 0.6); }
      else { g.moveTo(-rx, 0.02); g.quadraticCurveTo(0, ry * 0.35, rx, 0.02); }
      g.stroke();
      if (f.lashes && !hurt) { g.lineWidth = 0.035; g.beginPath(); g.moveTo(sx * rx * 0.9, 0); g.lineTo(sx * (rx + 0.06), -0.04); g.stroke(); }
      g.restore();
      return;
    }
    const h = ry * Math.min(1.25, open);
    // the white, or the dark of an alien's eye
    g.beginPath();
    if (f.eyes === "almond" || f.eyes === "sharp" || f.eyes === "alien") { g.moveTo(-rx, 0); g.quadraticCurveTo(0, -h * 1.5, rx, 0); g.quadraticCurveTo(0, h * 1.3, -rx, 0); }
    else g.ellipse(0, 0, rx * (e === "surprise" ? 1.12 : 1), h, 0, 0, Math.PI * 2);
    g.fillStyle = f.eyes === "alien" ? "#0c0f1a" : f.eyes === "reptile" ? f.eyeColour : "#ffffff";
    g.fill();
    g.save(); g.clip();
    if (f.eyes !== "alien") {
      // iris and pupil, looking a little inward; small when surprised
      const ir = (f.eyes === "big" || f.eyes === "cyclops" ? 0.72 : 0.62) * Math.min(rx, ry) * (e === "surprise" ? 0.7 : 1);
      if (f.eyes === "reptile") { g.fillStyle = "#120a04"; g.beginPath(); g.ellipse(0, 0, ir * 0.22, ir * 1.3, 0, 0, Math.PI * 2); g.fill(); }
      else {
        g.fillStyle = f.eyeColour; g.beginPath(); g.arc(-sx * 0.015, 0.01, ir, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#0c0a0a"; g.beginPath(); g.arc(-sx * 0.015, 0.01, ir * 0.55, 0, Math.PI * 2); g.fill();
      }
    }
    // the shine that makes them alive
    g.fillStyle = "rgba(255,255,255,0.95)"; g.beginPath(); g.arc(rx * 0.32, -h * 0.35, Math.min(rx, ry) * 0.24, 0, Math.PI * 2); g.fill();
    if (f.eyes === "big" || f.eyes === "alien") { g.beginPath(); g.arc(-rx * 0.3, h * 0.35, Math.min(rx, ry) * 0.12, 0, Math.PI * 2); g.fill(); }
    // eyelids: sleepy and focused eyes are half covered by skin
    const lid = f.eyes === "sleepy" ? 0.4 : e === "focus" ? 0.38 : e === "upset" ? 0.45 : 0;
    if (lid > 0) {
      g.fillStyle = d.skin; g.beginPath();
      if (e === "focus") { g.moveTo(-rx - 0.05, -h - 0.05); g.lineTo(rx + 0.05, -h - 0.05); g.lineTo(rx + 0.05, -h + h * 2 * lid * (sx > 0 ? 0.6 : 1.4)); g.lineTo(-rx - 0.05, -h + h * 2 * lid * (sx > 0 ? 1.4 : 0.6)); }
      else g.rect(-rx - 0.05, -h - 0.05, 2 * rx + 0.1, h * 2 * lid + 0.05);
      g.fill();
    }
    g.restore();
    // the outline, and the lid's line
    g.strokeStyle = INK; g.lineWidth = 0.045;
    g.beginPath();
    if (f.eyes === "almond" || f.eyes === "sharp" || f.eyes === "alien") { g.moveTo(-rx, 0); g.quadraticCurveTo(0, -h * 1.5, rx, 0); g.quadraticCurveTo(0, h * 1.3, -rx, 0); }
    else g.ellipse(0, 0, rx * (e === "surprise" ? 1.12 : 1), h, 0, 0, Math.PI * 2);
    g.stroke();
    if (lid > 0) { g.lineWidth = 0.05; g.beginPath(); g.moveTo(-rx, -h + h * 2 * lid * (e === "focus" ? (sx > 0 ? 1.4 : 0.6) : 1)); g.lineTo(rx, -h + h * 2 * lid * (e === "focus" ? (sx > 0 ? 0.6 : 1.4) : 1)); g.stroke(); }
    if (f.lashes) { g.lineWidth = 0.035; for (let k = 0; k < 2; k++) { g.beginPath(); g.moveTo(sx * rx * (0.75 + k * 0.2), -h * (0.7 - k * 0.3)); g.lineTo(sx * (rx + 0.07), -h * (0.95 - k * 0.35) - 0.04); g.stroke(); } }
    g.restore();
  };
  if (f.eyes === "visor") {
    // a robot: the visor is a shape of its own (parts.ts); here only the cheek lights
    g.fillStyle = "rgba(60,220,255,0.35)"; for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * 0.55, 0.15, 0.05, 0, Math.PI * 2); g.fill(); }
  } else if (f.eyes === "cyclops") eye(0, 1);
  else for (const sx of [-1, 1]) eye(sx * dx, sx);

  // eyepatch: over one eye, its strap round the head
  if (f.patch) {
    const sx = f.patch === 1 ? -1 : 1;
    g.strokeStyle = "#141414"; g.lineWidth = 0.035;
    g.beginPath(); g.moveTo(-1, -0.42); g.lineTo(1, 0.05 * sx); g.stroke();
    g.fillStyle = "#141414"; g.beginPath(); g.ellipse(sx * dx, eyeY + 0.01, 0.19, 0.17, 0, 0, Math.PI * 2); g.fill();
  }
  if (f.scar) { g.strokeStyle = shade(d.skin, -0.3); g.lineWidth = 0.03; g.beginPath(); g.moveTo(dx + 0.1, -0.42); g.lineTo(dx - 0.02, 0.12); g.stroke(); for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(dx + 0.06 - k * 0.04 - 0.05, -0.28 + k * 0.15); g.lineTo(dx + 0.06 - k * 0.04 + 0.05, -0.26 + k * 0.15); g.stroke(); } }

  // ---- brows ------------------------------------------------------------------------------
  if (f.brows !== "none" && f.eyes !== "visor") {
    // inner end down when focused or straining, up when hurt, sad or surprised
    const tilt = e === "focus" || e === "effort" ? 0.1 : e === "pain" || e === "upset" ? -0.09 : 0;
    const lift = e === "surprise" ? -0.1 : e === "joy" ? -0.05 : e === "effort" ? 0.04 : 0;
    const w = f.brows === "thick" ? 0.08 : f.brows === "bushy" ? 0.11 : f.brows === "thin" ? 0.035 : 0.055;
    g.strokeStyle = brow; g.lineWidth = w;
    const xs = f.eyes === "cyclops" ? [0] : [-1, 1];
    for (const sx of xs) {
      const cx = f.eyes === "cyclops" ? 0 : sx * dx, half = f.eyes === "cyclops" ? 0.3 : 0.15;
      const y = browY + lift + (f.eyes === "cyclops" ? -0.15 : 0);
      g.beginPath();
      if (f.eyes === "cyclops") { g.moveTo(-half, y + tilt); g.quadraticCurveTo(0, y - 0.06, half, y + tilt); }
      else {
        const inner = cx - sx * half, outer = cx + sx * half;
        g.moveTo(inner, y + tilt);
        if (f.brows === "arched") g.quadraticCurveTo(cx, y - 0.09, outer, y + 0.02);
        else g.lineTo(outer, y - (f.brows === "flat" ? 0 : 0.03));
      }
      g.stroke();
      if (f.brows === "bushy") { g.lineWidth = 0.03; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(cx + k * 0.06, y - 0.06); g.lineTo(cx + k * 0.06 + 0.02, y + 0.04); g.stroke(); } g.lineWidth = w; }
    }
  }

  // ---- mouth ------------------------------------------------------------------------------
  g.save(); g.translate(0, mouthY);
  g.strokeStyle = INK; g.lineWidth = 0.05; g.fillStyle = "#5a1a1c";
  const robot = f.eyes === "visor";
  if (robot) {
    // a grille that bends with the mood
    const bend = e === "joy" ? 0.08 : e === "upset" || e === "pain" ? -0.06 : 0;
    g.fillStyle = "#20262f"; g.beginPath(); g.roundRect(-0.26, -0.08, 0.52, 0.16, 0.05); g.fill();
    g.strokeStyle = e === "joy" ? "#7ef0ff" : "#3cdcff"; g.lineWidth = 0.03;
    for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(-0.2, k * 0.045 - bend); g.quadraticCurveTo(0, k * 0.045 + bend, 0.2, k * 0.045 - bend); g.stroke(); }
  } else if (e === "joy") {
    g.beginPath(); g.moveTo(-0.24, -0.06); g.quadraticCurveTo(0, -0.1, 0.24, -0.06); g.quadraticCurveTo(0.2, 0.26, 0, 0.26); g.quadraticCurveTo(-0.2, 0.26, -0.24, -0.06); g.fill(); g.stroke();
    g.fillStyle = "#ffffff"; g.fillRect(-0.18, -0.07, 0.36, 0.06);
    g.fillStyle = "#e86a7a"; g.beginPath(); g.ellipse(0, 0.17, 0.11, 0.06, 0, 0, Math.PI * 2); g.fill();
  } else if (e === "effort") {
    // gritted teeth
    g.fillStyle = "#ffffff"; g.beginPath(); g.roundRect(-0.21, -0.07, 0.42, 0.14, 0.04); g.fill(); g.stroke();
    g.lineWidth = 0.025; g.beginPath(); g.moveTo(-0.21, 0); g.lineTo(0.21, 0); for (let k = -1; k <= 1; k++) { g.moveTo(k * 0.09, -0.07); g.lineTo(k * 0.09, 0.07); } g.stroke();
  } else if (e === "pain" || e === "surprise") {
    g.beginPath(); g.ellipse(0, 0.02, e === "pain" ? 0.13 : 0.08, e === "pain" ? 0.09 : 0.1, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  } else if (e === "upset") {
    g.beginPath(); g.moveTo(-0.16, 0.06); g.quadraticCurveTo(0, -0.07, 0.16, 0.06); g.stroke();
  } else if (e === "focus") {
    g.beginPath(); g.moveTo(-0.13, 0.01); g.lineTo(0.13, -0.01); g.stroke();
  } else {
    // at rest, each face its own smile from the draw
    const k = d.variant;
    g.beginPath();
    if (k < 0.4) { g.moveTo(-0.17, -0.02); g.quadraticCurveTo(0, 0.12, 0.17, -0.02); }
    else if (k < 0.7) { g.moveTo(-0.15, 0.0); g.quadraticCurveTo(0.02, 0.07, 0.18, -0.05); }
    else { g.moveTo(-0.2, -0.04); g.quadraticCurveTo(0, 0.16, 0.2, -0.04); g.closePath(); g.fill(); }
    g.stroke();
  }
  if (f.fangs && !robot) { g.fillStyle = "#ffffff"; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 0.12, -0.03); g.lineTo(sx * 0.08, -0.03); g.lineTo(sx * 0.1, 0.07); g.closePath(); g.fill(); } }
  g.restore();
  g.restore();
}

export interface Atlases {
  faces: CanvasTexture;
  numbers: CanvasTexture;
  rows: number;
}

// One row of faces a design; numbers in a grid of NUMBER_COLUMNS.
export function buildAtlases(designs: Design[]): Atlases {
  const rows = Math.max(1, designs.length);
  const [fc, fg] = canvas(TILE * EXPRESSIONS.length, TILE * rows);
  designs.forEach((d, row) => EXPRESSIONS.forEach((e, col) => {
    fg.save(); fg.translate(col * TILE + TILE / 2, row * TILE + TILE / 2);
    drawFace(fg, d, e);
    fg.restore();
  }));
  const nrows = Math.ceil(rows / NUMBER_COLUMNS);
  const [nc, ng] = canvas(TILE * NUMBER_COLUMNS, TILE * nrows);
  designs.forEach((d, i) => {
    const x = (i % NUMBER_COLUMNS) * TILE + TILE / 2, y = Math.floor(i / NUMBER_COLUMNS) * TILE + TILE / 2;
    ng.font = `900 ${Math.round(TILE * 0.78)}px system-ui, "DejaVu Sans", sans-serif`;
    ng.textAlign = "center"; ng.textBaseline = "middle";
    ng.lineWidth = TILE * 0.07; ng.lineJoin = "round";
    ng.strokeStyle = d.kit.second === d.kit.shirt ? contrast(contrast(d.kit.shirt)) : d.kit.second;
    ng.strokeText(String(d.number), x, y + TILE * 0.04);
    ng.fillStyle = contrast(d.kit.shirt);
    ng.fillText(String(d.number), x, y + TILE * 0.04);
  });
  const tex = (c: HTMLCanvasElement) => { const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.anisotropy = 4; return t; };
  return { faces: tex(fc), numbers: tex(nc), rows };
}

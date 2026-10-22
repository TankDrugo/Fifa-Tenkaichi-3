// Photos of phase 3 (docs/PIANO-3D-ONLINE.md), against a running apps/web:
//   stili: for each of the 14 teams, its five footballers in style A (the kit) above style B (the
//          team's gear, the lore peoples as what they are), into docs/fase3/stili/<team>.jpg, for
//          Tancredi to choose the characters' style on (22/10/2026).
// Chromium draws WebGL in software here: a frame of the showroom takes about 2 s, so the page stops
// drawing as soon as it is ready and each photo is one frame drawn and read in the same task
// (game/ShowroomStage.tsx, capture).
//
// Run: node apps/web/scripts/photos3.ts [url=http://localhost:3000] [stili] [--teams a,b,c]
import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser } from "playwright";
import { CLUBS } from "@ft3/sim";

const args = process.argv.slice(2);
const flag = (k: string) => { const i = args.indexOf(k); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v ?? null; };
const teams = (flag("--teams") ?? CLUBS.map((c) => c.id).join(",")).split(",");
const base = args.find((a) => a.startsWith("http")) ?? "http://localhost:3000";
const root = path.resolve(import.meta.dirname, "..", "..", "..");

type Show = { __ft3show?: { frames: number; frozen?: boolean; capture: (q?: number) => string } };

// One frame of a showroom page, as a JPEG data URL.
async function shoot(browser: Browser, url: string): Promise<string> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url, { waitUntil: "load", timeout: 180_000 });
  await page.waitForFunction(() => { const w = (window as unknown as Show).__ft3show; if (w && w.frames > 0) { w.frozen = true; return true; } return false; }, null, { timeout: 180_000, polling: 100 });
  // the first capture waits for the frames already sent to the software renderer
  await page.evaluate(() => (window as unknown as Show).__ft3show!.capture(0.5));
  const data = await page.evaluate(() => (window as unknown as Show).__ft3show!.capture(0.92));
  await page.close();
  if (errors.length) throw new Error(`${url}: ${errors.join("; ")}`);
  return data;
}

// Rows cut from the photos and stacked under a title, drawn in a blank page.
async function compose(browser: Browser, title: string, rows: { label: string; data: string }[], cut: [number, number]): Promise<Buffer> {
  const page = await browser.newPage();
  const url = await page.evaluate(async ({ title, rows, cut }) => {
    const load = (src: string) => new Promise<HTMLImageElement>((ok) => { const im = new Image(); im.onload = () => ok(im); im.src = src; });
    const head = 48, h = cut[1] - cut[0];
    const c = document.createElement("canvas");
    c.width = 1280; c.height = head + rows.length * h;
    const g = c.getContext("2d")!;
    g.fillStyle = "#0b1020"; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "#ffffff"; g.font = "700 26px system-ui, sans-serif"; g.textBaseline = "middle";
    g.fillText(title, 18, head / 2);
    for (let i = 0; i < rows.length; i++) {
      const im = await load(rows[i]!.data);
      g.drawImage(im, 0, cut[0], 1280, h, 0, head + i * h, 1280, h);
      g.font = "700 22px system-ui, sans-serif";
      const w = g.measureText(rows[i]!.label).width + 28;
      g.fillStyle = "rgba(10,14,28,0.85)"; g.beginPath(); g.roundRect(12, head + i * h + 12, w, 38, 8); g.fill();
      g.fillStyle = "#ffffff"; g.fillText(rows[i]!.label, 26, head + i * h + 31);
    }
    return c.toDataURL("image/jpeg", 0.86);
  }, { title, rows, cut });
  await page.close();
  return Buffer.from(url.split(",")[1]!, "base64");
}

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
if (args.includes("stili") || !args.some((a) => !a.startsWith("http"))) {
  const dir = path.join(root, "docs", "fase3", "stili");
  fs.mkdirSync(dir, { recursive: true });
  for (const id of teams) {
    const club = CLUBS.find((c) => c.id === id);
    if (!club) throw new Error(`no team ${id}`);
    const a = await shoot(browser, `${base}/personaggi?team=${id}&style=A`);
    const b = await shoot(browser, `${base}/personaggi?team=${id}&style=B`);
    const jpg = await compose(browser, `${club.name}${club.people ? ` (${club.people.toLowerCase()})` : ""}`, [{ label: "A · sportivo", data: a }, { label: "B · a tema", data: b }], [140, 540]);
    fs.writeFileSync(path.join(dir, `${id}.jpg`), jpg);
    console.log(`docs/fase3/stili/${id}.jpg ${Math.round(jpg.length / 1024)} KB`);
  }
}
await browser.close();

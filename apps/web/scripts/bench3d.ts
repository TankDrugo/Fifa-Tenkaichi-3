// The checks of phase 2 (docs/PIANO-3D-ONLINE.md, section 4.6), against a running apps/web:
//   - budget: /bench in headless Chromium at 1280 x 720 and 1920 x 1080, pixel ratio 1 and 1,5, at
//     three moments of the match (the kickoff, after 1.800 and 7.200 steps); the most draw calls
//     and triangles of renderer.info over the frames, over the whole frame (shadows and
//     post-processing included), the shadow map's size and the pixel ratio used;
//   - the scene shows the simulation's match: the page's fingerprint after 900 steps against the
//     same match played here in Node (game/core/driver.ts on packages/sim);
//   - photos: the camera options at the same moment of the match, with what each shows (where the
//     side lines fall, how tall a player is near and far), into docs/fase2/ with --photos.
// Chromium draws WebGL in software here (SwiftShader): the counts are the real ones, the frames a
// second are not; those Tancredi measures on /bench on his laptop.
//
// Run: node apps/web/scripts/bench3d.ts [url=http://localhost:3000] [--photos] [--seconds 12]
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";
import { PerspectiveCamera, Vector3 } from "three";
import { fingerprint } from "@ft3/sim";
import { Driver } from "../game/core/driver.ts";

const args = process.argv.slice(2);
const flag = (k: string) => { const i = args.indexOf(k); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v ?? null; };
const photos = args.includes("--photos"); if (photos) args.splice(args.indexOf("--photos"), 1);
const seconds = Number(flag("--seconds") ?? 12);
const base = args[0] ?? "http://localhost:3000";
const root = path.resolve(import.meta.dirname, "..", "..", "..");

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
async function open(url: string, width: number, height: number, dpr: number): Promise<Page> {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForFunction(() => !!window.__ft3?.loop(), null, { timeout: 120_000 });
  if (errors.length) throw new Error(`${url}: ${errors.join("; ")}`);
  return page;
}

// ---- budget ---------------------------------------------------------------------------------
let over = 0;
const f = (v: number, d = 0) => v.toLocaleString("it-IT", { minimumFractionDigits: d, maximumFractionDigits: d });
for (const [w, h, dpr, skip] of [[1280, 720, 1, 0], [1280, 720, 1.5, 1800], [1920, 1080, 1, 7200], [1920, 1080, 1.5, 0], [1920, 1080, 1.5, 1800], [1920, 1080, 1.5, 7200]] as const) {
  const page = await open(`${base}/bench?seed=7&skip=${skip}`, w, h, dpr);
  await page.waitForTimeout(seconds * 1000);
  const r = await page.evaluate(() => {
    const ft = window.__ft3!, l = ft.loop()!;
    const sun = (l as unknown as { sun: { shadow: { mapSize: { x: number; y: number } } } }).sun;
    return { calls: ft.stats.maxCalls, triangles: ft.stats.maxTriangles, frames: ft.stats.summary().frames, info: ft.stats.info, shadow: sun.shadow.mapSize.x, clock: l.driver.match.clock };
  });
  const ok = r.calls <= 150 && r.triangles <= 300_000 && r.shadow <= 2048 && r.info.dpr <= 1.5;
  if (!ok) over++;
  console.log(`${ok ? "ok  " : "NO  "} ${w} × ${h}, schermo × ${f(dpr, 1)}, dopo ${skip} passi: disegno ${r.info.width} × ${r.info.height} (× ${f(r.info.dpr, 2)}); al massimo ${r.calls} chiamate di disegno (budget 150), ${f(r.triangles)} triangoli (budget 300.000); mappa d'ombra ${r.shadow}; ${r.frames} fotogrammi, ${f(r.clock, 1)} s di partita`);
  await page.close();
}

// ---- the scene shows the simulation's match -------------------------------------------------
{
  const page = await open(`${base}/partita?seed=7&skip=900&paused=1`, 1280, 720, 1);
  const inPage = await page.evaluate(() => window.__ft3!.fingerprint());
  const d = new Driver("fulmini", "marea", 7);
  d.skip(900);
  const inNode = fingerprint(d.match);
  if (inPage !== inNode) over++;
  console.log(`${inPage === inNode ? "ok  " : "NO  "} impronta dopo 900 passi: pagina ${inPage}, Node ${inNode}`);
  await page.close();
}

// ---- camera photos ----------------------------------------------------------------------------
// What a camera shows on a 1280 x 720 screen: rows of the near and far side lines, and the height
// in pixels of a 0,85 m player standing on them (game/render/style.ts, CHARACTER_HEIGHT).
function frame(pitchDeg: number, fovDeg: number, span: number, aim: number) {
  const cam = new PerspectiveCamera(fovDeg, 1280 / 720, 1, 400);
  const v = (fovDeg * Math.PI) / 180, p = (pitchDeg * Math.PI) / 180;
  const dist = span / (2 * Math.tan(v / 2) * cam.aspect);
  cam.position.set(0, Math.sin(p) * dist, aim + Math.cos(p) * dist);
  cam.lookAt(new Vector3(0, 0, aim));
  cam.updateMatrixWorld();
  const row = (y: number, z: number) => Math.round((1 - new Vector3(0, y, z).project(cam).y) / 2 * 720);
  return { dist, near: row(0, 8), far: row(0, -8), tallNear: row(0, 7.5) - row(0.85, 7.5), tallFar: row(0, -7.5) - row(0.85, -7.5) };
}
if (photos) {
  const dir = path.join(root, "docs", "fase2");
  fs.mkdirSync(dir, { recursive: true });
  const options: [string, string, number, number, number, number][] = [
    ["a-strikers", "come Mario Strikers: 29° verso il basso, 18° di campo visivo, 19,8 m a metà schermo", 29, 18, 19.8, -0.35],
    ["b-vicina", "più vicina: stesso angolo e obiettivo, 15 m a metà schermo", 29, 18, 15, -0.35],
    ["c-dall-alto", "più dall'alto e grandangolare: 45°, 30° di campo visivo", 45, 30, 19.8, -0.35],
    ["d-radente", "più radente: 20° verso il basso, 12° di campo visivo", 20, 12, 19.8, -0.35],
  ];
  const rows: string[] = [];
  for (const [name, label, pitch, fov, span, aim] of options) {
    const page = await open(`${base}/partita?seed=7&skip=900&paused=1&pitch=${pitch}&fov=${fov}&span=${span}&aim=${aim}`, 1280, 720, 1);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(dir, `telecamera-${name}.jpg`), type: "jpeg", quality: 82, timeout: 240_000 });
    await page.close();
    const m = frame(pitch, fov, span, aim);
    rows.push(`| \`docs/fase2/telecamera-${name}.jpg\` | ${label} | ${f(m.dist, 1)} m | ${m.near} px | ${m.far} px | ${m.tallNear} px | ${m.tallFar} px |`);
  }
  // a close look at the players, from the same side
  const page = await open(`${base}/partita?seed=7&skip=900&paused=1&span=2.6&aim=0&focus=3&pitch=16&fov=25`, 1280, 720, 1);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(dir, "calciatori-da-vicino.jpg"), type: "jpeg", quality: 85, timeout: 240_000 });
  await page.close();
  console.log("| Foto | Telecamera | Distanza | Linea laterale vicina | Linea lontana | Calciatore vicino | Calciatore lontano |\n|---|---|---|---|---|---|---|\n" + rows.join("\n"));
}

await browser.close();
process.exit(over ? 1 : 0);

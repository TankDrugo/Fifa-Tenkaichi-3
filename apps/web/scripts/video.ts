// A short video of a page of the game, smooth even where Chromium draws WebGL in software (the cloud
// chats): the page's performance.now, which the scene's clock reads, is moved on by one frame at a
// time, the canvas is read in the same frame the scene draws it, and ffmpeg joins the pictures
// (docs/PERSONAGGI.md). Only the canvas: the score above it is HTML. Playwright's own clock
// (page.clock) stops its photos, and a photo of the page takes 17 s in software against 1 s here.
//   node apps/web/scripts/video.ts <url> <out.mp4> [--seconds 12] [--fps 30] [--width 1280 --height 720]
// ffmpeg from the system, or from Playwright's folder.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const flag = (k: string, d: number): number => { const i = args.indexOf(k); if (i < 0) return d; const v = Number(args[i + 1]); args.splice(i, 2); return v; };
const seconds = flag("--seconds", 12), fps = flag("--fps", 30), width = flag("--width", 1280), height = flag("--height", 720);
const [url, out] = args;
if (!url || !out) { console.log("node apps/web/scripts/video.ts <url> <out.mp4> [--seconds 12] [--fps 30]"); process.exit(1); }
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ft3-video-"));

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width, height } });
page.on("pageerror", (e) => console.error(e.message));
await page.addInitScript(() => {
  let now = 0;
  performance.now = () => now;
  // the scene's frame callback was asked for before this one: in the next frame it draws with the
  // new time, then this reads the canvas before the browser clears it
  (window as unknown as { __step: (ms: number) => Promise<string> }).__step = (ms) => new Promise((done) => {
    now += ms;
    requestAnimationFrame(() => done(document.querySelector("canvas")?.toDataURL("image/jpeg", 0.92) ?? ""));
  });
});
await page.goto(url, { waitUntil: "networkidle", timeout: 180_000 });
await page.waitForFunction(() => !!(window as unknown as { __ft3?: { loop(): unknown } }).__ft3?.loop(), null, { timeout: 180_000 });
const step = (ms: number) => page.evaluate((v) => (window as unknown as { __step: (ms: number) => Promise<string> }).__step(v), ms);
await step(0);
const n = Math.round(seconds * fps);
for (let k = 0; k < n; k++) {
  const jpeg = await step(1000 / fps);
  fs.writeFileSync(path.join(dir, `f${String(k).padStart(5, "0")}.jpg`), Buffer.from(jpeg.split(",")[1]!, "base64"));
  if (k % fps === 0) process.stdout.write(`\r${k / fps} / ${seconds} s`);
}
await browser.close();
const ffmpeg = ["ffmpeg", "/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux"].find((f) => { try { execFileSync(f, ["-version"], { stdio: "ignore" }); return true; } catch { return false; } });
if (!ffmpeg) throw new Error("serve ffmpeg");
execFileSync(ffmpeg, ["-y", "-v", "error", "-framerate", String(fps), "-i", path.join(dir, "f%05d.jpg"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-movflags", "+faststart", out]);
fs.rmSync(dir, { recursive: true });
console.log(`\n${out}: ${n} fotogrammi, ${(fs.statSync(out).size / 1e6).toFixed(1)} MB`);

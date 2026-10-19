// Fifa Tenkaichi 3 - renders tools/cover/cover.html into the itch.io cover and the two logo images
// the game paints on the pitch (web/js/render.js, buildGround and drawBoards).
//
//   node tools/cover/render_cover.js
//
// Needs Playwright with Chromium and the network for Google Fonts (Bangers, Permanent Marker,
// Saira Extra Condensed); the outputs are committed, so the game itself needs neither.
//   tools/cover/cover.jpg           1260 x 1000, the cover for itch.io (twice its 630 x 500)
//   web/assets/logo/ft3_logo.png    the stacked title, centre circle
//   web/assets/logo/ft3_wordmark.png the title on one line, pitch boards
"use strict";
const path = require("path");
const { execSync } = require("child_process");
let chromium;
try { ({ chromium } = require("playwright")); }
catch (e) { ({ chromium } = require(path.join(execSync("npm root -g").toString().trim(), "playwright"))); }

const ROOT = path.resolve(__dirname, "..", "..");
const PAGE = "file://" + path.join(__dirname, "cover.html");
const JOBS = [
  { only: "", out: path.join(__dirname, "cover.jpg"), scale: 2 },
  { only: "logo", out: path.join(ROOT, "web/assets/logo/ft3_logo.png"), scale: 1 },
  { only: "wordmark", out: path.join(ROOT, "web/assets/logo/ft3_wordmark.png"), scale: 1 },
];

(async () => {
  require("fs").mkdirSync(path.join(ROOT, "web/assets/logo"), { recursive: true });
  const browser = await chromium.launch();
  for (const job of JOBS) {
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: job.scale });
    await page.goto(PAGE + (job.only ? "?only=" + job.only : ""));
    const size = await page.evaluate(() => window.ready);
    const fonts = await page.evaluate(() => ["Bangers", "Permanent Marker", "Saira Extra Condensed"].map((f) => f + " " + document.fonts.check(`20px "${f}"`)));
    const shot = await page.locator("#cover").screenshot(job.only ? { omitBackground: true } : { type: "jpeg", quality: 90 });
    // A logo is cut to its visible pixels: a text's box also holds the room below its baseline.
    const pic = !job.only ? { data: shot, w: size.w * job.scale, h: size.h * job.scale } : await page.evaluate(async (b64) => {
      const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
      const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
      const g = c.getContext("2d"); g.drawImage(img, 0, 0);
      const a = g.getImageData(0, 0, c.width, c.height).data;
      let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (a[(y * c.width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
      const pad = 4, w = x1 - x0 + 1 + 2 * pad, h = y1 - y0 + 1 + 2 * pad;
      const o = document.createElement("canvas"); o.width = w; o.height = h;
      o.getContext("2d").drawImage(c, x0 - pad, y0 - pad, w, h, 0, 0, w, h);
      return { data: o.toDataURL("image/png").split(",")[1], w, h };
    }, shot.toString("base64"));
    require("fs").writeFileSync(job.out, typeof pic.data === "string" ? Buffer.from(pic.data, "base64") : pic.data);
    console.log(`${path.relative(ROOT, job.out)}: ${pic.w} x ${pic.h} px (${fonts.join(", ")})`);
    await page.close();
  }
  await browser.close();
})();

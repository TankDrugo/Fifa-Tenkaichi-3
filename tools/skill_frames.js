// Strike Legends - contact sheets of the skill moves as the browser game draws them
// (docs/DETTAGLI.md, "Skill"): one row per move and figure, one frame every 1/30 s, cropped round
// the player. The match is paused and stepped by hand, so every frame is the game's own drawing.
//
// Run: node tools/skill_frames.js <url of web/index.html> <out dir> [figure,figure,...] [skill,skill,...]
//      the figure "" is the base figure, a name is a body or a character (web/assets/...)
"use strict";
const path = require("path"), fs = require("fs");
const { chromium } = require(process.env.PLAYWRIGHT || "/opt/node-tools/node_modules/playwright");
const [url, out, figs, only] = process.argv.slice(2);
const FIGURES = (figs || ",barile,vicky").split(",");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const page = await browser.newPage({ viewport: { width: 900, height: 600 }, deviceScaleFactor: 3 });
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(url); await sleep(6000);
  await page.keyboard.press("Enter"); await sleep(400);
  await page.evaluate(() => { const s = SL.ui.game().settings; Object.assign(s, { opponentAi: 2, zoom: 0, names: 0, showHints: false, weather: false, shake: false }); SL.modes.training(); document.querySelector('[data-go="go"]').click(); });
  await sleep(1200);
  await page.keyboard.press("Escape"); await sleep(300);
  await page.addStyleTag({ content: "#pause,#hud{display:none!important}" });
  const ids = (await page.evaluate(() => Object.keys(SL.SKILLS))).filter((k) => !only || only.split(",").includes(k));
  const frames = 20, crop = 96;
  const manifest = [];
  for (const id of ids) for (const fig of FIGURES) {
    await page.evaluate(([id, fig]) => {
      const m = SL.debug.match(), h = m.humans[0].player;
      // a defender stands still 1,6 m in front for the moves that go past him (DEFENDER)
      for (const o of m.players) if (o.team === 1 && !o.isKeeper) { o.x = 10; o.z = -6 + o.slot * 2; o.vx = o.vz = 0; }
      if (["tunnel", "sombrero"].includes(id)) { const d = m.players[6]; d.x = -1.4 + 0.25; d.z = 0.1; d.fx = -1; d.fz = 0; d.pickupLock = 0; }
      m.phase = "live"; h.body = fig; h.skill = null; h.skillCool = 0; h.react = 0; h.recovery = 0;
      h.card = Object.assign({}, h.card, { ovr: 99, rarity: "leggenda", role: "ALA" });
      h.x = -3; h.z = 0; h.vx = 2.5; h.vz = 0; h.fx = 1; h.fz = 0; h.stick = [1, 0];
      m.ball.carrier = null; m.take(h); h.shield = 0; m.camX = h.x; m.camZ = h.z;
      for (let k = 0; k < 6; k++) m.step();
      SL.input.read = () => ({ x: 1, z: 0, rx: 0, rz: 0, skill: 0, sprint: false, pass: false, shoot: false, feint: false, switch: false, mod: false, special: false });
      m.trySkill(h, id, 1);
    }, [id, fig]);
    const shots = [];
    for (let k = 0; k < frames; k++) {
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const at = await page.evaluate((wide) => { const h = SL.debug.match().humans[0].player; return SL.Render.toScreen(h.x + (wide ? 1.4 : 0.6), h.z, 0.9); }, ["tunnel", "sombrero"].includes(id));
      const file = path.join(out, `${id}_${fig || "base"}_${String(k).padStart(2, "0")}.png`);
      const c = ["tunnel", "sombrero"].includes(id) ? crop * 1.6 : crop;
      await page.screenshot({ path: file, clip: { x: Math.max(0, at[0] - c / 2), y: Math.max(0, at[1] - c / 2), width: c, height: c } });
      shots.push(file);
      await page.evaluate(() => { const m = SL.debug.match(); m.step(); m.step(); });
    }
    manifest.push({ id, fig: fig || "base", shots });
  }
  fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify(manifest));
  console.log("frames", manifest.length * frames, "errors", JSON.stringify(errs));
  await browser.close();
})();

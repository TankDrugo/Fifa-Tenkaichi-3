// A sheet of photos for each clip of a GLB, to judge an animation before it reaches the game
// (docs/PERSONAGGI.md): the clip's frames at even times, side by side, from the side and from the
// front, the time written under each. three draws in headless Chromium, from a page served here.
//   node apps/web/scripts/clipsheet.ts <file.glb> <out dir> [--frames 8] [--clip <name>] [--from <s> --to <s>]
// One PNG per clip in out dir, named after the clip. --from and --to take only that stretch of the
// clip (the piece the game plays, models.ts). --feet <bone>,<bone> also prints, for each clip, when
// the first bone is furthest ahead of the second along +Z: the start of a stride, to line up the
// walk and the run (the offsets of models.ts). The bones are named as the file names them.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const flag = (k: string): string | null => { const i = args.indexOf(k); if (i < 0) return null; const v = args[i + 1] ?? null; args.splice(i, 2); return v; };
const frames = Number(flag("--frames") ?? 8), only = flag("--clip"), from = flag("--from"), to = flag("--to"), feet = flag("--feet");
const [file, out] = args;
if (!file || !out) { console.log("node apps/web/scripts/clipsheet.ts <file.glb> <cartella> [--frames 8] [--clip <nome>] [--from <s> --to <s>]"); process.exit(1); }
fs.mkdirSync(out, { recursive: true });
const three = path.dirname(path.dirname(new URL(import.meta.resolve("three")).pathname));

const page = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#dfe3ea">
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
const W = 220, H = 300;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color("#dfe3ea");
scene.add(new THREE.HemisphereLight("#ffffff", "#8a8f99", 2.2));
const sun = new THREE.DirectionalLight("#ffffff", 2.2); sun.position.set(2, 4, 3); scene.add(sun);
const ground = new THREE.Mesh(new THREE.CircleGeometry(1.2, 48), new THREE.MeshStandardMaterial({ color: "#b9c2cf" }));
ground.rotation.x = -Math.PI / 2; scene.add(ground);
const gltf = await new GLTFLoader().loadAsync("/model.glb");
const model = gltf.scene;
const box = new THREE.Box3().setFromObject(model, true), tall = box.max.y - box.min.y;
model.scale.setScalar(1.7 / tall);
model.position.y = -box.min.y * 1.7 / tall;
scene.add(model);
const mixer = new THREE.AnimationMixer(model);
const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 50);
window.clips = gltf.animations.map((c) => ({ name: c.name, duration: c.duration }));
window.sheet = (name, n, from, to) => {
  const clip = gltf.animations.find((c) => c.name === name);
  mixer.stopAllAction();
  const a = mixer.clipAction(clip); a.play();
  const sheet = document.createElement("canvas");
  sheet.width = W * n; sheet.height = H * 2 + 28;
  const g = sheet.getContext("2d");
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, sheet.width, sheet.height);
  const t0 = from ?? 0, t1 = to ?? clip.duration;
  for (let k = 0; k < n; k++) {
    const t = t0 + (t1 - t0) * k / Math.max(1, n - 1);
    mixer.setTime(Math.min(t, clip.duration - 1e-4));
    // from the right side (the model looks toward +Z), then from the front
    for (const [row, x, z] of [[0, 5.6, 0.7], [1, 0.7, 5.6]]) {
      camera.position.set(x, 1.1, z); camera.lookAt(0, 0.85, 0);
      renderer.render(scene, camera);
      g.drawImage(renderer.domElement, k * W, row * H);
    }
    g.fillStyle = "#1d2433"; g.font = "15px sans-serif"; g.textAlign = "center";
    g.fillText(t.toFixed(2) + " s", k * W + W / 2, H * 2 + 20);
  }
  return sheet.toDataURL("image/png");
};
window.ahead = (name, a, b) => {
  const clip = gltf.animations.find((c) => c.name === name);
  mixer.stopAllAction();
  mixer.clipAction(clip).play();
  const A = model.getObjectByName(a), B = model.getObjectByName(b), pa = new THREE.Vector3(), pb = new THREE.Vector3();
  let best = -Infinity, at = 0;
  for (let t = 0; t < clip.duration; t += 1 / 120) {
    mixer.setTime(t); model.updateMatrixWorld(true);
    A.getWorldPosition(pa); B.getWorldPosition(pb);
    if (pa.z - pb.z > best) { best = pa.z - pb.z; at = t; }
  }
  return at;
};
window.ready = true;
</script>`;

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? "/").split("?")[0]!);
  if (url === "/") { res.setHeader("content-type", "text/html"); res.end(page); return; }
  const f = url === "/model.glb" ? path.resolve(file) : url.startsWith("/three/") ? path.join(three, url.slice(7)) : "";
  if (!f || !fs.existsSync(f)) { res.statusCode = 404; res.end(); return; }
  res.setHeader("content-type", f.endsWith(".js") ? "text/javascript" : "application/octet-stream");
  fs.createReadStream(f).pipe(res);
});
await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
const port = (server.address() as { port: number }).port;
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const tab = await browser.newPage();
tab.on("pageerror", (e) => console.error(e.message));
await tab.goto(`http://127.0.0.1:${port}/`);
await tab.waitForFunction(() => (window as unknown as { ready?: boolean }).ready, null, { timeout: 120_000 });
const clips = await tab.evaluate(() => (window as unknown as { clips: { name: string; duration: number }[] }).clips);
for (const c of clips) {
  if (only && c.name !== only) continue;
  const url = await tab.evaluate(([n, k, a, b]) => (window as unknown as { sheet: (...x: unknown[]) => string }).sheet(n, k, a, b),
    [c.name, frames, from === null ? null : Number(from), to === null ? null : Number(to)] as const);
  const name = path.join(out, `${c.name.replace(/[^\w.-]+/g, "_")}.png`);
  fs.writeFileSync(name, Buffer.from(url.split(",")[1]!, "base64"));
  let line = `${name}: «${c.name}», ${c.duration.toFixed(3)} s`;
  if (feet) {
    const [a, b] = feet.split(",");
    const at = await tab.evaluate(([n, x, y]) => (window as unknown as { ahead: (...v: unknown[]) => number }).ahead(n, x, y), [c.name, a, b] as const);
    line += `; ${a} più avanti di ${b} a ${at.toFixed(3)} s (${(at / c.duration).toFixed(3)} della clip)`;
  }
  console.log(line);
}
await browser.close();
server.close();

// The steps of Meshy's API for a character (docs/PERSONAGGI.md), each waiting for its task and
// downloading the GLBs into a folder:
//   balance                                   credits left
//   library [word]                            the animation library's clips, by name or category
//   image <picture.png> <dir> [json]          Image to 3D: the model as model.glb; json adds or replaces
//                                             the request's fields (docs/PERSONAGGI.md has the ones used)
//   rig <model.glb> <dir> [height m]          rig a textured humanoid GLB (it faces +Z): the rigged
//                                             character, the walk and the run, into dir; prints the rig task
//   animate <rig task> <dir> <id> [id ...]    clips of the library on that rig, one GLB with a clip each
//   motion <dir> <seconds> "<prompt>"         Text to Motion, then applied to the rig in $RIG
//   task <rigging|animations|text-to-motion> <id>   a task as Meshy keeps it
// The key: MESHY_API_KEY, or none in a cloud chat, where the proxy adds it to every call to
// api.meshy.ai; there a placeholder goes in the header. Node takes the proxy from HTTPS_PROXY with
// NODE_USE_ENV_PROXY=1 (Node 22.21 and later).
import fs from "node:fs";
import path from "node:path";

const API = "https://api.meshy.ai/openapi/v1";
const headers = { Authorization: `Bearer ${process.env.MESHY_API_KEY ?? "msy_placeholder"}`, "Content-Type": "application/json" };

async function call(method: string, route: string, body?: unknown): Promise<Record<string, unknown>> {
  const r = await fetch(`${API}/${route}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${route}: ${r.status} ${text.slice(0, 400)}`);
  return JSON.parse(text) as Record<string, unknown>;
}

// waits for a task, printing its progress; the finished task
async function wait(kind: string, id: string): Promise<Record<string, unknown>> {
  for (;;) {
    const t = await call("GET", `${kind}/${id}`);
    process.stdout.write(`\r${kind} ${id}: ${t.status} ${t.progress}%   `);
    if (t.status === "SUCCEEDED") { console.log(`(${t.consumed_credits} crediti)`); return t; }
    if (t.status === "FAILED" || t.status === "CANCELED") throw new Error(`\n${JSON.stringify(t.task_error)}`);
    await new Promise((ok) => setTimeout(ok, 4000));
  }
}

async function download(url: string, file: string): Promise<void> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${file}: ${r.status}`);
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  console.log(`  ${file}: ${(fs.statSync(file).size / 1e6).toFixed(1)} MB`);
}

const [cmd, ...a] = process.argv.slice(2);
if (cmd === "balance") console.log(await call("GET", "balance"));
else if (cmd === "library") {
  const word = (a[0] ?? "").toLowerCase();
  const all = (await call("GET", "animations/library")) as unknown as { action_id: number; name: string; category: string; sub_category: string; preview_url: string }[];
  for (const c of all) if (`${c.name} ${c.category} ${c.sub_category}`.toLowerCase().includes(word)) console.log(`${c.action_id}\t${c.name}\t${c.category}/${c.sub_category}\t${c.preview_url}`);
} else if (cmd === "image" && a[1]) {
  fs.mkdirSync(a[1], { recursive: true });
  const ext = path.extname(a[0]!).slice(1).replace("jpg", "jpeg");
  const picture = `data:image/${ext};base64,${fs.readFileSync(a[0]!).toString("base64")}`;
  const body = { image_url: picture, ai_model: "latest", should_texture: true, enable_pbr: true, pose_mode: "t-pose", target_formats: ["glb"], ...(a[2] ? JSON.parse(a[2]) as object : {}) };
  const { result } = await call("POST", "image-to-3d", body);
  const t = await wait("image-to-3d", result as string);
  await download((t.model_urls as { glb: string }).glb, path.join(a[1], "model.glb"));
  console.log(`image-to-3d: ${result}`);
} else if (cmd === "rig" && a[1]) {
  fs.mkdirSync(a[1], { recursive: true });
  const glb = fs.readFileSync(a[0]!).toString("base64");
  const { result } = await call("POST", "rigging", { model_url: `data:application/octet-stream;base64,${glb}`, height_meters: Number(a[2] ?? 1.7) });
  const t = await wait("rigging", result as string);
  const r = t.result as { rigged_character_glb_url: string; basic_animations: { walking_glb_url: string; running_glb_url: string } };
  await download(r.rigged_character_glb_url, path.join(a[1], "rigged.glb"));
  await download(r.basic_animations.walking_glb_url, path.join(a[1], "walking.glb"));
  await download(r.basic_animations.running_glb_url, path.join(a[1], "running.glb"));
  console.log(`rig: ${result}`);
} else if (cmd === "animate" && a.length >= 3) {
  fs.mkdirSync(a[1]!, { recursive: true });
  const ids = a.slice(2).map(Number);
  const { result } = await call("POST", "animations", ids.length === 1 ? { rig_task_id: a[0], action_id: ids[0] } : { rig_task_id: a[0], action_ids: ids });
  const t = await wait("animations", result as string);
  await download((t.result as { animation_glb_url: string }).animation_glb_url, path.join(a[1]!, `library_${ids.join("_")}.glb`));
} else if (cmd === "motion" && a.length >= 3 && process.env.RIG) {
  fs.mkdirSync(a[0]!, { recursive: true });
  const { result } = await call("POST", "text-to-motion", { prompt: a.slice(2).join(" "), duration: Number(a[1]), mode: "prime" });
  await wait("text-to-motion", result as string);
  const applied = await call("POST", "animations", { rig_task_id: process.env.RIG, motion_task_id: result });
  const t = await wait("animations", applied.result as string);
  await download((t.result as { animation_glb_url: string }).animation_glb_url, path.join(a[0]!, `motion_${result}.glb`));
} else if (cmd === "task" && a[1]) console.log(JSON.stringify(await call("GET", `${a[0]}/${a[1]}`), null, 2));
else {
  console.log("node apps/web/scripts/meshy.ts balance | library [parola] | image <immagine> <cartella> [json] | rig <modello.glb> <cartella> [altezza] | animate <rig> <cartella> <id...> | RIG=<rig> motion <cartella> <secondi> \"<testo>\" | task <tipo> <id>");
  process.exit(1);
}

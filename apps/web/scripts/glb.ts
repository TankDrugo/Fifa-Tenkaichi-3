// The GLB of a character, from Meshy's files to the one the game loads (docs/PERSONAGGI.md):
//   info <file.glb>            meshes, triangles, materials, textures, bones and clips, read from the file
//   build <out.glb> <base.glb> [<clips.glb>[:<clip>=<name>] ...] [--texture 2048] [--triangles 6000]
//     the base's mesh, skeleton and clips, plus the clips of the other files moved onto the base's
//     bones by name (Meshy gives one file per task, all on the same rig); a clip can be renamed with
//     :old=new. --texture brings every texture to that side at most, in WebP; --triangles lets
//     meshoptimizer take the mesh down to about that many triangles. Unused data is dropped.
// Nothing here knows a skeleton: bones are matched by the names the files carry.
import fs from "node:fs";
import { Document, NodeIO, type Animation, type Node } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune, resample, simplify, textureCompress, weld } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const args = process.argv.slice(2);
const flag = (k: string): number | null => {
  const i = args.indexOf(k);
  if (i < 0) return null;
  const v = Number(args[i + 1]);
  args.splice(i, 2);
  return v;
};

function triangles(doc: Document): number {
  let n = 0;
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) {
    const idx = p.getIndices();
    n += (idx ? idx.getCount() : p.getAttribute("POSITION")!.getCount()) / 3;
  }
  return n;
}

async function info(file: string): Promise<void> {
  const doc = await io.read(file);
  const root = doc.getRoot();
  console.log(`${file}: ${(fs.statSync(file).size / 1e6).toFixed(1)} MB, ${triangles(doc)} triangoli`);
  for (const m of root.listMeshes()) for (const p of m.listPrimitives())
    console.log(`  mesh ${m.getName()}: ${p.getAttribute("POSITION")!.getCount()} vertici, materiale ${p.getMaterial()?.getName() ?? "-"}`);
  for (const t of root.listTextures()) {
    const size = t.getSize();
    console.log(`  texture ${t.getName()}: ${t.getMimeType()}, ${size ? size.join(" × ") : "?"}, ${(t.getImage()!.byteLength / 1e6).toFixed(2)} MB`);
  }
  for (const s of root.listSkins()) console.log(`  ossa (${s.listJoints().length}): ${s.listJoints().map((j) => j.getName()).join(", ")}`);
  for (const a of root.listAnimations()) {
    const end = Math.max(...a.listSamplers().map((s) => s.getInput()!.getMax([])[0]!));
    console.log(`  clip «${a.getName()}»: ${end.toFixed(3)} s, ${a.listChannels().length} canali`);
  }
}

// Copies the clips of src onto the nodes of doc with the same names.
function moveClips(doc: Document, src: Document, rename: Map<string, string>, from: string): void {
  const byName = new Map<string, Node>();
  for (const n of doc.getRoot().listNodes()) byName.set(n.getName(), n);
  const buffer = doc.getRoot().listBuffers()[0]!;
  for (const a of src.getRoot().listAnimations()) {
    if (rename.size && !rename.has(a.getName())) continue;
    const name = rename.get(a.getName()) || a.getName();
    if (doc.getRoot().listAnimations().some((b) => b.getName() === name)) throw new Error(`${from}: la clip «${name}» c'è già, rinominala con :${a.getName()}=<nome>`);
    const out: Animation = doc.createAnimation(name);
    let missing = 0;
    for (const ch of a.listChannels()) {
      const target = byName.get(ch.getTargetNode()?.getName() ?? "");
      if (!target) { missing++; continue; }
      const s = ch.getSampler()!;
      const copy = (acc: NonNullable<ReturnType<typeof s.getInput>>) =>
        doc.createAccessor().setType(acc.getType()).setArray(acc.getArray()!.slice()).setBuffer(buffer);
      const sampler = doc.createAnimationSampler().setInterpolation(s.getInterpolation())
        .setInput(copy(s.getInput()!)).setOutput(copy(s.getOutput()!));
      out.addSampler(sampler).addChannel(doc.createAnimationChannel().setSampler(sampler).setTargetNode(target).setTargetPath(ch.getTargetPath()!));
    }
    if (missing) throw new Error(`${from}: ${missing} canali di «${a.getName()}» muovono ossa che il file di base non ha`);
  }
}

const side = flag("--texture"), target = flag("--triangles");

async function build(out: string, base: string, extra: string[]): Promise<void> {
  const doc = await io.read(base);
  for (const e of extra) {
    const [file, spec] = e.split(":");
    const rename = new Map<string, string>();
    if (spec) { const [a, b] = spec.split("="); rename.set(a!, b ?? a!); }
    moveClips(doc, await io.read(file!), rename, file!);
  }
  const before = triangles(doc);
  await MeshoptSimplifier.ready;
  const steps = [dedup(), resample()];
  if (target && target < before) steps.push(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: target / before, error: 0.01, lockBorder: false }));
  if (side) steps.push(textureCompress({ encoder: sharp, targetFormat: "webp", resize: [side, side], quality: 88 }));
  steps.push(prune());
  await doc.transform(...steps);
  await io.write(out, doc);
  console.log(`${out}: ${before} → ${triangles(doc)} triangoli`);
  await info(out);
}

const [cmd, ...rest] = args;
if (cmd === "info") for (const f of rest) await info(f);
else if (cmd === "build" && rest.length >= 2) await build(rest[0]!, rest[1]!, rest.slice(2));
else {
  console.log("node apps/web/scripts/glb.ts info <file.glb> | build <out.glb> <base.glb> [<clips.glb>[:<clip>=<nome>] ...] [--texture 2048] [--triangles 6000]");
  process.exit(1);
}

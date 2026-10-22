// Every footballer on the pitch in one SkinnedMesh: the pieces of all the players (parts.ts) are
// merged into one geometry, each vertex tied to one bone of its player (rig.ts, 20 bones a
// player) and carrying its colour, its roughness, metalness and glow, and what the shader paints
// on it: the face (faces.ts) on the front of the head, the kit's pattern and the number on the
// shirt. So the whole cast costs one draw call and one more for the shadows, whatever hair, gear
// and bodies the players have (docs/PIANO-3D-ONLINE.md, section 4.6: at most 150 a frame).
//
// The material is three's standard one, smooth and glossy with a light on the edges, as Mario
// Strikers: Battle League shades its characters (Tancredi, 22/10/2026: "morbido e lucido").
import {
  Bone, BufferAttribute, BufferGeometry, Color, Matrix4, MeshStandardMaterial, Skeleton, SkinnedMesh,
  Uint16BufferAttribute,
} from "three";
import { makeBody, type Body } from "./body";
import { buildAtlases, EXPRESSIONS, NUMBER_COLUMNS, type Atlases } from "./faces";
import type { Design } from "./looks";
import { buildParts, REGION } from "./parts";
import { BONES_PER_PLAYER } from "./rig";

export const MAX_PLAYERS = 16;

export interface Cast {
  mesh: SkinnedMesh;
  designs: Design[];
  bodies: Body[];
  // 16 numbers a bone, BONES_PER_PLAYER bones a player: rig.ts writes here every frame
  bones: Float32Array;
  // the expression column (faces.ts, EXPRESSIONS) of each player
  expressions: Float32Array;
  time: { value: number };
  atlases: Atlases;
  triangles: number;
  commit(): void;
  dispose(): void;
}

const col = new Color(), top = new Color();

export function buildCast(designs: Design[]): Cast {
  const n = Math.min(designs.length, MAX_PLAYERS);
  const bodies = designs.slice(0, n).map((d) => makeBody(d.build));
  const pos: number[] = [], nor: number[] = [], colour: number[] = [], second: number[] = [], mat: number[] = [], proj: number[] = [], player: number[] = [], skin: number[] = [], index: number[] = [];
  for (let i = 0; i < n; i++) {
    const d = designs[i]!, b = bodies[i]!;
    const R = b.headR, cy = R * 0.95;
    const c2 = new Color(d.kit.second);
    for (const part of buildParts(d, b)) {
      const g = part.geo;
      if (!g.getAttribute("normal")) g.computeVertexNormals();
      const p = g.getAttribute("position"), nm = g.getAttribute("normal");
      const base = pos.length / 3;
      col.set(part.colour);
      if (part.top) top.set(part.top.colour);
      for (let v = 0; v < p.count; v++) {
        const x = p.getX(v), y = p.getY(v), z = p.getZ(v);
        pos.push(x, y, z); nor.push(nm.getX(v), nm.getY(v), nm.getZ(v));
        if (part.top) {
          const t = Math.max(0, Math.min(1, (y - part.top.from) / (part.top.to - part.top.from || 1)));
          colour.push(col.r + (top.r - col.r) * t, col.g + (top.g - col.g) * t, col.b + (top.b - col.b) * t);
        } else colour.push(col.r, col.g, col.b);
        second.push(c2.r, c2.g, c2.b);
        mat.push(part.rough, part.metal, part.glow, part.region);
        if (part.region === REGION.face) proj.push(0.5 + x / (2 * R), 0.5 + (y - cy) / (2 * R), z / R, 0);
        else if (part.region === REGION.shirt) proj.push(x / b.chestW, y / b.torso, z / b.chestD, d.kit.pattern);
        else proj.push(0, 0, 0, 0);
        player.push(i);
        skin.push(i * BONES_PER_PLAYER + part.bone);
      }
      if (g.index) for (let k = 0; k < g.index.count; k++) index.push(base + g.index.getX(k));
      else for (let k = 0; k < p.count; k++) index.push(base + k);
      g.dispose();
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array(nor), 3));
  geometry.setAttribute("color", new BufferAttribute(new Float32Array(colour), 3));
  geometry.setAttribute("aColor2", new BufferAttribute(new Float32Array(second), 3));
  geometry.setAttribute("aMat", new BufferAttribute(new Float32Array(mat), 4));
  geometry.setAttribute("aProj", new BufferAttribute(new Float32Array(proj), 4));
  geometry.setAttribute("aPlayer", new BufferAttribute(new Float32Array(player), 1));
  const si = new Uint16Array(skin.length * 4), sw = new Float32Array(skin.length * 4);
  skin.forEach((bone, k) => { si[k * 4] = bone; sw[k * 4] = 1; });
  geometry.setAttribute("skinIndex", new Uint16BufferAttribute(si, 4));
  geometry.setAttribute("skinWeight", new BufferAttribute(sw, 4));
  geometry.setIndex(pos.length / 3 > 65535 ? new BufferAttribute(new Uint32Array(index), 1) : new BufferAttribute(new Uint16Array(index), 1));
  geometry.computeBoundingSphere();

  const atlases = buildAtlases(designs.slice(0, n));
  const expressions = new Float32Array(MAX_PLAYERS);
  const time = { value: 0 };
  const material = castMaterial(atlases, expressions, time);
  // one bone object a matrix only to size the skeleton: the matrices are written by rig.ts, not
  // worked out from a hierarchy, so the skeleton's own update does nothing
  const bones = Array.from({ length: n * BONES_PER_PLAYER }, () => new Bone());
  const skeleton = new Skeleton(bones, bones.map(() => new Matrix4()));
  skeleton.computeBoneTexture();
  skeleton.update = () => {};
  const mesh = new SkinnedMesh(geometry, material);
  mesh.bind(skeleton, new Matrix4());
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return {
    mesh, designs: designs.slice(0, n), bodies, bones: skeleton.boneMatrices!, expressions, time, atlases,
    triangles: index.length / 3,
    commit() { skeleton.boneTexture!.needsUpdate = true; },
    dispose() { geometry.dispose(); material.dispose(); atlases.faces.dispose(); atlases.numbers.dispose(); skeleton.dispose(); },
  };
}

function castMaterial(atlases: Atlases, expressions: Float32Array, time: { value: number }): MeshStandardMaterial {
  const m = new MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0 });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      faceAtlas: { value: atlases.faces }, numberAtlas: { value: atlases.numbers },
      faceRows: { value: atlases.rows }, numberRows: { value: Math.ceil(atlases.rows / NUMBER_COLUMNS) },
      expr: { value: expressions }, castTime: time, rimStrength: { value: 0.55 },
    });
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>
        attribute vec3 aColor2; attribute vec4 aMat; attribute vec4 aProj; attribute float aPlayer;
        uniform float expr[${MAX_PLAYERS}];
        varying vec3 vColor2; varying vec4 vMat; varying vec4 vProj; varying vec2 vTile;`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        vColor2 = aColor2; vMat = aMat; vProj = aProj;
        vTile = vec2(expr[int(aPlayer + 0.5)], aPlayer);`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>
        uniform sampler2D faceAtlas; uniform sampler2D numberAtlas; uniform float faceRows; uniform float numberRows;
        uniform float castTime; uniform float rimStrength;
        varying vec3 vColor2; varying vec4 vMat; varying vec4 vProj; varying vec2 vTile;`)
      .replace("#include <roughnessmap_fragment>", "float roughnessFactor = vMat.x;")
      .replace("#include <metalnessmap_fragment>", "float metalnessFactor = vMat.y;")
      .replace("#include <color_fragment>", `#include <color_fragment>
        float kitGlow = 0.0;
        if (vMat.w > 0.5 && vMat.w < 1.5 && vProj.z > 0.15) {
          // the face, projected from the front of the head
          vec2 q = clamp(vProj.xy, 0.004, 0.996);
          vec4 f = texture2D(faceAtlas, vec2((vTile.x + q.x) / ${EXPRESSIONS.length}.0, 1.0 - (vTile.y + 1.0 - q.y) / faceRows));
          diffuseColor.rgb = mix(diffuseColor.rgb, f.rgb, f.a * step(0.0, vProj.x) * step(vProj.x, 1.0) * step(0.0, vProj.y) * step(vProj.y, 1.0));
        } else if (vMat.w > 1.5) {
          // the kit's pattern (packages/sim, Club.pattern) and the number on the back
          vec2 q = vProj.xy; float pat = vProj.w; float s = 0.0;
          if (pat > 0.5 && pat < 1.5) s = step(0.5, fract(q.x * 2.0 + 0.25));
          else if (pat < 2.5 && pat > 1.5) s = step(0.5, fract(q.y * 3.0 + 0.15));
          else if (pat < 3.5 && pat > 2.5) s = step(abs(q.x * 0.55 - (q.y - 0.5)), 0.14);
          else if (pat < 4.5 && pat > 3.5) { s = step(0.62, abs(q.x)); kitGlow = 0.22 + 0.16 * sin(castTime * 4.0); }
          else if (pat < 5.5 && pat > 4.5) s = step(0.0, q.x);
          else if (pat > 5.5) s = step(0.5, fract(q.y * 3.0 + abs(fract(q.x * 2.5) - 0.5) * 0.8));
          diffuseColor.rgb = mix(diffuseColor.rgb, vColor2, s);
          if (vProj.z < -0.25) {
            vec2 u = vec2((0.62 - q.x) / 1.24, (q.y - 0.3) / 0.58);
            if (u.x > 0.0 && u.x < 1.0 && u.y > 0.0 && u.y < 1.0) {
              float c = mod(vTile.y, ${NUMBER_COLUMNS}.0), r = floor(vTile.y / ${NUMBER_COLUMNS}.0);
              vec4 nb = texture2D(numberAtlas, vec2((c + u.x) / ${NUMBER_COLUMNS}.0, 1.0 - (r + 1.0 - u.y) / numberRows));
              diffuseColor.rgb = mix(diffuseColor.rgb, nb.rgb, nb.a);
            }
          }
        }`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        totalEmissiveRadiance += diffuseColor.rgb * (vMat.z + kitGlow);`)
      .replace("#include <opaque_fragment>", `
        float rimLight = pow(1.0 - saturate(dot(normalize(normal), normalize(vViewPosition))), 3.0);
        outgoingLight += diffuseColor.rgb * rimLight * rimStrength + vec3(rimLight * rimStrength * 0.25);
        #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => "cast-1";
  return m;
}

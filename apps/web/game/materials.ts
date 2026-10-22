// Materials of the scene. Mario Strikers: Battle League, the reference for the look, shades its
// characters smoothly with glossy highlights and a light on their edges, not in flat bands (its
// gear screens, docs/DETTAGLI.md, "Gioco nuovo · fase 2"): a standard material with a rim light
// added in the shader. The crowd's material moves the fans in the vertex shader, so a stand of
// two thousand people costs nothing on the processor.
import { Color, MeshStandardMaterial, type ColorRepresentation, type Texture } from "three";

export interface MaterialOptions {
  color?: ColorRepresentation;
  map?: Texture;
  roughness?: number;
  metalness?: number;
  rim?: number;            // strength of the light on the edges, 0 none
  crowd?: boolean;         // fans that bob and raise their arms
}

// the time the crowd shader reads, set once a frame (scene/Arena.tsx)
export const crowdTime = { value: 0 };

export function standardMaterial(o: MaterialOptions = {}): MeshStandardMaterial {
  const m = new MeshStandardMaterial({
    color: new Color(o.color ?? "#ffffff"),
    map: o.map ?? null,
    roughness: o.roughness ?? 0.6,
    metalness: o.metalness ?? 0,
  });
  const rim = o.rim ?? 0;
  if (!rim && !o.crowd) return m;
  m.onBeforeCompile = (shader) => {
    if (rim) {
      shader.uniforms.rimStrength = { value: rim };
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform float rimStrength;")
        .replace("#include <opaque_fragment>", `
          float rimLight = pow(1.0 - saturate(dot(normalize(normal), normalize(vViewPosition))), 3.0);
          outgoingLight += diffuseColor.rgb * rimLight * rimStrength + vec3(rimLight * rimStrength * 0.25);
          #include <opaque_fragment>`);
    }
    if (o.crowd) {
      shader.uniforms.crowdTime = crowdTime;
      // each fan bobs at its own pace from where it sits; the head goes up a little more
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float crowdTime;")
        .replace("#include <begin_vertex>", `
          #include <begin_vertex>
          #ifdef USE_INSTANCING
            float seed = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 2.3;
            float jump = max(0.0, sin(crowdTime * (3.0 + fract(seed) * 2.0) + seed * 6.0));
            transformed.y += jump * jump * 0.12 * step(0.1, position.y);
          #endif`);
    }
  };
  m.customProgramCacheKey = () => `std-${rim}-${o.crowd ? 1 : 0}`;
  return m;
}

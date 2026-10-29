// A GLB of game/animation/models.ts, loaded once with three's GLTFLoader through @react-three/fiber (the
// canvas waits for it with Suspense). The loader's cached scene stays as loaded: the page gets a
// copy carrying the clips in `animations` and the model's table of clips (models.ts) in
// userData.clips, where the player look layer (modelAppearance.ts) reads them; that copy is never
// drawn either, only the copies made from it.
import { useLoader } from "@react-three/fiber";
import { useMemo } from "react";
import type { Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { modelEntry, modelUrl } from "./models";

export function useModel(id: string): Object3D {
  const gltf = useLoader(GLTFLoader, modelUrl(id) ?? "");
  return useMemo(() => {
    const model = clone(gltf.scene);
    model.animations = gltf.animations;
    model.userData.clips = modelEntry(id)?.clips;
    return model;
  }, [gltf, id]);
}

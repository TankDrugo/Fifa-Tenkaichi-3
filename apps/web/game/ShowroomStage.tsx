"use client";
// The canvas of the showroom (showroom.ts), drawn only in the browser.
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo } from "react";
import type { Object3D, PerspectiveCamera } from "three";
import { ShowroomLoop, type ShowroomOptions } from "./showroom";
import { useModel } from "./useModel";

declare global {
  interface Window {
    // for the photos with Playwright (scripts/photos3.ts)
    // frozen: no more frames, so a photo does not wait for the software renderer
    // capture(): draws one frame and returns it as a JPEG, read in the same task as the drawing
    __ft3show?: { loop: ShowroomLoop; frames: number; frozen?: boolean; capture: (quality?: number) => string };
  }
}

function WithModel({ options }: { options: ShowroomOptions }) {
  return <World options={options} model={useModel(options.model)} />;
}

function World({ options, model }: { options: ShowroomOptions; model?: Object3D }) {
  const { gl, scene, camera, size } = useThree();
  const loop = useMemo(() => new ShowroomLoop(gl, scene, camera as PerspectiveCamera, options, model), [gl, scene, camera, options, model]);
  useEffect(() => {
    const start = performance.now();
    window.__ft3show = {
      loop, frames: 0,
      capture: (quality = 0.9) => { loop.frame((performance.now() - start) / 1000, 0); return gl.domElement.toDataURL("image/jpeg", quality); },
    };
    return () => { loop.dispose(); delete window.__ft3show; };
  }, [loop, gl]);
  useEffect(() => { loop.resize(size.width, size.height); }, [loop, size]);
  useFrame((state, delta) => {
    const w = window.__ft3show;
    if (w?.frozen) return;
    loop.frame(state.clock.elapsedTime, delta);
    if (w) w.frames++;
  }, 1);
  return <primitive object={loop.root} />;
}

export function ShowroomStage({ options }: { options: ShowroomOptions }) {
  return (
    <Canvas dpr={[1, 1.5]} shadows="percentage" flat gl={{ antialias: false, powerPreference: "high-performance", stencil: false }} camera={{ fov: 26, near: 0.5, far: 400 }} style={{ position: "absolute", inset: 0 }}>
      <Suspense fallback={null}>
        {options.model ? <WithModel options={options} /> : <World options={options} />}
      </Suspense>
    </Canvas>
  );
}

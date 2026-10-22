"use client";
// The 3D match: packages/sim plays, this draws it with @react-three/fiber. One frame: the
// simulation advances by the real time gone (driver.ts), the players and the ball take their
// places between its last two steps, the camera follows the ball, the scene is drawn with its
// shadows and the post-processing, and /bench gets the frame's numbers (stats.ts).
//
// Camera, light and post-processing follow Mario Strikers: Battle League's matches
// (docs/DETTAGLI.md, "Gioco nuovo · fase 2"): a fixed camera on the near side looking down about
// 29 degrees through a long lens, the sun high behind the far side so the shadows fall toward the
// camera, light bloom on the lights.
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import type { PerspectiveCamera } from "three";
import { StageLoop } from "./loop";
import type { FrameStats } from "./stats";
import type { StageOptions } from "./options";

export function Stage({ options, stats, onLoop }: { options: StageOptions; stats: FrameStats; onLoop?: (l: StageLoop) => void }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      shadows="percentage"
      flat
      gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
      camera={{ fov: options.fovDeg, near: 2, far: 400, position: [0, 15, 27] }}
      style={{ position: "absolute", inset: 0 }}
    >
      <World options={options} stats={stats} onLoop={onLoop} />
    </Canvas>
  );
}

function World({ options, stats, onLoop }: { options: StageOptions; stats: FrameStats; onLoop?: (l: StageLoop) => void }) {
  const { gl, scene, camera, size } = useThree();
  const loop = useMemo(() => new StageLoop(gl, scene, camera as PerspectiveCamera, options, stats), [gl, scene, camera, options, stats]);
  useEffect(() => { onLoop?.(loop); return () => loop.dispose(); }, [loop, onLoop]);
  useEffect(() => { loop.resize(size.width, size.height); }, [loop, size]);
  useFrame((state, delta) => loop.frame(state.clock.elapsedTime, delta), 1);
  return <primitive object={loop.root} />;
}

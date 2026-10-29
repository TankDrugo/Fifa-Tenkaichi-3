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
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Group, type Object3D, type PerspectiveCamera } from "three";
import { StageLoop } from "../core/loop";
import { useModel } from "../animation/useModel";
import type { FrameStats } from "../core/stats";
import type { StageOptions } from "../core/options";

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
      <Suspense fallback={null}>
        {options.model ? <WithModel options={options} stats={stats} onLoop={onLoop} /> : <World options={options} stats={stats} onLoop={onLoop} />}
      </Suspense>
    </Canvas>
  );
}

type WorldProps = { options: StageOptions; stats: FrameStats; onLoop?: (l: StageLoop) => void; model?: Object3D };

// the match waits for the GLB (Suspense) and is then built with it
function WithModel(props: WorldProps) {
  return <World {...props} model={useModel(props.options.model)} />;
}

// The loop is made in an effect, not in a memo: React's development mode runs every effect twice
// on the first mount, and a memoised loop went on drawing after its cleanup had disposed of its
// players and its post-processing (the canvas stood still, the players were gone). The scene
// holds a group that takes the root of whichever loop is alive.
function World({ options, stats, onLoop, model }: WorldProps) {
  const { gl, scene, camera, size } = useThree();
  const get = useThree((s) => s.get);
  const holder = useMemo(() => new Group(), []);
  const loop = useRef<StageLoop | null>(null);
  useEffect(() => {
    const l = new StageLoop(gl, scene, camera as PerspectiveCamera, options, stats, model);
    const now = get().size;
    l.resize(now.width, now.height);
    holder.add(l.root);
    loop.current = l;
    const stop = l.listen();
    onLoop?.(l);
    return () => { stop(); holder.remove(l.root); loop.current = null; l.dispose(); };
  }, [gl, scene, camera, options, stats, model, onLoop, get, holder]);
  useEffect(() => { loop.current?.resize(size.width, size.height); }, [size]);
  useFrame((state, delta) => loop.current?.frame(state.clock.elapsedTime, delta), 1);
  return <primitive object={holder} />;
}

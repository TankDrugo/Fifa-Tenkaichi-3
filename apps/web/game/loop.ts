// One frame of the 3D match, outside React: the simulation advances by the real time gone
// (driver.ts), the players and the ball take their places between its last two steps, the camera
// follows the ball, the scene is drawn with its shadows and the post-processing, and /bench gets the
// frame's numbers (stats.ts). Stage.tsx makes one and calls frame() from useFrame.
import { BloomEffect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode, VignetteEffect } from "postprocessing";
import {
  DirectionalLight, Group, HalfFloatType, HemisphereLight, PMREMGenerator, Vector2, Vector3,
  type Object3D, type PerspectiveCamera, type Scene, type Texture, type WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { C } from "@ft3/sim";
import { buildArena } from "./arena";
import { Driver } from "./driver";
import { crowdTime } from "./materials";
import { buildActors, matchDesigns, teamKits, type Actors } from "./players";
import type { StageOptions } from "./options";
import type { FrameStats } from "./stats";
import { DAY } from "./style";

// The light and the finish of every 3D page: a sky light, the sun with one shadow map of 2048
// (docs/PIANO-3D-ONLINE.md, 4.6), reflections from three's own room made once on the graphics card,
// bloom at half resolution, a light vignette and the tone mapping.
export interface Look {
  sun: DirectionalLight;
  composer: EffectComposer;
  dispose(): void;
}

export function createLook(gl: WebGLRenderer, scene: Scene, camera: PerspectiveCamera, root: Object3D): Look {
  root.add(new HemisphereLight(DAY.hemiSky, DAY.hemiGround, 0.8));
  const sun = new DirectionalLight(DAY.sun, 3.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -19, right: 19, top: 14, bottom: -14, near: 8, far: 70 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  root.add(sun, sun.target);
  const pmrem = new PMREMGenerator(gl);
  const env: Texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.environment = env;
  scene.environmentIntensity = 0.45;
  const composer = new EffectComposer(gl, { frameBufferType: HalfFloatType });
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new BloomEffect({ mipmapBlur: true, luminanceThreshold: 0.9, luminanceSmoothing: 0.15, intensity: 0.7, resolutionScale: 0.5 });
  composer.addPass(new EffectPass(camera, bloom, new VignetteEffect({ offset: 0.32, darkness: 0.32 }), new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL })));
  // renderer.info over the whole frame, not only its last pass
  gl.info.autoReset = false;
  return { sun, composer, dispose() { composer.dispose(); env.dispose(); } };
}

export class StageLoop {
  readonly root = new Group();
  readonly driver: Driver;
  private actors: Actors;
  private sun: DirectionalLight;
  private look: Look;
  private followX = 0;
  private ready = false;
  private target = new Vector3();
  private buffer = new Vector2();
  private gl: WebGLRenderer;
  private scene: Scene;
  private camera: PerspectiveCamera;
  private options: StageOptions;
  private stats: FrameStats;

  constructor(gl: WebGLRenderer, scene: Scene, camera: PerspectiveCamera, options: StageOptions, stats: FrameStats) {
    this.gl = gl; this.scene = scene; this.camera = camera; this.options = options; this.stats = stats;
    this.driver = new Driver(options.home, options.away, options.seed);
    this.driver.skip(options.skip);
    this.root.add(buildArena().group);
    const m = this.driver.match;
    this.actors = buildActors(matchDesigns(m, teamKits(this.driver.colours[0], this.driver.colours[1]), [options.home, options.away], options.style));
    this.root.add(this.actors.group);
    // the sun high behind the far side, so the shadows fall toward the camera as in the reference
    this.look = createLook(gl, scene, camera, this.root);
    this.sun = this.look.sun;
    camera.fov = options.fovDeg;
    camera.updateProjectionMatrix();
  }

  resize(width: number, height: number): void { this.look.composer.setSize(width, height); }

  frame(time: number, delta: number): void {
    const o = this.options;
    if (!o.paused) this.driver.advance(delta);
    this.actors.update(this.driver, time, o.paused ? 0 : delta);
    // the crowd moves at half the frame rate, as in the reference
    crowdTime.value = Math.floor(time * 30) / 30;

    // The camera: fixed angle and lens, as far back as the span across the middle of the screen
    // asks for this window's shape; it follows the ball along the pitch and stops where the goal
    // line and 2 m beyond it reach the edge of the screen.
    const cam = this.camera;
    const v = (o.fovDeg * Math.PI) / 180, p = (o.pitchDeg * Math.PI) / 180;
    const dist = o.spanM / (2 * Math.tan(v / 2) * cam.aspect);
    const b = this.driver.match.ball, lead = b.x + b.vx * 0.25;
    const maxX = Math.max(0, C.length / 2 + 2 - o.spanM / 2);
    const fp = o.focus >= 0 ? this.driver.match.players[o.focus] : undefined;
    const want = fp ? fp.x : Math.max(-maxX, Math.min(maxX, lead));
    this.followX = this.ready ? this.followX + (want - this.followX) * (1 - Math.exp(-2.5 * delta)) : want;
    this.ready = true;
    const aimZ = fp ? fp.z + o.aimZ : o.aimZ, aimY = fp ? 0.4 : 0;
    this.target.set(this.followX, aimY, aimZ);
    cam.position.set(this.followX, aimY + Math.sin(p) * dist, aimZ + Math.cos(p) * dist);
    cam.lookAt(this.target);
    this.sun.target.position.set(this.followX * 0.5, 0, 0);
    this.sun.position.set(this.followX * 0.5 + 11, 26, -15);

    const gl = this.gl;
    gl.info.reset();
    if (o.post) this.look.composer.render(delta); else gl.render(this.scene, cam);
    const r = gl.info.render, size = gl.getDrawingBufferSize(this.buffer);
    this.stats.frame(delta, { calls: r.calls, triangles: r.triangles, geometries: gl.info.memory.geometries, textures: gl.info.memory.textures, programs: gl.info.programs?.length ?? 0, width: size.x, height: size.y, dpr: gl.getPixelRatio() });
  }

  dispose(): void {
    this.look.dispose();
    this.actors.dispose();
  }
}

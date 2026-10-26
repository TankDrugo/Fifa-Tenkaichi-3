// The showroom: a team's five footballers in a line on the pitch, for the photos Tancredi chooses the
// characters' style on (scripts/photos3.ts) and for the contact sheets of the moves. Same stadium,
// same materials and finish as the match (loop.ts, createLook); the sun is in front of the line so
// the faces are lit, as on a team's presentation screen.
import { Group, type Object3D, type PerspectiveCamera, type Scene, type WebGLRenderer } from "three";
import { clubById, clubSquad, type Club } from "@ft3/sim";
import { createAppearance, newFrame, type Appearance } from "./appearance";
import { buildArena } from "./arena";
import type { Expression } from "./faces";
import { createLook, type Look } from "./loop";
import { designFor, type Design, type Style } from "./looks";
import { teamKits } from "./players";

export interface ShowroomOptions {
  team: string;
  style: Style;
  back: boolean;              // seen from behind: the numbers
  expression: Expression | "";
  model: string;              // a model of game/models.ts, "" for the pieces in code
}

export function teamDesigns(club: Club, style: Style): Design[] {
  // the keeper in the colour the match would give him against a grey opponent
  const kits = teamKits({ kit: club.kit, second: club.kit2 || club.alt }, { kit: "#808080", second: "#808080" })[0]!;
  return clubSquad(club).map((card, slot) => designFor(card, club, kits[slot]!, style, slot === 0, slot));
}

// left to right: defender, midfielder, keeper in the middle, winger, striker
const ORDER = [1, 2, 0, 3, 4];

export class ShowroomLoop {
  readonly root = new Group();
  readonly players: Appearance;
  private designs: Design[];
  private look: Look;
  private gl: WebGLRenderer;
  private camera: PerspectiveCamera;
  private options: ShowroomOptions;
  private pose = newFrame();

  constructor(gl: WebGLRenderer, scene: Scene, camera: PerspectiveCamera, options: ShowroomOptions, model?: Object3D) {
    this.gl = gl; this.camera = camera; this.options = options;
    const club = clubById(options.team) ?? clubById("fulmini")!;
    this.root.add(buildArena().group);
    this.designs = teamDesigns(club, options.style);
    this.players = createAppearance(this.designs, model);
    this.root.add(this.players.object);
    this.look = createLook(gl, scene, camera, this.root);
    const sun = this.look.sun, z = options.back ? -1 : 1;
    sun.position.set(-3.5, 7, 6 * z);
    sun.target.position.set(0, 0, 0);
    Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 30 });
    sun.shadow.camera.updateProjectionMatrix();
    camera.fov = 26;
    camera.near = 0.5;
    camera.position.set(0, 0.62, 4.7 * z);
    camera.lookAt(0, 0.43, 0);
    camera.updateProjectionMatrix();
  }

  resize(width: number, height: number): void { this.look.composer.setSize(width, height); }

  frame(time: number, delta: number): void {
    const players = this.players, p = this.pose, o = this.options;
    this.designs.slice(0, players.count).forEach((d, i) => {
      const k = ORDER.indexOf(i), x = (k - 2) * 0.74, z = -Math.abs(k - 2) * 0.22;
      // facing the camera, turned a little toward the middle of the line
      const turn = (o.back ? Math.PI : 0) - (k - 2) * 0.12 * (o.back ? -1 : 1);
      p.x = x; p.z = z; p.fx = Math.sin(turn); p.fz = Math.cos(turn); p.height = d.height; p.time = time + i * 0.9;
      p.lookYaw = o.back ? 0 : (k - 2) * 0.1;
      const beat = (time + i * 1.37) % (3.1 + (i % 4) * 0.45);
      p.expression = o.expression || (beat < 0.12 ? "blink" : "neutral");
      players.set(i, p);
    });
    players.commit(time);
    this.gl.info.reset();
    this.look.composer.render(delta);
  }

  dispose(): void { this.look.dispose(); this.players.dispose(); }
}

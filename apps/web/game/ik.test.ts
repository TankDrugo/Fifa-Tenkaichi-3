// The inverse kinematics reach what they are asked: a foot on a point, a hand on the ball.
import { describe, expect, it } from "vitest";
import { Euler, Vector3 } from "three";
import { FIGURE_BUILD, hipHeight, makeBody } from "./body.ts";
import { anklePosition, armIK, legIK, wristPosition } from "./ik.ts";
import { J, newJoints } from "./rig.ts";

function draws(seed: number) { let a = seed; return () => { a = (a * 1103515245 + 12345) % 2147483648; return a / 2147483648; }; }

describe("cinematica inversa", () => {
  for (const fig of ["", "spillo", "barile", "roccia"]) {
    const b = makeBody(FIGURE_BUILD[fig] ?? {});
    it(`gamba (${fig || "classico"}): 300 punti entro la sua lunghezza, tutti raggiunti`, () => {
      const r = draws(7), j = newJoints(), t = new Vector3();
      let worst = 0, reached = 0;
      for (let k = 0; k < 300; k++) {
        j.fill(0);
        j[J.pelvisX] = (r() - 0.5) * 0.8; j[J.pelvisY] = (r() - 0.5) * 0.6; j[J.pelvisZ] = (r() - 0.5) * 0.6; j[J.offY] = -r() * 0.05;
        const s = k % 2, twist = (r() - 0.5) * 0.8;
        // a point within the leg's length, below the hip and up to 60 degrees off the vertical
        const side = s === 0 ? 1 : -1, len = (b.thigh + b.shin) * (0.55 + 0.4 * r()), a = r() * Math.PI * 2, off = r() * 1.05;
        t.set(Math.cos(a) * Math.sin(off), -Math.cos(off), Math.sin(a) * Math.sin(off)).multiplyScalar(len)
          .add(new Vector3(-side * b.hipW, -0.02, 0).applyEuler(new Euler(j[J.pelvisX], j[J.pelvisY], j[J.pelvisZ], "ZXY")))
          .add(new Vector3(0, hipHeight(b) + j[J.offY]!, 0));
        // out of reach the leg stretches toward the point: the gap is what legIK reports
        const miss = legIK(j, b, s, t, twist);
        worst = Math.max(worst, Math.abs(anklePosition(j, b, s).distanceTo(t) - miss));
        if (miss < 1e-6) reached++;
      }
      expect(worst).toBeLessThan(1e-9);
      expect(reached).toBe(300);
    });
    it(`braccio (${fig || "classico"}): 300 punti raggiungibili, scarto sotto 1e-6`, () => {
      const r = draws(11), j = newJoints(), t = new Vector3();
      let worst = 0;
      for (let k = 0; k < 300; k++) {
        j.fill(0);
        j[J.pelvisX] = (r() - 0.5) * 0.8; j[J.chestY] = (r() - 0.5) * 0.6; j[J.chestX] = (r() - 0.5) * 0.4;
        const s = k % 2, side = s === 0 ? 1 : -1;
        const sh = new Vector3(-side * b.shoulderW, 0, 0);
        const dir = new Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
        // from the shoulder's place, at 40-95% of the arm's length
        const reach = (b.upperArm + b.forearm) * (0.4 + 0.55 * r());
        j.fill(0);
        const shoulder = wristPosition(j, b, s, new Vector3()).add(new Vector3(0, b.upperArm + b.forearm, 0));
        t.copy(shoulder).add(sh.set(0, 0, 0)).addScaledVector(dir, reach);
        armIK(j, b, s, t);
        worst = Math.max(worst, wristPosition(j, b, s).distanceTo(t));
      }
      expect(worst).toBeLessThan(1e-6);
    });
  }
});

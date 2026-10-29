// One person's commands for the practice of /prova (practice.ts), from the keyboard and the first
// pad, with the old game's keys and its "classic" pad layout (its input.js): WASD or the arrows
// to run, Shift to sprint, J pass, K shoot, L feint, U modifier, Q switch, Space special; on the
// pad the left stick or the cross, A pass, X shoot, B feint, Y special, LB modifier, RB switch, RT
// sprint, the right stick for the skill moves. A key tapped and released between two steps of the
// simulation still counts once: it stays pressed until the match calls clearTaps().
import type { Command } from "@ft3/sim";

const KEYS = {
  up: ["KeyW", "ArrowUp"], down: ["KeyS", "ArrowDown"], left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"],
  sprint: ["ShiftLeft", "ShiftRight"], pass: ["KeyJ"], shoot: ["KeyK"], feint: ["KeyL"], mod: ["KeyU"], switch: ["KeyQ"],
  special: ["Space"],
} as const;
// standard mapping of the Gamepad API (https://w3c.github.io/gamepad/#remapping)
const PAD = { a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, rt: 7, up: 12, down: 13, left: 14, right: 15 } as const;
const DEAD = 0.2;

export interface Input {
  read(): Command;
  clearTaps(): void;
  // starts listening to the keyboard; the function returned stops it
  listen(): () => void;
}

export function createInput(target: Window): Input {
  const held = new Set<string>(), tapped = new Set<string>();
  const used = new Set<string>(Object.values(KEYS).flat());
  const down = (e: KeyboardEvent) => {
    if (!used.has(e.code)) return;
    e.preventDefault();
    held.add(e.code); tapped.add(e.code);
  };
  const up = (e: KeyboardEvent) => { held.delete(e.code); };
  const blur = () => held.clear();
  const key = (k: keyof typeof KEYS, taps = true) => KEYS[k].some((c) => held.has(c) || (taps && tapped.has(c)));

  return {
    read() {
      const out: Command = { x: 0, z: 0, rx: 0, rz: 0, skill: 0, sprint: false, pass: false, shoot: false, feint: false, switch: false, mod: false, special: false };
      out.x = (key("right", false) ? 1 : 0) - (key("left", false) ? 1 : 0);
      out.z = (key("down", false) ? 1 : 0) - (key("up", false) ? 1 : 0);
      out.sprint = key("sprint", false); out.mod = key("mod", false);
      out.pass = key("pass"); out.shoot = key("shoot"); out.feint = key("feint"); out.switch = key("switch"); out.special = key("special");
      const pad = Array.from(target.navigator.getGamepads?.() ?? []).find((p) => p && p.connected);
      if (pad) {
        const b = (i: number) => (pad.buttons[i]?.value ?? 0) > 0.5;
        let ax = pad.axes[0] ?? 0, az = pad.axes[1] ?? 0;
        if (b(PAD.left)) ax = -1; if (b(PAD.right)) ax = 1; if (b(PAD.up)) az = -1; if (b(PAD.down)) az = 1;
        const m = Math.hypot(ax, az);
        if (m > DEAD) { const s = Math.min(1, (m - DEAD) / 0.7) / m; out.x += ax * s; out.z += az * s; }
        out.pass ||= b(PAD.a); out.shoot ||= b(PAD.x); out.feint ||= b(PAD.b); out.special ||= b(PAD.y);
        out.mod ||= b(PAD.lb); out.switch ||= b(PAD.rb); out.sprint ||= (pad.buttons[PAD.rt]?.value ?? 0) > 0.3;
        const rx = pad.axes[2] ?? 0, rz = pad.axes[3] ?? 0;
        if (Math.hypot(rx, rz) > DEAD) { out.rx = rx; out.rz = rz; }
      }
      const m = Math.hypot(out.x, out.z);
      if (m > 1) { out.x /= m; out.z /= m; }
      return out;
    },
    clearTaps() { tapped.clear(); },
    listen() {
      target.addEventListener("keydown", down);
      target.addEventListener("keyup", up);
      target.addEventListener("blur", blur);
      return () => {
        target.removeEventListener("keydown", down);
        target.removeEventListener("keyup", up);
        target.removeEventListener("blur", blur);
        held.clear();
      };
    },
  };
}

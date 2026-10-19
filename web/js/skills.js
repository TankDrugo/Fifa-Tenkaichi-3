// Strike Legends (browser) - skill moves: the right stick's gestures as in EA FC, the keys 1-9 on
// the keyboard, what each move does to the ball and to the defenders in front (docs/DETTAGLI.md,
// "Skill"). Drawn with the sheets that exist (run turned on the spot, pass, the ball's arc) until
// the moves get clips of their own.
"use strict";

(function () {
  const SL = window.SL, C = SL.C, M = SL.Match.prototype, DT = 1 / 60;
  const len = (x, z) => Math.hypot(x, z);

  // stars: EA FC 25's rating for the same move where it has one; dur: seconds the move takes.
  // A defender within FOOL_RANGE in front stays wrong-footed FOOL[stars] seconds (ai.js skips his
  // think and his tackles meanwhile), and his shoulder hit waits HIT_DELAY more: the hit reaches
  // 2 m (7,2 m/s for 0,28 s, match.js), so a fake without it lost the ball as soon as it ended.
  const SKILLS = {
    tunnel: { name: "Tunnel", stars: 1, dur: 0.3, gesture: "colpo avanti", key: 1 },
    dragback: { name: "Trascinamento", stars: 1, dur: 0.3, gesture: "colpo indietro", key: 2 },
    feint: { name: "Finta di corpo", stars: 2, dur: 0.22, gesture: "colpo a sinistra o a destra", key: 3 },
    stepover: { name: "Doppio passo", stars: 2, dur: 0.32, gesture: "quarto di giro da avanti a un lato", key: 4 },
    roll: { name: "Rullata", stars: 2, dur: 0.6, gesture: "tenuta a un lato", key: 5 },
    heelchop: { name: "Colpo di tacco", stars: 3, dur: 0.2, gesture: "quarto di giro da dietro a un lato", key: 6 },
    roulette: { name: "Roulette", stars: 3, dur: 0.45, gesture: "giro completo", key: 7 },
    sombrero: { name: "Sombrero", stars: 4, dur: 0.35, gesture: "colpo indietro, poi avanti", key: 8 },
    elastico: { name: "Elastico", stars: 5, dur: 0.35, gesture: "mezzo giro da un lato all'altro passando dietro", key: 9 },
  };
  const FOOL = [0, 0.35, 0.45, 0.55, 0.7, 0.8], HIT_DELAY = 0.5;
  for (const k in SKILLS) SKILLS[k].fool = FOOL[SKILLS[k].stars];
  // the ball goes behind him: he has to turn, whatever the move's stars
  SKILLS.tunnel.fool = 0.8;
  const FOOL_RANGE = 2.2, COOL = 0.35;
  // A defender of the AI falls for a move with chance 0,35 + 0,1 a star, less his team's
  // wariness (ai.js, SKILL: -0,1 easy, +0,1 hard); a person's defender reads the move himself.
  const biteChance = (m, o, stars) => Math.max(0.2, Math.min(0.9, 0.35 + 0.1 * stars - ((SL.AI && SL.AI.skillOf(m, o.team).wary) || 0)));
  SL.SKILLS = SKILLS;

  // A card's skill stars, 1-5: the rating, the role (wingers and strikers dribble, defenders
  // less), a half star for legends and lore players; keepers 1.
  SL.skillStars = function (card) {
    if (!card) return 2;
    if (card.role === "POR") return 1;
    const role = { ALA: 1, ATT: 0.5, CEN: 0, DIF: -1 }[card.role] || 0;
    const rare = card.rarity === "leggenda" || card.rarity === "mito" ? 0.5 : 0;
    return Math.max(1, Math.min(5, Math.round((card.ovr - 50) / 10 + role + rare)));
  };

  // ---- Starting a move ---------------------------------------------------------------------
  // side: +1 to the player's right, -1 to his left (facing (fx, fz), right = (-fz, fx)).
  M.trySkill = function (p, id, side) {
    const sk = SKILLS[id], b = this.ball;
    if (!sk || b.carrier !== p || p.isKeeper || p.skill || (p.skillCool || 0) > 0 || this.special || this.phase !== "live") return false;
    if (p.react > 0 || p.recovery > 0 || p.feintT >= 0 || p.charge >= 0 || p.passCharge >= 0) return false;
    if (SL.skillStars(p.card) < sk.stars) { if (p.human >= 0) this.say(`${sk.name}: serve un giocatore da ${sk.stars} stelle`, 1.0); return false; }
    const f = [p.fx, p.fz], r = [-p.fz, p.fx];
    side = side || (this.rng() < 0.5 ? -1 : 1);
    // the roulette turns him round the defender, half forward and half to `side`
    const rd = [f[0] + r[0] * side * 0.8, f[1] + r[1] * side * 0.8], rl = len(rd[0], rd[1]);
    p.skill = { id, t: 0, side, f, r, a0: Math.atan2(p.fz, p.fx), dir: [rd[0] / rl, rd[1] / rl] };
    p.skillCool = sk.dur + COOL;
    // The defenders in front read the fake: they lean the way it points, or stand planted.
    // Feint and roll go to `side`, so the lean is the other way; stepover and elastico show `side`
    // first and go the other way.
    const lean = id === "feint" || id === "roll" ? -side : id === "stepover" || id === "elastico" ? side : 0;
    for (const o of this.players) {
      if (o.team === p.team || o.isKeeper) continue;
      const dx = o.x - p.x, dz = o.z - p.z, d = len(dx, dz);
      if (d > FOOL_RANGE || (dx * f[0] + dz * f[1]) / (d || 1) < -0.3) continue;
      if (!o.ai || this.rng() > biteChance(this, o, sk.stars)) continue;
      o.fooled = sk.fool; o.foolDir = [r[0] * lean, r[1] * lean];
      o.hitCool = Math.max(o.hitCool, sk.fool + HIT_DELAY); o.slideCool = Math.max(o.slideCool || 0, this.clock + sk.fool + HIT_DELAY);
      // the ball goes through his legs or over his head: he cannot trap it on its way
      if (id === "tunnel" || id === "sombrero") o.pickupLock = Math.max(o.pickupLock, sk.fool + 0.2);
    }
    if (id === "tunnel") this.knockOn(p, f, 7.5, 0);
    // the sombrero lifts the ball at the contact of its swing (stepSkill)
    if (id === "heelchop") {
      const nf = [r[0] * side, r[1] * side], sp = Math.max(3.5, len(p.vx, p.vz));
      p.fx = nf[0]; p.fz = nf[1]; p.vx = nf[0] * sp; p.vz = nf[1] * sp;
    }
    SL.audio.whoosh();
    if (p.human >= 0) this.say(sk.name, 0.7);
    this.stats.skills[p.team]++;
    this.events.push({ type: "skill", team: p.team, by: p, id });
    return true;
  };

  // The ball pushed ahead of the carrier, who runs on to it.
  M.knockOn = function (p, f, speed, vy) {
    const b = this.ball;
    this.release();
    b.vx = f[0] * speed; b.vz = f[1] * speed; b.vy = vy; b.y = Math.max(b.y, C.ballRadius);
    b.x = p.x + f[0] * 0.35; b.z = p.z + f[1] * 0.35;
    b.passFrom = null; b.passTo = null; b.shotBy = null;
    p.pickupLock = vy > 0 ? 0.35 : 0.12;
    p.kickT = -1;
  };

  // ---- How a move looks (match.js, cellOf and stepBall) -------------------------------------
  // With the sheets every figure has (idle_stand, walk, run, shot): the way the body faces among
  // the 8 directions of the sheets, a frame of the shot as the touch, a lift off the ground, and
  // where the ball sits while he keeps it, in the frame of the move's start (forward, to the
  // right, height). A move missing from POSE keeps the run.
  const SOMBRERO_KICK = 0.8;
  const turn = (f, a) => [f[0] * Math.cos(a) - f[1] * Math.sin(a), f[0] * Math.sin(a) + f[1] * Math.cos(a)];
  const Q = Math.PI / 4;
  const POSE = {
    feint: (s, u) => ({ face: turn(s.f, (u < 0.4 ? -1 : 1) * s.side * Q) }),
    stepover: (s, u) => ({ face: turn(s.f, (u < 0.45 ? 1 : -1) * s.side * Q), ball: [0.3, 0, 0] }),
    elastico: (s, u) => ({ ball: [0.28, s.side * (u < 0.4 ? 0.25 * u / 0.4 : 0.25 - 0.6 * (u - 0.4) / 0.6), 0], face: u < 0.4 ? s.f : turn(s.f, -s.side * Q) }),
    roll: (s, u) => ({ face: turn(s.f, s.side * Q), ball: [0.12, s.side * 0.28, 0] }),
    dragback: (s, u) => u < 0.5 ? ({ sheet: "idle_stand", t: 0, face: s.f, ball: [0.32 - 0.57 * (u / 0.5), 0, 0] }) : ({ face: turn(s.f, s.side * Math.PI * Math.min(1, (u - 0.5) / 0.3)), ball: [-0.25, 0, 0] }),
    roulette: (s, u) => ({ ball: [0.1, 0.08 * s.side, 0] }),
    // the shot's swing from its wind-up to the contact (0,2 s into the clip), the ball at the
    // foot until then; stepSkill lifts it over the defender at the contact (SOMBRERO_KICK)
    sombrero: (s, u) => ({ sheet: "shot", t: 0.06 + 0.16 * Math.min(1, u / SOMBRERO_KICK), face: s.f, ball: s.kicked ? null : [0.3, 0, 0] }),
  };
  // Tunnel and heel chop keep the run: the shot's frames are a full kick, and a light touch
  // drawn with them read as a shot in the contact sheets (tools/skill_frames.js).
  SL.SKILL_POSES = POSE;
  M.skillPose = function (p) {
    const s = p.skill, pose = POSE[s.id] && POSE[s.id](s, Math.min(1, s.t / SKILLS[s.id].dur));
    if (!pose) return null;
    const face = pose.face || [p.fx, p.fz];
    if (pose.sheet) return [pose.sheet, pose.t, pose.sheet === "shot", face[0], face[1], pose.lift || 0];
    return [len(p.vx, p.vz) < 0.3 ? "idle_stand" : p.gait, p.phase, false, face[0], face[1], pose.lift || 0];
  };
  M.skillBall = function (p, b) {
    const s = p.skill, pose = POSE[s.id] && POSE[s.id](s, Math.min(1, s.t / SKILLS[s.id].dur));
    if (!pose || !pose.ball) return false;
    const [fw, rt, y] = pose.ball;
    b.x = p.x + s.f[0] * fw + s.r[0] * rt; b.z = p.z + s.f[1] * fw + s.r[1] * rt; b.y = C.ballRadius + y;
    return true;
  };

  // ---- The move, frame by frame (match.js, stepPlayer) -------------------------------------
  M.stepSkill = function (p) {
    const s = p.skill, sk = SKILLS[s.id], u = Math.min(1, s.t / sk.dur);
    s.t += DT;
    const keeps = s.id !== "tunnel" && !(s.id === "sombrero" && s.kicked);
    if ((keeps && this.ball.carrier !== p) || s.t >= sk.dur || (s.id === "roll" && s.released && s.t > 0.15)) { p.skill = null; return false; }
    const f = s.f, r = s.r, side = s.side;
    let vx = 0, vz = 0;
    const lat = (v) => { vx += r[0] * side * v; vz += r[1] * side * v; }, fwd = (v) => { vx += f[0] * v; vz += f[1] * v; };
    switch (s.id) {
      case "feint": lat(1.0 / sk.dur); fwd(1.5); break;
      case "stepover": if (u < 0.45) lat(0.3 / (0.45 * sk.dur)); else lat(-0.9 / (0.55 * sk.dur)); fwd(2.0); break;
      case "elastico": if (u < 0.4) lat(0.35 / (0.4 * sk.dur)); else lat(-1.2 / (0.6 * sk.dur)); fwd(1.5); break;
      case "roll": lat(2.0); break;
      case "heelchop": { const sp = Math.max(3.5, len(p.vx, p.vz)); vx = p.fx * sp; vz = p.fz * sp; break; }
      case "roulette": {
        const a = s.a0 + side * 6.283 * u;
        p.fx = Math.cos(a); p.fz = Math.sin(a);
        vx = s.dir[0] * 2.8; vz = s.dir[1] * 2.8;
        p.shield = Math.max(p.shield || 0, sk.dur - s.t);
        break;
      }
      case "dragback":
        // the sole pulls the ball back while the body turns half a circle toward `side`
        if (u < 0.5) { const a = s.a0 + side * Math.PI * (u / 0.5); p.fx = Math.cos(a); p.fz = Math.sin(a); }
        else { p.fx = -f[0]; p.fz = -f[1]; fwd(-1.5); }
        break;
      case "tunnel": fwd(C.run * C.sprintMult * 0.95); break;
      case "sombrero":
        if (!s.kicked && u >= SOMBRERO_KICK && this.ball.carrier === p) { s.kicked = true; this.knockOn(p, f, 5.0, 7.3); }
        fwd(s.kicked ? C.run * C.sprintMult * 0.95 : 2.0); break;
    }
    p.vx = vx; p.vz = vz;
    p.x += vx * DT; p.z += vz * DT; this.clampPitch(p);
    return true;
  };

  // ---- A person's gestures -----------------------------------------------------------------
  // The right stick in the player's frame: F, B, L, R by quadrant. A gesture is the list of
  // quadrants the stick visits between leaving the rest (|r| > 0,65) and coming back (< 0,3).
  // A flick back waits FLICK_PAIR seconds for a flick forward (the sombrero) before it is a drag back.
  const FLICK_PAIR = 0.4, HOLD = 0.25;
  function quadrant(p, rx, rz) {
    const fw = rx * p.fx + rz * p.fz, sd = rx * -p.fz + rz * p.fx;
    return Math.abs(fw) >= Math.abs(sd) ? (fw > 0 ? "F" : "B") : (sd > 0 ? "R" : "L");
  }
  M.humanSkills = function (h, p, i, mine) {
    const g = h.rsg || (h.rsg = { seq: [], start: 0, fired: false, pendingB: -1 });
    const t = this.clock, m = len(i.rx || 0, i.rz || 0);
    if (!mine) { g.seq = []; g.pendingB = -1; return; }
    if (i.skill) { const id = Object.keys(SKILLS).find((k) => SKILLS[k].key === i.skill); const sd = i.x * -p.fz + i.z * p.fx; this.trySkill(p, id, Math.abs(sd) > 0.2 ? Math.sign(sd) : 0); return; }
    if (p.skill && p.skill.id === "roll" && m < 0.5) p.skill.released = true;
    if (g.pendingB >= 0 && t - g.pendingB > FLICK_PAIR && !g.seq.length) { g.pendingB = -1; this.trySkill(p, "dragback"); }
    if (m > 0.65) {
      const q = quadrant(p, i.rx, i.rz);
      if (!g.seq.length) { g.start = t; g.fired = false; }
      if (g.seq[g.seq.length - 1] !== q) g.seq.push(q);
      if (!g.fired && g.seq.length === 1 && (q === "L" || q === "R") && t - g.start >= HOLD) { g.fired = true; this.trySkill(p, "roll", q === "R" ? 1 : -1); }
      return;
    }
    if (m > 0.3 || !g.seq.length) return;
    const seq = g.seq.join(""), quick = t - g.start <= 0.6;
    g.seq = [];
    if (g.fired || !quick) return;
    const sideOf = (c) => (c === "R" ? 1 : -1);
    if (seq === "F") { if (g.pendingB >= 0) { g.pendingB = -1; this.trySkill(p, "sombrero"); } else this.trySkill(p, "tunnel"); }
    else if (seq === "B") g.pendingB = t;
    else if (seq === "L" || seq === "R") this.trySkill(p, "feint", sideOf(seq));
    else if (seq === "BF") this.trySkill(p, "sombrero");
    else if (/^F[LR]$/.test(seq)) this.trySkill(p, "stepover", sideOf(seq[1]));
    else if (/^B[LR]$/.test(seq)) this.trySkill(p, "heelchop", sideOf(seq[1]));
    else if (seq === "RBL" || seq === "LBR") this.trySkill(p, "elastico", sideOf(seq[0]));
    else if (new Set(seq).size === 4) this.trySkill(p, "roulette", seq.length > 1 && "FRBL".indexOf(seq[1]) === ("FRBL".indexOf(seq[0]) + 1) % 4 ? 1 : -1);
  };

  // ---- The AI's moves (ai.js, carrierThink): a pressed carrier, away from the nearest defender --
  M.aiSkill = function (p) {
    let near = null, nd = 9;
    for (const o of this.players) if (o.team !== p.team && !o.isKeeper) { const d = len(o.x - p.x, o.z - p.z); if (d < nd) { nd = d; near = o; } }
    if (!near) return false;
    const stars = SL.skillStars(p.card);
    const pool = ["feint", "stepover", "dragback", "roulette", "elastico", "heelchop"].filter((k) => SKILLS[k].stars <= stars);
    if (!pool.length) return false;
    const id = pool[Math.floor(this.rng() * pool.length)];
    const sd = (near.x - p.x) * -p.fz + (near.z - p.z) * p.fx;
    return this.trySkill(p, id, sd > 0 ? -1 : 1);
  };
})();

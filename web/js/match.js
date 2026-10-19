// Strike Legends (browser) - the match: 60 Hz simulation, players, ball, keeper, AI, input.
// The numbers come from the Godot version of the game, kept in the archive repository
// (README.md, "Archivio": game/tuning/tuning_config.gd, game/ai/ai_params.gd, GDD.md): pitch
// 28 x 16 m, run 7,0 m/s, sprint x1,35, the hit of GDD.md §4.4, the keeper's save reserve of
// GDD.md §8.4, the special move of PRODUCTION.md §6.0.
"use strict";

(function () {
  const SL = window.SL;
  const DT = 1 / 60;
  const C = {
    length: 28, width: 16, goalWidth: 4.5, goalHeight: 2.2, goalDepth: 1.0,
    // Paced for a 28 m pitch: real peak speeds (8,3 m/s at a World Cup) cross it in 3 s, too
    // fast to build a move; 4,6 m/s takes 6 s, the sprint 4,5 s (docs/DETTAGLI.md, "Ritmo").
    run: 4.6, sprintMult: 1.35, accelTime: 0.22, stopRateMult: 0.3,
    bodyRadius: 0.3, ballRadius: 0.11, gravity: 14, restitution: 0.65, drag: 0.55,
    pickup: 0.55, passSpeed: 12, lobSpeed: 10.5, passCone: 30, shotMax: 28, shotMin: 14, shotCharge: 0.9,
    // Semi and manual passes take their power from the hold (docs/DETTAGLI.md, "Passaggi"); the mate
    // a pass is meant for runs to meet it for at most receiveMax seconds.
    passCharge: 0.5, receiveMax: 2.5,
    hitSpeed: 7.2, hitTime: 0.28, hitRecovery: 0.5, hitReact: 0.6, knock: 0.9, knockTime: 0.2,
    slowTime: 1.0, slowFactor: 0.6, hitAiDistance: 1.3, hitAiCooldown: 11, teamHitGap: 20, shield: 0.8,
    slideDist: 2.15, slideTime: 0.35, slideDown: 0.35, feintDist: 1.0, feintTime: 0.2,
    keeperReach: 1.0, keeperHold: 1.0, reserveMax: 100, saveCost: 34, recharge: 0.7, savePlane: 1.5,
    goalPause: 2.5, kickoffHold: 1.0,
    // The team's tension (docs/DETTAGLI.md, "Tensione"): three notches of 100/3. Points for actions
    // that beat the other team: from the 3rd pass in a row without an opponent's touch, an
    // interception, a hit that takes the ball, a won slide, a save; and for a goal conceded.
    // A full bar stays full fullHold seconds, then drops to two notches. One notch buys a charged
    // shot (the keeper pays double reserve for it, within chargedFor seconds); three, the comet.
    tension: { notch: 100 / 3, chainFrom: 3, chain: 2, intercept: 4, hitWon: 3, tackle: 4, save: 2, conceded: 6, fullHold: 20, chargedFor: 5 },
    chargeTime: 0.5, sweep: 0.75, powerTarget: 0.8, aimTarget: 0.2, window: 0.05, slow: 0.4,
  };
  SL.C = C;
  const IDLE_BELOW = 0.3, RUN_ABOVE = 3.2, WALK_BELOW = 2.8, SPRINT_ABOVE = 5.2, SHOT_CLIP_SPEED = 1.403;
  // The run and sprint sheets were drawn for 7,0 and 9,45 m/s: at this pace their legs turn
  // a little faster than the ground goes by, or the stride reads as slow motion.
  const CADENCE = 1.3;
  // Hip path of the shoulder clips (archive PRODUCTION.md §3, SP2-SP5), metres every 1/60 s.
  const SHOULDER_PATH = [0.0, 0.0305, 0.0610, 0.0914, 0.1219, 0.1669, 0.2698, 0.3726, 0.4755, 0.5784, 0.6813, 0.7841,
    0.8870, 0.9899, 1.0928, 1.1956, 1.2985, 1.3893, 1.4287, 1.4636, 1.4941, 1.5207, 1.5435, 1.5628, 1.5790, 1.5923,
    1.6030, 1.6114, 1.6178, 1.6224, 1.6255, 1.6275, 1.6285, 1.6289, 1.6290, 1.6290, 1.6290];
  const LOOKS = ["weak", "medium", "strong", "violent"];
  function shoulderRoot(t) {
    const x = Math.max(0, Math.min(0.6, t)) * 60, i = Math.min(Math.floor(x), SHOULDER_PATH.length - 2);
    return SHOULDER_PATH[i] + (SHOULDER_PATH[i + 1] - SHOULDER_PATH[i]) * (x - i);
  }
  function shoulderTimeAt(d, lo, hi) {
    if (d <= shoulderRoot(lo)) return lo;
    if (d >= shoulderRoot(hi)) return hi;
    for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (shoulderRoot(m) < d) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const len = (x, z) => Math.hypot(x, z);
  const attackSign = (team) => (team === 0 ? 1 : -1);

  // Input lives in input.js: a human's device is {kb, pad}, read as one stick and seven buttons.
  const readInput = (slot, device) => SL.input.read(device);

  // ---- Player ----------------------------------------------------------------------
  function makePlayer(team, slot, card, look) {
    const eff = SL.cardEffect(card);
    return {
      team, slot, isKeeper: slot === 0, card, look, eff,
      body: card && card.body ? card.body : "", height: card && card.body && SL.BODY_HEIGHT[card.body] ? SL.BODY_HEIGHT[card.body] : 1,
      x: 0, z: 0, vx: 0, vz: 0, fx: attackSign(team), fz: 0,
      gait: "walk", phase: 0, sprinting: false, idleTime: 0,
      human: -1, ai: true, still: false, speedScale: 1,
      stick: [0, 0], wantSprint: false,
      hitT: -1, hitDir: [1, 0], recovery: 0, react: 0, knockT: 0, knock: [0, 0], slow: 0, hitCool: 0,
      sh: -1, shExit: false, shFrom: [0, 0], shLen: 0, shDir: [1, 0],
      reactClip: -1, reactDir: [1, 0], reactSheet: "hit_react",
      slideT: -1, slideDir: [1, 0], slideDownT: 0, feintT: -1, feintDir: [0, 1], feintCool: 0,
      kickClip: null, kickT: -1, kickDir: [1, 0], holdT: 0, rollT: -1,
      charge: -1, passCharge: -1, celebrate: -1, pickupLock: 0, specialPose: -1,
      skill: null, skillCool: 0, fooled: 0, foolDir: [0, 0],
      palRow: 0, prevBtn: {},
    };
  }

  function stopped(p) { return p.react > 0 || p.recovery > 0 || p.slideDownT > 0; }

  // ---- Match -----------------------------------------------------------------------
  function Match(opts) {
    this.opts = opts;               // {home:{club,squad,kit}, away:{...}, humans:[{team,device}], settings, demo}
    this.s = opts.settings;
    this.clock = 0; this.length = (this.s.minutes || 4) * 60;
    this.score = [0, 0]; this.scorers = [];
    this.phase = "kickoff"; this.phaseT = 0; this.kickTeam = 0; this.golden = false; this.over = false;
    this.reserve = [C.reserveMax, C.reserveMax];
    this.mana = [0, 0];               // the tension, 0-100 (C.tension)
    this.chain = [0, 0]; this.fullAt = [-1, -1]; this.chargedUntil = [-1, -1];
    this.special = null;            // {team, shooter, state, t, meter, presses:[], hits}
    this.message = ""; this.messageT = 0;
    this.hitstop = 0; this.timeScale = 1; this.flash = 0;
    this.particles = [];
    this.events = [];               // {type, ...} read by the UI each frame
    this.stats = { shots: [0, 0], saves: [0, 0], hits: [0, 0], passes: [0, 0], tackles: [0, 0], possession: [0, 0], skills: [0, 0] };
    this.spots = [opts.home, opts.away].map((sd) => (FORMATIONS[sd.formation] || FORMATIONS.rombo).spots);
    this.rng = SL.rng(opts.seed || 1);
    // the ground's gravity: the moon's is lighter (render.js, THEMES.luna)
    this.gravity = C.gravity * (opts.gravity || 1);
    this.camX = 0;
    this.players = [];
    for (let t = 0; t < 2; t++) {
      const side = t === 0 ? opts.home : opts.away;
      for (let i = 0; i < 5; i++) {
        const card = side.squad[i];
        const p = makePlayer(t, i, card, card ? card.look : (i * 3 + t) % 8);
        p.palRow = 2 * (t * 5 + i);
        p.pattern = side.pattern || 0;
        // the place in the formation and the role (ai.js, ROLES): the side's choice, else the
        // card's most familiar role for that place; the familiarity comes from the card
        p.pos = (FORMATIONS[side.formation] || FORMATIONS.rombo).places[i];
        p.role = (side.roles && side.roles[i] && SL.AI.ROLES[side.roles[i]] && SL.AI.ROLES[side.roles[i]].pos === p.pos) ? side.roles[i] : SL.AI.defaultRole(card, p.pos);
        p.fam = SL.AI.cardRoles(card)[p.role] || 0;
        this.players.push(p);
      }
    }
    for (const p of this.players) {
      const keeperBonus = p.isKeeper ? p.eff.reserve : 0;
      if (p.isKeeper) this.reserve[p.team] = C.reserveMax + keeperBonus;
    }
    this.reserveMax = [this.reserve[0], this.reserve[1]];
    this.ball = { x: 0, y: C.ballRadius, z: 0, vx: 0, vy: 0, vz: 0, carrier: null, last: null, lastTeam: -1, unstoppable: false, worth: 1, passTo: null, shotBy: null };
    this.humans = [];
    for (const h of opts.humans || []) this.humans.push({ team: h.team, device: h.device, lock: h.lock, player: null, prev: {} });
    // a challenge may start from a score
    if (opts.score) this.score = opts.score.slice();
    if (opts.mana) this.mana = opts.mana.slice();
    this.applySettings(this.s);
    this.resetKickoff(0);
  }
  SL.Match = Match;
  const M = Match.prototype;

  M.applySettings = function (s) {
    this.s = s;
    const human = this.humans.length ? this.humans[0].team : -1;
    const twoHumans = new Set(this.humans.map((h) => h.team)).size > 1;
    const oppScale = [0.85, 0.93, 1.0][s.difficulty] || 0.93;
    for (const p of this.players) {
      p.speedScale = (!twoHumans && human >= 0 && p.team !== human) ? oppScale : 1;
      const stillTeam = (!twoHumans && human >= 0 && s.opponentAi > 0) ? 1 - human : -1;
      p.still = p.team === stillTeam && (!p.isKeeper || s.opponentAi === 2);
    }
  };

  M.paletteRows = function () {
    const rows = [];
    for (const p of this.players) { const side = p.team === 0 ? this.opts.home : this.opts.away; rows.push({ kit: side.kit, kit2: side.kit2, look: p.look }); }
    return rows;
  };

  // Formation spots in the frame of the team that attacks toward +x, keeper first
  // (Impostazioni > Formazione, settings.js). z is mirrored for the team attacking -x.
  const FORMATIONS = {
    rombo: { name: "Rombo 1-2-1", spots: [[-13.3, 0], [-8.5, 0.5], [-4, -3.2], [-1.5, 4.2], [-1, -0.8]], places: ["POR", "DIF", "CEN", "ALA", "ATT"] },
    quadrato: { name: "Quadrato 2-2", spots: [[-13.3, 0], [-8.5, -3], [-8.5, 3], [-2.5, -3.2], [-2.5, 3.2]], places: ["POR", "DIF", "DIF", "ATT", "ATT"] },
    piramide: { name: "Piramide 2-1-1", spots: [[-13.3, 0], [-9, -3], [-9, 3], [-5, 0.5], [-1.5, -0.5]], places: ["POR", "DIF", "DIF", "CEN", "ATT"] },
    difensivo: { name: "Muro 3-1", spots: [[-13.3, 0], [-9, -4.5], [-9.5, 0], [-9, 4.5], [-2, 0]], places: ["POR", "DIF", "DIF", "DIF", "ATT"] },
    offensivo: { name: "Tridente 1-1-2", spots: [[-13.3, 0], [-8.5, 0], [-5, 0.5], [-1.5, -3.2], [-1.5, 3.2]], places: ["POR", "DIF", "CEN", "ATT", "ATT"] },
  };
  SL.FORMATIONS = FORMATIONS;
  M.resetKickoff = function (team) {
    this.kickTeam = team;
    const b = this.ball;
    b.carrier = null; b.vx = b.vy = b.vz = 0; b.unstoppable = false; b.worth = 1; b.passTo = null;
    for (const p of this.players) {
      const s = attackSign(p.team), sp = this.spots[p.team][p.slot];
      p.x = sp[0] * s; p.z = sp[1] * (p.team === 0 ? 1 : -1);
      p.vx = p.vz = 0; p.fx = s; p.fz = 0;
      p.hitT = -1; p.recovery = 0; p.react = 0; p.knockT = 0; p.slow = 0; p.sh = -1; p.reactClip = -1;
      p.slideT = -1; p.slideDownT = 0; p.feintT = -1; p.kickT = -1; p.charge = -1; p.passCharge = -1; p.holdT = 0; p.rollT = -1; p.celebrate = -1; p.specialPose = -1;
      p.pickupLock = 0; p.skill = null; p.fooled = 0;
    }
    const taker = this.players[team * 5 + 4], mate = this.players[team * 5 + 2];
    taker.x = -0.5 * attackSign(team); taker.z = 0;
    mate.x = -2.6 * attackSign(team); mate.z = 1.2;
    b.x = taker.x + 0.35 * attackSign(team); b.z = 0; b.y = C.ballRadius;
    this.take(taker);
    this.phase = "kickoff"; this.phaseT = 0;
    // two people on one team start on two different players
    const used = new Set();
    for (const h of this.humans) {
      let slot = h.lock != null ? h.lock : h.team === team ? 4 : 2;
      if (used.has(h.team * 5 + slot)) slot = [2, 3, 4, 1].find((k) => !used.has(h.team * 5 + k));
      used.add(h.team * 5 + slot);
      if (h.player) { h.player.human = -1; h.player.ai = true; h.player = null; }
      this.setHuman(h, this.players[h.team * 5 + slot]);
    }
    this.special = null; this.timeScale = 1;
  };

  // A locked human (the player career) stays on one player of his team.
  M.setHuman = function (h, p) {
    if (h.lock != null && p !== this.players[h.team * 5 + h.lock]) return;
    if (this.humans.some((o) => o !== h && o.player === p)) return;
    if (h.player) { h.player.human = -1; h.player.ai = true; }
    h.player = p; p.human = this.humans.indexOf(h); p.ai = false;
  };

  // Rumble on the pad of the person who plays p (input.js, rumble).
  M.rumbleFor = function (p, strong, weak, ms) {
    for (const h of this.humans) if (h.player === p || (p === null)) SL.input.rumble(h.device, strong, weak, ms);
  };

  M.say = function (text, seconds) { this.message = text; this.messageT = seconds || 1.6; };

  M.take = function (p) {
    const b = this.ball, T = C.tension;
    b.carrier = p; b.last = p; b.lastTeam = p.team; b.unstoppable = false; b.worth = 1; b.charged = false;
    if (b.lastOwnerTeam !== p.team) { p.shield = C.shield; this.chain = [0, 0]; }   // a new possession gets a moment
    if (p.isKeeper) this.chain[p.team] = 0;
    b.lastOwnerTeam = p.team;
    if (b.passTo && b.passTo.team === p.team && b.passTo !== p && b.shotBy == null) { /* intercepted by a mate */ }
    if (b.passFrom && b.passFrom.team === p.team && b.passFrom !== p) {
      this.chain[p.team]++;
      if (this.chain[p.team] >= T.chainFrom) this.addMana(p.team, T.chain);
      this.stats.passes[p.team]++; this.events.push({ type: "pass", team: p.team, from: b.passFrom, to: p });
    } else if (b.passFrom && b.passFrom.team !== p.team) { this.addMana(p.team, T.intercept); this.events.push({ type: "intercept", team: p.team, by: p }); }
    b.passFrom = null; b.passTo = null; b.shotBy = null; b.chip = false;
    p.charge = -1; p.passCharge = -1;
  };

  // points of tension (C.tension); the moment the bar fills starts its fullHold seconds
  M.addMana = function (team, pts) {
    const before = this.mana[team];
    this.mana[team] = Math.min(100, before + pts);
    if (before < 100 && this.mana[team] >= 100) this.fullAt[team] = this.clock;
  };
  // One notch: the team's next shot within chargedFor seconds costs the keeper double reserve.
  M.tryCharged = function (p) {
    const T = C.tension;
    if (this.mana[p.team] < T.notch || this.chargedUntil[p.team] > this.clock || this.ball.carrier !== p || p.isKeeper) return false;
    this.mana[p.team] -= T.notch;
    this.chargedUntil[p.team] = this.clock + T.chargedFor;
    if (p.human >= 0) this.say(`Tiro caricato: ${T.chargedFor} secondi`, 1.2);
    SL.audio.meter();
    this.events.push({ type: "charged", team: p.team });
    return true;
  };

  M.release = function () { this.ball.carrier = null; };

  // ---- Kicks -------------------------------------------------------------------------
  M.kick = function (p, vx, vy, vz, kind) {
    const b = this.ball;
    if (b.carrier !== p) return false;
    this.release();
    b.vx = vx; b.vy = vy; b.vz = vz; b.y = Math.max(b.y, C.ballRadius);
    b.x = p.x + Math.sign(vx || p.fx) * 0.05 + p.fx * 0.3; b.z = p.z + p.fz * 0.3;
    p.pickupLock = 0.25;
    const sp = len(vx, vz);
    const dir = sp > 0.01 ? [vx / sp, vz / sp] : [p.fx, p.fz];
    p.kickDir = dir; p.kickT = 0;
    const idle = len(p.vx, p.vz) < IDLE_BELOW;
    p.kickClip = p.isKeeper && kind === "roll" ? "keeper_roll" : (idle ? "pass" : (kind === "shot" ? "shot" : null));
    if (!p.kickClip) p.kickT = -1;
    b.charged = false;
    if (kind === "shot") {
      b.shotBy = p; this.stats.shots[p.team]++; this.chain[p.team] = 0;
      if (this.chargedUntil[p.team] > this.clock) { b.charged = true; this.chargedUntil[p.team] = -1; }
      SL.audio.kick(clamp(sp / 28, 0, 1)); this.events.push({ type: "shot", team: p.team, by: p, speed: sp, charged: b.charged });
    }
    else SL.audio.pass();
    return true;
  };

  // With the stick: the mate most in its direction. Without: the best placed one, even behind.
  M.bestReceiver = function (p, dx, dz, aimed) {
    let best = null, bestScore = -1e9;
    const m = len(dx, dz) || 1, ux = dx / m, uz = dz / m, s = attackSign(p.team);
    for (const q of this.players) {
      if (q.team !== p.team || q === p) continue;
      const rx = q.x - p.x, rz = q.z - p.z, d = len(rx, rz);
      if (d < 1.2) continue;
      const cos = (rx * ux + rz * uz) / d;
      const lane = this.laneOpen(p.x, p.z, q.x, q.z, p.team);
      const score = aimed ? cos * 3 - d * 0.06 + lane * 0.8 + (q.isKeeper ? -3 : 0)
        : lane * 1.5 + (q.x - p.x) * s * 0.08 - Math.abs(d - 6) * 0.1 + (q.isKeeper ? -3 : 0);
      if ((!aimed || cos > -0.2) && score > bestScore) { bestScore = score; best = q; }
    }
    return best;
  };

  // 0 blocked .. 1 nobody within 1,5 m of the line between two points
  M.laneOpen = function (ax, az, bx, bz, team, skipKeeper) {
    let worst = 9;
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
    for (const o of this.players) {
      if (o.team === team || (skipKeeper && o.isKeeper)) continue;
      // only who stands ahead of the kicker blocks: a marker at his side does not
      const t = ((o.x - ax) * dx + (o.z - az) * dz) / L2;
      if (t < 0.06 || t > 1) continue;
      worst = Math.min(worst, len(ax + dx * t - o.x, az + dz * t - o.z));
    }
    return clamp(worst / 1.5, 0, 1);
  };

  // to: the receiver the AI chose (ai.js); a person aims with the stick.
  // how: a person's semi or manual pass, {power: 0..1 from the hold, manual}. Assisted (no how):
  // the mate in the stick's direction, at the speed the distance needs. Semi: the same mate, the
  // hold moves that speed between 75% and 125%. Manual: no mate, the ball goes where the stick
  // points, 6 to 18 m/s with the hold (EA FC's three settings, docs/DETTAGLI.md, "Passaggi").
  M.pass = function (p, dx, dz, lob, to, how) {
    const aimed = len(dx || 0, dz || 0) > 0.2, manual = !!(how && how.manual);
    const q = manual ? null : to || this.bestReceiver(p, aimed ? dx : p.fx, aimed ? dz : p.fz, aimed);
    let tx, tz, speed = C.passSpeed * p.eff.pass;
    if (q) {
      const d = len(q.x - p.x, q.z - p.z), t = d / speed;
      tx = q.x + q.vx * t * 0.85; tz = q.z + q.vz * t * 0.85;
    } else {
      const m = aimed ? len(dx, dz) : 1, ux = aimed ? dx / m : p.fx, uz = aimed ? dz / m : p.fz;
      const reach = manual ? 4 + 12 * how.power : 8;
      tx = p.x + ux * reach; tz = p.z + uz * reach;
    }
    tx = clamp(tx, -13.6, 13.6); tz = clamp(tz, -7.6, 7.6);
    const rx = tx - p.x, rz = tz - p.z, d = len(rx, rz) || 1;
    let vy = 0;
    if (lob) { speed = Math.max(7, Math.min(C.lobSpeed, d * 1.1)); const t = d / speed; vy = this.gravity * t * 0.5; }
    else if (manual) speed = (6 + 12 * how.power) * p.eff.pass;
    else { speed = Math.min(speed, 6 + d * 1.4); if (how) speed *= 0.75 + 0.5 * how.power; }
    if (this.kick(p, rx / d * speed, vy, rz / d * speed, "pass")) {
      // a manual pass is meant for the mate who reaches its path first
      const to2 = q || this.firstToBall(p);
      this.ball.passFrom = p; this.ball.passTo = to2; this.ball.passAt = this.clock;
      if (to2 && this.s.autoSwitch !== false) for (const h of this.humans) if (h.player === p && to2.team === h.team && !this.humans.some((o) => o.player === to2)) this.setHuman(h, to2);
    }
  };

  // Where the rolling ball is in t seconds (drag only; the walls are left out).
  M.ballAt = function (t) {
    const b = this.ball, f = (1 - Math.exp(-C.drag * t)) / C.drag;
    return [clamp(b.x + b.vx * f, -13.6, 13.6), clamp(b.z + b.vz * f, -7.6, 7.6)];
  };
  // The earliest point of the ball's path p reaches at a sprint: [t, x, z].
  M.meetPoint = function (p) {
    const top = C.run * C.sprintMult * p.eff.speed * p.speedScale;
    for (let t = 0.05; t <= C.receiveMax; t += 0.05) {
      const [x, z] = this.ballAt(t);
      if (len(p.x - x, p.z - z) / top <= t) return [t, x, z];
    }
    const [x, z] = this.ballAt(9);
    return [9, x, z];
  };
  M.firstToBall = function (from) {
    let best = null, bt = 1e9;
    for (const q of this.players) {
      if (q.team !== from.team || q === from || q.isKeeper) continue;
      const t = this.meetPoint(q)[0];
      if (t < bt) { bt = t; best = q; }
    }
    return best;
  };
  // A pass on its way to p, from a mate, kicked less than receiveMax seconds ago.
  M.receiving = function (p) {
    const b = this.ball;
    return !b.carrier && b.passTo === p && !!b.passFrom && b.passFrom.team === p.team && this.clock - (b.passAt || 0) < C.receiveMax;
  };

  M.shoot = function (p, charge, aimZ, chip) {
    const s = attackSign(p.team), gx = s * C.length / 2;
    const tz = clamp(aimZ, -C.goalWidth / 2 + 0.35, C.goalWidth / 2 - 0.35);
    const rx = gx - p.x, rz = tz - p.z, d = len(rx, rz) || 1;
    let speed = C.shotMin + (C.shotMax * p.eff.shot - C.shotMin) * clamp(charge, 0, 1), vy;
    if (chip) { speed = Math.min(15, Math.max(9, d * 0.9)); vy = this.gravity * (d / speed) * 0.5 * 0.95; }
    else vy = 0.6 + clamp(charge, 0, 1) * 2.4 * Math.min(1, d / 14);
    this.kick(p, rx / d * speed, vy, rz / d * speed, "shot");
    this.ball.chip = !!chip;
  };

  // ---- The hit (archive GDD.md §4.4) ------------------------------------------------------------
  // The keeper is never a target nor a contact, for people and the AI alike: a hit on the
  // keeper holding the ball left the goal empty for the next touch.
  M.nearestOpponent = function (p, maxD) {
    let best = null, bd = maxD || 99;
    const carrier = this.ball.carrier;
    for (const o of this.players) {
      if (o.team === p.team || o.isKeeper) continue;
      let d = len(o.x - p.x, o.z - p.z);
      if (o === carrier) d -= 1.2;
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  };

  function interceptTime(tx, tz, mx, mz, speed, cap) {
    const a = mx * mx + mz * mz - speed * speed, b = 2 * (tx * mx + tz * mz), c = tx * tx + tz * tz;
    let t = -1;
    if (Math.abs(a) < 1e-4) { if (b < 0) t = -c / b; }
    else {
      const disc = b * b - 4 * a * c;
      if (disc >= 0) { const r = Math.sqrt(disc); for (const root of [(-b - r) / (2 * a), (-b + r) / (2 * a)]) if (root > 0 && (t < 0 || root < t)) t = root; }
    }
    return t < 0 ? cap : Math.min(t, cap);
  }

  M.startHit = function (p) {
    if (stopped(p) || p.hitT >= 0 || this.ball.carrier === p) return;
    const rival = this.nearestOpponent(p, 5);
    let ax = p.fx, az = p.fz, tInt = C.hitTime;
    if (rival) {
      const tx = rival.x - p.x, tz = rival.z - p.z;
      tInt = interceptTime(tx, tz, rival.vx, rival.vz, C.hitSpeed, C.hitTime);
      ax = tx + rival.vx * tInt; az = tz + rival.vz * tInt;
      const m = len(ax, az); if (m > 0.01) { ax /= m; az /= m; } else { ax = p.fx; az = p.fz; }
    }
    p.hitDir = [ax, az]; p.hitT = 0; p.rival = rival; p.hitCool = C.hitAiCooldown;
    p.sh = 0; p.shExit = false; p.shFrom = [p.x, p.z]; p.shDir = [ax, az]; p.shLen = C.hitSpeed * tInt;
    p.lungeStep = false;
    SL.audio.whoosh();
  };

  M.lunge = function (p) {
    if (this.ball.carrier === p) { p.hitT = -1; return; }
    p.vx = p.hitDir[0] * C.hitSpeed; p.vz = p.hitDir[1] * C.hitSpeed;
    p.fx = p.hitDir[0]; p.fz = p.hitDir[1];
    p.x += p.vx * DT; p.z += p.vz * DT; this.clampPitch(p);
    p.hitT += DT;
    for (const o of this.players) {
      // the comet's shooter can be hit while he charges (C.chargeTime), not once the meter runs
      if (o.team === p.team || o.isKeeper || o.react > 0 || (o.shield > 0 && this.ball.carrier === o) || this.special && this.special.shooter === o && this.special.state !== "charge") continue;
      if (len(o.x - p.x, o.z - p.z) <= 2 * C.bodyRadius + 0.02) {
        const took = this.takeHit(o, p.vx, p.vz);
        p.hitT = -1;
        this.stats.hits[p.team]++;
        this.hitstop = 6; this.camShake = 0.012;
        SL.audio.hit();
        this.rumbleFor(p, 0.45, 0.8, 120); this.rumbleFor(o, 1.0, 0.6, 220);
        if (took) { this.addMana(p.team, C.tension.hitWon); this.say("SPALLATA! Palla rubata", 1.2); }
        this.events.push({ type: "hit", team: p.team, by: p, on: o, took });
        return;
      }
    }
    if (p.hitT >= C.hitTime) { p.hitT = -1; p.recovery = C.hitRecovery; p.vx = p.vz = 0; }
  };

  M.takeHit = function (o, ivx, ivz) {
    if (o.react > 0) return false;
    if (this.special && this.special.shooter === o) {
      this.special = null; this.timeScale = 1; o.specialPose = -1;
      this.say("Colpo della Cometa fermato", 1.4);
      this.events.push({ type: "specialStopped", team: o.team });
    }
    const had = this.ball.carrier === o;
    if (had) this.knockLoose(o, ivx, ivz);
    o.react = C.hitReact; o.hitT = -1; o.slideT = -1; o.charge = -1; o.passCharge = -1; o.skill = null; o.vx = o.vz = 0; o.pickupLock = C.hitReact;
    const m = len(ivx, ivz) || 1;
    o.knock = [ivx / m * C.knock * o.eff.knock / C.knockTime, ivz / m * C.knock * o.eff.knock / C.knockTime];
    o.knockT = C.knockTime; o.sh = -1;
    o.reactClip = 0;
    const look = LOOKS[this.s.hitLook] || "medium";
    if (SL.Render.has("shoulder_react_" + look)) { o.reactSheet = "shoulder_react_" + look; o.reactDir = [ivx / m, ivz / m]; }
    else { o.reactSheet = "hit_react"; o.reactDir = [-ivx / m, -ivz / m]; }
    o.hitCool = C.hitReact + C.hitAiCooldown;
    return had;
  };

  M.knockLoose = function (o, ivx, ivz) {
    const b = this.ball;
    this.release();
    const sx = o.vx + ivx * 0.5, sz = o.vz + ivz * 0.5, m = len(sx, sz) || 1, sp = len(o.vx, o.vz) + 2.0;
    b.vx = sx / m * Math.max(2.5, sp * 0.8); b.vz = sz / m * Math.max(2.5, sp * 0.8); b.vy = 0.4;
    b.x = o.x; b.z = o.z;
  };

  // ---- Player movement --------------------------------------------------------------
  M.clampPitch = function (p) {
    const L = C.length / 2 - 0.25, Wd = C.width / 2 - 0.25;
    p.x = clamp(p.x, -L - (p.isKeeper ? 0.2 : 0), L + (p.isKeeper ? 0.2 : 0)); p.z = clamp(p.z, -Wd, Wd);
  };

  M.move = function (p, sx, sz, sprint) {
    const top = C.run * p.eff.speed * p.speedScale * (sprint ? C.sprintMult : 1) * (p.slow > 0 ? C.slowFactor : 1);
    const accel = C.run / C.accelTime;
    const m = len(sx, sz);
    if (m > 0.05) {
      const tx = sx * top, tz = sz * top;
      let dx = tx - p.vx, dz = tz - p.vz; const dl = len(dx, dz), mx = accel * DT;
      if (dl > mx) { dx *= mx / dl; dz *= mx / dl; }
      p.vx += dx; p.vz += dz;
      // turning toward the stick, a quick blend so the run curves
      const f = 1 - Math.exp(-18 * DT);
      p.fx += (sx / m - p.fx) * f; p.fz += (sz / m - p.fz) * f;
      const fm = len(p.fx, p.fz) || 1; p.fx /= fm; p.fz /= fm;
    } else {
      const sp = len(p.vx, p.vz), dec = accel * C.stopRateMult * DT;
      if (sp <= dec) { p.vx = 0; p.vz = 0; } else { p.vx -= p.vx / sp * dec; p.vz -= p.vz / sp * dec; }
    }
    p.sprinting = sprint && m > 0.05;
    p.x += p.vx * DT; p.z += p.vz * DT;
    this.clampPitch(p);
  };

  M.stepPlayer = function (p) {
    p.lungeStep = p.hitT >= 0;
    if (p.specialPose >= 0) { p.vx = p.vz = 0; }
    else if (p.hitT >= 0) this.lunge(p);
    else if (p.slideT >= 0) {
      p.slideT += DT;
      const v = C.slideDist / C.slideTime;
      p.vx = p.slideDir[0] * v; p.vz = p.slideDir[1] * v; p.x += p.vx * DT; p.z += p.vz * DT; this.clampPitch(p);
      const b = this.ball;
      if (b.y < 0.5 && len(b.x - p.x - p.slideDir[0] * 0.4, b.z - p.z - p.slideDir[1] * 0.4) < 0.6) {
        if (b.carrier && b.carrier.team !== p.team && !b.carrier.isKeeper) { const c = b.carrier; this.knockLoose(c, p.vx, p.vz); c.react = 0.35; c.vx = c.vz = 0; this.addMana(p.team, C.tension.tackle); this.say("Scivolata vinta", 1); this.stats.tackles[p.team]++; this.events.push({ type: "tackle", team: p.team, by: p, on: c }); }
        else if (!b.carrier) { b.vx = p.vx * 0.9; b.vz = p.vz * 0.9; }
      }
      if (p.slideT >= C.slideTime) { p.slideT = -1; p.slideDownT = C.slideDown; p.vx = p.vz = 0; }
    } else if (p.slideDownT > 0) { p.vx = p.vz = 0; }
    else if (p.feintT >= 0) {
      p.feintT += DT;
      const v = C.feintDist / C.feintTime;
      p.x += p.feintDir[0] * v * DT; p.z += p.feintDir[1] * v * DT; this.clampPitch(p);
      if (p.feintT >= C.feintTime) p.feintT = -1;
    } else if (p.skill && this.stepSkill(p)) {
      // a skill move (skills.js) moves him
    } else if (p.knockT > 0.5 * DT) {
      p.x += p.knock[0] * DT; p.z += p.knock[1] * DT; this.clampPitch(p); p.knockT -= DT;
    } else {
      let sx = p.stick[0], sz = p.stick[1];
      if (stopped(p) || p.charge >= 0 && p.isKeeper) { sx = 0; sz = 0; }
      if (p.charge >= 0) { sx *= 0.55; sz *= 0.55; }
      this.move(p, sx, sz, p.wantSprint && !stopped(p));
    }
    // timers
    if (p.react > 0 && p.react - DT <= 0) p.slow = C.slowTime;
    else if (p.react <= 0) p.slow = Math.max(0, p.slow - DT);
    p.react = Math.max(0, p.react - DT);
    p.recovery = Math.max(0, p.recovery - DT);
    p.slideDownT = Math.max(0, p.slideDownT - DT);
    p.hitCool = Math.max(0, p.hitCool - DT);
    p.feintCool = Math.max(0, p.feintCool - DT);
    p.skillCool = Math.max(0, p.skillCool - DT);
    p.fooled = Math.max(0, p.fooled - DT);
    p.pickupLock = Math.max(0, p.pickupLock - DT);
    p.shield = Math.max(0, (p.shield || 0) - DT);
    if (p.charge >= 0) p.charge = Math.min(C.shotCharge, p.charge + DT);
    if (p.passCharge >= 0) p.passCharge = Math.min(C.passCharge, p.passCharge + DT);
    this.advanceGait(p);
    this.advanceClips(p);
  };

  M.advanceGait = function (p) {
    const sp = len(p.vx, p.vz);
    let g = p.gait;
    if (p.sprinting && sp > SPRINT_ABOVE) g = "sprint";
    else if (sp > RUN_ABOVE) g = "run";
    else if (sp < WALK_BELOW) g = "walk";
    if (g !== p.gait) p.gait = g;
    const m = SL.Render.meta(p.gait);
    const stride = m ? m.speed_mps * m.cycle_s : 2;
    p.phase = (p.phase + sp * DT / stride * (g === "walk" ? 1 : CADENCE)) % 1;
    if (sp < IDLE_BELOW) p.idleTime += DT; else p.idleTime = 0;
  };

  M.advanceClips = function (p) {
    // the shoulder clip (SP2-SP4)
    if (p.sh >= 0) {
      const d = len(p.x - p.shFrom[0], p.z - p.shFrom[1]);
      if (!p.shExit) {
        if (!p.lungeStep) p.sh = -1;
        else {
          const charge = shoulderRoot(0.1);
          let t = shoulderTimeAt(d, 0, 0.1);
          if (d > charge) t = 0.1 + 0.18 * clamp((d - charge) / Math.max(0.01, p.shLen - charge), 0, 1);
          p.sh = Math.min(Math.max(p.sh, t), 0.28);
          if (p.hitT < 0) { p.sh = 0.28; p.shExit = true; p.shFrom = [p.x, p.z]; }
        }
      } else if (p.sh >= 0.6 - 1e-6 || p.hitT >= 0 || p.slideT >= 0 || p.feintT >= 0 || p.kickT >= 0 || p.specialPose >= 0) p.sh = -1;
      else {
        const byD = shoulderTimeAt(shoulderRoot(0.28) + d, p.sh, 0.6);
        p.sh = Math.min(0.6, Math.max(p.sh + DT, byD));
      }
    }
    if (p.reactClip >= 0) {
      const m = SL.Render.meta(p.reactSheet), dur = m ? m.duration_s : 0.6;
      const tailCut = p.react <= 0 && p.reactClip >= C.hitReact - 1e-6 && len(p.vx, p.vz) >= IDLE_BELOW;
      p.reactClip = (p.reactClip >= dur - 1e-6 || tailCut) ? -1 : Math.min(p.reactClip + DT, dur);
    }
    if (p.kickT >= 0 && p.kickClip) {
      const m = SL.Render.meta(p.kickClip), dur = m ? m.duration_s : 0.3;
      const moving = len(p.vx, p.vz) >= IDLE_BELOW;
      let ends = p.hitT >= 0 || p.slideT >= 0 || p.kickT >= dur - 1e-6;
      if (p.kickClip === "shot") { ends = ends || !moving; p.kickT += len(p.vx, p.vz) * DT / SHOT_CLIP_SPEED; }
      else { ends = ends || (moving && p.kickClip !== "keeper_roll"); p.kickT += DT; }
      p.kickT = ends ? -1 : Math.min(p.kickT, dur);
    }
    if (p.specialPose >= 0) p.specialPose = Math.min(0.5, p.specialPose + DT);
  };

  // What the body shows (archive game/systems/player_controller.gd, _update_body).
  M.cellOf = function (p) {
    const R = SL.Render, look = LOOKS[this.s.hitLook] || "medium";
    if (p.specialPose >= 0) return ["celebrate", p.specialPose, true, p.fx, p.fz];
    if (p.reactClip >= 0) return [p.reactSheet, p.reactClip, true, p.reactDir[0], p.reactDir[1]];
    // a skill move poses the sheets that exist (skills.js, POSE)
    if (p.skill && this.skillPose) { const q = this.skillPose(p); if (q) return q; }
    if (p.slideT >= 0 || p.slideDownT > 0) {
      const m = R.meta("standing_tackle"), dur = m ? m.duration_s : 0.5;
      const t = p.slideT >= 0 ? dur * clamp(p.slideT / C.slideTime, 0, 1) * 0.8 : dur * 0.8;
      return ["standing_tackle", t, true, p.slideDir[0], p.slideDir[1]];
    }
    if (p.sh >= 0 && R.has("shoulder_" + look)) return ["shoulder_" + look, p.sh, true, p.shDir[0], p.shDir[1]];
    if (p.kickT >= 0 && p.kickClip) return [p.kickClip, p.kickT, true, p.kickDir[0], p.kickDir[1]];
    if (p.isKeeper && this.ball.carrier === p) return ["keeper_hold", Math.min(0.09, p.holdT), true, p.fx, p.fz];
    if (p.celebrate >= 0 && len(p.vx, p.vz) < IDLE_BELOW) return ["celebrate", p.celebrate, true, 0.2, 1];
    if (len(p.vx, p.vz) < IDLE_BELOW) {
      const sheet = p.isKeeper ? "idle" : "idle_stand", m = R.meta(R.resolve(p.body, sheet)), cyc = m ? m.cycle_s : 3;
      return [sheet, (p.idleTime % cyc) / cyc, false, p.fx, p.fz];
    }
    return [p.gait, p.phase, false, p.fx, p.fz];
  };

  // ---- Ball ------------------------------------------------------------------------
  M.stepBall = function () {
    const b = this.ball, L = C.length / 2, Wd = C.width / 2, r = C.ballRadius;
    if (b.carrier) {
      const p = b.carrier;
      if (p.isKeeper) { b.x = p.x + p.fx * 0.25; b.z = p.z + p.fz * 0.25; b.y = 0.75; }
      else if (p.skill && this.skillBall && this.skillBall(p, b)) { /* the move places the ball (skills.js) */ }
      else {
        const sp = len(p.vx, p.vz);
        const ahead = 0.32 + Math.min(0.35, sp * 0.03);
        const tx = p.x + p.fx * ahead, tz = p.z + p.fz * ahead;
        b.x += (tx - b.x) * 0.55; b.z += (tz - b.z) * 0.55; b.y = r;
      }
      b.vx = b.carrier.vx; b.vz = b.carrier.vz; b.vy = 0;
      return;
    }
    b.vy -= this.gravity * DT;
    b.x += b.vx * DT; b.y += b.vy * DT; b.z += b.vz * DT;
    if (b.y < r) {
      b.y = r;
      if (b.vy < -1.5) { b.vy = -b.vy * C.restitution; } else b.vy = 0;
    }
    if (b.y <= r + 0.01) { const f = Math.exp(-C.drag * DT); b.vx *= f; b.vz *= f; }
    // goal mouths
    const inMouth = Math.abs(b.z) < C.goalWidth / 2 - r && b.y < C.goalHeight - r;
    if (Math.abs(b.x) > L - r && !b.inGoal) {
      if (inMouth) { this.goalScored(b.x > 0 ? 0 : 1); return; }
      // posts: a ball near the post rings
      if (Math.abs(Math.abs(b.z) - C.goalWidth / 2) < 0.25 && b.y < C.goalHeight) { SL.audio.post(); this.events.push({ type: "post" }); }
      b.x = Math.sign(b.x) * (L - r); b.vx = -b.vx * C.restitution;
    }
    if (Math.abs(b.z) > Wd - r) { b.z = Math.sign(b.z) * (Wd - r); b.vz = -b.vz * C.restitution; }
    if (b.inGoal) { b.vx *= 0.9; b.vz *= 0.9; b.x = clamp(b.x, -L - C.goalDepth + r, L + C.goalDepth - r); b.z = clamp(b.z, -C.goalWidth / 2 + r, C.goalWidth / 2 - r); }
  };

  M.pickups = function () {
    const b = this.ball;
    if (b.carrier || b.inGoal || this.phase !== "live") return;
    const sp = len(b.vx, b.vz);
    let best = null, bd = 9;
    for (const p of this.players) {
      if (p.pickupLock > 0 || stopped(p) || p.slideT >= 0 || p.hitT >= 0 || p.specialPose >= 0) continue;
      // a pass is the receiver's: an opponent has to be right on its line to cut it out
      const passing = b.passFrom && b.passFrom.team !== p.team && sp > 4;
      const reach = p.isKeeper ? C.keeperReach : (passing ? 0.4 : C.pickup);
      const d = len(b.x - p.x, b.z - p.z);
      const high = b.y > (p.isKeeper ? 2.0 : 0.8);
      if (high || d > reach) continue;
      // a hard shot is not trapped by a field player standing in its way
      // the 2 of 2 goes through everyone; a hard shot is not trapped by a field player
      if (b.unstoppable) continue;
      // a shot on its way in is the keeper's reserve to decide (keeperSaves), not his reach
      if (p.isKeeper && b.shotBy && b.shotBy.team !== p.team && sp > 6 && Math.sign(b.vx) === -attackSign(p.team)) continue;
      if (!p.isKeeper && sp > 22 && b.shotBy && b.shotBy.team !== p.team) { b.vx *= 0.55; b.vz *= 0.55; b.vy += 1.5; p.pickupLock = 0.3; continue; }
      if (d < bd) { bd = d; best = p; }
    }
    if (best) {
      if (best.isKeeper && b.shotBy && b.shotBy.team !== best.team) { this.stats.saves[best.team]++; this.addMana(best.team, C.tension.save); }
      this.take(best);
      if (best.isKeeper) best.holdT = 0;
      // the human takes over the player of his team who got the ball
      if (this.s.autoSwitch !== false) for (const h of this.humans) if (h.team === best.team && !best.isKeeper && h.player !== best && !this.humans.some((o) => o.player === best)) this.setHuman(h, best);
    }
  };

  // The keeper's save reserve (archive GDD.md §8.4): decided on the plane 1,5 m out, paid by the shot's speed.
  M.keeperSaves = function () {
    const b = this.ball;
    for (let t = 0; t < 2; t++) {
      const inOther = b.x * attackSign(t) > 0;
      if (inOther) this.reserve[t] = Math.min(this.reserveMax[t], this.reserve[t] + C.recharge * DT);
    }
    if (b.carrier || b.unstoppable || Math.abs(b.vx) < 1 || b.inGoal) return;
    const side = Math.sign(b.vx), line = side * C.length / 2, plane = line - side * C.savePlane;
    const prevX = b.x - b.vx * DT;
    if ((prevX - plane) * side > 0 || (b.x - plane) * side < 0) return;
    const zAt = b.z + b.vz * (line - b.x) / b.vx;
    if (Math.abs(zAt) > C.goalWidth / 2 + C.ballRadius || b.y > C.goalHeight) return;
    const defending = side > 0 ? 1 : 0;
    const keeper = this.players[defending * 5];
    if (keeper.still) return;
    const sp = len(b.vx, b.vz);
    const cost = C.saveCost * clamp(sp / C.shotMax, 0, 1) * (b.charged ? 2 : 1);
    if (this.reserve[defending] >= cost && keeper.react <= 0) {
      this.reserve[defending] -= cost;
      keeper.x = line - side * 0.6; keeper.z = clamp(zAt, -C.goalWidth / 2, C.goalWidth / 2);
      keeper.fx = -side; keeper.fz = 0;
      this.stats.saves[defending]++; this.addMana(defending, C.tension.save);
      b.shotBy = null; this.take(keeper); keeper.holdT = 0;
      SL.audio.save(); this.say("PARATA!", 1.0);
      this.events.push({ type: "save", team: defending });
    }
  };

  M.goalScored = function (team) {
    const b = this.ball;
    if (this.phase !== "live") return;
    const worth = b.unstoppable ? 2 : 1;
    this.score[team] += worth;
    const scorer = b.last && b.last.team === team ? b.last : null;
    this.scorers.push({ team, name: scorer && scorer.card ? scorer.card.name : (team === 0 ? this.opts.home.club.short : this.opts.away.club.short), minute: Math.floor(this.clock / 60) + 1, worth });
    this.addMana(1 - team, C.tension.conceded); this.chain = [0, 0];
    b.inGoal = true; b.carrier = null; b.unstoppable = false;
    this.phase = "goal"; this.phaseT = 0; this.goalTeam = team;
    for (const p of this.players) { p.celebrate = p.team === team ? 0 : -1; p.charge = -1; }
    SL.audio.goal(); SL.audio.whistle(false);
    for (const h of this.humans) if (h.team === team) SL.input.rumble(h.device, 0.7, 1.0, 450);
    this.say(worth === 2 ? "GOL DA DUE!" : "GOOOL!", 2.4);
    this.events.push({ type: "goal", team, worth, chip: !!b.chip, scorer, own: !!(b.last && b.last.team !== team) });
    this.flash = 0.45;
    if (this.golden) { this.endMatch(); }
  };

  M.endMatch = function () {
    this.over = true; this.phase = "end"; this.phaseT = 0;
    SL.audio.whistle(true);
    this.events.push({ type: "end" });
  };

  // ---- Bodies do not pass through each other ----------------------------------------
  M.separate = function () {
    const ps = this.players, min = 2 * C.bodyRadius;
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i], b = ps[j], dx = b.x - a.x, dz = b.z - a.z, d = len(dx, dz);
      if (d >= min || d < 1e-5) continue;
      if (a.hitT >= 0 || b.hitT >= 0) continue;
      const push = (min - d) / 2, ux = dx / d, uz = dz / d;
      a.x -= ux * push; a.z -= uz * push; b.x += ux * push; b.z += uz * push;
    }
  };

  // ---- Humans ----------------------------------------------------------------------
  M.stepHumans = function () {
    for (const h of this.humans) {
      const p = h.player; if (!p) continue;
      const i = readInput(h.team, h.device);
      const was = h.prev;
      const press = (k) => i[k] && !was[k], release = (k) => !i[k] && was[k];
      p.stick = [i.x, i.z]; p.wantSprint = i.sprint;
      // A pass on its way to him: he runs to meet it, as in EA FC, and the stick takes him back
      // once he has it. The stick that aimed the pass, still held, carried him off along the
      // ball's line as fast as it rolls (docs/DETTAGLI.md, "Passaggi").
      if (this.receiving(p)) { const [, x, z] = this.meetPoint(p); this.steer(p, x, z, true); }
      const b = this.ball, mine = b.carrier === p;
      if (this.phase === "live" || this.phase === "kickoff") {
        if (this.special && this.special.shooter === p) { h.prev = i; continue; }
        if (this.humanSkills) this.humanSkills(h, p, i, mine);
        if (press("special")) { if (this.mana[p.team] >= 100) this.tryStartSpecial(p); else if (mine) this.tryCharged(p); }
        if (mine) {
          const assist = this.s.passAssist || "semi";
          if (assist === "assisted") { if (press("pass")) this.pass(p, i.x, i.z, i.mod); }
          else {
            // semi and manual: the hold is the power, the pass goes on release or at full power
            if (press("pass")) p.passCharge = 0;
            if (p.passCharge >= 0 && (!i.pass || p.passCharge >= C.passCharge)) {
              const power = p.passCharge / C.passCharge; p.passCharge = -1;
              this.pass(p, i.x, i.z, i.mod, null, { power, manual: assist === "manual" });
            }
          }
          if (press("shoot")) p.charge = 0;
          if (release("shoot") && p.charge >= 0) {
            const c = p.charge / C.shotCharge; p.charge = -1;
            this.shoot(p, c, (i.z || 0) * 2.0 + p.z * 0.15, i.mod);
          }
          if (press("feint") && p.feintCool <= 0) {
            const side = Math.abs(i.x) + Math.abs(i.z) > 0.2 ? [-p.fz * Math.sign(i.x * -p.fz + i.z * p.fx || 1), p.fx * Math.sign(i.x * -p.fz + i.z * p.fx || 1)] : [-p.fz, p.fx];
            p.feintT = 0; p.feintDir = side; p.feintCool = 0.6;
          }
        } else {
          if (press("shoot")) this.startHit(p);
          if (press("feint") && !stopped(p) && p.slideT < 0 && p.hitT < 0) {
            const m = len(i.x, i.z); p.slideDir = m > 0.2 ? [i.x / m, i.z / m] : [p.fx, p.fz]; p.slideT = 0; SL.audio.whoosh();
          }
          if (press("pass") && b.carrier && b.carrier.team === p.team && b.carrier.ai) this.pass(b.carrier, p.x - b.carrier.x, p.z - b.carrier.z, false);
          if (press("switch")) this.switchHuman(h);
        }
      }
      h.prev = i;
    }
  };

  M.switchHuman = function (h) {
    if (h.lock != null) return;
    const b = this.ball; let best = null, bd = 99;
    for (const q of this.players) {
      if (q.team !== h.team || q.isKeeper || q === h.player || q.human >= 0) continue;
      const tx = b.x + b.vx * 0.35, tz = b.z + b.vz * 0.35, d = len(q.x - tx, q.z - tz);
      if (d < bd) { bd = d; best = q; }
    }
    if (best) this.setHuman(h, best);
  };

  // ---- The special move (archive PRODUCTION.md §6.0) -----------------------------------------
  M.tryStartSpecial = function (p) {
    if (this.special || this.mana[p.team] < 100 || this.ball.carrier !== p || p.isKeeper) return false;
    if (p.x * attackSign(p.team) <= 0) { this.say("Mossa speciale: entra nella metà avversaria", 1.2); return false; }
    this.special = { team: p.team, shooter: p, state: "charge", t: 0, meter: 0, presses: [], hits: -1 };
    p.specialPose = 0; p.vx = p.vz = 0; p.charge = -1;
    this.mana[p.team] = 0;
    SL.audio.special();
    this.events.push({ type: "special", team: p.team });
    return true;
  };
  M.specialInput = function (i, was) {
    const sp = this.special;
    if (sp.state === "meter" && i.special && !was.special) this.specialPress();
  };
  M.specialPress = function () {
    const sp = this.special;
    if (sp.presses.length >= 2) return;
    sp.presses.push(sp.meter);
    SL.audio.meter();
  };
  M.cursorAt = function (t) { return t <= C.sweep ? t / C.sweep : Math.max(0, 1 - (t - C.sweep) / C.sweep); };
  M.stepSpecial = function (realDt) {
    const sp = this.special; if (!sp) return;
    sp.t += realDt;
    if (sp.state === "charge") {
      if (sp.t >= C.chargeTime) { sp.state = "meter"; sp.t = 0; sp.meter = 0; this.timeScale = C.slow; }
    } else if (sp.state === "meter") {
      sp.meter = sp.t;
      // the AI presses on time by difficulty: easy late on both, normal late on the second
      if (sp.shooter.ai) {
        const late = [[4, 4], [0, 4], [0, 0]][this.s.difficulty] || [0, 4];
        const targets = [C.powerTarget * C.sweep + late[0] / 60, C.sweep + (1 - C.aimTarget) * C.sweep + late[1] / 60];
        if (sp.presses.length < 2 && sp.meter >= targets[sp.presses.length]) this.specialPress();
      }
      if (sp.t >= 2 * C.sweep || sp.presses.length >= 2) this.resolveSpecial();
    } else if (sp.state === "result") {
      if (sp.t >= 1.5) this.special = null;
    }
  };
  M.resolveSpecial = function () {
    const sp = this.special, p = sp.shooter;
    const pt = C.powerTarget * C.sweep, at = C.sweep + (1 - C.aimTarget) * C.sweep;
    const okP = sp.presses.length > 0 && Math.abs(sp.presses[0] - pt) <= C.window;
    const okA = sp.presses.length > 1 && Math.abs(sp.presses[1] - at) <= C.window;
    sp.hits = (okP ? 1 : 0) + (okA ? 1 : 0);
    sp.state = "result"; sp.t = 0;
    this.timeScale = 1; p.specialPose = -1;
    const s = attackSign(p.team), line = s * C.length / 2;
    const b = this.ball;
    if (b.carrier !== p) { b.carrier = p; }
    let tz = 0, speed = 30;
    if (sp.hits === 2) { tz = (p.z > 0 ? -1 : 1) * 1.2; speed = 34; }
    else if (sp.hits === 1) { tz = clamp(-p.z * 0.3, -1.6, 1.6); speed = 28; }
    else { tz = (p.z >= 0 ? 1 : -1) * (C.goalWidth / 2 + 1.0); speed = 24; }
    const rx = line - p.x, rz = tz - p.z, d = len(rx, rz) || 1;
    this.kick(p, rx / d * speed, 0.9, rz / d * speed, "shot");
    if (sp.hits === 2) { b.unstoppable = true; b.worth = 2; }
    this.say(["Mossa speciale: 0 su 2", "Mossa speciale: 1 su 2", "COLPO DELLA COMETA — 2 su 2"][sp.hits], 1.6);
    this.camShake = sp.hits === 2 ? 0.02 : 0.008;
    for (let k = 0; k < (sp.hits === 2 ? 50 : 18); k++) this.particles.push({ x: p.x, z: p.z, y: 0.6, vx: (this.rng() - 0.5) * 8, vz: (this.rng() - 0.5) * 8, vy: 2 + this.rng() * 5, t: 0.6 + this.rng() * 0.5 });
    this.events.push({ type: "specialResult", hits: sp.hits, team: p.team });
  };

  // ---- AI: the decisions live in ai.js; here what they steer with --------------------------
  M.thinkAi = function () { SL.AI.think(this); };

  M.steer = function (p, tx, tz, sprint) {
    const dx = tx - p.x, dz = tz - p.z, d = len(dx, dz);
    if (d < 0.15) { p.stick = [0, 0]; return; }
    const accel = C.run / C.accelTime, stop = accel * C.stopRateMult;
    const top = C.run * (sprint ? C.sprintMult : 1);
    const want = Math.min(top, Math.sqrt(2 * stop * Math.max(0, d - 0.1)));
    p.stick = [dx / d * want / top, dz / d * want / top];
    p.wantSprint = sprint && want > C.run * 0.95;
  };

  // The keeper with the ball rolls it out after a second to the mate with the most open lane.
  M.aiKeeperRelease = function (p) {
    p.holdT += 0.1;
    p.stick = [0, 0];
    if (p.holdT < C.keeperHold) return;
    let best = null, bs = -1;
    for (const q of this.players) if (q.team === p.team && q !== p) { const lane = this.laneOpen(p.x, p.z, q.x, q.z, p.team); const sc = lane - len(q.x - p.x, q.z - p.z) * 0.03 + SL.AI.threat(q.x, q.z, attackSign(p.team)) * 0.4; if (sc > bs) { bs = sc; best = q; } }
    if (!best) return;
    const rx = best.x - p.x, rz = best.z - p.z, d = len(rx, rz) || 1, sp = Math.min(13, Math.max(8, 5 + d * 0.8));
    this.kick(p, rx / d * sp, 0, rz / d * sp, "roll");
    p.pickupLock = 1.0;   // he follows the ball along his line: not back into his own hands
    this.ball.passFrom = p; this.ball.passTo = best;
    for (const h of this.humans) if (h.team === p.team) this.setHuman(h, best);
  };
  // The keeper takes the ball from a carrier who walks into his reach (archive GDD.md §8.4, the free claim).
  M.aiKeeperClaim = function (p) {
    const b = this.ball;
    if (b.carrier && b.carrier.team !== p.team && !(this.special && this.special.shooter === b.carrier)
        && len(b.carrier.x - p.x, b.carrier.z - p.z) < C.keeperReach) {
      const c = b.carrier; this.release(); this.take(p); p.holdT = 0; c.pickupLock = 0.6; this.say("Presa del portiere", 1); this.events.push({ type: "claim", team: p.team });
    }
  };

  // ---- One step ----------------------------------------------------------------------
  M.step = function () {
    if (this.hitstop > 0) { this.hitstop--; return; }
    this.phaseT += DT;
    if (this.messageT > 0) this.messageT -= DT;
    if (this.flash > 0) this.flash = Math.max(0, this.flash - DT * 1.5);
    this.camShake = Math.max(0, (this.camShake || 0) - DT * 0.06);
    if (this.phase === "kickoff" && this.phaseT >= C.kickoffHold) { this.phase = "live"; SL.audio.whistle(false); }
    if (this.phase === "goal") {
      for (const p of this.players) if (p.celebrate >= 0) p.celebrate += DT;
      if (this.phaseT >= C.goalPause) { this.ball.inGoal = false; if (!this.over) this.resetKickoff(1 - this.goalTeam); }
    }
    if (this.phase === "end") { for (const p of this.players) { p.stick = [0, 0]; this.move(p, 0, 0, false); this.advanceGait(p); } return; }
    if (this.phase === "live") {
      this.clock += DT;
      // not in free play (training and the base challenges, minutes 999): there the bar waits
      if (this.length < 5000) for (let t = 0; t < 2; t++) if (this.mana[t] >= 100 && !this.special && this.clock - this.fullAt[t] > C.tension.fullHold) {
        this.mana[t] = 2 * C.tension.notch;
        if (this.humans.some((h) => h.team === t)) this.say("Tensione scesa a due tacche", 1.4);
        this.events.push({ type: "tensionDrop", team: t });
      }
      if (this.ball.carrier) this.stats.possession[this.ball.carrier.team] += DT;
      if (this.clock >= this.length && !this.golden) {
        if (this.score[0] === this.score[1] && this.s.goldenGoal) { this.golden = true; this.say("GOL D'ORO: chi segna vince", 2.5); SL.audio.whistle(false); this.events.push({ type: "golden" }); }
        else this.endMatch();
      }
    }
    const live = this.phase === "live" || this.phase === "kickoff";
    if (!this.aiTick || this.aiTick <= 0) { if (live) this.thinkAi(); this.aiTick = 0.1; } else this.aiTick -= DT;
    // the kickoff: everyone holds, the taker too, until the whistle
    const kickoff = this.phase === "kickoff";
    if (this.phase === "goal") for (const p of this.players) { if (p.ai || true) { p.stick = [0, 0]; p.wantSprint = false; } }
    if (kickoff) for (const p of this.players) if (p.ai) { p.stick = [0, 0]; p.wantSprint = false; p.charge = -1; }
    this.stepHumans();
    SL.input.clearTaps();
    // a person who moves or plays the ball starts the match: the whistle goes at once
    if (kickoff && this.humans.some((h) => h.player && (len(h.player.stick[0], h.player.stick[1]) > 0.2 || this.ball.carrier !== h.player && this.ball.last === h.player))) {
      this.phase = "live"; this.phaseT = 0; SL.audio.whistle(false);
    }
    if (this.phase === "goal") for (const p of this.players) p.stick = [0, 0];
    // AI carriers keep charging a shot between thinks
    for (const p of this.players) this.stepPlayer(p);
    this.separate();
    this.stepBall();
    if (this.phase === "live") { this.pickups(); this.keeperSaves(); }
    for (const q of this.particles) { q.t -= DT; q.x += q.vx * DT; q.z += q.vz * DT; q.y += q.vy * DT; q.vy -= 9 * DT; }
    this.particles = this.particles.filter((q) => q.t > 0);
  };

  // Advance by real seconds: the special move slows the world, not its meter.
  // Events gather over every step of one update, for the UI and the commentary to read once.
  M.update = function (realDt) {
    this.events.length = 0;
    this.acc = (this.acc || 0) + realDt * this.timeScale;
    this.stepSpecial(realDt);
    // the meter's presses are read every frame on its own real clock, not on the slowed steps
    const sp = this.special;
    if (sp && sp.state === "meter") for (const h of this.humans) {
      if (h.player !== sp.shooter) continue;
      const i = readInput(h.team, h.device);
      if (i.special && !h.prevSp) this.specialPress();
      h.prevSp = i.special;
      SL.input.clearTaps();
    } else for (const h of this.humans) h.prevSp = readInput(h.team, h.device).special;
    let n = 0;
    while (this.acc >= DT && n < 6) { this.step(); this.acc -= DT; n++; }
    if (n === 6) this.acc = 0;
  };

  // ---- Drawing -----------------------------------------------------------------------
  M.draw = function (zoom) {
    const R = SL.Render, b = this.ball;
    // Impostazioni > Telecamera: how fast it reaches the ball, and whether it looks ahead of
    // the carrier (settings.js)
    const lead = this.s.camLead === false ? 0 : 1, rate = [1.6, 3.2, 6.0][this.s.camFollow == null ? 1 : this.s.camFollow];
    const focus = b.carrier ? b.carrier.x + b.carrier.vx * 0.3 * lead : b.x + b.vx * 0.2 * lead;
    this.camX += (focus - this.camX) * (1 - Math.exp(-rate / 60));
    R.cam.shake = this.s.shake === false ? 0 : this.camShake || 0;
    const focusZ = b.carrier ? b.carrier.z + b.carrier.vz * 0.15 * lead : b.z;
    this.camZ = (this.camZ || 0) + (focusZ - (this.camZ || 0)) * (1 - Math.exp(-rate * 0.75 / 60));
    R.setCamera(this.camX, this.camZ, zoom, C.length, C.width);
    R.begin();
    const list = [];
    for (const p of this.players) list.push({ z: p.z, p });
    list.push({ z: b.z + 0.001, ball: true });
    list.sort((a, c) => a.z - c.z);
    // shadows and rings first, on the grass
    for (const p of this.players) {
      R.shadow(p.x, p.z, 0.9);
      if (p.human >= 0) R.ring(p.x, p.z, p.human === 0 ? [1, 0.86, 0.12, 0.95] : [0.3, 0.85, 1, 0.95], 1.05);
    }
    // the mate a pass is meant for, marked while the ball travels
    if (b.passTo && !b.carrier && b.passFrom && b.passFrom.team === b.passTo.team) R.ring(b.passTo.x, b.passTo.z, [1, 1, 1, 0.6], 0.7);
    R.shadow(b.x, b.z, 0.32 + Math.min(0.3, b.y * 0.05));
    for (const e of list) {
      if (e.ball) { R.ball(b.x, b.y, b.z, C.ballRadius); continue; }
      const p = e.p, [sheet, t, byTime, fx, fz, lift] = this.cellOf(p);
      const name = R.resolve(p.isKeeper ? "" : p.body, sheet);
      let tint = null;
      if (p.react > 0 && Math.floor(p.react * 20) % 2 === 0) tint = [1, 1, 1, 0.75];
      R.sprite(name, R.columnFor(name, t, byTime), fx, fz, p.x, p.z, p.palRow, tint, lift || 0, p.isKeeper ? 1 : p.height, p.pattern);
    }
    if (b.carrier && !b.carrier.isKeeper) R.arrow(b.carrier.x, b.carrier.z, 2.3, b.carrier.team === 0 ? hexTint(this.opts.home.kit) : hexTint(this.opts.away.kit));
    for (const q of this.particles) R.spark(q.x, q.z, q.y, 0.5, [1, 0.9, 0.5, Math.min(1, q.t * 2)]);
    // the power of a pass or shot being held: an arc round the player, full at full power
    for (const p of this.players) {
      const c = p.human < 0 ? -1 : p.passCharge >= 0 ? p.passCharge / C.passCharge : p.charge >= 0 ? p.charge / C.shotCharge : -1;
      if (c < 0) continue;
      const col = p.passCharge >= 0 ? [0.55, 0.9, 1, 0.95] : [1, 0.55, 0.25, 0.95], n = Math.max(1, Math.round(c * 18));
      for (let k = 0; k < n; k++) { const a = -Math.PI / 2 + k / 18 * 6.283; R.spark(p.x + Math.cos(a) * 0.62, p.z + Math.sin(a) * 0.62, 0.05, 0.32, col); }
    }
    if (this.special && this.special.state !== "result") {
      const p = this.special.shooter, t = performance.now() / 1000;
      for (let k = 0; k < 14; k++) { const a = k / 14 * 6.283 + t * 3; R.spark(p.x + Math.cos(a) * 0.9, p.z + Math.sin(a) * 0.9, 0.2 + (k % 3) * 0.5, 0.55, [1, 0.75, 0.3, 0.9]); }
    }
    if (this.s.weather !== false) R.weather(performance.now() / 1000);
    R.front();
    if (this.flash > 0) R.flash(this.flash * 0.5);
  };
  function hexTint(h) { return [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255, 1]; }
})();

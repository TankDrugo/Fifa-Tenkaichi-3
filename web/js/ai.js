// Strike Legends (browser) - the team AI. What it takes from where (docs/DETTAGLI.md, "IA"):
//   - shape by ball position: each formation spot moves with the ball, pushed up and widened in
//     possession, dropped, narrowed and slid to the ball's side without it (the RoboCup 2D
//     positioning of Akiyama and Noda, there by Delaunay triangulation, here by a linear rule);
//   - support spots: an attacker without the ball scores points around his spot by open passing
//     lane, space, threat and spacing, and takes the best (Buckland, "Programming Game AI by
//     Example", Simple Soccer's SupportSpotCalculator);
//   - space as time: a point belongs to whoever reaches it first, by distance over speed plus a
//     reaction time (Spearman's pitch control; Fernández and Bornn, "Wide Open Spaces");
//   - threat by position: a value for each point growing toward goal and toward the middle, and an
//     action valued by the threat it gains times its chance of working (Singh's expected threat);
//   - defending by roles: the first defender presses between the carrier and the goal, the second
//     covers behind him, the others cut the lanes to the most dangerous receivers, assigned so the
//     total run is the shortest;
//   - the keeper on the line from the middle of the goal toward the ball, coming out as it nears
//     (the line-based keeper of the TU Delft AI World Cup study);
//   - difficulty as reaction time and decision noise (Google Research Football's built-in bot).
"use strict";

(function () {
  const SL = window.SL, C = SL.C;
  const len = (x, z) => Math.hypot(x, z);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sign = (t) => (t === 0 ? 1 : -1);
  const L = C.length / 2, Wd = C.width / 2;
  // reaction (s) before a carrier acts or a team turns from attack to defence, noise on choices,
  // how close the presser stands off the carrier, how often a defender tries a slide (per second
  // in reach), how often a pressed carrier tries a skill move (per think) and how much less a
  // defender falls for one (skills.js)
  const SKILL = [
    { react: 0.42, noise: 0.5, jockey: 1.7, slide: 0.05, lead: 0.7, trick: 0.01, wary: -0.1 },
    { react: 0.26, noise: 0.25, jockey: 1.35, slide: 0.12, lead: 0.88, trick: 0.02, wary: 0 },
    { react: 0.14, noise: 0.08, jockey: 1.1, slide: 0.22, lead: 1.0, trick: 0.035, wary: 0.1 },
  ];

  // ---- Player roles (EA FC 25's FC IQ, docs/DETTAGLI.md "Ruoli") ----------------------------------
  // Each role is a set of offsets on what the AI already does; the first role of each place has
  // none, so it plays as before. push: metres forward of the attacking spot; width: x the spot's
  // distance from the middle; central: pull toward the middle when choosing a support spot;
  // threat, safe: extra weight on the support spot's danger and on a safe pass to it; near: pull
  // toward the carrier beyond 6 m; back: 1 drops into the defending shape like now, 0 stays up at
  // the halfway line and leaves the defending tasks to the others; press: preference for the
  // pressing task; jockey: metres closer than the presser's usual distance; shoot: change to the
  // open lane a shot needs (negative shoots sooner); pass, dribble: bonus to that choice on the
  // carrier's scale; depth: a keeper's distance off his line, x(1 + depth).
  const ROLES = {
    avanzato: { pos: "ATT", name: "Attaccante avanzato", fc: "Advanced Forward", desc: "Sulla linea dei difensori: si apre per il passaggio e attacca la profondità" },
    torre: { pos: "ATT", name: "Torre", fc: "Target Forward", desc: "Resta alto e centrale, protegge palla e la scarica ai compagni", push: 2.0, width: 0.25, central: 0.6, back: 0.15, pass: 0.15 },
    rapinatore: { pos: "ATT", name: "Rapinatore", fc: "Poacher", desc: "Vive in area: aspetta il pallone per tirare", push: 2.0, width: 0.6, threat: 0.8, back: 0.3, shoot: -0.08, pass: -0.04 },
    falso9: { pos: "ATT", name: "Falso nueve", fc: "False 9", desc: "Arretra fra le linee a cucire il gioco e torna a difendere", push: -2.5, pass: 0.12, safe: 0.4, near: 0.5 },
    ala: { pos: "ALA", name: "Ala", fc: "Winger", desc: "Larga sulla fascia, punta l'uomo" },
    alainterna: { pos: "ALA", name: "Ala interna", fc: "Inside Forward", desc: "Parte larga e taglia verso la porta per tirare", width: 0.7, central: 0.3, threat: 0.5, shoot: -0.06 },
    regialargo: { pos: "ALA", name: "Regista largo", fc: "Wide Playmaker", desc: "Larga e più bassa, cerca il passaggio", push: -1.5, width: 1.2, pass: 0.1, safe: 0.5 },
    boxtobox: { pos: "CEN", name: "Box to box", fc: "Box-to-Box", desc: "Segue il pallone da un'area all'altra" },
    regista: { pos: "CEN", name: "Regista", fc: "Deep-Lying Playmaker", desc: "Basso e vicino a chi ha palla: gioca corto e sicuro", push: -2.0, pass: 0.12, safe: 0.6, near: 0.8 },
    mediano: { pos: "CEN", name: "Mediano", fc: "Holding", desc: "Davanti alla difesa: non sale e pressa per primo", push: -3.5, press: 0.6 },
    difensore: { pos: "DIF", name: "Difensore", fc: "Defender", desc: "Resta dietro e copre" },
    stopper: { pos: "DIF", name: "Stopper", fc: "Stopper", desc: "Esce sull'uomo e cerca la spallata", push: 0.5, press: 0.8, jockey: 0.3 },
    impostatore: { pos: "DIF", name: "Difensore regista", fc: "Ball-Playing Defender", desc: "Imposta da dietro, sale a giocare", push: 1.0, pass: 0.1, safe: 0.3 },
    portiere: { pos: "POR", name: "Portiere", fc: "Goalkeeper", desc: "Fra i pali" },
    libero: { pos: "POR", name: "Portiere libero", fc: "Sweeper Keeper", desc: "Più fuori dai pali, chiude lo spazio dietro la difesa", depth: 0.8 },
  };
  const ROLE_ORDER = Object.keys(ROLES);
  const rolesFor = (pos) => ROLE_ORDER.filter((k) => ROLES[k].pos === pos);
  // Familiarity (EA FC's Role+ and Role++): how far the role's offsets apply, x FAM_SCALE.
  const FAM_SCALE = [0.6, 1.0, 1.25], FAM_MARK = ["", "+", "++"];
  // A card's familiar roles, from its statistics within its own place: the best fitting role is
  // ++ from 80 up, + below; the second is + from 70 up. Torre leans on FIS, Rapinatore on TIR,
  // Falso nueve and the playmakers on PAS, Ala and Box to box on VEL.
  const FIT = {
    avanzato: (c) => c.vel + c.tir, torre: (c) => c.fis * 2, rapinatore: (c) => c.tir * 2 + 1, falso9: (c) => c.pas * 2,
    ala: (c) => c.vel * 2 + 1, alainterna: (c) => c.tir + c.vel, regialargo: (c) => c.pas * 2,
    boxtobox: (c) => c.vel + c.fis + 1, regista: (c) => c.pas * 2, mediano: (c) => c.fis * 2,
    difensore: (c) => c.fis + c.vel + 1, stopper: (c) => c.fis * 2, impostatore: (c) => c.pas * 2,
    portiere: (c) => c.ovr * 2 + 1, libero: (c) => c.vel * 2,
  };
  function cardRoles(card) {
    const out = {};
    if (!card) return out;
    const list = rolesFor(card.role).sort((a, b) => FIT[b](card) - FIT[a](card));
    if (list[0]) out[list[0]] = card.ovr >= 80 ? 2 : 1;
    if (list[1] && card.ovr >= 70) out[list[1]] = 1;
    return out;
  }
  // The role a player takes when nobody chose one: his most familiar for the place, else the
  // place's first.
  function defaultRole(card, pos) {
    const fam = cardRoles(card), list = rolesFor(pos);
    return list.filter((k) => fam[k]).sort((a, b) => fam[b] - fam[a])[0] || list[0];
  }
  // The role's offsets for p, scaled by his familiarity; a missing offset is 0 (width, back: 1).
  function roleOf(p) {
    if (p._roleCache && p._roleCache.id === p.role) return p._roleCache;
    const r = ROLES[p.role] || {}, f = FAM_SCALE[p.fam || 0];
    const v = (k) => (r[k] || 0) * f, around1 = (k) => 1 + ((r[k] === undefined ? 1 : r[k]) - 1) * f;
    p._roleCache = { id: p.role, push: v("push"), width: around1("width"), central: v("central"), threat: v("threat"), safe: v("safe"), near: v("near"), back: Math.max(0, around1("back")), press: v("press"), jockey: v("jockey"), shoot: v("shoot"), pass: v("pass"), dribble: v("dribble"), depth: v("depth") };
    return p._roleCache;
  }

  // Threat of a point for the team attacking toward sx: higher near the goal and in the middle.
  function threat(x, z, sx) {
    const gx = sx * L, d = len(gx - x, z);
    const angle = Math.atan2(C.goalWidth / 2, Math.max(0.5, Math.abs(gx - x))) / Math.atan2(C.goalWidth / 2, 0.5);
    return clamp(Math.exp(-d / 7.5) * (0.55 + 0.45 * angle), 0, 1);
  }
  // Who reaches (x, z) first: > 0.5 for team t.
  function control(m, x, z, t, self) {
    let ta = 9, td = 9;
    for (const p of m.players) {
      if (p.isKeeper && Math.abs(x) < L - 3) continue;
      const tt = len(p.x - x, p.z - z) / (C.run * (p.speedScale || 1)) + (p.team === t ? 0 : 0.2);
      if (p.team === t) ta = Math.min(ta, p === self ? tt * 0.9 : tt + 0.15);
      else td = Math.min(td, tt);
    }
    return 1 / (1 + Math.exp(-(td - ta) * 3));
  }

  // How safe a ground pass from (ax, az) to (bx, bz) is: for every opponent, the time he needs
  // to reach the ball's path against the time the ball needs to get there (the pass probability
  // of Soccermatics, lesson 6). 1 nobody gets there, 0 someone is there first.
  function passSafety(m, ax, az, bx, bz, t, speed) {
    const dx = bx - ax, dz = bz - az, D = len(dx, dz) || 1, ux = dx / D, uz = dz / D;
    const v = speed || Math.min(C.passSpeed, 6 + D * 1.4);
    let worst = 9;
    for (const o of m.players) {
      if (o.team === t) continue;
      // the point of the path nearest to him, not behind the passer, not beyond the receiver
      const s = clamp((o.x - ax) * ux + (o.z - az) * uz, 0.6, D);
      const px = ax + ux * s, pz = az + uz * s;
      const reach = o.isKeeper ? C.keeperReach : 0.4;
      const tOpp = Math.max(0, len(o.x - px, o.z - pz) - reach) / (C.run * (o.speedScale || 1)) + 0.12;
      const tBall = s / v;
      worst = Math.min(worst, tOpp - tBall);
    }
    return 1 / (1 + Math.exp(-(worst - 0.05) * 9));
  }

  // How open the line of a shot from p to (gx, z) is: a field player within 0,6 m of it traps or
  // deflects the ball (match.js, pickups); 1 at 1,4 m or more. The keeper is left out: his
  // reserve decides the save, not where he stands.
  function shotLane(m, p, gx, z) {
    const dx = gx - p.x, dz = z - p.z, D2 = dx * dx + dz * dz || 1;
    let worst = 9;
    for (const o of m.players) {
      if (o.team === p.team || o.isKeeper) continue;
      const t = ((o.x - p.x) * dx + (o.z - p.z) * dz) / D2;
      if (t < 0.03 || t > 1) continue;
      // he also moves while the ball travels: a little margin for every metre of distance
      const dist = len(p.x + dx * t - o.x, p.z + dz * t - o.z) - t * Math.sqrt(D2) * 0.03;
      worst = Math.min(worst, dist);
    }
    return clamp((worst - 0.45) / 0.7, 0, 1);
  }

  function skillOf(m, t) {
    if (m.skillOverride) return SKILL[m.skillOverride[t]];
    const h = m.humans.length ? m.humans[0].team : -1;
    const two = new Set(m.humans.map((x) => x.team)).size > 1;
    // the team against a lone person takes the difficulty; the person's mates and AI-only matches play normal-plus
    const d = (!two && h >= 0 && t !== h) ? m.s.difficulty : (h < 0 ? m.s.difficulty : 1);
    return SKILL[d == null ? 1 : d] || SKILL[1];
  }

  // ---- The team's shape ----------------------------------------------------------------------
  // The formation spot of a player in the frame attacking +x, moved by the ball and the phase.
  function anchor(m, p, phase) {
    const sx = sign(p.team), base = m.spots[p.team][p.slot], ro = roleOf(p);
    const bx = m.ball.x * sx, bz = m.ball.z * (p.team === 0 ? 1 : -1);
    let x, z;
    if (phase === "attack") {
      x = base[0] + 4.0 + ro.push + clamp(bx, -12, 12) * 0.5;
      z = base[1] * 1.2 * ro.width + bz * 0.18;
      x = clamp(x, -11.5, 11.8);
    } else {
      x = base[0] - 0.5 + clamp(bx, -12, 12) * 0.42;
      z = base[1] * 0.78 + bz * 0.38;
      // nobody stays more than 9 m behind the ball's line, nobody steps beyond it in front
      x = clamp(x, bx - 9.5, Math.min(bx + 0.5, 6));
      x = clamp(x, -12.6, 9);
      // a role that stays up (back < 1) waits nearer the halfway line
      if (ro.back < 1) x = Math.max(x, x + (1 - ro.back) * (-0.5 - x));
    }
    z = clamp(z, -Wd + 0.8, Wd - 0.8);
    return [x * sx, z * (p.team === 0 ? 1 : -1)];
  }

  // ---- Attack without the ball: the best support spot near the anchor -------------------------
  const RING = [[0, 0]];
  for (let k = 0; k < 8; k++) for (const r of [1.8, 3.4, 5.0]) RING.push([Math.cos(k * Math.PI / 4) * r, Math.sin(k * Math.PI / 4) * r]);
  function supportSpot(m, p, carrier, taken) {
    const [ax, az] = anchor(m, p, "attack"), sx = sign(p.team), ro = roleOf(p);
    let best = null, bs = -1e9;
    for (const [ox, oz] of RING) {
      const x = clamp(ax + ox, -L + 1, L - 1), z = clamp(az + oz, -Wd + 0.6, Wd - 0.6);
      let sc = 0;
      if (carrier) {
        const d = len(x - carrier.x, z - carrier.z);
        sc += 2.2 * (1 + ro.safe) * passSafety(m, carrier.x, carrier.z, x, z, p.team);
        sc -= d < 3.5 ? (3.5 - d) * 0.35 : d > 11 ? (d - 11) * 0.15 : 0;
        if (ro.near && d > 6) sc -= ro.near * (d - 6) * 0.15;
      }
      sc += 1.0 * control(m, x, z, p.team, p);
      sc += 2.3 * (1 + ro.threat) * threat(x, z, sx);
      if (ro.central) sc -= ro.central * Math.abs(z) * 0.25;
      for (const q of taken) { const dd = len(q[0] - x, q[1] - z); if (dd < 3.2) sc -= (3.2 - dd) * 0.5; }
      sc -= len(x - ax, z - az) * 0.06;
      if (p.aiSpot && len(p.aiSpot[0] - x, p.aiSpot[1] - z) < 0.6) sc += 0.18;     // keep a choice
      if (sc > bs) { bs = sc; best = [x, z]; }
    }
    return best;
  }

  // ---- Attack with the ball ---------------------------------------------------------------------
  function carrierThink(m, p, sk) {
    const sx = sign(p.team), gx = sx * L;
    if (p.skill) return;
    p.aiHold = (p.aiHold || 0) + 0.1;
    const dGoal = len(gx - p.x, p.z);
    let nearest = 99;
    for (const o of m.players) if (o.team !== p.team && !o.isKeeper) nearest = Math.min(nearest, len(o.x - p.x, o.z - p.z));
    // the comet near the goal; with less than 8 s left on the full bar, anywhere in the other half
    const fading = m.length < 5000 && m.clock - m.fullAt[p.team] > C.tension.fullHold - 8;
    if (m.mana[p.team] >= 100 && !m.special && ((p.x * sx > 4 && dGoal < 12) || (fading && p.x * sx > 0))) { if (m.tryStartSpecial(p)) return; }
    // a shot being charged goes on to its strength, unless a defender closes the line first
    if (p.charge >= 0) {
      const open = shotLane(m, p, gx, p.aiAim);
      if (open < 0.15 && p.charge < C.shotCharge * 0.4) { p.charge = -1; p.aiHold = sk.react; }
      else if (p.charge >= p.aiChargeTo || open < 0.3) { const c = p.charge / C.shotCharge; p.charge = -1; m.shoot(p, c, p.aiAim, false); p.aiHold = 0; return; }
      else { m.steer(p, gx - sx * 1.5, p.z * 0.9, false); return; }
    }
    if (p.aiHold < sk.react) { m.steer(p, p.x + p.fx * 1.5, p.z + p.fz * 1.5, false); return; }
    const noise = () => (m.rng() - 0.5) * sk.noise * 0.3;
    const def = 1 - p.team, reserve = m.reserve[def];
    const here = threat(p.x, p.z, sx);

    // Shooting is a rule more than a value: the keeper's reserve decides a save, not the distance
    // (match.js, keeperSaves), so a clear line in range is a shot, a saved one empties the
    // reserve, and with the reserve under a save's cost even a half-open line is worth it.
    if (dGoal < 12.5) {
      let lane = -1, aim = 0;
      for (const z of [-1.8, -1.2, -0.6, 0, 0.6, 1.2, 1.8]) { const o = shotLane(m, p, gx, z) + (m.rng() - 0.5) * sk.noise * 0.2; if (o > lane) { lane = o; aim = z; } }
      const low = reserve < C.saveCost * 0.9;
      const need = (low ? 0.15 : dGoal < 6 ? 0.2 : dGoal < 9.5 ? 0.33 : 0.55) + roleOf(p).shoot;
      if (lane >= need + noise()) {
        // the tension is saved for the comet; in the last 40 s what is left goes on charged shots
        // (match.js, tryCharged)
        const late = m.length < 5000 && m.length - m.clock < 40;
        if (late && m.mana[p.team] >= C.tension.notch && m.mana[p.team] < 100) m.tryCharged(p);
        p.charge = 0; p.aiAim = aim; p.aiChargeTo = Math.min(C.shotCharge, (nearest < 2.2 ? 0.1 : 0.22) + dGoal * 0.05);
        return;
      }
    }
    // Passing and dribbling on one scale: the threat after the action times its chance, less what
    // losing the ball there would give the other team.
    let pass = -1, passTo = null;
    for (const q of m.players) {
      if (q.team !== p.team || q === p || q.isKeeper) continue;
      const d = len(q.x - p.x, q.z - p.z); if (d < 2.2 || d > 15) continue;
      const tx = q.x + q.vx * 0.35, tz = q.z + q.vz * 0.35;
      const ok = passSafety(m, p.x, p.z, tx, tz, p.team) * (0.55 + 0.45 * control(m, tx, tz, p.team, q));
      const v = ok * (threat(tx, tz, sx) + 0.04) - (1 - ok) * 0.6 * threat((p.x + tx) / 2, (p.z + tz) / 2, -sx) + noise();
      if (v > pass) { pass = v; passTo = q; }
    }
    let drib = -1, dx = p.fx, dz = p.fz;
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4, ux = Math.cos(a), uz = Math.sin(a);
      const tx = clamp(p.x + ux * 2.6, -L + 0.6, L - 0.6), tz = clamp(p.z + uz * 2.6, -Wd + 0.5, Wd - 0.5);
      let room = 9;
      for (const o of m.players) if (o.team !== p.team && !o.isKeeper) room = Math.min(room, len(o.x - tx, o.z - tz) - len(o.x - p.x, o.z - p.z) * 0.25);
      const ok = 1 / (1 + Math.exp(-(room - 1.3) * 2.4));
      const v = ok * threat(tx, tz, sx) - (1 - ok) * 0.6 * threat(p.x, p.z, -sx) + noise();
      if (v > drib) { drib = v; dx = ux; dz = uz; }
    }
    // a free carrier waits a moment for a better pass; a pressed one moves the ball
    const pressed = nearest < 1.5;
    if (pressed && m.aiSkill && m.rng() < sk.trick && m.aiSkill(p)) return;
    const patience = pressed ? 0 : p.aiHold < 0.8 ? 0.05 : 0;
    const ro = roleOf(p);
    if (passTo && pass + ro.pass > drib + ro.dribble + patience && pass + ro.pass > here * 0.6) {
      const lane = m.laneOpen(p.x, p.z, passTo.x, passTo.z, p.team);
      m.pass(p, passTo.x - p.x, passTo.z - p.z, lane < 0.35 && len(passTo.x - p.x, passTo.z - p.z) > 5, passTo);
      p.aiHold = 0;
      return;
    }
    m.steer(p, p.x + dx * 3, p.z + dz * 3, !pressed && drib > here && dGoal > 5);
  }

  // ---- Defending ------------------------------------------------------------------------------
  // Tasks for the four outfield defenders, assigned by the shortest total run (24 orders).
  function defend(m, t, carrier, sk, out) {
    const sx = sign(t), own = -sx * L;
    // a role that stays up (back under 0,5) keeps out of the tasks while three others can take them
    let ds = m.players.filter((p) => p.team === t && !p.isKeeper && p.ai && !p.still);
    const stay = ds.filter((p) => roleOf(p).back < 0.5);
    if (stay.length && ds.length - stay.length >= 3) { for (const p of stay) out.set(p, { kind: "zone", x: anchor(m, p, "defend")[0], z: anchor(m, p, "defend")[1] }); ds = ds.filter((p) => !stay.includes(p)); }
    const tasks = [];
    const cx = carrier.x + carrier.vx * 0.25, cz = carrier.z + carrier.vz * 0.25;
    // 1 the presser, between carrier and goal
    { const dx = own - cx, dz = -cz * 0.5, d = len(dx, dz) || 1; tasks.push({ kind: "press", x: cx + dx / d * sk.jockey, z: cz + dz / d * sk.jockey, w: 2.2 }); }
    // 2 the cover, 4,5 m behind the presser and 1,4 m toward the middle: the space a dribble
    // past him would go into
    { const dx = own - cx, dz = -cz, d = len(dx, dz) || 1, r = Math.min(4.5, d * 0.55); tasks.push({ kind: "cover", x: cx + dx / d * r, z: cz + dz / d * r - Math.sign(cz || 1) * 1.4, w: 1.2 }); }
    // 3-4 the lanes to the two most dangerous receivers, nearer the receiver, goal side
    const recv = m.players.filter((q) => q.team !== t && q !== carrier && !q.isKeeper)
      .map((q) => ({ q, v: threat(q.x, q.z, -sx) + 0.6 * m.laneOpen(carrier.x, carrier.z, q.x, q.z, carrier.team) }))
      .sort((a, b) => b.v - a.v);
    for (const { q } of recv.slice(0, 2)) {
      const f = 0.72, x = carrier.x + (q.x - carrier.x) * f, z = carrier.z + (q.z - carrier.z) * f;
      const gdx = own - q.x, gdz = -q.z, gd = len(gdx, gdz) || 1;
      tasks.push({ kind: "mark", x: x * 0.6 + (q.x + gdx / gd * 1.1) * 0.4, z: z * 0.6 + (q.z + gdz / gd * 1.1) * 0.4, w: 1.0 });
    }
    // fill with the zone spots
    while (tasks.length < ds.length) { const p = ds[tasks.length]; const [x, z] = anchor(m, p, "defend"); tasks.push({ kind: "zone", x, z, w: 0.6 }); }
    // the presser goes to whoever reaches the carrier first; the rest by the shortest total run
    let best = null, bc = 1e9;
    const perm = (arr, k, acc) => {
      if (k === arr.length) {
        let c = 0;
        for (let i = 0; i < arr.length; i++) { const p = ds[i], tk = tasks[arr[i]]; c += tk.w * len(p.x - tk.x, p.z - tk.z) / (p.speedScale || 1) * (tk.kind === "press" ? 1 - roleOf(p).press * 0.5 : 1) + (tk.kind === "zone" ? len(p.x - anchor(m, p, "defend")[0], p.z - anchor(m, p, "defend")[1]) * 0.3 : 0); }
        if (c < bc) { bc = c; best = arr.slice(); }
        return;
      }
      for (let i = k; i < arr.length; i++) { [arr[k], arr[i]] = [arr[i], arr[k]]; perm(arr, k + 1); [arr[k], arr[i]] = [arr[i], arr[k]]; }
    };
    perm(ds.map((_, i) => i), 0);
    ds.forEach((p, i) => {
      const tk = tasks[best[i]];
      // a stopper stands closer to the carrier than the team's usual distance
      const j = tk.kind === "press" ? roleOf(p).jockey : 0;
      if (j) { const dx = carrier.x - tk.x, dz = carrier.z - tk.z, d = len(dx, dz) || 1; out.set(p, { kind: tk.kind, x: tk.x + dx / d * Math.min(j, d - 0.6), z: tk.z + dz / d * Math.min(j, d - 0.6), w: tk.w }); }
      else out.set(p, tk);
    });
  }

  // ---- Loose ball: who gets there first, along the ball's rolling path ----------------------------
  function ballAt(m, t) {
    const b = m.ball, k = C.drag, f = (1 - Math.exp(-k * t)) / k;
    return [clamp(b.x + b.vx * f, -L + 0.2, L - 0.2), clamp(b.z + b.vz * f, -Wd + 0.2, Wd - 0.2)];
  }
  function reachTime(m, p, sk) {
    for (let t = 0.05; t <= 2.5; t += 0.1) {
      const [x, z] = ballAt(m, t);
      if (len(p.x - x, p.z - z) / (C.run * C.sprintMult * (p.speedScale || 1)) + sk.react * 0.5 <= t) return [t, x, z];
    }
    const [x, z] = ballAt(m, 2.5);
    return [2.5 + len(p.x - x, p.z - z) / C.run, x, z];
  }

  // ---- The keeper -----------------------------------------------------------------------------
  function keeper(m, p) {
    const b = m.ball, sx = sign(p.team), line = -sx * L;
    if (b.carrier === p) { m.aiKeeperRelease(p); return; }
    const bx = b.x, bz = b.z, dx = bx - line, d = len(dx, bz) || 1;
    // on the line from the middle of the goal to the ball, further out as the ball nears
    const depth = clamp(0.55 + 1.0 * (1 - d / 13), 0.55, 1.5) * (1 + roleOf(p).depth);
    let tx = line + dx / d * depth, tz = bz / d * depth * 1.6;
    tz = clamp(tz, -C.goalWidth / 2 + 0.3, C.goalWidth / 2 - 0.3);
    if (!b.carrier && Math.abs(b.vx) > 3 && Math.sign(b.vx) === -sx) {
      const zAt = b.z + b.vz * (line - b.x) / b.vx;
      tz = clamp(zAt, -C.goalWidth / 2, C.goalWidth / 2); tx = line + sx * 0.55;
    }
    m.steer(p, tx, tz, true);
    m.aiKeeperClaim(p);
  }

  // ---- One think, every 0.1 s ----------------------------------------------------------------------
  function think(m) {
    const b = m.ball, carrier = b.carrier;
    const owner = carrier ? carrier.team : (b.passTo ? b.passTo.team : -1);
    m.aiPhase = m.aiPhase || [{ phase: "", since: 0 }, { phase: "", since: 0 }];
    const roles = new Map();
    const skills = [skillOf(m, 0), skillOf(m, 1)];
    // a team turns from attack to defence after its reaction time
    for (let t = 0; t < 2; t++) {
      const want = owner === t ? "attack" : owner === 1 - t ? "defend" : "loose";
      const ph = m.aiPhase[t];
      if (want !== ph.want) { ph.want = want; ph.since = m.clock; }
      if (m.clock - ph.since >= (want === "defend" ? skills[t].react : 0) || ph.phase === "") ph.phase = want;
    }
    if (carrier && m.aiPhase[1 - carrier.team].phase === "defend") defend(m, 1 - carrier.team, carrier, skills[1 - carrier.team], roles);
    // the loose ball: the first to it on each team chases, the others shape up
    const chase = [null, null], chaseAt = [null, null];
    if (!carrier) for (let t = 0; t < 2; t++) {
      let bt = 99;
      for (const p of m.players) {
        if (p.team !== t || p.isKeeper || p.still || (b.passTo && b.passTo.team === t && p !== b.passTo)) continue;
        const r = reachTime(m, p, skills[t]);
        if (r[0] < bt) { bt = r[0]; chase[t] = p; chaseAt[t] = r; }
      }
    }
    const taken = [[0, 0], [0, 0]].map(() => []);
    for (const p of m.players) {
      if (!p.ai) continue;
      p.wantSprint = false;
      if (p.still) { p.stick = [0, 0]; continue; }
      if (p.isKeeper) { keeper(m, p); continue; }
      // wrong-footed by a skill move (skills.js): he leans the way of the fake
      if (p.fooled > 0 && carrier !== p) { p.stick = [p.foolDir[0] * 0.6, p.foolDir[1] * 0.6]; continue; }
      const sk = skills[p.team], ph = m.aiPhase[p.team].phase;
      if (carrier === p) { carrierThink(m, p, sk); continue; }
      if (!carrier && chase[p.team] === p) {
        const [, x, z] = chaseAt[p.team];
        m.steer(p, x, z, len(p.x - x, p.z - z) > 2.5);
        continue;
      }
      const role = roles.get(p);
      if (role) {
        let tx = role.x, tz = role.z;
        if (role.kind === "press") { tryWinBall(m, p, carrier, sk); }
        m.steer(p, clamp(tx, -L + 0.4, L - 0.4), clamp(tz, -Wd + 0.4, Wd - 0.4), role.kind === "press" ? len(tx - p.x, tz - p.z) > 1.8 : len(tx - p.x, tz - p.z) > 4);
        continue;
      }
      if (ph === "attack" || (!carrier && ph === "loose" && chaseAt[p.team] && (!chaseAt[1 - p.team] || chaseAt[p.team][0] <= chaseAt[1 - p.team][0]))) {
        // re-choose the spot when the carrier changes or every 0,6 s
        if (!p.aiSpot || m.clock - (p.aiSpotT || 0) > 0.6 || p.aiSpotFor !== carrier) {
          p.aiSpot = supportSpot(m, p, carrier, taken[p.team]); p.aiSpotT = m.clock; p.aiSpotFor = carrier;
        }
        taken[p.team].push(p.aiSpot);
        m.steer(p, p.aiSpot[0], p.aiSpot[1], len(p.aiSpot[0] - p.x, p.aiSpot[1] - p.z) > 3.5);
      } else {
        const [x, z] = anchor(m, p, "defend");
        m.steer(p, x, z, len(x - p.x, z - p.z) > 4);
      }
    }
  }

  // The presser's chances to take the ball: the shoulder hit at most once every few seconds, the
  // slide when the carrier comes at him (match.js keeps the cooldowns and the team's 20 s gap).
  function tryWinBall(m, p, carrier, sk) {
    if (!carrier || carrier.isKeeper || carrier.shield > 0 || p.fooled > 0 || p.hitT >= 0 || p.slideT >= 0) return;
    const d = len(carrier.x - p.x, carrier.z - p.z);
    m.teamHitAt = m.teamHitAt || [-99, -99];
    if (m.s.aiHits && p.hitCool <= 0 && m.clock - m.teamHitAt[p.team] > C.teamHitGap && d < C.hitAiDistance && p.recovery <= 0 && p.react <= 0) {
      m.startHit(p);
      p.hitCool = [16, 11, 8][m.s.difficulty] || 11;
      m.teamHitAt[p.team] = m.clock;
      return;
    }
    // a slide from in front or the side, toward where the ball will be
    const toward = ((p.x - carrier.x) * carrier.vx + (p.z - carrier.z) * carrier.vz) / Math.max(0.1, len(carrier.vx, carrier.vz) * d);
    if (d < 1.9 && d > 0.8 && toward > 0.2 && (p.slideCool || 0) <= m.clock && m.rng() < sk.slide * 0.1) {
      const tx = carrier.x + carrier.vx * 0.25 - p.x, tz = carrier.z + carrier.vz * 0.25 - p.z, l = len(tx, tz) || 1;
      p.slideDir = [tx / l, tz / l]; p.slideT = 0; p.slideCool = m.clock + 6;
    }
  }

  SL.AI = { think, threat, control, anchor, passSafety, SKILL, skillOf, ROLES, rolesFor, cardRoles, defaultRole, FAM_MARK };
})();

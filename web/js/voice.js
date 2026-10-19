// Strike Legends (browser) - the commentary: Italian lines on the match's events.
// The lines live in assets/voice/lines.json. When tools/make_commentary.py has recorded them with
// Chatterbox the clips play through WebAudio; until then the browser's own Italian voice reads
// them (Web Speech API), where the browser has one (docs/DETTAGLI.md, "Telecronaca").
"use strict";

(function () {
  const SL = window.SL;
  let doc = null, buffers = {}, loading = null;
  const log = [];                 // the last lines said, for the automated checks
  let match = null, session = null, busyUntil = 0, lastSaid = {}, passRun = 0, lastMinute = false, warnedReserve = [false, false];
  const now = () => performance.now() / 1000;
  const enabled = () => { const s = SL.currentSettings && SL.currentSettings(); return !s || s.commentary !== false; };

  function load() {
    if (loading) return loading;
    loading = fetch("assets/voice/lines.json").then((r) => r.json()).then((d) => { doc = d; }).catch(() => { doc = null; });
    return loading;
  }
  // A recorded clip, decoded once and kept.
  async function clip(file) {
    if (buffers[file] !== undefined) return buffers[file];
    buffers[file] = null;
    const ctx = SL.audio.context(); if (!ctx) return null;
    try { buffers[file] = await ctx.decodeAudioData(await (await fetch("assets/voice/" + file)).arrayBuffer()); } catch (e) { buffers[file] = null; }
    return buffers[file];
  }
  function italianVoice() {
    if (!window.speechSynthesis) return null;
    const vs = speechSynthesis.getVoices().filter((v) => /^it/i.test(v.lang));
    return vs.find((v) => /google|luca|alice|elsa|cosimo|diego/i.test(v.name)) || vs[0] || null;
  }

  // Say one line of a kind (a random variant), then optionally a team's name.
  async function say(kind, team, urgent) {
    if (!doc || !enabled()) return;
    const t = now();
    if (!urgent && t < busyUntil) return;
    if (!urgent && lastSaid[kind] && t - lastSaid[kind] < 9) return;
    const list = doc.texts[kind]; if (!list) return;
    const i = Math.floor(Math.random() * list.length);
    lastSaid[kind] = t;
    log.push(kind + (team ? ":" + team : "")); if (log.length > 30) log.shift();
    const teamText = team ? doc.teams[team] || doc.teams.home : null;
    const audio = doc.audio && doc.audio.texts && doc.audio.texts[kind] && doc.audio.texts[kind][i];
    if (audio) {
      const parts = [await clip(audio)];
      if (team && doc.audio.teams && doc.audio.teams[team]) parts.push(await clip(doc.audio.teams[team]));
      let at = 0;
      for (const b of parts) { if (!b) continue; setTimeout(() => SL.audio.playVoice(b), at * 1000); at += b.duration + 0.08; }
      busyUntil = t + at + 0.6;
      return;
    }
    if (!window.speechSynthesis) return;
    if (urgent) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(list[i] + (teamText ? " " + teamText + "!" : ""));
    u.lang = "it-IT"; const v = italianVoice(); if (v) u.voice = v;
    u.rate = kind.startsWith("goal") ? 1.15 : 1.05; u.pitch = kind.startsWith("goal") ? 1.15 : 1;
    const s = SL.currentSettings ? SL.currentSettings() : {};
    u.volume = Math.max(0, Math.min(1, (s.master == null ? 0.8 : s.master) * (s.voice == null ? 0.9 : s.voice)));
    speechSynthesis.speak(u);
    busyUntil = t + 0.6 + u.text.length * 0.065;
  }
  const teamKey = (m, t) => { const c = (t === 0 ? m.opts.home : m.opts.away).club; return c.id === "mine" ? (t === 0 ? "home" : "away") : c.id; };

  function start(m, s) {
    match = m; session = s; busyUntil = 0; lastSaid = {}; passRun = 0; lastMinute = false; warnedReserve = [false, false];
    load().then(() => setTimeout(() => { if (match === m) say("start", null, true); }, 700));
  }
  function stop() { match = null; if (window.speechSynthesis) speechSynthesis.cancel(); }

  // Read once per frame, after the match's update (ui.js, loop).
  function events(m) {
    if (m !== match || !doc) return;
    for (const e of m.events) {
      if (e.type === "goal") {
        const sc = m.score, k = e.worth === 2 ? "goal_two" : e.chip ? "goal_chip" : sc[0] === sc[1] ? "equalizer" : (sc[e.team] - sc[1 - e.team] === 1 && sc[e.team] - e.worth < sc[1 - e.team]) ? "lead" : "goal";
        say(k, teamKey(m, e.team), true); passRun = 0;
      } else if (e.type === "save") say("save");
      else if (e.type === "post") say("post");
      else if (e.type === "hit" && e.took) say("hit");
      else if (e.type === "tackle") say("tackle");
      else if (e.type === "intercept") { say("intercept"); passRun = 0; }
      else if (e.type === "claim") say("claim");
      else if (e.type === "special") say("special", null, true);
      else if (e.type === "specialResult" && e.hits === 0) say("special_miss");
      else if (e.type === "golden") say("golden", null, true);
      else if (e.type === "pass") { passRun++; if (passRun === 6) say("passes"); }
      else if (e.type === "end") {
        const [a, b] = m.score;
        if (a === b) say("end_draw", null, true); else say("end_win", teamKey(m, a > b ? 0 : 1), true);
      }
    }
    for (let t = 0; t < 2; t++) if (!warnedReserve[t] && m.reserve[t] < m.reserveMax[t] * 0.2) { warnedReserve[t] = true; say("reserve_low"); }
    if (!lastMinute && m.length < 5000 && m.length - m.clock < 60 && m.phase === "live") { lastMinute = true; say("last_minute"); }
  }

  SL.voice = { start, stop, events, say, load, log };
})();

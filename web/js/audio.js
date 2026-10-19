// Strike Legends (browser) - sound, made with WebAudio so the game ships no audio files.
// Browsers start sound only after a click or a key: SL.audio.unlock() is called on the first one.
"use strict";

(function () {
  const SL = window.SL;
  let ctx = null, master = null, sfx = null, crowdGain = null, crowdNode = null, voiceGain = null;
  const vol = { master: 0.8, sfx: 0.9, crowd: 0.6, voice: 0.9 };

  function noiseBuffer(seconds) {
    const n = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function unlock() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { ctx = null; return; }
    master = ctx.createGain(); master.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.connect(master);
    voiceGain = ctx.createGain(); voiceGain.connect(master);
    crowdGain = ctx.createGain(); crowdGain.gain.value = 0; crowdGain.connect(master);
    // The crowd: two bands of filtered noise breathing slowly.
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(4); src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = "bandpass"; lp.frequency.value = 520; lp.Q.value = 0.6;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.13;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.25;
    const body = ctx.createGain(); body.gain.value = 0.75;
    lfo.connect(lfoGain); lfoGain.connect(body.gain);
    src.connect(lp); lp.connect(body); body.connect(crowdGain);
    src.start(); lfo.start();
    crowdNode = src;
    apply();
  }

  function apply() {
    if (!ctx) return;
    master.gain.value = vol.master;
    sfx.gain.value = vol.sfx;
    voiceGain.gain.value = vol.voice;
  }

  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  function tone(freq, type, a, peak, d, slideTo) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + a + d);
    const g = ctx.createGain(); env(g, t, a, peak, d);
    o.connect(g); g.connect(sfx); o.start(t); o.stop(t + a + d + 0.05);
  }

  function burst(freq, q, a, peak, d) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = noiseBuffer(a + d + 0.05);
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); env(g, t, a, peak, d);
    s.connect(f); f.connect(g); g.connect(sfx); s.start(t);
  }

  SL.audio = {
    unlock,
    setVolumes(s) { vol.master = s.master; vol.sfx = s.sfx; vol.crowd = s.crowd; vol.voice = s.voice == null ? 0.9 : s.voice; apply(); },
    // The commentary (voice.js): a decoded clip on its own bus, the crowd lowered under it.
    context: () => ctx,
    volume: (k) => vol[k],
    playVoice(buffer) {
      if (!ctx || !buffer) return 0;
      const src = ctx.createBufferSource(); src.buffer = buffer; src.connect(voiceGain); src.start();
      const t = ctx.currentTime;
      crowdGain.gain.setTargetAtTime(vol.crowd * 0.12, t, 0.08);
      crowdGain.gain.setTargetAtTime(vol.crowd * 0.22, t + buffer.duration, 0.5);
      return buffer.duration;
    },
    crowd(level) {           // 0 silent (menus), 1 a match, 2 a goal
      if (!ctx) return;
      const t = ctx.currentTime;
      crowdGain.gain.cancelScheduledValues(t);
      crowdGain.gain.setTargetAtTime(vol.crowd * [0, 0.22, 0.75][level], t, level === 2 ? 0.08 : 0.6);
    },
    whistle(long) {
      if (!ctx) return;
      const t = ctx.currentTime, d = long ? 0.9 : 0.35;
      const o = ctx.createOscillator(); o.type = "square"; o.frequency.value = 2650;
      const vib = ctx.createOscillator(); vib.frequency.value = 38;
      const vg = ctx.createGain(); vg.gain.value = 70; vib.connect(vg); vg.connect(o.frequency);
      const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 2700; f.Q.value = 4;
      const g = ctx.createGain(); env(g, t, 0.02, 0.12, d);
      o.connect(f); f.connect(g); g.connect(sfx); o.start(t); vib.start(t); o.stop(t + d + 0.1); vib.stop(t + d + 0.1);
    },
    kick(power) { burst(180 + power * 120, 1.2, 0.004, 0.35 + power * 0.4, 0.09); tone(95, "sine", 0.003, 0.4 * power + 0.15, 0.12, 50); },
    pass() { burst(260, 1.4, 0.003, 0.25, 0.07); },
    hit() { burst(140, 0.9, 0.003, 0.7, 0.16); tone(70, "triangle", 0.002, 0.5, 0.18, 40); },
    whoosh() { burst(900, 0.7, 0.05, 0.12, 0.18); },
    save() { burst(420, 1.0, 0.004, 0.45, 0.12); },
    post() { tone(620, "triangle", 0.002, 0.3, 0.5, 600); tone(930, "sine", 0.002, 0.15, 0.4); },
    goal() {
      if (!ctx) return;
      SL.audio.crowd(2);
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, "triangle", 0.01, 0.12, 0.35), i * 110));
      setTimeout(() => SL.audio.crowd(1), 3200);
    },
    meter() { tone(1320, "sine", 0.002, 0.18, 0.07); },
    special() { tone(220, "sawtooth", 0.05, 0.1, 0.8, 880); burst(1500, 0.5, 0.1, 0.12, 0.6); },
    ui() { tone(880, "sine", 0.002, 0.06, 0.05); },
    uiBack() { tone(520, "sine", 0.002, 0.05, 0.06); },
    card(rarity) {
      const base = { bronzo: 392, argento: 523, oro: 659, leggenda: 784 }[rarity] || 440;
      tone(base, "triangle", 0.005, 0.14, 0.25);
      setTimeout(() => tone(base * 1.5, "triangle", 0.005, 0.12, 0.35), 90);
      if (rarity === "oro" || rarity === "leggenda") setTimeout(() => tone(base * 2, "sine", 0.005, 0.12, 0.6), 190);
    },
  };
})();

// Living Superweapon — lightweight WebAudio synth SFX (no assets needed).
// PROXIMITY: combat methods take an optional world position; gain falls off with distance from the
// listener (the player). Explosions carry farther than cracks. listen(x,z) is set every frame.
export class AudioBus {
  constructor() { this.ctx = null; this.master = null; this.ok = false; this.muted = false; this._lx = 0; this._lz = 0; this._hasL = false; this._sus = new Set(); }
  // WATCHDOG for sustained sounds (charge hums): a handle whose owner stops ramping it — KO'd
  // mid-charge, disposed on match restart, spirit bomb starved — self-silences instead of ringing
  // forever (the "stuck tone at match start" bug). Called every frame from game.update.
  sweep() {
    if (!this._sus.size) return;
    const now = performance.now();
    for (const h of this._sus) if (now - h.last > 450) h.stop();
  }
  listen(x, z) { this._lx = x; this._lz = z; this._hasL = true; }
  // distance → gain multiplier. reach = how far this sound family carries (units to near-silence).
  _pg(pos, reach = 130) {
    if (!pos || !this._hasL) return 1;
    const d = Math.hypot((pos.x ?? 0) - this._lx, (pos.z ?? 0) - this._lz);
    const g = 1.12 - d / reach;
    return g <= 0.06 ? 0 : Math.min(1, g);
  }
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.32;
      this.master.connect(this.ctx.destination);
      this.ok = true;
    } catch (e) { this.ok = false; }
  }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  get t() { return this.ctx.currentTime; }

  _env(node, dur, peak = 1, atk = 0.005) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, this.t);
    g.gain.exponentialRampToValueAtTime(peak, this.t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, this.t + dur);
    node.connect(g); g.connect(this.master);
    return g;
  }
  _noise(dur) {
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource(); src.buffer = buf; return src;
  }

  blast(freq = 420, dur = 0.16, type = 'sawtooth', pos = null) {
    if (!this.ok || this.muted) return;
    const pg = this._pg(pos, 120); if (!pg) return;
    const o = this.ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(freq, this.t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.4, this.t + dur);
    this._env(o, dur, 0.5 * pg); o.start(); o.stop(this.t + dur + 0.02);
  }
  zap(freq = 900, pos = null) {
    if (!this.ok || this.muted) return;
    const pg = this._pg(pos, 100); if (!pg) return;
    const o = this.ctx.createOscillator(); o.type = 'square';
    o.frequency.setValueAtTime(freq * (0.9 + Math.random() * 0.2), this.t);
    o.frequency.exponentialRampToValueAtTime(freq * 1.6, this.t + 0.05);
    this._env(o, 0.06, 0.18 * pg); o.start(); o.stop(this.t + 0.08);
  }
  hit(freq = 240, pos = null) {
    if (!this.ok || this.muted) return;
    const pg = this._pg(pos, 110); if (!pg) return;
    const o = this.ctx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(freq, this.t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.5, this.t + 0.09);
    this._env(o, 0.1, 0.4 * pg);
    const n = this._noise(0.08); this._env(n, 0.08, 0.25 * pg); n.start(); n.stop(this.t + 0.08);
    o.start(); o.stop(this.t + 0.12);
  }
  // heavy, violent melee impact — low thud + high crack (cracks fade with distance faster than thuds)
  impact(power = 1, pos = null) {
    if (!this.ok || this.muted) return;
    const pg = this._pg(pos, 150); if (!pg) return;
    const o = this.ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(190, this.t);
    o.frequency.exponentialRampToValueAtTime(38, this.t + 0.12);
    this._env(o, 0.15, Math.min(0.95, 0.45 + power * 0.4) * pg, 0.002); o.start(); o.stop(this.t + 0.17);
    const o2 = this.ctx.createOscillator(); o2.type = 'square';
    o2.frequency.setValueAtTime(90, this.t); o2.frequency.exponentialRampToValueAtTime(30, this.t + 0.08);
    this._env(o2, 0.09, (0.3 + power * 0.2) * pg, 0.001); o2.start(); o2.stop(this.t + 0.1);
    const n = this._noise(0.06); const f = this.ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 1400; n.connect(f);
    this._env(f, 0.05, (0.28 + power * 0.25) * pg * pg, 0.001); n.start(); n.stop(this.t + 0.06);
  }

  boom(power = 1, pos = null) {
    if (!this.ok || this.muted) return;
    const pg = this._pg(pos, 240); if (!pg) return;   // explosions carry across the arena
    const dur = 0.5 + power * 0.4;
    const o = this.ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(160, this.t);
    o.frequency.exponentialRampToValueAtTime(30, this.t + dur);
    this._env(o, dur, Math.min(0.9, 0.5 + power * 0.3) * pg, 0.01);
    const n = this._noise(dur); const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.setValueAtTime(1200 * Math.max(0.35, pg), this.t);   // distance muffles the crack
    f.frequency.exponentialRampToValueAtTime(120, this.t + dur);
    n.connect(f); this._env(f, dur, 0.5 * pg, 0.005); n.start(); n.stop(this.t + dur);
    o.start(); o.stop(this.t + dur + 0.02);
  }

  // ---- the VOICE — DBZ-style synth screams (no assets, per-character pitch) ----
  // yell: charge/transform scream. Two detuned saws + vibrato + breath noise, rising with fury.
  yell(pitch = 1, dur = 0.7, intensity = 1, pos = null) {
    if (!this.ok || this.muted) return;
    const pg = this._pg(pos, 190); if (!pg) return;   // a good scream carries
    const base = 170 * pitch;
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 11 + intensity * 4;
    const lfoG = this.ctx.createGain(); lfoG.gain.value = 9 + intensity * 8;
    lfo.connect(lfoG); lfo.start(); lfo.stop(this.t + dur + 0.1);
    for (const det of [1, 1.011, 0.5]) {                       // two voices + a chest octave under
      const o = this.ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(base * det, this.t);
      o.frequency.linearRampToValueAtTime(base * det * (1.25 + intensity * 0.2), this.t + dur * 0.8);
      lfoG.connect(o.frequency);
      const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700 * pitch; f.Q.value = 1.4;
      o.connect(f);
      this._env(f, dur, (det === 0.5 ? 0.16 : 0.13) * intensity * pg, 0.06);
      o.start(); o.stop(this.t + dur + 0.05);
    }
    const n = this._noise(dur); const nf = this.ctx.createBiquadFilter();
    nf.type = 'bandpass'; nf.frequency.value = 1800; nf.Q.value = 0.8; n.connect(nf);
    this._env(nf, dur, 0.07 * intensity * pg, 0.08); n.start(); n.stop(this.t + dur);
  }
  // grunt: short pain bark (slams, hard hits)
  grunt(pitch = 1, pos = null) {
    if (!this.ok || this.muted) return;
    const pg = this._pg(pos, 120); if (!pg) return;
    const o = this.ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(210 * pitch, this.t);
    o.frequency.exponentialRampToValueAtTime(110 * pitch, this.t + 0.16);
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 620 * pitch; f.Q.value = 1.6;
    o.connect(f); this._env(f, 0.17, 0.2 * pg, 0.008); o.start(); o.stop(this.t + 0.2);
  }
  // cry: the KO wail — falls away like the fighter does
  cry(pitch = 1, pos = null) {
    if (!this.ok || this.muted) return;
    const pg = this._pg(pos, 170); if (!pg) return;
    const o = this.ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(300 * pitch, this.t);
    o.frequency.exponentialRampToValueAtTime(90 * pitch, this.t + 0.85);
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 800 * pitch; f.Q.value = 1.5;
    o.connect(f); this._env(f, 0.9, 0.17 * pg, 0.03); o.start(); o.stop(this.t + 0.95);
  }
  charge() {
    if (!this.ok || this.muted) return null;
    const o = this.ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(60, this.t);
    o.frequency.linearRampToValueAtTime(520, this.t + 2.4);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, this.t);
    g.gain.exponentialRampToValueAtTime(0.14, this.t + 0.3);
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 600; f.Q.value = 4;
    o.connect(f); f.connect(g); g.connect(this.master); o.start();
    const h = {
      o, g, f, last: performance.now(),
      ramp: (lvl) => { h.last = performance.now(); try { f.frequency.setTargetAtTime(300 + lvl * 2600, this.t, 0.05); } catch (e) {} },
      stop: () => { this._sus.delete(h); try { g.gain.setTargetAtTime(0.0001, this.t, 0.05); o.stop(this.t + 0.3); } catch (e) {} },
    };
    this._sus.add(h);   // watchdog-tracked: dies unless kept alive by ramp() (see sweep)
    return h;
  }
  teleport() {
    if (!this.ok || this.muted) return;
    const o = this.ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(1200, this.t);
    o.frequency.exponentialRampToValueAtTime(180, this.t + 0.18);
    this._env(o, 0.2, 0.3); o.start(); o.stop(this.t + 0.22);
  }
  power(up = true) {
    if (!this.ok || this.muted) return;
    const o = this.ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(up ? 200 : 600, this.t);
    o.frequency.exponentialRampToValueAtTime(up ? 700 : 120, this.t + 0.5);
    this._env(o, 0.6, 0.3, 0.02); o.start(); o.stop(this.t + 0.62);
  }
  // ---- KMK 9 ACTION NEWS broadcast package ----
  // sting: the urgent local-news open — timpani hit + three rising brass stabs + a hi shimmer
  sting() {
    if (!this.ok || this.muted) return;
    const tym = this.ctx.createOscillator(); tym.type = 'sine';
    tym.frequency.setValueAtTime(110, this.t); tym.frequency.exponentialRampToValueAtTime(48, this.t + 0.5);
    this._env(tym, 0.55, 0.5, 0.004); tym.start(); tym.stop(this.t + 0.6);
    const CHORDS = [[220, 277.2], [246.9, 311.1], [293.7, 370, 440]];   // A → B → D stabs
    CHORDS.forEach((notes, i) => {
      const at = 0.16 + i * 0.21;
      for (const f0 of notes) {
        const o = this.ctx.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(f0, this.t + at);
        const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1900; lp.Q.value = 0.8;
        o.connect(lp);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, this.t + at);
        g.gain.exponentialRampToValueAtTime(i === 2 ? 0.16 : 0.11, this.t + at + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, this.t + at + (i === 2 ? 0.75 : 0.2));
        lp.connect(g); g.connect(this.master);
        o.start(this.t + at); o.stop(this.t + at + 0.8);
      }
    });
    const sh = this.ctx.createOscillator(); sh.type = 'triangle';
    sh.frequency.setValueAtTime(1760, this.t + 0.58); sh.frequency.exponentialRampToValueAtTime(2217, this.t + 0.95);
    const shg = this.ctx.createGain(); shg.gain.setValueAtTime(0.0001, this.t + 0.58);
    shg.gain.exponentialRampToValueAtTime(0.05, this.t + 0.62); shg.gain.exponentialRampToValueAtTime(0.0001, this.t + 1.15);
    sh.connect(shg); shg.connect(this.master); sh.start(this.t + 0.58); sh.stop(this.t + 1.2);
  }
  // staticBurst: analog snow between replay clips
  staticBurst(dur = 0.28) {
    if (!this.ok || this.muted) return;
    const n = this._noise(dur);
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 0.4;
    n.connect(f); this._env(f, dur, 0.07, 0.01); n.start(); n.stop(this.t + dur);
  }
  // gunshot: a real firearm report — sharp transient crack, body thump, and a tail of room slap.
  // Deliberately NOT the `zap`/`blast` synth: guns must not sound like energy weapons.
  gunshot(power = 1, pos = null) {
    if (!this.ok || this.muted) return;
    const pg = this._pg(pos, 200); if (!pg) return;
    const t = this.t;
    // the crack: filtered noise burst, very short
    const n = this._noise(0.09);
    const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1100;
    n.connect(hp); this._env(hp, 0.07, 0.5 * power * pg, 0.001);
    n.start(); n.stop(t + 0.09);
    // the body: a fast low thump that gives it weight
    const o = this.ctx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(190 * power, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.08);
    this._env(o, 0.1, 0.34 * power * pg, 0.001); o.start(); o.stop(t + 0.12);
    // the tail: quiet slap off the buildings
    const n2 = this._noise(0.18);
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.7;
    n2.connect(bp); this._env(bp, 0.18, 0.1 * power * pg, 0.02);
    n2.start(t + 0.02); n2.stop(t + 0.2);
  }
  // siren: the two-tone whoop — dispatch and arrival announcements (proximity-attenuated)
  siren(pos = null, whoops = 2) {
    if (!this.ok || this.muted) return;
    const pg = this._pg(pos, 260); if (!pg) return;
    for (let i = 0; i < whoops; i++) {
      const at = i * 0.42;
      const o = this.ctx.createOscillator(); o.type = 'square';
      o.frequency.setValueAtTime(660, this.t + at);
      o.frequency.exponentialRampToValueAtTime(990, this.t + at + 0.2);
      o.frequency.exponentialRampToValueAtTime(660, this.t + at + 0.4);
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
      o.connect(lp);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, this.t + at);
      g.gain.exponentialRampToValueAtTime(0.085 * pg, this.t + at + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, this.t + at + 0.42);
      lp.connect(g); g.connect(this.master);
      o.start(this.t + at); o.stop(this.t + at + 0.45);
    }
  }
}

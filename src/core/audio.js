// WAR WORLD: ASCENDANTS — the sound engine. Entirely synthesised WebAudio; no sample assets, which
// is what lets the whole game ship as one offline file.
//
// THE MIX. Everything used to connect straight to a single master gain, so there was no way to
// turn the music down without turning the punches down. There is now a real bus structure:
//
//     source → BUS (music · sfx · voice · ambient · ui) → glue compressor → master → out
//
// Each bus has its own fader in Options. The glue compressor is the "mix it down" step: it rides
// the whole programme so a star sphere over a busy street doesn't clip, and quiet moments still
// have presence. Buses are ducked against each other where it matters (see duck()).
// PROXIMITY: combat methods take an optional world position; gain falls off with distance from the
// listener (the player). Explosions carry farther than cracks. listen(x,z) is set every frame.
// Per-bus baseline gains — the STATIC MIX. These are the balance decisions; the player's faders
// multiply them. Voice sits forward of ambience; music sits under everything.
const rand2 = (a, b) => a + Math.random() * (b - a);
// AUDIO MUST NEVER THROW INTO THE GAME LOOP. WebAudio rejects NaN/Infinity on every AudioParam
// with an exception, and one bad number from a caller used to take a whole ability down with it.
// Every public sound coerces its inputs through this first.
const fin = (v, d = 1) => (Number.isFinite(v) ? v : d);
const BUS_DEFAULT = { music: 0.34, sfx: 1.0, voice: 0.92, ambient: 0.52, ui: 0.7 };

export class AudioBus {
  constructor() { this.ctx = null; this.master = null; this.ok = false; this.muted = false; this._lx = 0; this._lz = 0; this._hasL = false; this._sus = new Set(); }
  // WATCHDOG for sustained sounds (charge hums): a handle whose owner stops ramping it — KO'd
  // mid-charge, disposed on match restart, star sphere starved — self-silences instead of ringing
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

      // GLUE COMPRESSOR — the mixdown. Gentle ratio, slow-ish release, so it evens out the
      // programme rather than pumping. Without it, a big blast over city ambience clips hard.
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 26; comp.ratio.value = 3.2;
      comp.attack.value = 0.004; comp.release.value = 0.22;
      this.comp = comp;

      // A gentle high shelf takes the harsh edge off the synth stack on headphones.
      const air = this.ctx.createBiquadFilter();
      air.type = 'highshelf'; air.frequency.value = 5200; air.gain.value = -2.2;

      this.master.connect(comp); comp.connect(air); air.connect(this.ctx.destination);

      // ---- THE BUSES. One fader each, exposed in Options → Audio.
      this.bus = {};
      for (const name of ['music', 'sfx', 'voice', 'ambient', 'ui']) {
        const g = this.ctx.createGain();
        g.gain.value = BUS_DEFAULT[name];
        g.connect(this.master);
        this.bus[name] = g;
      }
      this._busLevel = { ...BUS_DEFAULT };
      this.ok = true;
    } catch (e) { this.ok = false; }
  }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  get t() { return this.ctx.currentTime; }

  _env(node, dur, peak = 1, atk = 0.005, bus = 'sfx') {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, this.t);
    g.gain.exponentialRampToValueAtTime(peak, this.t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, this.t + dur);
    node.connect(g); g.connect(this.bus[bus] || this.master);
    return g;
  }
  // Set one bus fader, 0..1.5. Called by applySettings.
  setBus(name, v) {
    if (!this.ok || !this.bus[name]) return;
    this._busLevel[name] = v;
    this.bus[name].gain.setTargetAtTime(BUS_DEFAULT[name] * v, this.t, 0.05);
  }
  // DUCKING — pull a bus down briefly so something more important cuts through. The news sting
  // and the KO wail duck the ambience; the announcer ducks the music.
  duck(name, amount = 0.35, dur = 0.9) {
    if (!this.ok || !this.bus[name]) return;
    const g = this.bus[name].gain, base = BUS_DEFAULT[name] * (this._busLevel[name] ?? 1);
    g.cancelScheduledValues(this.t);
    g.setTargetAtTime(base * amount, this.t, 0.04);
    g.setTargetAtTime(base, this.t + dur, 0.35);
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
  // ================= THE ENERGY VOICE ==========================================================
  // Ki was one sawtooth through a bandpass, which reads as a synth NOTE, not as POWER. Three
  // things make a sound read as energy rather than music:
  //
  //   1. INHARMONIC PARTIALS. A musical tone stacks integer multiples (1, 2, 3, 4). Energy stacks
  //      irrational ones (1, 2.41, 3.86, 5.13) — the ear cannot resolve it into a pitch, so it
  //      hears a FORCE instead of a note.
  //   2. RING MODULATION. Multiply two oscillators and you get only their sum and difference
  //      frequencies. That metallic, unplaceable shimmer is the sound of something that should
  //      not exist. It is the single biggest ingredient here.
  //   3. CRACKLE. Short filtered noise grains on top read as ARCING — air being ionised. Without
  //      it, energy sounds smooth and synthetic instead of dangerous.
  //
  // Everything below is built from those three.

  // A ring modulator in WebAudio: a gain node whose GAIN is driven by an oscillator swinging
  // through zero. That multiplication IS the ring mod. Baseline gain 0 = no carrier leaks through.
  _ringMod(carrierFreq, modFreq) {
    const car = this.ctx.createOscillator(); car.type = 'sine'; car.frequency.value = carrierFreq;
    const mod = this.ctx.createOscillator(); mod.type = 'sine'; mod.frequency.value = modFreq;
    const ring = this.ctx.createGain(); ring.gain.value = 0;
    mod.connect(ring.gain);
    car.connect(ring);
    return {
      car, mod, out: ring,
      start: (t) => { car.start(t); mod.start(t); },
      stop: (t) => { try { car.stop(t); mod.stop(t); } catch (e) {} },
    };
  }

  // Arcing: noise through a bandpass whose frequency is chopped by a fast square LFO, which turns
  // smooth hiss into discrete electrical grains.
  _crackle(dur, gain, band = 3000, at = 0) {
    const n = this._noise(dur);
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.value = band; bp.Q.value = 1.4;
    const lfo = this.ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = rand2(18, 55);
    const lg = this.ctx.createGain(); lg.gain.value = band * 0.55;
    lfo.connect(lg); lg.connect(bp.frequency); lfo.start(this.t + at); lfo.stop(this.t + at + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, this.t + at);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), this.t + at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, this.t + at + dur);
    n.connect(bp); bp.connect(g); g.connect(this.bus.sfx); n.start(this.t + at);
    return g;
  }

  // THE CHARGE — a sustained gather. Sub-bass weight, a rising inharmonic stack, a ring-mod
  // shimmer that grows brighter AND less stable as it fills, and arcing that speeds up.
  // Keeps the {ramp, stop, last} handle contract, so every existing caller is unchanged.
  charge() {
    if (!this.ok || this.muted) return null;
    const t = this.t;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.15, t + 0.35);
    g.connect(this.bus.sfx);

    // (1) THE SUB — the weight underneath. This is the part you feel rather than hear.
    const sub = this.ctx.createOscillator(); sub.type = 'sine';
    sub.frequency.setValueAtTime(34, t); sub.frequency.linearRampToValueAtTime(78, t + 2.6);
    const subG = this.ctx.createGain(); subG.gain.value = 0.85;
    sub.connect(subG); subG.connect(g); sub.start();

    // (2) THE INHARMONIC STACK — irrational ratios, so it never resolves into a chord
    const parts = [];
    for (const ratio of [1, 2.41, 3.86, 5.13]) {
      const o = this.ctx.createOscillator(); o.type = ratio === 1 ? 'sawtooth' : 'triangle';
      o.frequency.setValueAtTime(58 * ratio, t);
      o.frequency.linearRampToValueAtTime(300 * ratio, t + 2.6);
      const og = this.ctx.createGain(); og.gain.value = 0.34 / ratio;
      o.connect(og); og.connect(g); o.start();
      parts.push(o);
    }

    // (3) THE RING-MOD SHIMMER — the part that says this is not of this world
    const rm = this._ringMod(420, 137);
    const rmG = this.ctx.createGain(); rmG.gain.value = 0.5;
    rm.out.connect(rmG); rmG.connect(g); rm.start(t);

    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 600; f.Q.value = 3.2;

    let crackT = 0;
    const h = {
      g, f, last: performance.now(),
      ramp: (lvl) => {
        h.last = performance.now();
        try {
          const L = Math.max(0, Math.min(1, fin(lvl, 0)));
          f.frequency.setTargetAtTime(300 + L * 2600, this.t, 0.05);
          // as it fills, the ring mod climbs and detunes — the sound becomes less stable
          rm.car.frequency.setTargetAtTime(420 + L * 1500, this.t, 0.08);
          rm.mod.frequency.setTargetAtTime(137 + L * 420, this.t, 0.08);
          rmG.gain.setTargetAtTime(0.3 + L * 0.9, this.t, 0.1);
          // and it begins to ARC — crackle rate scales with how full it is
          const now = performance.now();
          if (L > 0.25 && now - crackT > (260 - L * 190)) {
            crackT = now;
            this._crackle(rand2(0.04, 0.1), 0.03 + L * 0.05, rand2(1800, 5200));
          }
        } catch (e) {}
      },
      stop: () => {
        this._sus.delete(h);
        try {
          g.gain.setTargetAtTime(0.0001, this.t, 0.05);
          sub.stop(this.t + 0.35);
          parts.forEach(o => o.stop(this.t + 0.35));
          rm.stop(this.t + 0.35);
        } catch (e) {}
      },
    };
    this._sus.add(h);   // watchdog-tracked: dies unless kept alive by ramp() (see sweep)
    return h;
  }

  // THE RELEASE — a charged ki attack leaving your hands. Sub-thump for the shove, an inharmonic
  // burst for the mass, a long descending ring-mod tail for the travel, arcing across all of it.
  kiRelease(power = 1, pos = null) {
    power = fin(power, 1);
    if (!this.ok || this.muted) return;
    const pg = this._pg(pos, 230); if (!pg) return;
    const p = Math.max(0.2, Math.min(1.6, power)) * pg, t = this.t;

    const sub = this.ctx.createOscillator(); sub.type = 'sine';
    sub.frequency.setValueAtTime(120 * (1 + p * 0.3), t);
    sub.frequency.exponentialRampToValueAtTime(28, t + 0.5 + p * 0.4);
    this._env(sub, 0.6 + p * 0.5, 0.5 * p, 0.004);
    sub.start(); sub.stop(t + 1.2 + p);

    for (const ratio of [1, 2.41, 3.86]) {
      const o = this.ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(260 * ratio * (0.8 + p * 0.5), t);
      o.frequency.exponentialRampToValueAtTime(70 * ratio, t + 0.42);
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass';
      lp.frequency.setValueAtTime(5200, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.5);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, (0.16 / ratio) * p), t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      o.connect(lp); lp.connect(g); g.connect(this.bus.sfx); o.start(); o.stop(t + 0.6);
    }

    const rm = this._ringMod(1400 * (0.7 + p * 0.6), 380);
    const rg = this.ctx.createGain();
    rg.gain.setValueAtTime(0.0001, t);
    rg.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.11 * p), t + 0.03);
    rg.gain.exponentialRampToValueAtTime(0.0001, t + 0.85 + p * 0.5);
    rm.car.frequency.exponentialRampToValueAtTime(220, t + 0.9);
    rm.mod.frequency.exponentialRampToValueAtTime(90, t + 0.9);
    rm.out.connect(rg); rg.connect(this.bus.sfx); rm.start(t); rm.stop(t + 1.5 + p);

    this._crackle(0.22 + p * 0.2, 0.09 * p, 3400);
    this._crackle(0.1, 0.06 * p, 7000, 0.03);
  }

  // A BEAM is the sustained form of the same voice. set(intensity) rides it, so a beam losing a
  // clash audibly strains.
  beamVoice(pos = null) {
    if (!this.ok || this.muted) return null;
    const t = this.t;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.10, t + 0.08);
    g.connect(this.bus.sfx);

    const sub = this.ctx.createOscillator(); sub.type = 'sine'; sub.frequency.value = 62;
    const sg = this.ctx.createGain(); sg.gain.value = 0.8; sub.connect(sg); sg.connect(g); sub.start();

    const parts = [];
    for (const ratio of [1, 2.41, 3.86]) {
      const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 150 * ratio;
      const og = this.ctx.createGain(); og.gain.value = 0.22 / ratio;
      o.connect(og); og.connect(g); o.start(); parts.push(o);
    }
    const rm = this._ringMod(900, 260);
    const rg = this.ctx.createGain(); rg.gain.value = 0.55;
    rm.out.connect(rg); rg.connect(g); rm.start(t);

    // a constant hiss underneath — the air being cooked
    const hiss = this._noise(4); hiss.loop = true;
    const hf = this.ctx.createBiquadFilter(); hf.type = 'bandpass'; hf.frequency.value = 2600; hf.Q.value = 0.8;
    const hg = this.ctx.createGain(); hg.gain.value = 0.05;
    hiss.connect(hf); hf.connect(hg); hg.connect(g); hiss.start();

    let crackT = 0;
    const h = {
      last: performance.now(),
      set: (intensity = 1, p2 = null) => {
        h.last = performance.now();
        const I = Math.max(0, Math.min(1.6, fin(intensity, 1)));
        try {
          const dist = this._pg(p2 || pos, 240);
          g.gain.setTargetAtTime(0.10 * I * (dist || 1), this.t, 0.08);
          rm.car.frequency.setTargetAtTime(700 + I * 900, this.t, 0.12);
          rm.mod.frequency.setTargetAtTime(200 + I * 260, this.t, 0.12);
          hg.gain.setTargetAtTime(0.03 + I * 0.05, this.t, 0.1);
          const now = performance.now();
          if (now - crackT > 120) { crackT = now; this._crackle(0.05, 0.018 * I, rand2(2200, 6000)); }
        } catch (e) {}
      },
      stop: () => {
        this._sus.delete(h);
        try {
          g.gain.setTargetAtTime(0.0001, this.t, 0.06);
          sub.stop(this.t + 0.4);
          parts.forEach(o => o.stop(this.t + 0.4));
          rm.stop(this.t + 0.4); hiss.stop(this.t + 0.4);
        } catch (e) {}
      },
    };
    this._sus.add(h);
    return h;
  }

  // A short electrical ARC — auras, tier-ups, lightning, anything that should spit.
  arc(power = 1, pos = null) {
    power = fin(power, 1);
    if (!this.ok || this.muted) return;
    const pg = this._pg(pos, 170); if (!pg) return;
    const p = power * pg;
    for (let i = 0; i < 2 + ((Math.random() * 3) | 0); i++) {
      this._crackle(rand2(0.03, 0.09), rand2(0.02, 0.06) * p, rand2(1800, 7000), i * rand2(0.01, 0.06));
    }
    const rm = this._ringMod(rand2(1600, 3200), rand2(300, 900));
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, this.t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.05 * p), this.t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, this.t + 0.18);
    rm.out.connect(g); g.connect(this.bus.sfx); rm.start(this.t); rm.stop(this.t + 0.22);
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
        lp.connect(g); g.connect(this.bus.ui);
        o.start(this.t + at); o.stop(this.t + at + 0.8);
      }
    });
    const sh = this.ctx.createOscillator(); sh.type = 'triangle';
    sh.frequency.setValueAtTime(1760, this.t + 0.58); sh.frequency.exponentialRampToValueAtTime(2217, this.t + 0.95);
    const shg = this.ctx.createGain(); shg.gain.setValueAtTime(0.0001, this.t + 0.58);
    shg.gain.exponentialRampToValueAtTime(0.05, this.t + 0.62); shg.gain.exponentialRampToValueAtTime(0.0001, this.t + 1.15);
    sh.connect(shg); shg.connect(this.bus.ui); sh.start(this.t + 0.58); sh.stop(this.t + 1.2);
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
  // ---- BODY TYPES: what a fighter is MADE OF decides what they sound like ----------------
  // A robot landing is servo whine and a plate clang. A stone golem is a boulder dropping. An
  // energy being barely makes contact at all. Set `def.body` on a character; `flesh` is default.
  // Used by landings, heavy impacts and ragdoll contact.
  land(power = 1, body = 'flesh', pos = null) {
    power = fin(power, 1);
    if (!this.ok) return;
    const pg = this._pg(pos, 150); if (!pg) return;
    const p = Math.min(2.2, power) * pg;
    const B = {
      flesh:  { thump: 62,  dur: 0.20, noiseF: 340,  noiseQ: 1.0, ring: 0,    gain: 0.42 },
      metal:  { thump: 84,  dur: 0.30, noiseF: 2100, noiseQ: 3.5, ring: 430,  gain: 0.50 },
      stone:  { thump: 44,  dur: 0.40, noiseF: 520,  noiseQ: 1.4, ring: 0,    gain: 0.62 },
      energy: { thump: 150, dur: 0.14, noiseF: 3000, noiseQ: 6.0, ring: 1200, gain: 0.22 },
      insect: { thump: 96,  dur: 0.13, noiseF: 1500, noiseQ: 5.0, ring: 0,    gain: 0.30 },
    }[body] || null;
    const C = B || { thump: 62, dur: 0.2, noiseF: 340, noiseQ: 1, ring: 0, gain: 0.42 };

    // the impact body — a fast downward sine thump
    const o = this.ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(C.thump * 1.9, this.t);
    o.frequency.exponentialRampToValueAtTime(C.thump * 0.6, this.t + C.dur);
    this._env(o, C.dur, C.gain * p * 0.5, 0.004).gain;
    o.start(); o.stop(this.t + C.dur + 0.05);

    // the surface character — gravel, plate, or crackle
    const n = this._noise(C.dur * 1.2);
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.value = C.noiseF; bp.Q.value = C.noiseQ;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.0001, this.t);
    ng.gain.exponentialRampToValueAtTime(C.gain * p * 0.30, this.t + 0.006);
    ng.gain.exponentialRampToValueAtTime(0.0001, this.t + C.dur * 1.2);
    n.connect(bp); bp.connect(ng); ng.connect(this.bus.sfx); n.start();

    // METAL and ENERGY ring afterwards — the tell that this is not a person
    if (C.ring) {
      const r = this.ctx.createOscillator(); r.type = body === 'metal' ? 'triangle' : 'sine';
      r.frequency.setValueAtTime(C.ring * rand2(0.94, 1.06), this.t + 0.01);
      r.frequency.exponentialRampToValueAtTime(C.ring * 0.86, this.t + 0.7);
      const rg = this.ctx.createGain();
      rg.gain.setValueAtTime(0.0001, this.t + 0.01);
      rg.gain.exponentialRampToValueAtTime(C.gain * p * 0.13, this.t + 0.03);
      rg.gain.exponentialRampToValueAtTime(0.0001, this.t + 0.75);
      r.connect(rg); rg.connect(this.bus.sfx); r.start(this.t + 0.01); r.stop(this.t + 0.8);
    }
    // heavy landings shake loose debris
    if (p > 1.1 && body !== 'energy') {
      for (let i = 0; i < 3; i++) {
        const d = this._noise(0.05);
        const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = rand2(900, 2600); f.Q.value = 8;
        const g = this.ctx.createGain();
        const at = this.t + 0.05 + i * rand2(0.03, 0.11);
        g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.03 * p, at + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
        d.connect(f); f.connect(g); g.connect(this.bus.sfx); d.start(at);
      }
    }
  }

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
      lp.connect(g); g.connect(this.bus.sfx);
      o.start(this.t + at); o.stop(this.t + at + 0.45);
    }
  }
}

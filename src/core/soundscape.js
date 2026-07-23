// WAR WORLD: ASCENDANTS — THE SOUNDSCAPE.
//
// Two systems live here, and both are fully synthesised. No samples, because the whole game has to
// ship as one offline file.
//
// 1. THE BED — a continuous, layered city ambience that changes with WHERE you are standing.
//    Downtown is traffic and air-handling. The docks are surf, gulls and a container yard. The
//    county is wind and insects. Night pulls the traffic down and lets the crickets and dogs up.
//    Layers crossfade rather than switching, so walking a block changes the sound gradually.
//
// 2. THE VOICES — procedural formant synthesis, so civilians actually speak.
//    A human voice is a buzzing source (the vocal folds) shaped by resonances (the vocal tract).
//    We build exactly that: a sawtooth glottal source with vibrato and jitter, through three
//    bandpass "formant" filters. A vowel is a triple of formant frequencies. A WORD is a sequence
//    of vowels with a pitch contour and a syllable envelope. It lands as convincing muffled speech
//    — you hear a person shouting, you don't quite catch the words. That is exactly the GTA
//    street-bark register we want, and it means every line is unique instead of a looped sample.
//
// Speakers differ by base pitch AND vocal-tract length (formants scale together), so an adult man,
// an adult woman and a kid are audibly different people, not the same voice pitched up.

// ---- VOWELS: the three formants that define each one (Hz, adult male reference) --------------
const VOWEL = {
  a: [730, 1090, 2440],   // "father"
  e: [530, 1840, 2480],   // "bed"
  i: [270, 2290, 3010],   // "see"
  o: [570,  840, 2410],   // "boat"
  u: [300,  870, 2240],   // "boot"
  A: [660, 1720, 2410],   // "hat"
  E: [490, 1350, 1690],   // "bird"
};
const VOWELS = Object.keys(VOWEL);

// ---- SPEAKER TYPES ---------------------------------------------------------------------------
// tract: formant scaling (a shorter tract = higher formants = smaller person)
const SPEAKER = {
  man:   { f0: [92, 132],  tract: 1.00, breath: 0.10 },
  woman: { f0: [175, 235], tract: 1.17, breath: 0.13 },
  elder: { f0: [110, 150], tract: 1.04, breath: 0.26 },   // breathier, shakier
  kid:   { f0: [250, 330], tract: 1.35, breath: 0.09 },
};
const SPEAKER_KEYS = Object.keys(SPEAKER);

// ---- THE BARK BOOK ---------------------------------------------------------------------------
// Each entry is a shape, not a script: how many syllables, the pitch contour, the energy, and
// which vowels tend to appear. The synth improvises inside the shape, so the same emotion never
// says the same "word" twice.
//   contour: 'fall' statement · 'rise' question · 'up' alarm · 'flat' mutter · 'spike' scream
const BARKS = {
  chatter:  { syl: [2, 4], contour: 'flat',  energy: 0.30, rate: 1.0,  vowels: 'aeiouAE' },
  notice:   { syl: [1, 2], contour: 'rise',  energy: 0.55, rate: 1.15, vowels: 'oAe' },
  point:    { syl: [2, 3], contour: 'up',    energy: 0.72, rate: 1.25, vowels: 'aAe' },
  fear:     { syl: [1, 3], contour: 'up',    energy: 0.85, rate: 1.5,  vowels: 'aAoE' },
  scream:   { syl: [1, 1], contour: 'spike', energy: 1.0,  rate: 0.75, vowels: 'aA' },
  panic:    { syl: [2, 3], contour: 'up',    energy: 0.95, rate: 1.7,  vowels: 'aAi' },
  anger:    { syl: [1, 3], contour: 'fall',  energy: 0.9,  rate: 1.3,  vowels: 'aAoE' },
  challenge:{ syl: [2, 4], contour: 'fall',  energy: 0.95, rate: 1.2,  vowels: 'aAoe' },
  pain:     { syl: [1, 1], contour: 'fall',  energy: 0.8,  rate: 0.8,  vowels: 'aAo' },
  awe:      { syl: [1, 2], contour: 'fall',  energy: 0.45, rate: 0.7,  vowels: 'ou' },
};

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

export class Soundscape {
  constructor(audio) {
    this.a = audio;
    this.started = false;
    this.layers = {};
    this._targets = {};
    this._voiceBudget = 0;      // rate-limit: a crowd should murmur, not roar
    this._lastVoice = 0;
    this._sirenT = 0;
    this.district = '';
    this.mix = { traffic: 0.5, wind: 0.3, crowd: 0.3, machine: 0, surf: 0, nature: 0.1 };
  }

  // ---------------------------------------------------------------------------------------
  // THE BED
  // ---------------------------------------------------------------------------------------
  start() {
    const a = this.a;
    if (this.started || !a.ok) return;
    this.started = true;
    const ctx = a.ctx, out = a.bus.ambient;

    // A long noise buffer we can loop for every noise-based layer — one allocation, many voices.
    const N = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, N, ctx.sampleRate);
    const d = buf.getChannelData(0);
    // BROWN noise (integrated white) — far more natural for wind and traffic than white.
    let last = 0;
    for (let i = 0; i < N; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
    this._noiseBuf = buf;

    const layer = (name, filterType, freq, q, gain) => {
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(out); src.start();
      this.layers[name] = { src, f, g, base: gain };
      return this.layers[name];
    };

    // TRAFFIC — the low roar of a city. Lowpassed brown noise with a slow swell.
    layer('traffic', 'lowpass', 320, 0.7, 0.55);
    // WIND — high, thin, always moving. Louder up high and out in the country.
    layer('wind', 'bandpass', 620, 0.8, 0.30);
    // MACHINE — industrial hum, a resonant band that reads as plant and conveyors.
    layer('machine', 'bandpass', 180, 4.5, 0.34);
    // SURF — the docks and the shore. Slow, wide band.
    layer('surf', 'bandpass', 460, 0.6, 0.36);

    // A slow LFO swells the traffic and wind so the bed breathes instead of sitting flat.
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lg = ctx.createGain(); lg.gain.value = 0.16;
    lfo.connect(lg); lg.connect(this.layers.traffic.g.gain); lfo.start();
    const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.11;
    const lg2 = ctx.createGain(); lg2.gain.value = 0.13;
    lfo2.connect(lg2); lg2.connect(this.layers.wind.g.gain); lfo2.start();

    // CROWD MURMUR — three detuned formant drones, very low in the mix. This is what makes a
    // populated street sound populated without any individual being audible.
    this._murmur = [];
    for (let i = 0; i < 3; i++) {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.value = rnd(88, 150);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
      bp.frequency.value = rnd(420, 900); bp.Q.value = 2.4;
      const g = ctx.createGain(); g.gain.value = 0;
      // a wobble on the formant makes it read as many overlapping voices
      const wob = ctx.createOscillator(); wob.frequency.value = rnd(0.6, 1.9);
      const wg = ctx.createGain(); wg.gain.value = rnd(60, 190);
      wob.connect(wg); wg.connect(bp.frequency); wob.start();
      o.connect(bp); bp.connect(g); g.connect(out); o.start();
      this._murmur.push(g);
    }
  }

  // Called each frame from game.update. Reads where the player is and eases the bed toward it.
  update(dt, game) {
    if (!this.started || !this.a.ok) return;
    const W = game.world, P = game.player;
    if (!P) return;

    const district = (W.districtAt ? W.districtAt(P.pos.x, P.pos.z) : '') || '';
    this.district = district;
    const D = district.toUpperCase();
    const night = W.dayT != null ? (0.5 - 0.5 * Math.cos((W.dayT - 0.25) * Math.PI * 2)) : 0;  // 1 = midnight
    const alt = Math.max(0, P.pos.y);
    const nearWater = W.waterX != null && P.pos.x > W.waterX - 220;

    // --- TARGETS, by where you actually are ------------------------------------------------
    let traffic = 0.5, wind = 0.22, crowd = 0.42, machine = 0, surf = 0, nature = 0.06;

    if (/DOWNTOWN|COMMERCIAL|CORPORATE|MIDTOWN|MARKET/.test(D)) { traffic = 0.85; crowd = 0.8; }
    if (/MARKET/.test(D)) { crowd = 1.0; }
    if (/RESIDENTIAL|SOUTHSIDE/.test(D)) { traffic = 0.45; crowd = 0.5; nature = 0.2; }
    if (/INDUSTRIAL|MINEWORKS|WORKS/.test(D)) { traffic = 0.35; machine = 0.85; crowd = 0.12; }
    if (/DOCKLANDS|HARBOR|WATERFRONT/.test(D)) { surf = 0.8; machine = 0.4; crowd = 0.2; traffic = 0.3; }
    if (/GREENBELT|PARK/.test(D)) { traffic = 0.22; nature = 0.85; crowd = 0.3; wind = 0.4; }
    if (/COUNTY|FARM/.test(D)) { traffic = 0.05; nature = 1.0; crowd = 0.02; wind = 0.6; }
    if (/MILITARY|GARRISON/.test(D)) { traffic = 0.2; machine = 0.35; crowd = 0.05; }
    if (/TEMPLE|CAMPUS/.test(D)) { traffic = 0.3; crowd = 0.35; nature = 0.3; }
    if (/LINE|METRO/.test(D)) { traffic = 0.55; machine = 0.5; crowd = 0.45; }
    if (/RESORT/.test(D)) { surf = 0.6; crowd = 0.4; traffic = 0.2; nature = 0.3; }
    if (nearWater) surf = Math.max(surf, 0.45);

    // NIGHT: the city quiets down and the country comes alive.
    traffic *= 1 - night * 0.55;
    crowd *= 1 - night * 0.7;
    machine *= 1 - night * 0.25;
    nature *= 1 + night * 0.5;

    // ALTITUDE: up in the sky the street falls away and it is just wind.
    const high = Math.min(1, alt / 160);
    traffic *= 1 - high * 0.9; crowd *= 1 - high * 0.95; machine *= 1 - high * 0.8; surf *= 1 - high * 0.5;
    wind = Math.min(1.2, wind + high * 0.95);

    // --- EASE toward the targets. Slow, so walking a block is a crossfade, not a cut.
    const k = 1 - Math.exp(-dt * 0.9);
    const L = this.layers, M = this.mix;
    M.traffic += (traffic - M.traffic) * k; M.wind += (wind - M.wind) * k;
    M.crowd += (crowd - M.crowd) * k;       M.machine += (machine - M.machine) * k;
    M.surf += (surf - M.surf) * k;          M.nature += (nature - M.nature) * k;
    if (L.traffic) L.traffic.g.gain.value = M.traffic * L.traffic.base;
    if (L.wind) { L.wind.g.gain.value = M.wind * L.wind.base; L.wind.f.frequency.value = 520 + high * 900; }
    if (L.machine) L.machine.g.gain.value = M.machine * L.machine.base;
    if (L.surf) L.surf.g.gain.value = M.surf * L.surf.base;
    for (const g of this._murmur) g.gain.value = M.crowd * 0.016;

    // --- ONE-SHOTS layered on top: the details that sell a place -----------------------------
    this._detail(dt, M, night, game);
  }

  _detail(dt, M, night, game) {
    const a = this.a;
    // birdsong / insects in green places — birds by day, crickets by night
    if (M.nature > 0.25 && Math.random() < dt * M.nature * 0.9) {
      if (night > 0.6) this._chirp(rnd(3200, 4600), 0.06, 0.02, 3);
      else this._chirp(rnd(1900, 3400), rnd(0.07, 0.16), 0.028, rnd(2, 5));
    }
    // gulls at the water
    if (M.surf > 0.4 && Math.random() < dt * 0.16) this._gull();
    // a distant car horn downtown
    if (M.traffic > 0.55 && Math.random() < dt * 0.22) this._horn();
    // industrial clank
    if (M.machine > 0.45 && Math.random() < dt * 0.5) this._clank();
    // a dog, at night, in the residential dark
    if (night > 0.5 && M.nature > 0.15 && Math.random() < dt * 0.07) this._dog();
    // a distant siren somewhere else in the city — the world has other problems
    this._sirenT -= dt;
    if (this._sirenT <= 0 && M.traffic > 0.3 && Math.random() < dt * 0.05) {
      this._sirenT = rnd(25, 70);
      if (a.siren) a.siren(null, 1);
    }
    // background crowd chatter — someone, somewhere, saying something
    if (M.crowd > 0.35 && Math.random() < dt * M.crowd * 0.55) {
      this.say(null, 'chatter', { gain: rnd(0.1, 0.24) });
    }
  }

  _chirp(f, dur, gain, n) {
    const a = this.a, ctx = a.ctx;
    for (let i = 0; i < n; i++) {
      const o = ctx.createOscillator(); o.type = 'sine';
      const at = a.t + i * dur * 1.5;
      o.frequency.setValueAtTime(f * rnd(0.94, 1.06), at);
      o.frequency.exponentialRampToValueAtTime(f * rnd(1.1, 1.5), at + dur * 0.6);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(gain, at + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g); g.connect(a.bus.ambient); o.start(at); o.stop(at + dur + 0.02);
    }
  }
  _gull() {
    const a = this.a, ctx = a.ctx;
    for (let i = 0; i < 3; i++) {
      const at = a.t + i * 0.19;
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(rnd(900, 1150), at);
      o.frequency.exponentialRampToValueAtTime(rnd(600, 780), at + 0.16);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 3;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.05, at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
      o.connect(bp); bp.connect(g); g.connect(a.bus.ambient); o.start(at); o.stop(at + 0.22);
    }
  }
  _horn() {
    const a = this.a, ctx = a.ctx, dur = rnd(0.18, 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, a.t); g.gain.exponentialRampToValueAtTime(0.035, a.t + 0.03);
    g.gain.setValueAtTime(0.035, a.t + dur * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, a.t + dur);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
    for (const f of [rnd(360, 480), rnd(500, 620)]) {          // two-tone horn
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      o.connect(lp); o.start(a.t); o.stop(a.t + dur + 0.02);
    }
    lp.connect(g); g.connect(a.bus.ambient);
  }
  _clank() {
    const a = this.a, ctx = a.ctx;
    const src = a._noise(0.09);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.value = rnd(700, 2600); bp.Q.value = rnd(6, 16);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, a.t); g.gain.exponentialRampToValueAtTime(rnd(0.02, 0.055), a.t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, a.t + rnd(0.1, 0.4));
    src.connect(bp); bp.connect(g); g.connect(a.bus.ambient); src.start();
  }
  _dog() {
    const a = this.a;
    for (let i = 0; i < 2 + ((Math.random() * 2) | 0); i++) {
      this._voiceBark({ f0: rnd(180, 260), tract: 1.5, breath: 0.2 },
        { syl: [1, 1], contour: 'fall', energy: 0.5, rate: 2.2, vowels: 'oA' },
        { gain: 0.035, delay: i * rnd(0.22, 0.4), bus: 'ambient' });
    }
  }

  // ---------------------------------------------------------------------------------------
  // THE VOICES
  // ---------------------------------------------------------------------------------------
  // say(pos, emotion, opts) — a civilian says something. `pos` gives distance falloff.
  say(pos, emotion = 'chatter', opts = {}) {
    const a = this.a;
    if (!a.ok) return;
    // RATE LIMIT. A crowd of sixty must not all speak at once — it turns to mush and eats CPU.
    const now = performance.now();
    if (now - this._lastVoice < (opts.urgent ? 40 : 130)) return;
    this._lastVoice = now;

    const bark = BARKS[emotion] || BARKS.chatter;
    const spk = SPEAKER[opts.speaker || pick(SPEAKER_KEYS)];
    let gain = opts.gain ?? 0.32;
    if (pos) gain *= a._pg(pos, emotion === 'scream' ? 190 : 120);
    if (gain < 0.012) return;                       // too far to bother synthesising
    this._voiceBark(spk, bark, { gain, delay: opts.delay || 0, bus: opts.bus || 'voice' });
  }

  // The synth itself: glottal source → three formants → envelope.
  _voiceBark(spk, bark, { gain, delay = 0, bus = 'voice' }) {
    const a = this.a, ctx = a.ctx;
    const t0 = a.t + delay;
    const syl = bark.syl[0] + ((Math.random() * (bark.syl[1] - bark.syl[0] + 1)) | 0);
    const f0 = Array.isArray(spk.f0) ? rnd(spk.f0[0], spk.f0[1]) : spk.f0;
    const rate = bark.rate * rnd(0.85, 1.15);
    const sylDur = rnd(0.11, 0.2) / rate;
    const total = syl * sylDur * 1.15;

    // --- the glottal source: a sawtooth with vibrato and a little jitter (real folds aren't steady)
    const osc = ctx.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f0, t0);
    const vib = ctx.createOscillator(); vib.frequency.value = rnd(4.4, 6.6);
    const vibG = ctx.createGain(); vibG.gain.value = f0 * 0.022;
    vib.connect(vibG); vibG.connect(osc.frequency); vib.start(t0); vib.stop(t0 + total + 0.1);

    // --- PITCH CONTOUR is what carries the emotion. This is the difference between a shout and
    //     a question, and it is doing more work than the vowels are.
    const c = bark.contour;
    if (c === 'fall')  { osc.frequency.setValueAtTime(f0 * 1.18, t0); osc.frequency.exponentialRampToValueAtTime(f0 * 0.78, t0 + total); }
    else if (c === 'rise') { osc.frequency.setValueAtTime(f0 * 0.9, t0); osc.frequency.exponentialRampToValueAtTime(f0 * 1.45, t0 + total); }
    else if (c === 'up')   { osc.frequency.setValueAtTime(f0 * 1.15, t0); osc.frequency.exponentialRampToValueAtTime(f0 * 1.9, t0 + total * 0.8); }
    else if (c === 'spike'){ osc.frequency.setValueAtTime(f0 * 1.5, t0); osc.frequency.exponentialRampToValueAtTime(f0 * 2.5, t0 + total * 0.3); osc.frequency.exponentialRampToValueAtTime(f0 * 1.6, t0 + total); }
    else { osc.frequency.setValueAtTime(f0, t0); osc.frequency.linearRampToValueAtTime(f0 * rnd(0.94, 1.06), t0 + total); }

    // --- BREATH: a noise layer through the same formants. Elders and screams are breathier.
    const noise = a._noise(total + 0.1);
    const nGain = ctx.createGain(); nGain.gain.value = spk.breath * (bark.energy * 0.6 + 0.4);
    noise.connect(nGain);

    // --- the SYLLABLE envelope: this is what makes it read as speech and not a tone
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    for (let i = 0; i < syl; i++) {
      const s = t0 + i * sylDur * 1.15;
      const peak = gain * bark.energy * rnd(0.72, 1.0) * (i === 0 ? 1 : rnd(0.6, 0.95));
      env.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), s + sylDur * 0.22);
      env.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * 0.22), s + sylDur * 0.85);
    }
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + total + 0.06);

    // --- THREE FORMANTS, each stepping through the vowel sequence
    const vlist = bark.vowels.split('');
    const seq = Array.from({ length: syl }, () => VOWEL[pick(vlist)] || VOWEL.a);
    const sum = ctx.createGain(); sum.gain.value = 1;
    for (let fi = 0; fi < 3; fi++) {
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
      bp.Q.value = fi === 0 ? 7 : fi === 1 ? 9 : 11;
      bp.frequency.setValueAtTime(seq[0][fi] * spk.tract, t0);
      for (let i = 1; i < syl; i++) {
        // glide between vowels rather than jumping — that glide IS coarticulation
        bp.frequency.linearRampToValueAtTime(seq[i][fi] * spk.tract, t0 + i * sylDur * 1.15 + sylDur * 0.3);
      }
      const fg = ctx.createGain(); fg.gain.value = fi === 0 ? 1 : fi === 1 ? 0.5 : 0.28;
      osc.connect(bp); nGain.connect(bp); bp.connect(fg); fg.connect(sum);
    }
    // a gentle lowpass keeps it from getting fizzy, and a touch of the raw source adds body
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3800; lp.Q.value = 0.6;
    sum.connect(lp); lp.connect(env);
    env.connect(a.bus[bus] || a.bus.voice);

    osc.start(t0); osc.stop(t0 + total + 0.12);
    noise.start(t0); noise.stop(t0 + total + 0.12);
  }

  // ---------------------------------------------------------------------------------------
  // THE SCORE
  // ---------------------------------------------------------------------------------------
  // Procedural, on its own bus, and INTENSITY-DRIVEN: a drone bed that is always there, a pulse
  // that arrives when a fight starts, and a brass-ish swell for the big moments. Nothing loops,
  // so it never wears out the way a short track would. Built from the same synthesis vocabulary
  // as everything else — no assets.
  //
  // The mode is what changes: MENU is slow and wide, COMBAT adds the pulse and the low ostinato,
  // VICTORY resolves it. setMusic() crossfades; it never cuts.
  music(mode = 'menu') {
    const a = this.a;
    if (!a.ok) return;
    if (this._mode === mode) return;
    this._mode = mode;
    const ctx = a.ctx, out = a.bus.music;

    if (!this._mus) {
      this._mus = { nodes: [], gain: ctx.createGain() };
      this._mus.gain.gain.value = 0;
      this._mus.gain.connect(out);

      // --- THE DRONE: a stacked fifth with slow detune. The bed everything else sits on.
      // A minor tonality (root + fifth + minor third an octave up) reads as weight without melodrama.
      const root = 55;                                     // A1
      for (const [mult, level, type] of [[1, 0.30, 'sine'], [1.5, 0.20, 'sine'], [2, 0.13, 'triangle'], [2.4, 0.07, 'sine']]) {
        const o = ctx.createOscillator(); o.type = type;
        o.frequency.value = root * mult;
        const det = ctx.createOscillator(); det.frequency.value = rnd(0.04, 0.13);
        const dg = ctx.createGain(); dg.gain.value = root * mult * 0.004;
        det.connect(dg); dg.connect(o.frequency); det.start();
        const g = ctx.createGain(); g.gain.value = level;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.7;
        o.connect(lp); lp.connect(g); g.connect(this._mus.gain); o.start();
        this._mus.nodes.push(o, det);
        if (mult === 1) this._mus.filter = lp;             // the filter we open up when it gets loud
      }

      // --- THE PULSE: a filtered heartbeat that only exists in combat.
      const pulse = ctx.createGain(); pulse.gain.value = 0;
      pulse.connect(this._mus.gain);
      this._mus.pulse = pulse;
      const po = ctx.createOscillator(); po.type = 'square'; po.frequency.value = root * 0.5;
      const plp = ctx.createBiquadFilter(); plp.type = 'lowpass'; plp.frequency.value = 220; plp.Q.value = 6;
      po.connect(plp); plp.connect(pulse); po.start();
      this._mus.nodes.push(po);
      // gate it with an LFO so it thumps at roughly a resting heart rate
      const gate = ctx.createOscillator(); gate.type = 'sawtooth'; gate.frequency.value = 1.15;
      const gg = ctx.createGain(); gg.gain.value = 90;
      gate.connect(gg); gg.connect(plp.frequency); gate.start();
      this._mus.nodes.push(gate);
    }

    const M = this._mus, t = a.t;
    const set = (param, v, time = 2.5) => { param.cancelScheduledValues(t); param.setTargetAtTime(v, t, time / 3); };
    if (mode === 'menu')     { set(M.gain.gain, 0.55); set(M.pulse.gain, 0.0); if (M.filter) set(M.filter.frequency, 780, 3); }
    else if (mode === 'combat') { set(M.gain.gain, 0.42); set(M.pulse.gain, 0.16); if (M.filter) set(M.filter.frequency, 1500, 4); }
    else if (mode === 'victory'){ set(M.gain.gain, 0.62, 1.2); set(M.pulse.gain, 0.0, 1.5); if (M.filter) set(M.filter.frequency, 2400, 2); }
    else if (mode === 'off')    { set(M.gain.gain, 0.0, 1.5); set(M.pulse.gain, 0.0, 1); }
  }

  stop() {
    if (!this.started) return;
    for (const k in this.layers) { try { this.layers[k].src.stop(); } catch {} }
    this.layers = {}; this._murmur = []; this.started = false;
  }
}

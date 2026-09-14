import {LIBRARY_SAMPLES} from '../data/sound-library-recordings.js';
import {FIREARM_SAMPLES} from '../data/firearm-recordings.js';

// THE AUDIO LAW (audio.js): WebAudio throws on a non-finite AudioParam, and an exception
// inside a setter is an exception inside the FRAME LOOP. Every value that reaches an
// AudioParam here is coerced first — the synth bodies have always done this; the sample
// layer was added later and never got it, which is how a NaN distance-gain took the game
// down from a projectile impact.
const fin = (v, d = 1) => (Number.isFinite(v) ? v : d);
const bounded = (v,lo,hi,fallback) => Math.max(lo,Math.min(hi,fin(v,fallback)));
// Own only the nodes of this voice, never disconnect an existing mix bus.
function route(a,src,g,bus,pos) {
  let pan=null;
  try { pan=a.ctx.createStereoPanner?.()??null; } catch(e) { /* old/limited WebAudio: mono */ }
  src.connect(g);
  if(pan){pan.pan.value=bounded(a._pan?.(pos),-.85,.85,0);g.connect(pan);}
  (pan||g).connect((a.bus&&a.bus[bus])||a.master);
  // Legacy mono→stereo bus upmix copies the full signal to BOTH channels. An
  // equal-power panner instead gives each centre channel 1/sqrt(2); compensate
  // only mono recordings so centred combat keeps its established mix level.
  const normalization=pan&&src.buffer.numberOfChannels===1?Math.SQRT2:1;
  let ended=false;
  return {pan,normalization,disconnect(){if(ended)return;ended=true;for(const node of [src,g,pan])if(node)node.disconnect();}};
}
// THE SAMPLE BANK — real recorded audio for every discrete sound effect (Robert's ruling
// 2026-07-24: "get audio for ALL sound effects and powers — no more generated stuff").
// Source: Kenney CC0 packs (impact-sounds, sci-fi-sounds, interface-sounds, rpg-audio,
// music-jingles), curated into /public/audio (254 files, ~6MB, offline-first).
//
// THE CONTRACT: audio methods try the sample FIRST and fall back to the old synth if the
// buffer isn't decoded yet — a cold cache must never mean silence (the energy-clarity law).
// `play()` returns true when the event is HANDLED (played, muted, or out of earshot) and
// false only when no buffer is ready, which is the caller's cue to synth.
//
// Documented exceptions that STAY synthesized (no honest sample exists in the library, and
// each is a crafted, parameter-driven voice): the police two-tone siren, water splashes,
// electric arcs, the KMK 9 news sting, and the sustained KI energy voice (ring-mod + partials
// + crackle — a generic engine loop would be a downgrade; fire cones DO get a real roar).

export const MANIFEST = {...FIREARM_SAMPLES,...LIBRARY_SAMPLES,
  // ---- fists, bodies, the ground ----
  'punch.med': { f: ['impactPunch_medium_000', 'impactPunch_medium_001', 'impactPunch_medium_002', 'impactPunch_medium_003', 'impactPunch_medium_004'], g: 0.9, reach: 150 },
  'punch.heavy': { f: ['impactPunch_heavy_000', 'impactPunch_heavy_001', 'impactPunch_heavy_002', 'impactPunch_heavy_003', 'impactPunch_heavy_004'], g: 1.0, reach: 170 },
  'hit.soft': { f: ['impactGeneric_light_000', 'impactGeneric_light_001', 'impactGeneric_light_002', 'impactGeneric_light_003', 'impactGeneric_light_004'], g: 0.7, reach: 110 },
  'land.flesh': { f: ['impactSoft_heavy_000', 'impactSoft_heavy_001', 'impactSoft_heavy_002', 'impactSoft_heavy_003', 'impactSoft_heavy_004'], g: 0.8, reach: 120 },
  'land.soft': { f: ['impactSoft_medium_000', 'impactSoft_medium_001', 'impactSoft_medium_002', 'impactSoft_medium_003', 'impactSoft_medium_004'], g: 0.6, reach: 90 },
  'land.metal': { f: ['impactMetal_heavy_000', 'impactMetal_heavy_001', 'impactMetal_heavy_002', 'impactMetal_heavy_003', 'impactMetal_heavy_004'], g: 0.9, reach: 150 },
  'metal.hit': { f: ['impactMetal_light_000', 'impactMetal_light_001', 'impactMetal_light_002', 'impactMetal_light_003', 'impactMetal_light_004'], g: 0.8, reach: 130 },
  'metal.med': { f: ['impactMetal_medium_000', 'impactMetal_medium_001', 'impactMetal_medium_002', 'impactMetal_medium_003', 'impactMetal_medium_004'], g: 0.85, reach: 140 },
  'parry': { f: ['impactBell_heavy_000', 'impactBell_heavy_001'], g: 0.7, reach: 160 },
  'step.concrete': { f: ['footstep_concrete_000', 'footstep_concrete_001', 'footstep_concrete_002', 'footstep_concrete_003', 'footstep_concrete_004'], g: 0.4, reach: 55, rj: 0.1 },
  'step.grass': { f: ['footstep_grass_000', 'footstep_grass_001', 'footstep_grass_002', 'footstep_grass_003', 'footstep_grass_004'], g: 0.4, reach: 55, rj: 0.1 },

  // ---- the city breaking ----
  'boom': { f: ['explosionCrunch_000', 'explosionCrunch_001', 'explosionCrunch_002', 'explosionCrunch_003', 'explosionCrunch_004'], g: 1.0, reach: 250 },
  'boom.deep': { f: ['lowFrequency_explosion_000', 'lowFrequency_explosion_001'], g: 0.9, reach: 280 },
  'rubble': { f: ['impactMining_000', 'impactMining_001', 'impactMining_002', 'impactMining_003', 'impactMining_004'], g: 0.9, reach: 180 },
  'debris.wood': { f: ['impactPlank_medium_000', 'impactPlank_medium_001', 'impactPlank_medium_002', 'impactWood_heavy_000', 'impactWood_heavy_001'], g: 0.8, reach: 140 },
  'glass.break': { f: ['impactGlass_heavy_000', 'impactGlass_heavy_001', 'impactGlass_heavy_002', 'impactGlass_heavy_003', 'impactGlass_heavy_004'], g: 0.8, reach: 150 },
  'glass.light': { f: ['impactGlass_light_000', 'impactGlass_light_001', 'impactGlass_light_002', 'impactGlass_light_003', 'impactGlass_light_004'], g: 0.6, reach: 110 },
  'gun.crack': { f: ['impactPlate_heavy_000', 'impactPlate_heavy_001', 'impactPlate_heavy_002', 'impactPlate_heavy_003', 'impactPlate_heavy_004'], g: 0.9, reach: 210 },
  'gun.light': { f: ['impactPlate_light_000', 'impactPlate_light_001', 'impactPlate_light_002', 'impactPlate_light_003', 'impactPlate_light_004'], g: 0.7, reach: 160 },

  // ---- ki, lasers, the powers ----
  'ki.blast': { f: ['laserSmall_000', 'laserSmall_001', 'laserSmall_002', 'laserSmall_003', 'laserSmall_004'], g: 0.65, reach: 120, rj: 0.09 },
  'ki.zap': { f: ['laserRetro_000', 'laserRetro_001', 'laserRetro_002', 'laserRetro_003', 'laserRetro_004'], g: 0.5, reach: 100, rj: 0.09 },
  'ki.release': { f: ['laserLarge_000', 'laserLarge_001', 'laserLarge_002', 'laserLarge_003', 'laserLarge_004'], g: 0.85, reach: 190 },
  'fx.glitch': { f: ['glitch_001', 'glitch_002', 'glitch_003', 'glitch_004'], g: 0.6, reach: 110 },
  'fx.forcefield': { f: ['forceField_000', 'forceField_001', 'forceField_002', 'forceField_003', 'forceField_004'], g: 0.55, reach: 130 },
  'fire.roar': { f: ['thrusterFire_000', 'thrusterFire_001', 'thrusterFire_002', 'thrusterFire_003', 'thrusterFire_004'], g: 0.6, reach: 140, loop: true },
  'engine.charge': { f: ['engineCircular_000', 'engineCircular_001', 'engineCircular_002', 'engineCircular_003', 'engineCircular_004'], g: 0.5, reach: 120, loop: true },
  'engine.low': { f: ['spaceEngineLow_000', 'spaceEngineLow_001', 'spaceEngineLow_002', 'spaceEngineLow_003', 'spaceEngineLow_004'], g: 0.5, reach: 140, loop: true },

  // ---- steel and string ----
  'swing.fist': { f: ['cloth1', 'cloth2', 'cloth3', 'cloth4'], g: 0.55, reach: 80, rj: 0.12 },
  'swing.blade': { f: ['knifeSlice', 'knifeSlice2', 'drawKnife1', 'drawKnife2', 'drawKnife3'], g: 0.6, reach: 100, rj: 0.08 },
  'chop': { f: ['chop'], g: 0.7, reach: 110 },
  'bow.twang': { f: ['pluck_001', 'pluck_002'], g: 0.7, reach: 110 },
  'bow.creak': { f: ['creak1', 'creak2', 'creak3'], g: 0.5, reach: 60 },
  'holster': { f: ['metalClick', 'metalLatch', 'beltHandle1', 'beltHandle2'], g: 0.5, reach: 60 },

  // ---- doors (interiors) ----
  'door.open': { f: ['doorOpen_000', 'doorOpen_001', 'doorOpen_002'], g: 0.6, reach: 80 },
  'door.close': { f: ['doorClose_000', 'doorClose_001', 'doorClose_002'], g: 0.6, reach: 80 },

  // ---- the interface (ui bus) ----
  'ui.click': { f: ['click_001', 'click_002', 'click_003', 'click_004', 'click_005'], g: 0.5 },
  'ui.select': { f: ['select_001', 'select_002', 'select_003', 'select_004'], g: 0.5 },
  'ui.back': { f: ['back_001', 'back_002', 'back_003', 'back_004'], g: 0.5 },
  'ui.confirm': { f: ['confirmation_001', 'confirmation_002', 'confirmation_003', 'confirmation_004'], g: 0.55 },
  'ui.error': { f: ['error_001', 'error_002', 'error_003', 'error_004'], g: 0.5 },
  'ui.toggle': { f: ['switch_001', 'switch_002', 'switch_003', 'switch_004', 'toggle_001', 'toggle_002'], g: 0.5 },
  'ui.scroll': { f: ['scroll_001', 'scroll_002', 'scroll_003'], g: 0.4 },
  'ui.key': { f: ['tick_001', 'tick_002', 'tick_004'], g: 0.4, rj: 0.16 },
  'ui.open': { f: ['maximize_001', 'maximize_002', 'maximize_003', 'open_001', 'open_002'], g: 0.5 },
  'ui.close': { f: ['minimize_001', 'minimize_002', 'minimize_003', 'close_001', 'close_002'], g: 0.5 },
  'ui.question': { f: ['question_001', 'question_002'], g: 0.5 },
  'ui.bong': { f: ['bong_001'], g: 0.55 },
  'book.open': { f: ['bookOpen'], g: 0.6 },
  'book.close': { f: ['bookClose'], g: 0.6 },
  'book.flip': { f: ['bookFlip1', 'bookFlip2', 'bookFlip3'], g: 0.55, rj: 0.1 },
  'computer': { f: ['computerNoise_000', 'computerNoise_001', 'computerNoise_002', 'computerNoise_003'], g: 0.4 },
  'scratch': { f: ['scratch_001', 'scratch_002', 'scratch_003'], g: 0.5 },

  // ---- stingers (music bus, used sparingly) ----
  // ---- REAL RECORDINGS FOR THE ATTACK PATHS (2026-07-26) -----------------------------------
  // Robert: "100% should be wav/mp3, no coded sound effects for any attacks." These are the
  // families that replace the last synthesised attack voices. CC0 throughout: the RPG Sound Pack
  // (OpenGameArt) for swings, casting and water, and 80 CC0 Creature SFX for the human reactions.
  'swing.air':    { f: ['sw_air1', 'sw_air2', 'sw_air3'], g: 0.62, reach: 95, rj: 0.1 },
  'blade.draw':   { f: ['sw_draw1', 'sw_draw2', 'sw_draw3'], g: 0.55, reach: 90 },
  'blade.ring':   { f: ['blade_ring'], g: 0.5, reach: 110 },
  'cast.magic':   { f: ['cast_magic'], g: 0.8, reach: 170 },
  'cast.spell':   { f: ['cast_spell'], g: 0.8, reach: 180 },
  'water.splash': { f: ['water1', 'water2', 'water3'], g: 0.75, reach: 130 },
  'armor.shift':  { f: ['armor1', 'armor2'], g: 0.5, reach: 70 },
  // human reactions — pain, effort, and the street
  'v.pain':       { f: ['pain_01', 'pain_02', 'pain_03', 'pain_04', 'pain_05'], g: 0.75, reach: 150 },
  'v.exert':      { f: ['exert_01', 'exert_02', 'exert_03', 'exert_04', 'exert_05'], g: 0.7, reach: 130 },
  'v.roar':       { f: ['roar_01', 'roar_02', 'roar_03'], g: 0.9, reach: 200 },
  'v.howl':       { f: ['howl_01'], g: 0.85, reach: 210 },
  'v.beast':      { f: ['beast_01', 'beast_02', 'beast_03', 'beast_04', 'beast_05', 'beast_06', 'beast_07'], g: 0.8, reach: 180 },
  'ped.scream':   { f: ['ped_scream_01', 'ped_scream_02'], g: 0.85, reach: 190 },
  'ped.gasp':     { f: ['ped_gasp_01'], g: 0.6, reach: 110 },
  'ped.cough':    { f: ['cough_01', 'cough_02', 'cough_03'], g: 0.65, reach: 100 },
  'ped.breath':   { f: ['breath_01'], g: 0.5, reach: 80 },
  'sting.wanted': { f: ['jingles_STEEL00', 'jingles_STEEL01', 'jingles_STEEL02', 'jingles_STEEL03', 'jingles_STEEL04'], g: 0.5 },
  'sting.clear': { f: ['jingles_STEEL13'], g: 0.45 },
  'sting.victory': { f: ['jingles_STEEL14', 'jingles_STEEL15', 'jingles_STEEL16'], g: 0.55 },
  'sting.ko': { f: ['jingles_HIT00', 'jingles_HIT01', 'jingles_HIT02', 'jingles_HIT07'], g: 0.45 },
};

// decoded at init so the first punch of a match is never a synth fallback
export const HOT_SET = [...Object.keys(FIREARM_SAMPLES),...Object.keys(LIBRARY_SAMPLES),
  'punch.med', 'punch.heavy', 'hit.soft', 'land.flesh', 'land.metal', 'land.soft', 'boom',
  'ki.blast', 'ki.zap', 'ki.release', 'swing.fist', 'swing.blade', 'gun.crack', 'boom.deep',
  'ui.click', 'ui.select', 'ui.error', 'ui.key', 'ui.confirm', 'ui.toggle', 'fx.glitch',
  'swing.air', 'v.pain', 'v.exert', 'ped.scream', 'water.splash',
  'step.concrete', 'step.grass', 'rubble', 'glass.break', 'fire.roar', 'sting.wanted',
  'sting.clear', 'sting.ko', 'sting.victory', 'book.open', 'book.flip', 'book.close', 'parry',
  // ⚠ THE FIRST KO CRY AND THE FIRST KI CHARGE OF A SESSION WERE FALLING THROUGH TO THE SYNTH.
  // `v.pain` and `v.exert` were hot but `v.roar` (audio.js:273) was not, and neither were the
  // power up/down casts (audio.js:739) or the charge loop (audio.js:344). Robert's ruling was
  // explicit — *"100% should be wav/mp3, no coded sound effects for any attacks"* — and a sample
  // that decodes on first use is a synth on first use.
  'v.roar', 'cast.spell', 'cast.magic', 'engine.charge', 'engine.low',
];

export class SampleBank {
  constructor(audio) {
    this.a = audio;
    this.buf = new Map();      // file → AudioBuffer | null (null = failed, stop retrying)
    this.pend = new Map();     // file → Promise
    this.base = 'audio/';
  }
  load(file) {
    if (this.buf.has(file)) return Promise.resolve(this.buf.get(file));
    if (this.pend.has(file)) return this.pend.get(file);
    // ⚠ MP3, NOT OGG (2026-07-26). Robert: "100% should be wav/mp3." The library was 258 .ogg
    // files; it is 300 .mp3 files now, converted with ffmpeg at 96k mono. Same bytes on the wire,
    // one format everywhere, and it plays in Safari — which .ogg does not, on older versions.
    const p = fetch(this.base + file + '.mp3')
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.arrayBuffer(); })
      .then((ab) => this.a.ctx.decodeAudioData(ab))
      .then((b) => { this.buf.set(file, b); this.pend.delete(file); return b; })
      .catch(() => { this.buf.set(file, null); this.pend.delete(file); console.warn('[samples] missing', file); return null; });
    this.pend.set(file, p);
    return p;
  }
  preload(names) { for (const n of names) { const m = MANIFEST[n]; if (m) for (const f of m.f) this.load(f); } }
  async prepare(name) {const m=MANIFEST[name];if(!m)return null;await Promise.all(m.f.map(f=>this.load(f)));return this.buffer(name);}
  buffer(name) {const m=MANIFEST[name];return m?this._pick(m):null;}
  _pick(m) {
    const f = m.f[(Math.random() * m.f.length) | 0];
    let b = this.buf.get(f);
    if (b === undefined) { this.load(f); b = null; }
    if (!b) for (const alt of m.f) { const ab = this.buf.get(alt); if (ab) return ab; }   // any decoded variant beats silence
    return b || null;
  }
  // Returns TRUE when the event is handled (played, muted, out of earshot) — FALSE only when
  // no buffer is ready yet, which tells the caller to run its synth fallback.
  play(name, { pos = null, gain = 1, rate = 1, bus = 'sfx', reach, delay = 0 } = {}) {
    const a = this.a;
    if (!a.ok || a.muted) return true;
    const m = MANIFEST[name]; if (!m) return false;
    const pg = bounded(a._pg(pos, reach ?? m.reach ?? 130),0,1,0);
    if (pg === 0) return true;
    const b = this._pick(m); if (!b) return false;
    const src = a.ctx.createBufferSource(); src.buffer = b;
    const rj = m.rj ?? 0.05;
    src.playbackRate.value = bounded(bounded(rate,.25,16,1) * (1 + (Math.random() * 2 - 1) * rj),.25,16,1);
    const g = a.ctx.createGain();
    const routing=route(a,src,g,bus,pos);
    g.gain.value = bounded(gain,0,16,1) * (m.g ?? 1) * pg * routing.normalization;
    src.onended=()=>routing.disconnect();
    // ⚠ an offset start is what makes a layer read as a SECOND event rather than a thicker first
    // one. It was accepted by callers and silently dropped here.
    src.start(fin(delay, 0) > 0 ? a.ctx.currentTime + fin(delay, 0) : 0);
    return true;
  }
  // Sustained loop with the sustain() contract: set(intensity, pos) every live frame,
  // stop() fades out, registered in audio._sus so the watchdog reaps forgotten loops.
  loop(name, { pos = null, bus = 'sfx', rate = 1, reach } = {}) {
    const a = this.a;
    if (!a.ok || a.muted) return null;
    const m = MANIFEST[name]; if (!m) return null;
    const b = this._pick(m); if (!b) return null;
    const src = a.ctx.createBufferSource(); src.buffer = b; src.loop = true;
    rate=bounded(rate,.25,16,1);
    src.playbackRate.value = rate;
    const g = a.ctx.createGain(); g.gain.value = 0;
    const routing=route(a,src,g,bus,pos);
    src.start();
    // ⚠ D1 — TWO CLOCKS, ONE WATCHDOG. `T()` is `ctx.currentTime` (SECONDS from AudioContext
    // creation) and is correct for scheduling every AudioParam here — never change it. But the
    // sustain watchdog (`AudioBus.sweep`, audio.js) reaps on `performance.now() - h.last > 450`,
    // and `performance.now()` is MILLISECONDS from navigation start. Stamping `h.last` in ctx
    // seconds meant `now(ms, ~120000) - last(s, ~5)` is permanently > 450, so every RECORDED loop
    // in the game — the beam voice, the ki-charge spool, the flamethrower roar — was reaped on the
    // first sweep after creation, however hard `set()` was driving it. Every SYNTH handle
    // (charge/beamVoice/sustain in audio.js) already stamps `performance.now()`; this is the one
    // outlier. `last` is ONLY read by the watchdog, so it uses the watchdog's clock; scheduling
    // keeps ctx time. Do NOT "fix" this by widening the 450ms window — the two clocks diverge
    // without bound, so no threshold works.
    const T = () => a.ctx.currentTime;
    const NOW = () => performance.now();
    const proximity=p=>a.muted?0:bounded(a._pg(p,reach??m.reach??140),0,1,0);
    g.gain.setValueAtTime(0,T());
    g.gain.linearRampToValueAtTime((m.g ?? 1) * 0.5 * proximity(pos) * routing.normalization, T() + 0.06);
    const h = {
      last: NOW(),
      set(I, p) {
        if(h._dead)return;
        h.last = NOW();
        const point=p??pos,L=bounded(I,0,1,0),pg=proximity(point);
        const target=(m.g??1)*(.15+.85*L)*pg*routing.normalization;
        g.gain.cancelScheduledValues(T());
        if(a.muted)g.gain.setValueAtTime(0,T());else g.gain.setTargetAtTime(target,T(),.08);
        if(routing.pan)routing.pan.pan.setTargetAtTime(bounded(a._pan?.(point),-.85,.85,0),T(),.08);
        src.playbackRate.setTargetAtTime(bounded(rate*(.85+.45*L),.25,16,1),T(),.1);
      },
      stop() {
        if (h._dead) return; h._dead = true;
        a._sus.delete(h);
        try { g.gain.cancelScheduledValues(T());g.gain.setTargetAtTime(0,T(),.05);src.stop(T()+.4); } catch(e) { routing.disconnect(); }
      },
    };
    src.onended=()=>{h._dead=true;a._sus.delete(h);routing.disconnect();};
    a._sus.add(h);
    return h;
  }
}

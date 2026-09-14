// authoring/audio/operation-v1/recipes.mjs
//
// The synthesis recipes for every operation-v1 cue. Each recipe is a pure function of a seeded PRNG
// (see synth.mjs), so `render(id, variant)` is byte-deterministic. The design intent, gameplay
// event mapping, dedup/cooldown rules and reuse decisions live in src/data/audio-cues.js
// (OPERATION_AUDIO_CUES); this file owns only how the waveform is built.
//
// Families:
//   combat   — hit/block/guard-break confirmations (dry, non-positional feedback)
//   shield   — one-way dome deploy / shell-hit / collapse
//   scanner  — threat-scan LOCKED / LOST-expired
//   portal   — deployment gate ready / body crossing
//   squad    — friendly filtered-radio orders (ready / regroup)
//   pursuit  — friendly filtered-radio contact reports (observer-knowledge safe)
//   zombie   — spatial enemy creature vocals (synthesised, NOT speech, no voice cloning)

import {
  SR, rng, seedOf, buffer, secs, mix, osc, tone, noise, env, applyEnv, fade,
  biquad, sweepLP, softclip, ringmod, tremolo, delay, radio, normalizePeak,
} from './synth.mjs';

const lerp = (a, b, u) => a + (b - a) * Math.min(1, Math.max(0, u));
const glide = (a, b, total, curve = 1) => (t) => lerp(a, b, Math.pow(Math.min(1, t / total), curve));

// ---- COMBAT CONFIRMATIONS ---------------------------------------------------------------------
function hitConfirm(rand) {
  const dur = 0.09, b = buffer(dur);
  const f = 2100 + rand() * 500;
  mix(b, applyEnv(osc('sine', 0.05, { freq: f }), env.ad(0.001, 0.05, 3)), { gain: 0.9 });
  mix(b, applyEnv(osc('sine', 0.05, { freq: f * 1.5 }), env.ad(0.001, 0.03, 3)), { gain: 0.35 });
  mix(b, applyEnv(osc('sine', 0.06, { freq: 720 }), env.ad(0.001, 0.055, 2.5)), { gain: 0.4 }); // body
  const tick = noise(0.008, { rand }); biquad(tick, 'hp', 3000, 0.7);
  mix(b, tick, { gain: 0.5 });
  return normalizePeak(fade(b, 0.0005, 0.008), 0.86);
}
function blockConfirm(rand) {
  const dur = 0.15, b = buffer(dur);
  // damped inharmonic metal: two partials with fast decay
  for (const [f, g, tau] of [[330, 0.7, 0.05], [497, 0.5, 0.04], [742, 0.3, 0.03]])
    mix(b, applyEnv(osc('sine', 0.12, { freq: f * (1 + (rand() - 0.5) * 0.02) }), env.exp(tau)), { gain: g });
  const thud = noise(0.04, { rand }); biquad(thud, 'lp', 900, 0.9); applyEnv(thud, env.ad(0.001, 0.04, 2));
  mix(b, thud, { gain: 0.5 });
  const ring = applyEnv(osc('sine', 0.14, { freq: 1650 }), env.exp(0.05)); biquad(ring, 'bp', 1650, 3);
  mix(b, ring, { gain: 0.18 });
  return normalizePeak(fade(b, 0.0005, 0.02), 0.82);
}
function guardBreak(rand) {
  const dur = 0.36, b = buffer(dur);
  // descending cracked sweep through drive
  const sweep = osc('saw', 0.24, { freq: glide(900, 170, 0.24, 1.3) }); biquad(sweep, 'lp', 2600, 1.1); softclip(sweep, 2.4);
  applyEnv(sweep, env.ad(0.002, 0.24, 1.6)); mix(b, sweep, { gain: 0.6 });
  mix(b, applyEnv(osc('sine', 0.2, { freq: glide(150, 62, 0.18) }), env.exp(0.09)), { gain: 0.7 }); // sub thump
  // granular shatter tail
  for (let k = 0; k < 9; k++) {
    const at = 0.05 + rand() * 0.26, g = noise(0.02, { rand }); biquad(g, 'bp', 1200 + rand() * 2600, 4);
    applyEnv(g, env.ad(0.0005, 0.02, 2)); mix(b, g, { gain: 0.14 + rand() * 0.1, at });
  }
  return normalizePeak(fade(b, 0.001, 0.03), 0.9);
}

// ---- SHIELD DOME ------------------------------------------------------------------------------
function shieldDeploy(rand) {
  const dur = 0.72, b = buffer(dur);
  const air = noise(0.42, { rand }); sweepLP(air, glide(400, 4200, 0.4, 0.8), 0.9); applyEnv(air, env.asr(0.06, 0.12, 0.42));
  mix(b, air, { gain: 0.4, at: 0.0 });
  mix(b, applyEnv(osc('sine', 0.4, { freq: glide(120, 300, 0.4) }), env.asr(0.03, 0.1, 0.4)), { gain: 0.35 }); // rising bed
  // harmonic settle chord at arrival
  for (const [f, g] of [[220, 0.5], [330, 0.4], [440, 0.3]])
    mix(b, applyEnv(osc('sine', 0.3, { freq: f }), env.ad(0.01, 0.3, 1.5)), { gain: g * 0.5, at: 0.34 });
  tremolo(b, 22, 0.12);
  return normalizePeak(fade(b, 0.006, 0.05), 0.8);
}
function shieldHit(rand) {
  const dur = 0.19, b = buffer(dur);
  const zap = applyEnv(osc('sine', 0.12, { freq: 1400 + rand() * 300 }), env.exp(0.05)); ringmod(zap, 90, 0.5);
  mix(b, zap, { gain: 0.6 });
  const splash = noise(0.06, { rand }); biquad(splash, 'bp', 1200, 1.2); applyEnv(splash, env.ad(0.001, 0.06, 2.2));
  mix(b, splash, { gain: 0.45 });
  const shell = applyEnv(osc('sine', 0.14, { freq: 2200 }), env.exp(0.045)); biquad(shell, 'bp', 2200, 4);
  mix(b, shell, { gain: 0.2 });
  return normalizePeak(fade(b, 0.0005, 0.02), 0.8);
}
function shieldCollapse(rand) {
  const dur = 0.6, b = buffer(dur);
  const dn = osc('saw', 0.32, { freq: glide(300, 58, 0.32, 1.4) }); biquad(dn, 'lp', 1800, 1); softclip(dn, 1.8);
  applyEnv(dn, env.ad(0.004, 0.32, 1.4)); mix(b, dn, { gain: 0.55 });
  for (let k = 0; k < 14; k++) {
    const at = 0.03 + rand() * 0.4, g = noise(0.03, { rand }); biquad(g, 'bp', 900 + rand() * 3200, 5);
    applyEnv(g, env.ad(0.0005, 0.03, 2)); mix(b, g, { gain: 0.1 + rand() * 0.08, at });
  }
  mix(b, applyEnv(osc('sine', 0.25, { freq: 54 }), env.exp(0.12)), { gain: 0.5, at: 0.28 }); // final thud
  return normalizePeak(fade(b, 0.002, 0.05), 0.86);
}

// ---- SCANNER ----------------------------------------------------------------------------------
function scannerAcquire(rand) {
  const dur = 0.22, b = buffer(dur);
  mix(b, applyEnv(osc('sine', 0.08, { freq: 880 }), env.ad(0.004, 0.08, 2)), { gain: 0.7, at: 0.0 });
  mix(b, applyEnv(osc('sine', 0.1, { freq: 1320 }), env.ad(0.004, 0.1, 2)), { gain: 0.7, at: 0.09 });
  const tick = noise(0.006, { rand }); biquad(tick, 'hp', 2600, 0.7); mix(b, tick, { gain: 0.3, at: 0.09 });
  return normalizePeak(fade(b, 0.001, 0.02), 0.8);
}
function scannerLost(rand) {
  const dur = 0.26, b = buffer(dur);
  mix(b, applyEnv(osc('sine', 0.09, { freq: 1320 }), env.ad(0.004, 0.09, 2)), { gain: 0.6, at: 0.0 });
  mix(b, applyEnv(osc('sine', 0.11, { freq: 660 }), env.ad(0.004, 0.11, 2)), { gain: 0.6, at: 0.09 });
  const fizz = noise(0.12, { rand }); biquad(fizz, 'bp', 1800, 1.1); applyEnv(fizz, env.ad(0.02, 0.1, 1.5));
  mix(b, fizz, { gain: 0.16, at: 0.08 });
  return normalizePeak(fade(b, 0.001, 0.03), 0.72);
}

// ---- PORTAL -----------------------------------------------------------------------------------
function portalReady(rand) {
  const dur = 0.54, b = buffer(dur);
  mix(b, applyEnv(osc('sine', 0.4, { freq: 90 }), env.asr(0.05, 0.12, 0.4)), { gain: 0.4 });
  mix(b, applyEnv(osc('sine', 0.4, { freq: 180 }), env.asr(0.05, 0.12, 0.4)), { gain: 0.25 });
  const shim = noise(0.34, { rand }); sweepLP(shim, glide(600, 5000, 0.34, 0.7), 0.8); applyEnv(shim, env.ad(0.05, 0.3, 1.4));
  mix(b, shim, { gain: 0.18 });
  for (const [f, g] of [[1046, 0.5], [1568, 0.35]]) // resolving chime
    mix(b, applyEnv(osc('sine', 0.22, { freq: f }), env.ad(0.005, 0.22, 1.6)), { gain: g * 0.5, at: 0.3 });
  return normalizePeak(fade(b, 0.005, 0.04), 0.8);
}
function portalCross(rand) {
  const dur = 0.4, b = buffer(dur);
  const dop = osc('sine', 0.3, { freq: (t) => 700 - 400 * Math.sin(Math.min(1, t / 0.3) * Math.PI) }); // dip then rise
  applyEnv(dop, env.asr(0.02, 0.08, 0.3)); softclip(dop, 1.4); mix(b, dop, { gain: 0.45 });
  const air = noise(0.26, { rand }); sweepLP(air, glide(3000, 700, 0.26), 0.9); applyEnv(air, env.ad(0.01, 0.24, 1.3));
  mix(b, air, { gain: 0.35 });
  const pop = noise(0.01, { rand }); biquad(pop, 'bp', 900, 1.2); mix(b, pop, { gain: 0.4, at: 0.3 }); // arrival
  return normalizePeak(fade(b, 0.002, 0.03), 0.78);
}

// ---- SQUAD (friendly filtered radio) ----------------------------------------------------------
function squadReady(rand) {
  const dur = 0.34, b = buffer(dur);
  mix(b, applyEnv(osc('square', 0.09, { freq: 700 }), env.ad(0.005, 0.09, 2)), { gain: 0.5, at: 0.03 });
  mix(b, applyEnv(osc('square', 0.1, { freq: 1000 }), env.ad(0.005, 0.1, 2)), { gain: 0.5, at: 0.15 });
  radio(b, { rand, squelch: true });
  return normalizePeak(fade(b, 0.003, 0.02), 0.7);
}
function squadRegroup(rand) {
  const dur = 0.42, b = buffer(dur);
  const notes = [[1000, 0.02], [800, 0.15], [600, 0.28]];
  for (const [f, at] of notes) mix(b, applyEnv(osc('square', 0.1, { freq: f }), env.ad(0.005, 0.1, 2)), { gain: 0.5, at });
  radio(b, { rand, squelch: true });
  return normalizePeak(fade(b, 0.003, 0.02), 0.7);
}

// ---- PURSUIT (friendly filtered radio, short, observer-safe) -----------------------------------
function pursuitChirp(rand, notes, { squelch = false, low = 380, high = 2900 } = {}) {
  const end = notes.reduce((m, n) => Math.max(m, n.at + 0.11), 0.05), b = buffer(end + 0.05);
  for (const n of notes) {
    const f = typeof n.f === 'function' ? n.f : () => n.f;
    mix(b, applyEnv(osc(n.type || 'square', n.d || 0.09, { freq: f }), env.ad(0.004, n.d || 0.09, 2)), { gain: n.g ?? 0.5, at: n.at });
  }
  radio(b, { rand, squelch, low, high });
  return normalizePeak(fade(b, 0.003, 0.02), 0.68);
}
const pursuitSpotted = (rand) => pursuitChirp(rand, [
  { f: glide(900, 1300, 0.09), at: 0.0 }, { f: glide(900, 1300, 0.09), at: 0.12 }], { squelch: true });
const pursuitAirborne = (rand) => pursuitChirp(rand, [
  { f: glide(600, 1650, 0.2), d: 0.2, at: 0.0 }], { squelch: true });
const pursuitLost = (rand) => pursuitChirp(rand, [
  { f: 900, at: 0.0 }, { f: 520, at: 0.12 }], { squelch: true });
const pursuitSearch = (rand) => pursuitChirp(rand, [
  { f: 760, g: 0.45, at: 0.0 }, { f: 760, g: 0.28, d: 0.05, at: 0.14 }], { squelch: false });
const pursuitReacquired = (rand) => pursuitChirp(rand, [
  { f: glide(1000, 1500, 0.08), at: 0.0 }, { f: 1500, d: 0.06, at: 0.1 }], { squelch: true, high: 3200 });

// ---- ZOMBIE (spatial creature vocals — synthesis, not speech) ----------------------------------
// A buzzy glottal source (saw + vibrato) through two/three formant peaks, plus noise gurgle and a
// tremolo wobble, softclipped into a growl. Emotion = pitch contour + formant brightness + drive.
function zombieVoice(rand, { dur, f0, glideTo, forms, drive, trem, breath, curve = 1 }) {
  const b = buffer(dur);
  const vib = 5 + rand() * 1.5, vibD = 0.03;
  const pitch = (t) => lerp(f0, glideTo, Math.pow(Math.min(1, t / dur), curve)) * (1 + vibD * Math.sin(2 * Math.PI * vib * t));
  const src = osc('saw', dur, { freq: pitch });
  softclip(src, drive);
  // formant filtering: run parallel band-passes and sum
  const voiced = buffer(dur);
  for (const [f, q, g] of forms) { const c = src.slice(); biquad(c, 'bp', f, q); mix(voiced, c, { gain: g }); }
  mix(b, voiced, { gain: 1 });
  // gurgle: low noise amplitude-modulated fast
  const gur = noise(dur, { rand }); biquad(gur, 'lp', 700, 0.9); tremolo(gur, 14 + rand() * 8, 0.9);
  mix(b, gur, { gain: breath });
  applyEnv(b, env.ad(0.02, dur - 0.02, 1.2));
  tremolo(b, trem, 0.35);
  return b;
}
const zombieIdle = (rand) => normalizePeak(fade(zombieVoice(rand, {
  dur: 0.9, f0: 96, glideTo: 84, forms: [[430, 5, 0.7], [900, 6, 0.4]], drive: 1.6, trem: 3.5, breath: 0.28 }), 0.01, 0.06), 0.7);
const zombieAlert = (rand) => normalizePeak(fade(zombieVoice(rand, {
  dur: 0.5, f0: 108, glideTo: 190, forms: [[520, 5, 0.7], [1200, 6, 0.5], [1900, 7, 0.25]], drive: 2.2, trem: 6, breath: 0.22, curve: 0.8 }), 0.01, 0.05), 0.82);
const zombieAttack = (rand) => normalizePeak(fade(zombieVoice(rand, {
  dur: 0.45, f0: 150, glideTo: 250, forms: [[600, 5, 0.7], [1500, 6, 0.6], [2600, 7, 0.35]], drive: 3.2, trem: 9, breath: 0.3, curve: 0.6 }), 0.006, 0.05), 0.9);
const zombieHurt = (rand) => normalizePeak(fade(zombieVoice(rand, {
  dur: 0.3, f0: 210, glideTo: 120, forms: [[560, 5, 0.7], [1300, 6, 0.4]], drive: 2.6, trem: 12, breath: 0.32, curve: 0.7 }), 0.004, 0.04), 0.84);
const zombieDeath = (rand) => normalizePeak(fade(zombieVoice(rand, {
  dur: 0.82, f0: 150, glideTo: 58, forms: [[480, 5, 0.7], [1000, 6, 0.35]], drive: 2, trem: 5, breath: 0.34, curve: 1.3 }), 0.01, 0.09), 0.8);

// ---- CATALOG (id -> {variants, build}) --------------------------------------------------------
export const RECIPES = {
  'op.hit.confirm': { variants: 3, build: hitConfirm },
  'op.block.confirm': { variants: 2, build: blockConfirm },
  'op.guard.break': { variants: 2, build: guardBreak },
  'op.shield.deploy': { variants: 1, build: shieldDeploy },
  'op.shield.hit': { variants: 3, build: shieldHit },
  'op.shield.collapse': { variants: 1, build: shieldCollapse },
  'op.scanner.acquire': { variants: 2, build: scannerAcquire },
  'op.scanner.lost': { variants: 2, build: scannerLost },
  'op.portal.ready': { variants: 1, build: portalReady },
  'op.portal.cross': { variants: 2, build: portalCross },
  'op.squad.ready': { variants: 1, build: squadReady },
  'op.squad.regroup': { variants: 1, build: squadRegroup },
  'op.pursuit.spotted': { variants: 1, build: pursuitSpotted },
  'op.pursuit.airborne': { variants: 1, build: pursuitAirborne },
  'op.pursuit.lost': { variants: 1, build: pursuitLost },
  'op.pursuit.search': { variants: 1, build: pursuitSearch },
  'op.pursuit.reacquired': { variants: 1, build: pursuitReacquired },
  'op.zombie.idle': { variants: 3, build: zombieIdle },
  'op.zombie.alert': { variants: 3, build: zombieAlert },
  'op.zombie.attack': { variants: 3, build: zombieAttack },
  'op.zombie.hurt': { variants: 3, build: zombieHurt },
  'op.zombie.death': { variants: 2, build: zombieDeath },
};

export const CUE_IDS = Object.keys(RECIPES);
// deterministic: seed is a fixed function of id + variant, so re-running reproduces the same PCM.
export function render(id, variant = 0) {
  const r = RECIPES[id]; if (!r) throw new Error('unknown cue ' + id);
  return r.build(rng(seedOf(id + '#' + variant)), variant);
}
// stem basename for a variant, e.g. op.hit.confirm #0 -> op_hit_confirm_a
export function stem(id, variant) {
  return id.replace(/\./g, '_') + '_' + String.fromCharCode(97 + variant);
}

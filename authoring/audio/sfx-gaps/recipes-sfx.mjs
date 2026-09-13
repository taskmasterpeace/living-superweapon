// authoring/audio/sfx-gaps/recipes-sfx.mjs
//
// The MISSING game SFX (bullet impacts, ricochet, whiz-by, shell casings, shotgun fire + pump/cock,
// flesh hits, per-surface footsteps, vehicle detail) — the batches flagged in the ai-pass event map.
// Original deterministic DSP synthesis (synth.mjs). Every sound renders N seeded TAKES so you can pick.
// Given the same seed the WAV is byte-identical, so re-running reproduces the same options.
//
// ⚠ Honest note: gunshots/impacts are the hardest class to synthesise convincingly. These are strong
// synth takes to pick from now; the shotgun also gets real-recording CC0 options, and the cupcake
// AudioX box is available to regenerate any weak one at higher fidelity.

import {
  SR, rng, seedOf, buffer, mix, osc, noise, env, applyEnv, fade,
  biquad, sweepLP, softclip, ringmod, tremolo, normalizePeak,
} from './synth.mjs';

const lerp = (a, b, u) => a + (b - a) * Math.min(1, Math.max(0, u));
const glide = (a, b, total, curve = 1) => (t) => lerp(a, b, Math.pow(Math.min(1, t / total), curve));

// ---- generic impact core (transient + body + metallic rings + debris grains) -------------------
function impact(rand, { dur, trans, body, rings = [], grains = null, drive = 1.2, lp = 0, peak = 0.9 }) {
  const b = buffer(dur);
  if (trans) {
    const t = noise(trans.dur, { rand });
    if (trans.hp) biquad(t, 'hp', trans.hp, 0.7);
    if (trans.lp) biquad(t, 'lp', trans.lp, 0.7);
    applyEnv(t, env.ad(0.0005, trans.dur, trans.curve || 2));
    mix(b, t, { gain: trans.g });
  }
  if (body) mix(b, applyEnv(osc('sine', body.dur, { freq: body.f2 ? glide(body.f, body.f2, body.dur) : body.f }), env.exp(body.tau)), { gain: body.g });
  for (const [f, q, g, tau] of rings) { const r = applyEnv(osc('sine', dur, { freq: f }), env.exp(tau)); biquad(r, 'bp', f, q); mix(b, r, { gain: g }); }
  if (grains) for (let k = 0; k < grains.n; k++) {
    const at = grains.at0 + rand() * grains.spread, f = grains.fLo + rand() * (grains.fHi - grains.fLo);
    let g;
    if (grains.tone) { g = applyEnv(osc('sine', grains.dur, { freq: f }), env.exp(grains.tau || grains.dur * 0.4)); biquad(g, 'bp', f, 8); }
    else { g = noise(grains.dur, { rand }); biquad(g, 'bp', f, grains.q || 4); applyEnv(g, env.ad(0.0005, grains.dur, 2)); }
    mix(b, g, { gain: grains.g * (0.6 + rand() * 0.6), at });
  }
  if (drive !== 1) softclip(b, drive);
  if (lp) biquad(b, 'lp', lp, 0.8);
  return normalizePeak(fade(b, 0.0004, dur * 0.1), peak);
}
const impFlesh = (r) => impact(r, { dur: 0.14, trans: { dur: 0.03, lp: 600, g: 0.7 }, body: { f: 110, tau: 0.05, dur: 0.1, g: 0.7 }, drive: 1.4, lp: 1200, peak: 0.86 });
const impConcrete = (r) => impact(r, { dur: 0.18, trans: { dur: 0.012, hp: 1800, g: 0.9 }, body: { f: 700, tau: 0.02, dur: 0.05, g: 0.4 }, grains: { n: 6, fLo: 1200, fHi: 4200, dur: 0.02, at0: 0.005, spread: 0.12, g: 0.12, q: 3 }, drive: 1.6 });
const impMetal = (r) => impact(r, { dur: 0.26, trans: { dur: 0.006, hp: 3000, g: 0.8 }, rings: [[1200, 6, 0.5, 0.06], [2400, 7, 0.35, 0.05], [3600, 8, 0.25, 0.045]], grains: { n: 3, tone: true, fLo: 4200, fHi: 6200, dur: 0.05, tau: 0.03, at0: 0.002, spread: 0.03, g: 0.22 }, drive: 1.3 });
const impDirt = (r) => impact(r, { dur: 0.16, trans: { dur: 0.03, lp: 420, g: 0.6 }, body: { f: 80, tau: 0.04, dur: 0.08, g: 0.6 }, grains: { n: 4, fLo: 300, fHi: 900, dur: 0.02, at0: 0.01, spread: 0.1, g: 0.08, q: 2 }, drive: 1.1, lp: 900 });
const impWood = (r) => impact(r, { dur: 0.18, trans: { dur: 0.008, hp: 800, g: 0.6 }, body: { f: 420, tau: 0.03, dur: 0.08, g: 0.5 }, rings: [[600, 8, 0.25, 0.05]], grains: { n: 5, fLo: 1500, fHi: 3500, dur: 0.015, at0: 0.005, spread: 0.08, g: 0.1, q: 4 }, drive: 1.3 });
const impGlass = (r) => impact(r, { dur: 0.42, trans: { dur: 0.01, hp: 2500, g: 0.7 }, grains: { n: 15, tone: true, fLo: 2600, fHi: 7200, dur: 0.06, tau: 0.045, at0: 0.004, spread: 0.36, g: 0.14 }, drive: 1.1, peak: 0.84 });
const impWater = (r) => impact(r, { dur: 0.22, trans: { dur: 0.018, lp: 1200, g: 0.5 }, body: { f: 400, f2: 950, tau: 0.05, dur: 0.1, g: 0.45 }, grains: { n: 4, fLo: 600, fHi: 1500, dur: 0.02, at0: 0.02, spread: 0.12, g: 0.1, q: 2 }, drive: 1.0, lp: 1600, peak: 0.8 });

// ---- ricochet / whiz-by / casings --------------------------------------------------------------
function ricochet(rand) {
  const dur = 0.35, b = buffer(dur), f0 = 2500 + rand() * 900;
  const z = osc('sine', dur, { freq: (t) => f0 * Math.pow(0.32, Math.min(1, t / dur)) }); biquad(z, 'bp', 1800, 3); applyEnv(z, env.ad(0.002, dur, 1.3)); mix(b, z, { gain: 0.6 });
  const z2 = osc('sine', dur * 0.7, { freq: (t) => f0 * 1.5 * Math.pow(0.4, Math.min(1, t / (dur * 0.7))) }); applyEnv(z2, env.ad(0.002, dur * 0.7, 1.5)); mix(b, z2, { gain: 0.22 });
  const crack = noise(0.008, { rand }); biquad(crack, 'hp', 2200, 0.7); mix(b, crack, { gain: 0.4 });
  return normalizePeak(fade(b, 0.001, 0.04), 0.82);
}
function whizby(rand) {
  const dur = 0.3, b = buffer(dur);
  const crack = noise(0.006, { rand }); biquad(crack, 'hp', 2500, 0.7); softclip(crack, 3); applyEnv(crack, env.ad(0.0003, 0.006, 3)); mix(b, crack, { gain: 0.8, at: 0.09 });
  const air = noise(dur, { rand }); sweepLP(air, (t) => 1200 + 2600 * Math.sin(Math.min(1, t / dur) * Math.PI), 1.1); applyEnv(air, env.asr(0.05, 0.12, dur)); mix(b, air, { gain: 0.3 });
  return normalizePeak(fade(b, 0.002, 0.05), 0.8);
}
function shellcasing(rand) {
  const dur = 0.5, b = buffer(dur), n = 2 + ((rand() * 3) | 0); let at = 0;
  for (let k = 0; k < n; k++) {
    const f = 2200 + rand() * 2600, ping = applyEnv(osc('sine', 0.06, { freq: f }), env.exp(0.02)); biquad(ping, 'bp', f, 6);
    mix(ping, applyEnv(osc('sine', 0.04, { freq: f * 1.7 }), env.exp(0.015)), { gain: 0.4 });
    mix(b, ping, { gain: (0.5 - 0.09 * k) * (0.7 + rand() * 0.5), at }); at += 0.05 + rand() * 0.09;
  }
  return normalizePeak(fade(b, 0.001, 0.05), 0.7);
}

// ---- shotgun: fire + pump/cock -----------------------------------------------------------------
function shotgunFire(rand) {
  const b = buffer(0.7);
  mix(b, applyEnv(osc('sine', 0.25, { freq: (t) => 92 - 42 * Math.min(1, t / 0.25) }), env.exp(0.09)), { gain: 0.8 });
  const crack = noise(0.05, { rand }); biquad(crack, 'lp', 3600, 0.8); softclip(crack, 2.2); applyEnv(crack, env.ad(0.0005, 0.05, 1.6)); mix(b, crack, { gain: 0.8 });
  const punch = noise(0.03, { rand }); biquad(punch, 'bp', 700, 1.0); applyEnv(punch, env.ad(0.0008, 0.03, 2)); mix(b, punch, { gain: 0.5 });
  const tail = noise(0.5, { rand }); biquad(tail, 'lp', 1800, 0.7); applyEnv(tail, env.ad(0.01, 0.46, 1.4)); mix(b, tail, { gain: 0.22, at: 0.04 });
  mix(b, applyEnv(osc('sine', 0.35, { freq: 52 }), env.exp(0.12)), { gain: 0.4 });
  return normalizePeak(fade(b, 0.0005, 0.06), 0.94);
}
function shotgunPump(rand) {
  const b = buffer(0.45);
  const clack = (at) => {
    const c = noise(0.02, { rand }); biquad(c, 'bp', 2200 + rand() * 600, 3); softclip(c, 2); applyEnv(c, env.ad(0.0004, 0.02, 3)); mix(b, c, { gain: 0.7, at });
    mix(b, applyEnv(osc('sine', 0.03, { freq: 3200 + rand() * 400 }), env.exp(0.01)), { gain: 0.3, at });
  };
  clack(0.02);
  const rat = noise(0.12, { rand }); biquad(rat, 'bp', 1400, 2); tremolo(rat, 40, 0.8); applyEnv(rat, env.ad(0.02, 0.1, 1.5)); mix(b, rat, { gain: 0.12, at: 0.06 });
  clack(0.24);
  return normalizePeak(fade(b, 0.001, 0.03), 0.82);
}

// ---- melee flesh -------------------------------------------------------------------------------
function punchFlesh(rand) {
  const b = buffer(0.16);
  const smack = noise(0.02, { rand }); biquad(smack, 'lp', 900, 0.9); applyEnv(smack, env.ad(0.0005, 0.02, 2)); mix(b, smack, { gain: 0.6 });
  mix(b, applyEnv(osc('sine', 0.1, { freq: 95 }), env.exp(0.045)), { gain: 0.7 });
  const body = noise(0.06, { rand }); biquad(body, 'lp', 350, 0.9); applyEnv(body, env.ad(0.001, 0.06, 2)); mix(b, body, { gain: 0.4 });
  return normalizePeak(fade(b, 0.0005, 0.02), 0.86);
}
function slashFlesh(rand) {
  const b = buffer(0.25);
  const swish = noise(0.14, { rand }); sweepLP(swish, (t) => 800 + 3000 * Math.sin(Math.min(1, t / 0.14) * Math.PI), 1.2); applyEnv(swish, env.ad(0.01, 0.12, 1.4)); mix(b, swish, { gain: 0.4 });
  const tear = noise(0.08, { rand }); biquad(tear, 'bp', 500, 0.9); applyEnv(tear, env.ad(0.02, 0.06, 1.6)); mix(b, tear, { gain: 0.4, at: 0.06 });
  return normalizePeak(fade(b, 0.002, 0.04), 0.78);
}

// ---- footsteps per surface ---------------------------------------------------------------------
function step(rand, { dur, thud, grains = null, ring = null, squelch = false, peak = 0.7 }) {
  const b = buffer(dur);
  const t = noise(thud.dur, { rand }); biquad(t, 'lp', thud.lp, 0.9); applyEnv(t, env.ad(0.001, thud.dur, 2)); mix(b, t, { gain: thud.g });
  if (grains) for (let k = 0; k < grains.n; k++) { const g = noise(grains.dur, { rand }); biquad(g, 'bp', grains.fLo + rand() * (grains.fHi - grains.fLo), 3); applyEnv(g, env.ad(0.0005, grains.dur, 2)); mix(b, g, { gain: grains.g * (0.6 + rand()), at: rand() * grains.spread }); }
  if (ring) { const r = applyEnv(osc('sine', dur, { freq: ring.f }), env.exp(ring.tau)); biquad(r, 'bp', ring.f, 6); mix(b, r, { gain: ring.g }); }
  if (squelch) { const s = osc('sine', 0.06, { freq: (t) => 220 - 120 * Math.min(1, t / 0.06) }); applyEnv(s, env.ad(0.005, 0.05, 1.5)); biquad(s, 'lp', 500, 1); mix(b, s, { gain: 0.25, at: 0.02 }); }
  return normalizePeak(fade(b, 0.001, dur * 0.15), peak);
}
const stepDirt = (r) => step(r, { dur: 0.12, thud: { dur: 0.05, lp: 500, g: 0.7 }, grains: { n: 3, fLo: 400, fHi: 1200, dur: 0.012, spread: 0.06, g: 0.06 } });
const stepGravel = (r) => step(r, { dur: 0.14, thud: { dur: 0.04, lp: 700, g: 0.5 }, grains: { n: 8, fLo: 1500, fHi: 5000, dur: 0.01, spread: 0.09, g: 0.1 } });
const stepMetal = (r) => step(r, { dur: 0.18, thud: { dur: 0.03, lp: 900, g: 0.5 }, ring: { f: 1600, tau: 0.06, g: 0.28 } });
const stepWater = (r) => step(r, { dur: 0.16, thud: { dur: 0.04, lp: 1400, g: 0.4 }, grains: { n: 5, fLo: 800, fHi: 2400, dur: 0.02, spread: 0.08, g: 0.12 } });
const stepMud = (r) => step(r, { dur: 0.18, thud: { dur: 0.05, lp: 400, g: 0.6 }, squelch: true });

// ---- vehicle -----------------------------------------------------------------------------------
function vehicleDoor(rand) {
  const b = buffer(0.3);
  const thunk = noise(0.05, { rand }); biquad(thunk, 'lp', 500, 0.9); applyEnv(thunk, env.ad(0.001, 0.05, 2)); mix(b, thunk, { gain: 0.7 });
  mix(b, applyEnv(osc('sine', 0.12, { freq: 120 }), env.exp(0.05)), { gain: 0.4 });
  const latch = noise(0.015, { rand }); biquad(latch, 'bp', 2600, 4); applyEnv(latch, env.ad(0.0005, 0.015, 3)); mix(b, latch, { gain: 0.4, at: 0.08 });
  return normalizePeak(fade(b, 0.001, 0.04), 0.78);
}
function vehicleImpact(rand) {
  const b = buffer(0.42);
  mix(b, applyEnv(osc('sine', 0.2, { freq: (t) => 90 - 40 * Math.min(1, t / 0.2) }), env.exp(0.08)), { gain: 0.7 });
  const crunch = noise(0.09, { rand }); biquad(crunch, 'lp', 2200, 0.8); softclip(crunch, 1.8); applyEnv(crunch, env.ad(0.0008, 0.09, 1.6)); mix(b, crunch, { gain: 0.6 });
  for (const [f, q, g, tau] of [[900, 6, 0.22, 0.08], [1700, 7, 0.16, 0.06]]) { const r = applyEnv(osc('sine', 0.3, { freq: f }), env.exp(tau)); biquad(r, 'bp', f, q); mix(b, r, { gain: g }); }
  const debris = noise(0.25, { rand }); biquad(debris, 'bp', 1800, 1.5); applyEnv(debris, env.ad(0.02, 0.22, 1.4)); mix(b, debris, { gain: 0.14, at: 0.08 });
  return normalizePeak(fade(b, 0.0006, 0.05), 0.9);
}
function vehicleBoost(rand) {
  const b = buffer(0.6);
  const air = noise(0.55, { rand }); sweepLP(air, glide(600, 4200, 0.4, 0.8), 0.9); applyEnv(air, env.asr(0.04, 0.2, 0.55)); mix(b, air, { gain: 0.4 });
  const rev = osc('saw', 0.5, { freq: glide(120, 380, 0.45) }); biquad(rev, 'lp', 2000, 1.2); softclip(rev, 1.6); applyEnv(rev, env.asr(0.05, 0.15, 0.5)); mix(b, rev, { gain: 0.28 });
  return normalizePeak(fade(b, 0.006, 0.06), 0.82);
}

// ---- catalog (id -> {cat, label, note, mapsTo, variants, build}) --------------------------------
const N = 8; // takes per sound (the "8 selections" — pick your favourite)
export const SOUNDS = [
  { id: 'sfx.impact.flesh', cat: 'Bullet impacts', label: 'Impact — flesh', note: 'wet body hit', build: impFlesh },
  { id: 'sfx.impact.concrete', cat: 'Bullet impacts', label: 'Impact — concrete/stone', note: 'sharp crack + dust', build: impConcrete },
  { id: 'sfx.impact.metal', cat: 'Bullet impacts', label: 'Impact — metal', note: 'clang + spark', build: impMetal },
  { id: 'sfx.impact.dirt', cat: 'Bullet impacts', label: 'Impact — dirt/sand', note: 'dull thud + scatter', build: impDirt },
  { id: 'sfx.impact.wood', cat: 'Bullet impacts', label: 'Impact — wood', note: 'knock + splinter', build: impWood },
  { id: 'sfx.impact.glass', cat: 'Bullet impacts', label: 'Impact — glass', note: 'shatter + tinkle', build: impGlass },
  { id: 'sfx.impact.water', cat: 'Bullet impacts', label: 'Impact — water', note: 'plip + bubble', build: impWater },
  { id: 'sfx.ricochet', cat: 'Ballistic', label: 'Ricochet', note: 'whine-off', build: ricochet },
  { id: 'sfx.whizby', cat: 'Ballistic', label: 'Whiz-by / supersonic crack', note: 'overhead pass', build: whizby },
  { id: 'sfx.shellcasing', cat: 'Ballistic', label: 'Shell casings', note: 'brass on ground', build: shellcasing },
  { id: 'sfx.shotgun.fire', cat: 'Shotgun', label: 'Shotgun — fire', note: 'blast', mapsTo: "FIREARMS 'pump' / 'auto12'", build: shotgunFire },
  { id: 'sfx.shotgun.pump', cat: 'Shotgun', label: 'Shotgun — pump / cock', note: 'rack (NEW — none existed)', mapsTo: 'shotgun rack/reload', build: shotgunPump },
  { id: 'sfx.punch.flesh', cat: 'Melee flesh', label: 'Punch — bare fist to body', note: 'meaty thud', build: punchFlesh },
  { id: 'sfx.slash.flesh', cat: 'Melee flesh', label: 'Slash — blade into flesh', note: 'wet cut', build: slashFlesh },
  { id: 'sfx.step.dirt', cat: 'Footsteps', label: 'Footstep — dirt', note: '', build: stepDirt },
  { id: 'sfx.step.gravel', cat: 'Footsteps', label: 'Footstep — gravel', note: 'crunch', build: stepGravel },
  { id: 'sfx.step.metal', cat: 'Footsteps', label: 'Footstep — metal grating', note: 'clank', build: stepMetal },
  { id: 'sfx.step.water', cat: 'Footsteps', label: 'Footstep — water/wet', note: 'splash', build: stepWater },
  { id: 'sfx.step.mud', cat: 'Footsteps', label: 'Footstep — mud', note: 'squelch', build: stepMud },
  { id: 'sfx.vehicle.door', cat: 'Vehicle', label: 'Vehicle — door', note: 'thunk + latch', build: vehicleDoor },
  { id: 'sfx.vehicle.impact', cat: 'Vehicle', label: 'Vehicle — impact/damage', note: 'metal crunch', build: vehicleImpact },
  { id: 'sfx.vehicle.boost', cat: 'Vehicle', label: 'Vehicle — boost', note: 'whoosh + rev', build: vehicleBoost },
].map((s) => ({ variants: N, ...s }));

export const stem = (id, v) => id.replace(/\./g, '_') + '_' + String(v + 1).padStart(2, '0');
export function render(id, v = 0) {
  const s = SOUNDS.find((x) => x.id === id); if (!s) throw new Error('unknown ' + id);
  return s.build(rng(seedOf(id + '#' + v)));
}

// authoring/audio/sfx-gaps/recipes-sfx.mjs
//
// The MISSING game SFX (bullet impacts, ricochet, whiz-by, shell casings, shotgun fire + pump/cock,
// flesh hits, per-surface footsteps, vehicle detail). Original deterministic DSP synthesis (synth.mjs).
//
// ⚠ EACH TAKE VARIES ITS STRUCTURE, not just the noise seed — pitch, length, punch, brightness, drive,
// grain counts and timing all move per take, so the 8 takes are 8 genuinely different options to pick
// from (dull↔bright, short↔long, soft↔punchy). Still fully deterministic: seed = f(id, take).

import {
  SR, rng, seedOf, buffer, mix, osc, noise, env, applyEnv, fade,
  biquad, sweepLP, softclip, ringmod, tremolo, normalizePeak,
} from './synth.mjs';

const lerp = (a, b, u) => a + (b - a) * Math.min(1, Math.max(0, u));
const glide = (a, b, total, curve = 1) => (t) => lerp(a, b, Math.pow(Math.min(1, t / total), curve));
const P = (r, a, b) => a + r() * (b - a);            // random in [a,b]
const PI = (r, a, b) => Math.round(P(r, a, b));       // random int

// ---- generic impact core -----------------------------------------------------------------------
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
const impFlesh = (r) => impact(r, { dur: P(r, 0.10, 0.18), trans: { dur: P(r, 0.02, 0.04), lp: P(r, 420, 800), g: P(r, 0.5, 0.85) }, body: { f: P(r, 82, 140), tau: P(r, 0.035, 0.075), dur: 0.1, g: P(r, 0.6, 0.85) }, drive: P(r, 1.2, 1.8), lp: P(r, 900, 1600), peak: 0.86 });
const impConcrete = (r) => impact(r, { dur: P(r, 0.14, 0.22), trans: { dur: P(r, 0.008, 0.016), hp: P(r, 1500, 2400), g: P(r, 0.75, 1.0) }, body: { f: P(r, 520, 950), tau: P(r, 0.015, 0.028), dur: 0.05, g: P(r, 0.3, 0.5) }, grains: { n: PI(r, 4, 8), fLo: P(r, 1000, 1600), fHi: P(r, 3400, 5000), dur: 0.02, at0: 0.005, spread: P(r, 0.08, 0.16), g: P(r, 0.09, 0.16), q: 3 }, drive: P(r, 1.4, 1.9) });
function impMetal(r) {
  const fb = P(r, 1000, 1550), dur = P(r, 0.18, 0.32), br = P(r, 0.85, 1.25);
  return impact(r, { dur, trans: { dur: P(r, 0.004, 0.008), hp: P(r, 2600, 3600), g: P(r, 0.6, 0.9) },
    rings: [[fb, 6, 0.5, dur * 0.25], [fb * P(r, 1.9, 2.15), 7, 0.35, dur * 0.2], [fb * P(r, 2.9, 3.3), 8, 0.25 * br, dur * 0.17]],
    grains: { n: PI(r, 2, 4), tone: true, fLo: P(r, 3800, 4800) * br, fHi: P(r, 5400, 6800) * br, dur: 0.05, tau: 0.03, at0: 0.002, spread: 0.03, g: P(r, 0.16, 0.28) }, drive: P(r, 1.15, 1.5) });
}
const impDirt = (r) => impact(r, { dur: P(r, 0.12, 0.20), trans: { dur: P(r, 0.02, 0.04), lp: P(r, 350, 520), g: P(r, 0.5, 0.7) }, body: { f: P(r, 64, 98), tau: P(r, 0.03, 0.055), dur: 0.08, g: P(r, 0.5, 0.7) }, grains: { n: PI(r, 3, 6), fLo: P(r, 260, 420), fHi: P(r, 800, 1100), dur: 0.02, at0: 0.01, spread: 0.1, g: 0.08, q: 2 }, drive: P(r, 1.0, 1.25), lp: P(r, 750, 1100) });
const impWood = (r) => impact(r, { dur: P(r, 0.14, 0.22), trans: { dur: 0.008, hp: P(r, 700, 950), g: P(r, 0.5, 0.7) }, body: { f: P(r, 320, 540), tau: P(r, 0.02, 0.045), dur: 0.08, g: P(r, 0.4, 0.6) }, rings: [[P(r, 500, 760), 8, 0.25, 0.05]], grains: { n: PI(r, 3, 7), fLo: P(r, 1200, 1800), fHi: P(r, 2800, 4000), dur: 0.015, at0: 0.005, spread: 0.08, g: 0.1, q: 4 }, drive: P(r, 1.15, 1.5) });
const impGlass = (r) => impact(r, { dur: P(r, 0.30, 0.50), trans: { dur: 0.01, hp: P(r, 2200, 3000), g: P(r, 0.55, 0.8) }, grains: { n: PI(r, 11, 20), tone: true, fLo: P(r, 2400, 3200), fHi: P(r, 6000, 8000), dur: 0.06, tau: 0.045, at0: 0.004, spread: P(r, 0.28, 0.44), g: P(r, 0.11, 0.18) }, drive: P(r, 1.0, 1.25), peak: 0.84 });
const impWater = (r) => impact(r, { dur: P(r, 0.16, 0.28), trans: { dur: 0.018, lp: P(r, 900, 1500), g: P(r, 0.4, 0.6) }, body: { f: P(r, 340, 480), f2: P(r, 800, 1100), tau: 0.05, dur: 0.1, g: 0.45 }, grains: { n: PI(r, 3, 6), fLo: 600, fHi: 1500, dur: 0.02, at0: 0.02, spread: 0.12, g: 0.1, q: 2 }, drive: 1.0, lp: P(r, 1300, 1900), peak: 0.8 });

// ---- ricochet / whiz-by / casings --------------------------------------------------------------
function ricochet(rand) {
  const dur = P(rand, 0.26, 0.44), f0 = P(rand, 2300, 3400), drop = P(rand, 0.26, 0.42), bp = P(rand, 1500, 2200), b = buffer(dur);
  const z = osc('sine', dur, { freq: (t) => f0 * Math.pow(drop, Math.min(1, t / dur)) }); biquad(z, 'bp', bp, 3); applyEnv(z, env.ad(0.002, dur, 1.3)); mix(b, z, { gain: 0.6 });
  const z2 = osc('sine', dur * 0.7, { freq: (t) => f0 * P(rand, 1.4, 1.7) * Math.pow(drop * 1.2, Math.min(1, t / (dur * 0.7))) }); applyEnv(z2, env.ad(0.002, dur * 0.7, 1.5)); mix(b, z2, { gain: P(rand, 0.15, 0.32) });
  const crack = noise(0.008, { rand }); biquad(crack, 'hp', 2200, 0.7); mix(b, crack, { gain: 0.4 });
  return normalizePeak(fade(b, 0.001, 0.04), 0.82);
}
function whizby(rand) {
  const dur = P(rand, 0.26, 0.36), at = P(rand, 0.06, 0.13), b = buffer(dur);
  const crack = noise(0.006, { rand }); biquad(crack, 'hp', P(rand, 2200, 3000), 0.7); softclip(crack, P(rand, 2.5, 3.5)); applyEnv(crack, env.ad(0.0003, 0.006, 3)); mix(b, crack, { gain: 0.8, at });
  const peakF = P(rand, 3200, 4400);
  const air = noise(dur, { rand }); sweepLP(air, (t) => 1100 + peakF * Math.sin(Math.min(1, t / dur) * Math.PI), 1.1); applyEnv(air, env.asr(0.05, 0.12, dur)); mix(b, air, { gain: 0.3 });
  return normalizePeak(fade(b, 0.002, 0.05), 0.8);
}
function shellcasing(rand) {
  const dur = 0.6, b = buffer(dur), n = PI(rand, 2, 5); let at = P(rand, 0, 0.02);
  for (let k = 0; k < n; k++) {
    const f = P(rand, 2100, 4900), ping = applyEnv(osc('sine', 0.06, { freq: f }), env.exp(P(rand, 0.014, 0.026))); biquad(ping, 'bp', f, 6);
    mix(ping, applyEnv(osc('sine', 0.04, { freq: f * 1.7 }), env.exp(0.015)), { gain: 0.4 });
    mix(b, ping, { gain: (0.5 - 0.08 * k) * (0.7 + rand() * 0.5), at }); at += P(rand, 0.04, 0.14);
  }
  return normalizePeak(fade(b, 0.001, 0.05), 0.7);
}

// ---- shotgun: fire + pump/cock -----------------------------------------------------------------
function shotgunFire(rand) {
  const dur = P(rand, 0.6, 0.85), boomF = P(rand, 78, 106), crackLp = P(rand, 3100, 4300), tailLen = P(rand, 0.34, 0.56), subF = P(rand, 46, 60), drive = P(rand, 2.0, 2.6), b = buffer(dur);
  mix(b, applyEnv(osc('sine', 0.25, { freq: (t) => boomF - 42 * Math.min(1, t / 0.25) }), env.exp(0.09)), { gain: 0.8 });
  const crack = noise(0.05, { rand }); biquad(crack, 'lp', crackLp, 0.8); softclip(crack, drive); applyEnv(crack, env.ad(0.0005, 0.05, 1.6)); mix(b, crack, { gain: 0.8 });
  const punch = noise(0.03, { rand }); biquad(punch, 'bp', P(rand, 600, 850), 1.0); applyEnv(punch, env.ad(0.0008, 0.03, 2)); mix(b, punch, { gain: 0.5 });
  const tail = noise(tailLen, { rand }); biquad(tail, 'lp', P(rand, 1500, 2100), 0.7); applyEnv(tail, env.ad(0.01, tailLen - 0.04, 1.4)); mix(b, tail, { gain: P(rand, 0.16, 0.28), at: 0.04 });
  mix(b, applyEnv(osc('sine', 0.35, { freq: subF }), env.exp(0.12)), { gain: 0.4 });
  return normalizePeak(fade(b, 0.0005, 0.06), 0.94);
}
function shotgunPump(rand) {
  const gap = P(rand, 0.18, 0.30), b = buffer(gap + 0.2);
  const clack = (at) => {
    const c = noise(0.02, { rand }); biquad(c, 'bp', P(rand, 2000, 2900), 3); softclip(c, 2); applyEnv(c, env.ad(0.0004, 0.02, 3)); mix(b, c, { gain: 0.7, at });
    mix(b, applyEnv(osc('sine', 0.03, { freq: P(rand, 3000, 3600) }), env.exp(0.01)), { gain: 0.3, at });
  };
  clack(0.02);
  const rat = noise(0.12, { rand }); biquad(rat, 'bp', P(rand, 1200, 1700), 2); tremolo(rat, P(rand, 32, 48), 0.8); applyEnv(rat, env.ad(0.02, 0.1, 1.5)); mix(b, rat, { gain: P(rand, 0.08, 0.16), at: 0.06 });
  clack(0.02 + gap);
  return normalizePeak(fade(b, 0.001, 0.03), 0.82);
}

// ---- melee flesh -------------------------------------------------------------------------------
function punchFlesh(rand) {
  const dur = P(rand, 0.12, 0.20), bf = P(rand, 82, 112), b = buffer(dur);
  const smack = noise(0.02, { rand }); biquad(smack, 'lp', P(rand, 700, 1100), 0.9); applyEnv(smack, env.ad(0.0005, 0.02, 2)); mix(b, smack, { gain: P(rand, 0.5, 0.7) });
  mix(b, applyEnv(osc('sine', 0.1, { freq: bf }), env.exp(P(rand, 0.035, 0.055))), { gain: 0.7 });
  const body = noise(0.06, { rand }); biquad(body, 'lp', P(rand, 300, 420), 0.9); applyEnv(body, env.ad(0.001, 0.06, 2)); mix(b, body, { gain: 0.4 });
  return normalizePeak(fade(b, 0.0005, 0.02), 0.86);
}
function slashFlesh(rand) {
  const dur = P(rand, 0.20, 0.32), peakF = P(rand, 2600, 3600), tearF = P(rand, 400, 650), b = buffer(dur);
  const swish = noise(0.14, { rand }); sweepLP(swish, (t) => 800 + peakF * Math.sin(Math.min(1, t / 0.14) * Math.PI), 1.2); applyEnv(swish, env.ad(0.01, 0.12, 1.4)); mix(b, swish, { gain: 0.4 });
  const tear = noise(0.08, { rand }); biquad(tear, 'bp', tearF, 0.9); applyEnv(tear, env.ad(0.02, 0.06, 1.6)); mix(b, tear, { gain: 0.4, at: P(rand, 0.05, 0.09) });
  return normalizePeak(fade(b, 0.002, 0.04), 0.78);
}

// ---- footsteps per surface ---------------------------------------------------------------------
function step(rand, { dur, thud, grains = null, ring = null, squelch = false, peak = 0.7 }) {
  const b = buffer(dur);
  const t = noise(thud.dur, { rand }); biquad(t, 'lp', thud.lp, 0.9); applyEnv(t, env.ad(0.001, thud.dur, 2)); mix(b, t, { gain: thud.g });
  if (grains) for (let k = 0; k < grains.n; k++) { const g = noise(grains.dur, { rand }); biquad(g, 'bp', grains.fLo + rand() * (grains.fHi - grains.fLo), 3); applyEnv(g, env.ad(0.0005, grains.dur, 2)); mix(b, g, { gain: grains.g * (0.6 + rand()), at: rand() * grains.spread }); }
  if (ring) { const r = applyEnv(osc('sine', dur, { freq: ring.f }), env.exp(ring.tau)); biquad(r, 'bp', ring.f, 6); mix(b, r, { gain: ring.g }); }
  if (squelch) { const s = osc('sine', 0.06, { freq: (t) => squelch.f - 120 * Math.min(1, t / 0.06) }); applyEnv(s, env.ad(0.005, 0.05, 1.5)); biquad(s, 'lp', 500, 1); mix(b, s, { gain: 0.25, at: 0.02 }); }
  return normalizePeak(fade(b, 0.001, dur * 0.15), peak);
}
const stepDirt = (r) => step(r, { dur: P(r, 0.10, 0.15), thud: { dur: P(r, 0.04, 0.06), lp: P(r, 440, 580), g: P(r, 0.6, 0.8) }, grains: { n: PI(r, 2, 4), fLo: 400, fHi: 1200, dur: 0.012, spread: 0.06, g: 0.06 } });
const stepGravel = (r) => step(r, { dur: P(r, 0.12, 0.17), thud: { dur: 0.04, lp: P(r, 620, 800), g: P(r, 0.4, 0.6) }, grains: { n: PI(r, 6, 11), fLo: P(r, 1400, 1800), fHi: P(r, 4200, 5600), dur: 0.01, spread: 0.09, g: P(r, 0.08, 0.13) } });
const stepMetal = (r) => step(r, { dur: P(r, 0.15, 0.22), thud: { dur: 0.03, lp: 900, g: 0.5 }, ring: { f: P(r, 1300, 2000), tau: P(r, 0.04, 0.08), g: P(r, 0.22, 0.34) } });
const stepWater = (r) => step(r, { dur: P(r, 0.14, 0.20), thud: { dur: 0.04, lp: P(r, 1200, 1700), g: 0.4 }, grains: { n: PI(r, 4, 7), fLo: 800, fHi: 2400, dur: 0.02, spread: 0.08, g: P(r, 0.1, 0.15) } });
const stepMud = (r) => step(r, { dur: P(r, 0.15, 0.22), thud: { dur: 0.05, lp: P(r, 360, 460), g: 0.6 }, squelch: { f: P(r, 190, 260) } });

// ---- vehicle -----------------------------------------------------------------------------------
function vehicleDoor(rand) {
  const b = buffer(0.3), bf = P(rand, 100, 150);
  const thunk = noise(0.05, { rand }); biquad(thunk, 'lp', P(rand, 420, 620), 0.9); applyEnv(thunk, env.ad(0.001, 0.05, 2)); mix(b, thunk, { gain: 0.7 });
  mix(b, applyEnv(osc('sine', 0.12, { freq: bf }), env.exp(0.05)), { gain: 0.4 });
  const latch = noise(0.015, { rand }); biquad(latch, 'bp', P(rand, 2200, 3000), 4); applyEnv(latch, env.ad(0.0005, 0.015, 3)); mix(b, latch, { gain: 0.4, at: P(rand, 0.06, 0.1) });
  return normalizePeak(fade(b, 0.001, 0.04), 0.78);
}
function vehicleImpact(rand) {
  const dur = P(rand, 0.34, 0.48), boomF = P(rand, 78, 104), b = buffer(dur);
  mix(b, applyEnv(osc('sine', 0.2, { freq: (t) => boomF - 40 * Math.min(1, t / 0.2) }), env.exp(0.08)), { gain: 0.7 });
  const crunch = noise(0.09, { rand }); biquad(crunch, 'lp', P(rand, 1900, 2600), 0.8); softclip(crunch, P(rand, 1.6, 2.1)); applyEnv(crunch, env.ad(0.0008, 0.09, 1.6)); mix(b, crunch, { gain: 0.6 });
  for (const [f, q, g, tau] of [[P(rand, 800, 1000), 6, 0.22, 0.08], [P(rand, 1500, 1900), 7, 0.16, 0.06]]) { const r = applyEnv(osc('sine', 0.3, { freq: f }), env.exp(tau)); biquad(r, 'bp', f, q); mix(b, r, { gain: g }); }
  const debris = noise(0.25, { rand }); biquad(debris, 'bp', 1800, 1.5); applyEnv(debris, env.ad(0.02, 0.22, 1.4)); mix(b, debris, { gain: 0.14, at: 0.08 });
  return normalizePeak(fade(b, 0.0006, 0.05), 0.9);
}
function vehicleBoost(rand) {
  const dur = P(rand, 0.5, 0.7), top = P(rand, 3400, 4800), revTop = P(rand, 320, 440), b = buffer(dur);
  const air = noise(dur - 0.05, { rand }); sweepLP(air, glide(P(rand, 500, 700), top, dur * 0.65, 0.8), 0.9); applyEnv(air, env.asr(0.04, 0.2, dur - 0.05)); mix(b, air, { gain: 0.4 });
  const rev = osc('saw', dur - 0.1, { freq: glide(P(rand, 110, 140), revTop, dur * 0.75) }); biquad(rev, 'lp', 2000, 1.2); softclip(rev, 1.6); applyEnv(rev, env.asr(0.05, 0.15, dur - 0.1)); mix(b, rev, { gain: 0.28 });
  return normalizePeak(fade(b, 0.006, 0.06), 0.82);
}

// ---- catalog -----------------------------------------------------------------------------------
const N = 8;
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

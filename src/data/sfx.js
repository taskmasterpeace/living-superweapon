// THE POWER VOICE — the `VOICES` (armory) pattern, generalised to all 364 abilities.
// Spec: docs/powerworld/aaa-07-audio.md §5. Engine-agnostic: zero Three.js, and it imports only
// `visOf` (the silhouette/material the ability already resolves) and `rankOf` (the caster's place
// on the rank ladder). Nothing new is authored — a power's voice is a FUNCTION of what it already is.
//
// ---- WHY THIS EXISTS -----------------------------------------------------------------------------
// A third of the roster's abilities resolve to seven sounds. `buff` is 49 slots on ONE sound;
// `projectile` is 36 on two; `cone` is 36 on four. That is what a player hears as "all the powers
// sound the same", and it is not fixed by adding assets — MATERIAL alone is 78% `energy`, so keying
// on it puts 284 slots in one bucket (the exact "a ladder must come from the distribution" mistake
// visual.js §189 documents for beams). The fix is `visual.js`'s: ORTHOGONAL AXES THAT MULTIPLY.
//
//   transient   →  ATTACK   — recorded family, from visOf().shape  (the silhouette decides the onset)
//   texture     →  GRAIN    — recorded/DSP bed, from visOf().material  (what it is MADE of)
//   fundamental →  BODY     — Hz, from the ability's own mass × the caster's rank
//   decay       →  TAIL     — s, from range/reach + blast
//
// This is exactly the shape `gunshot()` already uses for firearms (crack · body · tail · mech over a
// recorded transient) — 13 weapons, 13 signatures, zero AI, zero per-weapon assets. `sfxOf` returns
// `null` for a firearm (`a.weapon`), so `rifle` keeps its 13 hand-tuned voices, the same way `visOf`
// returns build/temper only for beams.
//
// ⚠ ZERO NEW FILES. Every ATTACK and GRAIN name below is already a family in `core/samples.js`
// MANIFEST (or the `energy` DSP bed). `validateSfx` proves it against the live bank at load.

import { visOf } from './visual.js';
import { rankOf } from './scale.js';

// ---- THE VOCABULARIES (a closed set — an unknown value is a typo, not a variation) --------------
// visOf().shape → the recorded ATTACK family. `hi`/`lo` split a family by mass at the call site
// (a heavy fist is `punch.heavy`, a light one `punch.med`); a single string is mass-independent.
export const SFX_ATTACK = {
  fist:  { lo: 'punch.med', hi: 'punch.heavy' },   // it IS a fist
  bolt:  { lo: 'ki.blast', hi: 'ki.blast' },        // the existing small-discharge voice
  orb:   { lo: 'ki.blast', hi: 'ki.release' },      // mass leaving the hand
  hose:  { lo: 'fire.roar', hi: 'fire.roar' },      // a beam has no impact, it has an ONSET
  cone:  { lo: 'swing.air', hi: 'swing.air' },      // the burst of pressure
  burst: { lo: 'boom', hi: 'boom.deep' },           // detonation (deep layer above mass 0.85 — audio.boom)
  blade: { lo: 'swing.blade', hi: 'swing.blade' },  // steel
  shell: { lo: 'chop', hi: 'debris.wood' },         // a thrown canister is a THUNK, not a zap
  chain: { lo: 'swing.air', hi: 'armor.shift' },    // tentacles and grapples
  field: { lo: 'cast.spell', hi: 'cast.magic' },    // buffs, domes, auras
  arc:   { lo: 'fx.glitch', hi: 'fx.glitch' },       // teleports, dashes, blinks
  rift:  { lo: 'fx.forcefield', hi: 'fx.glitch' },   // the portal / tear
};

// visOf().material → the GRAIN bed. `energy` is the ring-mod DSP (no recording, by design — the
// energy-clarity law; the six pure-synthesis sustain() kinds are exactly these beds, aaa-07 §5.2).
export const SFX_GRAIN = {
  energy: 'ringmod',        // DSP (_ringMod, audio.js) — NOT a file, and validateSfx knows it
  fire:   'fire.roar',
  ice:    'glass.light',
  toxic:  'ped.breath',
  acid:   'water.splash',
  steel:  'metal.hit',
  stone:  'rubble',
  arcane: 'cast.magic',
  shadow: 'ped.breath',
  light:  'fx.forcefield',
  air:    'swing.air',
  shock:  'fx.glitch',
};

// how much texture each material lays over the fundamental — the firearm's `mech`, generalised.
const GRAIN_AMT = {
  energy: 0.55, fire: 0.7, ice: 0.4, toxic: 0.6, acid: 0.65, steel: 0.5,
  stone: 0.6, arcane: 0.35, shadow: 0.3, light: 0.45, air: 0.4, shock: 0.8,
};

// The GRAIN beds that are DSP, not a recorded family — `validateSfx` must not flag them as 404s.
export const SFX_DSP_GRAINS = new Set(['ringmod']);

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const fin = (v, d = 0) => (Number.isFinite(v) ? v : d);

// The ability's own MASS — the same figure the visual system reads for scale. Charge SCALES this in
// the engine (aaa-07 §5.4: charge multiplies mass before BODY/TAIL are derived), so `charge` here is
// the live 0..1+ fraction at fire time; at rest it is 1.
export function massOf(a, charge = 1) {
  const raw = fin(a.damage) || fin(a.dps) || 0;
  const m = (raw + fin(a.blast) * 1.4 + fin(a.radius) * 3) * clamp(fin(charge, 1), 0.25, 3);
  return m;
}

// AXIS 3 — BODY (Hz). Heavier ability → lower voice; heavier FIGHTER → lower still (the axis BFP
// structurally cannot have — it has no per-character stats, aaa-07 §4.1). `tim` spans ~1.28→0.60
// across ranks 1..120, and it nearly DOUBLES the distinctness of the whole system (§5.3: 117→212).
export function bodyOf(a, def, charge = 1) {
  const mass = massOf(a, charge);
  const rank = clamp(rankOf(def), 1, 120);
  const tim = Math.pow(2, (40 - rank) / 110);
  return (210 * Math.pow(0.72, Math.log2(1 + mass / 8)) + 34) * tim;   // Hz
}

// AXIS 4 — TAIL (s). Long reach and high blast ring; a point-blank jab does not. `maxLen` covers
// beams (which carry reach in maxLen, not range) so a beam does not read as a tail-less jab.
export function tailOf(a, charge = 1) {
  const reach = fin(a.range) || fin(a.maxLen) || fin(a.speed) || 0;
  return 0.06 + Math.min(0.55, reach / 900 + (fin(a.blast) * clamp(fin(charge, 1), 0.5, 2)) / 60);
}

// CRACK — the transient's brightness/pitch, the firearm's `crack` generalised. A light, fast power
// cracks bright; a heavy one cracks deep. Same role gunshot's crack plays (audio.js §841): "58 Hz
// reads as a cannon and 165 Hz reads as a machine pistol, at the same loudness."
function crackOf(a, charge = 1) {
  const mass = massOf(a, charge);
  return clamp(1.5 - Math.log2(1 + mass / 8) * 0.2, 0.5, 1.6);
}

// The sample playback RATE for the ATTACK family — heavier reads slower/lower, again off mass+rank.
function rateOf(a, def, charge = 1) {
  const mass = massOf(a, charge);
  const rank = clamp(rankOf(def), 1, 120);
  return clamp(1.12 - Math.log2(1 + mass / 8) * 0.12 - (rank - 40) / 400, 0.55, 1.5);
}

/**
 * THE VOICE VECTOR. Returns `{ attack, grain, crack, body, tail, grainAmt, rate }` — everything
 * `audio.power()` needs to compose a signature from ATTACK + GRAIN + BODY + TAIL. `def.sfx = {…}`
 * overrides any field (the `def.vis` law). Returns `null` for a firearm — `rifle` keeps `gunshot`.
 *
 * ⚠ NEVER THROWS. `visOf` can return null (a malformed def); every scalar is coerced. Audio must
 * never throw into the frame loop, and this is data upstream of the frame loop — same law.
 */
export function sfxOf(a, def, charge = 1) {
  if (!a || typeof a !== 'object') return null;
  // firearms keep their 13 hand-tuned gunshot voices (aaa-07 §5.6): the `rifle` TYPE body calls
  // gunshot(power, pos, voiceOf(id)) directly and never reaches here, and any held-weapon ability
  // carries `a.weapon`. Running either through the generic derivation would flatten them.
  if (a.weapon || a.type === 'rifle') return null;
  const vis = visOf(a);
  if (!vis) return null;
  return sfxOfVis(vis, a, def, charge);
}

/**
 * The post-vis half, callable where the ability row is gone but its resolved `vis` travelled with
 * the spawn options (projectiles.spawnProjectile receives `vis` + the scaled numbers) — so a
 * projectile in flight can carry its voice without re-threading the ability through every site.
 */
export function sfxOfVis(vis, a, def, charge = 1) {
  if (!vis || !a || typeof a !== 'object') return null;
  if (a.weapon || a.ballistic || a.bullet) return null;      // firearms/ballistics keep gunshot

  const shape = SFX_ATTACK[vis.shape] ? vis.shape : 'bolt';   // unknown shape → the default discharge
  const material = SFX_GRAIN[vis.material] ? vis.material : 'energy';
  const mass = massOf(a, charge);

  const fam = SFX_ATTACK[shape];
  let attack = mass >= 12 ? fam.hi : fam.lo;
  // ⚠ FOLD def.body INTO THE PUNCH (aaa-07 §5.5): a metal fighter's fist should carry the plate ring
  // their LANDING already has (audio.js land() has the same table). One table, two consumers.
  if ((shape === 'fist' || shape === 'chain') && def && def.body === 'metal') attack = 'metal.med';

  let grain = SFX_GRAIN[material];
  // a metal-bodied fighter throwing a non-elemental (energy) power still reads as steel underneath.
  if (material === 'energy' && def && def.body === 'metal') grain = 'metal.hit';
  if (material === 'energy' && def && def.body === 'stone') grain = 'rubble';

  const out = {
    attack,
    grain,
    crack: crackOf(a, charge),
    body: bodyOf(a, def, charge),
    tail: tailOf(a, charge),
    grainAmt: GRAIN_AMT[material] ?? 0.5,
    rate: rateOf(a, def, charge),
  };
  return { ...out, ...(a.sfx || {}) };        // def.sfx / ability.sfx overrides any field
}

// The quantised distinctness SIGNATURE — the thing "how many voices" is counted on. Steps are the
// just-noticeable ones the spec names (crack 1/20, body 1/12-octave, tail 25 ms, grain 0.1), plus
// the two discrete families. Two abilities with identical numbers cast by identical fighters SHOULD
// share a signature; the system's job is that abilities which differ by the numbers differ by ear.
export function sfxSignature(v) {
  if (!v) return 'none';
  const qBody = Math.round(Math.log2(Math.max(1, v.body)) * 12);     // 1/12-octave
  const qCrack = Math.round(v.crack * 20);                           // 1/20
  const qTail = Math.round(v.tail / 0.025);                          // 25 ms
  const qGrain = Math.round(v.grainAmt * 10);                        // 0.1
  return `${v.attack}|${v.grain}|${qCrack}|${qBody}|${qTail}|${qGrain}`;
}

/**
 * validateSfx(roster) — every resolved ATTACK/GRAIN family must be a REAL bank family (or a declared
 * DSP grain), mirroring validateVis. An unknown name is an audio 404 waiting to happen, and this
 * catches it against the live MANIFEST rather than at a cold cache in a match. Pass the MANIFEST in
 * (the caller has it) so this module stays free of a samples.js import (it is data, not the engine).
 */
export function validateSfx(roster, manifest) {
  const known = new Set(Object.keys(manifest || {}));
  const problems = [];
  let checked = 0;
  for (const def of roster) {
    for (const [slot, ab] of Object.entries(def.abilities || {})) {
      const v = sfxOf(ab, def);
      if (!v) continue;                         // firearms / malformed — nothing to validate
      checked++;
      if (!known.has(v.attack)) problems.push(`${def.id}.${slot}: ATTACK '${v.attack}' not in MANIFEST`);
      if (!known.has(v.grain) && !SFX_DSP_GRAINS.has(v.grain)) problems.push(`${def.id}.${slot}: GRAIN '${v.grain}' not in MANIFEST or DSP set`);
    }
  }
  return { checked, failures: problems.length, problems };
}

// The full roster distinctness measurement — pure data, so it needs no browser (aaa-07 §5.3).
// Reports distinct signatures, the largest cluster, and the singletons. The gate: ≥190 distinct,
// largest ≤16. Reported by src/bench/sfx.mjs and by the in-page audio suite.
export function sfxCensus(roster) {
  const sigs = new Map();
  let slots = 0, voiced = 0;
  for (const def of roster) {
    for (const [, ab] of Object.entries(def.abilities || {})) {
      slots++;
      const v = sfxOf(ab, def);
      if (!v) continue;                         // firearm — has its own voice
      voiced++;
      const s = sfxSignature(v);
      sigs.set(s, (sigs.get(s) || 0) + 1);
    }
  }
  const counts = [...sigs.values()];
  return {
    slots,
    voiced,
    distinct: sigs.size,
    largest: counts.length ? Math.max(...counts) : 0,
    singletons: counts.filter((c) => c === 1).length,
  };
}

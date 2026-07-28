// THE POWER VOICE — distinctness + 404 gauge. Pure Node: `node src/bench/sfx.mjs`.
// Spec: docs/powerworld/aaa-07-audio.md §5.3, §7 assertion 4 & 11 (the data-level half).
//
// ⚠ This measures the DERIVED voice vector over the live roster — a data property, no browser and no
// AudioContext needed. The analyser-measured distinctness (the actual ear) lives in src/bench/audio.js
// and only means anything once `audio.power(sfxOf(...))` is wired into the TYPES bodies (a later wave).
// This is the gate for THIS wave: the voice VECTORS are ≥190 distinct with a largest bucket ≤16, and
// every family name they resolve is a real bank family (0 audio 404s by construction).
//
// LAW 4 — THE HARNESS PROVES ITSELF FIRST: check 0 asserts a KNOWN pair collides and a KNOWN pair
// does not, so a green run is not a `[].every()` over an empty list.

import { ROSTER } from '../data/characters.js';
import { applyIdentities } from '../data/identities.js';
import { applyProfiles } from '../data/visual.js';
import { sfxOf, sfxSignature, sfxCensus, validateSfx, SFX_ATTACK, SFX_GRAIN } from '../data/sfx.js';
import { MANIFEST } from '../core/samples.js';

// bring the roster to the same state the game boots it in (identities + baked visual profiles),
// so shape/material resolve exactly as they do live.
try { applyIdentities(ROSTER); } catch (e) {}
try { applyProfiles(ROSTER); } catch (e) {}

const out = [];
const say = (...a) => { const l = a.join(' '); out.push(l); console.log(l); };
let fails = 0;
const ok = (name, pass, got, want) => { if (!pass) fails++; say(`${pass ? 'PASS' : 'FAIL'}  ${name} — got ${got}, want ${want}`); };

// ---- CHECK 0 · THE HARNESS PROVES ITSELF ---------------------------------------------------------
// Two abilities with identical numbers on the same fighter MUST collide; two that differ by mass and
// caster MUST NOT. If either is wrong, the census below is measuring noise.
const A = { type: 'projectile', damage: 10, blast: 4 };
const B = { type: 'projectile', damage: 10, blast: 4 };
const C = { type: 'projectile', damage: 90, blast: 30 };
const light = { rank: 20 }, heavy = { rank: 110 };
ok('CHECK 0a · identical ability + fighter → identical voice',
  sfxSignature(sfxOf(A, light)) === sfxSignature(sfxOf(B, light)), 'equal', 'equal');
ok('CHECK 0b · a heavier ability on a heavier fighter → a different voice',
  sfxSignature(sfxOf(A, light)) !== sfxSignature(sfxOf(C, heavy)), 'different', 'different');

// ---- 1 · NO 404s · every resolved family is a real bank family (or the energy DSP bed) -----------
const val = validateSfx(ROSTER, MANIFEST);
ok('every ATTACK/GRAIN family resolves to a real bank family (0 audio 404s)',
  val.failures === 0, `${val.failures} bad of ${val.checked} voiced`, '0');
if (val.failures) say('     ' + val.problems.slice(0, 6).join(' · '));
// belt-and-braces: the vocabularies themselves point only at MANIFEST/DSP
const known = new Set(Object.keys(MANIFEST));
const attackNames = new Set(Object.values(SFX_ATTACK).flatMap((f) => [f.lo, f.hi]));
const grainNames = new Set(Object.values(SFX_GRAIN));
const badVocab = [...attackNames].filter((n) => !known.has(n)).concat([...grainNames].filter((n) => !known.has(n) && n !== 'ringmod'));
ok('the ATTACK/GRAIN vocabularies name only bank families', badVocab.length === 0, badVocab.join(', ') || 'all real', '0 unknown');

// ---- 2 · DISTINCTNESS · ≥190 voices, largest cluster ≤16 -----------------------------------------
const cen = sfxCensus(ROSTER);
say(`     ${cen.slots} slots · ${cen.voiced} voiced (firearms excluded) · ${cen.distinct} distinct voices · largest cluster ${cen.largest} · ${cen.singletons} singletons`);
ok('≥190 distinct voices across the roster', cen.distinct >= 190, cen.distinct, '>= 190');
ok('no cluster larger than 16 (the utility families — buffs, evades — collapse correctly)',
  cen.largest <= 16, cen.largest, '<= 16');

// ---- 3 · WITHOUT THE CASTER AXIS it collapses (the axis BFP cannot have — §5.3 known-bad) ---------
// Strip the rank term by pretending every fighter is the same rank; distinctness must drop hard.
const flatSigs = new Map();
for (const def of ROSTER) for (const [, ab] of Object.entries(def.abilities || {})) {
  const v = sfxOf(ab, { rank: 40 });          // one fighter, one rank
  if (!v) continue;
  const s = sfxSignature(v);
  flatSigs.set(s, (flatSigs.get(s) || 0) + 1);
}
const flatLargest = Math.max(0, ...flatSigs.values());
say(`     KNOWN-BAD (all one rank): ${flatSigs.size} distinct · largest cluster ${flatLargest}`);
ok('KNOWN-BAD · removing the caster axis collapses distinctness (proves the axis is load-bearing)',
  flatSigs.size < cen.distinct * 0.75 && flatLargest > cen.largest,
  `${flatSigs.size} distinct / largest ${flatLargest}`, `< ${Math.round(cen.distinct * 0.75)} distinct, largest > ${cen.largest}`);

say('');
say(`SFX VOICE SUITE — ${fails} failures`);
process.exit(fails ? 1 : 0);

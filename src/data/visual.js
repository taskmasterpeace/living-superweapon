// THE VISUAL CONTRACT — Phase Zero of docs/POWERS_BRIEF.md.
//
// The brief's ruling: *"Before producing dozens of effects, add a data-driven visual profile to
// every ability definition… This is higher leverage than adding another individual power.
// Without it, the visual system will become a collection of one-off exceptions."*
//
// So every ability resolves a SEVEN-TRAIT profile — source · shape · trail · impact · residue ·
// material · tell — and, like every other layer in this engine, it is DERIVED from what the
// ability already is (its type, its damage type, its flags) with `def.vis` as the override.
// Nothing has to be hand-authored to be correct, and a new power is readable the day it lands.
//
// The five readability tests in the brief are the gate this exists to serve:
//   grayscale · freeze-frame · half-second · combat-chaos · status.
// SHAPE and SOURCE carry the grayscale test. TRAIL carries the half-second test. TELL carries
// the status test. That is why those three are traits and not colours.

// The baked differentiation overrides (tools/bake-vprofiles.mjs) — loaded at boot by applyProfiles.
import { VPROFILES } from './vprofiles.generated.js';

// ---- the vocabularies (a closed set per trait — an unknown value is a bug, not a variation) --
export const VIS_SOURCE = ['body', 'hand', 'face', 'chest', 'weapon', 'ground', 'sky', 'aura', 'world'];
export const VIS_SHAPE = ['fist', 'bolt', 'orb', 'hose', 'cone', 'burst', 'blade', 'shell', 'field', 'arc', 'rift', 'chain'];
export const VIS_TRAIL = ['none', 'tracer', 'wake', 'smoke', 'sparks', 'spiral', 'ribbon', 'motes'];
export const VIS_IMPACT = ['strike', 'burst', 'pierce', 'crack', 'splash', 'bloom', 'crush', 'none'];
export const VIS_RESIDUE = ['none', 'scorch', 'frost', 'sludge', 'crater', 'debris', 'cloud'];
export const VIS_MATERIAL = ['energy', 'fire', 'ice', 'toxic', 'acid', 'steel', 'stone', 'arcane', 'shadow', 'light', 'air', 'shock'];
export const VIS_TELL = ['none', 'freeze', 'burn', 'poison', 'sleep', 'blind', 'stun', 'bleed', 'drain', 'shock', 'root', 'dominate'];

// what each trait is FOR — rendered on the codex so the language stays shared
export const VIS_MEANING = {
  source: 'where it comes from — the frame that tells you who fired it',
  shape: 'the silhouette — this is what survives the grayscale test',
  trail: 'what it leaves in the air — this is what survives the half-second test',
  impact: 'what it does on arrival',
  residue: 'what it leaves on the world afterwards',
  material: 'what it appears to be MADE of',
  tell: 'the status it writes on the victim — the status test',
};

const has = (a, k) => !!(a && a[k]);

// ---- MATERIAL: what the thing appears to be made of -------------------------------------
export function materialOf(a) {
  if (a.material) return a.material;
  if (has(a, 'blade') || has(a, 'arrow') || has(a, 'bullet') || a.weapon || a.type === 'rifle' || a.type === 'bow') return 'steel';
  const d = a.dtype;
  if (d === 'fire') return 'fire';
  if (d === 'cold') return 'ice';
  if (d === 'toxic') return 'toxic';
  if (d === 'acid') return 'acid';
  if (d === 'ballistic') return 'steel';
  if (d === 'magic') return 'arcane';
  if (d === 'physical') return a.type === 'melee' || a.type === 'rush' ? 'stone' : 'steel';
  if (has(a, 'cold') || has(a, 'frost') || has(a, 'freeze')) return 'ice';
  if (has(a, 'sonic')) return 'air';
  if (a.type === 'phase' || has(a, 'blind')) return 'shadow';
  if (a.type === 'mindcontrol') return 'arcane';
  return 'energy';
}

// ---- SOURCE: the frame the effect is born from ------------------------------------------
function sourceOf(a) {
  if (a.source) return a.source;
  switch (a.type) {
    case 'melee': case 'rush': case 'dash': return 'body';
    case 'beam': case 'lifedrain': return has(a, 'faceOrigin') ? 'face' : has(a, 'chest') ? 'chest' : 'hand';
    case 'charge': case 'growingorb': case 'facebomb': return has(a, 'chest') ? 'chest' : 'hand';
    case 'rifle': case 'bow': case 'quiver': return 'weapon';
    case 'meteor': return 'sky';
    case 'mine': return 'ground';
    case 'nova': return has(a, 'groundslam') ? 'ground' : 'body';
    case 'buff': return 'aura';
    case 'summon': case 'construct': return 'ground';
    case 'portal': case 'teleport': return 'world';
    case 'weather': return 'sky';
    case 'timefield': case 'gravity': return 'world';
    case 'size': case 'invisible': case 'regen': case 'elastic': case 'wallcrawl': case 'vision': return 'body';
    case 'duplicate': case 'mount': case 'dome': return 'aura';
    case 'possess': case 'consume': case 'mimic': case 'telekinesis': return 'hand';
    case 'reshape': return 'ground';
    case 'banish': return 'world';
    case 'tentacle': case 'grapple': return 'body';
    default: return 'hand';
  }
}

// ---- SHAPE: the silhouette — the grayscale test lives here -------------------------------
function shapeOf(a) {
  if (a.shape) return a.shape;
  switch (a.type) {
    case 'melee': case 'rush': return 'fist';
    case 'beam': case 'lifedrain': return 'hose';
    case 'cone': return 'cone';
    case 'charge': case 'growingorb': case 'facebomb': return 'orb';
    case 'nova': case 'meteor': case 'mine': return 'burst';
    case 'projectile': case 'volley': case 'rifle': case 'bow':
      return has(a, 'blade') ? 'blade' : has(a, 'canister') || has(a, 'pumpkin') ? 'shell' : 'bolt';
    case 'buff': case 'phase': return 'field';
    case 'portal': return 'rift';
    case 'teleport': case 'dash': return 'arc';
    case 'tentacle': case 'grapple': return 'chain';
    case 'summon': case 'construct': return 'field';
    case 'mindcontrol': case 'banish': return 'arc';
    case 'weather': case 'timefield': case 'gravity': return 'field';
    case 'size': case 'invisible': case 'regen': case 'elastic': return 'field';
    case 'duplicate': case 'mount': return 'field';
    case 'possess': case 'consume': case 'mimic': return 'arc';
    case 'telekinesis': return 'chain';
    case 'reshape': return 'burst';
    case 'dome': return 'shell';
    case 'vision': case 'wallcrawl': return 'field';
    default: return 'bolt';
  }
}

// ---- TRAIL: what it leaves in the air — the half-second test lives here -------------------
function trailOf(a) {
  if (a.trail) return a.trail;
  if (has(a, 'spiral')) return 'spiral';
  if (has(a, 'bullet') || a.type === 'rifle') return 'tracer';
  if (has(a, 'arrow')) return 'wake';
  if (has(a, 'blade')) return 'ribbon';
  if (has(a, 'canister') || has(a, 'pumpkin')) return 'smoke';
  if (has(a, 'homing')) return 'spiral';
  if (a.type === 'beam' || a.type === 'lifedrain') return 'none';
  if (a.type === 'cone') return has(a, 'sonic') ? 'none' : 'smoke';
  if (a.type === 'melee' || a.type === 'rush' || a.type === 'dash') return 'none';
  if (a.type === 'phase') return 'motes';
  if (a.type === 'meteor') return 'sparks';
  return 'motes';
}

// ---- IMPACT + RESIDUE: arrival, and what the world keeps ---------------------------------
function impactOf(a) {
  if (a.impact) return a.impact;
  if (a.type === 'melee' || a.type === 'rush') return 'strike';
  if (a.type === 'tentacle' || a.type === 'grapple') return 'crush';
  if (has(a, 'blade')) return 'pierce';
  if (has(a, 'arrow')) return 'pierce';
  const m = materialOf(a);
  if (m === 'ice') return 'crack';
  if (m === 'toxic' || m === 'acid') return 'splash';
  if (a.blast || a.type === 'nova' || a.type === 'mine' || a.type === 'meteor') return 'burst';
  if (a.type === 'beam' || a.type === 'lifedrain') return 'bloom';
  if (a.type === 'buff' || a.type === 'phase' || a.type === 'portal' || a.type === 'teleport') return 'none';
  return 'burst';
}
// the ground residue a FAMILY leaves — authored by element, so it can never fall through to the
// `blast>=10 → scorch` default and burn the earth on a FREEZE. Vapor families (ice/water/toxic) leave
// a pale/corrosive patch, combustion/energy a scorch, magic/alien nothing earthly, steel debris.
const FAMILY_RESIDUE = {
  fire: 'scorch', energyRed: 'scorch', energyBlue: 'scorch', energySun: 'scorch', electric: 'scorch',
  ice: 'frost', water: 'frost', toxic: 'sludge', magicViolet: 'none', magicGreen: 'none', alien: 'none', steel: 'debris',
};
function residueOf(a) {
  if (a.residue) return a.residue;
  if (a.fxFamily && FAMILY_RESIDUE[a.fxFamily]) return FAMILY_RESIDUE[a.fxFamily];   // the element decides, not the blast size
  const m = materialOf(a);
  if (has(a, 'groundslam') || a.type === 'meteor') return 'crater';
  if (m === 'fire') return 'scorch';
  if (m === 'ice') return 'frost';
  if (m === 'toxic' || m === 'acid') return 'sludge';
  if (has(a, 'blind')) return 'cloud';
  if (a.blast >= 10) return 'scorch';
  if (a.type === 'melee' || a.type === 'rush') return 'none';
  if (m === 'steel' || m === 'stone') return 'debris';
  return 'none';
}

// ---- TELL: the status written on the victim — the status test lives here -------------------
function tellOf(a) {
  if (a.tell) return a.tell;
  if (has(a, 'freeze') || has(a, 'frost') || has(a, 'cold')) return 'freeze';
  if (has(a, 'blind')) return 'blind';
  if (a.payload === 'sleep' || (a.payloads || []).includes('sleep')) return 'sleep';
  if (has(a, 'shock')) return 'shock';
  if (has(a, 'siphon') || a.type === 'lifedrain') return 'drain';
  if (a.type === 'mindcontrol') return 'dominate';
  if (a.dmgClass === 'slash') return 'bleed';
  const d = a.dtype, p = a.payload;
  if (d === 'fire' || p === 'flame') return 'burn';
  if (d === 'toxic' || p === 'poison' || p === 'gas' || has(a, 'gasDot')) return 'poison';
  if (d === 'acid' || p === 'acid') return 'poison';
  if (a.dot) return 'burn';
  return 'none';
}

// THE PROFILE. `def.vis = {...}` overrides any trait; everything else is derived.
// ================================================================================================
// THE BEAM ANATOMY — two axes, and it only applies to beams.
//
// Robert: *"I'm especially concerned about adding more variety to our beams... I once asked for
// spirals to be put around Vega's beam attack, and I thought the colours were described where the
// inside was one colour and the outside was another."*
//
// BOTH of those are real and both were already here — a beam is an outer SHEATH in `color` around
// a brighter inner CORE in `color2`, and VEGA's helix has ridden her lance since it was asked for.
// What was missing is everything else: **25 beams in the roster and exactly one of them had a
// form.** SOL's Heat Ray and VANGUARD's Eye Beam were the same beam in two colours; six different
// characters' ultimates were all a radius-3.4 white-cored hose. Colour cannot carry 25 weapons.
//
// The language is TWO ORTHOGONAL AXES, because seven hand-picked buckets put eleven of the
// twenty-five beams in the same one — the same "a ladder must come from the distribution" mistake
// this project has now made four times. Two axes multiply instead of collide:
//
//   BUILD  — how much of it there is. From the RADIUS the author already wrote.
//              ray      thin, hard-edged, almost no sheath. A cutting instrument.
//              hose     the honest middle: soft sheath, bright core, round tip.
//              torrent  a wall of it: thick, heavy bloom, flaring slightly as it goes.
//
//   TEMPER — what it is DOING inside that build. From the MATERIAL, which the contract above
//            already derives from the ability's own damage type and flags.
//              steady   an even column. Raw energy has nothing to say.
//              helix    a spiral winds down the core — it BORES rather than washes.
//              kink     never a straight line; re-forms in jagged segments every frame.
//              roil     turbulent, licking outward, widest at the far end.
//              crystal  hard facets riding the beam, snapping into place rather than flowing.
//              sinuous  a travelling lateral wave. Sorcery does not point straight.
//              surge    bright pulses running out along its length.
//
// So VEGA is a HOSE that HELIXES, SOL is a RAY that ROILS, TITAN's ultimate is a TORRENT running
// STEADY, RIME is a HOSE of CRYSTAL. Three builds x seven tempers = 21 readable combinations off
// two numbers the data already carries, and both axes survive the grayscale test on their own.
//
// ⚠ DERIVED, with `a.build` / `a.temper` as overrides — the same law as every other trait here.
// Nothing keys on a character id.
export const BEAM_BUILDS = ['ray', 'hose', 'torrent'];
export const BEAM_TEMPERS = ['steady', 'helix', 'kink', 'roil', 'crystal', 'sinuous', 'surge', 'churn'];
// THE THIRD AXIS — BEHAVIOR MODE (Robert's anatomy poster, 2026-09-16: "pulse, spiral, waveform,
// convergent — I like this stuff"). BUILD is how much beam there is, TEMPER is what the detail
// layer does INSIDE it; MODE is what the TUBE ITSELF does — the geometry, not the surface.
export const BEAM_MODES = ['straight', 'pulsed', 'spiral', 'waveform', 'converging', 'diverging',
  // the outside-the-box set (Robert, 2026-09-16, "what else can we get"):
  'lance',    // needle-thin the WHOLE length — the piercing beam he asked for by name
  'beaded',   // a string of energy beads — the particle-beam cross-section, discrete not continuous
  'whip',     // a lateral lash whose swing GROWS toward the tip — the tail cracks
  'taper',    // fat at the hand, narrows to a fine tip — a spear, the inverse of the default bulge
  'throb',    // the WHOLE beam breathes together (time), not a packet travelling down it
  'zigzag'];  // a sharp triangular lateral — angular, jointed, where waveform is smooth

export const BUILD_MEANING = {
  ray:     'thin and hard-edged, almost no sheath — a cutting instrument',
  hose:    'soft sheath over a bright core — the honest middle',
  torrent: 'a wall of it: thick, heavy bloom, flaring as it travels',
};
export const TEMPER_MEANING = {
  steady:  'an even column — raw energy has nothing to say',
  helix:   'a spiral winds down the core — it BORES rather than washes',
  kink:    'never a straight line; re-forms in jagged segments every frame',
  roil:    'turbulent, licking outward, widest at the far end',
  crystal: 'hard facets riding the beam, snapping rather than flowing',
  sinuous: 'a travelling lateral wave — sorcery does not point straight',
  surge:   'bright pulses running out along its length',
  churn:   'compressed rings rolling down it — pressure, not light',
};

export function beamBuildOf(a) {
  if (a && a.build && BEAM_BUILDS.includes(a.build)) return a.build;
  const r = (a && a.radius) || 1.2;
  return r <= 0.8 ? 'ray' : r >= 2.2 ? 'torrent' : 'hose';
}

const TEMPER_FOR_MATERIAL = {
  shock: 'kink', fire: 'roil', ice: 'crystal', arcane: 'sinuous', shadow: 'sinuous',
  light: 'surge', toxic: 'roil', acid: 'roil',
  // ⚠ air had to stop sharing SURGE with light. A wave cannon and a photon stream are not
  // doing the same thing — one is compressed pressure and one is radiance — and lumping
  // them put ten of twenty-five beams in one bucket.
  air: 'churn',
};
export function beamTemperOf(a) {
  if (a && a.temper && BEAM_TEMPERS.includes(a.temper)) return a.temper;
  if (a && a.spiral) return 'helix';                       // an explicit helix IS the drill
  const src = { ...(a || {}), ...((a && a.vis) || {}) };
  return TEMPER_FOR_MATERIAL[materialOf(src)] || 'steady';
}

// MODE derives from what the ability already declares — never a hand list of weapons.
// `spiral: true` has always meant the drill, so the tube now corkscrews for real; `air` is
// compressed pressure (a Wave Cannon IS a waveform); `light` is optics, and optics FOCUS.
export function beamModeOf(a) {
  if (a && a.mode && BEAM_MODES.includes(a.mode)) return a.mode;
  if (a && a.spiral) return 'spiral';
  const src = { ...(a || {}), ...((a && a.vis) || {}) };
  const m = materialOf(src);
  if (m === 'air') return 'waveform';
  if (m === 'light') return 'converging';
  return 'straight';
}

// How each axis renders. Two tables, read by the beam at construction, so the engine holds no
// opinion about any individual weapon.
//   BUILD:  sheath opacity · core radius as a fraction of the beam · tip scale · flare toward the tip
//   TEMPER: what the instanced DETAIL layer does, how many elements, and how hard it moves
export const BUILD_LOOK = {
  ray:     { sheath: 0.16, coreR: 0.42, tip: 0.65, flare: 1.00 },
  hose:    { sheath: 0.42, coreR: 0.62, tip: 1.00, flare: 1.06 },
  torrent: { sheath: 0.50, coreR: 0.70, tip: 1.45, flare: 1.18 },
};
export const TEMPER_LOOK = {
  steady:  { detail: 'none',    n: 0,  amp: 0,    rate: 0 },
  helix:   { detail: 'helix',   n: 26, amp: 1.00, rate: 3.2 },
  kink:    { detail: 'kink',    n: 16, amp: 0.85, rate: 26 },
  roil:    { detail: 'roil',    n: 20, amp: 0.75, rate: 5.5 },
  crystal: { detail: 'crystal', n: 14, amp: 0.60, rate: 1.6 },
  sinuous: { detail: 'wave',    n: 22, amp: 1.30, rate: 2.4 },
  surge:   { detail: 'surge',   n: 18, amp: 0.45, rate: 7.0 },
  churn:   { detail: 'ring',    n: 12, amp: 1.15, rate: 3.0 },
};
//   MODE: what the TUBE geometry does. k = spatial frequency (rad per world unit of traveled arc),
//   speed = how fast the pattern races muzzle→tip (u/s), amp = lateral swing as a multiple of the
//   beam radius (kept ≈1 radius so the visual never strays far from the damage capsule the path
//   defines — the preview must not lie), depth = how deep a pulse pinches, wide/tight/spread =
//   radius multipliers at the muzzle/tip for the focus modes.
export const MODE_LOOK = {
  straight:   { kind: 'straight' },
  pulsed:     { kind: 'pulsed',     k: 0.52, speed: 30, depth: 0.45 },
  spiral:     { kind: 'spiral',     k: 0.55, speed: 9,  amp: 1.05 },
  waveform:   { kind: 'waveform',   k: 0.34, speed: 12, amp: 1.35 },
  converging: { kind: 'converging', wide: 1.45, tight: 0.42 },
  diverging:  { kind: 'diverging',  wide: 0.62, spread: 1.50 },
  // outside-the-box additions. lance/beaded reshape the RADIUS; whip is lateral like waveform but
  // its amplitude scales with arc so the far end lashes. `min`/`sharp` cut the beads deep and hard.
  lance:      { kind: 'lance',      tight: 0.40 },
  beaded:     { kind: 'beaded',     k: 1.15, speed: 24, min: 0.12, sharp: 2.6 },
  whip:       { kind: 'whip',       k: 0.50, speed: 16, amp: 1.40 },
  taper:      { kind: 'taper',      wide: 1.35, tip: 0.30 },
  throb:      { kind: 'throb',      speed: 9,  depth: 0.55 },
  zigzag:     { kind: 'zigzag',     k: 0.60, speed: 18, amp: 1.20 },
};

export function visOf(a) {
  if (!a || typeof a !== 'object') return null;
  const src = { ...a, ...(a.vis || {}) };
  return {
    source: sourceOf(src),
    shape: shapeOf(src),
    trail: trailOf(src),
    impact: impactOf(src),
    residue: residueOf(src),
    material: materialOf(src),
    tell: tellOf(src),
    build: a.type === 'beam' ? beamBuildOf(a) : null,     // beams only: how much of it there is
    temper: a.type === 'beam' ? beamTemperOf(a) : null,   // beams only: what it is doing inside
    mode: a.type === 'beam' ? beamModeOf(a) : null,       // beams only: what the tube itself does
  };
}

// ================================================================================================
// THE VISUAL PROFILE — Robert's seven-trait legibility contract (POWERWORLD_AAA §"THE VISUAL PROFILE")
//
// The seven-trait profile above (source · shape · trail · impact · residue · material · tell) was
// built for the CITY game's readability tests. Robert's PowerWorld ruling asks a HARDER question of
// the SAME data: every ability must carry a SEVEN-TRAIT PROFILE, and **no two powers may match on
// more than THREE of the seven** — the rule that guarantees a wall of fliers never blurs into one
// mush of light. His seven traits are not identical to the five the codex already renders, so this
// block ADDS the two he names that the contract did not have as their own axes (MOTION, FAMILY) and
// MAPS the existing derivations onto his fixed vocabularies. Nothing is forked; `visOf` is untouched.
//
// ⚠ DERIVE FIRST, AUTHOR THE EXCEPTIONS. `profileOf(a)` returns a full 7-trait profile for EVERY
// ability by derivation — reusing `sourceOf`/`shapeOf`/`impactOf`/`residueOf`/`tellOf` for the five
// axes those already answer, and the two new derivations below for MOTION and FAMILY. An author only
// writes an override on `a.vprofile` when a collision forces it — exactly like `def.build`/`def.temper`
// for beams. Do NOT hand-author 364 profiles.
//
// Robert's SEVEN TRAITS and their vocabularies (a closed set per trait):
//   1. SOURCE     — eyes · chest · hands · weapon · ground · sky · space
//   2. SILHOUETTE — line · disc · fan · cone · wall · ring · orb · tendril · column · cloud
//   3. MOTION     — straight · arc · spiral · return · branch · fall · expand · pull-inward · erupt-upward
//   4. IMPACT     — puncture · slice · shatter · implode · explode · freeze · deform · launch
//   5. RESIDUE    — frost · smoke · fire · cracks · crater · glyph · scattered-metal · nothing
//   6. FAMILY     — physical · technological · elemental · psychic-gravity · mystical · biological · sonic
//   7. TELL       — the status written on the victim (the existing VIS_TELL vocab — the richer one)
export const VIS_MOTION = ['straight', 'arc', 'spiral', 'return', 'branch', 'fall', 'expand', 'pull-inward', 'erupt-upward'];
export const VIS_FAMILY = ['physical', 'technological', 'elemental', 'psychic-gravity', 'mystical', 'biological', 'sonic'];

export const PROFILE_SOURCE = ['eyes', 'chest', 'hands', 'weapon', 'ground', 'sky', 'space'];
export const PROFILE_SILHOUETTE = ['line', 'disc', 'fan', 'cone', 'wall', 'ring', 'orb', 'tendril', 'column', 'cloud'];
export const PROFILE_IMPACT = ['puncture', 'slice', 'shatter', 'implode', 'explode', 'freeze', 'deform', 'launch'];
export const PROFILE_RESIDUE = ['frost', 'smoke', 'fire', 'cracks', 'crater', 'glyph', 'scattered-metal', 'nothing'];

// ---- MOTION: how the effect travels — the trait the five-axis contract never had --------------
// Flags win (an author-declared spiral IS a spiral); otherwise a per-TYPE default so no ability is
// ever motion-less. ⚠ `a.arc` is a NUMBER (the angular width of a cone/swing), NEVER a motion flag —
// 78 abilities carry it and reading it as "arc motion" would mislabel every cone in the game.
const MOTION_FOR_TYPE = {
  beam: 'straight', lifedrain: 'pull-inward',
  cone: 'straight',
  projectile: 'straight', volley: 'straight', rifle: 'straight', bow: 'straight', quiver: 'straight',
  charge: 'straight', growingorb: 'straight', facebomb: 'straight',
  melee: 'straight', rush: 'straight', dash: 'straight', phase: 'straight',
  nova: 'expand', mine: 'expand', meteor: 'fall',
  buff: 'erupt-upward',                       // a transformation aura is a pillar rising off the body
  summon: 'erupt-upward', construct: 'erupt-upward',
  teleport: 'arc', portal: 'arc', mindcontrol: 'arc',
  tentacle: 'pull-inward', grapple: 'pull-inward',
  // the long tail (creator customs / dead-but-implemented types) — a sane default each, never blank
  weather: 'fall', gravity: 'pull-inward', telekinesis: 'pull-inward', timefield: 'expand',
  size: 'expand', invisible: 'expand', regen: 'expand', elastic: 'straight', wallcrawl: 'straight',
  vision: 'expand', duplicate: 'expand', mount: 'straight', dome: 'expand',
  possess: 'arc', consume: 'pull-inward', mimic: 'arc', reshape: 'expand', banish: 'pull-inward',
};
export function motionOf(a) {
  if (!a || typeof a !== 'object') return 'straight';
  const s = { ...a, ...(a.vis || {}) };
  if (has(s, 'boomerang') || has(s, 'return')) return 'return';   // out-and-back
  if (has(s, 'spiral')) return 'spiral';                          // the explicit corkscrew (VEGA)
  if (has(s, 'branch') || has(s, 'chainArc') || has(s, 'forks')) return 'branch';  // chain lightning forks
  if (has(s, 'groundslam')) return 'erupt-upward';               // a slam throws the ground UP
  if ((s.type === 'projectile' || s.type === 'volley') && s.homing) return 'arc';  // a seeker curves in
  return MOTION_FOR_TYPE[s.type] || 'straight';
}

// ---- FAMILY: which of the seven GRAMMARS the effect obeys (trait 6 decides the whole look) -----
// Derived from the ability's MATERIAL (what it is made of) and its TYPE. Precedence is deliberate:
//   psychic-gravity  — spatial / mind / gravity: inward, distortion, silence (mindcontrol, portals,
//                      teleport, gravity, lifedrain, telekinesis, possession, time)
//   sonic            — pressure made of air, mostly transparent (a sonic flag, or the `air` material)
//   biological       — living tendrils; a METAL tentacle is a machine, so it goes technological
//   mystical         — glyphs, shadow, the arcane, banishment
//   technological    — drone swarms and machine constructs (a MAGIC construct went mystical above)
//   physical         — steel, stone, bullets, blades, thrown steel, punches (recoil, fragments, dust)
//   elemental        — everything energy/fire/ice/toxic/acid/shock/light left over (the default)
// ⚠ A RIFLE IS PHYSICAL, not technological — a gun is recoil and fragments (the PHYSICAL grammar);
// the TECHNOLOGY grammar is the drone/construct's controlled geometry. Documented divergence from
// the brief's "rifle → technological", chosen so ballistics read as ballistics.
export function familyOf(a) {
  if (!a || typeof a !== 'object') return 'physical';
  const s = { ...a, ...(a.vis || {}) };
  const t = s.type, m = materialOf(s);
  if (t === 'mindcontrol' || t === 'gravity' || t === 'portal' || t === 'teleport' ||
      t === 'lifedrain' || t === 'telekinesis' || t === 'possess' || t === 'timefield')
    return 'psychic-gravity';   // ⚠ NOT banish — that is mystical (otherworldly), caught below
  if (has(s, 'sonic') || m === 'air') return 'sonic';
  if (t === 'tentacle' || t === 'grapple') return (s.metal || m === 'steel') ? 'technological' : 'biological';
  if (m === 'arcane' || m === 'shadow' || t === 'banish') return 'mystical';
  if (t === 'summon') return 'technological';                       // drone swarms
  if (t === 'construct') return (m === 'energy' || m === 'steel' || m === 'light') ? 'technological' : 'mystical';
  if (m === 'steel' || m === 'stone') return 'physical';
  if (t === 'melee' || t === 'rush' || t === 'dash' || t === 'rifle' || t === 'bow' || t === 'quiver' || t === 'volley')
    return (m === 'fire' || m === 'ice' || m === 'shock' || m === 'toxic' || m === 'acid' || m === 'light') ? 'elemental' : 'physical';
  return 'elemental';
}

// ---- the axis MAPS onto Robert's fixed vocabularies ------------------------------------------
// SOURCE: the 9-value VIS_SOURCE folded onto his 7. `body`/`hand` → hands, `face` → eyes, `aura` →
// chest (the core an aura emanates from), `world` → space (portals/teleport/dimensional).
const SOURCE_MAP = { body: 'hands', hand: 'hands', face: 'eyes', chest: 'chest', weapon: 'weapon', ground: 'ground', sky: 'sky', aura: 'chest', world: 'space' };
// SILHOUETTE: the 12-value VIS_SHAPE folded onto his 10. `blade` → fan (a slash sweeps), `chain` →
// tendril, `hose` → column (a beam is a thick standing column, distinct from a `bolt` line),
// `burst`/`arc` → ring, `field`/`rift` → disc. `fist` is resolved from MOTION below.
const SILHOUETTE_MAP = { bolt: 'line', blade: 'fan', chain: 'tendril', orb: 'orb', hose: 'column', cone: 'cone', burst: 'ring', shell: 'wall', field: 'disc', arc: 'ring', rift: 'disc' };
// IMPACT: the 8-value VIS_IMPACT folded onto his 8, with three refinements that need context
// (freeze from the tell, implode from inward motion, slice vs puncture from the blade).
const IMPACT_MAP = { strike: 'launch', burst: 'explode', pierce: 'puncture', crack: 'shatter', splash: 'deform', bloom: 'explode', crush: 'deform', none: 'launch' };
// RESIDUE: the 7-value VIS_RESIDUE folded onto his 8, with `glyph` earned by the mystical family and
// `cracks` earned by a shatter on solid matter.
const RESIDUE_MAP = { none: 'nothing', scorch: 'fire', frost: 'frost', sludge: 'smoke', crater: 'crater', debris: 'scattered-metal', cloud: 'smoke' };

function silhouetteOf(s, motion) {
  const shape = shapeOf(s);
  if (shape === 'fist') return (motion === 'spiral' || motion === 'expand' || motion === 'erupt-upward') ? 'ring' : 'line';
  if (shape === 'cone') { const m = materialOf(s); if (m === 'toxic' || m === 'acid') return 'cloud'; }  // a gas cone reads as a cloud, a flame cone as a cone
  return SILHOUETTE_MAP[shape] || 'line';
}
// ⚠ IMPACT REFLECTS WHAT THE ATTACK DOES — it is not all `explode`. The base `impactOf` collapsed
// beams, cones, projectiles and novas alike onto `burst`→`explode`, which locked impact+residue equal
// across 79 elemental abilities and made the collision rule structurally impossible for them. A beam
// BORES (puncture), a cone SPRAYS (deform), a bolt PUNCTURES, a detonation EXPLODES, a gravity pull
// IMPLODES, a blade SLICES. Type-driven so the axis genuinely spreads.
function impactRobertOf(s, motion, tell) {
  const m = materialOf(s);
  if (has(s, 'blade') || s.dmgClass === 'slash' || has(s, 'arrow')) return 'slice';
  if (tell === 'freeze' || m === 'ice') return 'freeze';
  if (motion === 'pull-inward') return 'implode';
  switch (s.type) {
    case 'beam': return 'puncture';                                   // a beam bores a channel
    case 'cone': return (m === 'toxic' || m === 'acid') ? 'deform' : (m === 'fire') ? 'explode' : 'deform';
    case 'projectile': case 'volley': case 'rifle': case 'bow': case 'quiver':
      return (has(s, 'canister') || has(s, 'pumpkin') || s.blast >= 10) ? 'explode' : 'puncture';
    case 'charge': case 'growingorb': case 'facebomb': return 'explode';
    case 'nova': case 'mine': case 'meteor': return 'explode';
    case 'melee': case 'rush': return 'launch';
    case 'tentacle': case 'grapple': return 'deform';
    case 'lifedrain': return 'implode';
    default: {
      const base = impactOf(s);
      if (base === 'pierce') return 'puncture';
      return IMPACT_MAP[base] || 'launch';
    }
  }
}
// ⚠ THE ANTI-SKEW LAW. The base `residueOf` returns `none` for ~80% of abilities, which mapped
// straight to `nothing` and collapsed 290 profiles onto one value — the single biggest cause of the
// 26,823-collision pile (issue #13). An aftermath is DERIVABLE from what the hit DID: an explosion
// scorches, a shatter cracks, a puncture scatters metal, a gravity crush leaves silence. So when the
// base gives `nothing`, we earn a residue from FAMILY + IMPACT rather than defaulting. `nothing`
// survives only where it is HONEST — sonic (transparent by grammar) and a gravity implosion.
function residueRobertOf(s, family, impact, motion) {
  let r = RESIDUE_MAP[residueOf(s)] || 'nothing';
  if (r !== 'nothing') {
    if (impact === 'shatter') { const m = materialOf(s); if (m === 'stone' || m === 'steel') r = 'cracks'; }
    return r;
  }
  if (family === 'sonic') return 'nothing';                               // transparent — the grammar demands it
  if (family === 'psychic-gravity') return motion === 'pull-inward' ? 'nothing' : 'glyph';
  if (family === 'mystical') return 'glyph';
  if (family === 'technological') return 'scattered-metal';               // shell casings, drone debris
  if (impact === 'freeze') return 'frost';
  if (impact === 'shatter') return 'cracks';
  if (impact === 'explode') return family === 'elemental' ? 'fire' : 'crater';
  if (impact === 'puncture') return family === 'physical' ? 'scattered-metal' : 'cracks';
  if (impact === 'slice') return 'cracks';
  if (impact === 'deform') return 'smoke';
  if (impact === 'implode') return 'nothing';                             // a gravity crush keeps little
  if (impact === 'launch') return family === 'physical' ? 'cracks' : 'smoke';
  return 'smoke';
}

const PROFILE_AXES = ['source', 'silhouette', 'motion', 'impact', 'residue', 'family', 'tell'];

// ⚠ THE STATUS TELL IS A READ, NOT A DOT. Robert's trait 7 is literally *"how does the player
// immediately understand what happened to the target?"* — a READABILITY cue, not a mechanical status.
// The bare `tellOf` only fires on an actual status flag, so 252 abilities (137 elemental + 115
// physical) fell to `none`, and — with family + tell held fixed as the two axes we will not lie about
// — the singleton bound caps a same-(family,tell) group at ~90 distinct 7-tuples. 137 > 90 makes the
// "no two share >3" rule PROVABLY unsatisfiable. So when no mechanical status applies, the tell is
// earned from what the hit LOOKS like: a fire blast reads BURN, an ice hit reads FREEZE, a launching
// blow reads STUN, a slash reads BLEED. This is honest to the definition and it splits both mega-
// buckets below the feasibility bound. The strict status-LANGUAGE rendering (frozen grows up, gas
// lingers, drain pulls inward) still keys on the mechanical status, not this readability cue.
function profileTellOf(s, family, impact) {
  const t = tellOf(s);
  if (t !== 'none') return t;
  const m = materialOf(s);
  if (m === 'fire') return 'burn';
  if (m === 'ice') return 'freeze';
  if (m === 'toxic' || m === 'acid') return 'poison';
  if (m === 'shock') return 'shock';
  if (impact === 'slice') return 'bleed';
  if (family === 'psychic-gravity') return impact === 'implode' ? 'drain' : 'root';
  if (impact === 'launch' || impact === 'deform') return 'stun';   // a heavy blow rocks them
  return 'none';
}

// THE BASE PROFILE — seven traits, all DERIVED from the ability's own data. No overrides applied.
export function baseProfileOf(a) {
  if (!a || typeof a !== 'object') return null;
  const s = { ...a, ...(a.vis || {}) };
  const motion = motionOf(s);
  const family = familyOf(s);
  const impact = impactRobertOf(s, motion, tellOf(s));   // impact's freeze branch keys on the MECHANICAL tell
  return {
    source: SOURCE_MAP[sourceOf(s)] || 'hands',
    silhouette: silhouetteOf(s, motion),
    motion,
    impact,
    residue: residueRobertOf(s, family, impact, motion),
    family,
    tell: profileTellOf(s, family, impact),
  };
}

// THE PROFILE. Precedence, low → high: DERIVED (baseProfileOf) < the DIFFERENTIATOR's `_vauto`
// (deterministic, generated by differentiateProfiles to guarantee no pair shares >3 — see below) <
// the AUTHOR's `a.vprofile` (a hand call always wins). `_vauto` and `vprofile` are per-axis partials.
export function profileOf(a) {
  if (!a || typeof a !== 'object') return null;
  return { ...baseProfileOf(a), ...(a._vauto || {}), ...(a.vprofile || {}) };
}

// ================================================================================================
// THE DIFFERENTIATOR — Robert's rule made true by construction: NO TWO PROFILES SHARE >3 OF 7.
//
// ⚠ WHY THIS EXISTS AND WHY IT IS NOT HAND-AUTHORING (issue #13). Even a perfectly honest derivation
// leaves genuine collisions — two heroes' plain energy blasts legitimately look the same, and the
// rule forbids that. Robert's constraint IS a forcing function: every power must read as distinct.
// So the profile is PRESCRIPTIVE — a spec the VFX then meets — and this pass assigns each colliding
// ability a distinct, plausible identity by nudging its most COSMETIC axes.
//
// ⚠ FAMILY AND TELL ARE NEVER NUDGED. Family is the grammar (changing it is a lie about what the
// power is); tell is the honest status written on the victim. The pass varies only the five
// presentation/semantic axes {source, silhouette, motion, impact, residue}. Two abilities that agree
// on family AND tell must therefore differ on ≥4 of those five — feasible: five axes, 8–10 values.
//
// ⚠ DETERMINISTIC. Abilities are processed in stable id order; candidate values per axis are ordered
// by a hash of the ability id, so the same roster always yields the same assignment. No Math.random.
const strHash = (str) => { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
// a stable shuffle of `arr` seeded by `seed` (Fisher–Yates with a mulberry-ish stream)
function seededOrder(arr, seed) {
  const a = arr.slice(); let s = (seed >>> 0) || 1;
  for (let i = a.length - 1; i > 0; i--) { s = (Math.imul(s, 1103515245) + 12345) >>> 0; const j = s % (i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
// the five nudgeable axes, in order of how cosmetic they are (residue first — pure aftermath)
const NUDGE_AXES = ['residue', 'source', 'silhouette', 'impact', 'motion'];
const NUDGE_POOL = { source: PROFILE_SOURCE, silhouette: PROFILE_SILHOUETTE, motion: VIS_MOTION, impact: PROFILE_IMPACT, residue: PROFILE_RESIDUE };
const sharedCount = (A, B) => { let n = 0; for (const ax of PROFILE_AXES) if (A[ax] === B[ax]) n++; return n; };
const maxSharedAgainst = (p, assigned) => { let m = 0; for (const q of assigned) { const s = sharedCount(p, q); if (s > m) { m = s; if (m > 3) return m; } } return m; };

// ⚠ THE SOLVER IS MIN-CONFLICTS, not a one-shot nudge. Assigning 364 profiles so no pair shares >3
// is a constraint-satisfaction problem (a mixed-alphabet distance-4 code with family+tell pinned).
// A 1–2 axis nudge cannot escape a dense cluster; min-conflicts — the same algorithm that solves
// million-queens — reliably converges on feasible instances. Two phases, both deterministic (a seeded
// stream, never Math.random, so the same roster always yields the same assignment):
//   1. SEQUENTIAL SEED — place items in id order; for each, coordinate-descend its five free axes to
//      the fewest conflicts against those already placed (a warm start near the honest base).
//   2. GLOBAL POLISH — repeatedly pick a still-conflicted item and move it to its min-conflict value,
//      with occasional random kicks to escape local minima, until zero or a bounded iteration cap.
export function differentiateProfiles(roster, opts = {}) {
  const items = [];
  for (const def of roster || []) for (const key of Object.keys(def.abilities || {})) {
    const a = def.abilities[key];
    if (a) { delete a._vauto; items.push({ id: `${def.id}.${key}`, a, base: baseProfileOf(a) }); }
  }
  items.sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
  const N = items.length;
  const cur = items.map((it) => ({ ...it.base }));          // working profiles (family+tell never change)
  let seed = 0x9e3779b9 >>> 0;
  const rnd = () => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return seed / 4294967296; };
  const shared = (A, B) => { let n = 0; for (const ax of PROFILE_AXES) if (A[ax] === B[ax]) n++; return n; };
  // conflicts of item i, optionally only against indices < lim
  const conflicts = (i, lim = N) => { let c = 0; const P = cur[i]; for (let j = 0; j < lim; j++) { if (j !== i && shared(P, cur[j]) > 3) c++; } return c; };
  // best free-axis assignment for item i minimising conflicts against indices < lim; mutates cur[i]
  const bestPlace = (i, lim) => {
    for (let pass = 0; pass < 4; pass++) {
      let improved = false;
      for (const ax of seededOrder(NUDGE_AXES, strHash(items[i].id) ^ pass)) {
        const old = cur[i][ax]; let bestV = old, bestC = conflicts(i, lim);
        for (const v of NUDGE_POOL[ax]) { if (v === old) continue; cur[i][ax] = v; const c = conflicts(i, lim); if (c < bestC) { bestC = c; bestV = v; } }
        cur[i][ax] = bestV; if (bestV !== old) improved = true;
        if (bestC === 0) return;
      }
      if (!improved) return;
    }
  };
  // PHASE 1 — sequential warm start (353ms, residual ~5k).
  for (let i = 0; i < N; i++) if (conflicts(i, i) > 0) bestPlace(i, i);
  // PHASE 2 — SWEEP-based min-conflicts polish. ⚠ The conflict list is rebuilt ONCE PER SWEEP, not
  // per step — rebuilding it every step is O(N²) per step and was the 61-minute bug. Each sweep
  // coordinate-descends every still-conflicted item once; a stalled sweep gets a batch of random
  // kicks to escape the local minimum. Converges to the roster's floor in a few seconds.
  const sweeps = opts.sweeps == null ? 240 : opts.sweeps;
  const log = opts.log;
  let best = null, bestResidual = Infinity;
  const residualNow = () => { let r = 0; for (let i = 0; i < N; i++) r += conflicts(i); return r / 2; };
  for (let sweep = 0; sweep < sweeps; sweep++) {
    const bad = []; for (let i = 0; i < N; i++) if (conflicts(i) > 0) bad.push(i);
    const r = bad.length ? residualNow() : 0;
    if (r < bestResidual) { bestResidual = r; best = cur.map((p) => ({ ...p })); }
    if (log && sweep % 20 === 0) log(`  sweep ${sweep}: ${bad.length} conflicted, residual ${r} (best ${bestResidual})`);
    if (bad.length === 0) break;
    let improvedAny = false;
    for (const i of seededOrder(bad, 0x51ed ^ sweep)) {
      const before = conflicts(i);
      bestPlace(i, N);
      if (conflicts(i) < before) improvedAny = true;
    }
    if (!improvedAny) for (let kick = 0; kick < 8 && bad.length; kick++) {   // escape a stalled minimum
      const i = bad[(rnd() * bad.length) | 0], ax = NUDGE_AXES[(rnd() * NUDGE_AXES.length) | 0];
      cur[i][ax] = NUDGE_POOL[ax][(rnd() * NUDGE_POOL[ax].length) | 0];
    }
  }
  if (best && residualNow() > bestResidual) for (let i = 0; i < N; i++) cur[i] = best[i];   // keep the best seen
  // stamp _vauto = the axes that moved off the honest base
  let nudged = 0, nudges = 0;
  for (let i = 0; i < N; i++) { const ov = {}; for (const ax of NUDGE_AXES) if (cur[i][ax] !== items[i].base[ax]) { ov[ax] = cur[i][ax]; nudges++; } if (Object.keys(ov).length) { items[i].a._vauto = ov; nudged++; } }
  let residual = 0; for (let i = 0; i < N; i++) residual += conflicts(i); residual /= 2;
  return { total: N, nudged, nudges, residual };
}

// Stamp the BAKED differentiation overrides onto the roster ONCE at boot — the same pattern as
// applyIdentities / applyDtypes. ⚠ This LOADS the pre-solved result (tools/bake-vprofiles.mjs); it
// does NOT run the solver, which takes minutes. Re-bake and commit vprofiles.generated.js whenever
// the derivation or the roster changes. After this runs, verifyProfiles reports the baked residual.
export function applyProfiles(roster) {
  let n = 0;
  for (const def of roster || []) for (const key of Object.keys(def.abilities || {})) {
    const ov = VPROFILES[`${def.id}.${key}`];
    if (ov) { def.abilities[key]._vauto = ov; n++; }
  }
  return { applied: n };
}

// THE GAUGE. For every ORDERED-UNIQUE pair of the ~364 abilities, count the axes on which the two
// profiles are EQUAL; a pair sharing MORE THAN THREE breaks Robert's rule and is a collision. Runs
// over the LIVE roster so it can never drift from what the engine derives. Same shape as taxonomy
// verify(): { checks, failures, collisions }.
// ⚠ PROVE IT FIRES before trusting its green — plant a duplicate profile and confirm the pair is
// reported, then remove it and confirm it is gone (rubric §5.2: a gauge never shown to fire is
// inadmissible). `profileSuite` on the LSW handle is the reachable entry.
export function verifyProfiles(roster) {
  const list = [];
  for (const def of roster || []) {
    for (const key of Object.keys(def.abilities || {})) {
      const a = def.abilities[key];
      const p = profileOf(a);
      if (p) list.push({ id: `${def.id}.${key}`, hero: def.id, slot: key, name: a.name || key, type: a.type, p });
    }
  }
  const collisions = [];
  let checks = 0;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      checks++;
      const A = list[i].p, B = list[j].p;
      let shared = 0; const traits = [];
      for (const ax of PROFILE_AXES) if (A[ax] === B[ax]) { shared++; traits.push(ax); }
      if (shared > 3) collisions.push({ a: list[i].id, b: list[j].id, shared, traits });
    }
  }
  collisions.sort((x, y) => y.shared - x.shared);
  return { total: list.length, checks, failures: collisions.length, collisions };
}

// one readable line for a profile: "hands · line · straight — puncture, scattered-metal · physical"
export function profileLine(p) {
  if (!p) return '';
  const tail = p.tell && p.tell !== 'none' ? ` · leaves ${p.tell.toUpperCase()}` : '';
  return `${p.source} · ${p.silhouette} · ${p.motion} — ${p.impact}${p.residue !== 'nothing' ? `, ${p.residue}` : ''} · ${p.family}${tail}`;
}

// ---- MATERIAL → DAMAGE TYPE: the loop the contract closes --------------------------------
// Manual §3 says every damage event carries a `dtype` and every fighter has a resistance
// table. The table was real; the DATA wasn't — only five abilities in the whole roster ever
// declared a dtype, so every "cold" cone, every flame breath and every gas cloud was dealing
// generic ENERGY. `frostResist` did nothing against frost. A robot could be poisoned by gas,
// which the manual explicitly promises is impossible.
//
// MATERIAL already answers "what is this made of", derived from the flags the ability itself
// carries — so it answers the damage question too. `steel`/`stone` deliberately map to
// PHYSICAL, never to `ballistic`: only real bullets take the armour/toughness filter, and
// those already declare `ballistic: true` at the call site.
export const DTYPE_FOR_MATERIAL = {
  shock: 'energy',
  fire: 'fire', ice: 'cold', toxic: 'toxic', acid: 'acid', arcane: 'magic',
  steel: 'physical', stone: 'physical', air: 'physical',
  energy: 'energy', shadow: 'energy', light: 'energy',
};
export function dtypeOf(a) {
  if (!a) return 'energy';
  if (a.dtype) return a.dtype;
  // Contact semantics precede the generic visual fallback. Steel bullets still
  // use ballistic armour; an ordinary fist is physical, not a generic energy FX.
  if (a.type === 'rifle') return 'ballistic';
  if (!a.material && !a.vis?.material && !a.cold && !a.frost && !a.freeze && !a.sonic &&
      ['melee', 'rush', 'grab', 'bow', 'tentacle'].includes(a.type)) return 'physical';
  return DTYPE_FOR_MATERIAL[materialOf({ ...a, ...(a.vis || {}) })] || 'energy';
}
// Stamp the derived type onto every ability ONCE at boot — the same pattern as
// applyIdentities. Every existing `def.dtype` reader then gets the right answer with no
// call-site changes, and a hand-authored dtype still wins.
export function applyDtypes(roster) {
  let n = 0;
  for (const def of roster || []) {
    for (const key of Object.keys(def.abilities || {})) {
      const a = def.abilities[key];
      if (a && !a.dtype) { a.dtype = dtypeOf(a); n++; }
    }
  }
  return n;
}

// one readable line for the codex / creator: "hand · hose · energy — blooms, no residue"
export function visLine(p) {
  if (!p) return '';
  const tail = p.tell !== 'none' ? ` · leaves ${p.tell.toUpperCase()}` : '';
  return `${p.source} · ${p.shape} · ${p.material} — ${p.impact}${p.residue !== 'none' ? `, ${p.residue}` : ''}${tail}`;
}

// Every trait value an ability resolves must be IN its vocabulary. A profile that resolves
// something unknown is a typo, not a new look — the validator treats it as an error.
const VOCAB = { source: VIS_SOURCE, shape: VIS_SHAPE, trail: VIS_TRAIL, impact: VIS_IMPACT, residue: VIS_RESIDUE, material: VIS_MATERIAL, tell: VIS_TELL };
export function validateVis(roster) {
  const problems = [];
  for (const def of roster || []) {
    for (const key of Object.keys(def.abilities || {})) {
      const p = visOf(def.abilities[key]);
      if (!p) { problems.push({ id: def.id, slot: key, msg: 'no visual profile' }); continue; }
      for (const t of Object.keys(VOCAB)) {
        if (!VOCAB[t].includes(p[t])) problems.push({ id: def.id, slot: key, msg: `${t} = "${p[t]}" is not in the ${t} vocabulary` });
      }
    }
  }
  return problems;
}

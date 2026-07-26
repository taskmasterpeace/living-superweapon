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
function materialOf(a) {
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
function residueOf(a) {
  if (a.residue) return a.residue;
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
  };
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



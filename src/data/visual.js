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
export const VIS_MATERIAL = ['energy', 'fire', 'ice', 'toxic', 'acid', 'steel', 'stone', 'arcane', 'shadow', 'light', 'air'];
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
    case 'size': case 'invisible': case 'regen': return 'body';
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
    case 'size': case 'invisible': case 'regen': return 'field';
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


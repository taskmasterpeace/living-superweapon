// THE POWER FX TABLE (Refs #42, the /loop 10-10 goal) — WHAT AN ELEMENT LOOKS LIKE, PER PHASE, PER LEVEL.
// Robert 2026-09-16: three levels of an actual fire projectile / fire area — "we create a system
// here... don't cut corners." This is that system's data half: ONE authored row per element FAMILY,
// consumed by the renderers (vfx.explode, chargeOrb, projectile trails, beam surfaces) so a family
// added here shows up everywhere with zero renderer edits. No per-hero branches, ever.
//
// AXES (the visual.js law — orthogonal axes that multiply):
//   FAMILY  — the element's identity: palette + per-phase character (authored below)
//   LEVEL   — intensity I/II/III: scale/count/knockback multipliers (one ladder, never per-family)
//   PHASE   — charge · launch · flight · impact (each renderer consumes its slice)
//
// ⚠ PURPLE: magicViolet uses it BY ROBERT'S EXPLICIT CALL (2026-09-16, "magic (purple, green)") —
// this widens the old KIVULI-only exception to the MAGIC FAMILY ONLY. Every other family stays
// purple-free; `validateFx` enforces it mechanically (hue 270–320 banned outside magicViolet).

const F = {
  // palette: core (hottest), glow (the halo/sheath), deep (the dark body), smoke, debris, mist
  // charge.style / impact.afterFx are VOCABULARY WORDS the renderers implement once each.
  fire: {
    label: 'FIRE',
    palette: { core: '#fff3c8', glow: '#ff7a2a', deep: '#301006', smoke: ['#1c1a18', '#2a241e'], debris: ['#3a2c1c', '#57402a'], mist: '#ff9a3a' },
    charge: { style: 'ember', motes: '#ffb35a' },
    launch: { style: 'backblast', flash: '#ffd9a0', ring: '#ff8a3d' },
    flight: { style: 'ember', trail: ['#ff7a2a', '#ffd24a'], wake: '#ff5a2a' },
    impact: { kernel: '#fff3c8', afterFx: 'embers', cloudRise: 14, cloudDur: 2.6 },
  },
  ice: {
    label: 'ICE',
    palette: { core: '#ffffff', glow: '#bfeaff', deep: '#16344a', smoke: ['#cfe8f2', '#9fc4d6'], debris: ['#bfeaff', '#e8f8ff'], mist: '#d8f2ff' },
    charge: { style: 'crystal', motes: '#d8f2ff' },
    launch: { style: 'frost', flash: '#eaffff', ring: '#bfeaff' },
    flight: { style: 'glint', trail: ['#bfeaff', '#ffffff'], wake: '#9fd8f0' },
    impact: { kernel: '#eaffff', afterFx: 'frostmist', cloudRise: 3, cloudDur: 3.2 },
  },
  water: {
    label: 'WATER',
    palette: { core: '#eafcff', glow: '#3fa8d8', deep: '#0d2c40', smoke: ['#9fd0e0', '#7fb8cc'], debris: ['#3fa8d8', '#bfe8f4'], mist: '#bfe8f4' },
    charge: { style: 'droplet', motes: '#9fd8ea' },
    launch: { style: 'spray', flash: '#dff6ff', ring: '#3fa8d8' },
    flight: { style: 'spray', trail: ['#3fa8d8', '#eafcff'], wake: '#2f88b8' },
    impact: { kernel: '#eafcff', afterFx: 'droplets', cloudRise: 5, cloudDur: 1.8 },
  },
  energyRed: {
    label: 'RED KI',
    palette: { core: '#fff0f0', glow: '#ff3b3b', deep: '#3a0d0d', smoke: ['#2a1416', '#1c1012'], debris: ['#5a2020', '#7a3030'], mist: '#ff6a5a' },
    charge: { style: 'plasma', motes: '#ff8a7a' },
    launch: { style: 'burst', flash: '#ffd9d0', ring: '#ff3b3b' },
    flight: { style: 'streak', trail: ['#ff3b3b', '#fff0f0'], wake: '#e02a2a' },
    impact: { kernel: '#fff0f0', afterFx: 'sparks', cloudRise: 10, cloudDur: 2.0 },
  },
  energyBlue: {
    label: 'BLUE KI',
    palette: { core: '#f0f8ff', glow: '#3f8cff', deep: '#0d1c3a', smoke: ['#141a2a', '#101420'], debris: ['#20305a', '#30447a'], mist: '#5aa0ff' },
    charge: { style: 'plasma', motes: '#7ab0ff' },
    launch: { style: 'burst', flash: '#d0e4ff', ring: '#3f8cff' },
    flight: { style: 'streak', trail: ['#3f8cff', '#f0f8ff'], wake: '#2a6ae0' },
    impact: { kernel: '#f0f8ff', afterFx: 'sparks', cloudRise: 10, cloudDur: 2.0 },
  },
  energySun: {
    label: 'SOLAR KI',
    palette: { core: '#ffffff', glow: '#ffd24a', deep: '#3a2c0d', smoke: ['#2a2414', '#201c10'], debris: ['#5a4a20', '#7a6430'], mist: '#ffe89a' },
    charge: { style: 'plasma', motes: '#ffe89a' },
    launch: { style: 'burst', flash: '#fff8d0', ring: '#ffd24a' },
    flight: { style: 'streak', trail: ['#ffd24a', '#ffffff'], wake: '#f0b830' },
    impact: { kernel: '#ffffff', afterFx: 'sparks', cloudRise: 10, cloudDur: 2.0 },
  },
  electric: {
    label: 'ELECTRIC',
    palette: { core: '#ffffff', glow: '#8ad8ff', deep: '#10243a', smoke: ['#182430', '#101a24'], debris: ['#2a3c50', '#3a5068'], mist: '#baecff' },
    charge: { style: 'arc', motes: '#baecff' },
    launch: { style: 'fork', flash: '#eaffff', ring: '#8ad8ff' },
    flight: { style: 'jitter', trail: ['#8ad8ff', '#ffffff'], wake: '#5ab8f0' },
    impact: { kernel: '#ffffff', afterFx: 'arcs', cloudRise: 6, cloudDur: 1.2 },
  },
  magicViolet: {
    label: 'VIOLET MAGIC',   // ⚠ the ONE purple family — Robert's explicit 2026-09-16 call
    palette: { core: '#f8f0ff', glow: '#a44df0', deep: '#26103a', smoke: ['#241830', '#1a1024'], debris: ['#3a2450', '#503468'], mist: '#c88af8' },
    charge: { style: 'sigil', motes: '#c88af8' },
    launch: { style: 'sigil', flash: '#eedcff', ring: '#a44df0' },
    flight: { style: 'motes', trail: ['#a44df0', '#f8f0ff'], wake: '#8a3ad0' },
    impact: { kernel: '#f8f0ff', afterFx: 'glyphs', cloudRise: 4, cloudDur: 2.4 },
  },
  magicGreen: {
    label: 'GREEN MAGIC',
    palette: { core: '#f0fff0', glow: '#4fd86a', deep: '#0d3a1c', smoke: ['#142a18', '#102014'], debris: ['#205a30', '#307a44'], mist: '#8af8a4' },
    charge: { style: 'sigil', motes: '#8af8a4' },
    launch: { style: 'sigil', flash: '#dcffdf', ring: '#4fd86a' },
    flight: { style: 'motes', trail: ['#4fd86a', '#f0fff0'], wake: '#3ab850' },
    impact: { kernel: '#f0fff0', afterFx: 'glyphs', cloudRise: 4, cloudDur: 2.4 },
  },
  alien: {
    label: 'ALIEN',
    palette: { core: '#fff8e8', glow: '#ff9a2a', deep: '#33180a', smoke: ['#243028', '#182420'], debris: ['#4a3018', '#684424'], mist: '#ffc07a' },   // COOL green-gray smoke — alien's cloud is the wrong colour for its orange fire (an unearthly tell); every other energy family billows warm soot
    charge: { style: 'orbit', motes: '#ffc07a' },   // alien energy ORBITS, doesn't rise — a tell of its own
    launch: { style: 'orbit', flash: '#ffe8c8', ring: '#ff9a2a' },
    flight: { style: 'iridescent', trail: ['#ff9a2a', '#8affc0'], wake: '#e0801a' },   // shifting orange↔green
    impact: { kernel: '#fff8e8', afterFx: 'astral', altGlow: '#8affc0', cloudRise: 8, cloudDur: 2.2 },   // NOT earthly sparks — swirls + shimmers (orange↔teal, the flight's other half)
  },
  toxic: {
    label: 'TOXIC',   // gas/acid kits already exist — they deserve a family, not a fallback
    palette: { core: '#eaffd8', glow: '#9adf3a', deep: '#20330d', smoke: ['#2a3a18', '#202c12'], debris: ['#3a5020', '#4c682c'], mist: '#c0f070' },
    charge: { style: 'bubble', motes: '#c0f070' },   // NOT water's droplet — corrosive gas bubbles UP
    launch: { style: 'spray', flash: '#f0ffd0', ring: '#9adf3a' },
    flight: { style: 'gas', trail: ['#9adf3a', '#eaffd8'], wake: '#7ab82a' },   // a lingering CLOUD, not water's falling spray
    impact: { kernel: '#eaffd8', afterFx: 'venting', cloudRise: 2, cloudDur: 3.4 },   // vents corrosive gas, not a wet splash
  },
  steel: {
    label: 'STEEL',   // thrown blades/canisters/ballistics — matte world, never glow
    palette: { core: '#f0f0f0', glow: '#c8c8c8', deep: '#2a2a2e', smoke: ['#3a3a3e', '#2a2a2e'], debris: ['#57504a', '#6a655a'], mist: '#b0b0b4' },
    charge: { style: 'none', motes: '#c8c8c8' },
    launch: { style: 'recoil', flash: '#e8e8e8', ring: '#c8c8c8' },
    flight: { style: 'none', trail: ['#c8c8c8'], wake: '#a0a0a4' },
    impact: { kernel: '#f0f0f0', afterFx: 'shrapnel', cloudRise: 8, cloudDur: 2.0 },
  },
};

// LEVEL ladder — ONE set of multipliers for every family (a level is a SIZE of event, not a new
// look; the family carries the look). kb feeds areaDamage's o.kbMul so a level-III blast SHOVES.
export const FX_LEVELS = [
  { scale: 0.72, count: 0.55, cloud: 0, kb: 0.7, ring: 0.8, after: 0.5 },   // I  — a firecracker
  { scale: 1.0, count: 1.0, cloud: 1, kb: 1.0, ring: 1.0, after: 1.0 },     // II — the standard
  { scale: 1.55, count: 1.9, cloud: 2.2, kb: 1.7, ring: 1.35, after: 1.8 }, // III — the event
];

export const FX_FAMILIES = F;

const HEX = /^#([0-9a-f]{6})$/i;
function hueOf(hex) {
  const m = HEX.exec(hex); if (!m) return null;
  const n = parseInt(m[1], 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d < 0.03) return null;   // achromatic — no hue to police
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = Math.round(h * 60); return h < 0 ? h + 360 : h;
}

// material/dtype → family. `energy` splits BY THE ABILITY'S OWN COLOR HUE (Robert's red/blue/
// yellow-white call) and an alien-ORIGIN caster's energy reads ALIEN — both pure data reads.
const MAT_FAMILY = {
  fire: 'fire', ice: 'ice', shock: 'electric', arcane: 'magicViolet', shadow: 'magicViolet',
  toxic: 'toxic', acid: 'toxic', steel: 'steel', stone: 'steel', light: 'energySun', air: 'electric',
};
export function fxFamilyOf(visOrMaterial, a = {}, def = null) {
  const material = typeof visOrMaterial === 'string' ? visOrMaterial : (visOrMaterial && visOrMaterial.material) || 'energy';
  if (a.fxFamily && F[a.fxFamily]) return a.fxFamily;          // authored override — the def.vis law
  if (material !== 'energy') return MAT_FAMILY[material] || 'energyBlue';
  if (def && def.origin === 'alien') return 'alien';
  const h = hueOf(a.color || (def && def.colors && def.colors.accent) || '');
  if (h == null) return 'energySun';                            // white/gray energy reads solar
  if (h < 25 || h >= 330) return 'energyRed';
  if (h < 70) return 'energySun';
  if (h < 170) return 'magicGreen';
  if (h < 265) return 'energyBlue';
  return 'magicViolet';                                         // an authored purple accent IS magic
}

// LEVEL from the ability's own mass (same figure sfx.js reads), charge-scaled. Cuts are
// PROVISIONAL fixed rungs — re-derive from the roster distribution once the matrix is graded
// (the ladder-from-the-distribution law; noted, not hidden). `a.fxLevel` authors it outright.
export function fxLevelOf(a = {}, charge = 1) {
  if (a.fxLevel >= 1 && a.fxLevel <= 3) return a.fxLevel;
  const raw = (Number(a.damage) || Number(a.dps) || 0) + (Number(a.blast) || 0) * 1.4 + (Number(a.radius) || 0) * 3;
  const m = raw * Math.max(0.25, Math.min(3, Number(charge) || 1));
  return m >= 60 ? 3 : m >= 22 ? 2 : 1;
}

// The one resolver renderers call: family recipe + level row + the raw ids.
export function fxOf(visOrMaterial, a = {}, def = null, charge = 1) {
  const family = fxFamilyOf(visOrMaterial, a, def);
  const level = fxLevelOf(a, charge);
  return { family, level, f: F[family], L: FX_LEVELS[level - 1] };
}

// The gauge (validateVis/validateSfx pattern): every family covers every phase field the
// renderers read, every level row is complete — and NO PURPLE outside magicViolet (hue 270–320
// across every color in every other family's row; Robert's law, enforced mechanically).
export function validateFx() {
  const problems = [];
  const need = { palette: ['core', 'glow', 'deep', 'smoke', 'debris', 'mist'], charge: ['style', 'motes'], launch: ['style', 'flash', 'ring'], flight: ['trail', 'wake'], impact: ['kernel', 'afterFx', 'cloudRise', 'cloudDur'] };
  for (const [id, fam] of Object.entries(F)) {
    for (const [sec, keys] of Object.entries(need)) {
      if (!fam[sec]) { problems.push(`${id}: missing ${sec}`); continue; }
      for (const k of keys) if (fam[sec][k] == null) problems.push(`${id}: missing ${sec}.${k}`);
    }
    if (id === 'magicViolet') continue;
    const colors = [];
    for (const sec of Object.values(fam)) if (sec && typeof sec === 'object')
      for (const v of Object.values(sec)) { if (typeof v === 'string' && HEX.test(v)) colors.push(v); if (Array.isArray(v)) for (const c of v) if (typeof c === 'string' && HEX.test(c)) colors.push(c); }
    for (const c of colors) { const h = hueOf(c); if (h != null && h >= 270 && h <= 320) problems.push(`${id}: PURPLE ${c} (hue ${h}) outside the magic exception`); }
  }
  for (const [i, l] of FX_LEVELS.entries()) for (const k of ['scale', 'count', 'cloud', 'kb', 'ring', 'after']) if (!(k in l)) problems.push(`level ${i + 1}: missing ${k}`);
  return { families: Object.keys(F).length, failures: problems.length, problems };
}

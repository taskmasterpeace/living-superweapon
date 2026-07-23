// THRESHOLD — ORIGIN, the character creator's rulebook. Point-buy D&D-for-superheroes:
// attributes on the rank ladder with escalating costs, a catalog of engine-proven powers
// (every ability config here is lifted from a shipped hero's kit — nothing unproven),
// talents, gadgets, gifts (traits), and an auto-computed LeFevre threat rating.
// Costs are calibrated by docs/BALANCE.md: martial rush kits price HIGH (they overperformed
// in the AI audit), standing charge kits price LOW, gear guns are Street-tier cheap.
// The output of buildDef() is a plain ROSTER-compatible def — the whole game just works.

// ---- Budgets: the origin classes. Spending a full budget lands you in that class's threat. ----
export const BUDGETS = [
  { id: 'street',      name: 'STREET',      pts: 160, blurb: 'Gear, grit, and training. Threat: Low.' },
  { id: 'vigilante',   name: 'VIGILANTE',   pts: 215, blurb: 'Peak human + serious hardware. Threat: Moderate.' },
  { id: 'enhanced',    name: 'ENHANCED',    pts: 270, blurb: 'The experiment worked. Threat: High.' },
  { id: 'superweapon', name: 'SUPERWEAPON', pts: 330, blurb: 'A canon-grade Living Superweapon. Threat: Very High.' },
  { id: 'cosmic',      name: 'COSMIC',      pts: 400, blurb: 'The treaty was written about you. Threat: Extreme.' },
  { id: 'unbound',     name: 'UNBOUND',     pts: 0,   blurb: 'No budget. Lopsided is honest. Rating still computed.' },
];

// Attribute rank costs (cumulative, rank 1 free). Maxing one attribute to Cosmic = 50 pts.
export const ATTR_COST = [0, 0, 3, 6, 10, 14, 19, 25, 32, 40, 50];

// Derived engine stats — the D&D loop closes: buy VIGOR, get literal hit points.
export const derived = (attrs) => ({
  hp: Math.round(70 + attrs.vig * 9),
  ki: Math.round(78 + attrs.res * 7),
  speed: Math.round(24 + attrs.agl * 2.2),
  strength: attrs.mgt,
});

// LeFevre threat from total points spent. Thresholds sit just under each budget.
export function threatOf(total) {
  if (total < 170) return 'Low';
  if (total < 225) return 'Moderate';
  if (total < 285) return 'High';
  if (total < 345) return 'Very High';
  return 'Extreme';
}

// ---- Traits ----
export const FLIGHT_TIERS = [
  { v: 0, name: 'Grounded',  cost: 0,  d: 'leap only — F refuses' },
  { v: 1, name: 'Clumsy',    cost: 8,  d: 'sags & drifts, no hover' },
  { v: 2, name: 'Levitator', cost: 14, d: 'hovers, slow air speed' },
  { v: 3, name: 'Full Flight', cost: 22, d: 'true superhero flight' },
];
export const GUARD_TYPES = [
  { v: 'block',   name: 'Block',   cost: 0,  d: 'standard frontal guard' },
  { v: 'barrier', name: 'Barrier', cost: 14, d: 'blocks ALL directions — drains ki' },
  { v: 'deflect', name: 'Deflect', cost: 18, d: 'bullets & arrows bounce back at the shooter' },
];
export const EVADE_KINDS = [
  { v: 'dash',   name: 'Dash',   cost: 0,  d: 'burst dash with i-frames' },
  { v: 'slide',  name: 'Slide',  cost: 0,  d: 'long frictionless slide' },
  { v: 'sprint', name: 'Sprint', cost: 4,  d: 'speed surge' },
  { v: 'blink',  name: 'Blink',  cost: 10, d: 'short teleport' },
  { v: 'phase',  name: 'Phase',  cost: 14, d: 'slip through attacks (long i-frames)' },
];
export const GIFTS = [
  { id: 'thorns',      name: 'Thorns',        cost: 10, d: 'grabbing you hurts', def: { thorns: 7 } },
  { id: 'frost',       name: 'Frost-Blooded', cost: 6,  d: 'half frost buildup', def: { frostResist: true } },
  { id: 'metal',       name: 'Metal Frame',   cost: 14, d: 'armored chassis — sparks, not blood', def: { metal: true } },
  { id: 'infcore',     name: '∞ Core',        cost: 24, d: 'ki never drains — but tier-capped at II', def: { energyInfinite: true } },
  { id: 'teleescape',  name: 'Blink Reflex',  cost: 12, d: 'auto-teleport out of front grabs & ice', def: { teleEscape: true } },
  { id: 'grabheal',    name: 'Absorb',        cost: 10, d: 'your throws feed you', def: { grabHeal: true } },
  { id: 'overdrive',   name: 'Overdrive Core', cost: 10, d: 'stronger drained-fists comeback', def: { overdrive: 1.4 } },
  { id: 'guardstrong', name: 'Riot Guard',    cost: 8,  d: 'harder guard meter', def: { guardStrong: true } },
];
export const MELEE_TIERS = [
  { v: 2, name: 'Heavy Hands', cost: 0, d: 'jab + haymaker only' },
  { v: 3, name: 'Full Style',  cost: 6, d: 'jab · straight · haymaker' },
];
export const TALENT_COST = 8;   // max 3
export const GADGETS = [
  { id: 'medkit',     name: 'Field Kit',        cost: 10, d: 'heal 40, twice per life',        item: { kind: 'medkit', name: 'Field Kit', cd: 9, heal: 40, charges: 2 } },
  { id: 'flashbang',  name: 'Flash Charge',     cost: 10, d: 'stagger + wipe bot memory',      item: { kind: 'flashbang', name: 'Flash Charge', cd: 10, radius: 26, charges: 2 } },
  { id: 'jetcell',    name: 'Jump Jets',        cost: 12, d: '6s of full flight',              item: { kind: 'jetcell', name: 'Jump Jets', cd: 14, dur: 6, charges: 2 } },
  { id: 'shieldpack', name: 'Shield Cell',      cost: 12, d: 'ablative 45hp pool',             item: { kind: 'shieldpack', name: 'Shield Cell', cd: 13, shield: 45, charges: 2 } },
  { id: 'beacon',     name: 'Extraction Beacon', cost: 10, d: 'plant it — teleport back later', item: { kind: 'beacon', name: 'Extraction Beacon', cd: 3.5 } },
];

// ---- The power catalog. cat drives the AI doctrine; ult:true = R-slot only. ----
// grants: def-level traits a power brings with it (tentacle rigs, etc.).
export const POWERS = [
  // beams — hoses, never lasers
  { id: 'heatray',    name: 'Heat Ray',       cat: 'beam', cost: 22, ab: { type: 'beam', name: 'Heat Ray', cost: 4, cd: 0.3, radius: 1.0, tipSpeed: 230, maxLen: 140, dps: 58, kiPerSec: 16, steer: 13, color: '#ff5a2a', color2: '#ffe08a' } },
  { id: 'wavecannon', name: 'Wave Cannon',    cat: 'beam', cost: 30, ab: { type: 'beam', name: 'Wave Cannon', cost: 8, cd: 0.6, radius: 2.6, tipSpeed: 120, maxLen: 150, dps: 88, kiPerSec: 22, charge: true, maxCharge: 1.6, kiChargePerSec: 14, chargePower: 1.7, chargeWidth: true, steer: 9, color: '#7fd4ff', color2: '#eaffff' } },
  { id: 'cryobeam',   name: 'Cryo Beam',      cat: 'beam', cost: 18, ab: { type: 'beam', name: 'Cryo Beam', cost: 5, cd: 0.4, radius: 1.6, tipSpeed: 170, maxLen: 130, dps: 46, kiPerSec: 18, steer: 10, color: '#7fd4ff', color2: '#eaffff' } },
  { id: 'arcbeam',    name: 'Arc Beam',       cat: 'beam', cost: 20, ab: { type: 'beam', name: 'Arc Beam', cost: 4, cd: 0.3, radius: 1.0, tipSpeed: 250, maxLen: 140, dps: 58, kiPerSec: 16, steer: 15, color: '#eaffff', color2: '#ffe066' } },
  // blasts
  { id: 'kibolt',     name: 'Ki Bolt',        cat: 'blast', cost: 14, ab: { type: 'projectile', name: 'Ki Bolt', cost: 6, cd: 0.28, damage: 12, speed: 92, radius: 1.1, blast: 4.5, homing: 2, color: '#7fd4ff', color2: '#eaffff' } },
  { id: 'flare',      name: 'Burning Flare',  cat: 'blast', cost: 16, ab: { type: 'projectile', name: 'Burning Flare', cost: 8, cd: 0.5, damage: 18, speed: 78, radius: 1.5, blast: 7, homing: 2.4, color: '#ff8a3d', color2: '#ffd24a' } },
  { id: 'graviton',   name: 'Graviton Lob',   cat: 'blast', cost: 16, ab: { type: 'projectile', name: 'Graviton Lob', cost: 9, cd: 0.6, damage: 22, speed: 56, radius: 1.9, blast: 12, grav: 9, shock: true, color: '#7fe6ff', color2: '#d0f6ff' } },
  { id: 'spike',      name: 'Glacier Spike',  cat: 'blast', cost: 16, ab: { type: 'projectile', name: 'Glacier Spike', cost: 9, cd: 0.6, damage: 22, speed: 70, radius: 1.6, blast: 8, shock: true, color: '#7fd4ff', color2: '#eaffff' } },
  { id: 'chainbolt',  name: 'Chain Bolt',     cat: 'blast', cost: 14, ab: { type: 'projectile', name: 'Chain Bolt', cost: 6, cd: 0.35, damage: 14, speed: 120, radius: 1.0, blast: 5, homing: 3.4, color: '#ffe066', color2: '#eaffff' } },
  { id: 'boomaxe',    name: 'Returning Axe',  cat: 'blast', cost: 18, ab: { type: 'projectile', name: 'Returning Axe', cost: 10, cd: 0.9, damage: 22, speed: 110, radius: 1.3, blast: 6, boomerang: true, range: 62, color: '#7fd4ff', color2: '#fff' } },
  { id: 'volley',     name: 'Blast Volley',   cat: 'blast', cost: 18, ab: { type: 'volley', name: 'Blast Volley', cost: 3, interval: 0.07, damage: 7, speed: 112, radius: 0.85, blast: 3.6, spread: 0.1, color: '#6ea0ff', color2: '#eaffff' } },
  { id: 'bigbang',    name: 'Nova Burst',       cat: 'charge', cost: 26, ab: { type: 'charge', name: 'Nova Burst', cost: 6, cd: 1.0, kiPerSec: 12, maxCharge: 2.4, minR: 1.3, maxR: 6.2, dmgMin: 22, dmgMax: 84, maxBlast: 32, speedMin: 40, speedMax: 76, chargePower: 3, color: '#6ea0ff', color2: '#eaffff' } },
  // cones & fields
  { id: 'coldcone',   name: 'Winter Breath',  cat: 'cone', cost: 20, ab: { type: 'cone', name: 'Winter Breath', kiPerSec: 20, range: 38, arc: 1.15, dps: 26, cold: true, color: '#bfe9ff' } },
  { id: 'forcecone',  name: 'Force Push',     cat: 'cone', cost: 16, ab: { type: 'cone', name: 'Force Push', kiPerSec: 16, range: 32, arc: 1.25, dps: 16, push: 60, lift: 6, color: '#7fe6ff' } },
  { id: 'lifedrain',  name: 'Siphon',         cat: 'cone', cost: 20, ab: { type: 'lifedrain', name: 'Siphon', kiPerSec: 14, range: 26, arc: 0.9, dps: 22, ratio: 0.6, color: '#9dff5a' } },
  // martial (priced high — the audit says rush kits feast)
  { id: 'skysmash',   name: 'Sky Smash',      cat: 'martial', cost: 18, ab: { type: 'melee', name: 'Sky Smash', cost: 14, cd: 1.1, damage: 30, range: 13, arc: 0.75, lunge: 64, knock: 58, launch: 18, fly: true, color: '#ffd24a' } },
  { id: 'rushcombo',  name: 'Rush Combo',     cat: 'martial', cost: 16, ab: { type: 'melee', name: 'Rush Combo', cost: 12, cd: 1.2, damage: 24, range: 12, arc: 0.8, lunge: 52, knock: 46, launch: 12, color: '#6ea0ff' } },
  { id: 'dragonrush', name: 'Comet Rush',    cat: 'martial', cost: 20, ab: { type: 'rush', name: 'Comet Rush', cost: 16, cd: 2.2, range: 72, hits: 7, interval: 0.09, damage: 9, finisher: 34, color: '#eaffff' } },
  { id: 'flurry',     name: 'Lightning Flurry', cat: 'martial', cost: 22, ab: { type: 'rush', name: 'Lightning Flurry', cost: 10, cd: 1.1, range: 60, hits: 12, interval: 0.05, damage: 6, finisher: 30, color: '#eaffff' } },
  // mobility
  { id: 'blinkstep',  name: 'Instant Step',   cat: 'mobility', cost: 16, ab: { type: 'teleport', name: 'Instant Step', cost: 12, cd: 1.4, range: 58, color: '#eaffff' } },
  { id: 'zapstep',    name: 'Zap Step',       cat: 'mobility', cost: 12, ab: { type: 'teleport', name: 'Zap Step', cost: 8, cd: 0.8, range: 44, color: '#eaffff' } },
  { id: 'phasehold',  name: 'Intangibility',  cat: 'mobility', cost: 20, ab: { type: 'phase', name: 'Intangibility', kiPerSec: 18, color: '#bfeaff' } },
  // guns & gear — Street-tier pricing
  { id: 'carbine',    name: 'Auto Carbine',   cat: 'gear', cost: 14, ab: { type: 'rifle', name: 'Auto Carbine', cost: 2, interval: 0.08, damage: 5, speed: 180, radius: 0.5, blast: 2, spread: 0.05, recoil: 1.6, color: '#ffe08a', color2: '#fff' } },
  { id: 'handcannon', name: 'Hand Cannon',    cat: 'gear', cost: 12, ab: { type: 'rifle', name: 'Hand Cannon', cost: 5, interval: 0.34, damage: 16, speed: 150, radius: 0.8, blast: 3.5, spread: 0.015, recoil: 3.2, color: '#ffd24a', color2: '#fff' } },
  { id: 'scattergun', name: 'Riot Scattergun', cat: 'gear', cost: 14, ab: { type: 'rifle', name: 'Riot Scattergun', cost: 6, interval: 0.55, damage: 26, speed: 140, radius: 1.1, blast: 6, spread: 0.06, recoil: 4.5, color: '#ff5a4a', color2: '#fff' } },
  { id: 'twinpistols', name: 'Twin Pistols',  cat: 'gear', cost: 12, ab: { type: 'rifle', name: 'Twin Pistols', cost: 3, interval: 0.16, damage: 10, speed: 165, radius: 0.6, blast: 2.6, spread: 0.03, recoil: 1.2, color: '#ffb03a', color2: '#fff' } },
  { id: 'longbow',    name: 'Longbow',        cat: 'gear', cost: 18, ab: { type: 'bow', name: 'Longbow', cost: 6, cd: 0.25, drawTime: 0.85, dmgMin: 8, dmgMax: 30, speedMax: 215, blast: 11, payloads: ['explosive', 'flame', 'poison'], color: '#9fe06a' } },
  { id: 'quiver',     name: 'Quiver Switch',  cat: 'gear', cost: 6, req: 'longbow', ab: { type: 'quiver', name: 'Switch Broadheads', payloads: ['explosive', 'flame', 'poison'], color: '#9fe06a' } },
  { id: 'mines',      name: 'Proximity Mines', cat: 'gear', cost: 16, ab: { type: 'mine', name: 'Proximity Mines', cost: 10, cd: 1.1, max: 3, trigger: 7, damage: 24, blast: 12, armT: 0.6, duration: 20, range: 55, color: '#ff5a4a' } },
  // command
  { id: 'drones',     name: 'Drone Swarm',    cat: 'command', cost: 20, ab: { type: 'summon', name: 'Drone Swarm', cost: 16, cd: 4, count: 3, max: 6, duration: 12, damage: 7, interval: 0.7, speed: 82, color: '#ffdf7a', color2: '#fff' } },
  { id: 'willfist',   name: 'Ram Fist',       cat: 'command', cost: 18, ab: { type: 'construct', name: 'Ram Fist', cost: 14, cd: 5, construct: 'fist', duration: 11, color: '#5fe07a' } },
  { id: 'sentry',     name: 'Sentry Turret',  cat: 'command', cost: 18, ab: { type: 'construct', name: 'Sentry Turret', cost: 16, cd: 8, construct: 'turret', duration: 12, color: '#5fe07a' } },
  { id: 'wall',       name: 'Barrier Wall',   cat: 'command', cost: 12, ab: { type: 'construct', name: 'Barrier Wall', cost: 12, cd: 7, construct: 'wall', duration: 9, holdTrigger: true, color: '#7dff9e' } },
  { id: 'tentacle',   name: 'Seizing Limbs',  cat: 'command', cost: 24, grants: { tentacles: true }, ab: { type: 'tentacle', name: 'Seizing Limbs', cost: 18, cd: 4.5, range: 36, holdT: 0.55, damage: 16, throwSpeed: 92, color: '#4affd4' } },
  { id: 'portal',     name: 'Dimensional Door', cat: 'command', cost: 24, ab: { type: 'portal', name: 'Dimensional Door', cost: 14, cd: 1.2, range: 85, dur: 14, colorA: '#ff8a2a', colorB: '#37c7ff' } },
  // support
  { id: 'powerbuff',  name: 'Ascendance',     cat: 'support', cost: 18, ab: { type: 'buff', name: 'Ascendance', cost: 26, cd: 20, mult: 1.6, dur: 11, color: '#ffe066', color2: '#fff' } },
  { id: 'huntersight', name: "Hunter's Mark", cat: 'support', cost: 14, ab: { type: 'buff', name: "Hunter's Mark", cost: 16, cd: 15, mult: 1.15, dur: 8, reveal: true, color: '#ffb03a', color2: '#fff' } },
  // ultimates — R slot only
  { id: 'finalbeam',   name: 'Terminal Flash', cat: 'beam', ult: true, cost: 34, ab: { type: 'beam', name: 'Terminal Flash', cost: 24, cd: 14, radius: 3.4, tipSpeed: 150, maxLen: 170, dps: 130, kiPerSec: 30, charge: true, maxCharge: 2.0, kiChargePerSec: 20, chargePower: 2, chargeWidth: true, steer: 6, color: '#eaffa0', color2: '#ffffff' } },
  { id: 'meteorstorm', name: 'Meteor Storm',  cat: 'artillery', ult: true, cost: 32, ab: { type: 'meteor', name: 'Meteor Storm', cost: 34, cd: 18, count: 14, interval: 0.18, spread: 28, radius: 3, damage: 34, blast: 18, color: '#ff8a3d', color2: '#ffd24a' } },
  { id: 'growingorb',  name: 'Star Sphere',   cat: 'artillery', ult: true, cost: 32, ab: { type: 'growingorb', name: 'Star Sphere', cost: 20, cd: 16, minR: 5, maxR: 20, growRate: 8, kiPerSec: 16, color: '#9effcf', color2: '#eaffff' } },
  { id: 'overload',    name: 'Overload',      cat: 'support', ult: true, cost: 26, ab: { type: 'buff', name: 'Overload', cost: 30, cd: 22, mult: 1.7, dur: 12, heal: 40, color: '#ffd24a', color2: '#fff2c0' } },
  { id: 'collapse',    name: 'Collapse',      cat: 'charge', ult: true, cost: 30, ab: { type: 'charge', name: 'Collapse', cost: 10, cd: 15, kiPerSec: 13, maxCharge: 2.4, minR: 2, maxR: 7.5, dmgMin: 28, dmgMax: 90, maxBlast: 40, speedMin: 34, speedMax: 58, chargePower: 3.2, color: '#7fe6ff', color2: '#eaffff' } },
  { id: 'backup',      name: 'Call Backup',   cat: 'command', ult: true, cost: 26, ab: { type: 'summon', name: 'Call Backup', cost: 26, cd: 16, count: 3, max: 6, duration: 13, damage: 8, interval: 0.6, speed: 86, color: '#2a5ad8', color2: '#ff5a4a' } },
];
export const powerById = (id) => POWERS.find(p => p.id === id);

// ---- Cosmetics: palettes (NO purple — house law), skins, frames, capes ----
export const PALETTES = [
  { name: 'Crimson Gold', primary: '#d8322f', secondary: '#2b1a10', accent: '#ffd24a' },
  { name: 'Steel Blue',   primary: '#2a52d8', secondary: '#d8d2c4', accent: '#7fd4ff' },
  { name: 'Emerald',      primary: '#16a34a', secondary: '#0b3d24', accent: '#7dff9e' },
  { name: 'Ember',        primary: '#ff8a3d', secondary: '#2b1a10', accent: '#ffd24a' },
  { name: 'Glacier',      primary: '#4fb8e6', secondary: '#dff6ff', accent: '#eaffff' },
  { name: 'Midnight Gold', primary: '#1a1a22', secondary: '#3a3a44', accent: '#f5b21a' },
  { name: 'Verdigris',    primary: '#2f6f7f', secondary: '#10202a', accent: '#7fe6ff' },
  { name: 'Blood Black',  primary: '#a81b1a', secondary: '#141216', accent: '#ff5a4a' },
  { name: 'Bone White',   primary: '#e8e2d4', secondary: '#8b8577', accent: '#ffd24a' },
  { name: 'Bronze',       primary: '#8a5a24', secondary: '#2b1a10', accent: '#ffb03a' },
  { name: 'Voltage',      primary: '#ffd21a', secondary: '#1a1a22', accent: '#eaffff' },
  { name: 'Rose Red',     primary: '#c9184a', secondary: '#241016', accent: '#ff7a9a' },
];
export const SKINS = ['#e8c39a', '#caa27a', '#8a5a3a', '#5a3a24', '#cfe6f0', '#b9c6cc'];
export const FRAMES = [
  { id: 'classic',    name: 'Classic',    build: { band: 1, gaunt: 1 } },
  { id: 'knight',     name: 'Knight',     build: { helmet: 1, visor: 1, pauldron: 2, gaunt: 1 } },
  { id: 'sentinel',   name: 'Sentinel',   build: { helmet: 1, visor: 1, collar: 1 } },
  { id: 'crested',    name: 'Crested',    build: { crest: 1, gaunt: 1 } },
  { id: 'regal',      name: 'Regal',      build: { collar: 1, pauldron: 1, gaunt: 1 } },
  { id: 'trooper',    name: 'Trooper',    build: { helmet: 1, visor: 1, pauldron: 2, gaunt: 1, gun: 1 } },
  { id: 'blade',      name: 'Blade',      build: { band: 1, pauldron: 1, gaunt: 1, weaponL: 'sword', shield: 1 } },
  { id: 'ranger',     name: 'Ranger',     build: { band: 1, weaponL: 'bow', weaponR: 'knife' } },
  { id: 'gunslinger', name: 'Gunslinger', build: { band: 1, weaponL: 'pistol', weaponR: 'pistol' } },
  { id: 'bare',       name: 'Bare',       build: {} },
];

// ---- Doctrine (AI profile) derived from the picked kit — customs fight as bots too ----
export function deriveAI(slots, flightTier) {
  const cats = Object.values(slots).filter(Boolean).map(id => (powerById(id) || {}).cat);
  const n = (c) => cats.filter(x => x === c).length;
  const fly = flightTier >= 3 ? 0.5 : flightTier * 0.15;
  if (n('martial') >= 2) return { style: 'rusher', range: 18, aggro: 0.9, fly };
  if (cats.includes('command') && (n('command') >= 2)) return { style: 'summoner', range: 45, aggro: 0.5, fly };
  if (n('beam') >= 2) return { style: 'beamer', range: 40, aggro: 0.85, fly };
  if (n('artillery') >= 1 || n('charge') >= 2) return { style: 'artillery', range: 55, aggro: 0.55, fly };
  if (Object.values(slots).some(id => id === 'tentacle')) return { style: 'grappler', range: 30, aggro: 0.8, fly };
  if (n('gear') >= 2) return { style: 'zoner', range: 45, aggro: 0.6, fly };
  if (n('cone') >= 2) return { style: 'zoner', range: 34, aggro: 0.6, fly };
  return { style: 'bruiser', range: 30, aggro: 0.75, fly };
}
const DOCTRINE_NAMES = { rusher: 'Rusher', beamer: 'Beam Artillery', artillery: 'Sky Artillery', zoner: 'Zoner', bruiser: 'Bruiser', trickster: 'Trickster', grappler: 'Grappler', summoner: 'Commander' };

// ---- Point accounting ----
export function tally(picks) {
  const a = picks.attrs;
  const attrs = Object.values(a).reduce((s, v) => s + ATTR_COST[Math.max(1, Math.min(10, v))], 0);
  const powers = Object.values(picks.slots).filter(Boolean).reduce((s, id) => s + (powerById(id)?.cost || 0), 0);
  const traits =
    (FLIGHT_TIERS.find(f => f.v === picks.flightTier)?.cost || 0) +
    (GUARD_TYPES.find(g => g.v === picks.guardType)?.cost || 0) +
    (EVADE_KINDS.find(e => e.v === picks.evade)?.cost || 0) +
    (MELEE_TIERS.find(m => m.v === picks.meleeTiers)?.cost || 0) +
    picks.gifts.reduce((s, id) => s + (GIFTS.find(g => g.id === id)?.cost || 0), 0);
  const talents = picks.talents.length * TALENT_COST;
  const gadgets = picks.gadgets.reduce((s, id) => s + (GADGETS.find(g => g.id === id)?.cost || 0), 0);
  const total = attrs + powers + traits + talents + gadgets;
  return { attrs, powers, traits, talents, gadgets, total };
}

// ---- Fresh state ----
export function freshPicks() {
  return {
    name: '', title: 'Living Superweapon',
    realName: '', city: '', country: '',
    palette: 0, skin: 0, frame: 0, cape: false,
    voicePitch: 1.0, yells: true,
    budget: 'superweapon',
    attrs: { fgt: 4, agl: 4, mgt: 4, vig: 4, int: 4, awr: 4, res: 4 },
    flightTier: 0, guardType: 'block', evade: 'dash', meleeTiers: 3,
    gifts: [], talents: [], gadgets: [],
    slots: { lmb: null, rmb: null, q: null, e: null, f: null, r: null },
  };
}

// ---- Assemble a ROSTER-compatible def from picks ----
export function buildDef(picks, existingId) {
  const pal = PALETTES[picks.palette] || PALETTES[0];
  const t = tally(picks);
  const d = derived(picks.attrs);
  const ai = deriveAI(picks.slots, picks.flightTier);
  const abilities = { shift: { type: 'dash', name: 'Burst Dash', cost: 5, cd: 0.6, power: 100, iframes: 0.24, color: pal.accent } };
  const grants = {};
  for (const [slot, id] of Object.entries(picks.slots)) {
    if (!id) continue;
    const p = powerById(id); if (!p) continue;
    abilities[slot] = { ...p.ab };
    if (p.grants) Object.assign(grants, p.grants);
  }
  for (const gid of picks.gifts) { const g = GIFTS.find(x => x.id === gid); if (g) Object.assign(grants, g.def); }
  const threat = threatOf(t.total);
  const name = (picks.name || 'NAMELESS').toUpperCase().slice(0, 14);
  const sig = ['lmb', 'rmb', 'q', 'r'].filter(k => picks.slots[k]).slice(0, 4)
    .map(k => `${k === 'lmb' ? 'LMB' : k === 'rmb' ? 'RMB' : k.toUpperCase()} ${powerById(picks.slots[k]).name}`);
  const id = existingId || ('cx_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '') + '_' + Date.now().toString(36).slice(-5));
  return {
    id, name, title: picks.title || 'Living Superweapon',
    person: {
      n: (picks.realName || '').trim() || 'Identity sealed',
      c: (picks.city || '').trim() || 'Undisclosed',
      co: (picks.country || '').trim() || 'Unknown', f: '🌐',
    },
    role: (DOCTRINE_NAMES[ai.style] || 'Bruiser') + ' / Origin',
    isCustom: true,
    colors: { primary: pal.primary, secondary: pal.secondary, accent: pal.accent, skin: SKINS[picks.skin] || SKINS[0], ...(picks.cape ? { cape: pal.primary } : {}) },
    hp: d.hp, ki: d.ki, speed: d.speed, strength: d.strength,
    threat, flightTier: picks.flightTier, guardType: picks.guardType, meleeTiers: picks.meleeTiers,
    overdrive: 1.0, yells: !!picks.yells, voicePitch: picks.voicePitch,
    attrs: { ...picks.attrs }, talents: picks.talents.slice(0, 3),
    build: { ...(FRAMES[picks.frame]?.build || {}) },
    ...grants,
    ai, evade: { kind: picks.evade },
    items: picks.gadgets.map(gid => ({ ...(GADGETS.find(g => g.id === gid)?.item || {}) })).filter(i => i.kind),
    blurb: `${threat}-threat ${DOCTRINE_NAMES[ai.style] || 'fighter'} forged in ORIGIN. ` +
      Object.values(picks.slots).filter(Boolean).slice(0, 3).map(pid => powerById(pid).name).join(' · ') + '.',
    sig, abilities,
  };
}

// ---- Validation (save gate) ----
export function validate(picks) {
  const errs = [];
  if (!picks.name || !picks.name.trim()) errs.push('Name your weapon.');
  if (!picks.slots.lmb || !picks.slots.rmb) errs.push('LMB and RMB powers are required.');
  if (picks.slots.r && !powerById(picks.slots.r)?.ult) errs.push('R takes an ULTIMATE.');
  for (const k of ['lmb', 'rmb', 'q', 'e', 'f']) if (picks.slots[k] && powerById(picks.slots[k])?.ult) errs.push('Ultimates only fit the R slot.');
  const ids = Object.values(picks.slots).filter(Boolean);
  if (new Set(ids).size !== ids.length) errs.push('Each power can only be taken once.');
  if (ids.includes('quiver') && !ids.includes('longbow')) errs.push('Quiver Switch needs the Longbow.');
  const b = BUDGETS.find(x => x.id === picks.budget);
  if (b && b.pts > 0 && tally(picks).total > b.pts) errs.push(`Over budget: ${tally(picks).total}/${b.pts} pts.`);
  if (picks.talents.length > 3) errs.push('Max 3 talents.');
  if (picks.gadgets.length > 2) errs.push('Max 2 gadgets.');
  return errs;
}

// ---- Persistence + roster install ----
const LS_KEY = 'threshold_customs_v1';
export function loadCustoms() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]').filter(c => c && c.def && c.def.id); }
  catch { return []; }
}
function saveAll(list) { try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch { /* storage full/blocked — play on */ } }
export function saveCustom(picks, def, roster) {
  const list = loadCustoms().filter(c => c.def.id !== def.id);
  list.push({ v: 1, picks, def });
  saveAll(list);
  const i = roster.findIndex(r => r.id === def.id);
  if (i >= 0) roster[i] = def; else roster.push(def);
  return def;
}
export function deleteCustom(id, roster) {
  saveAll(loadCustoms().filter(c => c.def.id !== id));
  const i = roster.findIndex(r => r.id === id);
  if (i >= 0) roster.splice(i, 1);
}
export function installCustoms(roster) {
  for (const c of loadCustoms()) {
    try { if (!roster.some(r => r.id === c.def.id)) roster.push(c.def); }
    catch { /* one bad save never blocks boot */ }
  }
}

// THRESHOLD — the tabletop layer. Seven ranked attributes on one universal ladder, talents
// (trained perks with real mechanical hooks), and derivation from hero data so every existing
// character gets a full sheet automatically. Inspired by the SHAPE of classic tabletop supers
// systems (rank ladders, attribute spreads, talents, gear) — all names and rules are original.
// This file is the character creator's future data model: a hero IS a sheet.

// The universal rank ladder (1–10). Every attribute reads off this one table.
export const RANKS = [
  null,
  { n: 'Civilian',     c: '#8b8577' },
  { n: 'Trained',      c: '#a49c8c' },
  { n: 'Exceptional',  c: '#c9c2b4' },
  { n: 'Enhanced',     c: '#8fe08a' },
  { n: 'Superhuman',   c: '#7fe6ff' },
  { n: 'Paragon',      c: '#7fb0ff' },
  { n: 'Devastating',  c: '#ffd24a' },
  { n: 'Cataclysmic',  c: '#ff9a3a' },
  { n: 'Planetary',    c: '#ff5a4a' },
  { n: 'Cosmic',       c: '#ffffff' },
];
export const rankName = (v) => (RANKS[Math.max(1, Math.min(10, Math.round(v)))] || RANKS[1]).n;
export const rankColor = (v) => (RANKS[Math.max(1, Math.min(10, Math.round(v)))] || RANKS[1]).c;

// The seven attributes — what each one DOES in the engine:
export const ATTR_DEFS = [
  { k: 'fgt', name: 'Fighting',  does: 'melee & strike damage' },
  { k: 'agl', name: 'Agility',   does: 'evade recovery' },
  { k: 'mgt', name: 'Might',     does: 'knockback resistance · throws · slams' },
  { k: 'vig', name: 'Vigor',     does: 'health pool · durability' },
  { k: 'int', name: 'Intellect', does: 'ability & gadget cooldowns' },
  { k: 'awr', name: 'Awareness', does: 'vision range' },
  { k: 'res', name: 'Resolve',   does: 'ki & guard recovery · status recovery' },
];

const cl = (v) => Math.max(1, Math.min(10, Math.round(v)));

// Derive a full 7-attribute sheet from what the hero data already says — explicit
// def.attrs entries override any derived value (that's the creator's dial).
export function deriveAttrs(def) {
  const A = Object.values(def.abilities || {});
  const types = A.map(a => a.type);
  const str = def.strength ?? 5;
  const out = {
    mgt: cl(str),
    agl: cl((def.speed || 30) / 46 * 7 + (def.evade && (def.evade.kind === 'blink' || def.evade.kind === 'phase') ? 1.5 : 0)),
    fgt: cl(2.5 + (types.includes('melee') || types.includes('rush') ? 2 : 0) + ((def.meleeTiers ?? 3) === 2 ? 1 : 0) + str / 4),
    vig: cl((def.hp || 100) / 150 * 7 + (def.metal ? 1.5 : 0) + (def.guardStrong ? 0.5 : 0)),
    int: cl(3 + ((def.items || []).length ? 2 : 0) + (types.includes('construct') || types.includes('summon') ? 1.5 : 0) + (types.includes('rifle') || types.includes('bow') ? 1 : 0) + (def.metal ? 1 : 0)),
    awr: cl(3 + ((def.ai && def.ai.range) || 30) / 25 + (A.some(a => a.reveal) ? 3 : 0) + (types.includes('bow') || types.includes('rifle') ? 1 : 0)),
    res: cl((def.ki || 100) / 140 * 7 + (def.guardType === 'barrier' ? 1 : 0) + (def.energyInfinite ? 2 : 0)),
  };
  return Object.assign(out, def.attrs || {});
}

// ---- Talents: trained perks with teeth. Each maps to one engine hook. ----
export const TALENTS = {
  marksman:     { name: 'Marksman',       does: 'guns & bows: 45% tighter spread' },
  martial:      { name: 'Martial Artist', does: 'jabs & straights +12%' },
  demolitions:  { name: 'Demolitionist',  does: 'blast radius +18%' },
  acrobat:      { name: 'Acrobat',        does: 'evades recover 30% faster' },
  ironwill:     { name: 'Iron Will',      does: 'shake off stagger & ice 45% faster' },
  tactician:    { name: 'Tactician',      does: 'all cooldowns −12%' },
  medic:        { name: 'Field Medic',    does: 'all healing +25%' },
  brawler:      { name: 'Brawler',        does: 'haymakers charge 20% faster' },
  survivor:     { name: 'Survivor',       does: 'Overdrive window opens at 35% ki' },
  commander:    { name: 'Commander',      does: 'summons & constructs last +30%' },
  predator:     { name: 'Predator',       does: '+15% damage to foes under 30% hp' },
};

// Per-hero talent picks (1–3). Unlisted heroes derive sensible defaults from their kit.
export const HERO_TALENTS = {
  sol: ['brawler', 'survivor'], kano: ['martial', 'survivor'], vega: ['demolitions', 'brawler'],
  aurum: ['commander', 'tactician'], nova: ['demolitions'], rime: ['tactician', 'ironwill'],
  volt: ['acrobat', 'martial'], warden: ['brawler', 'ironwill'], hive: ['commander', 'tactician'],
  pyre: ['demolitions', 'survivor'], torch: ['acrobat', 'demolitions'], apex: ['predator', 'survivor'],
  specter: ['ironwill', 'tactician'], vanguard: ['brawler', 'ironwill'], kraken: ['brawler', 'predator'],
  rift: ['tactician', 'acrobat'], titan: ['marksman', 'demolitions'], sarge: ['marksman', 'tactician', 'medic'],
  kivuli: ['predator', 'tactician'], gale: ['marksman', 'acrobat', 'predator'], stefanos: ['demolitions', 'ironwill'],
  sandra: ['marksman', 'predator', 'tactician'],
  ironclad: ['tactician', 'demolitions'], rage: ['brawler', 'survivor'], stormcall: ['brawler', 'demolitions'],
  webline: ['acrobat', 'martial'], ripclaw: ['martial', 'survivor', 'predator'], majesty: ['demolitions', 'ironwill'],
  mystward: ['tactician', 'commander'], onyx: ['martial', 'acrobat', 'predator'], chainfire: ['predator', 'ironwill'],
  tempest: ['tactician'], knightfall: ['tactician', 'martial', 'marksman'], aegis: ['brawler', 'martial', 'ironwill'],
  olympus: ['brawler', 'survivor'], marshal: ['ironwill', 'martial'], circuit: ['marksman', 'tactician'],
  trench: ['commander', 'brawler'], decibel: ['martial', 'acrobat'], coldsnap: ['marksman', 'tactician'],
  foundry: ['demolitions', 'brawler'], talon: ['acrobat', 'martial', 'medic'],
  abeo: ['ironwill', 'brawler'], jelani: ['martial', 'acrobat', 'survivor'], kamaria: ['acrobat', 'ironwill'],
  ramiro: ['marksman', 'ironwill'], jawah: ['ironwill', 'predator'], moses: ['survivor', 'medic'],
  dune: ['commander', 'demolitions'], graven: ['tactician', 'demolitions'], bulwark: ['ironwill', 'commander', 'medic'],
  feral: ['martial', 'predator', 'survivor'],
};

export function heroTalents(def) {
  if (def.talents && def.talents.length) return def.talents.slice(0, 3);   // ORIGIN customs pick their own
  if (HERO_TALENTS[def.id]) return HERO_TALENTS[def.id];
  const A = Object.values(def.abilities || {});
  const t = [];
  if (A.some(a => a.type === 'rifle' || a.type === 'bow')) t.push('marksman');
  if (A.some(a => a.type === 'melee' || a.type === 'rush')) t.push('martial');
  if (A.some(a => a.type === 'summon' || a.type === 'construct')) t.push('commander');
  if (!t.length) t.push('survivor');
  return t.slice(0, 3);
}

// Bake attributes + talents into flat multipliers the engine reads every frame.
export function bakeSheet(def) {
  const attrs = deriveAttrs(def);
  const talents = heroTalents(def);
  const has = (k) => talents.includes(k);
  return {
    attrs, talents,
    cdMult: (1 - (attrs.int - 1) * 0.013) * (has('tactician') ? 0.88 : 1),          // INT 10 + Tactician ≈ 0.78×
    spreadMult: has('marksman') ? 0.55 : 1,
    blastMult: has('demolitions') ? 1.18 : 1,
    evadeCdMult: (1 - (attrs.agl - 1) * 0.02) * (has('acrobat') ? 0.7 : 1),
    ccRecover: 1 + (attrs.res - 5) * 0.03 + (has('ironwill') ? 0.45 : 0),           // stagger/ice shake-off
    healMult: has('medic') ? 1.25 : 1,
    odWindow: has('survivor') ? 0.35 : 0.25,                                        // Overdrive opens earlier
    sumDurMult: has('commander') ? 1.3 : 1,
    jabMult: (0.9 + attrs.fgt * 0.02) * (has('martial') ? 1.12 : 1),                // FGT drives trained striking
    chargeRate: has('brawler') ? 1.2 : 1,                                           // haymaker winds up faster
    predator: has('predator'),
    kiRegenMult: 0.85 + attrs.res * 0.03,                                           // RES 10 ≈ 1.15×
    visMult: 0.8 + attrs.awr * 0.04,                                                // AWR 10 sees 20% farther
  };
}

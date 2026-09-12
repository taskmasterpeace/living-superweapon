// Shared combat rules: simulation and player-facing descriptions use this table.
export const DTYPES = ['physical', 'ballistic', 'energy', 'fire', 'cold', 'toxic', 'acid', 'magic'];
export const DTYPE_INFO = {
  physical:  { label: 'PHYSICAL',  c: '#e8e2d4', note: 'Fists, slams, thrown cars. The baseline — almost nothing resists it.' },
  ballistic: { label: 'BALLISTIC', c: '#c9b98a', note: 'Bullets. Meets ARMOUR then TOUGHNESS — lethal to people, an annoyance to superweapons.' },
  energy:    { label: 'ENERGY',    c: '#7fd8ff', note: 'Ki blasts and beams. The universal currency; few resistances.' },
  fire:      { label: 'FIRE',      c: '#ff7a2a', note: 'Heat damage. Flame payloads also burn over time; metal and fire-blooded fighters resist fire.' },
  cold:      { label: 'COLD',      c: '#bfeaff', note: 'Cold damage. Attacks marked FREEZE also build frost or encase the target. Frost-resistant fighters take less cold damage.' },
  toxic:     { label: 'TOXIC',     c: '#8fe08a', note: 'Poison and gas. Needs a metabolism — machines are immune.' },
  acid:      { label: 'ACID',      c: '#c8e04a', note: 'CORRODES ARMOUR for its duration. Weak on bare flesh, devastating on a plated chassis.' },
  magic:     { label: 'MAGIC',     c: '#ff7a5a', note: 'Attacks the WILL and SIPHONS energy — drains their ki straight into the caster. Resisted by RESOLVE.' },
};
// Derived so no hero has to be hand-authored to be correct. `def.resist` always wins.
// ⚠ Every resistance must cut BOTH ways (manual §3): metal resists toxic and fire, and is WEAK
// to acid. A resistance with no matching weakness is just a nerf, not a system.
// which damage type each damage-over-time kind lands as
export const DOT_DTYPE = { poison: 'toxic', gas: 'toxic', burn: 'fire', acid: 'acid' };
export function resistOf(def, sheet) {
  const r = { physical: 1, ballistic: 1, energy: 1, fire: 1, cold: 1, toxic: 1, acid: 1, magic: 1 };
  // MAGIC is resisted by RESOLVE — the will stat finally defends something. Cuts both ways:
  // an iron-willed fighter shrugs it off, a fragile one takes MORE than baseline.
  // ⚠ CENTRED ON THE ROSTER'S ACTUAL MEDIAN (res 6, range 5-9). Centring on 5 made the curve
  // top out at 1.0, so NOTHING in the game was weak to magic — a resistance with no matching
  // weakness is just a nerf (manual §3). Now roughly half the cast is soft to it.
  const res = (sheet && sheet.attrs && sheet.attrs.res) || 6;
  r.magic = Math.max(0.55, Math.min(1.3, 1.45 - res * 0.07));
  if (def.warded) r.magic *= 0.5;
  if (def.metal) { r.toxic = 0; r.fire = 0.6; r.acid = 1.6; }
  else if ((def.armor || 0) > 0) { r.acid = 1.4; }
  else r.acid = 0.7;                                    // bare flesh: acid is the WRONG tool
  if (def.frostResist) r.cold = 0.45;
  if (def.fireBlood) r.fire = 0.35;
  if (!def.person || !def.person.n) r.toxic = Math.min(r.toxic, 0.25);   // synthetics barely metabolise
  return Object.assign(r, def.resist || {});
}

// THE CLINCH — martial arts, frame data, and the wrestling layer.
//
// Robert's spec, built. Every number below is his; this file is the single place they live so the
// engine, the spacing rings and the codex can never disagree about how far a jab reaches.
//
// ⚠ THE CORE INVERSION, AND IT IS THE WHOLE GAME: **the jab reaches FURTHEST and the power punch
// reaches LEAST.** You live at jab range; to threaten real damage you have to walk into theirs.
// Before this the engine had it backwards — a jab reached 13u and a haymaker 13.5u, so stepping in
// cost nothing and there was no spacing decision to make at all.
//
// ⚠ THE SHORT-ARMS PROBLEM. A 9.6u fighter on an isometric camera has an arm perhaps 3u long; it
// will never sell an 11u jab. Robert's answer is the right one and it is what every top-down game
// does: REACH IS A FLOOR PROPERTY, NOT A LIMB PROPERTY. The arcs are ground decals, the whole body
// steps in, and the impact spark lands at the hitbox edge rather than at the fist. Nobody checks
// the hand. See `STEP` and the ring overlay in game.js.

// -------------------------------------------------------------------------------------------------
// FRAME DATA. Times in seconds, reach in world units (1u ≈ 0.19m, a fighter is 9.6u).
// `step` is the forward body lunge — the thing that actually sells the reach.
// ⚠ `blk` IS THE SABER RISK MODEL AT OUR SCALE (aaa-02-ground.md §4.3). JKA marks every transition
// and bounce `BLK_NO`: moving between guards is exactly when you cannot block. Here the same idea is
// a property of the PHASE you are in — a jab's active window still shields (`tight`), but a power
// punch's whole 0.34s wind-up is `no`, so a jab beats it. `blockStateOf` is the ONE reader.
//   'no'    — no block at all (a committed wind-up is real exposure)
//   'tight' — only a narrow arc, and the guard drains faster (you are blocking with a busy hand)
//   'wide'  — the ordinary held guard (unchanged from today)
export const STRIKES = {
  jab:   { n: 'JAB',   reach: 11, startup: 0.10, active: 0.06, recover: 0.14, dmg: 4,  step: 2.0,
           cancels: ['cross', 'grab', 'dash'], color: '#7fe6ff',
           blk: { startup: 'tight', active: 'tight', recover: 'no' } },
  cross: { n: 'CROSS', reach: 9,  startup: 0.16, active: 0.07, recover: 0.22, dmg: 8,  step: 3.0,
           cancels: ['grab'], color: '#ffd24a',
           blk: { startup: 'tight', active: 'no', recover: 'no' } },
  power: { n: 'POWER', reach: 7,  startup: 0.34, active: 0.09, recover: 0.40, dmg: 18, step: 4.5,
           cancels: [], color: '#c8564a',
           blk: { startup: 'no', active: 'no', recover: 'no' } },
  grab:  { n: 'GRAB',  reach: 8,  startup: 0.18, active: 0.10, recover: 0.30, dmg: 0,  step: 2.4,
           cancels: [], color: '#5fbf7a',
           blk: { startup: 'no', active: 'no', recover: 'no' } },
};
export const STRIKE_IDS = ['jab', 'cross', 'power', 'grab'];
// `step` above is a DISTANCE. The engine's move() wants a velocity impulse, and this is the one
// constant that converts between them — calibrated against the numbers melee.js used to hard-code
// (jab 2.0 x 8 = 16, exactly what was there), so the feel is unchanged and the table is now the
// owner. Change a step here and the lunge changes in the game; there is nowhere else to edit.
export const STEP_IMPULSE = 8;

export const reachOf = (id) => (STRIKES[id] || STRIKES.jab).reach;

// ⚠ POWER'S 0.40s RECOVERY IS THE ENTIRE RISK BUDGET. Bait it, walk it, punish it. If that number
// ever gets "balanced" down, the spacing game stops existing — there is nothing left to punish.
export const RISK_WINDOW = STRIKES.power.recover;

// -------------------------------------------------------------------------------------------------
// THE EIGHT STYLES. Not every fighter gets all three strikes — that is the RPG layer.
// `strikes` is which of the three exist. `chain` is the signature sequence. `grapple` is identity,
// not a damage bonus (the balance rule: a style must be DIFFERENT, never simply stronger).
export const STYLES = {
  boxing: {
    n: 'BOXING', strikes: ['jab', 'cross', 'power'], chain: 'jab-jab-cross', grapple: null,
    d: 'No grappling at all. The best spacing and the best counter in the game.',
    resist: 0.8, punish: 1.25,
  },
  muaythai: {
    n: 'MUAY THAI', strikes: ['jab', 'cross', 'power'], chain: 'cross → clinch', grapple: 'clinch',
    d: 'Clinch knees, no takedowns. The punch IS the entry.',
    resist: 1.0, punish: 1.0, entry: 'cross',
  },
  wrestling: {
    n: 'WRESTLING', strikes: ['jab'], chain: null, grapple: 'takedown',
    d: 'Best grab range, best takedown, best reversal. Cannot strike, closes anyway.',
    resist: 1.4, punish: 0.85, grabBonus: 3,
  },
  judo: {
    n: 'JUDO', strikes: ['jab', 'cross'], chain: 'grab off a successful block', grapple: 'throw',
    d: 'Throws from any position. Never initiates — punishes people who do.',
    resist: 1.25, punish: 1.1, entry: 'block',
  },
  bjj: {
    n: 'BJJ', strikes: ['jab'], chain: null, grapple: 'ground',
    d: 'Weak standing, dominant from the bottom.',
    resist: 1.35, punish: 0.9, bottomBonus: 1.6,
  },
  cqc: {
    n: 'MILITARY CQC', strikes: ['jab', 'power'], chain: 'punch → instant grab', grapple: 'finish',
    d: 'Fast finishes and disarms. No ground game.',
    resist: 1.05, punish: 1.0, entry: 'any', disarm: true,
  },
  acrobatic: {
    n: 'ACROBATIC', strikes: ['jab', 'cross'], chain: 'dodge → cross', grapple: null,
    d: 'No grappling. The best whiff punish in the game.',
    resist: 0.85, punish: 1.5, entry: 'dodge',
  },
  powergrap: {
    n: 'POWER GRAPPLING', strikes: ['power'], chain: null, grapple: 'slam',
    d: 'Shoves and slams. Wins purely on the rank ladder.',
    resist: 1.2, punish: 0.7, rankScaled: true,
  },
};
export const STYLE_IDS = Object.keys(STYLES);
// ⚠ READS THE DERIVED ART (artOf), so grabBonus / resist / punish are live for the WHOLE roster, not
// only the handful with an authored `def.art`. Keeps styleOf and hasStrike from disagreeing about
// what a fighter's style is (a derived wrestler must get the grab range AND the jab-only moveset).
export const styleOf = (def) => STYLES[artOf(def)] || STYLES.boxing;
// ⚠ NOW READS THE DERIVED ART, so a wrestler genuinely cannot throw a cross (aaa-02-ground.md §5.3).
// `art:` is 0 in the roster today; `artOf` gives every fighter a style from its kit, so this gates
// the moveset for the whole roster — the RPG layer the eight STYLES were authored for.
export const hasStrike = (def, id) => {
  const st = STYLES[artOf(def)];
  return st ? st.strikes.includes(id) : true;
};

// -------------------------------------------------------------------------------------------------
// THE CLINCH.
// ⚠ THE VULNERABILITY RULE, and it is the sharpest idea in the spec: grabbing somebody during their
// RECOVERY frames gets you their BACK. Grabbing them neutral gets you the FRONT. Vulnerability does
// not decide whether the grab lands — it decides WHERE YOU LAND. That is the skill expression, and
// it means a whiffed power punch is not just punishable, it is punishable from behind.
export const POSITIONS = {
  front:  { n: 'FRONT CLINCH', from: 'a clean grab',
            wheel: ['KNEE', 'THROW', 'TAKEDOWN', 'BREAK'] },
  back:   { n: 'BACK CLINCH',  from: 'grabbed during their recovery',
            wheel: ['SUPLEX', 'CHOKE', 'SLAM', 'RIDE'] },
  top:    { n: 'GROUND — TOP', from: 'you landed a takedown',
            wheel: ['GROUND STRIKES', 'SUBMISSION', 'PIN', 'STAND'] },
  bottom: { n: 'GROUND — BOTTOM', from: 'you got taken down',
            wheel: ['SWEEP', 'GUILLOTINE', 'KICK OFF', 'GET UP'] },
};

// ⚠ FOUR OPTIONS MAXIMUM, at the compass points, drawn on the ground under the pair — never a
// screen-space menu. It is diegetic, it does not fight the isometric camera, and it never covers
// the fight. AND THE GAME DOES NOT PAUSE: you have a live window while the meter drains.
export const WHEEL_MAX = 4;

// The struggle meter. `escape = (victimRank / attackerRank) × style × condition`.
// ⚠ THE RANK LADDER IS THE STRENGTH CHECK, and it already means something — a rank-40 fighter
// clinching a rank-79 gets under half a second and should mostly not be attempting it.
export const BASE_WINDOW = 1.4;                    // seconds, at even rank

export function clinchWindow(attacker, victim, opts = {}) {
  const ra = Math.max(1, opts.attackerRank || 20), rv = Math.max(1, opts.victimRank || 20);
  const sa = styleOf(attacker && attacker.def), sv = styleOf(victim && victim.def);
  // a wrestler resists; a striker does not
  const style = (sv.resist || 1) / (sa.resist || 1);
  // ⚠ THE MEDICAL LAYER PAYS OFF HERE: wounded, tired or traumatised fighters resist worse.
  const cond = Math.max(0.45, 1 - (opts.wounds || 0) * 0.12 - (opts.tired || 0) * 0.15 - (opts.trauma || 0) * 0.1);
  // ⚠ HIS TWO NUMBERS DO NOT AGREE UNDER A LINEAR RATIO, and the spec states both: "~1.4s at even
  // rank" AND "a rank-40 clinching a rank-79 gets under half a second". Linear gives 1.4/(79/40) =
  // 0.71s, which is not under half. Squaring the rank term satisfies both — 1.4s even, 0.36s at
  // that gap — and it is the better curve anyway: it makes clinching far above your weight a
  // genuinely bad idea rather than merely a worse one.
  const escape = Math.pow(rv / ra, 2) * style * cond;
  return { seconds: +Math.max(0.2, Math.min(4, BASE_WINDOW / Math.max(0.2, escape))).toFixed(2), escape: +escape.toFixed(2) };
}

// -------------------------------------------------------------------------------------------------
// SUBMISSIONS. Two outcomes, and the second one is why the whole system is worth building.
// ⚠ CHOKING SOMEBODY OUT IS HOW YOU TAKE THEM ALIVE. It feeds detention, the holding cells, the
// interrogation room and prisoner rank-rating — all of which already exist and none of which
// currently has a way to receive anybody. The containment tier stops being decoration and becomes
// the reason you brought a grappler.
export const SUBMISSIONS = {
  tap:   { n: 'TAP', d: 'Instant KO, zero damage dealt.', seconds: 1.6, alive: false },
  choke: { n: 'CHOKE OUT', d: 'Slower, and it produces an unconscious body you can carry.',
           seconds: 2.8, alive: true, capture: true },
};

// -------------------------------------------------------------------------------------------------
// BLOCK STATE — the property of the MOVE, read at the melee blocked-check and (via a rider) at the
// takeDamage guard branch. aaa-02-ground.md §4.3. Returns one of: 'no' | 'tight' | 'wide' | 'none'.
// A fighter mid-strike blocks per that strike's `blk[phase]`; a fighter merely holding guard is
// 'wide' (identical to today); anyone else is 'none'. Stagger/stun/grabbed collapse to 'no'.
export function blockStateOf(f) {
  if (!f) return 'none';
  if (!f.alive || f.staggerT > 0 || f.stunT > 0 || f.grabbedBy || f.grabState === 'clinch') return 'no';
  if (f.mstate && f.mId && STRIKES[f.mId] && STRIKES[f.mId].blk) return STRIKES[f.mId].blk[f.mstate] || 'no';
  return f.guarding ? 'wide' : 'none';
}

// DEFENCE BUYS ARC, NOT PROBABILITY (aaa-02-ground.md §4.4). A dot-product THRESHOLD, like JKA's
// blockFactor — lower threshold = wider arc. Barrier is 360° (−1), unchanged. The `res` term is
// DERIVED so the roster produces a distribution: a riot shield (`guardStrong`) and a deflector guard
// widen it, and a baked sheet value wins if a later ranks.js pass adds one (the resistOf law: read
// the sheet the way the engine does). ⚠ ≥3 distinct values across the roster or it is a wire that
// does nothing.
export function guardArcOf(f) {
  const def = (f && f.def) || f || {};
  if (def.guardType === 'barrier') return -1;                       // 360°, unchanged (entity guard branch)
  const st = f && f.def ? blockStateOf(f) : (f && f.guarding ? 'wide' : 'none');
  const base = st === 'tight' ? 0.35 : -0.15;                       // a committed weapon blocks a NARROW arc
  let res = (f && f.sheet && typeof f.sheet.guardArc === 'number') ? f.sheet.guardArc : 0;
  if (!res) {                                                       // derive from the def when no baked value
    if (def.guardStrong) res += 0.25;                              // a riot shield
    if (def.guardType === 'deflect') res += 0.15;                  // a deflector guard covers more
  }
  return base - res;                                                // lower threshold ⇒ wider block cone
}

// -------------------------------------------------------------------------------------------------
// THE GROUND ROLE — a fighter's SPACING TOOL, keyed on ability TYPE, never on id (aaa-02-ground.md
// §5.2). Three of the four ground roles are already universal (jab / haymaker / guard); this maps a
// kit's own slots onto the one that is not: what keeps a foe OUT of the pocket. Same pattern as
// `deriveAI` and `_swingKind` — scan `def.abilities` for a `type` string.
export const GROUND_ROLE = {
  rifle: 'poke', bow: 'poke', quiver: 'poke', projectile: 'poke', volley: 'poke',
  beam: 'pin', nova: 'pin',
  cone: 'zone', dome: 'zone', gravity: 'zone', weather: 'zone',
  melee: 'special', rush: 'special', tentacle: 'special', elastic: 'special',
  charge: 'hold', growingorb: 'hold', facebomb: 'hold',
  teleport: 'slip', phase: 'slip', dash: 'slip', portal: 'slip',
  summon: 'screen', construct: 'screen', duplicate: 'screen',
};
export function groundKitOf(def) {
  const roles = Object.values((def && def.abilities) || {})
    .map(a => a && GROUND_ROLE[a.type]).filter(Boolean);
  const has = r => roles.includes(r);
  return {
    poke: has('poke'), pin: has('pin'), zone: has('zone'), special: has('special'),
    hold: has('hold'), slip: has('slip'), screen: has('screen'),
    closer: roles.length === 0,          // no ranged/zoning tool at all — the ground game IS getting inside
  };
}

// -------------------------------------------------------------------------------------------------
// artOf — make the eight STYLES live with zero data edits (aaa-02-ground.md §5.3).
// ⚠ AUTHORED ALWAYS WINS (`def.art`) — same law as `def.attrs`. The derivation must produce a
// DISTRIBUTION, not a preference: 0 heroes in any style, or > 21 in one, is a red (the ladder law,
// its fifth application). Each rung names its own justification; scanning is on ability TYPE only.
function _slots(def) { return Object.values((def && def.abilities) || {}).filter(Boolean); }
function _hasType(def, ...types) { return _slots(def).some(a => types.includes(a.type)); }
function _hasSlash(def) { return _slots(def).some(a => a.dmgClass === 'slash'); }
function _hasWeaponGun(def) { return _slots(def).some(a => a.type === 'rifle' && a.weapon); }

function deriveArt(def) {
  const str = def.strength ?? 5;
  const tiers = def.meleeTiers ?? 3;
  const ev = (def.evade && def.evade.kind) || null;
  // 1 — grappling BY REACH is the identity: best grab range, closes anyway (KRAKEN, telekinetics)
  if (def.tentacles || _hasType(def, 'tentacle', 'telekinesis')) return 'wrestling';
  // 2 — two-tier melee on a heavyweight is "shoves and slams" verbatim
  if (str >= 9 && tiers === 2) return 'powergrap';
  // 3 — throws ARE the identity
  if (def.grabHeal) return 'judo';
  // 4 — a real firearm + not a bruiser: fast finishes and disarms, no ground game
  if (_hasWeaponGun(def) && str <= 7) return 'cqc';
  // 5 — a teleport/blink slip is the best whiff punish in the game
  if (ev === 'phase' || ev === 'blink') return 'acrobatic';
  // 6 — blades are military CQC (reuses the _swingKind scan)
  if (_hasSlash(def)) return 'cqc';
  // 7 — full three-tier melee on a lighter frame: pure boxing
  if (tiers === 3 && str <= 5) return 'boxing';
  // 8 — a heavier striker: the punch IS the entry
  if (str >= 7) return 'muaythai';
  // 9 — the honest home for a caster who has no business standing and trading
  return 'bjj';
}
export function artOf(def) {
  if (!def) return 'boxing';
  if (def.art && STYLES[def.art]) return def.art;      // ⚠ authored wins
  return deriveArt(def);
}

// -------------------------------------------------------------------------------------------------
// THE SPACING RINGS — the dev overlay that is also an accessibility option.
// Three ground rings at jab / cross / power reach, in the strike colours. The OVERLAP band is the
// pocket, and seeing it teaches spacing faster than any tutorial can.
export const RING_COLORS = { jab: STRIKES.jab.color, cross: STRIKES.cross.color, power: STRIKES.power.color };

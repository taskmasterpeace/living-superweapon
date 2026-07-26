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
export const STRIKES = {
  jab:   { n: 'JAB',   reach: 11, startup: 0.10, active: 0.06, recover: 0.14, dmg: 4,  step: 2.0,
           cancels: ['cross', 'grab', 'dash'], color: '#7fe6ff' },
  cross: { n: 'CROSS', reach: 9,  startup: 0.16, active: 0.07, recover: 0.22, dmg: 8,  step: 3.0,
           cancels: ['grab'], color: '#ffd24a' },
  power: { n: 'POWER', reach: 7,  startup: 0.34, active: 0.09, recover: 0.40, dmg: 18, step: 4.5,
           cancels: [], color: '#c8564a' },
  grab:  { n: 'GRAB',  reach: 8,  startup: 0.18, active: 0.10, recover: 0.30, dmg: 0,  step: 2.4,
           cancels: [], color: '#5fbf7a' },
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
export const styleOf = (def) => STYLES[(def && def.art) || 'street'] || STYLES.boxing;
export const hasStrike = (def, id) => {
  const st = (def && def.art && STYLES[def.art]) || null;
  return st ? st.strikes.includes(id) : true;      // no declared art ⇒ the full street kit
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
// THE SPACING RINGS — the dev overlay that is also an accessibility option.
// Three ground rings at jab / cross / power reach, in the strike colours. The OVERLAP band is the
// pocket, and seeing it teaches spacing faster than any tutorial can.
export const RING_COLORS = { jab: STRIKES.jab.color, cross: STRIKES.cross.color, power: STRIKES.power.color };

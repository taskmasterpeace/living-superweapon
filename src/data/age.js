// AGE — derived from a birth date, never stored as a number.
//
// Robert: "we also need age, at certain ages certain stats are affected… everyone's age goes up the
// same day, does that hurt us, and is everyone having their own birthday — can we do that without
// massive issues?"
//
// ⚠ THE ANSWER IS THAT PER-PERSON BIRTHDAYS ARE THE CHEAPER OPTION, NOT THE EXPENSIVE ONE, and the
// reason is worth writing down because it is the whole design:
//
//   DO NOT STORE AN AGE. STORE A BIRTH DATE AND DERIVE.
//
// The game already has a real calendar — `gameDate()` in orbits.js, moved by `advanceDays`, which
// the career's week turns and the hospital stays already drive. With age derived from that, there
// is NO AGING EVENT AT ALL: nobody is "aged", the date moves and the derived number changes. The
// every-January-1st model is the one that costs code, because it needs a batch pass that walks
// every character and increments a stored field, plus a migration whenever someone is added
// mid-campaign, plus a bug the first time two systems disagree about whether the pass has run.
//
// It is also the worse GAME. On a shared birthday every age-band risk roll in the roster lands in
// the same week — one catastrophic day a year and fifty-one quiet ones. Spread the birthdays and
// the pressure is continuous, which is what makes a season feel alive rather than lumpy.
//
// The ONE thing per-person birthdays genuinely cost is detecting a CROSSING, because a birthday is
// the moment an effect changes rather than a stored flag. That is `ageOn(before) !== ageOn(after)`
// either side of a week turn: one integer compare per character, once a week. For 52 heroes and a
// staff roster it is not measurable.

import { gameDate, jdOf, dateOf } from './orbits.js';

// -------------------------------------------------------------------------------------------------
// THE BANDS, transcribed from Robert's Personality/Emotions/Age sheet (16 groups). `mgt`/`agl`/`int`
// are COLUMN SHIFTS on the rank ladder in scale.js — the game already has one idea of "a step up or
// down a scale", so age uses it rather than inventing a second. `risk` is the per-year chance a
// condition presents; sourced from his own references (SEER age-standardised populations for the
// disease rows, the peak-age research for the buffs).
export const AGE_BANDS = [
  { lo: 0,  hi: 4,   label: 'INFANT',       mgt: -6, agl: -3, int: -6, risk: {} },
  { lo: 5,  hi: 9,   label: 'CHILD',        mgt: -5, agl: -2, int: -4, risk: {} },
  { lo: 10, hi: 14,  label: 'ADOLESCENT',   mgt: -3, agl: -1, int: -3, risk: {} },
  { lo: 15, hi: 17,  label: 'MINOR',        mgt: -1, agl:  0, int: -2, risk: {} },
  { lo: 18, hi: 29,  label: 'PRIME',        mgt: +1, agl: +1, int:  0, risk: {}, note: 'PHYSICAL PEAK' },
  { lo: 30, hi: 34,  label: 'SEASONED',     mgt:  0, agl:  0, int: +1, risk: {}, note: 'INSTINCT' },
  { lo: 35, hi: 39,  label: 'SEASONED',     mgt:  0, agl: -1, int: +1, risk: {}, note: 'INSTINCT' },
  { lo: 40, hi: 44,  label: 'VETERAN',      mgt:  0, agl: -1, int: +1, risk: { arthritis: 0.020 } },
  { lo: 45, hi: 49,  label: 'VETERAN',      mgt: -1, agl: -2, int: +2, risk: { arthritis: 0.032 }, retire: 0.04, note: 'INTELLECT PEAK' },
  { lo: 50, hi: 54,  label: 'LATE CAREER',  mgt: -2, agl: -2, int: +2, risk: { arthritis: 0.046 }, retire: 0.09, note: 'INTELLECT PEAK · STRENGTH LOSS' },
  { lo: 55, hi: 59,  label: 'LATE CAREER',  mgt: -3, agl: -3, int: +2, risk: { arthritis: 0.060, als: 0.0009 }, retire: 0.16, note: 'INTELLECT PEAK' },
  { lo: 60, hi: 64,  label: 'ELDER',        mgt: -4, agl: -4, int: +1, risk: { arthritis: 0.072, als: 0.0013, cancer: 0.011 }, retire: 0.26 },
  { lo: 65, hi: 69,  label: 'ELDER',        mgt: -5, agl: -5, int: +1, risk: { arthritis: 0.082, als: 0.0016, cancer: 0.017 }, retire: 0.38 },
  { lo: 70, hi: 74,  label: 'ELDER',        mgt: -6, agl: -6, int:  0, risk: { arthritis: 0.090, als: 0.0016, cancer: 0.022, alzheimers: 0.013 }, retire: 0.52 },
  { lo: 75, hi: 84,  label: 'TWILIGHT',     mgt: -8, agl: -8, int: -1, risk: { arthritis: 0.098, als: 0.0014, cancer: 0.026, alzheimers: 0.032 }, retire: 0.70 },
  { lo: 85, hi: 200, label: 'TWILIGHT',     mgt: -10, agl: -10, int: -2, risk: { arthritis: 0.105, als: 0.0010, cancer: 0.028, alzheimers: 0.084 }, retire: 0.88 },
];

export const CONDITIONS = {
  arthritis:  { name: 'ARTHRITIS',    d: 'joints under load — melee and evade cost more' },
  als:        { name: 'MOTOR NEURONE DISEASE', d: 'progressive; ends a fighting career' },
  cancer:     { name: 'CANCER',       d: 'treatable with a medical wing and time' },
  alzheimers: { name: 'ALZHEIMER’S', d: 'the fight analyst forgets the fight' },
};

export const bandOfAge = (age) => {
  const a = Math.max(0, Math.min(200, Math.round(age || 0)));
  for (const b of AGE_BANDS) if (a <= b.hi) return b;
  return AGE_BANDS[AGE_BANDS.length - 1];
};

// -------------------------------------------------------------------------------------------------
// THE BIRTH DATE. Deterministic from the id, so it needs no storage and never disagrees with itself
// across a reload — the same trick `fileDate` uses for the registry. `def.born` (a {y,m,d}) or
// `def.age` (a starting age, in whole years at the epoch) always win, so a hero can be authored.
//
// ⚠ THE DAY IS SPREAD ACROSS THE WHOLE YEAR ON PURPOSE. That spread IS the feature — see the header.
const hash = (s) => { let h = 2166136261 >>> 0; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };

// a plausible starting age for a working superweapon, without authoring 52 of them
const DEFAULT_MIN = 21, DEFAULT_SPAN = 22;   // 21–42 at the epoch

export function birthOf(def) {
  if (def && def.born && def.born.y) return { ...def.born };
  const h = hash((def && def.id) || 'unknown');
  const startAge = (def && def.age) != null ? def.age : DEFAULT_MIN + (h % DEFAULT_SPAN);
  const EP = 2026;                                   // the calendar epoch year (ALIGN_DATE)
  const month = 1 + ((h >>> 8) % 12);
  const day = 1 + ((h >>> 16) % 28);                 // 28 keeps every month legal, no leap-day case
  return { y: EP - Math.round(startAge), m: month, d: day };
}

const jdOfDate = (d) => jdOf(d.y, d.m, d.d);

// AGE IS A FUNCTION OF A DATE. Nothing stores it; nothing has to update it.
export function ageOf(def, date) {
  const b = birthOf(def), now = date || gameDate();
  let a = now.y - b.y;
  if (now.m < b.m || (now.m === b.m && now.d < b.d)) a--;   // birthday not yet reached this year
  return Math.max(0, a);
}

// Days until the next birthday — for the desk, and for "who is about to turn 40".
export function daysToBirthday(def, date) {
  const b = birthOf(def), now = date || gameDate();
  const here = jdOfDate(now);
  let next = jdOf(now.y, b.m, b.d);
  if (next < here) next = jdOf(now.y + 1, b.m, b.d);
  return next - here;
}

// ⚠ THE ONLY THING PER-PERSON BIRTHDAYS ACTUALLY COST: detecting the crossing. One integer compare
// per person per turn. Call it either side of `advanceDays` and it tells you who had a birthday and
// — the part that matters — who changed AGE BAND, because that is when effects actually move.
export function birthdayCrossings(defs, fromDate, toDate) {
  const out = [];
  for (const d of defs || []) {
    const a0 = ageOf(d, fromDate), a1 = ageOf(d, toDate);
    if (a1 === a0) continue;
    const b0 = bandOfAge(a0), b1 = bandOfAge(a1);
    out.push({ def: d, from: a0, to: a1, band: b1, bandChanged: b0 !== b1 });
  }
  return out;
}

// -------------------------------------------------------------------------------------------------
// WHAT AGE DOES. Column shifts on the ladder, never a bespoke second multiplier — so an aging
// fighter moves along the SAME scale everything else in the game is measured on.
// ⚠ A SYNTHETIC DOES NOT AGE. A machine chassis, an energy body or a construct has no biology to
// decline, and quietly applying an arthritis roll to TITAN would be the kind of thing that reads as
// a bug rather than a rule. `def.ageless` forces it either way.
export function ages(def) {
  if (!def) return false;
  if (def.ageless !== undefined) return !def.ageless;
  return !(def.metal || def.body === 'energy' || def.origin === 'robotic' || def.origin === 'alien');
}

export function ageMods(def, date) {
  if (!ages(def)) return { age: null, band: null, mgt: 0, agl: 0, int: 0, ageless: true };
  const age = ageOf(def, date), b = bandOfAge(age);
  return { age, band: b, mgt: b.mgt, agl: b.agl, int: b.int, note: b.note || '', ageless: false };
}

// One line a surface can print. PRIME reads as a state, not as a number, on the LeFevre pattern.
export function ageLine(def, date) {
  const m = ageMods(def, date);
  if (m.ageless) return 'DOES NOT AGE';
  return `${m.age} · ${m.band.label}${m.note ? ' · ' + m.note : ''}`;
}

// The per-year risk a condition presents, scaled to a span of days — used by the career's week turn.
// Returns rolls, not results: the caller decides what a diagnosis means in its own layer.
export function riskOver(def, days, rng = Math.random) {
  if (!ages(def)) return [];
  const b = bandOfAge(ageOf(def));
  const out = [];
  for (const k in b.risk) {
    const perYear = b.risk[k];
    const p = 1 - Math.pow(1 - perYear, Math.max(0, days) / 365);
    if (rng() < p) out.push({ kind: k, ...CONDITIONS[k] });
  }
  return out;
}

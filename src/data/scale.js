// THE RANK LADDER — one scale, from a child to a supreme being.
//
// Robert: "I think 1-10 on strength isn't good enough… think about all the heroes… should we scale
// everything to 1-100, with various levels? We need our designation."
//
// HE IS RIGHT, AND THE REASON IS COUNTABLE. On a 1–10 scale everything from "low superhuman" to
// "cosmic" has to fit in the two rungs between 9 and 10, so RAGE, TITAN, NOVA and MAJESTY all round
// to the same number and the roster's whole top half becomes one value. His ladder runs to 4999 and
// still spends its first nine rungs inside the ordinary human range — which is exactly where a
// superhero roster needs resolution, because the difference between a trained soldier and a peak
// human is a real difference and on a 1–10 scale it is invisible.
//
// ⚠ THERE ARE TWO LADDERS HERE, NOT ONE, AND THEY DO NOT SHARE BAND EDGES. His DESIGNATION table
// splits the superhuman range into four (50-59, 60-69, 70-79, 80-99) and lumps the human range into
// one (1-9). His WEIGHT table does the opposite — it splits the human range into three (1-2, 3-5,
// 6-9) and lumps 50-74 and 75-99. Forcing them into a single row set would silently move numbers he
// wrote down. They are kept as two tables over ONE rank axis, and each query reads its own.
//
// ⚠ A BAND'S WEIGHT IS THE FIGURE AT ITS TOP RANK, NOT ITS BOTTOM. This is the one thing that is
// easy to get backwards and it is settled by his own finer STRENGTH AND WEIGHT sheet: rank 19 lifts
// 400 lb and the band labelled 10-19 says 400 lb; rank 39 lifts 2,200 lb and the band labelled
// 30-39 says "1 ton"; rank 49 lifts 22,400 and 40-49 says "10 tons". Every row lines up on its LAST
// rank. Read from the bottom instead and every character in the game lifts several times too much.
//
// ⚠ `def.strength` 1–10 STAYS. Fifty-two heroes, every ORIGIN custom and the whole creator are
// authored in it, and breaking that to gain resolution would be a bad trade. The 1–10 is the
// AUTHORING shorthand; the rank is the real number, derived from it unless a def states its own
// `def.rank`. That is the escape hatch for the cosmic end, where 10 stops being expressive.

export const LB_PER_TON = 2204.62;
const T = LB_PER_TON;

// -------------------------------------------------------------------------------------------------
// LADDER ONE — DESIGNATION. `hi` inclusive. `cs` is the column shift the compendium applies.
export const BANDS = [
  { lo: 1,    hi: 9,    cs: 0,   name: 'Little Human',       short: 'LITTLE',      threat: null },
  { lo: 10,   hi: 19,   cs: -2,  name: 'Above Avg Human',    short: 'ABOVE AVG',   threat: null },
  { lo: 20,   hi: 29,   cs: -3,  name: 'Exceptional Human',  short: 'EXCEPTIONAL', threat: null },
  { lo: 30,   hi: 39,   cs: -4,  name: 'Max Human Limit',    short: 'PEAK HUMAN',  threat: 'THREAT LEVEL ALPHA' },
  { lo: 40,   hi: 49,   cs: -5,  name: 'Low Superhuman',     short: 'LOW SUPER',   threat: 'THREAT LEVEL 1' },
  { lo: 50,   hi: 59,   cs: -6,  name: 'Superhuman',         short: 'SUPERHUMAN',  threat: 'THREAT LEVEL 2' },
  { lo: 60,   hi: 69,   cs: -7,  name: 'Superhuman',         short: 'SUPERHUMAN',  threat: 'THREAT LEVEL 3' },
  { lo: 70,   hi: 79,   cs: -8,  name: 'Superhuman',         short: 'SUPERHUMAN',  threat: 'THREAT LEVEL 4' },
  { lo: 80,   hi: 99,   cs: -9,  name: 'High Superhuman',    short: 'HIGH SUPER',  threat: 'THREAT LEVEL 5' },
  { lo: 100,  hi: 149,  cs: -10, name: 'Low Cosmic',         short: 'LOW COSMIC',  threat: 'EARTHSHAKER' },
  { lo: 150,  hi: 249,  cs: -11, name: 'Cosmic',             short: 'COSMIC',      threat: 'EARTHBREAKER' },
  { lo: 250,  hi: 499,  cs: -12, name: 'High Cosmic',        short: 'HIGH COSMIC', threat: 'EARTHEATER' },
  { lo: 500,  hi: 999,  cs: -13, name: 'Supreme Cosmic',     short: 'SUPREME',     threat: 'SUNBREAKER' },
  { lo: 1000, hi: 2499, cs: -14, name: 'Deity',              short: 'DEITY',       threat: 'SUNEATER' },
  { lo: 2500, hi: 4999, cs: -14, name: 'Supreme Being',      short: 'SUPREME BEING', threat: 'OMNIPOTENT' },
];

// LADDER TWO — WEIGHT + COMPARISON. `lift` is what the band's TOP rank picks up.
export const WEIGHTS = [
  { lo: 1,    hi: 2,    lift: 50,      cmp: 'Minimum human' },
  { lo: 3,    hi: 5,    lift: 100,     cmp: 'Below-Average human' },
  { lo: 6,    hi: 9,    lift: 200,     cmp: 'Average human' },
  { lo: 10,   hi: 19,   lift: 400,     cmp: 'Above-Average human' },
  { lo: 20,   hi: 29,   lift: 800,     cmp: 'Exceptional human' },
  { lo: 30,   hi: 39,   lift: 1 * T,   cmp: 'Maximum Human Limit' },
  { lo: 40,   hi: 49,   lift: 10 * T,  cmp: 'Low superhuman' },
  { lo: 50,   hi: 74,   lift: 50 * T,  cmp: 'Superhuman' },
  { lo: 75,   hi: 99,   lift: 80 * T,  cmp: 'High superhuman' },
  { lo: 100,  hi: 149,  lift: 100 * T, cmp: 'Low Cosmic' },
  // ⚠ THE TOP THREE ROWS CONTINUE THE CURVE PAST THE SOURCE SHEET — Robert's ruling 2026-07-25:
  // "we good on the game not caring about the original doc, just the game." His weight column
  // stops at 400 tons while his designations run to OMNIPOTENT, so taken literally a SUNBREAKER
  // lifted only ~1.8× an EARTHSHAKER and the four cosmic bands were nearly indistinguishable —
  // four names for one number. Everything at or below rank 149 is still HIS figure, untouched and
  // verified to the pound; only the empty top continues, at the ×2-per-band cadence his own rows
  // already set. The names now mean something: an Eartheater lifts a hundred times an Earthshaker.
  { lo: 150,  hi: 249,  lift: 200 * T,     cmp: 'Cosmic' },
  { lo: 250,  hi: 499,  lift: 2200 * T,    cmp: 'High Cosmic' },
  { lo: 500,  hi: 999,  lift: 26000 * T,   cmp: 'Supreme Cosmic' },
  { lo: 1000, hi: 2499, lift: 340000 * T,  cmp: 'Deity' },
  { lo: 2500, hi: 4999, lift: 4600000 * T, cmp: 'Beyond Comprehension' },
];

export const MAX_RANK = 4999;
const clampRank = (r) => Math.max(1, Math.min(MAX_RANK, r || 1));

const rowAt = (rows, rank) => {
  const r = clampRank(rank);
  for (const b of rows) if (r <= b.hi) return b;
  return rows[rows.length - 1];
};

// ⚠ `rankBandOf` is the name to import. core/util.js exports its own `bandOf` for ALTITUDE
// bands, and a file that wants both gets a duplicate-declaration SyntaxError at parse time —
// which takes the whole page down, not just the feature.
export const bandOf       = (rank) => rowAt(BANDS, rank);
export const rankBandOf   = bandOf;
export const designationOf = (rank) => bandOf(rank).name;
export const threatOfRank  = (rank) => bandOf(rank).threat;
export const csOf          = (rank) => bandOf(rank).cs;
export const comparisonOf  = (rank) => rowAt(WEIGHTS, rank).cmp;

// ⚠ GEOMETRIC WITHIN A BAND, not flat. Flat means rank 40 and rank 49 lift exactly the same and
// nine rungs of the ladder mean nothing — which is the very problem this file exists to fix. The
// blend is geometric because the ladder is multiplicative (50 → 100 → 200 → 400 → 800 doubles), and
// it runs from the PREVIOUS band's top figure to this one's, because the figure sits at the top.
export function liftLbOfRank(rank) {
  const r = clampRank(rank);
  let i = 0;
  while (i < WEIGHTS.length - 1 && r > WEIGHTS[i].hi) i++;
  const cur = WEIGHTS[i];
  if (r >= cur.hi) return cur.lift;                     // at or past the anchor
  const prev = WEIGHTS[i - 1];
  if (!prev) return cur.lift * Math.pow(r / cur.hi, 1); // the first rung, below rank 2
  const f = (r - prev.hi) / (cur.hi - prev.hi);
  return prev.lift * Math.pow(cur.lift / prev.lift, Math.max(0, Math.min(1, f)));
}
export const liftTonsOfRank = (rank) => liftLbOfRank(rank) / T;

// the rank a given mass demands — so any weight in the game states its own entry requirement in the
// same units a fighter is rated in, rather than someone asserting a number
export function rankForLb(lb) {
  let lo = 1, hi = MAX_RANK;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (liftLbOfRank(m) < lb) lo = m; else hi = m; }
  return Math.round(hi);
}
export const rankForTons = (t) => rankForLb(t * T);

// -------------------------------------------------------------------------------------------------
// THE BRIDGE. `def.strength` 1–10 is the authoring shorthand; this is where it becomes a rank.
// ⚠ The anchors are chosen against the ROSTER, not spread evenly: our 5 is an ordinary fit person,
// our 6 is the first rung that is not a person at all, and our 10 is Hulk-tier. Spreading 1–10
// evenly across 1–1000 would put half the cast in the cosmic bands, which is the opposite of the
// problem being solved. Calibrated so the props already in the game land where they should —
// a lamp needs an exceptional human, a car needs a low superhuman, an airliner needs a superhuman.
export const STR_TO_RANK = [0, 2, 6, 12, 18, 25, 33, 45, 60, 78, 110];

export function rankOf(def) {
  if (!def) return 9;
  if (def.rank) return clampRank(def.rank);            // the escape hatch, for the cosmic end
  const s = Math.max(0, Math.min(10, def.strength ?? 5));
  const i = Math.floor(s), f = s - i;
  const a = STR_TO_RANK[i] ?? 9, b = STR_TO_RANK[Math.min(10, i + 1)] ?? a;
  return Math.max(1, Math.round(a + (b - a) * f));
}
// the inverse, for everything still speaking 1–10
export function strengthFromRank(rank) {
  const r = Math.max(1, rank || 1);
  for (let i = 1; i <= 10; i++) if (STR_TO_RANK[i] >= r) {
    const a = STR_TO_RANK[i - 1] || 1, b = STR_TO_RANK[i];
    return +(i - 1 + (r - a) / Math.max(1, b - a)).toFixed(2);
  }
  return +(10 + Math.log10(r / STR_TO_RANK[10]) * 3).toFixed(2);   // past our 10, keep counting
}

// -------------------------------------------------------------------------------------------------
// THE KNOCKBACK CHART is the SAME RANK AXIS — his melee chart uses the designation table's band
// edges exactly, so it lives here rather than in a second table that can drift out of step.
// A "space" is 5 feet ≈ 8 world units at our 1u ≈ 0.19m.
export const UNITS_PER_SPACE = 8;
export function knockbackOf(rank) {
  const r = clampRank(rank);
  let i = 0;
  while (i < BANDS.length - 1 && r > BANDS[i].hi) i++;
  const spaces = [0, 1, 2, 3, 4, 6, 8, 10, 12, 14, 18, 22, 26, 32, 40][i];
  return { spaces, units: spaces * UNITS_PER_SPACE, throughWall: r >= 40 };
}

// one line a surface can print without deriving anything itself
// tonnage in words, because past the cosmic line the raw figure is unreadable
export function liftWords(rank) {
  const t = liftTonsOfRank(rank);
  if (t < 1) return Math.round(t * T) + ' lb';
  if (t < 1e3) return (t < 10 ? t.toFixed(1) : Math.round(t)) + ' t';
  if (t < 1e6) return +(t / 1e3).toFixed(t < 1e4 ? 1 : 0) + 'K t';
  if (t < 1e9) return +(t / 1e6).toFixed(t < 1e7 ? 1 : 0) + 'M t';
  return +(t / 1e9).toFixed(1) + 'B t';
}
export function rankLine(rank) {
  const b = bandOf(rank);
  return `RANK ${Math.round(rank)} · ${b.name.toUpperCase()} · LIFTS ${liftWords(rank)}${b.threat ? ' · ' + b.threat : ''}`;
}

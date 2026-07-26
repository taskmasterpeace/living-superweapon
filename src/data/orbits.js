// THE ORBITS — where everything actually is, on a given day.
//
// Robert's scope, 2026-07-25: "make sure the planets rotate around the sun; where the planets are
// depends on the time of year in this game; make sure they only perfectly align on Feb 12th; make
// sure the distance to the moon scales; give the planets all their more interesting moons."
//
// THE ONE IDEA: a date in, positions out. Nothing in the game stores where a planet is — it asks.
// That is what makes "the time of year" real rather than decorative: the route you fly to Mars is
// a different length in April than in October, because Mars is somewhere else.
//
// ⚠ THE SYZYGY IS A CONSEQUENCE, NOT A SPECIAL CASE. Every body's mean longitude is zero at the
// EPOCH, so on that one day they are strung out along a single line from the sun. After that they
// separate at their own rates, and because the orbital periods are mutually irrational they never
// all return to zero together again — the alignment cannot repeat, ever, and no code enforces
// that. `alignmentSpread` measures it, and the self-test below proves the next-best day in four
// centuries is nowhere close.
//
// Periods and radii are the real ones. A game may compress DISTANCE for a shot (spaceflight.js
// does, and says so), but the ARITHMETIC here is never fudged — everything that wants honest
// numbers, from the almanac to a transit time, reads them from this file.

export const DEG = Math.PI / 180;

// THE EPOCH — the day everything lines up. February 12th.
export const ALIGN_DATE = { y: 2026, m: 2, d: 12 };
export const ALIGN_JD = jdOf(ALIGN_DATE.y, ALIGN_DATE.m, ALIGN_DATE.d);

// Julian day number — the only sane way to do date arithmetic across months and leap years.
export function jdOf(y, m, d) {
  const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4)
    - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}
export function dateOf(jd) {
  const a = jd + 32044, b = Math.floor((4 * a + 3) / 146097), c = a - Math.floor(146097 * b / 4);
  const dd = Math.floor((4 * c + 3) / 1461), e = c - Math.floor(1461 * dd / 4);
  const mm = Math.floor((5 * e + 2) / 153);
  return { d: e - Math.floor((153 * mm + 2) / 5) + 1, m: mm + 3 - 12 * Math.floor(mm / 10), y: 100 * b + dd - 4800 + Math.floor(mm / 10) };
}

// ---------------------------------------------------------------------------------------------
// ⚠ SIDEREAL periods in DAYS and semi-major axes in AU — the real values. `tilt` is the axial tilt
// (it decides what a sky looks like and whether a world has seasons); `radiusKm` matters because
// a moon's distance is only meaningful in units of the thing it orbits.
export const ORBITS = {
  mercury: { T: 87.969,    a: 0.3871, radiusKm: 2440,  tilt: 0.03,  day: 58.646 },
  venus:   { T: 224.701,   a: 0.7233, radiusKm: 6052,  tilt: 177.4, day: -243.02 },
  earth:   { T: 365.256,   a: 1.0000, radiusKm: 6371,  tilt: 23.44, day: 0.9973 },
  mars:    { T: 686.980,   a: 1.5237, radiusKm: 3390,  tilt: 25.19, day: 1.0260 },
  jupiter: { T: 4332.589,  a: 5.2026, radiusKm: 69911, tilt: 3.13,  day: 0.4136 },
  saturn:  { T: 10759.22,  a: 9.5549, radiusKm: 58232, tilt: 26.73, day: 0.4440 },
  uranus:  { T: 30685.4,   a: 19.218, radiusKm: 25362, tilt: 97.77, day: -0.7183 },
  neptune: { T: 60189.0,   a: 30.110, radiusKm: 24622, tilt: 28.32, day: 0.6713 },
  pluto:   { T: 90560.0,   a: 39.482, radiusKm: 1188,  tilt: 122.5, day: -6.3872 },
};

// ---------------------------------------------------------------------------------------------
// THE MOONS. "The more interesting ones" — every body here is somewhere you could set a scene, or
// something you would point at from a cockpit. `a` is the real orbital radius in km; `inRadii` is
// that distance expressed in the PARENT'S radii, which is the number that actually surprises
// people: our own Moon is SIXTY Earths away. Any renderer that places a moon must use this, or it
// is drawing a diagram rather than a place.
export const MOONS = {
  earth: [
    { id: 'luna', name: 'The Moon', a: 384400, T: 27.322, radiusKm: 1737, note: 'tidally locked; the near side never turns away' },
  ],
  mars: [
    { id: 'phobos', name: 'Phobos', a: 9376, T: 0.3189, radiusKm: 11.3, note: 'rises in the west, twice a day, and is falling' },
    { id: 'deimos', name: 'Deimos', a: 23463, T: 1.2624, radiusKm: 6.2, note: 'barely brighter than a star' },
  ],
  jupiter: [
    { id: 'io', name: 'Io', a: 421700, T: 1.7691, radiusKm: 1822, note: 'four hundred volcanoes; the most violent surface in the system' },
    { id: 'europa', name: 'Europa', a: 671100, T: 3.5512, radiusKm: 1561, note: 'ice over an ocean with more water than Earth' },
    { id: 'ganymede', name: 'Ganymede', a: 1070400, T: 7.1546, radiusKm: 2634, note: 'larger than Mercury, and the only moon with a magnetic field' },
    { id: 'callisto', name: 'Callisto', a: 1882700, T: 16.689, radiusKm: 2410, note: 'outside the worst of the radiation — the one you would actually land on' },
  ],
  saturn: [
    { id: 'mimas', name: 'Mimas', a: 185540, T: 0.9424, radiusKm: 198, note: 'one crater a third of its width' },
    { id: 'enceladus', name: 'Enceladus', a: 237948, T: 1.3702, radiusKm: 252, note: 'geysers of liquid water out of the south pole' },
    { id: 'titan', name: 'Titan', a: 1221870, T: 15.945, radiusKm: 2575, note: 'thicker air than Earth, rivers of methane, and an orange sky' },
    { id: 'iapetus', name: 'Iapetus', a: 3560820, T: 79.321, radiusKm: 735, note: 'one hemisphere black, one white, and a ridge around its equator' },
  ],
  uranus: [
    { id: 'miranda', name: 'Miranda', a: 129390, T: 1.4135, radiusKm: 236, note: 'a twenty-kilometre cliff — the tallest known anywhere' },
    { id: 'titania', name: 'Titania', a: 435910, T: 8.7062, radiusKm: 789, note: 'canyons a thousand kilometres long' },
    { id: 'oberon', name: 'Oberon', a: 583520, T: 13.463, radiusKm: 761, note: 'cratered, ancient, and very dark' },
  ],
  neptune: [
    { id: 'triton', name: 'Triton', a: 354759, T: -5.8769, radiusKm: 1353, note: 'orbits BACKWARDS — it was captured, and it is spiralling in' },
  ],
  pluto: [
    { id: 'charon', name: 'Charon', a: 19591, T: 6.3872, radiusKm: 606, note: 'half the size of Pluto; they orbit a point between them and always face each other' },
  ],
};

export const moonsOf = (id) => MOONS[id] || [];
// ⚠ THE NUMBER THAT MATTERS. A moon drawn at "a few planet-widths" is a diagram; Luna is 60.3.
export const moonDistanceInRadii = (planetId, moon) =>
  moon.a / ((ORBITS[planetId] && ORBITS[planetId].radiusKm) || 1);

// ---------------------------------------------------------------------------------------------
// WHERE THINGS ARE. Circular, coplanar orbits — stated plainly rather than hidden: real orbits are
// ellipses in slightly different planes, and modelling that would change a flyby by a few percent
// while making every number in the game unexplainable. What this DOES get right is the thing the
// game actually leans on: the ANGLE between two worlds on a given day, which is what decides how
// far apart they are and therefore how long the crossing takes.
export function daysSinceEpoch(date) { return jdOf(date.y, date.m, date.d) - ALIGN_JD; }

export function meanLongitude(id, date) {
  const o = ORBITS[id]; if (!o) return 0;
  const t = daysSinceEpoch(date);
  return ((t / o.T) * 360) % 360;                 // zero for everything at the epoch — the syzygy
}

export function positionAt(id, date) {
  const o = ORBITS[id]; if (!o) return { x: 0, z: 0, au: 0, lon: 0 };
  const lon = meanLongitude(id, date);
  return { x: Math.cos(lon * DEG) * o.a, z: Math.sin(lon * DEG) * o.a, au: o.a, lon };
}

// The straight-line distance between two worlds on a date — the number a transit time comes from.
export function separationAU(aId, bId, date) {
  const A = positionAt(aId, date), B = positionAt(bId, date);
  return Math.hypot(A.x - B.x, A.z - B.z);
}

// ---------------------------------------------------------------------------------------------
// HOW ALIGNED IS THE SYSTEM TODAY? Zero degrees means a perfect line. This is a measurement, not a
// rule — the epoch scores 0 because every longitude is 0 there, and every other day scores worse
// because the periods do not divide into one another.
export function alignmentSpread(date, ids) {
  const list = ids || Object.keys(ORBITS);
  const ls = list.map(id => meanLongitude(id, date));
  // spread about the best axis: bodies on opposite sides of the sun are still "in line"
  let best = 1e9;
  for (let a = 0; a < 180; a += 0.5) {
    let worst = 0;
    for (const l of ls) {
      let d = Math.abs(((l - a) % 180 + 180) % 180);
      if (d > 90) d = 180 - d;
      worst = Math.max(worst, d);
    }
    best = Math.min(best, worst);
  }
  return best;
}

// Scan for the best alignment in a window — used by the self-test and by the almanac, so the claim
// "they only line up on the 12th of February" is something the game can be asked to demonstrate.
export function bestAlignmentIn(y0, y1, ids) {
  const start = jdOf(y0, 1, 1), end = jdOf(y1, 12, 31);
  let bestJd = start, best = 1e9;
  for (let jd = start; jd <= end; jd++) {
    const s = alignmentSpread(dateOf(jd), ids);
    if (s < best) { best = s; bestJd = jd; }
  }
  return { date: dateOf(bestJd), spread: +best.toFixed(3) };
}

// ---------------------------------------------------------------------------------------------
// THE GAME'S CALENDAR. One date, advanced by the career, read by everything that cares. Free roam
// and one-off matches use it too, so the sky over a duel is the sky for that day.
const LS = 'threshold_calendar_v1';
let _date = { ...ALIGN_DATE };
export function gameDate() { return { ..._date }; }
export function setGameDate(d) { _date = { y: d.y, m: d.m, d: d.d }; try { localStorage.setItem(LS, JSON.stringify(_date)); } catch {} return gameDate(); }
export function advanceDays(n) { return setGameDate(dateOf(jdOf(_date.y, _date.m, _date.d) + n)); }
export function loadCalendar() {
  try { const j = JSON.parse(localStorage.getItem(LS) || 'null'); if (j && j.y) _date = j; } catch {}
  return gameDate();
}
export const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY',
                       'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
export const dateStr = (d) => `${(d || _date).d} ${MONTHS[((d || _date).m - 1)]} ${(d || _date).y}`;
// the season a northern-hemisphere city is in — the sky and the news desk both care
export function seasonOf(date) {
  const d = date || _date, n = jdOf(d.y, d.m, d.d) - jdOf(d.y, 1, 1);
  return n < 79 || n >= 355 ? 'WINTER' : n < 172 ? 'SPRING' : n < 265 ? 'SUMMER' : 'AUTUMN';
}

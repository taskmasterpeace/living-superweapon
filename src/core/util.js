// WAR WORLD: ASCENDANTS — math + helpers
export const TAU = Math.PI * 2;
export const PI = Math.PI;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
// frame-rate independent smoothing
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

export const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];
export const chance = (p) => Math.random() < p;
export const sign = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);

export const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
export const len = (x, y) => Math.hypot(x, y);

export const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
export const angleDiff = (a, b) => { let d = (b - a) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };
export const fromAngle = (a, m = 1) => ({ x: Math.cos(a) * m, y: Math.sin(a) * m });

export const approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));
export const smoothstep = (t) => t * t * (3 - 2 * t);
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t) => t * t * t;
export const easeOutBack = (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

let _id = 1;
export const uid = () => _id++;

// hex helpers for glow tinting
export function withAlpha(hex, a) {
  // supports #rgb / #rrggbb
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
export function mix(hex1, hex2, t) {
  const p = (h) => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]; };
  const a = p(hex1), b = p(hex2);
  const c = a.map((v, i) => Math.round(lerp(v, b[i], t)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

// ---- THE LAYER CONTRACT's runtime face -------------------------------------------------------
// Per-city altitude thresholds. world.rebuildCity pushes the plan's derived bands here, so a city
// with a 250u landmark spire has a taller BUILDING band and SKY stays a clean lane above the
// tallest roof. Lives in util (not entity) because entity imports world and world must set this.
const BAND_DEFAULTS = { ground: 8, building: 150, sky: 260, ceiling: 320, shallows: -10, depths: -26 };   // ONE copy (the reset used to repeat it verbatim)
export const BANDS = { ...BAND_DEFAULTS };
export function setBands(b) {
  Object.assign(BANDS, BAND_DEFAULTS, b || {});
}
export const bandOf = (y) => y < BANDS.ground ? 0 : y < BANDS.building ? 1 : y < BANDS.sky ? 2 : 3;

// seeded PRNG (mulberry32) — moved from data/news.js: the city planner and the world both
// need it, and a planner importing from the news desk was a dependency inversion (review find).
export function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---------------------------------------------------------------------------------------------
// THE SURFACE-SEPARATION LAW — why things flicker, and the one number that stops it.
//
// A GPU decides what is in front using a DEPTH BUFFER of finite precision, and that precision
// gets coarser the further a surface is from the camera. When two surfaces are closer together
// than the precision available at that distance, the hardware genuinely cannot tell which wins:
// it picks differently per pixel and per frame, and you see a torn, crawling edge. That is
// z-fighting, and at match-camera range (200+ units out) it is NOT a rare edge case.
//
// ⚠ THE TRAP IS THE SCALE, NOT THE MATHS. Offsets like 0.05 / 0.06 / 0.09 were written when the
// world was much larger relative to a hero. At TRUE 1:1 (1u ≈ 0.19m) those are ONE, THREE and
// SIX CENTIMETRES — and the training hall stacked exactly those three on the floor, which is why
// every fighter's contact shadow came out with a ragged, boiling edge.
//
// THE RULE, in order of preference:
//   1. DON'T STACK. Two things on the floor should be ONE surface — paint the second into the
//      first one's texture. This is what world._gridTexture does for the city ground, and it is
//      always the cheapest answer as well as the safest.
//   2. If they must be separate, separate them by DECAL_LIFT (below) — a real distance, not a
//      nominal one — and give each layer its own rung.
//   3. If they must be COPLANAR (a decal that has to sit exactly on its host), don't fight at
//      all: call sinkSurface() on the HOST so it loses every depth tie by rule instead of by luck.
// Interiors make this sharper, not softer: floors, slabs, landings and roofs are all horizontal
// surfaces at deliberate heights, so an interior is a building full of chances to get this wrong.
export const DECAL_LIFT = 0.35;                       // ≈ 6.6cm — the smallest gap that survives
// the layer ladder for anything pinned to the ground, so two systems never pick the same rung
export const GROUND_LAYER = { shadow: 0.05, stateRing: 0.35, bandRing: 0.55, faceWedge: 0.75, mark: 0.95 };
// push a HOST surface back in depth so anything drawn at its level wins the tie deterministically
export function sinkSurface(mat, amount = 1.4) {
  if (!mat) return mat;
  const list = Array.isArray(mat) ? mat : [mat];
  for (const m of list) { m.polygonOffset = true; m.polygonOffsetFactor = amount; m.polygonOffsetUnits = amount; }
  return mat;
}

// WAR WORLD: ASCENDANTS — math + helpers
export const TAU = Math.PI * 2;
export const PI = Math.PI;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
// frame-rate independent smoothing
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
// THE YAW-RATE STIFFENER (openjk cg_view.cpp:646 / aaa-04 §4.2). `stiff` in [0,1] is how much of the
// REMAINING lag to shave off — 0 is plain damp(), 1 is a hard snap. Expressed on the closed FRACTION
// rather than on lambda, because the lambda multiplier that reproduces JKA is different for every
// lambda and would be a magic constant per channel.
// ⚠ DECLARED FOR WAVE 2 VIEW; no consumer in Wave 1.
export const dampStiff = (a, b, lambda, dt, stiff = 0) => {
  let closed = 1 - Math.exp(-lambda * dt);
  if (stiff > 0) closed += (1 - closed) * stiff;
  return lerp(a, b, closed);
};

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

// ---- THE POWERWORLD KNOCKBACK DIAL -----------------------------------------------------------
// Robert: *"you punch them or you blast them and they go flying back really far — that's one thing
// that we're missing in PowerWorld."*
//
// ⚠ THE PREVIOUS PASS TUNED THE CARRY AND NEVER LOOKED AT THE LAUNCH, and that is why it still felt
// short. `_chaseKb` was calibrated against a SYNTHETIC 101 u/s impulse (16.1u in the city → 60.3u
// here, both reproduced). A real punch never produces 101: measured through the real melee path, a
// RAGE haymaker on SOL leaves at **49.2 u/s** and carried **26.0u** — under three body lengths, with
// the fighter still standing in front of you. Fixing the drag alone could never reach BFP distance
// because the number it was multiplying was half what the test assumed.
//
// So the dial has four positions and they do different jobs:
//   kb     — the horizontal impulse. This is the one that makes the hit LOOK big.
//   launch — the vertical. Deliberately lower than `kb`: at parity every punch is a pop-up and the
//            fight leaves the arena instead of crossing it.
//   drag   — the launched drag coefficient (city 6.0; the thrown-body slide class is 1.3).
//   window — seconds `launchT` runs, i.e. how long the exception and the slam arming last.
//   catchK — `game.intercept`'s too-fast-to-follow line, expressed as a MULTIPLE OF `kb` so the one
//            dial moves it too. ESF's own accident made deliberate: a standing hit is catchable, a
//            full swoop hit is not. Leave the line at the city's 132 while multiplying the impulse
//            and every hit becomes uncatchable, which silently deletes teleport-intercept — a
//            mechanic that shipped two days ago. 52 × 2.2 = 114 u/s, and 114 is not a taste: over a
//            90-second AI-vs-AI fight here the launch speeds came out p50 80 · p75 85 · p90 109 ·
//            max 151, and a standing haymaker measures 104. The line therefore leaves a standing hit
//            catchable and takes roughly the hardest tenth away — the trade the reference had.
//            ⚠ Set it too HIGH and nothing is ever uncatchable, which is the same as not having the
//            rule; too LOW and the committed blow you most want to follow up is the one refused.
//
// ⚠ IT LIVES IN util.js FOR THE SAME REASON `BANDS` DOES: entity.js and game.js both read it and
// neither may import the stage (powerworld.js imports figure.js). One home, live-editable from the
// console — `LSW.PW_KB.kb = 3` takes effect on the next hit, which is what "give him a dial" means.
// ⚠ EVERY READER GATES ON `f._chaseKb`, which only the powerworld mode sets. The city never reads it.
export const PW_KB = { kb: 2.2, launch: 1.45, drag: 0.5, window: 2.6, catchK: 52 };
export const pwCatchSpeed = () => PW_KB.catchK * PW_KB.kb;

// ---- THE POWERWORLD DIAL TABLES ---------------------------------------------------------------
// Wave 1 (VIEW) lands them ALL in one place so no later wave has to fight for this file. Same home,
// same reason as PW_KB: entity.js and game.js both read these and neither may import the stage
// (powerworld.js imports figure.js). Every one is live-editable from the console — `LSW.PW_AIR.top`.
//
// AIR grammar (aaa-01 §9.2). Only `camPitch` is CONSUMED in Wave 1 — the chase-camera pitch clamp
// under pointer-lock mouse-look. The rest is Wave 3 AIR, landed with spec'd defaults, unread here.
export const PW_AIR = {
  accel: 1.8,        // == AIR_DRAG. accel/friction IS the terminal-speed multiplier. BFP: 2.0/2.0.
  plGain: 0.7143,    // airGain = 1 + plGain·(powerBuff−1); derived so airGain(1.70) = 1.50
  speedMul: 1.55,    // ⚠ BFP FLIGHT SPEED (Robert, 2026-07-28: "increase flight speed to BFP"). A flat
                     // open-sky-only multiplier on air wish speed — city flight untouched. Feel dial.
  top: 340,          // u/s cap on open-sky wish speed (raised 210→340 so the faster flight has headroom)
  drift: 0.0375, driftSlow: 1.0, driftThresh: 0.3125, driftUp: 0.125,   // PM_Drifting (§4)
  // C5 air stopspeed threshold, as a fraction of the fighter's BASE air wish speed. BFP's own ratio
  // is pm_stopspeed/g_speed = 0.3125 (== driftThresh), but that pulls the pwmove suite's normalised
  // V2 (released from the non-cruise plateau, normalised as if drag were a pure exponential) down to
  // ~43.7u — under the 45.7 floor. C5 is explicit that this term is "gated by measurement", so the
  // stopspeed gets its OWN, gentler coefficient: it exists only to CRISP the last few u/s to a real
  // rest (so a flier can hold a position), not to shorten the swoop. 0.12 keeps normalised V2 ≈ 51u
  // across the ladder while still terminating. The DRIFT keeps the full 0.3125 (it must be felt).
  stopThresh: 0.12,
  camPitch: 0.985,   // sin(80°) — world.chase's ay clamp under mouse-look (§6.3)
};

// IMPACT dials (aaa-06 §15). Only `punchK`/`punchHome` are CONSUMED in Wave 1 — world.punch()'s FOV
// kick and its ease-home. The rest is Wave 6 IMPACT, landed unread.
export const PW_FX = {
  shakeDegPer: 0.18, shakeMaxDeg: 1.25, oct1Hz: 12, oct2Hz: 4.5, oct1Mix: 0.30, axisEvent: 0.5,
  punchK: 0.45, punchHome: 3.5,
  sparkJab: 0.088, sparkMid: 0.131, sparkHeavy: 0.181,
  blastCore: 0.292, blastShell: 0.640, pressureRing: 0.900, flash: 0.05, kernelNear: 1.4,
  ptMaxFrac: 0.035, sparkCount: 20, speedMix: 0.40,
};

// THE GAIT MACHINE (aaa-03 §2). DECLARED for Wave 2 GAIT; NO consumer in Wave 1. `gaitAllows` is a
// permissive placeholder — nothing reads it yet, and the GAIT lane fills its real body (aaa-03 §6.1)
// when it wires the state machine. Names describe what the fighter is DOING, not which system runs.
export const GAIT = {
  GROUNDED: 'grounded',   // feet on a surface — the ground grammar owns you
  LIFT:     'lift',       // leaving it — the air grammar owns input, the body is catching up
  AIRBORNE: 'airborne',   // free in three dimensions
  STOOP:    'stoop',      // a committed descent under your own power
  SETTLE:   'settle',     // arriving under your own power — the ground grammar already owns input
  CRASH:    'crash',      // arriving because someone put you here (the only 'none' owner — stagger)
};
export const GAIT_OWNER = {                 // WHICH GRAMMAR OWNS INPUT — never null except CRASH
  grounded: 'ground', settle: 'ground',
  airborne: 'air', lift: 'air', stoop: 'air',
  crash: 'none',
};
// WAVE 2 · GAIT fills the body. A move is either GRAMMAR-AGNOSTIC (the default — carries across the
// boundary, §5's carry-by-default rule) or tagged to one grammar. The check reads the fighter's live
// OWNER, so it can never disagree with the state machine. ⚠ CRASH ('none') is NOT a second refusal:
// the engine's own stagger gates (`melee.canAct`, `abilities.ready`, `busy`) already refuse there
// (§4), so gaitAllows lets a grammar-tagged move through under 'none' and lets stagger do the saying.
// The moveset split (Loop 5) grows the tag vocabulary; today the two grammar tags are all there is.
export const gaitAllows = (f, move) => {
  if (!f || !move || f.gait === undefined) return true;
  const owner = GAIT_OWNER[f.gait];
  if (move === 'air') return owner !== 'ground';       // air-only: any owner but planted feet
  if (move === 'ground') return owner !== 'air';       // ground-only: any owner but free in the air
  return true;                                         // grammar-agnostic — carries across the seam
};

// THE AIM TRACE FALLBACK (aaa-05 §5.3): the p50 reach of a ranged ability over all 52 heroes and 364
// abilities — the convergence point when the crosshair ray hits nothing (residual ≤ 1.03u at any
// range). Derived from the distribution, not chosen. Passed by MARK to world.aimTrace as `maxD`.
export const AIM_MAX_D = 162;

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
export const GROUND_LAYER = { shadow: 0.05, stateRing: 0.35, bandRing: 0.55, faceWedge: 0.75, mark: 0.95, spacing: 1.15 };
// The road network sits BELOW every character decal and ABOVE the lot surface it is laid on.
// One number, shared, so the carriageway and anything that wants to sit on it agree.
export const ROAD_LIFT = 0.4;
// push a HOST surface back in depth so anything drawn at its level wins the tie deterministically
export function sinkSurface(mat, amount = 1.4) {
  if (!mat) return mat;
  const list = Array.isArray(mat) ? mat : [mat];
  for (const m of list) { m.polygonOffset = true; m.polygonOffsetFactor = amount; m.polygonOffsetUnits = amount; }
  return mat;
}

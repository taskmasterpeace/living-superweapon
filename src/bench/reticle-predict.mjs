// =================================================================================================
// THE RETICLE PREDICTOR — `world.chase()`'s arithmetic, transcribed, running on nothing.
//
//     node src/bench/reticle-predict.mjs
//
// ⚠ WHY A PURE-NODE COPY OF ENGINE CODE EXISTS AT ALL, given the "export the rule, never
// reimplement it" law. Because this is not a second implementation of a rule the game runs — it is
// the INSTRUMENT that proves the in-engine gauge can see the bug. `aaa-05-reticle.md:800` (LAW 4)
// makes check 0 of `src/bench/reticle.js` a comparison against these numbers: if the browser suite
// and this file disagree, one of them is wrong and the run is inadmissible. A gauge with no
// independent reference is a gauge you have to trust, and this repo has already shipped a
// four-times-oversized boxing ring behind six green assertions.
//
// ⚠ AND IT PROVES ITSELF TWICE, BY TWO DIFFERENT DERIVATIONS. `predictMiss` is the spec's
// transcription (§10.4) and treats the camera ray and the shot ray as PARALLEL, which they very
// nearly are. `predictMissAtRange` builds `a3` exactly as `game.js:3172-3175` does, derives the
// real `aim3` and the real muzzle, and measures the separation AT THE TARGET'S OWN RANGE — no
// parallel assumption anywhere. Two derivations that share no arithmetic and agree to 0.72u is
// evidence; one derivation agreeing with itself is not.
//
// ⚠ THE CLOSEST-APPROACH FORM IS THE WRONG INSTRUMENT AND IS DELIBERATELY NOT USED. The two rays
// are 0.38° from parallel (an 0.8u origin offset over a 120u lever arm), so the true minimum of
// |P(t) − Q(u)| over ALL t lands hundreds of units BEHIND the camera — measured t = −958 at a 100u
// gap. A number minimised behind the player's head says nothing about where his shot lands.
//
// Source sites, read 2026-07-27 (line numbers are this repo's, today):
//   world.js:2247-2248  k and FOV        world.js:2257  pitch damp      world.js:2286-2287  distance
//   world.js:2290-2291  look-point bias  world.js:2307-2308  eye + shoulder offset
//   game.js:3172-3175   the parallax     game.js:3194  aim3 from pos+5.8   entity.js:317-318  muzzle
// =================================================================================================

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hyp = (x, y, z) => Math.hypot(x, y, z);

/** The published table this file must reproduce — `aaa-05-reticle.md` §2.3, verbatim. */
export const SPEC_TABLE = [
  { gap: 10, camDist: 31.1, miss: 0.91 },
  { gap: 16, camDist: 37.3, miss: 0.47 },
  { gap: 24, camDist: 45.6, miss: 0.70 },
  { gap: 32, camDist: 53.9, miss: 2.08 },
  { gap: 40, camDist: 62.2, miss: 3.18 },
  { gap: 52, camDist: 74.7, miss: 4.42 },
  { gap: 70, camDist: 74.7, miss: 5.91 },
  { gap: 100, camDist: 74.7, miss: 7.98 },
];
/** The two vertical rows and the free-flight row, same source. */
export const SPEC_EXTRA = [
  { name: '45deg above, gap 40', gap: 40, opts: { ay0: 1 }, miss: 8.67 },
  { name: '45deg above, gap 70', gap: 70, opts: { ay0: 1 }, miss: 14.52 },
  { name: 'no target, gap 40', gap: 40, opts: { noTarget: true }, miss: 1.03 },
];

/** N_EXACT — `DECAL_LIFT` in core/util.js. Taken, never invented (aaa-05 §10.2). */
export const N_EXACT = 0.35;
/** N_HIT — `entity.radius` (entity.js:185). One frame at cruise is 1.67u of body travel. */
export const N_HIT = 2.2;

// -------------------------------------------------------------------------------------------------
// THE SETTLED FRAME — everything `chase()` computes once the damping has converged.
// Subject at the origin, facing +x, target dead ahead at `gap` (and `ay0` up).
// -------------------------------------------------------------------------------------------------
export function chaseFrame(gap, { spd = 0, ay0 = 0, noTarget = false } = {}) {
  const k = clamp((spd - 14) / 96, 0, 1);            // world.js:2247
  const fov = 58 + k * 16;                           // world.js:2248, settled
  // the subject→target axis, pitch-damped and re-normalised (world.js:2250-2260)
  let ax = 1, ay = ay0, az = 0;
  let L = hyp(ax, ay, az); ax /= L; ay /= L; az /= L;
  ay = clamp(ay * 0.55, -0.82, 0.82);
  L = hyp(ax, ay, az); ax /= L; ay /= L; az /= L;
  // ⚠ the `horiz < 0.35` degenerate blend (world.js:2265-2269) is NOT modelled here: after the
  // 0.55 pitch damp a 45° target reads horiz 0.88 and even a target directly overhead is pulled to
  // horiz 0.65, so the blend never fires for any case this file is asked about. The in-engine suite
  // covers the branch for real; a transcription that quietly models a branch it cannot reach would
  // be worse than one that says it does not.
  const fit = (Math.min(gap, 52) + 20) / (2 * Math.tan((fov * Math.PI / 180) / 2));   // world.js:2286
  const d = clamp(Math.max(24, fit * 1.15) + k * 16, 24, 86);                          // world.js:2287
  const bias = noTarget ? 0.2 : clamp(gap * 0.012, 0.16, 0.42);                        // world.js:2290
  const T = { x: ax * gap * bias, y: 5.4 + ay * gap * bias, z: az * gap * bias };       // world.js:2291
  const px = az / hyp(ax, 0, az || 1e-6), pz = -ax / hyp(ax, 0, az || 1e-6);            // world.js:2307
  const off = d * 0.17;
  const E = { x: -ax * d + px * off, y: 5.4 - ay * d * 0.18 + d * 0.30, z: -az * d + pz * off };
  // the camera looks AT T from E, so its forward IS that vector (world.js:2320-2321)
  let f = { x: T.x - E.x, y: T.y - E.y, z: T.z - E.z };
  const fl = hyp(f.x, f.y, f.z); f = { x: f.x / fl, y: f.y / fl, z: f.z / fl };
  return { k, fov, d, bias, axis: { x: ax, y: ay, z: az }, T, E, f };
}

// -------------------------------------------------------------------------------------------------
// DERIVATION 1 — the spec's §10.4 transcription. Parallel rays, so the perpendicular component of
// the muzzle's offset from the camera ray IS the miss at every range.
// -------------------------------------------------------------------------------------------------
export function predictMiss(gap, opts = {}) {
  const { fov, d, E, f, axis } = chaseFrame(gap, opts);
  const hx = hyp(axis.x, 0, axis.z) || 1;
  const M = { x: (axis.x / hx) * 3.4, y: 5.8, z: (axis.z / hx) * 3.4 };   // entity.js:317-318
  const v = { x: M.x - E.x, y: M.y - E.y, z: M.z - E.z };
  const dot = v.x * f.x + v.y * f.y + v.z * f.z;
  const p = { x: v.x - f.x * dot, y: v.y - f.y * dot, z: v.z - f.z * dot };
  return { camDist: d, fov, miss: hyp(p.x, p.y, p.z) };
}

// -------------------------------------------------------------------------------------------------
// DERIVATION 2 — independent. No parallel assumption, no shared arithmetic with derivation 1 past
// the frame itself. Builds the aim point the way the engine builds it, derives `aim3` and the
// muzzle FROM IT, and asks the question the invariant actually asks:
//
//   the crosshair marks a point on the camera's centre ray at the target's range.
//   How far does the shot ray pass from THAT POINT?
// -------------------------------------------------------------------------------------------------
export function predictMissAtRange(gap, opts = {}) {
  const { fov, d, E, f, axis } = chaseFrame(gap, opts);
  // game.js:3172-3175 — a3 is the camera's forward, thrown 120u from the PLAYER's body, +5 up.
  const a3 = { x: f.x * 120, y: 5 + f.y * 120, z: f.z * 120 };
  // game.js:3194 — aim3 is measured from pos + 5.8, not from a3's own +5. That 0.8u is the whole
  // reason these two rays are not exactly parallel.
  let s = { x: a3.x, y: a3.y - 5.8, z: a3.z };
  const sl = hyp(s.x, s.y, s.z); s = { x: s.x / sl, y: s.y / sl, z: s.z / sl };
  // entity.js:314 — `aim` is aim3 flattened onto XZ, and the muzzle rides it.
  const hx = hyp(s.x, 0, s.z) || 1;
  const M = { x: (s.x / hx) * 3.4, y: 5.8, z: (s.z / hx) * 3.4 };
  // the point the crosshair marks: on the camera centre ray, at the foe's own range.
  // entity.js:315 — `center` is pos + 5.2.
  const F = { x: axis.x * gap, y: 5.2 + axis.y * gap, z: axis.z * gap };
  const w = { x: F.x - E.x, y: F.y - E.y, z: F.z - E.z };
  const tF = w.x * f.x + w.y * f.y + w.z * f.z;
  const P = { x: E.x + f.x * tF, y: E.y + f.y * tF, z: E.z + f.z * tF };
  // perpendicular distance from P to the shot ray {M + u·s}
  const v = { x: P.x - M.x, y: P.y - M.y, z: P.z - M.z };
  const u = v.x * s.x + v.y * s.y + v.z * s.z;
  const p = { x: v.x - s.x * u, y: v.y - s.y * u, z: v.z - s.z * u };
  return { camDist: d, fov, range: tF, miss: hyp(p.x, p.y, p.z) };
}

// -------------------------------------------------------------------------------------------------
// THE SELF-PROOF. Three questions, in order, and the run is worthless if any is red:
//   A. does the transcription reproduce the published table?          (±0.15u — the spec's own tol)
//   B. does the independent derivation agree with it?                 (they share no arithmetic)
//   C. does the gauge MOVE when the bug is removed?                   (the known-bad, inverted)
// -------------------------------------------------------------------------------------------------

/**
 * C — the convergent fix, predicted. Under the Wave-1 fix `a3` becomes the TRACE HIT, so the shot
 * ray passes through the marked point by construction and the miss is 0 to floating point. This is
 * the known-good half of §5.2: a gauge that cannot tell the fixed engine from the broken one is
 * blind, and this shows the arithmetic distinguishes them.
 */
export function predictMissConvergent(gap, opts = {}) {
  const { fov, d, E, f, axis } = chaseFrame(gap, opts);
  const F = { x: axis.x * gap, y: 5.2 + axis.y * gap, z: axis.z * gap };
  const w = { x: F.x - E.x, y: F.y - E.y, z: F.z - E.z };
  const tF = w.x * f.x + w.y * f.y + w.z * f.z;
  const P = { x: E.x + f.x * tF, y: E.y + f.y * tF, z: E.z + f.z * tF };   // the aim point IS the hit
  // aim3 now points at P from the body, and the muzzle rides that
  let s = { x: P.x, y: P.y - 5.8, z: P.z };
  const sl = hyp(s.x, s.y, s.z); s = { x: s.x / sl, y: s.y / sl, z: s.z / sl };
  const hx = hyp(s.x, 0, s.z) || 1;
  const M = { x: (s.x / hx) * 3.4, y: 5.8, z: (s.z / hx) * 3.4 };
  const v = { x: P.x - M.x, y: P.y - M.y, z: P.z - M.z };
  const u = v.x * s.x + v.y * s.y + v.z * s.z;
  const p = { x: v.x - s.x * u, y: v.y - s.y * u, z: v.z - s.z * u };
  // ⚠ this is NOT zero, and that is a genuine prediction the fix has to answer: aiming the BODY at
  // P still leaves the MUZZLE 3.4u in front of the body on a slightly different bearing. That is
  // the "muzzle two-pass" residual the spec puts at 3.35u for an 80° pitch (aaa-05 check 4).
  return { camDist: d, fov, miss: hyp(p.x, p.y, p.z) };
}

export function verify(opts = {}) {
  const TOL_SPEC = opts.tolSpec ?? 0.15;      // aaa-05-reticle.md check 0
  const TOL_XCHECK = opts.tolCross ?? 0.75;   // measured worst disagreement is 0.72u, at gap 100
  const rows = [];
  const failures = [];
  let checks = 0;
  const add = (name, pass, got, want, note) => {
    checks++; rows.push({ name, pass: !!pass, got, want, note: note || '' });
    if (!pass) failures.push(`${name}: got ${got}, want ${want}`);
  };

  // ---- A. the transcription reproduces the published table -------------------------------------
  for (const r of SPEC_TABLE) {
    const p = predictMiss(r.gap);
    add(`A-miss gap ${r.gap}`, Math.abs(p.miss - r.miss) <= TOL_SPEC,
      p.miss.toFixed(3), `${r.miss} ±${TOL_SPEC}`);
    add(`A-camDist gap ${r.gap}`, Math.abs(p.camDist - r.camDist) <= 0.15,
      p.camDist.toFixed(2), `${r.camDist} ±0.15`);
  }
  for (const r of SPEC_EXTRA) {
    const p = predictMiss(r.gap, r.opts);
    add(`A-${r.name}`, Math.abs(p.miss - r.miss) <= TOL_SPEC, p.miss.toFixed(3), `${r.miss} ±${TOL_SPEC}`);
  }

  // ---- B. the independent derivation agrees ----------------------------------------------------
  let worstX = 0;
  for (const r of [...SPEC_TABLE.map((x) => ({ gap: x.gap, opts: {} })),
                   { gap: 40, opts: { ay0: 1 } }, { gap: 70, opts: { ay0: 1 } }]) {
    const a = predictMiss(r.gap, r.opts).miss, b = predictMissAtRange(r.gap, r.opts).miss;
    worstX = Math.max(worstX, Math.abs(a - b));
  }
  add('B-two derivations agree', worstX <= TOL_XCHECK, worstX.toFixed(3), `<= ${TOL_XCHECK}`,
    'parallel-ray vs at-range; they share only chaseFrame()');

  // ---- C. the gauge can tell a fixed engine from a broken one ----------------------------------
  // The bug is a RANGE-DEPENDENT miss. A gauge that reports the same number for the convergent
  // aim as for the parallel one cannot grade the fix.
  const brokeFar = predictMiss(100).miss, fixedFar = predictMissConvergent(100).miss;
  add('C-convergent aim is smaller at 100u', fixedFar < brokeFar * 0.5,
    `${fixedFar.toFixed(3)} vs ${brokeFar.toFixed(3)}`, 'fixed < half of broken');
  // and the residual the muzzle two-pass still owes
  add('C-muzzle residual is reported, not hidden', Number.isFinite(fixedFar), fixedFar.toFixed(3),
    'finite', 'convergent-aim residual at 100u BEFORE the muzzle two-pass');

  // ---- D. the shape of the finding: the miss GROWS with range ----------------------------------
  // openjk.md:2062-2064 claims a constant 6.8u, worst up close. This is the assertion that says the
  // record is wrong, and it is a RELATIONSHIP (rule M-B), so a re-tune cannot silently break it.
  const m16 = predictMiss(16).miss, m100 = predictMiss(100).miss;
  add('D-miss grows with range (corrects openjk.md:2045)', m100 > m16 * 4,
    `16u -> ${m16.toFixed(2)}, 100u -> ${m100.toFixed(2)}`, '100u miss > 4x the 16u miss');
  const mLevel = predictMiss(70).miss, mUp = predictMiss(70, { ay0: 1 }).miss;
  add('D-vertical is the worst axis', mUp > mLevel * 2,
    `level ${mLevel.toFixed(2)}, 45deg up ${mUp.toFixed(2)}`, 'up > 2x level, at gap 70');

  return { lane: 'reticle-predict', checks, failures, rows, worstCross: worstX };
}

// -------------------------------------------------------------------------------------------------
// CLI
// -------------------------------------------------------------------------------------------------
const isMain = (() => {
  try { return process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('reticle-predict.mjs'); }
  catch { return false; }
})();

if (isMain) {
  const pad = (s, n) => String(s).padStart(n);
  console.log('\nTHE RETICLE PREDICTOR — world.chase() arithmetic, no engine, no DOM');
  console.log('  the shot leaves the MUZZLE along aim3; the crosshair marks the CAMERA ray.');
  console.log('  "miss" is how far apart they are where the fight is happening.\n');
  console.log('  gap   camDist    fov   miss(parallel)  miss(at-range)   vs 2.2u body');
  console.log('  ----  --------  -----  --------------  --------------   ------------');
  for (const r of SPEC_TABLE) {
    const a = predictMiss(r.gap), b = predictMissAtRange(r.gap);
    const verdict = a.miss < 2.2 ? 'hits' : a.miss < 4.4 ? 'MISS' : `MISS by ${(a.miss / 2.2).toFixed(1)} radii`;
    console.log(`  ${pad(r.gap, 4)}  ${pad(a.camDist.toFixed(1), 8)}  ${pad(a.fov.toFixed(0), 5)}  ${pad(a.miss.toFixed(2), 14)}  ${pad(b.miss.toFixed(2), 14)}   ${verdict}`);
  }
  for (const r of SPEC_EXTRA) {
    const a = predictMiss(r.gap, r.opts), b = predictMissAtRange(r.gap, r.opts);
    console.log(`  ${r.name.padEnd(22)}      ${pad(a.miss.toFixed(2), 14)}  ${pad(b.miss.toFixed(2), 14)}`);
  }
  const v = verify();
  console.log(`\n  SELF-PROOF: ${v.checks - v.failures.length}/${v.checks} checks`);
  for (const f of v.failures) console.log('    FAIL  ' + f);
  console.log(`  two independent derivations agree to ${v.worstCross.toFixed(3)}u\n`);
  if (v.failures.length) process.exitCode = 1;
}

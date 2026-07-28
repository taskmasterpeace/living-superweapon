// =================================================================================================
// THE CAMERA GAUGE — C1..C7 of `docs/powerworld/aaa-08-rubric.md` §1.2, against `world.chase()`.
//
//     await (await import('/src/bench/pwcam.js')).camSuite(LSW.game, LSW.hud)
//
// WAVE 0. ⚠ NOTHING HERE CHANGES THE GAME. This file reads `world.camPos` / `world.camTarget` /
// `world.camera` and drives the camera through the only inputs it actually has — where the subject
// is and where the target is. It edits no engine file. The two injectors at the bottom are
// bench-local monkey-patches that install and UNDO themselves, and they exist to prove the gauge
// can move; they are never left installed.
//
// -------------------------------------------------------------------------------------------------
// WHAT IS BEING MEASURED, AND WHY EACH IS DONE THIS WAY
// -------------------------------------------------------------------------------------------------
// `chase()` has no mouse-look (aaa-05 §1: `grep pointerLock` returns nothing). Its axis is
// subject→target, else velocity, else facing. So **the target's position IS the camera's input**,
// and every one of these measurements drives that, never `camera.position`. That is RULE M-A.
//
// C1/C2 — λ is fitted, never read off the source. `damp(a,b,λ,dt)` closes a fixed FRACTION per
//   frame, so after a step discontinuity `x(n) − x∞` is a geometric series and
//   `λ = −ln(ratio)/dt`. The subject and the foe are translated TOGETHER so the gap, and therefore
//   `_chaseDist` (λ 3.2) and `_chaseFov` (λ 4), never move — otherwise a second lag with a third
//   rate is superimposed on the one being fitted and the number is a blend of three.
// C3 — the RATIO is the metric (rubric: "a matched pair is a single-channel camera wearing two
//   names"). It is also the one number that survives a re-tune of both channels, which is RULE M-B.
// C4/C5 — the stiffener DOES NOT EXIST YET (Wave 1 owns `dampStiff`). These therefore measure the
//   engine as it stands, which IS the rubric's known-bad condition, and they report it as a FAIL
//   with the actual number rather than as "not applicable". ⚠ A gauge that excuses itself because
//   the feature is unbuilt is a gauge that will still excuse itself after it is built.
// C6 — clip-through needs a CITY. In the open desert there is nothing to clip through, so the
//   count is 0 for a reason that has nothing to do with the camera and the check can never fail.
//   If no city is available the row is NEEDS-CONTEXT, which is an honest third verdict, not a pass.
// -------------------------------------------------------------------------------------------------
// ⚠ THE HARNESS TRAPS THIS FILE PAYS FOR EXPLICITLY (aaa-08 §5.4):
//   · `game.update` is called UNCONDITIONALLY by the page's rAF loop. It is stubbed to a no-op and
//     the real one is called by hand, restored in a `finally`.
//   · `controlPlayer` rewrites aim every frame — stubbed here (the camera does not read aim).
//   · Fighters are picked by TEAM and by def id, never by index (`entities[1]` has been the KMK 9
//     camera operator).
//   · Both bodies are pinned to ABSOLUTE positions every frame.
//   · State is read through the page's own graph (the `game`/`hud` passed in), never a fresh
//     dynamic import of an engine module.
// =================================================================================================

const DT = 1 / 60;
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/** ⚠ `camera.getWorldDirection(target)` CALLS `target.set(...)`. A bare object literal throws
 *  "target.set is not a function" — which is how the first flick measurement was lost. */
/**
 * ⚠ READ THE CAMERA'S FORWARD OFF ITS OWN MATRIX, NOT VIA `getWorldDirection`. That method expects a
 * real `THREE.Vector3` and calls `.set().negate().normalize()` on it — a plain object throws, and
 * the first two attempts at the flick measurement were lost to exactly that, one method at a time.
 * Column 2 of a matrixWorld is the object's +Z axis and a camera looks down -Z, so forward is its
 * negation. No THREE import, nothing to go stale, and it cannot pick up a second module instance.
 */
function camForward(cam) {
  cam.updateMatrixWorld();
  const e = cam.matrixWorld.elements;
  const x = -e[8], y = -e[9], z = -e[10];
  const l = Math.hypot(x, y, z) || 1;
  return { x: x / l, y: y / l, z: z / l };
}

// ---- the pass bands, from aaa-08 §1.2. A band is NEVER edited to make something pass. ----------
export const BANDS = {
  C1: [6.1, 8.2],      // JKA cg_thirdPersonCameraDamp 0.3 -> -ln(0.7)/0.05 = 7.13 /s, +-15%
  C2: [11.8, 15.9],    // JKA cg_thirdPersonTargetDamp 0.5 -> -ln(0.5)/0.05 = 13.86 /s, +-15%
  C3: [1.7, 2.1],      // JKA's own ratio is 1.94
  C5_STIFF: 8,         // flick residual at t+0.25s, degrees, WITH the stiffener
  C5_LIMP: 40,         // and the known-bad floor: no stiffener must read worse than this
  C7: 0.03,            // max per-frame delta as a fraction of the quantity's own range
};

// -------------------------------------------------------------------------------------------------
// CAM_PAD — DERIVED from the near-plane corner radius, never hand-picked (aaa-04 §3.4).
// The pad protects the near plane, so its size is the near plane's corner distance, times a safety
// factor covering one frame of damping between traces.
// -------------------------------------------------------------------------------------------------
export function camPad(world) {
  const c = world.camera;
  const near = c.near ?? 0.6;
  const fovV = (world._chaseFov ?? c.fov ?? 58) * D2R;
  const aspect = c.aspect || (typeof innerWidth === 'number' ? innerWidth / Math.max(1, innerHeight) : 16 / 9);
  const corner = near * Math.sqrt(1 + Math.tan(fovV / 2) ** 2 * (1 + aspect * aspect));
  return corner * 1.35;
}

// =================================================================================================
// THE SUITE
// =================================================================================================
export async function camSuite(game, hud, opts = {}) {
  const rows = [];
  const failures = [];
  const notes = [];
  const errs = [];
  const oldErr = console.error;
  console.error = (...a) => { errs.push(String(a[0]).slice(0, 200)); oldErr(...a); };

  const realUpdate = game.update.bind(game);
  const prevControl = game.controlPlayer;
  const prevRunning = game.running;
  const prevRender = game.world.render.bind(game.world);
  const prevNews = game.news ? game.news.enabled : null;

  const add = (id, what, pass, measured, bar, note) => {
    const row = { id, what, measured: String(measured), bar: String(bar), pass: pass === true, note: note || '' };
    if (pass === 'context') { row.pass = null; row.verdict = 'NEEDS-CONTEXT'; }
    rows.push(row);
    if (row.pass === false) failures.push(`${id} ${what}: measured ${row.measured}, bar ${row.bar}${note ? ' — ' + note : ''}`);
    return row;
  };

  // ⚠ own the clock AND the controller, or the page's rAF loop advances the world in between every
  // hand-stepped frame and nothing in the report can tell that apart from the camera's own doing.
  game.update = () => {};
  game.controlPlayer = () => {};
  try {
    await run();
  } catch (e) {
    failures.push('THREW: ' + ((e && e.message) || e));
    errs.push(String((e && e.stack) || e).slice(0, 400));
  } finally {
    game.update = realUpdate;
    game.controlPlayer = prevControl;
    game.running = prevRunning;
    game.world.render = prevRender;
    if (game.news && prevNews !== null) game.news.enabled = prevNews;
    console.error = oldErr;
  }

  return {
    lane: 'G-VIEW / camera',
    checks: rows.length,
    failures,
    rows,
    notes,
    consoleErrors: errs,
    camPad: +camPad(game.world).toFixed(3),
  };

  // ===============================================================================================
  function step(n = 1) { for (let i = 0; i < n; i++) realUpdate(DT); }

  /**
   * ⚠ SHUT THE FRONT DOOR THROUGH THE DOOR'S OWN API. `hud.hideTitle()` closes WAR WORLD's title
   * (`#title`); PowerWorld's door is `#pwTitle` and `pw-main.js:41` exposes `PW.door()` for exactly
   * this — "the headless seam: drive the real front door, not the internals". A full-screen opaque
   * layer left up is what `tools/shoot.mjs` refuses a run for.
   */
  function closeDoor() {
    try { hud.hideTitle && hud.hideTitle(); } catch (e) {}
    try {
      const h = typeof window !== 'undefined' && (window.PW || window.LSW);
      const d = h && typeof h.door === 'function' && h.door();
      if (d && d.close) d.close();
    } catch (e) {}
  }

  /** Stand a PowerWorld fight up. Returns { p, foe } picked by TEAM and def id, never by index. */
  function stand(p1 = 'sol', p2 = 'rage', modeId = 'powerworld') {
    closeDoor();
    game.running = true;
    game.world.render = () => {};                 // sim-only: a hidden pane renders at 0x0 anyway
    game.startMode(modeId, { p1, p2, enemy: p2 });
    if (game.news) game.news.enabled = false;     // ⚠ `onAir` is a GETTER — assigning it throws
    const p = game.humans[0] && game.humans[0].fighter;
    const foe = game.entities.find((e) => e && e.def && e.def.id === p2 && e !== p && e.team !== (p && p.team));
    if (foe) { foe.ai = null; foe.invuln = 1e9; }
    if (p) { p.invuln = 1e9; }
    return { p, foe };
  }

  /** Pin both bodies to ABSOLUTE world positions and hold them there. */
  function pin(p, foe, pp, fp) {
    p.pos.set(pp.x, pp.y, pp.z); p.vel.set(0, 0, 0); p.flying = true; p.staggerT = 0; p.launchT = 0;
    foe.pos.set(fp.x, fp.y, fp.z); foe.vel.set(0, 0, 0); foe.flying = true; foe.staggerT = 0; foe.launchT = 0;
  }

  /** Step `n` frames holding both bodies pinned, so the camera is the only thing converging. */
  function settle(p, foe, pp, fp, n = 200) {
    for (let i = 0; i < n; i++) { pin(p, foe, pp, fp); step(1); }
    pin(p, foe, pp, fp);
  }

  /** |Δ camPos| between two consecutive frames — the settlement assertion (aaa-05 §10.3). */
  function settleResidual(p, foe, pp, fp) {
    const w = game.world;
    const a = { x: w.camPos.x, y: w.camPos.y, z: w.camPos.z };
    pin(p, foe, pp, fp); step(1); pin(p, foe, pp, fp);
    return Math.hypot(w.camPos.x - a.x, w.camPos.y - a.y, w.camPos.z - a.z);
  }

  /**
   * Fit λ from a step response. `sample(i)` returns the scalar at frame i; `x∞` is the value it has
   * converged to. For `damp()` the residual is geometric: r(n+1)/r(n) = exp(-λ·dt).
   * ⚠ Fitted over the frames where the residual is still large enough to be signal — a ratio taken
   * once the residual is float noise reports a random λ.
   */
  function fitLambda(series, xInf) {
    const ratios = [];
    for (let i = 0; i + 1 < series.length; i++) {
      const r0 = Math.abs(series[i] - xInf), r1 = Math.abs(series[i + 1] - xInf);
      if (r0 < 0.35 || r1 < 1e-4) break;         // below this the fit is reading rounding
      ratios.push(r1 / r0);
    }
    if (ratios.length < 3) return NaN;
    // geometric mean of the per-frame closure ratio, so one noisy frame cannot dominate
    const g = Math.exp(ratios.reduce((a, r) => a + Math.log(r), 0) / ratios.length);
    return -Math.log(g) / DT;
  }

  // ===============================================================================================
  async function run() {
    const w = game.world;

    // ---------------------------------------------------------------------------------------
    // C0 — THE HARNESS PROVES ITSELF FIRST (aaa-08 §5.2). Every one of these is a way the suite
    // could report a confident number about nothing at all.
    // ---------------------------------------------------------------------------------------
    const { p, foe } = stand(opts.p1 || 'sol', opts.p2 || 'rage');
    add('C0a', 'a player and a distinct foe exist, picked by team not index',
      !!(p && foe && p !== foe && p.team !== foe.team), p && foe ? `${p.def.id} vs ${foe.def.id}` : 'MISSING',
      'two fighters, opposing teams');
    if (!p || !foe) { notes.push('no fight could be stood up — every camera row below is void'); return; }

    add('C0b', 'the chase camera is actually driving (ms.chaseCam, camMode)',
      !!(game.ms && game.ms.chaseCam), `chaseCam=${!!(game.ms && game.ms.chaseCam)} camMode=${w.camMode}`,
      'chaseCam true');

    const P0 = { x: 0, y: 30, z: 0 }, F0 = { x: 40, y: 30, z: 0 };
    settle(p, foe, P0, F0, 240);
    add('C0c', 'camMode is chase after settling', w.camMode === 'chase', String(w.camMode), 'chase');
    const res0 = settleResidual(p, foe, P0, F0);
    add('C0d', 'the camera has SETTLED before anything is read (|dCamPos| per frame)',
      res0 < 0.05, res0.toFixed(5) + 'u', '< 0.05u');
    // ⚠ THE ANTI-VACUOUS GUARD. If the camera never moves at all — a stubbed chase, a frozen clock,
    // a mode that is not driving it — every damping fit below returns a confident NaN-free number
    // from a flat line. Prove it MOVES before proving how fast.
    const before = { x: w.camPos.x, y: w.camPos.y, z: w.camPos.z };
    settle(p, foe, { x: 60, y: 30, z: 0 }, { x: 100, y: 30, z: 0 }, 6);
    const moved = Math.hypot(w.camPos.x - before.x, w.camPos.y - before.y, w.camPos.z - before.z);
    add('C0e', 'the camera RESPONDS to the subject moving (anti-vacuous)',
      moved > 1, moved.toFixed(3) + 'u', '> 1u over 6 frames',
      'a flat line would give every fit below a clean number from nothing');

    // ---------------------------------------------------------------------------------------
    // C1 / C2 / C3 — the two damping channels, and the ratio between them.
    // A rigid translation of BOTH bodies: gap unchanged, so `_chaseDist` and `_chaseFov` do not
    // move and the only lag in the signal is the one being fitted.
    // ---------------------------------------------------------------------------------------
    const A = { p: { x: 0, y: 30, z: 0 }, f: { x: 40, y: 30, z: 0 } };
    const JUMP = 60;
    const B = { p: { x: JUMP, y: 30, z: 0 }, f: { x: 40 + JUMP, y: 30, z: 0 } };
    settle(p, foe, A.p, A.f, 260);

    const eye = [], look = [];
    for (let i = 0; i < 40; i++) {
      pin(p, foe, B.p, B.f); step(1); pin(p, foe, B.p, B.f);
      eye.push(w.camPos.x); look.push(w.camTarget.x);
    }
    // converge fully to get x∞ (never assume the analytic ideal — that would be re-implementing chase)
    settle(p, foe, B.p, B.f, 400);
    const eyeInf = w.camPos.x, lookInf = w.camTarget.x;
    const lamEye = fitLambda(eye, eyeInf);
    const lamLook = fitLambda(look, lookInf);

    add('C1', 'eye-damp rate lambda (horizontal channel)',
      lamEye >= BANDS.C1[0] && lamEye <= BANDS.C1[1], lamEye.toFixed(2) + ' /s',
      `${BANDS.C1[0]}-${BANDS.C1[1]} /s`, 'JKA cg_thirdPersonCameraDamp 0.3 = 7.13 /s');
    add('C2', 'look-point damp rate lambda (horizontal channel)',
      lamLook >= BANDS.C2[0] && lamLook <= BANDS.C2[1], lamLook.toFixed(2) + ' /s',
      `${BANDS.C2[0]}-${BANDS.C2[1]} /s`, 'JKA cg_thirdPersonTargetDamp 0.5 = 13.86 /s');
    const ratio = lamLook / lamEye;
    add('C3', 'the RATIO look:eye — the structural metric, not C1 or C2 alone',
      ratio >= BANDS.C3[0] && ratio <= BANDS.C3[1], ratio.toFixed(3),
      `${BANDS.C3[0]}-${BANDS.C3[1]}`, 'JKA is 13.86/7.13 = 1.94; two channels at one rate is one channel');

    // ---------------------------------------------------------------------------------------
    // C4 — STIFFENER ENGAGEMENT. Drive the camera's yaw by ORBITING the target, which is the real
    // input `chase()` has. For a first-order lag chasing a constant angular rate the steady-state
    // lag is `omega / lambda`, so lambda_eff = omega / lag — measured, not read from the source.
    // The metric is the MULTIPLIER against the 400 deg/s reference.
    // ---------------------------------------------------------------------------------------
    // ⚠ THIS INSTRUMENT WAS WRONG TWICE, AND BOTH WRONG VERSIONS **PASSED**, WHICH IS THE POINT.
    //   v1 measured the steady-state lag under continuous rotation and inverted it as
    //      lambda = omega / lag. That small-angle shortcut reported a 1.819x "stiffening" from an
    //      engine that has no stiffener — a green C4b from a feature that does not exist.
    //   v2 used the continuous-time inversion lambda = omega / tan(lag). Still 1.342x, because
    //      `damp()` is a DISCRETE per-frame lerp and at 20 deg/frame the continuous model is simply
    //      a different system.
    // The fix is to stop modelling. `damp(a,b,lambda,dt)` closes a FRACTION of the distance to the
    // ideal, so measure that fraction directly — and get the ideal model-free, by letting the
    // camera converge to it:
    //   settle at bearing A -> `before`  ·  one single-frame yaw step to B -> `after`
    //   hold B and settle -> `ideal`     ·  closed = |after-before| / |ideal-before|
    // Linear by construction (the ideal is constant across the whole measurement), needs no
    // knowledge of chase()'s arithmetic, and the yaw rate on the measured frame is exactly
    // (B-A)/dt — which is the quantity JKA's stiffener reads.
    const stepLambda = (degPerSec) => {
      const R = 40, C = { x: 0, y: 30, z: 0 };
      const theta = degPerSec * D2R * DT;                     // the single-frame yaw step
      const at = (a) => ({ x: C.x + Math.cos(a) * R, y: 30, z: C.z + Math.sin(a) * R });
      const A = at(0), B = at(theta);
      settle(p, foe, C, A, 400);
      const bE = { x: w.camPos.x, y: w.camPos.y, z: w.camPos.z };
      const bL = { x: w.camTarget.x, y: w.camTarget.y, z: w.camTarget.z };
      pin(p, foe, C, B); step(1); pin(p, foe, C, B);
      const aE = { x: w.camPos.x, y: w.camPos.y, z: w.camPos.z };
      const aL = { x: w.camTarget.x, y: w.camTarget.y, z: w.camTarget.z };
      settle(p, foe, C, B, 500);
      const iE = { x: w.camPos.x, y: w.camPos.y, z: w.camPos.z };
      const iL = { x: w.camTarget.x, y: w.camTarget.y, z: w.camTarget.z };
      const frac = (b, a2, i) => {
        const den = Math.hypot(i.x - b.x, i.y - b.y, i.z - b.z);
        if (den < 0.05) return NaN;                            // no signal: refuse to invent one
        return Math.hypot(a2.x - b.x, a2.y - b.y, a2.z - b.z) / den;
      };
      const cE = frac(bE, aE, iE), cL = frac(bL, aL, iL);
      const lam = (c) => (Number.isFinite(c) && c > 0 && c < 0.999 ? -Math.log(1 - c) / DT : NaN);
      return { eye: lam(cE), look: lam(cL), closedEye: cE, closedLook: cL, stepDeg: theta * R2D };
    };
    const s400 = stepLambda(400), s1200 = stepLambda(1200), s2000 = stepLambda(2000), s3000 = stepLambda(3000);
    const m = (x) => (s400.eye > 0 ? x.eye / s400.eye : NaN);
    // ⚠ AND THE INSTRUMENT PROVES ITSELF BEFORE IT GRADES. If the 400 deg/s reference does not
    // reproduce the eye lambda C1 already fitted by an independent method, the whole C4 block is
    // measuring something else and its multipliers are decoration.
    add('C4-ref', "the C4 instrument reproduces C1's independently fitted eye lambda at 400 deg/s",
      Number.isFinite(s400.eye) && Math.abs(s400.eye - lamEye) < 0.35,
      `${s400.eye.toFixed(2)} /s vs C1's ${lamEye.toFixed(2)} /s`, 'within 0.35 /s',
      `single-frame step ${s400.stepDeg.toFixed(2)} deg, closed fraction ${s400.closedEye.toFixed(4)}`);
    add('C4a', "stiffener multiplier at 400 deg/s (inside JKA's dead zone: must be x1.00)",
      Math.abs(m(s400) - 1) < 0.02, m(s400).toFixed(3) + 'x', 'x1.00',
      `lambda_eff ${s400.eye.toFixed(2)} /s`);
    add('C4b', "stiffener multiplier at 1200 deg/s (past JKA's 1000 deg/s dead-zone edge)",
      m(s1200) > 1.02, m(s1200).toFixed(3) + 'x', '> x1.00',
      `lambda_eff ${s1200.eye.toFixed(2)} /s — THE STIFFENER IS NOT BUILT; Wave 1 owns dampStiff`);
    add('C4c', 'stiffener multiplier at 3000 deg/s >= the 2500 saturation value, monotonic',
      m(s3000) >= m(s2000) - 1e-3 && m(s3000) > 1.02,
      `2000 ${m(s2000).toFixed(3)}x, 3000 ${m(s3000).toFixed(3)}x`, 'monotonic and > x1.00');

    // ---------------------------------------------------------------------------------------
    // C5 — FLICK RESIDUAL. A 180 deg discontinuity of the camera's own axis, driven the only way
    // this camera can be driven: the target jumps to the far side. Residual read at t+0.25s.
    // ---------------------------------------------------------------------------------------
    const flickResidual = () => {
      const C = { x: 0, y: 30, z: 0 };
      const Fa = { x: 40, y: 30, z: 0 }, Fb = { x: -40, y: 30, z: 0 };
      settle(p, foe, C, Fa, 300);
      for (let i = 0; i < Math.round(0.25 / DT); i++) { pin(p, foe, C, Fb); step(1); pin(p, foe, C, Fb); }
      const got = camForward(w.camera);
      settle(p, foe, C, Fb, 500);
      const ideal = camForward(w.camera);
      const dot = clamp(got.x * ideal.x + got.y * ideal.y + got.z * ideal.z, -1, 1);
      return Math.acos(dot) * R2D;
    };
    const flick = flickResidual();
    // ⚠ TODAY THIS IS THE KNOWN-BAD CONDITION BY CONSTRUCTION — there is no stiffener to switch off.
    // It is graded against the stiffened bar and FAILS, with the real number, rather than excused.
    add('C5', 'flick residual 0.25s after a 180 deg axis discontinuity',
      flick < BANDS.C5_STIFF, flick.toFixed(2) + ' deg', `< ${BANDS.C5_STIFF} deg`,
      'no stiffener exists yet: this row measures the rubric\'s own known-bad state');

    // ---------------------------------------------------------------------------------------
    // C7 — CONTINUITY ACROSS A TAKEOFF. "The camera never cuts", as a number: no single frame may
    // move any of the four framing quantities by more than 3% of that quantity's own range.
    // The climb is scripted on the SUBJECT's position (the camera's real input), 0 -> 20u of
    // ground clearance, and every frame is sampled.
    // ---------------------------------------------------------------------------------------
    {
      const C0 = { x: 0, y: 0, z: 0 }, FF = { x: 40, y: 0, z: 0 };
      settle(p, foe, C0, FF, 260);
      let pFov = w._chaseFov, pDist = w._chaseDist, pEye = w.camPos.y - p.pos.y;
      let mFov = 0, mDist = 0, mEye = 0;
      const N = 120;
      for (let i = 1; i <= N; i++) {
        const y = (i / N) * 20;
        const pp = { x: 0, y, z: 0 };
        pin(p, foe, pp, FF); step(1); pin(p, foe, pp, FF);
        mFov = Math.max(mFov, Math.abs(w._chaseFov - pFov));
        mDist = Math.max(mDist, Math.abs(w._chaseDist - pDist));
        mEye = Math.max(mEye, Math.abs((w.camPos.y - p.pos.y) - pEye));
        pFov = w._chaseFov; pDist = w._chaseDist; pEye = w.camPos.y - p.pos.y;
      }
      const fovRange = 16, distRange = 86 - 24, eyeRange = 86 * 0.30;   // world.js:2248, :2287, :2308
      add('C7a', 'max per-frame FOV step across a takeoff', mFov / fovRange < BANDS.C7,
        (100 * mFov / fovRange).toFixed(2) + '% of range', '< 3% of range', `${mFov.toFixed(3)} deg of a ${fovRange} deg range`);
      add('C7b', 'max per-frame chase-distance step across a takeoff', mDist / distRange < BANDS.C7,
        (100 * mDist / distRange).toFixed(2) + '% of range', '< 3% of range', `${mDist.toFixed(3)}u of a ${distRange}u range`);
      add('C7c', 'max per-frame eye-height step across a takeoff', mEye / eyeRange < BANDS.C7,
        (100 * mEye / eyeRange).toFixed(2) + '% of range', '< 3% of range', `${mEye.toFixed(3)}u of a ${eyeRange.toFixed(1)}u range`);
    }

    // ---------------------------------------------------------------------------------------
    // C-SHAKE (rubric §1.2 footnote, measured here): with `_shake` driven to its clamp of 8
    // through `world.shake()`, the camera must deviate by an ANGLE and by ZERO position.
    // ---------------------------------------------------------------------------------------
    {
      const C0 = { x: 0, y: 30, z: 0 }, FF = { x: 40, y: 30, z: 0 };
      settle(p, foe, C0, FF, 260);
      const restDir = camForward(w.camera);
      const restPos = { x: w.camera.position.x, y: w.camera.position.y, z: w.camera.position.z };
      let peakAng = 0, peakPos = 0, peakStep = 0;
      let prev = { ...restDir };
      for (let i = 0; i < 24; i++) {
        w.shake && w.shake(20);                     // drive it hard; chase clamps _shake's effect
        w._shake = Math.max(w._shake || 0, 8);      // the clamp value the rubric names
        pin(p, foe, C0, FF); step(1); pin(p, foe, C0, FF);
        const d = camForward(w.camera);
        peakAng = Math.max(peakAng, Math.acos(clamp(d.x * restDir.x + d.y * restDir.y + d.z * restDir.z, -1, 1)) * R2D);
        peakStep = Math.max(peakStep, Math.acos(clamp(d.x * prev.x + d.y * prev.y + d.z * prev.z, -1, 1)) * R2D);
        prev = d;
        peakPos = Math.max(peakPos, Math.hypot(
          w.camera.position.x - restPos.x, w.camera.position.y - restPos.y, w.camera.position.z - restPos.z));
      }
      add('CS-a', 'shake is ANGULAR only — camera POSITION deviation', peakPos < 0.05,
        peakPos.toFixed(4) + 'u', '0.00u (angular shake only)');
      add('CS-b', 'peak angular deviation at _shake = 8', peakAng <= 1.25,
        peakAng.toFixed(3) + ' deg', '<= 1.25 deg');
      add('CS-c', 'peak per-frame angular step at _shake = 8', peakStep <= 1.35,
        peakStep.toFixed(3) + ' deg', '<= 1.35 deg');
      w._shake = 0;
    }

    // ---------------------------------------------------------------------------------------
    // C6 — CLIP-THROUGH. ⚠ RUN IT IN A CITY OR IT CANNOT FAIL.
    // ---------------------------------------------------------------------------------------
    await c6(p, foe);
  }

  // ===============================================================================================
  async function c6(pIgnored, fIgnored) {
    const w = game.world;
    const wantCity = opts.city !== false;
    let coverN = (w.cover || []).length;

    if (wantCity && coverN < 40) {
      // Try to raise a real generated city. Imports here are DATA/PLANNER modules with no mutable
      // state, so the phantom-module law does not bite: nothing below reads engine state through
      // them, they only produce a plain plan object which is handed to the LIVE world.
      try {
        const [{ cityList }, { generatePlan }] = await Promise.all([
          import('../data/cities.js'), import('../data/cityplan.js'),
        ]);
        const all = cityList();
        // the biggest thing on the sheet — 8x8, 79-99 cover pieces (CLAUDE.md, THE DENSITY CAP)
        const city = all.find((c) => c.name === (opts.cityName || 'Tokyo')) ||
                     all.find((c) => c.popType === 'Mega City') || all[0];
        const plan = generatePlan(city, opts.seed ?? 7, { popType: 'Mega City' });
        w.rebuildCity(plan);
        coverN = (w.cover || []).length;
        notes.push(`C6 raised a city: ${plan.name} (${coverN} cover pieces)`);
      } catch (e) {
        notes.push('C6 could not raise a city: ' + ((e && e.message) || e));
      }
    }

    if (coverN < 40) {
      add('C6', 'camera clip-through count over a live fight', 'context',
        `${coverN} cover pieces`, '0 violations in a Mega City (79-99 pieces)',
        'NO CITY AVAILABLE — in the open desert this count is 0 for a reason that has nothing to do with the camera, so it cannot fail. Not a pass.');
      return;
    }

    // a real fight, in the city, with the chase camera forced on. `chaseCam` is a MODE flag the
    // engine already reads — setting it drives the real `world.chase`, it does not fake anything.
    closeDoor();
    game.running = true; game.world.render = () => {};
    game.startMode('duel', { p1: opts.p1 || 'sol', p2: opts.p2 || 'rage', enemy: opts.p2 || 'rage' });
    if (game.news) game.news.enabled = false;
    game.ms = game.ms || {};
    game.ms.chaseCam = true;
    const p = game.humans[0] && game.humans[0].fighter;
    if (!p) { add('C6', 'camera clip-through', false, 'no player', '0 violations'); return; }
    const foe2 = game.entities.find((e) => e && e.def && e.team !== p.team && !e.isDummy && !e.def.police);
    // ⚠ SOMEBODY HAS TO DRIVE, AND THE PLAYER HAS NO `ai` BY DEFAULT. The first C6 run reported
    // 0 violations of 3600 frames with a SMALLEST CLEARANCE OF 32.66u — the camera never went near
    // a building, because `controlBot(game.player)` returns immediately for a fighter with no AI
    // and the player stood still for a minute. That is a vacuous 0, and the C6-exercised row below
    // is what makes it impossible to report one again.
    const { AI } = await import('../engine/ai.js');
    if (!p.ai) p.ai = new AI(p, 1.25);
    if (foe2 && !foe2.ai) foe2.ai = new AI(foe2, 1.25);
    // both immortal: the subject is the CAMERA over a long fight, and a KO ends the duel and puts
    // an end screen over the page a third of the way through the sample.
    p.invuln = 1e9; if (foe2) foe2.invuln = 1e9;
    // AI on BOTH sides — but the SUBJECT is the camera, not whether they feel like fighting
    // (trap 9): the pass/fail is a geometric test on every frame regardless of what the bots do.
    game.controlPlayer = (dt) => game.controlBot(game.player, dt);
    // ⚠ AND THE MATCH MUST NOT BE ALLOWED TO END UNDER THE MEASUREMENT. A KO fires `endMatch`,
    // which builds the KMK 9 broadcast report and puts a full-screen end screen over the page —
    // one run of this check died there with no output at all. The subject is the camera over a
    // long fight, so the fight is simply not allowed to finish; both are restored below.
    const prevEnd = game.endMatch;
    game.endMatch = () => {};

    // ⚠ STAND THE FIGHT WHERE THE BUILDINGS ARE. A duel spawned by the mode picks open ground, and
    // the first honest run of this check reported 139 violations that were ALL the camera dipping
    // under the terrain while it never once came within 8u of a cover box — a real number about the
    // ground and no test at all of the thing C6 is named for. Both fighters start at the foot of
    // the tallest structure on the map; where they go from there is the AI's business.
    let tall = null;
    for (const co of w.cover) {
      const top = co && (co.top ?? co.h);
      if (!(top > 0)) continue;
      if (!tall || top > (tall.top ?? tall.h)) tall = co;
    }
    if (tall) {
      const hx = tall.hx ?? tall.r ?? 10, hz = tall.hz ?? tall.r ?? 10;
      const gy = w.heightAt ? w.heightAt(tall.x + hx + 14, tall.z) : 0;
      p.pos.set(tall.x + hx + 14, gy + 1, tall.z);
      if (foe2) foe2.pos.set(tall.x + hx + 26, (w.heightAt ? w.heightAt(tall.x + hx + 26, tall.z + 8) : 0) + 1, tall.z + 8);
      notes.push(`C6 staged at the tallest structure: top ${(tall.top ?? tall.h).toFixed(0)}u at (${tall.x.toFixed(0)}, ${tall.z.toFixed(0)})`);
    }

    const PAD = camPad(w);
    let frames = 0, violations = 0, worstDepth = 0, minClear = 1e9, worstFrame = null;
    let nearFrames = 0, travelled = 0, maxJump = 0, nCover = 0, nInterior = 0, nGround = 0;
    let lastP = { x: p.pos.x, y: p.pos.y, z: p.pos.z };
    const N = opts.c6Frames || 3600;
    for (let i = 0; i < N; i++) {
      step(1); frames++;
      // ⚠ CLAMP THE PER-FRAME CONTRIBUTION. A respawn or an arena clamp is a TELEPORT, and summing
      // those raw reported 809,733u of "travel" in one minute (13,500 u/s) — a number that would
      // have made the anti-vacuous guard below meaningless while looking like a strong pass.
      const d1 = Math.hypot(p.pos.x - lastP.x, p.pos.y - lastP.y, p.pos.z - lastP.z);
      maxJump = Math.max(maxJump, d1);
      travelled += Math.min(d1, 20);
      lastP = { x: p.pos.x, y: p.pos.y, z: p.pos.z };
      // keep both on their feet so the camera keeps being exercised for the whole sample
      if (p.hp < p.maxHp * 0.5) p.hp = p.maxHp;
      if (foe2 && foe2.hp < foe2.maxHp * 0.5) foe2.hp = foe2.maxHp;
      const c = w.camera.position;
      // ⚠ THREE COUNTS, NOT ONE. The first version reported a single number and the run came back
      // "59 violations, 0 frames anywhere near a building" — a contradiction that took a while to
      // read, because every one of those 59 was the camera dipping under the TERRAIN, nowhere near
      // a cover box. A clip-through count that cannot say WHAT was clipped cannot be acted on.
      let coverPen = 0, interiorPen = 0, groundPen = 0, clear = 1e9;
      for (const co of w.cover) {
        if (!co || co.hidden) continue;
        const hx = (co.hx ?? co.r), hz = (co.hz ?? co.r), top = (co.top ?? co.h);
        if (hx == null || hz == null || !(top > 0)) continue;      // a half-filled record (aaa-04 §3.2)
        const y0 = co.y0 ?? 0;
        const dx = (hx + PAD) - Math.abs(c.x - co.x);
        const dz = (hz + PAD) - Math.abs(c.z - co.z);
        const dy = Math.min((top + PAD) - c.y, c.y - (y0 - PAD));
        const pen = Math.min(dx, dy, dz);
        if (pen > 0) coverPen = Math.max(coverPen, pen);
        // the clearance is tracked for EVERY box whether or not this one is penetrated, or a frame
        // that clips one wall reports itself as nowhere near any geometry.
        if (-pen < clear) clear = -pen;
      }
      for (const it of (w.interiors || [])) {
        const top = it.top ?? it.h; if (!(top > 0) || c.y > top + PAD) continue;
        for (const wl of it.walls || []) {
          const dx = (wl.hx + PAD) - Math.abs(c.x - wl.x);
          const dz = (wl.hz + PAD) - Math.abs(c.z - wl.z);
          const pen = Math.min(dx, dz, (top + PAD) - c.y);
          if (pen > 0) interiorPen = Math.max(interiorPen, pen);
        }
      }
      const gy = w.heightAt ? w.heightAt(c.x, c.z) : 0;
      if (c.y < gy + PAD) groundPen = gy + PAD - c.y;

      if (coverPen > 0) nCover++;
      if (interiorPen > 0) nInterior++;
      if (groundPen > 0) nGround++;
      const depth = Math.max(coverPen, interiorPen, groundPen);
      if (depth > 0) {
        violations++;
        if (depth > worstDepth) {
          worstDepth = depth;
          worstFrame = { i, x: +c.x.toFixed(2), y: +c.y.toFixed(2), z: +c.z.toFixed(2), depth: +depth.toFixed(2),
            what: coverPen >= interiorPen && coverPen >= groundPen ? 'cover' : interiorPen >= groundPen ? 'interior' : 'ground' };
        }
      }
      if (clear < minClear) minClear = clear;
      if (clear < 8) nearFrames++;
    }

    // ⚠ THE ANTI-VACUOUS GUARD FOR C6, AND IT IS THE ONE THIS CHECK CANNOT DO WITHOUT. A camera that
    // spends a minute in open sky above a city clips through nothing, and reports a confident zero.
    // The count only means something if the camera was ever CLOSE to the geometry it is being tested
    // against.
    add('C6-exercised', 'the camera actually came near the city geometry (anti-vacuous)',
      nearFrames > 0 && travelled > 100,
      `${nearFrames} frames within 8u of a cover box; player travelled ${travelled.toFixed(0)}u (largest single-frame jump ${maxJump.toFixed(1)}u)`,
      '> 0 near frames and > 100u travelled',
      'a 0 from a camera that never approached a building is not a pass');

    game.endMatch = prevEnd;
    add('C6', 'camera clip-through count (inside cover / interiors / under the ground)',
      violations === 0, `${violations} of ${frames} frames`, '0 violations',
      `cover ${nCover} / interior ${nInterior} / under-ground ${nGround}; worst penetration ${worstDepth.toFixed(2)}u; closest approach ${minClear === 1e9 ? 'n/a' : minClear.toFixed(2) + 'u'} (negative = inside); CAM_PAD ${PAD.toFixed(2)}u derived from near ${w.camera.near}`);
    if (worstFrame) notes.push('C6 worst frame: ' + JSON.stringify(worstFrame) + ' — screenshot this one');
  }
}

// =================================================================================================
// THE KNOWN-BAD INJECTIONS. Each returns an UNDO function. They exist so the integration step can
// show this suite going red, because "a verdict from an unproven harness is INADMISSIBLE, not
// merely failed" (aaa-08 §5). They are bench-local wrappers around `world.chase` and are never
// left installed.
// =================================================================================================

/**
 * ⚠ THE INVERTED INJECTION, AND IT IS THE HONEST ONE FOR TODAY. The rubric's camera known-bad is
 * "force `stiff = 0`" — but `dampStiff` does not exist yet, so the SHIPPED camera already IS
 * stiff = 0 and C4/C5 already read the bad number. Turning something off that is already off
 * proves nothing.
 *
 * So this installs the KNOWN-GOOD instead: a bench-local stiffener applied to the eye and look
 * channels exactly as `openjk.md:228-234` specifies, on the closed FRACTION. If C5's residual does
 * not collapse when this is installed, the gauge cannot see a stiffener and is blind.
 */
export function injectStiffener(game) {
  const w = game.world;
  const real = w.chase.bind(w);
  let lastYaw = null;
  w.chase = function (subject, target, dt) {
    // JKA's own quantity: |Δ yaw| of the focus, per millisecond.
    const S = subject.pos;
    let ax, az;
    if (target) { ax = target.pos.x - S.x; az = target.pos.z - S.z; }
    else { ax = Math.sin(subject.facing); az = Math.cos(subject.facing); }
    const yaw = Math.atan2(az, ax) * 180 / Math.PI;
    let stiff = 0;
    if (lastYaw !== null && dt > 0) {
      let d = Math.abs(yaw - lastYaw); if (d > 180) d = Math.abs(d - 360);
      const rate = d / (dt * 1000);                    // deg per ms — JKA's units exactly
      stiff = rate < 1 ? 0 : rate > 2.5 ? 0.75 : (rate - 1) * 0.5;
    }
    lastYaw = yaw;
    const beforeT = { x: w.camTarget.x, y: w.camTarget.y, z: w.camTarget.z };
    const beforeP = { x: w.camPos.x, y: w.camPos.y, z: w.camPos.z };
    real(subject, target, dt);
    if (stiff > 0) {
      // ⚠ `dampfactor += (1-dampfactor)*stiff` closes `stiff` of the REMAINING lag. Applied to the
      // already-damped result, closing that extra fraction means travelling further along the SAME
      // step this frame — at λ 8 / 60fps the frame closes 0.125, and the stiffened frame closes
      // 0.781, i.e. 6.25x the step. The 6x here is that ratio at full stiffening, scaled by `k`.
      const k = stiff / 0.75;                 // 0..1 across JKA's own 1.0 -> 2.5 deg/ms window
      w.camTarget.x = beforeT.x + (w.camTarget.x - beforeT.x) * (1 + k * 6);
      w.camTarget.y = beforeT.y + (w.camTarget.y - beforeT.y) * (1 + k * 6);
      w.camTarget.z = beforeT.z + (w.camTarget.z - beforeT.z) * (1 + k * 6);
      w.camPos.x = beforeP.x + (w.camPos.x - beforeP.x) * (1 + k * 6);
      w.camPos.y = beforeP.y + (w.camPos.y - beforeP.y) * (1 + k * 6);
      w.camPos.z = beforeP.z + (w.camPos.z - beforeP.z) * (1 + k * 6);
      w.camera.position.set(w.camPos.x, w.camPos.y, w.camPos.z);
      w.camera.lookAt(w.camTarget.x, w.camTarget.y, w.camTarget.z);
    }
    return undefined;
  };
  return () => { w.chase = real; };
}

/**
 * The other direction: cripple the damping so C1/C2/C5 go far out of band. This proves the gauge is
 * sensitive in the FAILING direction as well — a fit that returns ~8 whatever the camera does would
 * pass C1 forever.
 */
export function injectLimpCamera(game, lambdaScale = 0.08) {
  const w = game.world;
  const real = w.chase.bind(w);
  w.chase = function (subject, target, dt) { return real(subject, target, dt * lambdaScale); };
  return () => { w.chase = real; };
}

/**
 * C6's known-bad: shrink the pad to nothing AND drop the camera onto the subject's own position for
 * a fraction of frames, i.e. exactly what a chase camera with no trace does in a dense city. Used
 * to show the violation counter is counting something real rather than always returning 0.
 */
export function injectCameraIntoGeometry(game) {
  const w = game.world;
  const real = w.chase.bind(w);
  w.chase = function (subject, target, dt) {
    real(subject, target, dt);
    // ⚠ PUT THE EYE INSIDE A BOX, NOT ON THE FIGHTER. The first version parked the camera at the
    // subject's own chest and produced ZERO violations — because physics keeps a fighter OUT of
    // solid geometry, so "where the player is standing" is the one place guaranteed to be clear.
    // An injection that cannot break the check does not prove the check works.
    let best = null, bd = Infinity;
    for (const co of w.cover) {
      const top = co && (co.top ?? co.h); if (!(top > 0)) continue;
      const d = Math.hypot(co.x - subject.pos.x, co.z - subject.pos.z);
      if (d < bd) { bd = d; best = co; }
    }
    if (!best) return;
    const top = best.top ?? best.h, y0 = best.y0 ?? 0;
    w.camPos.set(best.x, (y0 + top) * 0.5, best.z);
    w.camera.position.set(w.camPos.x, w.camPos.y, w.camPos.z);
  };
  return () => { w.chase = real; };
}

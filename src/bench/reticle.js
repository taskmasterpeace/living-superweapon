// =================================================================================================
// THE RETICLE GAUGE — R1..R5 of `docs/powerworld/aaa-08-rubric.md` §1.3, and checks 0..14 of
// `docs/powerworld/aaa-05-reticle.md` §10.3.
//
//     await (await import('/src/bench/reticle.js')).reticleSuite(LSW.game, LSW.hud)
//
// WAVE 0. ⚠ NOTHING HERE CHANGES THE GAME. It reads `p.aim3`, `p.muzzle()`, `game._aim3pt` and the
// real DOM position of `#hCross`, and it lets the REAL `controlPlayer` compute the aim. It edits no
// engine file.
//
// -------------------------------------------------------------------------------------------------
// THE INVARIANT (aaa-05 §10.1) — a RELATIONSHIP, which is what makes it survive a re-tune:
//
//   Every frame, in every aim state, the ray from the player's real muzzle along the player's real
//   `aim3` passes within N of the world point the crosshair is drawn at.
//
// -------------------------------------------------------------------------------------------------
// ⚠ WHAT "THE WORLD POINT THE CROSSHAIR IS DRAWN AT" MEANS TODAY, AND WHY IT HAD TO BE DEFINED
// BEFORE ANYTHING COULD BE MEASURED.
//
// Today `#hCross` is a CSS element pinned to screen centre (hud.styles.js:971-974) and there is no
// trace behind it — so it marks a DIRECTION, not a point. A direction cannot be compared against a
// ray. The definition used here, and it is the one the fix will make literally true:
//
//   P = the point on the camera ray through the crosshair's DRAWN screen position, at the range of
//       the thing the player is aiming at.
//
// Two things are load-bearing about that:
//   · the screen position is READ FROM THE DOM (`#hCross`.getBoundingClientRect()), never assumed
//     to be the centre. A miss measured against a point the crosshair is not drawn at measures
//     nothing (aaa-05 §10.3), and the element is `width:0;height:0` at `left:50%`, so its rect IS
//     its drawn position.
//   · the RANGE is the target's own range along that ray. Under the fix P is the trace hit and the
//     range falls out; today there is no trace, so the range is supplied by the target and the
//     comparison happens where the fight is. ⚠ The alternative — the closest approach of the two
//     rays over all t — is the WRONG instrument: they are 0.38 deg from parallel, so that minimum
//     lands hundreds of units BEHIND the camera (measured t = -958 at a 100u gap by
//     `reticle-predict.mjs`). A number minimised behind the player's head is not a miss.
//
// This definition is shared, exactly, with `predictMissAtRange` in `reticle-predict.mjs`, which is
// why check 0 can compare the browser against a pure-node reference that shares no engine code.
// -------------------------------------------------------------------------------------------------
// ⚠ THE HARNESS TRAPS PAID FOR EXPLICITLY (aaa-08 §5.4):
//   · `game.update` runs from the page's rAF loop unconditionally — stubbed, the real one called by
//     hand, restored in a `finally`.
//   · `controlPlayer` is NOT stubbed here, and that is deliberate: it is the SUBJECT. Nothing in
//     this file writes `aim`, `aim3`, `a3`, `aimPoint` or `facing`.
//   · Fighters are picked by TEAM and def id, never by index.
//   · Both bodies are pinned to ABSOLUTE positions every frame.
//   · Camera SETTLEMENT is asserted (|dCamPos| < 0.05u), never assumed from a frame count.
//   · The predictor is imported as a stateless pure-node module; live state is read only through
//     the `game`/`hud` handed in (the phantom-module law).
// =================================================================================================

import { predictMiss, predictMissAtRange, N_EXACT, N_HIT } from './reticle-predict.mjs';

const DT = 1 / 60;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const R2D = 180 / Math.PI;
/** A THREE-shaped out-vector with nothing but what the engine's writers call. */
const vec3 = () => ({ x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } });

/** The eight gaps R1 is graded at (rubric §1.3). */
export const GAPS = [10, 16, 24, 32, 40, 52, 70, 100];

// =================================================================================================
export async function reticleSuite(game, hud, opts = {}) {
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
  const prevMouse = { x: game.input.mouse.clientX, y: game.input.mouse.clientY };

  const add = (id, what, pass, measured, bar, note) => {
    const row = { id, what, measured: String(measured), bar: String(bar), pass: pass === true, note: note || '' };
    if (pass === 'context') { row.pass = null; row.verdict = 'NEEDS-CONTEXT'; }
    rows.push(row);
    if (row.pass === false) failures.push(`${id} ${what}: measured ${row.measured}, bar ${row.bar}${note ? ' — ' + note : ''}`);
    return row;
  };

  // ⚠ own the clock. `controlPlayer` is left ALONE — it is the thing under test.
  game.update = () => {};
  try {
    await run();
  } catch (e) {
    failures.push('THREW: ' + ((e && e.message) || e));
    errs.push(String((e && e.stack) || e).slice(0, 500));
  } finally {
    game.update = realUpdate;
    game.controlPlayer = prevControl;
    game.running = prevRunning;
    game.world.render = prevRender;
    if (game.news && prevNews !== null) game.news.enabled = prevNews;
    game.input.mouse.clientX = prevMouse.x; game.input.mouse.clientY = prevMouse.y;
    console.error = oldErr;
  }

  return { lane: 'G-VIEW / reticle', checks: rows.length, failures, rows, notes, consoleErrors: errs };

  // ===============================================================================================
  function step(n = 1) { for (let i = 0; i < n; i++) realUpdate(DT); }

  /**
   * ⚠ SHUT THE FRONT DOOR THROUGH THE DOOR'S OWN API. `hud.hideTitle()` closes the WAR WORLD
   * title (`#title`); the PowerWorld page's door is `#pwTitle`, mounted by `engine/pwTitle.js`,
   * and `pw-main.js:41` exposes `PW.door()` calling it "the headless seam: drive the real front
   * door, not the internals". A full-screen opaque layer left up is exactly what `tools/shoot.mjs`
   * refuses a run for, and it also eats the synthetic pointer this suite parks on a body.
   */
  function closeDoor() {
    try { hud.hideTitle && hud.hideTitle(); } catch (e) {}
    try {
      const h = typeof window !== 'undefined' && (window.PW || window.LSW);
      const d = h && typeof h.door === 'function' && h.door();
      if (d && d.close) d.close();
    } catch (e) {}
  }

  function stand(p1 = 'sol', p2 = 'rage') {
    closeDoor();
    game.running = true;
    game.world.render = () => {};
    game.startMode('powerworld', { p1, p2, enemy: p2 });
    if (game.news) game.news.enabled = false;
    const p = game.humans[0] && game.humans[0].fighter;
    const foe = game.entities.find((e) => e && e.def && e.def.id === p2 && e !== p && e.team !== (p && p.team));
    if (foe) { foe.ai = null; foe.invuln = 1e9; }
    if (p) p.invuln = 1e9;
    return { p, foe };
  }

  function pin(p, foe, pp, fp) {
    p.pos.set(pp.x, pp.y, pp.z); p.vel.set(0, 0, 0); p.flying = true; p.staggerT = 0; p.launchT = 0;
    foe.pos.set(fp.x, fp.y, fp.z); foe.vel.set(0, 0, 0); foe.flying = true; foe.staggerT = 0; foe.launchT = 0;
  }

  function settle(p, foe, pp, fp, n = 160) {
    for (let i = 0; i < n; i++) { pin(p, foe, pp, fp); step(1); }
    pin(p, foe, pp, fp);
  }

  function settleResidual(p, foe, pp, fp) {
    const w = game.world;
    const a = { x: w.camPos.x, y: w.camPos.y, z: w.camPos.z };
    pin(p, foe, pp, fp); step(1); pin(p, foe, pp, fp);
    return Math.hypot(w.camPos.x - a.x, w.camPos.y - a.y, w.camPos.z - a.z);
  }

  /** The crosshair's DRAWN position in CSS pixels — read from the element, never assumed. */
  function crosshairPx() {
    const el = typeof document !== 'undefined' && document.getElementById('hCross');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const style = typeof getComputedStyle === 'function' ? getComputedStyle(el) : null;
    return {
      x: r.left + r.width / 2, y: r.top + r.height / 2,
      visible: !style || (style.display !== 'none' && style.visibility !== 'hidden'),
      w: r.width, h: r.height,
    };
  }

  /** The camera ray through a CSS pixel. Written out rather than imported so this file has no
   *  dependency on THREE and cannot pick up a second instance of it. */
  function cameraRayThrough(px, py) {
    const cam = game.world.camera;
    const ndcx = (px / innerWidth) * 2 - 1, ndcy = -(py / innerHeight) * 2 + 1;
    cam.updateMatrixWorld();
    // unproject two points on the ray and subtract — works for perspective and ortho alike, and
    // needs nothing but the camera's own matrices.
    const near = unproject(cam, ndcx, ndcy, -1), far = unproject(cam, ndcx, ndcy, 1);
    let d = { x: far.x - near.x, y: far.y - near.y, z: far.z - near.z };
    const L = Math.hypot(d.x, d.y, d.z) || 1; d = { x: d.x / L, y: d.y / L, z: d.z / L };
    return { o: { x: cam.position.x, y: cam.position.y, z: cam.position.z }, d };
  }
  function unproject(cam, x, y, z) {
    const v = { x, y, z, w: 1 };
    const a = applyMat4(v, cam.projectionMatrixInverse.elements);
    const b = applyMat4(a, cam.matrixWorld.elements);
    return b;
  }
  function applyMat4(v, e) {
    const w = 1 / (e[3] * v.x + e[7] * v.y + e[11] * v.z + e[15]);
    return {
      x: (e[0] * v.x + e[4] * v.y + e[8] * v.z + e[12]) * w,
      y: (e[1] * v.x + e[5] * v.y + e[9] * v.z + e[13]) * w,
      z: (e[2] * v.x + e[6] * v.y + e[10] * v.z + e[14]) * w,
    };
  }

  /**
   * THE MEASUREMENT. Returns everything a row needs, so no row re-derives anything.
   * `atPoint` is the world point whose RANGE along the camera ray sets where P sits — the foe's
   * centre for a static check, the aim point's own target for a live one.
   */
  function measure(p, atPoint) {
    const w = game.world;
    const cross = crosshairPx();
    if (!cross) return null;
    const ray = cameraRayThrough(cross.x, cross.y);
    // the shot ray — the REAL muzzle along the REAL aim3, both read, neither written.
    // ⚠ `muzzle(out, fwd, h)` WRITES INTO `out` (entity.js:317-318); it does not return a new
    // vector. A plain object with a `set` is all it needs, and using one keeps THREE out of here.
    const M = p.muzzle(vec3());
    const s = { x: p.aim3.x, y: p.aim3.y, z: p.aim3.z };
    const sl = Math.hypot(s.x, s.y, s.z) || 1; s.x /= sl; s.y /= sl; s.z /= sl;
    const perpTo = (P) => {
      const v = { x: P.x - M.x, y: P.y - M.y, z: P.z - M.z };
      const u = v.x * s.x + v.y * s.y + v.z * s.z;
      return Math.hypot(v.x - s.x * u, v.y - s.y * u, v.z - s.z * u);
    };
    const onRay = (t) => ({ x: ray.o.x + ray.d.x * t, y: ray.o.y + ray.d.y * t, z: ray.o.z + ray.d.z * t });
    const rangeOf = (pt) => (pt.x - ray.o.x) * ray.d.x + (pt.y - ray.o.y) * ray.d.y + (pt.z - ray.o.z) * ray.d.z;

    // ---- THE GRADED NUMBER — evaluated at the AIM POINT'S OWN RANGE, and it has to be. ----------
    // ⚠ THIS IS THE ONE DEFINITION DECISION IN THE FILE AND IT WAS GOT WRONG FIRST TIME. Evaluating
    // at the FOE's range asks "does the shot pass near the point the crosshair marks *at the enemy's
    // distance*" — which cannot reach zero even for a perfectly convergent aim whenever the crosshair
    // is not on the enemy, because two rays meeting at range A are still apart at range B. Measured:
    // a convergent-aim injection dropped the 100u miss 8.70 -> 1.41 and stuck there, and the residual
    // was entirely the range mismatch, not the aim.
    // The invariant (aaa-05 §4.3) is about ONE WORLD POINT: the shot is aimed at the aim point and
    // the crosshair is drawn at its projection. So the honest question is whether the aim point lies
    // on the camera ray through the drawn crosshair — i.e. compare AT THE AIM POINT'S OWN RANGE.
    // Today that reduces to the parallax, because the two rays are parallel; under the fix it is 0
    // by construction, which is exactly what makes it gradeable.
    const ap = game._aim3pt;
    const tA = Math.max(1, rangeOf(ap));
    const miss = perpTo(onRay(tA));

    // ---- THE REFERENCE NUMBER — at the TARGET's range, which is what reticle-predict.mjs computes
    // and what the published aaa-05 §2.3 table is. Kept so check 0 compares like with like.
    const missAtTarget = atPoint ? perpTo(onRay(Math.max(1, rangeOf(atPoint)))) : NaN;

    // and where the engine's own aim point projects, against where the crosshair is drawn
    const sp = w.screenPosOf(ap.x, ap.y, ap.z, { x: 0, y: 0, behind: false });
    const px = Math.hypot(sp.x - cross.x, sp.y - cross.y);
    return { miss, missAtTarget, aimRange: tA, P: onRay(tA), M, s, crossPx: cross, aimPx: px,
             behind: sp.behind, camDist: w._chaseDist, fov: w._chaseFov };
  }

  /** Where the foe's body projects, in px from the crosshair — §3.2's lie, as a number. */
  function foePx(foe) {
    const cross = crosshairPx(); if (!cross) return NaN;
    const sp = game.world.screenPosOf(foe.pos.x, foe.pos.y + 5.2, foe.pos.z, { x: 0, y: 0, behind: false });
    return sp.behind ? NaN : Math.hypot(sp.x - cross.x, sp.y - cross.y);
  }

  /** Put the foe at a gap and an elevation and settle. Returns the measurement or null. */
  function pose(p, foe, gap, elevDeg = 0, base = { x: 0, y: 60, z: 0 }) {
    const a = elevDeg * Math.PI / 180;
    const fp = { x: base.x + Math.cos(a) * gap, y: base.y + Math.sin(a) * gap, z: base.z };
    settle(p, foe, base, fp, opts.settleFrames || 160);
    const res = settleResidual(p, foe, base, fp);
    const m = measure(p, { x: foe.pos.x, y: foe.pos.y + 5.2, z: foe.pos.z });
    return m ? { ...m, settleResidual: res, gap, elevDeg, foePx: foePx(foe) } : null;
  }

  // ===============================================================================================
  async function run() {
    const w = game.world;

    // ------------------------------------------------------------------------------------------
    // R0 — THE HARNESS PROVES ITSELF FIRST (aaa-05 §10.3 LAW 4, aaa-08 §5.2).
    // ------------------------------------------------------------------------------------------
    const { p, foe } = stand(opts.p1 || 'sol', opts.p2 || 'rage');
    add('R0a', 'a player and a distinct foe exist, picked by team not index',
      !!(p && foe && p.team !== foe.team), p && foe ? `${p.def.id} vs ${foe.def.id}` : 'MISSING', 'two opposing fighters');
    if (!p || !foe) { notes.push('no fight — every reticle row below is void'); return; }

    add('R0b', 'the player is under an open sky (the _openSky aim branch is the subject)',
      !!p._openSky, String(!!p._openSky), 'true');

    // ⚠ THE ANTI-VACUOUS GUARD, AND IT IS THE ONE THAT MATTERS MOST HERE. If `#hCross` is missing or
    // hidden, "the point the crosshair is drawn at" is fiction and every miss below is a number
    // about nothing. CLAUDE.md: `[].every()` is true.
    const cross0 = crosshairPx();
    add('R0c', 'the crosshair element EXISTS and is being drawn',
      !!(cross0 && cross0.visible), cross0 ? `at (${cross0.x.toFixed(1)}, ${cross0.y.toFixed(1)}) visible=${cross0.visible}` : 'NO #hCross',
      'present and visible',
      'if this is red every miss below is measured against a mark nobody can see');

    // ⚠ THE MOUSE. `pickTarget` measures from `input.mouse.clientX/Y` (game.js:1486) — which is the
    // §3.1 lie — so where the synthetic cursor sits decides whether the free-aim branch is even
    // reached. Park it in the corner and then ASSERT the branch that was taken, rather than hoping.
    game.input.mouse.clientX = 2; game.input.mouse.clientY = 2;

    const m0 = pose(p, foe, 40);
    add('R0d', 'the camera SETTLED before any miss was read (|dCamPos| per frame)',
      !!m0 && m0.settleResidual < 0.05, m0 ? m0.settleResidual.toFixed(5) + 'u' : 'n/a', '< 0.05u');
    add('R0e', 'the FREE-AIM branch is the one being measured (no soft/hard lock)',
      !game.lockTarget && !game.hardLock, `lockTarget=${game.lockTarget ? game.lockTarget.def.id : 'null'} hardLock=${game.hardLock ? game.hardLock.def.id : 'null'}`,
      'both null');

    // check 0 — the pure-node predictor against the live engine, at the rubric's three gaps.
    // ⚠ THIS IS THE WHOLE ADMISSIBILITY OF THE AXIS. If the browser and the predictor disagree,
    // one of them is wrong and no number below counts.
    let worstPred = 0;
    const predRows = [];
    for (const g of [10, 40, 100]) {
      const m = pose(p, foe, g);
      const want = predictMissAtRange(g).miss;
      const spec = predictMiss(g).miss;
      predRows.push({ gap: g, liveAtTargetRange: m ? +m.missAtTarget.toFixed(3) : null, predictAtRange: +want.toFixed(3), predictParallel: +spec.toFixed(3), liveGraded: m ? +m.miss.toFixed(3) : null });
      if (m) worstPred = Math.max(worstPred, Math.abs(m.missAtTarget - want));
    }
    notes.push('check 0 table: ' + JSON.stringify(predRows));
    add('R0f', 'the live engine reproduces the pure-node predictor (check 0)',
      worstPred <= (opts.tolPredict ?? 0.9), worstPred.toFixed(3) + 'u worst disagreement',
      `<= ${(opts.tolPredict ?? 0.9)}u`,
      'reticle-predict.mjs shares no engine code; a disagreement means one of the two is wrong');

    // ------------------------------------------------------------------------------------------
    // R1 — STATIC MISS AT EIGHT GAPS. ⚠ THIS IS EXPECTED TO FAIL TODAY at every gap >= 32u; that
    // failure IS the regression witness (aaa-05 check 1). A green R1 today means the suite is
    // blind, and R1z below asserts exactly that.
    // ------------------------------------------------------------------------------------------
    const r1 = [];
    for (const g of GAPS) {
      const m = pose(p, foe, g);
      if (!m) { add(`R1@${g}`, 'static miss', false, 'no measurement', `<= ${N_EXACT}u`); continue; }
      r1.push({ gap: g, miss: +m.miss.toFixed(3), atTargetRange: +m.missAtTarget.toFixed(3), camDist: +(m.camDist || 0).toFixed(1), foePx: +m.foePx.toFixed(0) });
      add(`R1@${g}`, `static miss at a ${g}u gap`, m.miss <= N_EXACT, m.miss.toFixed(3) + 'u',
        `<= ${N_EXACT}u (DECAL_LIFT)`,
        `camDist ${(m.camDist || 0).toFixed(1)}u; the foe projects ${m.foePx.toFixed(0)}px from the crosshair`);
    }
    notes.push('R1 table: ' + JSON.stringify(r1));

    // ⚠ THE REGRESSION WITNESS, ASSERTED AS A ROW OF ITS OWN. With the convergent fix absent, the
    // miss MUST exceed N_EXACT at every gap >= 32u. If it does not, the gauge cannot see the bug it
    // exists to see, and the whole axis is INADMISSIBLE rather than passing.
    const far = r1.filter((r) => r.gap >= 32);
    const allFarFail = far.length > 0 && far.every((r) => r.miss > N_EXACT);
    add('R1z', 'REGRESSION WITNESS — with the convergent aim absent, every gap >= 32u must exceed N_EXACT',
      allFarFail, far.map((r) => `${r.gap}u:${r.miss}`).join(' '), 'all > 0.35u',
      'if this row is red the suite is BLIND, and R1\'s greens mean nothing (aaa-05 check 1)');

    // and the SHAPE of the defect, as a relationship (RULE M-B): it grows with range.
    const m16 = r1.find((r) => r.gap === 16), m100 = r1.find((r) => r.gap === 100);
    if (m16 && m100) {
      add('R1s', 'the miss GROWS with range — corrects openjk.md:2062 ("constant 6.8u, worst up close")',
        m100.miss > m16.miss * 3, `16u -> ${m16.miss}u, 100u -> ${m100.miss}u`, '100u miss > 3x the 16u miss',
        'a relationship, so a camera re-tune cannot silently invalidate it');
    }

    // ------------------------------------------------------------------------------------------
    // R2 — VERTICAL AND DEGENERATE. This is where the defect is worst, and PowerWorld's whole
    // thesis is that altitude is the mode switch.
    // ------------------------------------------------------------------------------------------
    for (const [g, e] of [[40, 45], [70, 45]]) {
      const m = pose(p, foe, g, e);
      add(`R2@${g}/${e}deg`, `static miss, foe ${e} deg above at ${g}u`,
        !!m && m.miss <= N_EXACT, m ? m.miss.toFixed(3) + 'u' : 'n/a', `<= ${N_EXACT}u`,
        m ? `predictor says ${predictMissAtRange(g, { ay0: 1 }).miss.toFixed(2)}u` : '');
    }
    {
      // directly overhead — the `horiz < 0.35` degenerate branch, world.js:2265-2269
      const m = pose(p, foe, 46, 90);
      add('R2-overhead', 'static miss, foe DIRECTLY overhead (the degenerate blend branch)',
        !!m && m.miss <= N_EXACT, m ? m.miss.toFixed(3) + 'u' : 'n/a', `<= ${N_EXACT}u`,
        'world.js:2265-2269 borrows the horizontal from subject.facing here');
      // and prove the branch was actually entered, or the row tested the ordinary path
      const S = p.pos, T = foe.pos;
      let ax = T.x - S.x, ay = (T.y + 5) - (S.y + 5), az = T.z - S.z;
      const L = Math.hypot(ax, ay, az) || 1; ax /= L; ay /= L; az /= L;
      ay = clamp(ay * 0.55, -0.82, 0.82);
      const L2 = Math.hypot(ax, ay, az) || 1;
      const horiz = Math.hypot(ax / L2, az / L2);
      add('R2-degenerate-entered', 'the degenerate blend branch was ACTUALLY entered (horiz < 0.35)',
        horiz < 0.35, horiz.toFixed(3), '< 0.35',
        'without this the overhead row silently measures the ordinary path');
    }
    {
      // ⚠ MUZZLE PITCH ~80 deg — AND FREE AIM CANNOT PRODUCE IT, WHICH IS ITSELF A FINDING.
      // Under the free-aim branch `aim3` IS the camera's forward (game.js:3172-3175), and `chase()`
      // damps the axis's vertical component by 0.55 and clamps it to +-0.82 (world.js:2257) before
      // blending in the subject's facing at the degenerate branch. Posed with the foe DIRECTLY
      // OVERHEAD at 20u, free aim measured a pitch of -7.1 deg: the shot comes out nearly level at
      // a target straight up. The only path that produces a steep `aim3` today is a LOCK, where
      // `soft.center(a3)` (game.js:3171) puts the aim point on the body — so the pitch is driven
      // through the lock, which is a real player path and not a written value.
      const base = { x: 0, y: 60, z: 0 }, fp = { x: 0.5, y: 60 + 20, z: 0 };
      settle(p, foe, base, fp, opts.settleFrames || 160);
      const sp = game.world.screenPosOf(foe.pos.x, foe.pos.y + 5, foe.pos.z, { x: 0, y: 0, behind: false });
      if (!sp.behind) { game.input.mouse.clientX = sp.x; game.input.mouse.clientY = sp.y; }
      settle(p, foe, base, fp, 60);
      const pitch = Math.asin(clamp(p.aim3.y, -1, 1)) * R2D;
      const m = measure(p, { x: foe.pos.x, y: foe.pos.y + 5.2, z: foe.pos.z });
      add('R2-pitch-real', 'the aim really IS steeply pitched (or the row tests a flat shot and means nothing)',
        Math.abs(pitch) > 55, pitch.toFixed(1) + ' deg', '> 55 deg',
        'free aim tops out near level even at a foe straight overhead — the camera pitch is damped 0.55 and clamped to +-0.82 (world.js:2257)');
      add('R2-pitch80', 'static miss with the muzzle pitched ~80 deg (aaa-05 check 4)',
        !!m && m.miss <= N_EXACT, m ? m.miss.toFixed(3) + 'u' : 'n/a', `<= ${N_EXACT}u`,
        `measured aim3 pitch ${pitch.toFixed(1)} deg; the spec predicts 3.35u for this case without the muzzle two-pass`);
      game.input.mouse.clientX = 2; game.input.mouse.clientY = 2;
    }

    // ------------------------------------------------------------------------------------------
    // R3 — LOCK STATES, and the 1px agreement. "A miss measured against a point the crosshair is
    // not drawn at measures nothing."
    // ------------------------------------------------------------------------------------------
    {
      const mFree = pose(p, foe, 40);
      add('R3-free-px', 'FREE AIM: the engine aim point projects onto the drawn crosshair',
        !!mFree && mFree.aimPx <= 1, mFree ? mFree.aimPx.toFixed(2) + ' px' : 'n/a', '<= 1 px',
        'screenPosOf(game._aim3pt) vs #hCross\'s own bounding rect');
      add('R3-free-miss', 'FREE AIM: miss', !!mFree && mFree.miss <= N_EXACT,
        mFree ? mFree.miss.toFixed(3) + 'u' : 'n/a', `<= ${N_EXACT}u`);

      // HARD LOCK — through the real path. `cycleLock` is what the T key calls (game.js:3187).
      const base = { x: 0, y: 60, z: 0 }, fp = { x: 40, y: 60, z: 0 };
      settle(p, foe, base, fp, 160);
      game.cycleLock(p);
      settle(p, foe, base, fp, 160);
      const locked = game.hardLock === foe;
      add('R3-lock-acquired', 'hard lock acquired through the real cycleLock path',
        locked, game.hardLock ? game.hardLock.def.id : 'null', foe.def.id);
      if (locked) {
        const mL = measure(p, { x: foe.pos.x, y: foe.pos.y + 5.2, z: foe.pos.z });
        add('R3-lock-px', 'HARD LOCK: the crosshair is drawn where the shot is going',
          !!mL && mL.aimPx <= 1, mL ? mL.aimPx.toFixed(2) + ' px' : 'n/a', '<= 1 px',
          'THE LIE IN aaa-05 §3.2: locked, the crosshair recolours to hostile red at screen centre while the shot leaves for a body 16-42% of the gap off-centre');
        add('R3-lock-miss', 'HARD LOCK: miss', !!mL && mL.miss <= N_EXACT,
          mL ? mL.miss.toFixed(3) + 'u' : 'n/a', `<= ${N_EXACT}u`,
          mL ? `the foe itself projects ${foePx(foe).toFixed(0)}px from the crosshair` : '');
        // the class the HUD sets, so the surface and the state cannot disagree
        const hasClass = typeof document !== 'undefined' && document.body.classList.contains('pw-locked');
        notes.push(`locked: body.pw-locked = ${hasClass} (set from hud.js:1865)`);
      }
      game.hardLock = null;

      // SOFT LOCK — put the synthetic cursor ON the foe's projected body so the magnet acquires.
      const sp = game.world.screenPosOf(foe.pos.x, foe.pos.y + 5, foe.pos.z, { x: 0, y: 0, behind: false });
      game.input.mouse.clientX = sp.x; game.input.mouse.clientY = sp.y;
      settle(p, foe, base, fp, 40);
      const soft = game.lockTarget === foe;
      add('R3-soft-acquired', 'the aim magnet acquires with the cursor on the body',
        soft, game.lockTarget ? game.lockTarget.def.id : 'null', foe.def.id,
        'aaa-05 §3.1: under _openSky the magnet reads the MOUSE CURSOR while the crosshair is nailed to screen centre');
      if (soft) {
        const mS = measure(p, { x: foe.pos.x, y: foe.pos.y + 5.2, z: foe.pos.z });
        add('R3-soft-miss', 'SOFT LOCK: miss', !!mS && mS.miss <= N_EXACT,
          mS ? mS.miss.toFixed(3) + 'u' : 'n/a', `<= ${N_EXACT}u`);
        add('R3-soft-px', 'SOFT LOCK: the crosshair is drawn where the shot is going',
          !!mS && mS.aimPx <= 1, mS ? mS.aimPx.toFixed(2) + ' px' : 'n/a', '<= 1 px');
      }
      // ⚠ AND THE MAGNET'S OWN LIE, AS A NUMBER: move the cursor to the corner and show the aim
      // moves with it while the crosshair does not budge a pixel.
      const beforeAim = { x: p.aim3.x, y: p.aim3.y, z: p.aim3.z };
      const crossA = crosshairPx();
      game.input.mouse.clientX = 4; game.input.mouse.clientY = 4;
      settle(p, foe, base, fp, 20);
      const crossB = crosshairPx();
      const swing = Math.acos(clamp(beforeAim.x * p.aim3.x + beforeAim.y * p.aim3.y + beforeAim.z * p.aim3.z, -1, 1)) * R2D;
      const crossMoved = crossA && crossB ? Math.hypot(crossA.x - crossB.x, crossA.y - crossB.y) : NaN;
      add('R3-cursor-drag', 'moving the CURSOR must not move the shot while the crosshair stays put',
        swing < 1, `aim swung ${swing.toFixed(1)} deg; crosshair moved ${crossMoved.toFixed(2)} px`,
        'aim swing < 1 deg',
        'aaa-05 §3.1 — a mouse the player is not looking at is the aim authority under an open sky');
      game.input.mouse.clientX = 2; game.input.mouse.clientY = 2;
    }

    // ------------------------------------------------------------------------------------------
    // R5 — HONESTY. The reticle must never become a wallhack. Run before R4 because R4 is long.
    // ------------------------------------------------------------------------------------------
    {
      const base = { x: 0, y: 60, z: 0 }, fp = { x: 40, y: 60, z: 0 };
      game.hardLock = null;
      settle(p, foe, base, fp, 60);
      // put the cursor ON the body, then make the body unseeable.
      const sp = game.world.screenPosOf(foe.pos.x, foe.pos.y + 5, foe.pos.z, { x: 0, y: 0, behind: false });
      game.input.mouse.clientX = sp.x; game.input.mouse.clientY = sp.y;
      const prevFov = game.fov;
      game.fov = true;                            // ⚠ PowerWorld sets game.fov FALSE, which pins _vis
      for (let i = 0; i < 30; i++) { foe._vis = 0.2; pin(p, foe, base, fp); step(1); }
      foe._vis = 0.2;
      const grabbedUnseen = game.lockTarget === foe || game.hardLock === foe || game._hoverPick === foe;
      add('R5-vis', 'a foe at _vis 0.2 under the crosshair is NOT acquired',
        !grabbedUnseen, `lockTarget=${game.lockTarget ? game.lockTarget.def.id : 'null'} hover=${game._hoverPick ? game._hoverPick.def.id : 'null'}`,
        '0 convergences', 'the reticle must not become a wallhack');
      // and prove the guard is the _vis gate and not an accident of geometry: at _vis 1 it DOES grab
      for (let i = 0; i < 30; i++) { foe._vis = 1; pin(p, foe, base, fp); step(1); }
      foe._vis = 1;
      const grabbedSeen = game.lockTarget === foe || game._hoverPick === foe;
      add('R5-control', 'CONTROL: the same pose at _vis 1.0 DOES acquire (proves R5 tested the gate)',
        grabbedSeen, `lockTarget=${game.lockTarget ? game.lockTarget.def.id : 'null'}`, 'acquired',
        'without this control, R5 passes trivially whenever the cursor happens to miss the body');
      // blind
      for (let i = 0; i < 20; i++) { p.blindT = 1; foe._vis = 1; pin(p, foe, base, fp); step(1); }
      p.blindT = 1;
      const blindGrab = game.lockTarget === foe || game.hardLock === foe;
      add('R5-blind', 'with p.blindT = 1 the aim does not converge on a body',
        !blindGrab, `lockTarget=${game.lockTarget ? game.lockTarget.def.id : 'null'} hardLock=${game.hardLock ? game.hardLock.def.id : 'null'}`,
        '0 convergences');
      p.blindT = 0; game.fov = prevFov; foe._vis = 1;
      game.input.mouse.clientX = 2; game.input.mouse.clientY = 2;
    }

    // ------------------------------------------------------------------------------------------
    // Check 10 — every cover record yields a finite box. `traceBox3` does not exist yet (Wave 1
    // owns it), so this measures the DATA the trace will have to read, which is the half of check
    // 10 that is knowable today: how many records are half-filled (aaa-04 §3.2's found defect).
    // ------------------------------------------------------------------------------------------
    {
      const bad = [];
      for (const c of (w.cover || [])) {
        const hx = c.hx ?? c.r, hz = c.hz ?? c.r, top = c.top ?? c.h;
        if (hx == null || hz == null || !(top > 0)) bad.push(c.kind || c.type || 'record');
      }
      let iBad = 0, iTot = 0;
      for (const it of (w.interiors || [])) {
        const top = it.top ?? it.h;
        for (const wl of (it.walls || [])) { iTot++; if (!(top > 0) || wl.hx == null || wl.hz == null) iBad++; }
      }
      add('R10-cover', 'every world.cover record yields a finite box (no NaN slab)',
        bad.length === 0, `${bad.length} of ${(w.cover || []).length} unreadable`, '0 unreadable');
      add('R10-interior', 'every interior wall carries a usable top (aaa-04 §3.2 found defect)',
        iBad === 0, `${iBad} of ${iTot} walls missing a top`, '0',
        'an interior wall record is {x,z,hx,hz} with no top — the Y slab becomes [0,undefined], t1/t2 are NaN, and `tmin > tmax` is FALSE for NaN, so the segment test falls through as a HIT at any altitude');
    }

    // ------------------------------------------------------------------------------------------
    // R4 — LIVE FIGHT. p50 / p90 / worst over a real AI-vs-AI bout in PowerWorld.
    // ⚠ The subject is the INVARIANT, not whether the bots feel like fighting (trap 9): the miss is
    // sampled every frame whatever they do, and the row reports how far apart the two moved.
    // ------------------------------------------------------------------------------------------
    {
      // ⚠ A LIVE FIGHT MEANS BOTH SIDES ACTUALLY FIGHT. The first version of this row reused
      // `stand()`, which nulls the foe's AI (right for a static pose, fatal here) and left the
      // player with no `ai` at all — so `controlBot` returned immediately, nothing moved, and p50,
      // p90 and worst came back as the SAME number from 240 identical frames. That is trap 9 in its
      // other form: not "the bots didn't feel like fighting" but "nobody was driving". The identical
      // quantiles are the tell, and the R4-motion row below makes it impossible to miss again.
      const { AI } = await import('../engine/ai.js');
      closeDoor();
      game.running = true; game.world.render = () => {};
      game.startMode('powerworld', { p1: opts.p1 || 'sol', p2: opts.p2 || 'rage', enemy: opts.p2 || 'rage' });
      if (game.news) game.news.enabled = false;
      const P = game.humans[0] && game.humans[0].fighter;
      const F = game.entities.find((e) => e && e.def && P && e.team !== P.team && !e.isDummy && !e.def.police);
      if (!P || !F) { add('R4', 'live-fight miss', false, 'no foe', `<= ${N_HIT}u`); return; }
      if (!P.ai) P.ai = new AI(P, 1.25);
      if (!F.ai) F.ai = new AI(F, 1.25);
      game.controlPlayer = (dt) => game.controlBot(game.player, dt);   // ⚠ the documented AI-vs-AI override
      const startGap = Math.hypot(F.pos.x - P.pos.x, F.pos.y - P.pos.y, F.pos.z - P.pos.z);
      let travelled = 0; let lastP = { x: P.pos.x, y: P.pos.y, z: P.pos.z };
      const samples = [];
      let gapSum = 0, gapN = 0;
      const N = opts.liveFrames || 3600;            // 60s at 60Hz
      for (let i = 0; i < N; i++) {
        step(1);
        travelled += Math.hypot(P.pos.x - lastP.x, P.pos.y - lastP.y, P.pos.z - lastP.z);
        lastP = { x: P.pos.x, y: P.pos.y, z: P.pos.z };
        if (!P.alive || !F.alive) continue;
        const m = measure(P, { x: F.pos.x, y: F.pos.y + 5.2, z: F.pos.z });
        if (m && Number.isFinite(m.miss)) samples.push(m.miss);
        gapSum += Math.hypot(F.pos.x - P.pos.x, F.pos.y - P.pos.y, F.pos.z - P.pos.z); gapN++;
      }
      samples.sort((a, b) => a - b);
      const q = (f) => (samples.length ? samples[Math.min(samples.length - 1, Math.floor(samples.length * f))] : NaN);
      const p50 = q(0.5), p90 = q(0.9), worst = samples.length ? samples[samples.length - 1] : NaN;
      add('R4-samples', 'the live fight produced samples at all (anti-vacuous)',
        samples.length > N * 0.5, `${samples.length} of ${N} frames`, `> ${Math.floor(N * 0.5)}`,
        `mean engagement gap ${gapN ? (gapSum / gapN).toFixed(1) : 'n/a'}u, start ${startGap.toFixed(1)}u`);
      // ⚠ THE ANTI-STATIC GUARD. Identical quantiles from a pair that never moved is the exact
      // shape of a vacuous pass, and it happened on the first run of this row.
      const spread = Number.isFinite(worst) && Number.isFinite(p50) ? worst - p50 : 0;
      add('R4-motion', 'somebody actually MOVED during the live fight (anti-vacuous)',
        travelled > 40 && spread > 0.01, `player travelled ${travelled.toFixed(0)}u; worst-p50 spread ${spread.toFixed(3)}u`,
        '> 40u travelled and a non-zero spread',
        'p50 == p90 == worst means one static pose sampled N times, not a fight');
      add('R4', 'worst-case miss over a 60s AI-vs-AI fight',
        Number.isFinite(worst) && worst <= N_HIT, `p50 ${p50.toFixed(2)}u / p90 ${p90.toFixed(2)}u / worst ${worst.toFixed(2)}u`,
        `worst <= ${N_HIT}u (one body radius)`);
      notes.push(`R4 engagement: mean gap ${gapN ? (gapSum / gapN).toFixed(1) : 'n/a'}u over ${gapN} frames — this is the number AIM_MAX_D should be derived from`);
    }
  }
}

// =================================================================================================
// THE KNOWN-BAD INJECTIONS (aaa-08 §5.3, RETICLE row).
// =================================================================================================

/**
 * ⚠ THE RUBRIC'S RETICLE KNOWN-BAD IS "revert the convergent-aim fix" — AND THE FIX HAS NOT LANDED
 * YET (Wave 1 owns it). The shipped engine already IS the reverted state, so R1 fails at every gap
 * >= 32u today and that failing run is the regression witness itself.
 *
 * What still has to be proved is the other half: that the gauge would turn GREEN if the bug were
 * gone. A suite that reports a large miss no matter what the engine does is not measuring the
 * engine. This installs the convergent aim as a bench-local `controlPlayer` post-pass — it writes
 * the same field `game.js:3172-3175` writes, from the camera ray through the DRAWN crosshair — and
 * R1 must go green (to within the muzzle two-pass residual) while it is installed.
 */
export function injectConvergentAim(game) {
  const prev = game.controlPlayer;
  const R = 2.2;                                   // entity.js:185 — a fighter's body radius
  game.controlPlayer = function (dt) {
    prev.call(this, dt);
    const p = this.player; if (!p || !p.alive || !p._openSky) return;
    const el = typeof document !== 'undefined' && document.getElementById('hCross');
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cam = this.world.camera;
    const ndcx = ((r.left + r.width / 2) / innerWidth) * 2 - 1;
    const ndcy = -((r.top + r.height / 2) / innerHeight) * 2 + 1;
    cam.updateMatrixWorld();
    const ap4 = (vv, e) => {
      const w = 1 / (e[3] * vv.x + e[7] * vv.y + e[11] * vv.z + e[15]);
      return { x: (e[0] * vv.x + e[4] * vv.y + e[8] * vv.z + e[12]) * w,
               y: (e[1] * vv.x + e[5] * vv.y + e[9] * vv.z + e[13]) * w,
               z: (e[2] * vv.x + e[6] * vv.y + e[10] * vv.z + e[14]) * w };
    };
    const un = (z) => ap4(ap4({ x: ndcx, y: ndcy, z, w: 1 }, cam.projectionMatrixInverse.elements), cam.matrixWorld.elements);
    const a = un(-1), b = un(1);
    let d = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
    const L = Math.hypot(d.x, d.y, d.z) || 1; d = { x: d.x / L, y: d.y / L, z: d.z / L };
    const O = { x: cam.position.x, y: cam.position.y, z: cam.position.z };

    const ap3 = this._aim3pt;
    const lock = (this.hardLock && this.hardLock.alive) ? this.hardLock : this.lockTarget;
    if (lock && lock.alive) {
      // ⚠ THE LOCK OWNS THE AIM POINT (aaa-05 §0.2). The trace does not get to retarget a lock —
      // the shot goes to the body, and it is the CROSSHAIR that has to move onto it. That second
      // half is the MARK lane's HUD change in Wave 1, so R3-lock-px stays red under this injection
      // and that is the correct reading, not a shortfall of the injection.
      ap3.set(lock.pos.x, lock.pos.y + 5.2, lock.pos.z);
    } else {
      // ⚠ A REAL RAY-SPHERE TRACE, NOT "aim at the point the test measures". The measurement uses
      // the ray's CLOSEST APPROACH to the body centre; this uses the ray's ENTRY into the body.
      // They are up to R apart along the ray, so agreement between them is evidence rather than a
      // tautology — and the ~0.1u that separates them is the honest floor of this injection.
      let best = Infinity;
      for (const f of this.entities) {
        if (!f || !f.alive || !this.isFoe(p, f)) continue;
        const cx = f.pos.x - O.x, cy = f.pos.y + 5.2 - O.y, cz = f.pos.z - O.z;
        const t = cx * d.x + cy * d.y + cz * d.z; if (t <= 0) continue;
        const px = cx - d.x * t, py = cy - d.y * t, pz = cz - d.z * t;
        const q = Math.hypot(px, py, pz); if (q > R) continue;
        const hit = t - Math.sqrt(Math.max(0, R * R - q * q));
        if (hit > 0 && hit < best) best = hit;
      }
      const t = Number.isFinite(best) ? best : 162;     // AIM_MAX_D, the spec's interim value
      ap3.set(O.x + d.x * t, O.y + d.y * t, O.z + d.z * t);
    }
    this.aimPoint.copy(ap3).setY(0);
    // ⚠ THE MUZZLE TWO-PASS. `aim3` is measured from `pos + 5.8` (game.js:3194) while every shot
    // leaves `c.muzzle()` at `pos + aim*3.4` — aiming the BODY at the point still leaves the barrel
    // pointing somewhere else. Two passes: aim the body, then re-aim from where the shot leaves.
    for (let i = 0; i < 2; i++) {
      const M = p.muzzle({ set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } });
      p.aim3.set(ap3.x - M.x, ap3.y - M.y, ap3.z - M.z).normalize();
      if (!(this.hardLock && this.hardLock.alive)) p.faceDir(p.aim3.x, p.aim3.z);
    }
  };
  return () => { game.controlPlayer = prev; };
}

/** Make the parallax WORSE, so the gauge is shown to be sensitive in the failing direction too. */
export function injectWorseParallax(game, scale = 3) {
  const w = game.world;
  const real = w.chase.bind(w);
  w.chase = function (subject, target, dt) {
    real(subject, target, dt);
    // widen the shoulder offset: a bigger perpendicular separation between the two parallel rays
    const c = w.camera;
    const dx = w.camPos.x - subject.pos.x, dz = w.camPos.z - subject.pos.z;
    const L = Math.hypot(dx, dz) || 1;
    w.camPos.x += (-dz / L) * 8 * (scale - 1); w.camPos.z += (dx / L) * 8 * (scale - 1);
    c.position.set(w.camPos.x, w.camPos.y, w.camPos.z);
    c.lookAt(w.camTarget.x, w.camTarget.y, w.camTarget.z);
  };
  return () => { w.chase = real; };
}

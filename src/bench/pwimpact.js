// =================================================================================================
// PWIMPACT — THE IMPACT GAUGE. Wave 0, lane G-FEEL. `docs/powerworld/aaa-08-rubric.md` §1.4 (I1–I6),
// `docs/powerworld/aaa-06-impact.md` §17.
//
//     await window.LSW.pwImpactSuite()
//     await window.LSW.pwImpactSuite({ quiet: true })
//
// ⚠ THIS FILE CHANGES NOTHING. It is an instrument. Several of the numbers it reports are OUT OF
// BAND today and that is the point — Wave 4 owns the fixes, Wave 0 owns being able to see them.
// A row that fails here is a MEASUREMENT, not a regression.
//
// ⚠ THE GATE IS THE RED RUN, NOT THE GREEN ONE (rubric §5.2). `injectNoImpactFrame` and
// `injectNoShake` are exported beside the suite so the integration step can prove this gauge can
// see the thing it claims to measure. A verdict from an unproven harness is INADMISSIBLE.
//
// ---- WHAT IT MEASURES, AND WHY EACH ONE NEEDS PIXELS OR A DRIVEN PUNCH -------------------------
//   I0  the harness proves itself     — the renderer really drew, and the buffer is not uniform
//   I1  SILHOUETTE DELTA              — "can I still see my opponent", the one that cannot be
//                                       gamed by turning every effect down
//   I2  no blowout                    — CENTRE pixels over L 235
//   I3  the impact frame is ONE frame — L0 → (255−L0) → L0, then the same run with fxImpact off
//   I4  shake dynamic range           — a real jab vs a real haymaker vs the ceiling
//   I5  hitstop discipline            — attacker unfreezes first; the pose delta across the freeze
//   I6  the DOM is not over the centre
//   I7  the shake is ANGULAR, and the eye never moves — settles a stale claim on record
//   I8  `punch()` in the dimension    — the ratchet leak (aaa-06 §0.3)
//
// ---- THE TRAPS THIS FILE IS WRITTEN AROUND (each has cost this project a run) ------------------
//  1. `game.update` is called UNCONDITIONALLY by boot.js's rAF loop — it is NOT gated on
//     `game.running`. The harness OWNS THE CLOCK: `game.update` is replaced with a no-op the loop
//     harmlessly calls, and the real one is invoked by hand. (src/bench/abilities.js:194.)
//  2. `controlPlayer` rewrites `aim`/`aim3` from the mouse EVERY frame, after a test writes them
//     and before the hit test reads them. It is stubbed, and restored in a `finally`.
//  3. ⚠ `world.render` is NOT stubbed here, and that is deliberate. That stub is correct for
//     sim-only timing and fatal for pixels (aaa-06 §17).
//  4. Pick the opponent by TEAM/id, never by index — `entities[1]` has been the KMK 9 camera
//     operator in every mode that carries a press pack.
//  5. Both bodies are pinned to ABSOLUTE positions; a relative offset lets the melee step-in smear
//     the measurement.
//  6. DRIVE THE GATE. Every punch below goes through `melee.chargeStart` / `chargeRelease` and the
//     real `_heavyHit` cone test. Nothing writes `_shake`, `hitstop` or `uInvert`.
//  7. Read the DRAWING BUFFER in the SAME TASK as the render — the renderer is built without
//     `preserveDrawingBuffer`, so a later read is blank. There is no `await` between a render and
//     its `readPixels` anywhere in this file.
//  8. Clear the scissor rect before any manual render — the news crew leaves a 320×180 rect and the
//     frame comes back black except one corner (manual §42).
//  9. THE PHANTOM-MODULE LAW — `SETTINGS` is read off `window.LSW`, never a fresh dynamic import.
// =================================================================================================

const DT = 1 / 60;
const DT40 = 1 / 40;                    // the Deck's locked cadence — the per-frame step budget
const R2D = 180 / Math.PI;

// THE CENTRE BOX (aaa-06 §1.2): ±12% of width and ±16% of height about the AIM POINT. In PowerWorld
// the crosshair is a screen-centre CSS reticle (manual §46), so the aim point IS the frame centre.
// ⚠ That equivalence is asserted, not assumed — I0c checks the opponent actually projects inside
// this box before any silhouette number is graded. If he does not, the number would be measuring an
// empty patch of sky and reading as a beautiful pass.
const CBOX = { hx: 0.12, hy: 0.16 };

// ⚠ THE GAP IS 6u AND IT IS NOT A ROUND NUMBER PICKED FOR CONVENIENCE. Two independent constraints
// land on the same figure and the first version of this file violated both at gap 14:
//   1. THE POWER PUNCH REACHES LEAST — 7u (`data/martial.js`, the inversion that IS the spacing
//      design). At 14u the haymaker never connected, the suite reported `0 dmg on frame -1`, and
//      every impact row below it went NaN. The reach table decides the gap, never the harness.
//   2. THE CLINCH FRAMING IS WHERE aaa-06 MEASURES. `chase()` derives its distance from the gap
//      (`fit = (min(gap,52)+20)/(2·tan(fov/2))`), so gap 6 → d ≈ 27 → a 30u frame, in which a 9.6u
//      fighter is ~32% of frame height — aaa-06 §0.1's 32.9u clinch row. At gap 14 the frame is
//      69u, the opponent covers 6.6% of the CENTRE box, and the silhouette delta reads 4.2 for
//      purely geometric reasons that have nothing to do with the effects being measured.
// One number, both problems. Anything larger measures a different question.
const GAP = 6;

// ---- pass bands, all from the rubric so this file never invents one ------------------------------
const BAND = {
  silhouette: 12,        // I1 — mean |ΔL| inside CENTRE with the opponent hidden (0..255)
  blowout: 0.02,         // I2 — fraction of CENTRE pixels above L 235
  shakePeak: 1.25,       // I4/I7 — degrees, peak angular deviation, ANY event
  shakeStep: 1.35,       // I4/I7 — degrees, max per-frame step at dt = 1/40
  shakeRange: 4.2,       // I4 — jab → ceiling
  camPosDev: 1e-6,       // I7 — the eye must never move (u)
};

// =================================================================================================
// THE PIXEL RIG
// =================================================================================================
/**
 * A reader for the CENTRE box of the drawing buffer.
 * ⚠ Sizes come from `gl.drawingBufferWidth/Height`, never from the CSS box — the adaptive quality
 * tier changes the renderer's pixel ratio underneath you and `clientWidth` would lie about it.
 */
function makeRig(world) {
  const r = world.renderer, gl = r.getContext();
  const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
  const bw = Math.max(8, Math.round(W * CBOX.hx * 2));
  const bh = Math.max(8, Math.round(H * CBOX.hy * 2));
  const x0 = Math.max(0, Math.round((W - bw) / 2));
  const y0 = Math.max(0, Math.round((H - bh) / 2));   // GL origin is bottom-left; a centred box is symmetric
  const bufA = new Uint8Array(bw * bh * 4);
  const bufB = new Uint8Array(bw * bh * 4);
  const lumA = new Float32Array(bw * bh);
  const lumB = new Float32Array(bw * bh);

  /** ⚠ Called BEFORE any manual render. The news crew's POV leaves a scissor rect behind. */
  const prepare = () => {
    r.setRenderTarget(null);
    r.setScissorTest(false);
    r.setViewport(0, 0, W / (r.getPixelRatio() || 1), H / (r.getPixelRatio() || 1));
  };

  /** Read the CENTRE box. MUST be called in the same task as the render that produced it. */
  const read = (buf, lum) => {
    r.setRenderTarget(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels(x0, y0, bw, bh, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    let sum = 0, hot = 0;
    for (let i = 0, j = 0; j < lum.length; i += 4, j++) {
      // Rec.709 on the raw sRGB bytes the print pass emits (it outputs tone-mapped sRGB already)
      const L = 0.2126 * buf[i] + 0.7152 * buf[i + 1] + 0.0722 * buf[i + 2];
      lum[j] = L; sum += L; if (L > 235) hot++;
    }
    return { mean: sum / lum.length, blowout: hot / lum.length };
  };

  return {
    W, H, bw, bh, prepare,
    readA: () => read(bufA, lumA),
    readB: () => read(bufB, lumB),
    /**
     * mean |ΔL| between the last A read and the last B read — THE silhouette metric.
     * Also returns the PEAK per-pixel difference, because the two answer different questions and
     * the mean alone cannot tell them apart: a low mean with a high peak means the opponent is
     * SMALL in the box (area), a low mean with a low peak means he has no CONTRAST against the
     * background (which is the rim-light lever, aaa-06 §14 / conflict C10).
     */
    delta: () => {
      let s = 0, mx = 0;
      for (let i = 0; i < lumA.length; i++) { const d = Math.abs(lumA[i] - lumB[i]); s += d; if (d > mx) mx = d; }
      return { mean: s / lumA.length, max: mx };
    },
    /** how many distinct quantised colours are in the last A read — the "not uniform" self-proof */
    variety: () => {
      const seen = new Set();
      for (let i = 0; i < bufA.length; i += 4 * 37) seen.add((bufA[i] >> 3 << 10) | (bufA[i + 1] >> 3 << 5) | (bufA[i + 2] >> 3));
      return seen.size;
    },
    /** the CENTRE box in CSS pixels, for the DOM test */
    cssBox: () => {
      const el = r.domElement, rect = el.getBoundingClientRect();
      return {
        x0: rect.left + rect.width * (0.5 - CBOX.hx), x1: rect.left + rect.width * (0.5 + CBOX.hx),
        y0: rect.top + rect.height * (0.5 - CBOX.hy), y1: rect.top + rect.height * (0.5 + CBOX.hy),
      };
    },
  };
}

// =================================================================================================
// CAMERA MATHS — no THREE import, because a second copy of a library in a bench file is exactly the
// shape the phantom-module law warns about, and all of this is six lines of arithmetic.
// =================================================================================================
/** rotate (0,0,-1) by a quaternion → the camera's forward axis */
function camForward(q) {
  const x = q.x, y = q.y, z = q.z, w = q.w;
  // v = (0,0,-1); v' = v + 2w(q×v) + 2q×(q×v)  — expanded
  return {
    x: -(2 * (x * z + w * y)),
    y: -(2 * (y * z - w * x)),
    z: -(1 - 2 * (x * x + y * y)),
  };
}
const norm = (v) => { const L = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / L, y: v.y / L, z: v.z / L }; };
const dot3 = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const angBetween = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot3(a, b)))) * R2D;

/**
 * The camera's angular deviation from where it WOULD be pointing with no shake, in degrees.
 * ⚠ THIS IS THE RIGHT QUANTITY AND `_shake` IS NOT. `chase()` jitters the LOOK POINT
 * (world.js:2312-2318), so the scalar and the angle are different things and the 1.6° "cap" written
 * beside that code is a claim about the scalar. Measure the picture.
 */
function shakeAngle(world) {
  const c = world.camera;
  if (!c || !c.quaternion) return 0;
  const fwd = camForward(c.quaternion);
  const want = norm({ x: world.camTarget.x - c.position.x, y: world.camTarget.y - c.position.y, z: world.camTarget.z - c.position.z });
  return angBetween(fwd, want);
}

// =================================================================================================
// THE KNOWN-BAD INJECTIONS — rubric §5.3. Each returns an undo function.
// =================================================================================================
/**
 * ⚠ THE MANDATED ONE. `fxImpact = false` must leave I3's middle sample at ~L0 — i.e. the inverted
 * frame stops registering. If it does not, this gauge cannot see the effect at all and every number
 * it reports about impact is inadmissible.
 */
export function injectNoImpactFrame(game) {
  const S = (window.LSW && window.LSW.SETTINGS) || null;
  if (!S) return () => {};
  const prev = S.fxImpact;
  S.fxImpact = false;
  // ⚠ `game.onHit` caches the settings OBJECT (`this._look || (this._look = SETTINGS)`), not the
  // value, so mutating the live object is enough and no re-apply is needed. Asserted by the run.
  void game;
  return () => { S.fxImpact = prev; };
}

/**
 * The shake known-bad. `world.shakeMult` is the dial `shake()` already multiplies by
 * (world.js:1298), so this is a reversible injection through an existing seam rather than a patch.
 * Under it, I4's ladder must collapse to a flat zero and I7's peak must read 0.00°.
 */
export function injectNoShake(game) {
  const w = game.world;
  const prev = w.shakeMult;
  w.shakeMult = 0; w._shake = 0;
  return () => { w.shakeMult = prev; };
}

/**
 * The SILHOUETTE known-bad, and it is the one that matters. I1's whole claim is that it cannot be
 * satisfied by turning everything down — so the way to break it is to turn something UP until the
 * frame erases the opponent. Blowing the bloom out is exactly the failure mode aaa-06 §2 audits
 * (an additive layer over the centre box), driven through the pass's own dials.
 * Under it I1's delta must collapse AND I2's blowout must exceed 2%.
 * ⚠ `_applyQuality` rewrites `bloom.strength` when the adaptive tier changes (world.js:2364), so
 * this injection is only valid across a short run. It is used for one 12-frame read and undone.
 */
export function injectBlowout(game) {
  const b = game.world && game.world.bloom;
  if (!b) return () => {};
  const prev = { s: b.strength, t: b.threshold, r: b.radius };
  b.strength = 9; b.threshold = 0; b.radius = 1.4;
  return () => { b.strength = prev.s; b.threshold = prev.t; b.radius = prev.r; };
}

// =================================================================================================
// THE SUITE
// =================================================================================================
export async function impactSuite(game, hud, opts = {}) {
  const L = window.LSW;
  const R = [];
  const errs = [];
  const oldErr = console.error;
  console.error = (...a) => { errs.push(String(a[0]).slice(0, 160)); oldErr(...a); };

  const realUpdate = game.update.bind(game);
  const prevCP = game.controlPlayer;
  const prevRunning = game.running;
  const prevNews = game.news ? game.news.enabled : null;
  const prevAutoReset = game.world.renderer.info.autoReset;
  const modeId = opts.mode || 'powerworld';

  // ⚠ OWN THE CLOCK. From here the page's rAF loop advances nothing; every frame below is ours.
  game.update = () => {};
  game.controlPlayer = () => {};

  const ok = (name, pass, got, want) => { R.push({ name, pass: !!pass, got, want }); return !!pass; };
  const note = (name, got) => { R.push({ name, pass: true, got, want: 'reported, not graded' }); };

  const rig = makeRig(game.world);
  const step = (dt = DT) => { try { realUpdate(dt); } catch (e) { errs.push('update: ' + ((e && e.message) || e)); } };

  // -- one place that stands a clean fight up, so every measurement starts identically ------------
  const stand = (p1, p2, mid = modeId) => {
    if (hud && hud.hideTitle) hud.hideTitle();
    game.running = true;
    game.startMode(mid, { p1, p2, enemy: p2 });
    if (game.news) game.news.enabled = false;   // ⚠ `onAir` is a GETTER — assigning it throws
    const p = game.humans[0] && game.humans[0].fighter;
    // ⚠ BY ID, NEVER BY INDEX.
    const foe = game.entities.find((e) => e.def && e.def.id === p2 && e !== p);
    return { p, foe };
  };

  /**
   * Pin a clean 1v1 at an absolute gap, settle the chase camera, and hand back the pair.
   * ⚠ The camera is DAMPED (`world.js:2287-2299`), so a measurement taken before it settles is
   * measuring the damp, not the shake. `settle` frames are not padding.
   */
  const pinned = (p1, p2, gap, settle = 50) => {
    const { p, foe } = stand(p1, p2);
    if (!p || !foe) return { p, foe };
    foe.ai = null;
    for (let i = 0; i < settle; i++) {
      p.pos.set(0, 0, 0); p.vel.set(0, 0, 0); p.aim.set(1, 0, 0); p.aim3.set(1, 0, 0); p.facing = Math.PI / 2;
      foe.pos.set(gap, 0, 0); foe.vel.set(0, 0, 0);
      foe.hp = foe.maxHp; foe.invuln = 0;
      step();
    }
    return { p, foe };
  };

  /** land ONE real punch of a chosen weight, through melee.js, and report the frame it connected */
  const swing = (p, foe, weight) => {
    // weight: 'jab' (tap) · 'straight' (0.18–0.55) · 'haymaker' (>= 0.55)
    game.melee.chargeStart(p);
    // ⚠ `chargeStart` REFUSES silently when `canAct` is false (mid-swing, staggered, clinched). A
    // loop waiting on a charge that will never accumulate would spin 200 frames and then throw a
    // jab, reporting the wrong strike weight with no error anywhere. Bail on the refusal instead.
    if (p.meleeCharge <= 0) return false;
    if (weight !== 'jab') {
      // thresholds from `melee.chargeRelease`: < 0.18 jab · < 0.55 straight · else HAYMAKER
      const want = weight === 'haymaker' ? 0.95 : 0.34;
      for (let i = 0; i < 200 && p.meleeCharge > 0 && p.meleeCharge < want; i++) { pin(p, foe); step(); }
    }
    game.melee.chargeRelease(p);
    return true;
  };
  const pin = (p, foe) => {
    p.pos.set(0, 0, 0); p.vel.set(0, 0, 0); p.aim.set(1, 0, 0); p.aim3.set(1, 0, 0); p.facing = Math.PI / 2;
    foe.vel.set(0, 0, 0);
  };

  try {
    // ==========================================================================================
    // I0 · THE HARNESS PROVES ITSELF FIRST
    // ==========================================================================================
    note('the tab is foregrounded (pixel numbers are meaningless in a hidden pane)', document.hidden ? 'HIDDEN — pixel rows below are NOT admissible' : 'visible');
    ok('the drawing buffer has a real size', rig.W > 64 && rig.H > 64, `${rig.W}×${rig.H} (centre box ${rig.bw}×${rig.bh})`, '> 64×64');

    const { p: p0, foe: f0 } = pinned('rage', 'sol', GAP);
    if (!p0 || !f0) throw new Error('no player/foe after startMode — the suite cannot proceed');

    game.world.renderer.info.autoReset = false;
    game.world.renderer.info.reset();
    rig.prepare();
    step();
    const calls = game.world.renderer.info.render.calls;
    const a0 = rig.readA();
    ok('the renderer actually DREW this frame (not a 0×0 early-out)', calls > 1, `${calls} draw calls`, '> 1');
    ok('...and the buffer is not a single flat colour', rig.variety() > 8, `${rig.variety()} distinct colours sampled`, '> 8');
    note('CENTRE baseline mean luminance L0', a0.mean.toFixed(1));

    // ---- I0c · THE OPPONENT IS ACTUALLY IN THE BOX ------------------------------------------
    // ⚠ WITHOUT THIS ROW, I1 MEASURES AN EMPTY PATCH OF SKY AND PASSES BEAUTIFULLY. This is the
    // `[].every()` failure in its pixel form.
    note('the pair under test', `${p0.def.id} vs ${f0.def.id} at ${GAP}u, mode ${modeId}, camera ${game.world.camMode || '?'}`);
    {
      // the live frame height at the opponent — the number every screen-relative size claim in
      // aaa-06 is denominated in, reported so the CENTRE-box rows can be read against it
      const c = game.world.camera;
      const fh = c.isOrthographicCamera ? game.world.frustum * 2
        : 2 * Math.hypot(c.position.x - f0.pos.x, c.position.y - f0.pos.y, c.position.z - f0.pos.z) * Math.tan((c.fov * Math.PI / 180) / 2);
      const sc = game.world.toScreen({ x: f0.pos.x, y: f0.pos.y + 4.8, z: f0.pos.z });
      note('frame height at the opponent · his screen position (0..1 from bottom-left)',
        `${fh.toFixed(1)}u — a 9.6u fighter is ${(9.6 / fh * 100).toFixed(1)}% of frame · at (${sc.x.toFixed(3)}, ${sc.y.toFixed(3)})`);
      ok('the opponent PROJECTS inside the CENTRE box (±12% W, ±16% H about centre)',
        Math.abs(sc.x - 0.5) < CBOX.hx && Math.abs(sc.y - 0.5) < CBOX.hy,
        `offset (${(sc.x - 0.5).toFixed(3)}, ${(sc.y - 0.5).toFixed(3)})`, `within (±${CBOX.hx}, ±${CBOX.hy})`);
    }
    // ⚠ BOTH RENDERS HAVE TO BE IN THE SAME POST-TICK STATE. `print.tick` runs at the END of
    // `world.render()` and clears `uInvert`, so the buffer left by `game.update()` may be INVERTED
    // while any manual re-render is not. Comparing those two measures the inversion, not the
    // silhouette. The A read used for the silhouette is therefore a manual re-render too — the
    // inverted buffer is compared separately, in I3, which is what it is actually evidence of.
    rig.prepare(); game.world.composer.render(); rig.readA();
    f0.obj.visible = false;
    rig.prepare(); game.world.composer.render(); rig.readB();
    f0.obj.visible = true;
    const base = rig.delta();
    const baseDelta = base.mean;
    const framed = ok('THE OPPONENT IS IN THE CENTRE BOX at rest (else nothing below can see him)',
      baseDelta > BAND.silhouette, `mean Δ ${baseDelta.toFixed(1)} · peak Δ ${base.max.toFixed(0)}`, `mean > ${BAND.silhouette}`);

    // ==========================================================================================
    // I1 / I2 / I3 · THE WORST-CASE SEQUENCE, SAMPLED EVERY FRAME
    // ==========================================================================================
    // ⚠ ONE RUN PRODUCES ALL THREE, and that is not an optimisation — aaa-06 §8.1 trap 4 says the
    // additive star and the inverted frame fire on the SAME frame from the same event, so measuring
    // them apart measures neither.
    // ⚠ THE WIND-UP IS SAMPLED TOO, AND IT IS NOT PADDING. The first version released the charge
    // BEFORE the sampled loop, so the punch connected on loop frame 0, there was no frame −1, and
    // `L0` silently fell back to a baseline captured in a different setup. I3 then compared two
    // unrelated numbers and reported NaN-adjacent nonsense. The frame before the connect has to be
    // a frame of the same shot.
    const runHaymaker = (label) => {
      const { p, foe } = pinned('rage', 'sol', GAP, 40);
      const samples = [];
      let hitFrame = -1, released = false;
      const hp0 = foe.hp;
      game.melee.chargeStart(p);
      for (let i = 0; i < 80; i++) {
        pin(p, foe);
        if (!released && p.meleeCharge >= 0.95) { game.melee.chargeRelease(p); released = true; }
        rig.prepare();
        step();                                  // <- the REAL frame; the buffer may be INVERTED
        const raw = rig.readA();                 // <- SAME TASK. No await between these two lines.
        const rawMean = raw.mean;
        // the same frame re-rendered POST-tick, i.e. with `uInvert` already cleared. Identical to
        // the buffer above on every frame except the one the impact frame was armed on.
        rig.prepare(); game.world.composer.render(); const A = rig.readA();
        foe.obj.visible = false;
        rig.prepare(); game.world.composer.render(); rig.readB();
        foe.obj.visible = true;
        const d = rig.delta();
        // ⚠ WHERE THE OPPONENT IS ON SCREEN IS RECORDED WITH EVERY SAMPLE, and it is the difference
        // between two opposite conclusions. A silhouette delta that falls because the effects erased
        // him is an IMPACT finding; one that falls because a 50 u/s launch carried him out of the
        // box is a CAMERA finding. Without this column the number cannot tell you which.
        const sc = game.world.toScreen({ x: foe.pos.x, y: foe.pos.y + 4.8, z: foe.pos.z });
        const inBox = Math.abs(sc.x - 0.5) < CBOX.hx && Math.abs(sc.y - 0.5) < CBOX.hy;
        if (hitFrame < 0 && foe.hp < hp0 - 0.01) hitFrame = i;
        samples.push({ i, mean: A.mean, raw: rawMean, blow: A.blowout, sil: d.mean, silMax: d.max, released, sx: sc.x, sy: sc.y, inBox });
        if (hitFrame >= 0 && i > hitFrame + 12) break;
      }
      return { label, samples, hitFrame, dmg: +(hp0 - foe.hp).toFixed(1) };
    };

    const hay = runHaymaker('fxImpact ON');
    ok('a point-blank HAYMAKER lands at all (drive the gate, not the value)', hay.hitFrame >= 0 && hay.dmg > 5, `${hay.dmg} dmg on frame ${hay.hitFrame}`, '> 5 dmg');

    // ⚠ THE WINDOW IS THE EFFECTS, NOT THE FLIGHT. Past ~8 frames the opponent is simply receding
    // under a 50 u/s launch, and a silhouette delta that falls because he is further away is not a
    // statement about whether the frame erased him. Grade where the effects live.
    const win = hay.hitFrame >= 0 ? hay.samples.slice(Math.max(0, hay.hitFrame - 3), hay.hitFrame + 8) : hay.samples;
    // only the frames in which he is still IN the box can say anything about whether he is READABLE
    const graded = win.filter((s) => s.inBox);
    const minSil = graded.length ? Math.min(...graded.map((s) => s.sil)) : NaN;
    const worstSil = graded.length ? graded.reduce((a, s) => (s.sil < a.sil ? s : a), graded[0]) : { i: -1, silMax: NaN };
    const silAtHit = hay.hitFrame >= 0 ? hay.samples[hay.hitFrame].sil : 0;
    note('I1 · silhouette delta frame by frame around the connect (mean/peak, ˣ = he has left the box)',
      win.map((s) => `${s.i === hay.hitFrame ? '*' : ''}${s.sil.toFixed(1)}/${s.silMax.toFixed(0)}${s.inBox ? '' : 'ˣ'}`).join(' '));
    ok('I1 · SILHOUETTE DELTA holds through the whole worst-case sequence', graded.length > 0 && minSil > BAND.silhouette,
      `min mean Δ ${Number(minSil).toFixed(1)} (peak Δ ${Number(worstSil.silMax).toFixed(0)}) at frame ${worstSil.i}, over ${graded.length}/${win.length} in-box frames`,
      `> ${BAND.silhouette}`);
    ok('I1 · ...including ON the impact frame itself', silAtHit > BAND.silhouette,
      `Δ ${silAtHit.toFixed(1)}`, `> ${BAND.silhouette}`);
    // ⚠ THE DIAGNOSIS, NOT JUST THE NUMBER. mean and peak disagree on purpose: a HIGH peak with a
    // LOW mean says the opponent is perfectly legible and simply small inside a box sized in
    // fractions of the frame — an AREA deficit that the rim light (conflict C10) cannot fix. Both
    // falling together says the effects erased him, which is what §3's size clamp is for.
    if (!framed || minSil <= BAND.silhouette) {
      const restMax = base.max, hitMax = hay.hitFrame >= 0 ? hay.samples[hay.hitFrame].silMax : NaN;
      note('I1 · WHICH deficit this is',
        `at rest peak Δ ${restMax.toFixed(0)} (he is legible, occupying a small share of the box → AREA/framing) · ` +
        `on the connect peak Δ ${Number(hitMax).toFixed(0)} (${hitMax < restMax * 0.4 ? 'the effects DO erase him → the §3 size clamp is the lever' : 'still legible'})`);
    }

    // I2 — every frame but the single impact frame
    const nonImpact = hay.samples.filter((s) => s.i !== hay.hitFrame);
    const worstBlow = nonImpact.reduce((a, s) => (s.blow > a.blow ? s : a), nonImpact[0]);
    ok('I2 · no blowout — CENTRE pixels over L 235 stay under 2% on every non-impact frame',
      worstBlow.blow < BAND.blowout, `${(worstBlow.blow * 100).toFixed(2)}% worst (frame ${worstBlow.i})`, '< 2%');

    // ---- I1/I2-RED · THE SILHOUETTE KNOWN-BAD ------------------------------------------------
    // ⚠ I1 IS THE METRIC THAT CANNOT BE GAMED BY TURNING THINGS DOWN, so its known-bad turns
    // something UP. If a blown-out frame does not collapse the delta, the delta is not measuring
    // whether the opponent is readable and every I1 number above is inadmissible.
    {
      const { p, foe } = pinned('rage', 'sol', GAP, 30);
      const undoBlow = injectBlowout(game);
      let minD = 1e9, maxBlow = 0;
      for (let i = 0; i < 12; i++) {
        pin(p, foe);
        rig.prepare(); step();
        rig.prepare(); game.world.composer.render(); const A = rig.readA();
        foe.obj.visible = false; rig.prepare(); game.world.composer.render(); rig.readB(); foe.obj.visible = true;
        minD = Math.min(minD, rig.delta().mean); maxBlow = Math.max(maxBlow, A.blowout);
      }
      undoBlow();
      ok('I1-RED · KNOWN-BAD blown bloom — the silhouette delta collapses',
        minD < baseDelta * 0.6, `Δ ${minD.toFixed(1)} vs a healthy ${baseDelta.toFixed(1)}`, `< ${(baseDelta * 0.6).toFixed(1)}`);
      ok('I2-RED · ...and the same injection drives CENTRE blowout past 2%',
        maxBlow > BAND.blowout, `${(maxBlow * 100).toFixed(2)}%`, '> 2%');
    }

    // ==========================================================================================
    // I3 · THE IMPACT FRAME
    // ==========================================================================================
    // ⚠ ASSERT THE RELATIONSHIP, NOT THE VALUE (rubric RULE M-B). The rubric writes the band as
    // `L0 → 255−L0 → L0`, and that form is only true once §3's size clamp lands — TODAY the
    // additive impact star fires on the SAME frame from the SAME event and blows the centre to
    // white, so the inverted frame comes back DARK rather than bright. aaa-06 §8.1 trap 4 predicts
    // exactly this ("inverting a blown-out white star produces a black blob"), and a value-based
    // assertion here would go red on the correct behaviour and green after any re-tune.
    //
    // The relationship is exact and survives every future change. The shader is
    // `c' = mix(c, 1−c, u)` = `u + c(1−2u)` — LINEAR, so it holds on the MEAN of the region too.
    // Measuring the same frame twice (once as drawn, once re-rendered after `tick` cleared
    // `uInvert`) recovers `u` directly:  u = (L' − L) / (255 − 2L).
    // `game.js:2756` sets u = min(1, 0.7 + amount/260), so a connect must land in [0.7, 1.0].
    const invOf = (s) => (255 - 2 * s.mean === 0 ? 0 : (s.raw - s.mean) / (255 - 2 * s.mean));
    const invFrames = hay.samples.filter((s) => Math.abs(s.raw - s.mean) > 4);
    const hitS = hay.hitFrame >= 0 ? hay.samples[hay.hitFrame] : null;
    const uEst = hitS ? invOf(hitS) : NaN;
    note('I3 · frames whose drawn buffer differs from the same frame re-rendered un-inverted',
      invFrames.length ? invFrames.map((s) => `#${s.i} ${s.mean.toFixed(0)}→${s.raw.toFixed(0)} (u≈${invOf(s).toFixed(2)})`).join(' · ') : 'none');
    ok('I3 · the connect frame IS an inversion of itself, at the strength `game.js:2756` derives',
      !!hitS && uEst >= 0.65 && uEst <= 1.05,
      hitS ? `u ≈ ${uEst.toFixed(3)} (frame ${hay.hitFrame}: drawn ${hitS.raw.toFixed(1)} vs un-inverted ${hitS.mean.toFixed(1)})` : 'no connect',
      'u in [0.7, 1.0] — min(1, 0.7 + amount/260)');
    ok('I3 · ...and it is EXACTLY ONE FRAME (`_invT` counts FRAMES, never seconds)',
      invFrames.length === 1 && invFrames[0].i === hay.hitFrame,
      `${invFrames.length} inverted frame(s)${invFrames.length ? ` at ${invFrames.map((s) => s.i).join(',')}` : ''}, connect at ${hay.hitFrame}`,
      'exactly 1, on the connect');

    // ---- I3-RED · THE MANDATED KNOWN-BAD -----------------------------------------------------
    // ⚠ THIS IS THE ADMISSIBILITY ROW FOR THE WHOLE IMPACT AXIS. With `fxImpact` false NO frame
    // may differ from its own un-inverted re-render. If one still does, this gauge is not measuring
    // the print pass and every number above it is inadmissible rather than merely failed.
    const undoImpact = injectNoImpactFrame(game);
    const off = runHaymaker('fxImpact OFF');
    undoImpact();
    const offInv = off.samples.filter((s) => Math.abs(s.raw - s.mean) > 4);
    const offHitS = off.hitFrame >= 0 ? off.samples[off.hitFrame] : null;
    ok('I3-RED · KNOWN-BAD `fxImpact = false` — the connect frame stays UN-inverted',
      !!offHitS && offInv.length === 0,
      offHitS ? `${offInv.length} inverted frames over ${off.samples.length} (connect at ${off.hitFrame}, drawn ${offHitS.raw.toFixed(1)} vs ${offHitS.mean.toFixed(1)})` : 'no connect',
      '0 inverted frames');
    ok('I3-RED · ...and the ON run was genuinely different (the gauge can SEE the effect at all)',
      invFrames.length === 1 && offInv.length === 0,
      `ON ${invFrames.length} inverted frame · OFF ${offInv.length}`, '1 vs 0');

    await new Promise((r) => requestAnimationFrame(r));

    // ==========================================================================================
    // I4 / I7 · THE SHAKE — dynamic range, the ceiling, the step budget, and the eye
    // ==========================================================================================
    // ⚠ NO PIXELS NEEDED, and none are read here. The subject is the camera's orientation, which is
    // arithmetic on `camera.quaternion` against `world.camTarget` — the exact pair `chase()` sets.
    const W = game.world;

    /** peak angular deviation, and worst per-frame step, over `n` frames at `dt` */
    const watch = (p, foe, n, dt) => {
      let peak = 0, step2 = 0, posDev = 0;
      let prev = null;
      for (let i = 0; i < n; i++) {
        pin(p, foe);
        step(dt);
        const a = shakeAngle(W);
        if (a > peak) peak = a;
        const f = camForward(W.camera.quaternion);
        if (prev) { const s = angBetween(prev, f); if (s > step2) step2 = s; }
        prev = f;
        const pd = Math.hypot(W.camera.position.x - W.camPos.x, W.camera.position.y - W.camPos.y, W.camera.position.z - W.camPos.z);
        if (pd > posDev) posDev = pd;
      }
      return { peak, step2, posDev };
    };

    const ladder = {};
    for (const weight of ['jab', 'straight', 'haymaker']) {
      const { p, foe } = pinned('rage', 'sol', GAP, 45);
      W._shake = 0;
      const rest = watch(p, foe, 12, DT40);              // the camera at rest, for the noise floor
      swing(p, foe, weight);
      const got = watch(p, foe, 45, DT40);
      ladder[weight] = { peak: got.peak, step: got.step2, rest: rest.peak, posDev: got.posDev };
    }

    // the TOP of the ladder, driven through `world.shake()` at the amplitude the biggest events book
    // ⚠ THE RUBRIC ITSELF SANCTIONS THIS SEAM for the ceiling test (§1.2 C-SHAKE: *"with `_shake`
    // driven to its clamp of 8 through `world.shake()`"*). A live beam overpower needs two beamers
    // holding on each other and belongs to a lane that owns projectiles.js.
    const ceilingOf = (amount) => {
      const { p, foe } = pinned('rage', 'sol', GAP, 45);
      W._shake = 0;
      W.shake(amount);
      return watch(p, foe, 40, DT40);
    };
    const sweep = {};
    for (const a of [0.35, 1.15, 2.545, 6.94, 8]) sweep[a] = ceilingOf(a);

    note('I4 · the real ladder — peak angular deviation, degrees',
      ['jab', 'straight', 'haymaker'].map((k) => `${k} ${ladder[k].peak.toFixed(2)}°`).join(' · '));
    note('I4 · the `world.shake(a)` sweep — where it saturates',
      Object.entries(sweep).map(([a, v]) => `${a}→${v.peak.toFixed(2)}°`).join(' · '));

    const jabPeak = Math.max(0.0001, ladder.jab.peak);
    const topPeak = sweep[8].peak;
    ok('I4 · shake dynamic range jab → ceiling', topPeak / jabPeak >= BAND.shakeRange,
      `${(topPeak / jabPeak).toFixed(2)}×`, `>= ${BAND.shakeRange}×`);
    ok('I4 · ...and it is flat ONLY above `_shake` 6.94 (not from 2.545)',
      Math.abs(sweep[2.545].peak - sweep[6.94].peak) > 0.08,
      `2.545→${sweep[2.545].peak.toFixed(2)}° vs 6.94→${sweep[6.94].peak.toFixed(2)}°`, 'a real difference');

    const anyPeak = Math.max(topPeak, ...Object.values(ladder).map((l) => l.peak));
    ok('I7 · peak angular camera displacement, ANY event', anyPeak <= BAND.shakePeak, `${anyPeak.toFixed(2)}°`, `<= ${BAND.shakePeak}°`);
    const anyStep = Math.max(sweep[8].step2, ...Object.values(ladder).map((l) => l.step));
    ok('I7 · max per-frame angular STEP at dt = 1/40 (the Deck cadence)', anyStep <= BAND.shakeStep, `${anyStep.toFixed(2)}°`, `<= ${BAND.shakeStep}°`);

    // ⚠ THE STALE CLAIM, SETTLED WITH A NUMBER. `docs/POWERWORLD.md:717` still records
    // `world.shake()` as the WORLD-SPACE one producing 29.7° and passing the camera through the
    // fighter. `aaa-06-impact.md` §0.2 says it was fixed inside `chase()` and the figure is dead.
    // Wave 0 does not fix either — it MEASURES, so Wave 4 acts on a number instead of two documents.
    ok('I7 · THE EYE NEVER MOVES — the chase shake is angular, on the look point only',
      sweep[8].posDev <= BAND.camPosDev, `${sweep[8].posDev.toFixed(6)}u of eye deviation at _shake 8`, `<= ${BAND.camPosDev}u`);
    note('I7 · verdict on the 29.7° world-space claim (POWERWORLD.md:717)',
      sweep[8].posDev <= BAND.camPosDev && anyPeak < 5
        ? `STALE — measured ${anyPeak.toFixed(2)}° angular, 0u eye motion. The doc is wrong.`
        : `STANDS — measured ${anyPeak.toFixed(2)}° with ${sweep[8].posDev.toFixed(3)}u of eye motion.`);

    // ---- I4-RED · the shake known-bad --------------------------------------------------------
    const undoShake = injectNoShake(game);
    const dead = ceilingOf(8);
    undoShake();
    ok('I4-RED · KNOWN-BAD `shakeMult = 0` — the ladder collapses to nothing',
      dead.peak < 0.02 && topPeak > 0.2, `${dead.peak.toFixed(3)}° vs a healthy ${topPeak.toFixed(2)}°`, 'flat');

    await new Promise((r) => requestAnimationFrame(r));

    // ==========================================================================================
    // I5 · HITSTOP DISCIPLINE
    // ==========================================================================================
    // ⚠ THE LAW FIRST: `opts.hitstop ?? 0.04`, never `||` (entity.js:696-701). Sustained sources
    // pass a MEANINGFUL zero; with `||` that became 0.04 and was re-armed every frame, which is the
    // "shoot the training dummy and it freezes" report and made every beam an infinite stunlock.
    // This suite asserts the zero survives, because that is the form the law takes at runtime.
    // ⚠ THE GUARD HAS TO BE DRIVEN AND IT HAS TO FACE THE RIGHT WAY. Two traps in one row:
    //   · `f.guarding = true` written directly is overwritten by `melee.update` — `melee.guard(f,
    //     on)` is the door, and it is the one the C/Mouse4-5 binding calls.
    //   · `_front(foe, atk)` (melee.js:164) tests the foe's **`aim`**, not its `facing`. A foe with
    //     the default aim blocks nothing and the row reports "the block law does not fire" when
    //     what actually happened is that the harness stood him with his back turned.
    const hitstopRun = (weight, guard) => {
      const { p, foe } = pinned('rage', 'sol', GAP, 40);
      let aStop = 0, vStop = 0, hitAt = -1;
      const hp0 = foe.hp;
      let poseIn = null, poseOut = null, lastIn = null;
      const brace = () => { if (!guard) return; foe.aim.set(-1, 0, 0); foe.aim3.set(-1, 0, 0); foe.facing = -Math.PI / 2; game.melee.guard(foe, true); };
      brace();
      swing(p, foe, weight);
      for (let i = 0; i < 60; i++) {
        pin(p, foe);
        brace();
        step();
        if (hitAt < 0 && (foe.hp < hp0 - 0.001 || p.hitstop > 0)) {
          hitAt = i; aStop = p.hitstop; vStop = foe.hitstop;
          if (p.parts) poseIn = { arm: p.parts.armR.rotation.x, leg: p.parts.legL.rotation.x };
        }
        if (hitAt >= 0 && p.hitstop > 0 && p.parts) lastIn = { arm: p.parts.armR.rotation.x, leg: p.parts.legL.rotation.x };
      }
      poseOut = lastIn;
      return {
        aStop: +aStop.toFixed(3), vStop: +vStop.toFixed(3), hit: hitAt >= 0, blocked: !!(guard && foe.guarding),
        dArm: poseIn && poseOut ? Math.abs(poseOut.arm - poseIn.arm) : NaN,
        dLeg: poseIn && poseOut ? Math.abs(poseOut.leg - poseIn.leg) : NaN,
      };
    };

    const hs = { jab: hitstopRun('jab', false), straight: hitstopRun('straight', false), haymaker: hitstopRun('haymaker', false), blockedJab: hitstopRun('jab', true) };
    note('I5 · hitstop, attacker / victim, per strike path',
      Object.entries(hs).map(([k, v]) => `${k} ${v.aStop}/${v.vStop}`).join(' · '));
    const clean = ['jab', 'straight', 'haymaker'].filter((k) => hs[k].hit);
    ok('I5 · THE ATTACKER UNFREEZES FIRST on every connecting strike',
      clean.length > 0 && clean.every((k) => hs[k].aStop <= hs[k].vStop + 1e-9),
      clean.map((k) => `${k} ${hs[k].aStop} <= ${hs[k].vStop}`).join(' · ') || 'no strike connected',
      'attacker <= victim on all');
    // ⚠ A DECLARED INVERSION, NOT A DEFECT. `melee.js:257` gives the attacker 0.09 against the
    // blocker's 0.07 on purpose — a blocked jab is punishable, which is the whole block law. The
    // suite asserts the exception explicitly so nobody later "fixes" it to match the invariant.
    ok('I5 · a BLOCKED jab deliberately INVERTS the invariant (the attacker is punishable)',
      hs.blockedJab.blocked && hs.blockedJab.hit ? hs.blockedJab.aStop >= hs.blockedJab.vStop : false,
      `${hs.blockedJab.aStop} vs ${hs.blockedJab.vStop}${hs.blockedJab.blocked ? '' : ' (the guard never engaged — harness, not engine)'}`,
      'attacker >= victim, by design (melee.js:257)');
    ok('I5 · the POSE FREEZES across the hitstop (aaa-06 §12.3 — `_animate(dt)` should be `_animate(0)`)',
      Number.isFinite(hs.haymaker.dArm) && hs.haymaker.dArm < 1e-6 && hs.haymaker.dLeg < 1e-6,
      `armR Δ ${Number(hs.haymaker.dArm).toFixed(4)} rad · legL Δ ${Number(hs.haymaker.dLeg).toFixed(4)} rad`,
      'exactly 0.0000 on both');

    // ==========================================================================================
    // I6 · THE CENTRE IS NOT IN THE DOM'S WAY
    // ==========================================================================================
    try { if (hud && hud.update) hud.update(); } catch (e) { errs.push('hud.update: ' + ((e && e.message) || e)); }
    const box = rig.cssBox();
    const hits = [];
    // ⚠ THE ROOTS ARE POSITIONING LAYERS AND ARE JUDGED SEPARATELY. `#hDmg` and `#comicLayer` are
    // full-viewport `pointer-events:none` containers that paint nothing themselves; grading their
    // own rects would report a permanent, meaningless failure and train everyone to ignore red.
    // What matters is whether anything DRAWN lands in the box.
    for (const sel of ['#hDmg', '#hHits', '#comicLayer']) {
      const root = document.querySelector(sel);
      if (!root) continue;
      for (const el of root.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        const st = getComputedStyle(el);
        if (st.visibility === 'hidden' || st.display === 'none' || +st.opacity === 0) continue;
        if (r.right > box.x0 && r.left < box.x1 && r.bottom > box.y0 && r.top < box.y1) hits.push(`${sel} ${el.className || el.tagName}`);
      }
    }
    ok('I6 · nothing DRAWN by #hDmg / #hHits / #comicLayer intersects the CENTRE box',
      hits.length === 0, hits.length ? hits.slice(0, 4).join(', ') : 'clear', '0 intersections');

    // ==========================================================================================
    // I8 · `punch()` IN THE DIMENSION — measured, not fixed (aaa-06 §0.3)
    // ==========================================================================================
    // `punch(z)` only ever ratchets `frustumTarget` DOWN, and `chase()` never reads or damps it, so
    // a PowerWorld session should end with the city's 78 parked at 78 × (smallest z seen).
    {
      const { p, foe } = pinned('rage', 'sol', GAP, 30);
      // ⚠ THE BASELINE HAS TO BE SET OR THE ROW CANNOT FAIL. `punch()` only ever ratchets DOWN
      // (`Math.min`), so by the time a suite gets here the value is already parked wherever the
      // opening cinematic left it and a before/after comparison reads "unchanged" forever. Put it
      // back at the city's own frustum first, then throw the punch. Writing the STARTING condition
      // is setup; writing the measured quantity would be the trap.
      game.world.frustumTarget = game.world.frustum;
      const before = game.world.frustumTarget;
      swing(p, foe, 'haymaker');
      for (let i = 0; i < 40; i++) { pin(p, foe); step(); }
      const after = game.world.frustumTarget;
      note('I8 · `world.frustumTarget` across a PowerWorld haymaker', `${before.toFixed(1)} → ${after.toFixed(1)}`);
      ok('I8 · `punch()` does not leave the dimension holding a ratcheted frustum (aaa-06 §0.3)',
        Math.abs(after - before) < 0.01, `${after.toFixed(1)}`, `unchanged at ${before.toFixed(1)}`);
    }

    // ==========================================================================================
    // 9 · THE LIGHT COUNT AND THE PROGRAM COUNT NEVER MOVE (the light-count law)
    // ==========================================================================================
    {
      const countLights = () => { let n = 0; game.world.scene.traverse((o) => { if (o.isLight && o.visible) n++; }); return n; };
      const { p, foe } = pinned('rage', 'sol', GAP, 30);
      const l0 = countLights();
      game.world.renderer.info.reset();
      for (let i = 0; i < 20; i++) { pin(p, foe); step(); }
      const prog0 = game.world.renderer.info.programs ? game.world.renderer.info.programs.length : 0;
      swing(p, foe, 'haymaker');
      let lMin = l0, lMax = l0;
      for (let i = 0; i < 50; i++) { pin(p, foe); step(); const n = countLights(); lMin = Math.min(lMin, n); lMax = Math.max(lMax, n); }
      const prog1 = game.world.renderer.info.programs ? game.world.renderer.info.programs.length : 0;
      ok('the visible light COUNT never changes across an impact (three.js recompiles every material if it does)',
        lMin === lMax, `${lMin}..${lMax}`, `${l0} throughout`);
      ok('...and no shader programs are compiled after warm-up', prog1 - prog0 <= 0, `${prog0} → ${prog1}`, 'no growth');
    }
  } catch (e) {
    R.push({ name: 'SUITE THREW', pass: false, got: String((e && e.stack) || e).slice(0, 500), want: 'no throw' });
  } finally {
    // ⚠ ALWAYS, even on a throw. A harness that leaves `game.update` stubbed bricks the page.
    game.update = realUpdate;
    game.controlPlayer = prevCP;
    game.running = prevRunning;
    game.world.renderer.info.autoReset = prevAutoReset;
    game.world.renderer.setScissorTest(false);
    if (game.news && prevNews !== null) game.news.enabled = prevNews;
    console.error = oldErr;
  }

  const fails = R.filter((r) => !r.pass);
  const out = {
    checks: R.length,
    failures: fails.map((r) => `${r.name} — got ${r.got}, want ${r.want}`),
    consoleErrors: errs.length,
    errorSample: errs.slice(0, 5),
    rows: R.map((r) => `${r.pass ? 'PASS' : 'FAIL'}  ${r.name} — got ${r.got}, want ${r.want}`),
  };
  if (!opts.quiet) {
    console.log(`%cPWIMPACT — ${R.length} checks, ${fails.length} failures, ${errs.length} console errors`, 'font-weight:bold');
    console.table(R);
  }
  return out;
}

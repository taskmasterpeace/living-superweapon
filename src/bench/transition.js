// =================================================================================================
// G-MOVE · THE TRANSITION GAUGE — `LSW.transitionSuite()`  (WAVE 0; rubric §1.5, T1–T5; aaa-03 §10)
//
// ⚠ READ THIS BEFORE READING A NUMBER OUT OF IT. `f.gait` DOES NOT EXIST YET.
// `POWERWORLD_AAA.md` §1.2 makes `f.gait` canonical and §1.3 names the reason it cannot be measured
// today: `entity.js:1450`'s flight-exit test carries a `!this._openSky` term, so **there is no exit
// from flight mode in PowerWorld at all** — `flying` stays true while a fighter stands on the floor,
// and with it there is no GROUNDED state, no `SETTLE`, no `CRASH`, and nothing for `GAIT_OWNER` to
// answer. WAVE 2 · GAIT owns that field. Wave 0 owns the INSTRUMENT.
//
// So this file does three things and refuses to do a fourth:
//   1. It measures the transition facts that ARE observable today — input latency across a real
//      state change, velocity continuity across one, the self-inflicted-landing rule, and the
//      knockback dip — on the channel that exists (`flying`), and says so on every row.
//   2. It reads `f.gait` and `GAIT_OWNER` through the page's own module graph on every frame it
//      samples, so **the day Wave 2 lands the field this suite starts reporting real T1 coverage
//      with no edit.** The channel it used is reported in `metrics.channel`.
//   3. It reports the gap honestly — T1 coverage 0.00%, "no gait field" — rather than passing on an
//      empty list. `[].every()` is `true`, and that is exactly how the slot-facts pass nearly
//      shipped two green assertions over nothing.
//   4. It does NOT implement gait, does not touch `entity.js`, and does not simulate a gait machine
//      in the harness so the numbers look finished. A harness that models the feature it is meant
//      to measure grades its own homework.
//
// ⚠ THE GATE IS THE RED RUN. The rubric's TRANSITIONS known-bad is "write one gait directly,
// bypassing the owner"; today there is no gait and no owner, so that exact injection is
// NOT-EXPRESSIBLE and `injectBadGait()` says so in one line and returns a no-op — with the code it
// will run once the field exists written out in full at its definition. The OTHER half of the same
// rubric row — "T3's Δv exceeds 1e-3" — IS expressible today, because T3 is about a transition
// writing velocity and a transition writing velocity can be injected at runtime. That is
// `injectVelocityWritingTransition`, and the suite fails itself if it cannot see it.
//
// THE TRAPS (rubric §5.4 / aaa-03 §10.2) — same eight as `pwmove.js`, and paid for the same way:
// the harness owns `game.update` AND `input.endFrame()`; keys come from
// `KEYMAPS[SETTINGS.scheme]`; fighters are picked by TEAM; `runSlot(c, key, inp, g)` is fighter
// first; constants are read off `window.LSW`, never a fresh `import()` — except `core/util.js`,
// which is resolved through the URL the PAGE already loaded (`specifierFor` at the foot of this
// file, the same helper `src/bench/powerworld.js` uses) so it is the page's instance, not a second
// one. And T1's frame count is 10,000 because a shorter test cannot find a higher lid.
// =================================================================================================

const DT = 1 / 60;

// The six states and their owners, from POWERWORLD_AAA.md §1.2. ⚠ THIS IS A FALLBACK FOR REPORTING
// ONLY and is never used to decide a verdict: if `core/util.js` exports `GAIT_OWNER` the suite uses
// the engine's own table, and if it does not, coverage is reported as 0% with the field named
// absent. Two copies of a rule is how a rule drifts; this copy exists so the row can print the six
// state names it is looking for, not so the harness can answer for the engine.
const EXPECTED_GAITS = ['grounded', 'lift', 'airborne', 'stoop', 'settle', 'crash'];

// -------------------------------------------------------------------------------------------------
// THE KNOWN-BAD, HALF ONE — expressible today.
// "T3's Δv exceeds 1e-3": a transition that WRITES VELOCITY. Wrapped around one fighter's own
// `update`, it watches the tracked channel and, on the frame it changes, scales the horizontal
// velocity — precisely the defect T3 exists to catch, injected at runtime with no source change.
// -------------------------------------------------------------------------------------------------
export function injectVelocityWritingTransition(game, who = null, factor = 0.5) {
  const f = who || (game.humans && game.humans[0] && game.humans[0].fighter);
  if (!f) return () => {};
  const orig = f.update.bind(f);
  let last = f.gait !== undefined ? f.gait : f.flying;
  f.update = (dt, g) => {
    orig(dt, g);
    const now = f.gait !== undefined ? f.gait : f.flying;
    if (now !== last) { f.vel.x *= factor; f.vel.z *= factor; }
    last = now;
  };
  return () => { delete f.update; };
}

// -------------------------------------------------------------------------------------------------
// THE KNOWN-BAD, HALF TWO — NOT expressible yet, and this is the written record of why.
//
// The rubric asks for "write one gait directly, bypassing the owner", whose witness is
// "T1 coverage drops below 100.00%". Both halves need the field:
//   · there is no `f.gait` to write, and
//   · T1 coverage is already 0.00% because nothing sets one, so it cannot DROP.
// The moment WAVE 2 · GAIT lands `_updateGait` this function does the real thing with no redesign —
// it re-wraps `update` and stamps a value the owner never produces, so `GAIT_OWNER[f.gait]` comes
// back `undefined` and T1's coverage falls by exactly one fighter's share of the samples:
//
//     f.update = (dt, g) => { orig(dt, g); f.gait = 'orbiting'; };   // a state with no owner
//
// It is written here rather than in a TODO because the injection is the gate, and a gate described
// in prose in another document is a gate nobody runs.
// -------------------------------------------------------------------------------------------------
export function injectBadGait(game, who = null) {
  const f = who || (game.humans && game.humans[0] && game.humans[0].fighter);
  if (!f || f.gait === undefined) return { expressible: false, undo: () => {}, why: 'no `f.gait` field on a live fighter — WAVE 2 · GAIT owns it (POWERWORLD_AAA.md §1.2/§1.3)' };
  const orig = f.update.bind(f);
  f.update = (dt, g) => { orig(dt, g); f.gait = 'orbiting'; };
  return { expressible: true, undo: () => { delete f.update; }, why: '' };
}

// =================================================================================================
export async function transitionSuite(game, hud, opts = {}) {
  const L = window.LSW;
  const inp = L.input;
  const KM = L.KEYMAPS[L.SETTINGS.scheme] || L.KEYMAPS.classic;
  const R = [];
  const findings = [];
  const errs = [];
  const oldErr = console.error;
  console.error = (...a) => { errs.push(String(a[0]).slice(0, 160)); oldErr(...a); };

  const realUpdate = game.update.bind(game);
  const prevRender = game.world.render.bind(game.world);
  const prevCP = game.controlPlayer;
  const prevRunning = game.running;
  const prevNews = game.news ? game.news.enabled : null;
  const prevSlam = game.onSlam ? game.onSlam.bind(game) : null;

  const row = (id, name, verdict, got, want, note) => {
    R.push({ id, name, verdict, got, want, note: note || '' });
    if (verdict === 'GAP') findings.push(`${id} ${name} — got ${got}, want ${want}. ${note || ''}`);
    return verdict === 'PASS';
  };
  const ok = (id, name, pass, got, want) => row(id, name, pass ? 'PASS' : 'FAIL', got, want);

  const key = (code, dn) => dispatchEvent(new KeyboardEvent(dn ? 'keydown' : 'keyup', { code, bubbles: true }));
  const step = (n = 1) => { for (let i = 0; i < n; i++) { realUpdate(DT); inp.endFrame(); } };
  const ALLKEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', KM.up, KM.down, KM.fly, KM.strike, KM.guard, KM.item];
  const release = () => { for (const c of ALLKEYS) key(c, false); };
  const hs = (f) => Math.hypot(f.vel.x, f.vel.z);

  const stand = (modeId, p1, p2 = 'vega') => {
    try { hud.hideTitle && hud.hideTitle(); } catch (e) {}
    game.running = true;
    game.world.render = () => {};
    game.startMode(modeId, { p1, p2, enemy: p2 });
    if (game.news) game.news.enabled = false;
    step(20);
    // ⚠ BY TEAM, NEVER BY INDEX — `entities[1]` has been the KMK 9 camera operator.
    const p = game.humans[0].fighter;
    const foe = game.entities.find((e) => e.def && e.team !== p.team && !e.isDummy);
    if (foe) { foe.ai = null; foe.pos.set(0, 0, 600); foe.vel.set(0, 0, 0); }
    game.hardLock = null;
    // ⚠ `opts.inject` RUNS THE WHOLE SUITE UNDER THE KNOWN-BAD — the RED run, on demand. Re-applied
    // per `stand()` because `startMode` builds a NEW Fighter: an injection installed once reaches a
    // body nobody drives, and the run comes back green while claiming to be poisoned.
    if (opts.inject === 'veltransition') injectVelocityWritingTransition(game, p, 0.5);
    if (opts.inject === 'badgait') injectBadGait(game, p);
    return { p, foe };
  };
  // ⚠ IDEMPOTENT, AND THAT MATTERS. `KM.fly` is a TOGGLE, and under an open sky `flying` never goes
  // false on its own — so a second unconditional `climb()` inside the same match turns flight OFF
  // and every trial after it measures a fighter falling. Ask what state it is in first.
  const setFly = (f, want) => { if (!!f.flying !== want) { key(KM.fly, true); step(1); key(KM.fly, false); step(1); } };
  const climb = (frames, f) => { setFly(f || game.humans[0].fighter, true); key(KM.up, true); step(frames); key(KM.up, false); step(2); };

  const M = { channel: null, gaitPresent: false, gaitOwnerTable: null };
  let GAIT_OWNER = null;

  try {
    game.update = () => {};

    // ------------------------------------------------------------------------------------------
    // Resolve the engine's OWN gait table. ⚠ THE PHANTOM-MODULE LAW: vite version-stamps modules,
    // so `import('/src/core/util.js')` can hand back a SECOND instance with its own state. The
    // specifier the PAGE actually loaded is recovered from the resource timeline first, so what is
    // read here is the same object `entity.js` writes against.
    // Today `GAIT_OWNER` is undefined — that is the finding, not an error.
    // ------------------------------------------------------------------------------------------
    let util = null;
    try { util = await import(/* @vite-ignore */ specifierFor('core/util.js')); } catch (e) { util = null; }
    GAIT_OWNER = (util && util.GAIT_OWNER) || L.GAIT_OWNER || opts.gaitOwner || null;
    M.utilSpecifier = specifierFor('core/util.js');

    // ==========================================================================================
    // M0 · THE HARNESS PROVES ITSELF (aaa-03 §10, M0)
    // ==========================================================================================
    let { p } = stand('powerworld', 'sol');
    const y0 = p.pos.y;
    climb(90);
    ok('M0a', 'ASCEND through the real key path leaves the ground under an open sky',
      p.flying && p.pos.y > y0 + 20, `flying=${p.flying}, y ${y0.toFixed(1)} → ${p.pos.y.toFixed(1)}`,
      'flying, and risen');
    M.gaitPresent = p.gait !== undefined;
    M.gaitOwnerTable = GAIT_OWNER ? Object.keys(GAIT_OWNER) : null;
    if (M.gaitPresent && GAIT_OWNER) {
      ok('M0b', 'and `gait` reaches AIRBORNE', GAIT_OWNER[p.gait] === 'air', p.gait, 'an air-owned gait');
      M.channel = 'gait';
    } else {
      row('M0b', 'and `gait` reaches AIRBORNE', 'GAP',
        `f.gait is ${p.gait === undefined ? 'absent' : String(p.gait)}; GAIT_OWNER ${GAIT_OWNER ? 'present' : 'absent'}`,
        'gait === AIRBORNE',
        'WAVE 2 · GAIT — POWERWORLD_AAA.md §1.2 makes `f.gait` canonical and §1.3 records why it '
        + 'cannot exist yet: `!this._openSky` in the flight-exit test at entity.js:1450 means '
        + '`flying` never goes false in PowerWorld, so there is no grounded state to name. '
        + 'This suite falls back to the `flying` channel and reports every row against it.');
      M.channel = 'flying';
    }
    const chan = (f) => (M.channel === 'gait' ? f.gait : f.flying);
    release(); step(4);

    // ==========================================================================================
    // T1 · NO FRAME IS UNGOVERNED — 10,000 driven frames, randomised input, two fighters.
    // ⚠ The 10,000 is not padding (trap 8). It also serves as the console-error soak for this lane.
    // ==========================================================================================
    {
      const frames = opts.frames || 10000;
      const st = stand('powerworld', 'sol', 'rage');
      p = st.p;
      const foe = st.foe;
      if (foe) { foe.pos.set(60, 0, 0); foe.ai = foe.ai; }   // leave the OTHER fighter under AI: a second real body
      let samples = 0, governed = 0, noneOwned = 0, noneWithStagger = 0;
      const seen = {};
      const DIRS = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
      let held = null;
      // ⚠ deterministic randomness — a suite whose input is `Math.random()` cannot be re-run.
      let seed = 0x9e3779b9;
      const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 1000) / 1000; };
      for (let i = 0; i < frames; i++) {
        if (i % 24 === 0) {
          release();
          held = DIRS[Math.floor(rnd() * DIRS.length)];
          key(held, true);
          if (rnd() < 0.45) key(KM.up, true);
          if (rnd() < 0.2) key(KM.down, true);
          if (rnd() < 0.12) { key(KM.fly, true); }
        }
        if (i % 24 === 2) key(KM.fly, false);
        step(1);
        for (const f of game.entities) {
          if (!f.def || f.state === 'ko' || f.isDummy) continue;
          samples++;
          const g = f.gait;
          if (g !== undefined) { seen[g] = (seen[g] || 0) + 1; }
          const owner = GAIT_OWNER && g !== undefined ? GAIT_OWNER[g] : undefined;
          if (owner === 'ground' || owner === 'air') governed++;
          else if (owner === 'none') { governed++; noneOwned++; if (f.staggerT > 0) noneWithStagger++; }
        }
      }
      release(); step(4);
      M.t1 = { frames, samples, governed, coverage: samples ? +(governed * 100 / samples).toFixed(2) : 0, seen, noneOwned, noneWithStagger };
      // ⚠ THE ANTI-VACUOUS CHECK COMES FIRST. A coverage figure computed over zero samples is the
      // `[].every()` bug wearing a percentage sign.
      ok('T1s', 'the T1 driver actually sampled living fighters (not an empty list)',
        M.t1.samples > frames, `${M.t1.samples} samples over ${frames} frames`, `> ${frames}`);
      if (M.gaitPresent && GAIT_OWNER) {
        ok('T1', 'no frame is ungoverned — GAIT_OWNER answers for 100.00% of samples',
          M.t1.coverage === 100, `${M.t1.coverage}%`, '100.00%');
        ok('T1n', "`none` occurs only while staggered", M.t1.noneOwned === M.t1.noneWithStagger,
          `${M.t1.noneWithStagger}/${M.t1.noneOwned} of the 'none' samples were staggered`, 'all of them');
        const missing = EXPECTED_GAITS.filter((g) => !seen[g]);
        row('T1c', 'every one of the six states was actually reached', missing.length ? 'GAP' : 'PASS',
          Object.entries(seen).map(([k, v]) => `${k}:${v}`).join(' '), EXPECTED_GAITS.join('/'),
          missing.length ? 'never reached: ' + missing.join(', ') : '');
      } else {
        row('T1', 'no frame is ungoverned — GAIT_OWNER answers for 100.00% of samples', 'GAP',
          `0.00% — no gait field on any of ${M.t1.samples} samples`, '100.00%',
          'WAVE 2 · GAIT. The driver, the sampler and the coverage arithmetic all ran; the only '
          + 'thing missing is the field. This row turns into a real number the day `_updateGait` lands.');
      }
    }

    // ==========================================================================================
    // T2 · A TRANSITION EATS NO INPUT — press on the transition frame and each of the next 8.
    // The transition used is the one that exists: the TAKEOFF edge (flying false → true), driven
    // by the real fly key. `strikeActive`/`meleeCharge` is the response.
    // ==========================================================================================
    {
      const offsets = [];
      ({ p } = stand('powerworld', 'sol'));
      for (let off = 0; off <= 8; off++) {
        // ⚠ ONE match, nine trials. A `stand()` per offset rebuilds the whole stage nine times for
        // no measurement gain — and the transition is re-armable in place, because `toggleFlight`
        // is the one path that CAN set `flying` false under an open sky.
        release(); setFly(p, false); step(60); step(40);   // fall back to the floor and settle
        key(KM.fly, true); step(1); key(KM.fly, false);    // THE TRANSITION FRAME
        step(off);                       // 0 = the contact frame itself, then each of the next 8
        const base = p.meleeCharge > 0 || p.strikeActive > 0;
        key(KM.strike, true);
        let n = -1;
        for (let i = 0; i < 12; i++) { step(1); if ((p.meleeCharge > 0 || p.strikeActive > 0) !== base) { n = i + 1; break; } }
        key(KM.strike, false); step(30);
        offsets.push(n);
      }
      M.t2 = offsets;
      ok('T2', 'a transition eats no input — strike responds in exactly 1 frame at all 9 offsets',
        offsets.every((n) => n === 1), offsets.join(''), '111111111');
    }

    // ==========================================================================================
    // T3 · MOMENTUM CARRIES — the headline invariant, and the RED WITNESS.
    //
    // ⚠ MEASURED IN THE CITY, ON THE HORIZONTAL AXES, AND BOTH RESTRICTIONS ARE DELIBERATE.
    //   · CITY: `glide = _openSky && flying` picks the drag coefficient, so in PowerWorld the class
    //     itself changes ON the transition frame (1.8 → 6) and the expected ratio is ambiguous
    //     about which side of the frame it belongs to. In a city the class is `-6` on both sides of
    //     a landing, so the expected ratio is exactly `exp(-6·dt)` with nothing to argue about.
    //   · HORIZONTAL: the vertical axis is governed by the flight servo, the coast decay, gravity
    //     and the landing, and "drag and gravity alone" is not a single closed form across a
    //     landing frame. Stating the limit is better than a tolerance wide enough to hide the bug.
    //   · NO HORIZONTAL INPUT across the edge, or `move()`'s accel is in the delta too.
    //   · AND THE SPEED IS BROUGHT UNDER THE GROUND CLAMP FIRST: `move()` runs its 2-D clamp on
    //     every frame including a zero-input one, so landing above the ground `s` truncates the
    //     velocity and looks exactly like a transition writing it. (That clamp is FINDING M-1 in
    //     the movement report — it is real, it is just not this metric's subject.)
    // ==========================================================================================
    const kOf = (s) => (s.launched ? (L.PW_KB ? L.PW_KB.drag : 0.5) : s.slide ? 1.3 : s.glide ? 1.8 : 6);
    const dragStateOf = (f) => ({
      launched: !!(f._chaseKb && f.launchT > 0),
      slide: f._slideT > 0 || f._thrownT > 0,
      glide: !!(f._openSky && f.flying),
    });
    // ⚠ THE EDGE IS THE **TAKEOFF**, IN POWERWORLD, AND THE FIRST TWO ATTEMPTS AT THIS WERE WRONG.
    //   · A city LANDING has no horizontal velocity left to measure: city drag is `-6/s`, a half
    //     life of 0.115s, so by the time a coasting body has fallen far enough to land there is
    //     nothing above 1e-6 to take a ratio of. Measured: speed 0.00 at the edge.
    //   · The takeoff edge has the opposite property — the body is at ground speed, moving, and the
    //     transition happens on a frame you choose.
    // The drag class DOES change on this frame (6 → 1.8), and that is not ambiguous: `_physics`
    // runs the flight chain and THEN the drag line, so the coefficient the frame used is the one
    // implied by the POST-frame state. `dragStateOf` is therefore read after the step.
    // ⚠ AND `toggleFlight` IS CALLED AFTER `move()` IN THE SAME FRAME (controlPlayer's order), so
    // the speed clamp on the edge frame is still the GROUND one — which is why the run-up is short
    // enough to stay under it. A truncating clamp looks exactly like a transition writing velocity.
    const measureT3 = (target) => {
      const f = target;
      release(); setFly(f, false); step(60); step(30);   // stand on the floor, settled
      key('KeyW', true); step(22); key('KeyW', false); step(3);   // moving, no input, under the clamp
      let prev = chan(f), before = null, after = null, dragAt = null, edge = null;
      key(KM.fly, true);
      for (let i = 0; i < 30 && !after; i++) {
        before = { x: f.vel.x, z: f.vel.z };
        step(1);
        if (i === 0) key(KM.fly, false);
        const now = chan(f);
        if (now !== prev) { edge = i; after = { x: f.vel.x, z: f.vel.z }; dragAt = dragStateOf(f); }
        prev = now;
      }
      key(KM.fly, false); release();
      if (!after) return null;
      const expect = Math.exp(-kOf(dragAt) * DT);
      const gx = Math.abs(before.x) > 1e-3 ? after.x / before.x : null;
      const gz = Math.abs(before.z) > 1e-3 ? after.z / before.z : null;
      // take the WORSE of the two axes — a transition that writes one component must not be able to
      // hide behind the other.
      const got = gx !== null && gz !== null ? (Math.abs(gx - expect) > Math.abs(gz - expect) ? gx : gz) : (gx !== null ? gx : gz);
      return {
        edge, expect: +expect.toFixed(6), got: got === null ? null : +got.toFixed(6),
        dev: got === null ? null : +Math.abs(got - expect).toFixed(6),
        speed: +Math.hypot(before.x, before.z).toFixed(2), dragClass: kOf(dragAt), channel: M.channel,
      };
    };
    ({ p } = stand('powerworld', 'sol'));
    M.t3 = measureT3(p);
    if (!M.t3 || M.t3.got === null) {
      ok('T3', 'momentum carries across a transition — Δv is drag alone', false,
        M.t3 ? 'no horizontal velocity at the edge' : 'no transition observed in 700 frames',
        'a measurable edge');
    } else {
      ok('T3', 'momentum carries across a transition — Δv is drag alone (within 1e-3)',
        M.t3.dev < 1e-3, `ratio ${M.t3.got} vs drag ${M.t3.expect} (dev ${M.t3.dev}) on the ${M.t3.channel} edge`,
        'deviation < 1e-3');
    }
    if (M.channel !== 'gait') {
      row('T3g', 'T3 measured on the `gait` edge', 'GAP', `measured on the \`${M.channel}\` takeoff edge instead`,
        'every gait change',
        'WAVE 2 · GAIT — the check is channel-agnostic (`chan()`), so it re-points itself at every '
        + 'gait change the day the field exists. There is exactly ONE transition observable in '
        + 'PowerWorld today and it is the takeoff: `flying` never goes false, so LIFT/SETTLE/CRASH '
        + 'and the whole landing half of the machine have no edge to be measured on.');
    }

    // ==========================================================================================
    // T4 · A SELF-INFLICTED LANDING NEVER HURTS — §1.8 item 6, `_slam`'s `launchT` gate.
    // ⚠ FULLY DRIVEN: the altitude is bought by holding ascend, the fall is bought by cutting
    // flight with the real key, and the terminal velocity is the engine's own −160 clamp. Nothing
    // here writes a position or a velocity, which is the whole point — "you can dive into the floor
    // at the terminal clamp under your own power and take exactly zero damage. Somebody else has to
    // have put you there."
    // ==========================================================================================
    {
      let slams = 0;
      game.onSlam = (...a) => { slams++; return prevSlam ? prevSlam(...a) : undefined; };
      const trials = opts.t4Trials || 16;
      let hurt = 0, minVy = 0, landed = 0;
      ({ p } = stand('powerworld', 'sol'));
      for (let t = 0; t < trials; t++) {
        release(); step(10);
        climb(300, p);                                  // ~230u of altitude, under our own power
        setFly(p, false);                               // cut it — gravity takes over
        const hp0 = p.hp;
        let vy = 0;
        for (let i = 0; i < 600; i++) {
          step(1);
          if (p.vel.y < vy) vy = p.vel.y;
          if (p.pos.y <= (p.groundY || 0) + 0.5 && p.vel.y > -1) { landed++; break; }
        }
        if (p.hp < hp0 - 0.01) hurt++;
        if (vy < minVy) minVy = vy;
      }
      M.t4 = { trials, hurt, slams, peakFallSpeed: +minVy.toFixed(1), landed };
      ok('T4a', 'the dive actually reached the floor at speed (else the rule was never tested)',
        landed >= trials * 0.8 && minVy < -60, `${landed}/${trials} landed, peak fall ${M.t4.peakFallSpeed} u/s`,
        `>= ${Math.ceil(trials * 0.8)} landings, faster than -60 u/s`);
      ok('T4', 'a SELF-inflicted landing never hurts — 0 damage, 0 slams', hurt === 0 && slams === 0,
        `${hurt} hurt, ${slams} slams over ${trials} dives`, '0 / 0');
    }

    // ==========================================================================================
    // T5 · THE KNOCKBACK DIP DOES NOT CANCEL FLIGHT (aaa-03 F1)
    // ⚠ THE IMPULSE IS SYNTHETIC AND IT IS DECLARED. A real punch cannot be aimed to land a body on
    // the floor at a chosen speed either side of −38, and the SUBJECT of this metric is the landing
    // rule, not the punch — exactly the distinction `src/bench/powerworld.js`'s `carry()` helper
    // already draws. V8 in `pwmove.js` is the metric that may not use one, and does not.
    // ==========================================================================================
    {
      const trials = opts.t5Trials || 24;
      // ⚠ AN INSTRUMENT STATES ITS RESOLUTION. `arrival` is the vertical speed at the START of the
      // frame the body lands on; `_physics` applies that frame's gravity BEFORE it compares against
      // −38, so the engine sees a value up to ~1 u/s more negative than the harness can read. A
      // trial within +/-2 u/s of the boundary is therefore UNRESOLVABLE by this instrument and is
      // counted separately rather than assigned to a bucket — which is what a boundary trial did in
      // the first run, reporting "1/8 soft arrivals hurt" as a rule violation that was a rounding
      // edge. Excluding it hides nothing: a real violation is a −25 u/s arrival taking damage.
      const EDGE_BAND = 2.0;
      const res = { soft: { n: 0, keptFlying: 0, hurt: 0, credited: 0, maxDmg: 0 }, hard: { n: 0, hurt: 0, keptFlying: 0, credited: 0, maxDmg: 0 }, boundary: 0 };
      // ⚠ IN A CITY, NOT IN POWERWORLD, AND THAT IS THE POINT OF THE ROW. "The knockback dip does
      // not cancel flight" is only a claim where flight CAN be cancelled; under an open sky
      // `entity.js:1450` can never fire, so running it there would return 24/24 for a reason that
      // has nothing to do with the rule. The damage half (T5a/T5b) is engine-wide either way.
      const st5 = stand('duel', 'sol', 'vega');
      p = st5.p;
      const foe = st5.foe;
      for (let t = 0; t < trials; t++) {
        release(); step(6);
        setFly(p, true); key(KM.up, true); step(40); key(KM.up, false); step(6);
        // ⚠ THE IMPULSE IS SYNTHETIC AND SO IS THE DROP HEIGHT, AND BOTH ARE DECLARED. What is NOT
        // assumed is the arrival: the first version set `vel.y = -20` at 46u of altitude, the fall
        // accelerated it well past the boundary, and every "soft" trial arrived hard — 8/8 hurt,
        // reported as a rule violation that was entirely the harness. The body is now released
        // 0.6u above the floor and THE ARRIVAL SPEED IS MEASURED on the frame before contact.
        p.pos.y = (p.groundY || 0) + 0.6;
        p.hp = p.maxHp;
        p.lastHitBy = foe || null;
        p.lastHitT = 0;
        p.launchT = 1.2;                                 // somebody else put you here (the agency gate)
        p._slamCd = 0;
        p.vel.set(0, -20 - (t / trials) * 60, 0);        // sweep across the −38 boundary
        const hp0 = p.hp;
        let arrival = p.vel.y, hurtSeen = false, dmg = 0;
        for (let i = 0; i < 90; i++) {
          const vy = p.vel.y;
          step(1);
          if (p.pos.y <= (p.groundY || 0) + 1e-6) { arrival = vy; if (p.hp < hp0 - 0.01) { hurtSeen = true; dmg = hp0 - p.hp; } break; }
        }
        step(3);
        if (p.hp < hp0 - 0.01) { hurtSeen = true; dmg = hp0 - p.hp; }
        if (Math.abs(arrival + 38) < EDGE_BAND) { res.boundary++; continue; }
        const bucket = arrival < -38 ? res.hard : res.soft;
        bucket.n++;
        if (p.flying) bucket.keptFlying++;
        if (hurtSeen) { bucket.hurt++; if (dmg > (bucket.maxDmg || 0)) bucket.maxDmg = +dmg.toFixed(1); }
        if (hurtSeen && p.lastHitBy === foe) bucket.credited++;
      }
      M.t5 = res;
      ok('T5s', 'the sweep actually landed on BOTH sides of the -38 boundary',
        res.soft.n >= 3 && res.hard.n >= 3,
        `${res.soft.n} soft / ${res.hard.n} hard / ${res.boundary} inside the +/-${EDGE_BAND} u/s unresolvable band`,
        'at least 3 each side');
      ok('T5a', 'a soft arrival (measured >= -38 u/s) does not hurt', res.soft.hurt === 0,
        `${res.soft.hurt}/${res.soft.n} hurt`, '0');
      ok('T5b', 'a HARD arrival (measured < -38 u/s) does hurt, capped at 32, credited to lastHitBy',
        res.hard.hurt > 0 && res.hard.maxDmg <= 32 && res.hard.credited === res.hard.hurt,
        `${res.hard.hurt}/${res.hard.n} hurt, max ${res.hard.maxDmg}, ${res.hard.credited} credited`,
        '> 0 hurt, <= 32 dmg, all credited');
      ok('T5c', 'the knockback dip does not cancel flight (city — where it CAN be cancelled)',
        res.soft.keptFlying === res.soft.n, `${res.soft.keptFlying}/${res.soft.n} soft arrivals still flying`,
        'all of them');
      // ⚠ NOT ASSERTED, BUT NOT SWALLOWED EITHER. A HARD arrival — the one the machine will call
      // `CRASH` — drops flight only SOME of the time, and there is no rule in the engine today that
      // says which. It is reported so WAVE 2 · GAIT decides it deliberately rather than inheriting it.
      if (res.hard.keptFlying !== res.hard.n && res.hard.keptFlying !== 0) {
        row('T5e', 'a HARD arrival cancels flight inconsistently', 'GAP',
          `${res.hard.keptFlying}/${res.hard.n} hard arrivals still flying`,
          'one rule, applied every time',
          'WAVE 2 · GAIT — this is the state `CRASH` exists to name. Today the outcome is whatever '
          + 'the surrounding conditions happened to be on the landing frame.');
      }
      row('T5d', 'CRASH returns to AIRBORNE after staggerT', 'GAP',
        'no CRASH state exists to return from', 'gait back to AIRBORNE in 100% of cases',
        'WAVE 2 · GAIT — `flying` cannot express "arriving because somebody put me here", which is '
        + 'the entire reason POWERWORLD_AAA.md §1.2 chose a six-state field over a boolean.');
    }

    // ==========================================================================================
    // THE RED PROOF — rubric §5.2. Both halves of the TRANSITIONS known-bad, one run, one report.
    // ==========================================================================================
    if (opts.selfProof !== false) {
      // ⚠ THE KNOWN-GOOD IS RE-MEASURED IN THE SAME SESSION AS THE KNOWN-BAD, on the same fighter,
      // through the same function — not read back off the earlier row. Rubric §5.2 asks for both
      // verdicts from one run, and comparing a fresh bad against a stale good compares two setups.
      ({ p } = stand('powerworld', 'sol'));
      const good = measureT3(p);
      // ⚠ THE INJECTOR GOES ON THE FIGHTER THE MEASUREMENT WILL ACTUALLY USE. `stand()` builds a
      // NEW Fighter, so installing it before standing the mode wraps a body nobody drives — a
      // known-bad that reaches nothing reports GREEN and proves the opposite of what it claims.
      const un = injectVelocityWritingTransition(game, p, 0.5);
      const bad = measureT3(p);
      un();
      const badGait = injectBadGait(game);
      badGait.undo();
      M.redProof = { good, bad, badGait: { expressible: badGait.expressible, why: badGait.why } };
      ok('RP1', 'KNOWN-GOOD: T3 sees drag alone across the transition',
        !!good && good.dev !== null && good.dev < 1e-3, good ? `dev ${good.dev}` : 'no edge', '< 1e-3');
      ok('RP2', 'KNOWN-BAD: a transition that WRITES velocity is caught (dev exceeds 1e-3)',
        !!bad && bad.dev !== null && bad.dev > 1e-3, bad ? `dev ${bad.dev} (ratio ${bad.got} vs ${bad.expect})` : 'no edge seen',
        '> 1e-3');
      row('RP3', 'KNOWN-BAD: writing a gait directly, bypassing the owner', badGait.expressible ? 'PASS' : 'GAP',
        badGait.expressible ? 'injected and reverted' : 'NOT EXPRESSIBLE — ' + badGait.why,
        'T1 coverage drops below 100.00%',
        badGait.expressible ? '' : 'WAVE 2 · GAIT. The injector is written in full at its definition '
        + 'in this file and runs unchanged the day the field lands; T1 coverage is already 0.00%, so '
        + 'there is nothing for it to drop from today.');
    }
  } catch (e) {
    R.push({ id: 'THREW', name: 'SUITE THREW', verdict: 'FAIL', got: String((e && e.stack) || e).slice(0, 500), want: 'no throw', note: '' });
  } finally {
    release();
    game.update = realUpdate;
    game.controlPlayer = prevCP;
    game.world.render = prevRender;
    game.running = prevRunning;
    if (prevSlam) game.onSlam = prevSlam;
    if (game.news && prevNews !== null) game.news.enabled = prevNews;
    console.error = oldErr;
  }

  const failures = R.filter((r) => r.verdict === 'FAIL').map((r) => `${r.id} ${r.name} — got ${r.got}, want ${r.want}`);
  const out = {
    suite: 'transition', checks: R.length, failures,
    gaps: R.filter((r) => r.verdict === 'GAP').length,
    consoleErrors: errs.length, errorSample: errs.slice(0, 5),
    rows: R.map((r) => `${r.verdict.padEnd(4)} ${r.id.padEnd(5)} ${r.name} — got ${r.got}, want ${r.want}`),
    metrics: M, findings,
  };
  if (!opts.quiet) {
    console.log(`%cG-MOVE · TRANSITIONS — ${R.length} checks, ${failures.length} failures, ${out.gaps} gaps, ${errs.length} console errors`, 'font-weight:bold');
    console.table(R);
  }
  return out;
}

// ⚠ THE PHANTOM-MODULE LAW, in four lines. A bare `import('/src/core/util.js')` can resolve to a
// SECOND instance of the module with its own state, and `GAIT_OWNER` is exactly the kind of
// module-level object a test would then read from the wrong copy. Find the specifier the PAGE
// already loaded. (A local copy of the same helper `src/bench/powerworld.js` carries; that file
// does not export it and belongs to another lane.)
function specifierFor(tail) {
  const leaf = tail.split('/').pop();
  const hit = performance.getEntriesByType('resource').map((r) => r.name).filter((n) => n.includes('/src/') && n.includes(leaf));
  return hit.find((n) => n.includes('/' + leaf)) || hit[0] || ('/src/' + tail);
}

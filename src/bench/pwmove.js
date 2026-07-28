// =================================================================================================
// G-MOVE · THE MOVEMENT GAUGE — `LSW.moveSuite()`  (POWERWORLD_AAA.md WAVE 0; rubric §1.1, V1–V8)
//
// ⚠ THIS FILE CHANGES NOTHING ABOUT THE GAME. It is an INSTRUMENT. It reads eight movement
// quantities off a live fighter by pressing real keys and letting the real `controlPlayer` →
// `Fighter.move()` → `_physics` chain do the work, and it reports what it finds against the bands
// in `docs/powerworld/aaa-08-rubric.md` §1.1. Where the engine cannot meet a band because the
// mechanism the band derives from has not been built yet, the row is graded **GAP** and named in
// `findings` with the wave that owns it — never quietly re-banded, and never faked green.
//
// ⚠ THE GATE IS THE RED RUN, NOT THE GREEN ONE (rubric §5.2). `moveSuite` finishes by installing
// the MOVEMENT known-bad — one fighter's air drag forced to the city's 6.0 — re-measuring V2, and
// FAILING ITSELF if the number does not collapse. A suite that cannot fail proves nothing, and this
// repo has shipped a 4×-oversized boxing ring, black rubble and a black sky behind green assertions.
//
// ⚠ M7 — REAL INPUTS, NOT SYNTHETIC STATE, AND IT IS ASSERTABLE FROM THIS HEADER.
// Nothing in the driven half of this file assigns `f.vel`, `f.pos`, `f.flying`, `f.moveDir` or
// `f.gait`. Every metre travelled here was travelled because a `KeyboardEvent` went into
// `core/input.js` under the key the ACTIVE SCHEME owns. The two exceptions are declared where they
// occur and neither is a movement metric: the foe is parked at an absolute position (trap 5, so the
// step-in cannot smear a measurement) and `_openSky` is toggled by the known-bad injector, which is
// the point of an injector.
//
// THE EIGHT TRAPS THIS FILE PAYS FOR UP FRONT (rubric §5.4):
//   1. `input.endFrame()` is called by boot.js's rAF loop, NOT by `game.update()`. A hand-stepped
//      loop never yields to rAF, so a synthetic keydown LATCHES and `pressed()` fires on every one
//      of the next ten thousand frames. `step()` below calls `input.endFrame()` itself, once per
//      hand-stepped frame, which is exactly what the real loop does.
//   2. The SCHEME owns the key. `KM = KEYMAPS[SETTINGS.scheme]` — a tab saved on BRAWLER flies on
//      `KeyG` and `KeyF` is a jab.
//   3. `game.update` is called UNCONDITIONALLY by the page's rAF loop and is NOT gated on
//      `game.running`, so a test that does not take the clock is measuring its own frames plus
//      however many real ones landed in between. It is replaced with a no-op and the real one is
//      called by hand (the `src/bench/abilities.js` pattern).
//   4. `controlPlayer` is NOT stubbed here, deliberately — it is the gate. It is the thing that
//      turns W into `moveDir`. (It is stubbed only in the V8 punch, where the documented override
//      is required because it rewrites `aim` from the mouse before `coneFoe` reads it.)
//   5. Fighters are picked by TEAM, never by index — `entities[1]` has been the KMK 9 operator.
//   6. Both bodies are pinned to ABSOLUTE positions in the punch.
//   7. `runSlot(c, key, inp, g)` — fighter first, game last. (Not used here; stated so the next
//      person extending this file does not have to go and look.)
//   8. The phantom-module law: every constant is read off `window.LSW`, never a fresh `import()`.
//
// ⚠ AND ONE MORE, FOUND BY THIS FILE AND WORTH THE COMMENT (see FINDING M-1 in the report):
// releasing the stick under an open sky does NOT coast from whatever speed you had. `move()` runs
// its 2-D horizontal clamp on EVERY frame including a zero-input one, so any speed above the
// fighter's own `s` is truncated to `s` in a single frame. Measured: SOL cruising at 103.6 u/s
// dropped to 51.3 u/s on the first frame after SHIFT was released. V2 is therefore released from
// the NON-cruise plateau, where the clamp cannot bite, and the answer is normalised to the rubric's
// 100 u/s reference — which is exact, because drag alone is a pure exponential and `d = v0/k`.
// =================================================================================================

const DT = 1 / 60;
const BODY = 9.6;                       // one fighter height — travel is reported in these too

// The rubric's bands, in one table, so a band can never be quietly edited next to the failure it
// resolves (rubric §4: "a band edited in the same session as a failure it resolves is an automatic
// INADMISSIBLE"). `owner` names the wave that owns a band the engine cannot hold today.
export const MOVE_BANDS = {
  V1: { lo: 1.50, hi: 1.75, unit: 's', what: 'time to 95% of air top speed',
        why: 'BFP ln(20)/pm_flightfriction 2.0 = 1.498s; ours at AIR_DRAG 1.8 = 1.664s',
        owner: 'WAVE 3 · AIR — the band presumes BFP\'s accel==drag model (PW_AIR.accel). Today the '
             + 'move() clamp decides top speed, so the drag coefficient never sets the RATE.' },
  V2: { lo: 45.7, hi: 56.0, unit: 'u', what: 'stop distance from 100 u/s, normalised',
        why: 'BFP two-phase 45.7u reaching exactly zero; ours v0/AIR_DRAG = 55.6u asymptotic' },
  V3: { lo: 16, hi: 18, unit: 'u', what: 'reversal distance from 100 u/s, normalised',
        why: 'aaa-01-air.md:1017',
        owner: 'WAVE 3 · AIR — same cause as V1: reverse acceleration is 9x the fighter\'s speed, '
             + 'so the turn-around is over before drag has a say.' },
  V4: { lo: 1, hi: 1, unit: 'frames', what: 'input-to-motion latency',
        why: 'aaa-03 M2. 0 means the harness wrote the value; >1 is a real defect' },
  V5: { lo: null, hi: null, unit: 'u', what: 'turn radius at cruise',
        why: 'declared UN-ANCHORED by the rubric (§2.7) — no source constant exists. Report only.' },
  V6: { lo: 38.6, hi: 47.2, unit: 'u/s', what: 'ground run speed',
        why: 'JKA g_speed 250 at the BODY anchor = 42.9 u/s, +/-10%',
        owner: 'WAVE 4 · GROUND — the rubric already records ours as 27-45.4 with the low end failing.' },
  V7: { lo: 0, hi: 0.45, unit: 's', what: 'ground stop TIME from run speed',
        why: 'JKA pm_stopspeed 100 gives a hard stop; we have no stopspeed term on the ground',
        owner: 'WAVE 4 · GROUND — `stopspeed` is listed absent/add at aaa-02-ground.md:1128.' },
  V8: { lo: 125, hi: 1e9, unit: 'u', what: 'launch carry from a REAL haymaker',
        why: 'manual §47: >= 13 body lengths, peak >= 95 u/s. A synthetic impulse is inadmissible here.' },
};

// -------------------------------------------------------------------------------------------------
// THE KNOWN-BAD (rubric §5.3, MOVEMENT row): "set one fighter's air drag to the city's 6.0".
//
// ⚠ IT IS EXPRESSED THROUGH THE ENGINE'S OWN SWITCH, NOT BY EDITING A CONSTANT. `AIR_DRAG` is a
// module-level const in entity.js and Wave 0 may not touch that file — but the drag line reads
// `glide = this._openSky && this.flying` and picks `-AIR_DRAG` or the city's `-6` from it. Clearing
// `_openSky` on ONE fighter therefore puts exactly that fighter on the city coefficient, through the
// real branch, reversibly, with no source change. The predicted collapse is arithmetic:
// `d = v0/k` goes 100/1.8 = 55.6u to 100/6 = 16.7u — which is the number the rubric names.
// -------------------------------------------------------------------------------------------------
export function injectCityDrag(game, who = null) {
  const f = who || (game.humans && game.humans[0] && game.humans[0].fighter);
  if (!f) return () => {};
  const prev = f._openSky;
  f._openSky = false;
  return () => { f._openSky = prev; };
}

// =================================================================================================
export function moveSuite(game, hud, opts = {}) {
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

  // ---- the row ledger. FAIL is the only verdict that goes into `failures`; GAP is a finding. -----
  const row = (id, name, verdict, got, want, note) => {
    R.push({ id, name, verdict, got, want, note: note || '' });
    if (verdict === 'GAP') findings.push(`${id} ${name} — got ${got}, band ${want}. ${note || ''}`);
    return verdict === 'PASS';
  };
  const ok = (id, name, pass, got, want) => row(id, name, pass ? 'PASS' : 'FAIL', got, want);
  // band a metric. `owner` present + out of band ⇒ GAP (a later wave owns the mechanism).
  const band = (id, v, extraNote) => {
    const B = MOVE_BANDS[id];
    const got = Number.isFinite(v) ? +v.toFixed(3) + B.unit : String(v);
    if (B.lo == null) return row(id, B.what, 'INFO', got, 'un-anchored — report only', B.why);
    const inBand = Number.isFinite(v) && v >= B.lo && v <= B.hi;
    const want = `${B.lo}..${B.hi}${B.unit}`;
    if (inBand) return row(id, B.what, 'PASS', got, want, B.why);
    return row(id, B.what, B.owner ? 'GAP' : 'FAIL', got, want,
      (B.owner ? B.owner + ' ' : '') + (extraNote || ''));
  };

  // ---- the driver ------------------------------------------------------------------------------
  const key = (code, dn) => dispatchEvent(new KeyboardEvent(dn ? 'keydown' : 'keyup', { code, bubbles: true }));
  // ⚠ ONE hand-stepped frame == one real frame: the real update, then `input.endFrame()`, which the
  // rAF loop would have done. Without the second half a synthetic keydown latches forever.
  const step = (n = 1) => { for (let i = 0; i < n; i++) { realUpdate(DT); inp.endFrame(); } };
  const ALLKEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', KM.up, KM.down, KM.fly, KM.strike, KM.guard, KM.item];
  const release = () => { for (const c of ALLKEYS) key(c, false); };
  const hs = (f) => Math.hypot(f.vel.x, f.vel.z);
  const s3 = (f) => Math.hypot(f.vel.x, f.vel.y, f.vel.z);

  // stand a clean, isolated fight up. The foe is parked far away and its AI removed so that nothing
  // but the player's own input moves the player (trap 5 and `resolveBodies` both).
  const stand = (modeId, p1, p2 = 'vega') => {
    try { hud.hideTitle && hud.hideTitle(); } catch (e) {}
    game.running = true;
    game.world.render = () => {};
    game.startMode(modeId, { p1, p2, enemy: p2 });
    if (game.news) game.news.enabled = false;   // ⚠ `onAir` is a GETTER — assigning it throws
    step(20);
    const p = game.humans[0].fighter;
    const foe = game.entities.find((e) => e.def && e.team !== p.team && !e.isDummy);
    if (foe) { foe.ai = null; foe.pos.set(0, 0, 600); foe.vel.set(0, 0, 0); }
    game.hardLock = null;
    // ⚠ `opts.inject` RUNS THE WHOLE SUITE UNDER THE KNOWN-BAD, which is how an orchestrator asks
    // for the RED run. It has to be re-applied per `stand()` because `startMode` builds a NEW
    // Fighter every time — an injection installed once, before the first match, reaches a body
    // nobody drives and the run comes back green, proving the opposite of what was asked.
    if (opts.inject === 'citydrag') injectCityDrag(game, p);
    return { p, foe };
  };
  // take off and climb, through the real keys only. Altitude matters: the chase camera looks
  // slightly DOWN, so "forward" always sinks a little, and a long run started at 110u ends on the
  // floor — which silently swaps the drag class mid-measurement. Found the hard way.
  // ⚠ IDEMPOTENT. `KM.fly` is a TOGGLE and under an open sky `flying` never goes false on its own,
  // so an unconditional second climb inside one match turns flight OFF and everything after it
  // measures a falling body. Ask what state it is in first.
  const setFly = (f, want) => { if (!!f.flying !== want) { key(KM.fly, true); step(1); key(KM.fly, false); step(1); } };
  const climb = (frames = 620, f = null) => {
    const who = f || game.humans[0].fighter;
    setFly(who, true);
    key(KM.up, true); step(frames); key(KM.up, false); step(2);
  };
  // ⚠ TRAP 9, FOUND BY THIS FILE, AND IT IS A GOOD ONE. `controlPlayer`'s double-tap EVADE detector
  // (`TAP_DIRS`, game.js) times its 0.28s window with `performance.now()` — WALL CLOCK, not sim
  // time. A hand-stepped harness runs 20-60x faster than real time, so two W presses 200 SIM frames
  // apart land inside the same real 0.28s and fire a dash: `burstT` lifts `move()`'s speed clamp and
  // the fighter is at top speed on frame one. Measured before this line existed: SOL's V1 read
  // **0.017s** (one frame) and RIME's V3 read **58.7u** against its neighbours' 0.9-4u. Both were
  // the instrument, not the game — and both looked exactly like a real result.
  // Clearing the tap ledger before a measured press is the tare for it. It is NOT a gameplay change:
  // `_tapT` is only ever read to decide whether THIS press is the second of a pair.
  const noTap = () => { if (game._tapT) game._tapT = {}; };

  // accelerate forward until the speed stops rising, and report the trace.
  const runForward = (p, frames, cruise) => {
    noTap();
    key('KeyW', true); if (cruise) key('ShiftLeft', true);
    const tr = [];
    for (let i = 0; i < frames; i++) { step(1); tr.push(hs(p)); }
    return tr;
  };

  const M = {};                                  // the raw numbers, returned for the report

  try {
    // ==========================================================================================
    // 0 · THE HARNESS PROVES ITSELF (rubric §5.2 / the empty-`chips.every()` law)
    // Nothing below means anything unless a pressed key moves a body under an open sky.
    // ==========================================================================================
    game.update = () => {};                      // the page's rAF loop now advances nothing
    let { p } = stand('powerworld', 'sol');
    ok('H0a', 'the mode stood up with a player under an open sky', !!p && !!p._openSky,
      p ? `${p.def.id} openSky=${!!p._openSky}` : 'no player', 'a fighter with _openSky');
    const y0 = p.pos.y;
    climb(90);
    ok('H0b', 'ASCEND through the real key path leaves the ground', p.flying && p.pos.y > y0 + 20,
      `flying=${p.flying}, y ${y0.toFixed(1)} → ${p.pos.y.toFixed(1)}`, 'flying, and risen');
    const preW = hs(p);
    key('KeyW', true); step(6); key('KeyW', false);
    ok('H0c', 'FORWARD through the real key path produces horizontal motion', hs(p) > preW + 1,
      `${preW.toFixed(2)} → ${hs(p).toFixed(2)} u/s`, 'speed rose');
    // ⚠ and prove the endFrame ownership, because trap 1 is invisible when it bites: a latched
    // keydown makes `pressed()` true on every frame, and the fly TOGGLE would flip 60 times a second.
    const flyBefore = p.flying;
    key(KM.fly, true); step(4); key(KM.fly, false); step(2);
    ok('H0d', 'a synthetic key does NOT latch (input.endFrame is owned by the harness)',
      p.flying === !flyBefore, `flying ${flyBefore} → ${p.flying} after a 4-frame press`,
      'exactly one toggle');
    release(); step(4);

    // ==========================================================================================
    // 1 · V1 / V2 / V3 — ACROSS THE FLIGHT LADDER
    // ⚠ four fighters, not one, and they are DERIVED not hand-picked: the first roster entry at
    // each flightTier plus the strongest burner. `aaa-04-camera.md:929` records a levitator flying
    // its own top speed reaching k = 0.275 where the design assumed >= 0.95 — one fighter's numbers
    // are not the mode's numbers.
    // ==========================================================================================
    const byTier = [0, 1, 2, 3].map((t) => (L.ROSTER.find((d) => (d.flightTier ?? 0) === t) || null));
    const burner = L.ROSTER.filter((d) => d.afterburner)
      .sort((a, b) => (b.afterburner.mult || 0) - (a.afterburner.mult || 0))[0] || null;
    const ladder = [];
    for (const d of byTier.concat([burner])) {
      if (!d) continue;
      if (ladder.some((x) => x.id === d.id)) continue;
      ladder.push({ id: d.id, tier: d.flightTier ?? 0 });
    }
    M.ladder = [];
    for (const rowSpec of ladder) {
      const r = { id: rowSpec.id, tier: rowSpec.tier };
      ({ p } = stand('powerworld', rowSpec.id));
      climb(620);
      r.alt = +p.pos.y.toFixed(0);
      // --- V1: time to 95% of the NON-cruise air plateau, from rest, forward held.
      // ⚠ "from rest" is not "shortly after letting go". At AIR_DRAG 1.8 a 51 u/s coast still holds
      // 15 u/s after 40 frames, and starting a time-to-top-speed measurement from a third of the
      // way there is how a suite reports a number it never measured. 200 frames puts it under
      // 0.5 u/s by the same arithmetic V2 reads off.
      release(); step(200);
      const tr = runForward(p, 300, false);
      const plateau = Math.max(...tr.slice(180));
      const i95 = tr.findIndex((v) => v >= 0.95 * plateau);
      r.plateau = +plateau.toFixed(2);
      r.t95 = i95 < 0 ? NaN : +((i95 + 1) * DT).toFixed(3);
      // --- V2: release EVERYTHING and integrate to a stop.
      // ⚠ released from the non-cruise plateau on purpose — see the header. One frame is stepped
      // after the release before the origin is taken, so the reading starts from what the engine
      // actually kept, not from what the fighter had a frame earlier.
      release(); step(1);
      const v0 = hs(p), sx = p.pos.x, sz = p.pos.z, sy = p.pos.y;
      let f2 = 0, dist = 0;
      for (; f2 < 700; f2++) {
        step(1);
        dist = Math.hypot(p.pos.x - sx, p.pos.z - sz);
        if (hs(p) < 0.5) break;
      }
      r.v2raw = +dist.toFixed(1); r.v2v0 = +v0.toFixed(1);
      r.v2 = v0 > 1 ? +(dist * 100 / v0).toFixed(1) : NaN;   // normalised to the 100 u/s reference
      r.v2t = +((f2 + 1) * DT).toFixed(2);
      r.v2terminated = f2 < 700;
      r.v2sank = +(sy - p.pos.y).toFixed(0);
      // --- V3: back to speed, then full reverse.
      runForward(p, 240, false);
      const dx = p.vel.x, dz = p.vel.z, dl = Math.hypot(dx, dz) || 1;
      const ux = dx / dl, uz = dz / dl, rv0 = hs(p), rx = p.pos.x, rz = p.pos.z;
      noTap();                                    // see the trap-9 note on `noTap`
      key('KeyW', false); key('KeyS', true);
      let f3 = 0, fwdMax = 0;
      for (; f3 < 400; f3++) {
        step(1);
        const d = (p.pos.x - rx) * ux + (p.pos.z - rz) * uz;
        if (d > fwdMax) fwdMax = d;
        if (p.vel.x * ux + p.vel.z * uz < 0) break;
      }
      r.v3raw = +fwdMax.toFixed(1);
      r.v3 = rv0 > 1 ? +(fwdMax * 100 / rv0).toFixed(1) : NaN;
      r.v3t = +((f3 + 1) * DT).toFixed(2);
      release(); step(4);
      M.ladder.push(r);
    }
    // report the ladder, then band the MEDIAN of it — one fighter cannot speak for the mode.
    const med = (xs) => { const a = xs.filter(Number.isFinite).sort((x, y) => x - y); return a.length ? a[(a.length - 1) >> 1] : NaN; };
    row('V0', 'the flight ladder was measured on four fighters, derived not hand-picked', 'INFO',
      M.ladder.map((r) => `${r.id}(t${r.tier}) top ${r.plateau} · t95 ${r.t95}s · V2 ${r.v2}u · V3 ${r.v3}u`).join(' | '),
      'tiers 0/1/2/3 + the strongest burner');
    band('V1', med(M.ladder.map((r) => r.t95)));
    // ⚠ THE SHAPE OF THE V1 GAP, NOT JUST ITS SIZE, AND IT IS THE HEADLINE OF THIS AXIS. Every
    // fighter on the ladder returns the SAME t95 to within one frame, across a 2x spread in top
    // speed — because `move()` accelerates at `9 * s` and clamps at `s`, so the time to top speed
    // is `0.95/9 = 0.106s` for everybody and `AIR_DRAG` never enters it. BFP's model is the other
    // way round (`accel == friction`, so terminal IS wish speed and friction sets the RATE), which
    // is exactly what `PW_AIR.accel` is for. A band cannot be met by tuning a number here; the
    // model has to change, and that is WAVE 3 · AIR's job.
    {
      const ts = M.ladder.map((r) => r.t95).filter(Number.isFinite);
      const spread = ts.length ? +(Math.max(...ts) - Math.min(...ts)).toFixed(3) : NaN;
      const tops = M.ladder.map((r) => r.plateau);
      row('V1n', 'V1 is the same for every fighter — the drag coefficient plays no part in it', 'GAP',
        `t95 ${ts.join('/')}s (spread ${spread}s) across top speeds ${tops.join('/')} u/s`,
        'a time that varies with the fighter and is set by drag',
        'WAVE 3 · AIR — accel is 9x the fighter\'s own speed and the clamp is that same speed, so '
        + 't95 = 0.95/9 s for all 52. Changing AIR_DRAG today would not move this number at all.');
    }
    band('V2', med(M.ladder.map((r) => r.v2)));
    band('V3', med(M.ladder.map((r) => r.v3)));
    // ⚠ V2 HAS A STRUCTURAL HALF AS WELL AS A NUMERIC ONE. "A run that never crosses 0.5 u/s is a
    // structural fail, not a numeric one" (rubric §1.1). Ours is a pure exponential, so it does
    // cross — it simply never reaches exactly zero, which is the categorical difference from BFP's
    // two-phase brake and is reported as such rather than folded into the distance.
    ok('V2t', 'V2 terminates — every fighter crosses 0.5 u/s inside the cap',
      M.ladder.every((r) => r.v2terminated),
      M.ladder.map((r) => `${r.id} ${r.v2t}s`).join(' · '), 'all terminate');
    row('V2s', 'V2 reaches zero the way BFP does (pm_stopspeed second phase)', 'GAP',
      'pure exponential — asymptotic, no constant-deceleration phase',
      'two-phase, arriving at exactly 0',
      'WAVE 3 · AIR — rubric FINDING A / decided divergence C5: the air needs a stopspeed term at '
      + '0.3125 x vRef. Nothing in Wave 0 may add it.');

    // ==========================================================================================
    // 2 · V4 — INPUT-TO-MOTION LATENCY. The one metric where 0 is as bad as 2.
    // ⚠ "0 means the harness wrote the value" (rubric §1.1). It is measured for six actions at nine
    // press offsets so a one-off alignment cannot pass for a rule.
    // ==========================================================================================
    const latency = (where) => {
      const res = {};
      const probe = (label, code, sense) => {
        const worst = [];
        for (let off = 0; off < 9; off++) {
          step(off);                                  // land the press on a different frame each time
          // ⚠ 45 frames, not 3. A strike probe leaves `strikeActive` running for 0.2s; sampling the
          // next offset while the previous swing is still live makes `base` already 1, the change
          // never fires, and a working input reports "never responded".
          release(); step(45);
          noTap();                                       // trap 9 — a repeated W probe is a double-tap
          if (where === 'air') { p.vel.set(0, 0, 0); }   // ⚠ see note below
          const base = sense(p);
          key(code, true);
          let n = -1;
          for (let i = 0; i < 12; i++) { step(1); if (sense(p) !== base && Math.abs(sense(p) - base) > 1e-4) { n = i + 1; break; } }
          key(code, false); step(2);
          worst.push(n);
        }
        res[label] = worst;
      };
      // ⚠ THE ONE PLACE THIS FILE TOUCHES `vel`, AND IT IS NOT A MOVEMENT METRIC. A moving body's
      // velocity changes every frame on its own — drag on the horizontal axes, the coast decay on
      // the vertical one — so "the first frame with a change attributable to input" is unreadable
      // unless the body starts at rest. Zeroing velocity is the measurement's ZERO POINT, exactly
      // like tare on a scale: it is taken BEFORE the key is pressed and the quantity under test —
      // how many frames a KEY takes to reach the physics — is untouched by it. Without it the
      // ascend/descend probes report 1 frame whatever you press, which is a vacuous pass.
      probe('move', 'KeyW', (f) => +hs(f).toFixed(4));
      probe('ascend', KM.up, (f) => +f.vel.y.toFixed(4));
      probe('descend', KM.down, (f) => +f.vel.y.toFixed(4));
      probe('guard', KM.guard, (f) => (f.guarding ? 1 : 0));
      probe('strike', KM.strike, (f) => (f.meleeCharge > 0 || f.strikeActive > 0 ? 1 : 0));
      return res;
    };
    ({ p } = stand('powerworld', 'sol'));
    climb(180); release(); step(20);
    M.v4air = latency('air');
    const flat = Object.entries(M.v4air).map(([k, v]) => `${k}:${v.join('')}`).join(' ');
    const allOne = Object.values(M.v4air).every((a) => a.every((n) => n === 1));
    ok('V4', MOVE_BANDS.V4.what + ' (air) — every action, nine press offsets', allOne, flat,
      'every sample exactly 1');
    if (!allOne) findings.push('V4 air: ' + flat + ' — a 0 means the harness wrote the value, a >1 is a real defect.');

    // ==========================================================================================
    // 3 · V5 — TURN RADIUS AT CRUISE. Declared un-anchored (rubric §2.7); reported, not banded.
    // ⚠ AND IT IS MEASURING SOMETHING DIFFERENT FROM WHAT THE ROW ASSUMES, WHICH IS THE FINDING.
    // There is no yaw control in PowerWorld yet — mouse-look is WAVE 1 · VIEW — so lateral input is
    // a STRAFE, and any curvature in the path comes only from the chase camera rotating the basis.
    // ==========================================================================================
    ({ p } = stand('powerworld', 'sol'));
    climb(620); release(); step(20);
    runForward(p, 200, true);
    noTap();
    key('KeyD', true);
    const path = [];
    for (let i = 0; i < 90; i++) { step(1); path.push({ x: p.pos.x, z: p.pos.z }); }
    release(); step(4);
    // circumradius of every 15-frame triple, median — robust against one noisy frame
    const radii = [];
    for (let i = 0; i + 30 < path.length; i++) {
      const A = path[i], B = path[i + 15], C = path[i + 30];
      const a = Math.hypot(B.x - C.x, B.z - C.z), b = Math.hypot(A.x - C.x, A.z - C.z), c = Math.hypot(A.x - B.x, A.z - B.z);
      const area2 = Math.abs((B.x - A.x) * (C.z - A.z) - (C.x - A.x) * (B.z - A.z));
      if (area2 > 1e-6) radii.push((a * b * c) / (2 * area2));
    }
    M.v5 = radii.length ? +med(radii).toFixed(1) : Infinity;
    band('V5', M.v5);
    // ------------------------------------------------------------------------------------------
    // FINDING M-1 · RELEASING THE STICK DOES NOT COAST — it TRUNCATES, in one frame.
    // `move()` runs its 2-D horizontal clamp on EVERY frame, including a zero-input one, and the
    // clamp value `mx` is the fighter's own `s` for the state it is currently in. So any speed
    // above `s` — everything cruise and the afterburner buy you — is gone the frame you let go,
    // before drag has any say. §1.4 of the contract says the air release "COASTS (no hover, no soft
    // floor)"; it coasts from `s`, not from what you had. It is also why V2 above is released from
    // the NON-cruise plateau: measured through a cruise release, V2 would read the truncation
    // rather than the drag.
    // ------------------------------------------------------------------------------------------
    runForward(p, 220, true);
    const cruiseTop = hs(p);
    key('ShiftLeft', false); step(1);
    const afterCruise = hs(p);
    release(); step(1);
    M.m1 = { cruiseTop: +cruiseTop.toFixed(1), oneFrameLater: +afterCruise.toFixed(1),
             lostPct: +((1 - afterCruise / cruiseTop) * 100).toFixed(1),
             dragWouldHaveLost: +((1 - Math.exp(-1.8 * DT)) * 100).toFixed(1) };
    row('M1', 'FINDING M-1 — releasing input TRUNCATES speed to `s` in one frame, it does not coast',
      M.m1.lostPct > M.m1.dragWouldHaveLost * 2 ? 'GAP' : 'PASS',
      `${M.m1.cruiseTop} → ${M.m1.oneFrameLater} u/s in ONE frame (${M.m1.lostPct}% lost; drag alone would lose ${M.m1.dragWouldHaveLost}%)`,
      'a release loses only what drag takes',
      'WAVE 3 · AIR — `move()`\'s clamp is unconditional, so a zero-input frame still enforces `mx = s`. '
      + 'Everything cruise and the afterburner buy is deleted the instant you let go, which is the '
      + 'opposite of the momentum the swoop and the pass-through are built on.');
    release(); step(4);

    row('V5n', 'lateral input at cruise is a STRAFE, not a turn', 'GAP',
      `median path radius ${Number.isFinite(M.v5) ? M.v5 + 'u' : 'straight (no curvature)'}`,
      'a turn radius',
      'WAVE 1 · VIEW — yaw comes from pointer-lock mouse-look, which does not exist yet. Until it '
      + 'does, the only thing that rotates the movement basis is the chase camera following you.');

    // ==========================================================================================
    // 4 · V6 / V7 — THE GROUND. Measured BEFORE takeoff, because there is no other way to be on
    // the floor: `flying` never goes false under an open sky (POWERWORLD_AAA §1.3, the one blocking
    // defect). That is itself the headline finding of this axis.
    // ==========================================================================================
    const groundHero = byTier[0] ? byTier[0].id : 'sarge';
    ({ p } = stand('powerworld', groundHero));
    M.groundFlyingAtSpawn = p.flying;
    const gtr = runForward(p, 240, false);
    M.v6 = +Math.max(...gtr.slice(140)).toFixed(2);
    M.v6flying = p.flying;
    release(); step(1);
    const gv0 = hs(p), gx = p.pos.x, gz = p.pos.z;
    let f7 = 0, gdist = 0;
    for (; f7 < 300; f7++) { step(1); gdist = Math.hypot(p.pos.x - gx, p.pos.z - gz); if (hs(p) < 0.5) break; }
    M.v7t = +((f7 + 1) * DT).toFixed(3); M.v7d = +gdist.toFixed(1); M.v7v0 = +gv0.toFixed(1);
    band('V6', M.v6, `${groundHero} on the PowerWorld floor, before takeoff.`);
    band('V7', M.v7t, `${M.v7d}u from ${M.v7v0} u/s.`);
    M.v4ground = (() => { p.vel.x = 0; p.vel.z = 0; step(2); noTap(); key('KeyW', true); let n = -1; for (let i = 0; i < 12; i++) { step(1); if (hs(p) > 1e-4) { n = i + 1; break; } } release(); return n; })();
    ok('V4g', MOVE_BANDS.V4.what + ' (ground)', M.v4ground === 1, `${M.v4ground} frame(s)`, '1');
    // ⚠ THE BLOCKING DEFECT, MEASURED RATHER THAN QUOTED. Nine shipped systems read `flying` as
    // "is this fighter in the air"; under an open sky it is true while standing on the floor.
    ({ p } = stand('powerworld', groundHero));
    climb(40); release();
    // descend all the way back down and stand there
    key(KM.down, true); step(300); key(KM.down, false); step(60);
    M.onFloorStillFlying = { flying: p.flying, y: +p.pos.y.toFixed(2), groundY: +(p.groundY || 0).toFixed(2), grounded: p.grounded };
    row('G1', 'a fighter STANDING on the PowerWorld floor still reports flying', 'GAP',
      `y=${M.onFloorStillFlying.y} ground=${M.onFloorStillFlying.groundY} flying=${M.onFloorStillFlying.flying} grounded=${M.onFloorStillFlying.grounded}`,
      'flying=false, grounded=true',
      'WAVE 2 · GAIT — POWERWORLD_AAA.md §1.3, the ONE blocking defect: `!this._openSky` in the '
      + 'flight-exit test at entity.js:1450 means there is no exit from flight mode in PowerWorld. '
      + 'Ten shipped readers use `flying` as the air/ground proxy; footsteps have never once fired here.');
    release();

    // ==========================================================================================
    // 5 · V8 — LAUNCH CARRY FROM A REAL HAYMAKER, and the CITY control.
    // ⚠ "A synthetic impulse is not admissible for V8" (rubric §1.1) — the previous pass tuned this
    // on a 101 u/s impulse and missed that a real punch leaves at 49.2 u/s. Every number here comes
    // from `melee.chargeStart` / `chargeRelease` and the real hit test.
    // ⚠ `controlPlayer` IS stubbed for this one, and only this one: it rewrites `aim` from the mouse
    // every frame, after a test writes it and before `coneFoe` reads it (the documented override).
    // ==========================================================================================
    const punch = (modeId) => {
      const st = stand(modeId, 'rage', 'sol');
      const pp = st.p, foe = st.foe;
      if (!foe) return { hit: false, travel: 0, peak: 0, dmg: 0 };
      foe.ai = null;
      let frame = 0, released = false, hitAt = null, start = null, maxD = 0, peak = 0;
      game.controlPlayer = () => {
        pp.aim.set(1, 0, 0); pp.aim3.set(1, 0, 0); pp.facing = 0;
        if (frame === 2) game.melee.chargeStart(pp);
        if (frame === 45 && !released) { released = true; game.melee.chargeRelease(pp); }
      };
      for (frame = 0; frame < 900; frame++) {
        // ⚠ ABSOLUTE positions on both bodies until the swing is released (trap 6).
        if (!released) { pp.pos.set(0, 0, 0); pp.vel.set(0, 0, 0); foe.pos.set(6, 0, 0); foe.vel.set(0, 0, 0); }
        step(1);
        if (released && hitAt === null && foe.hp < foe.maxHp) { hitAt = frame; start = { x: foe.pos.x, z: foe.pos.z }; }
        if (hitAt !== null) {
          const s = s3(foe); if (s > peak) peak = s;
          const d = Math.hypot(foe.pos.x - start.x, foe.pos.z - start.z); if (d > maxD) maxD = d;
        }
      }
      game.controlPlayer = prevCP;
      return { hit: hitAt !== null, travel: +maxD.toFixed(1), peak: +peak.toFixed(1), dmg: +(foe.maxHp - foe.hp).toFixed(1) };
    };
    const pw8 = punch('powerworld');
    ok('V8a', 'a point-blank haymaker lands at all (nothing below means anything otherwise)',
      pw8.hit && pw8.dmg > 10, `${pw8.dmg} dmg`, '> 10');
    ok('V8', MOVE_BANDS.V8.what, pw8.travel >= 125 && pw8.peak >= 95,
      `${pw8.travel}u (${(pw8.travel / BODY).toFixed(1)} bodies), peak ${pw8.peak} u/s`,
      '>= 125u and >= 95 u/s');
    M.v8 = pw8;
    // the CITY control — §2.0 rule 5, driven not reasoned about.
    let city8 = null;
    try { city8 = punch('duel'); } catch (e) { city8 = null; }
    if (city8 && city8.hit) {
      ok('V8c', 'THE CITY: the identical haymaker still travels 7.2u', Math.abs(city8.travel - 7.2) < 0.6,
        `${city8.travel}u`, '7.2 +/-0.6u');
      M.v8city = city8;
    } else {
      row('V8c', 'THE CITY control could not be stood up on this page', 'INFO',
        'skipped', '7.2u', 'the standalone PowerWorld page builds no theatre (PROFILE_POWERWORLD.theater=false).');
    }

    // ==========================================================================================
    // 6 · THE RED PROOF — rubric §5.2. The suite is not believed until it has been shown to FAIL.
    // ==========================================================================================
    if (opts.selfProof !== false) {
      ({ p } = stand('powerworld', 'sol'));
      climb(620); release(); step(20);
      const measureV2 = () => {
        runForward(p, 260, false);
        release(); step(1);
        const v0 = hs(p), sx = p.pos.x, sz = p.pos.z;
        let n = 0, d = 0;
        for (; n < 700; n++) { step(1); d = Math.hypot(p.pos.x - sx, p.pos.z - sz); if (hs(p) < 0.5) break; }
        return { norm: v0 > 1 ? +(d * 100 / v0).toFixed(1) : NaN, raw: +d.toFixed(1), v0: +v0.toFixed(1), t: +((n + 1) * DT).toFixed(2) };
      };
      const good = measureV2();
      const undo = injectCityDrag(game, p);
      const bad = measureV2();
      undo();
      M.redProof = { good, bad, ratio: +(good.norm / bad.norm).toFixed(2) };
      const goodInBand = good.norm >= MOVE_BANDS.V2.lo && good.norm <= MOVE_BANDS.V2.hi;
      const badOutOfBand = !(bad.norm >= MOVE_BANDS.V2.lo && bad.norm <= MOVE_BANDS.V2.hi);
      ok('RP1', 'KNOWN-GOOD: V2 is in band with the air drag class intact', goodInBand,
        `${good.norm}u (from ${good.v0} u/s in ${good.t}s)`, `${MOVE_BANDS.V2.lo}..${MOVE_BANDS.V2.hi}u`);
      ok('RP2', 'KNOWN-BAD: forcing one fighter onto the city drag coefficient COLLAPSES V2',
        badOutOfBand && bad.norm < 22, `${bad.norm}u`, '< 22u and out of band (rubric predicts 16.7u)');
      ok('RP3', 'the suite can tell the two apart by a wide margin (it is not blind)',
        Number.isFinite(M.redProof.ratio) && M.redProof.ratio > 2.2,
        `${good.norm}u vs ${bad.norm}u = ${M.redProof.ratio}x`, '> 2.2x');
      ok('RP4', 'the injection is REVERSIBLE — _openSky is handed back', !!p._openSky, p._openSky, true);
    }
  } catch (e) {
    R.push({ id: 'THREW', name: 'SUITE THREW', verdict: 'FAIL', got: String((e && e.stack) || e).slice(0, 500), want: 'no throw', note: '' });
  } finally {
    release();
    game.update = realUpdate;
    game.controlPlayer = prevCP;
    game.world.render = prevRender;
    game.running = prevRunning;
    if (game.news && prevNews !== null) game.news.enabled = prevNews;
    console.error = oldErr;
  }

  const failures = R.filter((r) => r.verdict === 'FAIL').map((r) => `${r.id} ${r.name} — got ${r.got}, want ${r.want}`);
  const out = {
    suite: 'pwmove', checks: R.length, failures,
    gaps: R.filter((r) => r.verdict === 'GAP').length,
    consoleErrors: errs.length, errorSample: errs.slice(0, 5),
    rows: R.map((r) => `${r.verdict.padEnd(4)} ${r.id.padEnd(5)} ${r.name} — got ${r.got}, want ${r.want}`),
    metrics: M, findings, bands: MOVE_BANDS,
  };
  if (!opts.quiet) {
    console.log(`%cG-MOVE — ${R.length} checks, ${failures.length} failures, ${out.gaps} gaps, ${errs.length} console errors`, 'font-weight:bold');
    console.table(R);
  }
  return out;
}

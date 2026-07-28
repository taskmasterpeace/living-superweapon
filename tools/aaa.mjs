// =================================================================================================
// AAA — the one command that runs the PowerWorld AAA protocol end to end.
//
// `docs/powerworld/aaa-08-rubric.md` decomposes "feels AAA" into 31 numbers across five axes, a
// 22-frame shot matrix, and — the part that makes it admissible at all — a self-proof per axis:
//
//   §5.2  "Before any verdict in a run is admissible, the harness must be shown — in that same
//          session — to return GREEN on a known-good and RED on a known-bad, for every axis it
//          will grade."
//   §4.2  "no axis may be graded above C if its own known-bad injection was not run in this session."
//
// So this tool does four things, in this order, and refuses to report a grade it has not earned:
//   1. RUN THE SUITES        — window.LSW.{move,transition,cam,reticle,impact,audio}Suite
//   2. PROVE THEM RED        — each lane's own injector, then the suite re-run, then undo
//   3. CAPTURE THE MATRIX    — §3.2's 22 frames, plus the two §3.1 calibration injections
//   4. MEASURE THE PICTURES  — tools/framestats.mjs against docs/reference/framemarks.json
//
// -------------------------------------------------------------------------------------------------
// ⚠ FOUR THINGS THIS TOOL WILL NOT DO, EACH BECAUSE OF A SPECIFIC PAST FAILURE IN THIS REPO
//
//  A. IT WILL NOT REPORT A PASS FOR A SUITE THAT DOES NOT EXIST. A lane that has not shipped is
//     `NOT-BUILT`, which is not a pass and not a crash. Wave 0 runs four agents in parallel and the
//     honest state of a half-finished wave is "three of six".
//  B. IT WILL NOT REPORT A PASS FOR A SUITE WHOSE INJECTOR WAS NOT RUN. That axis is capped at
//     `UNPROVEN` and the overall verdict cannot be PASS. A suite that has never been shown to fail
//     is not evidence — this project has shipped a 4×-oversized boxing ring, black rubble and a
//     black sky, each behind green assertions.
//  C. IT WILL NOT LAUNDER A CONSOLE ERROR. §4.3 rule 5. One error anywhere in the run is a REJECT,
//     and the error text goes in the report next to the phase it happened in.
//  D. IT WILL NOT CLAIM A FRAME IT DID NOT WRITE. A pose that throws is recorded as `POSE-FAILED`
//     with the exception; a pose whose precondition does not exist yet (`f.gait`, before Wave 2) is
//     `SKIPPED` with the reason. §4.3 rule 3 makes a missing frame an F on its axis — that judgement
//     belongs to the critic, and this tool's job is to make the absence impossible to miss.
//
// ⚠ TWO CAPTURE PATHS, AND THE DIFFERENCE MATTERS.
//   · `buffer` — clear the renderer's scissor/viewport, call `world.render()`, and read
//     `canvas.toDataURL()` IN THE SAME TASK. This is rubric §1.0 RULE M-C: the renderer has no
//     `preserveDrawingBuffer`, so a later read is blank, and the news camera leaves a 320×180
//     scissor rect behind (CLAUDE.md §42) which returns a frame that is black except one corner.
//     This is the path for every composition frame, because it contains the RENDER and nothing else.
//   · `page`   — Playwright's screenshot, i.e. the DOM composited over the canvas. This is the only
//     honest path for the HUD frames (E2) and for `shoot.mjs`'s veil/blank guards. It is the WRONG
//     path for composition: measured on a live capture, the low-HP red vignette — a full-screen DOM
//     gradient — washed the sky pink and took the horizon read to zero confidence.
//
// USAGE
//   node tools/aaa.mjs                                   # everything, against localhost:5199
//   node tools/aaa.mjs --suites-only                     # numbers, no pictures
//   node tools/aaa.mjs --shots-only                      # pictures, no numbers
//   node tools/aaa.mjs --no-selfproof                    # ⚠ every axis is then UNPROVEN, by rule
//   node tools/aaa.mjs --url http://localhost:5180/powerworld.html --out shots/aaa --json r.json
//
// Exit 0 only on an overall PASS. 1 on REJECT/INADMISSIBLE, 2 on a usage error.
// =================================================================================================
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d = null) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const has = (n) => argv.includes('--' + n);

const URL = flag('url', 'http://localhost:5199/powerworld.html');
const OUT = flag('out', 'shots/aaa');
const [VW, VH] = flag('size', '1600x1000').split('x').map(Number);
const SUITE_TIMEOUT = +(flag('suite-timeout', 240000));
const QUICK = has('quick');
const DO_SUITES = !has('shots-only');
const DO_SHOTS = !has('suites-only');
const DO_PROOF = DO_SUITES && !has('no-selfproof');

// -------------------------------------------------------------------------------------------------
// THE AXES. Handle names are PROBED, not assumed: Wave 0's four lanes land at different times, and a
// tool that hard-codes one name reports a whole axis as missing when it was merely renamed. The
// first candidate is the name `src/boot.js` registers today; the rest are the names the rubric's own
// prose uses (`LSW.pwMoveSuite()`, `LSW.pwCamSuite()`, `LSW.pwImpactSuite()`), so either spelling
// resolves. `LSW.pwInject[axis]` is checked first for injectors so a lane can register one without
// this file changing at all.
// -------------------------------------------------------------------------------------------------
// ⚠ `mod` + `modInject` ARE A FALLBACK, AND THE FALLBACK BEING USED IS ITSELF A FINDING. Only three
// injectors are registered on the handle today (`injectCityDrag`, `injectVelocityWritingTransition`,
// `injectBadGait`); the other lanes' injectors exist as exports and nobody wired them, so four axes
// would report NO-INJECTOR and be capped at C for a bookkeeping reason rather than a real one. When
// this tool reaches one through its module it says `via module import` in the proof column, loudly,
// so the missing registration is visible rather than papered over.
// ⚠ THE PHANTOM-MODULE LAW STILL APPLIES and this is the narrow case it permits: a fresh `import()`
// under vite can be a SECOND module instance with its own state, so it must never be used to READ
// state. These injectors take the page's own `game` and return an undo — they patch the shared
// object, not module state — so a second instance changes nothing. Reading a suite's numbers this
// way would be a different matter entirely, which is why the SUITES are only ever run through the
// registered handle.
const AXES = [
  { id: 'MOVEMENT', suite: ['moveSuite', 'pwMoveSuite'], inject: ['injectCityDrag', 'injectBadDrag'],
    mod: '/src/bench/pwmove.js', modInject: ['injectCityDrag'],
    knownBad: 'city drag 6.0 on one fighter → V2 stop collapses 55.6→16.7u, V1 drops to 0.50s' },
  { id: 'TRANSITIONS', suite: ['transitionSuite'], inject: ['injectBadGait', 'injectVelocityWritingTransition'],
    mod: '/src/bench/transition.js', modInject: ['injectBadGait', 'injectVelocityWritingTransition'],
    knownBad: 'a gait written directly, bypassing the owner → T1 coverage < 100.00%, T3 Δv > 1e-3' },
  { id: 'CAMERA', suite: ['camSuite', 'pwCamSuite'], inject: ['injectNoStiff', 'injectBadStiff', 'injectZeroStiff'],
    mod: '/src/bench/pwcam.js', modInject: ['injectLimpCamera', 'injectCameraIntoGeometry', 'injectStiffener'],
    knownBad: 'stiff = 0 and the clip trace disabled → C5 residual > 40°, C6 violations > 0' },
  { id: 'RETICLE', suite: ['reticleSuite'], inject: ['injectParallelAim', 'injectBadAim', 'injectRevertConvergentAim'],
    mod: '/src/bench/reticle.js', modInject: ['injectWorseParallax', 'injectConvergentAim'],
    knownBad: 'revert the convergent-aim fix → R1 fails at every gap ≥ 32u. If it does not, the suite is blind' },
  { id: 'IMPACT', suite: ['impactSuite', 'pwImpactSuite'], inject: ['injectNoImpactFx', 'injectBadImpact'],
    mod: '/src/bench/pwimpact.js', modInject: ['injectNoImpactFrame', 'injectNoShake', 'injectBlowout'],
    knownBad: 'fxImpact = false → I3\'s middle sample stays at ~L0' },
  { id: 'AUDIO', suite: ['audioSuite'], inject: ['injectBadAudio', 'injectSilentAudio'],
    mod: '/src/bench/audio.js', modInject: ['injectSilence', 'injectOneVoice'],
    knownBad: 'the lane declares its own; see src/bench/audio.js' },
  // ⚠ OPT-IN. It is 52 heroes × 364 slots, it predates this protocol, and it is a regression control
  // rather than a graded axis — running it by default spends minutes to report something the
  // verdict does not read.
  { id: 'ABILITIES', suite: ['abilitySuite'], inject: [], optional: true, optIn: 'abilities',
    knownBad: 'none — a regression control, not graded' },
];

// -------------------------------------------------------------------------------------------------
// THE SHOT MATRIX — rubric §3.2, all 22, in its order and with its ids.
// `pose` is a body evaluated in the page with `A` bound to the in-page helper (see PAGE_HELPER).
// `needs` names a precondition; when it is absent the frame is SKIPPED with that reason rather than
// captured wrong. `capture` picks the path (see the header).
// -------------------------------------------------------------------------------------------------
const SHOTS = [
  // A — THE AIR GRAMMAR (7)
  { id: 'A1', axis: 'AIR', what: 'solo cruise ~100 u/s level', pose: `A.air({ solo:true, vel:[100,0,0], y:220 })` },
  { id: 'A2', axis: 'AIR', what: 'two fliers closing at 210 u/s', pose: `A.air({ gap:150, vel:[105,0,0], foeVel:[-105,0,0], y:220 })` },
  { id: 'A3', axis: 'AIR', what: 'foe directly overhead (degenerate branch)', pose: `A.air({ gap:0, foeUp:70, y:180 })` },
  { id: 'A4', axis: 'AIR', what: 'vertical dive, pose unclamped', pose: `A.air({ solo:true, vel:[0,-120,0], y:420 })` },
  { id: 'A5', axis: 'AIR', what: 'mutual burner chase', pose: `A.air({ gap:60, vel:[130,0,0], foeVel:[130,0,0], burner:true, y:240 })` },
  { id: 'A6', axis: 'AIR', what: 'mid-climb, spaceFrac ~0.5 (~888u)', pose: `A.air({ solo:true, vel:[0,90,0], y:888 })` },
  { id: 'A7', axis: 'AIR', what: 'hover, both still, 60u apart', pose: `A.air({ gap:60, y:200 })` },
  // B — THE GROUND GRAMMAR (5)
  { id: 'B1', axis: 'GROUND', what: 'grounded clinch, gap <= 11u', pose: `A.ground({ gap:10 })` },
  { id: 'B2', axis: 'GROUND', what: 'grounded mid, gap ~24u', pose: `A.ground({ gap:24 })` },
  { id: 'B3', axis: 'GROUND', what: 'haymaker contact frame', pose: `A.ground({ gap:8, haymaker:true })` },
  { id: 'B4', axis: 'GROUND', what: 'camera backed into a rock corner (C6 worst clearance)', pose: `A.ground({ gap:16, nearRock:true })` },
  { id: 'B5', axis: 'GROUND', what: 'grounded run across the stage', pose: `A.ground({ gap:30, run:true })` },
  // C — THE TRANSITION (4), T-BLIND: HUD hidden. The buffer path has no DOM at all, so it is blind
  // by construction rather than by remembering to hide something.
  { id: 'C1', axis: 'TRANSITION', what: 'gait = LIFT, mid-takeoff', needs: 'gait', pose: `A.gait('lift')` },
  { id: 'C2', axis: 'TRANSITION', what: 'gait = SETTLE, arriving', needs: 'gait', pose: `A.gait('settle')` },
  { id: 'C3', axis: 'TRANSITION', what: 'gait = CRASH', needs: 'gait', pose: `A.gait('crash')` },
  { id: 'C4', axis: 'TRANSITION', what: 'gh ~ 5, the mid-transition frame', needs: 'gait', pose: `A.gait('mid', 5)` },
  // D — THE RETICLE (3)
  { id: 'D1', axis: 'RETICLE', what: 'gap 10u — angular error worst', pose: `A.ground({ gap:10, hud:true })`, capture: 'page' },
  { id: 'D2', axis: 'RETICLE', what: 'gap 40u', pose: `A.ground({ gap:40, hud:true })`, capture: 'page' },
  { id: 'D3', axis: 'RETICLE', what: 'gap 200u', pose: `A.air({ gap:200, y:200, hud:true })`, capture: 'page' },
  // E — THE LAWS (3). E1 is measured over EVERY frame by framestats, not shot separately.
  { id: 'E2a', axis: 'LAW', what: 'HUD on at 1600x1000 (I6 centre box)', pose: `A.ground({ gap:24, hud:true })`, capture: 'page', size: [1600, 1000] },
  { id: 'E2b', axis: 'LAW', what: "HUD on at the Deck's 1280x800", pose: `A.ground({ gap:24, hud:true })`, capture: 'page', size: [1280, 800] },
  { id: 'E3', axis: 'LAW', what: 'healthy reference frame for the two calibration injections', pose: `A.ground({ gap:24 })` },
];

// The §3.1 calibration injections. Both are historical bugs from this repo: the black void of
// `docs/POWERWORLD.md:527` and the 9:11 PM frame that shipped verified.
const CALIBRATION = [
  { id: 'CAL-sky', what: 'world.skyMesh hidden — the black void', apply: `A.g().world.skyMesh.visible = false`, expect: 'sky area and mean luminance both move' },
  { id: 'CAL-night', what: 'dayFixed = null; dayT = 0.85 — night', apply: `(()=>{const w=A.g().world; w.dayFixed=null; w.dayT=0.85;})()`, expect: 'mean luminance drops hard' },
];

// -------------------------------------------------------------------------------------------------
// THE PAGE HELPER. Defined once in the page so every pose is driven by the same code, and so the
// clock discipline below is written down once instead of in twenty-two places.
//
// ⚠ OWNING THE CLOCK. `game.update` is called UNCONDITIONALLY by the page's rAF loop — it is not
// gated on `game.running`. Stepping the sim from a test while that loop also steps it means the
// pose you set is overwritten before you photograph it. So: stash the real update, install a no-op,
// call the real one by hand, restore in a finally. `src/bench/abilities.js` does exactly this.
// ⚠ `controlPlayer` REWRITES `aim`/`aim3` FROM THE MOUSE EVERY FRAME, after a test writes them.
// `game.controlPlayer` is the documented override.
// ⚠ PICK FIGHTERS BY TEAM, NEVER BY INDEX. `entities[1]` has been the KMK 9 camera operator.
// ⚠ PIN BOTH BODIES TO ABSOLUTE POSITIONS, EVERY STEPPED FRAME. A relative offset lets the melee
// step-in smear a measured gap 8u long.
// -------------------------------------------------------------------------------------------------
const PAGE_HELPER = () => {
  const L = window.LSW || window.PW;
  const A = {
    g: () => L.game,
    hud: () => L.hud,
    err: [],
    _realUpdate: null,

    sides() {
      const g = L.game;
      const p = g.humans && g.humans[0] ? g.humans[0].fighter : null;
      if (!p) return { p: null, foe: null };
      // BY TEAM. Never by index — the press pack spawns into `entities` too.
      const foe = g.entities.find((e) => e && e !== p && e.team !== p.team && e.hp > 0 && !e.def?.police) || null;
      return { p, foe };
    },

    enter(p1, p2) {
      const g = L.game, hud = L.hud;
      if (hud.hideTitle) hud.hideTitle();
      if (L.closeTitle) L.closeTitle();
      g.running = true;
      g.startMode('powerworld', { p1, p2, enemy: p2 });
      if (g.news) { try { g.news.enabled = false; } catch {} }   // `onAir` is a GETTER — never assign it
      // ⚠ RETURN A PLAIN SUMMARY, NEVER THE FIGHTERS. A Fighter carries the whole scene graph;
      // handing one back across page.evaluate is an unserialisable cycle, and the failure looks
      // exactly like "the match did not start".
      const s = this.sides();
      return { ok: !!s.p, foe: !!s.foe, p1: s.p && s.p.def && s.p.def.id, p2: s.foe && s.foe.def && s.foe.def.id };
    },

    pin(f, x, y, z) { if (!f) return; f.pos.set(x, y, z); f.vel.set(0, 0, 0); },

    // Step the REAL update by hand, with the rAF loop's copy disabled for the duration.
    // ⚠ RESTORE BY DELETING THE OWN PROPERTY when there was not one before, so the prototype method
    // comes back rather than a bound wrapper accumulating one layer per pose.
    step(n, each) {
      const g = L.game;
      const ownU = Object.prototype.hasOwnProperty.call(g, 'update');
      const ownC = Object.prototype.hasOwnProperty.call(g, 'controlPlayer');
      const prevU = g.update, prevC = g.controlPlayer;
      const real = prevU.bind(g);
      g.update = () => {};
      g.controlPlayer = () => {};
      try { for (let i = 0; i < n; i++) { if (each) each(i); real(1 / 60); } }
      finally {
        if (ownU) g.update = prevU; else delete g.update;
        if (ownC) g.controlPlayer = prevC; else delete g.controlPlayer;
      }
    },

    // ⚠ THE SHOT ITSELF. Clear the scissor first (§42), render, and read the buffer IN THE SAME
    // TASK — there is no preserveDrawingBuffer, so any later read is a blank frame.
    shot() {
      const w = L.game.world, r = w.renderer;
      try { r.setScissorTest(false); r.setViewport(0, 0, r.domElement.width, r.domElement.height); } catch {}
      w.render();
      return r.domElement.toDataURL('image/png');
    },

    setHud(on) {
      const el = document.getElementById('hud');
      if (el) el.style.visibility = on ? '' : 'hidden';
    },

    // ---- SUBJECT BOXES, MEASURED RATHER THAN GUESSED ---------------------------------------------
    // §3.4 requires the fighter bounding boxes for subject-height and pair-separation, and rules
    // that on the REFERENCE frames they must be hand-marked, because "an automatic segmenter on a
    // 640×480 JPEG-artefacted screenshot would be a made-up number wearing a script".
    //
    // ⚠ THAT RULING IS ABOUT THEIR FRAMES, NOT OURS, AND THE DIFFERENCE IS THAT WE CAN RE-RENDER.
    // A fighter's silhouette here is not estimated at all: render the frame, hide that fighter's
    // figure group, render again, and the pixels that CHANGED are exactly the fighter. It is the
    // same technique the rubric already specifies for I1 ("render each frame twice in the same task
    // — once normally, once with the opponent's figure group visible = false"). Their boxes are
    // hand-marked because we cannot re-render a 2005 screenshot; ours are exact because we can. The
    // two are recorded with different `method` values so nobody can later read them as the same
    // kind of number.
    //
    // ⚠ THE GROUND RIG IS HIDDEN IN BOTH RENDERS. The shadow, band ring, face wedge and state ring
    // are children of the figure group, so a naive diff measures body-plus-decal and reports a
    // fighter taller than they are. Hiding the rig in the base render too makes it cancel.
    // ⚠ AT REDUCED RESOLUTION ON PURPOSE — the box is wanted to ~0.3% of frame, and a full-size
    // getImageData per fighter per frame is the slowest thing in this tool.
    subjects() {
      const g = L.game, w = g.world, r = w.renderer;
      const RW = 400, RH = Math.round(RW * r.domElement.height / r.domElement.width);
      const grab = () => {
        try { r.setScissorTest(false); r.setViewport(0, 0, r.domElement.width, r.domElement.height); } catch {}
        w.render();
        const c = document.createElement('canvas'); c.width = RW; c.height = RH;
        const cx = c.getContext('2d', { willReadFrequently: true });
        // same task as the render — there is no preserveDrawingBuffer
        cx.drawImage(r.domElement, 0, 0, RW, RH);
        return cx.getImageData(0, 0, RW, RH).data;
      };
      const live = g.entities.filter((e) => e && e.hp > 0 && e.parts && e.parts.g && !e.def?.police && !e.def?.newscrew);
      const rigs = [];
      for (const f of live) if (f.parts.groundRig) { rigs.push([f.parts.groundRig, f.parts.groundRig.visible]); f.parts.groundRig.visible = false; }
      const out = [];
      try {
        const base = grab();
        for (const f of live) {
          const vis = f.parts.g.visible;
          f.parts.g.visible = false;
          const off = grab();
          f.parts.g.visible = vis;
          let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
          for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) {
            const i = (y * RW + x) * 4;
            const dd = Math.abs(base[i] - off[i]) + Math.abs(base[i + 1] - off[i + 1]) + Math.abs(base[i + 2] - off[i + 2]);
            if (dd > 24) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
          }
          // ⚠ A FIGHTER THAT CHANGED FEWER THAN 12 PIXELS IS OFF SCREEN OR FULLY OCCLUDED. Report
          // nothing rather than a one-pixel box: a box of noise would enter a band as a real number.
          if (n < 12) { out.push({ id: f.def && f.def.id, px: n, offscreen: true }); continue; }
          out.push({
            id: f.def && f.def.id, px: n,
            x: +(x0 / RW).toFixed(4), y: +(y0 / RH).toFixed(4),
            w: +((x1 - x0 + 1) / RW).toFixed(4), h: +((y1 - y0 + 1) / RH).toFixed(4),
            clipped: x0 <= 0 || y0 <= 0 || x1 >= RW - 1 || y1 >= RH - 1,
          });
        }
      } finally { for (const [o, v] of rigs) o.visible = v; }
      return out;
    },

    // ---- the pose primitives --------------------------------------------------------------------
    air(o = {}) {
      const { p, foe } = this.sides();
      if (!p) throw new Error('no player fighter');
      const y = o.y ?? 200, gap = o.gap ?? 60;
      const px = 0, pz = 0;
      const place = () => {
        this.pin(p, px, y, pz);
        p.flying = true;
        if (o.vel) p.vel.set(o.vel[0], o.vel[1], o.vel[2]);
        if (o.burner && p.def && p.def.afterburner) p._burnT = 2;
        if (foe && !o.solo) {
          this.pin(foe, px + gap, y + (o.foeUp || 0), pz);
          foe.flying = true;
          if (o.foeVel) foe.vel.set(o.foeVel[0], o.foeVel[1], o.foeVel[2]);
          foe.ai = null;
        } else if (foe) { foe.pos.set(px + 4000, y, pz); foe.ai = null; }
      };
      place();
      this.step(o.frames ?? 26, place);
      place();
      this.setHud(!!o.hud);
      return this.shot();
    },

    ground(o = {}) {
      const { p, foe } = this.sides();
      if (!p) throw new Error('no player fighter');
      const gap = o.gap ?? 24;
      const w = L.game.world;
      let px = 0, pz = 0;
      if (o.nearRock) {
        // Back the camera into cover: stand the pair right beside the nearest registered box.
        const c = (w.cover || []).find((b) => b && isFinite(b.x) && isFinite(b.z));
        if (c) { px = c.x + 18; pz = c.z; }
      }
      const gy = (x, z) => (w.heightAt ? w.heightAt(x, z) : 0);
      const place = () => {
        this.pin(p, px, gy(px, pz) + 0.1, pz);
        p.flying = false;
        if (o.run) p.vel.set(34, 0, 0);
        if (foe) { this.pin(foe, px + gap, gy(px + gap, pz) + 0.1, pz); foe.flying = false; foe.ai = null; }
      };
      place();
      if (o.haymaker && L.game.melee && foe) {
        // DRIVE THE GATE: a real charge through melee.js, not a written `_heavyT`.
        try {
          L.game.melee.chargeStart(p);
          this.step(40, place);
          L.game.melee.chargeRelease(p);
          this.step(3, place);
        } catch (e) { this.err.push('haymaker: ' + e.message); }
      } else this.step(o.frames ?? 20, place);
      place();
      this.setHud(!!o.hud);
      return this.shot();
    },

    gait(which, gh) {
      // Wave 2 owns `f.gait`. Until it exists this is never reached — the runner checks `needs`.
      const { p } = this.sides();
      if (!p || typeof p.gait === 'undefined') throw new Error('f.gait does not exist yet');
      throw new Error('gait poses are declared and unimplemented until Wave 2 lands the state field');
    },
  };
  window.__aaa = A;
  return {
    ok: true,
    hasGait: !!(window.LSW && window.LSW.GAIT) || (() => { try { return typeof A.sides().p.gait !== 'undefined'; } catch { return false; } })(),
  };
};

// -------------------------------------------------------------------------------------------------
const report = { started: new Date().toISOString(), url: URL, axes: [], shots: [], calibration: [], errors: [] };
const errors = [];
let phase = 'boot';
const log = (s) => console.log(s);
const hr = (t) => log('\n' + t + '\n' + '-'.repeat(Math.max(30, t.length)));

mkdirSync(resolve(OUT), { recursive: true });

const browser = await chromium.launch({
  // shoot.mjs's flags, for shoot.mjs's reason: headless Chromium defaults to SwiftShader for WebGL.
  // It renders correctly, which is all a screenshot needs — but a frame captured this way must
  // NEVER be used for a performance claim.
  args: ['--use-gl=angle', '--use-angle=default', '--enable-unsafe-swiftshader', '--disable-lcd-text'],
});
const page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error') errors.push({ phase, text: 'console: ' + m.text() }); });
page.on('pageerror', (e) => errors.push({ phase, text: 'pageerror: ' + (e && e.message) }));

// ⚠ HOT MODULE RELOAD IS SWITCHED OFF FOR THE DURATION, AND THIS IS NOT AN OPTIMISATION.
// Wave 0 runs four agents editing `src/` at the same time. Vite's client pushes a FULL PAGE RELOAD
// on a change it cannot patch, and a reload in the middle of a suite destroys the execution context
// — measured here as `Execution context was destroyed`, after which `window.LSW` is undefined and
// every remaining axis reports THREW for a reason that has nothing to do with the code under test.
// Blocking `@vite/client` costs a measurement run nothing (nobody is editing to see it live) and
// removes a whole class of result that looks like a failure and is not one. Navigations are still
// counted below, because a reload from any OTHER cause is a fact about the run and must be reported.
await page.route('**/@vite/client', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: 'export function createHotContext(){return {on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){}};}\nexport function updateStyle(){}\nexport function removeStyle(){}\nexport const injectQuery=(u)=>u;\n' }));
let navigations = 0;
page.on('framenavigated', (f) => { if (f === page.mainFrame()) navigations++; });

async function openMatch(p1 = 'sol', p2 = 'rage') {
  await page.goto(URL, { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(3200);
  // `#pwGo` is the real door (src/engine/pwTitle.js:238). `PW.door()` is the headless seam, used
  // only if the button is not there — a tool that silently bypasses the door is not testing the door.
  const btn = await page.$('#pwGo');
  if (btn) { await btn.click(); await page.waitForTimeout(3000); }
  else {
    const viaSeam = await page.evaluate(() => { try { const d = (window.PW || window.LSW).door(); if (d) { d.close(); return true; } } catch {} return false; });
    if (!viaSeam) throw new Error('no #pwGo and no PW.door() — the front door is unreachable');
    await page.waitForTimeout(3000);
  }
  const h = await page.evaluate(PAGE_HELPER);
  await page.evaluate(({ a, b }) => window.__aaa.enter(a, b), { a: p1, b: p2 });
  await page.waitForTimeout(600);
  return h;
}

// Is the page still the page we were measuring? A reload from any cause leaves `window.LSW`
// undefined, and the next twenty evaluates all fail with an error that has nothing to say about the
// engine. Checking is two milliseconds; guessing has already cost this run once.
const alive = async () => page.evaluate(() => !!(window.LSW && window.LSW.game && window.__aaa)).catch(() => false);
async function ensureMatch() {
  if (await alive()) return true;
  errors.push({ phase, text: 'page context was lost (navigation/reload) — re-opened the match and continued' });
  try { await openMatch(); return await alive(); } catch { return false; }
}

// =================================================================================================
// 1 + 2 — THE SUITES, AND THE PROOF THAT THEY CAN FAIL
// =================================================================================================
if (DO_SUITES) {
  phase = 'suites';
  hr('1. THE SUITES');
  await openMatch();

  const present = await page.evaluate(() => {
    const L = window.LSW || window.PW;
    return { keys: Object.keys(L).filter((k) => /Suite$|^inject/i.test(k)), hasInjectMap: !!L.pwInject };
  });

  for (const ax of AXES) {
    const rec = { id: ax.id, status: 'NOT-BUILT', handle: null, checks: 0, failures: [], rows: 0, proof: 'NOT-RUN', knownBad: ax.knownBad };
    if (ax.optIn && !has(ax.optIn)) { rec.status = 'SKIPPED'; rec.note = `opt-in: pass --${ax.optIn}`; report.axes.push(rec); log(`  ${ax.id.padEnd(12)} SKIPPED     (--${ax.optIn} to run it)`); continue; }
    const name = ax.suite.find((n) => present.keys.includes(n));
    if (!name) {
      // ⚠ NOT A CRASH AND NOT A PASS. Wave 0 runs four lanes in parallel; "this one has not landed"
      // is a real and reportable state, and the critic needs it stated, not inferred from silence.
      rec.note = `no handle among ${ax.suite.join(' / ')} — lane has not landed`;
      report.axes.push(rec); log(`  ${ax.id.padEnd(12)} NOT-BUILT   (${rec.note})`);
      continue;
    }
    rec.handle = name;
    if (!(await ensureMatch())) { rec.status = 'THREW'; rec.failures = ['the page context could not be restored']; report.axes.push(rec); log(`  ${ax.id.padEnd(12)} THREW      page context lost`); continue; }
    const run = async () => page.evaluate(async ({ n, q }) => {
      const L = window.LSW || window.PW;
      try {
        const r = await L[n]({ quick: q });
        if (!r || typeof r !== 'object') return { threw: 'suite returned ' + typeof r };
        const rows = Array.isArray(r.rows) ? r.rows : [];
        return {
          checks: typeof r.checks === 'number' ? r.checks : rows.length,
          failures: (r.failures || []).map(String),
          rows: rows.length,
          // keep a compact copy so the critic can read the numbers without a second run
          rowData: rows.slice(0, 80).map((x) => (typeof x === 'object' && x ? { ...x } : { v: String(x) })),
        };
      } catch (e) { return { threw: String((e && e.stack) || e).slice(0, 400) }; }
    }, { n: name, q: QUICK });

    let base;
    try { base = await Promise.race([run(), new Promise((_, rj) => setTimeout(() => rj(new Error('suite timeout ' + SUITE_TIMEOUT + 'ms')), SUITE_TIMEOUT))]); }
    catch (e) { base = { threw: e.message }; }

    if (base.threw) { rec.status = 'THREW'; rec.failures = [base.threw]; }
    else {
      rec.checks = base.checks; rec.failures = base.failures; rec.rows = base.rows; rec.rowData = base.rowData;
      rec.status = base.failures.length ? 'RED' : 'GREEN';
      // ⚠ A SUITE THAT ASSERTS NOTHING IS NOT GREEN. `[].every()` is true, and this repo shipped two
      // assertions that went green over an empty list. Zero checks is a vacuous pass, reported as one.
      if (!base.checks) { rec.status = 'VACUOUS'; rec.failures = ['0 checks — a suite that asserts nothing cannot pass']; }
    }

    // ---- the self-proof ------------------------------------------------------------------------
    if (DO_PROOF && rec.status !== 'NOT-BUILT' && !ax.optional && await ensureMatch()) {
      const inj = ax.inject.find((n) => present.keys.includes(n));
      if (!inj && !present.hasInjectMap && !ax.mod) rec.proof = 'NO-INJECTOR';
      else {
        const pr = await page.evaluate(async ({ n, s, ax2, q, mod, mods }) => {
          const L = window.LSW || window.PW;
          let undo = null, via = 'handle', used = n;
          try {
            if (n) undo = await L[n]();
            else if (L.pwInject && L.pwInject[ax2]) { undo = await L.pwInject[ax2](); used = `pwInject.${ax2}`; }
            else {
              const m = await import(/* @vite-ignore */ mod);
              const pick = (mods || []).find((k) => typeof m[k] === 'function');
              if (!pick) return { threw: `no injector export among ${(mods || []).join(', ')} in ${mod}` };
              undo = m[pick](L.game); via = 'module import'; used = pick;
            }
            const r = await L[s]({ quick: q });
            return { fails: (r && r.failures || []).map(String), checks: r && r.checks, via, used };
          } catch (e) { return { threw: String((e && e.message) || e).slice(0, 300), via, used }; }
          finally { try { if (typeof undo === 'function') await undo(); } catch { /* surfaced by the next run's baseline */ } }
        }, { n: inj, s: name, ax2: ax.id.toLowerCase(), q: QUICK, mod: ax.mod, mods: ax.modInject }).catch((e) => ({ threw: e.message }));

        rec.injector = pr.used || inj || null;
        rec.injectorVia = pr.via || null;
        rec.proofFailCount = (pr.fails || []).length;
        if (pr.threw) rec.proof = 'INJECTOR-THREW: ' + pr.threw;
        else if ((pr.fails || []).length > rec.failures.length) {
          rec.proof = `GREEN (${rec.failures.length}→${pr.fails.length} failures via ${pr.via})`;
          rec.proofFailures = pr.fails.slice(0, 8);
        } else {
          // ⚠ BLIND IS THE MOST IMPORTANT RESULT THIS TOOL PRODUCES, so it says what it measured and
          // names the cause that has already bitten once: an injector that mutates a LIVE FIGHTER
          // cannot survive a suite whose first act is `startMode`, because the fighter it poisoned
          // was replaced before a single metric was taken.
          rec.proof = `BLIND — ${rec.failures.length} failures clean, ${(pr.fails || []).length} injected (via ${pr.via}); the known-bad did not turn the suite red`;
          rec.blindHint = 'If the injector mutates a live fighter, the suite\'s own startMode respawns it before the first measurement — patch something that survives a restart, or have the suite accept an injected state.';
        }
      }
    }
    report.axes.push(rec);
    log(`  ${ax.id.padEnd(12)} ${rec.status.padEnd(9)} checks ${String(rec.checks).padStart(4)}  failures ${String(rec.failures.length).padStart(3)}  self-proof ${rec.proof}`);
    for (const f of rec.failures.slice(0, 6)) log(`      ✗ ${f}`);
  }
}

// =================================================================================================
// 3 — THE SHOT MATRIX
// =================================================================================================
if (DO_SHOTS) {
  phase = 'shots';
  hr('3. THE SHOT MATRIX (§3.2 — 22 frames, every one mandatory)');
  // ⚠ RELOAD. The suites drive tens of thousands of frames, spawn and kill fighters and inject
  // known-bad state; posing on top of whatever they left behind photographs their leftovers.
  const h = await openMatch();

  for (const s of SHOTS) {
    const rec = { id: s.id, axis: s.axis, what: s.what, file: null, status: 'PENDING' };
    if (s.needs === 'gait' && !h.hasGait) {
      rec.status = 'SKIPPED';
      rec.note = 'requires f.gait, which Wave 2 (GAIT) owns and has not landed. §4.3 rule 3 makes a missing frame an F on its axis — that is the critic\'s call, not this tool\'s.';
      report.shots.push(rec); log(`  ${s.id.padEnd(5)} SKIPPED     ${s.what}  (${rec.note.slice(0, 60)}…)`);
      continue;
    }
    try {
      if (s.size) await page.setViewportSize({ width: s.size[0], height: s.size[1] });
      const file = join(resolve(OUT), `${s.id}.png`);
      if ((s.capture || 'buffer') === 'page') {
        await page.evaluate(`(async()=>{ const A=window.__aaa; ${s.pose}; })()`);
        await page.waitForTimeout(250);
        writeFileSync(file, await page.screenshot({ type: 'png' }));
      } else {
        const uri = await page.evaluate(`(()=>{ const A=window.__aaa; return ${s.pose}; })()`);
        if (typeof uri !== 'string' || !uri.startsWith('data:image/png')) throw new Error('pose returned no frame');
        writeFileSync(file, Buffer.from(uri.split(',')[1], 'base64'));
      }
      // The pose is still standing, so measure the silhouettes off the SAME arrangement that was
      // just photographed. (Not for `page` captures — the DOM is in that picture and a render-diff
      // of the canvas would not describe it.)
      if ((s.capture || 'buffer') !== 'page') {
        rec.subjects = await page.evaluate(`(()=>window.__aaa.subjects())()`).catch((e) => [{ error: String(e.message).slice(0, 120) }]);
      }
      if (s.size) await page.setViewportSize({ width: VW, height: VH });
      rec.file = file.replace(/\\/g, '/'); rec.status = 'OK';

      // ⚠ A FRAME WITH NO FIGHTER IN IT IS NOT A CAPTURED FRAME, however cleanly it was written.
      // This is the boxing-ring rule in its cheapest possible form: six green assertions stood over
      // a ring four times too big because no assertion could see scale, and here nothing but the
      // render-diff can see that the subject left the picture. Every A/B frame in §3.2 is ABOUT
      // fighters, so the player being unfindable is a result, not a success — and it is reported
      // with its pixel count so the reader can tell "off screen" from "one pixel of a hat".
      if (Array.isArray(rec.subjects) && rec.subjects.length) {
        const pl = rec.subjects[0];
        if (!pl || pl.offscreen || pl.error) {
          rec.status = 'NO-SUBJECT';
          rec.note = `the player is not in the frame (${pl && pl.px != null ? pl.px + ' changed px' : 'measurement failed'}). The pose ran and the PNG was written — look at it. Either the pose is wrong or the camera lost the subject, and which of those it is belongs to the CAMERA lane.`;
        }
      }
      log(`  ${s.id.padEnd(5)} ${rec.status.padEnd(11)} ${s.what}${rec.note ? '\n        ' + rec.note : ''}`);
    } catch (e) {
      rec.status = 'POSE-FAILED'; rec.error = String((e && e.message) || e).slice(0, 240);
      log(`  ${s.id.padEnd(5)} POSE-FAILED ${s.what}\n        ${rec.error}`);
    }
    report.shots.push(rec);
  }

  // ---- the §3.1 calibration injections --------------------------------------------------------
  hr('3.1 THE CALIBRATION LAW — break the picture on purpose, and confirm the capture shows it');
  for (const c of CALIBRATION) {
    const rec = { id: c.id, what: c.what, file: null, status: 'PENDING' };
    try {
      await openMatch();
      await page.evaluate(`(()=>{ const A=window.__aaa; ${c.apply}; })()`);
      const uri = await page.evaluate(`(()=>{ const A=window.__aaa; return A.ground({ gap:24 }); })()`);
      const file = join(resolve(OUT), `${c.id}.png`);
      writeFileSync(file, Buffer.from(uri.split(',')[1], 'base64'));
      rec.file = file.replace(/\\/g, '/'); rec.status = 'OK';
      log(`  ${c.id.padEnd(10)} captured — expect: ${c.expect}`);
    } catch (e) { rec.status = 'FAILED'; rec.error = String(e.message).slice(0, 200); log(`  ${c.id.padEnd(10)} FAILED ${rec.error}`); }
    report.calibration.push(rec);
  }
}

await browser.close();
report.errors = errors; report.navigations = navigations;

// =================================================================================================
// 4 — THE PICTURES, MEASURED
// =================================================================================================
let calibrationVerdict = 'NOT-RUN';
if (DO_SHOTS) {
  hr('4. COMPOSITION (§3.4) — tools/framestats.mjs over the captured frames');
  const files = [...report.shots, ...report.calibration].filter((s) => s.file).map((s) => s.file);
  if (!files.length) log('  no frames captured');
  else {
    const jsonPath = join(resolve(OUT), '_framestats.json');
    // Hand framestats our MEASURED boxes in its own marks format, so subject height and pair
    // separation are computed by the same code that computed them for the reference frames — one
    // definition of "the tallest fighter's box height ÷ frame height", not two.
    const marksPath = join(resolve(OUT), '_ourmarks.json');
    const om = { _README: ['Subject boxes for OUR captured frames. method = "render-diff": the fighter was',
      'hidden and the frame re-rendered, so the box is the exact set of pixels that changed. This is',
      'NOT the same kind of number as the hand marks on the reference frames, and is labelled so.'],
      frames: {} };
    for (const s of [...report.shots, ...report.calibration]) {
      if (!s.file || !Array.isArray(s.subjects)) continue;
      const boxes = s.subjects.filter((b) => b && !b.offscreen && !b.error && typeof b.h === 'number');
      om.frames[s.file.split('/').pop()] = { source: 'OURS', method: 'render-diff', by: 'tools/aaa.mjs', fighters: boxes.length ? boxes : null };
    }
    writeFileSync(marksPath, JSON.stringify(om, null, 2));
    try {
      execFileSync(process.execPath, ['tools/framestats.mjs', ...files, '--json', jsonPath,
        '--marks', marksPath, '--compare', 'docs/reference/framemarks.json'],
        { stdio: 'inherit', timeout: 600000 });
      report.framestats = jsonPath.replace(/\\/g, '/');
      report.ourMarks = marksPath.replace(/\\/g, '/');
    } catch (e) { log('  ⚠ framestats failed: ' + e.message); }

    // ⚠ THE CALIBRATION VERDICT IS A COMPARISON, NOT A VIBE. §3.1: "If either injection produces a
    // capture indistinguishable from the healthy one, the visual lane is INADMISSIBLE for this run."
    // So it is decided on the numbers the tool just wrote, against the healthy E3 frame.
    try {
      const fs = JSON.parse(readFileSync(jsonPath, 'utf8'));
      const by = (id) => fs.rows.find((r) => r.file.endsWith(`/${id}.png`) || r.file.endsWith(`${id}.png`));
      const healthy = by('E3');
      const moved = (a, b) => {
        if (!a || !b) return null;
        const d = (k) => (b[k] === null || a[k] === null ? 0 : Math.abs(b[k] - a[k]));
        return { meanLum: d('meanLum'), skyFrac: d('skyFrac'), centreRms: d('centreRms'), colors: Math.abs(b.colors - a.colors) };
      };
      const rows = CALIBRATION.map((c) => ({ id: c.id, delta: moved(healthy, by(c.id)) }));
      log('');
      for (const r of rows) {
        if (!r.delta) { log(`  ${r.id}: cannot compare (a frame is missing)`); continue; }
        // "visibly different" made concrete: 8/255 of mean luminance, or 5 points of sky area, or
        // 6/255 of centre contrast. Below all three, a human would not see it either.
        const ok = r.delta.meanLum >= 8 || r.delta.skyFrac >= 0.05 || r.delta.centreRms >= 6;
        log(`  ${r.id.padEnd(10)} vs healthy E3 → Δlum ${r.delta.meanLum.toFixed(1)} · Δsky ${r.delta.skyFrac.toFixed(3)} · ΔcentreRms ${r.delta.centreRms.toFixed(1)} · Δcolours ${r.delta.colors}   ${ok ? 'DETECTED' : '⚠ INDISTINGUISHABLE'}`);
        r.detected = ok;
      }
      report.calibrationDeltas = rows;
      calibrationVerdict = rows.length && rows.every((r) => r.detected) ? 'GREEN'
        : rows.some((r) => r.delta) ? 'RED' : 'NOT-RUN';
    } catch (e) { log('  ⚠ calibration comparison failed: ' + e.message); }
  }
}

// =================================================================================================
// THE REPORT
// =================================================================================================
hr('0. ADMISSIBILITY');
const graded = report.axes.filter((a) => !AXES.find((x) => x.id === a.id)?.optional);
const built = graded.filter((a) => a.status !== 'NOT-BUILT');
const proven = built.filter((a) => a.proof === 'GREEN');
const shotsOk = report.shots.filter((s) => s.status === 'OK').length;

log(`  suites          ${built.length}/${graded.length} built · ${built.filter((a) => a.status === 'GREEN').length} green · ${built.filter((a) => a.status === 'RED').length} red · ${built.filter((a) => ['THREW', 'VACUOUS'].includes(a.status)).length} threw/vacuous`);
if (DO_PROOF) log(`  self-proof      ${proven.length}/${built.length} shown to turn RED under their own known-bad`);
else log(`  self-proof      NOT RUN (${has('shots-only') ? '--shots-only' : '--no-selfproof'}) — every axis is UNPROVEN and capped at C by §4.2`);
log(`  shot matrix     ${shotsOk}/${SHOTS.length} usable · ${report.shots.filter((s) => s.status === 'SKIPPED').length} skipped · ${report.shots.filter((s) => s.status === 'POSE-FAILED').length} pose-failed · ${report.shots.filter((s) => s.status === 'NO-SUBJECT').length} written-but-empty`);
log(`  calibration     ${calibrationVerdict}`);
log(`  console errors  ${errors.length}`);
for (const e of errors.slice(0, 12)) log(`      [${e.phase}] ${e.text}`);

hr('1. VERDICT');
const reasons = [];
if (errors.length) reasons.push(`${errors.length} console error(s) during the run — §4.3 rule 5`);
if (DO_SUITES && built.length < graded.length) reasons.push(`${graded.length - built.length} axis suite(s) not built`);
if (DO_SUITES && built.some((a) => a.status !== 'GREEN')) reasons.push(`${built.filter((a) => a.status !== 'GREEN').length} axis suite(s) not green`);
if (DO_PROOF && proven.length < built.length) reasons.push(`${built.length - proven.length} axis/axes UNPROVEN — §5.2 makes their verdicts INADMISSIBLE, §4.2 caps them at C`);
if (DO_SHOTS && shotsOk < SHOTS.length) reasons.push(`${SHOTS.length - shotsOk} frame(s) missing from the §3.2 matrix — §4.3 rule 3`);
if (DO_SHOTS && calibrationVerdict !== 'GREEN') reasons.push(`the §3.1 calibration is ${calibrationVerdict} — the visual lane is INADMISSIBLE without it`);

const verdict = reasons.length ? (DO_PROOF && proven.length < built.length ? 'INADMISSIBLE' : 'REJECT') : 'PASS';
log(`  ${verdict}`);
for (const r of reasons) log(`    · ${r}`);
if (verdict === 'PASS') log('    every built suite green, every one proven red under its known-bad, matrix complete, calibration detected.');

report.verdict = verdict; report.reasons = reasons; report.calibrationVerdict = calibrationVerdict;
const jf = flag('json', join(resolve(OUT), '_aaa.json'));
mkdirSync(resolve(jf, '..'), { recursive: true });
writeFileSync(jf, JSON.stringify(report, null, 2));
log(`\n  report → ${jf.replace(/\\/g, '/')}`);
process.exit(verdict === 'PASS' ? 0 : 1);

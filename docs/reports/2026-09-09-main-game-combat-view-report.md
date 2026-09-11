# Main-game combat view — implementation report

Plan: `docs/superpowers/plans/2026-09-09-main-game-combat-view.md`.

Status: **runtime frozen, ready for independent review; bounded acceptance gaps remain below**. Sole worker owns the scoped integration; parent owns independent review and the main-entry browser harness. Shared existing changes are preserved. No commits, staging or worktree copy. This is not whole-game or player-feel approval.

Skills used: subagent-driven-development implementer contract (parent supplies review; no worker subagents), test-driven-development, verification-before-completion, Three.js runtime boundaries, game-playtest, and Impeccable adaptation of incumbent compact HUD. Impeccable context loaded once for `src/engine/hud.js`; no DESIGN.md/surface brief was invented. Impeccable guided retaining the incumbent warm/gold identity, improving the actual combined dock footprint and inspecting medium/phone layouts, not a menu redesign.

## Rulings

- Parent: L1 + R3 toggles a chase-view lock; guard remains held and R3 is consumed through physical release. Standalone item and descend remain available; touch receives an explicit button. The approved plan now records the bounded additional core ownership.
- The pure resolver reads a published `combatOverlayOpen` boolean. Game/HUD owns reading the existing actual overlay state; the resolver itself does not inspect DOM or invoke effectful methods.
- Current root `MODES` publishes Free Roam and specialist `lab`, not legacy `training` (`src/data/modes.js:3`). Parent accepted actual Free Roam and Duel2P entries; no fictitious Training menu was added. Existing `cycleLock` excludes dummies (`game.js:1634`), so explicit locks use a genuine spawned rival. Placement/passive AI is disclosed, not presented as unassisted combat.

## Checkpoints

- A: initial 14-case policy/native World/controller RED (missing policy, ignored explicit BFP style, orthographic first controller frame), then GREEN. First-frame camera is established before aim/fire.
- B: native controller/retirement/chord checks added RED, then GREEN; standalone R3 now reaches the existing item intent only in active chase view. Both chord release orders consume R3 through release. Native pad look is rate-scaled, measured at 30/60/120 Hz.
- C: native HUD class/reticle RED then GREEN; touch DOM RED (missing explicit button) then GREEN. Root layout RED independently reproduced the centered city plate over the body lane. Compact edge-stack/duplicate-card refinement passed actual root1600×900 and1100×720 captures; both personally inspected by worker and parent.
- D: parent actual root BEFORE: orthographic city view. Parent actual root AFTER: Perspective 73.74°, `combat-chase`, `_openSky=false`, no PowerWorld class, police/news active, zero errors. Native middle-click/Space/W/look/Escape recording also passed (6.08u ascent, 20.92u travel, capture released on pause). Parent owns these artifacts and visual assessment; they are not attack/contact or general feel approval.

## Exact changed seams / attribution

No task-start snapshots of tracked shared files were retained. A whole HEAD-to-worktree diff includes earlier shared work and **must not be called this task's narrow diff**. This task changed only:

- New `src/engine/combat-view.js`: pure BFP/shared/map/legacy and active-input predicates. No scene/physics mutation.
- `src/engine/world.js:2588`: optional `chase(...,style='auto')`, explicit BFP dispatch and its existing camera shadow flag. Existing BFP solver, lens, anchor and collision math are unchanged. Existing three-argument non-open-sky dispatch is separately tested.
- `src/engine/game.js:9,1392,3286`: policy import, reticle hiding, new input retirement/pre-control eye methods. Native update calls the prepass after pad/touch polling and before controller/slowmo (`3902`); paused BFP keeps its held view (`3908`). Shared post-camera crosshair/cleanup (`4023`) and camera arbitration (`4073`) use the same policy.
- `src/engine/game.js:3329`: presentation-only controller branches: center-ray aim, hostile soft/readout versus physical ally hit distinction, explicit T/pad/touch lock, no fire-to-lock, native muzzle-to-trace correction, planar city camera walk/evade, active-chase R3 routing to existing gadget/held gear. Existing `_openSky` movement/flight branches and `controlPad` are untouched. Native mouse look is applied once; deadzone-normalized full stick is2.4rad/s with existing input-dt cap. No second simulation clock.
- `src/core/gamepad.js:61`: lock sampling and physical held-action suppression through release; raw menu indices/MAP remain unchanged. `src/core/touch.js:29,59,79,134`: one existing-layout lock button, accessible name/Enter/Space handling, active-view visibility and pressed state. No replacement control system.
- `src/engine/hud.js:533,829,1971`: view-aware hints/mood docking, cached semantic `powerworld` versus presentation `combat-chase`, crosshair update/cleanup. `src/engine/hud.styles.js:973` onward: compact chase/crosshair selectors separated from unchanged semantic suppression at966; status meter grid, city edge stack and compact selected-attack/shortcut rail. Added selector specificity is needed because the preexisting later `dual-trigger.styles.js` expands generic slot cards; that file is not edited.
- New `tools/main-combat-view.test.mjs`, `tools/helpers/main-combat-fixture.mjs`, `tools/main-combat-view-browser.mjs`; bounded floor fixture correction below. Approved plan rulings/checkpoint documentation and this report only.

No task edits to `boot.js`, `Input`, shell CSS, mode catalog, source characters, physics, nanites, projectiles, news or civil systems. These may already be dirty from earlier shared work.

## Verification

| Command | Fresh result |
| --- | --- |
| `node --test tools/main-combat-view.test.mjs` |40/40, zero failures/skips; native policy/camera/controller, actual pad polling, item/chord release orders including pause, real form/KO/respawn cancellation, native support, legacy/shared/map compatibility |
| `node --test tools/main-combat-view.test.mjs tools/ground-camera.test.mjs tools/ground-camera-cover.test.mjs tools/foreground-visibility.test.mjs tools/combat-selection.test.mjs tools/progression-input.test.mjs tools/newscrew.test.mjs` |132/132, zero failures/skips,3.364s |
| `node --test tools/gameplay-lock.test.mjs tools/focus-release.test.mjs tools/gesture-clock.test.mjs` |18/18, zero failures/skips |
| `npm run build` |281 modules,6.11s, exit0; existing large-chunk warning remains |
| `node tools/main-combat-view-browser.mjs layout` |Real root1600×900/1100×720, exit0, zero page errors |
| `node tools/main-combat-view-browser.mjs combat` |Real root Free Roam then Duel2P,8.24s, exit0, zero page errors |
| `node tools/main-combat-view-browser.mjs phone` |Real root390 portrait/844×390 landscape plus native mounted touch input,5.60s, exit0, zero page errors |
| `node tools/main-combat-view-browser.mjs` |Isolated native TouchControls DOM + real Gamepad methods; pointer and Enter lock, release, no item/fire, pause/shared hiding, exit0 |

Browser base is `LSW_TEST_URL` or `http://127.0.0.1:5189`; installed Chromium/Playwright, no new dependency. The native headless unit helper omits only WebGL construction/output and uses StudioCombat for real bounded VFX/ordnance plus silent audio; it calls actual World/Fighter/controllers, not a complete boot. Real root captures run ordinary RAF/Game.update without camera, physics, renderer or damage overrides.

The camera test correction only sets the stale raised-floor fixture's `groundY=height` (`tools/ground-camera.test.mjs:20`); the new native Fighter.update control discovers its18u support over120 frames and keeps the crosshair clear. The original60°/18u test was RED with2 opaque body-ray intersections before correcting that missing support initialization. No visibility assertion or camera math was weakened.

Impeccable detector run once after UI completion: `node .agents/skills/impeccable/scripts/detect.mjs --json src/engine/hud.js src/engine/hud.styles.js src/core/touch.js`. Exit1 reports8 existing findings in unchanged CSS lines14–617 (bounce easing, layout transitions, Codex grid), none in the new compact block. Kept out of this bounded adaptation; this is not a detector-clean claim.

## Actual native evidence and limits

- Parent baseline/after/action: `artifacts/main-entry-camera-before`, `main-entry-camera-after`, `main-entry-camera-final-action`. Actual root changed from iso/Orthographic to chase/Perspective73.74; `_openSky=false`, selected White City, police/news enabled. Final real Space held498ms until native flight, release hover+6.42u; W travels16.91u; mouse yaw−.312/pitch.072; Escape pauses/releases capture. Silent video is movement/input evidence, not audio/attack/feel approval. Parent sampled warm RAF5.15–7.77ms means/p9512.5ms; cold boot and known shader stalls are not closed.
- `artifacts/main-combat-view-layout`: cityplate `(18,52,260,57.89)` clear of central body lane; status dock260×183, attack dock352×138, correspondent186×126.75. Necessary selected attack names/status remain; inventory becomes a tooltip-backed shortcut rail. Wanted row is naturally absent at zero wanted, not hidden by a chase selector. Wanted-positive/very long warning footprints are not yet captured.
- `artifacts/main-combat-view-combat`: real `spawnRival('kano')`, then explicitly passive AI and native-clear placement20u ahead (18 native cover entries remain). Actual mouse look/T locks ground and15u-elevated hovering rival. Free-aim LMB is unlocked: HP115 unchanged while visible beam tip has traveled14.575u, then111.994HP with native `lastHitBy===player`. Real RMB Arctic Breath adds.002075 frost. Pause/resume clears held inputs/lock/charge. Actual menu selects Duel2P and retains iso/Orthographic/no capture/no chase class. The screenshot includes the ordinary post-opening view; full steady-state shared framing at wider player separation remains a separate acceptance case.
- Initial combat harness failure was a wrong fixture expectation: cones do not own `active/sustainT`; their native held handler was visibly firing. Replaced that assertion with actual target frost growth, no runtime change. Initial2P image also caught the existing480ms opening fade; the rerun waits for actual `opCine` removal.
- `artifacts/main-combat-view-phone`:390 portrait retains the existing rotation gate;844×390 landscape retains health/crosshair and existing touch layout. New lock is62×62 at772/314. Real Chromium touchStart/end goes through mounted TouchControls→pad merge→Game.update: lock acquires a genuine staged hovering rival, second press releases; zero guard/item/shot leakage. Native right-stick touch drag yields yaw−.1574087, then rx0. This is touch emulation, not physical phone/gamepad verification. Existing phone layout intentionally hides city/news and full selected-attack cards; this task preserves that platform rule. Its mood tile still overlaps the legacy phone meter strip; not silently called a polished phone HUD.

## Checklist accounting / remaining acceptance

| Planned area | State |
| --- | --- |
| Pure view policy, explicit camera seam, first-frame matrices, legacy auto dispatch |Implemented; native tests pass |
| Free aim/T locks, physical ally versus hostile readout, native cover/hidden rejection |Implemented; unit controls + real root free-beam/low/high locks pass |
| Mouse/pad/touch, cadence, movement/evade, no city physics flags |Implemented; mouse/root and touch/root pass; synthetic standard pad polling30/60/120 and release ownership pass; physical hardware untested |
| Pause/title/modal/map/KO/respawn/form/hero retirement at zero time |Native controller/Fighter unit gates pass; root pause/menu and2P paths captured; root KO/respawn/map-tool walkthrough not captured |
| Desktop compact HUD + actual city/news |1600/1100 captures inspected; wanted-positive/extreme warning density still unrun |
| Actual root entry/civil world/traveling damage |Pass for disclosed SOL/Kano fixture; no alternate arena or disabled correspondent |
| Matched16:9 small/large authored body **with cannon/guard near cover** |Bounded actual-root captures now saved below; partial only. Large cannon is denied, and mixed-run male/procedural ground labels do not prove settled footing |
| Two-player steady wide fit and phone overall visual quality |Exact combat→2P trace upright at native starting separation; wider fit unrun. Parent authorized narrow phone mood/meter correction |
| Independent review |Review received; clock/foe overlap confirmed. Narrow HUD correction authorized; no speculative camera or emitter change |

No claim that every attack target is now always visible. Camera math, body dimensions and native emitter readiness remain unchanged during the authorized HUD correction.

## Frozen-runtime acceptance append — body fixture and 2P attribution

Commands used the actual running root at `LSW_TEST_URL=http://127.0.0.1:5180`:

- `node tools/main-combat-view-browser.mjs transition` → exit0, `errors=[]`; `artifacts/main-combat-view-transition/results.json` and `settled-2p.png`.
- `LSW_CAMERA_OUT=artifacts/main-combat-view-combat-trace node tools/main-combat-view-browser.mjs combat` (set environment variables through PowerShell) → exit0, `errors=[]`; exact prior native ground/high-lock, free beam/contact, secondary, pause/resume, Tab→Duel2P sequence, then six native RAF samples over0–2400ms. The capture includes camDir/camDist/eye/target/up/quaternion, camera matrices, frustum, projected actor root/head/foot, and `composer.passes.filter(p=>p.camera)` identity. `root-duel-2p-settled.png` was personally inspected upright with both actors inside the frame.
- In that exact trace, orthographic top decreases91.4703→80.0026 and bottom remains its negative; up is `[0,1,0]`; RenderPass camera is `world.camera` throughout. Screen-normalized head-minus-root Y is−.03223→−.03713 for P1 and−.02999→−.03477 for P2 (negative means upward). Both this trace and the simpler look→2P trace fail to reproduce the older inverted `main-combat-view-combat/root-duel-2p.png`. That older artifact remains invalid acceptance evidence and unexplained; its missing telemetry cannot be reconstructed. No camera change is justified from an unverified inheritance hypothesis. This is starting-separation evidence, not wide-fit approval.
- `node tools/main-combat-view-browser.mjs bodies` → partial, exit1 on large cannon charge wait; `artifacts/main-combat-view-bodies/results.json`. Genuine `buildDef`/`applyProfile` source definitions were registered only in the page, then native `setPlayerChar`. Disclosed setup: level10/full pool, passive genuine Kano35u ahead, initial position/support, unchanged18 native cover entries. Fixed lane is `(−160,0,−192)`,8u outside the selected building's cover edge (center−192/−192, half-width24, half-depth20, top132). This does not certify all finer interior/split obstacles absent. No physics, camera, controller, pose or render overrides; subsequent motion uses ordinary Game.update and actual keys.
- Small female scale/bulk.65 and male1/1 each have guard and cannon **charge/pre-release** captures on the initially placed and hovering passes. Charge timestamps are.3042–.3129s; these are not final firing poses or native muzzle launch proof. In particular the outstretched female charge arms cannot be labeled approved final authored cannon posture. Target remains in the native16:9 frame, with actual city/police/news and `_openSky=false`. Parent inspected female charge and large guard images as scoped body/target visibility only.
- **Footing correction:** the combined run's male and procedural files named `ground-guard` have `gait:'airborne'` despite `flying:false`; do not count them as settled-ground evidence. The fixture waits for nanite readiness plus40 RAF, not a native footing settle predicate, and did not save `groundY`/`vel.y`. `Fighter._updateGait` reads actual prior support at `entity.js:415`; final contact/onFoot is computed after physics at `1999`. Initial placement and `flying:false` alone are insufficient. No unexplained gait result was forced or repaired for this camera task.
- Capped fresh-only follow-up: `node tools/main-combat-view-browser.mjs bodies large` → exit1 only at20s hover charge timeout; `artifacts/main-combat-view-body-large/results.json`, `errors=[]`. This time actual ground guard/denied cannon snapshots have `gait:'grounded'`, `flying:false`, player y0; separate denial geometry snapshot has `onFoot:true`. Full current `groundY`/`vel.y` still were not captured, so this is a sampled native footing result, not a tested settle-duration guarantee. Hover guard is native `flying:true`, `gait:'airborne'`, y6.39396; target screen(.5,.48733), head y.56167, boots y.81366/.84483. Ground target y.48669, head.54542, boots.83567/.83817: no projected clipping in these samples.
- **Large cannon remains blocked, not passed:** native Q yields `denied:'obstructed'`, retry=true, chargeT0, ki106, alive/running true, no guard, no busy hand; hover repeats the denial. Ground literal cell corners are≥5.18865u above sampled terrain; socket(−163.75251,5.35804,−190.86610); tested cover/body OBB arrays are empty but native `naniteEnvelopeClear` is false. That function also checks socket `sweepSplitObstacle` and interior wall volumes (`nanite-pose.js:21,29`), which the bounded diagnostic did not separately enumerate. Therefore this does **not** establish a false-positive collision, a scale defect or a camera cause. Preserve it for a separate native delivery investigation; no pose/collision tuning in this round.

Parent authorized only two concrete layout corrections after these traces: reserve separate visible city-clock/hostile-readout space, and remove phone mood/meter overlap without changing touch or portrait rules. Root KO/respawn/map walkthrough remains parent-owned. All other limits above remain open unless separately evidenced.

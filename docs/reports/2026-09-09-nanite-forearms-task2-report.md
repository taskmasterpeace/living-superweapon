# Nanite forearms — Task 2 implementation checkpoint

September 9, 2026. Scope: cannon aiming/native charge and emission, private shield deployment/Guard presentation. Parent browser capture and independent review are pending at this checkpoint. This is not Task 3 interception or Task 4 Studio authoring acceptance.

## Result and source gate

- The genuine ORIGIN `nanite-cannon` source is published only after the native readiness/emission regression gate passed. It uses the brief's accepted base values, category `charge`, and ORIGIN price 28. Its anatomical override reconstructs a real right/left forearm source and must finish assembly before payment or charging. No existing source cost/cooldown changed.
- `nanite-shield` remains absent from the public catalog. Its private handler toggles existing deployment without healing, spending ki, or changing native `guardType`/`guardStrong`. Its final forearm adapter presents the actual panel normal during eligible native Guard. No interception, absorption, or actionable public shield claim is made here.
- No Studio runtime/UI, movement, physics, cape, military, audio implementation, source migration, dependency installation, commit, staging, worktree, or browser script edits were made. Existing Task 1 and resource-construct work is preserved.

## Native implementation

`naniteEmitter(fighter, slot, epoch)` reacquires `{socket, arm, side, axis}` from the current fitted view. `axis` is a world-space Vector3. It verifies current canonical source identity, capability readiness/unlock/lifecycle, view epoch, and optional captured epoch. It never falls back to a palm, wrist-mounted gun, another slot, or a retired form.

`nanite-pose.js` is a bounded procedural adapter over existing source/body carriers, not an imported animation or movement replacement. It solves the actual parent forearm with existing two-bone IK, up to three aperture-parallax iterations, after hit reaction and after offensive hand-speed measurement. Snapshotted arm/forearm/hand transforms unwind before the next base solve/form handoff. Both anatomical sides and independent off-arm actions remain distinct.

Structural readiness precedes native payment, input-use stamping, orb/gather allocation and no-ki feedback. Denials report assembling/reforming/occupied/obstructed and require a fresh press after a denied hold. Native finite/infinite entry investment, held drain, tiny-release entry-only refund, full/partial radius/damage, cooldown, and dry release remain in the existing charge handler.

Released cannon payloads capture only semantic slot/epoch and the native command target. The shared final `Projectile.resolveLaunch` reacquires the live socket and terminally rejects invalid/occupied/obstructed or >3-degree misaligned releases. A clear `launchOrigin` remains the physical sphere center **aperture + direction × full physical radius**, not the socket. A legal barrel with an expanded sphere contacting nearby cover retains native full-radius clipping/contact; its damage/radius do not shrink to fit the preview.

The new cannon's existing release sound/punch/shake are deferred to successful final validation, with unchanged native cue amounts, alongside its launch flash. Legacy charged powers retain their original feedback timing. A rejected pending cannon never flashes, fires later after repair, or emits a deferred firing cue.

`Projectiles.retirePendingNaniteShots(caster, slot = null)` idempotently disposes only this caster's unresolved tagged ordinary projectiles, without splicing an actively iterated list. `cancelHeldSlot` calls it before the deleted-slot early return; `clearSlotFx` handles all pending slots; source retirement cancels before invalidating state. Already committed/traveling energy remains alive. Native disposal returns pooled lights and releases owned materials once. Equivalent form rebuilds preserve capability epoch/integrity and reacquire new views rather than canceling valid pending energy.

## Geometry and charge presentation

- Literal fitted cell OBBs plus the current aperture are checked against cover, interiors, terrain and measured driver-local torso/head/pelvis/neck bounds. Skinned body regions use actual bound source vertices sampled once at figure construction; no per-frame skin-vertex scan is added. Procedural bounds derive from actual driver geometry. OBBs are intentionally conservative; cell edge bevel tolerance remains at most 0.03 × body scale. This is a bounded forearm release guard, not a generic arbitrary-mesh clipping solution.
- `parts.nanites.get(slot).chargeStage` is 0/1/2 and directly drives rendering. `view.vents` is one bounded mesh containing two small nozzle/barrel bands, hidden outside active valid charging. Stage 1 fades those bands closed; stage 2 exposes the compressed native core in front of the actual aperture. Before stage 2, only the nozzle-local native gather is visible. Physical radius/payment stay native. The visible stage-2 radius is capped at 1.5 × fitted barrel half-width; opaque metal remains opacity 1. Existing charge-effect intensity still controls the gather/vent presentation. No full-arm bloom sphere, new light pool, or per-frame impact/audio allocation was added.
- Native player keyboard and pad Guard masks remain authoritative: fresh cannon/toggle inputs are masked without payment; an already-paid player/pad charge retains its ordinary single release/fizzle on entering Guard. Bots retain their existing skipped-busy dispatch; they are not given a new transition-release or guard-fire exception.

## RED → GREEN evidence

1. Initial native group: 7 failures / 1 incidental pass. Reproduced wrong raw right-arm mask, post-input structural denial, unaligned parent forearm, pending shot survival after KO/break/deleted source. Then 8/8 passed.
2. Added six failing physical/ownership cases: actual barrel thin-cover/interior/terrain overlap, moved actual torso volume, behind/inside-body targets, and a mounted weapon without a grip flag. Then 14/14 passed.
3. Added four failing stage/toggle/panel-normal cases; real pad Guard transition already passed. Then 19/19 passed.
4. Actual aperture-interior tiny obstacle and form-rebind/captured-target cases failed and were fixed. The moving source/body matrix initially exposed a Node-only canvas altitude-label fixture omission; replacing only that label with a no-op enabled the real body tests. This fixture error is not counted as a production RED.
5. The required pre-publication five-file regression passed 147 tests (56 Task 2 tests at that point). Three explicit catalog/source-gate assertions then failed before publication and passed after the working cannon entry was added; shield stayed absent.
6. Final additional tests cover material/light idempotence, another caster's lifetime, direct source replacement, missing-panel ordinary Guard, and presentation-only fist speed.

Final focused command, executed from `D:/lsw`:

```text
node --test tools/nanite-emission.test.mjs tools/nanite-state.test.mjs tools/nanite-fit.test.mjs tools/attack-tuning.test.mjs tools/charged-emission.test.mjs tools/charge-energy.test.mjs tools/hand-contention.test.mjs tools/progression-rig.test.mjs tools/firearm-emission.test.mjs
```

**312 tests passed, 0 failed**, 12,062.8864 ms. `nanite-emission.test.mjs` contains 62 cases, including nested motion/template fixtures. Existing material-color warnings occur in legacy fixture paths; no test failed.

```text
npm run build
```

Passed: Vite transformed **279 modules**, built in **7.00 s**. Existing oversized-chunk warning remains; no bundling/dependency scope expansion.

## Coverage boundaries and review handoff

The Node matrix uses real Fighter, native slots/Projectiles, existing two-bone rig and real procedural/male/female source bodies. It covers ground/hover/cruise, moving targets and native recoil at 30/60/120 Hz; both forearms; min/max supported frame/template samples; repeated `_animate(0)` without state/transform drift; clear final finite-sphere center; inside/behind-body and post-pose root-translation rejection; body/cover/interior/terrain obstruction; native cramped-core contact; form reacquisition; finite/infinite/tiny/full/dry accounting; keyboard/pad/bot busy policies; same/opposite-arm ownership; carry/hanging/grab restrictions; KO and source cleanup.

Break tests deliberately call the shared reducer and then the specified native `cancelHeldSlot` seam. They establish reducer/presentation interruption ownership only. **Actual incoming projectile/beam/melee nanite-cell damage and protective shield holes belong to Task 3 and are not claimed.** The private shield toggle/panel pose does not establish protection. Source skin/forearm dimensions remain Task 1's accepted fit contract; this task adds final runtime orientation/obstruction checks.

Parent owns `tools/nanite-cannon-browser.mjs`, isolated native key-input motion evidence, and final visual/feel review. Runtime is frozen for that run. No new screenshots/video were captured by this worker. This report is ready for parent browser/reviewer append; final acceptance awaits those gates.

Skill influence: TDD supplied discriminating native RED tests before each production group; the animation-authoring acceptance matrix required actual forearm axes, body volumes, moving/recoil/zero-time and lifecycle evidence. The Three.js architecture guidance kept simulation state separate from figure-owned bounded rendering and reused native imperative runtime seams. No unavailable TypeScript-era file was invented or engine migration attempted.

## Review correction checkpoint — ledge interruption and firm cannon fist

The independent review reproduced a genuine delayed-release bug: after charging 0.5 s, native grapple physics enters ledge hang, whose `runSlot` early return previously preceded the tagged structural cancellation. One physical pad release edge followed by no-held frames left the orb/audio/preparation stranded; dropping then emitted one live cannon shot without another press. Two new tests failed separately on the stranded preparation and the late shot. The untagged native two-hand charge hang-policy control already passed.

The source-only fix is inside that existing hanging early return in `abilities.js`: a tagged cannon calls the existing `cancelHeldSlot`, records occupied denial and preserves fresh-trigger retry semantics. It neither changes legacy hanging admission nor refunds/re-spends investment. Native pad/Fighter tests verify removed orb/gather, stopped loop exactly once, zero release cues and no live/pending shot after dropping. The reviewer independently repeated the original reproduction and confirmed cancellation with no late shot.

The parent-requested firm fist uses only the active cannon branch in `nanite-pose.js`: its actual hand's native morph scalar is set to the shared closed shape before the existing skin update. No wrist angle, aim math, movement, geometry, global cast style or opposite hand changes. Six new tests initially failed and now cover both sides across procedural/male/female bodies, native source finger matrices, the opposite ordinary open-palm charge, repeated zero-time pose, unresolved launch, cosmetic form rebind, a positive-time recovery frame after launch, and normal same-hand opening after recovery. Source bones are matrix-driven (`matrixAutoUpdate=false`); a preliminary test inspection of `bone.quaternion` was corrected to the actual composed matrix before counting the final six source-shape REDs.

Verification after these corrections:

```text
node --test --test-name-pattern "native ledge|firm native fist" tools/nanite-emission.test.mjs
```

**9 passed, 0 failed**, 1,770.2099 ms. Independent reviewer repeated this same narrow group successfully.

```text
node --test tools/nanite-emission.test.mjs tools/nanite-state.test.mjs tools/nanite-fit.test.mjs tools/attack-tuning.test.mjs tools/charged-emission.test.mjs tools/charge-energy.test.mjs tools/hand-contention.test.mjs tools/progression-rig.test.mjs tools/firearm-emission.test.mjs
```

**321 passed, 0 failed**, 23,726.4858 ms on the final test file (71 emission cases). `npm run build` passed with **279 modules**, **6.99 s**, the same existing chunk-size warning. Production stayed unchanged during both full verification runs; the second run strengthened the explicit positive-time recovery assertion only.

Only the two named runtime branches, the emission test file and this report changed in this correction pass. Task 3 production/public shield publication did not start; contact preparation had not written a test file before the review interruption. Parent owns final corrected browser/visual evidence and its report append. The source-only review reports no remaining scoped Task 2 blocker.

## Final parent acceptance — corrected native moving cannon

Task 2 is accepted as the bounded cannon execution/presentation checkpoint, not complete nanites or final game feel. Independent review cleared the original ledge/pad reproduction and all nine new correction cases; its shared-manager probe also confirmed source-equivalent form identity, caster-scoped unresolved retirement and already-launched survival after KO. Parent separately ran 153 emission/charge/hand/form regressions before the final correction; the worker's final 321-test gate above includes the correction.

Parent ran `tools/nanite-cannon-browser.mjs` against the isolated HMR-disabled server on 5189, leaving the user's 5180 server untouched. Three genuine ORIGIN fixtures use actual `Game.update`, `controlPlayer` and browser-dispatched Q/movement key edges: female scale/bulk .65 mirrored left forearm on a ground strafe; male 1/1 right forearm hovering; procedural scale 1.5/bulk 1.65 right forearm in forward flight. Only target/position setup and camera inspection angles are controlled; native aim, charge accounting, animation, launch, collision and target damage execute unchanged. Bots are disabled for this precision test. This is not AI aiming, an input-latency measurement or a human judgment of feel.

The first partial-charge pass (`artifacts/nanite-cannon/results.json`) passed all three cases: no payment/orb/shot from holding through initial assembly; one fresh paid charge and exactly one current-aperture native release; maximum launch-axis error .013611 degrees, center error zero; 69.08–69.13 target HP loss from native direct plus splash. The inspection framing was too distant on the smallest body and the hold ended before stage 2, so it was not accepted as complete charge-stage imagery.

The corrected full-stage rerun used `LSW_NANITE_LONG=1` after the firm-fist/hang fix. `artifacts/nanite-cannon-stages/results.json` records **three passed cases, zero browser errors**. Each full charge launched physical radius 1.8 and nominal direct damage 64. Final axis errors were .0011366 / .0017072 / .0055002 degrees; all finite-radius center errors were zero. Target HP loss was 106.8302455 / 106.8158287 / 106.7927668, including the existing splash lane, not a claimed 106-HP direct payload.

Parent inspected the native chase frames and closeups at frame 70 (gather), 100 (vents), 145/157 (compressed core); the arm-mounted metal remains opaque/readable and the firing hand now closes without altering the off arm. The closeups are explicitly labeled non-gameplay inspection angles. Source bodies/armor/ground lighting and current gameplay camera were not restyled by this task. The broad movement/aim/multi-actor matrix and subjective visual taste remain later acceptance work.

Artifacts include `artifacts/nanite-cannon-stages/native-cannon-input.webm`, a browser-paced recording containing inspection pauses/camera changes. Its duration is not simulated combat time and it is not an audio-quality or frame-rate proof. Task 3 physical contact and Task 4 portable Studio clocks/authoring remain open; the public shield is still intentionally absent at this checkpoint.

## Short native audio/action capture and test-renderer correction

The default Playwright headless shell on this host reported **SwiftShader**, not the installed GPU. Its initial action recording took 18.5264 wall seconds for 4.4167 simulation seconds, so it is not acceptable real-time feel evidence. A read-only renderer probe verified that the installed full Chromium channel uses **NVIDIA GeForce RTX 4090 / ANGLE D3D11**. The harness now explicitly selects that channel, consistent with [Playwright's documented distinction between headless shell and full Chromium headless](https://playwright.dev/docs/browsers#chromium-new-headless-mode). No browser installation or game rendering/physics change was made.

`LSW_NANITE_REEL=1` records the same actual native forward-flight cannon fixture using canvas capture plus the actual AudioBus master/AudioContext. A fixed 60Hz input simulation is accumulated from RAF time, with timing/drop counts retained. One full native warmup runs before a fresh-life recorded repetition; its first-use cost is explicitly retained rather than hidden. In the final run, warmup was 6.1843 wall seconds / 4.4167 simulated with 1.7188 seconds beyond the capture's capped wall intervals. **First-use stalls remain an open performance/prewarm gate**, not a solved game-performance claim.

The recorded repetition took 4.4685 wall seconds / 4.4167 simulated, with zero dropped wall time, AudioContext running and measured audio peak .417056. Chrome151, Windows, 32 logical processors, visible headless document, DPR1; adaptive canvas changed from 1100×688 to 1280×800. The encoded result is H264/AAC stereo48kHz, 1100×688, **4.421333 seconds**: `artifacts/nanite-cannon-reel/native-cannon-audio.mp4`. Native nominal direct payload64, physical radius1.8, target direct+splash loss106.792766, aperture-axis error .005501 degrees, center errorzero, zero browser errors. The fixture is controlled-target input, not AI or broad performance acceptance. Audio tracks/output were verified; the available model audio-input renderer did not support listening, so no subjective mix approval is claimed. A representative extracted frame was visually inspected and the native media was shown to the user.

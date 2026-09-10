# Braced hand release and flight recovery — September 8, 2026

This continues the active independent-combat objective and the creator's hand-angle/action-footage feedback. It does not claim finished animation, complete clipping clearance, BFP parity or AAA acceptance. Maps, roster art and the gameplay camera were not redesigned.

## Retained behavior

- Native `Game.spawnBeamFor` powers now own an articulated launch. `BeamHose` waits for the final hand/shoulder pose, emitting wrist and visibly opened procedural palm before creating packets, light, voice or sustain payment. Combined beams require both hands; captured launch aim and traveling-hose physics remain authoritative. Generic low-level environmental streams do not require a character animation channel.
- Readiness is measured, not a fixed delay: shoulder-to-hand direction must face the release ray, the palm normal must agree, gathering must subside, and an unoccupied procedural casting hand must open. Imported skin shapes and occupied weapon grips are not forced into the procedural open-palm morph.
- Charged camera punch/shake occurs once at actual emission, not while hands are still gathering. Late energy loss, release, focus loss, guard, hit, freeze, stun and KO can cancel an unfired beam without a release voice, packet or charged camera cue.
- Flight recovery follows the recovering ranged overlay after its channel ends. It no longer follows the much slower generic cast tail through an elbow-in-ribs pose. Physics position and velocity remain unchanged.
- Actual cast writers explicitly stamp ranged/non-ranged pose ownership. Buffs that only spend resources do not steal the previous pose. Native jabs, heavy-charge startup and grabs take ownership; a new non-ranged charge is not treated as old ranged recovery. This is shared runtime behavior, including Studio previews, not an editor-only duplicate.

## Diagnosis and rejected alternatives

The initial KANO probe emitted on frame1 with palms only7.35% open. One shoulder-to-hand ray was nearly perpendicular to its already-fired beam. The new first-packet tests reproduced that defect before the change.

An intermittent cofire test also had invalid geometry assumptions: its cached torso triangles did not follow the deforming waist, and it sampled an invisible forearm driver with `drawRange.count=0`. Phase `4.4688715047124985`, fly/two-hand, frame138 reproduced a stale-triangle false positive. Tests now use the version-aware `trunkProbe`, real connected lower-arm/elbow rows and morphed hand vertices. Both initial phases are explicit, not randomized.

Those stronger tests exposed a real left elbow-fillet crossing during flight recovery at frames177–179. The ranged overlay was below.011 while generic `castPose` remained around.2–.3. A blanket final torso projection cleared intersections but snapped the shoulder by.62rad when the projection ended; it was rejected. Synchronizing only flight recovery clears the measured surfaces and respects the existing12rad/s recovery shoulder/elbow bound. Replacing the generic cast blend globally was also rejected.

A resource-payment ownership heuristic was rejected after review reproduced the clipping again when a paid buff was activated on release. Explicit state-writing ownership fixes that case without treating successful buffs as new poses. The charged camera regression also distinguishes its unique release pair from existing smaller random sustain shakes; it does not disable ambient feedback to obtain a green result.

## Verification

- `tools/hand-beam-startup.test.mjs`:66 cases cover two hand styles, standing/strafing/hovering/cruising/rising/descending at30/60/120Hz, short and stock proportions, sharp/vertical captured aims, cover-adjacent launch, cancellation, late own-turn payment, charge release and actual cast ownership.
- Hand startup plus the expanded native melee file:93/93 pass. The three native ownership tests failed before their writer fixes and pass afterward; paid-buff and charged-camera regressions also demonstrated red→green.
- `tools/concurrent-emitter.test.mjs`:44 cases include20 actual-mesh entry/sustain/recovery combinations. Twelve flying variants check final recovery speed at30/60/120Hz and two deterministic phases. This is not a whole-sequence angular-speed claim.
- Live HUD checks: chest, palm and two-hand all show `ALIGNING` with no packets, then `FIRING`, then `READY` after interrupted preparation. The tested launches take5/8/8 frames at60Hz. No page errors.
- Real F/D/mouse input check: SOL flight toggles, translates about109u, keeps pelvis/travel dot≥.9807 and eye/emission dot≥.999996, then releases and brakes at30/60/120Hz. This specifically verifies SOL's optic/input path, not every native hand-control combination or target-hardware FPS.
- Final all-root run: `node --test --test-reporter=spec --test-reporter-destination=artifacts/hand-beam-startup-complete-pass.log tools/*.test.mjs` reports **1,273 tests, 1,269 pass, 4 fail**, 55.91 seconds, exit 1. The failures are stock31 platform60 (frame127/face144 in torso), tall fixed wall120 (frame95/face0 in cover), short99 platform120 (frame84/face80 in torso), and virtual-sample per-corner wall overconstraint. These are the four retained cloth defects. This broader root-glob scope includes archived prototype/browser-named tests excluded from the earlier palm pass; totals are not an identical-scope comparison.
- Final `npm run build`: exit 0, 259 modules, 16.38 seconds. The existing large-chunk warning remains (studio-profile about4.956MB before gzip). There is no all-green, performance or full-goal claim.

## Directly inspected action evidence

`artifacts/palm-action/braced-final/palm-action.mp4`:16 seconds,1280×800,320 rendered PNG samples at20fps from960 steps at60Hz. Native KANO Wave Cannon travels on the ground and airborne against a scripted orbiting Studio measurement target. First emission occurs at frame100, palms82.65% open, shoulder/ray dots≥.9376; actual recorded damage is505.175 per chapter. Representative first-release, sustain and recovery screenshots were inspected. This is silent, normal-speed Studio-scripted travel with real production contacts, not an AI match, gameplay-camera comparison, continuous-video-playback review or FPS benchmark.

`artifacts/torso-range/braced-final/`:361 states, six phases × four angles. The short, full-width KANO uses the same retained Quaternius CC0 `Jog_Fwd_Loop` source and procedural overlay. Source provenance/hashes remain in `results.json`. Preparation, early emission, quarter-left, mid-front and final recovery were directly inspected: fingers stay up and thumbs inward; no beam at the initial unbraced frame. This is fixed-velocity articulation, not integrated travel.

`artifacts/flight-cast-recovery/`:18 screenshots at six phases/three angles of the exact SOL regression. Frame177-left,180-rear and239-front were inspected. The corrected elbow path is visible; the existing stiff/faceted cape is still visible and is not accepted as finished cloth. The later explicit non-ranged/buff ownership corrections do not change these recordings' beam-only paths.

Reproduce with the running5180 server:

```sh
npm run test:beam-startup
node tools/palm-action-browser.mjs --frames --label=braced-final
node tools/two-hand-clearance-browser.mjs braced-final
node tools/flight-cast-recovery-browser.mjs
```

Game Studio's plain-Three.js/playtest guidance and the animation-authoring acceptance matrix kept this work on the shared production rig and required actual rendered-surface, multi-phase and multi-angle evidence. No new online assets, comic panels or reference code were imported in this pass.

## Remaining acceptance

Paired startup can still project a shoulder about.6rad after the joint limiter (roughly19/36/74rad/s at30/60/120Hz in the captured cofire entry). The recovery speed assertion deliberately begins at the final release, and does not conceal this separate entry gap. The original unseeded hover failure was not independently reproduced; the old stale-triangle/hidden-driver check cannot certify it. Competing same-arm powers, complete custom/armed/skin proportions, unsupported power origins, total anatomical limits, broad glow/target readability, the four cloth cases and creator feel acceptance remain open. The full goal stays active.

# Axial cofire — sustained support repair, September 8

Status: bounded progress, not complete launch/clipping/AAA acceptance. The full creator objective remains active in `INDEPENDENT_COMBAT_ACCEPTANCE.md`.

**Superseded startup status:** the later [turn-to-fire pass](BEAM_STARTUP_PASS.md) repairs the sharp-launch failures documented below. This report preserves the preceding measurements and rejected footage; use the later report and acceptance ledger for current verification.

## Reproduced problem

A fast eye hose and slow chest hose could separate by more than 100 degrees during a reversal. The head stopped at its anatomical limit while its beam kept turning. In stationary flight the root followed the raw cursor instead of the emitting chest, sending the chest beam through a shoulder. The initial Studio sequence measured 22.44 degrees of eye error and 82.64 degrees of chest error. It used the same aim/motion sequence but a randomized starting idle phase; this is not a pixel-matched A/B recording.

## Retained changes

- Hover/braking heading follows actual chest emission, then optic emission when no chest is firing. Movement position, velocity, costs and gameplay camera are unchanged.
- New eye emission can lead a live chest by up to 1 radian, reserving a little space inside the existing 1.05-radian neck cone. This is a reachable-emission constraint; already-fired energy keeps its velocity and traveling hose path.
- Pose prediction and projectile updates share the same steering operation. Each manager step freezes support membership before payment and samples directions after authoritative clash corrections. Reverse update order cannot remove support after the face has already been posed.
- Airborne chest firing uses signed local pitch, including rays behind a nose-down carrier. Whole-body presentation supplies elevation before the existing bounded thoracic correction; the thoracic limit was not enlarged.
- Live chest correction follows its already-steered ray without a second temporal lag. Release still eases back to rest.
- Regression tests now wire the beam-clash fixture to `game.projectiles`, matching the actual game. The KO fixture uses a real rearward reversal to retain its original substantial-correction threshold, capture and respawn assertions.

Independent read-only review caught the depletion and clash-order defects during implementation. Both were reproduced with red tests and corrected. No new assets, copied reference code, map changes or attack definitions ship in this pass. The inspection powers are test fixtures on the SOL rig, not new roster powers.

## Fresh verification

- Broad suite: **960 tests, 950 pass, 10 fail**, 39.67 seconds. Failures are the six newly explicit sharp-launch cases below and four retained cloth cases; no skipped tests.
- The new sustained-cofire file contributes **52 passing checks**: five motion states at 30/60/120 Hz in both insertion orders; actual rendered forearm/fist clearance at three scales; release packets; constrained optic entry; read-only prediction; and energy depletion.
- Chest-channel tests: **29/29**, including actual KO/ragdoll/respawn capture. Beam-clash tests: **20/20**.
- Existing real F/D/mouse flight input passes at 30/60/120 Hz: about 109.4 units traveled, lower-body/travel alignment above .98, optic alignment above .99999, and clean release/braking.
- Existing Studio airborne rehearsal controls pass. The 16.6-second cofire lifecycle still launches the second attack, releases it and recovers. These are existing editor controls, not a new UI built in this pass.
- Build passes: 258 modules, 4.97 seconds; existing oversized-chunk warning remains. Whitespace checks pass apart from Git's informational LF/CRLF notices.

## Inspected motion evidence

`npm run inspect:axial-cofire` records three 300-frame Studio sequences using actual rig articulation and traveling projectiles. Each directory contains seven PNGs, `results.json` and `axial-cofire.webm`:

| Directory under `artifacts/axial-cofire/` | Max eye error | Max chest error | Result |
|---|---:|---:|---|
| `supported-final/` | .929 degrees | .006 degrees | Sustained hover/reversal, flight and chest release |
| `descent-final/` | .929 degrees | .010 degrees | Sustained descent/reversal, flight and release |
| `launch-open-final/` | .929 degrees | 81.29 degrees | **Rejected first chest launch**, settles later |

These are fixed-velocity articulation inspections, not integrated physics, gameplay-camera or FPS evidence. The descent/launch first frames and reversal images were directly inspected. The sharp launch visibly puts a new chest burst beside the body. The torso/head relationship is more coherent during established cofire, but the procedural art, cape silhouette, full shoulder anatomy and shot readability are not approved as AAA.

CPU isolation (`node tools/axial-cofire-cpu.mjs`, `artifacts/axial-cofire/cpu.json`): eight actual posed fighters and sixteen live hoses, 600 measured steps after warmup, i9-14900KF / Node 25.8. Mean **4.14 ms**, p95 **4.58 ms**, maximum **5.16 ms**. No GPU rendering, AI, integrated movement, target damage or HUD is included. This is not full-game performance certification or a comparison against the preceding implementation.

## Explicitly open: sharp first emission

`tools/axial-launch.test.mjs` deliberately remains red, with no `skip`, `todo` or relaxed threshold. At 60 Hz it covers chest joining established eyes and both powers starting together, in hover/ascent/descent. Chest error reaches **90.65 degrees**; simultaneous first-eye error reaches **60.72 degrees**. These are pre-existing startup acceptance gaps, not evidence the sustained repair solves launch.

A proposed stationary upper-carrier shortcut was rejected: the review probe aligned the beam but produced **128.1 degrees of torso-to-pelvis separation**. It was not added to the runtime. The next repair needs an explicit turn-to-fire/reachable-emission startup contract, preserving captured aim and eventual acquisition without redirecting old energy, hiding the shot or widening the spine limit. It must also cover costs, release/interruption, both launch orders, first-packet visibility and the existing zero-steer/final-socket contract.

`npm run test:axial-cofire` includes these launch failures intentionally. The four cloth failures remain recorded in `CLOTH_COMPATIBILITY_PASS.md`. Models, directional animation variety, complete equipment clearance, dense live combat, BFP feel, correspondent presentation and the remaining editor/custom-character requirements remain in the full acceptance ledger.

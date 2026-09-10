# Hand support and rendered-arm clearance — September 8

Status: retained bounded repair, not full animation, clipping or AAA acceptance. The complete objective remains active in [the acceptance ledger](INDEPENDENT_COMBAT_ACCEPTANCE.md).

## What was wrong

The supporting upper body followed raw cursor input while a sustained palm hose and its wrist followed the slower, actually emitted ray. Rapid reversals pulled those layers apart. The source gait's pelvis rotation also added to the aiming correction: limiting the correction alone did not limit the final torso/pelvis twist.

Short custom bodies exposed a second defect. KANO at height .65 retains a broad chest, but its shortened arms cannot reach the common two-hand target without nearly straightening inward through the ribs. The old clearance test inspected hidden forearm driver geometry. The actual continuous elbow fillet also penetrated; this was not merely an invisible-cap failure.

## Retained repair

- Hand casting now participates in emitted-ray support selection, after the existing chest and eye ownership priorities. The body supports the real hose rather than an unrelated cursor heading.
- Upper-body yaw is budgeted relative to the actual animated pelvis. The pose state remains authoritative for the subsequent arm-carrier reconstruction. This is a yaw constraint, not a universal final spine limit: the chest layer can add further articulation.
- A final two-hand shoulder constraint checks the arm's physical radius against the torso loft. It preserves bone lengths and elbow flexion, finds a verified clear shoulder pose, then keeps a clear endpoint through bounded bisection. The wrist is aimed afterward; the beam is not secretly moved to another origin.
- That shoulder candidate must also preserve the existing cover sweep. A reproduced regression showed that body-only correction could move a clear fist into a wall. Both constraints are now tested together.
- Grounded neutral recovery retains clearance after casting weight reaches zero. This does not override authored flight or hover poses, guard, melee or other exclusive pose states.

If neither of the two candidate shoulder directions satisfies both constraints, the solver restores the original pose. It is bounded, not proof that every equipment/body/obstacle combination has a feasible clear pose. Occupied-hand equipment still uses its existing weapon constraints.

Movement physics, gameplay camera, map design, authored flight controls, rig hierarchy, saved profiles and existing traveling-beam behavior are unchanged. Game Studio's Three.js/playtest workflow kept presentation separate from simulation and required real browser checks. The animation-authoring skill required final rendered surfaces and multiple inspected phases/angles, rather than accepting hidden driver geometry.

## Measured improvement and remaining limits

The deterministic diagnostic uses six target reversals over six seconds, real Studio articulation and fixed velocities. It measures final world-space torso/pelvis quaternion separation, including pose layers.

| Case | Before | Retained result |
|---|---:|---:|
| Strafing palm, peak final torso/pelvis turn | 139.92° | 74.28° |
| Flying palm, retained peak | — | 73.19° |
| Strafing chest, retained peak | — | 101.94° |
| Strafing chest/eye cofire, retained peak | — | 104.96° |

The last two rows are explicitly open anatomical issues, not passing results. Additional fast chest/elevation probes also retain ray-support limits. See `artifacts/torso-range/baseline.json` and the fresh `final.json`; `hand-coordinated.json` is an intermediate diagnostic, not the accepted result.

Three attempts to change the common two-hand target were removed after they failed the rendered-volume cases. An overly broad neutral correction also caused five authored-hover failures and changed cloth-entry trajectories. Restricting that correction to grounded states restored those regressions. Neither failed approach is retained.

## Verification

- `npm run test:hand-carrier`: **93/93**. Includes emitted-support ownership, moving palm reversals at 30/60/120 Hz, both real rendered elbow/forearm/fist volumes through short-body paired casts and release, body/cover compatibility, and existing concurrent-emitter coverage.
- Every-frame directional tests now inspect continuous rendered elbow fillets, forearm rows and morph-aware fists against the actual torso triangles. Three body scales and both lateral aim directions are covered; hidden driver caps are no longer the acceptance proxy.
- Fresh broad Node run: **1,149 tests; 1,145 pass; 4 fail; no skips**. It includes `tools/*.test.mjs` except the two archived cloth-prototype suites and the separately browser-backed flight-presentation suite. The retained failures are stock31/platform60 frame127 face144 inside torso; tall/wall120 frame95 face0 inside cover; short99/platform120 frame84 face80 inside torso; and virtual-contact corner overconstraint. The cloth runtime is unchanged.
- Actual F/D/mouse flight inputs pass at 30/60/120 Hz: about 109.4 units traveled, pelvis/travel dot above .9806, eye/ray dot above .999996, clean release and zero remaining speed.
- Actual ground controls pass sprint, moving guard, guard release, takeoff, landing and procedural fallback. Light/heavy punches on the ground and in the air play their source sequences through contact/recovery and release their pose ownership. No page/console errors.
- The actual Studio 16.6-second cofire rehearsal still launches its secondary charged power and recovers. No page errors; no saved character definition changes.
- Fresh dual-trigger browser checks pass wheel-primary and RMB+wheel-secondary attack selection without changing the hero or accidentally firing the selected secondary. Pause ends the held beam, the paired HUD fits its 334px panel at a 960px viewport, and the isolated browser's Studio correspondent setting persists. No page/console errors.
- `npm run build` passes: 259 modules. The existing oversized studio-profile chunk warning remains. No invented TypeScript/Vitest/lint gate is substituted for this JavaScript repository's actual commands.

The independent read-only reviewer found no Critical/Important regression in the bounded shoulder repair. Its additional seeded checks covered 3,600 shoulder poses and inspected actual rendered volumes; it also confirmed the invalid-fallback limitation above. This is not approval of all anatomy, equipment or visual quality.

CPU isolation on an i9-14900KF, Node 25.8.0: eight varied-height KANO rigs and sixteen hoses, 600 measured steps after warmup, **6.20ms mean / 10.08ms p95**. An in-memory counterfactual disabling the new constraint measured 6.25ms / 9.70ms. These runs are too close/noisy to claim a performance improvement. They exclude rendering, AI, integrated physics, contacts and HUD; this is not full-game FPS certification.

## Captured evidence and critical visual review

`npm run inspect:hand-carrier` produces two actual Studio sequences:

- `artifacts/torso-range/pelvis-aware/`: 360 measured palm-turn frames, seven phase screenshots, `results.json`, and `torso-range.webm`. Matched `before/` footage measured 139.92° versus 74.28° after repair. The selected reversal/upward/recovery screenshots were directly inspected.
- `artifacts/torso-range/paired-clearance/`: 361 measured states, screenshots from front/left/right/rear at five phases, `results.json`, and `paired-clearance.webm`. Entry, sustained turns, release and final recovery were inspected, including one sustained phase from all four angles. The .65-height/full-width chest is an intentional stress fixture, not a finished roster design.

The source gait is the retained Quaternius CC0 Universal Animation Library `Jog_Fwd_Loop`; the body and two-hand overlay are procedural. Exact provenance/hashes are in the paired capture's results. No new source assets, comic panels or reference code were imported in this pass. Recorded videos were generated, but continuous playback was not used as an acceptance claim. These are fixed-velocity articulation inspections, not integrated travel, BFP-camera or gameplay-performance evidence.

The screenshots still show a toy-like procedural silhouette, stiff cape, broad glow that can cover the chest/face, and weak paired-hand energy gathering. Most importantly, the two-hand beam can begin while the arms are still transitioning out of the running pose. Hand turn-to-fire/bracing remains open; the earlier eye/chest startup repair does not cover it. These visual defects must not be dismissed because the geometric tests pass.

Next work remains hand startup and gathering, total chest/combined anatomical limits, the four cloth contacts, directional/occupied-hand locomotion, custom-equipment clearance, dense-combat performance, correspondent presentation and creator feel acceptance. The full original goal remains active; this is not 10/10.

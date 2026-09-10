# Casting palms and action preview — September 8, 2026

The subsequent [braced hand-release and flight-recovery pass](HAND_BEAM_STARTUP_PASS.md) contains the latest startup behavior, verification and replacement action footage. Counts and footage below are the historical palm-orientation snapshot.

## Creator feedback and scope

The creator's two attached KANO frames showed open fingers hanging down/sideways. They asked for fingers/thumbs upright and natural, said the rest looked good, and requested action footage. This pass addresses that bounded feedback in the shared game/Studio procedural rig. It does not reinterpret that positive feedback as full-game or AAA acceptance.

Input frames: `C:/WINDOWS/TEMP/codex-clipboard-d0f53b26-ad53-4947-81a8-343dfc75a7ba.png` and `C:/WINDOWS/TEMP/codex-clipboard-4bbc42eb-2e62-4f46-a7ba-ecd8a88a58b8.png`.

## Root cause and retained change

- A ray determines palm direction but leaves wrist roll unspecified. The previous shortest-arc wrist solve consequently let open fingers hang down or sideways.
- Merely rolling that old morphology fingers-up put the thumb on the outside. The corrected casting morphology extends fingers along local +Z, keeps the emission normal at -Y, and keeps each thumb toward the other hand.
- `castingPalmOrientation` builds a right-handed frame from the actual emission normal and final torso up. It transports and rate-limits roll around overhead targets without delaying the palm's ray alignment.
- Ordinary and casting geometries retain identical closed-fist vertices and weapon sockets. Switching occurs through the shared closed fist, with no per-frame geometry rebuild and no extra finger draw calls. Picking up a weapon closes the grip and invalidates its cached cover bounds.
- Non-casting flight/barrier hands and occupied grips retain their original morphology. Imported source skins retain their own hand basis; this is not a source-skin hand repair.
- Both cached geometry variants participate in reference-aware form/decoy retirement. Portrait and spaceflight raw-figure teardown also release the whole pair. Inactive buffers are not hidden in JSON-cloned `userData` and are not abandoned after changing forms.

The global morphology experiment was rejected: Three.js morph-inclusive bounds changed despite identical closed-fist vertices. This altered TITAN's gun retraction and several cloth trajectories. Capturing smaller current-pose bounds also changed the previously tuned trajectories and was rejected. The retained casting-only variant contains the visual change; no cloth-solver change is retained. Independent A/B review confirmed the unused-morph-bound dependency.

## Fresh verification

- Six actual-mesh palm orientation cases first failed with downward finger/up dots around -0.49 to -0.57. They now pass for one-hand/two-hand, standing/strafing/flying, lateral and elevated/depressed aim.
- The expanded ten-test palm file checks visible fingers/thumbs, actual beam direction, overhead continuity, release, shape/bounds continuity, weapon pickup, and source-skin/glide/barrier exemption.
- `npm run test:palm-orientation`: **50/50 pass**. It includes real hand/forearm cover, short-body paired clearance and four raw-figure resource checks. The resource checks first reproduced the inactive-buffer omission, then passed for both active variants and both teardown owners.
- Palm plus progression/resource tests: **28/28 pass**, including both hand variants borrowed by a real hologram across form replacement and fighter disposal.
- Latest broad run: **1,167 tests, 1,162 pass, 5 fail**. Four are the retained cloth cases: stock31 platform60 (frame127/face144/torso), tall fixed wall120 (frame95/face0/cover), short99 platform120 (frame84/face80/torso), and artificial per-corner virtual-contact overconstraint. The fifth is intermittent concurrent palm/optic hover arm-trunk clipping. The preceding1,163-test run had only the four cloth failures, and the isolated three palm movement cases passed afterward; that rerun does not erase the fifth failure. The fixture leaves the initial animation phase randomized, which needs deterministic diagnosis. This is not an all-green suite.
- Broad command: all `tools/**/*.test.mjs` excluding the two explicitly archived cloth prototype files and the browser-only `flight-presentation.test.mjs`, matching the previous baseline scope.
- `npm run build`: **259 modules**, exit0; the existing oversized studio-profile chunk warning remains.
- `git diff --check` reports no whitespace errors. The dirty checkout is preserved; no commit or reset was made.

The independent review found no Important issue in the casting-only containment and verified real cast-to-weapon pickups plus source-skin replacement. Its bounded follow-up checked141 deterministic hover/palm initial phases without reproducing the intermittent cofire crossing. No old/new attribution is justified without a failing phase. The cofire assertion now includes the initial `animT` and first crossing details for the next reproduction; no test threshold, randomization or production pose was changed to make that failure disappear.

## Directly inspected visual evidence

Matched close-up: `artifacts/torso-range/palm-up-contained/`. It contains 361 states and front/left/right/rear screenshots at five phases, plus results and a browser recording. Entry, quarter-front, mid-front, quarter-left/right/rear, release and recovery were directly inspected. The two matching user angles now show fingers upward and thumbs inward. This remains a fixed-velocity articulation inspection, not integrated travel or gameplay-camera acceptance.

Action delivery: `artifacts/palm-action/motion/palm-action.mp4`. Reproduce with `npm run inspect:palm-action` (requires the existing local FFmpeg executable). It contains two eight-second chapters: native KANO Wave Cannon while moving on the ground, then airborne, against an orbiting Studio target. The actual production ability/contact path records **514.25 damage in each chapter**, open emitting palms and closed recovery, with no page errors.

The recording uses 960 steps at 60Hz, sampled to 320 PNG frames, encoded at20fps for exactly16 seconds at1280×800. FFprobe verifies those values. It is **silent, normal-speed Studio-scripted travel with real attack contacts, not an AI match, live gameplay recording, gameplay-camera comparison or target-hardware FPS benchmark**. The scene-only PNG capture omits DOM labels, so this provenance must accompany the video. Representative preparation, firing and recovery frames from both chapters were inspected; continuous video playback is not claimed.

Earlier `palm-action/final/` WebM and `torso-range/palm-up-final/` are intermediate evidence, not the retained normal-speed delivery. Background RAF made the WebM misleadingly slow; the fixed-simulation sample encoding avoids presenting that slowdown as combat feel.

Game Studio and animation-authoring guidance kept this repair on the production rig and required multi-phase/multi-angle review and truthful capture provenance. The gait remains the existing Quaternius CC0 `Jog_Fwd_Loop`; exact source/hash metadata is in the matched capture's `results.json`. No new external assets or reference code were imported.

## Remaining acceptance

Hand startup can still emit before full arm bracing in the direct uncharged inspection fixture. Full gathering choreography, competing same-arm powers, total chest/cofire anatomical limits, the four cloth failures, intermittent hovering cofire arm clipping and broader equipment/custom-rig coverage remain open. The action clip also retains the existing broad beam glow and simple non-reactive measurement target. This is a hand-orientation repair and a concrete action preview, not a claim that all combat, camera, performance or creator feel goals are complete.

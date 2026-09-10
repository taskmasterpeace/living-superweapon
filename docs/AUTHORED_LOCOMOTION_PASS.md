# Licensed ground motion and Studio authoring

2026-09-06 original checkpoint. The [September 7 directional combat pass](DIRECTIONAL_COMBAT_PASS.md) supersedes the original sideways/backward fallback and ranged-cast interruption descriptions below: it retains source gait while shooting, enables hip counterrotation, aligns the visual lower body with travel and derives retreat via reverse playback. No additional source takes were imported.

Implemented slice, not full BFP parity or an overall quality rating. No map, camera calibration, character stats or combat timing changes in this pass.

## What is playable

Open [Character Studio](http://localhost:5180/studio.html?hero=sol). In **Model → Ground movement**, choose **Authored** or **Procedural** locomotion. Under **Motion state**, preview **Ground walk**, **Ground jog** or **Ground sprint**. The measurements name the actual source take and its duration; the ground moves under the fighter in the preview. Pause and scrub to compare phases. Save local, then launch a fresh Play Test to use that choice in the game.

The existing superhero idle, six flight families, guard, melee, weapons and hit reactions keep their state ownership. Moving forward on the ground in PowerWorld and Studio now uses authored walk/jog/sprint articulation, blended according to speed; the legacy isometric animation path is unchanged. Sideways/backward travel retains the procedural fallback. Legacy profiles without a locomotion field default to authored ground motion. Save, undo and JSON profiles/packages carry the selection, not the source binary files.

Blocking and fair-reaction AI are documented separately in [Blocking and bot fairness](BLOCKING_AND_BOT_FAIRNESS.md). Standard-layout block is held C / Mouse4–5; controller L1. The pilot layout retains X. Bots have finite acquisition/reaction and aim rates; this does not guarantee equal matchups across differently powered heroes.

## Asset provenance

The creator's [Universal Animation Library page](https://quaternius.com/packs/universalanimationlibrary.html) identifies the pack as CC0, usable commercially. The page offers free and paid tiers; the advertised full library is **not** a claim that every take is in the downloaded free subset.

The glTF used here came from the [J-Ponzo glTF mirror, pinned commit e24c23cf2a1323488a3faa226ea7ea21f644b73e](https://github.com/J-Ponzo/gltf-universal-animation-library/tree/e24c23cf2a1323488a3faa226ea7ea21f644b73e), not an official creator download endpoint. Source files and the mirror's CC0 license are retained under `assets-src/quaternius/`.

| File | SHA-256 |
|---|---|
| AnimationLibrary_Godot_Standard.gltf | `0ff075c7ad6855c5c2c37a171592ee8f0d6ab2f58259e2be77a9b63dd8027765` |
| AnimationLibrary_Godot_Standard.bin | `6e65377d81558333c4093dbb144a48fd19019343d82b1a3a7992a98ec0e0543c` |
| LICENSE.txt | `a2010f343487d3f7618affe54f789f5487602331c0a8d03f49e9a7c547cf0499` |

The downloaded glTF contains 46 named takes, including `A_TPose`. This pass samples four exact takes:

| Runtime key | Exact take | Duration | Samples at 60 Hz, including interpolation endpoint | Runtime use |
|---|---|---:|---:|---|
| idle | Idle_Loop | 2.5 s | 151 | Banked only; superhero idle retained |
| walk | Walk_Loop | 4/3 s | 81 | Forward walking |
| jog | Jog_Fwd_Loop | 11/12 s | 56 | Forward jogging |
| sprint | Sprint_Loop | 2/3 s | 41 | Forward sprinting |

This original checkpoint wired no combat or flight source takes. The [subsequent light-strike pass](AUTHORED_STRIKE_PASS.md) adds jab/cross and corrects a shared source-bind torso bias. Runtime still loads local generated JSON, not the source mannequin or glTF; there are no gameplay asset network requests or new dependencies. The original 136,321-byte bank/hash `ede33dc94e76d7c3b03f8c56bbef0e52329d3d24c67ca7441d2b10eee74fd009` is historical. The corrected 136,023-byte bank SHA-256 is `19f19e61da27219e4cd54a5d2e449c59976f66c0464da3e2c1ee4e897831bcc7`.

## Retargeting contract and corrections

`npm run ingest:locomotion` uses the real Three.js GLTFLoader and AnimationMixer against the pinned local source. Missing takes throw instead of silently selecting another clip. The source faces +Z. Its anatomical `.R` maps to the target rig's legacy negative-X `L` slots; copying local Euler rotations or rotating the source 180° would be wrong.

Frames store normalized anatomical segment directions, orientation deltas and source foot suspension. The target keeps its own arm and leg lengths. Arms use the existing two-segment reach solver with a source-derived elbow pole. Legs use fixed-length FK, including ankle articulation. The torso uses a frame derived from hip/chest/shoulder positions; one source chest bone's orientation exaggerated the lean and was rejected during visual review.

Source jog has a small endpoint mismatch. Over the last four samples the bake adds the measured endpoint error, then renormalizes directions and applies quaternion correction. It does not ease every terminal pose prematurely toward frame zero; already-closed walk samples remain unchanged. The endpoint is an interpolation sentinel, not an extra frame held by the playback clock.

Source suspension measures both ankles and toes. An ankle-only measure incorrectly classified toe contact as airborne. Target support uses rendered boot/toe bounds, excluding weapons and capes. Correction is visual body offset only; physics root, velocity, facing and collision remain authoritative. This is **not** a full footplant or stride-warp solver for arbitrary superhuman speeds.

Ground motion restores its prior transforms before the normal animation pass, then yields to flight/combat/contact layers. Hitstop freezes phase. State interruptions drop the ground contribution. Form swapping unwinds hit, combat and ground overlays in reverse order before replacing the rig, preventing a run pose or hit reaction from becoming the new permanent bind pose.

## Evidence and acceptance limits

The animation-authoring skill required actual source/target comparison and final rendered-volume checks. That review drove the torso-axis, toe-support, loop-end and interrupted-form fixes. Impeccable/frontend-design kept the new controls in the existing Model inspector and motion transport, preserving draft/history/storage behavior.

Verification at the original ground-motion checkpoint (follow-up current-source gates are recorded in the strike report):

- `npm run test:locomotion`: nine source/runtime tests plus real Studio browser checks pass. Includes 30/60/120 Hz phase consistency, hitstop, fixed limb lengths, SOL/SARGE at three scales, support bounds, flight/guard priority, plain/hit-interrupted form recovery, exact replay, save/reload, Undo and 390px layout.
- `npm run test:poses`, `npm run test:blocking`, `npm run test:combat`: pass. Combat covers 53 roster kits, world 42/42 and a 30-second eight-fighter soak with 1,056 hits, 11 KOs, no invalid states or errors. Blocking includes 18 CPU and 18 live input/contact cases plus Studio defenses.
- `npm run build`: pass, 221 modules. The repository uses JavaScript/Node/browser tests; the animation skill's example TypeScript/Vitest/lint commands do not exist here and were not represented as passing gates.
- Independent code review found and reproduced the form-swap contamination, then verified both the plain and hit-interrupted fixes. Additional progression-rig regressions passed.
- Final combined source/motion, geometry, progression-rig, package and profile refresh: 81/81 pass, including the all-roster saved-profile pose browser.
- `tools/ground-live-check.mjs`: real W input moves the PowerWorld fighter about 37 units and engages `Sprint_Loop`; C takes ownership while moving; release resumes locomotion; Space reaches about 31.5 units altitude with the ground channel disabled. Procedural selection also remains playable. No page/console errors. This is now included in `test:locomotion`; results are in `artifacts/locomotion/live-results.json`.

`tools/ground-motion-review.mjs` captures the actual source skin next to the production SOL rig at 0/25/50/75/end/two cycles, moving side/three-quarter views and armed SARGE front/both profiles/rear. Source materials are neutralized only in this inspection scene; the downloaded asset is unchanged. `artifacts/locomotion/review-results.json` records actual sampled phase (60 Hz quantization means jog quarter-points are approximate). Studio results are in `artifacts/locomotion/studio-results.json`.

These are custom inspection cameras, **not BFP camera-match evidence**. The recorded fixed-step browser sequence is motion-review material, not a foreground frame-rate benchmark or a substitute for real-time player feel testing. The target is a stylized procedural body with different proportions from the source, not a skin-identical transfer. Weapon mounts were inspected, but dedicated rifle/shield-carry run clips are still absent.

The original completed comparison run reported zero page/console errors. Side and three-quarter views show alternating stride and bent elbows; weapon-bearing SARGE retains hand attachments from both profiles. Original checkpoint recording: `artifacts/locomotion/page@b95a280cda65a93ff789fe48b8719aa5.webm`. The corrected-core refresh is `artifacts/locomotion/page@069a3168ec968f62efdfa6dd7e56bdd2.webm`, completed September 7 with zero errors. Earlier recordings remain historical artifacts, including an interrupted capture invalidated by a development-page reload; use the corrected-core recording for current geometry.

## Researched but not integrated

- [Quaternius Universal Animation Library 2](https://quaternius.com/packs/universalanimationlibrary2.html): CC0 library with melee/armed and traversal actions. Its full and free tiers must be distinguished. No files from this pack were downloaded or wired here.
- [Mixamo official FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html): Adobe describes free-account access and royalty-free use in games. It is not CC0; the FAQ does not settle raw animation redistribution inside a portable asset pack. No account access, upload or download occurred.
- [pmndrs/ecctrl](https://github.com/pmndrs/ecctrl): MIT controller reference built around React Three Fiber and Rapier. It is not a drop-in replacement for this vanilla Three.js engine's existing flight/combat physics. It was researched, not installed; no broad controller migration was attempted.

The [BFP community reconstruction's movement code](https://github.com/LegendaryGuard/BFP/blob/ef6d50c454454c7e1c13e54ed17c1a213a3231f9/source/game/bg_pmove.c) has explicit ground, forward/backward flight and fly-idle animation choices, with melee taking priority. This supports the state-ownership approach as an engineering inference; it is not recovered original source or proof that these new timings match BFP. No BFP code/assets were copied.

## Remaining work

Arbitrary GLB/FBX animation import UI, binary asset-backed packages, authored heavy/grab/flight clips, eight-direction ground coverage and speed-aware foot locking remain open. The follow-up now integrates authored jab/cross; blocking, heavy/grab and flight remain production procedural animation. The banks establish a reproducible ingestion path; they do not by themselves finish character art, gameplay feel, BFP rules or multiplayer verification.

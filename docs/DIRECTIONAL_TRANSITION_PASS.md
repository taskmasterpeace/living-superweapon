# Grounded aim transition — September 7, 2026

The existing source gait and layered shoulder/head/weapon aiming remain the production path. This bounded correction stabilizes the choice between advancing and retreating while a grounded fighter tracks an oblique target.

## Reproduced fault and correction

With fixed forward velocity `(0, 0, 14)`, a 120° aim settled the displayed lower body at 0.694 radians; 121° aim selected π radians. The stateless branch therefore turned a one-degree target correction into a roughly 140-degree leg-heading change. Repeated mouse movement across that boundary repeatedly turned the legs and reversed source playback.

`groundHeading` now retains the advance/retreat choice through an 18° band: a continuing advance switches above 129.6°, and a continuing retreat switches back below 111.6°. The initial choice still uses the prior 120.6° boundary. Guard, exclusive actions, air, stopped movement and a replaced rig reset that history. Simulation velocity, aim, collision, turning response and source clips are unchanged.

`tools/directional-transition.test.mjs` failed on all four original palm-cast boundary cases before the correction. The expanded nine-case suite also dispatches SARGE's actual rifle, checks the attached weapon's target line, keeps the source gait active, and confirms intentional 160° retreat and 80° return still select reverse/forward playback. The test fixes travel after real rifle recoil to isolate presentation from acceleration.

`tools/directional-arm-transition.test.mjs` separately measures both rendered forearms and hands against the actual closed torso mesh on every frame through 1.5 seconds of beam entry and 1.5 seconds of exit, moving left and right. Both cases already pass. This is a bounded characterization of the existing final interpolation, not a second corrected defect or proof that every body/equipment combination is clear.

## Source and acceptance evidence

The retained CC0 source is `assets-src/quaternius/AnimationLibrary_Godot_Standard.gltf`, take `Jog_Fwd_Loop` (11/12 seconds, 56 samples including its interpolation endpoint). Walk and sprint remain the same source-backed blended takes described in [the locomotion report](AUTHORED_LOCOMOTION_PASS.md). No animation bank changed.

Existing source/target jog comparisons at start, quarter, half, three-quarter and wrap were inspected in `artifacts/locomotion/`, along with armed SARGE and moving KANO cast views. The acceptance rows are locomotion loop, weapon contact, and transition/interruption. The fresh `artifacts/directional-transition/moving-fire.webm` records KANO and SARGE using real abilities while aim crosses 119–123 degrees. Its neutral inspection camera and fixed travel velocity isolate animation; this is not BFP gameplay-camera or physics evidence. Separate `tools/directional-live-check.mjs` verification moves the real fighters: SOL travels 11.31 units and SARGE 49.40, emitter alignment stays above 0.9999, both recover, and no page/console errors occur.

Fresh integrated Node verification: 122 checks pass across this correction, retained directional/ground motion, weapon clearance, emitter poses/contact, input selection and the correspondent. Scoped JavaScript syntax checks pass. The repository uses JavaScript and Node's test runner; it has no TypeScript, Vitest or lint gate configured. See [the integrated report](DUAL_TRIGGER_AND_CORRESPONDENT.md) for build and browser evidence.

A follow-up visual concern about raised boots was measured before changing the gait: firing and non-firing copies of KANO/SARGE had identical boot heights over 179 frames. Source contact frames sit about 0.064–0.094 units above the floor; jog suspension is intentionally higher. No artificial all-frame ground clamp was introduced to erase that airborne part of the run cycle.

## Licensed assets and controller fit

Primary sources checked September 7, 2026. The fit judgments below follow from this engine's existing flat-FK rig, source ingest and physics ownership; they are engineering assessments rather than upstream compatibility guarantees.

| Candidate | License and actual fit |
|---|---|
| [Quaternius Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html) | Creator identifies CC0 and FBX/GLB/Blend formats. Best immediate fit: this project already ingests its humanoid source. The full catalog advertises eight-direction locomotion and gun actions, but the retained 46-take file contains only forward locomotion plus pistol aim/idle/shoot/reload; it has no dedicated rifle carry or directional strafe takes. Full catalog coverage is not installed coverage. |
| [Quaternius Universal Animation Library 2](https://quaternius.com/packs/universalanimationlibrary2.html) | Creator identifies CC0, a humanoid rig, GLB/FBX/Blend and armed/melee combos with recoveries. A candidate for authored weapon-specific entries and exits through the existing ingest seam. The free subset and full/source tiers differ; no files from this second pack were downloaded or tested here. |
| [Mixamo](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html) | Adobe describes free-account access and royalty-free game use. It is not CC0. A possible source for specific humanoid actions, requiring local retargeting and contact review. The FAQ does not establish permission to redistribute raw clips as a portable asset library, so it is not selected for that purpose. |
| [three-player-controller](https://github.com/hh-hang/three-player-controller) | [MIT](https://raw.githubusercontent.com/hh-hang/three-player-controller/master/LICENSE), plain Three.js with BVH collision, configurable animation sets and a foot-IK export. Its [package](https://raw.githubusercontent.com/hh-hang/three-player-controller/master/package.json) declares Three.js ≥0.159, encompassing the project's 0.169 version. Useful controller/foot-contact reference, but it owns camera and motion and requires `three-mesh-bvh`; adopting it wholesale would conflict with this engine's existing simulation. No install or runtime migration. |
| [Official Three.js Rapier controller example](https://github.com/mrdoob/three.js/blob/dev/examples/physics_rapier_character_controller.html) | Three.js code is [MIT](https://raw.githubusercontent.com/mrdoob/three.js/dev/LICENSE); Rapier is [Apache-2.0](https://raw.githubusercontent.com/dimforge/rapier/master/LICENSE). [Rapier's controller](https://rapier.rs/docs/user_guides/javascript/character_controller/) supplies collision-aware translation and grounding, not superhero animation quality. Compatible with plain Three.js as a separate physics design, but unnecessary for this presentation correction. |

For future source expansion, keep the existing ingest and final hand-contact layer. Prefer licensed humanoid GLB inputs, normalized units and named joints; preserve source provenance and sample the whole clip before wiring it. [Three.js SkeletonUtils](https://threejs.org/docs/pages/module-SkeletonUtils.html) expects skeleton-bearing targets for retargeting. This project's flat-FK drivers therefore still need its current anatomical adapter, even when a source arrives as GLB. The Game Studio asset pipeline informed the format/normalization assessment; it did not justify replacing working physics or shipping untested assets.

Remaining quality work includes authored eight-direction and occupied-hand carries, broader equipment clearance, stride/foot locking, and creator playtest judgment. These assets and tests alone do not establish AAA finish or BFP timing parity.

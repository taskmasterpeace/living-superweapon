# Point-blank flying beam — local checkpoint

The full goal is active, not complete. Previous turn made progress with the authoring-branch brief and stowed sidearm correction. This round resumes the creator's highest-priority beam reliability/flight-pose work. No authoring-branch files, maps, camera settings or aircraft systems were changed.

## Cause and correction

At a close captured point, the two-hand cast used its normal fixed extension and spacing. During flight this could put the palms beyond the target. Launch readiness correctly refused the backward-facing arm geometry, leaving the beam pending.

The two-hand pose now detects a target within its normal extension and folds the elbows. Each shoulder converges toward the nearby point, stopping short of it; distant casts keep the existing authored stance. Gameplay position/velocity and the beam's readiness thresholds are unchanged. Existing cover and torso constraints still run after articulation.

## Red/green evidence

- Added 4-unit target cases at 30/60/120 Hz. The three flying cases failed before the correction; all 18 standing/flying 4/8/12-unit launch tests pass afterward.
- Expanded to body scales 0.65/1/1.5 with actual rendered hand and forearm vertices tested against the torso through charge, release and recovery. The first midpoint-based retraction still delayed the small rig; per-shoulder convergence resolved that failure. All three scale tests pass without relaxing assertions.
- `node tools/beam-launch-range-probe.mjs`: 36 fixed-root production cases, zero stranded (previously one).
- 211 startup, flight-split aim, independent-hand and close-launch tests passed. A separate 110-test close-launch/form/contact/interception/clash suite passed (overlapping tests; do not add these counts).
- Production build passed, 369 modules / 11.69 seconds. Existing large shared-chunk warning remains. Whitespace check passed.

## Motion and native evidence

`artifacts/beam-pointblank-inspection-final` contains a staged production KANO rig sequence at all three scales, quarter/transition frames, four viewing angles, and `pointblank-inspection.webm`. Actual ability charge/release, pose solve and projectile update run at 60 Hz; the root is intentionally fixed while velocity selects the flight pose. A red marker is the target, not an enemy. All three release and cancellation checks passed without page errors.

Retained initial capture `artifacts/beam-pointblank-inspection` exposed a harness error: setting guard pose flags did not invoke the controller's attack cancellation. It is not accepted as interruption evidence. The final harness calls the real `cancelHeldAttacks` path and asserts the beam is no longer sustaining. Final recovery was visually inspected and no longer shows an active beam.

`artifacts/beam-pointblank-native-flight-regression/native-flight-release.webm` records normal KANO Practice startup, takeoff, movement, upward aim, charge/fire while strafing, release and recovery. No actor, pose, resource or simulation overrides. The player reached approximately 53.65 game units/second while firing upward; input release retired the beam and movement release decelerated. No page/runtime errors. Captured at 1600x900; not a performance benchmark and not a close enemy-contact test.

Parent self-review inspected charge, release, sustain and recovery images plus side views. Arms fold toward the close point and beam emission occurs; the model/material style remains below the realistic target, palms can frame/obscure the face at this steep close angle, and bright source glow limits fine clearance inspection. No final judge score or 10/10 claim. Automated torso checks are not proof of every limb-to-limb/head collision.

The animation skill's TypeScript project paths and test commands do not match this JavaScript repository. Production procedural pose/rig and the existing Node tests were used; no imported mocap/source-clip approval is claimed.

## Remaining gates

Native close passes against live opponents, controlled beam-guard comparisons, sustained target readability, broader body/pose extremes, and representative mixed-combat performance remain to verify. The sound harness, nine-gun inventory, staged speed and other full-goal systems remain unfinished. Latest changes are committed locally only; the previously published release has not been redeployed. Next priority is native beam contact/guard verification, followed by fixing the highest-impact observed mismatch. All owned test and capture processes finished.

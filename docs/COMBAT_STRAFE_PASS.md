# Combat strafe and frame continuity

## What changed

Sideways flight previously selected the forward flight target and rolled the body almost
horizontal. A small longitudinal velocity crossing -2 units/second also switched entire
authored poses: the settled joint discontinuity measured 1.238 radians (about 71 degrees).

Open-sky flight now blends explicit left/right combat strafes with longitudinal poses.
Strafing stays upright with a modest bank, bent knees, ready arms, and a head facing the
fight. Lateral weight uses total 3D speed; a smooth retreat weight replaces binary
backward ownership. Tiny drift during ascent/descent therefore cannot flip the body or
joints. Existing combat aiming retains final authority over hands, weapons, and emitters.
Presentation never translates the simulation root. City behavior remains on its existing
direction rule. No map, roster data, or ability balance was edited for this pass.

Studio exposes both states in the pose inspector and the deterministic eight-second
preview cycle. Profiles now contain seven states. Older five-state version-one profiles
are completed in memory without mutating their stored record or existing authored poses;
load, apply, save, and import consume that completed profile.

## A real rendering defect found by watching the result

The initial movement recording contained a black retreat frame despite clean camera
metrics. The adaptive-quality governor resized the canvas after `composer.render`, erasing
the image it had just drawn. All four adjacent quality transitions reproduced the defect:
the event order was draw/resize and framebuffer samples were RGBA 0/0/0/0.

Quality changes now finish before the composer draws. The print-effect clock still ticks
after rendering, preserving one-frame impact effects. The same regression now observes
resize/draw and opaque, colored scene pixels on all four transitions. Thresholds, cooldowns,
and quality-tier policy did not change. A bounded independent source review found no issue.

## Verification

- `tools/strafe-flight-check.mjs`: baseline failed upright/head-facing criteria; new targets
  passed 30 near-sideways cases at 30/60/144 Hz, both signs, and both sides of the old threshold.
  Minimum body-up dot is 0.9574, minimum head-forward dot 0.9950; threshold joint difference
  is now 0.000261 radians. Two full circular direction loops retain finite limb surfaces,
  continuous joints/body rotation, and zero simulation-root displacement.
- Lateral and longitudinal tiny-drift regressions during vertical flight both failed during
  development and passed after the continuous 3D weights. The old test requiring head-first
  sideways flight was explicitly replaced with upright banked combat-strafe expectations.
- Full `npm run test:flight`, `npm run test:poses`, and `npm run test:studio` passed after the
  strafe/profile changes. Studio includes real edits, save/reload, deterministic seek,
  import/export, 53-hero default-profile equivalence across seven states, and live encounters.
- After the render-order fix, full `npm run test:camera` passed, including the new four-tier
  transition regression, 45 free-aim timing cases, actual pointer input and beam damage,
  vertical/close targets, moving crossings, lock release, 318 free-aim clearance cases,
  HUD and comic-effect visibility. Production build passed (205 modules, 4.22 seconds).
- Independent bounded strafe/profile review found no remaining important issue after the
  vertical-drift correction. These reviews are not full-game visual acceptance.

## Visual evidence and limits

`artifacts/flight-review/combat-strafe/` contains before/after four-view stills and numeric
results. The final movement evidence is `combat-strafe-verified.mp4`, generated from
`motion-verified/frame-*.png`: 210 frames, 20 fps, 1280x720, 10.5 seconds. It uses actual
movement-key events, real Game.update/physics/camera, and a scripted stationary sparring
partner. The fighter is a factory-built local KANO rifle variant used to exercise modular
weapon attachment; it does not modify the shipped roster or replace his power kit. The
recording includes left/right strafe, reversal, braking, retreat, charge, and beam release.
All 210 frames passed scene-pixel checks while adaptive quality traversed tiers 2/1/0.
Representative strafe, retreat, charge, and beam frames were visually inspected.

Earlier `motion` and `motion-final` captures are diagnostic, not acceptance media: the
former has stale fixture HUD labels; the latter exposed the now-fixed black frame.

Reference provenance remains in `docs/reference/BFP_CAMERA_AND_POSE_SOURCES.md`. These are
original procedural poses informed by reference silhouette, not imported BFP animation.
A still image cannot establish strafe timing, and reconstructed camera C code does not
contain authored joint angles. The animation-authoring skill influenced real-rig,
multi-view and temporal verification. Its War World TypeScript rig/ingest/test paths do
not exist in this JavaScript project, so its specific TS acceptance gates were not run.

The game is not visually complete or rated AAA/10 out of 10. Shoulder/hip integration,
costume volume/material quality, richer weapon handling, extreme-speed camera behavior,
and the overall combat feel remain open. Passing bounded visibility tests is not a
substitute for user playtesting or a source-to-target motion comparison.

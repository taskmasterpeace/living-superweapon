# Shoulder continuity and head-cover attachment

## Changes

The old isolated deltoid spheres left visible background between broad torsos and
raised upper arms. `ShoulderSurface` now follows both final drivers with a closed,
deforming garment volume. It replaces the old two shoulder draws with two draws;
the pair adds 144 triangles relative to those old spheres. Existing arm child
indices, weapons, body sockets and ragdoll drivers remain unchanged. The geometry
uses the existing deforming-mesh flag, so decoys own their snapshots.

The first shape was visibly too bulbous and was rejected. The refined surface uses
a positive-definite ellipsoid deformation in a stable chest-space basis. A
projected-axis implementation popped during a reproducible ragdoll crossing; the
replacement has no orientation-basis switch. Seven actual-rig tests cover broad
frames, raised arms, flight/hit ownership, all 53 roster ragdolls, normals,
idempotence, synthetic axis crossing and the exact failing ragdoll seed. The
synthetic crossing reproduced a 0.531-unit vertex jump before correction.
Independent review also exercised 80 seeds of 360 ragdoll frames and found no
independent shoulder jump after correction.

## Defect found in screenshots

The boost profile exposed skin through the crown despite passing numeric pose
checks. The cowl copied head rotation around a different pivot: its authored
0.1-unit offset was not rotating with the head. Ragdolls also discarded that offset.
`syncHeadCover` now preserves the offset in head-local space after the last head
animation owner and during ragdoll apply/restore, without reparenting either mesh.
Four regression tests failed before the fix and passed afterward, including nine
crown rays across three body/head proportions and hit/ragdoll/recovery transforms.
Independent source review found no remaining scoped issue.

## Verification and evidence

- After the final shoulder implementation: full pose and Studio suites passed,
  including editor edit/undo/save/reload/import/export, ORIGIN integration, real
  beam/elevation/seek cases and four deterministic moving encounters.
- After the head fix: 34 model/limb/shoulder/head Node tests, full flight and pose
  suites, targeted Studio combat (nine cases), and production build passed.
- Final 24 armed multi-view stills: `artifacts/flight-review/shoulder-surface/verified`.
- Final 180-frame sequence: `artifacts/flight-review/shoulder-surface/motion-verified`.
  `shoulder-head-verified.mp4` is 9 seconds, 20 fps, 770x662 including even-pixel
  encoder padding. Start, boost, two ragdoll points and recovery were visually inspected.
- The reel uses production Fighter/Ragdoll with scripted velocity and a local
  factory-built right-hand rifle variant. It is not player-input or AI combat evidence.

The animation-authoring skill influenced real-driver, multi-view and temporal
verification. Its TypeScript rig/ingest paths do not exist in this JavaScript
repository; those specific gates were not run. This is not full animation approval.

## Critical remaining gaps

These are overlapping procedural surfaces, not a single skinned anatomical body.
The screenshots still show flat triangular torsos, obvious hip caps, simple faces,
blocky weapon handling, and weak ragdoll anatomy. Shoulder and scalp correctness
does not make the characters production-quality or the game AAA. No map, roster
source, combat balance or power behavior changed in this body pass.

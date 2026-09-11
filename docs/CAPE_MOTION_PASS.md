# Cape drape and directional motion

September 6, 2026. Shared procedural rig follow-up, not an imported animation.
Scope: cape construction/binding in `figure.js` and `hero-rig.js`, with the
production velocity supplied by `Fighter._animate`. No map, physics, aim,
damage, roster, camera or joint targets changed.

## Evidence and intent

The previous eight-second flight capture showed a flat cape hanging through
SOL's torso and belt. A controlled real-Fighter sequence reproduced it at
hover, acceleration, bank, braking and recovery. Baseline images and vertex
samples live in `artifacts/flight-review/cape/before/`.

The old function received scalar speed only. Its sine phase multiplied speed
by total animation time, so even a 0.1u/s speed change late in a match displaced
cloth by 0.377 units in a single 60Hz interval. Four tests failed before edits:
missing folded volume, the seam buried in a bulk-scaled torso, missing lateral
trailing, and the late-time flutter jump.

## Shared implementation

- The seam sits behind the framed torso and remains parented to that driven
  mesh, preserving the existing ragdoll attachment contract.
- A modestly subdivided single mesh supplies crosswise folds, a gently flared
  drape, softened hem and travelling flutter. It remains one material/draw.
- The final posed cape carrier transforms world airflow into cloth-local space.
  A length-stepped centerline bends downstream. A conservative garment envelope
  keeps it behind/below the shoulder instead of flipping through the head.
- Speed changes amplitude, not phase. Deformation is recomputed from rest data;
  repeated Studio seeks cannot accumulate vertex drift.
- Flutter harmonics share the editor's eight-second period, so its clock wrap
  does not reset cloth phase. Culling spheres and already-cached boxes follow
  the deformed surface.

Independent review caught two additional defects. Studio-valid small/tall
frames put the old seam 1.491 units above or 1.960 units below the shoulder.
Binding in torso-local space now scales the entire garment with the body.
Recoil was also applied after cloth deformation; an actual Fighter regression
measured a 0.412-unit discrepancy from the final carrier. Cloth now runs after
hit reaction, while offensive fist-speed measurement remains before recoil.
Both findings and the cached-box/loop-wrap cases have RED-to-GREEN regressions.

This is an authored procedural garment envelope, not a self-colliding cloth
solver. Inertia, limb/ground contact and a complete cloth material treatment
remain limitations. It must not be sold as AAA-quality cloth or original BFP
animation fidelity.

## Review method

The animation-authoring skill's TypeScript rig/ingest/client paths and
tsc/Vitest/lint setup are absent in this JavaScript repo. Equivalent evidence
comes from the actual `figure`, `Fighter._animate`, production flight tests,
Studio and Vite build. No imported clip identity or source comparison is implied.

`tools/cape-motion-reel.mjs` records 160 samples at 20fps through an authored
velocity sweep with a fixed review root/camera. Source and target phases 0,
25%, 50%, 75% and end are inspected. A separate real-input flight capture is
required for gameplay context; a fixed-root rig reel alone cannot establish feel.

`tools/cape-motion.test.mjs` is included in `npm run test:flight` and checks
deformed geometry, attachment, direction, timing, deterministic seek and bounds.
The full-game goal remains open; this document records a bounded improvement.

## Final-source gates

- Ten cape tests pass, including a real Fighter hit-reaction integration case.
- Full `npm run test:flight` passes: live inputs, takeoff/hover, posture/camera
  contracts and all 53 roster rigs through flight, KO and recovery.
- Full `npm run test:studio` passes: 25 model/profile tests, editor history and
  persistence, ORIGIN integration, nine beam/elevation/seek/recovery cases,
  four moving encounters and three layouts, with no page errors.
- `camera-crossing-check.mjs --hero=sol` passes 30 cases; ordinary mirrored
  70u/s fly-bys have zero measured target-center occlusion or body cropping.
- `vertical-camera-check.mjs` passes 44 static locks, six pole-crossing runs,
  72 translating fights and rendered visibility checks. The larger garment
  does not fail the existing target-visibility gates.
- `npm run build` passes (203 modules); scoped diff validation passes.
- Independent review accepted the corrected bounded implementation, with no
  outstanding findings. This is not a whole-game readiness assessment.

Final procedural rig media: `artifacts/flight-review/cape/cape-rig.mp4`, eight
seconds, 1280x720, 20fps, 160 frames. The underlying target sequence records no
page errors. Start/quarter/mid/three-quarter/end frames were visually compared
with the baseline. Hover and braking now show folded cloth instead of torso
and belt geometry poking through a flat rectangle; high-speed drape remains
deliberately constrained, not a simulated fabric sheet.

Gameplay context: `artifacts/flight-review/cape/flight-motion.mp4`, eight seconds,
1280x720, 24fps, 192 frames, captured through real takeoff/movement/boost/brake
inputs and the production chase camera. Frames 0, 36, 72, 96, 120, 144 and 191
were inspected. Flight trailing and bank response are visible; rear hover still
reads flatter than the three-quarter view under the print treatment. That
material/readability limitation remains open, along with the broader combat
and camera feel goal. No map redesign was used to disguise it.

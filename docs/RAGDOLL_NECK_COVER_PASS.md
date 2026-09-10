# Neck and cover contact — bounded repair, cloth still WIP

Historical snapshot: `RAGDOLL_SHOULDER_ISLAND_PASS.md` now supersedes this report's
test counts and capture with the shoulder/final-contact follow-up. Full goal and
cloth acceptance remain open.

The complete independent superhero-combat brief remains active. This follow-up
does not certify AAA quality, complete clipping clearance, or the full BFP goal.

## Reproduced causes and changes

1. Distance-only neck braces let a large head fold through the sewn cape row.
   The initial new test failed at frame 119. A captured-frame angular limit
   cleared that fixture, but independent review found additional shipped and
   custom-character failures. The final neck constraint also derives a separating
   plane from the **actual captured head vertices and sewn shoulder row**, follows
   the moving chest, and evaluates the head's current support. It preserves the
   no-step entry pose and does not move the cape's attachments. Review caught
   a 64% neck-extension regression in the first plane projection. The final
   correction instead searches angularly toward the captured safe direction on
   a fixed-radius sphere, preserving the captured neck length. The new real
   240-frame wall test failed at frame 117 before that correction and now passes.
2. Cover collision used fixed core-point radii, letting the attached cape enter a
   wall at frame 46 and the rigid core enter a platform at frame 114. Cover support
   now measures scaled, rotated core geometry and the sewn cape row.
3. Later shoulder/hip corrections could rotate the chest back into a cleared
   wall: review measured another 18.78 degrees of rotation in the short/broad
   fixture. Final contact now checks the completed orientation and translates the
   entire physical skeleton together. This preserves neck/brace orientation
   instead of moving just one anchor and invalidating another contact.
4. Adjacent cloth triangles could choose opposite faces of a thin wall. Static
   cover surface contact now prefers each triangle's last displayed safe side.
   The original thin-wall surface test passes with this and the core repairs.

The changes run through the shared production rig/ragdoll path in both Studio
and gameplay. There are no new meshes, draw calls, dependencies, saved-profile
changes, camera changes or map changes. Contact bounds and skeleton point lists
are reused; this is not a second gameplay state model.

## Verification

- New/expanded neck and core-contact tests: **11 passed** after observing the
  original failures. They include stock SOL/STORMCALL, tall/broad SOL, a small
  body with a large head, and short/broad wall/platform contact. The complete
  object matrices are updated before geometric assertions.
- Broad Node regression: **715 tests, 714 passed, 1 failed**, exit 1. This is the
  current result, superseding the preceding 706/702/4 snapshot.
- Remaining cloth failure: settled cloth continues updating/uploading after
  the body sleeps. The head, thin-wall and raised-platform cases now pass.
  All tests are retained and unrelaxed.
- Fresh handoff/contact/surface suite: **57/57 passed**. Fresh Studio-profile
  suite: **18/18 passed**, including untouched-profile flight-joint preservation
  across the shipped roster.
- Fresh build: Vite 5.4.21, 256 modules, exit 0. Existing large-chunk warning
  remains (shared Studio profile bundle approximately 4.93 MB / 1.75 MB gzip).
  Syntax checks passed for the three touched contact/cloth modules.
- Fresh real-input sideways-fire check: SOL moved 50.91 units while eye-beaming;
  SARGE moved 49.40 while firing. Both recovered on release, minimum source
  alignment was 0.999995 / 0.999999, and browser errors were empty. This check
  steps input/simulation with rendering disabled; it is not a real-time FPS test.
- Increasing relaxation iterations to 10 and 16 did not fix settling in
  read-only diagnostic runs. Alternative contact-velocity and body-side
  experiments also failed to establish a repair and were removed. No larger
  iteration count or relaxed sleep threshold is shipped as a claimed fix.
  A final-source one-second trajectory-envelope diagnostic measured persistent
  maximum cloth excursions around 0.103–0.108 units after the body slept; this is
  unresolved repeated motion, not a validated settled garment.

The first review correctly rejected the fixed angular cap and mid-iteration
cover support, and the next review caught neck extension. Those failures were
added to the implementation tests. Final independent review accepted this
**neck/core scope**: 30 focused tests and a 45-fixture / 10,800-frame contact sweep
passed; maximum neck-length ratio was 1.0000000000000058 and no-step transform
error was 1.78e-15. That matrix isolated cosmetic cloth updates while exercising
real core physics and poses; it is not cloth or full-game visual approval.

## Visual assessment and remaining work

The intermediate `artifacts/ragdoll-neck-cover/contact-review/` recording contains
602 inspection states with no browser errors, but predates the final geometry-
aware neck and completed-pose contact corrections. It must not be used as final
acceptance. Inspection showed better head placement but sharp cloth folds and
unfinished body presentation; it was not rated AAA.

The current capture is
`artifacts/ragdoll-neck-fixed-length/work-in-progress/`: **602 states, no browser
errors**. The prior `ragdoll-neck-cover-final` capture predates the fixed-length
repair and is historical. The latest SOL mid-fall and terminal images were
inspected: cape folds still need work. The footage is a silent, stepped
production-rig inspection, not a gameplay-camera comparison or real-time FPS
benchmark. No saved character/editor state is changed by the capture.

Cloth self-collision, persistent shared-surface contact, sleep/settling, complete
gear/limb clearance, constrained spaces with multiple covers, sloping terrain,
and target-hardware performance remain open. A separating plane is a conservative
neck/seam constraint, not complete anatomical self-collision. The final island
contact pass is bounded, not a proof that every custom body can fit any corridor.
The full attack-origin/movement matrix and creator feel acceptance remain open in
`INDEPENDENT_COMBAT_ACCEPTANCE.md`.

Game Studio's multi-phase visual checks and the animation-authoring acceptance
matrix kept this pass focused on real production poses, geometric evidence and
explicitly failed cases. The requested skill's TS/Vitest/lint infrastructure is
absent in this JavaScript repository; those gates are not claimed.

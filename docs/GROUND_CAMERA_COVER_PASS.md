# Ground camera around cover — September 8, 2026

Retained bounded repair, **not all-angle composition or whole-goal acceptance**.
The gameplay lock-on/crosshair clarification is separate from Studio tracking;
the earlier 10-degree acquisition cone is unchanged by this camera pass.

## What changed

`camera-ground.js` no longer immediately collapses the terrain-clearance offset
into the fighter when a nearby wall blocks it. It searches around the rear of
the fighter at the available camera height/radius, validating the entire cover
and bilinear-terrain footprint path. Exact cover-corner and height-entry events
are supplemented by five-degree terrain-arc probes with boundary refinement.
The terrain search is bounded sampling, **not a proof of finding every possible
sub-five-degree free interval**.

Collision-only history keeps a selected side of cover through tiny movements.
The normal cover and terrain responses blend continuously at first ground
contact. Near the end of a rear-side detour, the camera eases inward, then
recovers its range; correction interpolation is retraced against terrain and
cover. Safety retracing can override interpolation in newly obstructed or
infeasible space: this is not a universal camera-speed guarantee.

History belongs to the subject/camera, not the figure's replaceable rig. Camera
snap, a new subject or a large teleport resets it; costume rebuilds retain it.
Dimensions are recalculated from the current rig. Neither fighter physics nor
the aimed yaw/pitch is rewritten. The default unobstructed BFP-style view-space
range 25.5 / lift 9 / FOV 73.74 stays exact. Ground-only lateral clearance remains
temporary; there is no new persistent shoulder setting, body fade, asset,
dependency, map/layout/lighting change or saved editor-field change.

## Rejected candidates and review

The pivot-height and horizontal-slide probes did not solve oblique/near-vertical
body obstruction. The first constant-radius implementation passed static shots
but failed a wall-end microstep. Exact two-direction cover events repaired that,
then independent review found three more reproducible failures:

- A .002u lateral move switched between clear left/right arcs, moving the camera
  12.808u. Collision-branch history repairs this witness.
- Two native heightfield vertices raised 1.4u rejected the cover-boundary
  candidates even though another rear arc was clear. Intervening terrain probes
  repair this witness without bypassing collision checks.
- Pitch 25.094→25.095 degrees behind a wall changed terrain ownership and moved
  the camera 20.239u. Continuous radius blending repairs this witness.

Longer 30/60/120 Hz tests additionally caught a detour that vanished during lateral
exit. A costume-only `applyForm` then revealed another 12.56u branch reset; that
now retains camera ownership. Self-review caught aliased correction interpolation
which froze a large release; the removal/pitch-release regression failed before
the fix. Independent review accepted the final bounded changes with no remaining
Important/Critical findings in that review scope.

The former `ground-camera-wall-pending.mjs` cases were moved and expanded into
`tools/ground-camera-cover.test.mjs`. The two wall-end locations are independent
acquisition witnesses: each explicitly snaps before its .001u test movement,
rather than inheriting history from a 14u teleport between unrelated locations.

## Evidence

- `node --test tools/ground-camera.test.mjs tools/ground-camera-cover.test.mjs`:
  **43/43 pass**, `artifacts/ground-camera/review-release-final.log`. Earlier RED
  logs include `review-red.log`, `costume-red.log` and `release-red.log`.
- `node tools/ground-camera-browser.mjs retained-arc --whole-sequence`: **exit 0,
  480 native steps, 240 emitting samples, 105.0407u lateral travel, zero page errors,
  zero opaque-player reticle hits and zero actual-rock camera/near-corner
  penetrations across the full sequence**. The preceding retained-cover clip
  had 47 body-obstructed states. Current JSON is `retained-arc/results.json`.
- `node tools/ground-camera-studio.mjs retained-arc`: **four cases, exit 0, no page
  errors**. Ground-left/right/forward beam rehearsals use actual UI controls;
  the near-vertical ground-sprint shot is explicitly manually posed free look.
  Drafts remain unchanged. The three target-follow rehearsals do not maintain
  their original 75-degree elevation while the fighter moves. Studio now writes
  `studio-results.json`, preventing it from overwriting the gameplay JSON when
  both captures share an output label.
- `node tools/bfp-camera-check.mjs artifacts/ground-camera/bfp-retained-arc`:
  **exit 0, 165 profiles, no recorded failures/page errors**, and the existing
  30/60/144 Hz wall results remain unchanged.
- `node --test --test-concurrency=4 tools/*.test.mjs`: **1,541 tests, 1,537 pass,
  four retained cloth failures**, exit 1, 180.38s. `retained-arc-root.log` is
  authoritative. Failures remain stock31/platform60, tall/fixed-wall120,
  short99/platform120 and fictitious per-corner cloth constraints. No cloth
  source changed. The two pending takeoff witnesses are additional to this glob.
- `npm run build`: **exit 0, 264 modules, 10.71s**, existing large-chunk warning;
  `retained-arc-build.log`. `git diff --check` exits 0 with existing CRLF warnings.
  No commit, staging or index operation was performed.
- Camera-only warm Node isolation (`tools/ground-camera-cpu.mjs`): 3,000 measured
  calls per case after 600 warm-ups, 37 synthetic cover records, no renderer.
  After the concurrent browser/build/root jobs finished, mean / p95 were
  **.030 / .045 ms** clear-air, **.039 / .060 ms** wall, **.180 / .284 ms**
  terrain-plus-wall with retained history. Fresh-solving every step reached
  **.249 / .349 ms** in the terrain case. `retained-arc-cpu-quiet.json` records
  the final run; `retained-arc-cpu.json` preserves the noisier concurrent run.
  Neither is full gameplay, GPU or target-hardware frame-rate certification.

The capture at `artifacts/ground-camera/retained-arc/ground-camera.mp4` is silent
H.264, 1280×800, eight seconds, 160 rendered frames at 20fps from 480 simulated states.
It exercises native D/LMB input, pointer lock with relative mouse events,
physics, pose, optic beam and camera. Batched rendering is **not gameplay-FPS
proof**. The earlier `radius-orbit/` and `continuous-arc/` recordings are
intermediate candidates, not substitutes for retained evidence.

## Still open

Game Studio screenshot inspection shows that frame285 is no longer inside the
body, but the cape still fills much of the frame. Near-vertical frame180 is also
close/cropped. This meets the bounded collision/center-ray checks, not a polished
superhero-composition standard. No 10/10 or BFP-identical claim is made.

`node --test tools/ground-camera-takeoff-pending.mjs` explicitly remains **0/2,
exit 1**, outside the accepted root `*.test.mjs` glob. With native optic standing
pose and the captured wall, a scripted 30u/s rise at 45 degrees intersects body/hair
at heights .5–1u; at 60 degrees it does so at .5–3.5u. Review reproduced the same
obstructed frames with the preceding resolver, plus additional old obstructions.
It is a retained composition limit, not a newly introduced takeoff regression.
`artifacts/ground-camera/takeoff-pending.log` records the complete failing lists.

Takeoff composition, extreme view crop/cape art, custom proportions/equipment,
cloth, the full attack-origin/state matrix, target-hardware performance and the
rest of the original objective remain active.

## Reference scope

Freshly inspected the pinned community recreation's
[cg_view.c](https://raw.githubusercontent.com/LegendaryGuard/BFP/ef6d50c454454c7e1c13e54ed17c1a213a3231f9/source/cgame/cg_view.c):
it uses view-space offsets, solid-volume tracing and a second correction trace.
This is not recovered original BFP source. The arc solver and terrain response
here are independently implemented adaptations; no GPL code was copied.

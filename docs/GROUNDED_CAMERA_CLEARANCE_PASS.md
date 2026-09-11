# Grounded camera clearance — September 8, 2026

Retained bounded correction, **not all-angle camera or whole-goal acceptance**.
The full independent-combat objective remains active. The user's target-line
clarification concerns gameplay lock-on/crosshair, not Studio target tracking.
The earlier gameplay acquisition-cone change is unchanged in this pass.

**Current follow-up:** [ground camera around cover](GROUND_CAMERA_COVER_PASS.md)
supersedes the wall-obstruction result below. Its retained 480-step clip has no
body-reticle intersections. Takeoff occlusion and close-cropped framing remain
explicit open limits; the original evidence below is historical.

**Follow-up:** [rendered-cover alignment](POWERWORLD_COVER_ALIGNMENT_PASS.md)
subsequently found PowerWorld's rock proxies did not contain their visible
geometry. The box-trace guarantees below were therefore insufficient to claim
visible-rock clearance. That mismatch is repaired separately; cover-adjacent
player self-obstruction remains open and its full-sequence browser check fails.

## What changed

The native open-sky camera previously traced cover, then raised only the final
camera Y above the ground. At 79-degree grounded upward aim this left the torso
around NDC Y -2.0: the player disappeared below the view. Simply shortening the
boom kept the fighter visible but put their body over the crosshair.

`src/engine/camera-ground.js`, called by the existing `World._chaseBfp`, now:

- Sweeps the camera's conservative near-plane footprint against the native
  bilinear heightfield, including ridges between apparently clear endpoints.
- Anticipates ground contact with a smooth minimum rather than abruptly
  contracting the rear boom when its endpoint first reaches the floor.
- Adds lateral clearance only while terrain compresses the boom. The clearance
  uses fixed rig lengths and frame proportions, not an animated shoulder pivot.
- Retraces both terrain and cover after the lateral movement.

Clear-air view-space range 25.5, lift 9 and FOV 73.74 remain unchanged for the
default rig/profile. The camera does not write fighter position, velocity, aim,
ability payment or input ownership. Existing Studio camera profile values remain
authoritative. No camera-pitch flattening, persistent shoulder orbit, new fade
shader, map changes, dependencies or assets were added.

## Rejected iterations and review

The diagnostic `probe/` directory contains the previous native response and
local camera-only hypotheses: simple trace, head anchor, raised trace, and
lateral trace. These are not all accepted implementations.

The first implementation passed idle projection checks but still had defects:

1. Hard contact contraction exceeded the prescribed transition-speed test.
   Anticipating contact rounded that transition; 30/60/120 Hz witnesses pass.
2. Five exact column rays were not a conservative footprint. Independent review
   reproduced a native two-peak heightfield where the actual near plane entered
   terrain by about 2.73u. The new regression failed before repair. The retained
   sweep includes moving rectangle corners, moving edge/grid intersections and
   stationary grid vertices during their valid overlap intervals. Bilinear
   extrema are evaluated across every intersected cell, not just five rays.
3. Native strafe footage showed the shoulder covering the crosshair. Its animated
   pivot was also pumping the lateral camera offset every stride. A native
   180-step optic-running regression failed before the bind-dimension repair.

Review's separate 1,000-case whole-footprint audit found no missed contacts
against dense temporal sampling. Warm Node microbenchmarks averaged about
0.007–0.012 ms per trace on this host; these are reviewer diagnostics, **not
gameplay frame-time or GPU certification**.

## Fresh verification

- `node --test tools/ground-camera.test.mjs`: **18/18 pass**. Actual World
  camera/collision and native Fighter animation are exercised without renderer
  construction. Tests cover 45/60/79/89-degree grounded views on two heights,
  clear-air framing, transition rates, intermediate ridges, native bilinear
  saddles, near-plane footprint, adjacent-cover retracing and optic running.
  RED/GREEN logs are under `artifacts/ground-camera/`.
- `node tools/bfp-camera-check.mjs artifacts/ground-camera/bfp-regression-final`:
  exit 0, no recorded failures or page errors; existing camera/profile/input
  checks and 30/60/144 Hz wall results retained.
- `node tools/ground-camera-browser.mjs candidate-final`: exit 0, **480 native
  steps, 240 emitting samples, no page errors**, actual browser D/LMB and
  pointer lock. Relative mouse events under that lock sweep 0→79→0 degrees.
  The 60-step 79-degree attack plateau has upper-body cues and zero opaque-body
  center-ray obstructions. Lateral travel is 109.63u before reaching cover.
- `node tools/ground-camera-studio.mjs`: exit 0, **four cases**, no page errors.
  Real Studio controls exercise ground-left/right/forward beam rehearsals and
  unchanged drafts. A separate native ground-sprint inspection manually poses
  79-degree free look, covering Studio's .1 near plane. The three target-follow
  rehearsals do not stay at their initial elevation as the fighter moves; they
  must not be presented as continuous 75-degree free-look tests.
- Root command `node --test --test-concurrency=4 tools/*.test.mjs`: **1,509
  tests, 1,505 pass, four existing cloth failures**, exit 1, 111.22s.
  `artifacts/ground-camera/root-final.log` is authoritative. The same retained
  failures are stock31/platform60 torso face144 at frame127, tall/wall120 cover
  face0 at frame95, short99/platform120 torso face80 at frame84, and fictitious
  per-corner cloth-wall constraints. No cloth source changed.
- `npm run build`: exit 0, **264 modules**, 6.37s, existing large-chunk warning.
  `artifacts/ground-camera/build-final.log`. `git diff --check` exits 0 with
  existing CRLF warnings. No commit/index operation was performed.

## Inspectable capture and remaining defects

`artifacts/ground-camera/candidate-final/ground-camera.mp4` is an eight-second
silent H.264 capture: 1280×800, 160 frames at 20fps from 480 simulated states.
It uses native input/controller/physics/pose/optic beam/camera with batched
renders; it is not measured gameplay FPS. `prior/ground-camera.mp4` reconstructs
only the previous collision response in the current engine, **not a recording
from a historical checkout**. `candidate/` predates the stride-width repair and
is rejected as final evidence.

Screenshot inspection required by Game Studio caught the moving shoulder problem
that the initial idle tests missed. Final frame180 has a clear reticle and a
readable portion of SOL at screen left, but the view is still close and cropped.
The editor's near-vertical screenshot also shows conspicuous under-body/cape
geometry. These are functional improvements, not polished superhero composition.

**Open Important camera defect:** the native clip reaches a wall during recovery.
At frames262/264/266 and many frames271–309, cover retracing pulls the corrected
camera close enough that the body again intersects the center ray. Ground and
wall penetration are prevented; player self-occlusion is not solved in that
cramped configuration. The browser assertion covers the clear-space upward
plateau, not every recorded frame. Candidate JSON records the complete sequence
and the obstructed samples; do not replace this finding with an all-angle claim.

Next camera work must address constrained cover clearance and useful composition
across its transitions, with complete-sequence obstruction evidence. Near-vertical
attack art, cape/clipping, custom sizes/equipment, the full attack-origin/state
matrix and the rest of the original objective also remain open.

## Reference scope

Freshly inspected the pinned community recreation's
[cg_view.c](https://raw.githubusercontent.com/LegendaryGuard/BFP/ef6d50c454454c7e1c13e54ed17c1a213a3231f9/source/cgame/cg_view.c):
its third-person camera uses view-space offsets and solid-volume collision
traces with a second correction trace. This is not recovered original BFP code.
The new terrain sweep, smooth contact anticipation and lateral clearance are
our adaptation, not a claim of identical BFP collision behavior. No GPL code
was copied or imported. Existing framing references remain in
`docs/reference/BFP_CAMERA_AND_POSE_SOURCES.md`.

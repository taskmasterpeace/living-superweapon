# PowerWorld rendered-cover alignment — September 8, 2026

Bounded collision repair, **not camera-composition or whole-goal acceptance**.
The user's gameplay lock-on/crosshair clarification remains recorded in the
earlier beam-pressure pass; its deliberate acquisition cone is unchanged here.

**Current follow-up:** [ground camera around cover](GROUND_CAMERA_COVER_PASS.md)
repairs the recorded wall-recovery obstruction and promotes the former pending
wall-camera witnesses into `tools/ground-camera-cover.test.mjs`. Historical
camera failures below describe this cover-alignment pass, not the newer result.

## Finding and retained implementation

The native camera recording approached a rotated boulder. A ray against its
actual rendered triangles hit rock that the registered collision box did not
contain. The boulder's rightmost transformed vertex was X **−107.24071487**, but
the registered right surface was **−111.83203168**: a 4.59-unit mismatch. Native
fighter physics consequently allowed the body into that visible extent, and
native beam packets passed through upper boulder facets above the guessed top.

`PowerWorldStage._reg` now measures transformed mesh vertices once when the
stage opens. It registers the actual X/Z envelope and upper extent, retaining
the authored center for the existing `resetTerrain` contract. Its legacy radius
is measured from vertices, not from the diagonal of the bounding box.

PowerWorld records explicitly opt into `projectileShape: 'box'`. Their travelling
beam sweeps, ordinary contact queries, ordinary-projectile fallback overlap and
ricochet response now agree with the body/camera box. Unmarked city cover retains
the preceding cylinder behavior. Box ricochets use the contacted box face,
including the top, for reflection and separation.

The map's meshes, transforms, layout, materials and lighting are unchanged.
Authored health and rubble mass/rung are preserved using the original nominal
volume. Collision-aligned radius/height metadata also feeds existing scatter and
impact placement; this is not a claim that every secondary effect radius is
numerically unchanged. No new dependencies, assets, saved editor fields or
per-frame mesh scans were added.

These are conservative **AABBs**, not convex-rock collision. Empty corners and
tapered upper-spire space remain solid. This repair prevents passing through
visible rock; it does not claim triangle-exact contact or solve every collision
shape in other venues.

## Rejected camera experiment

Before finding the proxy mismatch, a lateral wall-slide experiment tried to
retain the rear boom and transfer blocked shoulder clearance upward. It passed
fixed-plane tests but failed the native sequence and independent review:

- A 0.001-unit wall-end movement jumped the camera 5.26 units at 79 degrees;
  another 45-degree witness jumped 8.34 units.
- An oblique 30-degree view put the body over the reticle throughout the tested
  firing interval, where the preceding response did not.

That experiment was removed. `camera-ground.js` retains the prior terrain sweep
and bind-dimension correction, not the rejected wall-slide/up-transfer code.
Its 18 accepted tests remain. `tools/ground-camera-wall-pending.mjs` explicitly
records six **unaccepted, failing** wall-composition/transition witnesses. It is
run separately and must not be hidden by a green root-test count.

The `wall-slide/`, `wall-probe.log`, and `studio-wall/` artifacts are diagnostic
candidate evidence, not retained-feature acceptance. The scene ray investigation
is in `tools/ground-camera-scene-probe.mjs` and `scene-probe.log`.

## Review-driven corrections

The initial mesh-bound repair exposed the old cylinder/box disagreement. A
cylinder using the AABB diagonal enclosed legal standing positions beside rock.
Independent native SOL optic fire outward from those positions hit no rendered
mesh, yet stopped at the muzzle and damaged the rock.

The box opt-in repaired swept beams and ordinary queries, but review then found
two untested actual-manager paths: ordinary non-priority shots still used the
legacy overlap cylinder, and radial ricochet ejection put box hits back inside
the box. Both were reproduced before repair, then covered by actual manager
updates rather than only helper-return assertions.

Final independent review found no Important/Critical findings in the bounded
patched contact paths. Four native optic, four ordinary-shot and a sustained
spire-side ricochet witness pass. This does not approve camera composition.

## Verification

- `tools/powerworld-cover.test.mjs`: seven tests using native stage generation,
  registration, body physics, travelling beams, projectile manager, shatter/reset
  and stage reopen. They check all 37 spires/boulders, transformed vertices and
  actual rendered-face rays, plus 148 outward side positions for both beams and
  ordinary shots. Five side/top ricochet trajectories must bounce once and remain
  outside the box through 20 frames.
- Combined cover/camera/beam/interception suite: **83/83 pass** in
  `artifacts/ground-camera/cover-manager-green.log`. Independent review reran it.
  RED evidence is retained in `cover-red-final.log`, `cover-outward-red.log`,
  and `cover-manager-red-final.log`; the first log has four genuine defects and
  passing lifecycle coverage, the last has the two actual-manager defects.
- Explicit wall-camera pending command: **0/6 pass**, exit 1,
  `cover-final-pending.log`. These are open requirements, not expected-green tests.
- Existing BFP camera/profile/input regression: no failures or page errors;
  30/60/144 Hz wall response and 165 roster profiles pass in `cover-final-bfp.log`.
- Native Studio inspection: four cases, no page errors, unchanged saved camera
  drafts in `cover-final-studio.log`. This pass adds no Studio UI. The prior
  report explains target-follow versus manually posed free-look scope.
- Final root command `node --test --test-concurrency=4 tools/*.test.mjs`:
  **1,516 tests, 1,512 pass, the same four cloth failures**, exit 1, 123.31s.
  `cover-retained-root.log` supersedes intermediate runs. The failures are
  stock31/platform60, tall/fixed-wall120, short99/platform120 and fictitious
  per-corner cloth constraints. No cloth source changed. The six explicitly
  pending camera witnesses above are additional, not counted in this root glob.
- Final build: exit 0, 264 modules, 8.36s, existing large-chunk warning retained;
  `cover-retained-build.log`. No git commit, stage or index operation performed.

## Camera evidence and remaining work

The full-sequence browser check records native D/LMB input, relative mouse input
under pointer lock, physics, optic emission, pose and camera. Rendering is batched:
480 simulation steps become an eight-second 1280×800 H.264 clip with 160 frames
at 20fps. This is **not gameplay FPS evidence**.

The harness now checks actual convex rock face half-spaces against the camera
and near-plane corners as well as the opaque-player reticle ray. It preserves
the MP4 and complete JSON even if acceptance fails; an encoded clip is not a
passing result. Rock appearing in the reticle is not itself an error when the
view points toward it.

The final `artifacts/ground-camera/cover-retained/ground-camera.mp4` recording
has no sampled camera/near-corner rock penetration
or page errors, 240 emitting states and 105.04 units of lateral travel. But it
fails full-sequence acceptance starting at frame253: **47 recorded states** have
player-body reticle intersections through frame309. The 79-degree clear-space
plateau still passes. Directly inspected frames270/285 are unusable close-ups
inside the player; frame315 recovers the ordinary third-person view.

The final browser command exits 1 at frame253, after preserving all 480 states
and the complete clip (`cover-retained-browser.log`). `ffprobe` confirms H.264,
1280×800, 160 frames, 20fps and eight seconds. `git diff --check` exits 0 with
existing CRLF warnings; `cover-retained-diff-check.log` records the check.

The collision repair therefore makes cover solid without fixing constrained
camera composition. Next camera work must preserve a usable firing view and
continuous transitions around actual cover, including oblique/wall-end cases,
without clipping into the player or flattening their intended aim. No whole-angle,
BFP-identical, full custom-rig, cloth, performance, art or 10/10 claim is made.
The full independent-combat objective remains active.

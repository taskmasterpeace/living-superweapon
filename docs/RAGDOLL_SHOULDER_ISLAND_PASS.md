# Shoulder and final-contact repair — cloth remains WIP

The complete independent superhero-combat brief remains active. This is a
bounded clipping repair, not AAA acceptance or completion of the game/editor.

## Reproduced faults and implemented corrections

- Distance-only collar braces let both shoulder anchors drift behind the chest.
  Actual upper-arm volume then engulfed the fixed cape seam: stock SOL first
  failed at frame 58 at 30 Hz and frame 188 at 120 Hz. `RagdollArmSeam` preserves
  captured chest-local collar offsets and corrects unsafe arm directions on the
  captured bone-length sphere. A translated shoulder carries its elbow/wrist;
  a corrected upper arm carries its wrist. Forearm contact is included after
  review reproduced STORMCALL's left forearm swallowing pin 2 at wall frame 120.
- `RagdollLimbPose.predictFrame` lets physics inspect the same transported frame
  that rendering uses, without mutating its history or doing an intermediate
  scene-graph update. Captured wrist/weapon roll remains owned by that adapter.
  No-step handoff is unchanged.
- Independent review found a short/narrow SOL straddling a thin wall at frame 92.
  The old final cleanup moved the whole body -0.4806145 X for its chest, then
  +0.4806145 X for its head. Repeating that pass could not resolve the overlap.
  Final cleanup now finds a single exit through the connected forbidden
  translation intervals of the compound supports and cover boxes. Every support
  must clear the candidate, and terrain-invalid exits are rejected.
- Final anatomical correction could invalidate an earlier limb-floor contact.
  Review's small-body/large-head platform fixture moved the right elbow from
  Y=.5 to -.113333 and the actual connected arm surface reached -.326783.
  Island cleanup now includes the existing joint margins as well as measured
  core geometry. The new regression first failed at frame 158; it now passes
  through 300 frames. Independent review measured a minimum connected-arm
  surface height of +.2589137 across that fixture.

These changes run through shared production physics/rig code in Studio and the
game. No gameplay camera, kit, map, saved profile, or user character was changed.
There are no new dependencies, meshes, or draw calls.

## Cloth investigation and retained failures

The retained body-surface change uses seven collision-only barycentric samples
per triangle, distributing contact by free-corner contribution. Static cover
retains the existing whole-triangle safe-side handling. This avoids several
whole-face body projections, but it is **not an accepted general cloth solver**.

Current cloth suite: **16 tests, 12 passed, 4 failed**. The retained failures are:

1. A resting contact manufactures inward Verlet velocity.
2. Material link lengths come from transient flight deformation rather than the
   undeformed garment metric.
3. The 60 Hz settled garment continues solving/uploading.
4. The added 120 Hz settling case remains active after landing.

The original exact-handoff, restoration, gravity, vertex/core, normal and tall
triangle-interior, hologram-ownership, thin-wall, and platform cases pass on the
current source. The new 30 Hz settling case passes. No tolerance, sleep threshold,
or failing test was relaxed or skipped.

Important rejected experiments: canonical material lengths and removing fractional
contact changes from `prev` improved some settling cases but introduced surface
failures in the updated ragdoll trajectory. Extra final geometric stabilization
also failed. Those changes were removed; their small causal tests remain red so
the defects are explicit. Smaller substeps, more relaxation, and virtual-point
union escape did not establish a general repair. Do not reintroduce these as an
already-verified fix or report the intermediate 60 Hz success as cloth acceptance.

Primary references used for diagnosis:

- [NVIDIA PhysX cloth guide](https://nvidiagameworks.github.io/PhysX/3.3/PhysXGuide/Manual/Cloth.html):
  virtual-particle contact and reverse interpolation; separate material and
  initial-pose data; conflicting constraints as a source of jitter. This is
  conceptual reference, not a claim that this browser runtime uses PhysX/CUDA.
- [Small Steps in Physics Simulation](https://matthias-research.github.io/pages/publications/smallsteps.pdf):
  contact-generated separating velocity, positional stabilization, and the
  distinction between substeps and repeated relaxation. No third-party solver
  source was imported or copied into the game.

## Fresh verification

- Broad Node regression: **726 tests, 722 passed, 4 failed**, exit 1, 20.54 s.
  These are the four cloth failures above. This supersedes the previous
  715/714/1 result, not a silent all-green claim.
- `npm run test:ragdoll-handoff`: **64/64 passed**, including the new arm-seam,
  custom narrow-core, and final limb-contact regressions.
- Fresh Studio-profile suite: **18/18 passed**, 25.01 s, including untouched
  profile preservation of production flight joints across the shipped roster.
- `npm run build`: exit 0, Vite 5.4.21, 257 modules, 5.92 s. Existing large-chunk
  warning remains: shared Studio-profile bundle approximately 4.93 MB / 1.75 MB gzip.
- Real-input moving-fire check: SOL travelled 50.9125 units, SARGE 49.3952;
  both recovered on release. Minimum emitter alignment .999995294 / .999999418;
  browser errors empty. This steps input/simulation without rendering and is
  not a real-time FPS measurement.
- Final independent contact review: **28/28 focused tests**, **45 fixtures /
  10,800 frames** clear in the scoped core/cover/floor/actual-arm-seam matrix.
  Earlier review also sampled 3,360 shipped-character frames at 30/120 Hz.
  Cloth was isolated in the large contact matrix; it does not certify cloth.

Legacy bone relaxation can still stretch/compress in hard custom-frame platform
contacts (review observed an upper-arm ratio up to 1.816 before final translation).
The new rigid transport preserves incoming lengths; that is not a claim that all
earlier physics constraints are inextensible. Full convex limb/weapon contact,
cloth self-collision, environmental wakeup, constrained interiors/slopes, and
target-hardware performance remain unapproved.

## Current visual evidence

`artifacts/ragdoll-shoulder-island/work-in-progress/` contains **602 inspection
states**, twelve screenshots, `core-motion.webm`, and `results.json`; browser
errors are empty. It is a silent stepped Studio recording using the actual
production rig, not BFP gameplay-camera or real-time performance evidence.

The main agent inspected SOL and TITAN mid-fall and terminal frames. SOL's cape
still has sharp folds and the landing reads as propped up; the conspicuous waist
ring and TITAN's shoulder forms also remain visually unfinished. These frames
must not be described as AAA or 10/10. The preceding neck/fixed-length capture
is historical, not the latest pose evidence.

Game Studio's multi-phase visual checks and the animation-authoring acceptance
matrix kept the work tied to real production poses and visible failure cases.
The skill's TypeScript/PoseLab/Vitest infrastructure is absent in this JavaScript
repository; no such gates are claimed. All broader combat, aiming, editor,
correspondent, control, and reference requirements remain in
`INDEPENDENT_COMBAT_ACCEPTANCE.md`.

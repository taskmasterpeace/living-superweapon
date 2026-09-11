# Cloth contact correction — experimental acceptance plan

**PARKED at the user's direction. Do not resume cape work without a new request.**
The user explicitly redirected effort toward the core combat experience.
Production was restored to the pre-pass snapshot; all experiments remain isolated.
New failing diagnostic tests are parked in `tools/pending/`, not acceptance claims.

September 8, 2026. Scope: cosmetic cape physics shared by game and Studio.
No map, camera, damage, character identity, or authoritative ragdoll change.

## Evidence and design

- Native short/broad SOL seed99: a contact correction moves one vertex 41.6u;
  worst displayed edge strain is 144.5 times its material length.
- Shoulder pins remain outside both actual torso triangles and the conservative
  torso envelope throughout 180 native steps, on stock, short/broad and tall
  frames. The attachment is not the demonstrated cause.
- Two existing native contact tests fail: independent corner walls are retained
  for a weighted sample; balanced corner velocities are erased.
- Correct sample contacts must constrain the weighted sample, and a whole-face
  proposal must commit atomically after validating all affected constraints.
- Evaluate that correction on the current real-substep static-cover baseline,
  not on the older prototype which predates that repair. Material reach and
  full-motion deformation are independent acceptance gates, not a consequence
  of collision counts.

## Sequence

1. Reproduce both native contact failures before implementation (done: 8/10).
2. Isolate the weighted-contact candidate, retaining current static sweeps.
3. Run existing native contact, combined-fall, settling and wake checks using
   only a read-only module substitution. Compare deformation and body paths.
4. Reject any regression in native behavior or catastrophic cloth extent.
5. Only a qualifying candidate may enter production, followed by matched
   full-motion browser views, broader tests, build, performance and review.

No candidate passing isolated contact math is deemed a completed art fix.

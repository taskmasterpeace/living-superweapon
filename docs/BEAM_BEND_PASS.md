# Rounded traveling beams — September 8, 2026

This is a bounded presentation repair within the active independent-combat goal, not whole-game or 10/10 acceptance. Shared game/Studio rendering changed; packet velocities, emission cadence, steering, physical hit segments, contact, damage, camera, maps and saved character definitions did not.

## Defects and repairs

The old render interpolation left almost the full physical join angle visible: 15-degree sampled arcs still displayed 12–14.73-degree joins. The same measured fixture now peaks at **7.533 degrees** across .35/1.6/4 beam radii. Rounded quadratic joins distribute that turn inside a radius/4 corridor around the existing ballistic segments. Even subdivision counts include the midpoint, keeping **rendered chord interiors**, not only their vertices, inside that corridor. Muzzle and tip stay exact.

The first visual improvement was not sufficient. Real tube tests and independent review exposed folded inner surfaces, a collapsed frame after duplicate newborn packets, near-reversal nozzle folds, and Float32-quantized duplicate rings. These were reproduced before their repairs:

- Short, bounded nozzle interpolation with extra samples around a backward turn; duplicate packets cannot consume its pending emission tangent.
- Shortest-arc frame transport and curvature-based local width limits. Tight bends compress locally; the straight charged shaft retains its width. Exact cusps close/reopen with coincident zero-radius rings, not a twisted seam or an invented loop.
- Deduplication uses the Float32 coordinates actually rendered. Coincident cusp caps remain intentional.
- Width follows traveled arc, not sample index. Curve/frame/radius work is shared between core and sheath. Only live rings are drawn and uploaded; reserve remains finite for inspection.

Worst-case reserve is **818 rings**, independently exercised at **817 live rings**. This increases per-beam reserved memory over the old fixed interpolation; it is not a free optimization. The native KANO recording peaks at **126 live rings**. Local reviewer CPU measurements on the shared curve/core/sheath pair were approximately .086 ms straight, .128 ms smooth, .452 ms adversarial zigzag. These are warmed Node microbenchmarks, **not foreground GPU/frame-rate certification**. Host inventory was checked: i9-14900KF and RTX 4090, driver 32.0.15.9186; headless captures do not certify that hardware's gameplay frame budget.

## Verification and evidence

- New `tools/beam-bend.test.mjs`: **26/26**. Rounded arcs, physical corridor chord interiors, exact endpoints, live draw/upload bounds, arc-based width, wide 90–180-degree corners, duplicate muzzle, short and reversing nozzles, actual authored high-steer reversal, and actual moving streams at 30/60/120 Hz. Geometry is checked against both the optical normal field and weighted centerline radial vectors.
- Independent read-only review: **26/26**, 1,200 randomized 3D paths, exact endpoints/no physics mutation, maximum sampled corridor deviation .249473 times radius, capacity/upload bounds, and the reported real high-steering reversal pass. Extremely tiny near-reversal openings and true cusp closures can have zero-area triangles; this is not a guarantee against all distant self-overlap.
- Broad suite: **866 tests, 862 passing, four retained cloth failures**, exit 1. Resting contact velocity, material rest metric, settled uploads and 120 Hz cape jitter remain unfixed. No test was skipped or loosened to hide those failures.
- Build passes: 257 modules, 5.51 seconds. Existing large-chunk warning remains; shared Studio-profile bundle 4,939.03 kB / 1,756.64 kB gzip.
- `npm run test:effects`: all **14 browser gates pass**, including traveling contact/reversals, nozzle alignment, exterior surfaces, radiance/filaments, native charged emitter, sheath, contrast and target/contact visibility. No browser errors were reported.
- `npm run test:beam-bends`: **91 Node checks and both capture runs pass**, exit 0; **560 final recorded frames**, no browser errors. The native SOL airborne turn retains pelvis/travel alignment .981816 and maximum eye/ray error .793409 degrees.

Before: `artifacts/flight-split-aim/beam-bend-before/` is the actual pre-change native SOL recording. `beam-bend-after/` is intermediate and superseded. Final matched optic footage is `artifacts/flight-split-aim/beam-bend-final/flight-split-aim.webm`.

Native charged hand-beam footage: `artifacts/beam-bend/kano-final/beam-bend.webm`, **320 frames**, maximum physical radius **4.2575**, **63.525 measured damage**, no browser errors. It uses Studio's airborne travel and circling measurement target, actual KANO charge/release/poses and production traveling energy. An earlier 65-unit, faster-target setup missed completely; the final contact demonstration uses the ordinary 32-unit distance and a slower circling target. Physics was not changed to force a hit.

## Visual criticism / next work

Matched SOL rear-turn screenshots now show a rounder hose instead of the former sharp polygon kink. KANO's wide turn remains connected and carries its charged width downstream. This is an improvement, not an awe-inspiring final effect: the broad cyan sheath still reads as a smooth ribbon from some inspection angles, severe turns narrow visibly, and the detached released tail deserves further art review. The procedural shoulders, thick belt, stiff hands and cape silhouette still look unfinished. The four cloth failures remain a concrete priority.

These are silent Studio inspection cameras, not claims about BFP camera matching, real input latency, audio impact or target-hardware performance. Game Studio kept the editor on the production effect; animation-authoring guidance required temporal and rendered-surface evidence. Existing BFP source provenance remains in `reference/BFP_CAMERA_AND_POSE_SOURCES.md`; no new source, comic panels or animation assets were imported in this pass. The complete original objective and acceptance ledger remain active.

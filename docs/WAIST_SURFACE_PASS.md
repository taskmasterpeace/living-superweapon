# Connected waist — bounded clipping repair

This closes a visible procedural torso/pelvis separation. It is not approval of the whole character, ragdoll, combat feel or the active AAA goal. See the [acceptance ledger](INDEPENDENT_COMBAT_ACCEPTANCE.md).

## What was wrong

The chest and pelvis overlapped at rest, but were separate rigid meshes. Independent chest pitch opened the waist. The initial real-production movement tests failed in all nine strafe/hover/flight × 30/60/120 Hz cases, with hundreds or thousands of detached hem-vertex observations. The same issue reproduced on the shipped procedural frames without changing attack sockets.

The first repair interpolated rigid row frames. It closed the gap in normal movement, but independent review found inverted triangles during ragdoll playback and a valid short/broad editor frame. Those failures were reproduced in new tests; that implementation was replaced, not accepted.

## Current implementation

- `hero-waist-surface.js` deforms only the lower part of the existing torso geometry. The hem is anchored inside the actual closed convex pelvis mesh and fitted against its triangle planes. Parallel sections with monotone axial spacing avoid the rejected blend's folds. The hidden hem can taper inside the pelvis; the upper chest remains unchanged.
- The final-pose surface pipeline updates it after animation, hit reactions, ragdoll application and form restoration. It never changes the physics root, travel direction, chest/hand/head drivers or attack sockets. The procedural pelvis loft is a contract; this is not a general skinning solution for arbitrary imported topology.
- Geometry retains its existing material, triangle count and draw call. Deformation is rebuilt from immutable rest vertices. Existing decoy snapshot ownership sees the `deformsWithRig` marker and clones the mutable buffer.
- Static triangle-normal contributions and static bounds are cached. Changed normals are checked against a full recomputation. Unchanged relative poses skip uploads.
- Clipping-test probes now refresh when rendered geometry changes. A sub-Float32 ray offset avoids false parity failures on exact radial seams. Hand-cover and volley tests use the shared current-geometry probe instead of frozen private copies.

No camera, lighting, gameplay speed, damage, energy cost, beam steering, roster kit or map was changed. Beams remain traveling hoses. Imported superhero skins retain their existing bone-driven deformation; this repair is for the procedural body underneath.

## Studio and verification

The existing Studio and game both use this surface automatically; there is no separate preview-only patch or profile migration. Existing frame/body-definition edits and transformation previews rebuild it from the current body.

- `tools/waist-surface.test.mjs`: 13 passing tests. Nine production movement/rate cases; every shipped procedural frame's hem and unchanged upper vertices/sockets; ragdoll/idempotence/restore; custom proportions, triangle orientation, normals and bounds; the formerly failing deterministic ragdoll case.
- `tools/trunk-probe.test.mjs`: two tests that first failed for floating-point seam parity and stale triangle caches, then passed after the probe corrections.
- Fresh broad regression: **659/659 tests across 59 files**, plus **18/18 browser-backed Studio-profile tests** in a separate browser lane: **677 passing**, no failures or skips.
- `tools/hero-sculpt-browser.mjs`: real edit → undo → save/reload → transformation preview; 390px layout; zero browser errors. This uses an isolated browser context, not the user's saved localhost profile.
- Independent read-only re-review: **14,160 ragdoll frames**, all 55 current shipped fighters plus four valid frame extremes, zero inward waist triangles or escaped bounds. Minimum axial span remained positive; cached-normal error versus full recomputation stayed below `1.2e-7`. This additional review sweep is separate from the 677-test count.
- Local Node CPU sample: 2,000 measured TITAN movement frames after 200 warmup frames. Waist update fell from approximately **0.186 ms to 0.041 ms/fighter**, with full `_animate` around 0.219 ms in the optimized sample. This is a local CPU measurement, not target-device or full-scene FPS certification.
- `npm run build`: exit 0, Vite 5.4.21, 250 modules, 4.50s. Existing large-chunk warning remains (shared profile chunk approximately 4.90 MB minified / 1.75 MB gzip). New-module syntax checks passed. This JS/Vite project does not have the animation skill's named TypeScript/Vitest gates; no such passes are claimed.
- Repeat with `npm run test:waist-surface`, with Vite already listening on port 5180.

## Footage and critical visual assessment

`artifacts/waist-surface/before/` contains the true pre-repair recording and ten matched-view screenshots. `after/` preserves the rejected first blend. **`final/` is the accepted waist revision:** 840 sampled simulation frames, zero browser errors, two 360-frame moving chest-fire cases and a 120-frame real ragdoll rehearsal. The labeled chest test beam isolates the production torso pose without overwriting shipped or saved kits. Inspection cameras are not the gameplay/BFP camera.

The final `waist-motion.webm` is a silent, stepped inspection recording (64.32 seconds including UI/capture time, 25 fps video). It is **not real-time gameplay or a frame-rate benchmark**. `results.json` contains per-frame hem positions and render counts; PNGs include front/right/back/left/recovery and ragdoll views.

The matched side views now show a continuous abdomen behind the belt instead of the detached rigid hem. This is a concrete improvement, but the character still reads as assembled modules. Dark TITAN armor lacks definition under the inspection light; shoulder caps remain conspicuous. The ragdoll shots expose separate head/neck attachment and whole-body silhouette problems. Large front-facing charge effects still occlude the body. Those are open defects, not covered by the waist tests, and the full goal remains active.

Game Studio's production-runtime playtest workflow and the animation-authoring acceptance checks drove the before/after evidence, actual-mesh tests and lifecycle coverage. No new third-party animation, model, comic panel or BFP code was imported in this pass.

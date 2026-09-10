# Construct Surface Implementation Report

## Changed files

- `src/engine/construct-surface.js` — adds the bounded `ConstructSurface` particle skin. It samples indexed and non-indexed mesh triangles in construct-root local space using a deterministic local RNG, assembles a single `THREE.Points` draw from a clustered seed, settles into restrained surface flow, and dissolves during the final 0.45 seconds. Runtime settings clamp `assemblyTime` to 0.15–2 seconds and `density` to 0–2; particle count is capped at 2,048.
- `src/engine/summons.js` — attaches the effect to `Construct` after immediate gameplay placement, accepts `owner.def.effects.construct` plus optional `def.constructFx`, advances the effect after gameplay transform updates, and disposes it through the existing construct disposal path. Gameplay triggers, contact dimensions, cover registration, and lifetime rules are unchanged.
- `tools/construct-surface.test.mjs` — uses real Three.js groups/geometries and the real `Construct` class to cover integration, local-space transforms, indexed/non-indexed geometry, finite/bounded positions, convergence, 30/60/120 Hz equivalence, density zero, instance isolation, and resource/material lifecycle.

## RED evidence

Command: `node --test tools/construct-surface.test.mjs`

Expected failure before implementation: Node exited nonzero with `ERR_MODULE_NOT_FOUND` for `D:\lsw\src\engine\construct-surface.js`. The production module required by the behavioral test did not exist.

## GREEN evidence

- `node --test tools/construct-surface.test.mjs` — 8 tests passed, 0 failed.
- `node --test tools/effects-profile.test.mjs` — 8 tests passed, 0 failed. This confirms existing construct effect defaults/validation and Studio profile round-tripping remain intact.
- `npm run build` — Vite production build completed successfully (268 modules transformed). Vite emitted only the repository's existing large-chunk advisory.

No pre-existing test directly exercises the native `Construct` class; the new integration test now instantiates it and verifies attachment, initial placement, update, and disposal.

## Visual caveats / parent verification

- Browser visual inspection remains for the parent, per the task brief. In particular, confirm particle size/density reads clearly against the HDR+bloom pipeline for fist, hammer, wall, and turret, and that the wall stays visually solid enough throughout assembly/dissolve.
- Fist/hammer solid geometry was intentionally left unchanged: the particle pass does not alter their gameplay dimensions or contact timing, and recognizable-geometry embellishment was optional rather than worth expanding risk in this shared worktree.
- The effect uses normal alpha blending, depth testing, no dynamic lights, and a single non-frustum-culled points draw per construct. The draw is count-bounded; parent visuals should still confirm the chosen point size is appropriate at gameplay camera distance.

## Visual refinement after first review

Reviewed `artifacts/combat-effects/construct-forming.png` and `construct-solid.png`. The first pass was washed out because the solid combined strong emissive shading, an enlarged additive duplicate, and fully opaque settled particles.

Refinement changes:

- Reduced solid emissive intensity from 0.9 to 0.24 (wall pulse now 0.17–0.27), darkened the lit base color, and reduced solid alpha to 0.52 while retaining the helper's 0.18 live minimum.
- Replaced the 1.15-scale additive shell with a 1.015-scale, 0.14-alpha normal-blended wire surface. It is tagged `constructSurfaceExclude`, so it cannot inflate particle counts or move samples off the real solid geometry.
- Particle opacity now falls from a readable forming state to 0.16 after assembly; settled motion and point size are also restrained.
- Added four knuckles and a thumb to the native fist, and a named head/handle silhouette to the hammer. Gameplay overlap radii, area damage, timing, placement, and lifetime are unchanged. The fist stays inside its existing 6-unit contact envelope.
- Construct disposal now traverses descendants and disposes each unique geometry/material once.

Refinement RED: 8 tests passed and 3 failed for the intended missing behaviors: excluded shells changed the particle count from 110 to the 2,048 cap, settled particle opacity remained 0.88, and the native edge/silhouette parts were absent.

Refinement GREEN:

- `node --test tools/construct-surface.test.mjs tools/effects-profile.test.mjs` — 19 tests passed, 0 failed.
- `npm run build` — production build passed with 268 modules transformed; only the existing large-chunk advisory was emitted.

Parent browser review remains necessary to approve final exposure and silhouette readability in the live HDR scene.

## Final review corrections

- Shrunk only the fist palm from 6×5×7 to 5.2×4.2×5.4, exposing the existing knuckles/thumb while keeping their combined Box3 inside the prior 6×5×7 visual bounds and 6-unit hit radius.
- Corrected wall placement so its object position is established before `lookAt`, and the target uses the wall's y=7 plane. The wall now stays world-upright and faces the owner across XZ without changing cover/gameplay data.
- Added Box3 protrusion/envelope assertions and world-up/forward-axis assertions. Targeted RED was 10 passing / 2 failing; final combined GREEN is 20 passing / 0 failing, followed by a successful 268-module production build.

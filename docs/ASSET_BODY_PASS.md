# Source-backed superhero body pass — 2026-09-07

## Scope

Two optional Quaternius CC0 source bodies are shared by gameplay, Character Studio, custom-character packages and level forms. Shipped heroes and existing saved profiles remain procedural unless explicitly changed. No map or BFP camera calibration changed.

This is a character-body integration slice, not an overall 10/10/AAA-complete claim. Arbitrary model/skeleton/animation upload, source-fitted costume-shell authoring, and higher-fidelity hair/face/garment art remain open. The catalog bodies are a fitted suit plus modular boots, insignia, hair/signature gear, cape and weapons; the procedural garment-shell selector does not apply to them.

## Source and runtime

- Exact local source: `Superhero_Male_FullBody.gltf` and `Superhero_Female_FullBody.gltf`, corresponding bins and eye texture; [provenance](../assets-src/quaternius/base-characters/PROVENANCE.md).
- Source: Quaternius Universal Base Characters, CC0; pinned mirror revision `0cc5dc351f4fffbe13a25381e73cb0a1aea67f47`.
- Source geometry: male 8,483 vertices / 14,318 triangles; female 8,844 / 15,060; 65 joints each. These counts describe the original three-mesh bodies, before runtime boot-cuff clipping.
- Offline bank is byte-checked against a fresh bake, including exact source hashes, matrices, weights and joint order. Compact JSON: 4,036,784 bytes; gzip-9: 1,408,436 bytes. The bank is synchronous bundled data, so even a procedural-only session currently pays that download/parse cost.
- Native bones attach below the existing driven head/chest/pelvis/limb meshes, with constant bind-space calibration. Finger bones follow the final hand's openness. There is no independent root motion or competing animation controller. Post-animation body separation, portals and moving ancestor groups inherit correctly.
- Original rig child-index, unscaled physics-root and YXZ contracts remain intact. The visible source body is clipped geometrically inside boot cuffs, including correct normalized weights, so shadows and picking do not retain bare source toes.
- Live palette regions retain their own emissive contribution and production rim lighting. Chest detail, cape seam and optic emitters are fitted to the source anatomy.
- Skeleton resources use the existing reference-aware retirement path. Portrait/travel consumers also dispose their skeletons. Decoy/possession copies bake static posed vertices; live duplicates retain their independently owned shader/material references.

## Review findings repaired

Numeric pose tests alone missed first-frame capture clearing after layout, chest emission tinting legs, the hidden signature gear, and a mislabeled guard fixture. The review now uses actual `melee/block`, light combo, charged heavy and throw sequences; a blank-canvas assertion guards capture setup.

Independent code review additionally found stale Model inspector applicability, weak generated-bank validation, prototype-key source lookup, duplicate shader loss, borrowed skeleton disposal, direct-figure cleanup gaps and stale world-space skin after root corrections. Those defects received targeted tests. The native bone hierarchy replaces the fragile cached-world-matrix approach.

## Evidence and verification

- Focused command: `npm run test:hero-skin` (source, runtime and profile tests; actual browser save/package/Play Test flow).
- Full serial lane: `node tools/verify-strike-pass.mjs --skin`; logs and exit status live under `artifacts/hero-skin/verification/`.
- Source bind-geometry references: `node tools/hero-source-review.mjs`, four front/profile views under `artifacts/hero-skin/source/`. Neutral review materials are identified; these are source bind poses, not imported animations.
- Production motion review: `node tools/hero-skin-review.mjs`, 168 phase samples plus front/left/right/rear and two-loop moving recordings. Fixtures: SOL male/female, armed GALE, STORMCALL. Labels identify the actual source body, engine state and custom inspection camera.
- Combat motion review: `node tools/hero-skin-review.mjs --combat`, 256 additional samples across SOL male/female light combinations, heavies and throws, plus STORMCALL source/procedural heavies. Each fixture runs an isolated three-quarter loop and a full-encounter side loop. `artifacts/hero-skin/combat-motion/motion.webm` is 120.24 seconds; `review-results.json` records the segments and actual contact events. All 16 loops have independently copied histories and their expected three light hits / one heavy / one throw. SOL's two body choices produce identical contact times and damage. The main review inspected temporal contact sheets for all eight fixtures.
- Browser video is fixed-step motion evidence, not a real-time performance benchmark. The inspection camera is not presented as BFP camera validation.
- Live gameplay camera checks: `node tools/combat-camera-live.mjs --body=superhero-male` and the equivalent `superhero-female` command. Both pass actual pointer-lock/free-aim firing, 27.5 measured beam damage, 720 tracking updates with zero off-region/occluded samples, and no lock-release jump. Evidence: `artifacts/hero-skin/camera/`. These are scripted targets, not AI match-balance evidence.

The 18-command serial regression run passed on the current source: 40 focused source/runtime/profile tests plus actual editor workflow; hover/inspection, Studio/layout, progression, blocking/bot fairness, strike/pose/impact/melee, locomotion, flight/languages, camera, packages, combat and build. Combat covers 53 kits × seven attack checks, world 42/42, and a 30-second eight-fighter soak (893 hits / 20 KOs, no invalid states or errors). Build: 228 modules. Vite still reports an oversized bundled chunk; the synchronous body bank cost above is not hidden by a passing build.

After that unchanged-production run, `test:hero-skin` was expanded and rerun: 46/46 CPU tests (including six grounded/airborne armed-trunk cases), the real editor/package/Play Test browser and both source-body live-camera browsers pass. Future focused runs include those checks by default.

An extra visual review flagged STORMCALL's axe disappearing behind the trunk during heavy startup. The first containment probe was a false positive: it tested the whole source body, including the occupied arm, against only the procedural trunk. A corrected actual-trunk triangle intersection test finds no crossing at the reviewed startup pose. The strike is `power`, which uses the procedural path on every body; it is not a newly imported axe animation. No production pose was changed on the strength of that false alarm.

Visual limitations remain explicit: the existing STORMCALL helmet covers the upper face, and the older fixed inspection camera clips his raised weapon late in recovery. The new full-encounter recording fits both fighters, but zooms far out for long knockback; it is a diagnostic view, not the BFP gameplay camera. Side/three-quarter occlusion is not proof of penetration. No detached source limbs or bind resets were identified in the reviewed motion, but this bounded catalog acceptance does not certify every weapon/pose combination or overall game quality.

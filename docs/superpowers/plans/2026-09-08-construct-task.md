# Task 1: Particle construct renderer

Implement in D:/lsw. You are not alone in the codebase. Do not revert others' edits. No commits, staging, subagents, dependencies, remote assets or cape changes. Ownership: new `src/engine/construct-surface.js`, existing Construct class in `src/engine/summons.js` (not Minion), and `tools/construct-surface.test.mjs` only. Report to `docs/superpowers/plans/2026-09-08-construct-report.md`.

User wants Green Lantern-style constructs assembling from holographic particles, using existing fist/hammer/wall/turret gameplay. Parent handles shared profile and Studio. Read existing Construct to understand positioning/disposal. Improve fist/hammer recognizable geometry if safely scoped (knuckles/thumb or hammer handle), while preserving dimensions/contact and lifetime. Preserve each construct's gameplay rules.

## Contract

Export `ConstructSurface` from new module. Constructor `(root, {color, assemblyTime=.65, density=1}={})`: receives the THREE.Group containing only construct solid mesh parts (capture meshes before adding particles), creates one bounded instanced/points particle draw, samples actual local-space geometry across parts by triangle surface area with deterministic local RNG (no global Math.random consumption), particles travel from a clustered seed/volume onto surfaces. No third-party source copying. Supports non-indexed/indexed geometry and child transforms without NaNs. Geometry sampling at creation only. After assembly, surface detail is stable with subtle flow and a readable solid interior (not a fuzzy cloud). During final remaining-life window dissolve briefly without hiding active cover entirely. All particles remain parented to moving/rotating construct. Respect ordinary alpha/depth and restrained bloom.

Methods `update(dt, remainingLife=Infinity)` and `dispose()`. Does not own or dispose original root/solid meshes. Tracks its resources only. Settings clamp at runtime defensively: assemblyTime .15..2 seconds, density 0..2. density=0 disables particles cleanly. Total count bounded (e.g. <=2048 per construct). Every frame uses dt, no performance.now, global animation loop, new dynamic lights or network. Avoid CPU allocation in update.

Integrate at end of Construct constructor, using `owner.def?.effects?.construct` as settings (optional defaults). Set this.obj.position to this.pos immediately after placement; avoid first-frame origin flash. Call update once after gameplay position/rotation update; dispose on every existing _dispose path. Constructor settings should also accept `def.constructFx` overrides for future ability-specific tuning if useful, but do not add broad schema work. Existing immediate triggers must remain possible; no hidden delayed damage. Solid material alpha should not fall below .18 while construct is live.

## Tests (TDD)

Use real THREE groups/geometries and Construct where practical. Before implementation write tests then run `node --test tools/construct-surface.test.mjs` and record expected RED. Tests catch missing effect attached by Construct, wrong local coordinates when parent translates/rotates, nonfinite positions, unbounded counts, assembly failing to converge, differing progress at 30/60/120Hz, density zero still emitting, multiple instances sharing mutable particle positions, and disposal leaving objects attached. Test material opacity restored when helper disposed. Assert actual geometry/transforms/state, not source text. A renderer or audio stub is allowed only at device boundary.

Run existing native construct behavior if tests available, plus new tests. Final report describes changed files, RED/GREEN evidence, visual caveats. Parent performs browser visual verification and independent review.

# Airborne casting must preserve locomotion legs

Parent plan: `2026-09-08-completion-continuation.md`, Task 1 finding. Work in D:/lsw; shared dirty branch; no commits/staging or unrelated resets.

## Ownership / boundaries

Own `src/engine/flight-pose.js`, `src/engine/combat-pose.js`, a focused new `tools/air-cast-locomotion.test.mjs` and optional matching browser proof script under tools. Do not edit Studio, audio, effects, resources, camera or other modules without reporting the need first. You are not alone; preserve other edits. No subagents.

## Concrete problem and outcome

The movement inventory measured identical hip/knee angles after 180 frames of hand/chest/eye beam emission across hover/cruise/ascent/descent. `combat-pose.js` overwrites hips/knees with a fixed air-cast pose at full weight; `flight-pose.js` suppresses flight legs by combatWeight. Preserve velocity/style-driven lower-body flight animation during ranged actions. Layer bounded recoil and meaningful hover bracing onto locomotion instead of replacing it. Keep shoulder/hand/head/chest emitter solve authoritative, anatomical limits, and no changes to simulation position/velocity or BFP camera.

Do not alter deliberate melee/grab full-body strikes, guard, KO or grounded authored strike poses. Grounded/ballistic jump coverage is a separate ledger gap, not an excuse to broaden this patch. Keep custom profile flight leg settings effective while firing. Avoid arbitrary extra noise or motion: read real defaults and existing overlays.

## Acceptance

1. Write failing native Fighter/slot tests before the fix. Demonstrate leg pose responds to travel state during sustained ranged fire instead of collapsing to one fixed pose. Cover hand/two-hand/eyes/chest/rifle, authored distinct flight leg profiles, enter/hold/release, 30/60/120 Hz. Do not assert default rise/descent differ if profile data intentionally shares those joints; test preserved carrier plus authored leg intent.
2. Preserve neutral hover/readable planted cast bracing; no recoil accumulation, jumps at transitions, penetration or foot inversion. No pose changes to physics. Include rendered-volume clearance checks where existing helper supports them.
3. Run focused new tests plus `tools/flight-split-aim.test.mjs`, `tools/directional-transition.test.mjs`, `tools/spine-envelope.test.mjs`, `tools/ground-axial-support.test.mjs`, `tools/volley-hands.test.mjs`. Resolve exact filenames with rg if needed. Report actual counts and commands, not assumed passes.
4. Capture native browser motion through attack entry/travel change/release and representative frames for parent visual review, using existing real-game/Studio fixture seams. Clearly label scripted fixture evidence vs player input; never claim AAA from joints/tests.

## Report

Write `docs/superpowers/plans/2026-09-08-air-cast-legs-report.md`: status, scoped files/changes, before/after evidence, tests with output counts, artifacts, risks and exact remaining gaps. Return only status, no commits, one-line test summary and concerns. Self-review before report. Parent dispatches independent review afterward.

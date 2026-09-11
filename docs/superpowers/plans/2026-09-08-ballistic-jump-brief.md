# Source-authored ballistic jump, separate from powered flight

## Authority and evidence

User's full brief requires good grounded/jumping/flying animation and correct ownership. Parent live W + four-frame Space test produced a real ballistic arc (apex 5.20833, flying false throughout) but rendered a prone Superman flight pose near apex. See `artifacts/ground-air-handoff/inspection-012.png` and `jump-inspection.mp4`. This is not acceptable completion of the jump requirement.

Current jump physics is correct and MUST NOT change. Jump velocity is 25.5 under 60 gravity. Holding Space past apex or pressing again permits powered flight; a short tap does not. Preserve full movement/aim/beam, BFP camera, intentional melee/guard/KO priority and the reviewed 0.2-second ground-air leg bridge.

## Ownership

Own new `src/engine/jump-motion.js`, new `src/data/jump-bank.json` (generated), new `tools/ingest-jumps.mjs`, `tools/jump-motion.test.mjs`, `tools/jump-source.test.mjs`, optional one new browser proof script. May extend `tools/lib/quaternius-source.mjs`, `src/engine/flight-pose.js`, `src/engine/ground-motion.js`, `src/engine/entity.js`, `src/tool/studio-preview.js` and a minimal new Motion option in `src/tool/studio-main.js` for this task. No other edits without checking. Parent has finished audio and ground-air bridge edits; preserve them. Shared dirty worktree: no commits/staging/resets. No subagents.

## Existing source and seams

`assets-src/quaternius/AnimationLibrary_Godot_Standard.gltf` + `.bin`, included CC0 license and existing hashed source loader. Exact takes: Jump_Start (1.33333337s), Jump_Loop (2.5s), Jump_Land (1.25s). `tools/lib/quaternius-source.mjs` has loadSource/sampleSource/bakePoseBank internals and recorded provenance; expose a narrowly scoped bakeJumps using those seams. Do not regenerate existing locomotion/strike banks. Inspect source at 0/25/50/75/100% and loop seam, including held weapon on target. Runtime should carry typed jump/fall/landing metadata; do not branch on filenames or mislabel procedurally generated motion as imported.

`applyAuthoredPose` supports legs, hips and support=false. It never writes physics root. Source clip durations cannot simply stall controls or extend the physical jump. Document chosen playback mapping/windows after source inspection; keep responsiveness. `animateGroundTransition` is a finite lower-body bridge before directional/combat solving, with restore handled at top of restoreGroundBase. Its live hitstop and form lifecycle were just fixed and tested.

## Implementation outcome

1. Ballistic rising/apex/falling poses use the actual jump source and stay upright, not velocity-aligned prone flight. Distinguish powered flight/gliding from unpowered air at the earliest shared presentation seam. No change to entity velocity, position, gravity, flight permission or key semantics. Launched/thrown/grabbed/KO states remain owned by their current systems, not jump clips.
2. Source takeoff/air/landing animation has simulation-time playback, pause/hitstop stability, correct phase wrap/exit and clean jump-to-powered-flight or landing interruption. Retain procedural fallback when the source channel is opted out/unavailable. Do not blanket-disable the existing walk procedural option semantics without deciding/documenting it.
3. Ranged attacks keep independent upper-body/head/weapon aim. Apply source support/articulation before directional and emitter solve. Strong grounded melee/guard/grab still win; do not let a landing clip overwrite a strike. No imported root motion into physics. Foot support belongs only to actual grounded landing, no snapping feet to the floor during a jump.
4. Every overlay has restore order, form rebuild and disposal/reset handling. Current chain is ground → new jump → finite leg bridge → directional/combat → hit. Unwind in reverse. Avoid restoring new jump AFTER source ground's older snapshot, which bakes jump into rest. Exclude hitstop clock advancement. Update form guard/reset fields alongside existing channels.
5. Add an explicit **Ground jump** Studio Motion entry driven by native input/physics in the empty stage, not a second manual animation or synthetic arc. It should exercise short press/release, ascent/apex/descent/landing/recovery, repeat deterministically and remain silent during seek. Label it a native physics rehearsal; settings aren't gameplay stats. Do not interfere with combat fixture or audio lifecycle.

## Acceptance / verification

- RED tests before production changes: unpowered jump cannot become prone flight; actual source take and phases play; powered flight still has its authored cruise family.
- Source test verifies exact take names/hashes/license, normalized fixed-size anatomical samples, no imported simulation root motion, Jump_Loop seam and one-shot endpoints (do not loop-close Jump_Start/Land).
- Native tests across 30/60/120 Hz and representative scales: takeoff/apex/descent/landing, short Space and hold-to-flight, fixed segment lengths, rendered boot/floor and forearm/torso clearance, head/hand/chest/weapon aim during jump, guard/melee priority, zero-dt/hitstop, form/KO/reset. Keep tests behavioral and deterministic.
- Preserve new ground-air-handoff and air-cast-locomotion suites plus existing ground-motion, flight-split-aim, spine-envelope, ground-axial-support, hero-hover, flight-language and Studio audio tests. Run source test and build. Record exact counts.
- Browser: source-vs-target contact sheet with quarters and loop seam; one continuous real-game short-jump video + key frames; Studio Ground jump screenshot/seek/repeat; one armed/aimed jump example. Preserve production camera defaults; label extra inspection lens. Bound captures (one or two videos, not every matrix cell).

## Report

Write `docs/superpowers/plans/2026-09-08-ballistic-jump-report.md` with status, source choices/windows, RED/GREEN, scoped files, exact tests, artifacts, observed limits. Return concise status/tests/concerns. Parent independently reviews code and actual source/target imagery. Do not call the full user brief or AAA feel complete.

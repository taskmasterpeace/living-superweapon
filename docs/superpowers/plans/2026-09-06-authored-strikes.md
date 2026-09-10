# Authored light strikes implementation plan

> Execute inline, test-first, preserving the existing shared dirty worktree. No unrelated commits, map edits or controller replacement.

**Goal:** Give real light punches an authored fighting stance and coordinated torso/elbow motion, with trustworthy source provenance and Studio choice.

**Design:** Extend the pinned Quaternius sampler with one-shot metadata. Share anatomical retargeting between ground loops and strikes. The simulation still owns lunge, damage and startup/active/recovery; the visual source is retimed to those phases. Final fist contact remains committed to the strike point, never a homing victim. Jab/cross can mirror to either hand. Heavy punches, grabs and missing/disabled source selections keep the procedural behavior. Ground strikes own the legs and measured boot support; airborne strikes keep superhero legs. No copied root travel.

**Stack:** Existing JavaScript, Three.js, Node tests, Vite and Playwright. No new dependencies. The animation skill's example TypeScript/Vitest paths are absent in this repo; use actual production rig/pose/contact tests and build.

## 1. Named one-shot ingestion

- [x] Run `node --test tools/strike-source.test.mjs` and observe missing bank failure.
- [x] Extend `tools/lib/quaternius-source.mjs` with `bakeStrikes(source)`, using the same anatomical frame format. Jab source is `Punch_Jab` (0.8333333135s), cross is `Punch_Cross` (1s). Contact landmarks are source seconds, not gameplay durations. Do not loop-condition one-shots.
- [x] Generate `src/data/strike-bank.json` with `tools/ingest-strikes.mjs`; verify exact source endpoints. **Reviewed deviation:** the original ground hash is intentionally replaced after rendered-source comparison exposed a shared 6.5° bind-axis bias; retaining it would retain that defect. See `docs/AUTHORED_STRIKE_PASS.md`.

## 2. Production body and contact ownership

- [x] Run `node --test tools/authored-strike.test.mjs`; the active strike must reject the current unrelated leg run cycle.
- [x] Extract reusable `samplePoseFrame`, mirroring and fixed-length `applyAuthoredPose` into `src/engine/authored-pose.js`. Preserve loop timing, support and endpoint contracts through ground-motion regressions; the corrected core basis is the documented exception above.
- [x] Add `src/engine/strike-motion.js`: map gameplay phase to source landmark segments, mirror by committed hand, snapshot/restore body offset and leg transforms. Apply before final melee contact in `melee-pose.js`; unwind before ground restoration and during form swaps in `entity.js`.
- [x] Test source phase at 30/60/120Hz, both hands, root/length/contact bounds, grounded versus airborne ownership, interruption, hitstop, form replacement and procedural fallback. Add full one-shot continuity and synchronous moving-victim contact regressions; run actual melee/contact/block scripts.

## 3. Editor and visual evidence

- [x] Add validated optional `model.strikes` (`authored` or `procedural`) to profiles; default authored. Add an existing-inspector control and precise source labels. Preview actual combo encounters, not a substitute collision simulation.
- [x] Capture source/target start/quarter/mid/three-quarter/end, continuous sequences, grounded and airborne contact, and armed front/both profiles/rear. Review drove core/hip, shield penetration, near-extension elbow twist and moving-target fixes. An extra inspection-script stale actor reference was corrected separately; the final contact capture completes without errors.
- [x] Verify save/undo/export/import choice and actual game input, 390px editor layout, full poses/blocking/melee/ground suites, independent code review and production build. Final nine-command serial refresh exits 0; 71 combined CPU tests pass. Evidence and remaining source gaps are recorded in `docs/AUTHORED_STRIKE_PASS.md`, without a quality score or broad-goal completion claim.

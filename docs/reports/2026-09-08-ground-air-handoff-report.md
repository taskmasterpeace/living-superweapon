# Ground / air handoff implementation

Spec: `docs/superpowers/plans/2026-09-08-ground-air-handoff.md`. No commits or unrelated mutations.

Scope: `src/engine/ground-motion.js` adds a finite 0.2-second lower-body bridge and restoration; `entity.js` invokes it between ground and directional/combat layers, restores it before form rebuild and releases its snapshots with other rig-bound channels. New tests/browser proof are `tools/ground-air-handoff.test.mjs` and `tools/ground-air-handoff-browser.mjs`.

TDD: the source-phase tests failed with takeoff knee jumps of roughly 70–121 degrees. New handoff makes 12 phase/rate cases pass without extending source gait weight into air or changing physics. Landing visible-boot support and retirement checks pass at three rates. Added paused redraw stability and rig replacement: replacement initially failed because the new transition pointer was not cleared; fixed it through the native form restoration path. Focused suite now **17 passed, 0 failed**.

Regression command: `node --test tools/ground-motion.test.mjs tools/ground-air-handoff.test.mjs tools/directional-transition.test.mjs tools/ground-axial-support.test.mjs tools/flight-split-aim.test.mjs`. Before the final two lifecycle assertions: **145 passed, 0 failed** (includes concurrent air-leg fix). Final suite/build pending below.

Native browser uses real W/Space key events, Game update/control, Fighter physics and gait. A four-frame Space tap jumps to an apex of 5.20833, never enters powered flight, and lands at y=0 with bridge retired. First takeoff frame hip/knee angles: 2.91, 2.96, 9.83, 8.23 degrees, not a source-stride disappearance. Zero browser errors. Recorded frames and `results.json` live in `artifacts/ground-air-handoff/`. `jump-inspection.mp4` is a labeled inspection lens on native gameplay; `game-camera.png` restores the production chase camera. No camera defaults changed.

This fixes the identified transition, not all movement quality. Melee remains deliberately full-body; a complete emitter × jump matrix and subjective integrated combat review stay on the completion ledger. Review scope: finite bridge, restore order, hitstop/zero dt, form lifecycle, fixed anatomy, floor support and combat ownership.

## Review fix

Reviewer reproduced handoff timer/pose advancing during native Fighter.update hitstop while physics was frozen. Added a native update test (RED: remaining .18333 became zero), then froze both transition clock and its saved lower-body articulation until hitstop ends. The test includes held pose, unchanged physics, resumption and retirement. Its pose-only fixture needed a real camera when exercising Fighter.update's existing wake path; supplied that camera rather than changing production VFX. Current focused suite: **18 passed, 0 failed**.

Visual inspection exposed another pre-existing issue: ballistic jumps use prone flight presentation. The captured jump is therefore **not motion-quality approval**. A separate source-authored jump task will use the existing licensed Jump_Start/Jump_Loop/Jump_Land assets and distinguish powered flight from unpowered air.

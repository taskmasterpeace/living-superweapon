# Distant lock readability implementation plan

> Execute inline under the user's existing autonomous implementation request.

**Goal:** Make medium/distant locked opponents readable without enlarging the foreground player.

**Architecture:** Keep the existing camera route, collision traces, free-look input and close-combat opening. Add a bounded, time-based lens compression at longer locked ranges; multiply the eye boom by the same gain that divides the lens tangent. This preserves foreground scale while reducing perspective size disparity. Collision may reduce the gain, never force the eye through cover.

**Tech stack:** Existing Three.js camera and Playwright fixtures, no dependencies.

**Spec:** PRODUCT.md and the current user's camera/attack-readability feedback. Screenshot evidence: combat-strafe/motion-verified frame 110; existing lock-far target height is only 4.865% at 110 units. This is an original presentation adjustment, not an assertion about original BFP camera values.

## Constraints

- No map, roster, ability balance, input-axis, or beam travel changes.
- Preserve authored free-flight lens/range and near-combat scale.
- No source edits during browser verification or capture.
- Test actual production camera; do not count reticle bounds as body size.

## Task: paired lens and boom

Files: src/engine/world.js; tools/lock-readability-check.mjs; package.json.

- [x] Reproduce the current failure using actual head/foot projection at gaps 70 and 110. Require at least 7% viewport body height at 110; player height stays 18–27%. Check 30/60/144 Hz, free-look equivalence, approach/retreat continuity, and no body occlusion.
- [x] Implement `gain = 1 + .8 * smoothstep(clamp((gap - 33) / 66, 0, 1))` for open-sky locked view only, ease at 4/s, clamp gain so the lens cannot fall below 30 degrees. Use `2 * atan(tan(baseFov / 2) / gain)` for the lens and multiply the existing damped boom by gain. Leave authored base lens/boom ownership unchanged.
- [x] Run the new fixture, inspect before/after screenshots, and reject visual tradeoffs even if numerical gates pass. Cover shortening must reduce compression rather than crop the foreground actor.
- [x] Run the full camera suite, targeted Studio combat and production build. Request a bounded independent source review. Record exact results and remaining limits.

Review-driven refinement: unlock transfers all extra standoff into the existing
critical spring; lens recovery shares its progress and a snapshotted effective
reference. See docs/DISTANT_LOCK_READABILITY_PASS.md for reproduced defects and results.

No commit is part of this pass: preserve the shared dirty worktree.

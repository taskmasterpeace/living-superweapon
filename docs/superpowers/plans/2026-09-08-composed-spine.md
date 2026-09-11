# Composed Spine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent excessive composed torso twist and reversal snaps while keeping native axial beams attached and movement independent.

**Architecture:** One final reversible spine envelope consumes the planned upper-body pose. Native axial emission commits the animated emitter direction after articulation. Presentation-only heading feedback resolves sustained reach limits.

**Tech Stack:** Existing JavaScript, Three.js, Vite, Node tests, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-08-composed-spine-design.md`

## Global Constraints

- No map work, roster expansion, dependency migration or git commit is included.
- The dirty shared worktree and all unrelated edits are preserved.
- Already-fired packets retain their velocities.
- Mouse aim, position, velocity, costs and gameplay camera remain simulation-owned.
- Execute this coupled runtime change inline; request bounded independent review after its tests pass.

### Task 1: Composed articulation and emitter contract

**Files:** create `src/engine/spine-pose.js`; modify `src/engine/combat-pose.js`, `src/engine/entity.js`, `src/engine/directional-pose.js`, `src/engine/projectiles.js`; test `tools/spine-envelope.test.mjs`, helper `tools/helpers/spine-combat-fixture.mjs`.

**Interfaces:** `restoreSpineAim(f)` restores the previous upper-body overlay;
`animateSpineAim(f, dt, active, blocked)` returns its composed correction quaternion
or null. It stores only current-rig presentation history. Existing callers retain
their current signatures. Native `BeamHose.update` consumes the final source
quaternion only for actual pose-launched eye/chest powers.

- [x] Add a native fixture based on `disjointCombatFixture`, with one authored hand/chest/optic beam and commanded yaw/elevation changes.
- [x] Assert final yaw and per-frame relative turn, not the helper's own declared limits:

```js
const relative = pelvisWorld.clone().invert().multiply(torsoWorld);
assert.ok(Math.abs(new THREE.Euler(0,0,0,'YXZ').setFromQuaternion(relative).y) <= 1.2 + 1e-5);
assert.ok(relative.angleTo(previous) <= 12 * dt + 1e-5);
```

- [x] Run `node --test tools/spine-envelope.test.mjs`; retain the intended RED witnesses.
- [x] Implement the reversible final envelope, including current-rig history and exclusive-state release. Integrate restore before chest/directional restores and solve before final head/hand IK.

```js
const wantedRelative = inversePelvis.multiply(plannedTorso);
// Limit the composed yaw, then settle from the previous rendered relative pose.
// Convert the result back into one upper-body correction around the hip pivot.
```

- [x] Keep new native eye/chest emission on the final animated source without changing packet arrays or command targets. Preserve first-launch readiness and payment ordering.
- [x] Use remaining planned-versus-rendered yaw error for a current-rig visual heading bias; retire it on release and confirm first-launch convergence in the bounded matrix. Extreme grounded pitch remains explicitly unresolved.
- [x] Run the new tests plus `tools/axial-cofire.test.mjs`, `tools/axial-launch.test.mjs`, `tools/chest-channel.test.mjs`, and hand coverage through the focused/root suites. Investigate regressions before broader acceptance.

### Task 2: Whole-sequence proof and retained-state audit

**Files:** create `tools/spine-envelope-browser.mjs`, `docs/SPINE_ENVELOPE_PASS.md`; update `docs/INDEPENDENT_COMBAT_ACCEPTANCE.md`.

**Interfaces:** browser fixture uses the same native helper and final projectiles/VFX clocks; evidence declares fixed-position or integrated-travel scope accurately.

- [x] Capture matching native before/final sequences around 170°, −100° and elevated target commands, including entry/reversal/recovery and four views.
- [x] Extend tests with early/middle/late release, rig replacement, co-fire and real torso/arm contact.
- [x] Request bounded read-only code review; repair reproducible Important/Critical findings. Added RED→GREEN commanded-target convergence checks for the review-discovered optic feedback defect.
- [x] Run `node --test --test-concurrency=4 tools/*.test.mjs` and `npm run build`. Final: 1,449 tests, 1,445 pass, four existing cloth failures; build passes (262 modules). Unavailable TypeScript/lint gates are not claimed.
- [x] Exercise actual flight/aim input and Studio authoring. Inspect screenshots plus full-sequence numeric motion and media metadata. Current pass verifies SOL Optic-focus and undo/redo, native D/mouse and separate takeoff/landing/punch sequence; prior mixed-power browser evidence remains explicitly historical, while current co-fire tests use the native runtime.
- [x] Record retained changes, rejected experiments, exact test results, source gaps and remaining art/feel/anatomical limits. `docs/SPINE_ENVELOPE_PASS.md` and acceptance ledger updated. Full goal remains active; this bounded plan does not imply whole-goal completion.

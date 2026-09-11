# Grounded Axial Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan inline. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let grounded chest attacks acquire steep targets through body support without breaking the stride or foot contacts.

**Architecture:** A reversible post-carrier/pre-chest layer leans the pelvis/body, preserves the source boot targets through fixed-length two-bone legs, and yields to exclusive poses. Native beam readiness, payment and packet behavior remain unchanged.

**Tech Stack:** Existing JavaScript, Three.js, Vite, Node tests and Playwright.

**Spec:** `docs/superpowers/specs/2026-09-08-grounded-axial-support-design.md`

## Global Constraints

- No source-bank edits, dependencies, map changes, saved-profile writes or git commits.
- Preserve the shared dirty worktree.
- Neither simulation position/velocity, aim, camera, gravity nor ability payment changes.
- The full independent-combat objective and ten-part attachment remain active.

### Task 1: Grounded body support and fixed foot targets

**Files:** create `src/engine/ground-aim-support.js`, `tools/ground-axial-support.test.mjs`; modify `src/engine/combat-pose.js` and `src/engine/entity.js`.

**Interfaces:** `restoreGroundAimSupport(f)` removes the prior current-rig overlay.
`animateGroundAimSupport(f, dt, chestSlot, blocked)` runs after `settleBody` and
before `animateChestAim`. It keeps private current-rig body/leg snapshots and
support rotation. Two-bone solve consumes real knee/boot offsets, saved world
boot position/quaternion and a source knee pole; no skeleton reparenting.

- [x] Write and run native first-launch RED witnesses using `spineCombatFixture`:

```js
x.aim(170, height); x.start('lmb');
// Record first actual emission through the native manager for 1 second.
assert.ok(first !== null && first <= .6);
assert.ok(animatedChest.dot(beam.dir) > .99);
```

- [x] Capture the before sequence while the runtime is still unchanged.
- [x] Implement the reversible support stage. Desired support is the excess
  elevation beyond .9 rad from the current pelvis, capped .65 rad, with bounded
  interpolation. Rotate around the rig hip; preserve boot targets with:

```js
const bend = Math.acos(clamp((distance*distance-u*u-v*v)/(2*u*v), -1, 1));
// Source knee pole chooses the bend plane; local boot Z offset contributes
// to the knee's rest angle. Restore the captured boot world quaternion.
```

- [x] Integrate restore after chest/spine restore and before directional/ground
  restore. Include form replacement and KO history retirement without changing
  ragdoll capture. Airborne poses only fade existing support, without foot IK;
  exclusive poses take ownership immediately.
- [x] Verify real boot anchors/orientation, fixed lengths, rendered clearance,
  releases, form/guard/KO and ground-to-air handoff. Run focused spine/axial/ground
  suites; diagnose any new regression before accepting this task.

### Task 2: Playable evidence and retained-state audit

**Files:** create `tools/ground-axial-support-browser.mjs`,
`docs/GROUNDED_AXIAL_SUPPORT_PASS.md`; update the acceptance ledger.

**Interfaces:** browser capture reuses the native fixture and complete effect
clocks. Labels identify fixed-position or integrated-travel evidence truthfully.

- [x] Capture final start/quarter/mid/three-quarter/end, loop wrap and release
  from front, both sides and rear. Inspect screenshots and video metadata.
- [x] Request bounded read-only review and repair demonstrated Important issues.
- [x] Run `node --test --test-concurrency=4 tools/*.test.mjs`, `npm run build`,
  `node tools/ground-live-check.mjs` and current Studio/gameplay browser checks.
- [x] Record exact results, source provenance, rejected attempts and remaining
  limits. Keep the original goal active unless its full scope is proven complete.

Retained report: `docs/GROUNDED_AXIAL_SUPPORT_PASS.md`. Forty-two support tests
pass after native-size, straight-leg-pole and reach-limit review repairs. Root
verification has 1,487 passes and four retained cloth failures. Functional
support is retained; the over-arched extreme pose and steep-camera readability
are specifically not accepted as polished visuals. The full goal remains active.

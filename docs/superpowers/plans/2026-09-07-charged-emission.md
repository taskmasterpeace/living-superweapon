# Charged emission implementation plan

> **For agentic workers:** Use the existing active workspace and execute inline, test-first. Preserve all other work. No branch integration or commits in this bounded repair.

**Goal:** Gathering and released energy follow the current anatomical emitter while charging preserves commanded travel unless explicitly authored otherwise.

**Architecture:** A shared semantic power-origin sampler resolves the final pose, rather than retaining mesh references or previous-frame orb positions. Existing deferred projectile launch runs once before portals/contact. Input, costs, charge scaling and pose arbitration remain authoritative.

**Tech Stack:** Existing JavaScript, Three.js, Node tests, Vite, Playwright.

**Spec:** `docs/INDEPENDENT_COMBAT_ACCEPTANCE.md`, active independent movement/aim goal.

## Constraints

- No map redesign, asset replacement, physics migration or copied BFP implementation.
- Preserve paid-charge/refund/drain rules, remote shots and one-shot launch semantics.
- Keep existing beam hoses and their small gathering field unchanged.
- Report unproven collision/silhouette cases instead of certifying the whole roster.

## Task 1 — movement

Files: `src/engine/abilities.js`, `src/engine/cast-channels.js`, `src/data/attack-tuning.js`, `tools/charged-emission.test.mjs`.

- [x] Reproduce hidden charge damping at 30/60/120 Hz with real `runSlot`; assert unchanged velocity without authored penalty.
- [x] Remove `c.vel.x *= .85; c.vel.z *= .85` from `charge`; include live charge preparation in `castingMoveScale(f)`.
- [x] Expose `number('castMoveScale','Movement while casting',0,1,.05,1)` on charge authoring; validate profile save/load and real `Fighter.move` penalty/recovery.

## Task 2 — final anatomical source

Files: new `src/engine/power-emission.js`; `combat-pose.js`, `abilities.js`, `projectiles.js`; same tests.

- [x] Test actual one-hand/two-hand/chest/eye sockets while moving and hovering. Compare final emitter and visible gathering sphere, then release after translating the root and changing aim.
- [x] Implement `powerEmissionPosition(f, source, out)`: semantic hand midpoint/eye midpoint/chest/palm; optional sphere radius offsets the solid core in front of its source rather than burying it in the body.
- [x] Move charge orb and its pending gather effects after final combat articulation. A beam's existing gather radius does not become a projectile radius.
- [x] Extend deferred projectile launch with `powerOrigin`; snapshot target before animation and re-sample current rig once. Emit release flash at that same final source.
- [x] Test minimum-charge fizzle, drain, interruption, resource cleanup, form replacement and launch-frame portal idempotence with existing production fixtures.

## Task 3 — inspect and verify

Files: new `tools/charged-emission-browser.mjs`, `docs/CHARGED_EMISSION_PASS.md`, acceptance ledger.

- [x] Capture actual Studio attack sequences across time and multiple views. Inspect hand/torso silhouette, launch transition, movement, cover and recovery; record measured limitations.
- [x] Run new tests, charge energy/position, remote/split, pose/arm/cover, concurrent, firearm and Studio regression tests, then `npm run build` and scoped whitespace checks.
- [x] Request bounded review after changes and record evidence without claiming AAA completion.

Execution added test-driven fixes for compressed preparation at cover, charged vertical contact, held portal/body transfers, close-radius target reversal and material ownership. The first capture's wall was below its hover actor; corrected before acceptance. Final evidence and limits: `docs/CHARGED_EMISSION_PASS.md`. The broad goal remains active.

# Directional Combat Motion Implementation Plan

> **For agentic workers:** Use the test-driven-development skill and scoped independent dispatch where files do not overlap. Execute under the creator's standing authority; no approval interview, commits, worktree migration or cleanup of unrelated changes.

**Goal:** Make grounded motion and ranged aiming work together, improve contact weight, and expose attack pose choices in Studio.

**Architecture:** Simulation remains authoritative. Visual heading and reversible upper-body transforms feed the existing source gait and final emitter IK. Contact feedback is independently debounced at the real beam collision seam.

**Tech Stack:** JavaScript, Three.js, Node test runner, Vite, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-07-directional-combat-motion.md`

## Global Constraints

- No map redesign or camera angle changes.
- No purple except KIVULI; no imported copyrighted artwork.
- Preserve dirty checkout, local Studio drafts, rig/ragdoll contract and player/bot symmetry.
- Beams remain traveling hoses; contact feedback never creates beam stunlocks.
- One browser/GPU verification lane; no file writes during captures.

### Task 1: Ground motion and split aiming

Files: `src/engine/ground-motion.js`, new `src/engine/directional-pose.js`, `src/engine/entity.js`, `src/engine/combat-pose.js`, new `tools/directional-pose.test.mjs`.

- [x] Add a real Fighter regression: set grounded velocity `(14,0,0)`, aim `(0,0,1)`, sustain a beam, tick 120 frames. Assert source gait remains active and changing knee angles, visual travel and head headings differ, emitter remains on its ray, physics position/velocity unchanged.
- [x] Run `node --test tools/directional-pose.test.mjs` and observe the missing gait/split-heading failure.
- [x] Implement `groundHeading(f)` and reversible `animateDirectionalAim(f,dt)`/`restoreDirectionalAim(f)` at existing overlay seams. Use bounded yaw, source hips, range-cast exemption from gait cancellation and final emitter IK; preserve exclusive combat states.
- [x] Run new test and existing ground/combat/skin/weapon tests; test loops, scales, rest recovery and transition ownership.

### Task 2: Beam contact weight

Files owned independently: `src/engine/projectiles.js`, `src/engine/hit-reaction.js`, new beam contact helper/test as needed.

- [x] Write an actual contact regression: a sustained hit changes visual reaction but does not set hitstop/stun; miss/guard/invulnerability branches remain correct and feedback rate is bounded over one second.
- [x] Run it failing before changing production.
- [x] Add debounced actual-contact pulse, use existing impact/audio hooks and spring recoil, preserve health/strength pressure behavior. Do not add a second simulated ragdoll controller.
- [x] Run impact and beam tests and report exact modified seams for integration.

### Task 3: Pose authoring and preview

Files: `src/data/attack-tuning.js`, `src/tool/studio-profile.js` only if needed, `src/tool/studio-main.js`, pose tests and Studio round-trip tests.

- [x] Write validation/round-trip tests for applicable `castStyle` enum presets and invalid combinations before implementation.
- [x] Add enum schema handling and Studio select using existing field styles. Implement optic-focus / palm / two-hand / chest-brace presentation in the shared aim layer, without changing emitter type or power values.
- [x] Add a moving lateral-cast review path using real source gait and target. Exercise authored choice in the actual Studio UI.
- [x] Run scoped Studio runtime/profile/inspection, pose and package checks. The whole legacy `test:studio` aggregator was not rerun; the new real multi-beam/charge authoring browser test covers the changed UI, storage and import/export paths directly.

### Task 4: Integrated review

- [x] Run focused suite plus production build after all edits settle.
- [x] Capture walk/jog/side-cast with ground, opponent and equipment from front/both profiles/rear; review sequences as well as stills.
- [x] Document references, actual changes, evidence and any remaining limitations. Do not label the whole game complete or 10/10.

## Execution record

- Initial findings: source ground layer is disabled by any combat blend; root yaw always follows aim; beam-only final aiming excludes ordinary guns; source hip counterrotation is off in walking; damage-over-time beam hits skip the visual reaction spring.
- Scope ruling: use the existing KO ragdoll and improve launched-hit presentation only if it can be made safe; do not introduce an unbounded knockdown/stunlock mechanic as a cosmetic fix.
- Independent review plus RED regressions drove sharp-turn neck limits, high-angle moving eye alignment, source-to-guard carrier handoff, Studio health-reset contact acceptance, actual chest origin, infinite-core charge detection, and bidirectional editor/preview slot synchronization.
- Final verification: 141 focused runtime/data/skin/package tests and 120 source/strike/flight/guard/profile checks pass. The latter includes an existing all-roster profile browser test; it was discovered to overlap part of a capture, so recordings are not performance evidence. No source edits occurred during captures.
- `test:poses` passes all six browser gates. Real input movement/shooting, ground/flight/punch transitions, Studio ground/strike rehearsal, moving melee, blocking/KO, hit reactions and new pose-authoring import/export browser gates pass with no errors. Source/target and moving-cast capture scripts finish cleanly. `npm run build` passes, 235 modules; pre-existing large-chunk warning remains.
- Evidence, references and remaining asset/contact limits: `docs/DIRECTIONAL_COMBAT_PASS.md`.

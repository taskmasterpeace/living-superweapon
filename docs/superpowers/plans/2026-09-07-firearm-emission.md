# Firearm Emission and Equipped Motion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make firearm rounds and flashes leave the actual animated barrel, with independent travel/aim and no free shots through nearby cover.

**Architecture:** Add named muzzle sockets to existing modular weapons. Rifle commands snapshot the chosen socket and target, then the projectile manager resolves its final rendered transform before collision/travel. Keep body-power emitters separate. Equipped weapons use the driven hand, including form rebuilds and removal.

**Tech Stack:** Existing JavaScript, Three.js, Vite, Node tests and Playwright. No engine migration or new asset dependency.

**Spec:** `docs/INDEPENDENT_COMBAT_ACCEPTANCE.md`, active goal attachment, and creator feedback in this task.

## Global Constraints

- Beams remain traveling hoses. No map redesign.
- Preserve input/cost/cooldown symmetry between players, bots and Studio.
- Do not reposition the simulation root to fake an animated source.
- Preserve uncommitted user work; no reset, whole-worktree commit or source migration.
- Inspect actual equipped moving figures; isolated sockets and static hero shots are insufficient.

## Task 1: Final-pose firearm emission

Files: `src/engine/figure.js`, new `src/engine/weapon-emission.js`, `src/engine/abilities.js`, `src/engine/projectiles.js`, `src/engine/combat-pose.js`, `tools/firearm-emission.test.mjs`.

Interface: `firearmEmitter(f,def)` returns `{hand,socket,side,weapon}` for the selected gun, or a right-hand fallback for gunless repulsors. Named `weapon-muzzle` Object3D children live on each firearm group along local -Y. Explicit left-hand pistol selection must control that arm, not the right-hand rifle.

- [x] Add real Fighter/StudioCombat tests for SARGE carbine, MERC left pistol, TITAN hover and a gunless repulsor. After `runSlot`, advance the production pose, then `shot.resolveLaunch(g)`; assert actual muzzle distance < 1e-5, target alignment > .99999 with zero spread, flash origin identical, and no subsequent attachment after movement.
- [x] Run `node --test tools/firearm-emission.test.mjs` and record the pre-fix mismatch.
- [x] Add muzzle sockets at the actual modeled barrel ends: rifle `(0,-2.15,.16)`, pistol `(0,-1.05,.28)`, shotgun `(0,-2.3,.14)`, SMG `(0,-2.15,.05)`, sniper `(0,-4,.05)`. Convert legacy guns to the same registry group while preserving their tip decoration.
- [x] Replace pre-pose rifle emission with deferred socket resolution and command-target snapshot. Sample spread once at input, preserve projectile speed and elevation, emit one flash per trigger (not per pellet). Keep ordinary eye/chest/hand powers on their existing sockets.
- [x] Test close/steep targets, release/re-entry, 30/60/120 Hz, shotgun pellet/flash count and portal idempotence.

## Task 2: Equipment lifecycle and cover

Files: `src/engine/game.js`, `src/engine/entity.js`, `src/engine/weapon-emission.js`, `src/engine/combat-pose.js`, `tools/firearm-emission.test.mjs`.

- [x] Reproduce root-mounted scavenged gear. Attach held weapons to the driven fist, hide only replaced native equipment, and restore native visibility/grip on removal. Form changes must transfer held gear before disposing old resources.
- [x] Add actual equipped approach/hold/release/retreat checks against a thin interior wall. Measure rendered gun vertices, not just a muzzle point. Implement bounded grip/arm retraction only if it can maintain clearance and an honest barrel direction; do not add an invisible launch offset.
- [x] Record any uncovered weapon/body/corner cases explicitly rather than claiming global clipping closure.

## Task 3: Authoring, captures and regression

Files: `src/tool/studio-combat.js`, new `tools/firearm-emission-browser.mjs`, acceptance documentation.

- [x] Include real rifle slots in Studio attack rehearsal, with the same silent gunshot event interface; authoring must exercise production firing rather than a mock effect.
- [x] Capture moving equipped front, back, left and right views plus grounded/hover and close-cover sequences at `artifacts/firearm-emission/`. Check page errors, actual source separation, shot count and wall penetration.
- [x] Run firearm, volley, independent aim, beam cover, hand cover, equipment/form, input and melee regressions; run `npm run build` and scoped whitespace checks.
- [x] Request read-only review of the bounded changes, address reproduced defects, and update the acceptance ledger with proof and remaining gaps. Keep the broad goal active.

## Execution notes

The emission, grip and final-pose changes share the same state and are being implemented locally in sequence. Independent review comes after the implementation. This continues the user's existing dirty checkout; no branch/merge/commit operation is part of this pass.

Executed: 42 focused firearm tests; 520 passing regressions across 46 files; 920 inspected capture frames/86 rounds with zero source gap, protected-target damage or browser errors. Build passes with the existing large shared-chunk warning. Real SOL/SARGE live travel/aim/recovery checks pass. Review-driven RED-to-GREEN fixes and bounded remaining geometry/authoring/performance limitations are recorded in `docs/FIREARM_EMISSION_PASS.md`. A directly observed slow-pistol raise/drop cycle was also reproduced and fixed; held stance stays ready without changing shot cadence. The broad goal remains active.

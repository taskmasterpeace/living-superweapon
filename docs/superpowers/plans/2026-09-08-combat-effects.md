# Combat Effects Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans task-by-task. Preserve this shared dirty checkout; no commits or staging of unrelated work.

**Goal:** Improve impact, shield, charge and construct presentation in gameplay and Studio.

**Architecture:** Adapt the existing combat outcomes into bounded render effects. Parameters are per-character presentation data; no new damage authority or render loop.

**Tech Stack:** Existing Three.js 0.169, JS, Vite, node:test, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-08-combat-effects-design.md`

## Global Constraints

- No cape edits, map changes, dependency/framework migration, remote code or asset imports.
- Preserve traveling hose collision, damage, guard chip, deflection rules, input, camera, and charge timing.
- Shared Studio/gameplay production objects, finite resources, simulation-time animation.
- Green comes from existing construct colors; other custom colors remain supported.

## Task 1: Particle construct renderer

Own `src/engine/construct-surface.js`, construct portions of `src/engine/summons.js`, and `tools/construct-surface.test.mjs`. Read `docs/superpowers/plans/2026-09-08-construct-task.md` for exact requirements and tests. Do not edit Studio or profile files.

- [x] Write and run failing real-object tests for formation, moving anchors, lifecycle, density bounds.
- [x] Implement `ConstructSurface(root, {color, assemblyTime, density})`, `update(dt, remainingLife)`, `dispose()`; use `owner.def.effects?.construct` for settings.
- [x] Wire existing Construct only; preserve actions and collision. Verify tests.

## Task 2: Contact shield and charge presentation

Own new `src/engine/shield-surface.js`, `src/engine/entity.js`, `src/engine/figure.js`, `src/engine/projectiles.js`, `src/engine/vfx.js`, `src/engine/charge-gather.js`, `src/engine/abilities.js`. New tests `tools/shield-surface.test.mjs`, `tools/effects-profile.test.mjs`, `tools/charge-gather.test.mjs`.

- [x] Write failing tests for shield hit localization and decay, density/time validation and charge motion.
- [x] Build a bounded local contact ripple material on existing guardArc geometry. Use a per-figure hit queue, simulation dt and actual received direction/contact when supplied.
- [x] Extend accepted beam contact presentation with bounded backward pressure spray, without changing timing/damage. Spray opposes incoming direction; this is not a full rigid-body surface-normal solve.
- [x] Improve existing ChargeGather silhouette/staging, also attach it to charged projectiles. Preserve socket and cleanup paths.
- [x] Run focused and existing beam/guard/charge regressions.

## Task 3: Studio authoring and integration

Own new `src/data/effects-profile.js`, `src/tool/studio-profile.js`, `src/tool/studio-main.js`, `src/tool/studio-preview.js`, `src/tool/studio-combat.js`, `src/tool/character-package.js` if needed. Settings `effects.shield`, `effects.charge`, `effects.construct`; all optional with validated defaults.

- [x] Tests require roundtrip into `applyProfile`, unknown/nonfinite values rejected, old profiles retain defaults, color remains hero-owned.
- [x] Add compact Effects inspector fields to existing tabs; extend existing attack rehearsal for native constructs and deterministic cleanup/reset.
- [x] Reuse validated profile in both game and editor; no preview-only effects. ORIGIN kit edits preserve imported effect settings.
- [x] Capture assembly/mature construct, charged attack and shield contact, test export/reimport, run build and focused regressions.

## Progress

- Research complete, user approved scope and construct direction.
- Implemented and verified on `codex/construct-effects-pass`; existing working files preserved. No commit/staging performed.
- Independent review fixes: projectile contact location, status-tick rejection, KO/respawn shield lifecycle, partial-arc clamping, exposed fist details. Visual review also fixed tilted wall placement and detached beam detail orbs.
- Evidence and authoring guide: `docs/COMBAT_EFFECTS.md`. This completes the scoped effects pass, not the overall game or future military/infection systems.

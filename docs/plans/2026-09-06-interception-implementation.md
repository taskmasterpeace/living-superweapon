# Attack Interception Implementation Plan

> Execute with superpowers:subagent-driven-development. Preserve the existing dirty checkout; no commits, branch switches, catalog edits, or map work.

**Goal:** Actual contact-based projectile priority and energy-qualified bullet interception, exposed in Character Studio.
**Spec:** `docs/plans/2026-09-06-attack-interception-next.md`.
**Architecture:** Add a manager-owned synchronized contact phase for participating shots, before irreversible impact/damage. Keep inactive catalog behavior unchanged. Pure geometry helpers determine earliest normalized contact time; production classes own resources and effects.
**Tech stack:** existing JavaScript/Three.js/Vite and Node/Playwright tests, no new dependencies.

**Status:** all four tasks implemented; independent review findings closed and focused Studio, altitude, full camera/flight/combat/build checks passed. The task checklists below are the original test-first work specification, not the current status ledger. See `.superpowers/sdd/2026-09-06-interception-implementation/progress.md` and `docs/BFP_PARITY_LEDGER.md` for final evidence and conservative beam-field timing limits.

## Global constraints

- `collisionPriority`: integer -1 (off) or 0–16. Both projectiles must participate; allies never clash. Higher survives, ties retire both. The field is optional and defaults off.
- Split children start with priority off: a parent cannot multiply its defensive capability by splitting.
- Preserve actual owner/team after deflection, remote lifecycle, traveling beams, world/shield/prop collision precedence, existing damage, and single resource return.
- No purple, no map edits, no edits to `src/data/characters.js`, no browser concurrency. Use apply_patch for edits. No source edits during browser verification.
- Review the current source rather than a clean checkout that would omit 252 existing user/agent changes. No broad git mutation.

## Task 1: Projectile priority runtime

Owner: runtime worker. Files: `src/engine/projectiles.js`, new focused `src/engine/attack-interception.js` (and geometry helper if needed), `tools/attack-interception.test.mjs`.

- [ ] RED tests using real Projectiles manager: opposing radius1 shots from z0 and z10 at velocities +600/-600 over 1/60s meet before either reaches the opposite endpoint. Priorities 2/1 leave the first alive; 1/1 retire both; omitted priority/allies leave both alive.
- [ ] Add time-aligned swept contact, not merely segment intersections. Different-time crossing paths and altitude-separated paths must miss. Reverse manager list order must produce the same outcome. Resolve multiple contacts in earliest-time order and deterministic tie order.
- [ ] Factor preparation/commit only where participating trajectories require it. Homing/gravity/wind cannot be applied twice. The normal inactive path remains unchanged. Bound steering intervals for curved motion.
- [ ] Earlier ground/cover/interior/dome/thrown-prop/fighter contacts prevent a later invalid pair interaction. Pair neutralization occurs before fighter damage. Query these limits without applying their side effects speculatively; commit ordinary contacts at actual contact position. Test thin walls and actual shield/prop state changes.
- [ ] Use disposal plus one restrained contact spark/ring; no explosion/detonation/splitting on neutralization. Test current deflected ownership, remote dead reference, single light return, no later update, and explicit split-child opt-out.
- [ ] Verify 30/60/120 Hz and fast authored shots, natural obstacle/foe outcomes, legacy remote/split/beam-clash tests. Write report with exact RED/GREEN evidence and implementation hooks.

## Task 2: Production definition and portable authoring integration

Owner: controller, distinct files `src/data/attack-tuning.js`, `src/engine/abilities.js`, `tools/interception-tuning.test.mjs`.

- [ ] RED: `setAttackOverride({}, def, 'q', {collisionPriority:2})` on a genuine projectile source must reconstruct and export/import the actual field. Beam definitions reject this projectile-only field; noninteger/out-of-range priority rejects before persistence.
- [ ] Add numeric metadata for projectile, charge and volley, default -1; runtime spawn options forward it. Source identity and existing custom-package serialization do not gain an alternate data path.
- [ ] Verify real shared runSlot launches priority-bearing shots, while untouched catalog definitions remain off and splitting does not propagate parent priority.

## Task 3: Beam bullet interception

Do after Task 1 review; owns the same runtime contact resolver. Separate opt-in beam capability, actual traveled segments only. Define an explicit invested-ki counter at emission (entry plus preparation spend, and paid sustain), carry it to the beam, and compare against an authored threshold. Do not substitute remaining ki or visual color for invested energy. Infinite-core energy credit follows equivalent configured spend without subtracting resources. Detailed RED fixtures follow the Task 1 preparation API; do not invent a second resolver.

## Task 4: Studio contact proof and release gate

Use the existing Attacks inspector and real production sequence. Add opposing-fire preview with actual priority outcomes; authored fields must persist through new/import/reload/PowerWorld. Show collision outcome and surviving shot count, not fabricated damage. Inspect desktop/mobile and target readability. One GPU lane for browser checks. Independent runtime and finish reviews precede broad combat/camera/flight and build verification.

## Later user-requested stages

Transformation/body-swap and attack-unlock tracks, model/audio imports, and mode/network verification follow as separate subsystem plans. Novel additions should improve combat or authoring (e.g. replayable interception test patterns), not map design or unrelated features. No overall 10/10 or complete-parity claim from passing unit tests.

# Attack authoring implementation plan

## Design / authority

Continue the user-approved BFP successor work without a new design interview. Preserve the six flight languages, camera clearance, lighting and map. Add real attack authoring to the established Character Studio: select a slot, change relevant parameters, test contact, save and package the same definitions used by players and bots.

An optional version-one profile `attacks` section contains sparse, validated overrides, tied to the source attack identity. Unsupported keys, types, nonfinite values and incompatible charge ranges must fail before persistence. A kit replacement must never inherit a different attack's tuning. Reset must restore original catalog values even after repeated application. Legacy profiles remain valid. No authored value may be displayed but ignored by runtime fallback behavior.

Review clarification: authored charge radius and damage endpoints must be strictly increasing, and maximum blast must exceed the fixed 8-unit starting blast. Equality removes charge growth and violates the charge=scale rule. Travel speed may remain equal across charge. Accept only the actual production slot names, not arbitrary identifier strings.

## Global constraints

- No map changes, no camera retuning, no changes to shipped character catalog.
- Existing dirty work belongs to the user; no broad commits, resets or branch changes.
- Use production abilities and projectile rendering, not mock attack visuals.
- Warm charcoal/amber existing Studio, accessible controls, undo/save/import/export retained.
- Test failure before implementation; verify storage and actual runtime definitions.
- Attack tuning is unbalanced authoring, not a claim that catalog point budgets evaluate arbitrary edits.

## Task 1: Validated attack tuning and persistence

Own `src/data/attack-tuning.js`, `src/tool/studio-profile.js`, narrowly scoped `src/data/creator.js`, and new `tools/attack-tuning.test.mjs`.

1. Add tests first for beam, projectile, volley and charge fields; reject invalid fields/nonfinite/bounds and incompatible min/max pairs.
2. Implement a pure metadata/validation/application module covering only parameters actually consumed by these production ability types. Use positive lower bounds where runtime uses truthy defaults; zero may be allowed only where runtime honors it. Preserve all untuned nested fields and source definitions without compounded application.
3. Optional profile overrides round-trip. Apply to actual abilities; preserve original basis/identity for reset. Restore compatible overrides on ORIGIN edits, discard changed attack identities rather than silently applying stale tuning.
4. Verify shipped defaults unchanged, repeated apply/reset, legacy profiles and character package reconstruction using Node tests. No browser tests while controller works.

## Task 2: Studio attack inspector

Own `src/tool/studio-main.js`, `src/tool/studio.css` if needed, and browser authoring tests. Use Task 1 public API. Add attack slot selector and only supported fields, reset slot, clear indication of unsupported types. Rebuild actual preview slots on changes; preserve undo history and dynamic accessible tab navigation. Saved values must install in gameplay and survive portable packages. Show tuning is outside ORIGIN point balance.

## Task 3: Production attack contact preview

Own `src/tool/studio-combat.js`, relevant preview integration, and focused production preview tests. Extend beam target encounter to projectiles, volleys and charge shots. Drive production runSlot with deterministic input edges and clean up all resources on seek/change. Verify low/high edited values change measured contact and actual projectiles; errors are not swallowed. Keep moving-target/elevation tests and beam regression.

## Verification / continuation

Run focused authoring tests, character packages, Studio, camera clearance as needed, build and visual inspector review. Update BFP parity ledger with evidence and remaining lifecycle/progression/view/mode gaps. Continue with attack lifecycle only after the authoring path is proven; do not mark full BFP parity complete from this slice.

## Execution ruling

Use sequential implementation tasks with independent review per the subagent-driven development skill. Work in place because essential prior implementation is uncommitted in the user's dirty checkout. Review owned file snapshots instead of committing unrelated user changes. Cost: no isolated commit-per-task review; record exact files and focused evidence here. No duplicate implementation agents or concurrent GPU tests.

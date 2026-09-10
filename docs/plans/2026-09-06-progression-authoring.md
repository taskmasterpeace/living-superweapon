# Next subsystem: authored progression

User direction: finish the BFP-inspired combat/editor, add meaningful features, exclude maps. This stage is not a claim of original-BFP rules parity.

## Contract

- Optional per-character level gates (1–10) for the existing seven runtime slots. Absent gates preserve every shipped kit. A locked press explains the required level and pays nothing; players, bots and replicated runSlot input share the same gate. Existing slots/cooldowns/remote references retain identity.
- Optional level-keyed transformation appearances (2–10) combining costume module, hair color, body proportions and palette. Highest reached form applies. This is a figure-only change on the SAME Fighter, not respawn/character replacement, and adds no hidden combat multipliers. The existing tier/stat rules continue to own power growth.
- Infinite-energy fighters remain tier-capped at II: visual form lookup caps its effective level at6. Attack gates use actual level, separately from that visual tier cap.
- Dead/ragdoll actors queue appearance changes until their exact rig snapshot restores. Live swaps preserve position, velocity, aim, HP/ki, cooldowns, AI, inventory, held gear, active attacks, player/target identity and world-space wake ownership. Dispose only the replaced figure's resources.
- Studio exposes an explicit Progression inspector and level preview using the production progression/rig swap, not a duplicate animation. Default character remains untouched. New/Import/Export/Save/Undo/ORIGIN edit preserve validated tracks and gates in the same portable profile/package.
- No arbitrary GLTF/audio importer or network-parity claim in this slice; those have separate integration/security/lifecycle work.

## Proposed data boundary

Use optional `profile.progression = {unlocks:{slot:level}, forms:{level:{name,model,frame,colors}}}`. Sparse appearance values use existing presentation limits and color policy. Reject unknown slots, unsafe keys, noninteger/out-of-range levels and invalid modules/colors before storage. `applyProfile` produces `def.progression`; runtime selection is data-only. Editing a power kit retains the tracks explicitly. This extends the existing profile which already carries gameplay attack overrides, avoids breaking the strict v1 ORIGIN recipe shape, and defaults to no behavior changes for legacy files.

Ruling: gates are slot policies (not per-source attack overrides), so an explicit gate remains when an author changes the power in that slot. The editor must state that distinction. Cost if wrong: a future source-identity policy requires reconciliation/migration.

## Implementation order / evidence gates

1. RED portable progression validation, sparse defaults, profile/package round trip and ORIGIN edit retention; implement pure selection/validation and persistence.
2. RED runtime same-Fighter figure swap with hurt/drained/flying/locked/active attack, gear and resource ownership; queue across KO restore; implement isolated figure rebuild. LevelUp hook executes in quiet and visible paths. No source catalog edits.
3. RED shared runSlot gate at N−1/N, AI selection, locked HUD reason and stable slots. Implement production gate and display.
4. Real Studio level preview, editable gates/forms, save/undo/reset, desktop/mobile. Use current modular rig and UI contract, no shell redesign.
5. Independent review, serial browser visual captures at level1/4/7/10 and KO/respawn, package export/import/reload/kit edit, broad combat/flight/camera/build checks. Streaming levels to remote peers is explicitly deferred until network verification, not silently claimed working.

Exploration hooks supplied by /root/transformation_hooks: entity ctor182/figure190, dispose484, _updateKO1346; game levelUp2607; abilities runSlot1063; AI pick315 and ongoing action233; HUD buildSlots1889/update2034; studio-profile validate50/fromDef83/apply103; creator saveCustom359.

Status: implemented; focused tests and independent state/rig review pass. Broad progression regression refresh passed: build 215 modules, all 53 roster kits × 7 checks, world 42/42, 30-second eight-fighter soak (1,347 hits / 15 KOs), full camera and flight suites. Later examples/audio work has its own refresh gate.

## Implementation rulings and evidence

- Fighter/root/position and hero name retain identity; the optional form label is `formName`. A form swaps only figure roots, not the fighter or its live slot states. A changed flight language uses its default pose family, explained in the form dialog; same-language changes retain base authored targets.
- Retired geometry/materials remain alive while discoverable in-scene borrowers (holograms/spectral clones) reference them. Cleanup checks run on swap/removal and at 4 Hz only while retirement is pending. Off-scene borrowers are not discoverable. After actor disposal, changing a borrower resource without removing it can defer retirement until its ancestor is removed. Existing effects use removal lifecycles.
- Combat preview level changes replay the scripted encounter at the same timestamp. This deliberately resets previously paid charges/remote attacks; otherwise a level-1 preview could still contain a level-4 attack. Ordinary model/flight preview swaps the same Fighter. No XP or level stat growth is simulated in Studio.
- Locked powers expose their required level on desktop HUD and phone/tablet touch buttons. Touch dash correctly mirrors the shift slot. Existing paid remote control is not treated as a new unaffordable/locked launch.
- RED/GREEN: validation/profile/package retention; shared input/AI gate; quiet level-up selection; form-editor sparse fields; real rig lifecycle; browser preview falsely reporting in-flight while locked; down-level leaving a charge alive; missing desktop and touch gate labels. All focused checks now pass.
- Browser package fixture authors STARLING with forms at 4/7/10, exports, imports into a fresh context, reloads and edits its ORIGIN kit. Actual game level-ups preserve an active beam, actor and slot identities; real KO restore applies a queued form. Captures and portable sample: `artifacts/character-packages/starling*`.
- Run `npm run test:progression`, `npm run test:character-packages`. Screenshots: `artifacts/progression/`.
- The actual attack preview dropdown now selects its requested slot instead of reverting to the inspector's old selection. Exercising real volley playback exposed fresh random spread on each seek. Studio now injects a repeatable gameplay-only spread seed; the production default RNG path is unchanged. Focused RED/GREEN and full attack-authoring browser pass. `tools/volley-replay.test.mjs` is included in `test:attacks`.

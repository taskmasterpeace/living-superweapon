# Animation content worker handoff

2026-09-12. Work in an isolated codex/ branch/worktree. Do not revert another worker, merge, deploy or change combat balance. Main agent owns Threat Room gameplay. This handoff describes the actual existing pipeline and the missing integration work; preview-only output is not a completed native animation.

## Existing contract and sources

- Read src/data/animation-catalog.js, src/data/strike-markers.js, src/engine/strike-motion.js and authoring/lib/humanoid-retarget.js.
- Four native banks: strike (jab/cross), heavy-strike (power), locomotion (idle/walk/jog/sprint), jump (takeoff/fall/landing). Source metadata pins Quaternius UAL Standard and UAL2 Standard with SHA256 and 60Hz sampling.
- Native frames currently contain 45 finite numbers. The exact channel layout comes from the production retarget/pose bridge; do not infer it or hand-write arbitrary arrays. Directions, anatomical rotations and foot suspension are authored; simulation translation stays owned by movement.
- Use authoring/recipes/motion/hero-ual/recipe.json and hero-ual2/recipe.json as templates. Inspect their actual joint mapping and source requirements before conversion. authoring/lib/humanoid-retarget.js supports recipe-driven slot mapping, orientation conversion and sampling. Check authoring/lib/slots.js and adapters.
- D:/git/ShootEM/tools/pose-packs contains 32 files, including Right Hook.fbx, Punch Combo.fbx, rifle/reload and zombie clips. This is an available candidate collection, not proof it is the exact pack the user meant or that every clip is compatible. Inventory takes, duration, joints, frame rate, root translation and finger tracks before selecting imports.

## Work sequence

1. Produce source manifest with original filename, source/provenance, hash, rig, units/up/forward axes and take names. Do not overwrite source files.
2. Choose one useful punch and one paired grab proof. For missing source motions, label procedural recipes explicitly; never present generated placeholders as imported clips.
3. Map source to supported native rig, normalize scale and handedness, sample through the existing adapter. Keep root motion out of gameplay position; report motion distance as metadata for movement tuning.
4. Export a versioned bank or authored package with stable clip IDs, duration, frame data, loop flag, source take, compatibility and contact markers. Melee source contactStart/contactEnd must be ordered within duration. Keep actual attack startup/active/recovery/damage in src/data/martial.js.
5. Register the bank in the catalog; a catalog entry alone does not wire native runtime dispatch. Assign through validated profile fields only. Current per-character marker assignment covers jab/cross/power; new move families require a runtime adapter and tests.
6. Preview small/large supported bodies, both hands, fist orientation, feet, weapon sockets, attacker/receiver grip alignment and ragdoll transition. No backwards wrist/thumb inside fist or floating attachment.
7. Native proof: hit, block, miss, interrupted grab, airborne carry and reset. Record a short clip and list exact scenario/input. Paired grabs need holder/receiver alignment plus release/counter markers; support shared hostile and friendly hold variants.
8. Deliver recipe, manifest, export, validation output, native clip and unresolved issues. Audio event IDs must bind through the existing audio library; mark unassigned explicitly.

## Existing commands (run from repository root)

- node authoring/bin/authoring.js build authoring/recipes/motion/hero-ual/recipe.json
- node authoring/bin/authoring.js validate
- node tools/export-animation-catalog.mjs
- node --test tools/animation-catalog.test.mjs
- node --import ./tools/helpers/css-test-hook.mjs --test tools/strike-marker-assignment.test.mjs
- npm run build

Use the target recipe path for your new content and scope tests to the actual consumer. Validate authoring catalog and native animation catalog separately; they are not yet one universal registry. Do not claim FBX support merely because a generic retarget function exists: inspect the source-loading adapter or convert through a documented reproducible step.

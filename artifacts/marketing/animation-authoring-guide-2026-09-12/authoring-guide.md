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
- node tools/validate-animation-bank.mjs src/data/strike-bank.json Melee
- node --test tools/animation-catalog.test.mjs
- node --import ./tools/helpers/css-test-hook.mjs --test tools/strike-marker-assignment.test.mjs
- npm run build

Use the target recipe path for your new content and scope tests to the actual consumer. Validate authoring catalog and native animation catalog separately; they are not yet one universal registry. Do not claim FBX support merely because a generic retarget function exists: inspect the source-loading adapter or convert through a documented reproducible step.

## Native bank frame contract

Run `node tools/validate-animation-bank.mjs <your-bank.json> "Melee"` before registering a bank. Other accepted categories are `Locomotion` and `Jump and landing`. Exit code 1 means invalid data; the JSON report lists issues per clip. This command reads files and never installs or overwrites content.

A bank contains a non-empty `clips` object keyed by stable clip names. Each clip needs a positive duration in seconds and at least two equally spaced frames. Every frame has exactly 45 finite numbers:

| Indices | Meaning |
| --- | --- |
| 0–2 / 3–5 | Left upper-arm / forearm unit direction |
| 6–8 / 9–11 | Right upper-arm / forearm unit direction |
| 12–14 / 15–17 | Left thigh / shin unit direction |
| 18–20 / 21–23 | Right thigh / shin unit direction |
| 24–27 | Pelvis quaternion, x/y/z/w |
| 28–31 | Body quaternion, x/y/z/w |
| 32–35 | Head quaternion, x/y/z/w |
| 36–39 / 40–43 | Left / right boot quaternion, x/y/z/w |
| 44 | Foot-suspension scalar consumed by the native support solver |

Directions and quaternions must have unit length (the validator allows 0.01 rounding tolerance). Zero-filled poses are invalid. Use the existing retarget recipe to produce the correct target basis; do not paste source joint translations into these direction slots. Melee clips also require `contactStart` and `contactEnd` in seconds, ordered within duration. Native simulation still owns movement and attack balance.

Passing data validation is not motion approval. Watch the full clip and loop seam on multiple body sizes, then verify the native contact, interruption and recovery cases above. Current library coverage is the four imported banks; procedural flight, grabbing and other runtime poses still require separate catalog adapters. Audio audit badges remain unaudited until actual assignments and playback are verified.

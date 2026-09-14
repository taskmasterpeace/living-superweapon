---
name: powerworld-character-authoring
description: Author or extend Power World modular humanoid parts and animation drafts using the UAL rig contract, character workshop, and separate Dec-52 mechanical rigs.
---

Use the existing character pipeline. Do not replace it with the fleet skeleton or an unrelated avatar system.

- Worktree at delivery: D:/lsw/.worktrees/combat-release-review, branch codex/playable-integration. Verify the current checkout before edits.
- Read docs/CHARACTER_AUTHORING_HANDOFF.md for tools and delivery boundaries.
- Humanoid contract: public/authoring/character-contract.json. Bone names in runtime are sanitized (DEF-spine003, DEF-handR), unlike Blender names with dots.
- Humanoid source is metres, Y up in GLTF. Primitive offsets are LOCAL to their bone. Do not use a world-height coordinate as a head-local coordinate.
- Dec-52 imports are game units: 0.19 metres per unit. Their rigid named pivots are a separate family. Do not apply UAL animation tracks to them.
- Headgear and rigid armor: export a powerworld-authoring-v1 JSON asset, validate with node tools/validate-character-asset.mjs FILE. The workshop imports these without an API. Clothing that crosses joints needs skin weights on the canonical skeleton, not one rigid chest socket.
- Use src/engine/character-authoring.js for validation, parts mounting and clip compilation. Do not create a second implementation of this contract.
- Simulation owns movement, damage, pickups and throws. Authored contact/release/controlReturn markers describe candidates until explicitly connected to the native action owner. A preview attachment is not proof of gameplay collision.
- Review motion over the whole interval, including entry, contact, release, recovery, interruption and loop wrap. Test small carrier / large victim and ground / air contexts. Preserve source and license; never label a procedural study as imported mocap.
- Save character recipes per roster ID and export JSON for transfer; browser persistence is scoped to origin/port and is not a team asset database.
- Run node --test tools/character-authoring.test.mjs tools/modular-character.test.mjs tools/modular-pipeline.test.mjs after changes affecting the contract, then npm run build. Keep commits scoped; no unrelated generated assets.

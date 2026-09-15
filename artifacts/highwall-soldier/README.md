# Highwall restored weapons and soldier equipment acceptance

Native build: http://127.0.0.1:5193/powerworld.html?highwall&scenario=corridor

## Result

Default rifleman and patrol soldiers now use the restored Patrol Rifle source, `prop.reference-weapon-rifle-m16@4`. Sidearm operators use the restored Service Duty Pistol, `prop.reference-weapon-pistol-1@5`. Heavy soldiers retain `equipment.kuchler-rifle@2`. Earlier carbine/sidearm placeholder packages are no longer these default roles' equipment.

The restored adapter pins package identities/hashes, verifies GLB bytes through the existing loader, maps grip-primary/grip-support/attachment-muzzle to the live contract, and rotates the complete source from Y-up/Z-forward to the native firearm axis. It does not alter a source vertex, rescale a gun, invent a new mesh, or change the source muzzle location. Source metadata remains unapproved; working integration does not automatically approve art.

## Corrected shared behavior

- Current faceted soldiers no longer asynchronously acquire the older clone-kit carrier on a second differently proportioned body. Shared skinned vest, helmet and backpack slots remain available.
- Modular palms meet actual weapon grip sockets after native motion retargeting. Gun, muzzle, body root and bone lengths remain authoritative.
- Logical inventory strips live equipmentReady Promises while preserving source asset identity. All three admitted gun types can move from casualty A through actual loot into soldier B's inventory and native equipped mesh, preserving ammunition/cooldown without a second grant.

## Reload limitation, explicitly

The restored M16 and pistol are single batched source meshes. They contain no separately articulated magazine or charging handle. They therefore report `static-source-no-action-parts`: normal firing and ammo/reload timing work, but a complete source-specific reload animation is NOT finished. No fake detachable part was fabricated. The existing Kuchler retains its physical magazine/bolt contact presentation. Its reload motion is the existing procedural timeline, not a newly purchased rifle reload.

## Native evidence

Run `node tools/highwall-soldier-browser.mjs` from the repository. Production Highwall, native W, left click and R; an unobstructed lane and existing free-look camera are arranged for inspection. Vite hot reload is disabled only in the evidence session.

`result.json`: 27 native screenshots, zero browser errors, eight actual mounted packages, no legacy clone carrier. Front/left/right/rear; six walk frames; four rifle firing frames; five reload timing frames and completion; wearable comparison on two body frames; three pistol firing frames. Both rifle and pistol spend real ammunition. Rifle reload restores actual rounds.

Key images:
- `source-restored-m16-detail.png`, `source-restored-pistol-detail.png`: original source models in the asset library.
- `idle-left.png`, `walk-3.png`, `fire-2.png`: restored rifle mounted on current body, native movement/firing.
- `pistol-fire-1.png`: restored pistol fires from the current character's hand.
- `wearables-A-front.png`, `wearables-A-rear.png`, `wearables-B-front.png`, `wearables-B-rear.png`: same shared helmet/vest/backpack recipe through loadModularCharacter on hero-frame A and agile-frame B. This proves recipe fit, not wearable ownership/loot UI.

Evidence is an action image sequence, not a video recording.

## Tests and provenance

53 focused tests passed: authored-assets, restored-equipment, clone-equipment, soldier-family, modular-soldier-equipment, modular-character, highwall-loot and inventory-game. The expanded real source death-transfer test separately checks restored rifle, restored pistol and Kuchler. Actual GLB palm tests sample 0, .25, .5, .75, .999 and 1.001 while stationary/walking and reload phases. Adapter tests verify original geometry identity/vertices, source-muzzle equality, handedness and class mismatch rejection.

Body: `public/models/modular-hero/modular-hero.glb`.

Walking: `src/data/locomotion-bank.json`, Quaternius Universal Animation Library Standard source at `assets-src/quaternius/AnimationLibrary_Godot_Standard.gltf`. Existing imported `Walk_Loop`, duration 1.333333373s. Armed hold/fire remains the native driver plus final contact correction.

Gun sources:
- `public/authored-assets/prop.reference-weapon-rifle-m16/v4/model.glb`
- `public/authored-assets/prop.reference-weapon-pistol-1/v5/model.glb`
- `public/authored-assets/equipment.kuchler-rifle/v2/model.glb`

The restored equipment library also owns shotgun/sniper and other weapon source models; this pass admits only the two explicitly tested source packages. Remaining adapters and full source-specific reloads remain unfinished. The older authored package viewer may still list older placeholder equipment: it is not the source of these two admitted defaults.

Baseline issue: three old-native extreme-aim support-contact tests in `tools/authored-equipment.test.mjs` fail at frame 0 even with all tracked src JavaScript loaded directly from git HEAD dd155d4 (`artifacts/baseline-modules.mjs`). No shared files were reverted. Broad extreme-aim acceptance is not claimed by this pass.

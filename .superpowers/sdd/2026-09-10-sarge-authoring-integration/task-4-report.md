# Task 4 report — authored equipment adapter and rifle reach

## Delivered APIs

- `createEquipmentMount(asset, {weaponKind})`: consumes the exclusive `{root, manifest, dispose}` returned by `loadEquipmentInstance`; applies the inverse primary-grip transform; returns a hand-local wrapper with `weaponKind`, direct `weapon-primary-grip`, `weapon-support-grip`, and `weapon-muzzle` aliases, `rifleContact`, `twoHanded`, and idempotent `userData.disposeEquipment()`.
- The optimized carbine's disconnected GLB geometry is split into real `weapon-magazine` and `weapon-charging-handle` meshes. `magazine-grip` is attached to the physical magazine. `weapon-stock-contact` is derived from the actual rear buttpad vertices in wrapper space. The sidearm intentionally has no stock or charging handle and remains one-handed.
- `loadFighterEquipment(f, {loader})`: begins validated package replacement from `f.def.model.assets.equipment`, retaining procedural attachments until a complete mount is ready.
- `replaceHeldEquipment(f, ref, expectedGear, {loader})`: replaces only when the exact `_gearHeld` identity, parts, rig, generation, living state, and disposal state still match. It commits pending paid launches through `unmountHeldWeapon` before changing the live muzzle.
- `invalidateEquipmentLoads(f)`: increments the fighter equipment generation so stale completions dispose their exclusive instance.
- `animateRiflePose` now has a bounded whole-rifle primary-grip pullback/inward search (maximum `0.9 * frame scale`) gated by both shoulder reach limits. It never lengthens an arm or moves the support socket independently; cover constraints are rerun for each candidate.

## Main wiring points

1. Constructor, after the final `parts`/rig exists and the fighter owns its fallback weapons: call `loadFighterEquipment(this)` without awaiting gameplay startup.
2. Immediately before a form/figure rebuild: call `invalidateEquipmentLoads(this)`; dispose attached authored wrappers with `userData.disposeEquipment()`. After the replacement rig and fallback attachments exist, call `loadFighterEquipment(this)` again.
3. KO entry and final `dispose()`: call `invalidateEquipmentLoads(this)`. KO must not detach ragdoll-captured attachments; only reject pending completions. Final disposal calls each mounted wrapper's disposal handle.
4. Respawn, after restoring/rebuilding the live rig: call `loadFighterEquipment(this)` if no valid authored mount remains.
5. Armory equip, after `_gearHeld` is the authoritative exact object: call `replaceHeldEquipment(this, selected authored ref, this._gearHeld)`. Drop/disarm first calls `invalidateEquipmentLoads(this)`, then the existing `unmountHeldWeapon` paid-shot commit, then disposes the authored wrapper.
6. Any successful replacement invalidates `_soldierLoadoutPresentation`; this adapter sets it to `null` so the next production presentation update rebinds real attachments.
7. Body package metadata remains `catalogBody`/frame metadata on the existing body. No replacement body GLB and no hidden body scale are introduced. Bind any future body socket aliases to the matching existing `parts.rig.sockets` during main's authored-character lifecycle.

## RED → GREEN evidence

- RED: `node --test tools/authored-equipment.test.mjs` failed with `ERR_MODULE_NOT_FOUND` before the adapter existed.
- RED: the production frame matrix then failed because `primaryPullback`/bounded real-rifle reach correction did not exist.
- GREEN: the authored-equipment test passes 11/11 against the shipped carbine and sidearm GLBs, including standard/heavy/lean frames and stale equip/drop/form/KO/dispose completions.

## Verification and limitations

- Passing focused suites: authored equipment, rifle contact, reload presentation, soldier loadout presentation, clone equipment, progression rig, and all 42 firearm-emission cases including thin-wall approach/retraction at 30/60/120 Hz.
- Follow-up root cause: main had not yet wired `loadFighterEquipment`. A read-only swap to baseline `bf0e883`'s `rifle-pose.js` made all firearm-emission cases pass, proving the regression came solely from Task 4's reach search running against the procedural rifle. The search is now gated by the authored wrapper's typed `userData.authoredEquipment` metadata; the procedural carrier remains byte-for-byte behaviorally on its established path. Thresholds were not changed.
- The shipped equipment manifests still label both procedural art packages `unapproved-placeholder`; this task does not claim art approval.

# Asset entry points — 2026-09-15

This index organizes the assets already in this checkout. Counts were read from production registries/manifests; listing an entry does not prove every combination has been played or visually approved. No new catalog or UI was built for this audit.

| Category | Authoritative entry point | Current count | Playable / preview boundary |
|---|---|---:|---|
| Firearms | `src/data/armory.js`: FIREARMS, firearmById, weaponById | 14 | Native loadout definitions; ammo and firing use production systems. Count is not proof every weapon is currently equipped or individually tested. |
| Melee equipment | Same file: BLADES, bladeById | 7 | bat, katana, claws, knife, tomahawk, baton, nodachi. Spear is not in this seven-entry blade registry. |
| Gear | Same file: GEAR, gearById | 16 | Native equipment definitions, subject to equipment policy and role. |
| Soldier loadouts | Same file: LOADOUTS, buildLoadout | 9 | patrol, swat, marksman, infantry, insurgent, specops, sniper, heavy, breacher. Existing in-game editor: `src/engine/armoryUI.js` → openArmory(game,hud). |
| Five integrated fleet models | `public/reference-fleet/catalog.json` | 5 | motorcycle, tank, mech-light, helicopter, jet-a. Controllers `src/engine/fleet-pilot.js`; movement `vehicle-motion.js`; class handling `src/data/fleet-handling.js`; rig animation `vehicle-rig.js`. This five-model subset is not the whole authored fleet. |
| Versioned authored packages | `public/authored-assets/catalog.json` | 13 | Shared package catalog, not 13 automatically deployed actors. Authoring viewer `authoring/viewer/index.html`; package manifests specify rig, clips, bounds and provenance. |
| Dog/wolf source models | `public/models/quadrupeds/manifest.json` | 2 models × 12 named clips | Wolf and husky GLBs from Quaternius. Includes attack, walk, gallop, gallop-jump, jump-to-idle, death and reactions. Missing dedicated run/trot, knockdown recovery and paired pounce victim are explicitly recorded. |
| Creature preview recipes | `src/engine/creature-character.js`: CREATURE_RECIPES | 4 | Thermavari articulated study, husky, wolf, hunter hound size study. `creature-foundation.html` / `src/tool/creature-foundation.js` offer playback, scrub, angle and export. Preview is not encounter activation. |
| Companion breed capability data | `src/data/companions.js`: BREEDS | 5 | Dutch shepherd, bloodhound, pit bull, Australian labradoodle, border collie. These are training/aptitude records, NOT five newly modeled or verified playable dogs. Two dog/wolf meshes do not implement all five breed appearances. |
| DEC-52 hound encounter | `src/engine/dec52-encounter.js`: createDec52Encounter | 1 hound encounter | Real Fighter health, movement and bite-contact adapter; `MeleeTrial.startCreature()` starts it in the Threat Room. Asset root `public/models/dec52/hound/`. This is a construct hound, not proof the organic alien predator is finished. |
| Procedural field-hound adapter package | `public/authored-assets/creature.field-hound/v1/manifest.json` | 1 package, 3 clips | 27-bone anyCreature adapter proof; idle/move/attack with contact markers. Do not conflate it with DEC-52, husky, or final alien dog. |

Firearm IDs: m24, m107, ak, m16, kuchler, battle, saw, mp5, pdw, pump, auto12, p9, magnum, machinepistol.

Equipment assignment restrictions live in `src/engine/equipment-policy.js`; imported equipment attachment in `src/engine/authored-equipment.js`; support-hand contact in `weapon-support-grip.js` / `weapon-grip.js`; action clips and attachments remain separate from weapon inventory entries. Character-owned abilities/equipment begin in `src/data/characters.js`, with armory loadout helpers supplying soldier kits.

The fleet catalog currently retains the text “Model candidates; gameplay integration pending” even though five controllers have been integrated. That acceptance string is stale for controller presence; it remains correct that visual/full gameplay acceptance is incomplete. Do not read it as either “nothing works” or “everything approved.” Each model URL identifies its exact authored version.

## Important alien/dog distinction

`hunter` in CREATURE_RECIPES is explicitly **a resized/tinted wolf**, 1.35m shoulder height. It is not the user's final organic alien dog mesh. `thermavari` is an upright articulated procedural study. DEC-52 hound is a different construct family. Keep these separate IDs and labels before expanding creature behavior; otherwise preview substitutes look like completed character delivery.

## Existing damage/event records that can explain the floating labels

When Threat Room is active, the real runtime API is:

```js
const trial = window.LSW.game.ms?.threatLab?.meleeTrial;
trial?.records;
trial?.recording.events;
trial?.recording.frames;
trial?.openReview();
```

`src/engine/melee-trial.js` owns records. `Game.onHit` forwards resolved outcomes to `trial.hit`. Contact records retain raw amount, actual healthLost, target HP, blocked, guardEnergySpent, guardBreakReason, incoming, actor role (0 player / 1 target / 2 ally), move and time. Strike-result records retain contact/no-contact/interrupted and approach/recovery context. The newest **100 records** are retained; resetting/clearing a trial can clear them. This is a bounded practice log, not a persistent global battle ledger.

`src/engine/melee-recording.js` owns pose frames and up to **128 event marks**, subsequently trimmed to the captured time window. `openMeleeReview` in `src/engine/melee-review.js` shows event buttons, recorded poses, camera choices and a record-action-clip control. Its downloads are `powerworld-combat-review.webm` plus `powerworld-combat-review.json` metadata. Review explicitly does not replay terrain or effects.

For post-hit meaning, `src/engine/hit-feedback.js` selects labels from resolved outcomes (armor, shield, block, guard break, actual HP loss, new status). `src/engine/entity.js` resolves those outcomes. Floating lettering is not the accounting authority. The practice contact record is currently the clearest existing explanation, although its compact fields do not retain every full absorption-pool detail from the outcome.

No new universal damage-log API was found or invented. Root can expose the existing trial records to players rather than building another overlapping log.

## Recommended grouping now

Use five groups in existing entry points: Weapons, Gear, Fleet, Companion Sources, Creature Studies/Encounters. Preserve the source package ID and version alongside any character assignment. Keep the organic alien dog marked study until its intended mesh and contact behavior are supplied. Next integration should select one representative item/actor from each group rather than increasing catalog counts.

# Character Studio evolution: costume recipes and shared animation families

2026-09-12. Proposal grounded in inspected source and current PowerWorld code; not a claim that these tools are complete.

## Inspected reference
The repository https://github.com/odasm/coh-server-original contains CostumeCreator/CostumeCreator.c, costume_main.c, uiAnimateCharacter.c/.h, uiLoadCostume.c/.h, plus solution/project files. The folder is not a self-contained transplant: shared definitions and game UI/client code also participate.
- Common/gameData/costume_data.h: CostumeRegionSet, CostumeBoneSet, geometry sets, saved region selections, body proportions and colors.
- Common/entity/costume.h: individual costume parts with geometry/textures/FX, four color channels, scale parameters, validation and costume changes.
- CostumeCreator/uiAnimateCharacter.c: selectable demo entries map to animation state flags in the existing sequencer; live avatar preview and screenshot action. This is not evidence that the creator supplies animation generation or automatic retargeting.
Sources: https://github.com/odasm/coh-server-original/blob/master/Common/gameData/costume_data.h ; https://github.com/odasm/coh-server-original/blob/master/Common/entity/costume.h ; https://github.com/odasm/coh-server-original/blob/master/CostumeCreator/uiAnimateCharacter.c . Architecture study only; no reference source or assets imported into PowerWorld.

## Proposed experience in our style
Keep Impact charcoal/gold controls and the large original stylized character in the center. Body-region navigation on the left; compatible parts or settings on the right. Bottom playback controls exercise the chosen appearance in motion. Front/back/side views and saved preset comparison are always reachable.

1. Identity: name, class, role, LeFevre threat and independent movement family. Cosmetic changes do not silently change those gameplay fields.
2. Body: shared supported frame proportions and head choices with bounded ranges. Start with current frame settings; add only proportions the rig/attachments can support.
3. Outfit: head, torso, arms/hands, legs/boots, back, emblem and equipment sockets. Parts carry rig/body compatibility, material, color-channel and attachment metadata. Hide covered underlying surfaces to avoid clipping. Weapon appearance must not grant unauthorized weapon equipment.
4. Palette/emblems: primary suit, secondary panel, trim, emissive and skin channels. Chest/back emblem placement shares one recipe. Preserve our deliberate simplified silhouettes and efficient materials.
5. Movement/combat: select shared families (brawler, agile, armed, speedster, flyer) then preview actual compatible animations. Fine controls expose source-contact mapping and presentation; attack profiles retain balance authority. Compatible left/right mirroring requires grip/socket validation.
6. Test/publish: show warnings, preview punch/block/carry/fly/fall, then launch a saved Threat Room scenario. One resolved appearance recipe must feed roster portrait, selection, Studio, live fighter and ragdoll. Save local/export/version/revert should be explicit.

## Repeatable content contract
A part has a stable ID, source recipe, compatible rig/body range, socket, occluded regions, color channels, materials and bounded geometry/texture budget. Register once; catalog and editor discover it. A move has a stable source/procedural reference, compatible family, markers and presentation events. Variants reference shared source rather than copying frames. Neither editing a costume nor previewing a punch grants gameplay permissions.

Acceptance for every new part: front/back silhouettes, proportion extremes, run, punch, guard, carry, flight and ragdoll attachment checks. Acceptance for every move: native hit/block/miss, recovery and reset plus emitted audio/VFX. Clearly distinguish preview success from native combat success.

## Best first proof
Use VEGAS: preserve bald head and original identity, author two outfit presets using the same supported rig, retain front/back V emblems, assign one compatible punch variant, and verify that selection/portrait/live gameplay/KO display the same selected preset. Add one compatible shoulder or gauntlet module as a second registration to prove automatic discovery and mounting. Then test a different body such as RAGE to expose compatibility boundaries. Do not expand to hundreds of costume parts before this round trip works.

Current foundation: ten authored clips cataloged and previewed; local contact-marker drafts save/reload/revert/export. Existing Studio profiles already supply portions of frame/palette/model customization. Still open: procedural catalog/preview, real shared move assignments, modular costume registry and complete appearance parity proof. Follow #23 and #35; preserve the combat-and-movement goal.

# Unified entry and authored asset restoration

`index.html` is the deployment hub. Existing query-based game links are forwarded to `powerworld.html` with their query and hash intact. The original PowerWorld title remains available for character selection and settings.

## Existing destinations

- Frontline desert: `powerworld.html?destination=desert`, using `PowerWorldStage` and the existing Frontline terrain.
- Vehicle proving ground: `powerworld.html?destination=vehicle-sim`, using the existing `deployVehicleSim` and its plateau, valley, basin and driving course. This sculpts the PowerWorld desert; it is not a newly invented independent map.
- Threat Room: `powerworld.html?destination=training`, using the existing `ThreatDeployment` preparation room.
- Highwall: `powerworld.html?highwall&scenario=combined`.
- Preserved city: `citygame.html`.
- Character editor, creature tools, construct motion tools, studio and authored package viewer retain their existing entry pages and now link back to the hub.

## Restored assets and boundaries

The source catalog was recovered from `D:/lsw/public/reference-fleet/catalog.json`; its 157 entries are retained in `tools/fixtures/fleet-catalog-source.json`. Missing package files were copied from that checkout without overwriting files already present in this worktree: 1,560 files, 190,826,765 bytes. The previously integrated five model URLs remain unchanged.

`public/asset-library/catalog.json` is the complete shared catalog. It separates 93 fleet models, 7 construct bodies/modules, 51 equipment/ordnance models and 6 facilities. `public/reference-fleet/catalog.json` contains only fleet entries. `public/character-assets/catalog.json` exposes the constructs. No authored model was deleted to perform the split.

`asset-library.html` loads only the selected model. Its scale companion uses the current soldier family definition and modular actor at the game's native size, with 0.19 metres per unit. Existing integrated controllers are identified separately from authored assets. Test-drive links for other supported motion classes explicitly say unverified; preview availability is not full gameplay acceptance.

Organic dog and creature tools remain distinct from DEC-52 construct bodies. The existing wolf-sized hunter study is not relabeled as a finished alien creature.

## Verification

`node --test tools/asset-library.test.mjs` verifies all original IDs, character/ordnance classification, every selected GLB's header and byte length, and the exact five preserved integrated URLs. `npx vite build` includes both the asset library and authored package viewer.

`tools/unified-entry-browser.mjs` exercises native hub links and records browser evidence in `artifacts/entry-hub`. Its result file is the authority for the latest end-to-end readiness outcome; it does not equate a page navigation with a completed game load.

Final native verification passed fleet/tank with the current soldier, construct hound to motion tools, character editor, studio, authored viewer, the fully prepared vehicle simulator, active Threat Room, Highwall combined and the preserved city page link, with zero page errors. Frontline desert readiness and its screenshot passed in the preceding run; the final run used `ENTRY_ROUTES=training,highwall,vehicle-sim` to recheck the corrected startup paths. A separate native city check dismissed How to Play, clicked ENTER THE ARENA and reached running duel mode in the existing city; city.png records the scene.

Five hub thumbnails are unmodified native screenshots copied into `public/images/destinations`: Highwall, Frontline desert, vehicle simulator, Threat Room and city. CSS crops them for the cards. `artifacts/entry-hub/asset-checkpoint-paths.txt` lists 1,579 asset/catalog/thumbnail paths for selective staging, including existing preserved packages; it is not a claim that all 1,579 were newly restored.

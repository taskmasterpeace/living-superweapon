# Current-model combat checkpoint — September 14, 2026

Working checkout: `D:/lsw/.worktrees/combat-release-review`, branch `codex/playable-integration`. This pass is local; it does not migrate the game to Unreal or merge another worktree. Raw purchased animation sources remain in `C:/Users/taskm/Documents/PowerWorldAssets/animations/2026-09-14`.

## Delivered

| Area | Current result | Limit / tradeoff |
| --- | --- | --- |
| Purchased motions | 22 selected clips retargeted onto the current modular skeleton, including paired aerial sources, shoulder carry, lifting, recovery and isolated boxing punches; source/hash/license information retained. | Conversion and preview are separate from playable acceptance. The whole purchased collection is not described as fully integrated. |
| Held character motion | Hostile aerial hover/travel use restrained purchased limb motion over the native receiver reaction. Final holder hand contact, fixed bone lengths, body roots, stun/release ownership and hitstop remain authoritative. | Imported horizontal carry poses cannot be copied wholesale onto upright neck holds. These are adapted overlays, not a complete paired mocap replacement. |
| Boxing | Existing stable punches remain playable. Purchased singles can be reviewed in the library and diagnosed in an explicit lab adapter. | Purchased stance changes fail current fast native contact/continuity limits. Issue30 preserves the exact measurements; the failing clips are not enabled by default. |
| Flight styles | Existing editable silhouettes and saved character profiles remain available; the purchased motion policy can be disabled in Studio. | New flight/flips/suplex export files have not arrived. Existing styles are not represented as newly imported purchased clips. |
| Collision and lifting | One body-mass source feeds lifting, throwing, wind and collision. Hostile powered body contacts exchange normal impulse and apply bounded damage through the existing damage receiver. Guard bracing uses facing, strength and flight support. | Existing attack/throw ownership prevents a second incidental damage charge. Vehicles remain kinematic hulls; this does not yet let a flyer physically shove a jet. |
| Guided spear | Optional custom-character ability: black shaft, crimson barbed tip, preparation/follow-through, bounded steering, embed, recall, blocked-return feedback and safe catch. | Procedural throw; no canonical character's kit was replaced. No full shaft physics or advanced equipment inventory integration. |
| Inventory | Interactive compact overlay mock-up with grid space, mass, two-handed equipment, separate carried bodies/objects, square/widescreen devices and vehicle camera concepts. | Live inventory and device controls are intentionally separate from this mock-up. |
| Workbook | Six sheets: 55 characters, 22 selected clips, 73 library assets, 90 sound records, 38 equipment entries and 16 decisions. Editable review fields, filters, frozen identifiers and source information. | Generated birthdays and unauthored heritage remain flagged. Audio entries distinguish recordings, wiring and candidate dialogue. Equipment dimensions are layout proposals, not enforced backpack capacity. |

## Open and inspect

The reviewed development server is `http://127.0.0.1:5193`.

- `/studio.html`: current characters and saved profiles, flight styles, attack rehearsal and Sound Library.
- `/animation-library.html`: search `Paid_` for converted sources. Playback is a clip preview, not a promise of playable assignment.
- `/inventory-concept.html`: compact inventory and camera study; sample gear is clearly labeled.
- `outputs/flight-combat-20260914/PowerWorld-Combat-Production.xlsx`: production workbook.
- `artifacts/inventory-concept-2026-09-14/current-game-hud.png`: actual current PowerWorld HUD.
- `artifacts/paid-held-runtime/`: current-model rear-hold phase captures and machine-readable scenario provenance.

## Evidence and remaining acceptance

Fresh native character-selection → squad entry succeeded in 8.37 seconds on the local RTX 4090/D3D11 browser with frontlineReady=true, preparing=false and no recorded browser/network errors. The prior headless stall did not reproduce in that GPU-backed run; issue #32 was closed with the evidence, without claiming a game-code fix.

The held-motion browser fixture captures five phases for hover and forward-travel receiver motion, using a production rear grab in Studio. It manually sets inspection velocity and clock: it is not a recording of a player steering a complete curved interception through throw, ground impact and get-up. That end-to-end native-input acceptance remains the next scenario to demonstrate.

The final combined targeted regression run passed **282/282** tests, and `npm run build` passed. The build retains a large-bundle warning; no bundle-size fix is claimed. Logs are stored under `artifacts/integration-*.txt`. The paid receiver test loads the actual GLB and checks neck contact, fixed joints, unchanged collision roots and incapacitation across both motion families. Source-bank tests check real tracks and provenance. The separate spear and collision reports list their concrete test commands and visual limits. The separate failing stock-profile and Rage-contact checks below are not counted as passing.

Known failures remain visible:

- [Issue29: Mystward/Moses stock palette save validation](https://github.com/taskmasterpeace/living-superweapon/issues/29). The two stock palettes conflict with an existing purple restriction. No character palette was silently redesigned.
- [Issue30: purchased boxer contact/timing compatibility](https://github.com/taskmasterpeace/living-superweapon/issues/30). Stable existing punches remain active.
- [Issue31: Vega-to-Rage rear neck contact](https://github.com/taskmasterpeace/living-superweapon/issues/31). The existing no-paid-bank regression measures0.0523world units against a0.05limit. Bone lengths and acceptance thresholds were not stretched to hide it.
- Several imported ground lift/get-up clips penetrate the floor, and paired aerial catch durations differ. Keep them candidates until corrected and reviewed.

## Next work, in order

1. Complete a native-input rear aerial grab → hold during flight → aimed throw → impact → get-up run with the current actors. This provides a single reproducible acceptance scenario for the core fantasy.
2. Correct purchased punch timing/stance and paired capture/release alignment, then admit clips one action at a time. This improves quality without destabilizing existing attacks.
3. Prove a heavy-object pickup with planted hands/feet and an overhead carry. Object grip shape chooses the pose; mass versus lifting capacity chooses success, effort and speed.
4. Add actual vehicle impulse/displacement to the ram scenario. Relative speed and damage are now measured consistently; two-way vehicle motion is still missing.
5. Import the newly exported flight and recovery packs through the same pipeline, then connect the approved inventory layout and HUD symbol language. Keep large destruction, cover combat and extensive wrestling combinations deferred.

Implementation decisions: `FLIGHT_COMBAT_BUILD_DECISIONS_2026-09-14.md`. Import instructions: `PURCHASED_MOTION_PIPELINE_2026-09-14.md`. Collision and spear details: `SHARED_IMPACT_IMPLEMENTATION_2026-09-14.md` and `GUIDED_SPEAR_IMPLEMENTATION_HANDOFF_2026-09-14.md`.

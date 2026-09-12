# PowerWorld screen, pipeline and gameplay delivery audit

Date: 2026-09-12. Scope: creator's accumulated requests, current primary/reviewed implementation, open issues and recorded evidence. This report replaces blanket statements that the entire game or pipeline is finished.

## What is actually complete?

There is a working engine with substantial representative combat evidence. There is not yet a finished, uniformly presented, end-to-end certified game. A successful build, a working menu and a controlled test are different evidence. Old reports describe particular revisions; they do not automatically certify the latest primary checkout or every character/device.

This pass implements standalone Sound Library, a source-driven gadget table, fullscreen squad portraits, and inventory presentation/usability fixes. It does not certify all convoy outcomes or complete every open issue.

## Changes delivered in this pass

- `sound-library.html` is a real page, not a modal or character preview behind a dialog. Character Studio navigates to it. It uses the same SoundLibrary backend and local storage, preserving existing recordings/custom entries. Page navigation connects game, Studio, Sound Library and Gadget Catalog. Both new pages are production build entries.
- `gadget-library.html` shows 14 unique authored gadget definitions from OPERATION_GADGETS and ROSTER items, with their actual charges, cooldowns, effects and owners. Search and CSV export work. Missing explicit values say Runtime default rather than inventing a value. This is read-only; it is not yet a gadget balance editor or a registry of every runtime item branch.
- Squad selection fills the screen and uses actual procedural character portraits from the same portrait renderer as character selection. The leader is visible; settings and roster have their own spaces and the deployment action remains reachable. Character limits and native deployment callbacks are preserved. The ambush description explicitly calls out its incomplete validation.
- Inventory shows the character, separate powers/issue/carried-gadget sections and a link to the gadget table. Unavailable/depleted/cooling gadgets cannot appear usable. Both slot assignment and native second-slot use were exercised. This remains an in-game overlay so opening inventory does not leave the running match.

## Screen audit

Method: route and panel source audit, plus direct browser captures and interaction checks on the surfaces marked Live. Other entries below are source-reviewed, not falsely labeled visually passed. This inventories the player/authoring screen families; it is not an assertion that every dialog state, city-mode tool and device has been visually certified.

| Surface / owner | Evidence | Finding and action |
| --- | --- | --- |
| PowerWorld entry and fullscreen character selector / hudSelect | Live capture | Preserve the approved large character, stat panel and bottom portrait roster. Do not replace it with the field-footage title. Background channel remains deferred #9. |
| Squad and assignment / squad-panel | Live capture + native deployment | Previously a small scroll-heavy text modal. Replaced with fullscreen portraits this pass. Still needs a selected-team lineup and mission readiness information once convoy validation is complete. |
| Sound Library / tool/sound-library | Live page + add/assign/loop/reload test | Now its own page. Recording missing/assigned/inactive and connection states remain separate. No existing recording is silently approved by being listed. |
| Gadget Catalog / tool/gadget-page | Live capture + CSV download | New source-driven table. Read-only. Next: stable IDs for character-owned definitions, then validated editing. |
| Inventory / inventory-panel | Live equip/use/return | Improved layout and real second-slot use confirmed. Full soldier backpack capacity/transfer UI is not implemented here. Do not market this as a complete loot inventory. |
| Quick power picker / power-picker | Live capture | Shares the inventory CSS class despite different gesture ownership. Needs its own compact, icon-driven component and key hints generated from bindings. Keep combat gesture semantics. |
| Character Studio / studio-main | Live navigation; source audit | Established working editor. Many tabs and independent local overrides. Sound Library no longer interrupts it as a modal. Dirty-draft/save semantics need consistent navigation protection across all destinations. |
| Beam Library / tool/beam-library | Source | Still a separate modal tool inside Studio. Apply the page navigation pattern when its authoring workflow is migrated; do not mix it into the audio editor. |
| Campaign records / campaign-panel | Source | Independent small text dialog with balances, purchases and import/export. Redesign as a proper campaign screen with operation history, research state and clear save status. |
| Threat Lab and field objective HUD / operation-guidance | Native entry + source | Lab preparation is reached. HUD and world objectives are separate presentation owners. Audit objective wording and interaction hints against actual enabled interactions. |
| Newsroom / newsroom-ui, hudBroadcast | Source + prior reports | Keep shared Impact palette. Match debrief should link actual outcomes/evidence. This pass does not certify every replay/edit/export state or audio mix. |
| Old title / hudTitle and PowerWorld title variants | Source | Legacy roster/field-footage/armory entry paths still exist for other modes. Route inventory must distinguish city mode from PowerWorld; hide obsolete PowerWorld paths rather than deleting shared city functionality. |
| Options, help, rankings, codex, damage/visual guides / HUD mixins | Source | Separate template families with legacy language and layouts. Use common typography, navigation and current control labels. Full interactive visual matrix remains needed. |
| ATLAS, design-decisions, encyclopedia, authoring viewer | Route/source inventory | Separate authoring/reference tools, not character-selection replacements. Include in shared navigation only where relevant. No claim of new visual approval this pass. |
| Mobile landscape variants | Prior evidence + open #5 | Desktop screenshots do not certify touch ergonomics. Physical iPhone validation remains open; include every new page and squad/inventory scrolling in that matrix. |

Important discovered risks: duplicated CSS embedded in panel modules; power-picker borrowing inventory styles; older help/copy disagreeing with controls; old audio comments forbidding AI contradicting current creator direction; preview-only audio bindings looking similar to native ones. These are pipeline issues, not solved by recoloring a menu.

## Escort and ambush: do they work?

Both menu choices connect to `convoy-operation.js`. They are not cosmetic buttons. Escort has scientist recruitment, boarding, dispatch, travel and settlement states. Ambush branches into boarding/interception/recovery behavior. Route and settlement fixtures passed locally in this pass.

The live check in this pass proves: choose Escort, choose a companion, deploy to Threat Lab, equip and use gadgets. It does NOT prove escort delivery, ambush interception, extraction, every failure/retry path or campaign rewards after repeated operations.

Issue #8 explicitly records native ambush interception as deferred/unverified and lists the missing acceptance run. Issue #26 tracks a scout steering/wheel integration mismatch that matters to the convoy experience. Therefore neither mission should be advertised as fully release-verified on the strength of its menu. Recommended next: one native escort from menu to saved debrief; then native ambush interception to extraction, with failure/retry and exactly-once rewards. Retain staged evidence as diagnostic evidence only.

## Inventory and gadget findings

- Policy already separates soldier class from flight: personal firearms require soldier AND no flight capability. Non-soldiers have two gadgets and no backpack. This policy has regression coverage.
- Both gadget slots are independently selectable and usable. This pass's native Shield Cell test confirms slot 2, 45 shield and released overlay input ownership.
- Scavenged carried weapons use `t: Infinity` in pickupGear, so the old 12-second carried-gun expiration is not the current rule. Ground drops still have their own lifetime. The pickup message still says X fires it: reconcile that older copy with current attack selection rather than treating it as authoritative controls.
- Mission issue only offers the four operation gadget definitions. Character loadouts provide additional variants. The spreadsheet exposes those differences without claiming all are available from the Lab.
- Soldier policy permits a backpack, but a complete backpack storage/capacity/transfer editor is not demonstrated. Inventory currently handles powers, held weapon and carried gadgets.
- Current issue replacement blocks deployed gadgets and fills slot 1 before slot 2. More item kinds need explicit equip/unequip cleanup and portability tests before generic editing is enabled.
- Direct power selection in inventory and the quick picker should converge on one selection API with current character rules. Keep independent melee out of the power carousel; special authored attack powers must not be silently deleted as part of a UI refactor.

## Recommended repeatable authoring pipeline

One workspace means a shared navigation and data contract, not every editor inside one modal.

1. **Canonical definitions:** stable IDs and versioned schemas for characters, powers, gadgets, audio assets/cues, vehicles, props and operations. Separate reusable assets from assignments. Generate tables and UI descriptions from these definitions.
2. **Focused editor pages:** Character Studio, Audio, Gadgets/Equipment, Vehicles/Props, Operations/Map. Preserve common Impact tokens and predictable search, selection, inspector, dirty-state and save/export controls. No parallel private palettes or duplicated registries.
3. **Validation before save:** bounds, class restrictions, missing assets, missing event owners, rig sockets, scale/door clearance, dependency references and loop cleanup requirements. Distinguish Missing asset, Unassigned, Unconnected, Invalid and Ready.
4. **Native preview:** preview invokes the same runtime adapter used by gameplay. A new row is not a new native capability. Diagnostics show owner, event, recording/asset, suppression and cleanup. Clearly label controlled tests.
5. **Persistence and transfer:** immutable shipped defaults plus versioned local overrides; explicit apply/reset; transactional import and missing-dependency reports. Audio needs larger binary storage/shared references; current copies and 4 MiB packages do not scale to a full library. Campaign saves and media currently transfer separately.
6. **Evidence and release:** each feature has implemented revision, local automated checks, native scenario evidence and unresolved limitations. Capture short clips at milestones. A feature cannot become release-complete merely because its issue has code or a screenshot.

For models: preserve the current shared rig/portrait renderer, Blender source/export recipes, common units, collision dimensions and reusable seat/door/weapon attachment contracts. Add validation around these rather than building a bespoke model/animation for every character. Destructible scenery needs matching visual/collision state and bounded budgets; #24/#25 remain the place for that work.

## Status of your requested gameplay work

| Request | Honest status / next action |
| --- | --- |
| Melee outside weapon cycling; direct controls | Prior native/control evidence under #14. Current report does not claim every special kit rebalanced. |
| Character-specific approach, combos and finisher space | Prior live SOL light/light/finisher and retaliation; corrected finisher spacing about 14.7u. Broad roster tuning remains. |
| Directional energy-first blocking, guard break, dodge | Prior funded ground/air guard and evade evidence. Final sound selection rejected, replacements still needed. |
| Grab, flying carry, whirl/aim/throw, terrain damage and escape | Prior native representative clips and person-carry regressions. Not every matchup separately filmed. |
| Melee damage against vehicles | Prior native scout melee contact. Full vehicle combat balance is not complete. |
| Shared animation pipeline, material-aware impacts | Existing reusable approach/strike/grip and metal/flesh feedback. Expanded signature weapons #21 and damage/audio vocabulary #22 remain. |
| Recoverable falling flail/ragdoll | Open #20; do not confuse KO ragdoll with recoverable airborne animation. |
| Agile jumps, Rage bounds, Webline traversal | Combat approach families present; full character-specific travel/web interactions remain #19. |
| Traveling beams, charge scale, range and impacts | #15 representative native and controlled evidence. Cover HP 900 to about 301 in recorded cover test; moving-contact evidence exists. Not hitscan. Audio replacement remains. |
| Alt free-look, head tracking, rear-side framing | #16 prior native/regr tests including bounded head motion and room/transport framing. No FOV widening used as the solution. |
| Flight poses/toes, speed tiers and visible wake | #16 prior state1/2/3, forward dive, near-body wake and restricted-flight evidence. Physical mobile validation is separate. |
| Damage types, statuses and icons and icons | Existing damage/status code and codex; canonical icon/outcome/audio mapping remains #22. No new universal coverage claim from this pass. |
| Vegas rename/appearance and bottom roster portraits | Present in live screenshots. Other character art quality is not uniformly approved. |
| Character-selection background channel | Deferred #9. |
| Soldier/LSW sides, companion selection, portal staging | Live squad/Lab entry verified; deployment/navigation edge cases and Threat Lab depth #6 remain. Stress-test beyond standard squad cap not completed. |
| Threat scanner, shield/gadgets, inventory class rules | Native gadget paths and policy present; catalog/overlay improved this pass. Larger gadget editing and shared asset assignment not finished. |
| Police-to-military escalation and explicit pursuit | Existing operation systems/reports; not retested end-to-end here. Dialogue/audio mapping remains part of #17. |
| Zombies, variants and audio | Existing behavior/assets; smarter composition and broader presentation are incomplete. Old synthesized audio was rejected. |
| Tempest weather layered over map weather | Existing owned domain/weather audio routes; not visually recertified here. Do not replace map weather on power cancellation. |
| Desert, wilderness/industrial/hidden lab operation | Existing map and operation code. Interiors/navigation #6/#12, shading/performance #13 remain. |
| Enterable building pilot | Useful collision/interior/navigation foundation; not proof that all building traversal/AI is finished. #12. |
| Transport, seats/ramp/boarding and flight | Implemented systems, unresolved art/validation #10/#11. Generic motorcycle/ATV/van creation not delivered by a transport prototype. |
| Ground vehicle feel | #26 unresolved integration mismatch. No blanket handling approval. |
| Trees, cover destruction and jet/mountain invisible walls | #24 collision and #25 localized destruction remain open. No new destructible-terrain rewrite in this pass. |
| Campaign resources/research, scientist/convoy loop | State systems and fixtures exist; complete native escort/ambush certification remains as described above. |
| Mobile landscape controls / controller support | Existing input support and prior fixtures; physical iPhone ergonomics/performance and complete touch operation #5 remain. |
| Newsroom/debrief and marketing evidence | Existing recording/report systems plus local clips. Final UX/audio polish and comprehensive outcomes remain #7/#17. |
| Canonical character hub/spreadsheet | #23 remains. This pass adds only the gadget table. |
| Audio AI replacements and unified library | Real standalone page and local authoring available. Not all sound routes accept replacement; ambient scene emitters/storage migration #28 remain. |
| GitHub release, merge, Mac/save transfer | Draft PR27 and local commits are not a merged release. #4 remains; instructions exist and browser saves/media transfer separately. Hosted Actions are not required for local checks. |

## Recommended action order

1. Finish a single native escort operation and its loss/retry/reward tests; reconcile #26 handling on the route. Show the mission status honestly meanwhile.
2. Consolidate inventory and power selection through shared validation; introduce stable gadget IDs and editable versioned definitions from the live table.
3. Migrate campaign/power picker/remaining legacy game panels to the approved screen system, with screenshots at desktop and landscape touch sizes. Keep destructive confirmations small; make editors proper pages.
4. Complete audio runtime assignment coverage and shared asset storage, then generate replacements individually. Correct stale no-AI policy text across documents while preserving provenance of old samples.
5. Native ambush certification, broader roster/AI balance, transport/interior checks, physical mobile test, then scoped release/Mac handoff.

## Evidence and limits

Local 14-test batch: sound library, spatial loops, equipment policy, convoy routing and settlement; production build passed (large-bundle warning remains). Creator audio add/assign/reload workflow passed. New screen browser test captures actual UI navigation and native inventory use with zero page errors; initial squad grid layout failed pointer accessibility, was corrected, and the native rerun passed. It is not convoy-completion evidence.

Screenshots/video/CSV: `D:/lsw/artifacts/marketing/screen-audit-2026-09-12/`. Prior combat clips: `D:/lsw/artifacts/marketing/combat-pass-2026-09-12/`. Detailed prior evidence: COMBAT_ACCEPTANCE_RECONCILIATION.md, CAMERA_FLIGHT_CANDIDATE_REVIEW.md, LIVE_COMBO_REVIEW.md and FINISHER_SPACING_REVIEW.md. These retain their revision/scope limitations.

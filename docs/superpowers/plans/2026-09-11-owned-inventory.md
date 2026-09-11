# Owned Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A persistent equipment collection with real quantities, carried capacity, selected gadgets and state-preserving weapon use in the existing game.
**Architecture:** Pure inventory commands validate state; browser repository serializes revisions; a runtime adapter projects instances into existing equip/ammo/gadget handlers. A deliberate menu renders the same state, never grants catalog entries just by browsing.
**Tech Stack:** Existing JS/Three.js/Vite, native IndexedDB, Playwright and node:test; no new dependencies.
**Spec:** `docs/superpowers/specs/2026-09-11-reusable-player-systems-design.md`, sections 1 and 3. Defeat policy settled: keep owned gear, lose only unextracted mission loot.

## Global Constraints

- Work only in `D:/lsw/.worktrees/sarge-authoring-integration`; runtime `http://127.0.0.1:5182/powerworld.html`.
- Preserve all native hero powers, authored profiles, damage/firearm/gadget authorities, current third-person camera, DESIGN.md/Impact C and news work.
- Two physical weapon slots, three selectable gadget slots, separate mission cargo. No automatic deletion of owned equipment on KO.
- No free ammo from menu/weapon swaps/respawn. Existing ammo shape `{loaded,capacity,reserve,dryUntil}` is authoritative.
- No new aircraft, multiplayer, economy, random affixes or cloud persistence. No push/deploy.

### Task 1: Inventory commands and persistence

**Files:** Create `src/data/inventory-catalog.js`, `src/core/inventory.js`, `src/core/inventory-store.js`, `tools/inventory.test.mjs`, `tools/inventory-store-browser.mjs`.

**Interfaces:**

```js
inventoryDefinition(id) // namespaced firearm:<armoryId>, blade:<id>, gear:<id>, ammo:<class>, mission:sample
createInventory(profileId) // v1, revision0, items[], equipment{}, activeGadget:'gadget1', grants[]
inventoryCommand(state,command) // {ok,state,error?,value?}; does not mutate input
inventoryUsage(state) // bagSlots, carriedWeight, bagLimit, weightLimit
validateInventory(state) // throws on corrupt/unsupported data, no partial repair
createInventoryStore({indexedDB=globalThis.indexedDB,dbName='powerworld-equipment-v1'}={})
// store.load(profileId), store.save(state,{expectedRevision}), store.close()
exportInventoryBackup(state) // versioned JSON Blob, no runtime objects
parseInventoryBackup(blob) // <=1 MiB; validates complete supported snapshot, no implicit save
```

Use existing FIREARMS/BLADES/GEAR definitions by ID, not copied damage tables. Catalog metadata defines UI category, slots and stack behavior. Named weapons/devices have stable instance IDs; stackable ammo and consumables have bounded positive integer quantities. Add a data-defined jetcell only by adapting SARGE's existing Jump Jets definition; don't invent duplicate effects. Gear conversion must retain every kind-specific catalog field (heal/hp/r/radius/etc.) and map `n` to `name`.

State owns a stash and bag separately from equipment. Proposed testable initial limits: 16 bag stacks, 80 kg carried, 200 total instances, stack max 999; these are exposed tunable capacity defaults, NOT real-world physics or movement penalties. Weight uses small category metadata, not damage-derived magical numbers. Equipment counts toward carried weight. Objective cargo has its own slot and cannot be merged/sorted into regular gear. Profile ownership can be `hero:<id>` including custom IDs; do not conflate with the existing career bank.

Commands: grantOnce(issuanceId,entries), move(instanceId,to), split(instanceId,quantity,newId), merge(sourceId,targetId), equip(instanceId,slot), selectGadget(slot), consume(instanceId,quantity), updateRuntime(instanceId,ammo/charges/cooldown), drop(instanceId), pickup(instance), settleDefeat. Inventory instance has `id,definitionId,quantity,location, runtime:{...}, mission:{extracted,...}?`. Equip swaps prior item back to bag only if capacity permits. Drop returns exact instance including runtime state; a second identical pickup cannot duplicate an owned ID. Grant receipts prevent menu reopening from reissuing starter gear. Commands enforce compatible slot categories, safe IDs and bounds; reject stale `expectedRevision`, wrong profile and malformed numbers without mutation. Consumed devices may remain spent but never regain charges from a menu refresh. Keep cooldown remaining, not wall-clock Date as combat authority.

Ammo stacks must be usable, not decorative: add `loadReserve(weaponId,ammoId,quantity)` as one atomic transfer. Compatibility is explicit catalog ammo class (rifle/sniper/shotgun/pistol/SMG/LMG game categories, not a claim of real caliber interchangeability). Each unit removed from the stack adds one round to that instance's bounded reserve; it does not fill the magazine or bypass reload animation/time. Deny wrong ammo, missing carried items, over-cap amounts, and changes during reload; no partial transfer. Runtime snapshot first, then the same command and projection. Test total loose + reserve + loaded conservation; spent rounds are not magically recovered.

Store uses IDB transactional compare-and-swap on revision. Open failures can be retried; save rejects stale tabs visibly. No localStorage mirror or per-frame writes. Validate complete state before saving and on load; never overwrite unreadable prior saves with empty defaults. Legacy armory prefs remain a non-owning draft; do not migrate arbitrary catalog choices into free ownership.

Revision contract: absent profile has revision 0; a successful changing command returns prior revision + 1. No-op receipt retries return the same revision. Store compares the current persisted revision (0 if absent) against `expectedRevision` inside the read/write transaction, requires a monotonically newer valid state, and returns the committed state. Batched queued runtime snapshots may span more than one local revision; the expected persisted revision must still match. A stale tab cannot silently rebase over changed ownership. Backup parsing is not issuance: replacing a matching profile requires explicit UI confirmation, actor detachment and a CAS write at the next current revision; do not merge receipts/items blindly or equip a backup for another hero. Preserve current state on unsupported/corrupt backup.

- [ ] Red tests: duplicate issuance, double pickup, incompatible equip, atomic failed swap, full capacity, split/merge conservation, weapon ammo preservation, chosen gadget selection, defeat keeps gear/removes only unextracted cargo, save revision conflict/corrupt state.

```js
const initial=createInventory('hero:sarge');
const granted=inventoryCommand(initial,{type:'grantOnce',issuanceId:'starter-v1',entries:[{id:'rifle1',definitionId:'firearm:m16',quantity:1,location:'bag'}]});
assert.equal(initial.items.length,0);
assert.equal(granted.state.items.length,1);
assert.equal(inventoryCommand(granted.state,{type:'grantOnce',issuanceId:'starter-v1',entries:[]}).state.items.length,1);
const bad=inventoryCommand(granted.state,{type:'equip',instanceId:'rifle1',slot:'gadget2'});
assert.equal(bad.ok,false);assert.deepEqual(bad.state,granted.state);
```

- [ ] Implement pure commands/catalog and transactional repository; run `node --no-experimental-webstorage --test tools/inventory.test.mjs` and real-IDB `node tools/inventory-store-browser.mjs`.
- [ ] Commit owned files, report red/green and exact API. This task alone is NOT a gameplay inventory.

### Task 2: Stateful runtime equipment adapter

**Files:** Create `src/engine/inventory-runtime.js`, `tools/inventory-runtime.test.mjs`; modify `game.js`, `entity.js`, `hands.js` only focused hooks. Coordinate dirty pre-existing HUD/Second-Wind fixes; do not revert them.

**Interfaces:** `InventoryRuntime(game,store)`, async `.attach(fighter)`, `.command(command)`, `.flush()`, `.snapshotRuntime()`, `.selectWeapon(slot)`, `.selectGadget(slot)`, `.onDefeat(fighter)`, `.restoreAfterRespawn(fighter)` and `.detach(fighter)`. Expose `game.inventory` for UI. Scope to local primary human; bot inventories continue unchanged.

Attach through a shared post-primary-human hook called by spawnHuman, startMatch's direct addFighter and setPlayerChar's direct recreation; flush former profile before changing actor. Use a generation token so slow load for previous character cannot equip the new one. Starter profile grants one m16, one p9, bounded ifak/frag/jetcell for infantry; VEGA/SOL get bounded useful gear and mission cargo access but no firearm replacement of native powers. No starter reissue on menu open or KO.

Keep `equipFrom` as mesh/proficiency/ammo installation authority. Snapshot instance ammo before old runtime slot disappears, cancel reload/active attack before switch; restore stored slot ammo after installation. Exactly two owned weapon slots may be assigned, but only the selected physical weapon is held. Powered heroes use `_gear` carry-hand path, never `primary:true`; soldier LMB replacement is an explicit compatibility mode only, with exact original slot object restoration tested on detach/KO/form change. Carry/reload/KO restrictions validated before mutation. Commit inventory transition and install runtime while controls are gated; on installation failure restore old ownership/runtime without fresh ammo. Persist runtime state at menu, switch, drop, KO, detach and a throttled dirty checkpoint rather than every bullet; show pending/error state.

Use a backward-compatible typed inventory-drop payload with instance identity + ammo/charges, and 3D reach/obstruction check for inventory pickups. Do not put instance metadata on shared ability definitions or let legacy pickupGear consume an inventory drop. Persist valid transfer before retiring world mesh; failure leaves the drop accessible. Inventory-managed drop uses no 12-second lifetime. Ordinary legacy temporary gear remains distinct. Prevent KO from materializing a second free backup weapon. On respawn, bypass/refill correction for owned slots and devices; keep owned gear and consume only unextracted cargo once per defeat. Form changes preserve compatible instances and ammo, releasing incompatible active mounts safely.

`useItem(f)` chooses the selected inventory gadget, then executes existing switch/spend; bots default to first item. Project the three instance-backed items once and change selected lookup, never reorder/recreate objects on selection, so deployed beacon/jet/vision cooldown or mesh is not erased. Existing item-key dispatch is intercepted by held `_gear`; add a distinct explicit “Use selected gadget” UI action and nonconflicting keyboard path after checking bindings, rather than stealing hero LMB/RMB/Q/E/H/R. Field lifetime cleanup remains existing dispose responsibility. Inventory cannot equip/consume through a stale actor or while a blocking transition owns hands.

- [ ] Red production tests: fire M16, snapshot, switch p9/back → same total ammo; reload uses existing requestReload; second gadget spends only itself; drop/pickup preserves ammo; repeated KO does not spawn owned duplicates; respawn preserves exact owned charges/state/cooldown (spent stays spent); SOL/VEGA native slot object identities unchanged; delayed attach ignores old actor. Legacy def.items fresh-pouch behavior stays unchanged.
- [ ] Also test the soldier fallback loophole: holstering/unequipping an owned gun must not expose an endlessly refreshed unowned backup firearm from `_loadoutPrimary`. Explicitly distinguish innate hero powers from soldier equipment. While owned loadout control is active, firearm activation needs the corresponding instance; restore original slot objects on true adapter detach without granting an extra usable owned weapon. Explain any compatibility restriction in the UI, not a silent failed input.
- [ ] Implement adapter/hooks; run focused inventory/runtime plus existing loadout, ammo, hands, block/KO tests. No simulation overwrite used as proof of native controls.
- [ ] Commit bounded hooks and full report.

### Task 3: Inventory menu and native player workflow

**Files:** Create `src/engine/inventory-ui.js`, `src/styles/inventory.css`, `tools/inventory-browser.mjs`; modify `pw-main.js`, HUD overlay routes, and armory entry linkage.

**Interfaces:** `openInventory(game,hud)` opens one gated overlay and returns close handle. KeyI and pause menu open real inventory. Armory remains separate catalog/compare accessible from inventory; normal owned inventory does not silently issue catalog items. Any unlimited issuance is explicitly training-only.

Menu: player/profile title, saved/saving/error status, equipment slots, stash/bag tabs, filter/search/sort, capacity/weight, selected item detail and derived comparison, equip/unequip, select active gadget, drop confirmation, split/merge controls, transfer at title or valid supply point, explicit backup export/import. No drag-only action. Selected primary/secondary attack display stays bottom-center in gameplay and uses actual combat selections; no big permanent inventory dashboard. Controller accessible via focus/action, phone layout >=48px targets and no horizontal overflow.

A compatible ammo stack offers “Load reserve” with a quantity and destination weapon; magazine reload remains the existing combat action. Explain bag rounds versus the weapon's reserve so the same ammunition is never counted twice.

Pause consistently and retire combat input; add to HUD overlayOpen/closeOverlays so ESC closes inventory before resuming. Text edits never trigger attacks or hotkeys. Restore prior pause/title state and focus, not pointer lock automatically. Full bag errors explain what to free; failed saving keeps data in memory but visible warning; reload is never recommended as a cure before backup.

- [ ] Red native browser test: select SARGE, enter, KeyI, equip rifle, close, fire/reload, reopen, switch, choose second gadget, close/use, reopen → exact retained counts; reload page → ownership remains. Repeat SOL and VEGA to prove native power preservation.
- [ ] Build UI from Impact C tokens. Capture desktop1440×900, mobile844×390 and390×844. Inspect meaningful action sequence and screenshots, run keyboard/controller-focus checks.
- [ ] Verify real pickup/drop interaction with staged drop placement labeled separately; take native-input recording, sample visible active runtime performance and inspect errors.
- [ ] Build and regression test, independent code/visual review; record passed/failed/unverified and retain next TEMPEST/gadget/outbreak plan scope.

### Task 4: Connect sealed recovery cargo to real ownership

**Files:** Modify `src/engine/frontline-encounter.js`, `src/engine/inventory-runtime.js`, `src/core/inventory.js` only the mission transition; create `tools/inventory-recovery.test.mjs` and extend the native inventory browser test.

The existing encounter advances `squad → recover → extract → complete` by grounded proximity dwell, but currently stores no sample item. Keep those rules and the visible case; do not invent blood collection from arbitrary damage. Give each encounter a stable ID. At the completed recovery dwell, request one idempotent cargo grant (`mission:sample`, source encounter ID, extracted false). Gate the phase transition while the command is pending, and advance only after success. Show a readable storage/capacity failure with retry; never remove the world case while the item grant failed.

At completed extraction dwell, use an explicit `extractCargo(instanceId, encounterId)` command that marks the same sample extracted and transfers it to stash. One completion receipt prevents repeated reward on subsequent ticks. No money, stat grant or research effect is implied. If the player is defeated while carrying the unextracted sample, `settleDefeat` removes it; the encounter returns to recover and restores the sealed case once. If defeated after extraction, the stored sample remains. Pending save completion must verify the same encounter and actor generation before advancing. On encounter disposal, cancel presentation callbacks without revoking a completed ownership transaction.

- [ ] Red tests: one recovery item for repeated dwell; failed grant leaves recover phase; extraction preserves exact identity; repeated extraction is idempotent; defeat loses unextracted cargo and restores recovery, but never extracted cargo or owned gear; stale callback cannot complete a new encounter.
- [ ] Exercise native recovery interaction in a clearly labeled fixture with the squad already cleared, then confirm inventory cargo → extraction stash and reload. Normal combat remains a separate native gameplay check.
- [ ] Commit only owned files and record the exact loop now supported. Research and attribute inheritance remain explicitly future work.

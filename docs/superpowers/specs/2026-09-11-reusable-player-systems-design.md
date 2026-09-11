# Reusable player systems — design for review

## Authority and release order

The creator approved the archive → inventory/gadgets → TEMPEST storm mode → opt-in outbreak direction on September 11. This document grounds that direction in the integration worktree and resolves what “advanced inventory” means. It is a design, not a claim of implementation. It supplements the existing playable-loop spec; it does not restart or replace the power audit.

Protected: `DESIGN.md` / Impact C, centered BFP third person with optional shoulder settings, existing original roster and city/desert modes, traveling beam contact, semantic comic hit feedback, and no aircraft expansion. Keep all 55 characters in the registry; readiness and gameplay availability are separate from identity. Preserve authored alternatives and saved custom characters.

Build independently testable slices:

1. Durable archive and roster identity. First match creates footage; subsequent matches accumulate; selection TV and Newsroom read the same archive.
2. Owned inventory and equipment. First prove SARGE, VEGA and SOL, then KNIGHTFALL gadgets. Powers never become arbitrary inventory loot.
3. Reusable status/deployment mechanisms: shock grounding with recovery immunity, bounded soldier turrets; reuse existing damage/resistance/guard systems.
4. TEMPEST's localized weather command mode, using the actual weather services.
5. Opt-in outbreak with ordinary sprinting infected, then a limited powered-infected pilot.

Existing power-audit regressions run at each integration checkpoint. Do not label an activation pass as gameplay acceptance.

## 1. Shared boundaries, not one giant manager

Three separate domains:

- **Player equipment:** owned item instances, stash, carried bag, equipped slots, quantities and reserved mission cargo.
- **Career media:** clip metadata and binary frames, favorites, playlists and backup. No inventory weight or equipment slots.
- **Roster identity:** primary role, secondary specialty, actual movement capabilities, strengths and readiness. Data drives selection, comparison and Studio; these surfaces cannot author contradictory copies.

Use stable IDs and versioned schemas. UI sends commands and renders results; it does not grant items or apply damage. Pure state transitions validate mutations, while small runtime adapters handle Three.js meshes, existing combat handlers and persistence. Match events carry IDs and resolved outcomes; replay never executes simulation.

Retain the existing `src/data/career.js` career economy/history; do not create a competing bank, progress save or career reset. Equipment and media link by profile/match/hero IDs without rewriting the career ledger.

## 2. Career archive

### Persistence and capture ownership

Use IndexedDB for Blob frames and metadata, not localStorage base64 or persisted `blob:` URLs. Suggested database `powerworld-player-v1`, separate clip/media and equipment stores with a schema version. Media eviction is incapable of deleting equipment stores.

Each clip contains stable `id`, `matchId`, `createdAt`, editable title, event kind, participant hero IDs, favorite flag, duration/frame timing, encoded byte count, recording dimensions and asset/build revision where available. Mark existing captures `audio: false`; don't imply recordings include sound.

The live recorder remains bounded at 9 clips / 360 frames / 24 MiB. Archive finished clips after encoder completion, using a transaction for metadata plus all frames. Pending encode tokens never enter storage. A failed write retains the usable live clip and reports save failure. Readers create transient object URLs and release them on switch/close. One playback decoder is shared; selection autoplay never starts multiple background players.

Stable clip IDs make repeated flush/end-match calls idempotent. Union participant IDs for overlapping events; do not tag every clip with the currently selected hero. Capture KO, major throw/impact and objective moments through existing highlight ranking, not every bullet or block.

### Retention and management

Default archive budget: 250 MiB, adjustable with visible browser usage/quota where available. Evict oldest non-favorites only, atomically with successful insertion. If favorites occupy the budget, stop auto-saving and surface export/free-space actions; never silently unstar or delete favorites. Metadata edits update usage. Handle concurrent tabs, blocked database upgrades and unavailable browser storage explicitly.

Newsroom has sequential autoplay, hero/event/date filters, favorite, rename, confirmed delete, scrub, still export, complete archive export/import, and storage usage. Import validates format, byte/frame limits, IDs and media type before committing. Backup is a downloadable archive with manifest and frames; it is not mislabeled as a video file. A standalone video export can follow without blocking backup.

Selection TV uses exact participant IDs for the selected hero. First launch shows “Your first highlights appear after a match”; no fake personal history. Missing-hero/legacy clips remain accessible as general footage. Changing the model updates new portraits/previews, not historical footage. Explain device/origin-local storage and export backup; clearing site data can erase it.

### Acceptance

Native play → captured event → match end → Newsroom → reload page → clip plays. Second match does not overwrite the first. Favorite, rename, filtering, confirmation/cancel, export/import and quota failure are exercised. Tests cover partial encode, duplicate save, eviction protection, corrupt import and cleanup. Measure capture-on versus capture-off cost under the same workload.

## 3. Advanced inventory without turning combat into spreadsheet management

### Structure

- **Stash:** persistent owned equipment, searchable/filterable by weapon, gadget, ammo, consumable and mission material. Stable IDs; no sale/economy invented in this slice.
- **Carried bag:** bounded capacity and weight, stackable compatible consumables/ammo; named weapons and special equipment are separate instances.
- **Equipment:** primary, secondary, three gadget slots and a separate objective-cargo slot. Active gadget selection is explicit; no longer always `items[0]`.
- **Power selections:** existing two selected abilities remain distinct from physical weapon slots. Role adapters decide which attacks the two combat buttons invoke. Display them compactly at bottom center; do not hide powers or silently replace a hero's native kit.

An immutable item definition references existing armory ability/mesh/audio IDs plus category, compatible roles, weight, stack rules and allowed equipment slots. An owned instance stores ID, definition ID, quantity, location and current runtime state (magazine/reserve/cooldown/charges as appropriate). Extensible metadata can support later special-item traits, but no random affixes, crafting or stat inflation is added before the basic economy is tested.

Reuse `src/data/armory.js`, `game.equipFrom`, weapon proficiency, existing ammunition/reload logic and gadget handlers. Do not copy firearm damage or sounds into a second catalog. Inventory comparisons derive from actual equipped definitions; armor labels derive from real absorption rather than clothing.

### Command and transaction rules

One command boundary handles pickup, move/split/merge stack, equip, unequip, select gadget, consume, drop, transfer to stash and issue mission gear. Return accepted/denied with a human-readable reason. Validate owner, quantity, slot compatibility, capacity and character state. IDs/revisions prevent stale or double pickup, duplicate consume and two-tab overwrite. Zero/negative quantities and unknown definitions are rejected without mutation.

Pickups require nearby 3D contact/line of access, not merely XZ proximity through ceilings. Reserve state before removing the world object. If persistence or mesh installation fails, preserve ownership and offer retry; don't lose or duplicate gear. Switching weapons cannot refill magazines, clear reload cost or duplicate backups. Cancel active held attacks before changing their slots and clear scoped/charge state.

Replace the 12-second scavenged-gun timer for inventory-managed equipment: ammunition/charges and ownership determine lifetime. Preserve existing temporary-power semantics separately. Dropped gear contains the same remaining ammo/charges. Mission cargo cannot merge with ammo, disappear during auto-sort or occupy a weapon slot; blood/sample data is stored as mission material, not a free permanent power grant.

Starter loadouts are issued once per applicable profile/mission, not on every menu open. Sandbox/training can explicitly offer unlimited issuance; normal inventory cannot quietly create catalog weapons on demand. Legacy saved loadout IDs migrate into a draft, not retroactive unlimited ownership. Existing saves stay untouched until migration succeeds; unsupported data remains recoverable through export.

Proposed defeat policy awaiting creator choice: keep owned gear, lose only unextracted mission loot. Do not implement destructive loss until that choice is resolved. No permadeath or equipment repair tax is inferred.

### UI and controls

Inventory is its own deliberate menu: equipment silhouette/slots, bag/stash list, focused item detail/compare, and visible quantity/capacity. Favorite/sort/filter and quick-equip support a large collection; drag-and-drop is optional convenience, never the only control. Controller/touch use select → action. Split stacks through a quantity control, confirm destructive discard, distinguish drop into world from permanent deletion.

Single-player inventory pauses combat consistently, releases pointer lock, suppresses combat input, and restores input deliberately. Do not mutate the current camera preference. Mobile uses the same commands in a landscape-friendly layout with safe areas and at least 48 CSS px targets; no compressed vertical weapon names. Stash transfers occur outside combat or at an authorized supply point.

### Acceptance

SARGE: obtain a gun and ammo → equip → fire → reload → swap → drop → recover with identical remaining ammo. Use the second gadget slot, verify one charge consumed and cooldown survives menu toggles. Save/reload persists ownership. VEGA and SOL retain native powers and selected attacks while carrying permitted gadgets/objective cargo. Capacity denial, KO, form changes and interrupted reload do not duplicate or erase items. Test stash/bag operations by keyboard, pointer and touch, plus controller focus.

## 4. Roster identities and favorites

Feature **VEGA and SOL** prominently; also preserve favorite access to **CHAINFIRE and TEMPEST**. Favorite status is editable, not a permanently forced four-person roster. Support all 55 entries and custom-character IDs. A launch-ready filter must not imply the registry only contains the pilot heroes.

| Fantasy / primary or secondary specialty | Characters |
| --- | --- |
| Charge Artillery / Beam Specialist | VEGA |
| Beam Specialist | KANO, SOL, APEX, NOVA |
| Speedster | JELANI, VOLT |
| Aerial Ace | VANGUARD, TORCH |
| Web / Grapnel Traversal | WEBLINE, KNIGHTFALL |
| Grounded Powerhouse | RAGE |
| Flying Powerhouse / Lifter | VANGUARD, STORMCALL; SOL also exposes its actual strength and carry capability |
| Gadget Specialist | KNIGHTFALL |
| Weather Controller | TEMPEST |
| Chain / Hellfire Controller | CHAINFIRE |
| Infantry | SARGE, MERC, BREACH, RECON |

“Aerial Ace” replaces “fast full-flight candidate” as a readable role, NOT a claim supersonic flight is already implemented. Show current capabilities and future/planned distinctions truthfully. Derive numerical comparisons from runtime stats and equipped abilities. Curate identity explicitly rather than inferring every hero with a beam is a beam specialist. Remaining heroes keep existing roles until reviewed; never display invented strengths.

Selection: face grid, large live hero preview, primary/secondary role, movement type, strengths/tradeoffs, readable retained power descriptions and hero-filtered TV. Shared asset/profile revisions invalidate portrait caches automatically. Keep authoring alternatives separate from equipped defaults.

## 5. Reusable mechanics following the inventory foundation

**Shock tether:** a projectile contacts a valid target before attachment. Grounding is a timed status with source attribution, resistance scaling and post-recovery protection. Guard/deflection/obstruction follow existing combat resolution. A falling target is not permanently input-locked; KO, cleanse and respawn clear the status/tether. Recovery does not force a character to fly. KNIGHTFALL is the first consumer, not a separate private damage system.

**Deployable turrets:** owned gadget instance → validated placement/arming delay → bounded autonomous entity with team, ammo, firing arc, health and lifetime → pickup/destruction/cleanup. No placement through walls or unsupported terrain. Use common target visibility and projectile combat; never instant invisible damage. Caps apply per owner and encounter.

**TEMPEST:** intentionally designed dark-brown-skinned Black woman, preserving identity and approved style. Validate a new model/profile in Studio, selection and gameplay. Bounded storm has explicit build, active, dissipating and cleared states; clouds precede rain. Storm Command changes existing slot actions to directed warning-then-lightning, gust control and hail, with visible mode/energy state. Energy depletion, interruption, KO and match reset restore original slots and environment. Local volumes compose with ambient weather rather than overwriting the world's global settings. Shared ceilings/shelter and terrain queries govern indoor rain/strikes. No perpetual storm or uncontrolled overlapping volumes.

**Outbreak:** opt-in encounter only. Exposure meter, visible symptoms, treatment window and turn state. First sprinting human cohort, then one airborne infected archetype retaining flight rather than all 55 tactical kits. Bounded active AI, distance-based update rates and pooled effects; measure animated hordes, not motionless placeholders. Player loss-of-control/turn consequences receive explicit design review before rollout.

## 6. Dream-loop and release gates

Use existing approved Impact C reference; no unrelated concept regeneration. Runtime is `http://127.0.0.1:5182/powerworld.html` in this integration worktree; establish the actual scene before editing. Baseline and native-path captures for Newsroom, selection and inventory at 1440×900 desktop and representative landscape/portrait phone sizes. Protect third-person composition and compact HUD.

Each slice records changed files, failed/passing tests, native versus staged evidence and remaining gaps under `.dream-loop`. Fresh visual reviewer compares scoped UI components to the reference; existing scenery is not secretly replaced to improve a screenshot. User's 10/10 aspiration does not authorize invented scores. Performance target remains foreground 60 fps on the user's desktop, with actual hardware/DPR/quality and p50/p95 frame timing reported; mobile budget must be measured separately. Archive load/render is paged and thumbnail decoding bounded; no hundreds of simultaneous videos.

Audio hooks for new commands/statuses specify one-shot versus loop, stop conditions, priority and cooldown; existing synths remain until chosen recordings arrive. Trigger and cleanup need audible verification, not just manifest entries. Archive footage remains honestly silent until an audio capture path is implemented.

Do not claim overall completion while storm mode, outbreak, controller/touch or persistence gates remain unverified. Finish and accept each reusable subsystem before expanding vehicles or new hero content.

# Inventory presentation contract — 2026-09-14

The canonical presentation manifest is [`src/data/item-presentation.js`](../src/data/item-presentation.js). It covers the current [`armory.js`](../src/data/armory.js) registries: **14 firearms, 7 melee weapons, 16 gear items**. No icon art has been produced or wired by this change. All 37 entries explicitly have `icon.status: 'missing'` and `icon.src: null`; labels remain necessary until approved assets exist.

## Icon contract

Each item has a stable presentation ID (`firearm.ak`, `melee.katana`, `gear.ifak`) and icon ID (`item.firearm.ak`, `item.melee.katana`, `item.gear.ifak`). Registry ID and source registry remain separate, so similarly named character abilities cannot accidentally resolve to an armory item.

Produce a **512 × 512 transparent PNG master**, without a baked card, frame, rarity stripe, caption, quantity, or selection state. Keep the complete silhouette and effects within the **416 × 416 safe area starting at (48, 48)**. Use consistent lighting and recognizable silhouettes; inspect readability at 48 pixels before approval. Renderer sizes are **48 px compact lists/HUD, 64 px inventory, 96 px inspection**. These three sizes support both dense controls and closer inspection without separate art direction. Render with `contain`, preserving aspect ratio. A long weapon may use a **2:1 display frame**, but its master stays square; never stretch or bake that frame into the asset.

After art review, attach a real served asset path and change that entry's status to `ready` (and update the missing-only regression). Do not mark an expected filename as a delivered icon. UI badges, charges, cooldowns, and focus outlines belong to the renderer. This contract does not require generating placeholder images.

## Current behavior, verified in code

[`inventory-panel.js`](../src/engine/inventory-panel.js) displays weapons, action abilities, and gadget controls. **Primary and Secondary assign actions** through `_selSlot` and `_selSecondary`; they are not primary-rifle and sidearm inventory slots. Gadget selection uses `_selectedGadget`; item charges and cooldowns belong to the existing item state. There is no backpack cell placement, item rotation, stacking/capacity solver, or weight system in this panel.

[`equipment-policy.js`](../src/engine/equipment-policy.js) currently grants a backpack to the Soldier archetype and permits personal weapon pickup only for non-flying Soldiers. Soldiers have no finite gadget-count limit in this policy; other characters have two gadget positions. Those are current runtime rules, not rules introduced by this manifest.

Named signature equipment must remain authored character behavior. For example, [`characters.js`](../src/data/characters.js) gives **Gale Longshot**, a bow action with trick-arrow payloads, and **Sandra Twin Pistols**, a rifle-type action. Neither should be removed, forced into a generic Soldier-only pickup restriction, or automatically equated to an armory gun. Katana, claws, and nodachi carry the armory's `hero` flag; the manifest preserves that descriptive flag without converting it into an eligibility rule. Character signature icons require their own later identities rather than guessed aliases.

The [`gadget-catalog.js`](../src/data/gadget-catalog.js) also collects operation and character item definitions, including variants. This 37-item armory manifest is **not an exhaustive inventory of those variants, hero actions, or fleet/prototype assets**. Preserve variant definitions and provenance when extending it.

## Proposed organization — not implemented gameplay

- **Soldier:** primary weapon, sidearm, backpack. Show action bindings separately from these equipment positions. Existing loadout packages already combine guns and gear, but do not constitute a new two-slot capacity system.
- **LSW / named hero:** signature equipment and two gadget positions. Preserve authored signature weapons even when the character cannot pick up general Soldier weapons. This is a presentation proposal, not a new exemption implementation or classification of every non-Soldier as an LSW.
- **Backpack concept:** each manifest entry has an explicitly `proposed` footprint in cells. Rifles generally occupy 4 × 2, long sniper/support weapons 5 × 2, SMGs 3 × 2, pistols 2 × 2; blades and gear have individual dimensions. These are layout studies, not measured physical volume, charge counts, stack limits, or enforced capacity. No bag width/height or rotation policy is committed yet. Claws having a proposed footprint does not make body-mounted signature claws droppable cargo.

The manifest is presentation-only and is not imported into runtime enforcement or the panel in this change. A later approved grid implementation must decide capacity, equipped-versus-packed handling, and variant identity explicitly before consuming these proposals.

## Verification

Run `node --test tools/item-presentation.test.mjs`. The regression checks registry coverage and identity, unique icon IDs, honest missing assets, immutable proposed footprints, absence of gameplay-data mutation, role metadata, and the icon safe-area/render contract.

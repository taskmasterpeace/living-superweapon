# Inventory, interface language and camera decisions

Review artifact: `../inventory-concept.html`. This is an isolated interactive concept, not a replacement for `src/engine/inventory-panel.js`. The page imports no game code, writes no saves and installs no game key bindings. Gold, warm black and muted olive reuse the existing Field Kit / Loadout Board concepts. Sample gear and capacities are illustrative.

## Compact field kit

Use a right-edge panel, 350 CSS pixels at desktop size, with no global dimming. At 1600 × 900 it leaves approximately 78% of horizontal space outside the panel. Keep the world and its existing HUD readable; do not grow inventory into a full-screen character sheet. The standalone review toolbar is not proposed game HUD.

The top section answers “What occupies my hands?” The lower section answers “What is stored?” A 6 × 4 sample backpack demonstrates item footprints: trauma kit 2 × 2, rifle 4 × 2, pistol 2 × 2, energy cell 1 × 2, scanner 2 × 2. The sample has 22 occupied cells with all gear stowed; 18 with pistol or scanner equipped; 14 with rifle equipped. Rifle and pistol dimensions match the explicit proposals in `src/data/item-presentation.js`; these are presentation proposals, not live inventory capacity rules. Dashed cells indicate an equipped item's previous place, not a second copy. They are a readability aid in this mock-up, not reserved capacity in a final packing algorithm.

One item owns a set of hands: pistol uses right, rifle uses both, scanner uses both. Equipping automatically stows the prior item in this fixed sample. Production code must atomically validate grip and backpack fit before replacing anything; insufficient fit must leave the original state intact. Item rotation, drag placement, capacity upgrades and persistent inventory migration are intentionally not implemented in this review artifact.

The current equipment policy still applies: soldiers have backpacks; LSW characters have two gadgets and no personal weapons/backpack. The concept explicitly shows a soldier kit rather than implying everyone has one.

## Carried entities

A grabbed person or world object is a world entity, never a stored inventory entry. “Carried person” / “Carried world object” lives in the hand section and displays its occupied hands. The sample reserves both hands. Final grip requirements should depend on entity size, shape and character strength. Carrying returns any equipped sample weapon to storage; this does not add the entity to the cell count. Stow refuses the entity and explains that it must be released. Release is separate from equip/stow and returns the entity to the world.

Eventually preserve the held entity through opening/closing inventory. The existing inventory already calls `retireCombatViewInput(...,{preserveCarry:true})`. UI review must not break that behavior. Never silently drop a person as a side effect of menu focus.

## Symbols and defense language

| Concept | Symbol | Visible label / accessible name | Mechanical meaning |
| --- | --- | --- | --- |
| Life | Heart | Health | Remaining HP |
| Power resource | Lightning bolt | Energy | Spendable energy; infinity when appropriate |
| Protection family | Shield | Defense | Category heading only, not a new combined resource |
| Passive personal protection | Shield + label | Armor | `armor/armorMax`; current damage flow absorbs a fraction of incoming damage, recovers after a calm period |
| Active blocking | Shield + label | Guard | `guardMeter`; active stance, directional/type rules, meter break and stagger |
| Temporary barrier pool | Shield + label | Shield | `_shieldHp`; separate gadget pool |

Do not combine armor, guard or temporary shield into one unlabeled meter. A shared shield silhouette unifies visual language without changing mechanics. Keep labels and numbers alongside icons; color alone must never convey the distinction. Icons in the artifact are decorative SVGs paired with visible text. Buttons have accessible names, keyboard focus indicators and a live feedback region.

## Handheld device camera

Square and widescreen previews show an illustrative situation map within a physical device frame. They are camera composition proposals over a captured current game frame, not working in-world devices. Hand silhouettes and the map are explicitly illustrative.

Target 75–80% of the usable view's limiting dimension (78% in this prototype), preserving peripheral world visibility. Square uses 1:1; widescreen uses 16:9, constrained by both available width and height. This defines dimension coverage rather than claiming 78% pixel area: a square cannot occupy 78% of a wide display's area without clipping. Compact portrait layouts use a more generous fit and remain a layout exploration.

Future transition: acquire device → snapshot prior hand/camera state → physically raise device in hands → blend camera toward screen → route UI input to device. Lower/cancel restores the previous camera and valid hand ownership. Avoid accidental power release when changing input context. Loss of the device, KO, vehicle entry and world transitions must also retire device input and restore a valid camera. Raising/reading should not fabricate a pause in multiplayer; whether the player can walk while reading remains a tuning choice.

## Vehicle chase camera

The vehicle preview is an illustrative composition, not evidence of a functioning camera switch. Future entry moves the chase anchor to vehicle chassis bounds, frames the complete vehicle and enough road ahead, uses speed-sensitive look-ahead/FOV, and keeps roll/horizon stable. Camera collision checks use vehicle clearance. Exit restores the on-foot camera only after the character has a valid world position. Reduced-motion settings should limit extra FOV growth and shake.

Current `scout-driving.js` seats the hidden actor in the vehicle and leaves the actor as chase target; it sets `_chaseSnap`. A real vehicle camera policy therefore needs explicit integration rather than assuming the existing seat translation fulfills this design.

## Command radial binding

Do not use Z. `src/core/settings.js` uses Z for descend in most schemes, an alternate scheme uses Z for item, and soldier controls toggle prone on Z. J is vehicle entry/exit and has legacy held-person behavior; I opens inventory; N has training actions; M mutes; backquote opens the console.

Propose remappable **hold U** for the command radial; no `KeyU` binding was found in `src` during this review. An explicit Commands button is the touch/accessibility fallback. Use hold to reveal, pointer/stick to highlight and release to issue; Escape or releasing at the center cancels. Add a tap-to-open accessibility option with explicit confirm. Do not wire this key in the standalone mock-up or claim it is available in the live game. Re-check all user remaps before shipping.

## Evidence and verification

An initial headless capture remained in battlefield preparation beyond a 180-second budget; its loading screen was rejected. A bounded fresh headful Chromium diagnosis then completed native character-selection and squad entry in 8.37 seconds on RTX 4090 / Direct3D11, with both loading promises resolved, 296 shader programs and no recorded page, console or request failures. No game bug was reproduced or code fix claimed. See `artifacts/frontline-preparation-diagnosis-20260914/diagnosis.json`.

The final `node tools/inventory-concept-capture.mjs --hud` capture succeeds through native UI entry into PowerWorld's Threat Room, with real Health / Energy / Guard and attack controls. `artifacts/inventory-concept-2026-09-14/current-game-hud.json` confirms `frontlineReady: true`, `preparing: false` and no page errors. This successful native capture replaced the earlier training fallback as the concept background. Review controls, sample equipment, map and vehicle art remain separate overlays, not fabricated live-game screenshots.

`node tools/inventory-concept-capture.mjs` checks all five preview states, rifle two-hand ownership, carried person storage rejection, release, pistol equip/stow, Escape dismissal and 844 × 390 horizontal overflow. It captures each view and records page errors in `verification.json`. No gameplay test or full inventory regression is claimed by these concept checks.

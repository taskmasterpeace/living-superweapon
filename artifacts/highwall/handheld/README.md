# Physical handheld device checkpoint

Native flow: press **I**, choose the owned **Game device**, inspect the physical screen, then **Escape** (or the return button) to put it away. The backpack window closes while the same gameplay camera moves to the device in the actor's hands. The screen is a real 16:9 surface with “COMING SOON”; no games are implemented.

Implementation is in `src/engine/handheld-device-view.js`, with bounded hooks in `inventory-panel.js` and `Game.cameraDrive` / `prepareCombatView`. The new ivory/dark/red prop has explicit left/right grip anchors. The pose is **procedural reach/hold**, applied after the current modular body's animation using the existing arm solver. It is not a purchased retrieval clip. Entry and exit use 0.32-second smooth transitions; camera distance adapts to aspect ratio and uses existing wall/terrain camera traces. No entity root, character aim, simulation clock, world audio bus or character sight rule is changed.

Both hands are reserved. A compatible issued weapon is temporarily stowed through the existing inventory function; its actual slot, ammunition and mesh remain owned. Return releases the device claims and restores the same weapon when safe. Damage interrupts the view; death, owner/rig change or a stopped match disposes it. Incapacitation can defer redrawing until recovery.

The initial hold supports upright grounded modular bodies. Flight, prone/crouch, deep water, vehicles, carried loads, occupied hands, active combat/reload, missing device ownership, unsupported bodies and non-perspective view produce explicit refusal feedback. Those variants are not silently treated as working. The footer no longer opens a device that is absent from inventory.

## Evidence

`tools/handheld-device-browser.mjs` ran actual Highwall with the restored M16 soldier. It used native inventory controls, Escape, then W to verify returned movement. `result.json` records 35 camera frames across entry/hold/exit; 23 hold samples had maximum palm-to-grip distance 0.2103 world units (about 4 cm). The native actor clock advanced 3.23 seconds through the inspection, with the world still running. The same M16 gear, ammunition object and rendered mesh survived; it was visible and drawn again after return. No page or engine errors were reported.

The additional damage check used native `takeDamage`: HP changed from 100 to 98, the view closed and the weapon redrew. This is an interruption fixture, not an enemy firing demonstration. An inventory-without-device check confirmed no device button was offered.

- `before.png`, `held-screen.png`, `returned.png`: actual gameplay camera.
- `held-front.png`, `held-left.png`, `held-right.png`, `held-rear.png`: diagnostic camera views of the same live body/prop; no substitute model. Character-owned scenery concealment remains enabled, explaining the dark unseen environment in some views.
- `result.json`: native timestamps, camera positions, contact measurements, weapon identity, damage and return-control results.

Visual review found and corrected an inverted screen and an initial close-camera head/vest obstruction before these final captures. The final screen is upright and unobstructed, and both profiles show separated arms reaching the device. The current fingers use the existing body pose; a polished authored pocket-retrieval/finger interaction sequence remains future work. Sound playback is not replaced or paused; subjective listening is not certified by this test.

Verification: `handheld-device.test.mjs` checks real modular-body contact, bounded camera movement, root/aim preservation, native equip/stow/restore with unchanged ammunition, interruption and admission. The combined handheld/terminal/interactable/interaction-view run passed 10 tests. A production build passed after initial integration; the parent checkpoint runs the final build after all concurrent changes.

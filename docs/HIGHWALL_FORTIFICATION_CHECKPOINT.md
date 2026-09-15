# Highwall fortification and sight correction — 2026-09-15

This continues the playable-integration checkpoint. It does not restart Highwall or certify the entire animation/audio milestone as complete. The supplied military-wall reference guides construction hierarchy; no image geometry or printed dimensions were copied.

## What changed

Highwall uses the reusable `fortification-kit` registry and renderer. The layout declares module instances; their physical recipes generate the visible structure and the solids consumed by collision, navigation, projectile blocking and surface sight. The service gate keeps its original moving collider/controller and now uses the same kit's gate leaf. Save/resume, corpse policy, restored weapons and soldier equipment remain in place.

Player sight no longer uses the old 96u arena radius in Highwall. Native browser evidence sees a clear target 900u away. Exact obstruction and character facing still apply. The render camera retains its technical far plane; this is not an infinite-world renderer. AI retains its own perception/awareness settings rather than borrowing the orbit camera.

Double-tap Alt orbit leaves the animation-owned head and aim unchanged, including the camera's return blend. Held Alt still supports the existing natural head glance. Wheel zoom remains in the existing control path.

The handheld is now a physical inventory-owned object. Press **I → Game device** while upright and grounded; the backpack closes and the camera moves smoothly to its 16:9 screen in 0.32 seconds. **Escape** puts it away. The world continues running, damage interrupts inspection, and the same weapon mesh, gear and ammunition return afterward. Native entry/exit, movement afterward, damage interruption and missing-item refusal were verified. The screen says **COMING SOON**. This uses a newly authored prop and procedural arm reach/hold, not an imported retrieval animation; flight, vehicles, carried loads and unsupported body poses are explicitly refused.

## 1. Modules

28 definitions: tall straight/half/corner/end-cap/pillar; gate frame/closed leaf/open frame; tower and wall/tower transition; low wall/half-height wall/low corner; barricade/sandbags/fence; bunker; stairs/stepped ramp/platform/wall walkway/ground-platform transition; camera/searchlight/antenna/AA/device/interaction mounts. See `FORTIFICATION_KIT.md` for exact registry IDs and APIs.

## 2. Dimensions

World scale is 0.19m/u. Standard panel is 32u long, 48u high, 12u deep; half panel is 16u. Highwall primary panels override height to 48.126u (30ft). Low cover is 7u, intermediate wall 24u. Tower is 32×66×32u with its accessible deck at48u. Standard bunker is48×26×40u with2u floor thickness. The existing observation deck carries a76×28×32u bunker, floor at12u. Its terminal is8×10×5.2u with recessed16:9 screen. The live service-gate frame is94u wide with70u clear opening; the existing leaf is70u wide.

## 3. Connections

Placements are `{id,moduleId,x,y,z,rotation,span?,height?,depth?}`. Rotations are quarter turns; full/half lengths are32/16u. Matching connections require equal socket type, coincident world position and opposing normals. Solid bounds, opening dimensions, mount points and traversal metadata are returned with each transformed instance. Dimensions can adapt legacy placements without inventing separate renderer-only walls. Stairs regenerate treads at at most1.5u rise; they never scale into unwalkable giant risers.

## 4–5. Reuse and new authorship

The six restored facility entries were inspected: warehouse, fabrication/printer structures, cloning vat and runway. None supplies appropriate detachable fortress panels or a standalone terminal. They remain intact. This kit and terminal housing are newly authored with the existing Three.js flat-shaded material/geometry system. Existing soldier bodies, M16/service pistol, audio bank, gate logic, surveillance cameras and media playback are reused. Hardpoints are attachment locations, not weapons disguised as scenery.

## 6. Layout migration

The western labyrinth, armored lane, covered passages and open yard retain their roles and starting locations. Wall chains now use full/half panels, structural supports and end caps. Three perimeter towers use the shared tower module. The eastern tower has a real96u stair flight to its48u deck. The observation block gains the enclosed bunker, one coherent30u stair flight and a short doorway threshold. The live camera terminal and media devices sit inside. Yard barricade, sandbags and fence add lower silhouettes. One empty AA hardpoint is mounted on the tower; it does not claim an accepted AA weapon.

## 7. Gameplay verification

The final combined suite passed **185 tests**, and the production build passed (630 modules; existing large-chunk warning). Coverage includes the 97 initial focused checks covering module solids/skins/sockets, ground and elevated navigation, gate movement/invalidation, native wall/projectile contact, head/orbit controls, inventory session behavior and terminal handling. A subsequent gate regression reproduced and fixed an oversized clearance radius that prevented opening while standing at the collision face. Closing and overhead-body protections remain. Another 29 existing asset/audio/corpse/loot/infection/fleet/spatial-navigation regressions passed; a new remembered-elevation test verifies that AI navigation keeps the last observed height rather than reading a hidden target's current position.

Native Fighter tests climb and descend stairs at30/60/120Hz and reach the actual Highwall tower. A native browser run uses `controlBot` and `Fighter.update` from fixed scenario starting positions: one soldier reaches the tower deck at48u; another reaches the bunker floor at12u. No position writes occur during those traversals. The browser's diagnostic screenshots disable player concealment explicitly; they are architecture inspection, not evidence that the player can see the whole maze.

Native E interaction opens the surveillance controls from inside the bunker; Escape returns control, and the physical monitor displays its actual camera feed. The native run reported no page or engine errors.

The six-case native regression then passed: multi-corner keyboard traversal; contact-position E gate opening and passage with navigation revision updated; native rifle hits stopped by wall and low cover; flyer crossing with orbit still hiding an obstructed ground actor; a real zombie pursuing from its own perception and memory; and native J/W/A/D/Space tank driving around real lane obstacles. Each case declares its initial fixture. The tank is operated by test keyboard inputs, not an AI crew. These are repeatable isolated checks, not one uninterrupted battle video.

Surface concealment now renders existing collision solids from the character's eye into a depth texture and applies the result to fortification surfaces and terminals. GPU pixel checks cover closed wall, moved wall/opening, orbit independence, passage below an elevated roof, above-wall sight and clear/blocked900u targets. Native actor-concealment checks remain separate. Surveillance temporarily bypasses the player's mask for its own camera feed and restores it afterward.

The navigation grid changed from6u to4u because the old lattice missed a physically valid fortified-gate bypass. Layered support routes use real standable surfaces, headroom and step limits. A small coplanar landing tolerance fixes a native sweep seam at stair/deck boundaries. No hidden waypoints or teleporting stair scripts were added.

Pursuit review also found an obstructed search-goal stall. The shared navigation service now projects only blocked exploratory goals within 32u on their requested floor, trying at most eight real routes and caching against geometry revisions. It preserves the original belief; explicit orders and visible targets are not redirected. Grounded cold patrol samples the published `world.groundNavigation.bounds`, while flyers retain their larger arena. The final hardware run reacquired the player after both occluding corners (602 sight samples, 124 memory samples), with no page or engine errors. The evidence README distinguishes the actual control path from a stale cached route diagnostic.

## 8. Evidence

- `artifacts/fortification-kit/module-lineup.png`: isolated module family, current soldier scale references.
- `artifacts/fortification-kit/soldier-wall-scale.png`: current soldier and primary wall.
- `artifacts/highwall/fortification/soldier-height.png`: native ready view with visibility enabled.
- `artifacts/highwall/fortification/battlefield-diagnostic.png`: full authored layout, inspection only.
- `artifacts/highwall/fortification/fortified-gate.png`: live gate/frame family.
- `artifacts/highwall/fortification/bunker-approach.png` and `bunker-terminal.png`: native enclosure and terminal placement.
- `artifacts/highwall/fortification/result.json`: native tower/bunker traversal and distant actor sight.
- `artifacts/highwall/fortification/native-terminal-controls.png`: native E surveillance interaction inside the bunker.
- `artifacts/highwall/fortification-regression/result.json`: six actual runtime regression cases, fixture disclosures and hardware telemetry.
- `artifacts/highwall/surface-sight/gpu.json`: rendered surface visibility checks.
- `artifacts/highwall/handheld/held-screen.png` and `README.md`: physical device camera, native ownership/return evidence and pose limitations. Implementation: `src/engine/handheld-device-view.js` with inventory and camera-owner hooks.

## 9. Remaining acceptance

Do not call the complete wall pass accepted merely from tests. Native perspective review found and corrected distant depth fighting: armor accents now occupy non-overlapping regions of the exterior union surface. The camera near/far, shadows and print pass were preserved. Current gate, bunker and overhead captures were inspected after this correction. The two other towers have no connected ground access route yet. Smooth analytic ramps are unsupported; the supplied ramp is visibly stepped access.

The next highest-value integration blocker is a reproducible performance budget. Hardware Chrome identified the RTX 4090 through ANGLE/D3D11. Early ready-state samples varied around 25–51 FPS; a later warmed sample with surface sight enabled reached 68 FPS at adaptive pixel ratio 0.86. A comparison with the depth pass skipped reached 79 FPS at pixel ratio 1.0, so it is not a valid isolated measurement of that pass's cost. Earlier headless Chromium used SwiftShader and was much slower; that software result must not be presented as the player's hardware performance. These short, changing-resolution samples establish neither population limits nor a steady 60 FPS budget. Profile simulation, visibility, character rendering and the new environment at fixed resolution after warm-up before increasing population. The navigation planner remains bounded.

Concealment removes unseen surface detail but still allows some silhouette/background information and does not yet cover every effect or vehicle presentation. Full volumetric concealment is not claimed. The physical device's airborne variants, pocket-retrieval animation and polished finger interaction remain unsupported. No player-facing map editor, new AA combat implementation or vehicle crew was added. Source firearm reload motions, broader reaction coverage and subjective audio listening acceptance remain part of the wider integration work.

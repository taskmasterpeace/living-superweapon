# Selection and research-outpost direction

## Creator decisions

- Approved: all-roster face grid plus a large selected hero, not three pilot characters.
- Requested: a TV behind the selected hero showing news footage involving that hero.
- Approved via multiple-choice response: research outpost (lab, vehicle yard, roof access).
- Approved via multiple-choice response: breakable walls, doors and selected floors, with bounded debris.
- Vehicle fantasy: capable hero lifts a vehicle, flies with it, throws it, and the impact can cause an explosion.

## Implementation order

1. Full-roster information: use the companion full-roster inventory as the coverage baseline. Fix descriptions using actual ability flags; shared data must serve selection, comparisons and the harness. Distinguish authored base stats from measured results.
2. Selection: reuse the existing selection flow and one live hero preview. Cached/lazy face portraits for 55 cards. Name search; movement and equipped-mechanic filters; complete power details; optional two-hero comparison. Keep combat-readability Impact styling and mobile layout.
3. News TV: preserve the existing bounded frame transport and cleanup. Add actor/target hero IDs to capture metadata, including extended recordings. Filter on exact IDs. Unknown legacy clips remain general footage. Selected-hero empty state must be honest. Pause decoder/timer off-screen. Existing clips are silent, browser-session only.
4. Vehicle lift proof: identify compatible vehicle props, synchronize carried collision/ownership, attach the carried object correctly, use swept world/target collision and terrain-correct impact, then prove pickup -> flight -> throw -> impact damage/explosion with native controls. Do not count the legacy method's existence as completion.
5. One outpost: author/import a small lab with two entry routes, roof access and a vehicle yard. Use a destructible module contract before expanding into a generator.

## Pascal audit: useful reuse

Repository: https://github.com/pascalorg/editor

The MIT-licensed editor uses React Three Fiber/WebGPU. Our game need not migrate renderers to reuse authored building data.

Verified wall schema contains endpoint coordinates, thickness/height in meters, separate interior/exterior material slots, door/window children, support slab references and terrain-fill behavior. Useful for modular wall/opening authoring and unit-aware import.

Sources:
- https://github.com/pascalorg/editor/blob/main/LICENSE
- https://github.com/pascalorg/editor/blob/main/packages/core/src/schema/nodes/wall.ts
- https://github.com/pascalorg/editor/blob/main/packages/core/src/schema/nodes/door.ts
- https://github.com/pascalorg/editor/blob/main/packages/mcp/src/tools/export-glb.ts

The headless export_glb tool explicitly returns not_implemented. Do not schedule automated GLB export as a working dependency. A structured scene-data adapter is the candidate route; browser export and exact interchange acquisition still need a reproduction test.

Proposed game module adds stable ID, transform/units, collision pieces, material/health, intact/breached state, opening connections and debris budget. These are OUR proposed gameplay fields, not verified Pascal features. Import/geometry reuse does not automatically supply combat destruction, soldier navigation, camera collision or optimization.

Done means: soldier enters normally; hero breaches a designated wall; bullets/beam LOS and collision update together; the opening is navigable; roof/floor transitions work; debris count is bounded; resetting the scenario restores everything. Only then generalize to a building generator.

## Current evidence gaps

- News finalized clips currently lack actor/target hero IDs; collectFootage returns all clips.
- Generic HUD descriptions misdescribe web snare and omit firearm resource distinctions.
- Flight boost still needs a measured audit; move speed is not flight top speed.
- No new selection UI, Pascal integration or vehicle native-input proof was completed in this audit.

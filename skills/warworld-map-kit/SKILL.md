---
name: warworld-map-kit
description: Author and revise War World battlefields from the shared fortification kit, with connected combat spaces, scenario spawns, matching collision and navigation, and visual/playtest evidence. Use for LEGO-style map production; does not imply building an editor UI.
---

# War World modular battlefield authoring

Find the active War World checkout and read its AGENTS.md. Current integration checkout: D:/lsw/.worktrees/combat-release-review. Verify branch and local server identity before editing; do not assume another server uses this checkout.

## Source contracts
- `src/data/fortification-kit.js`: authoritative module IDs, dimensions, recipes, sockets and physical solids. `fortificationPlacement` transforms geometry and metadata together.
- `src/engine/fortification-kit.js`: exterior union renderer. Do not add nearly coplanar armor skins or decorative walls with different hidden collision.
- `src/data/highwall.js`: authored placements, bounds, courtyards, spawn areas and initial actor positions.
- `src/data/highwall-scenarios.js`: populations and scenario rules, separate from environment.
- `src/engine/highwall-navigation.js`: actual support/ground routing. Missing routes are bugs or unsupported access, never justification for invisible waypoints or teleporting agents.

## Build with the kit
World scale is .19m/u. Standard wall length32u; half16u; long128u. Main height48u, depth12u. Border defaults256x96x24u. Use `tall-long-corner` for a right-angle L; the former rounded curve is rejected. Placements: `{id,moduleId,x,y,z,rotation,span?,height?,depth?}`. Rotations are quarter turns. Snap compatible sockets at equal positions with opposite normals; use `fortificationSocketsConnect` rather than visual guessing. Origins are ground-centered. Preserve stable IDs when revising existing maps.

Gate/door closed and damaged variants block, open and destroyed variants clear the central passage. Authored variants do not implement automatic weapon damage transitions. The interactive service gate owns its moving collider separately; preserve that controller.

## Compose encounters
Sketch courtyard connections before placing details. Give major courtyards multiple exits, alternate flank loops and readable long sight lines. Break selected firing lines with offset lower cover; avoid blocking every center or making every lane identical. Keep vehicle routes connected with sufficient turning clearance. Keep infantry-only routes intentionally distinct. Flyers may cross wall tops; no invisible ceiling. Raised positions need actual stairs and enough headroom. Preserve the bunker, terminal, gate and scenario contracts unless the task requests relocation.

Keep populations stable when enlarging geometry until performance and encounter pacing are measured. Spawn areas are data; actual squads must use valid points within them. Check every team, infected, vehicle and initial objective position against the new solids. Use restrained muster markings, not giant glowing spawn pads. Spawn areas alone do not constitute reinforcement scheduling or a spawn UI.

## Required checks
Run `node --test tools/highwall-courtyards.test.mjs tools/fortification-expansion.test.mjs tools/fortification-kit.test.mjs` for data/solid checks. Tests importing the game need `node --import ./tools/helpers/character-css-loader.mjs --test ...`. Test routes between all authored spawn areas and real stairs, plus gate invalidation. Rebuilding placements must regenerate collision, weapon/sight obstruction and navigation through existing Highwall rebuild.

Capture a source-layout overview and current-character ground views. Label inspection views with concealment disabled; never present them as player-visibility proof. Use `tools/highwall-spacious-browser.mjs` as the existing isolated capture starting point. It currently assumes the local integration server on port5193; verify identity first.

Then run native play checks for changes to encounters: traverse multiple routes, fire against new cover, follow AI pursuit using its sight/memory, cross walls in flight, and drive the designated lane if affected. Unit path success is not proof of fun, stable population performance or full gameplay acceptance. Report precisely which checks ran, what remains untested and where screenshots/data are saved. No player-facing map editor unless separately requested.

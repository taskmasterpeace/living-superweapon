# Proving ground and five fleet vehicles: scoped integration map

Audit date: September 15, 2026. Destination: `D:/lsw/.worktrees/combat-release-review`, inspected at `4bb4d54`. Runtime source: `D:/lsw/.worktrees/pw-launch-inheritance`, inspected at `73d86f9`. Asset source: `D:/lsw`, fleet handoff implementation through `e0f0beb`. This document is the audit output; it does not claim the destination integration is complete.

## Immediate integration choice

Transplant the seven independent runtime/data modules below, five catalog records and their current GLB packages. Add narrowly scoped hooks to the destination game, entity, camera and boot code. Do not merge the source branch or replace shared engine files wholesale. The destination already contains the PowerWorld stage, terrain sculpt/restore API, scout/aircraft ownership and recent combat/vehicle impact changes.

Read source handoffs: `D:/lsw/docs/gameplay/FLEET_LOCAL_HANDOFF.md`, `FLEET_TRANSFER.md`, and `FLEET_UNIT_HANDOFF.md`. They explicitly distinguish authored assets/workshop demonstrations from live handling. The seven generic driving modules exist in the proving-ground worktree, **not** in the main `D:/lsw` checkout. Both sources are needed.

## Five different existing driving classes

| Catalog ID | Existing class and behavior | Current package directory under public/authored-assets | GLB bytes |
|---|---|---|---:|
| `motorcycle` | `wheeled`: acceleration, reverse, grip, speed-dependent steering, visible lean | `prop.reference-motorcycle/v6` | 95,660 |
| `tank` | `tracked`: slow acceleration, stationary pivot, separate turret state | `prop.reference-tank/v7` | 258,216 |
| `mech-light` | `mech`: walker motion, power state, stride clock and independent torso state | `prop.reference-mech-light/v6` | 340,476 |
| `helicopter` | `rotor`: hover, vertical lift, spool and forward lean, spinning rotors | `prop.reference-helicopter/v8` | 594,428 |
| `jet-a` | `fixedwing`: throttle, airspeed, bank, pitch, stall/lift, control-surface articulation | `prop.reference-jet-a/v15` | 444,540 |

These are five actual motion classes, not five skins of one controller. Their envelope rows already exist. Speeds remain the source's tunable proposals, not approved final balance. Hover and ship classes remain available in the source for later integration.

The five GLBs total 1,733,320 bytes. Each selected GLB is byte-identical between both source worktrees (SHA-256 checked); the complete catalogs differ, so select records by ID. Destination had no `public/reference-fleet/catalog.json` at audit time. Copy `model.glb` and `manifest.json` from each listed package; construct a scoped catalog preserving original row fields and URL. Keep any subsequently added destination catalog records. If importing only these packages, limit the proving-ground selector to these five IDs; the original all-fleet selector would offer missing assets.

Native scale is 0.19 metres per game unit. GLBs already use game units. Preserve the source centering/feet normalization, **without** the frontline aircraft's separate ×5 scale. Authoring recipes, icons, fleet workshop, 152 other packages and the authoring dependency installation are unnecessary for this runtime slice. Optional selection thumbnails can copy only the five matching PNGs from `public/reference-fleet/icons/`.

## Independent files from pw-launch-inheritance

| New destination path | Dependencies/purpose |
|---|---|
| `src/data/vehicle-envelopes.js` | Pure tuning registry; seven classes, including five selected IDs. No imports. |
| `src/data/fleet-handling.js` | Imports vehicle-envelopes; catalog classification and envelope resolution. |
| `src/engine/vehicle-motion.js` | Pure class steppers and wind carry; no imports. |
| `src/engine/vehicle-rig.js` | Pure named-node binding/articulation; no imports. |
| `src/engine/vehicle-pilot.js` | Imports vehicle-motion and vehicle-rig; terrain/cover sweep and wrapper pose. |
| `src/engine/fleet-pilot.js` | Imports vehicle-pilot and existing `abilities.cancelHeldAttacks`; player boarding/input/exit. Adapt ownership gaps below. |
| `src/engine/vehicle-sim.js` | Terrain layout/restore and procedural proving-ground meshes; Three is passed to builders. No imported dependencies. |

The source versions of these seven paths were clean at audit time. Use path-scoped copies from that worktree/commit. No package.json, lockfile, Vite or full fleet-workshop transplant is required: destination already uses Three, and the GLB loader can use `three/addons/loaders/GLTFLoader.js` as in the source import.

## Shared-file hooks and conflicts

| Destination seam | Minimal integration |
|---|---|
| `src/engine/game.js` imports | FleetPilot, handling helpers, initVehicleState, bindVehicleParts, GLTFLoader, selected vehicle-sim exports. |
| game spawn/deploy API | Source `spawnFleetVehicle` around line 2124; `deployVehicleSim`, `simSwap`, `_simWarpFx`, `simEnterRing`, `simEnterBoxRing` around lines 2001–2117. Prefer extracting a new mixin/module rather than adding a large copied block to the orchestrator. |
| game controlPlayer | Fleet input consumes input before native combat/scout paths. Source hooks around 3646–3649; preserve current input cancellation, movement gears, guided spear and person carry. Keys are J board/exit, L swap, K octagon, P boxing; register only while the proving ground is active. |
| game update/vision | Step active fleet actor; synchronize seat after fighter physics; avoid double movement. Add fleet occupant to existing hidden-driver vision gate. Source update block around 4294–4368 includes ring rules, sky rings, tracking-only AA and water air timer. Copy only intended proving-ground behavior. |
| game clearTransients | Exit pilot, invalidate pending loads, remove actors, teardownSimProps, restoreSimArena and reset sim state. Preserve current passenger/scout/aircraft cleanup. |
| `src/engine/entity.js` | Add `_fleetVehicle` to existing seat-owned movement AND articulation early returns (destination around 1740 and 2413). Preserve `_passengerTransport` and status/cooldown processing. This is a source gap, not code to copy from its entity file. |
| `src/data/camera-presets.js` | Add source `CLASS_CAMERA`/`cameraForClass`, then `_fleetVehicle` priority in cameraProfileOf. Preserve destination preference and aircraft/scout logic. |
| `src/engine/world.js` | Existing levelArea/restoreTerrainPatch/heightAt are sufficient for sculpting. Review current BFP camera route so fleet profile is honored, with vehicle heading/size; do not overwrite its current combat or aircraft camera. |
| `src/boot.js` | Source Shift+V entry around 563–564 calls deployVehicleSim for training/freeroam/powerworld. Add a discoverable UI entry as desired; preserve current shortcuts. |
| `src/engine/player-status.js` + view | Optional source vehicle dashboard derives speed/top/altitude/vspeed from the fleet actor. Add only this field and corresponding rendering to the existing view; do not replace status UI. |

`powerworld.js` needs no whole-file replacement: deployment calls existing `startMode('powerworld', {p1, encounter:'practice'})`. Existing mode switches are destructive to the current encounter by design; use an explicit entry action. A new mode registration is not required for the source Shift+V pathway.

## Source limitations to handle honestly

1. **Seat physics ownership:** source FleetPilot sets `_fleetVehicle`, but source Fighter movement/articulation gates omit it. Source tests stub the fighter, so they cannot catch native gravity/articulation running after seating. Add the destination gates and validate actual Fighter updates.
2. **Cancellation and asynchronous lifecycle:** source async spawn/deploy has no request generation guard. Rapid swaps or a mode change during GLB loading can append a stale vehicle or leave multiple spawns. Invalidate on clear/swap; check mode/request after awaiting. Clear stale driving inputs on pause, blur and cancellation so held throttle cannot resume unexpectedly.
3. **Boarding and exit are demonstration logic:** nearest only measures XZ, then hides the driver at hull center. Fixedwing source spawn starts 40 units above terrain at 55% top speed, so ground players can board an overhead jet. Define an explicit simulator launch/boarding policy; do not describe this as physical socket boarding. Ordinary exit lacks free-space/ground checks. Prevent boarding while grabbed/carrying or already in another seat.
4. **Vehicle combat is not integrated:** spawned actors have no cover/HP/damage contract and no weapon firing. Existing shared-impact damage recognizes authoritative cover-backed frontline vehicle/aircraft records. Do not invent damage by adding a visual flag. Route any later fleet combat through that owner with one actual cover/damage record.
5. **Riders/articulation are incomplete:** source hides every occupant, including motorcycle riders; no seat-socket rider pose is applied. Mech rig drives torso but not articulated walking legs, despite the stride clock. Turret/torso inputs `aimX`/`aimY` are hardcoded zero in FleetPilot. Expose these as current limitations unless the integration supplies them. Native source models have the required sockets/nodes; workshop preview alone is not live gameplay proof.
6. **Cached GLB disposal:** source clones share geometry/material resources with cached scenes, then disposes geometries on swaps. Choose cache-owned shared lifetime or clone owned resources before disposal; do not dispose resources still referenced by another active actor.
7. **Input scope:** FleetPilot currently reads keyboard input only. Existing native pad/mobile intent must remain available for on-foot combat; do not claim fleet pad/mobile parity until explicitly connected and tested.
8. **Ring state:** source toggles `noPowers` and clears it to false on leaving/teardown. Preserve preexisting restrictions when adapting this into current gameplay. Source boxing ring's powers gate does not itself establish a fully enforced boxing ruleset for every melee variant.

## Verification and acceptance

Audit execution in source: `node --test tools/vehicle-pilot.test.mjs tools/vehicle-rig.test.mjs tools/vehicle-sim.test.mjs tools/fleet-handling.test.mjs` passed **32 tests**. This establishes source class motion, collision, rig binding and sculpt/restore checks; it is not a destination integration or browser acceptance result.

Transfer corresponding tests. Full `tools/vehicle-motion.test.mjs` also imports `tools/vehicle-stats.mjs`; transfer that helper if taking the suite. `fleet-handling.test.mjs` assumes a full 157-entry catalog, so adapt its fixture/expectations for a five-entry runtime catalog without presenting omitted assets as missing dependencies. `fleet-pilot.test.mjs` imports abilities and therefore needs the destination's existing character CSS Node loader (`--import ./tools/helpers/character-css-loader.mjs`) if the actual import chain reaches CSS.

Before claiming playable integration, verify each real GLB through the production entry path: select, board, accelerate, turn, stop/hover, exit, swap and leave mode. Check vehicle-specific camera, on-foot combat immediately after exit, pause/blur/release, death, reload, repeated async swaps and terrain restoration. Show five distinct movement behaviors, not only a screenshot of parked assets. Run destination build plus focused fleet/terrain/seat tests and preserve current shared-impact/guided-spear/contact regressions. Record any hidden rider, missing gait or unavailable weapon behavior explicitly.

## Follow-up integration status

After the audit, the integration owner transplanted the seven modules and five packages, wired the current game/boot, and added the fleet seat gates. The original full catalog is retained only as `tools/fixtures/fleet-catalog-source.json` for classification tests; deployment serves five records. This separates source coverage tests from the playable subset.

A subsequent bounded fix in `game.js` now stamps deployment requests and checks the existing match generation after catalog/model awaits. Reset or newer swaps retire stale work, including actors completed immediately before a newer continuation. Spawned instances own cloned geometry; cached materials/textures remain shared and are not disposed by vehicle swaps. Entering the proving ground from an active Threat Room now calls the normal PowerWorld practice transition, because `modeId === 'powerworld'` alone does not establish that the desert stage is active.

`tools/fleet-lifecycle.test.mjs` reproduces delayed GLB/catalog reset, out-of-order deployment, Threat Room transition and shared geometry ownership. All five new regressions pass; the combined lifecycle/pilot/rig/simulator suite passed **37 tests**. The integration owner's production browser pass remains the authority for rendered acceptance. The remaining presentation, controls, combat and boarding limitations above still apply unless separately resolved by that pass.

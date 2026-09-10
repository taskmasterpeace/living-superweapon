# Resource constructs — Task 2 report

Scope: native tank geometry, placement, motion, independent cannon and lifecycle integration from `docs/superpowers/plans/2026-09-08-resource-constructs-brief.md`. Task 1 was independently approved before this work. No damage-receiver routing, catalog/portable authoring, Studio sequencing, city/pathfinding/driver framework, commits, staging, subagents or unrelated runtime edits.

Status: implemented, independently reviewed and parent browser/image-checked after the review corrections. This is not full resource-construct completion.

## Implementation and ownership

- New `src/engine/construct-tank.js`: finite validated tank parameters; safe initial placement; actual tracked hull/roadwheels/treads, separately driven turret/barrel; conservative candidate bounds, substepped movement/turning, native target/line-of-fire queries and native projectile cannon. This stays an adapter on the existing `Construct`, not an alternate owner/lifetime system.
- `src/engine/summons.js`: tank-only construction/update branches and articulated surface lifecycle. Existing timed fist/hammer/wall/turret actions, Task 1 ownership/resource checks and unique-resource disposal stay native.
- `src/engine/game.js` — `spawnConstruct` only: tank placement and parameter validation before any graphics or entry payment; null return for invalid placement, `slotState.placementDenied` set/cleared. Existing Task 1 ability branch already pays only after successful spawn and rebinds/dismisses existing tanks, so no additional ability-engine edits were needed for Task 2.
- New `tools/construct-tank.test.mjs`: native `Construct`, `Fighter`, `runSlot`, outgoing `Projectile` and existing Studio minimal test-world fixtures. Targets take damage only when the real native projectile contacts them.

### Tank contract

Protection covers a **10×14×8** hull/tracks/turret envelope, conservatively axis-aligned around its rotated corners. This is not per-triangle armor. A single dynamic box record updates with every accepted transform, never enters `coverAll`, and is removed by native disposal. Roadwheel outer faces were adjusted to fit the declared width after a rendered-geometry RED probe found a 0.05u overshoot. Float32 geometry checks use a 1e-6 tolerance.

The parent explicitly approved excluding the protruding barrel from protection. The barrel is a fixed **14.5u** from turret origin to visible muzzle, not view-dependent or telescoping. The actual named muzzle node supplies projectile position; no hidden offset emitter exists. Shot permission requires it to lie outside the own-box expansion (radius 1 plus 0.2u clearance), and obstruction checks cover the whole pivot-to-target/barrel lane, not merely the space after the tip.

Placement uses horizontal normalized owner aim at **16u** ahead, with native terrain height. It rejects arena exits, cover, interior-wall or live-Fighter hull overlaps, plus actual-barrel cover/interior overlap, before creating graphics/FX or charging cost/cooldown. Moving tanks turn no faster than configured rate, move only within .35 radians of travel heading, and stop within 2u of designation. Translation is substepped to ≤.5u and hull yaw to ≤.05 radians. Rejected candidates preserve the last safe position/yaw/proxy and report `blocked`, without pushing or damaging Fighters. Terrain changes over 1u per substep reject. No sliding, obstacle navigation, water or driver behavior is implied.

Primary ownership uses `game.player===owner` for cursor designation; other human/bot owners use their own horizontal direction. Motion updates the proxy immediately, while moving fog refresh is capped at 10 Hz, with final stop/removal refresh.

The turret independently slews in world yaw at ≤3 radians/s and limits barrel pitch to -.2.. .6 radians, also slewed at ≤3 radians/s. It uses the native nearest-hostile query from the tank position, restricted to real entities rather than decoys. No shot while translating/turning toward travel; holding/blocked tanks fire only within .08 radians of actual 3D aim and with clear native cover/interior lanes. Obstructed or ineligible opportunities do not reset cooldown. The cannon creates a native owner-attributed projectile with configured speed/damage/interval/range/blast, radius 1, normal ground collision, and no extra per-shot energy fee. Existing outgoing shots remain alive after their tank expires/disposes.

Close targets are now deliberately suppressed when their near surface is not ahead of the real muzzle: `(targetAim - muzzle) dot barrelDirection > target.radius + 1`. For perfectly aligned fire, safe minimum aim-point distance from turret pivot is therefore **14.5 + target.radius + 1 units** (17.7u for radius2.2). It never emits beyond a close target, invents close-range damage or spends the shot cooldown on that invalid opportunity.

The real barrel has a conservative **.62u-radius clearance capsule**, separate from protection. Initial placement and each candidate hull translation must leave it clear of native cover/interior shapes. Articulated yaw/pitch are advanced in ≤.02-radian angular substeps; any blocked candidate retains the last clear pose. The turret is world-stabilized during hull turns, with actual local/world orientation synchronized even when no target exists. No per-frame geometry sampling or armor-volume expansion was added.

### Articulated surfaces

The original `ConstructSurface` caches samples in its root's local space, so one root skin cannot follow an independently swiveling barrel. The tank has three native skins: hull/tracks root, turret shell and barrel mesh. The latter two have cloned solid materials, preventing opacity writes from stacking across skins. Their cached arrays follow their real parent transforms without geometry resampling/reallocation per frame. The combined particle count remains ≤2048 at maximum authored density; all three skins and their materials are disposed through native ownership. Legacy `ConstructSurface` code/behavior is unchanged.

Inspection handles are `c.body`, `c.turret`, `c.barrelPitchPivot`, `c.barrel`, `c.muzzle`; mesh names begin `construct-tank-`. `c.state` is `moving`, `blocked` or `holding`. No screenshot-only runtime counters were introduced.

## TDD evidence and verification

Initial native RED run: **27 tests, 21 failures**, for cone fallback/missing tank parts, unsafe placement billing/allocation, missing motion/proxy/fog and missing cannon. Task 1 timed KO/rebind behavior was already green.

Subsequent RED probes demonstrated and fixed:

1. Actual roadwheel width reached ±5.05 rather than ±5.
2. Missing separately rooted articulated skins; native turret/pitch motion now carries their samples with bounded independent materials.
3. Explicit-null tank settings silently fell back; only undefined now defaults.
4. Ideal-target LOS could clear while the tolerated current barrel angle still intersected nearby cover. Both actual barrel and intended target lanes are now checked with the existing native sweep.

Final focused command:

```powershell
node --test tools/construct-tank.test.mjs tools/construct-policy.test.mjs tools/construct-surface.test.mjs tools/construct-studio.test.mjs tools/projectile-contact.test.mjs tools/studio-audio.test.mjs
```

First result: **106 passed, 0 failed**, including **31 tank tests**. After the independent-review corrections below, the same command freshly passes **115 tests, 0 failed**, including **40 tank tests**. This covers native speed/fog at 30/60/120 Hz, thin-wall .2s steps, in-place-turn collision, body/interior/arena/terrain rejection, primary-vs-secondary designation, actual muzzle/native target damage, independent turret alignment, blockage/pitch/movement no-fire gates, cadence/energy exhaustion, legacy timed KO/rebind, unique disposal and articulated surface follow/budget.

Build: `npm run build` passed after the final review-correction gate, **274 modules**, 6.54 seconds. Existing large-chunk advisory remains.

### Independent-review corrections

- Close foe 10u ahead: RED emitted one shot from beyond the foe. GREEN emits none, leaves cooldown ready and resumes native firing after the foe moves to a valid distance.
- No-target hull turn followed by acquisition: RED actual world yaw jumped 1.4762/1.5262/1.5509 radians at30/60/120Hz. GREEN acquisition/loss/reacquisition world-yaw changes stay ≤3rad/s through native hull motion.
- Parent image review found the visible barrel crossed a thin fixture wall despite blocked shots. Added five RED clearance cases for initial placement, cover/interior translation, turret angular sweep and pitch rate/last-clear pose. GREEN uses the separate capsule candidate guard described above. The thin-wall test now begins ahead of the actual barrel tip and uses a genuine native box marker; it does not insert geometry through an existing barrel and call that a collision-avoidance success.

## Browser and completion boundary

Parent owns `tools/construct-tank-browser.mjs` and its run. Its first native capture recorded **961 frames, 3 native shots, 73.10598 target HP damage and zero errors**. Parent inspected images and identified the barrel-clipping issue above. That first capture predates the review corrections and is not final barrel-clearance/continuity approval.

Final native recheck after corrections: **961 simulated frames, 3 native shots, 73.1059803 target HP damage, zero errors**. Every frame's actual turret-to-muzzle capsule remained outside native cover; the test explicitly rejects inserting its thin wall through an already occupied barrel. The tank moved 30u along its first straight lane, turned, damaged a real SARGE using native projectiles, stopped before the wall and vanished with actual protection removed at depletion. Regeneration was disabled; native clamping produced 120 ki before the unchanged 24-ki entry cost, and the configured 2 ki/s upkeep left 64 ki at 16s. A deliberately low final pool then proved synchronous zero-ki cleanup with no extra shot. The test uses supplied runtime definitions until Task 4 publishes authoring.

Parent visually inspected `tank-detail.png`, travel/turn/cannon, corrected blocked and depleted images in `artifacts/construct-tank/`. The tank has readable tracks/turret/barrel, real travel and outgoing projectile/reaction. The corrected wall frame no longer shows the barrel tip protruding through the obstacle. Initial `production-camera.png` uses the player lens; the other images and motion recording use explicitly labeled inspection lenses, not a claim that the player's camera or input feel has changed. `native-tank.webm` is browser-paced scripted native simulation, not a real-time performance measurement.

Independent re-review approved: **13 focused tests freshly passed**, plus both original probes repeated. The close target now receives no invalid shot and cooldown stays ready; a 54u control still takes native projectile damage. The original acquisition jump fell from 1.52549rad to **0.05rad at 60 Hz**. Scope excludes Task 3/4 and externally inserted-overlap recovery.

Explicit limitation: there is no new recovery for geometry externally inserted through an already-occupied barrel, nor general clipping recovery for moving external obstacles/other weapons. The clearance guard assumes an initially clear accepted pose and rejects future invalid candidates. This is not a claim that all weapon clipping is solved. Optional lower-plane support on native cover receivers remains Task3; this guard preserves existing native collision-shape rules.

Task 3 remains open: callback physical receivers and damage-backed direct/splash/traveled-beam/melee billing; the tank box currently supplies obstruction, not those new receiver routes. Task 4 remains open: tank catalog pick, validated Attack controls/export/import and matching native resource Studio sequence/readouts. No existing roster kit was changed to tank/resource mode. Movement/readability approval requires the parent's browser/reviewer evidence, not Node tests alone.

Executing-plans and TDD supplied the scoped red-green checkpoints; Three.js lifecycle guidance kept motion/accounting outside material state and resources under native disposal. No skill-default physics/stack replacement was applied.

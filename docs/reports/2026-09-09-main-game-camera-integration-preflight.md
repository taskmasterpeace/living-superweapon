# Main-game BFP camera integration preflight — 2026-09-09

Read-only source audit. Only this report was added; no runtime/test/asset changes or browser captures. The Three.js review skill guided separation of presentation ownership from simulation. This is a proposed integration, not implemented functionality or visual acceptance.

## Finding

The normal root game does not currently select the BFP presentation. [main.js:7](D:/lsw/src/main.js:7) boots `PROFILE_FULL`, whose default mode is training ([boot.js:54](D:/lsw/src/boot.js:54)); the normal selected-city entry calls `startMode` ([boot.js:202](D:/lsw/src/boot.js:202)). PowerWorld alone establishes `ms.chaseCam` and actor `_openSky` ([game.js:208](D:/lsw/src/engine/game.js:208), [game.js:251](D:/lsw/src/engine/game.js:251)). Ordinary modes replace `ms` without that setting; Free Roam, for example, sets `{roam:true}` ([game.js:127](D:/lsw/src/engine/game.js:127)).

Setting `ms.chaseCam=true` is insufficient: `World.chase` still selects its older chase implementation unless the subject has `_openSky` ([world.js:2588](D:/lsw/src/engine/world.js:2588)). City input would still use cursor/ground aiming, and the projected crosshair and compact HUD would remain disabled. Conversely, setting `_openSky` changes gameplay, while stamping `body.powerworld` hides the actual city's wanted/news/nameplate UI. Neither is an acceptable integration shortcut.

The minimum coherent change is one explicit **view policy**, consumed by the camera, its aim controls and the HUD, without changing city or fighter simulation identity. Keep the real root entry, selected city, mode setup, police, crowds, correspondent, cover, terrain, collision and LOS.

## Reuse and required differences

| Seam | Reuse | Required bounded change |
| --- | --- | --- |
| Default entry | `PROFILE_FULL` and its existing `enter → startMode` route | Select BFP presentation for a normal one-local-player city match. Store the preference separately from per-mode `ms`, which setup replaces. Do not redirect to `powerworld.html` or replace the city. |
| Camera | Existing `_chaseBfp`, authored `model.camera` overrides, terrain/cover eye resolution and local foreground cutaway | Give `World.chase` an explicit presentation selection, or a public BFP entry. Derive `_bfpCameraActive` from that selection, not fighter `_openSky`. Route both pre-aim and final camera solves through the same selection. |
| Mouse aiming | Actual camera-center `aimTrace`, explicit `T` lock, visibility/range/LOS validation, muzzle-to-traced-point aim | Select these by active view, not `_openSky`. Preserve native slot selection, release/cancel, payment and `runSlot`. Remove city click-to-lock only while this view is active. |
| Movement and pad/touch | Native city planar movement, flight eligibility, rise/descend, evade and one simulation clock | Use actual flat camera basis where the selected movement scheme is camera-relative. Add an explicit one-player stick-look adapter; the existing pad branch is isometric and precedes camera-ray aim. Preserve two-player controls. |
| HUD | Existing compact meter/attack docks and projected crosshair | Use a separate presentation class, e.g. `combat-chase`, for shared layout/crosshair selectors. Keep the semantic `powerworld` class and its city-only hiding rules separate. Keep wanted/city/news visible and verify their layout together. |

Keep the established BFP defaults: rear range 25.5, lift 9, vertical FOV 73.74°, zero shoulder/default boost offsets ([flight-tuning.js:7](D:/lsw/src/data/flight-tuning.js:7)). The native BFP solve anchors to root position +5.4, respects explicit authored camera overrides, resolves the camera against native terrain/cover and then updates local foreground visibility ([world.js:2540](D:/lsw/src/engine/world.js:2540)). This does not justify global lens/distance changes, city geometry edits or blanket body hiding. The existing [framing audit](D:/lsw/docs/reports/2026-09-09-bfp-camera-framing-preflight.md:5) retains target-visibility limits; enabling the correct view alone does not close the user's visibility acceptance.

## Input and target integrity

- The pre-control mouse-look stage is currently gated by `ms.chaseCam`; only `_openSky` performs the zero-time eye-orbit update before a shot ([game.js:3881](D:/lsw/src/engine/game.js:3881)). A newly selected BFP view must establish the perspective camera, initial heading and matrices **before the first control/aim trace**, including a first-frame fire with no mouse delta. Reuse the zero-time camera solve for a flick; do not add a second physics/pose update. The final solve remains in `cameraDrive` ([game.js:3993](D:/lsw/src/engine/game.js:3993)).
- City mouse aim currently calls `pickTarget` or `screenToGround`, automatically locks a clicked fighter, and makes `T` release-only. The BFP branch instead traces the real eye ray, validates explicit locks, and recalculates `aim3` from the actual muzzle ([game.js:3308](D:/lsw/src/engine/game.js:3308), [game.js:3335](D:/lsw/src/engine/game.js:3335), [game.js:3371](D:/lsw/src/engine/game.js:3371)). These are required view-control changes, not permission to replace attack collision or timing. Native `Fighter.muzzle` already uses rig sockets ([entity.js:492](D:/lsw/src/engine/entity.js:492)).
- `aimTrace` tests native cover, interiors and height-field ground, but its `foes` argument does **not** itself enforce hostility ([world.js:1591](D:/lsw/src/engine/world.js:1591)). The caller passes all entities. In the city, physical aim surfaces and hostile lock candidates must remain distinct: a civilian/ally may be a physical obstruction/collateral target under existing combat rules, but must not become an automatic hostile lock/readout. Reuse `lockAvailable`'s `isFoe`, visibility, range and `canSee` contract ([game.js:55](D:/lsw/src/engine/game.js:55)); do not turn camera traces into damage or grant x-ray locks.
- One-player pad/right-stick aim runs **before** `_openSky` and uses constructor `right/fwd`, remembering a flat heading when released ([game.js:3292](D:/lsw/src/engine/game.js:3292)). Those vectors were made from the original isometric camera ([game.js:403](D:/lsw/src/engine/game.js:403)). Therefore current PowerWorld mouse success does not prove city pad/touch camera control. Feed stick look into the existing yaw/pitch using the existing unscaled input duration, retain heading on release, and test control-device handoff; do not fall back to stale cursor `(0,0)`. City camera-relative movement and evade have the same fixed-basis seam ([game.js:3480](D:/lsw/src/engine/game.js:3480), [game.js:3503](D:/lsw/src/engine/game.js:3503)). Do not import PowerWorld's 3D forward/swoop movement branch at line 3429.
- Pointer lock requires a real canvas gesture ([input.js:44](D:/lsw/src/core/input.js:44)); setting the boolean in a script is not capture evidence. Preserve selection/charge ownership and clear held actions on pause, blur, menu and rematch using the existing cancellation path ([boot.js:365](D:/lsw/src/boot.js:365)).

## View ownership and city preservation

Proposed resolver priority, shared by camera/control/HUD:

1. Map, opening, KO or spectate `mapCam`: retain its current orbit owner; no player look capture or combat crosshair. Existing camera arbitration already prioritizes it ([game.js:4044](D:/lsw/src/engine/game.js:4044)); orbit selects the isometric camera ([world.js:1366](D:/lsw/src/engine/world.js:1366)).
2. Paused/title/modal/end or no live controlled subject: disable chase input/crosshair and release pointer capture; retain the appropriate existing non-combat view. `update` returns before `cameraDrive` when not running ([game.js:3858](D:/lsw/src/engine/game.js:3858)). Its `follow/orbit → setCameraMode` already clears foreground cutaway, but that early return does not reset `input.pointerLock`. Put presentation cleanup in a path that actually runs at these boundaries, including zero elapsed time.
3. Two configured local humans: retain shared isometric fit for the bout, including one human's KO; do not silently give P1 an exclusive BFP view when P2 dies. Existing `followHumans` and `controlPad` provide the compatibility path ([game.js:4066](D:/lsw/src/engine/game.js:4066), [game.js:3598](D:/lsw/src/engine/game.js:3598)).
4. Alive one-local-player city match: BFP. Keep existing PowerWorld behavior. Non-city specialist/tool modes retain their own owners unless separately intended. On leaving an override or rebinding a respawn/form subject, snap/re-anchor deliberately and clear stale aim/HUD/material ownership; do not advance gameplay to establish a camera.

`hasCity` excludes boxing/lab/base/PowerWorld, while `hasCivilians` excludes training/PowerWorld ([modes.js:33](D:/lsw/src/data/modes.js:33), [modes.js:51](D:/lsw/src/data/modes.js:51)). Root training therefore has a city but intentionally no civil simulation; do not label its absent police/news a regression or force them into training. Use Free Roam or another civil mode for living-city acceptance. Preserve `startMode` resets and normal pedestrian/police/vision/news update calls ([game.js:1969](D:/lsw/src/engine/game.js:1969), [game.js:3941](D:/lsw/src/engine/game.js:3941), [game.js:4031](D:/lsw/src/engine/game.js:4031)).

Do not migrate `_openSky` wholesale. It changes ground-only flight eligibility, ascent bands/coasting/landing, movement acceleration/guard behavior and body pass-through ([entity.js:479](D:/lsw/src/engine/entity.js:479), [entity.js:1646](D:/lsw/src/engine/entity.js:1646), [game.js:1669](D:/lsw/src/engine/game.js:1669)). Even attack gates mix presentation with behavior: `BeamHose._combatReadability` is separate from `_poseLaunch` and optical discharge readiness ([projectiles.js:764](D:/lsw/src/engine/projectiles.js:764), [projectiles.js:796](D:/lsw/src/engine/projectiles.js:796)). No camera-policy substitution in those physics/emission gates belongs in this minimal integration.

HUD presentation similarly needs separation: `updateCrosshair` and `update` toggle `body.powerworld` from the fighter flag ([hud.js:1970](D:/lsw/src/engine/hud.js:1970), [hud.js:2038](D:/lsw/src/engine/hud.js:2038)). That class explicitly hides `.cityplate`, `.wantedrow` and `.pip` ([hud.styles.js:966](D:/lsw/src/engine/hud.styles.js:966)). Reuse only the subsequent compact layout/crosshair styling; route status placement, lock hint, ground-reticle suppression and post-camera crosshair update through the same active view. Do not solve overlap by disabling the correspondent. Verify that its POV render returns to the player's camera and leaves the chase HUD/cutaway correct.

## Evidence gates before acceptance

Run here, unchanged:

```text
node --test tools/combat-selection.test.mjs tools/progression-input.test.mjs tools/foreground-visibility.test.mjs
```

Result: **12 passed, 0 failed/skipped**. These cover existing selection/cancel/unlock and local material ownership; they do not implement or prove root-city BFP.

Implementation needs a focused new native policy/control regression: real city fighter with `_openSky` absent; BFP selected independently; first-frame/flick free ray and explicit lock; ally/hidden/cover lock rejection; camera-relative walk/evade; actual one-player pad/touch release/device handoff; two-local-player override; pause/map/KO/respawn/form cleanup. Assert camera changes do not mutate `_openSky`, positions/velocities at zero time, flight eligibility or city registries. Run that alongside:

```text
node --test tools/ground-camera.test.mjs tools/ground-camera-cover.test.mjs tools/foreground-visibility.test.mjs tools/combat-selection.test.mjs tools/progression-input.test.mjs
```

The separate framing report records the existing elevated-ground test's stale missing-floor-state fixture; preserve its intended assertion with a native placement/update control, not a camera retune. No claim is made that this broader command currently passes.

Required browser evidence starts at **`/` through the actual full title/mode/character/city UI**, not `startMatch`, a forced flag or the PowerWorld door. Existing camera/control harnesses explicitly open `powerworld.html` ([bfp-camera-check.mjs:9](D:/lsw/tools/bfp-camera-check.mjs:9), [arena-controls-browser.mjs:8](D:/lsw/tools/arena-controls-browser.mjs:8)); they are insufficient for this acceptance.

Capture matched 16:9 native gameplay in root training and a civil Free Roam entry: real canvas pointer capture, walking/strafe, permitted jump/flight, free and T-locked low/high targets near real city cover, a released traveling beam or projectile that reaches the shown target, and visible wanted/news/city UI during an actual broadcast. Include small/large authored bodies and cannon/guard, not just SOL. Record the actual target/cover winner, selected city and mode, `_openSky` remaining false/absent, active camera, zero errors, and foreground frame time with correspondent running. Then capture 2P fit, map return and pause/KO/respawn input cleanup. Preserve phone/tablet layout rules while testing the stick adapter. Source geometry and historical PowerWorld screenshots are not proof that the user can continuously see and hit the target in the normal city game.

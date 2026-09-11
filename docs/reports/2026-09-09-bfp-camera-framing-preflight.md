# BFP camera framing preflight — 2026-09-09

Read-only native camera audit; only this report was added. No renderer, camera, pose, map, test or asset changes. No new browser capture, external research or subjective feel approval.

## Verdict

No scale/guard/cannon corruption of the current BFP anchor, eye or lens was reproduced. Authored size is real geometry beneath a fixed camera, so .65 and 1.5 figures intentionally occupy different fractions of the image. The raised nanite guard can extend above screen center outboard without covering the measured locked target.

This does **not** close “I cannot see the attack target.” Two measured visibility limits need a small native-input acceptance gate: a large caster can obscure a same-height foe below an unlocked, level crosshair; a locked large caster can obscure a small target's lower body at 60 units. Neither establishes that the locked target is wholly invisible, or authorizes a global zoom/shoulder/body-hiding change.

One existing ground-camera regression fails because its elevated-ground fixture omits actual floor state. Native updates clear that case; do not retune the camera to satisfy the stale fixture.

## Contract and source evidence

- [Current BFP correction](D:/lsw/docs/BFP_REAR_CAMERA_PASS.md:14) explicitly supersedes cinematic target-distance lens changes, automatic shoulder lanes and dive flattening. Defaults are **25.5 rear range, 9 view-up lift, 73.74° vertical FOV, zero shoulder/boost offsets**: [flight-tuning.js:7](D:/lsw/src/data/flight-tuning.js:7).
- The source provenance is a **BFP reconstruction**, not recovered original camera/animation source: [reference record:7](D:/lsw/docs/reference/BFP_CAMERA_AND_POSE_SOURCES.md:7). Quake units are not our rig units. The later correction intentionally preserves the 4:3 vertical field on widescreen (Hor+), superseding the earlier horizontal-FOV interpretation.
- Existing inspected reference/calibration images: `docs/reference/Ultra Bid For Power 1.0 - Release [DOWNLOAD] 2-44 screenshot.png` and `artifacts/flight-review/reference-match/comparison.png`. The documented KANO calibration is hair y448/720 and boot y633/720 versus historical native y447.36/y634.59 ([calibration:58](D:/lsw/docs/BFP_REAR_CAMERA_PASS.md:58)). It is a specific pose/body reference, not a universal percentage every authored body must match. Those historical numbers were not freshly browser-regenerated.
- `artifacts/nanite-contact/superhero-female-0.65-0.65/repaired-game.png` is **1280×800, locked flight**. The opponent is visible in that inspected still. It is neither 16:9 free-view reference evidence nor proof of visibility through the whole encounter.
- [World._chaseBfp:2540](D:/lsw/src/engine/world.js:2540) uses **pos + (0,5.4,0)**, not an animated mesh bound. Lock uses [Fighter.center:490](D:/lsw/src/engine/entity.js:490), **pos + (0,5.2,0)**, independent of frame scale. View-space eye/lens are derived at [world.js:2571](D:/lsw/src/engine/world.js:2571); terrain/cover may constrain the eye. [Game.cameraDrive:4053](D:/lsw/src/engine/game.js:4053) passes a foe only for explicit hard lock; unlocked view belongs to mouse input.
- Frame scale/bulk alter parts, not the root group: [figure.js:104](D:/lsw/src/engine/figure.js:104). Native limb lengths and rig pivot scale at [hero-rig.js:111](D:/lsw/src/engine/hero-rig.js:111). Thus fixed camera anchoring does not inherit source-skin/head/forearm transforms. Frame scale .65–1.5 and bulk .65–1.65 are accepted authoring limits ([studio-profile.js:9](D:/lsw/src/tool/studio-profile.js:9)).
- Ground compression uses bind-frame breadth/bulk and arm reach, deliberately not animated shoulders: [camera-ground.js:163](D:/lsw/src/engine/camera-ground.js:163). Clear-air BFP framing stays fixed; there is no general live-body-bounds fit.
- Foreground cutaway uses actual target head/pelvis and target rig scale, but not bulk. It is a localized dither, not total transparency; **no lock or gap ≥24 means zero coverage**, and 14–24 fades out: [foreground-visibility.js:43](D:/lsw/src/engine/foreground-visibility.js:43). Native nanite meshes are built before foreground material installation ([figure.js:448](D:/lsw/src/engine/figure.js:448)), so they do not create an unregistered opaque-material exception.

## Fresh bounded geometry measurements

Ephemeral `node --input-type=module -e` probes; no probe file was created. Used actual `buildDef → profileFromDef/applyProfile → Fighter`, `StudioCombat`, `MeleeSystem.guard`, `runSlot`, `Fighter.update`, and `World.prototype.chase`. Renderer construction alone was omitted.

All comparisons used **1280×720 / 16:9**, default camera, fitted costume, no cape, forward facing, flat native heightfield and no cover. Public cannon/right and shield/left sources were both genuinely assembled (6/9 hull instances; ready and visible). Guard advanced native `poseGuard` to .99999999924; cannon remained charging. Native poses settled at 60 Hz; actors were re-anchored to controlled coordinates for projection comparisons. Cruise received a repeatable 70-unit forward velocity input; this is not DOM-input gameplay evidence.

Physical bounds included visible opaque costume/skin/hand/nanite geometry, source-skin deformed vertices and instance transforms; transparent charge/VFX were excluded. Visibility sampled rays to target center, head, torso and pelvis, stopping before the target. These are geometry/landmark results, **not rendered-pixel or complete-silhouette visibility**.

**180 comparisons:** 3 body types (procedural, source male, source female) × 3 scale/bulk pairs × ground/hover/cruise/guard/cannon × 14/60-unit gaps × free level/locked camera.

- At the same view mode/gap, all body/pose sizes produced identical anchor/eye/FOV (ground differs only by altitude translation). Anchor error was exactly 0 in the sampled values. Free eye offset was (0,14.4,-25.5) relative to the root; locked 60-unit eye offset was (0,18.202621,-23.818961).
- All **90 locked comparisons** had clear center/head/torso/pelvis rays against standard SOL. This includes real raised guard and charged cannon, not just a guarding flag.
- Example source-female physical extents, **free level**, as percent of frame from the top:

| Scale / bulk | Hover top–bottom | Guard top–bottom | Cannon top–bottom |
|---|---:|---:|---:|
| .65 / .65 | 69.07–87.95% | 68.62–88.30% | 68.57–87.78% |
| 1 / 1 | 61.79–88.14% | 61.46–88.67% | 61.28–87.90% |
| 1.5 / 1.65 | 50.69–88.43% | 48.85–89.33% | 50.29–88.17% |

The large source-male guard reaches 43.85% at its outboard extremity; that does not mean the centered aim ray is blocked. Large source-female ground and cruise span 50.69–87.81% and 60.03–85.17%, respectively. These are different finite poses, not camera-scale drift.

**Elevation controls:** 81 locked projections at -60/0/+60° target elevation, horizontal distance 60, caster altitude 200 (both actors above terrain), across all bodies/sizes and hover/guard/cannon: no sampled target-ray obstruction. These initially held the horizontal pose for a camera-only comparison. A separate **27-case large-frame control** updated actual aimWorld/aim3 and native Fighter/guard/charge at each elevation: also clear, modules remained ready/visible, all cannon cases still charging. Maximum target-center vertical NDC magnitude was 8.94e-16.

**Mixed target size:** 36 locked source-female comparisons (three caster sizes; target .65/.65 or 1.5/1.65; hover/guard/cannon; gaps 14/60). Center/head stayed clear. With large caster versus small target at 60:
- Hover/guard: pelvis ray blocked; torso clear.
- Cannon: torso and pelvis rays blocked; first torso obstruction was ordinary opaque costume `ConeGeometry` at 24.3382 units from the camera, not a nanite hull.
- Head NDC y=.0109239; torso=-.0174712; pelvis=-.0341923. Cutaway was correctly zero at that distance. Fixed target.center is near this small target's head, not its visual midpoint.

**Unlocked limit:** at level view the same-height foe is below the crosshair (60-unit target center NDC y=-.143469). With scale1.5/bulk1.65, all four sampled foe rays were blocked in ground/hover/guard/cannon across the three bodies; cruise retained some visibility. Default-scale targets at 14 units lost center/torso/pelvis behind the caster but kept the head clear. This occurs without nanite casting too. It is a real finite-body line-of-sight limitation, but the free camera was intentionally not aimed down at the foe; it is not failed hard-lock tracking.

## Ground test failure: fixture, not reproduced native camera defect

Fresh command:

```powershell
node --test tools/ground-camera.test.mjs tools/ground-camera-cover.test.mjs tools/foreground-visibility.test.mjs
```

**48/49 passed.** The failure at [ground-camera.test.mjs:37](D:/lsw/tools/ground-camera.test.mjs:37) repeats with:

```powershell
node --test --test-name-pattern="60 degrees on height 18" tools/ground-camera.test.mjs
```

It reports opaque `BufferGeometry` and `hero-limb-surface` intersecting the crosshair. The fixture at [lines 17–18](D:/lsw/tools/ground-camera.test.mjs:17) moves SOL and the terrain to y18, sets a grounded gait, then calls only `_animate`; **groundY remains unset**. Current [jump-motion.js:33](D:/lsw/src/engine/jump-motion.js:33) correctly uses actual floor/root support, so that incomplete fixture enters the falling source pose. Camera offsets at heights 0 and 18 match to floating-point precision.

Discriminating ephemeral controls:
1. Set only `f.groundY=18`, then settle native pose: no intersections. Attaching `f._game.world` without physics does not fix the missing state.
2. Keep the original omission, attach real StudioCombat game/world, and call **120 actual Fighter.update(1/60, game)** steps. Native [physics:1874](D:/lsw/src/engine/entity.js:1874) discovers height 18; pos=[0,18,0], groundY=18, gait=grounded, jump mode=null. No intersections at either aspect.
3. At 16:9 the native height0/18 eye-minus-root is (-5.219654,1.480394,-4.579554); at 16:10 it is (-5.130920,1.403549,-4.669338).

The test and jump/camera-ground modules are currently untracked shared-checkout files; there is no committed history to attribute this to a specific commit. No files were repaired by this audit.

Separately, fresh `node --test tools/foreground-visibility.test.mjs tools/ground-camera-cover.test.mjs` passed **31/31** (ownership, zero-time fade, form rebuild, native wall/terrain continuity). These do not replace body-scale visual acceptance.

## Small next gate; no retuning recommendation

1. Repair only the stale elevated-floor test setup, preserving its real camera/terrain/pose meaning; add the native-update floor-discovery control. Re-run the exact 49-test command. Do not weaken the assertion or hide the falling arm to green it.
2. When the current Studio browser work is finished, capture a bounded **native 16:9 input** comparison: same default camera/direction, .65 and 1.5 casters, ordinary hover then guard/cannon, standard and small foe at 14/60 units. Include free level → deliberate mouse aim → hard lock. Record foe-visible pixels/reticle/emission, not only four rays. Preserve the established BFP baseline.
3. Only if a valid, actually aimed encounter remains unreadable should a separate bounded visibility change be proposed with its BFP tradeoff. This report does not recommend automatic camera scaling, a global distance/FOV change, a persistent shoulder lane, or hiding the whole caster.

Excluded: arbitrary saved camera overrides; all combinations of head/neck/breadth/stance, equipment and runtime growth; wall-constrained custom-scale encounters; dynamic target crossing/near-pole transitions; bloom/VFX/HUD readability; full figure pixel coverage; player feel. No new BFP source was invented, no browser compete-run was made, and the user’s final target-visibility acceptance remains open.

Skills used: Three.js runtime review (native camera/geometry versus presentation evidence), systematic debugging (ground fixture cause), verification-before-completion (fresh bounded commands before conclusions).


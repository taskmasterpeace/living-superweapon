# Keep lettering out of the fight

September 6, 2026. Open-sky combat presentation follow-up; no map, camera,
physics, aim, damage, roster or joint-animation changes in this pass.

## Reproduced problem

Speech placement reserved a fixed central rectangle, not the moving fighters.
That rectangle pushed dialogue down onto the lower-screen player's head and
shoulders. Speech anchors used a guessed height. The original clearance test
reproduced fighter and HUD overlaps in free and locked chase views.

## Implementation

`src/engine/comic.js` projects bounds from the actual animated head, torso,
pelvis, arms and legs. Cosmetics such as auras and capes do not inflate the
reservation. Near/far-plane edge clipping preserves visible bounds when an
actor intersects the camera plane. Visible HUD panels are also reserved.

Speech and impact lettering search clear spaces around those reservations.
Placement prefers continuity and an unobstructed speaker tail. Speech anchors
follow the real head. Hidden enemies cannot leak dialogue. Heavy impact words
reserve extra space for their animated burst and rotation. If no clear space
exists, lettering hides rather than painting over the fighters.

Only chase speech/SFX gain the new viewport search space. Captions retain the
old HUD-safe margins; city placement is preserved. Idle frames skip projection.

## Verification

- `npm run test:comic`: 24 real-game scenarios across 1280x720, 800x600 and
  1920x1080; hover, boost, cast and vertical poses; free and locked chase views.
- 120 moving fly-by frames include long dialogue, yelling and a heavy impact
  burst, sampled during CSS animation. No measured body/HUD/viewport overlap.
  Ordinary scenes require both speech balloons to remain visible.
- Independent analytical near-plane fixture failed before clipping and passed
  afterward. Fully behind-camera geometry reserves no screen area.
- Caption/radar and hidden-speaker regressions failed before their fixes and
  passed afterward. Both speakers retain attribution tails in the static
  free-view regression; stationary balloon placement is stable.
- Full `npm run test:camera` passed on final production source, including the
  two new comic checks. The final integrated run measured a 0.30 ms 95th-percentile
  comic update in the moving fixture. This is not an end-to-end frame budget.
- `npm run build` passed, 203 modules. Scoped diff validation passed.
- Independent read-only review accepted the corrected bounded change after
  identifying the caption-margin and near-plane defects in the first candidate.

Before/after images and JSON are under
`artifacts/flight-review/comic-clearance/`. The six-second
`comic-clearance.mp4` is 1280x720, 20fps, 120 frames. It uses production input,
beam simulation, animation and camera, with a scripted partner path and dialogue.
It recorded 679.648 damage and no page errors. Approach, close pass, separation
and recovery frames were inspected. Impeccable's clarity and motion
guidance informed combat clearance and placement continuity, without changing
the established comic theme or disabling the print treatment.

## Limits

These fixtures are evidence for the tested encounters, not universal visibility
or BFP feel. Dense scenes may suppress lettering; later balloons are not checked
against every previously drawn tail polygon. Long tails remain visually
imperfect. Model materials, cape motion and extreme-speed camera response remain
separate quality work. The full game is not declared complete by this pass.

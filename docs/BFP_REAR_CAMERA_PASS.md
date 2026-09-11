# BFP rear-camera correction

September 6, 2026. The creator explicitly rejected the cinematic camera and requested BFP's angle.
This supersedes the distance-compression, automatic shoulder-lane and vertical-flattening choices
in earlier camera passes. Passing those earlier composition checks did not satisfy the reference.

## Reference and implementation

The [BFP reconstruction camera](https://github.com/LegendaryGuard/BFP/blob/ef6d50c454454c7e1c13e54ed17c1a213a3231f9/source/cgame/cg_view.c#L205)
places the camera behind and above the player in view space, retaining the viewing direction.
It is a reconstruction, not recovered original source. The local retrospective/Ultra BFP stills
and provenance are in `reference/BFP_CAMERA_AND_POSE_SOURCES.md`.

`World._chaseBfp` now owns open-sky gameplay and Studio's shared game-camera view:

- Centered raised rear boom; no automatic sideways orbit, target-distance zoom, or 45-degree dive cap.
- Corrected after a second explicit rejection: 25.5-unit range, 9-unit view-up lift,
  73.74-degree vertical lens. Preserve the original 4:3 vertical field on widescreen (Hor+).
  The previous 58.72 lens preserved horizontal FOV instead, cropping the vertical field.
  These are rig-calibrated units, not Quake units. Default boost zoom/pullback is off.
- Direct free mouse-look. Optional lock steers that same view using raised-camera parallax.
- September 7 close-combat follow-up: retain full authored lift and bound the near parallax correction.
  A localized, adjustable foreground cutaway reveals the opponent without a shoulder orbit.
  This supersedes the earlier close-range lift reduction; see [the current pass](ARENA_DEFENSE_PASS.md).
- Shared mouse/lock pitch limit prevents a horizontal mouse event from flattening a steep inherited view.
- At the nadir, preserve the raised boom and upright horizon instead of rolling through -90 degrees.
  The target remains slightly above center; the projected lock reticle identifies its actual position.
- Existing collision traces remain. The isometric/city camera is unchanged. Saved Studio profiles remain intact;
  their explicit camera offsets still apply, and Reset Camera selects the new defaults.

## Verification

The new projection test failed against the old camera: range-dependent lens, sideways offsets,
and dive flattening. Additional red tests reproduced a 5.697-unit close-unlock jump and a
0.164-radian pitch change from horizontal-only mouse input. A mirrored 5.697-unit close-lock
acquisition jump was also reproduced and corrected. Lift now eases in both directions; the
temporary parallax-domain limit affects steering, never causes a camera-position snap.

`npm run test:camera` now checks this requested BFP composition, actual mouse/attack behavior,
roster clearance, wall collision, HUD and comic readability. Old cinematic composition scripts
remain as historical evidence but are no longer the acceptance criteria for the rejected camera.

Evidence: `artifacts/flight-review/bfp-camera/`.
The live reel uses real player input and production combat against a scripted sparring partner;
it is not presented as an unscripted playtest or proof of subjective completion.

The visual-design review followed the pinned BFP reference instead of preserving the rejected camera.
No map, model, or effects redesign is part of this correction.

## Image calibration and lighting follow-up

The actual editor was still opening its 38-degree Orbit inspection view. It now opens Game camera;
Orbit remains an explicit inspection choice. Switching animation states resets the preview's viewing
angles rather than carrying an old downward attack angle into hover. The production camera attaches
directly to player translation: physics already owns acceleration/braking, so a second predicted
camera spring was unnecessary lag. Mouse input, optional lock steering and collision remain intact.

`tools/bfp-reference-check.mjs` measures physical KANO geometry, independently of camera defaults.
The primary editor reference is **Ultra BFP 2:44**, whose hair top is y448 and trailing boot y633
in its 1280×720 frame. Current projected extremes are y447.36 and y634.59. Both 16:9 and 4:3
preserve those vertical landmarks. This is a framing match, not a claim that distinct characters,
poses, map assets or BFP versions are pixel-identical. Still images do not prove subjective feel.
The test also checks movement/braking at 30/60/144Hz and preview angle reset; each failed first.

Lighting fixes: physical rig meshes receive their own shadows; the open-sky sun shadow volume follows
the player's altitude; medium/high quality enables that pass in BFP view, while lowest quality and
legacy city chase retain the cheaper path. Shadow ownership changes without a buffer resize.
PowerWorld's daylight update owns the stronger key/reduced ambient fill, bypassing its old cached
sun intensity. Studio uses a shaped key/fill rig and follows altitude in all inspection views.
`tools/flight-lighting-check.mjs` covers altitude 8/220/450, all quality tiers, same-mode camera
handoffs and Studio beam↔hover/Orbit changes. The initial implementations failed these regressions.

Image evidence: `artifacts/flight-review/reference-match/comparison.png` and
`artifacts/flight-review/lighting/`. Saved custom camera profiles are preserved; the existing
camera preset action installs the revised defaults only when explicitly applied.

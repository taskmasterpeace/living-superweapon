# Distant lock readability

## Screenshot finding

The opponent stayed centered but was too small to read. In the fixed-pose 110-unit
comparison, the target's head-to-boot height was 4.865% of the viewport; the player's
was 21.849%. A target marker and an in-frustum assertion did not address that disparity.

The open-sky locked camera now pairs a narrower lens with a longer boom, smoothly
above 33 units and fully engaged at 99 units. The maximum tangent/boom multiplier
is 1.8, limited so this adjustment cannot narrow the lens below 30 degrees. Near
combat and free-flight authored values remain unchanged. The production result at
110 units is 7.392% target height (about 52% larger) and 22.579% player height.
This is perspective compression, not a change to fighter scale or simulation range.

## Transition and collision ownership

- A wall removes the zoom corresponding to the standoff it removes. The reference
  is the intended boom before the eye spring, not the spring's excursion from last
  frame's collision point. The latter reproduced refresh-dependent zoom creep:
  wall-pinned FOV fell to 46.54/41.42/37.73 degrees at 30/60/144 Hz. The regression
  now retains 58.72 degrees at all three rates.
- Unlock puts all extra standoff into the existing zero-velocity critical spring.
  A separately shrinking ideal boom initially exceeded its 120-unit/second motion
  budget; the old vertical release fixture caught it. The lens now follows the
  same spring's progress instead of adding another translation path.
- Locked and free camera lift differ. Switching compensation references initially
  changed the lens by 0.659 degrees even at zero elapsed time. The release snapshots
  the effective reference and blends it back to the authored free reference. The
  zero-time assertion now passes to floating-point precision.
- Intentional mouse orbit and subject translation remain outside the automatic
  release speed bound. No input, aiming, collision geometry, or map edits were made.

## Verification

`tools/lock-readability-check.mjs` is registered in `npm run test:camera`:

- 12 fixed-range/refresh cases, actual anatomy projection and body-occlusion rays.
- A 600-frame approach/retreat with no occlusion and maximum foreground height
  change of 0.001116 viewport per frame.
- Sustained real cover collision at 30/60/144 Hz.
- 27 unlock cases at 40/110/200 units, level/overhead/underfoot, 30/60/144 Hz.
  Maximum automatic speed 119.9981 units/second; no aim rotation; authored lens
  recovery; zero-time FOV difference at most 7.11e-15 degrees.
- `--before` disables only the focus gain at runtime, reproducing the distant-size
  failures without editing source. The fixed-pose comparison also removes idle-clock
  differences from the earlier exploratory captures.

After the final refinement, the full camera suite passed: quality-frame transitions,
free-aim timing, actual pointer firing, all-roster framing, safe-area/HUD checks,
vertical/pole motion, crossings, stops/reversals, viewing lanes, 318 free-aim
clearance cases, and comic-effect projection/visibility. Targeted Studio combat
passed nine real beam/elevation/seek/recovery cases plus unsupported-kit/editor-state
checks. Production build passed (206 modules, 3.19 seconds). Independent bounded
source review found no remaining actionable issue. No pass threshold was relaxed.

## Visual evidence and limits

Before/after 14/40/70/110-unit stills are in
`artifacts/flight-review/lock-readability`. The final gameplay recording is
`combat-camera-verified.mp4`: 210 frames, 20 fps, 1280x720, 10.5 seconds. It uses actual
movement-key events and production Game.update with a scripted stationary sparring
partner and a local factory-built KANO rifle variant. It includes strafing, retreat,
charging and beam release. All frames passed the scene-pixel integrity check while
adaptive quality traversed tiers 2/1/0. Frames 0/52/105/157/190/209 were inspected.
The beam reached the foe and the recorded health bar fell. This is not an AI-tactics
or full-roster weapon-handling acceptance reel.

The opponent is more readable during retreat and release; the current beam still
reads as a pale translucent shape and the body/costume forms remain too simple.
These are explicit remaining visual defects, not a 10/10 or AAA rating. The narrower
distant-lock lens also shows less peripheral space: its tradeoff needs player testing.

## Reference provenance

The [BFP reconstruction movement source](https://github.com/LegendaryGuard/BFP/blob/ef6d50c454454c7e1c13e54ed17c1a213a3231f9/source/game/bg_pmove.c)
separates forward/backward/idle flight and gives combat animations priority. Its
[camera implementation](https://github.com/LegendaryGuard/BFP/blob/ef6d50c454454c7e1c13e54ed17c1a213a3231f9/source/cgame/cg_view.c)
uses view-basis offsets and collision traces. This is a reconstruction, not recovered
original source. The new distance-dependent lens is our readability choice, not a
claim that BFP implemented this feature. Existing reference images and source/version
distinctions remain in `docs/reference/BFP_CAMERA_AND_POSE_SOURCES.md`.

The debugging and verification skills required reproducing the failures before
acceptance, and the written plan kept this pass confined to camera composition.

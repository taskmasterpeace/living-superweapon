# Vertical combat visibility — September 6, 2026

Scope: the rejected PowerWorld combat camera and the visibility of the fighter being attacked.
No map design, character definitions, damage values or saved profiles changed in this pass.
This is a bounded correction, not an assessment that the game or editor is finished.

## What failed

- At close vertical locks, opaque boots/arms eclipsed the opponent. The original 44-case probe
  failed at 6u / -90°, -89° and +60°.
- Crossing directly above/below flipped the camera's horizontal orbit by 180°. The original
  moving probe jumped approximately 35–47 world units in one frame.
- A trial mesh-ray avoidance solver cleared still frames but jumped between clear routes during
  motion. It was removed, not shipped.
- Removing frame-dependent stiffness exposed follow lag during fast translation. Independent
  review reproduced 110–114 hidden frames out of 120. Transporting the follow anchor, then reserving
  a stable side-flight envelope, removed those sustained failures.
- A more oblique medium-range view initially cropped the player. A projection-based body fit
  now preserves that silhouette without an arbitrary gap-to-zoom multiplier.
- Releasing a steep lock moved the eye 2.51u in the first 120Hz frame. The release offset now
  starts at zero velocity and follows an analytic critically damped spring, capped at 120u/s peak.
- Actual beam footage exposed a second occluder: generic onHit flashes stacked on the hose's
  own contact sparks, emitting 140–178 extra flash spheres/lights during 1.5 seconds of damage.
  Earlier tube-only visibility tests left those flashes in their baseline and missed the issue.

## Shipped behavior

`World.chase` keeps the actual target center as the attack point. Near a polar lock, cosmetic yaw
turns at no more than 2.4 rad/s. The unclaimed axis remains separate from this orbit adjustment.
Gameplay continues to derive locked approach from the opponent, not cosmetic framing.

The locked eye uses a level-to-30° elevation envelope in a clinch, relaxing to ±45° at range.
Vertical encounters reserve a side lane. Close, fast lateral flight reserves additional clearance
from stable body proportions and velocity rather than individual animated fingers/boots.
The opening still rotates around the normalized boom; it does not blindly add range.

When the oblique view would crop the player, a rest-body envelope solves the minimum target
distance using the live lens projection. That fit smoothly releases between 52 and 78u; very
distant locks retain the existing offscreen-indicator strategy. Body-envelope sizing is not an
exact guarantee for every extreme custom rig or equipment combination.

Eye translation follows the moving anchor once. The relative orbit retains time-based smoothing.
World collision and terrain clearance still run after framing. Free-look remains directly owned
by mouse input. Release preserves the visible heading and smoothly returns to the authored free boom.

`BeamHose` now marks its existing contact feedback as owned via `contactFx`. PowerWorld's generic
onHit flash therefore does not duplicate it. Traveling-tip geometry, damage, guard handling, sparks,
hit response and the city camera's feedback are retained.

## Evidence

- `tools/vertical-camera-check.mjs`: 44 static angle/gap cases, six pole crossings at 30/60/120Hz,
  72 signed translation cases, two fit-range transitions, a locked-cover trace, 18 release-motion
  cases, and 14 rendered opponent-ablation cases. JSON and screenshots under
  `artifacts/flight-review/vertical-camera/`.
- `tools/combat-camera-check.mjs`: adds medium-vertical head-to-foot readability and player-crop
  checks. Fixed animation phase removes incidental constructor-phase variation from still comparisons.
- `tools/beam-contact-visibility-check.mjs`: full contact ablation, including light/emissive feedback,
  for SOL at three angles and a large charged KANO beam. Before/after damage is identical. Visible
  target contribution improves from approximately 25–48% to 80–97%; duplicate flashes fall to zero.
- Independent review: 126 moving-pair cases, 122 completely clear. The remaining four had only
  brief transients. The worst, abruptly starting 210u/s forward translation in a 6u level clinch,
  hid the center for 11 frames at 60Hz (~0.18s), versus 117 frames in the earlier implementation.
  This limitation remains; do not call the camera universally occlusion-free.
- `tools/vertical-camera-reel.mjs`: eight seconds, 192 frames at 24fps, actual game update/input/beam
  damage and production HUD/camera. Three separate demonstrations: below crossing, above crossing,
  strafe/fire. The partner path is scripted; the video is silent, not unscripted AI or human play.
  Output: `artifacts/flight-review/vertical-combat/vertical-combat.mp4`.

Camera defaults and BFP provenance remain in `reference/BFP_CAMERA_AND_POSE_SOURCES.md`.
The oblique close-combat treatment is our adaptation, not a claim that these angles were recovered
from original Bid For Power code. No numerical quality score follows from these tests.

Final verification: `npm run test:camera`, `npm run test:effects`, `npm run test:combat` and
`npm run build` completed with exit 0 after the camera and beam changes. Combat covered 371 kit
checks, 42 world checks and a 30-second eight-fighter soak (1,245 hits, 15 KOs, no invalid state
or page error). Flight, impact and Studio suites also passed during this pass. The final silent
reel recorded 129, 131.5 and 128 actual beam damage in its three segments, with no page errors.

## Remaining product work

The models and attack/flight body language still need a stronger art/animation pass. Studio still
needs an opponent/attack preview using this combat framing. The KIT readout overlaps the player-name
panel. The synthetic probes do not establish subjective game feel, custom-rig completeness, or
uninterrupted visibility in every world-collision situation.

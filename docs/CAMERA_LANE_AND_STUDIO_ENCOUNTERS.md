# Camera lanes and inspectable moving encounters

September 6, 2026. Scope: mirrored attack-camera paths and Studio preview tools; no map edits.

## Reproduction and correction

The previous crossing check exercised one passing side only. Mirroring the trajectories
exposed five failures: the ordinary 70u/s pass reached 8.64rad/s of view rotation, while a
210u/s pass cropped the player for 16 of 240 sampled frames at 120Hz. A fixed shoulder lane
worked with one orbit direction and against the other.

The camera now chooses its automatic shoulder lane from relative approach motion before
the close encounter. It can reselect only beyond the clinch range and outside the vertical
opening region, while both automatic offsets are zero. A close lock commits the already
displayed side; the route stays fixed through the encounter. Authored shoulder values stay
additive. Free mouse look, movement basis, attacks and world collision are not changed.

A candidate that merely capped the completed boom was rejected: it reduced turning but
increased player cropping. Independent review also caught late-motion shoulder flips and
vertical-juke flips in the initial lane-selection candidate; both were corrected before handoff.

## Permanent checks

- `camera-crossing-check.mjs`: both passing directions and both circle directions, at
  30/60/120Hz; 30 cases. Mirrored ordinary crossing now peaks at 5.44rad/s with no player
  cropping. The transient target-center occlusion gate remains 0.1 seconds, not zero.
- `camera-lane-check.mjs`: 18 close-acquisition and vertical-juke cases at 30/60/120Hz.
  No lane flips or target-center occlusion; maximum view turn 1.46rad/s.
- Both checks are included in `npm run test:camera`.

## Studio

Choose a beam-capable fighter, **Motion → Beam sequence**, then a **Target** path:
Stationary, Pass left/right, or Circle left/right. Speed is 10–210u/s. The existing elevation
rotates the encounter plane; distance is the starting pass distance or circle radius.

The target starts moving at 2 seconds, after charge release. Passes travel three units beside
the caster and stop at the opposite starting distance; circles stop moving at 6 seconds.
The eight-second loop retains real beam emission, historical energy, damage callbacks, casting
and target poses, and the game's chase camera. AI, world traversal and knockback translation
are deliberately absent and labeled. This is an authoring fixture, not a balance simulation.

Pause and scrub to inspect a crossing, change camera values in the inspector, and replay the
same sequence. Encounter choices are session-only inspection state; they do not dirty or save
a hero profile. Save local still applies only the authored presentation profile to the next game.

`studio-encounter-check.mjs` verifies all four moving paths, real beam/contact, deterministic
backward seeking and playback, validation, unchanged draft state, and three responsive layouts.
It also rejects empty speed/elevation or invalid distance before changing the selected path:
labels remain synchronized with the rendered encounter, and correcting the value clears the error.
The existing warm-charcoal/gold workspace was preserved under Impeccable/frontend-design
guidance; this is a tool extension, not a new visual identity.

Limits: close passes still briefly overlap; extreme-speed cameras still rotate quickly. These
corrections do not make the whole game complete or establish subjective BFP-quality feel.

Final-source verification: `npm run test:camera`, `npm run test:studio`,
`npm run test:studio-layout` and `npm run build` passed. The mirrored production-input reel
is `artifacts/flight-review/camera-shoulder/camera-left-pass.mp4` (1280×720, 20fps, six seconds).
It recorded 679.65 damage and no page errors. This is a different trajectory from the earlier
right-side beam comparison, not a same-input damage comparison. Review includes start,
quarters, close overlap, side separation, catch-up and recovery frames.

After final editor input-validation corrections, the moving-encounter regression and build
passed again. Independent camera review accepted the lane correction; editor review identified
the invalid-field label mismatch that the added regression reproduced before its fix.

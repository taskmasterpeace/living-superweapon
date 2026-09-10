# Free-aim camera timing

The camera complaint exposed a real input-path defect, separate from lock-on composition.
On a mouse turn, `Game.update` rotated the camera before `controlPlayer` traced the aim,
but left its position on the previous frame's boom. The normal end-of-frame chase then
orbited the eye. A fighter visibly under the resulting crosshair could be missed by the
trace that had just aimed the attack.

## Change

For a living, unlocked open-sky player, prepare the existing `World.chase` view with zero
elapsed time before acquisition. This applies the actual boom and collision-constrained
eye, not just its quaternion. The ordinary end-frame update still advances follow, FOV,
release, and shake clocks. Legacy city aim and explicit lock-on retain their existing paths.
No camera defaults, map, model, ability balance, or traveling beam physics changed.

## Evidence

`node tools/free-aim-timing-check.mjs` exercises real `Game.update` at 30, 60, and 144 Hz:
five horizontal/vertical/diagonal flicks at three ranges, 45 cases total. It places a real
fighter on an independently composed view ray; it does not query the camera under test
to construct the expected target position.

- Before: all 45 acquisition cases missed; maximum aim-point displacement 32.219 pixels.
- After: all 45 acquire the foe without locking; maximum displacement below 0.000001 pixels.
- `--baseline` reproduces the previous preparation at runtime and intentionally fails the
  same assertions. It never changes production source. Before/after JSON and rendered
  frames live in `artifacts/flight-review/free-aim-timing/`.
- Full `npm run test:camera` passed, including live pointer input, free-aim damage (33),
  lock/release, vertical motion, fast crossings, body clearance, HUD, and comic projection.
- Independent source review found no new issue in this bounded timing change.
- Final baseline mutation failed as expected, restored behavior passed, and production build passed.

The stationary flick test is not a claim of perfect moving, shake-active, or release-frame
shot accuracy. Existing moving camera tests cover framing and visibility, not every such
aiming combination. This is one concrete responsiveness correction, not acceptance of
the full game's BFP feel, model quality, or editor readiness.

# Beam nozzle continuity

September 6, 2026. Render-only correction, not a whole-game readiness claim.

The recorded close-crossing frame had a 3.40-unit first physics segment pointing 44.86°
away from current emission. Packets are emitted every ~0.0305 seconds in this fixture;
the hands turn between emissions. Joining historical packet centers with straight tubes
therefore gives a visibly crooked opening. Re-aiming old energy would break the traveling-hose rule.

`beam-curve.js` now resamples the open-sky rendered centerline with bounded cubic segments.
The sustaining opening uses the actual emission direction; a released tail uses its travel
direction, not the caster's new aim. Physics positions, velocities and damage are untouched.
Bezier controls stay within radius/4 of their physical segment endpoints, bounding the
whole centerline within that segment's radius/4 capsule. This is not a new collision curve.

Evidence:

- `tools/beam-nozzle-check.mjs` failed before the fix and passes six fixtures afterward,
  including close crossing, a right angle, a fold, duplicate newborn nodes and release.
- On the recorded crossing fixture, rendered opening error becomes effectively zero;
  the first sampled chord falls from 44.86° to 10.86°. Maximum centerline deviation there
  is 0.35u within the existing 4u damage radius. The physical first chord remains unchanged.
- Both `path` and `pvel` remain byte-identical across the render operation.
- The real six-second crossing records identical 549.251 damage before and after, no page errors.
- All eleven effects checks, Studio's nine beam/elevation checks and the build passed.

Cost: at most 135 rendered rings instead of 44 physical rings in each of the two existing
tube draw calls. Buffers are persistent; no per-frame objects are added. This is increased
vertex work, not a measured GPU performance improvement. Non-open-sky beams keep their old mesh.

Video: `artifacts/flight-review/beam-nozzle/beam-nozzle.mp4` (1280×720, 20fps, six seconds).
It uses production input/beam/body/camera and a scripted opponent. Reviewed start, quarter,
middle, three-quarter, end, plus close-crossing frames. The beam still bends after a fast
reversal and the fighters briefly overlap at close range. This pass does not establish BFP
equivalence, final character quality, or universal camera comfort. Maps were not changed.

Impeccable's polish guidance kept this correction focused on visible continuity and attack
readability; it was not used to assign a quality rating. Independent geometry review found
no outstanding issues in the bounded change.

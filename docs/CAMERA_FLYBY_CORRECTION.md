# Locked-camera fly-by correction

September 6, 2026. Scope: attack visibility and camera motion, not maps or a whole-game readiness claim.

## Failure reproduced

The previous camera tests largely settled the camera before judging the frame. A target passing
3 units beside the player at 70 units/second produced about 14.77 radians/second of view rotation
(846 degrees/second), despite keeping the target centered. The camera traversed a chord of its
orbit, approaching to 27.44 units from the player. Being inside the frustum did not make this readable.

## Correction

The open-sky locked camera now limits its cosmetic orbit separately from the published movement
basis. Free mouse look is unchanged. Ordinary straight fly-bys get a controlled orbit; faster
closing motion increases the angular allowance, and sustained curved trajectories contribute
their own measured turn rate. Existing pole handling, collision traces, framing and lock-release
continuity remain in place. No new per-frame vector allocations.

A fixed 4 rad/s cap was rejected: it cropped the player during top-speed circles. A speed/distance
budget alone was also rejected: tight circles can require a greater sustained angular rate. The
final budget distinguishes trajectory curvature from a straight pass through the aim axis.

## Evidence and limits

- `tools/camera-crossing-check.mjs`: 70/210 u/s crossings and 210 u/s circles at 20/25/40-unit radii,
  sampled at 30/60/120 Hz. Tests player framing, camera standoff and solid-body target occlusion.
- The ordinary crossing falls to 5.44 rad/s, with at least 35.47 units of standoff. No player
  cropping in the 15 cases. Passing directly beside a fighter still causes up to 0.084 seconds of
  transient body occlusion; the gate permits at most 0.1 seconds, not indefinite target concealment.
- Extreme 210 u/s close passes still turn quickly (up to 15.35 rad/s). This pass does not establish
  universal camera comfort or BFP equivalence at every speed.
- `tools/free-aim-clearance-check.mjs`: 53 roster definitions, hover/boost, -60/0/+60-degree aim;
  the 318 center rays clear the player's solid body. This is a diagnostic geometry check, not an
  effects-visibility or human play-quality score.
- `tools/camera-crossing-reel.mjs`: six seconds of real input/beam/body/camera execution with a
  scripted opponent path. `--baseline` disables the new ordinary yaw limit for comparison; it
  is a counterfactual for this non-vertical path, not a recording of the entire prior game build.
- `tools/camera-encounter-probe.mjs` also runs a real AI encounter. It is a diagnostic, not a
  deterministic acceptance test or a balance test.

Run `npm run test:camera` with Vite on port 5180. Camera controls remain in Character Studio;
saved model/pose/camera profiles and map data were not reset.

Reference provenance remains in [BFP camera and pose sources](reference/BFP_CAMERA_AND_POSE_SOURCES.md).
The linked code is a community reconstruction, not recovered original BFP source. No original
animation clips were imported. Subjective combat feel remains a play-test requirement.

## Verification on the final camera implementation

`npm run test:camera` and `npm run build` completed successfully. The independent review also
checked alternating 30/120 Hz timesteps on tight circles; no player cropping was observed.
The rendered six-second sequence used the production beam and registered 479.5 damage, with
no page errors. Video: `artifacts/flight-review/camera-crossing/camera-flyby.mp4` (1280×720,
20 fps, 120 frames, silent). The previous ordinary orbit is available as a labeled counterfactual
in `camera-flyby-baseline.mp4`. Review included the attack, crossover, catch-up and recovery frames.

The beam remains a traveling hose: sharp reversals leave a visible curved trail while it steers.
That behavior still needs visual/feel refinement; this correction does not convert it into a laser.

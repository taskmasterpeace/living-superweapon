# Clear viewing arcs through a fly-by

September 6, 2026. Follow-up to `CAMERA_LANE_AND_STUDIO_ENCOUNTERS.md`.
Scope: the production open-sky lock camera and its shared Studio consumer.
No map, actor collision, flight physics, aim, damage, roster or model edits.

## Reproduction

The previous camera took the opposite side from a passing opponent. Its eye-to-
target ray consequently crossed the player's torso. At ordinary 70u/s, mirrored
three-unit passes hid the target center for 2/5/10 frames at 30/60/120Hz, despite
the existing 0.1-second tolerance passing. The moving combat capture showed the
same overlap. The ordinary-pass regression now requires zero occluded frames.

Simply anticipating the opponent's position did not eliminate the occlusion.
Reversing the shoulder side eliminated it but produced an 8.64rad/s exit whip and
cropping at 210u/s. Holding that shoulder reduced the whip but prolonged fast-pass
cropping. These candidates were not accepted.

## Correction

For a fast, near-horizontal straight trajectory whose projected miss distance is
less than twice jab reach, the cosmetic camera axis follows a wider mirrored arc.
The eye takes the passing side instead of following the nearly singular target
azimuth around the player's body. The actual opponent remains the look-at point.
`camBasis`, attack aim, actor position and physical energy packets are untouched.

This arc already reserves a viewing lane. The stationary clinch/vertical shoulder
opening therefore fades out while it is active and returns with a time-based
envelope. Suppressing that opening as a boolean caused stop/threshold snaps; the
new transition regression reproduced those failures before the envelope fix.

Horizontal speed must be nonzero and greater than the classification threshold
before deriving the transverse axis. The miss-distance bound excludes distant
strafes. Independent review found both missing guards in the first candidate;
the regression reproduced a non-finite vertical camera and broadside cropping.

A reversal also exposed an older defect: treating a single pi/dt velocity turn
as sustained curvature effectively removed the orbit-rate cap for that frame.
Only forward-compatible velocity directions now contribute sustained curvature;
an abrupt reversal retains the normal bounded angular response.

## Final-source evidence

- `camera-crossing-check.mjs`: 30 mirrored crossing/circle cases at 30/60/120Hz.
  Ordinary 70u/s passes have zero target-center occlusion and zero player cropping;
  peak view rotation falls from 5.44 to 5.04rad/s. The 210u/s cases also have zero
  occlusion/cropping, but still turn very quickly (about 16.15rad/s at 120Hz).
- `camera-pass-transition-check.mjs`: 42 stop-before/after, vertical, broadside,
  reverse, 28–32u/s threshold-crossing and close-start cases. Zero non-finite
  frames and zero cropping. Maximum view rotation is 5.97rad/s. Abrupt close starts
  and stops can still briefly occlude the target, within the existing 0.1-second
  tolerance; this is not a universal no-occlusion claim.
- Both checks are included in `npm run test:camera`, which passed in full on the
  final source, including free aim, live input, safe areas, vertical visibility,
  HUD clarity, lane stability and 318 free-aim clearance cases.
- `studio-encounter-check.mjs` passed all four moving encounter paths, deterministic
  seek/playback, validation and three layouts without profile mutation/page errors.
- `npm run build` passed (203 modules); scoped diff validation and design detector
  had no findings. Independent review accepted the corrected bounded change.

One full-camera run ended in a Chromium target crash. The unchanged crossing
check passed independently, followed by a clean complete sequential suite. The
crashed run is not counted as passing; its environmental cause was not established.

## Visual review and remaining work

`artifacts/flight-review/camera-pass-clearance/camera-pass-clearance.mp4` is a
six-second, 1280×720/20fps production-input sequence with a scripted left-passing
opponent. It records the same 679.648 damage as the preceding reel and no page
errors. Approach, closest contact, side separation, catch-up and recovery frames
were inspected. At the formerly hidden moment the opponent is now foreground;
the physically close bodies still overlap. No transparency trick conceals this.

Impeccable's motion guidance informed continuity through entry, interruption and
recovery, not a new visual theme. The reference pack remains
`reference/BFP_CAMERA_AND_POSE_SOURCES.md`; its reconstructed BFP code is reference
evidence, not proof that this new camera has original BFP behavior.

The full game is not complete or rated 10/10. Model presentation, abrupt close
starts/stops and extreme-speed rotation remain open quality limitations.

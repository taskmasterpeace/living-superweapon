# Aerial attack body direction

Procedural production correction, September 6, 2026. No imported animation or recovered
BFP joint angles are claimed. Reference provenance remains in
[the BFP reference pack](reference/BFP_CAMERA_AND_POSE_SOURCES.md).

## Failure and change

The vertical-combat recording exposed an upright body underneath steep optic attacks.
The existing arm/head aiming tests covered only +/-0.7 radians. Extending them to
directly overhead/underfoot reproduced missing body support, excessive neck bend and
moving optic aim divergence.

`combat-pose.js` now supplies airborne attack elevation through the visual body before
solving the head and hands. The body tilts at 70% of target elevation, capped at 0.95
radians; the neck/palms solve the remaining aim from their actual world-space sockets.
Hip-pivot compensation preserves the flight anchor. Physics position, movement input,
ground markers, camera tuning and map geometry are unchanged.

Review caught an interruption regression in the first implementation: guard/stagger
returned before smoothing, snapping the body upright by about 54 degrees. The carrier
now keeps its own quaternion history and recovers even when attack weight is zero.
It deliberately does not feed the subsequent melee twist back into that history.

## Verification and limits

- `npm run test:poses`: ten SOL/KANO production beam fixtures, entry/hold/moving aim/
  recovery/KO, plus 36 interruption cases (up/down, 30/60/120 Hz, guard/stagger/freeze).
- The new interruption test failed all 36 cases before the correction; afterwards
  rotation steps stay within 12 radians/second, attack weight is immediately zero,
  hip drift is below 0.01 units, and the carrier returns to rest.
- The braced-fist assertion measures height in body space, not world space: body tilt
  legitimately changes a fist's height without turning it into a raised casting arm.
- The existing vertical combat reel exercises real player input, projectile damage,
  presentation and camera with a scripted partner, not AI combat. It is silent.
- Final build, pose/interruption, camera, charge-sequence, impact/contact and full
  combat regression suites passed. The 30-second eight-fighter soak recorded 1,056
  hits and eight KOs with no invalid states or page errors. Read-only review approved
  interruption recovery, subsequent melee without drift, and KO/reset behavior.
- Updated recording: `artifacts/flight-review/vertical-combat/vertical-combat-body-aim.mp4`
  (192 frames at 24 fps, eight seconds, 1280x720). It preserves the prior recording.
- This repository uses JavaScript and browser scripts; the animation skill's example
  TypeScript/Vitest/lint gates do not exist here. Production Node/Playwright checks and
  Vite build are the applicable gates, not substitute claims that TypeScript passed.

This is a bounded attack-direction correction, not acceptance of overall BFP feel or
character art. Studio still needs an opponent-aware attack preview. Grounded high-angle
aim and broader authored attack transitions remain separate presentation work.

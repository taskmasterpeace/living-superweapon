# Open energy silhouette

September 6, 2026. Presentation follow-up to `CAMERA_PASS_CLEARANCE.md`.
No map, camera, attack, flight-physics, roster or joint-pose changes in this pass.

## Evidence and correction

The combat fly-by reel exposed a gray, closed egg around the player. A frozen
gameplay ablation reproduced it with `powerBuff=1.1`: hiding only `parts.aura`
removed the shell. The actual additive material was at approximately 0.1 opacity.
Its Fresnel density peaked at the sphere silhouette, where the comic compositor
inked a hard border. The compositor itself was left unchanged.

The existing sphere and single draw call now carry an animated density field.
Density fades at both the silhouette and the body-facing center. Uneven rising
streams interrupt the remaining band, and the top/bottom dissipate. A per-figure
uniform follows `Fighter.animT` through `_animate`, the same path used by Studio
playback and scrubbing. Charge, buff and tier opacity/color controls are retained.

This is a procedural shader effect, not an imported animation clip. No new mesh,
texture, particle system, light, per-frame allocation or postprocessing pass was
added. The field is still based on an oval volume; eliminating the closed inked
shell is a bounded improvement, not completion of the game's visual identity.

## Regression evidence

`tools/aura-readability-check.mjs` rasterizes the actual figure material into a
floating-point target at controlled view angles. Its initial RED run caught the
hard silhouette (maximum contribution 0.474) and frozen energy. The final 41
cases pass, including the production animation-clock bridge, three color families,
zero opacity, and real idle/charge/tier-II/MAX state-driven activation and color.
Maximum silhouette contribution is now 0.000014; center contribution is below
0.000483. Inner energy remains visible (minimum sampled peak 0.0674). These are
controlled linear-render measurements, not subjective quality scores.

The full 13-command `npm run test:effects` suite passed; the expanded 41-case
aura check then passed independently. `npm run test:flight` passed all three
checks, including all 53 rigs through flight/KO/recovery. The model/profile test
pair passed 25 tests. Production build passed with 203 modules. Scoped diff
validation passed; independent read-only review found no remaining issues.

## Gameplay evidence and limits

`artifacts/flight-review/aura/aura-combat.mp4` is a six-second, 1280×720, 20fps
capture of real input, attack, pose and chase-camera code. Only the partner's
path is scripted. Damage remains exactly 679.6481236111522, matching the earlier
camera/beam reels; browser errors are empty. Frames 30, 60, 90 and 119 were
inspected with the full comic pipeline, not a shader-only beauty render.

The first separate flight-reel attempt failed at navigation with Chromium
`ERR_NO_BUFFER_SPACE`. The server still returned HTTP 200. That failed attempt
is not counted as verification; no production workaround was applied.
The unchanged retry succeeded: `artifacts/flight-review/aura/flight-motion.mp4`
contains 192 frames at 24fps (eight seconds). Takeoff, hover, acceleration, boost,
bank, braking and final hover frames were inspected. The aura follows the bank
and fades after boost. The review also exposed a rigid-looking hover cape and a
speech bubble covering the player's upper body; these are not fixed by this pass.

`studio-encounter-check.mjs` then passed all four moving encounters, deterministic
seek/playback, validation and three layouts without profile mutation/page errors.

Still open: broader character/material quality, extreme-speed camera rotation,
brief close-start/stop occlusion, and overall subjective combat feel. Tests and
this scoped effect correction do not establish whole-game or editor completion.

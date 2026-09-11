# Cast tracking: shared emission direction and final wrist contact

## Measured fault

The procedural cast pose used a target-point filter with a different response from the actual beam. During a 90/170 degree turn, the rendered primary palm diverged from emission by 16–32 degrees. The final shoulder smoothing also ran after the wrist solve, rotating the palm away from its solved direction.

The reproduction is `tools/cast-tracking-check.mjs` (`--before` changes its output label only). It calls real slot handling, Fighter updates, and projectile updates, not a pose-only substitute. The initial red run had six two-handed stationary cases. Expanded coverage has twenty-seven cases: two-handed, one-handed, and rifle-equipped casts; 30/60/120 Hz; 90/170 degree turns with translating casters; and 30-unit between-frame relocation. The stored `before-check.json` contains the later relocation regression, which also failed before its correction.

## Correction

- `BeamHose.predictDirection` is shared by presentation and simulation. Prediction does not advance the beam or redirect existing packets.
- Presentation supplies its current hand/face socket to prediction, so portal-sized relocations do not pose toward the previous frame's origin. Simulation resamples the final socket after posing.
- A sustaining cast poses toward predicted emission. Charging retains its target-point animation.
- The wrist contact solve runs after shoulder smoothing; the hand and attached weapon share the same final grip orientation.
- Simulation movement, camera/input basis, damage tuning, maps, and roster definitions are unchanged.

## Evidence and limits

The initial six cases improved to less than 0.4 degrees of palm/emission divergence. After fixing the relocation regression, all twenty-seven cases measure less than 0.7 degrees. Relocation previously caused about 14–15 degrees of mismatch at 60/120 Hz. This measures emission alignment, not all anatomical clearance or subjective feel.

The final six-second production-input crossing replay is at `artifacts/flight-review/cast-tracking/cast-tracking-final.mp4`, with 120 frames and per-frame measurements in `final/evidence.json`. The partner follows a scripted path and does not use AI. Charge, attack, crossing, release, and recovery are shown. This is procedural production animation, not an imported BFP/Mixamo clip. The earlier rifle-equipped replay in `armed/` predates the socket-relocation correction and is supporting evidence only, not final all-angle weapon-motion approval.

The first visible beam segment can still kink away from emission when a fast-moving hand connects to a previously emitted packet. In the final crossing probe, that root/path error reaches about 45 degrees. The very close crossing also has roughly 9 degrees of palm/emission error, outside the controlled far-target cases above. Charge-to-release entry has a brief aiming transition. These are remaining presentation issues, not hidden by the passing steady-cast test. Character anatomy and overall BFP-like feel remain unfinished.

Final-source verification passed: the complete pose suite (including the new 27-case check), all ten effects checks, live pointer-input camera check, nine Studio combat cases, production build, and scoped diff whitespace check. The broader Studio editing suite passed before the final current-socket correction. Focused independent review closed without remaining findings. The animation-authoring workflow influenced the implementation by making wrist/weapon contact the final pose layer and requiring motion plus interruption evidence rather than accepting a still.

The animation-authoring skill's older TypeScript rig paths, TypeScript/Vitest setup, and lint script are absent from this JavaScript repository. Current rig contracts and the available production browser/node checks are used instead; no claim is made that the unavailable four-gate workflow or whole-game acceptance passed.

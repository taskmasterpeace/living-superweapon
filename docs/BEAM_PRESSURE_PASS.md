# Beam pressure, receiving bodies and deliberate targeting

September 8, 2026. This is a bounded correction, not full-game or BFP-parity acceptance.

## Player-facing changes

- Continuous beam damage holds an upper-body pressure pose instead of repeatedly exciting the punch spring. An available left arm rises into a one-arm brace; stronger bodies lean less. The existing strength/guard pressure ladder still owns movement, launch and damage. The gesture grants no free guard, invulnerability, root lock or hitstop.
- Actual guard, melee/grab, frozen/stunned states, occupied grips and paired attacks retain their pose ownership. One-handed, eye and chest attacks retain their emitters. Forearm/wrist restoration now travels with the reaction baseline, including zero-time inspection and form changes.
- Ordinary beams stop at the first receiving body. Source-ordered traveled segments select the receiver; physical near-side sphere contact supplies the stop/impact. The extended lateral contact footprint does not let a short tip damage future targets. Cover still wins when it is nearer.
- Every packet sweeps bodies during travel, including release. A defender moving toward the shooter moves the stopping point backward. A defender leaving the lane frees energy that still has to travel onward with its original velocity. A fully absorbed, collapsed released field retires rather than leaving a cap inside the advancing body.
- Banished fighters are absent and cannot leave an invisible beam-stopping body. Ordinary invulnerability remains solid; possession's abandoned, explicitly vulnerable body retains physical contact even though it is excluded from visual lock acquisition.
- The receiving shaft has a consistent compressed cross-section and a closed end, with a shallow contact cap. This is not an instant laser: existing packet timing, steering history and curve rules remain.
- Studio beam attacks expose **Pierce fighters (otherwise stops on impact)**. False is the default; true explicitly retains through-body output. It is stored in ordinary portable attack overrides and reaches native beam construction. Checkbox, live definition, undo and redo were exercised in the browser.
- Gameplay T acquisition is now within 10 degrees of the camera-to-chest direction, previously approximately 66 degrees from the player. Visible, nonphased, in-range enemies require line of sight. Cover, lost visibility, phase, banishment, inert hidden-body state, death, changed allegiance, blindness or range loss clears an existing open-sky lock before it owns aim. T still releases unconditionally.

Explicit lock **still tracks the selected target** and retains the existing combat camera. This pass does not turn lock-on into completely manual aiming, remove the crosshair, or change the optional free-aim padding setting. The user clarified that the concern was gameplay assistance, not Studio's scripted tracking.

## Reproduction and evidence

New contact regressions first failed on a released tail crossing the defender at 30/60/120 Hz, broad startup damaging both a receiver and the fighter behind it, and open-ended rendered core/sheath geometry. These cases pass after the fixes. Original per-packet velocities, cover ordering, projectile interception, beam clash payment, damage rejection, guard chip and real Studio health-restoration behavior remain tested.

The reaction tests use real Fighter animation with actual rendered forearm/torso checks, rate comparisons, action ownership, form handoff and zero-dt restoration. A legacy progression test previously substituted `{old:true}` for an animation snapshot. It now generates a real baseline with `_animate(0)` before verifying unchanged cache invalidation and hurt/melee state retention; production code does not silently accept malformed snapshots.

- `artifacts/beam-pressure/verified-contact/advance.mp4`: **6 seconds, 120 frames, 1280×800, 20 fps**, silent, normal simulated playback speed. Native KANO Wave Cannon and actual SOL damage/brace; Studio scripts the grounded advance. 360 simulation samples; damage 496.1; no page errors. Inspected intermediate stills include samples 54 and 74.
- `artifacts/beam-pressure/gameplay-lock/results.json`: actual browser T key input through Game.update; off-crosshair rejection, acquisition, release, phase break and visible crosshair. Editor checkbox/native definition/undo/redo pass, no page errors. The deterministic fixture owns input consumption so the shell RAF cannot erase pending key edges.
- Existing `tools/combat-camera-live.mjs`: real pointer movement, free-aim beam damage 29, acquired tracking with no sampled target occlusion/outside frames, continuous release, multiple-target release, no failures/errors.
- `tools/hit-reaction-check.mjs`: discrete hit reactions and recovery retained across KANO/SOL/SARGE, four directions and 30–240 Hz; rejected hits/KO/respawn remain clean.

Rejected intermediate pictures remain recorded: padded-entry stopping left a detached blob; the next version reached the physical surface but left an open flared aperture. Both were rejected after viewing. An intermediate capture was interrupted by Vite reload. PNG-based video encoding also failed; the final capture uses JPEG frames and the resulting MP4 was checked with ffprobe. None of those incomplete/intermediate movies is the accepted action clip.

## Scope and outstanding work

Final fresh verification: focused runtime/rig/lock suite **155/155 pass**; all-root `node --test tools/*.test.mjs` **1,344 tests, 1,340 pass, four retained cloth failures** (67.22 seconds; `artifacts/beam-pressure-complete-verification.log`). Failures are stock31/platform60 torso contact, tall-wall120 cover contact, short99/platform120 torso contact, and virtual-contact overconstraint. None was deleted or its threshold relaxed. Production build passes, 260 modules, 23.48 seconds, with the existing large-chunk warning. `git diff --check` passes with only CRLF normalization warnings; HEAD remains unchanged. No commit was made.

This is procedural character animation with native combat, **not imported animation footage**, an AI-tactics test or a target-hardware FPS measurement. Physical receiving geometry remains the existing body sphere plus lateral beam footprint, not per-triangle skin/forearm collision. Broad custom proportions, grazing/airborne receiving art, simultaneous opposing loads and extreme turns need more visual coverage.

The effect still needs art polish; the stylized models, stiff-looking cape and particle discs are not AAA acceptance. The four previously retained cloth failures, paired-startup shoulder snap, full independent-combat matrix, total anatomical limits and all other requirements remain in `INDEPENDENT_COMBAT_ACCEPTANCE.md`. No map design, new external assets, comic-panel copying or new BFP source research was performed in this pass.

Game Studio/animation-authoring instructions kept production rig/combat paths in the evidence; debugging and verification instructions required failed reproductions, screenshot rejection and fresh tests before the bounded claims above. Source review also found and closed the form forearm-restore and hidden-target validation gaps.

Run `npm run test:beam-pressure`; record an inspection with `npm run inspect:beam-pressure`.

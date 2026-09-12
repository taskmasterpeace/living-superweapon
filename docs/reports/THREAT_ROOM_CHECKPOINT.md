# Threat Room checkpoint

Candidate branch: codex/playable-integration. Full combat/movement goal remains active.

Added a melee trial station beside the existing preparation portal: stationary, retreat, guard and dodge. E interaction cycles trials; replacement disposes the old target. Targets use real Fighter movement, MeleeSystem guard and performEvade. Contact records use game.onHit. A gold ground ring marks the target station. This is an initial practice station in the current map, not the completed other-dimensional Threat Room.

Checks: two native trial tests pass (replacement/cleanup, native retreat velocity and guard), two existing deployment-pad tests pass; production build succeeds with existing chunk-size warnings. Browser entered squad preparation with RAGE and captured native V presses after controlled positioning. No page errors. Two presses produced zero recorded contacts. This is useful diagnostic evidence, not a passing melee acceptance test or proof of the cause.

Evidence: artifacts/marketing/melee-threat-room-2026-09-12/retreat-trial.png; result.json; recorded WebM in that same directory. Setup is explicitly controlled; walking-entry usability and measured frame performance remain unverified.

Next: measure stationary vs retreat approach acquisition/displacement/contact, add clear miss/recovery/energy-spent teaching feedback and repeat/reset controls, then multi-angle review. Current readout is health lost and current energy, not gross energy spent. Full reset, props, cinematic review, AI movement families, flight/falling, creator proof and the remaining goal requirements are incomplete. Keep trial implementation on the candidate until further review; primary playable checkout retains previous checkpoint.

## Approach acquisition investigation

Confirmed browser trace before change: target about 19.55u ahead, ranged aim about 136.5u ahead; approachEnabled=false, approachDistance=0. Added a 20-degree, character-range-bounded melee acquisition at strike start with visibility/LOS exclusions. Ground acquisition respects height separation; airborne acquisition uses 3D aim. Point is snapshotted, not homing. Native regression proves subsequent target displacement cannot redirect the point.

After change, the same browser setup reports approachEnabled=true, approachDistance=15.74683 and a target-center aim point. Still zero contact records in the short capture; melee success remains unproven. Added per-attempt contact/no-contact teaching callbacks; end-of-strike browser output remains to verify. Source suites: 35 combined approach/guard/bot/contracts tests passed, plus native acquisition commitment test and trial tests; build passes. Capture retry used a visible browser after headless screenshot timeout. No page errors in successful trace. Artifacts include retreat-trial-after.png and additional recorded WebMs in the same directory.

Next investigation: record actor/target trajectories, mstate/mT and actual fist sweep over a complete strike at controlled 30/60/120Hz; compare stationary and walking retreat. Do not inflate invisible hitboxes or add perpetual homing.

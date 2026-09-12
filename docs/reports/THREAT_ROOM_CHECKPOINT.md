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

## Native RAGE tap: first confirmed retreat contact

Browser trace now proves one real V-tap heavy contact against the walking trial: 38.475 damage, target HP 120 -> 81.525, no page errors. The earlier jab-only test was insufficient because RAGE's current martial style maps tap to power/heavy; the regression now calls chargeStart/chargeRelease. Bounded lead accounts for ordinary retreat acceleration during windup; the committed point stays fixed and cannot exceed approach range. Physical fist sweep remains required. Broad-phase center distance now includes target body radius, preventing rejection of valid edge contact.

Fixed missing strikeStarted telemetry callback; trial now reports approach engaged, starting distance and contact/no-contact per attempt. Native browser screenshot and WebM capture updated in artifacts/marketing/melee-threat-room-2026-09-12. This is controlled positioning plus native input, not walking-entry proof.

Outstanding regression: current real-tap test passes retreat at 30/60/120Hz and sideways evade at 20/30/60/120Hz; retreat at 20Hz fails. Do not mark retreat reliability complete or merge to release. Investigate low-rate active contact sampling and differences between fixture movement initialization and native controls. Previous 43-test pass occurred before final lead tuning; do not cite it as final green acceptance. Next: resolve that failure, then add explicit repeat/reset and multi-angle review to the station.

## Repeat-target checkpoint

Added a separate cyan-ring reset interaction next to the trial selector. It repeats the current stationary/retreat/guard/dodge scenario, restores the target through native replacement and clears an unfinished attempt. Labels show the current scenario. The portal cleanup unregisters both interactions. Five trial/deployment tests pass. This resets the target only; full player/prop reset and multi-angle review are still outstanding.

The 20Hz regression remains reproducible: pre-contact body separation displaces actors laterally while the heavy fist passes the predicted point. A midpoint lead experiment did not fix it and was reverted. Preserve the real-tap failing test for the next investigation; do not replace it with the earlier passing direct-jab path. Native 30/60/120Hz tap contact and post-commit dodge evidence remains scoped as recorded above.

## Low-rate approach braking resolved

The low-rate miss came from predicted approach travel colliding with the defender before active contact. Body separation pushed actors sideways. Approach now retains the admitted target only as a forward braking obstacle: it can shorten forward travel while that body remains in the committed corridor; it never turns the strike toward later lateral movement or extends its original budget.

Real RAGE tap and post-commit sideways evade regression passes at 20/30/60/120Hz. Browser controlled setup with native V input confirms the hit again: 38.475 damage, target HP 81.525, contact record, no page errors. The earlier 20Hz failure notes above are historical and superseded by this result.

Teaching now derives tap instructions from hasStrike: RAGE says heavy slam, combo-capable profiles say punch/repeat combo. Attempt records include startup/active/recovery durations from native STRIKES and character pace; end feedback shows recovery duration. Forty-three relevant native contact, approach, trial and contract tests pass. Full player/prop reset, multi-angle replay, resource-spend accounting and the rest of the full goal remain unfinished.

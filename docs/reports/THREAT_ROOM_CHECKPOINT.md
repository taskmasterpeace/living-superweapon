# Threat Room checkpoint

Candidate branch: codex/playable-integration. Full combat/movement goal remains active.

Added a melee trial station beside the existing preparation portal: stationary, retreat, guard and dodge. E interaction cycles trials; replacement disposes the old target. Targets use real Fighter movement, MeleeSystem guard and performEvade. Contact records use game.onHit. A gold ground ring marks the target station. This is an initial practice station in the current map, not the completed other-dimensional Threat Room.

Checks: two native trial tests pass (replacement/cleanup, native retreat velocity and guard), two existing deployment-pad tests pass; production build succeeds with existing chunk-size warnings. Browser entered squad preparation with RAGE and captured native V presses after controlled positioning. No page errors. Two presses produced zero recorded contacts. This is useful diagnostic evidence, not a passing melee acceptance test or proof of the cause.

Evidence: artifacts/marketing/melee-threat-room-2026-09-12/retreat-trial.png; result.json; recorded WebM in that same directory. Setup is explicitly controlled; walking-entry usability and measured frame performance remain unverified.

Next: measure stationary vs retreat approach acquisition/displacement/contact, add clear miss/recovery/energy-spent teaching feedback and repeat/reset controls, then multi-angle review. Current readout is health lost and current energy, not gross energy spent. Full reset, props, cinematic review, AI movement families, flight/falling, creator proof and the remaining goal requirements are incomplete. Keep trial implementation on the candidate until further review; primary playable checkout retains previous checkpoint.

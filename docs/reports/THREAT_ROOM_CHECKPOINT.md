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

## Practice restoration checkpoint — 2026-09-12

The cyan repeat station now offers RESET PRACTICE. During preparation it restores the living player's HP, energy, armor and guard, clears melee recovery and common damage conditions, and replaces the current trial target. It retains the player object referenced by humans and the deployment manifest; it does not issue replacements or refill gadget consumables. Reset refuses field use, KO, active powers, vehicle seating, carried props and unrelated person holds. Target cleanup releases a hold without simulating a break-free attack and clears both target locks.

Validation: 45 combat/trial tests passed; after adding vehicle/carry guards the six trial tests passed again. Production build passed with existing chunk-size/import warnings. No new native video recorded for this reset-only checkpoint. Existing retreat-contact footage remains the latest gameplay evidence.

Still pending: full prop/scenario reset, KO practice recovery, multi-angle pose replay and slow-motion controls. The preparation pad is not yet the separate-dimensional Threat Room. Broader combat/movement goal remains active.

## Multi-angle combat review — 2026-09-12

The white ring beside the melee station now offers E: REVIEW EXCHANGE. A bounded eight-second, 30 Hz pose history records the two native fighters after physical melee contact resolution. The fullscreen review provides side, front three-quarter, overhead and rear gameplay-style angles, timeline scrubbing, pause/play, and quarter/half/normal speed. Practice pauses while reviewing; return and Escape restore gameplay without advancing the encounter. Camera orientation stays stable through a tumble rather than inheriting every body rotation.

Review actors have independent transforms, materials and skeleton bones. They never execute damage or animation logic. Geometry is shared without disposal ownership. Each recording owns a stable rig template so temporary contact-effect children cannot erase the exchange. Existing rig transforms and visibility are recorded; effects, material animation, terrain destruction and new costume changes during the session are not reproduced. This is pose review, not a complete world replay or a live cinematic camera.

Evidence: tools/melee-review-browser.mjs used controlled placement followed by a native V strike. RAGE connected for 38.475 HP. It exercised all camera buttons, the timeline, slow playback and return. Live simulation time and both HP values stayed unchanged during review; gameplay resumed with overlay/review ownership cleared; no page errors. Four screenshots and a native screen recording are in artifacts/marketing/melee-review-2026-09-12. The test opens review through the trial owner; walking to and pressing E at the station is still a usability acceptance task. Unit coverage: 17 recording/trial/retreat tests passed, including copied-skeleton independence, bounded recording, native actor isolation and transient-node stability. Production build passed; existing bundle/import warnings remain. Three.js emits a nonfatal color warning when cloning the custom shield material.

Next: improve contact/recovery teaching with timeline events, validate grabs/throws and guard scenarios through this review, and expand the practice room into its separate-dimensional staging space. Recoverable falling, distinct traversal and the rest of the persistent goal remain outstanding.

## Defense coaching and native outcome markers — 2026-09-12

Added DEFEND to the practice cycle: a deliberately paced native melee attacker advances and taps its strike every two seconds. Hold Q while facing it to practice energy-first guard. The first browser test exposed an important integration defect missed by the Studio-derived fixture: Game.isFoe prohibits all dummy attackers. The active preparation-owned DEFEND trainer now has a tightly bounded exception for its player only. Other dummies, squad members and field play retain the previous policy. Tests now use native Game.isFoe rather than the Studio predicate.

Practice forwards the existing resolved damage outcome rather than guessing from a blocked flag. The feed and review distinguish BLOCK, GUARD BROKEN, generic ABSORBED and CONTACT, showing exact HP loss and guard energy spent. Replay adds clickable wind-up/active/recovery/guard/contact markers. Native grab contact adds coaching for body blow, slam, aimed throw and the limited hold. Recorded material opacity now preserves the guard surface; its custom material constructor is cloned correctly, eliminating the earlier color warning. Review camera axes use the initial fighter-to-target line so labels do not depend on an unrelated starting facing.

Validation: 53 focused tests pass, including real defense-drill fist contact, funded guard with zero HP loss, exhausted guard with unpaid damage, native grab-vs-guard, and the trainer's restricted targeting. The headful browser used held Q with the native attacker: 0 HP lost, 7.1344 energy spent. It clicked BLOCK on the event timeline, inspected four views and confirmed frozen live time/health during review plus clean resume and no page errors. Footage/stills: artifacts/marketing/guard-review-2026-09-12. Controlled placement was used; walking-entry and controller/mobile acceptance remain pending.

Remaining work is not closed: KO/prop resets, throw/carry scenario coverage, other-dimensional staging, recovery poses, distinct traversal, wider combat/AI and operation acceptance.

## Lost-control airborne presentation — 2026-09-12

Added a shared lost-control pose layer for PowerWorld's existing rig. It distinguishes powered flight, ordinary falling, native launch/stun loss of control, attachments and KO. A nonfatal launch now articulates arms, elbows, legs and knees and turns the body coherently about the pelvis. Recovery blends the layer out; grounded/attached actors and active combat poses yield to their existing owners. The layer restores its previous transforms before evaluation and runs after offensive fist-speed measurement; it does not alter movement velocity, HP, energy, collision or recovery duration. This is an animated tumble/flail, not a second ragdoll simulation.

Lethal handoff keeps the displayed fall pose as the ragdoll's initial geometry. Ragdoll restoration accepts the retired visual layer's baseline so respawn does not preserve a bent carrier. A native regression checks no-step head continuity and arm restoration. Shared implementation is src/engine/lost-control-pose.js; no separate per-character animations were made. Animation Library authoring controls for this family remain to be integrated.

Review now records airborne control state and can follow either fighter alone, which makes long-distance launch inspection useful. The headful test uses a controlled airborne setup and an explicit native nonfatal damage launch, not a player-earned hit. It recorded SOL in flight, then uncontrolled, then flight again at the end, alive with 118 HP and no ragdoll. The overlay's weight decayed below .008; no page errors. Half-speed playback and a close side still are saved under artifacts/marketing/fall-review-2026-09-12. This is diagnostic development footage.

Validation: the focused motion/recording/defense/retreat suite passed 20 tests; flight-language, ranged-flight and ragdoll regressions passed 56 tests; after improving the lethal handoff, the 23 relevant falling/ragdoll tests passed again. Final production build passed with existing size/import warnings. Broader character-by-character visual acceptance remains open, along with landing-protection policy, dedicated aerial practice scenarios, traversal identities, and the rest of the persistent goal.

## Optional cinematic pose review — 2026-09-12

Added Cinematic replay beside the continuous review cameras. Accepted contact events select deterministic alternating three-quarter/side angles; cuts are at least 0.4 simulation seconds apart and remain on the same side of the initial fight axis. Scrubbing reconstructs the same angle. If a hit separates fighters beyond 40u, this mode follows the struck fighter at a readable distance; normal continuous views retain the full separation. No live camera or input behavior changes. This remains copied-pose review without terrain, effects or audio replay, not a cinematic cut on every live punch.

Five recording/camera tests passed using tools/helpers/css-test-hook.mjs (plain Node initially rejected the CSS import). Final production build passed with existing bundle warnings. Headful native V test after controlled placement recorded RAGE's 38.475 damage contact, changed shot 0 to 1, preserved live simulation time/HP during review and resumed cleanly with no page errors. Inspected still exposed distant tiny actors in the first version; impact-follow framing fixed that. Final clip: artifacts/marketing/cinematic-review-2026-09-12/rage-cinematic-review.webm. Multi-punch and aerial cinematic acceptance remain to test; separate-dimensional room and broader goal are still incomplete.

## Native airborne practice target — 2026-09-12

Added AIRBORNE to the existing trial cycle. A stripped SOL trainer rises from the ground through native held-flight input and hovers around 24–28u. It does not teleport to altitude or grant the player flight. Commands yield during grab, freeze, stagger, stun and launch so the trainer cannot erase a hit with a scripted position correction. Reset replaces the trainer on the ground; the same recording/contact/review pipeline applies. Lesson explains Space/F flight and airborne approach, with grabs/throws suggested but not yet accepted as tested.

Nine trial tests passed, including native takeoff/hover at 30/60/120Hz, no player flight grant, launch command suppression, and replacement cleanup. Headful browser used controlled ground placement, actual held Space for SOL takeoff and native V input. Recorded approach distance 10u, jab contact 13.3824 HP, both actors airborne, no page errors. Side contact still inspected; short live-plus-review clip: artifacts/marketing/airborne-trial-2026-09-12/sol-airborne-trial.webm. Build passed with existing bundle/import warnings. This proves one aerial approach punch, not all aerial combos/grabs/throws or controller/touch acceptance. Those and the wider persistent goal remain open.

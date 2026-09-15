# Integration checkpoint — September 15, 2026

## Playable baseline
Use http://127.0.0.1:5193/ from D:/lsw/.worktrees/combat-release-review, branch codex/playable-integration. Development pages display branch/revision/port. Click the badge for checkout and tracked diff; automated identity also hashes newly added runtime source/assets. A badge is identity, not acceptance.

Native entry: select character, enter with squad, wait for Threat Lab, Shift+V opens the outdoor proving ground. J boards/exits; L cycles five imported models; K octagon; P boxing ring. Shift+V consumes the V press so deployment does not also punch. The lab-to-desert transition changes the practice mode session; it is not yet a seamless persistent-world extension of the indoor room.

## Implemented this pass
- Scoped proving-ground integration with motorcycle, tank, light mech, helicopter and strike jet; source GLBs and handling modules retained, no whole-branch overwrite.
- Native ThreatRoom mode transition corrected; stale async spawn/reset guards and per-instance geometry ownership added. Seated actor movement/articulation yields to fleet controller.
- Size/class-based vehicle camera and heading follow.
- Early bundled audio preload; selected wheeled start, idle, accel, brake and shutdown cues connected through SoundLibrary preserving user bindings. Other classes do not receive car recordings.
- Melee practice records exact release charge, selected available region, actual native attack, and ground/air context. Tap/hold thresholds unchanged; no double-tap delay. Capability-limited styles retain their actual available moves.
- New Unreal content audited; 46 CloseCombat FBXs extracted privately with verified hashes, 38 warning-free parses and eight requiring extra-layer review. Jab/cross are source candidates, not newly assigned gameplay punches.

## Evidence and limits
106 targeted tests pass; production build passes with existing large-chunk warning. Artifacts: artifacts/integration-20260915/final-tests.txt and build.txt. Browser evidence uses native selection/Shift+V, then scripted production spawning/boarding/control for five vehicles. Previous run measured nonzero movement and successful exit for all five with finite coordinates and no page errors. 245/245 hot samples decoded. These are not five complete native-input handling acceptance sessions or a listening review.

The first browser run exposed sim structures appearing inside the old ThreatRoom. Fixed. A later screenshot was taken during the replacement stage's preparation screen and rejected; the harness now waits for the replacement stage to finish before capturing. Do not use loading footage as proof.

## Still required
Complete current-model native aerial grab, held flight, aim/throw, damage, landing/get-up proof. Review and assign additional purchased clips after source/target contact checks. Finish audio listening review and jet/rotor/reload source gaps. Replace ordinary ambient jets through their actual AI/physics owner, not by merely spawning a controllable jet. Finish vehicle hull damage/weapons, visible motorcycle rider and stronger camera acceptance. Compact backpack/trunk ownership, device camera transition, extended freelook and remote drone controls remain unfinished.

The three-region dummy telemetry is implemented; a full native demonstration across all three regions is still owed. Wind/hurricane practice must expose existing wind behavior honestly; no new wind test was added here.

## Issues and follow-up
- #34 Drone remote: constant-speed swarm orbit, adjustable circle and individual control. Drone combat/consumption semantics need a deliberate choice.
- #35 Fleet: riders, hull damage, weapons, boarding and camera acceptance. #33 separately tracks ram impulse into vehicle motion.
- #36 Level authoring with Polygon Town/Prototype, versioned scene recipes and scale/contact validation.
Existing #21 pickup contact, #24 get-up, #25 audio fallback, #26 throw anticipation, #30 boxer continuity and #31 neck contact remain open. No completion claimed for those.

Read docs/UNREAL_CONTENT_INTAKE_2026-09-15.md, docs/FLEET_FIVE_VEHICLE_PLAN_2026-09-15.md and docs/AUDIO_STARTUP_VEHICLE_CHECKPOINT_2026-09-15.md for source-specific detail.

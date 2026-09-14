# Dec-52 motion library checkpoint

The family viewer now consumes src/engine/dec52-motion-library.js rather than maintaining its own all-purpose sine pose. Rat and hound have idle, walk, run, bite, jump articulation, sniff and flight articulation clips. Remote mech has idle, walk, run, jump and flight articulation. Cloud uses existing formation visualization and does not advertise unsupported skeletal motion.

Export motion library downloads Three.js clips with family, source, loop and candidate metadata. Locomotion is in place; jump does not translate the simulation entity. Physics and damage remain separate. These are procedural authored candidates, not imported mocap or gameplay-approved gaits.

Tests on actual rat, hound and mech GLBs verify target joint existence, finite transforms, unchanged joint positions, loop closure and diagonal front/rear alternation. Foot planting, body/armor clearance, bite contact and gameplay integration remain to review. Do not call the whole Dec-52 task complete based on these checks.

## Continuous playback

The shared Dec-52 animator now exposes advance(action, dt, options) with short crossfades, looping locomotion, clamped one-shots, explicit restart and scrubbing-to-playback continuity. The family workshop uses this player. Removed its per-frame joint reset during playback, which conflicted with mixer caching; manual bend is restored before the next sample. Tests on the real hound cover blend entry continuity, one-shot clamp/replay and unchanged simulation root; all four Dec-52 tests pass and build passes. Gameplay actor loading and visual gait acceptance remain open.

## Workshop replay controls

Added quarter/half/normal playback, explicit restart, elapsed-time display, and correct Play/Pause state after one-shot completion or scrubbing. Restart calls the shared animator restart option; changing motion resets its playback. Existing four real-model animator tests and production build pass. Browser hound bite completion/replay checked. This remains workshop playback, not Dec-52 gameplay actor integration.


## Game-state animation adapter

createDec52GameplayMotion(actor, family, {runSpeed}) now maps metre-per-second velocity, flying/searching flags and accepted attackToken/jumpToken identifiers to the shared named-pivot clips. Hitstop freezes playback; incapacitation cancels queued one-shots; repeated tokens do not repeat a bite. It does not move the actor or apply damage. Five actual-model driver/library tests and build pass.

Integration remains incomplete: an actual Dec-52 gameplay actor must supply collision/body dimensions, accepted action tokens, velocity converted to metres per second and incapacitation states, then call update once per simulation tick. Mech weapon fire and cloud formation need their own presentation channels; no bite is invented for unsupported families. No ordinary humanoid actor was silently replaced with mismatched animal hitboxes.


Runtime audit: createCreatureActor has only a workshop caller. Actual creature gameplay registration and collision are absent; tracked at https://github.com/taskmasterpeace/living-superweapon/issues/20. The animation adapter is ready for that integration, but does not itself make Dec-52 playable.


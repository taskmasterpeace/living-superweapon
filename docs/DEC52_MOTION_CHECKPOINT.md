# Dec-52 motion library checkpoint

The family viewer now consumes src/engine/dec52-motion-library.js rather than maintaining its own all-purpose sine pose. Rat and hound have idle, walk, run, bite, jump articulation, sniff and flight articulation clips. Remote mech has idle, walk, run, jump and flight articulation. Cloud uses existing formation visualization and does not advertise unsupported skeletal motion.

Export motion library downloads Three.js clips with family, source, loop and candidate metadata. Locomotion is in place; jump does not translate the simulation entity. Physics and damage remain separate. These are procedural authored candidates, not imported mocap or gameplay-approved gaits.

Tests on actual rat, hound and mech GLBs verify target joint existence, finite transforms, unchanged joint positions, loop closure and diagonal front/rear alternation. Foot planting, body/armor clearance, bite contact and gameplay integration remain to review. Do not call the whole Dec-52 task complete based on these checks.

## Continuous playback

The shared Dec-52 animator now exposes advance(action, dt, options) with short crossfades, looping locomotion, clamped one-shots, explicit restart and scrubbing-to-playback continuity. The family workshop uses this player. Removed its per-frame joint reset during playback, which conflicted with mixer caching; manual bend is restored before the next sample. Tests on the real hound cover blend entry continuity, one-shot clamp/replay and unchanged simulation root; all four Dec-52 tests pass and build passes. Gameplay actor loading and visual gait acceptance remain open.

## Workshop replay controls

Added quarter/half/normal playback, explicit restart, elapsed-time display, and correct Play/Pause state after one-shot completion or scrubbing. Restart calls the shared animator restart option; changing motion resets its playback. Existing four real-model animator tests and production build pass. Browser hound bite completion/replay checked. This remains workshop playback, not Dec-52 gameplay actor integration.


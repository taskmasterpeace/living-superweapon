# Directional combat motion

The creator requests implementation: less rigid walking/running, movement independent of optic/palm/weapon aim, less self-intersection, and stronger beam/contact reactions. Standing autonomous execution authority is in PRODUCT.md; this pass stays in the existing dirty checkout and does not commit, redesign maps, change the BFP camera, or replace source assets.

## Design

Keep simulation position, aim and hit detection authoritative. Ground locomotion uses a visual travel heading, bounded relative to aiming (backpedalling remains a supported fallback). An upper-body overlay turns shoulders independently, then the head and hand solve their actual emitter direction. Preserve sampled source gait while casting ranged attacks; guard, punches, grabs and incapacitation still own their poses. Apply source hip counterrotation rather than locking the pelvis. Restore every overlay before sampling the next frame, including positions, to avoid cumulative distortion or form-change contamination.

Attack presentation is metadata, not character-name branching: automatic, palm, two-hand, optic-focus and chest-brace families. Invalid emitter/preset combinations must not silently move gameplay origins. Studio must expose applicable choices and round-trip them through character packages. Existing equipped weapons remain attached to driven hand meshes.

Beam feedback triggers on actual hose contact, with bounded pulses and a distinct blocked response. Damage remains continuous and never adds per-tick hitstop or stun. Preserve the existing strength/guard pressure ladder. KO ragdolls remain; assess nonlethal launch tumbling at the visual layer first, without a second physics authority or automatic repeated knockdowns.

## Acceptance

- Running legs continue during a sustained lateral shot; travel direction and target direction visibly differ.
- Walk/jog/sprint retain fixed bone lengths and grounded boot volumes over complete cycles and source scale variants.
- Head/palm/weapon follow attack direction without shoulder-to-torso intersections in representative side shots; extreme rear aim uses bounded body turning/backpedalling, not an impossible neck twist.
- Guard/melee/grab/hit/flight/KO transitions and form changes restore their bases.
- New presentation settings survive validation, Studio application and package round-trip.
- Beam contact visibly recoils/pulses, shield contact differs, missing/invulnerable targets do not falsely react, and health loss/control behavior are unchanged.
- Review real motion with floor, target and equipped weapon context. Passing tests do not establish subjective perfection.

## Reference approach

Use publisher character material and comic panels for line of action/emitter identity; use the existing CC0 Quaternius source clips for actual locomotion timing. Optic focus, palm projection and chest bracing are original pose families, not shipped comic artwork. Record accessible primary links and distinguish visual inference from source facts.

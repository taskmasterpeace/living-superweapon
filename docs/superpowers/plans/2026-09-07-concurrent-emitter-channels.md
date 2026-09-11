# Concurrent emitter channels and deliberate casting mobility

Continue the active independent-combat goal; no new engine, maps, assets or camera replacement.

1. Reproduce against actual Fighter / StudioCombat / BeamHose: eye-plus-palm powers lose hand articulation; combined two-hand beams originate at one hand; a beam silently halves velocity every simulation frame.
2. Add shared channel selection and per-slot successful-emission timestamps. A live optic emitter owns the head while a hand attack owns arms; chest remains a torso source. Keep melee/guard/grab interruptions authoritative and preserve source locomotion. Do not claim independent targets or unlimited simultaneous arm actions.
3. Share combined-hand emitter metadata between pose and beam simulation. Sample the final animated midpoint, preserving traveling packets and existing steering, energy and collision.
4. Replace implicit per-beam velocity multiplication with an authored casting-speed multiplier in the existing movement controller. Default to full mobility, use the strongest authored restriction once, preserve knockback. Expose and round-trip the setting in Studio.
5. RED-to-GREEN real-body regressions, entry/sustain/release and multi-rate checks, exclusive browser motion recording with geometry in context, independent review, fresh tests/build. No production edits during capture.

This is a bounded pass, not approval of every custom rig, movement state or full AAA feel.

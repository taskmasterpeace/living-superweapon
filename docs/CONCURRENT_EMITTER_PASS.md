# Concurrent emitter and casting-mobility pass

## Faults reproduced and corrected

The old pose selector returned the first live beam. With eyes first, a simultaneous palm power inherited the optic-focus pose and aimed its arm at the temple. With hands first, both head and hand followed the same beam's steering response. The new channel selector gives a live optic emitter the head and a hand-origin attack the arms. Per-slot successful-shot timestamps also let alternating volleys keep their own hand poses beside a sustaining eye beam. Input, costs and damage still run through the existing ability system.

Combined two-hand beams previously sampled the right hand, roughly two units away from the actual paired-palm midpoint in the reproduced fixture. Shared two-hand classification now controls both pose and simulation. Launch resolves once after final articulation; the first packets use the selected eye/chest/hand source and the commanded aim point. This fixes the independent review's zero-steering wrong-ray finding. Subsequent packets retain normal traveling-hose behavior, steering, collision and energy use.

Every sustaining beam used to halve horizontal velocity every frame. Multiple beams compounded that penalty, and its effect depended on frame rate. This hidden braking is removed. `castMoveScale` is a bounded 0–1 wish-speed multiplier in the actual movement controller, with default 1. Multiple restrictions use the strongest restriction once, not their product. It does not multiply knockback or rewrite velocity from rendering. Studio exposes **Movement while casting** and validated profiles retain it.

The moving-volume audit found two additional faults. Shoulder easing and immediate elbow changes could move a recovering temple hand through the ribs. They now travel as one bounded articulation before final palm/weapon alignment. Separately, the ranged overlay outlived the live beam, but source gait was disabled during that release tail; the generic cast base briefly replaced running. Source gait now remains under ranged recovery. Guard/melee/grab and other exclusive states retain their existing priority.

## Editor workflow

Studio → **Attack sequence** → **Co-fire** selects a second compatible attack. Use **Fighter motion** to rehearse a moving encounter, and scrub the timeline to inspect start, sustain and recovery. Selecting the primary as the companion clears co-fire; invalid slots reject. The ordinary trigger sequence starts at 0.6 seconds; it does not invent a second remote-detonation command. Ki costs, cooldowns, unlocks and actual target contact remain production behavior.

Co-fire is rehearsal state, not a saved character mutation. Contact numbers explicitly include both attacks; nominal damage and sequence phase describe the primary, with named secondary resource failures. Charge hold enables for either attack, and the timeline includes long secondary charges and recovery. Independent review found both the truncated secondary-charge timeline and misleading secondary-denial label; both received RED-to-GREEN regressions.

The neutral Studio movement path is scripted inspection, not gameplay physics or a performance claim.

## Fresh evidence

- **306 focused Node tests pass**, including 30 concurrent-emitter/Studio cases. Intended failures were reproduced before corresponding source changes.
- Eye + palm across strafe, hover, flight, ascent and descent, reversed slot order, independent steering, open palm, continuous source gait and complete release.
- No per-beam velocity mutation at 30/60/120 Hz; an explicit half-speed pair remains half-speed, not quarter-speed.
- Final midpoint origins and zero-steer command snapshots for combined hands, eyes and chest.
- Six rendered forearm/hand volume sequences through entry, sustain, hand release, eye-only sustain and recovery, using mesh vertices including hand morphs—not joint centerlines alone.
- [Motion recording](../artifacts/concurrent-emitter/concurrent-powers.webm): fixed-position eye/palm and eye/two-hand inspection in strafe and flight. Measured active eye alignment ≥0.999994, palm alignment ≥0.99980; combined midpoint error 0. No browser errors. Full samples: `artifacts/concurrent-emitter/results.json`.
- [Studio co-fire](../artifacts/concurrent-emitter/studio-cofire.png): shipped SOL Heat Ray + Heat Flurry, actual beam and three live hand-origin shots at 1.2s; 82 actual combined contact damage in that deterministic fixture. This is not a balance rating.
- Long-charge browser check: timeline 16.6s, secondary releases a real projectile, charging ends and pose recovers. Zero browser errors.
- Actual PowerWorld controls: SOL strafe-and-fire distance **50.913u**, previously **11.308u** under the same script; minimum optic alignment 0.999995. SARGE 49.395u, weapon alignment 0.999967. Both recover with zero browser errors. Base speed was not increased.
- Fresh production build passes (244 modules), plus 13 syntax checks and scoped diff whitespace checks. Vite still warns about the pre-existing oversized shared Studio-profile chunk (~4.89 MB minified).

The project uses Node tests and Vite; TypeScript/Vitest/lint gates named in the animation skill are not configured here. No claim is made that unavailable commands passed. Motion sources remain the retained Quaternius authored gait plus procedural combat overlays, not newly imported clips.

## Remaining limits

This is not unlimited independent body ownership. Two powers competing for the same arm still need deliberate arbitration. A simultaneous chest-and-hand emitter with substantially different steering responses is not independently torso-solved. Both powers share the player's commanded target; this does not add two crosshairs. Combined charged projectiles and cones need separate final-origin audits. Broader custom equipment/body proportions, jump/landing, near-wall origins, high-speed reversals and creator feel acceptance remain in the active goal. The recordings are not target-hardware frame-time certification or proof of AAA finish.

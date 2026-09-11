# Aerial contact and body reaction — September 6, 2026

This is progress toward the requested BFP-inspired combat, not a complete-game or AAA rating.
No map geometry or design changed.

## Reproduced

- Real discrete damage produced zero head/torso recoil in twelve front/back/side cases.
  Only hit flash and physical knockback communicated the blow.
- Real aerial melee put impact stars, flashes and some rings at absolute Y=5–5.8.
  At 140 and 300 units, feedback was below the fight. A dive ring supplied an airborne
  position but its explicit `y:0.4` option overrode it.

## Changes

`hit-reaction.js` is an original procedural carrier, not an imported animation clip.
Unblocked discrete PowerWorld damage injects a strength/damage-scaled impulse into a
critically damped response. The upper body recoils around the hips and recovers; vertical
blows arch/fold it. The layer restores its own base every frame and does not reparent joints.
It runs after offensive fist-speed measurement, so recoil cannot grant melee power.
Physics and feet remain unchanged; KO hands the displayed body to the existing ragdoll.
Ice and paired victim contact suppress the carrier. `dot` hits do not queue a flinch.

Melee and the shared hit/block callbacks now place contact feedback relative to the
participants' heights. Ground-level values remain the same. Audio calls sharing those
positions receive the corrected coordinates; this does not add 3D spatial audio.

## Evidence

`npm run test:impacts` exercises real damage/animation and real scene effects:

- Three rigs × four horizontal directions; full 120-frame onset/recovery paths.
- Up/down impacts; 30/60/120/240Hz agreement at the same elapsed time.
- No pose accumulation from zero-time rendering, no root/boot displacement, no added
  offensive fist speed; no recoil on blocked, invulnerable, zero, dot or city-path damage.
- KO/respawn clears the reaction and returns the body to its prior pose.
- Nine melee/grab branches at three altitudes. Checks inspect newly created sprite,
  ring and flash meshes; escape must actually release the clinch.

Both core regressions were observed failing before their fixes. The pure-vertical test
and expanded flash-mesh checks found additional failures, also corrected.

`tools/hit-reaction-reel.mjs` records production melee plus Fighter.update/body separation
against a moving KANO and an armed, falling SARGE. Its inspection camera follows SARGE through
landing; the initial midpoint-only capture lost him and was rejected. It is scripted contact,
not proof of the gameplay camera, AI, online combat, or foreground performance.
Evidence: `artifacts/flight-review/hit-reaction/`.

Camera, flight, beam-pose, Studio, full kit regression, 30-second combat soak, and production
build checks were run during this pass. The animation skill's TypeScript/Vitest/lint gates
do not exist in this JavaScript repository; the actual project commands are used instead.

## Still not accepted as finished

The carrier is a short nonlethal recoil, not authored knockdown choreography. Foot support
stays with locomotion and terminal falls stay with ragdolls. Models, hand articulation,
melee wind-up/contact/recovery poses, and multi-fighter effect stacking need more work.
Specifically, the falling SARGE sequence exposes an aerial melee-contact mismatch: damage
can register while the attacker's horizontal fist pose passes above the target. Correct
effect altitude does not fix that strike-volume/pose disagreement; it is the next combat issue.
The subsequent [directed contact pass](MELEE_CONTACT_PASS.md) addresses this reproduced
mismatch with real fist sweeps and timed 3D punch poses, while retaining broader acceptance gaps.
Studio still lacks an opponent/attack simulation in its game-camera preview. Continuous
callers without `dot` metadata (notably clinch thorns), remote-authoritative hit presentation,
and all possible interrupt combinations are not covered by this pass. Passing these tests
does not establish BFP feel; full moving-fight review and creator acceptance remain required.

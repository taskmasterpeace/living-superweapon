# Charged beam body sequence — 2026-09-05

## Player-visible change

Charged martial beams now gather between both hands, then thrust along the aim direction.
An aerial cast braces both knees with separated legs instead of freezing one leg into the
old running silhouette. Optic and non-martial palm emitters retain their distinct poses.
The opaque charge core is smaller; the colored outer field still grows with charge.
Damage, charge power, beam radius, input timing and traveling-tip behavior are unchanged.

## Shared seams

- `hero-rig.js`: two-bone `reachArm` uses the existing flat FK and its real hand sockets.
  Wrist rotations reset on each base pose so held gear returns cleanly after an aimed thrust.
- `combat-pose.js`: `def.castStyle: 'two-hand' | 'palm'` optionally selects the presentation.
  Without an override, charged beams on martial flight rigs use two hands. No hero-ID branch.
  Gather follows slot state, release follows the real beam. Visual body yaw is air-only;
  physics root position stays authoritative. Rendered joint angular travel is bounded.
- `abilities.js`: only beam charge-preview core/glow proportions changed. Other charge orbs
  retain their size treatment. The final two-handed orb position is resolved after animation.
- `projectiles.js`: the PowerWorld visual beam tip grows with traveled distance and remains
  within the outer sheath's scale. This avoids the old 12.4-unit launch bulb on a 4.75-unit
  charged beam. Tip travel, stream geometry, damage/collision radius and clashes are unchanged.

## Evidence and regressions

`npm run test:charge` runs a real KANO slot through idle, charge, **early release**, sustain,
stop and recovery. `--capture` records 120 rendered frames at 30 simulated frames/sec, plus
front, both profiles and rear at nine phases. This is deterministic simulation evidence,
not a wall-clock performance measurement or imported BFP animation.

Evidence: `artifacts/flight-review/charge-sequence/` (ignored generated outputs).

Observed RED before correction: hands 4.27 units apart, orb 2.20 units off their midpoint,
no gather-to-release extension, and one knee held at 1.35 radians. Later regressions caught
leftover wrist rotation, an oversized opaque charge core and a 0.77-radian entry jump.
The corrected sequence gathers at a 1.16-unit hand separation, holds the orb at the actual
midpoint, extends about 1.05 units, and bounds per-frame angular travel below 0.45 radians
at 30fps. Physics position remains unchanged.

Review caught a fixture error: `held:true` on the release edge tested automatic full charge
instead of early release. The fixture now clears held and asserts a live beam on that edge.

Companion checks: `test:poses` (elevated/moving aim, interruption, recovery, KO), `test:flight`,
`test:camera`, `test:combat`, `test:studio`, and `build`.

## Limits / next work

The initial charge particle field was visually bead-like and too noisy; the
[combat-effects follow-up](BEAM_READABILITY_PASS.md) replaces the beam field and adds rendered
target-visibility checks. Hand meshes remain fists,
not articulated open palms. This shared procedural sequence is not bespoke animation for
every character, and extreme-proportion costume clearance is not comprehensively proven.
The launch obstruction is reduced. The follow-up addresses sustained beam washout and full
contact glare, but the camera's geometric check alone still does not establish readability.
These are open quality gaps, not waived requirements. No map design changes.

The animation-authoring skill supplied the motion-through-time, socket, interruption and
multi-view checks. Its TypeScript rig lab and tsc/vitest/lint gates are not configured in this
JS repository; the actual runtime tests and Vite build are used instead. This is not full
animation-skill approval or proof of the user's final feel/quality target.

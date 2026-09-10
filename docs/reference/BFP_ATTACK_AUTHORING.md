# BFP attack behavior evidence

Checked 2026-09-06. This is a behavior mapping, not a claim that this engine already implements the list.

## Sources and authority

- [Recovered BFP player guide](https://github.com/LegendaryGuard/BFP-docs/blob/main/docs/guide.md): original player-facing behavior preserved by a community repository.
- [Weapon configuration documentation](https://github.com/LegendaryGuard/BFP-docs/blob/main/docs/bfp_weapon_config_file.md): community technical documentation; distinguish reconstruction details and its original-version notes from measured footage.
- [Attack-set configuration](https://github.com/LegendaryGuard/BFP-docs/blob/main/docs/bfp_attacksets_config_file.md): separates attack definitions from model-to-kit assignment.

## Lifecycle requirements from the guide

Standard fire can repeat while held. Charged fire releases on key-up; some attacks require a minimum preparation. A released beam remains aimable and another fire press detonates it. A special missile splits into four homing children on detonation. Attack volume matters in collisions; beams struggle against beams, while disks and the large death-ball are special cases. These are not interchangeable with merely drawing a large projectile or ending a held beam.

## Configuration mapping

The weapon document separates direct and splash damage, projectile/explosion size, charge limits and scaling, travel speed, lifetime, homing parameters, spread, gravity, priority and split-child assignment. Its priority rule destroys the lower-priority projectile and destroys both on a tie; beam pairs use the struggle path instead. Attack sets bind numbered attacks to model prefixes, independently of weapon definitions.

## Implementation boundaries

Studio's initial tuning slice covers the current engine's beam, projectile, volley and charge parameters. It must use actual production defaults and reject unsupported keys. It does not claim to import Quake configuration or recreate its engine units. Original character recipes, poses, camera and attack overrides travel together in our versioned character packages.

Next lifecycle work should be explicit data options, not a silent conversion of every existing comic-book power. Preserve the traveling-hose law, strike/grab/guard rules and distinct gun/energy identities. Add tests for actual input edges, minimum charge, depleted ki, interruption, ownership, hit attribution, cleanup and bot input before claiming parity.

## Integration risks found during authoring work

- Charged beam and shot entry fees were formerly billed after charge drain, allowing a negative ki pool. The current fix pays entry once at preparation; under-minimum shot fizzle refunds entry only. Dedicated energy tests and the existing beam encounter suite cover this change.
- Current projectile manager updates every list entry without first checking `dead`. Any externally triggered detonation or inter-projectile collision must retire dead entries before their next update, and impact/disposal must be idempotent.
- Remote activation must not be mistaken for a new paid attack. Pressing to detonate should not issue an insufficient-entry-ki warning. A deflected projectile changes caster/team; its original owner must not retain remote authority.
- Standard beam input currently ends the beam on a subsequent release. A new release-to-launch/second-press-to-detonate option needs its own explicit lifecycle; never replace travel packets with an instant line.
- Studio currently measures beam damage on the real Fighter callback. High-damage projectile authoring needs an inexhaustible measurement target, otherwise its normal KO path runs before that callback can refill health.
- Existing interruption checks mostly verify visual pose ownership. They must not be cited as proof that frozen or staggered fighters stop all offensive simulation; that requires separate ability/resource tests.

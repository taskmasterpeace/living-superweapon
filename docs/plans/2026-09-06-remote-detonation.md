# BFP-style remote detonation — next lifecycle slice

## Approved direction

User requests full BFP behavior and custom-character authoring, excluding maps. BFP's recovered guide describes release-to-launch steerable beams and a second fire press to detonate. Implement this as an explicit authored option for beam/projectile/charge, preserving existing held-beam defaults and the traveling-packet hose. No imported BFP code or art.

## Contracts

- `remoteDetonate` opts a supported attack into owned second-press activation. No extra entry cost/cooldown denial on detonation. A remote beam ignores key-up after launch, but still consumes sustain ki and uses existing aim/stream physics until detonation, depletion or interruption.
- `detonateRadius` and `detonateDamage` are bounded explicit beam payload parameters; defaults derive from the existing attack. Projectile/charge detonation uses its actual blast and damage payload.
- Explosion occurs at the real traveling tip or projectile position, never a fabricated point ahead of the attacker. Damage routes through production areaDamage with the current caster for attribution. One impact/disposal only.
- Deflection transfers caster/team; former owner loses remote authority. KO/teardown discards references; it must not leave a future input able to trigger an old match's projectile.
- Dead projectiles are pruned before update so external detonation cannot run disposed geometry or apply impact twice.
- Editor field registry exposes only implemented options, and the production attack preview can demonstrate the second press. Definitions remain portable and identity-bound.
- Bot intent must use the same runSlot entry as player control, with an explicit decision based on its visible target and actual remote tip distance. Never grant knowledge of hidden targets.

## Implementation / verification order

1. Failing Node tests with actual Projectiles instances for detonation position, damage attribution, idempotent cleanup and manager pruning; production ability tests for release/second press, zero-ki detonation and ownership transfer.
2. Implement narrow runtime methods and slot lifecycle, then Node regressions. Coordinate Vite edits with the Studio GPU-test owner; no concurrent source edits during browser tests.
3. Add validated editor fields, bot decision and preview input phase. Browser proof must include direct inputs, both release models, depleted ki, interruption and clean reset. Run existing beam path/charge/Studio regressions before claiming this slice ready.

Splitting, projectile collision priority, transformation/unlock tracks and BFP rulesets remain separate subsequent slices. Do not label this full parity.

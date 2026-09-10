# Traveling beam clash contact

## Diagnosis

`Projectiles._beamClash` currently gates only caster distance and facing, then starts a struggle.
Two newly spawned beams can therefore clash before either stream reaches the other. It also forces
airborne finish VFX/worldImpact to y=6/0.4. Both violate the existing traveling-hose/readable-contact
contracts; no map redesign or new combat policy is needed.

## Narrow correction

- Require actual swept path-volume overlap before starting or continuing a beam struggle. Use
  production path segments and radii, not an infinite aim ray or future maximum reach.
- Broad-phase segment bounds before exact 3D segment distance; avoid per-segment allocations.
- Preserve current strength/ki struggle rules, opponent checks and player/bot symmetry.
- Keep defeat VFX at the defeated caster's actual altitude; ground shockwave only near ground.
  Pass that actual position and winner attribution to existing worldImpact gating.
- RED tests: fresh non-touching beams do not clash/pay; curved near misses do not clash; actual
  3D contact does; charged volume matters; airborne defeat effects are not projected to ground.
- Validate Node tests, real beam travel/clash browser behavior and ordinary remote/charge regressions.

## Review corrections and current evidence

- Original RED: five failures / one contact pass. Fresh streams and curved/altitude near misses
  incorrectly clashed; interrupted remote beams paid struggle energy; airborne finish appeared at y=6.
- Initial overlap gate fixed those, but independent review reproduced delayed counter-beam flicker:
  the old midpoint initialization retracted one stream away from the real contact. Six added tests
  failed at 30/60/120Hz for delayed launches and unequal tip speeds.
- A new struggle now starts at its measured 3D contact, retaining an off-axis offset for curved streams.
  Both traveled paths absorb packets at the same contact knot, rather than snapping to a straight ray.
- Review then caught a knot extending a collision-clipped beam through intervening cover. Collision
  clipping now breaks both sides' struggle state before pinning. Cover and real interior-query tests
  exercise this over repeated frames.
- Fresh 19/19 Node tests pass. Independent scoped re-review PASS.
- `node tools/beam-clash-browser.mjs`: PASS actual travel before contact, joined airborne tips,
  sustained clash, airborne defeat/damage and zero page/console errors. Actual poses are stepped;
  the wide diagnostic camera is for inspecting both streams, not a new gameplay camera setting.
- `node tools/beam-stream-check.mjs`: PASS 30/60/120/240Hz reach, curved old-packet direction,
  cover contact/release and interior collision, zero reported failures.
- `npm run build`: PASS after the contact correction (211 modules). No map changes.
- Artifacts: `artifacts/beam-clash/airborne-contact.png`, `airborne-defeat.png`, `results.json`.

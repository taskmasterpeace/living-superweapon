# Resource constructs

The verified first slice adds native wall/tank persistence, incoming-hit energy handling and portable editor controls. This is not completion of the wider nanite, military or infection brief.

## Author a power

1. Open Character Studio. AURUM's wall is an existing starting point; **New character / Edit power kit** opens ORIGIN, where **Will Tank** is the new command power.
2. Select **Attacks**, then the wall or tank's **Attack slot**.
3. Choose **Construct lifetime** and edit its active budget. Inactive settings remain visible and are kept if you switch modes.
4. Use **Attack sequence** to inspect native formation, incoming contact and dismissal. Tank cannon inspection needs enough space beyond its barrel; increase **Target distance** when necessary.
5. **Save local** applies the profile when gameplay loads. **Export JSON** exports a portable character package for a custom fighter, or a profile for a shipped fighter. Importing a character package creates a new local copy.

| Lifetime | What maintains it | What ends it |
| --- | --- | --- |
| Timed | Original duration | Original timer/actions; existing kits remain unchanged |
| Continuous upkeep | **Existence cost**, in ki per simulation second | Empty owner energy, a second press to dismiss, owner KO/removal or encounter cleanup |
| Damage-backed energy | **Damage conversion**, in ki per accepted attack-damage point | The same resource cleanup rules; idle time does not debit this mode |

These are exclusive modes, not two simultaneous budgets. Resource constructs have no additional hidden HP pool or expiry timer. Ordinary owner regeneration still runs: upkeep below regeneration can be sustainable. For example, 12 ki/s upkeep and 8 ki/s regeneration consume a net 4 ki/s away from the energy cap; other native regeneration modifiers can change that result. Infinite-core characters retain their existing infinite-energy behavior.

Entry energy and cooldown remain properties of the source power, not editable construct-budget fields. Will Tank starts as a timed source: 24 entry ki, 8-second cooldown, 12-second duration; its separate ORIGIN build price is 28 points. An active resource construct can be dismissed with its slot's next press even when energy is too low to summon another. Releasing a held button does not dismiss a resource wall.

## What the inspection measures

The resource encounter is an **eight-second rehearsal**, not an eight-second runtime lifetime:

- 0.6 s: native summon input.
- 1 s: tank movement designation.
- 2.5 s: a real incoming projectile is sent toward the construct's current physical bounds; arrival is later.
- 3 s: tank holding designation.
- 6 s: native dismissal input.
- 8 s: rehearsal reset/cleanup.

Starting energy is an encounter control, not a saved power balance change. The budget readout separates owner energy, construct accepted hits/damage/energy spent, and humanoid damage from outgoing attacks. Incoming damage in upkeep mode can register a contact without an additional per-hit energy bill. Damage mode spends energy on the accepted hit only.

Pause, view changes and zero-time samples do not advance resource simulation. Scrubbing rebuilds the encounter from its starting energy; historical audio stays silent. The pose-settling pass is presentation only, so it must not secretly regenerate energy before time zero. Mixed timed/resource co-fire uses the eight-second inspection and is not proof of the timed power's complete lifetime.

## Native behavior and limits

- Traveling beams must actually reach the construct before billing contact. Released tails do not keep spending owner energy. Explosions use one native falloff calculation rather than billing both contact and city-cover routes.
- The wall and tank physically obstruct shots. Friendly direct/beam/melee hits do not drain their owner's energy; native explosion team filtering is separate.
- Same-owner resource constructs share one pool. Exhaustion retires them synchronously, including their collision bounds, so a depleted tank cannot fire a final free shell.
- The tank turns its hull and turret separately, fires native projectiles and stops at blocked travel/barrel candidates. Close targets inside its muzzle clearance are not fired through. It is not a player-driven military vehicle, and this slice does not add pathfinding, ramming or recovery from geometry inserted through an already occupied barrel.
- Only wall and tank sources expose resource authoring in this slice. Fist, hammer and sentry retain their existing behavior. Nanite cannon/shield attachments are a separate implementation.

Source-identified sparse overrides travel with the existing profile/package format. A package recipe is rebuilt from genuine ORIGIN catalog choices; an imported source snapshot cannot authorize cheaper entry costs or a different construct form.

## Evidence

Native Tasks 1–3: `docs/reports/2026-09-08-resource-constructs-task1-report.md`, `docs/reports/2026-09-08-resource-constructs-task2-report.md`, `docs/reports/2026-09-08-resource-constructs-task3-report.md`.

Task 4 authoring: `docs/reports/2026-09-08-resource-constructs-task4-report.md`; 310 focused tests, build, independent review, actual UI/package/gameplay-definition browser checks and inspected images passed. `artifacts/resource-construct-studio/native-studio-tank.mp4` is an actual native Studio rehearsal with captured audio. See `docs/COMPLETION_LEDGER.md` for the authoritative wider remaining brief.

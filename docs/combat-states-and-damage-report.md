# Combat states and damage: what the current game actually does

Audit scope: fighter damage receiver, shared damage admission, type table, status lifecycle, AI perception and native player status presentation in this checkout. This is a code audit, not a claim that every authored move was playtested. Numbers below are calculated examples with neutral mood, no attacker buffs and no explicit resistance overrides unless stated.

## Gamer explanation

A damage type tells you what a hit is made of. A status tells you what is happening to your body. An AI intent tells you what the opponent is trying to do. These are separate layers that can overlap: a robot can be searching for you, walking, corroded and low on energy at the same time. Being stunned stops it acting; searching does not.

The same 20-point attack does not necessarily remove 20 health. Bullets first meet passive plating and Might-based toughness. Every hit then meets its type resistance, followed by applicable defenses. PowerWorld guard spends energy to stop admitted damage. Personal armor and equipment shields absorb the remainder before health. Frozen targets can take a shatter bonus. A searching target has no special damage multiplier simply because it is searching.

## Damage types

| Type | Actual rule | How to read it in play |
|---|---|---|
| Physical | Default for strike/slam metadata; normal resistance 1.0. Unguarded physical damage at least 18 can open bleeding. | Punches and impacts can wound flesh and launch bodies. Might normally changes knockback, not generic punch damage resistance. |
| Ballistic | Normal resistance 1.0, plus passive plate/toughness only when the separate `ballistic` flag is supplied. | A bullet that hurts a person can barely scratch a machine. |
| Energy | Default if no type, ballistic flag, strike or slam is specified; normal resistance 1.0. | Beams/blasts usually avoid the bullet-only plate/toughness filter. |
| Fire | Metal 0.6; fireBlood 0.35; otherwise 1.0. | Fire-resistant bodies take less initial and burn-tick damage. Fire type alone does not automatically create a burn stack. |
| Cold | frostResist 0.45, otherwise 1.0. | Cold damage and freeze buildup are separate; a cold-typed hit is not automatically a freeze attack. |
| Toxic | Metal 0; definitions without `person.n` at most 0.25; otherwise 1.0. | Poison/gas damage can be ineffective against synthetic targets. |
| Acid | Metal 1.6; nonmetal with authored armor above zero 1.4; bare flesh 0.7. Also corrodes passive bullet plate. | Acid is an anti-armor setup and damage tool. |
| Magic | `clamp(1.45 - Resolve × .07, .55, 1.3)`, then ×.5 if warded. | Stronger will reduces magic damage; the hit also steals energy before later defensive pools. |

An explicit `def.resist` entry overrides the derived result. Resolve defaults to 6 in this function. Resolve 5 gives 1.10 magic damage, 6 gives 1.03, 9 gives .82; a warded Resolve-9 target gives .41. Sources: `src/data/damage-types.js`, `src/engine/damage-admission.js`.

## The actual damage pipeline, in order

1. Copies forward damage into the original health pool. Remote fighters leave health authority to their machine. KO and invulnerability reject damage.
2. Attacker mood multiplies damage; an armed mood critical multiplies it by 1.5 and is consumed. Victim mood vulnerability multiplies it again.
3. Downed Second Wind bodies reject everything except a strike worth at least 15 at this stage or a slam. Sleep wakes from positive incoming damage after its .15-second delivery grace.
4. Predator adds ×1.15 against victims below 30% health; attacker size might multiplies; authored air-superiority strikes against nongrounded targets above y=12 multiply by the authored value or 1.45.
5. If `ballistic:true`, subtract passive plate `max(0, (def.armor ?? (metal ? 9 : 0)) - activeCorrosion)`. This is flat mitigation per hit, not spending the personal armor bar. Then, for Strength at least 6, multiply by `max(.12, 1 - (Strength - 5) × .17)`. A result at most .4 is discarded.
6. Multiply by the victim's damage-type resistance. Zero resistance rejects the hit.
7. Magic drains `min(victimKi, admittedDamage × (siphon || .8))`; the caster receives 60% of that drain, capped at their maximum energy. Infinite-energy definitions cannot be siphoned. Acid refreshes corrosion to at least `corrodeDur || 5` seconds and adds `corrode || 3` plate reduction, capped at 12.
8. A validated local nanite-panel contact can intercept damage and spend cell integrity. This requires native contact metadata, not merely equipping nanites.
9. PowerWorld/open-sky guard buys damage with energy when facing the source, unless unblockable, true damage, phased, charging energy or staggered. Default cost is 1 energy per admitted HP for every family; authored rates clamp to .25–4; strong guard multiplies cost by .55. Barrier guard covers all directions; ordinary guard accepts facing dot product greater than -.15. An empty tank lets unpaid damage through.
10. Personal armor absorbs `min(currentArmor, remainder × .55)`. Initial capacity is `(def.armor || 0) + (metal ? 26 : 0)` and it repairs at 14% capacity per second after more than five calm seconds. Equipment shield then absorbs the remainder up to its current shield HP. True damage bypasses both pools.
11. Phase rejects ordinary remaining damage. Charging energy is interrupted by positive hostile damage. Guard consequences drain the meter and can stagger/break guard. In city/non-energy-guard modes, guarded remainder is multiplied by .12 for strikes, authored beam chip (default .22), .5 for other sustained damage, or .42 for impacts; strong guard further multiplies by .55.
12. An unguarded frozen body takes ×1.3 remaining damage from any strike, or a hit with horizontal knockback over 30, and thaws. Health loses the resulting amount; an unguarded hurt fighter gains energy equal to 40% of that amount. Guarded HP chip takes a separate return path without this hurt-energy gain, wound/bleed/stun accumulation or shatter.
13. Unguarded hits apply knockback, wounds/bleed and burst-stun bookkeeping, then resolve lethal damage. `takeDamage` returns the resolved amount, which can exceed actual health lost on an overkill; the hit-outcome object separately reports actual health loss.

Sources: `src/engine/entity.js:873` (`takeDamage`), `src/engine/damage-admission.js`, `src/data/guard-energy.js`, `src/engine/nanite-state.js`. Attack authors often multiply base damage by `powerBuff` before this receiver (for example `src/engine/ability-melee-hit.js`); that is an additional upstream factor.

## Same hit, different targets

These are explicit example profiles, not invented roster statistics. No guard, shields, nanite interception or frozen bonus unless named. Health must be sufficient to avoid overkill.

| Incoming attack | Target | Calculation | HP lost |
|---|---|---|---:|
| 20 bullet | Unarmored Strength-5 person | 20 × 1 | 20 |
| 20 bullet | Metal Strength-10, no authored plate value, personal armor depleted | (20 - 9) × .15 | 1.65 |
| Same bullet | Same metal frame with full personal armor | 1.65 - .9075 armor soak | .7425 |
| Same bullet | Same metal frame, 6 corrosion, personal armor depleted | (20 - 3) × .15 | 2.55 |
| 20 energy | Same metal frame, personal armor depleted | 20 × 1 | 20 |
| 20 fire | Metal, personal armor depleted | 20 × .6 | 12 |
| 20 toxic | Metal | 20 × 0 | 0 |
| 20 acid | Metal, personal armor depleted | 20 × 1.6 | 32 |
| 20 acid | Unarmored person | 20 × .7 | 14 |
| 20 magic | Resolve-5 person, no armor | 20 × 1.10 | 22 |
| 20 magic | Resolve-9 person, no armor | 20 × .82 | 16.4 |
| 20 admitted energy | PowerWorld guard, 12 energy, no armor | 12 energy buys 12; 8 unpaid | 8 |
| 20 physical strike | Frozen unarmored target | 20 × 1.3 | 26 |

For the 22-damage magic example, an adequate tank loses 17.6 energy and the caster receives 10.56. The victim subsequently gains 8.8 from unguarded HP damage, so the immediate net energy loss is 8.8 before regeneration. Magic can also empty energy before the paid-guard stage tries to fund a block.

## Body states, control statuses and resource conditions

The coarse `state` field has `idle`, `move`, `cast`, `hit`, `ko` and a documented `charge` value; most meaningful conditions live in separate flags/timers. Ordinary hit presentation lasts about .22 seconds and cast presentation .28; a `hit` label is not itself the burst-stun timer. Action gates inspect hitstop, stagger, stun, frozen/grab and other conditions separately.

| Condition | Actual effect or trigger |
|---|---|
| Hitstop | Brief impact pause; explicit `hitstop:0` is honored for sustained hits. Distinct from stun. |
| Stagger | Recovery lock; decrements by `dt × ccRecover`. Also used to pin sleep and shock. |
| Guard broken | Guard stops; ordinary break stagger .7, PowerWorld heavy crush .85. Guard is also broken by exhausted paid energy or depleted meter. |
| Stunned | At least 24% max HP admitted on the unguarded path in a real rolling two-second damage window. Not applied to dummies. Stops actions, cancels flight/guard/charge and releases own grab. Four seconds stun immunity after recovery. |
| Frozen | Frost reaches 1.0; buildup decays .25 per second when not frozen. Frost-resistant definitions receive ×.45 buildup. Freeze timer is `clamp(2.6 - Strength × .17, .8, 2.6)` and decays at `ccRecover` rate. Physics can still move the body. Eligible tele-escape consumes 20 energy and avoids encasement. Thaw grants .4 invulnerability and 2.5 refreeze immunity. |
| Asleep | Authored sleep duration divided by `ccRecover`; cancels actions and flight. Metal, dummies, frozen bodies and sleep-immune bodies reject sleep. Positive incoming damage wakes after .15-second grace; waking grants three seconds immunity. |
| Shocked | Separate status, not a ninth damage type. Duration is authored duration ×1.6 for metal or ×.55 for flesh, divided by `ccRecover`. Pins stagger and drops flight. Three-second immunity starts on application, not after expiry. |
| Blinded | Timer blocks new AI sight and player target-lock acquisition; memory/search still works. Does not itself multiply incoming damage. |
| Frost / Slowed | Partial frost means approaching freeze. `_chill` is a separate timed movement slow. Neither is a generic damage multiplier. |
| Burning / Poisoned / Gas / Acid DoT | Stored stacks tick through the same receiver and resistances. Reapplying a kind keeps the larger remaining duration and DPS rather than adding DPS together. Different kinds coexist. |
| Bleeding | Up to three stacks. Slash damage at least 4 or physical damage at least 18 can wound on the unguarded path; metal/energy bodies and dummies reject bleeding. Horizontal speed above 8 costs 1.1 HP/s per stack; above 26 costs 2.31 per stack, before applicable receiver factors. Four still seconds clot it. Tick metadata bypasses guard and personal defense pools. |
| Corroded | Temporarily lowers passive bullet plate by stacked corrosion, max 12. It does not directly shrink armor-bar capacity. |
| Zoned wounds | An unguarded hit at least 16% max HP adds a derived injury to arm/leg/torso, up to three per zone. Leg wounds reduce movement 9% each; torso wounds reduce energy regeneration 7% each. They decay separately from ordinary hit reactions. |
| Grab startup / holding / grabbed / clinch | Separate melee-control state. A hit can cancel grab startup and release a holder; victims cannot freely act while held. |
| Launched / thrown | Timed physics consequence; hard geometry impacts can add slam damage. Not equivalent to stunned or KO. |
| Blocking / phase / invulnerable | Defense flags; their ordering and bypass rules differ, as above. |
| Charging / casting / cooldown / reloading | Actions and readiness restrictions, not elemental statuses. Charging energy removes effective guard and hostile damage interrupts it. |
| Drained | Energy-loss feedback timer, including empty-tank events; not a blanket extra incoming-damage multiplier. |
| Power boost / sprint / transformed | Buff or form context; can alter attack/movement statistics. |
| Downed Second Wind | Only explicit `secondWind:true`, local human, unused eligibility. Lethal hit instead leaves 1 HP and 2.4-second rally window. Not the default death behavior. |
| KO / respawn | No normal damage admission. KO cancels combat states and creates ragdoll; permitted respawn resets state and provides invulnerability. |
| Grounded / walking / flying / gliding / hanging / transport | Movement/attachment context; may constrain actions, affect fall/launch outcomes or enable an authored air-superiority bonus. |

Status sources: `src/engine/entity.js:721`, `:785`, `:821`, `:838`, `:1180`, `:1198`, `:1383`, `:1489`, `:1553`, `:2240`; `src/engine/burst-window.js`; `src/engine/player-status.js`; `src/engine/abilities.js:42`. Wound/control details also live in `src/engine/game.js` and `src/engine/melee.js`.

## What SEARCHING means

The city AI has belief/perception fields rather than one combined combat-state enum. Sight creates a remembered point for four seconds; radio for three; noise for 2.2. Without sight it travels toward the remembered point, sweeps its aim, searches nearby after the trail goes cold, then patrols more widely after about nine search seconds. It does not fire normal slot attacks from this no-sight branch. With sight it reacquires, turns toward the target at a bounded rate and waits a reaction interval before being ready to attack. Difficulty changes reaction/steadiness rather than granting a search damage bonus.

`CONTACT`, `TARGET AIRBORNE`, `LOST VISUAL · SEARCHING`, `CONTACT LOST` and `CONTACT REACQUIRED` are squad-report labels, not bodily ailments. Range-holding, strafing, retreating at low HP, flanking when stuck and cruise-punch approach are decisions/movement intents. A physical control lock can prevent an intended action. Sources: `src/engine/ai.js:125`, `:144`, `:322`; `src/engine/squad-reports.js`.

## Implementation mismatches and gaps worth fixing or documenting

- **Stun recovery applies once.** `applyStun` initializes `1.7 / ccRecover` simulation seconds; update subtracts `dt`. At recovery 2 it lasts .85 seconds, followed by four seconds of stun immunity. Hitstop pauses the character update. Freeze, sleep and shock retain their own timing rules. Regression coverage checks recovery .5, 1 and 2 at 30/60/120 Hz.
- **Phase is late.** Magic siphon, acid corrosion and personal armor/shield depletion can happen before phase rejects HP damage. The phase comment promises pass-through; the actual ordering does not promise no side effects. Invulnerability, by contrast, rejects early.
- **True damage is not universally unmodified damage.** It bypasses personal pools, phase and PowerWorld guard but still passes mood, type resistance, magic/acid effects and other earlier logic. City guard can still affect a true-damage hit if it is not separately unblockable. Bleeding supplies both flags.
- **Ballistic type and ballistic processing are separate metadata.** `dtype:'ballistic'` alone does not trigger passive plate/toughness; `ballistic:true` does. Native bullet call sites must consistently supply the flag. The type badge alone cannot prove this treatment.
- **Status display can describe an immune DoT.** `addDot` does not reject resistance-zero targets before storing/showing the stack; its eventual tick is resisted by the receiver. A metal body can therefore carry a displayed poison stack that loses no health.
- **Sleep wake precedes defense.** An incoming positive hit can wake a sleeper even if plate/resistance later stops all HP damage. The literal rule is incoming damage, not health lost.
- **Shatter is broader than “heavy hits.”** Any `strike:true` hit shatters frozen targets; no heavy flag or minimum damage is required. The user-facing hint is narrower than the implementation.
- **Summoned drones are not full fighters.** `src/engine/summons.js:51` uses a separate reduced receiver with fixed toxic 0, fire .6, acid 1.6, cold .85 and ballistic .9; it defaults unspecified dtype to energy, lacks fighter plate/guard/mood/status logic, and does not itself implement the corrosion promised by its nearby comment. “Every target uses the same complete pipeline” would be inaccurate.
- **AI target-choice comment overstates its sight filtering.** The personality candidate list checks life, foe, distance and `_vis`, then actual cone/line-of-sight is tested only for the selected candidate. The comment says candidates are actually seen; that is not directly enforced there. The search branch still follows belief rather than reading the unseen target position as its movement goal. This needs a focused behavior test before stronger fairness claims.

These findings are documentation from the current receiver and its call paths. They are not all proposed changes: changes to timing, guard mode parity, phase or summon behavior require deliberate gameplay decisions and regression coverage.

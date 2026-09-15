# Character rules and personality audit — 2026-09-15

## Finding

There are **55 roster characters, eight combat AI styles, twenty defined psyche personalities, and eight personalities actually assigned through derivation**. No roster character has an explicit `personality` field. These are separate systems: AI style prioritizes actions; personality selects targets and weights emotional appraisal. Therefore “exactly eight personalities” currently describes the used subset, not the full defined catalog. Do not delete the unused twelve or rename combat styles as personalities without a design decision.

Executable evidence: `node tools/audit-character-rules-personality.mjs` imports the actual ROSTER, constructs production AI instances, calls production derivePersonality, and writes `docs/reports/character-rules-personality-2026-09-15.json`. Every character assignment is included there. This is a data/constructor audit, not full bot behavioral playtesting.

## Eight combat styles

| Style | Characters | Existing action selection |
|---|---:|---|
| Artillery | 6 | Long-range meteor/bow/charge; close-range cone/dash/melee |
| Beamer | 5 | Beam/rifle/projectile at distance; melee/cone when close |
| Bruiser | 9 | Melee/rush/cone close; charge/beam/projectile far |
| Grappler | 3 | Close lifedrain/tentacle/melee/rush; teleport/dash to close distance; grab handled by melee layer |
| Rusher | 9 | Dash/teleport to approach; rush/melee close |
| Summoner | 2 | Prefer summon/construct, close cone/dash |
| Trickster | 7 | Low-health phase/teleport, portal opportunities, range-dependent attacks |
| Zoner | 14 | Construct/summon/mine chances, ranged pressure, close defensive attacks |

Source: `src/engine/ai.js`, constructor and ability-selection switch. Choices still obey available kit, cooldown, energy, unlocks, and special gates. Sharing a style does not make two characters identical.

## Eight used psyche personalities

| Personality | Characters | Target preference |
|---|---:|---|
| Challenger | 12 | Highest current HP |
| Guardian | 2 | Highest damage dealt |
| Predator | 3 | Lowest current HP |
| Professional | 4 | Highest damage dealt |
| Prover | 1 | Highest current HP |
| Tactician | 20 | Highest damage dealt |
| Wildcard | 7 | Random candidate |
| Zealot | 6 | Highest current HP |

Other defined personalities, currently unused by this roster: Bully, Opportunist, Scavenger, Closer, Rival, Coward, Merciless, Avenger, Sentinel, Finisher, Madman, Vulture. All twenty definitions, numeric IDs, target rules, bias and drive weights are retained in executable JSON.

Personalities also change weights for dominance, safety, duty, glory, vengeance, order and purpose. Events appraise those drives; emotions select mood effects. Production psyche exposes damage/cooldown and other mood modifiers, and movement consumes mood speed. These are not eight bespoke animation sets or eight separate behavior trees.

Important implementation boundary: the AI comments claim visible-only targeting, but its candidate filter uses `_vis > 0.4`, alive/foe/distance before later checking the chosen target against the bot's own cone/line of sight. Do not equate that candidate filter with proven per-bot visibility. This audit does not claim that wider perception behavior has been tested.

## Seven public stats and eight damage types

Public names from ATTR_DEFS: **Fighting, Agility, Strength, Resilience, Intelligence, Perception, Mental**. Internal keys remain fgt/agl/mgt/vig/int/awr/res for compatibility. Fighting advertises strike damage; Agility evade recovery; Strength knockback/throws/slams; Resilience HP/durability; Intelligence ability/gadget cooldown; Perception vision; Mental energy/guard/status recovery. These are public descriptions, not the complete damage formula.

Damage registry: **Physical, Ballistic, Energy, Fire, Cold, Toxic, Acid, Magic**. Acid is an actual separate damage type. Poison/gas are Toxic damage-over-time kinds, burn is Fire, acid DoT is Acid. “Armor piercing” is a penetration behavior, not a ninth damage type. Damage type alone does not imply that a corresponding status was applied.

## Distinct states and flags

| Term | Actual meaning / field |
|---|---|
| Stagger | Short action/movement interruption, `staggerT`; recovery uses `sheet.ccRecover`. Not the same as a full stun. |
| Guard break | Guard-depletion, energy-exhaustion or heavy-crush outcome; `guardBreakT` accompanies stagger. Active guard is cleared. Dedicated HUD “Guard broken” is available. |
| Stun | `stunT`; applyStun sets 1.7 / recovery seconds, cancels guard/charge/grab and flight, so a flying victim falls. Countdown is elapsed time, not divided by recovery twice; later immunity prevents immediate restun. |
| Hitstop | Brief impact freeze, `hitstop`; fighter update returns before normal movement/action advancement. It is presentation/timing feedback, not a debuff icon or guard break. |
| Blinded | `blindT`; bot acquires no fresh sight, retains aging belief. HUD identifies blindness and lock unavailability. It does not itself pin limbs. |
| Shocked | `shockT`; electrical disable repeatedly pins stagger, cancels flight while active. Distinct from ordinary Energy damage and from burst stun. |
| Reloading | `_firearmReload`, weapon-local timeline; consumes time then transfers reserve ammo. Pauses during hitstop and cancels on interruption. Not a negative status effect. |
| Charging | Multiple explicit actions: meleeCharge, chargingKi, or slot.charging/chargeT. A generic “charging” label must say which action owns it. |
| Casting / firing | Ability-specific active/sustaining/building/drawing states; no universal `castingT` should be invented. Current HUD distinguishes ALIGNING/FIRING/CHARGING/COOLDOWN. |
| Blocking | Active `guarding` flag; normalized guard meter is not armor HP. |
| Equipment shield | `_shieldHp` separate absorbable pool, already a labeled effect. |
| Armor / resistance | Damage reduction/admission rules; not represented by simply relabeling guard as armor. Clothing is not evidence of armor. |
| Intangible | `phase`; defensive state separate from blocking/shield. |



## HUD evidence and proposed labels

Existing design evidence is substantial: root `DESIGN.md` adopts creator-approved **Impact C**; `docs/design/ui-direction/README.md` records generated concept provenance. It expressly says concepts are not runtime implementation. `COMBAT_HUD_DENSITY_PASS.md` and `TARGET_HUD_CLARITY_PASS.md` describe implemented compact status layout and verification. `INVENTORY_UI_CAMERA_DECISIONS_2026-09-14.md` is another relevant handoff. These files prove design/history exists; they do not establish that a particular unidentified external AI delivered a new working HUD.

Runtime `player-status.js` explicitly says guard is normalized, never an armor pool. `player-status-view.js` currently labels the meter GUARD and already distinguishes equipment shield. Root DESIGN requires ARMOR HIT versus BLOCK versus GUARD BREAK based on resolved outcomes, not costume.

Small recommended fixes, without gameplay changes in this audit:

1. Label style **Combat style** and psyche **Personality** separately in roster/Studio; show derived versus explicit assignment.
2. Explain “8 used / 20 defined” rather than saying “eight personalities” without scope.
3. Keep Guard as Guard until a separate armor value is displayed; do not rename it Defense and imply one universal pool.
4. Show “Melee charge”, “Energy recharge”, “Ability charging”, and “Reloading” in their owning action UI.
5. Replace remaining public “Resolve” / “Awareness” / “Might” prose with Mental / Perception / Strength where they describe the current stats. Preserve internal keys.

No gameplay files changed. No personality assignments or balance were silently altered.

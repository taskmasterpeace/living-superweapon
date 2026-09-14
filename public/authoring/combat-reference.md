# Power World combat reference

Generated 2026-09-14T08:04:38.735Z

Base definitions, before runtime progression, buffs, wounds and mode modifiers. Rank lift is the rank-table reference, not a substitute for runtime liftCapacityOf.

## Attributes

- **Fighting**: melee & strike damage
- **Agility**: evade recovery
- **Might**: knockback resistance · throws · slams
- **Vigor**: health pool · durability
- **Intellect**: ability & gadget cooldowns
- **Awareness**: vision range
- **Resolve**: ki & guard recovery · status recovery

## Attack timing

Times are base seconds; runtime pace and overrides apply. Damage is pre-resolution.

| Move | Startup | Active | Recovery | Base damage |
|---|---:|---:|---:|---:|
| JAB | 0.1 | 0.06 | 0.14 | 4 |
| CROSS | 0.16 | 0.07 | 0.22 | 8 |
| POWER | 0.34 | 0.09 | 0.4 | 18 |
| GRAB | 0.18 | 0.1 | 0.3 | 0 |

## Roster base attributes

| Character | Style | Fighting | Agility | Might | Vigor | Intellect | Awareness | Resolve | Charge rate | Recovery rate |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| SOL | MUAY THAI | 7 | 5 | 8 | 6 | 4 | 4 | 6 | 1.2 | 1.03 |
| KANO | ACROBATIC | 6 | 6 | 7 | 5 | 4 | 5 | 7 | 1 | 1.06 |
| VEGAS | MUAY THAI | 6 | 5 | 7 | 6 | 3 | 5 | 7 | 1.2 | 1.06 |
| AURUM | BOXING | 4 | 6 | 5 | 6 | 5 | 5 | 7 | 1 | 1.06 |
| NOVA | BOXING | 4 | 5 | 5 | 5 | 3 | 5 | 7 | 1 | 1.06 |
| RIME | BOXING | 3 | 6 | 5 | 5 | 5 | 5 | 7 | 1 | 1.51 |
| VOLT | BOXING | 5 | 8 | 4 | 5 | 3 | 4 | 6 | 1 | 1.03 |
| WARDEN | MUAY THAI | 7 | 5 | 7 | 7 | 4 | 4 | 6 | 1.2 | 1.48 |
| HIVE | BOXING | 3 | 5 | 3 | 5 | 6 | 5 | 7 | 1 | 1.06 |
| PYRE | MUAY THAI | 6 | 6 | 8 | 6 | 3 | 5 | 6 | 1 | 1.03 |
| TORCH | BOXING | 5 | 7 | 5 | 5 | 3 | 4 | 7 | 1 | 1.06 |
| APEX | JUDO | 7 | 7 | 9 | 7 | 3 | 4 | 6 | 1 | 1.03 |
| SPECTER | ACROBATIC | 6 | 7 | 6 | 6 | 3 | 5 | 7 | 1 | 1.51 |
| VANGUARD | POWER GRAPPLING | 8 | 6 | 10 | 7 | 3 | 4 | 6 | 1.2 | 1.48 |
| KRAKEN | WRESTLING | 7 | 5 | 9 | 7 | 3 | 4 | 6 | 1.2 | 1.03 |
| RIFT | ACROBATIC | 3 | 7 | 3 | 5 | 4 | 5 | 7 | 1 | 1.06 |
| TITAN | POWER GRAPPLING | 6 | 4 | 9 | 9 | 5 | 6 | 9 | 1 | 1.12 |
| SARGE | MILITARY CQC | 6 | 4 | 5 | 6 | 7 | 6 | 5 | 1 | 1.00 |
| MERC | MILITARY CQC | 4 | 6 | 5 | 6 | 7 | 6 | 6 | 1 | 1.03 |
| KIVULI | ACROBATIC | 3 | 7 | 4 | 5 | 6 | 4 | 7 | 1 | 1.06 |
| GALE | MILITARY CQC | 5 | 6 | 4 | 5 | 6 | 6 | 5 | 1 | 1.00 |
| KING STEFANOS | BOXING | 4 | 6 | 6 | 6 | 3 | 5 | 7 | 1 | 1.51 |
| SANDRA | JUDO | 6 | 5 | 5 | 5 | 7 | 9 | 5 | 1 | 1.00 |
| IRONCLAD | MUAY THAI | 4 | 5 | 7 | 8 | 5 | 6 | 7 | 1 | 1.06 |
| RAGE | POWER GRAPPLING | 8 | 6 | 10 | 10 | 3 | 4 | 5 | 1.2 | 1.00 |
| STORMCALL | MILITARY CQC | 7 | 5 | 9 | 7 | 4 | 4 | 7 | 1.2 | 1.06 |
| WEBLINE | WRESTLING | 6 | 5 | 7 | 5 | 4 | 4 | 6 | 1 | 1.03 |
| RIPCLAW | MILITARY CQC | 6 | 4 | 7 | 7 | 4 | 4 | 5 | 1 | 1.00 |
| MAJESTY | MUAY THAI | 7 | 6 | 10 | 6 | 3 | 5 | 7 | 1 | 1.51 |
| MAELSTROM | ACROBATIC | 3 | 7 | 4 | 5 | 5 | 5 | 8 | 1 | 1.09 |
| ONYX | MILITARY CQC | 6 | 6 | 7 | 6 | 4 | 4 | 6 | 1 | 1.03 |
| CHAINFIRE | WRESTLING | 6 | 5 | 7 | 7 | 4 | 4 | 6 | 1 | 1.48 |
| TEMPEST | BOXING | 3 | 6 | 5 | 5 | 3 | 5 | 7 | 1 | 1.06 |
| KNIGHTFALL | BOXING | 6 | 5 | 6 | 6 | 8 | 4 | 5 | 1 | 1.00 |
| AEGIS | WRESTLING | 7 | 6 | 10 | 7 | 3 | 4 | 6 | 1.2 | 1.48 |
| OLYMPUS | MUAY THAI | 7 | 6 | 9 | 7 | 3 | 4 | 7 | 1.2 | 1.06 |
| MARSHAL | ACROBATIC | 6 | 7 | 7 | 7 | 3 | 4 | 7 | 1 | 1.51 |
| CIRCUIT | MUAY THAI | 5 | 4 | 7 | 9 | 5 | 6 | 9 | 1 | 1.12 |
| TRENCH | MILITARY CQC | 6 | 4 | 8 | 7 | 6 | 4 | 6 | 1.2 | 1.03 |
| DECIBEL | BOXING | 6 | 7 | 5 | 5 | 3 | 4 | 6 | 1 | 1.03 |
| COLDSNAP | BOXING | 3 | 6 | 5 | 5 | 6 | 6 | 6 | 1 | 1.03 |
| CRUCIBLE | POWER GRAPPLING | 8 | 4 | 9 | 9 | 5 | 5 | 6 | 1.2 | 1.03 |
| TALON | BOXING | 6 | 5 | 5 | 5 | 6 | 4 | 6 | 1 | 1.03 |
| ABEO | POWER GRAPPLING | 8 | 4 | 9 | 10 | 4 | 4 | 6 | 1.2 | 1.48 |
| JELANI | MUAY THAI | 7 | 8 | 9 | 6 | 3 | 4 | 6 | 1 | 1.03 |
| KAMARIA | ACROBATIC | 6 | 8 | 5 | 5 | 3 | 4 | 7 | 1 | 1.51 |
| RAMIRO | BJJ | 6 | 6 | 7 | 7 | 8 | 5 | 5 | 1 | 1.45 |
| JAWAH MATU | ACROBATIC | 6 | 8 | 6 | 6 | 3 | 4 | 7 | 1 | 1.51 |
| MOSES APIO | ACROBATIC | 4 | 6 | 7 | 7 | 6 | 4 | 6 | 1 | 1.03 |
| DUNE | BJJ | 4 | 4 | 6 | 6 | 6 | 5 | 7 | 1 | 1.06 |
| GRAVEN | ACROBATIC | 4 | 5 | 6 | 6 | 4 | 5 | 7 | 1 | 1.06 |
| BULWARK | POWER GRAPPLING | 8 | 4 | 9 | 10 | 8 | 4 | 7 | 1 | 1.51 |
| FERAL | MILITARY CQC | 6 | 8 | 8 | 7 | 3 | 4 | 6 | 1 | 1.03 |
| BREACH | MILITARY CQC | 7 | 5 | 5 | 7 | 7 | 5 | 5 | 1 | 1.00 |
| RECON | MILITARY CQC | 5 | 6 | 6 | 5 | 6 | 6 | 6 | 1 | 1.03 |

## Damage and defense

- **PHYSICAL** (physical): Fists, slams, thrown cars. The baseline — almost nothing resists it.
- **BALLISTIC** (ballistic): Bullets. Meets ARMOUR then TOUGHNESS — lethal to people, an annoyance to superweapons.
- **ENERGY** (energy): Ki blasts and beams. The universal currency; few resistances.
- **FIRE** (fire): Heat damage. Flame payloads also burn over time; metal and fire-blooded fighters resist fire.
- **COLD** (cold): Cold damage. Attacks marked FREEZE also build frost or encase the target. Frost-resistant fighters take less cold damage.
- **TOXIC** (toxic): Poison and gas. Needs a metabolism — machines are immune.
- **ACID** (acid): CORRODES ARMOUR for its duration. Weak on bare flesh, devastating on a plated chassis.
- **MAGIC** (magic): Attacks the WILL and SIPHONS energy — drains their ki straight into the caster. Resisted by RESOLVE.

The complete ordered receiver audit is in docs/combat-states-and-damage-report.md. Guard, equipment shields, personal armor, resistance and health are different layers. Attack damage is not final HP loss. Stun, stagger, frozen and sleep use simulation timers, not clip length. The full JSON includes base derived multipliers and per-character resistance multipliers.

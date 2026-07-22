# LIVING SUPERWEAPON — Roster Bible

The Threshold universe ("Consequences of Failure" alternate timeline). Every fighter is a
**living superweapon** registered — or unregistered — under the Living Superweapon Threshold Treaty,
and rated on the **Dewitt LeFevre Threat Scale**.

## The LeFevre Threat Scale

| Level | Meaning | In-game color |
|---|---|---|
| **Low** | Minimal danger to society. Useful gifts, not weapons — or no gifts at all, just training and gear. | green |
| **Moderate** | Could defend or harm. Watchlisted. | gold |
| **High** | Can cause significant harm or disrupt order. Registration mandatory. | orange |
| **Very High** | Difficult to defend against; catastrophic if irresponsible. Treaty-capped. | red |
| **Extreme** | Nearly impossible to defend against; global/universal consequences. One per bloc, if that. | pulsing red |

Every hero's threat badge shows on the character select. Strength (1–10) is the physical stat:
it scales melee damage, shrugs off knockback, and breaks you out of ice faster. Overdrive (0.6–1.6)
is the comeback attribute: when your ki tank is low/drained, landed fists convert damage into ki.

## The Twenty

| Hero | The Equivalent | Country / Voice | Threat | STR | Overdrive | Signature |
|---|---|---|---|---|---|---|
| **SOL** | Superman × Goku — the solar standard | USA (Kansas drawl) | Very High | 8 | 1.3 | Heat Ray, Arctic Breath (freezes solid), Sky Smash |
| **KANO** | Goku (pure) — the joyful spirit warrior | Japan | Very High | 6 | 1.3 | Wave Cannon charge beam, Instant Transmission, Spirit Bomb |
| **VEGA** | Vegeta — the proud rival | Japan (imperious) | Very High | 7 | 1.2 | Bakuhatsu volley, Big Bang, Final Flash |
| **AURUM** | Green Lantern — will made solid | USA (test-pilot swagger) | High | 5 | 0.9 | Cursor-steered constructs; **barrier guard** (360°, runs on ki) |
| **NOVA** | Starfire / Captain Marvel — star artillery | Tamaran-analog (regal) | **Extreme** | 5 | 0.9 | Star Lance, Nova Core, Meteor Storm |
| **RIME** | Iceman / Sub-Zero — the deep cold | Norway | High | 4 | 0.8 | Frost Breath (**encases in ice**), Ice Wall, Absolute Zero; barrier guard |
| **VOLT** | The Flash — fastest alive | USA (motor-mouth) | Moderate | 3 | **1.6** | Mach Sprint THROUGH walls w/ blue lightning wake, 12-hit Lightning Flurry |
| **WARDEN** | Magneto-gravity hybrid — the anchor | Russia (bass rumble) | High | 8 | 1.1 | Force Push, Singularity, Collapse; heavy-only melee |
| **HIVE** | Swarm summoner — the conclave | Brazil | Moderate | 3 | 0.7 | Drone swarms, Sentinel, Overmind |
| **PYRE** | Human Torch × Magma — walking eruption | Mexico | Very High | 7 | 1.2 | Fireballs, Flamethrower, Rain of Fire; frost-immune |
| **TORCH** | Human Torch (flyer) — flame on | USA (cocky kid) | High | 4 | 1.3 | Flame Jet, thorns (burns grabbers), Supernova; frost-immune |
| **APEX** | Cell — the perfect predator | Lab-grown (layered voice) | **Extreme** | 8 | 1.4 | Kamehameha, absorbing throws, Regenerate |
| **SPECTER** | Vision — density control | Synthezoid (calm) | High | 6 | 1.0 | Phase intangibility, Density Punch, Max Density |
| **VANGUARD** | Superman (pure) — the invincible | USA (broadcast baritone) | Very High | **9** | 1.5 | Flying Tackle, Laser Vision; **deflect guard** (bullets bounce back); haymaker-only melee |
| **KRAKEN** | Doc Ock × deep-sea horror — the abyss | Ghana (coastal) | Very High | 8 | 1.4 | 4 living tentacles: seize → drag → **wall slam**; absorb throws |
| **RIFT** | Portal-gun tactician — the doorbreaker | South Korea | High | 3 | 0.8 | Orange/blue door pairs — fighters AND projectiles pass through |
| **TITAN** | War Machine / Sentinel — the war engine | Germany (vocoded) | High | **9** | 0.6 | Twin Cannon, **Pulse Rifle**, metal armor (sparks, kb-resist), deflect guard |
| **SARGE** | Punisher × Captain America kit — the last soldier | USA (gravel) | **Low** | 4 | 1.0 | Pulse carbine, hand cannon, plasma blade, riot shield, Airstrike, Combat Leap |
| **KIVULI** | Gas-phase controller — the breath of Kampala | **Uganda** (Luganda-accented) | High | 4 | 0.9 | Choking Veil (lingering gas), **Solid Smoke** (gas → hard wall), Gas Form, Asphyxia |
| **GALE** | Hawkeye / Green Arrow — the last ranger | UK (dry wit) | **Low** | 3 | 1.1 | Draw-scaled Longshot, switchable broadheads (poison/flame/explosive), Arrow Storm |

### Palette note — KIVULI
Designed as "the purple gas controller." The house rule (global CLAUDE.md) bans purple absolutely,
so he ships in **crimson-rose bloom** (`#d64a72` family, hue ~345). If the designer overrides his own
rule, swap the three hexes in `data/characters.js` — everything else (gas DoT, solidify, phase) is color-agnostic.

## Guard type matrix (why blocking is character-expressive)

| Type | Who | Behavior |
|---|---|---|
| `block` (default) | most | Front-arc damage reduction; meter breaks → stagger |
| `deflect` | VANGUARD, TITAN | Front-arc + **projectiles/bullets/arrows reflect back at the shooter** (Superman vs Punisher: his guns feed you ammo) |
| `barrier` | AURUM, RIME | **Omnidirectional** construct bubble; costs ki/sec instead of recharging it |
| `guardStrong` | SARGE | Riot shield modifier: 45% tougher chip + meter on any guard type |

## Melee identity

- `meleeTiers: 3` (default) — jab combo · straight · charged HAYMAKER
- `meleeTiers: 2` — jab · HAYMAKER only (WARDEN, VANGUARD, KRAKEN, TITAN — heavyweights don't throw "medium" punches)
- Haymakers **guard-crush**: the blocker stumbles back staggered. Jabs are **punishable on block**. Grabs still beat guard; strikes still beat grabs.

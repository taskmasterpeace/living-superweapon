# THE CAST — WAR WORLD: ASCENDANTS

**A commissioning brief for portrait art, and a handoff document for the roster.**
Fifty-two fighters. Every line below is read out of the game's own data files — nothing here is invented.

---

## WHERE THIS COMES FROM

| Fact | Source of truth |
|---|---|
| Name, epithet, role, palette, kit, traits, AI doctrine | `src/data/characters.js` (`ROSTER`, 52 entries) |
| Civilian name, home city, country, flag | `src/data/identities.js` (`IDENTITIES`) |
| Origin (how they got their powers) | `src/data/characters.js` `origin:` field, defined in `src/data/origins.js` |
| Silhouette flourishes — hood, cape, horns, visor, weapons | `src/engine/figure.js` (`BUILDS`) |
| Body proportions | `src/engine/figure.js` (`frameOf`), derived from `strength` |
| Personality / resting temperament | `src/data/psyche.js` (`derivePersonality` → `DRIVE_WEIGHTS`) — **derived, not authored** |

**Rules this document follows.**

- **No stat numbers in the character entries.** Proportion multipliers appear exactly once, in the frame table below, because a portrait artist needs them.
- **Nothing is guessed.** Where a field is absent the entry says *not specified*. The last section names every gap.
- **Pronouns.** Where a fighter's own blurb uses a pronoun, this document uses it (26 of the 52 do). The rest are they/them. That absence is a gap in the data, not a statement about the character.
- **No purple** anywhere except **KIVULI**, who is the single ruled canon exception (creator ruling, 2026-07-22). Four other palettes contain hues in the violet band; they are **flagged, not described**, in the gaps section and again at the character.

---

## THE HOUSE STYLE — what all fifty-two share

Every Ascendant is the **same procedural figure** re-proportioned and re-coloured. An artist should treat the shared anatomy as a costume-design constraint, not as a starting sketch to be discarded.

**The body.** A capsule chest that tapers, a real neck, a jaw, a spherical head at roughly heroic proportion (a touch small), deltoid caps sitting on top of the shoulder joints so the shoulders read solid from above, two-bone arms (upper / forearm / a faceted glove-fist), and **two-bone legs with a genuine knee** — hip cap, kneecap, shin, boot with a toe. Nothing is a mannequin: the knee bends, the jaw is separate, the fists are faceted like gloves rather than smooth.

**Scale.** The world is true 1:1 — one game unit is about 0.19 m, and the base figure stands about 1.8 m before the frame multiplier is applied.

**The chest emblem** is a plain disc, glowing, in the accent colour. Every fighter has one. **The belt** is a glowing ring at the hips, same colour, dimmer.

**Eyes** are two small spheres in the accent colour — so a fighter's eyes are the same colour as their energy. Behind a visor they are hidden entirely.

**The aura** is an additive shell wrapping the torso in the accent colour, invisible at rest and swelling as power rises. At power-tier crossings the whole aura ladders **accent → gold → white-hot**, so the same character reads hotter as a fight goes on.

**The guard shell** is a visible curved energy plate in front of the body while blocking — **gold** for the deflect guards, pale blue for everyone else, and a **full 360-degree bubble** rather than a front plate for the barrier guards. It flashes on a block and reddens as it nears breaking.

**The rim light** is not generic. Each fighter is edge-lit in **their own accent colour**, cooled a little more than half of the way toward the scene's cold back-light (`#bcd8ff`). A hero separates from a grey street in their own colour.

**The ground marker** sits under everyone and is the whole state display: a soft contact shadow, an **altitude-band ring** (green on the ground, gold at building height, cyan in the sky, white in the clouds), a **bright wedge at the front showing exactly where they are looking**, and a **state ring** that recolours — blue guarding, green grabbing, orange and swelling while a haymaker winds up, white on a committed strike, red while staggered. Airborne, a graduated vertical tether drops to the ground column beneath them.

**A frozen fighter** is encased in a faceted pale-blue ice shell. **RIME alone** rides a solid frozen board while flying.

### How to read a palette

The four (sometimes five) colour slots each paint specific meshes. This mapping is fixed for all fifty-two:

| Slot | What it paints |
|---|---|
| **primary** | The suit — chest and both upper arms, including the deltoid caps. The dominant colour of the figure. |
| **secondary** | Trousers and both legs, **the hair**, and **every hard piece**: helmet, pauldrons, gauntlets, collar, horns, hood, mane, coat skirt, headband, back tanks, shield, and the bodies of any firearm. |
| **accent** | Everything that **glows**: chest emblem, belt, glove-fists, boots and toes, eyes, visor bar, head crest, wings, gauntlet bands, tank hose, aura, and the **blades of energy weapons** (sword, knife, spear, axe head). |
| **skin** | Head, jaw, neck, forearms. |
| **cape** | Its own colour, on the seven who have one — a broad sheet hanging off the upper back. |

**One important exception:** if a fighter is flagged `metal`, the skin slot is **discarded** — head, jaw, neck and forearms are rendered in the *secondary* colour at high metalness. **A metal fighter has no visible flesh anywhere.** That applies to TITAN, IRONCLAD, CIRCUIT, FOUNDRY and ABEO.

**A helmet hides the hair. A hood hides the hair. A visor hides the eyes.**

### The frame ladder

Proportions are derived from a fighter's strength. These are multipliers on the base figure — the single place numbers appear in this document, because they are the brief.

| Tier | scale | bulk | shoulders | head | neck | leg span | Who |
|---|---|---|---|---|---|---|---|
| **COLOSSAL** | 1.20 | 1.42 | 1.34 | 0.84 | 1.50 | 1.28 | RAGE (alone) |
| **HEAVY** | 1.12 | 1.28 | 1.24 | 0.90 | 1.34 | 1.18 | SOL, WARDEN, APEX, VANGUARD, KRAKEN, TITAN, STORMCALL, MAJESTY, AEGIS, OLYMPUS, MARSHAL, CIRCUIT, TRENCH, FOUNDRY, ABEO, JELANI, BULWARK |
| **POWERFUL** | 1.06 | 1.15 | 1.13 | 0.94 | 1.18 | 1.09 | VEGA, PYRE, ONYX, CHAINFIRE, MOSES, FERAL |
| **STANDARD** | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | KANO, AURUM, NOVA, SPECTER, STEFANOS, WEBLINE, RIPCLAW, KNIGHTFALL, TALON, KAMARIA, RAMIRO, JAWAH, DUNE, GRAVEN |
| **LIGHT** | 0.97 | 0.90 | 0.96 | 1.03 | 0.92 | 1.00 | RIME, TORCH, SARGE, KIVULI, SANDRA, MYSTWARD, TEMPEST, DECIBEL |
| **SLIGHT** | 0.92 | 0.79 | 0.90 | 1.09 | 0.84 | 0.94 | VOLT, HIVE, RIFT, GALE, COLDSNAP |
| **METAL overlay** | — | ≥1.22 | ≥1.20 | ≤0.90 | ≥1.32 | — | IRONCLAD (the only one it actually moves) |

Read the tiers as words: **COLOSSAL** is a wall of muscle with a small head on a neckless trunk and a wide stance. **HEAVY** is a genuine heavyweight. **SLIGHT** is short, wiry, with a proportionally larger head. **STANDARD** is the unmodified figure.

> **A known defect, reported not worked around.** `frameOf` contains three archetype overlays meant to override the strength tier — a speedster/archer trim, a giant boost, a child shrink. All three regexes contain a **literal backspace byte (0x08) where `\b` was intended**, so they can never match and **none of them currently fires**. The live proportions in the table above are strength-driven only. If those overlays are repaired, the archer GALE and the speedster VOLT get leaner and shorter still, and MOSES and BULWARK get taller — no other fighter changes. Portrait art commissioned from the table above will not go stale.

---

## THE INDEX — all fifty-two at a glance

| # | Name | Epithet | Origin | One-word look |
|---|---|---|---|---|
| 1 | SOL | Man of Sunlight | altered | Caped |
| 2 | KANO | Spirit Warrior | spiritual | Headbanded |
| 3 | VEGA | Fallen Prince | alien | Regal |
| 4 | AURUM | The Willbearer | tech | Emerald |
| 5 | NOVA | Star Sovereign | alien | Visored |
| 6 | RIME | The Deep Cold | mutated | Frostcrested |
| 7 | VOLT | The Overclock | altered | Wiry |
| 8 | WARDEN | Gravity Anchor | mutated | Spiked |
| 9 | HIVE | The Conclave | tech | Tanked |
| 10 | PYRE | Living Wildfire | mutated | Blazing |
| 11 | TORCH | The Human Flame | altered | Flamecrested |
| 12 | APEX | The Perfect Being | altered | Verdant |
| 13 | SPECTER | The Synthezoid | robotic | Hooded |
| 14 | VANGUARD | The Invincible | alien | Armoured |
| 15 | KRAKEN | The Abyss Given Form | symbiotic | Tentacled |
| 16 | RIFT | The Doorbreaker | mutated | Slight |
| 17 | TITAN | The War Engine | robotic | Chassis |
| 18 | SARGE | The Last Soldier | skilled | Kitted |
| 19 | KIVULI | The Breath of Kampala | mutated | Shrouded |
| 20 | GALE | The Last Ranger | skilled | Bowed |
| 21 | KING STEFANOS | The First Celebrity Superweapon | altered | Statesmanlike |
| 22 | SANDRA | The First Jackal | skilled | Coated |
| 23 | IRONCLAD | The Suit | tech | Lacquered |
| 24 | RAGE | The Monster in the Man | altered | Colossal |
| 25 | STORMCALL | Heir of Thunder | spiritual | Axed |
| 26 | WEBLINE | The Neighborhood Ghost | altered | Lean |
| 27 | RIPCLAW | The Best At What He Does | mutated | Maned |
| 28 | MAJESTY | Higher. Further. Faster. | altered | Winged |
| 29 | MYSTWARD | Keeper of the Seals | spiritual | Cloaked |
| 30 | ONYX | The Kinetic King | tech | Matte |
| 31 | CHAINFIRE | The Debt Collector | spiritual | Horned |
| 32 | TEMPEST | Weather Sovereign | mutated | Pale |
| 33 | KNIGHTFALL | The Night Itself | skilled | Caped-hooded |
| 34 | AEGIS | Daughter of War | spiritual | Shielded |
| 35 | OLYMPUS | The Word Made Lightning | spiritual | Winged-caped |
| 36 | MARSHAL | The Last Son of a Dead World | alien | Longcoated |
| 37 | CIRCUIT | Half Man, All Machine | tech | Welded |
| 38 | TRENCH | King of the Drowned Court | mutated | Speared |
| 39 | DECIBEL | The Cry That Levels Blocks | altered | Plain |
| 40 | COLDSNAP | The Absolute Zero Rule | tech | Goggled |
| 41 | FOUNDRY | The Self-Made Man of Steel | tech | Forged |
| 42 | TALON | The First Sidekick to Outgrow the Shadow | skilled | Knifed |
| 43 | ABEO | Shield of the Hand | mutated | Ironbound |
| 44 | JELANI | Spear of the Hand | altered | Scarlet |
| 45 | KAMARIA | Veil of the Hand | mutated | Veiled |
| 46 | RAMIRO | The Clown-Sheriff | skilled | Painted |
| 47 | JAWAH MATU | The Silence | mutated | Muted |
| 48 | MOSES APIO | The Atlas Protocol | symbiotic | Tendrilled |
| 49 | DUNE | The Walking Sahara | mutated | Sandcast |
| 50 | GRAVEN | The Weight of the World | mutated | Visored-dark |
| 51 | BULWARK | The Living Rampart | altered | Rampart |
| 52 | FERAL | The Reclaimed | altered | Beast |

**Origin split (the grouping used below):** mutated 13 · altered 12 · tech 7 · spiritual 6 · skilled 6 · alien 4 · robotic 2 · symbiotic 2 · **unknown 0**.

---
---

# MUTATED — born different, or changed at the root

*Thirteen. Medicine has to study each one before it can fix them.*

---

## RIME — *The Deep Cold*

- **CIVILIAN IDENTITY** — Rúnar Ísleifsson, Reykjavík, Iceland.
- **ORIGIN** — Mutated. Whatever makes the cold happen was there from the start, or was changed at the root; the data does not narrate it further.
- **WHAT THEY LOOK LIKE** — A **LIGHT** frame: slim, a little short, a slightly larger head. The suit is a bright glacier blue (`#49c4fa`); legs, hair and armour are near-white pale ice (`#cbf0ff`), so the figure reads as blue over white from the waist down. Everything that glows — emblem, belt, fists, boots, eyes, the **swept crest rising off the back of the skull** — is almost colourless white-cyan (`#e4ffff`). The skin is bloodless blue-grey (`#cfe6f0`): a person the cold has already got into. A **standing collar** rides the shoulders. The guard is a **barrier**, so their shield is a full pale bubble around the whole body rather than a plate in front. In flight they **stand on a slab of ice** they conjure under their own feet.
- **WHAT THEY DO** — Breathes a freezing cone that slows and then encases; throws a fast stream of ice shards; raises walls of ice as cover; runs a cold beam; lobs a heavy glacier spike; and detonates an Absolute Zero charge that scales with how long it is held. Slides on ice to evade. Levitates rather than truly flies.
- **WHAT MAKES THEM DIFFERENT** — The only fighter whose flight is a **vehicle** — a frozen board under the boots — and one of only two whose guard is an omnidirectional bubble paid for in energy rather than a front plate. Where COLDSNAP freezes you with a gun, RIME freezes the ground you are standing on.
- **HOW THEY FIGHT** — **Zoner.** Holds middle distance and makes the space between you unusable. Derived personality: THE TACTICIAN — reads the room and removes the problem. Resting temperament: flat and unbothered, low volatility.

## WARDEN — *Gravity Anchor*

- **CIVILIAN IDENTITY** — Desmond Ward, Manchester, United Kingdom.
- **ORIGIN** — Mutated.
- **WHAT THEY LOOK LIKE** — **HEAVY**: a genuine heavyweight, small head, no neck to speak of, wide stance. Deep teal suit (`#2c91ab`) over near-navy legs and armour (`#1a4560`) — a dark, cold, industrial figure. A **full helmet** with a **glowing bright-cyan visor bar** (`#86e7ff`) across the eyes, so the face is a machine mask; **double pauldrons with a spike on each**, and gauntlets. The exposed skin is cold grey-blue (`#b9c6cc`). Voice register very deep.
- **WHAT THEY DO** — Pushes crowds with a wide cone of force, lobs a slow heavy graviton, grows a Singularity that pulls the field inward, and holds a Collapse charge that gets worse the longer it is held. Throws a two-punch melee only — no medium punch, jab or haymaker.
- **WHAT MAKES THEM DIFFERENT** — One of the four heavyweights who **cannot throw a mid-range punch**; they have a jab and a haymaker and nothing in between. Their gravity is about **shoving mass around** — cones, implosions, lobs — where GRAVEN's is about wells and levitation.
- **HOW THEY FIGHT** — **Bruiser.** Closes to punching distance and stays there, but keeps the cones for crowds. THE CHALLENGER: wants whoever still has the most left. Resting temperament: content, ordinary volatility.

## PYRE — *Living Wildfire*

- **CIVILIAN IDENTITY** — Piper Reardon, Alice Springs, Australia.
- **ORIGIN** — Mutated.
- **WHAT THEY LOOK LIKE** — **POWERFUL**: broad and thick without being a giant. A hot orange suit (`#ff742d`) over scorched dark-brown legs and armour (`#6e2c03`) — the palette of something that has been burning for a while. Amber glow (`#ffb649`) on emblem, belt, fists, boots, eyes and a **two-piece flame crest standing up off the back of the head**. Gauntlets. Sun-weathered skin (`#e0a878`). Levitates inside a **fire wake** — the trail behind them is flame, not thrust.
- **WHAT THEY DO** — Lobs fireballs on an arc, roars a flamethrower cone, holds a Magma Bomb that grows with the charge, flies in with a burning fist, sprays cinders, and calls a Rain of Fire down over an area. Immune to frost.
- **WHAT MAKES THEM DIFFERENT** — The **artillery** fire user: PYRE's game is arcs and area denial from the middle distance, where TORCH is a fast flier who sets you on fire by touching you. Also the only fire user on the roster who is genuinely thickset.
- **HOW THEY FIGHT** — **Artillery.** Sits back and drops things on you from an arc. THE TACTICIAN. Resting temperament: flat, low volatility.

## RIFT — *The Doorbreaker*

- **CIVILIAN IDENTITY** — Arjun Deshpande, Mumbai, India.
- **ORIGIN** — Mutated.
- **WHAT THEY LOOK LIKE** — **SLIGHT**: short, wiry, a proportionally large head. A deliberately drab figure — the suit is dark slate-blue (`#3e445d`), legs and armour are cold pale grey (`#c0c7d9`) — so the only real colour on them is the **hot orange glow** (`#ff933b`) of the emblem, belt, fists, boots and the **glowing visor bar** across a full **helmet**, with a standing collar under it. Tan skin (`#d8b98a`) is mostly hidden. The one who looks like a technician.
- **WHAT THEY DO** — Places a pair of doors — **orange in, blue out** — that fighters and projectiles both pass through. Runs an arcane ray, throws a fracture bolt, blinks short distances, and holds an Event Horizon charge. Levitates.
- **WHAT MAKES THEM DIFFERENT** — The only fighter who edits the **map** rather than the fight: nobody else can make two points in the world the same point, and nobody else can make your own shot come back out somewhere behind you.
- **HOW THEY FIGHT** — **Trickster.** Never where you last hit. THE WILDCARD: attacks whoever happens to be in front of them. Resting temperament: keyed-up and surprised, high volatility.

## KIVULI — *The Breath of Kampala*

- **CIVILIAN IDENTITY** — Kato Ssemanda, Kampala, Uganda.
- **ORIGIN** — Mutated.
- **WHAT THEY LOOK LIKE** — **THE SINGLE SANCTIONED PURPLE IN THE PROJECT.** A **LIGHT** frame. Deep violet suit (`#4a2a80`) over near-black violet legs, hood and armour (`#1e1038`), with a bright orchid glow (`#b06aff`) on emblem, belt, fists, boots and eyes. A **raised hood** covers the head entirely — a cone with a separate drape falling behind — so the face is in shadow under it with only the glowing eyes showing. **Twin back tanks with a glowing hose** looping between them at the shoulders: he carries his own atmosphere. Deep brown skin (`#6a4a3a`). Levitates.
- **WHAT THEY DO** — Exhales a choking gas cone that keeps hurting after it lands, **hardens that gas into solid walls on command**, goes intangible as vapour, throws a creeping cloud that blinds where it bursts, and holds an Asphyxia charge. Slips through things as mist to evade.
- **WHAT MAKES THEM DIFFERENT** — The only fighter whose damage and whose *cover* are the same substance — the gas that is choking you is the wall he hides behind a second later. And the only purple on the roster, by explicit ruling.
- **HOW THEY FIGHT** — **Trickster.** Fogs the space, disappears into it, comes back from a different direction. THE WILDCARD. Resting temperament: keyed-up, high volatility.

## RIPCLAW — *The Best At What He Does*

- **CIVILIAN IDENTITY** — Jack Sutherland, Fort McMurray, Canada.
- **ORIGIN** — Mutated.
- **WHAT HE LOOKS LIKE** — **STANDARD** frame, unmodified. A bright gold-amber suit (`#f7b41b`) over cold blue-grey legs and armour (`#3d485d`) — hot over cold. Pale yellow glow (`#ffe270`) on emblem, belt, fists, boots and eyes. The signature piece is a **shaggy mane** — a rough faceted volume filling out the back and sides of the head — plus **gauntlets**. Ordinary skin tone (`#e8c39a`). Grounded: he cannot fly at all.
- **WHAT HE DOES** — Slashing claws as his basic attack, a lunging airborne shred, a berserker multi-slash rush, a roar that intimidates, on-demand regeneration, and a berserker rage. Bladed hands mean his ordinary jabs open wounds that bleed.
- **WHAT MAKES HIM DIFFERENT** — The roster's **regenerating slasher**: FERAL is a thorned beast who hurts you for touching him, ONYX is a duellist in a kinetic suit, RIPCLAW simply does not stay hurt. Two of his seven slots are the same idea — claws — which is the point.
- **HOW HE FIGHTS** — **Rusher**, at the shortest range of almost anyone. THE ZEALOT: charges the centre of the strongest thing present. Resting temperament: already angry, high volatility.

## TEMPEST — *Weather Sovereign*

- **CIVILIAN IDENTITY** — Nailah Hassanein, Cairo, Egypt.
- **ORIGIN** — Mutated.
- **WHAT SHE LOOKS LIKE** — **LIGHT** frame. Unusually, the *primary* is near-white bone (`#e6e1ce`) — the pale figure on the roster — over cold dark blue-grey legs and armour (`#3d455d`). Pale ice-blue glow (`#beeaff`) on emblem, belt, fists, boots, eyes and a **two-piece crest rising off the back of the head**, with a **standing collar**. Deep brown skin (`#6a4a3a`) reads strongly against the white suit. Full flight.
- **WHAT SHE DOES** — Chains lightning as a beam, blows a gale-force cone, throws a volley of hail, flash-freezes at close range, holds an eye-of-the-storm buff, and calls a storm front down over the field.
- **WHAT MAKES HER DIFFERENT** — The only fighter who is **all four weathers at once** — lightning, wind, hail and frost in one kit — where the roster's other cold and shock users each pick one. She is also the palest silhouette in the game, which matters in a fixed top-down camera.
- **HOW SHE FIGHTS** — **Artillery**, from far back and high up. THE TACTICIAN. Resting temperament: flat, low volatility.

## TRENCH — *King of the Drowned Court*

- **CIVILIAN IDENTITY** — Kaimana Aukai, Honolulu (surface) and the Pacific Deep, USA.
- **ORIGIN** — Mutated.
- **WHAT HE LOOKS LIKE** — **HEAVY**: a big man. Bright gold suit (`#f7df1b`) over deep ocean blue legs and armour (`#017dbc`) — one of the most saturated colour pairings on the roster. Cyan glow (`#86e7ff`) on emblem, belt, fists, boots, eyes and a **crest off the back of the head**; a single **pauldron** on one shoulder. He carries a **real spear in his right hand** — a long shaft with a **glowing cyan head**. Tan skin (`#d8b088`). Grounded — a king who does not fly.
- **WHAT HE DOES** — Stabs with the trident, **summons a court of drowned things** to fight beside him, blasts a riptide cone, throws a harpoon, buffs on the tide, and grows a MAELSTROM that swallows the field.
- **WHAT MAKES HIM DIFFERENT** — The only summoner with a **melee weapon in his hands** — HIVE hides behind drones and RAMIRO calls for backup on a radio, but TRENCH walks in with a spear and brings the monsters with him.
- **HOW HE FIGHTS** — **Summoner**, but at a much shorter preferred range than the others. THE GUARDIAN: goes for whoever is doing the most harm. Resting temperament: flat, slightly below-average volatility.

## ABEO — *Shield of the Hand*

- **CIVILIAN IDENTITY** — Abeo Adeyemi, Lagos, Nigeria. Canon: a bodyguard of the Hand of Uganda.
- **ORIGIN** — Mutated. Living metal.
- **WHAT THEY LOOK LIKE** — **HEAVY**, and **metal — no visible skin anywhere**: head, jaw, neck and forearms are all rendered in the secondary colour at high metalness. That secondary is a **vivid orange-red** (`#f7461b`), so the head and hands read as **glossy hot-orange metal** against a muted slate-teal chest (`#4b6468`). A **full helmet** (no visor — the eyes show, in pale gold `#ffdb81`), **double spiked pauldrons**, gauntlets. A **deflect** guard, so the shield plate in front is gold. Grounded.
- **WHAT THEY DO** — Iron-palm strikes, a shockwave stomp cone, a shrapnel fist projectile, a dedicated guard-break attack, an oath buff, and a Foundation Breaker charge. Bullets and arrows bounce off the guard back at whoever fired them; the riot-shield modifier makes that guard tougher still.
- **WHAT MAKES THEM DIFFERENT** — The roster's **deflection specialist**: a reflecting guard *and* the reinforced-shield modifier *and* living metal, all on the same body, plus an explicit guard-break of their own for when someone else tries the same trick. Built to stand in a doorway. Where TITAN is a machine, ABEO is a person made of metal.
- **HOW THEY FIGHT** — **Bruiser**, close in, but slower to commit than the rushers. THE CHALLENGER. Resting temperament: content, ordinary volatility.

## KAMARIA — *Veil of the Hand*

- **CIVILIAN IDENTITY** — Kamaria Odhiambo, Mombasa, Kenya. Canon: a bodyguard of the Hand of Uganda.
- **ORIGIN** — Mutated.
- **WHAT SHE LOOKS LIKE** — **STANDARD** frame. A bright deep-cyan suit (`#01a1bc`) over near-black blue-slate legs, hood and armour (`#2b3247`). Pale cyan glow (`#86e7ff`) on emblem, belt, fists, boots and eyes. A **raised hood with a drape** hides the hair and shadows the face; a **standing collar** beneath it. Deep brown skin (`#5a3a28`). Levitates. When she phases she goes translucent.
- **WHAT SHE DOES** — A slashing veiled edge, on-demand **intangibility**, a short teleport, a phase bolt, a brief half-here invulnerability, and a ten-strike rush. She slips *through* attacks to evade rather than dodging them.
- **WHAT MAKES HER DIFFERENT** — One of only three fighters who can become intangible, and the only one who uses it as a **bodyguard's** tool rather than a trickster's — she is standing in front of someone. Her blades do not extend the courtesy her body receives.
- **HOW SHE FIGHTS** — **Trickster**, at close-to-medium range. THE WILDCARD. Resting temperament: keyed-up, high volatility.

## JAWAH MATU — *The Silence*

- **CIVILIAN IDENTITY** — Jawah Matu, Nairobi, Kenya. Canon.
- **ORIGIN** — Mutated. Absorbs sound through exposed skin.
- **WHAT HE LOOKS LIKE** — **STANDARD** frame. A muted grey-blue suit (`#3d4c5d`) over warm bone-cream legs, hood and armour (`#d9cebc`) — one of the very few light-bottomed figures. Pale green glow (`#92e68d`) on emblem, belt, fists, boots and eyes. A **raised hood with a drape** and a **standing collar**. Deep brown skin (`#5a3a28`) — and the skin is the mechanism, so **exposed skin should be a design feature, not covered up**.
- **WHAT HE DOES** — Holds an **absorption field cone that drains your energy straight into his**, strikes with a dead-air palm, throws a null wave, returns the stored thunder back as a cone, banks decibels as a buff, and releases EVERY SOUND AT ONCE as a charge.
- **WHAT MAKES HIM DIFFERENT** — **The only fighter who is fed by you attacking him.** Your scream, your gunshot, your charge-up roar all go into the tank. Where DECIBEL makes sound, JAWAH takes it.
- **HOW HE FIGHTS** — **Trickster** at short range. Moves silently to evade. THE WILDCARD. Resting temperament: keyed-up, high volatility.

## DUNE — *The Walking Sahara*

- **CIVILIAN IDENTITY** — Amadou Cissé, Timbuktu, Mali.
- **ORIGIN** — Mutated. An original creation, not modelled on anyone.
- **WHAT HE LOOKS LIKE** — **STANDARD** frame. A bright burnt-orange suit (`#f7741b`) over dusty terracotta legs and armour (`#b25c37`) — the whole figure is desert. Pale sand glow (`#ffe8bf`) on emblem, belt, fists, boots and eyes — his glow is nearly white, which is unusual. A **standing collar** and a **headband**. Sun-weathered skin (`#c9915a`). Grounded, and surfs on sand to evade.
- **WHAT HE DOES** — An abrading sandblast cone that keeps grinding after it lands, sand ramparts raised as walls, a hurled fist of compacted waste, a dust sentry that shoots for him, a hardpack buff, and a SANDSTORM that falls across a whole area.
- **WHAT MAKES HIM DIFFERENT** — The only fighter whose material is **abrasive** rather than hot, cold, toxic or kinetic — his cone wears you down instead of burning you. And the only one who fields both walls and a turret out of the same substance.
- **HOW HE FIGHTS** — **Zoner.** Builds the terrain he wants and makes you cross it. THE TACTICIAN. Resting temperament: flat, low volatility.

## GRAVEN — *The Weight of the World*

- **CIVILIAN IDENTITY** — Grigor Petrossian, Yerevan, Armenia.
- **ORIGIN** — Mutated. An original creation.
- **WHAT HE LOOKS LIKE** — **STANDARD** frame. Near-black blue suit (`#2b3747`) over a mid steel-blue for legs and armour (`#3f6790`) — dark, sober, no warmth at all. A soft periwinkle-blue glow (`#86b4ff`) on emblem, belt, fists, boots, and on the **glowing visor bar** of a **full helmet**, with a **standing collar**. Cold grey skin (`#b9c6cc`) on the forearms. Levitates constantly — his blurb says falling is optional.
- **WHAT HE DOES** — Shears with a gravity cone, grows an Event Well that swallows the battlefield, throws a dense star, displaces himself short distances, runs a zero-G field, and plants a SINGULARITY SEED.
- **WHAT MAKES HIM DIFFERENT** — The **artillery** gravity user, held at long range, where WARDEN is a bruiser who shoves. GRAVEN's answer to being approached is a well you fall into, not a fist.
- **HOW HE FIGHTS** — **Artillery**, far back, in the air. THE TACTICIAN. Resting temperament: flat, low volatility.

---
---

# ALTERED — something was done to a human body, and it took

*Twelve. Still human enough to treat, and the alteration does most of the work.*

---

## SOL — *Man of Sunlight*

- **CIVILIAN IDENTITY** — Samuel Ellison, Ellsworth, Kansas, USA.
- **ORIGIN** — Altered.
- **WHAT THEY LOOK LIKE** — **HEAVY**: a broad heavyweight with a small head on a thick neck. One of the loudest primary-colour contrasts on the roster — a **burnt orange suit** (`#ef652e`) over **electric ultramarine legs and armour** (`#0a27ff`), with a **long dark-orange cape** (`#dd4309`) off the upper back. Warm gold glow (`#ffd557`) on emblem, belt, fists, boots and eyes. One **pauldron** and **gauntlets**. Ordinary skin (`#e8c39a`). Full flight, with a white-and-gold afterburner wake when the burner is lit.
- **WHAT THEY DO** — A razor-thin ruby heat ray **fired from the eyes** with a white-hot core; a wide freezing breath; a flying fist that ends arguments; a homing solar flare; a rapid heat flurry; and Solar Overload, which buffs and heals at once. Immune to frost.
- **WHAT MAKES THEM DIFFERENT** — The roster's **hot-and-cold** fighter: the only one who carries a fire beam and a freezing cone in the same kit. Also one of only two whose beam is flagged to spawn at the **face** rather than the hands (VANGUARD is the other).
- **HOW THEY FIGHT** — **Bruiser** who will take to the air. THE CHALLENGER: goes for whoever still has the most left. Resting temperament: content, ordinary volatility.

## VOLT — *The Overclock*

- **CIVILIAN IDENTITY** — Baek Jin-ho, Seoul, South Korea.
- **ORIGIN** — Altered.
- **WHAT HE LOOKS LIKE** — **SLIGHT**: the smallest frame tier in the game — short, thin, a proportionally large head (shared with HIVE, RIFT, GALE and COLDSNAP). An **acid-yellow suit** (`#ebff2d`), a near-fluorescent yellow-green, over near-black legs and armour, with a **two-piece crest standing off the back of the head** and **gauntlets**. The glow is colourless white-cyan (`#e4ffff`). Ordinary skin (`#e8c39a`). A clumsy flier: he sags without thrust and cannot hold a hover. Voice register high.
- **WHAT HE DOES** — A twelve-hit lightning flurry, an arc beam, a chaining bolt, a static cone, a short zap-step teleport, and Overclock. He evades with a **Mach Sprint that runs straight through solid cover** trailing lightning. His fists come out faster than anyone else's, and grabbing him means the current bites back.
- **WHAT MAKES HIM DIFFERENT** — **The only fighter whose punches are physically quicker than everyone else's**, and the only one whose sprint ignores walls. He is also the roster's deepest comeback fighter — the emptier his tank, the more his fists refill it.
- **HOW HE FIGHTS** — **Rusher**, at close range, at near-maximum aggression. THE ZEALOT. Resting temperament: already angry, high volatility.
- **Palette note** — his secondary `#38314a` is a near-black slate with a faint violet cast. Flagged for review in the gaps section; at that darkness and saturation it reads as charcoal.

## TORCH — *The Human Flame*

- **CIVILIAN IDENTITY** — Tommy Carideo, New York City, USA.
- **ORIGIN** — Altered.
- **WHAT HE LOOKS LIKE** — **LIGHT** frame: slim, young, a slightly larger head. A warm amber-gold suit (`#ffb02d`) over deeper burnt-orange legs and armour (`#b26300`) — he is monochrome fire, top to bottom. Gold glow (`#ffd557`) on emblem, belt, fists, boots and eyes, and a **two-piece flame crest off the back of the head** — his only silhouette piece. No gauntlets, no armour, nothing heavy: the least-equipped figure on the roster. Full flight, in a **fire wake**, with an orange-and-gold afterburner.
- **WHAT HE DOES** — A flame-jet beam, a fire blast cone, homing fireballs, a flying flaming fist, an ember storm, and **SUPERNOVA — he feeds the entire tank into one omnidirectional detonation and is left completely dry.** Immune to frost, and grabbing him burns you badly — the harshest thorns on the roster.
- **WHAT MAKES HIM DIFFERENT** — The **all-or-nothing** ultimate: one of only two moves in the game that feed the entire tank into a single detonation and leave the caster dry (RAGE's is the other, and RAGE's is a ground slam). Nobody punishes being grabbed as hard as TORCH does. He is the fast, light, cocky fire user against PYRE's heavy artillery.
- **HOW HE FIGHTS** — **Rusher**, and among the most airborne fighters in the game. THE CHALLENGER. Resting temperament: content, ordinary volatility.

## APEX — *The Perfect Being*

- **CIVILIAN IDENTITY** — A.P.X.-01 (lab-grown), Geneva, Switzerland.
- **ORIGIN** — Altered.
- **WHAT THEY LOOK LIKE** — **HEAVY**, and inhuman: the "skin" slot is a **muted green** (`#6fae7a`), so the head, neck and forearms are green flesh, not human tone. A bright emerald suit (`#25ca61`) over dark forest-green legs and armour (`#1c6b35`), with a **yellow-green glow** (`#c3ff73`) on emblem, belt, fists, boots and eyes, and a **crest off the back of the head** plus a single **pauldron**. A bio-engineered predator that reads green from head to foot. Full flight (engine default — not explicitly declared) with a gold-and-orange afterburner.
- **WHAT THEY DO** — A wide charged wave cannon, a tail sweep, a **held life-siphon that heals him as it drains you**, an afterimage blink, an on-demand regeneration, and a Perfect Wave ultimate. **His throws drain your life into him** — the strongest such effect on the roster.
- **WHAT MAKES THEM DIFFERENT** — The most **self-sustaining** fighter in the game: a healing throw, a healing siphon, and a regeneration buff, all in one kit. He does not out-damage you; he outlasts you.
- **HOW THEY FIGHT** — **Grappler.** Wants his hands on you, because that is where his healing comes from. THE PREDATOR: smells blood and follows it. Resting temperament: already angry, high volatility.

## KING STEFANOS — *The First Celebrity Superweapon*

- **CIVILIAN IDENTITY** — Stefanos Vasilakis, Athens, Greece. **The President of Greece.** Canon.
- **ORIGIN** — Altered.
- **WHAT HE LOOKS LIKE** — **STANDARD** frame, unmodified — he is a statesman, not an athlete. A strong royal blue suit (`#2a35f0`) over **bone-cream legs and armour** (`#e6e4ce`) — the palette of a formal Greek presidential blue-and-white, and the BUILDS notes call the collar and gauntlets "presidential suit lines". Warm gold glow (`#ffd557`) on emblem, belt, fists, boots and eyes. A **standing collar** and **gauntlets**, nothing else. Tan skin (`#d8b088`). Full flight.
- **WHAT HE DOES** — His energy takes a **shape** before it strikes: formed charges, a storm of jagged motes, a concussive form cone, a pressure sphere, and a buff called *These Wounds Will Not Heal*. His ultimate is **THE MARLETTA** — his murdered wife's face, charged up, released as a slow homing sprite that stops on contact, trembles and blushes toward burning, and then detonates.
- **WHAT MAKES HIM DIFFERENT** — **The only fighter whose ultimate is a portrait of a person.** Mechanically it is the only weapon in the game with a delayed arming beat after contact, and deflect guards cannot bounce her.
- **HOW HE FIGHTS** — **Artillery**, from range and altitude. THE TACTICIAN. Resting temperament: flat, low volatility.

## RAGE — *The Monster in the Man*

- **CIVILIAN IDENTITY** — Dr. Barnaby Rooke, Dayton, Ohio, USA.
- **ORIGIN** — Altered.
- **WHAT HE LOOKS LIKE** — **COLOSSAL — the only fighter at this tier.** The largest, thickest, widest figure in the game, with the **smallest head relative to the body, no neck at all, and the widest stance**. A saturated green suit (`#28bb39`) over cold blue-grey legs and armour (`#3d485d`) — green over grey trousers. **Green skin** (`#5faf6a`) on head, neck and forearms. A pale green glow (`#92e68d`) on emblem, belt, fists, boots and eyes. His only silhouette piece is a **headband** — no armour, no cape, nothing. Grounded, but leaps enormous distances. The deepest voice on the roster.
- **WHAT HE DOES** — Smashes. A thunder-clap cone, a hurled boulder, a rampage rush, a fury buff, and **WORLD BREAKER — an omnidirectional detonation fed from his whole tank that also slams the ground**, driving him down into it if he is airborne. Jab and haymaker only; no medium punch.
- **WHAT MAKES HIM DIFFERENT** — The **strength ceiling of the roster**, and the only fighter whose ultimate is a ground slam rather than a beam or a bomb. He is the answer to the question "what does the top of the physical ladder look like".
- **HOW HE FIGHTS** — **Bruiser** at very close range and near-maximum aggression. THE ZEALOT: charges the centre of the strongest thing present. Resting temperament: already angry, high volatility.

## WEBLINE — *The Neighborhood Ghost*

- **CIVILIAN IDENTITY** — Miles Otero, Queens, New York, USA.
- **ORIGIN** — Altered.
- **WHAT HE LOOKS LIKE** — **STANDARD** frame. A hot orange suit (`#f68005`) over a deep indigo-blue for legs and armour (`#3015a0`) — **that secondary is flagged in the gaps section** as sitting in the violet band. Colourless white-cyan glow (`#e4ffff`) on emblem, belt, fists, boots and eyes. His only silhouette piece is a **headband**. Ordinary skin (`#e8c39a`). Grounded, but vaults enormous distances on a line.
- **WHAT HE DOES** — Fires a **web snare that reaches, holds, drags you in and slams you into the nearest wall**; a spider flurry rush; a volley of web darts; a flying sting kick; a danger-sense buff with real invulnerability frames; and a Maximum Spider finisher rush.
- **WHAT MAKES HIM DIFFERENT** — The only **grounded** fighter with a reach-and-drag grapple line: KRAKEN, CHAINFIRE, AEGIS and MOSES all have one, and all four are heavier or airborne. He is the acrobat version — he does not out-muscle you, he makes the wall do it.
- **HOW HE FIGHTS** — **Rusher** at close range. THE CHALLENGER. Resting temperament: content, ordinary volatility.

## MAJESTY — *Higher. Further. Faster.*

- **CIVILIAN IDENTITY** — Maya Jefferson, Boston, USA.
- **ORIGIN** — Altered.
- **WHAT SHE LOOKS LIKE** — **HEAVY**: a genuinely powerful build, not a slim flier. A pure red suit (`#e6060f`) over deep navy legs and armour (`#1544a0`), with warm gold glow (`#ffd557`) on emblem, belt, fists, boots and eyes. The signature is a pair of **translucent glowing wings** — broad swept planes off the upper back in the accent gold, at about three-quarters opacity. A **headband**, one **pauldron**, **gauntlets**. Ordinary skin (`#e8c39a`). Full flight, with a **silver-white and pale-blue** afterburner wake.
- **WHAT SHE DOES** — A photon stream beam, a star barrage volley, a charged nova fist, a flying comet punch, **BINARY** as a buff, and a charged Supernova Lance ultimate.
- **WHAT MAKES HER DIFFERENT** — One of only three fighters rated at the top of the threat scale, and where NOVA drops the sky from a distance and APEX wants his hands on you, **MAJESTY flies at you and hits like a heavyweight.** She is also one of only two winged figures.
- **HOW SHE FIGHTS** — **Beamer** at long range, but very willing to fly at you. THE PROVER: only a win against the strongest counts. Resting temperament: content, slightly elevated volatility.

## DECIBEL — *The Cry That Levels Blocks*

- **CIVILIAN IDENTITY** — Bianca Leone, Naples, Italy.
- **ORIGIN** — Altered.
- **WHAT SHE LOOKS LIKE** — **LIGHT** frame. A muted dark slate-blue suit (`#313f4a`) over deep rust-brown legs and armour (`#6b3824`) — a deliberately quiet, low-contrast figure. Pale yellow glow (`#ffe270`) on emblem, belt, fists, boots and eyes. Her only silhouette piece is a **headband**: no armour, no cape, no weapon. Ordinary skin (`#e8c39a`). Grounded. **The highest voice register on the roster.**
- **WHAT SHE DOES** — A **siren scream cone rendered as transparent pressure rings and kicked-up dust rather than a glow** — sound is not light, and the game draws it that way. Plus a combat-cadence rush, a heel-turn strike, a focused note, a crescendo buff, and **THE CANARY CRY** as a second, larger sonic cone.
- **WHAT MAKES HER DIFFERENT** — The only fighter whose two headline attacks are **invisible** — pressure and dust, no beam, no glow. She is also the only fighter *with powers* whom the data explicitly marks with the full three-tier punch; that mark otherwise appears only on the trained, unpowered humans.
- **HOW SHE FIGHTS** — **Bruiser** — she works close, despite the ranged voice. THE CHALLENGER. Resting temperament: content, ordinary volatility.

## JELANI — *Spear of the Hand*

- **CIVILIAN IDENTITY** — Jelani Mwakasege, Dar es Salaam, Tanzania. Canon: a bodyguard of the Hand of Uganda.
- **ORIGIN** — Altered.
- **WHAT THEY LOOK LIKE** — **HEAVY**. A vivid scarlet suit (`#f6052e`) over muted dark slate-blue legs and armour (`#313f4a`). Amber glow (`#ffb649`) on emblem, belt, fists, boots and eyes. A **headband** and **gauntlets** — nothing more. Deep brown skin (`#5a3a28`). Grounded. Evades with a **sprint**, not a dash.
- **WHAT THEY DO** — Piston blows, a blur-assault rush, a sonic wake cone from sheer speed, a flying spear tackle, a second-wind buff, and **A Hundred Hands** — a rush finisher. The dash itself ignites.
- **WHAT MAKES THEM DIFFERENT** — **Strength and speed in the same body** — the combination the blurb says treaties were written about. Every other heavyweight on the roster trades speed away; JELANI does not, and he does it with no armour and no weapon.
- **HOW THEY FIGHT** — **Rusher**, at very short range and near-maximum aggression. THE ZEALOT. Resting temperament: already angry, high volatility.

## BULWARK — *The Living Rampart*

- **CIVILIAN IDENTITY** — Bogdan Zelenko, Kyiv, Ukraine.
- **ORIGIN** — Altered. An original creation.
- **WHAT HE LOOKS LIKE** — **HEAVY**. An olive-drab military suit (`#75903f`) over cold blue-grey legs and armour (`#3d485d`). Cool pale silver-grey glow (`#cad0db`) on emblem, belt, fists, boots and eyes — **his glow is grey, not a colour**, which almost nobody else's is. A **full helmet** with **no visor** (the eyes show), **double spiked pauldrons**, **gauntlets**, and a **round shield strapped to the left forearm** with a glowing boss at its centre. Sun-weathered skin (`#c9915a`). Grounded, and his guard is a **barrier** — a full bubble, not a plate. Carries an ablative shield cell as a gadget.
- **WHAT HE DOES** — Rampart fists, bastion walls raised as cover, a repulse-field cone, a watchtower turret that shoots for him, a hold-the-line buff, and a SIEGE END charge. Jab and haymaker only.
- **WHAT MAKES HIM DIFFERENT** — **A one-man fortification.** He is the only fighter who has a barrier guard *and* the reinforced-shield modifier *and* deployable walls *and* a turret *and* a carried shield pack. Nothing on the roster is built more completely around not moving.
- **HOW HE FIGHTS** — **Zoner** at short range and the lowest aggression of any heavyweight — he waits. THE TACTICIAN. Resting temperament: flat, low volatility.

## FERAL — *The Reclaimed*

- **CIVILIAN IDENTITY** — Yara Ticuna, Manaus, Brazil.
- **ORIGIN** — Altered. An original creation: they made him a weapon and the wild took him back.
- **WHAT HE LOOKS LIKE** — **POWERFUL**: broad and thick. A rusty red-brown suit (`#b85123`) over darker earth-brown legs and armour (`#6b3e24`) — an entirely earthen figure, the least "costumed" palette on the roster. Amber glow (`#ffb649`) on emblem, belt, fists, boots and eyes. The signature is **both a shaggy mane and a pair of curved horns** on the head — he is the only fighter with both — plus **gauntlets**. Sun-weathered skin (`#c9915a`). Grounded; pounces to evade. Hide like barbed wire: grabbing him hurts badly.
- **WHAT HE DOES** — Rends with claws, a pack-hunt rush, an apex roar cone that moves crowds, a savage flying lunge, a blood-frenzy buff, and **NO CAGES** — a slashing rush finisher that opens wounds.
- **WHAT MAKES HIM DIFFERENT** — **The maximum-aggression fighter on the roster** — nothing else is set to attack this relentlessly, at this short a range. And the only mane-and-horns silhouette.
- **HOW HE FIGHTS** — **Rusher**, at the very shortest range, at full aggression. THE ZEALOT. Resting temperament: already angry, high volatility.

---
---

# TECH — the power is equipment; take it off and they are a person

*Seven. A surgeon can close the wound; the hardware needs an engineer.*

---

## AURUM — *The Willbearer*

- **CIVILIAN IDENTITY** — Aurélio Campos, São Paulo, Brazil.
- **ORIGIN** — Tech.
- **WHAT THEY LOOK LIKE** — **STANDARD** frame. A brilliant emerald suit (`#05da54`) over deep pine-green legs and armour (`#087d43`) — a single-hue figure, green on green. Pale mint glow (`#84ffa3`) on emblem, belt, fists, boots and eyes. A **standing collar** and **gauntlets**, nothing else. Warm tan skin (`#caa27a`). Full flight (engine default — not explicitly declared). Their guard is a **barrier**: a full green bubble around the body, paid for continuously in energy.
- **WHAT THEY DO** — Everything is **solid light steered with the cursor**: a rocket fist that flies where you point it, a falling hammer, a wall raised as cover, and a sentry turret that fires for them. Plus an emerald bolt and an overcharge buff that heals. The fist can **seize a foe under it, hoist them and pile-drive them into the ground.**
- **WHAT MAKES THEM DIFFERENT** — **Four of their seven slots are constructs** — nobody else on the roster builds this much. They are the only fighter whose attacks are objects you pilot after you have made them.
- **HOW THEY FIGHT** — **Zoner** at medium range, low aggression, rarely airborne. THE TACTICIAN. Resting temperament: flat, low volatility.

## HIVE — *The Conclave*

- **CIVILIAN IDENTITY** — Anže Čebular, Ljubljana, Slovenia.
- **ORIGIN** — Tech.
- **WHAT THEY LOOK LIKE** — **SLIGHT**: short, thin, larger-headed. A warm ochre-amber suit (`#e1a33b`) over dark olive-brown legs and armour (`#60491a`) — an insect palette. Pale honey glow (`#ffe181`) on emblem, belt, fists, boots and eyes. **Twin back tanks joined by a glowing hose at the shoulders**, a **two-piece crest off the back of the head**, and one **pauldron**. Warm tan skin (`#d8b98a`). A clumsy flier — sags without thrust, no stable hover.
- **WHAT THEY DO** — Never fights alone: **swarms of seeker drones**, a second summoned hunter pack, a fixed sentinel turret, an **acid-payload stinger**, a scatter cone, and an Overmind buff that empowers the whole hive.
- **WHAT MAKES THEM DIFFERENT** — The **lowest-aggression, longest-preferred-range fighter on the roster** — they genuinely do not want to be near you — and one of only four sources of the armour-eating acid damage type.
- **HOW THEY FIGHT** — **Summoner.** Puts things between you and them and stays behind them. THE GUARDIAN: goes for whoever is doing the most harm. Resting temperament: flat, slightly below-average volatility.

## IRONCLAD — *The Suit*

- **CIVILIAN IDENTITY** — Ivan Radcliffe, Palo Alto, USA.
- **ORIGIN** — Tech.
- **WHAT THEY LOOK LIKE** — **POWERFUL, plus the metal overlay — the only fighter the overlay actually changes**, so he is bulkier, broader-shouldered, smaller-headed and thicker-necked than his strength alone would give. **No visible skin**: head, jaw, neck and forearms are all rendered in the secondary colour at high metalness — a **vivid orange** (`#f7691b`) — against a **crimson-red** chest and upper arms (`#e60642`). Pale gold glow (`#ffdb81`) on emblem, belt, fists, boots and the **glowing visor bar** of a **full helmet**, with **double spiked pauldrons** and **gauntlets**. Read the whole figure as lacquered red-and-orange plate with a lit visor for a face. Full flight.
- **WHAT THEY DO** — Repulsor bolts as an automatic weapon, a charged chest unibeam, micro-missiles, a flare-vent cone, an overpower buff, and a charged ultimate the data calls *Housewarming Party*.
- **WHAT MAKES THEM DIFFERENT** — The most **conventionally armed** of the machine-bodied fighters — no melee specialty at all, just guns, a beam and thrust. Where TITAN never runs out of power and CIRCUIT is half a man, IRONCLAD is a person who took the suit off the rack he built.
- **HOW THEY FIGHT** — **Beamer** at long range, frequently airborne. THE PROFESSIONAL: neutralises the biggest gun first, no theatre. Resting temperament: flat, low volatility.

## ONYX — *The Kinetic King*

- **CIVILIAN IDENTITY** — Dawit Negasi, Addis Ababa, Ethiopia.
- **ORIGIN** — Tech.
- **WHAT HE LOOKS LIKE** — **POWERFUL** frame. Near-black blue-slate suit (`#2b3247`) over a barely-lighter blue-grey for legs and armour (`#3d485d`) — **one of the two darkest, most monochrome figures on the roster** (KNIGHTFALL is the other, at almost identical values). Cool pale silver glow (`#cad0db`) on emblem, belt, fists, boots and the **glowing visor bar** of a **full helmet**, with a **standing collar**. Deep brown skin (`#5a3a28`), mostly covered. A **deflect** guard, so the plate in front of him is gold — the one warm thing about him. Grounded; pounces to evade.
- **WHAT HE DOES** — Kinetic claws, a hunt-sequence rush, a thrown dart, a sonic overload cone, a **kinetic release buff — the suit banks what hits it and hands it back** — and a kinetic burst charge.
- **WHAT MAKES HIM DIFFERENT** — A **duellist**, not a bruiser: he has the deflecting guard of the heaviest fighters on a mid-weight frame, and his whole identity is *absorb then return* rather than *outlast*. Visually he is the roster's one true blackout silhouette.
- **HOW HE FIGHTS** — **Rusher** at very short range. THE CHALLENGER. Resting temperament: content, ordinary volatility.

## CIRCUIT — *Half Man, All Machine*

- **CIVILIAN IDENTITY** — Silas Boateng, Accra, Ghana.
- **ORIGIN** — Tech.
- **WHAT HE LOOKS LIKE** — **HEAVY**, and **metal — no visible skin**: head, jaw, neck and forearms are all rendered in the secondary at high metalness, a **near-black teal-slate** (`#31424a`), against a **pale grey-blue** chest and upper arms (`#8da3a9`). Bright cyan glow (`#86e7ff`) on emblem, belt, fists, boots and the **glowing visor bar** of a **full helmet**. **Twin back tanks with a glowing hose**, **double spiked pauldrons**, and a **built-in gun in the right fist** — a boxy body with a barrel and a glowing muzzle, mounted on the hand rather than held. Deflect guard, so the plate in front is gold. Levitates. **His energy never runs out** — the HUD shows an infinity core instead of a bar — and the trade is that his power tier is hard-capped partway up the ladder.
- **WHAT HE DOES** — A sonic cannon as an automatic weapon, a charged white-noise beam, a shock grapple, an overload vent cone, a system-surge buff, and the **BOOYAH Cannon** as a charged ultimate. Jab and haymaker only.
- **WHAT MAKES HIM DIFFERENT** — One of only two fighters with a bottomless energy tank, and the only one of those who is *half* a machine — the palette deliberately splits pale plate against near-black limbs. His preferred fight is a sustained beam he never has to stop firing.
- **HOW HE FIGHTS** — **Beamer** at long range. THE PROFESSIONAL. Resting temperament: flat, low volatility.

## COLDSNAP — *The Absolute Zero Rule*

- **CIVILIAN IDENTITY** — Viktor Fromm, Winnipeg, Canada.
- **ORIGIN** — Tech.
- **WHAT HE LOOKS LIKE** — **SLIGHT**: short, thin, larger-headed — a criminal, not an athlete. A bright sky blue suit (`#2aa3f0`) over **bone-cream legs and armour** (`#e6d7ce`), one of very few light-bottomed figures. Pale ice glow (`#beeaff`) on emblem, belt, fists, boots and the **glowing visor bar** of a **full helmet** — his eyes never show. Ordinary skin (`#e8c39a`) on the forearms only. And a **gun built into the right fist** — the cold gun, a boxy receiver with a barrel and a glowing muzzle. Grounded; slides on ice to escape.
- **WHAT HE DOES** — Fires the **cold gun** as a firearm, a flash-frost cone that builds toward encasing you, a glacier wall for cover, a cryo charge projectile, a cold-read buff, and an Absolute Frost charge.
- **WHAT MAKES HIM DIFFERENT** — **The cold is a weapon he carries, not a thing he is.** RIME's cold comes out of the body; COLDSNAP's comes out of a barrel — and mechanically that makes it a firearm that can be blocked, deflected and reflected. He is also the only cryo user with a full-face helmet and no visible eyes.
- **HOW HE FIGHTS** — **Zoner** at long range, low aggression, patient. THE TACTICIAN. Resting temperament: flat, low volatility.

## FOUNDRY — *The Self-Made Man of Steel*

- **CIVILIAN IDENTITY** — Beatrix Kowalczyk, Pittsburgh, USA.
- **ORIGIN** — Tech.
- **WHAT THEY LOOK LIKE** — **HEAVY**, and **metal — no visible skin**: head, jaw, neck and forearms all render in the secondary at high metalness, a **deep crimson** (`#c00f36`), against a **muted steel blue-grey** chest and upper arms (`#627e8b`). Cool pale silver glow (`#cad0db`) on emblem, belt, fists and boots. A **full helmet with no visor** (so the eyes show, in silver), **twin back tanks with a glowing hose**, **double spiked pauldrons**, **gauntlets**, and a **twin-headed axe in the right hand** with **glowing silver heads**. Read it as: crimson steel head and hands, blue-grey plate body, a silver war-axe. A clumsy flier — rocket boots, not flight.
- **WHAT THEY DO** — A hammer as the basic attack, a hammer toss that comes back eventually, a rivet gun, a forge-vent cone, a tempered buff, and an Orbital Forge that rains down over an area. Jab and haymaker only.
- **WHAT MAKES THEM DIFFERENT** — The only fighter who **built the suit, forged the weapon and earned the mark on it** — a tech origin with a *hammer* as the primary attack, where every other tech-origin metal body on the roster shoots.
- **HOW THEY FIGHT** — **Bruiser** at short range. THE CHALLENGER. Resting temperament: content, ordinary volatility.

---
---

# SPIRITUAL — the power did not come from anywhere a scan can find

*Six. Hospitals barely help; what is hurt is not entirely the body.*

---

## KANO — *Spirit Warrior*

- **CIVILIAN IDENTITY** — Ryuji Kano, Okinawa, Japan.
- **ORIGIN** — Spiritual.
- **WHAT THEY LOOK LIKE** — **STANDARD** frame, unmodified — the roster's baseline body. A hot orange-red suit (`#ff5d2d`) over bright azure legs and armour (`#109bf5`) — a clean two-colour martial-arts read. Colourless white-cyan glow (`#e4ffff`) on emblem, belt, fists, boots and eyes. A **headband** and **gauntlets**: the plainest heroic kit on the roster. Ordinary skin (`#e8c39a`). Full flight (engine default — not explicitly declared).
- **WHAT THEY DO** — A **charged wave cannon that widens as it charges** — held like a firehose of light; a comet rush; a ki blast; a snap-transit teleport; an Ascend buff; and a **Star Sphere they grow overhead until it is sky-sized**. Blinks to evade.
- **WHAT MAKES THEM DIFFERENT** — The roster's **all-rounder**: one of the strongest beam-amplifying fighters, but with a teleport, a rush and a growing orb as well, so there is no range at which they have nothing. They are the reference build the others deviate from.
- **HOW THEY FIGHT** — **Trickster** at medium range — the blink is what makes them one. THE WILDCARD. Resting temperament: keyed-up, high volatility.

## STORMCALL — *Heir of Thunder*

- **CIVILIAN IDENTITY** — Sten Torvaldsen, Uppsala, Sweden.
- **ORIGIN** — Spiritual.
- **WHAT HE LOOKS LIKE** — **HEAVY**. A deep royal-indigo-blue suit (`#3f4390`) over **burnt orange-red legs and armour** (`#c0400f`), and a **cape in that same orange-red** off the upper back. Pale sky-blue glow (`#86d6ff`) on emblem, belt, fists, boots and eyes. A **full helmet with no visor** (the eyes show), **double spiked pauldrons**, **gauntlets**, and a **twin-headed axe in the right hand** with **glowing pale-blue heads**. Ordinary skin (`#e8c39a`). Full flight.
- **WHAT HE DOES** — Cleaves with the axe, **throws it as a boomerang that hits on the way out and the way back and bounces home off walls**, holds a Godblast charge, breathes a tempest cone, buffs with the sky's wrath, and calls **SKYFALL** down over an area.
- **WHAT MAKES HIM DIFFERENT** — The only fighter whose **weapon leaves his hand and comes back** — the thrown axe is matte spinning steel with no halo, deliberately, because a glowing tracer would lie about a curved return path.
- **HOW HE FIGHTS** — **Bruiser** at close-to-medium range, half the time airborne. THE CHALLENGER. Resting temperament: content, ordinary volatility.

## MYSTWARD — *Keeper of the Seals*

- **CIVILIAN IDENTITY** — Tenzin Dorje, Kathmandu, Nepal.
- **ORIGIN** — Spiritual. He was a surgeon once.
- **WHAT HE LOOKS LIKE** — **LIGHT** frame: slim, not a fighter's build. A deep crimson suit (`#c00f0f`) over cold blue-grey legs, hood, coat and armour (`#3d485d`). Amber glow (`#ffb649`) on emblem, belt, fists, boots and eyes. Three pieces together give him his whole silhouette: a **raised hood with a drape** hiding the hair and shadowing the face, a **standing collar**, and a **long coat skirt** flaring from the hips to below the knee. Tan skin (`#d8b088`). Levitates. His guard is a **barrier** — a full bubble.
- **WHAT HE DOES** — Throws crimson bands that do **magic-typed** damage, raises a seraphim shield as cover, folds space to teleport, and runs an **Eldritch Whip that siphons power out of you as it burns** — plus a ward that grants brief invulnerability, and a Sigil Rain across an area.
- **WHAT MAKES HIM DIFFERENT** — One of only two fighters who deal **magic** damage, and the only one who pairs it with a **siphoning** beam and a barrier bubble. His answer to being outgunned is to take the gun's power away.
- **HOW HE FIGHTS** — **Zoner** at medium range, low aggression. THE TACTICIAN. Resting temperament: flat, low volatility.

## CHAINFIRE — *The Debt Collector*

- **CIVILIAN IDENTITY** — Ezequiel Barraza, Monterrey, Mexico.
- **ORIGIN** — Spiritual.
- **WHAT HE LOOKS LIKE** — **POWERFUL** frame. A muted dark teal-slate suit (`#31434a`) over dark oxblood-brown legs, coat and armour (`#6b2c24`) — a smoke-and-dried-blood palette. Bright orange glow (`#ff853b`) on emblem, belt, fists, boots and eyes: **the only heat on the whole figure comes from the burning parts.** A pair of **curved horns** on the head, **gauntlets**, and a **long coat skirt** to below the knee. The "skin" slot is a pale bone grey (`#c9bfa9`) — read it as bone. A clumsy flier trailing a **fire wake**. Immune to frost.
- **WHAT HE DOES** — Throws a **hellfire chain that reaches, holds, drags you in and slams you into the nearest wall**; a soul-furnace cone that leaves you burning; a brimstone ball; a slashing chain lash; a penance-stare buff; and a Rain of Hellfire.
- **WHAT MAKES HIM DIFFERENT** — The only **grappler** who is also a fire user, and the only fighter whose reach-and-drag weapon is on fire. His look is the inverse of every other fire user: cold, dark cloth with the fire confined to the glow slots.
- **HOW HE FIGHTS** — **Grappler** at close-to-medium range. THE PREDATOR: smells blood and follows it. Resting temperament: already angry, high volatility.

## AEGIS — *Daughter of War*

- **CIVILIAN IDENTITY** — Alexia Stavrou, Heraklion, Crete, Greece.
- **ORIGIN** — Spiritual.
- **WHAT SHE LOOKS LIKE** — **HEAVY**: a genuine warrior's build. A vivid **raspberry-crimson** suit (`#e60653`) over strong steel blue legs and armour (`#156ea0`), with warm gold glow (`#ffd557`) on emblem, belt, fists, boots and eyes. A **headband**, one **pauldron**, **gauntlets**, a **round shield on the left forearm** with a glowing gold boss, and a **sword in the left hand with a glowing gold blade**. Tan skin (`#d8b088`). Levitates. A **deflect** guard: the plate in front of her is gold, and bullets and arrows come back at the shooter — the bracelets, mechanically.
- **WHAT SHE DOES** — The god-forged blade as her basic slash; a **golden lasso that reaches, holds, drags you in and slams you into the nearest wall**; an Aegis Wave charge; a shield-shout cone; a blessing buff; and Wrath of Themyscira as a second charge.
- **WHAT MAKES HER DIFFERENT** — The only fighter carrying a **sword and a shield and a grapple line** — a complete classical armament, where SARGE's equivalent kit is modern and issued.
- **HOW SHE FIGHTS** — **Bruiser** at short range, high aggression. THE CHALLENGER. Resting temperament: content, ordinary volatility.
- **Palette note** — `#e60653` sits at the far magenta edge of red. It reads as a raspberry crimson, not a purple, but it is listed in the gaps section for a ruling.

## OLYMPUS — *The Word Made Lightning*

- **CIVILIAN IDENTITY** — Owen Palmer, age 13, Philadelphia, USA.
- **ORIGIN** — Spiritual.
- **WHAT HE LOOKS LIKE** — **HEAVY** — and this is the most important note on the entry: **the data says a thirteen-year-old and the engine builds a heavyweight adult body.** The intended child proportions live in a frame overlay that cannot currently fire (see the frame-ladder note). Commission the *god*, not the boy, unless that overlay is repaired first. A vivid orange-red suit (`#f63705`) over **bone-cream legs, cape and armour** (`#e6e2ce`), with a **bone-cream cape** off the upper back. Pale yellow glow (`#ffe270`) on emblem, belt, fists, boots and eyes, and a pair of **translucent glowing wings** off the upper back in that same pale yellow. A **standing collar** and **gauntlets**. Ordinary skin (`#e8c39a`). Full flight with a white-and-cream afterburner.
- **WHAT HE DOES** — A living-lightning beam, a thunder fist, a thunderbolt charge, a static-storm volley, **THE WORD** as a buff, and **JUDGMENT BOLT** as a charged ultimate.
- **WHAT MAKES HIM DIFFERENT** — One of only two winged figures, and the only one who is also caped. In the fiction he is a kid's grin wearing a god's wattage; the blurb is the only place that tension is currently visible.
- **HOW HE FIGHTS** — **Bruiser** at close-to-medium range, often airborne. THE CHALLENGER. Resting temperament: content, ordinary volatility.

---
---

# SKILLED — no powers; everything they can do, they learned

*Six. Medicine understands them completely, which is the only advantage they get.*

---

## SARGE — *The Last Soldier*

- **CIVILIAN IDENTITY** — Marcus Cole, Columbus, Georgia, USA.
- **ORIGIN** — Skilled. No powers at all.
- **WHAT HE LOOKS LIKE** — **LIGHT** frame — a real human being among superweapons. An olive-drab suit (`#75903f`) over darker field-green legs and armour (`#4d5d31`): the only true military-uniform palette. Warm gold glow (`#ffd557`) on emblem, belt, fists and boots. A **headband**, **gauntlets**, a **rifle built into the right fist** (boxy receiver, barrel, glowing muzzle), a **sword in the left hand with a glowing gold blade** — the plasma blade — and a **round riot shield on the left forearm** with a glowing boss. Weathered skin (`#c9915a`). **Grounded — the flight toggle refuses him** — and rated at the bottom of the threat scale. The riot shield makes his guard measurably tougher whatever guard he is using.
- **WHAT HE DOES** — A pulse carbine on automatic, a breaching shotgun, frag grenades that tumble with a **blinking fuse**, the plasma blade as a slash, a stim shot, and an **Airstrike** called down over an area. Evades with a **Combat Leap that clears a building**, and carries **jump-jet charges** as a gadget.
- **WHAT MAKES HIM DIFFERENT** — **The most weapons on any figure in the game** — a gun, a sword and a shield all at once, plus grenades and a gadget — and the lowest threat rating. Everything he has is issued, and he is still terrifying.
- **HOW HE FIGHTS** — **Zoner** at long range, moderate aggression, never leaves the ground. THE TACTICIAN. Resting temperament: flat, low volatility.

## GALE — *The Last Ranger*

- **CIVILIAN IDENTITY** — Gwendolyn Alderwood, Inverness, United Kingdom.
- **ORIGIN** — Skilled. No powers.
- **WHAT THEY LOOK LIKE** — **SLIGHT**: one of the five smallest-tier frames — short, wiry, a proportionally larger head. A muted forest-green suit (`#3d7335`) over darker moss legs and armour (`#32561c`) — woodland, not costume. Yellow-green glow (`#a5e86f`) on emblem, belt, fists, boots and eyes. A **headband**, a **real bow held out in the left hand** (a vertical arc with a visible string), and a **knife in the right hand with a glowing green blade**. Tan skin (`#d8a878`). Grounded; vaults to evade. **Archers get their own draw pose** — the figure genuinely pulls the string back.
- **WHAT THEY DO** — A **draw-scaled longshot: hold it longer, the arrow hits harder** — firing real arrow meshes, not energy orbs — and a **switchable quiver of broadheads: poison that bleeds, flame that burns, explosive that erases, acid that eats armour, and a sleeping dart.** Plus a concussion shot, the ranger knife as a slash, a deadeye buff, an arrow storm, and a carried field medkit.
- **WHAT MAKES THEM DIFFERENT** — **The only fighter who chooses their damage type mid-fight.** Five payloads on one weapon; nobody else can answer an armoured chassis, a poisonable human and a burnable target from the same slot.
- **HOW THEY FIGHT** — **Artillery**, at nearly the longest preferred range on the roster, and never off the ground. THE TACTICIAN. Resting temperament: flat, low volatility.

## SANDRA — *The First Jackal*

- **CIVILIAN IDENTITY** — Sandra Vance, Los Angeles, USA. Canon: "Its Voice", the first Jackal.
- **ORIGIN** — Skilled. No powers.
- **WHAT SHE LOOKS LIKE** — **LIGHT** frame. A near-black blue-slate suit (`#31344a`) over dark antique-gold legs and coat (`#6b5824`). Amber glow (`#ffb649`) on emblem, belt, fists, boots and eyes. Her silhouette is **a long coat skirt to below the knee, a headband, and a pistol in each hand** — the two pistols are the read, matte and unglowing. Deep brown skin (`#7a5238`). Grounded; a full three-tier punch. She plants an **extraction beacon** as a gadget — a tripod she can recall to from anywhere.
- **WHAT SHE DOES** — Twin pistols, a suppressed SMG, **The Ring Sees — a buff that reveals every enemy through walls, because the ring reads every camera on Earth**, a pistol whip, a **tracker round that puts you to sleep**, and a Clean Extraction rush. Her throws drain a little life back into her.
- **WHAT MAKES HER DIFFERENT** — **The only fighter with a wallhack**, and the only one who plants an escape route *before* the fight starts. She hunts living superweapons for a living and has no powers to do it with.
- **HOW SHE FIGHTS** — **Zoner** at medium-long range. THE TACTICIAN. Resting temperament: flat, low volatility.

## KNIGHTFALL — *The Night Itself*

- **CIVILIAN IDENTITY** — Elliot Wexler-Kane, Chicago, USA.
- **ORIGIN** — Skilled. No powers.
- **WHAT HE LOOKS LIKE** — **STANDARD** frame. Near-black blue-slate suit (`#2b3447`) over a marginally lighter blue-grey for legs, hood and coat (`#3d4a5d`), plus a **near-black navy cape** (`#212c44`) — as dark a figure as ONYX, and the only one whose cape is darker still than the suit. Warm gold glow (`#ffd557`) on emblem, belt, fists, boots and the **glowing visor bar** — and he is the only fighter with **both a raised hood and a visor**, so the face is a shadowed cone with a single gold slit across it. Plus a **standing collar**, **gauntlets**, and a **long coat skirt**. Ordinary skin (`#e8c39a`), almost none of it showing. Grounded, but: the **cape works as a glider** — falling with the ascend key held, he slows to a controlled descent with better air control, and the cape reads as wings. A reinforced guard.
- **WHAT HE DOES** — Fans of **matte steel batarangs**; a cross-counter punch; a **smoke vanish that teleports and leaves a blinding cloud where he departed**; **caustic charges — proximity mines that corrode armour**; a **grapnel line that zips him to a roofline, mantles it, or leaves him hanging from a ledge**; and a deployable wing-support turret. Carries a line beacon.
- **WHAT MAKES HIM DIFFERENT** — **The movement kit is unique to him**: nobody else has a grapnel line, and nobody else has a glider. He is the only fighter who gets *above* the fight without being able to fly. He also has the roster's only mines.
- **HOW HE FIGHTS** — **Zoner** at medium range. THE TACTICIAN. Resting temperament: flat, low volatility.

## TALON — *The First Sidekick to Outgrow the Shadow*

- **CIVILIAN IDENTITY** — Teodoro Almeida, Lisbon, Portugal.
- **ORIGIN** — Skilled. No powers. Raised in a circus, trained by the night.
- **WHAT THEY LOOK LIKE** — **STANDARD** frame. Near-black slate-navy suit (`#2d2b47`) over a **deep indigo-blue** for legs and armour (`#2415a0`) — **that secondary is flagged in the gaps section** as sitting in the violet band. Bright cyan glow (`#46cbff`) on emblem, belt, fists, boots and eyes — the brightest cool accent on any dark figure. A **headband** and **a knife in each hand, both with glowing cyan blades** — read them as the escrima sticks. Ordinary skin (`#e8c39a`). Grounded; evades with a quadruple somersault. Full three-tier punch. Carries a circus medkit.
- **WHAT THEY DO** — Escrima crosses, a Flying Grayson rush, a fan of thrown wing-dings, a staff sweep, a flow-state buff, and a Finale Routine rush.
- **WHAT MAKES THEM DIFFERENT** — Two rushes and two melee strikes out of seven slots and **not one power among them** — and they hold the bottom of the threat scale alongside SARGE and GALE while fighting at rusher range against people who can level a block.
- **HOW THEY FIGHT** — **Rusher** at very short range. THE CHALLENGER. Resting temperament: content, ordinary volatility.

## RAMIRO — *The Clown-Sheriff*

- **CIVILIAN IDENTITY** — Ramiro Ontiveros, Ciudad Juárez, Mexico. Canon: a heavyset cop in clown makeup who terrorises the cartels one district at a time. *"My son has to go home."*
- **ORIGIN** — Skilled. No powers.
- **WHAT HE LOOKS LIKE** — **STANDARD** frame — note the blurb calls him heavyset while the engine builds him at baseline. A strong royal blue suit (`#2a56f0`) over **bone-cream legs and coat** (`#e6e0ce`), with a **coral-red glow** (`#ff6657`) on emblem, belt, fists, boots and eyes — the blue-and-cream of a police uniform with the red of the makeup. A **long coat skirt**, a **headband**, and a **double-barrelled shotgun in the right hand**. Tan skin (`#d8b088`) — **and the face is painted**, which is the character: the data does not describe the makeup, but the epithet and blurb require it. A reinforced guard. Grounded. Carries **flash rounds** as a gadget.
- **WHAT HE DOES** — A riot scattergun, a service revolver, a nightstick, a **tumbling gas canister with a blinking fuse**, a buff called *My Son Goes Home*, and **Backup Called — he summons other officers.**
- **WHAT MAKES HIM DIFFERENT** — **The only fighter who calls the police as an ability.** Everything he has is police issue: two guns, a stick, gas, flashbangs, and a radio.
- **HOW HE FIGHTS** — **Zoner** at medium range. THE TACTICIAN. Resting temperament: flat, low volatility.

---
---

# ALIEN — not from here, and not built like anything that is

*Four. No hospital on this world will admit them.*

---

## VEGA — *Fallen Prince*

- **CIVILIAN IDENTITY** — Adrián Vega y Castillo, Seville, Spain.
- **ORIGIN** — Alien.
- **WHAT THEY LOOK LIKE** — **POWERFUL**: broad and thick, an imperious build. **PALETTE FLAG: the primary is `#602af0`, a saturated blue-violet.** That is the clearest non-KIVULI violet in the roster and it needs a ruling before art is commissioned, so it is **not described here as a colour to paint** — see the gaps section. The rest of the palette is sound and can be worked from: legs and armour in a **pale sage-cream** (`#d3d9bc`), a **warm marigold glow** (`#ffbc24`) on emblem, belt, fists, boots and eyes, ordinary skin (`#e8c39a`). One **pauldron**, **gauntlets**, and a **standing collar**. Full flight (engine default — not explicitly declared).
- **WHAT THEY DO** — A left-right-left-right blaster volley; a **charged lance beam with a visible spiral wound down the shaft** — twenty-six orbs spinning three and a half turns along it, which is his and nobody else's; a **Nova Burst charge whose orb grows physically bigger the longer it is held, cracking the ground where it lands**; a rush combo; a pride buff; and the Final Arc as a wide charged ultimate.
- **WHAT MAKES THEM DIFFERENT** — **The only beam in the game with a spiral.** Mechanically he is the charge specialist — the size of what he throws is a decision he makes with the trigger, not a fixed number.
- **HOW THEY FIGHT** — **Beamer** at medium-long range, high aggression. THE PROFESSIONAL. Resting temperament: flat, low volatility.

## NOVA — *Star Sovereign*

- **CIVILIAN IDENTITY** — Novalie Strand, Tromsø, Norway.
- **ORIGIN** — Alien.
- **WHAT THEY LOOK LIKE** — **STANDARD** frame. A warm coral-orange suit (`#ff9149`) over dark chestnut legs and armour (`#613419`), and a **bright orange cape** (`#fa6006`). Gold glow (`#ffd557`) on emblem, belt, fists, boots and the **glowing visor bar** of a **full helmet** with one **pauldron**. The face is a helmet-and-visor mask; the eyes never show. Ordinary skin (`#e8c39a`) on the forearms. Full flight (engine default — not explicitly declared) with a white-and-cyan afterburner. **Rated at the top of the threat scale.**
- **WHAT THEY DO** — A precision star-lance beam, a Nova Core charge whose orb grows as it is held, a heavy plasma orb lobbed on an arc, a solar-wind cone that pushes and lifts, an ember spray, and **Meteor Storm — fourteen impacts rained across a wide area.**
- **WHAT MAKES THEM DIFFERENT** — The **highest-preferred-range fighter on the roster**. NOVA's plan is to be somewhere you cannot reach and drop the sky on you, and they hold one of only three top-of-scale threat ratings.
- **HOW THEY FIGHT** — **Artillery**, from the longest distance in the game, low aggression. THE TACTICIAN. Resting temperament: flat, low volatility.

## VANGUARD — *The Invincible*

- **CIVILIAN IDENTITY** — Viktor Andreyev, Volgograd, Russia.
- **ORIGIN** — Alien.
- **WHAT THEY LOOK LIKE** — **HEAVY**. **Electric ultramarine blue suit** (`#190aff`) — the most saturated blue on the roster — over **pale sage-cream legs and armour** (`#d4d9bc`), with a **burnt-orange cape** (`#dd6909`). Gold glow (`#ffd557`) on emblem, belt, fists, boots and the **glowing visor bar** of a **full helmet**, with **double spiked pauldrons** and **gauntlets**. Ordinary skin (`#e8c39a`) on the forearms only. Full flight (engine default — not explicitly declared). A **deflect** guard — the plate in front is gold and returns bullets and arrows to the shooter. Jab and haymaker only.
- **WHAT THEY DO** — A ruby **eye beam fired from the face**; a **flying tackle that rams across the sky**; a thunderclap cone; an aerial sky-combo rush; and **two separate buffs that make him briefly, genuinely untouchable.**
- **WHAT MAKES THEM DIFFERENT** — **Two invulnerability windows in one kit** — nobody else has more than one — plus a deflecting guard on top. And the most airborne fighter on the roster: his doctrine puts him in the air more than anyone.
- **HOW THEY FIGHT** — **Rusher** at short range with very high aggression, almost always in the air. THE ZEALOT. Resting temperament: already angry, high volatility.

## MARSHAL — *The Last Son of a Dead World*

- **CIVILIAN IDENTITY** — "John Marsh", a refugee of a dead world; Denver (adopted), USA.
- **ORIGIN** — Alien.
- **WHAT THEY LOOK LIKE** — **HEAVY**. A saturated green suit (`#28bb39`) over near-black blue-slate legs and coat (`#31384a`), with a **deep navy cape** (`#1534a0`). Pale sky-blue glow (`#86d6ff`) on emblem, belt, fists, boots and eyes. **Green skin** (`#5faf6a`) — head, neck and forearms are not human tone. A **long coat skirt** and a **standing collar**: the flat-coated figure, plus a cape. Full flight. Goes translucent when phasing.
- **WHAT THEY DO** — An **alien vision beam that siphons power as it burns**, a density hammer punch, on-demand **intangibility**, a mind-skip teleport, a resolve buff, and **Dominion — the only mind control in the game: it flips a bot onto their team for a few seconds.** Drifts through attacks as a ghost to evade.
- **WHAT MAKES THEM DIFFERENT** — **The only fighter who can take an opponent away from you and point them at you.** Dominion never works on humans, never on police, never on training dummies — minds only. They are also the only phasing fighter who is also a heavyweight and also caped.
- **HOW THEY FIGHT** — **Trickster** at medium range. THE WILDCARD. Resting temperament: keyed-up, high volatility.

---
---

# ROBOTIC — a machine, whatever else it also is

*Two. A hospital will get them running; only a workshop can finish the job.*

---

## SPECTER — *The Synthezoid*

- **CIVILIAN IDENTITY** — Unit SPC-3 (synthezoid), Cambridge, United Kingdom.
- **ORIGIN** — Robotic.
- **WHAT THEY LOOK LIKE** — **STANDARD** frame. Note carefully: **SPECTER is robotic but is NOT flagged `metal`, so the skin slot is used normally** — head, neck and forearms are a **cold grey-blue** (`#b9c6cc`), a synthetic flesh tone rather than chrome. A jade-green suit (`#28bb83`) over a **vivid orange-red** for legs, hood and armour (`#e0331b`) — the highest-contrast pairing on the roster, green against red. Pale yellow glow (`#ffe270`) on emblem, belt, fists, boots and the **glowing visor bar**. And they are one of only two fighters with **both a raised hood and a visor**: a shadowed cone over the head with a single glowing slit. A **standing collar** under it. Full flight (engine default — not explicitly declared). Translucent while phasing.
- **WHAT THEY DO** — A **solar beam their signature line places at the forehead**; a density punch; **intangibility**; a stone bolt; **Max Density — a buff that grants real invulnerability frames**; and a Solar Nova charge. Slips through attacks as a phase to evade, with long invulnerability frames.
- **WHAT MAKES THEM DIFFERENT** — **Density is a dial, not a state.** They are the only fighter who can be intangible *or* diamond-hard from the same body — the two ends of one power, occupying two of their seven slots.
- **HOW THEY FIGHT** — **Trickster** at medium range. THE WILDCARD. Resting temperament: keyed-up, high volatility.

## TITAN — *The War Engine*

- **CIVILIAN IDENTITY** — Unit T-1TAN (war engine), Detroit, USA.
- **ORIGIN** — Robotic.
- **WHAT IT LOOKS LIKE** — **HEAVY**, and **metal — no visible skin**: head, jaw, neck and forearms all render in the secondary at high metalness, a **dark blue-slate** (`#3e3d5d`), against a **muted grey-blue-slate** chest and upper arms (`#62658b`). Warm orange glow (`#ffa23b`) on emblem, belt, fists, boots and the **glowing visor bar** of a **full helmet**, with **double spiked pauldrons**, **gauntlets**, and a **pulse rifle built into the right fist** — a boxy body, a barrel and a glowing muzzle, mounted rather than held. Cold grey (`#8a919c`) is nominally its skin colour and is discarded. Levitates. Its **energy never runs out** — the HUD shows an infinity core — and the trade is a hard cap on its power tier partway up the ladder. Armour that showers **sparks instead of blood**, and thruster exhaust. Not a man.
- **WHAT IT DOES** — A wide charged **twin cannon** beam; the pulse rifle on automatic; a **Reactor Burst charged at an aperture in its chest**, not in a fist; a vent-blast cone; an overdrive-core buff; and the **Annihilator Array** as a charged ultimate. **Deflect** guard — the plate in front is gold and returns bullets. Jab and haymaker only.
- **WHAT MAKES IT DIFFERENT** — **The armour benchmark of the roster.** Ballistic damage that kills a person does almost nothing to it — a shotgun blast that would down a civilian outright registers as nothing at all — which is what makes the armour-eating acid type matter. It is also one of only two bottomless-energy fighters and the only one that charges from its chest.
- **HOW IT FIGHTS** — **Beamer** at long range. THE PROFESSIONAL. Resting temperament: flat, low volatility.

---
---

# SYMBIOTIC — two things sharing one body

*Two. Treat the host and you may be fighting the passenger.*

---

## KRAKEN — *The Abyss Given Form*

- **CIVILIAN IDENTITY** — Rógvi Djurhuus, Tórshavn, Faroe Islands.
- **ORIGIN** — Symbiotic.
- **WHAT THEY LOOK LIKE** — **HEAVY**. A bright deep-cyan suit (`#01a1bc`) over dark teal legs and armour (`#026575`). Bright aquamarine glow (`#57ffd7`) on emblem, belt, fists, boots and eyes. A pair of **curved horns** on the head and a **standing collar**. The skin is a **muted sea-green grey** (`#7fb8ac`) — not a human tone. And the defining feature: **four living tentacles**, each a tapering chain of nine segments in near-black teal (`#0b4a54`) tipped and lit toward bright aquamarine (`#4affd4`), drifting in the water even at rest and lashing out to full reach when they are used. **Draw them in world space, moving on their own** — they are not part of the pose. A clumsy flier. Very deep voice. Jab and haymaker only.
- **WHAT THEY DO** — The tentacles **reach, seize, drag you in and hurl you at the nearest wall** — the slam does the damage. Plus a wide slashing riptide lash, a **corrosive ink cone that eats armour**, an abyss bolt, a deep-hunger buff, and a Leviathan Maw charge. Their throws drain life back into them.
- **WHAT MAKES THEM DIFFERENT** — **Four independently simulated limbs** — the most on the roster, and one of only two fighters whose silhouette moves on its own (MOSES has three, shorter and thinner). Also one of only four sources of armour-eating acid.
- **HOW THEY FIGHT** — **Grappler** at short range, high aggression. THE PREDATOR. Resting temperament: already angry, high volatility.

## MOSES APIO — *The Atlas Protocol*

- **CIVILIAN IDENTITY** — Moses Apio, Gulu, Uganda. Canon: a young Mbarara mechanic bonded to the Atlas Protocol symbiont.
- **ORIGIN** — Symbiotic.
- **WHAT HE LOOKS LIKE** — **POWERFUL** frame. A saturated green suit (`#28bb39`) over near-black blue-slate legs and armour (`#2b3247`). A bright yellow-green glow (`#a4ff65`) on emblem, belt, fists, boots and eyes. His head carries **both curved horns and a two-piece crest** — a genuinely alien profile — plus **gauntlets**. Deep brown skin (`#5a3a28`). And **three living tentacles**, shorter and thinner than KRAKEN's: eight-segment chains in near-black forest green (`#14361f`) lit toward bright green (`#9dff5a`), which move on their own. A clumsy flier.
- **WHAT HE DOES** — The tendrils **reach, seize, drag and hurl you into a wall**; a symbiont fist; a protocol-surge rush; a bio spike; a **regenerative bond buff**; and **FULL BOND** as an ultimate buff. His throws feed a little life back to him. He shifts with the symbiont to evade.
- **WHAT MAKES HIM DIFFERENT** — The **younger, smaller, greener** tentacle fighter — three limbs to KRAKEN's four, and both his ultimate and his fifth slot are buffs, so his kit is about *becoming more bonded* rather than about damage. The blurb is explicit that the passenger watches.
- **HOW HE FIGHTS** — **Grappler** at short range. THE PREDATOR. Resting temperament: already angry, high volatility.

---
---

# WHAT I COULD NOT DETERMINE

Named explicitly, so nothing below gets invented downstream.

### Absent from the data entirely

1. **No physical descriptions.** There is no height, weight, age, hair colour, hair style, eye shape, facial structure, ethnicity, body-type prose or costume prose anywhere in `characters.js`. Everything in the "what they look like" sections is derived from the palette slots, the `BUILDS` flourish table, and the frame ladder. **A face is not specified for any of the 52.**
2. **No pronouns as data.** Only 26 of 52 blurbs happen to use one. `identities.js` gives a civilian name and nothing else. There is no gender or pronoun field.
3. **No ages.** Not one fighter carries `def.age` or `def.born`. `data/age.js` exists and derives an age from a hash of the id, so ages are *generated*, not authored. The single exception is prose: OLYMPUS's identity line says "age 13".
4. **No authored personalities or temperaments.** No fighter carries a `personality` field. Every personality and resting temperament in this document is **derived** by `derivePersonality` from AI style, aggression and threat rating — so, for example, all sixteen TACTICIANs are tactician-by-inference, not by authorship. Only 8 of the 20 types come out of that derivation (CHALLENGER 12 · TACTICIAN 16 · WILDCARD 7 · ZEALOT 6 · PROFESSIONAL 4 · PREDATOR 4 · GUARDIAN 2 · PROVER 1); the other twelve — THE BULLY, THE OPPORTUNIST, THE SCAVENGER, THE CLOSER, THE RIVAL, THE COWARD, THE MERCILESS, THE AVENGER, THE SENTINEL, THE FINISHER, THE MADMAN, THE VULTURE — are carried by nobody on this roster.
5. **No authored proportions.** No fighter carries `def.frame` or `def.archetype`. Frames are strength-derived only.
6. **No `teleEscape` carrier.** The trait is implemented and documented ("teleport-escape heroes blink out of a grab") and **no fighter on the roster has it.**
7. **RAMIRO's clown makeup is not in the data.** The epithet is "The Clown-Sheriff" and the blurb says "a heavyset cop in clown makeup", but there is no makeup field, no face colour, and no pattern. An artist must invent the makeup; flagging it so the invention is a deliberate decision.
8. **KRAKEN's, APEX's, MARSHAL's, RAGE's and MOSES's non-human skin tones are colours, not descriptions.** The data says green or sea-grey; it does not say scaled, chitinous, veined or smooth.

### Defects found while reading the sources

9. **The three archetype frame overlays in `frameOf` cannot fire.** They contain literal 0x08 backspace bytes where `\b` word boundaries were intended, so the speedster/archer trim, the giant boost and the child shrink are all dead. Consequences worth knowing before commissioning: **OLYMPUS is stated to be thirteen years old and is currently built as a heavyweight adult**; MOSES and BULWARK are intended to be taller; GALE, VOLT, WEBLINE, STORMCALL, TEMPEST, TALON and JELANI are intended to be leaner. RAGE is unaffected — the dead regex is what currently keeps him from being built as a child, which was the original bug this code was written to fix.
10. **`docs/ROSTER.md` contradicts `identities.js` on nationality for at least seven fighters.** ROSTER.md's "Country / Voice" column says VEGA is Japan (identities: Spain), RIME Norway (Iceland), HIVE Brazil (Slovenia), PYRE Mexico (Australia), KRAKEN Ghana (Faroe Islands), RIFT South Korea (India), TITAN Germany (Detroit, USA). **This document uses `identities.js`**, which is the file the engine actually merges into `def.person`. ROSTER.md should be corrected or marked superseded.
11. **`docs/ROSTER.md` also has stale threat ratings** — it lists MYSTWARD and GRAVEN differently from the live data in places, and it only covers 22 of the 52 in table form.

### The no-purple audit

`#4a2a80` / `#1e1038` / `#b06aff` on **KIVULI** are the sanctioned canon exception and are described normally. Four other palettes carry hues in or adjacent to the violet band. **These are flagged, not described, and each needs a ruling:**

| Fighter | Slot | Hex | Hue / sat / light | Assessment |
|---|---|---|---|---|
| **VEGA** | primary | `#602af0` | 256 / 87 / 55 | **The clear violation.** A fully saturated blue-violet, and it is his *primary* — the largest colour area on the figure. His RMB is also literally named "Violet Lance" (its actual beam colours are blue). Needs replacing before art is commissioned. |
| **WEBLINE** | secondary | `#3015a0` | 252 / 77 / 35 | Deep indigo-violet. Paints legs and armour — a large area. Needs a ruling. |
| **TALON** | secondary | `#2415a0` | 246 / 77 / 35 | Effectively the same colour as WEBLINE's. Same ruling applies. |
| **VOLT** | secondary | `#38314a` | 257 / 20 / 24 | Near-black with a faint violet cast. Reads as charcoal in practice; lowest risk of the four. |
| **AEGIS** | primary | `#e60653` | 339 / 95 / 46 | At the magenta edge of red. Reads as raspberry crimson, not purple. Listed for completeness. |

### Things I deliberately did not do

- I did not assign faces, hairstyles, ages or ethnicities.
- I did not invent replacement colours for the flagged palettes.
- I did not repair the `frameOf` regexes — this was a documentation task, and the defect is reported above with its consequences instead.

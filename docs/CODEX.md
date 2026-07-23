# THE CODEX — power taxonomy & schema (v1)

The engine's spine: every power is an entry with the SAME fields, so the character creator, the
per-ability AI, tournament legality, balance sheets, and the in-game encyclopedia all read one format.
Gravity-control and black-hole are two different entries — never one vague "gravity guy."

## Entry schema

```js
{
  type: 'beam',              // mechanical family — one of the 20 registered TYPES (below)
  name: 'Heat Ray',
  // --- cost model (pick one) ---
  cost: 4, cd: 0.3,          // ki + cooldown (default)
  kiPerSec: 16,              // sustained drain
  // ammo: {mag: 30, reload: 1.8}   [RESERVED] guns-as-ammo instead of ki
  // fuel: 'jetpack'                [RESERVED] gadget fuel pools
  // infinite: true                 (android cores: no cost, tier-capped)
  // --- damage identity ---
  dmgClass: 'force',         // force (pushes) | piercing (holes, ignores guard slice) | energy | elemental
  element: 'heat',           // heat | cold | shock | poison | gas | none — drives status effects
  // --- geometry ---
  bands: [0, 1, 2, 3],       // [RESERVED] altitude bands reachable: ground/building/sky/clouds
  // --- AI intelligence lives ON the ability ---
  ai: { range: [20, 120], role: 'poke',      // poke | burst | zone | escape | finisher | setup
        synergy: ['fly-strafe'] },           // tags composed per-kit: gun+fly ⇒ strafe-chase, beacon ⇒ bait-swap
}
```

## The 20 mechanical families (TYPES registry, `engine/abilities.js`)

| Family | What it is | Examples in-roster |
|---|---|---|
| `beam` | traveling-tip hose (thin=piercing, wide=force) | Heat Ray, Wave Cannon, Twin Cannon |
| `projectile` | single bolt/lob (homing, grav, payloads) | Ki Blast, Graviton, Creeping Cloud |
| `volley` | rapid alternating spray | Bakuhatsu, Arrow Storm |
| `cone` | breath — cold (freeze), force (push), gas (DoT) | Arctic Breath, Choking Veil |
| `charge` | hold-to-grow orb + shockwave | Big Bang, Asphyxia |
| `spiritbomb` | grow overhead, hurl | Spirit Bomb, Singularity |
| `melee` | lunging strike (dmgClass slash for blades) | Sky Smash, Plasma Blade |
| `rush` | teleporting multi-hit combo | Dragon Rush, Lightning Flurry |
| `teleport` | blink to aim | Instant Transmission |
| `dash` | i-frame burst | Super Dash |
| `phase` | hold intangibility | Gas Form, Intangibility |
| `buff` | transform/power-up | Solar Overload, Overdrive Core |
| `summon` | autonomous allies | Drone Swarm |
| `construct` | steered solid-light objects | Will Fist (grab-slams), Solid Smoke |
| `meteor` | sky artillery at aim | Meteor Storm, Airstrike |
| `tentacle` | seize → drag → wall-slam | Abyssal Grab |
| `portal` | paired doors (fighters + projectiles pass) | Dimensional Door |
| `rifle` | auto-fire tracers, recoil | Pulse Rifle, Pulse Carbine |
| `bow` | draw-scaled arrow + payload | Longshot |
| `quiver` | payload selector | Switch Broadheads |

## Character-level fields (the identity layer)

`strength` 1–10 · `overdrive` 0.6–1.6 · `threat` (LeFevre) · `guardType` block/deflect/barrier ·
`meleeTiers` 2/3 · `flightTier` 0–3 · `flyStyle` fire/ice/exhaust · `energyInfinite` · `metal` ·
`tentacles` · `thorns` · `grabHeal` · `phase` · `frostResist` · `guardStrong` · `evade` {kind…} ·
`tier` (earned in-match, I→MAX)

## Status effects (element outputs)

| Status | Source | Counterplay |
|---|---|---|
| **Frozen** (encased) | sustained cold | Strength melts out; fire heroes resist; blink out for 20 ki; allies shatter you free (1.3× dmg) |
| **Burn** | flame payloads | outlast it (2.5s) |
| **Poison** | poison payloads | outlast it (4s) |
| **Gas** | KIVULI | outlast it; don't stand in the cloud |
| **Chill** | cold cones | slows until it fades |
| **Stagger** | guard break / guard crush | eat it — you got outplayed |
| **Drained** | ran the tank dry | Overdrive: land fists to refill |

## Damage-class rules (v1 — partial, being implemented per DESIGN_DECISIONS)
- **Force** shoves — resisted by Strength; slams into geometry (slam damage system).
- **Piercing** ignores a slice of guard reduction and HOLES cover instead of cratering it. Bullets are piercing.
- Only the strongest beams (Might × energy-in) **eat** piercing projectiles that fly into them.
- Elemental rides on top of a class (heat beam = energy+heat; freeze breath = elemental cold).

## The tabletop layer (data/ranks.js) — SHIPPED

**The universal rank ladder** — one 10-step table every attribute reads from:
Civilian · Trained · Exceptional · Enhanced · Superhuman · Paragon · Devastating · Cataclysmic ·
Planetary · Cosmic. Rank badges render on the character sheet, color-coded.

**Seven attributes**, each with a real engine hook (derived from hero data; `def.attrs` overrides
any value — that's the character creator's dial):

| Attribute | Engine effect |
|---|---|
| Fighting | jab/straight damage (`jabMult`) |
| Agility | evade cooldown recovery |
| Might | knockback resistance, throws, slam weight (= `strength`) |
| Vigor | derived from hp/armor — durability rating |
| Intellect | ability AND gadget cooldowns (`cdMult`) |
| Awareness | fog-of-war vision range (`visMult`) |
| Resolve | ki + guard regen, stagger/ice shake-off (`ccRecover`) |

**Talents** (1–3 per hero, `HERO_TALENTS` or kit-derived): Marksman (tighter spread), Martial Artist,
Demolitionist (+blast), Acrobat, Iron Will, Tactician (−cd), Field Medic (+healing), Brawler (faster
haymaker wind-up), Survivor (Overdrive opens at 35% ki), Commander (+summon duration), Predator
(+15% vs foes under 30%).

**Gadget inventory** (`def.items`, X button, charges per life, refilled on respawn):
beacon (plant → recall) · medkit · flashbang (staggers + wipes AI memory) · jetcell (temporary full
flight for grounded heroes) · shieldpack (ablative pool that soaks hits before hp).

**New power families this pass:** `mine` (plant up to 3 proximity charges), `lifedrain` (held siphon,
damage → self-heal), and the `boomerang` projectile flag (out, clip, and return — hits both passes).

Balance is now auditable: see `BALANCE.md` for the AI-vs-AI method + the first audit's rulings.

## Next codex steps
1. Auto-generate a per-hero codex page from `data/characters.js` (script → `docs/codex/<id>.md`).
2. Fill `dmgClass`/`element`/`bands`/`ai` on every existing ability (data-only pass).
3. The character creator reads and writes THIS schema — live damage preview + auto LeFevre rating.

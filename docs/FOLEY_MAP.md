# 🎬 FOLEY MAP — game content → sound

_A foley pass over what's actually IN the game (vehicles, guns, missiles/artillery, generators,
destructibles), mapped to the sounds we now have, with the remaining gaps. Companion to
`AUDIO_CATALOG.md`. 2026-09-13. Nothing wired._

## Vehicles (real roster in the game)

| Vehicle (id · name) | Sound events | Use what we've got | Gap |
|---|---|---|---|
| `scout` · XENO SCOUT (drivable) | start · idle · accel · brake · door · crash | **sfx-veh** (all of it) | low-bitrate — upgrade later |
| `willtank` · WILL TANK | engine/track loop · cannon fire · turret rotate · hit | tracks ← `rolling` (30-loops) · cannon ← `boom.deep` + shotgun body · hit ← `veh.impact` | dedicated tank cannon + track detail |
| `gunship` · ATTACK HELICOPTER | rotor loop · chaingun · rocket | rotor ← baseline **`rotor`** · gun ← real `wpn.saw`/`wpn.ak` · rocket ← *missiles below* | — |
| `lightheli` · LIGHT HELICOPTER | rotor loop | baseline **`rotor`** | — |
| `quinjet` · QUINJET (VTOL) | jet/thruster loop · flyby | baseline **`jet`** + ai-pass `flyby` · thruster ← `fire.roar` | — |
| `convoy-cargo` · RESEARCH CARGO | diesel idle loop | `gen.hum`/machine loop or `veh.idle` | truck-specific engine |

**Reuse win:** the baseline soundscape already carries **`rotor`** and **`jet`** layers — the helicopters
and the Quinjet are largely covered by what's live today.

## Guns / blades / gear (armory → sound)

| Firearm | Sound source |
|---|---|
| `ak` · `m16` · `saw`/`mp5`/`pdw` · `p9`/`machinepistol` · `magnum` · `m24`(bolt) · `battle` · `pump`+`auto12`(shotgun) | **real CC0 fires** (sfx-cc0 final: wpn.ak/m16/smg/saw/pistol/bolt/battle/pump + real cock) |
| `m107`(anti-materiel) · `kuchler` | ai-pass arsenal (AI) — or source a real .50-cal later |
| blades `katana/knife/claws/tomahawk/nodachi/baton` | ai-pass blade swings + **real swishes** (sfx-cc0b `blade.slash`); flesh cut ← `slash.flesh` |
| gear `frag/claymore/breach/flashbang/plate/shield/beacon/ifak/jammer/motion/thermal/nvg/rappel/teargas/mustard/smoke` | ai-pass arsenal gear one-shots + loops |

Every weapon has a sound. The "see the gun → hear the sound" review UI Robert wants is a small future
screen that lists each `armory.js` id beside its bound file (like the arsenal manifest already does).

## Missiles / rockets / artillery (by type — "depends what type of missile")

| Type | Launch | Impact | Have? |
|---|---|---|---|
| `Anti-Armor Rocket` · `Rocket Boots` | rocket whoosh (**GAP**) | `boom.deep` | impact ✅ / launch ❌ |
| `Micro-Missiles` · `Seeker Micro-Missiles` | small missile hiss × volley (**GAP**) | small `boom` | impact ✅ / launch ❌ |
| `Artillery` · `Sky Artillery` · `Beam Artillery` · `Charge Artillery` | distant launch thump | **`distant-explosion`** (ai-pass) — perfect | ✅ |
| `Airstrike` | jet flyby (baseline `flyby`) | big `boom` + debris | ✅ |

**The one real content gap this pass surfaced:** a **rocket / missile LAUNCH whoosh** (and ideally 2–3
weights: a big anti-armor rocket vs. a swarm of micro-missiles). Distant artillery and all the impacts
are already covered.

## Generators / destructibles / hazards

| Object | Idle / ambient | Hit → destroy |
|---|---|---|
| `GENERATOR` | **`gen.hum`** loop (new ambient) | metal hit (`veh.impact`) → `boom` |
| `FUEL` (fuel farm, fire hazard) | fire crackle ← `fire.roar` when lit | `boom.deep` + fire |
| `turret` | servo hum (**minor GAP**) | metal + `boom` |
| `aa-barrel` (anti-air) | — | `boom` |

Generators now have a proper hum bed + a hit + a destruction. Only a turret servo is missing (minor).

## Remaining real gaps after the foley pass (all optional / small)
1. **Rocket/missile LAUNCH whoosh** — 2–3 weights (anti-armor vs micro-swarm). Sourceable as CC0.
2. **Tank cannon + track** detail (currently `boom.deep` + `rolling` stand-ins).
3. **Turret servo** hum (minor).
4. **Vehicle depth** — higher-quality engine, tire screech, more vehicle types.

Everything else the game contains has a sound assigned. Say the word on the rocket-launch pack and I'll
pull it the same way.

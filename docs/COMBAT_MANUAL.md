# THE COMBAT MANUAL

How damage actually works in WAR WORLD: ASCENDANTS. Every number here is read from the code, not
remembered. If you change the code, change this file in the same commit.

Companion docs: `BALANCE.md` (tuning rulings) · `CODEX.md` (power schema) · `ROSTER.md` (the cast).

---

## 1. THE ONE CHOKE POINT

Almost all damage flows through **`entity.takeDamage(amount, opts)`**. That function is the only
place resistances, guard, armour and intangibility get a vote. If a new mechanic doesn't route
through it, that mechanic ignores every defence in the game.

`opts` is the damage event. The fields that matter:

| field | meaning |
|---|---|
| `src` | who did it — drives kill credit, guard arc, police heat |
| `strike` | a melee hit (blocked hard, triggers the block law) |
| `dot` | sustained source: beam, cone, lifedrain, DoT tick |
| `ballistic` | a bullet — goes through the armour/toughness filter |
| `unblockable` | ignores guard (grabs, slams) |
| `trueDamage` | ignores shields and phase |
| `kb` | knockback vector, scaled by the victim's STRENGTH |
| `hitstop` | freeze frames. **`?? 0.04`, never `\|\|`** — an explicit `0` must survive |
| `dtype` | **the damage TYPE** (see §3) |

### The order of operations

Damage is filtered in this exact sequence. Anything that returns early never reaches HP.

```
1. remote?          → victim's own machine owns their HP; just spark + remember the attacker
2. dead / invuln?   → 0
3. Predator talent  → ×1.15 if the target is under 30% HP
4. BALLISTIC filter → minus flat ARMOUR, then × toughness from STRENGTH
5. RESISTANCE       → × the victim's resistance to opts.dtype        ← §3
6. SHIELD PACK      → ablative pool eats it (unless trueDamage)
7. PHASE            → intangible: strikes and shots pass through entirely
8. GUARD            → front arc (or 360° for barrier): strikes to 12%, DoT 50%, else 42%
9. FROZEN           → a heavy hit shatters the ice for ×1.3
10. HP              → and +40% of the damage back as KI (getting hurt charges you)
```

### The ballistic scale

Measured, one shotgun blast: **60** to an unarmoured hero · **10.8** to RAGE (STR 9) · **0**
through TITAN's plate.

- **Armour** (`def.armor`, or `9` flat for `def.metal`) is subtracted per shot and sparks off.
- **Toughness**: at STR ≥ 6, damage × `max(0.12, 1 - (STR-5)×0.17)`. STR 10 takes ~15% from lead.
- Fists, energy and slams **bypass this entirely** — it is only for `ballistic`.

---

## 2. THE PROBLEM THIS MANUAL FOUND

**Damage-over-time never went through `takeDamage`.**

The DoT tick subtracts HP directly:

```js
this.hp = clamp(this.hp - d.dps * dt, 0, this.maxHp);
```

So every poison, burn and gas stack in the game currently ignores:

- armour and toughness — **a poison arrow ticks TITAN exactly as hard as it ticks a civilian**
- `phase` intangibility — you can poison a ghost
- the shield pack
- guard — the 50% DoT block in `takeDamage` never applies, because ticks don't go there
- every resistance, including `frostResist`

That is the honest answer to "acid causes damage — but to what?" **Today the answer is
'everything, equally,' and that's wrong.** A robot should not be poisoned. That's what §3 fixes.

---

## 3. DAMAGE TYPES

Every damage event carries a `dtype`. Every fighter has a resistance table. One multiplier,
applied at the choke point.

| type | sources | what it's for |
|---|---|---|
| `physical` | fists, slams, thrown cars, melee weapons | the baseline — nothing resists it much |
| `ballistic` | bullets, pellets | lethal to people, an annoyance to ascendants |
| `energy` | ki blasts, beams, star spheres | the universal currency — few resistances |
| `fire` | flame arrows, burn stacks, PYRE/TORCH | strong vs flesh, weak vs metal |
| `cold` | frost cones, RIME | builds FREEZE; fire heroes shrug it off |
| `toxic` | poison, gas, KIVULI | **needs a metabolism — machines are immune** |
| `acid` | see §4 | **corrodes ARMOUR; weak against bare flesh** |
| `magic` | MYSTWARD's wand, MARSHAL's telepathy | **attacks the WILL and siphons ki**; resisted by RESOLVE |

### Resistances

`def.resist = { fire: 0.5 }` means "takes 50% from fire". Missing entry = 1.0 = full damage.
Sensible defaults are **derived**, so no hero has to be hand-authored to be correct:

- `def.metal` → `toxic: 0` (immune — no lungs), `fire: 0.6`, `acid: 1.6` (**plate corrodes**)
- `def.armor > 0` → `acid: 1.4`
- `def.frostResist` → `cold: 0.45` (this already existed as a one-off; now it's part of the table)
- fire-flavoured heroes → `fire: 0.35`
- synthetics (no human `def.person`) → `toxic: 0.25`

Hand-authored `def.resist` always wins over a derived default.

### The rule that makes it a system

**A resistance must cut both ways.** Every type that something resists must be a type something
else is *weak* to, or the type is just a nerf. Metal resists toxic and fire — and is *weak to
acid*. That's the trade, and it's why acid is worth carrying.

---

## 4. ACID

**Acid is the anti-armour type.** It is the counter to the exact defence that already exists in
the game (the ballistic scale), which is what makes it a tactical pick instead of another poison.

- **Corrodes.** Acid applies a `corroded` stack that *reduces `def.armor` for its duration*. A
  plated chassis that ate a whole shotgun blast starts taking bullets again.
- **Weak on flesh.** ×0.7 against unarmoured targets. Against RAGE it's a bad choice; against
  TITAN it's the right one.
- **Smokes.** The victim vents a hissing yellow-green smoke plume for the duration — the tell that
  says "their armour is open right now," visible to both players.
- **Machines are not immune** — this is the one damaging status a robot cannot shrug off.

### Who carries it (the §5 protocol in action)

Acid ships on **four** characters, across three different delivery systems, so it is a *mechanic*
and not a gimmick:

- an acid **arrow payload** (joins poison/flame/explosive in the quiver)
- an acid **cone** (a sprayer)
- an acid **pool / mine** (ground denial)
- an acid **projectile** (a lobbed flask)

---

## 5. THE PROTOCOL — adding a new mechanic

The rule Robert set: *"when we add new stuff in, we gotta make it work — put it on a couple
different characters so it's not just one character that can do that thing."*

A new mechanic is not done until all seven hold:

1. **It is a TYPE, not a special case.** It lives in a registry (`TYPES` in `abilities.js`, or the
   `dtype` table) and is driven by data on the def. If it's an `if (def.id === 'x')`, it's wrong.
2. **It routes through the choke point.** Damage goes through `takeDamage` so defences apply.
   (The DoT bug in §2 is exactly what skipping this looks like.)
3. **At least two characters carry it, through at least two different delivery systems** — unless
   it is *deliberately* rare, and that rarity is written down here. One character with a unique
   toy is a gimmick; the same idea on an arrow, a cone and a mine is a mechanic.
4. **It has a counter.** A resistance, a defensive option, or a positioning answer. If nothing
   answers it, it isn't finished.
5. **It is readable.** A VFX tell, a damage number or status pip, and a HUD state. If a player
   can't tell it's happening to them, it didn't happen.
6. **It is in this manual and in the in-game DAMAGE CODEX.** Both, in the same commit.
7. **It is verified headlessly.** A real assertion that the numbers land — not "it looked fine."

---

## 6. THE VERTICAL MODEL — and where submarines go

### What exists

The world is a **heightfield**. `world.heightAt(x, z)` returns the terrain height at any point,
and physics uses it as the floor — so quarry pits, blast craters and the 13u metro trench are all
real, standable ground you can be knocked down into.

The altitude ladder (`ALT_BANDS` / `bandOf` in `entity.js`), measured in world Y:

| band | range | notes |
|---|---|---|
| GROUND | y < 8 | |
| BUILDING | 8 – 150 | rooftops, the tower canyon |
| SKY | 150 – 260 | above the tallest flagship spire |
| CLOUDS | 260 – 320 | 320 is the hard flight ceiling |

1 unit ≈ 0.19 m. A hero is 9.6u (1.8 m).

### What does NOT exist yet, and why

**There is no level below the ground.** The heightfield is a single surface — it can be dented
downward, but it cannot fold over itself, so a *tunnel* (ground above you AND below you) is
geometrically impossible with the current terrain. The metro is an open cut for exactly this
reason: it's a trench with the sky above it, not a tunnel.

Water has the same gap. `world.waterAt(x)` returns `0 | 1 | 2` — dry, shallow, deep — and it is
used only as a **movement drag multiplier**. Water has no *depth*: the surface is a flat plane at
y ≈ 0.34 and there is no seabed, so there is nowhere for a submarine to be.

### The design: extend the ladder downward

The ladder is already the game's spatial vocabulary; the answer is to keep counting past zero
rather than invent a second system.

| band | range | how you get there |
|---|---|---|
| **SUBSURFACE** | terrain − 40 → terrain | the metro cut, quarry floors, craters — **exists now** |
| **DEEP** | seabed → water surface | submarines, aquatic characters — **needs a seabed** |

Two things have to be built, in this order:

1. **Give water a floor.** Extend the heightfield under the harbour so the seabed is real terrain
   that slopes away from the quay. The moment water has a bottom, "depth" is just negative
   altitude and every system that reads `bandOf` works unchanged.
2. **A `submerged` movement state**, gated on `def.aquatic` or a vehicle — the mirror of `flying`.
   Above water it's the existing drag; below it, buoyancy replaces gravity, the fog/vision cone
   shortens, and most ranged attacks lose range. Surfacing is the same event as landing.

**Real tunnels are a separate, larger job** and should not be faked. They need cover volumes with
a *ceiling* — a second surface — which the single-heightfield terrain cannot express. When we want
them, the honest version is a roofed-volume system (the same one interiors need), not a terrain
trick. The metro cut is the 90% version that plays well today.

## 7. CONTROL STATES — mind control

`mindcontrol` (TYPES, `abilities.js`) is the first mechanic that seizes a fighter's WILL rather
than their body. The rules, in the order of what they protect:

- **Minds only.** Works on bots (`foe.ai`), never on humans, never on `def.police` — the wanted
  ladder and fixation targeting must not be puppeteered — and never on training dummies.
- **The flip is loaned, not sold.** The victim keeps `_oldTeam` while `_controlled`; anything that
  DECIDES by team counts a dominated fighter on their ORIGINAL side (the tournament round check),
  and a dominated fighter's KOs never book Elo (`koElo` guard in `handleKO`) — domination turns
  fights, never brackets and never the book.
- **One release path.** Expiry, victim death, and the CONTROLLER's own death (`clearSlotFx`) all
  run the same `releaseMind` in `abilities.js`, restoring team and wiping belief. There is no path
  that leaves a fighter permanently defected — respawn modes depend on this. Never restore `team`
  by hand anywhere else.
- **It reads.** Cast = DOMINATED tag + expanding ring; while held = the victim's stateRing pulses
  cyan (the ground-marker language) + drifting motes; release = a grey collapse ring.
- **The counter** is range and tempo: the seize is a 42u cone on a real ult slot, cooldown (18s)
  outlasts duration (6s), and the victim wakes with a WIPED belief — it has to find the fight
  again, because the AI honesty law applies to dominated bots too.

`nova` (SUPERNOVA) is not a control state but shares one law worth writing down here: **the cost
is the tank.** Holding feeds ALL current ki into one omnidirectional detonation — damage and
radius scale with what was fed, at any altitude — and then the caster is bone dry: `onDrained`
fires, and Overdrive fighters are DESIGNED to cash that emptiness in with their fists. A tap that
fed under 12 ki fizzles LOUDLY (ring + kiRelease), never silently — the energy-clarity law holds.
Neither mechanic adds a damage type, so the DAMAGE CODEX is unchanged by design.


## §8 · MOVEMENT TECH (2026-07-24)
- **`meleePace`** (def flag, default 1): jab `strikeActive` and `strikeCd` divide by pace. The
  blocked-strike punish floors (`Math.max(strikeCd, 0.5)` at the choke points) are NOT scaled —
  pace buys cadence, never safety. Carriers: VOLT 1.5 · ORIGIN gift 1.35.
- **`grapple`** (ability type): ray → first cover face within `range`; hit in the top quarter of
  the face = reel + MANTLE the roof; lower = reel + **LEDGE HANG** (`f.hanging`). While hanging:
  `move()` returns, melee `canAct` fails, `guard` is forced off, and `runSlot` blocks any ability
  without **`oneHand: true`** (the flag lives on the def — batarangs, service pistols, sidearms,
  the grapnel itself). Release: jump (pop up), descend (drop), any hit with kb>14/launch>6, or
  re-pressing the grapple. The reel and the hang SUSPEND the four-deck ladder's servo (same
  contract as `launchT`), and the reel lifts move()'s speed clamp via `burstT`.
- **`glider`** (def flag): airborne + falling + ascend held (and not descend) → fall clamps to
  −8, horizontal speed ×1.4, flight pose engages. Folds on landing/descend. Mechanical, no ki.

## §9 · THE BEAM PRESSURE LADDER + THE STUN (2026-07-24)

**What a beam DOES to you depends on who you are.** Every sustained beam tick compares its
PRESSURE against your HOLD:

- `press = min(dps × casterPowerBuff / 24, 1.25)` — capped, so the very top of the roster can
  wade through even an ultimate-class beam (eating the damage is the price of the walk).
- `hold = strength/10 + 0.4 if guarding + 0.15 if metal`.

The outcomes, weakest to strongest — the readable ladder:

| you | result |
|---|---|
| `hold < press×0.47` and NOT blocking | **LAUNCHED** — after ~0.45s of pressure you are blasted off your feet (`launchT` set: walls and the ground become weapons; slam damage applies) |
| `hold < press×0.85` | **PUSHED** — a real backward slide (the shove sets `burstT` to lift `move()`'s walk-speed clamp; without that lift the clamp crushed the shove every frame, which is why beams historically "only knocked back the dead") |
| `hold ≥ press×0.85` | **HOLD** — you stand in it, taking damage |
| strength 9–10 | **WALK FORWARD INTO IT** — press is capped below your hold; advance and eat it |

Blocking still halves beam damage at the guard (§2) *and* raises hold by +0.4 — a weak fighter
who blocks slides instead of flying. Beams stop at cover; a building between you and the hose
is a real answer.

**THE STUN** — burst damage in a short window scrambles ANYONE:

- `takeDamage` accumulates a rolling 2-second damage window (`_burst`); crossing **24% of max
  hp** triggers the stun: `stunT = 1.7 / ccRecover` (the tabletop attribute buys shorter stuns).
- Stunned means: **no actions** (the melee trifecta, every ability, and movement all gate on
  `stunT` exactly like stagger), guard drops, charges cancel — and a FLYER FALLS (`flying`
  cleared; gravity owns them). Getting beamed out of the sky is this rule.
- The tell: **three gold stars orbiting the head** (the cartoon law), a STUNNED damage number,
  and a low bell.
- Counters: **blocking** (guarded damage never enters the burst window — the guard is the
  anti-stun), spreading damage out over time, and the **4-second immunity** after every stun
  (no chain-stunning, ever).
- Dummies can't be stunned (`isDummy` guard) — the Danger Room measures, it doesn't flinch.

**The Danger Room starts EMPTY** (same date): no bots, no rival, until you order them —
**N** deploys a Sim Construct, **B** orders a rival. The tutorial orders its own targets.

## §10 · MOMENTUM MELEE (2026-07-24)

**The speed you arrive with is part of the punch.** Every trifecta strike (jab, straight,
HAYMAKER) reads the attacker's velocity ONCE, at the moment the swing starts — deliberately
BEFORE the lunge impulse, so the engine's own forward hop can never fake momentum:

- `f._momSpd = |vel|` (full 3D — a dive counts), stamped in `strike()` / `_heavy()` (melee.js).
- `momentumMult(f)` (exported, melee.js): below **12 u/s** nothing changes; ease-in curve
  `1 + 1.5·k²` with `k = (spd−12)/46`, capped at **×2.5** at ~58 u/s (full tier-3 cruise).
  Ladder: standing jab ×1.0 · run-up ~×1.3 · tier-3 flight ~×1.8 · full cruise ×2.5.
- Damage AND knockback scale by the same multiplier, and the impact star, screen shake and
  hit audio ride the same number — you HEAR a cruise punch before any number renders.

**THE DIVE PUNCH.** Flying + descending (descend held, or sinking faster than 14 u/s) at swing
start = a LAUNCHER: the hit trades its up-pop for DOWN-FORCE (`launch: -(34 + spd·0.45)` —
sized to survive the victim's STRENGTH kb-resistance and still cross the −38 ground-slam gate;
metal frames can still plant through it, which is honest), and `takeDamage` arms `launchT` on
**|launch| > 12** — the check is a magnitude now; no pre-existing caller passed a negative
launch — so the victim's ground arrival is a real slam: crater,
shockwave, slam damage, credited to the puncher via `lastHitBy`. The attacker's own hard landing
plays the existing knee-crouch and body-typed land audio. A dive HAYMAKER swaps its 16-launch
pop for the down-force — a meteor drop.

**The law that does not move:** a BLOCKED momentum strike does base damage and base knockback —
the guard chip never grows with speed, and `onBlockedStrike` bounces the attacker exactly as
before. Momentum raises the reward, never the safety. (The jab path's blocked check is now
arc-aware like the heavy path already was — striking a guard from BEHIND no longer self-punishes
the attacker for a hit that actually landed.)

**Bots:** high-`flyTend` fliers may open an engagement with a CRUISE-PUNCH approach
(`ai._opener`, set on acquisition, chance scales with `ai.level`) — a full-commit straight-line
closing run under throttle that drops onto you if the bot arrives overhead. Difficulty buys how
reliably they judge the moment; the physics is the same one players get. Independently, any bot
arriving at the melee mixup above 26 u/s prefers the strike over the mixup roll — arriving at
speed IS the decision. Neither feeds a raised guard (the turtle branch still wins).

Kit `melee`-TYPE abilities (Sky Smash, Rush Combo …) keep their authored numbers — momentum is
the trifecta's law; ability slots price their own violence.

## §11 · THE AIMED THROW (2026-07-24)

**Grab a person, throw them into something.** The clinch is no longer a fixed beat that
auto-throws — it is a held, aimed state:

- **The struggle window.** On connect, `grabT = clamp((back ? 1.05 : 0.85) + (holderSTR −
  victimSTR) × 0.14, 0.45, 1.8)` — strength against strength decides how long you may aim.
  STR 10 holding STR 3 gets the full 1.8s; the reverse gets 0.45s. The victim THRASHES
  laterally against the pin (the tell — stronger victims visibly fight harder), and the
  teleport/phase escape still fires at the window's midpoint for front grabs.
- **The throw is a decision.** Press GRAB again during the clinch to hurl the victim along
  your aim. The dotted parabola — the props' arc, the arc that never lies — previews the
  flight the whole time (orange, same integrator, flatter 0.22 loft: a body is a bowling
  ball, not a mortar shell). Timeout without throwing = the victim **TEARS FREE**: holder
  shoved back and staggered 0.32s, victim briefly invulnerable, nobody hurt.
- **Authored velocity.** Release does small strike-flagged damage (10 front / 16 back —
  feeds Overdrive, procs `grabHeal`) with `hitstop: 0` so the body flies NOW, then sets
  `vel = dir3D × ((back ? 60 : 48) + STR × 4.6)` DIRECTLY — never kb-scaled, or the preview
  would lie about strong victims. `launchT = 1.35` arms every slam rule (wall crunch, ground
  crater, tower crack, thrower credit); `_thrownT = 1.35` arms the body-as-projectile.
- **The body is a projectile** (`game.updateThrownBodies`): while `_thrownT` rides and the
  body moves > 24 u/s, passing within reach of another fighter on the thrower's foe side
  hits BOTH — the struck fighter takes `min(30, 8 + spd × 0.22)` slam damage + launch (and
  chains into walls via their own `launchT`), the thrown body takes 60% of that, both
  credited to the thrower. A raised guard **BRACES**: the block eats the hit and no launch
  follows. One hit per victim per throw (`_thrownHit`).
- **Thrown bodies keep slide-class drag** (−1.3/s, not the walking −6/s) while `_thrownT`
  rides — a tumbling body doesn't brake itself. Measured: a STR-10 hurl leaves at 108 u/s
  and reaches a fighter 24u downrange at ~78 u/s.
- **Bots** aim the clinch: a held bot swings its aim onto a SECOND foe it can actually see
  (`canSee` — the honesty law's own primitive) and hurls after a reflex-paced beat; with no
  second foe it throws down its current facing. Wrestling is the whole turn — no other
  actions while holding a body.

Measured: bowling B through C = 31.2 to the body, 25.3 to the pin, both credited to the
thrower, launch flag live at impact; throw into a wall at 38u = 44.2 total (16 release +
slam), wall cracked, slam credited.

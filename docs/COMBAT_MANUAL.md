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

## 2. THE PROBLEM THIS MANUAL FOUND — ✅ FIXED 2026-07-23

> **Status: closed.** This section is kept as the worked example of what skipping the choke
> point costs. The bug described below is **no longer live** — do not go hunting it.

**Damage-over-time never went through `takeDamage`.**

The DoT tick used to subtract HP directly:

```js
this.hp = clamp(this.hp - d.dps * dt, 0, this.maxHp);   // ← the OLD, broken tick
```

So every poison, burn and gas stack ignored:

- armour and toughness — **a poison arrow ticked TITAN exactly as hard as it ticked a civilian**
- `phase` intangibility — you could poison a ghost
- the shield pack
- guard — the 50% DoT block in `takeDamage` never applied, because ticks didn't go there
- every resistance, including `frostResist`

**The fix** (entity.js, the `addDot` tick): ticks now ACCUMULATE (`d._acc += d.dps * dt`) and
land discretely every 0.5s through `takeDamage` with `{ dot: true, trueDamage: false }`. That
buys readable numbers instead of a 60 Hz strobe, and every defence in §1 gets its vote. The
rule that came out of it is absolute: **never subtract `hp` outside the choke point.**

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

## §12 · BLEEDING (2026-07-24)

**Heavy trauma and every slash-class weapon can OPEN A WOUND** — and the wound's identity is
that MOVEMENT MAKES IT WORSE.

- **Opening a wound** (the choke point, after the guard branch — blocked hits never wound):
  `dmgClass: 'slash'` landing ≥ 4, or any `physical` hit landing ≥ 18 (haymakers, slams,
  thrown cars). Each wound adds a stack, cap 3 (`addBleed`). **Machines (`metal`) and energy
  bodies cannot bleed**; dummies are exempt. Bleed ticks themselves can never re-wound.
- **Carriers** (the §5 protocol): every kit ability with `dmgClass: 'slash'` (FERAL's claws,
  GALE's knife, SARGE's plasma blade, STORMCALL's axe …), every **blade projectile**
  (batarangs, the hurled axe — projectiles.js passes `slash`), the trifecta jabs/heavies of
  any BLADED kit (`_swingKind === 'blade'` → the claws are the fists), and heavy blunt
  trauma from anyone. Three-plus delivery systems by construction.
- **The tick**: while moving, `1.1 × stacks × mv` hp/s, where `mv` = 1 walking (> 8 u/s) and
  **2.1 sprinting (> 26 u/s)** — measured 5.68 vs 11.94 over 3s at 2 stacks. Ticks land
  every 0.5s **through `takeDamage`** (`dot`, `trueDamage` — the wound is already inside;
  armour and shields don't stop what's already bleeding), credited to the wounder — a
  bleed-out KO books to whoever opened the wound (verified).
- **The clot**: stand STILL (< 8 u/s) for **4 continuous seconds** and the wound closes
  itself — zero damage while still, suit un-tints, CLOTTED confirmation. Moving resets the
  clock. This is the counter, and it is a positioning decision: keep running and win the
  chase, or stop and mend in the open.
- **The tell** (the status-language law — no other status may use downward red):
  red drips falling straight DOWN from the wound, a darkening blood patch on the suit
  (suit colour lerps toward `#3a0d0d` with stacks, restored on clot/KO), and a splat trail
  on the ground behind a runner. Drain pulls inward, poison blooms green, fire flickers up —
  **downward red is bleeding's alone.** Also in the in-game DAMAGE CODEX (THE WOUND LANGUAGE).

Ref: `lsw-bleeding.jpeg` — three-stack runner, tinted suit, mid-stride.

## §13 · SECOND WIND (2026-07-24)

**Once per match, a human player's lethal blow becomes a DOWNED knee instead of a knockout.**
It is a player's drama, not a simulation rule — **bots never get it** (verified: a bot's
lethal hit KOs straight through). Dummies and remote puppets are exempt too.

- **Going down**: the first killing blow pins hp at 1, sets `downedT = 2.4`, drops flight,
  guard, charges and grabs, slows time (`slowmo 1.2s × 0.35`), and asks the question:
  **STAY DOWN?** — "hold any attack — invincible always gets up."
- **While down**: every action gate is pinned through stagger, the knee-crouch holds
  (`_landT`), and **chip is beneath the moment** — DoT ticks, bleeds, small hits all bounce
  off (`return 0`). Only two things matter:
- **The rally**: hold ANY attack input (LMB/RMB/Q/E/H/R/V, or the pad's triggers/face
  buttons) for **one full second** → rise at **25% hp** with the tank EMPTY and `drainedT`
  live — **Overdrive's moment**: drained fists refill ki (measured +18.5 ki from the first
  jab after rising). Brief invulnerability (1.2s) covers the getting-up.
- **The counterplay**: a **heavy strike (≥ 15) or a slam** on the downed body FINISHES it
  for real — immediate KO, killer credited. (The blocked-strike law is irrelevant here; a
  downed fighter has no guard.)
- **The clock**: window expiry with no rally completes the knockout, still credited to the
  killer. The second death of the match is always real (`_secondWindUsed`).

The slow-mo is real time-dilation — the 2.4s window lasts ~3.2 real seconds under it.

## §14 · SLEEP + BLIND — the payload lane, proven (2026-07-24)

These two are the brief's Tier-2 gatekeepers: one new status field each, one tell each, one
rule each — and they validate the whole payload pathway for everything the catalog wants.

### SLEEP

- **The rule**: `addSleep(dur, src)` → the victim FOLDS SLOWLY (`_sleepK` ramps the collapse
  over ~0.7s — a fold, not a freeze), uncontrolled (stagger pin gates every action), a
  sleeping flier falls, and they **wake INSTANTLY on any damage** — the one wake rule. The
  single exception is the **0.15s delivery grace**: the dart's own blast can't wake the sleep
  it just delivered (found the hard way — the tranq round's detonation was waking its own
  target on the same frame).
- **Duration** scales down with `ccRecover` (the tabletop attribute). **3s immunity** after
  waking — no chain-sleeping. **Machines don't sleep** (it is a chemical); dummies measure.
- **The tell** (status-language law): three ROUNDED pale-gold dots (`#ffe9b0`) drifting
  slowly upward in a lazy circle + soft slow rings — deliberately rounded, slow and soft
  where stun's stars are sharp, fast octahedra. Sleep SINKS; nothing else sinks.
- **Carriers**: GALE — `sleep` joins the broadhead cycle (bow + quiver, arrow delivery);
  SANDRA — Tracker Round carries `payload: 'sleep'` (homing dart — the Jackal takes them
  ALIVE); ORIGIN catalog "Tranquilizer Dart". Two roster carriers, two delivery systems.
- Measured: dart fired → target asleep at frame 10, 17.2 delivery damage, KO credit intact;
  a 4-damage punch after grace woke instantly; immunity blocked a re-sleep.

### BLIND

- **The rule**: dense oily SMOKE ZONES (`game.addSmoke(x, z, r, dur)` → `_smoke` list).
  Anyone inside keeps a rolling `blindT` refresh (~0.55s) — step out and the eyes clear in
  half a second. While blind: **a bot gains NO new sight** (`ai.js` gates `sees` on
  `blindT` — the honesty law does the rest: it hunts the belief it already had, which ages
  and drifts — it believes wrongly, exactly as specified); **a human loses the hard lock**
  (cleared in controlPlayer), **the aim magnet lets go** (pickTarget gated), and **their own
  fog of war closes in** (`_humanSees` range ×0.28).
- **The tell**: the blocked-eye mark — a slashed-eye sprite at the brow — plus the cloud
  itself. No color collision: the smoke is charcoal, the mark is bone-and-red.
- **Carriers**: KNIGHTFALL — Smoke Vanish leaves the cloud at the departure point (the
  smoke bomb his exit always implied, `def.blind` on a teleport); KIVULI — Creeping Cloud
  detonations blind (`def.blind` on a projectile; his blurb always said the gas blinds);
  ORIGIN catalog "Smoke Bomb". Two roster carriers, two delivery systems (teleport exit +
  lobbed canister), and any projectile can carry `blind: { r, dur }` from data alone.
- Measured on a verified-LOS lane: bot with line of sight saw NOTHING for the full blind,
  reacquired after clearing; human at 40u lost the foe while blind, saw it clear after.

Both statuses live in the DAMAGE CODEX (THE WOUND LANGUAGE) beside bleeding.

## §15 · TIER ONE + THE AFTERBURNER (2026-07-24) — docs/POWERS_BRIEF.md made real

**All twenty Tier-1 powers from the brief exist as pure data** — 18 new ORIGIN catalog rows
(Web Line, Optic Blast, Card Barrage, Pumpkin Bomb, Sonic Scream, Ground Slam, Chest
Unibeam, Returning Shield, Ice Slick Trap, Hellfire Chain, Poison Dart Fan, Kinetic
Absorption, Shadow Step, Stone Volley, Orbital Lance, Life Leech Touch, Force Wall,
Berserker Rush) joining the existing Twin Pistols and Attack Drones. Verified: every new
row fires from a live fighter without error (18/18).

**Seven roster kits carry the brief's written visual treatments:**
- **SOL Heat Ray + VANGUARD Eye Beam** → `faceOrigin: true` (the beam spawns at the FACE,
  y 8.3, verified), razor-thin radius 0.55, ruby shell / white-hot core. No charge orb.
- **DECIBEL** (both cones) → `sonic: true`: the cone renders as TRANSPARENT COMPRESSION
  RINGS marching down the axis plus dragged street dust — force made visible, zero glow.
- **RAGE WORLD BREAKER** → `nova` + `groundslam: true`: the body is the epicenter — an
  airborne cast drives him DOWN, cracks and debris, a real CRATER, victims launched
  (measured 62 damage, launch flag live, caster bone dry per the nova law).
- **FERAL NO CAGES** → `dmgClass: 'slash'` on the rush (rush hits carry damage class now —
  claw rushes open WOUNDS) with the deliberately light finisher; the rhythm is the read.
- **TITAN Reactor Burst** → `chest: true`: the orb builds at the chest aperture with
  concentric opening rings, and flies at beam speed (110–150).
- **CHAINFIRE Hellfire Chain** was already the brief's #10 — fire-palette tentacle drag-in.

**Engine flags added (all data-driven, §5 protocol):** `faceOrigin` (beams), `sonic`
(cones), `groundslam` (novas), `chest` (charges), `card`/`disc` projectile meshes (tumbling
playing card with rose back; flat-spinning painted shield — both with slow trails, no
lights), `freeze` on areaDamage/mines (Ice Slick ENCASES via `addFrost`), `grav` passes to
volleys (Stone Volley's dusty ballistic arcs), `dmgClass` passes through rush.

### THE AFTERBURNER (brief Part Six)

`def.afterburner = { mult: 2.1, kiPerSec: 14, wake: [c1, c2] }` on **six carriers**: SOL,
MAJESTY, TORCH, NOVA, APEX, OLYMPUS.

- **Ignition**: hold cruise (SHIFT airborne) for **0.8s** → compression ring + boom, then
  the throttle opens from cruise ×1.5 to **×2.1 of base flight** (measured: cruise 71.8 →
  burner 100.5 u/s — the 2.1 multiple exactly).
- **The price**: 14 ki/s total while burning (base regen is 9/s — the burner OUT-DRINKS the
  tank by design; measured 120→101 over ~3.2s). Tank dry or throttle closed → the wake
  **breaks apart** (a burst, not a fade) and `_burnT` resets.
- **The wake carries the identity** (no generic blue trail): SOL gold corona on white ·
  MAJESTY silver-ice shock trail (the brief said violet; violet is banned in this house —
  KIVULI only) · TORCH turbulent fire and embers · NOVA stellar white-cyan star-drag ·
  APEX gold-orange · OLYMPUS white-and-temple-gold.
- The spear posture comes free: the flight pose's speed-driven prone engagement.

**GEAR TAGS** (Robert's ruling — the gear system lands next): `gear: true` now marks what a
fighter HOLDS rather than IS — 24 roster abilities (SARGE's arsenal, SANDRA's guns, GALE's
bow and knife, KNIGHTFALL's thrown steel and charges, the god-forged blades, the axes,
KIVULI's canister…) and all 13 ORIGIN gear rows. TITAN's cannons are his body — not gear.

## §16 · THE GEAR SYSTEM (2026-07-24) — powers are what you ARE, gear is what you HOLD

Robert's ruling, implemented whole: no grid, no menus — **one pair of hands plus the belt**.

- **The drop economy**: a KO'd fighter whose kit carries `gear: true` leaves their primary
  weapon on the street (`handleKO` → `spawnGearDrop`, real `buildWeapon` mesh, bobbing,
  **20s despawn**, ≤10 concurrent). A held pickup falls too. **Police sidearms are tagged**
  (Service Pistol, Tactical Carbine, Automatic Rifle, Assault Rifle, Rifle Grenade) — beat
  cops feed the same economy. Verified: drops appear organically in AI rumbles.
- **Pickup**: **G** within 8u of a drop takes it into the CARRY HAND — a kit slot is never
  hidden. G priority: clinch-throw › carry-throw › **weapon pickup** › prop hoist › grab.
  Holding a weapon while grabbing another swaps (hands are a slot).
- **X fires it** (the gadget button — the hand). The pickup becomes a synthetic `_gear`
  slot through the ordinary `runSlot` machinery, so every ability rule applies unchanged.
- **Ammo is a leash**: **~12 seconds of trigger time**, drained only while firing. Dry =
  the weapon is tossed (feed says so) — a pickup never becomes permanent kit.
- **Proficiency, not permission** (`weaponProficiency(def)`, derived like `resistOf`,
  `def.gearProf` overrides): soldier/hunter/marksman archetypes **×1.25**, trained
  **×1.05**, baseline **×1.0**, STR ≥ 9 **×0.7** (why would he ever aim). Damage scales up,
  spread scales DOWN — proficiency shows in the hands. Measured: SARGE/SANDRA/KNIGHTFALL/
  GALE 1.25 · SOL 1.0 · RAGE 0.7.
- **The tier gate is already law**: dropped guns fire `ballistic`, so the scale does the
  Punisher-vs-Hulk work for free — measured **75 damage to flesh, 0 through TITAN's
  plate** from the same scavenged carbine. Asymptotic by ruling, never a spectator switch:
  the human-tier answer to armour is explosives, acid, and thrown buses.
- **DISARM-BY-GRAB** (the trifecta earning its keep): a landed grab STRIPS the victim —
  their held pickup hits the pavement AND their own gear-tagged kit slots go DEAD for
  **6s** (`_disarmT`, gated in `runSlot` with a DISARMED feed). Powers keep firing — you
  can take the man's gun, never his fire. Verified: batarangs refused mid-window, the
  non-gear ult cast fine.
- **Deliberately parked, written down**: bots don't scavenge yet (player-tech, like the
  grapnel); pedestrians don't pick up dropped guns yet — when they do, vigilantism law
  already decides who dares. Netcode ownership of ground items is a one-line TODO.

## §17 · LOW ORBIT + CITY-TO-CITY TRAVEL (2026-07-24) — brief Parts Six–Eight, Robert's scope

**Low orbit IS the travel layer.** For now, this tier of character travels between cities by
punching through the sky — the map does the miles, and the cinematic is the loading screen.

- **The ceiling opens for the burner**: only a fighter with `def.afterburner` and the burner
  LIT (`_burnT > 0.8`) can pass `BANDS.ceiling`; everyone else meets the lid as before.
  Verified: VOLT clamped at the ceiling, SOL punched through to +45 and beyond (hard stop at
  ceiling +90 — the offer happens well before it).
- **The DEPART gate** (`game.onDepart`): climbing past ceiling +44 with the throttle open
  offers the world map, once per climb (`_departing` re-arms after a real descent below
  ceiling −40).

**⚠ AMENDMENT 2026-07-25 — THE SERVO AND THE CEILING DISAGREED, AND THE TEST DIDN'T NOTICE.**
This section and §15's four-deck ladder shipped on the same day and contradicted each other. The
servo pins a tier-3 flier at its top deck, `sky + (ceiling − sky) · 0.55` — **301** on the
flagship — while this gate needs ceiling + 44 = **372**. Flown through the actual controls, SOL
lit the burner and held ascend for fifteen seconds without ever leaving 301. Low orbit, planetary
travel and the whole heliopause sequence were unreachable by any player.

The 2026-07-24 verification above recorded "offered exactly once at altitude 373" because it
**set the altitude** rather than flying to it. That is the failure worth remembering: a gated
feature can pass a test, be documented as working, and still be impossible to reach.

> **If you test a gated route, drive the GATE.** Anything that writes the gated value directly is
> testing your arithmetic, not the player's path.

The fix is one condition, not a new rule: the servo now yields to `def.afterburner && _burnT >
0.8` — the SAME exception the ceiling clamp already makes. Two rules about one fighter have to
agree about that fighter. Releasing cruise kills `_burnT`, so docking on the clouds deck behaves
exactly as before for everyone, burner-class included.
- **The world map** (`hud.showDepart`): search all 1,050 ATLAS cities, each row showing
  country, population, climate line and a TRANSIT time. STAY descends. **The GPS and the
  world map remain separate tools** — the radar never leaves the street.
- **Pseudo-geography, honestly labeled**: the sheet has no coordinates (HANDOFF documents
  the gap), so distances hash deterministically from country+city — stable, same-country
  cities cluster, near-vs-far ordering holds. When the sheet gains real coordinates, only
  `_cityLL` changes.
- **THE TRANSIT CINEMATIC** (`hud._playTransit` — the 11th member of the cold-open family,
  and the loading screen): starfield, the planet's limb with its atmosphere rim, a typed
  kicker ("LOW ORBIT TRANSIT — TORCH DEPARTS TOKYO"), DEPARTED/ON APPROACH city cards, and
  the route arc drawn in the traveler's OWN afterburner wake colors with the burn-dot
  riding it. Any key skips. Transit length scales with distance (~3–7s real).
- **Arrival**: `game.onTravel` swaps the theater (`hud.theater.cityId` — ⚠ `cityList()`
  builds a FRESH array per call; index by name+country, never `indexOf` an old object),
  persists it, and re-enters the same mode config; the standard establishing card plays as
  the arrival beat (the full opening director is suppressed for travel). Verified live:
  world map → Tokyo → transit → **fighting in Tokyo, Japan**, match running.

### THE SYSTEM TIER (same day — the zoom stack's next level, Robert's ruling)

The depart map now stacks **EARTH ↔ THE SYSTEM** (`data/planets.js` — the planets as DATA,
exactly like the cities):

- **Ten worlds, honest labels**: real AU and million-km distances on every row. Landable
  worlds carry a settlement; the rest REFUSE with a reason ("VENUS — NO LANDING, the
  surface melts lead"; "JUPITER — NO SURFACE"). A grayed row with a reason beats a control
  that lies.
- **Settlements are city rows through the SAME planner** (`resolveTheaterPlan` planet
  branch → `generatePlan(row, seed, { popType, relief, biome })`): THE MOON → TRANQUILITY
  REACH (Small Town, flat, tundra) · MARS → ARES LANDING (Town, plateau, desert) · PLUTO →
  PERIMETER STATION (Village, mountains, tundra). Verified: a live match in ARES LANDING,
  Mars — desert biome, plateau relief — and a 12s AI rumble there at 2.53 ms/frame. Mars
  is authored like Miami, as the brief promised; the difference is environmental data.
- **Transit** rides the same wake-identity cinematic with distance-honest legs
  (`transitSecsFor`: Moon ~6s · Mars ~7s · Pluto ~14s).

### THE HELIOPAUSE CROSSING (`hud._playHeliopause`) — leaving the system, at true scale

The system map's last row is **⬆ LEAVE THE SYSTEM**. Three acts, one canvas, skippable:

1. **The run out** — log-scaled orbit map, the traveler's wake-dot accelerating past every
   labeled world, MERCURY to NEPTUNE.
2. **The boundary** — **the character is SEEN**: a figure drawn in the hero's own primary
   with their afterburner wake streaming, name-tagged, crossing the luminous heliopause
   wall (123 AU) with the termination shock (94 AU) behind — "the solar wind stops here —
   Voyager 1 crossed in 2012, at 121.6 AU."
3. **THE TRUE SCALE** — powers of ten (the honest method for astronomical scale): 100 →
   1,000 → 10,000 → 100,000 AU, a live scale bar under every frame ("BAR ≈ 41,335 AU"),
   the Oort cloud named, until the entire heliosphere is a circled dot — "THE ENTIRE
   SYSTEM — everything you have ever fought over" — and the nearest stars appear at their
   real light-year distances (Proxima 4.25 · Alpha Centauri 4.37 · Barnard's 5.96 ·
   Sirius 8.6). Closing line: "INTERSTELLAR SPACE — NO CHARTED THEATERS BEYOND THIS LINE.
   YET." Return drops you back on the system map.

Refs: `lsw-orbit-transit.jpeg`, `lsw-travel-arrival.jpeg`, `lsw-system-map.jpeg`,
`lsw-heliopause-crossing.jpeg` (act II — the character at the wall), `lsw-heliopause.jpeg`
(act III — the system as a dot).

## §18 · THE INJURY SYSTEM (2026-07-24) — one record, every surface reads it

### Zoned match wounds (the body remembers the fight)

- **Opening**: any single hit ≥ **16% of max hp** at the choke point marks the ZONE it
  struck — `slash → ARM`, `slam → LEG`, `cold → LEG`, else `TORSO` (callers may pass
  `opts.zone`). Ladder per zone: **LIGHT → SERIOUS → CRITICAL** (1–3). Dummies exempt.
- **The debuffs ARE the tells, and they are derived, never hand-authored**: LEG = a real
  limp (−9%/level walk speed — measured 26.4 vs 32.2 u/s at SERIOUS); ARM = softer fists
  (−8%/level on jabs and heavies — measured 6.85 vs 8.16); TORSO = a slower tank
  (−7%/level ki regen). Plus **wound pips**: dark-red markers pinned at the wounded zone,
  scaled by severity — dark-on-suit, grayscale-readable at a glance.
- **Healing**: VIGOR walks the ladder down — each level clears after `28s / ccRecover` of
  match time. **Respawn clears the body entirely.**
- **The AI reads the limp it can SEE**: inside the sight branch only, a visibly leg-wounded
  foe pulls the bot's preferred range in 25% — pressure the limp, honestly earned.
- **The wound has a NAME now, derived from the blow** (same rule, richer read): fire →
  BURN · slam/heavy strike → FRACTURE · slash → LACERATION · cold → FROST-SCAR · acid on a
  metal frame → CORROSION · else CONTUSION. The number says "ARM · LACERATION · SERIOUS"
  (verified: fire/slam/slash produced BURN/FRACTURE/LACERATION on torso/leg/arm).
- **The LIMP is in the run cycle now**: a leg-wounded runner's right knee drags stiff-bent,
  worse per severity — the asymmetry is the read, on top of the real speed loss.
- **One HUD chip**: `⚕ ARM II · LEG I` on the player panel (the wanted-row pattern), shown
  only while wounded, roman severity, grayscale-clean.
- **Bots guard the wounded arm**: a SERIOUS arm wound makes a bot cover up in stray moments
  (~0.7/s chance of a short guard) — doctrine, not physics; it reads as protecting the arm.
- Parked, written down: the arm-cradle IDLE pose rides a later animation pass (the guard
  habit + pip + softened fists are the live arm tells).

### The medical ledger (injuries that outlive the match)

- **Booked KOs can wound the RECORD**: when a knockdown books Elo (same guards — both
  registered, opposing teams, no police, no dominated minds, not training), a **30%** roll
  writes ONE injury to the victim's book entry: name derived from the killing blow's kind
  (fractured orbital, fractured ribs, plasma burns, deep lacerations…), **one active injury
  max**, `heals in 2 sanctioned bouts`, debuff capped at **−5%**.
- **Spawn reads it** (lazy first-frame check — covers every spawn path): the next body that
  hero fields starts at ×0.95 max hp (measured 119/125), tagged `_bookInjury`, announced in
  the feed for humans.
- **Bouts heal it**: every DECIDED duel decrements both parties' `bouts`; at zero the injury
  clears and the feed says so. Verified: booked → carried → healed over two bouts → gone.
- **Every surface reads the ONE record** (`injuryOf` in rankings.js): the codex **§03
  § MEDICAL row** ("CARRYING FRACTURED ORBITAL — CLEARS IN 2 SANCTIONED BOUTS · −5%
  CERTIFIED OUTPUT" / "FIT TO FIGHT" — this is the FASERIP sheet's WOUNDS row; the codex IS
  the sheet), the **opening TALE OF THE TAPE** (a MEDICAL row appears when either fighter
  carries — verified manual-stepped clean), and the **news desk** ("The medical desk
  confirms {name} leaves with {injury} — cleared to return after N sanctioned bouts",
  riding `rep.medical` from `game._medNews`, verified in a generated broadcast script).

## §19 · TIER 2, THE FIRST THREE LANES (2026-07-24)

The brief's own recommended order, after sleep and blind proved the payload pathway:

- **FROST NOVA** (catalog `frostnova`): a nova whose blast carries `freeze` — the ring races
  out and ENCASES through the existing frost system (novas now pass `{dtype, freeze, dot}`
  into their `areaDamage`, so any nova can carry any payload from data alone). Measured:
  36.3 damage and the target frozen solid (frozenT 2.04) from one ring. Fixed radial
  symmetry by construction — deliberately unlike the Ice Slick's creeping spread.
- **SEEKER MICRO-MISSILES** (catalog `seekers`): `homing` now passes through VOLLEY spawns —
  a wide-spread cluster that separates and converges on the target. Measured homing onto a
  laterally offset target. The launch spread (0.34) IS the pod-opening visual.
- **RICOCHET ROUNDS** (catalog `ricochet`, and `bounces: N` available to every projectile
  and rifle from data): a shot that meets cover REFLECTS off the face, spends a bounce,
  sparks, and continues in a visibly kinked straight segment — never a curve. Measured:
  spawned with 3, reflected with a real direction flip, 2 remaining. Rides the ballistic
  scale like every bullet.

## §20 · EVERY POWER SPEAKS + THE AMBIENCE DIRECTOR (2026-07-24)

### The loop law, finished across the board

**Sustained sources LOOP and FADE (created fading in, `set(I,pos)` every live frame,
`stop()` fades out, the `_sus` watchdog reaps misses); discrete sources are one-shots.**
The audit: every ability type now has its voice, and the loop/one-shot split is correct —

- Already lawful: beams (`beamVoice`), cones (element-keyed `sustain` — fire roars, gas
  hisses, cold crackles, acid sizzles), lifedrain (`drain`), phase (`phase` hum), bow
  (`bow` creak), charges/growing orbs (`charge` ramp + `kiRelease`), rifles (`gunshot`),
  bows (`bowLoose`), volleys/projectiles (`blast`), melee kits (swing/impact), teleports,
  evades, mines (plant zap + boom), nova (charge + boom), mind control, the Marletta's
  arming tremble (zap pair at `_arm`).
- **NEW — the AFTERBURNER burns aloud**: ignition stays the one-shot boom; the burn itself
  is a `sustain('fire')` roar driven by airspeed every lit frame, stopped when the
  throttle closes or the tank dies, cleared on KO. Verified: no loop before ignition,
  live+registered while burning, gone on cut.
- **NEW — the GRAPNEL LINE creaks while taut** (`sustain('bow')` on the fighter, louder on
  a mantle reel), stopped in `releaseHang` — the ONE release path. Verified taut→release.
- **NEW — open PORTALS pulse**: a soft positional two-note hum per side every 1.35s while
  a pair stands. A persistent world object is never silent.
- **NEW — METEORS whistle in**: a thin high hiss per spawned lance — you hear the sky
  falling before it lands.
- **SONIC cones voice as rushing AIR** (`'ice'` airy body), not an element roar — the
  scream's pressure identity, not fire's.
- Verified: the full 364-slot battery with every voice live, then `audio.sweep()` —
  **zero orphaned loops**.

### The ambience director — layers on an intelligence strategy

`soundscape._direct` runs a **five-state tactical read with hysteresis** every frame:
**QUIET · STALKED · ENGAGED · AFTERMATH · HUNTED.**

- **Inputs**: nearest foe distance, nearest PLAYER-VISIBLE foe (`_vis` — the player's own
  vision, not a wallhack; the director is a film mixer, not a combatant), a decaying
  VIOLENCE accumulator fed by `game.noise` (every explosion, heavy hit and KO the bots
  can hear, the mixer hears too), and police HEAT.
- **The intelligence is the asymmetry**: escalation is INSTANT (ENGAGED/HUNTED switch on
  the frame), de-escalation needs proof (0.45s dwell, 10s AFTERMATH breath, slow decay).
  Fear arrives fast and leaves slowly — the layer easing does the same (rise ×2.6, fall
  ×0.5).
- **The street reacts**: STALKED = a sub-bass tension drone (88 Hz). ENGAGED = tension
  full, crowds thin to 30%, traffic to 55% (the block empties), stray car alarms.
  AFTERMATH = alarms warble, dogs answer, the crowd stays away, the tension exhales.
  HUNTED (heat ≥ 90) = the ROTOR — a blade-rate (11.5 Hz) helicopter thrum scaled by
  heat — and the ambient sirens come every few seconds, because they are for YOU now.
- Verified staged: QUIET 0.00 → STALKED 0.38 → ENGAGED instant/0.87 → AFTERMATH →
  HUNTED rotor 0.70 → settles to QUIET; and ENGAGED arose organically in a live rumble.

Still open from Part Four, parked in `docs/BACKLOG.md` with reasons: chain lightning
(chained target selection), sticky bombs (attach state), vampiric aura, ground spikes
(temporary cover colliders), decoy hologram (AI retarget), turret stat-inheritance, blade
cyclone, magnet pull, adrenaline surge, sniper stance, phase-walk-through-interiors,
counter stance, grapple slam, air superiority — plus the Phase Zero visual-profile field
sweep. Each is a contained lane on machinery that now exists.

## §21 · THE WEIGHT LADDER (2026-07-24) — everything throwable, none equally

The world's objects have TONNAGE and a fighter's STRENGTH is a lift-capacity curve.
The same number decides what your hands can take, how fast you walk under it, how hard
you can hurl it — and, in a clinch, how far a BODY flies. Hulk yeets the gunman across
the block; the gunman can barely shove Hulk off his feet.

### The tonnage table and the capacity curve (`entity.js`)

- `PROP_WEIGHT` (metric tons): lamp **0.3** · rock **0.5** · tree **1.1** · car **1.9** ·
  plane **24**. Loose rocks are REAL: the man-sized mountain scree (s > 2.3) and three
  stones per forest floor register as `world.rocks` — 0.5t puts them in STR 3 territory,
  the first rung anyone superhuman-adjacent can actually use. The big outcrop boulders
  stay structural cover; a rock you can hide behind is not a rock you pocket.
- `liftCapacity(str)`: human below six — `0.22 × STR` (STR 1 lifts 0.22t, STR 5 exactly
  one street tree at 1.1t); superhuman past it — `1.1 × 2.05^(STR−5)`. Measured ladder:
  STR 6 **2.25t** (first car), 7 **4.62**, 8 **9.48**, 9 **19.4**, 10 **39.8t** (the only
  rank that lifts an airliner). The knee at 5 is deliberate: 1–5 is the human range where
  a rank buys ~220kg; 6+ each rank DOUBLES you.
- `bodyWeight(def)`: people have weight too — `0.08 + STR×0.014 + 0.42 if metal +
  0.0008/hp over 100`. GALE 0.126t · RAGE 0.316t · TITAN **0.678t** (the plate is real).

### What the number gates (`game.propInReach` / `grabProp` / `throwProp`)

- **The hoist is capacity, not a hard-coded STR check.** The old `s >= 6` car gate is
  gone; `propInReach` compares `liftCapacity` against each candidate's tonnage — cars,
  street trees, and now PLANES all through the same gate. The nearest thing you CANNOT
  lift is remembered (`f._tooHeavyProp`) so a human's refused press explains itself:
  *"TOO HEAVY — the car is ~1.9t; you lift ~0.9t."* A refusal that states the two
  numbers is a rule the player can learn; a silent one is a bug report.
- **Carry slowdown rides the ratio**: `speed × clamp(1 − 0.45/max(0.9, cap/w), 0.42..0.93)`.
  KANO (STR 6) hauls a car at 22.4 of his 36; RAGE barely notices (27.9 of 30) but an
  airliner still drags even him to 21.9.
- **Throw speed rides the ratio**: `74 × clamp(0.5 + 0.16·log2(cap/w), 0.5..1.25)` —
  computed ONCE at grab and stored on `f._carry.spd`, and `updateThrowArc` reads that
  stored number, so **the preview physically cannot promise a throw the arm can't
  deliver**. Measured: KANO lobs the car at 39.9 u/s (a strain); RAGE fastballs it at
  89. Impact damage scales the same way (`× 0.75 + 0.25·ratio`, cap 1.6).

### The airliner (`citytiles.plane` → `world.planes`)

Parked airliners register as props: `plane()` collects its five meshes into
`ctx.planeProps`, `buildTiles` returns them, and `rebuildCity` stores `world.planes`
(cleared in `_teardownCity`; the flagship has none). Grabbing one hides the real meshes
and hands you a simplified carried silhouette riding higher than a car (h 17). The
impact is a DISASTER, not a fender-bender: blast radius 22, explosion power 2.4, a real
crater, a camera punch and slow-mo. STR 8 gets the too-heavy refusal at the fence;
only STR 10 walks onto the apron and leaves with the plane.

### Person vs person battles weight (`melee._throw`)

The clinch hurl multiplies by `wr = clamp(0.75 + 0.15·log2(liftCapacity(holder) /
bodyWeight(victim)), 0.45..1.2)`. Measured, launch speed of the thrown body:
- RAGE throws GALE: **115 u/s** (wr at the 1.2 cap — strength over a featherweight)
- GALE throws RAGE: **57 u/s** (wr 0.91 — the throw still works, the physics resist)
- GALE throws TITAN: **47 u/s** (wr 0.74 — 680kg of plate is the counter-pick)
The aimed-throw arc preview applies the SAME `wr` while you hold the clinch, so the
parabola you see is the parabola the body flies.

### The laws it keeps

Slam damage still credits through `launchT`/`lastHitBy` (nothing new touches hp
outside `takeDamage`); the tell is the hoist itself plus the slowed walk (freeze-frame
readable); the counter is the weight class you bring. No `def.id ===` anywhere — a
custom ORIGIN bruiser at STR 10 lifts the plane the day he's saved.

Verified headless: capacity ladder measured 1–10; SARGE refused the car WITH the feed
line; KANO/RAGE car ratios exact to the formula; SOL refused the plane, RAGE hoisted
and threw it (boom 1.2, craters, carry cleared); person-throw asymmetry measured both
directions; 52 heroes × 364 slots, 0 errors, 0 orphaned audio loops.

## §22 · THE VOICE OF THE LAW (2026-07-25) — police audio

The police were VISIBLE before they were AUDIBLE: cruisers rolled in, officers deployed,
the wanted stinger fired — but the response itself made almost no sound of its own. Two
one-shot siren whoops on dispatch, and then a firefight with no radio in it. This is the
audio layer for the whole ladder, built on the machinery that already exists (the bus
structure, the positional falloff, the formant voice synth, the sustain contract).

### The light bar is a LOOP (`audio.sustain('siren')`)

A siren is a sustained source, so it follows the loop law (§20): created already fading in,
`set(I, pos)` every live frame, `stop()` fades out, registered in `_sus` so the watchdog
reaps it if a caller forgets. The synth is a square oscillator whose frequency is swept by
a 1.15 Hz triangle LFO (±180 Hz around ~760) through a lowpass, plus a 58 Hz sawtooth
engine bed under it so a moving cruiser has mass. `police._sirenOn/_sirenOff` are the ONLY
create/stop paths; the wail runs at full while a vehicle is rolling in and eases to 0.55
once it parks, because the lights stay on as long as there is a villain.

- ⚠ Stopped in THREE places or it outlives the fight: stand-down (the moment `villain()`
  goes null), `reset()` (before the scene teardown — a loop does not care that its mesh is
  gone), and the audio sweep as a backstop.
- Measured: one loop per vehicle (2 cruisers → `_sus` size exactly 2), RMS 0.024 live,
  **0.000 after stop**, `_sus` back to 0 on stand-down, 0 orphans after reset + sweep.

### The radio is a FILTER, not a sample (`audio.radioChain`)

`radioChain()` returns the INPUT of a chain — highpass 420 · bandpass 1750 (Q 1.15) ·
`tanh` waveshaper (speaker clip) · gain → the voice bus — and `soundscape.say(pos, emotion,
{ radio: true })` routes the bark's envelope into it instead of straight to the bus. So the
police use the SAME formant voice engine as every civilian; what makes them police is the
band-limiting, the clipping, and the squelch bracket. Two new bark registers:

- **`radio`** — 3–5 syllables, flat contour, fast: clipped traffic over the air.
- **`command`** — 1–2 syllables, falling contour, full energy: a shouted order.

`audio.squelch(pos, open)` is the click-and-hiss that brackets a transmission — on its own,
with no words at all, it already reads as a police radio, which is why an UNANSWERED call
plays a squelch open and closed with nothing between it. That silence is the sound of a
corrupt state ignoring you. `audio.hailer(pos)` is the PA feedback chirp (900→2600 Hz
squeal + a 120 Hz thump) that precedes an order through a loudspeaker.

### What speaks, and when

| Beat | Sound |
|---|---|
| Dispatch (the call goes out) | squelch + `radio` traffic, female dispatcher register |
| The call goes UNANSWERED | squelch open, squelch closed, nothing said |
| A cruiser appears | the two-whoop announce, then the **wail holds** |
| Units on scene | `hailer` + a shouted `command` at the villain, then unit traffic |
| Every new wanted rung | the escalation siren + a called-in transmission |
| Shots fired at a badge | one "shots fired" transmission per 2.5s, however fast the hits land |
| **Officer down** | urgent dispatch over the air **and** a nearby unit's un-radioed panic shout |
| Stand-down | every siren fades out, one last transmission |

Two registers on one event (the radio call AND the man next to him yelling) is what sells
an officer going down; a single line reads as a notification.

### The laws it keeps

Rate-limited by the soundscape's own voice governor (a firefight cannot mush), positional
through the same `_pg` falloff as everything else (you hear the units near you, not the
whole city), every gain coerced through `fin()`, and the one-shot radio chain drops its
edge to the bus after 3s so a long siege can't pile up filter graphs. Nothing here is a
sample — there is no honest police-radio recording in the CC0 library, and a generic one
would be a downgrade (§ the sample bank ruling).

Verified: all five new sounds measurably sound (squelch 0.0016 · hailer 0.0049 · siren
0.024 · radio voice 0.0074 · command shout 0.0124 RMS); a live ★★ response dispatched 2
cruisers with 2 live sirens, armed the shots-fired call, jumped heat 123 → 190 on an
officer down, then stood down to 0 live sirens and 0 orphaned loops.

## §23 · THE TYPE REGISTRY, THE VALIDATOR, AND THE NaN THAT HID FOR TWO DAYS (2026-07-25)

Three code-review items and one "unreproduced" backlog ghost, closed together — they turned
out to be the same story: **a thing that fails silently keeps failing.**

### TYPE_META — one registration point per power type (`engine/abilityMeta.js`)

Adding a power type used to touch six sites: the `TYPES` function, `describeAbility`, the
creator's `powerNumbers`, the AI's `HOLD` set, the AI's `holdTime` ladder, and the creator
catalog. Several failed silently — a type missing from `HOLD` simply never got held by a bot,
forever, with no error. Everything a consumer needs now hangs on `TYPE_META[type]`:
`family` · `hold` · `holdT` · `req` (the numeric fields the type cannot work without) ·
`sustained`. `ai.js` derives `HOLD_TYPES` and `holdTimeFor` from it — the hand-maintained Set
and the chained ternary are gone. Verified: the derived hold set is byte-identical to the old
hand-written one (11 types), and all 26 registered types have metadata.

### validateRoster() — the silent dead slot, caught at boot

A typo'd ability type (`projektile`) is a slot that does nothing for the life of the project:
`runSlot` looks it up, finds nothing, returns. Nothing throws. `validateRoster(ROSTER, TYPES)`
runs at dev boot over every hero **including installed customs** and reports every problem at
once: unknown type · non-finite numeric · missing per-type required field · missing name.
Live roster: **0 problems, 52 weapons, 364 slots**. Verified against four synthetic failures —
all four caught with the exact reason.

### The NaN that hid for two days

The backlog carried `computeBoundingSphere(): Computed radius is NaN`, 48× in one stress run,
"suspect a tentacle chain". That was wrong. The real chain:

```
caller omits inp.dt  →  bow: drawT + undefined/drawTime = NaN
                     →  setLength(lerp(90, speedMax, NaN))  →  arrow at a NaN POSITION
                     →  three.js bounding sphere = NaN            (the 48 warnings)
                     →  impact → audio.boom → sample bank → non-finite AudioParam
                     →  THROW, inside the frame loop
```

One missing default cost a rendering warning, a dead frame, and two days of mystery. The fix
is three laws this project already had, applied where each was missing:

1. **Audio must never throw** — `samples.js` coerces every AudioParam through `fin()`. The
   synth bodies always did; the sample layer was added later and never inherited it.
2. **Clamp a charge fraction at source** — the law `charge`'s `c01` learned now covers `bow`.
3. **Time is never undefined** — `runSlot` floors `inp.dt` so no caller (harness, replay, net
   frame) can inject NaN time into a dozen accumulators.

Verified: the identical dt-less 52×364 battery now yields **0 NaN projectiles, 0 bounding-sphere
warnings, 0 errors, 0 orphaned audio loops**.

## §24 · THE VISUAL CONTRACT — and the inert damage table it exposed (2026-07-25)

Phase Zero of `docs/POWERS_BRIEF.md`: *"Before producing dozens of effects, add a data-driven
visual profile to every ability… Without it, the visual system will become a collection of
one-off exceptions."*

### The seven traits (`data/visual.js`)

Every ability resolves a profile — **source · shape · trail · impact · residue · material ·
tell** — DERIVED from what it already is (type, dtype, flags), with `def.vis` as the override.
Each trait has a CLOSED vocabulary; a value outside it is a typo, not a new look, and the boot
validator says so. The traits map onto the brief's five readability tests deliberately:

| trait | the test it serves |
|---|---|
| **shape** + **source** | the GRAYSCALE test — silhouette and origin survive with colour removed |
| **trail** | the HALF-SECOND test — what you see before the impact |
| **tell** | the STATUS test — what the victim is now |
| impact · residue · material | the freeze-frame and combat-chaos tests |

Measured over the live roster: **364/364 abilities profiled, 0 vocabulary violations**, with
real spread (9 sources · 12 shapes · 8 trails · 8 impacts · 7 residues · 7 materials · 9 tells).
The engine USES it — `vfx.residue(pos, kind, r)` picks what the ground keeps, so an ice burst
leaves frost and acid leaves sludge instead of everything leaving the same black scorch — and
the codex prints the profile as a `SEEN AS:` line, so the look cannot drift from the data.

### What it found: the damage table was inert

The contract's **material** trait answers "what is this made of". Which meant it could be
checked against the damage type — and **only 5 of 364 abilities had ever declared a `dtype`**.
Manual §3 promises every hit carries a type and every fighter has a resistance table. The
table was real. The data wasn't. So:

- every "cold" cone dealt **energy** — `frostResist` did nothing against frost
- every flame breath dealt **energy** — metal's fire resistance never applied
- a gas cloud dealt **energy** — **a robot could be poisoned**, which §3 explicitly forbids

`applyDtypes(ROSTER)` (boot, next to `applyIdentities`) now stamps the derived type from
MATERIAL onto any ability that doesn't declare one, and 31 elementally-flavoured powers had
their element AUTHORED in `characters.js` — by hand, in the data, because runtime prose-
sniffing is banned here (the "imp in simpler" incident). `steel`/`stone` map to **physical**,
never `ballistic`: only real bullets take the armour filter, and those declare it at the call site.

**Measured, before → after, on a 50-damage hit:**

| matchup | was | now |
|---|---|---|
| KIVULI's gas → TITAN (metal, toxic 0) | 50 | **0** — the promise kept |
| RIME's frost breath → TORCH (frostResist) | 50 | **22.5** |
| acid → TITAN | — | **160** (×1.6, plate corrodes) |
| fire → TITAN | — | **60** (×0.6) |

⚠ **A ruled consequence, written down rather than patched away:** KIVULI's three damaging
powers are all toxic, so against a synthetic her ranged kit does nothing. Her answer is her
fists (physical) and her blind (a status, not damage) — bring the right tool, or get close.
That is the manual's own counter rule working, not a bug.

## §25 · TIER TWO, COMPLETE — all twenty lanes (2026-07-25)

`docs/POWERS_BRIEF.md` Part Four asked for twenty powers that each need *"approximately one
new flag, one new status, or one contained subsystem adjustment."* Five had shipped (sleeping
arrows, smoke blindness, ricochet, frost nova, seekers). The remaining fifteen are in, every
one as DATA on an existing type — no new `TYPES` entry was needed, which is the brief's own
test that a lane was scoped right.

| # | lane | how it is expressed | measured |
|---|---|---|---|
| 4 | **Sticky Bomb** | `stick:{fuse}` on any projectile — clamps to the victim, rides them, fuse accelerates | 24.3 dmg |
| 5 | **Chain Lightning** | `chain:{targets,range,falloff}` — arcs **in sequence**, each jump thinner | 27.4 dmg |
| 6 | **Black Hole Round** | `singularity:{r,dur,pull}` → `game.addSingularity` — debris curves in first, then it **implodes** | 20.3 dmg |
| 7 | **Vampiric Aura** | `siphonAura:{r,dps}` on a buff — drains everyone near, heals you | 13.4 siphoned |
| 8 | **Ground Spikes** | `spikes:{…}` on a cone → `raiseSpike()` — REAL temporary cover, rising in sequence | 5 cover pieces raised |
| 9 | **Decoy Hologram** | `decoy:true` on a summon — an untargetable copy `nearestFoe` prefers | 1 decoy, AI retargets |
| 10 | **Overwatch Turret** | `inherit:true` on a summon — adopts the owner's sheet multipliers | 13.6 dmg |
| 11 | **Blade Cyclone** | `cyclone:{dps,dur}` + `dmgClass:'slash'` on a nova — a serrated halo that keeps cutting | 40.4 dmg |
| 12 | **Magnet Pull** | `magnet:{force}` on a cone — **metal only**; a wooden tree ignores it | props dragged |
| 14 | **Adrenaline Surge** | `hpPerSec` on a buff — power bought with blood, floored at 1 hp | −3.3 hp/s |
| 15 | **Sniper Stance** | `stance:{settle,spreadMult,rateMult,rangeMult}` on a rifle — engages only when you STOP | 86.3 dmg |
| 17 | **Phase Walk** | `walk:true` on phase — the intangible body crosses **interior walls** | wall pass |
| 18 | **Counter Stance** | `riposte:{window,dmg}` on a buff — fires at the `onBlockedStrike` choke point, so it covers every melee source that exists | 30 dmg answer |
| 19 | **Grapple Slam** | `reel:{speed,dmg}` on grapple — hooks a PERSON and drags them to you | 12 dmg + hooked |
| 20 | **Air Superiority** | `def.airSuperiority` at the takeDamage choke point — bonus damage and a DOWNWARD launch on an airborne victim | ×1.45 + slam |

All fourteen new lanes are in the ORIGIN catalog, so they are selectable, not just reachable
from code. Verified: 52×364 battery clean, a 20-second six-fighter rumble clean, 0 NaN
warnings, 0 orphaned audio loops, roster validation 0 problems, build green.

⚠ **Harness note worth keeping:** the first pass of this verification reported four lanes at
zero damage. They were all fine — the *bot walked out of range* while the test held its button.
Freeze the target (`foe.ai = null`) and pin the distance when measuring an ability's output,
or you will "fix" a power that was never broken.

## §26 · TIER THREE, COMPLETE — all twenty systems (2026-07-25)

`docs/POWERS_BRIEF.md` Part Five: *"Each of these requires a new engine system. Each system
should unlock an entire family of future kits rather than serving only one character."* Two
had shipped (Portal Pairs, Interplanetary Flight). The other **eighteen** are in, living in
`engine/systems.js` and `engine/systems2.js` as SYSTEMS WITH PUBLIC VERBS — `abilities.js`
only calls in, so the police, the career, a cutscene or a hero written next year can use them
without touching a power.

| # | system | the thing that makes it real | measured |
|---|---|---|---|
| 1 | **Weather Command** | rain BENDS with wind; lightning lights the skyline; builds gradually, never switches | rain 0→0.67 over 2.5s |
| 2 | **Size Change** | one number moves mass, reach, speed and impact; reshapes MESHES not the group (the ragdoll law) | ×2.2 → radius 4.8, speed 22.1, damage ×2.08, kb-resist 0.41 |
| 3 | **Time Dilation Field** | a spatial bubble; the caster is exempt | foes 0.3×, caster 1.0× |
| 4 | **Duplicates** | ONE shared health pool — hurt a copy, the original bleeds, every copy pulses | 30 damage to a copy = 30 off the original |
| 5 | **Possession** | the PLAYER moves bodies (`game.humans` slot swaps); the abandoned body is left inert and visible-to-nobody | player became the victim; body hidden |
| 6 | **Elasticity** | volume-preserving stretch (thins as it lengthens) + a real melee reach bonus | +9.8u reach on the swing |
| 7 | **Invisibility** | a perception SCORE, not a boolean — movement and attacking give you away | still 0.05, moving 0.69 |
| 8 | **Wall-Crawling** | posture aligns to the SURFACE; falls off with no wall in reach | clings, climbs |
| 9 | **Telekinesis** | grabs a BODY first, then any liftable prop (the weight ladder still rules) | lifted to 9.4u, hurled at 95.8 u/s |
| 11 | **Terrain Reshaping** | a raised wall is REAL cover — physics, LOS, fog and projectiles all see it | +1 cover piece, rises in layers |
| 12 | **Symbiote Consume** | steals ONE slot into your own kit for the match | took "Wave Cannon (STOLEN)" |
| 13 | **Power Mimicry** | copies the whole kit temporarily, with a clean scanning grammar (not tendrils) | lmb became the target's |
| 14 | **Summon Rideable** | a mount with its own speed, entrance and wake | speed 30 → 95 |
| 15 | **Energy Shield Bubble** | hostile fire flattens on it, ALLIED fire leaves | dome intercepts at the projectile choke point |
| 16 | **X-Ray / Thermal** | two different grammars: heat silhouettes + trails vs structural transparency | both modes engage |
| 17 | **Regeneration Factor** | a knockdown becomes a downed window with a finisher window | built on Second Wind |
| 18 | **Banishment** | the victim LEAVES the field (hidden, untouchable) and returns to a scar | gone → back |
| 19 | **Gravity Inversion** | debris reacts first as a warning, THEN bodies lift | 0 → 11.9 → 34 → 66 → 101 → 135 over 3s |

All nineteen new catalog rows are selectable in ORIGIN. **102/102 catalog powers fire clean**,
the 52×364 roster battery is clean, a 20-second rumble is clean, 0 orphaned loops, roster and
visual validators both at zero.

### Four bugs the verification caught (each a law restated)

1. **The vision pass re-showed hidden fighters every frame.** Banished and possessed-away
   bodies were being made visible again by `updateVision`. Anything that removes a fighter
   from the field must be checked THERE, because that loop owns `obj.visible`.
2. **Inverted gravity could not lift a grounded fighter** — the floor clamp pins them, so a
   sign flip alone does nothing. The zone now lets go of the deck first. And the multiplier
   must be applied to the line that actually pulls bodies down, not a flight branch.
3. **`grounded` is a GETTER.** Wall-crawling assigned it and threw. It derives from
   `pos.y <= groundY || onBlock` and `!flying` — set those, never the result.
4. **The telekinesis THROW was gated behind the grab's own cooldown**, so you could pick
   someone up and never put them down. **Letting go is not a cast.**

## §27 · SEEING ACROSS LEVELS, AND TOUCHING THE WORLD (2026-07-25)

`docs/PLAN_ALTITUDE_AND_INTERACTION.md` had three plans. Plan 1 (the four-deck ladder) shipped
in July. Plans 2 and 3 are in now, and the plan's own findings F7 and F9 with them.

### PLAN 2 — seeing and hitting across levels

- **THE PLUMB LINE.** A graduated vertical tether from every airborne fighter down to their
  ground column, built beside `bandRing` and coloured by band. A dash every 50u, so you can
  **count rungs** to a flier the way you count floors on a building — measurable, not merely
  present — and the dashes SCROLL while they are climbing.
  ⚠ **It gates on `_vis > 0.35`.** A tether visible through fog is a wallhack and would
  silently undo the entire AI-honesty effort. Verified: a flier outside the vision cone reads
  `_vis 0` with **the tether hidden**; bring them into view and it draws (5 segments at 200u).
- **THE GROUND-COLUMN PASS in `pickTarget`.** A flier is routinely off-frame while their ring
  is still on screen, so clicking the RING locks the fighter above it. No camera change, no new
  input. Verified: a foe at 181u locked from their ground ring.
- **THE COLUMN CHIP** (`hud.updateColumnChips`) rides above the column with band glyph, height
  in metres and name — same honesty gate.
- **THE RADAR CARRIES HEIGHT.** It was XZ-only, so a foe 300u overhead was a dot beside you.
  Dots are now band-coloured, band-sized, and numbered.
- **`hud.spectatorBands`** is an explicit ADMIN view (all tethers at full opacity, all chips) —
  deliberately not a change to the player HUD.
- **THE HONEST LIMIT, SAID OUT LOUD.** A gravity throw cannot reach the BUILDING deck: a
  grenade peaks near 25u, a car near 44u, the deck is at 96. The plan says do NOT inflate
  gravity to fix this. So the arc turns **red** and the HUD reads **OUT OF REACH** when the
  locked target is above the arc's apex. The answer to a cloud camper is a beam, a homing
  shot, or climbing to meet them.

### PLAN 3 — interaction, choice, and actually holding things

- **THE INTERACTABLE CONTRACT.** `game.registerInteractable({pos, r, label, verb, priority,
  enabled, onFocus, onUse})`. Focus is scanned at 10 Hz and scored by distance **and FACING** —
  you interact with what you are looking at. Verified: focus acquired, `onUse` fired, and
  turning away **drops** it.
  ⚠ **The teardown trap:** anything a city tile registers is flagged `cityOwned` and spliced in
  `world._teardownCity()`, or a rebuilt city inherits ghost prompts pointing at deleted
  geometry. (This needed a `world.game` back-reference, which did not exist.)
- **THE G-CHAIN — no new key.** `interact → throw → pick up gear → hoist → grab`, in priority
  order. Four behaviours on one key is only acceptable **because the prompt shows which one is
  armed**, so `hud.interactPrompt` is part of the feature, not decoration.
- **THE CHOICE SURFACE** is a **FIELD INTERCEPT TRANSCRIPT**, not a JRPG box: classification
  bar, mono speaker slug with the real district, typed body, numbered `§` option rows with
  consequence tags, ESC to withdraw. **LIVE by default** — a street conversation that stopped
  the world would fight the police and heat systems still running. Verified open with
  `game.running === true`.
- **CARRYING COSTS YOU YOUR HANDS.** You cannot strike or guard while holding a car. One line,
  and it turns carrying into a decision. Verified: both refused while carrying.
- **F9, both leaks:** `dispose()` and `startMatch` now release carries, so a prop can no longer
  outlive its carrier or leave a fighter permanently slowed.

## §28 · THE ROADMAP ITEMS THAT WERE STILL OPEN (2026-07-25)

`docs/ENGINE_ROADMAP.md` was a twenty-item plan; most had quietly shipped inside other work.
These are the ones that genuinely hadn't, plus the two mode rules the backlog wanted.

- **SHOCK — the anti-machine status** (roadmap 5). Freeze, burn and poison all favour flesh.
  Shock is the one a MACHINE cannot shrug off: metal takes **1.6×** duration, flesh **0.55×**.
  It pins actions like every other CC, drops a flier out of the sky, and has a 3s immunity so
  it cannot chain. Measured: TITAN 4.29s vs GALE 1.57s from the same 3s application.
- **ARMOUR AS A THIRD BAR** (roadmap 4). `def.armor` was a flat subtraction; now plated and
  metal chassis carry a real POOL that eats 55% of an incoming hit and knits back at 14%/s
  after five calm seconds — so armour is something you can strip and something that recovers
  if you disengage. Derived, so nothing is hand-authored: GALE has none, TITAN has 26.
  Measured: 26 → 4 under fire, back to 18.6 after nine quiet seconds.
- **DIRECTIONAL DESCENT** (roadmap 9). Descending WITH a direction held is a power dive along
  your facing, not a lift going down — it trades height for speed. Measured **83 u/s**
  horizontal off a 200u drop, which is exactly what makes the dive punch (§10) an approach
  rather than a trick. ⚠ It needed the movement INTENT stamped in `move()`; the Fighter had no
  field carrying "where the player is pushing".
- **FIRES THAT SPREAD** (roadmap 12). A burning patch lights the next flammable thing near it —
  capped at 14 so a city can never fully ignite, and each patch burns out on its own. Measured
  1 → 2 patches in four seconds.
- **THE KO CAM** (roadmap 18). A knockout you caused swings a short orbit around the body while
  the ragdoll settles, then hands the camera back. It refuses to run if a cinematic or the map
  tool already owns the camera.
- **SPECTATE** (backlog). `game.spectate(on, who)` follows a fighter and ignores your input;
  `cycleSpectate()` steps through the living. You can sit out a fight and watch it.
- **RING-OUT RULES** (backlog). `ms.ringOut` turns the arena border from a wall you bounce off
  into the way you LOSE. ⚠ **The border had to stop clamping for this to be possible at all** —
  the physics clamp meant nobody could ever be outside the arena, so a ring-out check could
  never fire. Under the rule the arena lets you leave; without it the wall still holds.
  Verified both ways in the same session.

## §29 · THE TWO FILE SPLITS (2026-07-25) — code review items 4 and 8

The last two roadmap items. Both are "a big file was carrying unrelated jobs", and both are
done the same way: **methods move to their own module as a MIXIN, installed onto the class
prototype**, so `this` still means what it meant and **not one call site changed**.

```js
Object.assign(World.prototype, FogMixin, RoadMixin);
Object.assign(HUD.prototype, CodexMixin, BroadcastMixin, TitleMixin);
```

| file | was | now |
|---|---|---|
| `world.js` | 1816 | **1524** + `fog.js` 123 + `roads.js` 228 |
| `hud.js` | 2570 | **1737** + `hudUtil.js` 149 + `hudCodex.js` 195 + `hudBroadcast.js` 219 + `hudTitle.js` 374 |

**The shared helpers came out FIRST** (`hudUtil.js` — escaping, the registry paperwork, the
case-file row builders, the ability describers), exactly as the review specified. That is what
makes the screen splits acyclic: the screens import from `hudUtil`, never from each other.

### What this cost, and the four traps it walked into

The first attempt at this was abandoned mid-session because a hand-rolled text slice produced
invalid object literals twice. The second attempt used a real **indent-aware method extractor**
(the 2-space `^  }` line IS the method boundary in these classes), so the text that moved is
byte-identical to the text removed. The traps, all of which bit:

1. **A class body takes no commas between methods; an object literal requires them.** Moving a
   method from `class X {}` into `export const Mixin = {}` means joining with `,\n\n`.
2. **Module-level constants stay behind.** `FOG_RES/FOG_EXT/FOG_STEPS` were declared in
   world.js; they moved WITH the fog because nothing else read them. Check every free identifier.
3. **Imported symbols are free identifiers too.** `ROAD`, `CELL`, `junctionAt` and
   `mergeGeometries` were imports of world.js, not declarations — a "which locals does this
   need" sweep misses them entirely.
4. **A non-exported helper of a helper.** `flagCC` was used only by `fileNoOf`; moving
   `fileNoOf` to `hudUtil` left `flagCC` behind in hud.js and the title screen died at boot.

Verified after the split: every method is on the prototype (10 world, 9 HUD), Tokyo builds with
live fog and roads and Kabul rebuilds over it, the title screen renders 53 cards and the cold
open, the codex renders all seven sections including its `SEEN AS` visual line, the damage
codex renders every type, and a real match produces the full KMK 9 broadcast with the tale of
the tape. Battery 52×364 + 102 catalog powers + a 15-second rumble: **0 errors, 0 orphaned
loops, roster/tile/visual validators all zero.**

## §30 · NaN <= NaN IS FALSE (2026-07-25) — the two-day bug, closed

The backlog's `computeBoundingSphere(): Computed radius is NaN` had **two** causes. The first
(the bow's missing `dt`) is §23. This is the second, and it is the one worth remembering.

The altitude plumb line (§27) writes a persistent 56-vertex buffer every frame, skipping
degenerate dashes:

```js
const y0 = Math.max(0, d - scroll), y1 = Math.min(h, y0 + 26);
if (y1 <= y0) continue;          // <- does NOT stop a NaN
```

`Math.max(0, NaN)` is NaN. **`NaN <= NaN` is `false`.** So when `scroll` went non-finite for a
frame, the skip did not fire, NaN went into a buffer that lives for the life of the fighter,
and it stayed there long after the transient that caused it — which is precisely why it was
unreproducible. Guarding the *inputs* could never have caught it.

**THE RULE: validate what you WRITE, not what went in.** The write now checks the two values it
actually stores, and the skip is `if (!(y1 > y0))` — NaN-safe — instead of `if (y1 <= y0)`,
which is not. Any comparison-based guard on a value that could be NaN needs the same inversion.

**How to find the next one.** Three's message names no object. Hook `console.error`; when it
fires, walk the whole scene graph *at that instant* and report the first geometry holding a
non-finite position. That named `/Scene/Group/LineSegments`, depth 2, 56 vertices, first bad
index 1 — the tether's first Y — in one run. Patching `computeBoundingSphere` had failed twice,
because by the time it is called the frame that wrote the NaN is over.

**THE VFX FINITE LAW**, added alongside as the visual twin of audio's `fin()`: all nine `vfx`
primitives that build geometry from a position now reject a non-finite one at the door and, in
dev, print the calling site. A NaN position must never reach a BufferAttribute.

Verified: the full combined run — 52×364 battery, 102 catalog powers, a 20-second rumble, and
the async tail — reports **0 NaN warnings, 0 thrown errors, 0 orphaned loops**.

---

## §31 · THINGS THAT OUTLIVE THEIR MATCH (2026-07-25) — the crash/freeze pass

A crash is loud and gets fixed. A freeze is quiet: something accumulates until a frame can no
longer finish. This pass hunted accumulation, and the four laws below are what it produced.
Three of them are the same idea wearing different clothes — **a thing must not outlive the match
that made it** — and the fourth is about not making the symptom worse than the disease.

### THE RESET LAW — one place clears the board

There were three reset paths (`startMatch`, `startMode`, `_tourneyRound`) and each hand-listed
what it cleared. That is fine on the day you write it and wrong forever after, because every
system added later is silently exempt. Measured over ten restarts: spikes 0→20, decoys 0→10,
domes 0→10, reshaped terrain 0→10, time fields 0→10, gravity zones 0→10, interactables 0→10,
fires 0→4 — and, worst, **cover 17→48** with scene children 49→104 and geometries 279→628.

Cover is not cosmetic. It drives physics, `canSee`, the AI's line of sight and the fog raster,
so a cover list that grows every restart makes every one of those slower and wronger. That is
the shape of a freeze.

`game.clearTransients()` is now the single place that empties all of it, and all three reset
paths call it as their first act. Verified: twelve restarts with every zone type fired on each,
and the counters are flat — cover 18 → 18, and rounds 4 / 8 / 12 read 21 / 21 / 21.

### THE DEFERRED-CALLBACK LAW — `game.later`, never bare `setTimeout`

A `setTimeout` fires **outside the frame loop**, so `main.js`'s try/catch cannot see it. An
exception in a deferred callback escapes every safety net the game has. Worse, the callback
lands in whatever match is running when it fires — chain lightning arcs sequentially over
0.06s per jump, so a reset between jumps had the rest of the chain damaging a fighter from the
previous match.

`game.later(fn, ms)` stamps the current match generation, refuses to run if the generation has
moved, and swallows its own throw into `reportError`. `clearTransients` bumps the generation and
clears every armed timer. Converted: chain lightning, the tier-up arcs, and the weather's
thunder. Verified: a callback armed before a reset does not run, its timer is cleared, and a
chain fired into a dying match lands no damage in the next one.

### THE REVOKE LAW — free the resource *and* clear the slot

The news crew's clip frames are object URLs, and the cold open and the end-screen TV hold the
same clip objects. Revoking a URL while leaving the string in the array hands those screens a
dangling handle; the `<img>` then fails with `ERR_FILE_NOT_FOUND`. One stress run logged **68**
of them. The cold open's `onerror` caught each at the app level, which is why nothing visibly
broke — but a use-after-free is a use-after-free, and console errors at volume are themselves a
stall.

`revokeFrames(frames)` revokes each URL **and nulls the slot**, and shed or reset clips are
marked `_dead` so a viewer drops them rather than discovering them the hard way. This also
props up the BROADCAST ENCODE LAW (CLAUDE.md): `revokeFrames` nulls the `'#enc…'` tokens too, so a reset
landing between `arr.push(token)` and the async `toBlob` callback makes that `indexOf` miss, and
the blob is dropped instead of becoming an object URL nobody will ever revoke. The two laws hold
each other up; don't weaken either. Verified: the same yank-the-rug sequence now logs zero.

### THE REPEATED-ERROR LAW — a caught error must not become the freeze

`catch (err) { console.error(err) }` in the frame loop is correct — one bad frame must never
stop the game — but if the error recurs it fires sixty times a second. Serialising a stack
object at 60Hz is itself a freeze, and the player just sees a game that stopped moving with
nothing said.

`game.reportError(err, where)` logs each distinct error **once** in full, counts the rest, and
at thirty occurrences says plainly on the feed that the frame is failing. The ledger is capped
at 200 keys, because errors carrying a varying number ("NaN at index 42") are each a distinct
key and the accounting must not become the leak. `window.error` and `unhandledrejection` route
through the same throttle, so a broken timer or promise can't flood either. Verified: 500
identical throws produce **2** console lines; five distinct throws produce five.

### What the numbers say now

A three-minute AI-vs-AI rumble with real rendering: **p50 4.2ms, p95 10.3ms, p99 15.0ms, zero
frames over 50ms**. Entities, minions, clips, match log, feed lines, DOM nodes, sustained audio
loops and armed timers all bounded; heap plateaus at 88MB; shader programs plateau at 50
(45 → 48 → 48 → 48 → 50 → 50 → 50 across six matches), which is the light-count law still
holding. The beam-on-a-raised-guard repro — the original "blocking completely freezes" report —
runs at 4.29ms average with lights pinned 14 ↔ 14 and **zero frames over 20ms** once warm.

**Two spikes are real and are not defects.** The first frame of a match costs ~47ms (it builds
86 geometries and compiles 4 programs); the establishing card and the opening cinematic exist
in front of exactly that. And one frame in a cold run costs ~90ms while allocating *nothing* —
no geometry, no texture, no program — which is a garbage collection pause, not our code. Neither
recurs once warm. Say so rather than chasing them.

---

## §32 · THE AUDIT OF §31 (2026-07-25) — three defects in the fix itself

A hardening pass is code, and code has bugs. Re-reading §31's own work found three, plus one
older defect that the same discipline should have caught long ago.

**`later()` only protected half of itself.** The `try` wrapped the callback but not the bookkeeping
line above it, so a throw from the timer accounting would escape into exactly the void the method
exists to seal. The try now covers the whole body, and the `reportError` call inside the catch is
itself wrapped — the failure handler of the failure handler.

**`reportError` could throw from inside an error handler.** It calls `hud.feed` to tell the player
the frame is failing. If the HUD is the thing that broke, that call throws — from a method invoked
by the frame's `catch` *and* by `window.onerror`. An error handler that can itself throw is worse
than the error. Wrapped, and verified against a deliberately hostile HUD.

**The comment block ended up on the wrong function.** Inserting `later()` above `clearTransients`
left the transient-clearing rationale — the measured 17→48 cover leak, the whole reason the method
exists — sitting above `later()`. In a codebase where the comments carry the reasoning, a
misfiled explanation is a real defect. Moved back.

### The cinematic needed the same law

`game.later` covers the fight. The opening director stagger-schedules its reveals with plain
`setTimeout`, and those kept firing after a SKIP: measured **up to six stray zaps in the first
three seconds of the live match** from the ladder and satellite cold-opens. `dLater` records every
deferred beat effect and `finish()` retires the set. Verified 0 stray sounds after a skip, all ten
variants clean, and the DOM flat across eight consecutive openings (1392 nodes before and after).

### And the older one: a can't-drift surface that drifted

`resistOf(def, sheet)` takes two arguments. MAGIC resistance derives from RESOLVE through the
sheet; called as `resistOf(def)` it quietly uses the res-6 default, which returns **×1.03 for
everybody**. The Fighter constructor passed the sheet. Both codex surfaces did not — so the
DAMAGE CODEX printed `IMMUNE— RESISTS— WEAK—` on the MAGIC row and every hero's defence chip read
the same number, concealing the entire rule the screen exists to display.

The claim in the docs was that the codex "physically cannot drift from the engine because it runs
the engine's own function." That was false, and instructively so: **calling the same function is
not the same as calling it the same way.** A defaulted parameter is a second, silent
implementation. Fixed at both sites; the row now reads RESISTS TITAN · MYSTWARD · CIRCUIT and WEAK
across the res-5 cast, and the roster shows five distinct values from 0.82 to 1.10.

---

## §33 · THE WHITE ROOM (2026-07-25) — a chamber that measures

Training mode is a sandbox in a real city. This is the other half: a sealed test chamber, an
instrumented dummy, and a wall board that reports what your attacks actually did.

### The measurement law

Every number on the board is captured at **`game.onHit`** — the choke point every damage source in
the game already routes through. Nothing in the room recomputes damage from an ability's data. It
reports what the engine *applied*, after armour, resistance, guard, momentum and injury. A
training readout that models its own damage is a readout that lies the first time someone edits
the pipeline, and this project has already paid for that lesson twice on other surfaces.

It also adds nothing to the combat hot path: the attack's name comes from `c._lastSlot`, which
`runSlot` already writes for the mastery counter.

### The burst rule

A punch lands once for 8. A beam lands sixty times for 1. Filed as separate records the board
ranks the punch above the beam, which is exactly backwards and makes the comparison table worse
than no table. **Consecutive hits from the same attack inside 0.35s are one BURST**, and the
burst's total is what gets compared. Measured on SOL: `Heat Ray 44.0 (66 ticks)` against
`JAB 8.3` — the ordering a player would expect, and the truth.

### The dummy is two things

**Passive** — it stands on its mark and takes it, for measuring a clean number.
**Sparring** (N) — it closes and fights back, for measuring the same attack against a moving
target with a guard, which is a different number and the more useful one.

⚠ It is **not** spawned with `dummy: true`. That flag makes a fighter untargetable — `game.isFoe`
returns false for it, which is correct for a sim construct nobody should shoot at, and fatal here:
the sparring AI could never find a foe and stood still for twelve seconds. It is a real fighter
kept alive by pinning its health, which also means status effects land on it visibly.

⚠ And pinning health is not immortality. The kill happens *inside* takeDamage, so restoring hp on
the next frame resurrects nothing — one big enough ult left a corpse and an empty room. If the
dummy does go down, the chamber projects a new one.

### Two things the room taught about its own presentation

**A white room cannot be white.** `#f2f0ea` walls under the scene lights *and* the bloom pass
clipped completely, and both fighters read as pale ghosts against them. The walls sit at a light
grey now so the subject is the brightest thing in frame — which is the entire job of a test
chamber.

**Hide the city, don't tear it down.** The first build put a white box inside a live Tokyo and
photographed a wall with a skyline behind it. The room hides the world's meshes — the arena group,
city bits, roads, parked cars, and the wildlife instances, which keep rendering even when their
tick is disabled — and restores them on close, so leaving the room costs nothing and the theater
you travelled to is still there.

Entry: the WHITE ROOM mode card. **N** toggles the dummy. **Shift+R** clears the log.
Ref `wwa-whiteroom.png`.

---

## §34 · THE TRAINING HALL (2026-07-25) — the first large indoor environment

The White Room stopped being a box with a dummy in it. It is now a roofed hall with apparatus,
and it is the project's first real interior at scale — which turned out to be a different
engineering problem from a city, in three specific ways.

### What an indoor space costs in a fixed isometric camera

**A solid ceiling photographs as a blank slab.** The first build put a proper roof on and the
entire hall disappeared underneath it. Both fixes are the standard interior cutaway, made
structural rather than dynamic: the two camera-side walls are built LOW (a parapet you see over),
and the roof is a LATTICE OF BEAMS. You read "roofed" from the beams and the light rig in
peripheral vision, and you can still see your own fight. Keep the roof quiet — seven thick beams
read as bars laid across the fight; five thin ones read as a ceiling.

**A roof is only possible because a room is a BOX.** The terrain heightfield cannot fold over
itself, which is why the metro is an open cut and why there are no tunnels. Flight is clamped to
`CEIL` in code regardless of what the geometry does, so you cannot leave an indoor room by flying.

**Hiding the world cannot be a list.** The first pass hid the arena group, the city bits and the
roads by name, and a single ambulance parked outside the wall survived all three. Enumerating what
to hide is a losing game against a world that keeps growing. The hall now hides **everything on
the scene except its own group, the lights, and the living fighters** — a rule that cannot be
out-grown. ⚠ With one protection: `particles.points` is a persistent scene child, and a blanket
hide silently kills every particle effect in the room, which is the one thing a test chamber must
never do.

### The apparatus law

**The moving targets are FIGHTERS on rails.** Not bespoke hit-test objects. That buys real
projectile collision, real melee reach, real damage types, guard interaction and scoring for free
and forever — a hand-rolled hit test drifts from combat the first time combat changes.

**The turrets fire REAL projectiles**, through `projectiles.spawnProjectile`, so guarding,
evading, deflecting and phasing all behave exactly as they do in a match. Each one telegraphs for
0.55s before firing: a training hall that shoots you with no warning teaches nothing except to
stand still.

**Nothing is hidden in a training hall.** The pillars are real cover, so the vision system gave
targets standing in plain sight "last known position" ghosts — a hall full of red question marks.
Vision is overridden for the duration and restored on close. This is the one room where the
honesty law has nothing to protect, because there is no opponent being handed an unfair read.

### The drills, and how you choose them

Five: FREE PRACTICE · MOVING TARGETS · EVASION · FLIGHT COURSE · SPARRING. You change them by
walking to a **console** and using it — the same `registerInteractable` G-chain as everything else
in the world, so the selector is a thing in the room rather than a menu over it.

Scores are the same events the rest of the game already fires: a target down is a KO, and a hit
taken in EVASION is `onHit` seen from the other side.

Ref `wwa-training-hall.png`.


---

## §35 · THE SPACE LAYER (2026-07-25) — the crossing, as a cinematic you can steer

Robert: *"show flybys of the planets when travelling past them, and each planet's atmosphere
entering… keep the same art style and scale and feel cinematic… we should see stars… keep the
process open so when we add vehicles, characters can travel with ships, space ships and alien ships
and all."* Then, as a goal: *"prioritise customizability, and make sure it's dynamic enough to have
groups of flyers, a flyer and a ship, and more."*

### Three decisions the rest falls out of

**1. It renders through the game's own composer.** `engine/spaceflight.js` builds its own
`THREE.Scene` and swaps it into the existing `RenderPass` — one line each way — so the crossing
inherits the exact bloom, exposure and ACES tone-map the street does. "Matching the art style" is
then not something anyone has to maintain; it is the same pipeline and it cannot drift. Restored in
`finish()`, including on a skip.

**2. The traveller is a PARTY, never a hero.** Everything flies a list from `data/vessels.js`:

```
makeParty({ hero })                                     one flyer
makeParty({ heroes: [a,b,c,d,e,f] })                    a flight of six
makeParty({ hero, ship: 'shuttle' })                    a flyer and a ship
makeParty({ heroes, ship: 'freighter', escort: 'interceptor', escortCount: 2 })
makeParty({ hero, alien: 'scout', alienCount: 2 })      shadowed by something else
```

The formation is a **function of the index**, not a table, so six flyers and one flyer take the same
code path; `formationFor` picks solo / vee / echelon / line / escort / swarm from what the party
actually *is*. A flyer's wake colours come from its own `def.afterburner` row, so an ORIGIN custom
arrives in space wearing its own colours with nobody wiring it up.

**3. The route decides the beats.** `buildRoute` (data/planets.js) returns the bodies a crossing
sweeps past and *when*. Fly to Pluto and you get the Moon, Mars, Jupiter, Saturn, Uranus and Neptune
in order, because they are genuinely between you and it. Anything past 30 AU is `deep` and earns the
heliopause and Oort acts. Nothing hard-codes a journey.

### A ship is a parts list

`VESSELS` rows are arrays of primitives with a material role (`hull/trim/glass/engine/dark`) and a
palette. Adding a craft is adding a row — no mesh files, no loader, no second art pipeline, and the
flat-shaded look is guaranteed because every part is built from the same five geometries the rest of
the game uses. Shipped: ORBITAL SHUTTLE · BULK FREIGHTER · INTERCEPTOR · XENO SCOUT · ARK HAULER.

### Four things that were wrong and are worth remembering

- **⚠ THE PARTY AND THE PLANETS WERE ON TWO DIFFERENT CLOCKS.** Bodies were laid out by their route
  fraction (where they sit in AU) while the party flew the beat clock (how long each beat lasts), so
  during "the Moon flyby" the travellers were somewhere else on the lane entirely and the shot
  framed empty space with a planet in it. **A flyby is a coincidence in time**, so `_placeFromBeats`
  parks each body where the party will actually be when its own beat plays.
- **⚠ EVERY SHOT IS AN OFFSET FROM THE PARTY.** The first camera positioned and aimed at the *body*
  during a flyby and the travellers — the entire subject — left frame. Framing as *party plus a
  blend toward whatever the beat is about* makes that impossible, and works identically for one
  flyer and a convoy because offsets are in party-spreads.
- **⚠ SPACE IS EMPTY AND THAT IS NOT A SHOT.** Flown at a constant rate the last beats played
  thousands of units out and Mars was a marble during its own atmospheric entry. `_lane` is
  **smootherstep**: slow at both ends, fast through the empty middle — you leave a world you can
  still see and arrive at one that fills the frame.
- **⚠ THE DEPARTURE CAMERA WAS BEHIND THE PARTY LOOKING FORWARD AT EARTH,** which is also forward —
  so the travellers were behind the lens and the planet outside the cone, and the one beat asked for
  by name rendered as an empty starfield. It stands off the bow and looks back now.

Also: the match HUD is hidden for the duration and restored *exactly as found* (an element already
hidden must stay hidden — the tutorial and the phone layout both hide things for reasons); the
heliopause shell is a hint at 0.04 opacity and the **bow shock** carries the act, because a backside
sphere you are inside tints every pixel and drowns the stars.

### Verified

Six party shapes flown headlessly (`{ manual: true }` never touches rAF — step it and assert, the
same contract the opening director uses): solo, six-flyer echelon, flyer + shuttle, a six-strong
convoy with a freighter and two interceptors, an alien pair, and a deep run to the heliopause with
an Ark Hauler. Beats assemble correctly from each route, Jupiter correctly gets **no** atmospheric
entry (no surface), a Moon hop correctly gets **no** flybys, the deep crossing gets helio + Oort and
no entry, and scene, camera and `running` are restored with the overlay removed on every run
including a live real-time skip. 0 console errors.

Console: `space <target|deep> [flyers] [ship]` — e.g. `space pluto 3 freighter`.
Refs: `wwa-space-depart.png`, `wwa-space-flyby.png`, `wwa-space-helio.png`, `wwa-space-entry.png`.


---

## §36 · THE ALMANAC — orbits, the syzygy, the moons, and what it takes to stand there (2026-07-25)

Robert: *"make sure the planets rotate around the sun; where the planets are depends on the time of
year in this game; make sure they only perfectly align on Feb 12th; make sure the distance to the
moon scales; give the planets all their more interesting moons; obsess over the skies where it
matters; then I want the environments to be fit for our game — we will have space suits of some
kind, but what would it take for Ascendants to survive on these respective environments?"*

### `data/orbits.js` — a date in, positions out

Nothing in the game stores where a planet is. It **asks**. That is what makes "the time of year"
real rather than decorative: the route you fly to Mars is a different length in April than in
October, because Mars is somewhere else.

**The syzygy is a consequence, not a special case.** Every body's mean longitude is zero at the
epoch, so on 12 February 2026 they are strung out along one line from the sun. After that they
separate at their own rates, and because the orbital periods are mutually irrational they never all
return to zero together again. *No code enforces that.* `alignmentSpread` measures it:

| date | spread |
|---|---|
| **12 Feb 2026** | **0.0000°** |
| 11 or 13 Feb 2026 | 2.09° |
| 19 Feb 2026 | 14.47° |
| 12 Mar 2026 | 55.36° |
| 12 Feb 2027 | 27.21° |

Scanning **every one of the 146,000 days from 1900 to 2300**, the best alignment found is that exact
date. The claim is demonstrable from inside the game: `almanac` prints it.

Consequence, measured: **Earth→Mars ranges 0.524 AU to 2.511 AU across a single year** — nearly
five-fold. `buildRoute` used to use `|a.au − b.au|`, the difference of two orbital *radii*, which is
the true distance only on the day the two worlds happen to line up. It uses the real chord now, and
the transit time moves with it.

Circular coplanar orbits, stated plainly rather than hidden: real orbits are ellipses in slightly
different planes, and modelling that would change a flyby by a few percent while making every number
in the game unexplainable. What this gets right is the thing the game leans on — the **angle**
between two worlds on a given day.

### The moons, at the distance nobody believes

Twenty moons across seven planets, each with its real orbital radius. The number that matters is
distance in units of the **parent's radius**, because a moon drawn "a few planet-widths out" is a
diagram, not a place:

| | in parent radii |
|---|---|
| Iapetus (Saturn) | **61.1×** |
| **Luna (Earth)** | **60.3×** |
| Callisto (Jupiter) | 26.9× |
| Titan (Saturn) | 21.0× |
| Phobos (Mars) | 2.8× |

Sizes are compressed in the cinematic the same way the planets' are, so a 6 km Deimos stays visible.
**Distance is never fudged**, because distance is the part nobody believes.

### `data/environments.js` — the sky and the hazard model answer each other

Air is what makes a sky, so a sky is a fact about an atmosphere. Mars' day is butterscotch and its
**sunset is blue** — the exact inverse of Earth's, for the exact same reason. The Moon's sky is black
at noon with the sun up. At Pluto the sun is 0.014° across: a very bright **star**, with no disc, and
noon is lit at 2%. That last one is not a colour grade — `world.setSkyWorld` drops the actual sun
intensity by the inverse square, floored so a match stays playable.

A world attacks along **channels** — anoxia, vacuum, cold, heat, crush, toxic, radiation, gravity —
and a fighter answers each with something they **are** or something they **wear**. No `def.id ===`
anywhere: a custom built in ORIGIN this afternoon gets a correct answer for Titan with nobody adding
a row.

**Two faults worth remembering.** The first model had **no anoxia channel**, so it could not say the
obvious thing — the reason you suit up on Titan is that there is nothing to breathe, not that it is
cold — and every world came out needing the same heavy suit for the wrong reason. And the suit ladder
gave the pressure suit `cold 2` while every cold world was `cold 3`, so the lightest rung protected
nobody anywhere. Calibrated against reality: men walked on the Moon in a **soft** suit, so the Moon
is a pressure-suit world; what the heavy rungs buy is radiation and pressure.

**And what you throw is what you survive.** Traits alone said the ICE fighter would freeze on Titan,
which is absurd on its face — `frostResist` is a flag carried by *fire* heroes. A fighter's own kit
is the evidence now, so RIME answers cold on Pluto and TORCH answers heat on Io, derived.

| | Moon | Mars | Titan | Pluto | Europa | Io | Venus | Jupiter |
|---|---|---|---|---|---|---|---|---|
| most of the roster | pressure | pressure | pressure | pressure | deep | deep | **lethal** | **lethal** |
| TITAN (a machine) | pressure | pressure | pressure | pressure | **pressure** | deep | lethal | lethal |

Venus and Jupiter kill everyone: no suit closes crush 3. Unprotected clocks are honest numbers —
15 seconds in vacuum, 60 on Titan.

### Reachable from inside the game

`date`, `almanac`, `moons <planet>`, `survive <world> [hero]` in the dev console.
⚠ `_dncEarth = {...this._dnc}` copies *references* to the same `THREE.Color` instances — the backup
was the same object, and Earth → Pluto → Earth came home to Pluto's sky. Clone colours.

### The crack shell (found 2026-07-25 by the surface audit)

⚠ **A PERCENTAGE IS NOT AN OFFSET.** The battle-damage crack overlay was sized `w * 1.015`, which
makes its gap from the building face PROPORTIONAL: 0.33u on a 44u block, but **0.075u — 1.4 cm —
on a 10u one**. Everything narrower than 47u was below the depth buffer's floor at camera range.
It survived the flicker sweep because a crack overlay is only visible on a DAMAGED building, so a
still scene never showed it. Both copies (world.js and citytiles.js) now add `DECAL_LIFT * 2` to the
box, giving a constant shell at any building size. Measured: post-combat audit 7 problems → 5.

⚠ **Known and deliberately not chased:** a damaged building scales (`scale.y = 1 - dmg * 0.12`), and
a scaled parent shrinks its child's `DECAL_LIFT` offset with it — so a heavily damaged tower's roof
plane sits at ~0.31u instead of 0.35u. Still ~6 cm and far above the tearing floor; the fix would be
to counter-scale the roof, which costs a per-frame write on every damaged building for a gap nobody
can see close. Recorded so the next audit knows it is a known reading, not a new defect.

### An intermittent surface pair, recorded rather than claimed fixed (2026-07-26)

One sweep out of four reported a genuine sub-threshold pair — `BoxGeometry / PlaneGeometry` at
**0.117u (2.2 cm)**, area over 40 — after a 30-second four-way rumble. Three later sweeps, and a
dedicated probe that re-derived the pair with mesh names, parents, colours and userData, found
nothing. It is **combat-dependent**: it exists only for certain landings of craters, scorches and
shattered blocks, so it does not reproduce on demand.

The likely source is the `decalY()` ladder: `citytiles.disc`/`slab` hand each ground decal the next
**14 mm** rung, which is deliberately far below `DECAL_LIFT`. The ladder exists so many decals of
one KIND do not collide with each other, and it works because they are ordered — but a decal that
does not opt out with `depthWrite: false` can still meet an ordinary surface inside the floor.

⚠ Not chased, and deliberately not claimed fixed. Reproducing it needs a seeded combat run, which
the engine does not currently offer (`Math.random` drives crater placement). Recorded here so the
next audit recognises it as a known intermittent rather than a new regression, and so that anyone
adding a seeded-combat harness knows there is a real finding waiting for it.

## §37 · THE RANK LADDER (2026-07-25) — one scale, from a child to a supreme being

Robert: *"I think 1-10 on strength isn't good enough… think about all the heroes… is that good
enough or should we scale everything to 1-100, with various levels? We need our designation."*

**HE IS RIGHT, AND THE REASON IS COUNTABLE.** On a 1–10 scale everything from "low superhuman" to
"cosmic" has to fit in the two rungs between 9 and 10 — so RAGE, TITAN, NOVA and MAJESTY all
rounded to the same lifting power and the roster's whole top half was one value. His ladder runs
1–4999 with fifteen named bands and still spends its first nine rungs inside the ordinary human
range, which is exactly where a superhero roster needs resolution: the gap between a trained
soldier and a peak human is a real gap, and on a 1–10 scale it is invisible.

`data/scale.js` is the whole ladder and everything reads it.

### The two tables are two tables

⚠ **His DESIGNATION table and his WEIGHT table do not share band edges.** The designation table
splits the superhuman range into four (50-59, 60-69, 70-79, 80-99) and lumps the human range into
one (1-9). The weight table does the opposite — it splits the human range into three (1-2, 3-5,
6-9) and lumps 50-74 and 75-99. Forcing them into one row set would silently move numbers he wrote
down. `BANDS` and `WEIGHTS` are kept separate over ONE rank axis, and each query reads its own.

### The figure sits at the TOP of its band

⚠ **This is the one thing that is easy to get backwards, and his own finer sheet settles it.** Rank
19 lifts 400 lb and the band labelled 10-19 says 400 lb; rank 39 lifts 2,200 lb and the band
labelled 30-39 says "1 ton"; rank 49 lifts 22,400 and 40-49 says "10 tons". Every row lines up on
its LAST rank. Anchor at the bottom instead and every character in the game lifts several times too
much. Verified: all seven of his written figures reproduce to the pound through the live page.

Interpolation inside a band is **geometric**, not flat — flat means rank 40 and rank 49 lift
identically and nine rungs mean nothing, which is the problem the file exists to fix.

### `def.strength` stays; `def.rank` is the real axis

Fifty-two heroes, every ORIGIN custom and the whole creator are authored in 1–10, and breaking that
to gain resolution would be a bad trade. The 1–10 is the **authoring shorthand** and remains the
**combat multiplier** (melee damage, knockback resistance, ice break-out — those are tuned and are
deliberately untouched). What moved to rank is what a fighter can **LIFT** and what they are
**CALLED**. `rankOf(def)` returns `def.rank` when present and derives from `STR_TO_RANK` otherwise.

⚠ **THE RESOLUTION IS IN THE ROSTER, NOT THE SCALE.** A 1000-rung ladder fed by ten authored values
has ten occupied points — 50-59 and 80-99 came out completely empty. All 52 heroes carry an
explicit `def.rank` now, genre-anchored so the band you land in is the band you would name out
loud: KNIGHTFALL 29 (the very top of Exceptional Human), KANO 39, WEBLINE 42, TRENCH 58, SOL 66,
TITAN 79, VANGUARD 95, RAGE 120. **Nine of fifteen bands occupied, 45 distinct ranks.** Everything
from Cosmic/EARTHBREAKER up is deliberately empty — headroom is the point, and that is where
antagonists and creator customs live.

### One ladder, two front doors

`liftCapacityOf(def)` is the real one; `liftCapacity(str)` is the 1–10 shim for callers holding
only a number. Both end in `liftTonsOfRank`, so they cannot disagree — which is exactly the failure
the old duplicated `STRENGTH_LB` array in entity.js had. ⚠ Every live carry/throw site was passing
`def.strength`, so `def.rank` reached nothing until they were rewired (5 sites in game.js, 1 in
melee.js). A rank the engine never reads is decoration.

### Consequences that are the point

Measured: **24/52 heroes can lift a 1.9 t car** (rank 42+), **12/52 can lift a 24 t airliner**.
WEBLINE goes from 0.5 t to 2.0 t — Spider-Man lifting a car is correct and was wrong before.
HIVE lifts 0.10 t and is refused the car by capacity, not by a hard-coded gate.

### The knockback chart is the same axis

His melee chart's band edges ARE the designation table's, so `knockbackOf(rank)` lives in the same
file rather than in a second table that can drift: spaces knocked back, and whether the blow puts
them THROUGH a wall (rank 40+ — the Low Superhuman line). A space is 5 ft ≈ 8 world units.

### Where it shows

The codex prints **STRENGTH RANK · designation · CS** and **LIFT · comparison** in § DERIVED, and
the **DESIGNATION + CONTAINMENT** rows in §02 beside the LeFevre class — capability and legal
posture are different statements about the same number. The select screen's at-a-glance chips lead
with the band name. `deriveAttrs` MIGHT reads the ladder too, or a `def.rank` override would show a
sheet that contradicts its own case file. Ref `lsw-rank-codex.jpeg`.

⚠ **`rankBandOf` is the name to import.** `core/util.js` already exports `bandOf` for ALTITUDE
bands; a file wanting both gets a duplicate-declaration SyntaxError at parse time, which takes the
whole page down rather than just the feature. Paid for once.

⚠ **A tension in the source, flagged not silently "fixed":** his designations run to OMNIPOTENT but
his weight column stops at 400 tons, so a Sunbreaker lifts only ~1.8× what an Earthshaker does.
Past the cosmic line, lifting power and destructive power stop being the same axis — a Sunbreaker
is not defined by tonnage. His numbers are used exactly as written; if the top end should climb,
that is a decision for the sheet, not for the code.

## §38 · THE ARMORY (2026-07-26) — real weapons, real gear, and a voice each

Robert: *"Make standard weapons — 2 sniper rifles, 2 rifles, AK and M-16, pistols — and get sounds
for them all. Night vision and motion detector. All items they have in military or special ops
missions: tear gas, mustard gas, military, spec ops, police. And superhero weapons — katana, claws."*

`data/armory.js` is the catalogue: **13 firearms, 6 blades, 16 gear, 9 loadouts.**

### Everything is an existing type

⚠ **NOT ONE ROW NEEDED A NEW BRANCH IN THE COMBAT PIPELINE.** A firearm is a `rifle` ability with a
`weapon` class. A blade is a `melee` ability with `dmgClass: 'slash'` — which is what makes it open
WOUNDS (§12) and what makes the swing audio pick the metallic shing instead of the airy whoosh. Gas
is a `payload`. A sight is an item. That is the test of whether a weapon system is data or a pile of
special cases, and it is the reason the ballistic scale (§3) already makes an AK lethal to a person
and an annoyance to TITAN without anybody writing that rule.

### Every firearm has its own voice, and it has to

The CC0 sample library contains **no true gunfire** — documented when the sample bank landed. A
single shared `bang` across twelve weapons would make them indistinct, which is *worse* than the
synth, because the entire point of carrying twelve weapons is being able to hear which one is
shooting at you.

`VOICES` gives each weapon a **crack** (supersonic transient), **body** (chest thump in Hz), **tail**
(room slap) and **mech** (bolt, blowback, cylinder, pump). `audio.gunshot(power, pos, voice)` builds
the report from the profile; the recorded plate-crack stays as the transient, *pitched by calibre*.
On a suppressed weapon the **action is the loudest layer**, which is what a suppressor actually
sounds like.

Measured through an analyser on the master bus: **13/13 audible, 13/13 distinct spectral
signatures**, body frequencies from 58 Hz (the .50) to 190 Hz (the suppressed PDW).

⚠ **MEASURE WITH rAF, NOT `setTimeout`.** A gunshot transient is ~40 ms. The first harness polled on
throttled timers and caught the peak for only **3 of 13** weapons — and gave two weapons that share
ONE voice profile completely different numbers, which is the tell that the *measurement* was racing
rather than the synth being silent. Frame-locked polling: the same two weapons now read 985.67 and
957.

### Every shot is heard, and suppressed ones are heard less

⚠ Writing this as `if (def.quiet) g.noise(...)` was **backwards and nearly shipped**. Gunfire did not
broadcast to the AI at all before this — only the HIT did (§the honesty law) — so gating the
broadcast on `quiet` would have made the suppressed PDW the only weapon in the game a bot could hear
being fired. The broadcast runs for everything now, scaled by the report.

### Vision is a device you carry

Night vision, the motion tracker and the thermal scope all route through the ONE `_visionMode`
system that already existed, so nothing new has to know they were added.

⚠ **THE VISION PARAMS LIVE ON THE GAME** (`game.visNear` / `visRange` / `visCos`), not on the
fighter. Writing them onto `f` compiles, runs, and does absolutely nothing.

⚠ **`setVisionMode` MUST CLEAR BEFORE IT SETS.** Using night vision twice saved the *already
multiplied* values as the "original", so the restore handed back a permanently widened cone — a
stacking wallhack that outlives the goggles. Switching from night to thermal mid-use stranded the
save entirely and night vision never came off at all. Verified: no stacking, and switching restores.

**Night vision AMPLIFIES, it does not reveal.** It widens and lengthens the real cone and lifts
renderer exposure toward phosphor green — the dark stops being cover, which is a different and more
interesting thing than seeing through walls.

**The motion tracker pings only what MOVES**, through walls, on a 0.85 s sweep. Stand still and it
never sees you — that trade is what stops it being a wallhack with extra steps, and it also means it
never finds a sniper holding a lane.

### Two gases, two different weapons

**CS gas** is a CONTROL tool: it blinds, it doubles you over (`staggerT`), and it does almost no
damage. That is precisely what makes it police equipment rather than a weapon. **Mustard** is a
blister agent: slow, no blinding, and it **corrodes** — which makes it the one thing an armoured
chassis actually fears. Both ride the DoT and corrode lanes that already exist.

⚠ A gas cloud KEEPS WORKING after it lands, and it reschedules itself with **`game.later`, never a
bare `setTimeout`** — a cloud must not outlive the match that made it (§31, the deferred-callback law).

### The jammer cuts the radio, not their eyes

⚠ It sets `ai._jammedT`, and **`_callOut` had to be taught to read it** or the item was a particle
effect. A jammed bot still sees perfectly with its own eyes; it just stops being told what everyone
else can see. A real tactical effect that never makes anyone blind or stupid.

### Silhouettes

`buildWeapon` gained **katana** (blade, tsuba, wrapped hilt), **claws** (three blades PAST the
knuckles — not a held object), **smg**, **sniper** (long barrel, scope, stock) and **baton**. All
built along the arm's −Y axis like every other weapon here, so the poses and the ragdoll carry them
for free.

### Reachable

`arm` in the dev console lists and equips anything: `arm ak`, `arm m107 rmb`, `arm specops`,
`arm mustard`. The police keep their own tuned kit deliberately — rewiring their balance was not
part of this pass.

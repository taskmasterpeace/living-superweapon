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
  ceiling −40). Verified: offered exactly once at altitude 373 over a 328 ceiling.
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

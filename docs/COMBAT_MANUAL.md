# THE COMBAT MANUAL

How damage actually works in LIVING SUPERWEAPON. Every number here is read from the code, not
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
| `ballistic` | bullets, pellets | lethal to people, an annoyance to superweapons |
| `energy` | ki blasts, beams, spirit bombs | the universal currency — few resistances |
| `fire` | flame arrows, burn stacks, PYRE/TORCH | strong vs flesh, weak vs metal |
| `cold` | frost cones, RIME | builds FREEZE; fire heroes shrug it off |
| `toxic` | poison, gas, KIVULI | **needs a metabolism — machines are immune** |
| `acid` | NEW — see §4 | **corrodes ARMOUR; weak against bare flesh** |

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

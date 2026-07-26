# POWERWORLD — COMBAT TUNING AUDIT + TELEPORT-INTERCEPT DESIGN

Read-only audit of `D:\lsw`. Every claim below cites `file:line`. Where a number is **arithmetic
from source** rather than measured in-engine it says so; §7 is the list of everything that needs a
headless run before it is trusted.

Headline, up front:

1. **The chase loop is blocked by ONE constant and it is not a melee constant.** It is the drag class
   in `entity.js:1339`. A maximum-momentum haymaker moves a body about **22 units** and it is back to
   walking speed in a quarter second. There is nothing to chase.
2. **The single biggest blocker to airborne melee is `game.js:1827`** — a hard `|Δy| > 10` skip in
   `coneFoe`. Every jab, cross, haymaker, grab and kit `melee` ability in the game routes through it.
3. **Beam struggle already exists and is good — and it is mathematically impossible between two
   fliers more than ~51° apart in elevation** (`projectiles.js:1029-1030`), and force-flattens both
   beams to horizontal when it does fire (`projectiles.js:1037`).
4. **TELEPORT-INTERCEPT needs no new key, no new system, and no new state field.** `launchT` is
   already the perfect eligibility signal, `performEvade` and the `teleport` TYPE are the two
   delivery systems, `burstT` is the clamp-lift, and `updateBlinkMark` is already the tell surface.

---

## 1. THE KNOCKBACK-CHASE LOOP AUDIT

### 1a. `momentumMult` — verified from source, and it is already saturated

`src/engine/melee.js:14-17`:

```
export function momentumMult(f) {
  const k = Math.min(1, Math.max(0, ((f._momSpd || 0) - 12) / 46));
  return 1 + 1.5 * k * k;
}
```

The stated ladder is exact. Computed:

| arrival speed (u/s) | `momentumMult` |
|---|---|
| ≤ 12 | 1.000 |
| 26 | 1.139 |
| 32.4 (RAGE ground walk) | 1.295 |
| 46 | 1.819 |
| 52.9 (SOL level air) | 2.186 |
| **58 and above** | **2.500 (capped)** |

`_momSpd` is a full 3D magnitude sampled **before** the lunge impulse — `melee.js:48` in `strike()`
and `melee.js:92` in `_heavy()`, with the lunge added at `melee.js:56` and `melee.js:96`. That is
correct and is one of the things in this file that should not be touched.

**The finding: the curve saturates below the speeds POWERWORLD will actually be fought at.**
`move()`'s air multipliers (`entity.js:1490`, cruise at `1492-1496`) give, arithmetically:

| hero | ground | level flight | + cruise (SHIFT) | + afterburner |
|---|---|---|---|---|
| SOL (spd 34, tier 3, flySpeed 1.2) | 36.7 | 52.9 | **79.3** | **111.0** |
| APEX (spd 32, tier 3, flySpeed 1) | 34.6 | 41.5 | 62.2 | 87.1 |
| TITAN (spd 29, tier 2) | 31.3 | 24.4 | 36.6 | — |

SOL's *ordinary* cruise is 79.3 and his burner is 111. **Both are past the ×2.5 cap.** In an
all-airborne dimension every connected punch is a maximum-momentum punch, so momentum stops being a
decision — which is the opposite of what §10 was built to do. See the tuning table (§6) for the
proposed `(spd−18)/74` denominator.

### 1b. What the ESF loop needs, and what the code does

The loop is: **hit → they fly → you chase → you catch → repeat.** Four things have to be true.
Three of them are.

| requirement | state | evidence |
|---|---|---|
| the hit has to launch them | ✅ **works** | `melee.js:144-145` — haymaker kb `54 × mom`, launch `16 × mom`; `entity.js:694-695` applies both; `entity.js:699` arms `launchT = 1.1` on `kb > 30` or `|launch| > 12` |
| the launch must not be cancelled by the flight servo | ✅ **works, deliberately** | `entity.js:1254-1260` — `launchT > 0` makes the deck servo yield entirely and hands the axis to gravity. Explicitly commented "a servo here would eat the hit and make heavies weightless." |
| the launched body has to **travel** | ❌ **BROKEN — this is the loop** | `entity.js:1339` |
| you have to be able to arrive at them | ❌ missing | no intercept; §4 is the answer |

### 1c. `launchT`, drag, and `_thrownT`'s exception — the actual numbers

`entity.js:1339` is the whole problem:

```
const dragF = Math.exp((this._slideT > 0 || this._thrownT > 0 ? -1.3 : -6) * dt);
```

`launchT` is **not** in that list. A launched body decays on the ordinary walking drag coefficient
of −6/s. Under `v(t) = v₀·e^(−ct)`, total travel is `v₀/c`:

| coefficient | who gets it | v₀ = 133 (max-momentum haymaker vs STR 5) |
|---|---|---|
| **−6** (`launchT`, i.e. **every knockback in the game**) | melee kb, slams, beam overpower, areaDamage | 73.0 u/s at 0.1s · 29.7 at 0.25s · 6.6 at 0.5s · **22.2u total travel** |
| **−1.3** (`_slideT`, `_thrownT`) | RIME's skate, the aimed throw | 116.8 at 0.1s · 96.1 at 0.25s · 69.4 at 0.5s · **102.3u total travel** |

`_thrownT`'s exception (set at `melee.js:217`, honoured at `entity.js:1339`, documented in manual
§11 and CLAUDE.md) is **exactly the mechanism knockback needs, already written, already tested, and
applied to only one source.** A thrown body travels 4.6× further than a punched one from the same
velocity. That asymmetry is why the aimed throw feels like a launcher and a haymaker does not.

Corroboration that −6 is real: the CLINCH pass measured step-in travel as jab 0.5u / cross 2.46u /
power 5.14u for `step` values 2.0/3.0/4.5 (`martial.js:21-25`) × `STEP_IMPULSE 8` (`martial.js:35`).
Under −6 drag a 36 u/s impulse asymptotes at 36/6 = 6.0u; measured 5.14u. The model agrees with the
engine's own measurement.

**22 units is about two body lengths (a fighter is 9.6u).** For scale, the flagship arena is 240u
across and a downtown tower is 54–150u tall (CLAUDE.md). A knockback that travels two body lengths
and is at walking speed in 0.25s does not create a chase — it creates a shove.

### 1d. A second, additional suspicion: `move()`'s walk-speed clamp

`entity.js:1509-1511` clamps horizontal velocity **unconditionally**, every frame, and only
`burstT`/`_slideT` lift it:

```
const mx = (this.burstT > 0 || this._slideT > 0) ? Math.max(s, 150) : s;
```

`launchT` is not in that list either. And `takeDamage` **never sets `burstT`** — exhaustively
grepped; the only setters are `abilities.js:362` (dash), `abilities.js:872` (grapnel reel),
`abilities.js:1087/1097/1102` (evade leap/phase/dash), `game.js:922` (singularity pull),
`projectiles.js:931` (the beam pressure ladder), `boxingring.js:421` (the ropes) and
`entity.js:1214/1292` (grapnel reel, power dive). Seven systems that move a body learned the
clamp-lift. **The core knockback path in `takeDamage` did not.**

`move()` is called unconditionally, once per frame, from `game.js:2821` (player), `2890` (pad) and
`2931` (bot), and `game.js:3082-3084` runs all control **before** `game.js:3101` runs `f.update`
(which is where `_physics` integrates). During hitstop `move()` early-returns (`entity.js:1484`) and
`update()` early-returns (`entity.js:1158`) — so nothing moves. On the first frame *after* hitstop,
`move()` runs and clamps.

If that reading is right, a 133 u/s knockback against a grounded SOL is truncated to **36.7 u/s**
before it is ever integrated, and the real travel is ~5.8u, not 22u.

⚠ **This contradicts manual §11's measured figure** ("a STR-10 hurl leaves at 108 u/s and reaches a
fighter 24u downrange at ~78 u/s"). One of the two is wrong. The most likely explanation is that the
§11 harness overrode `controlBot`/`controlPlayer` — the documented override in CLAUDE.md — which
skips `move()` entirely and therefore the clamp; that is precisely the "⚠ DRIVE THE GATE, DON'T
WRITE PAST IT" failure the CLINCH notes warn about. **Measure this first (§7, item 1).** Either way
the −6 drag conclusion in §1c stands on its own: 22u is the ceiling, 5.8u is the floor.

One genuinely useful asymmetry falls out: the clamp is **horizontal only**. Vertical launch
(`16 × mom` on a haymaker, `24` on a beam overpower at `projectiles.js:1057`, `0.22 × spd` on a
throw at `melee.js:215`) is never clamped, and `vel.y` is only bounded at ±(160/70) at
`entity.js:1341`. So the game's *vertical* knockback already works and its *horizontal* knockback is
crushed — and the ESF loop is mostly horizontal.

### 1e. Things that are already right and should not be changed

- `_momDive` / **THE DIVE PUNCH** (`melee.js:49`, `93`, `145`, `254`) is the ESF loop's finisher and
  it already exists, complete with the `launchT`-arming down-force and the ground-slam credit.
- `launchT` as a universal "did not arrive under your own power" signal — already read by `_slam`
  (`entity.js:793`), the servo (`1254`), the boxing ropes (§45), and the thrown-body chain
  (`game.js:821`). It is the right eligibility signal for intercept too.
- `updateThrownBodies` (`game.js:803-832`) — bowling one body through another, credited to the
  thrower, with a guard BRACE. This is a finished ESF mechanic waiting for a vertical gate that
  lets it fire in the air.
- The `_thrownT` drag exception. The fix for §1c is to widen an existing rule, not invent one.

---

## 2. ⚠ THE VERTICAL GATE — the single biggest blocker to airborne melee

`src/engine/game.js:1819-1833`, `coneFoe`. The gate is line **1827**:

```
  coneFoe(caster, range, arc) {
    let best = null, bd = range * range;
    for (const f of this.entities) {
      if (!this.isFoe(caster, f)) continue;
      const dx = f.pos.x - caster.pos.x, dz = f.pos.z - caster.pos.z; const d = Math.hypot(dx, dz);
      if (d > range) continue;
      // the VERTICAL GATE (altitude plan F5): a jab must not connect with a foe a whole band
      // overhead — melee and grabs are same-deck weapons. ~one storey of tolerance.
      if (Math.abs(f.pos.y - caster.pos.y) > 10) continue;
```

### What it means, quantified

A fighter is **9.6u tall** and `1u ≈ 0.19m`, so `10u` is **1.04 fighter heights ≈ 1.9 metres** of
vertical tolerance. Note the comparison is `pos.y` to `pos.y` — **foot to foot**, not centre to
centre. So the gate is satisfied only when the two fighters' feet are within one body height.

Everything that reaches through `coneFoe` is therefore a strictly same-altitude weapon:

| caller | file:line | reach |
|---|---|---|
| jab / cross (the trifecta combo) | `melee.js:239` | 11u / 9u (`martial.js:21,23`) |
| straight / HAYMAKER | `melee.js:110` | 7u (`STRIKES.power.reach`, `martial.js:25`) |
| **GRAB** | `melee.js:278` | 8u + wrestler's `grabBonus` 3 (`martial.js:61`) |
| every kit `melee` TYPE ability | `abilities.js:59` | `def.range`, 11–14u across the roster |
| every `cone` TYPE (flamethrowers, gas, cold, sonic) | `abilities.js:192`ff | 26–32u |

In the city this is correct and is a documented ruling (BALANCE.md:134-135, "jabs and grabs are
same-deck weapons now"). **In POWERWORLD it is fatal.** Two fliers who read as "right next to each
other" on the isometric camera are routinely 15–25u apart in y — the four decks themselves are
82u/115u/88u apart on the flagship (see §3), so anything short of *docked on the same deck* fails
the gate. The result is that a player in an air fight throws punches at a foe that is visually in
front of them and nothing happens, with no feedback explaining why.

**Grabs are worse than strikes**, because the clinch is the one thing that *already works* in the
air once it lands: `melee.js:305` pins the victim to `v.pos.y = f.pos.y`, so a mid-air clinch, aim
and hurl is fully functional today — it just cannot be entered.

### The other vertical windows, all of which need the same treatment

| gate | file:line | value | what it decides |
|---|---|---|---|
| `coneFoe` | `game.js:1827` | **10** | all melee, all grabs, all cones |
| `overlapFoe` | `game.js:1814` | **9** (`|pos.y − (f.pos.y+5)| < 9`) | thrown props, growing-orb detonation, mine triggers |
| `updateThrownBodies` | `game.js:816` | **9** | bowling a thrown body through a second fighter |
| `resolveBodies` | `game.js:1399` | **7** | body-vs-body separation (above 7u they interpenetrate) |
| `ai.js` range control | `ai.js:173`, `218-219` | **no vertical term at all** | see §6 |
| `canSee` | `game.js:1256-1275` | XZ segment + a crude `min(y)+5 > top` skip | a flier at 200u looking down past a 54u building is denied LOS if the 2D segment crosses it |

`rush` is the one ability that already gets this right: `abilities.js:93` teleports the caster to
`f.pos.y` before each hit, so a rush combo works at any altitude difference. **That is the model to
copy** — and it is also why TELEPORT-INTERCEPT must set the arrival altitude equal to the target's.

---

## 3. THE FOUR-DECK SERVO vs FREE FLIGHT

### What the servo actually does

`entity.js:1239-1320`. Band classification and deck heights:

- `bandAt2(h)` (`1246`): `0` below `BANDS.ground`, `1` below `BANDS.building`, `2` below `BANDS.sky`,
  else `3`.
- `maxBand = def.maxBand ?? (flightTier >= 3 ? 3 : 1)` (`1247`) — **tier ≤ 2 is lidded at BUILDING.**
  A documented balance nerf (BALANCE.md:126-128) covering RIME/WARDEN/PYRE/RIFT/TITAN/KIVULI, plus
  every tier-1 flier (VOLT/HIVE/KRAKEN/CHAINFIRE/FOUNDRY/MOSES).
- `deckOf(b)` (`1248-1253`): band 0 → `null` (free float); band 1 → `_roofUnder + 3`, else
  `ground + (building−ground)·0.58`; band 2 → `building + (sky−building)·0.5`; band 3 →
  `sky + (ceiling−sky)·0.55`.
  On the flagship (BANDS 158/268/328, CLAUDE.md) that is **≈ 95 / 213 / 301**. On the
  `BAND_DEFAULTS` in `core/util.js:52` (8/150/260/320) it is **≈ 90 / 205 / 293**.
- The dock (`1298-1316`): on release of ascend, with tier ≥ 2,
  `vel.y = damp(vel.y, clamp((deck − pos.y) · 2.6, −FLY_SINK, FLY_SINK·0.92) + bob, 6, dt)`.
  You are actively driven onto the deck at up to `FLY_SINK` = 26 u/s (`entity.js:27`).

**There is no "hold this altitude".** The three available states are climb (`flyHeld`, `1261-1282`),
sink (`descendHeld`, `1283-1295`), and *dock to one of four heights*. In a city with rooftops and a
visible skyline that reads as a ladder. In an empty sky it reads as an invisible magnet: after every
exchange both fighters are dragged to the nearest of four arbitrary altitudes — and because they may
be dragged to *different* decks, the servo actively pulls the fight apart vertically, straight into
the `|Δy| > 10` gate from §2.

### What already yields to it

| yielder | file:line | note |
|---|---|---|
| `launchT > 0` | `1254-1260` | knockback owns the axis; gravity at 34/s. The precedent for what we want. |
| `flyHeld` | `1261` | climbing |
| `descendHeld` | `1283` | sinking, plus the directional power dive |
| `flightTier <= 1` | `1296` | sags at −7/s instead of docking |
| **a lit afterburner** | `1271-1272` | `burning = def.afterburner && _burnT > 0.8`. ⚠ **Only inside the `flyHeld` climb branch.** Release the button with the burner lit and the servo docks you anyway. That is a latent inconsistency with the ceiling clamp at `1380`, which makes the same exception unconditionally. |

### The proposal — a flag, not a fork

**One early return inside `deckOf`.** If free flight is on, `deckOf()` returns `null` for every
band. `null` already routes into the branch at `entity.js:1304-1305` — the GROUND band's free
levitation with a gentle bob. That branch exists, is shipped, and is tested.

Why this is the right shape:

- **Nothing else in the file changes.** No second physics path. `_deckSnap`, `_climbBand`, the rung
  click at `1278-1281`, the ALT ladder and `ALT_BANDS` (`entity.js:105-110`) all keep working.
- **It goes through the existing data channel.** `BANDS` is already per-theatre, set by
  `setBands` (`core/util.js:52-54`) from `plan.bands`. Put `freeFlight` on the plan next to
  `world`/`biosphere`/`atmosphere` (the airless-world pass's precedent) and let `setBands` copy it
  into `BANDS`, so `entity.js` reads it from the one place it already reads band data. That satisfies
  both "a flag not a fork" and the one-source-of-truth law.
- **`maxBand` must be lifted with it** (`entity.js:1247`). Otherwise two thirds of the roster is
  still lidded at BUILDING and cannot participate in a sky war. This is an explicit balance ruling
  being overridden per-theatre, which is the honest way to do it — it needs an AI-vs-AI audit
  (BALANCE.md's method), not a silent edit.
- ⚠ **The soft floor rides the same flag.** `entity.js:1305` biases `vel.y` up by 7 when
  `pos.y < groundY + 2.6`. That is a GROUND-band courtesy. In a dimension with no meaningful floor it
  becomes an invisible updraft at the bottom of the map.
- ⚠ **`BANDS.ceiling` stays.** The lid at `entity.js:1377-1383` and its afterburner exception are the
  ORBIT rule (§17) and the DEPART trigger. POWERWORLD wants a lid, just a much higher one — change
  the number, not the rule.
- ⚠ **Do not remove the servo globally.** It is the answer to a real complaint Robert made
  ("he was going up until I let go of the button and that's exactly where he stopped"). Two theatres,
  two behaviours, one flag.

---

## 4. TELEPORT-INTERCEPT — the design

**One sentence:** when you have just launched someone, you can spend ki to appear ahead of them on
their own flight path, already travelling, at power-punch range — so knockback becomes an exchange
instead of a reset.

It is the right step 1 because it is small (one function plus two call sites), it needs no camera
change, and it converts the mechanics that already exist (momentum melee, the dive punch, the
clinch, thrown-body bowling) from things that occasionally happen into a loop.

### 4.1 Input

**No new key.** Two contextual overloads, which is also what satisfies the protocol's two-delivery-
systems requirement:

| lane | delivery system | carrier | control |
|---|---|---|---|
| **A** | the ability-slot `teleport` TYPE (`abilities.js:327-341`) | **KANO** — `e: Snap Transit`, `characters.js:35`, cost 12, cd 1.4, range 58 | the existing slot key. With an interceptable foe on the board the same press becomes an intercept; with none it is the ordinary aim-point blink it is today. |
| **B** | the double-tap EVADE lane (`performEvade`, `abilities.js:1064-1106`) | **APEX** — `evade: { kind: 'blink', name: 'Afterimage', range: 22 }`, `characters.js` (blink carriers: kano/apex/rift/mystward/graven) | double-tap a move key **toward** the launched foe. Movement tech, no slot, no HUD chip. |

Both are additive flags on data (`intercept: true` on the ability def / on the evade block), never
an id check — protocol item 1. Contextual key overloading has precedent in this codebase and a stated
condition: the G-chain comment at `game.js:2828-2832` — *"Four behaviours on one key is only
acceptable because the PROMPT shows which one is armed."* The tell in §4.6 is that prompt.

There are **10 `teleport` carriers** (`kano, volt, warden, apex, rift, mystward, knightfall, marshal,
kamaria, graven`) and **5 `blink` evade carriers** (`kano, apex, rift, mystward, graven`), so the
mechanic can spread later without touching either lane again.

### 4.2 The target and the eligibility signal

**`launchT > 0` is the signal, and it already exists.** Declared `entity.js:229`, armed
`entity.js:699` (`kb > 30` or `|launch| > 12`), decremented `entity.js:820`, and already read by
`_slam` (`793`), the deck servo (`1254`), the thrown-body chain (`game.js:821`) and the boxing ropes
(§45). It means exactly "this body did not arrive under its own power."

Eligibility, all four conditions:

1. `foe.launchT > 0` **or** `foe._thrownT > 0` — the window. 1.1s from a hit (`entity.js:699`),
   1.35s from a throw (`melee.js:217`). That is the whole reaction budget; it is not a travel button.
2. `foe.lastHitBy === c && foe.lastHitT < 1.4` — **you** launched them. `lastHitBy`/`lastHitT` are
   already maintained at `entity.js:675`. Without this, in a rumble a third party gets a free approach
   onto anybody the moment two other fighters touch.
3. `game.canSee(c, foe)` (`game.js:1256`) — the honesty gate. A bot must not intercept a body it
   cannot see; a bot's version reads `ai.belief`, never `real.pos` (`ai.js:138-169`).
4. `dist3D(c, foe) <= def.range` (KANO 58, APEX 22→30 proposed). Interception is not teleport-to-
   anywhere.

Target selection when several qualify: nearest in 3D. Do **not** reuse `nearestFoe`
(`game.js:1794-1808`) — it is XZ-only, so a foe 200u directly overhead reads as distance ≈ 0.

### 4.3 Arrival position, altitude and facing

Not "behind them" and not "on them" — **ahead of them on their own velocity vector.**

```
lead   = normalize(foe.vel)            fall back to normalize(foe.pos − c.pos) if |foe.vel| < 6
arrive = foe.pos + lead * STANDOFF
arrive.y = foe.pos.y                   ⚠ EXACTLY equal — see below
facing = −lead                         you are looking back down their flight path
```

- **`STANDOFF = 6.5u`.** Inside `STRIKES.power.reach` = 7 (`martial.js:25`) and comfortably outside
  `resolveBodies`' separation floor of `2.2 + 2.2 = 4.4` (`entity.js:182`, `game.js:1400`). This is
  the payoff, stated in one number: the intercept delivers you at **POWER range**, the one range the
  spacing inversion (`martial.js:6-9`) normally makes you walk through their jab to reach.
- ⚠ **`arrive.y = foe.pos.y` is the most important line in the whole design.** `coneFoe`'s gate
  (`game.js:1827`) will refuse the punch you just teleported to make if you land even 11u off. `rush`
  already does exactly this (`abilities.js:93`) and is the precedent.
- ⚠ Clamp `arrive` inside `world.ARENA − 4` (`entity.js:1390`) and below `BANDS.ceiling`
  (`entity.js:1377`), and guard the whole thing for finiteness — `entity.js:1362` is there because
  one NaN in `pos` blanks the frame with no throw.
- Arriving inside cover is acceptable and honest: the existing `teleport` TYPE does not check cover
  either (`abilities.js:335`) and the AABB resolver pushes you out on the least-penetration axis.
  Say so in the manual rather than adding a check that will be wrong at 1:1 scale.

### 4.4 Velocity, cost, cooldown

**Arrive travelling.** This is the mechanical reason the feature closes the loop rather than merely
repositioning:

```
c.vel = lead * matchSpeed        matchSpeed = min(|foe.vel|, ownAirClamp * 1.15)
c.burstT = 0.35
```

- ⚠ **`burstT` is mandatory.** Without it `move()`'s clamp (`entity.js:1509`) erases the matched
  velocity on the very next frame and `_momSpd` (`melee.js:48`) reads a standing punch. This is the
  same trap as §1d, and the beam pressure ladder solved it identically at `projectiles.js:931`.
- ⚠ **Cap the match speed at the interceptor's own air clamp × 1.15.** Otherwise the intercept is a
  free momentum battery and one knockdown chains to a KO. The interceptor should arrive *fast for
  them*, not fast in absolute terms.

**Cost 14 ki. No cooldown of its own — it consumes the carrier's.** Lane A pays through
`pay()` (`abilities.js:17`), so `st.cd = def.cd × cdMult × moodMult` (KANO 1.4s); lane B pays through
`performEvade`'s `evadeCd = cd × evadeCdMult` (`abilities.js:1068`, blink default 1.0s). Base ki regen
is 9/s, so **14 ki is ~1.5s of regen: you cannot intercept twice without landing a hit in between.**
Overdrive is the intended synergy — the same argument BALANCE.md:107-113 makes for supernova. A chase
is therefore two or three exchanges, not an orbit.

### 4.5 The counter — four, all already in the engine

1. **The window closes.** `launchT` is 1.1s. Land, or regain control, and there is nothing to
   intercept. This is the primary counter and it costs the victim nothing but timing.
2. **No i-frames on arrival.** ⚠ Both lanes' defaults grant invulnerability — the `teleport` TYPE
   sets `invuln = 0.28` (`abilities.js:336`) and blink sets `iframes: 0.3` (`abilities.js:1075`).
   **Intercept must grant neither.** Instead the arriving fighter gets a short action-lock
   (`_interceptT ≈ 0.12`) during which they cannot raise guard. That is deliberately shorter than
   `RISK_WINDOW` = 0.40 (`martial.js:41`) so it is a real but small punish window.
3. **The arrival point is deterministic and therefore contestable.** It is 6.5u ahead of the victim
   on the victim's own velocity vector. A victim who can still act can punch, beam or nova *into*
   that point. This only works if the tell is drawn — see §4.6. It is what turns intercept from a
   pursuit tool into a read.
4. **The stun already blocks the degenerate case.** A stunned victim cannot answer, but
   `_stunImmune` is 4s (`entity.js:754`, region) and guarded damage never enters the burst window
   (`entity.js:720-724`) — so chain-intercept into chain-stun is already impossible.

### 4.6 The readable tell

Three parts, all reusing existing surfaces. Nothing here needs a third-person camera — which is the
owner's constraint, and it is satisfied.

1. **On the victim: "I am interceptable."** The ground `stateRing` already shows guard / grab /
   charge / stagger (driven in `_animate`, CLAUDE.md). Add a LAUNCHED colour. Both players read the
   same ring, so both know the window is open. This is the piece that makes counter #3 fair.
2. **On the chaser: the destination.** `game.updateBlinkMark` (`game.js:344-370`) **already draws
   exactly this** — a rotating ring plus a hovering pip at the projected teleport destination,
   coloured amber when out of range (`367-369`), rebuilt every frame for any `type: 'teleport'` slot
   that is off cooldown and affordable (`357`). Two changes: it is pinned to `y = 0.2` (`364`) and
   must ride the arrival altitude, and the destination must come from the intercept solve rather than
   `aimPoint`. The ground-column precedent at `game.js:1319-1326` (already shipped for clicking
   off-frame fliers from the iso camera) says the right presentation is **both** — a marker at
   altitude *and* a column marker on the ground beneath it.
3. **Departure and arrival.** `game.afterimage` (`game.js:2707`) twice, `audio.teleport()` (already
   the sound of both lanes, `abilities.js:330`/`1073`), `vfx.impactStar` at the departure point, and
   `game.slowmo(0.08, 0.55)` (`game.js:1349`) on arrival. ⚠ Keep the slowmo tiny — a big one turns
   the loop into a cutscene and the loop is the point.

### 4.7 Systems it routes through — and the ONE choke point

| concern | routed through | file:line |
|---|---|---|
| the move itself | **`game.intercept(c, foe)` — one function, called by both lanes** | new |
| lane A entry | a branch inside the `teleport` TYPE; inherits `ready()` / `pay()` / `onNoKi` | `abilities.js:327`, `16`, `17`, `1045` |
| lane B entry | a new `case` inside `performEvade`'s switch; inherits cost / `evadeCdMult` / `onNoKi` | `abilities.js:1064-1106` |
| eligibility | `launchT` / `_thrownT` | `entity.js:229-230`, `699`, `820` |
| ownership | `lastHitBy` / `lastHitT` | `entity.js:675` |
| honesty | `canSee`; bots use `ai.belief` | `game.js:1256`; `ai.js:44-101` |
| the clamp-lift | `burstT` | `entity.js:1509` |
| the constraint the arrival must satisfy | `coneFoe`'s vertical gate | `game.js:1827` |
| pure-boxing / disarm refusal | free — lane A is behind `runSlot`'s `noPowers` gate | `abilities.js:1026` |

⚠ **Never two copies of the arrival maths.** Both lanes call the same `game.intercept`. That is the
same argument as `game.onBlockedStrike` (BALANCE.md:68) and `game.equipFrom` (THE HANDS) — the reason
the block law works everywhere is that it lives at one choke point.

### 4.8 §5 MECHANIC PROTOCOL compliance

| requirement | how |
|---|---|
| data-driven TYPE, not an id check | `intercept: true` on the ability def and on the evade block. Zero `def.id ===`. |
| one choke point | `game.intercept(c, foe)`. Both lanes call it; nothing else implements arrival. |
| ≥2 carriers via ≥2 delivery systems | **KANO** via the ability-slot `teleport` TYPE; **APEX** via the double-tap EVADE lane. Two heroes, two genuinely different input paths. |
| a counter | four (§4.5): the window closes, no i-frames, a deterministic contestable arrival point, and the existing 4s stun immunity. |
| readable | the victim's LAUNCHED state ring, the extended `updateBlinkMark` at altitude + ground column, `audio.teleport`, two afterimages, an 0.08s hitch. |
| in the manual | COMBAT_MANUAL §46, **same commit**. |
| headlessly verified with real assertions | §4.9. |

### 4.9 The headless suite — and the traps it must avoid

Standard recipe: `LSW.game.startMatch(id)`, `spawnRival`, drive `game.controlPlayer` (the documented
override), step `game.update(dt)`.

Assertions that actually prove the feature:

1. **The suite proves itself first** (the wwa-verify law): a point-blank jab connects before anything
   about intercept is asserted. A vacuous pass has shipped here before (`[].every()` is true — THE
   SLOT SAYS WHAT IT IS).
2. Launch the foe with a **real** haymaker — `chargeStart` → `chargeUpdate` across several frames with
   a *held* input → `chargeRelease`. ⚠ A stubbed `controlPlayer` kills the held input and
   `meleeCharge` never accumulates: three runs of the melee-feel pass produced no punch at all before
   that was noticed. Assert `foe.launchT > 0`.
3. Press intercept. Assert: `|c.pos.y − foe.pos.y| < 10` (the gate) · `dist3D ≤ STRIKES.power.reach`
   · `c.burstT > 0` · `|c.vel| > 0` · ki decreased by the cost · the carrier's cd/`evadeCd` armed ·
   `c.invuln` **unchanged** (no i-frames).
4. **The only assertion that proves it works:** a jab on the very next frame must find the foe —
   `game.coneFoe(c, STRIKES.jab.reach, 0.75) === foe`. A naive suite omits this and passes while the
   feature is unusable.
5. Refusals: `launchT <= 0` → no move, **no ki spent** · a foe launched by someone else → refused ·
   out of range → refused · `noPowers` → lane A refused.
6. Not spammable: two presses inside 0.5s → one move.
7. Assert the **invariant**, not a value, for the arrival geometry: wherever the victim is flying,
   the interceptor ends up in front of them and facing them. Sample it over a live fight. (The
   direction-triangle pass burned four test versions writing past `facing`/`aim` before switching to
   an invariant.)
8. `console` clean afterwards. Both game-wide melee bugs in §45 and `hud: 'boxing'` were found by
   *looking at the console after the assertions passed*.

---

## 5. BEAM STRUGGLE IN FLIGHT — the honest answer

**Beam struggle exists, it is a real DBZ struggle, and it cannot happen between two fliers at
meaningfully different altitudes.**

### What it does, confirmed

`projectiles.js:1019-1047`. Per frame, over every pair of opposing sustaining `BeamHose`es:

- `clashPower() = might × powerBuff × (0.35 + 0.65 · ki/maxKi)` (`681`) — character might × buff ×
  how much of the tank is left.
- `_clashT` (`1033`) slides at `((pa − pb)/(pa+pb)) · 0.85` per second toward the weaker beam;
  `clashLen = D·t` / `D·(1−t)` (`1036`) pins each beam's visible end at the struggle point, trimmed
  by **arc length** along its own bent path (`798-809`).
- Both casters burn an extra 8 ki/s (`1038`); sparks, flash, lightning and shake at the point
  (`1040-1043`); the beam **voice strains** when losing (`700`).
- At `t ≥ 0.94` / `t ≤ 0.06`, `_overpower` (`1049-1061`): explosion, shockwave, `worldImpact`, 55
  damage × buff with `kb 80 / y 24`, punch, shake, slowmo.

This is good and should not be rebuilt.

### Is the test 2D or 3D? — Mixed, and the 2D parts are the ones that decide

| line | what | 2D / 3D |
|---|---|---|
| `1026` | `D = a.muzzle.distanceTo(b.muzzle)` | **3D** ✅ |
| `1028` | `abx = (b.muzzle.x − a.muzzle.x) / D`, `abz = …/D` | x/z components divided by the **3D** distance — so `(abx, 0, abz)` has length `cos(elevation)`, not 1 |
| `1029-1030` | `a.dir.x·abx + a.dir.z·abz < 0.4` → skip | **2D dot, `dir.y` discarded entirely** |
| `1035` | `cy = (a.muzzle.y + b.muzzle.y) · 0.5` | midpoint height, **never interpolated by `t`** |
| `1037` | `a.dir.set(abx, 0, abz); b.dir.set(−abx, 0, −abz)` | **force-flattens both beams to horizontal**, and to a non-unit vector |

### Consequence 1 — a clash is impossible past ~51° of elevation

`a.dir` is a unit 3D vector (`691`, `.normalize()`), so its horizontal part is `cos(elev)`. `ab`'s
horizontal part is also `cos(elev)` (`1028`). With both casters perfectly on-aim, the tested dot is
therefore `cos²(elev)`, and the gate is `0.4`:

```
cos²(elev) < 0.4   →   elev > 50.8°   →   no clash, silently
```

Two fliers 40u apart horizontally and 50u apart vertically: no clash. 100u apart and 123u up: no
clash. In an open-sky fight that is routine geometry, and the failure is invisible — the beams simply
pass each other. ⚠ The real threshold is **tighter** than 51°, because `dir` lags `aim3` through the
`steer` lerp (`691`, `steer` 9–15 in the roster), so neither caster is ever perfectly on-aim.

### Consequence 2 — the clashes that *do* form are geometrically wrong

`1037` overwrites both beams' `dir` with a flattened, non-unit horizontal vector. Since `dir` is what
seeds every emitted packet's velocity (`727-729`), the entire stream snaps level **and slows down**
(`|dir| = cos(elev) < 1`, so `pvel = dir · tipSpeed` is short). The visible beams detach from the
casters' hands the instant there is any altitude difference. Meanwhile `cy` (`1035`) puts the sparks
at the average muzzle height regardless of where `t` has slid the struggle point, so at `t = 0.9` the
FX are mid-way while the beam ends are 90% of the way to the loser.

### Consequence 3 — at 58 u/s, three different points claim to be the clash

§42's whole architecture is that the path is **history**, not a ray — each node keeps the direction
it was born with. But the clash point is computed as a straight lerp between the two **current**
muzzles (`1035`) while each beam's end is trimmed by arc length along its own **past** path
(`798-809`). For two casters moving fast those are three distinct locations, and they diverge further
the more either one turns.

⚠ Also: `projectiles.js:695` does `c.vel.x *= 0.5; c.vel.z *= 0.5` **every frame while firing.** A
beam halves your horizontal velocity per frame — so two fliers who open beams at cruise are
effectively stopped dead. Arguably correct for a struggle (you plant and push), but it means the
*approach* to a clash is not a flying manoeuvre, and it is nowhere documented.

### The pressure ladder airborne

`projectiles.js:919-939`, per manual §9:

- `press = min(dps · powerBuff / 24, 1.25)` (`926`), `hold = str/10 + 0.4 guarding + 0.15 metal`
  (`927`). ⚠ **No airborne term.** A flier braces against a wave cannon exactly as well as a man
  standing on concrete, which is the single least believable thing in the ladder.
- the shove (`930`) is `dir.x` / `dir.z` only. ⚠ **A downward-angled beam cannot push anyone down.**
- LAUNCHED (`933-936`) adds a fixed `vel.y += 11` — meaningless at altitude — and sets
  `launchT = 1.1`, which makes the deck servo yield (`entity.js:1254`) and hands the body to gravity.
  **So "beamed out of the sky" does work today.** That part is right.
- ⚠ And `931` sets `f.burstT` — making the beam shove **the only knockback in the game that is not
  crushed by `move()`'s walk clamp** (§1d). The ladder solved the problem melee still has.

### Verdict

Do not rebuild the struggle. Fix four lines: make the facing test a 3D dot on true unit vectors
(`1029-1030`), stop flattening `dir` (`1037` — steer both beams toward each other in 3D instead),
interpolate `cy` by `t` (`1035`), and add an airborne term to `hold` plus a `dir.y` term to the shove
(`927`, `930`). Everything else in `BeamHose` is already correct for an air fight.

---

## 6. TUNING TABLE — POWERWORLD vs the city

Grouped by system. "now" is read from source. Reasons are the argument, not a preference.

### The chase loop (do these first — nothing else matters until they land)

| constant | file:line | now | POWERWORLD | reason |
|---|---|---|---|---|
| launched drag class | `entity.js:1339` | `-6` unless `_slideT`/`_thrownT` | add `launchT > 0` → **`-1.3`** | The one change that creates the loop. Travel from a 133 u/s knockback goes 22.2u → 102.3u. The mechanism already exists for thrown bodies; this widens it to every launch. |
| `burstT` on knockback | `entity.js:694-699` | **never set** | set `burstT = 0.30` wherever `launchT` is armed | Seven other systems already do this (`abilities.js:362/872/1087/1097/1102`, `game.js:922`, `projectiles.js:931`, `boxingring.js:421`, `entity.js:1214/1292`). `move()`'s clamp at `1509` otherwise truncates knockback to walk speed the frame after hitstop. ⚠ Gated on §7 item 1. |
| `momentumMult` denominator | `melee.js:15` | `(spd − 12) / 46`, caps at 58 | **`(spd − 18) / 74`**, caps ≈ 92 | SOL cruises at 79.3 and burns at 111 — both past the current cap, so in an all-air fight *every* punch is ×2.5 and momentum stops being a decision. Floor 12→18 so a hover is not "momentum". |
| `momentumMult` gain | `melee.js:16` | `1 + 1.5k²` (cap ×2.5) | **`1 + 1.2k²`** (cap ×2.2) | With the wider denominator the top of the curve is reachable far more often. Trim the ceiling so a connected cruise haymaker is not most of a health bar. Needs a BALANCE.md-method AI-vs-AI re-audit. |
| `vel.y` clamp | `entity.js:1341` | `−160 / +70` | **`−190 / +110`** | +70 is *below* the burner's own horizontal speed (111): a vertical chase is currently slower than a horizontal one for no stated reason. |

### The vertical gates (the biggest single unblock)

| constant | file:line | now | POWERWORLD | reason |
|---|---|---|---|---|
| `coneFoe` vertical gate | **`game.js:1827`** | **10** | **26** (read from one flag, not edited in place) | 10u = 1.04 fighter heights, foot-to-foot. Two fliers that read as adjacent on the iso camera are routinely 15–25u apart in y. Gates all melee, all grabs, all cones. 26u ≈ 2.7 heights ≈ "the same place" at iso framing. |
| `overlapFoe` vertical | `game.js:1814` | **9** | **20** | Decides whether a thrown car, a growing orb or a mine reaches an airborne fighter. |
| `updateThrownBodies` vertical | `game.js:816` | **9** | **20** | Bowling one flier through another is the ESF payoff, and it currently needs their y within 9u. |
| `resolveBodies` vertical | `game.js:1399` | **7** | **12** | Above 7u two fliers in the same column interpenetrate. |
| **melee reaches** | `martial.js:21-27` | jab 11 · cross 9 · power 7 · grab 8 | **do not change** | ⚠ The inversion IS the design (`martial.js:6-9`) and widening it deletes the spacing decision. And reach is not the problem: `strikeActive` is 0.2s (`melee.js:44`), which at 60 u/s is 12u of travel through the hit test — generous. **Widen the vertical gate, not the reach.** |
| `_throw` loft | `melee.js:215` | `dir.y + 0.22` | **0** in POWERWORLD | A +0.22 up-bias is a gravity-world mortar correction. Thrown along a 3D aim in open sky it just makes every throw miss high. |
| clinch altitude pin | `melee.js:305` | `v.pos.y = f.pos.y` | **keep** | Already correct — mid-air clinch/aim/hurl works today the moment the grab can land. |

### Flight

| constant | file:line | now | POWERWORLD | reason |
|---|---|---|---|---|
| the deck servo | `entity.js:1298-1316` | docks on release | **off via one flag in `deckOf`** (§3) | The four decks are invisible in an empty sky and pull the two fighters vertically apart after every exchange, straight into the `|Δy| > 10` gate. |
| `def.maxBand` default | `entity.js:1247` | tier ≥3 → 3, else **1** | **3 for everyone** in POWERWORLD | The levitator lid (BALANCE.md:126-128) exists because a city has rooftops worth denying. A dimension with no rooftops that lids two thirds of the roster at BUILDING is a dimension most of the roster cannot fight in. ⚠ This overrides an explicit balance ruling — audit it. |
| the afterburner servo exception | `entity.js:1271-1272` | only inside the `flyHeld` climb branch | make it unconditional, like the ceiling clamp at `1380` | Two rules about the same fighter must agree — this is the exact class of bug the §17 orbit fix was. |
| the soft floor | `entity.js:1305` | biases `vel.y` +7 below `groundY + 2.6` | ride the free-flight flag | Otherwise there is an invisible updraft at the bottom of an empty sky. |
| `FLY_RISE` | `entity.js:27` | **46** | keep | Already raised for exactly this feel complaint. |
| `FLY_SINK` | `entity.js:27` | **26** | keep while the servo exists; **40** with it off | The comment states 26 *is* the servo speed cap. With the servo off the number is free, and a dive should beat a climb. |
| `BANDS.ceiling` | `core/util.js:52` / per-plan | 320 (flagship 328) | raise for POWERWORLD; **keep the rule** | The lid + its burner exception is the ORBIT/DEPART rule (§17). Change the number, never the rule. |

### Energy

| constant | file:line | now | POWERWORLD | reason |
|---|---|---|---|---|
| base ki regen | 9/s (CLAUDE.md; recovery tiers) | 9 | **12** | Cruise costs 2.6/s (`entity.js:1493`), the burner 14/s (§15), a beam 16–22/s, an intercept 14. An all-air fight spends ki on *movement* in a way the street fight never did; at 9/s the flying itself is the cost and nobody can afford a kit. |
| intercept cost | new | — | **14 ki**, no own cooldown | ≈1.5s of regen at 9/s: you cannot intercept twice without landing a hit. Overdrive is the intended synergy (BALANCE.md:107-113's argument). |
| cruise ki drain | `entity.js:1493` | 2.6/s | keep | Correct — the throttle should be cheap and the burner expensive. |

### Status / burst

| constant | file:line | now | POWERWORLD | reason |
|---|---|---|---|---|
| STUN threshold | `entity.js:723` | 24% maxHp in a 2.0s window (`721`) | **30% in 1.6s** | At ×2.5 momentum a single cruise haymaker already approaches the threshold, and in the air a stun means a **fall** (`entity.js:756`) — which is a free follow-up. Raise the bar and shorten the window so the stun stays the reward for a real burst rather than for one lucky arrival. |
| `stunT` duration | `entity.js:754` | `1.7 / ccRecover` | keep | Fine. |
| `_stunImmune` | `entity.js:754` region | **4s** | **keep** | Already the anti-chain rule and the reason chain-intercept can't become chain-stun. Do not touch. |
| beam `hold` | `projectiles.js:927` | `str/10 + 0.4 guard + 0.15 metal` | **add `− 0.25` if airborne** | You cannot brace with your feet off the ground, and "blasted out of the sky" is the most iconic beam outcome in the genre. |
| beam pressure shove | `projectiles.js:930` | x/z only | include `dir.y` | A beam angled down currently cannot push anyone down. |

### Evades

| constant | file:line | now | POWERWORLD | reason |
|---|---|---|---|---|
| **every evade is 2D** | `abilities.js:1070-1104` | x/z only (`leap`, `1085-1089`, is the sole exception) | give `blink`/`dash`/`phase` a vertical component from `aim3` | You cannot dodge **down** — the one axis an air fight has that a street fight does not. |
| `blink` range | `abilities.js:1057` | **22** | **30** | 22u is a third of a jab-to-jab reposition at air speeds. |
| `dash` power | `abilities.js:1056` | **105** | **130** | Against −6 drag a 105 impulse is 17.5u of travel; closing speeds in the air are 40–110 u/s, so it does not actually evade an air attack. |
| `teleport` TYPE | `abilities.js:327-341` | x/z only, targets the **ground** `aimPoint` (`game.js:2751`) | needs a 3D target for the intercept branch | The ground aim point cannot express "up there". `rush` (`abilities.js:93`) already does it right. |

### AI

| constant | file:line | now | POWERWORLD | reason |
|---|---|---|---|---|
| `range` | `ai.js:26` (default 34) + per-hero `ai.range` | 18–40 across the roster | **×1.6** | `d` is XZ-only (`ai.js:173`); ranges tuned in a 240u arena with cover read as point-blank in open sky. |
| the deadband | `ai.js:218-219` | `max(2.5, pref · 0.35)` on the **horizontal only** | keep the formula, **add a vertical one** | ⚠ There is no vertical deadband at all. `out.fly` (`ai.js:198`) is a boolean from `dh > 6`, so a bot can only climb or sink — it can never *match* altitude, which is what an air fight is. Without this, bots will oscillate through the `|Δy| > 10` gate forever. **This is the single most important AI change.** |
| `reflex` | `ai.js:56` | `max(0.11, 0.34/level)` | **`max(0.09, 0.30/level)`** | Closing speed is 2–3× the street's; 0.34s at 80 u/s is 27u of travel before the bot reacts at all. Small change, and it stays a human number — the fairness law holds. |
| `flyTend` | `ai.js:28` (default 0.3) + per-hero `ai.fly` | 0.25–0.7 | **floor at 0.75** | `out.fly` gates on it (`ai.js:198`), so a 0.3 bot never takes off. A third of the roster would fight the sky war on the ground. |
| `_opener` gate | `ai.js:190-192` | `flyTend>0.55 && tier≥2 && 42<d<150 && chance(0.18 + 0.3·min(2,level))` | drop the chance to near-always; widen `d` to 30–260 | The cruise-punch opener **is** the POWERWORLD engagement. It should be the default approach, not an 18–48% flourish. |
| `turnRate` | `ai.js:55` | `(2.1 + 0.5·agi)(0.75 + 0.3·level)` | **keep** | This is the fairness law's spine, and a slow neck is exactly what makes an air flank work. |
| melee mixup trigger radius | `game.js:3006`, `3010` | `nearestFoe(f, f.pos, 16)`, turtle reach 13.5 | keep the numbers, **but `nearestFoe` is XZ-only** (`game.js:1794-1808`) | A foe 200u directly overhead reads as distance ≈ 0 and the bot will swing at nothing. Needs a 3D variant, or the vertical gate check moved into the mixup. |
| `arriving-at-speed` threshold | `game.js:3024` | `|vel| > 26` | **> 40** | 26 u/s is below level flight for most tier-3 fliers, so in POWERWORLD every bot melee decision would be "arrived at speed" and the mixup would never roll. |

### Boundaries — `ropeMin`-style thresholds

There are no ropes outside the boxing venue. The equivalents:

| constant | file:line | now | note |
|---|---|---|---|
| `_slam` speed floor | `entity.js:793` | `speed < 30` → no slam, and `launchT > 0` required | ⚠ With launched drag at −1.3 (above) bodies will reach the arena border **far** more often and much faster, so border slam damage (capped at 32, `entity.js:795`) will fire a lot more. Either widen `world.ARENA` for POWERWORLD or accept that the walls are a weapon — which is genre-correct, but it should be a decision. |
| arena border bounce | `entity.js:1396-1398` | `vel *= −0.4` on both axes | This is the closest thing POWERWORLD has to a rope. If the dimension wants a soft boundary, this is the line — and `boxingring.js:410-421` is the worked precedent for "lean below a threshold, come off above it", including the `burstT` lift. |
| `ropeMin` (reference) | `boxingring.js:43` | 42 | The lesson to carry over: the threshold has to sit **above** the traveller's own top speed, or the boundary fires during ordinary movement. In POWERWORLD "ordinary movement" is 111 u/s. |

---

## 7. WHAT I COULD NOT VERIFY WITHOUT RUNNING IT

Ordered by how much of the above depends on it.

1. **⚠ Whether `move()`'s walk-speed clamp actually truncates melee/throw knockback in play.**
   The code path says yes: control runs before physics (`game.js:3082-3084` vs `3101`), `move()` is
   unconditional (`2821`/`2931`), the clamp is unconditional (`entity.js:1509`), and `takeDamage`
   never sets `burstT`. But manual §11 reports a measured 108 → 78 u/s at 24u downrange, which
   requires the clamp *not* to bite. Most likely the §11 harness overrode `controlBot`/
   `controlPlayer` and skipped `move()`. **Every knockback number in §6 depends on which is true.**
2. **The actual momentum values reached in live air combat.** My clamp figures (36.7 / 52.9 / 79.3 /
   111) are arithmetic from `move()`'s multipliers. `powerBuff` (level), `moodMult(f,'speed')`,
   `sprintMult` and wounds all multiply into `s` and I did not model any of them.
3. **Whether a jab connects after a 6.5u intercept arrival.** Depends on `resolveBodies`
   (`game.js:1400`) with `radius = 2.2` (`entity.js:182`) and on per-frame ordering. Arithmetically
   6.5 > 4.4 so it should hold, but the separation runs after control and before projectiles and I
   did not trace whether the push happens before the strike's hit test.
4. **The exact clash elevation threshold.** My ~51° derivation assumes both casters are perfectly
   on-aim. The `steer` lerp (`projectiles.js:691`, steer 9–15) means `dir` lags `aim3`, which makes
   the real threshold **tighter**, not looser — but by how much needs measuring.
5. **Which `BANDS` POWERWORLD gets.** The deck heights I quote (≈90/205/293 vs the flagship's
   ≈95/213/301) depend on whether the dimension supplies its own `plan.bands`.
6. **What `_roofUnder` (`entity.js:1250`) returns in a theatre with no cover and no interiors.** Band
   1's deck falls back to a formula if it is `null`, but I did not read the function body.
7. **Frame cost of anything here.** Not measurable headlessly per the documented `_ema` / hidden-pane
   artefact (a hidden pane renders at 0×0 and `renderer.info.render.calls === 1`). Foreground it.
8. **Whether bots ever reach a beam clash in the air at all.** `_forceBeam` (`game.js:3044`) is gated
   on `!busy` and on `ai.pick` (`ai.js:299`), which I did not read. If they never open opposing beams
   airborne, the §5 fixes are player-facing only.
9. **Whether unlidding `maxBand` for the levitators breaks the BALANCE.md ruling.** It is an explicit
   balance nerf; reversing it per-theatre needs the AI-vs-AI audit BALANCE.md's method describes.
10. **Whether the extended `updateBlinkMark` is readable at altitude on the iso camera.** That is a
    screenshot question, and this project's own repeated lesson is that only the picture shows scale
    (the ring was 4× too big; the venue seating was outside the frame; six green assertions missed
    both).
11. **Whether 26u is the right vertical gate.** I derived it from body height and iso framing, not
    from play. It should be set from what "the same place" looks like on screen at POWERWORLD's
    camera distance — measured off a screenshot, the way the ring's 46u was.

---

## APPENDIX — files and line ranges read

- `src/engine/melee.js` — whole file (339 lines)
- `src/data/martial.js` — whole file (156 lines)
- `src/engine/game.js` — 344-370, 795-860, 915-928, 1256-1276, 1303-1347, 1392-1415, 2194-2230,
  2313-2372, 2735-2830, 2896-2940, 2975-3051, 3080-3136
- `src/engine/entity.js` — 27, 85-115, 182, 212-230, 270, 600-800, 1158, 1180-1400, 1470-1514
- `src/engine/projectiles.js` — 515-1062
- `src/engine/abilities.js` — 16-17, 53-200, 274-390, 862-878, 1019-1106
- `src/engine/ai.js` — 1-260, 299-305
- `src/engine/boxingring.js` — 36-43, 405-425
- `src/data/characters.js` — all `id`/`flightTier`/`speed`/`strength`/`evade`/`afterburner`/
  `type:'teleport'` rows
- `src/core/util.js` — 52-54
- `docs/BALANCE.md` — whole file
- `docs/COMBAT_MANUAL.md` — §9, §10, §11, §42, §45
- `CLAUDE.md` — MOMENTUM MELEE, THE AIMED THROW, THE PRESSURE LADDER + THE STUN, Beam battles & ki
  budget, THE FOUR-DECK LADDER + THE POWER CHARGE, Flight tiers, LOW ORBIT TRAVEL, THE CLINCH,
  THE MELEE FEEL PASS, Slam damage

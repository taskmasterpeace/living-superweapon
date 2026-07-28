# THE GROUND GRAMMAR — "touch it and you are playing Jedi Academy"

**The complete spec for grounded movement and melee in POWERWORLD.**
Written 2026-07-27 against `56e7716`. Companion to `docs/powerworld/aaa-00-ground-truth.md`, which is
the shared factual base — this document does not repeat its readings, it cites them.

**Sources.** Every JKA/Q3 claim cites `docs/reference/openjk.md:N`. Every BFP claim cites
`docs/powerworld/pw-bfp-source.md:N`. Every claim about our engine cites `file:line` read directly.
Where a number is my proposal rather than a reading, it is marked **[PROPOSED]** and carries its
derivation. Where the research says a number was **guessed by the reconstruction author**, it says so
and I propose our own.

⚠ **Line numbers drift.** Anchor on function names.

---

## 0. THE ONE-PARAGRAPH VERSION

The ground half of the thesis is not "add a Jedi moveset." It is **one physics bug and four missing
grammar rules.** The bug: `entity.js:1450` deliberately refuses to exit flight mode when a
PowerWorld fighter lands, so `flying` stays true while you stand on the floor — and eight separate
systems (body collision, melee's vertical rule, ground speed, drag, the spacing rings, the pose,
the move basis, the `grounded` getter) therefore never switch out of air mode. **Nothing else in
the ground grammar can be built on top of that.** Fix it and eight things become correct for free.
The four grammar rules, all of which JKA has and we do not: **melee has no startup frames** (our
hitbox is live on the first update tick — you cannot bait, whiff-punish or read anything);
**guard state is a boolean the player holds, not a property of the move you are in** (JKA's
`BLK_NO` on every transition and bounce is the entire risk model of saber combat); **there is no
jump** (`Space` is the flight ascend key in all four control schemes, `settings.js:11/18/25/40`);
and **`data/martial.js` — eight styles, four clinch positions, a wheel, submissions, a rank-ratio
struggle curve — is authored, complete, and dead**, because the one thing it hangs off (recovery
frames, `martial.js:98-101`) does not exist in the engine. Build startup/active/recovery and the
authored file comes alive with almost no new content.

---

## 1. THE UNIT CONVERSION — and the disagreement it exposes

Every JKA number below is converted. The conversion is **anchored on body height**, because every
quantity in a movement and melee spec is really a body-length quantity: how far you run per second,
how high you jump, how far a fist reaches.

| | value |
|---|---|
| Q3/JKA player standing height | **56 qu** (bbox `-24..32`) |
| our fighter height | **9.6 wu** (`CLAUDE.md`, 1u ≈ 0.19 m) |
| **1 qu** | **0.1714 wu** |
| **1 wu** | **5.83 qu** |

⚠ **THIS DISAGREES WITH `pw-bfp-source.md:564` BY 1.82×, AND IT MATTERS.** That document converts
BFP's 700-unit teleport range using *"Q3's ~56 u/m scale"* — i.e. 56 quake units per **metre**,
which makes a 56-unit-tall player exactly 1 m tall. Under that anchor 700 qu = 66 wu; under the
body anchor it is **120 wu**. Both anchors are defensible (56 qu/m gets Q3's *architecture*
approximately right — a 128 qu door is 2.29 m — precisely because Q3 characters are famously stubby
relative to their world), but they cannot both be used, and item 1 of that document's build order
("keep the range, drop the speed gate") is a 66-vs-120 decision.

**Ruling requested (§9, Q1).** For everything in *this* document I use the body anchor, because a
run speed, a jump height and a punch reach are all body-relative and a spec that converts them at
world-architecture scale produces a fighter who moves like a doll.

---

## 2. FOOTING — what "on the ground" means, precisely

### 2.1 ⚠ THE BUG THAT BLOCKS EVERYTHING ELSE

`entity.js:1450`:

```js
if (this.flying && !this.flyHeld && !this._openSky && (this.descendHeld || this.flightTier <= 1)) this.flying = false;
```

The `!this._openSky` term is deliberate and its reason is written directly above it: without it,
`flightTier <= 1` ejects RAGE and SARGE from flight mode the instant they stop climbing, which in a
dimension where everyone flies is wrong. **The reason is correct and the fix is not.** The
consequence, from `aaa-00-ground-truth.md:117-135`, is that a PowerWorld fighter standing still on
the floor has `flying === true`, and:

| reader | line | what is wrong while you stand on the ground |
|---|---|---|
| `grounded` getter | `entity.js:290` | returns **false** |
| `move()` speed multiplier | `entity.js:1578` | you walk at the **air** multiplier (0.78–1.56×) |
| drag class | `entity.js:1417` | `AIR_DRAG 1.8` instead of `6` — **you skate** |
| `coneFoe` vertical rule | `game.js:2151` | uses 3-D distance, not the ±10u same-deck rule |
| `resolveBodies` | `game.js:1636` | **two fighters standing on the floor do not collide** |
| `updateSpacingRings` | `game.js:481` | `!p.flying` → the spacing overlay **can never appear** |
| the move basis | `game.js:3243` | camera-relative 3-D movement while walking |
| the pose | `entity.js:1824` | prone/banked flight pose while standing |

There is no ground grammar to write until this is one flag with one meaning.

### 2.2 [PROPOSED] THE LANDING RULE

Replace the exclusion with a **precise landing test** rather than removing it. Landing is not
"touching"; it is *arriving under gravity, on purpose, not while being thrown*:

```js
// entity.js, inside the ground-contact block (currently :1441-1457)
const arrived = impact <= 0            // coming down or level, never mid-climb
             && this.launchT <= 0      // a knockback owns the axis (aaa-00 §1.6)
             && !this.flyHeld;         // holding ascend is holding the sky
if (this.flying && (this._openSky ? arrived
                                  : (!this.flyHeld && (this.descendHeld || this.flightTier <= 1))))
  this.flying = false;
```

Why each term:

- **`impact <= 0`** — `impact` is `this.vel.y` sampled before the clamp (`entity.js:1443`). A fighter
  clipping the terrain on the way *up* has `impact > 0` and is not landing. This is what protects
  the original bug report ("flight randomly turns off") without the blanket exclusion.
- **`launchT <= 0`** — a launched body skidding along the floor is still in the air fight. `launchT`
  is `PW_KB.window = 2.6 s` in PowerWorld (`core/util.js:91`), and the drag class is already
  `PW_KB.drag 0.5` for launched bodies regardless (`entity.js:1417`), so the long carry is
  unaffected. When `launchT` expires the next frame's contact block lands them.
- **`!flyHeld`** — takeoff is unchanged (`entity.js:1249`, rising edge of `flyHeld`), so the mode
  switch costs exactly one key in each direction. **That is the design: altitude is the mode switch,
  and it is a key you are already holding.**

**This is the single highest-value change in this document.** It converts all eight rows above from
wrong to right with no new systems.

### 2.3 [PROPOSED] `f.onFoot`, `f.footT`, `f.airT` — the real state

`flying` answers "am I in flight mode." It does not answer "are my feet on something," which is what
every ground rule needs — a fighter with `flying === false` is airborne for the whole descent.
Per `aaa-00-ground-truth.md:730` (trap 1), this needs a **new** flag, not a fifth meaning on
`_openSky`, and it must be named for the idea.

Computed once per frame in `_physics`, immediately after the ground-contact block:

```js
const contact = (this.pos.y <= (this.groundY || 0) + 0.01) || this.onBlock;   // matches entity.js:290
if (contact) { this.footT += dt; this.airT = 0; }
else         { this.airT  += dt; this.footT = 0; }
this.onFoot = contact || this.airT < COYOTE;
```

- `COYOTE = 0.12 s` **[PROPOSED — derived, not picked]**. Two constraints bracket it. **Floor:** it
  must survive the worst supported frame time. The Steam Deck governor targets **40 Hz**
  (`POWERWORLD.md` §14), i.e. 0.025 s, and the sim `dt` clamp is 0.05 s (`CLAUDE.md`, the slow-motion
  law) — so ≥ 2 clamped frames is 0.10 s. **Ceiling:** it must be shorter than the shortest committed
  action, or a player sees a move fire from ground state after the ground is visibly gone. The
  shortest is the jab's authored startup, **0.10 s** (`martial.js:21`), and the shortest hitstop is
  **0.07 s** (`melee.js:250`). 0.12 s is the smallest value ≥ 2 clamped frames; it exceeds the jab
  startup by 0.02 s, which is inside one clamped frame and therefore not observable. **If a later
  ruling shortens jab startup below 0.10 s, coyote must come down with it.**
- ⚠ **`onFoot` is a FACT, not a POLICY.** Whether a move is *offered* is §6.

### 2.4 LANDING RECOVERY — it exists, it is unread by the moveset

`entity.js:1452` already computes `this._landT = Math.min(0.26, -impact * 0.006)`, armed only at
`impact < -30`, decremented at `entity.js:823`, and read only by the pose (`entity.js:1711`). JKA's
`PM_CrashLand` equivalent is `openjk.md:1782` — **your force-jump level is literally a fall-damage
stat**, and a crouch-on-landing variant absorbs impact with `delta /= 3` (`openjk.md:1707`).

**[PROPOSED]** `_landT` gates the **ground moveset only**: while `_landT > 0`, **jump and roll
refuse**; strike, guard and grab do not. Rationale: the dive punch (`melee.js:145`,
`launch = -(36 + _momSpd·0.45)`) is the air grammar's payoff for arriving hard, and gating the strike
would tax the thing we want people to do. Gating the *acrobatics* is what makes a hard landing a
real commitment.

**[PROPOSED]** A crouch held at the moment of contact halves it (`_landT *= 0.5`), which is JKA's
`delta /= 3` idea at our scale and gives crouch a use beyond speed.

### 2.5 WHAT `onFoot` MUST NOT CHANGE

- **Not `grounded`.** `entity.js:290` is read by physics, footsteps and the ragdoll. Leave it. Add
  the new state beside it.
- **Not the ceiling clamp** (`entity.js:1462`) or `maxBand` (`:1270`) — those are `_openSky`'s four
  rules (manual §46) and are correct.
- **Not the light count** and not any new `setTimeout` (`CLAUDE.md` hard rules).

---

## 3. THE GROUND MOVE SET

### 3.1 The comparison table — Q3 vs Raven vs us

Sources: `openjk.md:1532-1598` (the constant block, exact diff), `openjk.md:1599-1647` (the stock core).

| constant | stock Q3 | **JKA MP** | **JKA SP (JO + JA)** | converted (SP) | **our equivalent** |
|---|---|---|---|---|---|
| `g_speed` (base run) | 320 qu/s | **250** | 250 | **42.9 wu/s** | `def.speed \|\| 30` × 1.08 → **27–45.4 wu/s** (`entity.js:184`, `:1573`) |
| `pm_accelerate` | 10 | 10 | **12** | 12 /s | **`9`** — `vel += dir·s·dt·9` (`entity.js:1594`) |
| `pm_airaccelerate` | 1 | 1 | **4** | 4 /s | **`9`** — same line, no air branch |
| `pm_airDecelRate` | — | — | **1.35** | ×1.35 | **absent** |
| `pm_friction` | 6 | 6 | 6 | 6 /s | **`6`** — `exp(-6·dt)` (`entity.js:1417`) |
| `pm_stopspeed` | 100 qu/s | 100 | 100 | **17.1 wu/s** | **absent** |
| `pm_duckScale` | 0.25 | **0.50** | **0.50** | ×0.5 | **no crouch** |
| `pm_frictionModifier` (walk) | — | — | **3.0** | ×3 | **absent** |
| `JUMP_VELOCITY` | 270 | **225** | **225** | **38.6 wu/s** | **no jump** |
| gravity | 800 qu/s² | 800 | 800 | **137 wu/s²** | **60 wu/s²** (`entity.js:1384`) |
| `STEPSIZE` | 18 qu | 18 | 18 | **3.09 wu** | **2.5 wu** stand-on-top catch (`CLAUDE.md`, training-hall stairs) |
| `MIN_WALK_NORMAL` | 0.7 | 0.7 | 0.7 | 45.6° max slope | not enforced (heightfield floor) |
| roll trigger speed | — | 200 qu/s | 200 | **34.3 wu/s** | **no roll** |
| attack move penalty | — | Fast .75 / Med .60 / Strong **.45** | **none in SP** | — | **flat `×0.5`** (`entity.js:1593`) |

**Three findings fall out of that table and they are the good news.**

1. **Our acceleration constant IS `pm_accelerate`, in the same form.** Q3's model is
   `accelspeed = accel · frametime · wishspeed`; ours is `vel += dir · s · dt · 9`
   (`entity.js:1594`). The `9` sits between id's 10 and Raven's 12. Nothing to port.
2. **Our ground drag IS `pm_friction`, to first order, at the identical coefficient.** Q3 drops
   `speed · 6 · dt`; we multiply by `exp(-6·dt)`, whose linearisation is the same drop
   (`openjk.md:1613`, id's block quoted verbatim). Nothing to port.
3. **Our air acceleration is 9 against JKA-SP's 4 and stock Q3's 1.** We already have *more* mid-air
   authority than single-player Jedi Knight. `openjk.md:1571` calls the SP retune *"precisely the BFP
   move — the feel of single-player Jedi Knight movement is substantially two retuned floats plus one
   extra line in `PM_AirMove`."* **DO NOT REGRESS THIS** (§7) — but see 3.2.

### 3.2 ⚠ THE ONE THING THAT MAKES Q3 STOP CRISPLY, AND WE DO NOT HAVE IT

`pm_stopspeed = 100`. Q3's friction is `control = max(speed, pm_stopspeed); drop = control · friction · dt`
(`openjk.md:1613`). Above 100 qu/s that is proportional — the same as our exponential. **Below it,
the drop becomes a constant `100 · 6 = 600 qu/s² = 102.6 wu/s²`, which is more than proportional**,
and that is why a Quake player stops dead instead of asymptoting.

Measured against our numbers: from a median run of 33 wu/s, `exp(-6·dt)` reaches 1 wu/s in
**0.58 s** and never actually reaches zero. With the stopspeed floor at **17.1 wu/s**, the last
17.1 wu/s is shed in **0.167 s** — a crisp stop in a sixth of a second.

**[PROPOSED]** `entity.js:1417`, ground class only (`!glide && !launched && !_slideT && !_thrownT`):

```js
const sp = Math.hypot(this.vel.x, this.vel.z);
const drop = Math.max(sp, STOP_SPEED) * 6 * dt;      // STOP_SPEED = 17.1
const k = sp > 0.001 ? Math.max(0, sp - drop) / sp : 0;
this.vel.x *= k; this.vel.z *= k;
```

⚠ **Scope it to the ground class explicitly.** The air classes (`AIR_DRAG 1.8`, `PW_KB.drag 0.5`)
were tuned by measurement — `entity.js:1395-1412` records that matching the two air axes at 1.8 is
what makes a swoop carry two body lengths — and a stopspeed floor in the air would delete the coast
that the whole flight feel rests on.

### 3.3 WALK, RUN, STRAFE

**What we have.** One speed. `move()` multiplies in a fixed order (`entity.js:1573-1593`): base ×1.08
× `powerBuff` × mood, leg wound, sprint, haymaker wind-up ×0.4, flight, water, glide ×1.4, guard
×0.34, `strikeActive` ×0.5. There is **no walk**, no crouch, and no strafe penalty.

**JKA.** `pm_duckScale 0.50` for crouch; `pm_frictionModifier 3.0` for "careful mode" when holding
use (`openjk.md:1560`); no strafe penalty in either build (strafe-jumping is *preserved* on purpose —
`openjk.md:1631`, Raven kept id's q2-style `PM_Accelerate` and turned the `#if` into a gametype test,
commenting *"allows bunnyhopping and whatnot"*, with only Siege running the branch id disabled).

**[PROPOSED] ground speed multipliers**, folded into the existing chain in `move()`:

| state | multiplier | source |
|---|---|---|
| crouch held | **×0.50** | `pm_duckScale`, `openjk.md:1541` (Raven doubled id's 0.25 — take Raven's) |
| walk modifier held | **×0.55**, friction ×3 | `pm_frictionModifier 3.0`, `openjk.md:1560` |
| `mstate === 'startup'` | **×0.75 / 0.60 / 0.45** per strike (jab/cross/power) | `openjk.md:1580` — MP's per-style penalty, mapped onto our three strikes by commitment |
| `mstate === 'recover'` | **×0.30** | `openjk.md:1580`, Strong spinning ×0.3 |
| guarding | ×0.34 (unchanged) | `entity.js:1592` |

⚠ **This replaces the flat `strikeActive > 0 → ×0.5` at `entity.js:1593`, and that is the point.**
Raven scaled it per stance for the same reason they scaled the swing tolerance: *"Otherwise fast
would have more advantage than it should"* (`openjk.md:928`). A jab that costs you as much movement
as a haymaker is a jab with no identity.

⚠ **`pm_duckScale` is one of exactly two values JKA MP changed from stock** (`openjk.md:1538` — the
diff survived as a block, which is what makes it exact). It is not a throwaway number.

### 3.4 [PROPOSED] THE JUMP — it does not exist, and it has to

**Confirmed absent.** `Space` is `up` in all four control schemes (`core/settings.js:11, 18, 25, 40`);
`controlPlayer` reads it as `p.flyHeld` (`game.js:3317`); the takeoff branch (`entity.js:1249`)
requires `flightTier > 0 || _openSky`. A grounded fighter in the city gets a refusal feed line
(`entity.js:310`). **Nobody in this game has ever jumped.**

The design constraint is that Space is the flight key and must stay the flight key, or "altitude is
the mode switch" stops being one gesture.

**The rule:** `Space` on the ground with `onFoot` is a **jump**; `Space` held past the apex, or
pressed again in the air, is **takeoff**. One key, two meanings, disambiguated by footing — exactly
the shape of `PM_CheckJump` being reachable from `PM_AirMove` in Raven and not in id
(`openjk.md:1642`: *"That one line is what makes force jump, wall runs and wall grabs reachable while
airborne — the whole acrobatic vocabulary hangs off it."*).

**The numbers, derived rather than ported.** JKA's jump is `225 qu/s` under `800 qu/s²` gravity =
apex **31.6 qu = 0.564 body heights**, airtime **0.5625 s**. Our gravity is **60 wu/s²**
(`entity.js:1384`), which is 0.44× JKA's *relative to body height*, so height and airtime cannot both
be matched without touching gravity — and gravity is load-bearing for every knockback arc in the game.

**Match the height in body lengths and accept the longer hang:**

```
JUMP_VEL = sqrt(2 · 60 · (0.564 · 9.6)) = 25.5 wu/s      apex 5.4 wu,  airtime 0.85 s
```

Sanity against what already exists: the `leap` evade is `vel.y += 46` (`abilities.js:1091`), giving
apex **17.6 wu = 1.83 body heights** and **1.53 s** of air — ten heroes carry it (`kind: 'leap'` ×10).
So the base jump at 25.5 sits sensibly *between* stepping onto a boulder and the acrobatic leap, and
it does not make `leap` redundant.

⚠ **Do not "fix" the hang time with a per-jump gravity multiplier on a first pass.** A superhero who
jumps a quarter of their own height reads as broken, and a second gravity constant is a second
physics model to keep in sync with the ragdoll (`ragdoll.js`, `-62`) and every knockback arc.
If it reads as floaty in the picture, the honest lever is a **fast-fall**: `vel.y -= 60·dt·1.8`
while `_jumpT > 0 && vel.y < 0` (apex 0.42 s up, 0.32 s down, 0.74 s total), one flag, one branch.
That is a **screenshot/feel call, not an assertion call** (`aaa-00-ground-truth.md:753`).

**Double jump: no.** `flightTier` already sells the second beat, and every character can fly here.
A double jump in a game where everyone flies is a worse flight.

### 3.5 [PROPOSED] THE ROLL — it is our evade, re-gated

JKA's roll (`openjk.md:1683-1712`) is worth reading closely because of *how* it is built:

- **It is not a button.** Trigger is crouch while `|velocity|² ≥ 40000`, i.e. **200 qu/s = 34.3 wu/s**.
- **`PM_TryRoll` returns an animation number and never touches `velocity[]`** — it only traces for
  room. The movement comes from `BG_CmdForRoll` *rewriting the usercmd*, and the speed is a function
  of the animation's remaining milliseconds: `legsTimer > 800 ? legsTimer/1.5 : legsTimer/5.0`. So a
  roll starts near **114 wu/s** and falls off a cliff.
- ⚠ **A roll has NO invulnerability and no damage reduction.** Verified by grep across four files
  (`openjk.md:1704`). What it buys: a **crouch-height hitbox**, immunity to saber-lock, and no
  pain-flinch. *"The dodge is positional, not a mercy window."*

**Ours already exists and is more generous than JKA's.** `performEvade` (`abilities.js:1067`), six
kinds, all with i-frames: `dash` power 105 / `burstT 0.3` / **iframes 0.22**; `slide` power 125 /
`_slideT 0.55` / iframes 0.2; `phase` iframes **0.45**. Distance, integrating against each kind's own
drag class (`entity.js:1417`):

| kind | impulse | window | drag | **distance** | body lengths |
|---|---|---|---|---|---|
| `dash` | 105 | `burstT 0.3` | −6 | **14.6 wu** | 1.5 |
| `slide` | 125 | `_slideT 0.55` | −1.3 | **49 wu** | 5.1 |
| JKA roll | — | ~1 s anim | — | **≈30 wu** | ≈3 |

So the JKA roll sits **between our dash and our slide**, and neither needs replacing. The three
changes are gating, not tuning:

1. **`performEvade` takes `{x, z}`** (`abilities.js:1067`, `EVADE_DEFAULTS` at `:1059` — six kinds,
   none with a vertical component) and can fire in the air. **[PROPOSED]** gate the four
   ground-flavoured kinds (`dash`, `slide`, `sprint`, `leap`) on `onFoot`; leave `blink` and `phase`
   available airborne, because a teleport and an intangibility slip are not footwork. That is 27 of
   52 fighters keeping an air option and 31 having a ground-only one — read off the roster
   distribution (`dash` 22, `leap` 10, `phase` 6, `blink` 5, `slide` 5, `sprint` 4).
2. ⚠ **`this.fwd`/`this.right` are computed ONCE in the ctor from the isometric `camDir`**
   (`game.js:380-381`) and the double-tap evade direction reads them (`game.js:3310`). **Behind a
   chase camera the roll goes along isometric axes.** It must use the same basis the movement uses
   (`game.js:3243-3288`). This is a straight bug, not a design item.
3. **[PROPOSED] add the JKA trigger as a second entry**: crouch pressed while `|vel_xz| ≥ 34.3 wu/s`
   and `onFoot` fires the fighter's own evade kind in the movement direction. A dodge you reach by
   *already running* is a different decision from one you reach by double-tapping, and it costs one
   `if`.

⚠ **Do not remove our i-frames to match JKA.** `openjk.md:1704` is a finding about JKA, not a
prescription; our i-frame windows (0.2–0.45 s) are already load-bearing for the projectile-juke
behaviour bots use (`controlBot`, `CLAUDE.md` evade section) and for `phase` as an identity.

### 3.6 [PROPOSED] CROUCH

Does not exist. Needed by three other items in this document (the roll trigger, the landing absorb,
the block quadrant's low band) and it is nearly free because the key is free: **`KM.down`** is
`KeyZ`/`KeyC` per scheme (`settings.js:11/18/25/40`) and currently only means "descend," which is
meaningless with `onFoot === true`. Same one-key-two-meanings shape as the jump.

- speed **×0.50** (`pm_duckScale`, `openjk.md:1541`)
- capsule half-height for incoming melee: the `dy > 10` gate in `coneFoe` (`game.js:2151`) is a deck
  rule and should not change; what changes is the **block quadrant** (§4.4) and the landing absorb.
- ⚠ **Do not shrink `radius`** (`entity.js:185`, `2.2` for every fighter with no exceptions).
  `resolveBodies` (`game.js:1636`), `canSee`, the fog raster and the AI all read it; a per-state
  radius is a new class of desync for a cosmetic gain.

### 3.7 THE ACROBATICS — and which ones we should refuse

`openjk.md:1713-1789`. **Wall RUN is Jedi Outcast; wall GRAB, wall JUMP and running UP a wall are
Jedi Academy.** The architecture is two layers: `PM_CheckJump` *starts* a wall move; the
`PM_Adjust*` family *sustains* one and gates purely on which animation is playing.

| move | surface test | numbers | our nearest thing |
|---|---|---|---|
| horizontal wall run | 128 qu sideways trace, `0 ≤ normal.z ≤ 0.4` | **21.9 wu** trace | nothing |
| wall grab | `\|normal.z\| ≤ 0.2` (`fabs`, so overhangs qualify) | — | **`f.hanging`** — the grapnel ledge-hang (`abilities.js`, `CLAUDE.md` movement kits) |
| wall jump | — | **336 up / 200 out qu/s** = **57.6 / 34.3 wu/s**, then **500 ms of no air control** | nothing |
| anti-infinite-climb | — | 250 qu above start = **42.9 wu** | nothing |
| force jump L3 | — | 840 qu/s = **144 wu/s**, apex 7.9 body heights | `leap` = 1.83 body heights |

**[PROPOSED] build the wall jump. Refuse the wall run and the run-up-wall.** Reasons, in order:

- The wall jump's whole value is **converting a wall into a direction change**, which is exactly what
  a 900 u arena with 15 spires (`powerworld.js:138-146`, h 60–210) is short of. It reuses machinery
  that exists: `f.hanging` already pins a fighter to a wall face (`entity.js:1234-1243`), and
  `releaseHang()` is already documented as **the ONE path** out of it (`CLAUDE.md`). A wall jump is
  `releaseHang()` plus an authored impulse.
- ⚠ **The 500 ms of no air control is not optional.** `openjk.md:1770` — it is what stops the wall
  jump becoming a free repositioning tool, and it is the same idea as our `launchT` suspending the
  deck servo. Ours: `burstT` for the impulse plus a new `_wallLock = 0.5` read in the `move()`
  clamp, which already has the exception plumbing.
- ⚠ **The anti-infinite-climb cap is not optional either** (`openjk.md:1772`). Ours: refuse a wall
  jump whose start altitude is more than **42.9 wu** above the altitude of the *first* wall jump in
  the chain, reset on ground contact. Without it, two spires 40 wu apart are an elevator, and we
  have fifteen.
- **The wall run and the run-up-wall are refused** because they need what `openjk.md:1653` calls the
  thing most worth understanding before copying any of it: *"the animation IS the movement state
  machine"* — `PM_GroundSlideOkay` decides whether you slide off a surface **by asking which animation
  is playing**. We have no animation state machine of that kind; `_animate` is a procedural poser
  (`entity.js:1620+`). Building one to get a wall run is the wrong trade, and `openjk.md:1785` notes
  **how long a wall run lasts is not even determinable from the source.**

**[PROPOSED] the per-character escape hatch, taken directly.** `openjk.md:1787`: the one data-driven
gate on JKA's movement side is four `.sab` flags — `allowWallRuns`, `allowWallFlips`, `allowFlips`,
`allowWallGrabs` — read into four locals from `SFL_NO_WALL_RUNS (1<<13)`. *"A text file can forbid a
character's acrobatics."* Ours: `def.acro = { wallJump: false }`, defaulting to allowed, read through
`shellAllows` (§6). One field, no code change per character.

---

## 4. THE MELEE GRAMMAR

⚠ **This section EXTENDS the trifecta. It does not replace it.** The block law lives at the
`takeDamage` choke point (`entity.js:666-683`) deliberately — `CLAUDE.md` records that before
2026-07-23 the punish rules lived only in melee.js, so `melee`-type abilities and `rush` combos were
free against a raised guard, and that was the "spam wins, blocking does nothing" bug. **Every rule
below either lives at that choke point or feeds it a value.** Nothing re-implements block punishment
per ability.

### 4.1 ⚠ WE HAVE NO STARTUP FRAMES. THIS IS THE BIGGEST GAP.

`melee.js:44` sets `f.strikeActive = 0.2 / pace`. `melee.js:232` tests `if (f.strikeActive > 0)` and
immediately calls `coneFoe`. **The hitbox is live on the first update tick after the press.**

`data/martial.js:20-29` authors the frames — and `aaa-00-ground-truth.md:240` confirms the engine
reads only `.reach`, `.step` and `.color`:

| id | reach | **startup** | **active** | **recover** | dmg | step | engine today |
|---|---|---|---|---|---|---|---|
| `jab` | 11 | 0.10 | 0.06 | 0.14 | 4 | 2.0 | active **0.2** from frame 0, `strikeCd 0.3` |
| `cross` | 9 | 0.16 | 0.07 | 0.22 | 8 | 3.0 | same window, `strikeCd 0.5` on beat 3 |
| `power` | 7 | 0.34 | 0.09 | 0.40 | 18 | 4.5 | `_heavyT = 0.12` travel (`melee.js:101`), `strikeCd 0.7` |
| `grab` | 8 | 0.18 | 0.10 | 0.30 | 0 | 2.4 | `grabT = 0.14` (`melee.js:185`) |

So the haymaker has **0.12 s of startup against an authored 0.34**, and jab/cross have **zero against
0.10/0.16**. `martial.js:39-41` states the intent in capitals: *"POWER'S 0.40s RECOVERY IS THE ENTIRE
RISK BUDGET. Bait it, walk it, punish it."* **There is no recovery to punish.**

⚠ **AND THIS IS WHY `data/martial.js` IS DEAD.** `martial.js:98-101` — the vulnerability rule —
says: *"grabbing somebody during their RECOVERY frames gets you their BACK."* `POSITIONS`
(`martial.js:102`) has four clinch positions and their option wheels; `SUBMISSIONS` (`:145`) has the
capture path that feeds the base's containment tiers. **All of it hangs off recovery frames, and
recovery frames do not exist, so all of it is unreachable by construction.** That is the same
disease `CLAUDE.md` names in `data/education.js` ("prose is not a field") in a different form: a
table whose predicate the engine cannot evaluate.

**[PROPOSED] the three-phase state machine.** In `melee.js`, replacing `strikeActive` as the sole
timer (keeping the field, clamped at zero — `melee.js:237`, a negative timer is truthy and it once
deleted the entire bot melee mixup):

```js
f.mstate = 'startup' | 'active' | 'recover' | null
f.mT     = seconds remaining in the current phase
f.mId    = 'jab' | 'cross' | 'power' | 'grab'
```

- Phase durations come from `STRIKES[f.mId]`, **divided by `def.meleePace`** — VOLT 1.5, the ORIGIN
  quickhands gift 1.35 (`melee.js:42`). ⚠ **The punish floors do not scale**, per the existing law at
  `melee.js:38-41`: a blocked speedster is exactly as punishable as anyone, or pace beats the
  trifecta.
- `strikeActive = (mstate === 'active') ? mT : 0` — a derived compatibility shim, so the twelve other
  readers of that field (`aaa-00-ground-truth.md:735`) keep working unchanged during the transition.
- **Startup is cancellable only by what already cancels a wind-up:** `canAct` going false
  (`melee.js:70` — *"a strike beats a wind-up"*). Not by input.
- **Recovery is the punish window** and it is what `martial.js:98` needs. `f.mstate === 'recover'`
  is the back-grab condition, replacing the current geometric-only test at `melee.js:281`
  (`dot(toHolder, victim.aim) < -0.2`). ⚠ **Keep the geometric test as an OR, not a replacement** —
  a grab from genuinely behind is still a back grab even against a neutral opponent.

⚠ **Do NOT adopt JKA's commitment model wholesale.** `openjk.md:2243`: *"`weaponTime = torsoTimer` —
you cannot act until the animation ends, full stop. There is no cancel window and recovery frames do
not exist as a separate concept."* That is simpler and it cannot desynchronise from the pose — and it
is wrong for us. We are a 52-character fighting game with a documented cancel table
(`STRIKES[].cancels`, `martial.js:22/24/26/28`, currently dead) and a combo window
(`comboWin`, `melee.js:268`). The cancel system **is** our answer to "what makes a combo a combo";
JKA's answer is §4.5. Take the phases; keep the cancels.

### 4.2 [PROPOSED] SWING DIRECTION IS DERIVED FROM MOVEMENT INPUT

`openjk.md:1042-1130`. JKA's move table is **118 rows in JO, 162 in JA**, over **eight quadrants**
(`Q_BR, Q_R, Q_TR, Q_T, Q_TL, Q_L, Q_BL, Q_B`) with two 8×8 tables: `transitionMove[8][8]` picks the
joining animation and `saberMoveTransitionAngle[8][8]` gives the angle between two moves
(`bg_saber.c:722`). Each row declares `startQuad` and `endQuad`.

We cannot have 162 animations. **We do not need them** — the quadrant is not an animation index, it
is a *direction the blow travels*, and everything useful JKA does with it is arithmetic on that
direction.

```js
// martial.js — the eight compass points, in the FIGHTER's own frame (aim = +Z, right = +X)
export const QUADS = ['T','TR','R','BR','B','BL','L','TL'];        // 0..7, clockwise from up
export const quadAngle = (a, b) => Math.abs(((b - a) * 45 + 540) % 360 - 180);  // 0..180, the JKA table
```

**The entry quadrant is the movement stick at the moment the strike commits** — read from
`f.moveDir` (set in `controlPlayer` at `game.js:3300`, and by `controlBot`, so bots get it for free),
expressed relative to `f.aim`:

| movement input when the strike fires | entry quadrant | what it is |
|---|---|---|
| none | **T** (straight down the middle) | the neutral strike we ship today |
| forward | **T**, `step ×1.25` | a committed lunge |
| back | **B**, `step ×0.4`, `reach ×1.1` | a retreating jab — a real boxing option, and the answer to pressure |
| left / right | **L / R** | a hook; wider arc, shorter reach |
| diagonals | **TL/TR/BL/BR** | the in-betweens |

**[PROPOSED] what the quadrant actually changes** — three numbers, all already in the pipeline:

1. **Arc offset.** `coneFoe(caster, range, arc)` (`game.js:2135`) tests `dot` against `cos(arc)`
   about `caster.aim`. A hook should test about an axis rotated ±45°. This needs one new optional
   argument — `coneFoe(caster, range, arc, yawOffset = 0)` — rotating the reference axis before the
   dot. ⚠ It must stay **one function**: `coneFoe` is the melee hit test for the trifecta *and* for
   the `melee` ability type (`abilities.js:59`) *and* for the clinch (`melee.js:278`). A second cone
   test is a second set of rules.
2. **Reach and step skew**, from the table above: a retreating strike trades step for reach, a lunge
   the reverse. This preserves the core inversion (`martial.js:6-9`: jab furthest at 11, power least
   at 7) because it is a *multiplier on the authored reach*, never a replacement.
3. **The exit quadrant**, for §4.5. A straight is `T→B`; a hook is `L→R` or `R→L`.

⚠ **The exit quadrant must be authored per strike, not computed.** JKA authors both ends per row
(`openjk.md:1053`). Computing "exit = opposite of entry" would make every chain a perfect 180° and
delete the rule in §4.5 before it exists.

### 4.3 ⚠ [PROPOSED] BLOCK STATE IS A PROPERTY OF THE MOVE — the best idea in the saber system

`openjk.md:1120`: *"**Every transition and every bounce is `BLK_NO`** — moving between guards is
exactly when you cannot block. That is the whole risk model of saber combat in one column."*

The three states (`openjk.md:948`, `q_shared.h:326`):

```c
BLK_NO      // no block at all
BLK_TIGHT   // only around the saber itself, ~12x12x12
BLK_WIDE    // a rough 180-degree arc around the player
```

Idle is `BLK_WIDE`; attacks are `BLK_TIGHT`; **every transition and bounce is `BLK_NO`.**

Ours today: `f.guarding` is a boolean the player holds (`melee.js:169-180`), and the guard branch at
`entity.js:666-683` reads it directly. `melee.js:174-176` records the one rule that must survive:
**hitstop must never drop a held guard**, because every blocked hit applies hitstop to the blocker
and gating on `canAct` made a fast combo strip the block after the first hit.

**[PROPOSED]** add one column to `STRIKES` and one function:

```js
// martial.js
jab:   { …, blk: { startup: 'tight', active: 'tight', recover: 'no' } },
cross: { …, blk: { startup: 'tight', active: 'no',    recover: 'no' } },
power: { …, blk: { startup: 'no',    active: 'no',    recover: 'no' } },
grab:  { …, blk: { startup: 'no',    active: 'no',    recover: 'no' } },

// blockStateOf(f) — the ONE reader, called from entity.takeDamage's guard branch
export function blockStateOf(f) {
  if (f.staggerT > 0 || f.grabbedBy || f.grabState) return 'no';
  if (f.mstate && f.mId) return STRIKES[f.mId].blk[f.mstate];
  return f.guarding ? 'wide' : 'none';        // 'none' = not guarding at all (unchanged today)
}
```

And at `entity.js:666`, the guard branch's entry condition becomes `blockStateOf(this) !== 'no' &&
blockStateOf(this) !== 'none'`, with the **arc** coming from the state (§4.4) and the damage
multipliers and meter drain (`entity.js:671-672`) unchanged for `wide`, and **tightened for
`tight`**: half the arc, and the meter drains at 1.4× because you are blocking with a committed
weapon.

**Why this is the biggest single upgrade to the trifecta.** Today, committing to a haymaker does not
open you up — it merely makes guard *unavailable* because you pressed something else
(`melee.js:177`). Those are different feelings. `BLK_NO` on power's startup means **the wind-up is a
real 0.34 s of exposure that a jab beats**, which is the interaction `martial.js:39` says is the
entire risk budget and which currently has nothing enforcing it.

⚠ **`opts.hitstop ?? 0.04`, never `||`** (`entity.js:701`). Any new path through the guard branch
that passes a hitstop must pass it explicitly; a meaningful `0` re-armed every frame was the
infinite-stunlock bug.

### 4.4 [PROPOSED] DEFENCE BUYS ARC, NOT PROBABILITY — the cheapest melee upgrade

`openjk.md:2247` calls this out by name: *"That is the single cheapest melee upgrade in this
document."*

MP's `blockFactor` (`w_saber.c:9416`, `openjk.md:990`) is a **dot-product threshold**, not a
percentage, and Raven's own comment on the percentage system they replaced is
*"(as you can see, it was STUPID.. for the most part)"*:

| defence level | raw threshold | vs a **saber** (−0.25) | vs a **projectile** |
|---|---|---|---|
| 3 | 0.30 | dot > 0.05 → **±87.1°** | ±72.5° |
| 2 | 0.60 | dot > 0.35 → **±69.5°** | ±53.1° |
| 1 | 0.90 | dot > 0.65 → **±49.5°** | ±25.8° |
| 0 | — | **cannot auto-block at all** | — |

**Ours is `melee.js:166`:** `dot > -0.15`, a hard-coded constant → a **±98.6°** arc. **We block wider
than max-level Jedi defence, for everyone, always.**

**[PROPOSED]** `_front(foe, atk)` takes its threshold from the sheet instead of a literal:

```js
export function guardArcOf(f) {
  if (f.def.guardType === 'barrier') return -1;              // 360°, unchanged (entity.js:668)
  const st = blockStateOf(f);
  const base = st === 'tight' ? 0.35 : -0.15;                // tight = a committed weapon, JKA level 2
  const res  = (f.sheet && f.sheet.guardArc) || 0;           // AWARENESS / talent / guardStrong
  return base - res;                                          // lower threshold = wider arc
}
```

The ladder is **already derived** — `resistOf(def, sheet)` and `deriveAttrs` (`data/ranks.js`) run
the same pattern, and `CLAUDE.md` records the trap: **`resistOf(def, sheet)` takes two arguments and
both matter**; called one-armed it returns a shared default and every hero reports the same number.
`guardArcOf` must read the sheet the way the engine does.

⚠ **`guardType === 'deflect'` (6 heroes) and `'barrier'` (4) are untouched.** Barrier is already 360°
by explicit branch (`entity.js:668`); deflect's projectile-return is a different mechanism
(`Projectile._defl`). This changes only the **arc of a block**, which is one number in one place.

### 4.5 [PROPOSED] A CHAIN MUST CONSERVE MOMENTUM

`openjk.md:1085` — `PM_SaberKataDone` (`bg_saber.c:747`), quoted in full there. For Strong stance:

```
chainAngle < 135 || chainAngle > 215  →  refuse the chain outright
chainAngle == 180                     →  a perfect reversal, allowed FEWER repeats (2)
otherwise                             →  a partial continuation, allowed MORE (3)
```

`openjk.md:2216`: *"You are not chaining moves, you are conserving angular momentum — and a perfect
reversal is allowed fewer repeats than a partial one, because it is the strongest option."*

Fast/Medium get a simpler limiter — `chainTolerance` **5 for Fast, 3 otherwise**, Medium additionally
`> PM_irand_timesync(2,5)` (`openjk.md:1104`). ⚠ **JO has no fast-stance limiter at all** — fast
chains indefinitely; the tolerance block is a JA addition.

**Ours today has no chain concept beyond `strikeCd`**: `f.strikeIdx = (f.strikeIdx + 1) % 3`
(`melee.js:43`), a fixed three-beat jab-jab-cross with a 0.42 s window (`melee.js:268`).

**[PROPOSED]**

```js
// martial.js
export const CHAIN = {
  jab:   { tol: 5, needReverse: false },      // Fast
  cross: { tol: 3, needReverse: false },      // Medium
  power: { tol: 2, needReverse: true  },      // Strong — must roughly reverse
};
// the rule, evaluated at strike() when comboWin > 0
export function chainOk(prevExitQuad, nextEntryQuad, id, count) {
  const c = CHAIN[id];
  if (count >= c.tol) return false;
  if (!c.needReverse) return true;
  const a = quadAngle(prevExitQuad, nextEntryQuad);
  if (a < 135) return false;                              // does not continue the momentum
  return a === 180 ? count < 2 : count < 3;               // JKA's own asymmetry, kept
}
```

⚠ **`> 215` in JKA's condition is dead on our table.** `quadAngle` is folded to 0–180 (an 8-point
compass has no signed angle beyond 180 in JKA's own `saberMoveTransitionAngle` either — the table at
`bg_saber.c:722` runs `0, 45, 90, 135, 180, 215, 270, 45`, which is **not symmetric and is the
unfolded form**). Folding is the right call for us and it must be *stated* rather than silently
done, because it changes which chains are legal at 215/270.

⚠ **The result is that the fixed jab-jab-cross string becomes emergent, and that is a real
behaviour change**, not a refactor. Gate: the three-beat string must remain *reachable* (a player
who never touches the stick throws T→B, T→B, T→B, angle 180 each time, `needReverse` false for
jab/cross, tol 5/3 → legal), or the change deletes the combo everyone already knows.

### 4.6 [PROPOSED] THE SWING IS MEASURED — and this is where the thesis unifies

`openjk.md:908` — `G_SaberAttackPower` (`w_saber.c:137`), MP-only, *"the single most interesting
MP-only mechanic."* Base power is `style*2 + 1` (Fast 3, Medium 5, Strong 7), then **+1 for every
`toleranceAmt` units the blade base physically travelled since the last frame**:

| stance | tolerance | converted (per 50 ms server frame) |
|---|---|---|
| Strong | 8 qu | **27.4 wu/s** of hand speed per +1 |
| Medium | 16 qu | **54.9 wu/s** |
| Fast | 24 qu | **82.3 wu/s** |

Clamped 1–16. Raven's comment says exactly why the tolerance is per-stance: *"Otherwise fast would
have more advantage than it should since the animations are all much faster."*

`openjk.md:2206`: *"WWA's `momentumMult` reads `|vel|` of the **body**, stamped before the lunge.
Those are different quantities: a fighter standing still and throwing a fast hook has body velocity
~0 and enormous hand velocity."*

**THE UNIFICATION.** `momentumMult` (`melee.js:14-17`) is
`1 + 1.5·k²`, `k = clamp((|vel| − 12)/46)` → **×1.0 standing, ×2.5 at 58 wu/s**. It is stamped from
3-D `|vel|` *before* the lunge (`melee.js:48`) so the engine's own hop cannot fake it. **That is the
right model for the air** — it is the swoop, it is what makes arriving fast the whole skill, and
`pw-esf-research` §13.1 says *"how you get close is your choice… the approach is the skill."*

**It is the wrong model for the ground**, where you are standing still and the punch is the thing
moving. So:

> **BFP momentum in the air; JKA measured swing on the ground. Same fist, two multipliers,
> selected by `onFoot`.** That is the thesis stated as a line of code.

```js
// melee.js
export function swingMult(f) {
  return f.onFoot ? handMult(f) : momentumMult(f);
}
```

**The hand speed is already available and costs nothing.** `_animate` drives the arm meshes every
frame (`entity.js:1620+`), and the fist is `arm.children[2]` under the documented rig contract
(`CLAUDE.md`, ragdoll section: *"arms index `arm.children[0..2]` = upper/fore/fist"*). Store one
`Vector3` per fighter, take the world delta, divide by `dt`.

**[PROPOSED, PROVISIONAL — the number is a gate, not a claim]**

```js
const HAND_REF = 24;                                  // wu/s — a standing jab, estimated
function handMult(f) {
  const k = Math.min(1, Math.max(0, (f._handSpd - HAND_REF) / 48));
  return 1 + 1.2 * k * k;                             // ×1.0 → ×2.2 at 72 wu/s
}
```

⚠ **`HAND_REF = 24` and the 48 span are ESTIMATES and must not ship un-measured.** They come from
arithmetic, not observation: the arm is ~3 wu (`martial.js:11`) and the punch pose ramps over
roughly 0.2 s, giving ~15–30 wu/s plus body velocity. **The gate (§8, loop 4) is: instrument
`_animate`, log p50/p95 fist speed for jab / cross / haymaker across all 52 fighters, and set
`HAND_REF = p50` and the span = `p95 − p50`.** That is the distribution law
(`CLAUDE.md`; `powerworld.js:74-85` is its fourth application), and porting JKA's 8/16/24 directly
would be its fifth violation — those tolerances were fitted to a 32 qu blade whose tip travels far
further than a fist.

⚠ **Take the per-strike tolerance with it**, or the fastest attack wins twice (`openjk.md:2214`).
Strong's tolerance is the *smallest* — a haymaker should reach its multiplier on less hand travel
than a jab, not more.

⚠ **`momentumMult` is uncapped by world** (`aaa-00-ground-truth.md:288`) — a PowerWorld swoop hits
×2.5 routinely where a city fighter rarely does. That stays true and is correct; **`swingMult` must
not be applied to blocked hits**, exactly as `kbs = blocked ? 1 : mom` does today
(`melee.js:247`, `:263`): momentum raises the reward, never what a raised guard has to eat.

### 4.7 WHAT NOT TO TAKE FROM THE SABER

`openjk.md:2252`, verbatim in substance:

- **Not the damage model.** `2.5 × powerLevel × traceLength × (1 − tr.fraction)` summed over a grid
  of traces is beautiful and then **clamped to [25, 100] against anything that is not a saber user**
  (`openjk.md:1160`), which throws all of it away for most enemies.
- **Not the knockback helpers.** They openly contradict each other: `G_Throw` uses `× 1.5` on the
  vertical while `G_ApplyKnockback` uses `/ (mass × 1.5) + 20`, in the same file family
  (`openjk.md:1216`). ⚠ **MP sabers deliver ZERO knockback by default** —
  `g_saberDmgVelocityScale` defaults `"0"` — and JO's saber has it hard-coded off with
  `dFlags |= DAMAGE_NO_KNOCKBACK` (`openjk.md:1206`).
- **Not the hit detection.** A swept quad sampled as a grid of short traces, one per 8 qu of blade
  per ≤33° angular sub-step (`openjk.md:816`), is the right answer for a 32 qu blade and a
  category error for a fist. Our `coneFoe` (`game.js:2135`) with a floor-property reach
  (`martial.js:11-15`: *"REACH IS A FLOOR PROPERTY, NOT A LIMB PROPERTY"*) is the correct model for
  a top-down/chase brawler and is already the thing that makes an 11 wu jab legible.
- **Our single `takeDamage` choke point is the better structure; don't trade it for this**
  (`openjk.md:2258`).

### 4.8 THE VERTICAL PROBLEM — ground melee gets it right for free

`game.js:2151`:

```js
if (caster.flying && f.flying) { if (Math.hypot(d, dy) > range) continue; }
else { if (d > range) continue; if (dy > 10) continue; }
```

The ±10 wu branch is the **correct ground rule** — melee is a same-deck weapon and a jab must not
reach a foe a storey overhead. Today in PowerWorld it almost never runs, because both parties are
`flying` while standing on the floor (§2.1). **Fixing the landing rule restores it automatically.**

⚠ **Two defects in that function remain and are ground-relevant** (`aaa-00-ground-truth.md:337`):
the arc test is 2-D and uses `caster.aim`, which has no Y, so a foe **directly overhead** gives
`d ≈ 0` and `dx/(d||1)` makes the arc test a coin toss. On the ground with the ±10 gate this is
bounded — a foe within 10 wu vertically and ~0 wu horizontally is standing on your head — but the
instability is real and a `d < 0.5 → treat as in-arc` guard costs one line.

---

## 5. ALL 52 FIGHTERS — the hard constraint

> *"It cannot be a saber system — it must be the fighter's OWN kit expressed in a JKA-shaped grammar.
> A gunner, an archer, a beam caster and a bruiser must each have a coherent ground game. Specify how,
> generically, with no per-character branches."*

### 5.1 The shape of the answer

**Three of the four ground roles are already universal, and only one needs deriving.**

| role | what it is | who has it today |
|---|---|---|
| **1. THE PRESSURE TOOL** | what you throw at jab range without committing | **all 52** — the trifecta jab (`melee.js:32`) |
| **2. THE COMMITTED BLOW** | what wins an exchange and crushes a guard | **all 52** — the haymaker (`melee.js:87`) |
| **4. THE DEFENSIVE ANSWER** | guard, parry, roll | **all 52** — `melee.js:169`, `game.js:2686` (parry ≤ 0.22 s), `performEvade` |
| **3. THE SPACING TOOL** | what keeps them *out* of the pocket | **kit-dependent — this is the only gap** |

So the generic mechanism has one job: **map each fighter's existing slots onto a ground-spacing
expression.** Nothing new is authored per character.

### 5.2 [PROPOSED] `GROUND_ROLE` — a table keyed on ability TYPE

The precedent exists twice in the repo and both are keyed on data, never on id:
`deriveAI(slots, flightTier)` (`data/creator.js:236`) classifies a kit into an AI doctrine by
counting power categories; `_swingKind(f)` (`melee.js:20`) derives blade-vs-fist-vs-blunt by scanning
`def.abilities` for `dmgClass: 'slash'` and caches on the fighter. Follow both.

```js
// data/martial.js — keyed on the ability TYPE string, which is what abilities.js dispatches on
export const GROUND_ROLE = {
  rifle: 'poke', bow: 'poke', quiver: 'poke', projectile: 'poke', volley: 'poke',
  beam: 'pin', nova: 'pin',
  cone: 'zone', dome: 'zone', gravity: 'zone', weather: 'zone',
  melee: 'special', rush: 'special', tentacle: 'special', elastic: 'special',
  charge: 'hold', growingorb: 'hold', facebomb: 'hold',
  teleport: 'slip', phase: 'slip', dash: 'slip', portal: 'slip',
  summon: 'screen', construct: 'screen', duplicate: 'screen',
};
export function groundKitOf(def) {              // cached on the fighter as f._gk
  const roles = Object.values(def.abilities || {})
    .map(a => a && GROUND_ROLE[a.type]).filter(Boolean);
  return { poke: roles.includes('poke'), pin: roles.includes('pin'), /* … */,
           closer: roles.length === 0 };
}
```

**What each role *does* on the ground** — and every one of these is a modifier on machinery that
already exists, not a new subsystem:

| role | the ground expression | mechanism it reuses |
|---|---|---|
| **poke** (gunner, archer) | fires from a **braced stance**: while `onFoot && guarding`, the slot fires at 0.6× rate with `spreadMult × 0.55` and **the guard stays up**. A gunner's ground game is *holding an angle*. | `runSlot` (`abilities.js:1023`) is already the one door; `feedSlot` blanks `pressed`/`held` while `busy` (`game.js:45-49`) — braced fire is a **narrowed** `busy` for `poke`-role slots only |
| **pin** (beam caster) | the beam's pressure ladder already exists (`projectiles.js`, manual §9: LAUNCHED / PUSHED / HOLD / WALK-THROUGH). On foot the caster is **rooted** — `mstate`-class movement penalty ×0.30 — so a ground beam is a commitment with a punish window | the existing pressure ladder + §3.3's move penalty |
| **zone** (cone, gas, weather) | a cone laid on the ground **denies the pocket**, i.e. denies power reach (7 wu). No change needed; it becomes correct the moment the pocket exists | the spacing rings (`game.js:455`) make it legible |
| **special** (`melee`/`rush` kits) | **already the ground game.** These slots get the §4.1 phases and the §4.2 quadrants for free, because `abilities.melee` (`:56`) and `abilities.rush` (`:86`) both route through `coneFoe` | one shared hit test |
| **hold** (chargers) | charging on foot is JKA's Strong stance: **rooted, guard-crushing, long recovery**. `meleeCharge > 0 → ×0.4` speed already exists (`entity.js:1576`); extend it to ability charges | existing `charge` type; the guard-crush path (`melee.js:119-126`) |
| **slip** (teleport/phase/portal) | the acrobatic answer — these stay available airborne (§3.5) and are what an evasive kit uses instead of a roll | `performEvade` + the existing types |
| **screen** (summoner) | constructs and drones **hold the pocket for you**, which is a spacing tool by other means | existing `summon`/`construct` |
| **closer** (no offensive slot ≤ 20 wu) | gets the **wrestling `grabBonus`** — their ground game *is* getting inside | `styleOf(def).grabBonus`, `melee.js:278`, currently always 0 |

⚠ **`grabBonus` is the ONLY field of the eight STYLES that anything reads, and it is always
`undefined → 0`**, because `styleOf` (`martial.js:90`) falls through to `STYLES.boxing` for every
fighter (`aaa-00-ground-truth.md:531`: `grep -c "\bart:" src/data/characters.js` → **0**).

### 5.3 [PROPOSED] `artOf(def)` — make the eight styles live with zero data edits

`aaa-00-ground-truth.md:541` calls `data/martial.js` *"the single largest pre-built asset available
to the Jedi-Academy half of the thesis: a complete, authored ground-combat vocabulary, sitting one
`def.art` field and one dispatch away from being live."*

```js
export function artOf(def) {
  if (def.art && STYLES[def.art]) return def.art;   // ⚠ AUTHORED ALWAYS WINS — same law as def.attrs
  return derive(def);
}
```

⚠ **The derivation must produce a distribution, not a preference.** `CLAUDE.md` records this law
three times over (the university standing, the rank ladder's top end, the base site survey), and
`powerworld.js:74-85` is its fourth application: *"a ladder's rungs come from the distribution. A
rung nobody can reach is a rung that does not exist."*

The inputs are real and I have counted them across `src/data/characters.js`:

| field | distribution |
|---|---|
| `guardType` | `barrier` **4** · `deflect` **6** · implicit block **42** |
| `meleeTiers` | `2` **9** · `3` **5** · unset (default 3) **38** |
| `evade.kind` | `dash` **22** · `leap` **10** · `phase` **6** · `blink` **5** · `slide` **5** · `sprint` **4** |
| `strength` | 1–10, and `rank` 14–120 across the roster |

**[PROPOSED] the ordered derivation** — each rung names its own justification:

| # | test | style | why |
|---|---|---|---|
| 1 | `def.tentacles` or a `tentacle`/`telekinesis` slot | **powergrap** | grappling *by reach* is the identity (KRAKEN) |
| 2 | `strength ≥ 9 && meleeTiers === 2` | **powergrap** | two-tier melee on a heavyweight is "shoves and slams" verbatim (`martial.js:84`) |
| 3 | `def.grabHeal` | **judo** | throws *are* the identity (2 heroes carry it) |
| 4 | a `rifle` slot with a `weapon` class **and** `strength ≤ 7` | **cqc** | `martial.js:74` — *"fast finishes and disarms, no ground game"* (SARGE, the FED, the COP) |
| 5 | `evade.kind === 'phase' \|\| 'blink'` | **acrobatic** | `martial.js:81` — *"the best whiff punish in the game"* (11 heroes) |
| 6 | a `dmgClass: 'slash'` kit and rule 4 did not fire | **cqc** | blades = military CQC; reuses `_swingKind`'s existing scan (`melee.js:24`) |
| 7 | `meleeTiers === 3 && strength ≤ 5` | **boxing** | `martial.js:49` — *"no grappling at all, the best spacing and the best counter"* |
| 8 | `strength ≥ 7` | **muaythai** | `martial.js:55` — *"the punch IS the entry"* |
| 9 | default | **bjj** | `martial.js:69` — weak standing, dominant from the bottom: the honest home for a caster who has no business standing and trading |

⚠ **I cannot verify the resulting distribution without running it, and I am not going to claim it.**
**The gate (§8, loop 5) is: print the 52-row assignment. If any style has 0 heroes, or any style has
more than 40% of the roster (21), the ladder is wrong and the rungs move.** 40% is one third above an
even eighth-share doubled — chosen so a genuinely dominant archetype is allowed but a catch-all is
not. This is exactly how the base site survey took four passes (`CLAUDE.md`, THE BASE) and it will
take more than one here.

⚠ **`STYLES[].resist` and `.punish` become live the moment `artOf` does**, and they feed
`clinchWindow()` (`martial.js:123`) — which is itself dead and **disagrees with the shipped formula**
at `melee.js:290`. See §9, Q3.

### 5.4 ⚠ WHAT THIS DELIBERATELY DOES NOT DO

- **No per-character ground moveset.** Every fighter has the same four roles and the same four
  strikes; what differs is the *spacing tool*, which is their own kit, and the *style modifiers*,
  which are five numbers.
- **No new abilities.** Every row of §5.2 reuses an existing `TYPES` entry (`abilities.js:56-880`).
- **No `if (def.id === …)` anywhere.** Both derivations scan `def.abilities` for a `type` string.
- **No new content gate.** A fighter added tomorrow, or an ORIGIN custom built in the creator, gets a
  ground game the moment it has abilities — which is the same property `deriveAI` already gives
  customs (`CLAUDE.md`, ORIGIN section).

---

## 6. THE SHELL MAY CHANGE THE MOVESET — one predicate, not four call sites

`openjk.md:2182` (§7.5). JKA gates **four** acrobatic saber moves on
`cg.renderingThirdPerson && !cg.zoomMode` (`bg_panimate.cpp:2366, :2447, :3651, :3757`) — flip-over
attacks, back spins, the backflip attack. *"Switch to first person and they leave your moveset,
because a somersault you cannot see is not worth having."*

The rule has two halves and `openjk.md:2192` insists they not be confused:

- **Presentation MAY decide what is offered.**
- **Presentation MAY NEVER decide where a hit lands.** ⚠ We currently violate the second half in
  PowerWorld — the aim parallax bug, `game.js:3172-3175`, `openjk.md:2045` — **while not yet using
  the first half at all.**

⚠ *"And keep the split visible in the code, or it rots: JKA's version is four copies of the same
compound conditional inlined at four call sites, which is how a rule like this drifts. One
predicate."* (`openjk.md:2200`.)

**[PROPOSED]**

```js
// core/util.js — beside BANDS/bandOf, which is already the shared runtime face
export function shellAllows(f, tag) {
  switch (tag) {
    case 'jump':      return f.onFoot && f._landT <= 0;
    case 'roll':      return f.onFoot && f._landT <= 0;
    case 'crouch':    return f.onFoot;
    case 'wallJump':  return !!f._openSky && (f.def.acro ? f.def.acro.wallJump !== false : true);
    case 'quadrant':  return !!f._chaseKb;      // swing direction needs a camera that shows it
    case 'diveStrike':return !f.onFoot;
    default:          return true;
  }
}
```

**What is ground-only, and why each one:**

| move | gate | reason it is ground-only |
|---|---|---|
| **jump** | `onFoot` | in the air, `Space` is flight. One key, two meanings, disambiguated by the state — the whole mode switch |
| **roll / dash / slide / sprint** | `onFoot` | footwork is footwork. `blink` and `phase` are exempt: a teleport is not a step |
| **crouch** | `onFoot` | there is nothing to duck under in an open sky |
| **the swing quadrant** (§4.2) | `_chaseKb` (PowerWorld) | ⚠ **this is the JKA 7.5 rule exactly**: a directional swing you cannot see the direction of is not worth having, and the isometric city camera cannot show it. The city keeps the neutral strike it was tuned with |
| **wall jump** | `_openSky` + `def.acro` | needs the spires; the city has `f.hanging` and the grapnel already |

**And what is air-only, for symmetry** (already true, listed so the split is visible): the dive punch
(`melee.js:145`, `_momDive` requires `flying`), `game.intercept` (`game.js:2094`), pass-through
(`game.js:1636`), the climb to space (`powerworld.js:278`).

⚠ **`shellAllows` must never gate DAMAGE, REACH or where a hit lands** — only whether an action is
*offered*. If a future reader is tempted to put `case 'damage'` in it, the answer is no, and the
reason is the second half of the rule above.

---

## 7. WHERE WE ARE ALREADY BETTER — ⚠ DO NOT REGRESS

Four, all with citations. Three come from `aaa-00-ground-truth.md:694`; the fourth is ground-specific
and is new here.

1. **THE BEAM IS A STREAM, NOT A LASER.** `pw-bfp-source.md:502`: *"We built a curved beam; BFP's is
   a straight re-aimed laser."* `pw-bfp-source.md:598` (item 6) says explicitly **"Keep our curved
   beam — the two changes are independent"**, and `:611` lists *"the straight re-aimed beam"* under
   **Do not adopt**. §5.2's `pin` role adds a movement penalty to a ground beam and touches nothing
   about the beam's shape.
2. **THE POWERSTRUGGLE.** `POWERWORLD.md:466`: *"Our beam struggle is already correct by ESF's
   standard."* Caveat at `pw-bfp-source.md:527`.
3. **THE ABILITY TABLE.** `pw-bfp-source.md:604`: BFP is 28 data-defined attacks and a character is
   five integers into it; ours is 22 `TYPES` and 364 abilities across 52 heroes plus the creator.
   *"We already built the thing BFP proved the shape of, at ~13× the content."* §5 is built on top of
   that table and adds no new types.
4. ⚠ **[NEW] OUR AIR CONTROL IS ALREADY AHEAD OF SINGLE-PLAYER JEDI KNIGHT, AND OUR GROUND
   ACCELERATION AND FRICTION ARE ALREADY id's.** From §3.1: our acceleration constant `9`
   (`entity.js:1594`) sits between stock Q3's `pm_accelerate 10` and JKA-SP's `12`, in the same
   `accel · dt · wishspeed` form; our ground drag coefficient `6` (`entity.js:1417`) is numerically
   `pm_friction 6` and its exponential is the linearisation of id's drop; and our air acceleration is
   **9 against JKA-SP's 4 and stock Q3's 1**. `openjk.md:1571` calls the SP air-accel retune *"the
   feel of single-player Jedi Knight movement… substantially two retuned floats plus one extra line."*
   **We are past that already.** Nothing in this document changes any of the three, and any future
   pass that "ports Q3 movement" and lands on 10/1/6 would be a regression on the air axis.
   The one genuinely missing piece is `pm_stopspeed` (§3.2), which is additive.

Also on the refuse list: BFP's melee (*"no combos — its own author wanted it replaced"*), the
ultimate-tier 5 s total invulnerability, the ×10 attacker-PL damage multiplier
(`pw-bfp-source.md:611-614`); and from JKA, the force-power architecture (`openjk.md:2295`:
*"15–20 files to touch per new power; three of its tables are dead; two powers squat in each other's
state slots"*), `cg_thirdPersonAlpha` (fading the *player* rather than the occluder — our
`updateOcclusion` is already the modern answer), and `cg_thirdPersonMaxRange`, *"a registered,
documented, never-read cvar in two shipped games."*

---

## 8. THE LOOPS AND THEIR GATES

Ordered by dependency. Each is a scoped task with a gate; run until green. **No calendar estimates.**

**LOOP 1 — FOOTING.** §2.2 + §2.3. The landing rule, `onFoot`/`footT`/`airT`, coyote.
> **Gate.** Headless, driving the real keys (`aaa-00-ground-truth.md:738`: drive the gate, never
> write the gated value; `KEYMAPS[SETTINGS.scheme].up`, and `input.endFrame()` is called by main.js's
> rAF loop and **not** by `game.update()`):
> (a) a PowerWorld fighter who takes off, releases, and falls to the floor has `flying === false`,
> `grounded === true`, `onFoot === true` within 2 frames of contact;
> (b) holding ascend at the floor never lands;
> (c) a fighter hit for `launchT > 0` who skids across the ground stays `flying` until `launchT`
> expires and then lands;
> (d) **two grounded fighters collide** (`game.js:1636` — walk one into the other, assert separation);
> (e) the spacing rings become visible (`game.js:481`);
> (f) a fighter clipping terrain while climbing (`impact > 0`) does **not** land;
> (g) **the city is unchanged** — a city duel after a PowerWorld match: 0 fighters carrying
> `_openSky`, landing behaves exactly as before, measured identically. This is the
> `powerworld.js` proof pattern and it is not optional.
> (h) `world.auditGround()` floor contract: `|groundY − heightAt(x,z)| < 0.25` for every fighter
> (`CLAUDE.md`, THE GROUND UNDER A VENUE).

**LOOP 2 — THE GROUND MOVER.** §3.2 stopspeed, §3.3 multipliers, §3.4 jump, §3.6 crouch.
> **Gate.** Measured, not asserted: stop distance from a median run (target ≤ 0.20 s to rest);
> jump apex within 5% of **5.4 wu**; crouch speed exactly 0.50×; **and a screenshot** — `CLAUDE.md`
> and `aaa-00-ground-truth.md:753` both record that scale and feel faults are invisible to
> assertions (the ring shipped 4× too big, the rubble shipped black, the stage shipped as a black
> void, all with green tests).

**LOOP 3 — THE PHASES.** §4.1 startup/active/recover, `strikeActive` as a derived shim.
> **Gate.** (a) A jab thrown at an opponent standing at 10 wu does **not** connect during the first
> 0.10 s; (b) a haymaker's 0.34 s startup can be interrupted by a jab (`melee.js:70` already does
> this — assert it still does); (c) a grab landed during the victim's `recover` phase yields
> `grabMode === 'back'`; (d) **the harness proves itself first** — a point-blank jab must land at all
> before any negative assertion counts (`CLAUDE.md`, the vacuous-pass law: `[].every()` is `true`);
> (e) all twelve existing readers of `strikeActive` still behave (`aaa-00-ground-truth.md:735`);
> (f) `strikeActive` never goes negative (`melee.js:237`).

**LOOP 4 — THE MEASURED SWING.** §4.6.
> **Gate.** The instrumentation runs *first*: log p50/p95 fist speed for jab / cross / haymaker
> across all 52 fighters, publish the table, **then** set `HAND_REF` and the span from it. A shipped
> `HAND_REF = 24` without that table is a failed loop regardless of how it feels.
> Plus: `swingMult` returns `momentumMult` exactly when `!onFoot` (no drift in the air),
> and blocked hits take neither.

**LOOP 5 — THE STYLES.** §5.3 `artOf`, §5.2 `groundKitOf`.
> **Gate.** Print the 52-row assignment. **0 heroes in any style, or > 21 in one, is a red.** Then
> assert `def.art` overrides the derivation, and that a fighter with no abilities at all gets
> `closer` without throwing.

**LOOP 6 — BLOCK AS A MOVE PROPERTY + THE ARC LADDER.** §4.3, §4.4.
> **Gate.** (a) A haymaker's startup takes full damage from a jab (`blk.startup === 'no'`);
> (b) a held guard with no strike in progress behaves **identically to today** — same damage
> multipliers, same meter drain, same `onBlockedStrike` push/stagger (`game.js:2666`), same parry
> window ≤ 0.22 s (`game.js:2686`); (c) `guardArcOf` returns **≥ 3 distinct values** across the
> roster (the `resistOf(def, sheet)` lesson: a can't-drift surface that returns one number 52 times
> is a wire that does nothing); (d) `barrier` is still 360°.

**LOOP 7 — QUADRANTS AND CHAINS.** §4.2, §4.5. Gated behind `shellAllows(f,'quadrant')`.
> **Gate.** (a) The neutral three-beat jab-jab-cross is still reachable and still legal;
> (b) `coneFoe`'s yaw offset is the *same function* (no second hit test in the repo — grep);
> (c) the city is byte-identical in behaviour (the predicate returns false there).

**LOOP 8 — WALL JUMP.** §3.7. Last, because it is the only one that needs new geometry queries.
> **Gate.** The 42.9 wu climb cap holds across a spire pair; the 0.5 s air-control lock is
> observable; `def.acro.wallJump === false` refuses; `f.hanging` still releases through the single
> `releaseHang()` path.

**Cross-cutting, every loop:** a new transient goes in `game.clearTransients()` (`game.js:1717`),
never a reset path; `game.later(fn, ms)` never a bare `setTimeout`; the visible light count never
changes; the manual (`docs/COMBAT_MANUAL.md`) changes in the same commit as the mechanic.

---

## 9. RULINGS NEEDED

**Q1 — THE UNIT ANCHOR.** §1. Body height (1 qu = 0.1714 wu) or world architecture (1 qu = 0.094 wu)?
It is a 1.82× difference and it changes `pw-bfp-source.md:564`'s intercept recommendation from
**66 wu to 120 wu**. This document uses the body anchor throughout; if the ruling goes the other way,
every jump/roll/wall number here scales by 0.55.

**Q2 — THE INTERCEPT, AND TWO DOCUMENTS DISAGREE.** Already flagged at
`aaa-00-ground-truth.md:686`: `pw-bfp-source.md:490` says *"`CATCH_SPD = 132` was invented and the
underlying model is wrong"* and recommends a **distance** refusal; `POWERWORLD.md:441` argues the
speed-based catchability was *"an accident worth making deliberate."* This is a ground-grammar
question too — if the intercept becomes reliable, the ground fight is much easier to *escape into*,
and the air/ground switch changes character.

**Q3 — TWO CLINCH FORMULAS.** `martial.js:123` `clinchWindow()` uses a **squared rank ratio** ×
style resist × condition (medical/trauma); `melee.js:290` uses a **linear strength difference**.
`aaa-00-ground-truth.md:318`: *"Two different clinch formulas exist in the repo and the shipped one
is the simpler one."* The authored one reconciles two of Robert's own stated numbers
(`martial.js:130-135`) and pays off the medical layer. **Recommendation: adopt `clinchWindow()`** —
but it changes every clinch duration in the game and is a feel call.

**Q4 — DOES THE GROUND GRAMMAR EXIST IN THE CITY?** §6 gates the swing quadrant on `_chaseKb`, but
startup/recovery frames (loop 3) are a **global** melee change and will be felt in every city fight,
every boxing match (`engine/boxingring.js`) and the tutorial. My position: **yes, globally** — a
punch with no startup is a defect everywhere, and the boxing mode in particular is built on the
premise that the trifecta is the whole game. But it is a roster-wide balance event and Robert
should call it before loop 3, not after.

**Q5 — JUMP HANG TIME.** §3.4. Match height (0.85 s of air) or add a fast-fall multiplier (0.74 s)?
A screenshot/feel call, not an assertion call.

**Q6 — DOES CROUCH COST THE `down` KEY ITS MEANING?** §3.6 gives `KM.down` a second meaning on the
ground. In PowerWorld a fighter who lands while holding descend would immediately crouch, which is
probably right, but it interacts with the landing rule's `descendHeld` term in the city branch
(`entity.js:1450`). Needs one explicit truth-table pass.

---

## 10. EVERY NUMBER IN ONE TABLE

| quantity | JKA/Q3 | converted | **ours today** | **proposed** | source |
|---|---|---|---|---|---|
| run speed | 250 qu/s | 42.9 wu/s | 27–45.4 wu/s | unchanged | `openjk.md:1594` · `entity.js:1573` |
| ground accel | 10 / **12** | — | **9** | unchanged | `openjk.md:1541` · `entity.js:1594` |
| air accel | 1 / **4** | — | **9** | unchanged (we lead) | `openjk.md:1552` · `entity.js:1594` |
| air decel vs velocity | **1.35** | ×1.35 | absent | consider | `openjk.md:1566` |
| ground friction | 6 | 6 /s | **6** (`exp`) | unchanged | `openjk.md:1613` · `entity.js:1417` |
| **stopspeed** | **100 qu/s** | **17.1 wu/s** | **absent** | **add** | `openjk.md:1613` |
| crouch scale | 0.25 / **0.50** | ×0.50 | absent | **0.50** | `openjk.md:1541` |
| walk friction mod | **3.0** | ×3 | absent | 3.0, speed ×0.55 | `openjk.md:1560` |
| jump velocity | 270 / **225** | 38.6 wu/s | **absent** | **25.5 wu/s** | `openjk.md:1583` |
| jump apex | 31.6 qu | 0.564 body | absent | **5.4 wu**, 0.85 s | derived |
| gravity | 800 qu/s² | 137 wu/s² | **60 wu/s²** | unchanged | `entity.js:1384` |
| step-up | 18 qu | 3.09 wu | 2.5 wu | consider 3.0 | `openjk.md:1596` |
| roll trigger | 200 qu/s | **34.3 wu/s** | absent | add as 2nd evade entry | `openjk.md:1700` |
| roll distance | ~1 s anim | ≈30 wu | dash 14.6 / slide 49 | unchanged | `openjk.md:1697` |
| roll i-frames | **none** | — | 0.20–0.45 s | **keep ours** | `openjk.md:1704` |
| wall-run trace | 128 qu | 21.9 wu | — | refused | `openjk.md:1745` |
| wall-jump impulse | 336 / 200 qu/s | **57.6 / 34.3 wu/s** | absent | adopt | `openjk.md:1761` |
| wall-jump air lock | 500 ms | 0.5 s | absent | adopt | `openjk.md:1770` |
| wall climb cap | 250 qu | **42.9 wu** | absent | adopt | `openjk.md:1772` |
| force jump L3 | 840 qu/s | 144 wu/s | `leap` 46 wu/s | not adopted | `openjk.md:1766` |
| jab startup / active / recover | — | — | **0 / 0.2 / 0** | **0.10 / 0.06 / 0.14** | `martial.js:21` |
| cross | — | — | **0 / 0.2 / 0** | **0.16 / 0.07 / 0.22** | `martial.js:23` |
| power | — | — | **0.12 / — / 0** | **0.34 / 0.09 / 0.40** | `martial.js:25` |
| grab startup | — | — | 0.14 | **0.18** | `martial.js:27` |
| reach jab / cross / power / grab | — | — | **11 / 9 / 7 / 8** | unchanged | `martial.js:21-28` |
| `STEP_IMPULSE` | — | — | **8** | unchanged | `martial.js:35` |
| attack move penalty | .75 / .60 / **.45**; spin .3 | — | flat **×0.5** | per-strike | `openjk.md:1580` · `entity.js:1593` |
| guard arc | 87.1 / 69.5 / 49.5° | — | **±98.6°** (`dot > −0.15`) | sheet-derived ladder | `openjk.md:990` · `melee.js:166` |
| parry window | 500/300/150/**50** ms | — | **220 ms** | unchanged | `openjk.md:983` · `game.js:2686` |
| swing tolerance | 8 / 16 / 24 qu | 27.4 / 54.9 / 82.3 wu/s | body `\|vel\|` | **measure ours** | `openjk.md:915` · `melee.js:14` |
| momentum multiplier | — | — | ×1.0 → **×2.5** @58 wu/s | keep, air only | `melee.js:14-17` |
| hand multiplier | base 3/5/7, cap 16 | — | absent | ×1.0 → ×2.2 **[provisional]** | `openjk.md:912` |
| chain angle refusal | `<135 \|\| >215` | — | absent | `<135` (folded) | `openjk.md:1090` |
| chain tolerance | Fast 5 / other 3 | — | fixed 3-beat | 5 / 3 / 2 | `openjk.md:1104` |
| combo window | — | — | **0.42 s** (0.32 whiff) | unchanged | `melee.js:268-270` |
| coyote time | — | — | absent | **0.12 s** | derived, §2.3 |
| landing recovery | `delta/3` on crouch | — | `_landT ≤ 0.26 s` | gates jump/roll | `entity.js:1452` |
| `AIR_DRAG` | — | — | **1.8** | ⚠ do not touch | `entity.js:29` |
| `PW_KB` | — | — | `kb 2.2 / launch 1.45 / drag 0.5 / window 2.6` | unchanged | `core/util.js:91` |

---

## 11. THE FIVE-LINE VERSION

- **Fix the landing rule first** (`entity.js:1450`). Eight systems become correct for free, and none
  of the rest of this document works until it is done.
- **There is no jump and there are no startup frames.** Those two absences are the whole difference
  between our melee and a fighting game, and the second one is why `data/martial.js` is dead.
- **Blocking should be a property of the move you are in** (`BLK_NO` on every transition), and
  **defence should buy arc, not probability** — one column and one constant, and they are the two
  cheapest upgrades in the reference.
- **All 52 get it generically** because only one of the four ground roles is kit-dependent, and both
  derivations (`artOf`, `groundKitOf`) scan `def.abilities` for a `type` string — the pattern
  `deriveAI` and `_swingKind` already use.
- **BFP momentum in the air, JKA measured swing on the ground, selected by `onFoot`.** That single
  line is the thesis, and everything else here is what has to exist for it to be true.

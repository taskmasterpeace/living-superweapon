# POWERWORLD — GROUND TRUTH

**What the engine actually does today, read from the code, on 2026-07-27, at `56e7716`.**

This is the shared factual base. Every other agent working the *"BFP in the air, Jedi Academy on the
ground"* thesis builds on this document, so it is written to one rule: **prefer "I read X at line N
and it does Y" over any generalisation.** Where I am inferring rather than reading, it says so.

Files read in full or in the relevant span:
`src/engine/entity.js` (2017 ln) · `src/engine/melee.js` (340) · `src/data/martial.js` (155) ·
`src/engine/world.js` (2414, camera + occlusion + projection spans) ·
`src/engine/game.js` (3745, control/targeting/mode/hit spans) · `src/engine/powerworld.js` (575) ·
`src/core/util.js` (137) · `src/engine/abilities.js` (`runSlot`, `performEvade`) ·
`src/pw-main.js` (47).

⚠ **Line numbers drift.** `docs/reference/openjk.md:2045` cites the aim bug at `game.js:2986-2989`;
that same code is at **`game.js:3172-3175`** today. Anchor on function names, use line numbers to
navigate.

---

## 0. THE ONE-PARAGRAPH SUMMARY

The thesis is **half built, and the built half is the air half.** Flight under `_openSky` is a real
3-D velocity mover with a camera-relative basis, coasting momentum, no decks, no ceiling and every
character enabled — that is genuinely BFP-shaped and it works. The **ground half does not exist as a
distinct grammar at all**: melee.js has zero awareness of PowerWorld (`grep _openSky src/engine/melee.js`
returns nothing), the reach table is the same 11/9/7 units in both worlds, `data/martial.js`'s eight
STYLES / four clinch POSITIONS / `clinchWindow` / `SUBMISSIONS` are **declared and never called by
anything**, and zero of the 52 characters declares `def.art`. There is currently no Jedi Academy. There
is BFP flight bolted onto the city's street-brawl melee, viewed through a chase camera that has a known
parallax bug between where the crosshair points and where the shot goes.

---

## 1. MOVEMENT AND FLIGHT — `src/engine/entity.js`

### 1.1 The constants, all of them

| name | value | line | note |
|---|---|---|---|
| `AIR_DRAG` | `1.8` | `entity.js:29` | the open-sky coefficient, **all three axes** |
| `FLY_RISE` | `46` | `entity.js:30` | target vertical speed while ascend is held |
| `FLY_SINK` | `26` | `entity.js:30` | descend speed **and** the deck-servo speed cap |
| `FLY_TAKEOFF` | `19` | `entity.js:30` | the pop off the ground |
| `FLY_HOVER_BOB` | `3.2` | `entity.js:30` | hover bob amplitude (city only) |
| `PW_KB` | `{kb:2.2, launch:1.45, drag:0.5, window:2.6, catchK:52}` | `core/util.js:91` | the PowerWorld knockback dial, live-editable as `LSW.PW_KB` |
| `pwCatchSpeed()` | `catchK × kb` = **114.4** | `core/util.js:92` | intercept refusal line in PW |
| `BAND_DEFAULTS` | `{ground:8, building:150, sky:260, ceiling:320, …}` | `core/util.js:52` | overridden per city; PW raises ceiling→900, sky→420 |
| `FLY_SPEEDS` | per-hero table, 1.08–1.3 | `entity.js:99-102` | tier-3 air multiplier; `def.flySpeed` overrides |
| base `speed` | `def.speed || 30` | `entity.js:184` | |
| `radius` | `2.2` (every fighter, no exceptions) | `entity.js:185` | |

### 1.2 `move(dir, dt, sprint)` — `entity.js:1569-1620`

Speed is built at `:1573`:

```js
let s = this.speed * 1.08 * this.powerBuff * sprint * moodMult(this, 'speed', 1);
```

Then multiplied in order: leg wound `×(1 − 0.09·lvl)` (`:1574`) · sprint `×1.6` (`:1575`) ·
haymaker wind-up `×0.4` (`:1576`) · **flight** (`:1577-1585`) · water (`:1587-1590`) ·
glide `×1.4` (`:1591`) · guarding `×0.34` (`:1592`) · `strikeActive > 0` **`×0.5`** (`:1593`).

The flight multiplier, `:1578`:

```js
s *= this.flightTier >= 3 ? this.flySpeed * 1.2 : this.flightTier === 2 ? 0.78 : 0.95;
```

⚠ **`_openSky` does not appear in this line.** Every character flies in PowerWorld
(`toggleFlight` at `:304` and the ascend-takeoff at `:1249` both admit `this._openSky`), but a
`flightTier 0` fighter still flies at the tier-≤1 rate of **0.95×**, and a tier-3 paragon at up to
**1.56×** (`1.3 × 1.2`). That is a **1.64× spread across the roster in the air**, and it is entirely
tier-derived. `pw-bfp-source.md:580` (item 3) asks for the opposite model — BFP's air speed is
`(speed + PL×0.5) × (2.0 + PL×0.001)`, i.e. **power buys the sky**, up to 8.7× a walker. Our
`powerBuff`/`levelMult`/tier ladder is already the same quantity and is **not fed into the air clamp**.

Cruise (`:1580-1584`): `cruiseHeld && ki > 1` → `×1.5` and `−2.6 ki/s`; a lit afterburner then
multiplies by `(def.afterburner.mult || 2.1) / 1.5`, so the net is `×mult`.

**Acceleration and the clamp**, `:1594-1617`:

```js
this.vel.x += dir.x * s * dt * 9;
this.vel.z += dir.z * s * dt * 9;
const mx = (this.burstT > 0 || this._slideT > 0) ? Math.max(s, 150) : s;
```

Two branches follow:

- **3-D branch** (`:1606-1609`), gated `this.flying && this._openSky && dir.y`:
  `vel.y += dir.y * s * dt * 9`, then a **3-D magnitude clamp** to `mx`, skipped when `launchT > 0`.
- **2-D branch** (`:1610-1617`): horizontal clamp only, skipped when `this._chaseKb && this.launchT > 0`.

⚠ **The 3-D branch is gated on `dir.y` being truthy.** A pure-strafe input under an open sky
(`iz = 0`, so `d3.y = fwy * 0 = 0`) falls into the **2-D** branch and gets the horizontal-only clamp.
Correct by accident today (no Y is being added), but it means the code path changes with the stick.

⚠ `dir` is `{x, z}` from every caller except the one open-sky player path — `controlBot` and
`controlPad` build 2-D dirs. **Bots do not have 3-D flight movement.** They climb only via
`out.fly → flyHeld`, i.e. the elevator model, which is precisely what the open-sky branch was written
to abolish for the player.

### 1.3 The floor, `grounded`, and terrain

`entity.js:290`:
```js
get grounded() { return (this.pos.y <= (this.groundY || 0) + 0.01 || this.onBlock) && !this.flying; }
```

`groundY` is sampled **once per frame** at `:1424` from `game.world.heightAt(x, z)`, after the
position integrate. Ground contact resolves at `:1441-1457`: clamp `pos.y` to `groundY`, zero
negative `vel.y`, knee-crouch at impact `< −30` (`:1452`), **slam damage at impact `< −38`** (`:1456`).

⚠ **Landing does not exit flight mode in PowerWorld** — `:1450`:
```js
if (this.flying && !this.flyHeld && !this._openSky && (this.descendHeld || this.flightTier <= 1)) this.flying = false;
```
So under an open sky you can be **`flying === true` while resting on the floor**. Everything that
branches on `flying` therefore behaves differently on the PowerWorld ground than on the city ground.
This is the single most important fact for anyone building the "touch it and you are playing Jedi
Academy" half. Confirmed consumers of `flying` that are affected:

| reader | line | consequence on the PW ground |
|---|---|---|
| `grounded` getter | `entity.js:290` | **returns false while standing on the floor** |
| `move()` air multiplier | `entity.js:1578` | ground speed uses the AIR multiplier |
| `coneFoe` vertical rule | `game.js:2151` | uses the 3-D distance rule, not the ±10u deck rule |
| `resolveBodies` pass-through | `game.js:1636` | two "flying" fighters standing on the floor **do not collide** |
| `updateSpacingRings` | `game.js:481` | rings hidden (`!p.flying` is false) → **the spacing overlay never shows in PowerWorld** |
| open-sky drag `glide` | `entity.js:1412` | drag is `1.8`, not `6` — you skate |
| the player's 3-D move basis | `game.js:3243` | camera-relative 3-D movement while on the ground |
| flight pose | `entity.js:1824` | prone/bank pose driven by velocity while grounded |

### 1.4 The flight state machine — `_physics`, `entity.js:1204-1539`

Order of the chain at `:1207`, and the order is load-bearing:

1. `this._grapple` (`:1210-1233`) — reel at 90 u/s, arms `burstT 0.08`, suspends everything else.
2. `this.hanging` (`:1234-1243`) — pinned to a wall face.
3. else (`:1244`) the normal chain:
   - **Takeoff**, `:1249`: rising edge of `flyHeld` + `!flying` + `(flightTier > 0 || _openSky)`.
   - **Release-while-aloft**, `:1256`: `vel.y = clamp(vel.y, −FLY_SINK, 5)`.
   - **`if (this.flying)`** `:1259` — the five-way branch, in this order:
     | # | condition | line | behaviour |
     |---|---|---|---|
     | a | `launchT > 0` | `:1277` | gravity `−34·dt·gravZone`; the servo yields entirely |
     | b | `flyHeld` | `:1284` | climb toward `FLY_RISE`, λ 7 — **unless** lidded |
     | c | `descendHeld` | `:1317` | sink toward `−FLY_SINK`; **power dive** if a move dir is held (`+54·dt` horizontal, `vel.y ≤ −35.1`, `burstT 0.15`) |
     | d | `flightTier <= 1 && !_openSky` | `:1330` | sag to `−7` |
     | e | **`_openSky`** | `:1332` | `vel.y *= exp(−AIR_DRAG·dt)` — **coast, no hover, no soft floor** |
     | f | else | `:1350` | the **deck servo**: ease onto `deckOf(band)` |

   ⚠ **The order of (e) matters and is documented as a shipped bug.** `entity.js:1333-1340` records
   that this test was first placed at the *top* of the chain, which swallowed `flyHeld`/`descendHeld`
   whole ("only able to fly straight"), and that the harness passed because it wrote `pos.y` directly.
   **A flag that changes what happens when you RELEASE a button belongs where the release is handled.**

   `maxBand` at `:1270`: `this._openSky ? 3 : (def.maxBand ?? (flightTier >= 3 ? 3 : 1))`.
   `unlidded` at `:1302`: `_openSky || (def.afterburner && _burnT > 0.8)`.
   The rung click at `:1312-1315` is silenced by `!this._openSky`.

### 1.5 Drag classes — `entity.js:1400-1418`

```js
const launched = this._chaseKb && this.launchT > 0;
const glide    = this._openSky && this.flying;
const dragF = Math.exp((launched ? -PW_KB.drag
                       : this._slideT > 0 || this._thrownT > 0 ? -1.3
                       : glide ? -AIR_DRAG
                       : -6) * dt);
this.vel.x *= dragF; this.vel.z *= dragF;
this.vel.y = clamp(this.vel.y, -160, 70);
```

Four classes: **launched 0.5 · thrown/sliding 1.3 · open-sky glide 1.8 · everything else 6.0.**
`vel.y` is never dragged outside branch (e) — it is clamped only.

### 1.6 `launchT` and `burstT` — the two exception windows

- **`launchT`** is armed in `takeDamage` at `entity.js:716`, when `|kb_horizontal| > 30` **or**
  `|opts.launch| > 12`. Duration: `_chaseKb ? PW_KB.window (2.6s) : 1.1s`. Also written directly at
  `melee.js:217` (aimed throw, `1.35`) and `projectiles.js:946` (beam pressure ladder). Decremented at
  `entity.js:837`. It gates: the slam rules (`_slam`, `entity.js:810`), the deck servo (`:1277`), the
  2-D walk clamp exception (`:1616`), the 3-D clamp exception (`:1609`), the drag class (`:1400`), the
  wall-crack attribution (`:1506`), and `game.intercept` (`game.js:2099`).
- **`burstT`** (`entity.js:229`, decremented `:836`) lifts the walk clamp to `max(s, 150)`. Set by
  dash/evade, the grapnel reel (`:1231`), the power dive (`:1326`), and `intercept` (`game.js:2121`).

### 1.7 Knockback scaling — `entity.js:702-712`

```js
let kbMul = (this.metal ? 0.72 : 1) * (1.22 - this.strength * 0.047);
let kbLaunchMul = kbMul;
if (this._chaseKb) { kbMul *= PW_KB.kb; kbLaunchMul *= PW_KB.launch; }
```

So a STR-1 flesh fighter takes `1.173×` and a STR-10 metal one `0.541×` — a **2.17× spread by target**.
In PowerWorld that horizontal figure is multiplied by 2.2 and the vertical by 1.45. Deliberate
asymmetry: `core/util.js:72-73` states that at parity every punch becomes a pop-up.

### 1.8 The ceiling

`entity.js:1462`: `if (this.pos.y > BANDS.ceiling && !this._openSky)`. In PowerWorld the clamp does
not run at all. `MODE_IMPL.powerworld.setup` raises `BANDS.ceiling` to ≥900 and `BANDS.sky` to ≥420
(`game.js:220-222`) and `tick` **re-asserts** it every frame (`game.js:246`) because `world.fitBands()`
runs after mode setup and overwrites it. `clearTransients` restores the stashed table
(`game.js:1724`). The comment at `game.js:244` names the structural fix that was not taken:
`plan.bandsLocked` as an early return inside `fitBands`.

---

## 2. MELEE — `src/engine/melee.js` + `src/data/martial.js`

### 2.1 ⚠ MELEE HAS NO POWERWORLD AWARENESS WHATSOEVER

```
$ grep -n "_openSky\|_chaseKb\|powerworld" src/engine/melee.js
(no matches)
```

Reach, frames, damage, hitstop, step-in, the clinch window and the throw are **byte-identical in the
city and in PowerWorld.** The only PowerWorld-flavoured melee differences are consequences elsewhere:
`coneFoe`'s 3-D range rule when both parties are `flying` (`game.js:2151`) and the `PW_KB` multiply
inside `takeDamage`.

### 2.2 The frame table — `data/martial.js:20-35`

| id | reach | startup | active | recover | dmg (table) | step | cancels |
|---|---|---|---|---|---|---|---|
| `jab` | **11** | 0.10 | 0.06 | 0.14 | 4 | 2.0 | cross, grab, dash |
| `cross` | **9** | 0.16 | 0.07 | 0.22 | 8 | 3.0 | grab |
| `power` | **7** | 0.34 | 0.09 | 0.40 | 18 | 4.5 | — |
| `grab` | **8** | 0.18 | 0.10 | 0.30 | 0 | 2.4 | — |

`STEP_IMPULSE = 8` (`martial.js:35`) converts `step` to a velocity impulse: jab 16, cross 24, power 36.

⚠ **`startup`, `active`, `recover` and `dmg` in this table are NOT read by the engine.** `melee.js`
imports `{ STRIKES, STEP_IMPULSE, styleOf, hasStrike }` (`melee.js:6`) and reads only `.reach`, `.step`
and (in game.js) `.color`. The real timings are hard-coded in melee.js — see §2.3. **The frame table is
documentation that looks like data.**

### 2.3 The timings the engine actually uses

`strike()` — `melee.js:32-59`:
- gates (`:35-37`): no `_carry`, `canAct(f)`, no grab/guard/`strikeActive`/`meleeCharge`, and
  `strikeCd <= 0 || comboWin > 0`.
- `pace = def.meleePace || 1` (`:42`); VOLT 1.5, the ORIGIN quickhands gift 1.35.
- `strikeActive = 0.2 / pace` (`:44`); `strikeCd = (idx===2 ? 0.5 : 0.3) / pace` (`:45`).
- `_momSpd` stamped **before** the lunge (`:48`) — 3-D `|vel|`.
- `_momDive = flying && (descendHeld || vel.y < −14)` (`:49`).

`update()` active-window resolution — `melee.js:232-271`:
- `strikeActive` clamped at zero (`:237`) — the comment records that letting it settle at `−0.01`
  silently killed the bot melee mixup, because a negative number is truthy.
- **reach**: `coneFoe(f, idx===2 ? STRIKES.cross.reach : STRIKES.jab.reach, 0.75)` (`:239`) — so the
  combo is jab(11) → jab(11) → cross(9).
- damage `:248`: `(fin ? 17 : 8) × kbs × powerBuff × sheet.jabMult × (1 − 0.08·armWound)`.
- hitstop `:250`: `fin ? 0.14 : 0.07`; attacker takes `hs × (fin ? 0.9 : 0.6)` (`:255`).
- knockback `:253`: `{x: aim.x·(fin?14:8)·kbs, y: (fin?30:2)·kbs, z: …}` — **the third hit launches**
  (y 30). `kbs = blocked ? 1 : momentumMult` — momentum never raises what a guard eats.
- dive punch `:254`: `launch = −(34 + _momSpd·0.45)`, sized to beat kb resistance and cross the −38
  ground-slam gate.
- combo window `:268`: `comboWin = 0.42` after a non-finisher; `0.32` on whiff (`:270`).

Charged melee — `melee.js:64-102`:
- `chargeStart` (`:64`) sets `meleeCharge = 0.001`.
- `chargeUpdate` (`:68`): `+dt × sheet.chargeRate`, capped **1.3**; cancelled entirely if `canAct`
  goes false (`:70`) — **a strike beats a wind-up.**
- `chargeRelease` (`:79`): `t < 0.18` or `meleeTiers === 1` → jab. `t < 0.55 && tiers >= 3` →
  `_heavy(f, 0.45, false)` (the straight). Else `_heavy(f, min(1,t), true)` (**HAYMAKER**).
- `_heavy` (`:87`): `strikeCd = hay ? 0.7 : 0.45`; `invuln = hay ? 0.1 : 0.05`; lunge from
  `STRIKES.power.step` (hay) or `.cross.step`; sets a **0.12s travel window** `_heavyT` (`:101`).
- `_heavyHit` (`:103`): resolves against **`STRIKES.power.reach` = 7** with arc `0.8` (`:110`).
  Damage `:115`: `(hay ? 20 + p·14 : 13) × (0.85 + str·0.03) × powerBuff × …`.
  Victim hitstop `hay ? 0.20 : 0.12` (`:142`); **attacker hitstop `hay ? 0.19 : 0.10`** (`:149`).
  Knockback `:144`: `aim × (hay ? 54 : 26) × mom`, `launch = hay ? 16 : 6`.
  ⚠ `melee.js:141` passes `heavy: hay, haymaker: hay` — that is the wire into `game.onHit`'s impact
  frame; it was missing until 2026-07-26 and the whole feel layer never fired on a haymaker.

`momentumMult(f)` — `melee.js:14-17`:
```js
const k = Math.min(1, Math.max(0, ((f._momSpd || 0) - 12) / 46));
return 1 + 1.5 * k * k;
```
×1.0 standing, ×2.5 at 58 u/s. **This is uncapped by world** — a PowerWorld swoop at cruise speed hits
the ×2.5 ceiling routinely, where a city fighter rarely does.

### 2.4 Guard — `melee.js:169-180` and `entity.js:659-684`

`guard(f, on)` refuses while carrying (`:172`), forces off while hanging (`:173`), and rejects the
raise if `!alive || staggerT > 0 || grabbedBy || grabState || grabbing || strikeActive > 0` (`:177`).
⚠ It deliberately **does not** call `canAct` — `melee.js:174-176` records that gating on hitstop made
any fast combo strip a held block after the first hit.

The block itself is at the `takeDamage` choke point, `entity.js:666-683`:
- arc test `:668`: `guardType === 'barrier' || dot(toAttacker, aim) > −0.15`. **Horizontal only** — a
  `.y` component is never considered, so **guard is fully effective against an attack from directly
  above or below**.
- damage multiplier `:671`: `strike 0.12 · dot 0.5 · else 0.42`, all `× 0.55` for `guardStrong`.
- meter drain `:672`: `strike 0.14 · dot 0.012 · else 0.22`. Regen `+0.55/s` (`entity.js:1084`).
- brace push `:673-674`: `pb = dot ? 0.8 : 5`, applied **against `vel` directly, not through kb**.
- `onBlockedStrike` fires on any blocked `strike` (`:680`) → `game.js:2666`: 0.3s `_bounceCd`,
  `push = perfect ? 54 : 38`, stagger `0.8 / 0.45`, `strikeCd ≥ 0.55`, chain broken. **PARRY** window
  is `_guardUpT < 0.22` (`game.js:2686`).
- Guard-crush is in `_heavyHit` only (`melee.js:119-126`): haymaker vs guard → stagger 0.85, meter
  −0.55, damage `×0.35`.

### 2.5 The clinch — `melee.js:274-338`

- `startup` 0.14s (`:185`), then `coneFoe(f, STRIKES.grab.reach + styleOf(def).grabBonus, 0.95)` (`:278`).
  ⚠ **`grabBonus` is always 0** — see §5.
- back-grab test `:281`: `dot(toHolder, victim.aim) < −0.2`.
- window `:290`: `clamp((behind ? 1.05 : 0.85) + (strH − strV)·0.14, 0.45, 1.8)` seconds.
  ⚠ **This is not `clinchWindow()` from martial.js** — that function is never called. The engine uses
  a linear `strength` difference; the data file has a squared **rank-ratio** model (`martial.js:135`).
  Two different clinch formulas exist in the repo and the shipped one is the simpler one.
- victim pinned at `f.aim × 4.4` with a lateral thrash (`:305`), `vel` zeroed, `pos.y = f.pos.y`.
  ⚠ **The clinch teleports the victim to the holder's altitude every frame.** In an air fight this is
  a free vertical yank of arbitrary size.
- escape at the midpoint (`:314-321`) for `teleEscape` (14 ki) or `canPhase`, front grabs only.
- `_throw` (`:196-223`): `spd = ((back ? 60 : 48) + str·4.6) × wr` where `wr` is the log2 lift/weight
  ratio clamped `[0.45, 1.2]` (`:205`). Velocity is written **directly** (`:215`) — never through kb —
  because the dotted arc preview integrates exactly this state.

### 2.6 `coneFoe` — `game.js:2135-2158` — the melee hit test for everything

```js
if (caster.flying && f.flying) { if (Math.hypot(d, dy) > range) continue; }
else { if (d > range) continue; if (dy > 10) continue; }
const dot = (dx/(d||1)) * caster.aim.x + (dz/(d||1)) * caster.aim.z;
if (dot < Math.cos(arc)) continue;
```

⚠ **The arc test is 2-D and uses `caster.aim`, which has no Y.** Consequences:
- A foe **directly overhead** gives `d ≈ 0`, so `dx/(d||1)` is numerically unstable and the arc test is
  effectively a coin toss. There is no vertical arc at all.
- Arc values in radians: strike `0.75` (≈43°, cos 0.73), heavy `0.8` (≈46°), grab `0.95` (≈54°).
- The `dy > 10` deck gate applies whenever **either** party is not `flying`. In PowerWorld a fighter
  standing on the floor is still `flying` (§1.3), so the 3-D rule usually applies — but a fighter who
  never took off, or a ragdoll, or a construct falls into the ±10u branch.

---

## 3. THE CAMERA — `src/engine/world.js`

### 3.1 The pointer architecture

`world.js:57-67`: `this.camera` is a **pointer** to either `camOrtho` (built in the ctor) or
`camChase` (built lazily on first `setCameraMode('chase')`). `world.js:57-61` states the reason: eight
readers (`_applyProj`, the composer's RenderPass, the print pass uniforms, `screenToGround`, the
occlusion corridor…) stay correct with zero edits as long as the pointer is what moves.

- `camOrtho`: `frustum 78`, `camDir (0.86, 0.92, 0.86).normalize()`, `camDist 260`, near 1, far 1400.
- `camChase`: `new THREE.PerspectiveCamera(58, aspect, 0.6, 4200)` (`world.js:2218`).
- `setCameraMode(mode)` (`:2215-2228`) swaps the pointer, re-applies quality, **rewrites `p.camera` on
  every composer pass** (`:2225` — the RenderPass holds its own reference), and calls `_applyProj`.
- `_applyProj()` (`:2197-2206`) is the one place that knows ortho takes `left/right/top/bottom` and
  perspective takes `fov/aspect`.

⚠ **The drive function claims the mode.** `follow()` calls `setCameraMode('iso')` at `:1330` and
`orbit()` at `:1307`; `chase()` calls `setCameraMode('chase')` at `:2243`. There is no separate mode
flag to keep in sync.

### 3.2 `chase(subject, target, dt)` — `world.js:2242-2327`

Every number:

| step | line | value |
|---|---|---|
| speed factor `k` | `:2247` | `clamp((spd − 14) / 96, 0, 1)` |
| FOV | `:2248` | `damp(fov, 58 + k·16, 4, dt)` → **58 → 74** |
| axis | `:2250-2254` | subject→target if there is one; else velocity if `spd > 6`; else `facing` |
| pitch damp | `:2257` | `ay = clamp(ay·0.55, −0.82, 0.82)` |
| degenerate blend | `:2265-2269` | if `hypot(ax,az) < 0.35`, blend in `subject.facing` weighted `1 − horiz/0.35` |
| `FRAME_MAX` | `:2285` | **52** — beyond this the camera stops trying to frame both |
| fit | `:2286` | `(min(gap,52) + 20) / (2·tan(fov/2))` |
| want | `:2287` | `clamp(max(24, fit·1.15) + k·16, 24, 86)` |
| distance damp | `:2288` | λ 3.2 |
| look bias | `:2290` | `clamp(gap·0.012, 0.16, 0.42)` toward the target |
| look point damp | `:2292-2294` | λ 9 / 7 / 9 (x / y / z) |
| shoulder offset | `:2307` | `off = d · 0.17`, perpendicular and level |
| eye | `:2308` | `S + (−axis·d) + perp·off`, `y = S.y + 5.4 − ay·d·0.18 + d·0.30` |
| eye damp | `:2309-2311` | λ 8 / 6 / 8 |
| shake | `:2316-2318` | **angular** — `jit = min(0.028, _shake·0.011)·d`, applied to the LOOK POINT only |

⚠ `world.js:2312-2315` documents why: `follow()` adds a world-space vector to eye and look point,
which at ortho is ~1.8° of jitter but at a 21u chase distance is **29.7°** and would push the camera
through the fighter.

⚠ **The camera does not collide with the world.** `:2320` writes `c.position.set(...)` straight from
the damped `camPos`; nothing traces. `docs/reference/openjk.md:2086` (§7.2) is the writeup: JKA runs
two swept box traces per frame (`openjk.md:282`, §1.4). In an empty desert this is survivable; pointed
at a city it is not.

### 3.3 `follow`, `orbit`, `shake`, `punch`, `updateOcclusion`

- `follow(target, dt)` `:1326-1355` — the isometric drive. `camTarget` damps λ 8 to
  `(x, 6 + y·0.4, z)`; frustum eases to `_baseFrustum || 78`; **world-space** shake vector added to
  both eye and look-at; sun shadow frustum snapped to whole units and dragged along.
- `orbit(cam)` `:1306-1324` — the map-tool / cinematic channel, always iso.
- `shake(a)` `:1298` — `_shake = min(_shake + a·shakeMult, 8)`. Decays `exp(−7·dt)` in both drives.
- `punch(z)` `:1299` — `frustumTarget = min(frustumTarget, frustum·z)`. ⚠ **This is an ORTHO-only
  effect.** It writes `frustumTarget`, and `_applyProj` only reads `frustum` for orthographic cameras
  (`:2199-2201`). **Every `world.punch()` call in melee.js and game.js does nothing in PowerWorld.**
  `melee.js:125, 158, 220` and `game.js` all call it on impact. That is a lost feel channel.
- `updateOcclusion(p, dt)` `:1359-1406` — fades cover with `top >= 44` that crosses the
  camera→player segment to opacity 0.16 (λ 7), via lazily cloned materials keyed on the cover record.
  Restores + disposes when clear. ⚠ PowerWorld's spires register `mesh`, so they are eligible; the
  stage's `close()` (`powerworld.js:543-548`) has to unwind `world._fades` by hand or the clone
  outlives the geometry.

---

## 4. AIM, TARGETING AND THE CONTROL PATH — `src/engine/game.js`

### 4.1 The aim construction — `game.js:3146-3197`

Three branches (`:3148`, `:3153`, `:3164`): pad-aiming, pad-heading-retained, and mouse. In the mouse
branch:

```js
soft = p.blindT > 0 ? null : this.pickTarget(p);
if (soft) soft.center(a3);
else if (p._openSky) {                                              // game.js:3172
  const cf = _v.set(0, 0, 0); this.world.camera.getWorldDirection(cf);
  a3.set(p.pos.x + cf.x * 120, p.pos.y + 5 + cf.y * 120, p.pos.z + cf.z * 120);
} else { this.world.screenToGround(m.clientX, m.clientY, a3); a3.y = 3; }
```

Then `:3194`: `p.aim3 = normalize(a3 − (p.pos + y 5.8))`, and `:3196-3197` facing follows the hard
lock if there is one, else `aim3`.

⚠ **THE PARALLAX BUG, and it is the highest-value known defect.** `openjk.md:2045-2085` (§7.1) is the
full writeup and it is correct: this takes the **camera's direction** and applies it from the
**player's position** — two parallel rays from different origins, which never converge. `chase()` puts
the eye at `d·0.17` lateral and `d·0.30` above the subject, so at a 40u chase distance the firing
origin is **6.8u lateral and 12u up** from where the crosshair marks. The miss is a **constant 6.8u at
every range**, so the angular error is *worst up close*. `openjk.md:2072` recommends fix (B): raycast
from the camera through screen centre, take the first hit, and set `a3` to **that world point** —
`world.screenToGround` (`world.js:1454`) already builds the camera ray and only needs a different
intersection target. ⚠ The rule JKA states in a comment: **decide whether the shot comes from the
character or the camera, and make the crosshair agree.** Today we have the crosshair on one and the
shot on the other.

### 4.2 The move basis — `game.js:3243-3302`

Under `p._openSky && p.flying` (`:3243`):
- **locked and `ld > PASS (16)`** (`:3269`): forward is the normalised line to the lock.
- **locked and inside PASS** (`:3272-3278`): `p._swoop` is **latched once** from the arrival velocity
  and used until the lock changes. ⚠ `:3263-3267` records that reading the live velocity inside the
  window instead made the swoop park at 10–16u and rock on the boundary.
- **unlocked** (`:3279-3283`): `world.camera.getWorldDirection()`.
- right vector `:3284`: `(−fwz, 0, fwx)` normalised — **flattened**, so strafe never has a Y.
- `d3 = { x: fw.x·iz + right.x·ix, y: fw.y·iz, z: … }`, normalised if `> 1` (`:3285-3287`).

Everything else (`:3289-3302`) uses `p.aim3` flattened, unless `SETTINGS.moveRelative === 'camera'`
(`core/settings.js:73` defaults to `'aim'`), in which case it uses `this.fwd`/`this.right`.

⚠ **`this.fwd` and `this.right` are computed ONCE in the constructor** from the isometric `camDir`
(`game.js:380-381`). They are **stale behind a chase camera**, and they are still read by: the pad aim
branches (`:3149, :3161, :3385`), the double-tap evade direction (`:3310`), and the
`moveRelative === 'camera'` path (`:3298`). **Double-tap evade in PowerWorld dashes along isometric
axes.**

⚠ **`performEvade(c, dir, g)` takes a 2-D `{x, z}`** (`abilities.js:1068`; `EVADE_DEFAULTS` at
`abilities.js:1059` — six kinds, none with a vertical component). There is no vertical evade in the game.

### 4.3 Targeting

- `pickTarget(p)` `:1485-1515` — the mouse magnet. Screen-space; `hoverD` from a body-size half-width,
  `nearD` starts at 110 px, `_lastLock` gets 40 px of stickiness. Skips `_vis < 0.4` (`:1491`). Also
  has the **ground-column pass** (`:1501-1508`): a flier more than 14u above their ground can be
  clicked by their ring. ⚠ In PowerWorld `this.fov` is **false** (`game.js:210`), so `_vis` is pinned
  to 1 for everyone (`game.js:1405`) and the honesty filter here is inert.
- `cycleLock(p)` `:1589-1620` — T. Foes sorted by **angle from the camera's world direction**
  (`:1593-1599`), the ranking **captured once** into `this._cycle` and re-ranked only after 3s of no
  press (`:1605-1607`). The last press releases (`:1612`). ⚠ `:1600-1604` records that recomputing per
  press cycles at random because acquiring reframes the camera and changes the angles the sort reads.
- `updateReticle(dt)` `:1364-1400` — under `_openSky` the gold ground reticle is hidden and only the
  red lock marker draws, at **constant screen size** `clamp(camDist·0.055, 6, 30)` (`:1381`).
- The crosshair is **CSS**, `body.powerworld #hCross` (`hud.styles.js:971-989`), turning
  `var(--danger)` under `body.powerworld.pw-locked`. Toggled from `hud.js:1864-1865` off `p._openSky`.

### 4.4 `runSlot` and the ability gate — `abilities.js:1023-1054`

Order of refusals: `noPowers` (`:1030`) → `inp.dt` finite guard (`:1037`) → `hanging && !oneHand`
(`:1039`) → `_disarmT && st.def.gear` (`:1045`) → no-ki feedback (`:1050`) → `TYPES[st.def.type]`.
`ready(c, def, st)` at `:16` is `cd <= 0 && ki >= cost && hitstop <= 0 && staggerT <= 0 && stunT <= 0`.
`feedSlot` (`game.js:45-49`) blanks `pressed`/`held` (never `released`) while `busy`, where `busy` is
`guarding || strikeActive > 0 || grabState || grabbing || meleeCharge > 0 || staggerT > 0` (`:3344`).

⚠ **`openjk.md:2144` (§7.4) names `runSlot` as the hook for "a power owns the frame".** Nothing in the
ability layer currently owns the camera or the frame.

### 4.5 `onHit` — `game.js:2726-2860+`

The choke point for cosmetics and depth hooks, in order: psyche appraisal (`:2736-2746`) → **print-pass
impact frame + speed lines** (`:2753-2761`, gated `amount >= maxHp·0.14 || opts.heavy || opts.haymaker`)
→ boxing card (`:2767`) → comic SFX (`:2768-2780`) → white-room capture → Overdrive (`:2787`) →
hit-direction → the sustained-block throttle `_blkFxT` at ~8/s (`:2803-2806`) → damage numbers →
combo/XP → style/aerial/momentum/last-stand/nemesis → police heat → `noise()` → the news ledger.

⚠ `onHit` is **cosmetics and bookkeeping only** — it never changes damage or physics. Damage lands in
`takeDamage`.

---

## 5. `data/martial.js` — WHAT IS DECLARED VS WHAT IS WIRED

| export | line | consumers | status |
|---|---|---|---|
| `STRIKES` | `:20` | `melee.js:6`, `game.js:28` | ✅ **`.reach`, `.step`, `.color` only.** `startup`/`active`/`recover`/`dmg`/`cancels` are read by nothing |
| `STEP_IMPULSE` | `:35` | `melee.js:55, 95` | ✅ live |
| `STRIKE_IDS` | `:30` | none | ⛔ dead |
| `reachOf` | `:37` | none (`hudUtil.js:189` has its own unrelated local `reachOf`) | ⛔ dead |
| `RISK_WINDOW` | `:41` | none | ⛔ dead |
| `STYLES` (8 styles) | `:47` | via `styleOf` only | ⚠ **effectively dead** — see below |
| `styleOf` | `:90` | `melee.js:278` | ⚠ called exactly once, for `grabBonus` |
| `hasStrike` | `:91` | **imported by `melee.js:6` and never called** | ⛔ dead |
| `STYLE_IDS` | `:89` | none | ⛔ dead |
| `POSITIONS` (4 clinch positions + wheels) | `:102` | none | ⛔ dead |
| `WHEEL_MAX` | `:116` | none | ⛔ dead |
| `BASE_WINDOW` | `:121` | `clinchWindow` only | ⛔ dead |
| `clinchWindow()` | `:123` | none | ⛔ dead — melee.js uses its own formula at `:290` |
| `SUBMISSIONS` | `:145` | none | ⛔ dead |
| `RING_COLORS` | `:155` | none (`game.js:463` reads `STRIKES[id].color` directly) | ⛔ dead |

⚠ **ZERO of the 52 characters declares `def.art`:**
```
$ grep -c "\bart:" src/data/characters.js
0
```
`styleOf(def)` at `martial.js:90` falls through to `STYLES.boxing` for every fighter in the game. So
`grabBonus` is always `undefined → 0`, and `resist`/`punish`/`entry`/`disarm`/`bottomBonus`/
`rankScaled` are read by nothing at all. **The eight martial styles are a table with no rows pointing
at it.** `docs/WIRE_QUEUE.md:137` and `docs/IDEA_BOARD.md:498` already record this.

This is the single largest pre-built asset available to the Jedi-Academy half of the thesis: a
complete, authored ground-combat vocabulary, sitting one `def.art` field and one dispatch away from
being live.

---

## 6. THE STAGE — `src/engine/powerworld.js`

### 6.1 What it is

A **venue**, on the pattern proven by `whiteroom.js` / `baseroom.js` / `boxingring.js`: hide the
theatre you arrived in, raise your own geometry, put everything back on the way out
(`powerworld.js:6-10`). It is not a city plan and `generatePlan` cannot make one.

`STAGE` (`:23-69`): radius **900** · 15 spires · 22 boulders · `dayT` **pinned at 0.2** · 18 mesas at
r 2200–3600, h 140–320 · `spaceFrom 430 → spaceTo 1500` · 16 clouds at y 260–430 · palette
(`sky.topDay '#1b6ea6'`, `rock '#c1a07c'`, `ground '#9c6e49'`, `darkOdds 0.25`) · `loose [8,6,5,4,2,1]`.

### 6.2 What it registers

| thing | array | line | notes |
|---|---|---|---|
| floor disc | — | `:128` | `CircleGeometry(900, 64)`, y = `GROUND_LAYER.shadow · 0.5` |
| 15 spires | `world.cover` + `coverAll` | `:138-146` via `_reg` | h 60–210, w 9–25, at r 90–560 |
| 22 boulders | same | `:149-155` | s 6–19, at r 40–560 |
| loose rubble | **`world.rocks`** | `:425-445` via `_rock` | props, **deliberately NOT cover** |
| 18 mesas | nothing | `:191-200` | scenery, outside the play radius |
| 16 cloud quads | nothing | `:214-242` | ONE draw call, `depthWrite: false` |

`_reg` (`:361-372`) fills `{x, z, hx, hz, top, h, r, w, d, hp, maxHp, mesh, y0, destroyed, onShatter}`.
⚠ `:348-353` records the shipped defect: the record was missing `r` and `h`, and `projectiles.js` tests
`hypot(...) < c.r + radius && pos.y < c.h` — `x < undefined` is false, so **all fifteen spires stopped
bodies and were transparent to every bullet, blast and beam.** `hp = round(70 + w·h·d·0.0075)`, the
city's own formula.

`RUBBLE` (`:87-95`) is six rungs — SHARD 0.12t · STONE 0.45 · CHUNK 1.3 · SLAB 4.8 · BOULDER 20 ·
MONOLITH 60 — derived so each splits the roster (49/31/25/20/13/3 of 52 can lift them). Size is
`3.48·∛w` (`:95`), never authored separately.

### 6.3 `tick(p)` — `powerworld.js:278-287`

**Two lines of work.** `_skinFighters()` for late arrivals, then:
```js
const t = (y - S.spaceFrom) / (S.spaceTo - S.spaceFrom);
const k = clamp01(t);
this.g.world.setSpace(k * k * (3 - 2 * k));
```
That is the entire per-frame stage logic: the smoothstepped climb-to-space fraction. There is no
stage-side combat, no zone logic, no arena rules.

### 6.4 `_hideTheatre` / `close` — the restore contract

`_hideTheatre` (`:464-490`): stashes `ARENA` and sets it to 900; hides every scene child that is not a
light, camera, entity, particle system, **or `W.skyMesh`** (`:475` — the sky dome was being hidden,
which is why the first screenshot was a black void); hides `_cityBits` and `_roadMeshes`; **swaps out
all four prop arrays** `cars/planes/rocks/treeSpots` (`:484-485`) and all three cover arrays
`cover/coverAll/interiors` (`:486-487`); scales fog density to 0.35×.

`close()` (`:527-574`) unwinds all of it plus the `_pwSkin` material stash, `world._fades`, the pinned
`dayFixed`/`dayT`, the sky-dome scale, `sunOff`, and `setSpace(0)`.

---

## 7. THE FLAG INVENTORY — exactly what turns PowerWorld on

There are **four** switches and they have different scopes. Anyone specing must know which one to hang
a new rule on.

| flag | set at | scope | read by |
|---|---|---|---|
| `f._openSky` | `game.js:233` (setup), `:240` (late arrivals) | per **fighter** | `entity.js:304, 1249, 1270, 1302, 1314, 1330, 1332, 1412, 1450, 1462, 1606, 1886, 1888` · `game.js:876, 1371, 1636, 3172, 3187, 3243, 3448` · `hud.js:685, 1864` |
| `f._chaseKb` | `game.js:227`, `:240` | per **fighter** | `entity.js:710, 716, 1400, 1616` · `game.js:2109` · `projectiles.js:946` |
| `g.ms.chaseCam` | `game.js:186` | per **match** | `game.js:3708` (`cameraDrive`) only |
| `body.powerworld` | `game.js:192`, removed `:1727` | DOM | `hud.styles.js:962-989`, `hud.js:1865` |

⚠ **`_openSky` is 21 read sites and growing.** `game.js:228-232` names the discipline: it means
"nothing docks you, nothing sags, there is no ceiling, and every character can fly" — one dimension,
not four decisions. A fifth unrelated meaning bolted onto it is the failure mode the comment warns about.

⚠ **Neither flag is read by `melee.js`.** That is the gap the ground grammar has to fill.

⚠ **`clearTransients` (`game.js:1717-1784`) restores `BANDS` (`:1724`), `fov` (`:1728`), closes the
stage (`:1726`) and removes the body class (`:1727`) — but does NOT clear `_openSky`/`_chaseKb` off
entities.** It is safe today only because `startMatch`/`startMode`/`_tourneyRound` empty
`this.entities` entirely right after calling it. A future path that reuses fighters across a mode
change would carry the open sky into a city.

---

## 8. WHAT EXISTS, WHAT IS STUBBED, WHAT IS MISSING

### 8.1 EXISTS AND WORKS (verified by reading the code path end to end)

- 3-D flight with a camera/lock-relative basis and a 3-D speed clamp (`entity.js:1606-1609`,
  `game.js:3243-3288`).
- Open-sky coast: no hover, no soft floor, no deck servo, no ceiling clamp, drag 1.8 on all axes.
- Every character flies (`entity.js:304`, `:1249`); tiers still set speed and hover quality.
- The chase camera: pointer swap, derived distance, off-shoulder offset, angular shake, FOV→speed.
- T-cycle lock with a captured ranking; constant-screen-size lock marker; CSS crosshair.
- The `PW_KB` knockback dial and its four positions, including the derived intercept line.
- Fliers pass through each other (`game.js:1636`).
- The stage: destructible spires with the city's hp formula, the six-rung rubble ladder, loose rock
  registered as props, `game._flung` shootable thrown props (`game.js:872-960`).
- The climb to space (`powerworld.js:278`, `world.setSpace`).
- The full restore contract (arena, props, cover, interiors, sky, sun, fog, materials, fades).
- The standalone page (`src/pw-main.js` — 47 lines, `PROFILE_POWERWORLD` over `PROFILE_FULL`).

### 8.2 STUBBED — present but doing less than it appears to

| thing | where | what is actually true |
|---|---|---|
| `data/martial.js` frame data | `martial.js:20-29` | `startup`/`active`/`recover`/`dmg`/`cancels` read by nothing; melee.js hard-codes its own timings |
| the eight STYLES | `martial.js:47-88` | reachable only via `styleOf`, which no character selects; `grabBonus` is the only field ever read and it is always 0 |
| `world.punch()` on impact | `world.js:1299` | writes `frustumTarget`, which `_applyProj` reads **for ortho only** — a no-op in PowerWorld |
| the spacing rings | `game.js:478-491` | hidden by `!p.flying`, and in PowerWorld everyone is `flying` — **never visible there** |
| AI flight | `game.js:3429` (`controlBot`), `:3392` (`controlPad`) | both write `moveDir = {x, z}` — **2-D**, so `dir.y` is undefined and the 3-D branch at `entity.js:1606` never runs for them. Bots and player 2 climb only via `flyHeld`, i.e. the elevator model the open-sky branch exists to abolish |
| `this.fwd`/`this.right` | `game.js:380-381` | computed once from the isometric `camDir`, stale behind the chase camera, still read by pad aim and evade |
| `p._vis` honesty in PW | `game.js:210` | `fov` is false, so `updateVision` pins `_vis = 1` for everyone; the `_vis > 0.4` filters in `pickTarget`/`cycleLock`/`cameraDrive` are inert |
| `bandsLocked` | `game.js:244` comment | the correct fix; the shipped one is a per-frame re-assert in `tick` (`:246`) |

### 8.3 MISSING ENTIRELY

1. **Any ground grammar.** No stance, no footwork, no different moveset on the floor, no
   `_openSky` branch anywhere in melee.js. Touching the ground currently changes nothing about how
   melee works — and because `flying` stays true, it barely changes physics either.
2. **Camera collision.** `chase()` never traces (`world.js:2320`). `openjk.md:282` (§1.4) documents
   JKA's two swept box traces per frame.
3. **A yaw-rate stiffener.** `f.facing` is set instantaneously by `faceDir` (`entity.js:314`); only
   the **mesh** yaw is damped, at λ 14 (`entity.js:1705-1707`). The player has no turn-rate limit.
   (`openjk.md:2124`, §7.3.)
4. **Convergent aim.** §4.1 — the parallax bug. `openjk.md:2045` (§7.1) calls it *fix this first*.
5. **Full-sphere / looping pitch.** `entity.js:1830` clamps `pitchT` to `[0, 1.85]` and the pose is
   driven by **velocity**, not by aim. `pw-bfp-source.md:587` (item 4) cites
   `bg_pmove.c:3425` — BFP deliberately skips the pitch clamp in flight *"so you can go upside down."*
6. **`PM_Drifting`.** `pw-bfp-source.md:593` (item 5): releasing forward pushes you **sideways**, and
   the factor is **27× larger below 100 u/s** (`driftFactor` 0.0003 → 0.008). Nothing like it exists.
   Flagged in that doc as *"the strongest single feel-detail in the file."*
7. **Power-scaled flight speed.** §1.2. `pw-bfp-source.md:580` (item 3).
8. **Intercept as REACH.** `game.intercept` (`game.js:2094`) refuses on **speed**
   (`pwCatchSpeed() = 114.4` in PW, `132` in the city). `pw-bfp-source.md:490` (§8.2) says
   **`CATCH_SPD = 132` was invented and the underlying model is wrong** — BFP has no speed threshold
   and no catch, it is a teleport (`pw-bfp-source.md:242`, §4.1). Item 1 at `:564` recommends
   replacing the speed refusal with a **distance** one: BFP's 700 Quake units ≈ **66 of our units**,
   close to our existing `teleport` range of 58. *"Keep the range, drop the speed gate."*
   ⚠ Note the tension: `docs/POWERWORLD.md:441` (§13.2) argues the catchability was *"an accident
   worth making deliberate"*. **These two documents disagree and it needs a ruling.**
9. **A vertical evade.** `performEvade(c, dir, g)` takes `{x, z}`.
10. **A vertical guard arc.** `entity.js:668` is a horizontal dot product only.
11. **A vertical melee arc.** `game.js:2153` — same.
12. **A power that owns the frame.** `openjk.md:2144` (§7.4) names `runSlot` as the hook.

---

## 9. WHERE WE ARE ALREADY BETTER THAN THE SOURCE — ⚠ DO NOT REGRESS

Three, all documented, all with citations.

1. **THE BEAM IS A STREAM, NOT A LASER.** `pw-bfp-source.md:502` (§8.3): *"We built a curved beam;
   BFP's is a straight re-aimed laser."* Our `BeamHose` emits a packet per frame carrying the
   direction it was **fired** with, so turning bends the beam as a consequence of the simulation
   (measured: 5.7° of bend on a held beam, 122.1° after a 100° sweep). `pw-bfp-source.md:598` (item 6)
   explicitly says **"Keep our curved beam (§8.3) — the two changes are independent"**, and `:611`
   lists *"the straight re-aimed beam"* under **Do not adopt.**

2. **THE POWERSTRUGGLE.** `docs/POWERWORLD.md:466` (§13.4): *"Our beam struggle is already correct by
   ESF's standard."* ⚠ There is a caveat: `pw-bfp-source.md:527` (§8.5) says *"our research was right,
   our engine is not"* about the **BFP** model specifically, and item 6 (`:598`) proposes replacing
   `clashPower()`'s ki-reserve term with a charge-scaled damage comparison plus a binary ×2 on a held
   boost, plus a tie case. **Correct against ESF, improvable against BFP.** Do not lose the curve while
   changing the formula.

3. **THE ABILITY TABLE.** `pw-bfp-source.md:604` (item 7): BFP is **28 data-defined attacks** in a text
   table and a character is **five integers** into it (`pw-bfp-source.md:442`, §7.1). Ours is 22 `TYPES`
   and **364 abilities across 52 heroes** plus the ORIGIN creator. *"We already built the thing BFP
   proved the shape of, at ~13× the content."* The one structural idea worth stealing is that BFP's
   table is a **file a player can edit** — and that belongs in the ATLAS tooling lane, not in combat.

Also on the do-not-adopt list (`pw-bfp-source.md:611-614`): BFP's melee (no combos — *its own author
wanted it replaced*), the ultimate-tier 5s total invulnerability, and the ×10 attacker-PL damage
multiplier (which with a 1000 HP cap makes a charged Ultimate Blast a guaranteed one-shot; the
developers admitted the top-tier attacks broke balance).

---

## 10. TRAPS FOR ANYONE SPECCING ON TOP OF THIS

1. **`flying` is true while standing on the PowerWorld floor.** Any rule of the form "on the ground,
   do X" cannot use `f.flying` or `f.grounded` as written. The honest test today is
   `f.pos.y <= f.groundY + ε`. If the ground grammar needs a real state, it needs a real flag — and
   per the `_openSky` naming lesson (`game.js:228-232`), a **new** one, not a fifth meaning on that.
2. **`opts.hitstop ?? 0.04`, never `||`** (`entity.js:701`). Sustained sources pass `0` deliberately;
   `||` turned that into a per-frame re-armed permanent stunlock.
3. **Never change the visible light count at runtime.** `powerworld.js:522-523` restates it — moving a
   light is free, adding one recompiles every material in the scene.
4. **`strikeActive` must be clamped at zero** (`melee.js:237`). A negative timer is truthy and it once
   silently deleted the entire bot melee mixup.
5. **`_openSky` must not be tested before an input branch.** `entity.js:1333-1340`.
6. **Drive the gate, not the value.** Both the orbit ceiling and the open-sky flight bug tested green
   because harnesses wrote `pos.y` directly. `entity.js:1299-1301` adds the corollary: **a shorter test
   cannot find a higher lid** — the 620-frame flight suite topped out at 456u and could never have
   found the 684u band-3 deck.
7. **`world.punch()` is inert in a chase camera.** If impact zoom is wanted in PowerWorld it needs a
   perspective-side implementation (FOV kick), not a call to the existing function.
8. **A new transient system must be added to `game.clearTransients()`** (`game.js:1717`), not to a
   reset path.
9. **`game.later(fn, ms)`, never `setTimeout`** (`game.js:1662`) for anything touching a fight.
10. **A ladder's rungs come from the distribution.** `powerworld.js:74-85` is the fourth application of
    that law in this repo; the rubble rungs split the roster 49/31/25/20/13/3.
11. **`melee.js` imports from `entity.js`** (`melee.js:5`) — safe, because entity never imports melee.
    Do not create the reverse edge.
12. **`runSlot(c, key, inp, g)` — fighter first, game last.** A harness that gets this backwards fails
    silently.
13. **Screenshots find what assertions cannot.** The stage was verified, described as having its own
    sky, and rendered a black void; the rubble shipped black; the boxing ring shipped 4× too big. Any
    look or scale claim in a spec needs a picture.

---

## 11. THE FIVE-LINE VERSION, FOR THE NEXT AGENT

- **Air:** built, BFP-shaped, works. `_openSky` on the fighter, `ms.chaseCam` on the match, 21 read
  sites, and the flight branch order in `entity.js:1259-1372` is load-bearing.
- **Ground:** does not exist. `melee.js` has never heard of PowerWorld, and `flying` stays true on the
  floor, so the physics does not change either.
- **The asset nobody is using:** `data/martial.js` — eight styles, four clinch positions, a wheel, a
  submission table and a rank-ratio struggle curve, all authored, all dead, `def.art` on zero of 52
  characters. That is most of a Jedi-Academy ground layer already written down.
- **The bug to fix first:** the aim parallax (`game.js:3172-3175`) — a constant 6.8u miss that gets
  angularly worse the closer the target is. `openjk.md:2045`.
- **The thing not to break:** the curved beam. `pw-bfp-source.md:502`, `:598`, `:611`.

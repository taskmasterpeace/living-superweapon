# AAA-03 — THE TRANSITION

**The seam between the two grammars. Read `aaa-00-ground-truth.md` first — this document does not
repeat what it establishes, it builds on it.**

Written 2026-07-27 against the tree at `56e7716`+. Every engine claim is `file:line` as read today.
Every BFP or JKA claim cites the research doc and its own line. ⚠ Line numbers drift; anchor on
function names.

---

## 0. WHY THIS IS THE HIGHEST-RISK DOCUMENT IN THE PROJECT

Robert's thesis:

> *"a stylistic third-person shooter where BFP is in the air and Jedi Knight is on the ground. Leave
> the ground and you are playing Bid for Power. Touch it and you are playing Jedi Academy. The camera
> never changes hands, the reticle never lies, and every one of the 52 fighters gets both grammars
> with no exceptions."*

**Neither reference has this.** BFP has flight and a melee its own lead coder wanted replaced
(`pw-bfp-source.md:519`, §8.4 — *"there is no dash, no wall-jump, and no melee combo system"*;
`pw-bfp-source.md:611` puts BFP's melee on the **do not adopt** list). JKA has a ground grammar and
**no player flight at all** — `pm_flightfriction` is declared and wired to nothing in JKA
multiplayer (`openjk.md:1809`), `PM_FLOAT` is only ever set by being **force-gripped**
(`openjk.md:1822`), and `FLY_NORMAL` is hard-gated against real players (`openjk.md:1826`). The
verdict is stated outright at `openjk.md:1837`: *"Jedi Knight had the same lever Bid For Power
pulled and did not pull it."*

So there is no source to copy for the seam itself. Everything below is ours, and the only defence
against inventing badly is that **every mechanism in it already exists in this engine** and is cited.

⚠ **And the seam is not a small feature.** It is the load-bearing member: if the boundary is
mushy, the thesis reads as one mode with an altitude-dependent bug, not two grammars. The five
things that decide it are all in this document — the state machine, what carries, how it is read
without text, the failure modes, and the measurable that proves seamlessness.

---

## 1. THE ONE DEFECT THAT MAKES THE THESIS UNBUILDABLE TODAY

**`f.flying` stays `true` while a fighter rests on the PowerWorld floor.** `entity.js:1450`:

```js
if (this.flying && !this.flyHeld && !this._openSky && (this.descendHeld || this.flightTier <= 1)) this.flying = false;
```

The `!this._openSky` is correct and was added for a good reason (the comment at `:1447-1449`: a
`flightTier <= 1` fighter would be ejected from flight every time they stopped climbing, and in a
dimension where everyone flies that ejects RAGE and SARGE constantly). But its consequence is that
**there is no exit from flight mode in PowerWorld at all**, and `flying` is the proxy nine systems
use for "is this fighter in the air". `aaa-00-ground-truth.md:124-135` enumerates them; reproduced
here because every one is a hole the ground grammar falls through:

| reader | line | what is wrong on the PowerWorld floor |
|---|---|---|
| `grounded` getter | `entity.js:290` | returns **false** while standing on the floor |
| `move()` air multiplier | `entity.js:1578` | ground speed uses the **air** multiplier |
| footsteps | `entity.js:1427` | `!this.flying && this.grounded` — **the footstep layer is silent in PowerWorld** |
| `coneFoe` vertical rule | `game.js:2151` | the 3-D distance rule applies instead of the ±10u deck rule |
| `resolveBodies` | `game.js:1636` | two fighters standing on the floor **do not collide** |
| `updateSpacingRings` | `game.js:482` | `!p.flying` → **the spacing overlay never appears in PowerWorld** |
| drag class | `entity.js:1412` | `glide` is true → drag 1.8, not 6 → **you skate on the floor** |
| the player move basis | `game.js:3243` | camera-relative 3-D movement **while standing** |
| flight pose | `entity.js:1824` | prone/banked pose driven by velocity **while grounded** |
| cruise + afterburner | `entity.js:1580-1585` | inside `if (this.flying)` — **the burner can be lit on the floor** |

**Nine consumers, one broken predicate.** Note the shape of it: the ground grammar does not need to
be *built* to be broken — it is already broken for systems that have shipped and work everywhere
else. The footstep silence is the clearest tell. `entity.js:1425-1437` plants real recordings on the
run cycle's sine zero-crossings; it is the single best "your feet are on the ground" cue in the
engine and **it has never once fired in PowerWorld.**

⚠ `aaa-00-ground-truth.md:727-731` states the rule this forces:

> *"Any rule of the form 'on the ground, do X' cannot use `f.flying` or `f.grounded` as written. …
> If the ground grammar needs a real state, it needs a real flag — and per the `_openSky` naming
> lesson (`game.js:228-232`), a **new** one, not a fifth meaning on that."*

This document is that flag.

---

## 2. `f.gait` — THE STATE FIELD

**One field, six values, one writer, computed every frame for every fighter in every mode.**

```js
// core/util.js — beside BANDS and PW_KB, for the same reason: entity.js and game.js both read it
// and neither may import the other's consumers.
export const GAIT = {
  GROUNDED: 'grounded',   // your feet are on a surface and the ground grammar owns you
  LIFT:     'lift',       // leaving it — the air grammar already owns input, the body is catching up
  AIRBORNE: 'airborne',   // free in three dimensions; the air grammar owns you
  STOOP:    'stoop',      // a committed descent under your own power (descend + a direction)
  SETTLE:   'settle',     // arriving under your own power — the ground grammar already owns input
  CRASH:    'crash',      // arriving because someone put you here
};
export const GAIT_OWNER = {                 // WHICH GRAMMAR OWNS INPUT — never null, see §4
  grounded: 'ground', settle: 'ground',
  airborne: 'air', lift: 'air', stoop: 'air',
  crash: 'none',                            // the ONLY 'none', and it is stagger, not a transition
};
```

Names chosen to describe what the fighter *is doing*, not which system is running — the same rule
`game.js:229-232` states for `_openSky` (*"a flag whose name describes a single side effect is a
flag someone will later add a fifth unrelated meaning to"*). `STOOP` is falconry's word for the
committed dive at prey; it is a real state because it is where the dive punch lives
(`melee.js:49`, `_momDive`) and because the engine already computes it (`entity.js:1323-1328`,
`this._diving`).

⚠ **`gait` is a NEW field. `_openSky` keeps its four existing meanings exactly**
(`game.js:228-232`: nothing docks you, nothing sags, no ceiling, everyone can fly). `gait` is not a
fifth. The two are orthogonal: `gait` describes a fighter's relationship with the floor and is
correct in the city too; `_openSky` describes which dimension the fighter is in.

⚠ **`gait` is not a new source of truth about position.** It is DERIVED from state the engine
already computes (`pos.y`, `groundY`, `onBlock`, `flying`, `flyHeld`, `descendHeld`, `launchT`,
`_mvT`). If `gait` and the physics ever disagree, the physics is right and `gait` has a bug.

### 2.1 Where it is computed — and the trap that decides the placement

**In `Fighter.update`, AFTER the input fields have been written for this frame and BEFORE
`_physics` runs.** `_physics` is called from `update` (`entity.js:1204`); `flyHeld` / `descendHeld`
/ `moveDir` are written by `controlPlayer` (`game.js:3316-3319`), `controlBot`, `controlPad` or
`controlRemote`, all of which run earlier in `game.update`.

⚠ **THIS PLACEMENT IS NOT A PREFERENCE. IT IS THE `_openSky` BUG, PRE-EMPTED.**
`entity.js:1333-1340` is the record:

> *"I first put this test at the TOP of the chain, which swallowed `flyHeld` and `descendHeld`
> whole: in PowerWorld you could no longer rise or sink at all… Robert found it in about a minute
> — 'they don't seem to fly anymore… it's like only able to fly straight.' My test had PASSED
> because it wrote `pos.y` directly and never drove the ascend input… **A flag that changes what
> happens when you RELEASE a button must live where the release is handled, not in front of the
> button.**"*

`gait` changes what happens on release in both directions. It must therefore be **read** by the
flight chain, never **tested in front of** it, and it must be **computed after** the inputs it
reads. One function, one call site:

```js
// entity.js — called at the top of _physics, before the grapple/hang/flight chain at :1207
_updateGait(dt) { … }
```

---

## 3. THE STATE MACHINE

### 3.1 The transition table

Every trigger is a predicate over fields that already exist. `CLEAR = this.radius` (2.2 for every
fighter, `entity.js:185` — see §3.3 for why that number and not an invented one).
`aloft = this.pos.y > this.groundY + 0.01 && !this.onBlock`.

| # | from | to | trigger | duration | cancels |
|---|---|---|---|---|---|
| T1 | `GROUNDED` | `LIFT` | `flying` went true this frame (either takeoff door: `toggleFlight` `entity.js:294-312`, or the ascend rising edge `entity.js:1249`) | ends on `pos.y - groundY > CLEAR`, hard timeout **0.30s** | KO · `frozenT > 0` · `grabbedBy` · a `_grapple`/`hanging` claim (they own the chain above flight, `entity.js:1210,1234`) |
| T2 | `LIFT` | `AIRBORNE` | clearance reached, or timeout | instant | — |
| T3 | `LIFT` | `GROUNDED` | `flying` went false again before clearance (the player cancelled) | instant | — |
| T4 | `AIRBORNE` | `STOOP` | `descendHeld && (\|_mvX\| > 0.2 \|\| \|_mvZ\| > 0.2)` — **exactly the engine's existing power-dive predicate**, `entity.js:1323` | while held | releasing descend · releasing the stick · `staggerT > 0` |
| T5 | `STOOP` | `AIRBORNE` | the predicate goes false | instant | — |
| T6 | `AIRBORNE`/`STOOP` | `SETTLE` | ground contact (`entity.js:1441`) with **`launchT <= 0`** | `max(0.10, this._landT)`, ≤ **0.26s** | being hit and launched again mid-settle → `CRASH` |
| T7 | `AIRBORNE`/`STOOP` | `SETTLE` | ground contact with `launchT > 0` but `impact >= -38` — *pushed into the floor gently* | as T6 | — |
| T8 | `AIRBORNE`/`STOOP`/`GROUNDED` | `CRASH` | ground **or wall** contact with `launchT > 0` **and** `impact < -38` — i.e. exactly the condition that already calls `_slam` (`entity.js:1456`, `:1481-1482`, `:1507`, `:1536`) | `staggerT` (whatever `_slam`'s `takeDamage` produced) | — |
| T9 | `SETTLE` | `GROUNDED` | timer elapses | instant | — |
| T10 | `SETTLE` | `LIFT` | takeoff during the settle ramp (**allowed** — see §5.2, the no-eaten-input law) | instant | — |
| T11 | `CRASH` | *the intent you had* | `staggerT <= 0` | instant | — |
| T12 | any | `GROUNDED` | `state === 'ko'` → on respawn | — | — |

### 3.2 T11 IS THE MOST IMPORTANT ROW IN THE TABLE

**`CRASH` does not go to `GROUNDED`. It returns you to whichever grammar you were in.**

This is not a new idea; it is `entity.js:1444-1450` generalised. That comment is the fix for a
documented shipped bug:

> *"land + exit flight only when you MEANT to come down (holding descend) or you're a clumsy tier-1
> flier sagging out. A knockback/beam-shove dipping you to the floor no longer silently cancels
> flight MODE — that read as 'flight randomly turns off'."*

The rule stated as a law: **an involuntary arrival never changes grammar.** Getting spiked into the
ground already costs you the slam damage (`entity.js:809-816`, up to 32) and `staggerT`; taking your
moveset away on top of that is punishing the same event twice, and it makes the ground read as a
penalty box rather than as the other half of the game.

Implementation is one line, because `flying` is already preserved through a slam — `_slam` does not
touch it and neither does `takeDamage`. `CRASH` therefore only has to **not** write `flying`, which
is the default.

⚠ The exception, and it is worth stating so nobody adds it later: `_ko()` (`entity.js:783`) sets
`this.flying = false` explicitly, which is correct — a corpse does not have a grammar. T12.

### 3.3 The durations are DERIVED, not chosen

**LIFT.** The clearance is `this.radius` — 2.2u, `entity.js:185`, and it is the only linear
dimension every one of the 52 fighters shares. *You are a body-radius clear of the floor* is a
statement about the world, not a tuning number. Its resulting duration falls out of physics already
in the engine:

- **Tap takeoff** (release ascend immediately): `vel.y = FLY_TAKEOFF = 19` (`entity.js:30, :1251`)
  then the open-sky coast branch `vel.y *= exp(-AIR_DRAG·dt)` with `AIR_DRAG = 1.8`
  (`entity.js:29, :1348`). Closed form `y(t) = (v₀/k)(1 − e^{−kt})` → **t = 0.130s** to reach 2.2u.
- **Held ascend**: `vel.y = damp(vel.y, FLY_RISE, 7, dt)` with `FLY_RISE = 46` (`entity.js:1307`) →
  `v(t) = 46 − 27e^{−7t}`, `y(t) = 46t − (27/7)(1 − e^{−7t})` → **t = 0.086s**.

So LIFT is **0.086–0.130 seconds** and nobody picked it. The 0.30s timeout exists for exactly one
reason and it is not feel: a fighter who takes off with a ceiling or an interior slab 1u overhead
would otherwise sit in LIFT forever. It is a stuck-state guard, and it should be asserted as one
(§8, M3b) rather than tuned.

**SETTLE.** Reuse `_landT`, which already exists and is already derived from arrival speed
(`entity.js:1452`):

```js
this._landT = Math.min(0.26, -impact * 0.006);   // knee-crouch on a hard landing
```

`SETTLE` duration = `max(0.10, this._landT)`. ⚠ **`_landT` is only written when `impact < -30`**
(the gate at `entity.js:1451`), so a plain descend arrival at `-FLY_SINK` = −26 never writes it and
falls to the **0.10s floor** — which is correct: a soft touchdown should be the shortest one. A stoop
arrival (`-FLY_SINK · 1.35` = −35.1, `entity.js:1325`) gives **0.211s**; anything at or past −43.3
caps at **0.26s**. **A harder arrival takes longer to recover from, and the
knee-crouch you can already see is the timer.** No new number, and the pose and the state cannot
desynchronise — which is JKA's own architectural principle: *"they cannot desynchronise from the
move and work at any playback speed"* (`openjk.md:2144`, §7.4, on `backDist`/`viewDip` being
triangle envelopes over the animation's own remaining time).

**CRASH.** Not a duration of its own — it is `staggerT`, produced by `_slam`'s `takeDamage` call
(`entity.js:814`). Inventing a second timer beside `staggerT` would be two rules about one fighter,
and this repo has paid for that three times already (`entity.js:1294-1301`: the orbit route, the
ceiling clamp, the band-3 deck).

### 3.4 What the machine looks like

```
                       ┌──────────────────────────── T11 (staggerT ≤ 0, → prior intent)
                       │
                   ┌───▼───┐
        ┌─T8──────▶│ CRASH │◀──────T8──────┐        T8: contact, launchT > 0, impact < −38
        │          └───────┘               │            (ground OR wall — same _slam gate)
        │                                  │
   ┌────┴─────┐   T1 ──▶  ┌──────┐  T2 ──▶ ┌──────────┐   T4 ──▶  ┌───────┐
   │ GROUNDED │           │ LIFT │         │ AIRBORNE │           │ STOOP │
   └────▲─────┘   ◀── T3  └──────┘  ◀───── └──────────┘  ◀── T5   └───────┘
        │                                       │                      │
        │ T9                                    │ T6/T7                │ T6/T7
        │              ┌────────┐               │                      │
        └──────────────│ SETTLE │◀──────────────┴──────────────────────┘
                       └────────┘
                            │ T10 (takeoff during the ramp — ALLOWED)
                            └──────────────────▶ LIFT
```

---

## 4. THE HANDOFF LAW — how a transition can be a ramp and still eat nothing

**The single design decision this document exists to make:**

> **INPUT OWNERSHIP CHANGES ON ONE FRAME EDGE. PRESENTATION RAMPS AFTER IT.**
>
> A transition state belongs, for input purposes, to the grammar it is going **to** — from its very
> first frame. `LIFT` is air. `SETTLE` is ground. There is no frame in which neither grammar owns
> the controls, and no transition ever refuses an action that its destination state would allow.

That is what `GAIT_OWNER` (§2) encodes, and it is why the table has no `null` — except `CRASH`,
which owns nothing because it is **stagger**, a refusal the engine already has and already
communicates (`melee.js:30` `canAct`, `abilities.js:16` `ready`). `CRASH` invents no new refusal.

Three corollaries, each of which is a bug this repo has already shipped once:

**4a. A TRANSITION MAY NEVER WRITE `staggerT`.** `feedSlot` (`game.js:45-49`) blanks `pressed` and
`held` while `busy`, and `busy` (`game.js:3344`) includes `staggerT > 0`; `abilities.ready()`
(`abilities.js:16`) refuses on `staggerT > 0`; `melee.canAct` (`melee.js:30`) refuses on it. Writing
`staggerT` for a landing would silently disable **every power and every strike** for 0.26s at every
touchdown — a control that stops responding with no visible cause, which is precisely the class of
defect `hud: 'boxing'` was (a per-frame throw presented as "the bar is blank").

**4b. A TRANSITION MAY NEVER WRITE `hitstop`.** Same choke points, plus `entity.js:1571` (`move()`
returns early on `hitstop > 0`). And ⚠ `opts.hitstop ?? 0.04`, never `||` (`entity.js:701`) — if a
future transition ever routes through `takeDamage` (it should not), a deliberate 0 must survive.

**4c. A TRANSITION MAY NEVER ZERO `strikeActive` OR `_heavyT`.** `melee.update` (`melee.js:232-271`)
resolves the active window and applies the damage from it; zeroing it mid-swing deletes the hit with
no error. And `strikeActive` must stay clamped at zero (`melee.js:237`) — a negative timer is
truthy, and letting it settle at `−0.01` once silently killed the entire bot melee mixup
(`aaa-00-ground-truth.md:257`, and CLAUDE.md's §45 record: **1 swing in 20s → 46 in 30s** after the
fix).

---

## 5. WHAT CARRIES AND WHAT DROPS

The default is **carry**. Anything dropped must justify itself, because a boundary that resets
things is a boundary the player learns to fear.

### 5.1 CARRIES — and why

| thing | where it lives | why it must carry |
|---|---|---|
| **velocity, all three axes** | `entity.js:1421` | The body did not change. Only the **drag class** changes (`entity.js:1417`: glide 1.8 → walking 6.0). ⚠ **Never zero `vel` on a transition.** `momentumMult` (`melee.js:14-17`) reads `\|vel\|` and gives ×2.5 at 58 u/s — carrying a swoop's speed into a landing punch is the whole reason the dive punch exists (`melee.js:254`). |
| **`aim3`** | `game.js:3194` | Trivially continuous **and this is structural**: under the thesis the camera never changes hands, so the aim source is the same ray in both grammars. ⚠ This is only true once the parallax bug is fixed — see §5.4. |
| **`game.hardLock`** | `game.js:1589-1620` | It is a **game** field, not a fighter field. Dropping it on a landing would mean every touchdown loses your target, and `cycleLock`'s captured ranking (`game.js:1600-1607`) would re-rank against a moved camera. Proposed ruling R1, §10. |
| **`launchT`** | `entity.js:716, :837` | ⚠ **Load-bearing.** It is the sole gate on `_slam` (`entity.js:810`), on the drag class (`:1400`), on the walk-clamp exception (`:1609, :1616`) and on `game.intercept` (`game.js:2101`). A transition that cleared it would make being launched into the ground **harmless** and would delete the chase loop. |
| **hp · ki · `_wounds` · bleed · `_dots` · `stunT` · `frozenT` · `_burst`** | `takeDamage`/`update` | None of these are grammar. They live at the choke point and no transition may reach into it. |
| **ability charge state** (`slots[k].chargeT`, `.charging`, `.sustainT`) | `abilities.js` | A charge is a paid resource commitment. Cancelling it on a landing makes the ground a punishment, which inverts the thesis. |
| **`meleeCharge`** | `melee.js:64-102` | Carries on `LIFT` — winding up on the ground and taking off with it **is** the dive-punch setup. It already drops on `CRASH` for free: `chargeUpdate` cancels entirely when `canAct` goes false (`melee.js:70`), and `staggerT` makes it false. **No new rule.** |
| **guard** (`guarding`, `guardMeter`) | `melee.js:169-180` | ⚠ Guard is deliberately **not** gated on `canAct` (`melee.js:174-176` — gating it on hitstop meant any fast combo stripped a held block). A transition must not become the tenth thing that drops a guard. |

### 5.2 DROPS — and why each one earns it

| thing | where | why it drops | on which edge |
|---|---|---|---|
| **`comboWin`** (and therefore `strikeIdx`) | `melee.js:268` | The combo index selects **which strike** plays and at what reach (`melee.js:239`: jab 11 → jab 11 → cross 9). Per `openjk.md:2182` (§7.5) *"presentation MAY decide what is offered"* — the two grammars are allowed different movesets, so carrying an index across means hit 3 of a **ground** chain follows two **air** hits with different reach and frames. Drop it; the chain restarts in the grammar you are now in. One line. | T2, T9 (both directions) |
| **`_swoop`** | `game.js:3272-3278` | The latched pass-through heading is an **air** heading, latched from the arrival velocity. A stale one resumed on a re-takeoff steers you along a line you flew ten seconds ago. It already nulls when the lock changes; it must also null on ground contact. | T6, T7, T8 |
| **`_diving`** | `entity.js:1327-1328` | It is `STOOP`'s own flag; `STOOP` has ended. | T5, T6, T7, T8 |
| **`cruiseHeld` / `_burnT`** | `entity.js:1580-1585`, move() | The afterburner is a **flight** system with a 14 ki/s bill (CLAUDE.md §15). It is inside `if (this.flying)`, which is why it currently can be lit on the PowerWorld floor. Fixed for free once `GROUNDED` implies `flying === false`. ⚠ `_burnLoop` is a **sustained audio handle** — it must be `.stop()`ed, not merely abandoned (the loop law, CLAUDE.md §20; `_ko` already does this at `entity.js:797`). | T9 |
| **`_climbBand` / `_deckSnap`** | `entity.js:1312, :1362` | Deck bookkeeping. Meaningless on the floor and stale on the next takeoff. | T9 |

### 5.3 UNDECIDED — one item, and it is a real design question

**Does landing cost you the air's `strikeCd`?** i.e. is touching down a *reset*?

Arguments for: it would make deliberately touching the floor a tactical option rather than a
consequence, which is the thesis working. Arguments against: it is a refund, and a refund at a
boundary teaches the player to bounce off the floor to cancel recovery — exactly the degenerate loop
JKA refuses by making commitment absolute (`openjk.md:2237`: *"`weaponTime = torsoTimer` — you
cannot act until the animation ends, full stop. There is no cancel window and recovery frames do
not exist as a separate concept"*).

**Proposal: NO refund.** `strikeCd` carries untouched. `SETTLE` gates nothing at all. The reason to
land is the **grammar** — a different moveset, guard that works, the `def.art` styles — not a
mechanical discount. Flagged as ruling R4, §10.

### 5.4 ⚠ THE PARALLAX BUG IS A PREREQUISITE, NOT A SEPARATE TASK

`game.js:3172-3175` builds the aim point from the **camera's direction** applied at the **player's
position** — two parallel rays from different origins, which never converge.
`aaa-00-ground-truth.md:436-446` and `openjk.md:2045` (§7.1, *"fix this first"*) have the writeup:
`chase()` puts the eye at `d·0.17` lateral and `d·0.30` above the subject (`world.js:2307-2308`), so
at a 40u chase distance the shot originates **6.8u lateral and 12u above** the crosshair's line.
**The miss is a constant 6.8u at every range, so the angular error is worst up close** — i.e. worst
exactly where the ground grammar lives.

Robert's thesis says *"the reticle never lies."* §5.1 claims aim carries across the boundary
**because both grammars share one camera and one ray**. That claim is false today. JKA's own rule,
quoted at `openjk.md:2443`: *"decide whether the shot comes from the character or the camera, and
make the crosshair agree."*

**Fix (B) from `openjk.md:2072`**: raycast from the camera through screen centre, take the first
hit, set `a3` to **that world point**. `world.screenToGround` (`world.js:1454`) already builds the
camera ray and needs only a different intersection target.

---

## 6. HOW THE PLAYER KNOWS WHICH GRAMMAR IS LIVE — with no banner

Robert's constraint: readable from **the character, the camera and the controls responding
differently**. Four channels; **three of the four already exist and are currently either broken or
unwired**, which is the cheapest possible answer.

### 6.1 THE CONTROLS — the primary channel, and it is free

This is the strongest tell and it needs no art:

- **On the ground**, the stick is 2-D and the ascend key is a **takeoff**.
- **In the air**, the stick is 3-D and **forward is where you look**, pitch included
  (`entity.js:1606-1609`, `game.js:3243-3288`).

Push forward and see whether you climb. That single fact is the grammar, and the code path split
already exists — `entity.js:1606` (`if (this.flying && this._openSky && dir.y)`) and
`game.js:3243` (`if (p._openSky && p.flying)`). Under the machine, both read `gait`.

⚠ **`entity.js:1606` has a latent path-selection bug that `gait` fixes.** The 3-D branch is gated
on `dir.y` being **truthy**; a pure strafe under an open sky yields `d3.y = fwy · 0 = 0`
(`game.js:3285`) and falls into the **2-D** branch with a horizontal-only clamp
(`aaa-00-ground-truth.md:97-99`). Correct by accident today. Gate on `gait`, not on the stick's
current contents, and the code path stops depending on which way the stick is pointed.

⚠ **And this is `openjk.md:2182` (§7.5) exercised deliberately**: *"Presentation MAY decide what is
offered… Presentation MAY NEVER decide where a hit lands."* JKA gates **four** acrobatic saber moves
on `cg.renderingThirdPerson && !cg.zoomMode` (`openjk.md:2185`, sites `bg_panimate.cpp:2366, :2447,
:3651, :3757`) — *"a somersault you cannot see is not worth having."* ⚠ And the warning that comes
with it: those are **four copies of the same compound conditional inlined at four call sites, which
is how a rule like this drifts** (`openjk.md:2199`). **One predicate: `gaitAllows(f, move)`, read at
each site.** Never `if (f.gait === 'grounded')` scattered through melee.js.

### 6.2 THE CHARACTER — three tells, all built, one currently silent

- **Footsteps.** `entity.js:1425-1437` plants recorded footfalls on the run cycle's sine
  zero-crossings, with a rural/urban surface split. Gated on `!this.flying && this.grounded` —
  **it has never fired in PowerWorld.** Re-gate on `gait === GROUNDED` and the ground half acquires
  its best cue for the cost of one predicate.
- **The pose.** `entity.js:1820-1836` already drives prone/pitch/bank from **travel** with an
  engagement ramp `k = clamp((|v| − 6)/20, 0, 1)`, and `p.groundRig` counter-rotates so the markers
  stay flat (`entity.js:1838-1842` — do not break that; it was a real bug). Under the machine the
  pose target becomes `pitchT · gaitBlend` where `gaitBlend` ramps 0→1 over `LIFT` and 1→0 over
  `SETTLE`. **The transition is literally visible in the spine.** The knee-crouch (`_landT`,
  `entity.js:1452`) is already the `SETTLE` timer, so pose and state cannot desync (§3.3).
- **The ring gap.** `entity.js:1875-1893`: the contact shadow stays on the ground and the `bandRing`
  floats up logarithmically, so **the gap between them is the altitude**, continuously, with no text
  and no colour ladder under an open sky (`:1888`). At `GROUNDED` the gap is zero. This is already
  the best altitude readout in the game and it needs nothing.

### 6.3 THE CAMERA — the grammar changes the frame's SHAPE, asymmetrically

`chase()` (`world.js:2242-2327`) already rides FOV on speed (58 → 74, `:2248`) and distance on speed
(`+k·16`, `:2287`). What it does **not** do is know which grammar is live.

Proposal — two coefficients, both already present as literals:

| | air | ground |
|---|---|---|
| eye lift | `d · 0.30` (`world.js:2308`) | lower — the ground fight is read across, not down onto |
| shoulder offset | `d · 0.17` (`world.js:2307`) | tighter |
| distance floor | `clamp(…, 24, 86)` (`world.js:2287`) | a smaller floor — a clinch at 24u is already close |

⚠ **The ramp between them must be ASYMMETRIC.** `openjk.md:2144` (§7.4): Force Speed's camera has
*"a 1000ms ease in and a 500ms ease out — the ramp out is twice as fast, so the power snaps off"*,
and `openjk.md:2260` (§7.7) says to steal exactly this: *"a power that ramps its frame in over ~1s
and snaps back in ~0.5s reads as ending, where a symmetric ease reads as drifting."*

Here: the camera opens out over `LIFT` **+ 0.6s** (slow — leaving the ground is a commitment), and
closes in over **0.30s** (fast — *the ground caught you*). 2:1, JKA's own ratio.

⚠ **`damp()` cannot express this** — it is symmetric by construction (`openjk.md:2266`). It needs an
explicit envelope value, exactly as JKA has.

⚠ **And the camera may never rotate the movement basis** (`openjk.md:2176`): JKA's camera orbits a
full 360° while movement stays keyed to `viewangles`, never to the camera. Our air basis reads the
camera on purpose (`game.js:3279-3283`) and that is fine — but a *transition flourish* must not, or
the controls invert mid-landing.

### 6.4 AUDIO — and one thing that is not built

Already there: the takeoff `audio.zap(560)` + `_liftFx` (`entity.js:1252-1253`), `audio.land(power,
body, pos)` typed by what the fighter is made of (`entity.js:1454` — metal clangs, flesh thumps,
energy barely lands), the footstep layer (§6.2), the afterburner sustain loop (`_burnLoop`).

⚠ **Not built and not claimed:** an air-vs-ground ambience layer. `soundscape.sustain` exists and the
loop law is documented (CLAUDE.md §20), but there is no wind bed keyed to airspeed. Listed as a
`SETTLE`/`LIFT` polish item, not as part of the machine.

### 6.5 ⚠ WHAT NOT TO ADD

**No mode banner. No HUD word. No icon that says AIR or GROUND.** The four channels above are the
answer, and this project's own record says a surface stating a fact is worse than a surface deriving
one — `game.js:185-190`: the city nameplate reading *"TRANQUILITY REACH · THE MOON"* while standing
on a rock spire in PowerWorld is the exact failure. If the grammar is not readable from the
character, the camera and the controls, adding text does not fix it, it hides it.

---

## 7. THE FAILURE MODES — each one has already happened in this engine

### F1 — A knockback dipping you to the ground must not cancel flight
**History:** `entity.js:1444-1450`, and it read to Robert as *"flight randomly turns off."*
**Design:** T11 (§3.2). An involuntary arrival never changes grammar. `CRASH` returns to the intent.
**Assertion:** M5, §8.

### F2 — A landing must not eat an input
**History:** the `_openSky`-tested-before-the-input-branch bug (`entity.js:1333-1340`) — *"only able
to fly straight"* — and, in a different system, the const-read-49-lines-before-its-declaration in
`controlPlayer` that threw every frame while downed so **you could not get up** (CLAUDE.md §45,
1,800 throws in one duel, invisible behind the frame try/catch).
**Design:** the handoff law (§4) and its three corollaries — no transition writes `staggerT`,
`hitstop`, or zeroes `strikeActive`/`_heavyT`. `SETTLE` gates **nothing**. T10 exists specifically
so a takeoff during the settle ramp is legal.
**Assertion:** M2 and M7, §8. ⚠ M7 must go through real key events; a stubbed `controlPlayer` kills
held input entirely (CLAUDE.md, the melee feel pass: three runs produced no punch at all).

### F3 — A takeoff mid-combo must not strand an animation
**History:** the haymaker that never reached the impact frame because `melee.js` passed only
`strike: true` (CLAUDE.md §"melee feel pass"); and `strikeActive` settling at `−0.01`.
**Design:** §4c. Transitions never touch swing timers; `melee.update` resolves them wherever the
body is. Checked case: `_heavyT` is a **0.12s** travel window (`melee.js:101`) resolving against
`STRIKES.power.reach` = 7 (`melee.js:110`); a `LIFT` at `FLY_TAKEOFF` 19 u/s moves the caster 2.3u
in that window — inside reach, so the heavy still lands. **Do not "fix" this by cancelling heavies
on takeoff; the flying haymaker is the feature.**
**Assertion:** M8, §8 — start every strike variant, transition mid-window, assert the hit still
resolves and `strikeActive` never goes negative.

### F4 — A new flag tested in front of a button swallows the button
**History:** `entity.js:1333-1340`, verbatim.
**Design:** §2.1 — `gait` is computed after inputs, read by the flight chain, never in front of it.
**Assertion:** M2 measures ascend/descend responsiveness in every gait; a swallowed input shows as a
latency > 1 frame.

### F5 — Two rules about one fighter must agree
**History:** the flight lid, three times over — the deck servo vs the orbit route
(`entity.js:1287-1293`), the ceiling clamp, and the band-3 deck at 684u
(`entity.js:1294-1301`). Each was a rule that had to learn the same exception.
**Design:** every current reader of `flying`-as-a-ground-proxy (the ten in §1) moves to `gait` in
**one** loop, not incrementally. A half-migrated predicate is F5 by construction.
**Assertion:** M6 (city unchanged) + a grep gate: no combat-path file may test `f.flying` as a proxy
for "in the air" after Loop 2.

### F6 — Verified green and unreachable
**History:** the low-orbit ceiling *"SOL through at 373"* measured by **setting** the altitude; the
open-sky flight bug whose harness wrote `pos.y`; the vacuous `[].every()` that went green on an
empty chip list (CLAUDE.md, THE SLOT SAYS WHAT IT IS).
**Design:** the harness never writes `f.gait`. It drives `KEYMAPS[SETTINGS.scheme].up/down` through
`input`, and it proves itself first (§8, M0).

### F7 — State that outlives its match
**History:** `clearTransients` (`game.js:1717`) is the one place that empties the board, and
`aaa-00-ground-truth.md:622-626` records that it restores `BANDS`, `fov`, the stage and the body
class **but does not clear `_openSky`/`_chaseKb` off entities** — safe today only because the three
reset paths empty `this.entities` immediately after.
**Design:** `gait` is a fighter field, so it inherits the same accidental safety and the same
latent trap. Fix both together: clear `_openSky`, `_chaseKb` **and** `gait` in `clearTransients`.
**Assertion:** M6c — after a PowerWorld match, 0 entities carry a non-`GROUNDED` gait into a city
duel. (The existing `pwSuite` already asserts the `_openSky`/`_chaseKb` half —
`docs/POWERWORLD.md:667`+.)

### F8 — The transition becomes a damage source
**Design:** `_slam`'s `launchT` gate (§9) is the law and must not be relaxed. A `SETTLE` can never
call `_slam` because T6/T7 select `SETTLE` precisely when `_slam` would refuse.
**Assertion:** M4b — dive at terminal velocity under your own power, 500 times, 0 damage.

---

## 8. INTERACTION WITH WHAT ALREADY EXISTS

### 8.1 `entity._physics` flight branch — the order is load-bearing, and `gait` does not reorder it
The chain at `entity.js:1207` is: `_grapple` → `hanging` → takeoff edge → release-while-aloft →
`if (this.flying)` five-way branch → gravity. `gait` **reads** this chain's outcome and **is read
by** the systems downstream of it. It does not insert a branch. Specifically:

- `_grapple` (`:1210`) and `hanging` (`:1234`) both force `flying = false` and own the axes. They
  are neither `GROUNDED` nor `AIRBORNE`; treat them as **owning the gait**: while either is set,
  `gait` holds its previous value and no transition fires. They already suspend the deck servo and
  gravity, and they are the precedent for how a claim on the body is expressed here.
- The takeoff edge at `:1249` is T1's trigger. The engine has **two takeoff doors** —
  `toggleFlight` (`:294-312`, the F key) and the ascend rising edge (`:1249`) — and
  `:1246-1248` records that gating only one of them meant *"RAGE could be granted flight by the
  toggle and still not get off the floor with the ascend key."* **T1 must be triggered by the
  `flying` field going true, not by either door**, or the same bug returns in a new place.

### 8.2 The deck servo — out of scope in PowerWorld, and `gait` must not break it in the city
Branch (f) at `entity.js:1350` never runs under `_openSky`, so the servo and the machine never meet
in PowerWorld. In the **city** the servo is a sub-state of `AIRBORNE` and `gait` must be inert
there: `AIRBORNE` covers docked-on-a-deck, in-transit-between-decks, and free levitation below
`BANDS.ground` alike. **`gait` does not subdivide flight.** M6 asserts the servo still docks.

### 8.3 The four-band ladder
`bandOf`/`BANDS` (`core/util.js:52-57`) is an **altitude** classification; `gait` is a **contact**
classification. They are orthogonal and must not be merged — ⚠ note `core/util.js` already exports
`bandOf` for altitude and `data/scale.js` exports `rankBandOf` for strength, and CLAUDE.md records
that importing the wrong one is a duplicate-declaration SyntaxError that takes the page down. Do not
add a third "band". `gait` is the word.

### 8.4 `launchT`
Read-only from the machine's point of view, and it is the **input** to T6/T7/T8. Armed at
`entity.js:716` (`|kb_horizontal| > 30` or `|opts.launch| > 12`), also written directly at
`melee.js:217` (aimed throw, 1.35s) and `projectiles.js:946` (beam pressure ladder). Duration
`_chaseKb ? PW_KB.window (2.6s) : 1.1s`. Decremented `entity.js:837`.
⚠ **The machine must never write `launchT`.** Three systems arm it; a fourth would be the fourth
place that has to learn a rule.

### 8.5 The ceiling clamp
`entity.js:1462` — does not run under `_openSky`. No interaction: it is a lid above `AIRBORNE` and
the machine has nothing to say about it. ⚠ Do not add a `gait` test there; that would be a fourth
site of the same exception (F5).

### 8.6 `_slam` — see §9, it is the whole answer to the intentional-landing question

### 8.7 `melee.js`
⚠ `grep -n "_openSky\|_chaseKb\|powerworld" src/engine/melee.js` returns **nothing**
(`aaa-00-ground-truth.md:220`). Reach, frames, damage, hitstop, step-in, clinch and throw are
byte-identical in both worlds. That is the gap the ground grammar fills, and `gait` is the field it
fills it through — via **one predicate** (`gaitAllows`, §6.1), never a scattered condition.
⚠ And `melee.js` imports from `entity.js` (`melee.js:5`), never the reverse — do not create that
edge. `gait` lives in `core/util.js` for exactly that reason, beside `BANDS` and `PW_KB`
(`core/util.js:88-92`).

### 8.8 `coneFoe` — the vertical rule reads the gait, and it is currently a coin toss overhead
`game.js:2151-2153`:
```js
if (caster.flying && f.flying) { if (Math.hypot(d, dy) > range) continue; }
else { if (d > range) continue; if (dy > 10) continue; }
```
⚠ Two defects, both documented at `aaa-00-ground-truth.md:337-343`: the arc test is **2-D and uses
`caster.aim`, which has no Y**, so a foe directly overhead gives `d ≈ 0` and `dx/(d||1)` is
numerically unstable — *there is no vertical arc at all*. And the `dy > 10` deck gate applies
whenever **either** party is not `flying`, which in PowerWorld is currently almost never.
**Under the machine** the branch selects on `GAIT_OWNER` of both parties: two air fighters get the
3-D rule, anything touching the ground gets the deck rule. That is the correct reading and it is a
one-line change — but **the missing vertical arc is a separate defect and belongs to the combat
spec, not here.** Flagged, not claimed.

### 8.9 `world.punch()` is inert behind the chase camera
`world.js:1299` writes `frustumTarget`, and `_applyProj` reads `frustum` **for orthographic cameras
only** (`world.js:2199-2201`). Every `world.punch()` call in `melee.js:125, 158, 220` and in
`game.js` does **nothing** in PowerWorld (`aaa-00-ground-truth.md:405-408`). If the transition wants
an impact zoom on a hard `CRASH`, it needs a **perspective-side FOV kick**, not a call to the
existing function. ⚠ And that kick belongs in the same envelope machinery as §6.3, not as a second
camera channel.

---

## 9. THE INTENTIONAL LANDING vs BEING DRIVEN INTO THE GROUND

**The engine already answers this correctly and the answer must not be regressed.**
`entity.js:809-816`:

```js
_slam(game, speed, kind) {
  if (!game || this.launchT <= 0 || this._slamCd > 0 || this.state === 'ko' || speed < 30) return;
  this._slamCd = 0.45;
  const dmg = Math.min(32, (speed - 22) * 0.5);
  const src = this.lastHitT < 3 ? this.lastHitBy : null;
  this.takeDamage(dmg, { src, slam: true, unblockable: true, hitstop: 0.1 });
  if (game.onSlam) game.onSlam(this, dmg, kind);
}
```

**Four gates, and `launchT > 0` is the one that matters.** `launchT` is armed *only* by being hit
hard enough (`entity.js:716`), by being thrown (`melee.js:217`) or by the beam pressure ladder
(`projectiles.js:946`). So:

> **You can dive into the floor at the terminal `vel.y` clamp of −160 (`entity.js:1419`) under your
> own power and take exactly zero damage. Somebody else has to have put you there.**

CLAUDE.md states the law directly: *"dashing/flying into walls yourself NEVER hurts."*
`_slamCd = 0.45` debounces; `speed < 30` floors it; `onSlam` credits the **launcher**, not the
victim.

### 9.1 What the machine adds on top

| arrival | `launchT` | impact | gait | damage | who is blamed |
|---|---|---|---|---|---|
| a controlled descend | 0 | −26 | `SETTLE` (0.100s — the floor) | 0 | — |
| a full `STOOP` | 0 | −35.1 | `SETTLE` (0.211s) | 0 | — |
| a terminal-velocity dive | 0 | −160 | `SETTLE` (0.26s, capped) | **0** | — |
| shoved into the floor gently | > 0 | −20 | `SETTLE` — **T7** | 0 (`speed < 30`) | — |
| spiked into the floor | > 0 | −38…−160 | **`CRASH`** | ≤ 32 | `lastHitBy` |
| hurled into a wall | > 0 | any, `speed ≥ 30` | **`CRASH`** | ≤ 32 | `lastHitBy` |

**T7 is the row that matters and it is F1's row.** A fighter pushed to the floor by a beam
(`projectiles.js:946` arms `launchT` on the pressure ladder's blast-off-your-feet branch) but
arriving softly gets a `SETTLE`, not a `CRASH` — no damage, no stagger, and **no grammar change**,
because `SETTLE` under T7 is reached from `AIRBORNE` with `flying` still true and T10 lets you take
straight off again. Without T7 as a distinct row, either every beam-shove crashes you (F1 returns)
or the slam threshold has to be relaxed (F8).

### 9.2 ⚠ THREE THINGS NOT TO DO HERE

1. **Do not add fall damage to the intentional landing.** It is the same design error as
   `CATCH_SPD` — modelling a thing by its speed when the real rule is about *agency*
   (`pw-bfp-source.md:490`, §8.2: *"the deeper error is that we modelled interception as catching a
   fast thing, so speed became the limiter"*). Agency is already expressed by `launchT`. Use it.
2. **Do not give `SETTLE` i-frames.** `game.intercept` (`game.js:2124`) sets `f.invuln = 0`
   explicitly with the comment *"NO i-frames: both lanes grant them by default"* — a mercy window at
   a landing would make touching the ground a defensive option and hollow out the air fight. JKA
   agrees from the other side: `openjk.md:1701` — *"A roll has NO invulnerability and no damage
   reduction… The dodge is positional, not a mercy window."*
3. **Do not let `CRASH` route to `GROUNDED`.** §3.2.

---

## 10. THE MEASURABLE — what proves it is seamless

Harness: **`src/bench/transition.js` → `LSW.transitionSuite()`**, on the pattern of
`src/bench/powerworld.js` → `LSW.pwSuite()` (`src/bench/powerworld.js:28`). Every check is a row
`{name, pass, got, want}`; the suite counts console errors; three consecutive clean runs before it
is believed.

**M0 — THE HARNESS PROVES ITSELF FIRST.** Before any assertion about a transition: a fighter under
an open sky, ascend held through the real key path, **must leave the ground** and `gait` must reach
`AIRBORNE`. If that fails nothing after it means anything. (`src/bench/powerworld.js:13-16` states
this law; the empty-`chips.every()` incident is why.)

| id | claim | measurement | pass |
|---|---|---|---|
| **M1** | **No frame is ungoverned** | 10,000 driven frames, randomised input, 2 fighters: sample `GAIT_OWNER[f.gait]` every frame for every living fighter | ∈ {`ground`,`air`,`none`} on **100.00%** of samples; `none` occurs **only** while `staggerT > 0` |
| **M2** | **A transition eats no input** | on the contact frame and each of the next 8 frames, press strike via the real key path; measure frames-from-press-to-`strikeActive > 0`. Repeat for ascend (`KM.up`), descend, guard, and one power slot | **1 frame at every offset, for every action.** Any 0 or >1 is a fail |
| **M3a** | **LIFT duration is derived, not tuned** | drive T1 both ways (tap and held), measure frames until `gait === AIRBORNE` | tap **0.130 ±0.017s**, held **0.086 ±0.017s** (one frame of tolerance); both match the closed forms in §3.3 |
| **M3b** | **LIFT cannot get stuck** | take off with a solid slab 1u overhead | `gait` leaves `LIFT` within **0.30s**, every time |
| **M3c** | **SETTLE duration equals the knee** | arrive at −26, −35.1 and −120 | SETTLE = `max(0.10, _landT)` exactly: **0.100 · 0.211 · 0.260s** (⚠ −26 is softer than the `impact < -30` gate, so `_landT` is never written and the floor is the answer); the pose ramp reaches 0 on the same frame the state does |
| **M4a** | **Momentum carries** | record `vel` on the frame before and after every gait change with input held constant | `Δv` equals the frame's `dragF` (`entity.js:1417`) and gravity alone, within **1e-3**. Any other delta is a transition writing velocity |
| **M4b** | **A self-inflicted landing never hurts** | 500 dives at the −160 clamp, `launchT = 0` | **0 damage, 0 `_slam` calls, 0 `CRASH`** |
| **M5** | **The knockback dip does not cancel flight (F1)** | 200 launches driving a flying fighter into the floor, varied `impact` across the −38 boundary | `impact ≥ −38` → `SETTLE`, `flying` still true, no damage. `impact < −38` → `CRASH`, damage ≤ 32 credited to `lastHitBy`, and after `staggerT` **`gait` returns to `AIRBORNE`** in 100% of cases |
| **M6a** | **The city is unchanged** | a city duel, 3,000 frames | every fighter's gait ∈ {`GROUNDED`,`LIFT`,`AIRBORNE`,`STOOP`,`SETTLE`,`CRASH`}; **the deck servo still docks** (the soft click at `entity.js:1362` still fires); footsteps still fire; the rung click still fires |
| **M6b** | **The city costs nothing** | batch-timed sim, render stubbed, 3,000 frames | within noise of the documented **0.680 ms/frame** (`docs/POWERWORLD.md` §15) |
| **M6c** | **Nothing outlives the match (F7)** | PowerWorld match → `clearTransients` → city duel | **0** entities carrying `_openSky`, `_chaseKb`, or a stale `gait` |
| **M7** | **Real inputs, not synthetic state** | every M2/M3/M5 driver goes through `input` with `KEYMAPS[SETTINGS.scheme]` keys | the suite never assigns `f.gait`, `f.flying` or `f.pos.y`. Grep-asserted in the suite's own header |
| **M8** | **A mid-swing transition strands nothing (F3)** | start jab / cross / haymaker / grab, force each transition inside each of `startup`/`active`/`recover` | the hit still resolves; `strikeActive` never < 0; `_heavyT` still resolves within its 0.12s window |
| **M9** | **THE BLIND READ** | screenshot matrix: 6 gaits × {air-side, ground-side} × 2 fighters, posed via the freeze-frame recipe | a reader shown a **still, with the HUD hidden**, names the live grammar correctly in **≥ 11 of 12**. See §10.1 |

### 10.1 ⚠ M9 IS NOT OPTIONAL AND IT IS NOT SOFT

`aaa-00-ground-truth.md:753` and CLAUDE.md both state it: *"Screenshots find what assertions cannot.
The stage was verified, described as having its own sky, and rendered a black void; the rubble
shipped black; the boxing ring shipped 4× too big."* And the venue's own lesson: **no assertion can
see "too dark."** M1–M8 can all pass while the transition is invisible to a human, because none of
them can see it. §6 makes a claim about *readability*; M9 is the only check that tests that claim.

⚠ Posing traps, both paid for already: **the news camera leaves a scissor rect on the renderer** —
clear scissor and viewport before a manual `world.render()` or the shot comes back black except one
corner (CLAUDE.md §42). And a **page screenshot captures the DOM**; read the drawing buffer with
`toDataURL` in the **same task** as the render (CLAUDE.md §43).

### 10.2 Harness traps specific to this feature

- ⚠ **`input.endFrame()` is called by main.js's rAF loop, NOT by `game.update()`.** A synthetic
  keydown latches forever and re-toggles flight every frame. (CLAUDE.md §46 — paid for twice.)
- ⚠ **The SCHEME owns the key.** A tab saved on BRAWLER puts fly on `KeyG`; `KeyF` presses become
  jabs. Read `KEYMAPS[SETTINGS.scheme].up` / `.down` (`core/settings.js`).
- ⚠ **`game.controlPlayer` is the documented override.** `controlPlayer` rewrites `aim` from the
  mouse **every frame**, after a test would have written it and before `coneFoe` reads it
  (`src/bench/powerworld.js:20-22`).
- ⚠ **Pick fighters by TEAM, never by index.** `entities[1]` has been the KMK 9 camera operator
  before now. (PowerWorld has no news crew — `hasCivilians` in `data/modes.js` — but the suite runs
  city cases too, for M6.)
- ⚠ **Pin both bodies to ABSOLUTE positions** for any reach-sensitive check; holding a foe at
  `player.x + gap` lets the step-in smear the measured reach 8u long.
- ⚠ **`runSlot(c, key, inp, g)` — fighter first, game last.**
- ⚠ **The phantom-module law.** Do not `import('/src/core/util.js')` to read `GAIT` or `PW_KB` —
  Vite version-stamps modules and a console import can be a **second instance**. Read `LSW.PW_KB` /
  the page's own graph.
- ⚠ **A shorter test cannot find a higher lid** (`entity.js:1299-1301`). The band-3 deck at 684u
  went undetected because the flight suite ran 620 frames and topped out at 456. M1's 10,000 frames
  is not padding.

---

## 11. THE BUILD ORDER — loops, each with a gate

⚠ **Never estimated in weeks.** The unit is a loop with a finish line (CLAUDE.md, Robert's direct
instruction). Each loop below is committable on its own and leaves the game working.

**Loop 1 — THE FIELD, WITH NO CONSUMERS.**
Add `GAIT`/`GAIT_OWNER`/`gaitAllows` to `core/util.js`; add `Fighter._updateGait(dt)` called at the
top of `_physics`; compute it for every fighter in every mode. **Nothing reads it yet.**
*Gate:* M1 + M6a + M6b + M6c green. The game is byte-identical in behaviour.

**Loop 2 — MIGRATE THE TEN PROXIES, ALL AT ONCE.**
The `flying`-as-ground-proxy readers in §1 move to `gait` in one commit (F5 — a half-migration is
the bug). This is where the PowerWorld floor becomes a floor: footsteps fire, bodies collide, the
walking drag class applies, the pose stands up, the burner cuts.
*Gate:* the §1 table re-measured, all ten correct; M6a still green; footsteps audibly fire in
PowerWorld (analyser tap, not a flag).

**Loop 3 — THE TRANSITIONS.**
T1–T12, the handoff law, the derived durations, `CRASH` returning to intent.
*Gate:* M2, M3a/b/c, M4a/b, M5, M7, M8.

**Loop 4 — THE READABLE CHANNELS.**
The pose blend, the asymmetric camera envelope (§6.3), the perspective FOV kick to replace the inert
`world.punch()` on a `CRASH` (§8.9).
*Gate:* M9, plus M1–M8 re-run (a camera change must not move a number).

**Loop 5 — THE MOVESET SPLIT.** *(hand-off — belongs to the combat spec, listed for ordering only)*
`gaitAllows(f, move)` becomes real: the ground grammar gets the `data/martial.js` STYLES, currently
**eight styles, four clinch positions, a wheel, a submission table and a rank-ratio struggle curve,
all authored, all dead, `def.art` on 0 of 52 characters** (`aaa-00-ground-truth.md:531-543`). That
is most of a Jedi-Academy ground layer already written down.
*Gate:* the combat spec's, not this one's.

**Prerequisite, sitting outside the loops: the aim parallax fix** (§5.4). `openjk.md:2045` calls it
*fix this first*, and §5.1's claim that aim carries across the boundary is false until it lands.

---

## 12. OPEN RULINGS — Robert decides, proposals given

| id | question | proposal | why it needs a ruling |
|---|---|---|---|
| **R1** | Does landing drop the hard lock? | **No.** It is a game field, not a fighter field, and dropping it re-ranks `cycleLock`'s captured order against a moved camera (`game.js:1600-1607`). | It is the single most visible carry/drop decision and it is a feel call. |
| **R2** | Does `CRASH` return you to the air grammar? | **Yes** — §3.2. It is `entity.js:1444-1450` generalised. | The alternative (spiked → grounded) is defensible as a *cost of losing the exchange*, and it is Robert's call whether the ground should ever be a punishment. |
| **R3** | Does flight cost ki? | **Not in these loops.** BFP charges `g_flightCost` **50 ki/s** and `g_boostCost` **350 ki/s** — 7× (`pw-bfp-source.md:166,168`) — and regen is blocked while boosting but **not** while flying (`pw-bfp-source.md:181`), so level flight is sustainable and boosting is not. ⚠ Both of those numbers are the reconstruction author's **own fitted values**, stated in-source as approximations (`pw-bfp-source.md:41-43`, `:541`). We charge nothing for flight and 2.6 ki/s for cruise (`entity.js:1581`). | It is a balance decision that interacts with the whole roster and it would make the transition an *economic* choice as well as a grammatical one. Out of scope here, on the record. |
| **R4** | Does landing refund `strikeCd`? | **No** — §5.3. | It is the difference between the ground being an option and the ground being a cancel. |
| **R5** | The intercept model: speed gate or reach gate? | ⚠ **Two of our own documents disagree.** `pw-bfp-source.md:490` (§8.2) says `CATCH_SPD = 132` was **invented** and the model is wrong — BFP has no speed test at all, only a 700-unit reach and a `// TELEPORT!` (`pw-bfp-source.md:242-262`); item 1 at `:564` says *"keep the range, drop the speed gate."* `docs/POWERWORLD.md:441` (§13.2) argues the catchability was *"an accident worth making deliberate."* | It touches this document because an intercept arrives *at the target's altitude* (`game.js:2118`) and therefore crosses the boundary. **Not resolved here.** |

---

## 13. ⚠ DO NOT REGRESS

Everything in this list is already correct, was paid for, and is reachable from the seam.

1. **THE CURVED BEAM.** `pw-bfp-source.md:502` (§8.3): BFP's beam is a **straight laser re-aimed
   every frame** — swinging the mouse sweeps the whole beam instantly with no turn-rate cap. Ours
   emits a packet per frame carrying the direction it was **fired** with (measured 5.7° of bend
   held, **122.1°** after a 100° sweep). `pw-bfp-source.md:598` says *"Keep our curved beam"* and
   `:611` lists the straight re-aimed beam under **do not adopt**. **We are ahead of the source
   here.**
2. **`_slam`'s `launchT` GATE.** §9. Self-inflicted arrivals never hurt.
3. **THE FLIGHT BRANCH ORDER**, `entity.js:1259-1372`. `_openSky` (branch e) sits **after**
   `flyHeld` and `descendHeld` deliberately (`entity.js:1333-1340`).
4. **`opts.hitstop ?? 0.04`, NEVER `||`** — `entity.js:701`.
5. **NEVER CHANGE THE VISIBLE LIGHT COUNT AT RUNTIME.** `powerworld.js:522-523` restates it: moving
   a light is free, adding one recompiles every material in the scene (measured +152 programs, 410ms
   spikes).
6. **`strikeActive` CLAMPED AT ZERO** — `melee.js:237`. A negative timer is truthy and once deleted
   the entire bot melee mixup.
7. **GUARD IS NOT GATED ON `canAct`** — `melee.js:174-176`. Gating it on hitstop meant any fast
   combo stripped a held block.
8. **ONE `AIR_DRAG` FOR BOTH AXES** — `entity.js:1408-1411`. *"The two axes have to agree" is not a
   comment, it is a value.* At −2.4 horizontal against −1.5 vertical a swoop carried 12u, a nudge.
9. **THE `_openSky` NAMING DISCIPLINE** — `game.js:228-232`. `gait` is a new field; `_openSky` keeps
   its four meanings and gains no fifth.
10. **`groundRig` COUNTER-ROTATION** — `entity.js:1838-1842`. Order `'ZXY'` with `y = 0` composes
    the exact inverse of the parent's pitch and roll **while leaving yaw alone**. The flight pose
    blend in §6.2 writes `p.g.rotation`, so the counter-rotation must ride the blended value, not
    the raw target.
11. **`game.later(fn, ms)`, NEVER `setTimeout`** — `game.js:1662`. The transition's camera envelope
    and any deferred tell go through it, or they fire into the next match.
12. **A NEW TRANSIENT GOES IN `clearTransients()`** — `game.js:1717`, not in a reset path.
13. **THE RUBBLE/RANK/SITE LADDER LAW.** Any number introduced by a later loop on top of this one
    comes from the **distribution**, never from a hand-picked constant (`powerworld.js:74-85` is the
    fourth application). The two durations this document introduces are derived from `radius` and
    `_landT` for exactly that reason.

---

## 14. THE FIVE-LINE VERSION

- **The blocker is one predicate:** `flying` stays true on the PowerWorld floor
  (`entity.js:1450`), and it is the proxy **ten** shipped systems use for "in the air" — including
  the footstep layer, which has never once fired in PowerWorld.
- **The fix is one new field**, `f.gait`, six states, computed after inputs and before physics, read
  by the flight chain and never tested in front of a button (`entity.js:1333-1340` is why).
- **The one design decision is the handoff law:** input ownership changes on a single frame edge and
  belongs to the destination grammar; presentation ramps after. That is what makes a landing
  seamless *and* incapable of eating an input.
- **The intentional-vs-driven answer already exists and must not be touched:** `_slam` requires
  `launchT > 0`, so nobody can hurt themselves arriving, and `CRASH` returns you to the grammar you
  were in rather than dumping you on the floor.
- **The check that decides it is M9, the blind read** — M1–M8 can all be green while the transition
  is invisible to a human, and this project has shipped a black void, black rubble and a 4×-oversized
  ring past clean assertions.

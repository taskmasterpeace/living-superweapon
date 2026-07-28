# POWERWORLD — THE AIR GRAMMAR

**"Leave the ground and you are playing Bid for Power."** The complete flight spec, written 2026-07-27
at `56e7716`, to be implementable without re-reading a source.

Companion documents, and the division of labour:

| doc | owns |
|---|---|
| `docs/powerworld/aaa-00-ground-truth.md` | **what the engine does today.** Read it first; this document does not repeat it, it extends it |
| **this document** | **the air.** Flight basis, momentum, drift, power-scaled speed, pitch, the burner, the chase loop |
| `docs/powerworld/pw-bfp-source.md` | the BFP source of truth (`file:line` into LegendaryGuard/BFP @ `d06afa2`) |
| `docs/powerworld/pw-esf-research.md` §7 | **source-accurate on BFP — do not rewrite** (`pw-bfp-source.md:473`) |
| `docs/reference/openjk.md` | Jedi Outcast/Academy — the ground half, plus §7.1 the aim parallax bug |

**How to read a citation here.** `entity.js:1578` is our engine. `pw-bfp-source.md:116` is the research
doc's own line, which itself carries the `bg_pmove.c:1278`-style pointer into BFP. Where a BFP number is
the reconstruction author's **guess**, it is marked ⚠ GUESSED and this document proposes our own value
with a reason (`pw-bfp-source.md:9-33` is the list of which ones).

---

## 0. THE FIVE-LINE VERSION

1. **The basis is right and the input is missing.** Forward *is* the pitched view vector
   (`game.js:3243-3288`) — but there is **no mouse-look anywhere in `src/`**, so "where you look" is
   derived from where you are already going. That is the headline defect. §2.
2. **Our acceleration is 12× too snappy and our friction is already correct.** Time to top speed is
   **0.124 s**; BFP's is **~1.5 s**. One constant (`* 9` at `entity.js:1594/1595/1607`) is the whole
   difference, and the fix makes turn radius, stop distance and reversal distance fall out of one
   ratio. §3.
3. **`PM_Drifting` is cheap and we have nothing like it.** Full spec with our numbers, derived from
   BFP's own factors plus its reference framerate. §4.
4. **Power must buy the sky, and the bound is the camera, not taste.** Derived: air-speed swing
   **×2.55** over the power range (BFP's own playable swing is ×2.71), hard cap **210 u/s** derived
   from the chase camera's own damping and distance clamp. ⚠ **Do not copy BFP's 8.7×** — that is the
   number its own top complaint is about. §5.
5. **Pitch: unclamp the pose, widen the camera, do not implement the loop.** The loop is a
   first-person artefact and our camera carries a world up-vector. §6.

⚠ Everything in this document gates on `f._openSky` or `g.ms.chaseCam`. **The city game is untouched
and that is a measured claim, not a stated one** — the regression gates are §10.

---

## 1. THE VERDICT ON OUR PREMISE, ITEM BY ITEM

`pw-bfp-source.md:39-44` answers the original premise (*"forward is where you look, in 3-D, with
momentum"*) with **"Confirmed on both counts, and the mechanism is not what we built."** Here is the
full reconciliation, one row per claim, with what is actually true in our tree today.

| BFP behaviour | source | ours today | verdict |
|---|---|---|---|
| Forward = the **pitched** view vector, `wishvel = fwd·f + right·r + up·u` | `pw-bfp-source.md:46-52` (`bg_pmove.c:1216,1240`) | `game.js:3285` builds `d3 = {x: fw.x·iz + right.x·ix, y: fw.y·iz, z: …}` from `world.camera.getWorldDirection()` | ✅ **structurally identical**, including that strafe is flattened (`game.js:3284`, BFP's `right` is also level) |
| …but the **view** is player-driven | implicit; BFP is a Quake mod | ⛔ **no mouse-look exists in `src/`** — `grep -rn "movementX\|requestPointerLock" src/` returns nothing | ⛔ **§2.3, the headline gap** |
| Momentum = stock Q3 friction+accel, retuned by two floats | `pw-bfp-source.md:66-85` (`bg_pmove.c:38-45`) | a velocity integrator: `vel += dir·s·dt·9`, drag `exp(−1.8·dt)` (`entity.js:1594-1607`, `:1417`) | ⚠ **friction matches, acceleration is 12× off — §3** |
| `pm_flightfriction 2.0` | `pw-bfp-source.md:75` | `AIR_DRAG = 1.8` (`entity.js:29`) | ✅ **11 % floatier than BFP. Do not retune** — §3.5 |
| `pm_flyaccelerate 2.0` | `pw-bfp-source.md:74` | effective coefficient **9** (`entity.js:1594`) | ⛔ **§3** |
| `PM_Drifting` — release pushes you sideways, 27× harder below 100 u/s | `pw-bfp-source.md:87-102` (`bg_pmove.c:857`) | nothing | ⛔ **§4** |
| Flight speed scales with power level, superlinearly | `pw-bfp-source.md:104-128` (`bg_pmove.c:608,1278`) | tier-only multiplier (`entity.js:1578`); `powerBuff` is in `s` linearly (`entity.js:1573`) but has no flight-specific term | ⚠ **§5** |
| Pitch clamp lifted in flight; you can loop | `pw-bfp-source.md:58-64` (`bg_pmove.c:3425`) | pose clamped to 1.85 rad (`entity.js:1830`); camera pitch clamped ±0.82 (`world.js:2257`) | ⚠ **§6 — take half, refuse half, say why** |
| Roll is **cosmetic** and only while boosting, ±20° | `pw-bfp-source.md:135-137` (`PM_FlyTiltView`, `bg_pmove.c:1172,1181-1184`) | `rollT = clamp(−latR·0.014, −0.5, 0.5)·k` (`entity.js:1832`) = ±28.6°, always, from lateral velocity | ✅ **ours is better** — velocity-derived instead of boost-gated. Note ⚠ `pw-esf-research.md` claims real BFP banked to ±80°; `pw-bfp-source.md:485-488` **could not find ±80 anywhere in the tree** and flags it unverified. Do not chase it |
| Boost suppressed while blocking and while a beam is firing | `pw-bfp-source.md:130-131` (`bg_pmove.c:1275`) | nothing — cruise and the burner run through guard and through a held beam (`entity.js:1580-1584`, `:861-862`) | ⛔ **§7.3, one line** |
| Ki charge freezes you in the air (`upmove = 0`) | `pw-bfp-source.md:138` (`bg_pmove.c:1224`) | `chargingKi` exists and is a **retreat**, gated `_safeDist > 55` (`pw-controls.md:289-296`) | ⚠ out of scope here; flagged in `pw-controls.md` |
| `PMF_ULTIMATE_TIER` returns before any movement — 5 s statue **and invulnerable** | `pw-bfp-source.md:139-140`, `:356-359` | our tier-up is a ceremony with no invulnerability | ✅ **do not adopt** — `pw-bfp-source.md:611` lists it under Do not adopt |
| `wishvel[i] += 12` on forward+strafe+up | `pw-bfp-source.md:141-142` | — | ✅ **do not copy** — the author himself judges it a reconstruction artefact (`pw-bfp-source.md:555`) |

**Two things we already do that BFP does not, and must not be regressed** (`aaa-00-ground-truth.md:694`):

1. **The beam is a stream, not a laser.** `pw-bfp-source.md:502-517` — BFP re-projects the beam onto
   the live aim ray every frame, so a mouse sweep bends the whole beam instantly with no turn cap.
   Ours emits a packet carrying the direction it was **fired** with (CLAUDE.md §42; measured 5.7° of
   bend held, 122.1° after a 100° sweep). `pw-bfp-source.md:598` says explicitly *"Keep our curved
   beam"* and `:614` lists the straight re-aimed beam under **Do not adopt**. ⚠ **This matters to the
   air spec directly**: once mouse-look exists (§2), a flier will sweep the aim hard and fast. A
   straight beam would snap with it. Ours will not, and that is correct.
2. **Roll is derived from lateral velocity, not gated on a boost key** (`entity.js:1832` vs
   `pw-bfp-source.md:135`). Ours banks when you actually turn. Keep it.

---

## 2. THE BASIS — "forward is the pitched view vector"

### 2.1 What ours does, exactly

`game.js:3243` `if (p._openSky && p.flying)` — and note that in PowerWorld `flying` stays true while
standing on the floor (`entity.js:1450`, `aaa-00-ground-truth.md:117-135`), so this branch also runs on
the ground. Three cases:

| case | line | forward vector |
|---|---|---|
| hard-locked, distance `> PASS (16)` | `game.js:3269` | the normalised line to the lock |
| hard-locked, inside `PASS` | `game.js:3272-3278` | `p._swoop`, **latched once** from the arrival velocity — the punch-through |
| unlocked | `game.js:3279-3283` | `world.camera.getWorldDirection()` |

Then `game.js:3284-3287`:
```js
const rx = -fwz, rz = fwx, rl = Math.hypot(rx, rz) || 1;     // right, FLATTENED — strafe has no Y
const d3 = { x: fwx * iz + (rx / rl) * ix, y: fwy * iz, z: fwz * iz + (rz / rl) * ix };
```

That is **exactly** BFP's `wishvel = scale·forward·forwardmove + scale·right·rightmove`
(`pw-bfp-source.md:49-51`), minus the `up·upmove` term, which we handle separately via `flyHeld` /
`descendHeld`. The flattened right vector matches too — BFP's `pml.right` is level.

**Verdict on the basis: correct, and better than the source in one respect** — the lock-steered
approach with a latched pass-through (`game.js:3263-3278`) is a solution to a problem BFP never
solved, because BFP has no lock-on at all and its 22-year-old top community request is *"have a lock
on system would be better"* (`POWERWORLD.md:479-483`, §13.6).

### 2.2 The four things that differ

**(a) ⚠ THE 3-D BRANCH IS GATED ON `dir.y` BEING TRUTHY.** `entity.js:1606`:
```js
if (this.flying && this._openSky && dir.y) {
```
A pure strafe (`iz = 0` ⟹ `d3.y = fwy · 0 = 0`) falls into the **2-D** branch at `:1610` and gets the
horizontal-only clamp. It is correct by accident today (no Y is being added, so there is nothing for a
3-D clamp to do) but **the code path changes with the stick**, which means any future vertical term —
the drift's `up` push (§4.3), a vertical evade (§8.4) — silently misses the 3-D clamp on a strafe
frame. **Change the gate to `this.flying && this._openSky` and let `dir.y || 0` do the work.** One
character; do it in the same commit as §3 so the clamp is tested once.

**(b) ⚠ THE ASCEND KEY ERASES THE PITCHED-FORWARD VERTICAL, AND THIS IS THE BIGGEST FUNCTIONAL BUG IN
THE AIR TODAY.** `p.move()` runs at `game.js:3319`, inside `controlPlayer`. `_physics` runs later
(`entity.js:1177`). And `_physics`'s flight chain **assigns** `vel.y` rather than adding to it:

| branch | line | what it does to `vel.y` |
|---|---|---|
| `launchT > 0` | `entity.js:1277` | `vel.y -= 34·dt·gravZone` (an add — safe) |
| `flyHeld` | `entity.js:1305` | **`vel.y = damp(vel.y, FLY_RISE, 7, dt)`** — overwrites |
| `descendHeld` | `entity.js:1317` | **`vel.y = damp(vel.y, −FLY_SINK, 7, dt)`** — overwrites |
| `_openSky` coast | `entity.js:1348` | `vel.y *= exp(−AIR_DRAG·dt)` — scales, ≈ ×0.970 at 60 fps. Safe |

So **3-D flight only works on frames where neither SPACE nor the descend key is held.** Hold SPACE and
pitch forward and you climb at exactly `FLY_RISE = 46` regardless of where you are pointed; the
pitched-forward Y contribution `dir.y · s · dt · 9` is computed, added, and then thrown away one
function later. That is precisely the layering the open-sky branch exists to abolish
(`entity.js:1338-1345`), surviving in a different place.

**THE FIX, and it must respect the flag-placement law** (`entity.js:1333-1340`: *"a flag that changes
what happens when you RELEASE a button belongs where the release is handled, not in front of the
button"*). Do **not** move the `_openSky` test up the chain again. Instead, under `_openSky` only,
make the two servo branches **blend toward** the pitched-forward demand rather than replace it:

```js
// entity.js:1305 — flyHeld branch
const wantY = this._openSky ? Math.max(FLY_RISE, this._mvY3 || 0) : FLY_RISE;
this.vel.y = damp(this.vel.y, wantY, 7, dt);
```
where `_mvY3` is the vertical wish-speed `move()` just computed (`dir.y · s`), stamped alongside the
existing `_mvX` / `_mvZ` at `entity.js:1570`. Read: **SPACE is a floor on your climb rate, not a
replacement for it.** Pointing up and holding SPACE is faster than either alone; pointing *down* and
holding SPACE still climbs, which is right — you asked to go up.

Symmetrically at `:1317`: `wantY = this._openSky ? Math.min(−FLY_SINK, this._mvY3 || 0) : −FLY_SINK`.

⚠ **`_mvY3` must be a WISH SPEED, not the accumulated velocity**, or the servo chases its own output
and the climb rate ratchets. Stamp it as `dir.y * s` before the integrate, exactly as `_mvX`/`_mvZ` are
stamped as raw direction at `entity.js:1570`.

**GATE**: with a real key drive (SPACE + W held, camera pitched 45° up), steady-state `vel.y` must
exceed `FLY_RISE` and the horizontal speed must be non-zero. Today it measures exactly 46 and the
horizontal is whatever `dir.x/z` gave — i.e. the pitch bought nothing.

**(c) BOTS AND PLAYER 2 HAVE NO 3-D FLIGHT.** `controlBot` (`game.js:3433`) and `controlPad`
(`game.js:3392`) both write `moveDir = {x, z}` — 2-D — so `dir.y` is `undefined`, `entity.js:1606` is
false, and they climb only via `out.fly → flyHeld`, the elevator model
(`aaa-00-ground-truth.md:100-104`, `:656`). **Every rule in this document that reads `dir.y` is a
player-only rule until this is fixed**, which means an AI opponent in PowerWorld is flying a different
game from you. This belongs in the same loop as (b): `ai.intent()` already returns `fly` as a boolean;
it needs a `climb` scalar, and `controlBot` needs to build its dir off the belief position in 3-D the
way `game.js:3269` does off the lock. Not specced further here — it is the AI lane — but **it is
listed as a gate on §5 being meaningful**, because a power-scaled air speed that only the human can
use is a difficulty setting, not a mechanic.

**(d) `this.fwd` / `this.right` ARE STALE BEHIND THE CHASE CAMERA.** `game.js:380-381` computes them
**once in the constructor** from the isometric `camDir`. They are still read by the pad aim branches
(`game.js:3149`, `:3161`, `:3385`), the double-tap evade direction (`game.js:3310`), and the
`moveRelative === 'camera'` path (`game.js:3298`). Consequence: **double-tap evade in PowerWorld dashes
along isometric axes**, at an angle to everything the player can see. §8.4.

### 2.3 ⚠ THE HEADLINE FINDING — THE VIEW IS NOT A VIEW

`grep -rn "movementX\|movementY\|requestPointerLock\|pointerLock\|lookYaw\|camYaw" src/` returns
**nothing**. `pw-controls.md:266` already names it: *"Pointer Lock does not exist anywhere in the
project — `src/core/input.js:26-33` tracks absolute client coords only, no `movementX/Y`."*

So trace what actually decides "where you look" in PowerWorld today:

- **Camera pitch and yaw** come from `world.chase`'s `ax/ay/az` (`world.js:2250-2254`): the line to the
  target if there is one, **else the subject's own velocity** (`spd > 6`), else `subject.facing`.
- **Aim** with no soft target under the cursor comes from `world.camera.getWorldDirection()`
  (`game.js:3172-3175`).
- **Movement forward**, unlocked, comes from the same call (`game.js:3280-3282`).
- **Facing** comes from `aim3` (`game.js:3197`).

That is a closed loop: **you move where the camera points, the camera points where you are moving.**
With no lock and no target, the only thing that can change your heading is… the soft-target magnet
(`pickTarget`, `game.js:1485`), which is screen-space and does respond to the mouse — so the mouse
selects but does not steer.

**Three consequences, all of which invalidate work done downstream if they are not fixed first:**

1. **§6's pitch unclamp is unreachable.** You cannot pitch a view you cannot pitch.
2. **§4's drift is unfeelable.** `PM_Drifting` fires on *release of the forward input while travelling*
   — the sensation is the mismatch between where you are pointed and where you are sliding. With no
   independent look, there is no mismatch to feel.
3. **The thesis line "the reticle never lies" is not yet testable**, because the reticle
   (`body.powerworld #hCross`, `hud.styles.js:971-989`) is a fixed screen-centre CSS element and the
   camera is not under player control.

**⚠ AND THE PARALLAX BUG IS WAITING BEHIND IT.** `game.js:3172-3175` takes the **camera's** direction
and applies it from the **player's** position — two parallel rays from different origins, which never
converge. `chase()` puts the eye `d·0.17` lateral and `d·0.30` above the subject
(`world.js:2307-2308`), so at a 40 u chase distance the firing origin is **6.8 u lateral and 12 u up**
from where the crosshair marks. The miss is a **constant 6.8 u at every range**, so the angular error
is worst up close. `openjk.md:2045-2085` (§7.1) is the full writeup and calls it *fix this first*; the
recommended fix (B) is to raycast from the camera through screen centre and set `a3` to the **first
hit point**, which `world.screenToGround` (`world.js:1454`) already almost does — it builds the camera
ray and only needs a different intersection target.

**RULING FOR THIS SPEC: mouse-look and convergent aim are loop 1 of the air grammar, and everything
else in this document is loop 2 or later.** Building §3–§6 first would be tuning a control surface
nobody is holding. The full input design is `pw-controls.md` §2.2 and is not re-derived here; what the
air grammar requires of it is exactly three things:

| requirement | value | why |
|---|---|---|
| yaw is unbounded, pitch is bounded | ±80° (`sin 0.985`) | §6.3 — the camera's own degenerate-case blend already engages below `horiz 0.35` = 69.5° (`world.js:2265-2269`), so ±80° lands inside a case the code already handles |
| the aim ray and the camera ray are the **same ray** | — | the parallax fix, `openjk.md:2072` |
| a lock **overrides** look for the movement basis, never for the aim | — | already true (`game.js:3269` vs `:3172`) and it is the right split: the lock steers the approach, the mouse still points the gun |

---

## 3. THE MOMENTUM MAPPING — Quake accel/friction into our integrator

### 3.1 BFP's model, written as an equation

`pw-bfp-source.md:66-85`: **BFP has no momentum model of its own.** It uses stock Q3 `PM_Friction` +
`PM_Accelerate` (`bg_pmove.c:628`, verbatim, unmodified) and gets its feel by retuning two floats.

`PM_Accelerate` adds along `wishdir` at a rate proportional to `wishspeed`, capped so you cannot
overshoot:
```c
addspeed   = wishspeed - currentspeed;  if (addspeed <= 0) return;
accelspeed = accel * frametime * wishspeed;  if (accelspeed > addspeed) accelspeed = addspeed;
```
`PM_Friction` subtracts `control · friction · frametime` where `control = max(speed, pm_stopspeed)`.

Above `pm_stopspeed` (100, unchanged in BFP — `pw-bfp-source.md:80`) that is a **constant forward
force minus a linear drag**:

> **`dv/dt = a·S − f·v`**, with `a = pm_flyaccelerate = 2.0` and `f = pm_flightfriction = 2.0`
> (`pw-bfp-source.md:74-75`).

Two properties fall straight out, and they are the whole design:

- **Terminal speed = `(a/f)·S`.** BFP sets `a = f = 2.0`, so **terminal is exactly the wish speed** and
  the ratio `a/f` is doing nothing but making that true. That is why the two constants are equal, and
  it is not a coincidence anyone should copy blindly — it is a statement that the accel and the
  friction are the *same* number because the designer wanted the clamp to be implicit.
- **Time constant = `1/f` = 0.5 s.** 63 % of top speed at 0.50 s, **95 % at 1.50 s**.

`pm_airaccelerate` is **4.5** against Q3's 1.0 (`pw-bfp-source.md:76`) — real air control while
*falling*, not flying. Out of scope for this section but relevant to §9 (the ground grammar's landing).

### 3.2 Ours, written as the same equation

`entity.js:1594-1595` and `:1607`:
```js
this.vel.x += dir.x * s * dt * 9;
this.vel.z += dir.z * s * dt * 9;
this.vel.y += dir.y * s * dt * 9;      // open-sky 3-D branch
```
`entity.js:1597`: `const mx = (burstT > 0 || _slideT > 0) ? Math.max(s, 150) : s;` then a hard clamp.
`entity.js:1412-1417`: `glide = _openSky && flying` ⟹ `dragF = exp(−AIR_DRAG · dt)`, `AIR_DRAG = 1.8`
(`entity.js:29`).

> **`dv/dt = 9·s − 1.8·v`, hard-clamped at `|v| ≤ s`.**

- **Natural terminal = `9s/1.8` = 5·s** — five times the clamp. So **the clamp is the governor and the
  drag is decoration during acceleration.** The physics never gets to express itself.
- **Time to the clamp**: `v(t) = 5s(1 − e^{−1.8t})`, reaching `s` when `1 − e^{−1.8t} = 0.2`, i.e.
  **t = 0.124 s.**

**BFP takes 1.50 s to reach 95 % of top speed. We take 0.124 s to reach 100 % of it. That is a factor
of twelve, and it is the entire difference between "floaty" and "snappy."** No amount of drag tuning
can fix it, because drag is not what is limiting us.

### 3.3 The mapping

**Set the open-sky flight acceleration coefficient equal to the drag coefficient.** That reproduces
BFP's structure exactly (`a = f` ⟹ terminal = wish speed) and demotes the clamp to a safety net.

```js
// core/util.js — beside PW_KB, for the same reason it lives there (util.js:87-90):
// entity.js and game.js both read it and neither may import the stage.
export const PW_AIR = {
  accel: 1.8,        // == AIR_DRAG. accel/friction IS the terminal-speed multiplier. BFP: 2.0/2.0.
  // …§4 and §5 add fields here
};
```

```js
// entity.js:1594-1595, 1607 — ONE coefficient, chosen once at the top of move()
const A = (this.flying && this._openSky) ? PW_AIR.accel : 9;
this.vel.x += dir.x * s * dt * A;
this.vel.z += dir.z * s * dt * A;
// …
this.vel.y += (dir.y || 0) * s * dt * A;
```

⚠ **Do NOT change `AIR_DRAG`.** It is 1.8 for a documented reason (`entity.js:1400-1416`): it is the
one number both axes share, and it was measured — at −2.4 horizontal against −1.5 vertical a swoop
carried 12 u (1.25 body lengths, *"a nudge, not a manoeuvre"*), and matching them at 1.8 gave two body
lengths still travelling. Changing it re-opens a settled feel question. The **11 % difference from
BFP's 2.0** (time constant 0.556 s vs 0.500 s) is therefore deliberate and is 11 % floatier, which is
on the correct side of a mod whose own author called it *"deliberately floaty"*
(`pw-esf-research.md:~782`).

⚠ **Do NOT remove the clamp at `entity.js:1597-1617`.** With `A = f` the clamp becomes unreachable in
normal flight, but it still catches `burstT`, `_slideT`, the evade impulses and anything a future
ability adds. Deleting a guard because it currently never fires is how the projectile leak happened
(CLAUDE.md §39: an early `return false` skipping a disposal path).

### 3.4 The three measurables, and why they are one number

At `a = f`, three separate feel quantities collapse into `v/f`:

| measurable | formula | today (`A = 9s`, `f = 1.8`) | proposed (`A = 1.8s`) | BFP (`a = f = 2.0`) |
|---|---|---|---|---|
| **time to 95 % top speed** | `ln(20)/f` | **0.124 s** (to 100 %, clamp-limited) | **1.664 s** | **1.498 s** |
| time to 63 % | `1/f` | — | 0.556 s | 0.500 s |
| **stop distance** from `v`, no input | `v/f` | 55.6 u @ 100 u/s | **unchanged** — 55.6 u | 55.6-equivalent |
| **turn radius** at top speed | `v²/(a·s) = v/f` | 11.1 u @ 100 u/s | **55.6 u** | 55.6-equivalent |
| **180° reversal distance** from 100 u/s | `[(v₀+a s/f)/f](1−e^{−ft}) − (a s/f)t`, `t = ln(1+f v₀/(a s))/f` | **4.91 u** (0.101 s) | **17.05 u** (0.385 s) | ≈ same |

**At `a = f` the turn radius equals the stop distance equals `v/f`.** One coefficient, three feels,
and they cannot disagree with each other. That is a property worth stating in the manual: it is why
BFP's two floats were enough.

Read the reversal row as design: **half a body length of commitment becomes 1.8 body lengths**
(a fighter is 9.6 u). That is the difference between a flier who can stop on a coin and one who has to
plan an approach — and *"in a fast 3-D flight brawler the strike cannot be the skill test; the approach
is"* (`POWERWORLD.md:425-431`, quoting an ESF team member).

### 3.5 What this does NOT change

- **The coast.** Stop distance is `v/f` and `f` is untouched, so releasing the stick decays exactly as
  it does today. This is the regression gate at §10.
- **The launched drag class.** `PW_KB.drag = 0.5` (`util.js:91`) is a separate coefficient selected at
  `entity.js:1417` and is unaffected. **Do not fold them together** — `entity.js:1414-1416` records
  why they were separated: *"a thrown body was AIMED and is meant to land somewhere; a launched body
  is being sent away."*
- **The city.** `A` is `9` unless `this.flying && this._openSky`. Grounded movement, city flight,
  water, glide, carry — all unchanged.
- **`burstT`.** Dash, evade, the grapnel reel, the power dive and `intercept` all lift the clamp to
  `max(s, 150)` (`entity.js:1597`) and add velocity directly, not through `A`. Unchanged.

---

## 4. `PM_Drifting` — the release push

`pw-bfp-source.md:87-102` calls this *"the one genuinely BFP-specific flight function"* and
`:593-596` (item 5) calls it *"the strongest single feel-detail in the file."* `bg_pmove.c:857`, called
from ground move, fly move **and** water move.

### 4.1 The mechanism, verbatim

```c
float forwardSpeed, rightSpeed, driftFactor = 0.0003;
forwardSpeed = -DotProduct( pm->ps->velocity, pml.forward );
rightSpeed   =  DotProduct( pm->ps->velocity, pml.right );
```
- **Release strafe while descending** (`velocity[2] < 0`): `driftFactor = 0.001`, pushed along
  `pml.up` — *"you float up slightly out of a falling strafe."*
- **Release forward**: pushed along `pml.right`, sign following the travel direction.
  **`driftFactor = 0.008` when `|forwardSpeed| < 100`** — **26.67× the base factor.**
  *"the drift is strongest as you slow down. That is the 'banking to a stop' feel."*

### 4.2 ⚠ What the research does NOT give, and how we close it honestly

`pw-bfp-source.md:92-95` quotes the factors and the dot products but **not the line that applies
them** — we do not know what `driftFactor` multiplies or over what interval. Two facts let us close it
without guessing:

1. The shape is forced: the only quantity in scope is `forwardSpeed`, so the push must be
   `driftFactor · forwardSpeed` along `right`.
2. Q3 applies pmove per **frame**, and BFP's physics is documented as framerate-dependent
   (`pw-esf-research.md:~784`: *"Flight speed was highly dependent on FPS as of rc2"*). So the
   per-second coefficient is `driftFactor × fps`, and the reference framerate is Quake III's
   competitive standard `com_maxfps 125`.

> **`k = driftFactor × 125`** ⟹ `k_base = 0.0375 s⁻¹`, `k_slow = 1.000 s⁻¹`.

⚠ **The 125 fps is the one assumption in this section and it is stated, not hidden.** The **ratio**
26.67 is read straight from the source and is not an assumption. Expose both as dials.

Sanity check against the drag: at `v = 100 u/s` the main deceleration is `f·v = 180 u/s²`; the base
drift adds `k_base·v = 3.75 u/s²` laterally — **2 % of the decel, a subtle bank.** Below the threshold
at `v = 20 u/s`, decel is 36 u/s² and drift is `k_slow·v = 20 u/s²` — **56 % of the decel, a real
sideways settle.** That is exactly the described feel, and it is derived rather than dialled.

Lateral displacement over a full coast-out solves in closed form. With `a_lat = k·v₀e^{−ft}` and the
lateral axis under the same drag, `v_lat = k v₀ t e^{−ft}` and total displacement is **`k·v₀/f²`**:

| release speed | regime | lateral displacement |
|---|---|---|
| 100 u/s | base | **1.16 u** (0.12 body lengths — a bank you read, not a shove) |
| 210 u/s (§5 cap) | base | 2.43 u |
| 20 u/s | slow | **6.17 u** (0.64 body lengths) |
| 9 u/s | slow | 2.78 u |

### 4.3 The threshold — ⚠ derive it, do not convert it

BFP's threshold is `100` Quake units/s. **Scale**: `pw-bfp-source.md:567` gives Q3 as *"~56 u/m"*;
ours is 1 u ≈ 0.19 m, so **1 our-unit = 10.64 Quake units** and 100 Qu/s = **9.4 u/s**.

A literal conversion would put the entire strong-drift regime below 9.4 u/s — **a quarter of walking
speed**, a band a PowerWorld flier occupies for a fraction of a second per manoeuvre. The effect would
be technically present and never felt.

The honest transplant is the **relationship**, not the number. BFP's `100` is `100/320 = 31.25 %` of
`g_speed` (and is Q3's own `pm_stopspeed`, `pw-bfp-source.md:80` — i.e. Quake's canonical "slow"). So:

> **`driftThresh = 0.3125 × s`**, where `s` is the fighter's own current air wish-speed.

Scale-free, moves with the burner and with §5's power term, and puts the strong drift in the last
third of every deceleration — which is where it is felt. **Derived from the distribution, not picked**
(the fifth application of that law in this repo; `powerworld.js:74-85` is the fourth).

### 4.4 The spec

```js
// core/util.js — PW_AIR
  drift:       0.0375,   // s⁻¹ base lateral gain  = BFP driftFactor 0.0003 × 125 fps
  driftSlow:   1.000,    // s⁻¹ below threshold    = BFP 0.008 × 125 fps  (ratio 26.67, from source)
  driftThresh: 0.3125,   // × the fighter's own wish speed  (BFP: 100/320 of g_speed)
  driftUp:     0.125,    // s⁻¹ vertical variant   = BFP 0.001 × 125 fps
```

Applied in `move()`, in the open-sky flight branch only, **after** the accel and **before** the clamp:

1. Fires while `this.flying && this._openSky` and the **forward** component of input is zero this
   frame *and was non-zero within the last 0.25 s* (a release, not a permanent state — otherwise a
   hovering flier drifts forever).
2. `forwardSpeed = vel · fwd3` (the 3-D forward from `game.js:3285`, stamped on the fighter as
   `_fwd3` alongside `_mvX`/`_mvZ`), `rightSpeed = vel · right` (flattened, `game.js:3284`).
3. `k = |forwardSpeed| < PW_AIR.driftThresh · s ? PW_AIR.driftSlow : PW_AIR.drift`.
4. `sgn = Math.sign(rightSpeed) || this._driftSgn || 1;` then `this._driftSgn = sgn`.
   ⚠ **`Math.sign(0)` is `0`** and `rightSpeed` passes through zero on every straight-line release —
   without the latch the push flickers off and the sign flip-flops. Latch it, clear it on the next
   forward press.
5. `vel.x += right.x · sgn · k · |forwardSpeed| · dt;` same for `z`.
6. **Vertical variant**: on release of *strafe* while `vel.y < 0`, `vel.y += PW_AIR.driftUp ·
   |rightSpeed| · dt`. BFP pushes along `pml.up`, which in flight is the pitched up-vector; ours is
   world-up, because our strafe is already flattened (`game.js:3284`) so a pitched up-vector would
   introduce a horizontal component the source's own flattened `right` does not have.

**GATE** (drive the real keys, never write `vel`): hold W at cruise until top speed, release, sample
lateral displacement perpendicular to the release heading until `|v| < 5`. Expect **1.1–1.3 u** from
100 u/s. Then repeat with a release at 20 u/s: expect **6.0–6.4 u**. A run that returns 0.00 for both
is the `Math.sign(0)` bug; a run that returns the same number for both means the threshold is reading
an absolute instead of `0.3125·s`.

⚠ **This is unfeelable until §2.3 ships.** The sensation is the mismatch between where you are pointed
and where you are sliding, and with no independent look there is no mismatch. Build it in the same loop
as mouse-look or it will be graded as "does nothing" by someone driving a camera that is chasing his
own velocity vector.

---

## 5. FLIGHT SPEED AS A FUNCTION OF POWER

### 5.1 The source, and an arithmetic error in it

`pw-bfp-source.md:104-118` (`bg_pmove.c:608`, `:1144`, `:1278`):
```c
static float PM_KiBoostPowerlevelSpeed( void ) {
    return pm->ps->speed + ( powerlevel * 0.5 );
}
// flight boost, bg_pmove.c:1278:
float factor = 2.0f + ( (float)powerlevel * 0.001 );
wishspeed += PM_KiBoostPowerlevelSpeed() * factor;
```
i.e. **`flightBoost = g_speed + (g_speed + PL·0.5)·(2.0 + PL·0.001)`**, `g_speed 320`.

⚠ **`pw-bfp-source.md:124` — the `PL 150` row of that table is wrong.** It states a flight boost of
**1,536**. The formula gives **1,169.25**:
`320 + (320 + 75)·(2 + 0.15) = 320 + 395·2.15 = 1169.25`.
The PL-500 (1,745) and PL-1000 (2,780) rows check out exactly, and `pw-esf-research.md`'s independent
PL-50 row (1,027) also checks out (`320 + 345·2.05 = 1027.25`). Only the PL-150 flight cell is bad; the
same row's ground-boost cell (715 = `320 + 395`) is correct. **Use 1,169 for spawn-PL flight boost.**
Solving backwards, 1,536 corresponds to PL ≈ 370 — it looks like a row transcribed from a different PL.

**In our units** (×0.09398, from `1 our-unit = 10.64 Quake units`):

| BFP quantity | Quake u/s | **our u/s** |
|---|---|---|
| walk (`g_speed`) | 320 | **30.1** |
| ground boost, PL 150 | 715 | 67.2 |
| flight boost, PL 50 (spawn in the ESF doc's table) | 1,027 | **96.5** |
| flight boost, PL 150 (corrected) | 1,169 | **109.9** |
| flight boost, PL 500 | 1,745 | **164.0** |
| flight boost, PL 1000 (max) | 2,780 | **261.3** |

### 5.2 Where we actually sit — measured across all 52

Computed over the live roster (`src/data/characters.js`, `FLY_SPEEDS` at `entity.js:99-102`,
multiplier at `entity.js:1578`, cruise/burner at `:1580-1584`), at `powerBuff = 1`:

| | slowest | median walk | fastest |
|---|---|---|---|
| ground walk (`speed·1.08`) | 27.0 (BULWARK) | **35.6** | 49.7 (JELANI) |
| air, no cruise | 23.59 (CIRCUIT, tier 2) | — | 66.36 (TORCH, tier 3) |
| air + cruise ×1.5 | 35.38 | — | 99.53 |
| air + burner (6 heroes) | — | — | **139.35** (TORCH) |

**Spread across the roster in the air: ×2.81 base, ×3.94 including the burner.**
(⚠ `aaa-00-ground-truth.md:77` says ×1.64 — that is the *tier multiplier* spread alone, `0.95 → 1.56`,
and it is correct as far as it goes; including per-hero `def.speed` the real spread is ×2.81.)

**Three readings that matter:**

1. **Our median walk (35.6) is 18 % faster than BFP's walk (30.1).** Our ground game is not slow.
2. **Our fastest possible flier today (139.4) sits between BFP's PL-150 (109.9) and PL-500 (164.0).**
   We already span BFP's low-to-mid band. What we lack is the **top** and, far more importantly, the
   **ramp** — the sense that the number moved because you earned it.
3. ⚠ **BFP has NO per-character speed spread at all.** `pw-bfp-source.md:545-547` (§9 item 4): *"An
   attackset is five attack indices and a model prefix — nothing else. No per-character health, speed,
   ki or mass. **BFP characters differ only in their five powers.**"* So BFP's famous 8.7× is
   **entirely a power-level spread on one identical character**, and gives no support whatsoever for
   widening our tier spread. **Put the growth on power. Do not widen the character spread.**

### 5.3 ⚠ DO NOT COPY 8.7×, AND KNOW WHAT IT IS A RATIO OF

`pw-bfp-source.md:128`: *"Boosted flight at max PL is ~8.7× walk speed."* That is
`2780/320` — **boosted flight at maximum power against unboosted walk at any power.** It bundles the
flight multiplier, the boost and the whole progression into one figure. And `pw-bfp-source.md:585`
warns in the same breath: *"Bound it: 8.7× is also the direct cause of BFP's own top complaint (fights
nobody can follow)."* `POWERWORLD.md:479-483` confirms the complaint ran unchanged **from 2002 to 2024**.

The transplantable figure is the **swing across the playable power range**:
`2780 / 1027 = ×2.71` from spawn PL to max PL.

### 5.4 Our power quantity, and the derived gain

`powerBuff` (`entity.js:195`) is *"damage/speed multiplier (levelMult × active transform)"* and is
already in `s` linearly at `entity.js:1573`. Its real range:

- `levelMult = 1 + (level − 1)·0.06`, level capped at 10 (`game.js:2543`, `:2538`) ⟹ **1.00 → 1.54**.
- A transform **overwrites** rather than multiplies: `c.powerBuff = def.mult || 1.6`
  (`abilities.js:406`). Roster `mult` values run 1.6–1.7 (`characters.js:20`, `:36`, `:54`, `:74`).

> **`powerBuff` ∈ [1.00, 1.70]** in practice, and the two sources do not compound.

BFP's flight-only superlinear term `(2.0 + PL·0.001)` runs **2.0 → 3.0** across its whole PL range — a
**×1.5 swing** (`pw-bfp-source.md:116`). Transplant that swing onto our power range:

> **`airGain = 1 + plGain · (powerBuff − 1)`**, with `plGain` set so `airGain(1.70) = 1.50`
> ⟹ **`plGain = 0.5 / 0.7 = 0.7143`**.

Total power dependence of air speed then becomes `powerBuff × airGain`:
**`1.70 × 1.50 = ×2.55` across the power range, against BFP's own playable-range swing of ×2.71.**
Within 6 %, and every term derived.

⚠ **`airGain(1.0) = 1.0` exactly**, so the change is **neutral at base power**. Nobody's opening speed
moves. That is a deliberate property: it makes the regression surface small and it makes the mechanic
legible — you are not faster because we retuned the game, you are faster because you levelled or
transformed.

### 5.5 The bound is the chase camera, and it is derived

A speed cap must come from something. Here is the derivation, entirely from numbers already in
`world.js`.

A subject moving at `v` at chase distance `d` sweeps the camera at angular rate `ω = v/d`. The eye
damps at **λ = 8** (`world.js:2309`, `:2311`); its time constant is `τ = 1/8 = 0.125 s`. A damped
follower tracks without visible lag while `ω·τ ≲ 1/3` — i.e. **`ω_max ≈ 2.67 rad/s`**. So the distance
required to hold speed `v` in frame is **`d_req = v / 2.67`**.

What distance can the camera actually reach? `world.js:2285-2287`:
```js
const FRAME_MAX = 52;
const fit  = (Math.min(gap, FRAME_MAX) + 20) / (2 * Math.tan(fov/2));
const want = clamp(Math.max(24, fit * 1.15) + k * 16, 24, 86);
```
At the worst case (`gap ≥ 52`, `fov = 74°` — its maximum, `world.js:2248`):
`fit = 72 / (2·tan 37°) = 47.8`; `×1.15 = 54.9`; `+ k·16` with `k` at its maximum 1 ⟹ **`want` tops
out at 70.9 u — the `86` clamp ceiling is unreachable.**

Two results:

- **The camera's own maximum trackable speed today is `70.9 × 2.67 = 189 u/s`.**
- ⚠ **`k = clamp((spd − 14)/96, 0, 1)` (`world.js:2247`) saturates at `spd = 110` — and our current top
  speed is already 139.35.** The camera's speed-driven pull-back stops responding a fifth of the way
  below the fastest thing in the game. That is a shipped defect independent of anything in this
  document.

> **`PW_AIR.top = 210` u/s**, requiring `d_req = 78.7 u`, with two companion changes to `world.chase`
> that put that distance in reach:
> - `world.js:2247` → `const k = clamp((spd - 14) / (PW_AIR.top - 14), 0, 1);` (denominator 196, so
>   `k` saturates at the actual top speed rather than at 110)
> - `world.js:2287` → `+ k * 26` instead of `+ k * 16`, so `want` reaches `54.9 + 26 = 80.9 ≥ 78.7`,
>   still inside the existing `86` clamp with 6 % of headroom.

⚠ **These two are not optional polish — they are the other half of the same ruling.** Raising the speed
without the pull-back produces exactly the failure BFP shipped and never fixed, and
`POWERWORLD.md:456-463` (§13.3) records that ESF's answer to the two-body framing problem was to
**cut away from its own third-person camera** (*"Firstperson is now forced during melee battles, so the
screen doesn't fuck up"*). We do not get to make that mistake twice with the evidence in the repo.

**Cross-checks on 210:**

| check | value | verdict |
|---|---|---|
| stage crossing (radius 900 ⟹ 1800 u) | **8.6 s** | BFP crossed a ~4000-Qu map in **1.4 s** at 2780 Qu/s. We are 6× more readable than the thing that broke |
| real-world | 210 u/s × 0.19 m = **39.9 m/s = 144 km/h** | sane for a superhero |
| vs `pwCatchSpeed()` = 114.4 (`util.js:92`) | 1.84× | at max power you can *fly* after a launched body instead of teleporting. §8.2 — a consequence, flagged for a ruling |
| vs `momentumMult` saturation at 58 u/s (`melee.js:14-17`) | 3.6× | already saturated today at 139; unchanged. §8.3 |
| vs BFP max (261.3 in our units) | 0.80× | deliberately short of the number BFP's own complaint is about |

### 5.6 The patch, and what the roster looks like after it

```js
// entity.js:1577-1585 — inside `if (this.flying) {`
s *= this.flightTier >= 3 ? this.flySpeed * 1.2 : this.flightTier === 2 ? 0.78 : 0.95;
if (this._openSky) s *= 1 + PW_AIR.plGain * (this.powerBuff - 1);   // POWER BUYS THE SKY
if (this.cruiseHeld && this.ki > 1) { /* …unchanged… */ }
if (this._openSky) s = Math.min(s, PW_AIR.top);                     // the camera's own limit
```

Measured outcome across the roster:

| fighter | `powerBuff` 1.0, cruise | `powerBuff` 1.7, cruise (+burner) |
|---|---|---|
| CIRCUIT (tier 2, slowest air, no burner) | 35.4 | **90.2** |
| TORCH (tier 3, fastest, burner) | 139.4 | 355.3 → **capped 210** |
| **roster spread in the air** | **×3.94** (unchanged) | **×2.33** |

**The cap compresses the top while power lifts the bottom, so the roster CONVERGES in the air as it
powers up.** That is the single best property of this design and it is worth saying out loud: it is
what makes *"every one of the 52 fighters gets both grammars with no exceptions"* survive contact with
a 19-strong `flightTier 0` contingent (`flightTier` histogram over the roster: **0→19, 1→6, 2→11,
3→16**). A grounded bruiser is a bad flier who becomes a competent one by fighting well — which is
BFP's progression feeling, arrived at without BFP's endurance tax (§7.1).

⚠ **§5 is not meaningful until §2.2(c) is fixed.** Bots build 2-D move vectors (`game.js:3433`), so a
power-scaled *3-D* air speed reaches the player and nobody else.

---

## 6. PITCH — unclamp the pose, widen the camera, refuse the loop

### 6.1 What our pose actually does

`entity.js:1823-1833`:
```js
const fwd = this.vel.x * this.aim.x + this.vel.z * this.aim.z;   // travel along facing
const vy  = this.vel.y;
const k   = clamp((Math.hypot(this.vel.x, this.vel.z, vy * 0.5) - 6) / 20, 0, 1);
const ang = fwd > 2 ? Math.atan2(fwd, vy) : 0;
pitchT = clamp(ang, 0, 1.85) * k;
if (fwd < -4) pitchT = -0.25 * k;                                // backpedal lean
rollT = clamp(-latR * 0.014, -0.5, 0.5) * k;
```

Worked through, `ang = atan2(fwd, vy)`:

| motion | `ang` | rendered (clamp 1.85 = 106°) | error |
|---|---|---|---|
| hover / slow | — (`k ≈ 0`) | upright | — |
| vertical climb (`fwd 0, vy > 0`) | 0° | upright, head up | ✅ 0° |
| 45° climb | 45° | 45° | ✅ 0° |
| level cruise | 90° | prone, head first | ✅ 0° |
| **45° dive** | 135° | **106°** | ⛔ **29° short** |
| **vertical dive** | 180° | **106°** | ⛔ **74° short — the body never points down** |

**Climbs are exact; dives are truncated, and a straight-down dive renders as 16° past prone.** That is
the visible half of "we do not have the loop," and it is one clamp.

### 6.2 The pose fix

```js
// entity.js:1830
pitchT = clamp(ang, 0, this._openSky ? Math.PI : 1.85) * k;
```
`ang ∈ [0, π]` in this branch (`fwd > 2` guards the sign), so the upper limit is the only term needed.
The city keeps 1.85 exactly.

⚠ **The ground rig already handles it.** `entity.js` counter-rotates
`p.groundRig.rotation.x = -p.g.rotation.x` with order `'ZXY'`, which is the exact inverse of the
parent's pitch and roll while leaving yaw alone. At `pitch = π` that inverse is still exact — no new
work, and this is why the shadow and the rings will not slide out from under a diving fighter.

⚠ **A true LOOP additionally needs angle-wrapped damping.** `p.g.rotation.x = damp(p.g.rotation.x,
pitchT, 7, dt)` is a **scalar** damp. Going `1.85 → π` is fine; crossing `+π → −π` would spin the whole
body backwards through zero. If a loop is ever wanted, the damp must go through `angleDiff`
(`core/util.js:21`), which already exists for exactly this. **Not needed for §6.2** — this change only
extends the range, it does not create a wrap.

### 6.3 The camera, and the ruling on the loop

`world.js:2255-2257`:
```js
// ⚠ CLAMP THE PITCH. Full-sphere means the target can be directly overhead, and a camera that
// rolls to follow that is nausea. The vertical component is damped, not obeyed.
ay = clamp(ay * 0.55, -0.82, 0.82);
```
`asin(0.82) = 55.1°`. And there is a `×0.55` **before** the clamp, so a target 45° above you produces
`ay = 0.39` ⟹ **the camera looks up 23°, not 45°.**

**RULING — take the visible half, refuse the half that rolls the world, and say why.**

- **Body pitch: unclamped to ±180° in PowerWorld** (§6.2). Free, correct, and it is the half a player
  actually sees.
- **Camera pitch: widen `0.82 → 0.985` (`asin` = 80°) under `g.ms.chaseCam`, and drop the `×0.55` to
  `×0.80`.** Justification is not taste: the degenerate-case blend at `world.js:2265-2269` already
  engages below `horiz < 0.35` (= 69.5° of pitch) and was built and screenshot-verified for exactly
  this case (*"with a foe 46 u directly overhead the subject spanned 94.6 % of the frame"* —
  `world.js:2259-2264`). **80° lands inside a case the code already handles**; 90° does not, because at
  true vertical the camera's roll about a world up-vector is undefined.
- ⛔ **Do NOT implement the view loop.** `pw-bfp-source.md:587-591` (item 4) asks for it, citing
  `bg_pmove.c:3425` and the journal (*"got around the gimble lock so you can go upside down"*). **BFP's
  loop is a first-person artefact**: there is no third body to frame and no shoulder offset, so
  "upside down" costs nothing. Our camera is third-person over the shoulder with `c.lookAt(...)`
  (`world.js:2321`) and an implicit world up-vector; looping it requires the camera to carry and
  interpolate its own roll, and the moment it does, the shoulder offset (`world.js:2307`) and the
  angular shake (`:2316-2318`) both become roll-dependent. That is a camera rewrite for one manoeuvre
  the reference gets for free and we would not.
  **If Robert wants it anyway**, the shape is: give `camChase` an explicit `up` vector that lerps
  toward the subject's own roll axis above 70° of pitch and back to world-up below it, gate it on
  `g.ms.chaseCam`, and grade it with a screenshot matrix rather than assertions — this project has made
  the "green assertions, broken picture" mistake four times on record (`world.js:2278-2281`,
  `aaa-00-ground-truth.md:753-755`). It is a loop of its own, not a line in this one.

**GATE for §6**: pose a fighter in a real vertical dive by driving the controls (pitch the view down,
hold forward) and read `parts.g.rotation.x`. Today it saturates at 1.85; it must reach ≥ 3.0. And take
the screenshot — *"only the picture shows scale"* (the boxing ring, the venue seating, the black
rubble).

---

## 7. THE AFTERBURNER — where it fits, and what it loses

### 7.1 What we have vs what BFP has

| | BFP | ours |
|---|---|---|
| flight itself | **50 ki/s** (`g_flightCost`, `pw-bfp-source.md:166`) | **free** — nothing in `_physics` charges ki for flying |
| boost | **350 ki/s** — 7× flight (`pw-bfp-source.md:168`) | cruise **2.6 ki/s** (`entity.js:1581`), burner **14 ki/s** total (`entity.js:873`, `def.afterburner.kiPerSec`) |
| boost speed | ×8.69 over walk at max PL, ×3.2 at spawn | cruise ×1.5, burner ×2.1 (`entity.js:1582-1584`) |
| who has it | **everyone** | cruise everyone; burner **6 of 52** — apex, nova, olympus, sol, majesty, torch (`characters.js`) |
| regen while boosting | **blocked**; **not** blocked while merely flying (`pw-bfp-source.md:181`) | not blocked. Base regen 9/s ⟹ cruise nets **+6.4/s**, burner nets **−5/s** |
| suppressed while blocking / firing a beam | **yes** (`pw-bfp-source.md:130-131`, `bg_pmove.c:1275`) | **no** |

### 7.2 The rulings

**(a) Do not add a flight tax.** BFP's 50 ki/s is what produces its most evocative progression —
*"a new player gets 35 seconds of sky; a maxed player owns it forever"* (`pw-esf-research.md` §7.3, net
drain `50 − 0.006·maxKi` crossing zero at max PL). It is a beautiful mechanic **and it is the wrong one
here**, because `_openSky` means *"every character can fly"* (`game.js:228-232`) and a per-second tax
recreates the deck ladder in economic form: the low-ki characters would be grounded again, by the back
door. **This is exactly why §5 puts the progression on SPEED instead of ENDURANCE.** Say so in the
manual; it is a deliberate divergence from the best idea in the source.

**(b) Cruise is our universal boost; the burner stays the six heroes' identity.** That is already the
shape, and the cost ratio (14 / 2.6 = **5.4×**) is close to BFP's 7×. Leave both numbers alone.

**(c) ⚠ ONE LINE IS MISSING AND IT IS THE COUNTERPLAY.** BFP suppresses boost while blocking and while
a beam is firing (`bg_pmove.c:1275`). Ours does neither: you can guard at cruise and fire a held beam
at full burner. Add to `entity.js:1580` and `:861`:
```js
if (this.cruiseHeld && this.ki > 1 && !this.guarding && !this._beamFiring) { … }
```
**This is what makes the boost a decision rather than a default.** It is one clause and it is the
cheapest item in this document.

**(d) ⚠ IN POWERWORLD THE BURNER LOSES TWO OF ITS THREE JOBS.** Today `def.afterburner` does three
things: it grants `unlidded` past the deck servo (`entity.js:1302`), it exempts you from the ceiling
clamp for the orbit route (`entity.js:1465`), and it multiplies speed (`entity.js:1583`). **Under
`_openSky` both of the first two are already unconditionally true for everyone** — `_openSky` is itself
in the `unlidded` expression and the ceiling clamp does not run at all. So in PowerWorld the burner is
a speed stat for six heroes and nothing else.

**The proposal, and it is the cleanest idea in the source:** `pw-bfp-source.md:330-332` —
> *"`BUTTON_KI_USE` is the one 'go faster' input and it is the same input that doubles your beam in a
> struggle and enables hit-stun melee. **One key, three effects, one resource** — that unification is
> the cleanest design idea in the whole codebase."*

So under `_openSky`, held cruise (and the burner as its stronger form) should also be:
- the **×2 lever in a beam struggle** (`pw-bfp-source.md:219-220`: `if (EF_KI_BOOST || BUTTON_KI_USE)
  powerEnt *= 2`), and
- the gate on **hit-stun melee** (`pw-bfp-source.md:283-286`: boosted melee imposes a 3 s stun).

⚠ **Both of those are the combat lane, not the air lane.** They are named here because they are the
answer to "what is the burner *for* in PowerWorld," and because §8.5 of `pw-bfp-source.md` already
proposes the beam-struggle rework as item 6. **Hand-off, not a change proposed by this document.**

---

## 8. THE CHASE LOOP — and the derivations that must not break

### 8.1 `PW_KB` — leave the arithmetic alone

`core/util.js:91-92`:
```js
export const PW_KB = { kb: 2.2, launch: 1.45, drag: 0.5, window: 2.6, catchK: 52 };
export const pwCatchSpeed = () => PW_KB.catchK * PW_KB.kb;   // = 114.4
```

⚠ **`catchK` is a MULTIPLE of `kb` on purpose**, and `util.js:76-85` explains why in the file itself:
multiplying the impulse without moving the catch line makes **every** launch too fast to follow, which
silently deletes teleport-intercept — a mechanic that shipped the day before. Measured launch
distribution over a 90 s AI-vs-AI fight: **p50 80 · p75 85 · p90 109 · max 151**, standing haymaker
104. The line at 114.4 therefore leaves a standing hit catchable and takes roughly the hardest tenth
away.

**Nothing in this document touches `PW_KB`.** §3 changes the acceleration *coefficient*, not the
knockback; §5 changes the *wish speed*, not any impulse. The `launchT` exceptions at `entity.js:1609`
and `:1616` and the launched drag class at `:1417` are all untouched, and the §47 harness
(`src/bench/powerworld.js` → `LSW.pwSuite()`, 42 checks) already asserts them — **re-run it, do not
rewrite it.**

### 8.2 One consequence of §5 that needs a ruling

At `powerBuff 1.7` a burner hero cruises at the **210 u/s** cap, which is **1.84× the catch line** and
**1.39× the maximum measured launch speed (151)**. So at high power a player can simply *fly after* a
body that the intercept would refuse.

Is that a bug? **No — argue it is the payoff.** The intercept is a teleport that closes distance you
are *allowed* to close; being fast enough not to need it is what power is for, and it is the same
progression BFP sells. But it is a genuine change to the shape of the loop at the top of the ladder and
**Robert should rule on it** rather than discover it. §11 Q3.

### 8.3 ⚠ THE UNRESOLVED RULING: intercept as SPEED or as REACH

Two documents in this repo disagree and `aaa-00-ground-truth.md:679-686` flags it:

- `pw-bfp-source.md:490-500` (§8.2) + item 1 (`:564-570`): **`CATCH_SPD = 132` was invented and the
  underlying model is wrong.** BFP has **no speed threshold and no catch** — `CheckMeleeAttack`
  (`g_weapon.c:185`, `:298`) teleports you to the trace endpoint at **any** target velocity; the only
  refusals are geometric. The limiter is `g_meleeDiveRange` **700 Quake units ≈ 66 of our units**.
  *"Keep the range, drop the speed gate."*
- `POWERWORLD.md:441-455` (§13.2): ESF's speed-dependent catchability *"emerged accidentally — so build
  it on purpose. It makes the biggest hit not automatically the best hit."*

**This document's position, offered for the ruling and not enacted:**

They are not actually exclusive, and the honest synthesis is that **the reason a fast body is hard to
catch is that it is FAR by the time you press** — which reach already models, continuously, without a
cliff. We already have **both** gates: `game.js:2095` is `const CATCH_SPD = 132, REACH = 190;`. The
speed gate is Robert's ruling and is measured against our own launch distribution; **the reach gate at
190 is the one that was never derived.**

Derivation: a launched body under `PW_KB.drag = 0.5` covers `v₀(1 − e^{−0.5t})/0.5`. Over the natural
reaction budget — `PW_KB.window = 2.6 s`, the same `launchT` that already gates the intercept
(`game.js:2099`) — a **p90 launch (109 u/s) travels 158 u** and a **p50 launch (80 u/s) travels 116 u**.
So **`REACH = 160`** is "the distance a hard launch covers inside its own launch window," and 190 is
about 20 % looser than anything the numbers ask for.

⚠ **Changing `REACH` is the combat lane's call, listed here because it is the other half of a
derivation this document was told not to break.** Do not change it as a side effect of an air commit.

### 8.4 The evade — our Zanzoken, and it is wrong in two ways in the air

BFP's escape (`pw-bfp-source.md:288-309`, `g_active.c:801`): a **double-tap of strafe** teleports you
**500 Quake units (≈ 47 of ours)** sideways and **cancels hit stun**; costs **5 % of max ki**; cannot
be used in the first **100 ms** of stun (`STAT_HITSTUN_TIME > 2900` ⟹ return); 10 uses then a forced 2 s
lockout, 70 ms between; two trace guards. `pw-bfp-source.md:572-578` (item 2) calls wiring this *"a
wiring job, not a build"* — we already have double-tap detection (`TAP_DIRS`, `game.js:42`, 0.28 s
window) and `performEvade` (`abilities.js:1068`).

Two defects that are specifically air defects:

1. ⚠ **`performEvade(c, dir, g)` takes a 2-D `{x, z}`** (`abilities.js:1068-1074`, and none of the six
   `EVADE_DEFAULTS` kinds at `:1058-1065` has a vertical component). **There is no vertical evade in
   the game.** In a fight whose premise is that altitude is the axis, an escape that can only move you
   horizontally is an escape that cannot leave the plane the attacker is already in.
2. ⚠ **The direction is built from `this.fwd`/`this.right`** (`game.js:3310`), which are the stale
   isometric axes (`game.js:380-381`). **Double-tap evade in PowerWorld dashes along isometric axes**,
   at an arbitrary angle to the camera. The player presses "left" and goes somewhere else.

**Minimum air fix, both small:** build the evade direction in `controlPlayer` from the same `fwx/fwy/
fwz` + flattened right that `game.js:3284-3285` already computed for the move basis, and give
`performEvade` a `dir.y` that the `dash`/`slide`/`phase` impulse branches honour under `_openSky`.
BFP's 47-unit lateral range is a good sanity anchor for the blink kind (`EVADE_DEFAULTS.blink.range`
is 22 — half of it).

### 8.5 What NOT to change in the melee that hangs off flight

- **`momentumMult`** (`melee.js:14-17`): `k = clamp((|vel| − 12)/46, 0, 1)`, `1 + 1.5k²`, saturating at
  **58 u/s**. In PowerWorld it is already permanently saturated (today's cruise is 99–139) and §5 does
  not change that. ⚠ It is the input the ESF catchability trade already has
  (`POWERWORLD.md:448-452`), so **do not rescale it to the new top speed** without ruling on §8.3
  first — a `momentumMult` that only saturates at 210 would make every sub-cruise punch weaker than it
  is today, which is a roster-wide combat change hiding inside a flight commit.
- **The `?? 0.04` hitstop** (`entity.js:701`). Untouched here; listed because any new sustained air
  source must pass an explicit `0`.
- **The dive punch** (`melee.js:254`, `launch = −(34 + _momSpd·0.45)`), sized to beat kb resistance and
  cross the −38 ground-slam gate (`entity.js:1456`). §5 raises `_momSpd`, which raises the dive-punch
  down-force. At 210 u/s that is `−128` instead of `−97`. **Both already exceed the gate**, so the
  behaviour does not change category — but note it in the manual, and re-run the §47 suite.

---

## 9. WHAT MUST NOT CHANGE

**The city game is untouched, and it must be MEASURED, not stated** (`CLAUDE.md` §47 already sets the
precedent: *"the four `||` FALLBACKS are where 'provably identical' actually lives, so they are DRIVEN
in the suite rather than reasoned about"*).

### 9.1 The gating law

Every rule in this document hangs on one of these, and **on nothing else**:

| flag | set at | scope |
|---|---|---|
| `f._openSky` | `game.js:233` (setup), `:240` (late arrivals) | per **fighter** |
| `f._chaseKb` | `game.js:227`, `:240` | per **fighter** |
| `g.ms.chaseCam` | `game.js:186` | per **match** — the only correct gate for `world.chase` changes (§5.5, §6.3) |
| `body.powerworld` | `game.js:192`, removed `:1727` | DOM only |

⚠ **Never gate an air rule on `f.flying` alone.** `flying` is **true while standing on the PowerWorld
floor** (`entity.js:1450`: the exit condition includes `&& !this._openSky`), which is the single most
important fact for anyone building on this (`aaa-00-ground-truth.md:117-135`, `:727-731`). The honest
"actually on the ground" test today is `f.pos.y <= f.groundY + ε`.

⚠ **Do not add a fifth meaning to `_openSky`.** `game.js:228-232` names the discipline: it means
*"nothing docks you, nothing sags, there is no ceiling, and every character can fly"* — one dimension,
not four decisions. Everything in this document is a consequence of that same dimension, which is why
no new flag is proposed. If a future rule is **not** a consequence of "the sky is yours," it needs its
own flag.

### 9.2 The one home for the numbers

All new constants go in **`PW_AIR` in `core/util.js`**, beside `PW_KB`, for the reason stated at
`util.js:87-90`: entity.js and game.js both read it, and neither may import the stage
(`powerworld.js` imports `figure.js`). It is then live-editable from the console as `LSW.PW_AIR`,
which is what "give him a dial" means.

```js
export const PW_AIR = {
  accel:       1.8,      // == AIR_DRAG. accel/friction IS the terminal multiplier. BFP: 2.0/2.0.
  plGain:      0.7143,   // airGain = 1 + plGain·(powerBuff−1); derived so airGain(1.70) = 1.50
  top:         210,      // u/s cap on open-sky wish speed; derived from the chase camera (§5.5)
  drift:       0.0375,   // s⁻¹  BFP driftFactor 0.0003 × 125 fps
  driftSlow:   1.000,    // s⁻¹  BFP 0.008 × 125 fps — ratio 26.67 is read from source
  driftThresh: 0.3125,   // × the fighter's own wish speed (BFP: pm_stopspeed 100 / g_speed 320)
  driftUp:     0.125,    // s⁻¹  BFP 0.001 × 125 fps
  camPitch:    0.985,    // sin(80°) — world.chase's ay clamp under ms.chaseCam (§6.3)
};
```

### 9.3 Do-not-regress list

1. **The curved beam.** `pw-bfp-source.md:502-517`, `:598`, `:614`. Mouse-look (§2.3) will make players
   sweep hard; a straight re-aimed beam would snap with the sweep and ours will not. **Do not
   "correct" it toward the source.**
2. **`AIR_DRAG = 1.8`** (`entity.js:29`). §3.3.
3. **`PW_KB` and `pwCatchSpeed()`** (`util.js:91-92`). §8.1.
4. **`momentumMult`** (`melee.js:14-17`). §8.5.
5. **Velocity-derived roll** (`entity.js:1832`) — better than BFP's boost-gated cosmetic bank. §1.
6. **The lock-steered approach with the latched pass-through** (`game.js:3263-3278`). BFP never solved
   this and its 22-year-old top request is a lock-on (`POWERWORLD.md:479-483`).
7. **`strikeActive` clamped at zero** (`melee.js:237`) — a negative timer is truthy and once silently
   deleted the entire bot melee mixup.
8. **The `_openSky` test must not move to the front of the flight chain** (`entity.js:1333-1340`).
   §2.2(b) respects this: the servo branches *blend*, they are not bypassed.

### 9.4 Regression gates the city must pass, driven not written

| gate | expected | why |
|---|---|---|
| city flight, tier-3 hero, real fly key + W held: time from rest to top horizontal speed | **0.124 s**, unchanged | proves `A = 9` still applies outside `_openSky` |
| city duel, RAGE haymaker on SOL, real melee path | **7.2 u** carry, unchanged | the §47 baseline |
| synthetic 101 u/s impulse in a city | **16.0 u**, unchanged | the §47 baseline |
| after a PowerWorld match, count entities with `_openSky` / `_chaseKb` | **0** | `clearTransients` (`game.js:1717`) does **not** clear these off entities — it is safe only because the reset paths empty `this.entities` right after (`aaa-00-ground-truth.md:622-627`) |
| city sim, 3000 frames batch-timed, render stubbed | **≈0.680 ms/frame** | the §47 baseline |
| 52 heroes × 364 slots fired in a city | **0 console errors** | the §47 baseline |

### 9.5 The harness laws that have made green tests lie here

- **Drive the gate, not the value.** Both the orbit ceiling and the open-sky flight bug tested green
  because the harness wrote `pos.y` directly (`entity.js:1338-1345`).
- **A shorter test cannot find a higher lid.** The 620-frame flight suite topped out at 456 u and could
  never have found the 684 u band-3 deck (`entity.js:1299-1301`).
- **`input.endFrame()` is called by main.js's rAF loop and NOT by `game.update()`** — a synthetic
  keydown latches forever.
- **The SCHEME owns the key.** Read `KEYMAPS[SETTINGS.scheme].fly`; a tab saved on BRAWLER puts fly on
  `KeyG` and `KeyF` presses become jabs.
- **`entities[1]` is the KMK 9 camera operator, not the opponent** — pick by team.
- **`runSlot(c, key, inp, g)` — fighter first, game last.**
- **Prove the harness first.** A suite that asserts over an empty list passes vacuously
  (`[].every()` is `true`); the slot-facts pass nearly shipped exactly that.
- **Screenshots find what assertions cannot.** Four on record: the black-void stage, the black rubble,
  the 4× boxing ring, the out-of-frame venue seating. **§6 and §5 both need a picture.**

---

## 10. THE LOOP LADDER

Not a schedule. Each loop is a scoped change with a gate; run it until the gate is green.

**Loop 1 — THE VIEW.** Pointer lock + mouse-look driving `world.chase`'s yaw/pitch under
`g.ms.chaseCam`, and the convergent-aim fix (`openjk.md:2072`, fix B). Camera pitch to ±80°
(`PW_AIR.camPitch`).
**Gate:** the crosshair and the impact point coincide at 10 u, 40 u and 200 u (today the miss is a
constant 6.8 u); the camera can be pitched to 80° and the degenerate blend at `world.js:2265-2269`
holds; 0 console errors; **and a screenshot at each of the three ranges.**
⚠ Nothing else in this document is worth building first, and §4 in particular is unfeelable without it.

**Loop 2 — THE MOMENTUM.** `PW_AIR.accel`, the `dir.y` gate fix (§2.2a), and the ascend-servo blend
(§2.2b).
**Gate:** the §3.4 table, all five rows, driven through the real keys. Time to 95 % ∈ [1.55, 1.75] s;
stop distance from 100 u/s unchanged at 55.6 ± 1 u; reversal distance from 100 u/s ∈ [16, 18] u; and
holding SPACE while pitched 45° up produces `vel.y > FLY_RISE` **and** non-zero horizontal speed.
Plus §9.4 rows 1–3.

**Loop 3 — POWER BUYS THE SKY.** `PW_AIR.plGain`, `PW_AIR.top`, and the two `world.chase` companion
changes (§5.5).
**Gate:** `airGain(1.0) == 1.0` exactly (nobody's opening speed moves); TORCH at `powerBuff 1.7` caps
at 210; CIRCUIT at 1.7 reaches 90 ± 2; roster air spread at max power ≤ 2.5×; `want` reaches ≥ 78.7 u
at 210 u/s; **and a screenshot of two fighters at 210 u/s closing** — the framing is the whole point of
the cap and no assertion can see it.

**Loop 4 — THE DRIFT.** `PM_Drifting`, both variants.
**Gate:** the §4.4 displacement table; the `Math.sign(0)` latch proven by a straight-line release
(displacement must be non-zero and must not alternate sign frame to frame).

**Loop 5 — THE POSE.** Pitch unclamp to π under `_openSky`.
**Gate:** `parts.g.rotation.x ≥ 3.0` in a driven vertical dive; ground markers still under the
fighter (the `groundRig` inverse); **screenshot of a vertical dive.**

**Loop 6 — THE BOOST IS A DECISION.** Suppress cruise/burner while guarding and while a beam is firing
(§7.2c).
**Gate:** guard raised at cruise ⟹ speed drops to the un-cruised figure within one frame; a held beam
does the same; the burner's wake breaks apart (`entity.js:882`) rather than leaking a sustained loop.

**Parked, with reasons, not forgotten:**
- **Bot 3-D flight** (§2.2c) — AI lane, but it gates loops 2–5 from being *the mode's* behaviour rather
  than the player's.
- **The view loop** (§6.3) — needs a camera up-vector; screenshot-graded; its own loop.
- **The vertical evade** (§8.4) — small, and arguably belongs with the ground grammar's Zanzoken wiring
  (`pw-bfp-source.md:572`, item 2).
- **The burner as the ×2 beam-struggle lever and the hit-stun gate** (§7.2d) — combat lane,
  `pw-bfp-source.md:598` item 6.
- **`REACH` 190 → 160** (§8.3) — needs Robert's ruling on the speed-vs-reach disagreement first.
- **`plan.bandsLocked`** (`game.js:244` comment) — the structurally correct fix for the per-frame band
  re-assert. Not load-bearing for flight any more, still the right shape.

---

## 11. WHAT ROBERT HAS TO RULE ON

**Q1 — the loop.** BFP lets you pitch past vertical and fly upside down (`pw-bfp-source.md:58-64`).
This document proposes the body pose gets it and the **camera does not**, because BFP's loop is free in
first person and costs a camera rewrite in third (§6.3). **Take the half, or spend the loop?**

**Q2 — the speed cap.** 210 u/s is derived from the chase camera's own damping and distance clamp
(§5.5), which means it is a *readability* bound, not a power fantasy bound. BFP's own number in our
units is 261 and it produced a complaint that ran for 22 years. **Is 210 the right trade, and does the
answer change if the camera gets better?**

**Q3 — outrunning the intercept.** At max power a burner hero cruises 1.84× the catch line, so the
teleport-intercept becomes optional at the top of the ladder rather than mandatory (§8.2). **Payoff or
regression?**

**Q4 — the disagreement in our own docs.** `pw-bfp-source.md:490` says the intercept's speed gate is
invented and the model is wrong; `POWERWORLD.md:448-452` says its catchability is *"an accident worth
making deliberate."* Both are on record and they contradict. §8.3 proposes keeping the speed gate and
deriving the reach gate. **Ruling needed before either is touched.**

**Q5 — flight endurance.** BFP charges 50 ki/s to fly and it buys the most evocative progression in the
source (35 s of sky at spawn, infinite at max). §7.2a refuses it because it would ground the low-ki
half of the roster by the back door. **Confirm, or is there a version worth having?**

---

## 12. CITATION INDEX

**Our engine** — `src/`:

`core/util.js:21` `angleDiff` · `:52` `BAND_DEFAULTS` · `:87-92` `PW_KB` + `pwCatchSpeed`
`engine/entity.js:29` `AIR_DRAG` · `:30` `FLY_RISE/SINK/TAKEOFF` · `:99-102` `FLY_SPEEDS` ·
`:195` `powerBuff` · `:198` `levelMult` · `:294` `toggleFlight` · `:701` the `??` hitstop law ·
`:702-712` `kbMul`/`kbLaunchMul` · `:716` `launchT` arming · `:821` buff expiry ·
`:861-888` the afterburner tick · `:1177` `_physics` call site · `:1249` ascend takeoff ·
`:1256` release-while-aloft · `:1270` `maxBand` · `:1277` launch branch · `:1284-1315` `flyHeld` ·
`:1302` `unlidded` · `:1317-1329` `descendHeld` · `:1332-1349` the open-sky coast ·
`:1350-1371` the deck servo · `:1400-1417` the four drag classes · `:1424` `groundY` ·
`:1450` the landing/flight-exit rule · `:1456` the −38 slam gate · `:1462-1468` the ceiling clamp ·
`:1569-1620` `move()` · `:1573` the speed build · `:1578` the tier air multiplier ·
`:1580-1584` cruise + burner · `:1594-1595` `× 9` · `:1597` `mx` · `:1606-1609` the 3-D branch ·
`:1610-1617` the 2-D branch · `:1823-1833` the flight pose · `:1830` the 1.85 pitch clamp
`engine/melee.js:14-17` `momentumMult` · `:237` `strikeActive` clamp · `:254` the dive punch
`engine/game.js:42` `TAP_DIRS` · `:180-256` `MODE_IMPL.powerworld` · `:186` `ms.chaseCam` ·
`:192/1727` `body.powerworld` · `:227/233/240` `_chaseKb`/`_openSky` · `:244-246` the band re-assert ·
`:380-381` the stale `fwd`/`right` · `:1485-1515` `pickTarget` · `:1589-1620` `cycleLock` ·
`:1717-1784` `clearTransients` · `:2094-2133` `intercept` · `:2095` `CATCH_SPD 132, REACH 190` ·
`:2135-2158` `coneFoe` · `:2543` `levelMult` · `:3146-3197` the aim construction ·
`:3172-3175` the parallax bug · `:3243-3288` the open-sky move basis · `:3269` lock-steer ·
`:3272-3278` the latched swoop · `:3284-3287` `d3` · `:3310` evade direction · `:3319` `p.move` ·
`:3392` `controlPad` (2-D) · `:3433` `controlBot` (2-D) · `:3706-3718` `cameraDrive`
`engine/world.js:2197-2206` `_applyProj` · `:2215-2228` `setCameraMode` · `:2242-2327` `chase` ·
`:2247` the `k` ramp · `:2248` FOV 58→74 · `:2257` the `ay` clamp · `:2265-2269` the degenerate blend ·
`:2285-2287` `FRAME_MAX`/`fit`/`want` · `:2307-2308` shoulder + eye · `:2309-2311` eye damp λ 8/6/8 ·
`:2316-2318` angular shake · `:1454` `screenToGround`
`engine/abilities.js:406` the buff overwrite · `:1058-1065` `EVADE_DEFAULTS` · `:1068` `performEvade`
`engine/powerworld.js:23-69` `STAGE` · `:74-95` `RUBBLE` · `:278-287` `tick`
`engine/hud.styles.js:971-989` `#hCross`

**BFP** — via `docs/powerworld/pw-bfp-source.md` (which carries the `bg_pmove.c` / `g_weapon.c` /
`g_active.c` / `g_combat.c` pointers into LegendaryGuard/BFP @ `d06afa2`):

`:9-33` the reconstruction caveat and the GUESSED list · `:39-64` flight basis + pitch unclamp
(`bg_pmove.c:1216,1240,3425`) · `:66-85` the accel/friction table (`bg_pmove.c:38-45,628`) ·
`:87-102` `PM_Drifting` (`bg_pmove.c:857`) · `:104-131` PL-scaled speed
(`bg_pmove.c:608,1144,1275,1278`) · **`:124` ⚠ the PL-150 flight cell is arithmetically wrong** ·
`:135-142` roll, ki-charge freeze, ultimate tier, the `+= 12` artefact ·
`:159-182` the ki cvar table (`g_cvar.h:74-92`) · `:206-236` the powerstruggle (`g_weapon.c:927`) ·
`:240-262` the melee teleport (`g_weapon.c:185,258,298`) · `:264-286` knockback + hit stun ·
`:288-309` Zanzoken (`g_active.c:801,843-846,899,914,927,930,942`) · `:313-332` movement verdicts ·
`:336-361` damage/health/PL · `:365-464` the weapon config format · `:442-463` the attackset model ·
`:467-534` where we were wrong · `:502-517` the beam (do not regress) · `:537-556` what could not be
found · `:560-614` the seven change items + the do-not-adopt list

`docs/powerworld/pw-esf-research.md` §7.0-7.3 (source-accurate, do not rewrite —
`pw-bfp-source.md:473`): source tiers · flight with unrestricted pitch · the ki economy and the
flight/regen crossover · the PL speed table incl. the PL-50 row that validates the formula

`docs/POWERWORLD.md:415-496` §13: `:425-431` the law of the genre · `:441-455` the intercept
catchability ruling · `:456-463` ESF cutting away from its own camera · `:479-483` the lock-on
evidence

`docs/reference/openjk.md:2045-2085` §7.1 the aim parallax bug and fix (B) · `:2086` camera collision ·
`:2124` the yaw-rate stiffener · `:2144` `runSlot` as the frame-owning hook

`docs/powerworld/aaa-00-ground-truth.md` — the whole document; §1 flight, §3 camera, §4 aim/control,
§7 the flag inventory, §8 what exists/stubbed/missing, §9 do-not-regress, §10 the traps

`docs/powerworld/pw-controls.md:250-296` §2.2 the proposed PowerWorld kbm scheme, incl. `:266` the
pointer-lock gap and `:289-296` the ki-charge finding

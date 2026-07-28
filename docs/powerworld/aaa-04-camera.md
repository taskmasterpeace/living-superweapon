# AAA-04 — THE CAMERA

**"The camera never changes hands."**

The complete camera specification for POWERWORLD's third-person shell. Every claim about our engine
is cited `file:line` as read on 2026-07-27. Every claim about Jedi Outcast / Jedi Academy is cited
`docs/reference/openjk.md:line`; every claim about Bid For Power is cited
`docs/powerworld/pw-bfp-source.md:line` or `pw-esf-research.md:line`. Where the source of a number is
a reconstruction author's guess, or one of our own planning documents' first proposals, it says so
and proposes our own value with a reason.

Scope: `world.chase()`, `world.setCameraMode()`, `world._segBox3()`, `game.cameraDrive()`, and the
data channel that lets a power own the frame. **Not** in scope: the aim/parallax bug
(`openjk.md:2045`, §7.1) — it has its own document — except where the camera must hand it a basis.

---

## 0. THE CONTRACT

Six rules. Everything below is an implementation of one of them.

1. **ONE CAMERA OBJECT PER MODE, ONE ARBITER, ONE PROJECTION SITE.** `world.camera` is a *pointer*
   (`world.js:57-67`); `game.cameraDrive(dt)` (`game.js:3706-3720`) is the only thing that decides
   who drives; `world._applyProj()` (`world.js:2197-2206`) is the only thing that writes a
   projection. **Do not add a second writer to any of the three.**
2. **ALTITUDE IS THE MODE SWITCH, AND IT IS CONTINUOUS.** Not a branch, not a flag, not a cut. Every
   air-vs-ground difference is a `lerp` on one derived scalar `g` (§6).
3. **THE CAMERA ASKS THE WORLD BEFORE IT MOVES.** JKA traces even its 6-unit crouch nudge
   (`openjk.md:158-165`): *"Nothing in this camera moves without asking the world first."* Ours
   currently asks nothing (`world.js:2320`).
4. **THE RETICLE NEVER LIES.** Presentation may decide what is *offered*; it may never decide where
   a hit *lands* (`openjk.md:589-592`). The camera therefore publishes a movement/aim basis that is
   immune to every cinematic flourish it performs.
5. **A NUMBER IS DERIVED OR IT IS WRONG.** Six ladders in this project have been rebuilt because
   they were hand-picked (CLAUDE.md names university standing, the rank ladder's top end, the site
   survey, the beam temper buckets, the aptitude ladder, the base site survey). `world.js:2247`'s
   `/96` is the seventh and it is fixed in §7.
6. **A CAMERA IS A FRAMING PROBLEM AND ASSERTIONS CANNOT SEE FRAMING.** The boxing ring shipped four
   times too big behind six green assertions; the venue's audience was built entirely outside the
   frame; `world.js:2274-2279` is this file's own confession of the same mistake a third time. Every
   gate in §11 that concerns *what the picture looks like* is a screenshot matrix.

---

## 1. THE BASELINE — every number the camera runs on today

### 1.1 The pointer architecture (already correct — do not rebuild)

| thing | site | value |
|---|---|---|
| `world.camera` | `world.js:66` | a **pointer**, initialised to `camOrtho` |
| `camOrtho` | `world.js:62-64` | `frustum 78`, `camDir (0.86,0.92,0.86).normalize()`, `camDist 260`, near 1, far 1400 |
| `camChase` | `world.js:2218` | `new THREE.PerspectiveCamera(58, aspect, 0.6, 4200)`, built lazily |
| `setCameraMode(m)` | `world.js:2215-2228` | swaps the pointer, re-applies quality, **rewrites `p.camera` on every composer pass** (`:2225`), calls `_applyProj` |
| `_applyProj()` | `world.js:2197-2206` | the one place that knows ortho takes `left/right/top/bottom` and perspective takes `fov/aspect` |
| mode claim | `world.js:1307`, `:1330`, `:2243` | **the drive function claims the mode** — `orbit()`→iso, `follow()`→iso, `chase()`→chase. No separate flag to keep in sync |
| `camMode` readers | `world.js:2216`, `:2374` | the tier ladder drops the whole directional-shadow pass in chase |

This is the good part and it is already better than the reference: JKA writes its projection at three
hand-written sites, and so did this file before `_applyProj` (`world.js:2192-2196`).

### 1.2 `chase(subject, target, dt)` — `world.js:2242-2327`, every number

| step | line | value today |
|---|---|---|
| speed factor `k` | `:2247` | `clamp((spd − 14) / 96, 0, 1)` — ⚠ **hand-picked, see §7** |
| FOV target | `:2248` | `damp(fov, 58 + k·16, 4, dt)` → **58 → 74** |
| axis | `:2250-2254` | subject→target; else velocity if `spd > 6`; else `facing` |
| pitch damp | `:2257` | `ay = clamp(ay·0.55, −0.82, 0.82)` (±55.1°) |
| degenerate blend | `:2265-2269` | if `hypot(ax,az) < 0.35`, blend in `subject.facing` weighted `1 − horiz/0.35` |
| `FRAME_MAX` | `:2285` | **52** |
| fit | `:2286` | `(min(gap,52) + 20) / (2·tan(fov/2))` |
| distance want | `:2287` | `clamp(max(24, fit·1.15) + k·16, 24, 86)` |
| distance λ | `:2288` | 3.2 |
| look bias | `:2290` | `clamp(gap·0.012, 0.16, 0.42)` toward the target |
| look point | `:2291` | `S + axis·gap·bias`, `y = S.y + 5.4 + …` |
| look λ | `:2292-2294` | **9 / 7 / 9** (x / y / z) |
| shoulder offset | `:2307` | `off = d · 0.17`, perpendicular and level, applied **inside** the eye calculation |
| eye | `:2308` | `S + (−axis·d) + perp·off`, `y = S.y + 5.4 − ay·d·0.18 + d·0.30` |
| eye λ | `:2309-2311` | **8 / 6 / 8** |
| shake | `:2316-2318` | **angular** — `jit = min(0.028, _shake·0.011)·d`, look point only |
| write | `:2320-2321` | `c.position.set(...)` then `c.lookAt(...)` — **nothing traces** |

### 1.3 The five defects, ordered by what they cost

| # | defect | site | cost |
|---|---|---|---|
| 1 | **The camera does not collide.** | `world.js:2320` | In an empty desert, survivable. Pointed at a city — which is the point of the shell — the camera spends its life inside buildings. `openjk.md:2086` |
| 2 | **Fixed damping rates.** | `world.js:2292-2294`, `:2309-2311` | A fast flick lags exactly as much as a slow pan. The single cheapest fix in the whole reference. `openjk.md:2124` |
| 3 | **`k`'s `/96` is hand-picked.** | `world.js:2247` | A tier-2 levitator at their own absolute top speed reaches **k = 0.275** and never earns more than 4.4° of the 16° widening. §7 |
| 4 | **No ability can say anything about the frame.** | `abilities.js:1023` (`runSlot`) has no camera hook | 364 ability slots, zero frame authority. `openjk.md:2144` |
| 5 | **`punch(z)` does nothing in chase mode.** | `world.js:1299`, read only by `_applyProj`'s ortho branch `:2199-2201` | ~25 call sites in `melee.js`/`game.js`/`abilities.js`/`projectiles.js`/`summons.js` — every one a combat feel beat — silently dead. §9 |

Plus two smaller ones found writing this document, both in §8.

---

## 2. WHAT THE REFERENCE ACTUALLY SAYS ABOUT BFP'S CAMERA

**Almost nothing, and that matters for how §4/§10 are weighted.**

`pw-bfp-source.md:550-552`: *"I did not audit `cgame/cg_view.c` for third-person distance/height/FOV
— out of the brief's scope … `cg_flytilt` (`cg_cvar.h:78`) is the only camera cvar I confirmed."*
And the tree itself is a **reconstruction, not BFP's source** (`pw-bfp-source.md:11-12`), with the
author's own guessed formulas listed at `pw-bfp-source.md:19-27`.

Consequences, stated plainly:

- **There is no BFP camera number to copy.** `pw-camera.md:760-762` says the same in its own words:
  *"GUESS: I am working from the brief's description of that menu, not from the game — I could not
  verify BFP's exact ranges, units, or defaults, and none of the four numbers below are BFP's."*
  So the ANGLE/DISTANCE/HEIGHT/FOV dial ranges in `pw-camera.md:766-771` are **ours**. Present them
  as ours.
- **The one confirmed BFP camera behaviour is roll**, and the two sources disagree:
  `pw-esf-research.md:765` records that the replica banks to **±20°** while a network dump derived
  from *real BFP demo files* runs fly tilt to **±80°** — *"Original BFP banked four times harder."*
  Treat ±80° as the real figure and ±20° as the reconstruction's. Ship it behind a dial, default 0
  (§10.3).
- **Everything structural in this document comes from Jedi Academy**, which we can read as source.
  That is the correct division of labour and it matches the thesis: BFP is the *air grammar*
  (flight, ki, powerstruggle); JKA is the *camera and the ground grammar*.

---

## 3. CAMERA COLLISION — the full fix

`openjk.md:2086` (§7.2) is correct that the primitive already exists. Here is the whole change.

### 3.1 Return the number the function already computes

`world._segBox3(x0,y0,z0, x1,y1,z1, c)` — `world.js:1439-1451`. It computes `tmin` by the slab
method and then throws it away:

```js
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }
    return tmin > 0.02 && tmin < 0.98;      // world.js:1450
```

**Change it to return `tmin`, or `-1` for a miss.** It has exactly one caller today —
`updateOcclusion` at `world.js:1364` — which becomes:

```js
const t = this._segBox3(cam.x, cam.y, cam.z, p.x, p.y + 6, p.z, c);
const hit = t > 0.02 && t < 0.98;                    // the old expression, unchanged, at the caller
```

⚠ **One slab test in the codebase, never two.** This is the `NO_RESCUE` / `validatePlan` law
(CLAUDE.md: *"Export the rule; never reimplement it"*), and it is why this is an edit to
`_segBox3` rather than a new `_traceBox3` beside it.

⚠ **`tmin` starts clamped at 0, so "segment starts inside the box" returns 0.** That is a real case
for a camera (a look point that has ended up inside geometry) and JKA handles it by construction —
its first trace starts at the *player's own eye*, which is never in solid (§3.3).

### 3.2 A FOUND DEFECT: `_segBox3` cannot take an interior wall

`world.js:1440`: `const top = c.top ?? c.h;`. An interior wall record is
`{ x, z, hx, hz }` — no `top`, no `h` (`citytiles.js:394`). So the Y slab becomes `[0, undefined]`,
`t1`/`t2` are `NaN`, `tmin > tmax` is **false** for NaN, the loop falls through, and the function
returns whatever the X/Z slabs decided. It reports a hit on any wall the segment passes *near*, at
any altitude, including 300u overhead.

Nobody has hit this because `hitInteriorWall` (`world.js:674-682`) does its own 2-D box test and
never calls `_segBox3`. **The camera trace is the first caller that would.** Two parts to the fix:

1. Guard at the top of `_segBox3`: `const top = c.top ?? c.h; if (!(top > 0)) return -1;`
2. The camera's interior adapter supplies it: `{ x: wl.x, z: wl.z, hx: wl.hx, hz: wl.hz, top: it.top }`.

### 3.3 The two traces, in JKA's order

`openjk.md:298-311`. The order is the whole trick and the comment says why: *"The target is
validated against the player's actual eye first, and the eye is then traced from the already-corrected
target. So the camera can never be pulled to a position whose look-at point is itself inside geometry
— which is the failure that makes naive chase cameras spin when you back into a corner."*

Our insert points, in `chase()`:

```
A. after the look damp (world.js:2294):
     trace  eye0 = (S.x, S.y + 5.4, S.z)   →   (camTarget.x, camTarget.y, camTarget.z)
     if hit: write the clipped point BACK INTO this.camTarget

B. after the eye damp (world.js:2311):
     trace  (camTarget)                    →   (camPos.x, camPos.y, camPos.z)
     if hit: write the clipped point BACK INTO this.camPos

C. terrain floor, unconditional:
     camPos.y = max(camPos.y, world.heightAt(camPos.x, camPos.z) + PAD)     // world.js:1475
```

⚠ **Write into the damped state, not a separate variable** (`openjk.md:2113-2115`, source at
`cg_view.cpp:689`): *"Because JKA stores the clipped position in the damped value, the next frame
damps from the corrected point and the recovery when you step off the wall is smooth for free. One
state, not two."* Our damped state is `this.camTarget` (`world.js:2292-2294`) and `this.camPos`
(`world.js:2309-2311`), and both are already fields on the world. So the clip is two assignments.

⚠ **The shoulder offset is already on the right side of the line and must stay there.** JKA applies
its horizontal offset *after* both traces (`cg_view.cpp:881`, comment `// Temp: just move the camera
to the side a bit`) and it is therefore untraced — `openjk.md:368-370` calls that out, and
`openjk.md:736-737` notes the vehicle path is the finished version that does trace it. Our `off = d
· 0.17` is computed **inside** the eye expression at `world.js:2307-2308`, so trace B already covers
it. **Do not refactor it out.**

⚠ **No push-out, no lerp, no swing-around** (`openjk.md:313-318`). Raven explicitly removed id's
`view[2] += (1.0 - trace.fraction) * 32;` fudge. The camera stops at the trace endpoint. Recovery is
the damping.

### 3.4 The pad — DERIVED, and the research doc's estimate needs replacing

`openjk.md:2106-2108` says: *"JKA uses `CAMERA_SIZE 4` on a ~64u-tall player; at WWA's 1u ≈ 0.19m
that is roughly 2–3u."* **That arithmetic does not reproduce.** By body-height ratio, a Quake 3
player standing is 56u (bbox −24…32) and `CAMERA_SIZE 4` (`cg_view.cpp:36`, `openjk.md:286`) is
7.1% of that; 7.1% of our 9.6u fighter is **0.69u**, not 2–3u. The estimate is not derived from
anything and should not be used.

**The correct derivation is the near-plane corner radius**, because that is what the pad physically
protects. For a perspective camera the eight near-plane corners sit at distance:

```
nearCorner(near, fovV, aspect) = near · sqrt( 1 + tan²(fovV/2) · (1 + aspect²) )
```

| `near` | fov 76° @ 16:9 | fov 76° @ 21:9 |
|---|---|---|
| 0.6 (today, `world.js:2218`) | 1.13u | 1.33u |
| **1.2 (recommended)** | **2.26u** | **2.67u** |
| 2.0 | 3.76u | 4.45u |
| 4.0 (`pw-camera.md:197` wants this for depth precision) | 7.52u | 8.90u |

```js
const CAM_PAD = nearCorner(c.near, this._chaseFov, innerWidth / innerHeight) * 1.35;
```

At `near = 1.2`, 16:9, the pad is **3.05u** — which lands on the research doc's guessed "2–3u" by a
route that is actually a derivation. The 1.35 safety factor covers the frame of damping between the
trace and the next one at up to ~90 u/s of camera speed.

⚠ **`near` is a genuine open tension and it is a measurement, not an argument.**
`pw-camera.md:175-200` (§1.7) is right that every `GROUND_LAYER` rung and `DECAL_LIFT = 0.35`
(`core/util.js:90`) was calibrated against a *linear* orthographic depth buffer, and that a
perspective `1/z` distribution at `near = 0.6` will tear at 42–90u. It recommends `near = 4`. But
the table above shows `near = 4` costs **7.5u of clearance** against a `DIST_MIN` of 24
(`world.js:2287`) — 31% of the minimum standoff. Both concerns are real; §12 owes the measurement.
**Whatever `near` becomes, `CAM_PAD` is computed from it. Never hand-pick the pad.**

### 3.5 The blocker set — `MASK_CAMERACLIP`

`openjk.md:291-293`: MP uses `MASK_SOLID|CONTENTS_PLAYERCLIP` so *"level designers paint invisible
camera blockers using the existing playerclip brushes"*, and `openjk.md:2121-2122` recommends we do
the same. Two data fields on the cover record, no id checks:

- `c.noCam === true` — solid to bodies, invisible to the camera. The immediate customer is the
  boxing venue: its seating is deliberately **not** registered as cover at all (CLAUDE.md, THE
  VENUE) precisely because there was no way to say "this blocks nothing but I don't want the lens in
  it". `noCam` is the other half of that.
- `c.camOnly === true` — blocks the camera only. Nothing needs it yet; it is the field that makes
  the rule a rule rather than a special case, and `validatePlan` should not require it.

### 3.6 Cost

Loop over `world.cover` + `world.interiors[].walls`, twice per frame. Worst measured city: **99
cover pieces** on an 8×8 override (CLAUDE.md, the density budget `min(64, round(N²·0.82)+4)`; Tokyo
measures 79) and **28 interiors** at ~8 walls each. Call it 99 + 224 = 323 boxes × 2 traces = 646
`_segBox3` calls per frame. `updateOcclusion` already loops all of `world.cover` unguarded every
frame at `world.js:1362` and costs nothing measurable, so this is the same cost class, not a new one.

Broadphase if it ever matters: one squared-distance reject per box against the segment midpoint
(`|c − mid|² > (halfLen + hx + hz)²` → skip). Do not add it speculatively.

### 3.7 What this replaces

`pw-camera.md:628-629`: with real collision, PowerWorld sets a flag that makes `updateOcclusion`
skip the `this.cover` loop entirely — **a net perf win**, no lazy material clones, no dispose churn.
⚠ And it removes a live hazard: PowerWorld's spires register `mesh`, so they are eligible for the
cutaway today, and the fade holds a cloned material keyed on the cover record — closing the stage
mid-fade strands it (CLAUDE.md §47 records that `close()` has to unwind `world._fades` by hand).
Collision makes the cutaway unnecessary in the dimension, which makes the unwind unnecessary too.

---

## 4. THE YAW-RATE STIFFENER

`openjk.md:2124` calls this *"the single cheapest thing in the whole reference and … the difference
between a damped camera that feels smooth and one that feels like it is fighting you."* Agreed.

### 4.1 The source, exactly

`cg_view.cpp:843-860` via `openjk.md:215-224`:

```c
deltayaw = fabs(cameraFocusAngles[YAW] - cameraLastYaw);
if (deltayaw > 180.0f) deltayaw = fabs(deltayaw - 360.0f);   // normalize across the seam
cameraStiffFactor = deltayaw / (float)(cg.time-cameraLastFrame);
if      (cameraStiffFactor < 1.0) cameraStiffFactor = 0.0;
else if (cameraStiffFactor > 2.5) cameraStiffFactor = 0.75;
else                              cameraStiffFactor = (cameraStiffFactor-1.0f)*0.5f;
```

applied at `cg_view.cpp:646` (`openjk.md:228-234`):

```c
dampfactor += (1.0-dampfactor)*cameraStiffFactor;
```

Units: **degrees per millisecond**, which is an easy scale to misread. Converted:

| stiff factor | °/ms | °/s | ° per 60fps frame |
|---|---|---|---|
| 0.0 — dead zone ends | 1.0 | 1000 | **16.7°** |
| 0.75 — saturated | 2.5 | 2500 | **41.7°** |

So the stiffener is inert during ordinary tracking — following a foe across the screen is tens of
degrees per *second*, three orders of magnitude below the dead-zone edge — and saturates only on a
flick that crosses 42° inside a single frame. That scale is exactly what makes it invisible until
you want it, and it is why §11 Loop 2's gate has to test both ends.

### 4.2 The translation into our `damp()` — no magic constant needed

Our `damp(a, b, λ, dt) = lerp(a, b, 1 − exp(−λ·dt))` (`core/util.js:8`) and JKA's ratio form are the
same family; `openjk.md:190-192` says so. The exact relationship is
`damp_JKA = 1 − exp(−λ · 0.05)` (JKA normalises to "fraction closed per `CAMERA_DAMP_INTERVAL` 50ms",
`cg_view.cpp:312`, `openjk.md:178`).

It is tempting to translate the stiffener into a λ multiplier. **Do not** — the multiplier is not
constant across λ (it is 4.89× at JKA's eye damp and 3.0× at its target damp). Instead apply JKA's
rule in ratio space, where it is exact and dimensionless. One new helper in `core/util.js`, next to
`damp`:

```js
// THE YAW-RATE STIFFENER (openjk.md:228-234 / cg_view.cpp:646). `stiff` in [0,1] is how much of the
// REMAINING lag to shave off — 0 is plain damp(), 1 is a hard snap. Expressed on the closed
// FRACTION rather than on lambda, because the lambda multiplier that reproduces JKA is different
// for every lambda and would be a magic constant per channel.
export const dampStiff = (a, b, lambda, dt, stiff = 0) => {
  let closed = 1 - Math.exp(-lambda * dt);
  if (stiff > 0) closed += (1 - closed) * stiff;
  return lerp(a, b, closed);
};
```

Effect at 60fps, λ 8: `closed` goes **0.125 → 0.781** at full stiffening — the camera closes 78% of
the gap in one frame instead of 12.5%, an effective λ of ~91. That is the number to expect in a test.

### 4.3 Which yaw

`chase()` has no explicit yaw state; it derives an axis `(ax, ay, az)` at `world.js:2250-2270`. The
yaw to measure is the yaw of that axis **after** the degenerate blend (`:2265-2269`) and
normalisation (`:2270`), because that is the direction the camera is actually trying to look along:

```js
const yaw = Math.atan2(ax, az);
const dYaw = Math.abs(angleDiff(this._chaseYaw ?? yaw, yaw));   // core/util.js:21
this._chaseYaw = yaw;
const rate = (dYaw * 57.29577951) / Math.max(0.001, dt * 1000);  // deg/ms — JKA's unit
const yawStiff = rate < 1 ? 0 : rate > 2.5 ? 0.75 : (rate - 1) * 0.5;
```

⚠ **The ±180 seam is already solved and we already own it.** `openjk.md:2135` warns about it;
`angleDiff` (`core/util.js:21`) does exactly JKA's `if (deltayaw > 180) deltayaw = fabs(deltayaw-360)`
and is the same function CLAUDE.md's targeting law mandates (*"never revert to naive damp — it
pirouettes 355° across the atan2 seam"*). **Use `angleDiff`. Never subtract two atan2 results.**

### 4.4 Pitch also reduces damping — and the divisor is derived, not copied

`openjk.md:240-249`, `cg_view.cpp:634-643`:

```c
pitch = Q_fabs(cameraFocusAngles[PITCH]);
pitch /= 115.0f;
dampfactor = (1.0-cg_thirdPersonCameraDamp.value)*(pitch*pitch);
dampfactor += cg_thirdPersonCameraDamp.value;
```

⚠ **The divisor is not the clamp, deliberately.** JKA clamps pitch to ±89° (`cg_view.cpp:493`,
`:832`) and divides by **115**, so at full pitch the term is `(89/115)² = 0.599` and the camera is
*still damped*. Jedi Outcast divided by **89** — the same number as the clamp — so damping switched
**off completely** at full pitch (`openjk.md:255-261`). *"JA softened a hard cut-off into a curve
that never quite reaches its limit."* Take JA's version.

Ours: `ay` is clamped to ±0.82 at `world.js:2257`, i.e. ±`asin(0.82)` = **±0.961 rad (55.1°)**. To
reproduce JA's 1.292 ratio between divisor and clamp: divisor = 0.961 × 1.292 = **1.242 rad**.

```js
const pAbs = Math.abs(Math.asin(clamp(ay, -1, 1)));
const pitchStiff = (pAbs / 1.242) ** 2;              // max 0.598 at the clamp — JA's 0.599, derived
```

### 4.5 Combining, and the cap

```js
const stiff = Math.min(0.85, Math.max(yawStiff, pitchStiff));
```

`max`, not sum: they are two symptoms of one problem (the eye swinging through a large arc for a
small angular change) and adding them double-counts a diving flick. The **0.85 cap** is the JO→JA
lesson generalised — damping must never switch off entirely, or a hard flick teleports the lens.

### 4.6 Which channels take it

- **The eye** (`world.js:2309-2311`, λ 8/6/8) — **yes.** JKA applies it in the camera block
  (`cg_view.cpp:646`).
- **The look point** (`world.js:2292-2294`, λ 9/7/9) — **not in slice 1.** JKA's look point is
  already the *fast* channel and does not need it. §12 owes the A/B.
- **Distance and FOV** — **no.** Those are aesthetic envelopes; stiffening them makes a flick read
  as a zoom snap.

### 4.7 A REAL FINDING: our two damping channels are almost the same rate

Converting JKA's cvars to our λ (`λ = −ln(1 − d) / 0.05`):

| JKA channel | cvar default | our λ equivalent |
|---|---|---|
| `cg_thirdPersonCameraDamp` (the eye) | 0.3 (`cg_main.cpp:76`, `openjk.md:76`) | **7.13** |
| `cg_thirdPersonTargetDamp` (the look) | 0.5 (`openjk.md:77`) | **13.86** |
| ratio look : eye | — | **1.94** |

| ours | site | λ | ratio |
|---|---|---|---|
| eye | `world.js:2309-2311` | 8 / 6 / 8 | — |
| look | `world.js:2292-2294` | 9 / 7 / 9 | **1.125** |

**Our eye is within 12% of JKA's.** Our look point is 35% *lazier* than JKA's in absolute terms and,
more importantly, runs at almost the same rate as the eye — so the two-damped-point structure
(`openjk.md:112-114`: *"a look-at point and an eye position are damped separately, at different
rates, and the view angle is whatever vector connects them afterwards"*) is not actually producing
two behaviours. We have the architecture and not the effect.

**Proposal, flagged as a proposal:** raise the look point to **13 / 10 / 13** (ratio 1.63). Gate it
on the §11 Loop 5 screenshot matrix, not on an assertion. Keep the eye at 8/6/8.

### 4.8 The kill switches — `world.snapChase()`

`openjk.md:2138-2142`: *"A damped camera with no snap path is a camera that will one day be seen
flying across the map."* JKA has two: `dampfactor = 1.0` on a moving platform (`cg_view.cpp:544`,
`:612`) and `CG_ResetThirdPersonViewDamp()` on a time discontinuity (`:488`, called at `:825`).

```js
// world.js — consumed by the NEXT chase() call, which copies ideal → damped with no lerp.
snapChase() { this._chaseSnap = true; }
```

Call it from, and only from:

| trigger | site | why |
|---|---|---|
| first frame in chase mode | `setCameraMode('chase')`, `world.js:2215` | `camTarget`/`camPos` are inherited from the ortho drive — a 260u-distant eye. Today only `_chaseDist ?? want` (`:2288`) half-handles this and the first chase frame flies in from the isometric position |
| `mapCam` released back to chase | `game.cameraDrive`, `game.js:3707` | a cinematic ends and `orbit()` has left the camera in ortho at its own position (`world.js:1307`) |
| match reset | `game.clearTransients`, `game.js:1717` | the reset law |
| teleport-intercept | `game.intercept`, near `game.js:2109` | the subject is somewhere else this frame |
| portal hop | `game.updatePortals` | same |
| respawn | `_updateKO` restore path | same |

⚠ **`launchT > 0` must NOT snap.** A knockback is continuous motion, not a discontinuity, and
snapping every frame of a 2.6s `PW_KB.window` would strobe. It is our *moving-platform* analogue and
takes JKA's other treatment — a rate change, derived from the lag equation. For first-order damping
chasing a constant velocity the steady-state lag is `v / λ`:

| state | speed | λ 8 lag | with the fix |
|---|---|---|---|
| cruise | 64 u/s | 8.0u | — |
| PowerWorld launch peak (CLAUDE.md §47) | 103.8 u/s | **13.0u** (1.35 fighter heights of trailing) | λ 24 → **4.3u** |

```js
const kbλ = 8 * (1 + Math.min(2, spd / 40));     // 8 at rest, 24 at 103.8 u/s
```

applied to the eye channels while `subject.launchT > 0`. `/40` is `40 = 103.8 / 2.6`, i.e. the speed
at which the ×3 cap is reached is pinned to the measured PowerWorld launch peak — derived from the
number the dimension actually produces.

---

## 5. A POWER OWNS THE FRAME

`openjk.md:2144-2181` (§7.4) calls this *"the most transferable idea in the whole reference, and WWA
has all the parts."* It is right. `abilities.js:1023-1054` (`runSlot`) is the one door every
activation goes through and nothing in the ability layer currently owns the camera
(`aaa-00-ground-truth.md:495-496`).

### 5.1 The three source patterns

| pattern | source | what it does |
|---|---|---|
| **Force Speed** | `cg_view.cpp:466`, tables at `wp_saber.cpp:265-287` (`openjk.md:594-620`) | range `+30/45/60` and FOV `+20/30/40` by power level, **ease in over 1000ms, ease out over 500ms — the ramp out is twice as fast**, so the power snaps off |
| **The animation drives it** | `g_active.cpp:1409-1423`, `bg_pangles.cpp:283-296` (`openjk.md:626-651`) | `backDist` to 120u and `viewDip` to −120, both **triangle envelopes keyed to the animation's own `animLength` and remaining `legsAnimTimer`** — *"it cannot desynchronise from the move, and it works at any animation speed"* |
| **The vehicle declares its camera as data** | `bg_vehicles.h:276-282`, parsed by a keyword→offset table at `bg_vehicleLoad.c:544` (`openjk.md:707-722`) | `cameraRange` / `cameraVertOffset` / `cameraHorzOffset` / `cameraPitchOffset` / `cameraAlpha` in a text file |

And the override channel itself (`cg_local.h:297-302`, `openjk.md:691-705`): a struct of values plus
a `CG_OVERRIDE_3RD_PERSON_*` flag word, read as `if (active & FLAG) use override; else use cvar;`.
*"This is exactly WWA's `mapCam` idea, but per-parameter rather than all-or-nothing — a script can
take the range and leave the damping alone."*

### 5.2 The block a def / ability row / MODE_IMPL entry may carry

```js
camera: {
  range: +18,      // ADDS to the computed `want`  (world units)
  fov:   -6,       // ADDS to the computed fov target (degrees)
  vert:  +3,       // ADDS to the look point's world Y (world units)
  horz:  +0.10,    // ADDS to the shoulder offset FRACTION (base 0.17, world.js:2307)
  pitch: -0.06,    // ADDS to the eye's height-over-distance FRACTION (base 0.30, world.js:2308)
  yaw:   +1.57,    // ADDS to the camera yaw (radians) — this is JKA's cg_thirdPersonAngle
  damp:  0.5,      // MULTIPLIES the eye lambda (0.5 = twice as loose, 2 = twice as tight)
  in: 1.0, out: 0.5,          // envelope seconds. Asymmetric BY DEFAULT — openjk.md:2152
  shape: 'hold' | 'tri',      // hold at full while live, or a triangle peaking at phase 0.5
  phase: 'charge',            // which of the MOVE's own clocks drives it (never a camera timer)
  pri: 20,                    // higher wins; equal → newest
}
```

Every absent field is a null claim. **This is the flag word**, expressed the way JS makes free —
JKA needed a bitmask only because C has no null float.

⚠ **EVERY FIELD ADDS OR MULTIPLIES; NONE REPLACES. THIS IS A DELIBERATE DIVERGENCE FROM THE
SOURCE.** JKA's overrides replace the cvar, and JKA's cvars are *constants*. Ours are computed every
frame from the gap (`world.js:2286`), the speed (`:2247`) and the altitude (§6). A power that
*replaced* `range` with 60 would defeat the fit rule and reintroduce exactly the cutscene framing
`world.js:2274-2279` already paid for once. Additive claims compose with derived framing; replacing
ones fight it.

### 5.3 The envelope is read from the move, never from a camera timer

`openjk.md:650-651` is the reason: *"The envelope is not a timer the camera owns — it is read from
the animation's remaining frames, so it cannot desynchronise from the move, and it works at any
animation speed."* Our equivalents, all already live state:

| `phase` | source | site |
|---|---|---|
| `'charge'` | `f.meleeCharge` normalised by the haymaker threshold (0.55s) | `melee.js` chargeUpdate |
| `'slot'` | `st.chargeT / st.def.maxCharge` | `abilities.js` charge — ⚠ clamp it, CLAUDE.md records `undefined/max = NaN` slipping through the fizzle guard |
| `'anim'` | `1 − f.strikeActive / STRIKES[id].active` | `melee.js`, table `data/martial.js:21-27` |
| `'dur'` | `1 − st.t / st.def.dur` | `abilities.js` buff / nova |
| `'live'` | 1 while the claim is held, 0 when released | the default; the `in`/`out` ramps do the rest |

### 5.4 The API

```js
// game.js — beside runSlot's other hooks
frameClaim(f, spec, key = 'default') {
  // ⚠ GATED ON THE MOVER BEING THE PLAYER. openjk.md:687-689 / :2173-2175: JKA gates every one of
  // its camera moves on `ent->s.number < MAX_CLIENTS || G_ControlledByPlayer(ent)`. An AI doing the
  // identical move moves no camera. The camera is part of the MOVE'S PRESENTATION TO ITS OWNER.
  if (!this.humans.length || this.humans[0].fighter !== f) return;
  ...
}
frameRelease(f, key) { ... }
```

⚠ **Two-player split has one camera.** Claim only from `humans[0]`. (In chase mode the question does
not arise — `cameraDrive` at `game.js:3708` frames `this.player` and nobody else.)

⚠ **It is a transient and must be in `clearTransients`** (`game.js:1717`) — the reset law. A live
claim surviving a match reset is a camera stuck 18u back for the next fight, and CLAUDE.md's ledger
of exactly this class of bug is long.

### 5.5 The read sites in `chase()`

Six lines, all `?? default` or `+ (ov.x || 0)`:

| field | line today | becomes |
|---|---|---|
| `fov` | `:2248` | `58 + k·16 − 6·clinch + (ov.fov \|\| 0)` |
| `want` | `:2287` | `clamp(max(24, fit·1.15) + k·16 + (ov.range \|\| 0), 24, 86)` |
| look Y | `:2291` | `S.y + 5.4 + ay·gap·bias + (ov.vert \|\| 0)` |
| shoulder | `:2307` | `off = d · (0.17 + (ov.horz \|\| 0))` |
| eye lift | `:2308` | `d · (hFrac + (ov.pitch \|\| 0))` — `hFrac` from §6 |
| eye λ | `:2309-2311` | `8 · (ov.damp ?? 1)` etc. |

Plus `ov.yaw` rotating `(ax, az)` about Y **after** the basis is published (§5.6). That is JKA's
`G_CamCircleForLegsAnim` (`g_active.cpp:2217`, `openjk.md:656-663`) — six lines, a full 360° orbit —
and Force Drain's three-phase swing-to-90°-hold-swing-back (`g_active.cpp:2841-2862`,
`openjk.md:665-685`), both expressible as `{ yaw, shape:'tri', phase:'anim' }` with no new machinery.

### 5.6 ⚠ THE CLAIM MAY NEVER ROTATE THE MOVEMENT BASIS

`openjk.md:2177-2180`: *"JKA's camera can orbit a full 360° while movement stays keyed to
`pm->ps->viewangles` … A camera flourish that inverts the controls is a bug, and the separation is
what prevents it."*

We currently read the **live camera** for the basis in two places:

- `game.js:3281` — `this.world.camera.getWorldDirection(cf)`, the unlocked flight forward
- `game.js:3173` — the same call, the unlocked aim fallback

Either would invert the controls the instant an `ov.yaw` claim fired. The fix is one field:

```js
// world.js, inside chase(), written AFTER the degenerate blend and normalisation (:2270)
// and BEFORE any claim is applied. This is the UNCLAIMED axis — pm->ps->viewangles.
this.camBasis.set(ax, ay, az);
```

and `game.js:3281` / `:3173` read `world.camBasis` instead of `camera.getWorldDirection()`.

⚠ **And `this.fwd` / `this.right` are stale behind a chase camera** — computed **once** in the
constructor from the isometric `camDir` (`game.js:380-381`), still read by the pad aim branches
(`:3149`, `:3161`, `:3385`), the double-tap evade direction (`:3310`), and the
`moveRelative === 'camera'` path (`:3298`). `aaa-00-ground-truth.md:465-466` states the consequence:
**double-tap evade in PowerWorld dashes along isometric axes.** Fix: recompute them at the *end* of
`cameraDrive` (`game.js:3706-3720`), from `world.camBasis` flattened. One writer, one place, inside
the arbiter that already exists — not a second writer.

---

## 6. ONE CAMERA ACROSS BOTH GRAMMARS

**"Leave the ground and you are playing Bid for Power. Touch it and you are playing Jedi Academy."**
The camera must express that without a cut, a branch, or a mode flag.

### 6.1 The one scalar, and where its number comes from

```js
const gh  = subject.pos.y - (subject.groundY ?? 0);      // height above the ground UNDER YOU
const g   = 1 - smoothstep(clamp(gh / MELEE_VGATE, 0, 1));   // 1 = ground grammar, 0 = air grammar
```

`MELEE_VGATE = 10` — **imported, not written.** It is the melee vertical gate at `game.js:2153`
(`if (dy > 10) continue;`). The ground grammar is exactly the band over which a grounded opponent
can still be punched; above it the fight is no longer a ground fight *by the engine's own
definition*. If the gate moves — and POWERWORLD.md's defect ledger calls it *"probably the
highest-leverage single constant in the design"* — the camera moves with it. One number, two
consumers, no drift.

`smoothstep` is `core/util.js:25`. `subject.groundY` is cached once per frame by `entity._physics`
(CLAUDE.md, THE GROUND IS REAL).

⚠ **DO NOT USE `f.flying`.** It is a *mode* — a toggle — not a height. A fighter who presses F while
standing on the ground would flip the camera's entire grammar without moving an inch. Note that
`coneFoe` branches on `caster.flying && f.flying` (`game.js:2153`) and that is *correct there*,
because reach is about intent; framing is about geometry.

⚠ **No hysteresis is needed and none should be added.** `g` is a smoothstep over the whole 0→10u
range, not a threshold, so its derivative is bounded and a fighter bobbing across 5u cannot chatter
it. Adding hysteresis would introduce the discontinuity the design forbids.

### 6.2 What actually differs, and what does not

| parameter | ground (g=1) | air (g=0) | expression | why |
|---|---|---|---|---|
| **eye height fraction** | 0.30 | 0.16 | `hFrac = lerp(0.16, 0.30, g)`, replacing the constant `0.30` at `world.js:2308` | 16.7° down vs 9.1° down. Grounded, you must read the **floor you are fighting on** — that is the whole Jedi Academy read, and `world.js:2297-2299` records that the first version looked *up* and produced a "staring up at a giant" frame. Airborne there is no floor; the horizon is the reference and a high camera reads as a map view |
| **speed reference** | `vRefGnd` | `vRefAir` | `vRef = lerp(vRefAir, vRefGnd, g)` (§7) | Without it a sprinting brawler — ceiling `def.speed × 1.08` = **35.6 u/s** at speed 33 — never earns a single degree of FOV widening, because `k` is measured against a 139 u/s air ceiling. This is the one place the mode switch genuinely *has* to touch a number, and it is why it must be a lerp rather than a branch |
| **clinch narrowing** | active | inactive by construction | `clinch` from `gap` (§7.3) | A ground fight has a small `gap` by definition, so `clinch` already rides `g` for free. Do not gate it on `g` as well — that double-counts |
| **distance** | — | — | **unchanged** (`world.js:2286-2287`) | ⚠ **A FINDING: distance is already continuous across both grammars and needs no altitude term.** `fit` derives it from `gap`, and a ground fight has a small gap by construction. Adding an altitude term would double-count and would break the one case that matters most — a grounded fighter fighting an airborne one, where the gap is large and the ground grammar is still in force |
| **look-point lift** | 5.4 | 5.4 | **unchanged** (`world.js:2291`, `:2308`) | ⚠ Do not make this a function of altitude. 5.4u is 56% of a 9.6u fighter — chest height — and it is the number the off-shoulder framing at `:2307-2308` was tuned against |
| **shoulder offset** | 0.17 | 0.17 | **unchanged** (`world.js:2307`) | The 360°-threat argument recorded at `world.js:2304-2305` (an ESF player's objection that an offset *"shrinks your right side view angle"*) applies in both grammars. It is why the number is 0.17 and not 0.5 |
| **FRAME_MAX** | 52 | 52 | **unchanged** (`world.js:2285`) | The rule *"beyond this the camera frames YOU and the HUD's off-screen foe arrow does its job"* is grammar-independent |

**Two parameters change. Five do not.** That is the finding, and it is a good one: the framing rule
built for the air already generalises, because it was derived from the *gap* rather than from the
altitude.

### 6.3 The camera never cuts, and this is provable

Every consumer of `g` is a `lerp` of a `smoothstep` of a continuous quantity. There is no frame at
which anything jumps. **The only thing in the whole camera that can cut is `snapChase()`** (§4.8),
which is why its call list is six explicit sites and not a heuristic.

Gate: Loop 5 in §11 asserts this numerically — a scripted vertical takeoff through the whole 0→20u
band, with the max per-frame delta of `g`, `fov`, `dist` and eye height each under 3% of their range.

### 6.4 What the ground grammar earns that the air one does not

`openjk.md:2182-2203` (§7.5) is the rule and it has two halves that must not be confused:

- **Presentation MAY decide what is offered.** Jedi Academy gates four acrobatic saber moves on
  `cg.renderingThirdPerson && !cg.zoomMode` (`bg_panimate.cpp:2366`, `:2447`, `:3651`, `:3757`) —
  *"a somersault you cannot see is not worth having."*
- **Presentation MAY NEVER decide where a hit lands.** Aim originates at the character precisely so
  the camera cannot corrupt it (`openjk.md:589-592`).

⚠ And take the warning with the rule: *"JKA's version is four copies of the same compound
conditional inlined at four call sites, which is how a rule like this drifts. One predicate —
`shellAllows(f, 'acrobatic')` — read at each site."*

The camera's contribution is to **publish `g` on the fighter** (`f._camG`) so a future move gate has
one honest number to read. Nothing gates on it in slice 1. Do not invent gates here; that belongs to
the combat document.

---

## 7. `vRef` — killing the seventh hand-picked ladder

### 7.1 The defect

`world.js:2247`: `const k = clamp((spd - 14) / 96, 0, 1);`

`96` is a constant. `pw-camera.md:459-462` names the pattern: *"This project has burned itself five
times on ladders built from hand-picked constants instead of from the distribution … A single
`if (speed > 80)` here would be the sixth."* This is that constant, shipped.

What it costs, using the speed table at `pw-camera.md:433-447` (which is arithmetic over
`entity.js:1485-1495` and cross-checks against CLAUDE.md's recorded afterburner measurement of
71.8 → 100.5, a ratio of exactly the `mult/1.5` factor):

| fighter | own air ceiling | `k` at their own top speed, today |
|---|---|---|
| tier-2 levitator (speed 32) | 40.4 u/s | **0.275** |
| mid tier-3, no `FLY_SPEEDS` row (speed 33) | 64.1 u/s | 0.522 |
| SOL (34, ×1.20, burner) | 111.0 u/s | 1.0 (reached at 110) |
| TORCH (40, ×1.28, burner) | 139.3 u/s | 1.0 (reached at 110, 79% of ceiling) |

**A levitator flying flat out never earns more than 4.4° of the 16° widening, and TORCH saturates
with 21% of their speed range left.** The camera is telling two thirds of the roster that they are
standing still.

### 7.2 The fix

Per `pw-camera.md:464-485`, using the same expression `move()` uses so it cannot drift:

```js
// world.js — cached on the fighter, recomputed only when `def` changes.
vRefAir(f) = def.speed × 1.08
           × (flightTier >= 3 ? flySpeed × 1.2 : flightTier === 2 ? 0.78 : 0.95)
           × 1.5                                    // cruise
           × (def.afterburner ? def.afterburner.mult / 1.5 : 1)
vRefGnd(f) = def.speed × 1.08
```

⚠ **Multiply the live buff at read time, not at cache time.** `pw-camera.md:934-937` flags that its
own table assumed `powerBuff = sprint = moodMult = 1`, and in a real fight `powerBuff` rides tier and
buffs (`game.js:3601`) while mood multiplies speed (`entity.js:1485`). One multiply per frame:
`vRef × (f.powerBuff || 1)`.

```js
const vRef = lerp(vRefAir, vRefGnd, g) * (subject.powerBuff || 1);      // §6
const k = smoothstep(clamp((spd - 0.30 * vRef) / (0.62 * vRef), 0, 1));
```

`k = 0` below 30% of **your** ceiling (hover, drift, walking); `k = 1` at ~92% of it. After the fix a
levitator reaches `k = 1` at 37.2 u/s and TORCH does not at 60 — which is the correct answer and it
falls out of the data rather than out of a constant.

### 7.3 The clinch term — derived from the strike table, not from 14/30

`pw-camera.md:569` proposes `clinch = 1 - smoothstep(clamp((|L| - 14) / 16, 0, 1))` — 1 inside 14u,
0 beyond 30u. Both numbers are picked. The engine already owns the right ones:
`data/martial.js:21-27` — jab reach **11**, cross **9**, power **7** — exported through
`reachOf(id)` at `martial.js:37`, which is the same table `melee.js:110/239/278` reads and the same
table the spacing rings draw.

```js
import { reachOf } from '../data/martial.js';
const R = reachOf('jab');                                       // 11
const clinch = 1 - smoothstep(clamp((gap - R) / (2 * R), 0, 1));   // 1 at ≤11u, 0 beyond 33u
```

`fovT = 58 + 16·k − 6·clinch + (ov.fov || 0)`, clamped `[40, 76]`.

⚠ **The narrowing is not cosmetic.** `pw-camera.md:576-577`: *"A wide lens at 26u distorts two 9.6u
bodies into fish-eye, and a boxing exchange is the one moment you want the bodies undistorted."*
That is the ground grammar's single most important framing beat.

Arithmetic at the clinch, so nobody is surprised: at `gap = 11`, `k = 0`, fov 52°,
`fit = (11+20)/(2·tan 26°) = 31.8`, `want = 36.6`, visible vertical extent `2·36.6·tan 26° = 35.7u`,
a 9.6u fighter fills **27%**. ⚠ `pw-camera.md:599` predicted 46% at the clinch; it did not account
for the `+20` two-fighter term and the 1.15 margin that `world.js:2286-2287` added *after* that
document was written, and those exist because a tighter frame read as a cutscene
(`world.js:2274-2279`). **27% is the honest number and the fit rule should not be loosened to chase
46%.** The clinch narrowing still buys a 14% tightening (41.5u → 35.7u of visible extent), which is
what it is for.

---

## 8. TWO SMALLER DEFECTS FOUND WRITING THIS

### 8.1 SLOW MOTION MAKES THE CAMERA LAZY, AND JKA EXPLICITLY PREVENTS IT

`openjk.md:181` (source `cg_view.cpp:559-570`):

```c
dtime = (float)(cg.time-cameraLastFrame) * (1.0/cg_timescale.value) * (1.0/(float)CAMERA_DAMP_INTERVAL);
```

with the note at `openjk.md:194`: ⚠ *"`cg_timescale` is divided out. Slow-motion does not make the
camera lazy."*

Ours: `game.js:3589` — `if (this._slowT > 0) { this._slowT -= dt; dt *= this._slowMul || 1; }` — and
`cameraDrive(dt)` at `game.js:3691` receives the **scaled** dt. At the KO flourish
(`slowmo(0.45, 0.34)`, `game.js:2526`) an eye λ of 8 becomes an effective **2.72 for 0.45s**: the
camera goes 2.9× lazier during the exact half-second the frame most needs to be composed.

**Fix, and it is a ruling because our slow-mo is not JKA's debug cvar:**

| quantity | dt | why |
|---|---|---|
| eye position damping | **real** (`world._rdt`, stashed before the scale at `game.js:3589`) | JKA's rule verbatim. Position lag during a KO is a defect |
| look point damping | **real** | same |
| yaw / pitch stiffener rate | **real** | the rate is deg/ms of *wall* time or the envelope thresholds mean nothing |
| distance | **sim** (scaled) | a pull-out that stretches through a KO is the *effect*; JKA's timescale was a debug knob, ours is a deliberate combat beat |
| FOV | **sim** | same |
| shake decay (`world.js:2316`) | **sim** | ditto — and it already matches `follow()`'s `exp(−7·dt)` at `world.js:1337`; keep the two drives consistent |

### 8.2 `updateOcclusion` runs after `cameraDrive` and reads the camera it just moved

`game.js:3691-3692`: `cameraDrive(dt)` then `world.updateOcclusion(this.player.pos, dt)`. That order
is correct (the occlusion corridor must use this frame's camera) and should be preserved when the
collision trace lands — **the trace happens inside `chase()`, i.e. inside `cameraDrive`, so
`updateOcclusion` will see the *clipped* camera.** That is the right answer and it is worth stating
because it is easy to break by moving the clip to a post-step.

---

## 9. `punch(z)` — restoring a dead feel channel

`world.js:1299`: `punch(z) { this.frustumTarget = Math.min(this.frustumTarget, this.frustum * z); }`
— read only by `_applyProj`'s **orthographic** branch (`world.js:2199-2201`).
`aaa-00-ground-truth.md:405-408`: *"Every `world.punch()` call in melee.js and game.js does nothing
in PowerWorld … That is a lost feel channel."* ~25 call sites, every one a combat beat: haymaker,
nova, ground slam, car explosion, tier-up, the KO flourish (`game.js:2526`).

`punch` visually *is* a dolly, so under perspective it becomes one. Same public name, all 25 call
sites untouched:

```js
punch(z) {
  if (this.camMode === 'chase') { this._chasePunch = Math.min(this._chasePunch ?? 1, z); return; }
  this.frustumTarget = Math.min(this.frustumTarget, this.frustum * z);
}
```

and in `chase()`, mirroring `follow()`'s recovery rate at `world.js:1338` so the two modes recover
identically:

```js
this._chasePunch = damp(this._chasePunch ?? 1, 1, 3.5, dt);
want *= this._chasePunch;
```

⚠ `_chasePunch` is transient state → `clearTransients` (`game.js:1717`) resets it to 1, and
`snapChase()` sets it to 1 without damping.

---

## 10. DO NOT REGRESS — where we are already better than the source

Eight items. Each is a place where the obvious "improvement" is a step backwards.

**10.1 `updateOcclusion` fades the OCCLUDER, not the player.** `world.js:1359-1406`. JKA's answer is
`cg_thirdPersonAlpha` / `cg_thirdPersonAutoAlpha`, which fades **the player model** to 0.5 and ships
**off** (`g_active.cpp:5323-5350`). `openjk.md:2315-2316` is explicit: *"Do not copy the
transparency-based occlusion fix … WWA's `updateOcclusion` already fades the occluder, which is
correct and is the modern answer."* **DO NOT add a player fade for the close camera.**

**10.2 `damp()` is correctly frame-rate independent.** `core/util.js:8`. JKA's non-smooth path calls
`Q_powf` (`q_math.c:429`), whose exponent is an **`int`**; at 60fps `dtime = 0.333` truncates to 0,
the loop runs zero times, and the function returns `x` — *"the damping ratio is a fixed per-frame
constant at any frame rate above 25fps"* (`openjk.md:196-213`). It is a JA regression, not a JO
legacy (`openjk.md:263-266`). **Never add a "cheap" damping path.**

**10.3 Angular shake.** `world.js:2312-2318`. `follow()` adds a world-space vector to both the eye
and the look point (`world.js:1346-1349`); at ortho that is ~1.8° of jitter, at a 21u chase distance
the same 8u clamp is **29.7°** and 8u is a third of the way to the subject — the camera would pass
through the fighter. JKA has no shake model here at all. **Never share the shake application between
the two drives.** (Roll — `cg_flytilt`, `pw-esf-research.md:765` — is the one thing that would go
next to it, behind a dial, default 0.)

**10.4 `_applyProj()` is ONE place.** `world.js:2197-2206`, and its own header says three sites in
this file were writing the ortho four by hand. JKA writes `left/right/top/bottom` equivalents at
three hand-written sites. **Never write a projection field outside `_applyProj`.**

**10.5 `cameraDrive` is the ONE arbiter.** `game.js:3706-3720`. Its header documents the defect it
exists to fix: `mapCam` was read only inside `if (!this.running)`, so `updateKoCam` and
`updateSpectate` wrote to nothing while `followHumans` overwrote unconditionally — *"Both features
looked dead."* **Do not add a second writer.** Every proposal in this document lands inside `chase()`
or inside `cameraDrive`.

**10.6 The degenerate-axis blend is better than the source's.** `world.js:2265-2269`. JKA's collapse
case (`cg_view.cpp:872`, `openjk.md:340-354`) falls back to the **undamped** `camerafwd` when target
and eye squeeze to the same point — a last-resort discontinuity. Ours blends `subject.facing` in
*proportionally* as the axis approaches vertical, so it is continuous. `world.js:2258-2262` records
what it cost to learn: with a foe 46u directly overhead the subject spanned **94.6% of the frame** at
y = −2.17, i.e. the camera was inside him, *and the screenshot matrix found it — no single-framing
test could.* **Never replace it with a threshold.**

**10.7 The shoulder offset is applied before the trace.** `world.js:2307-2308`. JKA gets this wrong
on foot (`cg_view.cpp:881`, `// Temp: just move the camera to the side a bit`, untraced —
`openjk.md:368-370`) and right only in vehicles (`codemp/cgame/cg_view.c:1103`,
`openjk.md:736-737`). We are already on the finished side of that line. `openjk.md:2116-2119` says
so directly: *"keep it there."*

**10.8 `cg_thirdPersonMaxRange` is a cautionary tale.** Registered, documented and **never read** in
two shipped games (`openjk.md:102-103`, `:2318-2319`). Everything §5 adds is read at a named site in
`chase()`; if a dial is added and nothing reads it, delete the dial.

---

## 11. THE GATES

Five loops. Each names its finish line. Run each until its gate is green; do not proceed past a red
gate. (Sizing is in loops, never in calendar time.)

### Loop 1 — THE TRACE

Land §3: `_segBox3` returns `tmin`, the `top` guard, the interior adapter, the two traces in order,
the derived pad, the terrain floor, `noCam`.

**Gate.** A 60s AI-vs-AI fight in a generated Mega City (79–99 cover pieces) with the chase camera
driven through `cameraDrive`, ≥3600 frames, asserting every frame:
- `camPos` is outside every `world.cover` AABB inflated by `CAM_PAD` — 0 violations
- `camPos` is outside every `world.interiors[].walls` box inflated by `CAM_PAD` — 0 violations
- `camPos.y ≥ world.heightAt(camPos.x, camPos.z) + CAM_PAD` — 0 violations
- 0 console errors
Plus **one screenshot of the worst frame** (smallest clearance) — the camera backed into a corner is
exactly the case an assertion passes and a picture fails.

⚠ Prove the harness first: a deliberately un-clipped run must produce a non-zero violation count, or
the suite is asserting nothing (the vacuous-pass law — CLAUDE.md records `[].every()` shipping green).

### Loop 2 — THE STIFFENER

Land §4: `dampStiff` in `core/util.js`, the yaw rate through `angleDiff`, the derived pitch divisor,
the 0.85 cap, `snapChase()` and its six call sites, the `launchT` λ ramp.

**Gate — assert the INVARIANT, not the value.** CLAUDE.md's direction-triangle note is the
precedent: four test versions were wrong before the feature ever was, because each wrote a value the
frame then overwrote. So:
- **Drive a real 180° flick through `controlPlayer`** (never by writing yaw). At t+0.25s the
  stiffened camera's residual angular error < 8°; the same run with `stiff` forced to 0 > 40°.
- **A slow 20°/s pan** shows < 5% difference between stiffened and unstiffened — the stiffener must
  be *invisible* during ordinary tracking, which is its entire purpose.
- `snapChase()` from each of the six triggers leaves `|camPos − ideal| < 0.01u` on the next frame.
- At 103.8 u/s of `launchT`, measured trailing < 5u (13.0u without the ramp).

### Loop 3 — `vRef`

Land §7.

**Gate.**
- `vRefAir` reproduces `pw-camera.md:433-447` within 1% for a tier-2 levitator (40.4), a mid tier-3
  (64.1), SOL (111.0), TORCH (139.3).
- A levitator flying its own top speed reaches `k ≥ 0.95` (today: **0.275**).
- `clinch` reads exactly `reachOf('jab')` from `data/martial.js` — assert by mutating the table and
  seeing the camera's threshold move. That is what "cannot drift" means and it is the only way to
  prove it.

### Loop 4 — THE FRAME CLAIM

Land §5, with **exactly one** carrier so the door is proven without a content pass: the haymaker,
`{ range: +14, fov: -4, shape: 'tri', phase: 'charge', in: 0.35, out: 0.18, pri: 10 }`.

**Gate.**
- **An AI throwing the identical haymaker moves the camera by exactly 0.** Drive both; diff every
  camera field frame by frame. (`openjk.md:687-689` — this is the rule JKA gates at every site.)
- **With a 360° `ov.yaw` claim running, holding forward for 2s moves the player in a straight line**
  — heading deviation < 3°, driven through the real keys, reading the real scheme
  (`KEYMAPS[SETTINGS.scheme]` — CLAUDE.md records a whole harness lost to a saved BRAWLER scheme
  putting fly on `KeyG`).
- `clearTransients` leaves every `world.camOv` field null and `_chasePunch` at 1.
- The asymmetric envelope is measurable: ramp-in duration / ramp-out duration = `in/out` within 10%.

### Loop 5 — BOTH GRAMMARS, ONE CAMERA

Land §6 and §9.

**Gate — THE SCREENSHOT MATRIX.** Assertions cannot see framing; this project has proven that three
times (`world.js:2274-2279`, the boxing ring, the venue's audience). Eight frames, all with both
fighters alive and the HUD on:

1. grounded clinch (gap ≤ 11u)
2. grounded mid (gap ~24u)
3. **mid-transition** — `gh = 5`, i.e. `g ≈ 0.5`
4. hover (`gh` 60, both still)
5. solo cruise
6. mutual burner chase
7. foe directly overhead (the `world.js:2258-2262` case)
8. camera backed into a building corner (Loop 1's worst frame, re-shot with §6 live)

Plus a **continuity assertion**: a scripted vertical takeoff from `gh = 0` to `gh = 20`, asserting the
max per-frame delta of `g`, `_chaseFov`, `_chaseDist` and the eye height fraction is each under 3% of
that quantity's own range. That is the numeric proof of "the camera never cuts."

Harness gotchas already on file and all of them apply here: ⚠ clear the renderer's **scissor and
viewport** before posing — the news crew leaves a 320×180 rect (CLAUDE.md §42); ⚠ read the drawing
buffer with `toDataURL` **in the same task as the render** — a page screenshot captures the DOM over
the canvas (CLAUDE.md §43); ⚠ a hidden pane renders at 0×0 and `_ema` reads ~98ms, so stub
`world.render` for any sim-only number.

---

## 12. OPEN QUESTIONS — measurements owed, not opinions

1. **`near`.** §3.4 vs `pw-camera.md:197`. Run `world.auditSurfaces()` (`world.js:1977`) *from the chase
   camera* at `near ∈ {0.6, 1.2, 2.0, 4.0}`, at chase distances 24 / 42 / 86, and record both the
   surface-conflict count and the resulting `CAM_PAD`. Pick the largest `near` whose pad stays under
   ~15% of `DIST_MIN` (24u → 3.6u). My prior is 1.2. **This is a measurement; do not settle it by
   argument.** ⚠ Do **not** reach for `logarithmicDepthBuffer` — it is a `WebGLRenderer` construction
   flag, cannot be toggled at runtime, and changes every material's program
   (`pw-camera.md:199-200`).
2. **The look-point λ raise** (9/7/9 → 13/10/13, §4.7). A proposal from an arithmetic comparison with
   JKA's cvars, not a measurement. Settle on Loop 5's matrix.
3. **Whether the look point takes the stiffener** (§4.6). A/B on the flick test.
4. **The slow-mo dt split** (§8.1). The position/orientation half is JKA's rule and is not in
   question; whether `dist`/`fov` should dilate is a *ruling* and is presented as one.
5. **Roll.** `cg_flytilt` is the one confirmed BFP camera cvar (`pw-bfp-source.md:551`), and the two
   sources disagree by 4× — replica ±20°, real BFP demo dumps ±80° (`pw-esf-research.md:765`). Ship
   behind a dial, default 0 (`pw-camera.md:656-657`: *"motion sickness"*). Needs a human.
6. **`pickTarget`'s pixel constants** — `nearD = 110` and the 34px ground-column radius
   (`game.js:1487`, and the ground-column pass at `:1501-1508`; ⚠ `pw-camera.md:227-229` cites the
   pre-refactor line numbers 1305/1323 — the constants are the same, the lines moved) were tuned
   against a fixed ortho scale and
   are a wildly different world size at 24u vs 86u standoff. Needs a feel pass, not a formula.
7. **`screenPosOf`'s `behind` test** (`_proj.z > 1`) is a *lucky* pass under perspective, not a
   designed one — the same expression also catches "beyond the far plane", so a distant foe reports
   as behind you and the off-screen arrow points the wrong way (`pw-camera.md:214-220`). One-line
   fix (test view-space z), but confirm the misfire live first.
8. **Whether the frame-claim priority model needs more than one live claim per key.** Ship one; find
   out.

---

## 13. THE ONE-PAGE SUMMARY

| # | change | site | source |
|---|---|---|---|
| 1 | `_segBox3` returns `tmin`; guard `top`; one caller updated | `world.js:1439-1451`, `:1364` | `openjk.md:2093-2104` |
| 2 | Two swept traces in JKA's order, clipped back into the damped state | `chase()` after `world.js:2294` and `:2311` | `openjk.md:298-318` |
| 3 | `CAM_PAD` derived from the near-plane corner radius | new, from `c.near` + live fov + aspect | derived here; replaces `openjk.md:2107`'s estimate |
| 4 | Terrain floor + `noCam` blocker set | `world.js:1475`; cover record field | `openjk.md:2121-2122` |
| 5 | `dampStiff(a,b,λ,dt,stiff)` | `core/util.js` beside `damp` at `:8` | `openjk.md:228-234` |
| 6 | Yaw rate via `angleDiff`, JKA's 1 / 2.5 °/ms envelope | `chase()` after `world.js:2270` | `cg_view.cpp:843-860` |
| 7 | Pitch stiffener, divisor **1.242 rad** derived from JA's divisor:clamp ratio | `chase()` at `world.js:2257` | `openjk.md:240-261` |
| 8 | `snapChase()` + six explicit triggers; `launchT` λ ramp | `world.js`, `game.js:1717/2109/3707` | `openjk.md:2138-2142` |
| 9 | `camera: {…}` claim block + per-parameter override, **additive** | `def` / ability row / `MODE_IMPL`; read at 6 lines in `chase()` | `openjk.md:2162-2166` |
| 10 | `frameClaim` gated on the mover being the player | `game.js`, beside `runSlot`'s hooks | `openjk.md:687-689` |
| 11 | `world.camBasis` — the unclaimed axis; `fwd`/`right` recomputed in `cameraDrive` | `world.js` in `chase()`; `game.js:3173`, `:3281`, `:380-381` | `openjk.md:2177-2180` |
| 12 | `g = 1 − smoothstep(gh / MELEE_VGATE)`; two parameters lerp on it | `chase()` top; `world.js:2308`, `:2247` | this document |
| 13 | `vRef` replaces `/96`; live `powerBuff` at read time | `world.js:2247` | `pw-camera.md:464-485` |
| 14 | `clinch` from `reachOf('jab')` | `world.js:2248` | derived; replaces `pw-camera.md:569` |
| 15 | Real dt for position/orientation damping | `game.js:3589`, `:3691` | `openjk.md:181, 194` |
| 16 | `punch(z)` becomes a dolly in chase | `world.js:1299`, `chase()` | `aaa-00-ground-truth.md:405-408` |

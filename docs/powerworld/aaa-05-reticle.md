# THE RETICLE NEVER LIES — the complete aim spec for POWERWORLD

**Status:** specification. Nothing in here is built yet.
**Scope:** the aim authority for the third-person shell — `_openSky` (air) and the ground grammar —
plus the two surfaces that draw it. The isometric city game is explicitly out of scope and is
proven untouched by the measurable in §10.
**Owner law:** *decide whether the shot comes from the character or the camera, and make the
crosshair agree* — `docs/reference/openjk.md:2083` (§7.1), quoting the rule JKA states in its own
source comment at `code/cgame/cg_draw.cpp:3036` / `:2739`.

---

## 0. THE VERDICT, IN FOUR LINES

1. **The ray is B** (openjk §7.1's second option): trace from the **camera** through the crosshair,
   take the first hit, and set the aim **world point** to that hit. The shot from the muzzle then
   converges on the exact point the crosshair marks.
2. **The drawing is A** (JKA's own answer): the crosshair is drawn at the **projected aim point**,
   every frame, in every state. Unlocked with no hit that projects to screen centre by construction,
   so the CSS reticle does not visibly move. **Locked, it moves onto the enemy — which is the bug
   nobody has written down yet** (§3.2).
3. A and B are **not alternatives**. B decides where the shot goes; A decides where the mark is
   painted. Taking both is what makes the invariant in §10 assertable *at all times* rather than
   only in the free-aim case.
4. **Three lies get fixed, not one.** The parallax (§2), the locked crosshair (§3.2), and the aim
   magnet measuring from the mouse cursor while the crosshair sits at screen centre (§3.1).

---

## 1. WHAT THE RETICLE ACTUALLY IS TODAY — the four surfaces, and who owns aim

| surface | file:line | what it draws | what it means |
|---|---|---|---|
| `#hCross` — the CSS crosshair | `src/engine/hud.js:240` (markup), `src/engine/hud.styles.js:970-989` (style) | four ticks + a centre dot, `position:fixed; left:50%; top:50%` | **screen centre, always.** Turns `--danger` under `body.powerworld.pw-locked` |
| the class toggles | `src/engine/hud.js:1864-1866` | `body.powerworld` off `p._openSky`, `body.pw-locked` off `!!g.hardLock` | cached against a per-frame classList write |
| the red lock marker (`redTri`) | `src/engine/game.js:1345-1362` build, `:1371-1385` draw | ring + four ticks + centre dot sprite, over the locked fighter's head, at **constant screen size** `clamp(camDist·0.055, 6, 30)` (`:1381`) | the hard lock |
| the gold soft reticle | `src/engine/game.js:387-395` build, `:1386-1393` draw | a ground decal ring at `y = 0.35` under the soft target | **hidden under `_openSky`** (`game.js:1371-1372`) — correctly, a ground ring is meaningless 200u up |

**The aim itself is one block**, `src/engine/game.js:3145-3197`, and it resolves in this order:

```
:3149-3152  pad, stick deflected  → pickTargetDir(ax,az) → soft.center(a3), else a3 = pos + iso-basis*50, y=6
:3153-3163  pad, stick released   → last heading, same shape
:3165       mouse                 → soft = pickTarget(p)                       // screen-space, from the CURSOR
:3171         soft hit            → soft.center(a3)                            // entity.js:315 — pos + y5.2
:3172-3175    no soft, _openSky   → a3 = p.pos + camForward*120, y+5           // ⚠ THE PARALLAX BUG
:3175         no soft, iso        → screenToGround(mouse), a3.y = 3
:3193       this.aimPoint.copy(a3).setY(0)
:3194       p.aim3 = normalize(a3 − (p.pos + y 5.8))
:3196-3197  facing follows hardLock if live, else aim3
```

**⚠ THERE IS NO MOUSE-LOOK IN THIS PROJECT.** `grep -rn "pointerLock\|requestPointerLock\|movementX"
src/` returns **nothing**. The chase camera aims **itself** (`world.js:2249-2255`): at the target if
there is one, else along velocity if `spd > 6`, else along `subject.facing`. So the screen-centre
crosshair does not mark a direction the player chose — it marks a direction the camera chose. That
is a load-bearing fact for everything below, and it is why §3.2 matters as much as §2.

---

## 2. THE PARALLAX — measured exactly, and a correction to `openjk.md:2045`

### 2.1 The code

`src/engine/game.js:3172-3175`, verbatim, live today:

```js
else if (p._openSky) {
  const cf = _v.set(0, 0, 0); this.world.camera.getWorldDirection(cf);
  a3.set(p.pos.x + cf.x * 120, p.pos.y + 5 + cf.y * 120, p.pos.z + cf.z * 120);
}
```

`a3` is then consumed at `:3194` as `aim3 = normalize(a3 − (pos + y5.8))`, which is — to within the
0.8u height difference between `pos.y + 5` and `pos.y + 5.8` at a 120u lever arm, i.e. 0.38° — just
**`camForward`**. So the shot direction is the camera's direction, applied from the player's body.
Two parallel rays from two different origins. Parallel rays never converge.

⚠ **`openjk.md:2045` cites `game.js:2986-2989`. That is stale.** The live site is
**`game.js:3172-3175`**. `pw-controls.md:139` cites `game.aimPoint` at `game.js:283`/`:2751`; the
live sites are **`game.js:365`** (declaration) and **`game.js:3193`** (the write). Line drift in the
research docs is expected; cite this file's numbers, they were read today.

### 2.2 The geometry, from `chase()`'s own arithmetic

`world.chase()` (`world.js:2242-2325`) places the eye at `world.js:2307-2308`:

```js
const off = d * 0.17;
const ex = S.x - ax*d + px*off, ey = S.y + 5.4 - ay*d*0.18 + d*0.30, ez = S.z - az*d + pz*off;
```

and looks at a point **biased toward the target** (`world.js:2291-2292`):

```js
const bias = target ? clamp(gap * 0.012, 0.16, 0.42) : 0.2;
const lx = S.x + ax*gap*bias, ly = S.y + 5.4 + ay*gap*bias, lz = S.z + az*gap*bias;
```

The chase distance is itself derived from the gap (`world.js:2287-2289`):

```js
const fit  = (Math.min(gap, 52) + 20) / (2*Math.tan(fov/2));
const want = clamp(Math.max(24, fit*1.15) + k*16, 24, 86);
```

The shot leaves the **muzzle**, `entity.js:317-318`:

```js
muzzle(out, fwd = 3.4, h = 5.8) { return out.set(pos.x + aim.x*fwd, pos.y + h, pos.z + aim.z*fwd); }
```

### 2.3 The measurement

I reproduced `chase()` exactly (settled damping, target level and dead ahead) and computed the
**perpendicular separation between the camera ray and the muzzle's parallel shot ray** — which, for
parallel rays, *is* the miss distance at every range.

| gap (u) | chase dist `d` | FOV | **miss (u)** | vs a 2.2u fighter radius (`entity.js:185`) |
|---|---|---|---|---|
| 10 | 31.1 | 58 | **0.91** | hits |
| 16 | 37.3 | 58 | **0.47** | hits |
| 24 | 45.6 | 58 | **0.70** | hits |
| 32 | 53.9 | 58 | **2.08** | grazes the edge |
| 40 | 62.2 | 58 | **3.18** | **clean miss** |
| 52 | 74.7 | 58 | **4.42** | **clean miss** |
| 70 | 74.7 | 58 | **5.91** | **miss by 2.7 radii** |
| 100 | 74.7 | 58 | **7.98** | **miss by 3.6 radii** |
| 40, target 45° above | 62.2 | 58 | **8.67** | **miss by 3.9 radii** |
| 70, target 45° above | 74.7 | 58 | **14.52** | **miss by 1.5 whole bodies** |
| no target (free flight, gap 40 / bias 0.2) | 62.2 | 58–74 | **1.03** | hits, at any speed |

Reproduce: the script is in §10.4 and runs in plain node against no engine at all — it is
`chase()`'s arithmetic transcribed, and it is the *predictive* half of the harness.

### 2.4 ⚠ THE CORRECTION — openjk §7.1 has the sign of the range dependence backwards

`openjk.md:2062-2064` says:

> The miss is a constant 6.8u in world units at every range — which means the angular error gets
> *worse* the closer the target is.

**Both halves are wrong, and the reason is instructive.** The doc treated the chase distance as a
fixed 40u and read `off = d * 0.17` at that one value. But **`d` is derived from the gap**
(`world.js:2287-2289`), so the shoulder offset *grows with engagement range*, and so does the eye
lift `d * 0.30`. The measured behaviour is the inverse of the claim:

- **Up close the shot lands.** At gap ≤ 24 the miss is under 1u and every punch-range shot connects.
  That is why this has never been reported as a bug — in a clinch, it works.
- **The miss GROWS with range**, 0.47u → 7.98u across the roster's engagement band, because the
  camera pulls back and the offsets scale with it.
- **And it explodes vertically**, 14.52u against a target 45° above at gap 70 — because the eye lift
  `d*0.30` and the pitch damping `ay*0.55` (`world.js:2258`) both act on the axis the fight is
  fought on. **PowerWorld's whole thesis is that altitude is the mode switch.** This bug is worst
  exactly where the design lives.
- The 6.8u figure is the raw `d*0.17` shoulder offset at `d = 40`. The true perpendicular separation
  is smaller than that at short range because the look point is biased back toward the subject
  (`bias`, `world.js:2291`), and larger than it at long range and at altitude.

**Practical restatement for the ledger:** *the parallax bug is a long-range and a vertical bug, not
a close-range one. A 145u beam misses a stationary target by 8u; a jab-range blast hits.*

---

## 3. THE OTHER TWO LIES, WHICH ARE IN THE SAME FUNCTION AND ARE NOT IN ANY RESEARCH DOC

### 3.1 The aim magnet is measured from the MOUSE CURSOR; the crosshair is drawn at SCREEN CENTRE

`pickTarget(p)` — `src/engine/game.js:1485-1515` — opens:

```js
pickTarget(p) {
  const cx = this.input.mouse.clientX, cy = this.input.mouse.clientY;
```

and then measures pixel distance from `(cx, cy)` to every foe's projected body
(`game.js:1492-1497`), with a hover radius of `max(28, bodyHeightPx + 22)` and a magnet radius
`nearD = 110` px (`:1487`). The winner is written to `this._hoverPick` (`:1512`, the click-to-lock
source) and returned as `soft` — and at `game.js:3171` `soft.center(a3)` **overrides the whole
`_openSky` branch**.

There is no pointer lock (§1), so the cursor is a free-floating, stale screen position. **So under
`_openSky` the actual aim authority is a mouse cursor the player is not looking at, while the mark
they *are* looking at is nailed to screen centre.** Moving the mouse to the top-left corner of the
window silently drags every shot there, and the crosshair does not move a pixel.

**Fix:** when `p._openSky`, `pickTarget` measures from the **crosshair**, not the cursor:

```js
const pw = p._openSky;
const cx = pw ? innerWidth * 0.5 : this.input.mouse.clientX;
const cy = pw ? innerHeight * 0.5 : this.input.mouse.clientY;
```

Two consequences, both wanted: the magnet now assists what you are *looking at*, and **`_hoverPick`
becomes reachable** — putting the crosshair on a body and clicking hard-locks it (`game.js:3179`),
which is the third-person convention and is currently unusable because there is no cursor over
anybody. `cycleLock` on `T` (`game.js:3187`, `:1589-1620`) stays exactly as it is.

⚠ **Do not delete the cursor path.** In the iso city the cursor *is* the aim and `pickTarget` is
correct as written. This is a branch on `_openSky`, not a replacement.

### 3.2 ⚠ WHILE LOCKED, THE CROSSHAIR TURNS RED AT SCREEN CENTRE AND THE SHOT GOES SOMEWHERE ELSE

This is the lie nobody has written down, and it is the more visible of the two.

`chase()` looks at a point **between you and the target** — `bias = clamp(gap*0.012, 0.16, 0.42)`
(`world.js:2291`), so the look point sits 16–42% of the way to the enemy. **Neither fighter is at
screen centre.** Meanwhile:

- the shot goes to the lock — `soft.center(a3)` (`game.js:3171`) and `faceDir(hardLock…)` (`:3196`),
- the crosshair stays at `left:50%; top:50%` and merely recolours to `--danger`
  (`hud.styles.js:988-989`, toggled from `hud.js:1865`).

So in the one state where the game *announces* that the reticle is meaningful — hostile red — the
reticle is pointing at empty sky and the shot is going to a body 16–42% of the gap off-centre. The
red lock marker over the enemy's head (`game.js:1373-1384`) is the only honest mark on screen.

**Fix:** §0.2 — the crosshair is drawn at the projected aim point. Locked, that projects onto the
enemy and the crosshair walks there. This is literally JKA's `CG_DrawCrosshair(trace.endpos)`
(`openjk.md:2739`-cited source, `code/cgame/cg_draw.cpp:2739`) and its off-screen rule:

```c
if ( !CG_WorldCoordToScreenCoordFloat( worldPoint, &x, &y ) ) { /* off screen, don't draw it */ return; }
```

---

## 4. THE DECISION — B for the ray, A for the drawing, and why

`openjk.md:2066-2079` offers two fixes. **They answer different questions and this spec takes one
of each.**

### 4.1 Why the RAY is B (camera-origin, convergent)

- **The camera is already the aim authority in this shell, and it is not negotiable.** With no
  mouse-look (§1), `world.chase()` decides where you are looking from the lock, the velocity, or the
  facing. Option A ("trace from the character along the character's own aim") presumes a character
  aim that exists independently of the camera. Here there isn't one — `faceDir` is *driven from*
  `aim3` (`game.js:3197`), which is driven from the camera. A would be circular.
- **The primitive exists.** `world.screenToGround` (`world.js:1454-1459`) already builds the camera
  ray with `_ray.setFromCamera(_ndc, this.camera)`; it just intersects `_groundPlane` instead of the
  world. `openjk.md:2077` names this. The new function is the same three lines with a different
  intersection set.
- **B is what makes the lock and free aim the same code path.** The lock already produces a world
  *point* (`soft.center(a3)`, `entity.js:315`). B produces a world *point*. One representation, one
  invariant to assert, one crosshair rule. A produces a *direction* for free aim and would have to
  be reconciled with a point for the lock.
- **A's stated cost is fatal here.** `openjk.md:2074`: *"the crosshair moves, which fights a lock-on
  game where the reticle is a targeting affordance."* This is a lock-on game (`cycleLock`,
  `hardLock`, the red marker, the `pw-locked` class).

### 4.2 Why the DRAWING is A

The crosshair must be painted **where the shot will arrive**, not at a fixed screen position that
happens to coincide with it in one state. That is exactly JKA's rule and it is what closes §3.2.

Under B the two coincide in the common case for free geometric reasons — the aim point is *on* the
camera's centre ray, so it projects to screen centre — so adopting A costs **nothing visually in the
free-aim case** and fixes the locked case for one `transform` write per frame.

### 4.3 The rule, stated once, in the form it goes into the manual

> **THE AIM POINT IS ONE WORLD POINT.** Every frame, `game.aimPoint3` is a point in the world. The
> shot leaves the muzzle and is aimed at it. The crosshair is drawn at its screen projection, or is
> hidden if it is behind the camera. There is no state in which one of those three is computed from
> something the other two do not see.

---

## 5. THE TRACE — what the ray tests, in what order, and what it falls back to

### 5.1 `world.traceBox3` — promote the existing slab test from a boolean to a distance

`world._segBox3(x0,y0,z0, x1,y1,z1, c)` (`world.js:1439-1452`) already computes `tmin` by the slab
method along a 3-D segment against a cover record, **and then throws it away**:

```js
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }
    return tmin > 0.02 && tmin < 0.98;
```

Split it, keeping the boolean caller (`world.js:1364`, the tower cutaway) byte-identical:

```js
  // returns the parametric entry distance along the segment, or -1 for a miss. NO gating — the
  // caller decides what range it cares about. This is the trace primitive; _segBox3 is one reader.
  traceBox3(x0, y0, z0, x1, y1, z1, c) {
    const hx = c.hx ?? c.r, hz = c.hz ?? c.r, top = c.top ?? c.h;
    if (hx == null || hz == null || top == null) return -1;   // ⚠ see 5.4 — a half-filled record
    let tmin = 0, tmax = 1;
    const axes = [[x0, x1 - x0, c.x - hx, c.x + hx], [y0, y1 - y0, c.y0 ?? 0, top], [z0, z1 - z0, c.z - hz, c.z + hz]];
    for (const [p0, d, mn, mx] of axes) {
      if (Math.abs(d) < 1e-6) { if (p0 < mn || p0 > mx) return -1; continue; }
      let t1 = (mn - p0) / d, t2 = (mx - p0) / d;
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) return -1;
    }
    return tmin;
  }
  _segBox3(x0, y0, z0, x1, y1, z1, c) {
    const t = this.traceBox3(x0, y0, z0, x1, y1, z1, c);
    return t > 0.02 && t < 0.98;
  }
```

⚠ **`_segBox3`'s behaviour must not change by one bit.** It is called on the camera→player segment
every frame by `updateOcclusion` (`world.js:1364`) and it is what drives the tower cutaway and the
canopy cutaway. Any drift there is a visible regression in the city.

### 5.2 `world.aimTrace(out, opts)` — the whole function

Lives in `world.js` beside `screenToGround` (`world.js:1454`). It takes the camera ray, walks the
world, and writes the **nearest** hit into `out`.

```js
  // THE AIM TRACE. One ray, from the camera, through the crosshair, into the world. Returns the
  // distance travelled (== opts.maxD when nothing was hit), and writes the world point into `out`.
  // ⚠ `hit` is reported separately from the point, because "converged on a body" and "fell back to
  // max range" are different facts and the crosshair is allowed to say which (§6.4).
  aimTrace(out, o) {
    const cam = this.camera, D = o.maxD;
    _at.set(0, 0);                                     // screen centre in NDC — the crosshair's own position
    _ray.setFromCamera(_at, cam);
    const O = _ray.ray.origin, R = _ray.ray.direction;  // unit
    const x1 = O.x + R.x * D, y1 = O.y + R.y * D, z1 = O.z + R.z * D;
    let best = 1, kind = null, ent = null;

    // 1. FOES. A body under the crosshair is the case the whole feature exists for, and hitting it
    //    exactly is what makes the miss ZERO rather than small.
    //    ⚠ HONESTY LAW: only a foe you can SEE may stop the ray — the same `_vis > 0.4` gate
    //    pickTarget uses (game.js:1491) and cycleLock uses (game.js:1590). An unseen foe does not
    //    block it either, so the crosshair can never be read as a wallhack.
    for (const f of o.foes) {
      if (!f.alive || (f._vis != null && f._vis <= 0.4)) continue;
      const t = raySphere(O, R, f.pos.x, f.pos.y + 5.2, f.pos.z, f.radius + o.pad, D);
      if (t >= 0 && t / D < best) { best = t / D; kind = 'foe'; ent = f; }
    }
    // 2. FLUNG PROPS — a thrown car IS a target (manual §47, game.js:876-880, hitFlung :927).
    //    ⚠ Same ownership guard hitFlung enforces at :931-932: only the side it was thrown AT.
    for (const fl of (o.flung || [])) {
      if (fl.dead) continue;
      const t = raySphere(O, R, fl.x, fl.y, fl.z, fl.r + o.pad, D);
      if (t >= 0 && t / D < best) { best = t / D; kind = 'prop'; ent = fl; }
    }
    // 3. COVER — buildings, spires, boulders, rubble. `traceBox3` in the same segment space.
    for (const c of this.cover) {
      const t = this.traceBox3(O.x, O.y, O.z, x1, y1, z1, c);
      if (t >= 0 && t < best) { best = t; kind = 'cover'; ent = c; }
    }
    // 4. INTERIOR WALLS — never ordinary cover on purpose (they must not be shootable), so they are
    //    a separate list (world.js:674-682) and every consumer queries them separately.
    for (const it of (this.interiors || [])) {
      for (const wl of it.walls) {
        const t = this.traceBox3(O.x, O.y, O.z, x1, y1, z1, { x: wl.x, z: wl.z, hx: wl.hx, hz: wl.hz, top: it.top });
        if (t >= 0 && t < best) { best = t; kind = 'wall'; ent = wl; }
      }
    }
    // 5. THE GROUND, and it is `heightAt`, NOT a y=0 plane. `_groundPlane` is already an
    //    approximation in a city with metro trenches and mining pits (pw-controls.md:87-89) and it
    //    is nonsense on PowerWorld's relief. March the ray and take the first crossing.
    //    ⚠ STEP = 4u because heightAt interpolates a ~4u lattice (CLAUDE.md, THE SURVEY) — a coarser
    //    step steps over a spire's foot, a finer one buys nothing the field can express.
    if (R.y < 0) {
      const far = best * D, step = 4;
      let pt = 0, py = O.y - this.heightAt(O.x, O.z);
      for (let t = step; t <= far; t += step) {
        const h = O.y + R.y * t - this.heightAt(O.x + R.x * t, O.z + R.z * t);
        if (h <= 0) {                              // bisect once for a clean surface point
          let lo = pt, hi = t;
          for (let i = 0; i < 4; i++) {
            const mid = (lo + hi) * 0.5;
            const hm = O.y + R.y * mid - this.heightAt(O.x + R.x * mid, O.z + R.z * mid);
            if (hm <= 0) hi = mid; else lo = mid;
          }
          if (hi / D < best) { best = hi / D; kind = 'ground'; ent = null; }
          break;
        }
        pt = t; py = h;
      }
    }
    out.set(O.x + R.x * best * D, O.y + R.y * best * D, O.z + R.z * best * D);
    return { dist: best * D, kind, ent, hit: kind !== null };
  }
```

with a module-local `_at = new THREE.Vector2()` beside `_ndc` (`world.js:2409`) — **do not reuse
`_ndc`**, `screenToGround` may run in the same frame and the shared-temp aliasing rule
(CLAUDE.md, Hard rules) has already cost this project once — and a module-local `raySphere`:

```js
// nearest positive root of |O + Rt − C|² = r², or −1
function raySphere(O, R, cx, cy, cz, r, maxT) {
  const ox = O.x - cx, oy = O.y - cy, oz = O.z - cz;
  const b = ox * R.x + oy * R.y + oz * R.z;
  const c = ox * ox + oy * oy + oz * oz - r * r;
  const disc = b * b - c;
  if (disc < 0) return -1;
  const s = Math.sqrt(disc);
  const t = -b - s >= 0 ? -b - s : -b + s;
  return (t >= 0 && t <= maxT) ? t : -1;
}
```

**Cost.** One frame, PowerWorld: ≤ 12 foes, ≤ 4 flung, 41 cover records (15 spires + 26 rocks,
`powerworld.js:366-370`, `:443`), 0 interiors, ≤ 41 terrain samples (162 / 4). A flagship city is
worse — up to 99 cover (CLAUDE.md, THE ROAD GRAPH: budget `min(64, …)` plus landmarks) plus interior
walls. Order 200 slab tests and 40 bilinear samples per frame; `refreshFogBoxes` rasterises every
cover box in 0.026 ms and the wildlife layer ticks 104 instances in 0.047 ms, so this is the same
order of magnitude as things already measured as free. **It is still measured, not assumed** — §10.6.

⚠ **`pad`.** The foe sphere is inflated by `o.pad` so the crosshair converges when it is *near* a
body rather than only when it is dead centre. That is not a cheat: it is the same idea as
`pickTarget`'s `max(28, bodyPx + 22)` hover radius (`game.js:1495`) and it exists to kill the
one-pixel discontinuity described in §5.5. **Derive it, do not pick it:** `pad = 0` when
`SETTINGS.aimAssist === false` (the existing Options toggle, honoured at `game.js:1513`), else
`pad = f.radius * 0.5` = 1.1u — half a body radius, the same fraction the melee `coneFoe` gate is
built around.

### 5.3 `maxD` — the fallback, derived from the distribution

When the trace hits nothing there is no convergence point, so one must be chosen. It matters less
than it looks: with **no target** the current parallax is already only **1.03u** (§2.3 last row) —
inside a body radius — because `chase()` biases the look point back toward the subject.

**Measured over the roster** (`node`, `src/data/characters.js`, reach = `maxLen` for beams, else
`speed × life` with `life` defaulting to 3 per `projectiles.js:109`, else `range`; n = **189**
abilities with reach ≥ 20u):

| p0 | p25 | **p50** | p75 | p90 | p95 | max |
|---|---|---|---|---|---|---|
| 24 | 52 | **162** | 264 | 375 | 450 | 645 |

**`AIM_MAX_D = 162`** — the median distance a ranged ability's shot actually travels, over all 52
heroes and 364 abilities. It is derived from the distribution (CLAUDE.md law) and it is not a
constant anyone chose. Residual miss with nothing hit is `sep₀ · |1 − t/D|` ≤ **1.03u** at every
range, i.e. always inside a fighter's 2.2u radius.

⚠ **A better number exists and this spec names the measurement rather than pretending to it:** the
p50 *engagement* distance in a real PowerWorld fight, measured over 60 s of AI-vs-AI as `|p.pos −
nearestFoe.pos|` sampled per frame. Take it in loop 1 (§11) and replace 162 with it. The interim
value is honest because it is measured from something; the replacement is better because it is
measured from the thing.

⚠ **The upgrade path, written down and NOT built now:** publish `game.aimRay = {origin, dir, dist,
hit}` and let an ability converge at **its own** `reachOf` (`hudUtil.js:189-196`) — a 145u beam and
an 11u jab would then converge at their own distances (`pw-controls.md:117-119` argues for exactly
this). It is a bigger change than the bug is worth today and it is the natural loop-3 slice.

### 5.4 ⚠ HALF-FILLED COVER RECORDS ARE A KNOWN, LIVE HAZARD

Manual §47 records that PowerWorld's spires shipped with cover records carrying **no `r` and no
`h`**, and that `projectiles.js` tests `hypot(...) < c.r + radius && pos.y < c.h` — where
`x < undefined` is **`false`**, so all fifteen were transparent to every bullet, blast and beam.
`traceBox3` must therefore **refuse a record it cannot read** (`return -1`) rather than compute with
`undefined`, and the harness (§10.3) must assert that every record in `world.cover` yields a finite
box. A trace that silently declines to see a mountain is the same class of defect as a projectile
that flies through it.

### 5.5 ⚠ THE DISCONTINUITY, NAMED

Option B has one honest failure mode and it should be in the doc rather than discovered later.
Sliding the crosshair off the edge of a body flips the convergence point from *on the enemy* (miss
0) to *at `maxD`* (miss up to 1.03u). The shot direction therefore jumps. Three things bound it and
together they make it a non-issue:

1. The jump is **≤ 1.03u**, an eighth of a body — smaller than the bug it replaces at every range
   past gap 24.
2. `pad` (§5.2) widens the body so the flip happens off the silhouette, not on it.
3. The crosshair **says which state it is in** (§6.4), so the change is visible rather than silent.

**Do not smooth it with damping.** A damped aim point is an aim point that lags the crosshair, which
re-introduces the exact lie this whole document exists to remove.

---

## 6. THE IMPLEMENTATION, SITE BY SITE

### 6.1 `game.controlPlayer` — the replacement for `game.js:3164-3176`

```js
    } else {
      soft = p.blindT > 0 ? null : this.pickTarget(p);        // BLIND: the aim magnet lets go
      if (soft) soft.center(a3);
      else if (p._openSky) {
        // ⚠ THE RETICLE NEVER LIES (docs/powerworld/aaa-05-reticle.md). This used to take the
        // CAMERA'S direction and apply it from the PLAYER'S position — two parallel rays from
        // different origins, which never converge. Measured miss: 0.47u at a 16u gap, 7.98u at 100u,
        // and 14.52u against a foe 45° above at 70u. Now: trace from the camera THROUGH THE
        // CROSSHAIR, and aim at the world point that ray actually reaches.
        this._aimHit = this.world.aimTrace(a3, {
          maxD: AIM_MAX_D,
          foes: this.entities.filter(e => e !== p && e.def && !e.isDummy && this.isFoe(p, e)),
          flung: this._flung && this._flung.filter(fl => fl.by && this.isFoe(fl.by, p)),
          pad: SETTINGS.aimAssist === false ? 0 : p.radius * 0.5,
        });
      } else { this.world.screenToGround(m.clientX, m.clientY, a3); a3.y = 3; }
    }
```

`AIM_MAX_D` is a named export from `core/util.js` beside `DECAL_LIFT` and `BANDS` — the file that
already owns the shared numeric contracts, so nobody invents a second one (the `GROUND_LAYER`
lesson, CLAUDE.md SURFACES).

⚠ The `foes` filter allocates an array per frame. **Hoist it**: `aimTrace` should take the raw
`this.entities` plus an `isFoe` predicate, or `game` should keep a reused scratch array. Sixty
allocations a second of a 12-element array is not a crisis, but this project has a no-allocation
rule in the frame path (the beam's fixed 44-node buffer, manual §42) and there is no reason to
break it here.

### 6.2 ⚠ THE SHOT ORIGIN IS THE MUZZLE, NOT `pos + 5.8` — and this is half the fix

`game.js:3194` derives the direction from the body:

```js
p.aim3.set(a3.x - p.pos.x, a3.y - (p.pos.y + 5.8), a3.z - p.pos.z).normalize();
```

But **nothing fires from there.** Every ranged ability spawns at `c.muzzle(...)`
(`abilities.js:122, 145, 171, 196, 283, 508, 682, 740`), and the beam re-reads it every frame
(`projectiles.js:695`). `muzzle` (`entity.js:317-318`) is `pos + aim·3.4` at `y + 5.8` — **3.4u
forward along the FLAT xz aim, with no vertical component.**

The residual error this leaves is not small at the angles PowerWorld fights at. For an aim pitched
θ above horizontal, the muzzle's perpendicular distance from the body-origin ray is `3.4·sin θ`:

| pitch θ | residual miss (u) | vs 2.2u radius |
|---|---|---|
| 15° | 0.88 | hits |
| 30° | 1.70 | grazes |
| 45° | **2.40** | **misses** |
| 60° | **2.94** | **misses** |
| 80° | **3.35** | **misses** |

**A steep shot straight up at somebody above you misses by more than a body radius, for a reason
that has nothing to do with the camera.** This is the same class of defect and it must be fixed in
the same commit, or the measurable in §10 cannot pass at altitude — which is the only place that
matters.

**Fix — two passes, which is JKA's own answer.** `CalcMuzzlePoint` (`openjk.md`-cited
`code/game/g_weapon.cpp:449`, and the caching note at `:457`) exists precisely so the crosshair
trace and the shot share one muzzle. Ours is cheap enough to just compute twice:

```js
    // pass 1 — a provisional direction from the body, only to resolve the flat `aim` the muzzle needs
    p.aim3.set(a3.x - p.pos.x, a3.y - (p.pos.y + 5.8), a3.z - p.pos.z).normalize();
    if (this.hardLock && this.hardLock.alive) p.faceDir(this.hardLock.pos.x - p.pos.x, this.hardLock.pos.z - p.pos.z);
    else p.faceDir(p.aim3.x, p.aim3.z);
    // pass 2 — ⚠ THE SHOT LEAVES THE MUZZLE, SO THE AIM IS MEASURED FROM THE MUZZLE. `faceDir` has
    // just written `aim`, which is the only input `muzzle()` needs beyond `pos`, so this is exact
    // and not a one-frame lag. Residual at 60° pitch was 2.94u — a clean miss on a 2.2u body.
    p.muzzle(_muz);
    p.aim3.set(a3.x - _muz.x, a3.y - _muz.y, a3.z - _muz.z).normalize();
```

`_muz` is a module-local `THREE.Vector3` in game.js. **Do not use `_v`** — it is live inside this
same function today (`game.js:3173`) and the shared-temp aliasing rule is a hard rule.

⚠ **`faceDir` must not be re-run after pass 2.** It sets both `facing` (the damped body yaw) and
`aim` (the flat XZ direction) — `pw-controls.md:127-133` lists the four systems reading `aim`: the
fog cone (`game.js:1226`), `_humanSees` (`:1252`), the guard arc (`entity.js:658`) and `coneFoe`
(`game.js:1828`). Running it twice with two slightly different vectors would make the body yaw
chase its own tail. Pass 1 owns facing; pass 2 owns only `aim3`.

⚠ **This changes the iso city too if you let it.** Keep pass 2 inside `if (p._openSky)`, or measure
the city case explicitly. The city's `a3.y = 3` ground point plus a near-level aim makes the
residual under 0.2u there, so it is a no-op — but *measure it*, do not reason it (§10.5).

### 6.3 `pickTarget` measures from the crosshair — `game.js:1486`

As §3.1. Two lines.

### 6.4 The crosshair is drawn at the projected aim point — `hud.update`, near `hud.js:1864`

```js
    // THE CROSSHAIR IS DRAWN WHERE THE SHOT GOES (JKA: CG_DrawCrosshair(trace.endpos),
    // cg_draw.cpp:2739). Unlocked with no hit the aim point is ON the camera's centre ray, so this
    // projects to screen centre and the reticle does not move — the change is invisible in the
    // common case and is the whole fix in the locked case, where chase()'s look-point bias
    // (world.js:2291) puts the enemy 16-42% of the gap off centre while the crosshair sat at 50/50
    // and turned red.
    if (pw) {
      const a = g._aim3pt;
      g.world.screenPosOf(a.x, a.y, a.z, this._csp || (this._csp = { x: 0, y: 0, behind: false }));
      const s = this._csp;
      if (s.behind) {                                   // ⚠ JKA's rule: "off screen, don't draw it"
        if (this._csOff !== true) { this._csOff = true; this.el.cross.style.visibility = 'hidden'; }
      } else {
        if (this._csOff !== false) { this._csOff = false; this.el.cross.style.visibility = ''; }
        const dx = Math.round(s.x - innerWidth * 0.5), dy = Math.round(s.y - innerHeight * 0.5);
        // ⚠ WRITE ONLY ON CHANGE. This runs at 60Hz and a per-frame style write is a layout thrash —
        // the same reason the powerworld/pw-locked classList toggles are cached at hud.js:1865-1866.
        if (dx !== this._csx || dy !== this._csy) {
          this._csx = dx; this._csy = dy;
          this.el.cross.style.transform = `translate(${dx}px, ${dy}px)`;
        }
      }
      // AND IT SAYS WHAT IT HAS. `hit` distinguishes "converged on a body" from "fell back to
      // AIM_MAX_D", which is the §5.5 discontinuity made visible instead of silent.
      const hot = !!g.hardLock || (g._aimHit && g._aimHit.kind === 'foe');
      if (hot !== this._lkCls) { this._lkCls = hot; document.body.classList.toggle('pw-locked', hot); }
    }
```

⚠ **`#hCross` is `position:fixed; left:50%; top:50%` with its four ticks at negative offsets**
(`hud.styles.js:971-982`). A `transform: translate()` on the parent moves the whole assembly and
touches nothing else. Do **not** change `left`/`top` — those are layout properties and would
invalidate on every frame.

⚠ `body.pw-locked` currently means "there is a hard lock" (`hud.js:1865`). Broadening it to "the
crosshair is on a foe" is a **deliberate meaning change** and it is the right one: the class exists
to say *this mark is hostile*, and under B that is now knowable without a lock. Record it in the
manual entry.

### 6.5 What is NOT touched, and why each one is deliberately left alone

| left alone | why |
|---|---|
| `game.js:3149-3163` — the **pad aim branches** | They build a heading from `this.right`/`this.fwd`, which are computed once in the constructor from the isometric `camDir` (`game.js:380-381`) and are **stale behind a chase camera** (`aaa-00-ground-truth.md:466-471`). That is a real, separate defect with its own fix (derive the basis from the live camera) and folding it in here would make the measurable in §10 unable to attribute a failure. **Written down, not fixed, and it means a gamepad in PowerWorld still aims on isometric axes.** |
| `pickTargetDir` has no `_vis` gate (`game.js:1518-1529`) | Same reason — an honesty-law hole already in the ledger (`POWERWORLD.md` §10). The new trace *does* gate; the pad path is untouched. |
| `cycleLock` (`game.js:1589-1620`) | Correct as written, including the captured ranking. It produces a fighter; §6.1 consumes a fighter through the existing `soft.center(a3)` path. |
| the gold ground reticle | Already hidden under `_openSky` (`game.js:1371-1372`) and correctly so. |
| `game.aimPoint` (`game.js:365`, written `:3193`) | Stays a **Y-zeroed ground point**. Its five consumers are all ground-targeted powers — meteor storm (`abilities.js:336`), the ground-marker powers (`:947`, `:1016`), the throw arc (`game.js:443`), summons (`summons.js:133`). Zeroing Y is correct for them. **Do not repurpose it.** The 3-D point is `game._aim3pt` (`game.js:368`), which already exists and is already what `a3` aliases. |
| the beam stream | §9. |

---

## 7. HOW IT BEHAVES IN BOTH GRAMMARS

**The design thesis is that altitude is the mode switch. The aim rule is deliberately NOT switched
by altitude** — it is one rule, and that is what makes the camera never change hands.

### 7.1 In the air (BFP grammar)

The camera looks at the lock or along the velocity. The trace runs from the eye through the
crosshair. In an empty sky it hits nothing and falls back to `AIM_MAX_D`, residual ≤ 1.03u. Put the
crosshair on a flier and it converges on them exactly — including the **45°-above** case that
currently misses by 8.67–14.52u, which is the single largest win in this document.

`p._openSky` (`game.js:233`, `:240`) already gates the branch. Nothing new is introduced.

### 7.2 On the ground (Jedi Academy grammar)

The trace now has a **real floor to hit** — `heightAt`, not `_groundPlane` (§5.2 item 5). Aiming
down a slope converges on the slope. Aiming at a fighter standing on a rock converges on the
fighter, because foes are tested before cover. Aiming at cover converges on the cover, which is
what makes shooting a spire out from under someone (manual §47) point where you looked.

The **melee** grammar reads `caster.aim`, not `aim3` — `coneFoe` (`game.js:1828`) dots against the
flat `aim`, which `faceDir` writes in pass 1 (§6.2). **So melee is unaffected by the convergence and
correctly so**: a punch does not converge, it reaches. The vertical gate `|Δy| > 10`
(`game.js:1827`, the altitude-plan F5 ruling) is untouched.

### 7.3 In the isometric city

Unreached. Every change is inside `if (p._openSky)` except `pickTarget`'s two-line branch (which is
also `_openSky`-gated) and `traceBox3`, which is a refactor with a byte-identical boolean wrapper.
**Proven, not asserted** — §10.5.

---

## 8. LOCK-ON — the three states, and which one owns the point

| state | source of the aim point | crosshair drawn at | facing |
|---|---|---|---|
| **hard lock** (`hardLock` set by a click on `_hoverPick` `game.js:3179`, or by `T`/`cycleLock` `:3187`) | ⚠ **the lock does not currently set `a3` at all** — see below | the lock's projected centre | the lock (`game.js:3196`) |
| **soft lock** (aim magnet, `pickTarget` → `soft`) | `soft.center(a3)` — `entity.js:315`, `pos + y5.2` | that point, projected | `aim3` |
| **free** | `aimTrace` | screen centre, by construction | `aim3` |

⚠ **A defect this spec found while writing the table.** `hardLock` decides **facing** (`:3196`) but
`a3` is only written by `soft` (`:3171`) or the free branch. `soft` is `pickTarget`'s magnet result,
which is *usually* the same fighter as the hard lock but need not be — the magnet is a screen-space
proximity search and the lock is sticky. **So it is currently possible to be hard-locked to A,
facing A, and shooting at B.** Under §6.3 (magnet measured from the crosshair) this gets *more*
likely, not less, because the crosshair and the lock can genuinely diverge.

**Ruling, and it follows directly from §4.3's "one world point":**

```js
      if (this.hardLock && this.hardLock.alive) this.hardLock.center(a3);   // the lock OWNS the point
      else if (soft) soft.center(a3);
      else if (p._openSky) { … aimTrace … }
```

A hard lock is an explicit statement that this is the target. It must own the aim point, the
facing and the crosshair, or "locked" means three different things at once. This also makes the
§10 invariant hold in the locked state, which it cannot today.

⚠ `blindT > 0` clears the lock (`game.js:3190`) and nulls `soft` (`:3165`) — the manual §14 rule.
The free branch then runs, and the trace should honour blindness the same way: **when
`p.blindT > 0`, pass `foes: []`** so a blinded player's crosshair cannot converge on a body they
cannot see. One line, and it keeps the blind rule from having a hole punched in it by a new system.

---

## 9. BEAMS — WHAT CHANGES, AND THE THING THAT MUST NOT

### 9.1 DO NOT REGRESS THE STREAM

`docs/powerworld/pw-bfp-source.md:502-517` (§8.3), read from the real BFP tree:

> `Weapon_BFPBeamRun` (`g_weapon.c:1043`) recomputes the beam base from the **current** muzzle and
> **current** forward, every frame … swinging the mouse sweeps the whole beam through an arc
> instantly, with no turn-rate cap. BFP's visible bend is a lagging client-side trail, not
> simulation.
> **This is the one place we are ahead of the source.** … **Do not "correct" our beam toward BFP's.**

Ours is `BeamHose` (`projectiles.js:540-800`): a fixed 44-node buffer where **each emitted packet
carries the direction it was fired with** and then simply travels (`projectiles.js:716-737`).
Measured in manual §42: 5.7° of bend on a held beam, **122.1° after a 100° sweep**, 88° between the
head and the current aim. A laser reads ~0 on all three.

**This spec touches none of it.** The beam reads `caster.aim3` in exactly two places:

- `projectiles.js:552` — `this.dir = caster.aim3.clone().normalize()` at construction,
- `projectiles.js:698` — `this.dir.lerp(c.aim3, clamp(this.steer*dt, 0, 1)).normalize()` per frame,
  the *steering* of the emission direction only.

Both consume `aim3` as **the direction the next packet is born with**. Changing what `aim3` *is*
changes where new packets are aimed; it cannot and does not change what already-emitted packets do.
**The stream is untouched by construction.** The §10 harness asserts this directly (§10.2 check 7)
by re-running manual §42's own sweep measurement and requiring the bend figures to be unchanged.

### 9.2 The muzzle correction *helps* the beam, twice

`projectiles.js:695` re-reads `c.muzzle(this.muzzle, faceOrigin ? 1.1 : undefined, faceOrigin ? 8.3 : undefined)`
every frame, so the beam already originates at the muzzle. Today `aim3` is measured from
`pos + 5.8` — a different point — so **a steeply-pitched beam has always been aimed from a place it
does not come out of.** §6.2 closes that. And `faceOrigin` beams (SOL's Heat Ray,
`characters.js` `lmb`, and VANGUARD's) come out of the **face** at `y + 8.3`, 2.5u above the
assumed origin, which makes it worse for exactly the two heroes whose beams are meant to be precise.

⚠ **`faceOrigin` is not yet reflected in the aim.** §6.2's pass 2 uses the default muzzle
(3.4 / 5.8). A complete job would ask the *active* slot for its muzzle parameters — but the aim is
computed before the slot is known, which is the same limitation as `AIM_MAX_D` (§5.3) and has the
same upgrade path (`game.aimRay`, per-ability convergence). **The residual for a face-origin beam is
`|8.3 − 5.8| · cos θ` = up to 2.5u at level pitch.** Written down, out of scope, loop 3.

### 9.3 What the crosshair honestly promises for a curved beam

A stream that bends when you turn cannot have a reticle that predicts where its far end will be —
that would require predicting the player's future input. **So the crosshair promises the FIRING
DIRECTION, not the terminal point of a steered stream.** That is a true statement and it is the one
the beam obeys: the packet emitted this frame is aimed at the aim point. Say so in the manual entry
so nobody later "fixes" the crosshair to lead a bent beam.

---

## 10. THE MEASURABLE — the invariant, the number, and the harness

### 10.1 THE INVARIANT (assert the relationship, not the value)

> **Every frame, in every aim state, the ray from the player's real muzzle along the player's real
> `aim3` passes within `N` of the world point the crosshair is drawn at.**

This is assertable in all three lock states, on the ground and in the air, and it is a *relationship*
— which is the law CLAUDE.md records after four consecutive test versions failed by writing values
(THE DIRECTION TRIANGLE, and the orbit-ceiling lesson).

### 10.2 `N = 0.35u`, and it is taken, not invented

`DECAL_LIFT = 0.35u` in `core/util.js` is this project's own declaration of *the smallest vertical
separation that means anything at this scale* (CLAUDE.md, SURFACES — THE FLICKER LAW). Anything
tighter is below the resolution at which the engine already refuses to distinguish two surfaces.
0.35u is **1/6 of a fighter's 2.2u radius** and **6.6 cm** at 1u ≈ 0.19 m.

Two thresholds, because they answer different questions:

- **`N_EXACT = 0.35u`** — for a *static* target. Convergence is analytic; the only error is
  floating point and one bisection step of the terrain march. This is the assertion that proves the
  fix.
- **`N_HIT = 2.2u`** (`entity.radius`, `entity.js:185`) — for a *moving* target sampled during a
  live fight. One frame at PowerWorld cruise (~100 u/s) is 1.67u of body travel, so nothing tighter
  than a body radius is meaningful against a mover. This is the assertion that proves it in play.

### 10.3 The harness — `src/bench/reticle.js`, exported as `LSW.reticleSuite()`

Same shape and the same four laws as `src/bench/powerworld.js` (which documents them at its head,
`powerworld.js:14-22`).

**⚠ LAW 4 — PROVE THE HARNESS FIRST.** Check 0 runs the §10.4 predictor against the *current*
`game.js:3172-3175` behaviour and requires it to reproduce the §2.3 table to ±0.15u. **If the
harness cannot measure the bug, nothing after it means anything.** Three earlier harnesses in this
repo went green while measuring their own arithmetic, and one asserted `[].every(...)`.

**⚠ LAW 1 — DRIVE THE GATE.** Nothing writes `aim3`, `a3`, `aimPoint` or `facing`. The suite pins
**absolute** positions for both bodies (holding the foe at `player.x + gap` lets the melee step-in
smear a measurement — `powerworld.js:21-22`), lets the **real** `controlPlayer` run, and reads
`p.aim3` and `p.muzzle(new THREE.Vector3())` afterward. It does **not** install a `controlPlayer`
override, because under the fix the free-aim path reads screen centre and there is nothing to drive.

**⚠ THE CAMERA MUST HAVE SETTLED.** `chase()` damps at 8/6/8 on the eye, 9/7/9 on the look point and
3.2 on the distance (`world.js:2288-2311`). At 60 fps, rate 3.2 is ~95% settled in 57 frames. Step
**120** frames and then *assert* settlement — `|Δ camPos| < 0.05u` between the last two frames —
rather than trusting the count.

**⚠ THE CROSSHAIR MUST BE WHERE THE TEST THINKS IT IS.** Before asserting the miss, project the aim
point with `world.screenPosOf` (`world.js:1904-1910`) and require it to land within 1 px of the
element's drawn position. A test that measures the shot against a point the crosshair is *not*
drawn at is measuring nothing. (This is why §2 was worth measuring: `chase()`'s look-point bias
means neither fighter is at screen centre when locked, and a naive "the foe is at screen centre"
precondition would silently never hold.)

The checks:

| # | check | pass |
|---|---|---|
| 0 | **harness proves itself** — the predictor reproduces the *current* miss at gaps 10/40/100 | within ±0.15u of 0.91 / 3.18 / 7.98 |
| 1 | **regression witness** — with the fix reverted, gaps ≥ 32 FAIL `N_EXACT` | they must fail, or the suite is blind |
| 2 | **free aim, level, 8 gaps** — 10, 16, 24, 32, 40, 52, 70, 100 | miss ≤ `N_EXACT` at every one |
| 3 | **free aim, vertical** — foe at 45° above, gaps 40 and 70; and directly overhead (the `horiz < 0.35` degenerate branch, `world.js:2266-2269`) | miss ≤ `N_EXACT` |
| 4 | **muzzle pitch** — foe directly above at 20u, aim pitch ≈ 80° | miss ≤ `N_EXACT`; **without §6.2 this reads 3.35u** |
| 5 | **hard lock** — `cycleLock` onto a foe, then measure | miss ≤ `N_EXACT`, and `screenPosOf(aimPoint)` == the crosshair's drawn position |
| 6 | **soft lock** — magnet acquires; measure | miss ≤ `N_EXACT` |
| 7 | **the beam did not regress** — re-run manual §42's sweep: hold a beam, sweep 100°, measure bend | held ≈ 5.7°, swept ≈ 122.1°, head-vs-aim ≈ 88°, each ±10% |
| 8 | **honesty** — foe with `_vis = 0.2` under the crosshair | the trace does **not** converge on them and does **not** stop on them |
| 9 | **blind** — `p.blindT = 1`, foe under the crosshair | no convergence on a body |
| 10 | **cover records are readable** — every record in `world.cover` yields a finite box from `traceBox3` | 0 refusals (§5.4) |
| 11 | **live fight** — 60 s AI-vs-AI in PowerWorld, sample the invariant every frame | worst-case miss ≤ `N_HIT`; **report p50 / p90 / worst** |
| 12 | **THE CITY IS UNCHANGED** | §10.5 |
| 13 | **cost** | §10.6 |
| 14 | **0 console errors**, three consecutive runs | |

### 10.4 The predictor (pure node, no engine — this is check 0)

Transcribed from `world.chase()`. It is what produced the §2.3 table and it is committed with the
suite so the numbers in this document can be re-derived by anyone.

```js
// src/bench/reticle-predict.mjs — chase() arithmetic, settled, no THREE, no DOM.
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
export function predictMiss(gap, { spd = 0, ay0 = 0 } = {}) {
  const k = clamp((spd - 14) / 96, 0, 1), fov = 58 + k * 16;
  let ax = 1, ay = ay0, az = 0; let L = Math.hypot(ax, ay, az); ax/=L; ay/=L; az/=L;
  ay = clamp(ay * 0.55, -0.82, 0.82);
  L = Math.hypot(ax, ay, az); ax/=L; ay/=L; az/=L;
  const fit = (Math.min(gap, 52) + 20) / (2 * Math.tan((fov * Math.PI/180)/2));
  const d = clamp(Math.max(24, fit * 1.15) + k * 16, 24, 86);
  const bias = clamp(gap * 0.012, 0.16, 0.42);
  const T = { x: ax*gap*bias, y: 5.4 + ay*gap*bias, z: az*gap*bias };
  const px = az / Math.hypot(ax, az || 1e-6), pz = -ax / Math.hypot(ax, az || 1e-6);
  const off = d * 0.17;
  const E = { x: -ax*d + px*off, y: 5.4 - ay*d*0.18 + d*0.30, z: -az*d + pz*off };
  let f = { x: T.x-E.x, y: T.y-E.y, z: T.z-E.z };
  const fl = Math.hypot(f.x, f.y, f.z); f = { x: f.x/fl, y: f.y/fl, z: f.z/fl };
  const hx = Math.hypot(ax, az) || 1;
  const M = { x: (ax/hx)*3.4, y: 5.8, z: (az/hx)*3.4 };          // entity.js:317-318
  const v = { x: M.x-E.x, y: M.y-E.y, z: M.z-E.z };
  const dot = v.x*f.x + v.y*f.y + v.z*f.z;
  const p = { x: v.x - f.x*dot, y: v.y - f.y*dot, z: v.z - f.z*dot };
  return { camDist: d, fov, miss: Math.hypot(p.x, p.y, p.z) };
}
```

### 10.5 THE CITY IS UNCHANGED — and it is measured, not reasoned

The four `_openSky` gates are where "provably identical" actually lives, so they are **driven**,
not argued about (manual §47's own rule for its four `||` fallbacks):

1. A city duel: assert **0 fighters carry `_openSky`**, `world.camMode === 'iso'`.
2. `pickTarget` in the city still reads `input.mouse.clientX/Y` — move the synthetic cursor and
   assert the acquired target changes.
3. `screenToGround` still owns the city aim: assert `a3.y === 3` after a frame (`game.js:3175`).
4. `_segBox3` byte-identical: run `updateOcclusion` over a generated Tokyo before and after the
   refactor and assert the **same set of faded buildings**.
5. `aim3` in the city measured from the muzzle vs from the body: assert the difference is **< 0.2u**
   — and if it is not, the pass-2 gate is wrong.
6. Every hero fires every slot: **52 × 364, 0 console errors** (the standing city-unchanged check
   `powerworld.js` already runs).

### 10.6 COST

⚠ **CPU timing around a frame measures submission, not work** (manual §46, and the print-pass
benchmark that reported tilt-shift as *faster than everything off*). `aimTrace` is pure CPU, so
here CPU timing is the right instrument — but the tab must be **foregrounded**, because a hidden
pane renders at 0×0 and `world._ema` reads ~98 ms (CLAUDE.md, ATLAS v1).

Method: batch-time 3,000 frames with `world.render` stubbed, PowerWorld and a generated Tokyo,
with and without the trace. Report ms/frame to three decimals against the standing figures — city
sim **0.680 ms/frame** (manual §47), PowerWorld **0.329×** the city sim. **Budget: the trace must
not move the PowerWorld sim frame by more than 0.05 ms.** If it does, the terrain march is the first
thing to cap (raise `step`, or skip it entirely when `R.y > -0.1`).

---

## 11. THE LOOP PLAN

Three loops. Each has a gate that is green or it is not.

**Loop 1 — measure, and build the witness.**
Gate: `src/bench/reticle.js` + `reticle-predict.mjs` committed; checks 0 and 1 green against the
**unfixed** engine (the predictor reproduces §2.3, and the live suite fails checks 2–6). Plus the
p50 engagement distance measured over 60 s of AI-vs-AI, replacing the interim `AIM_MAX_D = 162`.
*A fix verified against a gauge that cannot see the bug is a coin toss* (CLAUDE.md, THE FLICKER).

**Loop 2 — the fix.**
`traceBox3` + `aimTrace` + `AIM_MAX_D` + the `controlPlayer` patch + the muzzle two-pass + the
`pickTarget` branch + the hard-lock ownership ruling + the crosshair projection.
Gate: checks 2–14 green, three consecutive runs, 0 console errors, plus **a screenshot matrix** —
the crosshair on a foe at gaps 16 / 40 / 100 and at 45° above, locked and unlocked. ⚠ **The
screenshot is not optional and it is not decoration.** This project's record is unambiguous: the
boxing ring shipped four times too big behind six green assertions, the venue's audience was built
entirely outside the frame, and the PowerWorld rubble shipped black. Tests can prove a rule fires;
only the picture shows that the mark is on the man.
⚠ Clear the renderer's scissor rect before posing — the news camera leaves one (manual §42).

**Loop 3 — per-ability convergence (optional, and only if loop 2's numbers ask for it).**
`game.aimRay = {origin, dir, dist, hit}`; each ability converges at its own `reachOf`
(`hudUtil.js:189-196`); `faceOrigin` muzzles resolved per slot (§9.2).
Gate: a 145u beam and an 11u jab each converge at their own range, and `AIM_MAX_D` is deleted.

---

## 12. WHAT THIS DOES NOT DO — named, so nobody thinks it was covered

1. **Gamepad aim in PowerWorld still runs on isometric axes.** `this.fwd`/`this.right`
   (`game.js:380-381`) are constructor-time constants from the iso camera and are read by the pad
   branches (`:3149`, `:3161`, `:3385`), the double-tap evade direction (`:3310`) and the
   `moveRelative === 'camera'` path (`:3298`). Separate defect, separate fix, already in
   `aaa-00-ground-truth.md:466-471`.
2. **`pickTargetDir` still has no `_vis` gate** (`game.js:1518-1529`) — the honesty hole in the pad
   targeting path, already in the ledger.
3. **`hardLock` still tracks through walls** — only the marker hides (`game.js:1382`); `faceDir`
   keeps following the live body (`:3196`). Also already in the ledger.
4. **The camera still does not collide** — `openjk.md:2086` (§7.2). `traceBox3` is exactly the
   primitive that fix needs, so this spec makes it cheaper; it does not do it.
5. **No mouse-look is added.** If free-look ever lands, the aim rule here is unchanged — the trace
   already runs through the crosshair, wherever the camera is pointed.
6. **`faceOrigin` muzzles are not resolved per slot** (§9.2) — up to 2.5u residual for SOL and
   VANGUARD.
7. **The beam is not "corrected" toward BFP.** `pw-bfp-source.md:512-517` — we are ahead of the
   source there and it stays that way.

---

## 13. CITATION INDEX

**Our engine, read 2026-07-27:**

| claim | file:line |
|---|---|
| the aim bug | `src/engine/game.js:3172-3175` |
| `aim3` derived from `pos + 5.8` | `src/engine/game.js:3194` |
| facing follows lock else aim3 | `src/engine/game.js:3196-3197` |
| `aimPoint` decl / write | `src/engine/game.js:365` / `:3193` |
| `_aim3pt` | `src/engine/game.js:368`, `:3146` |
| `pickTarget` reads the mouse cursor | `src/engine/game.js:1485-1515`, cursor at `:1486`, `_vis` gate `:1491`, hover radius `:1495`, `_hoverPick` `:1512`, aimAssist `:1513` |
| `pickTargetDir` (pad) | `src/engine/game.js:1518-1529` |
| `cycleLock` | `src/engine/game.js:1589-1620` |
| hard lock set on click / `T` | `src/engine/game.js:3179` / `:3187` |
| blind clears the lock | `src/engine/game.js:3190` |
| `updateReticle`, `_openSky` branch | `src/engine/game.js:1364-1393`, gate `:1371` |
| lock marker built | `src/engine/game.js:1345-1362` |
| `canSee` | `src/engine/game.js:1438-1456` |
| `_flung` record / `hitFlung` / ownership guard | `src/engine/game.js:876-880` / `:927` / `:931-932` |
| `_openSky` set on every entity | `src/engine/game.js:233`, `:240` |
| stale iso basis `fwd`/`right` | `src/engine/game.js:380-381` |
| `_segBox3` | `src/engine/world.js:1439-1452` |
| `_segBox3` called by the cutaway | `src/engine/world.js:1364` |
| `screenToGround` | `src/engine/world.js:1454-1459` |
| `screenPosOf` | `src/engine/world.js:1904-1910` |
| `hitInteriorWall` (interiors are a separate list) | `src/engine/world.js:674-682` |
| `chase()` | `src/engine/world.js:2242-2325` |
| FOV rides speed | `src/engine/world.js:2247-2248` |
| pitch damping / degenerate case | `src/engine/world.js:2258` / `:2266-2269` |
| chase distance derived from gap | `src/engine/world.js:2287-2289` |
| look-point bias | `src/engine/world.js:2291-2292` |
| eye placement, shoulder offset | `src/engine/world.js:2307-2308` |
| damping rates | `src/engine/world.js:2288`, `:2293-2295`, `:2309-2311` |
| `setCameraMode` | `src/engine/world.js:2215` |
| `_ndc` module temp | `src/engine/world.js:2409` |
| `Fighter.muzzle` | `src/engine/entity.js:317-318` |
| `Fighter.center` | `src/engine/entity.js:315` |
| `radius = 2.2` | `src/engine/entity.js:185` |
| `aim3` declared | `src/engine/entity.js:180` |
| `#hCross` markup | `src/engine/hud.js:240` |
| `#hCross` style / `pw-locked` | `src/engine/hud.styles.js:970-989` / `:988-989` |
| class toggles off `_openSky` / `hardLock` | `src/engine/hud.js:1864-1866` |
| `reachOf` / `slotFacts` | `src/engine/hudUtil.js:189-196` / `:201-214` |
| projectile spawns at `c.muzzle` | `src/engine/abilities.js:122, 145, 171, 196, 283, 508, 682, 740` |
| `aimPoint` consumers (ground-targeted) | `src/engine/abilities.js:336, 947, 1016`; `src/engine/game.js:443`; `src/engine/summons.js:133` |
| `BeamHose.dir` at construction | `src/engine/projectiles.js:552` |
| beam re-reads the muzzle per frame | `src/engine/projectiles.js:695` |
| beam steers `dir` toward `aim3` | `src/engine/projectiles.js:698` |
| the stream advance (packets keep their direction) | `src/engine/projectiles.js:716-737` |
| projectile `life` default 3 | `src/engine/projectiles.js:109` |
| PowerWorld cover registration | `src/engine/powerworld.js:366-370`, rocks `:443` |
| the pw harness and its four laws | `src/bench/powerworld.js:14-22` |

**Research docs:**

| claim | doc:line |
|---|---|
| "THE AIM BUG … Fix this first", options A and B, the 6.8u figure | `docs/reference/openjk.md:2045-2085` |
| the rule: decide character or camera, make the crosshair agree | `docs/reference/openjk.md:2083-2085` |
| B needs only a different intersection for `screenToGround` | `docs/reference/openjk.md:2077-2079` |
| JKA's `//old way` vs `//100% accurate`, `cg_draw.cpp:3036-3080` | `docs/reference/openjk.md:372-405` |
| `cg_dynamicCrosshair` defaults to 1 | `docs/reference/openjk.md:407-409` |
| the crosshair is drawn at the traced endpoint; off-screen → don't draw | `docs/reference/openjk.md:415-435` |
| `CalcMuzzlePoint` is per-weapon geometry, and is cached so trace and shot agree | `docs/reference/openjk.md:443-475` |
| MP re-derives the camera server-side and drops both damping channels — the argument for originating at the character | `docs/reference/openjk.md:487-500` |
| the camera does not collide; `_segBox3` is already the right function | `docs/reference/openjk.md:2086-2123` |
| BFP's beam is a straight laser re-aimed every frame; **we are ahead; do not regress** | `docs/powerworld/pw-bfp-source.md:502-517` |
| the reconstruction's guessed numbers, and which to distrust | `docs/powerworld/pw-bfp-source.md:9-36` |
| camera constants were **not** audited in the BFP tree | `docs/powerworld/pw-bfp-source.md:552-554` |
| `screenToGround`'s four failures behind a chase camera | `docs/powerworld/pw-controls.md:82-96` |
| camera-forward aim + convergence, and "do not roll a second spherical" | `docs/powerworld/pw-controls.md:98-121` |
| `D` should come from the ability's own range | `docs/powerworld/pw-controls.md:117-119` |
| the four systems that read `p.aim` | `docs/powerworld/pw-controls.md:127-133` |
| the parallax bug is the highest-value known defect | `docs/powerworld/aaa-00-ground-truth.md:436-446` |
| `this.fov` is false in PowerWorld, so `_vis` is pinned to 1 | `docs/powerworld/aaa-00-ground-truth.md:473-476` |
| the crosshair is CSS, toggled from `hud.js:1864-1865` | `docs/powerworld/aaa-00-ground-truth.md:484-486` |
| stale iso basis; double-tap evade dashes on isometric axes | `docs/powerworld/aaa-00-ground-truth.md:466-471` |
| "the bug to fix first" | `docs/powerworld/aaa-00-ground-truth.md:768` |
| the defect ledger (pad `_vis` hole, lock-through-walls) | `docs/POWERWORLD.md:314-332` |
| the kill test is a screenshot matrix, not an assertion suite | `docs/POWERWORLD.md:355-359` |

**Corrections this document makes to the record** (both belong in the research docs when they are
next touched):

1. `openjk.md:2045` cites `game.js:2986-2989`; the live site is `game.js:3172-3175`.
   `pw-controls.md:139` cites `game.js:283`/`:2751` for `aimPoint`; the live sites are `game.js:365`
   and `:3193`.
2. `openjk.md:2062-2064` says the miss is a constant 6.8u and that the angular error is worst up
   close. Measured (§2.3): the miss ranges **0.47u → 7.98u** and **grows with range**, because the
   chase distance is derived from the gap and the shoulder offset is `d · 0.17`. Up close the shot
   lands. The bug is a long-range and a vertical bug.

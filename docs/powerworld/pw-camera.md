# POWERWORLD — THE LOCK-ON CHASE CAMERA

Planning document. No code written. Every claim below is cited to `file:line` as read on 2026-07-26.
Anything I could not verify is in §6 and flagged inline with **GUESS**.

Target feel: Bid For Power / Earth's Special Forces — third person, lock-on framing, high-speed air
combat. POWERWORLD is a **separate dimension**; the city game keeps its isometric camera.

---

## 0. WHAT THE CAMERA IS TODAY (the baseline every claim below rests on)

`src/engine/world.js:48-57`

```
this.camTarget = new THREE.Vector3(0, 6, 0);
this.frustum = 78;          // world units of vertical view (zoom)
this.frustumTarget = 78;
this.camDir = new THREE.Vector3(0.86, 0.92, 0.86).normalize(); // iso-ish angle
this.camDist = 260;
this.camera = new THREE.OrthographicCamera(-frustum*asp, frustum*asp, frustum, -frustum, 1, 1400);
```

- `camDir` normalises to ≈ `(0.564, 0.603, 0.564)` → the lens sits ~37° above the horizontal
  (this angle is already load-bearing in *content*: `boxingring.js:72-77` derives the scoreboard
  height from `cos(37°)` and says so).
- `camDist` is **never changed anywhere** — only `world.js:1236` and `world.js:1260` read it.
- `camDir` is written only by `world.orbit` (`world.js:1229`); read by `world.js:1236/1260` and by
  `game.js:297`.
- `follow(target, dt)` (`world.js:1244-1267`) damps `camTarget` (λ 8 xz / 6 y), eases `frustum`
  (λ 3.5 → `_baseFrustum`, then λ 10), rebuilds the ortho box, adds shake, `lookAt`, and drags the
  sun's tight 110u shadow frustum along (`world.js:93-96, 1264-1266`).
- `orbit(cam)` (`world.js:1227-1242`) is the map tool's channel: it writes `camDir` from
  `{yaw,pitch}` and `frustum` from `zoom`. Same ortho camera — the comment at `world.js:1225-1226`
  says explicitly *"nothing else in the pipeline has to know about it."* That comment is the thing
  this whole project needs to stop being true.
- Composer: `world.js:1191-1204` — HDR HalfFloat RT (`samples:2`) → `RenderPass(this.scene, this.camera)`
  → half-res `UnrealBloomPass` → `OutputPass` → `PrintPass`.

---

## 1. WHAT AN ORTHOGRAPHIC → PERSPECTIVE SWITCH ACTUALLY BREAKS

Verdicts: **BREAKS** = wrong output / throws. **DEGRADES** = still runs, reads wrong.
**DOESN'T CARE** = camera-agnostic.

### 1.1 `screenToGround` — mouse aim → **DOESN'T CARE (already correct)**

`world.js:1366-1371`

```
_ndc.set((mx/innerWidth)*2-1, -(my/innerHeight)*2+1);
_ray.setFromCamera(_ndc, this.camera);
_ray.ray.intersectPlane(_groundPlane, out);
```

`Raycaster.setFromCamera` branches on `isPerspectiveCamera` / `isOrthographicCamera` internally, so
this is already projection-correct. Exactly **one** caller: `game.js:2741`. And `_groundPlane` is
`y = 0` (`world.js:1985`) — which is already a lie on relief terrain and in a sky fight, but it is
*equally* a lie today. Under perspective it gets worse in one specific way: aiming at the horizon
makes the ray nearly parallel to the plane, so the intersection shoots to hundreds of units away or
misses (`intersectPlane` returns `null` and `out` is left **stale**, which is a real hazard the ortho
camera never exposed because the iso ray always hits at ~37°).

**Action for POWERWORLD:** don't use the ground plane. A DBZ sky fight aims at a *fighter* or at a
point at a fixed range along the ray. Note that when a target is locked, `game.js:2741` never calls
`screenToGround` at all (`if (soft) soft.center(a3); else ...`), so a lock-on-first mode mostly
sidesteps this — but the unlocked case needs a range-along-ray fallback, not a plane hit.

### 1.2 The fog-of-war shader plane → **BREAKS (as a concealment device)**

`fog.js:73-77` — a single `PlaneGeometry(700,700)` at `rotation.x = -π/2`, `position.y = 0.4`,
`renderOrder 2`, scaled by `_fitFog` to `max(700, arena*2+140)` (`fog.js:80-86`). The shader
(`fog.js:42-71`) darkens ground texels outside a vision cone.

Fog of war here is a **ground decal, not a volume**. Viewed at 37° from above it reads as darkness
over the streets. Viewed from a chase camera behind a fighter — especially one at altitude looking
down a lane, or one low and level — the plane is either seen edge-on (hides nothing) or you look
straight *past* its edge. There is no version of a flat quad that conceals a sky brawl.

Two further facts:
- The plane is **centred on the origin and never moved** (`fog.js:75`); nothing repositions it. Fine
  while the ortho view is bounded; a perspective camera can look off its edge.
- **The AI honesty law is not affected.** `game.canSee` (`game.js:1256-1275`), `_humanSees`
  (`game.js:1247-1254`) and the per-entity `_vis` gate (`game.js:1227-1245`) never read the plane —
  `fog.js:11-12` states this explicitly ("fog SHADING is approximate… Gameplay LOS is EXACT and
  separate").

**Action:** POWERWORLD calls `world.setFogEnabled(false)` (`fog.js:96`) and keeps `game.fov` true so
`updateVision` still runs the honest `_vis`/`canSee` machinery. That is a two-line change with zero
fairness consequence. Alternatively set `game.fov = false` (`game.js:288`), which `updateVision`
already handles as a complete early-out at `game.js:1223` (sets every `_vis = 1`, shows every entity,
disables the plane) — a legitimate design choice for a mode where everyone senses ki, but it
*also* switches off `pickTarget`'s visibility gate (`game.js:1309`) and the foe-arrow gate
(`hud.js:791`), so it is the bigger change of the two.

### 1.3 `updateOcclusion` — the tower cutaway → **DEGRADES badly; should be turned OFF**

`world.js:1271-1318`. Reads `this.camera.position` (`world.js:1273`), runs `_segBox3` from the lens
to `player.y + 6` for every cover box with `top >= 44`, and lazily **clones materials** to fade them
(`world.js:1280-1283`).

Why it degrades: the cutaway exists because a *fixed* 37° lens 260u away puts towers between you and
the ground reliably and predictably. A chase camera 42u behind the player has a totally different
occlusion profile — it clips *into* geometry rather than seeing over it, and fading a building you
are standing inside of at 0.16 opacity is not a cutaway, it is a hole in the world. Worse, a rapidly
yawing camera makes the hit set churn, so the lazy material clone/dispose cycle at
`world.js:1280-1294` runs constantly — the exact material churn the light-count law's neighbour
warns about.

**Action:** POWERWORLD sets a flag that makes `updateOcclusion` skip the cover loop. This is a
straight perf *win* (no clones, no dispose churn) and it must be replaced by real **camera
collision** (§2.6).

Also in the same function and same verdict: the **interior cutaway** (`world.js:1300-1316`) is
keyed on the *player* being inside a footprint, not the camera — that logic is camera-agnostic and
survives, but a chase camera outside the shell while the player is inside now sees the faded shell
from the wrong side. Not fatal; POWERWORLD probably has no interiors.

### 1.4 The canopy cutaway → **DEGRADES (same cause, cheaper fix)**

`world.js:1324-1350` (`_updateCanopyCut`). It projects each canopy onto the 2D camera→player
segment and scales matching instances away, capped at 160 matrix writes/frame
(`world.js:1340`). It is purely 2D-XZ, so it does not care about projection *type* — but it does
care that the camera is far away and above. From 42u behind, `t` (the along-segment parameter,
`world.js:1332`) collapses and the guard `t > 0.03 && t < 0.99` (`world.js:1335`) will nominate the
canopies immediately in front of the lens. That is roughly the right behaviour by accident. Leave it
on; it is bounded and cheap (CLAUDE.md measured 0.039ms).

### 1.5 `frustum`-based zoom (`setBaseZoom`, `punch`, two-player fitting) → **BREAKS**

- `setBaseZoom(f)` — `world.js:1218`. Callers: `game.js:3177` (two-player spread fit) and
  `game.js:3180` (single player, hard 78).
- `punch(z)` — `world.js:1220` — `frustumTarget = min(frustumTarget, frustum*z)`. **25 call sites**
  across `abilities.js` (8), `game.js` (7), `melee.js` (4), `projectiles.js` (3), `summons.js` (3).
  Every one of them is a combat feel beat (haymaker, nova, ground slam, car explosion, tier-up).
- `follow` writes `camera.left/right/top/bottom` (`world.js:1255-1256`), as do `resize`
  (`world.js:1212-1213`) and `orbit` (`world.js:1233-1234`).

A `PerspectiveCamera` has **no** `.left/.right/.top/.bottom`. Assigning them is silently ignored,
`updateProjectionMatrix()` then rebuilds from `.fov/.aspect/.near/.far`, and the zoom simply stops
working. Nothing throws — which is the dangerous part.

`followHumans`'s two-player fit (`game.js:3173-3178`) — `setBaseZoom(clamp(spread*0.6+56, 78, 128))`
— is genuinely a different problem under perspective: fitting two subjects means solving for
**distance** (or FOV) from the subject *separation projected perpendicular to the view axis*, not
from raw XZ spread. Raw spread over-pulls when the two are separated *along* the view axis.

**Action:** `punch(z)` must become mode-aware — under perspective it maps to a short **distance**
pull-in (a dolly, which is what `punch` visually is) rather than a frustum shrink. Keeping the same
public name and the same 25 call sites untouched is the right trade: one `if` inside `punch`.

### 1.6 `_pixelCap` / adaptive quality → **DOESN'T CARE (but the baseline moves)**

`world.js:1936-1939` caps total shaded pixels at 2.6e6; `_applyQuality` (`world.js:1940-1951`) sets
`renderer.setPixelRatio` + `composer.setPixelRatio` + bloom size/strength and drops the shadow pass
at tier 0. All resolution, no camera. `render()`'s governor (`world.js:1928-1932`) reacts to
`_ema` — down at >24ms, up at <17.2ms.

Honest consequence, not a break: a wide perspective chase camera draws **more geometry** than a
bounded 156u-tall ortho box, so POWERWORLD's frame cost baseline is higher and the governor will
sit a tier lower more often. That is the governor doing its job. But two specific things do need
attention:
- **The shadow frustum is a fixed 110u half-extent** following `camTarget` (`world.js:93-96`,
  `1264-1266`). At 42–68u standoff with a 50–65° FOV you see far more than 220u across, so shadows
  will visibly **cut off in a straight line** mid-scene. Either fit the shadow frustum to the chase
  camera, or drop shadows in POWERWORLD.
- **The sky dome is `SphereGeometry(900)` added at the origin and never moved** (`world.js:126-127`).
  `arena = N * cell / 2` (`cityplan.js:681`), N up to 9 and cell up to 240, so a corner can sit
  >600u from the origin — the near side of the dome is then only ~290u away, and a rotating
  perspective lens will show the gradient swing and possibly the dome edge. The precedent for the fix
  is already in this repo and explains itself: `spaceflight.js:957-962` rides the starfield with the
  camera *because* "a 34,000-unit lane walks straight out of a 26,000-unit sphere."

### 1.7 ⚠ DEPTH PRECISION AND THE SURFACE-SEPARATION LAW → **BREAKS, and this is the sleeper**

`core/util.js:66-102` is a written law about z-fighting, with `DECAL_LIFT = 0.35` (`util.js:90`) and a
`GROUND_LAYER` rung ladder (`util.js:92`). Every one of those numbers was calibrated **against an
orthographic camera**, where the depth buffer is *linear* — precision is uniform from near to far.

Under perspective, depth is `1/z` distributed: nearly all precision sits at the near plane. The news
POV camera uses `near = 0.5` (`newscrew.js:47`) and a chase camera is tempted to do the same. With
`near = 0.5, far = 2500`, the effective precision at 300u out is orders of magnitude worse than the
ortho camera's, and a 0.35u (6.6cm) decal lift will tear — reintroducing exactly the crawling ground
the law was written to kill.

Two aggravating factors specific to a chase camera:
- **Grazing angles.** A low chase camera sees ground decals nearly edge-on, which is the worst case
  for coplanar surfaces regardless of precision.
- **Two decals already sit on invented numbers, not on `GROUND_LAYER` rungs**, and a grazing camera
  will expose both: the throw-arc landing ring at `y = 0.3` (`game.js:495`, and note `ROAD_LIFT` is
  `0.4` at `util.js:95` — the ring is *below* the carriageway), and the soft reticle ring at
  `y = 0.35` (`game.js:1206`), which collides with `GROUND_LAYER.stateRing = 0.35`. Both have
  `depthWrite: false` but still depth-**test** (`game.js:455`, `game.js:306`), so they can be
  swallowed. Pre-existing; POWERWORLD makes them visible.

**Action:** push `near` out as far as the design allows (the camera is never closer than ~20u to
anything it must draw — start at `near = 4`) and re-run `world.auditSurfaces()` (`world.js:1901`)
from the chase camera. Do **not** reach for `logarithmicDepthBuffer` — it is a `WebGLRenderer`
construction flag, cannot be toggled at runtime, and changes every material's program.

### 1.8 HUD radar / foe arrow / altitude → **MOSTLY FINE, one real hazard**

- **Radar** (`hud.js:1465-1526`) is pure world-XZ against `world.ARENA` (`hud.js:1470`). It never
  touches the camera. **DOESN'T CARE.** It does draw the player's *aim* wedge from `P.aim`
  (`hud.js:1494-1495`) which stays correct.
- **Altitude** — the four-rung ALT ladder was **already removed** and moved into the world:
  `hud.js:538-545` documents this, and `entity._altTag` (`entity.js:315-327`) is a `Sprite` with
  `depthTest:false` parented to `groundRig`. Sprites are camera-facing, so **DOESN'T CARE**. The
  height it prints is `pos.y - groundY` scaled by 0.19 (`entity.js`, and the same maths at
  `hud.js:674`) — projection-independent.
- **Foe arrow** (`hud.js:784-812`) and everything else that calls `world.screenPosOf`
  (`world.js:1767-1773`): `_proj.set(x,y,z).project(this.camera)` works for both camera types. The
  `behind` test is `_proj.z > 1` (`world.js:1771`). For perspective, a point behind the lens has
  `w_clip < 0` and lands at NDC z > 1, so the test *happens to work* — and `updateFoeArrow` already
  flips the bearing for it (`hud.js:801`: `if (sp.behind) { dx = -dx; dy = -dy; }`), which is the
  mathematically correct correction for the negative-w flip. `hitDirection` does the same
  (`hud.js:1534`). **This is a lucky pass, not a designed one** — the same expression also catches
  "beyond the far plane", so a distant foe would be reported as *behind you* and the arrow would
  point the wrong way. **DEGRADES**, and it is a one-line fix (test view-space z, or clamp).
- Same `screenPosOf` dependency, all fine but subject to the same `behind` caveat: the altitude
  column chips (`hud.js:666`), damage numbers (`hud.js:1756`), DPS meters (`hud.js:1787`),
  `pickTarget`'s on-screen hit test (`hud`-adjacent, `game.js:1310/1312/1320`).
- **`pickTarget` (`game.js:1303-1333`) needs re-tuning, not fixing.** It sizes the hover hit-box from
  the on-screen distance between the body's waist and head (`game.js:1312-1313`,
  `half = max(28, |sp-sp2| + 22)`) — that is projection-agnostic *by construction*, which is good
  design that pays off here. But the `nearD = 110` magnet radius and the `34px` ground-column radius
  (`game.js:1305, 1323`) are pixel constants tuned against a fixed ortho scale; under perspective the
  same world offset is a wildly different pixel count at 26u vs 68u standoff.

### 1.9 `hud.updateThrowArc` → **DOESN'T CARE (it is world geometry)**

`game.js:459-512`. It steps the same parabola the projectile flies and places 26 world-space dot
meshes. No camera. The apex/OUT-OF-REACH rule (`game.js:497-509`) is world maths. Only the landing
ring's decal height is at risk (§1.7).

### 1.10 The establishing card / opening cinematics / KO cam / spectate → **BREAKS, and it is already half-broken**

`game.mapCam` is written in **four** places:
- `opening.js:54` (the ten cold-opens; cleared at `opening.js:391`)
- `hud.js:345/350` (the atlas live-3D mount)
- `game.js:538-539` (`updateKoCam`)
- `game.js:615` (`updateSpectate`)

It is **read in exactly one place**: `game.js:3061` — and that line is inside the
`if (!this.running)` branch (`game.js:3058`).

**Finding worth reporting on its own:** `game.running` is never set false by a knockout
(`grep "running = false"` in game.js returns only the ctor at `game.js:284`), and
`followHumans` at `game.js:3167` runs **unconditionally** inside the running path and calls
`world.follow` every frame. So **the KO cam (`game.js:528-540`) and the spectator camera
(`game.js:598-616`) currently have no effect during a live match** — they write `mapCam`, and
`followHumans` overwrites the camera on the same frame. Corroborating detail: both of them read
`this.world.orbitAngle` (`game.js:532, 615`) and **`orbitAngle` is never assigned anywhere in the
repo** — it is permanently `undefined || 0`.

That matters for §3: "`game.mapCam` is a documented camera channel" is true of the *comment* and half
true of the wiring. If POWERWORLD is built on that channel, the channel has to be finished first —
and finishing it fixes the KO cam for free.

`showEstablishing` (`hud.js:1315`) is DOM-only and doesn't care.

The opening director is the sharper problem: all ten variants drive `{yaw, pitch, zoom, x, z}`
(`opening.js:53`, and ~14 `cam:` beat functions at `opening.js:90, 105, 137, 177, 189-192, 220, 247,
264-265, 287, 302, 315-317, 338…`). `zoom` is an **ortho frustum half-height** — `opening.js:264-265`
sets `cam.pitch = 1.5; cam.zoom = A*1.05 - k*(A*0.45)` where `A` is the arena half-extent. Those
numbers are meaningless as a perspective FOV or distance. **POWERWORLD must keep the openings on the
ortho camera** (cheapest correct answer: cold-open in ortho, then hand over to the chase camera at
`finish()`), or every cinematic needs re-authoring.

### 1.11 `game.fwd` / `game.right` — the movement basis → **BREAKS, and this one is subtle**

`game.js:296-299`

```
const cd = this.world.camDir;
this.fwd = new THREE.Vector3(-cd.x, 0, -cd.z).normalize();
this.right = new THREE.Vector3().crossVectors(this.fwd, new THREE.Vector3(0,1,0)).normalize();
```

Computed **once, in the constructor**, and never recomputed — not even by `world.orbit`, which does
change `camDir`. Three live consumers:
- `SETTINGS.moveRelative === 'camera'` (`settings.js:71-73`, `game.js:2800-2804`) — the "W always
  goes up-screen" option.
- The gamepad right-stick aim basis (`game.js:2736` for P1, `game.js:2883` for P2).
- The **double-tap evade direction** (`game.js:2812`).

A chase camera's yaw changes every frame. So in POWERWORLD: `'camera'` movement would follow a
camera that no longer exists, and *pad aim and evade direction would be wrong for everybody
regardless of the movement setting*. These must become live (recomputed per frame from the active
camera's yaw). Note the mouse/`'aim'` path is safe — it builds its basis from `p.aim3`
(`game.js:2793-2799`), which is exactly why Robert's 2026-07-25 fix ("movement follows the mouse, not
the camera", `game.js:2785-2792`) also happens to make POWERWORLD easier.

### 1.12 `printpass.js` → **ONE effect degrades; the rest don't care**

- **Tilt-shift is a SCREEN BAND** (`printpass.js:96-103`), and the comment says why that is
  *correct* for this camera: "A tilt-shift lens rotates the focal PLANE; on a fixed isometric view
  that plane maps to a horizontal band." On a chase camera the focal plane is no longer a horizontal
  screen band — the justification evaporates. It still *runs*; it just stops being a tilt-shift and
  becomes an arbitrary blur band. The DIORAMA preset (`settings.js:126-127`) should be excluded from
  POWERWORLD, or the effect switched to a depth range there (which needs the depth pre-pass
  `printpass.js:20-26` already costs out and declines).
- Ink (luminance Sobel, `printpass.js:119-138`), halftone, palette, grain, dither, vibrance, the
  impact frame and the per-world grade are all operations on a finished 2D image. **DON'T CARE.**
- Speed lines (`printpass.js:165`) are driven by `uSpeedC` from `world.toScreen`
  (`world.js:168-175`), which uses `.project(this.camera)` — correct under both. **DOESN'T CARE.**
- The `FETCH_BUDGET` ladder (`settings.js:135-143`) is per-pixel and camera-agnostic.

### 1.13 `vfx.js` and `systems.js` camera readers → **DOESN'T CARE**

- `vfx.js:209` — non-flat rings copy `world.camera.quaternion`. Works for any camera; will read
  *better* under a chase camera because it will actually be billboarded toward a varying lens.
- `systems.js:118-127` — rain respawns particles around `world.camera.position` within ±280u.
  Camera-agnostic; but 280u was sized for a camera 163u above the target, so from a low chase camera
  rain will visibly *end* 280u away. **DEGRADES cosmetically.**

### 1.14 `spaceflight.js` / `hqglobe.js` — why they already build their own perspective cameras

Both **build a fresh `PerspectiveCamera`** rather than reusing or converting the game's:
- `spaceflight.js:84` — `new THREE.PerspectiveCamera(52, aspect, 0.1, 60000)`
- `hqglobe.js:137` — `new THREE.PerspectiveCamera(42, aspect, 0.5, 40000)`

The reason is documented in CLAUDE.md ("THE AIR AROUND THE EARTH", and again in "INCORPORATE ON THE
GLOBE"): **the game camera is orthographic, so cloning `world.camera.constructor` with perspective
args builds a degenerate frustum** and renders the planet into a six-pixel strip that looks exactly
like a broken shader. The written advice there — "borrow the news crew's POV camera" — is a
*test-harness* instruction for posing a headless shot, not something these two modules do; I found no
code path that borrows `news.cam` (`grep "news.cam"` finds only comments at `newscrew.js:394, 505`).

Practical upshot for POWERWORLD: **there is no conversion path.** You add a second camera object.
That is what both existing perspective screens do, and it is what §3 recommends.

### 1.15 The news crew's POV — the existing perspective precedent, in detail

`newscrew.js`:
- `19` — `const W = 320, H = 180`
- `47` — `this.cam = new THREE.PerspectiveCamera(34, W/H, 0.5, 1100)`
- `446-474` `_poseCamera`: eye at shoulder height, look at a smoothed focus, **FOV derived from
  subject spread and distance** —
  `fovT = clamp(radToDeg(2*atan((spreadSm*0.5 + 9)/dist)), 21, 58)` (`newscrew.js:458-459`), with a
  `×0.86` snap-zoom on a moment (`462`), damped `damp(this.fov, fovT, 3.2, dt)` (`463`), layered
  handheld sway scaled by `0.014*fov` (`467`), then `cam.fov = …; updateProjectionMatrix(); lookAt(…)`
  (`470-471`) and a roll (`472-473`).
- `502-526` `_renderPOV` — and this is the important structural fact: it **bypasses the composer
  entirely**. `r.setRenderTarget(null)` (`512`), `setViewport/setScissor(0,0,W/pr,H/pr)` +
  `setScissorTest(true)` (`513-515`), `r.render(g.scene, this.cam)` (`516`),
  `setScissorTest(false)` (`517`), `setViewport(0,0,innerWidth,innerHeight)` (`518`), then a 2D blit
  out of the GL buffer's bottom-left corner (`524`). It also pauses `shadowMap.autoUpdate` (`511`)
  and force-shows fog-hidden entities (`509-510, 521`).
- `394-396` — it **warms its own shader path once** at the top of the match: "its POV compiles
  programs the main camera never used, and a first-compile mid-fight is a visible hitch." My reading
  is that this is caused by rendering to `null` (default framebuffer, sRGB output) instead of the
  HalfFloat composer RT, not by the camera *type* — but I did not verify that, so treat it as a
  reason to prewarm the chase camera too (§5).

Two consequences for POWERWORLD:
1. A second perspective camera drawing this scene is **proven to work** in this engine, every frame,
   in a live match.
2. There are **two different patterns** in the codebase and POWERWORLD wants the *other* one:
   - **(A) newscrew** — `renderer.render(scene, otherCam)` into a scissored corner, **no post chain**.
   - **(B) spaceflight / hqglobe** — swap `composer.passes[0].camera` (and `.scene`), **inherits the
     whole post chain** (`spaceflight.js:91-94, 967, 985`; `hqglobe.js:154-155, 342, 355`).

   POWERWORLD needs bloom, ACES, exposure and the print pass — so pattern **(B)**.

⚠ **THE NEWS CAMERA LEAVES A SCISSOR RECT ON THE RENDERER.** `newscrew.js:517` clears
`setScissorTest`, and `518` restores the viewport, but the scissor *rect* is left at `320×180`.
CLAUDE.md flags this as already-paid-for: a manual `world.render()` outside the frame loop comes back
black except one corner. Any POWERWORLD screenshot harness must clear scissor + viewport before
posing. And note the crew runs **before** the main pass on purpose (`game.js:3169`).

### 1.16 Summary table

| System | file:line | Verdict |
|---|---|---|
| `screenToGround` | `world.js:1366` | DOESN'T CARE (raycaster branches); stale-`out` hazard at grazing angles |
| Fog-of-war plane | `fog.js:73-77` | **BREAKS** as concealment — flat decal; turn plane off, keep `_vis` |
| AI honesty / `canSee` / `_vis` | `game.js:1247-1275` | DOESN'T CARE — never read the camera |
| Tower cutaway `updateOcclusion` | `world.js:1271-1297` | **DEGRADES** → turn off, replace with camera collision |
| Interior cutaway | `world.js:1300-1316` | Degrades mildly (player-keyed, not camera-keyed) |
| Canopy cutaway | `world.js:1324-1350` | Degrades acceptably; leave on |
| `setBaseZoom` / `frustum` | `world.js:1218, 1255` | **BREAKS** silently (no `.top` on perspective) |
| `punch(z)` × 25 sites | `world.js:1220` | **BREAKS** silently → remap to a dolly |
| 2-player fit | `game.js:3173-3178` | **BREAKS** — needs perpendicular separation, not XZ spread |
| Shadow frustum (110u) | `world.js:93-96, 1264` | **BREAKS** visibly — hard shadow cut-off line |
| Sky dome (r 900 @ origin) | `world.js:126-127` | **DEGRADES** — must ride the camera (cf. `spaceflight.js:957`) |
| `DECAL_LIFT` / `GROUND_LAYER` | `util.js:90-92` | **BREAKS** — calibrated for linear ortho depth |
| `_pixelCap` / `_applyQuality` | `world.js:1936-1951` | DOESN'T CARE; baseline cost rises |
| Radar | `hud.js:1465` | DOESN'T CARE (world XZ) |
| ALT ladder | `hud.js:538-545` | DOESN'T CARE (already an in-world Sprite) |
| `screenPosOf.behind` | `world.js:1771` | DEGRADES — `z>1` conflates behind/beyond-far |
| Foe arrow | `hud.js:784-812` | Works (already flips on `behind`), inherits the above |
| `pickTarget` pixel constants | `game.js:1305, 1323` | DEGRADES — retune for varying standoff |
| `updateThrowArc` | `game.js:459-512` | DOESN'T CARE (world geometry) |
| `game.mapCam` channel | write ×4, read ×1 `game.js:3061` | **HALF-WIRED TODAY** (KO cam + spectate are dead) |
| Opening director (10 variants) | `opening.js:53, 90-338` | **BREAKS** — `zoom` is an ortho half-height |
| `game.fwd` / `game.right` | `game.js:296-299` | **BREAKS** — frozen at ctor; pad aim + evade wrong |
| Tilt-shift | `printpass.js:96-103` | DEGRADES — its own justification is iso-specific |
| Print pass (rest) | `printpass.js` | DOESN'T CARE |
| `vfx` billboard rings | `vfx.js:209` | DOESN'T CARE (improves) |
| Rain ±280u around camera | `systems.js:118-127` | DEGRADES cosmetically |
| News POV | `newscrew.js:47, 502-526` | DOESN'T CARE — separate camera, separate render |
| `spaceflight` / `hqglobe` | `:84` / `:137` | DOESN'T CARE — own cameras + pass swap |

---

## 2. THE CAMERA DESIGN

### 2.0 The speed numbers this camera has to serve (looked up, not guessed)

`entity.js:1481-1511` — `move()`, with `powerBuff = sprint = moodMult = 1`:

```
s = def.speed × 1.08                                       (entity.js:1485)
if flying:  s ×= tier>=3 ? flySpeed×1.2 : tier==2 ? 0.78 : 0.95    (entity.js:1490)
if cruiseHeld && ki>1:  s ×= 1.5                           (entity.js:1493)
   and if afterburner lit (_burnT>0.8):  s ×= mult/1.5     (entity.js:1495)  → net ×2.1
horizontal velocity is CLAMPED to s                        (entity.js:1509-1511)
```

Vertical, `entity.js:27`: `FLY_RISE = 46`, `FLY_SINK = 26`, `FLY_TAKEOFF = 19`,
`FLY_HOVER_BOB = 3.2`. Power dive floors `vel.y` at `-FLY_SINK × 1.35 = -35.1` and adds `+54/s`
horizontal with `burstT` (`entity.js:1289-1292`). Deck servo speed is capped at `FLY_SINK`
(`entity.js:1300-1309`).

`FLY_SPEEDS` (`entity.js:96-99`): majesty 1.30 · torch 1.28 · olympus 1.25 · sol/vanguard/apex/
stormcall 1.20 · kano/vega 1.15 · nova 1.12 · specter/tempest/marshal 1.10 · mystward 1.08;
everyone else 1.0. `def.speed` across the roster runs 25–46 (`characters.js`; the higher `speed:`
values in that file are projectile speeds, not fighters). Afterburner is on 6 heroes, all
`{ mult: 2.1, kiPerSec: 14 }` (`characters.js:8, 80, 188, 206, 500, 614`).

| Case | Arithmetic | u/s | m/s (×0.19) |
|---|---|---|---|
| ground walk, `speed 33` | 33 × 1.08 | **35.6** | 6.8 |
| tier-2 levitator, `speed 32` | ×0.78 | 27.0 | 5.1 |
| tier-2 levitator + cruise | ×1.5 | 40.4 | 7.7 |
| tier-3, no `FLY_SPEEDS` row, `speed 33` | ×1.0×1.2 | 42.8 | 8.1 |
| ...+ cruise | ×1.5 | 64.1 | 12.2 |
| SOL (34, 1.20) | | 52.9 | 10.0 |
| SOL + cruise | | 79.3 | 15.1 |
| SOL + burner | ×2.1 | **111.0** | 21.1 |
| MAJESTY (34, 1.30) + burner | | 120.3 | 22.9 |
| TORCH (40, 1.28) | | 66.4 | 12.6 |
| TORCH + cruise | | 99.5 | 18.9 |
| TORCH + burner | | **139.3** | 26.5 |
| TORCH burner **climbing** | hypot(139.3, 46) | **146.7** | 27.9 |

Sanity check against the record: CLAUDE.md's afterburner measurement is "71.8 → 100.5", a ratio of
1.40 = exactly the extra `mult/1.5` factor the burner adds over cruise (`entity.js:1495`). The
formula above is consistent with the one number already on file.

**So the camera must be readable across roughly 0 → 147 u/s, a 1:∞ range with a hard practical
ceiling around 140 u/s horizontal and 46 u/s vertical.** And it must not treat 60 u/s as "fast" for
TORCH while treating it as "impossible" for a levitator.

### 2.1 The reference speed — derived, never a constant

⚠ This project has burned itself **five times** on ladders built from hand-picked constants instead
of from the distribution (CLAUDE.md names: university standing, the rank ladder's top end, the site
survey, the beam temper buckets, the aptitude ladder). A single `if (speed > 80)` here would be the
sixth.

Compute **once per fighter, cached** (it only depends on `def`):

```
vRef(f) = def.speed × 1.08
        × (flightTier>=3 ? flySpeed×1.2 : flightTier===2 ? 0.78 : 0.95)
        × 1.5
        × (def.afterburner ? (def.afterburner.mult/1.5) : 1)
```

i.e. *this fighter's own top sustainable air speed*, using the **same expression `move()` uses** so
it can never drift from the engine. Measured against the table above: levitator 40.4 · mid tier-3
64.1 · SOL 111.0 · TORCH 139.3.

Then the normalised throttle:

```
k = smoothstep( clamp( (|v3| - 0.30·vRef) / (0.62·vRef), 0, 1 ) )
```

`smoothstep` already exists at `core/util.js:25`. k = 0 below 30% of *your* ceiling (hover, drift,
walking); k = 1 at ~92% of it. A levitator gets the full sensation at 37 u/s and TORCH does not get
it at 60 u/s — which is the correct answer and falls out of the data.

### 2.2 Orbit-behind-player, with full-sphere handling

State: `yaw`, `pitch`, `dist`, `fov`, plus a smoothed `look` point. All in world space.

**The lock axis** `L = foe.pos - player.pos` (or `player.aim3 × 40` when nothing is locked).
`h = hypot(L.x, L.z)`.

**Yaw.** Match `world.orbit`'s convention (`world.js:1229`: `camDir = (sin yaw·cos p, sin p, cos yaw·cos p)`,
so yaw 0 = +Z) so the two camera channels share one convention:

```
yawT = atan2(-L.x, -L.z)          // camera sits on the far side of the player from the foe
```

⚠ **Two guards, both already paid for in this codebase:**
- If `h < 8` (foe almost directly overhead or underfoot), **hold the previous `yawT`**. Deriving a
  yaw from a near-zero horizontal vector is noise.
- Damp yaw through `angleDiff` (`core/util.js:21`), not raw `damp`. CLAUDE.md's targeting law is
  explicit: "yaw uses shortest-path damping (never revert to naive damp — it pirouettes 355° across
  the atan2 seam)." A chase camera does this **once per second** if you get it wrong.

**Pitch — this is the full-sphere answer.** Do *not* aim the camera down the lock axis. Take a
fraction of the elevation and clamp hard:

```
elev  = atan2(L.y, max(h, 8))
pitchT = clamp(BASE_PITCH + 0.55 × elev, -1.15, +1.15)      // rad; BASE_PITCH = 0.18 (≈10°)
```

At 0.55 the camera takes just over half the elevation and the **look-point blend (§2.3) finishes the
job**: a foe straight overhead ends up near the top of frame with the camera still behind and slightly
above the player, instead of the camera sliding under the player's boots to look straight up. The
±1.15 rad (±66°) clamp is the thing that makes "directly above/below" a non-event rather than a
gimbal.

**Camera position:**

```
dirV = (sin yaw·cos pitch, sin pitch, cos yaw·cos pitch)     // same form as world.js:1229
camPos = look + dirV × dist
camPos.y = max(camPos.y, world.heightAt(camPos.x, camPos.z) + 3)     // world.js:1387
```

### 2.3 The look point — a FIXED SCREEN OFFSET, so both bodies are visible

Centring the player is the wrong default: it puts the foe half off-frame and gives half the screen to
empty sky. Two stacked rules.

**(a) Blend along the lock axis.** `lookRaw = player.pos + 0.58 × L`, then `+ HEIGHT` (§4) on Y.
0.58 leans past the midpoint toward the foe, so the player sits nearer the bottom edge — which is
the BFP read.
⚠ Clamp the blend by distance: when `|L| > 90` (a long-range beam duel) the midpoint is nowhere near
either body, so cap the blend offset at ~34u: `lookRaw = player.pos + L̂ × min(0.58·|L|, 34)`.

**(b) A constant *screen-space* offset.** Push the look point along the camera's own right/up axes:

```
halfH = dist × tan(fovV/2)
look += camRight × (halfH × aspect × OFF_X) + camUp × (halfH × OFF_Y)
OFF_X = +0.14, OFF_Y = +0.10           // NDC units → the player lands ≈ (-0.14, -0.10)
```

⚠ The `halfH` factor is load-bearing: without it the offset is a fixed *world* distance and therefore
shrinks on screen as you dolly out and as FOV widens — the framing would drift exactly when it
matters most.

Damping: `look.x/z` at **λ 9**, `look.y` at **λ 7** (just tighter than `follow()`'s 8/6 at
`world.js:1246-1248`, because a chase camera at 42u has far less slack than an ortho lens at 260u).

**Alternative worth naming:** `PerspectiveCamera.setViewOffset(fullW, fullH, x, y, w, h)` gives a
true off-axis frustum shift — exact, keeps the horizon level, no lens skew, and immune to the
`halfH` scaling problem. I am **not** recommending it for slice 1 because ⚠ it must be re-applied
after every `resize()` (`world.js:1206-1216`) and it interacts with `composer.setPixelRatio`
(`world.js:1944-1945`). It is the upgrade if (b) visibly drifts.

### 2.4 FOV widening with speed

Base 50° vertical ≈ 79° horizontal at 16:9 (Half-Life/Quake-family third person is 90° *horizontal*,
so 50 vertical is the conservative side of the genre default). Precedent in-repo: the news POV runs
34° base clamped 21–58 (`newscrew.js:47, 459`).

```
clinch = 1 - smoothstep(clamp((|L| - 14) / 16, 0, 1))       // 1 inside 14u, 0 beyond 30u
fovT   = 50 + 15·k - 6·clinch                                // 50 hover · 65 top cruise · 44 clinch
fov    = damp(fov, fovT, 3.0, dt)                            // cf. newscrew.js:463 λ 3.2
clamp fov to [40, 72]
```

- `+15` at k = 1 is the BFP-style widening the brief asks for; 65° vertical ≈ 96° horizontal.
- `-6` at clinch **narrows** for a fist fight. A wide lens at 26u distorts two 9.6u bodies into
  fish-eye, and a boxing exchange is the one moment you want the bodies undistorted.
- λ 3.0 is deliberately slower than position damping: a FOV that snaps reads as a zoom artefact.

### 2.5 Distance — out when **both** are fast, in at clinch

The brief's phrasing is the right rule and it needs the foe's throttle too, otherwise a solo speed
run shrinks your own fighter to nothing while nothing is happening.

```
kBoth  = min(k(player), k(foe))                    // foe's k uses the foe's OWN vRef
distT  = 42 + 22·kBoth - 16·clinch
dist   = damp(dist, distT, 2.5, dt)                // slow, so the pull-out reads as speed not lens
clamp dist to [DIST_MIN 18, DIST_MAX 90]
```

Framing check (visible vertical world at the subject plane = `2·dist·tan(fov/2)`; a fighter is 9.6u):

| state | dist | fov | visible height | fighter fills |
|---|---|---|---|---|
| hover / drift | 42 | 50° | 39.2u | 24% |
| solo cruise (foe still) | 42 | 65° | 53.5u | 18% |
| mutual full cruise | 64 | 65° | 81.6u | 12% |
| clinch | 26 | 44° | 21.0u | 46% |

12% at a mutual burner chase is small but *correct* — at 139 u/s the two bodies are legitimately
30–80u apart and both have to fit. 46% at clinch is a boxing framing. 24% at hover is the working
default.

### 2.6 Camera collision — the honest replacement for the iso cutaway

Reuse the test the occlusion system already uses: `world._segBox3(x0,y0,z0, x1,y1,z1, cover)`
(`world.js:1351-1363`). It is an AABB slab test that already reads `c.hx ?? c.r`, `c.hz ?? c.r`,
`c.top ?? c.h` — the exact shape of every entry in `world.cover` (the same list physics, `canSee`
and the fog raster read) and, with a small adapter, of `world.interiors[].walls`.

```
march from `look` toward `camPos`:
  for c of world.cover:            if _segBox3(look → camDesired, c) → record nearest t
  for it of world.interiors: for wl of it.walls: same
  allowed = nearestT × |camDesired - look| - PAD(2.5)
  dist = damp(dist, min(distT, allowed), nearestT<1 ? 18 : 3, dt)
```

- **λ 18 retracting, λ 3 extending.** Fast in so the camera never clips through a wall; slow out so
  clearing a corner does not pop. This asymmetry is the whole trick.
- Then the terrain clamp from §2.2 (`world.heightAt` + 3, `world.js:1387`).
- ⚠ `_segBox3` returns `tmin > 0.02 && tmin < 0.98` (`world.js:1362`) — it answers *"does it cross"*,
  not *"how far"*. To get `nearestT` it needs to return or expose `tmin`. That is a small, additive
  change to a function with one existing caller (`world.js:1276`), and it keeps ONE segment-vs-box
  test in the codebase rather than a second copy — the law that `NO_RESCUE` and `validatePlan`
  taught (CLAUDE.md: "export the rule; never reimplement it").
- With this in place POWERWORLD sets a flag that makes `updateOcclusion` skip the `this.cover` loop
  (`world.js:1274-1297`) entirely. Net **perf win** — no lazy material clones, no dispose churn.

### 2.7 The full damping table

All through `damp(a, b, λ, dt)` — `core/util.js:8`. `dt` is already clamped at 0.05 (`game.js:3055`),
so a bad frame slows the camera in step with the sim, which is consistent with the slow-motion law.

| quantity | λ | precedent / reasoning |
|---|---|---|
| `look.x`, `look.z` | 9 | tighter than `follow`'s 8 (`world.js:1246`) — less slack at 42u |
| `look.y` | 7 | cf. `follow`'s 6 (`world.js:1247`) |
| `yaw` | 5.5 | via `angleDiff`; a snappy yaw is nausea |
| `pitch` | 4.5 | slower than yaw — vertical swing is the more disorienting axis |
| `dist` (free) | 2.5 | slow on purpose: the pull-out should read as speed |
| `dist` (collision, in) | 18 | never clip |
| `dist` (collision, out) | 3 | never pop |
| `fov` | 3.0 | cf. `newscrew.js:463` (3.2) |
| shake decay | reuse `world._shake *= exp(-7·dt)` (`world.js:1251`) | one shake system, not two |

### 2.8 Things the chase camera must also do

- **`punch(z)` becomes a dolly.** `world.js:1220` currently shrinks the frustum. In chase mode:
  `dist = min(dist, dist × z)` with the same 25 call sites untouched.
- **Shake:** keep `world.shake` (`world.js:1219`) and `shakeV`, applied to `camera.position` exactly
  as `world.js:1259-1262` does. At 42u a given shake amplitude reads ~6× stronger than at 260u — so
  the applied vector must be scaled by `dist/260`, or POWERWORLD is a vomit comet.
- **Roll:** none by default. A small speed-proportional roll into the turn is a genuine BFP-ism and
  is one line (`camera.rotateZ`) after `lookAt`, exactly as `newscrew.js:472-473` does — but ship it
  behind a dial, default 0.

---

## 3. HOW IT COEXISTS WITH THE ISOMETRIC GAME

### 3.1 The recommendation: **two camera objects, swap which one the RenderPass uses**

Do **not** convert or replace the ortho camera. Reasons, in order of force:

1. **There is no conversion.** `OrthographicCamera` and `PerspectiveCamera` are different classes
   with different fields; `follow`, `orbit` and `resize` all write `left/right/top/bottom`
   (`world.js:1212-1213, 1233-1234, 1255-1256`). CLAUDE.md already records someone trying to clone
   `world.camera.constructor` with perspective args and getting a degenerate frustum.
2. **The pattern already exists, twice, and is one line each way.** `spaceflight.js:91-94` captures
   `composer.passes[0]` plus its previous `scene`/`camera`; `spaceflight.js:967` swaps both in;
   `spaceflight.js:985` restores both in `finish()`, "including on a skip." `hqglobe.js:154-155,
   342, 355` is the same three lines. The `spaceflight.js:91-92` comment is the design note verbatim:
   *"⚠ SWAP THE RENDER PASS, DON'T BUILD A SECOND PIPELINE. One line each way, and the crossing gets
   bloom + exposure + ACES for free."*
3. **A second composer would be a second pipeline** — a second HalfFloat RT, a second bloom chain, a
   second print pass, and two places for the look to drift. Rejected for the same reason
   `printpass.js:9-12` gives for one pass instead of eleven.

### 3.2 Concretely

```
world.cams   = { iso: <OrthographicCamera>, chase: <PerspectiveCamera> }
world.camera = world.cams.iso                       // the ACTIVE camera — keep this name
world.camMode = 'iso' | 'chase'

world.setCameraMode(m):
  world.camMode = m
  world.camera = world.cams[m]
  composer.passes[0].camera = world.camera          // cf. spaceflight.js:967
  world.resize()                                    // rebuild whichever projection is live
```

**Keeping the name `world.camera` pointed at the active camera is the whole trick**, because it makes
all eight existing readers correct for free with no edits:
`world.js:170` (`toScreen`), `world.js:1273` (`updateOcclusion`), `world.js:1368` (`screenToGround`),
`world.js:1768` (`screenPosOf`), `world.js:1968` (`prewarm`), `vfx.js:209`, `systems.js:118`, and the
`RenderPass` construction at `world.js:1194`.

Then, guarded on `camMode`:
- `resize` (`world.js:1206-1216`) — ortho box **or** `aspect` + `updateProjectionMatrix`.
- `follow` (`world.js:1244-1267`) — early-return to `chaseFollow(player, target, dt)` in chase mode.
- `punch` (`world.js:1220`) — frustum shrink **or** dolly (§2.8).
- `orbit` (`world.js:1227-1242`) — **leave alone.** It stays the ortho-only authoring/cinematic
  channel, and POWERWORLD's cold-opens run in ortho before the handover (§1.10).

### 3.3 Fix the `mapCam` channel *first* — it is a prerequisite, not a nicety

`game.mapCam` is only read at `game.js:3061`, inside `if (!this.running)`. So today:
`opening.js` works (it sets `game.running = false` at `opening.js:52`) and the atlas works (same), but
`updateKoCam` (`game.js:534-540`) and `updateSpectate` (`game.js:613-616`) write `mapCam` during a
live match where **nothing reads it** and `followHumans` (`game.js:3167`) overwrites the camera on
the same frame. `world.orbitAngle`, which both of them read (`game.js:532, 615`), is never assigned
anywhere in the repo.

The clean shape is one arbiter instead of two code paths:

```
game.update:
  cameraDrive(dt):
    if (this.mapCam)                  return world.orbit(this.mapCam);       // cinematic / tool / KO / spectate
    if (world.camMode === 'chase')    return world.chaseFollow(this.player, this.chaseTarget(), dt);
    return this.followHumans(dt);
```

called from **both** the `!running` branch (`game.js:3058-3064`) and the running path (replacing
`game.js:3167`). That single refactor: (a) gives POWERWORLD a home, (b) revives the KO cam and the
spectator camera, (c) preserves the documented precedence "a cinematic or the map tool owns the
camera" (`game.js:530`), and (d) means the KO cam in POWERWORLD can *stay in chase mode* rather than
snapping to an ortho orbit mid-knockout.

⚠ Whoever does this must also decide what `startKoCam`'s guard at `game.js:530`
(`if (this.mapCam && !this._koCam) return`) means once `mapCam` actually works in a live match.

### 3.4 Where POWERWORLD lives as a mode

`MODE_IMPL` (`game.js:45-...`) has ten entries and the `lab`/`base`/`boxing` ones are exactly the
right precedent: a mode whose `setup` builds a world-level object and whose `tick` drives it
(`game.js:173-186` `lab` → `WhiteRoom`; `190-198` `base` → `BaseRoom`; `110-172` `boxing` →
`BoxingRing`). Plus `data/modes.js:3-15` for the card.

⚠ Three specific traps this repo has already paid for and POWERWORLD will hit:
- **`mode.hud` must be a FUNCTION.** `boxing` shipped it as the string `'boxing'` and threw
  ~1,200 times in one match (`game.js:152-161` documents it).
- **`setup(g, o)` — declare `o`.** `boxing`'s `setup` used `o` without it (documented in CLAUDE.md).
- **`o.p2` is what every other mode calls the opponent**, not `o.enemy` (CLAUDE.md, boxing again).
- **A mode's setup owns its spawns.** Boxing shipped with a ring and no opponent.
- **Register in `clearTransients`.** The reset law (CLAUDE.md "THINGS THAT OUTLIVE THEIR MATCH"):
  a new transient system that is not in `game.clearTransients()` is silently exempt from every reset
  path. The chase camera state, and any POWERWORLD geometry, must be cleared there — and
  `setCameraMode('iso')` must be part of the restore, or leaving POWERWORLD leaves the city game in
  a perspective camera.

---

## 4. BFP'S CAMERA MENU AS A SPEC

Ultra BFP exposes **ANGLE · DISTANCE · HEIGHT · FOV** plus a first/third-person toggle.
⚠ **GUESS:** I am working from the brief's description of that menu, not from the game — I could not
verify BFP's exact ranges, units, or defaults, and none of the four numbers below are BFP's.

### 4.1 Mapping onto `SETTINGS` (`core/settings.js:54-85`)

| BFP dial | `SETTINGS` key | Unit / range | Default | What it actually drives |
|---|---|---|---|---|
| ANGLE | `pwAngle` | deg, −10 … 45 | **10** | `BASE_PITCH` in §2.2 (10° ≈ 0.18 rad) |
| DISTANCE | `pwDist` | u, 18 … 90 | **42** | the `42` in `distT` (§2.5); speed/clinch terms ride on top |
| HEIGHT | `pwHeight` | u, −6 … 24 | **8** | a world +Y offset on the look point (§2.3a) — BFP's HEIGHT is a vertical *offset*, not a pitch |
| FOV | `pwFov` | deg vertical, 40 … 75 | **50** | the `50` base in §2.4; `+15·k` still adds on top |
| 1st / 3rd | `pwView` | `'third'` \| `'first'` | `'third'` | first person ⇒ `dist = 0` + the hide list in §4.4 |

Two dials BFP does not have but this engine needs:

| key | range | default | why |
|---|---|---|---|
| `pwOffset` | 0 … 0.30 | **0.14** | the fixed screen offset (§2.3b). This is *the* lock-on framing dial — 0 centres the player and hides the foe. |
| `pwRoll` | 0 … 1 | **0** | speed-into-turn roll (§2.8). Off by default; motion sickness. |

### 4.2 The Options screen — follow this repo's own two laws

⚠ **A word, not a number, wherever a number makes somebody do arithmetic.** `settings.js:111-114`
states it: *"A player choosing between 'medium' and 'high' is guessing; a player choosing between
FIELD and SPLASH PAGE knows which one is for playing."* Same for a camera. So:

```
PW_CAM_PRESETS = {
  ringside:  { _n: 'RINGSIDE',  _d: 'Close and tight. Every punch reads.',        angle:  6, dist: 28, height:  5, fov: 46, offset: 0.10 },
  standard:  { _n: 'STANDARD',  _d: 'The working camera.',                        angle: 10, dist: 42, height:  8, fov: 50, offset: 0.14 },
  skyduel:   { _n: 'SKY DUEL',  _d: 'Pulled back for flight. Both bodies, always.',angle: 14, dist: 56, height: 12, fov: 58, offset: 0.18 },
  overwatch: { _n: 'OVERWATCH', _d: 'High and wide. You see the whole exchange.', angle: 26, dist: 70, height: 16, fov: 62, offset: 0.16 },
  eyes:      { _n: 'EYES',      _d: 'First person. Nothing between you and it.',  view: 'first', fov: 62 },
  custom:    { _n: 'CUSTOM',    _d: 'Your own numbers.' },
}
```

⚠ **Generate the chips FROM the table**, exactly as the look presets do (`settings.js:115-129` +
`applySettings` at `settings.js:163-170`), so a new preset appears in the UI for free.
⚠ **Touching any slider must switch to CUSTOM.** `settings.js:96-98` documents the trap verbatim:
without it, the next `applySettings` re-stamps the preset's value and the slider springs back.
⚠ **Numbers are on the CUSTOM sliders only.** The preset chips carry names and one-line `_d` blurbs.

`applySettings(game)` (`settings.js:145-178`) is the one place these land — it already handles
`w.shakeMult`, `w.print`, `w.qualityOverride`, so a `w.pwCam = {...}` block belongs there and
nowhere else.

### 4.3 The camera key, and the binding law

A chase camera wants (a) recentre-behind-player and (b) cycle lock target.
⚠ `settings.js:3-4`: *"No two keys in one scheme may collide — guard and gadget in particular (X was
doing both jobs at once before this became data)."* So these go on the `KEYMAPS` rows
(`settings.js:8-45`) with `*Label` strings, never as literals in `controlPlayer`. `KeyT` is already
taken — it clears the lock (`game.js:2747`).
⚠ Same for the pad: `PAD_ACTION` in `core/glyphs.js` mirrors `MAP` in `core/gamepad.js` and CLAUDE.md
warns "rebind one, rebind the other." And `THE_HANDS.md` already records the D-pad as contested.

### 4.4 First person is not just `dist = 0`

⚠ The player's whole ground rig would be inside your own head. Hide, at minimum:
`game.playerMark` (`game.js:339, 412-442`), the spacing rings (`game.js:400-409`), and the figure's
own `faceWedge` / `stateRing` / `shadow` / `bandRing` / `altTag`
(`entity.js:315-327` and the `groundRig` children). Note `WhiteRoom` already has a precedent for
selectively hiding a figure's children while preserving `groundRig` (CLAUDE.md: "everything under the
figure group except `groundRig` and the rig") — first person needs the **inverse** of that list, so
the two want a shared helper rather than two hand-kept lists.

---

## 5. BUILD ORDER, COSTS, AND THE KILL TEST

⚠ Hours are my estimate for an agent session with headless verification, not measured. Every
rendering-cost figure is unmeasurable from here (§6).

### THE KILL TEST — build this first, before anything else

**A manual-step, no-input harness that flies one tier-3 hero on a fixed circular path at cruise speed
while a second hero holds station, with a bare perspective camera swapped into
`composer.passes[0].camera`, and produces FOUR SCREENSHOTS: hover · solo cruise · clinch · foe
directly overhead.**

Why a screenshot matrix and not an assertion suite: this project's own record says assertions cannot
see framing. **The boxing ring shipped four times too big with six green assertions**, and **the
venue's audience was built outside the frame at all times** with every assertion passing (CLAUDE.md,
and `boxingring.js:63-68` / `78-83` are the confessions). A camera is *entirely* a framing problem.
Tests can prove `dist` damped correctly; only the picture shows that both fighters are in it.

What it proves or kills in one shot:
1. Does a perspective camera through the existing composer keep the look? (bloom, ACES, print pass)
2. Does the framing rule keep **both bodies** in frame in all four cases?
3. Does the full-sphere case go degenerate?
4. Does the ground tear at grazing angles (§1.7)?

Harness gotchas already on file: ⚠ clear the renderer's scissor + viewport before posing
(`newscrew.js:513-518` leaves a 320×180 rect); ⚠ read the drawing buffer with `toDataURL` in the
**same task** as the render (a page screenshot captures the DOM over the canvas); ⚠ a hidden browser
pane renders at 0×0 and `_ema` reads ~98ms — stub `world.render` for sim-only numbers.

**~2h.** If the four frames read wrong, stop and rethink the framing rule before writing a mode.

---

| # | Slice | Est. | Notes |
|---|---|---|---|
| 0 | **The kill test** (above) | 2h | Throwaway harness; keep the screenshot recipe |
| 1 | `world.cams` + `setCameraMode` + guard `resize`/`follow`/`punch` on `camMode` | 3h | The `world.camera`-as-pointer trick means 8 readers need no edits. Verify by round-tripping iso→chase→iso and asserting the ortho frustum, `aspect`, and `passes[0].camera` all restore. |
| 2 | Finish the `mapCam` channel — `cameraDrive(dt)` arbiter (§3.3) | 2h | **Fixes the dead KO cam and spectator camera as a side effect.** Verify: a mid-match KO now moves the lens; the atlas and all 10 cold-opens still work. |
| 3 | `chaseFollow` — yaw/pitch/dist/fov/look, `angleDiff` yaw, `h<8` hold, clamps (§2.2–2.5) | 5h | Assert the **invariant**, not the value: "wherever the lock axis points, the camera is behind the player and both bodies project inside NDC ±1", sampled over a live fight. CLAUDE.md's direction-triangle note is the precedent — four test versions were wrong before the feature ever was. |
| 4 | `vRef` + `k` (§2.1), FOV and distance curves | 2h | Assert `vRef` against the §2.0 table for SOL/TORCH/a levitator, and that a levitator reaches k=1. |
| 5 | Camera collision — expose `tmin` from `_segBox3`, march, asymmetric λ, terrain clamp (§2.6) | 4h | Assert: the camera never ends inside a cover AABB and never below `heightAt+3`, over a 60s AI-vs-AI fight in a real generated city. |
| 6 | POWERWORLD as a `MODE_IMPL` entry + `data/modes.js` card + `clearTransients` | 3h | Watch the five documented mode traps (§3.4). |
| 7 | Turn off what breaks: `setFogEnabled(false)`, occlusion skip, shadow frustum, sky dome rides the camera, near-plane raise | 3h | Then re-run `world.auditSurfaces()` (`world.js:1901`) from the chase camera and record the number. |
| 8 | Live `game.fwd`/`game.right` (§1.11) | 2h | ⚠ Must land before anyone plays with a pad or double-taps to evade. Assert: pad-stick right = screen right in both camera modes. |
| 9 | `SETTINGS` dials + presets + Options chips generated from the table (§4) | 4h | Assert a slider flips to CUSTOM and survives an `applySettings` round trip. |
| 10 | First person (§4.4) | 3h | The hide list is the whole job. |
| 11 | Retune the pixel constants: `pickTarget` `nearD`/`34px` (`game.js:1305, 1323`), rain radius, `screenPosOf.behind` | 2h | Small, but visible. |

**Total ≈ 35h** across eleven slices, of which slices 0–3 (≈12h) decide whether the direction is
right at all.

Two things deliberately **not** in that list, and why:
- **Re-authoring the ten cold-opens for perspective** (~8h+). Not worth it. Open in ortho, hand over
  at `finish()` (§1.10).
- **A depth pre-pass so tilt-shift becomes a depth range** (`printpass.js:20-26` already costs this
  out and declines it for the iso camera). Exclude DIORAMA from POWERWORLD instead.

---

## 6. WHAT I COULD NOT VERIFY

Everything here is read-only static analysis. Nothing below was run.

**Cannot be measured from here at all:**
1. **Any rendering cost.** The frame-cost delta of a perspective chase camera vs the ortho box —
   more geometry in frame, a much larger fog plane in view, a bigger effective shadow area. CLAUDE.md
   is explicit that CPU timing around `render()` measures *submission*, that `readPixels` costs ~3ms
   of round trip, and that a hidden pane early-outs with `_ema` reading ~98ms. This needs
   `EXT_disjoint_timer_query_webgl2` in a **foregrounded** tab at 3840×2160, per the print-pass
   benchmark.
2. **Whether the adaptive tier still settles at 2** on the reference machine in POWERWORLD, and
   whether the 24ms / 17.2ms thresholds (`world.js:1930-1931`) still make sense with a higher
   baseline.
3. **How bad the depth tearing actually is** (§1.7) and what `near` value fixes it. My reasoning
   about linear-vs-`1/z` precision is sound; the specific value of `near` that makes `DECAL_LIFT`
   survive at 42–90u is a measurement.
4. **Whether the pass swap compiles new shader programs.** `newscrew.js:394-396` says its POV
   "compiles programs the main camera never used." My reading is that this is caused by rendering to
   `null` instead of the HalfFloat composer RT (different output colorspace ⇒ different program),
   not by the camera type — but I did not confirm it. If I am wrong, the first POWERWORLD frame
   hitches and the `prewarm` at `world.js:1956-1971` needs a chase-camera pass. **GUESS.**

**Needs a live driven test, not a static read:**
5. **Whether the framing rule actually works.** Every number in §2.3–2.5 (0.58 blend, 34u cap,
   OFF_X 0.14, OFF_Y 0.10, 50°+15°, 42+22u, all nine λ values) is a first proposal derived from
   arithmetic and from this codebase's existing precedents. Cameras are tuned by eye. Expect all of
   them to move.
6. **Whether ±1.15 rad and the 0.55 elevation factor actually solve the overhead case**, or whether
   it needs a genuine second mode near the poles.
7. **Motion sickness.** λ 5.5 yaw / 4.5 pitch, the shake scaling by `dist/260`, and whether roll
   should exist at all — none of that is knowable without a human playing it.
8. **Whether `screenPosOf`'s `behind` test (`_proj.z > 1`) misfires in practice** under perspective
   for foes beyond the far plane. My analysis says it works for genuinely-behind points and
   false-positives beyond `far`; I did not test either.
9. **`pickTarget` feel.** Whether the varying standoff makes the magnet unusable, and what `nearD`
   should be as a function of `dist`.
10. **The max real arena size.** `arena = N·cell/2` (`cityplan.js:681`) with N ≤ 9 (`cityplan.js:671`)
    and cell up to 240 gives a theoretical 1080, but I did not check what the editor and the pop
    ladder actually produce in the wild. The sky-dome finding (§1.6) depends on it — at the default
    cell 96, N 8 gives arena 384 and a corner at ~611u from a 900u dome. **Partly GUESS.**

**Assumptions I am flagging as such:**
11. **BFP's actual camera menu** (§4) — ranges, units and defaults are all mine, not BFP's.
12. **Half-Life/Quake "FOV 90 is horizontal"** as the genre anchor for §2.4. Widely true, not
    verified.
13. **`powerBuff`, `sprint` and `moodMult` all = 1** throughout §2.0. In a real fight `powerBuff`
    rides tier and buffs (`game.js:3077`), and mood multiplies speed (`entity.js:1485`,
    `moodMult(this,'speed',1)`) — so real top speeds are somewhat higher than the table and `vRef`
    should probably read the live multipliers rather than the def alone.
14. **The Elo/roster claim that `speed:` values above ~46 in `characters.js` are projectile speeds,
    not fighter speeds.** Inferred from the distribution shape (a clean cluster 25–46, then a second
    cluster 54–84); I did not read every row.

**One finding that should be reported regardless of whether POWERWORLD ships:**
15. `updateKoCam` (`game.js:534-540`) and `updateSpectate` (`game.js:613-616`) write `game.mapCam`
    during a live match; `mapCam` is read only at `game.js:3061`, inside `if (!this.running)`;
    `game.running` is never cleared by a KO; and `followHumans` (`game.js:3167`) overwrites the
    camera unconditionally on the same frame. Both features therefore appear to be dead in a running
    match. Supporting evidence: both read `world.orbitAngle`, which is **never assigned anywhere in
    the repo**. I verified this by reading, not by running — so confirm it live before acting on it.

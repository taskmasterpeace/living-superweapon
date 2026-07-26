# POWERWORLD — IMPACT INDICATOR DISCIPLINE

**Governing principle (design owner):** the centre of the screen must stay clear, because that is
where your opponent is. The failure mode of every DBZ-style game is the screen filling with light.

**Status of the target:** POWERWORLD does not exist in the repo. `grep -rni "powerworld|third.person"`
over `src/` and `docs/` returns nothing. There is no third-person camera and no perspective game
camera — `world.camera` is an `OrthographicCamera` (`src/engine/world.js:55-57`) and the only
`PerspectiveCamera`s in the project are the news crew's POV rig at 34 degrees
(`src/engine/newscrew.js:47`), the HQ globe at 42 (`src/engine/hqglobe.js:137`) and the space layer at
52 (`src/engine/spaceflight.js:84`). Every perspective figure below therefore rests on an **assumed
camera**, stated once and used consistently. Marked GUESS where it matters.

---

## 0. THE TWO CONSTANTS EVERYTHING ELSE IS MEASURED AGAINST

**Isometric frame today.** `frustum = 78` world units of *vertical half*-view
(`src/engine/world.js:50-51`), so the frame is **156u tall**. `camDist = 260` (`world.js:53`).
`punch(z)` multiplies the frustum (`world.js:1220`), so `punch(0.9)` on a haymaker
(`src/engine/melee.js:158`) briefly makes it 140u. Two humans zoom out to a 128 half-frustum =
256u (`src/engine/game.js:3177`).

**Assumed POWERWORLD frame (GUESS).** Third person, camera **d = 14u** behind the fighter, vertical
FOV **55 degrees**. Visible world height at the subject = `2 * d * tan(fov/2)` = **14.6u**.
A looser rig (d = 20, FOV 50) gives 18.7u.

> **THE TEN-TIMES RULE.** 156 / 14.6 = **10.7x**. Every effect in `vfx.js` whose size is authored in
> WORLD UNITS is between eight and twelve times too large in third person. This is not a tuning
> question — several of them are individually larger than the entire frame. That single ratio is the
> whole of this document.

Particles have their own, worse ratio. `gl_PointSize = aSize * (300.0 / -mv.z)`
(`src/engine/particles3d.js:14`) is a perspective divide that has only ever run at an effectively
constant view depth of ~260u, giving a factor of **1.15**. At 14u it is **21.4** — a **18.6x** blow-up.

---

## 1. AUDIT — EVERY FULL-SCREEN OR NEAR-CENTRE EFFECT

Peak on-screen extent is computed from the source constants. "% 3P" = fraction of the assumed 14.6u
third-person frame height. Anything over 100% is larger than the screen.

### 1a. The 3D layer (`src/engine/vfx.js`)

| # | Effect + call site | Trigger | Duration | Peak extent | % ortho (156u) | % 3P (14.6u) | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | `impactStar` white, `impact()` `vfx.js:272` via `melee.js:150` at power 2 | haymaker connects | 0.16s | 22.8u sprite (`size 19 * 1.2`, `vfx.js:265`) | 15% | **156%** | **SHRINK** to a screen fraction (see 2a) |
| 2 | `impactStar` accent, `vfx.js:273` (only when `power > 0.9`) | same, stacked | 0.24s | 18.0u | 12% | **123%** | **CUT** in 3P — it is the second of four additive layers on the same pixel |
| 3 | `flash()` sphere inside `impact()`, `vfx.js:274` (`size = 3 + power*3`) | same | 0.09s | 23.4u dia (`SphereGeometry(1)` scaled to `size*1.3`, `vfx.js:67,75`) | 15% | **160%** | **SHRINK** hard; keep the 0.09s, it is already right |
| 4 | `ring()` billboard inside `impact()`, `vfx.js:278` (`r1 = 5 + power*5`) | same | 0.20s | 30u dia, **facing the camera** (`vfx.js:209` copies `camera.quaternion`) | 19% | **205%** | **CUT** in 3P. A camera-facing white annulus twice the frame height, centred on the opponent, IS the failure mode |
| 5 | `flash()` from `onHit`, `game.js:2401` (`size 2.4`) | **every** unblocked hit, and every blocked one throttled to ~8/s by `_blkFxT` (`game.js:2387-2392`) | 0.10s | 6.2u dia | 4% | 43% | **SHRINK** to ~8% of frame. This is the highest-frequency light in the game |
| 6 | `explode()` fireball shell, `vfx.js:91-106` | any blast; radius 11-18 typical, 22 for a thrown airliner (`game.js:789`) | 0.5 + power*0.15 s (`vfx.js:94`) | radius 16 -> **44.8u dia**; radius 22 -> **61.6u** | 29% / 39% | **307% / 422%** | **SHRINK** + suppress the detonation kernel near the lens |
| 7 | `explode()` white detonation KERNEL, `vfx.js:109-115` | same | 0.14s | radius 16 -> 21.4u dia at opacity 0.95 | 14% | **147%** | **CUT when the blast is within ~26u of the camera.** It exists to sell a detonation at distance; at 3u from the lens it is a white-out |
| 8 | `explode()` pressure ring, `vfx.js:117` (`r1 = radius*1.7`) | same | 0.32s | radius 16 -> 54.4u across, ground-plane so foreshortened | 35% | 372% (foreshortened) | **SHRINK**; flat is much safer than billboard, keep it flat |
| 9 | `shockwave()` energy dome, `vfx.js:137,145` (`3 + e*maxR`, `maxR` default 28, up to 34-40) | ground slams, novas, second wind (`game.js:2222`), `onSlam` (`game.js:2198`) | 0.5 + power*0.14 s | 62u across, 17u tall, additive at opacity 0.32 | 40% | **425% — the camera stands INSIDE it for the whole life** | **CUT the dome in 3P.** Keep the two flat rings (`vfx.js:131-135`), which read correctly from any camera |
| 10 | `shockwave()` -> `lightning()`, `vfx.js:155` | same | 0.26s, rebuilt every 0.04s (`vfx.js:195`) | bolts to `maxR*0.7` = 19.6u radius, `height 10 + power*8` | — | fills frame | **SHRINK** radius/height by the frame ratio; the flicker cadence is fine |
| 11 | `lightning()` pooled light, `vfx.js:190` | same | 0.26s | intensity 6, distance `radius*3` | — | — | **KEEP but re-scale intensity** (see 4d) |
| 12 | `impact()` particle bursts, `vfx.js:276-277` (`aSize` 2.8 and 3.6, count up to 30) | haymaker | 0.4-0.55s | **3.2 / 4.2 device px ortho -> 60 / 77 px in 3P** | — | — | **SHRINK via a shader clamp** (4c) |
| 13 | `explode()` particle bursts, `vfx.js:119-121` (`aSize` 2.6 / 1.6 / 4.5; smoke count 10, sparks `26 + power*14` = up to 54) | any blast | 0.6-1.1s | smoke **5.2 px -> 96 px**; 54 sparks at 56 px each | — | — | **SHRINK**; cap `count` in 3P |
| 14 | `scorch()` / `residue()`, `vfx.js:221-245` | blasts near the ground | lingers, pool capped 40 | radius*1 ground decal | — | — | **KEEP** — ground-plane, dark, subtractive in feel. Zero centre-screen cost |

### 1b. The post pass (`src/engine/printpass.js`)

| # | Effect | Trigger | Duration | Verdict |
|---|---|---|---|---|
| 15 | **Impact frame** — one inverted frame, `printpass.js:213-214,270-280` | `game.js:2340-2343`: not blocked, not dot, `amount > 0`, and `amount >= 14% maxHp || opts.heavy || opts.haymaker` | **exactly 1 frame** | **KEEP — this is the one exception. See section 3** |
| 16 | **Speed lines** — radial streaks, `printpass.js:165-173` | `game.js:2344-2347`, same heavy gate, only when a human is target or source | 0.2s, `k*k` decay (`printpass.js:302-306`) | **KEEP, REDUCE STRENGTH.** Already the best-behaved full-screen effect in the project: `reach = smoothstep(0.16, 0.62, rad)` (`printpass.js:171`) with the comment "never over the middle of the action", and `uSpeedC` is the *impact point* not screen centre. Drop the 0.55 mix (`printpass.js:172`) to ~0.34 and the amplitude from `min(1, 0.45 + amount/200)` (`game.js:2346`) to ~0.6 of that |
| 17 | Tilt-shift, `printpass.js:96-117` | `SETTINGS.fxTilt`, DIORAMA preset only | continuous | **CUT — must be pinned to 0 in POWERWORLD.** It is a horizontal SCREEN BAND, and the file says so and says why: correct for a fixed isometric camera because the focal plane maps to a band (`printpass.js:97-99`). In third person the subject moves vertically in frame, so the band blurs your opponent at random. It is also the first thing `budgetLook` drops (`settings.js:140`) |
| 18 | Ink / Sobel, `printpass.js:119-138` | `SETTINGS.fxInk` (0.85 default, `settings.js:81`) | continuous | **KEEP, THIN IT.** Ink is on the *right* side of this discipline: it puts a dark line on the silhouette, which is what makes the opponent read against a bright sky. But at close range a luminance Sobel finds every fold in the costume. Lower to ~0.55 |
| 19 | Halftone, `printpass.js:148-163` | `fxHalftone` 0.55 | continuous | **KEEP.** Shadows only (`mask = 1 - smoothstep(0.05, 0.62, lum)`, `printpass.js:152`) and the dot pitch is a fixed *device-pixel* pitch (`uHalfScale` 2.4, `printpass.js:45,156`), so it does not scale with the camera. It also actively removes luminance where you want the frame quiet |
| 20 | Ordered dither, `printpass.js:175-179` | `fxDither` 0.35 | continuous | **KEEP** — pure ALU, weighted to the dark end |
| 21 | Paper grain, `printpass.js:181-187` | `fxGrain` 0.30 | continuous | **KEEP, REDUCE.** Multiplicative (`c *= 1 - (g-0.5)*0.20*uGrain`), so it can only darken. Fine, but grain is a *print* cue and at close range it sits on the character's face |
| 22 | Palette levels, `printpass.js:140-146` | `fxLevels`, SPLASH only (7) | continuous | **CUT for POWERWORLD** (leave 0). Tone-snapping a close-up figure flattens the one thing you need to read |
| 23 | Vibrance / saturation, `printpass.js:189-203` | `fxVibrance` 0.35 | continuous | **KEEP vibrance, ADD a small negative saturation.** See 5 |

### 1c. The DOM layer (`src/engine/hud.js`, `src/engine/hud.styles.js`, `src/styles/comic.css`)

| # | Effect | Trigger | Duration | Geometry | Verdict |
|---|---|---|---|---|---|
| 24 | **`flashScreen` / `.hitflash`** — `hud.js:1744-1748`, CSS `hud.styles.js:159` | 12 in-combat call sites | 0.08-0.25s | `position:absolute; inset:0; mix-blend-mode:screen`, peak **opacity 0.5** | **CUT ENTIRELY IN POWERWORLD.** A full-viewport 50%-screen-blend wash is the definition of screen fill, and it is exactly what the impact frame replaced for the haymaker. The 12 sites: `melee.js:126` GUARD CRUSH, `melee.js:222` throw, `game.js:2202` SLAM, `game.js:2226` SECOND WIND, `game.js:2288` PARRY, `game.js:2432` LAST STAND, `game.js:2596`, `entity.js:743` STAY DOWN, `abilities.js:70`, `abilities.js:823`, `projectiles.js:504`, `systems.js:147`. Every one of them already has a shake, a sound and a banner |
| 25 | `.hitarc` hit-direction — `hud.js:1529-1543`, CSS `hud.styles.js:10` | human player takes a hit from a source (`game.js:2386`) | 0.55s fade, removed at 600ms, max 6 live | **360x360px disc**, centred at radius `min(W,H)*0.5` from screen centre (`hud.js:1535`) | **MOVE TO EDGE PROPERLY.** It is edge-*anchored* but it is a 360px **disc** whose centre sits *on* the short edge, so ~180px of it reaches inward. On a 375px-short-edge viewport it comes within ~8px of dead centre, and nothing in `PHONE_CSS` (`hud.styles.js:876-910`) scales it. Rebuild as an annulus **sector**: outer radius `min(W,H)*0.5`, inner radius `outer - 90px`, angular width 46 degrees, peak alpha 0.5 unchanged, max 4 live |
| 26 | `.danger` low-HP vignette — `hud.js:1981`, CSS `hud.styles.js:11` | player under 28% HP | continuous pulse | `radial-gradient(115% 100% at 50% 50%, transparent 56%, rgba(190,16,16,.44) 100%)`, element opacity pulses 0.02-0.62 | **KEEP AS IS.** Already the correct shape: **the centre 56% is fully transparent**, and effective peak alpha at the corners is 0.44 x 0.62 = 0.27 |
| 27 | `.vignette` — CSS `hud.styles.js:5` | always | continuous | `transparent 52%` -> `rgba(0,0,0,.62) 100%`, `z-index:0` | **KEEP.** Corners only; centre 52% untouched. It is doing *the right job* — it darkens where light is allowed to spill |
| 28 | `damageNumber` / `.dmg` — `hud.js:1752-1770`, CSS `hud.styles.js:152-153` | every hit >= 5, plus tags | 720ms, cap 48 live | inline `font-size = min(38, 18 + num*0.45)`px; anchored at `worldPos.y + 7` world units (`hud.js:1756`) | **OFF BY DEFAULT, or tiny + edge-anchored.** Two separate problems: 38px numerals land on the opponent, and the **`+7u` vertical offset is a world-unit offset** — at 14u it is 48% of frame height above the target, so numbers fly off the top of the screen. Same class of bug as everything in 1a |
| 29 | `.kobanner` — `hud.js:1545-1551`, CSS `hud.styles.js:12-13` | `handleKO` | visible ~1.47s | `left:50%; top:34%`, **118px** type, `z-index:6` | **SHRINK + MOVE UP.** At 118px and 34% down the frame it lands on a centre-screen opponent. But it fires only when someone is already down, so this is polish, not a defect. Suggest 84px at `top:24%` |
| 30 | `.announce` — `hud.js:1569-1576`, CSS `hud.styles.js:165-166` | tier-ups, AERIAL, LAST STAND, SECOND WIND | visible ~1.98s | `left:50%; top:20%`, 54px title | **KEEP, MOVE UP** to ~14%. Note a live bug found in passing: `body.phone #hud .announce{ transform:scale(.72) }` (`hud.styles.js:908`) is dead — `hud.js:1571` writes an inline `transform` that beats it, and would drop the `translateX(-50%)` centring if it did apply |
| 31 | **Comic SFX lettering** — `comic.js:230-241`, CSS `comic.css:180-190` | `game.js:2355-2366`: `amount >= 14 \|\| opts.haymaker`, within 260u of the player on both axes, rate-limited to 1 per 0.42s **except a haymaker always letters** | 0.95s | inline `font-size = round(32 * (0.75 + power*0.55))` = **24-42px** (`comic.js:238`); `.burst` backing at **118% x 210%** of the text box, opacity 0.88 (`comic.css:204-209`); `#comicLayer` at `z-index:26`, above `#hud`'s 20 (`comic.css:40`, `index.html:72`) | **KEEP the layer, ADD A CENTRE EXCLUSION.** The placement search (`comic.js:344-357`) tries nine candidate offsets and scores each by how much *balloon* it covers. It has no notion of the centre at all, and `_safe()` (`comic.js:246-256`) is HUD rails only (`x1 = W-258`, `y1 = H-118`). So a `KRAKA-DOOM!` with a red 16-point burst will land dead centre on the opponent. Fix is one line: push the centre box into `taken` every frame before placement |
| 32 | `.paused` full-screen blur — `hud.styles.js:157` | ESC | continuous | `inset:0`, `rgba(4,5,9,.5)` + `blur(2px)` | **KEEP** — not a combat effect |

### 1d. Camera effects (`src/engine/world.js`)

| # | Effect | Verdict |
|---|---|---|
| 33 | **`shake(a)`** — `world.js:1219`, clamped to **8**, applied as a random world-space offset added to `camera.position` **and** to `lookAt` (`world.js:1259-1262`), decaying `exp(-7*dt)` (`world.js:1251`) | **KEEP THE IDEA, REWRITE THE UNITS.** At ortho, 8u of camera translation in a 156u frame is 5% and the `lookAt` jitter is `atan(8/260)` = **1.76 degrees** — a shudder. In third person at d = 14, 8u of translation is **57% of the camera distance** (the camera passes through a 9.6u-tall fighter) and the `lookAt` jitter is `atan(8/14)` = **29.7 degrees**, more than half a 55-degree frame, re-randomised every frame. Even a single haymaker's `shake(2.6)` (`melee.js:151`) is 10.5 degrees. `shake()` as written **cannot be reused in third person.** See 2e |
| 34 | **`punch(z)`** — `world.js:1220`, multiplies `frustum` | **REPLACE.** A `PerspectiveCamera` has no frustum property to scale. `punch(0.9)` must become an FOV kick (55 -> 49.5 degrees) eased back by the same `damp` at `world.js:1252-1253` |
| 35 | `slowmo(dur, mul)` — `game.js:1349`, applied as `dt *= _slowMul` at `game.js:3065` | **KEEP.** Camera-agnostic, and the single best "heavy" tell that costs no pixels. Haymaker uses `slowmo(0.16, 0.34)` (`melee.js:158`) |
| 36 | `world.follow` — `world.js:1244-1267`, writes `camera.left/right/top/bottom` | **REPLACE** for POWERWORLD; entirely ortho-specific |
| 37 | `screenPosOf` / `toScreen` — `world.js:1767-1773`, `world.js:168-175` | **KEEP UNCHANGED.** Both use `project()`, which is correct for either camera, and `behind = _proj.z > 1` holds for perspective too. Note a consequence: far more things will be behind a third-person camera, and the consumers already bail correctly (`hud.js:1757`, `comic.js:286`, `comic.js:334`) |

---

## 2. THE DISCIPLINE, AS RULES WITH NUMBERS

### 2a. Hit sparks: 0.08-0.12s at the contact point, sized as a FRACTION OF THE FRAME

The durations are already right. `impact()`'s star is 0.16s (`vfx.js:272`), the flash 0.09s
(`vfx.js:274`), the ring 0.20s (`vfx.js:278`). It is **only the size** that is wrong, and it is wrong
by an order of magnitude.

**Rule.** A hit spark's peak on-screen extent is a fraction of frame height, not a world-unit
constant:

| tier | peak extent | life | additive layers allowed |
|---|---|---|---|
| jab / chip | **0.06** of frame height | 0.08s | 1 |
| cross / mid | **0.10** | 0.10s | 1 |
| haymaker / heavy | **0.16** | 0.12s | 2 (star + one flat ring) |
| blast (radius <= 18) | **0.30** | 0.14s core, 0.5s shell | 2 |

**Implementation.** One conversion, at the one place every spark already goes through. `vfx.js`
already knows the world (`this.world`, `vfx.js:32`), so a `world.frameHeight()` getter —
`2 * frustum` for the ortho camera, `2 * d * tan(fov/2)` for the perspective one — lets
`impact()`/`flash()`/`impactStar()` take a *screen fraction* and multiply. **The isometric city is
untouched** because `frameHeight()` returns 156 there and the fractions above reproduce today's
numbers to within a few percent (haymaker star today: 22.8/156 = 0.146, proposed 0.16). This is the
same shape as `GROUND_LAYER` and `DECAL_LIFT` in `core/util.js` — one shared ladder instead of forty
call sites each picking a small number.

**Never a fullscreen flash.** `flashScreen` (`hud.js:1744`) is not called from POWERWORLD at all
(rule 24). The spark carries the contact; the impact frame carries the weight.

### 2b. Damage direction on the screen EDGE, as an arc segment

Current `.hitarc` is a 360px **disc** anchored on the edge, so half of it reaches inward
(`hud.styles.js:10`, `hud.js:1535`), within 8px of centre on a short viewport.

**Rule.** Damage direction is an **annulus sector**, provably outside the centre box:

- outer radius `min(innerWidth, innerHeight) * 0.5` (unchanged anchor maths, `hud.js:1535`)
- **inner radius `outer - 90px`** — nothing renders inside that
- angular width **46 degrees**, centred on the bearing `atan2` already computes (`hud.js:1533`)
- peak alpha **0.5**, fade **0.55s**, removed at **600ms** (all unchanged, `hud.styles.js:10`)
- **max 4 concurrent** (down from 6, `hud.js:1542`) — five directions at once is not information
- the `sp.behind` flip at `hud.js:1534` becomes load-bearing in third person: most hits from behind
  will be behind the camera, and that is the case this indicator exists for

The same rule covers rule 28: if damage numbers are on at all, they anchor to that ring rather than
to the target.

### 2c. A hard cap on additive bloom

**The mechanism.** `UnrealBloomPass(res*0.5, strength 0.66, radius 0.6, threshold 0.8)` at
`world.js:1195`, added **before** `OutputPass` (`world.js:1194-1197`), so its 0.8 luminosity threshold
is against **linear HDR**. Every `vfx` primitive is
`MeshBasicMaterial({ blending: AdditiveBlending, depthWrite: false })` (`vfx.js:5`) at opacity
0.85-0.95. Stack four of them on one pixel — which `impact()` does by construction (two stars, a
flash sphere, a ring) — and the linear value reaches ~3.6, i.e. **4.5x the bloom threshold**, spread
at radius 0.6 at half resolution. `ACESFilmicToneMapping` at `exposure 1.28` (`world.js:38-39`) then
maps ~3.6 to essentially 1.0: pure white, no shape, no silhouette.

**The observed precedent, in this repo.** `src/engine/baseroom.js:129-132`:

> at 0.85 the gold core accent bloomed through the composer and washed out the whole corner of the
> base — an emissive floor panel is a FLOOR, not a light source. No assertion catches a blowout;
> only the screenshot does.

That was a **static emissive floor inlay** at a 200u+ camera distance, and it whited out a corner.
It was cut to `emissiveIntensity` 0.34 / 0.12 / 0.06. POWERWORLD puts additive geometry at 2-4u from
the lens. The last sentence of that comment is why section 6 exists.

**Rules.**
1. **At most TWO additive layers may overlap the centre box at any instant.** `impact()` drops from
   four to two in POWERWORLD: one white star + one **flat** ring. Cut the accent star (`vfx.js:273`)
   and the billboard ring (`vfx.js:278`).
2. **Combined pre-tonemap linear luminance at any centre pixel stays under 1.6** — twice the bloom
   threshold, so bloom still blooms and ACES still has roll-off left. Enforced by (1) plus per-layer
   opacity: no single additive layer over the centre box above **0.7** (today's stars are 1.0,
   `vfx.js:262`).
3. **Suppress the detonation kernel near the lens.** `explode()`'s white core (`vfx.js:109-115`) is
   there to make a distant blast read as a detonation rather than a balloon. Within ~26u of the
   camera it is a 147%-of-frame white sphere. Skip it, keep the shell.
4. **Cut the shockwave dome in third person** (`vfx.js:137,145`). A 62u-across additive dome at
   opacity 0.32 with the camera inside it tints every pixel for 0.5-0.64s. The two flat rings
   (`vfx.js:131-135`) carry the read from any camera.
5. **Never toggle a light's visibility to manage brightness** — see 4d. Intensity only.

There is also a **performance** argument, not only an aesthetic one. A 22.8u sprite covering 156% of
a 1080p frame is ~2M blended fragments; two stars, a ring, a flash sphere and 54 particles put the
frame at 4-5x overdraw of `depthWrite:false` blend traffic, all of which the half-res bloom then
reads. That is the fragment budget, not a rounding error.

### 2d. Sound carries the heavy read — and it is already built

Nothing new has to be recorded. The library is **300 mp3 files, 3.6 MiB on disk, verified 100% mp3**
(`src/core/samples.js:136-139`; `CLAUDE.md:2238-2240`).

- **`audio.meleeHit(power, pos, haymaker)`** — `src/core/audio.js:157-165` — is already a **three-layer
  recorded punch**: the crack via `impact()`, then `land.flesh` at `delay: 0.035` and `hit.soft` at
  `delay: 0.012`. The comment at `audio.js:152-156` is the exact argument this section is making:
  "Real weight is a CRACK, a THUD a few milliseconds later, and air... volume alone just makes the
  same thin sound louder, which is the thing that reads as cheap." A haymaker already calls it at
  power 1.8 (`melee.js:151`).
- **`audio.impact(power, pos)`** — `audio.js:167-170` — routes `punch.heavy` above power 1.05, else
  `punch.med` (`samples.js:25-26`, five variants each, reach 170 / 150).
- **`audio.land(power, body, pos)`** — `audio.js:858-873` — five body types (`flesh`, `metal`,
  `stone`, `energy`, `insect`), routing to `land.metal` / `rubble` / `land.flesh` / `land.soft`
  (`audio.js:862`). `energy` is deliberately excluded from the sample path (`audio.js:861`).
- **`audio.boom(power, pos)`** — `audio.js:215-219` — layers `boom.deep` (reach 280) under `boom`
  (reach 250) at power >= 0.85.
- **`audio.swing(kind, pos)`** — `audio.js:710-712` — `swing.blade` / `swing.fist`; `blunt` re-pitches
  the fist to `rate: 0.78`. There is no third `blunt` family.
- **`audio.grunt`** -> `v.pain` (`audio.js:257-260`), **`audio.cry`** -> `v.roar` (`audio.js:271-273`),
  `parry` -> `impactBell_heavy` (`samples.js:33`, used at `entity.js:761`).
- **`audio.gunshot(power, pos, voice)`** — `audio.js:797-815` — a hybrid: the recorded `gun.crack`
  transient plus synth body / sub / room tail / action built from a **voice profile**.
- **Distance falloff** is `_pg(pos, reach)` at `audio.js:50-55`: linear, `1.12 - d/reach`, hard-gated
  to silence at 6%. On the sample path the reach comes from the manifest instead (`samples.js:161`),
  so booms carry 250-280u, cracks 110-170u, screams 190-210u.

**Correction to the brief:** there are **13 firearms** (`src/data/armory.js:46-121`) sharing **11
voice profiles** (`armory.js:28-41`) — two share `shotgun12`. The four fields are `crack` / `body` /
`tail` / `mech` (`armory.js:25-26`). Also `audio.impact` takes **no** `body` argument; body types live
on `audio.land`.

**Rules.**
1. Where 2a removes a visual layer, **add an audio layer, not volume.** The haymaker keeps
   `meleeHit(1.8, pos, true)`; the *blast* gets `boom.deep` under `boom` (already automatic above
   power 0.85) plus a `rubble` tail — three recordings offset in time, exactly as `meleeHit` does it.
2. **Warm what POWERWORLD leans on.** `HOT_SET` (`samples.js:117-124`, 39 names) does **not** include
   `v.roar` (the KO cry), `cast.spell` / `cast.magic` (power up/down), or `engine.charge` /
   `engine.low` (the ki charge and beam voice). So the first KO cry and the first charge of a session
   can still fall through to the synth — precisely the moments a flight brawler is built around. Add
   them, or warm them at dimension entry.
3. `audio.yell` (`audio.js:234-237`) is still 100% synth and gated behind `heroVoice`, which is
   **false by default** (`audio.js:27`, `settings.js:84` — the "no LSW talking" ruling). Do not build
   the heavy read on a voice that is off.

### 2e. Screen SHAKE, not screen FILL — in degrees, not world units

Shake is the correct substitute for light, and it is the one effect that **cannot be ported as-is**
(rule 33). `world.shake(a)` accumulates a scalar clamped to 8 (`world.js:1219`) and
`world.follow` applies it as a random world-space vector on both `camera.position` and the `lookAt`
target (`world.js:1259-1262`).

| | ortho (d=260, 156u frame) | 3P (d=14, 55 deg) |
|---|---|---|
| position offset at max shake 8 | 8u of 260 = 3.1% of camDist | **57% of camDist — the camera passes through the fighter** |
| angular jitter at max shake 8 | `atan(8/260)` = **1.76 deg** | `atan(8/14)` = **29.7 deg** = 54% of the frame |
| a single haymaker, `shake(2.6)` (`melee.js:151`) | 0.57 deg | **10.5 deg**, re-randomised at 60Hz |

**Rules.**
1. In POWERWORLD, shake is **angular**: it perturbs the camera's rotation, not its position. The
   accumulator, the `min(..., 8)` clamp and the `exp(-7*dt)` decay (`world.js:1219,1251`) all stay —
   only the application changes, so `shakeMult` from Options (`settings.js:160`) still works.
2. **Amplitude in degrees:** `deg = shake * 0.20`, clamped to **1.6 degrees**. That puts a haymaker at
   0.52 deg, an explosion (`shake(0.6 + power*0.7)`, `vfx.js:123`) at 0.4 deg, a `shockwave`
   (`shake(0.8 + power)`, `vfx.js:156`) at 0.36, `onSlam`'s 1.2 (`game.js:2199`) at 0.24, and a
   maximally busy frame at the 1.6 ceiling.
3. **Two octaves, not white noise.** `world.js:1259` re-randomises every frame; at 1.6 degrees over a
   14u camera that reads as a defect. Use a decaying sine on two frequencies (~26Hz and ~9Hz) with a
   fixed axis per event, which is what reads as *impact* rather than *interference*.
4. **`punch()` becomes an FOV kick** (rule 34): `fov *= z`, eased back by the existing damp at
   `world.js:1252-1253`. `punch(0.9)` = 55 -> 49.5 degrees.
5. **Keep `slowmo`.** `slowmo(0.16, 0.34)` on a haymaker (`melee.js:158`) costs zero pixels and is the
   cheapest weight in the engine.

### 2f. Damage numbers: off, or tiny and edge-anchored

`SETTINGS.dmgNumbers` already exists (`settings.js:65`), pushed to `hud.dmgNumbersOff` at
`settings.js:177` and honoured at the top of `damageNumber` (`hud.js:1753`).

**Rules.**
1. POWERWORLD **defaults `dmgNumbers` to false.** The combo counter, the health bar and the sound
   already say what happened.
2. If the player turns them on: cap at **16px** — the existing `tag` size (`hud.js:1761`) — and route
   them to the 2b ring rather than to the target, so a number can never enter the centre box.
3. **The `worldPos.y + 7` offset (`hud.js:1756`) must become a screen-space offset** (about -28px) in
   third person. 7 world units is 48% of the assumed frame height; today's numbers would appear off
   the top of the screen as often as not. Same class of bug as every world-unit size in 1a.
4. Keep the 48-element cap (`hud.js:1754,1769`) and the `_blkFxT` throttle (`game.js:2387-2392`).

### 2g. The centre box, defined once

Every rule above refers to "the centre box." Define it in one place so the rules and the acceptance
test cannot disagree:

**CENTRE BOX = the screen rect spanning +/- 12% of width and +/- 16% of height about the aim point**
(the soft reticle / hard lock mark, `game.js` `updateReticle` / `_buildLockMark`). In third person the
opponent lives in that box essentially all the time. Nothing in sections 2a-2f may render inside it
except: the opponent, the reticle, the hit spark at the contact point, and the single impact frame.

---

## 3. THE ONE EXCEPTION TO KEEP — THE INVERTED IMPACT FRAME

**What it is.** One line of shader (`printpass.js:213-214`):

```glsl
// ---- 9. THE IMPACT FRAME. One inverted frame on connect. Costs nothing and is thirty years old.
if (uInvert > 0.001) c = mix(c, vec3(1.0) - c, uInvert);
```

Driven by `impactFrame(frames, strength)` at `printpass.js:276-280`, fired from the damage choke point
at `game.js:2340-2343` on `amount >= 14% maxHp || opts.heavy || opts.haymaker`, with strength
`min(1, 0.7 + amount/260)`.

**Why it helps where a wash hurts.** A white wash *adds* luminance uniformly, so it destroys exactly
the information the frame carried — for one or two frames your opponent is gone, replaced by nothing.
An inversion *preserves* every edge and every silhouette; it changes only the sign. The drawing is
still there, still readable, still positionally exact — it has simply flipped. That is why the
technique survived thirty years of fighting games and anime, and the file says as much
(`printpass.js:271-273`): "Held for two it reads as a flash effect; held for one it reads as the
drawing itself changing." A wash hides what you just did; an inverted frame *is* the drawing changing.

It is also **free**: one `mix` on a pass that is already running, zero texture fetches (`fetch` counts
in `settings.js:108` are ink 8, tilt 8, everything else 0), and no new light, mesh or DOM node.

**The measured evidence** (`CLAUDE.md:1226-1229`): ticking the pass *before* the render cleared
`uInvert` before the frame it belonged to was ever drawn — mean screen brightness came back
**93.6 -> 93.6 -> 93.6**, "the punch landed and nothing happened." After the fix:
**94.3 -> 160 -> 94.3, exactly one frame.** A boolean flag would have reported "working" the whole
time; only pixels caught it.

**Trap 1 — it must tick AFTER the render.** `world.render()` calls `this.composer.render()` and only
then `this.print.tick(sdt)` (`world.js:1921-1927`), with the reasoning written at the call site. Any
reordering silently deletes the effect while leaving every assertion green.

**Trap 2 — it counts FRAMES, not seconds.** `_invT` is a frame counter decremented once per tick
(`printpass.js:308`), and `impactFrame` takes `frames` (`printpass.js:276`). The comment
(`printpass.js:273-274`) states why: at 30fps a 1/60s timer is skipped entirely and the punch lands
silently.

**A third trap worth adding to the list for POWERWORLD.** `enabled` is re-derived every tick from
whether *anything* is on (`printpass.js:260-261`, `printpass.js:309`), and `impactFrame` sets
`enabled = true` itself (`printpass.js:279`). So the impact frame works even with every other dial at
zero — but if POWERWORLD ever ships a look that bypasses `apply()`, the frame goes with it. Keep
`fxImpact` (`settings.js:82`) as the only switch, and keep it on.

**Verdict: KEEP, UNCHANGED, and make it the primary heavy tell in POWERWORLD** — the thing that
absorbs the work taken away from rules 24, 2, 4 and 9.

---

## 4. WHAT A PERSPECTIVE CAMERA CHANGES

### 4a. Every world-unit size is 8-12x too big

Section 0 and the table in 1a. The one number to remember: **156u of frame becomes 14.6u.** Nine of
the fourteen 3D effects individually exceed the whole frame. This is not tuning; it is a units change,
and it wants the single conversion in 2a rather than fourteen re-tuned constants.

### 4b. `impactStar` has `depthTest: false` — it will paint over your own character

`vfx.js:262`: `SpriteMaterial({ ..., blending: AdditiveBlending, depthWrite: false, depthTest: false })`,
with the comment at `vfx.js:259` "billboard, draws over everything." At 200u+ that is a convenience —
a hit behind a wall still reads. In third person the nearest object to the camera **is the player's
own back**, so a 22.8u star at the contact point paints straight over the character model. Combined
with the 156%-of-frame size, one haymaker replaces the entire picture with a white star.

**Fix:** in POWERWORLD, `impactStar` takes `depthTest: true` and a small `polygonOffset`/`renderOrder`
so it still wins ties against the fighter it is landing on, but loses to geometry in front of the
lens. Also apply 2a's size fraction.

### 4c. Particle sizes: the point shader is already a perspective divide, calibrated to nothing

`gl_PointSize = aSize * (300.0 / -mv.z)` (`particles3d.js:14`). At `camDist = 260` (`world.js:53`) that
factor is **1.15**, so an authored `aSize` of 2.8 draws as ~3.2 device pixels. At 14u the factor is
**21.4**, so the same particle is **60 pixels**. `explode()`'s smoke at `aSize 4.5` (`vfx.js:121`)
becomes **96 pixels**, and it spawns 10 of those plus up to 54 sparks (`vfx.js:119`).

Additional facts that matter: the pool is one `THREE.Points` of max 6000 (`particles3d.js:29`) with
`frustumCulled = false` (`particles3d.js:54`), uploading only the used slots via
`addUpdateRange(0, n * itemSize)` (`particles3d.js:120-125`) — so the *upload* is already
well-behaved and count is cheap. The problem is purely fragment area and additive blending
(`particles3d.js:51`).

**Fix, one uniform and one clamp:**
`gl_PointSize = min(aSize * (300.0 / -mv.z), aSize * uMaxK)` with `uMaxK` about **2.5**. That keeps
depth cueing for anything far away (the city is untouched, since it never gets near the cap) and caps
a near-field particle at ~2.2x its authored isometric pixel size. Preferable to normalising the size
outright, which would delete depth cueing everywhere.

Also cap counts in POWERWORLD: `explode()`'s `26 + power*14` sparks (`vfx.js:119`) is 54 at power 2;
20 is plenty when each one is 18x bigger.

One unrelated note found while reading: particles bounce off a hard `y = 0` plane
(`particles3d.js:111`), not `world.heightAt`. Pre-existing, cosmetic, and not this pass's problem —
but in a flight dimension with no ground at y=0 it will look wrong.

### 4d. Additive materials near the lens, and the pooled lights

**Additive.** Covered in 2c. The mechanism is bloom-before-tonemap (`world.js:1194-1197`) plus
`AdditiveBlending, depthWrite: false` on every `vfx` primitive (`vfx.js:5`). At close range the
overlap goes from "occasionally two layers on a few hundred pixels" to "four layers on most of the
frame."

**Lights.** The project is on three **r169** (`package.json:23`), which is physically-correct lighting
only — `useLegacyLights` was removed in r165 — so `new THREE.PointLight(0xffffff, 0, 100)`
(`vfx.js:49`) has `decay = 2`. `borrowLight(color, 6, dist)` at intensity 6 contributes ~6/d^2. At
260u that is nothing; **at 2u from a fighter's chest it is ~1.5**, comparable to the key light. Since
`flash()` fires on *every* unblocked hit (`game.js:2401`, via `vfx.js:69`), POWERWORLD will have
several of the 14 pooled lights sitting close to the camera and genuinely lighting the frame, where
in the city they were effectively decorative.

**Fix:** scale the borrowed intensity by distance-to-camera in POWERWORLD (or simply lower the
`flash()` intensity from 6 to ~2 for close blasts). **Never** by hiding lights — see 4e. FLAG: I
reasoned this from the r169 default and did not render it; it needs an eyeball.

### 4e. THE LIGHT-COUNT LAW, restated exactly (it constrains every fix above)

**three.js bakes the number of VISIBLE lights into every material's program cache key.** The moment
the count of visible lights changes, the renderer recompiles **every material in the scene** at the
next render.

The old `vfx` light pool grew lazily and flipped `.visible` on borrow/return. A beam held on a raised
guard called `onHit` every frame, so it spawned a flash plus a light **every frame**; the visible
point-light count oscillated **2 to 8**; the city recompiled dozens of times a second. Measured:
**+152 programs in 4 seconds, a 400ms freeze.** This predates the news crew and was a second,
independent cause of the "blocking freezes the game" report.

The fix, in code at `vfx.js:38-52`: a **FIXED pool of 14 `PointLight`s**, created in the constructor,
**always in the scene and always `visible = true`**, all starting at intensity 0.
`borrowLight`/`returnLight` (`vfx.js:57-63`) **only drive intensity** — `returnLight` sets
`intensity = 0` and pushes back to the free list, and the comment on that line spells out the
invariant: "never touch .visible, never remove from the scene." On exhaustion `borrowLight`
**steals the dimmest light** (`vfx.js:59`) rather than growing the pool, so the count is constant by
construction and the recompile can never fire. Supporting rules: anything that borrows must return
with `returnLight` **only** — never `scene.remove(light)`, which orphaned a pool light permanently at
three projectile dispose sites — and `onHit` throttles the sustained-block flash and number to ~8/s
per target via `_blkFxT` (`game.js:2387-2392`). Verified: the exact repro went from +152 programs and
410ms spikes to **+0 programs, 5.1ms average, lights pinned 14 to 14.**

**What this means for POWERWORLD.** Every rule in section 2 must be implementable **without changing
the scene's light count.** Concretely:

- Dimming a flash means `intensity`, never `.visible`.
- POWERWORLD must not add or remove lights when the dimension is entered or left, per-effect or
  per-frame. (The base and the training hall each add exactly one `HemisphereLight` at a mode
  transition and remove it on close — `baseroom.js:99-102` — and the comment there notes that is
  "acceptable ONCE at a mode transition, never per frame." A dimension entry is the same category.)
- 14 is the budget. If POWERWORLD wants more simultaneous close-range flashes than that, the answer
  is fewer flashes, not more lights.
- The print pass is safe by construction and says so: "NOTHING HERE TOUCHES LIGHTS"
  (`printpass.js:28-29`). That is another reason to move work from the 3D layer into the post pass.

### 4f. Bloom is half-resolution, which makes it spread further than you expect

`UnrealBloomPass(new Vector2(w*0.5, h*0.5), 0.66, 0.6, 0.8)` (`world.js:1195`), kept at half the RT
size on resize (`world.js:1211`) and on every quality tier (`world.js:1946`), with strength dropping
0.66 / 0.55 / 0.42 and the whole chain disabled at tier 0 (`world.js:1947-1948`). A blur radius of 0.6
at half resolution is a generous screen-space spread; apply it to an object that is now 10x larger and
the glow reaches across the frame. Nothing to change here — it is the right pipeline — but it is the
multiplier that turns "slightly too bright" into "the corner is white," which is exactly what
happened in the base (`baseroom.js:129-132`).

### 4g. The rest of the pipeline survives the camera change

Worth stating so nobody re-does it: `screenPosOf` and `toScreen` are `project()`-based and correct for
either camera (`world.js:1767-1773`, `world.js:168-175`); the fog-of-war shader, the print pass, the
particle upload, the comic layer's placement and the whole audio falloff are all camera-agnostic. The
things that are **not** are `world.follow` (`world.js:1244-1267`), `world.shake` (`world.js:1219`),
`world.punch` (`world.js:1220`), and every world-unit size in `vfx.js`.

---

## 5. A POWERWORLD LOOK PRESET

### 5a. How a dimension already declares its look — reuse both seams, add nothing

- **Sky:** `world.setSkyWorld(id)` (`world.js:187-199`), called once from `main.js:216` off
  `theater.planet`. It swaps the day/night colour set and restores it exactly on return.
- **Grade:** `world.applyWorldGrade(tint)` (`world.js:182-185`) -> `print.setWorldGrade`
  (`printpass.js:289-297`), which derives `uLift` and `uGain` from the sky the world already declares.
  The comment is explicit that this is derived, never an authored LUT, "so they cannot drift from the
  atmosphere the player is standing in."

So POWERWORLD gets its grade for free by declaring a sky. **No new grading machinery.**

### 5b. The dials

A different dimension may legitimately look different from the city. The constraints that actually
bind: tilt-shift must be zero (rule 17), levels must be zero (rule 22), and ink is the one thing that
*helps* — it is the only effect in the stack that makes the opponent read better rather than worse.

**Proposed preset — `powerworld`, display name `ALTITUDE`:**

| dial | value | vs BROADCAST (`settings.js:122-123`) | why |
|---|---|---|---|
| `ink` | **0.55** | 0.85 | a thinner nib. At close range a luminance Sobel (`printpass.js:119-138`) finds every fold in a costume; 0.85 outlines the wrinkles as heavily as the silhouette |
| `halftone` | **0.42** | 0.55 | shadows-only and fixed device-pixel pitch, so it is camera-safe — but at close range it is on the character's face. Slightly back |
| `levels` | **0** | 0 | unchanged. Tone-snapping a close-up figure destroys form |
| `grain` | **0.22** | 0.30 | multiplicative and cheap, but it is a print cue sitting on a face |
| `tilt` | **0** | 0 | **must be pinned.** Screen-band blur on a subject that moves vertically in frame |
| `dither` | **0.35** | 0.35 | unchanged. Pure ALU, dark end only |
| `grade` | **1** | 1 | unchanged — this is where the dimension's identity comes from, derived from its sky |
| `vibrance` | **0.28** | 0.35 | back a little; the frame is dominated by one saturated character, and vibrance weights by `(1 - existing saturation)` (`printpass.js:195-201`) so it is already doing less here |
| `saturation` | **-0.06** | 0 | **the deliberate addition.** A small global desaturation pulls the base image toward ink and gives the additive VFX somewhere to go before they clip. SPLASH already uses -0.05 (`settings.js:125`) |
| `fetch` | **8** | 8 | ink only. `budgetLook` (`settings.js:136-142`) drops it at quality tier 0, which is the correct degradation |
| `fxImpact` | **true** | true | section 3. Non-negotiable |
| `fxSpeedLines` | **true, at reduced strength** | true | rule 16: cut the shader mix from 0.55 to ~0.34 (`printpass.js:172`) and the amplitude at the call site (`game.js:2346`) to ~0.6x |
| `fxRim` | **0.9** | 0.8 | rim light is material-level (`figure.js` `applyRim`/`setRim`, driven by `w._rimK` at `settings.js:172`) and it is the cheapest possible silhouette separator — exactly the tool this discipline wants. Up slightly |

**The honest alternative.** Ship the existing **FIELD** row (`settings.js:120-121`: ink 0, halftone
0.55, grain 0.30, tilt 0, dither 0.35, grade 1, vibrance 0.35, **fetch 0**) and add `ALTITUDE` only
once somebody has looked at ink at close range. FIELD costs zero new code and zero extra texture
fetches, and the naming law (`settings.js:111-114`) says a preset should be named for what it is for
— which means it should not exist until it has a job. **Decision criterion:** run the section 6
harness with ink at 0 and at 0.55 and compare the *silhouette-delta* metric (6c, test 4). If ink
raises it, ship `ALTITUDE`; if not, ship FIELD.

### 5c. How the dimension imposes it without overwriting the player

`SETTINGS.look` is the player's choice, default `'broadcast'` (`settings.js:80`). The project already
has the right pattern for clamping the shader without touching that choice — `budgetLook(dials, tier)`
(`settings.js:136-142`), whose header states the rule: "the player's CHOICE is never overwritten —
this clamps what the shader does, and `SETTINGS.look` still says what they asked for, so the moment
the GPU recovers they get it back."

**Do the same for the dimension.** Add `dimensionLook(dials, worldId)` composed at the one existing
call site (`settings.js:166-170`):

```
w.print.apply(dimensionLook(budgetLook({...dials}, tier), worldId))
```

It pins `tilt = 0` and `levels = 0` unconditionally in POWERWORLD, and otherwise nudges toward the
`ALTITUDE` numbers. One function, one call site, `SETTINGS.look` untouched, and the player gets their
city look back on the way home. **A preset is a set of dial positions, not a second system**
(`settings.js:96-98`) — this keeps that true.

---

## 6. A MEASURABLE ACCEPTANCE TEST

The claim to prove is not "the frame is dark." It is **"the centre of the screen still contains a
readable opponent."** Those are different, and only the second one cannot be gamed by turning
everything down.

### 6a. The technique the project already uses

- Sample the **drawing buffer**, in the **same task as the render**. `WebGLRenderer` is constructed
  without `preserveDrawingBuffer` (`world.js:32`), so a later call gets a blank canvas. Documented at
  `docs/COMBAT_MANUAL.md:2381-2384` and `CLAUDE.md:1061-1062`. A page screenshot is useless here — it
  captures the DOM, which includes the HUD.
- **`game.update(dt)` ends with `this.world.render()`** (`game.js:3170`), which calls
  `composer.render()` then `print.tick(sdt)` (`world.js:1921-1927`). So: call `game.update(dt)`, and
  read pixels immediately on return, before yielding.
- **Clear the scissor rect and viewport first.** The news crew renders its 320x180 POV scissored into
  the canvas corner and restores the viewport but the scissor state is a known trap
  (`newscrew.js:513-518`); a manual render outside the frame loop inherits it and comes back black
  except one corner (`CLAUDE.md`, section 42 note).
- **Measure in a foregrounded tab.** A hidden or backgrounded pane renders at 0x0,
  `renderer.info.render.calls === 1`, and `world._ema` reads ~98ms. Sim numbers are meaningful there;
  pixel numbers are not.
- **Do not stub `world.render`** for this suite. (That stub is correct for sim-only timing and wrong
  here.)

### 6b. Metric

For each captured frame, on the raw sRGB bytes the print pass emitted (`printpass.js:14-18` — it
outputs tone-mapped sRGB, so no conversion), compute Rec.709 relative luminance
`L = 0.2126R + 0.7152G + 0.0722B` on 0-255, over three regions:

- **CENTRE** — the box from 2g: +/- 12% of width, +/- 16% of height about the aim point.
- **RING** — the rest of the inner 60% of the frame.
- **EDGE** — the outer 40%.

### 6c. The tests, with numbers

**Test 0 — the suite proves itself first.** Assert `renderer.info.render.calls > 1` and that the
captured buffer is not uniform, *before* asserting anything about it. (A previous pass in this repo
shipped `chips.every(...)` on an empty array — `[].every()` is true, so two assertions went green
while nothing rendered.)

**Test 1 — baseline.** 60 frames of a live POWERWORLD fight with no hits landing. Record CENTRE mean
`L0` and its p95. Everything below is relative to `L0`, so the test survives a re-grade.

**Test 2 — peak, per worst-case event.** For each of: haymaker connect, `explode` radius 16 at the
target, `shockwave` under the player, a tier-up (`game.js:2142`), and a KO — CENTRE mean must not
exceed **`L0 + 40`** for more than **one consecutive frame**, and must **never** exceed **200**.

**Test 3 — no blowout.** The fraction of CENTRE pixels with `L > 235` stays under **2%** on every
frame except the single impact frame. This is the numeric form of the base's gold-corner failure
(`baseroom.js:129-132`), which no assertion caught.

**Test 4 — SILHOUETTE DELTA (the one that matters).** Render each frame **twice in the same task**:
once normally, once with the opponent's figure group `visible = false`. Compute mean absolute
luminance difference inside CENTRE. That number *is* "can I see my opponent." It must stay above
**12** (on 0-255) through the entire worst-case sequence, including the impact frame. This is the
metric that cannot be satisfied by making the screen dark, and it is the one that should gate the ink
decision in 5b.

**Test 5 — recovery.** CENTRE mean returns to within **5** of `L0` inside **0.25s** (about 15 frames
at 60fps) of the last hit resolving.

**Test 6 — the impact frame, asserted separately and exempted from 2 and 3.** Reproduce the
`CLAUDE.md:1226-1229` shape in POWERWORLD: CENTRE mean over three consecutive frames must read
`~L0 -> ~(255 - L0) -> ~L0`, i.e. **exactly one** inverted frame. Then re-run with `fxImpact` false
and assert the middle sample stays at `~L0` — which is what proves the test can see the effect at all.

**Test 7 — the centre is not in the DOM's way either.** After `hud.update()`, walk
`#hDmg`, `#hHits`, `#comicLayer` and assert **no element's bounding rect intersects the CENTRE box**.
That is rules 25, 28 and 31 as a single assertion, and it is the cheap one to run on every commit.

**Test 8 — shake stays inside the frame.** With `shake` driven to its 8 clamp, assert the camera's
angular deviation from its rest orientation never exceeds **1.6 degrees** and its position deviation
never exceeds **0.4u**. That is rule 2e, and it is checkable without pixels.

**Test 9 — the light count never moves.** Across the whole sequence, assert the count of visible
lights in the scene is constant and `renderer.info.programs` grows by **0** after warm-up. Rule 4e as
a regression guard.

### 6d. The screenshot is still required

Every rule in section 2 exists because of something a screenshot caught and an assertion did not: the
ring being four times too big, the base's gold corner, the training hall rendering near-black. Tests
1-9 are the regression net. A human still has to look at the frame once before it ships.

---

## 7. WHAT I COULD NOT VERIFY

1. **POWERWORLD does not exist.** No dimension, no third-person camera, no perspective game camera.
   Every "% 3P" figure derives from an **assumed** rig (d = 14u, vertical FOV 55 degrees) that I chose
   and stated in section 0. If the real camera is further back or narrower, every ratio changes —
   though not the conclusion, since the alternative rig (d = 20, FOV 50) still gives 8.4x.
2. **I ran nothing and captured no pixels.** Every screen-fraction number is arithmetic over source
   constants (`vfx.js`, `world.js`, `particles3d.js`), not a measurement. Section 6 exists to replace
   them with measurements.
3. **GPU cost of near-field additive overdraw is unmeasured.** The project's own record says why this
   is hard: CPU timing around `render()` measures submission not GPU work, a hidden pane early-outs,
   and `EXT_disjoint_timer_query_webgl2` was unavailable in the harness (`settings.js:100-109`). My
   4-5x overdraw estimate in 2c is arithmetic on fragment area, not a profile.
4. **PointLight illuminance at close range (4d)** is reasoned from three r169 being
   physically-correct-only (`package.json:23` = 0.169.0, `useLegacyLights` removed in r165) plus the
   default `decay = 2` on `vfx.js:49`. I did not render it. Treat the "~1.5 at 2u" figure as an
   order-of-magnitude claim.
5. **The `-mv.z ≈ 260` premise for the ortho particle factor (4c)** follows from `camDist = 260`
   (`world.js:53`) and camTarget-centred framing, but the true value varies with an object's offset
   along the view axis, so 1.15 is a central value, not a constant.
6. **Second-hand line citations.** The `samples.js` manifest inventory (2d) and the `hud.styles.js` /
   `comic.css` values (1c) came from two subagent reads. I independently re-verified the load-bearing
   ones — `hud.styles.js:5,10,11,12,13,159`, `comic.css:40,180-190,204-209`, `index.html:72`,
   `samples.js:24-33`, `audio.js:50-55,152-171`, `armory.js:25-31,40-41` — but not every row of the
   72-family manifest table.
7. **Cross-browser behaviour of `mix-blend-mode: screen` (`hud.styles.js:159`) composited over a
   WebGL canvas** is untested. It matters only if rule 24 is rejected.
8. **Whether ink helps or hurts at close range** is genuinely open, and it is the only judgement call
   in section 5 that I would not make from source. It is why 5b names a decision criterion instead of
   an answer.
9. **Two stale comments found while reading, unrelated to this pass but worth a line each:**
   `samples.js:11` still says "254 files, ~6MB" when the directory is 300 mp3s at 3.6 MiB
   (`samples.js:136-139`); and `armory.js:18-22` still says firearm sound "IS SYNTHESIZED, AND THAT IS
   A DECISION" when `audio.gunshot` has been a hybrid using the recorded `gun.crack` transient since
   2026-07-26 (`audio.js:797-815`). Also `armory.js:22` and `audio.js:799` both say "twelve" firearms;
   there are 13 (`armory.js:46-121`).

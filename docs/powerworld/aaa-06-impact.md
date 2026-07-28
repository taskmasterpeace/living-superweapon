# POWERWORLD — IMPACT AND FEEL AT A CLOSE THIRD-PERSON CAMERA

**WAR WORLD: ASCENDANTS · D:\lsw · 2026-07-27**

> *"a stylistic third-person shooter where BFP is in the air and Jedi Knight is on the ground.
> Leave the ground and you are playing Bid for Power. Touch it and you are playing Jedi Academy.
> The camera never changes hands, the reticle never lies, and every one of the 52 fighters gets both
> grammars with no exceptions."* — Robert

Sources for this document: `docs/powerworld/pw-impact.md` (the indicator-discipline audit),
`docs/powerworld/pw-limbs.md` (the segmentation plan), `docs/COMBAT_MANUAL.md` §46–47,
`docs/POWERWORLD.md` §14, `docs/powerworld/pw-bfp-source.md` (BFP read from the real Quake III SDK
tree), `docs/reference/openjk.md` (Jedi Outcast/Academy read as source). **Every engine claim below
is `file:line` against the tree as it stands today. Every BFP/JKA claim is `researchdoc:line`.**

---

## 0. THE THREE CORRECTIONS THAT CHANGE THE WORK

Read these first. Two of them invalidate load-bearing numbers in the research, and one closes a
defect the plan still lists as open.

### 0.1 ⚠ THE TEN-TIMES RULE IS WRONG. The real number is 4.75×, and — far more importantly — **it is not a constant.**

`pw-impact.md:24-31` states its own premise honestly: *"Assumed POWERWORLD frame (GUESS). Third
person, camera d = 14u behind the fighter, vertical FOV 55 degrees"*, and `pw-impact.md:624-627`
repeats that **POWERWORLD did not exist** when it was written. It does now. `world.chase()`
(`world.js:2242-2327`) shipped, and the real rig is nothing like the guess.

The camera is **not at a fixed distance.** `world.js:2286-2288` derives it every frame:

```js
const FRAME_MAX = 52;
const fit  = (Math.min(gap, FRAME_MAX) + 20) / (2 * Math.tan((this._chaseFov * Math.PI/180) / 2));
const want = clamp(Math.max(24, fit * 1.15) + k * 16, 24, 86);
```

with `_chaseFov = 58 + k*16` (`world.js:2248`), `k = clamp((spd - 14)/96, 0, 1)` (`world.js:2247`),
and `gap` the subject→target distance, defaulting to **40** when there is no target
(`world.js:2280`). The eye is placed at `world.js:2308`:

```js
const px = az/hyp, pz = -ax/hyp; const off = d * 0.17;
const ex = S.x - ax*d + px*off, ey = S.y + 5.4 - ay*d*0.18 + d*0.30, ez = S.z - az*d + pz*off;
```

so with a level axis the **eye-to-subject distance is `d·√(1 + 0.17² + 0.30²) = 1.0578·d`**, and the
visible world height at the subject is `2 · 1.0578·d · tan(fov/2)`.

| situation | `gap` | `k` | `d` (`_chaseDist`) | eye→subject | **frame height** | ratio vs ortho 156u |
|---|---|---|---|---|---|---|
| power-punch reach (`martial.js` power 7u) | 7 | 0 | 28.0 | 29.6 | **32.9u** | **4.75×** |
| jab reach (11u) | 11 | 0 | 32.2 | 34.0 | **37.7u** | **4.14×** |
| mid exchange | 26 | 0 | 47.7 | 50.5 | **56.0u** | 2.79× |
| free flight, no lock | 40 | 0 | 62.2 | 65.8 | **73.0u** | 2.14× |
| `FRAME_MAX` standing | 52+ | 0 | 74.7 | 79.0 | **87.6u** | 1.78× |
| `FRAME_MAX` at full cruise | 52+ | 1 | 86 (clamp) | 91.0 | **137.1u** | **1.14×** |

*(Isometric reference: `frustum = 78` half-height → **156u** frame, `world.js:52`. Two humans zoom to
`setBaseZoom(clamp(spread*0.6+56, 78, 128))`, `game.js:3726` → up to 256u.)*

**The conclusion is unchanged and the reasoning is now stronger.** The fix cannot be a set of
PowerWorld constants, because a constant is right at exactly one distance and this camera dollies
through a **4.2× range of frame heights inside a single exchange** (32.9u clinch → 137.1u fleeing).
It has to be a conversion that reads the live frame. See §3.

⚠ Cite this table, not `pw-impact.md`'s §1a percentages. Those were computed against a 14.6u frame
that does not exist. The corrected audit is §2.1 below.

### 0.2 ⚠ `world.shake()` IS ALREADY ANGULAR IN THE CHASE VIEW. What is wrong with it is different, and smaller.

`POWERWORLD.md:717` ("Still owed", item 4) says *"`world.shake()` is still the world-space one
outside the chase camera"*, and the brief for this document repeats the 29.7° figure. **Inside
`chase()` it was fixed** — `world.js:2312-2318`:

```js
// ⚠ ANGULAR SHAKE, NEVER THE WORLD-SPACE ONE. ... Here the shake is an ANGLE, capped at 1.6°,
// applied to the look point only.
this._shake *= Math.exp(-7 * dt);
const jit = Math.min(0.028, this._shake * 0.011) * d;
const jx = (Math.random()*2-1)*jit, jy = (…)*jit, jz = (…)*jit;
c.lookAt(this.camTarget.x + jx, this.camTarget.y + jy, this.camTarget.z + jz);
```

The world-space version survives only in `follow()` (`world.js:1346-1349`), which is the isometric
path and must not change.

So the 29.7° number is dead. **Three real defects remain, and they are the §4 spec:**

1. **The 1.6° cap is a claim about a scalar that is not the angle.** `jit` is a *per-component*
   half-width of a uniform cube, but only the component **perpendicular to the view** rotates the
   camera — and that has magnitude up to `jit·√2`. The divisor is also wrong: the arithmetic uses
   `d`, but the eye sits `1.0578·d + gap·bias` from the look point (`world.js:2290-2291`,
   `bias = clamp(gap*0.012, 0.16, 0.42)`). Measured at the clinch framing (`d = 31.1`,
   eye→look 34.5u): **peak 2.04°, RMS 1.18°** — not 1.6°.
2. **It saturates at `_shake = 2.545`** (`0.028 / 0.011`), and a single haymaker already exceeds
   that: `melee.js:151` books `shake(2.6·fp)` and `vfx.impact` books another `shake(0.4 + power)`
   = 2.4 (`vfx.js:284`) in the **same frame**, and `shake(a)` *accumulates*
   (`world.js:1298`). So a haymaker, a beam overpower, a tier-up and a KO all deliver the identical
   camera. **There is no dynamic range at the top of the ladder, which is where it should be widest.**
3. **It is white noise.** `Math.random()` per component per frame at 60 Hz reads as *interference*,
   not as *impact*. `pw-impact.md:260-262` calls for two decaying octaves with a fixed axis per
   event and it was never done. ⚠ And the frequencies it proposes (~26 Hz and ~9 Hz) **cannot be
   used**: the Steam Deck guide tells players to lock **40 Hz** (`POWERWORLD.md:696-699` documents
   the governor built for exactly that), and 26 Hz past a 20 Hz Nyquist limit aliases to garbage.
   The frequency budget is derived in §4.3.

### 0.3 ⚠ `world.punch()` IS A COMPLETE NO-OP IN POWERWORLD, at ~24 call sites.

`world.js:1299`:

```js
punch(z) { this.frustumTarget = Math.min(this.frustumTarget, this.frustum * z); }
```

`frustumTarget` is read in exactly one place — `follow()` at `world.js:1338-1339` — and `follow()`
is the isometric path. `chase()` never reads it; it derives `_chaseFov` from speed alone
(`world.js:2248`) and hands it to `_applyProj()` (`world.js:2203`).

So **every one of these does nothing in the dimension**: `melee.js:125` (guard crush), `melee.js:158`
(haymaker), `melee.js:220` (throw), `melee.js:262` (cross), `game.js:2269`, `2329`, `2387`, `2559`
(tier-up), `2526` (KO), `projectiles.js:1090` (beam overpower), `powerworld.js:410` (rock shatter),
`abilities.js:69, 106, 181, 307, 412, 466, 826`, `summons.js:175, 201, 209`.

⚠ **And it leaves state behind.** `Math.min` only ever ratchets `frustumTarget` *down*, and nothing
in `chase()` damps it home — so a PowerWorld session ends with `frustumTarget` parked at
`78 × (smallest z seen)` = 46.8 after any `punch(0.6)`. The first frames back in the city are
punched-in until `follow()`'s 3.5-rate damp (`world.js:1338`) unwinds it. Cosmetic, ~0.3s, but it is
a dimension leaking into the city, which §47's whole evidence block exists to prevent.

Spec in §5.

### 0.4 One thing pw-limbs.md lists as open that is now CLOSED — do not re-fix it

`pw-limbs.md:273-279` (§1.6-1) reports the `kneeCap` orphan: *"Two stray 0.5-radius spheres sit at
every corpse's feet."* **Fixed.** `figure.js` now exposes it — `pivot.userData = { thigh, knee, shin,
boot, kneeCap }` — with the rule written at the site, and `ragdoll.js:65` includes
`p.legL.userData.kneeCap, p.legR.userData.kneeCap` in `driven`. Likewise `pw-limbs.md:33-40` (§0.2,
*"There is no third-person camera to segment for yet"*) and its §5.2 advice to borrow the news crew's
POV camera are superseded — use `world.chase()`.

---

## 1. THE FRAME, AND THE ONE PLACE EVERY RULE POINTS AT

### 1.1 The two constants

| | isometric (city) | chase (POWERWORLD) |
|---|---|---|
| camera | `OrthographicCamera`, `world.js:62-64` | `PerspectiveCamera(58, asp, 0.6, 4200)`, `world.js:2218` |
| frame height | `2 × frustum` = **156u** (`world.js:52`) | `2 · dist · tan(fov/2)` = **32.9u … 137.1u** (§0.1) |
| a 9.6u fighter is | 6.2% of frame height | **29.2%** at clinch, 7.0% at the cap |
| projection | `_applyProj()` `world.js:2199-2201` | `_applyProj()` `world.js:2202-2204` |
| drive fn | `follow()` `world.js:1326` | `chase()` `world.js:2242` |
| arbiter | `game.cameraDrive` `game.js:3706-3720` — `mapCam` > `ms.chaseCam` > `followHumans` | same |
| the flag | — | `g.ms = { powerworld: true, chaseCam: true }`, `game.js:186` |

### 1.2 THE CENTRE BOX, in degrees

`pw-impact.md:288-291` defines it: **±12% of width and ±16% of height about the aim point.** At 16:9
and FOV 58 that is a real angular quantity, and every rule below is measured against it:

- vertical half-extent: `atan(0.32 · tan(29°))` = **±10.06°** (±13.56° at the 74° speed FOV)
- horizontal half-extent: `atan(0.24 · aspect · tan(29°))` = **±13.31°**

⚠ This kills one tempting derivation before anyone reaches for it: **the shake ceiling is not set by
the centre box.** Even the current over-hot 2.04° peak is only 20% of the box's vertical half-extent
— the opponent never leaves the box. The shake ceiling is set by *readability* and by the **40 Hz
sampling limit** instead (§4.3). Say so, or someone will "derive" a 10° shake.

### 1.3 The one seam every size fix goes through

Add to `world.js`, beside `_applyProj()`:

```js
/** World height of the frame at a world point. The one number every screen-relative size reads. */
frameHeightAt(p) {
  const c = this.camera;
  if (c.isOrthographicCamera) return this.frustum * 2;
  const dx = c.position.x - p.x, dy = c.position.y - p.y, dz = c.position.z - p.z;
  return 2 * Math.hypot(dx, dy, dz) * Math.tan((c.fov * Math.PI / 180) / 2);
}
```

This is the `GROUND_LAYER` / `DECAL_LIFT` shape (`core/util.js:92`, `:90`) applied to sizes instead
of heights: **one shared ladder rather than forty call sites each picking a small number.** It is the
project's own stated cure for exactly this class of defect (CLAUDE.md, THE FLICKER LAW).

---

## 2. THE AUDIT, RECOMPUTED AGAINST THE REAL RIG

### 2.1 The 3D layer (`src/engine/vfx.js`)

Melee rows are measured at the **clinch frame, 32.9u** (the worst realistic case for a punch). Blast
rows at the **mid frame, 56.0u**. `fp = 0.6 + 0.4·mom` (`melee.js:136`), `mom = 1` standing.

| # | effect · site | trigger | life | peak world extent | % of ortho 156u | **% of the real frame** | verdict |
|---|---|---|---|---|---|---|---|
| 1 | `impactStar` white — `vfx.js:272` via `melee.js:150` at power 2 | haymaker | 0.16s | `19 × 1.2` = **22.8u** | 15% | **69%** | CLAMP to `0.18` of frame |
| 2 | `impactStar` accent — `vfx.js:273`, only `power > 0.9` | same, stacked | 0.24s | `15 × 1.2` = **18.0u** | 12% | **55%** | **CUT** in close-frame — layer 2 of 4 on one pixel |
| 3 | `flash()` sphere inside `impact()` — `vfx.js:274`, `size = 3+power*3` | same | 0.09s | `9 × 1.3 × 2` = **23.4u** dia | 15% | **71%** | SHRINK hard, **keep the light** (§6) |
| 4 | `ring()` inside `impact()` — `vfx.js:278`, `r1 = 5+power*5`, **camera-facing** (`vfx.js:209` copies `camera.quaternion`) | same | 0.20s | **30u** dia (36.4u at `mom` 1.8) | 19% | **91%** (111%) | CLAMP to `0.18`; keep billboard — the *size* is the defect, not the orientation |
| 5 | `flash()` from `onHit` — `game.js:2814`, `size` 2.4/3.0 | **every** unblocked hit; blocked throttled ~8/s by `_blkFxT` (`game.js:2803-2805`) | 0.10s | **6.2u** dia | 4% | 19% | CLAMP to `0.05` — highest-frequency light in the game |
| 6 | `explode()` shell — `vfx.js:90-106` | any blast, radius 11–18 typical, 44 on `_overpower` | `0.5 + power*0.15` | r16 → **44.8u** dia | 29% | **80%** | CLAMP to `0.64`; ⚠ **and it encloses the eye** — see below |
| 7 | `explode()` white kernel — `vfx.js:108-115` | same | 0.14s | r16 → **21.4u** dia @ opacity 0.95 | 14% | **38%** | **SUPPRESS within `1.4 × radius` of the camera** |
| 8 | `explode()` pressure ring — `vfx.js:117`, `r1 = radius*1.7` | same | 0.32s | r16 → **54.4u**, flat | 35% | 97% (foreshortened) | KEEP flat, CLAMP to `0.9` |
| 9 | `shockwave()` dome — `vfx.js:137,145` | slams, novas, second wind (`game.js:2269`), tier-up r46 (`game.js:2556`), overpower r44 (`projectiles.js:1089`) | `0.5 + power*0.14` | maxR 28 → **62u × 17u** | 40% | 111% | **CUT the dome in close-frame.** The two flat rings (`vfx.js:131-135`) carry the read |
| 10 | `shockwave()` → `lightning()` — `vfx.js:155` | same | 0.26s, rebuilt every 0.04s (`vfx.js:195`) | `radius·0.7` = 19.6u, `height 10+power*8` | — | fills frame | SCALE radius/height by the frame; keep the flicker cadence |
| 11 | `lightning()` pooled light — `vfx.js:190` | same | 0.26s | intensity 6, `distance = radius*3` | — | — | **KEEP UNCHANGED** — §6 |
| 12 | `impact()` particles — `vfx.js:276-277`, `aSize` 2.8 / 3.6, up to 30 | haymaker | 0.4–0.55s | 3.2 / 4.2 device px ortho → **24 / 31 px** at clinch | — | — | CLAMP in the shader (§7) |
| 13 | `explode()` particles — `vfx.js:119-121`, `aSize` 2.6 / 1.6 / 4.5, sparks `26 + power*14` (=54) | any blast | 0.6–1.1s | smoke **5.2 px → 38.6 px** | — | — | CLAMP + cap `count` (§7) |
| 14 | `scorch()` / `residue()` — `vfx.js:221-259` | ground blasts, pool capped 40 | lingers | `radius` ground decal | — | — | **KEEP** — ground plane, dark, zero centre cost |

⚠ **The row that is not a percentage: the camera gets inside the geometry.**

At the clinch framing the eye is ~30u horizontally from the subject and ~+14u above them
(`d·0.30`, `world.js:2308`). Test the two worst cases:

- `explode` radius 16 centred on the subject: shell peaks at **radius 22.4u**. The eye at 33u is
  outside — *by 10u*. At `mom` 1.8 or a radius-22 airliner throw (`game.js:789`) it is **inside**.
- `_overpower`'s `shockwave(radius 44, power 1.9)` (`projectiles.js:1089`): the dome scales to
  `(3+44, 3+22, 3+44)` = an ellipsoid `(47, 25, 47)`. Eye at horizontal 30, height 14:
  `(30/47)² + (14/25)² = 0.72 < 1` → **the camera is inside an additive dome at opacity up to 0.32
  for `0.5 + 1.9·0.14` = 0.77 seconds.** Same for the tier-up's radius-46 dome (`game.js:2556`),
  0.72s.

**A backside-sphere test cannot be percentage-based, and this is why rule 9 is CUT rather than
CLAMP.** A dome you are inside tints every pixel in the frame regardless of how big you make it.
The precedent is `spaceflight.js`'s heliopause shell — `POWERWORLD.md`-adjacent, CLAUDE.md §35:
*"the heliopause shell is 0.04 opacity — a backside sphere you're inside tints every pixel and drowns
the stars."* Same geometry, same lesson, ten times the opacity.

### 2.2 The post pass (`src/engine/printpass.js`) — the best-behaved layer, and it needs almost nothing

| # | effect | site | verdict |
|---|---|---|---|
| 15 | **impact frame** — `if (uInvert > 0.001) c = mix(c, vec3(1.0) - c, uInvert);` | `printpass.js:213-214`, driven `printpass.js:276-280`, fired `game.js:2753-2756` | **KEEP, UNCHANGED, and make it the primary heavy tell.** §8 |
| 16 | speed lines | `printpass.js:165-172`, fired `game.js:2757-2760` | KEEP, mix 0.55 → **0.40**. §9 |
| 17 | tilt-shift | `printpass.js` `uTilt` | **PIN TO 0.** A horizontal *screen band*; in third person the subject moves vertically in frame, so it blurs your opponent at random |
| 18 | ink / Sobel | `uInk`, `LOOK_PRESETS` `settings.js:122-123` = 0.85 | KEEP — it is the only effect in the stack that makes the opponent read *better*. Thin to **0.55**; decide by measurement (§12, test 4) |
| 19 | halftone | `printpass.js:150-163`, shadows only (`mask = 1 - smoothstep(0.05,0.62,lum)`), fixed device-pixel pitch | KEEP at **0.42** — camera-safe by construction, and it removes luminance where you want the frame quiet |
| 20 | ordered dither | `printpass.js:174-178` | KEEP 0.35 — pure ALU, dark end |
| 21 | paper grain | `printpass.js:180-186`, multiplicative (`c *= 1 - (g-0.5)*0.20*uGrain`) | KEEP at **0.22** — can only darken, but it is a print cue sitting on a face at this range |
| 22 | palette levels | `uLevels`, SPLASH only (7, `settings.js:125`) | **0.** Tone-snapping a close-up figure destroys form |
| 23 | vibrance / saturation | `printpass.js:188-203` | vibrance **0.28**, saturation **−0.06** — a small global desaturation gives the additive VFX somewhere to go before they clip. SPLASH already ships −0.05 |

### 2.3 The DOM layer

| # | effect | site | geometry | verdict |
|---|---|---|---|---|
| 24 | `flashScreen` / `.hitflash` | `hud.js:1760-1765` | `inset:0`, `mix-blend-mode:screen`, **peak opacity 0.5** | **CUT ENTIRELY.** §10.1 |
| 25 | `.hitarc` | `hud.js:1543-1557` | a **360px disc** centred *on* `min(W,H)*0.5` from screen centre (`hud.js:1549-1552`) — so ~180px reaches inward | **Rebuild as an annulus sector.** §10.2 |
| 26 | `.danger` low-HP vignette | `hud.js`, CSS `hud.styles.js:11` | `radial-gradient(… transparent 56% …)` | **KEEP AS IS** — the centre 56% is fully transparent. Already correct |
| 27 | `.vignette` | `hud.styles.js:5` | `transparent 52%` → `rgba(0,0,0,.62)` | **KEEP** — corners only, and it darkens exactly where light is allowed to spill |
| 28 | `damageNumber` / `.dmg` | `hud.js:1768-1791` | `font-size = min(38, 18 + num*0.45)`, anchored at **`worldPos.y + 7`** (`hud.js:1772`) | **OFF BY DEFAULT.** §10.3 |
| 29 | `.kobanner` | `hud.js:1558+`, CSS `hud.styles.js:12-13` | 118px type at `top:34%` | SHRINK to 84px, `top:24%`. Fires only when someone is already down — polish |
| 30 | `.announce` | CSS `hud.styles.js:165-166` | 54px at `top:20%` | KEEP, move to ~14% |
| 31 | **comic SFX lettering** | `comic.js:230-241`, placement `comic.js:329-357` | `font-size = round(32 · (0.75 + power·0.55))` = 24–42px; `.burst` backing; layer `z-index:26` | **KEEP the layer, ADD A CENTRE EXCLUSION.** §11 |
| 32 | `.paused` blur | `hud.styles.js:157` | `inset:0` | KEEP — not a combat effect |

---

## 3. RULE ONE — SIZE IS A CLAMP AGAINST THE LIVE FRAME, NEVER A CONSTANT

### 3.1 Why a clamp and not a rescale

Three properties, and all three matter:

1. **In the city it is provably a no-op**, because the flag is off. That is the §47 evidence
   standard (`POWERWORLD.md` §15, and manual §47's closing block) — *the city game is unchanged and
   it is measured, not claimed.*
2. **At long framing in PowerWorld it is also a no-op**, because the frame is 137u and nothing in
   `vfx.js` is authored that large. It only bites where the defect is.
3. **A clamp cannot make an effect bigger.** A rescale-to-fraction would *inflate* every spark at
   long range, which is the opposite failure and would be discovered a week later.

### 3.2 The API

```js
// vfx.js — one helper, six call sites.
// `closeFrame` is set true by powerworld setup and false by clearTransients. Nothing else sets it.
_cap(pos, worldSize, frac) {
  if (!this.closeFrame) return worldSize;
  return Math.min(worldSize, frac * this.world.frameHeightAt(pos));
}
```

### 3.3 The ladder — derived from the fighter, not picked

**A hit spark must be smaller than the thing it lands on.** A fighter is 9.6u = **29.2% of the clinch
frame**. Everything below is a fraction of the fighter, converted to a frame fraction:

| tier | × a fighter's height | **frame fraction** | at the clinch frame | max additive layers over the centre box |
|---|---|---|---|---|
| jab / chip spark | 0.30 | **0.088** | 2.9u | 1 |
| cross / mid spark | 0.45 | **0.131** | 4.3u | 1 |
| haymaker / heavy spark | 0.62 | **0.181** | 5.9u | 2 (star + ring) |
| blast core / kernel | 1.00 | **0.292** | 9.6u | 1 |
| blast shell | 2.20 | **0.640** | 21.0u | 2 |
| pressure ring (flat) | 3.10 | **0.900** | 29.6u | 1 |

A haymaker star goes from **69% of frame height to 18%** — a 3.8× reduction — and at the far framing
the clamp does not engage at all, so the same punch seen from 90u away is exactly what it is today.

### 3.4 The edits, exactly

| site | today | in close-frame |
|---|---|---|
| `vfx.js:262` `impactStar` | `s.scale.setScalar(size * (0.3 + easeOut(k)*0.9))` | size passes through `_cap(pos, size, frac)`; `frac` from the ladder via a new `opt.tier` |
| `vfx.js:272` white star | `impactStar(pos, 7 + power*6, '#ffffff', 0.16)` | `frac 0.181` for `power ≥ 1.6`, `0.131` for `power ≥ 0.9`, else `0.088` |
| `vfx.js:273` accent star | `if (power > 0.9) impactStar(…)` | **skip when `closeFrame`** — the two-layer rule |
| `vfx.js:274` flash | `flash(pos,'#ffffff', 3 + power*3, 0.09)` | `_cap(pos, size, 0.05)` — the mesh shrinks; **the borrowed light is untouched** |
| `vfx.js:278` ring | `ring(pos, {r1: 5 + power*5, …})` | `r1 = _cap(pos, 5+power*5, 0.181)`; stays camera-facing |
| `vfx.js:96` explode shell | `shell.scale.setScalar(radius*(0.3 + k*1.1))` | cap the peak at `0.64` of frame |
| `vfx.js:110-115` kernel | always | **skip** when `camera.position.distanceTo(pos) < radius * 1.4`; else cap `0.292` |
| `vfx.js:117` pressure ring | `r1: radius*1.7` | cap `0.90`, stays `flat: true` |
| `vfx.js:137,145` dome | always | **skip entirely** when `closeFrame` (§2.1) |
| `vfx.js:155` lightning | `radius: maxR*0.7, height: 10+power*8` | both scaled by `min(1, frameHeightAt(pos)/156)` |

⚠ `impactStar` also carries **`depthTest: false`** (`vfx.js:262`, with the comment *"billboard, draws
over everything"*). At 260u that is a convenience — a hit behind a wall still reads. In third person
**the nearest object to the camera is the player's own back**, so the star paints straight over your
own fighter. In close-frame it takes `depthTest: true` with `renderOrder` raised, so it still wins
ties against the fighter it lands on and loses to anything in front of the lens.

---

## 4. RULE TWO — THE SHAKE IS A RING-DOWN ON A FIXED AXIS

This is the first thing to build. Every other impact rule adds or removes a *pixel*; this one is the
only one that adds *force*, and it is where the work removed from rules 24, 2, 4 and 9 goes.

### 4.1 What stays exactly as it is

- `world.shake(a)` accumulates with the clamp at 8 and honours `shakeMult` — `world.js:1298`,
  `settings.js:160`. Untouched: the Options slider must keep working.
- The decay `this._shake *= Math.exp(-7 * dt)` — `world.js:2316`. That is the **amplitude envelope**
  and it is correct (4% of peak at 0.46s).
- `follow()`'s world-space shake — `world.js:1346-1349`. **The city does not change.**

### 4.2 What changes — the carrier and the mapping

Replace `world.js:2317-2318` with an angle applied about a fixed screen-plane axis:

```js
// PW_FX in core/util.js, gated on camMode === 'chase'. See §13.
this._shake *= Math.exp(-7 * dt);
this._shakeT += dt;
const A = Math.min(PW_FX.shakeMaxDeg, this._shake * PW_FX.shakeDegPer) * (Math.PI / 180);
const t = this._shakeT;
const w = PW_FX.oct1Mix * Math.sin(TAU * PW_FX.oct1Hz * t)
        + (1 - PW_FX.oct1Mix) * Math.sin(TAU * PW_FX.oct2Hz * t + 1.9);
// the axis is stamped once per EVENT, in the camera's own screen plane
const ang = A * w;
const jx = this._shakeAx.x * ang * D, jy = this._shakeAx.y * ang * D, jz = this._shakeAx.z * ang * D;
```

where `D` is the **true eye→look distance** — `hypot(camPos − camTarget)` — not `d`, and
`_shakeAx` is a unit vector in the plane perpendicular to the view.

**Stamp the axis on the event, not on the frame.** In `shake(a)`, when `a >= 0.5` (a real blow; the
0.12 rumble at `melee.js:77` and the 0.1 beam tick at `projectiles.js:966` are texture, not events):

```js
const th = Math.random() * TAU;
this._shakeAx = right·cos(th)·1.0 + up·sin(th)·0.55;   // biased horizontal — a punch shakes sideways
this._shakeT  = 0;                                      // a second blow restarts the ring-down
```

### 4.3 ⚠ THE FREQUENCIES ARE BOUNDED BY 40 Hz, AND THAT IS THE DERIVATION

`pw-impact.md:262` proposes ~26 Hz and ~9 Hz. **26 Hz is unusable.** The Steam Deck path this
dimension exists for tells players to lock **40 Hz**, and `world.js` carries a whole governor built
around that (`POWERWORLD.md` §14 — *"the governor inverted at 40 Hz, and the Steam Deck guide tells
players to lock 40 Hz"*). A 26 Hz oscillation sampled at 40 Hz aliases to 14 Hz; at 30 Hz it aliases
to 4 Hz. The shake would be a *different effect* on different hardware.

The real budget is the **per-frame angular step**. For a two-octave carrier of peak amplitude `A`,
the worst step at refresh `R` is

```
step_max ≈ A · 2π · (m·f1 + (1−m)·f2) / R
```

Set the step budget at **1.35°/frame at 40 Hz** — 13% of the centre box's vertical half-extent
(§1.2), so the opponent never appears to jump more than a seventh of the box between frames.

| dial | value | why |
|---|---|---|
| `oct1Hz` | **12** | 3.3 samples/cycle at 40 Hz, 5 at 60. The crack |
| `oct2Hz` | **4.5** | 8.9 samples/cycle at 40 Hz. The body of the blow, and it carries most of the amplitude |
| `oct1Mix` | **0.30** | the fast octave must be the *small* one, or the step budget is spent on it |
| `shakeMaxDeg` | **1.25** | → step 1.33°/frame at 40 Hz, 0.88° at 60. Inside budget on both |
| `shakeDegPer` | **0.18** | saturation at `_shake = 6.94` (see the ladder below) |

**The resulting ladder** (`_shake` accumulates within a frame, so these are the real stacked totals):

| event | shake booked | total | peak angle |
|---|---|---|---|
| blocked jab (`melee.js:257`) | 0.35 | 0.35 | 0.06° |
| jab (`melee.js:261` 0.6 + `vfx.js:284` 1.05) | 1.65 | 1.65 | **0.30°** |
| cross (`melee.js:261` 1.5 + `vfx.js:284` 2.1) | 3.60 | 3.60 | **0.65°** |
| guard crush (`melee.js:125`) | 1.60 | 1.60 | 0.29° |
| throw (`melee.js:220` back) | 1.70 | 1.70 | 0.31° |
| **haymaker** (`melee.js:151` 2.6 + `vfx.js:284` 2.4) | 5.00 | 5.00 | **0.90°** |
| explosion r16 p1.4 (`vfx.js:123`) | 1.58 | 1.58 | 0.28° |
| tier-up (`game.js:2559` 1.8 + explode 1.86 + shockwave 2.4) | 6.06 | 6.06 | 1.09° |
| **beam overpower** (`projectiles.js:1090` 2.3 + explode 2.14 + shockwave 2.7 + impact 2.4) | 9.54 | **8.0** (clamp) | **1.25°** |

Dynamic range jab → overpower: **4.2×**, against today's 4.0× *with everything from a cross upward
already flat at the ceiling*. The top of the ladder is now reachable only by genuinely stacked
events, which is what a ladder is for.

⚠ **Amplitude is the one number here that wants a human.** The maths fixes the units, the axis, the
carrier and the sampling. Whether 1.25° peak *feels* like a punch is a screenshot-and-video question
and nobody has looked at it — see §12.6 and the ring's own lesson (`POWERWORLD.md`: *"the screenshot
caught what six green assertions could not"*).

---

## 5. RULE THREE — `punch()` BECOMES AN FOV KICK, AND STOPS LEAKING

### 5.1 The shape

`chase()` currently damps one FOV value toward the speed target (`world.js:2248`). Split it, so the
two gestures cannot fight:

```js
// speed ride — unchanged rate
this._chaseFovBase = damp(this._chaseFovBase ?? 58, 58 + k * 16, 4, dt);
// the kick — eases home at 3.5, the SAME rate follow() eases `frustumTarget` home (world.js:1338),
// so the identical gesture costs the identical time in both cameras
this._fovKick = damp(this._fovKick ?? 1, 1, 3.5, dt);
this._chaseFov = this._chaseFovBase * this._fovKick;
```

and `world.js:1299` branches:

```js
punch(z) {
  if (this.camMode === 'chase') { this._fovKick = Math.min(this._fovKick ?? 1, z); return; }
  this.frustumTarget = Math.min(this.frustumTarget, this.frustum * z);
}
```

The early return is what fixes §0.3's leak: `frustumTarget` is never written while the chase camera
is up, so the city comes back exactly as it left.

**Fast in, slow out — and that asymmetry is deliberate.** `Math.min` sets the kick *instantly* (0
frames to peak); `damp(…, 3.5, dt)` returns it over τ = 0.286s. `openjk.md:2260-2268` (§7.7) makes
the general point and warns that `damp()` is symmetric by construction: *"a power that ramps its
frame in over ~1s and snaps back in ~0.5s reads as ending, where a symmetric ease reads as
drifting."* A **punch is the mirror image** — it snaps in and eases out — and `Math.min` + `damp` is
exactly that envelope with no new machinery.

### 5.2 What the existing `punch()` values become

| site | z | FOV 58 → | Δ | reads as |
|---|---|---|---|---|
| `projectiles.js:1090` overpower | 0.62 | 36.0° | −22.0° | a hard shove into the frame |
| `game.js:2559` tier-up | 0.70 | 40.6° | −17.4° | |
| `melee.js:125` guard crush | 0.70 | 40.6° | −17.4° | |
| `melee.js:220` throw | 0.72 | 41.8° | −16.2° | |
| `melee.js:262` cross | 0.80 | 46.4° | −11.6° | |
| `melee.js:158` haymaker | 0.90 | 52.2° | −5.8° | a 10% dolly-in |
| `game.js:2526` KO | 0.90 | 52.2° | −5.8° | |

⚠ **0.62 is too much for a perspective camera and the table is why this must be checked, not
shipped.** A 22° FOV collapse in one frame is a lens change, not a punch, and it will read as a
glitch. Two options, and the second is better: (a) hand-retune eight call sites; (b) **compress in
one place** — `_fovKick = min(_fovKick, 1 - (1 - z) * PW_FX.punchK)` with `punchK = 0.45`, which maps
0.62 → 0.829 (−9.9°) and 0.90 → 0.955 (−2.6°), preserving the *ordering* every call site authored
while halving the swing. One dial, twenty-four call sites untouched, and the ranking they express
survives. That is the same discipline `PW_KB` used for knockback (`core/util.js:89-92`).

---

## 6. RULE FOUR — DO NOT TOUCH THE LIGHTS. (A correction to the research.)

`pw-impact.md:391-408` (§4d) argues that pooled-light intensity must be scaled by distance-to-camera
in PowerWorld: *"at 260u that is nothing; at 2u from a fighter's chest it is ~1.5."*

**That is wrong, and acting on it would be a real risk for no gain.** A `PointLight` illuminates
*surfaces*, and the distance that matters is **light-to-surface**, which is identical in both
cameras. `flash()` at `vfx.js:69` borrows `intensity 6, distance = size*6`; a fighter 2u from that
flash receives the same illuminance in the city as in PowerWorld. Nothing about the camera enters
the calculation. What changes is only that you *see* the lit fighter larger.

**Rules:**

1. **No PowerWorld light changes.** Not intensity, not count, not `.visible`.
2. The fixed pool of 14 `PointLight`s (`vfx.js:44-50`) stays fixed, always in the scene, always
   `visible = true`. `borrowLight`/`returnLight` (`vfx.js:57-63`) drive **intensity only**;
   exhaustion **steals the dimmest** rather than growing the pool.
3. ⚠ Every rule in this document must be implementable **without changing the visible light count.**
   Measured cost of breaking that once: **+152 programs in 4 seconds, a 400 ms freeze**
   (CLAUDE.md, THE LIGHT-COUNT LAW). PowerWorld already honours it — `POWERWORLD.md` §14 records the
   crossing verified at **19 → 19 lights**. Do not be the change that moves it.
4. This is also the argument for §3.4's choice to **shrink the flash mesh but keep the flash call**:
   the mesh is the problem, the light is not, and cutting the call would silently remove a light
   source that has always been there.

### 6.1 Bloom — what actually changes, stated honestly

`UnrealBloomPass(res*0.5, 0.66, 0.6, 0.8)` sits **before** `OutputPass` (`world.js`), so its 0.8
threshold is against **linear HDR**, and every `vfx` primitive is
`MeshBasicMaterial({ blending: AdditiveBlending, depthWrite: false })` (`vfx.js:5`) at opacity
0.85–0.95. Four of them on one pixel — which `impact()` does by construction — reaches ~3.6 linear,
**4.5× the threshold**, and `ACESFilmicToneMapping` at `exposure 1.28` maps that to essentially 1.0:
pure white, no shape, no silhouette.

⚠ **The per-pixel value is camera-independent. The AREA is not.** At ortho the four-layer overlap
covers a few thousand pixels; at the clinch frame it covers most of the frame, and a 0.6-radius blur
at half resolution then spreads that across everything. So the fix is not "less bright" — it is
**fewer overlapping layers and smaller ones**, which is §3.

The precedent is in this repo, at `baseroom.js`: *"at 0.85 the gold core accent bloomed through the
composer and washed out the whole corner of the base — an emissive floor panel is a FLOOR, not a
light source. No assertion catches a blowout; only the screenshot does."* That was a **static
emissive inlay at 200u+**. This is additive geometry at 30u.

**The two hard numbers:** at most **two** additive layers may overlap the centre box at any instant,
and no single additive layer over the centre box may exceed opacity **0.7** (today's stars are 1.0,
`vfx.js:262`).

---

## 7. RULE FIVE — PARTICLES: ONE UNIFORM, ONE CLAMP, AND THE CAP IS DERIVED

`particles3d.js:14`:

```glsl
gl_PointSize = aSize * (300.0 / -mv.z);
```

⚠ **A perspective divide has never meant anything on an orthographic camera.** At `camDist = 260`
(`world.js:53`) the factor is a near-constant **1.154**, so an authored `aSize` of 2.8 has always
drawn ~3.2 device pixels. Under the chase camera the divide starts doing its actual job:

| framing | eye→subject | factor `300/z` | vs ortho | `aSize 2.8` | `aSize 4.5` (explode smoke) |
|---|---|---|---|---|---|
| ortho | 260 | 1.15 | 1.0× | 3.2 px | 5.2 px |
| clinch | 29.6 | 10.1 | **8.8×** | **28 px** | **46 px** |
| mid | 50.5 | 5.94 | 5.1× | 17 px | 27 px |
| cap | 91.0 | 3.30 | 2.9× | 9.2 px | 15 px |

`explode()` spawns **10** of the 4.5s plus up to **54** sparks (`vfx.js:119-121`, `26 + power*14`).

**The clamp, and the derivation of its cap.** A pixel cap — not a `uMaxK` multiplier — because the
quantity that must be bounded is *screen area*:

```glsl
uniform float uMaxPx;                       // 0 = unbounded (the city)
gl_PointSize = aSize * (300.0 / -mv.z);
if (uMaxPx > 0.0) gl_PointSize = min(gl_PointSize, uMaxPx);
```

`uMaxPx = 0.035 · drawingBufferHeight` — **3.5% of frame height**, = 38 px at 1080p.

The derivation: at the clinch frame a fighter is 29.2% of frame height; a single additive spark
should never exceed **1/8 of a fighter**, which is 3.65% of the frame. Round to 3.5%. That caps the
worst particle in the game (`explode` smoke, 46 px) at 38 px and leaves **everything smaller
untouched**, so the depth cueing that makes a near spark read as near is preserved in full. In the
city `uMaxPx` is 0 and the shader is byte-identical to today's behaviour.

**Also cap counts in close-frame:** `explode()`'s `26 + power*14` → **`min(20, 26 + power*14)`** when
each spark is 9× the area it was authored at. `vfx.js:119`.

Supporting facts, so nobody re-derives them: the pool is one `THREE.Points` of max 6000
(`particles3d.js:29-30`) with `frustumCulled = false`, uploading only used slots via
`addUpdateRange` — **the upload is already well behaved and count is cheap.** The cost here is purely
fragment area and additive blending.

⚠ Unrelated, pre-existing, and it will show here: particles bounce off a hard `y = 0` plane, not
`world.heightAt`. In a flight dimension whose floor is a rock disc that is wrong, but it is not this
pass's problem and it is not new.

---

## 8. RULE SIX — THE INVERTED IMPACT FRAME IS THE PRIMARY HEAVY TELL. KEEP IT EXACTLY.

`printpass.js:213-214`:

```glsl
// ---- 9. THE IMPACT FRAME. One inverted frame on connect. Costs nothing and is thirty years old.
if (uInvert > 0.001) c = mix(c, vec3(1.0) - c, uInvert);
```

Driven by `impactFrame(frames = 1, strength = 1)` at `printpass.js:276-280`, fired from the damage
choke point at `game.js:2753-2756`:

```js
const heavy = amount >= (target.maxHp || 100) * 0.14 || opts.heavy || opts.haymaker;
if (heavy && S.fxImpact !== false) this.world.print.impactFrame(1, Math.min(1, 0.7 + amount / 260));
```

**Why it helps where a wash hurts.** A white wash *adds* luminance uniformly, so it destroys exactly
the information the frame carried — for one or two frames your opponent is gone, replaced by nothing.
An inversion *preserves* every edge and every silhouette; it changes only the sign. The drawing is
still there, still positionally exact — it has flipped. `printpass.js:271-273` says it: *"Held for
two it reads as a flash effect; held for one it reads as the drawing itself changing."* At a chase
camera, where the frame *is* two figures, that distinction goes from valuable to essential.

It is also free: one `mix` on a pass already running, **zero texture fetches** (`settings.js`
`FETCH_BUDGET` counts ink 8, tilt 8, everything else 0), no new light, mesh or DOM node — and
`printpass.js` states *"NOTHING HERE TOUCHES LIGHTS"*, which is another reason to move work from the
3D layer into the post pass.

### 8.1 Four traps, all live

1. **It must tick AFTER the render.** `world.js:2165` `this.composer.render();` then `world.js:2171`
   `if (this.print) this.print.tick(sdt);`, with the reason at the call site. Measured evidence of
   getting it backwards (CLAUDE.md, THE PRINT PASS): mean screen brightness **93.6 → 93.6 → 93.6**,
   *"the punch landed and nothing happened"*; after the fix **94.3 → 160 → 94.3, exactly one frame.**
   A boolean flag would have reported "working" the whole time.
2. **It counts FRAMES, not seconds.** `_invT` is decremented once per tick (`printpass.js:307`) and
   `impactFrame` takes `frames`. ⚠ This matters *more* on the Deck, not less: at a locked 40 Hz one
   frame is 25 ms. That is the intended behaviour — the effect is one *drawn* frame regardless of
   refresh — and it is exactly why a seconds-based timer would be skipped entirely at 30 fps.
   **Never make it 2 in PowerWorld.**
3. **`enabled` is re-derived every tick** from whether anything is on (`printpass.js:261-262`,
   `:309`), and `impactFrame` sets `enabled = true` itself (`printpass.js:279`) — so the frame works
   with every other dial at zero. Keep `fxImpact` (`settings.js:82`) as the only switch and keep it
   on.
4. ⚠ **It competes with the additive star until §3 lands.** Both fire on the same frame from the same
   event; inverting a blown-out white star produces a black blob where the contact was. Once the star
   is clamped to 0.18 of frame this resolves itself — but it means **§3 and §8 must be measured
   together**, not separately.

### 8.2 What PowerWorld should change: nothing in the effect, one thing in the gate

The gate is `amount >= maxHp*0.14 || opts.heavy || opts.haymaker`. Three PowerWorld-only heavy events
should be checked against it rather than assumed:

- **`game.hitFlung`** (`game.js:927`) — shooting a thrown monolith out of the air is a heavy beat and
  currently carries no `heavy` flag.
- **`intercept`** (manual §46) — the teleport catch is the dimension's signature technique.
- **`powerworld.js:410`** — a spire shattering.

⚠ Do **not** widen the gate by lowering 0.14. `game.js:2751-2752` states the rule and it is right:
*"Blocked hits never get one. The frame means CONNECTED; spend it on a blocked jab and it stops
meaning anything within about four seconds of a real fight."* Add `heavy: true` at the three sites
instead — one flag each, at the site that knows it is heavy.

---

## 9. RULE SEVEN — SPEED LINES: ALREADY THE BEST-BEHAVED EFFECT, AND THE REASON IS AN ACCIDENT WORTH MAKING DELIBERATE

`printpass.js:165-172`:

```glsl
vec2 d = vUv - uSpeedC;
float rad = length(d);
float streak = pow(abs(sin(ang*34.0 + hash(…)*6.28)), 8.0);
float reach = smoothstep(0.16, 0.62, rad);        // never over the middle of the action
c = mix(c, vec3(1.0), streak * reach * uSpeed * 0.55);
```

Fired at `game.js:2757-2760`, on the same heavy gate, and only when a human is target or source —
and `uSpeedC` is the **impact point**, not screen centre.

⚠ **`rad` is raw UV, not aspect-corrected — and that is what makes the exclusion cover the centre
box.** A radius of 0.16 in UV space maps to an ellipse of 16% of *width* horizontally and 16% of
*height* vertically. The centre box is ±12% width × ±16% height. So the exclusion matches the box's
vertical extent exactly and **over-covers it horizontally**. That is a happy accident of using
un-corrected UV, and it should be turned into an asserted invariant (§12, test 7) before somebody
"fixes" the aspect ratio and silently opens the centre.

**Changes:**

- shader mix `0.55` → **0.40**. ⚠ Note the frame-ratio argument in §0.1 **does not apply here** —
  this is a screen-space effect and its size is unchanged by the camera. The only real difference is
  that the background is now sky and rock rather than a detailed city, so white streaks have far less
  to compete with. 27% is a background-contrast correction, not a units correction.
- the call-site amplitude `min(1, 0.45 + amount/200)` (`game.js:2759`) stays. It is the one part of
  the effect that scales with the blow.
- `dur` 0.2s with `k*k` decay (`printpass.js:302-306`) stays. **Frames to peak: 0** — it is at full
  strength on the frame of the hit and gone in 12 frames at 60 Hz, 8 at 40.

---

## 10. RULE EIGHT — THE DOM LAYER

### 10.1 `flashScreen` is CUT in PowerWorld — all 12 sites

`hud.js:1760-1765` writes `opacity: 0.5` on a `mix-blend-mode: screen` element at `inset: 0`. **A
full-viewport 50% screen-blend wash is the definition of screen fill**, and it is precisely what the
impact frame replaced for the haymaker — `melee.js:153-155` says so at the site:

> *"THE FLASH IS THE PRINT PASS'S ONE INVERTED FRAME NOW, not a white wash over the whole screen.
> A wash hides the thing you just did; an inverted frame IS the drawing changing."*

The job was done for the haymaker and never finished. The remaining sites, every one of which
**already has a shake, a sound and a banner**: `melee.js:126` GUARD CRUSH · `melee.js:222` throw ·
`game.js:2269` SLAM · `game.js:2226`-family SECOND WIND · PARRY · LAST STAND · `entity.js` STAY DOWN
· `abilities.js` ×2 · `projectiles.js` · `systems.js` · `hud.js:1952` · `hud.js:840`
`tutorialStepDone`.

Implementation, one line and no call-site edits: `flashScreen()` early-returns when
`this.game.ms && this.game.ms.chaseCam`.

### 10.2 `.hitarc` becomes an annulus sector

`hud.js:1543-1557` computes the bearing correctly and then draws a **360px disc** whose *centre* sits
on `min(W,H)*0.5` from screen centre — so roughly 180px of it reaches inward, and nothing in
`PHONE_CSS` scales it. On a 375px short edge it comes within ~8px of dead centre.

| property | today | spec |
|---|---|---|
| shape | 360px disc | **annulus sector** |
| outer radius | `min(W,H)*0.5` (`hud.js:1549`) | unchanged |
| inner radius | — | **`outer − 90px`** — nothing renders inside |
| angular width | 360° | **46°**, centred on the bearing already computed at `hud.js:1547` |
| peak alpha / fade | 0.5 / 0.55s, removed at 600ms | unchanged |
| max concurrent | 6 (`hud.js:1556`) | **4** — five directions at once is not information |

⚠ **`sp.behind` becomes load-bearing.** `hud.js:1548` flips the bearing by π when the source is
behind the camera. At ortho that almost never fired; in third person **most hits from behind will be
behind the camera**, and that is the exact case this indicator exists for. It is already correct —
do not remove it while rebuilding the shape.

### 10.3 Damage numbers default OFF

`SETTINGS.dmgNumbers` already exists (`settings.js:65`), pushes to `hud.dmgNumbersOff`
(`settings.js:177`) and is honoured at the top of `damageNumber` (`hud.js:1769`).

1. PowerWorld **defaults it false.** The combo counter, the health bar and the three-layer recorded
   punch already say what happened.
2. If the player turns it on: cap at **16px** (the existing `tag` size, `hud.js:1780`) and anchor to
   the §10.2 ring, never to the target.
3. ⚠ **`worldPos.y + 7` (`hud.js:1772`) is a WORLD-unit offset.** 7u is **21% of the clinch frame
   height** — the number appears a fifth of the screen above the fighter and flies off the top as
   often as not. In close-frame it must become a screen-space offset of about **−28px**. Same class
   of bug as every world-unit size in §2.1.
4. Keep the 48-element cap (`hud.js:1770`, `:1790`) and the `_blkFxT` throttle (`game.js:2803-2805`).

---

## 11. RULE NINE — COMIC SFX LETTERING KEEPS ITS LAYER AND GAINS A CENTRE EXCLUSION

The lettering is right for this game and it was tuned once already — `comic.js:236-238`: *"46px BASE
WAS A THIRD OF THE SCREEN once a ten-letter word was scaled by power. A sound effect is punctuation
on a panel, not the panel."* Current size `round(32 · (0.75 + power·0.55))` = **24–42px**, life 0.95s,
fired at `game.js:2768-2779` on `amount >= 14 || opts.haymaker`, within 260u of the player, rate
limited to one per 0.42s — *except a haymaker always letters* (`game.js:2762-2765`, and that rule is
correct and must survive).

**The defect:** placement (`comic.js:329-357`) is a real nine-candidate search scored purely by how
much *`taken`* it covers, and `taken` contains only balloons and other SFX. `_safe()`
(`comic.js:246-256`) is HUD rails only — `x1 = W - 258`, `y1 = H - 118`. **There is no notion of the
centre at all.** So `KRAKA-DOOM!` with a red 16-point burst lands dead centre on the opponent.

**The fix is two lines and it uses the machinery already there:**

1. In `update()`, before any placement, push the centre box into `taken`:
   `taken.push({ x: W*0.38, y: H*0.34, w: W*0.24, h: H*0.32 })` when `chaseCam` is on.
2. ⚠ **Add two lateral candidates wide enough to clear it.** The existing offsets top out at
   `±fw*0.62` ≈ 75–186px, which cannot clear a 230px half-width box. Add
   `[±(W*0.12 + fw/2 + 12), 0]` to the candidate list at `comic.js:344-345`.

The search degrades correctly on its own: `if (cover < bestCover) { …; if (!cover) break; }`
(`comic.js:352`) tries the natural spot first and takes the least-covering candidate when every
option is blocked — so a hit that happens dead centre with no clear gap still gets its word, just as
far out as the panel allows.

⚠ Do **not** move `#comicLayer` behind the HUD or reduce the font. The layer is one of the few things
in this project that reads *better* close up — a 32px word beside a 29%-of-frame fighter is exactly
comic-panel proportion, where at ortho it was punctuation on a wide shot.

---

## 12. RULE TEN — HITSTOP, AND A DEFECT NOBODY HAS WRITTEN DOWN

### 12.1 The law, restated because it is the easiest one in the project to break

`entity.js:701`:

```js
this.hitFlash = 1; this.hitstop = Math.max(this.hitstop, opts.hitstop ?? 0.04);
```

⚠ **`??`, NEVER `||`.** `entity.js:696-700` states why: sustained sources — beams, cones, lifedrain,
DoT ticks — pass `hitstop: 0` *deliberately*. With `||` that meaningful zero became 0.04 and was
**re-armed every frame**, so anything under a beam sat in permanent hitstop: no physics, no actions,
frozen animation. That was the "shoot the training dummy and it freezes" report and, worse, it made
every beam an infinite stunlock. The same care applies to any future hit option where 0 is meaningful.

### 12.2 The current values, and why they are already right

| event | victim | attacker | site |
|---|---|---|---|
| default (any unspecified hit) | 0.04 | — | `entity.js:701` |
| blocked, non-DoT | 0.03 | — | `entity.js:675` |
| jab | 0.07 | 0.042 | `melee.js:250, 255` |
| cross (`fin`) | 0.14 | 0.126 | `melee.js:250, 255` |
| blocked jab | 0.07 | **0.09** | `melee.js:257` — deliberately punishable |
| straight blocked | 0.07 | 0.10 | `melee.js:128-129` |
| guard crush | 0.12 | — | `melee.js:123` |
| **haymaker** | **0.20** | **0.19** | `melee.js:142, 149` |
| throw | **0** | 0.08 | `melee.js:211, 218` — *"hitstop 0 so the body flies NOW"* |
| slam | 0.10 | — | `entity.js:814` |
| beam overpower | 0.16 | — | `projectiles.js:1089` |

**Do not change these for PowerWorld.** Hitstop is *time*, not pixels; it is camera-agnostic; and the
melee feel pass just tuned it (CLAUDE.md, THE MELEE FEEL PASS): *"THE ATTACKER'S OWN HITSTOP IS THE
WHOLE FEELING. A hit that stops the VICTIM reads as damage; a hit that stops YOUR OWN HAND reads as
force. It was 0.12 on a full haymaker, which is under two frames of a held pose."*

**One invariant is already true and must be asserted so it stays true:** *the attacker unfreezes
first, on every strike.* Haymaker 0.19 < 0.20, cross 0.126 < 0.14, jab 0.042 < 0.07. At a chase
camera you watch the victim **over the attacker's shoulder**, so if your own hand unfroze last you
would see your recoil before their flight. It holds today by 0.01–0.028s. Assert it (§13, test 5).

⚠ And note what hitstop costs in this dimension: `entity.js:1175` returns *before* physics, so at
PowerWorld's measured peak launch of **103.8 u/s** (manual §47) a haymaker's 0.20s defers **20.8u** of
flight. That is correct — it is the beat that sells the transfer of force, and it is why the launch
then reads as sudden — but it is worth knowing the number.

### 12.3 ⚠ THE DEFECT: HITSTOP FREEZES PHYSICS AND DOES NOT FREEZE THE POSE

`entity.js:818-819`:

```js
update(dt, game) {
  this.animT += dt;
```

`entity.js:1175`:

```js
if (this.hitstop > 0) { this.hitstop -= dt; this._animate(dt); this._sync(); return; }
```

The clock is advanced **before** the early return, and `_animate` is then called with the **full
`dt`**. Three consequences, all invisible at 260u and all visible at 30u:

1. **The gait keeps running.** `rc = Math.sin(this.animT * 12) * (moving ? 0.7 : 0.05)`
   (`entity.js:1716`) drives `legL/legR.rotation.x`, and `moving` derives from velocity — which
   hitstop does not change, because physics never runs. **A hit-stopped running fighter cycles their
   legs in place** for the whole freeze.
2. **Every damped pose interpolant keeps converging.** `_animate` uses `damp(…, dt)` throughout, so
   the punch pose *follows through* during the freeze that exists to stop it.
3. **The fist glow keeps ramping** — `p.armL/armR.children[2].material.emissiveIntensity`
   (`entity.js:1712-1713`).

This directly undercuts the one thing the melee feel pass identified as the whole feeling. At the
isometric camera a 0.19s pose drift on a 6%-of-frame figure is nothing. At the clinch frame the
figure is **29.2%** of the picture and the arm is the thing swinging.

**The fix is one argument:**

```js
if (this.hitstop > 0) { this.hitstop -= dt; this._animate(0); this._sync(); return; }
```

`_animate(0)` still writes every transform from current state — ground markers, `_sync`, the yaw —
but advances no clock and no damping (`damp(a, b, rate, 0) === a`). ⚠ **Verify before shipping**
that nothing inside `_animate` divides by `dt`; if something does, hold `animT` instead
(`if (this.hitstop <= 0) this.animT += dt;` at `entity.js:819`) and clamp the passed `dt` to a small
epsilon.

⚠ **This is a CITY change as well as a PowerWorld change**, and it should be treated as one: gate it
on nothing, measure it in both cameras, and expect the city to feel slightly punchier. If that is
unwanted, gate it on `f._chaseKb` — but the honest read is that the city has the same defect and has
simply never been close enough to see it.

**Measurable:** sample `parts.armR.rotation.x` and `parts.legL.rotation.x` on frames 0 and 11 of a
haymaker's hitstop. A frozen pose is a delta of exactly **0.000**. Today it is not.

---

## 13. THE LIMB THAT MATTERS FOR IMPACT — THE ARM

`pw-limbs.md` is the full plan. This section says only what *impact and feel* needs from it, and
corrects what is stale.

### 13.1 The finding, verified against the tree today

`figure.js` `mkArm` builds `upper`, `fore` and `fist` as **flat siblings of the shoulder pivot** at
fixed local offsets `y = −1.05 / −2.85 / −3.85`. There is **no elbow group and no wrist group**, and
every animation write in `_animate` is `p.armL/armR.rotation.x` or `.rotation.z` — at the pivot
(`entity.js:1632-1639, 1644-1645, 1648-1653, 1661-1667, 1672-1675, 1699-1700`).

**The arm is a straight rod hinged only at the shoulder.** The elbow exists in the ragdoll
(`ragdoll.js:232-233`, `cap(aL[0],'shL','elL'); cap(aL[1],'elL','haL')`), so **an arm bends only when
the fighter is dead.**

The leg, by contrast, is already three capsules with a real driven knee — `mkLeg` in `figure.js`
builds `thigh → knee (a real Group) → shin + kneeCap + boot`, and `_animate` drives both hip and knee
(`entity.js:1716-1725` area, final writes at the `legL/legR.userData.knee.rotation.x` line).
`pw-limbs.md:17-21` says this: *"a 2-part leg reads as a mannequin is out of date."*

### 13.2 ⚠ The impact-specific argument, which is stronger than "it looks like a mannequin"

`openjk.md:908-940` (§2.3) documents MP's `G_SaberAttackPower` (`codemp/game/w_saber.c:137`):
attacking power is **`style*2 + 1` plus one point for every `toleranceAmt` units the blade base
physically travelled since the last frame** — Strong gains a point every **8** units of hand travel,
Fast needs **24**, with Raven's own comment giving the reason: *"Otherwise fast would have more
advantage than it should since the animations are all much faster."*

`openjk.md:2204-2216` (§7.6a) draws the comparison directly:

> *"WWA's `momentumMult` (`melee.js:14`) reads `|vel|` of the **body**, stamped before the lunge.
> Those are different quantities: a fighter standing still and throwing a fast hook has body velocity
> ~0 and enormous hand velocity."*

**The elbow is the prerequisite for the single best available upgrade to momentum melee.** With a
rigid arm, hand travel is a fixed multiple of shoulder rotation and measuring it buys nothing new.
With an elbow, a *committed* swing and a *drifting* one produce genuinely different hand paths, and
`momentumMult` can read the real quantity. `_animate` already drives the arm meshes every frame, so
the fist's world position is available for free — store last frame's and take the delta.

⚠ **And take the per-strike tolerance with it**, or the fastest attack wins twice. `data/martial.js`
already gives jab, cross and power different frame data; the tolerance belongs in the same table
(`openjk.md:2213-2216`).

### 13.3 The three animation drivers that carry an impact

1. **The snap-straight on release.** The kick already does this — `entity.js:1644` sets
   `legR.userData.knee.rotation.x → 0.1` (straighten) on `strikeIdx === 2`. The elbow needs the
   mirror: coiled during `meleeCharge` wind-up (`entity.js:1697-1700`, which already drives
   `armR.rotation.x → 0.9 + ch*0.5` and the fist blaze at `:1701`), snapping to near-straight on the
   release frame. **That snap *is* the impact frame, in the animation.** A punch that arrives with a
   bent elbow has no arrival.
2. **A bent guard.** `entity.js:1648-1649` sets `armX.rotation.x → −1.9, .z → ±0.6`. A guard with
   straight arms is the mannequin in its most-looked-at pose, because guarding is when you are
   holding still and the camera is close.
3. **Opposite-phase swing in the run cycle.** The elbow bends against the shoulder swing (`rc` at
   `entity.js:1716`), which is what stops a run reading as a doll on a stick.

⚠ All new joint writes must sit **inside the existing precedence** at `entity.js:1657-1658` —
`combatPose = max(cast, punch, gS, gG, gR, _bowDraw, meleeCharge>0)` and
`flyArm = _flyPose * (1 − combatPose)`, i.e. **combat always beats flight** — or a guard will be
overridden by a hover pose.

### 13.4 What this costs, and the one rule that decides whether it ships clean

From `pw-limbs.md:614-656`: Phase A (the elbow) adds **0 meshes and 2 Groups**; the full plan adds
**+4 meshes and +6 Groups** per fighter against a measured 38–52 meshes today, a +9% mesh increase
and **+32 draw calls worst case** with 8 fighters live. Not material. The real cost is ragdoll CPU:
`_collide` runs **inside** the 12-iteration relaxation loop (`ragdoll.js`), so cost is linear in
particle count — **+27%** on that inner loop for +4 particles.

⚠ **The sleep threshold is an absolute SUM, not a per-particle average** (`ragdoll.js:121, 139`,
`energy < 0.03`). With 19 particles instead of 15 the same residual jitter reads **27% higher**, so
bodies settle later or never sleep — and a ragdoll that never sleeps pays the collision cost forever.
**Normalise it** (`energy / nParticles`, or scale the threshold by 19/15). `pw-limbs.md:586-591`
calls this *"the single most likely way the extension silently regresses performance"* and it is
right.

**The rule to write into `figure.js`'s header** (`pw-limbs.md:334-338`), which is the generalisation
of the kneeCap bug that §0.4 says is already fixed:

> Anything parented to a JOINT GROUP must be listed in the ragdoll's `driven` array, or re-parented
> onto a driven mesh. A joint group's transform is zeroed during ragdoll; a child that nothing drives
> collapses to the group origin.

⚠ **Contract A must break.** Inserting the elbow changes `arm.children[1]`. Seven sites, all small,
and they are enumerated at `pw-limbs.md:386-397`: `ragdoll.js:58-59` (`driven`), `ragdoll.js:56`
(`pivots`), `ragdoll.js:232-233` (the `cap`/`pin` chain), `entity.js:1701` and `:1712-1713` (the fist
glow), `figure.js`'s arm loop in `applyFrame`, and `systems2.js:119-131` (`updateElastic`). **Do not
leave `children[0..2]` "working by luck" via ordering** — convert the arm to the leg's `userData`
pattern and expose `parts.fistL` / `parts.fistR` so the two glow sites read as intent.

⚠ And one consequence to expect rather than discover: a weapon on the fist will hang off **three**
joints instead of one, so a 4.8u spear swings much further for the same shoulder rotation. Melee
reach is data (`data/martial.js`) so nothing breaks mechanically — but **the visual and the hitbox
will diverge more than they do now**, and the bow-draw pose (`entity.js:1672-1675`) and the
prone-cruise lead fist (`−2.95`, `entity.js:1661`) are hand-tuned against a rigid arm and will need
re-tuning.

---

## 14. RIM LIGHT — THE CHEAPEST SILHOUETTE SEPARATOR, AND IT IS DOING MORE WORK HERE

Rim is material-level (`figure.js` `applyRim`/`setRim`, driven by `world._rimK`, set at
`settings.js:172` from `SETTINGS.fxRim`, default **0.8** at `settings.js:83`, applied per fighter at
`entity.js:263`). PowerWorld's mannequin treatment sets it explicitly at `powerworld.js:341`:

```js
setRim(P, SETTINGS.fxRim == null ? 0.35 : SETTINGS.fxRim);
```

⚠ **0.35 is the wrong default *here*, and the reason is the mannequin treatment itself.** The stage
skins every fighter matte and pulls hero colour **30% toward bone** (manual §46) against **pale
sunlit rock and a saturated cyan sky** (`POWERWORLD.md` §14, the look pass). That deliberately
*reduces* the colour separation between fighter and background — so the rim is the only thing left
carrying the silhouette, and it should go **up**, not down. Proposal **0.9**.

Structural notes so this does not get broken:

- ⚠ **Inject always, drive by uniform, never toggle by re-injecting.** `onBeforeCompile` changes the
  program and swapping it recompiles — the same class of stall as the light-count law.
- ⚠ It needs `customProgramCacheKey` (`figure.js`, keyed to the single string `'wwa-rim'`) or three.js
  hands a rim material a program compiled without it and the rim appears on some fighters and not
  others. Because all rim materials share one key, **more meshes using them cost nothing**.
- ⚠ `parts._rimExtra` (`figure.js`) is iterated by `setRim` and **has no writer anywhere in `src/`**.
  It is precisely the hook for per-mesh cloned materials — the `glow.clone()` fists and boots never
  get rim today. If §13's new capsules clone a material, register the clone there. **Prefer shared
  materials** (measured 21.1 unique materials per fighter).
- **Rim cost is 0 texture fetches** (`settings.js` `FETCH_BUDGET`), so it survives every quality tier.

---

## 15. THE DIAL — `PW_FX`, one table, gated, exactly like `PW_KB`

`core/util.js:89-92` is the model, and its header states the property that makes it safe:

```js
// ⚠ EVERY READER GATES ON `f._chaseKb`, which only the powerworld mode sets. The city never reads it.
export const PW_KB = { kb: 2.2, launch: 1.45, drag: 0.5, window: 2.6, catchK: 52 };
```

Add beside it:

```js
// ⚠ EVERY READER GATES ON `world.camMode === 'chase'` (or `vfx.closeFrame`). The city never reads it.
// Live from the console: LSW.PW_FX.shakeMaxDeg = 2 takes effect on the next hit.
export const PW_FX = {
  // --- shake (§4)
  shakeDegPer: 0.18,  shakeMaxDeg: 1.25,
  oct1Hz: 12,         oct2Hz: 4.5,        oct1Mix: 0.30,   axisEvent: 0.5,
  // --- FOV kick (§5)
  punchK: 0.45,       punchHome: 3.5,
  // --- vfx size ladder, as fractions of frame height (§3.3)
  sparkJab: 0.088,    sparkMid: 0.131,    sparkHeavy: 0.181,
  blastCore: 0.292,   blastShell: 0.640,  pressureRing: 0.900,  flash: 0.05,
  kernelNear: 1.4,    // suppress the detonation kernel inside radius × this of the camera
  // --- particles (§7)
  ptMaxFrac: 0.035,   sparkCount: 20,
  // --- post (§9)
  speedMix: 0.40,
};
```

**Every one of these is a number this document derived, in one place, changeable live.** That is what
"give him a dial" means, and it is what made the knockback pass converge in one loop instead of five.

---

## 16. MEASURABLES — the numbers this pass must hit

| quantity | today | **target** | how to read it |
|---|---|---|---|
| peak angular camera displacement, haymaker | **2.04°** (RMS 1.18°) | **0.90°** | `camera.quaternion` angle vs the un-shaken orientation, sampled every frame |
| peak angular camera displacement, any event | 2.04° (saturated from `_shake ≥ 2.545`) | **≤ 1.25°** | same; assert the ceiling is never exceeded |
| shake dynamic range, jab → overpower | 4.0×, flat above cross | **4.2×, flat only above `_shake` 6.94** | the §4.3 ladder |
| max per-frame angular step @ 40 Hz | undefined (white noise) | **≤ 1.35°** | finite-difference the sampled orientation at `dt = 1/40` |
| camera POSITION deviation | 0 (look-point only) | **0.0u** — never move the eye | assert `camPos` equals the damped target exactly |
| frames to peak, shake | 1 (instant, random) | **1.4 @ 60 Hz** (`1/(4·f1)` = 20.8ms) | |
| frames to peak, FOV kick | n/a (no-op) | **0** — instant, home in τ = 0.286s | |
| frames to peak, impact frame | 1 | **1**, and exactly one | mean CENTRE luminance `L0 → ~(255−L0) → L0` |
| attacker hitstop, haymaker | 0.19s | unchanged (11.4 frames @ 60, 7.6 @ 40) | |
| attacker unfreezes before victim | true, by 0.01–0.028s | **invariant** | assert over every strike path |
| pose delta across a hitstop | **non-zero** (§12.3) | **0.000** | `armR.rotation.x`, `legL.rotation.x` at frame 0 vs frame 11 |
| largest additive layer over the centre box | 91% of frame height | **≤ 18%** | |
| additive layers over the centre box | **4** (`impact()`) | **≤ 2** | |
| largest particle | 46 px @ 1080p | **≤ 38 px** (`0.035 · H`) | |
| CENTRE pixels with `L > 235` | unmeasured | **< 2%** on every frame but the impact frame | |
| **silhouette delta in CENTRE** | unmeasured | **> 12** (0–255) through the worst-case sequence | §17 test 4 |
| visible light count across a crossing | 19 → 19 | **unchanged** | |
| `renderer.info.programs` growth after warm-up | 0 | **0** | |
| PowerWorld GPU frame @ 4K | 1.0 ms median, **1.2 p90** | **no regression** | `gl.finish()`, 40 samples, `autoReset = false` |
| PowerWorld sim | 0.224 ms/frame | **no regression** | render stubbed, 3000 frames batch-timed |
| CITY sim (control) | **0.679–0.680 ms/frame** | **identical** | the §47 evidence standard |

---

## 17. THE ACCEPTANCE HARNESS — `src/bench/pwimpact.js` → `LSW.pwImpactSuite()`

The claim to prove is **not** "the frame is dark." It is **"the centre of the screen still contains a
readable opponent."** Only the second cannot be gamed by turning everything down.

**Technique, all of it already paid for in this repo:**

- Sample the **drawing buffer**, in the **same task as the render**. The renderer is constructed
  without `preserveDrawingBuffer`, so a later call gets a blank canvas. A page screenshot is useless
  — it captures the DOM, which includes the HUD.
- `game.update(dt)` ends with `this.world.render()` (`game.js:3694`), which calls `composer.render()`
  (`world.js:2165`) then `print.tick(sdt)` (`world.js:2171`). So: call `game.update(dt)`, read pixels
  immediately on return, before yielding.
- ⚠ **Clear the scissor rect and viewport first.** The news crew renders a 320×180 POV scissored into
  the canvas corner; a manual render outside the frame loop inherits it and returns black except one
  corner (manual §42).
- ⚠ **Foreground the tab.** A hidden pane renders at 0×0, `renderer.info.render.calls === 1`, and
  `world._ema` reads ~98 ms. Sim numbers are meaningful there; **pixel numbers are not.**
- ⚠ **Do not stub `world.render`** for this suite. That stub is correct for sim-only timing and wrong
  here.
- ⚠ **Drive the gate.** Do not write `_shake` or `hitstop` directly — throw a real haymaker through
  `melee.js` and read the camera. Manual §46 and the CLINCH pass both record what happens otherwise:
  `facing` is a damped yaw, `controlPlayer` rewrites `aim` every frame, and `entities[1]` is the KMK 9
  camera operator, not the opponent.

**Metric.** Rec.709 luminance `L = 0.2126R + 0.7152G + 0.0722B` on the raw sRGB bytes the print pass
emits (it outputs tone-mapped sRGB — no conversion), over three regions: **CENTRE** (the box from
§1.2), **RING** (the rest of the inner 60%), **EDGE** (the outer 40%).

**Test 0 — the suite proves itself first.** Assert `renderer.info.render.calls > 1` and that the
buffer is not uniform, *before* asserting anything about it. (A previous pass in this repo shipped
`chips.every(...)` on an empty array — `[].every()` is true, so two assertions went green while
nothing rendered.)

**Test 1 — baseline.** 60 frames of a live PowerWorld fight, no hits landing. Record CENTRE mean
`L0` and p95. Everything below is relative, so the suite survives a re-grade.

**Test 2 — peak, per worst-case event.** haymaker connect · `explode` r16 at the target ·
`shockwave` under the player · a tier-up · a beam overpower · a KO. CENTRE mean must not exceed
`L0 + 40` for more than **one consecutive frame**, and must **never** exceed **200**.

**Test 3 — no blowout.** CENTRE pixels with `L > 235` stay under **2%** on every frame except the
single impact frame. This is the numeric form of the base's gold-corner failure, which no assertion
caught.

**Test 4 — SILHOUETTE DELTA (the one that matters).** Render each frame **twice in the same task**:
once normally, once with the opponent's figure group `visible = false`. Mean absolute luminance
difference inside CENTRE **is** "can I see my opponent." It must stay above **12** through the entire
worst-case sequence, **including the impact frame.** This is the metric that cannot be satisfied by
making the screen dark, and it is what gates the ink decision in §2.2.

**Test 5 — hitstop.** For every strike path: the attacker's `hitstop` ≤ the victim's; and
`parts.armR.rotation.x` / `parts.legL.rotation.x` deltas across the freeze are **exactly 0** (§12.3).

**Test 6 — the impact frame, asserted separately and exempted from 2 and 3.** CENTRE mean over three
consecutive frames reads `~L0 → ~(255 − L0) → ~L0`. Then re-run with `fxImpact` false and assert the
middle sample stays at `~L0` — which is what proves the test can see the effect at all.

**Test 7 — the centre is not in the DOM's way either.** After `hud.update()`, walk `#hDmg`, `#hHits`
and `#comicLayer` and assert **no element's bounding rect intersects the CENTRE box.** That is §10.2,
§10.3 and §11 as one assertion, and it is the cheap one to run on every commit. Add: assert the
speed-line exclusion covers the box (§9).

**Test 8 — the camera stays inside its own claims.** With `_shake` driven to its clamp of 8 through
`world.shake()`: angular deviation from rest never exceeds **1.25°**, per-frame step at `dt = 1/40`
never exceeds **1.35°**, and **position deviation is exactly 0.0u.** No pixels needed.

**Test 9 — the light count never moves.** Across the whole sequence the count of visible lights is
constant and `renderer.info.programs` grows by **0** after warm-up.

**Test 10 — the city is unchanged, and it is DRIVEN not reasoned about.** After a PowerWorld match:
`world.frustumTarget === 78` · `camMode === 'iso'` · the identical haymaker in a city duel still
travels **7.2u** · a 101 u/s launch still travels **16.0u** · `vfx.closeFrame === false` ·
`uMaxPx === 0` · `flashScreen` still fires · city sim still **0.679 ms/frame**. ⚠ **Every `||`
fallback added by this pass must be exercised here**, because that is where "provably identical"
actually lives (manual §47).

**And the screenshot is still required.** Every rule in this document exists because of something a
picture caught and an assertion did not — the ring four times too big, the venue's audience built
outside the frame, the base's gold corner, the black rubble, the training hall rendering near-black,
the stage that was verified as having "its own sky" and rendered a black void. Tests 0–10 are the
regression net. A human still has to look at the frame before it ships.

---

## 18. BUILD ORDER — as loops, each with a gate

**Loop 1 — the camera tells the truth about force.** §4 angular ring-down + §5 the FOV kick and its
leak. *Gate:* test 8 green, test 10's `frustumTarget === 78` green, and one video of a haymaker at
40 Hz and 60 Hz. Nothing else in this document is worth doing before the camera stops re-randomising
at 60 Hz — it is the only rule that adds force rather than removing pixels.

**Loop 2 — the frame stops being erased.** §1.3 `frameHeightAt` + §3 the clamp ladder + §7 the
particle cap + §2.1's dome cut and kernel suppression. *Gate:* tests 1–4 green, with test 4 the one
that decides it. ⚠ Measure §8's impact frame **in the same run** — they interact.

**Loop 3 — the pose freezes.** §12.3, one argument. *Gate:* test 5 green in **both** cameras, plus
the city sim still at 0.679.

**Loop 4 — the centre box is respected by the DOM.** §10 and §11. *Gate:* test 7 green.

**Loop 5 — the look.** §2.2's dials + §14's rim, imposed via a `dimensionLook(dials, worldId)`
composed at the single existing call site (`settings.js:166-170`) so `SETTINGS.look` is never
overwritten — the same pattern `budgetLook` already uses, whose header states the rule: *"the
player's CHOICE is never overwritten … the moment the GPU recovers they get it back."* **A preset is
a set of dial positions, not a second system.** *Gate:* test 4 re-run at ink 0 and ink 0.55; ship
whichever raises silhouette delta.

**Loop 6 — the arm.** §13 Phase A only (the elbow: 2 Groups, 0 meshes), plus the `REST`-does-not-
scale question (`pw-limbs.md:528-561`) resolved in **its own commit, first**, so that if ragdoll feel
changes you know which change did it. *Gate:* `pw-limbs.md`'s §5.1 assertion A — worst-case world
position/quaternion delta **< 1e-6** per mesh across all 52 heroes with every new joint at rotation 0
— plus a close-range screenshot of idle, guard, mid-haymaker and a settled ragdoll on GALE (frame
0.92) and RAGE (1.20).

**Loop 7 — momentum from the hand.** §13.2, once the elbow exists: `momentumMult` reads fist travel
with a per-strike tolerance off `data/martial.js`. *Gate:* a standing hook and a drifting approach
produce measurably different multipliers, and the AI-vs-AI balance audit is re-run.

---

## 19. WHAT I DID NOT VERIFY

1. **I captured no pixels and ran nothing.** Every frame-fraction and percentage in §0.1 and §2.1 is
   arithmetic over the source constants in `world.js`, `vfx.js` and `particles3d.js`. §17 exists to
   replace them with measurements. The *shape* of the conclusion does not depend on the arithmetic
   being exact; the *ladder values* in §3.3 and §4.3 do.
2. **The eye→subject multiplier `1.0578·d` assumes a level axis (`ay = 0`).** With a target overhead
   `ay` is clamped to ±0.82 (`world.js:2257`), which changes the vertical term
   (`−ay·d·0.18 + d·0.30`) by up to ±0.148·d — so frame heights vary by roughly ±3% from the table.
   Immaterial to every conclusion, but do not quote the table to three figures.
3. **Amplitude is a judgement.** 1.25° peak and 0.18°/unit are derived from the 40 Hz step budget and
   the existing shake ladder, not from anyone having watched it. So is `punchK = 0.45`. Both are
   `PW_FX` dials precisely so the first video session can settle them.
4. **Whether ink helps or hurts at close range is genuinely open.** It is the only judgement in §2.2
   I would not make from source, which is why §18 loop 5 names a decision criterion rather than an
   answer.
5. **`_animate(0)` is the proposed hitstop fix and I did not run it.** I verified that `animT += dt`
   precedes the early return (`entity.js:819` vs `:1175`) and that `_animate(dt)` is called with the
   full `dt`. I did **not** audit every line of `_animate` (`entity.js:1516-1894`) for a `dt`
   divisor. If one exists, hold `animT` instead.
6. **The camera-inside-the-dome arithmetic** (§2.1) uses the clinch eye offset (horizontal 30u,
   height 14u) against the dome's scaled ellipsoid. It is correct for that framing; at a longer
   framing the eye is further out and the result flips. The point stands — **it happens at the
   framing where it matters most** — but it is not "always."
7. **GPU cost of near-field additive overdraw is unmeasured.** This project's own record says why it
   is hard: CPU timing around `render()` measures submission not GPU work, a hidden pane early-outs,
   and the honest technique is `gl.finish()` at 4K with `renderer.info.autoReset = false`
   (`POWERWORLD.md` §14, including the two measurements that were got wrong first). My overdraw
   argument in §6.1 is arithmetic on fragment area.
8. **I read `comic.js`'s `sfx()`, `_safe()` and the placement search directly**
   (`comic.js:230-241, 246-256, 329-357`). I did **not** re-read the balloon path, so §11's claim
   that `taken` contains only balloons and SFX rests on those three blocks plus the `taken.push`
   sites I saw.
9. **Netplay was not read.** If a remote puppet's pose is serialised joint-by-joint, §13's new joints
   are a wire-format change. `pw-limbs.md:778-780` flags the same gap and calls its grep weak
   evidence.
10. **Two stale claims corrected in passing, both worth a line elsewhere:** `POWERWORLD.md:717`
    (still-owed item 4) should be rewritten now that the chase shake is angular and the real ratio is
    4.75×, and `pw-limbs.md` §0.2 and §1.6-1 should be marked resolved.

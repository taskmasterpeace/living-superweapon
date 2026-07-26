# THE VISUAL IDENTITY SPLIT — ASCENDANTS WORLD vs POWERWORLD

*Written 2026-07-26. Design proposal. Every current value is read from source with a citation;
nothing here has been rendered. Guesses and unverified reasoning are flagged with ⚠ GUESS.
This is the section `docs/POWERWORLD.md:173-176` lists as pending ("the visual identity split").*

---

## 0. Two corrections before anything else

**PowerWorld does not exist in code.** `grep -rn "PowerWorld\|powerworld"` over `src/` returns
nothing. The only references are `docs/POWERWORLD.md`, and `AGENTS.md:3` / `CLAUDE.md:3` /
`README.md:4` naming *Bid For Power* as inspiration. Everything below is greenfield.

**⚠ The brief's premise about where the tokens live is wrong, and it matters.** The task says
"`index.html` `:root` — the FULL design token set". The token block was **moved out of index.html**.
It is `src/styles/tokens.css:5-54`, linked from `index.html:10`, and `tokens.css:3` says why:
*"Moved from index.html so atlas.html shares them."* `CLAUDE.md:2851` still claims *"The tokens live
in `index.html :root`"* — stale. `index.html:13-100` retains only page-level chrome (title screen,
roster cards, touch controls), and those rules already *consume* the tokens (`index.html:50-51`,
`55`, `65-66`, `82`, `90-93`).

That matters here because a second dimension is exactly the change that tempts someone to add a
second `:root`. **There must be one token file for two worlds.** See §1.

---

## 1. WHAT MUST NOT CHANGE

### 1.1 The argument

The two worlds share the things that **span** them, and change only the things that are **local to a
place**. That is not a compromise — it is the whole reason a crossing means anything.

`docs/POWERWORLD.md:36-42` already fixes this: *"You do not choose PowerWorld at the main menu
instead of the city… once it exists you can cross in both directions… damage taken there is real, and
the medical ledger does not care which dimension broke your arm."*

So: a fighter's **codex** is one document. Their **Elo row** is one row. Their **medical ledger** is
one ledger. Their **face and accent colour** are one identity. If the tokens forked, the codex would
be a *different document* in each dimension — and it is emphatically the same document, opened from
the same registry, reporting injuries sustained in either place. **The chrome is the continuity, so
the chrome cannot fork.** What changes is the light on the fighter, not the file about him.

There is a second, harder argument. `CLAUDE.md:2850-2856` records that this project has already paid
for the alternative: the audit found **83 distinct hex colours across 401 uses, 15 border-radii and
36 font sizes**, and the fix migrated **333 literals to tokens**. The rule it closed with is verbatim:
*"Never hard-code a colour, radius, or small font-size again — if a value is missing from the scale,
add a token rather than a one-off."* A per-dimension palette is that regression wearing a design
rationale. If PowerWorld needs a colour the system lacks, it gets **a new token in the one file**,
not a fork.

### 1.2 The specific tokens that are the shared identity

All from `src/styles/tokens.css`:

| Token | Value | Line | Why it must not fork |
|---|---|---|---|
| `--ink` | `#0a0b10` | 7 | the deepest ground under every modal in both worlds |
| `--surface` | `rgba(8,10,16,.55)` | 8 | in-world HUD glass. The player panel is the same object in both places |
| `--surface-solid` | `rgba(14,16,24,.97)` | 9 | modal body — the codex/registry/atlas open identically in both |
| `--surface-raised` | `rgba(10,12,18,.72)` | 10 | card on a modal |
| `--surface-hi` | `rgba(255,255,255,.04)` | 11 | chip |
| `--line` / `--line-2` / `--line-gold` | `rgba(255,255,255,.10)` / `.18` / `rgba(245,178,26,.35)` | 12-14 | the hairline grammar. This *is* the "document furniture" look |
| **the gold ramp** | `--gold-pale #ffd97a` · `--gold #ffd24a` · `--gold-deep #f5b21a` · `--gold-warm #f5921a` · `--gold-shadow #7a3d05` · `--on-gold #160d02` · `--grad-gold` | 17-19 | **one accent, both worlds.** `--gold-deep #f5b21a` is also the favicon bolt (`index.html:7`) and the title gradient stop (`index.html:46`) — it is the product mark |
| **the 6-step text ramp** | `--text #e8e2d6` → `--text-2 #c9c2b4` → `--text-3 #b7b0a2` → `--text-4 #a49c8c` → `--text-5 #8b8577` → `--text-6 #5a544a`, plus `--bone #f4efe6` | 22-24 | hierarchy is not a place. A label is `--text-5` in both dimensions |
| **status colours, one meaning each** | `--danger #ff5a4a` · `--danger-2 #ff8a6a` · `--good #8fe08a` · `--info #7fe6ff` · `--police #5aa0ff` · `--broadcast #d81f26` · `--stamp #c22730` · `--blood #ff3b3b` | 27-34 | see 1.3 |
| radii | `--r-1 4px` · `--r-2 8px` · `--r-3 12px` · `--r-4 16px` · `--r-pill 20px`, "nothing in between" | 37 | |
| type scale | `--t-micro 8.5` · `--t-tiny 9.5` · `--t-label 10.5` · `--t-sm 11.5` · `--t-body 12.5` · `--t-md 13.5` · `--t-lg 15` | 40-41 | |
| tracking | `--tr-tight .04em` · `--tr .1em` · `--tr-wide .16em` · `--tr-wider .24em` | 44 | |
| elevation | `--sh-1` · `--sh-2` · `--sh-gold` | 47-49 | |
| **fonts** | `--f-display` Rajdhani/Inter · `--f-mono` Cascadia Mono/Consolas | 52-53 | see 1.4 |

**`--police`, `--broadcast` and `--stamp` are the interesting case.** PowerWorld has no law and no
press (`docs/POWERWORLD.md:24` — *"there is nobody to protect"*), so those three tokens will go
**unused** there. That is correct and must not be "cleaned up": they are unused the way `--danger`
is unused on a menu. A token nobody references in one world is not dead — deleting or repurposing
`--broadcast` for a PowerWorld energy colour would silently recolour the KMK 9 bug back in the city.

### 1.3 Status colours keep their meanings, including the ones that get busier

`--good #8fe08a` and `--info #7fe6ff` mean health and energy respectively, everywhere
(`tokens.css:29-30`). PowerWorld is a ki-economy game, so `--info` gets used *more*, not
differently. It is already the ki bar's bright stop (`hud.styles.js:22`), the `∞ CORE` colour
(`hud.js:1847-1849`), the wheel-select outline (`hud.styles.js:61`), and the altitude band colour
for SKY (`entity.js` `ALT_BANDS`, `#7fe6ff`). Four surfaces already agree that cyan means energy.
PowerWorld inherits that for free and must not invent a second energy colour.

`--good` is also `ALT_BANDS[0].c` (`#8fe08a`, GROUND). ⚠ Note this is a **literal in entity.js**, not
a token read — `entity.js:334` states the reason: *"canvas 2d cannot read CSS tokens — literals
only."* Same at `hud.js:1504-1505` for the radar. Those literals happen to match the tokens today;
they are a known, documented exception and PowerWorld should not add more of them.

### 1.4 The two typographic voices

`--f-display` (Rajdhani) **speaks**; `--f-mono` (Cascadia) **reports**. `CLAUDE.md:2872-2873`:
*"Never mix the roles."*

This survives the crossing intact, and one detail is worth naming: the sundial's time readout uses
`'ComicSFX'` (`hud.styles.js:568`), and `hud.styles.js:565-567` records why that was nearly a bug —
`'Bangers'` fell back to Rajdhani and *looked almost right*. The comic fonts are declared under
**ROLE names** — `ComicLetter` (comicneue-bold), `ComicSFX` (bangers), `ComicHeavy` (luckiestguy) —
at `comic.css:21-28`. PowerWorld will lean on `ComicSFX` heavily (§5). It must reference the **role**
name, never the family name.

### 1.5 Hero accent colours — and why PowerWorld leans on them harder

52 heroes, one `colors.accent` each (`src/data/characters.js`). Measured distribution: the golds
cluster (`#ffd557` ×9, `#ffb649` ×5, `#ffe270` ×4), then cyans (`#e4ffff` ×4, `#86e7ff` ×4,
`#86d6ff` ×2, `#beeaff` ×2), steel `#cad0db` ×3, and a long tail of singles across warm reds,
oranges and greens.

The accent is not decoration — it is load-bearing in five separate systems:
- the figure's glow / visor / aura materials (`figure.js:166`, `:168`, `:357`)
- the fighter **rim light**, mixed 0.55 toward `#bcd8ff` (`figure.js:375`)
- the roster card dot (`index.html:59`, `--pc`)
- the soft-aim reticle, which **recolours to the target's accent** (`game.js:1207-1210`)
- the kit-widget active chips (`hud.js:1639`)

**In PowerWorld the accent is the *only* identity cue left.** In the city a fighter is placed by a
district lower-third, a city nameplate, a police tag, a news bug, a uniform against a brick wall. In
PowerWorld there is grey rock and open sky and two bodies. So the accents do not merely survive the
crossing — they carry more weight there than here, which is the argument for pushing the rim mix
*toward* the accent (§2.7) rather than for changing any accent value.

### 1.6 NO PURPLE

`tokens.css:3` and `CLAUDE.md:2857` both state it. Verified: **KIVULI is the sole purple in the
roster** — `characters.js:335-336`, `primary #4a2a80 / secondary #1e1038 / accent #b06aff`, plus four
ability colours reusing `#b06aff` (`:345`, `:347`, `:348`). No other hero's accent falls in the
270–320 hue range.

`docs/POWERWORLD.md:140-141` names the specific risk: *"A DBZ-styled dimension is precisely where
violet auras will try to sneak in."* Two places to watch, concretely:
1. **The door.** The existing portal type builds an **orange/blue** pair (`CLAUDE.md`, `portal`).
   Orange/blue is already the right answer and already built. A dimensional tear must be gold/amber
   or the cyan `--info`, never violet.
2. `planets.js:74` already made this ruling once for the space layer: *"NO PURPLE, including here:
   Neptune and Uranus go to deep teal and ice-blue, never violet."* PowerWorld's sky inherits that
   ruling by the same reasoning.

---

## 2. WHAT SHOULD CHANGE — with current values and proposed values

### 2.0 The design question first: what does PowerWorld's sky do that Earth's cannot?

Earth's sky in this engine is a **consequence of an atmosphere** with **one sun in it**. Look at the
shader (`world.js:119-124`):

```
vec3 c = mix(uHor, uTop, smoothstep(0.30, 0.9, h));            // h = n.y*0.5+0.5
c += uGlow * pow(max(0.0, dot(n, normalize(vec3(0.7,0.12,0.7)))), 5.0);   // sun-side horizon glow
```

Two facts fall out that are the whole opportunity:

1. **There is exactly one directional glow term**, keyed to a hard-coded sun bearing. Every sky in
   the game is *a gradient plus one bright patch*. `setSkyWorld` (`world.js:187-211`) varies the
   colours per planet and never varies that structure.
2. **The lower hemisphere is flat.** `h < 0.30` means `n.y < -0.4`, and everything below that is pure
   `uHor`. That has never mattered because the ground is always in the way on an isometric camera.

So the honest answer — the one that is a *fact about the place* rather than a colour choice — is:

> **PowerWorld's sky has no sun in it, and it has a bottom.**

The glow becomes a **full 360° horizon ring** instead of a sun-side patch (a sky lit by the horizon
itself, not by a star), and the lower hemisphere becomes a real void the fighters float over. Neither
is possible for a world with an atmosphere and a star, and the second one is a thing the isometric
camera physically could not show. A chase camera at altitude 260 looking down at a hovering fighter
sees it constantly.

That single structural change is worth more than any palette. It is one extra uniform and one
`mix`, and it keeps **one shader and one program** — which matters, because a second sky material is
a second program compile (the light-count-law family of stall; `CLAUDE.md`, `vfx.js`).

### 2.1 The sky

Current (`world.js:110-128`, `:131-139`, `:238-240`):

| | Current | Line |
|---|---|---|
| dome mesh | `SphereGeometry(900, 24, 16)`, `BackSide`, `depthWrite:false`, `fog:false`, `renderOrder -1` | 112, 126-127 |
| `uTop` init | `(0.03, 0.04, 0.075)` | 114 |
| `uHor` init | `(0.075, 0.07, 0.10)` | 115 |
| `uGlow` init | `(0.10, 0.05, 0.01)` | 116 |
| `topDay` / `topNight` | `(0.15, 0.23, 0.42)` / `(0.03, 0.04, 0.075)` | 136 |
| `horDay` / `horNight` | `(0.50, 0.44, 0.34)` / `(0.075, 0.07, 0.10)` | 137 |
| `glowTint` | `(1.0, 0.45, 0.12)` | 138 |
| glow drive | `glowTint × (0.06 + gold × 0.22)` | 240 |
| day length | 240 s; `dayT` starts 0.30 | 216, 130 |

Proposed PowerWorld:

| | Proposed | Reason |
|---|---|---|
| dome mesh | **unchanged** | reuse; it is one draw and already correct |
| `uTop` | **`(0.035, 0.055, 0.100)`** | a deep cold slate zenith. Deliberately **not** black — black is the space layer's ( `spaceflight.js` `_buildStars`, and `environments.js:56`/`:72` give airless worlds literal `#000000`). PowerWorld is a *place with a sky*, not orbit. And deliberately not toward magenta |
| `uHor` | **`(0.30, 0.20, 0.11)`** | a warm dust band — the ONE warm thing in frame, so the horizon stays readable as a horizon at any camera pitch. Compare `horDay (0.50,0.44,0.34)`: darker and much more saturated, so it reads as haze rather than as daylight |
| **`uBot` (NEW)** | **`(0.018, 0.022, 0.032)`** | the void below. Needs one uniform and `mix(uBot, uHor, smoothstep(0.0, 0.30, h))` before the existing upper mix |
| `uGlow` | **`(0.16, 0.09, 0.02)`**, driven at a **fixed 0.20** | ≈2.5× the city's typical `0.06 + gold×0.22`. A bright band, constant, because there is no clock |
| **glow direction (NEW)** | **ring, not sun:** `pow(1.0 - abs(n.y), 8.0)` | ⚠ This is the one line that says "no star". Add a `uRing` mix factor (0 = Earth's sun-dot term, 1 = the ring) so **one shader serves both** and no second program compiles |
| day/night schedule | **pinned** — do not advance `dayT` | see 2.1.1 |

#### 2.1.1 The clock stops, and that is a feature

`updateDayNight` (`world.js:215-278`) drives the sun colour and intensity, the hemisphere, ambient,
the rim, all three sky uniforms, **building window emissives** (`:241`), **streetlights** (`:242`),
**billboards** (`:243`) and golden hour (`:251-271`). In Ascendants the clock is *content*: the news
bug prints the real in-world time, the sundial reads it (`hud.js:1440-1463`), the birds roost by it
(`wildlife`), the pedestrians live on it.

In PowerWorld every one of those consumers is absent — no windows, no streetlights, no billboards, no
birds, no news bug, no sundial (§4). What is left is a light that changes under a fight for no
reason anyone can see, which means a beam's colour reads differently at second 5 and second 90. **Pin
it.**

Where to pin: **`dayT = 0.30`**. Reason from source rather than taste — `goldenHour` (`weather.js:89-96`)
puts its bell at daylight `dl ≈ 0.30`, described as *"where the sun is LOW but still up"*, and
`world.js:251-271` then warms the sun 0.75 toward `GOLDEN.sunSet #ff9a4a`, dims it `×(1 − k·0.22)`,
lerps the horizon 0.62 toward `GOLDEN.skySet #e88a4c` and — critically — **swings the fighter rim
warm** (`:270`) so figures don't read as cut out of a different picture. That is the most flattering
light the engine has, and PowerWorld is the screenshot dimension.

⚠ Consequence to carry into the numbers below: pinning at 0.30 means the sun intensity figures in
§2.2 are the values **before** golden hour's `×0.78`. Stated so nobody double-applies it.

⚠ `goldenHour`'s `rising` flag is `dayT > 0.75 || dayT < 0.25` (`weather.js:99`), so `dayT = 0.30` is
a **sunset** and gets `sunSet`/`skySet` — the dustier pair. That is the intended read. `weather.js:94-98`
records the bug that made this explicit; do not "fix" it to 0.20 without knowing you have swapped to
the clean dawn palette.

**Alternative worth naming:** pin at `dl ≈ 0.55` (neutral daylight) and set warmth explicitly in
`uHor`/`glowTint`. Cleaner separation of concerns, more work, and loses the free rim-warmth. **I
would ship 0.30.**

### 2.2 The lighting rig

The city rig is a **single-key setup for a world with a star and buildings that cast shadows onto
streets**. PowerWorld has neither. Current (`world.js:82-108`), and the per-frame drive
(`:220-231`):

| Light | Current | Line | Per-frame |
|---|---|---|---|
| `hemi` | `HemisphereLight('#bcd4ff', '#43352a', 1.28)` | 83 | `0.95 + dl×0.4` (226) |
| `amb` | `AmbientLight('#6a7890', 0.5)` | 85 | `0.34 + dl×0.18` (230) |
| `sun` | `DirectionalLight('#fff2dc', 1.8)`, pos `(120,200,80)`, `castShadow`, map `1536²`, frustum `d=110`, near 40 / far 520, bias `-0.0004` | 87-98 | `0.7 + dl×1.1` (221) |
| `rim` | `DirectionalLight('#8fb8ff', 0.75)`, pos `(-130,90,-150)` | 101-102 | `0.6 + (1−dl)×0.35` (231) |
| `kick` | `DirectionalLight('#ff8a3a', 0.22)`, pos `(70,24,120)` | 105-106 | — |

Proposed PowerWorld:

| Light | Proposed | Reason |
|---|---|---|
| `sun` | intensity **1.15** (from 1.8); colour **`#ffd8b0`** (from `#fff2dc`) | With no buildings there is almost nothing to receive a cast shadow, so the key light's job changes from *carving the street* to *shaping the body*. A softer, warmer key plus a much stronger hemi is the correct rig for figures against sky |
| `sun.position` | **`(150, 320, 90)`** (from `(120,200,80)`) | ⚠ see 2.2.1 — this is a **bug fix**, not a preference |
| `sun.shadow.camera` | half-extent **`d = 64`** (from 110); **near 60 / far 900** (from 40 / 520) | Only fighters, rock and debris receive. A tighter frustum roughly triples texel density on the one thing that matters, and the contact shadow is the *only* cue that a floating fighter is near a rock |
| `hemi` | intensity **1.70** (from 1.28); ground colour **`#6e5f4e`** (from `#43352a`) | Hemi **is** the sky, and in PowerWorld the sky is most of the frame in every direction including below. Raising hemi and lowering the sun is literally "the light comes from the dome". Ground colour becomes the rock's own bounce, not warm earth |
| `amb` | intensity **0.32** (from 0.5) | Ambient is flat fill and it kills form. With hemi doing more, ambient does less. Cross-check from the project's own experience: `CLAUDE.md` (THE SPACE LAYER) — *"Ambient at 0.55 filled it in and every planet looked like a lit toy — it is 0.30 now with a 4.2 key"* |
| `rim` | intensity **1.05** (from 0.75); colour **unchanged `#8fb8ff`**; position **`(-130, 40, -150)`** (y from 90) | This is the light that separates a fighter from the background, and the background changes from a dark street to a **bright dome** — separation gets *harder*, so the rim works harder. Dropping it to y=40 catches the underside of a fighter seen from below, which a chase camera does constantly and the iso camera never did |
| `kick` | intensity **0.35** (from 0.22); position **`(70, -60, 120)`** (y from 24) | An uplight is the cheapest possible "you are floating over a void" cue, and it costs **nothing** — a light already in the scene, moved |

⚠ **Every one of these is an intensity, colour or position change on an existing light.** No light is
added, removed, or hidden. `docs/POWERWORLD.md:124-127` names this as the single highest-risk law in
the whole dimension: changing the visible light count rebakes every material in the scene (a measured
400 ms freeze). The rig above is deliberately a *re-aim*, not a *re-build*.

#### 2.2.1 ⚠ A REAL BUG THE ISO CAMERA HID: high fliers cast no shadow

The sun sits at `y = 200` (`world.js:88`) with `shadow.camera.near = 40, far = 520` (`:96`). The
flight ceiling is `BANDS.ceiling = 320` and the SKY band starts at 260 (`core/util.js:52`).

**A fighter above y=200 is above the light.** Their shadow either vanishes or is computed from the
wrong side of the frustum. In the city this was invisible: the iso camera at `camDist 260` looking
down a `(0.86, 0.92, 0.86)` axis (`world.js:52-53`) rarely framed a fighter at 300u against ground,
and there was always a building in the way. A chase camera in an open sky arena frames exactly that,
constantly.

Raising the sun to `y = 320` and the far plane to 900 is the arithmetic fix. **This must be looked at
on screen, not reasoned about** — it is the kind of thing that produces a correct number and a wrong
picture. It is also worth checking in Ascendants, where it is a latent defect today.

### 2.3 Fog and atmosphere — two systems, do not confuse them

There are **two** unrelated things called fog:

**(a) `scene.fog` — depth haze.** `FogExp2('#0e1119', 0.00055)` (`world.js:45`), matching
`scene.background` (`:44`).

**(b) The fog of war — a vision-cone shader on a ground plane.** `src/engine/fog.js`:
`uCos = cos(0.96)`, `uRange = 96`, `uNear = 26`, `uDark = 0.74`, `uTint #ffd24a`
(`fog.js:36-39`), marching `FOG_STEPS = 26` taps through a `FOG_RES 384` occupancy grid over
`FOG_EXT 700` (`fog.js:16`).

#### (b) — turn the fog of war OFF

**Precedent, verbatim:** `boxingring.js:203` — `W.setFogEnabled && W.setFogEnabled(false); // there
is no fog of war in a lit ring`. Same at `baseroom.js:92` and `atlasUI.js:86`. `setFogEnabled` is
`fog.js:96` (`this.fog.visible = on`).

PowerWorld's case is the same argument and stronger:
- Nothing to hide behind. No cover boxes to occlude, so the occupancy raster has nothing to rasterise.
- No stealth fantasy. No witnesses, no police, nobody to slip a block away from.
- **It contradicts the camera.** A lock-on chase camera and a 96u vision cone are two different
  readability models. `docs/POWERWORLD.md:133` warns the inverse — *"A lock-on camera must not become
  a lock-on wallhack"* — and the resolution is that in PowerWorld there is nothing to conceal, so
  concealment is not the mechanic.

⚠ **AI honesty is untouched by this.** Gameplay LOS is `game.canSee`, which is a separate, exact
segment-vs-AABB test; `CLAUDE.md` states it explicitly for the occupancy-grid change: *"Gameplay LOS
(`game.canSee`, AI vision, targeting) is UNCHANGED and still exact. Don't 'fix' one with the other."*
Switching the fog *plane* off changes what the **player** sees, not what a bot knows.

⚠ Consequence for the HUD: several elements gate on `_vis` — the foe bar at `_vis > 0.35`
(`hud.js:1902-1911`), the lock sprite at `_vis > 0.35` (`game.js:1214`), the foe arrow
(`hud.js:788-791`), `updateColumnChips` at `_vis < 0.4` (`hud.js:650`), and the radar's faded `?`
(`hud.js:1513`). With `g.fov` off, `game.js:1223` already sets `e._vis = 1` for every entity — so
those gates pass and the surfaces just work. **Verified by reading; not run.**

#### (a) — depth fog: much thinner, and recoloured to the horizon

| | Current | Proposed | Reason |
|---|---|---|---|
| density | `0.00055` | **`0.00022`** | FogExp2 at 0.00055 reaches ~50 % at ~1,260 u. The flagship arena is 483 u across, so it barely acts. PowerWorld wants **thousands** of units of sightline (a beam duel at altitude 260 across open ground), and the same density would eat the far rock |
| colour | `#0e1119` | **the dome's own horizon** (≈ `#4d331c` for the `uHor (0.30,0.20,0.11)` above) | Fog colour must equal the horizon or distant geometry sits in front of a sky it does not match. This is the single most visible of all the numbers here |
| `scene.background` | `#0e1119` (`world.js:44`) | irrelevant | the dome covers it; leave it |

⚠ **Two stash-and-restore paths will fight a per-world fog colour or exposure.** `setNightVision`
(`world.js:691-703`) stashes `toneMappingExposure` and `scene.fog.color` on entry and writes them
back on exit — so a goggle cycle in PowerWorld restores whatever was stashed. And `setIndoor(null)`
(`world.js:296-303`) restores `scene.fog.density` from `_dnFog`, which `updateDayNight:276` only
latches **once** (`if (this._dnFog == null)`). A per-world density must be written **before** that
first latch, or set through it. Real wiring, not a number.

⚠ `_fitFog` (`fog.js:82-85`) sizes the fog plane to `max(700, arena*2 + 140)`. Moot if the plane is
off, but if PowerWorld's arena exceeds ~280 and anyone ever turns it on, the fit is needed.

### 2.4 The ground material

Current, the flagship (`world.js:330-343`):
`MeshStandardMaterial({ map: _gridTexture(), roughness: 0.92, metalness: 0.0, color: '#b9b1a2' })`,
on a `PlaneGeometry(ARENA*2, ARENA*2, 112, 112)`, `receiveShadow`. The 112² subdivision exists so
`crater()` can displace vertices; `_gvx/_gvz/_gh` cache per-vertex world XZ and accumulated height
(`:341-343`).

Proposed PowerWorld:

| | Proposed | Reason |
|---|---|---|
| subdivision | **keep 112²** | Craters are the best "a fight happened here" cue in the engine, and PowerWorld is where the biggest hits land. Keeping the grid reuses `crater()`, `trench()`, `resetTerrain()`, `flattenGrass()` and the whole GeoMod path **for free** |
| `color` | **`#8a7a68`** (from `#b9b1a2`) | The city ground is bone because the White City is bone. PowerWorld's must sit **down** in value so (a) fighters and energy read against it and (b) **the sky is the brightest thing in frame**, which is what makes a sky arena feel open. `#8a7a68` is ~28 % darker in luminance and less bright-neutral |
| `roughness` | **0.88** (from 0.92) | Slightly less matte so the low key light gets a broad terminator across the rock instead of a flat wash — the only shape information the ground has |
| `metalness` | **0.0** unchanged | ⚠ `CLAUDE.md` records the trap: high metalness with no envmap renders **near-black**. Rock is dielectric; leave it |
| surface detail | **painted into the texture** | see below |
| `sinkSurface(ground)` | **yes** | as `whiteroom.js:118` does |
| grass | **off** | `_buildGrass` is 2,400 instanced blades for an Earth meadow. PowerWorld has no biosphere — and `worldEnv` (`planets.js:89-94`) already derives `life`, so the existing gate does the work |

**On the texture, and why this is the flicker law applied in advance.** `docs/POWERWORLD.md:135-136`:
*"THE FLICKER LAW — take a rung from `GROUND_LAYER`; never invent your own small offset. **A
perspective camera at close range makes z-fighting far more visible than the iso camera ever did.**"*
`whiteroom.js:108-118` is the worked example: three flat surfaces fought for the same millimetre, and
the fix was *"stop having three surfaces"* — the grid is painted into the floor texture, one plane,
plus `sinkSurface`.

So: any rock mottle, cracked-plate pattern, dust or scorch base that would be a second coplanar
plane goes **in the texture**. Anything that genuinely must be a separate decal takes a rung from
`GROUND_LAYER` (`core/util.js:92`: `shadow 0.05 · stateRing 0.35 · bandRing 0.55 · faceWedge 0.75 ·
mark 0.95 · spacing 1.15`, with `DECAL_LIFT = 0.35` at `:90`) — **never a new small number**. And run
`world.auditSurfaces()` afterwards; it reads the built scene, so a builder that computes a bad number
cannot hide.

### 2.5 Tone-mapping exposure

Current: `ACESFilmicToneMapping`, `toneMappingExposure = 1.28` (`world.js:38-39`).
Composer: `RenderPass → UnrealBloomPass(half-res, 0.66, 0.6, 0.8) → OutputPass → PrintPass`
(`world.js:1194-1203`).

Proposed PowerWorld: **1.12**.

The mechanism, not a preference: **PowerWorld's content is emissive.** Beams carry a sheath `color`
plus a bright inner `color2` (`visual.js:186`); the figure's glow material runs
`emissiveIntensity 1.6` (`figure.js:166`) and the visor `2.0` (`:168`); the aura is additive
(`:357`); and a half-res UnrealBloom sits on top of all of it. §2.2 raises hemi 1.28 → 1.70, which
raises the whole scene's base level. Hold exposure at 1.28 while doing that and ACES's shoulder
takes every energy effect to flat white — which reads as **less** impact, for the exact reason
`printpass.js:191-194` gives about saturation: *"drives the reds and the hero accents straight into
clipping — which reads as LESS pop, because a clipped colour has no shape left."*

Dropping to 1.12 buys back roughly a sixth of a stop of highlight headroom, spent on the thing the
dimension exists for.

⚠ `setNightVision` multiplies exposure by 2.35 **off a stashed value** (`world.js:696`) and restores
that stash on exit (`:699`). A per-world exposure must be what gets stashed, or goggles in PowerWorld
restore the city's 1.28. Same wiring note as §2.3.

### 2.6 `applyWorldGrade` — and ⚠ it is currently dead code

`world.applyWorldGrade(tint)` (`world.js:182-185`) forwards to `print.setWorldGrade`
(`printpass.js:290-297`), which computes:
```
uLift = c × 0.055
uGain = 0.92 + c × 0.14
```
and the shader applies `mix(c, clamp(uLift + c*uGain), uGrade)` (`printpass.js:208-211`).

**Two findings, both verified by grep:**

1. ⚠ **`applyWorldGrade` has zero callers.** `grep -rn "applyWorldGrade" src/` returns only its own
   definition. `main.js:216` calls `setSkyWorld((t && t.planet) || 'earth')` and nothing else. So the
   per-world grade — the feature `CLAUDE.md` describes as *"derived from the sky the planet already
   declares"* — **is not wired**. `SETTINGS.fxGrade` is 1 by default (`settings.js:82`) and reaches
   `u.uGrade.value` via `apply()` (`printpass.js:256`), so the *strength* is live while `uLift`/
   `uGain` sit at their constructor defaults `(0,0,0)` and `(1,1,1)` (`printpass.js:234-235`) — an
   identity transform. **The grade currently does nothing anywhere.**

2. ⚠ **Its own fallback is broken.** `world.js:183` falls back to `this._dnc.sky`. There is **no
   `sky` key** in `_dnc` — the keys are `work, work2, sunDay, sunGold, sunNight, hemiDay, hemiNight,
   gndDay, gndNight, topDay, topNight, horDay, horNight, glowTint` (`world.js:131-139`). So an
   argument-less call resolves to `undefined` and lands on `'#ffffff'`.

**This is a free win and PowerWorld is the first world with a reason to take it.** Proposed:

| | Proposed | Reason |
|---|---|---|
| tint | **the PowerWorld horizon**, ≈ `#c98a4a` | Lift the shadows toward the dust band and pull gain warm — "the same picture, breathing different air." It must be **derived from PowerWorld's own sky row**, the way Earth's is meant to be, not authored twice |
| strength | **1.0** | unchanged; `fxGrade` already defaults to 1 |
| the fallback | **fix `_dnc.sky` → `_dnc.horDay`** | a one-word fix that makes the argument-less call honest in both worlds |

Measured effect of `#c98a4a` through that arithmetic: `uLift ≈ (0.044, 0.030, 0.016)`,
`uGain ≈ (1.031, 1.007, 0.963)` — a gentle warm lift with a slight blue pull-down. Subtle, which is
correct for a grade; the sky and the light do the heavy lifting.

### 2.7 The fighter rim light

Current (`figure.js:127-148`, `:375`; `entity.js:260`; `settings.js:83`):
- injected on `suit`, `suit2`, `skinMat`, `armor` with colour `accent.lerp('#bcd8ff', 0.55)`,
  `power = 2.6`, initial `strength = 0` (`figure.js:375`)
- added after lighting resolves, before tone mapping: `outgoingLight += uRimCol * pow(rim, uRimP) * uRimK`
  (`figure.js:138-145`)
- strength set from `world._rimK` (default 0.8) **once, at construction** (`entity.js:260`)
- `SETTINGS.fxRim = 0.8` → `w._rimK` (`settings.js:83`, `:172`)

Proposed PowerWorld:

| | Current | Proposed | Reason |
|---|---|---|---|
| `_rimK` | 0.8 | **1.25** | Rim strength is a **separation budget**, and separation is harder in PowerWorld: the background goes from a dark street to a bright dome. `world.js:268-270` already recognises the principle for golden hour — the rim must agree with the world or fighters read as cut out of a different picture |
| `uRimP` (power) | 2.6 | **2.1** | 2.6 is a tight rim, correct at iso distance where a fighter is small. A close chase camera shows a silhouette that is mostly limbs against sky; a wider falloff is what wraps a limb |
| accent mix | `lerp('#bcd8ff', 0.55)` | **`lerp('#bcd8ff', 0.35)`** | The interesting dial. At 0.55 the rim is **more scene-blue than hero**. In PowerWorld the accent is the only identity cue left (§1.5), so lean on it — and this is the argument for changing the *mix* rather than any token or any accent value |

⚠ **THREE WIRING PROBLEMS, and only the first is a number.**

1. `setRim` is called **once, in the Fighter constructor** (`entity.js:260`). Setting `world._rimK`
   on world entry does **nothing** to fighters already spawned. PowerWorld's setup must set `_rimK`
   **before** spawning, or loop live fighters calling `setRim(f.parts, k)`.
2. **`uRimP` and `uRimCol` have no setter.** `applyRim` bakes both into the uniform object at
   construction (`figure.js:129-130`) and `setRim` only drives `uRimK` (`:150-153`). Changing rim
   power or colour per world needs a `setRimColor` / `setRimPower` sibling. **That is real work, not
   a tuning change.**
3. ⚠ **Do not "fix" this by re-injecting.** `figure.js:119-126` states the rule twice: injected
   always, driven by a uniform, never toggled by re-injecting (`onBeforeCompile` changes the program
   → recompile stall), and it needs `customProgramCacheKey` or three.js hands a rim material a
   program compiled without it. A per-world rim **variant material** would re-break both.

### 2.8 The camera — noted, not specified

`docs/POWERWORLD.md:81` correctly identifies this as *"THE work"*, and it is out of scope here. Three
facts that bear on the visuals above:

- The game camera is an **`OrthographicCamera`** (`world.js:55-57`), frustum 78, `camDir (0.86, 0.92,
  0.86)`, `camDist 260`, near 1 / far 1400.
- Three `PerspectiveCamera`s already exist and are the borrowable precedents: `newscrew.js:47` (fov
  34, near 0.5 / far 1100), `spaceflight.js:84` (fov 52, near 0.1 / far 60000), `hqglobe.js:137` (fov
  42). ⚠ `CLAUDE.md` records the trap: *"Cloning `world.camera.constructor` with perspective args
  builds a degenerate frustum… borrow the news crew's POV camera."*
- `world.screenPosOf(x,y,z,out)` (`world.js:1767-1773`) already projects to CSS pixels **and returns
  `behind`**. That is the one piece of perspective-camera HUD plumbing that already exists, and §4
  leans on it heavily.

---

## 3. THE LOOK PRESET

### 3.1 Should the print look come to PowerWorld? Both sides, properly.

**The case that print belongs to Ascendants alone.**

The print stack is a **journalistic claim**. Halftone, paper grain and ordered dither say *this is a
printed page* — and Ascendants has a press: KMK 9, a field crew, a news desk, a broadcast end screen,
a codex with a CLASSIFIED stamp, a registry, a witness layer. `printpass.js:2-7` quotes the brief
that produced it, and `printpass.js:34-35` calls the palette *"The house ink and paper."* The look is
the **diegetic output of a world that reports on you**. PowerWorld has *"nobody to protect"*
(`docs/POWERWORLD.md:24`) — no witnesses, no press, nobody to print anything. Ink on a page nobody
printed is decoration, and this project is unusually strict about surfaces that assert things that
are not true.

There is a mechanical case too, and it is the stronger half:

- **Ink will fire on everything.** The Sobel is over **luminance, not depth** — a deliberate,
  documented trade (`printpass.js:20-26`) — thresholded at `smoothstep(0.10, 0.34, e)`
  (`printpass.js:134`). PowerWorld's frame is thin limbs and thin beams against a **bright dome**:
  maximum-contrast luminance edges everywhere, including on `ray`-build beams whose radius is small
  by construction (`visual.js:216`, BUILD derived from radius). At the close range of a chase camera
  that reads as **noise on exactly the objects you are trying to track**.
- **Halftone will fire on almost nothing.** It is masked to shadows: `1 - smoothstep(0.05, 0.62,
  lum)` (`printpass.js:152`). A sky-dominated frame is mostly above 0.62, so the effect costs its
  branch and delivers nothing. A dial that does nothing is worse than a dial that is off — same
  family as *"a control that lies about itself"* (`hud.js:1946-1949`, the `noPowers` row).
- **Cost lands on the wrong machine.** Ink is `fetch: 8` (`settings.js:122`, and the fetch ladder is
  explained at `:100-109`), and PowerWorld is the **Steam Deck** target
  (`docs/POWERWORLD.md:32-34`). ⚠ `settings.js:101-105` is explicit that the timings were taken on an
  RTX 4090 and every effect came back *below the noise floor* at 720p — so the fetch count, not the
  stopwatch, is the honest predictor on an RDNA2 APU. Eight extra fetches per pixel is a real number
  there.

**The case that print belongs in PowerWorld MORE than in the city.**

- DBZ is a **comic**. Bid For Power is a mod of a comic. The genre's most iconic imagery is
  cel-shaded, hard-outlined and limited-palette — and `levels` (`printpass.js:141-146`) **is** cel
  shading: it quantises the *tone* and carries the hue with it. Refusing ink in the DBZ dimension
  while keeping it in the journalism dimension is backwards on genre grounds.
- **The impact frame and the speed lines are anime devices, not newspaper devices** — and they live
  in this pass. `printpass.js:213` (*"One inverted frame on connect… thirty years old"*) and
  `:165-173` (radial streaks from the impact). PowerWorld wants both **more** than the city does:
  streaks radiating from a connect at cruise speed is the genre's signature, and
  `printpass.js:271-275` already got the mechanism right (a **frame count**, not a duration).

### 3.2 The decision: split the pass by what each dial is FOR

**Take the anime half. Drop the print half.** The pass is not one look — it is eleven dials, and they
divide cleanly along exactly this line.

- **Anime devices → keep and strengthen:** impact frame, speed lines, palette `levels` (cel),
  vibrance, dither.
- **Press devices → drop:** ink, halftone.
- **Paper grain → keep a whisper.** This is the one deliberate exception, and it is the thread that
  makes the two dimensions read as one *product*. Grain at 0.10 is barely perceptible and it is the
  cheapest continuity in the whole document.
- **Tilt-shift → off, and structurally wrong here.** `printpass.js:96-99`: it is a **screen band**,
  and that is *correct rather than a shortcut* because a tilt-shift lens rotates the focal plane,
  which on a **fixed isometric** view maps to a horizontal band. A pitching chase camera destroys
  that premise — the sharp band would slide across the fight as the camera tilts. **DIORAMA is an
  Ascendants-only preset** and should say so.

Ink is not banned — it is **not the default**, because the argument against it is a *readability cost
at close range* and that has to be looked at rather than reasoned about. And it already has a home:
**`splash` (SPLASH PAGE) still works in PowerWorld** (`settings.js:124-125`: ink 1.0, halftone 0.75,
levels 7, grain 0.42, vibrance 0.45, saturation −0.05). That preset is already named for the
screenshot purpose, so PowerWorld needs **one** new preset, not two. `settings.js:96-98`:
*"A PRESET IS A SET OF DIAL POSITIONS, NOT A SECOND SYSTEM."*

### 3.3 The preset

Named for **purpose, not quality** — `settings.js:111-114`: *"A player choosing between 'medium' and
'high' is guessing; a player choosing between FIELD and SPLASH PAGE knows which one is for playing
and which is for the screenshot."* The city's working look is **FIELD**; PowerWorld's is **ARENA**.

```
arena: { _n: 'ARENA',
         _d: 'The other side of the door. Cel-flat colour, no ink, and every punch gets a frame.',
         fetch: 0,
         ink: 0, halftone: 0, levels: 9, grain: 0.10, tilt: 0,
         dither: 0.28, grade: 1, vibrance: 0.50, saturation: -0.04 },
```

Every dial, against the city's shipping default (`look: 'broadcast'`, `settings.js:80`, `:122-123`):

| Dial | BROADCAST | ARENA | Reason |
|---|---|---|---|
| `ink` | 0.85 | **0** | §3.1 — the readability cost at close range, plus `fetch: 8` on the Steam Deck target |
| `halftone` | 0.55 | **0** | the shadow mask (`printpass.js:152`) barely fires on a sky-dominated frame; a dial that does nothing |
| `levels` | 0 | **9** | **cel shading.** It quantises tone and carries hue (`printpass.js:143-144`), which is exactly what makes an aura read as a flat plate of colour. 9 is gentle where SPLASH's 7 is aggressive |
| `grain` | 0.30 | **0.10** | the one thread of continuity between the dimensions — see §3.2 |
| `tilt` | 0 | **0, and locked** | wrong projection (`printpass.js:96-99`) |
| `dither` | 0.35 | **0.28** | PowerWorld's sky is a large smooth gradient — **the most band-prone image in the project** — so ordered dither genuinely earns its keep here (`printpass.js:70-71`: an ordered threshold reads as print because it is what a press does). Slightly lower because `levels 9` is already quantising |
| `grade` | 1 | **1** | unchanged — and now actually wired (§2.6) |
| `vibrance` | 0.35 | **0.50** | weighted by `(1 − existing saturation)` (`printpass.js:200`), so it lifts the **grey rock and the sky** and leaves the **auras alone**. That weighting is precisely right for a world of grey rock and saturated energy |
| `saturation` | 0 | **−0.04** | a hair off the *whole* frame so the energy is the only fully saturated thing in it. This is the trick that makes a ki blast read as bright without touching its own colour |
| `fxImpact` | true | **true** | `printpass.js:276-280`. Hangs off `game.onHit`, the choke point — so it already covers dive punches, thrown cars and beam overpowers |
| `fxSpeedLines` | true | **true, and stronger at the call site** | strength is per-hit (`printpass.js:283-287`), not a preset value. Raise it there, not here |
| `fxRim` | 0.8 | **1.25** | ⚠ not a pass dial — material-level (§2.7) |

**`fetch: 0` is the headline number.** `budgetLook` (`settings.js:136-142`) drops tilt first and ink
second when the adaptive tier lowers the budget (`FETCH_BUDGET = [0, 8, 16]`). ARENA has nothing to
drop, so it **cannot degrade** — which is the correct property for the Steam Deck target, and it
happens to fall out of the design rather than being engineered.

### 3.4 ⚠ An architectural problem a per-world preset creates

`applySettings` writes a preset's dials **into `SETTINGS.fx*`** (`settings.js:164-165`):

```js
const P = LOOK_PRESETS[SETTINGS.look] || null;
if (P) for (const k in P) SETTINGS['fx' + k[0].toUpperCase() + k.slice(1)] = P[k];
```

`SETTINGS` is **global and persisted** (`settings.js:52`, `:91-93`). So if crossing the door writes
`SETTINGS.look = 'arena'`, the player's *city* look is permanently changed — and worse, if they had
CUSTOM dials, those are overwritten. PowerWorld therefore needs a **per-world override applied at
`w.print.apply()` time**, not a settings write; `SETTINGS.look` must keep saying what the *player*
asked for. `settings.js:131-134` already establishes exactly this discipline for the fetch budget:
*"the player's CHOICE is never overwritten — this clamps what the shader does, and `SETTINGS.look`
still says what they asked for."* The world override should ride the same seam.

⚠ Also: `_n` and `_d` are enumerable, so that `for…in` writes `SETTINGS.fx_n` and `SETTINGS.fx_d`
too. Harmless today (nothing reads them) but it means the preset object is not a clean dial bag.

---

## 4. THE HUD

### 4.1 The premise

**A third-person combat HUD is not an isometric one, and the difference is geometric.** On the iso
camera the character sits near the centre of frame and the corners are empty — so the city HUD
correctly colonised the corners *and* built a bottom-centre column, because the bottom-centre of an
iso frame is empty floor. On a chase camera the character sits **low-centre** and the aim point is
**dead centre**. The bottom-centre column becomes the worst real estate in the frame.

### 4.2 What PowerWorld should DROP

| Element | Where | Why it goes |
|---|---|---|
| **Radar / minimap** | `#hRadar`, 152×152 top-right (`hud.styles.js:6-8`), `updateRadar` `hud.js:1465-1526` | It is an **XZ-only** plot and `hud.js:1503` admits the cost: *"a foe 300u overhead was a dot beside you."* It compensates with dot colour, dot size and a band digit (`:1503-1511`). In a **full-sphere** brawler with typically **one** opponent, a top-down plot answers a question nobody has; the chase camera and the off-screen arrow are the right instruments. It also draws canon district labels and a harbour band (`:1476-1490`) that do not exist there |
| **PiP news monitor** | `#hPip`, `top:184px; right:18px` (`hud.styles.js:357-361`) | No news crew — no witnesses |
| **City nameplate** | `#hCity`, `bottom:108px` centre (`hud.styles.js:572-573`), `hud.js:1963-1973` | No city, district, population or crime rating. ⚠ Also resolves a real collision: it sits **4px under `.hands` at `bottom:112px`**, both `left:50%`, and the hands-row budget comment (`hud.styles.js:62-65`) accounts for the charge bar and slots but **not** the nameplate |
| **Wanted row** | `#plWanted` (`hud.js:1912-1936`) | No law. The whole six-rung ladder is absent |
| **Sundial** | `#hSun` (`hud.styles.js:559-571`, `hud.js:1440-1463`) | No clock (§2.1.1). ⚠ Dropping it also frees the top-centre: `#hud.hassun` pushes the mode bar to `top:126px` (`hud.styles.js:528`) |
| **Controls hint, as written** | `#hHint` bottom-right, 284px (`hud.styles.js:88-101`) | Keep the **panel and the auto-fold** (18 s then collapse, `hud.js:531-536`); the *content* must change because the bindings do — `docs/POWERWORLD.md:82` flags that BFP's camera toggle is `V`, which is our jab. ⚠ And the right way is free: `buildHintBody` (`hud.js:492-521`) renders from the live `keymap(SETTINGS.scheme)`, so **a PowerWorld scheme row in `KEYMAPS` (`settings.js:8-45`) gets the panel for nothing** |
| **Telemetry column** | `.telem` `left:14px; top:14px` (`hud.styles.js:597`) | ⚠ Not dropped — but note it **overlaps the feed** in the same corner. In PowerWorld, with the feed thinner, it matters less |
| **DIORAMA / tilt-shift** | — | §3.2 |
| **The 4-rung ALT ladder** | — | ⚠ **Already gone. Do not rebuild it.** `hud.js:540-545` is the tombstone: *"This used to be a four-rung ALT ladder docked to the side of the screen — a number you had to look AWAY from your character to read, while flying, which is exactly when you cannot afford to."* It moved into the world. `CLAUDE.md:2921-2923` still documents `hud.updateAltitude` / `#hAlt`; both are stale — no such method or element exists anywhere in `src/`. There is even an orphaned CSS heading `/* ---- ALTITUDE LADDER ---- */` at `hud.styles.js:608` sitting above the `.wantedrow` rules |

**Reduce, don't drop: the feed.** `#hFeed` top-left (`hud.styles.js:110-111`), 5-line cap, 2.6 s
fade (`hud.js:1834-1839`). Its city content is collateral, police and news lines. In PowerWorld it
should carry tier-ups, KOs and system lines only — cap it at 3.

### 4.3 What PowerWorld should KEEP

| Element | Where | Why it stays |
|---|---|---|
| **Player panel** | `.pl` bottom-left (`hud.styles.js:16`), `hud.js:188-197` | The same object in both worlds. Health bar `#plHp`, **ki bar** `#plKi` with `.low` <38 % / `.crit` <15 % (`hud.js:1844-1857`), `DRAINED` / `∞ CORE` tag `#kiState` (`:1846-1854`), `⚡ OVERDRIVE` `#kiOver` (`:1856`), guard bar `#plGd`, level badge, tier badge — **and the panel physically widens 44px per tier** (`:1873-1878`), which is a DBZ idea already shipped. The ki bar matters **more** here, not less |
| **Wounds chip** | `#plWounds` (`hud.js:1860-1869`) | Injuries cross the door — `docs/POWERWORLD.md:41-42`. Keep |
| **Mood chip** | `#plMood` (`hud.js:758-782`) | The psyche runs on real events — hits, KOs, low health — all of which happen in PowerWorld. ⚠ But see 4.6: it is appended to `document.body` at z-index 21, *below* `#comicLayer` (26) |
| **Slot chips** | `.slots` bottom-centre (`hud.styles.js:50-61`), `hud.js:1803-1826` | The glyph + range word from `slotFacts` (`hudUtil.js:201-214`) is the newest and best-reasoned surface in the HUD — `SELF / CLOSE / MID / LONG / FAR` from `rangeWord` (`:199`), *"A WORD, NOT A NUMBER"* (`:197-198`). ⚠ But it **must move** — see 4.5 |
| **Hands row** | `.hands` `bottom:112px` (`hud.styles.js:66-83`), `hud.js:1659-1703` | ⚠ **`updateHands` exists** — CLAUDE.md's *"is called and does not exist yet"* is stale; `docs/BACKLOG.md:309` already records it closed. It hides itself when there is one slot (*"ONE SLOT IS NO CHOICE"*, `hud.js:1669-1673`) and never prints an unbound key (`:1675`), so it costs nothing where it does not apply |
| **Damage numbers** | `.dmg` (`hud.styles.js:152-153`), `hud.js:1752-1770` | Font scales with the number, capped 38px (`:1760-1761`); 48-node cap; **and it already bails on a behind-camera point** (`:1756-1757`) — perspective-ready |
| **Foe bar** | `#hFoe` top-centre (`hud.styles.js:84-87`), `hud.js:1902-1911` | Keep, but see 4.4 #2 — it may be superseded |
| **Off-screen foe arrow** | `#hFoeArrow` (`hud.styles.js:103-107`), `hud.js:784-812` | ⚠ **Better than expected: it already flips the bearing when `sp.behind`** (`hud.js:801`) and projects onto the screen-edge rect with a 64px margin (`:795-804`). The behind case is handled. See 4.4 #5 for the part that is not |
| **Column chips** | `updateColumnChips` `hud.js:642-676` | **The sleeper.** Already puts `↑ SKY · 142m · Name` at the foe's own screen position via `screenPosOf` with the `behind` guard (`:666-667`), band-coloured (`:673`), altitude in metres at `×0.19` (`:674`), and it **honours the honesty gate** (`:650`). This is most of "target health at the target" already built |
| **In-world altimeter tag** | `entity._altTag` `entity.js:315-343` | Built lazily on first liftoff, band name + metres, on the marker ring, `depthTest:false`. Diegetic and correct. See 4.4 #4 for what breaks |
| **Ground markers** | `bandRing`, `faceWedge`, `stateRing`, contact shadow | The state display. Rungs from `GROUND_LAYER` (`util.js:92`) — do not re-space them |
| **Vignette** | `.vignette` (`hud.styles.js:5`) | Transparent to 52 % radius, darkening past 82 %. It is the one thing that frames a wide-open frame, and it is the **geometric expression of keep-the-centre-clear** |
| **KO banner / announce / combo** | `hud.js:1545-1551`, `:1569-1576`, `:1795-1799` | Tier-ups, KOs and streaks are the genre's ceremony |
| **Hit-direction arcs** | `.hitring` (`hud.styles.js:9-10`), `hud.js:1529-1543` | ⚠ Already flips when the source is behind camera. Matters *more* in a full sphere |
| **Danger vignette** | `.danger` (`hud.styles.js:11`), `hud.js:1980-1981` | red pulse under 28 % hp |

### 4.4 What PowerWorld NEEDS and does not have

**1. A lock-on reticle that survives perspective.** ⚠ The lock crosshair exists but is built for
ortho. `game._buildLockMark` (`game.js:1182-1199`) makes a **64×64 canvas-texture sprite** — red
`#ff3b3b` ring r=19, four ticks, white centre dot r=3.4, outer white ring — at `scale 7` with
`depthTest:false`, visibility-gated at `_vis > 0.35` (`:1214`). The soft-aim reticle
(`_buildReticle`, `game.js:304-315`) is a flat **ground-laid** group: two counter-rotating rings and
a chevron at y=13, recoloured to the target's accent (`:1207-1210`).

Under perspective, a world-space sprite at 400u is a different pixel size than at 40u — so the lock
mark grows and shrinks with range, and a ground-laid reticle is meaningless for a target at altitude
260. Needs either a **distance-compensated scale** on the sprite or a DOM element driven by
`screenPosOf`. ⚠ Note the variable is still named `redTri` from the old red-triangle marker; renaming
it is not the fix.

**2. Target health AT the target.** The highest-value item, and it is an **edit, not a build**:
extend `updateColumnChips` (`hud.js:642-676`) from `band · metres · name` to add a short hp pip
strip, drop the `h < 40` altitude gate (`:649`), and the 4-target cap (`:652`) becomes the 1-target
case. If that lands, the top-centre foe bar (`hud.styles.js:84`) becomes redundant and the top-centre
rail frees up entirely.

**3. A ki-charge read.** ⚠ **A verified, genuine gap.** `chargingKi` is set in `entity.js:1145-1148`
(40/s regen while charging vs 22/s normal) and **nothing in the HUD reads it** — `grep -rn
"chargingKi" src/` returns hits only in `entity.js`. There is a gold pulsing state ring in the world
and a `heroYell` (`entity.js:1147`), and no screen read at all.

⚠ Do not confuse it with `#hCharge` (`.charge`, `left:50%; bottom:96px; 280×10`, gold→orange,
`hud.styles.js:108-109`, driven `hud.js:1899-1900`) — that is a **charge-type ability's hold meter**,
a different thing. PowerWorld's whole economy is *stop and power up*, so this needs a real surface.
Cheapest honest version: **reuse `#hCharge`'s geometry** driven from `chargingKi`, and pulse the ki
bar itself gold while charging. The state is already on the fighter; only the read is missing.

**4. An altitude read with no ground reference.** The widget is fine — `_altTag` reports
`h = pos.y − groundY` in metres (`entity.js:327-328`). **What breaks is the reading, not the
widget:** with no buildings there is no scale reference, so 80 m and 160 m look identical, and the
`bandRing` colour is the only discriminator.

The right answer is **level design, not HUD**: give PowerWorld its own bands via the mechanism that
already exists (`plan.bands` → `setBands`, `core/util.js:52-56`) and put **floating rock at the band
heights** so the world itself is the ruler. `docs/POWERWORLD.md:90` already says the missing thing is
*"BFP-SHAPED maps: open rock"* — this is a reason to build them a particular way.

⚠ Small drift worth fixing while nearby: `updateColumnChips:668` hard-codes `260` and `150` instead
of reading `BANDS`, and `updateRadar:1506` hard-codes `260/150/8`. Those will silently disagree with
a PowerWorld band set.

**5. A vertical component on the off-screen arrow.** The arrow handles *behind* (`hud.js:801`); what
it cannot say is **how far above or below**. Its label is `name Nm` where N is **XZ distance**
(`hud.js:807`). In a full sphere, "300 m away" that is actually 300 m straight up is the single most
important thing to know and the arrow does not say it. Add the altitude delta to the label, or an
up/down caret.

### 4.5 The centre must stay clear — and it currently is not

There is **no single written law**; there are four expressions of one, and the strongest is about the
top rail. `hud.styles.js:525-527`: *"⚠ THE TOP CENTRE IS ALREADY OCCUPIED. The score/mode bar lives
here too, and the dial landed straight on top of it. The bar yields."* On phone, `hud.styles.js:896-899`:
*"It moves out of the centre (that is the fire thumb)."* The vertical budget for the bottom column is
`hud.styles.js:62-65`. And the vignette (`:5`) is the geometric version.

**The measured state of the centre column today** — every one of these is `left:50%`:

| Element | Y | Cite |
|---|---|---|
| `.modebar` | `top:12px` (126 with sundial) | `hud.styles.js:160`, `:528` |
| `.foe` | `top:16px` | `:84` |
| `.combo` | `top:88px` | `:154` |
| `.announce` | `top:20%` | `:165` |
| `.kobanner` | `top:34%` | `:12` |
| `#hThrowReach` | `top:57%` | `hud.js:624` |
| `#hInteract` | `bottom:19%` | `hud.js:685` |
| `#hTranscript` | `bottom:8%` | `hud.js:708` |
| `.hands` | `bottom:112px` | `hud.styles.js:66` |
| `.cityplate` | `bottom:108px` | `:572` |
| `.charge` | `bottom:96px` | `:108` |
| `.slots` | `bottom:16px` | `:50` |

**The genuinely clear zone is only `top:34%` → `bottom:19%`.** On an iso camera that is fine — it is
empty floor. On a chase camera that band is where the character and the crosshair live, and
everything above and below it is a wall of chrome around the exact object you are looking at.

**Proposal:** rotate the bottom-centre block into a **bottom-right column** (the hint panel's corner,
which is collapsing to a chip 18 s in anyway) — slots, then hands above them, then the ki-charge read.
Keep the player panel bottom-left. Reserve **`top:30%` → `bottom:26%`** as a hard exclusion zone, and
put `#hInteract` and `#hThrowReach` **below** it rather than inside it.

⚠ **And two z-order defects to fix while doing it**, both from DOM order in `_build`
(`hud.js:181-243`) where most elements declare no z-index:
- `announce` is child 6 and `dmgwrap` is child 11 — so **damage numbers paint over the announce
  banner**. In PowerWorld, where a tier-up announce lands in the middle of heavy trading, that is
  worse.
- `#plMood` is appended to **`document.body`** at z-index 21 (`hud.js:764`, `:767`) while the panel it
  belongs to lives inside `#hud` at 20 — so it is in a different stacking layer than its own panel
  and sits **below** `#touch` (24) and `#comicLayer` (26).

### 4.6 The comic safe area must be re-derived

`comic._safe()` (`comic.js:246-256`) hard-codes the city HUD's footprint:

| Rail | Desktop | Comment |
|---|---|---|
| `x1` | `W − 258` | *"the controls / kit rail on the right"* (`:251`) |
| `y1` | `H − 118` | *"the player panel and mode bar along the bottom"* (`:252`) |
| `lx` | `356` | *"the player panel's right edge, bottom-left only"* (`:253`) |
| `ly` | `H − 210` | the bottom-left notch |

Those numbers **are** the Ascendants HUD. If PowerWorld moves the slots to the right rail (4.5),
every balloon and SFX will avoid a rail that is no longer there and drift into the one that is.
PowerWorld needs its own safe rect.

⚠ Three existing defects in `_safe()` found while checking, all pre-existing:
- **Under-reserved bottom-left:** `ly = H − 210`, but `#plMood` sits at `bottom:250px` (`hud.js:764`)
  — 40px above the notch.
- **Under-reserved right:** `x1 = W − 258`, but the hint panel is 284 max-width + 18 inset = 302.
- **No tablet branch:** `_safe()` tests only `body.phone` (`:248`), while `TABLET_CSS` lifts the panel
  to `bottom:190px` and the kit to `bottom:150px` (`hud.styles.js:923-924`).
- Stale comment: `:252` says *"the player panel and mode bar along the bottom"* — the mode bar is at
  the **top** (`hud.styles.js:160`). The 118px is really the slots/charge/hands/nameplate stack.

---

## 5. THE COMIC LAYER

### 5.1 Decision: keep it, and lean harder — with three concrete changes

**The genre argument is decisive and it runs the opposite way to the print argument.** Print is a
*journalistic* claim and PowerWorld has no press (§3.1). Lettering is a *comic* claim, and PowerWorld
is the more comic-book of the two dimensions. SFX over a connecting punch is the genre's native
punctuation; a DBZ brawler with no lettering is the thing that would look wrong.

**And it is already wired to the right place.** `sfx()` (`comic.js:230-241`) is driven from
`game.onHit` — the choke point every present and future heavy blow already routes through — for hits
≥14 near the player, rate-limited to ~1 per 0.42 s, never for DoT ticks. Two things follow that make
the system *better* in PowerWorld with no change at all:

1. **The rate limiter will fire less and each word will land harder.** PowerWorld's hits are bigger
   and less frequent than a city gunfight's, so the 0.42 s throttle stops eating words. The device
   improves by moving.
2. **The melee feel pass already made a haymaker always letter**, regardless of damage
   (`melee.js:141` sends `heavy`/`haymaker`; the reasoning is in `CLAUDE.md` — the comic gate was
   damage-only, so the punch that most deserved the loudest tell was the one most likely to fall
   under the threshold). PowerWorld is melee-heavy. Free.

The fonts are bundled offline under role names (`comic.css:21-28`, `ComicSFX` = bangers,
`ComicHeavy` = luckiestguy) with `font-display: block` and the reasoning at `:18-19`. No cost.

### 5.2 Change one: keep SFX and captions, restrict balloons hard

**A balloon needs a mouth to point at.** The tail is part of the outline — two stacked triangles so
the ink is one continuous line (`comic.css:53-56`) — and `comic.js:322` **drops the tail entirely**
when the speaker is beyond reach: `if (away > reach || it.tone === 'narrate') it.tail.setAttribute('d','')`.
`comic.js:243-245` explains an untailed balloon is a real convention (off-panel speech) and
`balloon.js` notes a hundred-pixel spike across the panel reads as a defect.

In PowerWorld there is nobody to talk to — no pedestrians, no reporter, no cops, no crowd. Two
fighters 200u apart on a chase camera means the reach check fails constantly. So of the nine tones
(`balloon.js:235`: `talk, yell, whisper, think, robot, alien, announce, weak, narrate`):

- **Keep `yell`** — the taunt on connect, the genre's whole vocal register.
- **Keep `weak`** — a hit reaction. `comic.js` already routes fear/sadness to it.
- **Keep `announce`** — tier-ups, the ten-count-equivalent, ceremony.
- **Keep `narrate`** (captions) — it is *designed* to have no tail (`comic.js:322`) and the caption
  furniture (drop cap, Ben-Day halftone, 1.2° rotation, `comic.css:155-178`) is a strong identity
  carry-over for an arrival card.
- **Drop `talk`, `radio`, `think`** — those are city tones. `radio` is square with a zigzag edge for
  *a voice arriving over a wire*; there is no wire.
- **`inverted`** stays available as a modifier (`comic.css:130-137`) — black fill for the voice you
  dread — which is exactly right for a boss line and composes with every shape.

### 5.3 Change two ⚠ — SFX size will break under perspective

`sfx()` anchors by **world point** (`comic.js:240`: `{kind:'sfx', world: pos}`) and sizes by
`opts.size || 32` scaled `(0.75 + power × 0.55)` (`:238`). Under an **orthographic** camera a world
point maps to a stable screen scale, so a fixed font size is correct. Under **perspective** it is
not: a punch at 30u and a punch at 300u would letter at identical size, and the near one should
dwarf the far one.

This is a **real bug the projection change introduces**, not a tuning preference. The fix is to scale
the font size by camera distance, clamped at both ends — and the clamp matters, because
`comic.js:236-237` records that a 46px base *"was a third of the screen once a ten-letter word was
scaled by power. A sound effect is punctuation on a panel, not the panel."*

⚠ And re-check the burst while there. `comic.css:201-204`: the burst is a **backing** sized to the
word, already fixed once for reaching 190 % and swallowing the balloon behind it, with **height
leading** because SFX are short and wide. PowerWorld will want larger SFX; that ratio needs another
look at the new sizes.

### 5.4 Change three — the safe rect

Covered in 4.6. `_safe()` must describe PowerWorld's HUD, not Ascendants'. Its consumers are the
52 %-of-safe-width word cap (`comic.js:144-145`), caption anchoring (`:215-226`), balloon clamping
plus the bottom-left notch test (`:289-298`) and the nine-candidate SFX placement search
(`:338-352`) — so one wrong rect quietly misplaces every element in the layer.

---

## 6. THE TRANSITION

### 6.1 The four candidates, assessed

| System | What it actually is | Verdict |
|---|---|---|
| **`hud.showEstablishing(plan, opts)`** `hud.js:1315` | A DOM card in three beats (HOLD → LIFT → GONE), z-index 64. Already has a **`sim` variant that BOOTS rather than arrives** in holo-cyan (`:1321-1335`: ENVIRONMENT PROJECTED / SUBJECT LIVE / SAFETIES ENGAGED) | **Use it — but as the ARRIVAL CARD, not the crossing.** A card is not a place. PowerWorld earns a **third variant**: not the city card, not the Danger Room's holo-cyan |
| **`hud._playTransit`** `hud.js:1119-1148+` | A 2D-canvas + DOM **loading screen** dressed as travel: 230 painted stars, a planet limb, a dashed route arc in the hero's own afterburner wake colours (`:1131-1132`), a typed kicker, "ANY KEY — SKIP TRANSIT" | **No.** Cheap and safe, and it is a *loading screen*. A dimensional door should be a place you pass through, not a progress bar |
| **`opening.playOpening`** `opening.js:32` | Ten cold-open variants on `game.mapCam` with `game.running = false`, ticking `_animate` on living fighters | **No.** Its entire vocabulary is journalistic — `casefile, broadcast, flyover, teletype, ladder, satellite, tape, siren, freeze, ledger` (`opening.js:30`). Nine of the ten are Ascendants-specific *by construction*: the casefile is a registry query, the broadcast replays KMK 9 footage, the ladder draws the police response rungs, the ledger is the Elo book |
| **`spaceflight.playSpaceFlight`** `spaceflight.js:1001` | A full 3D crossing rendered **through the game's own composer** | **This one.** See 6.2 |

### 6.2 Why `spaceflight.js` — five structural reasons, not aesthetic ones

1. **It swaps the RenderPass scene and camera.** `spaceflight.js:91-94`, verbatim: *"⚠ SWAP THE
   RENDER PASS, DON'T BUILD A SECOND PIPELINE. One line each way, and the crossing gets bloom +
   exposure + ACES for free. Restored in finish(), including on a skip."* **A dimensional door is
   exactly a scene swap.** This is the machinery, already written and already reasoned about.
2. **It already owns a `PerspectiveCamera`** — `spaceflight.js:84`, fov 52, near 0.1, far 60000. And
   PowerWorld's whole project *is* a perspective camera (`docs/POWERWORLD.md:81`). The crossing would
   be shot on the camera the destination uses, which is the correct answer both dramatically and
   technically: the projection change *is* the arrival.
3. **It already hides and restores the match HUD correctly** — `spaceflight.js:99-105`, hidden **by
   element**, restored exactly as found, with the rule that *an element that was already hidden must
   stay hidden* (the tutorial and the phone layout both hide things for reasons). That is a subtle
   correctness property nobody would get right twice.
4. **It already carries the party and the hero's own colours.** `makeParty` / `formationFor`
   (`spaceflight.js:73-75`) and a flyer's wake from its own `def.afterburner` — so a hero crosses
   wearing their own palette with no wiring, and ORIGIN customs work for free.
5. **It is already headlessly testable** — `{manual: true}` skips rAF entirely
   (`spaceflight.js:110`), stepped by hand. Every other candidate would need a harness built.

**What it does not have, stated plainly:** a route that is not a heliocentric AU ladder. `buildRoute`
(`planets.js:129-168`) takes planet ids and AU and returns `passes` keyed to trip fractions. A
dimensional crossing has no AU. But the class **builds its beats from the route** (`_buildBeats`,
`_placeFromBeats`) — so a PowerWorld crossing is *a beat set that is not a planet route*, which is an
**addition to a system built to take them**, not a fork. `planets.js:132-136` already handles a
target that is not a landable world (`{au: 123}` → `id: 'deep'`), so the shape for "a destination
that is not a planet" exists.

### 6.3 The proposed crossing — three beats, ~4.5 s, skippable

**Beat 1 — THE DOOR (≈1.2 s).** Hold on the city exactly as you left it for ~0.8 s, then the tear
opens. Reuse the **portal** vocabulary, which already builds a door pair with an orange/blue
convention (`game.placePortal`). ⚠ **Gold/amber or `--info` cyan. Never violet** —
`docs/POWERWORLD.md:140-141` names this as the precise place violet sneaks in, and `planets.js:74`
already made the same ruling for the space layer.

**Beat 2 — THE CORRIDOR (≈2.3 s).** Use the near-field debris streak layer that already exists and
was built for something else. `CLAUDE.md` (LEAVING EARTH) states the insight and the implementation:
*"SPEED AND VASTNESS FIGHT EACH OTHER… the stars stay nearly still and a NEAR-FIELD of debris rips
past inside the lane — the parallax between the two IS the sensation. One LineSegments draw, 2,200
streaks, and each streak's length is the distance covered that frame, so the blur is a readout of the
motion rather than an effect on top of it."*

That is the best asset in the project for a dimensional corridor, it is one draw call, and it is
already tuned (measured peak 6,858 u/s against a 2,576 average after a second ease was stacked mid-
lane). Swap the star field for the dome colours of the destination and the corridor writes itself.

**Beat 3 — THE ARRIVAL (≈1.0 s).** The camera falls in behind the shoulder and the perspective camera
**becomes** the game camera — the cut nobody has to author, because there is no cut. Then
`showEstablishing` with a **PowerWorld variant**: not the city's crime/safety/police-ETA card (none
of those exist there) and not the Danger Room's holo-cyan (this is a real place, not a simulation).
The caption furniture from §5.2 — drop cap, halftone, the 1.2° rotation — is the right typographic
voice for it.

⚠ **The return leg must exist and must not be the same cinematic reversed.** Coming back to a city
with police, witnesses and a news desk is a *heavier* arrival than leaving it. The space layer
already handles a return direction (`CLAUDE.md`: *"on a return leg Earth is the destination"*).

⚠ **The first frame of a match costs ~47 ms** (`CLAUDE.md`, THINGS THAT OUTLIVE THEIR MATCH: it
builds 86 geometries and compiles 4 programs) and *"the establishing card and opening cinematic sit
in front of exactly that."* The crossing must cover PowerWorld's build the same way, or the door
opens onto a hitch.

---

## 7. POWERWORLD — THE ONE-PAGE STYLE SHEET

> Read with §1: **the tokens, the two type voices, the hero accents and the no-purple law do not
> change.** Everything below is what a *place* changes.

### PALETTE

| Role | Value | Note |
|---|---|---|
| Zenith | `#090e1a` — `uTop (0.035, 0.055, 0.100)` | deep cold slate. Not black (that is orbit), not violet |
| Horizon band | `#4d331c` — `uHor (0.30, 0.20, 0.11)` | warm dust; the only warm thing in frame, and the reason a horizon reads at any camera pitch |
| Void below | `#050609` — `uBot (0.018, 0.022, 0.032)` | **new.** The lower hemisphere the iso camera never showed |
| Horizon glow | `#291705` — `uGlow (0.16, 0.09, 0.02)` at a fixed 0.20 | a **360° ring**, not a sun patch |
| Rock | `#8a7a68`, roughness 0.88, metalness **0** | ~28 % darker than the city's `#b9b1a2`. Metalness must stay 0 — high metal with no envmap renders near-black |
| Depth haze | the horizon colour, `FogExp2` density `0.00022` | fog colour **must equal** the horizon |
| Accent | **unchanged** — `--gold #ffd24a`, `--gold-deep #f5b21a` | one accent, both worlds |
| Energy | **unchanged** — `--info #7fe6ff` for ki/data; per-hero `colors.accent` for everything a fighter emits | four surfaces already agree cyan means energy; do not invent a second |
| Unused here | `--police`, `--broadcast`, `--stamp` | no law, no press. **Leave them defined.** Do not repurpose |
| Banned | purple / violet / magenta, hue 270–320 | KIVULI is the only exception in the project, and he is a fighter, not a world |

### LIGHT

- **Sky-dominant rig, not sun-dominant.** Hemi **1.70** (from 1.28) with ground bounce `#6e5f4e`;
  sun **1.15** (from 1.8) at `#ffd8b0`; ambient **0.32** (from 0.5).
- **Rim does more work**, because the background is brighter: scene rim **1.05** (from 0.75), dropped
  to `y = 40` so it catches a fighter's underside — which a chase camera sees constantly.
- **An uplight sells the void**: the existing kick moved to `y = −60`, intensity **0.35**.
- **Fighter rim** `_rimK` **1.25**, power **2.1**, accent mix **0.35** toward `#bcd8ff` (from 0.55) —
  the accent is the only identity cue left, so lean on it.
- **The clock is pinned** at `dayT = 0.30` (golden hour's peak). No day/night, no window emissives, no
  streetlights, no golden-hour drift mid-fight.
- ⚠ **Sun must move up.** At `y = 200` with `shadow far 520`, a fighter above 200 is above the light
  and casts nothing — and the ceiling is 320. `(150, 320, 90)`, near 60 / far 900, shadow half-extent
  **64** (from 110).
- **THE LIGHT COUNT NEVER CHANGES.** Every number above is an intensity, colour or position on a
  light that already exists. Adding one rebakes every material in the scene.

### SKY

- Same dome mesh (`SphereGeometry(900, 24, 16)`, BackSide), same shader, **one program**.
- Two structural additions, both one line: a **lower-hemisphere colour**, and a **`uRing` factor**
  that swaps the sun-side glow dot for `pow(1 − |n.y|, 8)`.
- The sky is the **brightest thing in frame**. That is what makes an arena feel open, and it is why
  the ground goes down in value.

### GROUND

- Keep the **112² subdivision** — craters, trenches, `resetTerrain` and the whole GeoMod path come
  free, and PowerWorld is where the biggest hits land.
- **All surface detail goes in the texture.** One plane, `sinkSurface()`. A perspective camera at
  close range makes z-fighting far more visible than iso ever did.
- Any genuine decal takes a rung from `GROUND_LAYER` (`shadow 0.05 · stateRing 0.35 · bandRing 0.55 ·
  faceWedge 0.75 · mark 0.95 · spacing 1.15`; `DECAL_LIFT 0.35`). **Never invent a small number.**
- Run `world.auditSurfaces()` after any ground work.
- No grass, no trees, no lawns, no litter, no birds — and this is **derived**, not special-cased:
  `worldEnv` already returns `{air, life}` and the existing gates read it.

### VFX

- **Energy is the only fully saturated thing in the frame.** That is what `saturation −0.04` plus
  `vibrance 0.50` buys: the rock and sky lift, the auras do not.
- **Bloom headroom is a budget**, and exposure **1.12** (from 1.28) is how it is paid for. A clipped
  colour has no shape left.
- **The impact frame is one frame** and it counts frames, not seconds. It hangs off `game.onHit`, so
  every present and future heavy blow already gets it.
- **Speed lines** radiate from the world point of the blow, projected — strengthened at the call site,
  not in the preset.
- Beams keep the **BUILD × TEMPER** language (`ray · hose · torrent` × `steady · helix · kink · roil ·
  crystal · sinuous · surge · churn`) and the sheath/core two-colour anatomy. A dimension is not a
  reason for a new beam vocabulary.

### LOOK PRESET — **ARENA**

```
ink 0 · halftone 0 · levels 9 · grain 0.10 · tilt 0 (locked)
dither 0.28 · grade 1 · vibrance 0.50 · saturation −0.04 · fetch 0
```
- **Anime devices in, press devices out.** Cel palette, dither, impact frame, speed lines: yes.
  Ink and halftone: no — one is noise on thin bright subjects, the other would not fire.
- **Grain 0.10 stays on purpose.** It is the one thread that keeps the two dimensions looking like one
  product.
- **`fetch: 0`** means the preset cannot be degraded by the adaptive budget. That is the right
  property for the Steam Deck target and it falls out of the design.
- **`splash` (SPLASH PAGE) still works here** for screenshots. **`diorama` is Ascendants-only** —
  tilt-shift is a screen band, correct for a fixed iso camera and wrong for one that pitches.

### HUD

- **Drop:** radar · news PiP · city nameplate · wanted row · sundial · the city's hint text.
  **Reduce:** the feed to three lines.
- **Keep:** player panel (bottom-left) with hp / **ki** / DRAINED / OVERDRIVE / guard / level / tier ·
  wounds chip · mood chip · slot chips with their glyph + range **word** · hands row · damage numbers ·
  hit-direction arcs · off-screen foe arrow · column chips · the **in-world** altimeter tag and the
  ground markers · KO banner / announce / combo · the vignette.
- **Do not rebuild the four-rung ALT ladder.** It was deliberately removed and moved into the world,
  for exactly the reason PowerWorld cares about: you cannot look away from your character while flying.
- **Build:** a perspective-safe lock reticle · **target health at the target** (extend the column chip)
  · a **ki-charge read** (`chargingKi` has no HUD surface at all today) · **altitude on the foe arrow**
  · floating rock at band heights so the world is the ruler.
- **THE CENTRE IS RESERVED: `top:30%` → `bottom:26%`.** The character sits low-centre and the aim point
  is dead centre. Move the bottom-centre column (slots / hands / charge) to the bottom-right rail.
- Re-derive `comic._safe()` for the new rails, or every balloon and SFX is placed against a HUD that
  is not there.

### TYPOGRAPHY

- `--f-display` **Rajdhani** speaks; `--f-mono` **Cascadia** reports numbers. Never mix the roles.
- Small type from the scale only: `--t-micro 8.5` → `--t-lg 15`. Radii from `--r-1 4` → `--r-pill 20`,
  nothing in between.
- Lettering uses the **role** names — `ComicLetter`, `ComicSFX`, `ComicHeavy` — never a family name.
  (`'Bangers'` silently falls back to Rajdhani and looks almost right.)
- **Balloons: `yell` · `weak` · `announce` · `narrate` only**, plus `inverted` as a modifier. `talk`,
  `radio` and `think` are city tones — there is nobody to talk to.
- SFX must **scale with camera distance** under perspective, clamped at both ends. A sound effect is
  punctuation on a panel, not the panel.

---

## 8. WHAT I COULD NOT VERIFY

**Nothing here was rendered.** I did not run the game, take a screenshot, or measure a frame. Every
current value is read from source with a line number; every proposed value is reasoned from those.
Specifically:

1. **No proposed number in §2 or §3 has been seen on screen.** The palette, the light intensities, the
   exposure and every preset dial are arithmetic and argument. This project's own record says that is
   not enough: the boxing ring shipped with six green assertions and a ring **four times too big**
   (`CLAUDE.md`, THE RING), and `baseroom.js` records that *no assertion can see "too dark."*
2. **The high-flier shadow problem (§2.2.1) is reasoned, not observed.** Sun at `y=200`, shadow
   `far 520`, ceiling 320 — the arithmetic says a fighter above 200 is above the light. Whether the
   shadow vanishes, inverts or merely softens must be looked at. My fix numbers are ⚠ GUESS.
3. **The perspective camera does not exist**, so nothing about it could be tested: FOV, near/far,
   how `screenPosOf` and `toScreen` behave for the whole HUD in a live fight, whether the ground-laid
   soft reticle is salvageable, whether `sinkSurface`'s polygon offset is sufficient at close range.
   All of §4.4 #1 and §5.3 are predictions about a projection nobody has run.
4. **`applyWorldGrade` has zero callers** — I verified the grep, not that calling it produces the
   effect I describe. The `#c98a4a` lift/gain figures are computed by hand from
   `printpass.js:293-294`, not sampled.
5. **`_dnc.sky` does not exist as a key** (keys enumerated at `world.js:131-139`), so
   `applyWorldGrade()` with no argument falls to `'#ffffff'`. I did not run it to confirm the
   resulting identity-ish transform.
6. **Turning the fog-of-war plane off:** I traced that `game.js:1223` sets `e._vis = 1` when `fov` is
   off and that gameplay LOS is the separate `game.canSee`, but I did not run a match with it off to
   confirm no HUD surface or AI path regresses.
7. **Steam Deck cost is unmeasured.** The fetch-count argument is `settings.js:100-109`'s own
   reasoning, and that note says explicitly the effects were **below the noise floor at 720p on an
   RTX 4090**. An RDNA2 APU is a different machine and I have **no number** for it. My claim that 8
   fetches/pixel is "a real number there" is ⚠ GUESS.
8. **PowerWorld has no arena size, band set or ceiling**, because none exist. Every `BANDS` figure
   quoted (`ground 8 · building 150 · sky 260 · ceiling 320`, `core/util.js:52`) is the **flagship's**.
   The §7 claim that floating rock at band heights fixes the altitude read assumes bands that have
   not been chosen.
9. **Decisions A–E in `docs/POWERWORLD.md:150-154` are open**, and this document quietly assumes one
   answer to A: that PowerWorld is at least THEATER- or PLANET-shaped, i.e. that it has its own sky
   row, band set, grade and preset override. **If it ships as a MODE, the sky/band/grade wiring has a
   different door and §2 needs rerouting** (though the values would survive). I did not decide A.
10. **The `uRing` / `uBot` shader change is untested.** I assert it keeps one program because it adds
    uniforms rather than a second material — but I did not compile it, and a `#define`-style branch
    *would* fork the program. Worth confirming against the light-count-law family of stalls.
11. **I did not read all of `hud.js` (2,030 lines) or `game.js`.** The HUD inventory is from targeted
    greps plus the full CSS, so an element with no CSS rule of its own could have been missed.
12. **The audio side is entirely out of scope** and I did not look at it. A dimension with no city bed,
    no traffic, no crowd and no sirens is a large open question — `soundscape._direct`'s five-state
    ambience director reads police heat and civilian panic, none of which exist there.

### Documentation drift found along the way (not code bugs — worth fixing in `CLAUDE.md`)

| Claim | Reality |
|---|---|
| `CLAUDE.md:2851` — *"The tokens live in `index.html :root`"* | They are `src/styles/tokens.css:5-54`, linked from `index.html:10`; `tokens.css:3` says they were moved so `atlas.html` could share them |
| `CLAUDE.md:2921-2923` — *"**ALT ladder** (`hud.updateAltitude`)… `#hAlt`"* | Neither exists anywhere in `src/`. Removed 2026-07-25 and moved in-world; the tombstone is `hud.js:540-545`. An orphaned CSS heading survives at `hud.styles.js:608` |
| `CLAUDE.md:1562` — *"`hud.updateHands` is called and does not exist yet"* | It exists and is complete at `hud.js:1659-1703`, called every frame at `:1942` and from `main.js:432`. `docs/BACKLOG.md:309` already records it closed. The mobile chip strip the same line calls unbuilt is at `hud.styles.js:900-903` |

### Latent code issues found while reading (all pre-existing, none introduced here)

| Issue | Where |
|---|---|
| `applyWorldGrade` has **no callers** — the per-world grade is dead code | `world.js:182-185`; only `setSkyWorld` is called, `main.js:216` |
| Its fallback reads `_dnc.sky`, a **key that does not exist** | `world.js:183` vs `:131-139` |
| **`chargingKi` has no HUD surface at all** | set `entity.js:1145-1148`, read nowhere outside `entity.js` |
| Sun/shadow geometry cannot light a fighter above `y = 200` while the ceiling is 320 | `world.js:88`, `:96`; `core/util.js:52` |
| **Damage numbers paint over the announce banner** (DOM order, no z-index) | `hud.js:181-243` — `announce` is child 6, `dmgwrap` child 11 |
| `#plMood` is appended to `document.body` at z-21, below `#touch` (24) and `#comicLayer` (26), while its own panel is inside `#hud` (20) | `hud.js:764`, `:767`; `index.html:72`, `:77`; `comic.css:40` |
| `.cityplate` `bottom:108px` collides with `.hands` `bottom:112px`, both `left:50%` | `hud.styles.js:572` vs `:66`; the budget comment at `:62-65` does not account for it |
| `comic._safe()` under-reserves bottom-left (`ly = H−210` vs `#plMood` at `bottom:250`), under-reserves the right rail (`x1 = W−258` vs a 302px hint panel), has **no tablet branch**, and its comment names the mode bar as bottom when it is top | `comic.js:246-256`; `hud.styles.js:923-924`, `:160` |
| Band thresholds hard-coded instead of reading `BANDS` | `hud.js:668` (260/150), `hud.js:1506` (260/150/8) |
| `.slot .sfx` CSS lives inside the Steam-Deck-only `DECK_CSS` export and is **unscoped** (no `#hud` prefix) though it applies everywhere | `hud.styles.js:947-949` |
| `applySettings`'s preset `for…in` writes `SETTINGS.fx_n` / `fx_d` from the `_n` / `_d` label keys | `settings.js:164-165` vs `:116-128` |

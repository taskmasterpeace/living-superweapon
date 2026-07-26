# POWERWORLD — THE WORLD LAYER AND THE DOOR

Planning document, 2026-07-26. Every claim carries `file:line`. Guesses are marked **[GUESS]**.
What I could not verify is in §6 rather than smoothed over.

## THE THREE HEADLINES, BEFORE ANYTHING ELSE

**1 · The world layer is ~80% built and the Moon is the right precedent.** `plan.biosphere` /
`plan.atmosphere` (`src/data/cityplan.js:686`) already have four consumers and POWERWORLD is a fifth.
The gap is one plan-kind function, not an architecture.

**2 · ⚠ THE FLIGHT CEILING IS ACTIVELY HOSTILE TO A BFP STAGE, and it is not where you'd look.**
`world.fitBands()` (`src/engine/world.js:1798-1819`) **measures the tallest cover box after the build
and rescales the ceiling to 1.9× it** (`BAND_SHAPE`, `:1796`), overwriting `plan.bands` at `:1817`. A
stage made of rock outcrops (11–27u, `src/engine/citytiles.js:1189-1196`) would get a hard flight lid
around **170u** where the flagship city has **328** (`src/data/cityplan.js:975`). Build POWERWORLD
without touching that and you get an arena with a *lower sky than downtown*. This is the load-bearing
new work and it is two lines.

**3 · ⚠ THE RESEARCH ROUTE INTO POWERWORLD IS NOT "PROSE-ONLY" — IT IS SIX LINKS OF DEAD CODE.** The
two rows the owner named are prose (`src/data/education.js:375`, `:381`), the `RESEARCH` schema has
**no prerequisite field at all**, and beyond that: `applyResearch` has **zero callers**,
`researchOptions` has **zero importers**, `heldMajors` always returns `[]`, `org.hire` /
`base.startBuild` / `base.tickWeeks` have **zero callers**, and there is **no `startResearch` verb and
no `owned` field anywhere in the repo**. Nobody can spend a week on research today. §4 enumerates all
six. The *good* news is that the gate facility already derives itself — see §4.2.

---

# 1 · HOW TO GENERATE A BFP-STYLE STAGE WITH WHAT EXISTS

## 1.1 The knobs that actually exist

`generatePlan(city, seed, opts)` — `src/data/cityplan.js:631`. Every `opts` it reads, from the
constructor block `:635-693`:

| opt | line | effect |
|---|---|---|
| `humanH` | 635 | the METRIC — people size, 4.8–19.2, default 9.6 |
| `roomScale` | 636 | interior room scale 0.7–1.6 |
| `popType` | 670 | overrides the sheet's tier → drives `N` and `RURAL_POP` |
| `N` | 671 | grid side, **hard-clamped 2..9** |
| `cell` | 672 | cell size, `CELL_RANGE = [32, 240]` (`:21`) |
| `waterCols` | 675 | coastline columns 0..N-1 |
| `world` | 685 | world id, default `'earth'` |
| `biosphere` | 686 | `opts.biosphere !== false` — **the life flag** |
| `atmosphere` | 686 | `opts.atmosphere !== false` — **the air flag** |
| `relief` | 690 | a `RELIEFS` key, through `reliefFor` |
| `biome` | 691 | `forest`/`jungle`/`mountain`/`desert`/`grass`/`tundra` |
| `landmarks` | 795 | pinned `{t, r, c}` — see caveat below |

`plan.arena = N * cell / 2` (`:681`) → reachable arena half-extent **32 … 1080**.

**`worldEnv(id)`** — `src/data/planets.js:89-94`, two derived booleans, no per-planet case:
```js
return { id, air: !!look.atmo, life: !!P.home };
```
`air` is literally "does `PLANET_LOOK[id].atmo` exist" (`:96-108`); `life` is "is this Earth" (`P.home`,
set only at `:17`). Moon `atmo: null` (`:100`) → no air. **Mars `atmo: '#e08a5a'` (`:101`) → air true,
life false — which is why Mars gets blown dust and no birds.** That is the posture POWERWORLD wants.

**What `biosphere: false` does today, all of it:**
- `src/data/cityplan.js:863-869` — `NO_LIFE_TILES` (`park`/`forest`/`farmland`, `:447`) struck to
  `plaza`, **before** `computeSockets`; `plan.rural = false`.
- `src/engine/world.js:986` — `_buildGreenery` returns immediately. **This is the line that actually
  makes it barren**, and `:981-985` says exactly why: trees are appended by *tile builders*, so
  striking the zoning alone is not enough.
- `src/engine/wildlife.js:96-98` → `_life`/`_air`; `_applyCounts` (`:134-140`) zeroes `nBirds` when
  `_life === false`, `nLitter` when `_air === false`.
- `src/engine/pedestrians.js:94` — `setCity(arena, waterX, air)` → `_reseed(air === false)` swaps the
  palette to pressure suits. **⚠ It does NOT reduce the count.** See §5.

**Roads fall away for free.** `WEIGHT` (`:394-398`) gives `farmland/forest/mountain/water = 0`,
`plaza = 1`; `classFor` returns `R_NONE` at `w <= 0` (`:478`) and `R_TRACK` at `w === 1` (`:479`).
`NO_RESCUE` (`:449`) exempts `water/forest/mountain/farmland/park/plaza` from the landlocked rescue
(`:526`). So **a map of nothing but `mountain` cells generates zero roads, zero streetlights, zero
parked cars**: lamps need `max(jn.n,jn.e,jn.s,jn.w) >= 2` (`src/engine/world.js:896`), cars need a
road edge `>= 2` (`:918-919`).
⚠ **`plaza` is weight 1, so a plaza-filled map gets dirt tracks.** Avoid `plaza` on a BFP stage.

**Relief is real; `mountains` is the biggest lever available.** `RELIEFS` (`:301-308`):
`flat 0 · coastal 14 · hills 16 · plateau 26 · valley 30 · mountains 54`. Shaped per kind in
`_buildRelief` (`src/engine/world.js:1486-1512`): `valley` = `h*0.4 + d²*1.35` (a bowl ringed by high
ground, `:1499`), `plateau` = `h*0.4 + (1-d²)*1.1` (a shelf, `:1500`), `mountains` =
`h*1.15 + d^1.6*1.5` (`:1502`).
⚠ **`reliefFor` downgrades `mountains`/`valley` → `coastal` whenever there is water** (`:321`) — a
POWERWORLD stage must pass `waterCols: 0`.
⚠ **`_padCells` LEVELS every non-`OPEN` cell to a terrace** (`src/engine/world.js:1570`), and its
`OPEN` set is `{water, park, farmland, forest, mountain}` (`:1573`). So **`mountain` is the only tile
in the library whose ground is left genuinely uneven** — `src/engine/citytiles.js:1181-1183` says so
outright. **Any new POWERWORLD tile must be added to that `OPEN` set** or the relief gets bulldozed
flat under it. This is the single easiest thing to get wrong.

## 1.2 Can `generatePlan` do it? No — but the gap is one function

Two hard blockers inside `generatePlan`:

1. **⚠ THE BASE FILL ALWAYS BUILDS A CITY.** `:820-837` — every cell the placement table left open
   becomes `commercial` or `residential` (or `farmland` when rural). There is no opt for "rock".
   On the Moon this is *masked*: a Village fills with `farmland`, which is then struck to `plaza`
   (`:863-866`). TRANQUILITY REACH looks barren by accident of that ordering, not because anything
   asked for barren ground.
2. **THE PLACEMENT TABLE RUNS UNCONDITIONALLY.** `:783-793` walks all of `PLACEMENT` (`:217-265`);
   landmarks run *first* and take the best ground (`:773-781`). Nothing suppresses either.

`opts.landmarks` is not the escape hatch — `:795-803` stamps each entry `landmark = true` (`:802`),
which exempts it from the density budget (`:849`) and marks it for `districtNameAt`. Painting 81 cells
that way is a hack.

**The clean answer is a new PLAN KIND, and it is fully precedented.** `galleryPlan()`
(`:983-1013`) is the template: it hand-builds `plan.cells` and then calls the three derivations by
hand — `computeSockets` (`:1009`), `buildRoads` (`:1010`), `computeBands` (`:1011`) — with a comment
at `:1004-1008` explaining that *skipping* them is what broke it the first time. `thresholdPlan()`
(`:972-980`) is the other precedent: a hand-authored plan with `cells: null` and **authored `bands`**,
routed to a bespoke builder by `plan.flagship` (`src/engine/world.js:796-799`).

→ **`powerworldPlan(stage, seed)`, ~40 lines, beside `galleryPlan`.**

## 1.3 What genuinely has to be NEW

| # | New thing | Size | Why it cannot be a knob |
|---|---|---|---|
| **N1** | `powerworldPlan(stage, seed)` | ~40 lines | base fill + placement table always build a city (§1.2) |
| **N2** | a `t.dimension` branch in `hud.resolveTheaterPlan` | ~6 lines | it is the one branch point; `t.gallery` and `t.planet` already sit beside it (`src/engine/hud.js:302-325`) |
| **N3** | **authored bands that survive `fitBands()`** | ~2 lines | `fitBands` overwrites `plan.bands` from a measurement. **§2 — the important one** |
| **N4** | a `WORLDS` row for the dimension **+ teaching `main.js:216` about it** | 1 row + 1 line | `setSkyWorld(id)` → `skyFor(id)` → `WORLDS[id]` (`src/data/environments.js:44`). ⚠ `main.js:216` is `setSkyWorld((t && t.planet) \|\| 'earth')` — **without a `t.dimension` case POWERWORLD gets Earth's sky** |
| **N5** | a **`barrens`** tile — open ground, 0–1 cover | ~25 lines | there is no empty-ground tile. Nearest are `plaza` (paved, weight 1 → tracks) and `park` (struck when lifeless). **This is the tile that makes air combat possible** |
| **N6** | a **`canyon`** tile — `trench()` cut + **segmented** destructible walls | ~60 lines | §3. `mountain` puts loose boulders on scree; it has no wall |
| **N7** | a **`mesa`** tile — a big standable block with a rim | ~30 lines | `tower()` clamps to `TILE_MAX_H` and builds a *building* with window UVs |
| **N8** | `plan.people === false` honoured in `peds.setCity` | ~2 lines | `worldEnv` only re-skins pedestrians; nothing removes them (§5) |
| **N9** | `TILE_INFO`/`VARIANTS`/`TILE_MAX_H`/`NO_ROTATE` rows for N5–N7, **and adding them to `_padCells`'s `OPEN` set** | data | `validateTiles()` (`src/data/cityplan.js:431`) exists to catch exactly a type that misses one |

Everything else is a knob.

## 1.4 SIX NAMED STAGES, with exact knobs

All six share: `waterCols: 0` · `world: 'powerworld'` · `biosphere: false` · **`atmosphere: true`**
(air → wind, blown dust, weather: the **Mars** posture, not the Moon's) · `people: false` ·
authored `bands`.

| Stage | The fight it makes | `N` × `cell` → arena | `relief` | `biome` | Cells |
|---|---|---|---|---|---|
| **THE NEEDLES** | rock spires as cover in open air — the only stage where a beam has something to break | 7 × 96 → **336** | `mountains` (54) | `mountain` | 100% existing `mountain` — **buildable with ZERO new tiles** |
| **THE ASH FLATS** | pure air combat; nothing to hide behind, the whole fight is spacing and altitude | 8 × 96 → **384** | `flat` (0) | `desert` | 100% `barrens` **[N5]** |
| **THE BROKEN SPINE** | canyon fighting — walls you get driven through, corridors where sightlines die | 7 × 96 → **336** | `hills` (16) | `mountain` | a straight ROW of `canyon` **[N6]** across the middle (the metro-row trick, `src/data/cityplan.js:809-818`, which is how adjacent cuts join into one continuous trench), `barrens` either side |
| **THE STONE TABLE** | verticality with no buildings — a raised mesa you get knocked off | 6 × 128 → **384** | `plateau` (26) | `mountain` | centre 2×2 `mesa` **[N7]**, rim ring `mountain`, outer `barrens`. ⚠ pair with `ms.ringOut` (already built, `src/engine/game.js:581-583`) |
| **THE BASIN** | a closed bowl; high ground is the prize and the walls are the boundary | 7 × 96 → **336** | `valley` (30) | `mountain` | rim `mountain` (existing tile, unmodified), floor `barrens` |
| **THE CRATER RIM** | a real bowl in the terrain plus a standable rim; slams down into the pit | 6 × 128 → **384** | `plateau` (26) | `desert` | `barrens` + `_pendingPits` (the mining mechanism, `src/engine/world.js:946`) + `mountain` rim |

**Build THE NEEDLES first** — it needs **zero new tiles**, so it proves N1–N4 (plan kind, theater
branch, bands, sky) in isolation before any art exists. `mountain` gives 5–7 dodecahedron outcrops of
11–27u registered as cover at hp 300 (`src/engine/citytiles.js:1189-1197`) plus 14 scree stones, and
the ones over 2.3u become **throwable 0.5t rocks** (`:1198-1203`) — the weight ladder works on
POWERWORLD for free.

⚠ **Scale reality check, and it is sobering.** At 1u ≈ 0.19m, arena 384 is 768u across = **146m**.
The flagship city is 91m. Even the maximum reachable arena (1080 → 2160u → **410m**) is a large field,
not a wasteland; a DBZ/BFP battlefield reads as kilometres. **The real lever for vastness is not the
arena, it is `plan.metric.humanH`** (`src/data/cityplan.js:635`, floor 4.8) — shrinking the people
doubles the apparent world, and nothing in the repo has ever used it that way. Flag as a design
question, not a decision.

---

# 2 · THE ARENA SIZE AND THE FLIGHT CEILING

## 2.1 Current values, verified

| thing | value | where |
|---|---|---|
| flagship `ARENA` | **240** | `src/engine/world.js:26` |
| instance mirror (radar/entity/ragdoll read this) | `this.ARENA` | `src/engine/world.js:31` |
| generated arena | `N * cell / 2` | `src/data/cityplan.js:681` |
| `N` clamp | **2 … 9** | `src/data/cityplan.js:671` |
| `cell` clamp | `CELL_RANGE = [32, 240]` | `src/data/cityplan.js:21, 672` |
| → **max arena** | **1080** | derived |
| band defaults | `ground 8 · building 150 · sky 260 · ceiling 320` | `src/core/util.js:52` |
| flagship bands | `ground 8 · building 158 · sky 268 · **ceiling 328**` | `src/data/cityplan.js:975` |
| `bandOf(y)` | 4 rungs off `BANDS` | `src/core/util.js:57` |
| `ALT_BANDS` (presentation) | `get max()` off `BANDS` | `src/engine/entity.js:105-109` |
| **flight lid** | `if (pos.y > BANDS.ceiling)` clamp; lit burner → `ceiling + 90` | `src/engine/entity.js:1377-1382` |
| **`maxBand`** | `def.maxBand ?? (flightTier >= 3 ? 3 : 1)` | `src/engine/entity.js:1247` |
| deck servo dock heights | band 2 = `building + (sky-building)*0.5`; band 3 = `sky + (ceiling-sky)*0.55` | `src/engine/entity.js:1250-1252` |
| depart gate | `pos.y > BANDS.ceiling + 44` | `src/engine/game.js:3145` |
| entity XZ clamp | `world.ARENA - 4` | `src/engine/entity.js:1390` |
| ragdoll clamp | `world.ARENA - 3` | `src/engine/ragdoll.js:143` |

## 2.2 ⚠ THE CEILING IS THE PROBLEM

**There are two band computations and the second one wins.**

1. `computeBands(plan)` — `src/data/cityplan.js:101-115`. Reads `TILE_MAX_H` over the placed types,
   adds the relief amp, hangs `sky = building + 110`, `ceiling = building + 170`.
2. `world.fitBands()` — `src/engine/world.js:1798-1819`, called from `rebuildCity` **after** the build
   (`:805`). Walks `coverAll` + `interiors` for the tallest `top`, then (`BAND_SHAPE`, `:1796`):
   ```
   building = top + 10 ;  sky = top * 1.45 ;  ceiling = top * 1.9
   ```
   and **writes `plan.bands = b`** (`:1817`), destroying whatever the plan authored. It bails *only*
   when there is no cover at all: `if (!(top > 0)) return null` (`:1802`).

Run POWERWORLD through it. `mountain` registers via `reg(W, b, x, z, s*0.8, s*0.8, s*1.1, 300)`
(`src/engine/citytiles.js:1196`) with `s ∈ [11,27]`; `reg` scales `top` by `mesh.scale.y`
(`:206-208`, set to `0.7..1.3` at `:1195`) and adds the terrace `gy` (`:208`). The tallest thing on
THE NEEDLES is roughly **38u of rock** plus whatever the relief lifted it to.

**[GUESS — computed from the code, not measured in a running page]** on a `mountains` stage landing
`top ≈ 90`: `building 100 · sky 130 · ceiling 171`. On THE ASH FLATS (no cover) `fitBands` returns
null and `computeBands` gives roughly `building 28 · sky 138 · ceiling 198`.

**Either way POWERWORLD's sky is about half the flagship city's.** For a mode whose entire premise is
open air combat, that is not a rough edge — it is the feature not working.

**And it compounds twice more:**
- **`maxBand` caps tier-2 levitators at band 1** (`src/engine/entity.js:1247`) — the documented
  levitator nerf. In a city that means "you live below the skyline"; on bare rock, band 1 ends at
  `top + 10`, so **RIME, WARDEN, PYRE, RIFT, TITAN and KIVULI would be pinned ~100u off the deck in
  the one arena built for flying.**
- **The deck servo docks you** at `sky + (ceiling-sky)*0.55` unless the burner is lit (`:1272`) — so
  with both compressed, "cruising altitude" on POWERWORLD is a few dozen units up. This is the same
  trap that made LOW ORBIT unreachable and was fixed by exactly one exception at `:1269-1272`.

## 2.3 What has to change

**N3 — the minimum honest fix is a LOCK, not a rewrite.** `fitBands()` gains an early return when the
plan says its bands are authored:
```js
if (plan.bandsLocked) return null;      // one line, at src/engine/world.js:1798
```
This mirrors how `plan.flagship` opts out of `_buildGenCity` (`src/engine/world.js:796-799`) and how
`thresholdPlan` already ships authored bands (`src/data/cityplan.js:975`). Same shape as the
precedent, changes nothing for the 1,050 cities, and it is checkable.

**A POWERWORLD stage should author something like** `{ ground: 8, building: 60, sky: 340, ceiling: 620 }`
— a shallow GROUND/BUILDING pair (there is almost nothing to stand on) and a genuinely deep SKY lane.
**[GUESS: those numbers are mine and want flying, not arithmetic.]**

**`maxBand` is a WORLD RULE decision, and there is a precedent for exactly this shape.** `BOXING.pure`
writes `f.noPowers` onto every fighter in `setup` and rewrites `ai.range`/`aggro`/`flyTend`
(`src/engine/game.js:132-143`) — one flag, read at choke points that already exist. POWERWORLD can
raise `maxBand` the same way, in the same place, so a levitator gets the whole sky *in this dimension
only*. ⚠ **Put this to the owner rather than guessing: it partially undoes a documented balance
ruling** (`docs/BALANCE.md`).

## 2.4 What BREAKS when ARENA grows — computed from the source

From `SEG = 22*N + 2` (`src/engine/world.js:825`), `heightAt`'s mapping (`:1387-1397`), and
`_fitFog`'s `need = max(700, arena*2 + 140)` (`src/engine/fog.js:80-86`) against a fixed
`FOG_RES = 384` (`src/engine/fog.js:16`):

| N × cell | arena | across | terrain verts | vertex spacing | fogExt | fog texel |
|---|---|---|---|---|---|---|
| 5 × 96 *(flagship-equivalent)* | 240 | 480u / 91m | 12,769 | **4.29u** | 700 | 1.82u |
| 7 × 96 | 336 | 672u / 128m | 24,336 | 4.31u | 812 | 2.11u |
| 8 × 96 | 384 | 768u / 146m | 32,041 | 4.31u | 908 | 2.36u |
| 9 × 96 | 432 | 864u / 164m | 40,401 | 4.32u | 1,004 | 2.61u |
| 6 × 128 | 384 | 768u / 146m | 18,225 | 5.73u | 908 | 2.36u |
| 9 × 160 | 720 | 1440u / 274m | 40,401 | **7.20u** | 1,580 | 4.11u |
| 9 × 240 *(max)* | 1080 | 2160u / 410m | 40,401 | **10.80u** | 2,300 | **5.99u** |

**SAFE — reads `world.ARENA` live and scales correctly:** `_fitFog` (`src/engine/fog.js:80-86`, scales
the plane and `uOccExt` together) · radar (`src/engine/hud.js:1470`, `sc = (R-9)/A`) · entity clamp
(`src/engine/entity.js:1390`) · ragdoll (`src/engine/ragdoll.js:143`) · `heightAt`
(`src/engine/world.js:1390`, `k = S/(A*2)`) · wildlife bounds (`src/engine/wildlife.js:88-90`) ·
streetlights and parked cars, which are gated on the road graph and cannot scatter on a weight-0 map.

**BREAKS — five real problems:**

1. **⚠ TERRAIN RESOLUTION IS TIED TO `N`, NOT TO ARENA SIZE.** `SEG = 22*N + 2` caps at 200, so raising
   `cell` degrades vertex spacing linearly: 4.3u at cell 96, **10.8u at cell 240**. At 10.8u a
   `crater()` of radius 6 (`onSlam`'s ground crater, `src/engine/game.js:2198`) touches **0–2
   vertices** — craters effectively stop existing. For a slam-heavy mode that is the wrong thing to
   lose. **→ POWERWORLD must grow via `N`, never via `cell`.**

2. **⚠ `computeVertexNormals` SCALES WITH VERTEX COUNT AND CRATERS TRIGGER IT.**
   `src/engine/world.js:1710-1711` states the recompute is *"~12ms on the 112×112 grid"* — 12,769
   verts. At 9 × 96 you have 40,401, i.e. **≈3.2× → ~38ms [GUESS, extrapolated from the code's own
   figure]**. It is batched to once per frame via `_normalsDirty` (`:1712`), so it is a spike not a
   per-crater cost, but ~38ms lands close to the documented 50ms freeze threshold.
   **This is the single number that must be measured before committing to a grid size, and it caps
   POWERWORLD's arena more tightly than anything in the plan format does.**

3. **⚠ FOG OCCLUSION TEXELS GET COARSER THAN A WALL IS THIN.** `FOG_RES = 384` is fixed; at arena 1080
   that is **5.99u a texel**, and `refreshFogBoxes` rasterises the box *interior*
   (`src/engine/fog.js:98-100`). A 3u rock wall would fall between texels and stop occluding.
   Note the project already separates the two — fog *shading* is approximate, gameplay LOS
   (`game.canSee`) is exact — so this is a look bug, not a fairness bug. Keep arena ≲ 600.

4. **⚠ THE AI CANNOT FIND YOU ON A BIG MAP — the most under-appreciated one.**
   `ai.seeRange = 118 * visMult` and `hearRange = 150 * visMult` (`src/engine/ai.js:41-42`) are
   **absolute distances**, and `_searchGoal` patrols anywhere in `world.ARENA`
   (`src/engine/ai.js:268-276`). At arena 432 a bot sees 27% of the map's width; at 1080, **11%**. In a
   city, noise carries and cover funnels you; on an open plain neither applies. POWERWORLD needs
   either (a) close spawns, (b) a `plan.engageScale` multiplying `seeRange`/`hearRange`, or (c) a
   ruling that long approaches *are* the BFP feel (they arguably are — a DBZ fight opens with two dots
   closing). ⚠ **Invisible until someone flies the map, and made worse by keeping weather on**
   (`visMult` was measured at 113u → 68u in a storm).

5. **`_padCells` is O(verts × pads)** — `src/engine/world.js:1602-1613` loops every vertex against
   every pad: 40,401 × 81 ≈ 3.3M inner iterations at build. One-off, but it is part of the build spike.

**⚠ And a genuine latent inconsistency, worth fixing while you are here:** `_buildRelief` scales the
amp by `plan.scale` (`src/engine/world.js:1489`) and `computeBands` **does not**
(`src/data/cityplan.js:110-112`). At `cell: 240` the terrain is 2.5× taller than the bands assume. It
has been masked because `fitBands` overwrites the result — **locking the bands (N3) will expose it.**

**One free win:** the border parapets are `wh = 6` (`src/engine/world.js:843`) — a 1.1m kerb; the real
boundary is the clamp at `src/engine/entity.js:1396-1397`, which also fires `_slam`. `ms.ringOut`
(`src/engine/game.js:581-583`) can turn that wall into a **loss condition** instead — already built,
and arguably the right BFP rule for THE STONE TABLE.

---

# 3 · DESTRUCTIBLE TERRAIN FOR SLAMS

## 3.1 What already exists

**Terrain:**
- `world.crater(cx, cz, radius, depth)` — `src/engine/world.js:1696-1714`. Bowl + raised rim,
  accumulates into `_gh`, **clamped to `[base - 6.5, base + 1.4]`** (`:1707`). Batches its normals.
- `world.trench(cx, cz, hw, hd, depth, slope, ry)` — `:1631-1646`. Rectangular cut with arbitrary yaw,
  uses `min()` so it carves rather than accumulates, smoothstep walls and a flat floor. **No base clamp.**
- `_pendingPits` / `_pendingCuts` — queued by tiles, applied at `:946-947`, **then frozen into
  `_ghBase`** (`:945` before, `:956` after). This is how the metro and the mining pits survive
  `resetTerrain` (`:1745`).
- `world.heightAt` (`:1387`) is the real floor: `entity._physics` caches it as `f.groundY` (`:1346`)
  and lands on it (`:1363-1365`).

**Cover:**
- `game.damageBlock(c, amt, pos)` — `src/engine/game.js:1947-1954`. hp, dust, `setBlockCracks`, →
  `shatterBlock` at 0.
- `game.shatterBlock(c)` — `:1955-1980`. 11 tumbling chunks, masonry dust, scorch, a
  `crater(c.x, c.z, r*0.7, 2.2)`, mesh sinks over 0.5s. **`removeBlockFromCover(c)` is immediate**
  (`:1974`) — the collider is gone the same frame the collapse animation starts. Mesh hidden, not
  disposed, so `resetTerrain` restores it (`:1977`, `src/engine/world.js:1735-1739`).
- `game.worldImpact(pos, radius, power, src)` — `:1899-1932`. The explosion choke point: crater
  (gated `pos.y < 6.5 && (power >= 1.25 || radius >= 14)`, `:1900`), scorch, splash, news highlight,
  `noise`, cover damage with falloff (`:1909-1913`), car chains, ped collateral.

**Slams:**
- `entity._slam(game, speed, kind)` — `src/engine/entity.js:792-794`. Gated on **`launchT > 0`** (so
  flying into a wall yourself never hurts), `_slamCd` 0.45s, and `speed >= 30`.
- `launchT` is armed in `takeDamage` when `kmag > 30 || |launch| > 12` (`:699`).
- Wall hit: `:1415-1419` — push out on the least-penetration axis, `vel *= -0.3`, **then**
  `if (spd > 34 && c.hp != null) damageBlock(c, spd*0.55, …)`, then `_slam(game, spd, 'wall')`.
- Ground: `if (impact < -38) this._slam(game, -impact, 'ground')` (`:1375`). Border: `:1396-1397`.
- `game.onSlam(f, dmg, kind)` — `:2194-2203` (impact star, `crater(6, 1.2)` on ground slams, shake).
- `game.onRagdollImpact(f, spd, pos)` — `:2231-2240`, strength-scaled `crater(3.5 + str*0.55, …)`.

## 3.2 What "slammed THROUGH a canyon wall" needs beyond it

**The sequence today is "bounce, then the wall crumbles later."** `src/engine/entity.js:1415-1419`
pushes you *out* before it damages the block, so even when that hit brings the wall to 0 hp you have
already been ejected. Four things:

1. **A PIERCE TEST BEFORE THE SEPARATION.** At that same site: if incoming momentum beats the block's
   remaining hp (or a declared `co.breakThrough`), *skip the push-out*, call `damageBlock` with the
   full amount so `shatterBlock` fires this frame, and let the body continue at reduced velocity. **The
   disposal half already works** — `removeBlockFromCover` is immediate (`src/engine/game.js:1974`), so
   the collider vanishes and the next frame finds nothing to bounce off.
2. **SEGMENTED WALLS — a TILE decision, not engine work.** `shatterBlock` collapses a whole cover
   record, so a canyon wall as one 96u box gives you a 96u hole. Register the wall as **N side-by-side
   boxes** in the `canyon` builder **[N6]** and only the struck segment goes. That also gives the fog
   raster and `canSee` a sensible wall.
3. **`_slamCd` is 0.45s** (`src/engine/entity.js:794`) — you cannot chain two walls inside half a
   second. Fine for one wall; worth knowing for parallel walls.
4. **`launchT` is the gate and it is the right one** — only a *thrown or knocked* fighter breaks
   through, never someone who flew into it. That is already the documented law; do not relax it.

## 3.3 The honest limits — do NOT design around these

- **⚠ A HEIGHTFIELD CANNOT FOLD OVER ITSELF.** Project law in CLAUDE.md, and demonstrated in the code:
  THE METRO is an **open cut** (`trench`) precisely because there is no way to build a ceiling.
  **No tunnels, no overhangs, no roofed canyon, no cave.** A canyon is an open trench and its walls
  must be separate box geometry registered as cover.
- **⚠ COMBAT CANNOT EXCAVATE.** `crater()` clamps to `base - 6.5` (`src/engine/world.js:1707`) — 6.5u
  ≈ 1.2m is the maximum a fight will ever deepen the ground. Deep geometry must be authored via
  `_pendingCuts` before `_ghBase` freezes (`:945-947`).
- **⚠ `worldImpact`'s crater is gated on `pos.y < 6.5`** (`:1900`) — an explosion at altitude leaves
  **no mark on the ground at all**. On an air-combat stage that means most of the fight leaves no
  trace. Physically sensible, but the "the battlefield remembers" feel the city has will be much
  weaker in the sky. Worth deciding deliberately.
- **`resetTerrain` heals everything to `_ghBase`** (`:1745`) on every match start: authored canyon
  depth survives, fight damage does not. Correct, and worth stating.

---

# 4 · THE DOOR

## 4.1 ⚠ THE ACTUAL STATE OF THE THREE RESEARCH ROWS

The owner cited "#37 and #42". Counting `RESEARCH` (`src/data/education.js:336-400`), those are
1-indexed positions 37 and 42 exactly:

**`portalanchor` — `src/data/education.js:375`**
```js
{ id: 'portalanchor', n: 'Portal Anchor', major: 'dimensional', t: 2, w: 20,
  d: 'a fixed pair between two cities', base: true },
```
**`dimgate` — `src/data/education.js:381`**
```js
{ id: 'dimgate', n: 'The Dimensional Gate', major: 'dimensional', t: 3, w: 44,
  d: 'the multiplayer door', base: true },
```
And **"Dimensional Physics" is not a research row — it is a MAJOR**, `src/data/education.js:41`:
```js
dimensional: { name: 'Dimensional Physics',
  careers: ['Portal Technician', 'Rift Analyst', 'Chrononaut'],
  hooks: 'portals · dimensions · the rewind' },
```

| field | `portalanchor` | `dimgate` |
|---|---|---|
| id | `portalanchor` | `dimgate` |
| name | Portal Anchor | The Dimensional Gate |
| major (= visibility gate) | `dimensional` | `dimensional` |
| tier | 2 (*"a new mechanic on existing bones"*) | 3 (*"new architecture"*) |
| **cost** | **`w: 20`** — twenty weeks of a researcher | **`w: 44`** — forty-four weeks |
| `base: true` | yes — a facility, not a carried item | yes |
| `lawful` | none | none |
| **prerequisites** | **NONE — the field does not exist** | **NONE** |
| **`fx`** | **ABSENT — prose only** | **ABSENT — prose only** |

**Four things follow, and all four matter:**

1. **⚠ THE `RESEARCH` SCHEMA HAS NO PREREQUISITE FIELD.** The only fields in use across all sixty rows
   are `id · n · major · t · w · d · base · lawful · fx`. There is no `prereq`/`needs`/`after`. So
   *"you research your way to the door"* **as a chain** (Dimensional Physics → Portal Anchor → The
   Dimensional Gate) **does not exist in the data model.** The only gating that exists is `major`
   (visibility) and `lawful` (host-country law, `:419-426`). A prerequisite field is genuinely new —
   small, and it should be added **as data**, the way `fx` was, never as an `if` in a UI.

2. **⚠ BOTH ROWS ARE PROSE, WHICH THIS PROJECT DEFINES AS UNREACHABLE.**
   `src/data/education.js:449-458` states the law in its own words: *"Prose instead of a field is
   unreachable content by construction"*, and `:459-467` gives the cure — `EFFECT_VERBS`, seven verbs
   the engine already has. `REACHABLE_RESEARCH()` (`:470`) = `RESEARCH.filter(r => r.fx)` — **13 of
   60**. Neither dimensional row is among them. `docs/BACKLOG.md:175-198` lists all 47 untagged rows,
   and the dimensional ones sit in the first group: *"The system is not built."*
   **POWERWORLD is the thing that would make them reachable**, and it needs a new verb
   (`open_theater` / `unlock_dimension`). ⚠ **It would be the first `EFFECT_VERBS` entry that acts on
   the WORLD rather than on a `Fighter`** — `applyResearch(f, owned, game)` (`:475`) is signed for a
   fighter. A real, small architectural decision; make it deliberately.

3. **⚠ `dimgate`'s prose says "the multiplayer door", not a single-player dimension.** The owner is
   repurposing his own authored intent. One string, but it is *his* string — confirm before renaming.

4. **The visibility gate is already fierce, and that is good news.** `FACULTY_REQ.dimensional`
   (`:64`) is `{ sci: 74, gdp: 60, flagshipOnly: true }`; the comment at `:105-110` explains the
   `flagshipOnly` rule exists *because* a bare bar left one country qualifying — **a country gets at
   most one such faculty, at its largest educational city.** And `visibleResearch(heldMajors)`
   (`:409-412`) means that until you hold a Dimensional Physics graduate **the gate rows are not shown
   greyed-out with a price — they are ABSENT** (`:404-408`). That is the best possible setup for a
   secret dimension.

## 4.2 ✅ THE GOOD NEWS: THE GATE FACILITY ALREADY DERIVES ITSELF

`researchedRooms()` — `src/data/base.js:241-247` — turns **every `base: true` research row** into a
buildable facility definition:
```js
RESEARCH.filter(r => r.base).map(r => ({
  id: 'r_' + r.id, n: r.n.toUpperCase(), wk: Math.max(2, Math.round(r.w * 0.5)),
  $: 40 + r.t * 90, staff: r.t, kind: 'built', needs: r.id, tier: r.t,
  d: r.d, major: r.major, majorName: … }));
```
and `allFacilities()` (`:248`) includes them. So **THE DIMENSIONAL GATE already exists as a facility**:
id `r_dimgate` · **22 weeks to build** · **$310K** · **3 staff** · tier 3 · `needs: 'dimgate'` ·
major `dimensional`. Cost, build time, staffing and the research link are all derived, not authored.
This is much better than the door needing a new facility row.

**⚠ But `needs` is never read.** `canBuild(slot, fid, b)` (`src/data/base.js:342-357`) checks the
facility exists, the slot is free, the permit covers it, and the slot is reachable — **and never looks
at `f.needs`**. I grepped `\.needs` across `src/`: the only real read is `landmarks.js:97`, a different
thing entirely. So `needs` on `r_dimgate` (and on the authored `cuffs`/`containment`/`suppression`
rows, `:159-166`) is a **declared, unenforced field** — the "prose is not a field" disease one layer
up. Enforcing it is ~3 lines in `canBuild` and it is what makes the research→facility gate real.

## 4.3 ⚠ SIX DEAD LINKS — nobody can spend a week on research today

Verified by repo-wide search:

| # | Link | State |
|---|---|---|
| 1 | **staff with a major** | `org.hire` (`src/data/org.js:164`) has **zero callers** — `devconsole.js:485` advertises `team hire` and the handler has no such branch (`:489-529`). `base.hireStaff` (`src/data/base.js:397`) has **zero callers**. `heldMajors(b)` (`src/data/base.js:485-487`) reads `b.staff[].major` and **nothing ever pushes to `b.staff`**, so it always returns `[]` |
| 2 | **a lab** | `base.startBuild` (`:359`) has **zero callers**, so `pipeline(b)` (`:490-506`) can never report the `research` stage `ok`; `STAGE_ROOM` (`:481`) maps research→`lab`. Mode `'base'` (`src/engine/game.js:190-198`) is never entered from any UI |
| 3 | **a listing** | `researchOptions` (`src/data/base.js:511-520`) — the only function joining `visibleResearch` to the building and the host-country law — has **zero importers** |
| 4 | **a start verb** | no `startResearch`/`researchQueue`/progress field exists in `education.js`, `base.js` or `org.js`. The `w` figure on all 60 rows is read by **exactly one thing**: `researchedRooms()` (`:243`), which converts it into a *build* time |
| 5 | **an ownership field** | no `owned` / `org.research` anywhere. `org.blank()` (`src/data/org.js:60-63`) is `{founded, firm, stateNamed, country, city, cultureCode, cash, week, roster, ledger, seed}` — **no research field, and `org.js` never imports `education.js` at all** |
| 6 | **a week ticker** | `base.tickWeeks` (`:367`) **zero callers**; `org.weekTurn` (`src/data/org.js:192-203`) only debits payroll; `career.turnWeek` (`src/data/career.js:314-330`) only advances the calendar and rolls birthdays. **The career clock and the firm clock are two unrelated counters** |

Also: `applyResearch` (`src/data/education.js:475`) has **zero callers**, so the 13 `fx`-tagged rows
and the whole `EFFECT_VERBS` vocabulary are unreachable by construction — the verbs exist on
`Fighter`, the data declares them, nothing connects the two. `data/education.js` has exactly **two**
importers: `base.js:29` and `hudCodex.js:23` (the latter reads `def.degrees[0]`, written only by the
dead `applyDegree`, so that codex row can never render).

**⚠ CONSEQUENCE FOR PLANNING: POWERWORLD cannot ship "behind research" without first building the
research door.** That is a separate, larger piece of work than POWERWORLD's world layer, and it should
be scoped as such rather than assumed. **My recommendation: ship POWERWORLD's world layer FIRST
behind a mode card, and wire the research gate as a second slice** — the world is testable on its own,
and the research pipeline is a wire-queue item with six links, not a prerequisite.

## 4.4 The route, end to end

```
  ① a university with a Dimensional Physics faculty      education.js:64, 111-129
       flagshipOnly · sci ≥ 74 · gdp ≥ 60 — at most one per country
  ↓  studyWeeks(uni, 'dimensional')                      education.js:270-275
  ② a graduate ON STAFF                                  ⚠ DEAD LINK 1
  ↓  visibleResearch(heldMajors) now RETURNS the rows    education.js:409-412
  ③ RESEARCH: portalanchor 20wk → dimgate 44wk           education.js:375, 381
       ⚠ DEAD LINKS 2–6 · ⚠ needs a NEW prereq field to be a chain
  ↓  a new EFFECT_VERBS entry acting on the WORLD        education.js:459-467
  ④ BUILD THE GATE — r_dimgate, 22wk, $310K, 3 staff     ✅ base.js:241-247 (derived)
       ⚠ canBuild never checks `needs` (§4.2)
  ↓
  ⑤ THE DOOR YOU WALK THROUGH — three candidates, all existing machinery:
       a) game.registerInteractable(...) on the gate mesh in the BASE   game.js:623-633
       b) a career slate offer whose theater is the dimension           career.js:119-280
       c) a POWERWORLD mode card                                        data/modes.js:2-17
  ↓  hud.theater = { dimension: 'needles', seed: … }
  ↓  persisted to localStorage 'threshold_theater_v1'                   main.js:204, 244
  ⑥ hud.resolveTheaterPlan() → a NEW `t.dimension` branch               hud.js:302-325
  ↓  → powerworldPlan(stage, seed)                        [N1]
  ⑦ main.beginMatch: sig() differs → world.rebuildCity(plan)            main.js:142-154
  ↓  world.onRebuilt → setSkyWorld(…)                                   main.js:212-217  ⚠ [N4]
  ⑧ THE CROSSING CINEMATIC (§4.6) → hud.showEstablishing names it       hud.js:1315-1366
```

**The career-slate route is the cheapest real door and it is fully mapped.** An offer is a plain
object (`src/data/career.js:119-280`) dealt deterministically by
`mulberry(career.seed*7919 + career.week*104729)` (`:120`); `acceptCfg` (`:283-292`) turns `kind` into
a `cfg` (`duel`/`grudge`/`title` → `{mode:'duel', p1, enemy, aiLevel, career}`); the desk sets
`hud.theater` and persists it (`src/main.js:243-244`), then plays `hud._playTransit` when the city
changed (`:250-251`) and calls `enter(cfg)`. **A `kind: 'gate'` offer whose accept sets
`hud.theater = {dimension: …}` is a handful of lines** — and `turnWeek` (`career.js:314-330`) already
gives a week real duration via `advanceDays(7)` (`:317`).
⚠ `pickCity` (`:90-95`) is a **soft filter** — it falls back to the full list when nothing matches
(`:93`) — so a dimension offer must not try to express itself as a city predicate.
⚠ `intelFor(city)` (`:102-113`) reads `countryOf(city.country)` for the desk's intel lines; a
dimension has no country row, so it must return nothing rather than a lying zero.

## 4.5 What the door IS: a THEATER, plus a mode card. Not a planet.

**A theater, because `hud.resolveTheaterPlan()` (`src/engine/hud.js:302-325`) is the one branch point**
and it already has three siblings: `t.gallery` (`:304`), `t.planet` (`:307-319`),
`t.flagship`/`t.cityId` (`:320-324`). A `t.dimension` branch is the **fourth of a kind**, ~6 lines,
and the cheapest correct thing in this document.
⚠ **THE PLANET BRANCH IS THE EXACT MODEL TO COPY.** `:307-319` builds a synthetic city row from
`P.settlement` (`:311`), derives environment with `worldEnv(P.id)` (`:315`), and calls `generatePlan`
with `{popType, relief, biome, world, biosphere, atmosphere}` (`:316-317`). The comment at `:312-314`
records exactly why those three environment fields are load-bearing.
⚠ **AND THERE IS A SILENT FALLTHROUGH TO WATCH.** `:320` is `if (t.flagship || t.cityId == null) return thresholdPlan()`
— so a `t.planet` with no matching row, and equally a `t.dimension` with an unknown stage id, **gives
you the flagship White City with no warning.** A `t.dimension` branch must fail loudly.

**Not a planet, because `PLANETS` is a real ephemeris.** `t.planet` looks the id up in `PLANETS` and
reads `P.settlement` — a city row on a real body at a real AU with real orbital mechanics
(`data/orbits.js`), reachable by `buildRoute` (`src/data/planets.js:129-168`) and the space layer.
POWERWORLD is not at an AU. Forcing it into `PLANETS` would corrupt the almanac, `separationAU`,
`transitSecsFor`, the heliopause ladder and `space` — for nothing.

**But it DOES want a `WORLDS` row** (`src/data/environments.js:44`). `WORLDS` and `PLANETS` are
*separate tables* — you can be in one and not the other. One row buys `day/horizon/sunset/night/
sunArc/starsByDay/lightMult` **and** the `hazards` channel map (`:34`), i.e. the sky, the light
multiplier, the star behaviour and the survival model.
⚠ **AND `main.js:216` MUST BE TAUGHT ABOUT IT.** It is
`game.world.setSkyWorld((t && t.planet) || 'earth')` — without a `t.dimension` case **POWERWORLD gets
Earth's sky**, which is the single most likely thing to be missed.
⚠ **NO PURPLE** — the Neptune/Uranus rows (`src/data/planets.js:74`) document that the law reaches the
sky. Warm rock/amber, or cold teal.

**And a MODE, additionally, for four concrete reasons that are all about switching things off:**

1. **`police.active` is keyed on the MODE ID, not the world** —
   `src/engine/police.js:112`: `!!(this.g.mode && (this._forced || this.g.modeId !== 'training') && !netplay)`.
   As a theater inside `duel`, the dispatcher runs.
2. **`newscrew.enabled` likewise** — `src/engine/newscrew.js:165`: `!!modeId && modeId !== 'training'`.
3. **`world.setSim(id === 'training')`** — `src/engine/game.js:1661`. POWERWORLD must **not** be
   `'training'` (that fabricates the holo Danger Room instead of building the plan) and not
   `'freeroam'` either. `freeroam`'s own comment (`src/engine/game.js:91-97`) is the exact precedent
   for "a new id, deliberately not `training`, because of what that id switches off."
4. **A mode's `setup` is where a WORLD RULE SET goes.** `boxing` is the model: `BOXING.pure` writes
   `f.noPowers` and rewrites `ai.range`/`aggro`/`flyTend` on every fighter
   (`src/engine/game.js:132-143`). POWERWORLD's rules — raised `maxBand`, maybe `ms.ringOut`, maybe an
   `engageScale` — belong there, in the same place, in the same shape.

`MODE_IMPL` (`src/engine/game.js:45`) + a `MODES` card (`src/data/modes.js:2-17`) is the whole
declaration. ⚠ **`mode.hud` MUST be a function** — `src/engine/game.js:152-156` documents the 1,200
throws/match the string version cost.

## 4.6 WHICH CINEMATIC

Five exist. What each actually is:

| system | signature | renders on | restore contract | test seam |
|---|---|---|---|---|
| **`playSpaceFlight`** | `spaceflight.js:1001` (class `:58`) | **its own `THREE.Scene` swapped into `composer.passes[0]`** (`:93-94`, `:967`, `:972`) — inherits bloom/exposure/ACES structurally | **the most complete of the five** (`:977-997`): pass scene+camera restored `:985`, `g.running` `:986`, rAF cancelled `:981`, listeners removed `:982-983`, **HUD hidden by element and restored exactly as found** `:102-106`/`:988-989`, geometry+materials disposed `:991-993`, `onDone` fired once `:996` | ✅ `{manual:true}` `:71`/`:110`/`:968`; `beat`/`t`/`done` are the assertion surface |
| **`playOpening`** | `opening.js:32`, handle `:409` | DOM `#opCine` z66 (`:43-47`) **over the live game canvas**, camera via `game.mapCam` (`:53-54`, honoured `game.js:3061`) | `finish()` `:378-394` — `mapCam` null `:391`, `running` `:392`, `dLater` timers cleared `:381-382`, blob URLs revoked `:389`, **singleton retires the previous director** `:41-42`/`:397` | ✅ `{manual, variant}` `:400`/`:36` |
| **`hud._playTransit`** | `hud.js:1119` | DOM overlay z66 + a 2D canvas + an inline SVG arc (`:1123-1141`). **Never the 3D scene.** Stars painted once `:1145`; a 33ms `setInterval` moves the dot `:1165-1170` | thin `:1156-1162` — clears both intervals, removes listeners, `ov.remove()`, `onDone()`. **Never touches `running`/`mapCam`/composer/HUD.** ⚠ **NO singleton guard** (contrast `showDepart`'s at `:1001`) — two calls stack two overlays and fire `onDone` twice | ❌ none |
| **`hud._playHeliopause`** | `hud.js:1174` | DOM + one full-screen 2D canvas, own rAF `:1307-1312`. **The only code in the repo that draws the character crossing a boundary** (`figure()` `:1201-1212`, walked across at `:1250-1251`) | `:1292-1299` — ⚠ **no `onDone` parameter**; it hard-wires a return to `showDepart` at the system tier (`:1297-1298`) | ❌ none |
| **`hud.showEstablishing`** | `hud.js:1315-1366` | DOM `#hEstablish` z64 (`:294-295`, styles `hud.styles.js:264-283`) | two timers `:1362-1365`; `hideEstablishing` `:1367-1370` | ❌ none |

**RECOMMENDATION — two slices, and be explicit about which is which:**

- **v1 (cheap, ships with the world layer): `hud._playTransit`.** It is *already* the "you have gone
  somewhere else" beat, already the loading screen (so it hides the build spike, which §2.4 says is
  the biggest in the game), already called from two unrelated sites (`main.js:206`, `:250-251`) so a
  third is not a special case, and it takes only a from/to pair plus a callback. A dimensional
  crossing is a re-skin of its art. ⚠ Give it the missing singleton guard first.
- **The real answer: a second `SpaceFlight`-shaped class.** It is already the solution to *"leave the
  world you are standing in, render a different world through the same pipeline, hand the game back
  untouched"* — own scene into `composer.passes[0]`, the most complete `finish()` in the codebase, a
  `{manual:true}` seam, and **the traveller is the real character rig** (`figure(t.def)` `:616`,
  posed `:622-623`), so "the hero steps through" costs no new art. A crossing is a new beat table
  (`BEAT_LOOK` `:47-56`, `_buildBeats` `:713-734`) and a lighter `_build*` set — the warp/streak field
  (`:316-345`, `:349-373`) is a ready-made between-dimensions tunnel. ⚠ Skip its 2048×1024 canvas
  starfield (`_skyTexture` `:168-232`).
- **`_playHeliopause` is the narrative template, not the vehicle.** Its 3-act shape — *run out from
  the familiar → cross a visible boundary with the character in frame → reveal the new scale* — is
  exactly what a dimensional crossing wants. **Port the structure into the beat table; do not extend
  the file** (no `onDone`, no manual seam, own rAF, terminal state hard-wired).
- **`showEstablishing` names the place on arrival** — `opts.kicker` is already caller-supplied, so a
  dimension label is one line. ⚠ But its fields are city fields (crime, safety, police ETA,
  vigilantism, `:1336-1357`) — half the card is meaningless for a dimension and wants either
  dimension-shaped copy or a variant.
- ⚠ **`main.beginMatch` gates the cold open on `!game._traveling`** (`src/main.js:180`), set/cleared by
  `onTravel` (`:205-207`). A dimensional crossing must set it the same way or you get the transit
  cinematic *and* a random cold open back to back.

**One free win for the door object itself:** `game.placePortal`/`_mkPortal`
(`src/engine/game.js:2453-2481`) already builds an additive torus + disc portal at `y = 6.2`, orange
entry `#ff8a2a` / blue exit `#37c7ff`, with a `vfx.ring` flash and `audio.teleport()`, disposed
properly by `_closePair` (`:2482-2486`). `abilities.js:478-480` is the `portal` type and
`data/visual.js:96` already maps it to the `rift` shape family. **Opening the crossing on that exact
mesh makes the door and the ability read as the same phenomenon** — no new art.

---

# 5 · WHAT POWERWORLD MUST SWITCH OFF

Mirroring `boxingring._hideWorld` (`src/engine/boxingring.js:170-208`) and the Moon's `worldEnv`.
⚠ POWERWORLD is **generated**, not hidden — so unlike the ring, most of this is "never build it",
which is cheaper and safer than hide-and-restore.

| system | off? | the flag that already controls it | notes |
|---|---|---|---|
| **Pedestrians** | **YES, hard** | ⚠ **NOTHING DOES THIS TODAY.** `peds.setCity(arena, waterX, air)` (`src/engine/pedestrians.js:94`, called `src/engine/game.js:262`) only `_reseed`s them into pressure suits (`:80-93`); the count is untouched. `boxingring` hides the mesh (`:206`) but the sim keeps ticking | **[N8]** — a `plan.people === false` read that zeroes the count, in the same shape as wildlife's `_life`/`_air`. ⚠ Note `worldImpact` books police heat via `peds.blast` (`src/engine/game.js:1921-1930`), so 0 peds also means heat can never be booked |
| **Wildlife — birds** | YES | ✅ `plan.biosphere === false` → `_life` → `nBirds = 0` (`src/engine/wildlife.js:96, 139`) | free |
| **Wildlife — litter/dust** | **KEEP** | `plan.atmosphere !== false` → `nLitter = 40` (`:97, 140`) | the **Mars** posture. Blown dust is exactly the BFP look |
| **Greenery** | YES | ✅ `_buildGreenery` early-returns on `plan.biosphere === false` (`src/engine/world.js:986`) | free. **This is the line that actually makes it barren** — zoning alone is not enough |
| **Police** | **YES, explicitly** | ⚠ `police.active` reads `g.modeId !== 'training'` (`src/engine/police.js:112`) — **mode-keyed, not world-keyed** | strongest argument for POWERWORLD being a MODE (§4.5). It degrades safely (no civilians → no heat) but the dispatcher still ticks |
| **News crew** | **YES for v1** | `newscrew.enabled = !!modeId && modeId !== 'training'` (`src/engine/newscrew.js:165`) | ⚠ the crew spawns with a curbside **van** — a road vehicle on a roadless stage. A satellite-feed reframing is a good later slice |
| **Traffic / parked cars** | YES | ✅ gated on a road edge `>= 2` (`src/engine/world.js:918-919`); weight-0 map has none | free |
| **Streetlights** | YES | ✅ needs a metalled junction (`src/engine/world.js:896`) | free |
| **Water / bathymetry** | YES | ✅ `waterCols: 0` → `_wGrid` null (`src/engine/world.js:650-663`), `waterX = A + 500` (`:869`) → `waterAt` always 0 | free |
| **Interiors** | YES | ✅ only the bungalow builder populates `world.interiors`; a POWERWORLD tile set that never calls it leaves it `[]` | free. ⚠ remember this list is **separate from cover** — the "can't walk around the ring" bug (`src/engine/boxingring.js:196-201`) |
| **Fog of war** | **KEEP ON** | `setFogEnabled(on)` (`src/engine/fog.js:96`); `boxingring` turns it off (`:203`) as precedent | it is the honest visual twin of the AI's own vision. ⚠ but §2.4 item 3 — texel size degrades at large arena |
| **City nameplate `#hCity`** | **repurpose** | `src/engine/hud.js:236, 262`; hidden by `body.phone` at `src/engine/hud.styles.js:884` | **free** — the plan carries `name`/`country`/`popLabel`/`crime`/`safety` as plain fields; fill them with dimension words. A control printing "CRIME 0" would be the lying-zero mistake `creatorUI` already avoids |
| **Weather** | **KEEP ON** | `game.weather` (`src/engine/game.js:279`), reset by `clearTransients` (`:1481`); airless → `none`, Mars → `dust` | ⚠ an ash/dust storm is *good* here, but `visMult` shortens AI sight (113u → 68u measured) which **makes §2.4 item 4 worse**. Decide together, not separately |
| **Day/night clock** | **KEEP ON** | `updateDayNight` (`src/engine/world.js:215-278`); repainted per world by `setSkyWorld` (`:187-211`) | the sundial, the news bug, golden hour, the peds and `_dnSunI` all read `world.dayT`. Don't stop the clock — give the sky a `WORLDS` row **[N4]**; `sunArc`/`lightMult`/`starsByDay` do the rest |
| **`peds.setVigilantism`** | moot | `main.js:152` → `countryOf(plan.country)` returns null for unknown; default `'Regulated'` (`src/engine/pedestrians.js:97`) | safe either way |
| **`districtAt` / news lower-thirds** | works | `districtNameAt(plan, x, z)` (`src/data/cityplan.js:1016`) reads `cell.t` → `TILE_INFO` | free **if** the new tiles get `TILE_INFO` rows **[N9]** — `validateTiles()` (`:431`) exists to catch that omission |
| **Elo booking** | **decide** | `freeroam`'s precedent: KOs book because *"free roam is a real theater, not a fabricated one"* | POWERWORLD is a real theater by the same argument, so KOs should book. **State the ruling** |
| **`clearTransients`** | — | `src/engine/game.js:1479-1528` closes `_ring`, `lab`, `baseRoom`, weather | **⚠ anything POWERWORLD registers must add its line HERE** — the documented reset law |

---

# 6 · WHAT I COULD NOT VERIFY

1. **The `computeVertexNormals` cost at 40,401 vertices.** My ~38ms is extrapolated from the code's own
   "~12ms on the 112×112 grid" (`src/engine/world.js:1710`). **This number caps POWERWORLD's arena and
   must be measured in a FOREGROUNDED tab** — CLAUDE.md warns twice that a hidden pane early-outs of
   render and `_ema` reads ~98ms there.
2. **The bands `fitBands()` actually produces for a rock stage.** ceiling ≈171 is computed from
   `BAND_SHAPE` (`:1796`) and `reg`'s scaling (`src/engine/citytiles.js:206-208`), not measured. The
   *direction* is certain; the number is not.
3. **Whether the AI genuinely fails to find a foe at arena 432+.** §2.4 item 4 is reasoned from
   `seeRange = 118` (`src/engine/ai.js:41`), not flown. Needs an AI-vs-AI soak.
4. **Which countries pass `FACULTY_REQ.dimensional`** (`sci ≥ 74 && gdp ≥ 60 && flagshipOnly`). I did
   not run `universities()`. If it is one or two, the door is very narrow — the comment at
   `src/data/education.js:105-110` says `flagshipOnly` was added to *fix* a one-country monopoly, so
   it should be several, but I have not counted.
5. **Whether `plan.metric.humanH` below 9.6 holds up visually.** §1.4 proposes it as the real lever for
   vastness and nothing in the repo has used it that way. `door()` and the window bay ride `M`, so a
   stage with no doors and no windows *should* be unaffected — **[GUESS]**.
6. **Whether raising `maxBand` in POWERWORLD breaks the balance ruling it undoes.** I read the
   CLAUDE.md summary of `docs/BALANCE.md`, not the doc.
7. **Whether the owner intends `dimgate` to stop being "the multiplayer door."** His authored string,
   his intent — ask, don't assume.
8. **The exact per-stage cell layouts in §1.4** are my proposals, not measured plans. None has been
   run through `validatePlan` (`src/data/cityplan.js:1211`), which is the check that would catch a
   landlocked cell, an orphaned footprint ref, or an undeclared `TILE_MAX_H`.
9. **I did not read `_playTransit`'s body myself** (the missing-singleton-guard and no-manual-seam
   findings come from a subagent reading `src/engine/hud.js:1119-1170`). Worth a 2-minute confirm
   before relying on the "add a singleton guard" instruction.
10. **The exact cost of a `barrens`/`canyon`/`mesa` tile.** The line estimates in §1.3 are sized from
    comparable existing builders (`mountain` is 24 lines, `forest` ~70) — **[GUESS]**.

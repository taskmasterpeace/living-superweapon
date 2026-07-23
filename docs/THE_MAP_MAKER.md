# THE MAP MAKER — what it is, how to use it, and where it stops

*Rewritten 2026-07-23, after the road graph. Every claim here was checked against the running game.*

---

## WHAT IT IS

The map maker is the **CITY ATLAS**. It turns any of **1,050 real cities** into a playable
battlefield, lets you **author** the layout, and drops you into it.

A city is a grid of **cells**. Each cell is 96 units square — a real city block. A cell holds one
**tile**: a residential court, a corporate tower, a temple, a metro station, farmland. There are
**20 tile types with 2–3 variants each**, and three of them claim more than one cell.

The grid size comes from the city's real population, and you can override every part of it:

| Population type | Grid | Across | Character |
|---|---|---|---|
| Village | 2×2 | 192u | a hamlet: farms and dirt tracks |
| Small Town | 3×3 | 288u | the countryside proper |
| Town | 4×4 | 384u | the first real streets |
| Small City · City | 5×5 | 480u | blocks, a hospital, a market |
| Large City | 6×6 | 576u | a stadium, a rail yard, a metro |
| Mega City | 8×8 | 768u | an airport, a highway ring, a cross-town arterial |

**Scale used to be a lie.** City and Large City were both 5×5 and a Mega City only 6×6, so the
three tiers holding 96% of the sheet produced nearly identical maps — measured 17.1, 17.0 and 20.6
structural cells. The ladder now measures **1.0 / 2.7 / 14.7 / 18.5 / 17.2 / 21.6 / 47.7**: a Mega
City is genuinely 2.8× a City, and a village is a village.

## SCALE — the generator is not tied to this game

The 96-unit cell is the **unit, not a limit**. Every tile builder is authored in base units and
never thinks about scale; the plan carries its own `cell` (32–240u) and the whole world follows —
cells, roads, lamps, cars, the shoreline, the fog. Verified end to end from 32u to 240u: cover boxes
scale linearly (25×10×8 → 185×75×60 units), fighters spawn inside and stand on the ground, no errors.

Set it with the **CELL − / +** control, or `generatePlan(city, seed, { cell: 160 })`.

That is what makes this usable for a game that isn't at superhero scale: a tight 48u-cell arena
brawler and a 200u-cell open world come out of the same generator.

---

## THE ROAD GRAPH

**Roads used to be a wrapped ground texture.** Every cell had a street on all four sides, forever.
That single fact forbade T-junctions, dead ends, dirt tracks, road hierarchy, and any road that
connects one specific place to another.

Roads are **data on the plan** now:

- **Nodes** — the (N+1)² lattice of cell corners.
- **Edges** — `plan.roads.h[r][c]` joins node(r,c)→node(r,c+1); `.v[r][c]` joins node(r,c)→node(r+1,c).
- Each edge carries a **class**, and class `0` means **there is no road here** — which is the
  whole point.

| Class | Width | Surface | Markings |
|---|---|---|---|
| `none` | — | — | nothing is built |
| `track` | 9u | dirt, ruts, grass down the crown | none |
| `street` | 22u | asphalt | centre dashes |
| `arterial` | 30u | asphalt | double yellow |
| `highway` | 38u | asphalt | median + lane lines |

The class comes from the **traffic weight** of the two districts an edge sits between — a corporate
core gets an arterial, open farmland gets a dirt track, and two cells of the *same multi-cell
structure* get **no road at all**, because a street does not run through an airport.

**Rural places top out at one metalled road.** A village used to come out with thirteen paved
streets, because a farmhouse counts as `residential` and anything of that weight got asphalt.
Everything else out there is a dirt track now.

**Nothing is landlocked.** A block with no road on any of its four sides is an unreachable
building — it was happening on 11 real cities. Every structural cell is guaranteed an approach on
its busiest side. **Dead ends get a real turning head** rather than a square stub.

Every edge is built as a real ribbon mesh **draped over the terrain heightfield**, so a road dips
into the metro cut and rides the mining spoil instead of hovering over a hole it can't see. The
whole network merges into **one mesh per road class** — five draws for a city.

Measured (Tokyo, 6×6): 84 edges — 70 street, 8 arterial, 6 highway — and 46 junctions.
Benguela (5×5): 16 edges are `none`. A village gets dirt tracks and dead ends.

---

## MULTI-CELL STRUCTURES

A tile used to be exactly one cell. A footprint tile claims a **rectangle**: the **anchor** cell
holds the structure and knows its size (`fh`/`fw`); every cell it covers holds a `ref` back to the
anchor. Planner, roads, districts and the editor all read the same shape.

| Tile | Footprint | What it is |
|---|---|---|
| **THE BOWL** (stadium) | 2×2 | a real stadium ring you run laps inside, ~192u across |
| **THE FIELD** (airport) | 2×3 | runway with centreline, control tower, terminal, hangars, parked aircraft |
| **THE YARDS** (railyard) | 1×3 | parallel tracks, rolling stock as cover, loading shed, water tower |

The planner tries each footprint **both ways round**, so a 1×3 yard runs along whichever axis fits.

---

## HOW TO USE IT

### Opening it
**Title screen → 🗺 ATLAS.** (In a match, the theater chip in the header line opens it too.)

### 1. Find a city
Type in **QUERY** — a city or a country. Or use the type chips (MILITARY, POLITICAL, SEAPORT,
MINING…). Click a row to select it.

### 2. Read the plan
The coloured grid is a live top-down preview of the actual layout. `R2` is residential variant 2,
`A1` an airport, `M0` metro. Multi-cell structures draw as **one box**. The **road graph is drawn
on top** — thickness is the class, and a missing line is a road that genuinely isn't there.

### 3. Reroll it
**⟳ SEED** advances the seed and regenerates. Same city, different city. It's deterministic, so a
given city + seed is always the same map.

### 4. Paint it
Under the preview is the palette — one swatch per tile type, plus **water**, **🔒 lock** and an
eraser. Swatches marked **▦** claim more than one cell.

1. Click a swatch to pick a tool.
2. **Click any cell in the preview** to apply it.
3. **✕** hands a cell back to the generator.

**🔒 LOCK** freezes whatever the generator put in a cell. That is the important one: lock the two
blocks you like, then keep rerolling until the *rest* of the city arranges itself around them.
Click a locked cell again to release it.

Painting re-derives the **edge sockets and the road graph** — paint a park beside a barracks and
the fence knows; paint an airport and the road through it closes.

### 5. Resize the grid, move the coastline
**GRID − / +** takes any city from 2×2 to 9×9. **COAST − / +** sets how many columns of the east
edge are sea (0–3). Both are undoable, and painted cells outside a shrunken grid are clipped, not
destroyed — grow it back and they return.

### 6. Undo
**↶ UNDO** (or **Ctrl+Z**) unwinds the last 50 actions — paints, locks, clears, rerolls, resizes.

### 7. Save, name, export
**💾 LAYOUTS** opens the drawer: name the current map and save it, reload or delete any saved one,
and copy or paste the **plan JSON** — city, seed, grid, coastline and every painted cell in one
line of text you can move between machines.

### 8. Play it
**📍 SET AS THEATER** saves everything. Every match from then on is fought there. It persists
across restarts.

### 9. Build it — LIVE 3D
**🎥 BUILD IT — LIVE 3D** raises the **real city** behind the panel. The panel becomes a left rail,
the HUD gets out of the way, and every edit rebuilds immediately (a rebuild is 7–10ms).

- **drag** to orbit · **right-drag** or **shift-drag** to pan · **wheel** to zoom

The 2D preview is a schematic and always will be. This is where you find out whether the map is any
good. Render quality is pinned to maximum while the tool owns the screen.

### 10. Set the scale and the size of place
**CELL − / +** sets the world scale (32–240u a cell). The **population chips** — VILLAGE, SMALL
TOWN, TOWN … MEGA CITY — regenerate any row of the sheet at that size, which also flips the rural
switch. That is how you reach the countryside at all: the sheet contains exactly **one Village and
sixteen Small Towns out of 1,050 cities**, so rural content was effectively unreachable by browsing.

### 11. Read the validation line
Under the controls the tool reports what it built and what is **wrong** with it: landlocked cells,
orphaned footprint refs, holes in a footprint, footprints running off the grid, cells missing
sockets. These are the same assertions the headless sweep runs, so the panel and the test cannot
disagree. All 1,050 cities × 3 seeds — **3,150 plans, 0 problems**.

### 12. Inspect every tile
**🧱 PROVING GROUND** builds one map containing every tile type in the game, side by side, in the
Danger Room. It derives from the tile table itself, so it can never go stale.

---

## THE COUNTRYSIDE

The country is not a city with fewer buildings — it is a **different fight**: open sightlines, low
cover you vault rather than hide behind, and long runs of nothing.

It was badly broken, and none of it was visible because the sheet has almost no rural rows. What
was wrong:

- **A village had thirteen paved streets.** A farmhouse counts as `residential`, and anything of
  that traffic weight got asphalt. Rural now tops out at one metalled road; the rest are dirt tracks.
- **Apartment towers in a hamlet.** Residential variant 2 is towers-in-the-park. Guarded now, in
  both the base fill and the placement table.
- **The fields rendered near-black.** They were written as lit materials; like the lawns, crops are
  unlit decals — you write the value you want to see.
- **Streetlights and parked cars stood in ploughed fields.** Both follow the road graph now: a lamp
  needs a metalled junction, a car parks on a real kerb.
- **On an even grid there was no village at all.** The "centre cell becomes homes" rule tested for a
  cell at distance 0 from the middle, which no cell satisfies when the grid is 2×2. The village
  core, the parish church and the market are explicit placement rows now.

What is there now: strip fields with furrows in a patchwork of crops, **hedgerows** on the sides
that face open country (the countryside's only chest-high cover), barn + silo + tractor + hay bales,
orchard rows with a windpump, dry stone walls and a water trough. Ref: `wwa-country.jpeg`.

---

## REGION SKINS

Every city carries a `cultureCode` — one of 14 architectural regions — and until now **nothing read
it**, so Kabul was built out of the same greys as Oslo. One table (`REGIONS` in `cityplan.js`) now
pulls the whole palette before a tile is raised: wall tone, roof, ground, greenery.

The **ground carries it**, because it is the biggest surface in frame. Kabul builds in warm sand
(`#d5c6a2`) with tan roofs; Tokyo in cool grey (`#b7b8b4`) with slate. See
`wwa-region-kabul.jpeg` and `wwa-region-tokyo.jpeg` — same engine, same tiles, two different worlds.

⚠ The sheet has **21 rows with no code**. Those are filled from the **most common code among that
country's other cities** — Hell, Norway is blank, Oslo says West Europe, so Hell builds as West
Europe. Derived from the sheet, never invented.

⚠ It does **not** correct rows that are coded *wrong*. **Los Angeles is coded 14 (Middle Eastern)
in the source sheet.** Silently overriding authored data would hide the error — fix it in the sheet.

---

## THE DENSITY CAP IS GONE

`STRUCT_CAP = 24` was never a design choice. It existed to match `uniform vec2 uBoxC[24]` in the
fog-of-war shader — a GLSL compile-time constant. A Mega City threw a third of itself away as empty
plaza and came out feeling **emptier** than a small town.

Fog occlusion is now a **coarse occupancy grid** (384² texels over the 700u fog plane, ~1.8u each)
and the sight test is a 26-step march through it. Cost is **O(1) in the number of buildings** —
rasterising the whole grid takes **0.026 ms**.

The budget is a design dial again: `min(64, round(N² × 0.82) + 4)`. Measured cover pieces per city:
Tokyo 6×6 → **79**, an 8×8 override → **99**. The old ceiling was 24.

**What this costs:** the fog *shading* is now approximate at the texel scale. Against the engine's
exact analytic line-of-sight it agrees on **96% of sight lines at the fog's working range**, with
the errors being sub-texel edge cases at building corners. Gameplay LOS — AI vision, targeting,
`canSee` — is **unchanged and still exact**. Only the darkening on the ground is approximate, and
in exchange the 25th building in a city casts a vision shadow at all, which it never used to.

---

## THE PLACEMENT TABLE

Which tile goes where used to be a hand-written chain of `if` statements inside the generator. It is
a **table** now (`PLACEMENT` in `cityplan.js`), one row per structure the planner may place:

```js
{ t: 'airport', minN: 6, foot: [2, 3], landmark: true, score: { rim: 4, water: -2 } }
```

- `t` the tile · `need` only if the city sheet lists this specialisation · `minN` smallest grid that
  gets one · `chance` rarity · `foot` footprint · `landmark` never demoted by the density budget
- `score` is where it wants to sit, summed from named terms: `center` `rim` `ring` `water` `south`
  `cluster` `jitter`

Rows are **atomic** — a second berth or a second campus is a second row. Rarity, landmarks and
"only cities big enough" are content you edit in one place, not code.

---

## CAPABILITIES — what it can do today

- Browse and search **1,050 real cities** across **168 real countries**, filtered by specialisation
- **Deterministic generation** — city + seed always produces the same map
- **A real road graph** — junctions, T-junctions, dead ends, dirt tracks, arterials, a highway ring
- **Multi-cell structures** — airport, rail yard, a stadium that reads as a stadium
- **Region skins** from the city's real architectural region
- **Live 2D plan preview** showing footprints as single structures and the road graph on top
- **Paint** any cell from a 20-tile palette, plus **water**
- **Lock** a cell against rerolls · **undo** 50 deep · **Ctrl+Z**
- **Resize the grid** 2×2 → 9×9 · **move the coastline** 0–3 columns
- **Named layouts** and **plan JSON** import/export
- **Persist** a theater across sessions
- Tile proving ground showing the whole library on one map
- The city's real data drives play: crime and safety set police response; the country sets whether
  the army can be called and whether armed civilians will draw on you

- **Live 3D** authoring with an orbit camera, rebuilding on every edit
- **Scale** the world 32–240u a cell, and regenerate any city at any population tier
- **Validation** in-panel, using the same assertions as the test sweep

## LIMITATIONS — what it still can't do

Straight answers, no hedging:

- **No interiors.** Buildings are solid. (Parked deliberately — see `BACKLOG.md`.)
- **No terrain painting.** Hills, rivers and cliffs can't be authored. Only mining pits and the
  metro cut carve the ground, and only because those tiles ask for it.
- **No real tunnels.** A heightfield is one surface and cannot fold over itself, so there is no
  ceiling. The metro is an open cut for exactly that reason. See COMBAT_MANUAL §6.
- **Water is still a column on the east edge.** You can widen it, and you can paint water into any
  cell, but you cannot draw a river, a bay or an island coastline.
- **Roads follow the lattice.** Every edge runs between two cell corners: no curves, no diagonals,
  no roads that ignore the grid.
- **No drag-paint or rectangle fill.** One cell per click.
- **Region skins are palette-only.** Roof *geometry* doesn't change yet — the `pitch` and `dome`
  columns are authored in the REGIONS table and nothing reads them.
- **No traffic.** The road graph exists and nothing drives on it yet. That is the next payoff:
  `roadAt(plan, x, z)` and `junctionAt(plan, r, c)` are the queries a traffic, pedestrian or
  police-approach system should use.

---

## WHAT TO DO NEXT — in priority order

**1. Drive the graph.** Traffic, pedestrians on the pavement, police cruisers that approach along a
real route, the news helicopter following an arterial. The data is there; nothing reads it yet.
`roadAt(plan, x, z)` and `junctionAt(plan, r, c)` are the queries to use — do not re-derive a grid.

**2. Roof geometry per region.** `REGIONS[].pitch` and `.dome` are authored and unread. Pitched
roofs in the Caribbean, domes in the Middle East — for very little code, since the tiles already
take a roof material.

**3. Drag-paint and rectangle fill.** The single biggest quality-of-life gap in the editor now.

**4. Coastline authoring.** Water is paintable per cell but the shore is still a straight column —
a real bay would want the water mesh and `waterAt()` to read the plan instead of one x threshold.

**5. Interiors.** Still the biggest structural change left. Parked; see `BACKLOG.md`.

---

## THE CAPTURE HARNESS

The screenshots here were taken by posing the camera by hand in the console:

```js
world.rebuildCity(generatePlan(city, seed))
world.setSim(false); world.setFogEnabled(false)   // Danger Room tints holo-cyan; fog hides blocks
game.update = () => {}                            // the camera fights you unless the sim is frozen
world.camTarget.set(x, 0, z); world.frustum = world._baseFrustum = 190
world.camPos.copy(world.camDir).multiplyScalar(world.camDist).add(world.camTarget)
world.camera.position.copy(world.camPos); world.camera.lookAt(world.camTarget)
world.render()
```

⚠ The camera is **orthographic** and driven from `camTarget`/`camDir`/`frustum` — setting
`camera.position` alone does nothing, because `follow()` overwrites it on the next frame.

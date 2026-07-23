# THE MAP MAKER — what it is, how to use it, and where it stops

*Rewritten 2026-07-23, after the road graph. Every claim here was checked against the running game.*

---

## WHAT IT IS

The map maker is the **CITY ATLAS**. It turns any of **1,050 real cities** into a playable
battlefield, lets you **author** the layout, and drops you into it.

A city is a grid of **cells**. Each cell is 96 units square — a real city block. A cell holds one
**tile**: a residential court, a corporate tower, a temple, a metro station, farmland. There are
**20 tile types with 2–3 variants each**, and three of them claim more than one cell.

The grid size comes from the city's real population, and you can override it:

| Population type | Grid | Arena |
|---|---|---|
| Village · Small Town | 3×3 | 288u |
| Town · Small City | 4×4 | 384u |
| City · Large City | 5×5 | 480u |
| Mega City | 6×6 | 576u |

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

### 9. Inspect every tile
**🧱 PROVING GROUND** builds one map containing every tile type in the game, side by side, in the
Danger Room. It derives from the tile table itself, so it can never go stale.

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
- **The preview is a schematic.** It's truthful about layout, but you have to enter the map to see
  how it looks.
- **Region skins are palette-only.** Roof *geometry* doesn't change yet — the `pitch` and `dome`
  columns are authored in the REGIONS table and nothing reads them.
- **No traffic.** The road graph exists and nothing drives on it yet. That is the next payoff:
  `roadAt(plan, x, z)` and `junctionAt(plan, r, c)` are the queries a traffic, pedestrian or
  police-approach system should use.

---

## WHAT TO DO NEXT — in priority order

**1. Drive the graph.** Traffic, pedestrians on the pavement, police cruisers that approach along a
real route, the news helicopter following an arterial. The data is there; nothing reads it yet.

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

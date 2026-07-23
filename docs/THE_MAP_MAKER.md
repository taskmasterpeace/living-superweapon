# THE MAP MAKER — what it is, how to use it, and where it stops

*Evaluated and updated 2026-07-23. Every claim here was checked against the running game.*

---

## WHAT IT IS

The map maker is the **CITY ATLAS**. It turns any of **1,050 real cities** into a playable
battlefield, lets you **hand-paint** the layout, and drops you into it.

A city is a grid of **cells**. Each cell is 96 units square — a real city block — with 22-unit
streets between them. A cell holds one **tile**: a residential court, a corporate tower, a temple, a
metro station, farmland. There are **18 tile types with 2–3 variants each**, so ~40 distinct blocks.

The grid size comes from the city's real population:

| Population type | Grid | Arena |
|---|---|---|
| Village · Small Town | 3×3 | 288u |
| Town · Small City | 4×4 | 384u |
| City · Large City | 5×5 | 480u |
| Mega City | 6×6 | 576u |

---

## HOW TO USE IT

### Opening it
**Title screen → 🗺 ATLAS.** (In a match, the theater chip in the header line opens it too.)

### 1. Find a city
Type in **QUERY** — a city or a country. Or use the type chips (MILITARY, POLITICAL, SEAPORT,
MINING…) to filter to cities famous for that. Click a row to select it.

The panel on the right shows what you're getting: population, city types, crime and safety indices,
grid size, and how many seconds the police take to arrive here.

### 2. Read the plan
The coloured grid is a live top-down preview of the actual layout. Each square is one city block,
labelled with its tile and variant — `R2` is residential variant 2, `C0` commercial variant 0,
`M0` metro, `P1` park.

### 3. Reroll it
**⟳ REROLL LAYOUT** advances the seed and regenerates. Same city, different city. Keep pressing
until the shape is interesting — it's deterministic, so a given city + seed is always the same map.

### 4. Paint it *(new)*
Under the preview is the **tile palette** — one swatch per tile type, plus **✕** to erase.

1. Click a swatch to pick a tile.
2. **Click any cell in the preview** to paint it.
3. Click **✕** then a cell to remove your edit and give it back to the generator.

**Painted cells survive a reroll.** That's the important part: you can lock in the two blocks you
care about — put a stadium here, run a metro line across there — and then keep rerolling the seed
until the *rest* of the city arranges itself around them. The generator stays the author of
everything you haven't touched.

**✕ CLEAR n PAINTED CELLS** wipes your edits.

### 5. Play it
**📍 SET AS THEATER** saves the city, the seed *and* your painted cells. Every match from then on
is fought there, until you pick another. It persists across restarts.

### 6. Inspect every tile
**🧱 TILE PROVING GROUND** builds one map containing every tile type in the game, side by side, in
the Danger Room. This is the bench for judging tiles — it's how the screenshots in this document
were taken, and it can never go stale because it derives from the tile table itself.

---

## CAPABILITIES — what it can do today

- Browse and search **1,050 real cities** across **168 real countries**
- Filter by the city's real specialisation
- **Deterministic generation** — a city + seed always produces the same map, so a layout you like is
  reproducible forever
- **Live 2D plan preview** with per-cell tile and variant
- **Reroll** the layout without changing city
- **Paint individual cells** from an 18-tile palette, with an eraser
- **Painted cells survive rerolls** and reach the live match
- **Persist** a theater (city + seed + edits) across sessions
- **Tile proving ground** showing the whole tile library on one map
- The city's real data drives play: crime and safety set police response; the country sets whether
  the army can be called and whether armed civilians will draw on you

## LIMITATIONS — what it can't do yet

Straight answers, no hedging:

- **No multi-cell structures.** Every tile is exactly one 96u cell. An airport, a rail yard, or a
  downtown core that spans two blocks cannot be expressed. This is the biggest single limit.
- **Roads are a texture, not a graph.** The street grid is painted onto the ground, so every cell
  has streets on all four sides — always. No T-junctions, no dead ends, no dirt roads, no
  highway, and no road that connects one specific cell to another.
- **Density is capped by a shader.** `STRUCT_CAP = 24` exists because the fog-of-war shader holds a
  fixed 24-occluder array. Overflow blocks become empty plaza — which is why a Mega City can come
  out feeling *emptier* than a small one rather than denser.
- **No undo.** Painting is immediate; the only reset is clearing all edits.
- **No save/load or export.** You can't name a layout, keep several, or move one between machines.
  The theater is a single persisted slot.
- **The preview is a schematic, not the real thing.** It shows the layout truthfully, but you have
  to enter the map to see how it actually looks.
- **You can't paint water, change the grid size, or move the coastline.** Water is always the east
  column and only appears for seaport/resort cities.
- **No landmarks.** You can't say "this city always has this specific structure."
- **No interiors.** Buildings are solid. (Parked deliberately — see `BACKLOG.md`.)
- **No terrain painting.** Hills, rivers and cliffs can't be authored; only the mining pits and the
  metro cut carve the ground, and only because those tiles ask for it.

---

## WHAT I FIXED IN THIS PASS

Evaluated by screenshotting the tile proving ground and real cities at several zooms, day and
night. Two things were badly wrong, both in the **ground** — the largest surface on screen:

**1. The street was a black slab.** The asphalt was `#57544c` under a `#8f897d` material multiply,
and roughly 40% of every tile is road, so in daylight the whole city read as bright buildings
floating on a dark void. There was a kerb line but **no sidewalk**, so towers sat directly on the
carriageway.

The street is now a proper section: a pale concrete **sidewalk** band with paving joints, a bright
**kerb**, a darker **gutter** shadow line, real asphalt grey, and lane markings that read.

**2. Parks rendered as holes.** Lawns are *unlit* decals — whatever value you write is what you see,
with no sun to lift it — and they were mid-dark greens over a dark ground, so they looked like
shadows cut into the pavement rather than grass. The greens are now written at the value they
should appear.

**3. The atlas was read-only.** It could browse and reroll but not author. It now paints.

---

## WHAT TO DO NEXT — in priority order

These are ranked by how much they unlock, not by effort.

**1. A real road graph.** Roads become data — nodes at cell corners, edges with a class
(dirt / street / arterial / highway) — instead of a wrapped texture. This is the keystone: it
unlocks T-junctions, dead ends, dirt tracks through farmland, correct intersections, roads that
follow the terrain and *bridge* the metro cut instead of dripping into it, and a network that
traffic, pedestrians, police and the news helicopter can all actually drive. Everything else on this
list is easier once it exists.

**2. Multi-cell footprints.** An anchor cell holds the real structure and the cells it covers hold a
reference to it. That's the whole mechanism, and it buys airports, rail yards, a stadium that reads
as a stadium, a seaport spanning the full water column, and a true downtown core.

**3. Placement as a data table.** Today, which tile goes where is a hand-written chain of `if`
statements. Move it to a table — `{ when, min, max, weight, score, footprint }` per tile — and
rarity, landmarks, and "this city always has exactly one of these" all become editable content
rather than code. This is also the table the editor should expose.

**4. Lift the density cap.** Move fog occlusion off the fixed uniform array (a data texture, or a
coarse grid) so `STRUCT_CAP` becomes a density *dial* instead of a hard ceiling, and big cities can
actually feel big.

**5. Editor quality of life.** Undo, save/load named layouts, plan JSON import/export, and a
*lock* toggle so a cell can be protected from rerolls without being repainted.

**6. Region skins from `cultureCode`.** Every city already carries one of 14 architectural regions
(East Asia, West Europe, Middle Eastern, South America…) and **nothing reads it**. One palette
table — roof material, wall tone, vegetation, ground colour — would make Kabul stop looking like
Oslo, for very little code.

---

## THE CAPTURE HARNESS

The screenshots here were taken with a small rig worth keeping. In the browser console:

```js
CITYCAM.open(() => galleryPlan())   // build a plan, kill the sim wash + fog, hide the HUD
CITYCAM.day(0.25)                   // 0.25 = midday, 0.75 = midnight
CITYCAM.look(x, z, zoom)            // aim the iso camera at a world point and freeze the sim
```

Three gotchas it exists to solve: the Danger Room paints everything holo-cyan (`world.setSim(false)`),
fog hides distant blocks (`setFogEnabled(false)`), and the camera fights you unless you replace
`game.update` with a bare `world.render()`.

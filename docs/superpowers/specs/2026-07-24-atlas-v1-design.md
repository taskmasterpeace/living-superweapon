# ATLAS v1 — the standalone city generator (design)

*2026-07-24. Approved by Robert across three interview rounds in this session. This is the
contract for the build; the implementation plan derives from it.*

---

## WHAT ATLAS IS

The map maker leaves the menu and becomes a product: **ATLAS**, a standalone city-generation
tool that games consume as data. WAR WORLD is its first customer, not its owner. Robert's
mandate, verbatim: **"ATLAS should be powerful af."**

Version 1 stays in this repo as its own entry page. The plan JSON is the product contract;
a game that wants higher-poly buildings, its own vehicles, or a different engine entirely
reads the same data and skins it however it likes.

---

## RULINGS FROM THE INTERVIEW (2026-07-24)

| Question | Ruling |
|---|---|
| Standalone shape | **Own page, same repo** — extraction to its own repo later is mechanical |
| Name | **ATLAS** (continuity with the in-game CITY ATLAS; Robert: "a cities of Atlas") |
| Doors | **Meshes + data everywhere**, no opening animation yet |
| Character scale | **Metric knob** (`humanH`) — proportions independent of map footprint |
| Underwater/underground | **Map-side groundwork now**; swimming later; roofed voids stay parked |
| Climate | **ATLAS is a data platform** — games render their own weather; needs time-of-year |
| Forest | Jungle must read as **Vietnam**; canopies must **cut away** like towers do |
| Layers | **"Buildings could never go over the building level"** — enforce by construction |
| Interiors | **Un-parked.** Floorplan engine + room-size slider; **residential proven first**; cutaway-when-inside |
| Water look | **Alive, not a frozen texture** — ripples, splashes, slow-mo falls into water |
| Vehicles | Stay throwable props; games bring their own assets later; **no traffic yet** |
| Optimization | **A stated priority** — budgets below are part of the contract |

---

## ARCHITECTURE

### 1. Two mounts, one product
- New `atlas.html` + `src/tool/atlas-main.js` beside the game (second vite input;
  `base: './'` untouched — it is load-bearing for the desktop build).
- The map-maker UI moves **out of hud.js** into `src/engine/atlasUI.js`:
  `mountAtlas(el, { world, game? })`. The standalone page mounts it full-screen with file
  import/export and no game chrome; the in-game ATLAS screen mounts the same module and adds
  game-only actions (SET AS THEATER, drop into match).
- `data/cityplan.js` remains **zero-Three.js**. The planner is the portable core.
- Rejected alternatives: a second hand-written UI (drifts), embedding the game page (hacky).

### 2. The data contract
- `docs/ATLAS_FORMAT.md` documents the plan schema — every field, every enum.
- Plan gains: `metric`, per-cell water `depth`, `bands`, climate summary.
- **Build report** export: after a build, `world.doors` + cover boxes + landmark names ship
  alongside the plan for engines that want geometry hints.
- Explicit ruling honoured: "if it's just data, we should be able to replace buildings with
  higher-poly" — the contract is the enabler; no glTF export in v1.

### 3. The metric contract
- `plan.metric = { humanH }`, default **9.6** (today's 1.8 m heroes). `M = humanH / 9.6`.
- Derives: door sizes, storey height (window-bay `userData.bay × M`), streetlight height,
  car dimensions, kerbs, railings, turnstile lanes.
- Distinct from the CELL dial: **CELL = how big the map is, METRIC = how tall your people
  are.** Both are ATLAS controls.

### 4. Doors
- `door(ctx, x, z, ry, kind)` helper in citytiles; kinds: `swing · double · slide · revolve
  · roller · turnstile`. Sized from metric (door ≈ 1.17× humanH tall; turnstile lane ≈
  0.45× wide — the "body dimensions" requirement).
- Every inhabited builder places entrances on its street frontage via `cell.face` (sockets).
- Doors register into `world.doors` `{x, z, ry, kind, w, h, tile}` — the future interior
  system's list of every way in, and part of the build report.

### 5. The layer contract (bands by construction)
- `TILE_MAX_H` table in cityplan: every type/size declares its maximum height; builders
  clamp to their row. One source; the validator asserts it.
- `plan.bands` derives from the actual skyline + relief: GROUND / BUILDING (spans to the
  tallest roof) / SKY (thin lane above it) / CLOUDS (thin ceiling), plus negative bands
  (see §6). A landmark tower raises that city's BUILDING band; **no structure can cross
  into SKY by construction.**
- `bandOf` reads per-city bands from the world (kills the two hand-copied threshold sites,
  finding F2 of the altitude plan). Defaults preserved when a plan has no bands.
- This is the map-side groundwork the four-level-ladder session consumes.

### 6. The deep
- Water cells carry authored **depth**: SHALLOWS −8 · DEEP −22 · TRENCH −44 (× metric/cell
  scale). The seabed is real terrain pushed below the waterline — `heightAt` already
  supports it; the shore apron generalises.
- Water colour ramps with depth to near-black at trench — "the deep end is night."
- Negative bands published on `plan.bands` as **data** (SHALLOWS / DEPTHS); movement,
  swimming and pressure stay out of scope this session.
- The editor paints depth (water palette gains the three rungs).
- Roofed underground (subway tubes, sewers) remains impossible on a heightfield and stays
  parked with the roofed-volume design. The metro stays an open cut.

### 7. Living water
- The surface is **animated** — vertex-shader waves in the house style (stylised, warm-dark,
  no photorealism, no purple), not a frozen texture.
- **Impacts read**: blasts and hard landings over water spawn ripple rings + splash spray;
  a ragdoll or slammed fighter falling into water splashes properly and reads under slow-mo
  ("carry the fall").
- No buoyancy sim; ragdolls settle just under the surface on the seabed.
- **Open item (Robert: "we don't know")**: the news crew and water — v1 keeps reporters
  shore-side filming from the quay; underwater filming is future work.

### 8. Forest v2
- **Jungle reads as Vietnam**: layered double/triple canopy heights, undergrowth walls,
  at most ONE narrow trail. Temperate forests drop to one path or none — "a forest should
  look different than a jungle," and neither looks like a park.
- **Canopy cutaway**: extend the occlusion concept to trees — canopy instances in the
  camera→player corridor scale away so a fighter under the trees is visible. Per-instance
  matrix updates on the existing canopy InstancedMesh; budgeted per frame.
- Honesty preserved: visual only. Fog, `_vis`, and AI belief are untouched — a fog-hidden
  enemy is already not drawn, so the cutaway cannot leak one.

### 9. The funfair
- New type with a size ladder: **THE FAIRGROUND** 1×1 (carousel, midway stalls, small wheel)
  → **THE AMUSEMENT PARK** 2×2 (big Ferris wheel that **turns**, coaster with real track on
  supports, drop tower, gate arch).
- Placement gated to resort/commercial cities of Town+; landmark-pool entry for tourism
  cities with a generated name (THE ⟨CITY⟩ WONDER WHEEL / PIER).
- Big pieces register as cover; the wheel spins via a lightweight world spinner list.

### 10. Climate
- `data/climate.js` — the **authored-join pattern** (same as `geography.js`; the CSV stays
  untouched): Köppen zone + approximate latitude per **country**, with per-city overrides
  where one country spans climates (US, China, Brazil, Australia, Russia, India…).
- `climateOf(city)` → `{ koppen, label, t[12] (monthly means), precip, snowMonths }` —
  monthly curve generated from zone + latitude + hemisphere, so January in New York is
  cold and January in Miami is not, and time-of-year is a queryable axis.
- ATLAS city card shows it: "Cfa · JAN −1° · JUL 29° · SNOW DEC–MAR".
- **Games render weather, ATLAS carries data** (Robert's ruling — particles are the game's).
- Enrichment answer: Köppen–Geiger grids and WorldClim/NOAA normals are public; when real
  per-city numbers are wanted, a run-once **offline bake script** regenerates this same
  reviewable file. No runtime network.

### 11. Interiors v1 (un-parked by ruling, this session)
- **Floorplan engine** in the planner layer (pure data): partitions a building footprint
  into rooms — BSP-style splits with corridors and doorways, min-room-size driven by a
  **room-size slider** in ATLAS (`plan.roomScale`), rooms guaranteed reachable, corners
  guaranteed (corner warfare is the point). Four archetypes defined — residential,
  commercial, institutional, industrial — **residential ships enterable this session**;
  the other three generate data only until next session.
- **Walls are real cover**: interior wall segments become thin cover boxes registered
  per-building and **spatially gated** — `canSee`/physics consult a building's interior
  set only when the query segment crosses that building's AABB. Fog occupancy rasterises
  them like any cover, so corner-peeking, AI belief and gunfights work with zero new
  combat rules.
- **Doorways are gaps** (no collision) in the wall runs, placed where §4 doors stand.
- **Seeing in = cutaway-when-inside**: the enterable building's shell + roof fade for the
  camera when the player is inside (extends `updateOcclusion`). Enemies inside stay
  hidden until fog/LOS reveals them — no wallhack.
- Flight/indoors question (BACKLOG) answered for v1 the cheap way: interiors are
  ground-floor spaces; the band servo treats an interior as GROUND.

---

## PERFORMANCE BUDGETS (part of the contract)

- Full-sheet sweep (1,050 × 3 seeds): **0 validation problems**, plan time within 10% of today.
- 9×9 soak with combat stays ≤ **3.5 ms/frame** sim on the dev box (the 4090 machine —
  today's measurement is 2.76 ms, so this allows the new systems ~0.7 ms total).
- City rebuild ≤ **12 ms**; no per-frame allocations in new hot loops (canopy cutaway,
  water waves, spinners, interior LOS gate).
- Interior LOS cost proportional to interiors actually present (spatial gate, measured).
- Canopy cutaway ≤ **0.15 ms/frame** at forest-heavy 9×9.

## VERIFICATION

Headless, per HANDOFF.md recipes, at every stage: the full-sheet sweep; production build
(`npm run build`) for BOTH entries; in-game ATLAS regression (paint, lock, undo, resize,
live 3D); freeze-frame screenshots (doors street-level, jungle + cutaway, trench at night,
funfair, an interior firefight); a scripted interior AI duel proving corner warfare
(bots lose sight at a wall, re-acquire through a doorway).

## NON-GOALS (v1)

Traffic/driving · enterable commercial/institutional/industrial (data only) · glTF export ·
weather particles · swimming/underwater combat · roofed underground · netcode.

## OPEN ITEMS CARRIED

News crew vs water (shore-side for now) · offline climate bake script (when Robert wants
real normals) · upper floors & the roofed-volume system · the other three interior types'
geometry pass.

## BUILD ORDER

1. Extraction: `atlasUI.js` + `atlas.html` (controls land in the extracted module once)
2. Metric contract + doors
3. Layer contract (`TILE_MAX_H`, `plan.bands`, `bandOf` rewire)
4. The deep (depth data, seabed, dark water) + living water
5. Forest v2 + canopy cutaway
6. The funfair
7. Climate (`data/climate.js` + card)
8. Interiors v1 (floorplan engine → residential enterable → cutaway → AI proof)
9. `ATLAS_FORMAT.md` + docs sweep (THE_MAP_MAKER, CLAUDE.md, HANDOFF)

Docs update in the same commit as the change they describe — house rule.

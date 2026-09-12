# Building Delivery — Research Outpost Lab (two-story pilot)

A reusable, **enterable two-story** research lab for PowerWorld (third-person / chase-cam game):

- **Ground floor** — front entrance, flank **breach panel**, entry-lab + case room (with the case plinth).
- **Inter-storey floor slab** — the upper floor *is* the lower ceiling (one thick box, not two planes).
- **Upper floor** — two rooms + windows, reached by the stair.
- **Switchback stair** ground → upper → roof, and an **accessible roof** deck.
- **Breakables**: front door leaf, flank weak wall, an **upper-floor smash panel** (down into the ground floor) and a **roof smash panel** (down into the upper floor); bounded debris.

It can also stand in as a city building. This is an **asset pilot on the v1 outpost-interior spec**
(`docs/superpowers/specs/2026-09-11-powerworld-v1-playable-loop.md` §6). It replaces the runtime's
whole-building solid AABB with **stable-ID wall / floor / opening collider data carrying a `level`**,
intact/breached states and bounded debris — so a soldier walks every route on both floors, a
superhero breaches the marked weak structure, and nobody shoots through an intact wall.
**No invisible solid box fills the rooms.**

**Third-person visibility is per-camera fade, never global roof removal** — see `INTEGRATION.md` and
"Two stories" below.

It is **100% procedural from a committed recipe** — no external, downloaded, licensed, or paid asset
inputs. A clean checkout rebuilds byte-identical with **Node alone** (no `npm install`).

---

## What's in the package

```
authoring/buildings/lab.v1/recipe.json     ← THE SOURCE (levels, stairs, roof, materials, states)
tools/building-delivery/
  lib/model.mjs        single source of truth: recipe → pieces/colliders/graph/stairs/shelter/debris (multi-story)
  lib/glb-write.mjs    zero-dependency glTF 2.0 / GLB writer (pure Node, no three.js)
  build-lab.mjs        recipe → all outputs (deterministic)               [build command]
  validate-lab.mjs     standalone fixture: clearance/LOS/breach/stairs/fade/hashes  [validate command]
  reproduce-lab.mjs    rebuild in memory, diff sha256 vs committed         [reproduce command]
  render-views.mjs     dimensioned orthographic SVG views                 [views command]
public/building-delivery/lab.v1/
  lab.glb              low-cost render mesh; one named node per collider group, PER STOREY (roof + each breakable separable)
  colliders.json       AUTHORITATIVE collider pieces (stable IDs, `level`, 3D AABBs, hp, dtype, states) + fadeNodesByLevel
  openings.json        openings with clearance, level + state gate (doors, windows, breach, stair holes, smash holes)
  room-graph.json      rooms (per level), openings, waypoints, routes, stairs
  shelter.json         interior shelter volume (both storeys) + roof deck volume
  debris.json          bounded debris spec per breakable
  runtime-interior.json  DIRECT-SUBSET of the GROUND FLOOR for today's world.interiors
  manifest.json        units, axes, dimensions, clearances, budgets, sha256 of every file, known gaps
  views/*.svg          6 annotated drawings (ground/upper/roof plans, section, front + flank elevations)
  viewer.html          optional dev viewer (three.js via CDN; NOT a build input) with per-storey peel
docs/building-delivery/
  README.md · INTEGRATION.md · shots/ (real-mesh renders + walkthrough.gif)
```

---

## Scale contract (measured from the runtime, not guessed)

Authored **directly in PowerWorld world units (`u`)** — import conversion is **1:1**; metres are docs only.

| Quantity | Value | Source |
|---|---|---|
| 1 world unit | **0.1875 m** (1 m = 5.333 u) | `citytiles.js` `door()` `DH=11.2*M` = "2.1m" → 2.1/11.2 |
| Fighter collision radius | **2.2 u** (Ø 4.4 u) | `entity.js:286` `this.radius = 2.2` |
| Standing head height | **11 u** | `entity.js` interior ceiling clamp `bodyHeight … : 11` |
| Soldier / standard hero | **9.6 u** (1.8 m) | citytiles metric; SARGE/MERC are Fighters at the same radius |
| Large-hero silhouette (max) | **~12.5 u tall / ~9.5 u wide** | CLAUDE.md frame audit |
| Chase-cam comfort ring | **~12 u** lateral room the boom wants indoors before shortening | third-person sizing |

| Opening / clearance | Value | Fits |
|---|---|---|
| Front door (ground) | 9 × 14 u | soldier with margin; chase boom trails through |
| Interior doorways (both floors) | 9 × 14 u (L0) / 9 × 12 u (L1) | soldier |
| Flank breach opening (breached) | 17 × 15 u | large hero (9.5 × 12.5 u) with margin |
| Upper windows | 7 × 7 u, sill 5 u | LOS / light (not a walk route) |
| Per-floor clear ceiling | 14.8 u (2.78 m) | +3.8 u over the 11 u head, +2.3 u over the 12.5 u silhouette, room for the chase boom |
| Stair (each flight) | 7 steps · riser 2.29 u · tread 2.4 u | riser ≤ the runtime's 2.5 u step-on snap; reaches its level |
| Stair headroom | shaft **open over the whole run** in the slab above | climber's head clears the slab from step 2 up — no clip on the way up |
| Chase-cam ring per entry room | ground_entry 39.6 × 19.2 u · upper_front similar | Ø12 u ring fits both floors |

**Footprint 42 × 46 u** (7.88 × 8.63 m) per floor · **2 storeys**, floor-to-floor 16 u · roof deck at 32 u ·
total height to parapet **34.2 u** (6.41 m).

---

## Reproduce it from a clean checkout

No source acquisition, no credentials, no paid generation, no `npm install`. The only build inputs are
`recipe.json` and the committed generator sources under `tools/building-delivery/`.

```bash
git -c core.autocrlf=false clone <repo> pw && cd pw && git config core.autocrlf false
git checkout codex/enterable-building-pilot
node tools/building-delivery/build-lab.mjs        # recipe → all outputs (Node only)
node tools/building-delivery/reproduce-lab.mjs    # → REPRODUCIBLE: 8 files rebuilt byte-identical
node tools/building-delivery/validate-lab.mjs     # → 20/20 checks passed — all green
node tools/building-delivery/render-views.mjs     # (optional) regenerate the SVG views
```

Tested on **Node v25.8.0**. **Zero external inputs** + LF `.gitattributes` (`* text=auto eol=lf`,
`*.glb -text`) in each owned directory make the sha256 in `manifest.json` reproduce on any clean clone,
even under the Windows-default `core.autocrlf=true` (verified via a fresh clone). No timestamps or
randomness in the build; provenance date comes from the recipe.

---

## Budgets (measured)

| Metric | Value |
|---|---|
| Triangles | **840** |
| Vertices | 1,680 |
| Draw calls / render nodes | **17** (one node per material group, per storey; roof + each breakable separable) |
| Materials | 17 (flat PBR base colors, **no textures**) |
| GLB size | **61,836 bytes** (~60 KB) |
| Levels | 2 · rooms 4 · openings 10 · stairs 2 |
| Collider pieces | 59 (stable IDs, each carrying a `level`) |
| Breakables | 4 (front door · flank panel · upper-floor panel · roof panel) |
| Debris (bounded, total) | ≤ 504 chunk-tris across the four breakables |

Low by design (axis-aligned boxes, one primitive per material, untextured, matching the game's
primitive-city aesthetic). The runtime may instance/merge the static per-storey nodes further.

---

## Views

**Dimensioned orthographic drawings** (`views/`, regenerated by `render-views.mjs`), with to-scale
soldier (cyan) and large-hero (gold) silhouettes:

| View | Shows |
|---|---|
| `views/plan-ground.svg` | ground plan · soldier recover route · chase-cam ring · door + breach + stair |
| `views/plan-upper.svg` | upper plan · rooms + partition doorway · stair · breakable floor panel · chase ring |
| `views/plan-roof.svg` | roof deck · parapet edge · stair hatch · breakable roof panel |
| `views/section-stairs.svg` | **section through both floors** · switchback stair · floor-2 slab · roof · dims |
| `views/elev-front.svg` | **door clearance** · two floors, ground door + upper windows, soldier vs large hero |
| `views/elev-flank-breach.svg` | **breach opening** · large-hero clearance |

**Real-mesh renders** of the actual `lab.glb` (game-matched desert lighting), in `shots/`:

| Shot | Shows |
|---|---|
| `shots/lab-front.png` | exterior front: two floors, ground door + soldier at the threshold, **stair visible through the open doorway**, upper window, roof deck |
| `shots/lab-stairwell.png` | **the −X stairwell** with a soldier climbing mid-flight — head in the **open shaft** overhead = the headroom made visible |
| `shots/lab-cutaway-ground.png` | **roof + upper floor peeled** → ground floor: stair A rising from the door with a climber, open air above (clearance), entry/case + breach |
| `shots/lab-cutaway-upper.png` | **roof peeled** → upper floor slab with the real **stairwell hole** cut over stair A, stair B rising to the roof, windows |
| `shots/lab-top.png` | overview: parapeted deck, hazard roof panel, stair hatch |
| `shots/lab-breach.png` | breached flank — weak panel gone, large hero fitting the opening |
| `shots/lab-roof.png` | accessible roof deck, parapet, hatch, weak panel |
| `shots/walkthrough.gif` | two-story tour: front door → height → ground cutaway (stair) → stairwell climb → upper slab hole → roof |

> The cutaway shots peel a storey at a time — that is an **authoring** view, and it is exactly the
> per-camera fade model generalized (fade what's between the camera and the player). Generated concept
> images are not used and are not gameplay evidence; these are the committed `lab.glb` rendered with
> three.js, and the SVGs are computed from the collider data. Native camera / projectile / AI / rain /
> destruction behaviour is verified in-engine by the main task — see `INTEGRATION.md`.

---

## Two stories — how visibility works (the important part)

You do **not** remove the roof at runtime. Third-person visibility is the engine's existing tower /
canopy cutaway rule and the spec's "fade only player-obscuring geometry": **fade only the geometry on
the camera→player segment.** For two floors:

- Player on the **ground floor**, camera outside/above → the roof *and* the floor-2 slab between the
  lens and the player fade; the upper storey's far walls stay solid.
- Player **upstairs** → only the roof (and the near upper wall) fade; the ground floor isn't between
  lens and player, so it's untouched.

It keys on "is this piece between the camera and the player," not "is this the roof," so it works for
1, 2, or N storeys with no special case. The package supports it directly: every storey's roof /
ceiling / floor slab and walls are **separate named nodes** carrying a `level`, and
`colliders.json.fadeNodesByLevel` lists the node groups per storey (`0`, `1`, `roof`), verified
disjoint so fading one storey never nukes another. See `INTEGRATION.md` §A.

---

## Known gaps / limitations (honest)

- **Multi-level colliders need the runtime extension.** Today's `world.interiors` is single-storey
  floor→top columns. `runtime-interior.json` carries only the **ground floor** (its `top` is the
  upper-floor slab at 16 u, *not* the roof at 32 u). The upper floor, inter-storey slab, stairs,
  per-piece breakable state, floor/roof smash panels, roof-as-real-top, and per-storey fade are the
  extension seam in `INTEGRATION.md` §B — proven by the standalone fixture.
- **Auto step-up is a movement capability, not asset data.** Both stair flights are geometrically
  walkable (riser ≤ 2.5 u snap) and reach their level; climbing on foot needs the movement step-up
  seam (or jumping the steps / flight). Both flights sit in the **−X bay** (clear of the +X breach
  path); the slab above each run is an **open shaft over the whole flight**, so a climber has full
  head clearance the entire way up (see the section view + `lab-stairwell.png`).
- **Debris is a bounded spec** (counts/sizes/lifetime/spawn volume), not baked chunk meshes; no
  collapse simulation.
- **The research case is a FrontlineEncounter runtime entity** — this package supplies the plinth and
  the `case_spawn` waypoint, not the case. The dev `viewer.html` needs three.js (CDN) and is not a
  build input.
- **No claim** on native camera, projectile blocking, AI navigation, rain occlusion, or gameplay
  acceptance from these renders — those are the main task's to verify in-engine.

See `INTEGRATION.md` for the exact seam and the validation fixture.

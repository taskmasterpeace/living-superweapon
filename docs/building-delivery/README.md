# Building Delivery — Research Outpost Lab (pilot)

A reusable, **enterable** single-storey research lab for PowerWorld: front entrance, flank breach
panel, entry-lab + case room, a straight stair to an **accessible roof**, and selected breakable
pieces (front door leaf, flank weak wall, one roof panel). It can also stand in as a city building.

This is an **asset pilot on the v1 outpost-interior spec** (`docs/superpowers/specs/2026-09-11-powerworld-v1-playable-loop.md`
§6). It replaces the "whole-building solid AABB" the runtime uses for outpost buildings with actual
**stable-ID wall / floor / opening collider data** plus intact/breached states and bounded debris —
so a soldier can walk every route, a superhero can breach the marked weak structure, and nobody can
shoot through an intact wall. **No invisible solid box fills the rooms.**

It is **100% procedural from a committed recipe** — no external, downloaded, licensed, or paid asset
inputs. A clean checkout rebuilds byte-identical outputs with **Node alone** (no `npm install`).

---

## What's in the package

```
authoring/buildings/lab.v1/recipe.json     ← THE SOURCE (all dimensions, materials, states — human-authored)
tools/building-delivery/
  lib/model.mjs        single source of truth: recipe → pieces/colliders/graph/stairs/shelter/debris
  lib/glb-write.mjs    zero-dependency glTF 2.0 / GLB writer (pure Node, no three.js)
  build-lab.mjs        recipe → all outputs (deterministic)               [build command]
  validate-lab.mjs     standalone fixture: clearance / LOS / breach / hashes  [validate command]
  reproduce-lab.mjs    rebuild in memory, diff sha256 vs committed         [reproduce command]
  render-views.mjs     dimensioned orthographic SVG views                 [views command]
public/building-delivery/lab.v1/
  lab.glb              low-cost render mesh, one named node per collider group (roof separable)
  colliders.json       AUTHORITATIVE collider pieces (stable IDs, 3D AABBs, hp, dtype, states)
  openings.json        openings with clearance + state gate
  room-graph.json      rooms, openings, navigation waypoints, routes, stairs
  shelter.json         interior shelter volume (rain/ambient/camera) + roof deck volume
  debris.json          bounded debris spec per breakable
  runtime-interior.json  DIRECT-SUBSET projection onto today's world.interiors contract
  manifest.json        units, axes, dimensions, clearances, budgets, sha256 of every file, known gaps
  views/*.svg          5 annotated orthographic drawings
  viewer.html          optional dev viewer (three.js via CDN; NOT a build input)
docs/building-delivery/
  README.md            this file
  INTEGRATION.md       the exact runtime seam (direct subset + extension points + fixture)
  shots/               real-mesh renders + walkthrough.gif
```

---

## Scale contract (measured from the runtime, not guessed)

All geometry is authored **directly in PowerWorld world units (`u`)** — import conversion is **1:1**.
The metre figures are documentation only.

| Quantity | Value | Source (runtime constant) |
|---|---|---|
| 1 world unit | **0.1875 m** (1 m = 5.333 u) | `src/engine/citytiles.js` `door()` `DH = 11.2*M` commented "a 2.1m doorway" → 2.1/11.2 |
| Fighter collision radius | **2.2 u** (Ø 4.4 u) | `src/engine/entity.js:286` `this.radius = 2.2` |
| Standing head height (ceiling clamp) | **11 u** (≈2.06 m) | `src/engine/entity.js` interior clamp `bodyHeight = … : 11` |
| Soldier / standard hero height | **9.6 u** (1.8 m) | citytiles metric comment; SARGE/MERC are Fighters at the same radius |
| Large-hero silhouette (max) | **~12.5 u tall / ~9.5 u wide** | CLAUDE.md frame audit (RAGE 12.47u, OLYMPUS 9.44u wings) |
| Native door opening | **11.2 u tall / 5.8 u wide gap** | citytiles `door()` `DH`; bungalow shell `doorW = 5.8*M` |

The pilot is dimensioned so a soldier clears every route and a large hero clears the breach:

| Opening | Clearance | Fits |
|---|---|---|
| Front door | 6.2 u W × 11.6 u H | soldier (Ø4.4, head 11) with margin; **too small for a 12.5 u hero → use the breach** |
| Interior doorway | 6.2 u W × 11.6 u H | soldier; aligned with the front door for a straight recover route |
| Flank breach opening (breached only) | 12 u W × 13 u H | large hero (9.5 u wide, 12.5 u tall) with margin |
| Roof hatch | 6 u × 6 u | soldier onto the deck at the stair head |
| Roof smash panel (breached only) | 10 u × 10 u | large hero drop into the case room |
| Interior clear ceiling | 13.8 u (2.59 m) | +2.8 u over the 11 u collision head; +1.3 u over the 12.5 u silhouette |
| Stair to roof | 7 steps · riser 2.14 u · tread 2.4 u | riser ≤ the runtime's 2.5 u step-on snap tolerance; reaches deck 15 u |

Building footprint **30 × 34 u** (5.63 × 6.38 m); total height to parapet **17.2 u** (3.23 m).

---

## Reproduce it from a clean checkout

No source acquisition, no credentials, no paid generation, no `npm install`. The only build inputs
are `recipe.json` and the committed generator sources under `tools/building-delivery/`.

```bash
# 1. clone the integration branch with LF line endings (the package hashes bytes)
git -c core.autocrlf=false clone <repo> pw && cd pw && git config core.autocrlf false
git checkout codex/enterable-building-pilot

# 2. rebuild every output from the recipe (Node only — no install step)
node tools/building-delivery/build-lab.mjs

# 3. prove it is byte-identical to what is committed
node tools/building-delivery/reproduce-lab.mjs      # → REPRODUCIBLE: 8 files rebuilt byte-identical

# 4. prove the geometry (clearance / LOS / breach toggling / stairs / hashes)
node tools/building-delivery/validate-lab.mjs       # → 21/21 checks passed — all green

# 5. (optional) regenerate the dimensioned SVG views
node tools/building-delivery/render-views.mjs
```

Tested on **Node v25.8.0** (the same machine that runs the existing authoring pipeline).

**Why byte-identical is achievable here (and the existing body/motion packages are not):** this
package has **zero external inputs** — the whole model comes from the recipe — and every text output
is written LF with a trailing newline. `.gitattributes` (`* text=auto eol=lf`) in each owned
directory forces LF on checkout even under the Windows-default `core.autocrlf=true`, so the recorded
sha256 in `manifest.json` matches on any clean clone. (See `authoring/artifacts/clean-checkout-report.md`
for the CRLF/hashing pitfalls this avoids.)

`manifest.json` records the sha256 and byte size of every other output, plus a `packageHash` over the
sorted `(path, sha256)` list. `build-lab.mjs` uses **no timestamps and no randomness**; the provenance
date comes from the recipe.

---

## Budgets (measured)

| Metric | Value |
|---|---|
| Triangles | **528** |
| Vertices | 1,056 |
| Draw calls / render nodes | **13** (one node per material group; roof + each breakable is its own node) |
| Materials | 13 (flat PBR base colors, **no textures**) |
| GLB size | **40,532 bytes** (~40 KB) |
| Collider pieces | 34 (stable IDs) |
| Breakables | 3 (front door leaf · flank weak panel · roof weak panel) |
| Rooms / openings | 2 / 5 |
| Debris (bounded, total) | ≤ 384 chunk-tris across the three breakables |

Low by design: axis-aligned boxes, one primitive per material, flat vertex-lit (matches the game's
untextured primitive city aesthetic). The runtime may further instance/merge the static nodes.

---

## Views

**Dimensioned orthographic drawings** (deterministic, regenerated by `render-views.mjs`, served from
`public/building-delivery/lab.v1/views/`) — these are engineering views of the real geometry with
to-scale soldier (cyan) and large-hero (gold) silhouettes:

| View | Shows |
|---|---|
| `views/plan-ground.svg` | ground plan · soldier recover route · door + breach widths · footprint dims |
| `views/elev-front.svg` | **soldier-scale door clearance** · soldier fits, large hero is too tall |
| `views/elev-flank-breach.svg` | **breach opening** · large-hero clearance (12×13 u vs 9.5×12.5 u) |
| `views/section-stairs.svg` | **stair section** · riser/tread/rise/hatch/ceiling dims |
| `views/plan-roof.svg` | **roof edge** · parapet, hatch, breakable roof panel |

**Real-mesh renders** of the actual `lab.glb` (game-matched desert lighting), in `docs/building-delivery/shots/`:

| Shot | Shows |
|---|---|
| `shots/lab-front.png` | front entrance, soldier in the door, large hero (too big) beside it |
| `shots/lab-top.png` | overview: parapeted deck, hazard-marked roof panel, hatch |
| `shots/lab-inside.png` | **roof-off cutaway**: entry lab, partition doorway, case room, stair |
| `shots/lab-breach.png` | breached flank — the weak panel gone, large hero fitting the opening |
| `shots/lab-roof.png` | accessible roof deck, parapet edge, hatch, weak panel |
| `shots/walkthrough.gif` | short walkthrough: approach → door → interior → up to the roof |

> Generated reference *concept* images are not used here and are not gameplay evidence. The renders
> above are the committed `lab.glb` rendered with three.js; the SVGs are computed from the collider
> data. Final camera / projectile / AI / rain / destruction behaviour is verified **in-engine by the
> main task** after integration — see `INTEGRATION.md`.

---

## Known gaps / limitations (honest)

- **Auto step-up is a runtime capability, not asset data.** The current engine moves by walk + jump
  + fly with no stair step-up. The stair geometry is walkable in proportion (riser ≤ 2.5 u snap
  tolerance) and reaches the deck, but climbing it on foot needs the movement seam (or jumping the
  steps, or flight). Validated geometrically by the fixture; flagged in `INTEGRATION.md`.
- **Multi-level colliders need a runtime extension.** Today's `world.interiors` walls are
  single-storey floor→top columns. Stairs (intermediate standable surfaces), the roof-as-second-level,
  per-piece breakable state, floor pieces, and the breach opening are a **superset**. `runtime-interior.json`
  carries the enterable **ground floor** that works today; the rest is the documented seam + the
  standalone fixture.
- **Debris is a bounded spec** (counts / sizes / lifetime / spawn volume), not baked chunk meshes,
  and there is **no collapse simulation** — selected pieces only.
- **The research case object is a FrontlineEncounter runtime entity** — this package supplies the
  plinth and the `case_spawn` waypoint, not the case.
- **The dev viewer needs three.js** (loaded from a CDN). It is a convenience for inspection/recording,
  **not** a build input; the offline deliverables are the GLB, the JSON, and the SVG views.
- **No claim** is made here about native camera behaviour, projectile blocking, AI navigation, rain
  occlusion, or gameplay acceptance from these renders. Those are the main task's to verify in-engine.

See `INTEGRATION.md` for the exact seam and the validation fixture.

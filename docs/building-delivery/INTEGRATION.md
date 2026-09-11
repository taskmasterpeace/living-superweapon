# Integration seam — Research Outpost Lab

The main task owns runtime integration. This document is the **exact seam**: what plugs into the
runtime today with no code changes, and what needs a bounded runtime extension (with a standalone
fixture that already proves the geometry so integration is a wiring job, not a discovery job).

Everything here is **building-local**: origin `(0,0,0)` = footprint ground-centre, floor plane
`y = 0`, entrance faces **+Z**, breach flank on **+X**. To place the building at a world spot, add a
world centre `(cx, cz)` and rotate the local coordinates by a yaw `ry` (the runtime already places
buildings this way). The pad under it should be level — the runtime has `world.levelArea(cx,cz,hw,hd,y,apron)`
+ `restoreTerrainPatch` (`src/engine/world.js:2042`) for exactly this (the "venue ground" contract).

---

## A. The direct subset — enterable ground floor, works TODAY

`public/building-delivery/lab.v1/runtime-interior.json` is a projection of the intact ground floor
onto the **current** `world.interiors` contract (`src/engine/world.js:95`). Its `interior` object has
the exact shape the runtime already consumes:

```js
{ x, z, hx, hz, top,               // building AABB centre + half-extents + roof-deck-top Y
  walls: [ { x, z, hx, hz, id } ], // vertical wall AABBs (floor→top), door GAPS are simply absent
  doorways: [ [x,z], … ] }         // nav points through the openings (matches bungalow `doorways`)
```

To make the lab enterable in the runtime, the main task builds the render meshes from `lab.glb`,
translates/rotates both the meshes and this record to the world spot, attaches `meshes` /
`fadeMeshes` (the shell + roof nodes) for the interior cutaway, and pushes it onto
`world.interiors`. Then, unchanged and for free:

- **Movement collision + door gaps + ceiling + roof-standing** — `src/engine/entity.js` interior
  block (`for (const it of game.world.interiors)`): walls push the body out on the least-penetration
  axis, the door gaps pass, `pos.y` clamps under `it.top`, and the body stands on the roof at `it.top`.
- **Projectile collision / LOS** — `world.hitInteriorWall(x,y,z,r)` (`src/engine/world.js:724`): a
  shot is stopped by an intact wall AABB below `top`, and passes through a door gap. Intact structural
  walls have no gap, so **you cannot shoot through them** — the "cannot shoot through intact walls"
  rule holds for the ground floor with zero new code.
- **Sight LOS** — the interior-wall branch of the sight trace (`traceBox3` over `it.walls`,
  `src/engine/world.js` ~1583) and the reticle `aimTrace` interior branch (~1655).
- **Interior cutaway** — shell + roof `fadeMeshes` fade when the player is inside
  (`src/engine/world.js` ~1476).

**Lintels are intentionally omitted** from `runtime-interior.json` (they have `min.y > 0`; the
runtime's 2D wall model would otherwise place a solid box across the doorway — the exact
"invisible box across the door" failure the handoff names). The fixture check
*"no collider box sits across any OPEN opening"* guards this.

**To breach the flank at runtime (subset):** drop the wall whose `breakGroup === "breach_panel"`
from `interior.walls` and reveal the breach opening. That is the one breakable the subset can model
without an extension (it is a full-height ground wall).

What the subset does **not** carry: the stairs (no intermediate standable surface in this contract),
the roof hatch as a hole, per-piece breakable state, floor pieces, or the roof-smash opening. Those
are Section B.

---

## B. The extension seam — the superset (needs bounded runtime work)

The authoritative description of the whole building is `colliders.json` — every piece is a 3D AABB
with `id`, `role`, `material`, `hp`, `dtype`, `collider`/`standable`/`breakable` flags, `breakGroup`,
and a `state` (`always` | `intact-only`). `states.intact` / `states.breached` list the visible
pieces, active colliders, and open openings per scenario. The runtime extension consumes this richer
schema; each piece keeps a **stable ID** so a broken piece maps mesh↔collider↔debris unambiguously.

Recommended seam, smallest first:

1. **Per-piece breakable state (doors, walls, roof panel).** Give the interior record a list of
   breakable pieces keyed by `id`, each with `hp`/`dtype` and an `intact`/`breached` collider set.
   Route damage through the existing `damageBlock(c, amt, pos, src)` choke point so it inherits kill
   attribution, the `launchT` "who broke it" slam law, resistances (`resistOf`), and the pre-break
   vent tell. On break: remove the piece's collider(s), hide its render node (see node-name note
   below), open its opening, and spawn its debris (Section C). Structural pieces have hp 1200 and are
   effectively unbreachable by weapons — that is what keeps "cannot shoot through intact walls" true.

2. **Standable step colliders (stairs → roof).** The runtime already stands a body on a cover box
   `top` (`entity.js` `crossedTop`). Register the 7 `role:"step"` pieces as standable boxes with their
   `aabb.max.y` as `top`. Auto step-up (walking up rather than jumping each riser) is a **movement**
   decision the main task owns; the risers are ≤ 2.5 u (the existing snap tolerance) so it is a small
   change. Until then a fighter reaches the roof by jumping the steps or by flight.

3. **Roof-as-second-level + roof hatch/smash holes.** The roof deck is standable at `deckTop` (15 u);
   the hatch (`always`) and the roof-smash panel (`breached-only`) are holes in the roof through which
   a fighter drops into the case room. This needs the interior model to allow a standable surface at
   `deckTop` with holes — the training hall's mezzanine (`engine/whiteroom.js`) is the closest
   existing precedent.

4. **Shelter / rain / camera.** `shelter.json` gives `interior_shelter` (an AABB with
   `suppressesRain`, `interiorAmbient`, `cameraBoomShorten`) and `roofVolume` (standable deck).
   Suppress rain and transition ambient inside the volume; shorten the collision-safe camera boom
   while the player is inside (the spec's indoor-camera requirement).

5. **AI navigation.** `room-graph.json` carries `waypoints` and `routes` (soldier recover, soldier
   roof, large-hero breach, large-hero roof-smash). The opening centres double as the runtime's
   `doorways` nav points; the main task's AI pathing consumes these.

---

## C. Debris

`debris.json` is a **bounded spec** per breakable: `chunks`, `sizeRange`, `lifetimeS`, `triBudget`,
`dtype`, and `spawnAABB` (the volume the breaking piece occupied). The runtime spawns short-lived
chunk meshes within `spawnAABB` on break — no collapse simulation, no physics claim. Total across the
three breakables is ≤ 384 chunk-tris.

---

## D. Render-mesh ↔ collider mapping, and the node-name rule

`lab.glb` has **one named node per material group**; each collider piece carries the matching `node`
name. The roof is its own node (`roof_structural`) and so is each breakable
(`breakable_front_door_leaf`, `breakable_breach_panel`, `breakable_roof_weak_panel`), so integration
can hide/swap/fade by node.

⚠ **Node names are dot-free on purpose.** `three.js` `GLTFLoader` sanitises reserved characters
(`.` `:` `[` `]` `/`) in node names to `_`. To keep `mesh.name` identical to the `node` value in
`colliders.json` / `manifest.renderNodeList`, the names use underscores only. Match verbatim after a
`GLTFLoader` load — no re-sanitising needed. `manifest.renderNodeList` lists every node and the piece
ids it contains.

Do **not** register `lab.glb`'s meshes as ordinary `world.cover` — interior walls must not be
shootable through the cover path; they belong in the interior list (subset) or the extension's own
list, exactly as the bungalow keeps its walls in `world.interiors`.

---

## E. The standalone validation fixture

`node tools/building-delivery/validate-lab.mjs` proves the geometry without touching `src/`. Its
collision math mirrors the runtime (AABB push-out from `entity.js`; `hitInteriorWall`/`traceBox3`
segment-vs-AABB from `world.js`), so a pass predicts in-engine behaviour for the parts the current
contract supports. **21 checks, all green**, including:

- schema integrity (unique IDs, well-formed AABBs, state sets consistent);
- the GLB parses and its node names match the manifest;
- every committed file's sha256 matches the manifest (reproduce-lite);
- soldier clears the front door + interior door; large hero clears the breached flank + roof-smash;
- **no collider box across any open opening** (the invisible-box guard);
- the soldier recover route is walkable (intact); the breach route is **blocked while intact** and
  **open once breached**; a shot passes the front door, is stopped by an intact structural wall, and
  the flank is opaque intact / transparent breached / structure still blocking after a breach;
- stairs reach the deck with risers ≤ 2.5 u; roof deck standable + fully parapeted; shelter covers
  the interior footprint.

The fixture is the acceptance harness for the **asset**. It does **not** and cannot assert native
camera behaviour, projectile blocking, AI navigation, rain occlusion, or gameplay feel — the main
task verifies those in-engine after wiring the seam above.

---

## Reference reading (runtime, read-only)

- `src/engine/world.js` — `interiors` (`:95`), `hitInteriorWall` (`:724`), interior cutaway (~`:1476`),
  interior LOS (`traceBox3`, ~`:1583`), `aimTrace` interior branch (~`:1655`), `levelArea` (`:2042`).
- `src/engine/entity.js` — interior physics collision / roof-standing / ceiling clamp (~`:2085`),
  fighter radius (`:286`).
- `src/engine/citytiles.js` — `door()` metric + `bungalow()` interiors v1 (the precedent this pilot
  extends): `world.interiors` entry shape, `doorways`, the door-gap-as-opening idiom.
- `src/data/cityplan.js` — `floorplan()` (rooms/walls/doors schema this room graph mirrors).

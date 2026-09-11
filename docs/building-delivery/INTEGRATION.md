# Integration seam — Research Outpost Lab (two-story)

The main task owns runtime integration. This is the exact seam. Everything is **building-local**:
origin `(0,0,0)` = footprint ground-centre, floor plane `y=0`, entrance faces **+Z**, breach flank
**+X**. Place at a world spot by adding a world centre `(cx,cz)` + yaw `ry`. Level the pad with
`world.levelArea(cx,cz,hw,hd,y,apron)` + `restoreTerrainPatch` (`src/engine/world.js:2042`).

Level geometry (from the recipe): **L0** floor `y0`, ceiling `14.8`; **floor-2 slab** `14.8→16`;
**L1** floor `16`, ceiling `30.8`; **roof slab** `30.8→32`; **roof deck** standable at `32`, parapet
to `34.2`.

---

## A. Third-person visibility for N storeys — PER-CAMERA FADE, not roof removal

The single most important contract. Do **not** remove the roof globally (that is the isometric
"take the roof off" trick and it cannot work for two floors — you'd see the top floor but not the
ground floor beneath it). Use the engine's existing tower / canopy cutaway rule and spec §6 ("fade
only player-obscuring geometry"): **fade only the geometry on the camera→player segment.**

- Player on the **ground floor**, camera outside/above → fade the roof *and* the floor-2 slab
  between the lens and the player; the upper storey's far walls stay solid.
- Player **upstairs** → fade only the roof (and the near upper wall); the ground floor is not
  between lens and player, so it is untouched.

Keys on "between camera and player," not "is the roof" — storey-agnostic.

**What the package gives you for this:** every storey's roof / ceiling / floor slab and walls are
**separate named GLB nodes carrying a `level`**, and `colliders.json.fadeNodesByLevel` lists the node
groups per storey:

```
fadeNodesByLevel = { "0": [shell_l0, floor_l0, breakable_front_door_leaf, breakable_breach_panel*, case_*, trim_l0],
                     "1": [shell_l1, floor_l1, breakable_upper_floor_panel*, trim_l1],
                     "roof": [roof_structural, roof_parapet, breakable_roof_weak_panel*] }
```

Verified **disjoint** (fading one storey never hides another). The runtime, per frame, decides which
storey the player is in (from `pos.y` vs the level floor bands in `manifest.dimensions`) and fades the
node groups for storeys **above** the player plus any near wall on the camera→player segment. This
reuses the fade machinery already in `world.updateOcclusion` (`src/engine/world.js` ~1443 tower
cutaway / ~1476 interior cutaway); the only new input is "fade by level group" instead of
"fade the whole building."

---

## B. Colliders: the ground-floor subset (works today) + the multi-story extension

`colliders.json` is authoritative: every piece has `id`, `level`, `role`, `material`, `hp`, `dtype`,
`collider`/`standable`/`breakable`, `breakGroup`, `state`, and a 3D `aabb`. `states.intact` /
`states.breached` list visible pieces, active colliders and open openings.

### B1. Ground floor today (no code changes)

`runtime-interior.json` projects the **intact ground floor** onto the current `world.interiors`
contract (`src/engine/world.js:95`): `{x,z,hx,hz,top, walls:[{x,z,hx,hz,id}], doorways:[[x,z]]}`,
`top = 16` (the floor-2 slab). Push it onto `world.interiors` and you get, for free:

- movement collision + door gaps + ceiling clamp + roof-standing (`entity.js` interior block ~2085),
- projectile collision / LOS (`world.hitInteriorWall` `:724`) — intact structural walls have no gap,
  so "cannot shoot through intact walls" holds on the ground floor,
- sight LOS (`traceBox3` over `it.walls` ~1583) and the reticle `aimTrace` interior branch (~1655).

⚠ `top` here is the **upper-floor slab (16 u), not the roof (32 u)** — standing "on top" via this
record puts you on the upper floor. Lintels are omitted so no box sits across a doorway (the fixture's
*"no collider box across any open opening"* guards it). To breach the ground flank, drop the wall
whose `breakGroup === "breach_panel"`.

### B2. The multi-story extension (bounded runtime work; fixture-proven)

Consume the richer schema, smallest first:

1. **Per-storey interiors + per-camera fade** — register each storey as its own interior band
   (`level` → `[floorY, ceilingY]`) so the ceiling clamp and roof-standing use the *correct* storey
   surfaces, and wire §A's fade by `fadeNodesByLevel`.
2. **The inter-storey floor slab** (`role:"floor"`, node `floor_l1`, standable top `16`) is the upper
   floor AND the ground ceiling — one thick box. Register it standable; it blocks a shot fired
   straight up/down between floors, and it is what the upper floor stands on.
3. **Standable step colliders (both flights)** — the 14 `role:"step"` pieces (node `stair`) are
   standable boxes (`aabb.max.y` = `top`); risers ≤ 2.5 u (the existing snap tolerance). Auto step-up
   is a movement decision the main task owns.
4. **Per-piece breakable state** — 4 breakGroups (`front_door_leaf`, `breach_panel`,
   `upper_floor_panel`, `roof_weak_panel`). Route damage through `damageBlock(c, amt, pos, src)` so it
   inherits kill attribution, the `launchT` "who broke it" slam law, `resistOf` resistances and the
   pre-break vent tell. On break: drop the piece's collider(s), hide its node, open its opening, spawn
   its debris (§C). Structural pieces are hp 1200 → effectively unbreachable by weapons.
5. **Smash openings** — `upper_floor_panel_smash` (upper→ground) and `roof_weak_panel_smash`
   (roof→upper) are `+Y` openings that appear when their panel breaks (a heavy hero drops a storey).
6. **Shelter / rain / camera** — `shelter.json.interior_shelter` (both storeys) sets `suppressesRain`,
   `interiorAmbient`, `cameraBoomShorten`; `roofVolume` is the standable deck.
7. **AI navigation** — `room-graph.json` carries `waypoints` + `routes` (soldier recover / upstairs /
   roof; large-hero breach / roof-smash / floor-smash). Opening centres double as `doorways` nav points.

---

## C. Debris

`debris.json` — bounded spec per breakable: `chunks`, `sizeRange`, `lifetimeS`, `triBudget`, `dtype`,
`spawnAABB`. Spawn short-lived chunks within `spawnAABB` on break; no collapse simulation. ≤ 504
chunk-tris total across the four breakables.

---

## D. Render-mesh ↔ collider mapping, and the node-name rule

`lab.glb` has one named node per material group **per storey**; each collider piece carries the
matching `node`. The roof (`roof_structural`) and each breakable
(`breakable_front_door_leaf`, `breakable_breach_panel`, `breakable_upper_floor_panel`,
`breakable_roof_weak_panel`) are their own nodes, so integration hides/swaps/fades by node and level.
`manifest.renderNodeList` lists every node and the piece ids it contains.

⚠ **Node names are dot-free on purpose.** three.js `GLTFLoader` sanitises reserved characters
(`. : [ ] /`) to `_`; the names use underscores + a `_l<level>` suffix so `mesh.name` equals the
`node` value in `colliders.json` after a load — match verbatim. Do **not** register `lab.glb` meshes
as ordinary `world.cover` (interior walls must not be shootable through the cover path).

---

## E. The standalone validation fixture

`node tools/building-delivery/validate-lab.mjs` proves the geometry without touching `src/`; its
collision math mirrors the runtime. **20 checks, all green**, including: unique IDs + every piece has a
level; GLB nodes match the manifest; every file sha256 matches; soldier clears both floors' doors;
large hero clears the breach; chase-cam ring fits both entry rooms; **no collider box across any open
opening** (doors, windows, breach, smash holes, stair holes); soldier recover route walkable; breach
blocked intact / open breached; front-door shot passes, intact wall blocks, flank opaque→clear on
breach, upper-window shot reaches the upper floor; both stair flights reach their level; the
inter-storey floor slab separates the storeys and is standable; the roof is the real top while the
runtime subset honestly reports the ground ceiling; shelter covers both storeys; **per-storey fade
groups are disjoint.** It cannot assert native camera / projectile / AI / rain / feel — the main task
verifies those in-engine.

---

## Reference reading (runtime, read-only)

- `src/engine/world.js` — `interiors` (`:95`), `hitInteriorWall` (`:724`), tower/interior cutaway
  (~`:1443`/`:1476`, the fade machinery §A reuses), interior LOS (~`:1583`), `aimTrace` (~`:1655`),
  `levelArea` (`:2042`).
- `src/engine/entity.js` — interior physics collision / roof-standing / ceiling clamp (~`:2085`),
  fighter radius (`:286`).
- `src/engine/citytiles.js` — `door()` metric + `bungalow()` interiors v1 (the single-storey
  precedent this pilot extends to two storeys).
- `src/engine/whiteroom.js` — the training hall's two-floor mezzanine (the isometric two-floor
  precedent; per-camera fade is the third-person generalization of it).

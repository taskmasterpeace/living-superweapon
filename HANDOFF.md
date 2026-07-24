# HANDOFF — WAR WORLD: ASCENDANTS

*Written 2026-07-24. Read this first, then `CLAUDE.md`.*

This is the state of the project as it stands, what is solid, what is half-built, and what I would
do next. It is written for whoever picks this up — including me, later, with no memory of today.

---

## WHAT THIS IS

An isometric superhero action game in Three.js (`D:\lsw`), offline-first, no asset pipeline —
every model, texture and sound is generated in code. **The engine is the product**: a data-driven
power system, a 52-fighter roster that is pure data, and a **procedural city generator** that has
grown into a genuine dev tool.

Run it: `npm run dev` → http://localhost:5180

---

## THE THREE PILLARS

### 1. Combat
The Strike/Guard/Grab trifecta, charged melee, beams-as-hoses, ragdolls, 8 damage types with real
resistances, flight tiers, a tabletop attribute layer, and ORIGIN — a point-buy character creator
whose output is a full roster citizen. **Contract: `docs/COMBAT_MANUAL.md`. If you change combat,
change the manual in the same commit.**

### 2. The world
1,050 real cities off Robert's world sheet, 168 countries, procedurally built from a plan.
Police that respond to whoever hurts civilians, a broadcast layer (KMK 9) that films the fight and
reports it, and civilians whose willingness to draw on you comes from their country's laws.

### 3. ATLAS — the map maker is a product now
The editor stands alone at `/atlas.html` (one module, two mounts) with file import/export and a
documented data contract (**`docs/ATLAS_FORMAT.md`**). Since v1 (2026-07-24) it also owns: the
METRIC contract (doors on every building, sized to the people), the LAYER contract (per-city
altitude bands no structure can cross), authored water DEPTH with a living tinted surface,
forest v2 with the canopy cutaway, the funfair, the climate data join, and INTERIORS v1
(enterable bungalows, corner warfare). **Contracts: `docs/THE_MAP_MAKER.md` + `docs/ATLAS_FORMAT.md`.**

---

## THE ARCHITECTURE THAT MATTERS

```
data/cities.js        1,050 city rows (Robert's sheet, baked)  ─┐
data/countries.js     168 nations, 25 fields                    ├─→ joined at load
data/geography.js     terrain + biome (AUTHORED, see below)     ─┘
        ↓
data/cityplan.js      THE PLANNER — pure data, ZERO Three.js. Decides WHAT goes WHERE.
data/landmarks.js     which special structures a city earns, and what they are called
        ↓
engine/citytiles.js   THE TILE LIBRARY — one builder per district type
engine/world.js       raises the meshes, the roads, the terrain, the fog
        ↓
engine/hud.js         the ATLAS: browse, author, validate, preview live
```

**The planner is engine-agnostic and must stay that way.** No Three.js in `cityplan.js`. That is
what will let the generator be lifted out into its own tool later.

### The plan object
```js
{ name, country, popType, popLabel, types, crime, safety, seed,
  N,                    // cells per side
  cell, scale, arena,   // world size — `cell` defaults to 96 but is a DIAL (32–240)
  water, waterCols,
  culture, region,      // architectural region → materials, roof forms, naming
  relief, biome,        // the land, and what grows on it
  cells[r][c],          // { t, v, fh, fw, ref, sname, lname, landmark, lock, nb, edge, face, corner }
  roads: { h, v },      // the ROAD GRAPH — 0 means no road
  roundabouts, landmarks, rescuedCells, rural }
```

---

## THE RULES I WOULD NOT BREAK

These are load-bearing. Every one of them was learned by breaking it.

1. **`opts.hitstop ?? 0.04`, never `||`.** Sustained damage passes `0` deliberately. With `||` every
   beam becomes an infinite stunlock.
2. **DoT ticks route through `takeDamage`.** Never subtract `hp` anywhere else, or armour,
   resistances, guard and the shield pack are all silently bypassed.
3. **A resistance must cut both ways.** Every type something resists must be a type something else
   is weak to, or it is just a nerf.
4. **The AI may only act on what it has earned.** Never read a foe's position outside the `sees`
   branch. Belief, hearing and squad radio are the only channels.
5. **No purple. Anywhere.** KIVULI is the single canon exception.
6. **Roads are geometry, not texture.** Never paint a road into the ground texture again.
7. **Rasterise the fog occupancy grid's INTERIOR,** never its bounding texels — a one-texel halo
   blinds a fighter standing against a wall.
8. **`co.top` is absolute.** It includes the ground the building stands on. Physics compares it to
   a world y.
9. **Canvas 2D cannot read CSS variables.** Anything painted into a `<canvas>` uses literals.
10. **The validator and the test share one rule.** When they drifted, the tool reported 32 phantom
    problems. Export the rule; don't reimplement it.

---

## WHAT IS SOLID

- **The combat engine.** 52 fighters, 364 ability slots, all firing, soak-tested.
- **The city generator.** 3,150 plans (1,050 cities × 3 seeds) validate with **zero problems**.
- **Scale.** Verified 32u → 240u cells: cover boxes scale linearly, fighters stand on the ground.
- **The road graph.** Junctions with grammar, dead ends, meandering tracks, roundabouts by decision.
- **Terrain.** Relief + terracing; 58/58 towers sit exactly on their pads, worst tree float 0.000u.
- **Size tiers.** 35 rungs across 14 types, every one builds clean.
- **Performance.** 9×9 mountain+forest map with combat: 2.76 ms/frame sim.

## WHAT IS HALF-BUILT

- **Nothing drives on the road graph.** This is the biggest open opportunity. `roadAt(plan,x,z)` and
  `junctionAt(plan,r,c)` are the queries — do not re-derive a grid. Traffic, pedestrians on the
  pavement, police approaching along a real route, the news helicopter following an arterial.
- **Region skins are palette-only.** `REGIONS[].pitch` and `.dome` are authored and unread — roof
  *geometry* per region is cheap and would pay off immediately.
- **19 of 28 tile builders still ignore their footprint.** The nine that matter adapt; the rest are
  1×1 only. Giving one a size ladder means making its builder read `ctx.W`/`ctx.D` first.
- **No interiors.** Buildings are solid. Deliberately parked — see `docs/BACKLOG.md`.
- **No real tunnels.** A heightfield cannot fold over itself. The metro is an open cut for exactly
  that reason. Both need a roofed-volume system.
- **Water is a column.** Paintable per cell, but the shore is still a straight edge — no bays,
  no islands, no rivers.
- **Netcode.** The human/scheme abstraction is LAN-ready; nothing is implemented.

## WHAT I WOULD DO NEXT, IN ORDER

0. **Interiors follow-through** — bots steering through `world.interiors[].doorways` when
   blocked (no pathfinding exists anywhere; this is the one heuristic that unlocks indoor AI),
   beams stopping at interior walls, and the other three archetypes (commercial/institutional/
   industrial) on the same floorplan engine.

1. **Drive the road graph.** Everything is in place and nothing uses it. Highest payoff per hour.
2. **Roof geometry per region.** Small change, large visual return.
3. **Drag-paint and rectangle fill in the editor.** The biggest quality-of-life gap.
4. **More size ladders** — now that the machinery exists, each new one is a table row plus making
   one builder read its footprint.
5. **Coastline authoring** — needs the water mesh and `waterAt()` to read the plan rather than one
   x threshold.

---

## THINGS THAT WILL BITE YOU

- **`data/geography.js` is AUTHORED, not derived, and says so.** The city sheet has no terrain
  column and no coordinates — the sector field is blank on half the rows and encodes a grid square,
  not a landform. Rather than invent 1,050 values in Robert's CSV, terrain lives in its own
  reviewable file and is joined at load. If you want it in the CSV, that is now a mechanical move.
- **Los Angeles is coded `14` (Middle Eastern) in the source sheet.** That is a data error and is
  deliberately NOT overridden — fix it in the sheet, not in code.
- **The window `bay`.** `scaleBoxUV` divides by the world height of the whole texture TILE, which
  draws a grid of windows — not by one window. Getting this wrong makes every storey ~0.8m. At 1:1
  the tallest tower is ~9 storeys; if you want real skyscrapers, raise the tower heights, don't
  re-break the bay.
- **`_ghBase` must freeze before the pending pits run.** `crater()` clamps around it, so digging a
  mine into a hillside would otherwise flatten the hill.
- **`galleryPlan` must be a real plan** — sockets and roads derived — and it sizes itself to the
  library. A bench you can silently outgrow is worse than no bench.
- **A rebuild notifies through `world.onRebuilt`.** One place. Don't add a second.

---

## HOW TO VERIFY ANYTHING

Everything here is testable headlessly. `window.LSW` exposes `{ game, hud, ROSTER }`.

```js
// build any city and inspect it
const m = await import('/src/data/cityplan.js');
const { cityList } = await import('/src/data/cities.js');
const plan = m.generatePlan(cityList().find(c => c.name === 'Tokyo'), 3);
LSW.game.world.rebuildCity(plan);

// the same assertions the map maker's panel runs
LSW.hud._validatePlan(plan);

// pose the camera for a screenshot (orthographic — set camTarget/camDir, not camera.position)
LSW.game.running = false;
LSW.game.mapCam = { yaw: 0.62, pitch: 0.5, zoom: 200, x: 0, z: 0 };
LSW.game.world.setSim(false); LSW.game.world.setFogEnabled(false);
document.querySelectorAll('.lswovl').forEach(e => e.style.display = 'none');
LSW.game.world.orbit(LSW.game.mapCam); LSW.game.world.render();

// run real combat
LSW.game.startMode('duel', { p1: 'sol', p2: 'rage' });
for (let i = 0; i < 300; i++) LSW.game.update(1/60);
```

**The full-sheet sweep** (this is the test that has caught the most):
```js
for (const city of cityList()) for (const seed of [1,2,3]) {
  const plan = m.generatePlan(city, seed);
  for (const v of LSW.hud._validatePlan(plan)) if (v.bad) console.warn(city.name, v.t);
}
```

---

## THE DOCUMENTATION MAP

| File | What it is |
|---|---|
| `CLAUDE.md` | the working memory — every subsystem, every ⚠ that cost something to learn |
| `docs/THE_MAP_MAKER.md` | the city generator: what it does, how to use it, where it stops |
| `docs/COMBAT_MANUAL.md` | the damage pipeline — **the contract** |
| `docs/THE_FIELD_MANUAL.md` | the game explained narratively, for a player |
| `docs/BALANCE.md` | AI-vs-AI audit method and rulings |
| `docs/DESIGN_DECISIONS.md` | Robert's rulings from the design interviews |
| `docs/BACKLOG.md` | what is parked, and why |
| `docs/DESKTOP_AND_STEAM_DECK.md` | the Electron build and how to ship it |

**House rules that are not negotiable:** no purple; no "Co-Authored-By" in commits; commit messages
say what changed and why, in prose.

# THE ATLAS FORMAT — the data contract

*Written 2026-07-24 (ATLAS v1). This is the product: a game that reads this format can skin these
cities with its own assets. WAR WORLD is the first consumer, not the owner.*

ATLAS ships two shapes: the **authored state** (what the tool saves/loads — tiny, deterministic)
and the **plan** (what `generatePlan` derives from it — everything a builder needs). A consuming
engine can regenerate the plan from the authored state (same seed → same city, forever), or read
an exported plan directly.

---

## 1. THE AUTHORED STATE (`fmt: "atlas-1"`)

What EXPORT .JSON writes and IMPORT reads — also the shape of a saved layout and the persisted
theater. Everything the tool's controls can change, nothing derived:

```json
{
  "fmt": "atlas-1",
  "cityId": 394,          // row index into the city sheet; -1 = the flagship
  "seed": 3,              // reroll seed — same (cityId, seed, overrides) is the same city forever
  "N": 0,                 // grid override, 2–9 (0 = derive from population type)
  "waterCols": 2,         // coastline columns 0–3 (undefined = the city's own)
  "cell": 0,              // cell size override 32–240u (0 = 96)
  "popType": null,        // population preset override ("Village" … "Mega City")
  "humanH": 0,            // THE METRIC: character height in units (0 = 9.6 = 1.8m people)
  "roomScale": 0,         // interior room-size dial 0.7–1.6 (0 = 1)
  "edits": {              // hand-painted cells, keyed "row,col"
    "2,1": { "t": "water",  "sz": 2 },            // painted sea; sz = DEPTH tier index 0/1/2
    "0,3": { "t": "funfair", "v": 1, "sz": 1 },   // painted tile; sz = SIZE ladder rung
    "4,4": { "t": "company", "v": 0, "lock": true } // lock = freeze the generator's cell
  }
}
```

## 2. THE PLAN (what `generatePlan(city, seed, overrides)` returns)

```js
{ name, country, popType, popLabel, types, crime, safety, seed,
  N,                    // cells per side
  cell, scale, arena,   // cell size (u) · scale = cell/96 · arena = half-extent = N*cell/2
  metric: { humanH },   // the metric contract — doors/storeys/lamps/cars derive from it
  roomScale,            // interior room-size dial
  bands: {              // THE LAYER CONTRACT, derived from the placed types + relief:
    ground, building,   //   no structure can cross `building` (SKY is a clean lane above it);
    sky, ceiling,       //   `ceiling` is the per-city flight lid
    shallows, depths }, //   negative bands — where the water tiers live
  water, waterCols,
  culture, region,      // architectural region → materials, roof forms, naming
  relief, biome,        // terrain (resolved object {kind, amp}) and what grows on it
  cells[r][c],          // null = open ground, or:
  //  { t, v,           //   tile type + variant
  //    d,              //   WATER ONLY: depth tier 1 SHALLOWS(-8) · 2 DEEP(-22) · 3 TRENCH(-44 ×scale)
  //    fh, fw,         //   footprint (anchor cells); covered cells carry { t, ref:[ar,ac] }
  //    sname, lname,   //   size-rung name ("CONTAINER TERMINAL") · landmark name ("THE TOKYO SHRINE")
  //    landmark, lock, painted,
  //    nb, edge, face, corner, faith }   // sockets: neighbour types, per-side sockets, frontage
  roads: { h, v },      // THE ROAD GRAPH — (N+1)² corner lattice; h[r][c] joins node(r,c)→(r,c+1);
                        // value is a CLASS: 0 none · 1 track(9u) · 2 street(22u) · 3 arterial(30u) · 4 highway(38u)
  roundabouts, landmarks, rescuedCells, rural }
```

Helpers a consumer should use instead of re-deriving: `roadAt(plan,x,z)` · `junctionAt(plan,r,c)`
· `districtNameAt` · `validatePlan(plan)` (the same assertions the tool's panel shows) ·
`floorplan(w,d,roomScale,seed,doorW)` (pure BSP rooms — every room reachable by construction) ·
`climateOf(city)` → `{ koppen, label, lat, t[12], precip, snowMonths }`.

## 3. THE BUILD REPORT (world-side, after `rebuildCity(plan)`)

For engines that want geometry hints rather than rebuilding from the plan:

```js
world.doors     // every entrance: { x, z, ry, kind, w, h, tile }
                //   kind: swing · double · slide · revolve · roller · turnstile
world.interiors // enterable buildings: { x, z, hx, hz, top, walls:[{x,z,hx,hz}],
                //   doorways:[[x,z]…], rooms }  — walls are the corner-warfare surfaces
world.cover     // destructible structure AABBs: { x, z, hx, hz, top, hp, … }
```

## 4. RULES A CONSUMER MUST KEEP

- **Same input, same city.** Everything is seeded; no wall-clock, no Math.random in the planner.
- **`cell` scales the MAP, `humanH` scales the PEOPLE.** Never conflate the dials.
- **0 means "no road"** in the graph — dead ends are the point.
- **Bands are per-city.** Read `plan.bands`; never hard-code 150/260/320.
- **`validatePlan` is the one rule.** If your import pipeline checks plans, call it — don't
  reimplement it (the tool and the sweep once drifted by 32 phantom problems).

## 5. VERSIONING

`fmt: "atlas-1"`. Additions are backward-compatible (new optional fields); breaking changes bump
to `atlas-2` with a migration note here.

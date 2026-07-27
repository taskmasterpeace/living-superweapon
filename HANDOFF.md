# HANDOFF — WAR WORLD: ASCENDANTS

*Written 2026-07-24. Status, OPEN ISSUES and OPEN CONVERSATIONS refreshed 2026-07-26.*
*Read this first, then `CLAUDE.md`.*

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

**2026-07-24, the combat program** (manual §10–§19, one commit per phase, each headlessly
measured): momentum melee (contact speed scales the punch, ×2.5 at cruise; dive-punch
launcher) · the aimed throw (clinch = struggle window, bodies are projectiles, slide-class
drag while thrown) · bleeding (movement tears, stillness clots, downward-red is its alone) ·
second wind (humans only, once per match, Overdrive's moment) · sleep + blind (the payload
lane, proven — belief system does blind for free) · ALL 20 Tier-1 brief powers in the ORIGIN
catalog + 7 roster kit treatments + afterburners ×6 with per-hero wakes · THE GEAR SYSTEM
(KO drops, carry-hand pickups, derived proficiency, disarm-by-grab — powers are what you
ARE, gear is what you HOLD) · zoned wounds + the persistent medical ledger in the rankings
book · LOW-ORBIT CITY-TO-CITY TRAVEL (burner through the ceiling → world map → wake-identity
transit cinematic → arrival) · Tier-2 frost nova / seekers / ricochet. The recovered
companion catalog is `docs/POWERS_BRIEF.md`; the remaining lanes are ledgered in
`docs/BACKLOG.md` with their donors named.

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
- **THE CIRCUIT — the single-player loop.** `data/career.js` + `engine/careerUI.js`: a
  persistent career (weekly offer slates off the live Elo book, real cities, transit
  cinematic between theaters, purses/renown/titles, clinic-or-rest medical decisions, the
  world simming matches every week). The news screen routes back to the desk; the loop is
  banner → desk → accept → travel → fight → news → desk. Verified end-to-end headlessly.

## WHAT IS HALF-BUILT

- **Nothing drives on the road graph.** This is the biggest open opportunity. `roadAt(plan,x,z)` and
  `junctionAt(plan,r,c)` are the queries — do not re-derive a grid. Traffic, pedestrians on the
  pavement, police approaching along a real route, the news helicopter following an arterial.
- **Region skins are palette-only.** `REGIONS[].pitch` and `.dome` are authored and unread — roof
  *geometry* per region is cheap and would pay off immediately.
- **19 of 28 tile builders still ignore their footprint.** The nine that matter adapt; the rest are
  1×1 only. Giving one a size ladder means making its builder read `ctx.W`/`ctx.D` first.
- **Interiors are v1 only.** Four enterable bungalows on the residential archetype; everything else
  is solid. Bots do not navigate doorways and beams ignore interior walls — both deliberate, both in
  `docs/BACKLOG.md`.
- **POWERWORLD is a dimension with one room in it.** The flight model, camera, targeting, stage and
  the climb to space are real (`docs/POWERWORLD.md` §14). What it does not have: a second map, any
  reason to go there other than to fight, and an exit that arrives anywhere.
- **No real tunnels.** A heightfield cannot fold over itself. The metro is an open cut for exactly
  that reason. Both need a roofed-volume system.
- **Water is a column.** Paintable per cell, but the shore is still a straight edge — no bays,
  no islands, no rivers.
- **Netcode.** The human/scheme abstraction is LAN-ready; nothing is implemented.

## OPEN ISSUES

*Known-wrong or known-missing, as of 2026-07-26. Ordered by how likely they are to bite.*

### Defects — real, reproduced, not fixed

| # | what | where | notes |
|---|---|---|---|
| 1 | **A duel ignores `p2`.** `_lastCfg = {mode:'duel', p2:'majesty'}` still spawns a random foe. Found while A/B-ing the boxing stage — a test asked for MAJESTY and got VEGA, then TALON, then TEMPEST. Every other mode honours `o.enemy \|\| o.p2`. | `MODE_IMPL.duel` setup, `game.js` | Cost me a wrong measurement before I noticed. Same family as the boxing bug that read only `o.enemy`. |
| 2 | **Bots still fly the old way in PowerWorld.** `controlBot` writes `moveDir = {x, z}` with no Y, so the AI climbs with the ascend key while the player flies where they look. An AI flier reads as "layered" next to a human one. | `game.js controlBot` | The player-side fix is `p._openSky && p.flying` in `controlPlayer`; the bot needs the same basis. |
| 3 | **Two writers own the band table.** PowerWorld re-asserts `BANDS.ceiling` every tick because `fitBands()` runs after mode setup and overwrites it. Works, races. | `game.js` powerworld tick / `world.fitBands` | Wants a `plan.bandsLocked` early return. No longer load-bearing for flight (the clamp does not run under an open sky). |
| 4 | **`world.shake()` is world-space behind the chase camera**, and 9 of 14 VFX are authored for a frame ~10.7× taller than PowerWorld's. Impacts under-read there. | `world.js`, `vfx.js` | `docs/POWERWORLD.md` "still owed" #4. |
| 5 | **Arms have no elbow.** The leg has a driven knee (ragdoll + run cycle); the arm is one piece. Visible now the camera is close. | `figure.js` | `docs/powerworld/pw-limbs.md`. |
| 6 | **No hardware numbers.** Every Deck/iPad figure in `pw-platform.md` is arithmetic from source and says so. All measurements are a 4090's. | — | Needs a real device. |
| 7 | **Boxing has no referee, no clinch break, no rest round.** A clinch just runs its timer. | `boxingring.js` | `docs/BACKLOG.md`. |
| 8 | **The flagship city has no vertex AO.** It builds through its own bespoke path and never calls `tower()`. Measured 48/48 on a generated Tokyo, 0 on the flagship. | `world._buildArena` | Known and deliberate; wants its own pass. |

### Latent traps that are written down but not defended by a test

- **The floor contract.** `|groundY − heightAt(x,z)| < 0.25` for every fighter in every mode, plus
  flatness inside a venue. This is the check that would have caught the boxing stage; it exists as a
  rule in `CLAUDE.md` and as an ad-hoc probe, **not** as a runnable suite. Writing it as one is the
  single highest-value test in the project.
- **Anything reading terrain must be tested in a theatre that HAS relief.** The `heightAt`/`ARENA`
  bug was invisible for weeks because the venue was built and screenshotted on the Moon.
- **"0 errors" is not "correct".** A 9-mode sweep passed boxing clean while it was visibly broken.

---

## OPEN CONVERSATIONS

*Decisions that are Robert's, not mine. Each has a default I have already shipped, so nothing is
blocked — but these are the places where the shipped answer is a guess.*

1. **The one change that is not PowerWorld-only.** `fitBands` now floors the flight ceiling at
   `MIN_CEIL 260 / MIN_SKY 150`. It fixes a real pre-existing bug — your saved theatre (a Moon
   village) had a **42u ceiling**, about four times a fighter's height, and most of the 1,050-city
   sheet is villages and towns. But you said *"DO NOT CHANGE THE GAME, ONLY POWER WORLD"* and this
   does change the base game. **Shipped: kept.** One line to revert.
2. **How far do the mannequins go?** Currently the body is 30% toward bone with a matte finish, and
   armour/visor/glow/cape keep the hero's colours. You floated *"give them my logos"* — there is no
   emblem or decal system for a figure, so that part is not built. Do you want the treatment
   stronger, or the logo system?
3. **What else should PowerWorld spend its headroom on?** Measured **0.625× the city's GPU frame and
   0.329× its CPU**. So far that budget has bought a rim light and the mannequin pass. Candidates:
   real shadows in the chase view, a denser stage, per-fighter trails, a second map.
4. **Should the long knockback become global?** `_chaseKb` gives PowerWorld a 61.3u carry against the
   city's 16.1u. The city's ropes, ring-out and every wall slam are tuned against the short one.
   `pw-combat.md` calls this a feel call and explicitly not mine. **Shipped: PowerWorld only.**
5. **Is 40 Hz the Steam Deck target?** The governor, the pixel ladder and the p90 variance argument
   all assume it. Never confirmed.
6. **Does PowerWorld need a second map?** The brief said *"maps look like Bid for Power"* — plural.
   There is one stage.
7. **Does the map maker still stay a game feature?** The 2026-07-23 ruling was "extracted later".
   ATLAS now stands alone at `/atlas.html`, which is most of the way there.
8. **Two background tasks you started** (`_pixelCap` returning a method, and the 40 Hz governor
   inversion) may duplicate fixes already committed for both bugs — worth checking for conflicting
   edits before merging anything they produce.

---

## WHAT I WOULD DO NEXT, IN ORDER

*Reordered 2026-07-26. The first two are new and both are cheap.*

0. **Write the floor contract as a real suite** (see OPEN ISSUES). It is the check that catches the
   class of bug that just broke the boxing stage, and it is maybe forty lines.
1. **Give the bots pitched flight** (OPEN ISSUES #2). PowerWorld's whole feel is that forward is
   where you look, and half the fighters in it do not do that yet. One basis change in `controlBot`.
2. **Interiors follow-through** — bots steering through `world.interiors[].doorways` when
   blocked (no pathfinding exists anywhere; this is the one heuristic that unlocks indoor AI),
   beams stopping at interior walls, and the other three archetypes (commercial/institutional/
   industrial) on the same floorplan engine.

3. **Drive the road graph.** Everything is in place and nothing uses it. Highest payoff per hour.
4. **Roof geometry per region.** Small change, large visual return.
5. **Drag-paint and rectangle fill in the editor.** The biggest quality-of-life gap.
6. **More size ladders** — now that the machinery exists, each new one is a table row plus making
   one builder read its footprint.
7. **Coastline authoring** — needs the water mesh and `waterAt()` to read the plan rather than one
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

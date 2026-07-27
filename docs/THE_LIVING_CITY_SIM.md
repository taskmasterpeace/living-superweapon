# THE LIVING CITY SIM — the influence-fields analysis, recovered

*Recovered 2026-07-27. `docs/LOST_AND_FOUND.md` §1.1 ranked this the single biggest un-started idea
of the 72 hours: it was delivered in chat on 2026-07-26, audited a second time the same evening,
and never written to a file. Both passes are reproduced here.*

> ## ⚠ NOTHING IN THIS DOCUMENT IS BUILT
>
> Verified against the live source **today, 2026-07-27**, not quoted from the analysis:
>
> ```
> world.update(dt)          0 call sites — and no update(dt) is even DEFINED on World
> per-cell fields           0 — grep across src/ + docs/: micropolis 0 · "influence field" 0
>                               · "land value" 0 · landValue 0 · pollution 0 · congestion 0
>                               · desirability 0
> police.js                 reads plan.safety at :243 and :419 — ONE number, twice, per city
> ```
>
> This is an analysis and a proposal. Do not mistake it for a system.

---

## §1 · What was asked

**2026-07-26 16:35.** He sent six city-simulation projects, a voxel repo with his own prior analysis
of it pasted in, and one sentence that set the bar:

> this is my final city question..then i want to know if you can improve it
>
> https://en.wikipedia.org/wiki/OpenCity
> https://github.com/simhacker/micropolis
> https://github.com/AndreaDev3D/TileCityBuilder
> https://github.com/citybound/citybound
> https://github.com/victorqribeiro/isocity
> https://github.com/honzaap/GitHubCity
>
> **I really want you to obsesses over improving what we have.**
>
> wondering about using this to make the voxel buildings perhaps :
> http://github.com/boona13/mykonos-island-voxels
>
> […his own pasted analysis of that repo, which correctly concluded it is "2.5D sprite voxels, not
> a full 3D voxel engine"…]
>
> remember we will eventually be making internal stuff too

⚠ **"remember we will eventually be making internal stuff too" is the load-bearing line** and it is
easy to skim past. It is what turns the voxel question from a rendering question into the volume-layer
question — see §4.

---

## §2 · The measurement, before the answer

The reply opened by running `wwa-feature` — measure first, then route. This is the raw command it ran
and what came back:

```
=== WHAT THE CITY SIMULATES PER TICK ===
src/engine/pedestrians.js:174:  update(dt, game) {
src/engine/wildlife.js:200:  update(dt) {

=== crime / safety: static sheet value, or a field? ===
src/data/base.js:71  · src/data/career.js:94 · :111 · :192
src/data/cityplan.js:680 · src/engine/atlasUI.js:239 · :302 · src/engine/careerUI.js:88

=== any per-cell simulated field (land value, pollution, traffic)? ===
(empty)

=== interiors: how many floors ===
(single-storey by construction)
```

### The four facts

```
world.js has NO update(dt)          — only peds and wildlife tick; the city itself is inert
crime / safety                      — ONE number per city, read in 7 places, never varies within it
per-cell simulated fields           — ZERO. no land value, no pollution, no congestion
interiors                           — single-storey by construction
```

**We have a world-class city *generator* and no city *simulation*.** Every project you linked is a
simulation project. That gap is the answer to "can you improve it".

---

## §3 · The references, sorted by what they'd actually give us

**[micropolis](https://github.com/simhacker/micropolis) — the one that matters.** Will Wright's real
SimCity engine, and its core technique is small: a handful of **influence grids** — land value,
pollution, crime, traffic, service coverage — each a little 2D array, fed by what sits on each tile,
diffused toward neighbours every tick. That is *exactly* the shape we already have: an N×N cell grid
plus a road graph. ⚠ It's GPL-3, so we copy nothing; the algorithm is textbook and we write our own.

**[citybound](https://github.com/citybound/citybound) — one idea, already in our queue.** Agents on
the graph rather than sprites on a texture: per-lane traffic, individual trips. That's wire-queue item
G (`roadAt` has no consumer). AGPL — read it for shape, take no code.

**[GitHubCity](https://github.com/honzaap/GitHubCity)** — closest to us technically (Three.js,
procedural city from data), but our generator is well past it. Look reference only.

**[OpenCity](https://en.wikipedia.org/wiki/OpenCity)** · **[isocity](https://github.com/victorqribeiro/isocity)**
· **[TileCityBuilder](https://github.com/AndreaDev3D/TileCityBuilder)** — nothing to take. Historical,
a canvas toy, and a small Unity tile demo.

---

## §4 · The voxel question: no — and the reason matters

[mykonos-island-voxels](https://github.com/boona13/mykonos-island-voxels)' `voxelRenderer.js` draws
isometric cube **sprites onto a 2D canvas** and hands `Renderer.js` a canvas to blit. Your own
analysis is right that it's 2.5D.

Our buildings have to cast real shadows, collide by AABB, be stood on (`onBlock`), take damage with
crack overlays and shatter into debris, register in the fog occupancy raster, and fade for the tower
cutaway. A blitted sprite does none of that. There is no seam to attach it to — we'd be replacing our
renderer with a weaker one.

**But the want behind it is correct, and it's the same want as your last line.** `CLAUDE.md` already
names the blocker: *"a heightfield is a single surface and cannot fold over itself, so there is no
'ceiling'. Tunnels need the roofed-volume system that interiors also need."*

Three parked features — **multi-storey interiors, real tunnels, and volumetric destruction** — all
block on one missing thing: a volume representation that isn't the heightfield. That's what "voxel"
actually means for us. And it's a nice convergence: the greedy-meshing thread you sent earlier is the
right tool *at that point* and pointless before it.

---

## §5 · The ranking

**1 · THE INFLUENCE FIELDS — biggest payoff per hour in the whole project.** Take micropolis's idea,
derive it from our plan + our sheets. Land value, pollution, congestion, service coverage as fields
over the existing cell grid, diffused a few passes per rebuild. What changes for the player: police
response varies **by district** instead of by city · the block you flattened is visibly poorer next
time · pedestrian density and vigilantism read the *local* number · the news desk can name the
worst-hit block · the base site survey stops asking "which city" and starts asking "where in it".
⚠ It must be derived from the plan and the sheet so it can never contradict them — same law as
everything else here.

**2 · THE VOLUME LAYER.** Your "internal stuff", tunnels, and destructible-at-volume are one system,
not three. Big, and worth scoping properly before starting.

**3 · Agents on the road graph.** Already queued; citybound is the reference for it.

**What I would not touch:** the generator. Sockets, footprints, size ladders, landmarks, relief, the
survey, region skins — that's the strongest thing in the repo and none of these references beat it.

---

## §6 · The second pass — the audit, two hours later

**2026-07-26 18:25.** He came back with:

> ok where are we with this. audit and report back and let me know if read to /wwa-ship-mechanic

Everything was re-measured. All four facts still held, **and one new one turned up:**

```
world.update(dt)          0 call sites — the city is still inert
per-cell fields           0 — no land value, pollution or congestion anywhere
plan.cells                carries t · v · r · c · nb · edge · face · corner  ← the substrate exists
plan.roads                present                                            ← the diffusion path exists
police.js reads plan.safety at :239 and :415 — ONE number, twice, per city
⚠ plan.survey             FALSE on a default Tokyo plan
```

⚠ **`survey` is produced by the world builder, not by `generatePlan`.** So a field pass has to decide
up front whether it lives on the plan (pure, testable, engine-agnostic — like `roads` and `sockets`)
or on the world. **It should be the plan**, for the same reason `cityplan.js` has zero Three.js in it.

**Nothing has been built. The prerequisites are all there.** An N×N `cells` array with neighbour data
is precisely the shape micropolis diffuses, and we already have it.

### On the gate — the answer was no, not that one

`/wwa-ship-mechanic` is written for **combat** mechanics, and three of its eight items don't map:

- *"ONE CHOKE POINT — damage goes through `takeDamage`"* — influence fields deal no damage
- *"≥2 CARRIERS × ≥2 DELIVERY SYSTEMS"* — carriers means characters with abilities
- *"A COUNTER"* — you don't counter land value

Forcing it through would mean waiving three items in BACKLOG, which is the paperwork of a gate that
doesn't fit rather than a real check.

**The right gate is `wwa-wire-in`**, because the value here is *entirely* in the readers — a field
nobody reads is decoration, exactly like the 60 research rows and the 18 dead ability types. Borrow
four items from the ship gate on top:

| item | why it matters *here* specifically |
|---|---|
| **1 · a type, not a special case** | the fields are a table (`FIELDS = {landValue, pollution, congestion, coverage}`), each with a source function and a diffusion rate. Adding "noise" later is a row |
| **6 · numbers from the distribution** | ⚠ this is *the* danger zone. A diffused field is a weighted sum, and a weighted sum regresses to the mean — the exact failure that took four passes on the site survey. Percentile-rank against the city's own cells or every rung reads "average" |
| **7 · manual + codex** | and the atlas should *draw* the fields, which is also how you debug them |
| **8 · headless assertions** | sweep all 1,050 cities, print the histogram, prove the rungs are occupied |

### The five readers, which are the actual deliverable

| reader | today | with fields |
|---|---|---|
| police ETA | `plan.safety` — one number, city-wide | response varies **by district** |
| `siteSurvey` | "which city" | "**where in it**" — the 9×9 footprint reads local land value |
| pedestrians | uniform density | crowds thin where you fought |
| the news desk | names the district | names the **worst-hit block** |
| career offers | `crime >= 55` filters a city | filters a *neighbourhood* |

⚠ And the law that makes it honest: **the fields must be derived from the plan and the sheets, never
authored beside them.** If `plan.crime` says 75 and the field says otherwise in aggregate, the field
is wrong by construction — same rule as the damage codex and the site survey.

### What "before/after the same day" looks like

Measurable in one sitting: **police ETA variance within a single city, currently exactly 0.** After: a
spread across districts, and a number I can print for Tokyo and for Mogadishu showing the gap widens
where the state is weaker.

---

## §7 · How the thread actually ended

It did not end in a decision. He read the gate reasoning above and replied:

> see i cant understand all this i want it automated, how can we do that?

…quoting the three "doesn't map" bullets back. The whole of the next hour went into that meta-problem
rather than into the fields: `wwa-ship` was written as **one door that classifies the work itself**,
so he never has to pick a gate. That skill's own founding line records the exchange, and it produced
the rule:

> ⚠ **If you find yourself waiving three items, you have merged two profiles into one commit.**

And the classification for this work, stated at the end of that turn:

> **The influence fields — WORLD system.** Fields on the plan, read by the police ETA and the site
> survey. Two consumers, both already reading a single city-wide number today — `police.js` does it
> at `:239` and `:415`.
>
> Type `/wwa-ship influence fields` and I'll run it without asking you anything.

**He never typed it.** The next messages went elsewhere (*"i dont understand anything you just said
stop talking weired"*), and the fields were never started.

⚠ So the honest status is not "rejected" and not "queued" — it is **proposed twice, audited twice,
classified, and dropped mid-sentence.** The last thing said about it was that it was ready to start.

---

## §8 · What is still true, and what has moved since

Re-measured 2026-07-27.

**Still exactly as reported:**

- `world.update(dt)` — still **0 call sites**, and there is still no `update(dt)` defined on `World`.
  The city is inert.
- Per-cell fields — still **0** of every name.
- `police.js` — still `const safety = plan.safety || 50;` at **two** sites (`:243` and `:419`; the
  line numbers moved by four, the fact did not).
- Interiors — still single-storey by construction, so §4's volume-layer argument stands unchanged.

**What has moved:**

- The line numbers in `police.js` drifted `:239/:415` → `:243/:419`. Nothing else about them changed.
- `plan.survey` is still produced by `surveyCity()` in the world builder, so §6's plan-vs-world
  decision is still open and still unmade.

**What this means for anyone picking it up.** The measurement work does not need repeating — the
substrate (`plan.cells` with `nb`/`edge`/`face`/`corner`, `plan.roads`) is confirmed present, the two
first readers are confirmed to be reading a single city-wide number, and the gate is already
classified as WORLD. ⚠ The one design decision that was surfaced and never taken is **whether the
fields live on the plan or on the world**, and the analysis argued plan — for the same reason
`cityplan.js` has zero Three.js in it.

⚠ And the one trap the audit named twice, worth repeating because it has already cost four passes
elsewhere in this repo: **a diffused field is a weighted sum, and a weighted sum regresses to the
mean.** Percentile-rank the rungs against the city's own cells, or every district in the game will
read "average" — the same failure as the site survey, the university standing and the rank ladder's
top end.

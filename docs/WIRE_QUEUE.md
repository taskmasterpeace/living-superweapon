# THE WIRE QUEUE — ten things already built that nothing can reach

Written 2026-07-26 from `node src/bench/orphans.mjs`, filtered against `docs/BACKLOG.md` so
deliberate parks and headroom are not listed as bugs.

**This document exists so the queue survives a context reset.** Each item carries the exact files,
the exact wire, and how to prove it — enough that a fresh session can pick up at any row without
re-deriving anything. Tick a row when it lands; the audit script is the referee.

The audit as of writing:

```
TYPES     44 declared · 26 carried · 18 DEAD
ORIGIN    102 catalog powers · 92 carried by NO roster hero
ARMORY    35 weapons/gear · 33 on no fighter
DOORS     6 mode cards · 15 overlays · no base / armory / education door
```

---

## 1 · `_cityLL` still hashes  ·  ~15 min  ·  ☑ DONE 2026-07-26

`hud.js:931` hashes country+city into a plausible lat/lon and its own comment says *"until real
coordinates exist in the sheet."* They exist now — `data/citycoords.js`, 1,050 of 1,050 — and
`hud.js` imports that module for the attribution string **only**.

- **Wire:** `_cityLL(c)` returns `cityLatLon(index)` when the city resolves; keep the hash as the
  fallback for a row that is not in the list (off-world settlements have no index).
- ⚠ `cityList()` returns a FRESH array per call, so `indexOf(cityObject)` is always −1. Match on
  name+country, the same way `hud.theater` already does.
- **Proves it:** transit Tokyo→Osaka must be far shorter than Tokyo→Lima. Today both are hash noise.
- **Free win:** `_transitSecs` becomes honest, so the travel cinematic's duration means something.

## 2 · `grantsTalents` reaches nothing  ·  ~30 min  ·  ☐

`data/education.js:48` declares `grantsTalents: true` on kinesiology and **that string appears in no
other file in the repo**.

- **Wire:** a graduate's `def.talents` gains the major's talent; `bakeSheet()` already converts
  talents into the per-frame multipliers (`cdMult`, `jabMult`, `chargeRate`…). One field to read.
- **Door:** education is console-only, so also give the career desk a line, or this is reachable
  only through `team`/`origin` commands.
- **Proves it:** a graduate's `bakeSheet()` multiplier differs from a non-graduate's.

## 3 · Beams ignore interior walls  ·  ~10 min  ·  ☐

Open in BACKLOG since interiors shipped. `projectiles.js:754` — the beam's per-segment block loop,
which I rewrote for the streaming beam (manual §42) — walks `world.cover` and never `world.interiors`.
Projectiles already honour `hitInteriorWall` (`projectiles.js:326` region).

- **Wire:** the same loop, over `world.interiors[].walls`, truncating `this.pn` identically.
- ⚠ The aabb gate must pass when either endpoint is INSIDE a room — `_segBox` only detects
  crossings, and both-inside is the corner-warfare case (this is already documented for `canSee`).
- **Proves it:** a beam fired at a bungalow wall stops at it instead of through it.

## 4 · 33 armory weapons on nobody  ·  1–2 h  ·  ☐

`data/armory.js` — 13 firearms, 6 blades, 16 gear — and no roster hero or police def carries one.
Every row is an existing engine type with a `weapon` class, and every firearm already has its own
measured audio signature (manual §38).

- **Wire:** `police.js` defs are the cheapest carriers. Beat cop → 9mm · patrol → pump 12ga ·
  SWAT → MP5 · FED → suppressed PDW · GUARD → M16 + rifle-grenade.
- **Why it is worth more than it looks:** the six-rung response ladder starts *sounding* different
  at each rung. The audio work is already paid for.
- **Then:** two or three roster humans (SARGE, SANDRA, KNIGHTFALL) carry named weapons.

## 5 · `data/age.js` — zero importers  ·  ~1 h  ·  ☐

159 complete lines: birth dates, 16 age bands as CS shifts on the rank ladder, `birthdayCrossings`,
`riskOver`, `ageLine`, synthetics correctly exempt. Nothing in the repo imports it.

- **Three touch points, all small:** `ageLine(def)` into codex §01 · `birthdayCrossings` around the
  career's `advanceDays` → a ledger line · `ageMods()` folded into `deriveAttrs`.
- ⚠ The CS shift must go through `data/scale.js`, not a second ladder.

## 6 · Education's 59 research rows describe their effects in PROSE  ·  ~2 h  ·  ☐

`d: 'clears bleed stacks instantly'` — and `clotBleed()` exists, and nothing can reach it.

- **This is the disease, not a symptom.** Prose instead of a field is unreachable content by
  construction, and it is why the whole module reads 45% with one importer.
- **Wire:** give each row an `effect: { fn, args }` or a flag the engine already understands, in
  batches by lane (medical → `clotBleed`/`healBout`, combat → talents, city → police/response).
- Convert only the rows whose verb already exists in the engine. Any row with no reachable verb goes
  in `docs/BACKLOG.md` with the reason, rather than being faked.

## 7 · 18 dead ability types  ·  program, not an hour  ·  ☐

`weather · size · timefield · invisible · regen · banish · gravity · duplicate · possess · elastic ·
telekinesis · reshape · consume · mimic · mount · dome · vision · wallcrawl` — all implemented in
`engine/systems.js` / `systems2.js`, none carried.

- **Do NOT treat as a list to clear.** Take two or three that answer the standing "characters feel
  same-y" note, and land each through `wwa-ship-mechanic` (two carriers, two delivery systems).
- Cheapest three by fit: `regen` (a healer archetype), `dome` (a defender), `vision` (a scout).

## 8 · No door for the base, the armory or education  ·  ~2 h  ·  ☐

`data/modes.js` has six cards and none is `base`, yet `MODE_IMPL.base` exists and `baseroom.js`
raises a walkable two-floor HQ. There is no `showBase`, `showArmory` or `showEducation`.

- **Wire:** one mode card for THE BASE (the room already builds), one overlay for the armory
  (a loadout row on character select is enough to start). The CIRCUIT banner is the pattern.
- ÷2 on payoff because UI is the slow part — but the base is the one where the content is finished.

## 9 · The clinch wheel  ·  L  ·  ☐

`data/martial.js` exports `POSITIONS`, `WHEEL_MAX`, `clinchWindow` and `SUBMISSIONS`, and **nothing
imports them** — only the strikes and the step-in got wired (manual §38).

- **Wire:** front/back clinch, the four-option ground wheel, the struggle meter, choke-out → the
  holding cells that already exist in `data/base.js` and have no way to receive anybody.
- ⚠ Ground top/bottom implies a prone pose the figure rig and ragdoll do not have. Front/back with
  the two standing wheels is the M-sized slice; the ground game is what makes it L.

## 10 · Nothing drives on the road graph  ·  L  ·  ☐

`roadAt` is declared in `data/cityplan.js` and called from nowhere else. HANDOFF names this
*"the biggest open opportunity… highest payoff per hour"* for the city.

- **Wire:** traffic, pedestrian pathing and the police approach should all QUERY `roadAt`/
  `junctionAt` rather than re-derive a route. `interiors[].doorways` is the same story indoors.
- ⚠ A steering behaviour that behaves is days, not hours. Sequenced last for that reason.

---

## Order and why

Items **1, 2, 3** total under an hour and two of them are loose ends from the 2026-07-26 session
itself. **4 and 5** are data edits against systems that already render. **6** is the structural fix
that stops the disease recurring. **7–10** are real features and should each go through
`wwa-ship-mechanic` or `wwa-wire-in`.

Re-run `node src/bench/orphans.mjs` after each; a finished item should leave the report.

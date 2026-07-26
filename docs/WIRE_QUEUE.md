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

## 2 · `grantsTalents` reaches nothing  ·  ~30 min  ·  ☑ DONE 2026-07-26

`data/education.js:48` declares `grantsTalents: true` on kinesiology and **that string appears in no
other file in the repo**.

- **Wire:** a graduate's `def.talents` gains the major's talent; `bakeSheet()` already converts
  talents into the per-frame multipliers (`cdMult`, `jabMult`, `chargeRate`…). One field to read.
- **Door:** education is console-only, so also give the career desk a line, or this is reachable
  only through `team`/`origin` commands.
- **Proves it:** a graduate's `bakeSheet()` multiplier differs from a non-graduate's.

## 3 · Beams ignore interior walls  ·  ~10 min  ·  ☑ DONE 2026-07-26

Open in BACKLOG since interiors shipped. `projectiles.js:754` — the beam's per-segment block loop,
which I rewrote for the streaming beam (manual §42) — walks `world.cover` and never `world.interiors`.
Projectiles already honour `hitInteriorWall` (`projectiles.js:326` region).

- **Wire:** the same loop, over `world.interiors[].walls`, truncating `this.pn` identically.
- ⚠ The aabb gate must pass when either endpoint is INSIDE a room — `_segBox` only detects
  crossings, and both-inside is the corner-warfare case (this is already documented for `canSee`).
- **Proves it:** a beam fired at a bungalow wall stops at it instead of through it.

## 4 · 33 armory weapons on nobody  ·  1–2 h  ·  ◐ HALF DONE 2026-07-26 (police armed; roster humans still open)

`data/armory.js` — 13 firearms, 6 blades, 16 gear — and no roster hero or police def carries one.
Every row is an existing engine type with a `weapon` class, and every firearm already has its own
measured audio signature (manual §38).

- **Wire:** `police.js` defs are the cheapest carriers. Beat cop → 9mm · patrol → pump 12ga ·
  SWAT → MP5 · FED → suppressed PDW · GUARD → M16 + rifle-grenade.
- **Why it is worth more than it looks:** the six-rung response ladder starts *sounding* different
  at each rung. The audio work is already paid for.
- **DONE:** all five police rifle slots draw from the armory via `armWith` — 9mm · MP5 ·
  suppressed PDW · .44 · M16, five distinct audio signatures across the ladder. 33 → 28 uncarried.
  ⚠ `armWith` takes IDENTITY from the armory and keeps the police NUMBERS: the armory 9mm does 9
  damage and a beat cop must stay at 5, or the ballistic scale against civilians is undone.
- **STILL OPEN:** two or three roster humans (SARGE, SANDRA, KNIGHTFALL) carrying named weapons,
  and the 6 blades + 16 gear rows, none of which has a carrier yet.

## 5 · `data/age.js` — zero importers  ·  ~1 h  ·  ☑ DONE 2026-07-26

159 complete lines: birth dates, 16 age bands as CS shifts on the rank ladder, `birthdayCrossings`,
`riskOver`, `ageLine`, synthetics correctly exempt. Nothing in the repo imports it.

- **Three touch points, all small:** `ageLine(def)` into codex §01 · `birthdayCrossings` around the
  career's `advanceDays` → a ledger line · `ageMods()` folded into `deriveAttrs`.
- ⚠ The CS shift must go through `data/scale.js`, not a second ladder.
- **DONE:** `ageMods` folded into `deriveAttrs` (ranks.js) · `ageLine` on codex §01 · a career week
  now ADVANCES SEVEN DAYS through one `turnWeek` helper and reports birthday crossings on the ledger.
  ⚠ The last of those was the real find: `career.week++` moved a counter and never touched the
  calendar, so the in-game date only advanced when somebody was hospitalised and `birthdayCrossings`
  could not fire at all. Measured: 52 crossings over 52 weeks.
  ⚠ Age is applied BEFORE `def.attrs`, so an authored value always wins — a birthday must never
  overwrite the creator's dial.
  ⚠ The override field is `def.age` (a number) or `def.born = {y,m,d}`. A STRING `born` silently
  falls through to the id hash, which is how my first test read as a broken wire.

## 6 · Education's 59 research rows describe their effects in PROSE  ·  ~2 h  ·  ☑ DONE 2026-07-26

`d: 'clears bleed stacks instantly'` — and `clotBleed()` exists, and nothing can reach it.

- **This is the disease, not a symptom.** Prose instead of a field is unreachable content by
  construction, and it is why the whole module reads 45% with one importer.
- **Wire:** give each row an `effect: { fn, args }` or a flag the engine already understands, in
  batches by lane (medical → `clotBleed`/`healBout`, combat → talents, city → police/response).
- Convert only the rows whose verb already exists in the engine. Any row with no reachable verb goes
  in `docs/BACKLOG.md` with the reason, rather than being faked.
- **DONE:** `EFFECT_VERBS` (7 verbs, every one a hook the engine already had) · `fx` on **13 of 60**
  rows · one `applyResearch(f, owned, game)` path · `REACHABLE_RESEARCH()` makes the split queryable
  · the other 47 are listed in `docs/BACKLOG.md` with four grouped reasons.
- ⚠ `clotBleed()` had **no sibling** — bleeding could be stopped and a poison or a burn could not,
  which is exactly why two finished rows had to describe themselves in prose. `Fighter.clearDot(kind)`
  is the missing verb.
- Verified against a LIVE fighter (not a stub): a real wound closes, a real poison dot is purged,
  rebreather makes 30 toxic damage do **0.0** through `takeDamage`, the ablative pool eats 20 and the
  hull takes 0, and owning an unbuilt row (`orbital`) is silent rather than a throw.

## 7 · 18 dead ability types  ·  program, not an hour  ·  ☐

`weather · size · timefield · invisible · regen · banish · gravity · duplicate · possess · elastic ·
telekinesis · reshape · consume · mimic · mount · dome · vision · wallcrawl` — all implemented in
`engine/systems.js` / `systems2.js`, none carried.

- **Do NOT treat as a list to clear.** Take two or three that answer the standing "characters feel
  same-y" note, and land each through `wwa-ship-mechanic` (two carriers, two delivery systems).
- Cheapest three by fit: `regen` (a healer archetype), `dome` (a defender), `vision` (a scout).

## 8 · No door for the base, the armory or education  ·  ~2 h  ·  ◐ FIRM DONE 2026-07-26

`data/modes.js` has six cards and none is `base`, yet `MODE_IMPL.base` exists and `baseroom.js`
raises a walkable two-floor HQ. There is no `showBase`, `showArmory` or `showEducation`.

- **Wire:** one mode card for THE BASE (the room already builds), one overlay for the armory
  (a loadout row on character select is enough to start). The CIRCUIT banner is the pattern.
- ÷2 on payoff because UI is the slow part — but the base is the one where the content is finished.
- **DONE (the firm):** `engine/hqglobe.js` + a FIRM banner on the title screen. Incorporation happens
  on the globe, and every figure on the panel is a read of `siteSurvey` / `seedCapital` /
  `firmNaming`. See CLAUDE.md · INCORPORATE ON THE GLOBE.
- **STILL OPEN:** a mode card for THE BASE (the room already builds), an armory loadout surface, and
  an education door. The firm screen is the pattern to copy for all three.

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

---

## STATE AT 2026-07-26 END OF SESSION

Landed: **1, 2, 3, 5, 6** complete · **4** half (police armed, roster humans open).
Open: **4** (roster humans, blades, gear) · **7** dead ability types · **8** the doors ·
**9** the clinch wheel · **10** the road graph. All four remaining are FEATURES, not wires —
each should go through `wwa-ship-mechanic`.

Audit moved: `ARMORY 33 → 28 on no fighter`. Everything else unchanged, which is the honest
reading — items 5–10 are untouched.

Each remaining row above is self-contained. Start at 7 — and note that 7 unlocks three of
the untagged research rows in item 6 for free (`nanite`/`regen`, `droneswarm`/`vision`,
`shieldproj`/`dome`).
---

## RE-AUDITED 2026-07-26 (second pass) — the queue after 1/2/3/5/6 landed

```
TYPES     44 declared · 26 carried · 18 DEAD   (17 of the 18 now NAMED in data/taxonomy.js)
ORIGIN    102 catalog powers · 92 carried by NO roster hero
ARMORY    35 weapons/gear · 28 on no fighter
DOORS     no card for `base`; no armory, education or firm-desk overlay
LEAF      roadAt · doorways · riskOver · REACHABLE_RESEARCH · (taxonomy.js: 0 importers)
```

### A · TWO CONDITION TABLES THAT DO NOT KNOW ABOUT EACH OTHER  ·  ~45 min  ·  ☐  **CHEAPEST**
`age.js` declares its own `CONDITIONS` (arthritis · als · cancer · alzheimers) and `riskOver()` rolls
them per band — **and nothing calls it**. `medical.js` declares a DIFFERENT `CONDITIONS` (internal ·
hairline · concussion · cardiac · nerve · toxicity · scarring) with the chart, the hidden/found split
and `inflict`. Zero overlap between the two tables.
- **Wire:** register age's four into the medical registry (ONE table, one chart — the same law as one
  ladder with two front doors), then roll `riskOver` inside `turnWeek`, which already exists and
  already advances seven days.
- **Player feels:** a fighter you have run for two seasons starts breaking down, and because medical
  conditions are hidden until someone examines them, you find out because the numbers stop adding up.
  Today that can never happen at any age.

### B · MY OWN TWO ORPHANS FROM TODAY  ·  ~20 min  ·  ☐
`data/taxonomy.js` has **0 importers** and `REACHABLE_RESEARCH()` has none outside its own file — both
written today to stop content being unreachable, both currently unreachable.
- **Wire:** the VISUAL LANGUAGE screen already reports "what nobody carries". Point it at the taxonomy
  for the NAMES and at `REACHABLE_RESEARCH` for the research split.
- **Player feels:** the screen stops saying `dome` and says *Psionic Force Field — nobody carries this*.

### C · NO DOOR FOR THE BASE  ·  ~1 h  ·  ☐   (the armory's door is now built; the base still has none)
`MODE_IMPL.base` exists, `baseroom.js` raises a walkable two-floor HQ, containment is priced on the
rank ladder — and `data/modes.js` has no card.
- **Player feels:** you can walk into your own headquarters. Right now it can only be entered by
  typing into the dev console.

### D · 28 ARMORY ROWS STILL ON NOBODY  ·  ~1 h  ·  ◐ THE SCREEN IS BUILT; ARMING IS DELIBERATELY NOT DONE
- **Player feels:** SARGE carries an M16 by name, and it sounds different from a suppressed PDW.
  Smaller felt gain than it was — the police ladder already banked the audible-escalation payoff.
- **DONE:** `engine/armoryUI.js` — the ⚔ ARMORY screen. Four categories, derived trait filters,
  sort over every axis, three-way side-by-side compare with per-row winners (and lower-is-better
  handled), ▶ HEAR IT per firearm, and a persisted loadout.
- ⚠ **ARMING IS DELIBERATELY NOT DONE, by instruction.** The loadout is saved and the screen says
  *SAVED — NOT YET ISSUED*. Wiring it to the human player at match start is the next step and is one
  hook; putting named weapons on roster heroes in `characters.js` is the separate half.

### E · THE DEAD TYPES, NOW THAT THERE IS A MAP  ·  each a `wwa-ship-mechanic`  ·  ☐
`data/taxonomy.js` names the archetype for 17 of the 18. Cheapest three by fit: `regen` (Super
Healing), `dome` (Psionic Force Field), `vision` (Echolocation / Night Vision) — and those three also
un-park three research rows for free.
- **Player feels:** fighters stop being 52 variations on punch-and-beam.

### F · BOTS CANNOT WALK THROUGH A DOORWAY  ·  M  ·  ☐
`doorways` points are produced by `citytiles.js` and read by nobody. Listed in BACKLOG as the known
open half of interiors v1.
- **Player feels:** an enemy follows you into a house instead of standing in the street.

### G · NOTHING DRIVES ON THE ROAD GRAPH  ·  L  ·  ☐
Unchanged; still the largest single opportunity and still days rather than hours.
- **Player feels:** the city has traffic, and a road is somewhere things happen rather than a texture.

**Excluded as deliberate** (BACKLOG): Cosmic+ rank headroom · `geography.js`/`climate.js` low reach
(authored joins by design) · `sector` (open question whether the column means anything) ·
`vessels.js` (space-layer only).

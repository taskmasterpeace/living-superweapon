# THRESHOLD — BACKLOG (captured 2026-07-23)

Everything Robert called out in one pass, so nothing gets lost between goals. Not a plan —
a ledger. Items move OUT of here into a goal when they get built.

## THE POWERS BRIEF — remaining lanes (ledgered 2026-07-24, after the combat program)
Landed that day: momentum melee · aimed throw · bleeding · second wind · sleep+blind ·
ALL 20 Tier-1 catalog powers + 7 kit treatments · afterburners ×6 · the gear system
(drops/pickups/proficiency/disarm) · zoned wounds + the medical ledger · low-orbit travel
with the transit cinematic · Tier-2 frost nova / seeker volleys / ricochet rounds.
Still open, in the brief's own order — each now sits on machinery that exists:
- **Chain Lightning** — needs chained target selection on hit (first arc thickest, sequential flashes).
- **Sticky Bombs** — an attach-to-victim/surface state before detonation (clamps + accelerating fuse).
- **Vampiric aura** (buff aura + siphon ticks) · **Ground Spikes** (temporary cover colliders —
  the construct system is the donor) · **Decoy Hologram** (untargetable copy + bot retarget via
  belief — flashbang's wipe is the donor) · **Turret stat-inheritance** · **Blade Cyclone**
  (nova + slash tick) · **Magnet Pull** (metal-only prop attraction — carry/throw is the donor) ·
  **Adrenaline Surge** (buff + hp drain/s) · **Sniper Stance** (rifle zoom state) · **Phase Walk**
  (phase through interior walls) · **Counter Stance** (riposte window off the parry machinery) ·
  **Grapple Slam** (grapnel-onto-enemy reel — grapple + throw are the donors) · **Air
  Superiority** (bonus melee vs airborne — one takeDamage-adjacent check).
- **Phase Zero visual contract** — the 7-trait `vis:` profile field sweep over every ability
  def + a codex surface + the no-more-than-3-shared-traits validator. High-leverage, big
  data pass; the five readability tests already gate every visual landed today.
- **Tier 3 after interplanetary**: portal pairs EXIST; telekinesis next (carry/throw+lock
  donors), invisibility after blind touched AI perception. The brief itself parks size
  change / elasticity / terrain reshaping / gravity inversion at the back.
- **Gear follow-through**: bot scavenging doctrine, pedestrian gun pickups (vigilantism
  laws already decide who dares), ammo COUNTS for discrete weapons, net item ownership.
- **Injury polish**: limp run-cycle animation + arm-cradle idle pose (mechanical tells are
  live; these are the animation layer), news-desk/opening-tape lines reading `injuryOf`.

## THE CITY GENERATOR (top priority — "probably the greatest thing we've put together")
- It must carry the CITY TYPES properly. There is a missing tile ("I don't even know what to
  call it") — see the interview.
- Show the city name bottom-LEFT (currently a centred nameplate at the bottom).
- Take the procedural generation to the next level generally. Open design interview.

## POLICE — a real escalation ladder ✅ SHIPPED (2026-07-24, manual §22 for the audio)
~~Beat cops first~~ · ~~attacking police escalates HARD~~ · ~~the full ladder~~ — all built.
The ladder runs SIX rungs: ★ beat cops (35) → ★★ patrol (90) → ★★★ SWAT (160) → ★★★★ FEDS
(240) → ★★★★★ MILITARY (340) → ★★★★★★ a SANCTIONED LSW (460), each gated on the country
sheet so a failed state tops out where its institutions run out. `onCopDown` jumps rungs
rather than ticking. Police audio (sirens, radio, hailer) landed 2026-07-25.
Still open here: nothing.

## WEAPONS — real firearms, not one "pistol" class
- REVOLVER (slow, heavy, six)
- GLOCK (standard semi-auto)
- "Pistol with a switch" (full-auto machine pistol — high ROF, wild)
- RIFLE
- SNIPER RIFLE (accurate, long range, real reach)
Existing classes: shotgun · pistol · rifle (`def.weapon` on a `rifle` ability).

## THE NEWS LAYER — lean into it
- **NEWS HELICOPTER** in addition to the ground crew. (Is the crew system expensive? See notes.)
- **The news crew is KILLABLE** — hurting or killing a reporter/operator is A BIG DEAL
  (heat, headline, story change).
- **A news STATION** — a persistent channel: keep some clips, replay them, standings, a
  background broadcast. We already record real footage and keep the stats.

## PRESENTATION / UX
- **Title screen is overwhelming.** Mode select, the character card, and everything else are
  all on one surface. Split it into steps.
- **The registry still doesn't read as a CIA case file.** Needs CATEGORIES — "PWR-IDX 11" is
  cool but uncategorised.
- **Onboarding must explain EVERY aspect** — including what the ground marker under the feet
  actually shows (facing wedge / state ring / altitude band).
- **Character highlight ring** — a highlight around the selected/targeted character.

## ROSTER
- Characters still feel same-y. Needs real differentiation, not more of the same knobs.

## MODES — ✅ BOTH BUILT (2026-07-25)
- ~~**Spectate**~~ **BUILT** — `game.spectate(on, who)` follows a fighter with the camera and
  ignores your input; `cycleSpectate()` steps through the living. You can now sit out and watch.
- ~~**Rule sets**~~ **BUILT** — `ms.ringOut` turns the arena border from a wall you bounce off
  into the way you LOSE. ⚠ The border had to stop clamping for this to be possible at all:
  under ring-out rules the arena lets you leave, and `checkRingOut` does the honours. Verified
  both ways — ejected under the rule, still clamped without it.

## INDOORS
- Interiors are ONE FLOOR.
- Flying indoors is the open question — remove the roof? Clamp flight? Both?
- Eventually trees/greenery indoors too.
- A military aspect is wanted; there's a sibling project with guns to learn from.

---

## ADDED 2026-07-23 (session 2)

### THE FOUR-LEVEL LADDER — ✅ BUILT (2026-07-24, PLAN 1 of the altitude doc)
Four decks with a docking servo, per-city `BANDS.ceiling`, `def.maxBand`, and the melee
vertical gate. ~~Ruled, designed, not built~~. **Plan 2 (seeing/hitting across levels) and
Plan 3 (interaction + real carrying) from the same doc are the parts still open** — see
`docs/PLAN_ALTITUDE_AND_INTERACTION.md`.

### INTERACTION + REAL GRABBING — ✅ BUILT (2026-07-25, PLAN 3 of the altitude doc, manual §27)
`game.registerInteractable(...)` + a 10 Hz focus scan scored by distance AND FACING, the G-chain
(interact → throw → pick up → hoist → grab) with the prompt that makes the chain legible, and the
FIELD INTERCEPT TRANSCRIPT as the choice surface (live by default). Carrying now refuses strike
and guard. Still open from that lane: the `poseCarry`/`carryAnchor` arm pose — carrying is still
visually a float, though it now costs you your hands.

### MAP GENERATOR — remaining structural work (ordered) — ✅ 1–5 ALL DONE
1. ~~Edge sockets~~ **DONE**
2. ~~**Road graph**~~ **DONE** (2026-07-23) — roads are DATA: node lattice, four classes,
   junction grammar, dead ends, meandering tracks, roundabouts by planner decision
3. **Multi-cell footprints** — anchor + `ref` cells; airports, rail yards, real stadiums
4. **Placement as a data table** — `{when, min, max, weight, score, footprint}`; rarity + landmarks
5. **The editor** — paint + LOCK authored cells + undo + plan JSON in/out + live 3D preview
6. Connect cities by road into a continent framework; airports at multiple sizes

### UNUSED DATA ALREADY PAID FOR
`cultureCode` (14 architectural regions), `sector` (527 rows), `hvt` — parsed, read by nothing.

### ~~PARKED BY RULING~~ — UNPARKED AND SHIPPED (interiors v1, 2026-07-24)
**Interiors / procedural rooms.** Was parked as lowest-value; revisited after the map generator
work and shipped as ATLAS v1 task 9: `floorplan()` (pure BSP, every room reachable by
construction) + enterable bungalows, walls in `world.interiors` consulted by physics, `canSee`,
the fog raster, projectiles, ragdolls and the interior cutaway.
Still open from that lane: bots don't navigate doorways yet, and beams ignore interior walls.

### OPEN QUESTIONS
- What is `Sector`? 223 codes like `LJ5`, half the rows blank. If it's a world-grid reference it
  could drive neighbouring-city consistency; if it's scaffolding, ignore the column.
- Roster size — "we might have too many fighters." Needs a differentiation pass, not a cull.

### OPEN — ONE CAUSE FIXED, A SECOND STILL LIVE (2026-07-25)
`THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN` fired 48× during ONE
synthetic stress run (spawning all 52 rivals with `_remove()` while also firing every slot of
every kit). The old suspect — a verlet tentacle updated after its owner is spliced — was
**wrong**. The real chain, found by re-running that exact battery:

1. a caller fires a slot without `inp.dt` (a test harness, and any future replay/net frame),
2. `bow` integrates the draw as `st.drawT + inp.dt / drawTime` → **NaN**,
3. release does `setLength(lerp(90, speedMax, NaN))` → an arrow with a **NaN position**,
4. three.js computes that mesh's bounding sphere → the warning, 48 times,
5. and the arrow's impact reached `audio.boom` → the sample bank → a **non-finite AudioParam,
   which THROWS inside the frame loop**.

Fixed by restating three laws the project already had, in the one place each was missing:
`samples.js` now coerces every AudioParam through `fin()` (the synth bodies always did; the
sample layer was added later and never got it) · `bow` clamps its draw fraction at source
(the same law `charge`'s `c01` learned) · `runSlot` floors `inp.dt` so no caller can inject
NaN time. Verified for THAT cause: the identical dt-less battery over 52×364 yields **0 NaN
projectiles and 0 bounding-sphere warnings** immediately after the fix.

⚠ **BUT THE WARNING RETURNED** once the Tier-2/Tier-3 systems landed, so there is a
SECOND source and it is **not fixed**. What is known, so the next person does not re-walk
this ground:

- It is a three.js **diagnostic**, not an exception. The full stress run — 52×364 slots,
  all 102 catalog powers, a 15-second six-fighter rumble — completes with **0 thrown
  errors, 0 orphaned audio loops** and all three validators at zero. Nothing is visibly wrong.
- It fires only under the **combined** stress run (roster battery → catalog sweep → rumble),
  3–4 times. Neither the rumble alone nor the catalog sweep alone reproduces it.
- **Ruled out:** scanning every geometry in the scene after each catalog power finds no
  persistent NaN; the same scan through a 12-second rumble finds none; no fighter ends a
  run with a NaN position.
- **Hardened anyway** (correct regardless of cause): the plumb-line tether now refuses to
  write a non-finite value into its persistent buffer and SCRUBS the buffer when hiding, and
  the rain buffer does the same. Neither was the culprit.
- **Instrumentation that did NOT catch it:** patching `computeBoundingSphere` on the
  prototype that owns it, then checking the position attribute on entry. The warning still
  fired with the hook installed and caught nothing — which points at a geometry whose
  owner is not in `game.scene` at the moment of the call (a detached or mid-dispose object),
  or a second THREE module instance. **That is the thread to pull next.**

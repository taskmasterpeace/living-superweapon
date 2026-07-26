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

### ~~OPEN~~ ✅ CLOSED — BOTH CAUSES FOUND AND FIXED (2026-07-25)
`THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN` — 48× in one stress run,
carried here for two days with the guess "suspect a tentacle chain". That guess was wrong, and
so was my first fix's claim to be complete. There were **two** causes.

**Cause 1 — the bow.** A caller firing a slot without `inp.dt` made `bow`'s draw fraction NaN,
which made `setLength(lerp(90, speedMax, NaN))`, which made an arrow at a NaN position. Fixed
by three laws applied where each was missing: `samples.js` coerces every AudioParam through
`fin()`, `bow` clamps its draw at source, and `runSlot` floors `inp.dt`.

**Cause 2 — the plumb line, and it is the more instructive one.** The altitude tether writes a
persistent 56-vertex buffer every frame. Its dash offset is
`scroll = (game.time * 22) % 50`, and the loop skipped degenerate segments with:

```js
const y0 = Math.max(0, d - scroll), y1 = Math.min(h, y0 + 26);
if (y1 <= y0) continue;          // <- this does NOT stop a NaN
```

**`Math.max(0, NaN)` is NaN, and `NaN <= NaN` is `false`** — so a NaN sails straight past a
comparison-based skip and lands in a buffer that lives for the life of the fighter. The value
then outlives whatever transient produced it, which is exactly why it was unreproducible: the
cause was long gone by the time anything looked.

**The rule that came out of it: VALIDATE WHAT YOU WRITE, NOT WHAT WENT IN.** Guarding the
inputs (`Number.isFinite(h)`, `Number.isFinite(gy)`) was not enough and never could be. The
write now checks the two values it actually stores, and the skip is `if (!(y1 > y0))` — which
IS NaN-safe — rather than `if (y1 <= y0)`, which is not.

**How it was finally caught**, since three's own message ("the position attribute is likely to
have NaN values") names no object: hook `console.error`, and when the message fires, walk the
entire scene graph *at that instant* and report the first geometry holding a non-finite
position. It named `/Scene/Group/LineSegments`, depth 2, 56 vertices, first bad index 1 —
the tether's first Y. Patching `computeBoundingSphere` itself had failed twice because the
offending frame had already passed.

**Hardening added alongside** (correct regardless of cause): a VFX FINITE LAW — the visual twin
of audio's `fin()` — gating all nine `vfx` primitives that build geometry from a position, with
a dev warning that names the calling site; plus the same output-validation on the rain buffer.

Verified: the full combined stress run — 52×364 roster battery, all 102 catalog powers, a
20-second six-fighter rumble, plus the async tail — now reports **0 NaN warnings, 0 thrown
errors, 0 orphaned audio loops**, and the game clock never goes non-finite.

---

## THE 47 UNTAGGED RESEARCH ROWS (2026-07-26, wire queue item 6)

`data/education.js` describes all sixty research effects in a `d:` prose string. Thirteen now carry
a real `fx` field built from verbs the engine already has (`EFFECT_VERBS`). **The other forty-seven
are deliberately still prose**, because a faked verb is worse than a description - prose at least
admits it is a description.

They group into four reasons:

- **The system is not built** (the large majority): orbital bases, interstellar travel, the rewind
  and its memory recovery, city-wide power suppression, terraforming, cloning lines, power
  transplant, the learning sparring robot, a foundry without a supply chain, weather as
  infrastructure, harvestable trench. Each of these is a feature, not a field.
- **The verb exists but is a DEAD ability type** (audit class 1): `nanite` wants `regen`,
  `droneswarm` wants `vision`, `shieldproj` wants `dome`. These land for free the day wire-queue
  item 7 gives those types carriers - tag them then, not now.
- **The hook is one line away but is a real design decision**: `jammer` (delay the police response -
  police ETA has no external modifier), `presscred` (news-crew priority), `navbeacon` (transit
  time), `cuffs` and the detention cells in `data/base.js` that still have no way to receive
  anybody (that is wire-queue item 9's tail).
- **It needs a new mission kind**: `vaccine`, `forensickit`, `surgerybay`.

WARNING: the tagged/untagged split is queryable - `REACHABLE_RESEARCH()` - so this list cannot
silently go stale the way a hand-written one would.

---

## COMPANIONS — WAIVED GATE ITEMS (2026-07-26)

`data/companions.js` ships the data layer and meets gate items 1 (a type, not a special case),
6 (numbers from the distribution), 7 (manual, same commit) and 8 (headless assertions,
`src/bench/companions.mjs`, 8/8).

**Items 2–5 are waived for this commit, in writing, because the engine layer is not built:**

- **2 · ONE CHOKE POINT** — the kennel store is the persistence choke point and exists. The COMBAT
  choke point does not apply yet: nothing bites, so nothing calls `takeDamage`.
- **3 · TWO CARRIERS × TWO SYSTEMS** — five breeds exist as data and zero of them exist as an
  entity. The intended delivery systems are melee bite (`takeDamage`), detection (feeding
  `game.noise` → the handler's `belief`, ⚠ with `src:'radio'` and **never** `'sight'`, or a dog
  launders knowledge past the AI honesty law), and psyche (`steadyEffect` into volatility).
- **4 · A COUNTER** — designed, not built: a dog can be hurt, and a loud enough `game.noise` should
  break its nerve. It has no ranged answer, so distance is the positioning counter.
- **5 · READABLE** — nothing renders. This one is bigger than the companion: `hud.js` shows only the
  PLAYER's own mood (`g.player._psyche`) and nothing in the game displays anyone else's emotion. A
  companion whose emotional state matters needs that surface first.

Also still open and named by Robert in the same conversation: a **person-to-person relationship**
tie (we have the 168×168 COUNTRY matrix and no personal one, so `TRAUMA_EVENTS.allyKilled` cannot
tell a colleague from someone you loved), **city familiarity**, and **investigations** — which two
data files already reference in prose (`education.js` compsci hooks, the `forensickit` research row)
while the system does not exist.

---

## MELEE + WRESTLING OVERHAUL — the consultant spec (2026-07-26)

Robert supplied a full design spec after saying **"melee is like non-existent, it doesn't feel
powerful."** It is the next big piece of work. Six slices, in his order:

1. **SPACING TRUTH** — authored move definitions, root steps, intent volumes, vulnerability states,
   and a developer range/timing overlay. Outcomes unchanged. *(Partly done: the reach inversion and
   the spacing rings shipped 2026-07-26; `data/martial.js` is the table.)*
2. **STRIKE GRAMMAR** — tap = quick, hold = fierce, plus input buffering (~120ms) and the first
   three style chains. Three buttons only: Punch, Block, Grab. **Never a fourth attack button.**
3. **THE WRESTLING CIRCLE** — a successful grab opens four world-space wedges with a draining
   perimeter timer (~0.80s, range 0.60–1.10). Direction meanings are FIXED across every style:
   Up = Control · Right = Force · Down = Ground · Left = Utility. A martial art changes the move in
   the wedge, never the wedge's meaning, so the player learns one wheel for the whole roster.
4. **STRENGTH-AWARE THROWS** — a new **Stability** 0–100 resource (footing, posture, breath).
   ⚠ **Condition opens the throw; strength changes the result.** Planted 70–100 · Shaken 35–69 ·
   Broken 0–34. Any trained fighter can trip a Shaken opponent; strength decides distance, height
   and impact. Four classes: shove/wall-drive · trip/topple · leverage throw · lift/launch.
5. **MARTIAL-ART PACKAGES** — Street Fighting, Boxing, Wrestling, Judo, Submission Grappling,
   Superhuman Brawling. Six complete styles, not twenty shallow ones.
6. **AI + CERTIFICATION** — bots use the same move data; difficulty changes reaction and planning,
   never reach.

⚠ **The short-arm answer is NOT longer arms.** Reach comes from authored intent volumes measured
from the chest, a collision-checked root step during startup, and soft facing assistance inside a
12–15° cone. This is the same law the project already keeps for the AI: assistance may never turn a
character around, bend around cover, or drag them after active frames begin.

⚠ **No hidden percentages.** Outcomes are deterministic from known state; a difficult technique is a
timed or positional demand, not a dice roll. An unavailable wedge is dimmed WITH THE REASON before
the player commits — never a silent failure.

⚠ **Never globally slow or pause in multiplayer.** The wrestling selector is real-time and the rest
of the fight continues; a second enemy can punish an ambitious hold.

His own definition of done: *"the system is not ready if players can win but cannot answer why."*

---

## THE RING — WHAT IS NOT DONE (2026-07-26)

`engine/boxingring.js` + the `boxing` mode ship the RULES. Gate items 1, 2, 3, 4, 6 and 8 are met;
the rest is listed here rather than implied to be finished.

- **THE VENUE.** The ring is built wherever the match already is — the first screenshot has city
  trees and a parked car inside the ropes. A boxing mode should raise a clean venue, or clear the
  cover inside the ring footprint, the way `whiteroom.js` builds its own hall.
- **THE MONITOR IS BEHIND THE CAMERA.** Built at `z = -(size/2) - 40`, which on the fixed isometric
  view is out of frame. It needs the camera-facing side, or billboarding, or a HUD mirror.
- **THE CLINCH.** Real boxing breaks a clinch after a beat; ours lets you hold. Still the general grab.
- **NO REFEREE, NO CORNER, NO REST ROUND** — `restSecs` is in the rule book and unused.
- **`hud: 'boxing'`** names a mode-bar type `hud.updateModeBar` does not implement, so the bar is blank.
- **Rope bounce returns 39% of entry speed** after drag, up from 26%. It reads as a bounce and not
  yet as a slingshot; the lever is `burstT` duration rather than `ropeBounce`.

---

## THE HANDS — WHAT IS NOT DONE (2026-07-26)

`engine/hands.js` ships the selector and the rules. Gate items 1, 2, 3, 4, 6 and 8 are met.

- **ITEM 5 · READABLE is HALF met and that is the gap.** `hud.updateHands(p)` is called from main.js
  and **does not exist** — so the weapon is visible in the fighter's hands (the mesh) but there is no
  HUD row telling you which slot you are on or what the others are. On an isometric camera the mesh
  alone is not enough. This is the next thing to build.
- **The pad binding.** ⚠ The D-pad is already mapped to Q / E / F and hero swap in `core/gamepad.js`.
  Left/right must move to hands and those abilities to the face buttons, or the control fights
  itself. Written up in `docs/THE_HANDS.md`.
- **The mobile chip strip** — phone mode hides the slot row entirely (`PHONE_CSS`), so if the hands
  row is the one thing a phone shows it must be the only thing added back, above the fire thumb.
- **The wheel** is not bound to `cycleHand` yet in the ability-wheel schemes.


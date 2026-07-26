# POWERWORLD — the second dimension

*Started 2026-07-26. A plan, not a decision. Research sections are attributed and dated; anything
not yet verified in code says so.*

> Robert: *"we want to be able to have a Steam Deck game that is basically Bid for Power, they go in
> a dimensional door and come to this game… but for now we build this universe which is essentially a
> camera change and control changes. Our game is lightyears beyond the rest."*
>
> And: *"proper planning equals great performance."*

---

## 1. What this is

**POWERWORLD is a dimension you reach through a door, and it is a second game wearing the same
engine.**

In **ASCENDANTS WORLD** you are a Living Super Weapon in a real city at 1:1 scale. There are
pedestrians who film you, police who escalate through six rungs, a news desk that reports what you
did, a career that books your next fight, and a country sheet that decides whether you are a
sanctioned hero or a criminal on sight. Everything you do has a witness.

In **POWERWORLD** the camera drops behind your shoulder, the horizon opens, there is nobody to
protect, and the fight becomes Bid For Power.

The strategic point in one sentence: **the fighters, the powers, the damage model, the ki economy,
the flight tiers, the beams, the ragdolls, the injury ledger and the audio are already built and all
of it comes with you.** PowerWorld is a camera, a control scheme, a world shape and four small
mechanics. That is why something this size is reachable — not because the ambition is small.

And the product point: `docs/DESKTOP_AND_STEAM_DECK.md` already ships a working Steam Deck path —
packaged build, controller layout, no keyboard needed to quit. **The distribution story for a Steam
Deck arena fighter is solved.** PowerWorld does not need a new pipeline. It needs a camera.

### The two worlds are connected, not alternatives

You do not choose PowerWorld at the main menu instead of the city. You **research your way to the
door** — Dimensional Physics, then the Portal Anchor, then the Gate — and once it exists you can
cross in both directions. A fighter who trains in PowerWorld comes back to Ascendants carrying what
they learned; damage taken there is real, and the medical ledger does not care which dimension broke
your arm.

---

## 2. The correction that changed the estimate

Robert asked whether beam struggle already existed. **It does, and it is complete.** Verified in
source rather than recalled:

| What | Where |
|---|---|
| *"DBZ-style beam struggle: opposing beams meet; the struggle point moves toward the weaker"* | `projectiles.js:1017` |
| `clashPower() = might × powerBuff × (0.35 + 0.65 × ki/maxKi)` | `projectiles.js:681` |
| `_clashT` slides by the power differential every frame | `projectiles.js:1033` |
| `clashLen` pins each beam's tip to the struggle point | `projectiles.js:1036` |
| the loser is `end()`ed and `_overpower` detonates on them | `projectiles.js:1060` |
| the beam VOICE strains upward as it loses — *"you can hear which way a beam struggle is going without looking"* | `projectiles.js:696` |

So the missing list is **four items, and the one previously priced as medium is already shipped.**

| # | Item | Cost | Note |
|---|---|---|---|
| 1 | **Teleport-intercept** | small | **the kill test.** Buildable in the CURRENT camera |
| 2 | **Lock-on chase camera** | large | everything else depends on it |
| 3 | Limb segmentation | medium | only matters once the camera is close |
| 4 | Impact-indicator discipline | small | design work, little code |
| ~~5~~ | ~~Beam struggle~~ | — | **already shipped** |

⚠ The open question on beam struggle is not whether it exists but whether it holds up **airborne and
at speed** — it was tuned for grounded isometric fights. That is tuning, not building.

---

## 3. Ultra BFP's feature list, measured against ours

Ultra BFP's own player guide is a specification, not a wish list. Mapped against this repo:

| Ultra BFP feature | Ours | Verdict |
|---|---|---|
| **Camera Menu (F1): angle · distance · height · FOV** | nothing — the camera is a fixed iso `camDir` on an **OrthographicCamera** (`world.js:55`) | **THE work.** Four dials is a small UI over a camera that does not exist yet |
| **V — first/third person toggle** | ⚠ `V` is our JAB (`KM.strike`) | collision — must rebind |
| Z ascend · `.` powerup · X descend | power TIERS I–III/MAX with real transformation ceremonies (`tierOf`, `TIER_COLORS`, shockwave + lightning + pillar + slowmo + announce) — but EARNED by XP, not pressed | a different system wearing the same coat. **Decision C** below |
| `,` fusion (dance minigame / Potara) | nothing | out of scope for v1, parked in writing |
| Kaioken — 1 min, lethal if not deactivated | `buff` abilities with `dur`, `overdrive`, ki drain, `onDrained` | the shape exists: a timed self-buff with a cost. A lethal-on-expiry buff is a data row |
| Transformation style: Fast (instant) vs Normal (cinematic) | the tier-up ceremony is always the full cinematic | one flag, and a real quality-of-life win |
| Dragon Radar (F7) + 7 collectibles | `hud.updateRadar` (arena, cover, foe dots, fog `?` at `_lastKnown`) | the radar exists; a collectible hunt is a mode, not a system |
| Wishes: +100 HP, unlimited ki, strength, senzu… | `energyInfinite` (TITAN's ∞ CORE), `powerBuff`, `levelMult`, the medkit item | **every effect already has an engine verb.** A wish is a data row calling one |
| Music Menu (F6) + custom .wav | `music('menu'\|'combat'\|'victory')`, the five-bus mixer, a 300-file MP3 sample bank | a menu over what exists |
| Maps including Namek | 1,050 real cities, a procedural planner, terrain/relief/biome, ten planets | we have *more map* than BFP. What we lack is BFP-SHAPED maps: open rock, no city, no people |
| Modes: FFA · TDM · LMS · Tourney · CTDB · Oozaru · Survival · Battle Royale | duel · survival · rumble · tournament · boxing · freeroam · lab | FFA≈rumble, Tourney=tournament, Survival=survival. Missing: TDM, LMS, CTDB, BR |
| **Oozaru — giant player form** | `size` is a **live ability type with a runtime handler that NO character carries** (orphan audit class 1) | this feature is already in the engine and unreachable. One data row |
| Senzu Bean pickup | items with `charges`, `medkit`, ground drops (`_drops`, `spawnGearDrop`, `pickupGear`) | pickup infrastructure done |
| Big Heads cheat | `frameOf` already derives a per-fighter `head` scale | one multiplier |
| FPS cap + counter, graphics options | adaptive quality tiers 0–2, `_pixelCap`, `get fps`, `toggleTelemetry` (F2) | done, and better — ours is adaptive |
| Skins (Skin1/2/3) | `def.colors` palettes + per-hero `BUILDS` | a skin is a palette row |

### The reading

BFP's feature list is mostly **menus over systems**. We have the systems and almost none of the
menus. The one real exception is the camera, and that is the whole project.

Two BFP headline features are **already implemented in our engine and carried by nobody** — `size`
(Oozaru) and every wish effect. That is this morning's orphan audit restated: this dimension is
unusually cheap because most of it is wiring, not building.

### What we deliberately do not copy

- **Fusion.** A two-fighter merge with a timing minigame is a whole system and a whole art problem.
- **The licensed cast, the music, the Dragon Balls themselves.** Borrowing the shape of BFP's camera
  and controls is legitimate; borrowing its characters is not. **Our 52 fighters and the ORIGIN
  creator are the differentiator** — a BFP-like where you built the fighter yourself is a better
  product than a BFP clone.
- **First person.** BFP offers it. In a game whose entire readability model is *"you can see both
  bodies"*, first person fights the lock-on framing. A photo mode at most.

---

## 4. The laws PowerWorld may not break

Load-bearing in this repo, and a new dimension is exactly where they get broken by accident. Every
one has been paid for once already.

1. **THE LIGHT-COUNT LAW** — a fixed pool of 14 PointLights, always in the scene, always visible;
   `borrowLight`/`returnLight` drive intensity only. Changing the visible light count rebakes every
   material in the scene (measured: a 400ms freeze). **A dimension full of energy effects is the
   highest-risk place in the project for this.**
2. **THE RESET LAW** — `game.clearTransients()` is the ONE place that empties the board. New
   transient systems go there, not into a reset path.
3. **THE DEFERRED-CALLBACK LAW** — `game.later()`, never a bare `setTimeout`, for anything touching
   the fight.
4. **THE AI HONESTY LAW** — a bot may act only on what it earned by sight, radio or noise. A lock-on
   camera must not become a lock-on wallhack.
5. **THE FAIRNESS LAW** — difficulty buys judgment, never reflexes, aim or knowledge.
6. **THE FLICKER LAW** — take a rung from `GROUND_LAYER`; never invent your own small offset. A
   perspective camera at close range makes z-fighting far more visible than the iso camera ever did.
7. **THE MECHANIC PROTOCOL (§5)** — a data-driven type, not an `id ===` check; one choke point; two
   carriers via two delivery systems; a counter; readable; in the manual in the same commit;
   verified headlessly with real assertions.
8. **NO PURPLE.** KIVULI is the sole exception in the entire project. A DBZ-styled dimension is
   precisely where violet auras will try to sneak in.
9. **The manual is the contract** — combat changes update `docs/COMBAT_MANUAL.md` in the same commit.

---

## 5. Decisions that need Robert before anything is built

| # | Decision | Why it blocks |
|---|---|---|
| **A** | **Is PowerWorld a MODE, a THEATER, or a PLANET?** All three doors already exist. A mode card is cheapest; a theater rides `hud.theater` + the travel cinematic; a planet gets `worldEnv`'s air/life derivation for free. | decides the door, the save shape, and whether the career can book fights there |
| **B** | **Does the chase camera apply in PowerWorld only, or become a global option?** | PowerWorld-only keeps the city game frozen and safe; global doubles the test surface |
| **C** | **Is our TIER ladder the transformation ladder, or is a pressable ascend/descend a new system?** BFP presses Z/./X; our tiers are earned by XP and cannot be un-earned. | decides whether "transformation" is a control group at all |
| **D** | **One fighter, or a roster?** `THE_MERGE.md` already recommends one hero deployed at a time. | decides whether lock-on needs target cycling on day one |
| **E** | **Does PowerWorld book Elo, injuries and the career?** | a dimension that does not touch the book is a sandbox; one that does is a career venue |

---

## 6. Build order, and the one test that decides everything

1. **TELEPORT-INTERCEPT, in the current isometric camera.** About a day. It turns momentum melee into
   the chase loop: knock them away, blink to them, continue. **If it is not fun in isometric, the
   camera will not fix it** — and this is the cheapest possible way to find that out.
2. **The chase camera, in one flat empty arena.** No content, no stage art, no modes. Prove the
   framing, the full-sphere handling, and that aim / fog / occlusion survive the projection change.
3. **Impact-indicator discipline** — done *with* step 2, because the camera is what exposes it.
4. **Limb segmentation** — once you are close enough to see the knee.
5. **Stages and the door.**

⚠ Step 2 is the expensive item and must not start until step 1 has convinced us.

---

## 7. THE SPIKE — the riskiest assumption, measured (2026-07-26)

Before planning a camera it is worth knowing whether the engine will render one at all. The whole
plan sits downstream of one question: **will the existing `EffectComposer` accept a perspective
camera?** The camera is an `OrthographicCamera` (`world.js:55`) and every pass, the half-resolution
bloom, the ACES tone map and the print pass were built around it.

Driven live, in a running match:

| Check | Result |
|---|---|
| the news crew already owns a `PerspectiveCamera` — the existing precedent | **PASS** |
| the composer exposes a pass that owns a camera (`RenderPass`) | **PASS** |
| swapping `pass.camera` to a perspective camera renders **without throwing** | **PASS** |
| it drew a real scene, not a black frame | **PASS** — mean luminance 71.0, 74% of pixels lit |
| cost | **0.65 ms/frame** submission time |
| shader programs after the swap | **46** — no recompile storm |

**The camera swap is one line — `pass.camera = chase`.** Not a renderer rebuild, not a second
composer, not a fork of the render path. Bloom, tone mapping and the print pass all simply work
through it. `spaceflight.js` already swaps a *scene* into the same RenderPass, so swapping a *camera*
is the same trick on the other axis.

That does **not** mean the camera is cheap — the expensive part was never the projection matrix, it
is everything that assumed the fixed isometric `camDir`: mouse-to-ground aiming, the fog plane, the
tower cutaway, the two-player frustum fit. But the foundation is sound and the risk is now known to
live in the *dependent* systems rather than the renderer.

### Two things the spike found by accident

Both are real, both matter, and neither was what I was looking for:

1. **⚠ THE FOUR-DECK SERVO FIGHTS FREE AIR COMBAT.** Holding a tier-3 flier at y=64 and stepping the
   sim, the fighter was walked back down to **48** — the servo easing them onto the band's deck,
   doing exactly what it is documented to do. For a BFP-style fight where altitude is yours to choose,
   this is wrong. It is already known to yield to `launchT` and to a lit afterburner, so the fix is a
   third exception rather than a fork — but it must be an explicit decision, not a surprise.
2. **⚠ HALF THE ROSTER CANNOT FLY.** RAGE was staged at y=71 and fell to 13, because `flightTier 0`
   means grounded — the toggle refuses. A dimension whose entire premise is air combat has to answer
   what happens to the grounded fighters: are they excluded, do they get PowerWorld-only flight, or is
   being ground-bound a legitimate underdog style with leaps and slams? **This is a design decision
   nobody had written down**, and it affects roster balance, the door, and whether the career can send
   you to PowerWorld with any fighter you like.

---

## 8. THE GROUNDED FIGHTER PROBLEM — and why it is an opportunity

The spike surfaced this and it needs a decision. `def.flightTier 0` means **grounded — the flight
toggle refuses.** RAGE and SARGE are among them, and they are flagship characters. A dimension whose
entire premise is air combat has to say what happens to them.

Four answers, and the fourth is the good one:

| Option | Verdict |
|---|---|
| **Exclude them** — PowerWorld has a flier-only roster | ✗ cuts the roster, benches two flagship fighters, and makes the door feel like a restriction |
| **Grant everyone flight in PowerWorld** | ✗ erases `flightTier` as a stat. Flight tiers are load-bearing character identity — VOLT sags, RIME rides a board, TITAN is capped at tier II as the android trade-off. Flattening that costs more than it buys |
| **The dimension grants it diegetically** ("PowerWorld's ambient energy lifts you") | ~ tempting, and it is the same erasure with a story on top |
| **Grounded is a STYLE, and its answer to a flier is to bring them DOWN** | ✓ |

### The fourth option, spelled out

In DBZ the ground-bound heavy is a real archetype — the fighter who cannot chase you but who ends the
fight the moment you come within arm's reach. That is a playstyle, not a handicap, and **every piece
it needs already exists in this engine**:

- **the grab** and the clinch struggle window (`melee.js`)
- **the aimed throw** — authored release velocity, a real parabola preview, and `updateThrownBodies`
  so a hurled body bowls through a third fighter (manual §11)
- **slam damage** — being hurled into terrain hurts, credited to the launcher, gated on `launchT`
- **KRAKEN's tentacles**, which already reach out, seize, drag a victim in and hurl them at cover
- **`liftCapacity` / the weight ladder** — a STR-10 fighter can throw an airliner
- **the ground-slam nova** (`groundslam`), RAGE's WORLD BREAKER

So the grounded fighter's kit is: **deny the sky, punish the descent, and end it in one exchange.**
A flier who never lands wins on points and never lands a knockout; a flier who comes down to finish it
is entering the one range where they lose.

### ⚠ What blocks it today

`coneFoe` skips any foe more than a fixed vertical distance away — the melee vertical gate. Fighters
are 9.6u tall, so that gate is barely one body-height, and it means **a grounded fighter currently
has no reach at all against anyone even slightly above them.** Grabs ride the same gate.

That single number is the difference between "grounded is a style" and "grounded is unplayable." It is
being quantified in the combat-tuning section, and it is very likely the highest-leverage single
constant in the whole PowerWorld design.

**Anti-air is therefore a first-class requirement, not a balance pass** — and the §5 protocol applies:
it needs two carriers via two delivery systems, which the roster already has (a grappler and a
thrower).

---

## 9. THE RESEARCH — where the detail lives

A nine-agent pass read the systems this dimension has to route through. The full reports are in
**`docs/powerworld/`** (~6,600 lines, every claim carrying a `file:line`), because a scratch
directory is not a plan:

| file | what it settles |
|---|---|
| `pw-camera.md` | 27 systems that assume the iso camera, each with a verdict; the chase-camera spec with flight speeds looked up rather than guessed; keep-two-cameras architecture |
| `pw-controls.md` | why a POWERWORLD scheme cannot be expressed in `KEYMAPS` today; third-person aiming; the full Steam Deck layout; the collision table |
| `pw-limbs.md` | the arm is the mannequin, not the leg; the segmentation plan; measured mesh counts |
| `pw-impact.md` | the 10.7× frame-height ratio; nine of fourteen effects larger than the whole frame; why `world.shake()` cannot be ported |
| `pw-world.md` | six named stages from existing knobs; `fitBands` capping a rocky arena at ~170u; the research route is dead code |
| `pw-combat.md` | the chase-loop drag constant; the vertical gate quantified; teleport-intercept designed end to end |
| `pw-visual.md` | what must not fork; a PowerWorld sky with no sun and a real bottom; the ARENA look preset |
| `pw-platform.md` | Deck and iPad budgets; why PowerWorld is cheaper on CPU and shadows but not automatically on fill |
| `pw-bfp-map.md` | Ultra BFP's feature list measured against ours |

| `pw-esf-research.md` | what ESF and BFP actually did, from primary sources — the recovered beta 1.2 manual, a live server's `cvarlist`, and the dev team's own retrospectives. **Read §13 below first.** |

⚠ **Correction for the record:** BFP is a **Quake III Arena** mod; ESF is the Half-Life one. An
earlier brief in this session called both Half-Life.

---

## 10. THE DEFECT LEDGER

The research pass was not a bug hunt. These fell out of reading the exact code the dimension has to
use, and **every one of them is live in the shipped game today**, independent of PowerWorld.

### Fixed and verified in this session

| what | why it mattered | verified |
|---|---|---|
| **`_pixelCap` clobbered by the device ladder** — `Math.min(fn ‖ 2.6e6, …)` → `NaN` | **the game did not boot on a phone** (throw at module top level killed the rAF loop); on iPad the quality governor was pinned at tier 2 forever and the tablet cap never applied | boot + ladder + clamp, live |
| **The governor inverts at 40 Hz** | the Deck guide *recommends* locking 40 Hz; the tier fell to 0 in ~5s and could never return | 6 cadences simulated against the real rule |
| **`viewport-fit=cover` missing** | all twelve `env(safe-area-inset-*)` sites resolved to 0px on the only devices they exist for | live |
| **No `item` binding on pad or touch** | every gadget and every scavenged weapon was **keyboard-only** — unusable on Deck and iPad | live, both surfaces |
| **`PAD_ACTION.item = 'square'`** | told pad players the punch button was the gadget button | live |
| **BRAWLER: `KeyF` punched *and* took off** | violated `KEYMAPS`' own no-collision law, which was unenforceable because the binding lived outside the table | 0 collisions across 4 schemes |
| **The help panel printed `V`/`G` regardless of scheme** | the one scheme that exists *because* the melee keys moved was the one it lied about | live, 2 schemes |
| **`kneeCap` stranded at the corpse origin** | a kneecap on the floor under every dead body | 400 ragdoll steps + exact `restore()` |
| **First KO cry / first ki charge were synths** | `HOT_SET` omitted them, and a sample that decodes on first use is a synth on first use | manifest + call sites |
| **`charge()`/`beamVoice()` threw `st.sfx.ramp is not a function`** | two sustain contracts (`ramp` vs `set`); breaking the one audio law — never throw into the frame loop | live, clean |
| **Beam struggle could not happen in the air** | a 3D distance dividing 2D deltas plus a dropped `dir.y` made the gate `cos²(elevation)`: **no clash past ~51°**, silently | geometry proven numerically |

### Found, measured, NOT yet fixed — these need a ruling

| what | the measurement | the decision |
|---|---|---|
| **`launchT` is not in the slide-class drag exception** | a 101 u/s knockback travels **16.1u** and loses half its speed in **0.18s**; with the exception it travels **63.5u** over 0.59s | **this is the ESF chase loop.** 4× further is a real change to the city game's feel too — global, or PowerWorld-only? |
| **The melee vertical gate is 10u** — 1.04 fighter heights | while the four flight decks are 82–115u apart. Gates every jab, cross, haymaker, grab and cone. `overlapFoe` ±9, `updateThrownBodies` ±9, `resolveBodies` ±7 | probably the highest-leverage single constant in the design. Also what makes grounded-vs-flier possible |
| **The four-deck servo drags a flier off any held altitude** | measured: a tier-3 flier pinned at y=64 was walked back to 48 | it already yields to `launchT` and a lit burner — a third exception, not a fork |
| **Half the roster cannot fly** (`flightTier 0`) | RAGE staged at y=71 fell to 13 | §8 argues grounded should be a *style* with anti-air, not an exclusion |
| **`fitBands` caps a rocky arena at ~170u** | it measures the tallest cover box and sets the ceiling to 1.9× it; the flagship city gets 328 | one early return on a `bandsLocked` flag |
| **`applyWorldGrade` has zero callers** | the per-world colour grade is dead code, and its fallback reads a `_dnc.sky` key that does not exist | free win for two visually distinct dimensions |
| **`chargingKi` has no HUD surface at all** | the DBZ power-up state — held guard, 40/s regen, defenceless — is invisible on screen | BFP's `.` powerup already exists mechanically and cannot be seen |
| **KO cam and spectator camera are dead in a live match** | `mapCam` is read only inside `if (!this.running)`, `followHumans` overwrites unconditionally, and `world.orbitAngle` is **never assigned anywhere in the repo** | finishing the `mapCam` channel is step 0 of the camera anyway |
| **Lifting the aim thumb snaps aim to (0,0)** | `Input` has no touch handlers, so `m.clientX/Y` never leave their initialiser | iPad-critical |
| **On the Deck, tiers 2 and 1 render at identical resolution** | `_maxPR` is 1, so a three-position ladder has two positions | |
| **`body.deck` probably never activates in the packaged build** | needs Valve's UA token (Electron's is not) or a pad at boot, and nothing re-runs the ladder on `gamepadconnected` | |
| **`pickTargetDir` has no `_vis` gate** | the gamepad targeting path can acquire through fog where the mouse path cannot — an honesty-law hole | |
| **`hardLock` tracks a target through walls** | only the triangle hides; `faceDir` keeps following the live body | |
| **No `webglcontextlost` handler** | the desktop build reloads on `render-process-gone`; the browser build has nothing | iPad drops contexts |

### The one that changes the plan

**The research route into PowerWorld does not exist as code.** `portalanchor` and `dimgate` are prose
strings, the `RESEARCH` schema has **no prerequisite field at all**, and `applyResearch`,
`researchOptions`, `org.hire`, `base.startBuild` and `base.tickWeeks` have **zero callers** between
them. Nobody can spend a week on research today.

So the door ships in two slices: **a mode card first**, and the researched gate second — otherwise
PowerWorld would be locked behind a system that cannot be operated.

---

## 11. THE REVISED BUILD ORDER

What the research changed: step 1 got cheaper and better-specified, and two prerequisites appeared
in front of step 2.

0. **Finish the `mapCam` channel** — one `cameraDrive(dt)` arbiter. It is the seam the chase camera
   needs *and* it revives the KO cam and the spectator camera, which are currently dead. Small.
1. **TELEPORT-INTERCEPT + the chase-loop drag**, in the current isometric camera. The intercept needs
   no new key, no new system and no new state field: `launchT` is the eligibility signal, `lastHitBy`
   the ownership check, `burstT` the mandatory clamp-lift, and `updateBlinkMark` already draws the
   destination. Two carriers, two delivery systems: **KANO** on the `teleport` TYPE, **APEX** on the
   `blink` evade lane. ⚠ Arrival must be at **exactly `foe.pos.y`**, or the 10u vertical gate refuses
   the punch you teleported to make.
2. **The chase camera, in one flat empty arena.** ⚠ The kill test is a **screenshot matrix, not an
   assertion suite** — this project's own record is unambiguous: the boxing ring shipped four times
   too big with six green assertions, and the venue's audience was built entirely outside the frame.
3. **Impact discipline**, with step 2, because the camera is what exposes it. `world.shake()` must
   become angular before anything else — at a 14u camera distance the current world-space jitter is
   **29.7°** and passes the camera through the fighter.
4. **Limb segmentation** — and it is the **arm**, not the leg. The leg already has a driven knee; the
   arm's upper/fore/fist are flat siblings that only ever bend when the fighter is dead.
5. **Stages and the door** — six stages come from existing knobs; **THE NEEDLES needs zero new tiles.**

---

## 12. WHAT SHIPPED FIRST — the mode, before the camera

`powerworld` is a real mode card now, deliberately ahead of the camera, because the build order above
says the chase loop has to be fun in the view we already have. It is the rule set only:

| rule | how | verified |
|---|---|---|
| **A knockback CARRIES** | `_chaseKb` puts a launched body on the slide-class drag the thrown body already uses | ✅ **101.3 u/s → 61.3u travelled**, against **16.1u** in the city |
| **The sky does not dock you** | `_noDeckServo`, a third exception on the rule that already yields to `launchT` and a lit burner | ✅ held at 300, released ascend, still at 300 |
| **Nobody lives here** | `hasCivilians()` in `data/modes.js` — one definition, replacing the magic string `!== 'training'` that `police.js` and `newscrew.js` each carried separately | ✅ law and press both stand down, and both return on leaving |
| **No empty mode bar** | joins `training`/`freeroam` in the nothing-to-report list | ✅ |
| **Nothing leaks out** | band restore runs in `clearTransients` — the one place that empties the board | ✅ ceiling, police, press and per-fighter flags all restored |

### ⚠ Owed, and not claimed

**The raised flight ceiling is NOT verified.** `BANDS.ceiling` is set to 900 in setup and re-asserted
each tick, because `world.fitBands()` runs *after* the mode's setup and rewrites the band table from
the tallest thing it just built. Two harness attempts failed to confirm a player can actually climb
into it:

- reading `BANDS` via a console `import('/src/core/util.js')` returns a **phantom second module
  instance** under Vite's version stamping — the documented trap, so the `320` it reported proves
  nothing either way;
- and the flight test could not get airborne: writing `flyHeld` is overwritten by `controlPlayer`
  every frame, and driving the real key did not toggle `flying` in the harness.

So the ceiling is **written but unproven**, and the structurally correct fix is still the one the
world research recommends — a `plan.bandsLocked` early return inside `fitBands` rather than a
re-assertion racing it. That is owed, and it belongs with the stage slice.

What is proven is the part that matters most for the direction: **the chase loop is real and it is
four times the reach it had.** Whether it is *fun* is Robert's call, in the isometric camera, which
is exactly where his own build order wanted that question asked.

---

## 13. WHAT ESF ACTUALLY DID — and the five things it changes here

Full research in `docs/powerworld/pw-esf-research.md` (1,468 lines). It rests on primary sources, not
summaries: the **official ESF beta 1.2 manual**, dead on the live site and recovered from the Internet
Archive, complete enough to implement Advanced Melee from; a **`cvarlist` dump from a live ESF 1.2
server** giving the real `am_*` constants; and the ESF dev team's own retrospective articles, in which
they judge their own famous system.

### 13.1 ⚠ THE LAW OF THE GENRE, in a team member's own words

> *"All you need to do is be close and have to be holding a single mouse button. **How you get close
> is your choice**, be it swoop, teleport or normally flying. Call it a proximity triggered crowbar."*

**In a fast 3-D flight brawler the strike cannot be the skill test — the approach is.** ESF made the
punch itself automatic and moved *all* of the difficulty into closing the gap. Every good thing about
ESF melee follows from that, and the one system that violated it — the advanced-melee arrow minigame —
is the one its own developers deleted, saying *"we knew the old advanced melee system was no good, so
it got thrown out."*

This is the single most useful sentence in the research, and it validates something already true here:
our trifecta is already proximity-and-commitment (`coneFoe` + reach + the step-in), and the CLINCH
pass's reach inversion — jab furthest, power punch nearest — is already *"the approach is the skill."*
⚠ It also warns off a whole class of tempting work: **do not add an input minigame to melee.** The
project's own melee spec has a wrestling-circle wedge minigame in it, and this is evidence against
putting that on the critical path for PowerWorld.

### 13.2 Teleport intercept is real, and its catchability was an accident worth making deliberate

Confirmed as **the core high-skill technique**: hit them → your swoop ends → teleport toward the
flying body while holding melee → connect. Nine named combos are transcribed. Three structural facts:

- **You cannot teleport *during* a swoop.** They are mutually exclusive; teleport-while-swooping was
  requested repeatedly and rejected as overpowered.
- ⚠ **Whether you can catch them depends on how hard you launched them.** A standing or dropping hit
  launches slowly and is catchable; a full swoop hit launches too fast to follow. The research is
  explicit that this trade-off *emerged accidentally* — **so build it on purpose.** That is a real
  design gift: it makes the biggest hit not automatically the best hit, and it means our own
  `momentumMult` already has the input the rule needs.
- ESF 1.2.1 had to stop teleport **overshooting** the opponent, which is exactly why intercepting was
  so hard before it. Our arrival point should be short of the body, not on it.

### 13.3 ⚠ ESF GAVE UP ON ITS OWN CAMERA, and said so in a changelog

> *"Firstperson is now forced during melee battles, so the screen doesn't fuck up."*

The genre's benchmark **cut away from its own third-person camera rather than solve the two-body
framing case**. That is the strongest available warning for step 2 of our build order, and it is why
the kill test there is a screenshot matrix rather than an assertion suite. Swoop framing, beam-struggle
framing and launched-camera behaviour are **undocumented in every source** — so there is no reference
answer to copy and we will be deriving it.

### 13.4 Our beam struggle is already correct by ESF's standard

**Powerstruggle is a HOLD-and-spend contest in both games, never a mash** — only advanced melee was an
input minigame. `clashPower() = might × powerBuff × (0.35 + 0.65 × ki/maxKi)` with both casters burning
ki is exactly that shape. Nothing to change; §2's airborne fix was the only real gap.

### 13.5 The combo-chain fix is a curve, not a wall

ESF shipped unlimited chaining (broken), then a hard 2-hit cap (hated). ESF:Final replaced both with
**escalating knockback per chained hit plus a geometric bonus — 1, 2, 4, 8 — that resets on recovery.**
Worth copying directly if PowerWorld ever gets a combo counter, and worth remembering that the hard cap
was the version players disliked.

### 13.6 BFP's cautionary lesson argues for lock-on

BFP put no aim assist on a ~2780 u/s free-pitch flier, and produced **the same complaint from 2002 to
2024**: *"have a lock on system would be better."* That is direct evidence for the lock-on framing
decision, from the game we are explicitly aiming at.

### Corrections the research makes to the record

ESF: Final is **not** Beta 1.3 (the Open Beta was cancelled); **ESF had no destructible terrain** — a
team member says so, which means our `crater`/`shatterBlock`/slam-through-a-wall ambitions are *ahead*
of the reference, not behind it; the base game shipped **9 characters with one transformation each**,
so the long transformation ladder people remember is fan-made; and a plausible-sounding claim that
overcharging a beam makes it explode in your hand was traced to wishlist threads and **rejected**.

Fourteen open gaps are listed rather than smoothed over — including that **no source anywhere
publishes ESF's numeric ki costs**, so any ki economy we build is ours to calibrate.

---

## 14. STATUS — what a player can do today

| | state |
|---|---|
| **The dimension** | `powerworld` mode card. Enter it, fight, leave; everything restores (×4 soak clean) |
| **Third person** | ✅ `world.chase()` — perspective camera swapped into the existing composer, lock-on framing, off-the-shoulder, FOV 58→74 with speed, screenshot-matrix verified across clinch / mid / far / overhead / below |
| **The chase loop** | ✅ a 101 u/s knockback travels **61.3u** here against **16.1u** in the city |
| **The open sky** | ✅ no deck servo — release ascend and you stay where you stopped. ⚠ the raised ceiling itself is still unverified (see §12) |
| **The stage** | ✅ 900u rock arena, 15 spires + 22 boulders as real cover, its own sky, no city |
| **No witnesses** | ✅ no pedestrians, police or press — via `hasCivilians()`, one definition |
| **The HUD** | ✅ the city nameplate, wanted stars and KMK 9 monitor are gone; the panel, hands row and radar stay |
| **Beam struggle in the air** | ✅ fixed (was silently impossible past ~51° of elevation) |
| **Steam Deck** | ✅ boot and the quality governor both fixed (the 40 Hz inversion, the `_pixelCap` collision); the packaged path already existed. ⚠ **not measured on hardware** |
| **iPad** | ✅ boot no longer dies, safe areas now resolve, the item button exists. ⚠ **not measured on hardware**, and the aim-thumb snap-to-zero bug is open |

### Still owed, in priority order

1. **Teleport-intercept.** Designed end to end in `pw-combat.md`; needs no new key, system or state
   field. ⚠ Build the ESF catchability trade-off deliberately: whether you can follow depends on how
   hard you launched them (§13.2).
2. **The melee vertical gate (10u ≈ one body height)** — the single highest-leverage constant left,
   and what makes grounded-vs-flier possible at all (§8).
3. **The flight ceiling**, properly, via `plan.bandsLocked` rather than a per-tick re-assertion.
4. **Limb segmentation — the ARM**, now that the camera is close enough to see it.
5. **Impact discipline** — `world.shake()` is still the world-space one outside the chase camera, and
   nine of fourteen VFX are authored for a frame 10.7× taller than this one.
6. **Hardware measurement** on a Deck and an iPad. Every platform number in `pw-platform.md` is
   arithmetic from source, and it says so.

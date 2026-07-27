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

**RESOLVED, and the resolution was better than the plan.** This section used to say the raised ceiling
was *written but unproven* after two failed harness attempts. Both failures are now explained, and the
number turned out to be the wrong instrument anyway.

Why the harness could not get airborne — two traps, both worth keeping:

- **`input.endFrame()` is called by main.js's rAF loop, not by `game.update()`.** A test that steps the
  sim by hand and dispatches a synthetic keydown therefore leaves the edge latched forever, so the fly
  key re-toggled every frame and `flying` read false about half the time.
- **The scheme decides the key.** The tab's saved scheme was BRAWLER, which puts fly on `KeyG` — every
  `KeyF` press in the old harness was a jab. Read `KEYMAPS[SETTINGS.scheme].fly`, never a literal.

(The phantom-module note stands and is unrelated: reading `BANDS` through a console
`import('/src/core/util.js')` really does return a second instance under Vite's version stamping.)

And the fix is no longer a number. **A lid you can reach is still a lid**, so in PowerWorld the ceiling
clamp does not run at all (`!this._openSky`) rather than running against a bigger figure. Measured
under the real keys: a flier and a grounded bruiser both pass **456u and are still climbing**. Setting
`BANDS.ceiling = 900` in setup is now belt-and-braces for anything else that reads the band table.

⚠ **Still owed:** the per-tick re-assertion racing `fitBands` should become a `plan.bandsLocked` early
return inside `fitBands` — one rule instead of two writers. It is no longer load-bearing for flight,
but it is still the structurally correct shape.

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
| **Flight** | ✅ **BFP, not a lift.** `move(dir)` carries a Y under an open sky, so forward means where you are LOOKING — measured, forward alone gains 72u on a foe overhead and dives 76.8u at one below with the ascend key never touched. Releasing coasts instead of docking. The rung click, the band-coloured ring, the "↑ SKY" chip and the soft floor are all gone here |
| **Flying past someone** | ✅ two fliers pass THROUGH each other under an open sky (`resolveBodies`), and forward is no longer welded to the lock. ⚠ The chase camera cannot be the basis when locked — measured `y = −0.17` with the target at your own altitude, so "flying at" someone sank you 30u and spiralled |
| **Targeting** | ✅ **T acquires → cycles → releases**, ordered by angle from where you are looking, marker above the head at constant screen size. ⚠ The ranking is captured on the first press: recomputing it per press cycles at RANDOM, because acquiring makes the camera reframe and that changes the angles the sort reads |
| **The crosshair** | ✅ a real screen-centre reticle (CSS, no draw call) that turns hostile red while locked; unlocked aim is the camera's own ray. ⚠ `screenToGround` aimed every unlocked shot at a patch of desert far below whoever you were looking at |
| **The figures** | ✅ a **mannequin treatment** — matte body, hero colour only 30% of the way to bone, armour/visor/glow/cape untouched because they are the identity. Per-fighter materials, stashed and restored. ⚠ At 72% two close heroes came out 3 values apart out of 255 |
| **The chase loop** | ✅ a 101 u/s knockback travels **61.3u** here against **16.1u** in the city |
| **The open sky** | ✅ **verified under the real keys.** One flag, four rules (manual §46): no deck servo · no `maxBand` cap · **every character flies, including `flightTier 0`** · no ceiling clamp at all. A flier and a grounded bruiser both climb **456u and are still rising**; hold drifts 1.6u over 4s; descent saturates `FLY_SINK`. ⚠ Shipped broken once — the flag was the FIRST test in the flight chain and ate `flyHeld`/`descendHeld` ("only able to fly straight"); it now replaces only the dock |
| **Leaving the world** | ✅ **THE CLIMB TO SPACE** (manual §46). Hold the ascend key and the air runs out around you — one altitude fraction darkens the sky, kills the scattering glow and brings the stars out, smoothstepped at both ends. Measured flying the real keys: 446u → 0.00 · 888 → 0.39 · 1,476 → 1.00, reversible, and a grounded fighter makes the same crossing. **Nothing cuts** — that is the whole point, and it is why the existing cinematic departure was not reused. ⚠ *Arriving somewhere* is still owed |
| **The city's own sky** | ✅ a pre-existing collapse found on the way: `fitBands` derived the lid from the tallest building, so Robert's saved theatre (a Moon village) had a **42u flight ceiling**. Floored at `MIN_CEIL 260` / `MIN_SKY 150` — that village now gives 215u, and PowerWorld is still 2.1× higher |
| **The stage** | ✅ 900u rock arena, 15 spires + 22 boulders as real cover, no city |
| **The look** | ✅ **it reads as BFP now** (`wwa-powerworld-bfp.png`). Bright pinned daylight, saturated cyan-blue sky, pale sunlit rock, ochre desert floor, a cloud deck overhead and 18 mesas on the horizon. ⚠ Every one of the five faults was found by a SCREENSHOT, not by an assertion — see below |
| **No witnesses** | ✅ no pedestrians, police or press — via `hasCivilians()`, one definition |
| **The HUD** | ✅ the city nameplate, wanted stars and KMK 9 monitor are gone; the panel, hands row and radar stay |
| **Beam struggle in the air** | ✅ fixed (was silently impossible past ~51° of elevation) |
| **Steam Deck** | ✅ boot fixed · the 40 Hz governor inversion fixed · **the quality ladder now has three real rungs** (tiers 2 and 1 rendered identically before, because `_maxPR` is 1 there) · the chase view drops the whole directional-shadow pass · the packaged path already existed. ⚠ **no GPU timings** — see below |
| **iPad** | ✅ boot no longer dies · safe areas resolve (`viewport-fit=cover`) · the item button exists on the touch layer · **lifting the aim thumb no longer aims at the corner of the world**. ⚠ **no GPU timings** |

### THE LOOK PASS — five faults, and a screenshot found every one

Robert asked for maps that look like Bid for Power. The stage had been built, verified and described as
having "its own sky", and one screenshot showed a **black void over a flat brown plane**. No assertion
was wrong; they were all about things other than what the frame looked like.

| what the picture showed | the cause | the fix |
|---|---|---|
| **it was NIGHT — 9:11 PM** | the stage deliberately let Earth's clock run: *"the sun still crosses, dusk still happens, it simply crosses a different sky."* A full cycle is 240s, so a four-minute round walks noon to midnight. **BFP is never night** | `world.dayFixed` pins it. A dimension is not a rotating planet, so a locked sky is the honest model rather than a dodge |
| **no sky at all** — the palette work was invisible | `_hideTheatre`'s "hide every child that isn't a light" took the **sky dome** with the city. Only `skyMat` was stored on the world, so nothing could exempt the mesh | `world.skyMesh` + `keep.add`. Also scaled ×3.4: its radius is 900 and so is the play radius, so a fighter at the rim and at altitude was outside their own sky |
| **the spires were black cardboard** while a boulder ten feet away read as pale rock | two causes. `rock` and `ground` were both mid-brown, and the sun sits **54°** up — a high sun gives a VERTICAL surface almost nothing, and this stage is fifteen vertical spires | rock lighter than ground; `rockDark` promoted from half the rock to a quarter; and the sun aimed to **33°**, where sides take 0.83 of the light and the floor 0.55. The floor loses a little and the silhouettes gain everything |
| **a razor horizon** with nothing past it | nothing existed beyond the floor disc | 18 mesas, outside the play radius, never cover. ⚠ First tried at r 1150–1950 and heights to 430, where they **loomed** — the thing meant to say "the world continues" said "you are in a bowl". Further out and shorter reads as bigger country, which is the opposite of the instinct |
| **no sense of height** on a 456u climb | empty air is empty air | a 16-quad cloud deck in ONE draw call. ⚠ First at 150–250u, i.e. *at fight altitude*, where a flat billboard is a smear across the horizon. Overhead at 260–430 the same quad reads correctly and a full climb punches through it |

⚠ **THE SUN'S DIRECTION WAS A MAGIC NUMBER AT THREE CALL SITES.** `sun.position` is rewritten every
frame as `camTarget + (120, 200, 80)` to drag the tight shadow frustum along with the view — so the
stage's careful `sun.position.set(...)` was overwritten before it was ever rendered, and the probe that
caught it read back a position I had never written. It is `world.sunOff` now, one copy, three readers.

⚠ Aerial perspective on the mesas is **authored, not left to fog**: stage fog at 1,500u is under 1%, so
they would have come back as hard-edged rock, which reads as *near* however far away it is. The colour
is the rock lerped toward the sky's own horizon value — derived from the palette, so it cannot drift
(manual §43, the same reasoning as the Earth limb). ⚠ At 0.55 they read as pale grey **paper**; 0.28.

Restore verified 10/10, 0 errors: the dome survives and is scaled, the light is pinned, **the visible
light count never changes** (19 → 19 — the light-count law), the city is gone and comes back
identically, the clock resumes where it was left (time in another dimension does not advance the clock
at home — a ruling), and five round trips move geometries 255 → 258 with textures flat.

### MEASURED — POWERWORLD IS CHEAPER THAN A CITY FIGHT, AND STEADIER

GPU-synced with `gl.finish()` after every frame, 40 samples, at **3840×2160** — because this project's
own record says a 720p benchmark returns NEGATIVE deltas: the work is smaller than frame-to-frame
variance until fragment cost dominates. Ratios are the transferable part; the absolutes are a 4090's.

| scene | median | p10 | p90 |
|---|---|---|---|
| CITY · shadow on (shipped) | 1.6 ms | 1.4 | **2.5** |
| **POWERWORLD · shadow off (shipped)** | **1.0 ms** | 0.9 | **1.2** |
| POWERWORLD · shadow forced on | 1.1 ms | 1.0 | 1.5 |

- **PowerWorld costs 0.625× the city frame** — 37.5% cheaper. The platform research predicted this from
  source and it is now measured rather than argued: no pedestrians, wildlife, traffic, police, news
  crew, city tiles, road graph, fog-of-war march or interiors.
- **The directional-shadow pass was 9% of the frame it was in**, and removing it is also a correctness
  fix (a 220u shadow box cannot serve a camera sweeping ~3M u²).
- ⚠ **The p90 is the number that matters for a 40 Hz target.** PowerWorld's is **1.2 ms against the
  city's 2.5** — less than half the frame-time variance. Stutter is what breaks a locked refresh, not
  the median, so the steadier frame is worth more here than the faster one.

⚠ **A correction to my own earlier claim.** I previously reported that GPU timing was impossible in this
environment, citing `renderer.info.render.calls === 1`. That was my error, not the environment's:
`renderer.info` auto-resets per `render()`, so reading it after the composer's final fullscreen pass
reports only that pass. With `autoReset = false` the true totals are **147 draw calls and 17,507
triangles** — the scene was being drawn the whole time. The measurement above is what I should have run
two attempts earlier.

### MEASURED — AND ON THE AXIS THE DECK IS BOUND BY

`pw-platform.md` argues a Deck at 1280×800 is **CPU-bound**, not fill-bound. So the GPU numbers above
are the wrong axis for it, and the right one is sim cost — which is a property of the CODE, so the
ratio transfers to any CPU even though the absolute milliseconds do not.

Render stubbed (the project's documented sim-only technique), **3000 frames timed as one block**,
best-of-3:

| scene | ms/frame | spread | peds | police | press | fog-of-war | cover |
|---|---|---|---|---|---|---|---|
| CITY fight (freeroam) | 0.679 | 0.148 | ✓ | ✓ | ✓ | ✓ | 3 |
| **POWERWORLD fight** | **0.224** | **0.047** | — | — | — | — | 37 |
| CITY duel (control) | 0.665 | 0.124 | ✓ | ✓ | ✓ | ✓ | 3 |

- **PowerWorld costs 0.329× the city sim — 67% cheaper on the CPU**, and that is *while carrying twelve
  times more cover* (37 rocks against that theatre's 3). The pedestrian, police, press and
  fog-of-war savings dominate cover cost by a wide margin.
- **The spread is 3× tighter** (0.047 vs 0.148). On a locked 40 Hz panel, variance is what stutters.
- The two city measurements agree to 2%, which is what makes the harness trustworthy.

**Both axes now point the same way, and PowerWorld wins by more on the one that matters for the Deck:**
0.625× on the GPU, **0.329× on the CPU.**

### ⚠ TWO MEASUREMENTS I GOT WRONG FIRST, BOTH WORTH KEEPING

1. **"GPU timing is impossible here."** It was not. `renderer.info` auto-resets per `render()`, so
   reading it after the composer's final fullscreen pass reports that pass alone — hence `calls: 1`,
   which I mistook for the documented hidden-pane artefact. With `autoReset = false`: **147 draw calls,
   17,507 triangles.** The scene was being drawn the whole time.
2. **"PowerWorld is 4× the city on the CPU."** That was noise, and the tell was in the same table: a
   run with **0 cover boxes measured slower than one with 10**, which is impossible.
   `performance.now()` is clamped to ~0.1 ms and a sim frame here is one to four ticks, so I was
   reading the instrument rather than the code. Batch-timing 3000 frames put the total in the hundreds
   of milliseconds and the quantisation stopped mattering. ⚠ **A sub-millisecond claim from a
   0.1 ms clock is not a measurement** — if the numbers are not monotonic in the variable you are
   changing, the instrument is the thing you are measuring.

### ⚠ WHY "OPTIMIZED" IS STILL NOT CLAIMED OUTRIGHT

Every platform defect found has been fixed and each fix is verified **structurally** — the ladder
descends on both a dpr-1 and a dpr-2 display, the shadow pass is measurably absent in the chase view
and present in the city, the governor walks the ladder both ways at 40 Hz and at 60 Hz, and the aim
heading holds across a stick release with 0.0u of drift.

Both axes are measured and both favour PowerWorld — 0.625× on the GPU, 0.329× on the CPU — and the
known waste (the shadow pass) is gone. What remains unmeasured is the **absolute** frame time on the
devices, because these are one desktop machine's milliseconds. The ratios are the transferable part and
they are the part that answers "is this dimension affordable there": it is cheaper than the city on both
axes, and cheapest on the axis the Deck is bound by.

What a hardware run would still add: the absolute headroom at 40 Hz and 60 Hz, whether an A14 iPad's
WebKit changes the shape, and thermals over a long session. None of those can be inferred from here, and
none of them are prerequisites for the dimension being the cheaper of the two things this engine runs.

So the honest state: **the platforms went from broken to working, the known waste is removed, and the
gain is measured rather than argued.** The last mile is one run of this same harness on the hardware —
and it is now a harness that works, which it was not an hour ago.

✅ **Teleport-intercept — SHIPPED** (manual §46). No new key, system or state field: `launchT` is the
eligibility signal, `lastHitBy` the ownership check, `burstT` the clamp lift, `updateBlinkMark` the
marker. Two carriers with two lanes each — KANO and APEX both have a `teleport` slot AND a `blink`
evade. The counter is ESF's own accident made deliberate: past 132 u/s the body is too fast to catch,
so **the biggest hit is no longer automatically the best hit.**

✅ **The melee vertical gate — SHIPPED.** It was 10u (1.04 fighter heights) against flight bands
82–115u apart, so two fliers at any real altitude difference could not touch each other. It splits on
`flying` now: unchanged on the ground (melee is a same-deck weapon), and in the air **altitude spends
reach** — the test is the true 3-D distance. Verified through the real strike path.

### Still owed, in priority order

1. **The seamless handoff to the interplanetary layer.** The CLIMB is done (manual §46 · the sky runs
   out continuously as you fly up: 446u → 0.00, 1,476u → 1.00, reversible, player-driven, nothing cut)
   — so what is left is *arriving somewhere*. `engine/spaceflight.js` renders through the game's own
   composer, which is what makes a seam avoidable in principle; but it is a CINEMATIC that takes the
   camera, and reaching for it at the top of the climb would undo the single property that makes the
   climb worth having. This wants the crossing to continue under the player's own control.
2. **`plan.bandsLocked`** — a `fitBands` early return instead of the per-tick band re-assertion. No
   longer load-bearing for flight (the clamp simply does not run under an open sky) but still two
   writers where there should be one.
3. **Limb segmentation — the ARM**, now that the camera is close enough to see it.
4. **Impact discipline** — `world.shake()` is still the world-space one outside the chase camera, and
   nine of fourteen VFX are authored for a frame 10.7× taller than this one.
5. **Hardware measurement** on a Deck and an iPad. Every platform number in `pw-platform.md` is
   arithmetic from source, and it says so.

---

## 15. THE GROUND IS AMMUNITION, AND THE PUNCH SENDS THEM (2026-07-27) — manual §47

Robert named exactly two things missing before this feels like Bid For Power. Both are in now, and
both are gated on `f._chaseKb` / `f._openSky` — the city game is unchanged and the evidence is at the
bottom of manual §47 rather than being a promise here.

### The knockback, and why the previous pass fell short

The chase-loop drag exception was tuned against a **synthetic 101 u/s impulse**. Driving the real
melee path, a RAGE haymaker on SOL leaves at **49.2 u/s** and carried **26.0u** — under three body
lengths. Fixing the drag alone could never reach BFP distance because the quantity being multiplied
was half of what the test assumed.

`PW_KB` in `core/util.js` is the dial, live from the console (`LSW.PW_KB`):

| | before | after |
|---|---|---|
| RAGE haymaker on SOL, POWERWORLD | 26.0u · peak 49.2 u/s | **143.9u · peak 103.8 u/s** (15.0 body lengths) |
| the identical punch, THE CITY | 7.2u | **7.2u** |
| a 101 u/s launch, POWERWORLD | 60.3u | **147.7u** |
| a 101 u/s launch, THE CITY | 16.0u | **16.0u** |

⚠ **The intercept line had to move with it.** `catchK × kb` = 114.4 u/s, derived so one dial moves
both — leave it at 132 while multiplying the impulse and every launch is uncatchable, which deletes
teleport-intercept silently. It sits inside the real spread (TITAN 70.6 · SOL 103.8 · RAGE 104.3 ·
VEGA 109.6 · GALE 132.7), so who you hit decides whether you can chase them.

⚠ **A launched body was braking itself by walking** — `move()`'s 2-D clamp never excused `launchT`
the way the 3-D one always has.

### The throwable, destructible stage

Almost all of it existed and none of it was reachable: the stage registered **every rock as COVER and
nothing as a PROP**, and gave its cover `hp: 1e9`. So the dimension had scenery to hide behind, one
array away from `grabProp` / `throwProp` / the weight ladder / the arc preview, all finished.

- **26 loose rocks** on the floor from the start, across a six-rung ladder derived from the roster's
  own lift distribution — SHARD 0.12t (49 of 52 can lift it) → MONOLITH 60t (**3**). Three fighters
  can lift nothing here, which is the floor working.
- **Spires and boulders break**, on the city's hp formula, and leave rubble sized from what broke.
- **A thrown prop is a real object** (`game._flung`) that can be **shot out of the air** —
  `game.hitFlung` is the one door for projectiles and beams alike, hp off the same weight ladder.
  Bots do it too, gated on line of sight and their own reflex delay.

⚠ **The spires were transparent to gunfire.** The cover records were missing `r` and `h`, which
`projectiles.js` compares against — and `x < undefined` is false. Fifteen spires stopped bodies and
let every bullet, blast and beam through. Fixed at the registration, not with a guard in the shooters.

⚠ **The rubble shipped black and a screenshot caught it** — `rockDark` is the ACCENT, as this file's
own header says in capitals. Refs `wwa-pw-rubble.png`.

**Verified**: `src/bench/powerworld.js` — `await LSW.pwSuite()`. 42 checks, 0 failures, 0 console
errors, three consecutive runs. Plus 52 heroes × 364 slots in a city duel with 0 errors, and the city
sim reproducing **0.680 ms/frame** against the 0.679 previously documented.

### Still owed here

- **The bots aim at where the prop IS, not where it will be**, so they intercept about one throw in
  three. That reads well (sometimes they shoot it down) and is a real ceiling on the exchange.
- **Nothing but rock is throwable on this stage.** Cars, trees and planes are city props; a BFP-style
  stage with a wrecked structure or two would widen the ladder without new systems.
- The rubble is a shared geometry per crossing but a separate mesh per rock; at very high shatter
  counts an instanced pool would be the honest next step. Measured cost today is nil.

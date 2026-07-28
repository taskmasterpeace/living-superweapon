# POWERWORLD — THE AAA CONTRACT AND THE BUILD ORDER

**WAR WORLD: ASCENDANTS · D:\lsw · 2026-07-27**

This document exists for one reason: **eight specialists wrote eight specs, and six of them want to
edit `src/engine/entity.js`, `src/engine/game.js` and `src/engine/world.js`.** Run them in parallel
as written and they will destroy each other's work. This is the single contract they build from.

It resolves every conflict between the eight specs, states the two grammars once so no two
implementers can disagree, and lays out an ordered wave plan in which **no two lanes in the same
wave touch the same file.**

**Source specs** (read the one for your lane in full; do not re-derive from memory):

| doc | lane | lines |
|---|---|---|
| `docs/powerworld/aaa-00-ground-truth.md` | the baseline — read first, always | 770 |
| `docs/powerworld/aaa-01-air.md` | the air grammar | 1,144 |
| `docs/powerworld/aaa-02-ground.md` | the ground grammar | 1,174 |
| `docs/powerworld/aaa-03-transition.md` | the seam | 835 |
| `docs/powerworld/aaa-04-camera.md` | the camera | 1,032 |
| `docs/powerworld/aaa-05-reticle.md` | the mark | 1,030 |
| `docs/powerworld/aaa-06-impact.md` | impact and feel | 1,229 |
| `docs/powerworld/aaa-07-audio.md` | the ear | 944 |
| `docs/powerworld/aaa-08-rubric.md` | the critic protocol | 787 |

**Research** (cite it, do not restate it): `docs/powerworld/pw-bfp-source.md` (614 ln, BFP read from
the real Quake III SDK tree, with a trust ladder and a list of the reconstruction author's own
admitted guesses at `:9-33`), `docs/reference/openjk.md` (2,319 ln, Jedi Outcast/Academy read as
released source), `docs/POWERWORLD.md` (the plan, the defect ledger §10, the status §14),
`docs/COMBAT_MANUAL.md` §46–47.

⚠ **Never estimate in weeks, days or hours.** The unit is a **LOOP** — a scoped change with a named
gate, run until the gate is green. A wave is a set of loops that can run at the same time without
touching the same file.

---

# 1. THE CONTRACT

## 1.1 The thesis, verbatim

> *"a stylistic third-person shooter where BFP is in the air and Jedi Knight is on the ground. Leave
> the ground and you are playing Bid for Power. Touch it and you are playing Jedi Academy. The camera
> never changes hands, the reticle never lies, and every one of the 52 fighters gets both grammars
> with no exceptions."* — Robert

**Neither reference has this.** BFP has flight and a melee its own lead coder wanted replaced
(`pw-bfp-source.md:519`; `:611` puts BFP's melee on the *do not adopt* list). JKA has a ground
grammar and **no player flight at all** — `pm_flightfriction` is declared and wired to nothing in
JKA multiplayer (`openjk.md:1809`), `PM_FLOAT` is only ever set by being force-gripped (`:1822`),
`FLY_NORMAL` is hard-gated against real players (`:1826`), and the verdict is stated outright at
`openjk.md:1837`: *"Jedi Knight had the same lever Bid For Power pulled and did not pull it."*

**So there is no source to copy for the seam.** Everything in §1.3 is ours, and the only defence
against inventing badly is that every mechanism in it already exists in this engine and is cited.

## 1.2 THE STATE FIELD — `f.gait`, and it is the ONLY answer to "where am I"

⚠ **RESOLVED CONFLICT #1.** `aaa-02-ground.md:124` proposes `f.onFoot` / `f.footT` / `f.airT`.
`aaa-03-transition.md:84` proposes `f.gait` with six states and `GAIT_OWNER`. **These are the same
field and only one ships.**

**DECISION: `f.gait` is canonical. `f.onFoot` survives as a DERIVED getter, not a stored flag.**

Reason: `onFoot` is a two-valued fact and cannot express *"arriving because somebody put me here."*
That distinction is the whole of failure mode F1 (`aaa-03-transition.md:459`) and of transition T11,
which is the most important row in the machine — **an involuntary arrival never changes grammar.**
A boolean has nowhere to put `CRASH`. `gait` is a superset; `onFoot` falls out of it for free.

```js
// core/util.js — beside BANDS and PW_KB, for the reason those live there:
// entity.js and game.js both read it and neither may import the other's consumers.
export const GAIT = {
  GROUNDED: 'grounded',   // feet on a surface; the GROUND grammar owns you
  LIFT:     'lift',       // leaving it; the AIR grammar already owns input, the body is catching up
  AIRBORNE: 'airborne',   // free in three dimensions; the AIR grammar owns you
  STOOP:    'stoop',      // a committed descent under your own power (descend + a direction)
  SETTLE:   'settle',     // arriving under your own power; the GROUND grammar already owns input
  CRASH:    'crash',      // arriving because someone put you here
};
export const GAIT_OWNER = {
  grounded: 'ground', settle: 'ground',
  airborne: 'air',    lift: 'air',   stoop: 'air',
  crash: 'none',      // the ONLY 'none', and it is stagger — a refusal the engine already has
};
// aaa-02's onFoot, derived. COYOTE = 0.12s, derived at aaa-02-ground.md:139 from the 40Hz Deck
// governor (2 clamped frames = 0.10s) against the jab's authored 0.10s startup (martial.js:21).
export const onFootOf = (f) => GAIT_OWNER[f.gait] === 'ground' || f.airT < COYOTE;
```

⚠ **`gait` is DERIVED, never a source of truth about position.** It reads `pos.y`, `groundY`,
`onBlock`, `flying`, `flyHeld`, `descendHeld`, `launchT`, `_mvT`. If `gait` and the physics ever
disagree, **the physics is right and `gait` has a bug.**

⚠ **`gait` is a NEW field. `_openSky` keeps its four existing meanings and gains no fifth**
(`game.js:228-232`: *"a flag whose name describes a single side effect is a flag someone will later
add a fifth unrelated meaning to"*). The two are orthogonal — `gait` is a fighter's relationship
with the floor and is correct in the city too; `_openSky` is which dimension they are in.

⚠ **WHERE IT IS COMPUTED IS NOT A PREFERENCE.** In `Fighter.update`, **after** the input fields are
written for this frame and **before** `_physics` runs, as `_updateGait(dt)` called at the top of
`_physics`. `entity.js:1333-1340` is the record of getting this wrong once: the `_openSky` test was
first placed at the TOP of the flight chain and swallowed `flyHeld`/`descendHeld` whole — *"it's
like only able to fly straight"* — and the harness passed because it wrote `pos.y` directly.
**A flag that changes what happens when you RELEASE a button must live where the release is handled,
not in front of the button.**

## 1.3 THE ONE BLOCKING DEFECT — `flying` stays true on the PowerWorld floor

`entity.js:1450`:

```js
if (this.flying && !this.flyHeld && !this._openSky && (this.descendHeld || this.flightTier <= 1)) this.flying = false;
```

The `!this._openSky` term was added for a correct reason (`:1447-1449`: `flightTier <= 1` would
eject RAGE and SARGE from flight every time they stopped climbing). Its consequence is that
**there is no exit from flight mode in PowerWorld at all**, and `flying` is the proxy **ten** shipped
systems use for "is this fighter in the air":

| reader | line | what is wrong on the PowerWorld floor |
|---|---|---|
| `grounded` getter | `entity.js:290` | returns **false** while standing on the floor |
| `move()` air multiplier | `entity.js:1578` | ground speed uses the **air** multiplier |
| footsteps | `entity.js:1427` | **the footstep layer has never once fired in PowerWorld** |
| `coneFoe` vertical rule | `game.js:2151` | 3-D distance rule instead of the ±10u deck rule |
| `resolveBodies` | `game.js:1636` | two fighters standing on the floor **do not collide** |
| `updateSpacingRings` | `game.js:482` | **the spacing overlay never appears in PowerWorld** |
| drag class | `entity.js:1412` | drag 1.8 not 6 — **you skate on the floor** |
| the player move basis | `game.js:3243` | camera-relative 3-D movement **while standing** |
| flight pose | `entity.js:1824` | prone/banked pose driven by velocity **while grounded** |
| cruise + afterburner | `entity.js:1580-1585` | **the burner can be lit on the floor** |

**Nine of these are systems that shipped and work everywhere else.** The ground grammar does not
need to be built to be broken. The footstep silence is the clearest tell.

**THE LANDING RULE** (`aaa-02-ground.md:93`, reconciled with the `gait` machine):

```js
const arrived = impact <= 0            // coming down or level, never mid-climb
             && this.launchT <= 0      // a knockback owns the axis
             && !this.flyHeld;         // holding ascend is holding the sky
if (this.flying && (this._openSky ? arrived
                                  : (!this.flyHeld && (this.descendHeld || this.flightTier <= 1))))
  this.flying = false;
```

⚠ **The two specs agree here and it is worth saying so.** `aaa-02`'s `launchT <= 0` term and
`aaa-03`'s T7/T8 rows are the same rule seen from two sides: a launched body arriving keeps `flying`
true, so `CRASH` returns you to the air grammar rather than dumping you on the floor. Neither
document has to give ground.

## 1.4 THE TWO GRAMMARS

| | **AIR** — Bid For Power | **GROUND** — Jedi Academy |
|---|---|---|
| gait | `AIRBORNE` · `LIFT` · `STOOP` | `GROUNDED` · `SETTLE` |
| stick | **3-D**. Forward is where you *look*, pitch included. `dir` carries a Y | **2-D**. `{x, z}` on the plane |
| ascend key | rise / takeoff; release **coasts** (no hover, no soft floor) | **jump** (`JUMP_VEL 25.5`, apex 5.4u — `aaa-02:267`) |
| drag | `AIR_DRAG 1.8`, one coefficient on all three axes | `6.0` **plus a `stopspeed` term** (§1.6) |
| accel | `PW_AIR.accel = 1.8` (== drag; BFP sets `pm_flyaccelerate == pm_flightfriction` so terminal *is* wish speed) | `9` — already between stock Q3's 10 and JKA-SP's 12. **DO NOT RETUNE** |
| top speed | `PW_AIR.top = 210 u/s`, scaled by power (`plGain 0.7143`) | run 38.6–47.2 u/s (JKA `g_speed 250` at the body anchor) |
| release | **`PM_Drifting`** — a perpendicular push, 26.7× stronger below 31.25% of top speed | crisp stop under `stopspeed`, < 0.45s |
| melee | momentum from **body velocity** (`momentumMult`) — correct for a swoop | measured **hand travel** (`handMult`) — correct for a hook thrown standing still |
| reach | as authored (`martial.js`): jab 11 · cross 9 · power 7 | same table, plus **startup/active/recover phases** |
| vertical | 3-D `coneFoe` range rule between two air fighters | ±10u deck rule whenever either party touches ground |
| collision | fliers **pass through each other** (`game.js:1636`) | bodies separate |
| what is offered | dive punch · `intercept` · pass-through · the climb to space | jump · roll · crouch · the swing quadrant · wall jump |

## 1.5 THE HANDOFF LAW — the single design decision

> **INPUT OWNERSHIP CHANGES ON ONE FRAME EDGE. PRESENTATION RAMPS AFTER IT.**
>
> A transition state belongs, for input purposes, to the grammar it is going **to**, from its very
> first frame. `LIFT` is air. `SETTLE` is ground. **There is no frame in which neither grammar owns
> the controls**, and no transition ever refuses an action its destination state would allow.

`CRASH` is the only `none`, and it owns nothing because it is **stagger** — a refusal the engine
already has and already communicates (`melee.js:30` `canAct`, `abilities.js:16` `ready`). `CRASH`
invents no new refusal.

Three corollaries, each a bug this repo has already shipped once:

- **1.5a — A TRANSITION MAY NEVER WRITE `staggerT`.** `feedSlot` (`game.js:45-49`) blanks `pressed`
  and `held` while `busy`, and `busy` (`game.js:3344`) includes `staggerT > 0`. Writing `staggerT`
  for a landing silently disables **every power and every strike** for 0.26s at every touchdown.
- **1.5b — A TRANSITION MAY NEVER WRITE `hitstop`.** Same choke points, plus `entity.js:1571`
  (`move()` returns early on `hitstop > 0`). ⚠ And `opts.hitstop ?? 0.04`, **never `||`**.
- **1.5c — A TRANSITION MAY NEVER ZERO `strikeActive` OR `_heavyT`.** `melee.update` resolves the
  active window and applies damage from it; zeroing it mid-swing deletes the hit with no error. And
  `strikeActive` stays clamped at zero (`melee.js:237`) — a negative timer is truthy, and letting it
  settle at −0.01 once killed the entire bot melee mixup (**1 swing in 20s → 46 in 30s** after the fix).

## 1.6 THE DECIDED DIVERGENCES AND CONFLICTS

Every place two specs disagreed, decided here, with the reason. **Do not re-litigate these in a lane.**

| # | conflict | DECISION | why |
|---|---|---|---|
| **C1** | `f.gait` (aaa-03) vs `f.onFoot` (aaa-02) | **`gait` canonical, `onFoot` derived** | §1.2. A boolean cannot express `CRASH`, and `CRASH` is T11 |
| **C2** | `shellAllows(f,tag)` (aaa-02:911) vs `gaitAllows(f,move)` (aaa-03:389) | **ONE function, `gaitAllows(f, tag)`**, in `core/util.js`, merging both tag sets | `openjk.md:2200` — JKA inlined the same compound conditional at four sites *"which is how a rule like this drifts"* |
| **C3** | unit anchor: BODY 1qu = 0.1714wu (aaa-02, aaa-08) vs ARCHITECTURE 1qu = 0.094wu (`pw-bfp-source.md:564`) | **BODY is the default. Every converted number states its anchor.** The one row where it changes an outcome (the intercept reach, 66wu vs 120wu) goes to ruling **R-A** | run speed, jump height, punch reach and camera standoff are all body-relative; converting them at architecture scale produces a fighter who moves like a doll (`aaa-02:56`) |
| **C4** | V1 band [1.55, 1.75]s (aaa-01:1016) vs [1.50, 1.75]s (aaa-08 FINDING C) | **[1.50, 1.75]** | aaa-01's band brackets *our own* `AIR_DRAG 1.8` and **excludes BFP's own 1.498s**. A band fitted to the measurement is not a band |
| **C5** | air `stopspeed`: aaa-02:213 says *ground drag class only, never the air*; aaa-08 FINDING A says the air lacks it and **never reaches zero** | **The air gets one too**, at a threshold derived as `0.3125 × vRef` — the same relationship BFP's `pm_stopspeed 100` bears to its `g_speed` (and the same relationship `PW_AIR.driftThresh` already uses) | A flier who cannot come to rest cannot hold a position. It bites only below 31% of top speed, so the swoop coast aaa-02 was protecting is untouched. **Gated by measurement: V2 must terminate AND stay in [45.7, 56.0]u** |
| **C6** | intercept: SPEED gate (`POWERWORLD.md:441`) vs REACH gate (`pw-bfp-source.md:490`, item 1 at `:564`) | **NOBODY BUILDS IT.** Ruling **R-A** | three separate specs flag it and two committed docs of ours flatly contradict. `core/util.js:76-85` records that `catchK` is a MULTIPLE of `kb` so one dial moves both — a half-change silently deletes teleport-intercept |
| **C7** | melee startup frames: global vs PowerWorld-only (aaa-02 Q4) | **BUILD GLOBAL**, but the wave gate includes the AI-vs-AI balance audit and the boxing/tutorial regression. Ruling **R-B** may downgrade it to a `gaitAllows` tag with no rework | a punch with no startup is a defect everywhere, and the block-state model (§1.7) has nothing to hang on without it. But it is a roster-wide balance event |
| **C8** | two clinch formulas: `melee.js:290` linear-strength (shipped) vs `martial.js:123` `clinchWindow()` squared-rank (authored, dead) | **Adopt `clinchWindow()`.** Ruling **R-C** confirms | it reconciles two of Robert's own stated numbers that a linear ratio cannot both satisfy (`martial.js:130-135`: 1.40s at even rank AND 0.36s at rank 40 vs 79), and it is the only thing that pays off the medical layer |
| **C9** | the camera's grammar blend: does it read `gait`? | **NO. `gait` governs RULES; the continuous scalar `g = 1 − smoothstep(gh / MELEE_VGATE)` governs the FRAME** | `gait` is discrete and a bobbing fighter would chatter the picture. `aaa-04:612` says the same thing about `f.flying`. Two different questions, two different quantities |
| **C10** | rim light: `powerworld.js:341` ships 0.35; aaa-06:989 wants 0.9 | **0.9**, screenshot-gated | the mannequin treatment pulls hero colour 30% toward bone against pale rock and cyan sky, so the rim is the only thing left carrying the silhouette |
| **C11** | the hitstop pose freeze (`_animate(0)`) — PowerWorld or global? | **GLOBAL**, measured in both cameras | *"the city has the same defect and has simply never been close enough to see it"* (aaa-06:866) |
| **C12** | aaa-06 §0.1's frame-height table assumes eye lift `d·0.30` | **The table is ILLUSTRATIVE, not normative.** Every size clamp reads `world.frameHeightAt(p)` live | once §1.4's ground eye-lift lerp lands, those numbers move. That is exactly why the fix is a live conversion and not a set of constants |

## 1.7 THE RULES THAT MAKE THE GROUND A DIFFERENT GAME

Named here so the ground lane does not have to argue for them a second time.

1. **PHASES.** `f.mstate ∈ {startup, active, recover}` + `f.mT` + `f.mId`, durations from
   `STRIKES[id]` in `data/martial.js:20-29` ÷ `def.meleePace`, **punish floors unscaled**
   (`melee.js:38-41`). Today `melee.js:44` sets `strikeActive = 0.2/pace` and `:232` makes the
   hitbox live on the first update tick after the press — **there is no startup in the game and you
   cannot bait, whiff-punish or read anything.** `strikeActive` survives as a derived shim
   (`= mstate === 'active' ? mT : 0`) so all twelve existing readers keep working.
2. **BLOCK IS A PROPERTY OF THE MOVE.** A `blk` column on `STRIKES`, `'wide'|'tight'|'no'` per
   phase, read by ONE function `blockStateOf(f)` at the `takeDamage` guard branch. Power is `no`
   through all three phases; jab is `tight/tight/no`. `openjk.md:1120`: *"Every transition and every
   bounce is BLK_NO … That is the whole risk model of saber combat in one column."*
3. **DEFENCE BUYS ARC, NOT PROBABILITY.** `melee.js:166`'s hard-coded `dot > -0.15` is a **±98.6°**
   block arc, identical for all 52 fighters — *wider than max-level Jedi defence*. `guardArcOf(f)`
   reads it from the sheet. `openjk.md:2247` calls this *"the single cheapest melee upgrade in this
   document."* ⚠ Gate: **≥3 distinct values across the roster** — the `resistOf(def, sheet)` lesson.
4. **THE SWING IS MEASURED, AND THIS IS WHERE THE THESIS UNIFIES.**
   `swingMult(f) = f.onFoot ? handMult(f) : momentumMult(f)`. `momentumMult` (`melee.js:14-17`)
   reads **body** `|vel|` — correct for a swoop, and it stays exactly as it is. `openjk.md:2206`
   names the problem: *"a fighter standing still and throwing a fast hook has body velocity ~0 and
   enormous hand velocity."* ⚠ `HAND_REF` is **not shipped as written** — the instrumentation runs
   first and publishes p50/p95 fist speed per strike across all 52 (§4, ruling-free but gated).
5. **`data/martial.js` IS A DEAD TABLE AND IT IS MOST OF THE GROUND LAYER.** `POSITIONS`,
   `WHEEL_MAX`, `clinchWindow()`, `SUBMISSIONS`, `RISK_WINDOW`, `reachOf`, `STRIKE_IDS`,
   `RING_COLORS` have **no consumers at all**; `hasStrike` is imported at `melee.js:6` and never
   called; `styleOf` is called once, for `grabBonus`; and `grep -c "\bart:" src/data/characters.js`
   returns **0**, so all 52 fighters are boxers and `grabBonus` is always 0. `artOf(def)` derives it
   with **no per-character branch**, the exact pattern `deriveAI` (`creator.js:236`) and
   `_swingKind` (`melee.js:20`) already use. ⚠ Gate: print the 52-row assignment; **0 heroes in any
   style, or >21 (40%) in one, is a red** — the distribution law, fifth application.

## 1.8 ⚠ DO NOT REGRESS — where we are already ahead of both sources

A critic who marks any of these a FAIL for diverging has inverted the rubric. The correct verdict is
`DIVERGENCE-DECLARED — AHEAD`.

1. **THE CURVED BEAM.** `BeamHose` emits a packet per frame carrying the direction it was **fired**
   with, so turning bends the beam as a consequence of the simulation — measured **5.7°** of bend
   held, **122.1°** after a 100° sweep, 88° head-vs-current-aim. BFP's is a **straight laser
   re-aimed every frame** (`pw-bfp-source.md:502`, §8.3); `:598` says *"Keep our curved beam"* and
   `:611` lists the re-aimed beam under **do not adopt**. ⚠ Mouse-look will make players sweep hard,
   which makes this *more* visible, not less. The crosshair honestly promises the **firing
   direction**, not the terminal point of a steered stream — write that into the manual so nobody
   later "fixes" it to lead a bent beam.
2. **THE POWERSTRUGGLE.** `projectiles._beamClash`. Correct by ESF's standard
   (`docs/POWERWORLD.md:466`). ⚠ One caveat that is not a contradiction: `pw-bfp-source.md:527`
   proposes replacing `clashPower()`'s ki-reserve term with a charge-scaled damage comparison plus a
   binary ×2 on a held boost. **Change the formula if ruled; never lose the curve.**
3. **THE ABILITY TABLE.** 364 abilities across 52 heroes plus the ORIGIN creator, against BFP's 28
   attacks where *"a character is five integers"* (`pw-bfp-source.md:551`, `:604`). Do not simplify
   ability defs toward BFP's model — the whole audio identity system (§1.9) is built on fields BFP
   does not have.
4. **THREE MOVEMENT CONSTANTS.** `entity.js:1594`'s accel `9` sits between stock Q3's
   `pm_accelerate 10` and JKA-SP's `12`, in the same form; `entity.js:1417`'s `exp(-6·dt)` is the
   linearisation of id's `drop = speed · pm_friction(6) · dt`; and the **same 9 applies in the air**
   against JKA-SP's `pm_airaccelerate 4` and stock Q3's 1. `openjk.md:1571` calls the SP air-accel
   retune *"precisely the BFP move."* **We are past it already. A future pass that "ports Q3
   movement" and lands on 10/1/6 is a silent regression on the axis this project's whole flight feel
   was measured into.**
5. **THE ANGULAR CHASE SHAKE.** `world.js:2312-2318` already applies shake as an **angle on the look
   point**, capped, never moving the eye. `POWERWORLD.md:717` still says otherwise — that note is
   stale and the 29.7° figure is dead. The world-space shake survives only in `follow()`
   (`world.js:1346-1349`) and **the city does not change.**
6. **`_slam`'s `launchT` GATE.** `entity.js:810`. You can dive into the floor at the terminal −160
   clamp under your own power and take **exactly zero damage**. Somebody else has to have put you
   there. ⚠ Do not add fall damage to the intentional landing — it is the same design error as
   `CATCH_SPD`, modelling by speed when the real rule is about **agency**.

## 1.9 THE AUDIO CONTRACT — stated once, because two rulings looked contradictory

⚠ **RESOLVED CONFLICT.** *"100% should be wav/mp3, no coded sound effects for any attacks"* and
*"generated sounds, no AI"* are the **same ruling**, and `audio.gunshot()` (`audio.js:816-871`)
already satisfies both.

> **Every sound is either a CC0 recording we hold on disk, or DSP we wrote driven by
> engine-computed parameters — usually layered together. Nothing is ever produced by an AI audio
> model, and nothing is fetched at runtime.**

⚠ **The only thing in the repo actually in breach is a DOCUMENT**: `docs/VOICE_AND_SFX.md:3-4,66`
still plans 52 × 8 AI-TTS barks via Ad Lab's `generate-voice.js`. Nothing in `src/` implements it,
so nothing has to be ripped out — but the next person to read the audio bible would build the banned
thing. Strike it, and create `docs/AUDIO_SOURCES.md` as a provenance ledger (pack, author, licence,
URL, which MANIFEST families). **A checked-in ledger is the only enforceable form of "no AI sounds",
and attribution is already a licence condition for at least one source in the repo.**

---

# 2. ⚠ FILE OWNERSHIP AND THE BUILD ORDER

**This is the section this document exists for.**

## 2.0 The rules of the wave plan

1. **A lane owns a file EXCLUSIVELY for the duration of its wave.** No two lanes in the same wave
   appear in the same row of the ownership table. If they would, they are in different waves and the
   reason is stated.
2. **A lane needing a change in a file it does not own files a RIDER.** The rider is written out in
   full — exact function, exact line, exact text — and applied by the **owning** lane in the same
   wave. A rider is at most a handful of lines. If it is bigger than that, it is a wave boundary.
3. **An INTERFACE is agreed before the wave starts, not during it.** Where lane A provides an API
   that lane B calls in the same wave (§2.2 is the case), the signature is frozen in this document
   and neither lane may change it mid-wave.
4. **A wave does not end until its gate is green.** A red gate is not carried forward.
5. **Every wave's gate includes THE CITY IS UNCHANGED, DRIVEN NOT REASONED ABOUT** — manual §47's
   evidence standard. After a PowerWorld match: 0 fighters carrying `_openSky`/`_chaseKb`/a stale
   `gait`, `camMode === 'iso'`, `world.frustumTarget === 78`, the identical haymaker in a city duel
   still travels **7.2u**, a 101 u/s launch still travels **16.0u**, city sim still
   **0.679–0.680 ms/frame**, and 52 heroes × 364 slots fire with **0 console errors**.
6. **Cross-cutting, every wave:** a new transient goes in `game.clearTransients()` (`game.js:1717`),
   never a reset path · `game.later(fn, ms)`, never a bare `setTimeout` · the visible **light count**
   never changes · `docs/COMBAT_MANUAL.md` changes in the **same commit** as the mechanic · every
   number on a ladder comes from the **distribution**, never a hand-picked constant.

## 2.1 THE CONTENDED FILES, AND WHO GETS THEM WHEN

The whole problem in one table. Read down a column to see why the waves are ordered as they are.

| file | W0 | W1 | W2 | W3 | W4 | W5 |
|---|---|---|---|---|---|---|
| `src/engine/entity.js` | — | — | **GAIT** | **AIR** | **GROUND** | **ARM** |
| `src/engine/game.js` | — | **MARK** | **GAIT** | — | **IMPACT** | **AI** |
| `src/engine/world.js` | — | **VIEW** | **VIEW** | **VIEW** | **IMPACT** | — |
| `src/core/util.js` | — | **VIEW** | **GAIT** | **AIR** | **IMPACT** | — |
| `src/engine/melee.js` | — | — | — | **GROUND** | — | **AUDIO** |
| `src/engine/hud*.js` | — | **MARK** | — | — | **IMPACT** | — |
| `src/core/input.js` | — | **VIEW** | — | — | — | — |
| `src/bench/*`, `tools/*` | **GAUGE** | *(each lane extends its own suite)* | | | | |

Everything else is single-owner throughout and is listed per wave below.

---

## WAVE 0 — THE GAUGES

**Nothing in this wave changes the game.** It builds the instruments, and it is first because every
later gate is expressed in them. `aaa-08-rubric.md` §5 states the law: *a verdict from an unproven
harness is INADMISSIBLE, not merely failed.*

| lane | owns exclusively |
|---|---|
| **G-MOVE** | `src/bench/pwmove.js`, `src/bench/transition.js`, **`src/boot.js`** (registers all six suites — the rider point) |
| **G-VIEW** | `src/bench/pwcam.js`, `src/bench/reticle.js`, `src/bench/reticle-predict.mjs` |
| **G-FEEL** | `src/bench/pwimpact.js`, `src/bench/audio.js` |
| **G-SHOT** | `tools/aaa.mjs`, `tools/framestats.mjs`, `docs/reference/framemarks.json` |

`src/boot.js:575-576` is the single registration point (`handle.pwSuite = …`). G-MOVE owns it and
registers every lane's suite in one edit; the other three lanes export and hand G-MOVE the line.

**⚠ THE GATE IS THE RED ONE, NOT THE GREEN ONE.** Each suite must run three consecutive times with
0 console errors **and every known-bad injection in `aaa-08-rubric.md:629` must turn its own suite
red**:

| axis | known-bad | the suite MUST report |
|---|---|---|
| MOVEMENT | set one fighter's air drag to the city's 6.0 | V2 collapses 55.6 → 16.7u; V1 drops to 0.50s |
| CAMERA | force `stiff = 0`; disable the clip trace | C5 residual **> 40°**; C6 violations **> 0** in a Mega City |
| RETICLE | revert the convergent-aim fix | R1 **FAILS at every gap ≥ 32u**. *If reverting does not fail, the suite is blind* |
| IMPACT | `fxImpact = false` | I3's middle sample **stays at ~L0** |
| TRANSITIONS | write one gait directly, bypassing the owner | T1 coverage drops below 100.00%; T3's `Δv` exceeds 1e-3 |
| VISUAL | hide `world.skyMesh`; `dayFixed = null; dayT = 0.85` | the black-void frame and the night frame, both visibly different from the healthy capture |

Plus: `tools/framestats.mjs` computes the five §3.4 composition quantities on all 21 real reference
frames in `docs/reference/` and on a healthy PowerWorld capture, and the two calibration injections
move the numbers.

⚠ **The nine harness traps** (`aaa-08-rubric.md:643`, `aaa-03-transition.md:709`) are load-bearing
and each has cost this project a run. Read them before writing a line: `input.endFrame()` is called
by main.js's rAF loop and **not** by `game.update()` · the SCHEME owns the key · `controlPlayer`
rewrites `aim` every frame · pick fighters by **TEAM**, never index (`entities[1]` has been the
KMK 9 camera operator) · pin both bodies to **absolute** positions · `runSlot(c, key, inp, g)` —
fighter first, game last · the **phantom-module law** (read `LSW.PW_KB`, never a fresh dynamic
import) · a shorter test cannot find a higher lid · *a check whose subject is whether two AIs feel
like fighting is not a check.*

---

## WAVE 1 — THE VIEW AND THE MARK

**Why first:** the reticle is the axis the thesis names first (*"the reticle never lies"*), and
`game.js:3172-3175` applies the **camera's direction** from the **player's position** — two parallel
rays that never converge. Measured (`aaa-05-reticle.md`, correcting `openjk.md:2045` in place): the
miss is **0.47u at a 16u gap growing to 7.98u at 100u**, and **14.52u** against a foe 45° above at
70u — it is *not* a constant 6.8u worst up close. **Nothing that aims or frames may be built on top
of a lying mark.**

| lane | owns exclusively | scope |
|---|---|---|
| **VIEW** | `src/engine/world.js`, `src/core/input.js`, `src/core/util.js` | `_segBox3` → **`traceBox3`** returning `tmin` (byte-identical boolean wrapper) + the `top ?? h` guard (⚠ an interior wall record has neither, so NaN slabs currently fall through as a **hit**) · **`world.aimTrace`** · **`world.frameHeightAt`** · **`world.camBasis`** write · **`world.snapChase()`** + its six triggers · pointer-lock **mouse-look** driving chase yaw (unbounded) and pitch (`PW_AIR.camPitch = 0.985`, 80°) · `punch(z)` → **FOV kick** + the leak fix · **all dial tables** in `core/util.js`: `PW_AIR`, `PW_FX`, `GAIT`/`GAIT_OWNER`/`gaitAllows` (declared, no consumers), `dampStiff`, `AIM_MAX_D` |
| **MARK** | `src/engine/game.js`, `src/engine/hud.js`, `src/engine/hud.styles.js` | convergent aim in `controlPlayer` from `world.aimTrace` · the **muzzle two-pass** (⚠ `aim3` is measured from `pos + 5.8` but every shot leaves `c.muzzle()` at `pos + aim*3.4` — a camera-independent **2.94u** residual at 60° pitch) · `pickTarget` measures from **screen centre** under `_openSky`, not the mouse cursor · the crosshair drawn at the **projected aim point** · **hard lock owns the aim point** · `camBasis` reads + `this.fwd`/`this.right` recomputed in `cameraDrive` · the `_rdt` slow-mo split |

**⚠ THE FROZEN INTERFACE.** VIEW provides, MARK calls, neither changes it mid-wave:

```js
// world.js — nearest hit along a ray. Returns the out object, always.
// out = { point: Vector3, dist: number, hit: 'foe'|'flung'|'cover'|'interior'|'ground'|null, ent: Fighter|null }
world.aimTrace(out, { origin, dir, maxD, foes, ignore, blind })
world.traceBox3(o, d, box)   // parametric entry distance, or -1. REFUSES a record with no hx/hz/top
world.frameHeightAt(p)       // world height of the frame at a world point
world.camBasis               // Vector3, the UNCLAIMED camera axis, written before any frame claim
```

⚠ **All four dial tables land in Wave 1, in one commit, by one lane.** Five specs each want to add a
table to `core/util.js`. Adding them all up front — with the spec'd defaults, unread — means no later
wave has to fight for that file, and a lane tuning its own dial afterwards edits one key.

**GATE.**
- **R1** static miss ≤ **0.35u** (`DECAL_LIFT` — taken, not invented) at gaps 10/16/24/32/40/52/70/100.
- **R2** ≤ 0.35u with a foe 45° above at 40u and 70u, a foe **directly overhead** (the
  `world.js:2266-2269` degenerate branch), and a muzzle pitch ≈ 80°. ⚠ Without the muzzle fix the
  pitched case reads **3.35u**.
- **R3** hard lock / soft magnet / free aim all ≤ 0.35u, **and** `world.screenPosOf(aimPoint)` lands
  within **1px** of the crosshair element's drawn position. *A miss measured against a point the
  crosshair is not drawn at measures nothing.*
- **R4** 60s AI-vs-AI, worst ≤ **2.2u** (one body radius; one frame at cruise is 1.67u of travel).
- **R5** honesty — a foe at `_vis = 0.2` under the crosshair, and `p.blindT = 1`: **0 convergences.**
  The reticle must not become a wallhack.
- Camera can be pitched to 80° and the degenerate blend holds. `traceBox3`'s one existing caller
  (`updateOcclusion`, `world.js:1364`) fades the **same set of buildings** on a generated Tokyo
  before and after the refactor.
- **SHOT MATRIX D1/D2/D3** — crosshair and impact point coincide *in the picture* at 10u, 40u, 200u.
  ⚠ Clear the renderer's **scissor rect and viewport** before posing (the news crew leaves a
  320×180 rect) and read the drawing buffer with `toDataURL` **in the same task as the render**.
- §2.0 rule 5, driven.

---

## WAVE 2 — THE STATE, THE TRACE AND THE EAR

**Why here:** `gait` has no consumers of its own and must exist before either grammar can be gated
on it. The camera's collision and damping work is pure `world.js` and does not touch `entity.js`,
so it runs beside it. Audio's defect ledger is entirely in its own files.

| lane | owns exclusively | scope |
|---|---|---|
| **GAIT** | `src/engine/entity.js`, `src/engine/game.js`, `src/core/util.js` | `_updateGait(dt)` + the **landing rule** (§1.3) · T1–T12 · the handoff law and its three corollaries · **migrate all ten `flying`-as-ground-proxy readers in ONE commit** (a half-migration *is* the bug — failure mode F5) · footsteps re-gated on `gait === GROUNDED` · `coneFoe` selects on `GAIT_OWNER` of both parties · the spacing-ring gate · `clearTransients` clears `_openSky`, `_chaseKb` **and** `gait`. **RIDER (from IMPACT):** `entity.js:1175` → `this._animate(0)` |
| **VIEW** | `src/engine/world.js` | camera **collision** — two swept traces in JKA's order (`openjk.md:298-311`), clip written back into the **damped** state so recovery is smooth for free · `CAM_PAD` **derived from the near-plane corner radius** (⚠ `openjk.md:2107`'s "2–3u" is trust-tier **X** and does not reproduce: 4qu is 0.686wu at the body anchor) · the **yaw-rate stiffener** in ratio space via `dampStiff` · the derived pitch divisor 1.242 rad · **`vRef`** replacing the hand-picked `/96` · the clinch term read from `reachOf('jab')` |
| **AUDIO** | `src/core/audio.js`, `src/core/samples.js`, `src/data/sfx.js`, `docs/VOICE_AND_SFX.md`, `docs/AUDIO_SOURCES.md` | **D1** — the sustain watchdog compares `performance.now()` (ms) against `SampleBank.loop`'s `ctx.currentTime` (s), so **every recorded loop in the game is stopped within ~0.4s**: the beam voice, the ki charge spool and the flamethrower roar are all dead in every match right now · **D3** — `blast()` called with a position where the oscillator type belongs at three sites, a latent throw into the frame loop · **D5** · the `sfxOf(a, def)` voice vector (ATTACK × GRAIN × BODY × TAIL, measured **212 distinct voices, largest bucket 12**, zero new files) · the audio contract §1.9 written down |

**GATE.**
- **T1** 10,000 driven frames, randomised input, 2 fighters: `GAIT_OWNER[f.gait]` ∈ {ground, air,
  none} on **100.00%** of samples, and `none` occurs **only** while `staggerT > 0`.
- **T2** on the contact frame and each of the next 8, a strike / ascend / descend / guard / one power
  pressed through the **real key path** responds in **exactly 1 frame**. *0 or >1 is a fail; 0 means
  the harness wrote the value.*
- **T3** momentum carries: `Δv` across every gait change equals that frame's `dragF` and gravity
  alone within **1e-3**. Any other delta is a transition writing velocity.
- **T4** 500 dives at the −160 clamp with `launchT = 0`: **0 damage, 0 `_slam`, 0 `CRASH`.**
- **T5** 200 launches into the floor across the −38 boundary: `≥ −38` → SETTLE with `flying` still
  true; `< −38` → CRASH, damage ≤ 32 credited to `lastHitBy`, and gait returns to **AIRBORNE** after
  `staggerT` in **100%** of cases.
- **M3a** LIFT duration matches its closed form — tap **0.130 ± 0.017s**, held **0.086 ± 0.017s**
  (nobody picked these; they fall out of `FLY_TAKEOFF 19` / `FLY_RISE 46` against `AIR_DRAG 1.8`).
  **M3b** LIFT cannot get stuck under a slab 1u overhead. **M3c** SETTLE = `max(0.10, _landT)`
  exactly: **0.100 / 0.211 / 0.260s**, and the pose ramp reaches 0 on the same frame the state does.
- **The ten-row table in §1.3 re-measured, all ten correct.** Footsteps **audibly** fire in
  PowerWorld (analyser tap, not a flag).
- **C1–C3** eye λ ∈ [6.1, 8.2] · look λ ∈ [11.8, 15.9] · **ratio ∈ [1.7, 2.1]**. ⚠ C3 is the metric,
  not C1 or C2 individually — *two channels damping at the same rate is a single-channel camera
  wearing two names.* Ours today is **1.13** against JKA's **1.94**; this closes on arithmetic
  (`aaa-08:287` independently settles `aaa-04:997`'s open question — the proposed 13 is right to 6.2%).
- **C5** a real 180° flick through `controlPlayer`: residual < 8° at t+0.25s stiffened, **> 40°** with
  `stiff` forced 0 — and a slow **20°/s pan shows < 5% difference**, because the stiffener must be
  *invisible* during ordinary tracking, which is its entire purpose.
- **C6** 60s AI-vs-AI in a 79–99-piece Mega City, ≥3,600 frames: **0** frames with `camPos` inside
  any cover AABB, any interior wall, or below `heightAt + CAM_PAD` — **plus a screenshot of the
  smallest-clearance frame.**
- **Audio**: recorded loops survive 60 frames of `set()` (D1); 364 slots fire with **0 console
  errors** (D3, which makes the never-throw law testable for the first time); ≥190 distinct
  signatures, largest cluster ≤16; **0** audio 404s; city mix within **0.5 dB** before/after.
  ⚠ Sample with **rAF, never `setTimeout`** — a transient is ~40ms and a throttled harness caught
  only 3 of 13 weapons last time. Refuse to run when `document.hidden`.

---

## WAVE 3 — THE TWO GRAMMARS

Both halves of the thesis, in parallel, because they are in different files. **AIR is physics
(`entity.js`); GROUND is the melee grammar (`melee.js` + data).** The ground *mover* — jump, crouch,
stopspeed, run speed — is also `entity.js` and therefore waits for Wave 4. That split is real, not a
convenience: the melee grammar needs no mover change and the mover needs no melee change.

| lane | owns exclusively | scope |
|---|---|---|
| **AIR** | `src/engine/entity.js`, `src/core/util.js` | `PW_AIR.accel = 1.8` **==** `AIR_DRAG` under `flying && _openSky` (time-to-top-speed **0.124s → 1.664s**; turn radius **11.1 → 55.6u**; 180° reversal **4.91 → 17.05u** — half a body length of commitment becomes 1.8) · the **`dir.y` gate fix** (today a pure strafe gives `d3.y = 0` and silently falls into the 2-D clamp) · the **ascend-servo blend** (⚠ `entity.js:1305/1317` *assign* `vel.y`, so the pitched-forward vertical component `move()` just added is thrown away one function later — hold SPACE pitched 45° up and you climb at exactly 46 regardless of where you point) · **`PM_Drifting`** both variants, with the sign **latched** (`Math.sign(0)` is 0 and `rightSpeed` passes through zero on every straight-line release) · `plGain 0.7143` · `PW_AIR.top = 210` · the **air stopspeed term** (C5) · pitch unclamp to π under `_openSky` · cruise/burner suppressed while guarding and while a beam is firing |
| **GROUND** | `src/engine/melee.js`, `src/data/martial.js`, `src/data/characters.js` | the three-phase state machine + `strikeActive` as a derived shim · `blk` per phase + `blockStateOf` · `guardArcOf` · `swingMult` = `handMult` on foot, `momentumMult` in the air · `artOf(def)` + `GROUND_ROLE` + `def.art` on the roster · reconcile the two clinch formulas onto `clinchWindow()` (C8) · wire `hasStrike` so a wrestler genuinely cannot throw a cross |
| **VIEW** | `src/engine/world.js` | the frame claim — an **additive** `camera: {…}` block with **null-as-flag** per-parameter override, read at six lines in `chase()`, envelope **asymmetric by default** (in 1.0 / out 0.5, JKA's own ratio, so a power reads as **ending**) and driven by a `phase` read from **the move's own clock**, never a timer the camera owns · exactly **ONE carrier** (the haymaker) to prove the door · the grammar blend `g` (§1.6 C9). **RIDERS (from AIR):** `world.js:2247` denominator → `(PW_AIR.top − 14)`; `world.js:2287` `+ k*16` → `+ k*26`; camera pitch clamp → `PW_AIR.camPitch` |

**GATE — AIR.**
- **V1** time to 95% of air top speed ∈ **[1.50, 1.75]s** (C4). BFP's closed form is
  `ln(20)/pm_flightfriction = 1.498s`; ours at 1.8 is 1.664s.
- **V2** stop distance from 100 u/s ∈ **[45.7, 56.0]u** **and it must TERMINATE** (C5). A run that
  never crosses 0.5 u/s is a **structural** fail, not a numeric one.
- **V3** reversal distance from 100 u/s ∈ **[16, 18]u**.
- ⚠ **V1–V3 measured on four fighters spanning the ladder** — a `flightTier 0` bruiser, a tier-2
  levitator, a mid tier-3, and SOL. *One fighter's numbers are not the mode's numbers.*
- `airGain(1.0) == 1.0` **exactly** — nobody's opening speed moves. TORCH at `powerBuff 1.7` caps at
  210; CIRCUIT at 1.7 reaches 90 ± 2; roster air spread at max power ≤ 2.5×.
- Holding SPACE pitched 45° up produces `vel.y > FLY_RISE` **and** non-zero horizontal speed.
- The drift's displacement table, with the latch proven by a straight-line release (non-zero, and it
  must not alternate sign frame to frame).
- **SHOTS A1–A7**, and **A2 is the one that matters**: two fighters closing at 210 u/s, **both in
  frame.** The cap is derived from the chase camera's own eye-damp λ and 86u distance clamp, so it is
  a *readability* bound — and no assertion can see it. Also **A4**: a driven vertical dive gives
  `parts.g.rotation.x ≥ 3.0` (today it saturates at 1.85, so a vertical dive renders **74° short**
  and the body never points down) with the ground markers still under the fighter.

**GATE — GROUND.**
- A jab thrown at a foe at 10wu does **not** connect during the first 0.10s. A haymaker's 0.34s
  startup can be interrupted by a jab. A grab landed during the victim's `recover` yields
  `grabMode === 'back'`.
- ⚠ **The harness proves itself first** — *a point-blank jab must land at all* before any negative
  assertion counts. (`[].every()` is `true`; this repo shipped that.)
- All twelve existing readers of `strikeActive` still behave; it never goes negative.
- A haymaker's startup takes **full** damage from a jab (`blk.startup === 'no'`); a held guard with
  no strike in progress behaves **identically to today** — same multipliers, same meter drain, same
  `onBlockedStrike` push/stagger, same ≤0.22s parry window.
- `guardArcOf` returns **≥3 distinct values** across the roster; `barrier` is still 360°.
- The 52-row `artOf` assignment printed: **0 in any style, or >21 in one, is a red.** `def.art`
  overrides; a fighter with no abilities gets `closer` without throwing.
- `swingMult` returns `momentumMult` **exactly** when `!onFoot`; blocked hits take neither.
- ⚠ **`HAND_REF` does not ship as a guess.** The instrumentation runs first and publishes p50/p95
  fist speed for jab/cross/haymaker across all 52. Porting JKA's 8/16/24 tolerances directly would
  violate the distribution law a **fifth** time — those were fitted to a 32qu blade whose tip travels
  far further than a fist.
- **SHOTS B1–B5.** B5 — a grounded run across the stage: **does the fighter skate?**

**GATE — VIEW.** An AI throwing the identical haymaker moves the camera by **exactly 0** (drive
both, diff every camera field frame by frame — `openjk.md:687` is the rule JKA gates at every site) ·
with a 360° `ov.yaw` claim running, holding forward for 2s moves the player in a **straight line**,
heading deviation < 3° (⚠ *a camera flourish that inverts the controls is a bug, and `camBasis` is
what prevents it*) · `clearTransients` leaves every claim field null and `_chasePunch` at 1 · the
asymmetric envelope measurable: ramp-in / ramp-out = `in/out` within 10%.

---

## WAVE 4 — THE GROUND MOVER AND THE FRAME

| lane | owns exclusively | scope |
|---|---|---|
| **GROUND** | `src/engine/entity.js`, `src/core/settings.js` | **the jump** — there is none in the game; `Space` is the flight key in all four schemes (`settings.js:11,18,25,40`). One key, two meanings, disambiguated by footing — structurally JKA's own move (`openjk.md:1642`: Raven added a `PM_CheckJump` call inside `PM_AirMove` that id never had). `JUMP_VEL = 25.5 wu/s` → apex **5.4wu**, airtime 0.85s · **crouch** · **ground `stopspeed`** (`pm_stopspeed 100 qu/s` = 17.1 wu/s; below it Q3's drop becomes a constant 102.6 wu/s², shedding the last of your speed in 0.167s instead of asymptoting — *that is the crisp stop*) · run-speed multipliers · roll/dash re-gated through `gaitAllows` · `_landT` gates **jump and roll only**, never strike/guard/grab |
| **IMPACT** | `src/engine/world.js`, `src/engine/game.js`, `src/engine/vfx.js`, `src/engine/printpass.js`, `src/engine/particles3d.js`, `src/engine/comic.js`, `src/engine/hud.js`, `src/engine/hud.styles.js`, `src/core/util.js` | the **angular ring-down** — replace `Math.random()` per component per frame (which reads as *interference*, not impact) with two decaying octaves on an axis **stamped once per event**; frequencies **derived from the 40 Hz Deck lock** (⚠ `pw-impact.md:262`'s 26 Hz aliases to 14 Hz at 40 Hz and 4 Hz at 30 — it would be a *different effect on different hardware*): `oct1 12Hz / oct2 4.5Hz / mix 0.30 / max 1.25° / 0.18°per` · `punch()` → the FOV kick, `punchK = 0.45` compressing all 24 call sites in **one dial** while preserving the ordering they authored · **`frameHeightAt`-based size clamps** (a haymaker star goes from **69% of frame height to 18%**) · **CUT** the shockwave dome in close-frame (⚠ at the clinch framing the camera is **inside** an additive dome at opacity 0.32 for 0.77s — a backside sphere tints every pixel regardless of size; the heliopause shell is the same lesson at a tenth the opacity) · the particle pixel cap `0.035 · H` (⚠ the perspective divide `300/-mv.z` has *never meant anything* on an ortho camera — it goes from 1.15× to **10.1×**) · **CUT `flashScreen`** in chase mode, all 12 sites, one early return · `.hitarc` → an annulus sector · damage numbers **off by default** · the comic **centre exclusion** + two lateral candidates wide enough to clear it · `heavy: true` at `hitFlung` / `intercept` / spire-shatter |

⚠ **`world.js` moves from VIEW to IMPACT in this wave** because VIEW's work is done and IMPACT's
shake/FOV/frameHeight changes are all inside `chase()`. If VIEW has open work, it does **not** run
in Wave 4 — that is the rule, not a preference.

**GATE — GROUND.** Stop distance from a median run **≤ 0.20s to rest** · jump apex within 5% of
5.4wu · crouch speed exactly 0.50× · `world.auditGround()` floor contract
`|groundY − heightAt(x,z)| < 0.25` for every fighter in every mode · **a screenshot** — scale and
feel faults are invisible to assertions (the ring shipped 4× too big, the rubble shipped black, the
stage shipped as a black void, all with green tests).

**GATE — IMPACT.**
- **I1 SILHOUETTE DELTA > 12** (0–255) through the entire worst-case sequence **including the impact
  frame**, measured by rendering each frame **twice in the same task**, once with the opponent's
  figure group `visible = false`. ⚠ **This is the only metric that cannot be gamed by turning
  everything down.** *"The frame is dark" is not the claim; "the centre of the screen still contains
  a readable opponent" is.*
- **I2** CENTRE pixels with `L > 235` under **2%** on every frame but the impact frame.
- **I3** the impact frame is **exactly one frame**: CENTRE mean `~L0 → ~(255−L0) → ~L0`, then re-run
  with `fxImpact false` and the middle sample **stays at ~L0**. ⚠ It must tick **after** the render
  — getting it backwards measured **93.6 → 93.6 → 93.6**, *"the punch landed and nothing happened"*,
  and a boolean flag would have said "working" the whole time.
- **I4** shake dynamic range jab→overpower **≥ 4.2×**, flat only above `_shake 6.94`. Today it is
  4.0× and **flat from a cross upward** — a jab, a haymaker, a tier-up and a KO deliver the identical
  camera, and the top of the ladder is where the range should be widest.
- **I5** attacker's hitstop **≤** victim's on every strike path (true today by 0.01–0.028s — at a
  chase camera you watch the victim **over the attacker's shoulder**, so if your own hand unfroze
  last you would see your recoil before their flight), and pose delta across the freeze **exactly
  0.000** (⚠ today `animT += dt` runs *before* the early return and `_animate` is called with the
  full `dt`, so **a hit-stopped running fighter cycles their legs in place**).
- **I6** no `#hDmg` / `#hHits` / `#comicLayer` bounding rect intersects the CENTRE box, and the
  speed-line exclusion covers it. ⚠ `rad` is raw UV, not aspect-corrected, and *that accident* is
  what makes the exclusion cover the box — turn it into an asserted invariant before somebody
  "fixes" the aspect ratio and silently opens the centre.
- Camera **position** deviation exactly **0.0u**; per-frame angular step at `dt = 1/40` ≤ **1.35°**;
  visible light count constant; `renderer.info.programs` grows by **0** after warm-up.
- `world.frustumTarget === 78` after a PowerWorld match (⚠ `Math.min` only ratchets *down* and
  nothing in `chase()` damps it home, so today a session leaks a punched-in city).
- **SHOTS B3, C1–C4.**

---

## WAVE 5 — THE MODE BEHAVES, NOT JUST THE PLAYER

| lane | owns exclusively | scope |
|---|---|---|
| **AI** | `src/engine/ai.js`, `src/engine/game.js` | **bot and pad 3-D flight.** ⚠ `entity.js:1606` gates the 3-D mover on `dir.y`, and `controlBot` (`game.js:3429`) and `controlPad` (`:3392`) both write 2-D `moveDir` — so `dir.y` is undefined and **the branch has never run for a bot**. Every rule in the air spec is player-only until this lands, which means Waves 3–4 changed how the PLAYER flies and not how the MODE behaves. `ai.intent()` returns `fly` as a boolean and needs a climb scalar. ⚠ `ai.flyTend` is already forced ≥0.8 in PowerWorld (`game.js:234`) — measure engagement distances before and after; **the fight must not become unreadable, which is BFP's own top recorded complaint** (`pw-bfp-source.md:580`, unchanged 2002→2024) |
| **AUDIO** | `src/core/audio.js`, `src/engine/melee.js`, `src/engine/abilities.js`, `src/engine/projectiles.js`, `src/engine/summons.js`, `src/core/samples.js` | the **3-D listener** (⚠ `listen(x, z)` has no Y at all in a mode whose entire premise is altitude — a car explosion 1,400u below plays at **full gain**) · the near-field falloff curve (⚠ `_pg`'s linear form clips to 1.0 for all `d < 0.12·reach`, i.e. **0 dB of gradient across every distance a chase camera shows**) · **the 77 positionless combat calls** · **D4** — `TYPES.melee` still plays `audio.zap(520)` on a block, the KI sound, which `melee.js:131` already fixed at its own site; move it to `game.onBlockedStrike`, the choke point every blocked strike already routes through. **RIDER to AI:** the one line in `game.onBlockedStrike` |
| **ARM** | `src/engine/figure.js`, `src/engine/ragdoll.js`, `src/engine/entity.js`, `src/engine/systems2.js` | the **elbow** (Phase A only: **2 Groups, 0 meshes**). ⚠ `mkArm` builds upper/fore/fist as flat siblings of the shoulder pivot — **the arm is a straight rod and bends only when the fighter is dead** (the elbow exists in the ragdoll, `ragdoll.js:232`). The leg already has a real driven knee. This is the prerequisite for `handMult` to measure a real quantity: with a rigid arm, hand travel is a fixed multiple of shoulder rotation. ⚠ **Contract A must break** — inserting the elbow changes `arm.children[1]` at seven enumerated sites; convert to the leg's `userData` pattern and expose `parts.fistL`/`fistR` rather than leaving indices working by luck. ⚠ **The ragdoll sleep threshold is an absolute SUM, not an average** — at 19 particles the same residual jitter reads 27% higher and bodies settle later or never, *"the single most likely way the extension silently regresses performance"* |

**GATE.** Engagement distances before/after for the AI (ranged pair vs close pair must stay
distinct); a bot approaching from above **dives** rather than translating sideways and descending ·
near-field gradient **≥ 6 dB** between 5u and 25u in chase mode (0 dB today) and altitude attenuates
**≥ 18 dB** · every `{x, z}` literal call site sounds **identical** (city per-sound peak RMS within
**0.5 dB** before and after a PowerWorld match) · worst-case world position/quaternion delta
**< 1e-6** per mesh across all 52 heroes with every new joint at rotation 0, plus close-range shots
of idle, guard, mid-haymaker and a settled ragdoll on **GALE (frame 0.92)** and **RAGE (1.20)**.

---

## WAVE 6 — THE CRITIC RUN

No code lanes. A **fresh-context subagent that did not write the implementation and does not read the
implementer's report** runs `aaa-08-rubric.md` §2.8 end to end:

1. Read only the target tables. 2. Run the self-proof; **red → `INADMISSIBLE`, stop.**
3. Capture all 31 numbers with the source column **empty**. 4. Write a provisional verdict from the
band alone. 5. **Only now** fill the source column. 6. Re-verdict, noting every verdict that changed
at step 5 — *that is the audit trail proving the source column was not used to rationalise a number
already accepted.* 7. The pictorial lane last, separately blinded.

⚠ **A critic who fills `ours` and `source` in the same pass has run a different protocol.**

Five letters, **no composite grade**, verdict = the worst axis. Default **REJECT**. Three consecutive
failures on one metric **escalates to a ruling, not a fourth loop** — *a harsh critic with no
escalation path is a denial of service.*

---

# THE VISUAL PROFILE — every ability is legible

Robert's ruling: *"When dozens of fliers are on screen firing at once, a player must still be able to
read what each power IS and what it just DID to a target — in grayscale, in a freeze-frame, in half a
second."* The answer is a **seven-trait profile on every one of the 364 abilities**, DERIVED from what
the ability already is (`profileOf(a)` in `src/data/visual.js`), with `a.vprofile = {trait: value}` as
the per-trait override the family authors reach for only when a collision forces it — exactly the
`def.build`/`def.temper` pattern the beam anatomy already uses. Nothing is hand-authored to be correct.

## The seven traits and their vocabularies

Each trait is a **closed set** — a value outside its vocabulary is a typo, not a variation.

| # | trait | vocabulary |
|---|---|---|
| 1 | **SOURCE** | `eyes` · `chest` · `hands` · `weapon` · `ground` · `sky` · `space` |
| 2 | **SILHOUETTE** | `line` · `disc` · `fan` · `cone` · `wall` · `ring` · `orb` · `tendril` · `column` · `cloud` |
| 3 | **MOTION** | `straight` · `arc` · `spiral` · `return` · `branch` · `fall` · `expand` · `pull-inward` · `erupt-upward` |
| 4 | **IMPACT** | `puncture` · `slice` · `shatter` · `implode` · `explode` · `freeze` · `deform` · `launch` |
| 5 | **RESIDUE** | `frost` · `smoke` · `fire` · `cracks` · `crater` · `glyph` · `scattered-metal` · `nothing` |
| 6 | **FAMILY** | `physical` · `technological` · `elemental` · `psychic-gravity` · `mystical` · `biological` · `sonic` |
| 7 | **TELL** | the status written on the victim (the richer 12-value `VIS_TELL` — `freeze`/`burn`/`poison`/`sleep`/`blind`/`stun`/`bleed`/`drain`/`shock`/`root`/`dominate`/`none`) |

⚠ SOURCE/SILHOUETTE/MOTION/IMPACT/RESIDUE map the *existing* five-axis contract onto Robert's fixed
vocabularies (documented at each map in `visual.js`); MOTION and FAMILY are the two axes he named that
the contract did not have and are new derivations (`motionOf`, `familyOf`). ⚠ `a.arc` is a NUMBER (a
cone/swing's angular width, on 78 abilities) and is **never** read as an "arc motion". ⚠ A RIFLE is
`physical`, not technological — a gun is recoil and fragments; the TECHNOLOGY grammar belongs to the
drone/construct's controlled geometry (a documented divergence from the brief's "rifle → technological").

## THE HARD RULE

> **No two powers may match on more than THREE of the seven traits.**

`verifyProfiles(ROSTER)` (exported from `visual.js`, on the LSW handle as `profileSuite`) checks every
ordered-unique pair of the 364 abilities and returns `{ total, checks, failures, collisions }`; a pair
sharing **> 3** traits is a `collision`, sorted worst-first with the exact shared axes. It runs over
the **live roster** so it can never drift from what the engine derives. ⚠ Prove it fires before
trusting its green (rubric §5.2): planting one ability's profile onto another via `vprofile` reports
that pair (`failures` 0 → 1); a genuinely distinct pair is green. Both were shown.

### LANDED — 26,823 → 138 (99.79% distinct), and the rule is provably a floor, not a zero

**The pure derivation began at 26,823 colliding pairs of 66,066** — and the first instinct (author a
`vprofile` per colliding pair) is wrong: 26k is not an authoring list, it is a symptom. The cause was a
**skewed derivation** collapsing hundreds of abilities onto one tuple: `residue → nothing` on 290,
`tell → none` on 299 (the bare `tellOf` only fired on a mechanical DoT), `source → hands` on 259, and
— worst — the base `impactOf` mapped beams, cones, projectiles and novas alike to `explode`, locking
family+tell+impact+residue equal across 79 elemental abilities. Three honest de-skews fixed the root:

- **RESIDUE is earned from family+impact** when the base gives nothing (an explosion scorches, a
  shatter cracks, a puncture scatters metal; `nothing` survives only where honest — sonic, a gravity
  implosion). 290 → 14.
- **The STATUS TELL is a READ, not a DoT** — Robert's trait 7 is literally *"how does the player
  understand what happened"*. A fire hit reads BURN, an ice hit FREEZE, a launching blow STUN. This is
  honest to his own definition and splits the two mega-buckets below the feasibility bound.
- **IMPACT reflects what the attack DOES** — a beam bores (`puncture`), a cone sprays (`deform`), a
  bolt punctures, a detonation explodes — not all `explode`.

Then a **deterministic differentiator** (`differentiateProfiles`, a min-conflicts CSP solver — the
rule IS a mixed-alphabet distance-4 code) assigns the residual collisions distinct, plausible
profiles by nudging only the five *presentation* axes (family and tell are never touched — one is the
grammar, one is the truth about the status). It runs OFFLINE in `tools/bake-vprofiles.mjs` (minutes)
and bakes `src/data/vprofiles.generated.js`, which `applyProfiles(ROSTER)` loads at boot instantly.

⚠ **TRUE ZERO IS MATHEMATICALLY IMPOSSIBLE for this roster, and that is a finding, not a miss.** A
distance-4 code over the five free axes tops out near ~50 codewords (greedy: 34), but `physical|none`
and `elemental|stun` each hold **69** abilities that share family AND status-read — 51 of the physical
ones are dashes, which are honestly the same visual. You cannot make 69 things pairwise-distinct on
axes that support ~50 values without lying about what a power *is* or *does*. The baked floor is
**138 collisions (99.79% pairwise-distinct)**; to reach a literal zero would require expanding the
trait vocabularies or accepting that some powers are twins. `profiles.derived.json` carries the full
inventory; `verifyProfiles` reports the live residual and is proven to fire on a planted duplicate.

## The seven FAMILY grammars (trait 6 decides the whole look)

| family | grammar |
|---|---|
| **PHYSICAL** | real weight, sparks, fragments, dust, recoil — **minimal glow** |
| **TECHNOLOGY** | precise lines, targeting brackets, segmented lights, controlled geometry, mechanical movement |
| **ELEMENTAL** | turbulent volume, environmental reactions, persistent residue |
| **PSYCHIC/GRAVITY** | distortion, refraction, **inward** movement, stretched particles, **unnatural silence** |
| **MYSTICAL** | glyphs, asymmetry, impossible movement — effects that do **not** obey ordinary physics |
| **BIOLOGICAL** | tendrils, pulses, elastic movement, uneven shapes, organic rhythms |
| **SONIC** | **mostly transparent** — force is visible only through pressure rings, dust, clothing, glass, smoke, environmental movement |

## The seven STATUS languages (trait 7 — absolute; every carrier obeys)

| status | how the player reads it |
|---|---|
| **FROZEN** | grows **upward from the feet** with angular crystals |
| **STAGGER** | offset double-image, broken posture, asymmetrical motion |
| **GAS** | diffuse lingering cloud + coughing/choking body language |
| **DRAIN** | particles move **inward**, victim → attacker |
| **MIND CONTROL** | a visible eye, halo, tether, or head-level signal |
| **SLEEP** | slow **downward** movement, softened posture, rounded shapes |
| **BLINDNESS** | obscured sight — smoke, a blocked-eye symbol, or interrupted targeting |

## THE CRITIC CHECKLIST — what every wave's critic must verify about visuals

1. **`profileSuite` was run this session** and its `failures`/`collisions` are quoted verbatim — a
   grade above C requires the gauge to have been shown to FIRE (a planted-collision self-proof) in the
   same session (the known-bad-injection law).
2. **No two powers ON SCREEN in any captured frame share >3 traits** without a purpose the shot makes
   legible — check the collision list for every pair actually co-present.
3. **Each family reads as its grammar** in grayscale: a PHYSICAL power does not glow like ELEMENTAL; a
   SONIC power is transparent (pressure rings/dust, not a beam); a PSYCHIC/GRAVITY power moves inward
   and is quiet.
4. **Each status reads as its language** on the victim: FROZEN grows up, SLEEP sinks down, DRAIN flows
   toward the attacker, GAS lingers as a cloud, MIND-CONTROL shows a head-level signal.
5. **The freeze-frame test**: a single captured frame identifies both what the power IS (source +
   silhouette + family) and what it DID (impact + tell) with no motion and no colour.
6. **NO PURPLE** outside KIVULI, in any effect, on any frame (the standing law).

---

# 3. THE VERIFICATION CONTRACT

**One command.**

```
node tools/aaa.mjs [--wave N] [--axis movement|camera|reticle|impact|transitions|audio]
```

## What it drives

Boots `http://localhost:5180/powerworld.html` in headless Chromium, clicks the **real door**
`#pwGo` (`src/engine/pwTitle.js:238`), and drives everything through the real input path:
`KEYMAPS[SETTINGS.scheme]` keys through `input`, punches through `melee.js`, powers through
`runSlot(c, key, inp, g)`. **It never writes the quantity it measures.**

Then, in order:

1. **THE SELF-PROOF.** Every axis green on a known-good **and red on its known-bad** (Wave 0 table).
   Output quoted **verbatim** into the report. ⚠ A report without it is not *failed* — it is **not
   read**.
2. **THE SUITES.** `LSW.pwMoveSuite()` · `pwCamSuite()` · `reticleSuite()` · `pwImpactSuite()` ·
   `transitionSuite()` · `audioSuite()`. Three consecutive clean runs.
3. **THE CALIBRATION INJECTIONS.** Hide `world.skyMesh`; `dayFixed = null; dayT = 0.85`. If either
   produces a capture indistinguishable from the healthy one, **the visual lane is INADMISSIBLE for
   this run.**
4. **THE SHOT MATRIX — 22 frames, every one mandatory.** A — the air grammar (7): solo cruise · two
   fliers closing at 210 u/s · foe directly overhead · vertical dive · mutual burner chase ·
   mid-climb at `spaceFrac ≈ 0.5` · hover at 60u. B — the ground grammar (5): clinch ≤11u · mid ~24u
   · haymaker contact frame · camera in a rock corner · a grounded run. C — the transition (4), HUD
   hidden: LIFT · SETTLE · CRASH · `gh ≈ 5`. D — the reticle (3): 10u, 40u, 200u. E — the laws (3):
   **no purple**, HUD at 1600×1000 and the Deck's 1280×800, and the two injections retained as
   evidence the lane works.
5. **THE PICTORIAL A/B.** `tools/framestats.mjs` measures five composition quantities — subject
   height fraction, pair separation fraction, horizon fraction, sky area fraction, centre-box RMS
   contrast — on our frames and on the **21 real reference frames** in `docs/reference/`
   (5 BFP, 4 Ultra BFP, 3 ESF, 9 Dragonball Unreal). Reference bounding boxes are **hand-marked once
   and labelled as such** in `framemarks.json`, because an automatic segmenter on a JPEG-artefacted
   640×480 screenshot is a made-up number wearing a script.

## What it asserts

**31 numbers across five axes**, each with a capture method and a band whose derivation is shown:
movement 8 · camera 7 · reticle 5 · impact 6 · transitions 5. Plus the audio assertions and, every
run, **the city-unchanged block** (§2.0 rule 5).

**The three rules governing every metric:**
- **M-A — DRIVE THE GATE.** No metric may be produced by writing the quantity it measures. This repo
  lost the orbit-ceiling test, the open-sky flight test, four consecutive direction-triangle tests
  and a whole melee-feel A/B to exactly this.
- **M-B — ASSERT THE RELATIONSHIP WHERE ONE EXISTS.** The reticle axis is a relationship; so is T3's
  momentum-carry. A relationship survives a re-tune; a value goes red on every legitimate change,
  which is how a suite gets ignored.
- **M-C — THE INSTRUMENT MUST MATCH THE QUANTITY.** *Sim numbers*: stub `world.render`, batch-time
  ≥3,000 frames. *GPU numbers*: `EXT_disjoint_timer_query_webgl2` or `gl.finish()`, **at 3840×2160**,
  tab foregrounded, `autoReset = false` — at 720p every effect in this engine measures a **negative**
  delta. *Pixel numbers*: read the **drawing buffer in the same task as the render**, and clear the
  scissor rect and viewport first.

## What it captures

`docs/powerworld/runs/<sha>/` — the 22 PNGs, the framestats table, the verbatim self-proof, the
31-row comparison table with its anchor and trust-tier columns, and the report in the
`aaa-08-rubric.md` §6 shape. Exit non-zero on any console error during any capture; the critic must
not launder one.

## The hard REJECT rules

Any **F** · any two **D**s · **a missing frame** (no numeric result substitutes) · self-proof not run
or red (**`INADMISSIBLE`**, which is worse than REJECT — the work was not judged at all) · a console
error · a metric reported without its capture method or produced by writing the value it measures ·
**any purple** outside KIVULI · an `ANCHOR-SPLIT` metric that passes under one anchor and fails under
the other · a grade justification that is not lane N (numeric), P (pictorial) or I (internal).

⚠ **No axis may be graded above C if its own known-bad injection was not run in the same session.**
A harness that has not been shown to detect the fault is not evidence that the fault is absent.

⚠ **DEFAULT TO REJECT WHEN UNCERTAIN.** A hedge is a pass, and this repo's history is a list of
hedges that shipped.

---

# 4. THE OPEN RULINGS

Only genuinely blocking items. Each answerable in one line.

| id | question | default if unanswered |
|---|---|---|
| **R-A** | **The intercept — speed gate or reach gate?** `pw-bfp-source.md:490` says `CATCH_SPD = 132` was **invented** and the model is wrong (BFP has no speed test at all — it is a pure-reach teleport at 700qu) and item 1 at `:564` says *"keep the range, drop the speed gate."* `POWERWORLD.md:441` says the catchability was *"an accident worth making deliberate."* Three specs flag it. **Reach makes air combat readable; speed makes committing to a swoop cost something.** | **NOBODY BUILDS IT.** `game.js:2094-2133` and `core/util.js:76-85` are frozen for the whole plan |
| **R-B** | **Do melee startup/active/recovery frames apply in the CITY, or only in PowerWorld?** A punch with no startup is a defect everywhere and the block-state model has nothing to hang on without it — but it is a **roster-wide balance event**, felt in every city duel, the boxing mode and the tutorial. | **GLOBAL**, with the AI-vs-AI balance audit in Wave 3's gate. If ruled PowerWorld-only it becomes one `gaitAllows` tag with no rework |
| **R-C** | **Which clinch formula is canon?** `melee.js:290` ships a linear strength difference; `martial.js:123` `clinchWindow()` is a squared **rank** ratio that reconciles two numbers of yours a linear model cannot both satisfy (1.40s at even rank AND 0.36s at rank 40 vs 79) and is the only thing that pays off the medical layer. Adopting it **changes every clinch duration in the game.** | **Adopt `clinchWindow()`** |
| **R-D** | **The unit anchor.** BODY (1qu = 0.1714wu, from the 56qu player against our 9.6u fighter) or ARCHITECTURE (1qu = 0.094wu). They disagree by **1.82×**, and it is the difference between BFP's 700-unit dive being **120wu** or **66wu**. | **BODY**, per `aaa-08 §2.2`. Every converted number states its anchor; only R-A's row changes outcome |
| **R-E** | **Does the body pitch loop, and does the camera?** BFP deliberately lifts the pitch clamp in flight (`bg_pmove.c:3425`, and the dev journal: *"got around the gimble lock so you can go upside down"*). Ours is third-person over-the-shoulder with an implicit world up-vector, so looping the **camera** makes the shoulder offset and the angular shake both roll-dependent — a camera rewrite for one manoeuvre. | **The body gets it (one term, free, and it is the half a player sees); the camera does not.** If you want the camera loop it is its own screenshot-graded loop |
| **R-F** | **Does flight cost ki?** BFP charges **50 ki/s** to fly and **350** to boost, and it buys the most evocative progression in the source — 35 seconds of sky at spawn, infinite at max power, from one subtraction. But `_openSky` means *every character can fly*, so a per-second tax grounds the low-ki half of the roster by the back door and recreates the deck ladder in economic form. | **No flight tax.** Progression goes on **speed**, not endurance (`plGain`). ⚠ Both BFP figures are the reconstruction author's own fitted values, trust tier **D** |
| **R-G** | **Is 210 u/s the right air cap?** It is derived from the chase camera's own eye-damp λ and 86u distance clamp, i.e. a **readability** bound rather than a power-fantasy one. BFP's own number in our units is **261** and it produced a complaint that ran unchanged from 2002 to 2024. At max power a burner hero then cruises **1.84× the catch line**, so teleport-intercept becomes optional at the top of the ladder. | **210**, and the shot A2 decides it. Flagged rather than discovered |

---

# 5. WHAT WE WILL NOT DO, AND WHY

A plan with no cuts is a plan nobody has thought about. Each of these was specced or proposed and is
deliberately out of scope.

1. **The camera view loop.** R-E takes the body half and refuses the camera half. BFP's loop is free
   in **first** person — there is no third body to frame and no shoulder offset, so "upside down"
   costs nothing. Ours makes `world.js:2307`'s shoulder offset and `:2316`'s angular shake both
   roll-dependent. **Not worth a camera rewrite for one manoeuvre.**

2. **A flight ki cost.** R-F. It is the best progression idea in the source and we are refusing it on
   purpose, because `_openSky`'s whole promise is *every one of the 52 gets both grammars with no
   exceptions*, and an endurance tax is the deck ladder wearing an economy.

3. **Anything built on the intercept.** R-A freezes `game.js:2094-2133` and `core/util.js:76-85`
   entirely. ⚠ `catchK` is expressed as a **multiple** of `kb` specifically so one dial moves both —
   touching one silently deletes teleport-intercept, which is the dimension's signature technique.

4. **A mode banner, a HUD word, an AIR/GROUND icon.** The four readability channels are the
   controls, the character (footsteps, pose, the ring gap), the camera and the audio — and **three
   of the four already exist and are currently broken or unwired**, which is the cheapest possible
   answer. `game.js:185-190` is the record: a nameplate reading *"TRANQUILITY REACH · THE MOON"*
   while standing on a rock spire in PowerWorld. **If the grammar is not readable from the
   character, the camera and the controls, adding text does not fix it — it hides it.**

5. **Retuning `AIR_DRAG`, `entity.js:1594`'s accel `9`, or the ground drag `6`.** §1.8 item 4. A
   future "port Q3 movement" pass landing on 10/1/6 would be a silent regression on the axis this
   project's flight feel was measured into. The air stopspeed term (C5) is **additive** and bites
   only below 31% of top speed — it is not a retune of the coast.

6. **Fall damage on an intentional landing.** `_slam`'s `launchT` gate already answers it, and
   modelling it by *speed* is the same design error as `CATCH_SPD`: the real rule is about **agency**,
   and agency is already expressed. Likewise **`SETTLE` gets no i-frames** — `game.intercept` sets
   `f.invuln = 0` explicitly with the comment *"NO i-frames: both lanes grant them by default"*, and
   a mercy window at a landing would make touching the ground a defensive option and hollow out the
   air fight. `openjk.md:1701` agrees from the other side: *"A roll has NO invulnerability … the
   dodge is positional, not a mercy window."*

7. **A `strikeCd` refund on landing.** It would teach the player to bounce off the floor to cancel
   recovery. The reason to land is the **grammar** — a different moveset, guard that works, the
   `def.art` styles — not a mechanical discount.

8. **Scaling pooled-light intensity by distance-to-camera** (proposed at `pw-impact.md:391`). It is
   **wrong**: a `PointLight` illuminates *surfaces*, and light-to-surface distance is identical in
   both cameras. Acting on it is real risk for zero gain, and every rule in the impact spec must be
   implementable **without changing the visible light count** — measured cost of breaking that once:
   **+152 programs in 4 seconds, a 400 ms freeze.**

9. **`logarithmicDepthBuffer`** for the `near`-plane question. It is a `WebGLRenderer` **construction**
   flag, cannot be toggled at runtime, and changes every material's program. The `near` question is
   settled by running `world.auditSurfaces()` *from the chase camera* — **a measurement, not an
   argument.**

10. **Correcting our beam toward BFP's.** §1.8 item 1. Their beam is a straight laser re-aimed every
    frame; ours is a stream of packets. Mouse-look makes players sweep harder, which makes the
    difference more visible. Do not "fix" the crosshair to lead a bent beam either — it promises the
    **firing direction**, and that goes into the manual.

11. **Hero voice lines.** `docs/VOICE_AND_SFX.md`'s 52 × 8 AI-TTS bark manifest is struck, not
    rebuilt. The engine already defaults to that position — `audio.heroVoice` is **false** by default
    and yell/grunt/cry all gate on it. Out unless a human records them.

12. **Full limb segmentation.** Wave 5 ships **Phase A only** — the elbow, 2 Groups and 0 meshes,
    because it is the prerequisite for `handMult` measuring a real quantity. The remaining +4 meshes
    / +6 Groups, the wrist, and the netplay wire-format question stay parked.

13. **Vertical evade, per-ability aim convergence, the gamepad's isometric aim basis, `pickTargetDir`'s
    missing `_vis` gate, and `hardLock` tracking through walls.** All real, all in the ledger, all
    named in the specs as explicitly *not covered* — listed here so nobody believes they were.

14. **A nuclear district, interiors in PowerWorld, real tunnels, and traffic on the road graph.**
    Untouched by this plan and unrelated to the thesis.

---

## THE FIVE-LINE VERSION

- **One field decides everything: `f.gait`.** `flying` stays true on the PowerWorld floor
  (`entity.js:1450`) and it is the proxy **ten** shipped systems use for "in the air" — including the
  footstep layer, which has never once fired in the dimension.
- **One law decides the seam:** input ownership changes on a single frame edge and belongs to the
  **destination** grammar; presentation ramps after. That is what makes a landing seamless *and*
  incapable of eating an input.
- **The waves exist because six lanes want three files.** `entity.js` goes GAIT → AIR → GROUND → ARM;
  `world.js` goes VIEW ×3 → IMPACT; `game.js` goes MARK → GAIT → IMPACT → AI. Nothing else in the
  ordering matters as much.
- **The reticle comes first** because the thesis names it first and because everything downstream
  aims through it — and the miss is **not** the constant 6.8u the research says; it is 0.47u close in
  and **7.98u at 100u**, worst exactly where the air fight lives.
- **The gate that decides it is a picture.** This repo has shipped a ring 4× too big, an audience
  built outside the frame, black rubble and a black sky, each behind green assertions. **A missing
  frame is an F regardless of the numbers.**

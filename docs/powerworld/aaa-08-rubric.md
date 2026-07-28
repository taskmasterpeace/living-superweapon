# AAA-08 — THE CRITIC RUBRIC

**What this is.** The protocol a fresh-context critic subagent runs to decide whether PowerWorld's
air grammar holds up against Bid For Power and its ground grammar holds up against Jedi Academy —
and, when it does not, the exact number and the exact frame it must name when it sends the work
back.

**The owner's instruction, verbatim:**

> *"have a separate sub-agent check it visually and mechanically to ensure it feels triple-A. That
> separate sub-agent should be a really harsh critic, and if it doesn't meet the standard, it should
> keep going. Don't stop until each sub-agent is utterly wowed with the quality when compared with
> real Bid for Power in the air and real Jedi Academy / OpenJK on the ground. It should literally
> compare them side by side blind (movement feel, camera behavior, reticle accuracy, impact,
> transitions) and say which one feels better."*

---

## 0. THE FIVE-LINE VERSION

1. **"Feels AAA" is not assertable, so it is decomposed into 31 numbers across five axes** (§1), each
   captured by driving the real input path in a running game, each with a pass band whose derivation
   is shown.
2. **We cannot run BFP or JKA, and pretending otherwise would be the dishonest move.** What we can do
   is compare **our measured number against their source constant, converted** (§2) — plus a genuine
   blind comparison of *static composition* against the 21 real reference frames in `docs/reference/`,
   which is the one place a true side-by-side is available (§3).
3. **Every look claim needs a picture** (§3). This repo has shipped a ring 4× too big, an audience
   built outside the camera frame, black rubble and a black sky, each with green assertions standing.
4. **The critic defaults to REJECT** (§4). A pass requires every mandatory metric in band *or* a
   written, cited divergence; a missing frame is an automatic F on that axis regardless of numbers.
5. **A verdict from an unproven harness is INADMISSIBLE, not merely failed** (§5). Every run proves
   itself against a known-good *and* a known-bad injection before any number it reports counts.

---

## 1. THE MEASURABLE SUBSTITUTES

### 1.0 The three rules that govern every metric below

**RULE M-A — DRIVE THE GATE.** No metric may be produced by writing the quantity it measures.
Ascend is pressed through `KEYMAPS[SETTINGS.scheme].up`, never `f.pos.y = …`; a punch is thrown
through `melee.js`, never by writing `_shake`. This repo lost the orbit-ceiling test, the open-sky
flight test, four consecutive direction-triangle tests and a whole melee-feel A/B to this exact
mistake (`aaa-00-ground-truth.md:748`; CLAUDE.md, THE DIRECTION TRIANGLE).

**RULE M-B — ASSERT THE RELATIONSHIP, NOT THE VALUE, WHERE ONE EXISTS.** The reticle axis is a
relationship (`aaa-05-reticle.md:756`). The transition axis is a relationship (momentum delta equals
drag and gravity alone, `aaa-03-transition.md` M4a). A relationship survives a re-tune; a value does
not, and a value-based test goes red on every legitimate change, which is how a suite gets ignored.

**RULE M-C — THE INSTRUMENT MUST MATCH THE QUANTITY.**
- *Sim numbers*: stub `world.render`, batch-time ≥3,000 frames. A hidden pane renders at 0×0 and
  `world._ema` reads ~98 ms (CLAUDE.md, ATLAS v1).
- *GPU numbers*: `EXT_disjoint_timer_query_webgl2` or `gl.finish()`, **at 3840×2160**, tab
  foregrounded, `renderer.info.autoReset = false`. At 720p every effect in this engine has measured
  a **negative** delta — the work is smaller than frame-to-frame variance (CLAUDE.md, THE LOOK
  LADDER; `docs/POWERWORLD.md:550`).
- *Pixel numbers*: read the **drawing buffer in the same task as the render**. The renderer has no
  `preserveDrawingBuffer`; a later read is blank. A page screenshot captures the DOM, i.e. the HUD
  (CLAUDE.md §43; `aaa-06-impact.md:1160`).
- ⚠ **Clear the renderer's scissor rect and viewport before any manual `world.render()`** — the news
  crew leaves a 320×180 rect and the shot comes back black except one corner (CLAUDE.md §42).

---

### 1.1 MOVEMENT FEEL — 8 metrics

Harness lane: `src/bench/pwmove.js` → `LSW.pwMoveSuite()`, on the shape of `src/bench/powerworld.js`.

| # | metric | how it is captured | band | derivation of the band |
|---|---|---|---|---|
| **V1** | **time to 95 % of air top speed**, from rest, forward held | press the scheme's forward key, sample `hypot(vel)` each frame, first frame ≥ 0.95·plateau | **1.50 – 1.75 s** | BFP's closed form is `ln(20)/pm_flightfriction = ln(20)/2.0 = 1.498 s` (§2.4a). Ours at `AIR_DRAG 1.8` is `ln(20)/1.8 = 1.664 s`. ⚠ The band in `aaa-01-air.md:1016` is **[1.55, 1.75]**, which brackets *our* drag and **excludes BFP's own figure** — see §2.6, FINDING C |
| **V2** | **stop distance from 100 u/s**, all input released | integrate `pos` from release to `\|vel\| < 0.5 u/s`, cap 6 s | **45.7 – 56.0 u**, and it must **terminate** | BFP: two-phase, 45.7 u and reaches exactly zero (§2.4b). Ours: `v0/AIR_DRAG = 55.6 u` and **asymptotic** — we have no `pm_stopspeed` term (`aaa-02-ground.md:1128` lists it *absent / add*). A run that never crosses 0.5 u/s is a **structural fail**, not a numeric one |
| **V3** | **reversal distance from 100 u/s** — full-reverse held at t0 | distance travelled in the original direction before `vel·dir0 < 0` | **16 – 18 u** | `aaa-01-air.md:1017` |
| **V4** | **input-to-motion latency**, air and ground | press through the real key path on frame *n*; first frame with `\|vel\|` change ≠ 0 attributable to input | **exactly 1 frame**, at every one of 9 press offsets, for move / ascend / descend / guard / strike / one power slot | `aaa-03-transition.md` M2. **0 or >1 is a fail** — 0 means the harness wrote the value |
| **V5** | **turn radius at cruise** — full lateral input held at 100 u/s | fit a circle to 60 frames of `pos` | report p50; **band opens at first measurement**, then locked ±12 % | ⚠ No source constant exists. BFP turning is an emergent consequence of `PM_Accelerate` on a rotated `wishdir`, not a parameter. **Declared un-anchored** (§2.7) |
| **V6** | **ground run speed** | forward held on the floor, plateau `hypot(vel.x, vel.z)` | **38.6 – 47.2 u/s** | JKA `g_speed 250` (`openjk.md:1596`) → 42.9 u/s at the body anchor, ±10 %. Ours today 27–45.4 (`aaa-02-ground.md:1119`) — **the low end fails** |
| **V7** | **ground stop distance from run speed** | as V2, on the floor | must terminate in **< 0.45 s** | JKA's `pm_stopspeed 100 qu/s` gives a hard stop; we have none on the ground either. A superhero who slides to a halt on tarmac reads as ice |
| **V8** | **launch carry — a real haymaker** | RAGE haymaker on SOL through `melee.js`, PowerWorld, measure travel and peak speed | **≥ 13 body lengths (125 u)**, peak ≥ 95 u/s; **CITY control unchanged at 7.2 u** | manual §47 / `docs/POWERWORLD.md:673`. ⚠ The previous pass tuned this on a **synthetic 101 u/s impulse** and missed that a real punch leaves at 49.2 u/s. **A synthetic impulse is not admissible for V8** |

⚠ **V1–V3 must be measured on at least four fighters spanning the flight ladder** — a `flightTier 0`
grounded bruiser, a tier-2 levitator, a mid tier-3, and the fastest burner (SOL). One fighter's
numbers are not the mode's numbers; `aaa-04-camera.md:929` records a levitator flying its own top
speed reaching `k = 0.275` where the design assumed ≥0.95.

---

### 1.2 CAMERA BEHAVIOUR — 7 metrics

Harness lane: `src/bench/pwcam.js` → `LSW.pwCamSuite()`. Subject: `world.chase()`
(`world.js:2242-2327`).

| # | metric | how it is captured | band | derivation |
|---|---|---|---|---|
| **C1** | **eye-damp rate λ** | step a known position discontinuity, fit `1 − e^{−λt}` over 30 frames | **6.1 – 8.2 /s** | JKA `cg_thirdPersonCameraDamp 0.3` → `−ln(0.7)/0.05 = 7.13 /s` (§2.4c), ±15 %. Ours today **8** — passes |
| **C2** | **look-point damp rate λ** | same, on the look target | **11.8 – 15.9 /s** | JKA `cg_thirdPersonTargetDamp 0.5` → `−ln(0.5)/0.05 = 13.86 /s`. Ours today **9** — **FAILS by 35 %** |
| **C3** | **the ratio λ_look / λ_eye** | C2 / C1 | **1.7 – 2.1** | JKA is `13.86/7.13 = 1.94`. Ours is `9/8 = 1.13`. ⚠ **This is the metric, not C1 or C2 individually** — the two channels damping at *different* rates is the structural idea (`openjk.md:117`), and a matched pair is a single-channel camera wearing two names |
| **C4** | **stiffener engagement** | drive yaw at 400 / 1,200 / 2,000 / 3,000 °/s through `controlPlayer`; record the applied λ multiplier | 400 → **×1.00**; 1,200 → **>1.00**; 3,000 → **≥ the 2,500 saturation value**, monotonic | JKA: no stiffening below `1.0 °/ms` = **1,000 °/s**, saturate at `2.5 °/ms` = **2,500 °/s**, shaving 0.75 of the remaining lag (`openjk.md:220`). **Angular rates need no unit conversion** (§2.2) |
| **C5** | **flick residual** | 180° flick through the real mouse path; angular error at t+0.25 s | **< 8°** stiffened, **> 40°** with `stiff` forced 0 | `aaa-04-camera.md:914`. The second half is the known-bad (§5) |
| **C6** | **clip-through count** | 60 s AI-vs-AI in a generated Mega City (79–99 cover pieces), ≥3,600 frames: `camPos` outside every `world.cover` AABB and every `world.interiors[].walls` box inflated by `CAM_PAD`, and `camPos.y ≥ heightAt + CAM_PAD` | **0 violations**, plus **a screenshot of the smallest-clearance frame** | `aaa-04-camera.md:894`. ⚠ `world.chase()` writes `c.position` straight from `camPos` and **tests nothing** today (`openjk.md:2086`) |
| **C7** | **continuity across a takeoff** | scripted vertical climb `gh 0 → 20`; max per-frame delta of `g`, `_chaseFov`, `_chaseDist`, eye-height fraction | each **< 3 % of that quantity's own range** | `aaa-04-camera.md:975`. This is the numeric form of *"the camera never cuts"* — the thesis's own words |

⚠ **C-SHAKE (belongs to §1.4 but is measured here):** with `_shake` driven to its clamp of 8 through
`world.shake()`, angular deviation from rest **≤ 1.25°**, per-frame step at `dt = 1/40` **≤ 1.35°**,
and camera **position** deviation exactly **0.0 u** (`aaa-06-impact.md:1046-1051`). Today the peak is
**2.04°** and the ladder saturates from `_shake ≥ 2.545`, i.e. a jab and an overpower shake the same.

---

### 1.3 RETICLE ACCURACY — 5 metrics

Harness lane: `src/bench/reticle.js` → `LSW.reticleSuite()` (spec: `aaa-05-reticle.md:766`).

**The invariant** (`aaa-05-reticle.md:758`):

> Every frame, in every aim state, the ray from the player's real muzzle along the player's real
> `aim3` passes within **N** of the world point the crosshair is drawn at.

| # | metric | capture | band |
|---|---|---|---|
| **R1** | **static miss, 8 gaps** — 10, 16, 24, 32, 40, 52, 70, 100 u | pin both bodies to **absolute** positions, let the real `controlPlayer` run, step 120 frames, **assert camera settlement** (`\|Δ camPos\| < 0.05 u` between the last two frames) before reading | **≤ N_EXACT = 0.35 u** at every gap |
| **R2** | **vertical and degenerate** — foe 45° above at 40 u and 70 u; foe **directly overhead** (the `horiz < 0.35` branch, `world.js:2266-2269`); muzzle pitch ≈ 80° | as R1 | **≤ 0.35 u**. ⚠ Without the muzzle fix the pitched case reads **3.35 u** (`aaa-05-reticle.md` check 4) |
| **R3** | **lock states** — hard lock via `cycleLock`, soft-lock magnet, free aim | plus: `world.screenPosOf(aimPoint)` must land **within 1 px** of the crosshair element's drawn position | ≤ 0.35 u **and** the 1 px agreement. A miss measured against a point the crosshair is not drawn at measures nothing |
| **R4** | **live fight** — 60 s AI-vs-AI in PowerWorld, sample every frame | report **p50 / p90 / worst** | worst **≤ N_HIT = 2.2 u** (one body radius; one frame at cruise is 1.67 u of travel, so nothing tighter is meaningful against a mover) |
| **R5** | **honesty** — foe at `_vis = 0.2` under the crosshair; and `p.blindT = 1` | the trace must **not** converge on or stop at that body | 0 convergences. The reticle must not become a wallhack |

**Why 0.35 u:** `DECAL_LIFT` in `core/util.js` — this project's own declaration of the smallest
separation that means anything at this scale, 1/6 of a fighter's 2.2 u radius, 6.6 cm at 1u ≈ 0.19 m
(`aaa-05-reticle.md:766`). It is **taken, not invented**.

**The source value is 0.00 u by construction.** JKA traces from the character along the character's
own aim and then draws the crosshair at the projected hit point (`openjk.md:2072`, fix A) — nothing
is ever bent. **This is the one axis where the source is perfect and we can be exactly as good**, so
the bar is strict and there is no acceptable declared divergence. Ours today: **0.91 / 3.18 / 7.98 u**
at gaps 10 / 40 / 100 (`aaa-05-reticle.md:939`, correcting `openjk.md:2045`'s "constant 6.8 u").

---

### 1.4 IMPACT — 6 metrics

Harness lane: `src/bench/pwimpact.js` → `LSW.pwImpactSuite()` (spec: `aaa-06-impact.md:1073`).

| # | metric | capture | band |
|---|---|---|---|
| **I1** | **SILHOUETTE DELTA** | render each frame **twice in the same task** — once normally, once with the opponent's figure group `visible = false`; mean absolute Rec.709 luminance difference inside the CENTRE box | **> 12** (0–255) through the entire worst-case sequence, **including the impact frame** |
| **I2** | **no blowout** | CENTRE pixels with `L > 235` | **< 2 %** on every frame except the single impact frame |
| **I3** | **the impact frame is exactly one frame** | CENTRE mean over three consecutive frames | `~L0 → ~(255 − L0) → ~L0`; then re-run with `fxImpact false` and the middle sample **stays at `~L0`** |
| **I4** | **shake dynamic range** | jab → cross → haymaker → overpower, peak angular displacement each | **≥ 4.2× jab→overpower**, and flat **only above `_shake` 6.94**. Today: 4.0× and flat above *cross* |
| **I5** | **hitstop discipline** | every strike path | attacker's hitstop **≤** victim's (invariant); pose delta across the freeze — `armR.rotation.x`, `legL.rotation.x` — **exactly 0.000** |
| **I6** | **the centre is not in the DOM's way** | after `hud.update()`, walk `#hDmg`, `#hHits`, `#comicLayer` | **no** bounding rect intersects the CENTRE box |

⚠ **I1 IS THE ONE THAT MATTERS AND IT IS THE ONLY ONE THAT CANNOT BE GAMED BY TURNING EVERYTHING
DOWN.** "The frame is dark" is not the claim; *"the centre of the screen still contains a readable
opponent"* is (`aaa-06-impact.md:1077`).

⚠ **THE IMPACT AXIS HAS NO USABLE SOURCE CONSTANT AND THE CRITIC MUST SAY SO.** BFP's knockback
(`damage² × 0.1`, melee factor 7.5 at damage 10 → 75) passes through `g_knockback` and a mass term
that `pw-bfp-source.md:264` does not record, so it **cannot be converted into our units defensibly**.
Every attempt to do so is arithmetic dressed as evidence. The impact axis is graded against I1–I6,
the body-length target in V8, and the reference frames in §3 — and the citation column for it reads
**"no source constant; internal + visual only."**

---

### 1.5 TRANSITIONS — 5 metrics

Harness lane: `src/bench/transition.js` → `LSW.transitionSuite()` (spec: `aaa-03-transition.md:667`).

| # | metric | capture | band |
|---|---|---|---|
| **T1** | **no frame is ungoverned** | 10,000 driven frames, randomised input, 2 fighters; sample `GAIT_OWNER[f.gait]` every frame per living fighter | ∈ {`ground`,`air`,`none`} on **100.00 %**; `none` **only** while `staggerT > 0` |
| **T2** | **a transition eats no input** | on the contact frame and each of the next 8 frames, press strike / ascend / descend / guard / one power through the real key path | **exactly 1 frame** to response, at every offset, for every action |
| **T3** | **momentum carries** | record `vel` on the frames either side of every gait change with input held constant | `Δv` equals that frame's `dragF` (`entity.js:1417`) + gravity alone, within **1e-3**. Any other delta is a transition writing velocity |
| **T4** | **a self-inflicted landing never hurts** | 500 dives at the −160 clamp with `launchT = 0` | **0 damage, 0 `_slam`, 0 `CRASH`** |
| **T5** | **the knockback dip does not cancel flight** | 200 launches into the floor, `impact` varied across the −38 boundary | `≥ −38` → SETTLE, `flying` still true, no damage; `< −38` → CRASH, damage ≤ 32 credited to `lastHitBy`, and gait returns to AIRBORNE after `staggerT` in **100 %** of cases |

⚠ **T-BLIND is mandatory and is not soft** (`aaa-03-transition.md:709`, M9): a reader shown a **still,
HUD hidden**, must name the live grammar correctly in **≥ 11 of 12** frames (6 gaits × 2 sides). T1–T5
can all pass while the transition is invisible to a human, because **none of them can see it**.

⚠ **THE PRECONDITION FOR THIS ENTIRE AXIS.** `aaa-00-ground-truth.md:727` records that `flying` is
**true while standing on the PowerWorld floor**, so any rule of the form "on the ground, do X" cannot
be written against `f.flying` or `f.grounded` as they exist. If `f.gait` is not present when the
critic runs, **the transitions axis is scored F and the other four axes are still scored** — it is a
missing feature, not a broken harness.

---

## 2. THE BLIND A/B PROTOCOL

### 2.1 ⚠ SAY THE LIMIT OUT LOUD FIRST

The owner asked for a literal blind side-by-side. **We cannot run Bid For Power or Jedi Academy, and
no protocol in this document should be read as claiming otherwise.** What exists is:

- **BFP** — a **reconstruction** on the Quake III SDK (`LegendaryGuard/BFP`, commit `d06afa2`), read
  with `file:line` for every claim, whose author annotates which numbers he **guessed**
  (`pw-bfp-source.md:9-33`).
- **JKA / JO** — the **actually released** Raven source. Constants here are real shipped values.
- **21 real reference frames** in `docs/reference/` — 5 BFP, 4 Ultra BFP, 3 ESF, 9 Dragonball Unreal.
  These are genuine frames of the genuine games and they support a **real** blind comparison of
  static composition (§3.4).

So the protocol has **three lanes**, and a critic must label every claim with which lane produced it:

| lane | what it compares | what it can conclude | what it can never conclude |
|---|---|---|---|
| **N — numeric** | our measured number vs their converted source constant | "our air brake is 22 % longer than BFP's and never reaches zero" | anything about how it feels |
| **P — pictorial** | our captured frame vs their real frame, on measured composition | "our subject occupies 4.1 % of frame height; BFP's occupies 9.6 %" | anything about motion |
| **I — internal** | our number vs our own spec's target | "the silhouette delta held above 12 through the overpower" | anything comparative |

**Anything not in one of those three lanes is an opinion and is inadmissible as a grade
justification.** It may appear in the report under `NOTES`.

### 2.2 THE CONVERSION — and which constants need it at all

**Rate constants do not convert.** Quake's `PM_Accelerate` computes
`accelspeed = accel · frametime · wishspeed`, so `accel` carries units of **1/s**; `PM_Friction`'s
coefficient likewise. Angular rates (the stiffener's °/ms) and times (hit stun 3,000 ms) are also
unit-free with respect to length. **These transfer verbatim and a conversion applied to them is an
error.**

**Length and speed constants need an anchor, and there are two defensible ones that disagree by
1.82×.** Both must be stated on every converted row.

| anchor | reasoning | 1 qu = | 1 wu = |
|---|---|---|---|
| **BODY** (default) | Q3/JKA player standing height **56 qu** (bbox −24..32) = our fighter's **9.6 wu** | **0.17143 wu** | 5.833 qu |
| **ARCHITECTURE** | Q3 is conventionally ~**56 qu per metre**; our 1 wu = 0.19 m | **0.09398 wu** | 10.64 qu |

⚠ **THE DISAGREEMENT IS ALREADY ON RECORD AND IS UNRESOLVED.** `pw-bfp-source.md:564` converts BFP's
700-unit dive range with the architecture anchor and gets **66 wu**; `aaa-02-ground.md:37-60` uses the
body anchor and gets **120 wu**, and requests a ruling (§9 Q1). **The critic does not resolve this.**
It reports both columns and marks the row `ANCHOR-SPLIT` — and if a metric passes under one anchor
and fails under the other, **that is a REJECT with a ruling request attached** (§4.5), not a coin
toss.

**Default for this rubric: BODY.** A run speed, a jump height, a punch reach and a camera standoff
are all body-relative quantities, and converting them at world-architecture scale produces a fighter
who moves like a doll (`aaa-02-ground.md:56`).

### 2.3 THE TRUST LADDER — not every source constant weighs the same

| tier | what | example | how the critic weights it |
|---|---|---|---|
| **S** | shipped JKA/JO source, released by Raven | `cg_thirdPersonCameraDamp 0.3` (`openjk.md:76`) | a numeric failure against it is a real failure |
| **A** | BFP's own shipped `.cfg` data files | anything under `cfgs/` (`pw-bfp-source.md:34`) | same as S |
| **B** | reconstruction C code marked as a deliberate BFP-vs-Q3 delta | `pm_flyaccelerate 2.0`, `// BFP - Add less flight acceleration, before 8.0f` (`pw-bfp-source.md:31`) | strong; a failure is a finding |
| **C** | reconstruction C code, unannotated | `g_meleeDiveRange 700` | usable; a failure is a **question**, not a verdict |
| **D** | ⚠ **the author's own admitted invention** — the ki-boost cost formula (`g_active.c:431`), the block cost (`:457`), the `random() < 0.75` (`:453`), the melee-range approximation (`g_weapon.c:258`) | `pw-bfp-source.md:17-24` | **never grounds a grade.** Cite it as colour only |
| **X** | claims present in our research with **no traceable source** | the "±80° fly tilt from demo dumps" (`pw-bfp-source.md:479` — *"I found no ±80 anywhere in this tree"*); `openjk.md:2107`'s CAMERA_SIZE "roughly 2–3u" (§2.6, FINDING B) | **inadmissible.** Flag it and move on |

### 2.4 THE WORKED CONVERSIONS — the arithmetic is shown so it can be checked

**(a) Air acceleration → time to 95 % of top speed.**
BFP applies friction then acceleration each frame, so `v' = a·W − k·v` with `a = pm_flyaccelerate 2.0`,
`k = pm_flightfriction 2.0` (`pw-bfp-source.md:74-75`), giving `v(t) = W(1 − e^{−kt})`, terminal
`v = a·W/k = W` — i.e. the acceleration coefficient sets the *ceiling* and friction sets the *rate*.
`t₉₅ = ln(20)/k = 2.9957/2.0 = ` **1.498 s.**
Ours: `AIR_DRAG 1.8` (`entity.js:29`) → `2.9957/1.8 = ` **1.664 s** — **11.1 % slower to top speed.**

**(b) Air stop distance from 100 u/s.** Two phases, because Q3's `PM_Friction` uses
`control = max(speed, pm_stopspeed)` and `pm_stopspeed` is **100 qu/s, unchanged in BFP**
(`pw-bfp-source.md:80`):
- 100 wu/s = **583.3 qu/s** (body anchor).
- Phase 1, `v > 100 qu/s`: exponential at `k = 2.0` → `d₁ = (583.3 − 100)/2.0 = 241.7 qu = ` **41.4 wu**, `t₁ = ln(5.833)/2 = 0.881 s`.
- Phase 2, `v ≤ 100 qu/s`: `control` pins at 100, so deceleration is a **constant** `100 × 2.0 = 200 qu/s²` → `d₂ = 100²/400 = 25 qu = ` **4.29 wu**, `t₂ = 0.5 s`.
- **Total 45.7 wu in 1.38 s, arriving at exactly zero.**

Ours: pure exponential, `d = v₀/AIR_DRAG = 100/1.8 = ` **55.6 wu**, **asymptotic — we never stop.**
→ **+21.7 %, and a categorical difference.** `aaa-02-ground.md:1128` already flags `stopspeed` as
absent on the ground; **this document is the first to note it is absent in the AIR too**, which is
where it matters more, because a flier who cannot come to rest cannot hold a position.

**(c) JKA camera damping → our λ.** JKA's damp value is *the fraction of the gap closed per 50 ms*,
so the fraction **remaining** is `1 − damp` and `λ = −ln(1 − damp)/0.05`:
- `cg_thirdPersonTargetDamp 0.5` → `−ln(0.5)/0.05 = ` **13.86 /s**
- `cg_thirdPersonCameraDamp 0.3` → `−ln(0.7)/0.05 = ` **7.13 /s**
- and at ±89° of pitch, JKA's dampfactor rises to 0.72 → **25.5 /s** (`openjk.md:243`)

Ours (`world.js:2288-2311`): eye **8/6/8**, look point **9/7/9**.
- eye **8 vs 7.13** = +12.2 % — **PASS**
- look point **9 vs 13.86** = −35.1 % — **FAIL**
- ratio **1.13 vs 1.94** — **FAIL by 1.7×**

⚠ **THIS INDEPENDENTLY SETTLES AN OPEN QUESTION.** `aaa-04-camera.md:997` lists the 9/7/9 → 13/10/13
raise as *"a proposal from an arithmetic comparison with JKA's cvars, not a measurement."* The
conversion above gives **13.86**, so the proposed **13** is right to **6.2 %**. The proposal is
sound; the open question can be closed on arithmetic, and only the *feel* half needs Loop 5's matrix.

**(d) The stiffener.** No conversion — `1.0 °/ms` = **1,000 °/s** engage, `2.5 °/ms` = **2,500 °/s**
saturate, shaving 0.75 of the remaining lag (`openjk.md:220`).

**(e) Camera standoff.** `cg_thirdPersonRange 80` (`openjk.md:71`) → **13.71 wu** (body) / 7.52 wu
(architecture). Ours: `DIST_MIN 24` → 86 wu. **1.75× – 6.3× JKA's.** This is a **DECLARED
DIVERGENCE** and must remain one (§4.4): a BFP-scale air fight between bodies 143 u apart cannot be
framed from 13.7 u, and `aaa-04-camera.md` derives the distance from the pair's separation. A
divergence is only legitimate while it is *written down with its reason*.

**(f) The BFP melee triangle** — the numbers that make air melee a game rather than a hold
(`pw-bfp-source.md:246-306`): dive range **700 qu** = 120.0 wu (body) / 65.8 (arch) — `ANCHOR-SPLIT`;
melee range **32 qu** = 5.49 wu; the dive's minimum engagement distance **77 qu** = 13.2 wu; hit stun
**3,000 ms** victim / **6,000 ms** attacker self-cooldown (no conversion); Zanzoken escape **500 qu**
= 85.7 wu, **5 % of max ki**, tap window **50–240 ms**, **100 ms commitment before the escape opens**,
10 uses then a **2 s** lockout, **70 ms** between.

### 2.5 THE COMPARISON TABLE THE CRITIC FILLS IN

One row per metric. **The verdict column is written before the SOURCE column is revealed** (§2.8).

```
| id | axis | ours (measured) | source (converted) | anchor | trust | Δ | band | verdict |
```

`verdict ∈ { PASS, FAIL, DIVERGENCE-DECLARED, DIVERGENCE-UNDECLARED, ANCHOR-SPLIT, NO-SOURCE }`.

A `NO-SOURCE` row is graded on the internal band only and **must** carry the note
*"no source constant; internal + visual only"* — silently grading it as if it were compared is the
single easiest way for this protocol to become theatre.

### 2.6 FINDINGS THIS PROTOCOL PRODUCED ON ITS FIRST PASS

Written down because a rubric that has never caught anything has not been tested.

- **FINDING A — our air brake has no `stopspeed` term.** §2.4b. We coast 21.7 % further than BFP and
  **never reach zero**. Not previously recorded for the air.
- **FINDING B — `openjk.md:2107`'s camera pad is not reproducible.** It reads *"`CAMERA_SIZE 4` on a
  ~64u-tall player; at WWA's 1u ≈ 0.19m that is roughly 2–3u."* Under the body anchor 4 qu = **0.686
  wu**; under the architecture anchor **0.376 wu**. **Neither is 2–3.** Trust tier **X**. `CAM_PAD`
  must be derived from the near plane as `aaa-04-camera.md` §3 does, and the "2–3u" figure must not
  be used to justify it.
- **FINDING C — the V1 band is self-referential.** `aaa-01-air.md:1016` sets time-to-95 % at
  **[1.55, 1.75] s**, which brackets our own `AIR_DRAG 1.8` (1.664) and **excludes BFP's own 1.498**.
  That is legitimate *only* as a declared divergence with a reason; as written it reads as a
  BFP-derived target and is not one. **This rubric widens the band to [1.50, 1.75]** so BFP's figure
  is inside it, and asks for the divergence to be declared or the drag to move to 2.0.
- **FINDING D — the look-point damp question is closeable on arithmetic.** §2.4c.
- **FINDING E — our camera's two damp channels are nearly the same rate**, which throws away the
  structural idea they were copied from. C3.

### 2.7 ⚠ WHAT THIS PROTOCOL CANNOT TEST — read this before quoting any result

1. **It cannot compare feel.** A matched constant does not produce matched feel when the surrounding
   system differs: Quake's `PM_Accelerate` clamps to `wishspeed` and can never overshoot it
   (`pw-bfp-source.md:118`); our integrator has no such clamp. Two engines can agree on every
   coefficient and disagree on the result.
2. **It cannot measure their input latency, frame pacing, animation quality, or audio.** Nothing in
   either source tree records those, and we have no capture of the running games.
3. **It cannot measure any BFP quantity that is emergent rather than a parameter** — turn radius
   (V5), the shape of a mid-air stop, how a chase reads. These are marked `NO-SOURCE` and stay
   marked.
4. **It cannot convert BFP knockback** (§1.4) without `g_knockback` and the mass term, which the
   research does not record.
5. **BFP rows are reconstruction rows.** Tier D never grounds a grade; tier C grounds a question.
6. **The pictorial lane compares STILLS.** A still cannot show acceleration, damping, latency or
   hitstop. Anyone extending a §3 result into a motion claim has left the protocol.
7. **It cannot tell you the design is good.** It tells you the design is *what the spec said*, and
   that the spec's numbers stand in a known relationship to two games that shipped.

### 2.8 THE BLINDING PROCEDURE — the part that makes it honest

The critic is a **fresh-context subagent that did not write the implementation** and does not read
the implementer's summary. Order of operations, strictly:

1. **Read only the target tables** — `aaa-01`…`aaa-07` §MEASURABLE/§GATES sections and this document.
   Do **not** read the implementer's report, commit message, or the "what I did" section of any doc.
2. **Run the self-proof (§5).** If it fails, stop and return `INADMISSIBLE`.
3. **Capture every number in §1.** Record them into `ours` with the source column **empty**.
4. **Write a provisional verdict per metric from the band alone.**
5. **Only now** fill the `source (converted)` column and the Δ.
6. **Re-verdict.** Any metric whose verdict changed at step 5 gets a one-line note saying so — that
   is the audit trail proving the source column was not used to rationalise a number that was already
   accepted.
7. **The pictorial lane (§3.4) is separately blinded** and runs last.

⚠ **A critic who fills `ours` and `source` in the same pass has run a different protocol.** Steps 3–5
exist because the failure mode of every self-graded benchmark is fitting the band to the measurement.

---

## 3. THE VISUAL PROTOCOL

Tool: **`tools/shoot.mjs`** — headless Chromium, real selectors, real page JS, writes a PNG, and
**fails on a page error, a sub-40-node DOM, or a full-screen opaque layer that takes input** (it has
already caught the `#title` veil on the PowerWorld page).

### 3.1 THE CALIBRATION LAW — first, break something on purpose

**Before any frame is judged, the critic breaks the picture deliberately and confirms the capture
shows it.** Two injections, both historical bugs from this repo:

| injection | how | what the capture MUST show |
|---|---|---|
| **the sky** | `--eval "LSW.game.world.skyMesh.visible=false"` | the black void of `docs/POWERWORLD.md:527` — mean luminance drops hard, sky-region colour count collapses |
| **the clock** | `--eval "LSW.game.world.dayFixed=null; LSW.game.world.dayT=0.85"` | night, i.e. the 9:11 PM frame that shipped verified |

If either injection produces a capture indistinguishable from the healthy one, **the visual lane is
INADMISSIBLE for this run** and the numbers are not enough on their own. This is the same law
`shoot.mjs` states in its own header and the same law `auditSurfaces` failed for months by reporting
*fewer* problems as the fault got worse (CLAUDE.md, THE FLICKER).

### 3.2 THE SHOT MATRIX — 22 frames, and every one is mandatory

Entry: `node tools/shoot.mjs http://localhost:5180/powerworld.html <out.png> --click "#pwGo" --eval "<pose>"`.
`#pwGo` is the real door (`src/engine/pwTitle.js:238`); `PW.door()` is the headless seam. Pose with
the freeze-frame recipe (override `game.update` to `() => game.world.render()`, place the camera,
shoot) — CLAUDE.md, Run/verify.

**A — THE AIR GRAMMAR (7)**

| # | state | camera | what the critic looks for |
|---|---|---|---|
| A1 | solo cruise, ~100 u/s, level | chase, settled | horizon placement; is there anything to judge speed against? |
| A2 | two fliers closing at 210 u/s | chase | **both fighters in frame** — this is the framing the air-speed cap exists for (`aaa-01-air.md:1024`) |
| A3 | foe directly overhead | chase | the `world.js:2258-2262` degenerate branch; the camera must not roll or invert |
| A4 | vertical dive, pose unclamped | chase | `parts.g.rotation.x ≥ 3.0`; **ground markers still under the fighter** |
| A5 | mutual burner chase | chase | wake readability; the two burners must not merge into one smear |
| A6 | mid-climb, `spaceFrac ≈ 0.5` (≈888 u) | chase | the air running out — sky darkening, stars arriving, **the fighter's palette unchanged** |
| A7 | hover, both still, 60 u apart | chase | the standoff a player will spend the most time in |

**B — THE GROUND GRAMMAR (5)**

| # | state | camera | what the critic looks for |
|---|---|---|---|
| B1 | grounded clinch, gap ≤ 11 u | chase | both bodies readable at knife range; the camera must not be inside anyone |
| B2 | grounded mid, gap ~24 u | chase | the spacing read — can you see the reach difference? |
| B3 | haymaker contact frame | chase | the inverted impact frame, in the frame it belongs to |
| B4 | grounded, camera backed into a rock corner | chase | C6's worst-clearance frame, re-shot |
| B5 | grounded run across the stage | chase | foot contact vs the floor; does the fighter skate? |

**C — THE TRANSITION (4)** — the T-BLIND set, HUD hidden

| # | state |
|---|---|
| C1 | `gait = LIFT`, mid-takeoff |
| C2 | `gait = SETTLE`, arriving |
| C3 | `gait = CRASH` |
| C4 | `gh ≈ 5` — the mid-transition frame `aaa-04-camera.md:961` names |

**D — THE RETICLE (3)** — the crosshair and the impact point must coincide *in the picture*

| # | gap | note |
|---|---|---|
| D1 | 10 u | the near case, where angular error is worst |
| D2 | 40 u | |
| D3 | 200 u | `aaa-01-air.md:1010`'s gate range |

**E — THE LAWS (3)**

| # | check |
|---|---|
| E1 | **NO PURPLE** — fraction of pixels with hue ∈ [270°, 320°] and saturation > 0.25, over every frame in the matrix, KIVULI excluded. **Any non-trivial fraction is an automatic REJECT of the whole run**, not a finding |
| E2 | HUD-on frame at 1600×1000 and at the Deck's 1280×800 — nothing in the centre box (I6), nothing off-screen |
| E3 | the two calibration injections from §3.1, retained in the report as evidence the lane works |

⚠ **A missing frame is an F on its axis regardless of the numbers** (§4.3). This is the boxing-ring
rule: six green assertions and a ring four times too big, because **no assertion could see scale**.

### 3.3 WHAT "LOOKS FOR" MEANS — the six questions per frame

Vibes are not admissible. For every frame the critic answers, in writing:

1. **Can I find both fighters without being told where they are?** (silhouette)
2. **Can I tell which way each is facing and moving?** (pose read)
3. **Is anything in the centre box that is not the fight?** (I6)
4. **Does the scale read** — does a 9.6 u fighter look like a person against the stage?
5. **Is there anything in frame that is obviously wrong** — black geometry, a floating decal, a
   camera inside a rock, a horizon with nothing past it? (all four have shipped here)
6. **Which frame in `docs/reference/` is this trying to be, and how does it differ?**

### 3.4 THE PICTORIAL A/B — the one genuine side-by-side available

`docs/reference/` holds **21 real frames** of Bid For Power (5), Ultra BFP (4), ESF (3) and Dragonball
Unreal (9). These support a real comparison, but **not the naive one.**

⚠ **DO NOT ASK "WHICH IS THE REAL GAME."** Our renderer is HDR-composited with ACES tone mapping,
bloom and a mannequin skin treatment; theirs is a 1999 Quake III mod. A judge identifies the era in
under a second, so a "blind" test of that question is blind in name only and its result means
nothing.

**Ask instead about composition, which the era does not leak into — and MEASURE it on both sides.**

| quantity | how it is read from a PNG | what it says |
|---|---|---|
| **subject height fraction** | tallest fighter's bounding-box height ÷ frame height | how close the game holds the camera. The single most transferable framing number |
| **pair separation fraction** | centre-to-centre distance of the two fighters ÷ frame width | whether the game frames a duel or a chase |
| **horizon fraction** | horizon row ÷ frame height | how much sky. BFP is famously sky-heavy; a ground-heavy frame is not the same game |
| **sky area fraction** | fraction of pixels above the horizon row | as above, robust to a tilted horizon |
| **centre-box RMS contrast** | over the CENTRE box of §1.4 | is the middle of the screen a picture or a flare |

**Implementation.** `shoot.mjs`'s own header records that a dependency-free PNG read is not possible
in Node without a decoder — so decode **in the page**: load both PNGs into an `Image`, draw to a 2D
canvas, `getImageData`, compute. Proposed as `tools/framestats.mjs`, sharing `shoot.mjs`'s launch
flags. The fighter bounding boxes on the *reference* frames are hand-marked once and committed as
`docs/reference/framemarks.json` — **hand-marked, and labelled as such**, because an automatic
segmenter on a 640×480 JPEG-artefacted screenshot would be a made-up number wearing a script.

**The blind half that is real:** shuffle our frames and theirs, strip filenames, and ask the judge —
without knowing which is which — *"in this frame, can you find both fighters, and does the framing
tell you who is winning?"* That question is answerable from composition alone and its answer does not
depend on knowing the year.

**Pass:** our A1/A2/A5/A7 subject-height and sky fractions fall within the **min–max range spanned by
the five BFP frames**, or the divergence is declared with a reason. Not the mean — a range, because
five frames is five frames and a mean of five is a false precision.

---

## 4. THE SCORING

### 4.1 Five axes, one letter each, no overall average

**There is no composite grade.** An average lets a strong camera hide a lying reticle, and the
reticle is the axis the thesis names first (*"the reticle never lies"*). The report carries five
letters and the verdict is **the worst of them**.

### 4.2 The anchors

| grade | meaning |
|---|---|
| **A** | Every mandatory metric in band. Every out-of-band metric is a **declared divergence** with a written reason and a source citation. Full shot matrix, every frame answering §3.3's six questions cleanly. Self-proof green. **The critic states in one sentence what this axis does better than the source, and cites it.** |
| **B** | All mandatory metrics in band, but ≥1 divergence is **undeclared**, or one non-mandatory metric is out, or one §3.3 answer is a qualified yes |
| **C** | One mandatory metric out of band by **< 25 %**, and it is named with its number and file |
| **D** | One mandatory metric out by **≥ 25 %**, **or** a required frame is missing, **or** a metric was reported without its capture method |
| **F** | Self-proof failed · a console error in the run · a `NO-SOURCE` row silently graded as compared · any metric unmeasurable · **any purple** · the axis's feature does not exist |

⚠ **A CEILING RULE: no axis may be graded above C if its own known-bad injection (§5) was not run in
this session.** A harness that has not been shown to detect the fault is not evidence that the fault
is absent.

### 4.3 The hard REJECT rules — the critic sends work back, no discussion

1. **Any F.**
2. **Any two D's.**
3. **A missing frame from the §3.2 matrix.** No numeric result substitutes.
4. **Self-proof not run, or run and red** → `INADMISSIBLE`, which is *worse* than REJECT: the work was
   not judged at all and the whole run repeats.
5. **A console error during any capture.** `shoot.mjs` exits 1 on one; the critic must not launder it.
6. **A metric reported without its capture method**, or produced by writing the value it measures
   (RULE M-A).
7. **Any purple** outside KIVULI.
8. **An `ANCHOR-SPLIT` metric that passes under one anchor and fails under the other** → REJECT with a
   ruling request attached (§4.5).
9. **The report contains a grade justification that is not lane N, P or I** (§2.1).

**DEFAULT TO REJECT WHEN UNCERTAIN.** If the critic cannot decide whether a frame reads correctly, the
answer is REJECT with the frame named. A hedge is a pass, and this repo's history is a list of hedges
that shipped.

### 4.4 What a declared divergence must contain

Three things, or it is undeclared:

1. **The number both ways** — ours and the converted source, with the anchor.
2. **A one-sentence reason** naming the design constraint that forces it. *"A BFP-scale air fight
   between bodies 143 u apart cannot be framed from JKA's 13.7 u standoff"* is a reason. *"It feels
   better"* is not.
3. **A citation** — the doc and line where the divergence is written down. If it is not written down
   anywhere, the critic's finding is `DIVERGENCE-UNDECLARED` and the fix is a doc edit, not a code
   edit.

⚠ **The DO-NOT-REGRESS list is a special case and outranks any comparison.** Three places we are
already ahead of the source (`aaa-00-ground-truth.md:694`): **the curved beam** (a stream of packets
carrying the direction they were fired with — measured 5.7° held, 122.1° after a 100° sweep; BFP's is
a straight laser re-anchored every frame, `pw-bfp-source.md:502`, and `:611` lists it under *do not
adopt*), **the powerstruggle** (correct by ESF's standard, `docs/POWERWORLD.md:466`), and **the
ability table** (22 `TYPES`, 364 abilities across 52 heroes vs BFP's 28 attacks and five integers per
character, `pw-bfp-source.md:604`). **A critic who marks any of these a FAIL for diverging from the
source has inverted the rubric.** The correct verdict on those rows is `DIVERGENCE-DECLARED — AHEAD`.

### 4.5 Every finding takes exactly this shape

```
[AXIS] [GRADE] [metric id] — one sentence.
  ours     : <number> (<how captured>, <file:line>)
  source   : <number> (<doc>:<line>, anchor=BODY|ARCH, trust=S|A|B|C|D|X) | NO-SOURCE
  band     : <band>   Δ <±%>
  frame    : <path/to/shot.png>   (mandatory for anything visual)
  fix      : <the file and the change>
  verdict  : PASS | FAIL | DIVERGENCE-DECLARED | DIVERGENCE-UNDECLARED | ANCHOR-SPLIT | NO-SOURCE
```

**`+ strengths` and `− weaknesses` are both required per axis, and both must name a number or a
frame.** *"Movement feels floaty"* is rejected as a finding; *"− V2: air stop 55.6 u vs BFP's 45.7 u
and never reaches zero — no `pm_stopspeed` term; `entity.js:29`; frame A7 shows the drift"* is a
finding.

### 4.6 THE LOOP, AND ITS TERMINATION — "keep going" must not mean "never stop"

On REJECT the critic returns a work item per failing metric: **the id, the measured number, the
target, the file, and the frame.** The implementer runs a loop; the critic re-runs **the whole
protocol**, not just the failing metric (a fix that moves one number and breaks another is the normal
case).

⚠ **THE ESCALATION RULE.** If **the same metric fails three consecutive loops**, the critic stops
looping on it and raises a **RULING REQUEST** to Robert containing: both numbers, both anchors, the
divergence argument on each side, and what changes if he picks each. It does not attempt a fourth
loop. A harsh critic with no escalation path is a denial of service, and every genuinely stuck metric
in this project so far — the anchor split, the fly-tilt ±20 vs ±80, the `near` plane — has been a
**ruling**, not a bug.

⚠ **AND THE CRITIC MAY NOT MOVE A BAND TO MAKE SOMETHING PASS.** A band changes only by a documented
derivation (as §2.6 FINDING C changes V1's, and says why). A band edited in the same session as a
failure it resolves is an automatic `INADMISSIBLE` on that axis.

---

## 5. THE ANTI-VACUOUS-PASS RULE

### 5.1 The precedent

CLAUDE.md, THE SLOT SAYS WHAT IT IS: *"The first suite asserted `chips.every(...)` on a list that was
EMPTY — and `[].every()` is true, so two assertions went green while nothing rendered."* And
`auditSurfaces` reported **fewer** problems on the worse terrain because the ground was outside its
comparison entirely. And `src/bench/powerworld.js:13-16` states the law at the head of the file
because a suite in this repo has already broken it.

### 5.2 THE RULE

> **Before any verdict in a run is admissible, the harness must be shown — in that same session — to
> return GREEN on a known-good and RED on a known-bad, for every axis it will grade.**

The self-proof output is **included verbatim in the report**. A report without it is `INADMISSIBLE`;
its grades are not read.

### 5.3 The known-bad injections — one per axis, all reversible, all historical

| axis | known-good | **known-bad injection** | the harness MUST report |
|---|---|---|---|
| **MOVEMENT** | a fighter under an open sky, ascend held through the real key path, **leaves the ground** | `LSW.game.world` … set `AIR_DRAG`-equivalent drag to the city's **6.0** for one fighter | V2 stop distance collapses **55.6 → 16.7 u**; V1 drops to 0.50 s. Both flagged out of band |
| **CAMERA** | a settled chase at 40 u; `\|Δ camPos\| < 0.05 u` between frames | force `stiff = 0`; and disable the clip trace | C5 residual **> 40°** (vs < 8°); C6 violations **> 0** in a Mega City |
| **RETICLE** | check 0 — the predictor reproduces the **current** miss at gaps 10/40/100 within ±0.15 u of **0.91 / 3.18 / 7.98** | revert the convergent-aim fix | R1 **FAILS at every gap ≥ 32 u**. `aaa-05-reticle.md` calls this the *regression witness*: if reverting does not fail, the suite is blind |
| **IMPACT** | `renderer.info.render.calls > 1` **and** the drawing buffer is not uniform, asserted **before** anything is asserted about it | `fxImpact = false` | I3's middle sample **stays at ~L0** — proving the test can see the effect at all |
| **TRANSITIONS** | M0 — ascend through the real key path reaches `gait = AIRBORNE` | write one gait directly, bypassing the owner | T1 coverage drops below 100.00 %; T3's `Δv` exceeds 1e-3 |
| **VISUAL** | a healthy PowerWorld frame: `shoot.mjs` exits 0, no veil, non-trivial colour count | hide `world.skyMesh`; and `dayFixed = null; dayT = 0.85` | the black-void frame and the night frame, both visibly different from the healthy capture (§3.1) |

### 5.4 The seven harness traps that have each cost this project a run

Every one is on file. A critic hitting any of these produces a number that is wrong in a way that
looks right.

1. ⚠ **`input.endFrame()` is called by main.js's rAF loop, NOT by `game.update()`.** A synthetic
   keydown latches forever and re-toggles flight every frame. (Paid for twice — CLAUDE.md §46.)
2. ⚠ **The SCHEME owns the key.** A tab saved on BRAWLER puts fly on `KeyG`, so `KeyF` presses are
   jabs. Read `KEYMAPS[SETTINGS.scheme]`.
3. ⚠ **`controlPlayer` rewrites `aim` from the mouse every frame** — after a test writes it and before
   the hit test reads it. Use `game.controlPlayer`, the documented override
   (`src/bench/powerworld.js:20-22`).
4. ⚠ **Pick fighters by TEAM, never by index.** `entities[1]` has been the KMK 9 camera operator.
5. ⚠ **Pin both bodies to ABSOLUTE positions.** Holding the foe at `player.x + gap` lets the melee
   step-in smear a measured reach 8 u long.
6. ⚠ **`runSlot(c, key, inp, g)` — fighter first, game last.** Backwards, it fails silently.
7. ⚠ **The phantom-module law.** Vite version-stamps modules, so a console
   `import('/src/core/util.js')` can be a **second instance** with its own state. Read through the
   page's own graph — `LSW.PW_KB`, `ATLAS.BANDS` — never a fresh dynamic import.

Plus two that are specific to *long* measurements:

8. ⚠ **A shorter test cannot find a higher lid.** The 620-frame flight suite topped out at 456 u and
   could never have found the 684 u band-3 deck (`entity.js:1299-1301`). T1's 10,000 frames and C6's
   3,600 are not padding.
9. ⚠ **A check whose subject is whether two AIs feel like fighting is not a check.** manual §47
   records a launch-speed sample over 90 s of AI-vs-AI that passed once and returned **zero** the next
   run because the bots never closed. Drive the punch.

---

## 6. THE REPORT TEMPLATE

The critic returns exactly this and nothing else.

```
POWERWORLD AAA CRITIC — run <n> — <commit sha>

0. ADMISSIBILITY
   self-proof: <per-axis GREEN/RED table, verbatim output>
   console errors during capture: <n>            (any > 0 → REJECT)
   shot matrix: <k>/22 captured
   calibration injections: <sky PASS/FAIL> <clock PASS/FAIL>
   → ADMISSIBLE | INADMISSIBLE (stop here if the latter)

1. GRADES
   MOVEMENT    <A-F>
   CAMERA      <A-F>
   RETICLE     <A-F>
   IMPACT      <A-F>
   TRANSITIONS <A-F>
   VERDICT: <worst of the five>  →  PASS | REJECT

2. THE COMPARISON TABLE   (§2.5, all 31 rows, source column filled at step 5 of §2.8)

3. PER AXIS
   <axis> <grade>
     + <strength, with a number or a frame>   ×2 minimum
     − <weakness, in the §4.5 shape>          ×1 minimum, or state "none found and here is
                                               the metric that would have caught one"
     verdict-changed-at-unblinding: <list, or none>

4. THE PICTORIAL A/B      (§3.4 measured table + the blind composition answers)

5. WORK ITEMS             (one per failing metric: id, ours, target, file, frame)

6. RULING REQUESTS        (§4.6 escalations — metric, both numbers, both arguments)

7. NOTES                  (everything that is not lane N/P/I lives here and grades nothing)
```

---

## 7. THE LOOPS FOR THIS RUBRIC ITSELF

Not a schedule. Each loop is a scoped change with a gate; run it until the gate is green.

**Loop R1 — THE HARNESSES EXIST.** `src/bench/pwmove.js`, `pwcam.js`, `reticle.js`, `pwimpact.js`,
`transition.js`, each exporting an `LSW.*Suite()` on the shape of `src/bench/powerworld.js`.
**Gate:** every suite runs three consecutive times, 0 console errors, and **every known-bad in §5.3
turns its suite red** — that gate, not the green one, is the loop's finish line.

**Loop R2 — THE VISUAL LANE.** `tools/framestats.mjs` + `docs/reference/framemarks.json`.
**Gate:** the five §3.4 quantities computed on all 21 reference frames and on a healthy PowerWorld
capture; the two calibration injections move the numbers.

**Loop R3 — THE FIRST FULL RUN.** A fresh-context critic runs §2.8 end to end.
**Gate:** a report in the §6 shape with all 31 rows filled, ≥2 strengths and ≥1 weakness per axis, and
the unblinding audit trail present. **A first run that returns PASS on every axis is itself
suspicious** and the reviewer should check the self-proof before believing it.

**Loop R4 — THE ESCALATIONS.** Whatever §4.6 raises goes to Robert as rulings, not as loops.

---

## 8. CITATION INDEX

| claim | source |
|---|---|
| `pm_flyaccelerate 2.0` / `pm_flightfriction 2.0` / `pm_airaccelerate 4.5` | `pw-bfp-source.md:74-76` |
| `pm_stopspeed 100`, unchanged in BFP | `pw-bfp-source.md:80` |
| `PM_Accelerate` cannot overshoot `wishspeed` | `pw-bfp-source.md:118` |
| `PM_Drifting`, 0.0003 → **0.008 below 100 u/s** | `pw-bfp-source.md:93-101`, `:595` |
| `g_meleeDiveRange 700`, melee range 32, dive minimum 77 | `pw-bfp-source.md:246-249` |
| hit stun 3,000 ms / attacker 6,000 ms self-cooldown | `pw-bfp-source.md:284` |
| Zanzoken: 500 u, 5 % ki, 50–240 ms tap, 100 ms commitment, 10 uses / 2 s lockout | `pw-bfp-source.md:290-306` |
| the reconstruction caveat + the author's admitted inventions | `pw-bfp-source.md:9-33` |
| the ±80° fly-tilt claim is **unverified** | `pw-bfp-source.md:479` |
| the 66 wu vs 120 wu anchor split | `pw-bfp-source.md:564` vs `aaa-02-ground.md:37-60` |
| BFP's beam is a re-aimed laser; **keep ours** | `pw-bfp-source.md:502`, `:598`, `:611` |
| `cg_thirdPersonRange 80`, `CameraDamp 0.3`, `TargetDamp 0.5` | `openjk.md:71-77` |
| `CAMERA_DAMP_INTERVAL 50` and the exponential form | `openjk.md:178-186` |
| the yaw stiffener, 1.0 → 2.5 °/ms, shave 0.75 | `openjk.md:216-232` |
| pitch reduces damping; JA divides by 115, JO by 89 | `openjk.md:243-258` |
| the camera is an 8×8×8 **box**, two traces in order | `openjk.md:282-338` |
| the aim parallax and its two fixes | `openjk.md:2045-2084` |
| `CAMERA_SIZE 4` "roughly 2–3u" — **not reproducible** | `openjk.md:2107` (trust X) |
| JKA run speed 250 qu/s | `openjk.md:1596` |
| the measurable tables this rubric consolidates | `aaa-01:1002` · `aaa-02:1115` · `aaa-03:667` · `aaa-04:889` · `aaa-05:752` · `aaa-06:1042` |
| where we are already ahead — do not regress | `aaa-00-ground-truth.md:694` |
| the traps list | `aaa-00-ground-truth.md:725-758` |
| PowerWorld status, the look pass, the five faults a screenshot found | `docs/POWERWORLD.md:498-548` |
| the real-punch knockback correction (49.2 u/s, not 101) | `docs/POWERWORLD.md:673` · manual §47 |
| `shoot.mjs` — what it fails on, and why the PNG probe cannot read WebGL | `tools/shoot.mjs` header |
| `#pwGo`, the real front door | `src/engine/pwTitle.js:238` |

---

## 9. THE ONE-PAGE SUMMARY

- **31 numbers, five axes.** Movement 8, camera 7, reticle 5, impact 6, transitions 5. Each has a
  capture method, a band, and the derivation of the band.
- **Rate constants transfer unconverted; length constants need an anchor, and the two defensible
  anchors disagree by 1.82×.** Every converted row states its anchor; a metric that passes under one
  and fails under the other is a REJECT with a ruling request.
- **Source constants carry a trust tier S→X.** The author's own admitted guesses never ground a
  grade. Two claims in our own research are tier X and are named.
- **Five findings on the protocol's first pass**, including that our air brake has no `stopspeed`
  term and never reaches zero, that our two camera damp channels are nearly the same rate where JKA's
  differ by 1.94×, and that the time-to-top-speed band was fitted to our own drag rather than to BFP's.
- **The blind test that is real is pictorial and compositional**, measured on the 21 reference frames
  we hold — not "which is the real game", which the rendering era gives away instantly.
- **22 mandatory frames.** A missing frame is an F regardless of the numbers, because no assertion in
  this repo's history has ever been able to see scale, darkness, or a black sky.
- **Default REJECT. No composite grade — the verdict is the worst axis.** Every finding names a
  number or a frame; no axis grades above C without its known-bad injection run in the same session.
- **The self-proof comes first and is quoted verbatim.** A report without it is not failed — it is
  not read.
- **Three consecutive failures on one metric escalate to a ruling, not a fourth loop.** A critic with
  no exit is a hang.

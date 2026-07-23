# PLANS — the four-level ladder, cross-level readability, and interaction

Written 2026-07-23 at Robert's request ("I want you to write plans for that. For right now.").
These are DESIGNS, not built work. Interiors are parked by ruling — see `BACKLOG.md`.

⚠ Items marked **UNVERIFIED** are analytic (read from the code, not observed at runtime). Confirm
each with a freeze-frame before implementing — `game.update = () => game.world.render()`.

---

## FINDINGS THAT DRIVE ALL THREE PLANS

**F1 — Altitude bands are decoration.** `ALT_BANDS`/`bandOf` exist only to colour a ring and light a
HUD rung. `_physics` is a fully continuous axis. Nothing in the game reads a band to make a decision.

**F2 — `bandOf` is hand-copied in two HUD sites** (`hud.js` ~1262 and ~1300) instead of imported.
Any threshold change is a three-site edit today.

**F3 — UNVERIFIED: at altitude you leave your own screen.** The camera is orthographic; a world
offset of `(0, h, 0)` projects to ≈ `0.7975·h` of screen-up displacement, and `world.follow` only
tracks `0.4 ×` the player's height. Estimated: the player exits the top of frame near **y ≈ 140** —
just below the SKY boundary. A foe at 260u reads ~2.7 screens up. This is the hardest constraint on
readability and MUST be measured before building against it.

**F4 — Height is geometrically ambiguous under an ortho camera.** A fighter at height `h` renders at
the same screen point as a ground point ~`1.32·h` away along the camera axis. **Colour alone can
never say where a flier is** — only a line to the ground can.

**F5 — Melee has no vertical gate.** `game.coneFoe` filters on XZ distance and facing only. A jab
connects with a foe 200u overhead if they are within 13u horizontally. This is a bug today and a
cross-band exploit the moment bands mean anything.

**F6 — Untargeted aim cannot point up.** With no lock, aim falls back to `screenToGround`, which
intersects the `y = 0` plane. A SKY flier not locked on is aiming at the street far below them.

**F7 — Carrying is levitation.** `updateCarry` parks the prop at `pos.y + 13`, about 5u *above the
head*, and applies no arm pose at all — the arms keep running the run-cycle swing underneath.

**F8 — There is no elbow joint.** `mkArm` builds `upper`/`fore`/`fist` as SIBLINGS at fixed offsets,
not a chain. One rotatable joint per arm. **Two-bone IK is not available** without a rig change, and
the ragdoll depends on that rig by index. Do not restructure arms for a carry pose.

**F9 — Two carry leaks.** `Fighter.dispose()` doesn't release `_carry`, and `startMatch` doesn't
clear it. A fighter spliced out mid-carry leaks its prop mesh into the scene permanently.

**F10 — No interaction system exists at all.** No prompt, no focus target, no registration list.

---

## PLAN 1 — THE FOUR-LEVEL LADDER

**The ruling:** four decks, not an axis. A flying fighter is either DOCKED on a deck or IN TRANSIT
between decks. GROUND is the exception — free levitation within it.

**Scope decision that keeps this safe: bands constrain `flying === true` ONLY.** Gravity, jumps,
knockback arcs and rooftop standing are untouched.

| band | enters at | rest altitude (deck) |
|---|---|---|
| GROUND | 0 | the terrain (`heightAt`) — free float to +8 |
| BUILDING | 8 | **the rooftop under you**, else ~96 |
| SKY | 150 | 205 |
| CLOUDS | 260 | 300 (hard lid stays 320) |

BUILDING's deck **cannot be a constant** — roofs are real geometry at 44–150u and standing on them
must not break. It resolves to the highest `cover.top` beneath you, else the skyline default.

- **Hold ascend** = climb; on entering the target band, a servo eases you to its deck. Holding
  through a dock re-arms the next rung, so the button walks the ladder with a *click* per rung.
- **The existing "soft floor" hover hack is already this servo**, specialised to deck 0. Generalise
  it and delete the special case.
- **Knockback moves your altitude, not your band.** The servo is suspended while `launchT > 0` (or it
  would eat knockback and make heavy hits feel weightless); when it expires, your band is wherever
  you landed. No snap-back tether.
- **Safety invariant to assert in a test:** servo max speed is `FLY_SINK` 26, slam needs impact < −38,
  so **docking can never cause slam damage**.
- **Descend inside BUILDING tries to LAND first** — that's what preserves rooftop play.

**The big payoff:** `flightTier` stops being a mushy speed modifier and becomes *how high you can
live* (tier 2 levitators cap at BUILDING, tier 3 reaches CLOUDS).
⚠ **This is a balance ruling, not a refactor** — it nerfs every levitator. Needs a `def.maxBand`
override and a BALANCE audit. Do not ship silently.

**Breaks that must be fixed in the same change:** `coneFoe` needs a vertical gate (F5); `nearestFoe`
needs a band penalty; AI `out.fly` (a boolean) must become `out.flyBand` derived from **believed**
position, never `real.pos.y` — the honesty law still holds. Fog, `canSee`, ragdoll, portals, craters
and the tower cutaway all survive untouched.

---

## PLAN 2 — SEEING AND HITTING ACROSS LEVELS

Robert's complaint — the altitude readout is on the UI, which is useless for a spectator watching the
whole map — is correct, and F4 makes it stronger than a taste argument: **a badge cannot work here.**

### Primary mechanism: THE PLUMB LINE

A thin vertical tether from each flier down to their ground position, built beside `bandRing`.

- Coloured by band, so ring + line + fighter read as one object.
- **Graduated** — a dash every 50u with a brighter tick at each band boundary, so you can *count
  rungs* to a flier the way you count floors on a building. This is what makes it measurable rather
  than merely present.
- Dashes **scroll while in transit**, so "climbing" is legible from across the map.
- ⚠ **MUST gate on `_vis > 0.35`.** A tether visible through fog is a wallhack and would silently
  undo the entire AI honesty effort. This is the one rule that cannot be broken here.
- ⚠ Keep it non-additive — per the house rule, only ki glows.

### Fallback: a top-edge chip anchored to the ground column

Because of F3 the *body* is routinely off-frame while the *ground column is still on screen* — which
is a gift: a pulsing ring on the street with a graduated beam leaving the top of the frame. The chip
completes it, pinned above the column, carrying band glyph + altitude in metres. Generalise
`updateFoeArrow` (it already gates on `_vis`, so honesty is preserved free).

### Aiming: the one change that matters

**Add a ground-column pass to `pickTarget`.** You aim at the ring on the ground and you lock the
flier above it. No camera change, no new input, and it composes with the tether — *the thing you
click is the thing you can see.*

**Do NOT add a free-look pitch axis** — it fights the iso camera and breaks the decoupled
"facing follows lock, aim follows mouse" law. With a lock, `aim3` is already fully 3D.

### The honest limit — say it, don't patch it

Gravity projectiles **cannot reach the BUILDING deck**, let alone SKY: a thrown grenade peaks near
25u, a thrown car near 44u, and the deck is at 96. Do not inflate gravity to "fix" this. Make it the
rule — *the answer to a cloud camper is a beam, a homing shot, or climbing to meet them* — and
surface it: colour the throw arc red and label the landing ring **OUT OF REACH**.

### Camera

Two targeted changes only. A general zoom-out is not viable: framing a 320u flier with the ground
needs ~3× the frustum, at which point a hero is ~18px tall. Instead: track the player's height fully
above the SKY boundary, and ease the zoom modestly (78 → ~104) when a lock is one band away.

**Also: the radar is XZ-only, so a foe 300u up is a dot beside you.** Band-colour and size the dots.

**The spectator/admin view Robert described should be an explicit `hud.spectatorBands` mode** — all
tethers at full opacity, all chips drawn, radar band-coded — not a change to the player HUD.

---

## PLAN 3 — INTERACTION, CHOICE, AND ACTUALLY HOLDING THINGS

### 3a. The interactable contract

`game.registerInteractable({ id, pos, r, band, label, verb, priority, enabled, onFocus, onUse })`,
returning a handle. Nearest-focus scan at ~10 Hz scored by distance **and facing** (you interact with
what you're looking at), gated by `enabled(f)`.

⚠ **The teardown trap:** interactables registered by city tiles MUST be spliced in
`world._teardownCity()`, or a rebuilt city inherits ghost prompts pointing at deleted geometry. Flag
each entry `cityOwned`.

**Input: do NOT add a new key.** Every candidate is taken across the three KEYMAPS. Extend the
**G** chain, which is already contextual:

```
G →  focused interactable ? interact
  →  carrying             ? throw
  →  prop in reach        ? hoist
  →  else                   melee grab
```

Four behaviours on one key is only acceptable *because the prompt shows which one is armed*. Without
the prompt, don't ship the chain. `interact` goes on the KEYMAP as data, never a literal.

### 3b. The choice surface

Not a JRPG box — a **field intercept transcript**, matching the document-and-broadcast language:
classification bar, mono speaker slug with the district from `districtAt`, typed body, numbered `§`
option rows with consequence tags, ESC = WITHDRAW.

**Default to LIVE, not paused** — a street interaction that stops the world would fight the police
and heat systems that are running. ⚠ If paused, it must be added to `overlayOpen()`/`closeOverlays()`
or ESC will pause the game *behind* the open transcript.

### 3c. Real carrying

**Not IK** (F8 — there is no elbow). **Not reparenting to a fist** (the ragdoll zeroes arm pivots on
KO and would drag the car into the sim; `dispose()` would eat the shared car geometry).

**A `poseCarry` blend plus a driven `carryAnchor` empty** — the same machinery `poseGuard`/`poseGrab`
already use. Two styles by object size: OVERHEAD (car, tree, lamp — arms straight up past the head,
torso back-lean, knees loaded) and CHEST (crate, body). `updateCarry` then reads the anchor instead
of guessing a height.

⚠ `combatPose` **must include `poseCarry`** or the flight-arm branch fights it — the same class of
bug the bow-draw and guard branches already had to be ordered around.

**Make carrying a real cost**: refuse guard and strike while carrying. You have your hands full. It's
one line, and it turns carrying into a decision.

**Fix F9 in the same pass** — `dispose()` and `startMatch` must release carries.

### Do these three first, regardless

1. Import `bandOf`; delete the two hand-copies (F2).
2. Add the vertical gate to `coneFoe` (F5) — that's a **bug fix today**, not a new feature.
3. Extract one `hud.worldChip(worldPos, html)` helper. Three systems now want a DOM element pinned to
   a world point (`damageNumber`, `updateDpsMeters`, and the interact prompt). Do it before the third
   copy gets written.

**Ship order:** readability before mechanics. Tether + ground-column targeting first, so the band
model is legible from the day it turns on and every tuning decision can actually be seen.

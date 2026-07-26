# POWERWORLD — THE CONTROL SCHEME (plan, not code)

Third-person high-speed flight brawler dimension inside WAR WORLD: ASCENDANTS.
Reference feel: Bid For Power / Earth's Special Forces. Primary platform: **Steam Deck**, plus kbm.

Every claim below is cited `file:line`. Guesses are marked ⚠ GUESS. Assumptions I cannot verify are
collected in §6 and are **not** used as if they were facts anywhere else.

---

## 0. WHAT I READ, AND THE FIVE STRUCTURAL FINDINGS THAT DECIDE THE DESIGN

Before any binding: five things in the current code decide most of this document.

**(A) `KEYMAPS` cannot express a POWERWORLD scheme today.** The table
(`src/core/settings.js:8-45`) owns exactly nine bindings — `up · down · guard · item · strike · grab`
plus `wheel` and `digitsSwap` and the `*Label` strings. Everything else a control scheme needs is
**hard-coded outside the table**:

| action | where it is hard-coded |
|---|---|
| dash / cruise | `ShiftLeft`/`ShiftRight` — `src/engine/game.js:2820`, `2852` |
| flight toggle | `KeyF` — `src/engine/game.js:2861` |
| clear hard lock | `KeyT` — `src/engine/game.js:2747` |
| the six powers | `KeyQ KeyE KeyH KeyR` + LMB/RMB — `src/engine/game.js:2849-2851` |
| evade | double-tap `TAP_DIRS` — `src/engine/game.js:35`, `2807-2816` |
| descend alias | `ControlLeft`/`ControlRight` — `src/engine/game.js:2819` |
| hero swap | `BracketLeft`/`BracketRight` — `src/main.js:395-396` |
| hands 1–4 | `digits` map — `src/main.js:355`, `430-433` |
| mute | `KeyM` — `src/main.js:423` |
| spawn rival / bot | `KeyB` / `KeyN` — `src/main.js:400`, `405` |

The table's own header states the law it exists to keep: *"No two keys in one scheme may collide"*
(`src/core/settings.js:3-4`). **That law is currently unenforceable**, because most keys are not in
the table. Adding POWERWORLD means growing the table, and §2 lists the fields it needs.

**(B) The law is already broken twice, in ways POWERWORLD would inherit.**

- **BRAWLER punches and takes off on the same key.** `brawler.strike = 'KeyF'`
  (`src/core/settings.js:40`) while `src/engine/game.js:2861` reads `if (inp.pressed('KeyF'))
  p.toggleFlight()` unconditionally. Pressing F in BRAWLER throws a punch **and** toggles flight.
- **The help panel lies under BRAWLER.** `hud.buildHintBody` prints the literals `'V'` for strike and
  `'G'` for grab (`src/engine/hud.js:512`) instead of `K.strikeLabel`/`K.grabLabel`, which BRAWLER
  sets to `'F'`/`'V'` (`src/core/settings.js:42`). The whole reason the table exists is *"so a scheme
  can never drift out of sync with what the game tells you the buttons are"*
  (`src/core/settings.js:2-3`).

**(C) The gamepad has no item binding at all — and neither does touch.** `MAP`
(`src/core/gamepad.js:7-19`) has `lmb rmb dash guard strike grab fly descend r q e f swap start
select` — **no `item`**. `useItem` is gated on `inp.pressed(KM.item)` (`src/engine/game.js:2843`) and
the picked-up-weapon trigger on the same key (`src/engine/game.js:2840`). Touch has no item button
either (`src/core/touch.js:19-20`). So **gadgets and every scavenged weapon are keyboard-only** —
unreachable on a Steam Deck, on a pad, and on a phone. `PAD_ACTION` compounds it by *claiming*
otherwise: `item: 'square'` (`src/core/glyphs.js:33`), and square is already `strike`
(`src/core/gamepad.js:11`). This is a live bug, not a POWERWORLD requirement.

**(D) `game.fwd` / `game.right` are computed ONCE and never updated.**
`src/engine/game.js:297-299` derives them from `world.camDir` in the constructor. They are read at
`2736` (pad aim basis), `2801` (camera-relative move), `2812` (**evade basis**), `2883`, `2888`
(P2 pad). `world.camDir` is mutated by `world.orbit` (`src/engine/world.js:1229`). Today this is
harmless because orbit only runs with `running === false` (`src/engine/game.js:3061`). **In
POWERWORLD the camera turns constantly, so both vectors are stale from the first frame** — a
double-tap evade would fire in a fixed world direction no matter where you are facing. This is a
certainty, not a risk.

**(E) There is currently no way to aim UPWARD without a target.** When unlocked, `a3` comes from
`screenToGround` and is then forced to `a3.y = 3` (`src/engine/game.js:2741`). `aim3` is built as
`a3.y - (p.pos.y + 5.8)` (`src/engine/game.js:2752`). Grounded that is `3 - 5.8 = -2.8`; flying at
y=100 it is `-102.8`. **An unlocked player can only ever aim slightly-to-steeply down.** Vertical aim
exists solely by snapping to a target (`soft.center(a3)`, `src/engine/game.js:2738`/`2741`). For an
isometric top-down that is invisible; for a flight brawler it is the whole problem.

---

## 1. HOW AIMING WORKS IN THIRD PERSON

### 1.1 Why `screenToGround` cannot survive the camera change

`world.screenToGround(mx, my, out)` (`src/engine/world.js:1366-1371`) raycasts NDC through
`this.camera` and intersects `_groundPlane`. It works **only** because of properties the isometric
camera has and a third-person camera does not:

1. **It needs a steep look-down angle.** `camDir` is `(0.86, 0.92, 0.86)` normalized
   (`src/engine/world.js:52`) — about 37° above horizontal. A camera behind and roughly level with a
   flying player produces a ray nearly parallel to the y=0 plane: the intersection runs to hundreds
   of units for a one-pixel mouse move, or lands *behind* the camera, or misses entirely.
2. **It is a plane, and the game's ground is not a plane.** `heightAt` (`src/engine/world.js:1387`)
   is the real floor and physics caches it as `f.groundY`. `_groundPlane` at y=0 is already an
   approximation in a city with metro trenches and mining pits.
3. **It throws away the vertical axis** (finding (E) above).
4. **`pickTarget` is screen-space** — it projects each foe with `screenPosOf`
   (`src/engine/game.js:1310`, `1312`, `1320`) and measures **pixel** distance to
   `mouse.clientX/clientY` (`src/engine/game.js:1304`, `1314`). In a pointer-locked third-person view
   there is no cursor to measure to; the crosshair is fixed at screen centre.
5. **The camera is orthographic** (`src/engine/world.js:55`). See §6.5 — this is the largest
   unscoped consequence in the whole plan.

### 1.2 The replacement: camera-forward aim + convergence correction

**One authority.** The player drives the camera (mouse delta / right stick); the camera's forward
vector *is* the aim. Derive it exactly once, in the spherical form the codebase already uses for the
orbit camera (`src/engine/world.js:1229`):

```
camFwd = ( sin(yaw)·cos(pitch), sin(pitch), cos(yaw)·cos(pitch) )
```

⚠ **Do not roll a second spherical.** CLAUDE.md records this exact failure: *"`setSun` rolled its own
spherical and put lon 0 on +Z while `SphereGeometry` puts it on +X — 90° out, a terminator that
looked convincing and fell in the wrong place"* (THE WORLD HAS COORDINATES). One `camForward()`,
consumed by the camera, `aim3`, `faceDir` and the target cone.

**Convergence.** The eye is behind and above the hands. Firing along the raw eye ray makes a
close-range beam pass beside the target. Standard fix, and it is the one the current code is
*already* shaped for: build a world **aim point** and let `aim3` be `(aimPoint − muzzle)`.

- `aimPoint = camPos + camFwd · D`, where `D` is a long reach.
- ⚠ `D` should come from the live ability's `range` where one exists (the slot facts already resolve
  a range per ability — `slotFacts`/`describeAbility`, CLAUDE.md THE SLOT SAYS WHAT IT IS), not from
  an invented constant. Then a 145u beam and an 11u jab converge at their own distances.
- `game.aimPoint` already exists as a member (`src/engine/game.js:283`, written at
  `src/engine/game.js:2751`) — reuse it, do not add a parallel field.

### 1.3 What each of the four named things should do

**`p.aim3`** — the 3D attack direction (`src/engine/entity.js:177`).

- **No lock:** `(aimPoint − muzzle).normalize()`, with a real `y`. This is the fix for finding (E).
- **Locked, look axis idle:** the lock owns it — `aim3 = (lockCenter − muzzle).normalize()`. Note
  `soft.center(a3)` (`src/engine/game.js:2738`, `2741`) is already the "aim at the body, not the
  ground under it" helper; keep using it.
- **Locked, look axis actively moving:** the camera wins, `aim3` follows `camFwd` (see 1.4).

**`p.faceDir(dx, dz)`** — `src/engine/entity.js:304`. Unchanged, and it is unchanged for a reason
that matters: `faceDir` sets **both** `facing` (the damped body yaw) **and** `aim` (the 2D XZ
direction). `aim` is what four other systems read:

- the fog-of-war cone — `world.updateFog(p.pos.x, p.pos.z, p.aim.x, p.aim.z, …)`
  (`src/engine/game.js:1226`)
- player vision — `_humanSees` dots against `p.aim` (`src/engine/game.js:1252`)
- the guard arc — `src/engine/entity.js:658`
- **melee target selection** — `coneFoe` dots against `caster.aim` (`src/engine/game.js:1828`)

So `p.faceDir(aim3.x, aim3.z)` (already the unlocked branch, `src/engine/game.js:2755`) makes the
vision cone literally *"where you are looking"* in third person, for free, and makes the melee cone
point at whatever the camera or the lock is pointing at. **Nothing new is needed here** — this is the
single largest thing that survives the camera change intact.

⚠ One consequence to write down: `coneFoe` has a hard vertical gate — `if (Math.abs(f.pos.y -
caster.pos.y) > 10) continue;` (`src/engine/game.js:1827`), the deliberate altitude-plan F5 ruling.
With real vertical aim, a locked target one deck above you **cannot be punched**, and the HUD must
say so (a greyed strike glyph, or the lock chip reading `OUT OF REACH — ABOVE`) or it reads as a
broken punch. Keep the gate; surface it.

**`pickTarget`** — `src/engine/game.js:1303-1333`. **Retire it in POWERWORLD.** It is a cursor
function: hover hit-testing (`1315`), a 110px magnet (`1305`), the ground-column click pass for
off-frame fliers (`1319-1326`), and `_lastLock` stickiness (`1327`). All four are mouse-cursor ideas.

**Replace with a 3D cone against `aim3`, built on the function that already exists.**
`pickTargetDir(p, dx, dz)` (`src/engine/game.js:1336-1347`) is already "nearest foe inside a cone of
a world direction" — the pad path. It needs three amendments and **the second one is a live bug**:

1. **It is 2D only.** It uses `f.pos.x/z` and divides by `Math.hypot(fx, fz) || 1`
   (`src/engine/game.js:1341`). A foe directly overhead has a near-zero XZ delta, so the `|| 1` guard
   makes the dot meaningless and it can win spuriously. In a flight brawler the cone must be 3D
   against `aim3`.
2. ⚠ **It has no vision gate.** `pickTarget` refuses invisible foes —
   `if (this.fov && (f._vis || 0) < 0.4) continue;` with the comment *"can't target what you can't
   see"* (`src/engine/game.js:1309`). **`pickTargetDir` has no equivalent line.** It is the gamepad's
   targeting path today, so this is an existing honesty hole on pad, and it becomes the *primary*
   path in POWERWORLD. One line fixes it. See §4.
3. **Its numbers are iso numbers.** `d > 130` and `bestDot > 0.4` (~66° half-angle),
   `src/engine/game.js:1342-1343`, were tuned for a 240u arena at `frustum` 78. POWERWORLD fights
   across the flight ceiling (320) with `ALT_BANDS` BUILDING 150 / SKY 260 (CLAUDE.md). ⚠ GUESS-FREE
   POSITION: I am not going to invent replacement numbers. Derive the range from the engagement — the
   largest `range` in the player's own kit is a defensible source and it is already computed for the
   slot chips.

**`hardLock`** — `src/engine/game.js:286`, set at `2745-2746`, cleared at `2747-2749`, consumed at
`2754`.

- Acquisition moves to its **own button** (§2/§3). Today it is `m.leftEdge && this._hoverPick`
  (`2745`) or `pad.pressed('lmb') && soft` (`2746`). The comment above it records exactly why LMB
  must not do this: *"the old 'any attack click near a foe locks you' was the 'faces one way while I
  aim another' bug"* (`src/engine/game.js:2743-2744`). In POWERWORLD LMB is a beam you hold for
  seconds — it must never touch the lock.
- **A lock now owns the camera**, eased. See 1.4.
- ⚠ **A lock must die when sight dies.** Today `hardLock` survives a wall: only the *triangle* hides
  (`if (h && h.alive && (!this.fov || (h._vis || 1) > 0.35))`, `src/engine/game.js:1214`) while
  `faceDir` at `2754` keeps tracking the live body. In the iso game with a soft magnet that is nearly
  harmless. In third person, where the lock steers the camera, it becomes *the camera looks through
  buildings at the enemy*. Required rule in §4.

### 1.4 Does "facing follows the lock, aim3 follows the mouse" survive?

The law is CLAUDE.md:3092-3093 (*"**facing follows the lock, aim3 follows the mouse** (decoupled)"*),
restated at CLAUDE.md:2846 (Targeting law), implemented at `src/engine/game.js:2752-2755`.

**It survives — as an override with priority — but its default must invert.** The argument:

- The decoupling exists because in the iso game facing and aiming genuinely live on different
  devices: the mouse names a *ground point*, the lock names a *body*, and **the camera is fixed so
  you can always see both at once**. Holding a lock while lobbing a grenade elsewhere is a real,
  usable thing.
- In third person **the camera is the aim**. If a lock only rotates the body while the camera stays
  where the player pointed it, the lock does nothing the player can *feel* — the target is not
  framed, so the lock is invisible. That is precisely the failure `docs/THE_HANDS.md:23-26` names
  about a stance: *"can the player see which mode they are in, and does the wrong one cost them?"* An
  invisible lock fails the first half.
- So: **`hardLock` eases the camera's yaw/pitch target toward the lock** (never snaps — a snap on a
  third-person camera is nausea), and therefore owns `aim3` too. `faceDir` follows the lock as
  before, so `aim` — and with it the vision cone, the guard arc and `coneFoe` — follows as well. All
  three agree, which is the property a third-person camera needs and the iso camera never did.
- **The decoupling is preserved as the deliberate act.** While the look axis is being actively driven
  past a threshold, the camera's own yaw/pitch wins and `aim3` follows `camFwd`, **while `facing`
  still follows the lock**. That is the law's exact wording, honoured at the exact moment it earns
  its keep (the off-lock shot), and yielding the rest of the time. Strictly larger behaviour, not a
  replacement.
- ⚠ What does **not** survive: `a3.y = 3` (`src/engine/game.js:2741`) and the whole
  `screenToGround` branch. And `SETTINGS.moveRelative` (`src/core/settings.js:73`) collapses — its
  two values, `'aim'` and `'camera'`, become the same thing when aim *is* the camera. That **removes
  a dial** instead of adding one, which is worth saying out loud. The `'camera'` fallback at
  `src/engine/game.js:2800-2804` becomes dead code in POWERWORLD.

---

## 2. THE POWERWORLD SCHEME

### 2.1 The table has to grow

Fields `KEYMAPS` needs before POWERWORLD can be *a scheme* rather than a pile of literals. Same law
as today: engine and help panel read one object, and no two keys in one scheme collide.

```
name, blurb                                  (exists)
up, down, guard, item, strike, grab           (exists)
upLabel … grabLabel, swapLabel               (exists)
wheel: 'hero' | 'ability' | 'lock'            ⚠ NEW VALUE (see the trap below)
digitsSwap                                    (exists)

look:        'mouse' | 'stick'                NEW — which device drives the camera
dash:        code                             NEW — was hard-coded Shift
flight:      code                             NEW — was hard-coded KeyF
lockAcquire: code                             NEW
lockClear:   code                             NEW — was hard-coded KeyT
camReset:    code                             NEW
+ the matching *Label for each
```

⚠ **THE `wheel: 'lock'` TRAP, and it is the kind that ships.** `wheel` is read in exactly three
places: `src/main.js:490-493`, `src/engine/game.js:2856`, `src/engine/hud.js:496`. `game.js:2856`
gates on `=== 'ability'`, so it fails safe. But `src/main.js:491` is
`if (… === 'hero') cycleHero(…); else cycleAbility(…)` — **a third value falls into the `else` and
silently cycles abilities**. A new `wheel` value must add a case in all three, or the wheel does the
wrong thing quietly.

⚠ Stale comment to fix in the same commit: `src/core/settings.js:67` says *"see KEYMAPS in hud.js"*
and lists `southpaw`. `KEYMAPS` is in settings.js, and `southpaw` is a legacy alias resolved at
`src/core/settings.js:47`.

### 2.2 `powerworld` — proposed entry (kbm side)

| action | key | rationale |
|---|---|---|
| move | **W A S D** | unchanged (`src/engine/game.js:2780-2783`). Camera-relative — `SETTINGS.moveRelative` is moot here (1.4) |
| look / aim | **mouse, pointer-locked** | `look: 'mouse'`. ⚠ Pointer Lock does not exist anywhere in the project — `src/core/input.js:26-33` tracks absolute client coords only, no `movementX/Y`. New work, §6.3 |
| strike | **V** (tap jab / hold haymaker) | matches 3 of 4 shipped schemes (`src/core/settings.js:11/18/25`) |
| grab | **G** | matches 4 of 4 |
| guard **and the ki charge** | **C** (+ MOUSE4/MOUSE5) | matches 3 of 4 (`:11/25/40`); mouse side buttons already alias guard (`src/engine/game.js:2838`) |
| ascend / take off | **SPACE** (hold) | matches 4 of 4. Holding it from the ground already enters flight with no toggle (`src/engine/entity.js:1229`) |
| descend | **X** (hold) | ⚠ takes X off `item`. Ctrl is unavailable by ruling: Ctrl+W closes the tab and cannot be blocked (`src/core/input.js:14-17`) |
| afterburner / dash | **SHIFT** (hold) | unchanged double duty: cruise (`src/engine/game.js:2820`) *and* the `shift` ability slot (`:2852`) |
| flight toggle | **F** | unchanged (`src/engine/game.js:2861`), now **optional** rather than required |
| powers | **LMB · RMB · Q · E · R** | unchanged (`src/engine/game.js:2849-2851`). Note the 4th power slot is `f` in data but bound to `KeyH` |
| 4th power | **H** | unchanged |
| item / gadget | **MMB (middle mouse)** | ⚠ `input.js` does not read button 1 at all (`src/core/input.js:34-40` handles 0/2/3/4). Zero collisions, new wire |
| hands 1–4 | **1 2 3 4** (`digitsSwap: false`) | already the non-CLASSIC behaviour (`src/main.js:430-433`) |
| lock acquire | **MOUSE4** *or* a dedicated key | ⚠ takes `b3` off guard duty; `b4` stays guard. If the player has no side buttons, fall back to **Q**? No — Q is a power. ⚠ GUESS: **this is the one kbm binding I am not confident about**, and the honest resolution is that it becomes a rebindable key rather than a decree |
| lock cycle | **MOUSE WHEEL** (`wheel: 'lock'`) | see 2.3 |
| lock clear | **T** | unchanged (`src/engine/game.js:2747`), moved into the table |
| camera reset behind | **MMB double-tap** or **Middle-drag** | ⚠ GUESS |
| hero swap | **[ ]** | already the non-CLASSIC behaviour (`src/main.js:394-396`) |

**There is no ki-charge binding, and that is the finding, not an omission.** BFP's `.` powerup
already exists in this engine on **held guard**: `src/engine/entity.js:1132-1156` — guard held with
`_safeDist > 55` for `_chargeT > 0.5` sets `chargingKi`, which yells (`:1147`), regens at **40/s**
instead of 22 (`:1148`), spawns rising sparks (`:1149-1155`), turns the state ring gold-pulsing
(`src/engine/entity.js:1871`) and makes you **defenceless** — any hit lands full and interrupts
(`src/engine/entity.js:652-653`). It is a three-rung ladder already: 22/s in-combat guard-charge →
40/s scream → 0 when touched. Binding a second key to it would be a duplicate door to one system.

⚠ **One real design call for Robert, not a bug:** the `_safeDist > 55` gate
(`src/engine/entity.js:1144`) means the scream is a *retreat*. BFP's powerup is usable mid-fight.
55u was chosen for a 240u arena; in a fight spanning 300u+ it is nearly always satisfied, so the
gate may already be effectively open in POWERWORLD. **Measure it before touching it.**

### 2.3 The wheel, and the resolution of the `THE_HANDS.md` contradiction

`docs/THE_HANDS.md:113-118` flags its own contradiction: the mapping table says hands cycle on *"the
mouse wheel (schemes where the wheel is not picking abilities)"* while the note below says CLASSIC is
where *"hands live on the wheel alone"* — but CLASSIC's wheel is hero swap
(`src/core/settings.js:10`). The doc's conclusion is *"CLASSIC has no free binding for hands…
Decide it before binding anything."*

**POWERWORLD decides it, and it does not need the wheel for hands at all.** Hands are on the digits
(`digitsSwap: false`, `src/main.js:430-433`); hero swap is on the brackets. That leaves the wheel
free, and in a lock-on flight brawler the best thing on it is **target cycling** — the one action you
want with your aiming hand, without leaving the mouse. So:

- `wheel: 'lock'` — roll to step the lock through visible candidates.
- CLASSIC's contradiction is untouched and still open; POWERWORLD simply does not inherit it.

### 2.4 THE COLLISION TABLE

Every collision I found, including the Ultra BFP ones the brief asked to be flagged explicitly.

| key | current owner(s) | POWERWORLD | verdict |
|---|---|---|---|
| **V** | strike in classic/pilot/hybrid (`settings.js:11/18/25`); **grab** in BRAWLER (`:40`); **Ultra BFP = first/third-person toggle** | strike | ⚠ **BFP's V is NOT honoured.** In POWERWORLD the camera is already third person, so a first/third toggle is a *different feature*; if built it goes on a non-combat key or a camera dial — never on the jab, which 3 of 4 schemes and all the muscle memory own |
| **Z** | descend in classic/hybrid/brawler (`:11/25/40`); **item** in PILOT (`:18`); **Ultra BFP = ascend** | left unbound | ⚠ **BFP's Z-ascend is NOT honoured** — it collides with our descend in 3 of 4 schemes. Deliberately left free so a `POWERWORLD (BFP)` alt scheme can exist without a second conflict |
| **X** | item in classic/hybrid/brawler (`:11/25/40`); **guard** in PILOT (`:18`); **Ultra BFP = descend** | **descend** | ⚠ BFP's X-descend and our X-item collide. Here POWERWORLD **sides with BFP** — X becomes descend, item moves to MMB. This is the one place the reference wins, and it costs the X-gadget muscle memory in 3 schemes |
| **`.` Period** | unbound; **Ultra BFP = powerup** | unbound | No collision — and not needed. The powerup is held guard (`entity.js:1132-1156`). A second door to one system is the duplicate-`Weather`-class mistake (CLAUDE.md WEATHER + GOLDEN HOUR) |
| **F1 / F5 / F6 / F7** | **F1 = the controls panel** (`src/main.js:379`); F2 = telemetry (`:380`); **Ultra BFP = camera / transformation / music / dragon radar** | F1 keeps the panel | ⚠ BFP's F1 collides. F5–F7 are free but every one of those four menus already has a home here (radar → `hud.updateRadar`; transformation → §5; music → Options buses) |
| **C** | guard in classic/hybrid/brawler; descend in PILOT | guard | consistent with 3 of 4 |
| **SPACE** | ascend, 4 of 4; `preventDefault`ed (`input.js:22`) | ascend | none |
| **F** | flight toggle hard-coded (`game.js:2861`); **also `strike` in BRAWLER** (`settings.js:40`) | flight toggle | ⚠ **PRE-EXISTING COLLISION — F both punches and takes off in BRAWLER.** Found, not introduced. Must be fixed when `flight` enters the table |
| **G** | grab, 4 of 4. Ctrl+G blocked (`input.js:17`) | grab | none |
| **T** | clear hard lock (`game.js:2747`) | clear lock | none; move into the table |
| **1–0** | hero swap when `digitsSwap` (`main.js:434`); hands 1–4 otherwise (`main.js:430`) | hands 1–4 | none |
| **[ ]** | hero swap when `wheel !== 'hero'` (`main.js:394-396`) | hero swap | none |
| **wheel** | `'hero'` or `'ability'` (`main.js:490-493`) | `'lock'` | ⚠ a third value falls through `main.js:491`'s `else` into `cycleAbility` — **must add the case in all three readers** |
| **SHIFT** | cruise (`game.js:2820`) **and** the `shift` ability slot (`:2852`) | afterburner/dash | pre-existing double duty, kept, documented |
| **MMB** | **unread** (`input.js:34-40`) | item | none — new wire |
| **MOUSE4 / MOUSE5** | both alias guard (`game.js:2838`) | b4 guard, b3 lock | ⚠ splits an existing pair |
| **B / N** | spawn rival / spawn dummy (`main.js:400`, `405`) | dev-only | ⚠ these ship as player-facing keys today |
| **✕ / A** (pad 0) | `fly` (`gamepad.js:13`); menu `confirm` (`glyphs.js:33`) | **strike** | ⚠ hard-moved, see §3. Menus are unaffected — `UINav` reads RAW index 0 (`src/core/uinav.js:167`), not the named map |
| **□ / X** (pad 2) | `strike` (`gamepad.js:11`); `item: 'square'` in PAD_ACTION (`glyphs.js:33`) | power `q` | ⚠ `PAD_ACTION.item` is already a lie — `MAP` has no `item` and square is strike |
| **L1** (pad 4) | guard (`gamepad.js:12`) | **descend (hold)** | guard → L4 |
| **R1** (pad 5) | dash (`gamepad.js:9`) | **ascend (hold)** | dash → L5 |
| **L3** (pad 10) | descend (`gamepad.js:14`) | hero swap / camera reset | freed |
| **D-pad ← →** (14/15) | powers `f` and `e` (`gamepad.js:16`) | **hands cycle** | ⚠ exactly the conflict `docs/THE_HANDS.md:74` says to *"write down before building"*. Powers move to □ and D↑ |
| **D-pad ↓** (13) | swap hero (`gamepad.js:17`) | power `f` | swap → L3 |
| **(nothing)** | **no `item` on pad** (`gamepad.js:7-19`), **none on touch** (`touch.js:19-20`) | **R5** | ⚠ **LIVE BUG** — gadgets and every scavenged weapon are keyboard-only on all three non-kbm devices |

---

## 3. THE STEAM DECK LAYOUT

### 3.1 The one fact that decides the whole layout

**The right thumb is on the right stick, so it cannot hold a face button while aiming.**

Everything that must be *held* while looking around therefore goes on a shoulder, a trigger, or a
back button — never a face button. The held-while-aiming set in this engine is large, because holds
are how the engine expresses commitment:

- ascend / descend (`flyHeld`, `descendHeld` — `src/engine/entity.js:1229`, `1283`)
- guard, and therefore the ki charge (`src/engine/entity.js:1132`)
- afterburner / cruise (`cruiseHeld`, `src/engine/game.js:2820`)
- **primary and secondary powers** — beams and charges are `held`, not `pressed`
  (`src/engine/game.js:2849-2850`)
- lock (hold-to-cycle, §4)

**This is why the current pad map fails POWERWORLD outright: `fly` is on ✕
(`src/core/gamepad.js:13`).** Flying upward while aiming is the single most common action in a flight
brawler, and today it requires the right thumb to be in two places.

### 3.2 The layout

| control | action | why there |
|---|---|---|
| **Left stick** | move | unchanged (`gamepad.js:39`) |
| **Right stick** | **look / aim** — the camera | ⚠ `pad.dead = 0.24` (`gamepad.js:24`) is fine for an 8-way move intent and far too large for a camera: it will read as the view "sticking" before it moves. The look axis needs its own smaller deadzone and a response curve. **I am not inventing the number — measure it** |
| **R2** | primary power (hold) | unchanged, `MAP.lmb = 7` |
| **L2** | secondary power (hold) | unchanged, `MAP.rmb = 6` |
| **R1** | **ASCEND (hold)** | ⚠ moved off ✕. Index finger, holdable indefinitely, both thumbs free. **The most important single change in this document** |
| **L1** | **DESCEND (hold)** | ⚠ moved off L3. Clicking a stick you are also pushing is a bad hold, and on a Deck L3 is a hard click |
| **L4** (back) | **GUARD (hold) → and therefore KI CHARGE** | Middle/ring finger, holdable forever while both thumbs work. This is the DBZ powerup on a Deck, and it costs no thumb |
| **R4** (back) | **LOCK-ON** — tap acquire, hold + right-stick flick = cycle | Must be holdable *while aiming*; a face button cannot be |
| **L5** (back) | **AFTERBURNER / dash (hold)** | Frees R1 for ascend, and lets you burn while aiming *and* firing — the three-hold case a flight brawler needs |
| **R5** (back) | **ITEM / gadget** | ⚠ closes finding (C): the pad has never had one |
| **✕ / A** | **STRIKE** (tap jab / hold haymaker) | A face button is acceptable here *because the lock is holding your aim* — you can take the thumb off the stick for a punch. That is the lock earning its keep |
| **○ / B** | GRAB | unchanged (`MAP.grab = 1`) |
| **□ / X** | power `q` | absorbs the D↑ power |
| **△ / Y** | ULTIMATE (`r`) | unchanged (`MAP.r = 3`) |
| **D-pad ← →** | **HANDS cycle** | exactly what `docs/THE_HANDS.md:71-74` specifies, now that the conflict is resolved |
| **D-pad ↑** | power `e` | |
| **D-pad ↓** | power `f` (the `KeyH` slot) | |
| **L3 click** | hero swap / camera reset behind | freed by moving descend to L1 |
| **R3 click** | camera reset behind (alt) / free-look toggle | ⚠ GUESS — the conventional binding, unvalidated here |
| **Left trackpad** | camera dials as a 4-zone radial: zoom in/out, reset behind, shoulder swap | A rarely-touched cluster belongs on a surface you would never hit by accident |
| **Right trackpad** | pointer emulation for the DOM screens | ⚠ **Not optional.** The atlas, codex, armory, career desk, ORIGIN creator and HQ globe are all mouse-designed DOM; `UINav` covers only stick + A/B (`src/core/uinav.js:152-168`). Without a pointer a Deck player cannot reach half the game |
| **Gyro** | fine aim trim, active only while R2/L2 is held | ⚠ GUESS — the standard "gyro-as-mouse while firing" convention. Default off |
| **START / SELECT** | pause / roster | unchanged (`gamepad.js:17`) |

### 3.3 What already exists on the Deck side, and what it does not do

- **`body.deck` and `DECK_CSS` exist and work.** Detection: `/steam ?deck/i` on the UA **or** a pad
  plus exactly 1280×800 (`src/main.js:90`), toggled at `src/main.js:93`, re-run on resize
  (`:103`), with a headless hook `window.LSW_phone` (`:104`). `DECK_CSS`
  (`src/engine/hud.styles.js:935-950`) steps the whole type ramp up ~15% via token override, grows
  menu targets to 42px, and widens the hint panel. Its own comment states the intent: *"The HUD
  layout itself stays desktop — the Deck has the room."*
- ⚠ **`game.pad.preferGlyphs = true` (`src/main.js:100`) is a dead wire.** `preferGlyphs` appears
  nowhere else in the repo. The panel does switch to pad glyphs, but via `padActive(pad)`
  (`src/engine/hud.js:500`, `src/core/glyphs.js:38`) — "has a pad ever been used" — not via that
  flag. Harmless today; delete it or wire it.
- ⚠ **`PAD_ACTION` must be rewritten in the same commit as `MAP`.** `src/core/glyphs.js:25-26` says
  so in writing: *"Mirrors MAP in core/gamepad.js — if you rebind there, rebind here, or the panel
  starts lying again."* The Deck's help panel is the *only* control documentation a Deck player gets
  (`src/engine/hud.js:503-510`), so a stale `PAD_ACTION` is worse here than anywhere else.
- ⚠ **The pad help panel is missing rows POWERWORLD needs**: no lock-on, no ki charge, no hands, no
  camera. And it currently prints `G('item')` → `□` (`src/engine/hud.js:507` +
  `src/core/glyphs.js:33`) for a binding that does not exist.
- **`UINav` is safe against a `MAP` rebind** — it reads raw indices 12–15 and 0/1
  (`src/core/uinav.js:155-168`), so menus keep working when the D-pad's *named* bindings move.

---

## 4. LOCK-ON: THE INTERACTION, AND THE HONESTY LAW

### 4.1 The interaction

- **TAP** = **acquire / re-acquire** the best candidate: highest dot against `aim3` inside the 3D
  cone, among candidates that pass the visibility gate. Tapping while already locked re-acquires
  (so you can flick to a nearer threat) — it does **not** toggle off.
- **HOLD + right-stick flick (pad) / roll the wheel (kbm)** = **cycle**. Ordering is **screen order,
  left → right**, not distance order: screen order is what the player perceives.
  `world.screenPosOf(x, y, z, out)` (`src/engine/world.js:1767`) already returns `{x, y, behind}` —
  sort by `.x`, drop everything `behind`. This is the one legitimate remaining use of screen space:
  choosing among things you can actually see.
- **RELEASE** = **keep** the highlighted lock. Never clear on release — a lock you lose by letting go
  of a button cannot be held while you punch, which is the entire point of having one.
- **CLEAR** = `T` on kbm (unchanged, `src/engine/game.js:2747`); on pad, hold R4 ≥ ~0.35s with **no**
  stick input. ⚠ GUESS on the duration; it needs feel testing, and it must not be so short that a
  cycle-hold accidentally clears.
- **The tell.** The red crosshair already exists — `_buildLockMark` (`src/engine/game.js:291`), the
  ring + four ticks + centre dot documented in CLAUDE.md THE FOUR-DECK LADDER; the gold reticle stays
  the soft-aim marker (`src/engine/game.js:304-311`, `updateReticle` `:1201-1218`). Cycling must move
  the crosshair *visibly* and the foe bar with it (`src/engine/hud.js:1904`).

### 4.2 Where the honesty law lives, and what a lock must obey

**The bot half** — CLAUDE.md:3046, *"Bot senses — THE HONESTY LAW (`ai.js`, rebuilt 2026-07-23): a
bot may act ONLY on what it has earned"*, with the operative sentence *"Never read a foe's position
outside the `sees` branch."* Belief comes from `sight` / `radio` / `noise` only.

**The player half is enforced at five sites, and this is the list a POWERWORLD lock must join:**

1. `pickTarget` — `if (this.fov && (f._vis || 0) < 0.4) continue;` — *"can't target what you can't
   see"* — **`src/engine/game.js:1309`**
2. `updateReticle` — the red triangle draws only while `(!this.fov || (h._vis || 1) > 0.35)` —
   **`src/engine/game.js:1214`**
3. `hud.updateFoeArrow` — `(!g.fov || (n._vis || 0) > 0.4)` — **`src/engine/hud.js:791`**; the locked
   foe bar the same, **`src/engine/hud.js:1904`**
4. the radar — `if (!this.spectatorBands && g.fov && (e._vis || 0) < 0.4) continue;` — *"the honesty
   gate again"* — **`src/engine/hud.js:650`**
5. the altitude/band strip — `const vis = g.fov ? (e._vis || 0) : 1;` — **`src/engine/hud.js:1500`**

`_vis` is produced by `updateVision` (`src/engine/game.js:1221-1245`) from `_humanSees`
(`:1247-1254`), which ends in `canSee` (`:1256-1275`) — segment-vs-cover plus interior walls, with
the documented both-endpoints-inside case at `:1266-1272`.

**Three rules a POWERWORLD lock must obey:**

1. ⚠ **Add the gate to `pickTargetDir`.** `src/engine/game.js:1336-1347` has no `_vis` test. It is
   the pad's targeting path *today* — so this is a live honesty hole on gamepad before POWERWORLD
   exists — and it becomes the primary acquisition path. One line, copied from
   `src/engine/game.js:1309`.
2. ⚠ **A lock must not survive losing sight.** Today `hardLock` persists through a wall: only the
   triangle hides (`:1214`) while `faceDir` (`:2754`) keeps tracking the live body. Required rule:
   a lock whose target has been unseen for more than ~1.2s **drops to LAST KNOWN** — the camera holds
   the last-known point, the lock releases, and the existing `?` ghost is the tell
   (`_lastKnown`, `src/engine/game.js:1294-1300`). **Reuse the 1.2s number that is already there**:
   `if (!see && e._seen && this.time - (e._ghostT || -9) > 1.2)` (`src/engine/game.js:1241`) — one
   debounce, one meaning, and it mirrors the bots' own belief decay.
3. **The cycle list is the visible list.** Candidates must pass the `_vis` gate **and** be
   `!behind`. Otherwise cycling *names* an enemy you had no way to know about — a text-label
   wallhack, which is worse than a visual one because it is exact.

⚠ **One number will need to move and I will not guess it.** `_bright` (`src/engine/game.js:1284-1288`)
reveals a foe who is charging or firing something big, within `visReveal = 130`
(`src/engine/game.js:288`, used at `:1232`). "You can lock whatever is lighting up the sky" is the
right rule for a flight brawler, but 130u was set for a 240u arena and POWERWORLD fights across 320u
of altitude alone. Measure the engagement distribution first.

---

## 5. THE TRANSFORMATION LADDER — BFP's ascend/powerup/descend is NOT our tier system

### 5.1 What we have

`tierOf(level)` is a **pure function of level**: `level >= 10 ? 4 : >= 7 ? 3 : >= 4 ? 2 : 1`
(`src/engine/entity.js:21`). `TIER_COLORS` shifts the aura accent → gold → white-hot
(`src/engine/entity.js:22`), read at `src/engine/entity.js:1741`. Crossing a tier fires the
ceremony — shockwave, lightning, pillar, slow-mo, `TIER II` announce — and the HUD meter physically
widens (CLAUDE.md Power tiers). `levelMult` folds permanently into `powerBuff`
(`src/engine/game.js:3077`). `energyInfinite` (TITAN) is **hard-capped at tier II in `levelUp`** —
"the DBZ-android tradeoff" (CLAUDE.md Flight tiers).

So our tier is **earned, monotonic, and irreversible within a match.**

### 5.2 What BFP's toggle is

**Voluntary, reversible, and continuously costed** — you power up into a transformed state that
drains, and you drop back out.

### 5.3 The argument: do not bind a key to the tier ladder

Binding "ascend a tier / descend a tier" breaks three things at once:

1. **`tierOf` is a pure derivation of `level`.** You cannot go *down* without inventing a second
   variable, at which point tier is no longer derived and the codex, the aura, the HUD meter width
   and the announce all have two possible sources of truth. This project's repeated finding is that
   a surface which can drift *will* drift (the `resistOf(def, sheet)` MAGIC row, CLAUDE.md
   DAMAGE TYPES).
2. **The ceremony is a one-time event with slow-mo and an announce.** A key that fires it on demand
   turns it into a spammable ~2-second cutscene. Ceremonies do not survive being on a button.
3. **`levelMult → powerBuff` is a permanent damage multiplier** (`src/engine/game.js:3077`). A toggle
   into it is a straight buff with no cost, which is not what BFP's powerup is.

### 5.4 What BFP's toggle actually maps onto here — and it already exists three times

- **The KI CHARGE** *is* BFP's `.` powerup, already built, already costed: held guard →
  `chargingKi`, 40/s instead of 22, a scream, rising sparks, a white-hot ring, and
  **defencelessness as the price** (`src/engine/entity.js:1132-1156`, `652-653`, `1871`). Nothing to
  build; bind guard and it is there.
- **The AFTERBURNER** *is* the flight power-up state: `def.afterburner`, ×2.1 base flight, an
  ignition ring, a wake, **14 ki/s that must exceed the 9/s regen or it is free** (CLAUDE.md
  TIER ONE + AFTERBURNERS). Held SHIFT / L5.
- **A `buff`-type ability** *is* the reversible transformation: it has a duration, a ki cost, and it
  already fires `heroYell` on transform (CLAUDE.md Sound design). Crucially it is **per-hero data**,
  which is the project's architecture — *"add a hero = add data here"* (CLAUDE.md,
  `data/characters.js`) — instead of a global key that means something different for all 52 fighters.

**Recommendation: bind nothing to the tier ladder.** POWERWORLD's powerup = held guard (already
there, already readable). POWERWORLD's transformation = a `buff` ability in a slot, per hero, in
`data/characters.js`. Neither needs a new binding, which is the strongest possible answer to "what
should the transformation ladder be bound to."

**If Robert wants a ladder you visibly climb during a fight**, the honest version is a
**TEMPORARY tier from the charge**: a full tank held long enough grants a `tierBuff` riding `buffT`
— the mechanism `powerBuff` already uses (`src/engine/game.js:3077`) — reversible because it
*expires*, costed because it eats the tank, and it never touches `tierOf`/`level`. One new field, not
a new system. ⚠ That is a **proposal**, and it would have to go through the mechanic protocol
(CLAUDE.md THE PROTOCOL: a data-driven type not an id check · one choke point · ≥2 carriers via ≥2
delivery systems · a counter · a readable tell · the manual in the same commit · headless
assertions). And it must respect TITAN's tier-II cap or that character's whole design goes.

⚠ Also note BFP's **F5 Transformation Menu** collides with nothing in our keymap (F1 is the controls
panel, `src/main.js:379`; F2 telemetry, `:380`) — but a *menu* for transformations is the wrong shape
here anyway: our equivalent is the kit, and the kit is on the slot chips, which now say what each
power is and how far it reaches (CLAUDE.md THE SLOT SAYS WHAT IT IS).

---

## 6. UNVERIFIABLE ASSUMPTIONS

Listed as assumptions precisely because nothing above leans on them as facts.

1. **Steam Deck back buttons (L4/L5/R4/R5) through the browser Gamepad API.** The §3 layout puts four
   held actions on them. Standard-mapping gamepad exposes indices 0–16; paddles are outside that and
   are reported inconsistently. On Deck they may arrive only through a Steam Input profile.
   **Verify on-device** by reading `navigator.getGamepads()[0].buttons.length` and mapping each
   physical button. **Two mitigations must exist regardless**: ship a recommended Steam Input
   profile, *and* design a fallback layout with zero back buttons.
2. **Deck trackpad → `mousemove` in the shipped context** (Gaming mode, browser as a non-Steam
   shortcut). Valve's default browser template maps the right trackpad to a mouse, which would make
   the DOM screens and possibly pointer-lock mouselook work on Deck — but I have not verified it for
   this build.
3. **Pointer Lock API** availability and behaviour in the target browser, including whether Valve's
   embedded browser honours `requestPointerLock`. There is no pointer lock anywhere in the project
   today (`src/core/input.js:26-33` is absolute coords only), so this is entirely new ground.
4. **`pad.dead = 0.24` for a look axis** (`src/core/gamepad.js:24`). I assert it is too large. The
   correct value and curve must be measured, not chosen.
5. ⚠ **THE BIGGEST ONE: whether an orthographic camera can be used for third person at all.**
   `world.camera` is an `OrthographicCamera` (`src/engine/world.js:55`). Orthographic has no
   vanishing point — "behind the player" has no depth cue and a distant tower is the same size as a
   near one, which is the opposite of what an over-the-shoulder flight camera needs. CLAUDE.md
   records what happens when you try to swap it casually: *"THE GAME CAMERA IS ORTHOGRAPHIC. Cloning
   `world.camera.constructor` with perspective args builds a degenerate frustum and renders the
   planet into a six-pixel strip that looks exactly like a broken shader"* (THE AIR AROUND THE
   EARTH), and the fix there was to borrow the news crew's `PerspectiveCamera`
   (`src/engine/newscrew.js:47`). Systems authored against orthographic that would all need
   re-validating: the fog-of-war shader plane and `_fitFog`, `screenPosOf`
   (`src/engine/world.js:1767`), the tower cutaway's camera→player segment test
   (`src/engine/world.js:1271-1279`), the 110-unit shadow frustum, the print pass's tilt-shift band
   (which CLAUDE.md justifies *specifically* by the fixed camera: *"a tilt-shift lens rotates the
   focal PLANE, which on a fixed isometric view maps to a horizontal band"*), and the entire 1:1
   scale read. **I cannot estimate this cost.**
6. **Frame budget.** Every measured number in CLAUDE.md (p50 4.2ms / p95 10.3 / p99 15.0, 0 frames
   over 50ms) was taken at `frustum` 78 looking down. A third-person camera sees much further along
   the ground; the occupancy-grid fog marches `FOG_STEPS 26` per pixel and `updateOcclusion` scales
   with what sits in the camera→player corridor. Unverified, and plausibly the largest technical
   risk after item 5.
7. **Whether the soft aim magnet should exist with mouselook.** `SETTINGS.aimAssist`
   (`src/core/settings.js:68`) gates `pickTarget`'s magnet (`src/engine/game.js:1331`). I assume: on
   for pad, off by default for mouse. Unmeasured.
8. **The ground-column click pass.** `src/engine/game.js:1319-1326` exists so you can lock a flier
   whose body is off-frame by clicking the ring on the ground. In third person that specific problem
   changes shape and I have not verified what replaces it.
9. **Whether `_safeDist > 55`** (`src/engine/entity.js:1144`) is already effectively open at
   POWERWORLD engagement ranges. Stated as a design call in §2.2; it is actually a measurement.
10. **The Ultra BFP bindings** (F1 camera, F5 transformation, F6 music, F7 dragon radar, V
    first/third, Z ascend, `.` powerup, X descend, `,` fusion) are taken **as given from the brief**.
    I did not verify them against the mod.
11. **Whether the `coneFoe` ±10u vertical gate** (`src/engine/game.js:1827`) should survive real
    vertical aim. A design call, flagged in §1.3, not resolved here.
12. **Lock-cycle timings** — the ~0.35s clear-hold and the look-axis threshold that hands `aim3` back
    to the camera (§1.4) are both ⚠ GUESSES that need feel testing.

---

## APPENDIX — pre-existing defects found while reading, worth fixing regardless of POWERWORLD

| # | defect | where |
|---|---|---|
| 1 | **No `item` binding on gamepad or touch** — gadgets and every scavenged weapon are keyboard-only | `src/core/gamepad.js:7-19`, `src/core/touch.js:19-20`, consumed at `src/engine/game.js:2840`, `2843` |
| 2 | **`PAD_ACTION.item = 'square'` is a lie twice** — `MAP` has no `item`, and square is `strike` | `src/core/glyphs.js:33` vs `src/core/gamepad.js:11` |
| 3 | **BRAWLER: `KeyF` both punches and toggles flight** — violates the table's own no-collision law | `src/core/settings.js:40` vs `src/engine/game.js:2861`; law at `src/core/settings.js:3-4` |
| 4 | **The help panel lies under BRAWLER** — hard-codes `'V'`/`'G'` instead of `K.strikeLabel`/`K.grabLabel` | `src/engine/hud.js:512` vs `src/core/settings.js:42` |
| 5 | **`pickTargetDir` has no `_vis` gate** — a live honesty hole on the gamepad's targeting path | `src/engine/game.js:1336-1347`, cf. the gate at `:1309` |
| 6 | **`hardLock` tracks a target through walls** — only the triangle hides; `faceDir` keeps following the live body | `src/engine/game.js:1214` vs `:2754` |
| 7 | **`game.fwd`/`game.right` are computed once in the constructor** and never refreshed against `world.camDir`, which `world.orbit` mutates | `src/engine/game.js:297-299` vs `src/engine/world.js:1229` |
| 8 | **`game.pad.preferGlyphs` is a dead wire** — assigned, read nowhere | `src/main.js:100` |
| 9 | **`KEYMAPS` comment points at the wrong file** and names the retired `southpaw` | `src/core/settings.js:67`, alias at `:47` |
| 10 | **`B` and `N` ship as player-facing keys** that spawn rivals and dummies in a live match | `src/main.js:400`, `405` |

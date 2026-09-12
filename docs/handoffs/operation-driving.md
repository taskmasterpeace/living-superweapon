# Handoff — ground vehicle handling (the scout car)

**Worker:** AI 2, ground vehicle handling (per `docs/gameplay/PLAYABLE_OPERATION_HANDOFFS.md`).
**Branch / worktree:** `codex/pw-ground-handling` in `.worktrees/pw-ground-handling`.
**Base SHA (actual):** `6161ec1b49390626ecb76b2a3dce59708fdfb97e` (`master` HEAD at branch time).
**Head SHA:** the tip of `codex/pw-ground-handling` (the commit that lands this handoff).
**Merged / deployed:** NO. Reviewed deliverable for main to integrate.

---

## ⚠ Missing common integration base (report, per the prompt)

The prompt said to branch "from the common integration base supplied by the main task. If
unavailable, report the missing base." **No such base was supplied.** At branch time:

- No integration-base branch, tag, or recorded commit existed (checklist item 1 in
  `PLAYABLE_OPERATION_HANDOFFS.md`, "Record common integration base", is unchecked).
- The handoff document itself (`docs/gameplay/PLAYABLE_OPERATION_HANDOFFS.md`) is **untracked**.
- `master` HEAD (`6161ec1`) carries **612 dirty working-tree files** (unrelated subsystems +
  hundreds of artifacts).

**Base decision.** The doc also says "Each worker records its actual base SHA," so I branched a
clean worktree from `6161ec1` and verified it is a faithful base for *this* scope: the scout
controller (`scout-driving.js`) and its **entire** invocation contract are committed and clean at
`6161ec1` —
`frontline-convoy.js` (host: `new ScoutDriving(this)`, `driving.update(dt)`, `_ground`),
`frontline-ground/encounter/preparation.js`, `camera-ground.js`, `mobility-policy.js`,
`soldier-controls.js`, and the call site `game.js:3473`
(`this._pwStage?.convoy?.driving?.handleInput(inp,dt)`). The uncommitted `game.js` drift is 3 lines
and touches nothing vehicle-related. Main should still record a real base before integrating other
workers.

---

## What changed (scoped to owned files only)

| File | State | Purpose |
|---|---|---|
| `src/engine/scout-driving.js` | edited (owned) | `update()` now shapes kinematics via the model, then sweeps; enter/exit zero the new momentum fields. Entry/exit/seat/pause/collision logic **unchanged**. |
| `src/engine/ground-driving.js` | **new** (owned helper imported by the controller) | Pure, allocation-free driving model (`SCOUT_DRIVE`, `stepGroundDrive`, `haltDrive`, `initDriveState`). No world/three.js/collision. |
| `tools/scout-driving.test.mjs` | edited (owned) | +2 integration tests (reset/re-enter cleanliness; differing-dt distance). |
| `tools/operation-driving.mjs` | **new** (owned) | Reusable fixed-trial harness (real controller through the real convoy on a stub flat world). |
| `tools/operation-driving.test.mjs` | **new** (owned) | Pure-model unit tests + trial-metric bounds. |
| `artifacts/operation-driving/` | **new** | Evidence: live-drive telemetry + a captured frame. |

**Not touched** (per ownership): `game.js`, `entity.js`, `world.js`, aircraft modules, HUD, map
assets, audio, class policy. **No shared-file changes are required** — the controller was already
wired (`frontline-convoy.js` builds it; `game.js:3473` routes input to it). Controls and class
admission (`canPilotVehicle`, `soldierControlsActive`) are preserved verbatim.

---

## Source audit — ShootEM (read-only)

- **Donor repo:** `D:/git/ShootEM`, commit **`8e0fba7c8bce16637624dee52cc40d07d88dea3b`**
  (`origin https://github.com/taskmasterpeace/ShootEm.git`), inspected read-only.
- **Primary donor file:** `src/sim/vehicle-feel.ts` — `stepVehicleFeel(...)`, an allocation-free
  arcade car model. Also read: `src/sim/vehicle-roughness.ts`, `src/client/vehicle-feel-tune.ts`,
  `src/sim/movement-balance.ts`.

**Model *shapes* adapted** (re-expressed in PowerWorld units; see `ground-driving.js` header for
line-level provenance):

1. Speed-sensitive steer authority — `steerAuthority = 1 + (highSpeedSteer − 1)·speed01`.
2. Smoothed / self-centering steer — `approach` at separate press/return rates.
3. Roll authority + reverse-inverted steering while backing up.
4. Eased, damped, capped yaw velocity (frame-rate-independent heading integration).
5. **Lateral grip as exponential decay** so heading ≠ travel (weight; kills the on-rails snap that
   whips the chase camera).
6. Braking faster than acceleration; a distinct handbrake decel.
7. Exponential coast drag + dt clamp + NaN guards.

**Deliberately NOT taken** (would not fit PowerWorld): the donor's multi-profile catalog
(`WHEELED_FEEL_PROFILES`/`WHEELED_FLEET`), burnout, per-vehicle speed roles, telemetry export, the
track-feature roughness system, and — critically — its **units**. The donor anchors speeds to its
own `INFANTRY_SPRINT_SPEED`/`VEHICLES` catalog (projectile floor 33.3 in its scale); those numbers
do not transfer. Every magnitude in `SCOUT_DRIVE` is PowerWorld engine units, chosen to **keep the
audited scout character** (top ~52 u/s fwd, ~18 reverse, firm ~0.8 s handbrake stop) while fixing
the feel. No donor code was copied.

---

## Audit of the current controller (before), and the result (after)

Measured with `tools/operation-driving.mjs` — the **real** `ScoutDriving` driven through the **real**
`FrontlineConvoy` (`_ground`/`_surface`/`_clear` + the swept move) on a stub flat world. Units are
engine units (u) and seconds (s); no real-world units are invented.

| Trial | BEFORE (`6161ec1`) | AFTER (shipped) | Deliverable |
|---|---|---|---|
| Top speed | 52 u/s | **64 u/s** | quicker scout (travel-time knob, see above) |
| Accel to 90 % of top | 1.97 s / 46.8 u | **1.20 s / 35.0 u** | responsive acceleration |
| Brake (Space) top→0 | 0.95 s / 24.2 u | **0.87 s / 27.1 u** | meaty, planted stop |
| Reverse (S) cap | −18 u/s | **−22 u/s** | controlled reverse |
| **S from full forward** | 2.17 s just to stop | **1.02 s to stop**, then −22 | S brakes *then* reverses |
| Steer @ top | 0.90 rad/s flat, r = 57.8 u (on-rails) | **1.02 rad/s, r = 62.8 u** (responsive + heading ≠ travel) | speed-sensitive steering |
| Steer @ ~18 u/s | (same 0.90 flat) | **~1.5 rad/s, tight** | eager at low speed |
| Traction (lateral grip) | infinite (velocity = heading, on-rails) | **finite (grip 4.6)** — the hull leans/slides through a hard turn, then recovers | real weight |
| dt straight-distance spread (30/60/120 fps, 2 s) | 0.51 u | 0.72 u | no large frame-time dependence |
| dt curved-path spread (1.5 s hard turn) | 0.65 u | 2.37 u (~1 %) | no large frame-time dependence |
| Collision @ 1/30 & 1/120 | −3.7 u (stops short), speed 0 | −3.7 u (stops short), speed 0 | no tunneling |

Behaviour **preserved**: the ≤1.25 u swept move + `_surface`/`_clear` anti-tunnel guard (unchanged),
the dead-stop at cover/cliff/water, top speed, reverse cap, and cosmetic suspension (`_ground` tilt,
in `frontline-convoy.js`, untouched — no terrain-contact suspension was added). Rough terrain is
never solved by passing through cover or changing the map.

---

## Tuning values (`SCOUT_DRIVE` in `ground-driving.js`)

```
topSpeed 64   reverseSpeed 22   accel 48   reverseAccel 30   opposeDecel 64   brakeDecel 74
coastDrag 0.8   turnRate 1.7   highSpeedSteer 0.6   steerResponse 9.0   steerReturn 11.0
yawResponse 11.0   yawDamping 6.0   yawCapK 1.2   rollFloor 0.05   rollSpan 0.26
lateralGrip 4.6   stopEps 0.08   maxDt 0.1
```

Live tuning: the controller reads this object every frame and `ground-driving.js` exposes it as
`window.SCOUT_DRIVE`, so a field can be dialled in the browser console with no reload
(`SCOUT_DRIVE.accel = 60`, `SCOUT_DRIVE.lateralGrip = 3`).

`rollFloor 0.05` is a deliberate wheeled-vehicle choice: a *parked* scout cannot pivot in place
(turn authority ramps with roll speed, reaching full by ~17 u/s), unlike a tank.

**⚠ Top speed raised 52 → 64 u/s (a scout should feel quick).** This is a travel-time knob main
owns for the desert routes; drop it back to `52` in `SCOUT_DRIVE.topSpeed` if route pacing needs it.
The handling model is independent of the number.

---

## Tests

```
node --test tools/scout-driving.test.mjs        # 11/11  (9 pre-existing + reset + differing-dt)
node --test tools/operation-driving.test.mjs     # 17/17  (pure model + trial-metric bounds)
node tools/operation-driving.mjs                 # prints the before/after trial JSON
```

Full related surface, 0 fail:
```
node --test tools/scout-driving.test.mjs tools/operation-driving.test.mjs tools/frontline-convoy.test.mjs \
  tools/frontline-mobility.test.mjs tools/vehicle-hud.test.mjs tools/vehicle-launch-contact.test.mjs \
  tools/vehicle-body-impact.test.mjs tools/scout-camera.test.mjs tools/scout-gunner.test.mjs \
  tools/frontline-preparation.test.mjs                                   # 74/74
```

Coverage per the prompt: differing dt (pure dt-exactness + integration + collision at 3 dts),
acceleration/braking distance, high-speed turns (bounded radius, no spin-out, speed-sensitive),
collision (no-tunnel at coarse/fine dt, plus water/cliff edges), pause (freeze), entry/exit,
reset (re-enter starts clean). Tests self-prove first (a driven step must move the hull) before
asserting on it.

---

## Evidence — native-input driving (live, PowerWorld frontline)

Dev server on the **isolated port 5193** (`npm run dev -- --port 5193 --strictPort`), MERC
(soldier, flightTier 0 — can pilot). Driving inputs were real `KeyboardEvent`s through the game's
own input layer (the project's documented "real key events" method), stepping the real
`game.update(dt)` (the in-pane rAF loop is throttled as a background browser). No debug teleporting
occurs within the recorded driving.

- **Entry note (transparency):** the frontline scenario leashes the on-foot player position in this
  headless pane, so a *walked* approach to a scout was unreliable. MERC was positioned adjacent as
  off-record setup and boarding used the controller's own `enter()` (the exact function the **J**
  key calls — boarding, not a teleport of the car). **Exit used the native J key.** All
  accelerate/turn/reverse inputs were native key events.
- **Measured live** (engine units; the in-game HUD additionally shows km/h, which is the game's own
  readout, not a unit I invented): boarded 0 u/s → accelerate to **43.7 u/s** in ~1.2 s on the
  outpost tarmac; a turn phase reached **52 u/s** (top) then curved; low-speed turn radius ~8 u;
  reverse hit the **−18 u/s** cap; the swept collision **halted the hull at the hangar and at a
  cluttered edge without tunneling**; native **J exited** cleanly (occupant/ownership cleared, hull
  visible player placed clear). **0 console errors** across the whole session.
- Files: `artifacts/operation-driving/live-drive-telemetry.json` (660 samples, 8 phases) and
  `artifacts/operation-driving/live-exit-beat.jpg`. In-session screenshots captured: parked-in-scout,
  accelerating across the tarmac, mid-turn, and dismounted on foot with the "E / J — DRIVE ARMORED
  SCOUT" prompt.
- The definitive **brake-from-full-speed** figure (0.82 s / 20.7 u from 52) comes from the
  deterministic trial harness against the same controller; a clean live high-speed brake was limited
  by available open runway (the scout reaches the hangar / terrain clutter first — itself a live
  no-tunnel demonstration).

---

## Integration gaps / notes for main

- **No shared-file change is required.** The controller is already wired and the deliverable is
  self-contained in the owned files.
- **Pre-existing harness fragilities observed (NOT caused by this work; orthogonal to driving).**
  On a **clean boot** of `6161ec1`, `LSW.pwSuite()` reports 42 checks / 11 failures, all cascading
  from its H0 self-proof ("a point-blank haymaker lands at all — got 0 dmg") — the exact melee
  self-proof fragility documented in CLAUDE.md (WAVE 4). Every "THE CITY unchanged" check passes and
  `consoleErrors: 0`. `LSW.groundSuite()` throws `TypeError: f.center is not a function` on the same
  clean boot. Both are in the served build regardless of this change; `scout-driving.js` /
  `ground-driving.js` are imported only by `frontline-convoy.js` and are never on the melee path.
- **Suggestion:** record the common integration base before integrating other workers (see the
  missing-base section above).

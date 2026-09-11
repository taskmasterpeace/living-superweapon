# PowerWorld aim/mouse-look is BROKEN — handoff for the next agent

**Status:** UNRESOLVED. Multiple fix attempts have NOT satisfied the user. Do not assume the last
commit fixed it — it did not. Read this whole file, then reproduce IN A REAL BROWSER TAB before
changing anything.

## The symptom, in the user's words (2026-07-29)
- "point the cursor anywhere, it just shoots straight."
- "it don't turn and shoot" — moving the mouse does not turn the view / does not move the aim.
- A **visible cursor** is on screen and the user is trying to aim with it; the shots ignore it.
- The user is frustrated after many rounds; hand this to a fresh agent and verify with a **screen
  recording of the user actually playing**, in a real browser tab, not the CC preview pane.

## The intended model — SETTLED, do not re-ask the user
**PowerWorld = Jedi Knight on the GROUND, Bid For Power in the AIR.** Both are **pointer-locked
mouse-look**: the OS cursor is captured and hidden, the crosshair is pinned to screen centre, moving
the mouse **turns the view**, and you shoot down the centre ray. There is **NO free-floating cursor
that shots chase** (that is the city game — explicitly NOT PowerWorld). References:
`docs/powerworld/aaa-02-ground.md`, `aaa-01-air.md`, `aaa-05-reticle.md`. Also stated at the top of
`CLAUDE.md`.

## How the aim is wired today (file:line)
- **Aim resolution:** `src/engine/game.js` ~3255-3290. The `_openSky` (PowerWorld) branch does
  `cam.getWorldDirection(_camDir)`, traces from the camera through screen-centre (`world.aimTrace`),
  and sets the shot to either the foe under the crosshair (converge) or a far point down `_camDir`.
  **It never reads the mouse cursor position.** The `else` branch (the ISO CITY game) uses
  `screenToGround(mouse.clientX, clientY)` — free-cursor aim. These are two different aim models.
- **Camera + mouse-look call:** `src/engine/game.js` ~3940-3962 (`cameraDrive`). In PowerWorld it
  sets `input.pointerLock = true` and calls `world.mouseLook(input.mouse.dx, input.mouse.dy)` every
  frame. ⚠ This branch only runs when `modeId === 'powerworld' && player && player.alive` — verify
  it is actually running for the user.
- **mouseLook:** `src/engine/world.js` ~1339-1348. Integrates dx/dy into `_lookYaw`/`_lookPitch`,
  sets `_lookActive = true` **only on a nonzero delta**.
- **chase camera:** `src/engine/world.js` `chase()` ~2514+. The look axis is taken from
  `_lookYaw`/`_lookPitch` when `_lookActive` (~2565-2568). `getWorldDirection` (which the aim uses)
  follows this. So the chain is: **mouse delta → `_lookYaw` → camera → `_camDir` → aim.** Break it
  anywhere and every shot goes straight.
- **Pointer-lock + the fallback I added:** `src/core/input.js` ~30-48 (`setMouse`). `mousedown`
  calls `canvas.requestPointerLock()`; `pointerlockchange` sets `mouse.locked`. My change: when
  `pointerLock` is armed but capture is NOT active, accumulate dx/dy from the raw change in
  cursor position so the view can turn without capture. **This did not fix the user's problem.**
- **Crosshair draw:** `src/engine/hud.js` `updateCrosshair` ~1908 — pinned to screen centre when not
  locked.

## What was tried and did NOT work (commits on `master`)
- `dd4cecf`, `1f40772` — fix the flight "spin" (centre the camera behind when free-flying).
- `1d46885` — flight aim fires down the crosshair ray, not the ground-hit point.
- `98824c3` — ground shots fire near-level, not into the dirt.
- `07add39` — ground over-the-shoulder camera so the crosshair clears the character.
- `c2006cc` — mouse-look fallback so the view turns without pointer-lock. **User says still broken.**

Every one of these was verified with a **headless harness** (stepping `game.update` by hand and
measuring), NOT by the user playing live in a real tab. That gap is almost certainly why they keep
"passing" while the user still can't aim.

## Hypotheses for the next agent (unverified — I could not reproduce the user's exact environment)
1. **The look delta never reaches `mouseLook` in the user's session.** Instrument it live: in a real
   tab, `LSW.input.mouse.dx` after a mousemove, `document.pointerLockElement`,
   `LSW.input.mouse.locked`, `LSW.world._lookYaw` over two frames. If dx stays 0, the input path is
   the bug, not the camera.
2. **Frame order:** `cameraDrive` calls `mouseLook(dx,dy)` and `input.endFrame()` resets dx/dy. If
   `endFrame` runs before `cameraDrive` consumes the delta (check `main.js` / the RAF loop order),
   the delta is wiped before it is used. VERIFY THE ORDER.
3. **`pointerLock` never armed:** the `cameraDrive` chase branch requires `player.alive`. If the
   player is dead/KO or the mode gate fails, `input.pointerLock` is never set true, so neither
   pointer-lock nor my cursor-delta fallback runs → no turning at all.
4. **`_lookActive` bootstrap:** it flips true only on a nonzero delta; if deltas never arrive it
   stays false and the camera uses facing/velocity, ignoring the mouse.
5. **Preview pane vs real tab:** pointer-lock is BLOCKED in the CC preview pane (an iframe). The
   whole feature MUST be validated in a real browser tab (http://localhost:5190 with `npm run dev`,
   or a deployed build) where a click can capture the mouse.
6. **Maybe the user actually wants free-cursor aim after all.** They keep saying "I don't understand
   what a cursor is / it doesn't shoot where I point." The settled directive is JK/BFP mouse-look —
   but if, after making mouse-look genuinely work in a real tab, it still feels wrong, get a screen
   recording and reconsider whether a visible-cursor aim (shoot toward the on-screen point, like the
   city game) is what they're describing. Do not re-litigate blindly; watch them play.
7. **Sensitivity:** `world._lookSens` — if too low, turning reads as dead even when working.

## How to verify a real fix (do ALL of these)
- **Headless chain:** `LSW.enter({mode:'powerworld',p1:'sol'})`; inject `LSW.input.mouse.dx = 40`;
  step `LSW.game.update(1/60)`; assert `LSW.world._lookYaw` changed AND `LSW.game.player.aim3`
  rotated. (This chain DOES work when dx is injected directly — proven — so the failure is upstream:
  dx not flowing from the real mouse.)
- **Real tab, live:** open the dev server in Chrome (NOT the preview pane), click the canvas, move
  the mouse. The view must turn and the shot must follow. Instrument the values in hypothesis #1.
- **Screen recording of the user** confirming it turns and shoots where they look.

## Repo
- **GitHub:** `taskmasterpeace/powerworld` (private) — https://github.com/taskmasterpeace/powerworld
- **Local clone:** `D:\git\powerworld`
- **Run:** `npm run dev` (see `.claude/launch.json`). Front door `/` = PowerWorld; `/citygame.html`
  = the city game (ASCENDANTS).

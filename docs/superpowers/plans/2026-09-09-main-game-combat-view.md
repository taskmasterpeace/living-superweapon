# Main-game combat view implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Execute the integrated task with RED/GREEN checkpoints and independent review. Preserve this shared dirty checkout; no commits, staging or worktree copy.

**Goal:** Make the normal root-page one-player city game use the intended BFP rear view, matching aim controls and compact readable HUD without replacing or disabling the living city.

**Architecture:** Introduce one camera/control/HUD view policy separate from world and fighter simulation identity. Route the existing BFP camera and ray-aim implementation through that policy; preserve native city physics, damage, visibility, civil systems and update order. Keep the semantic PowerWorld mode/class separate from reusable third-person presentation.

**Tech Stack:** Existing JavaScript, Three.js0.169, Vite, node:test and installed Playwright. No dependencies.

**Spec:** Latest user root-game screenshot/question, `PRODUCT.md`, `docs/COMPLETION_LEDGER.md`, the two linked user briefs, and `docs/reports/2026-09-09-main-game-camera-integration-preflight.md` (fully parent-read). Existing BFP framing evidence: `docs/reports/2026-09-09-bfp-camera-framing-preflight.md`.

## Global Constraints

- Keep `/` as the actual game entry and preserve the selected city. Do not redirect to PowerWorld or create a replacement demonstration scene.
- No cape embellishment, map redesign, architecture migration, paid asset requests or imaginary audio access.
- Traveling beams remain hoses. Preserve BFP camera and existing controls.
- Do not set `_openSky`, `_chaseKb`, `ms.powerworld` or `body.powerworld` to obtain a city camera. These own unrelated physics/civil behavior.
- BFP defaults remain25.5 rear range,9 lift,73.74 vertical FOV, root+5.4 anchor and existing authored camera overrides. Camera collision may shorten/offset its actual path as already implemented; no global lens retune.
- Preserve actual cover/terrain/interiors, collision/LOS, ordinary city flight eligibility/physics, police/threat, pedestrians and native correspondent updates.
- No new hit, movement, audio, particle or simulation clock. No alternate damage/target implementation for the preview or tests.
- Normal one-local-player city gameplay gets this view. Two configured local humans keep their shared view even if one dies; map/opening/spectate/KO retain their existing overriding camera owner. Specialist non-city modes retain their current view unless already PowerWorld.
- Tests and screenshots are scoped evidence, not AAA/player-feel acceptance. Record original native paths and remaining gaps.

## Rulings and boundary review

Ruling: Enable BFP as the normal one-player city presentation, not as a hidden opt-in — the latest actual-game screenshot exposes the delivery mismatch and the user repeatedly specified BFP framing — if the creator wants city isometric as a player preference later, add an explicit option rather than using the wrong default now.

Ruling: Keep two-local-player shared-camera behavior and specialist rooms unchanged — one exclusive rear camera cannot fairly show both controlled players and the user did not request split-screen — this limits this pass to normal one-player city/PowerWorld gameplay.

Ruling: Keep city movement/flight physics unchanged while fixing view-relative control — `_openSky` is a simulation mode, not a camera flag — if later city flight tuning is required, it gets its own native-motion evidence rather than piggybacking on a view correction.

Ruling (parent-authorized input boundary): In active one-player BFP view, hold L1 and click R3 to toggle the viewed lock. L1 keeps its intentional guard behavior; consume R3 through physical release, including when L1 releases first, so the chord never emits an item/fire/dash. Standalone R3 remains item and L3 remains descend; legacy/P2 mappings are unchanged. Add an accessible touch lock button through the existing touch layout. This is additive input authoring, not a new control system.

Ruling (acceptance catalog correction): `src/data/modes.js` publishes Free Roam and the specialist `lab`, not the legacy `training` mode. Real root-entry proofs use Free Roam and Duel2P; do not invent a Training menu. A direct `startMode('training')` may establish native compatibility only. Existing `cycleLock` excludes range dummies, so explicit hostile-lock input uses a genuine native rival with any passive placement fixture disclosed separately.

| Shared boundary | Conflict risk | Required resolution |
| --- | --- | --- |
| Camera selection / input prepass | Camera may still be orthographic on the first shot | Same view policy; establish matrices before the first control trace even with zero mouse delta |
| Mouse / pad / touch | Old pad branch wins before BFP ray aim | Feed stick look once using unscaled input duration; then use the same ray/lock contract; retain heading on release |
| HUD / city identity | PowerWorld CSS hides wanted/news/city | Separate `combat-chase` presentation class; reuse only compact layout and crosshair selectors |
| Pause/map/KO / input ownership | Early return skips camera cleanup | Boundary cleanup executes even at zero elapsed time; cancel/retire existing held input and pointer capture |
| View / physics | `_openSky` changes flight/knockback/body rules | Explicit camera style argument only; no broad gate replacement in Fighter or projectiles |
| Native city / tests | Posed or redirected arena screenshots conceal failure | Acceptance boots `/` and uses real title/mode controls; native civil registries stay enabled |

## Integrated Task1: Shared view policy, controls and HUD

This is one reviewed delivery because a rear camera without matching aim/crosshair is not playable. Implement internally in the ordered checkpoints below; do not call a camera-only partial patch complete.

**Files:**
- Create `src/engine/combat-view.js`: small pure view-policy module; no DOM, Three.js or simulation writes.
- Modify `src/engine/game.js`: camera arbitration, pre-control eye solve, BFP aim/lock selection, one-player pad/touch look, flat view-relative movement/evade and lifecycle cleanup only.
- Modify `src/engine/world.js`: explicit BFP presentation argument for existing `chase`, `_bfpCameraActive` and camera-only ownership; no new camera implementation.
- Modify `src/engine/hud.js` and `src/engine/hud.styles.js`: projected crosshair, compact chase layout and city information coexistence.
- Modify `src/boot.js` only if required to execute existing input/pointer cleanup at pause/menu/blur transitions. No route or profile identity replacement.
- Modify `src/core/gamepad.js` and `src/core/touch.js` only for the parent-authorized chase lock chord/button and physical-release ownership; current HUD help/touch CSS may expose those controls. Cover both chord-release orders, pause/return and standalone item/descend.
- Create `tools/main-combat-view.test.mjs`; create focused fixture helper under `tools/helpers/` only if needed.
- Modify `tools/ground-camera.test.mjs` only to correct the independently demonstrated settled-floor fixture and add actual native floor-discovery control. No weakened visibility assertions.
- Parent owns `tools/main-entry-camera-browser.mjs`; worker may read/run it, but coordinate before editing. New worker browser cases belong in `tools/main-combat-view-browser.mjs`.
- Report `docs/reports/2026-09-09-main-game-combat-view-report.md` with exact commands, errors and remaining evidence limits.

**Interface contract:**
- `combatView(game)` returns `'bfp'`, `'shared'`, `'override'` or `'legacy'`, with no mutations. An existing map camera wins. Two configured local humans return shared. A live single controlled subject in a city mode or existing chase mode returns BFP; otherwise legacy. Merely pausing does not need to replace the held gameplay camera.
- `combatLookActive(game)` is true only for BFP view with running gameplay, live subject and no title/modal/end/map ownership. Its caller handles retirement using existing input cancellation when ownership changes.
- Extend `World.chase(subject,target,dt,style='auto')`; explicit `style==='bfp'` or unchanged auto+`subject._openSky` uses the existing BFP solver. All existing three-argument callsites retain legacy behavior. Derive `_bfpCameraActive` from the selected presentation without stamping the fighter.
- Consumers ask these shared predicates rather than inventing independent mode checks. The resolver must not import `Game` or call effectful methods. Use existing pure `hasCity` metadata and safe readonly modal state.

### Checkpoint A: Failing native policy and camera tests

- [ ] Add pure policy tests (one native city player, two configured players including deadP2, map owner, missing/dead subject, specialist room, existing PowerWorld; pause/overlay capture false).

```js
const state={modeId:'freeroam',running:true,mode:{},ms:{roam:true},
 player:{alive:true},humans:[{scheme:'kbm'}],hud:{titleOpen:false}};
assert.equal(combatView(state),'bfp');
assert.equal(combatLookActive(state),true);
assert.equal(combatView({...state,humans:[{},{}]}),'shared');
assert.equal(combatView({...state,mapCam:{}}),'override');
assert.equal(combatLookActive({...state,running:false}),false);
assert.equal(state.player._openSky,undefined);
```

- [ ] Add real World/Fighter checks with a city subject: explicit BFP selection gets the existing lens/anchor and native terrain/cover clearance, while zero-time calls leave position/velocity/flight identity unchanged. Test an ordinary existing three-argument non-open-sky call separately for compatibility.
- [ ] Run the focused command and record intended REDs before production edits.

```powershell
node --test tools/main-combat-view.test.mjs
```

### Checkpoint B: Native camera and input authority

- [ ] Implement the small resolver and explicit World camera argument; reuse existing `_chaseBfp` rather than copying it. Route the pre-control and final camera solves through the same selection. Establish a perspective view before the first native shot even without a mouse delta.
- [ ] Replace only the camera/aim/lock presentation gates in `controlPlayer`: camera-center physical ray; muzzle-to-traced-point `aim3`; explicit T acquire/release; no click-to-auto-lock in this view. Native physical obstructions remain distinct from valid hostile locks/readouts. Preserve `lockAvailable` range/visibility/LOS and existing damage allegiance rules.
- [ ] Move the one-player pad/touch look adapter before the shared aim trace. Use the native pad deadzone and existing unscaled input duration; choose and document bounded stick angular sensitivity consistent with the existing mouse-look function. No drift when released, no double application, no cursor-origin snap on device handoff. Do not change `controlPad` for P2.
- [ ] Use current flat camera axes for camera-relative city movement and evade; keep selected aim-relative behavior intentional. Do not activate the PowerWorld3D flight-forward/swoop branch for a city actor.
- [ ] Add real controller tests for first-frame aim, mouse flick, explicit lock/ally/hidden/cover rejection, camera-relative walk/evade, pad neutral/release/handoff at30/60/120Hz, and no city flight eligibility mutation.
- [ ] Execute ownership cleanup at pause/title/modal/map/KO/respawn/hero replacement with zero-time coverage. Use existing cancellation; no delayed paid attack on return and no stale foreground material ownership.

### Checkpoint C: Shared compact presentation without hiding the city

- [ ] Give active BFP gameplay a distinct `combat-chase` class. Keep the semantic `powerworld` class driven by actual mode identity only. Share existing compact dock/crosshair CSS with the new class; do not share city/wanted/news suppression rules.
- [ ] Show the projected crosshair/lock status using the view policy; hide the isometric ground reticle while this view is active. Remove stale crosshair/target when camera ownership changes.
- [ ] Keep health/energy, the two selected attacks and necessary warnings readable. Preserve city/wanted/news in compact edge positions; inspect their actual combined footprint rather than asserting only individual selector visibility. Respect existing phone/tablet controls. No dashboard/menu redesign.
- [ ] Add tests for no false PowerWorld identity, actual city elements retained, overlays not capturing gameplay input, and2P/map/KO cleanup.

### Checkpoint D: Native root-page acceptance

- [ ] Run the existing parent root-entry harness as a RED before changing runtime if not already captured; its default before mode reproduces iso and no crosshair. After implementation require BFP with the same root/UI flow:

```powershell
$env:LSW_TEST_URL='http://127.0.0.1:5189'
$env:LSW_CAMERA_EXPECT='bfp'
$env:LSW_CAMERA_OUT='artifacts/main-entry-camera-after'
node tools/main-entry-camera-browser.mjs
```

- [ ] Extend worker browser evidence through actual root mode/character/city controls, not an alternate boot. Capture training and civil Free Roam, real canvas pointer-lock acquisition, ground/flight movement, free/T-locked low/high targets near real cover, selected primary+secondary controls, and a native traveling shot reaching the shown target. Use the existing native rival/range controls to stage targets, recording any fixture setup separately from input proof.
- [ ] Capture two-local-player fit, pause/menu/map return and KO/respawn input state. Cover mouse and actual pad/touch intent adapters; clearly distinguish synthesized standard pad state from physical hardware verification.
- [ ] Inspect matched16:9 main-game frames and motion, small/large authored bodies including cannon/guard, and city HUD at390px plus a medium desktop viewport. No general target-visibility claim from a single SOL still.
- [ ] Preserve city name, `_openSky===false`, flight tier, police/news activation and native contact winners in artifacts. Record actual GPU/browser, foreground timings and errors with correspondent operating. Existing cold shader stalls remain open unless measured fixed by separate work.
- [ ] Run focused regression/build gate and independent review before acceptance:

```powershell
node --test tools/main-combat-view.test.mjs tools/ground-camera.test.mjs tools/ground-camera-cover.test.mjs tools/foreground-visibility.test.mjs tools/combat-selection.test.mjs tools/progression-input.test.mjs tools/newscrew.test.mjs
npm run build
```

## Status / evidence baseline

- Plan self-review: camera, input, HUD and lifecycle share the same predicate; world identity stays separate; physical hit versus hostile-lock distinction explicit;1P pad and2P preservation included; native root route and real civil mode covered. No task-only redirect qualifies.
- Native root baseline already passed as a reproduction, not a fix: parent `tools/main-entry-camera-browser.mjs` through the real Free Roam selection,1600×900 RTX4090/Chromium, reports `camMode=iso`, `OrthographicCamera`, crosshair displaynone, White City, police/news active, `_openSky=false`, zero errors. Screenshot inspected at `artifacts/main-entry-camera-before/root-city.png`.
- Implementation not started. Parent prioritizes this task after the active bounded audio metadata correction and load-bearing nanite KO-pose review finding are settled. No claim that the root camera is fixed yet.

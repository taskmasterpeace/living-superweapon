# Impact Playable Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Checkboxes below are not completion claims.

**Goal:** Deliver a coherent hero/soldier test build by 19:00 Eastern, with truthful comic feedback and explicit remaining defects.
**Architecture:** Extend current damage, comic, audio, equipment and chase-camera authorities. No second combat engine or separate showcase simulation.
**Tech Stack:** Existing JavaScript / Three.js / Vite, Node tests and Playwright.
**Spec:** docs/superpowers/specs/2026-09-10-impact-playable-slice.md

## Global Constraints
- Full active goal remains intact; this is a release checkpoint, not its replacement.
- Worktree D:/lsw/.worktrees/sarge-authoring-integration; preserve user checkout D:/lsw and port 5180.
- No purple UI. Centered BFP is default. No new air-combat scope tonight.
- No changing damage arithmetic in the presentation task.
- Do not claim UI mocks, source recordings, catalog entries or passing narrow tests prove a native feature.
- Keep source assets and generated output outside commits unless explicitly selected. No blanket git add.
- Timeboxes are targets; at cutoff report red gates honestly, never relabel incomplete features complete.

## Clock / priority
At planning start: 17:30 Eastern on 2026-09-10.
- 17:30–17:45: audits, corrected art guide, external handoffs and acceptance definition.
- 17:45–18:10: P0 truthful outcome feedback + fix already-reviewed equipment/Studio defects.
- 18:10–18:30: P0 actual loadout issuance, runtime camera settings, bounded speech restoration.
- 18:30–18:35: integrate only reviewed changes; freeze feature work.
- 18:35–18:55: exact-build real-input testing, capture and regression fixes only.
- 18:55–19:00: deliver tested route, commit, clips, controls, red/green gate list.
If a task overruns, protect final verification time. New building art, drones, RC cars and aircraft are excluded from this checkpoint, not abandoned.

## Task 1 — Truthful comic combat result (main combat owner)
Files: src/engine/entity.js, damage-admission.js, game.js, projectiles.js, comic.js; create src/engine/hit-feedback.js and tools/hit-feedback.test.mjs.
- [ ] Capture a read-only resolved hit outcome at existing resolution stages, including actual healthLost, absorbed amounts by plate/armor/shield/nanite, resolved dtype, active guard result, actual status transitions, contact and KO state.
- [ ] Preserve onHit's current positional parameters and existing blocked consumers; pass new optional outcome metadata, not a replacement damage return value.
- [ ] Include deflection's early-return path without invoking damage a second time.
- [ ] Define pure presentation API selectHitFeedback(outcome) returning {id,word,label,priority}. Proposed outcome fields: {dtype,attackClass,healthLost,absorbed:{plate,armor,shield,nanite},guard:'none'|'blocked'|'broken',deflected,knockedOut,statusesAdded:[]}. Missing outcome means legacy fallback, never fabricated armor evidence.
- [ ] RED tests for known failures: a stopped bullet produces armor-hit rather than block; partial armor still reports actual HP loss; guard differs from armor; deflect does zero HP damage; cold contact alone does not report frozen.
Example new test:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {selectHitFeedback} from '../src/engine/hit-feedback.js';
test('plate absorption is not directional guard',()=>{
 const r=selectHitFeedback({dtype:'ballistic',attackClass:'bullet',healthLost:0,
  absorbed:{plate:8,armor:0,shield:0,nanite:0},guard:'none',deflected:false,knockedOut:false,statusesAdded:[]});
 assert.equal(r.id,'armor-hit');
});
```
- [ ] Add native Fighter integration assertions comparing before/after HP and armor, not only the pure selector.
- [ ] Wire small comic burst families with per-target/family throttling; guard break/KO take priority, automatic bullets do not flood the screen.
- [ ] Restore BFP KO presentation within compact combat-safe bounds.
- [ ] Run node --test tools/hit-feedback.test.mjs tools/frontline-ballistic-contact.test.mjs tools/ballistic-hit-flash.test.mjs tools/nanite-contact.test.mjs.
- [ ] Separate authored dtype propagation correction and resistance regressions from this presentation commit.

## Task 2 — Finish existing equipment and Studio review gates (isolated owned changes)
Source plan: docs/superpowers/plans/2026-09-10-sarge-authoring-integration.md.
Files: src/engine/authored-equipment.js, rifle-pose.js, tools/authored-equipment.test.mjs; separate Studio owner: src/tool/studio-main.js and tools/authored-catalog-browser.mjs.
- [ ] Rifle candidates rerun torso AND cover constraints; prove real authored mesh clearance rather than only shoulder reach.
- [ ] Test actual authored muzzle alignment and paid launch, physical magazine/bolt travel, resource-specific disposal and stale completion.
- [ ] Review db5b9c9 reload prop/cue synchronization against its action-clock contract.
- [ ] Add paused-Studio failure/ready regression; notify inspector on current fighter's load promise settlement even while transport is paused.
- [ ] Wire equipment load/replace/KO/form/dispose/drop only after adapter review; preserve borrowed rig resources and pending paid launches.
- [ ] Run authored-equipment, firearm-emission, authored-character tests and native catalog browser on explicit integration origin.
- [ ] Keep procedural fallback for missing/unapproved packages; do not pretend the new rifle art is approved.

## Task 3 — Actual in-match loadout, not a save-only menu (main integration)
Files: src/engine/armoryUI.js, game.js, hands.js, src/pw-main.js; create tools/powerworld-loadout.test.mjs and tools/powerworld-loadout-browser.mjs.
- [ ] Reuse ARMORY data and game.equipFrom(f,row); do not create another weapon factory.
- [ ] Show selection/confirmation, pause player action and release held triggers while menu is open.
- [ ] Apply only valid firearm row to the current eligible soldier. Reject stale actor, invalid ID, KO and unsupported selection.
- [ ] Make equip replace/drop resolve pending paid shots before detaching muzzle; selected weapon drives actual ammo/reload and HUD.
- [ ] RED browser test: select Sarge -> open menu -> choose scoped rifle -> close -> real input fire -> assert changed held row, decreased magazine, native projectile -> reload -> restart.
- [ ] Test rifle, shotgun and scoped rifle first; catalog remains available for the other guns. Nine intended distinct weapons remain a full-goal gate, not satisfied merely by 13 existing definitions.
- [ ] Do not add repeated UI buttons for every power; preserve two selected attacks with wheel semantics.

## Task 4 — Camera choice without changing the BFP default
Files: src/data/camera-presets.js, src/engine/hud.js, world.js only at existing cameraProfileOf consumption; create src/core/camera-settings.js and tools/camera-settings.test.mjs.
- [ ] Add Options choices Centered / Shoulder, bounded FOV/range and Reset; use existing Studio bounds rather than new arbitrary ranges.
- [ ] Define precedence: temporary vehicle camera > explicit player camera preference > hero Studio camera > default. Reset removes player override, restoring authored/default view.
- [ ] Store only camera preferences under new lsw.camera-preferences.v1; never rewrite character packages or saved Studio bodies.
- [ ] RED tests for invalid storage, clamping, reset, vehicle precedence and fresh-page persistence.
- [ ] Keep collision solve AFTER camera composition; near-wall shoulder view cannot bypass occlusion.
- [ ] Node geometry checks plus real menu/persistence/near-cover browser checks. Test mouse/pointer lock resumes after closing Options.

## Task 5 — Speaker anchored talk/yell and combat-safe UI finish
Files: src/engine/comic.js, balloon.js, hud.styles.js; tests tools/frontline-speech.test.mjs and new tools/impact-speech-browser.mjs.
- [ ] Remove the unconditional PowerWorld tail-less shortcut only with replacement safe-area/visibility rules tested.
- [ ] Use existing balloon builder's talk/yell shapes; anchor at actual animated mouth/head and update projection with moving speaker/camera.
- [ ] Restrict on-screen bubbles to admitted visible/in-range speakers; offscreen radio captions identify speaker without leaking hidden targets.
- [ ] Maintain queue/cooldown rules; audio audition is not gameplay admission. Do not wire all 14 preview voices to arbitrary events.
- [ ] RED cases: moving talk tail, jagged yell, far/hidden speaker suppression, HUD intersection, resize, text overflow, paused lifetime and KO cleanup.
- [ ] Native screenshot+video at 1440x900, 390x844 and mobile landscape. No vertical ability-name wrapping; keep touch buttons reachable.
- [ ] Generated Impact board is design guidance only; implement native icons/lettering and retain existing original character art.

## Task 6 — External audio and optional building asset lanes
- [ ] Give external audio AI docs/handoffs/2026-09-10-audio-production.md plus this release spec and repository/commit access.
- [ ] Produce native 16 replacements first, then preview-only66. Assets can precede equipment mesh completion because reload/event phases remain separated.
- [ ] Main task owns missing gameplay hooks, actual clip lifetime, speech scheduling, mixer envelopes and duplicate suppression.
- [ ] Building task is optional, not a prerequisite for19:00; use docs/handoffs/2026-09-10-building-pilot.md.
- [ ] Do not merge generated files by overwriting runtime or importer IDs. Review provenance/coverage before import.

## Task 7 — Freeze and prove the slice (main QA)
- [ ] Confirm exact server process/root/commit and use powerworld.html. Existing scripts with hardcoded5180 must be parameterized before using them as integration evidence.
```powershell
$env:LSW_BASE_URL='http://127.0.0.1:5182'
$env:LSW_TEST_URL='http://127.0.0.1:5182'
node tools/authored-catalog-browser.mjs
node --test tools/ground-camera.test.mjs tools/ground-camera-cover.test.mjs
npm run build
git diff --check
```
- [ ] Run fresh build preview on a separate verified free port; verify URL rather than blindly restarting the live dev process.
- [ ] Human-input loop: Vega flight/beam/flying punch/block -> Sarge walk/crouch/prone/fire/reload/grenade -> actual loadout -> cover -> death/restart.
- [ ] Verify outcomes armor/HP/guard/deflect/status/KO, talk/shout, camera reset and HUD on both device classes.
- [ ] Record a continuous native demonstration with audible cues, not a frozen posed shot; include build identity and controls.
- [ ] Ten-minute mixed encounter/restart soak; record frame-time distribution on foreground browser, device, resolution, quality and fighter count. Never interpret background throttling as GPU cost.
- [ ] Update dated report with each gate PASS / FAIL / NOT RUN and links. Provide usable test URL and known issues by19:00 even if release gate remains red.

## Full-goal backlog remains open
Nine differentiated guns and complete loadout; source-contact footsteps/audio; all82 replacement hooks; per-character dialogue; reviewed authoring integration; full beam/block/flight/pose acceptance; boost/scale/performance; squad commands; planned aircraft/missiles when un-deferred; interiors/AI navigation; grapples/web/leaps/teleport; drones/RC/C4/energy-sap/armor-piercing gadgets; weather gameplay; cinematic capture/deployment. None is marked complete by this checkpoint.

## Previous-turn classification
Progress: generated and saved two UI alternatives plus proposal notes; three fresh audits now change the next action by identifying missing native bindings and misclassified hit/speech presentation. No runtime completion claim.


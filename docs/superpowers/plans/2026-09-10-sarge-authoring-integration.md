# Sarge Authoring Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Do not edit outside the ownership assigned by the main task.

**Goal:** Make one existing soldier use the repeatable asset pipeline through Studio and native combat, without replacing working gameplay with a disconnected viewer.

**Architecture:** A browser-safe package resolver supplies immutable data and independently owned equipment instances. Existing locomotion, reload, throw and contact systems retain their clocks and physics; imported art is an optional source inside them. Main task owns shared lifecycle/profile wiring, while motion/audio and equipment workers implement separate adapters.

**Tech Stack:** Existing Three.js/Vite JavaScript, GLTFLoader, Node test runner, Playwright, existing replaceable SoundLibrary. No new engine or animation framework.

**Spec:** `docs/superpowers/specs/2026-09-10-sarge-authoring-integration.md`; source-side contracts in the reviewed integration commit's `docs/authoring/INTEGRATION.md`, `MANIFEST.md`, `LIMITATIONS.md`.

## Global constraints

- External task exclusively owns `authoring/`, `public/authored-assets/`, `docs/authoring/` until handoff. Ask it for marker/data corrections; do not race its edits.
- No roster-wide replacement, no new creatures, no aircraft expansion, no automatic production release.
- No supine-to-prone substitution; no removal of Sarge's abilities to demonstrate sidearm art.
- Missing assets always keep a functional fallback; unapproved art stays visibly labeled in Studio.
- Every behavior change gets a failing regression before implementation. Commit explicit files only; never `git add .` in this workspace.
- Native movement recordings, audible timing, actual contact, and saved-profile installation are separate gates from structural validation.

## Work split and dependency order

| Owner | Exclusive responsibility |
|---|---|
| External authoring task | Source recipes, packages, manifest semantics, clean reproduction, source-side event tracker corrections |
| Main task | Checkpoint/merge, shared loader contract, `entity.js`, profile schema, Studio UI, wiring, final acceptance |
| Motion/audio worker | `motion-banks.js`, motion/action adapters, action event timing, dedicated tests; no shared lifecycle/UI edits |
| Equipment worker | `authored-equipment.js`, rifle/reload geometry compatibility, fit/lifecycle tests; no shared lifecycle/UI edits |
| Reviewer | Read-only integrated review and failure reproduction after implementation workers release their slots |

Main prepares loader/interfaces first. Workers then run concurrently. Shared `reload-presentation.js` is owned by the motion worker; equipment worker supplies normalized mount geometry for it and reports any required shared edits. Main performs `entity.js`, `game.js`, `weapon-emission.js` and Studio integration serially.

## Task 1 — Checkpoint and isolated merge (main)

Files: existing weather change set and report; no authoring implementation edits.

- [x] Finish weather review fixes; 98/98 combined weather/contact/Studio checks and `npm run build` passed. Native Studio → Hurricane rerun and ordered frames reviewed; visual gaps remain documented.
- [x] Commit only the verified weather files and report: `eee9509` on `codex/construct-effects-pass`.
- [ ] Obtain the external task's revised commit and clean-checkout reproduction output. Check `git diff --name-only <authoring-base>..<revised-sha>` contains only its three owned directories. Do not assume a clean tracked tree means source inputs are reproducible.
- [ ] Use the worktree skill to create branch `codex/sarge-authoring-integration` from the weather checkpoint. Merge the reviewed authoring SHA there, keeping the current checkout and user assets intact. Record both parent SHAs.
- [ ] Run `npm --prefix authoring test`, `node authoring/bin/authoring.js reproduce`, and the unchanged existing integration gates before introducing a loader. Source acquisition must follow the cleaned branch's instructions, not copy undocumented local files.

## Task 2 — Shared runtime contract and portable profile references (main)

Create `src/engine/authored-assets.js`, `tools/authored-assets.test.mjs`. Modify `src/tool/studio-profile.js`; extend profile/character-package tests.

Proposed API, frozen before dispatching implementation workers:

```js
loadCatalog(); // Promise<catalog>; immutable metadata
resolvePackage(ref, expectedKind); // Promise<{manifest, baseUrl, packageHash}>
loadEquipmentInstance(ref); // Promise<{root, manifest, dispose()}>, exclusive instance
loadBodyDefinition(ref); // Promise<immutable body.json>
```

References resolve through catalog entries, never by concatenating untrusted profile input into a path. Validate catalog/manifest identity, expected kind, finite transforms, bridge layout and declared output hashes before activation. Reject output paths escaping their package directory. A failed request is retryable; do not cache a rejected promise forever.

Profile selection needs multiple motion families as well as multiple weapons:

```js
model.assets = {
  body: 'body.hero-standard@1',
  motion: {locomotion:'motion.hero-ual@1', reload:'motion.hero-ual@1', grenade:'motion.hero-ual2@1'},
  equipment: {rifle:'equipment.carbine@1', pistol:'equipment.sidearm@1'}
};
```

Use optional strict maps and `^[a-z0-9][a-z0-9._-]{0,79}@[1-9]\d*$`. Confirm actual package IDs against the merged catalog. Missing keys mean current fallback. Unknown but valid references stay portable and report unavailable at load time. Define sparse form overrides as field-wise merges; never erase unrelated base equipment by overriding motion alone.

- [ ] Write RED tests with malformed refs (`../outside@1`), wrong-kind packages, invalid finite data, output traversal, missing package and failed-then-successful fetch. Assert usable fallback/status, not just exceptions.
- [ ] Implement resolution/validation outside frame loops; cache immutable parsed data and explicitly own decoded equipment resources.
- [ ] Write profile RED round-trip tests for the exact map above and sparse form overrides. Extend `profileFromDef`, validation and application without modifying the outer `lsw-character` schema.
- [ ] Run `node --test tools/authored-assets.test.mjs tools/studio-profile.test.mjs tools/character-package.test.mjs tools/progression-profile.test.mjs`; review and commit.

## Task 3 — Motion and event ownership (motion/audio worker)

Create `src/engine/motion-banks.js` and its tests. Modify `ground-motion.js`, `authored-pose.js`, `reload-presentation.js`, `throwable-action.js`, `firearm-ammo.js` as needed. Main alone wires final observation/lifecycle into `entity.js` and Studio.

Interfaces: `loadMotionPackage(ref)` loads through Task 2; `resolveMotionClip(fighter, role, clipId)` returns `{clip, metadata, packageId, packageHash, source}` or bundled fallback. Metadata comes from manifest clips, not pose frames. Per-fighter action state must not live in shared cached data.

- [ ] RED tests prove explicit role selection, absent-clip fallback, frame equivalence for the bundled-source package and isolation between fighters. Preserve signed velocity-driven phase and gait blending in `animateGround`.
- [ ] Add masked action sampling through `samplePoseFrame`/`mirrorPoseFrame`. Reload follows `_firearmReload.elapsed/duration`; grenade source mirrors to Sarge's left hand. Final rifle/reload/throw contact constraints remain authoritative; never replace physics roots or force flying actors upright.
- [ ] Use `requestReload` for reload-start, `updateFirearmReload` for mag/bolt cues and ammo completion, `beginThrowAction` for preparation, and `resolveThrowRelease` for launch plus release audio. Imported events replace corresponding procedural markers; they never create a second owner.
- [ ] Map grenade source time piecewise around the release marker so configured `releaseAt` and recovery remain unchanged. Preserve the final-pose launch barrier in `ProjectileSystem.resolveLaunches`.
- [ ] Keep a labeled procedural chamber marker if the source has no bolt event. Jog/sprint currently lack step markers: reuse the source-contact and final-sole qualification design in `2026-09-09-motion-audio-bridge.md`, not silent playback or invented imported contacts. Read its source measurement reports before implementation.
- [ ] Before adopting `ClipEventTracker`, require the authoring owner to cover a one-second loop starting at .7 advanced by 2.5 seconds: intermediate-cycle early markers must not disappear. Its positive-only advancement is not the signed locomotion observer.
- [ ] RED tests cover 30/60/120 Hz, multi-wrap, reverse gait, blend ownership, zero-dt seeks, pause, interruption/replay, form replacement, final sole qualification, exactly-one ammo commit and grenade spawn. Replace the old sine footsteps only when this path owns cues; otherwise use one explicit fallback.
- [ ] Run ground-motion, locomotion-source, ground-air-handoff, jump-motion, air-cast-locomotion, firearm-ammo, reload-presentation, throwable-action, prone-presentation and studio-audio tests. Commit owned files and report main wiring required.

## Task 4 — Equipment mounting and real rifle reach (equipment worker)

Create `src/engine/authored-equipment.js`, `tools/authored-equipment.test.mjs`. Modify `rifle-pose.js` and focused fit tests. Main wires lifecycle into Fighter/equip/drop afterward.

Interfaces: `createEquipmentMount(asset,{weaponKind})` returns a hand-local wrapper carrying `weaponKind`, normalized socket access and a disposal handle. `loadFighterEquipment(f,{loader})` starts validated replacement; `invalidateEquipmentLoads(f)` invalidates old rig/selection generations. `replaceHeldEquipment(f,ref,expectedGear)` must verify exact gear identity on completion.

- [ ] RED tests load the actual carbine GLB through Task 2 and prove grip normalization survives a mount-root reset. Put normalized aliases on the wrapper for primary/support/muzzle; reload must animate actual `magazine` and `charging-handle` meshes, not invisible socket points.
- [ ] Derive stock contact from the carbine buttpad geometry into hand-local space. Do not dereference a missing stock on the sidearm; keep it one-handed unless a supported carrier owns the off hand.
- [ ] RED tests run the production rifle carrier on standard/heavy/lean frames at steep aim, cover and reload transitions. Add bounded primary-grip pullback/inward search using both shoulder reach limits, rigid muzzle orientation and existing torso/cover constraints. Never lengthen arms or move the handguard socket alone.
- [ ] Keep the procedural weapon visible until a valid complete mount is ready. Invalidate cached soldier-loadout references after replacement. Body package metadata adds sockets to matching existing bodies/frames; it is not a replacement body GLB.
- [ ] RED async tests resolve loads after equip swap, drop, form rebuild, KO and dispose. Reject stale instances and release their geometries/materials/textures/skeletons. Preserve attachments already captured by ragdoll and resolve paid pending launches before detaching a muzzle.
- [ ] Run authored-equipment, rifle-contact, reload-presentation, soldier-loadout-presentation, firearm-emission, clone-equipment and progression-rig tests. Commit owned files; give main explicit lifecycle insertion points.

## Task 5 — Studio selection and shared lifecycle wiring (main)

Create `src/tool/studio-catalog.js`, `tools/authored-catalog-browser.mjs`. Modify `studio-main.js`, `studio-preview.js`, `entity.js`, `game.js`, `weapon-emission.js` only after workers release interfaces.

- [ ] RED browser test selects Sarge body/motion/carbine/pistol, undoes/redoes, Save local, reloads, exports/imports and Play Tests. Assert runtime refs and active source identities match the editor; test missing-reference fallback with visible status.
- [ ] Populate selectors from validated catalog. Show source, structural status, visual-unapproved label and compatibility failures. Do not expose package internals as arbitrary HTML or erase unavailable refs on save.
- [ ] Start motion/equipment requests after rig construction; guard every completion with fighter disposal, parts identity and generation. Invalidate on form/KO/drop and restart deliberately on respawn. No asynchronous geometry appearing midway through ragdoll.
- [ ] Retain native `equipFrom` ability behavior and use it for Sarge's sidearm pilot; replace built-in rifle presentation separately through the same mount adapter.
- [ ] Verify selected package output URLs work in built preview, not only the dev viewer. Only add a production authoring viewer entry if needed; runtime/Studio selection is the requested deliverable.
- [ ] Run profile, character-package, progression, Studio audio and Task 5 browser tests; review and commit.

## Task 6 — Integrated evidence and acceptance (main + read-only reviewer)

- [ ] Run `npm run test:animations`, package/event/equipment suites, `npm run build` and `git diff --check`. Review failures; do not loosen fit thresholds to obtain green checks.
- [ ] Reuse native rifle-contact/reload/throwable/prone browser routes with package selection. Record movement, aim, firing, reload, grenade, prone and armory sidearm equip/fire/drop continuously. Diagnostic posed captures are separately labeled.
- [ ] Record a flying hero's punch/beam while moving and a form→KO→respawn sequence with pending asset loads. Check roots, hands, muzzle, camera and control recovery, not one still.
- [ ] Capture audible sounds and verify cue timing/counts plus user-replacement selection through the sound harness. Silent browser videos and active-handle logs alone do not pass this gate.
- [ ] Measure a foreground mixed encounter before/after at the same resolution and entity count, including 4K on the available desktop. Report p50/p95/p99, slow frames, quality changes and resource counts after repeated forms/swaps. Target 60fps without lowering the encounter to make it pass.
- [ ] Independent reviewer checks the six user requirements against artifacts; inspect visuals against the approved grounded target. Keep unapproved placeholders labeled, and retain failures alongside passing reruns.
- [ ] Commit the tested integration and provide recordings plus exact reproduction route. Production promotion is separate from merge/build success; full game goal stays active.

## Current checkpoint

Planning agents have completed read-only seam audits. Their findings are incorporated above: missing stock contract, real moving reload geometry, Sarge sidearm via armory, source/event omissions and multi-wrap defect. Integration has not started, and the external task's revised handoff commit has not yet been accepted.

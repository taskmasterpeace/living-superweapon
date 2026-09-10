# Authored Locomotion Implementation Plan

> **For agentic workers:** Execute inline with superpowers:executing-plans, test-first, with review checkpoints. Preserve the user's dirty working directory; no unrelated commits or resets.

**Goal:** Bring licensed source walk/jog/sprint motion into real fighters and Studio, with reproducible source-to-target evidence.

**Architecture:** A Node ingestion command samples a pinned Quaternius CC0 glTF into a small engine-independent direction bank. Production retargeting preserves the modular flat-FK skeleton and runs before combat/contact overlays. Profiles select authored or procedural ground locomotion; flight continues to use the six existing superhero families.

**Tech Stack:** Existing Three.js 0.169, Node test runner, Vite, Playwright; no new dependencies.

**Spec:** Design and contracts in this document, plus `docs/reference/BFP_CAMERA_AND_POSE_SOURCES.md` and the animation-authoring acceptance matrix.

## Global constraints / design

- No map changes. No purple except KIVULI. No character stat changes.
- Sim position, velocity, facing and collisions are authoritative. Imported XZ root travel is not applied.
- Keep source files with their CC0 license and pinned hashes. The glTF mirror is J-Ponzo, not the creator's official distribution endpoint; license is verified on Quaternius's official pack page.
- Four exact source takes: Idle_Loop (2.5s), Walk_Loop (4/3s), Jog_Fwd_Loop (11/12s), Sprint_Loop (2/3s). Other takes remain unwired; no claims of a full animation importer or BFP parity.
- Derive anatomical directions from source world joints, never copy differently oriented source local bone Euler angles. Preserve target segment lengths and attached hand weapons.
- Locomotion is a base layer. Airborne, crouched, wounded, carried/grabbed, knocked down and attacking bodies retain existing behavior. Stationary heroes retain the existing authored hero idle/guard silhouettes.
- Source bank is synchronous local bundled data. Missing/unknown clip selection falls back safely; no remote requests in gameplay.
- Ground foot support is visual only: correct the body offset from rendered boot volumes, not collision roots or a weapon's lowest bound. Running flight phases retain a small source-derived suspension.
- Studio offers Ground walk / jog / sprint with a visible floor and exact take provenance. Authored/procedural choice survives save, undo, export/import and play-test.
- No source changes during the single browser/GPU verification lane.

## Task 1: Reproducible source bank

Files: `assets-src/quaternius/*`, `tools/lib/quaternius-source.mjs`, `tools/ingest-locomotion.mjs`, `src/data/locomotion-bank.json`, `tools/locomotion-source.test.mjs`.

Interface: `loadSource()` returns parsed glTF; `sampleSource(source, name, seconds)` returns root-relative world anatomical points; `bakeLocomotion()` returns `{version,source,clips}`. Each clip has exact duration, samples at 60 Hz including the endpoint, direction frames and vertical source support.

- [x] Test real bank: exact known durations, missing clip throws, finite normalized directions, endpoint/wrap continuity, no horizontal entity/root output.
  ```js
  assert.equal(bank.clips.walk.duration, 4/3);
  assert.throws(()=>sampleSource(source,'missing',0), /Unknown/);
  ```
- [x] Observe RED before implementing the source sampler/ingester.
- [x] Implement using GLTFLoader + AnimationMixer; replace only the buffer URI in memory for Node parsing. Sample named source joints and record hashes/license. Generated data writes belong to the ingestion script.
- [x] Run `node --test tools/locomotion-source.test.mjs`; regenerate twice and compare byte hashes.

## Task 2: Production retargeting and ownership

Files: `src/engine/ground-motion.js`, `src/engine/entity.js`, `tools/ground-motion.test.mjs`.

Interface: `restoreGroundBase(f)` removes only the prior ground overlay; `animateGround(f,dt,combat)` reads real velocity and selected profile, blends authored base motion, and reports `f._groundMotion` for Studio diagnostics. It never changes `f.pos`, `f.vel` or combat timing.

- [x] Test real Fighter `_animate`: authored moving arms have varying elbow articulation, invariant physics root, fixed segment lengths, deterministic 30/60/120 Hz playback, no foot penetration at support, and flight/guard/attack retain priority.
  ```js
  assert.deepEqual(f.pos.toArray(), originalPosition);
  assert.ok(maxElbow-minElbow > .1);
  ```
- [x] Observe RED on missing authored articulation.
- [x] Sample normalized phase, retarget arm chains through existing `reachArm` and leg chains through fixed-length FK. Store/restore changed base transforms to prevent accumulation. Blend entry/exit; freeze phase during hitstop.
- [x] Run source and motion tests, plus blocking, limb/shoulder/head and combat pose regressions.

## Task 3: Studio, portable choice and visual acceptance

Files: `src/tool/studio-profile.js`, `src/tool/studio-main.js`, `src/tool/studio-preview.js`, `tools/ground-studio-browser.mjs`, package scripts, provenance report.

Interface: optional `profile.model.locomotion` is `authored` or `procedural`; omitted legacy profiles inherit authored default. Preview ground states use the real Fighter animation path with explicit walking/jogging/sprint speeds, deterministic seek and no flight wake.

- [x] Test profile round-trip and unknown mode rejection before validator edits. Test new motion dropdown and deterministic seek through the browser before editor implementation.
- [x] Add profile choice using existing menus/history/storage. Add ground states with exact take/duration diagnostics, a correctly placed floor, and source attribution in the existing reference area.
- [x] Capture source and SOL target at 0/25/50/75/100% and two cycles, plus armed SARGE from front/both profiles/rear. Inspect rendered volumes and entry/exit, not only joint pivots.
- [x] Run `node tools/ground-studio-browser.mjs`, relevant character-package tests, blocking, pose and combat gates, then `npm run build`.
- [x] Update the parity ledger and provenance report with measured results and rejected/unwired states. Do not label the full game complete or assign a quality score.

## Verification checkpoint

Final runtime source: nine focused source/motion tests and Studio browser pass; blocking, pose and full combat gates pass; production build passes (221 modules). Independent review reproduced and then verified plain/hit-interrupted form-swap recovery. Source and target visuals drove torso-frame and toe-support fixes. Provenance, evidence paths, exact hashes and limitations: `docs/AUTHORED_LOCOMOTION_PASS.md`.

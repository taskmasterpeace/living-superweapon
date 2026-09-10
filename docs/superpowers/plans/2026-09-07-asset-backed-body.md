# Asset-backed Body Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans task-by-task. Preserve the user's dirty checkout; no commits.

**Goal:** Optional real skinned superhero bodies, shared by Studio and gameplay.

**Architecture:** Offline source ingestion produces synchronous bundled data. A
final-pose skin adapter follows the existing authoritative procedural rig. A
validated catalog ID persists through existing profiles and character packages.

**Tech Stack:** JavaScript, Three.js 0.169, Vite, Node tests, Playwright.

**Spec:** docs/superpowers/specs/2026-09-07-asset-backed-body-design.md

## Global Constraints

- No map or camera recalibration, external publishing, account changes, new dependencies, paid assets or silent migration of saved custom poses.
- Root YXZ/unscaled contract and gameplay outcomes unchanged by body choice.
- Preserve the existing dirty D:/lsw checkout; no commits, branch changes or worktree moves.
- Single browser/GPU lane; Node-only tests may run alongside source work.

### Task 1: Reproducible source data

**Files:** tools/ingest-hero-bodies.mjs, tools/lib/hero-body-source.mjs,
tools/hero-body-source.test.mjs, src/data/hero-body-bank.json,
assets-src/quaternius/base-characters/PROVENANCE.md.

**Interfaces:** `loadHeroBodySource(kind)` loads local male/female glTF without
remote textures; `bakeHeroBody(source)` returns `{source, joints, meshes}`.
Each joint has `{name, parent, matrix, localMatrix}` in source scene world space;
each mesh has `{name, material, position, normal, uv, index, skinIndex,
skinWeight}` with vertex positions/normals in the same world space and joint
indices indexing the joint array. Materials classify body, eyes or eyebrows.
Keep all authored triangles/weights; don't collapse bones or simplify anatomy.

- [x] Write a Node regression: actual source body has >5000 vertices, normalized
  weights, joint-index bounds and finite geometry; bake is byte-reproducible.
- [x] Observe RED with absent ingestion behavior, then implement the local loader
  and bake. Strip external texture references only in the in-memory parse copy.
- [x] Generate the bank; verify source hashes and document exact mirror/license.
- [x] Run `node --test tools/hero-body-source.test.mjs`; review output and changes.

### Task 2: Production skin adapter

**Files:** src/engine/hero-skin.js, src/engine/figure.js, src/engine/entity.js,
tools/hero-skin.test.mjs.

**Interfaces:** `bindHeroSkin(parts, def)` attaches the optional catalog skin;
source bones inherit below authoritative driven meshes. `updateHeroSkin(parts)`
updates palette/finger state and skeleton matrices; `disposeHeroSkin(parts)` marks
retirement while Fighter's borrower-aware resource path owns actual disposal.

- [x] Write real-Fighter tests that choosing an asset produces a SkinnedMesh,
  changes visible anatomy and preserves physics root, limb lengths and sockets.
- [x] Observe RED; implement calibrated bind-space transforms onto driven meshes,
  hide only superseded body surfaces, preserve gear/effects and fallback.
- [x] Exercise 30/60/120 Hz hover/guard/strikes, moving armed cases, form replacement
  and ragdoll/respawn. Test finite skin bounds, hand placement and resource release.
- [x] Inspect actual renders; repair measured defects before accepting the skin.

### Task 3: Studio and package path

**Files:** src/tool/studio-profile.js, src/tool/studio-main.js,
tools/hero-skin-browser.mjs, docs/CHARACTER_STUDIO.md.

- [x] Test model catalog validation, old-profile fallback, save/reload, sparse
  progression forms and package export/import preserving the model choice.
- [x] Observe RED; add known-ID validation and an accessible Body source select
  in the existing Model section. Label the actual source and procedural motion.
- [x] Test actual UI select/undo/save, fresh-origin package import and Play Test.
- [x] Capture five phases and loop wrap, four armed angles and full motion.

### Task 4: Integration gates

- [x] Review source/runtime/editor diff with an independent reviewer.
- [x] Run focused tests, blocking/bot fairness, strikes, progression, flight,
  camera, Studio/layout, packages, combat and build serially where browser-based.
- [x] Update provenance, evidence ledger and honest limitations. Keep the broader
  game goal active; automated tests do not certify 10/10 subjective feel.

Completion evidence: `docs/ASSET_BODY_PASS.md`, the 18-command serial ledger,
and the final expanded `npm run test:hero-skin` refresh (46 CPU tests, actual
editor/package/Play Test and both source-body live-camera runs). No production
changes followed the serial run; the later changes extend tests and evidence.

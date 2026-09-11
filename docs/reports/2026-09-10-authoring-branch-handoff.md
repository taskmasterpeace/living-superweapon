# PowerWorld repeatable authoring pipeline — starting brief

Requested handoff/design, not a claim that the pipeline exists. Combat baseline: `bcf63279cdf8c99cbdbc5ad66ee142645de93639`. Main combat work remains in `D:/lsw`, branch `codex/construct-effects-pass`. Do not switch that checkout's branch.

## Start without interfering

Create a separate worktree, not merely another branch in the same directory. These are instructions for the new task; they have not been executed here. If either destination or branch already exists, inspect it and reuse only if it belongs to this task; do not delete or overwrite it.

```powershell
git -C D:/lsw worktree add -b codex/authoring-pipeline D:/powerworld-authoring bcf63279cdf8c99cbdbc5ad66ee142645de93639
Set-Location D:/powerworld-authoring
npm ci
npm run dev -- --host 127.0.0.1 --port 5181 --strictPort
```

Open a new Codex task against **D:/powerworld-authoring**. Use port 5181, your own browser tab and browser storage, your own artifacts folder, and only terminate processes you started. Main game uses 5180. Separate ports separate browser origin/storage. Do not copy `.env*`, `.vercel`, production credentials, or unrelated untracked assets. The pinned baseline is local; on another machine ask for that commit to be pushed before starting.

## Paste this into the new task

Build PowerWorld's repeatable asset-authoring pipeline, not a collection of bespoke assets. Read this brief and the repository instructions. You are not alone: another task owns the runtime combat, camera, weapons, HUD and deployment. Preserve its work. Start by inspecting the existing import/bake and package contracts, then present the proposed versioned manifest before implementation. Work only on your branch/worktree. Commit scoped changes; do not merge, push master, deploy, reset other branches, or rewrite another task's files.

You own NEW files under:

- `authoring/` — self-contained tool package, lockfile, adapters, schemas, source recipes and tests.
- `public/authored-assets/` — small approved runtime outputs only, stable IDs and manifests.
- `docs/authoring/` — setup, author workflow, compatibility and integration handoff.

Do not edit existing `src/engine/**`, `src/tool/**`, `src/data/**`, root package/lock files, Vite configuration, deployment configuration, or shared tests. Import existing modules read-only for compatibility checks. If integration requires an existing-file change, record the exact proposed seam and evidence in `docs/authoring/INTEGRATION.md`; the main task owns that integration. A branch-owned viewer may exercise the production figure/pose APIs but must not replace them with a fake success path.

## Recommended architecture

Three alternatives: generator-specific scripts (quick, repeats today's fragmentation); a large universal visual editor first (expensive before the contracts work); **one versioned asset package with source-specific adapters** (recommended).

Pipeline: approved reference/brief → editable source recipe → pinned local compiler/importer → normalization → validation → production-compatible preview → approved package.

The reference-to-recipe step can involve an artist or AI. Rebuilding an accepted recipe must not call an AI, need a paid service, or depend on hidden manual changes. Do not promise deterministic image generation; require reproducible compilation of saved recipes. Cache by source hash, recipe, tool version and build options. Record output hashes. Fail safely without replacing the previous valid package.

One manifest should describe ID/version, asset kind, provenance/terms, source/tool revisions, source hash, explicit units/axis conversion, output files/hashes, bounds, LODs, materials, rig mapping, attachment sockets, clips, normalized animation events, optional semantic hit zones, and measured budgets. Validate finite data, permitted paths/types, duplicate IDs, missing attachments and incompatible versions. Treat imported files as untrusted; never eval uploaded code. Generated procedural code gets reviewed as build-time source, not executed from arbitrary user uploads.

Preserve separate concepts: a visual asset package is NOT the existing `lsw-character` kit/profile package. Supply compatibility metadata/adapter proposals rather than silently changing that strict schema. Physics roots, damage, resource spending and ability authority stay in the game. Authoring describes visual clips, sockets and contact markers; markers do not apply damage themselves.

## Build order

1. Inventory and reuse `tools/ingest-locomotion.mjs`, `tools/ingest-strikes.mjs`, `tools/lib/quaternius-source.mjs`, `src/engine/authored-pose.js`, `src/engine/hero-skin.js`, `src/tool/character-package.js` and Studio profile validation. Do not create a competing humanoid skeleton or animation player.
2. Establish schema, source provenance, repeatable build/validate/report commands and deliberately invalid fixtures. Keep dependencies in the authoring package.
3. Prove humanoid retargeting on the production pose bridge: idle/walk/run, crouch/prone, aiming, reload and grenade release. Use existing licensed source motions first, then add a CMU source adapter. Source animation must never write the gameplay movement root.
4. Prove modular equipment: two differently proportioned characters can share two weapons with correct grip, support hand, muzzle, magazine and holster sockets. Preserve left/right ownership and authored form changes.
5. Add anyCreature JSON → skinned GLB adapter for a non-humanoid with idle/move/attack; keep its skeleton distinct from the humanoid rig. Add img2threejs recipe/code → prop adapter. Prefer one demonstrated adapter at a time over three unfinished ones.
6. Build a branch-owned catalog/inspection view: filter IDs/tags, inspect source/build versions, compare reference, play/scrub clips, display skeleton/sockets/hit zones, export package and report. Propose the eventual Studio entry point without editing Studio yet.

## What done looks like

A new author can follow one README on a clean checkout and build the supplied examples without hand-editing engine code. Changing proportions, equipment or a source take and rebuilding updates the same asset ID with a new version and regenerated evidence.

- At least two distinct humanoid proportions share the same mapped motion set; two weapons fit both; one non-humanoid and one prop run through their respective adapters. Adding a third humanoid is data/recipe work, not another runtime patch.
- Every output rebuilds from committed recipe and pinned source/tool inputs. Two clean builds produce identical runtime output hashes, or a documented normalized comparison only for unavoidable container metadata. No changed vertices/motion hidden by normalization.
- Invalid rig mapping, missing muzzle, NaN frame, absent source/license record, unsafe external path and exceeded hard budget each produce a specific failing validation result. All fixtures exercise real validators.
- Normalized clips retain duration, loop behavior, handedness and events (footsteps, mag out/in, bolt, grenade release, contact/recovery). Frame-rate-independent event checks cover 30/60/120 Hz, interruption, replay and form replacement without duplicate events.
- Real production-rig comparisons cover front/side/rear, movement-plus-aim, hover/cruise-plus-attack and extreme angles. No root drift, weapon detachment, inverted hands or obvious body penetration. Capture motion sequences, not only a flattering still.
- GLBs pass structural validation plus application checks. Record triangles, draw calls, materials, bones, textures, bytes and load/dispose counts. Establish desktop/mobile budgets from a measured production baseline before approving outputs; do not borrow upstream marketing budgets as performance proof.
- Report both structural passes and human visual acceptance separately. A procedural creature that validates but misses our grounded visual direction is not art-approved.
- Main-task integration gate: package loads in actual Studio and gameplay, survives equip/form/KO/dispose and a mixed encounter, and does not regress existing tests/performance. The authoring branch can be ready for integration before this gate, but the whole pipeline is not shipped until it passes.

Deliver: branch name, base/head SHA, small ordered commits, clean-checkout commands, fixture recipes and sources, build manifest, failure cases, before/after motion captures, performance report, limitations, and `INTEGRATION.md`. The main task will inspect diff/ownership, merge into a separate integration branch, run combined tests/Studio/gameplay, then merge and deploy. Do not cherry-pick half a dependency chain or resolve conflicts by blindly accepting one branch.

## Research findings

- [anyCreature](https://github.com/Ariescar/anyCreature) already exposes a local JSON-to-GLB compiler and inspection harness. Its [output contract](https://github.com/Ariescar/anyCreature/blob/main/docs/OUTPUT_CONTRACT.md) defines skinned geometry, semantic names, embedded recipes, metres/+Y up/+Z forward and idle/move/attack. Pin a revision: README and contract animation claims differ, so verify actual files rather than trusting labels. Adopt its adapter/validation concepts, not its art style as our final realistic target.
- [img2threejs](https://github.com/img2threejs/img2threejs) reconstructs references as procedural Three.js code, not photo-derived meshes. Useful for editable props/equipment; a separate path from skinned humanoid mocap.
- [glTF Transform](https://gltf-transform.dev/cli) supplies inspection/optimization tooling; [Khronos glTF Validator](https://github.com/KhronosGroup/glTF-Validator) supplies structural checks. Neither proves a weapon fits, an attack connects, or a model looks good. Preserve semantic attachment names during optimization; compression requires a matching runtime decoder.
- [CMU motion database](https://mocap.cs.cmu.edu/) remains a source candidate from the earlier research. The site did not load in this follow-up check; recheck the specific clip/source terms during ingestion. Do not distribute the entire database as a runtime dependency.

## Body-part hits: proposed gameplay, not implemented

Current ordinary projectile contact uses a generous upright body cylinder or prone shape, with dedicated shield/nanite contact; it passes a world contact point into damage. That is not general hand/head/leg hit detection.

Recommend six gameplay zones (head, torso, left/right arm, left/right leg), with optional palm/weapon attachment points for effects. Start with presentation and then bounded tactical effects. No individual finger health or permanent crippling by default.

| Zone | Readable feedback | Potential tactical benefit after balancing |
| --- | --- | --- |
| Torso | Armor spark/skin impact; chest or shoulder absorption | Reliable center-mass damage; armor-piercing rounds have a clear role |
| Arm/hand | Forearm flinch or nonchalant deflection; impact follows the limb | Brief aim-stability/charge disruption after sufficient damage; never destroy a paid action silently |
| Leg | Weight shift, stumble or armored ricochet | Brief sprint slowdown after a threshold; grounded soldiers can be pinned without endless stun |
| Head | Helmet ricochet or head reaction appropriate to durability | Precision reward only when defense allows it; not universal one-shot superhero kills |
| Authored weak point | Distinct mechanical/material feedback | Jetpack, drone sensor or exposed armor component gives soldiers an intentional target |

Superhuman durability controls reaction severity: ordinary rounds can spark harmlessly off a powerhouse, while specialized inhibitor ammunition earns a short disruption. Strong characters still walk through a beam with a bracing arm and visible contact. Use capped severity, short recovery and shared disruption immunity so automatic fire or pellet counts cannot stunlock. Bots use the same rules and do not gain perfect limb aim. Broad beams/explosions apply one admitted damage event, not one per intersected zone.

Implementation proposal for the main combat task: reuse swept projectile broadphase, then test cached pose-following capsules/spheres for eligible candidates; select earliest physical surface and zone. Sweep relative motion/substep rapid limb motion so high speed does not tunnel. Keep shields and walls ahead of body impacts, maintain declared aim generosity for ordinary hits without inventing precision headshots, and pass zone/point/normal/material through the existing damage admission path. Effects attach to the hit bone/local point, cap their lifetime/count, and clear on form/KO/disposal. Avoid per-bullet skinned-triangle raycasts and accumulating full-body decals. Authoring branch supplies optional semantic zone metadata only; runtime collision and effects remain main-task owned.

Suggested sequence: localized sparks/reactions → torso/head/limb classification verified in standing/crouch/prone/flight → armor-aware precision rewards → limited limb disruption → optional equipment weak points. Do not start with a full injury simulator.

# Sarge authoring integration progress

## Isolated baseline

- Active development: `D:/lsw/.worktrees/sarge-authoring-integration`, branch `codex/sarge-authoring-integration`.
- Main game's checkpoint: `eee9509`; plan/spec: `814d322`.
- Authoring source snapshot: `5f075f1` merged as `d7b3bdf`, final user handoff `3224fe7` merged as `ce7ce60` (final delta: report/docs/test wording only).
- Original checkout and running port5180 remain unchanged. No deployment or promotion.
- Independently copied only the five documented source inputs into this fresh worktree and verified every SHA256. Root/authoring dependency installation completed; existing dependency deprecations and a recovered npm cache-tarball warning are recorded, not mistaken for application errors.
- Independently verified 11 packages valid, 11 packages reproduced identical hashes and35 authoring tests passed. Focused native engine baseline:88 tests passed across motion, ammunition, reload, throw, rifle contact, progression profile and character packages. Production build:375 modules, existing8.53MB chunk warning.

## Reviewed source motion evidence

Supplied source recordings under `authoring/artifacts/motion/` are viewer playback, not native gameplay. Clip identity comes from `index.json` and the visible clip chip.

- `carbine-reload-heavy-side.webm`: package `equipment.carbine`, imported `reload/Pistol_Reload`, heavy body,1.667s take. Extracted and inspected ordered frames at `artifacts/authoring-integration/source-reload-sequence.jpg`. Source arms articulate but do not prove magazine manipulation or timed ammunition in gameplay; keep the native reload action clock and actual magazine geometry owner.
- `grenade-throw-male-side.webm`: package `motion.hero-ual2`, `grenade-throw/OverhandThrow`, male body,1.333s take. Ordered frames: `artifacts/authoring-integration/source-throw-sequence.jpg`. Source contains deep crouch/lunge and recovery; masked action integration must preserve travelling legs/root and the final hand release. This is not approval to force a moving or flying actor into that whole-body pose.
- Package clip metadata now correctly identifies supine/get-up; no imported prone hold/crawl exists. Native prone remains protected.
- Carbine/sidearm remain unapproved placeholders with the explicit full-extension support-hand blocker. No art approval inferred from deterministic output.

The animation-authoring skill's `src/client/` TypeScript contracts are absent in this JavaScript engine. Use existing `authored-pose.js`, `hero-rig.js`, `ground-motion.js`, `rifle-pose.js`, reload/throw carriers and their Node/Playwright tests as the applicable contracts; no fictitious TypeScript/Vitest gate is claimed.

## Runtime work underway

Task2 was implemented by `asset_loader` at `4d8d284`: browser-safe validated package resolution, exclusive equipment resource ownership, retryable failures and optional portable profile references. Independent scoped review is underway. Its focused loader suite passed7/7 and exited normally. The combined gate printed37 passing assertions but did not terminate naturally; the implementer traced the retained handle to the existing Studio profile test. This is not recorded as a clean full-suite completion.

Runtime wiring and Studio controls are not yet implemented. Sparse asset overrides still need field-wise merging in the native Fighter form path. Following tasks retain the full six-step acceptance plan, including audible native captures and flight/form/KO checks.

Additional known source-event defect: `ClipEventTracker.advance` reuses the starting previous time in intermediate cycles when a step crosses multiple loop boundaries. Do not adopt it as the signed locomotion observer. Current jog/sprint manifests lack footsteps; the source-contact bridge plan remains the intended integration instead of fabricated markers.

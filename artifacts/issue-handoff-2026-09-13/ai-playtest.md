## Problem
AI playtests currently create bespoke browser scripts, discover controls repeatedly, stage actors ad hoc and rerun long routes to diagnose short failures. Old scripts still assume obsolete controls (for example Shift firing Web Zip). Observation timeouts can be confused with gameplay defects. We need one reusable local playtesting interface and concise failure evidence.

## Proposed implementation
1. Add a development-only, versioned test bridge (suggested src/dev/playtest-bridge.js), mounted through the existing boot path. Expose a schema and runtime fingerprint: git revision/build identifier, served project path, mode, control scheme and test API version. Refuse incompatible runners rather than silently testing another server/worktree.
2. Read-only observation API: actor IDs, class/movement profile, positions/velocities with explicit world units, selected powers, resources, statuses, current interaction prompt and its rejection reasons, targets, mission state, transport seats, anchor/collider IDs and recent gameplay events. Return bounded serializable data, never engine objects or functions.
3. Action API accepts the same input actions used by keyboard, controller and touch. Route through existing input/intent handlers; no direct damage, teleport, cooldown reset or velocity assignment during acceptance. Hold durations and release edges must cross simulation frames. Record requested actions and acknowledged frames. Derive action names/bindings from the actual control registry, not a second handwritten controls table.
4. Separately named fixture API may place actors, choose a seed and reset a scenario BEFORE a test. Log every fixture mutation. Mark staged runs explicitly. Disable arbitrary actor mutation once an acceptance segment starts. Unit/simulation probes remain a separate test class from UI/native input acceptance.
5. Scenario registry: reusable definitions for stationary/retreating/dodging/blocking melee, airborne grabs/throws, flight and lost-control recovery, speed-bubble projectiles, traversal AI, gadget use, and operation stages. Each declares setup, player actions, success/failure predicates, timeout, expected event/resource changes, cleanup and required capabilities. Reuse Threat Room reset/selection owners.
6. Runner (suggested tools/playtest/run.mjs) starts or attaches to the correct local server, loads one scenario, captures a bounded clip plus before/contact/after stills, and writes result.json with evidence paths and staging disclosure. Support --scenario, --scheme, --seed, --capture, --resume-checkpoint and --timeout. Checkpoints isolate defects; a checkpoint pass never substitutes for the final integrated route.
7. On failure, produce one bug bundle: last actions/events, current prompt and failed predicates, position/velocity, nearby collider bounds and IDs, screenshot, short preceding video, console errors and revision. Distinguish driver/input error, observation timeout, renderer issue and real gameplay failure.
8. Preserve live runner/process handles; poll before restarting. Stop automatic reruns after two equivalent failures, save the bundle and diagnose. Run one final integrated acceptance after relevant fixes; do not repeat long transport routes for unrelated changes.
9. Document the schema, commands and examples in an AI-facing playtest skill/document. Migrate a representative melee drill, WEBLINE traversal and one operation segment first; deprecate stale scripts with a migration note.

## Acceptance
- [ ] A fresh AI can discover controls, select a character, run a melee drill and read actual damage/energy outcomes using documented commands.
- [ ] Keyboard/controller/touch actions use their real adapters; physical iPhone checks remain separately identified.
- [ ] Repeated scenario reset leaves no extra actors, colliders, projectiles, sound loops or event listeners.
- [ ] Thin-wall, low-energy and interrupted-action failures produce useful bundles without rerunning a full mission.
- [ ] Fixture intervention, native input, simulation stepping and rendered review are unmistakably labeled.
- [ ] CI/cloud billing is unnecessary: runs work locally. Test bridge is absent/disabled in production exports.
- [ ] Capture overhead and event history are bounded; no recording every frame to unbounded JSON.

## Existing integration points
window.PW.game; tools/helpers/main-combat-fixture.mjs; tools/*-browser.mjs; src/core/combat-selection.js; src/engine/game.js; src/engine/threat-room.js; native recording/Newsroom infrastructure. Inspect exports before implementing the suggested new filenames.

Priority: enabling infrastructure for #14, #19, #30, #5 and #6. Do not build a second gameplay engine inside the harness.

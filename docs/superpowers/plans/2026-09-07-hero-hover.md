# Hero Hover Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline for this focused continuation. Do not create another worktree or commit the unrelated dirty workspace.

**Goal:** Give the one-fist hero a confident resting float: lowered, separated fists and a clearly tucked/long leg pair.

**Architecture:** Change only the `hero` family's procedural hover joint targets. `animateFlight()` already blends these through the production apply order; do not add a parallel renderer or move the physics root. Existing saved overrides remain authoritative, and Studio already authors these joint values.

**Tech Stack:** JavaScript, Three.js, Node test runner, Playwright, Vite.

**Spec:** `docs/reference/FLIGHT_LANGUAGES.md`, `docs/DESIGN_DECISIONS.md`, and the user's request for superhero poses. This is a procedural-source-gap pass, not imported Superman/BFP animation.

## Global Constraints

- No maps or gameplay camera calibration changes.
- Physics root remains authoritative and unscaled, with YXZ rotation.
- Arms retain `[upper, forearm, fist]`, fixed lengths and final weapon grips; named leg joints remain unchanged.
- Combat and interruption layers retain priority. Preserve all other flight families and saved custom poses.
- One browser/GPU lane. Use real Node/browser/build gates; this repository has no TypeScript/Vitest/lint scripts.

### Task 1: Hero rest silhouette, continuity and saved authoring

**Files:** modify `src/data/flight-tuning.js`; create `tools/hero-hover.test.mjs`, `tools/hero-hover-review.mjs`; document results in `docs/reference/FLIGHT_LANGUAGES.md`.

**Interfaces:** consume `poseDefaultsForStyle('hero')`, `Fighter._animate(dt)`, and `profileFromDef/applyProfile/validateProfile`; retain the existing eleven numeric hover joint fields. No new runtime or package API.

- [x] Add a real-Fighter behavioral test for both fists at hip level and near the shoulder's forward plane, one visibly higher boot, closed empty fists, and unchanged root.
  ```js
  assert.ok(hand.y < pelvis.y + .7 * scale);
  assert.ok(hand.z - shoulder.z < 1 * scale);
  assert.ok(Math.abs(leftBoot.y - rightBoot.y) > .5 * scale);
  ```
- [x] Run `node --test tools/hero-hover.test.mjs`; observe the old forward-bent arms fail the spatial assertions.
- [x] Override only `HERO_POSES.hover`: lower/open shoulders, soften elbows, tuck one leg and leave the other long. Initial targets were refined by rendered bow/thigh clearance: final left pitch −.08, left spread −.42, right spread .3. Other chosen targets remain right pitch −.06, elbows .2/.32, hips .12/−.1, knees .95/.18, head pitch 0.
- [x] Verify 30/60/120 Hz hover and blocking behavior, idle wrap, flight → brake → hover → guard → hover continuity, actual held equipment, and custom saved hover overrides surviving serialization.
- [x] Capture before/after and the production sequence at 0/25/50/75/end, plus front/both profiles/rear, continuous playback, and the unchanged Game camera. Headless fixed-step recording is explicitly not a real-time frame-rate/feel approval; no imported-source claim.
- [x] Run focused hover/isolation, blocking, flight, languages, pose/strike, Studio/progression, camera, package, combat and build regressions serially as appropriate to the final changes.
- [x] Obtain a read-only review of the bounded diff, resolve verified findings, and record evidence/remaining gaps. Do not claim full-goal completion or a quality score.

Final evidence: `artifacts/hero-hover/verification/results.json`, all 14 named commands exit 0. Runtime source remained unchanged during the final refresh; a legacy minimum-elbow assertion was replaced with authored-angle plus hand-FK verification before resuming the flight gate. Two genuine bow intersections were reproduced RED and fixed before that final refresh. The full game goal remains active.

# Close-combat view implementation plan

> For agentic workers: implement inline with test-first checkpoints and an independent finish review. Preserve this user-owned dirty checkout; no commits or worktree relocation.

**Goal:** Reveal the close opponent without replacing the BFP rear camera.

**Architecture:** Keep camera steering in World. A focused foreground-visibility
module owns stable material uniforms and per-view projected cutaway geometry;
figure construction installs it after all character/source materials exist.
Studio profiles carry one optional camera amount, using the same runtime.

**Tech stack:** Existing Three.js 0.169, JavaScript, Vite, Node tests and Playwright.

**Spec:** `docs/superpowers/specs/2026-09-07-close-combat-view-design.md`

## Global constraints

- No auto shoulder orbit, zoom, free-look alteration, map or gameplay changes.
- Preserve old profiles and the actual user's localhost draft storage.
- One browser/GPU lane; diagnostic contexts use 127.0.0.1.
- No per-frame material clones/recompiles, extra render pass or shadow cutaway.
- Geometric occlusion alone is not shader visibility evidence.

## Task 1: Camera and localized material support

Files: `tools/close-melee-camera-check.mjs`, new
`tools/foreground-visibility.test.mjs`, new `src/engine/foreground-visibility.js`,
`src/engine/figure.js`, `src/engine/world.js`, `src/engine/game.js`.

- [x] Capture production obstruction and fixed-view counterfactuals. The probe
  measures real opaque anatomy rays and records full production HDR screenshots.
- [x] Run default before gate and retain its expected failures before edits.
- [x] Add failing runtime/profile/lifecycle tests: hidden/dead/far/free target
  clears uniforms, owner/form replacement clears old material state, zero time
  cannot advance easing, source/gear hooks remain installed once, camera state
  changes do not mutate Fighter transforms or material versions.
- [x] Implement `installForegroundVisibility(parts)`,
  `updateForegroundVisibility(world, subject, target, dt)` and
  `clearForegroundVisibility(world)` in one module. Install stable uniforms on
  opaque body materials, chaining rim/source hooks exactly once. Project actual
  head/pelvis to an aspect-correct capsule, discard only foreground fragments
  with a soft screen-space ordered coverage mask. Keep shadow materials intact.
- [x] Retain full camera lift and bound only the near parallax denominator.
  Call the update after final camera projection/transform; clear outside BFP
  chase ownership and on Studio inspection switches.
- [x] Add real rendered visibility ablations to the browser gate; compare
  player-on/target-on versus player-on/target-off against the same two captures
  with the player hidden. Require >=65% target contribution at contact, no
  target screen clipping and no shader/page errors. Keep geometric metric too.
- [x] Run Node tests and browser gate; inspect before/after rendered contact/guard cases.

## Task 2: Studio authoring and full verification

Files: `src/data/flight-tuning.js`, `src/tool/studio-profile.js`,
`src/tool/studio-main.js`, `src/tool/studio-preview.js`, profile/package tests,
browser authoring checks, `package.json`, final report and parity ledger.

- [x] Add camera `cutaway` in [0,1], default 0.9. Missing legacy values remain
  valid; profile extraction supplies default without rewriting local storage.
- [x] Add the named control to the existing camera inspector and explain that
  zero disables localized foreground fading; preserve all other styles/controls.
- [x] Test default/zero/out-of-range, undo/save/reload, fresh-context portable
  import and actual game consumption. Verify paused inspection clears the mask.
- [x] Run the UI detector once on changed UI files and address scoped findings.
- [x] Run camera/reference/flight, blocking, strike/pose, body/package, combat
  and build gates serially. Verify complete keyboard/mouse melee exchanges and
  separate live-camera moving-target/acquisition/release paths, alongside the
  18-case rendered close-combat matrix. This is not an unscripted feel verdict.
- [x] Local finish review; close live-test defects and refresh affected gates.
- [ ] Separate independent review was unavailable (agent usage limit). Do not
  present it as passed. Main-agent review and executable evidence are recorded
  in `docs/ARENA_DEFENSE_PASS.md`; the overall game objective remains unfinished.

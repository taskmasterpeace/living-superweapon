# Completion continuation implementation plan

> Use superpowers:subagent-driven-development for bounded worker tasks and review. Preserve the shared dirty checkout. No commits/staging during this continuation without a clean task-only boundary.

**Goal:** Close the user's full-brief gaps in ordered, evidenced passes rather than treating the first effects pass as complete.

**Architecture:** Preserve production Fighter, runSlot, Construct, AudioBus, StudioCombat and portable profiles. New simulation lifecycle data stays separate from presentation. Existing player/bot and gameplay/editor seams remain shared.

**Tech stack:** Existing JavaScript/Three.js 0.169/Vite/node:test/Playwright. No new dependencies.

**Spec:** `docs/COMPLETION_LEDGER.md` and its two linked user briefs.

## Global constraints

- No cape embellishment, map redesign, architecture migration, paid asset requests or imaginary audio access.
- Traveling beams remain hoses. Preserve BFP camera and existing controls.
- Read-only inventory precedes replacing existing systems.
- Test intended failures before changing behavior, then focused regressions, rendered evidence and build.
- Distinguish code evidence, measured behavior, visual opinion and missing acceptance.

## Task 1: Inventory current movement and wider systems

- [x] Read-only movement audit identifies concrete missing ground/air/multi-origin cases with file/line and available regression commands. Deliver `docs/reports/2026-09-08-movement-gap-audit.md`.
- [x] Read-only wider-system inventory covers resource constructs, vehicles/threat/infection/nanites and existing wheel/broadcast; deliver `docs/reports/2026-09-08-systems-gap-audit.md`.
- [x] Fold findings into the ledger before selecting the next animation or military implementation. Do not relabel existing code as finished without behavior evidence.

## Task 2: Resource-backed constructs

Implementation brief: `docs/superpowers/plans/2026-09-08-resource-constructs-brief.md`, now prepared and read in full by parent. Required deliverable: explicit legacy-timed, continuous-energy and damage-backed-energy lifetime policies; deterministic depletion/dismissal/KO cleanup; bounded construct targetability; configurable native tank construct; Studio/portable authoring using the same data. Preserve default shipped-kit balance until an authored setting or new example chooses a new mode. Implement its four tasks sequentially with review checkpoints; wall/tank are the first slice, other forms explicitly remain open.

Subtasks 1 (native lifetime/ownership/dismissal), 2 (native tank geometry/movement/cannon), 3 (native damage receivers) and 4 (portable authoring/Studio) are implemented, independently approved and browser-checked; see `docs/reports/2026-09-08-resource-constructs-task1-report.md` through `2026-09-08-resource-constructs-task4-report.md`. This completes only the explicitly bounded wall/tank first slice, not all forms or the whole brief.

- [x] Write failing real-Construct tests for continuous cost, damage cost, no negative energy, pause/dt invariance, owner KO, simultaneous objects and legacy behavior.
- [x] Implement the selected lifetime seam and test it through real ability/Studio paths.
- [x] Capture representative formation, sustained energy drain, damaged construct and depletion; review task-only changes.

## Task 3: Audible authoring harness

Files: new `src/tool/studio-audio.js`, `src/data/audio-cues.js`; modify `src/tool/studio-combat.js`, `src/tool/studio-preview.js`, `src/tool/studio-main.js`; tests `tools/studio-audio.test.mjs`, `tools/studio-audio-browser.mjs`; guide `docs/STUDIO_AUDIO.md`.

Interface: a Studio audio adapter owns one existing AudioBus, an explicit enabled flag and a live-playback gate. `enable()` is called from a user gesture; `setPlaying(bool)`, `setScrubbing(bool)`, `stop()` and `dispose()` control lifecycle. Its stable `.audio` facade forwards production combat SFX only when enabled AND playing AND not scrubbing; loop handles are stopped on mute/pause/seek/reset/disposal. Scrubbing never starts audio, and re-enabling never replays historical events. No alternate damage implementation or duplicate RAF loop.

- [x] Derive exact required audio methods from native beam/projectile/charge/melee/construct execution. Inventory existing sampled/DSP cues and missing asset requests with timing, desired sonic character and loop/tail rules.
- [x] Tests instantiate the adapter with a deterministic audio backend and exercise actual gate behavior: disabled means no live handles; enable/play forwards; pause closes active handles; scrub returns inert handles; dispose is idempotent. Browser test verifies real AudioContext resume, native ability playback, no stuck sustains after pause, and no autoplay.
- [x] Add compact explicit sound control to existing transport, plus cue reference accessible from Effects. UI must clearly distinguish local recorded/DSP fallback from unavailable future voice assets.
- [x] Write original optional personality dialogue lines as authoring candidates tied to actual events (charge, denied energy, guard, hit, KO, victory). No continuous random chatter, imitation of a living performer's voice, or false claim of recorded speech.
- [x] Review and verify the native harness in browser with sound enabled and disabled, pause/scrub, hero swap, replay and disposal.

## Follow-on passes (not complete)

**Latest user priority:** the actual root game still showed the old city view. `docs/superpowers/plans/2026-09-09-main-game-combat-view.md` specifies the next integrated camera/input/HUD task, preserving actual city/civil systems,2P/map owners and city physics. Parent real root/UI expected-BFP test already fails `iso !== chase`; no runtime fix yet. Execute after the active bounded Task4 KO-inspection/dead-incoming-actor review correction. Do not defer main-game integration behind new military features or more reference-only effect work.

After inventory/above verification, create focused specs for missing movement cases, nanite forearm cannon/shield and fit/reform, resource tank presentation/authoring, and remaining military/infection systems. Each gets a concrete implementation/test plan before code; the ledger remains open until their acceptance is met.

Active next brief: `docs/superpowers/plans/2026-09-08-nanite-forearms-brief.md`. Parent read and accepted its scoped initial settings, with native Guard policy and staged catalog-publication gates. Tasks1–3 fitted assembly, actual forearm charge/emission and physical cell contact are implemented, independently approved and browser-verified; both genuine sources are now published. Task2's ledge interruption/open-palm corrections passed321 tests/build and three full-charge native moving cases. Task3's full orientation/fit, native contact/admission and residual feedback corrections passed687 unfiltered tests/build, independent review and six public native hole/repair cases. Two16-module pressure/cleanup repeats passed, but the first unexplained Chromium crash and cold-render hitches remain open. Task4 moving Studio controls/sequence/atomic validation is now active. Native finite-radius charge center stays one radius forward of the current aperture, not relocated onto the socket.

Prepared later brief: `docs/superpowers/plans/2026-09-08-military-vehicles-brief.md`; parent accepted initial unbalanced combat/response prototypes, with a moving-contact ordering correction. Occupancy/destruction-ejection policy remains gated before Tasks 5–7; no arbitrary forced KO from blocked geometry. No military vehicle runtime is implemented by the brief.

## Coordination preflight

| Tasks | Shared boundary | Resolution |
| --- | --- | --- |
| Inventory / implementation | Runtime source | Auditors read only; report gaps, never edit source concurrently |
| Constructs / audio | StudioCombat, StudioPreview, Studio main | Worker owns simulation only first; parent coordinates integration after report; no simultaneous edits to shared Studio files |
| Sound / animation | Fighter action events | Audio listens to existing cues; no animation timing or movement authority changes |
| Profile extension / ORIGIN | Serialized character settings | Keep migration defaults and custom-kit carry behavior; verify package roundtrip |

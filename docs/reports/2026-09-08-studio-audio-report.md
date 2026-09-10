# Studio audio implementation report

Scope: Task 3 in `docs/superpowers/plans/2026-09-08-completion-continuation.md`. No commits; shared dirty checkout and earlier effects edits preserved.

New files: `src/tool/studio-audio.js`, `src/data/audio-cues.js`, `tools/studio-audio.test.mjs`, `tools/studio-audio-browser.mjs`, `docs/STUDIO_AUDIO.md`.

Integration: StudioCombat takes optional third audio argument (default silent unchanged). StudioPreview owns the adapter, uses a playing setter, retires output before seek's `_seek` reconstruction with finally release, listens/sweeps each RAF, disposes dedicated context. Studio main adds an opt-in transport button, Effects cue brief/export, and changes now-inaccurate silent-stage labels. No animation/physics/camera changes here.

TDD: new test initially failed with missing `studio-audio.js`. Implemented actual lazy loop descriptors, gate, retirement, route-generation swap. Five unit tests pass. Focused regression: `node --test tools/studio-audio.test.mjs tools/construct-studio.test.mjs tools/charge-gather.test.mjs`: 16 passed, 0 failed.

Initial real browser run: AudioContext running, 174 decoded recordings, zero events while paused, native charge with measured signal peak 0.01129, pause zero handles, scrub no events, native beam resumed one live handle, mute/dispose clean, no page/console errors. `artifacts/studio-audio/results.json` and screenshots contain evidence. Extended check adds actual analyser silence, melee and hero replacement; report latest results before acceptance.

Limitations explicit in guide: no future AAI integration, unrecorded dialogue candidates only, no motion-only footstep/flight sound yet, no Studio KO/victory simulation. Native bus fallback behavior unchanged; no fake voices. Actor and attack audio data stays production-owned.

Review focus: pause/resume/scrub output lifetime, races, existing native call coverage, truthful UI, load failures and sound generation cache behavior. Review only scoped new files and named integration seams; older profile/attack/construct changes in dirty files are outside this task.

## Review fixes

Reviewer reproduced silent native energy-denied/depleted rehearsals. Added two native Studio/Fighter tests, observed both fail (no warning zaps), then routed matching gameplay warning frequencies through the gated adapter with simulation-clock debounce/reset. Both now pass. Added required hit/KO unrecorded dialogue candidates and corrected swing, depletion and gated yell source mappings.

Current focused command above: **18 passed, 0 failed**. Extended browser run completed: actual analyser silence after pause, native resumed beam, native melee contact 9.550464 plus swing/meleeHit, character replacement cleanup, export and context close, zero errors. Browser source peak .01268939 with 174 decoded local recordings. No future audio service or bespoke speech claimed.

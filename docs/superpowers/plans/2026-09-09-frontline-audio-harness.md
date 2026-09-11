# Front-line Audio Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Ship an audible, replaceable cue library with honest wiring status and dialogue spam prevention, accessible from the existing Studio.

**Architecture:** Keep cue metadata separate from Web Audio playback and DOM authoring. Route selected replacements through the existing native AudioBus so Studio and PowerWorld share bindings; existing sounds remain fallback. No external generation service is needed.

**Tech Stack:** Existing JavaScript, Three.js 0.169, Web Audio, DOM, Vite 5, node:test, Playwright.

**Spec:** `.dream-loop/brief.md` approved by creator's GO request, with the explicit placeholder-audio addition.

## Global Constraints

- Work in D:/lsw on existing codex branch; preserve all unrelated dirty edits. No commits, bulk staging, reset, copy to a new worktree, or external writes.
- PowerWorld at /powerworld.html is the accepted game. Do not change game camera, map or bindings for this audio task.
- No purple; warm-neutral/amber DOM UI. Reuse Studio typography/layout conventions.
- Every catalog cue can be auditioned; future cues are marked preview-only. No claim that a nonverbal placeholder speaks authored dialogue.
- Import/export must survive reload and transfer: store chosen small local recordings persistently, include audio in the exported package or explicitly expose missing files; reject invalid/oversized input gracefully.
- Pause/stop/dispose must retire audible sources; no playback without browser gesture; no remote generation or purchases.

### Task 1: Complete cue library, preview, replacement and suppression

**Files:** Create src/data/sound-library.js (catalog); src/core/sound-library.js (validation, persistence, playback/gates); src/tool/sound-library.js and src/tool/sound-library.css (DOM panel); tools/sound-library.test.mjs and tools/sound-library-browser.mjs. Modify src/core/audio.js, src/tool/studio-main.js, and src/tool/studio.css only for narrow mounting/routing. Existing src/data/audio-cues.js is the source description catalog; preserve its exports and extend reuse without duplicating contradictory descriptions. Do not modify src/engine/game.js, entity.js, abilities.js, projectiles.js or powerworld.js; controller owns those.

**Interfaces:** export SOUND_CUES with stable id, family, phase, description/generationPrompt, duration, loop, placeholder parameters, nativeMethod (nullable), wiring status. A SoundLibrary accepts an AudioContext/output or native AudioBus; expose audition(id), stop(), importPackage(data), exportPackage(), bindRecording(id,file), and a public event gate returning {accepted,reason}. Public signatures may be adapted to actual existing contracts if recorded in report. Native method replacement must call the same playback resolver as audition; choose one safe native contact method as proven end-to-end and enumerate supported methods rather than silently claiming all methods are wired.

- [ ] Snapshot owned existing files before edits into artifacts/frontline-audio-baseline/ (copy only, no overwrite of original files). Write behavioral RED tests: all cues have an audible recipe; line/category/character/global cooldown decisions including expired context; malformed package cannot replace good state; bound recording survives export/import; user asset overrides a real native contact method. Example gate fixture: first accepted at t=0; same speaker t=1 rejected; distinct speaker still rejected by shared speech spacing; a stale event rejected even after spacing expires. Show the actual failing output.
- [ ] Implement a complete initial catalog: movement (walk/run/landing/hover/flight/boost/brake), melee (windup/swing/light/heavy/miss/block/break/grab/throw), beam (charge/release/sustain/contact/clash/drain/stop), defense/teleport, constructs/nanites, rifle/reload/empty/heavy weapon/explosion, rotor/jet/flyby, correspondent/highlight, objective/recovery/research/UI, and dialogue candidates from existing audio-cues. Merge descriptions by semantic phase, not one generic beep for everything. Use restrained synthesised noise/oscillator envelopes for missing sounds and amplitude envelopes for clean starts/stops.
- [ ] Gate speech with per-line and per-speaker cooldown, category/global gap, no immediate repeats, priority and stale-event expiry. Display the exact authored text alongside nonverbal placeholder. Use character profile overrides so stoic and talkative characters differ. Keep combat SFX routing separate from dialogue throttling.
- [ ] Mount a searchable/filterable Sound Library panel in Studio, with visible selected cue details, Play/Stop, placeholder versus chosen source, loop/gain settings, local audio chooser/removal, export/import, and suppression diagnostics. Label preview-only cue state conspicuously. Expose a compact generation brief export so creator can send descriptions to a chosen service later.
- [ ] Prove in browser: open actual Studio, audition a one-shot and loop after gesture, stop, import a tiny generated WAV fixture, select it, export/reload/import, then trigger the supported native game method through a real PowerWorld action or native diagnostic (label if not real input). Verify output source is the chosen recording, not just saved UI metadata. Reject malformed media without losing last valid binding. Capture UI screenshot and short audio evidence if feasible. No network intercepts hiding errors.
- [ ] Run node --test tools/sound-library.test.mjs plus existing tools/studio-audio.test.mjs when present; run browser harness with GPU channel chromium and npm run build once. Record exact results and known native-coverage gaps. Self-review then report; controller supplies independent review.

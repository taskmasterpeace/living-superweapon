# Audio AI handoff — isolated recordings and ambient loops

Start from codex/playable-integration. Work only on codex/audio-content-pass in D:/lsw/.worktrees/audio-content-pass. You are not alone in this repository; preserve other workers' edits. Own public/audio/ai-pass/**, audio manifest/provenance files under docs/audio/** and your audio-only report. Do not change combat, vehicle, input, character or UI code. Do not merge or deploy. Make clean local commits, no Co-Authored-By lines; provide commit IDs to the integration owner.

Goal: deliver original AI-generated individual one-shots and seamless loops compatible with the existing standalone Sound Library. Do not supply mixed combat recordings as replacement assets. Old comments saying no AI audio are superseded by the creator's explicit AI-audio request; preserve accurate provenance for existing samples.

## Read and use the existing interface

- sound-library.html; src/data/sound-library.js exports SOUND_CUES and generationBrief().
- src/core/sound-library.js: SoundLibrary.bindRecording(cueId, File), exportPackage(), importPackage(), source(), native(), play()/stop().
- src/data/audio-cues.js contains legacy and operation directions; not every catalog route is integrated with SoundLibrary. Report wired/unwired honestly.
- src/engine/operation-audio.js LIVE_OPERATION_CUES indicates actual operation event owners, not SoundLibrary import bindings.
- docs/AUDIO_REPLACEMENT_HANDOFF.md and tools/export-audio-replacement-kit.mjs provide briefs. tools/build-audio-import.mjs creates a supported v1 import package from existing cue IDs and files.

## First small delivery

Generate three independent recordings as a pilot: light (punch contact one-shot), heavy (heavy contact one-shot), weather-rain (seamless ambient loop). These have existing replacement routes. This does not authorize replacing all gameplay sound before review.

Write docs/audio/ai-pass-manifest.json with this shape (paths relative to that file):

    {"sounds":[
      {"cue":"light","file":"../../public/audio/ai-pass/light.wav","gain":0.55},
      {"cue":"heavy","file":"../../public/audio/ai-pass/heavy.wav","gain":0.55},
      {"cue":"weather-rain","file":"../../public/audio/ai-pass/weather-rain.wav","gain":0.4}
    ]}

Run:

    node tools/build-audio-import.mjs docs/audio/ai-pass-manifest.json artifacts/ai-audio-import.json

Use the standalone page's Import library control to decode/validate and audition. Export the user's existing library first: import replaces the package rather than merging it. Use a fresh browser profile for tests. Single recording <=1 MiB; decoded duration <=30s; package <=4 MiB. The CLI validates IDs, size, MIME extension, duplicates and gain, but does not pretend to validate sound quality or decode media. The browser does that part. Prefer short 48 kHz source masters and compressed audition assets when needed. Preserve masters outside the browser package.

## Full content backlog after pilot

Combat: swing/miss, material contact flesh/metal/stone, block, guard break, capture, throw release, terrain impact. Powers: separate charge/start, sustain, impact and shutdown; multiple readable beam signatures. Movement: footfalls, takeoff, flight air, speed transition, landing. Equipment: rifle, grenade release/bounce/blast, scanner acquire/lost, personal shield versus deployable dome, turret, grapple launch/attach/reel/release, beacon arm/teleport, jump-jet ignition/sustain/stop. Vehicles: engine idle/load, rotor/jet sustain and damage. Ambient: wind, lab ventilation, machinery, industrial hum, localized weather. Voices/radio are a separate authored category, not random nonverbal markers.

For unwired cues deliver an asset + proposed exact event mapping; do not attach the sound to an unrelated event merely to make it audible. Ambient scenes need owner/zone lifecycle integration by the main AI; the audio worker supplies content and fade/loop guidance.

## Delivery checks

Each asset has cue ID, type, duration, file, generator/model, prompt, provenance/use terms, variation, loop notes, intended bus/event, wired/unwired status. No music baked into effects, no repeated burst baked into a single gunshot, no fake spoken dialogue, no reverb/distance baked where runtime spatialization should apply. Loops have seamless joins, no attack/ending. Verify start, stop, pause, repeated audition, reload and exported/imported recording names. Listen to isolated files. A waveform or passing decoder is not a sound-quality verdict.

Use local tests/build only; no hosted GitHub Actions required. Do not install or spend on a generation service without existing authorization/access. If unavailable, report that clearly and leave prompts ready; do not relabel DSP placeholders as AI-generated sounds. Hand back an audio-only diff, manifest, import package location, listening notes and remaining unmapped cues.

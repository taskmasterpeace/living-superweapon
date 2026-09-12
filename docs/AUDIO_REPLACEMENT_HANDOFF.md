# Individual sound replacement handoff

Creator rejected the mixed audio review on 2026-09-12. Deliver isolated one-shots or seamless loops for AI replacement. Existing sounds are reference placeholders, not approved final audio.

Run locally:

    node tools/export-audio-replacement-kit.mjs D:/lsw/artifacts/audio-replacement-kit
    node tools/validate-combat-local.mjs

The exporter copies existing recordings into one-shots/ and loops/ and writes index.html, manifest.json and AI-PROMPTS.md. It does not synthesize new placeholders or call paid AI services. The operation worker supplied DSP placeholders, not AI audio-model outputs. Every reference preserves its source path. Missing sound-library recordings remain prompt-only slots.

Generate each replacement independently from AI-PROMPTS.md. Loop sustain, startup and stop must remain separate assets. The exported WAV names are staging names, not automatic runtime bindings. Existing sample-bank paths use MP3. The catalog documents sound-library bindings; preview-only cues still require runtime integration. Verify accepted-event timing, cancellation, depletion, owner death, reset and overlapping owners when integrating loops.

Hosted combat-review workflow removed; tests and production build run on the local computer. GitHub remains source delivery only for this pass. Existing manual/tag desktop-release workflow is not invoked.

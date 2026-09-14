# operation-v1 — combat & squad cue authoring

Reproducible source for the first-playable-operation audio cues. Everything here is original,
dependency-free, deterministic DSP synthesis. See `PROVENANCE.md` for the license/provenance
statement and `docs/handoffs/operation-audio.md` for the full delivery + integration handoff.

## Files
- `synth.mjs` — the DSP toolkit (seeded PRNG, oscillators, RBJ biquads, envelopes, ring-mod,
  softclip, a "radio" processor, measurement, WAV writer). No external deps.
- `recipes.mjs` — one recipe per cue (`RECIPES`, `render(id, variant)`, `stem(id, variant)`).
  Design intent + event mapping live in `src/data/audio-cues.js` (`OPERATION_AUDIO_CUES`).
- `masters/` — the 40 rendered WAV masters (reproducible source of truth).
- `PROVENANCE.md` — per-asset ledger (sha256, duration, peak).

## Reproduce the assets
```bash
node tools/operation-audio-build.mjs      # -> authoring/audio/operation-v1/masters/*.wav + public/audio/operation-v1/*.mp3 + manifest.json
node tools/operation-audio.test.mjs        # 12 checks: shape, existence, levels, observer-safety, reproducibility
node tools/operation-audio-reel.mjs        # -> artifacts/operation-audio/audition.html + audition-reel.wav
```
Layout: `masters/` holds the reproducible WAV source of truth (never fetched at runtime);
`public/audio/operation-v1/` holds only the MP3 derivatives the engine loads (`audio/<stem>.mp3`).
The WAV masters are byte-identical across runs (same seed). The MP3 derivatives are reproducible
given the same ffmpeg/libmp3lame build (recorded in `manifest.json`).

## Add or re-tune a cue
1. Add/adjust the recipe in `recipes.mjs` (`RECIPES[id] = { variants, build }`).
2. Add/adjust the registry entry in `src/data/audio-cues.js` (`OPERATION_AUDIO_CUES`) with its
   event mapping, dedup rule and cooldown.
3. Re-run build + test + reel. The test asserts the registry and the built assets cannot drift.

## Design notes
- **Combat confirmations** (hit/block/guard-break) are dry, non-positional feedback — distinct from
  the spatial world impact the engine already plays natively.
- **Squad + pursuit** cues are short **filtered-radio** tones on the voice bus (non-verbal, standing
  in for a future licensed VO layer — never voice cloning). They share ONE radio channel with a min
  gap and priority preemption so combat never turns into radio spam, and they duck under speech.
- **Pursuit** cues are observer-knowledge safe: they fire on the observer's own accepted transition,
  are non-positional, and never reveal an unseen enemy (see `OPERATION_AUDIO_POLICY.observerKnowledge`).
- **Zombie vocals** are synthesised creature sound (glottal source + formant filters + gurgle), heard
  through spatial sound with a reach and a concurrency cap.

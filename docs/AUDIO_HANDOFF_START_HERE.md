# 🎧 AUDIO HANDOFF — START HERE

You are wiring the game's audio into gameplay. **Everything is on branch `codex/audio-all`.** All sound files exist as bank-ready `.mp3` under `public/audio/`. Nothing is wired yet. Your job: switch it all on.

## Read these three docs, in this order
1. **`docs/AUDIO_INTEGRATION.md`** — the map: what audio exists, where, licenses (all cleared/CC0; two CC-BY attributions to surface).
2. **`docs/AUDIO_WIRING_SPEC.md`** — THE INSTRUCTIONS. A master table: for every sound → its file, gain, and the exact game event to fire it on. Work top to bottom.
3. **`docs/AUDIO_GAP_ANALYSIS.md`** — what's NOT here yet (don't waste time hunting for it) + the one structural gotcha below.

## Do it in this order
1. **Read the ⚠ TWO-SYSTEMS gotcha first** (`AUDIO_WIRING_SPEC.md` §0.5 / `AUDIO_GAP_ANALYSIS.md` §0). Vehicles/aircraft/weather/reloads/scout-gun use a *different* audio path (the SoundLibrary placeholder) — they need the call site re-pointed to `audio.sample()`, not just a bank paste. Everything else is a normal bank paste.
2. **Paste the ready-made bank blocks** into `src/core/samples.js` `MANIFEST` (each batch ships a `sampleBankManifest` block — pointers in `AUDIO_WIRING_SPEC.md` §4). Apply the dedupe rule (§1): where a real CC0 take and an AI take overlap, use the real CC0.
3. **Hook each sample at its event** per the master table (`AUDIO_WIRING_SPEC.md` §2). Add the one small piece of new code — the operation radio-channel manager (§3).
4. **Add the HOT_SET preloads** (§5) and **verify** each batch in a foregrounded tab (§6).

## Do NOT
- Do not wire the `public/audio/sfx-gaps/` DSP-synth set (it's the rejected "Atari" copy, kept for reference).
- Do not chase the gap-list items (rocket-launch whoosh, reloads, tank cannon, etc.) — those need sourcing first and are tracked separately.
- Do not re-grade the ambient beds (`gen.hum`/wind/rain/alarm/water) — those are pending picks (issue #16); wire the two that are locked (`amb.machinery`, `amb.bed`).

That's the whole job. The specs are exhaustive; follow the table.

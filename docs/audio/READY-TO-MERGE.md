# Ready to merge — LSW audio pass

Branch **`codex/audio-content-pass`** is complete and merge-ready. Audio-only diff — no combat,
vehicle, input, character or UI code touched.

## What's included (all committed, all mapped to game events)

| Stream | Count | Map | Import/how |
|---|---|---|---|
| **Ability / combat cues** | 37 | `docs/audio/ai-pass-manifest.json` | package `artifacts/ai-audio-import.json` → Sound Library import |
| **Arsenal** (13 firearms + fire variants, blades, gear, mine arm/timer/detonate, gadget loops) | 43 | `public/audio/ai-pass/final/arsenal-manifest.json` | per-weapon/event playback |
| **World SFX** (bullet impacts, footsteps, flight, charging, distant, melee handling, scuttle) | 27 | `public/audio/ai-pass/final/world-sfx-manifest.json` | per-event playback |

**≈107 game sounds** + round-robin variants. Master index: `docs/audio/INTEGRATION-HANDOFF.md`.
Second-AI context: `docs/audio/CONTEXT-FOR-OTHER-AI.md`. Every manifest row carries `moment`
(FIRE/AIR/IMPACT/ACTION/LOOP = where it attaches), `gain`, `maps_to` (armory.js id or event), `variants`.

## Supplied externally (NOT in this branch — integration should slot them in)
- `step-metal` — Robert has a metal-grate sound to drop in.
- `casing` (shell casing drop) — source a CC0 sample; the AI takes were rejected.

## Optional / future
- Ambient **zone beds** (wind / rain / machinery loops) — a later batch.
- **Provenance / rights:** ElevenLabs sound-generation + a few AudioX (self-hosted). Confirm the
  ElevenLabs plan permits commercial/game use before shipping.

## The diff (audio only)
`public/audio/ai-pass/final/**` · `public/audio/ai-pass/*.wav` (37 ability cues) · `docs/audio/**` ·
`artifacts/ai-audio-import.json`. Working files (`candidates/`, `masters/`, `audition-*.html`) are
intentionally **not** committed.

## To merge
```bash
cd D:/lsw
git checkout codex/playable-integration     # or your integration branch / main
git merge codex/audio-content-pass
```
…or open a PR from `codex/audio-content-pass`. Then wire cues to events per `INTEGRATION-HANDOFF.md`
(don't regenerate — read the manifests, coordinate by cue id).

## Commits on the branch
`be03ac7` abilities · `8d45b6e` arsenal + handoff · `bba49bd` / `ea89722` / `34a9e4f` gun approaches + .50 ·
`5b103cc` world-sfx + context · `d095c47` final world-sfx keeps.

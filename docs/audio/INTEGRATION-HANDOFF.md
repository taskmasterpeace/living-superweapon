# Audio integration handoff — for the game/integration agent

Branch `codex/audio-content-pass`. This is asset delivery + mapping. Nothing here is wired into
gameplay yet — that's your job. Two independent streams below.

## Where everything is stored

| What | Path | Notes |
|---|---|---|
| **Ability/combat cue wavs** | `public/audio/ai-pass/<cue>.wav` (folder root) | 37 files, filename = the game's SOUND_CUE id (`light.wav`, `heavy.wav`, `gun.wav`, `weather-rain.wav`, …) |
| Ability cue manifest | `docs/audio/ai-pass-manifest.json` | `{cue, file, gain}` per cue |
| Ability **import package** | `artifacts/ai-audio-import.json` | `lsw.sound-library` v1, 37 cues / 7 loops, <4 MiB — loads via the Sound Library import |
| Ability provenance/report | `docs/audio/ai-pass-report.md` | model/prompt/wiring/gain per cue |
| **Arsenal wavs** (weapons/gear/events) | `public/audio/ai-pass/final/<cue>.wav` | 42 files |
| Arsenal manifest | `public/audio/ai-pass/final/arsenal-manifest.json` | `lsw.arsenal-audio` v1 — `{cue, file, moment, kind, gain, maps_to, status}` per sound |
| Raw full-length masters | `public/audio/ai-pass/masters/raws/*.raw.wav` | re-cut tail length later WITHOUT regenerating |
| Audition tools (offline) | `public/audio/ai-pass/audition-*.html` | self-contained, base64; play/vote |
| Live audition link | claude.ai artifact (private to Robert) | the "Arsenal Sound Check" page |
| Event coverage (have/missing) | `docs/audio/ai-pass-event-map.md` | what's built vs. the next batch |

**Format:** WAV PCM16. One-shots 32 kHz mono; loops 22.05 kHz mono, seamless (built to run
continuously). Peak-normalized ≈ −1 dBFS — play each at its manifest `gain` (loops ~0.40, one-shots
~0.55), don't assume unity.

## The MOMENT field (arsenal manifest) — where each sound attaches

`FIRE` = the weapon firing · `AIR` = swing/throw/travel, no contact yet · `IMPACT` = contact/hit/blast ·
`ACTION` = handling (pin-pull, reload, deploy, arm) · `LOOP` = continuous while active. Attach each
sound to the matching game event, not by guessing from the name.

## Stream 1 — ability cues → the Sound Library

The game's standalone Sound Library (`sound-library.html`, `SOUND_CUE_BY_ID`) takes an import package.
- **Easiest:** in the Sound Library UI, Export the current library first (import REPLACES it), then
  Import `artifacts/ai-audio-import.json`.
- **Or wire directly:** for each row in `docs/audio/ai-pass-manifest.json`, bind `cue →
  public/audio/ai-pass/<cue>.wav` at the given gain; loop the ones marked loop.
- Each cue's connection to a native event is its `wiring` in `docs/audio/ai-pass-report.md`
  (`native-replacement` / `native-loop` / `preview-only`) — see `src/data/sound-library.js` and
  `src/data/audio-cues.js`.

## Stream 2 — arsenal → `src/data/armory.js` weapons/gear/events

Every row in `final/arsenal-manifest.json` carries `maps_to` — the exact `armory.js` id or event.

- **FIRE (firearms):** today the game **synthesizes** each gunshot from a VOICE profile
  (`src/data/armory.js` `VOICES`, built by the gunshot code — see `src/engine/weapon-emission.js` and
  the `audio.gunshot` path). To use these recordings: in the fire path, look up
  `final/wpn-<armory id>.wav` for the firing weapon and play it (replace or layer over the synth).
  `maps_to` gives the id (`m16`, `ak`, `pump`, `magnum`, …).
- **BLADES (melee):** on a swing, play `final/blade-<id>.wav` (`maps_to` = BLADES id). The **hit** is
  separate: `evt-slash-hard` (armor/wall) and `evt-slash-flesh` (body — in candidates, re-roll pending),
  `evt-blade-thunk` for a thrown blade embedding.
- **GEAR:** play `final/gear-<id>.wav` on that gear's use/deploy/impact (`maps_to` = GEAR id). Running
  gadgets loop while active and stop on deactivate: `final/gad-jammer-loop.wav`,
  `gad-thermal-loop.wav`, `gad-rappel-loop.wav` (rappel loop = the reel-in, per Robert).
- **Mines / spider-mine:** `dep-mine-arm` (place/arm) → `dep-mine-timer` (countdown) →
  `dep-mine-detonate` (blast). Wire through `src/engine/operation-audio.js` (`operationSound`) or
  directly. (Spider-mine feature has its own design note; a "scuttle" movement loop is still owed.)
- **Generic combat events:** `evt-throw` (throw whoosh), `evt-grenade-pin`, `evt-grenade-bounce`,
  `evt-punch-flesh` (bare fist to body).

## Status & gaps — do not ship blind

- **FIRE — all 13 firearms locked** to Robert-approved approaches, several with round-robin fire
  variants (`final/wpn-<id>-vN.wav` — the game should rotate them so repeated fire doesn't sound
  copy-pasted). `wpn-battle` v2 is a **3-round burst** take (time it for burst/auto fire). `wpn-m107`
  (.50) uses a **cannon/artillery-framed** take — a literal .50 "gunshot" prompt never worked; layer
  with the existing synth if you want more punch.
- **Not built yet** (highest-value next batch, see `ai-pass-event-map.md`): **bullet impacts**
  (flesh / concrete / metal / dirt / wood / glass / water), **ricochets**, **shell casings**,
  **whiz-by**; weapon **draw/holster**; **per-surface footsteps**; **block/parry**; a mine **scuttle** loop.
- **Dialogue/voice** deliberately excluded (separate authored category — no fake speech).
- **Provenance / rights:** ElevenLabs sound-generation (+ a few AudioX one-shots, self-hosted).
  Confirm the ElevenLabs plan permits commercial/game use before shipping.

## Re-cutting length without new API calls

Raw full-length generations are in `masters/raws/`. Re-cut any tail with
`audio_proc.trim_decay(raw, out, max_len)` (the pass's helper) — no regeneration needed.

## Commits (hand these to integration)

- `be03ac7` — ability cues: 37 final wavs + `docs/audio/ai-pass-manifest.json` + import package + report.
- `<this commit>` — arsenal: `public/audio/ai-pass/final/**` + `arsenal-manifest.json` + this handoff +
  event map. Not merged, not deployed.

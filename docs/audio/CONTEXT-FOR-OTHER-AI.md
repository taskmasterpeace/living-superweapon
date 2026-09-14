# Context for the other AI — LSW audio pass

Everything the audio session built lives on **one git branch**. To use it, just read that branch —
no need to regenerate anything.

- **Repo:** LSW / War World (`D:/lsw`)
- **Branch:** `codex/audio-content-pass`  (built in worktree `D:/lsw/.worktrees/audio-content-pass`)
- **Read this first:** `docs/audio/INTEGRATION-HANDOFF.md` (full where/how-to-wire)

## What exists — 3 asset streams (all under `public/audio/ai-pass/`)

1. **Ability / combat cues (37)** — melee, beams, powers, shields, weather, UI.
   - Import package: `artifacts/ai-audio-import.json` (drop into the Sound Library import)
   - Map: `docs/audio/ai-pass-manifest.json` · files: `public/audio/ai-pass/<cue>.wav`
2. **Arsenal — real weapons/gear/events (43)** — 13 firearms (with fire variants), blades, gear,
   mine arm/timer/detonate, gadget loops.
   - Map: `public/audio/ai-pass/final/arsenal-manifest.json` · files: `final/wpn-*, blade-*, gear-*, dep-mine-*, evt-*, gad-*`
3. **World SFX (15, growing)** — ballistic ambience, per-surface footsteps, flight, **charging**,
   distant, melee handling, spider-mine scuttle.
   - Map: `public/audio/ai-pass/final/world-sfx-manifest.json` · files under `final/`

Every manifest entry carries: `file`, `moment` (FIRE/AIR/IMPACT/ACTION/LOOP = where it attaches),
`gain`, `maps_to` (the `src/data/armory.js` id or the game event), `variants` (round-robin), `status`.

## Format
WAV PCM16. One-shots 32 kHz mono; loops 22.05 kHz mono, seamless. Play each at its `gain`
(loops ~0.40, one-shots ~0.55). Raw masters for re-cutting are in `public/audio/ai-pass/masters/raws/`.

## Division of labor
- **Audio session (me):** generates, curates via audition tools, and locks approved assets to
  `final/` + the manifests. Still producing (see pending below).
- **Other AI / integration:** wires cues to game events per `INTEGRATION-HANDOFF.md` — sound-library
  import for stream 1; per-weapon/event playback for streams 2–3. **Read the manifests; don't regenerate.**
  Coordinate by **cue id**.

## Pending (audio session still owns; don't wait on these to start wiring what's done)
- Bullet **impacts** (flesh/concrete/metal/dirt/wood/glass/water) — first pass missed, re-rolling.
- `casing`, `flight-boost`, `distant-explosion`, `sheathe-blade`, `step-metal/water/wood` — re-rolling.
- Ambient **zone beds** (wind/rain/machinery loops) — next batch.
- Spider-mine gameplay feature has a design note (separate task); its arm/timer/detonate + scuttle are ready.

## Commits (audio-only, not merged, not deployed)
`be03ac7` abilities · `8d45b6e` arsenal + handoff · `bba49bd`/`ea89722`/`34a9e4f` gun approaches +
.50 · plus the world-sfx lock. Hand these hashes to integration.

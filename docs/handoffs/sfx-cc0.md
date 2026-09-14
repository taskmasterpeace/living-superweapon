# Handoff — real CC0 SFX (locked winners) · `codex/audio-sfx-gaps`

Real public-domain (CC0) recordings for the missing/weak game SFX, **picked by Robert 2026-09-13**.
Asset delivery only — **UNWIRED, not merged.** Replaces the earlier synth pass, which Robert rejected
as too "Atari".

## Where
- Branch `codex/audio-sfx-gaps` (worktree `D:/lsw/.worktrees/audio-sfx-gaps`).
- **Winners:** `public/audio/sfx-cc0/final/<stem>.mp3` (34 files) + `final/winners-manifest.json`
  (per-file source, license, integration snippet).
- All candidates (75) `public/audio/sfx-cc0/`; tools `tools/sfx-cc0.mjs` (curate+convert),
  `tools/sfx-lock.mjs` (lock picks), `tools/sfx-pick-artifact.mjs` (grading page).
- Raw 859 MB source archives are gitignored (`authoring/audio/sfx-gaps/cc0-src/`).

## Provenance / license
Real recordings, **all CC0 1.0 / public domain**, from OpenGameArt — same trust class as the existing
`public/audio` bank. No AI, no synthesis, no recorded/cloned voice. Packs:
The Free Firearm Sound Library · Owlish Media Sound Effects · 100 CC0 SFX · Gun reload sounds.
⚠ Add a row to `docs/AUDIO_SOURCES.md` for these when adopting (shared file, not in this branch's scope).
Format: 44.1k / mono / 96 kb/s MP3, trimmed to one-shots (leading silence removed, capped, faded).

## The 19 locked sounds
**Guns — REAL, REPLACE the weak AI arsenal guns** (`final/winners-manifest.json` → `integration.sampleBankManifest`):
- `wpn.pump` ← Mossberg pump shotgun → replaces **wpn-pump / wpn-auto12** (the burst-y AI one)
- `wpn.pump.rack` ← real shotgun cock → **NEW** (no cocking existed anywhere)
- `wpn.ak` (2 variants) → wpn-ak · `wpn.m16` → wpn-m16 · `wpn.smg` → wpn-mp5/pdw · `wpn.saw` → wpn-saw/machinepistol
- `wpn.pistol` (Bersa) → wpn-p9/machinepistol · `wpn.bolt` (Mosin) → wpn-m24 · `wpn.battle` (SKS) → wpn-battle

**New bullet-impact families** (wire on the projectile→surface hit): `impact.glass` (3), `impact.metal` (1),
`impact.wood` (1), `impact.concrete` (3), `impact.water` (3), `impact.flesh` (2).

**Melee / footsteps:** `melee.flesh` (2, bare-fist body hit) · `step.dirt` (1, new) ·
`step.concrete2` (4) and `step.grass2` (4) are UPGRADES of the existing synthesised-ish step.concrete/grass.

## Integration (main / audio integrator)
1. Paste `winners-manifest.json → integration.sampleBankManifest` into `src/core/samples.js` MANIFEST
   (files load as `audio/sfx-cc0/final/<stem>.mp3`). Per-sound gain is a starting point.
2. `wpn.*` REPLACE the matching arsenal `wpn-*` in the fire path (swap the file the gun plays).
3. `impact.*` are new — fire on the accepted projectile→surface hit (pick family by surface).
4. `step.*` upgrades — point the existing footstep selection at these.
5. Add the CC0 row to `docs/AUDIO_SOURCES.md`.

## Gaps — still need a dedicated CC0 pack (not in these four)
ricochet (whine-off) · whiz-by / supersonic crack · shell casings · surface footsteps
(gravel / metal grating / mud / water) · vehicle door / impact / boost · blade-slash-flesh.
Say the word and I'll pull these as real CC0 the same way.

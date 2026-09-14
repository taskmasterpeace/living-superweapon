# Remaining runtime audio gaps — 2026-09-14

Bounded audit of native SoundLibrary call sites and selected gadget events in the combat-release-review worktree. This is not an exhaustive audit of every sample or sound emitted by the game. Older AUDIO_GAP_ANALYSIS.md statements that all staged audio is unwired are superseded by the integrations below.

## Integrated and verified

- `src/data/sound-library-recordings.js` maps scout gunshots, vehicle explosions, grabs, melee hits, nanite transitions, grenade preparation/release, ordinary/domain rain and thunder, guard break and flight to bundled recordings. Firearm recordings also enter the manifest through `src/data/firearm-recordings.js`.
- Medkit/IFAK activation in `src/engine/game.js` plays `gear.ifak`, with the existing zap used only when the sample path does not handle it. Healing and charge consumption are unchanged.
- Jammer activation now plays confirmed `gear.jammer`; shieldpack activation plays `gear.shield.activate`, using the existing chosen `shield-raise` take. Both retain their existing zap fallback and gameplay effects. The source `gear-shield` take is an **impact**, so it was deliberately not misassigned to activation. Imported MP3s have source commit/hash/selection evidence in adjacent provenance sidecars.
- Guard break uses `library.guard-break` through the existing `Fighter.takeDamage` native hook. Imported `public/audio/ai-pass/guard-break.mp3` is 0.45 seconds; the provenance sidecar records source commit `f659822ae8cbd081fc00a697731527b1b6e6da17`, SHA-256 and the current AI library's chosen-binding evidence. That selection library exists in this checkout, not in the source branch. Do not describe this as a confirmed world-manifest row.
- Flight uses `library.flight` through `src/engine/flight-sense.js`. Imported `public/audio/ai-pass/final/flight-loop.mp3` is a 16-second loop, confirmed in the source branch's world-sfx manifest as `flight-loop__t1.wav`. Its provenance sidecar retains that row, source commit and SHA-256. The native hook accepts decoded bundled or chosen audio, preserves explicit placeholder preference, hysteresis and stop conditions. Hover is separate.
- These AI-pass assets were imported with user authorization; their provenance does not assert CC0. Existing authored assignments remain authoritative.

## Callable runtime events still lacking bundled assignments

| Event | Current hook | Current behavior / remaining requirement |
| --- | --- | --- |
| `rotor`, `jet` | `src/engine/frontline-aircraft.js`, `FrontlineAircraft.update` | SoundLibrary loop calls exist. Suitable aircraft engine recordings were not found in the supplied source branch during the earlier bounded audit. Require actual sustained loops; do not substitute an ignition or pass-by one-shot. |
| `hover` | `src/engine/flight-sense.js`, `updateFlightAudio` | Chosen recording only; silence without a decoded choice. The travel flight loop is not automatically assigned to hovering. Requires a suitable quiet hover loop or an explicitly approved reuse. |
| `reload`, `reload-eject`, `reload-insert`, `reload-chamber`, `empty` | `src/engine/firearm-ammo.js` | Event timing already exists, but default SoundLibrary playback is synthesized. No dedicated reload/dry-fire set verified in the supplied branch. A shotgun pump is not a universal magazine/bolt replacement. |
| `weather-vortex` | `src/engine/weather-vortex.js`, `WeatherVortex.update` | Owned spatial loop call exists; no verified matching bundled vortex recording. Ordinary and domain thunder/rain are already mapped and are not this gap. |

SoundLibrary user bindings can override these defaults; this table describes a clean installation. Bundled playback also depends on decoding readiness. Flight deliberately waits rather than emitting an oscillator while its sample loads.

## Recordings exist, but activation hooks still need work

Jetcell activation still uses zap/power audio in `src/engine/game.js`; no verified replacement was selected in this bounded pass. Flashbang detonation now uses confirmed `gear-flashbang` IMPACT through the `flashbang-detonate` SoundLibrary cue, retaining its zap plus impact fallback. Personal shield absorption now emits `shieldpack-hit` using confirmed `gear-shield` IMPACT at the actual positive shield soak in `Fighter.takeDamage`. Both preserve chosen recordings and explicit source preferences; shield activation remains a distinct cue.

Other requested wiring families such as impacts, blades, distant fire and vehicle lifecycle sounds require separate current-call-site audits; this report makes no blanket claim that they are absent or complete.

## Verification boundary

`tools/flight-audio.test.mjs`, `tools/flight-guard-recordings.test.mjs` and `tools/sound-library-recordings.test.mjs`: 21 tests passed after the flight/guard integration. They cover imported hashes, manifest identity, decode gating, authored preferences, hysteresis and cleanup. FFprobe verified the 16-second flight and 0.45-second guard-break files. These are structural/runtime checks, not an assertion that every sound has passed a listening review in a full match.

`tools/gadget-activation-audio.test.mjs` plus `tools/medkit-audio.test.mjs`: 14 tests passed. Actual item activation preserves jamming duration/shield HP, spends one charge, plays exactly one selected sample or the original fallback, and stays silent for spent/cooldown/no-powers rejection. Imported gadget hashes and preload membership are checked.

`tools/flashbang-shield-audio.test.mjs` plus SoundLibrary recording tests: 12 passed. Covers recorded/fallback flashbang paths, spent silence, shield full/partial absorption, overflow, true-damage bypass, no-shield silence, exact confirmed IMPACT source hashes and user source preferences.

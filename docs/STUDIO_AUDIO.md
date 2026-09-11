# Audible combat rehearsal

In Character Studio, choose **Beam sequence**, **Attack sequence**, or **Melee sequence**, click **Sound off** to enable sound, then **Play**. Sound is opt-in each page load. The first enable prepares the existing local recorded sample bank; no service or account is required. The character, attack costs, contact and sound calls are the native engine's, driven by a scripted rehearsal rather than AI.

Pause, mute, seeking, reset and character replacement retire active loops and disconnect old one-shot output routes. Resuming a held beam restores its voice on the next live update, never by replaying historical events. Source nodes finish normally; decoded recordings remain cached. Disposing Studio closes its dedicated AudioContext. This does not change the game's own mixer.

The **Effects → Sound & dialogue brief** dialog lists 21 cue/lifecycle entries and 14 original, unrecorded personality-line candidates. Each entry states the attack type, phase, playback behavior, event timing, sonic direction and current native or direction-only status. Charge, launch, sustained beam, accepted Fighter/defense contact, proposed cover-contact audio, explosive detonation, block, deflection and shutdown are separate instructions. Export creates `lsw-sound-direction-v2.json`, preserving the original cue IDs and event/method/source/direction field names while correcting their native descriptions.

The collapsible **Beam reference sound directions** section contrasts a narrow focused beam with a heavy pressure beam across charge, release, sustain, impact and shutdown. These are production directions derived from the user's two stills, not inferred source-game audio, new runtime presets or installed recordings. Nanite fracture/reform sounds are explicitly marked unproduced. The export is a production brief, not an importable sound/voice pack.

## Current boundaries

- Existing local recordings are used through `AudioBus`; native DSP fallback remains available if a recording cannot load. Attribution remains in `docs/AUDIO_SOURCES.md`.
- Motion-only flight/walk previews do not yet emit footsteps or flight ambience. Combat rehearsal has strike, energy, construct and weapon cues already emitted by those native paths.
- The nanite rehearsal can reach a finite-HP KO; it does not synthesize victory or perform the dialogue candidates. Generic existing pain/effort recordings are not character-specific dialogue.
- Bespoke nanite granules, shield fracture/reformation and character speech remain audio-production work. The user's future “AAI” service is not connected; its identity/access is pending. No purchases or synthetic performer imitations were made.
- Beam contact pulses currently belong to positive accepted Fighter damage or local metal contact, not every reached surface. Ordinary wall/construct cover damage is native, but its dedicated contact audio is still an open integration; `beam-cover-contact` is explicitly direction-only.
- Native source lists distinguish active playback from catalog availability: heavy punches use punch recordings plus haymaker-only `land.flesh`/`hit.soft`, not an explosion layer; firearms use `gun.crack` plus weapon-profile DSP, not the unused `gun.light` catalog entry; `blast` selects `ki.blast`. Landing sources include material-dependent rubble and generated energy sound.
- Sound enable/mute is transient tool state, not a saved character gameplay stat.

## Evidence

`node --test tools/studio-audio.test.mjs` checks gating, lazy loop resumption, one-shot route retirement, disposal races and failure fallback. `node tools/studio-audio-browser.mjs` checks actual AudioContext signal (not just method calls), decoded local recordings, silence after pause/scrub, resumption, mute, native melee, hero replacement and cue export. Artifacts: `artifacts/studio-audio/`.

September9 v2 brief: `node --test tools/audio-cues.test.mjs tools/studio-audio.test.mjs tools/studio-profile.test.mjs tools/character-package.test.mjs` passed35/35, no skips; build280modules passed. `tools/audio-cue-brief-browser.mjs` verified actual dialog descriptions, both beam families, downloaded v2 JSON, no autoplay and390px layout (document390/390, dialog356/356) with zero app errors. Desktop/mobile images in `artifacts/audio-cue-brief/` were inspected. The harness explicitly answers the existing missing favicon with204; this is not an application favicon fix. Four metadata REDs plus a real dialog RED preceded implementation; no audio runtime was changed.

Independent source review then corrected native heavy/gun/blast/landing mappings and separated the unimplemented cover-contact sound. Six additional native-method/metadata REDs and the real downloaded count20→21 RED preceded those metadata-only changes. The same focused command now passes41/41, no skips (31,430.3698ms); build280modules passed5.93s. The repeated real dialog/download browser passes21 entries,2 beam directions, no autoplay, document390/390 and dialog356/356 with zero app errors. Review and correction details: `docs/reports/2026-09-09-audio-brief-review.md`. The actual cover-contact audio gap remains open; no AudioBus or combat sound behavior was changed.

# Height-aware combat audio

Observed defect: AudioBus.listen and _pg only measure X/Z; a fight hundreds of units above the player sounds as close as a fight at their feet. SampleBank routes all recordings directly to the bus, so moving an opponent across the camera does not move their sound. Four charge creation paths also omit caster position.

## Contract

- Keep the player's body as the distance listener, not the pulled-back camera. Add Y and a normalized camera-right axis. Existing two-argument listen calls remain supported; absent orientation keeps centered audio. Invalid listener data cannot poison AudioParams; invalid emitters are safely silent.
- Recorded positioned one-shots receive conservative camera-relative equal-power stereo placement (maximum 0.85, softened within 12 units), retaining existing reach, bus levels, family choice, randomness and cold-cache fallback contract. UI/unpositioned events remain centered. One-shots snapshot their launch position; no per-frame retained-node registry.
- Recorded sustain handles continuously refresh both gain and pan, using the existing live world-position references and set/ramp adapter. Initial attack ramp respects distance; no full-volume out-of-range onset. Muted handles go quiet; invalid rate/intensity/reach never throw; stopped handles do not restart. Dispose/disconnect on source end, retaining watchdog and idempotent stop.
- Game supplies listener height and camera right after input look is applied and after final camera movement. No camera behavior, map, roster or combat timing changes.
- Charge creation passes caster position. Studio stays silent by default. This does not add sound file import, per-attack audio authoring, HRTF front/back/elevation localization, occlusion, Doppler, or stereo DSP fallback; do not claim those.

## Work and evidence

Runtime worker owns core/audio.js, core/samples.js and focused Node tests. Root owns game/abilities integration and real WebAudio browser checks. Preserve all unrelated dirty work. No concurrent browsers or source editing during browser gates.

RED/GREEN: horizontal/vertical equal distance, invalid values, legacy listen, rotated/pitched right axis, centered UI, recorded loop movement/muting/stop/watchdog. Real OfflineAudioContext channel-energy tests using checked-in recordings, plus actual production game listener/charge routing. Fresh focused combat/editor and build checks afterward. Automated channel measurements are not a listening-quality verdict.

Status: implemented; focused tests and independent review pass. Worker first RED reproduced 9/10 failing contracts, then 11/11 passed. Root listener and five charge paths reproduced 6 failures before passing. Independent mix review found a 3.01 dB centered-mono attenuation regression; a real legacy-route comparison reproduced energy ratio 0.495. Mono-only normalization now preserves the original centered mix (never boosts stereo buffers or mono fallback), with four additional RED/GREEN unit cases. `npm run test:audio-spatial` passes 21/21 Node tests plus actual checked-in recording renders: direction, rotation, centered legacy mix, height, live-loop movement/mute/stop and real game listener/charge routing. Results: `artifacts/audio/spatial-results.json`. Build passes 217 modules; broad camera/combat/editor refresh is ongoing.

Limits remain explicit: distance listener is P1's body, not a two-player centroid. Only recorded samples receive stereo placement; DSP fallbacks stay centered, with their prior synth-sustain distance behavior. One-shots snapshot their start and do not follow after launch. This is not HRTF, acoustic occlusion or a subjective listening-quality score.

Final refresh: production build 217 modules; full `test:camera`, `test:combat`, `test:flight`, `test:progression`, `test:interception` and `test:examples` all pass. Combat includes 53 kits × 7 checks, world 42/42 and a 30-second eight-fighter soak with 1,225 hits / 11 KOs and no invalid states/errors. Final real audio center/legacy energy ratio 1.059 (normal independent sample pitch jitter), zero page/console errors. No production edits followed these gates.

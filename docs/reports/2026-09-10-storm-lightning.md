# Storm reference implementation — local checkpoint

Try `http://127.0.0.1:5180/powerworld.html`: Lighting **Night**, Weather **Storm**, then **Free practice**. Clear remains the default; weather builds gradually after entry. This checkpoint is not deployed.

## Reference and changes

The creator's 17.6-second Unreal clip shows cold white discharge pulses illuminating clouds, ground and the character against a dark blue-green ceiling. The roll around 9.2–9.9 seconds keeps the camera level. It does not demonstrate prone rolling or crouched leaning. ffprobe found no audio stream; thunder timing is our design, not something inferred from the clip. Detailed observations: `docs/reference/STORM_ROLL_REFERENCE.md`.

- Replaced the flat overcast veil with two drifting density scales in the existing sky draw. One 256-square RGBA density atlas per stage; four filtered reads, no ray marching or transparent cloud-object swarm. Night and day use the same cloud structure with different illumination. This is a projected cloud ceiling, not a volumetric atmosphere.
- Clear's 0.05 cloud baseline no longer dims the approved clear-day lighting.
- New reusable cloud-to-surface lightning: a white irregular main path, small branches, three diminishing return strokes, local pooled light and cloud/character illumination. No screen-white overlay. OS reduced-motion preference uses a single soft pulse.
- Endpoints sample terrain and intact registered shelter envelopes, including elevated roofs. Removed cover stops blocking. One reusable strike, 42 rendered cylinder instances per core/glow layer, no growth in the 14-light pool. Light lease checks prevent a retired strike from turning off another effect's borrowed light.
- Natural Storm is atmospheric, without surprise damage. A weather-controller's damaging strike has an 0.85-second amber ground warning and applies damage once after the warning. This ownership path is unit-tested; a native player-controlled weather attack has not been visually accepted in this pass.
- Rain and delayed thunder are connected to the existing Sound Library with generation briefs, synthesized placeholders and replacement bindings. Rain is a single owned ambient loop, reduced under registered shelter. Pending thunder and playing thunder are canceled when weather clears; reset/disposal stops owned loops. The browser confirmed running native audio routes, not subjective audio mastering.
- Added Storm to native match setup. Starting a match previously overwrote the title's environment preferences; the shared bootstrap now preserves those fields. Post-match reload retains Storm. Mobile options remain at least 44px high and fit at 390px width.

## Verification

`node --test tools/sound-library.test.mjs tools/sound-library-spatial.test.mjs tools/weather-lightning.test.mjs tools/weather-rain.test.mjs tools/daylight-presets.test.mjs tools/powerworld-cover.test.mjs`: **35 passed**.

`node tools/weather-lightning-browser.mjs`: normal menu -> Night/Storm -> Practice -> three native strikes -> audio observation -> reload at 390x844. No camera, pose, strike timing or simulation overrides. Three strikes each used 42 segments and kept 14 pooled lights. One active rain loop plus delayed thunder. No page/console errors. Storm selection persisted after match/reload. Build passed: 373 modules, 7.29s; existing 8.52MB shared bundle warning remains. Diff whitespace check passed. UI detector only flags the unchanged roster accent border.

Artifacts: `artifacts/weather-lightning/results.json`, `native-strike-0.png`, `night-storm-rest.png`, `final-sequence-03.png`, and final native video `page@63d4f78a464e384efa86b0dd19c80098.webm`. The Playwright video is silent; runtime audio evidence is the event/handle trace. Earlier cloud-only 1364x636 foreground runs on RTX 4090 showed 4.2ms median RAF cadence, but these were short idle runs with varying adaptive resolution—not a final storm or crowded-combat GPU benchmark.

## Rejected / failed iterations

The first cloud pass looked streaky; the next had excessive domain-warp wrinkles, especially during flashes. Both were rejected in self-review. Reduced warp and broader clouds now give a calmer ceiling. First bolt paths zigzagged too widely; correlated path steps replaced independent large offsets. Earlier videos remain in the artifact folder (`page@3fa...`, `page@371...`).

The first complete reload test failed: Storm reverted to Clear. Trace identified `boot.savePrefs()` replacing the title's shared preference record with four loadout fields. The fix preserves the record, and the same native reload assertion now passes. Failure video `page@7c261d582adb17b2152fc6a27036600a.webm` remains. Unit tests initially failed on missing strike/audio wiring and immediate untelegraphed damage before implementation.

## Still open

- Prone Q/E lateral rolls and crouched Q/E leaning, including collision, weapon placement, cover-safe firing, input consumption and camera stability.
- A bounded tornado lifecycle and a distinct regional hurricane with shelter/calm-eye behavior. Existing named hurricane data is not that completed gameplay system.
- More convincing cloud volume and light scatter, wet surfaces, rain splashes, distant reporter-view rain coverage, native damaging-strike visual proof, physical-phone and crowded-combat performance, and audio listening/mixing review.
- No changed aircraft scope, no deployment, no visual 10/10 claim, and no completion of the broader active goal.

Dream-loop self-review guided the cloud/bolt corrections. No final judge submission: major requested weather/movement behaviors remain incomplete.

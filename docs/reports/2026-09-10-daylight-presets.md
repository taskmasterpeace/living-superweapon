# PowerWorld daylight presets — local implementation

## Delivered

Match setup now offers Day / Sunset / Night. Day remains the default. Selection persists in PowerWorld preferences and is passed through both normal entry and the expanded character picker. Keyboard focus remains on the chosen button; touch targets are 44px high. No gameplay HUD surface was added.

The native daylight owner applies the key, hemisphere, ambient and rim values. The HDR sky blends toward the procedural sunset/night sky and environment illumination changes with the selected preset. Late HDR loading respects the selected preset. Golden-hour ambient/rim colors reset each frame rather than accumulating warmth. Closing the stage restores its caller's clock, preset, light colors, sky and environment.

## Verification

- `node --test tools/daylight-presets.test.mjs tools/frontline-lighting.test.mjs tools/powerworld-cover.test.mjs`: 15 passed.
- `node tools/daylight-presets-browser.mjs`: native menu selection, persistence/reload, all three Practice launches, keyboard activation/focus and 390px mobile fit passed; zero page errors.
- Native screenshots reviewed: `artifacts/daylight-presets/{day,sunset,night,desktop-setup,mobile-setup}.png`. No camera or simulation overrides. Initial sunset had a violet cast; the final pass uses a warmer horizon and neutral/cool zenith.
- `npm run build`: passed, 370 modules, 10.70s. Existing 8.51MB shared chunk warning remains.
- `git diff --check`: passed. Impeccable detector identified only the existing roster-card accent border, outside this change.

## Limits and next

This is fixed match lighting, not a continuous day/night simulation. Night preserves playable ground/hero visibility; distant terrain materials and haze still need a broader nighttime art pass. Existing daylight shadow direction is unchanged. These captures verify setup and rendering, not nighttime combat balance or performance on a physical phone.

Next approved order: terrain-correct rain, useful telegraphed lightning, one bounded tornado. Aircraft expansion stays deferred. CMU human motion, anyCreature creatures and img2threejs props remain authoring-pipeline pilots, not imported production assets. Follow `2026-09-10-authoring-branch-handoff.md` for isolation and acceptance criteria.

This change is local, not a production deployment. The overall game goal remains active.

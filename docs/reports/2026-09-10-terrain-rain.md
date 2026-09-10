# Terrain-relative rain — local checkpoint

Implemented Clear / Rain in PowerWorld match setup, persisted alongside Lighting. Native rain uses one reusable 1,400-streak buffer, camera-relative altitude and bounds, wind travel and slanted streaks. Exact gameplay heightfield samples and nearby cover/interior envelopes clip rain above terrain and shelter. Destroyed cover is excluded. No scene triangle raycasts are used. Weather reset now clears intensity, ownership, timers and geometry rather than recreating old rainfall in the next match.

Cloud amount reaches the native lighting owner and a simple HDR overcast veil. **This is not yet the dense, layered cloud ceiling the creator's new video requires.** The new reference supersedes this interim sky treatment as the visual acceptance target.

## Evidence

- `node --test tools/weather-rain.test.mjs tools/daylight-presets.test.mjs tools/powerworld-cover.test.mjs`: 18 passed.
- `node tools/weather-rain-browser.mjs`: native menu selection/persistence -> Practice -> Space ascent past 300u -> forward movement -> Clear launch; mobile keyboard activation/focus and fit. Zero page errors. Final flight sample was 276u after movement, not 300u.
- Ground and flight snapshots each contained 1,400 visible streaks, zero heads below terrain or inside registered roof proxies, and all inside the sampled camera-local bounds. Unit checks include both streak endpoints, sloped terrain, intact/cutaway roofs, removed cover and camera jumps to 5,000u.
- 1,000 foreground Weather.update samples: median 0.2ms, p95 0.3ms, max 0.8ms. 1440x900, pixel ratio 1 in final sample. **CPU weather update only**, not a whole-game or GPU frame-rate claim; browser renderer label was generic WebKit WebGL.
- Build passed, 371 modules; existing shared bundle warning remains. Diff whitespace check passed. UI detector only flagged the pre-existing roster accent border.
- Captures and videos: `artifacts/weather-rain/`; final ground/high-flight/mobile images reviewed. Earlier missing-menu test intentionally failed before wiring the UI. First runtime pass lacked enough sky dimming; later pass added a veil but still lacks cloud structure. The final ground capture includes an attack; it is not a clean idle appearance comparison.

## Remaining

Dense animated cloud cover; reference-inspired lightning; tornado and hurricane behavior; requested prone rolls/crouched leans. Splash placement, wet-surface materials and dedicated rain audio are not delivered in this checkpoint. Shelter uses registered gameplay envelopes, not exact roof mesh triangles. Camera-local rain belongs to the player view; independently distant reporter views need separate coverage handling. Physical-phone performance and crowded storm combat are unverified.

See `docs/reference/STORM_ROLL_REFERENCE.md` for the new visual/behavior targets. Local checkpoint only, not deployed.

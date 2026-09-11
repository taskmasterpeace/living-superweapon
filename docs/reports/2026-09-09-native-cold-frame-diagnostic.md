# Native cold-frame diagnostic

September 9, 2026. Read-only runtime diagnosis; no production rendering change or performance-completion claim.

## Reproduction

`tools/nanite-cannon-browser.mjs` now records unusually long native simulation/render submission intervals and shader-program count changes. Optional `LSW_NANITE_PROFILE=1` captures a Chromium CPU profile of the first actual input sequence. Output can be isolated with `LSW_NANITE_OUT`; the previously shown successful reel was not overwritten.

Both runs use installed full Chromium, Windows, RTX 4090 / ANGLE D3D11, 32 reported logical processors, visible document, 1280×800, DPR1. The default Playwright headless shell instead used SwiftShader; that separate capture problem is already diagnosed. The normal game renderer, correspondent, native input, physics, damage and scene remain active. Test callbacks seed positions and a stationary target, not an AI encounter.

## Unprofiled timing evidence

`artifacts/nanite-cannon-cold-diagnostic/results.json`:

- First 4.416667s simulated input sequence took 5.3711s recorded wall time; capped intervals dropped .9292s. Initial frame spent 237.9ms in native update and 222.4ms submitting rendering; program count rose 58→66.
- Simulation frame14 spent 667.5ms in native update, with program count66→72. The long interval is inside the native update path, not necessarily physics: this path also captures the correspondent's view.
- Warm repeat took 4.4606s for the same4.416667s simulation with no dropped capped interval, but its initial update still took53.4ms and rendering9.9ms. “Zero dropped wall time” is not “no hitch”; this recorder only drops intervals above100ms.
- Both actions produced one valid radius1.8/direct64 shot, zero finite-radius launch-center error, approximately .005501° axis error, native target HP loss106.79277 and zero browser errors.

These are instrumented capture observations while other development checks may be running, not a clean hardware benchmark or a claim that perceived responsiveness is approved.

## CPU profile evidence

`artifacts/nanite-cannon-profile/cold-native.cpuprofile` and its companion results record a separate profiled repeat. Profiling itself changes timing; do not compare its total duration as a performance score.

Aggregating CPU-profile sample deltas found approximately1,977.1ms exclusive time in four `getProgramInfoLog` stack locations. One1,127.7ms location is under:

`Game.update → NewsCrew.update → _captureFrame → _renderPOV → WebGLRenderer.render → setProgram → WebGLProgram.getUniforms → onFirstUse → getProgramInfoLog`.

The correspondent update accumulated approximately1,632.7ms inclusive; its `_renderPOV` accumulated1,180.8ms. The ordinary World/composer rendering path also contains first-use shader waits. These stacks substantiate synchronous first-use shader/program completion as a major source of the captured hitch, rather than just inferring it from a slow recorder.

## Source inspection and next gate

- `src/boot.js` calls `world.prewarm()` once during boot. `src/engine/world.js` prewarms a small synthetic material set, before later custom actors/attachments and all their material variants exist.
- `NewsCrew._renderPOV` uses the **same renderer**, temporarily targeting the default canvas, while the normal composer uses an HDR target. It does not have a second WebGLRenderer. Target/output and visible material variants must be considered during any warmup correction.
- Do not disable correspondence, omit real scene captures, turn off shader-error checks, or lower the game quality simply to hide the stall. Do not claim all cold-start cost is explained by these samples.
- A later bounded fix needs real installed Three169 compile/async behavior inspection, boot/match/form lifecycle ownership, both ordinary/composer and correspondent variants, and cold browser validation. No extra simulation, duplicate attack, hidden warmup damage/audio, leaked temporary material, stale match callback, or permanently blocked input is acceptable.
- Preserve both cold and warmed results, and separate simulation CPU, render submission and true GPU timing if measured. Eight-Fighter steady-state tests are a different gate.

Game Studio's playtest/performance guidance informed native execution, GPU identification and the distinction between deterministic action proof and a frame-time claim.

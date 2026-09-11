# Native renderer prewarm preflight

Date: 2026-09-09. Status: **proposal only; not implemented or benchmarked**.

**Goal:** move known first-use renderer work into an explicit preparation boundary without changing combat, the correspondent, camera, diagnostics, or quality.

**Architecture:** one preparation coordinator on the existing World/WebGLRenderer; compile the actual scene/material families for both existing output paths, then perform bounded render-only preparation. No second Game, alternate match, simulation clock, or renderer/context.

**Tech stack:** native JavaScript/Three.js; installed Three **0.169.0** (`node_modules/three/package.json:3`), declared `^0.169.0` (`package.json:92`). Version-specific readiness access below requires a compatibility guard, not an assumption that the dependency is pinned.

**Evidence/spec:** `docs/reports/2026-09-09-native-cold-frame-diagnostic.md` and the parent’s bounded preflight request. Preserve all native effects, shader-error checks, correspondent capture, audio, BFP camera, traveling beams, quality settings and pooled-light ownership. No implementation, dependencies, or other files changed in this preflight.

## Observed facts

The diagnostic records a cold initial update/render submission of **237.9/222.4 ms**, then a **667.5 ms** native update at frame 14. Program counts grew **58→66→72**. Its separate CPU profile attributes substantial waits to `getProgramInfoLog`, including the actual `Game.update → NewsCrew.update → _renderPOV` default-canvas path. The repeat still contains a **53.4 ms update / 9.9 ms render submission** despite no >100 ms dropped capped interval. These are prior captured observations, not new measurements or proof that every remaining hitch is a shader wait.

| Native seam | Current source evidence and consequence |
| --- | --- |
| Boot | `src/boot.js:72–80` constructs Game and calls `world.prewarm()` **before** applying saved settings; customs and Studio profiles are installed later at `:380–381`. The early call cannot cover a later resolved custom figure/theater/settings combination. |
| Existing warm set | `src/engine/world.js:3136–3150` creates seven generic mesh/line/sprite material cases, synchronously compiles the scene, then removes/disposes them. It does not draw the composer, instantiate selected actors, or await texture loading. |
| Program lifetime | `WebGLRenderer.js:711–730` releases a disposed material’s programs; `webgl/WebGLPrograms.js:588–634` shares by cache key and destroys a program when its reference count reaches zero. Disposing synthetic owners is **not a durable warm cache** for variants no real material retains. Driver caching may still help, but cannot be promised. |
| Actual match | `src/boot.js:184–217` resolves/rebuilds theater then calls `startMode`; `src/engine/game.js:1969–1995` resets, creates actual actors/mode objects and sets running. `addFighter` at `:1682–1687` constructs and registers the real Fighter. Warm this actual result once; do not run setup twice. |
| Late appearance | `src/engine/entity.js:542–613` synchronously builds/replaces a form’s figure while preserving its authoritative root and gameplay; retired resources have the existing borrower-aware release path beginning `:617`. Preparation must not delay or replace this lifecycle with an asynchronous actor swap. |
| Final materials | `src/engine/figure.js:448–449` builds nanites then installs foreground visibility. `foreground-visibility.js:13–18` wraps the existing shader hook/key. Compile **after** this final composition, not an earlier generic suit material. |
| Source skin/assets | `hero-skin.js:16–17` lazily starts the real eye texture load; `:21–43` installs the source-suit shader; `:139–153` creates real SkinnedMeshes. CPU bank data being present does not mean this image has decoded/uploaded. |
| Dynamic families | `nanite-forearms.js:97–130` uses one Standard material on ordinary cuff/saddle and InstancedMesh hull/fragments, plus a Basic vent material; roots start hidden and instance counts at zero. `particles3d.js:44–58` owns a genuine custom Points shader with an initially empty draw range. `energy-burst-material.js:5–18`, `beam-surface.js:8–20,32–76`, `figure.js:409–410` add distinct shell/beam/aura hooks. Generic Basic material is not equivalent. |
| Fixed lighting | `src/engine/vfx.js:38–53` creates fourteen permanently visible pooled point lights; borrow/return changes intensity only (`:65–70`). Preserve the actual scene’s light/shadow configuration rather than constructing a miniature scene with different light counts. |
| Two outputs | `world.js:1293–1305` uses HalfFloat MSAA HDR → RenderPass → bloom → OutputPass → PrintPass. `newscrew.js:598–633` instead renders the actual scene to **target null**, with its own camera, viewport/scissor and visibility rules, then restores renderer/scene state. |
| News lifecycle | `newscrew.js:157`, `:392–411`, `:481` show `_warmed` also gates initial crew placement. `update` advances time and can start a highlight (`:375–408`); `_captureFrame` encodes/records (`:589–596`). Neither is a prewarm API. Do not set `_warmed` to suppress the real first update. |

Three file anchors above are under `node_modules/three/src/renderers/` unless an explicit native path is given.

## What installed compileAsync actually covers

`WebGLRenderer.js:936–1024` gathers lights from the supplied target scene and traverses renderable objects, including hidden objects, to prepare material programs. Passing a new render root with the **real Scene** as `targetScene` preserves fog/environment/lights. Object flags matter: `WebGLPrograms.js:202–211,301–329,376–462` keys output, instancing, skinning, morph attributes, maps, fog, light/shadow counts and custom hooks.

The same Standard material needs distinct **default-canvas** and **ordinary offscreen HDR** programs: `WebGLPrograms.js:165–171,202` selects renderer tone mapping/output color space for target null, but NoToneMapping/LinearSRGB for an ordinary render target. Use the actual composer target and actual news camera; a tiny arbitrary offscreen target does not cover the default-canvas shader variant. Camera/lighting layers and shadow configuration must match the native paths too.

`compileAsync` (`WebGLRenderer.js:1032–1092`) calls `compile` synchronously, then polls `materialProperties.currentProgram.isReady()` every 10 ms. With KHR_parallel_shader_compile it can wait for link completion without the first-use blocking query. Without the extension, `WebGLProgram.js:1048–1058` reports readiness without guaranteeing completed background work; the initial 10 ms delay is not a no-hitch guarantee. Shader creation and custom `onBeforeCompile` work can still take synchronous CPU time.

Important limitations:

- It waits the **current** program per material, not every program the material acquired. One nanite material on ordinary and instanced meshes is a native discriminating example; transparent DoubleSide preparation also generates multiple programs (`WebGLRenderer.js:914–931`). Serialize output jobs, and do not assume one material means one program.
- No abort parameter or timer cancellation exists. Disposing a material while its promise polls can remove the `currentProgram` it reads. `Promise.race` with a timeout only abandons the consumer; it does not stop Three’s polling or make disposal safe.
- Program preparation does not perform the first-use uniform/attribute work: `WebGLProgram.js:920–1038` lazily runs shader diagnostics and queries uniforms/attributes. Keep diagnostics enabled. It also does not draw/upload the actual scene buffers, bone/morph textures, shadow passes, or postprocessing chain.
- `OutputPass.render` itself assembles its output/tone-mapping defines (`examples/jsm/postprocessing/OutputPass.js:45–73`). Scene compile alone does not reach that fullscreen pass, bloom or PrintPass. `renderer.initTexture` / `initRenderTarget` (`WebGLRenderer.js:2784–2811`) can initialize **available** resources, not load missing assets or warm future geometry allocations.

## Recommended bounded sequence

### 1. Establish one visible preparation boundary

After saved settings and character/profile resolution, prepare the existing boot scene. At normal match entry, run actual theater/mode/actor setup **once**, then keep an explicit loading/preparing presentation until its renderer preparation settles or visibly falls back. Do not advance `Game.update`, `Fighter.update`, abilities, NewsCrew, particles, soundscape or input-driven attacks inside preparation. At release, reset the existing frame timestamp so loading wall time is not replayed as simulation time or charged to the adaptive-quality governor.

This is a gate around first presentation/input dispatch, not a second mutable match. A generation change/menu/cancel supersedes it. Preserve the regular mode/news initialization and opening flow. Future live rival/form creation remains synchronous; only already known render families can be warmed in advance. An unseen imported material/texture cannot honestly be declared prewarmed before it exists.

### 2. Compile the exact two output families, retaining useful owners

For each resolved scene generation, synchronously select the actual HDR target, call `renderer.compile(actualRoot, mainCamera, liveScene)`, and restore render target/cube face/mip in `finally` **before yielding**. Repeat for target null/news camera as a separate job. Never leave global renderer state changed across an await.

Use the final actual figure roots, including hidden nanite meshes and source skin, rather than cloning an entire Fighter or invoking attacks. Retain a small renderer-owned catalog for transient shader families that otherwise lose their last owner: source factory-created shell/beam materials, mapped sprites, the real Points signature and ordinary/instanced nanite signatures. Reuse exact hooks/keys and object attributes; plain `Material.clone()` is not sufficient to preserve custom callback composition (`Material.js:426–430` onward). No Projectile/BeamHose constructors, borrowed lights, particle spawning, or attack methods to manufacture warm examples.

Proposed initial limits: **one active preparation job, one coalesced pending request, at most 24 render-only representative owners**. This is a catalog bound, not a cap on real actors or their quality. Include only active loadout/common families; report overflow/unseen variants as not prepared instead of silently dropping effects. Representatives own only their own materials/geometry/instance buffers; borrowed native geometry, textures and skeletons retain native ownership. A retained representative keeps its warmed programs alive; dispose it exactly once at eviction/context teardown, not immediately after compiling it.

### 3. Make readiness cancellable without a dangling Three promise

Do **not** deploy bare `compileAsync` against disposable actors. The smallest cancellation-safe proposal for this installed revision is a narrowly isolated readiness adapter: use public `compile` for setup, snapshot distinct program references exposed by `renderer.info.programs` immediately afterward, and poll their installed `isReady()` method from the existing preparation pump. This mirrors the useful KHR readiness stage, but checks **all captured programs**, not mutable `material.currentProgram`.

This `isReady` access is **version-specific, not a stable Three public API**. Feature/version guard it and test it explicitly; do not modify Three or duplicate shader generation/cache logic. If unavailable or KHR is absent, use the explicit loading-time render fallback and report that readiness could not be asynchronously established. No promise that fallback is nonblocking.

Each job carries renderer-context generation, match `_gen`, request serial, and any relevant actor/root/form identity. Cancel the coordinator’s pending callback/list synchronously before resource retirement; skip deleted programs and invalidate the job rather than declaring them warmed. A timeout stops polling and leaves a reported incomplete result. Shader work already submitted to the driver cannot be canceled, but no timer, scene mutation, capture, or actor publication may follow cancellation. On context loss, invalidate everything; restoration starts a new readiness generation. A match reset alone does not destroy renderer-owned common representatives. Existing `Game.clearTransients` generation retirement (`game.js:1770`) is a useful signal, not sufficient context/form identity by itself.

If use of the guarded program readiness method is not approved, retain only the synchronous compile + visible render-preparation fallback. Do not claim fully cancellable `compileAsync` by wrapping it with a timeout.

### 4. Separate actual render preparation from shader readiness

Under the preparation cover, initialize loaded textures and actual render targets, then perform a bounded **render-only** HDR/composer pass and default-canvas POV pass. Use `composer.render(0)` rather than `world.render()`: the latter advances wildlife, day/night, presentation clocks, print decay and the adaptive governor (`world.js:2335–2393`). Composer accepts explicit zero delta (`EffectComposer.js:108–154`). A cold composer render may itself stall; charge that interval to visible preparation, not hide it from evidence.

The existing `_renderPOV` is a usable lower render seam: it draws/overlays but does not itself encode a frame. Keep its normal state restoration and do not call `_captureFrame`, `highlight`, `NewsCrew.update` or modify `_warmed`. Its current camera can warm shader families even before initial crew placement; that is **not** evidence that the eventual first real POV view uploaded every object it will see. Finish with the normal main output so a news viewport is never left displayed.

Hidden/count-zero nanites and empty Points require explicit render-only representatives to exercise first-use draw setup; shader compile alone is not proof of a draw. Use bounded owned buffers with the genuine material/attribute/instancing signature; do not alter deployed state, cell HP, particle lifetimes or native draw counts. Such a representative warms programs but **not the allocation/upload cost of every future unique buffer**. Actual selected visible skin geometry and its skeleton must receive a real draw. Keep shadows enabled so the native depth/skinning shadow variants execute too; readiness of color programs alone does not cover them.

Snapshot/restore render target, cube face/mip, viewport, scissor/test, clear state, shadow auto-update and temporary sky/visibility changes; restore composer read/write buffer roles if preparation swaps them. Do not tick PrintPass. Existing render callbacks in `projectiles.js:887` and `flight-wake.js:33` update presentation values: this preparation belongs before live transient attacks, not in an arbitrary paused combat frame where a warm render could consume/change presentation state.

### 5. Native evidence gates before any performance claim

Add focused future coordinator tests (suggested command after implementation: `node --test tools/native-prewarm.test.mjs`) proving cancellation/reset/context loss/dispose ordering, one active job, bounded owners, both output targets, ordinary+instanced shared-material readiness, unavailable KHR fallback, and no stale callbacks. Assert zero change to HP/ki/cooldowns/positions/velocities, match/news time, clips/encoder requests, particles, live ordnance, cell HP, sounds and existing quality state across preparation. Test form replacement/removal and repeated match cycles; native owners must remain usable and retired objects must not be resurrected.

Browser acceptance must retain the original cold path. Extend the existing native harness with separately reported preparation intervals and the **first real** correspondent update/POV/capture, rather than interpreting a prewarm draw as that frame. Record active renderer/GPU, KHR support, visibility, resolution/DPR and unchanged quality/shadow/post settings. Use fresh Chromium browser processes/contexts for at least three cold trials; disclose that this still does not prove a cleared operating-system/driver shader cache. Repeat the exact sequence warm in the same context.

Existing reproduction entry point (future run; not executed in this preflight):

```powershell
$env:LSW_TEST_URL='http://127.0.0.1:5180'
$env:LSW_NANITE_REEL='1'
$env:LSW_NANITE_OUT='artifacts/native-prewarm-cold-trial-1'
node tools/nanite-cannon-browser.mjs
```

The harness uses full installed Chromium (`:12`), records the cold native sequence separately before resetting for a warm repeat (`:138–149`), and can collect a **separate**, perturbing CPU profile with `LSW_NANITE_PROFILE=1`. Do not overwrite previous evidence or call the warmed recording a cold result.

Required output: preparation wall/CPU intervals; per-frame raw wall delta, native update, render submission and first-POV time; program creation/release and resource counts; >16.7/>33.3/>50/>100 ms frame counts/maxima; capped/dropped wall time; camera/quality parity; real projectile origin, travel, target damage and zero console errors. Show first action/first correspondent images and native motion/audio, not only a still or a successful hit. Include first selected source-skinned/custom actor, form replacement, hidden nanite deployment, particles/shell/beam first use, and repeated retirement cycles.

The known cold shader stalls should be absent from **playable** first-action/first-correspondent frames, with their work explicitly accounted for in preparation. Any new program/stall must be attributed or remain open. The warmed **53.4 ms update** remains a separate investigation gate: report it even if shader work moves successfully and >100 ms dropped time is zero. A residual >50 ms native frame precludes a blanket “no hitches” claim; quantify improvement without declaring all CPU work fixed. Preserve the real native hit/launch and audible sequence assertions throughout.

## Handoff boundary

Recommended implementation scope is a small World-owned preparation/readiness helper, boot/match-entry scheduling, render-family exposure from existing pure material/view factories, and focused tests/browser instrumentation. No alternate simulation, renderer rewrite, dependency upgrade, new assets, quality reduction, correspondent bypass or shader-diagnostic suppression. Late unknown assets, changed shader features/light topology, context restoration and future unique GPU allocations remain explicit cold-work boundaries until observed and prepared.

This preflight used the Three.js runtime/architecture/performance skill and writing-plans skill to separate render ownership from simulation and define measurable gates. Only this report was created; no runtime/test suite or browser was run for this planning task.

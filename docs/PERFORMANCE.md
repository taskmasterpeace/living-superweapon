# Living Superweapon — Performance Audit & Optimization Backlog

A full pass over `src/` (4,298 lines, 19 files) for performance and optimization issues, **ranked by
perceived impact**, each with the concrete fix and the benchmark metric that proves it.

> TL;DR of the baseline: the engine is fast on a strong GPU, but it carries **persistent, growing
> per-frame waste** (the particle buffer), **allocation churn that causes p95 hitches** (transient
> projectile geometry + per-frame `new`s), and a **heavy render pass** (497 draw calls, 134 shadow
> casters, 412 GPU geometries) that will punish weaker/integrated GPUs far more than the 4090 it was
> profiled on.

## How to measure

The game needs a real WebGL context, so the benchmark runs in the browser. It builds one deterministic
heavy scene (an 11-fighter rumble of volley + beam + summoner heroes, all forced to keep firing) and
decomposes the per-frame cost into **UPDATE** (sim CPU) / **HUD** (DOM + canvas) / **RENDER** (submit),
plus draw calls, shadow casters, GPU geometry/texture/program counts, particle high-water vs live, and
JS-heap growth. Render is stubbed during the CPU phase because `composer.render()` submits async GPU
work and is unreliable to time in a tight loop.

```bash
npm run dev            # then open the console on http://localhost:5180
```
```js
await window.LSW.runBenchmark()                    // 90 warmup + 360 measured (default)
await window.LSW.runBenchmark({ measure: 600 })    // longer, lower-variance sample
```
…or append `?bench` to the URL to auto-run and `console.table` the result. Source: `src/bench/benchmark.js`.

For stable heap numbers launch Chrome with `--enable-precise-memory-info`.

## Baseline (RTX 4090, 11-fighter saturated rumble, synchronous)

| Metric | p50 | p95 | mean |
|---|---|---|---|
| **CPU frame** (update+hud) | 0.6 ms | **10.1 ms** | 2.1 ms |
| update (sim) | 0.5 ms | 9.8 ms | 1.9 ms |
| hud (DOM+canvas) | 0.1 ms | 0.5 ms | 0.2 ms |
| render submit | 4.6 ms | 17.1 ms | 6.6 ms |

| Counter | Value |
|---|---|
| draw calls / triangles | **497** / 116k |
| scene meshes | 570 |
| **shadow casters** | **134** |
| transparent objects | 122 |
| GPU geometries / textures / programs | **412** / 19 / **112** |
| **particles peak vs live** | **6000 / 700** (48,000 floats uploaded **every frame**) |
| heap during run | a full GC fired mid-measurement (−53 MB) → churn |

The **p50 0.6 ms vs p95 10.1 ms** gap and the mid-run GC are the signature of allocation churn: most
frames are cheap, but garbage periodically triggers a GC that blows a frame. That's the felt "hitch."

## Ranked backlog

| # | Impact | Effort | Issue | Benchmark metric it moves |
|---|---|---|---|---|
| 1 | 🔴 High (persistent) | Med | Particle buffer: full 48k-float upload every frame; `n` never shrinks | update ms, particles.peakN, render |
| 2 | 🔴 High (hitches) | Low | Projectile/beam/bomb geometry+material churn (not shared) | memory.geometries, frame.p95, heap |
| 3 | 🟠 High (GPU) | Med | Shadow pass: 134 casters, 2048² map over a 440-unit frustum | render, shadowCasters |
| 4 | 🟠 Med (GPU) | Med/High | 497 draw calls / 412 geometries — per-part figure geometry never shared | memory.geometries, render, draw.calls |
| 5 | 🟡 Med | Low | 122 transparent objects; crack overlays always drawn (overdraw) | draw.calls, render, transparents |
| 6 | 🟡 Med (hitches) | Low | Per-frame `new`s (raycaster, Colors, intent objects, lightning attr) | frame.p95, heap |
| 7 | 🟡 Med (low-end) | Low | HUD rebuilds innerHTML + recomputes arrays every frame | hud ms |
| 8 | 🟢 Low | Low | Radar canvas fully redraws at 60 Hz | hud ms |
| 9 | 🟢 Low | Low | 112 shader programs → first-use compile hitches | memory.programs, spikes |
| 10 | 🟢 Low | Low | Misc: `getComputedStyle` per frame, fog per-fragment loop, dead code | — |

---

### 1. Particle system uploads the entire buffer every frame, and `n` only grows 🔴
**Where:** `src/engine/particles3d.js` — `update()` (≈L98–119), `spawn()` (≈L58–72).
**Evidence:** baseline `particles.peakN 6000 / live 700`, `bufferFloatsUploadedPerFrame 48000`.
`this.n` is a high-water mark (`if (this.n < this.max) i = this.n++`) that **never decreases**. Once a big
fight pushes it toward `max` (6000), every frame forever after: the sim loop iterates all 6000 (most dead),
and `attributes.{position,aColor,aSize,aAlpha}.needsUpdate = true` re-uploads the **entire** typed arrays
(6000·3 + 6000·3 + 6000 + 6000 = 48,000 floats) even when 700 (or 0) particles are alive.
**Fix:** (a) shrink `n` to follow live count — scan the tail down when particles die, or compact; (b) set
`attr.addUpdateRange(0, liveN*components)` (three r159+) / `attr.updateRange` so only the used slice uploads;
(c) early-out the whole update+upload when live == 0. **Moves:** `update` ms ↓, `render` ↓ (fewer points), heap.

### 2. Projectiles / beams / spirit-bombs create fresh geometry + materials per spawn 🔴
**Where:** `src/engine/projectiles.js` — `Projectile` ctor (L28–29), `BeamHose` ctor (L99–102), `SpiritBomb`
ctor (L202–203). Also `Minion`/`Construct` (`src/engine/summons.js` L16–17, L54–62).
**Evidence:** `memory.geometries 412`; `frame.p95 10 ms`; a full GC fired mid-run. Volley heroes (VEGA
Volley 0.07 s, SOL Heat Flurry 0.08 s, HIVE) spawn ~13 blasts/s each, every one `new SphereGeometry` ×2 +
2 materials, `.dispose()`d on impact → constant allocate/upload/free churn and GC pressure.
**Fix:** share module-level unit geometries (one unit `SphereGeometry`, one unit `CylinderGeometry`) across
**all** projectiles/beams/bombs — exactly like `VFX` already shares `_sphere`/`_ring`/`_decalGeo` — and scale
per-instance via `mesh.scale`. Pool or cache materials keyed by color. **Moves:** `memory.geometries` ↓,
`frame.p95` ↓, heap stabilizes.

### 3. Shadow pass: 134 casters into a 2048² map over a 440-unit frustum, every frame 🟠
**Where:** `src/engine/world.js` `_buildLights` — `sun.castShadow`, `sun.shadow.mapSize.set(2048,2048)`,
`shadow.camera` `d=220` (≈L56–64); `castShadow = true` sprinkled across `figure()` in `src/engine/entity.js`.
**Evidence:** `shadowCasters 134`, `render submit p50 4.6 ms`. The directional light re-renders 134 meshes into
the shadow map each frame; a 440×440 frustum at 2048² is ~4.7 units/texel — simultaneously **expensive and
low-res**. This is the single biggest GPU cost after the main pass and scales badly on weak GPUs.
**Fix:** (a) `mapSize` → 1024 (the huge frustum wastes the extra resolution anyway); (b) tighten the shadow
camera to the action area; (c) only let the main volumes cast (torso/pelvis/thigh/shin) — drop `castShadow`
on helmets/pauldrons/emblems/etc., cutting casters ~3×; (d) on the low quality tier, fall back to the
contact-shadow discs only. **Moves:** `render` ↓, `draw.shadowCasters` ↓.

### 4. 497 draw calls / 412 geometries — every figure part is its own unshared geometry 🟠
**Where:** `src/engine/entity.js` `figure()` — each `new THREE.CapsuleGeometry(...)`, `SphereGeometry`, etc. is
created **per part per fighter**.
**Evidence:** `trueDrawCalls 497`, `sceneMeshes 570`, `geometries 412`; 11 fighters ≈ 440 of the 497 calls.
Three shares geometry **by reference**, so N identical parts could share one geometry (N draw calls but 1
geometry/upload instead of N) — today each fighter re-news its own, so `memory.geometries` balloons.
**Fix (med):** hoist the standard part geometries to module scope and share them across all fighters (scale
per-instance) → `memory.geometries` drops from ~400 to ~a dozen. **Fix (high):** merge the static per-fighter
detail meshes, or `InstancedMesh` the repeated parts, to cut the 497 draw calls themselves. **Moves:**
`memory.geometries` ↓ sharply, `render` ↓, `draw.calls` ↓ (if merged).

### 5. 122 transparent objects; crack overlays render even when invisible 🟡
**Where:** `src/engine/world.js` cover build (crack mesh added at opacity 0, ≈L146–147); auras in `entity.js`.
**Evidence:** `transparents 122`. 16 crack-overlay meshes are `transparent` at opacity 0 — **transparent
objects still draw** (16 wasted draw calls + overdraw) — plus additive VFX/auras stack overdraw in a
bloom-heavy pipeline.
**Fix:** `crack.visible = false` until a block is damaged (toggle in `setBlockCracks`/`damageBlock`); hide
auras when opacity 0; cap simultaneous additive VFX. **Moves:** `draw.calls` −16, `render` ↓, `transparents` ↓.

### 6. Per-frame allocations in hot paths → GC hitches 🟡
**Where:** `src/engine/world.js` `screenToGround` (L225: `new Raycaster`+`new Plane`+`new Vector2` every aim
frame); `src/engine/vfx.js` `explode` update (L61: two `new THREE.Color` per frame per explosion); `game.js`
`controlPlayer`/`controlBot` (the `intents` object + `{...intents[k], dt}` spread per slot per frame, L640–647);
`vfx.js` `lightning` (`positions.slice()` + `new Float32BufferAttribute` per flicker, L129/137).
**Evidence:** `frame.p95 10 ms`, mid-run GC. **Fix:** cache the raycaster/plane/vector as instance temps; hoist
the two explosion Colors out of the closure; reuse a scratch intent object; update the lightning attribute
in place. **Moves:** `frame.p95` ↓, heap growth ↓.

### 7. HUD rebuilds DOM innerHTML and recomputes arrays every frame 🟡
**Where:** `src/engine/hud.js` `updateModeBar` (≈L234) and `updateKitWidget` (≈L244) set `innerHTML` 60×/s;
`updateKitWidget` also does `Object.values(def.abilities).map(...)` + `minions/constructs.filter(...)` every
frame regardless of change.
**Evidence:** cheap here (`hud mean 0.2 ms` on a 4090) but it's pure waste, and HTML reparse/layout scales
down badly on integrated GPUs / low-end laptops. **Fix:** dirty-check — cache the last rendered signature and
touch the DOM only when it changes. **Moves:** `hud` ms ↓ (most on weak hardware).

### 8. Radar canvas fully redraws at 60 Hz 🟢
**Where:** `src/engine/hud.js` `updateRadar` (clear + arena + cover + every entity + wedge each frame).
**Fix:** throttle to ~20–30 Hz (redraw every 2nd–3rd frame) — a minimap doesn't need 60 fps. **Moves:** `hud` ms.

### 9. 112 shader programs → first-use compile hitches 🟢
**Where:** material variety across `entity.js`/`vfx.js`/`projectiles.js`.
**Evidence:** `programs 112`. Lazy shader compilation stutters the first frame a new material/effect appears.
**Fix:** reduce material variety / share materials; `renderer.compile(scene, camera)` after setup to pre-warm.
**Moves:** fewer first-encounter spikes, `memory.programs` ↓.

### 10. Misc / cleanliness 🟢
- `src/main.js` `padSystem` (L55) calls `getComputedStyle(hud.title)` **every frame** — forces a style flush.
  Read a cached boolean / a class instead.
- `src/engine/world.js` fog shader loops up to 20 cover boxes **per lit fragment** (≈L253–268); fine on strong
  GPUs, a fill-rate cost on weak ones — size the loop to the real box count / early-out sooner.
- Dead code: `entity.js` `_liftFx` is set but never read; `projectiles.js` `o_maxspeed` is a trivial wrapper.

---

*Generated from a full read of `src/`. Numbers are from `src/bench/benchmark.js` on an RTX 4090; re-run after
each change and compare the named metric to verify the win. Nothing here is implemented yet — these are the
tickets.*

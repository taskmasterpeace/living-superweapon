// Living Superweapon — performance benchmark.
//
// A repeatable, headless (synchronous, NOT RAF-paced) load test so the cost of an optimization
// can be measured as a number instead of a vibe. It builds one deterministic heavy scene (a full
// 8-fighter rumble with volley + beam + summon heroes all firing) and decomposes the per-frame
// cost into UPDATE (sim CPU) / RENDER (WebGL submit) / HUD (DOM + canvas), then reports p50/p95
// plus draw calls, triangles, live+peak particles, geometry/texture counts, and JS-heap growth.
//
// Run it from the browser console (the game needs a real WebGL context):
//     await window.LSW.runBenchmark()                       // default: 90 warmup + 360 measured
//     await window.LSW.runBenchmark({ measure: 600 })       // longer sample
// or append ?bench to the URL to auto-run on load and console.table the result.
//
// The number that matters most is `frame.p50` / `frame.p95` (synchronous ms per full frame).
// On a machine that hits vsync in normal play, lower here = more headroom before frames drop.

const HEAVY_ROSTER = ['vega', 'sol', 'kano', 'warden', 'hive', 'pyre', 'nova', 'volt'];  // volley + beam + summoner mix

function percentile(a, p) {
  if (!a.length) return 0;
  const s = a.slice().sort((x, y) => x - y);
  return +s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))].toFixed(3);
}
const mean = (a) => +(a.reduce((s, x) => s + x, 0) / (a.length || 1)).toFixed(3);
const heap = () => (performance.memory ? performance.memory.usedJSHeapSize : 0);
const yieldToLoop = () => new Promise((r) => setTimeout(r, 0));

export async function runBenchmark(game, hud, opts = {}) {
  const warmup = opts.warmup ?? 90;
  const measure = opts.measure ?? 360;
  const dt = 1 / 60;
  const R = window.LSW.ROSTER;

  // ---- snapshot state we mutate, so the game is playable again afterwards ----
  const prevRender = game.world.render.bind(game.world);
  const prevControlPlayer = game.controlPlayer.bind(game);
  const prevRunning = game.running;
  const restore = () => { game.world.render = prevRender; game.controlPlayer = prevControlPlayer; game.running = prevRunning; };

  try {
    // ---- build the deterministic heavy scene ----
    hud.hideTitle(); game.running = true;
    game.startMode('rumble', { p1: HEAVY_ROSTER[0] });
    hud.setPlayer(game.player.def);
    // spawn rivals up to a full 8-fighter brawl, ringed around the arena
    for (let i = 1; i < HEAVY_ROSTER.length; i++) {
      const f = game.spawnRival(HEAVY_ROSTER[i]);
      const a = (i / HEAVY_ROSTER.length) * Math.PI * 2;
      if (f) f.pos.set(Math.cos(a) * 60, 0, Math.sin(a) * 60);
    }
    // everyone is AI (incl. P1) so the load is symmetric and hands-off
    game.controlPlayer = (d) => game.controlBot(game.player, d);
    const foes = game.entities.filter((e) => e.def);

    // force sustained ability fire so projectiles / beams / vfx / particles stay saturated
    const forceFire = () => {
      for (const f of foes) {
        if (!f.alive) continue;
        f.ki = f.maxKi;                                  // never starve — keep effects flowing
        const nearest = game.nearestFoe(f, f.pos, 500);
        if (nearest) f.aim3.set(nearest.pos.x - f.pos.x, 1, nearest.pos.z - f.pos.z).normalize();
      }
    };

    // ---- warmup with real rendering (climb the particle high-water, settle the JIT) ----
    for (let i = 0; i < warmup; i++) { forceFire(); game.update(dt); hud.update(); if (i % 20 === 0) await yieldToLoop(); }

    // ---- phase 1: CPU frame cost — UPDATE (sim) + HUD, render STUBBED (reliable, alloc-sensitive) ----
    // Render submit is GPU-async and unreliable to time in a loop, so we isolate the CPU work here
    // (the sim loop, particle buffer prep, projectile allocation, HUD DOM/canvas) and micro-bench
    // render separately below. Most of the ranked optimizations target exactly this CPU cost.
    game.world.render = () => {};
    const frame = [], upd = [], hd = [];
    if (window.gc) window.gc();
    const heap0 = heap();
    for (let i = 0; i < measure; i++) {
      forceFire();
      const t0 = performance.now();
      game.update(dt);                 // sim only (render stubbed)
      const t1 = performance.now();
      hud.update();                    // DOM + radar canvas
      const t2 = performance.now();
      frame.push(t2 - t0); upd.push(t1 - t0); hd.push(t2 - t1);
      if (i % 30 === 0) await yieldToLoop();
    }
    const heap1 = heap();

    // ---- phase 2: render submit micro-bench (freeze sim, time composer.render CPU submit) ----
    game.world.render = prevRender;
    const rnd = [];
    for (let i = 0; i < 40; i++) { const t = performance.now(); prevRender(); rnd.push(performance.now() - t); if (i % 10 === 0) await yieldToLoop(); }

    // ---- counters ----
    // NOTE: after composer.render() renderer.info reflects only the final output-pass quad (1 call).
    // To get the TRUE scene cost we disable autoReset and do one direct scene render.
    const renderer = game.world.renderer, info = renderer.info;
    info.autoReset = false; info.reset();
    renderer.render(game.world.scene, game.world.camera);
    const drawCalls = info.render.calls, triangles = info.render.triangles;
    info.autoReset = true;
    let sceneMeshes = 0, shadowCasters = 0, transparents = 0;
    game.world.scene.traverse((o) => { if (o.isMesh || o.isPoints || o.isSprite || o.isLineSegments) { sceneMeshes++; if (o.castShadow) shadowCasters++; if (o.material && o.material.transparent) transparents++; } });
    const P = game.particles;
    let liveParticles = 0; for (let i = 0; i < P.n; i++) if (P.life[i] > 0) liveParticles++;

    const report = {
      scenario: { fighters: foes.length, roster: HEAVY_ROSTER, warmup, measure, dt: '1/60 (synchronous, not vsync-paced)' },
      frame:  { p50: percentile(frame, 50), p95: percentile(frame, 95), mean: mean(frame), unit: 'ms CPU/frame (update+hud, render stubbed) — the headline' },
      update: { p50: percentile(upd, 50),   p95: percentile(upd, 95),   mean: mean(upd),   unit: 'ms sim (physics/AI/particles/projectiles)' },
      hud:    { p50: percentile(hd, 50),    p95: percentile(hd, 95),    mean: mean(hd),    unit: 'ms HUD DOM + radar canvas' },
      render: { p50: percentile(rnd, 50),   p95: percentile(rnd, 95),   mean: mean(rnd),   unit: 'ms composer.render() CPU submit (GPU exec is async)' },
      draw:   { calls: drawCalls, triangles, sceneMeshes, shadowCasters, transparents },
      memory: { geometries: info.memory.geometries, textures: info.memory.textures, programs: (info.programs || []).length },
      particles: { peakN: P.n, live: liveParticles, max: P.max, bufferFloatsUploadedPerFrame: P.max * 8 },
      heapMB: performance.memory ? { start: +(heap0 / 1048576).toFixed(1), end: +(heap1 / 1048576).toFixed(1), grewMB: +((heap1 - heap0) / 1048576).toFixed(1), note: 'growth over the measured frames ≈ allocation/GC pressure' } : 'unavailable (Chrome-only; run chrome with --enable-precise-memory-info for stable numbers)',
      env: { renderer: gpuString(game), pixelRatio: game.world.renderer.getPixelRatio(), qualityTier: game.world._qTier },
    };
    return report;
  } finally {
    restore();
  }
}

function gpuString(game) {
  try {
    const gl = game.world.renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  } catch (e) { return 'unknown'; }
}

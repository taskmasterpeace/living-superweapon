// CITY vs POWERWORLD render diagnostic (Refs #42, iter 30). powerworld.html renders LIT headless
// (the whole fx matrix works); citygame.html renders BLACK/UNLIT in the SAME harness. This dumps the
// lighting + render state of BOTH after a forced render, so the ONE difference is findable.
//   node tools/city-render-diag.mjs
import { spawn, execSync } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 5205;
function killTree(c) { try { if (process.platform === 'win32') execSync(`taskkill /pid ${c.pid} /T /F`, { stdio: 'ignore' }); else c.kill('SIGTERM'); } catch {} }
const vite = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: process.cwd(), stdio: 'pipe', shell: process.platform === 'win32' });
for (;;) { try { const r = await fetch(`http://localhost:${PORT}/`); if (r.ok) break; } catch {} await new Promise(r => setTimeout(r, 300)); }

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));

const DUMP = () => {
  const g = window.LSW.game, w = g.world, r = w.renderer, sc = w.scene, THREE = window.LSW.THREE;
  try { r.setScissorTest(false); r.setViewport(0, 0, r.domElement.width, r.domElement.height); } catch {}
  let renderErr = null; try { w.render(); } catch (e) { renderErr = String(e); }
  const lights = [];
  try { sc.traverse(o => { if (o.isLight) lights.push({ type: o.type, i: +(o.intensity || 0).toFixed(2), vis: o.visible, inScene: true }); }); } catch {}
  // also probe named world light handles that may not be in the scene graph
  const named = {};
  for (const k of ['sun', 'hemi', 'ambient', 'rim', 'fill', 'key', 'sunLight', 'hemiLight', 'ambientLight']) {
    const L = w[k]; if (L && L.isLight) named[k] = { type: L.type, i: +(L.intensity || 0).toFixed(2), vis: L.visible, parent: !!L.parent };
  }
  const gl = r.getContext(); const px = new Uint8Array(4 * 100);
  try { gl.readPixels((r.domElement.width >> 1) - 5, (r.domElement.height >> 1) - 5, 10, 10, gl.RGBA, gl.UNSIGNED_BYTE, px); } catch {}
  let mx = 0; for (let i = 0; i < px.length; i++) mx = Math.max(mx, px[i]);
  let clear = null; try { clear = r.getClearColor(new THREE.Color()).getHexString() + '@' + r.getClearAlpha(); } catch (e) { clear = 'ERR'; }
  return {
    renderErr, nLightsInScene: lights.length, lights: lights.slice(0, 10), namedLights: named,
    dayT: +(w.dayT ?? -1).toFixed(3), dayFixed: w.dayFixed ?? null,
    exposure: r.toneMappingExposure, toneMapping: r.toneMapping,
    clearColor: clear, autoClear: r.autoClear,
    sceneBg: sc.background ? (sc.background.isColor ? sc.background.getHexString() : (sc.background.isTexture ? 'texture' : 'obj')) : null,
    qOverride: w.qualityOverride, tier: w._qtier ?? w._tier ?? w.tier ?? null,
    composerPasses: (() => { try { return w.composer.passes.map(p => p.constructor.name + (p.enabled === false ? ':off' : '')); } catch { return null; } })(),
    rtInUse: !!w.composer, centerPixelMax: mx,
    camPos: w.camera ? [w.camera.position.x, w.camera.position.y, w.camera.position.z].map(v => Math.round(v)) : null,
    sunPos: w.sun ? [w.sun.position.x, w.sun.position.y, w.sun.position.z].map(v => Math.round(v)) : null,
    canvasWH: [r.domElement.width, r.domElement.height],
    gpu: (() => { try { const dbg = gl.getExtension('WEBGL_debug_renderer_info'); return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'n/a'; } catch { return 'n/a'; } })(),
  };
};

try {
  // POWERWORLD — auto-enters via ?destination=training
  await page.goto(`http://localhost:${PORT}/powerworld.html?destination=training`);
  await page.waitForFunction(() => window.LSW?.game?.player && !window.LSW.game._frontlinePreparing, null, { timeout: 60000 });
  await page.evaluate(() => new Promise(r => setTimeout(r, 800)));
  const pw = await page.evaluate(DUMP);
  console.log('=== POWERWORLD (renders LIT) ===\n' + JSON.stringify(pw, null, 1));

  // CITYGAME — enter training explicitly
  await page.goto(`http://localhost:${PORT}/citygame.html`);
  await page.waitForFunction(() => window.LSW?.game && window.LSW?.ROSTER?.length, null, { timeout: 60000 });
  await page.evaluate(() => { window.LSW.SETTINGS && (window.LSW.SETTINGS.opening = 'off'); window.LSW.enter({ mode: 'training', p1: 'sol' }); });
  await page.evaluate(() => new Promise(r => setTimeout(r, 2200)));
  const city = await page.evaluate(DUMP);
  console.log('=== CITYGAME (natural clock) ===\n' + JSON.stringify(city, null, 1));

  // now force the SAME daylight powerworld uses (dayFixed 0.2) and re-derive lighting
  const cityDay = await page.evaluate(() => {
    const w = window.LSW.game.world;
    w.dayFixed = 0.2;
    try { w.updateDayNight(0.1); } catch {}
    return null;
  });
  await page.evaluate(() => new Promise(r => setTimeout(r, 500)));
  const cityFixed = await page.evaluate(DUMP);
  console.log('=== CITYGAME (dayFixed 0.2 forced) ===\n' + JSON.stringify(cityFixed, null, 1));

  console.log('pageErrors:', JSON.stringify(errs));
} finally { await browser.close().catch(() => {}); killTree(vite); }

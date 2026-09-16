// THE CITY BEAM MATRIX (Refs #42, iter 26) — the ADDITIVE city/iso beam, the DEFAULT gameplay path
// and the glowy look Robert loved, which the PowerWorld-only fx matrix never covered. Readability is
// `_openSky`-gated (projectiles.js:957), so the city beam is a genuinely different, BRIGHTER render
// (AdditiveBlending, tip radius 2.1 vs 0.72, sheath opacity 0.9 vs 0.34) — and it can't be faked on
// the PowerWorld page (toggling _openSky sends that stage's camera to the void). So we drive the REAL
// city (citygame.html), inject the same synthetic FX-proving hero the fx matrix uses (reliable beam
// on slot q — no fragile per-hero slot detection), and frame it steeper so the horizontal beam clears
// the buildings. Beam phase, every family x 3 levels.
//   node tools/capture-citymatrix.mjs [--family fire,ice] [--port 5190]
//
// ⚠ WIP (iter 26): the SETUP + FINDING work — it boots the city, injects the beam hero, and confirms
// `player._openSky === false` (i.e. the city beam IS the additive/glowy path, NOT the readable one the
// fx matrix grades). But the render-OUTSIDE-the-rAF-loop comes back BLACK here even though the camera
// is posed (camPos ~[0,167,199]), the beam exists (beams:1) and the scene is built (kids:55). The
// iter-22 citybeam-check hit the SAME flakiness (some heroes rendered, others black) — it is a
// city-page render-target/compositor state issue when g.update + g.world.render are stubbed, not a
// camera or beam problem. Next attempt: try letting the rAF loop own the render (freeze the SIM only),
// or render the composer explicitly, or capture on a frame the loop itself drew. The finding stands
// regardless: the city's additive beam is a genuinely different, UNGRADED render.
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn, execSync } from 'node:child_process';
import { chromium } from 'playwright';

const ARG = k => { const i = process.argv.indexOf('--' + k); return i >= 0 ? (process.argv[i + 1] || true) : null; };
const PORT = Number(ARG('port')) || 5190;
const ONLY = ARG('family') ? String(ARG('family')).split(',') : null;
const OUT = 'artifacts/city-matrix';
await mkdir(`${OUT}/shots`, { recursive: true });

function killTree(child) { try { if (process.platform === 'win32') execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' }); else child.kill('SIGTERM'); } catch {} }
const vite = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: process.cwd(), stdio: 'pipe', shell: process.platform === 'win32' });
for (;;) { try { const r = await fetch(`http://localhost:${PORT}/`); if (r.ok) break; } catch {} await new Promise(r => setTimeout(r, 300)); }

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const pageErrors = []; page.on('pageerror', e => pageErrors.push(String(e.message).slice(0, 200)));
const rows = [];
try {
  await page.addInitScript(() => { try { localStorage.setItem('threshold_howto_seen', '1'); localStorage.setItem('threshold_tutorial_done', '1'); } catch {} });
  await page.goto(`http://localhost:${PORT}/citygame.html`);
  await page.waitForFunction(() => window.LSW?.game && window.LSW?.ROSTER?.length, null, { timeout: 60000 });
  await page.evaluate(() => { const L = window.LSW; L.SETTINGS && (L.SETTINGS.opening = 'off'); L.enter({ mode: 'training', p1: 'sol' }); });
  await page.evaluate(() => new Promise(r => setTimeout(r, 1800)));   // let the establishing card's clock finish

  await page.evaluate(() => {
    const L = window.LSW, g = L.game;
    const kill = document.createElement('style'); kill.textContent = 'body > :not(#game){display:none!important}'; document.head.appendChild(kill);
    g.world.qualityOverride = 2; g.world.setFogEnabled?.(false); g.world.dayFixed = 0.74;
    L.hud.updateMood = () => {};
    g.controlPlayer = () => {};
    g.updateThrowArc = () => { if (g.throwArc) g.throwArc.visible = false; };
    const realU = g.update.bind(g); g.update = () => {};
    const realRender = g.world.render.bind(g.world); g.world.render = () => {};
    const tpl = JSON.parse(JSON.stringify(L.ROSTER.find(r => r.id === 'kano')));
    tpl.id = '_fxtest'; tpl.name = 'FX PROVING'; tpl.abilities = {}; tpl.origin = 'altered';
    L.ROSTER.push(tpl);
    window.__cx = {
      g, L, realU, realRender, tpl,
      step(n) { for (let i = 0; i < n; i++) this.realU(1 / 60); },
      shoot() { const w = this.g.world; try { w.renderer.setScissorTest(false); w.renderer.setViewport(0, 0, w.renderer.domElement.width, w.renderer.domElement.height); } catch {} this.realRender(); },
      stage(dist) {
        this.g.vfx.clearScorches?.();
        const p = this.g.player;
        // GROUND staging, camera centred on the lane (the proven iter-22 citybeam framing — mapCam
        // has no height target, so an altitude fight renders to the void). Player and dummy straddle
        // the origin so the beam sits mid-frame; pitch 0.7 is steep enough to clear low buildings.
        p.pos.set(-dist / 2, 0, 0); p.vel?.set?.(0, 0, 0);
        p.ki = p.maxKi; p.hp = p.maxHp; p.staggerT = 0;
        let d = this.g.entities.find(e => e.isDummy);
        if (!d) d = this.g.spawnDummy(dist / 2, 0);
        d.pos.set(dist / 2, 0, 0); d.hp = d.maxHp = 99999;
        p.aim3?.set?.(1, 0, 0); if (p.aim) { p.aim.x = 1; p.aim.z = 0; } p.facing = Math.atan2(1, 0);
        if (this.g.throwArc) this.g.throwArc.visible = false;
        return d;
      },
      pose() { this.g.mapCam = { x: 0, z: 0, yaw: 0, pitch: 0.7, zoom: 46 }; this.g.world.orbit?.(this.g.mapCam); },
      setKit(fam, lvl, pal) {
        const t = this.tpl;
        const dt = fam === 'fire' ? 'fire' : fam === 'ice' ? 'cold' : fam === 'water' ? 'cold' : undefined;
        t.colors = { primary: '#2a2a2e', secondary: '#1a1a1e', accent: pal.glow, skin: '#c8a888' };
        t.abilities = { q: { type: 'beam', name: 'FX Beam', fxFamily: fam, fxLevel: lvl, dtype: dt, color: pal.glow, color2: pal.core, radius: lvl === 1 ? 0.7 : lvl === 2 ? 1.6 : 2.6, tipSpeed: 950, maxLen: 62, dps: 18 * lvl, kiPerSec: 0, cost: 0, cd: 0.05 } };
        this.g.setPlayerChar('_fxtest'); this.g.controlPlayer = () => {};
        this.step(3);
      },
      sweep() { for (const pr of [...(this.g.projectiles?.list || [])]) { try { pr._dispose?.(this.g); } catch {} } this.step(4); },
    };
  });

  const FAMS = await page.evaluate(async () => { const fx = await import('/src/data/powerfx.js'); return Object.entries(fx.FX_FAMILIES).map(([id, f]) => ({ id, pal: f.palette })); });
  const fams = ONLY ? FAMS.filter(f => ONLY.includes(f.id)) : FAMS;
  console.log(`city matrix: ${fams.length} families x 3 levels (ADDITIVE beam)`);
  // confirm the beam really is additive on this page (the whole reason for the tool)
  const readable = await page.evaluate(() => !!window.__cx.g.player._openSky);
  console.log(`  player _openSky = ${readable} (want false → additive beam)`);

  for (const fam of fams) {
    for (const lvl of [1, 2, 3]) {
      try {
        const diag = await page.evaluate(({ id, lvl, pal }) => { const c = window.__cx; c.setKit(id, lvl, pal); c.stage(52); c.sweep(); c.step(28);
          for (let i = 0; i < 46; i++) { c.L.runSlot(c.g.player, 'q', { pressed: i === 0, held: true, released: false }, c.g); c.step(1); }
          c.pose(); c.shoot();
          const cam = c.g.world.camera; const beams = (c.g.projectiles?.list || []).filter(p => p.isBeam || p.constructor?.name?.includes('Beam')).length;
          return { running: c.g.running, mapCam: !!c.g.mapCam, camPos: cam ? [Math.round(cam.position.x), Math.round(cam.position.y), Math.round(cam.position.z)] : null, proj: (c.g.projectiles?.list || []).length, beams, kids: c.g.scene?.children?.length, plY: Math.round(c.g.player.pos.y) }; }, { id: fam.id, lvl, pal: fam.pal });
        if (lvl === 3) console.log(`  DIAG ${fam.id} L3:`, JSON.stringify(diag));
        const path = `${OUT}/shots/${fam.id}-${lvl}-beam.png`;
        await page.locator('#game').screenshot({ path });
        rows.push({ family: fam.id, level: lvl, beam: path.replace(OUT + '/', '') });
        await page.evaluate(() => { const c = window.__cx; c.L.runSlot(c.g.player, 'q', { pressed: false, held: false, released: true }, c.g); c.step(30); c.sweep(); });
      } catch (e) { rows.push({ family: fam.id, level: lvl, error: String(e.message).slice(0, 160) }); }
    }
    console.log(`  ${fam.id}: 3 levels`);
  }
  await writeFile(`${OUT}/index.json`, JSON.stringify({ when: new Date().toISOString(), openSky: readable, rows, pageErrors }, null, 1));
  console.log(JSON.stringify({ cells: rows.length, errors: rows.filter(r => r.error), pageErrors: pageErrors.length }, null, 1));
} finally { await browser.close().catch(() => {}); killTree(vite); }

// Focused CITY-PATH beam grab (Refs #42 iter 22): the fx matrix is PowerWorld-only; this closes
// the coverage gap with evidence — the ADDITIVE city beam (glowier than PowerWorld's readable
// blend) under the rich bloom, framed on target. Not a full matrix — a confirmation capture.
//   node tools/citybeam-check.mjs   →  artifacts/citybeam/<hero>.png
import { mkdir } from 'node:fs/promises';
import { spawn, execSync } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 5189, OUT = 'artifacts/citybeam';
await mkdir(OUT, { recursive: true });
const child = spawn('npx.cmd', ['vite', '--port', String(PORT), '--strictPort'], { cwd: process.cwd(), stdio: 'pipe', shell: true });
for (;;) { try { const r = await fetch(`http://localhost:${PORT}/`); if (r.ok) break; } catch {} await new Promise(r => setTimeout(r, 300)); }
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
try {
  await page.addInitScript(() => { try { localStorage.setItem('threshold_howto_seen', '1'); localStorage.setItem('threshold_tutorial_done', '1'); } catch {} });
  await page.goto(`http://localhost:${PORT}/citygame.html`);
  await page.waitForFunction(() => window.LSW?.game && window.LSW?.ROSTER?.length, null, { timeout: 30000 });
  await page.evaluate(() => {
    const L = window.LSW, g = L.game;
    L.SETTINGS && (L.SETTINGS.opening = 'off');
    L.enter({ mode: 'training', p1: 'sol' });
    const kill = document.createElement('style'); kill.textContent = 'body > :not(#game){display:none!important}'; document.head.appendChild(kill);
    g.world.qualityOverride = 2; g.world.setFogEnabled?.(false); g.world.dayFixed = 0.74;
    L.hud.updateMood = () => {};
    g.controlPlayer = () => {};
    g.updateThrowArc = () => { if (g.throwArc) g.throwArc.visible = false; };
    const realU = g.update.bind(g); g.update = () => {};
    const realR = g.world.render.bind(g.world); g.world.render = () => {};
    window.__cb = { g, L, realU, realR, step(n) { for (let i = 0; i < n; i++) this.realU(1 / 60); } };
  });
  await page.evaluate(() => new Promise(r => setTimeout(r, 1600)));   // let the establishing card's clock finish

  for (const hero of ['sol', 'kano', 'vega']) {
    await page.evaluate((id) => {
      const c = window.__cb, g = c.g, L = c.L;
      g.setPlayerChar(id); g.controlPlayer = () => {};
      const p = g.player; p.pos.set(-18, 0, 0); p.ki = p.maxKi; p.hp = p.maxHp; p.staggerT = 0;
      let d = g.entities.find(e => e.isDummy) || g.spawnDummy(24, 0); d.pos.set(26, 0, 0); d.hp = d.maxHp = 99999;
      p.aim3?.set?.(1, 0, 0); if (p.aim) { p.aim.x = 1; p.aim.z = 0; } p.facing = Math.atan2(1, 0);
      c.step(3);
      // pick a beam slot; else fire lmb
      const slot = Object.entries(g.player.def.abilities || {}).find(([, a]) => a.type === 'beam')?.[0] || 'lmb';
      for (let i = 0; i < 50; i++) { c.aimAt?.(); if (p.aim3) p.aim3.set(1, 0, 0); L.runSlot(p, slot, { pressed: i === 0, held: true, released: false }, g); c.step(1); }
      // a steeper, top-down-ish framing so the horizontal beam clears the buildings
      g.mapCam = { x: 4, z: 0, yaw: 0, pitch: 0.72, zoom: 46 };
      if (g.throwArc) g.throwArc.visible = false;
      c.realR();
    }, hero);
    await page.locator('#game').screenshot({ path: `${OUT}/${hero}.png` });
    await page.evaluate(() => { const c = window.__cb; for (const pr of [...(c.g.projectiles?.list || [])]) { try { pr._dispose?.(c.g); } catch {} } c.step(6); });
  }
  console.log(JSON.stringify({ shot: 3, pageErrors: errs }, null, 1));
} finally { await browser.close().catch(() => {}); try { execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' }); } catch {} }

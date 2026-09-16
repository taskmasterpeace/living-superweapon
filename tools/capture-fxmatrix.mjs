// THE FX MATRIX (Refs #42, the /loop 10-10 goal): every family × level × phase, photographed
// through the REAL engine. Injects one synthetic test hero whose kit is rebuilt per family
// (authored fxFamily/fxLevel overrides — the same fields the lab will edit), fires it, and
// freezes each phase at its readable beat (Robert's five judging categories, /goal 2026-09-16):
//   charge — mid-hold · launch — release+3 · flight — mid-flight · impact — boom+7 (cloud up)
//   aftermath — boom+50: the flash is GONE and what LINGERS is the subject (fire first, THEN smoke)
// Output: artifacts/fx-matrix/shots/<family>/<L>-<phase>.png + index.json + per-family sheets.
//   node tools/capture-fxmatrix.mjs [--family fire,ice] [--sheets] [--port 5188]
import { mkdir, writeFile, access } from 'node:fs/promises';
import { spawn, execSync } from 'node:child_process';
import { chromium } from 'playwright';

const ARG = k => { const i = process.argv.indexOf('--' + k); return i >= 0 ? (process.argv[i + 1] || true) : null; };
const PORT = Number(ARG('port')) || 5188;
const ONLY = ARG('family') ? String(ARG('family')).split(',') : null;
const SHEETS = process.argv.includes('--sheets');
const OUT = 'artifacts/fx-matrix';

async function startVite() {
  const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: process.cwd(), stdio: 'pipe', shell: process.platform === 'win32' });
  const t0 = Date.now();
  for (;;) {
    try { const r = await fetch(`http://localhost:${PORT}/`); if (r.ok) break; } catch {}
    if (Date.now() - t0 > 60000) { killTree(child); throw new Error('vite did not come up'); }
    await new Promise(r => setTimeout(r, 300));
  }
  return child;
}
function killTree(child) { try { if (process.platform === 'win32') execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' }); else child.kill('SIGTERM'); } catch {} }

const vite = await startVite();
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e.message).slice(0, 200)));
const rows = [];
try {
  await page.goto(`http://localhost:${PORT}/powerworld.html?destination=training`);
  await page.waitForFunction(() => window.LSW?.game?.player && !window.LSW.game._frontlinePreparing, null, { timeout: 120000 });

  await page.evaluate(() => {
    const L = window.LSW, g = L.game;
    const kill = document.createElement('style');
    kill.textContent = 'body > :not(#game){display:none!important}';
    document.head.appendChild(kill);
    g.world.qualityOverride = 2; g.world.setFogEnabled?.(false);
    L.hud.updateMood = () => {}; L.hud.el?.mood?.remove?.();
    g.controlPlayer = () => {};
    g.updateThrowArc = () => { if (g.throwArc) g.throwArc.visible = false; };   // re-shows itself per frame otherwise
    const realU = g.update.bind(g); g.update = () => {};
    const realRender = g.world.render.bind(g.world); g.world.render = () => {};
    // the synthetic test hero — a roster citizen for the duration (creator customs prove this path)
    const tpl = JSON.parse(JSON.stringify(L.ROSTER.find(r => r.id === 'kano')));
    tpl.id = '_fxtest'; tpl.name = 'FX PROVING'; tpl.abilities = {}; tpl.origin = 'altered';
    L.ROSTER.push(tpl);
    window.__fx = {
      g, L, realU, realRender, tpl,
      step(n) { for (let i = 0; i < n; i++) this.realU(1 / 60); },
      shoot() { const w = this.g.world; try { w.renderer.setScissorTest(false); w.renderer.setViewport(0, 0, w.renderer.domElement.width, w.renderer.domElement.height); } catch {} this.realRender(); },
      stage(dist) {
        this.g.vfx.clearScorches?.();   // one cell's burn must not stain the next cell's floor
        const p = this.g.player;
        p.pos.x = -18; p.pos.z = 0; p.pos.y = 0; p.vel?.set?.(0, 0, 0);
        p.ki = p.maxKi; p.hp = p.maxHp; p.staggerT = 0;
        let d = this.g.entities.find(e => e.isDummy);
        if (!d) d = this.g.spawnDummy(p.pos.x + dist, 0);
        d.pos.x = p.pos.x + dist; d.pos.z = 0; d.pos.y = 0; d.hp = d.maxHp = 99999;
        const dx = d.pos.x - p.pos.x, l = Math.hypot(dx, 0, 0);
        p.aim3?.set?.(1, 0, 0); if (p.aim) { p.aim.x = 1; p.aim.z = 0; } p.facing = Math.atan2(1, 0);
        this.g.mapCam = { x: p.pos.x + dist / 2, z: 0, yaw: 0, pitch: 0.42, zoom: Math.min(40, 16 + dist * 0.45) };
        if (this.g.throwArc) this.g.throwArc.visible = false;   // the aim-trajectory mesh photobombs otherwise
        return d;
      },
      setKit(fam, lvl, pal) {
        const t = this.tpl;
        t.colors = { primary: '#2a2a2e', secondary: '#1a1a1e', accent: pal.glow, skin: '#c8a888' };
        t.abilities = {
          lmb: { type: 'projectile', name: 'FX Bolt', fxFamily: fam, fxLevel: lvl, color: pal.glow, color2: pal.core, damage: 14 * lvl, blast: 4 + lvl * 5, speed: 58, radius: 1 + lvl * 0.5, cost: 0, cd: 0.05, shock: lvl >= 2 },
          rmb: { type: 'charge', name: 'FX Charge', fxFamily: fam, fxLevel: lvl, color: pal.glow, color2: pal.core, cost: 0, cd: 0.05, kiChargePerSec: 0, maxCharge: 1.1, chargePower: 2, minR: 1.4 + lvl * 0.5, maxR: 3 + lvl * 1.4, dmgMin: 10 * lvl, dmgMax: 30 * lvl, speedMin: 40, speedMax: 60, maxBlast: 8 + lvl * 8 },
        };
        this.g.setPlayerChar('_fxtest'); this.g.controlPlayer = () => {};
        this.step(3);
      },
      sweep() { for (const pr of [...(this.g.projectiles?.list || [])]) { try { pr._dispose?.(this.g); } catch {} } this.step(4); },
    };
  });

  const FAMS = await page.evaluate(async () => {
    const fx = await import('/src/data/powerfx.js');
    return Object.entries(fx.FX_FAMILIES).map(([id, f]) => ({ id, pal: f.palette }));
  });
  const fams = ONLY ? FAMS.filter(f => ONLY.includes(f.id)) : FAMS;
  console.log(`fx matrix: ${fams.length} families x 3 levels x 4 phases`);

  for (const fam of fams) {
    const dir = `${OUT}/shots/${fam.id}`;
    await mkdir(dir, { recursive: true });
    for (const lvl of [1, 2, 3]) {
      const shots = {};
      try {
        // CHARGE — mid-hold
        await page.evaluate(({ id, lvl, pal }) => { const c = window.__fx; c.setKit(id, lvl, pal); c.stage(40); c.sweep();
          for (let i = 0; i < 50; i++) { c.L.runSlot(c.g.player, 'rmb', { pressed: i === 0, held: true, released: false }, c.g); c.step(1); }
          c.shoot(); }, { id: fam.id, lvl, pal: fam.pal });
        shots.charge = `${dir}/${lvl}-charge.png`;
        await page.locator('#game').screenshot({ path: shots.charge });
        // LAUNCH — release + 3
        await page.evaluate(() => { const c = window.__fx; c.L.runSlot(c.g.player, 'rmb', { pressed: false, held: false, released: true }, c.g); c.step(3); c.shoot(); });
        shots.launch = `${dir}/${lvl}-launch.png`;
        await page.locator('#game').screenshot({ path: shots.launch });
        await page.evaluate(() => window.__fx.sweep());
        // FLIGHT — mid-air bolt (⚠ the emitter needs its ~0.35s hand-shutdown after the charge —
        // firing into a busy hand silently refuses; the sound gate paid for this once already)
        await page.evaluate(() => { const c = window.__fx; c.stage(46); c.step(28); c.L.runSlot(c.g.player, 'lmb', { pressed: true, held: true, released: false }, c.g); c.L.runSlot(c.g.player, 'lmb', { pressed: false, held: false, released: true }, c.g); c.step(14); c.shoot(); });
        shots.flight = `${dir}/${lvl}-flight.png`;
        await page.locator('#game').screenshot({ path: shots.flight });
        // IMPACT — step to the boom, then +7 frames so the cloud is UP
        await page.evaluate(() => { const c = window.__fx;
          let guard = 0; while (c.g.projectiles.list.length > 0 && guard++ < 220) c.step(1);
          c.step(7); c.shoot(); });
        shots.impact = `${dir}/${lvl}-impact.png`;
        await page.locator('#game').screenshot({ path: shots.impact });
        // AFTERMATH — the fifth judged category: 43 more frames, the flash dead, the smoke/mist/
        // arcs/glyphs carrying the frame alone. "Fire first and then some smoke afterwards."
        await page.evaluate(() => { const c = window.__fx; c.step(43); c.shoot(); });
        shots.aftermath = `${dir}/${lvl}-aftermath.png`;
        await page.locator('#game').screenshot({ path: shots.aftermath });
        await page.evaluate(() => window.__fx.sweep());
        rows.push({ family: fam.id, level: lvl, ...Object.fromEntries(Object.entries(shots).map(([k, v]) => [k, v.replace(OUT + '/', '')])) });
      } catch (e) { rows.push({ family: fam.id, level: lvl, error: String(e.message).slice(0, 160) }); }
    }
    console.log(`  ${fam.id}: 3 levels captured`);
  }

  await writeFile(`${OUT}/index.json`, JSON.stringify({ when: new Date().toISOString(), rows, pageErrors }, null, 1));

  if (SHEETS) {
    await mkdir(`${OUT}/sheets`, { recursive: true });
    for (const fam of fams) {
      // reading order per row: charge/launch/flight/impact/aftermath — L1, L2, L3 rows (5x3)
      try {
        const list = [1, 2, 3].flatMap(l => ['charge', 'launch', 'flight', 'impact', 'aftermath'].map(ph => `${OUT}/shots/${fam.id}/${l}-${ph}.png`));
        const inputs = list.map(f => `-i "${f}"`).join(' ');
        execSync(`ffmpeg -y ${inputs} -filter_complex "concat=n=15:v=1:a=0 [s]; [s] scale=480:-1, tile=5x3" -frames:v 1 -q:v 4 "${OUT}/sheets/${fam.id}.jpg"`, { stdio: 'ignore' });
      } catch { console.error(`sheet failed: ${fam.id}`); }
    }
  }
  const bad = rows.filter(r => r.error);
  console.log(JSON.stringify({ cells: rows.length, errors: bad, pageErrors: pageErrors.length }, null, 1));
} finally { await browser.close().catch(() => {}); killTree(vite); }

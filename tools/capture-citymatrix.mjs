// THE CITY BEAM MATRIX (Refs #42, iter 27) — the ADDITIVE city/iso beam, the DEFAULT gameplay path
// and the glowy look Robert loved, which the PowerWorld-only fx matrix never covered. Readability is
// `_openSky`-gated (projectiles.js:957): the city beam is a genuinely BRIGHTER render (AdditiveBlending,
// tip radius 2.1 vs 0.72, sheath opacity 0.9 vs 0.34) that the 216-cell PowerWorld grade never saw.
//
// ⚠⚠ HEADLESS IS BLACK — USE THE BUILT-IN BROWSER (iter 27, RESOLVED). This tool (and every headless
// variant) renders BLACK on the city page: a headless Playwright pane is treated as HIDDEN, so the
// adaptive-quality render EARLY-OUTS (renderer.info.render.calls === 1) — the exact "measure in a
// foregrounded tab, in-app pane = 60" limitation CLAUDE.md documents. Neither stubbing+manual-render
// NOR letting the rAF loop render (below) escapes it. THE WORKING METHOD is the in-app BUILT-IN
// BROWSER, which renders full-quality: preview_start "lsw-alt" (5184) → navigate citygame.html → in
// javascript_tool: L.enter({mode:'training',p1:'sol'}) → inject the synthetic `_fxtest` beam hero
// (abilities.q = {type:'beam', fxFamily, fxLevel, color:pal.glow, color2:pal.core, radius/dps by level})
// → set g.controlPlayer to pin the player + hold slot q + set g.mapCam {x:0,z:0,yaw:0,pitch:0.7,zoom:46}
// → wait ~1.3s → `computer` screenshot. That is how the iter-27 white-out was captured. This .mjs stays
// as the headless SETUP reference (it correctly proves player._openSky===false = the additive path).
//   node tools/capture-citymatrix.mjs [--family fire,ice] [--port 5190]   (⚠ renders black — see above)
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

  const readable = await page.evaluate(() => {
    const L = window.LSW, g = L.game;
    const kill = document.createElement('style'); kill.textContent = 'body > :not(#game){display:none!important}'; document.head.appendChild(kill);
    g.world.qualityOverride = 2; g.world.setFogEnabled?.(false); g.world.dayFixed = 0.74;
    L.hud.updateMood = () => {};
    const tpl = JSON.parse(JSON.stringify(L.ROSTER.find(r => r.id === 'kano')));
    tpl.id = '_fxtest'; tpl.name = 'FX PROVING'; tpl.abilities = {}; tpl.origin = 'altered';
    L.ROSTER.push(tpl);
    window.__cx = {
      g, L, tpl, hero: -26, foe: 26,
      // hold the beam + pin the player, EVERY frame, from inside the game's own controlPlayer slot —
      // so the natural rAF loop advances + renders the sustained beam with our posed camera.
      arm(id, lvl, pal) {
        const t = this.tpl;
        const dt = id === 'fire' ? 'fire' : id === 'ice' ? 'cold' : id === 'water' ? 'cold' : undefined;
        t.colors = { primary: '#2a2a2e', secondary: '#1a1a1e', accent: pal.glow, skin: '#c8a888' };
        t.abilities = { q: { type: 'beam', name: 'FX Beam', fxFamily: id, fxLevel: lvl, dtype: dt, color: pal.glow, color2: pal.core, radius: lvl === 1 ? 0.7 : lvl === 2 ? 1.6 : 2.6, tipSpeed: 950, maxLen: 62, dps: 18 * lvl, kiPerSec: 0, cost: 0, cd: 0.05 } };
        this.g.setPlayerChar('_fxtest');
        this.g.vfx.clearScorches?.();
        let d = this.g.entities.find(e => e.isDummy); if (!d) d = this.g.spawnDummy(this.foe, 0);
        d.pos.set(this.foe, 0, 0); d.hp = d.maxHp = 99999; d.vel?.set?.(0, 0, 0);
        this._held = false;
        this.g.mapCam = { x: 0, z: 0, yaw: 0, pitch: 0.7, zoom: 46 };
        const self = this;
        this.g.controlPlayer = () => {
          const p = self.g.player;
          p.pos.set(self.hero, 0, 0); p.vel?.set?.(0, 0, 0);
          p.ki = p.maxKi; p.hp = p.maxHp; p.staggerT = 0;
          if (p.aim) { p.aim.x = 1; p.aim.z = 0; } p.aim3?.set?.(1, 0, 0); p.facing = Math.atan2(1, 0);
          self.L.runSlot(p, 'q', { pressed: !self._held, held: true, released: false }, self.g);
          self._held = true;
          if (self.g.throwArc) self.g.throwArc.visible = false;
        };
      },
      release() {
        const p = this.g.player; try { this.L.runSlot(p, 'q', { pressed: false, held: false, released: true }, this.g); } catch {}
        this.g.controlPlayer = () => {};
        for (const pr of [...(this.g.projectiles?.list || [])]) { try { pr._dispose?.(this.g); } catch {} }
      },
      diag() { const cam = this.g.world.camera; const list = this.g.projectiles?.list || []; return { openSky: !!this.g.player._openSky, beams: list.length, calls: this.g.world.renderer?.info?.render?.calls, camY: cam ? Math.round(cam.position.y) : null }; },
    };
    return !!g.player._openSky;
  });
  console.log(`  _openSky after enter = ${readable} (want false → additive beam)`);

  const FAMS = await page.evaluate(async () => { const fx = await import('/src/data/powerfx.js'); return Object.entries(fx.FX_FAMILIES).map(([id, f]) => ({ id, pal: f.palette })); });
  const fams = ONLY ? FAMS.filter(f => ONLY.includes(f.id)) : FAMS;
  console.log(`city matrix: ${fams.length} families x 3 levels (ADDITIVE beam, live rAF render)`);

  for (const fam of fams) {
    for (const lvl of [1, 2, 3]) {
      try {
        await page.evaluate(({ id, lvl, pal }) => window.__cx.arm(id, lvl, pal), { id: fam.id, lvl, pal: fam.pal });
        await page.waitForTimeout(1200);   // let the rAF loop establish + sustain + draw the beam
        const path = `${OUT}/shots/${fam.id}-${lvl}-beam.png`;
        await page.locator('#game').screenshot({ path });
        const d = lvl === 3 ? await page.evaluate(() => window.__cx.diag()) : null;
        if (d) console.log(`  DIAG ${fam.id} L3:`, JSON.stringify(d));
        rows.push({ family: fam.id, level: lvl, beam: path.replace(OUT + '/', '') });
        await page.evaluate(() => window.__cx.release());
        await page.waitForTimeout(120);
      } catch (e) { rows.push({ family: fam.id, level: lvl, error: String(e.message).slice(0, 160) }); }
    }
    console.log(`  ${fam.id}: 3 levels`);
  }
  await writeFile(`${OUT}/index.json`, JSON.stringify({ when: new Date().toISOString(), openSky: readable, rows, pageErrors }, null, 1));
  console.log(JSON.stringify({ cells: rows.length, errors: rows.filter(r => r.error), pageErrors: pageErrors.length }, null, 1));
} finally { await browser.close().catch(() => {}); killTree(vite); }

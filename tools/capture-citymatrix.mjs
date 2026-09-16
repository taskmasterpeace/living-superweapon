// THE CITY BEAM MATRIX (Refs #42, iter 27) — the ADDITIVE city/iso beam, the DEFAULT gameplay path
// and the glowy look Robert loved, which the PowerWorld-only fx matrix never covered. Readability is
// `_openSky`-gated (projectiles.js:957): the city beam is a genuinely BRIGHTER render (AdditiveBlending,
// tip radius 2.1 vs 0.72, sheath opacity 0.9 vs 0.34) that the 216-cell PowerWorld grade never saw.
//
// ⚠⚠ DEFINITIVE (iter 29): this tool correctly serves THIS worktree and proves `player._openSky===false`
// (the additive city path), and the CAPTURE MECHANISM below is cracked — but the CITY PAGE RENDERS
// BLACK/UNLIT in headless Playwright regardless. Measured `maxRGB=9, brightFrac=0` over the whole frame:
// the city scene never lights up (the beam only flickered in transiently). ⚠ This is CITY-SPECIFIC:
// `powerworld.html` renders LIT and gradeable in the SAME headless harness (capture-fxmatrix.mjs) — so
// it is a difference in the city's own render/light pipeline under headless SwiftShader, NOT the capture.
//
// THE CAPTURE MECHANISM (reusable, correct): page.screenshot / canvas.toDataURL / drawImage ALL return
// BLACK under preserveDrawingBuffer:false — they read the PRESENTED canvas. `gl.readPixels` reads the
// real framebuffer; encode it with the minimal PNG encoder above. That is the ONLY path that reads a
// WebGL render Playwright's screenshot can't. (When the scene DOES render, this captures it.)
//
// STILL UNSOLVED: rendering THIS worktree's city LIT. The one place it rendered lit was the built-in
// browser on the MAIN TREE (`preview_start` serves `D:\lsw`, NOT the worktree — the iter-27 white-out was
// that BASE game, retracted iter 28). Options next: (a) find why the city scene is unlit under headless
// (its sun/hemi/composer vs powerworld's); (b) Robert eyeballs the lit city he actually plays.
//   node tools/capture-citymatrix.mjs [--family fire,ice] [--port 5190] [--headless]   (⚠ city renders black)
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn, execSync } from 'node:child_process';
import { deflateSync } from 'node:zlib';
import { chromium } from 'playwright';

// minimal PNG encoder (no deps available) — WebGL readPixels gives raw RGBA bottom-up; toDataURL /
// drawImage / page.screenshot all read the PRESENTED canvas which is BLACK under
// preserveDrawingBuffer:false, so readPixels + this encoder is the only capture path that works.
const _CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const _crc32 = buf => { let c = ~0; for (let i = 0; i < buf.length; i++) c = _CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return ~c; };
const _chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const t = Buffer.from(type); const crc = Buffer.alloc(4); crc.writeInt32BE(_crc32(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, crc]); };
function pngEncode(w, h, rgbaTopDown) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const stride = w * 4, raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; rgbaTopDown.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), _chunk('IHDR', ihdr), _chunk('IDAT', deflateSync(raw, { level: 6 })), _chunk('IEND', Buffer.alloc(0))]);
}

const ARG = k => { const i = process.argv.indexOf('--' + k); return i >= 0 ? (process.argv[i + 1] || true) : null; };
const PORT = Number(ARG('port')) || 5190;
const ONLY = ARG('family') ? String(ARG('family')).split(',') : null;
const OUT = 'artifacts/city-matrix';
await mkdir(`${OUT}/shots`, { recursive: true });

function killTree(child) { try { if (process.platform === 'win32') execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' }); else child.kill('SIGTERM'); } catch {} }
const vite = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: process.cwd(), stdio: 'pipe', shell: process.platform === 'win32' });
for (;;) { try { const r = await fetch(`http://localhost:${PORT}/`); if (r.ok) break; } catch {} await new Promise(r => setTimeout(r, 300)); }

// ⚠ HEADFUL (iter 29): headless renders the CITY page BLACK (the hidden-pane throttle / adaptive
// early-out). A real window with GPU + anti-throttle flags renders full-quality. Pass --headless to
// force the old (black) mode.
const HEADLESS = process.argv.includes('--headless');
const browser = await chromium.launch({
  headless: HEADLESS,
  args: ['--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});
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
    g.world.qualityOverride = 2; g.world.setFogEnabled?.(false); g.world.dayFixed = 0.25;
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

  // hardcoded palettes (core/glow from src/data/powerfx.js) — the in-page dynamic import of powerfx
  // is flaky on the citygame page and killed the run; the beam kit only needs core + glow.
  const FAMS = [
    { id: 'fire', pal: { core: '#fff3c8', glow: '#ff7a2a' } }, { id: 'ice', pal: { core: '#ffffff', glow: '#bfeaff' } },
    { id: 'water', pal: { core: '#eafcff', glow: '#3fa8d8' } }, { id: 'energyRed', pal: { core: '#fff0f0', glow: '#ff3b3b' } },
    { id: 'energyBlue', pal: { core: '#f0f8ff', glow: '#3f8cff' } }, { id: 'energySun', pal: { core: '#ffffff', glow: '#ffd24a' } },
    { id: 'electric', pal: { core: '#ffffff', glow: '#8ad8ff' } }, { id: 'magicViolet', pal: { core: '#f8f0ff', glow: '#a44df0' } },
    { id: 'magicGreen', pal: { core: '#f0fff0', glow: '#4fd86a' } }, { id: 'alien', pal: { core: '#fff8e8', glow: '#ff9a2a' } },
    { id: 'toxic', pal: { core: '#eaffd8', glow: '#9adf3a' } }, { id: 'steel', pal: { core: '#f0f0f0', glow: '#c8c8c8' } },
  ];
  const fams = ONLY ? FAMS.filter(f => ONLY.includes(f.id)) : FAMS;
  console.log(`city matrix: ${fams.length} families x 3 levels (ADDITIVE beam, live rAF render)`);

  for (const fam of fams) {
    for (const lvl of [1, 2, 3]) {
      try {
        await page.evaluate(({ id, lvl, pal }) => window.__cx.arm(id, lvl, pal), { id: fam.id, lvl, pal: fam.pal });
        await page.waitForTimeout(1200);   // let the rAF loop establish + sustain + draw the beam
        const path = `${OUT}/shots/${fam.id}-${lvl}-beam.png`;
        // ⚠ capture via a FORCED render + toDataURL IN THE SAME TASK (page.screenshot came back black
        // on the city page). Read the drawing buffer directly; sample center pixels to PROVE content.
        const cap = await page.evaluate(() => {
          const g = window.__cx.g, r = g.world.renderer, cv = r.domElement;
          try { r.setScissorTest(false); r.setViewport(0, 0, cv.width, cv.height); } catch {}
          // force several full renders so the sustained beam + lit scene are actually on the buffer
          // (a single render can catch a transition; the city scene needs its light pass to have run)
          try { g.world.updateDayNight?.(0.016); } catch {}
          try { for (let k = 0; k < 4; k++) g.world.render(); } catch (e) { return { err: String(e) }; }
          const gl = r.getContext(); const w = cv.width, h = cv.height, px = new Uint8Array(w * h * 4);
          try { gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); } catch (e) { return { err: 'readPixels ' + e }; }
          let mx = 0, nb = 0, minX = w, maxX = 0, minY = h, maxY = 0;
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; const b = px[i] + px[i + 1] + px[i + 2]; if (b > mx) mx = b; if (b > 150) { nb++; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; } }
          let bin = ''; for (let i = 0; i < px.length; i += 8192) bin += String.fromCharCode.apply(null, px.subarray(i, i + 8192));
          return { w, h, centerMax: mx, brightFrac: +(nb / (w * h)).toFixed(3), bbox: nb ? [minX, minY, maxX, maxY] : null, b64: btoa(bin) };
        });
        if (cap?.b64) {
          const raw = Buffer.from(cap.b64, 'base64'), w = cap.w, h = cap.h, stride = w * 4, top = Buffer.alloc(raw.length);
          for (let y = 0; y < h; y++) raw.copy(top, y * stride, (h - 1 - y) * stride, (h - y) * stride);   // flip vertical (readPixels is bottom-up)
          await writeFile(path, pngEncode(w, h, top));
        }
        if (lvl === 3) console.log(`  DIAG ${fam.id} L3: maxRGB=${cap?.centerMax} brightFrac=${cap?.brightFrac} bbox=${JSON.stringify(cap?.bbox)} err=${cap?.err || ''}`);
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

// THE POWER CATALOG CAPTURE (beam-projectile makeover L1, Refs #42).
// Repeatable pipeline: boots the REAL game (index.html — the composer/bloom path, never the
// studio's raw renderer, because LOOK is the subject), walks every hero x every ability slot,
// fires it at a Sim Construct through the engine's own runSlot door, freezes the frame at the
// ability's most readable beat, and screenshots the canvas. Output:
//   artifacts/power-catalog/shots/<hero>/<NN>.png     one frame per ability
//   artifacts/power-catalog/index.json               what each frame is (hero/slot/type/dtype/fired)
//   artifacts/power-catalog/index.html               local gallery with labels
//   artifacts/power-catalog/sheets/<hero>.jpg        per-hero contact sheet (ffmpeg tile) with --sheets
// Usage:
//   node tools/capture-powers.mjs                    full roster (resumes: existing shots skipped)
//   node tools/capture-powers.mjs --hero sol,vegas   subset
//   node tools/capture-powers.mjs --sheets           also build contact sheets after capture
//   node tools/capture-powers.mjs --force            recapture even if the shot exists
// Assumes nothing is on the port (spawns its own vite on --port, default 5186).
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { spawn, execSync } from 'node:child_process';
import { chromium } from 'playwright';

const ARG = k => { const i = process.argv.indexOf('--' + k); return i >= 0 ? (process.argv[i + 1] || true) : null; };
const PORT = Number(ARG('port')) || 5186;
// Robert's live game is the POWERWORLD page (third person); ?destination=training auto-enters a match.
const PAGE = ARG('page') || 'powerworld.html?destination=training';
const OUT = 'artifacts/power-catalog';
const ONLY = ARG('hero') ? String(ARG('hero')).split(',') : null;
const FORCE = process.argv.includes('--force');
const SHEETS = process.argv.includes('--sheets');
const exists = p => access(p).then(() => true, () => false);

// ---- dev server ------------------------------------------------------------
async function startVite() {
  const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['vite', '--port', String(PORT), '--strictPort'], { cwd: process.cwd(), stdio: 'pipe', shell: process.platform === 'win32' });
  const t0 = Date.now();
  for (;;) {
    // vite binds ::1 — probe localhost, never 127.0.0.1 (the probe misses an up server otherwise)
    try { const r = await fetch(`http://localhost:${PORT}/`); if (r.ok) break; } catch {}
    if (Date.now() - t0 > 60000) { killTree(child); throw new Error('vite did not come up on ' + PORT); }
    await new Promise(r => setTimeout(r, 350));
  }
  return child;
}
function killTree(child) {
  if (!child) return;
  try {
    if (process.platform === 'win32') execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
    else child.kill('SIGTERM');
  } catch {}
}

// ---- the drive -------------------------------------------------------------
const vite = await startVite();
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e.message).slice(0, 200)));
let rows = [];
try {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('threshold_howto_seen', '1');
      localStorage.setItem('threshold_tutorial_done', '1');
    } catch {}
  });
  await page.goto(`http://localhost:${PORT}/${PAGE}`);
  await page.waitForFunction(() => window.LSW?.game && window.LSW?.ROSTER?.length, null, { timeout: 60000 });
  await page.waitForFunction(() => document.body.classList.contains('playing') ? !!window.LSW.game.player : true, null, { timeout: 30000 });

  await page.evaluate(() => {
    const L = window.LSW, g = L.game;
    if (L.SETTINGS) L.SETTINGS.opening = 'off';
    // powerworld.html?destination=training auto-enters; only open the door ourselves if it didn't
    if (!document.body.classList.contains('playing') || !g.player) L.enter({ mode: 'training', p1: L.ROSTER[0].id });
    if (!g.player) throw new Error('no player after boot');
    const kill = document.createElement('style');                           // pure render: the canvas and nothing else
    kill.textContent = 'body > :not(#game){display:none!important}';
    document.head.appendChild(kill);
    g.world.qualityOverride = 2;                                            // full bloom, no adaptive drops
    g.world.setFogEnabled?.(false);                                         // vision-dim layer off — subject is the power
    g.world.dayFixed = 0.74;                                                // pinned NIGHT — glow needs dark to read
    for (const sys of [g.peds, g.world.wildlife, g.world.peds]) {           // crowd + birds are noise in a catalog frame
      if (!sys) continue;
      for (const k of ['mesh', 'group', 'inst', 'birds', 'litter']) if (sys[k]?.visible !== undefined) sys[k].visible = false;
      if (typeof sys.setCount === 'function') try { sys.setCount(0); } catch {}
    }
    L.hud.updateMood = () => {}; L.hud.el?.mood?.remove?.();                // re-parents itself to <body> + re-inlines display — stub, don't style
    g.controlPlayer = () => {};                                             // nothing rewrites aim from the mouse
    const realU = g.update.bind(g);
    g.update = () => {};                                                    // main rAF loop becomes a no-op...
    window.__cap = {
      g, L, realU,
      step(n) { for (let i = 0; i < n; i++) this.realU(1 / 60); },          // ...we own the clock
      shoot() {                                                             // one clean composed frame
        const w = this.g.world;
        try { w.renderer.setScissorTest(false); w.renderer.setViewport(0, 0, w.renderer.domElement.width, w.renderer.domElement.height); } catch {}
        w.render();
      },
      aimAt(p, t) {
        const dx = t.pos.x - p.pos.x, dy = (t.pos.y + 5) - (p.pos.y + 5), dz = t.pos.z - p.pos.z;
        const l = Math.hypot(dx, dy, dz) || 1;
        if (p.aim3?.set) p.aim3.set(dx / l, dy / l, dz / l);
        const h = Math.hypot(dx, dz) || 1;
        if (p.aim) { p.aim.x = dx / h; p.aim.z = dz / h; }
        p.facing = Math.atan2(dx, dz);
      },
      sweepProjectiles() {
        const list = this.g.projectiles?.list;
        if (list) for (const pr of [...list]) { try { pr._dispose?.(this.g); } catch {} }
      },
    };
  });

  // the training destination preps the battlefield async (surface/shadow uploads) — update() early-outs
  // behind _frontlinePreparing the whole time, so a shot taken before this resolves is a loading card
  const waitReady = () => page.waitForFunction(() => !window.LSW.game._frontlinePreparing, null, { timeout: 120000 });
  await waitReady();

  const roster = await page.evaluate(() => window.LSW.ROSTER.map(r => ({
    id: r.id, name: r.name,
    slots: Object.entries(r.abilities || {}).map(([slot, a]) => ({
      slot, name: a.name, type: a.type, dtype: a.dtype || null, color: a.color || null, color2: a.color2 || null,
      radius: a.radius ?? null, hold: !!(a.charge || a.kiPerSec || a.maxCharge), charged: !!(a.charge || a.maxCharge),
    })),
  })));
  const heroes = ONLY ? roster.filter(r => ONLY.includes(r.id)) : roster;
  console.log(`capturing ${heroes.reduce((n, h) => n + h.slots.length, 0)} abilities across ${heroes.length} heroes`);

  // Firing recipes: how long to hold, and how many frames after release the readable beat lands.
  // (charge = the orb mid-flight; beam/cone = mid-sustain; instant projectile = mid-flight.)
  // `during: true` = the readable beat is MID-HOLD (shoot before release: a released stream starts
  // eating itself). A CHARGED beam is the opposite — the beam is born ON release, so shoot after it.
  const RECIPE = (t, hold, charged) => {
    if (t === 'beam') return charged ? { hold: 68, after: 10, dist: 55 } : { hold: 55, after: 0, dist: 55, during: true };
    if (t === 'cone') return { hold: 34, after: 0, dist: 22, during: true };
    if (t === 'lifedrain' || t === 'tentacle') return { hold: 40, after: 0, dist: 18, during: true };
    if (t === 'charge' || t === 'growingorb' || t === 'bow' || t === 'facebomb') return { hold: 68, after: 9, dist: 45 };
    if (t === 'nova') return { hold: 45, after: 4, dist: 20 };
    if (t === 'rifle' || t === 'quiver' || t === 'volley') return { hold: 26, after: 4, dist: 50 };
    if (t === 'projectile' || t === 'meteor' || t === 'mine') return { hold: hold ? 40 : 1, after: t === 'meteor' ? 34 : 12, dist: 45 };
    if (t === 'melee' || t === 'rush' || t === 'grab') return { hold: 8, after: 4, dist: 8 };
    if (t === 'summon' || t === 'construct' || t === 'portal') return { hold: 1, after: 24, dist: 30 };
    return { hold: hold ? 40 : 1, after: 12, dist: 30 };                    // buffs/moves/fields: aura beat
  };

  let sinceRestart = 0;
  for (const hero of heroes) {
    const dir = `${OUT}/shots/${hero.id}`;
    await mkdir(dir, { recursive: true });
    // Fresh board every ~10 heroes (summons/debris accumulate across kit swaps — freeze-frame memory #14).
    if (++sinceRestart >= 10) {
      sinceRestart = 0;
      // realU stays the ONE binding captured at setup — g.update is the no-op by now, never rebind it
      await page.evaluate(() => { const c = window.__cap; c.g.startMode('training', { p1: c.g.player.def.id }); c.g.controlPlayer = () => {}; c.g.update = () => {}; });
      await waitReady();
    }
    await page.evaluate((id) => {
      const c = window.__cap, g = c.g;
      g.setPlayerChar(id);
      g.controlPlayer = () => {};
      c.sweepProjectiles();
    }, hero.id);

    let nn = 0;
    for (const ab of hero.slots) {
      const file = `${dir}/${String(nn).padStart(2, '0')}.png`;
      const row = { hero: hero.id, heroName: hero.name, slot: ab.slot, name: ab.name, type: ab.type, dtype: ab.dtype, color: ab.color, color2: ab.color2, file: `shots/${hero.id}/${String(nn).padStart(2, '0')}.png`, fired: null };
      nn++;
      if (!FORCE && await exists(file)) { row.fired = 'cached'; rows.push(row); continue; }
      const r = RECIPE(ab.type, ab.hold, ab.charged);
      try {
        const fired = await page.evaluate(({ slot, r }) => {
          const c = window.__cap, g = c.g, L = c.L, p = g.player;
          // stage: player fixed, one fresh full-hp dummy down the lane
          p.pos.x = -20; p.pos.z = 0; p.pos.y = 0; p.vel?.set?.(0, 0, 0);
          p.ki = p.maxKi; p.hp = p.maxHp; p.staggerT = 0;
          for (const e of [...g.entities]) if (e.isDummy) { e.hp = 0; e._remove?.(g); const i = g.entities.indexOf(e); if (i >= 0) g.entities.splice(i, 1); try { e.dispose?.(); g.scene.remove(e.obj); } catch {} }
          const d = g.spawnDummy(p.pos.x + r.dist, p.pos.z);
          d.hp = d.maxHp = 99999;                                           // the target outlives every shot — no mid-frame ragdoll
          // side-on posed camera: iso ortho orbiting the lane midpoint, beam travels left -> right
          g.mapCam = { x: p.pos.x + r.dist / 2, z: 0, yaw: 0, pitch: 0.42, zoom: Math.min(42, Math.max(18, 14 + r.dist * 0.45)) };
          c.aimAt(p, d);
          c.step(2);
          delete p._slotUse?.[slot];
          // drive the slot through the one door everything uses
          for (let i = 0; i < r.hold; i++) {
            c.aimAt(p, d);
            L.runSlot(p, slot, { pressed: i === 0, held: true, released: false }, g);
            c.step(1);
          }
          if (r.during) {
            c.shoot();
            L.runSlot(p, slot, { pressed: false, held: false, released: true }, g);
          } else {
            L.runSlot(p, slot, { pressed: false, held: false, released: true }, g);
            c.step(Math.max(0, r.after));
            c.shoot();
          }
          return !!p._slotUse?.[slot];
        }, { slot: ab.slot, r });
        row.fired = fired;
        await page.locator('#game').screenshot({ path: file });
        // settle + clean between abilities so shot N never wears shot N-1's debris
        await page.evaluate(({ slot }) => {
          const c = window.__cap, p = c.g.player;
          c.L.runSlot(p, slot, { pressed: false, held: false, released: true }, c.g);
          c.sweepProjectiles();
          c.step(26);                                                       // hand-contention: emitters need real shutdown time
          p.ki = p.maxKi;
          for (const bag of [p.cds, p.cd, p.cooldowns]) if (bag && typeof bag === 'object') for (const k of Object.keys(bag)) { if (typeof bag[k] === 'number') bag[k] = 0; }
        }, { slot: ab.slot });
      } catch (e) { row.fired = false; row.error = String(e.message).slice(0, 160); }
      rows.push(row);
    }
    console.log(`  ${hero.id}: ${hero.slots.length} shots`);
  }

  await writeFile(`${OUT}/index.json`, JSON.stringify({ when: new Date().toISOString(), rows, pageErrors }, null, 1));

  // local gallery (labels live here; the artifact is built from contact sheets separately)
  const byHero = new Map();
  for (const r of rows) { if (!byHero.has(r.hero)) byHero.set(r.hero, []); byHero.get(r.hero).push(r); }
  const esc = s => String(s ?? '').replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
  const html = `<!doctype html><meta charset="utf-8"><title>Power Catalog</title>
<style>body{background:#141210;color:#e8e2d6;font:14px system-ui;margin:24px}h2{color:#f5b21a;border-bottom:1px solid #3a342c;padding-bottom:4px}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px}figure{margin:0;background:#1d1a16;border:1px solid #2e2922;border-radius:8px;padding:6px}
img{width:100%;border-radius:4px}figcaption{font-size:12px;padding:4px 2px;color:#cfc7b8}.t{color:#f5b21a}.dead{outline:2px solid #ff3b3b}</style>
<h1>POWER CATALOG — baseline ${new Date().toISOString().slice(0, 10)}</h1>
${[...byHero.entries()].map(([id, list]) => `<h2>${esc(list[0].heroName)} <small>(${id})</small></h2><div class="g">${list.map(r =>
    `<figure class="${r.fired === false ? 'dead' : ''}"><img loading="lazy" src="${r.file}"><figcaption><b>${esc(r.name)}</b> · ${esc(r.slot)} · <span class="t">${esc(r.type)}</span>${r.dtype ? ' · ' + esc(r.dtype) : ''}${r.fired === false ? ' · DID NOT FIRE' : ''}</figcaption></figure>`).join('')}</div>`).join('\n')}`;
  await writeFile(`${OUT}/index.html`, html);

  if (SHEETS) {
    await mkdir(`${OUT}/sheets`, { recursive: true });
    for (const [id, list] of byHero.entries()) {
      const n = list.length, cols = n <= 4 ? 2 : n <= 6 ? 3 : 4, rowsN = Math.ceil(n / cols);
      try {
        execSync(`ffmpeg -y -framerate 1 -i "${OUT}/shots/${id}/%02d.png" -vf "scale=560:-1,tile=${cols}x${rowsN}" -frames:v 1 -q:v 4 "${OUT}/sheets/${id}.jpg"`, { stdio: 'ignore' });
      } catch (e) { console.error(`sheet failed for ${id}`); }
    }
  }

  const dead = rows.filter(r => r.fired === false);
  console.log(JSON.stringify({ shots: rows.length, didNotFire: dead.length, deadList: dead.map(d => d.hero + '/' + d.slot), pageErrors: pageErrors.length }, null, 1));
} finally {
  await browser.close().catch(() => {});
  killTree(vite);
}

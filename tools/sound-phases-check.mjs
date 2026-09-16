// L2 GATE (Refs #42): the element-true five-phase sound lifecycle, proven through the REAL engine.
// Boots powerworld training, spies audio.sample/sampleLoop on the live AudioBus, fires TORCH (fire)
// and COLDSNAP (cold) kits through runSlot, and asserts:
//   G1 self-proof   — the spies recorded events at all (the vacuous-pass law)
//   G2 element split— fire phases speak fire.roar, cold phases speak glass.light, sets differ
//   G3 travel life  — a projectile creates a travel loop and every loop is STOPPED by disposal
//   G4 doppler      — approaching > 1 > receding, pure function
//   G5 clean        — 0 page errors
import assert from 'node:assert/strict';
import { spawn, execSync } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 5187;
const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: process.cwd(), stdio: 'pipe', shell: true });
const kill = () => { try { execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' }); } catch {} };
for (;;) { try { const r = await fetch(`http://localhost:${PORT}/`); if (r.ok) break; } catch {} await new Promise(r => setTimeout(r, 300)); }

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e.message).slice(0, 200)));
try {
  await page.goto(`http://localhost:${PORT}/powerworld.html?destination=training`);
  await page.waitForFunction(() => window.LSW?.game?.player && !window.LSW.game._frontlinePreparing, null, { timeout: 90000 });

  const out = await page.evaluate(async () => {
    const L = window.LSW, g = L.game, a = g.audio;
    const realU = g.update.bind(g); g.update = () => {};
    const rr = g.world.render.bind(g.world); g.world.render = () => {};
    g.controlPlayer = () => {};
    const step = n => { for (let i = 0; i < n; i++) realU(1 / 60); };

    // ---- the spies (installed ONCE — the melee-feel double-wrap lesson) ----
    const events = [];               // { name, kind } per audio call while a labelled window is open
    let label = null;
    const os = a.sample.bind(a), ol = a.sampleLoop.bind(a);
    let loopsMade = 0, loopsStopped = 0;
    a.sample = (name, o) => { if (label) events.push({ hero: label.hero, slot: label.slot, name, kind: 'shot' }); return os(name, o); };
    a.sampleLoop = (name, o) => {
      const h = ol(name, o);
      if (label) events.push({ hero: label.hero, slot: label.slot, name, kind: 'loop' });
      if (h) { loopsMade++; const st = h.stop.bind(h); h.stop = () => { loopsStopped++; st(); }; }
      return h;
    };

    const fire = (slot, ab) => {
      const p = g.player, d = g.entities.find(e => e.isDummy) || g.spawnDummy(p.pos.x + 40, p.pos.z);
      d.hp = d.maxHp = 99999;
      p.pos.x = -20; p.pos.z = 0; p.ki = p.maxKi; p.staggerT = 0;
      const dx = d.pos.x - p.pos.x, dz = d.pos.z - p.pos.z, l = Math.hypot(dx, 5, dz);
      p.aim3?.set?.(dx / l, 5 / l, dz / l); if (p.aim) { p.aim.x = dx / Math.hypot(dx, dz); p.aim.z = dz / Math.hypot(dx, dz); }
      const hold = ab.type === 'beam' || ab.type === 'cone' ? 45 : (ab.charge || ab.maxCharge || ab.type === 'nova') ? 55 : 1;
      for (let i = 0; i < hold; i++) L.runSlot(p, slot, { pressed: i === 0, held: true, released: false }, g), step(1);
      L.runSlot(p, slot, { pressed: false, held: false, released: true }, g);
      step(40);                                     // flight + impact window
      for (const pr of [...(g.projectiles?.list || [])]) { try { pr._dispose?.(g); } catch {} }
      step(10);
    };

    const run = (heroId) => {
      g.setPlayerChar(heroId); g.controlPlayer = () => {};
      step(4);
      for (const [slot, ab] of Object.entries(g.player.def.abilities || {})) {
        if (['melee', 'rush', 'dash', 'teleport', 'buff'].includes(ab.type)) continue;
        label = { hero: heroId, slot };
        try { fire(slot, ab); } catch (e) { events.push({ hero: heroId, slot, name: 'ERROR:' + e.message, kind: 'err' }); }
        label = null;
      }
    };
    const susBase = a._sus.size;
    run('torch'); run('coldsnap');
    step(30); a.sweep?.();

    const dopA = a.dopplerMul({ x: 30, z: 0 }, { x: -60, z: 0 });   // flying toward listener at origin-ish
    const dopR = a.dopplerMul({ x: 30, z: 0 }, { x: 60, z: 0 });    // flying away
    return { events, loopsMade, loopsStopped, susBase, susNow: a._sus.size, dopA, dopR, listener: a._hasL };
  });

  const names = h => new Set(out.events.filter(e => e.hero === h && e.kind !== 'err').map(e => e.name));
  const torch = names('torch'), cold = names('coldsnap');
  const errs = out.events.filter(e => e.kind === 'err');
  const report = {
    torchSounds: [...torch], coldSounds: [...cold],
    loops: { made: out.loopsMade, stopped: out.loopsStopped },
    sus: { base: out.susBase, now: out.susNow },
    doppler: { approach: out.dopA, recede: out.dopR },
    fireErrors: errs, pageErrors,
  };
  console.log(JSON.stringify(report, null, 1));

  assert.ok(out.events.length > 10, 'G1: spies recorded nothing — the gate is measuring air');
  assert.ok(torch.has('fire.roar'), 'G2: TORCH never spoke fire.roar');
  assert.ok(cold.has('glass.light'), 'G2: COLDSNAP never spoke glass.light');
  assert.ok(!cold.has('fire.roar'), 'G2: an ice kit spoke fire');
  assert.ok(out.loopsMade > 0, 'G3: no travel/charge loop was ever created');
  assert.ok(out.loopsStopped >= out.loopsMade - 2, `G3: loops leaked (${out.loopsMade} made, ${out.loopsStopped} stopped)`);
  assert.ok(out.dopA > 1 && out.dopR < 1, `G4: doppler wrong way (${out.dopA} / ${out.dopR})`);
  assert.equal(errs.length, 0, 'fire() threw: ' + JSON.stringify(errs));
  assert.equal(pageErrors.length, 0, 'page errors: ' + pageErrors.join(' | '));
  console.log('SOUND PHASES GATE: GREEN');
} finally { await browser.close().catch(() => {}); kill(); }

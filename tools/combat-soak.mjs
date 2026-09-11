import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const baseURL = process.env.LSW_BASE_URL || 'http://127.0.0.1:5180';
const arena=process.argv.includes('--arena');
const roster=arena?['breach','recon','merc','rift','mystward','vanguard','sol','kano']:['sol','sarge','kraken','rift','apex','rime','gale','titan'];
let result;
try {
  await page.goto(`${baseURL}/powerworld.html`);
  await page.waitForFunction(() => window.LSW?.game);
  result = await page.evaluate(async (roster) => {
    const g = LSW.game;
    g.startMode('training', { p1: roster[0] });
    const update = g.update.bind(g);
    g.update = () => {};
    g.world.render = () => {};
    for (const id of roster.slice(1)) g.spawnRival(id);
    const AI = g.entities.find(f => f.ai).ai.constructor;
    g.player.ai = new AI(g.player, 1);
    g.controlPlayer = dt => g.controlBot(g.player, dt);
    const fighters = [...g.entities];
    fighters.forEach((f, i) => {
      const angle = i * Math.PI * 2 / fighters.length;
      f.pos.set(Math.cos(angle) * 32, 0, Math.sin(angle) * 32);
      f.team = i; f.invuln = 0;
    });
    let hits = 0, damage = 0, kos = 0;
    const onHit = g.onHit.bind(g), handleKO = g.handleKO.bind(g);
    g.onHit = (target, amount, ...args) => { hits++; damage += amount; return onHit(target, amount, ...args); };
    g.handleKO = (...args) => { kos++; return handleKO(...args); };
    const start = g.time, bad = [], samples = [];
    let steps = 0;
    // Advance the real simulation clock (slow motion included), with a finite ceiling.
    while (g.time - start < 30 && steps < 7200) {
      update(1 / 60); steps++;
      for (const f of g.entities) {
        if (![f.pos.x, f.pos.y, f.pos.z, f.vel.x, f.vel.y, f.vel.z, f.hp, f.ki].every(Number.isFinite)) {
          bad.push({ step: steps, id: f.def.id, pos: f.pos.toArray(), hp: f.hp, ki: f.ki });
        }
      }
      if (bad.length) break;
      if (steps % 300 === 0) samples.push({ steps, simulatedSeconds: g.time - start, entities: g.entities.length, projectiles: g.projectiles.list.length, hits, kos });
    }
    const simulatedSeconds = g.time - start;
    return { roster, steps, simulatedSeconds, hits, damage, kos, invalidStates: bad, samples,
      final: fighters.map(f => ({ id: f.def.id, hp: f.hp, ki: f.ki, pos: f.pos.toArray() })),
      ok: simulatedSeconds >= 30 && !bad.length && hits > 0 && damage > 0 };
  },roster);
} catch (e) { errors.push(String(e.stack || e)); }
finally { await browser.close(); }
await mkdir('artifacts/flight-review', { recursive: true });
await writeFile(`artifacts/flight-review/${arena?'arena-combat-soak':'combat-soak'}.json`, JSON.stringify({ baseURL, result, errors }, null, 2));
console.log(JSON.stringify({ ok: !!result?.ok && !errors.length, seconds: result?.simulatedSeconds, fighters: result?.roster.length, hits: result?.hits, kos: result?.kos, invalidStates: result?.invalidStates, errors }));
if (!result?.ok || errors.length) process.exitCode = 1;

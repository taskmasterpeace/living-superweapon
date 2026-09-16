// Build the publishable POWER CATALOG page from artifacts/power-catalog/index.json + sheets/.
// (Refs #42 L1 — the gallery half of the capture pipeline. Rerun after every recapture.)
//   node tools/catalog-page.mjs   →  artifacts/power-catalog/catalog-page.html
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { execSync } from 'node:child_process';

const OUT = 'artifacts/power-catalog';
const idx = JSON.parse(await readFile(`${OUT}/index.json`, 'utf8'));
const sheets = new Set(await readdir(`${OUT}/sheets`).catch(() => []));
let rev = 'unknown'; try { rev = execSync('git rev-parse --short HEAD').toString().trim(); } catch {}
let branch = ''; try { branch = execSync('git branch --show-current').toString().trim(); } catch {}

const byHero = new Map();
for (const r of idx.rows) { if (!byHero.has(r.hero)) byHero.set(r.hero, []); byHero.get(r.hero).push(r); }
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nAb = idx.rows.length, nDead = idx.rows.filter(r => r.fired === false).length;
const nBeam = idx.rows.filter(r => r.type === 'beam').length;
const types = [...new Set(idx.rows.map(r => r.type))].length;
const when = (idx.when || '').slice(0, 10);

const heroSection = (id, list) => {
  const name = list[0].heroName || id.toUpperCase();
  const sheet = sheets.has(id + '.jpg') ? `<img loading="lazy" src="sheets/${id}.jpg" alt="${esc(name)} attack contact sheet">` : '<p class="miss">sheet missing</p>';
  const caps = list.map((r, i) =>
    `<li${r.fired === false ? ' class="dead"' : ''}><span class="nn">${String(i + 1).padStart(2, '0')}</span> <b>${esc(r.name)}</b>` +
    `<span class="meta">${esc(r.slot)} · ${esc(r.type)}${r.dtype ? ' · ' + esc(r.dtype) : ''}${r.fired === false ? ' · DID NOT FIRE' : ''}</span></li>`).join('');
  return `<section id="${id}"><h2>${esc(name)} <span class="hid">LSW-${esc(id)}</span></h2>${sheet}<ol class="caps">${caps}</ol></section>`;
};

const html = `<title>Power Catalog</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&display=swap">
<style>
:root{--ink:#141210;--surface:#1d1a16;--raised:#242019;--line:#2e2922;--line2:#3a342c;--gold:#f5b21a;--gold-pale:#f8cf6d;
--text:#e8e2d6;--text2:#cfc7b8;--dim:#8b8577;--danger:#ff3b3b;--info:#7fb0d0;
--disp:'Rajdhani',system-ui,sans-serif;--mono:'Cascadia Code',Consolas,ui-monospace,monospace}
body{background:var(--ink);color:var(--text);font:15px/1.5 var(--disp);margin:0;padding-block:0 48px;padding-inline:20px}
.wrap{max-width:1080px;margin:0 auto}
header{border-bottom:1px solid var(--line2);padding:26px 0 14px;margin-bottom:14px}
.klass{font:600 10px var(--mono);letter-spacing:.28em;color:var(--gold);text-transform:uppercase}
h1{font:700 34px/1.05 var(--disp);letter-spacing:.02em;margin:6px 0 4px;text-wrap:balance}
.sub{color:var(--dim);font:500 12px var(--mono)}
.strip{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0 6px}
.stat{background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:8px 14px;min-width:96px}
.stat b{display:block;font:700 22px var(--disp);color:var(--gold-pale);font-variant-numeric:tabular-nums}
.stat span{font:600 9.5px var(--mono);letter-spacing:.18em;color:var(--dim);text-transform:uppercase}
.note{background:var(--surface);border-left:3px solid var(--gold);border-radius:0 8px 8px 0;padding:10px 14px;color:var(--text2);margin:14px 0}
nav{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0 6px}
nav a{font:600 11px var(--mono);letter-spacing:.06em;color:var(--text2);background:var(--surface);border:1px solid var(--line);
border-radius:20px;padding:4px 10px;text-decoration:none}
nav a:hover{color:var(--gold);border-color:var(--gold)}
section{border-top:1px dashed var(--line2);padding-top:18px;margin-top:26px}
h2{font:700 22px var(--disp);letter-spacing:.04em;margin:0 0 10px;color:var(--gold-pale)}
.hid{font:600 10px var(--mono);letter-spacing:.22em;color:var(--dim);margin-left:10px}
section img{width:100%;border:1px solid var(--line2);border-radius:8px;background:#000}
.caps{list-style:none;margin:10px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:4px 18px}
.caps li{font-size:13.5px;color:var(--text2);padding:2px 0;border-bottom:1px solid var(--line)}
.caps .nn{font:600 11px var(--mono);color:var(--gold);margin-right:6px}
.caps .meta{display:block;font:500 10.5px var(--mono);letter-spacing:.05em;color:var(--dim)}
.caps .dead b{color:var(--danger)}
.miss{color:var(--danger);font-family:var(--mono)}
footer{margin-top:40px;color:var(--dim);font:500 10.5px var(--mono);border-top:1px solid var(--line2);padding-top:12px}
@media (max-width:520px){h1{font-size:26px}.caps{grid-template-columns:1fr}}
</style>
<div class="wrap">
<header>
  <div class="klass">Threshold Registry · Baseline Survey · ${esc(when)}</div>
  <h1>THE POWER CATALOG</h1>
  <div class="sub">every registered weapon's every attack, as it renders today · ${esc(branch)} @ ${esc(rev)} · powerworld training stage, night, side-on</div>
  <div class="strip">
    <div class="stat"><b>${byHero.size}</b><span>weapons</span></div>
    <div class="stat"><b>${nAb}</b><span>abilities</span></div>
    <div class="stat"><b>${types}</b><span>ability types</span></div>
    <div class="stat"><b>${nBeam}</b><span>beams</span></div>
    <div class="stat"><b>${nDead}</b><span>did not fire</span></div>
  </div>
  <div class="note">This is the <b>BEFORE</b>. Read each sheet left→right, top→bottom against its numbered list.
  The makeover measures itself against these frames — and this board is where the ice person and the fire person
  for the showcase get picked (SOL and VEGAS are already in).</div>
  <nav>${[...byHero.keys()].map(id => `<a href="#${id}">${esc(byHero.get(id)[0].heroName || id)}</a>`).join('')}</nav>
</header>
${[...byHero.entries()].map(([id, list]) => heroSection(id, list)).join('\n')}
<footer>WAR WORLD ASCENDANTS · beam &amp; projectile makeover baseline · captured by tools/capture-powers.mjs · living-superweapon#42</footer>
</div>`;

await writeFile(`${OUT}/catalog-page.html`, html);
console.log(`catalog-page.html written — ${byHero.size} heroes, ${nAb} abilities, ${nDead} dead, sheets present: ${sheets.size}`);

// ORPHAN AUDIT — built-but-unreachable content. Pure Node: `node src/bench/orphans.mjs`
//
// This repo builds faster than it connects, so the cheapest hour available is almost always spent
// on something already written. These numbers came from ad-hoc greps once; a throwaway grep cannot
// be re-run in three weeks, so it lives here and is measured off the live source every time.
//
// ⚠ CAVEATS, stated so nobody trusts it blindly. The armory and leaf-query classes are substring
// greps, so a short or common identifier can produce a FALSE PASS (`knife`, `smoke`, `plate`
// collide with unrelated code) — check any surprising pass, not just the failures. The `importers`
// column is the honest signal; the percentage is a hint. And nothing here proves a system is GOOD,
// only that it is REACHABLE. Read docs/BACKLOG.md before calling anything an orphan: several are
// parked on purpose and headroom is deliberate.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');   // .../src
const rel = p => p.slice(SRC.length + 1).split(path.sep).join('/');
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    f.isDirectory() ? walk(p) : p.endsWith('.js') && files.push(p);
  }
})(SRC);
const text = new Map(files.map(p => [rel(p), fs.readFileSync(p, 'utf8')]));
const usedOutside = (needle, own) => [...text].some(([p, s]) => p !== own && s.includes(needle));

const { ROSTER } = await import('../data/characters.js');
const { POWERS } = await import('../data/creator.js');
const { FIREARMS, BLADES, GEAR } = await import('../data/armory.js');
const { TYPE_META } = await import('../engine/abilityMeta.js');

const out = [];
const say = (...a) => { const l = a.join(' '); out.push(l); console.log(l); };

const slots = ROSTER.flatMap(d => Object.entries(d.abilities || {}).map(([slot, ab]) => ({ hero: d.id, slot, ab })));
const rosterNames = new Set(slots.map(s => (s.ab.name || '').toLowerCase()));

// ---- 1. ability TYPES the engine implements that no character carries
const usedTypes = new Set(slots.map(s => s.ab.type));
const deadTypes = Object.keys(TYPE_META).filter(t => !usedTypes.has(t));
say(`TYPES     ${Object.keys(TYPE_META).length} declared · ${usedTypes.size} carried · ${deadTypes.length} DEAD`);
say(`          ${deadTypes.join(', ')}`);

// ---- 2. ORIGIN catalog rows no roster hero carries
const deadPowers = POWERS.filter(p => !rosterNames.has(((p.ab && p.ab.name) || p.name).toLowerCase()));
say(`ORIGIN    ${POWERS.length} catalog powers · ${deadPowers.length} carried by NO roster hero`);

// ---- 3. armory rows in nobody's hands
const armory = [...FIREARMS, ...BLADES, ...GEAR];
const fighters = (text.get('data/characters.js') || '') + (text.get('engine/police.js') || '');
const deadGuns = armory.filter(w => !fighters.includes(`'${w.id}'`));
say(`ARMORY    ${armory.length} weapons/gear · ${deadGuns.length} on no fighter in characters.js or police.js`);

// ---- 4. MODULE REACH — how much of each data module the rest of the game actually uses.
//         The top of this list, ascending, IS the work queue.
const reach = [];
for (const [p, s] of text) {
  if (!p.startsWith('data/')) continue;
  const names = [...s.matchAll(/^export (?:const|function|let|class)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);
  if (!names.length) continue;
  const hit = names.filter(n => n.length >= 4 && usedOutside(n, p));
  const importers = [...text].filter(([q, t]) => q !== p && t.includes(path.basename(p))).length;
  reach.push({ p, total: names.length, hit: hit.length, importers });
}
reach.sort((a, b) => (a.hit / a.total) - (b.hit / b.total) || a.importers - b.importers);
say(`REACH     module                       exports used elsewhere   importers`);
for (const r of reach.slice(0, 12)) {
  const pct = Math.round(100 * r.hit / r.total);
  say(`          ${r.p.padEnd(28)} ${String(r.hit).padStart(3)}/${String(r.total).padEnd(3)} ${String(pct).padStart(4)}%      ${r.importers}`);
}

// ---- 5. DOORS — what a player can actually reach
const modes = [...(text.get('data/modes.js') || '').matchAll(/id: '([a-z]+)'/g)].map(m => m[1]);
const overlays = [...new Set([...((text.get('engine/hud.js') || '') + (text.get('engine/hudTitle.js') || '')).matchAll(/\bshow[A-Z][A-Za-z]+/g)].map(m => m[0]))].sort();
say(`DOORS     mode cards: ${modes.join(', ')}`);
say(`          overlays:   ${overlays.join(', ')}`);

fs.writeFileSync(path.join(SRC, 'bench', 'orphans.txt'), out.join('\n') + '\n');
say(`\nwritten to src/bench/orphans.txt`);

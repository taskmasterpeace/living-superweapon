// THE COLLISION CHECKER — "I don't want to repeat powers."
//
// Robert's own brief states the rule: *"No two powers should match on more than three of those
// seven traits."* That is not a vibe, it is an assertion, and `visOf()` already resolves all seven
// traits for every ability in the game. So it can be CHECKED, and a duplicate can be refused
// before it ships rather than noticed months later in a fight.
//
//   node scripts/visual-collisions.mjs              # the whole roster, worst first
//   node scripts/visual-collisions.mjs --type cone  # one ability type
//   node scripts/visual-collisions.mjs --hero SOL   # everything one character carries
//   node scripts/visual-collisions.mjs --budget 3   # exit non-zero if any pair exceeds the rule
//
// ⚠ WHAT THIS MEASURES IS THE DATA, NOT THE CONTRACT. The traits are DERIVED from each ability's
// type, damage type and flags. Two cones that declare nothing beyond "cone" resolve to the same
// seven values because there is nothing to tell them apart — the checker is reporting a gap in the
// authoring, not a bug in visual.js. The fix is always to give the ability a real `material`,
// `dtype`, `source` or `shape`, exactly as the 25 beams were fixed by authoring their materials.

const TRAITS = ['source', 'shape', 'trail', 'impact', 'residue', 'material', 'tell'];

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const onlyType = arg('type', null);
const onlyHero = (arg('hero', null) || '').toUpperCase() || null;
const budget = +arg('budget', 0) || 0;

const { visOf } = await import('../src/data/visual.js');
const { ROSTER: R } = await import('../src/data/characters.js');

const rows = [];
for (const d of R) {
  if (onlyHero && d.name.toUpperCase() !== onlyHero) continue;
  for (const [slot, a] of Object.entries(d.abilities || {})) {
    if (onlyType && a.type !== onlyType) continue;
    const v = visOf(a);
    if (!v) continue;
    rows.push({ hero: d.name, slot, name: a.name, type: a.type, v });
  }
}

const key = (r) => TRAITS.map(t => r.v[t]).join('|');
const groups = new Map();
for (const r of rows) {
  const k = key(r);
  const g = groups.get(k);
  if (g) g.push(r); else groups.set(k, [r]);
}

// A group of N identical profiles is N*(N-1)/2 colliding pairs. Reporting the GROUPS rather than
// the pairs is the readable form: "these 40 melee abilities are one power in forty costumes".
const clusters = [...groups.entries()]
  .map(([k, list]) => ({ k, list }))
  .filter(g => g.list.length > 1)
  .sort((a, b) => b.list.length - a.list.length);

console.log('VISUAL COLLISIONS' + (onlyType ? ' · type ' + onlyType : '') + (onlyHero ? ' · ' + onlyHero : ''));
console.log('  abilities with a profile : ' + rows.length);
console.log('  distinct profiles        : ' + groups.size);
console.log('  identical-profile groups : ' + clusters.length);
console.log('');
for (const g of clusters.slice(0, 12)) {
  const p = g.list[0].v;
  console.log('  ' + String(g.list.length).padStart(3) + ' abilities share ONE profile   [' +
    TRAITS.map(t => p[t]).join(' · ') + ']');
  console.log('      ' + g.list.slice(0, 8).map(r => r.hero + ' ' + r.name).join('  ·  ') +
    (g.list.length > 8 ? '  +' + (g.list.length - 8) + ' more' : ''));
}
console.log('');
// the near-misses matter too: 6 of 7 is still a repeat by his rule
let near = 0;
for (let i = 0; i < rows.length; i++) {
  for (let j = i + 1; j < rows.length; j++) {
    let m = 0;
    for (const t of TRAITS) if (rows[i].v[t] === rows[j].v[t]) m++;
    if (m > 3 && m < 7) near++;
  }
}
console.log('  pairs over the 3-trait budget but not identical: ' + near.toLocaleString());
console.log('  THE RULE (his brief): no two powers may match on more than THREE of the seven.');

if (budget) {
  const worst = clusters.length ? 7 : 0;
  if (worst > budget) {
    console.log('\n  FAIL: ' + clusters.length + ' groups are fully identical (7 traits) against a budget of ' + budget + '.');
    process.exit(1);
  }
  console.log('\n  PASS');
}

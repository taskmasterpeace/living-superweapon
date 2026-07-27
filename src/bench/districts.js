// =================================================================================================
// THE DISTRICT REACTION TABLE — does WHERE you fight actually change HOW the fight goes?
//
// Run it from the browser console (needs a real WebGL context):
//     await window.LSW.districtSuite()
//
// ⚠ LAW 1 — DRIVE THE GATE. Reading `DISTRICTS.military.respond` back and printing it proves
// nothing except that I can read my own table. Every number below is produced by putting a REAL
// fight in a REAL cell of that type and measuring the outcome: the crowd is COUNTED off the
// pedestrian layer's own arrays after the real `setCity`; the response seconds come out of
// `police.update()` after real civilians are really knocked down; the heat is what `onCivHarm`
// actually booked; the hazard damage is what a fighter's hp actually lost when the structure
// really shattered.
// ⚠ LAW 4 — THE HARNESS PROVES ITSELF FIRST. Check 0 is that a plan can be built and that a cell
// of the wanted type can be FOUND. If the map has no military district, every military measurement
// afterwards is measuring a plaza and would go green while proving nothing.
// ⚠ The city has to be REBUILT per district test (`world.rebuildCity`), because the crowd, the
// cover tags and the plan all come from that one call — poking `world.plan` alone leaves the
// pedestrians standing in the previous city.
// =================================================================================================
import { generatePlan, applyPlanEdits } from '../data/cityplan.js';
import { cityList } from '../data/cities.js';
import { DISTRICTS, districtRow, validateDistricts } from '../data/districts.js';

const DT = 1 / 60;

export async function districtSuite(game, hud, opts = {}) {
  const R = [];
  const ok = (name, pass, got) => { R.push({ name, pass, got: got == null ? '' : String(got) }); };
  const step = (n) => { for (let i = 0; i < n; i++) game.update(DT); };

  // ---- 0 · THE HARNESS PROVES ITSELF ----------------------------------------------------------
  const vp = validateDistricts();
  ok('the table validates (every tile type has a row)', vp.length === 0, vp.map(p => p.t + ': ' + p.msg).join(' | ') || '0 problems');

  // ⚠ ONE CITY, ONE CELL, ONLY THE DISTRICT CHANGES. Hunting for a real city that happens to
  // contain all five districts was the first version, and it is a BAD EXPERIMENT even when it
  // finds one: the police ETA also reads the city's safety index and the country's law budget, so
  // comparing a military district in Cairo against a resort in Tokyo measures three things at once
  // and attributes all of it to the district. Painting the SAME cells of the SAME city holds the
  // country, the safety index, the population and even the position fixed.
  // ⚠ Painted through `applyPlanEdits` — the map editor's own door, which re-derives the sockets
  // and the road graph. Writing `plan.cells[r][c].t` by hand would leave both stale, and the test
  // would then be running on a city the generator would never produce.
  const cities = cityList();
  const seed = opts.seed || 7;
  const row = cities.find(c => c.name === (opts.city || 'Tokyo')) || cities[0];
  const base = generatePlan(row, seed, { popType: 'Mega City' });
  const N = base.N, K = base.cell || 96, A = base.arena;
  const r0 = Math.max(1, (N >> 1) - 1), c0 = Math.max(1, (N >> 1) - 1);   // a 3×3 patch mid-map
  const at = { x: -A + (c0 + 1.5) * K, z: -A + (r0 + 1.5) * K };          // its centre
  const paint = (t) => {
    const p = generatePlan(row, seed, { popType: 'Mega City' });
    const edits = {};
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) edits[`${r0 + i},${c0 + j}`] = { t, v: 0, sz: 0 };
    applyPlanEdits(p, edits);
    return p;
  };
  const WANT = opts.want || ['military', 'hospital', 'industrial', 'resort', 'park'];
  const probe = paint('military');
  const painted = probe.cells[r0][c0] && probe.cells[r0][c0].t === 'military';
  ok('the district under the fight is really the one we painted', painted,
    `${row.name} seed ${seed} · 3×3 patch at cell ${r0},${c0} · reads "${probe.cells[r0][c0] && probe.cells[r0][c0].t}"`);
  if (!painted) return report(R, {});

  // ---- THE MEASUREMENT -------------------------------------------------------------------------
  const measure = (type) => {
    const plan = paint(type);
    // ⚠ ORDER IS LOAD-BEARING: `startMode` runs `clearTransients`, which empties the cover list —
    // rebuild the city AFTER it or the fight happens in an empty world with nothing to break.
    game.startMode('duel', { p1: 'sol', p2: 'rage' });
    game.world.rebuildCity(plan);                    // the ONE call the crowd/cover/plan all hang off
    const P = game.player;
    P.pos.set(at.x, 0, at.z);
    step(2);

    // --- CROWD: count the civilians actually standing in this district ---------------------------
    const peds = game.peds, HK = (plan.cell || 96) * 1.5;    // the 3×3 patch's half-extent
    let inDistrict = 0;
    for (let i = 0; i < peds.n; i++)
      if (Math.abs(peds.px[i] - at.x) < HK && Math.abs(peds.pz[i] - at.z) < HK) inDistrict++;

    // --- HAZARD: destroy a structure here, with a fighter standing next to it ---------------------
    // Find this district's own cover box (tagged by buildTiles) and break it through the real door.
    const cov = game.world.cover.find(c => c.district === type && c.hp > 0 &&
      Math.abs(c.x - at.x) < HK && Math.abs(c.z - at.z) < HK);
    let hazardDmg = 0, ventSeen = false;
    const V = game.entities.find(e => e !== P && e.alive && e.def && !e.def.police && !e.isDummy);
    if (cov && V) {
      V.pos.set(cov.x + 12, 0, cov.z);               // right beside it, inside every hazard radius
      V.invuln = 0; V.hp = V.maxHp;
      const hp0 = V.hp;
      // ⚠ THE REAL DAMAGE DOOR — the same function a punch, a blast and a thrown car call.
      game.damageBlock(cov, cov.hp * 0.5, { x: cov.x, y: 8, z: cov.z }, P);   // soften it → the VENT tell
      ventSeen = !!cov._ventSeen;
      game.damageBlock(cov, cov.hp + 1, { x: cov.x, y: 8, z: cov.z }, P);     // ...and break it
      step(4);
      hazardDmg = Math.max(0, hp0 - V.hp);
    }

    // --- RESPONSE + HEAT: hurt real civilians here and let the real dispatcher run ----------------
    const P2 = P; P2.pos.set(at.x, 0, at.z);
    game.police.reset();
    game.cityStats.civs = 0;
    // put civilians where the blast will catch them, so the harm is real rather than asserted
    for (let i = 0; i < Math.min(6, game.peds.n); i++) {
      game.peds.px[i] = at.x + (i - 3) * 3; game.peds.pz[i] = at.z + 2; game.peds.state[i] = 0;
    }
    const heat0 = game.police.heatOf(P2);
    // ⚠ THE REAL EXPLOSION — worldImpact is what every blast in the game calls, and it is what
    // books collateral through `onCivHarm`. Nothing here calls `heat.set`.
    game.worldImpact({ x: at.x, y: 3, z: at.z }, 26, 2.4, P2);
    const heat = game.police.heatOf(P2) - heat0;
    const civs = game.cityStats.civs;
    // now let the dispatcher decide when units arrive — read the clock it set, not the table
    let eta = null;
    for (let i = 0; i < 40 && eta == null; i++) { game.police.update(DT); if (game.police._respT > 0) eta = game.police._respT; }

    return { type, crowd: inDistrict, hazardDmg, ventSeen, heat, civs, eta, cover: !!cov };
  };

  const M = {};
  for (const t of WANT) { try { M[t] = measure(t); } catch (e) { M[t] = { type: t, err: e.message }; } }

  // ---- THE ASSERTIONS — every one is a COMPARISON between two real fights ----------------------
  const g = (t, k) => (M[t] && M[t][k]) || 0;

  ok('MILITARY has no civilians on the street', g('military', 'crowd') === 0,
    `military ${g('military', 'crowd')} vs resort ${g('resort', 'crowd')}`);
  ok('a RESORT street is thicker than an INDUSTRIAL one', g('resort', 'crowd') > g('industrial', 'crowd'),
    `resort ${g('resort', 'crowd')} · industrial ${g('industrial', 'crowd')}`);

  ok('the state answers a MILITARY call faster than an INDUSTRIAL one', g('military', 'eta') < g('industrial', 'eta'),
    `military ${fx(g('military', 'eta'))}s · industrial ${fx(g('industrial', 'eta'))}s`);
  ok('a RESORT is protected faster than an INDUSTRIAL edge', g('resort', 'eta') < g('industrial', 'eta'),
    `resort ${fx(g('resort', 'eta'))}s · industrial ${fx(g('industrial', 'eta'))}s`);

  ok('the same act books MORE heat outside a HOSPITAL than on an INDUSTRIAL estate',
    perCiv(M.hospital) > perCiv(M.industrial),
    `hospital ${fx(perCiv(M.hospital))}/civ · industrial ${fx(perCiv(M.industrial))}/civ`);

  ok('breaking an INDUSTRIAL structure hurts; breaking a PARK does not',
    g('industrial', 'hazardDmg') > 0 && g('park', 'hazardDmg') === 0,
    `industrial ${fx(g('industrial', 'hazardDmg'))} dmg · park ${fx(g('park', 'hazardDmg'))} dmg`);
  ok('a MILITARY structure is the worst thing in the city to break',
    g('military', 'hazardDmg') > g('industrial', 'hazardDmg'),
    `military ${fx(g('military', 'hazardDmg'))} · industrial ${fx(g('industrial', 'hazardDmg'))}`);
  ok('the hazard WARNS before it goes off', !!(M.industrial && M.industrial.ventSeen), 'vent tell fired on the industrial tank');

  // ---- POPULATION AND SIZE ---------------------------------------------------------------------
  // Robert asked for it directly. Measured through the same `setCity` the game calls.
  const crowdFor = (popType) => {
    const p = generatePlan(row, 3, { popType });
    game.startMode('duel', { p1: 'sol', p2: 'rage' });
    game.world.rebuildCity(p); step(2);
    return game.peds.n;
  };
  const vil = crowdFor('Village'), mega = crowdFor('Mega City');
  ok('a MEGA CITY street carries more people than a VILLAGE', mega > vil, `village ${vil} · mega city ${mega}`);

  return report(R, M);
}

const fx = (v) => (v == null ? 'n/a' : (Math.round(v * 100) / 100).toFixed(2));
const perCiv = (m) => (m && m.civs ? m.heat / m.civs : 0);

function report(R, M) {
  const pass = R.filter(r => r.pass).length, fail = R.length - pass;
  console.log('\n=== THE DISTRICT REACTION TABLE ===');
  for (const r of R) console.log((r.pass ? '  ok   ' : '  FAIL ') + r.name.padEnd(64) + r.got);
  console.log('\n  PER-DISTRICT MEASUREMENTS (real fights, real numbers)');
  console.log('  ' + 'DISTRICT'.padEnd(13) + 'CROWD'.padEnd(8) + 'ETA'.padEnd(9) + 'HEAT/CIV'.padEnd(11) + 'HAZARD DMG');
  for (const k of Object.keys(M)) {
    const m = M[k]; if (!m || m.err) { console.log('  ' + k.padEnd(13) + 'ERROR ' + (m && m.err)); continue; }
    console.log('  ' + k.padEnd(13) + String(m.crowd).padEnd(8) + (fx(m.eta) + 's').padEnd(9) +
      fx(perCiv(m)).padEnd(11) + fx(m.hazardDmg));
  }
  console.log(`\n  ${pass}/${R.length} passed, ${fail} failed\n`);
  return { pass, fail, rows: R, measurements: M };
}

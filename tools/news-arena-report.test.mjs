import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReport, writeBroadcast, tapeRows, llmPunchUp } from '../src/data/news.js';

function fighter(id, name, kills, team) {
  return { def: { id, title: 'Arena Fighter', threat: 'High', colors: { accent: '#dca944' } },
    name, kills, team, alive: true, level: 4, tier: 2, pos: { x: 0, y: 0, z: 0 },
    stats: { dmg: kills * 30, taken: 40, big: 28, bigKind: 'fists' } };
}
function fixture(modeId = 'powerworld') {
  const player = fighter('sol', 'SOL', 1, 0), enemy = fighter('vega', 'VEGA', 5, 1);
  const game = {
    modeId, player, humans: [{ fighter: player }], entities: [player, enemy],
    ms: { p1: player, enemy, p1KO: 1, enemyKO: 5 }, matchT: 41,
    world: { dayT: 0.3, districtAt: () => 'MIDTOWN PLAZA', plan: { name: 'OLD CITY', country: 'US', safety: 20 } },
    cityStats: { civs: 2, cars: 1, blocks: 3, craters: 4, cops: 1 },
    matchLog: [{ type: 'police', v: 'SOL' }, { type: 'ko', vid: 'vega', kid: 'sol', at: 'MIDTOWN PLAZA', kind: 'beam', t: 40 }],
    bigHit: { amount: 35, by: player, kind: 'fists' },
    news: { clips: [], reporterName: 'DANA OKAFOR', operatorName: 'J. WHITFIELD' },
    police: { wantedLevel: () => 2 }, isHuman: f => f === player,
  };
  return game;
}

for (const [mode, venue] of [['powerworld', 'POWERWORLD'], ['ascendance', 'ASCENDANCE ARENA']]) {
  test(`${mode} follows its declared result and actual participants without inherited city claims`, () => {
    const g = fixture(mode), rep = buildReport(g, { win: true, title: 'VICTORY' });
    assert.equal(rep.arena, true);
    assert.equal(rep.district, venue); assert.equal(rep.place, null);
    assert.equal(rep.winner.name, 'SOL', 'the actual result beats an irrelevant KO ranking');
    assert.equal(rep.loser.name, 'VEGA');
    assert.equal(rep.participantCount, 2);
    assert.deepEqual(rep.participants.map(f => f.name), ['SOL', 'VEGA']);
    assert.equal(rep.clips, g.news.clips);
    assert.deepEqual(rep.policeEv, []); assert.equal(rep.a.wanted, 0);
    assert.deepEqual(rep.city, { civs: 0, cars: 0, blocks: 0, craters: 0, cops: 0 });
    const b = writeBroadcast(rep);
    assert.ok(b.headline.includes('SOL') && b.headline.includes('VEGA') && b.headline.includes(venue));
    assert.equal(b.witness, null); assert.equal(b.est, 0);
    const copy = [b.headline, ...b.script.map(s => s.text), ...b.ticker].join(' ');
    assert.doesNotMatch(copy, /MIDTOWN|OLD CITY|four-way|bystander|resident|civilian|police|mayor|city desk|damages|\$/i);
    const tape = tapeRows(rep); assert.equal(tape.cols.length, 2); assert.ok(tape.rows.length > 3);
    assert.equal(g.cityStats.blocks, 3, 'report normalization must not change the live city counters');
  });
}

test('a losing result reports the opposing winner rather than the human', () => {
  const g = fixture(), rep = buildReport(g, { win: false, title: 'DEFEAT' });
  assert.equal(rep.winner.name, 'VEGA'); assert.equal(rep.loser.name, 'SOL');
  assert.ok(writeBroadcast(rep).headline.startsWith('VEGA'));
});

test('an explicit winner in a three-person bout is honored with an accurate participant count', () => {
  const g = fixture(); const third = fighter('rime', 'RIME', 0, 2);
  g.entities.push(third, { ...fighter('dummy', 'DUMMY', 99, 3), isDummy: true });
  const rep = buildReport(g, { win: false, title: 'BOUT COMPLETE', winner: third });
  assert.equal(rep.winner.name, 'RIME'); assert.equal(rep.participantCount, 3);
  const b = writeBroadcast(rep), script = b.script.map(s => s.text).join(' ');
  assert.ok(b.headline.includes('RIME')); assert.match(script, /3 combatants/);
  assert.doesNotMatch(JSON.stringify(b), /DUMMY|four-way|Midtown/i);
});

test('a drawn arena bout does not invent a victor', () => {
  const rep = buildReport(fixture(), { win: false, draw: true, title: 'DRAW' });
  assert.equal(rep.winner, null); assert.equal(rep.loser, null);
  assert.match(writeBroadcast(rep).headline, /DRAW/);
});

test('operation defeat reports the failed objective without inventing an opposing winner', () => {
  const g=fixture();g.entities.push(fighter('zombie','SHAMBLER',0,1));
  const rep=buildReport(g,{win:false,title:'OVERRUN',operation:'outbreak',lines:['Wave 2 of 3 reached.']});
  const b=writeBroadcast(rep),copy=b.script.map(s=>s.text).join(' ');
  assert.equal(b.headline,'OVERRUN · POWERWORLD');assert.equal(b.kicker,'OPERATION FAILED');
  assert.match(copy,/Wave 2 of 3 reached/);assert.doesNotMatch(copy,/without a declared winner/);
  assert.equal(rep.winner,null);
});
test('operation victory reports extraction receipt rather than a duel victory', () => {
  const g=fixture(),rep=buildReport(g,{win:true,title:'SAMPLE EXTRACTED',operation:'clone-recovery',lines:['Clone sample secured.']});
  const b=writeBroadcast(rep);assert.equal(b.kicker,'OPERATION COMPLETE');
  assert.equal(b.headline,'SAMPLE EXTRACTED · POWERWORLD');assert.match(b.script.map(s=>s.text).join(' '),/Clone sample secured/);
});

for(const win of [true,false])test(`research convoy ${win?'delivery':'partial failure'} keeps authoritative outcome and rewards`,()=>{
 const lines=[win?'Scientist and cargo delivered.':'Scientist lost. Live recovery failed.',win?'Supplies +70 · Research +30':'Supplies +20 · Research +15'];
 const rep=buildReport(fixture(),{win,title:win?'RESEARCH SECURED':'OPERATION FAILED',operation:'research-convoy',lines});
 const b=writeBroadcast(rep),copy=JSON.stringify(b);
 for(const line of lines)assert.ok(copy.includes(line));
 assert.equal(rep.operation.id,'research-convoy');assert.match(b.ticker[1],/^OPERATION TIME/);
 assert.doesNotMatch(copy,/WINS.*BOUT|versus|arena action|BOUT TIME/);
 if(!win)assert.equal(rep.winner,null);
});
test('ordinary city duels retain district, police, witness and damage coverage', () => {
  const g = fixture('duel'), rep = buildReport(g, { win: true, title: 'VICTORY' });
  assert.equal(rep.kind, 'duel'); assert.equal(rep.winner.name, 'SOL');
  assert.equal(rep.district, 'MIDTOWN PLAZA'); assert.equal(rep.place.name, 'OLD CITY');
  assert.equal(rep.city, g.cityStats); assert.equal(rep.policeEv.length, 1); assert.equal(rep.a.wanted, 2);
  const b = writeBroadcast(rep);
  assert.ok(b.witness?.quote); assert.ok(b.est > 7e6 && b.est < 7.7e6);
  assert.match(b.script.map(s => s.text).join(' '), /city desk|City units/);
});

test('arena report never invokes the city witness LLM prompt', async () => {
  const rep = buildReport(fixture(), { win: true, title: 'VICTORY' });
  const originalFetch = globalThis.fetch, originalStorage = globalThis.localStorage;
  let requests = 0;
  globalThis.localStorage = { getItem: () => null };
  globalThis.fetch = async () => { requests++; return { ok: false }; };
  try {
    assert.equal(await llmPunchUp(rep, writeBroadcast(rep)), null);
    assert.equal(requests, 0, 'a city-specific generator must not reintroduce fictional arena witnesses');
  } finally { globalThis.fetch = originalFetch; globalThis.localStorage = originalStorage; }
});

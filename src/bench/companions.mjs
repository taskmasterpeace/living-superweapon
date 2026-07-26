// COMPANION TABLE SELF-CHECK — `node src/bench/companions.mjs`
//
// ⚠ THE FAILURE MODES HERE ARE SILENT: one breed quietly better at everything, or a word on the
// aptitude ladder that nobody occupies. Both look fine in review and are dead on arrival in play.
// This is the ship gate's item 6 — numbers from the distribution — made runnable.
import * as C from '../data/companions.js';

let pass = 0, fail = 0;
const ok = (n, p, d) => { (p ? pass++ : fail++); console.log((p ? '  ok   ' : '  FAIL ') + n.padEnd(52) + (d || '')); };

const v = C.verify();
ok('the table checks itself', v.problems.length === 0,
  v.breeds + ' breeds × ' + v.axes + ' axes · ' + (v.problems.join(' | ') || 'no problems'));

console.log('\n  APTITUDE LADDER — ranked against the population, not hand-picked');
console.log('  ' + 'BREED'.padEnd(24) + C.AXIS_IDS.map(a => a.slice(0, 5).toUpperCase().padEnd(13)).join(''));
for (const b of C.BREED_IDS) {
  console.log('  ' + C.BREEDS[b].n.padEnd(24) + C.AXIS_IDS.map(a => C.aptWord(b, a).padEnd(13)).join(''));
}

const hound = C.makeCompanion('bloodhound');
ok('a dog outsmells a person by orders of magnitude', C.vsHuman(hound, 'scent') > 50,
  '×' + Math.round(C.vsHuman(hound, 'scent')));
ok('nothing is locked out of anything',
  C.BREED_IDS.every(b => C.AXIS_IDS.every(a => C.ceiling({ breed: b }, a) > 0)));

// ⚠ APTITUDE IS A CEILING, BIDDABILITY IS A RATE. This is the assertion that proves "all dogs to a
// certain degree" is real and not a comment: the collie must LEARN faster and still never get there.
console.log('\n  TRAINING — forty career weeks of bite work');
const bite = (id) => {
  const c = C.makeCompanion(id); const g = [];
  for (let w = 0; w < 40; w++) g.push(C.trainWeek(c, 'bite', 1));
  return { c, first: g[0], cap: C.ceiling(c, 'bite'), got: C.trained(c, 'bite') };
};
const A = bite('collie'), B = bite('dutch'), D = bite('bloodhound');
for (const [n, r] of [['BORDER COLLIE', A], ['DUTCH SHEPHERD', B], ['BLOODHOUND', D]]) {
  console.log('  ' + n.padEnd(18) + 'week1 +' + r.first.toFixed(3) + '   after 40wk ' +
    r.got.toFixed(2) + ' / ceiling ' + r.cap.toFixed(2));
}
ok('the collie LEARNS bite faster than the shepherd', A.first > B.first,
  '+' + A.first.toFixed(3) + ' vs +' + B.first.toFixed(3) + ' per week');
ok('...and still never bites as hard', C.raw(A.c, 'bite') < C.raw(B.c, 'bite'),
  'trained collie ' + C.raw(A.c, 'bite').toFixed(2) + ' < trained shepherd ' + C.raw(B.c, 'bite').toFixed(2));
ok('a bloodhound trained a year on bite is still a bloodhound', D.cap < 0.4, 'ceiling ' + D.cap.toFixed(2));

console.log('\n  THE BOND — support is an appraisal change, not a happy buff');
const doodle = C.makeCompanion('labradoodle');
const e0 = C.steadyEffect(doodle);
doodle.weeks = 40; doodle.fights = 20; doodle.saves = 3;
const e1 = C.steadyEffect(doodle);
const dutch = C.makeCompanion('dutch'); dutch.weeks = 40; dutch.fights = 20; dutch.saves = 3;
const e2 = C.steadyEffect(dutch);
console.log('  labradoodle NEW          volatility ×' + e0.vol.toFixed(2) + '   rest +' + e0.rest.toFixed(2));
console.log('  labradoodle ' + C.bondWord(doodle).padEnd(13) + 'volatility ×' + e1.vol.toFixed(2) + '   rest +' + e1.rest.toFixed(2));
console.log('  dutch shep  ' + C.bondWord(dutch).padEnd(13) + 'volatility ×' + e2.vol.toFixed(2) + '   rest +' + e2.rest.toFixed(2));
ok('time together is what makes support work', e1.vol < e0.vol,
  'new ×' + e0.vol.toFixed(2) + ' -> paired ×' + e1.vol.toFixed(2));
ok('the assistance dog steadies more than the war dog', e1.vol < e2.vol,
  e1.vol.toFixed(2) + ' vs ' + e2.vol.toFixed(2));

console.log('\nfailing: ' + fail + '/' + (pass + fail));
process.exit(fail ? 1 : 0);

import test from 'node:test';
import assert from 'node:assert/strict';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';

for (const status of ['sleepT','downedT']) for (const phase of ['startup','active','recover']) {
 test(`${status} cancels ${phase} and discards buffered melee`,()=>{
  const x=mainCombatFixture({mode:'powerworld'});
  try {
   const f=x.p;
   x.g.melee._beginStrike(f,'jab','light');
   f.mstate=phase;f.mT=.1;f._meleeBuffer=.18;f._meleeQueuedHeld=true;
   f[status]=1;
   x.g.melee.update(f,1/60);
   assert.equal(f.mstate,null);
   assert.equal(f.strikeActive,0);
   assert.equal(f._meleeMotion,null);
   assert.equal(f._meleeBuffer,null);
   assert.equal(f._meleeQueuedHeld,false);
  } finally {x.close();}
 });
}

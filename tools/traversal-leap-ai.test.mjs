import test from 'node:test';import assert from 'node:assert/strict';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {planTraversalLeap,driveTraversalLeapAI} from '../src/engine/traversal-leap.js';
test('planner picks reachable ground, rejects walls and respects energy',()=>{
 const x=mainCombatFixture({hero:'rage',mode:'powerworld'});try{const f=x.p,t=x.foe({z:180});f._openSky=true;x.w.ARENA=1800;
  assert.ok(planTraversalLeap(f,t,x.w));f.ki=0;assert.equal(planTraversalLeap(f,t,x.w),null);f.ki=90;
  x.w.cover.push({x:0,z:30,hx:100,hz:2,top:200});assert.equal(planTraversalLeap(f,t,x.w),null);
 }finally{x.close();}
});
for(const hz of [30,60,120])test(`bot controller charges and releases native leap at ${hz}Hz`,()=>{
 const x=mainCombatFixture({hero:'rage',mode:'powerworld'});try{const f=x.p,t=x.foe({z:180});f._openSky=true;x.w.ARENA=1800;f.ki=90;
  f.ai={intent:()=>({move:{x:0,z:1},aimDir:{x:0,z:1},target:t,fly:false,slots:{}})};
  let count=0;for(;count<hz;count++){x.g.time=count/hz;x.g.controlBot(f,1/hz);f._physics(1/hz,x.g);if(f._traversalLeap?.active)break;}
  assert.ok(f._traversalLeap?.active);assert.ok(f.vel.y>26);assert.ok(f.ki<90);assert.equal(f.flying,false);
 }finally{x.close();}
});
test('AI will not plan from an unseen target',()=>{const x=mainCombatFixture({hero:'rage',mode:'powerworld'});try{x.p._openSky=true;x.g.canSee=()=>false;const it={target:x.foe({z:180})};assert.equal(driveTraversalLeapAI(x.p,it,x.g,.016),false);assert.equal(x.p._aiTraversalLeap,undefined);}finally{x.close();}});

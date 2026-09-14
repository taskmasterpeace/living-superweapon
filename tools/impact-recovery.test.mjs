import test from 'node:test';import assert from 'node:assert/strict';import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';import {beginImpactRecovery,updateImpactRecovery} from '../src/engine/impact-recovery.js';
test('recovery pauses for freeze, holds action gate through thaw, and retires on new launch',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{const f=x.p;assert.ok(beginImpactRecovery(f));f.frozenT=.5;updateImpactRecovery(f,.2);assert.equal(f._impactRecovery.elapsed,0);f.frozenT=0;updateImpactRecovery(f,.2);assert.equal(f._impactRecovery.elapsed,.2);assert.equal(x.g.melee.canAct(f),false);f.vel.y=20;updateImpactRecovery(f,.1);assert.equal(f._impactRecovery,null);}finally{x.close();}
});
test('defeated and near-death actors never get a nonlethal recovery',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{const f=x.p;f.downedT=1;assert.equal(beginImpactRecovery(f),false);f.downedT=0;f.state='ko';assert.equal(beginImpactRecovery(f),false);f.state='idle';beginImpactRecovery(f);f.state='ko';updateImpactRecovery(f,.1);assert.equal(f._impactRecovery,null);}finally{x.close();}
});
test('standing stun does not fabricate an airborne impact recovery',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{const f=x.p;f._altTag=()=>{};f.applyStun();for(let i=0;i<15;i++)f.update(1/60,x.g);assert.ok(!f._impactRecovery);}finally{x.close();}
});

test('contact presentation settles while stun pauses recovery progress',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{const f=x.p;beginImpactRecovery(f);f.stunT=2;updateImpactRecovery(f,.2);assert.equal(f._impactRecovery.elapsed,0);assert.equal(f._impactRecovery.contactAge,.2);assert.equal(x.g.melee.canAct(f),false);f.frozenT=1;updateImpactRecovery(f,.2);assert.equal(f._impactRecovery.contactAge,.2);}finally{x.close();}
});

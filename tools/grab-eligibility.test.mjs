import test from 'node:test';import assert from 'node:assert/strict';import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
test('grab eligibility shares hostile contact gates and rechecks after startup',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{delete x.g.isFoe;const v=x.foe({z:4});v.invuln=0;assert.equal(x.g.melee.grabTarget(x.p)?.fighter,v);
 for(const [key,value]of [['phase',true],['invuln',1],['_regrabUntil',10]]){const old=v[key];v[key]=value;assert.equal(x.g.melee.grabTarget(x.p),null);v[key]=old;}
 x.g.melee.grab(x.p);v.phase=true;for(let i=0;i<20;i++)x.g.melee.update(x.p,1/60);assert.equal(x.p.grabbing,null);
 }finally{x.close();}
});
test('grab cue cannot advertise busy or sleeping actors and distinguishes ally',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{delete x.g.isFoe;x.p.team=1;const v=x.foe({z:4,team:1});assert.equal(x.g.melee.grabTarget(x.p)?.friendly,true);
 for(const [key,value]of [['sleepT',1],['downedT',1],['strikeCd',1],['guarding',true]]){if(key==='gu arding')continue;const old=x.p[key];x.p[key]=value;assert.equal(x.g.melee.canBeginGrab(x.p),false);x.p[key]=old;}
 x.w.cover.push({x:0,z:2,hx:10,hz:.2,bottom:0,top:20,h:20,finiteBuilding:true});assert.equal(x.g.melee.grabTarget(x.p),null);
 }finally{x.close();}
});

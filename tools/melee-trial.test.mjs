import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {MeleeTrial} from '../src/engine/melee-trial.js';
test('trial replacement owns one native target; disposal preserves player',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{const t=new MeleeTrial(x.g,new THREE.Vector3(0,0,15));
 const a=t.start();assert.equal(x.g.entities.length,2);const b=t.start('retreat');assert.notEqual(a,b);assert.equal(x.g.entities.length,2);assert.ok(!x.g.entities.includes(a));
 const pos=b.pos.clone();t.control(b,1/60);assert.ok(b.vel.z>0);assert.ok(b.pos.equals(pos),'controller leaves translation to physics');
 t.hit(b,5,{src:x.p},false);assert.equal(t.records.length,1);t.dispose();assert.deepEqual(x.g.entities,[x.p]);
 }finally{x.close();}
});
test('guard trial uses native guard and rejects unknown scenarios',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{const t=new MeleeTrial(x.g,new THREE.Vector3(0,0,15));const f=t.start('guard');t.control(f,1/60);assert.equal(f.guarding,true);assert.throws(()=>t.start('invalid'));assert.equal(t.target,f);t.dispose();}finally{x.close();}
});
test('repeat retains scenario and replaces damaged target without leaking unfinished attempts',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{const t=new MeleeTrial(x.g,new THREE.Vector3(0,0,15));const old=t.start('retreat');old.hp=1;t.attempt={contacts:0};const next=t.repeat();assert.equal(t.kind,'retreat');assert.equal(next.hp,next.maxHp);assert.equal(t.attempt,null);assert.equal(x.g.entities.length,2);t.dispose();}finally{x.close();}
});
test('lesson describes the actual RAGE tap instead of promising a jab combo',async()=>{const {meleeLesson}=await import('../src/engine/melee-trial.js');const x=mainCombatFixture({mode:'powerworld',hero:'rage'});try{assert.match(meleeLesson(x.p.def),/tap: heavy slam/);}finally{x.close();}});

test('practice restores the same player without issuing stock or refilling consumables',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{
  const t=new MeleeTrial(x.g,new THREE.Vector3(0,0,15));const old=t.start('guard');
  const stock={remaining:{soldier:2,lsw:3}},manifest=[x.p];x.g.ms.threatLab={state:'preparing',stock,manifest,meleeTrial:t};
  x.p.hp=12;x.p.ki=3;x.p.guardMeter=.1;x.p.strikeCd=2;x.p._dots.push({kind:'burn',t:3,dps:4});
  x.p.items=[{charges:0,state:'cooldown',cd:8}];const items=x.p.items;
  assert.equal(t.resetPractice(),true);assert.equal(x.p.hp,x.p.maxHp);assert.equal(x.p.ki,x.p.maxKi);assert.equal(x.p.guardMeter,1);assert.equal(x.p.strikeCd,0);assert.equal(x.p._dots.length,0);
  assert.equal(manifest[0],x.p);assert.equal(x.g.humans[0].fighter,x.p);assert.deepEqual(stock.remaining,{soldier:2,lsw:3});assert.equal(x.p.items,items);assert.equal(items[0].charges,0);assert.notEqual(t.target,old);assert.equal(t.kind,'guard');t.dispose();
 }finally{x.close();}
});

test('review distinguishes throw damage from subsequent terrain impact',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{
  const t=new MeleeTrial(x.g,new THREE.Vector3(0,0,15)),f=t.start();
  t.hit(f,10,{src:x.p,meleeMove:'throw'},false,{healthLost:10});
  t.hit(f,32,{src:x.p,slam:true},false,{healthLost:32});
  assert.deepEqual(t.records.map(r=>r.result),['THROW','TERRAIN IMPACT']);
  assert.deepEqual(t.records.map(r=>r.healthLost),[10,32]);t.dispose();
 }finally{x.close();}
});

test('practice refill is unavailable in the field, during active powers, or after KO',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{
  const t=new MeleeTrial(x.g,new THREE.Vector3(0,0,15)),target=t.start();x.p.hp=12;
  x.g.ms.threatLab={state:'field'};assert.equal(t.resetPractice(),false);
  x.g.ms.threatLab.state='preparing';const slot=Object.values(x.p.slots)[0];slot.charging=true;assert.equal(t.resetPractice(),false);slot.charging=false;
  x.p.state='ko';assert.equal(t.resetPractice(),false);assert.equal(x.p.hp,12);assert.equal(t.target,target);t.dispose();
 }finally{x.close();}
});

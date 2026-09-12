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

test('trainer KO restores the same rig without spending reserves or issuing consumables',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{
  const t=new MeleeTrial(x.g,new THREE.Vector3(0,0,15));const target=t.start('defend');
  const stock={remaining:{soldier:2,lsw:3}},manifest=[x.p];x.g.ms.threatLab={state:'preparing',stock,manifest,meleeTrial:t};
  x.p.noRespawn=true;x.p.items=[{charges:0,state:'cooldown',cd:8}];x.p.lastHitBy=target;x.p.hp=0;x.p._ko();
  assert.ok(x.p.ragdoll);assert.ok(t.canRecoverKO());assert.ok(t.resetPractice());
  assert.equal(x.p.ragdoll,null);assert.ok(x.p.alive);assert.equal(x.p.hp,x.p.maxHp);assert.equal(x.p.noRespawn,true);
  assert.equal(x.p.items[0].charges,0);assert.equal(x.p.items[0].cd,8);assert.equal(manifest[0],x.p);assert.equal(x.g.humans[0].fighter,x.p);
  assert.deepEqual(stock.remaining,{soldier:2,lsw:3});assert.equal(x.p._remove,false);assert.equal(t.kind,'defend');t.dispose();
 }finally{x.close();}
});

test('roster preview stays outside combat and selected drill retains native body without powers',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{
  x.g.ms={threatLab:{state:'preparing'}};const t=new MeleeTrial(x.g,new THREE.Vector3(0,0,15));
  const preview=t.previewThreat('rage');assert.equal(preview.def.id,'rage');assert.ok(!x.g.entities.includes(preview));assert.ok(preview.obj.parent);
  const second=t.previewThreat('vega');assert.equal(preview.obj.parent,null);assert.equal(x.g.entities.length,1);
  const target=t.startSelected();assert.equal(second.obj.parent,null);assert.equal(target.def.id,'vega');assert.deepEqual(target.def.abilities,{});assert.ok(target.isDummy);assert.equal(x.g.entities.length,2);
  const again=t.repeat();assert.equal(again.def.id,'vega');assert.equal(x.g.entities.length,2);
  t.previewThreat('rage');assert.equal(x.g.entities.length,1);assert.equal(t.start('airborne'),false);t.dispose();assert.equal(t.previewActor,null);
 }finally{x.close();}
});

test('live practice teammate uses native AI and stays outside campaign deployment',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{
  const t=new MeleeTrial(x.g,new THREE.Vector3(0,0,15)),manifest=[x.p],stock={remaining:{lsw:3,soldier:2}};
  x.g.ms.threatLab={state:'preparing',meleeTrial:t,manifest,stock};t.selectedThreat='rage';t.selectedAlly='kano';
  t.startEncounter();const ally=t.ally,enemy=t.target;
  assert.ok(ally.ai);assert.equal(ally.team,x.p.team);assert.ok(x.g.isFoe(ally,enemy));assert.equal(x.g.isFoe(x.p,ally),false);
  assert.equal(ally.noRespawn,true);assert.equal(t.recording.actors.length,3);assert.equal(t.ownsPracticeActor(ally),true);assert.equal(t.ownsThreat(ally),false);
  t.repeat();assert.notEqual(t.ally,ally);assert.ok(!x.g.entities.includes(ally));assert.deepEqual(manifest,[x.p]);assert.deepEqual(stock.remaining,{lsw:3,soldier:2});
  t.clear();assert.deepEqual(x.g.entities,[x.p]);assert.equal(t.ally,null);
 }finally{x.close();}
});

test('practice ally KO does not call operation rewards or drop equipment',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{
  const t=new MeleeTrial(x.g,new THREE.Vector3(0,0,15));x.g.ms.threatLab={state:'preparing',meleeTrial:t};t.selectedThreat='rage';t.selectedAlly='merc';t.startEncounter();
  x.g.audio={...x.g.audio,cry:()=>{}};let drops=0,rewards=0;x.g.spawnGearDrop=()=>drops++;x.g.dropGear=()=>drops++;x.g.grantXp=()=>rewards++;x.g.handleKO(t.ally);
  assert.equal(drops,0);assert.equal(rewards,0);t.clear();
 }finally{x.close();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {MeleeTrial,meleeLesson} from '../src/engine/melee-trial.js';
import {MeleeSystem} from '../src/engine/melee.js';

test('trial records exact release region and native attack after charge resets, including misses',()=>{
 const x=mainCombatFixture({mode:'powerworld'});
 try{
  x.p.def={...x.p.def,art:'boxing',meleeTiers:3,yells:false};
  const t=new MeleeTrial(x.g,new THREE.Vector3(0,0,70));x.g.ms.threatLab={state:'preparing',meleeTrial:t};t.start();
  for(const [charge,choice,attack,kind] of [[.1,'combo','jab','light'],[.3,'cross','cross','heavy'],[.8,'power','power','heavy']]){
   x.p.strikeCd=0;x.p.comboWin=0;x.p.meleeCharge=charge;x.g.melee.chargeRelease(x.p);
   assert.equal(x.p.meleeCharge,0);assert.equal(x.p._meleeReleaseReview,undefined);
   assert.equal(t.attempt.releaseCharge,charge);assert.equal(t.attempt.releaseChoice,choice);
   assert.equal(t.attempt.kind,attack);assert.equal(t.attempt.strikeKind,kind);
   assert.equal(t.attempt.context,'ground');
   x.g.melee._endStrike(x.p);
   const record=t.records.at(-1);assert.equal(record.releaseCharge,charge);assert.equal(record.result,'no contact');
   const event=t.recording.events.filter(e=>e.kind==='strike-result').at(-1);assert.equal(event.releaseChoice,choice);
  }
  x.p.strikeCd=0;x.p.comboWin=0;x.g.melee.strike(x.p);
  assert.equal(t.attempt.releaseCharge,null,'direct/buffered strikes must not borrow a prior release');
  t.dispose();
 }finally{x.close();}
});

test('charge feedback changes only at native region boundaries and never starts an attack',()=>{
 const x=mainCombatFixture({mode:'powerworld'});
 try{
  x.p.def={...x.p.def,art:'boxing',meleeTiers:3};
  const t=new MeleeTrial(x.g,new THREE.Vector3(0,0,70));x.g.ms.threatLab={state:'preparing',meleeTrial:t};t.start();
  const hp=t.target.hp;
  for(const charge of [.1,.12,.18,.3,.55,.8]){x.p.meleeCharge=charge;t.capture();}
  const events=t.recording.events.filter(e=>e.kind==='charge-region');
  assert.deepEqual(events.map(e=>e.releaseChoice),['combo','cross','power']);
  assert.ok(!x.p.mstate);assert.equal(t.target.hp,hp);
  x.p.meleeCharge=0;t.capture();x.p.meleeCharge=.1;t.capture();
  assert.equal(t.recording.events.filter(e=>e.kind==='charge-region').length,4);
  t.dispose();
 }finally{x.close();}
});

test('release telemetry restores prior value on throw and excludes clinch',()=>{
 const system=Object.create(MeleeSystem.prototype),previous={charge:99};
 system.canAct=()=>true;system._canClinch=()=>false;system.strike=actor=>{assert.deepEqual(actor._meleeReleaseReview,{charge:.1,choice:'combo'});throw Error('test failure');};
 const f={def:{art:'boxing'},meleeCharge:.1,_meleeReleaseReview:previous};
 assert.throws(()=>system.chargeRelease(f),/test failure/);assert.equal(f._meleeReleaseReview,previous);
 delete f._meleeReleaseReview;f.meleeCharge=.1;
 assert.throws(()=>system.chargeRelease(f));assert.equal(Object.hasOwn(f,'_meleeReleaseReview'),false);
 system._canClinch=()=>true;let observed;system._bodyBlow=actor=>observed=actor._meleeReleaseReview;
 f.meleeCharge=.1;system.chargeRelease(f);assert.equal(observed,undefined);
});

test('airborne restricted fighter records the native fallback rather than a promised haymaker',()=>{
 const x=mainCombatFixture({mode:'powerworld'});
 try{
  x.p.def={...x.p.def,art:'wrestling',meleeTiers:3,yells:false};x.p.flying=true;x.p.gait='airborne';x.p.pos.y=24;
  const t=new MeleeTrial(x.g,new THREE.Vector3(0,0,70));x.g.ms.threatLab={state:'preparing',meleeTrial:t};t.start();
  x.p.meleeCharge=.8;x.g.melee.chargeRelease(x.p);
  assert.equal(t.attempt.releaseChoice,'combo');assert.equal(t.attempt.kind,'jab');assert.equal(t.attempt.context,'air');
  x.g.melee._endStrike(x.p);t.dispose();
 }finally{x.close();}
});

test('lessons describe available charge regions, without advertising a straight for a restricted style',()=>{
 const boxing=meleeLesson({art:'boxing',meleeTiers:3},'touch');
 assert.match(boxing,/Combo.*Straight.*Haymaker/);assert.match(boxing,/0\.18/);assert.match(boxing,/0\.55/);
 const wrestling=meleeLesson({art:'wrestling'},'pad');assert.doesNotMatch(wrestling,/Straight|Haymaker|charged heavy/);
});

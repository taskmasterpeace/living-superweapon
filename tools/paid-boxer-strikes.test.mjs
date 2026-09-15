import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import * as T from 'three';
import {Fighter} from '../src/engine/entity.js';import {ROSTER} from '../src/data/characters.js';import {STRIKES} from '../src/data/martial.js';
const bankPath=new URL('../src/data/paid-boxer-strike-bank.json',import.meta.url);
test('native purchased bridge contains isolated left jab and right cross with complete source recovery',async()=>{
 const bank=JSON.parse(await fs.readFile(bankPath,'utf8'));
 for(const [key,side,take]of [['jab',1,'Paid_Boxer_Jab'],['cross',-1,'Paid_Boxer_Cross']]){const c=bank.clips[key];assert.equal(c.side,side);assert.equal(c.take,take);assert.equal(c.environment,'ground');assert.ok(c.contactStart<c.contactEnd&&c.contactEnd<c.duration);assert.equal(c.evidence.extensionRuns,1);assert.ok(c.evidence.offHandMaxReachRatio<.8);for(const a of c.frames){assert.equal(a.length,45);assert.ok(a.every(Number.isFinite));assert.equal(a[44],0);}}
});

function boxer(art='boxing'){
 const def=structuredClone(ROSTER.find(d=>d.id==='sol'));def.art=art;const f=new Fighter(def);f._openSky=true;f.gait='grounded';f.flying=false;f.animT=0;f.vel.set(0,0,0);f.mId='jab';f.mstate='active';f.mT=.03;f.poseStrike=1;f._meleeMotion={side:1,point:new T.Vector3(.3,7,3.5)};return f;
}
test('explicit lab candidate preserves simulation, fixed limb lengths and boot support without claiming contact approval',()=>{
 const f=boxer();f._paidBoxerPreview=true;try{const pos=f.pos.toArray(),vel=f.vel.toArray();for(const [key,side]of [['jab',1],['cross',-1]]){
  f.mId=key;f._meleeMotion.side=side;
  for(const state of ['startup','active','recover'])for(let i=1;i<20;i++){f.mstate=state;f.mT=STRIKES[key][state]*(1-i/20)/(f.def.meleePace||1);f._animate(1/60);f.obj.updateMatrixWorld(true);assert.equal(f._authoredStrike.take,key==='jab'?'Paid_Boxer_Jab':'Paid_Boxer_Cross');assert.deepEqual(f.pos.toArray(),pos);assert.deepEqual(f.vel.toArray(),vel);
   for(const arm of [f.parts.armL,f.parts.armR])assert.ok(Math.abs(arm.children[2].position.distanceTo(new T.Vector3(0,-arm.userData.upperLength,0))-arm.userData.foreLength)<1e-5);
   if(state==='active')assert.ok(Math.min(...[f.parts.legL,f.parts.legR].map(l=>new T.Box3().setFromObject(l.userData.boot).min.y))>=-.025);
  }
 }}finally{f.dispose();}
});

test('boxing import retains armed, air, other-style, heavy and author marker fallbacks',async()=>{
 const {authoredStrikeClipFor,STRIKE_CLIPS}=await import('../src/engine/strike-motion.js'),{markerDraft}=await import('../src/data/strike-markers.js');
 const f=boxer();try{
  assert.equal(authoredStrikeClipFor(f).take,'Punch_Jab','quarantined candidate must not replace normal boxing');f._paidBoxerPreview=true;
  assert.equal(authoredStrikeClipFor(f).take,'Paid_Boxer_Jab');
  f.flying=true;assert.equal(authoredStrikeClipFor(f).take,'Punch_Jab');f.flying=false;
  f.gliding=true;assert.equal(authoredStrikeClipFor(f).take,'Punch_Jab');f.gliding=false;
  f.gait='airborne';assert.equal(authoredStrikeClipFor(f).take,'Punch_Jab');f.gait='grounded';
  f.def.art='muaythai';assert.equal(authoredStrikeClipFor(f).take,'Punch_Jab');f.def.art='boxing';
  f.mId='power';assert.equal(authoredStrikeClipFor(f),STRIKE_CLIPS.power);f.mId='jab';
  f._meleeMotion.weapon={};assert.equal(authoredStrikeClipFor(f).take,'Punch_Jab');delete f._meleeMotion.weapon;
  f.parts.armL.children[2].userData.gripOccupied=true;assert.equal(authoredStrikeClipFor(f).take,'Punch_Jab');f.parts.armL.children[2].userData.gripOccupied=false;
  f.def.model={...f.def.model,paidMotions:'off'};assert.equal(authoredStrikeClipFor(f).take,'Punch_Jab');delete f.def.model.paidMotions;
  f.def.model.strikeMarkers={jab:markerDraft('strike/jab',.2,.4)};assert.equal(authoredStrikeClipFor(f).take,'Punch_Jab');assert.equal(authoredStrikeClipFor(f).contactStart,.2);
 }finally{f.dispose();}
});

test('quarantined boxing keeps accepted default contact and clears on interruption',()=>{
 const f=boxer(),base=boxer();try{
  base.def.model={...base.def.model,paidMotions:'off'};
  for(const [key,side]of [['jab',1],['cross',-1]]){f.mId=key;f._meleeMotion.side=side;f._meleeMotion.point.set(side*.3,7,3.5);f.mstate='active';f.mT=STRIKES[key].active*.5;
   for(let i=0;i<10;i++)f._animate(1/60);f.obj.updateMatrixWorld(true);
   const wrist=(side===1?f.parts.armR:f.parts.armL).children[2].getWorldPosition(new T.Vector3());assert.ok(wrist.distanceTo(f._meleeMotion.point)<.02,`${key} final native contact error ${wrist.distanceTo(f._meleeMotion.point)}`);
  }
  for(const a of [f,base]){a.mstate=null;a.mId=null;a._meleeMotion=null;a.poseStrike=0;}
  for(let i=0;i<240;i++)for(const a of [f,base]){a.animT+=1/60;a._animate(1/60);}
  for(const name of ['body','head','armL','armR','legL','legR']){assert.ok(f.parts[name].quaternion.angleTo(base.parts[name].quaternion)<.01,name+' interrupted orientation');assert.ok(f.parts[name].position.distanceTo(base.parts[name].position)<.01,name+' interrupted offset');}
 }finally{f.dispose();base.dispose();}
});

test('default boxing retains continuous native joint playback while purchased candidates are quarantined',()=>{
 for(const key of ['jab','cross'])for(const side of [-1,1]){
  const f=boxer();f.mId=key;f._meleeMotion.side=side;f._meleeMotion.point.x=side*.3;let previous;
  try{for(const state of ['startup','active','recover']){const count=Math.ceil(STRIKES[key][state]*120/(f.def.meleePace||1));for(let i=0;i<=count;i++){
   f.mstate=state;f.mT=STRIKES[key][state]*(1-i/count)/(f.def.meleePace||1);f._animate(1/120);
   const joints=['body','pelvis','head','armL','armR','legL','legR'].map(n=>f.parts[n].quaternion.clone());
   if(previous)joints.forEach((q,j)=>assert.ok(q.angleTo(previous[j])<.6,`${key} side${side} ${state} ${i}/${count} joint${j}: angular reset ${q.angleTo(previous[j])}`));previous=joints;
  }}}finally{f.dispose();}
 }
});

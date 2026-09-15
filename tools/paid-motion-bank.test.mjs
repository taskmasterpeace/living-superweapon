import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
globalThis.ProgressEvent??=class{};
const bankPath=new URL('../public/models/modular-hero/paid-motion-bank.json',import.meta.url);
test('purchased aerial pair drives the production skeleton without source root travel',async()=>{
 const bank=JSON.parse(await fs.readFile(bankPath,'utf8'));
 const bytes=await fs.readFile(new URL('../public/models/modular-hero/modular-hero.glb',import.meta.url));
 const g=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 for(const take of ['Paid_AS_SV_Fly_Catch','Paid_AS_SV_Fly_Catch_React','Paid_AS_SV_Fly_idle','Paid_AS_SV_Fly_idle_React','Paid_AS_SV_Fly_Front','Paid_AS_SV_Fly_Front_React']){
  const e=bank.entries.find(e=>e.take===take);assert.ok(e,take);const clip=T.AnimationClip.parse(e.clip);assert.ok(clip.validate());
  assert.equal(e.source.license,'LicenseRef-Purchased-Asset');assert.equal(e.status,'retargeted-unreviewed');
  assert.ok(e.pair?.relativeTransforms?.length>4);assert.ok(e.sourceMotion.frames.length>4);
  const mix=new T.AnimationMixer(g.scene);const action=mix.clipAction(clip).setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();
  const hands=[];for(const u of [0,.25,.5,.75,1]){mix.setTime(u*clip.duration);g.scene.updateMatrixWorld(true);const hips=g.scene.getObjectByName('DEF-hips');assert.ok(hips.position.toArray().every(Number.isFinite));hands.push(g.scene.getObjectByName('DEF-handR').getWorldPosition(new T.Vector3()));}
  assert.ok(hands.some(p=>p.distanceTo(hands[0])>.002),take+' is real motion');
  for(const t of clip.tracks){assert.ok(g.scene.getObjectByName(T.PropertyBinding.parseTrackName(t.name).nodeName),t.name);assert.ok([...t.values].every(Number.isFinite));if(t.name==='root.position'){assert.ok([...t.values].every(v=>Math.abs(v)<1e-5));}}
  mix.stopAllAction();mix.uncacheRoot(g.scene);
 }
});

test('retarget preserves measured source arm directions at five phases on the rendered skeleton',async()=>{
 const bank=JSON.parse(await fs.readFile(bankPath,'utf8'));
 const bytes=await fs.readFile(new URL('../public/models/modular-hero/modular-hero.glb',import.meta.url));
 const g=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 for(const e of bank.entries){
  const clip=T.AnimationClip.parse(e.clip),mix=new T.AnimationMixer(g.scene),action=mix.clipAction(clip).setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();
  for(const phase of e.review.phases){mix.setTime(phase.phase*e.duration);g.scene.updateMatrixWorld(true);
   for(const side of ['L','R']){const points=['upper_arm','forearm','hand'].map(p=>g.scene.getObjectByName('DEF-'+p+side).getWorldPosition(new T.Vector3()));const src=phase.armDirections[side].source.map(p=>new T.Vector3(...p));
    for(let i=0;i<2;i++)assert.ok(points[i+1].clone().sub(points[i]).angleTo(src[i+1].clone().sub(src[i]))<.002,e.take+' '+side+' source limb direction');
   }
  }
  if(e.loop)assert.ok(e.review.loopSeamMaxJointAngle<.02,e.take+' loop continuity');
  if(e.environment==='ground'&&Math.min(...e.review.phases.map(p=>p.targetBounds.min[1]))<-.08)assert.ok(e.review.blockers.some(s=>s.includes('Ground support')),e.take+' must declare measured floor failure');
  mix.stopAllAction();mix.uncacheRoot(g.scene);
 }
});

test('paired relative transforms are reversible and mismatched catch clocks are explicit',async()=>{
 const bank=JSON.parse(await fs.readFile(bankPath,'utf8'));
 for(const e of bank.entries.filter(e=>e.pair&&e.pair.role==='holder')){
  const other=bank.entries.find(o=>o.id===e.pair.partner);assert.ok(other);assert.equal(other.pair.partner,e.id);
  for(const [i,r]of e.pair.relativeTransforms.entries()){
   const h=e.sourceMotion.frames[i];const reconstructed=new T.Vector3(...r.position).applyQuaternion(new T.Quaternion(...h.pelvis.quaternion)).multiplyScalar(e.retarget.sourceToTargetScale);
   assert.ok(reconstructed.distanceTo(new T.Vector3(...r.worldDelta))<1e-5,e.take+' relative displacement');
  }
 }
 const catchEntry=bank.entries.find(e=>e.take==='Paid_AS_SV_Fly_Catch');assert.equal(catchEntry.pair.synchronizedDuration,false);assert.ok(catchEntry.review.blockers.some(b=>b.includes('durations differ')));
});

test('purchased derivative provenance is separate from CC0 and contains no local source paths',async()=>{
 const raw=await fs.readFile(bankPath,'utf8'),bank=JSON.parse(raw);assert.equal(bank.license,'LicenseRef-Purchased-Asset');assert.ok(!raw.includes('C:\\\\Users'));assert.ok(!raw.includes('C:/Users'));
 for(const e of bank.entries){assert.match(e.source.sha256,/^[a-f0-9]{64}$/);assert.equal(e.retarget.bindPoseAvailable,false);assert.match(e.retarget.method,/approximate/);assert.equal(e.review.visualStatus,'pending');}
});

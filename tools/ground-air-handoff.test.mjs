import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {spineCombatFixture} from './helpers/spine-combat-fixture.mjs';

const joints=f=>[f.parts.legL,f.parts.legR,f.parts.legL.userData.knee,f.parts.legR.userData.knee,f.parts.legL.userData.boot,f.parts.legR.userData.boot];
const snapshot=f=>joints(f).map(p=>p.quaternion.clone());
for(const hz of [30,60,120])for(const phase of [.43,.9,1.3,1.7])test(`source stride transitions to ballistic air without a knee snap (${hz}Hz, ${phase}s)`,()=>{
 const x=spineCombatFixture({motion:'jog',source:'hand',hz}),{f}=x;
 try{
  for(let i=0;i<Math.round(phase*hz);i++)x.step();const before=snapshot(f);
  f.pos.y=.1;f.vel.y=25.5;f.flying=false;f._updateGait(x.dt);const pos=f.pos.clone(),vel=f.vel.clone();x.step();
  const delta=Math.max(...joints(f).map((p,i)=>p.quaternion.angleTo(before[i])));
  assert.ok(delta<.5,`Takeoff snapped ${delta*180/Math.PI} degrees`);
  assert.equal(f._groundMotion.weight,0,'Source support may not keep running in the air');
  assert.ok(f.pos.equals(pos)&&f.vel.equals(vel),'Presentation cannot change jump physics');
  for(let i=0;i<hz*.5;i++)x.step();assert.equal(f._groundTransition?.remaining,0);
 }finally{x.close();}
});

for(const hz of [30,60,120])test(`landing handoff preserves visible boot support and settles (${hz}Hz)`,()=>{
 const x=spineCombatFixture({motion:'fly',source:'hand',hz}),{f}=x;
 try{
  for(let i=0;i<hz;i++)x.step();
  f.flying=false;f.pos.y=0;f.vel.set(0,0,16);f.gait='grounded';
  for(let i=0;i<hz*.7;i++){
   x.step();const minY=Math.min(...[f.parts.legL,f.parts.legR].map(l=>new THREE.Box3().setFromObject(l.userData.boot).min.y));
   assert.ok(minY>-.03,`Landing boot penetrates floor ${minY}`);
  }
  assert.equal(f._groundTransition?.remaining,0);assert.ok(f._groundMotion.weight>.99);
 }finally{x.close();}
});

test('a paused handoff redraw never advances or accumulates pose',()=>{
 const x=spineCombatFixture({motion:'jog',source:'hand'}),{f}=x;
 try{
  for(let i=0;i<102;i++)x.step();f.flying=false;f.pos.y=.1;f.vel.y=25.5;f._updateGait(x.dt);x.step();
  const before=snapshot(f),remaining=f._groundTransition.remaining;
  f._animate(0);const settled=snapshot(f);
  for(let i=0;i<15;i++)f._animate(0);
  assert.equal(f._groundTransition.remaining,remaining);
  for(const [i,p] of joints(f).entries())assert.ok(p.quaternion.angleTo(settled[i])<1e-5,`paused joint ${i} drifts`);
  assert.ok(before.every((q,i)=>q.angleTo(settled[i])<.08),'Zero-dt redraw cannot replace the takeoff stride');
 }finally{x.close();}
});
test('a form rebuild retires handoff snapshots tied to the old rig',()=>{
 const x=spineCombatFixture({motion:'jog',source:'hand'}),{f}=x;
 try{
  for(let i=0;i<102;i++)x.step();f.pos.y=.1;f.vel.y=25.5;f.flying=false;f._updateGait(x.dt);x.step();
  assert.ok(f._groundTransition.remaining>0);f.applyForm({frame:{scale:1.2}});
  assert.ok(f._groundTransition===null,'Old-rig transition snapshots must be released with other pose channels');
 }finally{x.close();}
});
test('live hitstop freezes the handoff clock and lower-body pose until physics resumes',()=>{
 const x=spineCombatFixture({motion:'jog',source:'hand'}),{f,g}=x;
 g.world.camera=new THREE.PerspectiveCamera();
 try{
  for(let i=0;i<102;i++)x.step();f.pos.y=.1;f.vel.y=25.5;f.flying=false;f._updateGait(x.dt);x.step();
  const remaining=f._groundTransition.remaining,before=snapshot(f),pos=f.pos.clone(),vel=f.vel.clone();f.hitstop=.3;
  for(let i=0;i<12;i++)f.update(1/60,g);
  assert.equal(f._groundTransition.remaining,remaining,'Hitstop cannot consume the handoff');
  assert.ok(f.pos.equals(pos)&&f.vel.equals(vel));
  assert.ok(joints(f).every((p,i)=>p.quaternion.angleTo(before[i])<1e-5),'The lower-body handoff must hold during hitstop');
  f.hitstop=0;for(let i=0;i<35;i++)x.step();assert.equal(f._groundTransition.remaining,0);
 }finally{x.close();}
});

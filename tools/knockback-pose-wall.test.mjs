import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {airControlState} from '../src/engine/lost-control-pose.js';

test('stunned airborne body has one reaction owner, not a powered nosedive underneath it',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{
  const f=x.p;f._openSky=true;f._altTag=()=>{};f.pos.y=35;f.gait='airborne';f.flying=false;f.stunT=1.5;f.vel.set(0,-32,0);
  for(let i=0;i<45;i++){f.animT+=1/60;f._animate(1/60);}
  assert.equal(airControlState(f),'uncontrolled');assert.ok(f._lostControlPose.weight>.9);
  assert.ok(Math.abs(f.parts.g.rotation.x)<.05,`powered dive angle ${f.parts.g.rotation.x} stacks under limp reaction`);
  f.pos.y=0;f.gait='grounded';f.stunT=0;f.vel.set(0,0,0);
  for(let i=0;i<90;i++)f._animate(1/60);
  assert.equal(f._lostControlPose.weight,0);assert.ok(Math.abs(f.parts.g.rotation.x)<.001);
 }finally{x.close();}
});

test('a supported actor on a raised platform does not keep playing an airborne flail',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{const f=x.p;f.pos.y=20;f.groundY=0;f.onBlock=true;f.staggerT=.5;assert.equal(airControlState(f),'grounded');}finally{x.close();}
});

test('wall compression keeps a stunned character visibly third person',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{
  const {p:f,w}=x;f._openSky=true;f.stunT=2;f.facing=0;w._lookActive=true;w._lookYaw=0;w._lookPitch=0;
  w.cover=[{x:0,z:-6,hx:60,hz:2,top:50}];
  for(let i=0;i<60;i++){f._animate(1/60);w.chase(f,null,1/60);}
  const c=w.camera;c.updateMatrixWorld(true);const center=f.center(new T.Vector3()),head=f.parts.head.getWorldPosition(new T.Vector3()).project(c);
  assert.ok(c.position.distanceTo(center)>=10,'wall shortened camera into body');
  assert.ok(Math.abs(head.x)<.9&&Math.abs(head.y)<.9&&head.z<1,`head outside frame ${head.toArray()}`);
  assert.ok(w._camNearestT(...center.toArray(),...c.position.toArray(),.8)>.999,'camera crossed wall');
  f.stunT=0;f.state='idle';
  for(let i=0;i<60;i++){f._animate(1/60);w.chase(f,null,1/60);}
  const recovered=f.parts.head.getWorldPosition(new T.Vector3()).project(c);
  assert.ok(Math.abs(recovered.x)<.9&&Math.abs(recovered.y)<.9,'recovery lost the character beside the same wall');
  assert.equal(w._wallRecoveryFrame.weight,0,'recovery kept owning aim after stun');
  assert.ok(c.getWorldDirection(new T.Vector3()).dot(w.camBasis)>.999,'view did not hand back to ordinary aim');
  const yaw=w._lookYaw;w._lookYaw+=.2;w.chase(f,null,1/60);
  assert.equal(w._lookYaw,yaw+.2,'recovery swallowed mouse turn');
  w.cover=[];
  for(let i=0;i<60;i++)w.chase(f,null,1/60);
  assert.equal(w._wallRecoveryFrame.weight,0,'camera correction did not release in clear space');
 }finally{x.close();}
});

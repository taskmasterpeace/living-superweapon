import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {spineCombatFixture} from './helpers/spine-combat-fixture.mjs';
import {animateGroundAimSupport,restoreGroundAimSupport} from '../src/engine/ground-aim-support.js';
import {cancelHeldAttacks} from '../src/engine/abilities.js';
import {trunkProbe} from './helpers/trunk-probe.mjs';
import {setSize} from '../src/engine/systems.js';

for(const hz of [30,60,120])for(const motion of ['stand','walk','strafe'])for(const height of [250,1000])
test(`${motion} chest acquires a steep ${height}u target with actual grounded support at ${hz} Hz`,()=>{
 const x=spineCombatFixture({motion,hz}),{f,dt}=x;
 try{
  for(let i=0;i<hz;i++)x.step();x.aim(170,height);x.start('lmb');
  const position=f.pos.clone(),velocity=f.vel.clone(),beam=f.slots.lmb.active;
  let first=null;
  for(let i=0;i<hz;i++){
   x.step();
   if(beam.emissionAge>0){
    first??=(i+1)*dt;
    const forward=new THREE.Vector3(0,0,1).applyQuaternion(f.parts.torso.getWorldQuaternion(new THREE.Quaternion()));
    assert.ok(forward.dot(beam.dir)>.99,'Released energy detached from the animated chest');
   }else{assert.equal(beam.pn,0);assert.equal(beam._voice,null);assert.equal(beam.grp.visible,false);}
   const boxes=[f.parts.legL,f.parts.legR].map(leg=>new THREE.Box3().setFromObject(leg.userData.boot));
   assert.ok(Math.min(...boxes.map(b=>b.min.y))>=-.08,'Boot penetrated the floor');
   assert.ok(Math.min(...boxes.map(b=>b.min.y))<.5,'Body support abandoned ground contact');
   assert.ok(f.pos.equals(position)&&f.vel.equals(velocity),'Body support changed simulation travel');
  }
  assert.ok(first!==null&&first<=.6,`Grounded shot stayed preparing: first emission ${first}`);
 }finally{x.close();}
});

for(const scale of [.65,1,1.5])for(const motion of ['stand','walk','strafe'])
test(`${motion} support preserves both real boot targets and segment lengths at scale ${scale}`,()=>{
 const x=spineCombatFixture({motion,frame:{scale}}),{f,dt}=x;
 try{
  for(let i=0;i<60;i++)x.step();x.aim(170,1000);x.start('lmb');
  for(let i=0;i<180;i++){
   x.step();restoreGroundAimSupport(f);f.parts.g.updateMatrixWorld(true);
   const boots=[f.parts.legL,f.parts.legR].map(leg=>({leg,position:leg.userData.boot.getWorldPosition(new THREE.Vector3()),
    rotation:leg.userData.boot.getWorldQuaternion(new THREE.Quaternion()),knee:leg.userData.knee.position.clone(),ankle:leg.userData.boot.position.clone()}));
   animateGroundAimSupport(f,dt,f.slots.lmb,false);f.parts.g.updateMatrixWorld(true);
   for(const b of boots){
    const {knee,boot}=b.leg.userData;
    assert.ok(boot.getWorldPosition(new THREE.Vector3()).distanceTo(b.position)<.00001,`Foot target moved at frame ${i}`);
    assert.ok(boot.getWorldQuaternion(new THREE.Quaternion()).angleTo(b.rotation)<.00001,'Sole orientation changed');
    assert.ok(knee.position.equals(b.knee)&&boot.position.equals(b.ankle),'Leg segment was stretched');
    assert.ok(knee.rotation.x>=0&&knee.rotation.x<2.6,'Knee folded backward or collapsed');
   }
  }
 }finally{x.close();}
});

for(const phase of [1,12,75])test(`grounded support releases and retires its body offset after frame ${phase}`,()=>{
 const x=spineCombatFixture({motion:'strafe'}),{f}=x;
 try{
  for(let i=0;i<60;i++)x.step();x.aim(170,1000);x.start('lmb');
  for(let i=0;i<phase;i++)x.step();x.stop('lmb');
  for(let i=0;i<180;i++)x.step();
  assert.ok(f._groundAimSupport.rotation.angleTo(new THREE.Quaternion())<1e-6);assert.equal(f._groundAimSupport.applied,false);
  assert.ok(f._groundMotion.weight>.99&&f._groundMotion.take,'Release abandoned the source stride');
 }finally{x.close();}
});

for(const size of [.65,1.9,3.2])test(`native size ability ${size} retains boot anchors without stretching the rig`,()=>{
 const x=spineCombatFixture({motion:'strafe'}),{f,dt}=x;
 try{
  setSize(f,size);for(let i=0;i<60;i++)x.step();x.aim(170,1000);x.start('lmb');
  for(let i=0;i<180;i++){
   x.step();restoreGroundAimSupport(f);f.parts.g.updateMatrixWorld(true);
   const boots=[f.parts.legL,f.parts.legR].map(leg=>({leg,position:leg.userData.boot.getWorldPosition(new THREE.Vector3()),
    rotation:leg.userData.boot.getWorldQuaternion(new THREE.Quaternion()),knee:leg.userData.knee.position.clone(),ankle:leg.userData.boot.position.clone(),scale:leg.scale.clone()}));
   animateGroundAimSupport(f,dt,f.slots.lmb,false);f.parts.g.updateMatrixWorld(true);
   for(const b of boots){
    const {knee,boot}=b.leg.userData;
    assert.ok(boot.getWorldPosition(new THREE.Vector3()).distanceTo(b.position)<1e-5,`Sized foot moved at frame ${i}`);
    assert.ok(boot.getWorldQuaternion(new THREE.Quaternion()).angleTo(b.rotation)<1e-5,'Sized sole orientation changed');
    assert.ok(knee.position.equals(b.knee)&&boot.position.equals(b.ankle)&&b.leg.scale.equals(b.scale),'Size solve stretched or rescaled a bone');
   }
  }
 }finally{x.close();}
});

for(const speed of [16,32])test(`running support at ${speed}u/s preserves knee-front continuity at full extension`,()=>{
 const x=spineCombatFixture({motion:'jog'}),{f}=x;
 try{
  f.vel.set(speed,0,0);for(let i=0;i<60;i++)x.step();x.aim(170,1000);x.start('lmb');
  const legs=[f.parts.legL,f.parts.legR],previous=legs.map(l=>l.quaternion.clone());
  for(let i=0;i<180;i++){
   x.step();
   for(let j=0;j<legs.length;j++){
    assert.ok(legs[j].quaternion.angleTo(previous[j])<.5,`Knee-front flipped at frame ${i}, leg ${j}`);
    previous[j].copy(legs[j].quaternion);
   }
  }
 }finally{x.close();}
});

test('ground-air-ground downward reversal retains reachable boot targets',()=>{
 const x=spineCombatFixture({motion:'stand'}),{f}=x;
 try{
  for(let i=0;i<60;i++)x.step();x.aim(170,1000);x.start('lmb');
  for(let i=0;i<480;i++){
   if(i===150){f.flying=true;f.gait='airborne';f.vel.y=12;}
   if(i===210){f.flying=false;f.gait='grounded';f.vel.y=0;}
   if(i===300)x.aim(-90,-1000);if(i===390)x.stop('lmb');x.step();
   if(f.gait==='grounded'&&f._groundAimSupport.applied)for(const foot of f._groundAimSupport.feet){
    assert.ok(foot.leg.userData.boot.getWorldPosition(new THREE.Vector3()).distanceTo(foot.position)<1e-5,`Unreachable boot anchor at frame ${i}`);
   }
  }
 }finally{x.close();}
});

test('active support yields to guard and rebinds after a native form replacement',()=>{
 const x=spineCombatFixture({motion:'strafe'}),{f}=x;
 try{
  for(let i=0;i<60;i++)x.step();x.aim(170,1000);x.start('lmb');for(let i=0;i<60;i++)x.step();
  const old=f.parts.rig;f.applyForm({model:{costume:'plated'}});x.step();
  assert.notEqual(old,f.parts.rig);assert.equal(f._groundAimSupport.rig,f.parts.rig);
  assert.ok(f._groundAimSupport.feet.every(b=>b.leg===f.parts.legL||b.leg===f.parts.legR));
  x.stop('lmb');cancelHeldAttacks(f);f.guarding=true;f.poseGuard=1;x.step();
  assert.equal(f._groundAimSupport.applied,false);assert.ok(f._groundAimSupport.rotation.angleTo(new THREE.Quaternion())<1e-6);
 }finally{x.close();}
});

for(const scale of [.65,1,1.5])test(`steep supported chest fire keeps rendered forearms and fists out of the torso at scale ${scale}`,()=>{
 const x=spineCombatFixture({motion:'strafe',frame:{scale}}),{f}=x,point=new THREE.Vector3(),inside=trunkProbe(f.parts.torso);
 try{
  for(let i=0;i<60;i++)x.step();x.aim(170,1000);x.start('lmb');
  for(let i=0;i<180;i++){
   if(i===70)x.aim(-100,250);if(i===120)x.stop('lmb');x.step();
   const inverse=f.parts.torso.matrixWorld.clone().invert();
   for(const arm of [f.parts.armL,f.parts.armR]){
    const surface=f.parts.rig.limbSurfaces.find(s=>s.upper===arm.children[0]),positions=surface.mesh.geometry.attributes.position;
    for(let row=0;row<surface.rows.length;row++)if(surface.rows[row].driver===arm.children[1])for(let j=0;j<surface.segments;j++){
     point.fromBufferAttribute(positions,row*surface.segments+j).applyMatrix4(surface.mesh.matrixWorld);
     assert.ok(!inside(point,inverse),`Supported forearm crosses torso at frame ${i}`);
    }
    const hand=arm.children[2],vertices=hand.geometry.attributes.position;
    for(let j=0;j<vertices.count;j++){point.fromBufferAttribute(vertices,j).applyMatrix4(hand.matrixWorld);assert.ok(!inside(point,inverse),`Supported fist crosses torso at frame ${i}`);}
   }
  }
 }finally{x.close();}
});

test('takeoff fades existing support without pinning airborne boots to their old targets',()=>{
 const x=spineCombatFixture({motion:'strafe'}),{f,dt}=x;
 try{
  for(let i=0;i<60;i++)x.step();x.aim(170,1000);x.start('lmb');for(let i=0;i<60;i++)x.step();
  const previous=f._groundAimSupport.rotation.clone();assert.ok(previous.angleTo(new THREE.Quaternion())>.2);
  f.flying=true;f.gait='airborne';f.vel.set(0,15,0);x.step();
  assert.ok(previous.angleTo(f._groundAimSupport.rotation)<=4*dt+1e-6,'Takeoff snapped the support layer');
  for(let i=0;i<60;i++)x.step();
  assert.ok(f._groundAimSupport.rotation.angleTo(new THREE.Quaternion())<1e-6);assert.equal(f._groundAimSupport.applied,false);
  assert.ok(f.slots.lmb.active.emissionAge>0,'Takeoff killed the held shot');
 }finally{x.close();}
});

test('KO captures the supported body and respawn cannot inherit its lean or foot targets',()=>{
 const x=spineCombatFixture({motion:'strafe'}),{f,g,dt}=x;
 try{
  for(let i=0;i<60;i++)x.step();x.aim(170,1000);x.start('lmb');for(let i=0;i<60;i++)x.step();
  const torso=f.parts.torso.getWorldPosition(new THREE.Vector3());f._ko();x.stop('lmb');
  assert.ok(f.parts.torso.getWorldPosition(new THREE.Vector3()).distanceTo(torso)<1e-5,'KO changed the captured support pose');
  for(let i=0;i<30;i++){f.ragdoll.step(dt,g);f.ragdoll.apply(f);g.projectiles.update(dt,g);}
  f.koT=3.5;f._updateKO(0,g);f.facing=0;x.aim(0);x.step();
  assert.equal(f.state,'idle');assert.equal(f.ragdoll,null);assert.equal(f._groundAimSupport.applied,false);
  assert.ok(f._groundAimSupport.rotation.angleTo(new THREE.Quaternion())<1e-6);
  assert.ok(Math.abs(f.parts.body.position.z)<1e-5,'Respawn retained the supported hip offset');
 }finally{x.close();}
});

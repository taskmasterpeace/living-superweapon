import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {spineCombatFixture} from './helpers/spine-combat-fixture.mjs';
import {cancelHeldAttacks} from '../src/engine/abilities.js';
import {trunkProbe} from './helpers/trunk-probe.mjs';

for(const motion of ['strafe','fly'])for(const source of ['hand','chest','eye'])for(const hz of [30,60,120])
test(`composed ${source} spine stays connected and bounded through ${motion} reversals at ${hz} Hz`,()=>{
 const x=spineCombatFixture({motion,source,hz}),{f,dt}=x;
 const torso=new THREE.Quaternion(),pelvis=new THREE.Quaternion(),relative=new THREE.Quaternion(),angles=new THREE.Euler(0,0,0,'YXZ');
 let previous=null;
 try{
  for(let i=0;i<hz;i++)x.step();x.start('lmb');for(let i=0;i<hz;i++)x.step();
  const position=f.pos.clone(),velocity=f.vel.clone();
  for(let frame=0;frame<hz*3;frame++){
   if(frame===0)x.aim(170,25);if(frame===hz)x.aim(-100,-30);if(frame===hz*2)x.aim(5,60);x.step();
   f.parts.torso.getWorldQuaternion(torso);f.parts.pelvis.getWorldQuaternion(pelvis);
   relative.copy(pelvis).invert().multiply(torso);angles.setFromQuaternion(relative);
   assert.ok(Math.abs(angles.y)<=1.2+1e-5,`Final torso/pelvis yaw is ${angles.y*180/Math.PI} degrees at frame ${frame}`);
   if(previous)assert.ok(relative.angleTo(previous)<=12*dt+1e-5,`Composed torso snapped ${relative.angleTo(previous)*180/Math.PI} degrees at frame ${frame}`);
   else previous=new THREE.Quaternion();previous.copy(relative);
   const beam=f.slots.lmb.active;assert.ok(beam?.emissionAge>0,'The sustaining shot disappeared');
   if(source!=='hand'){
    const part=source==='eye'?f.parts.head:f.parts.torso,ray=new THREE.Vector3(0,0,1).applyQuaternion(part.getWorldQuaternion(new THREE.Quaternion()));
    assert.ok(ray.dot(beam.dir)>.99,`The ${source} beam detached from its animated emitter`);
   }
   assert.ok(f.pos.distanceTo(position)<1e-8&&f.vel.distanceTo(velocity)<1e-8,'Spine support changed simulation travel');
  }
 }finally{x.close();}
});

for(const motion of ['strafe','fly'])for(const releaseAt of [1,12,75])
test(`${motion} chest reversal releases smoothly at frame ${releaseAt}`,()=>{
 const x=spineCombatFixture({motion}),{f,dt}=x;
 try{
  for(let i=0;i<60;i++)x.step();x.start('lmb');for(let i=0;i<60;i++)x.step();x.aim(170,25);
  let previous=f.parts.pelvis.quaternion.clone().invert().multiply(f.parts.torso.quaternion);
  for(let i=0;i<240;i++){
   if(i===releaseAt)x.stop('lmb');x.step();
   const q=f.parts.pelvis.quaternion.clone().invert().multiply(f.parts.torso.quaternion);
   assert.ok(q.angleTo(previous)<=12*dt+1e-5,`Release snapped at frame ${i}`);previous.copy(q);
  }
  assert.ok(Math.abs(f._spinePose.bias)<.001,'Released attack left a heading offset');
  assert.ok(f._combatAim.weight<.0001,'Attack did not finish recovery');
 }finally{x.close();}
});

for(const motion of ['strafe','fly'])test(`current-rig spine and real arm surfaces survive ${motion} form replacement`,()=>{
 const x=spineCombatFixture({motion}),{f}=x;
 try{
  for(let i=0;i<60;i++)x.step();x.start('lmb');for(let i=0;i<60;i++)x.step();x.aim(170,25);
  const old=f.parts.rig;f.applyForm({model:{costume:'plated'}});assert.notEqual(old,f.parts.rig);
  const inside=trunkProbe(f.parts.torso),point=new THREE.Vector3();
  for(let i=0;i<120;i++){
   x.step();assert.equal(f._spinePose.rig,f.parts.rig);
   for(const b of f._spinePose.base)assert.ok(b.part.parent===f.parts.body,'Old upper-part reference');
   const inverse=f.parts.torso.matrixWorld.clone().invert();
   for(const arm of [f.parts.armL,f.parts.armR]){
    const surface=f.parts.rig.limbSurfaces.find(s=>s.upper===arm.children[0]),positions=surface.mesh.geometry.attributes.position;
    for(let row=0;row<surface.rows.length;row++)if(surface.rows[row].driver===arm.children[1])for(let j=0;j<surface.segments;j++){
     point.fromBufferAttribute(positions,row*surface.segments+j).applyMatrix4(surface.mesh.matrixWorld);
     assert.ok(!inside(point,inverse),`Visible forearm penetrates torso at frame ${i}`);
    }
   }
  }
  x.stop('lmb');cancelHeldAttacks(f);f.guarding=true;f.poseGuard=1;x.step();
  assert.equal(f._spinePose.engaged,false);assert.equal(f._spinePose.applied,false);assert.equal(f._spinePose.bias,0);
 }finally{x.close();}
});

for(const source of ['eye','chest'])for(const height of [30,250])
test(`flying ${source} settles on the commanded elevated target (${height}u), not only its own emitter`,()=>{
 const x=spineCombatFixture({motion:'fly',source}),{f}=x;
 try{
  for(let i=0;i<60;i++)x.step();x.aim(90,height);x.start('lmb');
  for(let i=0;i<480;i++)x.step();
  const beam=f.slots.lmb.active,command=f.aimWorld.clone().sub(beam.muzzle).normalize();
  assert.ok(beam.emissionAge>0,'Shot failed to acquire its initial target');
  assert.ok(beam.dir.dot(command)>.998,`Settled emission misses by ${beam.dir.angleTo(command)*180/Math.PI} degrees`);
 }finally{x.close();}
});

for(const motion of ['strafe','fly'])for(const yaw of [90,170,-100])
test(`${motion} chest support converges to a held ${yaw} degree target without changing travel`,()=>{
 const x=spineCombatFixture({motion}),{f}=x;
 try{
  for(let i=0;i<60;i++)x.step();x.start('lmb');for(let i=0;i<60;i++)x.step();x.aim(yaw,25);
  const position=f.pos.clone(),velocity=f.vel.clone();
  for(let i=0;i<300;i++){
   x.step();const beam=f.slots.lmb.active;
   if(i>=240)assert.ok(beam.dir.dot(f.aimWorld.clone().sub(beam.muzzle).normalize())>.985,'Support left a held shot outside its target cone');
   assert.ok(f.pos.equals(position)&&f.vel.equals(velocity),'Support steered the movement controller');
  }
 }finally{x.close();}
});

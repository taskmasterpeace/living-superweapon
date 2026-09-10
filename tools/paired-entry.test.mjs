import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {pairedCombatFixture} from './helpers/paired-combat-fixture.mjs';

// A clear forearm is not sufficient: the carrier itself must not jump when
// travel-only flight becomes concurrent eye/hand preparation.
for(const motion of ['hover','fly'])for(const hz of [30,60,120])for(const offAxis of [false,true])
test(`paired preparation keeps the rendered upper-body entry continuous (${motion}, ${hz}Hz, offAxis=${offAxis})`,()=>{
 const x=pairedCombatFixture({motion,hz}),{f,dt}=x;
 try{
  if(offAxis){f.aimWorld.set(Math.sin(1.2)*100,50+Math.sin(.5)*100,Math.cos(1.2)*Math.cos(.5)*100);f.aim3.copy(f.aimWorld).sub(f.pos).normalize();}
  for(let i=0;i<hz*1.5;i++)x.step();
  let previous=f.parts.torso.quaternion.clone();const position=f.pos.clone(),velocity=f.vel.clone(),launched={};
  for(let i=0;i<hz;i++){
   x.sequence(i);
   const travel=previous.angleTo(f.parts.torso.quaternion);previous.copy(f.parts.torso.quaternion);
   assert.ok(travel<=12*dt+1e-7,`frame ${i}: torso jumps ${travel/dt} rad/s during entry`);
   for(const [key,slot]of Object.entries(f.slots)){
    const beam=slot.active;if(!beam)continue;
    if(beam.pendingLaunch){assert.equal(beam.pn,0);assert.equal(beam.grp.visible,false);}
    else if(beam.emissionAge>0){
     launched[key]??=i*dt-.2;
     if(key==='lmb'){
      const forward=new THREE.Vector3(0,0,1).applyQuaternion(f.parts.head.getWorldQuaternion(new THREE.Quaternion()));
      assert.ok(forward.dot(beam.dir)>.985,'An entry blend detaches emitted eye energy');
     }
    }
   }
  }
  for(const key of ['lmb','rmb'])assert.ok(launched[key]>=0&&launched[key]<=.3,`${key} never finishes preparing: ${launched[key]}`);
  assert.ok(f.pos.equals(position)&&f.vel.equals(velocity),'Pose entry must not redirect travel');
 }finally{x.close();}
});

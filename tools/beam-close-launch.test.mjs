import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {handStartupFixture} from './helpers/hand-startup-fixture.mjs';

for(const motion of ['stand','fly'])for(const distance of [8,12])for(const hz of [30,60,120])test(`${motion} charged paired beam reaches ${distance}-unit captured aim without stranding at ${hz}Hz`,()=>{
 const x=handStartupFixture({motion,charge:true,hz});
 try{
  x.f.aimWorld.copy(x.f.pos).add(new THREE.Vector3(0,7,distance));
  x.input(true,true,false);for(let n=0;n<Math.round(.7*hz);n++){x.input(false,true,false);x.step();}
  const captured=x.f.aimWorld.clone(),root=x.f.pos.clone(),velocity=x.f.vel.clone();
  x.input(false,false,true);const beam=x.f.slots.lmb.active;
  let elapsed=0;while(beam.pendingLaunch&&elapsed<.5){x.step();elapsed+=x.dt;}
  assert.ok(beam.emissionAge>0,`Reachable close shot remained pending for ${elapsed}s`);
  assert.ok(beam.dir.dot(captured.sub(beam.muzzle).normalize())>.999999,'Shot must keep its captured target');
  assert.ok(x.f.pos.equals(root)&&x.f.vel.equals(velocity),'Articulation must not relocate caster');
  for(const arm of x.arms){
   const hand=arm.children[2],point=x.f.aimWorld.clone().sub(hand.getWorldPosition(new THREE.Vector3())).normalize();
   const normal=new THREE.Vector3(0,-1,0).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()));
   assert.ok(normal.dot(point)>.99,'Each palm must face its own converging ray');
  }
 }finally{x.close();}
});

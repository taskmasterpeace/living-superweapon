import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {handStartupFixture} from './helpers/hand-startup-fixture.mjs';
import {trunkProbe} from './helpers/trunk-probe.mjs';
import {cancelHeldAttacks} from '../src/engine/abilities.js';

for(const motion of ['stand','fly'])for(const distance of [4,8,12])for(const hz of [30,60,120])test(`${motion} charged paired beam reaches ${distance}-unit captured aim without stranding at ${hz}Hz`,()=>{
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

for(const scale of [.65,1,1.5])test(`point-blank flying release preserves rendered hand/forearm clearance at scale ${scale}`,()=>{
 const x=handStartupFixture({motion:'fly',charge:true,scale}),f=x.f,inside=trunkProbe(f.parts.torso),point=new THREE.Vector3();
 try{
  f.aimWorld.copy(f.pos).add(new THREE.Vector3(0,7*scale,4*scale));
  x.input(true,true,false);
  for(let frame=0;frame<120;frame++){
   if(frame<42)x.input(false,true,false);
   if(frame===42)x.input(false,false,true);
   if(frame===90){cancelHeldAttacks(f);f.guarding=true;f.poseGuard=1;}
   x.step();
   if(frame===75)assert.ok(f.slots.lmb.active?.emissionAge>0,'Scaled point-blank beam did not launch');
   const inverse=f.parts.torso.matrixWorld.clone().invert();
   for(const arm of x.arms){
    const surface=f.parts.rig.limbSurfaces.find(s=>s.upper===arm.children[0]);
    for(const [mesh,limb]of [[arm.children[2],null],[surface.mesh,surface]]){
     const positions=mesh.geometry.attributes.position;
     for(let v=0;v<positions.count;v++){
      if(limb&&limb.rows[Math.floor(v/limb.segments)]?.driver!==arm.children[1])continue;
      mesh.getVertexPosition(v,point).applyMatrix4(mesh.matrixWorld);
      assert.equal(inside(point,inverse),false,`frame ${frame}, ${mesh.name}, vertex ${v} penetrates torso`);
     }
    }
   }
  }
 }finally{x.close();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {runSlot} from '../src/engine/abilities.js';
import {trunkProbe} from './helpers/trunk-probe.mjs';

function fixture(motion='strafe',hz=60,cofire=true){
 const def=structuredClone(ROSTER.find(d=>d.id==='sol'));
 const chest={type:'beam',name:'Reactor channel',chest:true,castStyle:'chest-brace',steer:2,cost:1,dps:1,kiPerSec:1,color:'#ffca45'};
 const hand={type:'beam',name:'Palm channel',castStyle:'palm',steer:12,cost:1,dps:1,kiPerSec:1,color:'#40baff'};
 def.abilities={lmb:chest,rmb:hand};
 const scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(scene,world),g=combat.game,f=new Fighter(def);g.entities=[f];scene.add(f.obj);
 f._game=g;f._openSky=true;f.energyInfinite=true;f.hasAimWorld=true;f.level=10;
 f.flying=!['stand','strafe'].includes(motion);f.gait=f.flying?'airborne':'grounded';f.pos.set(0,f.flying?50:0,0);
 f.vel.set(motion==='strafe'?14:0,motion==='rise'?10:motion==='descend'?-10:0,motion==='fly'?40:0);
 f.aimWorld.set(0,f.pos.y+22,100);f.aim3.copy(f.aimWorld).sub(f.pos).normalize();f.aim.set(0,0,1);f.facing=0;
 const dt=1/hz,step=()=>{f.animT+=dt;f.advanceActionPose(dt);f._animate(dt);g.projectiles.update(dt,g);f.obj.updateMatrixWorld(true);};
 for(let i=0;i<hz;i++)step();
 const trigger=(key,held)=>runSlot(f,key,{pressed:held,held,released:!held,dt},g);
 trigger('lmb',true);if(cofire)trigger('rmb',true);
 return {f,g,dt,step,trigger,close(){combat.dispose();f.dispose();}};
}

for(const hz of [30,60,120])for(const motion of ['stand','strafe','hover','fly','rise','descend'])
test(`chest and palm track their own traveling emission during ${motion} at ${hz} Hz`,()=>{
 const {f,step,close}=fixture(motion,hz),velocity=f.vel.clone();
 try{
  let minChest=1,minHand=1,separation=0;
  for(let i=0;i<hz*3;i++){
   if(i>hz){f.aimWorld.x=Math.sin((i-hz)/hz)*80;f.aimWorld.y=f.pos.y+45;f.facing=Math.atan2(f.aimWorld.x,100);f.aim3.copy(f.aimWorld).sub(f.pos).normalize();}
   step();if(i<hz)continue;
   const chest=f.slots.lmb.active,palm=f.slots.rmb.active;
   const chestRay=new THREE.Vector3(0,0,1).applyQuaternion(f.parts.torso.getWorldQuaternion(new THREE.Quaternion()));
   const handRay=new THREE.Vector3(0,-1,0).applyQuaternion(f.parts.armR.children[2].getWorldQuaternion(new THREE.Quaternion()));
   minChest=Math.min(minChest,chestRay.dot(chest.dir));minHand=Math.min(minHand,handRay.dot(palm.dir));
   separation=Math.max(separation,chest.dir.angleTo(palm.dir));
   assert.ok(chest.muzzle.distanceTo(f.muzzle(new THREE.Vector3(),1.2,5.4))<1e-4);
   if(motion==='strafe')assert.ok(f._groundMotion.weight>.9);
  }
  assert.ok(separation>.07,'the test must actually give the two channels different emission directions');
  assert.ok(minChest>.985,`chest diverges from its beam by ${Math.acos(minChest)*180/Math.PI} degrees`);
  assert.ok(minHand>.985,`palm diverges from its beam by ${Math.acos(minHand)*180/Math.PI} degrees`);
  assert.ok(f.vel.distanceTo(velocity)<1e-8,'articulation cannot change commanded motion');
 }finally{close();}
});

for(const motion of ['strafe','hover'])test(`chest carrier restores through release, interruption and form replacement (${motion})`,()=>{
 const {f,step,trigger,close}=fixture(motion),identity=new THREE.Quaternion();
 try{
  for(let i=0;i<90;i++)step();
  assert.ok(f._chestPose.applied);
  trigger('lmb',false);
  for(let i=0;i<90;i++)step();
  assert.ok(f._chestPose.rotation.angleTo(identity)<1e-5,'ending chest fire restores the torso while palm fire continues');
  assert.ok(f.slots.rmb.active?.sustaining,'the independent hand channel stays active');
  f.slots.lmb.cd=0;trigger('lmb',true);
  for(let i=0;i<60;i++)step();
  const root=f.obj,position=f.pos;
  assert.equal(f.applyForm({name:'Reactor armor',frame:{scale:1.2,bulk:1.3},model:{costume:'plated'}}),true);
  assert.equal(f.obj,root);assert.equal(f.pos,position);
  const clean=new Fighter(f.def),rest=Object.fromEntries(['torso','head','armL','armR'].map(key=>[key,clean.parts[key].position.clone()]));clean.dispose();
  trigger('lmb',false);trigger('rmb',false);
  for(let i=0;i<120;i++)step();
  // Torso/shoulder offsets must return to the replacement rig's bind; an
  // active carrier is presentation state, not a permanent model proportion.
  if(motion==='hover')for(const key of ['torso','head','armL','armR']){
   const offset=f.parts[key].position.clone().sub(rest[key]);
   // Idle breathing legitimately changes head/torso Y; carrier drift does not.
   if(key==='torso'||key==='head')offset.y=0;
   assert.ok(offset.length()<1e-5,`${key} kept a chest-carrier offset in its new bind: ${offset.toArray()}`);
  }
  f.slots.lmb.cd=0;trigger('lmb',true);for(let i=0;i<60;i++)step();
  f.guarding=true;f.poseGuard=1;for(let i=0;i<30;i++){f.poseGuard=1;step();}
  assert.ok(f._chestPose.rotation.angleTo(identity)<1e-5,'guard eventually owns the upper body');
 }finally{close();}
});

for(const motion of ['strafe','hover','fly'])test(`rendered chest/palm limb surfaces remain outside the torso across entry, tracking and recovery (${motion})`,()=>{
 const {f,step,trigger,close}=fixture(motion),inside=trunkProbe(f.parts.torso),point=new THREE.Vector3();
 try{
  let penetrations=0,deepestBoot=0,maxCorrection=0;
  for(let i=0;i<300;i++){
   if(i>60&&i<210){f.aimWorld.x=Math.sin((i-60)/60)*75;f.facing=Math.atan2(f.aimWorld.x,100);f.aimWorld.y=f.pos.y+35;}
   if(i===210){trigger('lmb',false);trigger('rmb',false);}
   step();maxCorrection=Math.max(maxCorrection,f._chestPose.rotation.angleTo(new THREE.Quaternion()));
   if(i%6)continue;
   const inverse=f.parts.torso.matrixWorld.clone().invert();
   for(const key of ['armL','armR'])for(const mesh of f.parts[key].children.slice(1,3)){
    const positions=mesh.geometry.attributes.position;
    for(let j=0;j<positions.count;j++){
     point.fromBufferAttribute(positions,j).applyMatrix4(mesh.matrixWorld);
     if(inside(point,inverse))penetrations++;
    }
   }
   if(motion==='strafe')for(const key of ['legL','legR']){
    const boot=f.parts[key].userData.boot,positions=boot.geometry.attributes.position;
    for(let j=0;j<positions.count;j++)deepestBoot=Math.min(deepestBoot,point.fromBufferAttribute(positions,j).applyMatrix4(boot.matrixWorld).y);
   }
  }
  assert.equal(penetrations,0,'actual forearm/fist vertices entered the closed torso mesh');
  assert.ok(deepestBoot>-.08,`boot penetrated the ground by ${-deepestBoot}`);
  assert.ok(maxCorrection<=.800001,'additional chest correction exceeds its thoracic budget');
 }finally{close();}
});

for(const hz of [30,60,120])test(`KO preserves the captured chest pose but never reapplies it to a new life at ${hz} Hz`,()=>{
 const {f,g,step,dt,close}=fixture('hover',hz);
 try{
  for(let i=0;i<hz;i++)step();
  // Hover now follows emitted yaw, so use an actual rearward reversal to
  // load the thoracic carrier. Keep the substantial-correction threshold.
  f.aimWorld.set(30,110,-200);f.facing=Math.atan2(30,-200);
  f.aim3.copy(f.aimWorld).sub(f.pos).normalize();
  for(let i=0;i<Math.ceil(hz*.2);i++)step();
  assert.ok(f._chestPose.rotation.angleTo(new THREE.Quaternion())>.5,'must KO with substantial real chest correction');
  const captured=f.parts.torso.position.clone(),capturedQ=f.parts.torso.quaternion.clone();
  f._ko();
  assert.ok(f.parts.torso.position.distanceTo(captured)<1e-8&&f.parts.torso.quaternion.angleTo(capturedQ)<1e-5,'KO must capture the actual final pose, not snap to bind');
  for(let i=0;i<20;i++){f.animT+=dt;f.ragdoll.step(dt,g);f.ragdoll.apply(f);g.projectiles.update(dt,g);}
  f.koT=3.5;f._updateKO(0,g);f.gait='grounded';f.flying=false;f.facing=0;f.aimWorld.set(0,7,100);step();
  assert.equal(f.state,'idle');assert.equal(f.ragdoll,null);
  assert.ok(f._chestPose.rotation.angleTo(new THREE.Quaternion())<1e-5,'old chest orientation cannot steer a new life');
  assert.ok(Math.abs(f.parts.torso.position.z)<1e-5,'the dead life cannot leave a torso offset');
 }finally{close();}
});

for(const hz of [30,60,120])test(`shipped TITAN palm faces its first released cannon packet while the chest is still charging at ${hz} Hz`,()=>{
 const scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const c=new StudioCombat(scene,world),f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='titan')));
 c.game.vfx._itex=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);
 Object.assign(f,{_openSky:true,level:10,energyInfinite:true});scene.add(f.obj);
 c.shooterMotion='ground-right';c.reset(f,true,'attack');c.slot='q';c.secondarySlot='lmb';c.distance=55;c.elevation=20;c.motion='orbit-right';c.targetSpeed=20;
 f.slots.q.def.castStyle='chest-brace';
 try{
  let first=0;
  for(let i=1;i<=Math.ceil(hz*2.3);i++){
   c.step(i/hz,1/hz);const beam=f.slots.lmb.active;
   if(!beam?.sustaining||!f.slots.q.charging)continue;
   const hand=f.parts.armR.children[2],ray=new THREE.Vector3(0,-1,0).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()));
   assert.ok(ray.dot(beam.dir)>.985,`release wrist diverges by ${ray.angleTo(beam.dir)*180/Math.PI} degrees at ${i/hz}s`);first++;
  }
  assert.ok(first>=hz*.15,'must exercise the real charge-to-cannon handoff during a concurrent chest charge');
 }finally{c.game.vfx._itex.dispose();c.dispose();f.dispose();}
});

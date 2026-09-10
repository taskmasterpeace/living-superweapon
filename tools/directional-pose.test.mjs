import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {GAIT} from '../src/core/util.js';
import {runSlot} from '../src/engine/abilities.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {trunkProbe} from './helpers/trunk-probe.mjs';

const tick=f=>{f.animT+=1/60;f._animate(1/60);f.obj.updateMatrixWorld(true);};
function fighter(id='sol',scale=1){
 const def=structuredClone(ROSTER.find(d=>d.id===id));def.frame={...def.frame,scale};
 const f=new Fighter(def);f.animT=0;f._openSky=true;f.gait=GAIT.GROUNDED;f.flying=false;
 f.facing=0;f.aim.set(0,0,1);f.aim3.set(0,0,1);f.hasAimWorld=true;f.aimWorld.set(0,7*scale,100);
 f.vel.set(14*scale,0,0);return f;
}
function cast(f){const slot=Object.values(f.slots).find(s=>s.def.type==='beam');slot.active={sustaining:true,power:1,emissionAge:1};f.castPose=1;return slot;}
const worldForward=part=>new THREE.Vector3(0,0,1).applyQuaternion(part.getWorldQuaternion(new THREE.Quaternion()));

test('lateral optic fire keeps a complete articulated gait and separate travel, shoulder and eye headings',()=>{
 const f=fighter();cast(f);const knees=[],hips=[];const pos=f.pos.toArray(),vel=f.vel.toArray();
 try{
  for(let i=0;i<180;i++){tick(f);if(i>60){knees.push(f.parts.legR.userData.knee.rotation.x);hips.push(f.parts.pelvis.rotation.y);}}
  assert.ok(f._groundMotion.weight>.95,'Sustained ranged casting must not switch off the source gait');
  assert.ok(Math.max(...knees)-Math.min(...knees)>.35,'Knees must keep articulating during the shot');
  assert.ok(Math.max(...hips)-Math.min(...hips)>.03,'Source pelvis counterrotation must survive');
  assert.ok(worldForward(f.obj).x>.9,'Lower body should follow lateral travel');
  assert.ok(worldForward(f.parts.torso).z>.75,'Shoulders should turn independently toward the shot: '+JSON.stringify({dir:worldForward(f.parts.torso).toArray(),yaw:f.obj.rotation.y,torso:f.parts.torso.rotation.toArray(),body:f.parts.body.rotation.toArray(),shoulder:f._directionalPose?.shoulder}));
  const head=f.parts.head.getWorldPosition(new THREE.Vector3()),ray=f.aimWorld.clone().sub(head).normalize();
  assert.ok(worldForward(f.parts.head).dot(ray)>.98,'Eyes must track the actual attack target');
  assert.deepEqual(f.pos.toArray(),pos);assert.deepEqual(f.vel.toArray(),vel);
 }finally{f.dispose();}
});

test('side-cast keeps hand and forearm volumes outside the trunk at three body scales',()=>{
 for(const scale of [.65,1,1.5])for(const side of [-1,1]){
  const f=fighter('kano',scale);f.vel.x*=side;cast(f);const inside=trunkProbe(f.parts.torso),point=new THREE.Vector3();
  try{for(let i=0;i<150;i++){
   tick(f);if(i<60)continue;
   const arm=f.parts.armR,hand=arm.children[2];
   const ray=f.aimWorld.clone().sub(hand.getWorldPosition(new THREE.Vector3())).normalize();
   const palm=new THREE.Vector3(0,-1,0).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()));
   assert.ok(palm.dot(ray)>.97,'Palm and attached weapon must point along the shot');
   // The old driver caps have drawRange=0. Check the continuous rendered
   // forearm AND elbow fillet on both arms, including every playback frame.
   const inverse=f.parts.torso.matrixWorld.clone().invert();
   for(const limb of [f.parts.armL,f.parts.armR]){
    const surface=f.parts.rig.limbSurfaces.find(s=>s.upper===limb.children[0]),vertices=surface.mesh.geometry.attributes.position;
    for(let row=0;row<surface.rows.length;row++)if(surface.rows[row].driver===limb.children[1]||surface.rows[row].t!==undefined){
     for(let j=0;j<surface.segments;j++){
      point.fromBufferAttribute(vertices,row*surface.segments+j).applyMatrix4(surface.mesh.matrixWorld);
      assert.ok(!inside(point,inverse),`Rendered forearm/elbow penetrates trunk: scale ${scale}, side ${side}, frame ${i}, row ${row}, column ${j}`);
     }
    }
    const fist=limb.children[2];for(let v=0;v<fist.geometry.attributes.position.count;v++){
     fist.getVertexPosition(v,point).applyMatrix4(fist.matrixWorld);
     assert.ok(!inside(point,inverse),`Rendered fist penetrates trunk: scale ${scale}, side ${side}, frame ${i}, vertex ${v}`);
    }
   }
   const low=Math.min(...[f.parts.legL,f.parts.legR].map(l=>new THREE.Box3().setFromObject(l.userData.boot).min.y));
   assert.ok(low>=-.03,'Moving shot cannot push boots through the floor');
  }}finally{f.dispose();}
 }
});

test('turning and casting overlays release cleanly into a form change and a frontal guard',()=>{
 const f=fighter(),baseline=fighter();const slot=cast(f);
 try{
  for(let i=0;i<120;i++)tick(f);
  slot.active=null;f.castPose=0;f.vel.set(0,0,0);baseline.vel.set(0,0,0);
  baseline.animT=f.animT;
  f.applyForm({frame:{scale:1.2}});baseline.applyForm({frame:{scale:1.2}});
  for(let i=0;i<300;i++){tick(f);tick(baseline);}
  for(const key of ['torso','head','armL','armR','pelvis']){
   assert.ok(f.parts[key].position.distanceTo(baseline.parts[key].position)<.015,key+' positional recovery');
   assert.ok(f.parts[key].quaternion.angleTo(baseline.parts[key].quaternion)<.015,key+' rotational recovery');
  }
  f.guarding=true;f.poseGuard=1;f.vel.set(14,0,0);
  for(let i=0;i<60;i++)tick(f);
  assert.ok(worldForward(f.obj).z>.98,'Guard must face its gameplay blocking arc');
  assert.equal(f._groundMotion.weight,0);
 }finally{f.dispose();baseline.dispose();}
});

test('real rifle fire aims its driven weapon while the legs keep running',()=>{
 const f=fighter('sarge');const scene=new THREE.Scene(),world={scene,cover:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(scene,world);combat.game.audio={...combat.game.audio,gunshot(){}};f._game=combat.game;
 try{
  for(let i=0;i<90;i++){
   f.slots.lmb.cd=0;f.ki=f.maxKi;runSlot(f,'lmb',{pressed:i===0,held:true,released:false,dt:1/60},combat.game);f.vel.set(14,0,0);tick(f);
  }
  assert.ok(f._groundMotion.weight>.95,'Gunfire cannot cancel the running legs');
  const hand=f.parts.armR.children[2],ray=f.aimWorld.clone().sub(hand.getWorldPosition(new THREE.Vector3())).normalize();
  const barrel=new THREE.Vector3(0,-1,0).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()));
  assert.ok(barrel.dot(ray)>.97,'Equipped gun barrel must follow aim while moving sideways');
 }finally{combat.dispose();f.dispose();}
});

test('authored optic-focus brings one empty hand to the temple without moving the eye emitter',()=>{
 const f=fighter();f.vel.set(0,0,0);const slot=cast(f);slot.def={...slot.def,castStyle:'optic-focus'};
 try{
  for(let i=0;i<90;i++)tick(f);
  const head=f.parts.head.getWorldPosition(new THREE.Vector3()),hand=f.parts.armR.children[2].getWorldPosition(new THREE.Vector3());
  assert.ok(hand.distanceTo(head)<2,'Optic-focus must place the focus hand beside the visor, not at the hip');
  assert.ok(worldForward(f.parts.head).dot(f.aimWorld.clone().sub(head).normalize())>.99);
  assert.equal(f._combatAim.source,'face');
 }finally{f.dispose();}
});

test('explicit chest brace squares the forearms outside the ribs',()=>{
 const f=fighter();f.vel.set(0,0,0);const slot=cast(f);slot.def={...slot.def,faceOrigin:false,chest:true,castStyle:'chest-brace'};
 try{
  for(let i=0;i<90;i++)tick(f);
  const l=f.parts.body.worldToLocal(f.parts.armL.children[2].getWorldPosition(new THREE.Vector3()));
  const r=f.parts.body.worldToLocal(f.parts.armR.children[2].getWorldPosition(new THREE.Vector3()));
  assert.ok(l.y>5&&r.y>5,'A chest emitter needs active forearm bracing, not idle hanging fists');
  assert.ok(l.x< -1.4&&r.x>1.4,'Hands stay outside the chest beam aperture');
 }finally{f.dispose();}
});

test('an abrupt aim reversal never twists the neck behind the shoulders',()=>{
 const f=fighter();f.vel.set(0,0,14);cast(f);
 try{
  for(let i=0;i<120;i++)tick(f);
  f.facing=Math.PI;f.aim.set(0,0,-1);f.aim3.set(0,0,-1);f.aimWorld.set(0,7,-100);
  for(let i=0;i<90;i++){
   tick(f);const angle=worldForward(f.parts.head).angleTo(worldForward(f.parts.torso));
   assert.ok(angle<1.1,`Neck must remain within its shoulder cone during reversal, got ${angle}`);
  }
  assert.ok(worldForward(f.parts.head).z<-.95,'Eyes settle onto the new rear target');
 }finally{f.dispose();}
});

test('a high grounded optic shot is supported by the torso without losing aim',()=>{
 const f=fighter();f.vel.set(0,0,0);cast(f);f.aimWorld.set(0,100,20);f.aim3.copy(f.aimWorld).normalize();
 try{
  for(let i=0;i<120;i++)tick(f);
  const ray=f.aimWorld.clone().sub(f.parts.head.getWorldPosition(new THREE.Vector3())).normalize();
  assert.ok(worldForward(f.parts.head).dot(ray)>.98,'A legal high shot must not be permanently clamped below its target');
  assert.ok(worldForward(f.parts.torso).y>.25,'The spine, not only the neck, supports the high shot');
 }finally{f.dispose();}
});

test('raising guard during a strafe keeps the torso facing the threat on entry',()=>{
 const f=fighter('vanguard');
 try{
  for(let i=0;i<120;i++)tick(f);
  f.guarding=true;
  for(let i=0;i<30;i++){
   f.poseGuard=THREE.MathUtils.damp(f.poseGuard,1,14,1/60);tick(f);
   assert.ok(worldForward(f.parts.torso).z>.85,'Guard takeover cannot snap the chest away from the unchanged attacker');
  }
 }finally{f.dispose();}
});

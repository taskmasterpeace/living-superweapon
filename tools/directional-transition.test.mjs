import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {GAIT} from '../src/core/util.js';
import {runSlot} from '../src/engine/abilities.js';
import {StudioCombat} from '../src/tool/studio-combat.js';

const dt=1/60;
const tick=f=>{
 if(f._game){
  f.slots.lmb.cd=0;f.ki=f.maxKi;
  runSlot(f,'lmb',{pressed:false,held:true,released:false,dt},f._game);
  // Hold the fixture's travel constant after actual rifle recoil. This test
  // isolates visual heading arbitration from input/physics acceleration.
  f.vel.set(0,0,14);
 }
 f.animT+=dt;f._animate(dt);f.obj.updateMatrixWorld(true);
};
function aimAt(f,degrees){
 f.facing=degrees*Math.PI/180;
 f.aim.set(Math.sin(f.facing),0,Math.cos(f.facing));f.aim3.copy(f.aim);
 f.aimWorld.copy(f.pos).addScaledVector(f.aim,100);f.aimWorld.y=7;
}
function movingCaster(degrees,id='kano'){
 const f=new Fighter(structuredClone(ROSTER.find(d=>d.id===id)));
 f._openSky=true;f.gait=GAIT.GROUNDED;f.flying=false;f.hasAimWorld=true;
 f.vel.set(0,0,14);aimAt(f,degrees);
 if(id==='sarge'){
  const scene=new THREE.Scene(),world={scene,cover:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
  f.testCombat=new StudioCombat(scene,world);f.testCombat.game.audio={...f.testCombat.game.audio,gunshot(){}};f._game=f.testCombat.game;
 }else{
  const slot=Object.values(f.slots).find(s=>s.def.type==='beam');
  slot.active={sustaining:true,power:1,emissionAge:1};f.castPose=1;
 }
 for(let i=0;i<120;i++)tick(f);
 return f;
}

// A tiny target correction at the advance/retreat boundary used to change the
// desired leg heading by ~140 degrees. This exercises the final production
// body and occupied casting hand, including source gait and emitter solves.
for(const id of ['kano','sarge'])for(const side of [-1,1])for(const entry of [119,123])test(`${id} retains its moving cast stride when aim jitters across the retreat boundary (${side}, entry ${entry})`,()=>{
 const f=movingCaster(side*entry,id),position=f.pos.clone(),velocity=f.vel.clone();
 try{
  const initial=f.obj.quaternion.clone();
  for(let i=0;i<180;i++){
   aimAt(f,side*(i%2?119:123));const before=f.obj.quaternion.clone();tick(f);
   assert.ok(before.angleTo(f.obj.quaternion)<.12,'A four-degree aim correction cannot turn the legs more than seven degrees in one frame');
   assert.ok(initial.angleTo(f.obj.quaternion)<.16,'Mouse jitter cannot repeatedly choose another advance/retreat stride');
   assert.ok(f._groundMotion.weight>.9,'The running source gait must not collapse while aim hovers near a heading boundary');
   const hand=f.parts.armR.children[2],point=hand.getWorldPosition(new THREE.Vector3());
   const barrel=new THREE.Vector3(0,-1,0).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()));
   assert.ok(barrel.dot(f.aimWorld.clone().sub(point).normalize())>.97,'The moving casting hand must retain its target line');
  }
  assert.deepEqual(f.pos.toArray(),position.toArray());assert.deepEqual(f.vel.toArray(),velocity.toArray());
 }finally{f.testCombat?.dispose();f.dispose();}
});

test('deliberate retreat and return still select reverse and forward strides',()=>{
 const f=movingCaster(100);
 try{
  aimAt(f,160);for(let i=0;i<120;i++)tick(f);
  assert.ok(Math.cos(f.obj.rotation.y)<-.95,'A rearward shot must still settle into retreat');
  const phase=f._groundMotion.phase;tick(f);
  assert.ok(((f._groundMotion.phase-phase+1.5)%1)-.5<0,'Retreat samples the source stride backwards');
  aimAt(f,80);for(let i=0;i<120;i++)tick(f);
  assert.ok(Math.cos(f.obj.rotation.y)>.95,'Turning the aim forward again must restore advance');
  const forwardPhase=f._groundMotion.phase;tick(f);
  assert.ok(((f._groundMotion.phase-forwardPhase+1.5)%1)-.5>0,'Advance samples the source stride forwards');
 }finally{f.dispose();}
});

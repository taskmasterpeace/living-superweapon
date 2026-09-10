import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';

function fixture(ability){
 const scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(scene,world),def=structuredClone(ROSTER.find(d=>d.id==='sol'));
 def.abilities={lmb:ability};const f=new Fighter(def);f._openSky=true;f.flying=true;f.gait='airborne';f.pos.set(0,80,0);f.obj.position.copy(f.pos);scene.add(f.obj);
 // Only the canvas-produced sprite texture needs a device boundary in Node.
 combat.game.vfx._itex=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);
 combat.reset(f,true,ability.type==='beam'?'beam':'attack');
 return {f,combat,close(){combat.dispose();f.dispose();}};
}
test('a chest-braced traveling beam really emits from the chest throughout sustained motion',()=>{
 const {f,combat,close}=fixture({type:'beam',name:'Chest hose',cost:1,dps:12,kiPerSec:1,chest:true,castStyle:'chest-brace',color:'#ffd24a'});
 try{
  for(let i=1;i<=150;i++){
   combat.step(i/60,1/60);if(i<60)continue;
   const beam=f.slots.lmb.active,chest=f.muzzle(new THREE.Vector3(),1.2,5.4);
   assert.ok(beam?.sustaining);assert.ok(beam.muzzle.distanceTo(chest)<.001,'Pose and physical hose must use the same chest socket');
   assert.ok(beam.muzzle.distanceTo(f.parts.armR.children[2].getWorldPosition(new THREE.Vector3()))>1);
  }
 }finally{close();}
});
test('an actual charging chest attack holds its bracing pose before release',()=>{
 const {f,combat,close}=fixture({type:'charge',name:'Reactor test',chest:true,castStyle:'chest-brace',kiPerSec:1,maxCharge:3,color:'#ffd24a'});
 try{
  for(let i=1;i<=72;i++)combat.step(i/60,1/60);
  assert.equal(f.slots.lmb.charging,true);assert.equal(f._combatAim.source,'chest');
  assert.ok(f._combatAim.weight>.95,'Charging source must own its presentation before a paid release');
  // The charge field's rear surface meets the chest aperture. Its center must
  // move outward as it grows, rather than burying half the sphere in the torso.
  const orb=f.slots.lmb.orb,chest=f.muzzle(new THREE.Vector3(),1.2,5.4);
  const expected=chest.addScaledVector(f.aimWorld.clone().sub(chest).normalize(),orb.scale.x);
  assert.ok(orb.position.distanceTo(expected)<.1);
 }finally{close();}
});

test('an infinite-energy Reactor Burst still owns the charging chest pose',()=>{
 const ability={...ROSTER.find(d=>d.id==='titan').abilities.q,castStyle:'chest-brace'};
 const {f,combat,close}=fixture(ability);f.energyInfinite=true;
 try{
  for(let i=1;i<=72;i++)combat.step(i/60,1/60);
  assert.equal(f.slots.lmb.charging,true);assert.equal(f._combatAim.source,'chest');
  assert.equal(f._combatAim.style,'chest-brace');assert.ok(f._combatAim.weight>.95);
 }finally{close();}
});

test('moving elevated optic casts keep the rendered eyes aligned with the actual hose',()=>{
 for(const side of [-1,1])for(const degrees of [60,75]){
  const {f,combat,close}=fixture({...ROSTER.find(d=>d.id==='sol').abilities.lmb,cost:1});
  try{
   f.flying=false;f.gait='grounded';f.pos.set(0,0,0);f.obj.position.copy(f.pos);f.facing=0;f.aim.set(0,0,1);
   const elevation=degrees*Math.PI/180;f.hasAimWorld=true;f.aimWorld.set(0,7+100*Math.sin(elevation),100*Math.cos(elevation));
   f.aim3.copy(f.aimWorld).sub(new THREE.Vector3(0,7,0)).normalize();f.energyInfinite=true;
   const beam=combat.game.spawnBeamFor(f,f.slots.lmb.def,1);f.slots.lmb.active=beam;
   for(let i=0;i<240;i++){
    f.vel.set(side*14,0,0);f.animT+=1/60;f._animate(1/60);beam.update(1/60,combat.game);
    if(i<120)continue;
    const eyes=new THREE.Vector3(0,0,1).applyQuaternion(f.parts.head.getWorldQuaternion(new THREE.Quaternion()));
    assert.ok(eyes.dot(beam.dir)>.98,`Moving ${degrees}° shot cannot disconnect its eyes from its hose: ${eyes.angleTo(beam.dir)*180/Math.PI}°`);
   }
  }finally{close();}
 }
});

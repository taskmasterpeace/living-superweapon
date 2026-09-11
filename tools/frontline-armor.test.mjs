import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {Ragdoll} from '../src/engine/ragdoll.js';

test('authored field armor follows native driven limbs without displacing hands or changing the standard suit',()=>{
 for(const surface of ['field','standard']){
  const f=new Fighter({...structuredClone(ROSTER.find(d=>d.id==='vega')),model:{body:'superhero-male',costume:'plated',surface}});
  try{
   const harness=f.parts.torso.getObjectByName('field-torso_harness');
   if(surface==='field'){
    assert.ok(harness&&harness.parent===f.parts.torso,'field torso must carry its authored harness');assert.equal(harness.userData.heroGear,true);
    let triangles=0;
    for(const root of [harness,...[f.parts.legL,f.parts.legR].map(l=>l.userData.kneeCap)]){
     root.traverse(o=>{if(o.isMesh){assert.ok(o.material.isMaterial);assert.ok(o.layers.isEnabled(0));triangles+=o.geometry.index.count/3;}});
    }
    assert.ok(triangles>4000&&triangles<6000);
    for(const leg of [f.parts.legL,f.parts.legR]){assert.equal(leg.userData.kneeCap.geometry.name,'field-knee_pad');assert.equal(leg.userData.kneeCap.parent,leg.userData.knee);assert.equal(leg.userData.kneeCap.scale.z,1);}
   }else{assert.equal(harness,undefined);assert.notEqual(f.parts.legL.userData.kneeCap.geometry.name,'field-knee_pad');}
   for(const arm of [f.parts.armL,f.parts.armR]){
    const [upper,fore,fist]=arm.children;assert.ok(fist.morphTargetInfluences);
    const shoulder=upper.getObjectByName('costume-pauldron'),guard=fore.getObjectByName('field-forearm_guard');
    if(surface==='field'){
     assert.equal(shoulder.geometry.name,'field-pauldron');assert.equal(shoulder.parent,upper);assert.equal(guard?.parent,fore);
     for(const root of [shoulder,guard]){let triangles=0;root.traverse(o=>{if(o.isMesh){assert.ok(o.material.isMaterial);assert.ok(o.layers.isEnabled(0));triangles+=o.geometry.index.count/3;}});assert.ok(triangles>500&&triangles<2000);}
    }else{assert.notEqual(shoulder.geometry.name,'field-pauldron');assert.equal(guard,undefined);}
   }
   f.pos.set(0,20,0);f.vel.set(30,10,8);f.obj.updateMatrixWorld(true);f.ragdoll=new Ragdoll(f);
   const game={world:{cover:[],heightAt:()=>0,ARENA:240},onRagdollImpact(){}};
   for(let i=0;i<180;i++){f.ragdoll.step(1/60,game);f.ragdoll.apply(f);f._sync();}
   f.obj.traverse(o=>{if(o.name.startsWith('field-'))assert.ok(o.getWorldPosition(new THREE.Vector3()).toArray().every(Number.isFinite));});
   f.ragdoll.restore();f.ragdoll=null;f._animate(1/60);f._sync();
   assert.ok(f.parts.legL.userData.boot.getWorldPosition(new THREE.Vector3()).y<4);
  }finally{f.ragdoll?.restore();f.dispose();}
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {Ragdoll} from '../src/engine/ragdoll.js';

function fixture(id,motion){
 const f=new Fighter(ROSTER.find(d=>d.id===id));f.animT=0;f._openSky=true;
 f.flying=motion==='fly';f.gait=f.flying?'airborne':'grounded';f.pos.set(20,f.flying?50:0,-15);
 f.vel.set(14,0,f.flying?45:0);f.facing=.9;f.aimWorld.set(65,25,90);f.hasAimWorld=true;
 for(let i=0;i<90;i++){f.animT+=1/60;f._animate(1/60);}
 f.obj.updateMatrixWorld(true);return f;
}
function snapshot(p){return Object.fromEntries(['torso','pelvis','head'].map(k=>[k,{position:p[k].getWorldPosition(new THREE.Vector3()),rotation:p[k].getWorldQuaternion(new THREE.Quaternion())}]));}

for(const id of ['sol','titan','kano','sarge'])for(const motion of ['ground','fly'])test(`${id}/${motion}: entering ragdoll preserves the captured core pose before physics advances`,()=>{
 const f=fixture(id,motion),before=snapshot(f.parts);
 try{
  const rag=new Ragdoll(f,new THREE.Vector3(30,20,12));rag.apply(f);f.obj.updateMatrixWorld(true);
  const after=snapshot(f.parts);
  for(const k of Object.keys(before)){
   assert.ok(after[k].position.distanceTo(before[k].position)<1e-5,`${k} jumps ${after[k].position.distanceTo(before[k].position).toFixed(3)} units when only the renderer changes ownership`);
   assert.ok(after[k].rotation.angleTo(before[k].rotation)<1e-5,`${k} loses its captured facing before physics moves`);
  }
 }finally{f.dispose();}
});

test('a rigidly moved physics skeleton carries the whole captured core orientation and offsets',()=>{
 const f=fixture('titan','fly'),before=snapshot(f.parts),q=new THREE.Quaternion().setFromEuler(new THREE.Euler(.6,1.2,-.5)),translation=new THREE.Vector3(15,12,-8);
 try{
  const rag=new Ragdoll(f,new THREE.Vector3());
  for(const point of Object.values(rag.P)){point.pos.applyQuaternion(q).add(translation);point.prev.applyQuaternion(q).add(translation);}
  rag.apply(f);f.obj.updateMatrixWorld(true);const after=snapshot(f.parts);
  for(const k of Object.keys(before)){
   assert.ok(after[k].position.distanceTo(before[k].position.clone().applyQuaternion(q).add(translation))<1e-5,`${k} did not follow its physics anchor`);
   assert.ok(after[k].rotation.angleTo(q.clone().multiply(before[k].rotation))<1e-5,`${k} lost coherent body roll / heading`);
  }
 }finally{f.dispose();}
});

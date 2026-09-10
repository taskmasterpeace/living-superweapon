import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
const mod=await import('../src/engine/frontline-dust.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
test('impact dust expands and rises from contact, retires, and keeps a fixed particle budget',()=>{
 assert.equal(typeof mod.FrontlineDust,'function');const scene=new THREE.Scene(),dust=new mod.FrontlineDust(scene);
 try{
  assert.equal(dust.mesh.visible,false);dust.emit(new THREE.Vector3(10,4,20));assert.equal(dust.active,16);
  const geometry=dust.mesh.geometry;dust.update(.5);assert.ok(dust.mesh.visible);
  const centers=geometry.attributes.iCenter,sizes=geometry.attributes.iSize;assert.ok(centers.getY(0)>4);assert.ok(sizes.getX(0)>8);
  for(let i=0;i<20;i++)dust.emit(new THREE.Vector3(i,4,20));assert.ok(dust.active<=64);assert.equal(dust.mesh.geometry,geometry);
  for(let i=0;i<121;i++)dust.update(.1);assert.equal(dust.active,0);assert.equal(dust.mesh.visible,false);
 }finally{dust.dispose();}
 assert.equal(scene.children.length,0);
});
test('dust simulation rejects invalid deltas and disposal is idempotent',()=>{
 assert.equal(typeof mod.FrontlineDust,'function');const dust=new mod.FrontlineDust(new THREE.Scene());dust.emit(new THREE.Vector3());
 const snapshot=dust.active;dust.update(NaN);dust.update(-1);assert.equal(dust.active,snapshot);
 let geometry=0,material=0;dust.mesh.geometry.addEventListener('dispose',()=>geometry++);dust.mesh.material.addEventListener('dispose',()=>material++);
 dust.dispose();dust.dispose();assert.deepEqual([geometry,material],[1,1]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
const mod=await import('../src/engine/frontline-contrails.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});

test('contrails stay behind the moving jet and reuse bounded world-space geometry',()=>{
 assert.equal(typeof mod.FrontlineContrails,'function');
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();camera.position.set(0,500,-100);
 const sample=(time,out)=>Object.assign(out,{x:0,y:440,z:400*time,yaw:0});
 const wake=new mod.FrontlineContrails(scene,sample),before=wake.meshes.map(m=>m.geometry);
 try{
  wake.update(5,camera);assert.equal(wake.meshes.length,2);
  for(const mesh of wake.meshes){const p=mesh.geometry.attributes.position;assert.ok(p.count<300);for(let i=0;i<p.count;i++){assert.ok(p.getZ(i)<=1991);assert.ok(p.getZ(i)>500);assert.ok(Number.isFinite(p.getY(i)));}}
  for(let i=0;i<100;i++)wake.update(5+i/60,camera);
  assert.deepEqual(wake.meshes.map(m=>m.geometry),before);assert.equal(scene.children.length,1);
  const snapshot=Array.from(before[0].attributes.position.array);wake.update(NaN,camera);assert.deepEqual(Array.from(before[0].attributes.position.array),snapshot);
 }finally{wake.dispose();}
 assert.equal(scene.children.length,0);
});

test('contrail resources retire once on stage exit',()=>{
 assert.equal(typeof mod.FrontlineContrails,'function');
 const wake=new mod.FrontlineContrails(new THREE.Scene(),()=>{});let geometries=0,materials=0;
 for(const m of wake.meshes)m.geometry.addEventListener('dispose',()=>geometries++);
 const material=wake.meshes[0].material;material.addEventListener('dispose',()=>materials++);
 wake.dispose();wake.dispose();assert.equal(geometries,2);assert.equal(materials,1);
});

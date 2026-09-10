import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FRONTLINE_FORMATIONS} from '../src/engine/frontline-layout.js';
const lighting=await import('../src/engine/frontline-lighting.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});

test('valley shadows cover distant combat formations and restore the original light rig',()=>{
 assert.equal(typeof lighting.installFrontlineLighting,'function');
 const sun=new THREE.DirectionalLight(),world={sun,sunOff:new THREE.Vector3(120,200,80)};
 sun.shadow.mapSize.set(1536,1536);Object.assign(sun.shadow.camera,{left:-110,right:110,top:110,bottom:-110,near:40,far:520});
 let retired=0,passes=0;sun.shadow.map={dispose:()=>retired++};sun.shadow.mapPass={dispose:()=>passes++};
 const stage={g:{world}},before={offset:world.sunOff.clone(),size:sun.shadow.mapSize.clone()};
 lighting.installFrontlineLighting(stage);
 assert.ok(sun.shadow.camera.right>=900);assert.ok(sun.shadow.camera.far>=3000);assert.equal(sun.shadow.mapSize.x,4096);
 assert.ok(world.sunOff.length()>1000);assert.ok(world.sunOff.y/world.sunOff.x<.5);assert.equal(retired,1);assert.equal(sun.shadow.map,null);
 assert.equal(passes,1);assert.equal(sun.shadow.mapPass,null);
 lighting.installFrontlineLighting(stage);assert.equal(retired,1,'idempotent installation');
 sun.shadow.map={dispose:()=>retired++};lighting.restoreFrontlineLighting(stage);
 assert.equal(retired,2);assert.deepEqual(world.sunOff,before.offset);assert.deepEqual(sun.shadow.mapSize,before.size);
 assert.equal(sun.shadow.camera.right,110);assert.equal(sun.shadow.camera.near,40);assert.equal(sun.shadow.camera.far,520);
 lighting.restoreFrontlineLighting(stage);assert.equal(retired,2);
});

test('near valley formation corners fit the shadow camera at ground and flight anchors',()=>{
 const sun=new THREE.DirectionalLight(),world={sun,sunOff:new THREE.Vector3(120,200,80)},stage={g:{world}};
 lighting.installFrontlineLighting(stage);
 try{for(const anchor of [[0,0,0],[-40,0,-40],[-40,260,-40]]){
  sun.target.position.fromArray(anchor);sun.position.copy(sun.target.position).add(world.sunOff);sun.updateMatrixWorld();sun.target.updateMatrixWorld();sun.shadow.updateMatrices(sun);
  const matrix=new THREE.Matrix4().multiplyMatrices(sun.shadow.camera.projectionMatrix,sun.shadow.camera.matrixWorldInverse);
  for(const f of FRONTLINE_FORMATIONS){
   // Layout records are authored cover envelopes, including yawed geometry.
   const x=f.x,z=f.z,h=f.height,rx=f.width/2,rz=f.depth/2,c=Math.cos(f.yaw),s=Math.sin(f.yaw);
   if(![x,z,h,rx,rz].every(Number.isFinite))throw Error('Formation schema changed');
   for(const sx of [-1,1])for(const sz of [-1,1])for(const y of [0,h]){
    const q=new THREE.Vector3(x+c*sx*rx+s*sz*rz,y,z-s*sx*rx+c*sz*rz).applyMatrix4(matrix);
    assert.ok(Math.max(Math.abs(q.x),Math.abs(q.y),Math.abs(q.z))<=1,'Formation left the light frustum');
   }
  }
 }}finally{lighting.restoreFrontlineLighting(stage);}
});

test('a partial renderer fixture can enter and leave without creating lights',()=>{
 const stage={g:{world:{}}};assert.doesNotThrow(()=>lighting.installFrontlineLighting(stage));assert.doesNotThrow(()=>lighting.restoreFrontlineLighting(stage));
});

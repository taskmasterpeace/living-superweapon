import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';

test('four scan-derived talus fragments are closed and have integral level landing crowns',async()=>{
 const bytes=await readFile('public/models/frontline/fractured-talus-kit.glb');
 assert.ok(bytes.length<1600000);
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const meshes=[];gltf.scene.traverse(o=>{if(o.isMesh)meshes.push(o);});assert.equal(meshes.length,4);gltf.scene.updateMatrixWorld(true);
 for(const mesh of meshes){
  assert.match(mesh.name,/^talus-[0-3]$/);const geometry=mesh.geometry,p=geometry.attributes.position,index=geometry.index;
  assert.ok(index.count/3<=6500);assert.ok(index.count/3>1000);
  const keys=Array.from({length:p.count},(_,i)=>[p.getX(i),p.getY(i),p.getZ(i)].map(n=>n.toFixed(5)).join(',')),edges=new Map();
  for(let i=0;i<index.count;i+=3)for(const [a,b]of [[0,1],[1,2],[2,0]]){
   const ka=keys[index.getX(i+a)],kb=keys[index.getX(i+b)],key=ka<kb?ka+'|'+kb:kb+'|'+ka;
   edges.set(key,(edges.get(key)||0)+1);
  }
  const bad=[...edges.values()].filter(n=>n!==2);
  assert.equal(bad.length,0,mesh.name+' non-manifold edge multiplicities: '+bad.join(','));
  const box=new THREE.Box3().setFromObject(mesh),center=box.getCenter(new THREE.Vector3());
  for(const [dx,dz]of [[0,0],[.10,0],[-.10,0],[0,.10],[0,-.10]]){
   const hit=new THREE.Raycaster(new THREE.Vector3(center.x+dx,box.max.y+2,center.z+dz),new THREE.Vector3(0,-1,0)).intersectObject(mesh)[0];
   assert.ok(hit,'Missing integral crown');assert.ok(Math.abs(hit.point.y-box.max.y)<.00001,'Landing crown floats above the fragment');
  }
  geometry.dispose();mesh.material.dispose();
 }
});

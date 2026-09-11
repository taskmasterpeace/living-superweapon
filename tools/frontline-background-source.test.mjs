import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
const path='assets-src/frontline-background-study/layout.json';
const camera=new THREE.PerspectiveCamera(68,1671/941,.1,18000);camera.position.set(-83.2903,159.1279,-20.99856);
camera.lookAt(camera.position.clone().add(new THREE.Vector3(0,Math.sin(-.156),Math.cos(-.156))));camera.updateMatrixWorld(true);
const project=(x,y,z)=>{const p=new THREE.Vector3(x,y,z).project(camera);return {x:(p.x+1)*835.5,y:(1-p.y)*470.5};};
test('background-only study lowers the skyline and overlaps broad bands without invading the playable land',t=>{
 assert.ok(existsSync(path),'background-only source composition is missing');
 const source=JSON.parse(readFileSync(path));assert.equal(source.far.length,18);assert.equal(source.formations,undefined,'Near composition must not be rewritten');
 const report=[];
 for(const f of source.far){
  assert.ok(f.width/f.height>=3.5,'Distant geology is a column');assert.ok(Math.hypot(f.x,f.z)-Math.hypot(f.width,f.depth)*.5>900,'Backdrop intrudes into playable terrain');
  assert.ok(Math.hypot(f.x,f.z)+Math.hypot(f.width,f.depth)*.5<6800,'Backdrop exceeds external floor');
  if(f.z>0){const p=project(f.x,f.height,f.z);assert.ok(p.y>=315&&p.y<=400,`Oversized or missing distant silhouette at ${p.y}`);report.push({...p,band:f.band});}
 }
 for(const band of [0,1,2]){
  const spans=source.far.filter(f=>f.z>0&&f.band===band).map(f=>{const a=project(f.x-f.width*.5,0,f.z),b=project(f.x+f.width*.5,0,f.z);return [Math.min(a.x,b.x),Math.max(a.x,b.x)];}).sort((a,b)=>a[0]-b[0]);
  for(let i=1;i<spans.length;i++)assert.ok(spans[i][0]<spans[i-1][1]-20,'Disconnected row of background blocks');
 }
 t.diagnostic(JSON.stringify(report));
});
test('background-specific source exports three distinct closed silhouette-budget meshes',async()=>{
 const file='assets-src/frontline-background-study/background-ridge-kit.glb';assert.ok(existsSync(file),'background source asset missing');
 const bytes=readFileSync(file),asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');asset.scene.updateMatrixWorld(true);
 const meshes=[];asset.scene.traverse(o=>{if(o.isMesh)meshes.push(o);});assert.equal(meshes.length,3);assert.ok(bytes.length<700000);
 for(const mesh of meshes){
  assert.match(mesh.name,/^background-ridge-[0-2]$/);const a=mesh.geometry.attributes.position,index=mesh.geometry.index.array;
  assert.ok(index.length/3<=2300);const edges=new Map(),keys=Array.from({length:a.count},(_,i)=>[a.getX(i),a.getY(i),a.getZ(i)].map(v=>v.toFixed(5)).join(','));
  for(let i=0;i<index.length;i+=3)for(const [j,k]of [[0,1],[1,2],[2,0]]){const a=keys[index[i+j]],b=keys[index[i+k]],key=a<b?a+'|'+b:b+'|'+a;edges.set(key,(edges.get(key)||0)+1);}
  assert.ok([...edges.values()].every(v=>v===2),'Source backdrop is not closed');mesh.geometry.dispose();mesh.material.dispose();
 }
});

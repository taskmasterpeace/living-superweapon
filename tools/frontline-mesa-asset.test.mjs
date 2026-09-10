import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
const asset=process.env.FRONTLINE_MESA_TEST_ASSET||'public/models/frontline/eroded-mesa-kit.glb';

test('authored mesa kit ships four distinct closed volumes and four cheaper distant LODs',async()=>{
 const file=await readFile(asset);
 assert.equal(file.readUInt32LE(0),0x46546c67);assert.equal(file.readUInt32LE(4),2);
 const length=file.readUInt32LE(12),gltf=JSON.parse(file.subarray(20,20+length).toString());
 const bin=file.subarray(28+length),signatures=new Set();
 assert.equal(gltf.meshes.length,8);
 const array=(index)=>{const a=gltf.accessors[index],v=gltf.bufferViews[a.bufferView];const p=v.byteOffset+(a.byteOffset||0),n=a.count*({SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type]);return a.componentType===5126?new Float32Array(bin.buffer,bin.byteOffset+p,n):a.componentType===5123?new Uint16Array(bin.buffer,bin.byteOffset+p,n):new Uint32Array(bin.buffer,bin.byteOffset+p,n);};
 for(const mesh of gltf.meshes){
  assert.match(mesh.name,/^mesa-[0-3]-lod[01]$/);assert.equal(mesh.primitives.length,1,'One continuous surface and material, no crown/panel assembly');
  const p=mesh.primitives[0],pos=array(p.attributes.POSITION),idx=array(p.indices),count=idx.length/3;
  assert.ok(p.attributes.NORMAL!==undefined&&p.attributes.TEXCOORD_0!==undefined);
  assert.ok(count>400&&count<13000);if(mesh.name.endsWith('lod1'))assert.ok(count<2400);
  else signatures.add(createHash('sha256').update(Buffer.from(pos.buffer,pos.byteOffset,pos.byteLength)).digest('hex'));
  // glTF splits vertices at UV/normal seams; weld positions for topology check.
  const keys=Array.from({length:pos.length/3},(_,i)=>[pos[i*3],pos[i*3+1],pos[i*3+2]].map(v=>v.toFixed(5)).join(','));
  const edges=new Map(),orientation=new Map();for(let i=0;i<idx.length;i+=3)for(const [a,b]of [[0,1],[1,2],[2,0]]){const ka=keys[idx[i+a]],kb=keys[idx[i+b]],key=ka<kb?`${ka}|${kb}`:`${kb}|${ka}`;edges.set(key,(edges.get(key)||0)+1);orientation.set(key,(orientation.get(key)||0)+(ka<kb?1:-1));}
  assert.ok([...edges.values()].every(n=>n===2),`${mesh.name}: watertight two-face edges`);
  assert.ok([...orientation.values()].every(n=>n===0),`${mesh.name}: adjacent faces agree on outward winding`);
 }
 assert.equal(signatures.size,4);assert.ok(file.length<3000000,'Geometry kit stays under 3 MB');
});

test('mesa shoulders are broad stepped rock masses and the central crown is genuinely level',async()=>{
 const bytes=await readFile(asset),gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 gltf.scene.updateMatrixWorld(true);const meshes=[];gltf.scene.traverse(o=>{if(o.isMesh&&o.name.endsWith('lod0'))meshes.push(o);});
 const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
 for(const mesh of meshes){
  const box=new THREE.Box3().setFromObject(mesh),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  for(const [x,z]of [[0,0],[.04,0],[-.04,0],[0,.04],[0,-.04]]){
   ray.set(new THREE.Vector3(center.x+x*size.x,box.max.y+1,center.z+z*size.z),down);
   const hit=ray.intersectObject(mesh)[0];assert.ok(hit,`${mesh.name}: crown is closed`);
   assert.ok(Math.abs(hit.point.y-box.max.y)<.00001,`${mesh.name}: central native crown must not float above uneven stone`);
  }
  let fracturedRim=0;
  for(let k=0;k<12;k++){
   const a=k*Math.PI/6;
   ray.set(new THREE.Vector3(center.x+Math.cos(a)*size.x*.17,box.max.y+1,center.z+Math.sin(a)*size.z*.17),down);
   const hit=ray.intersectObject(mesh)[0];if(hit&&box.max.y-hit.point.y>size.y*.01)fracturedRim++;
  }
  assert.ok(fracturedRim>=4,`${mesh.name}: outer crown must fracture below the central landing plane, not form a laser-flat stump (${fracturedRim})`);
  // Broad shoulder loss is visible silhouette geometry, not thin normal-map
  // stripes. Cast opposing horizontal rays at 35% and 88% of total height.
  const spans=[];
  for(const fraction of [.35,.88]){
   let sum=0;
   for(let k=0;k<12;k++){
    const a=k*Math.PI/6,dir=new THREE.Vector3(Math.cos(a),0,Math.sin(a)),origin=center.clone().addScaledVector(dir,Math.max(size.x,size.z)*2);
    origin.y=box.min.y+size.y*fraction;ray.set(origin,dir.clone().negate());
    const hit=ray.intersectObject(mesh)[0];assert.ok(hit,`${mesh.name}: connected body at each bed`);
    sum+=Math.hypot(hit.point.x-center.x,hit.point.z-center.z);
   }
   spans.push(sum/12);
  }
  assert.ok(spans[0]/spans[1]>1.6,`${mesh.name}: broad broken shoulder must project beyond the compact upper crown (${spans[0]/spans[1]})`);
 }
});

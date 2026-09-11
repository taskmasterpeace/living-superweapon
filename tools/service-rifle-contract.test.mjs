import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Vector3,Box3,Triangle} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const dir='assets-src/frontline-service-rifle/',bytes=readFileSync(dir+'service-rifle-contract-probe.glb');
const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
const report=JSON.parse(readFileSync(dir+'fit-report.json'));
const load=()=>new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
test('verified downloaded CC0 originals retain recorded hashes',()=>{
 for(const [name,sha]of [['AssaultRifle_1','f2ba5fc57776661d237734959c7972f3b5962ed698de6a2af6e6c172048d4e69'],['AssaultRifle2_1','8d6c8750932573f28a17b49cfcb990a230e29725d593593b261a80199b31dd67']])assert.equal(createHash('sha256').update(readFileSync(`${dir}original/${name}.blend`)).digest('hex'),sha);
});
test('probe preserves modest original triangle budget and needs no textures or external decoder',()=>{
 assert.equal(json.meshes.reduce((s,m)=>s+m.primitives.reduce((n,p)=>n+json.accessors[p.indices].count/3,0),0),1930);
 assert.equal(json.meshes.reduce((s,m)=>s+m.primitives.length,0),3);
 assert.equal(json.materials.length,3);assert.equal(json.images?.length??0,0);assert.equal(json.extensionsRequired?.length??0,0);assert.equal(report.degenerateTriangles,0);
});
test('native GLTFLoader recovers unmodified socket coordinates and endpoint envelope',async()=>{
 const {scene}=await load();scene.updateMatrixWorld(true);
 for(const [name,position]of Object.entries(report.sockets))assert.ok(scene.getObjectByName(name).getWorldPosition(new Vector3()).distanceTo(new Vector3(...position))<1e-6,name);
 const bounds=new Box3().setFromObject(scene);assert.ok(bounds.min.distanceTo(new Vector3(...report.bounds.min))<1e-6);assert.ok(bounds.max.distanceTo(new Vector3(...report.bounds.max))<1e-6);
});
test('probe explicitly rejects a misleading contact pass despite exact endpoint markers',()=>{
 assert.match(report.status,/not accepted/);assert.ok(report.contacts['weapon-stock-contact'].distance<1e-6);
 assert.ok(report.contacts.supportToForeEndBarrelOnly.distance>.20);assert.ok(report.contacts.primaryToPistolGripOnly.distance>.05);
});
test('proposed contacts lie on actual exported mesh triangles, not floating targets',async()=>{
 const {scene}=await load();scene.updateMatrixWorld(true);
 for(const proposal of Object.values(report.proposedPhysicalContacts)){
  let distance=Infinity;const p=new Vector3(...proposal.position),triangle=new Triangle(),closest=new Vector3();
  scene.traverse(o=>{if(!o.isMesh)return;const g=o.geometry,a=g.attributes.position;
   for(let i=0;i<g.index.count;i+=3){triangle.a.fromBufferAttribute(a,g.index.getX(i)).applyMatrix4(o.matrixWorld);triangle.b.fromBufferAttribute(a,g.index.getX(i+1)).applyMatrix4(o.matrixWorld);triangle.c.fromBufferAttribute(a,g.index.getX(i+2)).applyMatrix4(o.matrixWorld);triangle.closestPointToPoint(p,closest);distance=Math.min(distance,p.distanceTo(closest));}
  });assert.ok(distance<1e-6,`${distance}`);assert.equal(proposal.nativeClearanceValidated,false);
 }
});

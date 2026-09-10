import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {Box3,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const original='public/models/frontline/armored-scout.glb',candidate='assets-src/frontline-scout-articulation/armored-scout-articulated.glb';
function glb(path){const bytes=readFileSync(path),size=bytes.readUInt32LE(12);return {json:JSON.parse(bytes.subarray(20,20+size)),binary:bytes.subarray(28+size),bytes};}
const source=glb(original),asset=glb(existsSync(candidate)?candidate:original);
// Texture pixels are independently compared byte-for-byte. CPU loader does not
// upload a bitmap or stand in for a native visual/render verification.
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:512,height:512,close(){}});globalThis.ProgressEvent??=class{constructor(type,data){this.type=type;Object.assign(this,data);}};
async function scene(data){return (await new GLTFLoader().parseAsync(data.bytes.buffer.slice(data.bytes.byteOffset,data.bytes.byteOffset+data.bytes.byteLength),'')).scene;}
const near=(a,b,eps=1e-6)=>assert.ok(a.distanceTo(b)<eps,`${a.toArray()} != ${b.toArray()}`);
test('explicit yaw, pitch and measured muzzle nodes are available without replacing original geometry nodes',async()=>{
 const root=await scene(asset),yaw=root.getObjectByName('turret_yaw'),pitch=root.getObjectByName('gun_pitch'),muzzle=root.getObjectByName('muzzle');
 assert.ok(yaw,'explicit yaw pivot');assert.ok(pitch,'explicit pitch pivot');assert.ok(muzzle,'authored muzzle marker');
 assert.equal(root.getObjectByName('turret').parent,yaw);assert.equal(root.getObjectByName('barrel').parent,pitch);assert.equal(muzzle.parent,pitch);
 root.updateMatrixWorld(true);near(yaw.getWorldPosition(new Vector3()),new Vector3(0,2.24,.02));near(pitch.getWorldPosition(new Vector3()),new Vector3(0,2.79,.15));near(muzzle.getWorldPosition(new Vector3()),new Vector3(0,2.8,1.49));
});
test('hierarchy-only candidate preserves every shipped binary vertex, normal, UV, index, material and texture',()=>{
 assert.deepEqual(asset.binary,source.binary);for(const key of ['accessors','bufferViews','buffers','meshes','materials','textures','images','samplers'])assert.deepEqual(asset.json[key],source.json[key],key);
 assert.equal(asset.json.meshes.reduce((n,m)=>n+m.primitives.length,0),25);assert.equal(asset.json.materials.length,7);
 assert.equal(asset.json.meshes.reduce((n,m)=>n+m.primitives.reduce((s,p)=>s+asset.json.accessors[p.indices].count/3,0),0),30288);
 assert.ok(!(asset.json.extensionsRequired??[]).some(x=>/draco|meshopt|basis/i.test(x)));
});
test('existing wheels retain their measured axle centers and 0.65 metre tire radius',async()=>{
 const root=await scene(asset);root.updateMatrixWorld(true);
 for(const [name,x,z]of [['wheels_FL',-.9879,1.58],['wheels_FR',.9879,1.58],['wheels_RL',-.9879,-1.70],['wheels_RR',.9879,-1.70]]){
  const wheel=root.getObjectByName(name);near(wheel.getWorldPosition(new Vector3()),new Vector3(x,.65,z));let radius=0;
  wheel.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)radius=Math.max(radius,Math.hypot(p.getY(i),p.getZ(i)));});assert.ok(Math.abs(radius-.65)<1e-5,`${name} radius ${radius}`);
 }
});
test('rest transforms and exact wheel footprint remain the shipped vehicle',async()=>{
 const a=await scene(source),b=await scene(asset);a.updateMatrixWorld(true);b.updateMatrixWorld(true);
 for(const name of ['hull','turret','barrel','wheels_FL','wheels_FR','wheels_RL','wheels_RR']){
  const x=a.getObjectByName(name),y=b.getObjectByName(name);assert.deepEqual(y.matrixWorld.elements,x.matrixWorld.elements,name);
  const oldBounds=new Box3().setFromObject(x),newBounds=new Box3().setFromObject(y);near(oldBounds.min,newBounds.min);near(oldBounds.max,newBounds.max);
 }
 for(const name of ['wheels_FL','wheels_FR','wheels_RL','wheels_RR']){const w=b.getObjectByName(name),center=w.getWorldPosition(new Vector3());w.rotation.x=1.25;b.updateMatrixWorld(true);near(w.getWorldPosition(new Vector3()),center);}
});
test('yaw and elevation carry the muzzle along the barrel bore while hull and wheels stay fixed',async()=>{
 const root=await scene(asset),yaw=root.getObjectByName('turret_yaw'),pitch=root.getObjectByName('gun_pitch'),muzzle=root.getObjectByName('muzzle');assert.ok(yaw&&pitch&&muzzle);
 root.updateMatrixWorld(true);const fixed=['hull','wheels_FL','wheels_FR','wheels_RL','wheels_RR'].map(n=>[n,root.getObjectByName(n).matrixWorld.clone()]);
 yaw.rotation.y=Math.PI/2;pitch.rotation.x=-Math.PI/6;root.updateMatrixWorld(true);
 near(muzzle.getWorldDirection(new Vector3()),new Vector3(Math.sqrt(3)/2,.5,0));
 near(muzzle.getWorldPosition(new Vector3()),new Vector3(.13+1.34*Math.sqrt(3)/2-.005,2.79+.67+.01*Math.sqrt(3)/2,.02));
 for(const [name,matrix]of fixed)assert.deepEqual(root.getObjectByName(name).matrixWorld.elements,matrix.elements);
 yaw.rotation.y=0;pitch.rotation.x=0;root.updateMatrixWorld(true);near(muzzle.getWorldPosition(new Vector3()),new Vector3(0,2.8,1.49));
});

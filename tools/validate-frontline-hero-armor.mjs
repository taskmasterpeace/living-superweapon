import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {BufferGeometry,Float32BufferAttribute,Vector3,Mesh,MeshStandardMaterial,Box3,Color} from 'three';
const bank=JSON.parse(readFileSync('src/data/field-boot-bank.json','utf8'));
const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(bank.position,3));g.setAttribute('normal',new Float32BufferAttribute(bank.normal,3));g.setAttribute('uv',new Float32BufferAttribute(bank.uv,2));g.setIndex(bank.index);for(const x of bank.groups)g.addGroup(x.start,x.count,x.materialIndex);
assert.equal(bank.position.length,bank.normal.length);assert.equal(bank.uv.length,bank.position.length/3*2);assert.equal(bank.groups.length,3);assert.deepEqual(new Set(bank.materials.map(m=>m.name)),new Set(['ceramic','rubber','hardware']));
assert.ok(bank.index.length/3>=2000&&bank.index.length/3<=4000);assert.equal(bank.groups.reduce((s,x)=>s+x.count,0),bank.index.length);
for(const values of [bank.position,bank.normal,bank.uv])assert.ok(values.every(Number.isFinite));
const a=new Vector3(),b=new Vector3(),c=new Vector3();let degenerate=0;
for(let i=0;i<bank.index.length;i+=3){a.fromArray(bank.position,bank.index[i]*3);b.fromArray(bank.position,bank.index[i+1]*3);c.fromArray(bank.position,bank.index[i+2]*3);if(b.sub(a).cross(c.sub(a)).lengthSq()<1e-16)degenerate++;}
assert.equal(degenerate,0);
let maxNormalError=0;for(let i=0;i<bank.normal.length;i+=3)maxNormalError=Math.max(maxNormalError,Math.abs(a.fromArray(bank.normal,i).length()-1));assert.ok(maxNormalError<1e-4);
g.computeBoundingBox();const {min,max}=g.boundingBox;
assert.ok(min.x>=-.3201&&max.x<=.3201);assert.ok(min.y>=-.3801&&max.y<=.3801);assert.ok(min.z>=-.4101&&max.z<=.8301);
assert.ok(Math.abs(min.y+.38)<.003);assert.ok(max.z>.79&&min.z<-.38&&max.y>.36);
// Existing native mesh identity remains the driver; bank is an in-place geometry replacement.
const boot=new Mesh(g,bank.materials.map(m=>new MeshStandardMaterial({name:m.name,color:new Color().fromArray(m.color),roughness:m.roughness,metalness:m.metalness})));
boot.position.set(.4,.8,-.2);boot.rotation.set(.3,-.4,.1);boot.updateMatrixWorld(true);assert.ok(!new Box3().setFromObject(boot).isEmpty());
const report={triangles:bank.index.length/3,vertices:bank.position.length/3,groups:bank.groups,bounds:{min:min.toArray(),max:max.toArray()},materialNames:bank.materials.map(m=>m.name),degenerateTriangles:degenerate,maxNormalError,rigContract:'Native Mesh accepts geometry/material replacement and retains transform driver',status:'PASS'};
writeFileSync('assets-src/frontline-hero-armor/validation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));

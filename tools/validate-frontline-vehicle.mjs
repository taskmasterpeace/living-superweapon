import {readFileSync,writeFileSync} from 'node:fs';
import {Matrix4,Quaternion,Vector3,Box3} from 'three';
import assert from 'node:assert/strict';
const file='public/models/frontline/armored-scout.glb',bytes=readFileSync(file);
assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);
const jsonLength=bytes.readUInt32LE(12),g=JSON.parse(bytes.subarray(20,20+jsonLength).toString());
const binStart=20+jsonLength+8,bin=bytes.subarray(binStart);
const read=(ai)=>{
 const a=g.accessors[ai],v=g.bufferViews[a.bufferView];
 const width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],size={5121:1,5123:2,5125:4,5126:4}[a.componentType];
 const fn={5121:'readUInt8',5123:'readUInt16LE',5125:'readUInt32LE',5126:'readFloatLE'}[a.componentType];
 return Array.from({length:a.count},(_,i)=>Array.from({length:width},(_,j)=>bin[fn]((v.byteOffset??0)+(a.byteOffset??0)+i*(v.byteStride??width*size)+j*size)));
};
const world=new Map(),parents=new Map();g.nodes.forEach((n,i)=>(n.children??[]).forEach(c=>parents.set(c,i)));
function matrix(i){if(world.has(i))return world.get(i);const n=g.nodes[i],m=n.matrix?new Matrix4().fromArray(n.matrix):new Matrix4().compose(new Vector3().fromArray(n.translation??[0,0,0]),new Quaternion().fromArray(n.rotation??[0,0,0,1]),new Vector3().fromArray(n.scale??[1,1,1]));if(parents.has(i))m.premultiply(matrix(parents.get(i)));world.set(i,m);return m;}
const bounds=new Box3();let triangles=0,degenerates=0,primitives=0;const nodes={};
for(let ni=0;ni<g.nodes.length;ni++){
 const n=g.nodes[ni];if(n.mesh===undefined)continue;let tri=0;
 for(const p of g.meshes[n.mesh].primitives){
  assert.equal(p.mode??4,4);assert.ok(p.attributes.NORMAL!==undefined);assert.ok(p.attributes.TEXCOORD_0!==undefined);
  const positions=read(p.attributes.POSITION),idx=read(p.indices).flat();tri+=idx.length/3;primitives++;
  for(const v of positions){assert.ok(v.every(Number.isFinite));bounds.expandByPoint(new Vector3().fromArray(v).applyMatrix4(matrix(ni)));}
  for(let i=0;i<idx.length;i+=3){const a=new Vector3().fromArray(positions[idx[i]]),b=new Vector3().fromArray(positions[idx[i+1]]),c=new Vector3().fromArray(positions[idx[i+2]]);if(b.sub(a).cross(c.sub(a)).lengthSq()<1e-17)degenerates++;}
 }
 triangles+=tri;nodes[n.name]={triangles:tri,position:new Vector3().setFromMatrixPosition(matrix(ni)).toArray(),scale:n.scale??[1,1,1]};
}
for(const name of ['hull','wheels_FL','wheels_FR','wheels_RL','wheels_RR','turret','barrel'])assert.ok(nodes[name],`Missing ${name}`);
assert.ok(triangles>=20000&&triangles<=35000);assert.ok(g.materials.length<12);
assert.equal(degenerates,0,'Degenerate triangles');
assert.ok(!(g.extensionsRequired??[]).some(x=>/draco|meshopt|basis/i.test(x)),'No runtime decoder permitted');
const dimensions=bounds.getSize(new Vector3()).toArray();
assert.ok(dimensions[0]>2.3&&dimensions[0]<2.75,`Width ${dimensions[0]}`);
assert.ok(dimensions[2]>5.1&&dimensions[2]<5.7);assert.ok(Math.abs(bounds.min.y)<.02,'Tires grounded at zero');
for(const [n,v] of Object.entries(nodes))assert.ok(v.scale.every(x=>Math.abs(x-1)<1e-5),`Nonunit scale ${n}`);
assert.ok(nodes.wheels_FL.position[2]>0&&nodes.wheels_RL.position[2]<0,'Forward +Z');
const barrel=g.nodes.findIndex(x=>x.name==='barrel'),turret=g.nodes.findIndex(x=>x.name==='turret');assert.equal(parents.get(barrel),turret);
const textures=(g.images??[]).map(i=>{assert.equal(i.mimeType,'image/png');const bv=g.bufferViews[i.bufferView],start=bv.byteOffset??0;const width=bin.readUInt32BE(start+16),height=bin.readUInt32BE(start+20);assert.ok(width<=1024&&height<=1024);return {width,height};});
const report={file,bytes:bytes.length,triangles,primitives,materials:g.materials.length,textures,dimensions,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},degenerateTriangles:degenerates,nodes,extensions:g.extensionsUsed??[]};
writeFileSync('assets-src/frontline-vehicles/validation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));

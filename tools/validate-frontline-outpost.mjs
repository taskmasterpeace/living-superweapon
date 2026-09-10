import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Matrix4,Vector3,Quaternion,Box3} from 'three';
const path='public/models/frontline/outpost-kit.glb',bytes=readFileSync(path),length=bytes.readUInt32LE(12),g=JSON.parse(bytes.subarray(20,20+length)),bin=bytes.subarray(28+length);
assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);
const names=['hangar','command','watchtower','barricade'],parents=new Map(),matrices=new Map();g.nodes.forEach((n,i)=>(n.children??[]).forEach(c=>parents.set(c,i)));
function matrix(i){if(matrices.has(i))return matrices.get(i);const n=g.nodes[i],m=n.matrix?new Matrix4().fromArray(n.matrix):new Matrix4().compose(new Vector3().fromArray(n.translation??[0,0,0]),new Quaternion().fromArray(n.rotation??[0,0,0,1]),new Vector3().fromArray(n.scale??[1,1,1]));if(parents.has(i))m.premultiply(matrix(parents.get(i)));matrices.set(i,m);return m;}
function root(i){return parents.has(i)?root(parents.get(i)):g.nodes[i].name;}
function read(ai){const a=g.accessors[ai],b=g.bufferViews[a.bufferView],w={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],size={5121:1,5123:2,5125:4,5126:4}[a.componentType],fn={5121:'readUInt8',5123:'readUInt16LE',5125:'readUInt32LE',5126:'readFloatLE'}[a.componentType];assert.ok(fn);return Array.from({length:a.count},(_,i)=>Array.from({length:w},(_,j)=>bin[fn]((b.byteOffset??0)+(a.byteOffset??0)+i*(b.byteStride??w*size)+j*size)));}
const assets=Object.fromEntries(names.map(n=>[n,{box:new Box3(),triangles:0,draws:0}]));let degenerate=0;
for(let i=0;i<g.nodes.length;i++){const n=g.nodes[i];if(n.mesh===undefined)continue;const a=assets[root(i)];assert.ok(a);
 for(const p of g.meshes[n.mesh].primitives){assert.ok(p.attributes.NORMAL!==undefined&&p.attributes.TEXCOORD_0!==undefined);const pos=read(p.attributes.POSITION),idx=read(p.indices).flat();a.triangles+=idx.length/3;a.draws++;
  for(const p of pos){assert.ok(p.every(Number.isFinite));a.box.expandByPoint(new Vector3().fromArray(p).applyMatrix4(matrix(i)));}
  for(let t=0;t<idx.length;t+=3){const x=new Vector3().fromArray(pos[idx[t]]),y=new Vector3().fromArray(pos[idx[t+1]]),z=new Vector3().fromArray(pos[idx[t+2]]);if(y.sub(x).cross(z.sub(x)).lengthSq()<1e-17)degenerate++;}
 }
}
const collider=(x,z,hx,hz,bottom,top)=>({x,z,hx,hz,bottom,top});
const collision={hangar:[],command:[collider(0,0,22.5,20,0,33)],watchtower:[],barricade:[collider(0,0,6,2.3,0,5.8),collider(-8.2,0,2.4,1.9,0,5.4),collider(8.2,0,2.4,1.9,0,5.4)]};
// Closed hangar: approximate its curved roof with strips, not one huge cuboid.
for(let i=0;i<12;i++){const x0=-32.5+i*65/12,x1=x0+65/12,x=(x0+x1)/2;const nearest=Math.max(0,Math.min(Math.abs(x0),Math.abs(x1)));const top=2.5+32.5*Math.sqrt(Math.max(0,1-(nearest/32.5)**2));collision.hangar.push(collider(x,0,65/24,42.5,0,top));}
collision.watchtower.push(collider(0,0,9.5,9.5,0,47.55));
for(const z of [-19.6,19.6])collision.command.push(collider(0,z,22.5,.6,32.75,35.25));
for(const x of [-21.9,21.9])collision.command.push(collider(x,0,.6,19,32.75,35.25));
const report={asset:path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),triangles:0,draws:0,materials:g.materials.length,degenerateTriangles:degenerate,requiredExtensions:g.extensionsRequired??[],coordinateSystem:'glTF Y-up, doors face +Z, 5 units/metre',assets:{}};
for(const [name,a]of Object.entries(assets)){assert.ok(!a.box.isEmpty()&&Math.abs(a.box.min.y)<.001);report.triangles+=a.triangles;report.draws+=a.draws;report.assets[name]={boundsMin:a.box.min.toArray(),boundsMax:a.box.max.toArray(),triangles:a.triangles,draws:a.draws,origin:[0,0,0],colliders:collision[name],roofTop:{hangar:35,command:33,watchtower:47.55,barricade:5.8}[name]};}
assert.ok(report.triangles<60000);assert.ok(bytes.length<2.1e6);assert.equal(degenerate,0);assert.ok(report.materials<=6);assert.deepEqual(report.requiredExtensions,['EXT_texture_webp']);
for(const name of names)assert.equal(g.nodes.find(n=>n.name===name).extras.solidTop,report.assets[name].roofTop);
report.collisionNotes='Conservative local AABBs; all three buildings are visibly closed solid structures. Watchtower uses a solid concrete plinth, not open scaffold or walkable stairs. Its full-height native cover is intentional. Hangar curved-roof strips are optional finer envelopes; a single native cover box is conservative. Roof tops exclude aerials, rooftop plant and safety loops. Roof/collision fidelity remains a runtime approximation, not walkable interiors.';
writeFileSync('assets-src/frontline-outpost/bounds.json',JSON.stringify(report,null,2));console.log(JSON.stringify({bytes:report.bytes,triangles:report.triangles,draws:report.draws,materials:report.materials,degenerate,roots:Object.keys(report.assets)}));

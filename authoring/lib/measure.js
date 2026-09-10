// Measured budgets and structural validation for GLB outputs. Numbers come from the bytes we
// ship, read back through gltf-transform, never from a recipe's own claims.
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import validator from 'gltf-validator';

// Production frontline kits require EXT_texture_webp; register every known extension so a
// shipped asset can always be measured. Reading needs no image decoder, only the declaration.
export async function readGlb(bytes){
 const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
 return io.readBinary(new Uint8Array(bytes));
}
export async function measureGlb(bytes){
 const doc=await readGlb(bytes),root=doc.getRoot();
 let triangles=0,drawCalls=0;const materials=new Set();
 for(const mesh of root.listMeshes())for(const prim of mesh.listPrimitives()){
  drawCalls++;
  const index=prim.getIndices(),count=index?index.getCount():prim.getAttribute('POSITION')?.getCount()??0;
  triangles+=Math.floor(count/3);
  const m=prim.getMaterial();if(m)materials.add(m);
 }
 // A mesh instanced by several nodes is drawn once per node.
 const meshUses=new Map();
 for(const node of root.listNodes()){const m=node.getMesh();if(m)meshUses.set(m,(meshUses.get(m)||0)+1);}
 let instancedCalls=0;for(const [mesh,uses] of meshUses)instancedCalls+=mesh.listPrimitives().length*Math.max(0,uses-1);
 const bones=new Set();for(const skin of root.listSkins())for(const j of skin.listJoints())bones.add(j);
 return {triangles,drawCalls:drawCalls+instancedCalls,materials:materials.size,bones:bones.size,textures:root.listTextures().length,bytes:bytes.length,
  meshes:root.listMeshes().length,nodes:root.listNodes().length,animations:root.listAnimations().map(a=>a.getName()),skins:root.listSkins().length};
}
export async function structuralReport(bytes){
 const report=await validator.validateBytes(new Uint8Array(bytes),{maxIssues:50});
 const issues=report.issues?.messages||[];
 return {errors:issues.filter(m=>m.severity===0),warnings:issues.filter(m=>m.severity===1),infos:issues.filter(m=>m.severity>=2).length,validator:report.validatorVersion};
}
// Scene-space bounds: every primitive's vertex range is carried through the node's world matrix,
// so a unit-conversion node (the creature adapter's game-units wrapper) is part of the answer.
export async function boundsOf(bytes){
 const doc=await readGlb(bytes);
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 const expand=(m,p)=>{
  const x=m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],y=m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],z=m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14];
  min[0]=Math.min(min[0],x);min[1]=Math.min(min[1],y);min[2]=Math.min(min[2],z);max[0]=Math.max(max[0],x);max[1]=Math.max(max[1],y);max[2]=Math.max(max[2],z);
 };
 for(const node of doc.getRoot().listNodes()){
  const mesh=node.getMesh();if(!mesh)continue;
  const m=node.getWorldMatrix();
  for(const prim of mesh.listPrimitives()){
   const pos=prim.getAttribute('POSITION');if(!pos)continue;
   const lo=pos.getMin([]),hi=pos.getMax([]);
   for(let c=0;c<8;c++)expand(m,[c&1?hi[0]:lo[0],c&2?hi[1]:lo[1],c&4?hi[2]:lo[2]]);
  }
 }
 return min.every(Number.isFinite)?{min:min.map(n=>+n.toFixed(5)),max:max.map(n=>+n.toFixed(5))}:null;
}

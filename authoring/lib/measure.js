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
export async function boundsOf(bytes){
 const doc=await readGlb(bytes);
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(const mesh of doc.getRoot().listMeshes())for(const prim of mesh.listPrimitives()){
  const pos=prim.getAttribute('POSITION');if(!pos)continue;
  const lo=pos.getMin([]),hi=pos.getMax([]);
  for(let i=0;i<3;i++){min[i]=Math.min(min[i],lo[i]);max[i]=Math.max(max[i],hi[i]);}
 }
 return min.every(Number.isFinite)?{min,max}:null;
}

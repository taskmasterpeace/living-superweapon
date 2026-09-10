// Bake a three.js object tree into a GLB with gltf-transform. Deterministic: no timestamps,
// fixed generator string, one buffer. Two modes:
//  - hierarchy: node names, parenting and empty socket nodes are preserved one-to-one;
//  - mergeByMaterial: every mesh is world-transformed and merged into one primitive per material
//    (one draw call per material at runtime), while every `socket:*` empty is kept as a root-level
//    node carrying its exact world transform, so the semantic attachment names survive optimization.
import {Document,NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const pos=new THREE.Vector3(),quat=new THREE.Quaternion(),scl=new THREE.Vector3();
function materialRecord(doc,materials,mat){
 const key=mat.uuid;if(materials.has(key))return materials.get(key);
 const m=doc.createMaterial(mat.name||`material-${materials.size}`);
 const c=mat.color??new THREE.Color(1,1,1);
 m.setBaseColorFactor([c.r,c.g,c.b,mat.opacity??1]);
 m.setRoughnessFactor(mat.roughness??.9);m.setMetallicFactor(mat.metalness??0);
 if(mat.emissive&&(mat.emissive.r||mat.emissive.g||mat.emissive.b))m.setEmissiveFactor([mat.emissive.r,mat.emissive.g,mat.emissive.b]);
 m.setDoubleSided(mat.side===THREE.DoubleSide);
 materials.set(key,m);return m;
}
function primitiveFrom(doc,g,material){
 const p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=g.getAttribute('uv');
 const acc=(array,type)=>doc.createAccessor().setType(type).setArray(array);
 const prim=doc.createPrimitive();
 prim.setAttribute('POSITION',acc(new Float32Array(p.array),'VEC3'));
 if(n)prim.setAttribute('NORMAL',acc(new Float32Array(n.array),'VEC3'));
 if(uv)prim.setAttribute('TEXCOORD_0',acc(new Float32Array(uv.array),'VEC2'));
 if(g.index)prim.setIndices(acc(g.index.count>65535?new Uint32Array(g.index.array):new Uint16Array(g.index.array),'SCALAR'));
 prim.setMaterial(material);return prim;
}
// Strip attributes the merge cannot reconcile (only position/normal/uv are shipped anyway).
function normalized(geometry){
 const g=(geometry.index?geometry:geometry.toNonIndexed()).clone();
 for(const name of Object.keys(g.attributes))if(!['position','normal','uv'].includes(name))g.deleteAttribute(name);
 if(!g.getAttribute('uv'))g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count*2),2));
 if(!g.getAttribute('normal'))g.computeVertexNormals();
 g.clearGroups();return g;
}
export async function objectToGlb(root,{generator='powerworld-authoring',name='model',mergeByMaterial=false}={}){
 const doc=new Document();doc.createBuffer('bin');
 doc.getRoot().getAsset().generator=generator;
 const scene=doc.createScene(name);
 const materials=new Map();
 root.updateMatrixWorld(true);
 if(mergeByMaterial){
  const rootNode=doc.createNode(root.name||name);scene.addChild(rootNode);
  const rootInverse=new THREE.Matrix4().copy(root.matrixWorld).invert();
  const byMaterial=new Map();
  root.traverse(o=>{
   if(o.isMesh){
    const mat=Array.isArray(o.material)?o.material[0]:o.material;
    const g=normalized(o.geometry);g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(rootInverse,o.matrixWorld));
    if(!byMaterial.has(mat))byMaterial.set(mat,[]);byMaterial.get(mat).push(g);
   }
  });
  for(const [mat,geometries] of byMaterial){
   const merged=mergeGeometries(geometries,false);if(!merged)throw new Error(`could not merge geometries for material ${mat.name}`);
   const node=doc.createNode('batch:'+(mat.name||'material'));
   node.setMesh(doc.createMesh('batch:'+(mat.name||'material')).addPrimitive(primitiveFrom(doc,merged,materialRecord(doc,materials,mat))));
   rootNode.addChild(node);
  }
  root.traverse(o=>{
   if(!o.name.startsWith('socket-'))return;
   new THREE.Matrix4().multiplyMatrices(rootInverse,o.matrixWorld).decompose(pos,quat,scl);
   const node=doc.createNode(o.name);node.setTranslation(pos.toArray());node.setRotation(quat.toArray());node.setScale(scl.toArray());
   rootNode.addChild(node);
  });
 }else{
  const convert=(obj,parentNode)=>{
   const node=doc.createNode(obj.name||'');
   node.setTranslation(obj.position.toArray());node.setRotation(obj.quaternion.toArray());node.setScale(obj.scale.toArray());
   if(obj.isMesh){
    const mats=Array.isArray(obj.material)?obj.material:[obj.material];
    node.setMesh(doc.createMesh(obj.name||'mesh').addPrimitive(primitiveFrom(doc,normalized(obj.geometry),materialRecord(doc,materials,mats[0]))));
   }
   if(parentNode)parentNode.addChild(node);else scene.addChild(node);
   for(const child of obj.children)convert(child,node);
  };
  convert(root,null);
 }
 const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
 return Buffer.from(await io.writeBinary(doc));
}

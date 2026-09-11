import * as THREE from 'three';
import bank from '../data/field-greaves-bank.json' with {type:'json'};

// Original source-fitted geometry, attached below the native shin. Each actor
// owns its buffers and scalar materials; the ceramic reuses its live palette.
export function createFieldGreave(side,armor){
 const id=`greave_${side}`,data=bank.pieces[id];
 const meshes=bank.materials.map((material,i)=>{
  const geometry=new THREE.BufferGeometry();geometry.name=`field-${id}`;
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.position,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(data.normal,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(data.uv,2));
  if(material.name==='ceramic')geometry.setAttribute('fieldWear',new THREE.Uint8BufferAttribute(Uint8Array.from(data.fieldWear,v=>Math.round(v*255)),3,true));
  geometry.setIndex(data.groups.filter(g=>g.materialIndex===i).flatMap(g=>data.index.slice(g.start,g.start+g.count)));
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const owned=material.name==='ceramic'?armor:new THREE.MeshStandardMaterial({name:`field-greave-${material.name}`,color:new THREE.Color().fromArray(material.color),roughness:material.roughness,metalness:material.metalness});
  const mesh=new THREE.Mesh(geometry,owned);mesh.name=`field-${id}-${material.name}`;mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
 });
 const root=meshes[bank.materials.findIndex(m=>m.name==='ceramic')];root.name=`field-${id}`;root.userData.heroGear=true;
 for(const mesh of meshes)if(mesh!==root)root.add(mesh);return root;
}

import * as THREE from 'three';
import bank from '../data/field-armor-bank.json' with {type:'json'};
import harnessBank from '../data/field-harness-bank.json' with {type:'json'};
import {attachFieldArmorWear} from './field-armor-wear.js';

// A scalar-material mesh hierarchy preserves native ghost/visibility handling.
// All pieces stay below one existing driven limb; there is no extra skeleton.
export function createFieldArmor(id,armor){
 const source=bank.pieces[id]?bank:harnessBank;
 const data=source.pieces[id],pieces=source.materials.map((m,i)=>{
  const geometry=new THREE.BufferGeometry();geometry.name=`field-${id}`;
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.position,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(data.normal,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(data.uv,2));
  if(m.name==='ceramic')attachFieldArmorWear(geometry,id);
  geometry.setIndex(data.groups.filter(g=>g.materialIndex===i).flatMap(g=>data.index.slice(g.start,g.start+g.count)));
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const material=m.name==='ceramic'?armor:new THREE.MeshStandardMaterial({name:`field-${m.name}`,color:new THREE.Color().fromArray(m.color),roughness:m.roughness,metalness:m.metalness});
  const mesh=new THREE.Mesh(geometry,material);mesh.name=`field-${id}-${m.name}`;return mesh;
 });
 const root=pieces[source.materials.findIndex(m=>m.name==='ceramic')];root.name=`field-${id}`;
 for(const piece of pieces)if(piece!==root)root.add(piece);return root;
}

import * as THREE from 'three';
import bank from '../data/field-boot-bank.json' with {type:'json'};
import {attachFieldArmorWear} from './field-armor-wear.js';

// Authored in Blender; a synchronous mesh replacement on the original native
// foot driver. Per-figure ownership lets ordinary Fighter disposal retire it.
export function createFieldBoot(armor){
 const materials=bank.materials.map(m=>m.name==='ceramic'?armor:new THREE.MeshStandardMaterial({name:`field-boot-${m.name}`,color:new THREE.Color().fromArray(m.color),roughness:m.roughness,metalness:m.metalness}));
 // Keep the engine's scalar-material mesh contract: holograms, invisibility and
 // possession traverse these descendants just like the classic toe detail.
 const pieces=bank.materials.map((material,i)=>{
  const geometry=new THREE.BufferGeometry();geometry.name='field-boot';
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(bank.position,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(bank.normal,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(bank.uv,2));
  if(material.name==='ceramic')attachFieldArmorWear(geometry,'boot');
  geometry.setIndex(bank.groups.filter(g=>g.materialIndex===i).flatMap(g=>bank.index.slice(g.start,g.start+g.count)));
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const mesh=new THREE.Mesh(geometry,materials[i]);mesh.name=`field-boot-${material.name}`;return mesh;
 });
 const root=pieces[bank.materials.findIndex(m=>m.name==='ceramic')];root.name='field-boot';
 for(const piece of pieces)if(piece!==root)root.add(piece);return root;
}

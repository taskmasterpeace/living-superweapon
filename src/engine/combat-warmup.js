import * as THREE from 'three';
import {createBeamMaterials,createBeamSourceMaterial} from './beam-surface.js';
import {ChargeGather} from './charge-gather.js';
import {createSurfaceWakeMesh} from './flight-surface-wake.js';

// Only render resources: no fighters, simulation steps, sounds or borrowed
// lights. Invisible meshes are visited by compile(), never submitted in play.
export class CombatWarmup{
 constructor(parent){
  this.group=new THREE.Group();this.group.name='combat-shader-preparation';this.group.visible=false;
  const geometry=new THREE.SphereGeometry(1,8,6),count=geometry.attributes.position.count;
  geometry.setAttribute('beamArc',new THREE.BufferAttribute(new Float32Array(count),1));
  geometry.setAttribute('beamTangent',new THREE.BufferAttribute(new Float32Array(count*3),3));
  for(const readable of [false,true]){
   const materials=createBeamMaterials('#efb32c','#ffffff',readable,true);
   for(const key of ['core','glow','tip'])this.group.add(new THREE.Mesh(geometry,materials[key]));
   this.group.add(new THREE.InstancedMesh(geometry,materials.detail,1));
  }
  this.group.add(new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:'#ffffff'})));
  this.group.add(new THREE.Mesh(geometry,createBeamSourceMaterial('#efb32c')));
  this.group.add(new ChargeGather('#efb32c'));
  this.group.add(createSurfaceWakeMesh());
  parent.add(this.group);this.disposed=false;
 }
 dispose(){
  if(this.disposed)return;this.disposed=true;this.group.removeFromParent();
  const geometries=new Set(),materials=new Set();
  this.group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);if(o.isInstancedMesh)o.dispose();});
  for(const g of geometries)g.dispose();for(const m of materials)m.dispose();this.group.clear();
 }
}

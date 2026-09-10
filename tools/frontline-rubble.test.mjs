import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {buildFrontlineRubble} from '../src/engine/frontline-rubble.js';
test('instanced surface chips stay small in combat, leave entry clear and settle after crater writes',()=>{
 const groundGeo=new THREE.PlaneGeometry(2100,2100,8,8),material=new THREE.MeshStandardMaterial(),group=new THREE.Group();let floor=12;
 const world={groundGeo,_ghArena:1028,heightAt:()=>floor};
 const stage={group,_cover:[],frontlineRelief:[],_geos:[],_mats:[],g:{world}};
 const meshes=buildFrontlineRubble(stage,material);assert.equal(meshes.length,2);
 const near=meshes[0];assert.ok(near.isInstancedMesh);assert.equal(near.count,3600);const matrix=new THREE.Matrix4(),pos=new THREE.Vector3(),q=new THREE.Quaternion(),scale=new THREE.Vector3();
 near.geometry.computeBoundingBox();const bounds=near.geometry.boundingBox;
 assert.ok(near.geometry.index.count/3<=96,'Scanned chip exceeds instance triangle budget');
 for(let i=0;i<near.count;i++){near.getMatrixAt(i,matrix);matrix.decompose(pos,q,scale);assert.ok(Math.hypot(pos.x,pos.z)>138);assert.ok((bounds.max.y-bounds.min.y)*scale.y<.77,'Chip is no longer short surface detail');assert.ok(bounds.max.y*scale.y+pos.y-floor<.63);assert.ok(pos.y>=floor-.01&&pos.y<floor+.5);}
 floor=7;groundGeo.attributes.position.needsUpdate=true;near.onBeforeRender();near.getMatrixAt(0,matrix);matrix.decompose(pos,q,scale);assert.ok(pos.y>=7&&pos.y<7.5,'Rubble did not settle into native crater');
 assert.equal(stage._cover.length,0,'Decorative chips altered collision cover');
 for(const mesh of meshes)mesh.geometry.dispose();groundGeo.dispose();material.dispose();
});

test('short scanned chips follow native slope normals and realign after crater changes',()=>{
 const groundGeo=new THREE.PlaneGeometry(2100,2100,8,8),material=new THREE.MeshStandardMaterial(),group=new THREE.Group();let sx=.8,sz=-.3;
 const world={groundGeo,heightAt:(x,z)=>30+x*sx+z*sz};
 const stage={group,_cover:[],frontlineRelief:[],_geos:[],_mats:[],g:{world}},meshes=buildFrontlineRubble(stage,material),near=meshes[0];
 const matrix=new THREE.Matrix4(),point=new THREE.Vector3(),position=new THREE.Vector3(),q=new THREE.Quaternion(),scale=new THREE.Vector3();
 const verify=()=>{
  const normal=new THREE.Vector3(-sx,1,-sz).normalize();
  for(let i=0;i<near.count;i+=37){near.getMatrixAt(i,matrix);matrix.decompose(position,q,scale);
   assert.ok(new THREE.Vector3(0,1,0).applyQuaternion(q).dot(normal)>.99999,'Chip remained horizontal above sloped ground');
   let under=false;for(let j=0;j<near.geometry.attributes.position.count;j++){
    point.fromBufferAttribute(near.geometry.attributes.position,j).applyMatrix4(matrix);const clearance=point.y-world.heightAt(point.x,point.z);
    assert.ok(clearance<1,'Scanned chip floats above its native slope');if(clearance<0)under=true;
   }assert.ok(under,'Chip has no embedded contact with native ground');
  }
 };
 verify();sx=-.45;sz=.7;groundGeo.attributes.position.needsUpdate=true;near.onBeforeRender();verify();
 for(const geo of stage._geos)geo.dispose();groundGeo.dispose();material.dispose();
});

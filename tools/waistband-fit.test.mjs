import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {Ragdoll} from '../src/engine/ragdoll.js';
import {updateHeroSkin,snapshotHeroSkins} from '../src/engine/hero-skin.js';
import {waistbandGeometry} from '../src/engine/hero-waistband.js';

// A circular hoop around an oval body fails this actual-surface distance test.
// Pivots, bounding boxes and the hidden procedural driver are not skin evidence.
function gap(f){
 const belt=f.obj.getObjectByName('costume-belt');
 assert.ok(belt?.visible&&belt.layers.isEnabled(0),'The costume must retain a visible belt');
 const body=f.parts.skin?.meshes.find(m=>m.name==='hero-skin-body')||f.parts.pelvis;
 f.obj.updateMatrixWorld(true);updateHeroSkin(f.parts);
 const position=body.geometry.attributes.position,vertices=[];
 for(let i=0;i<position.count;i++)vertices.push(body.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(body.matrixWorld));
 const index=body.geometry.index,triangles=[];
 for(let i=0;i<index.count;i+=3)triangles.push(new THREE.Triangle(...[0,1,2].map(k=>vertices[index.getX(i+k)])));
 let worst=0;const point=new THREE.Vector3(),nearest=new THREE.Vector3();
 for(let i=0;i<belt.geometry.attributes.position.count;i++){
  belt.getVertexPosition(i,point).applyMatrix4(belt.matrixWorld);let distance=Infinity;
  for(const triangle of triangles)distance=Math.min(distance,triangle.closestPointToPoint(point,nearest).distanceTo(point));
  worst=Math.max(worst,distance);
 }
 return worst;
}
const frames=[{scale:1,bulk:1},{scale:.65,bulk:1.65},{scale:1.4,bulk:.7}];
test('surface-fitted strap is closed, outward and finite, including its top and bottom edges',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='sol'));
 const geometry=waistbandGeometry(f.parts.pelvis.geometry,.18,.5,.06),mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial());
 try{
  mesh.updateMatrixWorld(true);
  for(const y of [.19,.32,.49])for(let a=0;a<Math.PI*2;a+=Math.PI/8){
   const dir=new THREE.Vector3(Math.sin(a),0,Math.cos(a)),ray=new THREE.Raycaster(dir.clone().multiplyScalar(3).setY(y),dir.clone().negate());
   const hit=ray.intersectObject(mesh)[0];assert.ok(hit,'Every radial direction must meet the closed fitted strap');
   assert.ok(hit.face.normal.dot(dir)>0,'Visible surface is inside out');
  }
  for(const side of [-1,1]){
   const hits=new THREE.Raycaster(new THREE.Vector3(0,side>0?2:-1,.55),new THREE.Vector3(0,-side,0)).intersectObject(mesh);
   assert.ok(hits.length,'The strap edge must have thickness, not an open cut');
  }
  assert.ok([...geometry.attributes.position.array,...geometry.attributes.normal.array].every(Number.isFinite));
 }finally{geometry.dispose();mesh.material.dispose();f.dispose();}
});
for(const body of ['procedural','superhero-male','superhero-female'])for(const frame of frames)test(`${body} belt follows actual body surface at ${frame.scale}/${frame.bulk}`,()=>{
 const f=new Fighter({...ROSTER.find(d=>d.id==='sol'),frame,model:{body}});
 try{
  f._animate(0);const distance=gap(f);
  assert.ok(distance<.14*Math.max(frame.scale,frame.bulk),`Belt floats ${distance.toFixed(4)} units from the actual body`);
 }finally{f.dispose();}
});

for(const body of ['procedural','superhero-male','superhero-female'])test(`${body} fitted belt stays attached through gait, independent aim and ragdoll`,()=>{
 const f=new Fighter({...ROSTER.find(d=>d.id==='sol'),frame:frames[0],model:{body}});
 try{
  Object.assign(f,{_openSky:true,gait:'grounded',hasAimWorld:true});f.vel.set(14,0,0);
  for(let i=0;i<120;i++){
   f.animT+=1/60;f.aimWorld.set(Math.sin(i/40)*65,12,80);f.facing=Math.atan2(f.aimWorld.x,80);f.aim3.copy(f.aimWorld).sub(f.pos).normalize();f._animate(1/60);
   if(i%30===0)assert.ok(gap(f)<.14,`Belt left moving body at frame ${i}`);
  }
  f.flying=true;f.gait='airborne';f.pos.y=40;
  for(const velocity of [[0,0,0],[30,12,35],[-30,-12,35]]){
   f.vel.fromArray(velocity);
   for(let i=0;i<30;i++){f.animT+=1/60;f._animate(1/60);}
   assert.ok(gap(f)<.14,`Belt left airborne body at ${velocity}`);
  }
  const rag=new Ragdoll(f,new THREE.Vector3(18,22,12));
  for(let i=0;i<60;i++){rag.step(1/60,null);rag.apply(f);if(i%20===0)assert.ok(gap(f)<.14,`Belt left ragdoll at ${i}`);}
  rag.restore(f);f._animate(0);assert.ok(gap(f)<.14,'Belt did not restore with the body');
 }finally{f.dispose();}
});

test('a source-bodied spectral copy freezes its belt when the live pelvis turns',()=>{
 const f=new Fighter({...ROSTER.find(d=>d.id==='sol'),model:{body:'superhero-male'}});
 let snapshot;
 try{
  f._animate(0);snapshot=snapshotHeroSkins(f.obj.clone(true));snapshot.updateMatrixWorld(true);
  const belt=snapshot.getObjectByName('costume-belt'),before=[];
  for(let i=0;i<belt.geometry.attributes.position.count;i++)before.push(belt.getVertexPosition(i,new THREE.Vector3()).toArray());
  f.parts.pelvis.rotation.set(.7,1.2,.2);updateHeroSkin(f.parts);
  for(let i=0;i<before.length;i++)assert.ok(belt.getVertexPosition(i,new THREE.Vector3()).distanceTo(new THREE.Vector3(...before[i]))<1e-6,'Snapshot belt still follows the live skeleton');
 }finally{snapshot?.traverse(o=>{if(o.userData._snapshotGeometry)o.geometry.dispose();});f.dispose();}
});

test('martial sash follows the pelvis instead of adding a second floating box wrap',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='kano'));
 try{
  f._animate(0);const wraps=f.parts.pelvis.children.filter(m=>{
   if(!m.isMesh)return false;m.geometry.computeBoundingBox();const bounds=m.geometry.boundingBox.clone().applyMatrix4(m.matrix);
   return bounds.max.x-bounds.min.x>1&&bounds.min.y<.4&&bounds.max.y>.4;
  });
  assert.equal(wraps.length,1,'A fitted sash must replace, not overlap, the circular belt');
  assert.ok(gap(f)<.14*Math.max(f.parts.g.userData.frame.bulk,f.parts.g.userData.frame.scale));
 }finally{f.dispose();}
});

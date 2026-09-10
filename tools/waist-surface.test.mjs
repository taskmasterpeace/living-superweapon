import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {runSlot} from '../src/engine/abilities.js';
import {trunkProbe} from './helpers/trunk-probe.mjs';
import {updateLimbSurfaces} from '../src/engine/hero-limb-surface.js';
import {Ragdoll} from '../src/engine/ragdoll.js';

// Closing the waist requires the real lower hem to stay inside the pelvis.
// A static overlap in bind pose is not enough once the two drivers turn apart.
function hemDetached(p,inside){
 const vertices=p.torso.geometry.attributes.position,segments=p.torso.geometry.userData.anatomy.segments;
 const inverse=p.pelvis.matrixWorld.clone().invert();let outside=0;
 for(let i=0;i<segments;i++){
  const point=new THREE.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(p.torso.matrixWorld);
  if(!inside(point,inverse))outside++;
 }
 return outside;
}
for(const hz of [30,60,120])for(const motion of ['strafe','hover','fly'])test(`rendered lower torso remains joined to the pelvis during independent chest fire: ${motion}/${hz} Hz`,()=>{
 const def=structuredClone(ROSTER.find(d=>d.id==='titan'));
 def.abilities={lmb:{type:'beam',chest:true,castStyle:'chest-brace',cost:1,kiPerSec:1,dps:1,steer:4,color:'#ffba48'}};
 const scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const c=new StudioCombat(scene,world),g=c.game,f=new Fighter(def);g.entities=[f];scene.add(f.obj);
 Object.assign(f,{_game:g,_openSky:true,energyInfinite:true,hasAimWorld:true,level:10,flying:motion!=='strafe',gait:motion==='strafe'?'grounded':'airborne'});
 f.pos.set(0,motion==='strafe'?0:50,0);f.vel.set(motion==='strafe'?14:0,0,motion==='fly'?40:0);
 const inside=trunkProbe(f.parts.pelvis),dt=1/hz;
 try{
  let outside=0;
  for(let i=0;i<hz*5;i++){
   const time=i/hz;f.aimWorld.set(Math.sin(time)*60,f.pos.y+35,100);f.facing=Math.atan2(f.aimWorld.x,100);f.aim3.copy(f.aimWorld).sub(f.pos).normalize();
   if(i===Math.floor(hz*.5))runSlot(f,'lmb',{pressed:true,held:true,dt},g);
   if(i===hz*4)runSlot(f,'lmb',{held:false,released:true,dt},g);
   f.animT+=dt;f.advanceActionPose(dt);f._animate(dt);g.projectiles.update(dt,g);f.obj.updateMatrixWorld(true);
   if(i%3===0)outside+=hemDetached(f.parts,inside);
  }
  assert.equal(outside,0,`${outside} rendered hem vertices left the pelvis and opened the waist`);
 }finally{c.dispose();f.dispose();}
});

test('waist attachment follows the current drivers for every shipped procedural frame, without moving sockets',()=>{
 for(const def of ROSTER){
  const f=new Fighter({...def,model:{...def.model,body:'procedural'}}),p=f.parts,inside=trunkProbe(p.pelvis);
  const original=p.torso.geometry.attributes.position.array.slice();
  try{
   for(const [pitch,yaw,roll]of [[-.65,0,0],[.65,0,.3],[0,1.5,0],[0,-1.5,0]]){
    p.torso.rotation.set(pitch,yaw,roll);
    const position=f.pos.clone(),hand=p.armR.children[2].getWorldPosition(new THREE.Vector3());
    updateLimbSurfaces(p,true);
    assert.equal(hemDetached(p,inside),0,`${def.id}: detached lower torso at ${pitch}/${yaw}/${roll}`);
    assert.ok(f.pos.distanceTo(position)<1e-8);assert.ok(p.armR.children[2].getWorldPosition(new THREE.Vector3()).distanceTo(hand)<1e-8,'surface repair moved a hand socket');
    const after=p.torso.geometry.attributes.position.array;
    for(let i=0;i<after.length;i+=3)if(original[i+1]>=-.25){
     assert.equal(after[i],original[i]);assert.equal(after[i+1],original[i+1]);assert.equal(after[i+2],original[i+2]);
    }
   }
  }finally{f.dispose();}
 }
});

test('waist deformation is idempotent through ragdoll and restores without leaving permanent sculpt offsets',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='titan')),p=f.parts;
 try{
  f._openSky=true;f.flying=true;f.gait='airborne';f.pos.y=50;f.vel.set(0,0,45);
  for(let i=0;i<60;i++){f.animT+=1/60;f._animate(1/60);}
  const before=p.torso.geometry.attributes.position.array.slice(),rag=new Ragdoll(f,new THREE.Vector3(35,25,18));
  for(let i=0;i<120;i++){
   rag.step(1/60,null);rag.apply(f);
   const pos=p.torso.geometry.attributes.position;
   assert.ok(pos.array.every(Number.isFinite),'ragdoll poisoned waist geometry');
   const once=pos.array.slice();updateLimbSurfaces(p,true);assert.deepEqual(pos.array,once,'same pose accumulated deformation');
  }
  rag.restore();
  const after=p.torso.geometry.attributes.position.array;
  for(let i=0;i<after.length;i++)assert.ok(Math.abs(after[i]-before[i])<1e-5,'restored drivers did not restore the same waist surface');
 }finally{f.dispose();}
});

function inspectSurface(p){
 const geo=p.torso.geometry;
 const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),normal=new THREE.Vector3(),outward=new THREE.Vector3();
   const pos=geo.attributes.position,{segments,rings}=geo.userData.anatomy,centers=[];
   for(let row=0;row<rings.length;row++){
    const center=new THREE.Vector3();
    for(let i=0;i<segments;i++)center.add(a.fromBufferAttribute(pos,row*(segments+1)+i));
    centers.push(center.divideScalar(segments));
   }
   for(let i=0;i<(rings.length-1)*segments*6;i+=3){
    const ids=[0,1,2].map(k=>geo.index.getX(i+k)),center=new THREE.Vector3();
    for(const id of ids)center.add(centers[Math.floor(id/(segments+1))]);center.divideScalar(3);
    a.fromBufferAttribute(pos,ids[0]);b.fromBufferAttribute(pos,ids[1]);c.fromBufferAttribute(pos,ids[2]);
    outward.copy(a).add(b).add(c).divideScalar(3).sub(center);
    normal.subVectors(b,a).cross(c.clone().sub(a));
    assert.ok(normal.dot(outward)>0,`inverted waist triangle ${i/3}`);
   }
   for(let i=0;i<pos.count;i++){
    a.fromBufferAttribute(pos,i);
    assert.ok(geo.boundingBox.containsPoint(a));assert.ok(a.distanceTo(geo.boundingSphere.center)<=geo.boundingSphere.radius+1e-7,'culled a flexed vertex');
   }
   const actual=geo.attributes.normal.array.slice();geo.computeVertexNormals();
   const n=geo.attributes.normal;
   for(let row=0;row<rings.length;row++){
    const first=row*(segments+1),last=first+segments;
    a.fromBufferAttribute(n,first).add(b.fromBufferAttribute(n,last)).normalize();n.setXYZ(first,a.x,a.y,a.z);n.setXYZ(last,a.x,a.y,a.z);
   }
   for(let i=0;i<actual.length;i++)assert.ok(Math.abs(actual[i]-n.array[i])<1e-5,'incremental normal differs from real triangle normal');
}
test('flexed abdomen retains outward triangles, correct normals and conservative bounds',()=>{
 for(const frame of [{scale:1,bulk:1},{scale:.65,bulk:1.65}]){
  const f=new Fighter({...ROSTER.find(d=>d.id==='titan'),frame}),p=f.parts;
  try{
   for(const angles of [[0,0,0],[-.65,0,0],[.65,0,.3],[0,0,.8],[0,1.5,0],[0,-1.5,0]]){
    p.torso.rotation.set(...angles);updateLimbSurfaces(p,true);inspectSurface(p);
   }
  }finally{f.dispose();}
 }
});
test('real ragdoll cannot turn waist triangles inside out',()=>{
 const random=Math.random;Math.random=()=>.5;
 const f=new Fighter(ROSTER.find(d=>d.id==='titan'));
 try{
  f.animT=0;f._openSky=true;f.flying=true;f.gait='airborne';f.pos.y=50;f.vel.set(0,0,45);
  for(let i=0;i<60;i++){f.animT+=1/60;f._animate(1/60);}
  const rag=new Ragdoll(f,new THREE.Vector3(35,25,18)),inside=trunkProbe(f.parts.pelvis);
  for(let i=0;i<120;i++){
   rag.step(1/60,null);rag.apply(f);inspectSurface(f.parts);
   assert.equal(hemDetached(f.parts,inside),0,'ragdoll exposed the hem');
  }
 }finally{f.dispose();Math.random=random;}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {updateLimbSurfaces} from '../src/engine/hero-limb-surface.js';
import {Ragdoll} from '../src/engine/ragdoll.js';
import {trunkProbe} from './helpers/trunk-probe.mjs';
import {StudioCombat} from '../src/tool/studio-combat.js';

function corridor(p){
 const meshes=[p.torso,p.neck,p.head],inside=meshes.map(trunkProbe);
 return ()=>{
  p.g.updateMatrixWorld(true);const inverse=meshes.map(m=>m.matrixWorld.clone().invert());
  const base=p.torso.localToWorld(new THREE.Vector3(0,1.2,0)),jaw=p.head.localToWorld(new THREE.Vector3(0,-.6,0));
  for(let i=0;i<=12;i++){
   const point=base.clone().lerp(jaw,i/12);
   assert.ok(inside.some((probe,k)=>probe(point,inverse[k])),`background through neck corridor at ${i}/12`);
  }
 };
}
for(const id of ['sol','titan','vega'])test(`${id}: actual neck volume connects the chest and moving jaw during independent head aim`,()=>{
 const f=new Fighter(ROSTER.find(d=>d.id===id)),p=f.parts,attached=corridor(p);
 try{
  for(const angles of [[0,0,0],[.6,0,0],[-.6,0,0],[.3,1.2,.25],[-.4,-1.2,-.25]]){
   p.head.rotation.set(...angles);const origin=p.head.getWorldPosition(new THREE.Vector3()),rotation=p.head.getWorldQuaternion(new THREE.Quaternion()),root=f.pos.clone();
   updateLimbSurfaces(p,true);attached();
   assert.ok(p.head.getWorldPosition(new THREE.Vector3()).distanceTo(origin)<1e-7,'surface repair moved the optic source');
   assert.ok(p.head.getWorldQuaternion(new THREE.Quaternion()).angleTo(rotation)<1e-7,'surface repair redirected the eyes');
   assert.ok(f.pos.distanceTo(root)<1e-7);
  }
 }finally{f.dispose();}
});
test('neck remains connected through actual ragdoll motion and exact pose restoration',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='titan')),p=f.parts,attached=corridor(p);
 try{
  f._openSky=true;f.flying=true;f.gait='airborne';f.pos.y=50;f.vel.set(0,0,45);
  for(let i=0;i<60;i++){f.animT+=1/60;f._animate(1/60);}
  const rag=new Ragdoll(f,new THREE.Vector3(35,25,18));
  for(let i=0;i<240;i++){rag.step(1/60,null);rag.apply(f);attached();}
  rag.restore();attached();
 }finally{f.dispose();}
});

test('both ends of the rendered neck stay embedded in their owning meshes through ragdoll and custom proportions',()=>{
 for(const frame of [{scale:1,bulk:1,head:1,neck:1},{scale:.65,bulk:1.65,head:1.4,neck:1.6}]){
  const f=new Fighter({...ROSTER.find(d=>d.id==='sol'),frame}),p=f.parts,inside=[trunkProbe(p.torso),trunkProbe(p.head)];
  try{
   f._openSky=true;f.flying=true;f.gait='airborne';f.pos.y=50;f.vel.set(14,0,45);
   for(let i=0;i<60;i++){f.animT+=1/60;f._animate(1/60);}
   const rag=new Ragdoll(f,new THREE.Vector3(35,25,18)),rest=p.neck.geometry.attributes.position.array.slice();
   // CylinderGeometry's top side-ring is the first radialSegments+1 vertices;
   // bottom side-ring follows. Test every actual rim vertex, not only its center.
   const count=p.neck.geometry.parameters.radialSegments+1;
   for(let i=0;i<240;i++){
    rag.step(1/60,null);rag.apply(f);p.g.updateMatrixWorld(true);
    const inverses=[p.torso.matrixWorld.clone().invert(),p.head.matrixWorld.clone().invert()];
    for(let ring=0;ring<2;ring++)for(let v=0;v<count;v++){
     const point=new THREE.Vector3().fromBufferAttribute(p.neck.geometry.attributes.position,ring*count+v).applyMatrix4(p.neck.matrixWorld);
     assert.ok(inside[1-ring](point,inverses[1-ring]),`visible rim detached at frame ${i}, ring ${ring}, vertex ${v}`);
    }
   }
   rag.restore();const after=p.neck.geometry.attributes.position.array;
   for(let i=0;i<after.length;i++)assert.ok(Math.abs(rest[i]-after[i])<1e-5,'ragdoll left permanent neck deformation');
  }finally{f.dispose();}
 }
});

for(const hz of [30,60,120])for(const motion of ['strafe','hover','fly'])test(`moving optic fire retains neck connection and source alignment: ${motion}/${hz} Hz`,()=>{
 const scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const c=new StudioCombat(scene,world),g=c.game,f=new Fighter(ROSTER.find(d=>d.id==='sol'));g.entities=[f];scene.add(f.obj);
 f._game=g;f._openSky=true;f.energyInfinite=true;f.hasAimWorld=true;f.level=10;f.animT=0;
 f.flying=motion!=='strafe';f.gait=f.flying?'airborne':'grounded';f.pos.set(0,f.flying?50:0,0);f.vel.set(motion==='strafe'?14:0,0,motion==='fly'?40:0);
 f.aimWorld.set(0,f.pos.y+40,100);f.aim3.copy(f.aimWorld).sub(f.pos).normalize();f.aim.set(0,0,1);
 const beam=g.spawnBeamFor(f,f.slots.lmb.def,1);f.slots.lmb.active=beam;const attached=corridor(f.parts),dt=1/hz;
 try{
  for(let i=0;i<hz*4;i++){
   f.aimWorld.x=Math.sin(i/hz)*80;f.facing=Math.atan2(f.aimWorld.x,100);f.aim3.copy(f.aimWorld).sub(f.pos).normalize();
   f.animT+=dt;f.advanceActionPose(dt);f._animate(dt);beam.update(dt,g);
   if(i%6===0)attached();
   if(i>hz){
    const eyeRay=new THREE.Vector3(0,0,1).applyQuaternion(f.parts.head.getWorldQuaternion(new THREE.Quaternion()));
    assert.ok(eyeRay.dot(beam.dir)>.98,'neck repair redirected the optical emission');
    assert.ok(beam.muzzle.distanceTo(f.muzzle(new THREE.Vector3(),1.1,8.3))<1e-5,'beam detached from the final eyes');
   }
  }
 }finally{c.dispose();f.dispose();}
});

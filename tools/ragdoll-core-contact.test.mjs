import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {Ragdoll} from '../src/engine/ragdoll.js';

test('opt-in rigid helmet geometry participates in native KO floor support',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='sarge'));
 const helmet=new T.Mesh(new T.BoxGeometry(2.3,1.4,2.4),new T.MeshStandardMaterial());helmet.position.y=.65;helmet.userData.ragdollContact=true;f.parts.head.add(helmet);f.pos.y=20;f.obj.position.copy(f.pos);f.obj.updateMatrixWorld(true);
 try{
  const random=Math.random;let rag;try{Math.random=()=>.5;rag=new Ragdoll(f,new T.Vector3(20,0,15));}finally{Math.random=random;}
  let minimum=Infinity;
  for(let i=0;i<240;i++){rag.step(1/60,{world:{ARENA:240,cover:[],heightAt:()=>0}});rag.apply(f);f.obj.updateMatrixWorld(true);const a=helmet.geometry.attributes.position;
   for(let j=0;j<a.count;j++)minimum=Math.min(minimum,new T.Vector3().fromBufferAttribute(a,j).applyMatrix4(helmet.matrixWorld).y);
  }
  assert.ok(minimum>=-.03,`helmet sinks ${-minimum} units through the floor`);
 }finally{f.dispose();}
});

for(const [name,frame]of [['normal',{}],['tall and broad',{scale:1.5,bulk:1.65,head:1.4,neck:1.6,broad:1.6,stance:1.4}]])test(`${name}: core support and pinned cape seam do not sink through the floor during a fall`,()=>{
 const f=new Fighter({...ROSTER.find(d=>d.id==='sol'),frame});
 try{
  f.animT=0;f._openSky=true;f.flying=true;f.gait='airborne';f.pos.set(20,50,-15);f.vel.set(14,0,45);f.facing=.9;f.aimWorld.set(65,25,90);f.hasAimWorld=true;
  for(let i=0;i<90;i++){f.animT+=1/60;f._animate(1/60);}
  const random=Math.random;let rag;try{Math.random=()=>.5;rag=new Ragdoll(f,new T.Vector3(35,25,18));}finally{Math.random=random;}
  const meshes=[f.parts.torso,f.parts.pelvis,f.parts.head],world={ARENA:240,cover:[],heightAt:()=>0};
  for(let step=0;step<240;step++){
   rag.step(1/60,{world});rag.apply(f);f.obj.updateMatrixWorld(true);
   for(const mesh of meshes){const a=mesh.geometry.attributes.position;for(let i=0;i<a.count;i++){
    // The waist is a separate flexible surface; measure its rigid chest region.
    if(mesh===f.parts.torso&&a.getY(i)<-.25)continue;
    const p=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld);
    assert.ok(p.y>=-.03,`core enters floor by ${-p.y} on step ${step}`);
   }}
   const cape=f.parts.cape,a=cape.geometry.attributes.position;for(let i=0;i<=cape.geometry.parameters.widthSegments;i++){
    const p=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(cape.matrixWorld);assert.ok(p.y>=-.03,`immutable seam below floor by ${-p.y} on step ${step}`);
   }
  }
 }finally{f.dispose();}
});

for(const frame of [{},{scale:.65,bulk:1.65,head:.65,neck:1.6,broad:1.6,stance:1.4},{scale:.65,bulk:.65,head:.65,neck:1.6,broad:1.6,stance:1.4}])for(const [label,c]of [['thin wall',{x:45,z:0,hx:.15,hz:30,top:80}],['raised platform',{x:52,z:3,hx:4,hz:4,top:4}]])test(`${frame.scale?(frame.bulk<1?'short and narrow':'short and broad'):'normal'}: rigid core and sewn attachment stay outside ${label}`,()=>{
 const f=new Fighter({...ROSTER.find(d=>d.id==='sol'),frame});
 try{
  f.animT=0;f._openSky=true;f.flying=true;f.gait='airborne';f.pos.set(20,50,-15);f.vel.set(14,0,45);f.facing=.9;f.aimWorld.set(65,25,90);f.hasAimWorld=true;
  for(let i=0;i<90;i++){f.animT+=1/60;f._animate(1/60);}
  const random=Math.random;let rag;try{Math.random=()=>.5;rag=new Ragdoll(f,new T.Vector3(35,25,18));}finally{Math.random=random;}
  const box=new T.Box3(new T.Vector3(c.x-c.hx+.001,-10000,c.z-c.hz+.001),new T.Vector3(c.x+c.hx-.001,c.top-.001,c.z+c.hz-.001));
  for(let step=0;step<300;step++){
   rag.step(1/60,{world:{ARENA:240,cover:[c],heightAt:()=>0}});rag.apply(f);f.obj.updateMatrixWorld(true);
   for(const mesh of [f.parts.torso,f.parts.head,f.parts.pelvis,f.parts.cape]){
    const a=mesh.geometry.attributes.position,columns=mesh===f.parts.cape?mesh.geometry.parameters.widthSegments+1:a.count;
    for(let i=0;i<columns;i++){
     if(mesh===f.parts.torso&&a.getY(i)<-.25)continue;
     const p=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld);
     assert.ok(!box.containsPoint(p),`${mesh===f.parts.cape?'sewn attachment':'rigid core'} enters ${label} at step ${step}`);
    }
   }
  }
 }finally{f.dispose();}
});

for(const finite of [true,false])test('ragdoll below overhead slab remains in place; core='+finite,()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='merc'));try{f.pos.set(80,12,-20);f.obj.position.copy(f.pos);f.obj.updateMatrixWorld(true);const rag=new Ragdoll(f,new T.Vector3());if(!finite)rag.coreContact=null;const world={ARENA:310,heightAt:()=>0,cover:[{x:0,z:0,hx:310,hz:310,bottom:300,top:304,finiteBuilding:true}]};
 for(let i=0;i<30;i++)rag.step(1/60,{world});
 assert.ok(Math.abs(rag.P.pelvis.pos.x-80)<10,'overhead slab shoved body sideways');assert.ok(Math.abs(rag.P.pelvis.pos.z+20)<10);
 }finally{f.dispose();}
});

test('rigid head contacting slab underside is pushed down without lateral ejection',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='merc'));try{f.obj.updateMatrixWorld(true);const rag=new Ragdoll(f,new T.Vector3()),point=rag.P.head,contact=rag.coreContact;const bounds=new T.Box3();contact.measureBounds(contact.records.get('head'),bounds);const before=point.pos.clone(),bottom=point.pos.y+bounds.max.y-.2;
 contact.coverContact('head',point,[{x:0,z:0,hx:310,hz:310,bottom,top:bottom+4}]);
 assert.ok(Math.abs(point.pos.y-before.y+.2)<1e-6);assert.equal(point.pos.x,before.x);assert.equal(point.pos.z,before.z);
 }finally{f.dispose();}
});

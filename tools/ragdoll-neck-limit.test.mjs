import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {Ragdoll} from '../src/engine/ragdoll.js';
import {trunkProbe} from './helpers/trunk-probe.mjs';

// A neck that folds backward can put the sewn shoulder seam inside the head.
// No cloth projection can repair those kinematic vertices without detaching it.
for(const [id,frame,cover]of [
 ['sol',{scale:1.5,bulk:1.65,head:1.4,neck:1.6,broad:1.6,stance:1.4},[]],
 ['sol',{scale:.65,bulk:.65,head:1.4,neck:1.6,broad:1.6,stance:1.4},[]],
 ['stormcall',{},[]],['sol',{},[{x:45,z:0,hx:.15,hz:30,top:80}]],
])test(`${id} ${frame.scale?'broad':'stock'} ${cover.length?'wall':'floor'}: head cannot fold through sewn cape attachment`,()=>{
 const f=new Fighter({...ROSTER.find(d=>d.id===id),frame});
 try{
  f.animT=0;f._openSky=true;f.flying=true;f.gait='airborne';f.pos.set(20,50,-15);f.vel.set(14,0,45);f.facing=.9;f.aimWorld.set(65,25,90);f.hasAimWorld=true;
  for(let i=0;i<90;i++){f.animT+=1/60;f._animate(1/60);}
  const random=Math.random;let rag;try{Math.random=()=>.5;rag=new Ragdoll(f,new T.Vector3(35,25,18));}finally{Math.random=random;}
  const cape=f.parts.cape,pins=Array.from({length:cape.geometry.parameters.widthSegments+1},(_,i)=>new T.Vector3().fromBufferAttribute(cape.geometry.attributes.position,i));
  const inside=trunkProbe(f.parts.head),inverse=new T.Matrix4();
  for(let frame=0;frame<300;frame++){
   rag.step(1/60,{world:{ARENA:240,cover,heightAt:()=>0}});rag.apply(f);f.obj.updateMatrixWorld(true);
   inverse.copy(f.parts.head.matrixWorld).invert();
   for(const [i,p]of pins.entries())assert.ok(!inside(p.clone().applyMatrix4(cape.matrixWorld),inverse),`head contains sewn attachment ${i} at frame ${frame}`);
  }
 }finally{f.dispose();}
});

test('head clearance does not stretch the captured neck on a short, broad, large-head character',()=>{
 const f=new Fighter({...ROSTER.find(d=>d.id==='sol'),frame:{scale:.65,bulk:1.65,head:1.4,neck:1.6,broad:1.6,stance:1.4}});
 try{
  f.animT=0;f._openSky=true;f.flying=true;f.gait='airborne';f.pos.set(20,50,-15);f.vel.set(14,0,45);f.facing=.9;f.aimWorld.set(65,25,90);f.hasAimWorld=true;
  for(let i=0;i<90;i++){f.animT+=1/60;f._animate(1/60);}
  const random=Math.random;let rag;try{Math.random=()=>.5;rag=new Ragdoll(f,new T.Vector3(35,25,18));}finally{Math.random=random;}
  const length=rag.P.head.pos.distanceTo(rag.P.chest.pos);
  for(let frame=0;frame<240;frame++){
   rag.step(1/60,{world:{ARENA:240,cover:[{x:45,z:0,hx:.15,hz:30,top:80}],heightAt:()=>0}});rag.apply(f);
   assert.ok(rag.P.head.pos.distanceTo(rag.P.chest.pos)<=length*1.03,`neck stretched at frame ${frame}`);
  }
 }finally{f.dispose();}
});

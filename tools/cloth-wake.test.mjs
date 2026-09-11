import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {Ragdoll} from '../src/engine/ragdoll.js';

function landed(){
 // Includes direct procedural head-envelope mutation; weighted wake behavior
 // is exercised against its live skin drivers in cloth-skin-contact.test.mjs.
 const def=ROSTER.find(d=>d.id==='sol');
 const f=new Fighter({...def,model:{...def.model,body:'procedural'}});
 Object.assign(f,{animT:0,_openSky:true,flying:true,gait:'airborne',facing:.9,hasAimWorld:true});
 f.pos.set(20,50,-15);f.vel.set(14,0,45);f.aimWorld.set(65,25,90);
 for(let i=0;i<90;i++){f.animT+=1/60;f._animate(1/60);}f.obj.updateMatrixWorld(true);
 const random=Math.random;let rag;try{Math.random=()=>.5;rag=new Ragdoll(f,new T.Vector3(35,25,18));}finally{Math.random=random;}
 const world={ARENA:240,cover:[],heightAt:()=>0};
 for(let i=0;i<900;i++){rag.step(1/60,{world});rag.apply(f);}
 assert.ok(rag.capePose.asleep,'fixture did not settle');
 return {f,rag,cloth:rag.capePose,world};
}

for(const change of ['head transform','head envelope','added cover','changed terrain'])test(`sleeping cloth notices ${change} without moving its shoulder attachment`,()=>{
 const {f,cloth,world}=landed();try{
  const version=f.parts.cape.geometry.attributes.position.version;
  const pins=cloth.points.slice(0,cloth.columns).map(p=>p.pos.clone());
  if(change==='head transform'){f.parts.head.position.x+=1;f.obj.updateMatrixWorld(true);}
  if(change==='head envelope'){
   f.parts.head.geometry.userData.deformsWithRig=true;
   f.parts.head.geometry.boundingBox.max.x+=.5;
  }
  if(change==='added cover'){
   const p=cloth.points.at(-1).pos;
   world.cover.push({x:p.x,z:p.z,hx:.5,hz:.5,top:p.y+.5});
  }
  if(change==='changed terrain')world.heightAt=()=>-1;
  cloth.update(1/60,world);
  assert.ok(f.parts.cape.geometry.attributes.position.version>version,`${change} left sleeping cloth stale`);
  for(let i=0;i<pins.length;i++)assert.ok(cloth.points[i].pos.distanceTo(pins[i])<1e-7,'fixture moved the shoulder seam');
  assert.equal(cloth.asleep,false,'changed contact did not restart settling');
  if(change==='changed terrain'){
   const free=cloth.points.filter(p=>!p.pin),before=free.map(p=>p.pos.y);
   for(let i=0;i<30;i++)cloth.update(1/60,world);
   assert.ok(free.some((p,i)=>p.pos.y<before[i]-.1),'cloth stayed suspended above the excavated floor');
  }
 }finally{f.dispose();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {Ragdoll} from '../src/engine/ragdoll.js';
import {trunkProbe} from './helpers/trunk-probe.mjs';

for(const [id,hz,cover]of [['sol',30,[]],['sol',60,[]],['sol',120,[]],['stormcall',60,[{x:45,z:0,hx:.15,hz:30,top:80}]]])test(`${id}: arms do not engulf sewn cape attachments during a ${hz} Hz landing${cover.length?' against a wall':''}`,()=>{
 const f=new Fighter(ROSTER.find(d=>d.id===id));
 try{
  f.animT=0;f._openSky=true;f.flying=true;f.gait='airborne';f.pos.set(20,50,-15);f.vel.set(14,0,45);f.facing=.9;
  f.aimWorld.set(65,25,90);f.hasAimWorld=true;
  for(let i=0;i<90;i++){f.animT+=1/60;f._animate(1/60);}f.obj.updateMatrixWorld(true);
  const random=Math.random;let rag;try{Math.random=()=>.5;rag=new Ragdoll(f,new T.Vector3(35,25,18));}finally{Math.random=random;}
  const cape=f.parts.cape,columns=cape.geometry.parameters.widthSegments+1;
  const meshes=['L','R'].flatMap(side=>f.parts['arm'+side].children.slice(0,2)),inside=meshes.map(trunkProbe);
  for(let frame=0;frame<hz*5;frame++){
   rag.step(1/hz,{world:{ARENA:240,cover,heightAt:()=>0}});rag.apply(f);f.obj.updateMatrixWorld(true);
   const inverse=meshes.map(m=>m.matrixWorld.clone().invert());
   for(let i=0;i<columns;i++){
    const p=new T.Vector3().fromBufferAttribute(cape.geometry.attributes.position,i).applyMatrix4(cape.matrixWorld);
    for(let part=0;part<meshes.length;part++)assert.ok(!inside[part](p,inverse[part]),`pin ${i} inside ${['left upper','left fore','right upper','right fore'][part]} arm at frame ${frame}`);
   }
  }
 }finally{f.dispose();}
});

// Diagnostic only: inspect contact-only convergence without changing runtime policy.
import * as T from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {Ragdoll} from '../src/engine/ragdoll.js';
import {trunkProbe} from './helpers/trunk-probe.mjs';
const world={ARENA:240,cover:[],heightAt:()=>0},rows=[];
for(const frame of [null,{scale:1.5,bulk:1.65,head:1.4,neck:1.6,broad:1.6,stance:1.4}]){
 const f=new Fighter({...ROSTER.find(d=>d.id==='sol'),...(frame?{frame}:{})});
 try{
  Object.assign(f,{animT:0,_openSky:true,flying:true,gait:'airborne',facing:.9,hasAimWorld:true});f.pos.set(20,50,-15);f.vel.set(14,0,45);f.aimWorld.set(65,25,90);
  for(let i=0;i<90;i++){f.animT+=1/60;f._animate(1/60);}f.obj.updateMatrixWorld(true);
  const random=Math.random;let rag;try{Math.random=()=>.5;rag=new Ragdoll(f,new T.Vector3(35,25,18));}finally{Math.random=random;}
  const cloth=rag.capePose,meshes=[f.parts.torso,f.parts.pelvis,f.parts.head],probes=meshes.map(trunkProbe),p=new T.Vector3();
  const inspect=()=>{
   const inverse=meshes.map(m=>m.matrixWorld.clone().invert());let bad=0;
   for(const face of cloth.faces)for(const weights of [[1/3,1/3,1/3],[.5,.5,0],[.5,0,.5],[0,.5,.5]]){
    p.set(0,0,0);for(let i=0;i<3;i++)p.addScaledVector(face[i].pos,weights[i]);
    for(let i=0;i<3;i++)if(probes[i](p,inverse[i]))bad++;
   }return bad;
  };
  for(let i=0;i<300;i++){
   rag.step(1/60,{world});rag.apply(f);const before=inspect();if(!before)continue;
   const attempts=[];
   for(let j=0;j<12;j++){
    for(const point of cloth.points)if(!point.pin)cloth.collide(point,world);cloth.collideSurface(world);
    const after=inspect();attempts.push(after);if(!after)break;
   }
   rows.push({large:!!frame,frame:i,before,attempts});
  }
 }finally{f.dispose();}
}
console.log(JSON.stringify(rows,null,2));

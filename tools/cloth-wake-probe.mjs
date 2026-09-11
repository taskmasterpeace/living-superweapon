import * as T from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {Ragdoll} from '../src/engine/ragdoll.js';
const f=new Fighter(ROSTER.find(d=>d.id==='sol'));
try{
 Object.assign(f,{animT:0,_openSky:true,flying:true,gait:'airborne',facing:.9,hasAimWorld:true});
 f.pos.set(20,50,-15);f.vel.set(14,0,45);f.aimWorld.set(65,25,90);
 for(let i=0;i<90;i++){f.animT+=1/60;f._animate(1/60);}f.obj.updateMatrixWorld(true);
 const random=Math.random;let rag;try{Math.random=()=>.5;rag=new Ragdoll(f,new T.Vector3(35,25,18));}finally{Math.random=random;}
 const cloth=rag.capePose,check=cloth.contactChanged,rows=[];let frame=0;
 cloth.contactChanged=function(world){
  const changed=check.call(this,world);if(changed&&rows.length<10){
   rows.push({frame,bodies:this.bodies.map((b,i)=>({i,matrixDelta:Math.max(...b.lastMatrix.elements.map((v,j)=>Math.abs(v-b.mesh.matrixWorld.elements[j]))),bounds:b.mesh.geometry.userData.deformsWithRig?['x','y','z'].map(k=>[b.box.min[k]-(b.mesh.geometry.boundingBox.min[k]-.025),b.box.max[k]-(b.mesh.geometry.boundingBox.max[k]+.025)]):null})).filter(b=>b.matrixDelta||b.bounds?.some(a=>a.some(v=>Math.abs(v)>1e-9)))});
  }return changed;
 };
 const world={ARENA:240,cover:[],heightAt:()=>0};
 for(frame=0;frame<900;frame++){rag.step(1/60,{world});rag.apply(f);}
 console.log(JSON.stringify({asleep:cloth.asleep,rows},null,2));
}finally{f.dispose();}

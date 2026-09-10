import * as T from 'three';
import {Fighter} from '../../src/engine/entity.js';
import {ROSTER} from '../../src/data/characters.js';
import {Ragdoll} from '../../src/engine/ragdoll.js';

// Independent-review fixtures. Randomness is scoped to launch spin only;
// source flight animation and production physics are not replaced by a pose.
export function clothFall({seed=31,frame,cover=[]}={}){
 const fixed=seed===null;
 const f=new Fighter({...ROSTER.find(d=>d.id==='sol'),...(frame?{frame}:{})});
 Object.assign(f,{animT:0,_openSky:true,flying:true,gait:'airborne',facing:.9,hasAimWorld:true});
 f.pos.set(20,50,-15);f.vel.set(14,0,45);f.aimWorld.set(65,25,90);
 for(let i=0;i<90;i++){f.animT+=1/60;f._animate(1/60);}f.obj.updateMatrixWorld(true);
 const random=Math.random;let rag;
 try{
  Math.random=()=>{if(fixed)return .5;seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
  rag=new Ragdoll(f,new T.Vector3(35,25,18));
 }finally{Math.random=random;}
 return {f,rag,world:{ARENA:240,heightAt:()=>0,cover}};
}

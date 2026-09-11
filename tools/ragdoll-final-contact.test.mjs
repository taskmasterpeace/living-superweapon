import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {Ragdoll} from '../src/engine/ragdoll.js';

test('final collar correction cannot carry the arm through terrain after contact solving',()=>{
 const f=new Fighter({...ROSTER.find(d=>d.id==='sol'),frame:{scale:.65,bulk:.65,head:1.4,neck:1.6,broad:1.6,stance:1.4}});
 try{
  f.animT=0;f._openSky=true;f.flying=true;f.gait='airborne';f.pos.set(20,50,-15);f.vel.set(14,0,45);f.facing=.9;
  f.aimWorld.set(65,25,90);f.hasAimWorld=true;
  for(let i=0;i<90;i++){f.animT+=1/60;f._animate(1/60);}f.obj.updateMatrixWorld(true);
  const random=Math.random;let rag;try{Math.random=()=>.5;rag=new Ragdoll(f,new T.Vector3(35,25,18));}finally{Math.random=random;}
  const world={ARENA:240,cover:[{x:52,z:3,hx:4,hz:4,top:4}],heightAt:()=>0};
  for(let frame=0;frame<300;frame++){
   rag.step(1/60,{world});rag.apply(f);f.obj.updateMatrixWorld(true);
   for(const side of ['L','R']){
    assert.ok(rag.P['el'+side].pos.y>=.5-1e-7,`final elbow ${side} entered its terrain margin at frame ${frame}`);
    for(const mesh of f.parts['arm'+side].children.slice(0,2)){
     const a=mesh.geometry.attributes.position;
     for(let i=0;i<a.count;i++)assert.ok(new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld).y>=-.01,`rendered arm entered terrain at frame ${frame}`);
    }
   }
  }
 }finally{f.dispose();}
});

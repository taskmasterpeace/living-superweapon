import test from 'node:test';
import assert from 'node:assert/strict';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {Ragdoll} from '../src/engine/ragdoll.js';
import * as T from 'three';

for(const [label,impulse,downward] of [['tumble',[18,5,10],false],['launch',[55,20,0],false],['slam',[0,-100,0],true]])test(`native ${label} retains launch and settles without sliding`,()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='sol'));
 try{
  f.pos.y=10;f.obj.position.copy(f.pos);f.obj.updateMatrixWorld(true);
  const random=Math.random;let rag;
  try{Math.random=()=>.5;rag=new Ragdoll(f,new T.Vector3(...impulse),{jointLimits:true,downward});}finally{Math.random=random;}
  const origin=rag.P.pelvis.pos.clone(),game={world:{ARENA:240,cover:[],heightAt:()=>0}};
  rag.step(1/60,game);assert.equal(rag.asleep,false);assert.ok(rag.P.pelvis.pos.distanceTo(origin)>.05,'launch was erased');
  let settled;
  for(let i=1;i<900;i++){rag.step(1/60,game);if(i===599)settled=rag.P.pelvis.pos.clone();}
  assert.equal(rag.asleep,true,'body failed to sleep');assert.ok(rag.P.pelvis.pos.distanceTo(settled)<.01,'body kept sliding after ten seconds');
  if(downward)assert.ok(Math.hypot(rag.P.pelvis.pos.x-origin.x,rag.P.pelvis.pos.z-origin.z)<5,'vertical slam manufactured horizontal momentum');
 }finally{f.dispose();}
});

test('low motion cannot put an airborne ragdoll to sleep',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='sol'));
 try{
  f.obj.position.y=100;f.obj.updateMatrixWorld(true);const rag=new Ragdoll(f,new T.Vector3(),{jointLimits:true});rag.gravMul=0;
  for(const pt of Object.values(rag.P))pt.prev.copy(pt.pos);
  for(let i=0;i<120;i++)rag.step(1/60,{world:{ARENA:240,cover:[],heightAt:()=>0}});
  assert.equal(rag.asleep,false);
 }finally{f.dispose();}
});

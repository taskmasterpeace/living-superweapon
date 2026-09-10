import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
// Isolated regression coverage for a rejected candidate. The game/Studio do
// not import this class; passing these tests is not visual/runtime acceptance.
import {RagdollCape} from './prototypes/ragdoll-cape-union.mjs';
import {World} from '../src/engine/world.js';

test('a surface exit clears overlapping body volumes instead of cycling between them',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='sol'));try{
  f._animate(0);const cloth=new RagdollCape(f.parts,new T.Vector3()),face=[40,41,53].map(i=>cloth.points[i]),[a,b,c]=face;
  a.pos.set(100,7,5);a.prev.copy(a.pos);
  b.pos.set(0,5,-1.9);b.prev.copy(b.pos);cloth.resolveContact(b,new T.Vector3(0,5,-2),new T.Vector3(0,0,-1));
  c.pos.set(0,5,2.8);c.prev.copy(c.pos);cloth.resolveContact(c,new T.Vector3(0,5,2.9),new T.Vector3(0,0,1));
  const boxes=[new T.Box3(new T.Vector3(-5,0,-.5),new T.Vector3(5,10,.5)),new T.Box3(new T.Vector3(-5,0,.4),new T.Vector3(5,10,1.4))];
  cloth.faces=[face];cloth.covers=[];cloth.bodies=boxes.map(box=>({box,worldBox:box.clone(),matrix:new T.Matrix4(),inverse:new T.Matrix4()}));
  cloth.collideSurface({heightAt:()=>0});
  const midpoint=b.pos.clone().add(c.pos).multiplyScalar(.5);
  assert.ok(boxes.every(box=>!box.containsPoint(midpoint)),'later body projection re-entered the first body');
  assert.ok(b.pos.z<=-2&&c.pos.z>=2.9,'combined exit violated existing real corner contacts');
 }finally{f.dispose();}
});

test('a body exit can slide along the floor before a corner has sunk into it',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='sol'));try{
  f._animate(0);const cloth=new RagdollCape(f.parts,new T.Vector3()),face=[40,41,53].map(i=>cloth.points[i]),[a,b,c]=face;
  a.pos.set(100,7,5);a.prev.copy(a.pos);const normal=new T.Vector3(-1,-1,1).normalize();
  for(const [p,z] of [[b,-2],[c,2]]){
   const target=new T.Vector3(.45,.05,z);p.pos.copy(target).addScaledVector(normal,-.01);p.prev.copy(p.pos);cloth.resolveContact(p,target,normal);
  }
  const box=new T.Box3(new T.Vector3(-1,-10,-1),new T.Vector3(.5,10,1));
  cloth.faces=[face];cloth.covers=[];cloth.bodies=[{box,worldBox:box.clone(),matrix:new T.Matrix4(),inverse:new T.Matrix4()}];
  cloth.collideSurface({heightAt:()=>0});
  assert.ok(b.pos.x>.5&&c.pos.x>.5,'a short floor-tangent exit was rejected in favor of a long body detour');
  assert.ok(b.pos.y>=.035&&c.pos.y>=.035,'the surface correction penetrated the floor');
  assert.ok(b.pos.distanceTo(new T.Vector3(.45,.05,-2))<.2&&c.pos.distanceTo(new T.Vector3(.45,.05,2))<.2,'floor contact inflated the correction');
 }finally{f.dispose();}
});

test('union candidate acceptance tests the actual constrained sample, not just its normal ray',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='sol'));try{
  f._animate(0);const cloth=new RagdollCape(f.parts,new T.Vector3()),face=[40,41,53].map(i=>cloth.points[i]),[a,b,c]=face;
  a.pos.set(100,7,5);a.prev.copy(a.pos);
  const n=new T.Vector3(-1,1,0).normalize();
  for(const [p,z] of [[b,-2],[c,2]]){
   const target=new T.Vector3(.2,5.2,z);p.pos.copy(target).addScaledVector(n,-.01);p.prev.copy(p.pos);cloth.resolveContact(p,target,n);
   cloth.resolveContact(p,new T.Vector3(.201,5.201,z),new T.Vector3(1,0,0));
  }
  const boxes=[new T.Box3(new T.Vector3(-.3,4.7,-1),new T.Vector3(.7,5.7,1)),new T.Box3(new T.Vector3(.6,5.6,-1),new T.Vector3(2,7,1))];
  cloth.faces=[face];cloth.covers=[];cloth.bodies=boxes.map(box=>({box,worldBox:box.clone(),matrix:new T.Matrix4(),inverse:new T.Matrix4()}));
  const original=cloth.surfaceTargets;let accepted=0;
  cloth.surfaceTargets=function(points,weights,...args){
   const result=original.call(this,points,weights,...args);if(!Number.isFinite(result))return result;
   accepted++;const sample=new T.Vector3();points.forEach((p,i)=>sample.addScaledVector(this.proposalTargets[i],weights[i]));
   assert.ok(boxes.every(box=>!box.containsPoint(sample)),'accepted sample slid into a body outside the nominal ray');return result;
  };
  cloth.collideSurface({heightAt:()=>0});assert.ok(accepted>0,'all exits were abandoned');
 }finally{f.dispose();}
});

test('a terrain-clear downhill exit is not replaced by a flat-floor detour',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='sol'));try{
  f._animate(0);const cloth=new RagdollCape(f.parts,new T.Vector3()),face=[40,41,53].map(i=>cloth.points[i]),[a,b,c]=face;
  a.pos.set(100,7,5);a.prev.copy(a.pos);const normal=new T.Vector3(-.5,-1,0).normalize();
  for(const [p,z] of [[b,-2],[c,2]]){
   const target=new T.Vector3(.45,.062,z);p.pos.copy(target).addScaledVector(normal,-.01);p.prev.copy(p.pos);cloth.resolveContact(p,target,normal);
  }
  const box=new T.Box3(new T.Vector3(-1,-10,-1),new T.Vector3(.5,10,1)),world={heightAt:x=>.25-.5*x};
  cloth.faces=[face];cloth.covers=[];cloth.bodies=[{box,worldBox:box.clone(),matrix:new T.Matrix4(),inverse:new T.Matrix4()}];
  cloth.collideSurface(world);
  assert.ok(b.pos.x>.5&&c.pos.x>.5,'valid downhill contact was replaced by a long sideways detour');
  assert.ok(b.pos.y>=world.heightAt(b.pos.x)+.035&&c.pos.y>=world.heightAt(c.pos.x)+.035,'downhill exit penetrates terrain');
  assert.ok(b.pos.distanceTo(new T.Vector3(.45,.062,-2))<.07&&c.pos.distanceTo(new T.Vector3(.45,.062,2))<.07,'downhill correction exceeds the independently derived short exit');
 }finally{f.dispose();}
});

test('a native heightfield crest preserves an exit down its left slope',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='sol'));try{
  f._animate(0);const cloth=new RagdollCape(f.parts,new T.Vector3()),face=[40,41,53].map(i=>cloth.points[i]),[a,b,c]=face;
  a.pos.set(100,7,5);a.prev.copy(a.pos);const normal=new T.Vector3(.5,-1,0).normalize();
  for(const [p,z] of [[b,-1.5],[c,1.5]]){
   const target=new T.Vector3(0,.037,z);p.pos.copy(target).addScaledVector(normal,-.01);p.prev.copy(p.pos);cloth.resolveContact(p,target,normal);
  }
  const world={ARENA:2,_ghArena:2,_gseg:4,_gh:Float32Array.from({length:25},(_,i)=>-.5*Math.abs(i%5-2)),heightAt:World.prototype.heightAt};
  const box=new T.Box3(new T.Vector3(-.05,-10,-1),new T.Vector3(1,10,1));
  cloth.faces=[face];cloth.covers=[];cloth.bodies=[{box,worldBox:box.clone(),matrix:new T.Matrix4(),inverse:new T.Matrix4()}];
  cloth.collideSurface(world);
  for(const [p,z] of [[b,-1.5],[c,1.5]]){
   assert.ok(p.pos.x<-.05,'right-side terrain tangent rejected the left/down exit');
   assert.ok(p.pos.y>=world.heightAt(p.pos.x,p.pos.z)+.035,'crest exit penetrates actual heightfield');
   assert.ok(p.pos.distanceTo(new T.Vector3(0,.037,z))<.07,'crest exit took a long body detour');
  }
 }finally{f.dispose();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {RagdollCape} from '../src/engine/ragdoll-cape.js';

for(const rotated of [false,true])test(`cloth contact stops inward motion but retains sliding on a ${rotated?'rotated/scaled':'world-axis'} wall`,()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='sol'));try{
  f._animate(0);const cloth=new RagdollCape(f.parts,new T.Vector3());
  const matrix=new T.Matrix4().compose(new T.Vector3(0,5,0),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),rotated?.4:0),new T.Vector3(rotated?2:1,rotated?.7:1,1));
  const box=new T.Box3(new T.Vector3(0,0,0),new T.Vector3(2,2,2));
  cloth.colliders=[{box,worldBox:box.clone().applyMatrix4(matrix),matrix,inverse:matrix.clone().invert()}];
  const p={pos:new T.Vector3(1.99,1.2,1).applyMatrix4(matrix),prev:new T.Vector3(2.003,1,1).applyMatrix4(matrix)};
  cloth.collide(p,{heightAt:()=>0});const v=p.pos.clone().sub(p.prev),n=new T.Vector3(1,0,0).applyNormalMatrix(new T.Matrix3().getNormalMatrix(matrix));
  assert.ok(Math.abs(v.dot(n))<1e-8,`contact retained/injected ${v.dot(n)} normal displacement`);
  assert.ok(v.length()>.05,'contact froze tangential cloth motion');
 }finally{f.dispose();}
});
// Verlet prev encodes velocity after positional stabilization, not a physical
// point the cloth occupied. A cosmetic impulse may put prev across a wall.
for(const side of [-1,1])test(`static cover does not sweep a fictitious Verlet history across the wall (${side})`,()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='sol'));try{
  f._animate(0);const cloth=new RagdollCape(f.parts,new T.Vector3()),p=cloth.points[40];
  p.pos.set(side*2,5,0);p.last.copy(p.pos);p.prev.set(-side*2,5,0);
  const box=new T.Box3(new T.Vector3(-.2,0,-10),new T.Vector3(.2,10,10));
  const cover={cover:true,box,worldBox:box.clone(),matrix:new T.Matrix4(),inverse:new T.Matrix4()};
  cloth.bodies=[];cloth.covers=[cover];cloth.colliders=[cover];p.faces=[];
  cloth.collide(p,{heightAt:()=>0});
  assert.ok(p.pos.x*side>=2-1e-9,'static sweep teleported the cloth to the far side using virtual velocity history');
 }finally{f.dispose();}
});

for(const side of [-1,1])for(const depth of [.1,2])test(`actual cloth travel stops at the entry side of static cover (${side}, ${depth})`,()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='sol'));try{
  f._animate(0);const cloth=new RagdollCape(f.parts,new T.Vector3()),p=cloth.points[40];
  p.last.set(side*2,5,0);p.pos.set(-side*depth,5,0);p.prev.copy(p.pos);
  const box=new T.Box3(new T.Vector3(-.2,0,-10),new T.Vector3(.2,10,10));
  const cover={cover:true,box,worldBox:box.clone(),matrix:new T.Matrix4(),inverse:new T.Matrix4()};
  cloth.bodies=[];cloth.covers=[cover];cloth.colliders=[cover];p.faces=[];
  cloth.collide(p,{heightAt:()=>0});
  assert.ok(p.pos.x*side>.2,'real wall crossing did not return to the entry side');
 }finally{f.dispose();}
});

for(const side of [-1,1])test(`static cover uses the current substep, not an older displayed frame (${side})`,()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='sol'));try{
  f._animate(0);const cloth=new RagdollCape(f.parts,new T.Vector3()),p=cloth.points[40];
  p.pos.set(side*2,5,0);p.sweep=p.pos.clone();p.last.set(-side*2,5,0);p.prev.copy(p.last);
  const box=new T.Box3(new T.Vector3(-.2,0,-10),new T.Vector3(.2,10,10));
  const cover={cover:true,box,worldBox:box.clone(),matrix:new T.Matrix4(),inverse:new T.Matrix4()};
  cloth.bodies=[];cloth.covers=[cover];cloth.colliders=[cover];p.faces=[];
  cloth.collide(p,{heightAt:()=>0});
  assert.ok(p.pos.x*side>=2-1e-9,'sweep reused an older frame instead of this substep');
 }finally{f.dispose();}
});

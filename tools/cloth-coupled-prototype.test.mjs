import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {RagdollCape} from './prototypes/ragdoll-cape-coupled.mjs';

test('a rotated second contact slides along an established body surface instead of re-entering it',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='sol'));try{
  f._animate(0);const cloth=new RagdollCape(f.parts,new T.Vector3()),p=cloth.points[40];
  p.pos.set(1.99,5,0);p.prev.set(2.003,5,0);
  cloth.resolveContact(p,new T.Vector3(2.003,5,0),new T.Vector3(1,0,0));
  cloth.resolveContact(p,new T.Vector3(1.943,5.08,0),new T.Vector3(-.6,.8,0));
  assert.ok(p.pos.x>=2.003-1e-9,'head correction pushed cloth through the established torso plane');
  assert.ok(-.6*p.pos.x+.8*p.pos.y>=-.6*1.943+.8*5.08-1e-9,'preserving the torso abandoned the head contact');
  assert.ok(p.pos.distanceTo(new T.Vector3(2.003,5.125,0))<1e-8,'contact did not take the minimum sliding correction');
 }finally{f.dispose();}
});

test('three compatible body contacts preserve both earlier surfaces',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='sol'));try{
  f._animate(0);const cloth=new RagdollCape(f.parts,new T.Vector3()),p=cloth.points[40];
  p.pos.set(-.1,5,0);p.prev.copy(p.pos);
  cloth.resolveContact(p,new T.Vector3(0,5,0),new T.Vector3(1,0,0));
  cloth.resolveContact(p,new T.Vector3(0,5.1,0),new T.Vector3(0,1,0));
  const normal=new T.Vector3(-1,-1,1).normalize();
  cloth.resolveContact(p,new T.Vector3(-.1,5,.1),normal);
  assert.ok(p.pos.x>=-1e-9&&p.pos.y>=5.1-1e-9,'late correction invalidated an earlier surface');
  assert.ok(p.pos.z>=.3-1e-9,'third contact was ignored instead of using the free tangent');
 }finally{f.dispose();}
});

test('a zero-weight surface corner does not invent an opposing contact',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='sol'));try{
  f._animate(0);const cloth=new RagdollCape(f.parts,new T.Vector3()),p=cloth.points[40];
  p.pos.set(0,5,0);p.prev.copy(p.pos);
  cloth.resolveContact(p,p.pos.clone(),new T.Vector3(0,-1,0));
  cloth.resolveContact(p,new T.Vector3(0,5.1,0),new T.Vector3(0,1,0));
  assert.ok(p.pos.y>=5.1-1e-9,'an unmoved corner acquired a fictitious blocking plane');
 }finally{f.dispose();}
});

test('a vertex may use existing clearance without ratcheting its old contact plane forward',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='sol'));try{
  f._animate(0);const cloth=new RagdollCape(f.parts,new T.Vector3()),p=cloth.points[40];
  p.pos.set(-.1,5,0);p.prev.copy(p.pos);
  cloth.resolveContact(p,new T.Vector3(0,5,0),new T.Vector3(1,0,0));
  cloth.resolveContact(p,new T.Vector3(1,6,0),new T.Vector3(1,1,0).normalize());
  cloth.resolveContact(p,new T.Vector3(.4,6.8,0),new T.Vector3(-.6,.8,0));
  assert.ok(p.pos.distanceTo(new T.Vector3(.4,6.8,0))<1e-8,'the old x=0 contact became an artificial x=1 wall');
 }finally{f.dispose();}
});

test('a surface contact uses its free corners instead of abandoning a valid exit',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='sol'));try{
  f._animate(0);const cloth=new RagdollCape(f.parts,new T.Vector3()),[a,b,c]=[40,41,53].map(i=>cloth.points[i]);
  a.pos.set(1.991,5,-2);a.prev.copy(a.pos);
  cloth.resolveContact(a,new T.Vector3(1.99,5,-2),new T.Vector3(-1,0,0));
  b.pos.set(2.01,5,2);b.prev.copy(b.pos);c.pos.set(2.01,7,0);c.prev.copy(c.pos);
  const before=[a,b,c].map(p=>p.pos.clone()),box=new T.Box3(new T.Vector3(0,-100,-1),new T.Vector3(2,100,1));
  cloth.faces=[[a,b,c]];cloth.bodies=[{box,worldBox:box.clone(),matrix:new T.Matrix4(),inverse:new T.Matrix4()}];cloth.covers=[];
  cloth.collideSurface({heightAt:()=>-1000});
  assert.ok(a.pos.x<=1.99+1e-9,'the constrained corner crossed its earlier plane');
  assert.ok((a.pos.x+b.pos.x)/2>2,'the edge midpoint remains inside the new body');
  for(let i=0;i<3;i++)assert.ok(Math.abs([a,b,c][i].pos.y-before[i].y)<.02&&Math.abs([a,b,c][i].pos.z-before[i].z)<.02,'the entire face took a long sideways exit despite free x travel');
 }finally{f.dispose();}
});

test('velocity correction cannot reintroduce inward motion at an earlier active contact',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='sol'));try{
  f._animate(0);const cloth=new RagdollCape(f.parts,new T.Vector3()),p=cloth.points[40];
  p.pos.set(-.1,5,0);p.prev.set(0,5.1,-.05);
  cloth.resolveContact(p,new T.Vector3(0,5,0),new T.Vector3(1,0,0));
  cloth.resolveContact(p,new T.Vector3(-.06,5.08,0),new T.Vector3(-.6,.8,0));
  const velocity=p.pos.clone().sub(p.prev);
  assert.ok(velocity.x>=-1e-9&&-.6*velocity.x+.8*velocity.y>=-1e-9,'head friction restored inward torso velocity');
  assert.ok(Math.abs(velocity.z-.05)<1e-9,'contact discarded the free sliding velocity');
 }finally{f.dispose();}
});

test('body contact cannot push a previously clear cloth triangle through static cover',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='sol'));try{
  f._animate(0);const cloth=new RagdollCape(f.parts,new T.Vector3()),face=cloth.faces[60],[a,b,c]=face;
  a.pos.set(100,5,-2);b.pos.set(101,5,-2);c.pos.set(100,5,-3);
  for(const p of face){p.prev.copy(p.pos);p.last.copy(p.pos);}
  const box=new T.Box3(new T.Vector3(99,-10000,-1),new T.Vector3(102,6,1));
  cloth.covers=[{cover:true,box,worldBox:box.clone(),matrix:new T.Matrix4(),inverse:new T.Matrix4()}];
  const start=a.pos.clone();
  cloth.resolveContact(a,new T.Vector3(100,5,2),new T.Vector3(0,0,1));
  assert.ok(a.pos.distanceTo(start)<1e-9,'body correction crossed cover and trapped a shared triangle');
 }finally{f.dispose();}
});

test('a virtual surface contact preserves the sample, not three fictitious corner walls',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='sol'));try{
  f._animate(0);const cloth=new RagdollCape(f.parts,new T.Vector3()),face=[40,41,53].map(i=>cloth.points[i]),[a,b,c]=face;
  a.pos.set(1.9,5,-2);b.pos.set(2.1,5,2);c.pos.set(2.1,7,2);
  for(const p of face){p.prev.copy(p.pos);p.faces=[face];}
  const box=new T.Box3(new T.Vector3(0,0,-1),new T.Vector3(2,20,1));
  cloth.faces=[face];cloth.bodies=[{box,worldBox:box.clone(),matrix:new T.Matrix4(),inverse:new T.Matrix4()}];cloth.covers=[];
  cloth.collideSurface({heightAt:()=>-1000});
  assert.ok((a.pos.x+b.pos.x)/2>2,'fixture surface did not acquire its contact');
  for(const p of [b,c])cloth.resolveContact(p,new T.Vector3(4.5,p.pos.y,p.pos.z),new T.Vector3(1,0,0));
  cloth.resolveContact(a,new T.Vector3(1,a.pos.y,a.pos.z),new T.Vector3(-1,0,0));
  assert.ok(Math.abs(a.pos.x-1)<1e-8,'a cleared sample left an artificial per-corner wall behind');
  assert.ok((a.pos.x+b.pos.x)/2>2&&(a.pos.x+c.pos.x)/2>2,'the new corner position invalidated the actual edge contacts');
 }finally{f.dispose();}
});

test('cover correction commits a jointly feasible triangle, never half an invalid proposal',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='sol'));try{
  f._animate(0);const cloth=new RagdollCape(f.parts,new T.Vector3()),face=[40,41,53].map(i=>cloth.points[i]),[a,b,c]=face;
  a.pos.set(3,5,0);b.pos.set(3,6,0);c.pos.set(0,5,0);
  for(const p of face){p.prev.copy(p.pos);p.last.copy(p.pos);p.faces=[face];}
  cloth.faces=[face];cloth.bodies=[];
  cloth.recordSurfaceContact(face,[1/3,1/3,1/3],new T.Vector3(1,0,0),1.5);
  const box=new T.Box3(new T.Vector3(2,0,-10),new T.Vector3(4,10,10));
  cloth.covers=[{cover:true,box,worldBox:box.clone(),matrix:new T.Matrix4(),inverse:new T.Matrix4()}];
  cloth.collideCoverSurface({heightAt:()=>0});
  assert.ok(!box.intersectsTriangle(new T.Triangle(a.pos,b.pos,c.pos)),'only part of the selected cover proposal was applied');
  assert.ok((a.pos.x+b.pos.x+c.pos.x)/3>=1.5-1e-8,'cover correction invalidated the coupled body contact');
 }finally{f.dispose();}
});

test('virtual contact velocity preserves legitimate corner counter-motion',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='sol'));try{
  f._animate(0);const cloth=new RagdollCape(f.parts,new T.Vector3()),face=[40,41,53].map(i=>cloth.points[i]);
  face.forEach((p,i)=>{p.pos.set(2.003,5,i*2);p.prev.copy(p.pos);});
  face[0].prev.x+=.1;face[1].prev.x-=.1;
  cloth.recordSurfaceContact(face,[1/3,1/3,1/3],new T.Vector3(1,0,0),2.003);
  assert.ok(Math.abs(face[0].pos.x-face[0].prev.x+.1)<1e-9,'virtual friction clamped each corner independently');
  assert.ok(Math.abs(face[1].pos.x-face[1].prev.x-.1)<1e-9,'virtual friction discarded balancing corner travel');
 }finally{f.dispose();}
});

test('a later vertex contact cannot inject inward velocity into an existing virtual contact',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='sol'));try{
  f._animate(0);const cloth=new RagdollCape(f.parts,new T.Vector3()),face=[40,41,53].map(i=>cloth.points[i]),[a,b]=face;
  face.forEach((p,i)=>{p.pos.set(0,5,i*2);p.prev.copy(p.pos);});a.prev.x=-1;b.prev.x=1;
  cloth.recordSurfaceContact(face,[1/3,1/3,1/3],new T.Vector3(1,0,0),0);
  cloth.resolveContact(a,new T.Vector3(-.06,5.08,0),new T.Vector3(-.6,.8,0));
  const sampleVelocity=face.reduce((sum,p)=>sum+p.pos.x-p.prev.x,0)/3;
  assert.ok(sampleVelocity>=-1e-8,'a true contact left the existing surface moving inward');
 }finally{f.dispose();}
});

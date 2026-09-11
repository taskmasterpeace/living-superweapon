import test from 'node:test';
import assert from 'node:assert/strict';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import * as THREE from 'three';
import {registerShieldContact} from '../src/engine/shield-surface.js';

function fixture(){
 const f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='aurum')));
 f.invuln=0;f.guarding=true;f.pos.set(10,0,20);f.obj.position.copy(f.pos);f.faceDir(0,1);f.obj.updateMatrixWorld(true);
 return f;
}
test('real blocked damage writes a local shield contact instead of only a uniform flash',()=>{
 const f=fixture();try{
  const m=f.parts.guardArc.material;assert.equal(typeof m.registerHit,'function');
  const source={pos:new THREE.Vector3(10,0,35),def:{},powerBuff:1};
  const oldHp=f.hp;f.takeDamage(10,{src:source,contactPoint:new THREE.Vector3(11,6,24)});
  assert.ok(f.hp<oldHp);assert.equal(m.hits.filter(h=>h.w>=0).length,1);
  assert.ok(m.hits[0].x>0,'Actual off-center contact must remain off-center');
  assert.ok(m.hits[0].z>0,'The contact is on the front surface');
 }finally{f.dispose();}
});

test('shield feedback rejects zero damage and non-contact status ticks',()=>{
 const f=fixture();try{
  const source={pos:new THREE.Vector3(10,0,35),def:{},powerBuff:1};
  f.takeDamage(0,{src:source});
  f.takeDamage(10,{src:source,dot:true,dtype:'toxic'});
  assert.equal(f.parts.guardArc.material.hits.filter(h=>h.w>=0).length,0);
  f.takeDamage(5,{src:source,dot:true,contactFx:true,contactPoint:new THREE.Vector3(10,5.4,24)});
  assert.equal(f.parts.guardArc.material.hits.filter(h=>h.w>=0).length,1,'A real sustained beam still produces contact');
 }finally{f.dispose();}
});

test('elevated sources project onto the visible shield, and real contact takes priority',()=>{
 const f=fixture();try{
  const m=f.parts.guardArc.material,src={pos:new THREE.Vector3(10,30,50)};
  registerShieldContact(f,{src});
  assert.ok(Math.abs(m.hits[0].y)<=4.5,'Fallback cannot put a ripple above the shield');
  registerShieldContact(f,{src,contactPoint:new THREE.Vector3(11,6,24)});
  const hit=m.hits[1];assert.ok(Math.abs(hit.y)<1);assert.ok(hit.x>0);
  assert.ok(Math.abs(Math.hypot(hit.x,hit.y,hit.z)-4.5)<1e-6,'Contact lies on the actual guard sphere');
 }finally{f.dispose();}
});

test('side contacts remain on the narrower visible non-barrier guard',()=>{
 const f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='sol')));try{
  f.invuln=0;f.guarding=true;f.pos.set(0,0,0);f.obj.position.copy(f.pos);f.faceDir(0,1);f.obj.updateMatrixWorld(true);
  f.takeDamage(4,{src:{pos:new THREE.Vector3(10,0,1),def:{},powerBuff:1}});
  const h=f.parts.guardArc.material.hits[0],angle=Math.atan2(h.x,h.z);
  assert.ok(h.w>=0);assert.ok(angle>=-.85&&angle<=.85,`${angle} lies outside visible guard`);
 }finally{f.dispose();}
});

test('KO clears the guard surface before the ragdoll bypasses animation',()=>{
 const f=fixture();try{
  const arc=f.parts.guardArc;arc.visible=true;arc.material.registerHit(new THREE.Vector3(0,0,4.5));
  f._ko();assert.equal(arc.visible,false);assert.ok(arc.material.hits.every(h=>h.w<0));
  f.state='idle';f.guarding=true;f._animate(1/60);
  assert.equal(arc.visible,true,'The reused live rig must show its shield after KO');
 }finally{f.dispose();}
});
test('rejected/unblockable hits cannot fabricate shield impacts',()=>{
 const f=fixture();try{
  const m=f.parts.guardArc.material;assert.equal(typeof m.registerHit,'function');
  const source={pos:new THREE.Vector3(10,0,35),def:{},powerBuff:1};
  f.invuln=1;f.takeDamage(10,{src:source});f.invuln=0;f.takeDamage(10,{src:source,unblockable:true});
  assert.equal(m.hits.filter(h=>h.w>=0).length,0);
 }finally{f.dispose();}
});
test('shield impact queue is bounded, finite and advances only with simulation time',()=>{
 const f=fixture();try{
  const m=f.parts.guardArc.material;assert.equal(typeof m.registerHit,'function');
  for(let i=0;i<40;i++)m.registerHit(new THREE.Vector3(i,1,4));
  assert.equal(m.hits.length,4);assert.ok(m.hits.every(h=>h.toArray().every(Number.isFinite)));
  const before=m.clock;m.advance(0);assert.equal(m.clock,before);
  m.advance(2);assert.ok(m.hits.every(h=>h.w<0),'Expired hits release their shader slots');
  const state=m.hits.map(h=>h.toArray());m.registerHit(new THREE.Vector3(NaN,0,1));assert.deepEqual(m.hits.map(h=>h.toArray()),state);
 }finally{f.dispose();}
});

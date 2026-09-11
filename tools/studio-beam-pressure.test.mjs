import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';

function fixture(hero='vanguard',push=368,guard='open'){
 const scene=new T.Scene(),world={scene,camera:new T.PerspectiveCamera(),cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const c=new StudioCombat(scene,world),def=structuredClone(ROSTER.find(d=>d.id==='sol'));
 c.game.vfx.impactStar=()=>{}; // Canvas sprite only; physical contact/pressure stay real.
 Object.assign(def.abilities.lmb,{dps:24,pushForce:push,cost:0,drain:0});
 const f=new Fighter(def);f._openSky=true;scene.add(f.obj);
 c.motion='advance';c.targetHero=hero;c.shooterMotion='ground-hold';c.targetDefense=guard;c.distance=55;c.targetSpeed=10;
 c.reset(f,true,'beam');
 return {c,f,step(end,hz=60){for(let i=1;i<=end*hz;i++)c.step(i/hz,1/hz);},close(){c.dispose();f.dispose();}};
}

test('pressure rehearsal selects the real defender and advances under actual beam damage',()=>{
 const x=fixture();try{
  const start=x.c.target.pos.z;x.step(3);
  assert.equal(x.c.target.def.id,'vanguard');assert.equal(x.c.target.flying,false);
  assert.ok(x.c.damage>0);assert.ok(x.c.target.pos.z<start-3,`target never walked forward: ${start} -> ${x.c.target.pos.toArray()}, vel ${x.c.target.vel.toArray()}, gait ${x.c.target.gait}, stun=${x.c.target.stunT}, stop=${x.c.target.hitstop}, state=${x.c.target.state}, speed=${x.c.target.speed}, frozen=${x.c.target.frozenT}`);
  assert.ok(x.c.target.pos.z>x.f.pos.z+8,'target passed through caster');
  assert.ok(x.c.target._hitReaction?.beam?.weight>.8,'advancing receiver never expresses beam pressure');
 }finally{x.close();}
});

test('pressure rehearsal keeps real knockback instead of overwriting target travel every frame',()=>{
 const pushed=fixture('sarge',800),control=fixture('sarge',0);
 try{pushed.step(3);control.step(3);assert.equal(pushed.c.target.def.id,'sarge');assert.ok(pushed.c.damage>0&&control.c.damage>0);
  assert.ok(pushed.c.target.pos.z>control.c.target.pos.z+3,'beam force was discarded by the scripted target path');
 }finally{pushed.close();control.close();}
});

test('pressure rehearsal guard uses meter and chip while pause keeps simulation frozen',()=>{
 const guard=fixture('vanguard',368,'guard'),open=fixture();try{
  guard.step(3);open.step(3);assert.ok(guard.c.damage<open.c.damage*.4);assert.ok(guard.c.blockedContacts>0);
  const t=guard.c.target,at=t.pos.clone(),vel=t.vel.clone(),hp=guard.c.damage,meter=t.guardMeter;
  for(let i=0;i<30;i++)guard.c.step(3,0,1/60);
  assert.ok(t.pos.equals(at)&&t.vel.equals(vel));assert.equal(guard.c.damage,hp);assert.equal(t.guardMeter,meter);
  guard.c.reset(guard.f,true,'beam');assert.equal(guard.c.target.pos.z,55);assert.equal(guard.c.damage,0);
 }finally{guard.close();open.close();}
});

test('full walking request advances a strong defender into an authored high-pressure ray',()=>{
 const x=fixture();try{
  x.c.targetSpeed=70;x.f.slots.lmb.def.dps=60;
  x.step(3.3);assert.ok(x.c.target.pos.z<50,`strong advance stopped at ${x.c.target.pos.z}`);
 }finally{x.close();}
});

for(const hz of [30,60,120])test(`a held optical stream keeps its incoming pressure direction at ${hz}Hz`,()=>{
 const x=fixture();try{
  let count=0;
  for(let i=1;i<=1.85*hz;i++){
   x.c.step(i/hz,1/hz);const b=x.f.slots.lmb.active,hit=b?._bodyContact;
   if(!hit?.fighter)continue;
   const toward=hit.surface.clone().sub(b.muzzle).normalize();count++;
   assert.ok(hit.direction.dot(toward)>.9,`frame ${i}: tangent ${hit.direction.toArray()} index ${hit.index}`);
  }
  assert.ok(count>hz*.5);
 }finally{x.close();}
});

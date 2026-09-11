import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {TYPES,clearSlotFx} from '../src/engine/abilities.js';

const step=1/120;
function fixture(height=80){
 const f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='vega')));
 f._openSky=true;f.flying=height>0;f.gait=height?'airborne':'grounded';f.pos.set(0,height,0);
 f.vel.set(0,0,height?50:0);f.aim.set(0,0,1);f.aim3.copy(f.aim);
 const impacts=[],g={audio:{zap(){},impact(){},boom(){}},world:{shake(){},punch(){}},vfx:{impact(p){impacts.push(p.clone());},impactStar(p){impacts.push(p.clone());}},trail(){},slowmo(){},coneFoe(){return null}};
 for(let i=0;i<120;i++)f._animate(step);
 const slot=f.slots.e;
 const tick=()=>{TYPES.melee(f,slot.def,slot,g,{dt:step});f.advanceActionPose(step);f._animate(step);};
 return {f,slot,g,impacts,tick,start(){TYPES.melee(f,slot.def,slot,g,{pressed:true,dt:step});}};
}
function gap(f){
 f.obj.updateMatrixWorld(true);
 return f.parts.armR.children[2].getWorldPosition(new THREE.Vector3()).sub(f.parts.armL.children[2].getWorldPosition(new THREE.Vector3())).dot(f.aim3);
}
test('Vega ability punch has a leading fist and guarding off hand in actual ground and flight poses',()=>{
 for(const height of [0,80]){
  const x=fixture(height);try{x.start();for(let i=0;i<14;i++)x.tick();assert.ok(gap(x.f)>1.6,`height ${height}: symmetric cast instead of punch, separation ${gap(x.f)}`);}finally{x.f.dispose();}
 }
});
test('ability punch finishes its recovery without moving the simulation root',()=>{
 const x=fixture();try{x.start();assert.ok(x.f._abilityMeleePose,'accepted punch must start presentation');const root=x.f.pos.clone();for(let i=0;i<85;i++)x.tick();assert.ok(!x.f._abilityMeleePose,'presentation must retire');assert.ok(x.f.pos.equals(root));}finally{x.f.dispose();}
});

test('stagger retires the ability hit window and pose, and zero-dt inspection does not advance its clock',()=>{
 const x=fixture();try{
  x.start();x.tick();const elapsed=x.f._abilityMeleePose.elapsed;
  x.f.advanceActionPose(0);x.f._animate(0);assert.equal(x.f._abilityMeleePose.elapsed,elapsed);
  x.f.staggerT=.3;x.f.advanceActionPose(step);assert.equal(x.slot.t,0);assert.ok(!x.f._abilityMeleePose);
 }finally{x.f.dispose();}
});
test('clearing powers cancels their active melee and the presentation together',()=>{
 const x=fixture();try{x.start();clearSlotFx(x.f);assert.equal(x.slot.t,0,'a cancelled attack must not resume dealing hits');assert.ok(!x.f._abilityMeleePose);}finally{x.f.dispose();}
});

test('native frozen update cannot bank a rush until thaw',()=>{
 const x=fixture();try{
  x.start();x.f.frozenT=1.5;
  // Freeze still uses native physics/animation; this empty world has no cover.
  Object.assign(x.g.world,{cover:[],interiors:[],ARENA:900,heightAt:()=>0});
  x.f.update(step,x.g);
  assert.equal(x.slot.t,0);assert.ok(!x.f._abilityMeleePose);
 }finally{x.f.dispose();}
});
test('legacy airborne ability impact follows the struck bodies instead of the floor',()=>{
 const x=fixture();try{
  delete x.slot.def.contact;
  const victim={id:'victim',pos:new THREE.Vector3(0,80,7),guarding:false,staggerT:0,takeDamage(){}};
  x.g.coneFoe=()=>victim;x.start();x.tick();assert.equal(x.impacts.length,1);
  assert.ok(x.impacts[0].y>80&&x.impacts[0].y<92,`impact wrongly at ${x.impacts[0].y}`);
 }finally{x.f.dispose();}
});

import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {updateMovementGears} from '../src/core/movement-gears.js';
for(const hz of [30,60,120])test(`running jump enters and exits glide through native physics at ${hz}Hz`,()=>{
 const x=mainCombatFixture({mode:'powerworld',hero:'volt'});try{
  const f=x.p,dt=1/hz;f._openSky=true;x.w.ARENA=1800;x.w.waterAt=()=>0;f.ki=120;
  const frame=()=>{updateMovementGears(f,{held:true,selectGear:2},dt);f.move({x:0,z:1},dt);f._physics(dt,x.g);};
  for(let i=0;i<hz;i++)frame();
  assert.ok(f.onFoot);assert.ok(f.vel.z>150);f.flyHeld=true;
  let glided=false,peak=0;
  for(let i=0;i<hz*2;i++){frame();glided||=f.gliding;peak=Math.max(peak,f.pos.y);assert.equal(f.flying,false);}
  assert.ok(glided,'Sprint momentum should survive ascent into glide');assert.ok(peak>4&&peak<6);
  assert.ok(f.onFoot);assert.equal(f.gliding,false);
 }finally{x.close();}
});
for(const hz of [30,60,120])test(`VOLT carries momentum without gaining altitude or speed at ${hz}Hz`,()=>{
 const x=mainCombatFixture({mode:'powerworld',hero:'volt'});try{
  const f=x.p;f._openSky=true;x.w.ARENA=1800;f.pos.y=80;f.onFoot=false;f.airT=1;f.vel.set(0,0,180);f.ki=120;f.flyHeld=true;f._physics(1/hz,x.g);
  for(let i=0;i<hz;i++){const speed=Math.hypot(f.vel.x,f.vel.z),height=f.pos.y;f.move(new THREE.Vector3(1,0,0),1/hz);f._physics(1/hz,x.g);assert.ok(Math.hypot(f.vel.x,f.vel.z)<=speed+.001);assert.ok(f.pos.y<=height);}
  assert.equal(f.flying,false);assert.equal(f.gliding,true);assert.ok(f.ki<107);assert.ok(f.pos.y>65);
  f.flyHeld=false;f._physics(1/hz,x.g);assert.equal(f.gliding,false);assert.ok(f.vel.y<-10);
 }finally{x.close();}
});
test('low speed and exhausted energy cannot sustain glide or create flight',()=>{
 const x=mainCombatFixture({mode:'powerworld',hero:'volt'});try{
  const f=x.p;f._openSky=true;f.pos.y=80;f.onFoot=false;f.airT=1;f.flyHeld=true;f.vel.set(0,-5,30);f._physics(.016,x.g);assert.equal(f.gliding,false);assert.equal(f.flying,false);
  f.vel.set(0,-5,180);f.ki=0;f._physics(.016,x.g);assert.equal(f.gliding,false);assert.equal(f.flying,false);
 }finally{x.close();}
});



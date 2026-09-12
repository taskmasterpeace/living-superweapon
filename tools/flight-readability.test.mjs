import test from 'node:test';
import assert from 'node:assert/strict';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {DTYPES} from '../src/data/damage-types.js';
import {damageSymbol} from '../src/engine/damage-symbols.js';
import {poseFlightFeet,clearFlightFeet} from '../src/engine/flight-feet.js';
import {steerFlight} from '../src/engine/flight-motion.js';
import {updateFlightSense,flightTurbulence} from '../src/engine/flight-sense.js';
import {GAIT} from '../src/core/util.js';
test('all eight damage types have distinct named and colored symbols',()=>{
 const symbols=DTYPES.map(t=>damageSymbol(t));assert.equal(new Set(symbols).size,8);
 for(const s of symbols){assert.match(s,/aria-label=/);assert.match(s,/color:#/);assert.match(s,/<path|<circle/);}
 assert.equal(damageSymbol('<bad>'),'');
});
test('flight points toes down without accumulating and restores native landing feet',()=>{
 const f=mainCombatFixture();try{
  const p=f.p;p._openSky=true;p.flying=true;p.gait=GAIT.AIRBORNE;p.pos.y=30;
  const boot=p.parts.legL.userData.boot,base=boot.quaternion.clone();
  for(let i=0;i<60;i++){clearFlightFeet(p);poseFlightFeet(p,1/60);}
  assert.ok(boot.rotation.x>.4&&boot.rotation.x<.5);
  p.flying=false;clearFlightFeet(p);poseFlightFeet(p,1/60);
  assert.ok(boot.quaternion.angleTo(base)<1e-6);
 }finally{f.close();}
});
test('boost gathers briefly then accelerates; measured high speed emits one boom per crossing',()=>{
 const f=mainCombatFixture();try{
  const p=f.p;p._openSky=true;p.flying=true;p.gait=GAIT.AIRBORNE;p.pos.y=30;p.movementGear.gear=3;
  p.vel.set(0,0,70);p.cruiseHeld=true;
  for(let i=0;i<5;i++)steerFlight(p,{z:1},200,1/60);
  assert.ok(p.vel.z<70);for(let i=0;i<40;i++)steerFlight(p,{z:1},200,1/60);
  assert.ok(p.vel.z>190);
  let booms=0;f.g.audio={...f.g.audio,boom:()=>booms++};p.vel.set(0,0,1000);
  for(let i=0;i<60;i++)updateFlightSense(p,1/60,f.g);
  assert.equal(booms,1);assert.ok(Math.abs(flightTurbulence(p,1))<.003);
  p.flying=false;assert.equal(flightTurbulence(p,1),0);
 }finally{f.close();}
});

test('reduced-motion preference suppresses flight turbulence at full speed',async()=>{
 const old=globalThis.matchMedia;
 try{
  globalThis.matchMedia=()=>({matches:true});
  const {flightTurbulence:reducedTurbulence}=await import('../src/engine/flight-sense.js?reduced-motion-test');
  assert.equal(reducedTurbulence({flying:true,alive:true,def:{speed:30},vel:{length:()=>1000}},1),0);
 }finally{globalThis.matchMedia=old;}
});

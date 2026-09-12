import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {MeleeTrial} from '../src/engine/melee-trial.js';
for(const hz of [30,60,120])test(`airborne trainer takes off through native physics and hovers at ${hz}Hz`,()=>{
 const x=mainCombatFixture({mode:'powerworld',hero:'rage'});
 try{
  const t=new MeleeTrial(x.g,new THREE.Vector3(0,0,20)),f=t.start('airborne');
  const originalPlayerTier=x.p.def.flightTier;
  for(let i=0;i<hz*5;i++){t.control(f,1/hz);f.update(1/hz,x.g);}
  assert.equal(f.flying,true);assert.ok(f.pos.y>=22&&f.pos.y<=30,`altitude ${f.pos.y}`);
  assert.equal(x.p.def.flightTier,originalPlayerTier);assert.equal(x.p.flying,false);
  const before=f.pos.clone();f.launchT=1;t.control(f,1/hz);
  assert.equal(f.flyHeld,false);assert.equal(f.descendHeld,false);assert.ok(f.pos.equals(before));
  const old=f;t.repeat();assert.equal(t.target.pos.y,0);assert.ok(!x.g.entities.includes(old));t.dispose();
 }finally{x.close();}
});

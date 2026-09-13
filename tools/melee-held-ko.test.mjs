import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {BLADES} from '../src/data/armory.js';
import {TYPES} from '../src/engine/abilities.js';

for(const row of BLADES)test(`${row.id}: KO retires swing and respawn restores held equipment`,()=>{
 const x=mainCombatFixture({hero:'merc'}),{p,g}=x;
 try{
  p._openSky=true;g.equipFrom(p,row,{primary:true});
  const st=p.slots.lmb;
  TYPES.melee(p,st.def,st,g,{pressed:true,dt:1/60});
  for(let i=0;i<5;i++)p.update(1/60,g);
  assert.ok(p._abilityMeleePose,'fixture must enter a weapon swing');
  const weapon=p._gearMesh,position=weapon.position.clone(),rotation=weapon.quaternion.clone();
  p.hp=0;p._ko();
  assert.ok(!p._abilityMeleePose,'KO must retire the old swing');
  for(let i=0;i<220;i++)p.update(1/60,g);
  assert.ok(p.alive,'native respawn must complete');
  assert.equal(p._gearMesh,weapon);
  assert.equal(weapon.parent,p.parts.armR.children[2]);
  assert.ok(weapon.position.distanceTo(position)<1e-6);
  assert.ok(weapon.quaternion.angleTo(rotation)<1e-6);
  if(row.paired||row.mesh==='claws')assert.equal(p._gearPair.parent,p.parts.armL.children[2]);
  if(weapon.userData.twoHanded){
   const hand=p.parts.armL.children[2].localToWorld(new THREE.Vector3(0,-.25,.12));
   const grip=weapon.getObjectByName('weapon-support-grip').getWorldPosition(new THREE.Vector3());
   assert.ok(hand.distanceTo(grip)<.12,'support hand must return after respawn');
  }
 }finally{x.close();}
});

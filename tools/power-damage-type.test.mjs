import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {runSlot} from '../src/engine/abilities.js';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';

// Exercise authored kits through the production handlers and Projectile class.
for (const [hero,slot,dtype] of [
  ['rime','rmb','cold'], ['torch','f','fire'], ['sol','f','fire'],
  ['rime','r','cold'], ['specter','r','fire'], ['sol','e','fire'],
]) {
  test(`${hero}.${slot}: authored ${dtype} reaches the live projectile`,()=>{
    const f=mainCombatFixture({hero});
    try {
      assert.equal(f.p.slots[slot].def.dtype,dtype);
      runSlot(f.p,slot,{pressed:true,held:true,released:false,dt:.5},f.g);
      if(f.p.slots[slot].def.type==='charge')
        runSlot(f.p,slot,{pressed:false,held:false,released:true,dt:1/60},f.g);
      assert.ok(f.g.projectiles.list.length>0,'the attack actually spawns ordnance');
      for(const shot of f.g.projectiles.list)assert.equal(shot.dtype,dtype);
    } finally {f.close();}
  });
}

function splashLoss(dtype,immunity) {
  const f=mainCombatFixture();
  try {
    const target=f.foe({y:80,z:30});
    if(immunity)target.resist[immunity]=0;
    const before=target.hp;
    const shot=f.g.projectiles.spawnProjectile(f.p,{
      pos:new THREE.Vector3(0,85,30),vel:new THREE.Vector3(0,0,1),
      damage:30,blast:8,dtype,color:'#ffb03a',
    });
    shot._impact(f.g,false);
    assert.equal(shot.dead,true,'impact retires the projectile');
    return before-target.hp;
  } finally {f.close();}
}

for(const dtype of ['fire','cold'])test(`${dtype} explosion respects matching resistance`,()=>{
  assert.ok(splashLoss(dtype,null)>0,'ordinary victim receives real splash damage');
  assert.equal(splashLoss(dtype,dtype),0,'immune victim rejects the typed splash');
  assert.ok(splashLoss(undefined,dtype)>0,'elemental immunity must not reject untyped damage');
});

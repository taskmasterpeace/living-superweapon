import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {TYPES,clearSlotFx} from '../src/engine/abilities.js';
import {Fighter} from '../src/engine/entity.js';

// Production ability state machines and real charge geometry; only sound/world
// services are silent. These tests measure the energy ledger, not rendered pixels.
function fixture(type,ki=60,infinite=false){
  const def={type,cost:20,cd:.8,charge:true,maxCharge:2,kiPerSec:12,kiChargePerSec:12,color:'#ffba38'};
  const st={def,cd:0},shots=[];
  const c={ki,maxKi:100,energyInfinite:infinite,hitstop:0,staggerT:0,stunT:0,vel:new THREE.Vector3(),aim3:new THREE.Vector3(0,0,1),slots:{lmb:st},
    spendKi:Fighter.prototype.spendKi,muzzle:(out)=>out.set(0,5,0)};
  const g={scene:new THREE.Scene(),audio:{charge:()=>null,kiRelease(){}},world:{punch(){},shake(){}},vfx:{flash(){},ring(){},lightning(){}},chargeGather(){},
    spawnBeamFor:(...args)=>{shots.push(args);return {end(){}};},projectiles:{spawnProjectile:(...args)=>shots.push(args)},onDrained:()=>g.drains++ ,drains:0};
  c._game=g;
  const step=(input,dt=1/60)=>TYPES[type](c,def,st,g,{pressed:false,held:false,released:false,dt,...input});
  return {c,def,st,g,shots,step,clear:()=>clearSlotFx(c)};
}
for(const type of ['beam','charge']){
  test(`${type}: entry cost paid once, separately from charge energy`,()=>{
    const f=fixture(type);try{
      f.step({pressed:true,held:true},.5);
      assert.equal(f.c.ki,34,'20 entry + 6 build energy paid before release');
      f.step({released:true});
      assert.equal(f.c.ki,34,'release cannot bill the entry cost twice');
      assert.equal(f.shots.length,1);
    }finally{f.clear();}
  });
  test(`${type}: depleted charge releases current paid strength without overdraft`,()=>{
    const f=fixture(type,27);try{
      f.step({pressed:true,held:true},.5);assert.equal(f.c.ki,1);
      f.step({held:true},.5);
      assert.equal(f.c.ki,1);assert.equal(f.g.drains,1);assert.equal(f.shots.length,1);assert.equal(f.st.charging,false);
      f.step({released:true});assert.equal(f.shots.length,1);assert.equal(f.c.ki,1);
    }finally{f.clear();}
  });
  test(`${type}: infinite-energy core never pays charge entry`,()=>{
    const f=fixture(type,60,true);try{
      f.step({pressed:true,held:true},.5);f.step({released:true});
      assert.equal(f.c.ki,60);assert.equal(f.shots.length,1);
    }finally{f.clear();}
  });
  test(`${type}: charge ledger agrees at 30/60/120 Hz and survives an external ki drain`,()=>{
    for(const hz of [30,60,120]){
      const f=fixture(type);try{
        for(let i=0;i<hz/2;i++)f.step({pressed:i===0,held:true},1/hz);
        assert.ok(Math.abs(f.c.ki-34)<1e-8,`${hz} Hz: one entry plus half-second charge`);
        f.c.ki=0; // A hostile siphon may empty the pool after entry has been paid.
        f.step({released:true},1/hz);
        assert.equal(f.c.ki,0);assert.equal(f.shots.length,1);
      }finally{f.clear();}
    }
  });
}
test('under-minimum charged shot refunds only its entry fee',()=>{
  const f=fixture('charge');try{
    f.step({pressed:true,held:true},.1);f.step({released:true});
    assert.ok(Math.abs(f.c.ki-58.8)<1e-9);assert.equal(f.shots.length,0);
    f.step({released:true});assert.ok(Math.abs(f.c.ki-58.8)<1e-9,'no repeated refund');
  }finally{f.clear();}
});
test('a denied press cannot start or pay for a charge',()=>{
  for(const type of ['beam','charge']){const f=fixture(type,19);f.step({pressed:true,held:true});assert.equal(f.c.ki,19);assert.equal(f.shots.length,0);assert.equal(f.st.charging,undefined);}
});

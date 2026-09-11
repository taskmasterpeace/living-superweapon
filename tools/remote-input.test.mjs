import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {runSlot,clearSlotFx} from '../src/engine/abilities.js';
import {Fighter} from '../src/engine/entity.js';
import {Game} from '../src/engine/game.js';
import {Projectiles} from '../src/engine/projectiles.js';

function fixture(type,extra={}){
  const def={type,cost:10,cd:.7,color:'#ffba38',remoteDetonate:true,...extra};
  const st={def,cd:0},damage=[];
  const c={def:{},team:1,alive:true,ki:100,maxKi:100,powerBuff:1,hitstop:0,staggerT:0,stunT:0,
    pos:new THREE.Vector3(0,80,0),vel:new THREE.Vector3(),aim:new THREE.Vector3(0,0,1),aim3:new THREE.Vector3(0,0,1),
    slots:{lmb:st},spendKi:Fighter.prototype.spendKi,muzzle:out=>out.set(0,85,3)};
  const noop=()=>{};
  const g={scene:new THREE.Scene(),time:0,entities:[],particles:{spawn:noop,burst:noop},world:{cover:[],punch:noop,shake:noop},
    audio:{charge:()=>null,boom:noop,kiRelease:noop,zap:noop},
    vfx:{borrowLight:()=>new THREE.PointLight(),returnLight:noop,explode:noop,flash:noop,ring:noop,lightning:noop},
    muzzleFlash:noop,chargeGather:noop,onDrained:noop,onNoKi:()=>g.denied++,denied:0,
    areaDamage:(...args)=>damage.push(args),spawnBeamFor:Game.prototype.spawnBeamFor};
  c._game=g;g.projectiles=new Projectiles(g);
  const step=(input,dt=1/60)=>runSlot(c,'lmb',{pressed:false,held:false,released:false,dt,...input},g);
  const launch=()=>{step({pressed:true,held:true},.5);if(type==='charge'||def.charge)step({released:true});};
  const close=()=>{clearSlotFx(c);for(const shot of g.projectiles.list)shot._dispose(g);};
  return {c,st,g,damage,step,launch,close};
}

for(const [type,extra] of [['projectile',{}],['charge',{}],['beam',{}],['beam',{charge:true}]]){
  test(`${type}${extra.charge?' charged':''}: second press detonates the owned live shot even with no launch energy`,()=>{
    const f=fixture(type,extra);try{
      f.launch();assert.equal(f.g.projectiles.list.length,1);
      const shot=f.g.projectiles.list[0];f.c.ki=0;f.st.cd=0;
      f.step({pressed:true,held:true});
      assert.equal(shot.dead,true);assert.equal(f.damage.length,1);
      assert.equal(f.c.ki,0);assert.equal(f.g.denied,0,'detonation is not an unaffordable launch');
      assert.equal(!!f.st.charging,false);assert.equal(f.g.projectiles.list.length,1,'must not also launch a replacement');
    }finally{f.close();}
  });
}

test('remote uncharged beam persists through release; ordinary held beam still ends',()=>{
  for(const remoteDetonate of [true,false]){
    const f=fixture('beam',{remoteDetonate});try{
      f.launch();const beam=f.st.active;f.step({released:true});
      assert.equal(beam.sustaining,remoteDetonate);
    }finally{f.close();}
  }
});

for(const type of ['projectile','charge'])test(`${type}: shared second press emits authored children, not a new paid parent`,()=>{
  const f=fixture(type,{splitCount:4,splitSpeed:120,splitHoming:2,splitSpread:.4});try{
    f.launch();const parent=f.st.remoteShot;assert.equal(parent.splitCount,4);
    f.c.ki=0;f.step({pressed:true});
    const children=f.g.projectiles.list.filter(p=>!p.dead);
    assert.equal(children.length,4);assert.equal(f.damage.length,0);assert.equal(f.g.denied,0);assert.equal(f.st.remoteShot,null);
    assert.ok(Math.abs(children.reduce((sum,p)=>sum+p.damage,0)-parent.damage)<1e-8);
    for(const child of children){assert.equal(child.homing,2);assert.ok(Math.abs(child.vel.length()-120)<1e-8);}
  }finally{f.close();}
});

test('split settings alone cannot silently enable remote behavior on a shipped ordinary projectile',()=>{
  const f=fixture('projectile',{remoteDetonate:false,splitCount:4});try{
    f.launch();assert.equal(f.g.projectiles.list[0].splitCount,0);assert.equal(f.st.remoteShot,undefined);
  }finally{f.close();}
});

test('deflection revokes the old owner’s remote control without deleting the reflected shot',()=>{
  const f=fixture('projectile');try{
    f.launch();const shot=f.g.projectiles.list[0];shot.caster={team:2};shot.team=2;f.st.cd=0;f.c.ki=0;
    f.step({pressed:true});assert.equal(shot.dead,false);assert.equal(f.damage.length,0);assert.equal(f.g.denied,1);
    assert.equal(f.st.remoteShot,null);
  }finally{f.close();}
});

test('cleanup revokes remote control; a later stray press cannot detonate a previous life’s projectile',()=>{
  const f=fixture('projectile');try{
    f.launch();const shot=f.g.projectiles.list[0];clearSlotFx(f.c);f.c.ki=0;f.st.cd=0;
    f.step({pressed:true});assert.equal(shot.dead,false);assert.equal(f.damage.length,0);assert.equal(f.st.remoteShot,null);
  }finally{f.close();}
});

test('authored beam detonation grows with real charge power in the production spawn helper',()=>{
  const f=fixture('beam',{detonateRadius:14,detonateDamage:50});try{
    const beam=f.g.spawnBeamFor(f.c,f.st.def,2);
    assert.equal(beam.detonateRadius,28);assert.equal(beam.detonateDamage,100);
  }finally{f.close();}
});

for(const interruption of ['frozenT','stunT','staggerT','grabbedBy'])test(`remote beam interruption (${interruption}) stops new emission and payment`,()=>{
  const f=fixture('beam');try{
    f.launch();const beam=f.st.active,ki=f.c.ki,age=beam.emissionAge;
    f.c[interruption]=1;
    beam.update(1/60,f.g);
    assert.equal(beam.sustaining,false);assert.equal(f.c.ki,ki);assert.equal(beam.emissionAge,age);
    assert.equal(beam.dead,false,'already emitted energy fades through its production stream lifecycle');
    f.c[interruption]=0;beam.update(1/60,f.g);
    assert.equal(beam.sustaining,false,'recovery must not restart the interrupted emitter');
  }finally{f.close();}
});

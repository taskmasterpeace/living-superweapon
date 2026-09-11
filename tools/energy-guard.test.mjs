import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {selectHitFeedback} from '../src/engine/hit-feedback.js';

function fixture({energy=100,infinite=false,strong=false,openSky=true}={}){
 const def=structuredClone(ROSTER.find(d=>d.id==='kano'));
 Object.assign(def,{guardType:'block',guardStrong:strong,energyInfinite:infinite});
 const f=new Fighter(def);f._openSky=openSky;f.hp=f.maxHp=1000;f.ki=energy;f.maxKi=100;
 f.armor=0;f._shieldHp=0;f.resist={kinetic:1,energy:1,fire:1};f.guarding=true;f.faceDir(0,1);
 const src={pos:new Vector3(0,0,20),aim:new Vector3(0,0,-1)};
 return {f,hit:(damage,opts={})=>f.takeDamage(damage,{src,dtype:'energy',hitstop:0,...opts}),close:()=>f.dispose()};
}
for(const hz of [30,60,120])test(`funded sustained guard protects all HP at ${hz} Hz`,()=>{
 const x=fixture();try{for(let i=0;i<hz;i++)x.hit(60/hz,{dot:true,beamDelta:1/hz});
  assert.equal(x.f.hp,1000);assert.ok(Math.abs(x.f.ki-40)<1e-7);assert.ok(Math.abs(x.f.guardMeter-.72)<1e-7);assert.equal(x.f.guarding,true);
 }finally{x.close();}
});
test('energy exhaustion admits only the unpaid portion and breaks guard',()=>{
 const x=fixture({energy:12});try{assert.equal(x.hit(30),18);assert.equal(x.f.ki,0);assert.equal(x.f.hp,982);assert.equal(x.f.guarding,false);assert.ok(x.f.guardBreakT>0);}finally{x.close();}
});
test('exact final energy pays the hit completely, then opens the guard',()=>{
 const x=fixture({energy:30});try{assert.equal(x.hit(30),0);assert.equal(x.f.hp,1000);assert.equal(x.f.ki,0);assert.equal(x.f.guarding,false);}finally{x.close();}
});
test('guard crush opens a funded defender without secretly bypassing energy',()=>{
 const x=fixture();try{assert.equal(x.hit(30,{strike:true,guardCrush:true}),0);assert.equal(x.f.hp,1000);assert.equal(x.f.ki,70);assert.equal(x.f.guarding,false);assert.equal(x.f.guardBreakT,.85);}finally{x.close();}
});
test('strong shields improve energy economy instead of allowing chip',()=>{
 const x=fixture({strong:true});try{assert.equal(x.hit(40,{strike:true}),0);assert.equal(x.f.hp,1000);assert.equal(x.f.ki,78);}finally{x.close();}
});

for(const pool of ['armor','shield'])test(`funded guard spends energy before the personal ${pool} pool`,()=>{
 const x=fixture();try{
  x.f.armor=pool==='armor'?100:0;x.f._shieldHp=pool==='shield'?100:0;
  x.hit(20);assert.equal(x.f.ki,80);assert.equal(x.f.hp,1000);
  assert.equal(pool==='armor'?x.f.armor:x.f._shieldHp,100);
 }finally{x.close();}
});

for(const pool of ['armor','shield'])test(`only unpaid guard overflow reaches personal ${pool}, then breaks the guard once`,()=>{
 const x=fixture({energy:5});try{
  x.f.armor=pool==='armor'?100:0;x.f._shieldHp=pool==='shield'?100:0;
  const dealt=x.hit(20);assert.equal(x.f.ki,0);assert.equal(x.f.guarding,false);assert.ok(x.f.guardBreakT>0);
  assert.equal(pool==='armor'?x.f.armor:x.f._shieldHp,pool==='armor'?91.75:85);
  assert.equal(dealt,pool==='armor'?6.75:0);assert.equal(x.f.hp,1000-dealt);
 }finally{x.close();}
});

test('authored beam efficiency changes the energy bill and unpaid overflow, not incoming damage',()=>{
 const x=fixture({energy:12});try{
  x.f.def.guardEnergy={beam:2,melee:.5};
  x.hit(10,{dot:true,beamDelta:1/60});
  assert.equal(x.f.ki,0);assert.equal(x.f.hp,996);
 }finally{x.close();}
});
test('infinite core cannot be drained but still has a breakable guard meter',()=>{
 const x=fixture({infinite:true});try{for(let i=0;i<5;i++){x.f.hitstop=0;x.hit(20);}assert.equal(x.f.hp,1000);assert.equal(x.f.ki,100);assert.equal(x.f.guarding,false);}finally{x.close();}
});
test('rear hits and unblockable grabs bypass the energy shield',()=>{
 for(const opts of [{src:{pos:new Vector3(0,0,-20)}},{unblockable:true}]){const x=fixture();try{x.hit(30,opts);assert.equal(x.f.hp,970);assert.equal(x.f.ki,100);}finally{x.close();}}
});
test('legacy city chip rules remain explicit outside PowerWorld',()=>{
 const x=fixture({openSky:false});try{x.hit(30,{strike:true});assert.ok(Math.abs(x.f.hp-996.4)<1e-8);assert.equal(x.f.ki,100);}finally{x.close();}
});
test('PowerWorld grounded actors get the same funded guard without granting flight',()=>{
 const x=fixture({openSky:false});try{x.f._game={modeId:'powerworld',onHit(){}};x.hit(20);assert.equal(x.f.hp,1000);assert.equal(x.f.ki,80);assert.equal(x.f._openSky,false);}finally{x.close();}
});
test('block feedback names energy spent and reports only unpaid health loss',()=>{
 const x=fixture({energy:12});try{let outcome;x.f._game={onHit(_f,_a,_o,_b,r){outcome=r;}};x.hit(30);
  assert.equal(outcome.guardEnergySpent,12);assert.equal(outcome.guardAbsorbed,12);assert.equal(outcome.healthLost,18);
  assert.equal(selectHitFeedback(outcome).label,'GUARD BROKEN · 12 ENERGY · 18 HP');
 }finally{x.close();}
});
for(const openSky of [true,false])test(`blocked pressure suppresses ordinary energy regeneration for ${openSky?'flying':'grounded'} PowerWorld actors`,()=>{
 const x=fixture({openSky});try{if(!openSky)x.f._game={modeId:'powerworld',onHit(){}};x.hit(60);const paid=x.f.ki;
  x.f.regenerateKi(1/60);assert.equal(x.f.ki,paid);
  x.f._blocked=0;x.f.regenerateKi(1/60);assert.ok(x.f.ki>paid,'quiet recovery still works');
 }finally{x.close();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {pairedCombatFixture} from './helpers/paired-combat-fixture.mjs';
import {runSlot,cancelHeldAttacks} from '../src/engine/abilities.js';

function fixture({first='two-hand',second='palm',charge=false,motion='hover',order='normal'}={}){
 const x=pairedCombatFixture({motion}),{f,g}=x;
 f.energyInfinite=false;f.ki=500;f.maxKi=500;f.level=10;
 Object.assign(f.slots.lmb.def,{faceOrigin:false,castStyle:first,cost:7});
 Object.assign(f.slots.rmb.def,{castStyle:second,cost:11,charge});
 if(order==='reverse')f.slots=Object.fromEntries(Object.entries(f.slots).reverse());
 const input=(key,pressed,held,released=false)=>runSlot(f,key,{pressed,held,released,dt:x.dt},g);
 return {...x,input,start:key=>input(key,true,true),stop:key=>input(key,false,false,true)};
}

// Catch slot-order pose theft: a later power cannot acquire an already used hand,
// pay for an invisible stream, or strand the earlier two-hand beam in preparation.
for(const first of ['two-hand','palm'])for(const order of ['normal','reverse'])
test(`first hand cast keeps its emitter and denies unpaid conflict: ${first}, ${order}`,()=>{
 const x=fixture({first,second:first==='palm'?'two-hand':'palm',order});
 try{
  x.start('lmb');const owner=x.f.slots.lmb.active,paid=x.f.ki,position=x.f.pos.clone(),velocity=x.f.vel.clone();
  x.start('rmb');
  assert.ok(!x.f.slots.rmb.active,'A conflicting hand power was created');
  assert.equal(x.f.ki,paid,'The denied hand cast spent energy');
  assert.equal(x.f.slots.rmb.cd,0,'The denied cast started its cooldown');
  assert.equal(x.f.slots.rmb._handsBusy,true,'A denied cast must explain the occupied hands');
  for(let i=0;i<45;i++)x.step();
  assert.ok(owner.emissionAge>0&&!owner.pendingLaunch,'The original beam lost its pose');
  assert.ok(x.f.pos.distanceTo(position)<1e-8&&x.f.vel.distanceTo(velocity)<1e-8,'Contention changed movement');
 }finally{x.close();}
});

test('occupied hands cannot start a paid charge or gathering effect',()=>{
 const x=fixture({charge:true});
 try{x.start('lmb');const paid=x.f.ki;x.start('rmb');
  assert.ok(!x.f.slots.rmb.charging,'A conflicting charge was started');
  assert.ok(!x.f.slots.rmb.orb&&!x.f.slots.rmb.sfx,'Denied charge created gathering effects');
  assert.equal(x.f.ki,paid);
 }finally{x.close();}
});

test('a denied beam does not queue a surprise shot when the owner releases',()=>{
 const x=fixture();
 try{x.start('lmb');x.start('rmb');x.stop('lmb');
  for(let i=0;i<30;i++){x.input('rmb',false,true);x.step();}
  assert.ok(!x.f.slots.rmb.active,'Denied press was silently replayed');
  x.stop('rmb');x.start('rmb');for(let i=0;i<30;i++)x.step();
  assert.ok(x.f.slots.rmb.active?.emissionAge>0,'A fresh press did not acquire the free hands');
 }finally{x.close();}
});

test('focus cancellation releases held hands and clears denial feedback',()=>{
 const x=fixture();
 try{x.start('lmb');x.start('rmb');cancelHeldAttacks(x.f);
  assert.ok(!x.f.slots.rmb._handsBusy,'Focus cancellation left stale occupied-hands feedback');
  x.start('rmb');for(let i=0;i<30;i++)x.step();
  assert.ok(x.f.slots.rmb.active?.emissionAge>0);
 }finally{x.close();}
});

for(const origin of ['faceOrigin','chest'])test(`${origin} is not locked out by occupied hands`,()=>{
 const x=fixture();
 try{x.f.slots.rmb.def[origin]=true;x.start('lmb');x.start('rmb');
  assert.ok(x.f.slots.lmb.active&&x.f.slots.rmb.active,'Separate anatomy was globally locked out');
  for(let i=0;i<60;i++)x.step();
  assert.ok(x.f.slots.lmb.active.emissionAge>0&&x.f.slots.rmb.active.emissionAge>0);
 }finally{x.close();}
});

for(const type of ['projectile','volley','rifle'])test(`a ${type} cannot fire from a hand sustaining a beam`,()=>{
 const x=fixture();
 try{Object.assign(x.f.slots.rmb.def,{type,handPattern:'right'});x.start('lmb');
  const paid=x.f.ki,count=x.g.projectiles.list.length;x.start('rmb');
  assert.equal(x.g.projectiles.list.length,count,'A conflicting physical attack was emitted');
  assert.equal(x.f.ki,paid);
 }finally{x.close();}
});

test('a charging attack reserves its hands before the hose exists',()=>{
 const x=fixture();
 try{x.f.slots.lmb.def.charge=true;x.start('lmb');const paid=x.f.ki;x.start('rmb');
  assert.ok(x.f.slots.lmb.charging&&!x.f.slots.rmb.active);
  assert.equal(x.f.ki,paid);x.stop('lmb');
  for(let i=0;i<60;i++)x.step();
  assert.ok(x.f.slots.lmb.active?.emissionAge>0,'The accepted charge could not release while a conflicting trigger was denied');
 }finally{x.close();}
});

test('released beam tails do not keep claiming the hands',()=>{
 const x=fixture();
 try{x.start('lmb');for(let i=0;i<40;i++)x.step();const tail=x.f.slots.lmb.active;x.stop('lmb');
  assert.ok(!tail.dead&&!tail.sustaining);x.start('rmb');
  assert.ok(x.f.slots.rmb.active,'A detached traveling tail locked the hand');
 }finally{x.close();}
});

test('canceling a charge releases both its preparation and stale recent-cast claim',()=>{
 const x=fixture();
 try{x.f.slots.lmb.def.type='charge';x.start('lmb');cancelHeldAttacks(x.f);x.start('rmb');
  assert.ok(x.f.slots.rmb.active,'A canceled preparation retained a hidden hand reservation');
 }finally{x.close();}
});

test('left-only volley remains available during a right-palm sustain',()=>{
 const x=fixture({first:'palm'});
 try{Object.assign(x.f.slots.rmb.def,{type:'volley',handPattern:'left'});x.start('lmb');const paid=x.f.ki;x.start('rmb');
  assert.ok(x.f.ki<paid&&x.g.projectiles.list.length===2,'A free left hand was treated as occupied');
  // This asserts admission only. Separate left/right articulation is not yet
  // covered by this repair and must not be inferred from a paid projectile.
 }finally{x.close();}
});

for(const type of ['volley','rifle'])test(`denied ${type} requires a fresh trigger after the hand becomes free`,()=>{
 const x=fixture();
 try{Object.assign(x.f.slots.rmb.def,{type,handPattern:'right'});x.start('lmb');x.start('rmb');x.stop('lmb');const paid=x.f.ki;
  for(let i=0;i<30;i++){x.input('rmb',false,true);x.step();}
  assert.equal(x.f.ki,paid,'An automatic weapon replayed the denied trigger after the hand became free');
  assert.ok(x.f.slots.rmb._handsRetry,'The UI cannot explain why the held trigger needs a release');
  x.stop('rmb');x.start('rmb');assert.ok(x.f.ki<paid,'Fresh trigger could not fire');
 }finally{x.close();}
});

test('free zero-recovery projectile still owns its emitting hand for its actual release pose',()=>{
 const x=fixture();
 try{Object.assign(x.f.slots.lmb.def,{type:'projectile',cost:0,cd:0});x.start('lmb');const paid=x.f.ki;x.start('rmb');
  assert.ok(!x.f.slots.rmb.active,'Free projectile release was overwritten by a same-hand beam');assert.equal(x.f.ki,paid);
 }finally{x.close();}
});

test('a combined press/release cannot sneak a new projectile through an occupied hand',()=>{
 const x=fixture();
 try{x.f.slots.rmb.def.type='projectile';x.start('lmb');const count=x.g.projectiles.list.length,paid=x.f.ki;
  x.input('rmb',true,false,true);
  assert.equal(x.g.projectiles.list.length,count,'Combined input bypassed hand ownership');assert.equal(x.f.ki,paid);
 }finally{x.close();}
});

for(const type of ['volley','rifle'])test(`suppressed input is not a physical release of a denied ${type}`,()=>{
 const x=fixture();
 try{Object.assign(x.f.slots.rmb.def,{type,handPattern:'right'});x.start('lmb');x.start('rmb');x.stop('lmb');const paid=x.f.ki;
  x.input('rmb',false,false,false); // Busy control frames suppress all flags.
  x.input('rmb',false,true,false);
  assert.equal(x.f.ki,paid,'Combat suppression was mistaken for releasing and retrying the trigger');
 }finally{x.close();}
});

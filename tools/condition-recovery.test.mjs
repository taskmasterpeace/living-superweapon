import test from 'node:test';
import assert from 'node:assert/strict';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {playerStatus} from '../src/engine/player-status.js';
import {runSlot} from '../src/engine/abilities.js';

const tick=(f,seconds)=>{for(let t=0;t<seconds;t+=1/60)f.p.update(1/60,f.g);};
const effect=(p,id)=>playerStatus(p).effects.find(e=>e.id===id);

test('bleeding acquired by physical trauma clots after the advertised stillness',()=>{
 const f=mainCombatFixture();try{
  const p=f.p;p.invuln=0;p.armor=0;p.resist.physical=1;
  p.takeDamage(22,{src:f.foe(),dtype:'physical',unblockable:true,hitstop:0});
  assert.ok(effect(p,'bleeding'));
  p.vel.set(0,0,0);tick(f,2);
  assert.ok(effect(p,'bleeding'));assert.match(effect(p,'bleeding').hint,/Clotting/);
  tick(f,2.2);assert.equal(effect(p,'bleeding'),undefined);
 }finally{f.close();}
});

for(const hero of ['sol','titan'])test(`${hero}: shock expiry clears the HUD and restores casting`,()=>{
 const f=mainCombatFixture({hero});try{
  const p=f.p;p.invuln=0;p.addShock(1,f.foe());
  const seconds=effect(p,'shock').remaining;
  assert.ok(seconds>0);
  tick(f,seconds+.25);
  assert.equal(effect(p,'shock'),undefined);assert.ok(p.staggerT<=0);
  const key=Object.keys(p.slots).find(k=>['rifle','projectile','volley'].includes(p.slots[k].def.type));
  assert.ok(key);runSlot(p,key,{pressed:true,held:true,released:false,dt:.1},f.g);
  assert.ok(f.g.projectiles.list.length>0);
 }finally{f.close();}
});

test('sleep immediately prevents a new attack and subsequent damage wakes the player',()=>{
 const f=mainCombatFixture();try{
  const p=f.p;p.invuln=0;p.addSleep(4,f.foe());
  runSlot(p,'e',{pressed:true,held:true,released:false,dt:.1},f.g);
  assert.equal(f.g.projectiles.list.length,0,'sleep must prevent casting on its application frame');
  tick(f,.2);p.takeDamage(2,{dtype:'energy',unblockable:true,hitstop:0});
  assert.equal(effect(p,'sleep'),undefined);
  p.addSleep(4,f.g.entities[1]);assert.equal(p.sleepT,0,'waking grants a respite from sleep');
 }finally{f.close();}
});

test('a lethal DoT clears multiple active conditions without invalidating the update loop',()=>{
 const f=mainCombatFixture();try{
  const p=f.p;p.hp=1;p.invuln=0;p.armor=0;
  p.addDot({kind:'poison',dps:100,dur:3,src:f.foe()});
  p.addDot({kind:'burn',dps:100,dur:3,src:f.g.entities[1]});
  for(const d of p._dots){d._tick=.49;d._acc=100;}
  assert.doesNotThrow(()=>p.update(1/60,f.g));
  assert.equal(p.state,'ko');assert.equal(p._dots.length,0);
  assert.ok(!playerStatus(p).effects.some(e=>e.id.startsWith('dot-')));
 }finally{f.close();}
});

test('natural thaw clears the freeze label and grants the promised refreeze immunity',()=>{
 const f=mainCombatFixture();try{
  const p=f.p;p.invuln=0;p.addFrost(.4,f.foe());
  assert.ok(effect(p,'frost'));p.addFrost(3,f.g.entities[1]);
  assert.ok(effect(p,'frozen'));assert.equal(effect(p,'frost'),undefined);
  const time=p.frozenT/p.sheet.ccRecover;tick(f,time+.05);
  assert.equal(effect(p,'frozen'),undefined);
  assert.ok(p._frostImmuneT>2,'natural thaw must grant the same respite as shattering');
  p.invuln=0;p.addFrost(1,f.g.entities[1]);assert.equal(p.frozenT,0);
 }finally{f.close();}
});

test('a real burst hit and energy-exhausted block produce distinct HUD conditions and recover',()=>{
 for(const guarded of [false,true]){
  const f=mainCombatFixture();try{
   const p=f.p,foe=f.foe({z:12});p.invuln=0;p.armor=0;p._openSky=true;
   p.faceDir(0,1);p.guarding=guarded;if(guarded)p.ki=1;
   p.takeDamage(guarded?12:p.maxHp*.3,{src:foe,dtype:'energy',hitstop:0});
   const id=guarded?'guard-break':'stun';assert.ok(effect(p,id));
   const seconds=effect(p,id).remaining;tick(f,seconds+.2);assert.equal(effect(p,id),undefined);
  }finally{f.close();}
 }
});

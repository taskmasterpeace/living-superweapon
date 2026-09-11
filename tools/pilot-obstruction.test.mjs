import test from 'node:test';
import assert from 'node:assert/strict';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {runSlot} from '../src/engine/abilities.js';

// Real pilot handlers and damage, with an unchanged receiver and a single solid
// wall added in the blocked comparison. No threshold relaxation or fake handler.
for(const [hero,slot] of [['vanguard','q'],['apex','q']]) {
 function fire({blocked=false,phase=false,guarding=false,resistance=1}={}){
  const x=mainCombatFixture({hero});
  try {
   const f=x.foe({z:18});f.invuln=0;x.p.hp=x.p.maxHp/2;
   f.phase=phase;f.resist.energy=resistance;
   if(guarding){f.guarding=true;f.aim.set(0,0,-1);}
   if(blocked)x.w.cover.push({x:0,z:9,hx:8,hz:1,top:30,h:30});
   assert.equal(x.g.canSee(x.p,f),!blocked,'fixture wall must actually block line of sight');
   const hp=f.hp,own=x.p.hp;
   runSlot(x.p,slot,{pressed:true,held:true,released:false,dt:.1},x.g);
   return{loss:hp-f.hp,heal:x.p.hp-own,speed:f.vel.length()};
  }finally{x.close();}
 }
 test(`${hero}.${slot} reaches an unobstructed enemy`,()=>assert.ok(fire().loss>0));
 test(`${hero}.${slot} cannot damage, siphon or shove through solid cover`,()=>assert.deepEqual(fire({blocked:true}),{loss:0,heal:0,speed:0}));
 test(`${hero}.${slot} respects phase, frontal guard, and energy resistance after an open contact`,()=>{
  const open=fire(),phased=fire({phase:true}),guarded=fire({guarding:true}),resisted=fire({resistance:.5});
  assert.deepEqual(phased,{loss:0,heal:0,speed:0});
  assert.ok(guarded.loss>0&&guarded.loss<open.loss,'guard must use native sustained-contact chip');
  assert.ok(resisted.loss>0&&resisted.loss<open.loss,'energy resistance must scale admitted damage');
  if(hero==='apex'){
   assert.ok(guarded.heal>0&&guarded.heal<open.heal,'Consume healing must follow admitted guarded damage');
   assert.ok(resisted.heal>0&&resisted.heal<open.heal,'Consume healing must follow resisted damage');
  }
 });
}

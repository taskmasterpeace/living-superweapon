import test from 'node:test';import assert from 'node:assert/strict';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {runSlot,cancelHeldSlot,clearSlotFx} from '../src/engine/abilities.js';
for(const reason of ['cancel','staggerT','stunT','frozenT','grabbedBy','sleepT','downedT','ko'])test(`bow ${reason}: cancellation releases string, hidden gear and sustain immediately`,()=>{
 const x=mainCombatFixture({hero:'gale'}),{p,g}=x;let stops=0;
 try{
  p._openSky=true;g.audio={...g.audio,sustain:()=>({set(){},stop(){stops++;}}),bowLoose(){}};
  const [key,st]=Object.entries(p.slots).find(([,s])=>s.def.type==='bow');
  for(let i=0;i<25;i++){runSlot(p,key,{pressed:i===0,held:true,dt:1/60},g);p.update(1/60,g);}
  const hand=p.parts.armR.children[2],knife=hand.children.find(o=>o.userData.weaponKind==='knife');
  assert.equal(knife.visible,false);assert.ok(st.drawing);assert.ok(p._bowDraw>.1);
  if(reason==='cancel')cancelHeldSlot(p,key);
  else if(reason==='ko')p._ko();
  else{p[reason]=1;runSlot(p,key,{held:true,dt:1/60},g);}
  assert.ok(p._bowEquipment===null,'cleanup cannot wait for another rendered frame');
  assert.equal(p._bowDraw,0);assert.equal(st.drawing,false);assert.equal(knife.visible,true);assert.equal(stops,1);
  clearSlotFx(p);assert.equal(stops,1,'repeat cleanup must not stop the same sustain twice');
  if(reason!=='ko'){
   if(reason!=='cancel')p[reason]=0;
   runSlot(p,key,{released:true,dt:1/60},g);
   assert.equal(g.projectiles.list.filter(s=>s.arrow).length,0,'cancelled draw cannot fire after recovery');
  }
 }finally{x.close();}
});



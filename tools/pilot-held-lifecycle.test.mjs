import test from 'node:test';
import assert from 'node:assert/strict';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {clearSlotFx,runSlot} from '../src/engine/abilities.js';

const DT=.1;
const PILOTS=[
 ['apex','Consume','drain'],
 ['vanguard','Thunderclap','fire'],
];
const INTERRUPTS=['staggerT','stunT','frozenT','grabbedBy','sleepT','downedT'];

function fixture(hero){
 const x=mainCombatFixture({hero}),target=x.foe({z:18}),events=[];
 x.p.hp=x.p.maxHp/2;target.invuln=0;x.g.hardLock=target;
 const base=x.g.audio;
 x.g.audio={...base,sustain(kind){
  const voice={kind,stopped:false,set(){},stop(){if(this.stopped)return;this.stopped=true;events.push(['stop',kind]);}};
  events.push(['start',kind]);return voice;
 }};
 const effects=()=>({hp:target.hp,heal:x.p.hp,velocity:target.vel.clone()});
 const unchanged=(before,label)=>{
  assert.equal(target.hp,before.hp,`${label}: interrupted attack dealt damage`);
  assert.equal(x.p.hp,before.heal,`${label}: interrupted attack healed its owner`);
  assert.deepEqual(target.vel.toArray(),before.velocity.toArray(),`${label}: interrupted attack shoved its receiver`);
 };
 const holdHuman=()=>{
  x.g.input.keys.add('KeyQ');x.control(DT);x.g.input.endFrame();
 };
 const releaseHuman=()=>{
  x.g.input.keys.delete('KeyQ');x.g.input.justReleased.add('KeyQ');x.control(DT);x.g.input.endFrame();
 };
 const pressHuman=()=>{
  x.g.input.keys.add('KeyQ');x.g.input.justPressed.add('KeyQ');x.control(DT);x.g.input.endFrame();
 };
 const holdBot=()=>{
  x.p.ai={style:'artillery',seeRange:100,reflex:.2,observeThreat:()=>false,intent:()=>({
   move:{x:0,z:0},aimDir:{x:0,z:1},aimAt:{x:0,y:0,z:18},target,ready:true,fly:false,
   slots:{q:{pressed:false,held:true,released:false}},
  })};
  x.g.controlBot(x.p,DT);
 };
 const holdPad=()=>{
  x.pad.active=true;x.pad.prev={q:true};x.pad.cur={q:true};x.g.controlPad(x.p,DT);
 };
 return {...x,target,events,effects,unchanged,holdHuman,releaseHuman,pressHuman,holdBot,holdPad};
}

function begin(x){
 const before=x.effects();
 runSlot(x.p,'q',{pressed:true,held:true,released:false,dt:DT},x.g);
 assert.ok(x.target.hp<before.hp,'fixture must apply native held damage');
 if(x.p.def.id==='apex')assert.ok(x.p.hp>before.heal,'Consume must heal from admitted damage');
 else assert.ok(x.target.vel.length()>before.velocity.length(),'Thunderclap must shove on admitted damage');
 assert.equal(x.events.filter(([event])=>event==='start').length,1,'fixture must start one sustain voice');
 assert.ok(x.p.slots.q._loop,'fixture must retain the slot-owned sustain voice');
}

for(const [hero,name,voice] of PILOTS){
 for(const controller of ['human','pad','bot'])test(`${name}: ${controller} controller retires damage, recovery, shove and audio for every incapacity`,()=>{
  for(const field of INTERRUPTS){
   const x=fixture(hero),label=`${hero}.${field}`;
   try{
    begin(x);const before=x.effects();
    x.p[field]=field==='grabbedBy'?x.target:1;
    x[controller==='human'?'holdHuman':controller==='pad'?'holdPad':'holdBot']();
    x.unchanged(before,label);
    assert.equal(x.p.slots.q._loop,null,`${label}: slot retained its sustain owner`);
    assert.deepEqual(x.events,[['start',voice],['stop',voice]],`${label}: sustain voice lifecycle`);
    if(field==='downedT'&&controller!=='bot')assert.ok(x.p._swHold>0,`${label}: held recovery input was swallowed`);
   }finally{x.close();}
  }
 });

 test(`${name}: direct held admission rejects sleep and downed actors`,()=>{
  for(const field of ['sleepT','downedT']){
   const x=fixture(hero),before=x.effects();
   try{
    x.p[field]=1;runSlot(x.p,'q',{pressed:true,held:true,released:false,dt:DT},x.g);
    x.unchanged(before,`${hero}.${field}`);assert.equal(x.p.slots.q._loop,undefined);
    assert.deepEqual(x.events,[]);
   }finally{x.close();}
  }
 });

 test(`${name}: exact last affordable tick applies once, then depletion is quiet and final`,()=>{
  const x=fixture(hero),rate=x.p.slots.q.def.kiPerSec;
  try{
   let drained=0;x.g.onDrained=()=>drained++;x.p.ki=rate*DT;
   const before=x.effects();runSlot(x.p,'q',{pressed:true,held:true,released:false,dt:DT},x.g);
   assert.equal(x.p.ki,0,'last affordable tick must spend exactly to zero');
   assert.ok(x.target.hp<before.hp,'last affordable tick must still reach the receiver');
   const exhausted=x.effects();
   runSlot(x.p,'q',{pressed:false,held:true,released:false,dt:DT},x.g);
   runSlot(x.p,'q',{pressed:false,held:true,released:false,dt:DT},x.g);
   x.unchanged(exhausted,hero);assert.equal(x.p.ki,0);assert.equal(drained,1);
   assert.equal(x.p.slots.q._loop,null);assert.deepEqual(x.events,[['start',voice],['stop',voice]]);
  }finally{x.close();}
 });

 test(`${name}: KO and repeated cleanup cannot orphan or restart a sustain owner`,()=>{
  const x=fixture(hero);
  try{
   begin(x);x.p._ko();clearSlotFx(x.p);clearSlotFx(x.p);
   const before=x.effects();runSlot(x.p,'q',{pressed:true,held:true,released:false,dt:DT},x.g);
   x.unchanged(before,hero);assert.equal(x.p.slots.q._loop,null);
   assert.deepEqual(x.events,[['start',voice],['stop',voice]],'cleanup must stop the owner exactly once');
  }finally{x.close();}
 });

 test(`${name}: presentation form replacement preserves the same living held action owner`,()=>{
  const x=fixture(hero);
  try{
   begin(x);const owner=x.p.slots.q._loop,stops=x.events.filter(([e])=>e==='stop').length,before=x.effects();
   assert.equal(x.p.applyForm({name:'Lifecycle form',frame:{scale:1.05}}),true);
   x.holdHuman();assert.ok(x.target.hp<before.hp,'held action did not continue after a presentation-only form swap');
   assert.equal(x.p.slots.q._loop,owner,'form swap replaced the living sustain owner');
   assert.equal(x.events.filter(([e])=>e==='stop').length,stops,'form swap stopped the living sustain owner');
  }finally{x.close();}
 });

 test(`${name}: physical release and repress after recovery starts one fresh held action`,()=>{
  const x=fixture(hero);
  try{
   begin(x);x.p.frozenT=1;x.holdHuman();x.p.frozenT=0;
   x.releaseHuman();const before=x.effects();x.pressHuman();
   assert.ok(x.target.hp<before.hp,'fresh press after recovery did not restart held contact');
   assert.equal(x.events.filter(([e])=>e==='start').length,2);
   assert.equal(x.events.filter(([e])=>e==='stop').length,1);
  }finally{x.close();}
 });
}

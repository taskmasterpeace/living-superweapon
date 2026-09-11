import test from 'node:test';
import assert from 'node:assert/strict';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {movementProfile} from '../src/data/movement-gears.js';
import {updateMovementGears,resetMovementGears} from '../src/core/movement-gears.js';
import {Game} from '../src/engine/game.js';
import {combatChoices,selectedAttacks} from '../src/core/combat-selection.js';

function fixture(id,hz,air=false){
 const x=mainCombatFixture({hero:id,mode:'powerworld'}),f=x.p,dt=1/hz;
 x.w.ARENA=10000;x.w.waterAt=()=>0;f._openSky=true;f.flying=air;f.gait=air?'airborne':'grounded';f.pos.set(0,air?90:0,0);f.ki=10000;
 const frame=(held,dir={x:0,y:0,z:1},selectGear)=>{
  updateMovementGears(f,{held,selectGear},dt);
  f.sprintHeld=id==='sarge'&&held&&Math.hypot(dir.x,dir.z)>.01;
  f.move(dir,dt,f.sprintHeld?movementProfile(f).ground[0]:1);f._physics(dt,x.g);
 };
 return {...x,dt,frame};
}

for(const hz of [30,60,120])for(const [id,air]of [['sol',true],['vega',true],['volt',false],['sarge',false],['rime',true]])
test(`${id} physical gears accelerate, separate and brake at ${hz}Hz`,t=>{
 const x=fixture(id,hz,air),f=x.p,profile=movementProfile(f),speeds=[];
 const original={power:f.powerBuff,level:f.level,xp:f.xp,flightTier:f.flightTier};
 try{
  for(let gear=1;gear<=profile.maxGear;gear++){
   resetMovementGears(f,false);f.pos.set(0,air?90:0,0);f.vel.set(0,0,0);
   x.frame(true,{x:0,y:0,z:1},gear);const first=f.vel.length();
   for(let i=1;i<2*hz;i++)x.frame(true);
   const speed=f.vel.length();speeds.push(speed);assert.ok(first<speed*.5,'Tier entry must accelerate, not teleport velocity');
   const base=f.speed*1.08*(air?(f.flightTier>=3?f.flySpeed*1.2:f.flightTier===2?.78:.95):1),wanted=base*(air?profile.air:profile.ground)[gear-1];
   assert.ok(Math.abs(speed-wanted)<wanted*.015,`${id} ${gear}: measured ${speed}, authored ${wanted}`);
   const routeDistance=f.pos.z,releaseAt=f.pos.z;x.frame(false,{x:0,y:0,z:0});assert.equal(f.movementGear.gear,0);assert.ok(f.vel.length()>speed*.55,'Release must brake physically');
   for(let i=1;i<2*hz;i++)x.frame(false,{x:0,y:0,z:0});
   assert.ok(f.vel.length()<.5);assert.ok(f.pos.z>releaseAt+speed*.045,'Braking must travel a measurable distance');
   t.diagnostic(JSON.stringify({id,hz,gear,speed:+speed.toFixed(3),routeSeconds:2,routeDistance:+routeDistance.toFixed(3),brakeDistance:+(f.pos.z-releaseAt).toFixed(3)}));
  }
  for(let i=1;i<speeds.length;i++)assert.ok(speeds[i]>speeds[i-1]*1.1);
  if(id==='sol'||id==='vega'||id==='volt')assert.ok(speeds.at(-1)>210,'Supported top gear must survive the old universal cap');
  assert.deepEqual({power:f.powerBuff,level:f.level,xp:f.xp,flightTier:f.flightTier},original);
  if(id==='sarge'){assert.equal(f.ki,10000);assert.equal(f.flying,false);}
 }finally{x.close();}
});

for(const hz of [30,60,120])test(`top gear cannot tunnel through a thin native cover wall at ${hz}Hz`,()=>{
 const x=fixture('sol',hz,true),f=x.p;
 x.w.cover.push({x:0,z:80,hx:30,hz:.5,r:31,top:160,h:160,hp:10000,maxHp:10000});
 try{let nearest=0;for(let i=0;i<hz;i++){x.frame(true,{x:0,y:0,z:1},3);nearest=Math.max(nearest,f.pos.z);assert.ok(f.pos.z<79.5,`Crossed thin wall: ${f.pos.z}`);}assert.ok(nearest>60,'Fixture must actually reach the wall');}
 finally{x.close();}
});

test('both Shift keys form one semantic hold and no longer pay the legacy Shift slot',()=>{
 const x=mainCombatFixture({hero:'sol',mode:'powerworld'}),f=x.p;
 try{
  x.g.input.keys.add('ShiftRight');x.g.input.justPressed.add('ShiftRight');x.control();assert.equal(f.movementGear?.gear,1);assert.equal(f.slots.shift.cd,0);
  x.g.input.keys.add('ShiftLeft');x.g.input.justPressed.add('ShiftLeft');x.control();assert.equal(f.movementGear.gear,1);assert.equal(f.slots.shift.cd,0);
  x.g.input.keys.delete('ShiftRight');x.control();assert.equal(f.movementGear.gear,1);
  x.g.input.keys.clear();x.control();x.g.input.keys.add('ShiftLeft');x.control();assert.equal(f.movementGear.gear,2);
  x.g.input.cancelVersion++;x.control();assert.equal(f.movementGear.gear,0);
 }finally{x.close();}
});

test('controller R1 uses gears for P2 and legacy WEBLINE zip remains selectable on either trigger',()=>{
 const x=mainCombatFixture({hero:'webline',mode:'powerworld'}),f=x.p;
 try{
  x.pad.cur={dash:true};Game.prototype.controlPad.call(x.g,f,1/60);assert.equal(f.movementGear?.gear,1);assert.equal(f.slots.shift.cd,0);
  assert.ok(combatChoices(f,{mouseMelee:true}).includes('shift'));
  f._selSlot='shift';f._selSecondary='shift';const selection=selectedAttacks(f,{mouseMelee:true});assert.equal(selection.primary,'shift');assert.equal(selection.secondary,'shift');
 }finally{x.close();}
});

test('native stationary double-hold publishes one semantic power-up event and pause clears powered travel',()=>{
 const x=mainCombatFixture({hero:'sol',mode:'powerworld'}),f=x.p;let ready=0;
 x.g.onMovementPowerupReady=who=>{assert.equal(who,f);ready++;};
 try{
  x.g.input.keys.add('ShiftLeft');x.control();x.g.input.keys.clear();x.control();x.g.input.keys.add('ShiftLeft');
  for(let i=0;i<60;i++){x.control();x.g.input.endFrame();}assert.equal(ready,1);assert.equal(f.vel.length(),0);assert.equal(f.movementGear.gear,2);
  x.g.running=false;x.g.controlPlayer(1/60);assert.equal(f.movementGear.gear,0,'Paused controls must retire gear immediately');
  x.g.running=true;x.g.controlPlayer(1/60);assert.equal(f.movementGear.gear,0,'Held resume must require release');
 }finally{x.close();}
});

test('primary controller and explicit selector preserve grounded soldier sprint',()=>{
 for(const input of ['pad','selector']){
  const x=mainCombatFixture({hero:'sarge',mode:'powerworld'}),f=x.p;
  try{x.g.input.keys.add('KeyW');if(input==='pad')x.pad.cur={dash:true};else {f._gearUiHeld=true;f._gearUiSelection=2;}
   x.control();assert.equal(f.sprintHeld,true,input);assert.ok(f.vel.length()>0);assert.equal(f.slots.shift.cd,0);
  }finally{x.close();}
 }
});

test('gear travel bills once, stationary holds cost no travel energy and exhaustion releases the gear',()=>{
 const x=fixture('sol',60,true),f=x.p;
 try{
  f.ki=100;for(let i=0;i<60;i++)x.frame(true,{x:0,y:0,z:1},3);assert.ok(Math.abs(f.ki-88)<1e-8);
  f._altTag=()=>{};f.sheet.kiRegenMult=0;f.maxKi=100;f._burnT=1.2;const paid=f.ki;f.update(1/60,x.g);assert.equal(f.ki,paid,'Legacy afterburner must not bill gear travel again');
  for(let i=0;i<60;i++)x.frame(true,{x:0,y:0,z:0});assert.equal(f.ki,paid,'A stationary gesture is not travel');
  f.ki=.01;let drained=0;x.g.onDrained=()=>drained++;x.frame(true);assert.equal(f.ki,0);assert.equal(f.movementGear.gear,0);assert.equal(drained,1);
  x.frame(true);assert.equal(drained,1);assert.equal(f.movementGear.gear,0);
 }finally{x.close();}
});

test('KO, respawn and disposal retire movement gears without leaking held state to the next life',()=>{
 const x=fixture('sol',60,true),f=x.p;
 try{
  x.frame(true,{x:0,y:0,z:1},3);f._ko();assert.equal(f.movementGear.gear,0);assert.equal(f.cruiseHeld,false);
  f._updateKO(4,x.g);assert.equal(f.alive,true);updateMovementGears(f,{held:true},1/60);assert.equal(f.movementGear.gear,0);
  updateMovementGears(f,{held:false},1/60);updateMovementGears(f,{held:true},1/60);assert.equal(f.movementGear.gear,1);
  f.dispose();assert.equal(f.movementGear.gear,0);
 }finally{x.close();}
});

test('WEBLINE selected legacy movement slot still creates a native paid zip anchor',()=>{
 const x=mainCombatFixture({hero:'webline',mode:'powerworld'}),f=x.p;
 try{
  x.w.cover.push({x:-60,z:0,hx:5,hz:25,r:26,bottom:0,top:60,h:60,hp:100});f._selSlot='shift';f.ki=110;
  Object.assign(x.g.input.mouse,{left:true,leftEdge:true});x.control();
  assert.ok(f._grapple?.zip,'Selected zip must fire through the normal mouse controller');assert.equal(f.ki,104);assert.equal(f.flightTier,0);assert.equal(f.movementGear.gear,0);
 }finally{x.close();}
});

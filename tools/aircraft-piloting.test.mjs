import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Input} from '../src/core/input.js';
import {FrontlineAircraft} from '../src/engine/frontline-aircraft.js';
import {AircraftCombat} from '../src/engine/aircraft-combat.js';
const mod=await import('../src/engine/aircraft-piloting.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
function setup(kind='helicopter'){
 assert.equal(typeof mod.AircraftPiloting,'function','A real native piloting controller must exist');
 const player={alive:true,team:0,def:{flightTier:0},pos:new T.Vector3(17,0,0),vel:new T.Vector3(),obj:new T.Group(),slots:{},radius:2};
 const world={ARENA:1600,cover:[],heightAt:()=>0,waterAt:()=>false};
 const game={player,world,running:true,entities:[player],input:new Input(),hud:{feed(){}}};
 const actor={kind,parked:true,pilotable:true,wrapper:new T.Group(),groundOffset:4,bodyRadius:12,yaw:0,speed:0,velocity:new T.Vector3(),ground:0};actor.wrapper.position.y=4;
 const support={game,actors:[actor]},pilot=new mod.AircraftPiloting(support);
 const input=(...keys)=>{game.input.keys=new Set(keys);game.input.justPressed=new Set(keys.includes('KeyJ')?['KeyJ']:[]);return pilot.handleInput(game.input);};
 const step=n=>{for(let i=0;i<n;i++)pilot.update(1/60);};
 return {player,world,game,actor,pilot,input,step};
}

function arm(f){
 f.world.coverAll=[];f.game.projectiles={spawnProjectile(){}};
 f.actor.model=new T.Group();f.actor.wrapper.add(f.actor.model);
 const hull=new T.Mesh(new T.BoxGeometry(4,3,8),new T.MeshBasicMaterial());hull.name='hull';f.actor.model.add(hull);
 f.actor.combat=new AircraftCombat(f.game,f.actor);
 return ()=>{f.actor.combat.dispose();hull.geometry.dispose();hull.material.dispose();};
}

test('training cannot board hidden desert aircraft or consume the station E key',()=>{
 const f=setup('jet');f.player.def.archetype='soldier';f.player._openSky=true;
 f.game._threatRoom={active:true};f.game.input.justPressed.add('KeyE');
 assert.equal(f.pilot.nearest(f.player),null);assert.equal(f.pilot.enter(f.actor,f.player),false);
 assert.equal(f.pilot.handleInput(f.game.input),false);assert.ok(f.game.input.justPressed.has('KeyE'));
 assert.equal(f.pilot.vehicle,null);assert.equal(f.actor.occupant,undefined);
 f.game._threatRoom.active=false;
 assert.equal(f.pilot.nearest(f.player),f.actor);assert.equal(f.pilot.handleInput(f.game.input),true);
 assert.equal(f.actor.occupant,f.player);
});
test('soldier E boards a parked jet but becomes rudder after boarding, never exit',()=>{
 const f=setup('jet');f.player.def.archetype='soldier';f.player._openSky=true;
 f.game.input.justPressed.add('KeyE');f.game.input.keys.add('KeyE');assert.equal(f.pilot.handleInput(f.game.input),true);assert.equal(f.actor.occupant,f.player);
 f.game.input.endFrame();f.game.input.justPressed.add('KeyE');f.pilot.handleInput(f.game.input);assert.equal(f.actor.occupant,f.player);assert.equal(f.pilot.rudder,1);
 f.input('KeyJ');assert.equal(f.pilot.vehicle,null);
});
test('a complete mouse tap between frames fires one actual aircraft round',()=>{
 const f=setup(),close=arm(f);try{
  f.input('KeyJ');f.game.input.endFrame();
  Object.assign(f.game.input.mouse,{left:false,leftEdge:true,leftUp:true});
  f.pilot.handleInput(f.game.input);f.step(1);f.game.input.endFrame();
  assert.equal(f.actor.combat.shots,1,'Released tap edge must reach the actual cannon');
  for(let i=0;i<30;i++){f.pilot.handleInput(f.game.input);f.step(1);f.game.input.endFrame();}
  assert.equal(f.actor.combat.shots,1,'Tap must not become held fire');
 }finally{close();}
});
test('held aircraft fire retains cooldown and a tap during cooldown is not queued',()=>{
 const f=setup(),close=arm(f);try{
  f.input('KeyJ');Object.assign(f.game.input.mouse,{left:true,leftEdge:true});f.pilot.handleInput(f.game.input);f.step(1);f.game.input.endFrame();
  assert.equal(f.actor.combat.shots,1);f.game.input.mouse.left=false;f.game.input.mouse.leftEdge=true;
  f.pilot.handleInput(f.game.input);f.step(1);f.game.input.endFrame();
  for(let i=0;i<30;i++){f.pilot.handleInput(f.game.input);f.step(1);f.game.input.endFrame();}
  assert.equal(f.actor.combat.shots,1,'Cooldown denial must not become a delayed shot');
  f.game.input.mouse.left=true;for(let i=0;i<30;i++){f.pilot.handleInput(f.game.input);f.step(1);f.game.input.endFrame();}
  assert.ok(f.actor.combat.shots>=3&&f.actor.combat.shots<=4,'Held fire still obeys bounded cannon cadence');
 }finally{close();}
});
test('overlay and boarding clicks cannot leak into an aircraft shot',()=>{
 const f=setup(),close=arm(f);try{
  f.game.input.mouse.leftEdge=true;f.input('KeyJ');f.step(1);f.game.input.endFrame();assert.equal(f.actor.combat.shots,0);
  f.game.combatOverlayOpen=true;f.game.input.mouse.leftEdge=true;f.pilot.handleInput(f.game.input);f.step(1);f.game.input.endFrame();
  f.game.combatOverlayOpen=false;f.pilot.handleInput(f.game.input);f.step(20);assert.equal(f.actor.combat.shots,0);
 }finally{close();}
});
test('only an alive, non-flying-capable ground character can enter a nearby landed aircraft',()=>{
 const f=setup();f.player.def.flightTier=3;assert.equal(f.input('KeyJ'),false);f.player.def.flightTier=0;
 f.player.pos.y=50;assert.equal(f.input('KeyJ'),false);f.player.pos.y=0;assert.equal(f.input('KeyJ'),true);
 assert.equal(f.actor.occupant,f.player);assert.equal(f.player._aircraftVehicle,f.actor);assert.equal(f.player.obj.visible,false);
 f.input('KeyJ');assert.equal(f.player._aircraftVehicle,null);assert.equal(f.player.obj.visible,true);
});
test('helicopter takes off under collective, flies forward, hovers and safely lands before exit',()=>{
 const f=setup();f.input('KeyJ');f.input('Space');f.step(180);assert.ok(f.actor.wrapper.position.y>35);
 assert.equal(f.input('KeyJ'),true);assert.equal(f.actor.occupant,f.player,'Airborne J cannot silently teleport pilot to ground');
 f.input('KeyW');f.step(120);assert.ok(f.actor.wrapper.position.z>30);assert.ok(f.actor.wrapper.rotation.x>0,'Forward flight visibly noses down');
 f.input();f.step(240);assert.ok(f.actor.velocity.length()<.5,'Released controls settle into hover');
 f.input('ControlLeft');f.step(360);assert.ok(f.actor.parked);f.input('KeyJ');assert.equal(f.actor.occupant,null);
});
test('jet needs a takeoff roll, has forward airspeed and cannot hover',()=>{
 const f=setup('jet');f.input('KeyJ');f.input('KeyS');f.step(180);assert.equal(f.actor.wrapper.position.y,4,'Pitch is not vertical lift without airspeed');
 f.input('KeyR','KeyS');f.step(300);assert.ok(f.actor.wrapper.position.z>100);assert.ok(f.actor.wrapper.position.y>20);assert.ok(f.actor.speed>65);
 f.input();const z=f.actor.wrapper.position.z;f.step(60);assert.ok(f.actor.wrapper.position.z>z+60,'Jet keeps moving when controls released');
});

for(const [key,axis,sign]of [['KeyW','pitch',-1],['KeyS','pitch',1],['KeyA','roll',-1],['KeyD','roll',1],['KeyQ','yaw',1],['KeyE','yaw',-1]])test(`jet ${key} independently controls ${axis} in the requested direction`,()=>{
 const f=setup('jet');f.input('KeyJ');f.actor.parked=false;f.actor.wrapper.position.y=200;f.actor.speed=100;
 f.input(key);f.step(20);assert.ok(f.actor[axis]*sign>.03,`${key} must change ${axis} with the correct handedness`);
 if(axis==='pitch')assert.equal(f.actor.yaw,0);if(axis==='yaw')assert.ok(Math.abs(f.actor.roll||0)<.001,'Rudder must not secretly be the roll control');
 if(axis==='roll')assert.ok(f.actor.yaw*sign<0,'A bank turns toward the lowered wing');
});
test('jet R/F change speed independently of elevator input and pause clears roll/rudder',()=>{
 const f=setup('jet');f.input('KeyJ');f.actor.parked=false;f.actor.wrapper.position.y=200;f.actor.speed=100;
 f.input('KeyR');f.step(30);assert.ok(f.actor.speed>115);assert.equal(f.actor.pitch,0);
 f.input('KeyF');f.step(60);assert.ok(f.actor.speed<85);assert.equal(f.actor.pitch,0);
 f.input('KeyD','KeyE');f.game.paused=true;f.pilot.handleInput(f.game.input);const yaw=f.actor.yaw;f.step(30);assert.equal(f.actor.yaw,yaw);
 f.game.paused=false;f.input();f.step(30);assert.ok(Math.abs(f.actor.yaw-yaw)<.001,'Resume cannot retain stale bank or rudder commands');
});
test('swept flight hits cover instead of tunnelling and releases pilot on destruction',()=>{
 const f=setup();f.input('KeyJ');f.world.cover.push({x:0,z:40,hx:60,hz:1,bottom:0,top:100});
 f.input('KeyW');f.step(180);assert.ok(f.actor.wrapper.position.z<29);assert.ok(f.actor.destroyed);assert.equal(f.player._aircraftVehicle,null);assert.equal(f.player.obj.visible,true);
});
test('paused and overlay simulation does not move aircraft and death releases seat ownership',()=>{
 const f=setup();f.input('KeyJ');f.input('Space','KeyW');f.step(60);const p=f.actor.wrapper.position.clone();
 f.game.paused=true;f.step(60);assert.deepEqual(f.actor.wrapper.position.toArray(),p.toArray());
 f.game.paused=false;f.game.hud.titleOpen=true;f.step(60);assert.deepEqual(f.actor.wrapper.position.toArray(),p.toArray());
 f.game.hud.titleOpen=false;f.player.alive=false;f.step(1);assert.equal(f.actor.occupant,null);assert.equal(f.player._aircraftVehicle,null);assert.equal(f.actor.destroyed,true,'Airborne pilot loss cannot leave suspended aircraft');
});
test('native support exposes additional parked assets on clear terrain without replacing patrol aircraft',async()=>{
 const game={scene:new T.Scene(),world:{heightAt:()=>2,cover:[],coverAll:[],ARENA:1600},time:0,running:true,projectiles:{spawnProjectile(){}}};
 const support=new FrontlineAircraft(game,{loader:{loadAsync:async()=>{const scene=new T.Group();scene.add(new T.Mesh(new T.BoxGeometry(4,2,8),new T.MeshStandardMaterial()));return {scene,animations:[]};}}});
 await support.loading;
 try{assert.ok(support.piloting);assert.equal(support.actors.filter(a=>a.pilotable).length,2);assert.equal(support.actors.filter(a=>!a.pilotable).length,2);
 for(const actor of support.actors.filter(a=>a.pilotable)){assert.equal(actor.parked,true);assert.ok(actor.wrapper.position.y>2);const p=actor.wrapper.position.clone();support.update(.1);assert.deepEqual(actor.wrapper.position.toArray(),p.toArray(),'Parked aircraft do not jump into patrol orbit');assert.ok(game.world.cover.includes(actor.combat?.cover),'Pilotable craft remain physical and damageable without Clone Recovery');}
 }finally{support.dispose();}
});
test('aircraft entry cannot reach across an intervening wall',()=>{
 const f=setup();f.world.cover.push({x:8,z:0,hx:.3,hz:25,bottom:0,top:20});assert.equal(f.input('KeyJ'),false);assert.equal(f.actor.occupant,undefined);
});
test('park admission leaves occupied soldier and recovery interaction areas clear',()=>{
 const center={x:40,z:250},game={world:{cover:[],heightAt:()=>0},entities:[{alive:true,pos:center}],ms:{frontline:{casePosition:{x:40,z:100},extractionPosition:{x:0,z:160}}}};
 const owner={game,actors:[]};const spot=FrontlineAircraft.prototype._parkingSpot.call(owner,'jet',66);
 assert.ok(spot);assert.ok(Math.hypot(spot.x-center.x,spot.z-center.z)>82);
 assert.ok(Math.hypot(spot.x-40,spot.z-100)>98);assert.ok(Math.hypot(spot.x,spot.z-160)>98);
});
test('landing contact stays grounded after collective release on slightly sloped terrain',()=>{
 const f=setup();f.world.heightAt=(x,z)=>-.01*z;f.input('KeyJ');f.input('Space','KeyW');f.step(90);f.input('ControlLeft');
 for(let i=0;i<240&&!f.actor.parked;i++)f.step(1);
 assert.equal(f.actor.parked,true);f.input();f.step(120);assert.equal(f.actor.parked,true,'Subpixel settling must not revoke landing permission');assert.equal(f.pilot.exit(),true);
});
test('rotor width is not incorrectly treated as vertical hull height above low cover',()=>{
 const f=setup();f.input('KeyJ');f.actor.wrapper.position.y=20;f.actor.parked=false;
 f.world.cover.push({x:0,z:30,hx:30,hz:1,bottom:0,top:8});f.input('KeyW');f.step(120);
 assert.equal(!!f.actor.destroyed,false);assert.ok(f.actor.wrapper.position.z>30);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Input} from '../src/core/input.js';
import {FrontlineConvoy} from '../src/engine/frontline-convoy.js';
const noop=()=>{};
async function setup(){
 const world={cover:[],coverAll:[],ARENA:1600,heightAt:()=>4,refreshFogBoxes:noop,shake:noop,punch:noop};
 const player={alive:true,team:0,pos:new T.Vector3(),vel:new T.Vector3(),obj:new T.Group(),slots:{},radius:2,flying:false};
 const g={world,player,entities:[player],scene:new T.Scene(),running:true,time:0,ms:{frontline:{}},particles:{burst:noop},vfx:{flash:noop,scorch:noop},audio:{boom:noop},areaDamage:noop,input:new Input()};
 const asset=new T.Group(),hull=new T.Mesh(new T.BoxGeometry(2.4,2.2,5.3),new T.MeshStandardMaterial());hull.position.y=1.1;asset.add(hull);
 const convoy=new FrontlineConvoy({g,_cover:[]},{loader:{loadAsync:async()=>({scene:asset})}});await convoy.loading;
 const v=convoy.vehicles[0];player.pos.set(v.cover.x+v.cover.hx+3,4,v.cover.z);
 const input=(...keys)=>{g.input.keys=new Set(keys);g.input.justPressed=new Set(keys.includes('KeyJ')?['KeyJ']:[]);return convoy.driving.handleInput(g.input,1/60);};
 const step=n=>{for(let i=0;i<n;i++){g.time+=1/60;convoy.update();}};
 return {g,world,player,convoy,v,input,step};
}

test('soldier E enters and exits a scout through the existing seat path',async()=>{
 const f=await setup();try{
  f.player.def={archetype:'soldier',flightTier:0};f.player._openSky=true;
  f.g.input.justPressed.add('KeyE');assert.equal(f.convoy.driving.handleInput(f.g.input),true);assert.equal(f.v.occupant,f.player);
  f.g.input.endFrame();f.g.input.justPressed.add('KeyE');assert.equal(f.convoy.driving.handleInput(f.g.input),true);assert.equal(f.v.occupant,null);
 }finally{f.convoy.dispose();}
});

test('landed flight-capable heroes cannot enter a scout; active flight gadgets also deny entry',async()=>{
 for(const [base,current] of [[3,3],[3,0],[0,3]]){
  const f=await setup();try{
   f.player.def={flightTier:base};f.player.flightTier=current;f.player.flying=false;
   assert.equal(f.input('KeyJ'),false);assert.equal(f.v.occupant,null);
  }finally{f.convoy.dispose();}
 }
});

test('second scout leaves its bay forward instead of immediately hitting the hangar',async()=>{
 const f=await setup();try{
  const v=f.convoy.vehicles[1];f.world.cover.push({x:v.cover.x,z:v.cover.z+28,hx:35,hz:5,top:60});
  f.convoy.driving.enter(v,f.player);const start=v.mesh.position.clone();f.input('KeyW');f.step(100);
  assert.ok(v.mesh.position.distanceTo(start)>25,'Forward departure blocked by the hangar');
 }finally{f.convoy.dispose();}
});
test('J admits only a nearby alive ground actor and cleanly exits clear of its hull',async()=>{
 const f=await setup();try{
  assert.ok(f.convoy.driving,'Convoy owns explicit driving state');
  f.player.pos.y=100;assert.equal(f.input('KeyJ'),false);assert.equal(f.player._scoutVehicle,undefined);
  f.player.pos.y=4;assert.equal(f.input('KeyJ'),true);assert.equal(f.player._scoutVehicle,f.v);assert.equal(f.v.occupant,f.player);assert.equal(f.player.obj.visible,false);
  f.g.input.justPressed.clear();f.input();f.step(1);assert.ok(f.player.pos.distanceTo(f.v.mesh.position)<12);
  f.input('KeyJ');assert.equal(f.player._scoutVehicle,null);assert.equal(f.v.occupant,null);assert.equal(f.player.obj.visible,true);assert.ok(Math.abs(f.player.pos.x-f.v.cover.x)>f.v.cover.hx+1);
 }finally{f.convoy.dispose();}
});
test('native game-clock drive moves hull/cover/occupant together; brake and pause stop motion',async()=>{
 const f=await setup();try{
  assert.ok(f.convoy.driving);f.input('KeyJ');const start=f.v.mesh.position.clone();f.input('KeyW');f.step(90);
  assert.ok(f.v.mesh.position.distanceTo(start)>15);assert.equal(f.v.cover.x,f.v.mesh.position.x);assert.equal(f.v.cover.z,f.v.mesh.position.z);assert.ok(f.v.cover.blastBounds.containsPoint(f.v.mesh.position.clone().add(new T.Vector3(0,5,0))));
  f.input('KeyW','KeyD');f.step(20);assert.ok(f.v.yaw>.25);f.input('Space');f.step(100);assert.ok(Math.abs(f.v.speed)<.01);
  const stopped=f.v.mesh.position.clone();f.g.paused=true;f.input('KeyW');f.step(60);assert.deepEqual(f.v.mesh.position.toArray(),stopped.toArray());
 }finally{f.convoy.dispose();}
});
test('swept driving refuses intervening cover and cliffs without tunnelling',async()=>{
 const f=await setup();try{
  assert.ok(f.convoy.driving);f.input('KeyJ');f.v.yaw=0;f.v.terrain=[];f.convoy._ground(f.v);const z=f.v.cover.z;
  f.world.cover.push({x:f.v.cover.x,z:z+35,hx:80,hz:1,bottom:0,top:50});f.input('KeyW');f.step(300);assert.ok(f.v.cover.z+f.v.cover.hz<z+35);
  f.world.cover.pop();f.world.heightAt=(x,pz)=>pz>z+36?-100:4;f.step(300);assert.ok(f.v.cover.z<z+36);
 }finally{f.convoy.dispose();}
});
test('destroy, death and dispose release ownership without leaving an invisible actor',async()=>{
 for(const mode of ['destroy','death','dispose']){const f=await setup();assert.ok(f.convoy.driving);f.input('KeyJ');
  if(mode==='destroy')f.convoy.destroy(f.v,f.player);else if(mode==='death'){f.player.alive=false;f.step(1);}else f.convoy.dispose();
  assert.equal(f.player._scoutVehicle,null,mode);assert.equal(f.v.occupant,null,mode);assert.equal(f.player.obj.visible,true,mode);f.convoy.dispose();
 }
});
test('entry cannot cross another wall and an open overlay halts driving',async()=>{
 const f=await setup();try{
  const c=f.v.cover;f.world.cover.push({x:c.x+c.hx+1,z:c.z,hx:.2,hz:30,bottom:0,top:30});
  assert.equal(f.input('KeyJ'),false);assert.equal(f.player._scoutVehicle,undefined);f.world.cover.pop();
  f.input('KeyJ');f.input('KeyW');f.step(60);const p=f.v.mesh.position.clone();f.g.hud={titleOpen:true};f.step(120);assert.deepEqual(f.v.mesh.position.toArray(),p.toArray());
 }finally{f.convoy.dispose();}
});
test('entering cancels an existing native held beam and rejects dead actors',async()=>{
 const f=await setup();try{
  f.player.alive=false;assert.equal(f.input('KeyJ'),false);f.player.alive=true;
  let ended=0;f.player.slots={lmb:{def:{type:'beam',cooldown:0},cd:0,active:{end(){ended++;}},charging:false}};
  f.input('KeyJ');assert.equal(ended,1);assert.equal(f.player.slots.lmb.active,null);
 }finally{f.convoy.dispose();}
});
// A variable-dt stepper: throttle/steer are set once by input() and persist, so
// drive many frames at an arbitrary dt through the same real controller/convoy.
function driveDt(f,dt,n){for(let i=0;i<n;i++){f.g.time+=dt;f.convoy.update();}}
test('reset: exit and re-enter start from a clean stop with no carried momentum',async()=>{
 const f=await setup();try{
  f.input('KeyJ');f.input('KeyW','KeyD');f.step(60);
  assert.ok(Math.abs(f.v.speed)>1,'built speed');assert.ok(Math.hypot(f.v.vx,f.v.vz)>1,'has world velocity');
  f.input('KeyJ');                                   // exit
  assert.equal(f.v.occupant,null);assert.equal(f.v.speed,0);assert.equal(f.v.vx,0);assert.equal(f.v.vz,0);assert.equal(f.v.yawVel,0);
  f.g.input.justPressed.clear();f.player.pos.set(f.v.cover.x+f.v.cover.hx+3,4,f.v.cover.z);
  f.input('KeyJ');                                   // re-enter the same hull
  assert.equal(f.v.occupant,f.player);
  assert.equal(f.v.speed,0,'re-enter starts stopped');assert.equal(f.v.vx,0);assert.equal(f.v.vz,0);assert.equal(f.v.yawVel,0);assert.equal(f.v.steerSmooth,0);
 }finally{f.convoy.dispose();}
});
test('differing dt: a fixed throttle window travels a consistent distance at 30 vs 120 fps',async()=>{
 const runs=[];
 for(const dt of [1/30,1/120]){
  const f=await setup();
  f.convoy.driving.enter(f.v,f.player);const start={x:f.v.cover.x,z:f.v.cover.z};
  f.g.input.keys=new Set(['KeyW']);f.convoy.driving.handleInput(f.g.input);   // hold W
  driveDt(f,dt,Math.round(2/dt));
  runs.push(Math.hypot(f.v.cover.x-start.x,f.v.cover.z-start.z));
  f.convoy.dispose();
 }
 assert.ok(Math.abs(runs[0]-runs[1])<3,`2s of throttle is dt-stable: ${runs.map(r=>r.toFixed(2))}`);
});

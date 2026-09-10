import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {World} from '../src/engine/world.js';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {Projectiles} from '../src/engine/projectiles.js';
import {Game} from '../src/engine/game.js';
import {coverBoxEntry} from '../src/engine/projectile-contact.js';
const api=await import('../src/engine/aircraft-combat.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
test('gunship waits for a readable acquisition, fires two rounds then leaves breathing room',()=>{
 assert.equal(typeof api.AircraftFireControl,'function');const c=new api.AircraftFireControl(),times=[];
 for(let i=0;i<300;i++)if(c.update(1/60,true))times.push(i/60);
 assert.equal(times.length,2);assert.ok(times[0]>=1.5);assert.ok(times[1]-times[0]>=.24);
 c.update(1/60,false);assert.equal(c.acquired,0);assert.equal(c.update(5,true),false);
});
function fixture(){
 const model=new T.Group(),hull=new T.Mesh(new T.BoxGeometry(5,3,10),new T.MeshStandardMaterial());hull.name='hull';model.add(hull);model.scale.setScalar(5);
 const wrapper=new T.Group();wrapper.add(model);wrapper.position.y=100;const scene=new T.Scene();scene.add(wrapper);
 const player={alive:true,team:0,pos:new T.Vector3(0,25,180)},shots=[];
 const game={scene,running:true,time:0,ms:{frontline:{phase:'active'}},player,entities:[player],world:{cover:[],coverAll:[],refreshFogBoxes(){}},projectiles:{spawnProjectile:(src,o)=>shots.push({src,o})}};
 return {game,actor:{kind:'helicopter',wrapper,model},shots};
}

test('distant gunship skips terrain fire solutions but keeps its moving damage bounds live',()=>{
 const {game,actor,shots}=fixture();let terrainQueries=0;
 Object.assign(game.world,{_ghTriangles:true,_gh:new Float32Array(9),_gseg:2,_ghArena:3000,heightAt:()=>{terrainQueries++;return 0;}});game.player.pos.set(0,25,2000);
 const gun=new api.AircraftCombat(game,actor);
 try{for(let i=0;i<60;i++){actor.wrapper.position.x=i;gun.update(1/60,true);}
  assert.equal(terrainQueries,0,'An out-of-range gun must not sweep thousands of units of terrain');
  assert.equal(shots.length,0);assert.ok(Math.abs(gun.cover.x-59)<2,'Receiver must follow the aircraft even when fire planning is culled');
  game.player.pos.set(59,25,180);for(let i=0;i<240;i++)gun.update(1/60,true);
  assert.ok(terrainQueries>0);assert.equal(shots.length,2,'Reentry still earns the full acquisition and bounded burst');
 }finally{gun.dispose();}
});

test('target behind the gunship does not request an impossible terrain firing solution',()=>{
 const {game,actor,shots}=fixture();let terrainQueries=0;Object.assign(game.world,{_ghTriangles:true,_gh:new Float32Array(9),_gseg:2,_ghArena:3000,heightAt:()=>{terrainQueries++;return 0;}});
 game.player.pos.set(0,25,-180);const gun=new api.AircraftCombat(game,actor);
 try{for(let i=0;i<120;i++)gun.update(1/60,true);assert.equal(terrainQueries,0);assert.equal(shots.length,0);assert.equal(gun.control.acquired,0);}
 finally{gun.dispose();}
});
test('actual muzzle slews, honors LOS/pause/phase, and registers a moving finite damage receiver',()=>{
 assert.equal(typeof api.AircraftCombat,'function');const {game,actor,shots}=fixture(),gun=new api.AircraftCombat(game,actor);
 try{
  for(let i=0;i<240;i++)gun.update(1/60,true);assert.equal(shots.length,2);
  const shot=shots[0];assert.equal(shot.o.ballistic,true);assert.equal(shot.o.homing,0);assert.equal(shot.o.launchCover,gun.cover);assert.ok(shot.o.pos.distanceTo(actor.wrapper.position)>15);assert.ok(Math.abs(shot.o.vel.length()-190)<1e-8);
  const old=gun.cover.x;actor.wrapper.position.x=70;gun.update(1/60,true);assert.notEqual(gun.cover.x,old);assert.ok(gun.cover.bottom>50);
  assert.equal(coverBoxEntry(new T.Vector3(70,0,-100),new T.Vector3(70,0,100),gun.cover),Infinity);
  game.world.cover.push({x:35,z:85,hx:100,hz:5,bottom:0,top:200,projectileShape:'box'});for(let i=0;i<500;i++)gun.update(1/60,true);assert.equal(shots.length,2);
  game.world.cover.pop();game.paused=true;for(let i=0;i<500;i++)gun.update(1/60,true);assert.equal(shots.length,2);game.paused=false;
  game.ms.frontline.phase='complete';for(let i=0;i<500;i++)gun.update(1/60,true);assert.equal(shots.length,2);
  gun.cover.onConstructHit(200,{src:game.player,lane:'projectile'});assert.equal(gun.dead,true);assert.equal(game.world.cover.includes(gun.cover),false);assert.equal(actor.wrapper.visible,false);
  gun.update(1/60,true);assert.equal(shots.length,2);
 }finally{gun.dispose();gun.dispose();assert.equal(game.world.coverAll.length,0);}
});
test('native aim/camera trace respects the finite airborne hull bottom, ordinary cover remains ground rooted',()=>{
 const c={x:0,z:0,hx:10,hz:15,bottom:80,top:110,frontlineAircraft:true};
 assert.equal(World.prototype.traceBox3(0,10,-50,0,10,50,c),-1);
 assert.ok(World.prototype.traceBox3(0,90,-50,0,90,50,c)>=0);
 assert.ok(World.prototype.traceBox3(0,10,-50,0,10,50,{...c,frontlineAircraft:false})>=0);
});

test('real ballistic manager damages the hull once, and native blast uses the finite receiver',()=>{
 const {game,actor}=fixture(),noop=()=>{};Object.assign(game,{entities:[],audio:{},particles:{burst:noop,spawn:noop},noise:noop,isHuman:()=>false,isFoe:(a,b)=>a.team!==b.team,overlapFoe:Game.prototype.overlapFoe,hitFlung:Game.prototype.hitFlung});game.world.interiors=[];
 const gun=new api.AircraftCombat(game,actor),manager=game.projectiles=new Projectiles(game),src={team:0,powerBuff:1,alive:true,pos:new T.Vector3(0,100,-80),def:{colors:{accent:'#ffeeaa'}}};
 try{
  manager.spawnProjectile(src,{pos:src.pos,vel:new T.Vector3(0,0,600),bullet:true,ballistic:true,damage:20,radius:.25,life:1});
  for(let i=0;i<15;i++)manager.update(1/60,game);
  assert.equal(gun.cover.hp,140,'Bullet must hit finite hull exactly once');assert.equal(manager.list.length,0);
  game.worldImpact=noop;Game.prototype.areaDamage.call(game,src,new T.Vector3(0,100,0),30,30,1,{});assert.equal(gun.cover.hp,110);
  Game.prototype.areaDamage.call(game,src,new T.Vector3(0,0,0),30,30,1,{});assert.equal(gun.cover.hp,110,'Ground blast cannot hit aircraft footprint');
 }finally{for(const p of manager.list)p._dispose(game);gun.dispose();}
});

test('actual grounded Fighter passes beneath finite aircraft without a moving invisible column',()=>{
 const f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='kano'))),noop=()=>{},world={ARENA:900,heightAt:()=>0,cover:[{x:0,z:0,hx:12,hz:20,top:110,bottom:80,frontlineAircraft:true}],interiors:[]},g={world,audio:{},particles:{spawn:noop}};
 try{f.pos.set(0,0,0);f._physics(1/60,g);assert.equal(f.pos.x,0);assert.equal(f.pos.z,0);}finally{f.dispose();}
});

test('seated Fighter skips only native articulation and movement entry points',()=>{
 const f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='kano')));
 try{f._scoutVehicle={};f.pos.set(12,5,30);f.vel.set(20,0,0);const before=f.parts.armR.rotation.toArray();f._physics(1/60,{world:{cover:[],interiors:[],ARENA:900,heightAt:()=>0}});f._animate(1/60);assert.deepEqual(f.pos.toArray(),[12,5,30]);assert.deepEqual(f.parts.armR.rotation.toArray(),before);}finally{f.dispose();}
});

test('native terrain reset does not teleport a dynamic aircraft cover to an undefined static center',()=>{
 const {game,actor}=fixture(),gun=new api.AircraftCombat(game,actor),w=game.world;w._restoreGrass=()=>{};
 try{const before=actor.wrapper.position.toArray();World.prototype.resetTerrain.call(w);assert.deepEqual(actor.wrapper.position.toArray(),before);assert.ok(actor.wrapper.position.toArray().every(Number.isFinite));}finally{gun.dispose();}
});
test('occupied aircraft fire bounded native forward cannon and become hostile to clone rounds',()=>{
 const {game,actor,shots}=fixture();actor.pilotable=true;actor.occupant=game.player;actor.velocity=new T.Vector3(0,0,200);const gun=new api.AircraftCombat(game,actor);
 try{assert.equal(typeof gun.pilotFire,'function');for(let i=0;i<60;i++)gun.pilotFire(1/60,true);
 assert.ok(shots.length>=4&&shots.length<=6);assert.equal(shots[0].src.team,0);assert.equal(shots[0].o.homing,0);assert.equal(shots[0].o.launchCover,gun.cover);assert.ok(shots[0].o.vel.z>=490,'Cannon inherits airspeed rather than barely outrunning a fast jet');assert.ok(shots[0].o.pos.z>25);
 assert.equal(gun.hit(10,{team:0}),0);assert.equal(gun.hit(10,{team:1}),10);actor.occupant=null;const count=shots.length;gun.pilotFire(.1,true);assert.equal(shots.length,count);
 }finally{gun.dispose();}
});

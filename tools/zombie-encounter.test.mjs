import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene} from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {ZombieEncounter,zombieDefinition} from '../src/engine/zombie-encounter.js';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {AI} from '../src/engine/ai.js';
import {psycheOf} from '../src/engine/psyche.js';
function fixture(){
 const scene=new Scene(),player=new Fighter(ROSTER[0]),results=[],entities=[player];
 const g={scene,player,entities,running:true,matchOver:false,world:{ARENA:1800,cover:[{x:45,z:0,hx:20,hz:20,top:30}],heightAt:()=>3},hud:{titleOpen:false},
  addFighter(def,opts){const f=new Fighter(def,opts);f._game=g;entities.push(f);scene.add(f.obj);return f;},endMatch(r){results.push(r);g.matchOver=true;}};
 const e=new ZombieEncounter(g);return {g,e,results,close(){e.dispose();player.dispose();}};
}
test('zombie recipe is independent, grounded, unarmed and uses native melee',()=>{
 const before=JSON.stringify(ROSTER),a=zombieDefinition(0),b=zombieDefinition(0);a.colors.skin='#000';
 assert.notEqual(a.colors.skin,b.colors.skin);assert.equal(b.flightTier,0);assert.equal(b.abilities.lmb.type,'melee');assert.ok(b.abilities.lmb.damage<10);assert.equal(b.items.length,0);assert.equal(JSON.stringify(ROSTER),before);
});

test('zombies use a restrained civilian silhouette without superhero spikes or a glowing insignia',()=>{
 const f=new Fighter(zombieDefinition());try{
  assert.equal(f.parts.emblem.visible,false);
  assert.equal(f.parts.cowl.children.length,0);
  assert.equal(f.parts.cowl.visible,true);
 }finally{f.dispose();}
});
test('undead recipe does not gain human mood dialogue or instant emotional buffs',()=>{
 const z=new Fighter(zombieDefinition()),hero=new Fighter(ROSTER[0]);try{
  assert.ok(psycheOf(z)===null);assert.ok(z._psyche===undefined);assert.ok(psycheOf(hero));
 }finally{z.dispose();hero.dispose();}
});
test('first wave spawns real actors clear of cover and on sampled terrain',()=>{
 const x=fixture();try{assert.equal(x.e.units.length,4);for(const f of x.e.units){assert.equal(f.flightTier,0);assert.equal(f.pos.y,3);assert.equal(f.noRespawn,true);assert.equal(f._encounterNPC,true);assert.ok(f.ai);assert.equal(f.ai.flyTend,0);assert.ok(Math.abs(f.pos.x-45)>=24||Math.abs(f.pos.z)>=24);}}finally{x.close();}
});
test('finite waves include a recovery gap and produce exactly one native result',()=>{
 const x=fixture();try{
  for(let wave=1;wave<=3;wave++){
   assert.equal(x.e.wave,wave);for(const f of x.e.units)f.hp=0;x.e.update(1/60);
   if(wave<3){assert.equal(x.e.phase,'recover');x.e.update(1);assert.equal(x.e.wave,wave);x.e.update(5);}
  }
  assert.equal(x.results.length,1);assert.equal(x.results[0].win,true);assert.equal(x.results[0].wave,3);x.e.update(50);assert.equal(x.results.length,1);
 }finally{x.close();}
});
test('pause and overlays stop the wave timer; defeat has a retry-compatible result',()=>{
 const x=fixture();try{for(const f of x.e.units)f.hp=0;x.e.update(.1);const timer=x.e.rest;
  x.g.running=false;x.e.update(20);x.g.running=true;x.g.hud.titleOpen=true;x.e.update(20);assert.equal(x.e.rest,timer);
  x.g.hud.titleOpen=false;x.g.player.hp=0;x.e.update(.1);assert.equal(x.results.length,1);assert.equal(x.results[0].win,false);
 }finally{x.close();}
});
test('disposal is idempotent and retires only encounter actors',()=>{
 const x=fixture();try{x.e.dispose();x.e.dispose();assert.deepEqual(x.g.entities,[x.g.player]);assert.equal(x.g.scene.children.length,0);}finally{x.close();}
});

test('a blocked next wave waits without partial spawns and resumes when open ground is available',()=>{
 const x=fixture();try{
  for(const f of x.e.units)f.hp=0;x.e.update(.1);
  x.g.world.cover=[{x:0,z:0,hx:10000,hz:10000,top:1000}];x.e.update(5);
  assert.equal(x.e.phase,'blocked');assert.equal(x.e.wave,1);assert.equal(x.e.units.length,4);
  x.g.world.cover=[];x.e.update(1);
  assert.equal(x.e.phase,'combat');assert.equal(x.e.wave,2);assert.equal(x.e.units.length,10);
 }finally{x.close();}
});
for(const scenarioSeed of [20260911,1,42])test(`a grounded zombie acquires and damages through native AI, melee and contact (seed ${scenarioSeed})`,()=>{
 const random=Math.random;let seed=scenarioSeed;
 Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const x=mainCombatFixture({mode:'powerworld'});let zombie;const vocalCalls=[];x.g.audio={...x.g.audio,sample:id=>{vocalCalls.push(id);return true;}};
 try{
  x.g.ms.chaseCam=true;x.p._openSky=true;x.p.hp=x.p.maxHp=1000;x.p.team=0;
  zombie=new Fighter(zombieDefinition(),{team:1,x:0,z:7});zombie._game=x.g;zombie._openSky=true;zombie.ai=new AI(zombie,.7);zombie.faceDir(0,-1);zombie.aim3.set(0,0,-1);
  x.g.entities.push(zombie);x.g.scene.add(zombie.obj);
  x.g.vfx.impactStar=()=>{};x.g.vfx.impact=()=>{}; // Canvas effects only; collision/damage stay native.
  for(const f of x.g.entities)f._altTag=()=>{};
  for(let i=0;i<240;i++){
   const dt=1/60;x.g.time+=dt;x.g.dt=dt;
   x.g.controlBot(zombie,dt);x.g.melee.beginContactFrame();x.g.beginBodyContactFrame();
   for(const f of x.g.entities)f.update(dt,x.g);x.g.resolveBodies();x.g.melee.endContactFrame();
  }
  assert.ok(x.p.hp<1000,`Telegraphed native melee must connect: ${JSON.stringify({pos:zombie.pos.toArray(),player:x.p.pos.toArray(),aim:zombie.aim3.toArray(),sees:zombie.ai._sees,ready:zombie.ai._targetReady,mstate:zombie.mstate,ability:zombie._abilityMeleePose,slot:zombie.slots.lmb.cd,teams:[x.p.team,zombie.team]})}`);assert.equal(zombie.flying,false);assert.equal(zombie.flightTier,0);assert.ok(vocalCalls.includes('op.zombie.alert'));assert.ok(vocalCalls.includes('op.zombie.attack'));assert.ok(vocalCalls.filter(id=>id==='op.zombie.alert').length<5);
 }finally{x.close();Math.random=random;}
});

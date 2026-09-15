import test from 'node:test';import assert from 'node:assert/strict';import {Fighter} from '../src/engine/entity.js';import {AI} from '../src/engine/ai.js';import {zombieDefinition} from '../src/engine/zombie-encounter.js';import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';import {HighwallInfection} from '../src/engine/highwall-infection.js';
for(const scenarioSeed of [20260911])test(`native zombie contact drives Highwall exposure, not proximity (seed ${scenarioSeed})`,()=>{
 const random=Math.random;let seed=scenarioSeed;
 Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const x=mainCombatFixture({mode:'powerworld'});let zombie;const vocalCalls=[];x.g.audio={...x.g.audio,sample:id=>{vocalCalls.push(id);return true;}};
 try{
  delete x.g.onHit;x.g.bigHit={amount:0};x.g.ms.chaseCam=true;x.p._openSky=true;x.p.hp=x.p.maxHp=1000;x.p.team=0;x.p.def={...x.p.def,highwallBiological:true};
  const scope={g:x.g,scenario:{infection:true},units:[x.p],nav:{isClear:()=>true}};x.g._highwall={started:true,infection:new HighwallInfection(scope)};
  zombie=new Fighter(zombieDefinition(),{team:1,x:0,z:7});zombie._game=x.g;zombie._openSky=true;zombie.ai=new AI(zombie,.7);zombie.faceDir(0,-1);zombie.aim3.set(0,0,-1);
  x.g.entities.push(zombie);x.g.scene.add(zombie.obj);
  x.g.vfx.impactStar=()=>{};x.g.vfx.impact=()=>{}; // Canvas effects only; collision/damage stay native.
  for(const f of x.g.entities)f._altTag=()=>{};
  assert.equal(x.p._highwallInfection,undefined);
  for(let i=0;i<240;i++){
   const dt=1/60;x.g.time+=dt;x.g.dt=dt;
   x.g.controlBot(zombie,dt);x.g.melee.beginContactFrame();x.g.beginBodyContactFrame();
   for(const f of x.g.entities)f.update(dt,x.g);x.g.resolveBodies();x.g.melee.endContactFrame();
  }
  assert.ok(x.p.hp<1000,`Telegraphed native melee must connect: ${JSON.stringify({pos:zombie.pos.toArray(),player:x.p.pos.toArray(),aim:zombie.aim3.toArray(),sees:zombie.ai._sees,ready:zombie.ai._targetReady,mstate:zombie.mstate,ability:zombie._abilityMeleePose,slot:zombie.slots.lmb.cd,teams:[x.p.team,zombie.team]})}`);assert.equal(x.p._highwallInfection?.stage,'exposed');assert.equal(x.g._highwall.infection.events.filter(e=>e.type==='exposure').length,1);x.g._highwall.infection.tick(5);assert.equal(x.p._highwallInfection.stage,'symptomatic');assert.ok(x.p.alive);assert.equal(zombie.flying,false);assert.equal(zombie.flightTier,0);assert.ok(vocalCalls.includes('op.zombie.alert'));assert.ok(vocalCalls.includes('op.zombie.attack'));assert.ok(vocalCalls.filter(id=>id==='op.zombie.alert').length<5);
 }finally{x.close();Math.random=random;}
});



function policyFixture(turnDelay=20){
 const f={def:{id:'soldier',highwallBiological:true},alive:true,pos:{},hp:100};
 const spawned=[];const scope={scenario:{infection:true,turnDelay},units:[f],g:{time:0,entities:[]},nav:{isClear:()=>true},spawnTurned:()=>{const z={};spawned.push(z);return z;}};
 return {f,scope,spawned,system:new HighwallInfection(scope),opts:{strike:true,src:{def:{id:'zombie',zombieProfile:{}}}}};
}
test('infection excludes blocked, zero damage, ranged, nonbiological and duplicate exposure',()=>{
 const x=policyFixture();
 x.system.hit(x.f,10,x.opts,true);x.system.hit(x.f,0,x.opts,false);x.system.hit(x.f,10,{...x.opts,strike:false},false);
 x.f.def.highwallBiological=false;x.system.hit(x.f,10,x.opts,false);assert.equal(x.f._highwallInfection,undefined);
 x.f.def.highwallBiological=true;x.system.hit(x.f,10,x.opts,false);x.system.hit(x.f,10,x.opts,false);assert.equal(x.system.events.length,1);
});
for(const delay of [20,6])test(`living symptoms never kill; death incubates ${delay}s then turns for 1s once`,()=>{
 const x=policyFixture(delay);x.system.hit(x.f,10,x.opts,false);x.system.tick(3.99);assert.equal(x.f._highwallInfection.stage,'exposed');x.system.tick(.02);assert.equal(x.f._highwallInfection.stage,'symptomatic');x.system.tick(100);assert.equal(x.f.alive,true);assert.equal(x.f.hp,100);assert.equal(x.spawned.length,0);
 x.f.alive=false;x.system.tick(delay-.1);assert.equal(x.f._highwallInfection.stage,'incubating');x.system.tick(.11);assert.equal(x.f._highwallInfection.stage,'turning');assert.equal(x.spawned.length,0);
 x.system.tick(.98);assert.equal(x.spawned.length,0);x.system.tick(.02);assert.equal(x.spawned.length,1);assert.equal(x.f._remove,true);assert.equal(x.spawned[0]._reanimatedFrom,'soldier');x.system.tick(100);assert.equal(x.spawned.length,1);
});
test('occupied reanimation space waits without duplicate turning events',()=>{
 const x=policyFixture(6);x.system.hit(x.f,10,x.opts,false);x.f.alive=false;x.scope.nav.isClear=()=>false;x.system.tick(8);x.system.tick(2);assert.equal(x.spawned.length,0);assert.equal(x.system.events.filter(e=>e.type==='turning').length,1);x.scope.nav.isClear=()=>true;x.system.tick(.1);assert.equal(x.spawned.length,1);
});
test('native infected human reanimation retains a hidden camera anchor and does not duplicate death loot',async()=>{
 const {HighwallLoot,snapshotInventory}=await import('../src/engine/highwall-loot.js');
 const x=mainCombatFixture();const loot=new HighwallLoot(x.g);x.g.hud={feed(){}};try{
  x.p.def={...x.p.def,highwallBiological:true};x.p.human=true;x.p.noRespawn=true;x.p._inventoryDevice=true;
  const scope={g:x.g,units:[x.p],scenario:{infection:true,turnDelay:6},nav:{isClear:()=>true},spawnTurned(){const f=new Fighter(zombieDefinition());f._game=x.g;f.pos.copy(x.p.pos);x.g.entities.push(f);x.g.scene.add(f.obj);return f;}};
  const system=new HighwallInfection(scope);const src=new Fighter(zombieDefinition());
  try{system.hit(x.p,10,{strike:true,src},false);x.p.invuln=0;x.p.takeDamage(100000,{src,strike:true});assert.equal(x.p.alive,false);const deathLoot=loot.dropDeath(x.p);const count=deathLoot.entries.length;assert.ok(count>0);
   system.tick(7.01);assert.equal(x.g.player,x.p);assert.equal(x.g.humans[0].fighter,x.p);assert.ok(x.g.entities.includes(x.p));assert.equal(x.p._remove,false);assert.equal(x.p.obj.visible,false);assert.equal(x.p._highwallRetiredBody,true);
   x.p._updateKO(100,x.g);assert.equal(x.p._remove,false);assert.equal(x.p.alive,false);
   const turned=x.g.entities.find(f=>f._reanimatedFrom===x.p.def.id);assert.ok(turned);assert.equal(turned.obj.visible,true);const inv=snapshotInventory(turned);assert.equal(inv.device,false);assert.equal(inv.held,null);assert.deepEqual(inv.weapons,[]);assert.deepEqual(inv.items,[]);
   assert.equal(loot.dropDeath(x.p),deathLoot);assert.equal(deathLoot.entries.length,count);assert.equal(loot.containers.size,1);
  }finally{src.dispose();}
 }finally{loot.dispose();x.close();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene} from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {DesertSecurity} from '../src/engine/desert-security.js';
import {Game} from '../src/engine/game.js';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {encounterGround} from '../src/engine/encounter-ground.js';
function fixture({cover=[]}={}){
 const player=new Fighter(ROSTER[0],{team:0}),scene=new Scene(),entities=[player];
 const g={player,scene,entities,mode:{},modeId:'powerworld',time:0,matchT:0,running:true,matchOver:false,cityStats:{},
  world:{ARENA:1800,cover,heightAt:()=>2},hud:{titleOpen:false,feed(){},announce(){}},isHuman:f=>f===player,
  addFighter(def,opts){const f=new Fighter(def,opts);f._game=g;entities.push(f);scene.add(f.obj);return f;}};
 const law=new DesertSecurity(g);return {g,law,step(dt){while(dt>1e-8){const step=Math.min(.1,dt);g.time+=step;law.update(step);dt-=step;}},close(){law.dispose();player.dispose();}};
}
test('outpost officers start grounded and peaceful, with real finite guns',()=>{
 const x=fixture();try{assert.equal(x.law.cops.length,2);for(const f of x.law.cops){assert.equal(f.flightTier,0);assert.equal(f.pos.y,2);assert.ok(f.slots.lmb.ammo.loaded>0);const it=f.ai.intent(1/60,x.g);assert.ok(Object.values(it.slots).every(s=>!s.held&&!s.pressed));}assert.equal(x.law.wantedLevel(x.g.player),0);}finally{x.close();}
});
test('an actual officer injury dispatches police, repeated officer KOs escalate to military',()=>{
 const x=fixture();try{x.law.onCopHurt(x.g.player,4);assert.equal(x.law.wantedLevel(x.g.player),1);x.step(.1);x.step(8);assert.ok(x.law.cops.length>2);
  for(let i=0;i<4;i++)x.law.onCopDown(x.g.player);assert.equal(x.law.wantedLevel(x.g.player),5);
  x.step(.1);x.step(8);assert.ok(x.law.cops.some(f=>f._responseTier===5),'Military actors must physically arrive');
  assert.ok(x.law.cops.every(f=>f.flightTier===0));assert.ok(x.law.cops.length<=10);
 }finally{x.close();}
});
test('repeated dispatches respect the live actor cap and do not spawn while paused',()=>{
 const x=fixture();try{for(let i=0;i<4;i++)x.law.onCopDown(x.g.player);
  for(let i=0;i<30;i++)x.step(10);assert.ok(x.law.cops.filter(f=>f.alive&&f.hp>0).length<=10);
  const n=x.g.entities.length;x.g.running=false;x.step(100);assert.equal(x.g.entities.length,n);
 }finally{x.close();}
});
test('escape and no new incidents cool the response and retire reinforcement actors',()=>{
 const x=fixture();try{x.law.onCopHurt(x.g.player,10);x.step(.1);x.step(8);x.g.player.pos.set(800,0,800);
  for(let i=0;i<20;i++)x.step(2);assert.equal(x.law.wantedLevel(x.g.player),0);assert.ok(x.law.cops.filter(f=>!f._desertPatrol&&f.alive).every(f=>f._remove));
 }finally{x.close();}
});
test('disposing security restores an empty encounter without deleting the player',()=>{
 const x=fixture();try{x.law.dispose();x.law.dispose();assert.deepEqual(x.g.entities,[x.g.player]);assert.equal(x.g.scene.children.length,0);}finally{x.close();}
});

test('blocked reinforcement arrival retries without throwing or partially spawning',()=>{
 const x=fixture();try{
  x.law.onCopDown(x.g.player);x.step(.1);const count=x.g.entities.length,unitNo=x.law._unitNo;
  x.g.world.cover=[{x:0,z:0,hx:500,hz:500,top:100}];
  assert.doesNotThrow(()=>x.step(4));assert.equal(x.g.entities.length,count);assert.equal(x.law._unitNo,unitNo);assert.ok(x.law.arrival?.blocked);
  assert.doesNotThrow(()=>x.step(2));assert.equal(x.g.entities.length,count);
  x.g.world.cover=[];x.step(1.1);assert.equal(x.g.entities.length,count+2);assert.equal(x.law.arrival,null);
 }finally{x.close();}
});

test('blocked initial patrol retries when the player reaches clear ground',()=>{
 const x=fixture({cover:[{x:0,z:0,hx:500,hz:500,top:100}]});try{
  assert.equal(x.law.cops.length,0);x.step(2);assert.equal(x.law.cops.length,0);
  x.g.world.cover=[];x.step(1.1);assert.equal(x.law.cops.length,2);assert.ok(x.law.cops.every(f=>f._desertPatrol));
 }finally{x.close();}
});

test('security validates the entire group before allocating the first reinforcement',()=>{
 const x=fixture();try{
  const first=encounterGround(x.g.world,x.g.player.pos,x.law._unitNo,[],95),count=x.g.entities.length,unitNo=x.law._unitNo;
  x.g.world.heightAt=(px,pz)=>Math.hypot(px-first.x,pz-first.z)<4?2:NaN;
  assert.equal(x.law.deploy(1,2),false);assert.equal(x.g.entities.length,count);assert.equal(x.law._unitNo,unitNo);
 }finally{x.close();}
});

test('native Fighter damage reaches the desert law through Game.onHit, including funded blocks',()=>{
 const x=mainCombatFixture({mode:'powerworld'});let law;
 try{
  x.w.ARENA=1800;x.g.hud=null;x.p.team=0;
  x.g.onHit=Game.prototype.onHit;x.g.bigHit={amount:0};x.g.combo=0;x.g._p1MaxCombo=0;
  // Production actor registration minus unrelated browser-only roster widgets.
  x.g.addFighter=(def,opts)=>{const f=new Fighter(def,opts);f._game=x.g;x.g.entities.push(f);x.g.scene.add(f.obj);return f;};
  law=new DesertSecurity(x.g);x.g.ms.desertLaw=law;
  const cop=law.cops[0];cop.pos.set(0,0,8);cop.armor=0;cop._shieldHp=0;cop.resist.energy=1;
  cop.faceDir(0,-1);cop.guarding=true;cop.ki=100;const hp=cop.hp;
  cop.takeDamage(4,{src:x.p,dtype:'energy',hitstop:0});
  assert.equal(cop.hp,hp,'A funded block protects health');
  assert.equal(law.wantedLevel(x.p),1,'Shooting a raised police guard still counts as an assault');
  cop.guarding=false;cop.hitstop=0;cop.takeDamage(4,{src:x.p,dtype:'energy',hitstop:0});
  assert.ok(cop.hp<hp);assert.ok(law.heatOf(x.p)>35);
 }finally{law?.dispose();x.close();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {TYPES,clearSlotFx} from '../src/engine/abilities.js';
import {Game} from '../src/engine/game.js';
import {StudioCombat} from '../src/tool/studio-combat.js';

function fixture(){
 const world={scene:new T.Scene(),camera:new T.PerspectiveCamera(),cover:[],interiors:[],ARENA:900,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(world.scene,world),g=combat.game;
 g.onBlockedStrike=Game.prototype.onBlockedStrike;
 const texture=new T.DataTexture(new Uint8Array([255,255,255,255]),1,1);g.vfx._itex=texture;
 const a=new Fighter(ROSTER.find(d=>d.id==='webline'),{team:0}),b=new Fighter(ROSTER.find(d=>d.id==='sarge'),{team:1});
 g.entities=[a,b];g.player=a;g.isHuman=f=>f===a;
 for(const f of [a,b]){f._game=g;f.invuln=0;f.pos.set(0,0,f===a?0:24);f.faceDir(0,f===a?1:-1);world.scene.add(f.obj);f._animate(0);}
 a.aim3.set(0,0,1);
 const slot=a.slots.rmb;
 return {a,b,g,world,slot,press(){TYPES.rush(a,slot.def,slot,g,{pressed:true,dt:1/60});},tick(dt=1/60){TYPES.rush(a,slot.def,slot,g,{pressed:false,dt});},close(){a.dispose();b.dispose();combat.dispose();texture.dispose();}};
}

test('Spider Flurry cannot acquire and warp through a wall',()=>{
 const x=fixture();try{x.world.cover.push({x:0,z:12,hx:20,hz:1,top:30,h:30,r:20,projectileShape:'box'});
  const hp=x.b.hp,ki=x.a.ki;x.press();x.tick();assert.equal(x.a.ki,ki,'Blocked rush must not spend energy');assert.equal(x.b.hp,hp);assert.deepEqual(x.a.pos.toArray(),[0,0,0]);
 }finally{x.close();}
});
test('Spider Flurry measures acquisition range in 3D, not just on the ground plane',()=>{
 const x=fixture();try{x.b.pos.y=100;const ki=x.a.ki;x.press();x.tick();assert.equal(x.a.ki,ki);assert.equal(x.a.pos.y,0);}finally{x.close();}
});
test('a new wall between combo beats cancels before relocation or damage',()=>{
 const x=fixture();try{x.press();x.world.cover.push({x:0,z:12,hx:20,hz:1,top:30,h:30,r:20,projectileShape:'box'});
  const hp=x.b.hp;x.tick();assert.equal(x.b.hp,hp);assert.deepEqual(x.a.pos.toArray(),[0,0,0]);assert.equal(x.slot.combo,0);
 }finally{x.close();}
});
test('flurry cannot put the attacker into blocked space beside a clear target',()=>{
 const x=fixture();try{
  // The target's center is unobstructed, but both legacy +/-6 side landings sit in walls.
  for(const side of [-1,1])x.world.cover.push({x:6*side,z:18,hx:2,hz:3,top:25,h:25,r:3,projectileShape:'box'});
  const hp=x.b.hp;x.press();x.tick();assert.equal(x.b.hp,hp);assert.deepEqual(x.a.pos.toArray(),[0,0,0]);
 }finally{x.close();}
});
for(const field of ['staggerT','stunT','frozenT','downedT'])test(`native ${field} cancels a queued flurry rather than banking it until recovery`,()=>{
 const x=fixture();try{x.press();assert.ok(x.slot.combo>0);x.a[field]=1;x.a.update(1/60,x.g);x.a[field]=0;
  const hp=x.b.hp;x.tick();assert.equal(x.slot.combo,0);assert.equal(x.b.hp,hp);
 }finally{x.close();}
});
test('retiring powers clears committed flurry ownership',()=>{
 const x=fixture();try{x.press();clearSlotFx(x.a);const hp=x.b.hp;x.tick();assert.equal(x.b.hp,hp);assert.equal(x.slot.combo,0);assert.ok(x.slot.foe===null);}finally{x.close();}
});
test('a successful flurry retains six attributed hits and ends with no queued target',()=>{
 const x=fixture();try{
  const hits=[];x.g.onHit=(target,amount,opts)=>{if(target===x.b)hits.push({amount,source:opts.src});};
  x.press();for(let i=0;i<8;i++){x.a.hitstop=x.b.hitstop=0;x.b.invuln=0;x.tick(.1);}
  assert.equal(hits.length,6);assert.ok(hits.every(h=>h.source===x.a));assert.ok(hits.at(-1).amount>hits[0].amount);assert.equal(x.slot.combo,0);assert.ok(x.slot.foe===null,'Completed flurry must retire its target');
 }finally{x.close();}
});
test('guard rejects the first flurry hit and leaves the attacker punishable',()=>{
 const x=fixture();try{x.b.guarding=true;const hp=x.b.hp;x.press();x.tick();assert.ok(x.b.hp<hp&&x.b.hp>hp-2);assert.ok(x.a.staggerT>=.5);assert.equal(x.slot.combo,0);}finally{x.close();}
});
test('self-hitstop pauses a committed flurry without cancelling or moving it',()=>{
 const x=fixture();try{x.press();x.a.hitstop=.12;const hp=x.b.hp;x.tick(.1);assert.equal(x.b.hp,hp);assert.equal(x.slot.combo,6);assert.equal(x.a.pos.z,0);x.a.hitstop=0;x.tick();assert.ok(x.b.hp<hp);}finally{x.close();}
});
test('an out-of-range or phased victim cannot be chased by later flurry beats',()=>{
 for(const reason of ['distance','phase']){const x=fixture();try{x.press();if(reason==='distance')x.b.pos.z=180;else x.b.phase=true;const hp=x.b.hp;x.tick();assert.equal(x.b.hp,hp);assert.equal(x.slot.combo,0);assert.equal(x.a.pos.z,0);}finally{x.close();}}
});
test('airborne flurry effects stay at the struck bodies instead of appearing on the floor',()=>{
 const x=fixture();try{
  x.a.pos.y=x.b.pos.y=80;
  const previous=new Set(x.world.scene.children);x.press();
  for(let i=0;i<8;i++){x.a.hitstop=x.b.hitstop=0;x.b.invuln=0;x.tick(.1);}
  const effects=x.world.scene.children.filter(o=>!previous.has(o)&&(o.isMesh||o.isSprite));
  assert.ok(effects.length>0);assert.ok(effects.every(o=>o.position.y>75),'Aerial hit must not emit ground-level flash/rings');
 }finally{x.close();}
});

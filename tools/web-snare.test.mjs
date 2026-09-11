import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {TYPES,clearSlotFx} from '../src/engine/abilities.js';
import {StudioCombat} from '../src/tool/studio-combat.js';

function fixture(){
 const world={scene:new T.Scene(),camera:new T.PerspectiveCamera(),cover:[],interiors:[],ARENA:900,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(world.scene,world),g=combat.game;
 const texture=new T.DataTexture(new Uint8Array([255,255,255,255]),1,1);g.vfx._itex=texture;
 const a=new Fighter(ROSTER.find(d=>d.id==='webline'),{team:0}),b=new Fighter(ROSTER.find(d=>d.id==='sarge'),{team:1});
 g.entities=[a,b];g.player=a;g.isHuman=f=>f===a;
 for(const f of [a,b]){f._game=g;f.invuln=0;f.animT=0;f.pos.set(0,0,f===a?0:24);f.faceDir(0,f===a?1:-1);world.scene.add(f.obj);f._animate(0);f._sync();}
 a.aim3.set(0,0,1);a.hasAimWorld=true;b.center(a.aimWorld);
 const slot=a.slots.lmb;
 return {a,b,g,world,slot,start(){TYPES.tentacle(a,slot.def,slot,g,{pressed:true,dt:1/60});},step(n=1){for(let i=0;i<n;i++){a.update(1/60,g);b.update(1/60,g);}},close(){a.dispose();b.dispose();combat.dispose();texture.dispose();}};
}

test('actual WEBLINE snare launches a visible wrist web and takes time to seize its target',()=>{
 const x=fixture();try{
  x.start();assert.ok(x.a._webSnare?.line?.parent,'Paid web must have a rendered strand, not invisible tentacles');
  assert.equal(x.b.grabbedBy,null);x.step(4);assert.equal(x.b.grabbedBy,null,'No instant snare before tip arrives');
  x.step(16);assert.ok(x.b.grabbedBy===x.a,'Traveling web must seize target');assert.ok(x.b.pos.z<24,'Seized target reels through native velocity');
  assert.ok(x.a._webSnare.line.geometry.attributes.position.array.every(Number.isFinite));
 }finally{x.close();}
});

test('snare does not acquire behind the player or through an intervening solid',()=>{
 for(const mode of ['behind','wall']){const x=fixture();try{
  if(mode==='behind'){x.b.pos.z=-24;x.b._animate(0);}else x.world.cover.push({x:0,z:12,hx:6,hz:1,top:20,h:20,r:6,projectileShape:'box'});
  const ki=x.a.ki;x.start();assert.equal(x.a._webSnare,undefined,mode);assert.equal(x.a.ki,ki,'Invalid web must not spend energy');
 }finally{x.close();}}
});

for(const reason of ['stagger','clear','dispose'])test(`web releases the target and its scene resources on ${reason}`,()=>{
 const x=fixture();try{
  x.start();x.step(20);assert.ok(x.b.grabbedBy===x.a,'Must be snared before interruption');const line=x.a._webSnare.line;let retired=0;line.geometry.addEventListener('dispose',()=>retired++);
  if(reason==='stagger'){x.a.staggerT=1;x.step();}else if(reason==='clear')clearSlotFx(x.a);else x.a.dispose();
  assert.equal(x.b.grabbedBy,null);assert.equal(line.parent,null);assert.equal(retired,1);assert.ok(!x.a._webSnare);
 }finally{x.close();}
});

test('web pull finishes with one attributed impact and no orphan restraint',()=>{
 const x=fixture();try{
  const hp=x.b.hp;x.start();x.step(65);assert.ok(x.b.hp<hp);assert.ok(x.b.lastHitBy===x.a);assert.equal(x.b.grabbedBy,null);assert.ok(!x.a._webSnare);
 }finally{x.close();}
});

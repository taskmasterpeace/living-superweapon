import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {MeleeSystem} from '../src/engine/melee.js';
import {Game} from '../src/engine/game.js';
import {TYPES} from '../src/engine/abilities.js';
import {renderedHandContact} from './helpers/rendered-hand-contact.mjs';

function fixture(hz=120){
 const world={scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(),cover:[],interiors:[],ARENA:900,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(world.scene,world),g=combat.game;
 const a=new Fighter(structuredClone(ROSTER.find(d=>d.id==='vega')),{team:0}),b=new Fighter(structuredClone(ROSTER.find(d=>d.id==='kano')),{team:1});
 g.entities=[a,b];g.player=a;g.melee=new MeleeSystem(g);g.isFoe=(x,y)=>x!==y&&y.alive&&x.team!==y.team;
 const texture=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);g.vfx._itex=texture;g.trail=()=>{};g.audio={...g.audio,impact(){},boom(){},zap(){}};g.slowmo=()=>{};
 for(const f of [a,b]){f._game=g;f._openSky=true;f.flying=true;f.gait='airborne';f.pos.set(0,80,f===a?0:21);f.vel.set(0,0,f===a?65:0);f.animT=0;f.invuln=0;f.hp=f.maxHp=1000;world.scene.add(f.obj);}
 a.faceDir(0,1);a.aim3.set(0,0,1);b.faceDir(0,-1);
 for(let i=0;i<120;i++){a._animate(1/120);b._animate(1/120);}a._sync();b._sync();
 const hits=[],original=g.onHit.bind(g);g.onHit=(target,amount,opts,blocked)=>{
  if(target===b&&opts.strike){
   const fist=a.parts.armR.children[2].getWorldPosition(new THREE.Vector3());
   const distance=Math.min(...['torso','head','pelvis'].map(key=>{const part=b.parts[key];part.updateWorldMatrix(true,false);part.geometry.computeBoundingBox();const local=part.worldToLocal(fist.clone()),near=part.geometry.boundingBox.clampPoint(local,new THREE.Vector3());return part.localToWorld(near).distanceTo(fist);}));
   hits.push({amount,distance,rendered:renderedHandContact(a,b),fist:fist.toArray(),target:b.pos.toArray(),phase:a._abilityMeleePose?.elapsed});
  }
  original(target,amount,opts,blocked);
 };
 let started=false;const dt=1/hz,slot=a.slots.e;
 const step=(reverse=false,forward=false)=>{if(forward)a.move(new THREE.Vector3(0,0,1),dt);TYPES.melee(a,slot.def,slot,g,{pressed:!started,dt});started=true;g.melee.beginContactFrame();Game.prototype.beginBodyContactFrame.call(g);for(const f of reverse?[b,a]:[a,b])f.update(dt,g);Game.prototype.resolveBodies.call(g);g.melee.endContactFrame();};
 return {a,b,g,slot,hits,dt,step,close(){combat.dispose();a.dispose();b.dispose();texture.dispose();}};
}

test('native VEGA Rush Combo cannot damage a victim across the old visible fist gap',()=>{
 const x=fixture();try{
  for(let i=0;i<70&&!x.hits.length;i++)x.step();
  assert.equal(x.hits.length,1,'a straight aimed approach must actually connect');
  assert.ok(x.hits[0].distance<.8,`damage preceded fist/body contact: ${JSON.stringify(x.hits[0])}`);
  assert.equal(x.hits[0].amount,24,'retain the existing liked impact damage');
  assert.ok(x.hits[0].rendered.distance<.65,`rendered skinned hand has not contacted visible body: ${JSON.stringify(x.hits[0].rendered)}`);
  assert.ok(x.a.parts.g.rotation.x>1,'contact must retain prone flight');
 }finally{x.close();}
});

for(const hz of [30,60,120])for(const reverse of [false,true])test(`committed native ability fist hits once with moving target (${hz} Hz/order ${reverse})`,()=>{
 const x=fixture(hz);try{
  x.b.pos.z=16;x.b.vel.set(0,0,15);x.b._sync();
  for(let i=0;i<Math.ceil(.65*hz);i++)x.step(reverse);
  assert.equal(x.hits.length,1,JSON.stringify(x.hits));assert.equal(x.hits[0].amount,24);
 }finally{x.close();}
});

test('a victim off the actual fist path is not hit merely for being inside the old cone',()=>{
 const x=fixture();try{x.b.pos.x=5;x.b.pos.z=11;x.b._sync();for(let i=0;i<75;i++)x.step();assert.equal(x.hits.length,0,'the old wide cone is not a fist');}finally{x.close();}
});

test('grounded Rush Combo connects without requiring flight',()=>{
 const x=fixture();try{
  for(const f of [x.a,x.b]){f.flying=false;f.gait='grounded';f.pos.y=0;f.vel.set(0,0,0);f._sync();}
  x.b.pos.z=9;x.b._sync();for(let i=0;i<75;i++)x.step();
  assert.equal(x.hits.length,1,'the physical fist must also reach a standing target');
 }finally{x.close();}
});

test('a frontal guard still reduces Rush Combo damage and drains guard',()=>{
 const x=fixture();try{
  x.b.guarding=true;const meter=x.b.guardMeter;
  for(let i=0;i<75;i++)x.step();
  assert.equal(x.hits.length,1);assert.ok(x.hits[0].amount<24);assert.ok(x.b.guardMeter<meter);
 }finally{x.close();}
});

test('a blocking wall prevents a rushing fist hitting the fighter beyond it',()=>{
 const x=fixture();try{
  x.g.world.cover.push({x:0,z:13,hx:20,hz:1,r:20,h:110,top:110,projectileShape:'box'});
  for(let i=0;i<75;i++)x.step();assert.equal(x.hits.length,0);
 }finally{x.close();}
});

for(const field of ['staggerT','stunT','frozenT','downedT'])test(`interrupted ${field} ability never falls back to the cone`,()=>{
 const x=fixture();try{
  x.step();x.a[field]=.3;let cones=0;x.g.coneFoe=()=>{cones++;return x.b;};
  for(let i=0;i<55;i++)x.step();assert.equal(x.hits.length,0);assert.equal(cones,0);assert.equal(x.slot.t,0);
 }finally{x.close();}
});

test('missing physical pose cannot silently restore distance-only cone damage',()=>{
 const x=fixture();try{
  x.step();x.a._abilityMeleePose=null;let cones=0;x.g.coneFoe=()=>{cones++;return x.b;};
  x.step();assert.equal(cones,0);assert.equal(x.hits.length,0);
 }finally{x.close();}
});

test('Rush Combo retains one hit per victim, not a new one-victim total cap',()=>{
 const x=fixture();let c;try{
  for(let i=0;i<70&&!x.hits.length;i++)x.step();assert.equal(x.hits.length,1);
  c=new Fighter(structuredClone(x.b.def),{team:1});c._game=x.g;c._openSky=true;c.flying=true;c.gait='airborne';c.pos.copy(x.b.pos);c.vel.set(0,0,0);c.invuln=0;c.hp=c.maxHp=1000;c.faceDir(0,-1);x.g.world.scene.add(c.obj);
  for(let i=0;i<120;i++)c._animate(1/120);c._sync();x.g.entities.push(c);
  x.b.pos.x=100;x.b._sync();x.a.hitstop=0;
  for(let i=0;i<20&&c.hp===1000;i++)x.step();
  assert.ok(c.hp<1000,'a second physical victim within the still-active stroke should receive its legacy one hit');
 }finally{c?.dispose();x.close();}
});

function coreBox(f){
 f.obj.updateMatrixWorld(true);const box=new THREE.Box3();
 for(const key of ['head','torso','pelvis']){const p=f.parts[key];p.geometry.computeBoundingBox();box.union(p.geometry.boundingBox.clone().applyMatrix4(p.matrixWorld));}return box;
}
for(const hz of [30,60,120])for(const held of [false,true])test(`rush body cannot fly through its victim during hitstop or recovery / ${hz}Hz / forward ${held}`,()=>{
 const x=fixture(hz);try{
  let checked=0;
  for(let i=0;i<Math.ceil(hz*.65);i++){
   x.step(false,held);
   if(!x.hits.length)continue;
   if(x.a._abilityMeleePose){
    checked++;
    const attacker=coreBox(x.a),victim=coreBox(x.b);
    assert.ok(!attacker.intersectsBox(victim),`torso/head penetrated victim at ${i/hz}s; attacker ${JSON.stringify(attacker)} victim ${JSON.stringify(victim)}`);
    assert.ok(x.a.parts.g.rotation.x>.85,'contact must not snap the prone punch upright');
   }
  }
  assert.equal(x.hits.length,1);assert.ok(checked>hz*.2,'must inspect hitstop and recovery, not just first contact');
  assert.ok(x.b.pos.z>21,'victim must retain the liked forward knockback');
 }finally{x.close();}
});

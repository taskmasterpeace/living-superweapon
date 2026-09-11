import test from 'node:test';
import assert from 'node:assert/strict';
import * as abilities from '../src/engine/abilities.js';
import * as THREE from 'three';
import {Projectiles} from '../src/engine/projectiles.js';

test('changing one mouse selection cancels only its preparation without refund or shortening cooldown',()=>{
 const c={ki:12,state:'charge',slots:{q:{def:{type:'charge',cd:1},cd:3,charging:true,chargeT:.8},e:{def:{type:'charge'},charging:true,chargeT:.4}}};
 abilities.cancelHeldSlot(c,'q');
 assert.equal(c.slots.q.charging,false);assert.equal(c.slots.q.cd,3);assert.equal(c.ki,12);
 assert.equal(c.slots.e.charging,true);assert.equal(c.slots.e.chargeT,.4);assert.equal(c.state,'charge');
});
test('cancelling a nova disarms its building state so idle frames cannot keep draining or detonate',()=>{
 const c={ki:100,state:'charge',slots:{r:{def:{type:'nova',cd:5},building:true,fed:40}}};
 abilities.cancelHeldSlot(c,'r');assert.equal(c.slots.r.building,false);assert.equal(c.slots.r.fed,0);assert.equal(c.state,'idle');
 abilities.TYPES.nova(c,c.slots.r.def,c.slots.r,{}, {pressed:false,held:false,released:false,dt:.05});assert.equal(c.ki,100);
});
test('cancelling a real unlaunched sphere retires its mesh/light and leaves launched spheres alive',()=>{
 let returned=0;const game={scene:new THREE.Scene(),vfx:{borrowLight:()=>new THREE.PointLight(),returnLight:()=>returned++}};
 const manager=new Projectiles(game),c={_game:game,ki:30,state:'charge',slots:{},team:1,aim:new THREE.Vector3(0,0,1)};
 const orb=manager.spawnGrowingOrb(c,{});c.slots.r={def:{type:'growingorb',cd:4},active:orb};
 abilities.cancelHeldSlot(c,'r');assert.equal(orb.dead,true);assert.equal(c.slots.r.active,null);assert.equal(returned,1);assert.equal(game.scene.children.includes(orb.obj),false);
 manager.update(.016,game);assert.equal(manager.list.length,0);assert.equal(returned,1);assert.equal(c.ki,30);
 const launched=manager.spawnGrowingOrb(c,{});launched.launch();c.slots.r.active=launched;abilities.cancelHeldSlot(c,'r');
 assert.equal(launched.dead,false);assert.equal(c.slots.r.active,launched);launched._dispose(game);
});
test('focus loss cancels preparations and held beams without firing, refunding or deleting launched remotes',()=>{
 assert.equal(typeof abilities.cancelHeldAttacks,'function');
 let stopped=0,ended=0;const shot={},remote={end:()=>assert.fail('launched remote must survive')};
 const c={ki:30,state:'charge',_bowDrawT:.6,slots:{
  q:{def:{type:'charge',cd:1},charging:true,chargeT:.4,_chargeEntryCost:4,_chargeInvestedKi:8,sfx:{stop:()=>stopped++}},
  e:{def:{type:'beam',cd:.3},active:{end:()=>ended++}},
  f:{def:{type:'bow',cd:.5},drawing:true,drawT:.6,_loop:{stop:()=>stopped++}},
  lmb:{def:{type:'projectile',remoteDetonate:true},remoteShot:shot},
  rmb:{def:{type:'beam',remoteDetonate:true},active:remote},
 }};
 abilities.cancelHeldAttacks(c);assert.equal(c.ki,30);assert.equal(c.slots.q.charging,false);assert.equal(c.slots.q.chargeT,0);assert.equal(c.slots.q._chargeEntryCost,0);assert.equal(c.slots.q.cd,1);
 assert.equal(c.slots.f.drawing,false);assert.equal(c._bowDrawT,0);assert.equal(stopped,2);assert.equal(ended,1);assert.equal(c.slots.e.active,null);
 assert.equal(c.slots.lmb.remoteShot,shot);assert.equal(c.slots.rmb.active,remote);assert.equal(c.state,'idle');
 abilities.cancelHeldAttacks(c);assert.equal(stopped,2);assert.equal(ended,1);
});

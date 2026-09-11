import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Game} from '../src/engine/game.js';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';

test('a landed aerial Rush Combo earns a real news highlight even below the old damage cutoff',()=>{
 const a=new Fighter(ROSTER.find(d=>d.id==='vega')),b=new Fighter(ROSTER.find(d=>d.id==='kano')),events=[];
 a.pos.y=b.pos.y=80;
 const game={time:3,matchT:3,bigHit:{amount:0},isHuman:()=>false,noise(){},vfx:{flash(){}},news:{highlight(...args){events.push(args);}}};
 try{
  Game.prototype.onHit.call(game,b,24,{src:a,strike:true,kb:new THREE.Vector3(0,0,46)},false);
  assert.equal(events.length,1);assert.equal(events[0][0],'bighit');assert.equal(events[0][2].actor,a);assert.equal(events[0][2].target,b);
  events.length=0;
  Game.prototype.onHit.call(game,b,24,{src:a,strike:true,kb:new THREE.Vector3(0,0,46)},true);
  Game.prototype.onHit.call(game,b,4,{src:a,dot:true},false);
  assert.equal(events.length,0,'blocked/chip/sustain ticks must not trigger a big-hit clip');
 }finally{a.dispose();b.dispose();}
});

test('native rush particles originate at flight altitude',()=>{
 const rows=[],caster={pos:new THREE.Vector3(10,90,20),vel:new THREE.Vector3(0,0,30)};
 Game.prototype.trail.call({particles:{spawn:p=>rows.push(p)}},caster,'#fff');
 assert.equal(rows.length,5);assert.ok(rows.every(p=>p.y>90&&p.y<99));
});

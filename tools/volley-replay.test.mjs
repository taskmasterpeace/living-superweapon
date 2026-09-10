import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {runSlot} from '../src/engine/abilities.js';

test('volley consumes exactly one injected gameplay spread draw',()=>{
 const directions=[],draws=[];const c={def:{},level:1,ki:100,slots:{f:{def:{type:'volley',cost:3,spread:.3,speed:100},cd:0}},
  aim:new THREE.Vector3(0,0,1),aim3:new THREE.Vector3(0,0,1),muzzle:out=>out.set(0,5,0)};
 const g={attackRandom:()=>{draws.push(1);return .5;},projectiles:{spawnProjectile:(_c,o)=>directions.push(o.vel.clone())},audio:{blast(){}},muzzleFlash(){}};
 runSlot(c,'f',{pressed:true,held:true,dt:1/60},g);
 assert.equal(draws.length,1);assert.ok(Math.abs(directions[0].x)<1e-8);assert.equal(directions[0].z,100);assert.equal(c.ki,97);
});

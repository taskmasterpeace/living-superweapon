import test from 'node:test';import assert from 'node:assert/strict';
import {zombieSound,zombieAwareness} from '../src/engine/zombie-audio.js';
test('zombie vocals follow awareness edges and accepted events, then stop after death',()=>{
 const calls=[],actor={alive:true,def:{vocalFamily:'zombie'},pos:{x:1,y:2,z:3}},g={time:1,audio:{sample:(id,o)=>{calls.push({id,o});return true;}}};
 zombieAwareness(g,actor,false);zombieAwareness(g,actor,true);zombieAwareness(g,actor,true);assert.equal(calls.length,1);
 zombieSound(g,actor,'attack');zombieSound(g,actor,'attack');assert.equal(calls.length,2);
 zombieSound(g,actor,'hurt');zombieSound(g,actor,'hurt');assert.equal(calls.length,3);
 actor.alive=false;zombieSound(g,actor,'death');zombieSound(g,actor,'death');g.time=5;zombieSound(g,actor,'attack');assert.equal(calls.length,4);
 assert.deepEqual(calls.map(c=>c.id),['op.zombie.alert','op.zombie.attack','op.zombie.hurt','op.zombie.death']);assert.ok(calls.every(c=>c.o.pos===actor.pos));
 zombieSound(g,{alive:true,def:{},pos:{}},'attack');assert.equal(calls.length,4);
});
test('missing zombie sample uses creature fallback instead of shield sound',()=>{
 const calls=[],g={time:0,audio:{sample:id=>{calls.push(id);return !id.startsWith('op.');}}};
 zombieSound(g,{alive:true,def:{vocalFamily:'zombie'},pos:{}},'alert');assert.deepEqual(calls,['op.zombie.alert','v.beast']);
});

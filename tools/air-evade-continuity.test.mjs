import test from 'node:test';
import assert from 'node:assert/strict';
import {Fighter} from '../src/engine/entity.js';
import {performEvade} from '../src/engine/abilities.js';
import {ROSTER} from '../src/data/characters.js';
function fixture(evade){
 const f=new Fighter({...ROSTER[0],evade});f._openSky=true;f.flying=true;f.pos.set(0,120,0);f.vel.set(0,0,60);f.ki=100;f._updateGait(1);
 f.onFoot=false;
 const noop=()=>{},g={world:{ARENA:240,cover:[],interiors:[],heightAt:()=>0},afterimage:noop,trail:noop,vfx:{flash:noop,ring:noop},audio:{teleport:noop,zap:noop},particles:{burst:noop}};
 return {f,g};
}
test('air sidestep adds lateral impulse without discarding forward cruise',()=>{
 const {f,g}=fixture({kind:'dash'});try{assert.equal(performEvade(f,{x:1,z:0},g),true);assert.ok(f.vel.x>=90);assert.equal(f.vel.z,60);assert.equal(f.pos.y,120);assert.ok(f.ki<100);assert.equal(performEvade(f,{x:1,z:0},g),false);}finally{f.dispose();}
});
test('airborne blink keeps the forward velocity through its displacement',()=>{
 const {f,g}=fixture({kind:'blink'});try{assert.equal(performEvade(f,{x:-1,z:0},g),true);assert.ok(f.pos.x<0);assert.equal(f.vel.z,60);assert.equal(f.pos.y,120);}finally{f.dispose();}
});
test('MERC has a paid short teleport and a real gravity grenade',()=>{
 const d=ROSTER.find(d=>d.id==='merc'),{f,g}=fixture(d.evade);try{assert.equal(performEvade(f,{x:1,z:0},g),true);assert.ok(f.pos.x>0&&f.pos.x<=22);assert.ok(f.ki<100);assert.equal(d.abilities.e.canister,true);assert.ok(d.abilities.e.grav>0&&d.abilities.e.blast>5);}finally{f.dispose();}
});

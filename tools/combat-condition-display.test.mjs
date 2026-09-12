import test from 'node:test';
import assert from 'node:assert/strict';
import {playerStatus} from '../src/engine/player-status.js';
const fighter=()=>({def:{speed:40},hp:100,maxHp:100,ki:50,maxKi:100,guardMeter:1,vel:{x:0,y:0,z:0}});
test('active harmful conditions have visible names and recovery information',()=>{
 const p={...fighter(),sleepT:2,blindT:3,shockT:1,_corrode:4,_bleed:1,_bleedStill:2,frost:.6};
 const effects=playerStatus(p).effects;
 for(const id of ['sleep','blind','shock','corrosion','bleeding','frost'])assert.ok(effects.some(e=>e.id===id&&e.label&&e.hint&&e.harmful));
 assert.equal(effects.find(e=>e.id==='bleeding').hint,'Clotting · 2s still');
 p.vel.x=30;assert.equal(playerStatus(p).effects.find(e=>e.id==='bleeding').hint,'Stop moving to clot');
});
test('expired and cleared conditions disappear; frozen replaces frost buildup',()=>{
 const p={...fighter(),sleepT:0,blindT:-1,shockT:0,_corrode:0,_bleed:0,frost:0};
 assert.deepEqual(playerStatus(p).effects,[]);
 p.frost=.8;p.frozenT=2;
 assert.deepEqual(playerStatus(p).effects.map(e=>e.id),['frozen']);
});
test('damage over time uses player-facing condition names and expires',()=>{
 const p={...fighter(),_dots:[{kind:'burn',t:2.1},{kind:'poison',t:0}]};
 assert.deepEqual(playerStatus(p).effects.map(e=>[e.label,e.remaining]),[['Burning',3]]);
});

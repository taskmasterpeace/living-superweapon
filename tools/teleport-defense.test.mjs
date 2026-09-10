import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {performEvade} from '../src/engine/abilities.js';
import {ROSTER} from '../src/data/characters.js';
import {freshPicks,buildDef} from '../src/data/creator.js';
import {profileFromDef} from '../src/tool/studio-profile.js';
import {exportCharacter,validateCharacter} from '../src/tool/character-package.js';
function fixture(evade={kind:'blink'}){
 const f=new Fighter({...ROSTER[0],evade}),flashes=[],noop=()=>{};
 f.pos.set(0,140,0);f.flying=true;f._openSky=true;f.invuln=0;f.ki=100;
 const game={world:{ARENA:240,cover:[],interiors:[],heightAt:()=>0},vfx:{flash:p=>flashes.push(p.clone())},audio:{teleport:noop},particles:{burst:noop},afterimage:noop,
  intercept:()=>{f.pos.set(100,3,100);return true;}};
 return {f,game,flashes,close:()=>f.dispose()};
}
test('double-tap teleport respects the requested side and keeps its effect at flight altitude',()=>{
 const x=fixture();try{assert.equal(performEvade(x.f,{x:-1,z:0},x.game),true);assert.ok(x.f.pos.x< -20);assert.equal(x.f.pos.z,0);assert.equal(x.f.pos.y,140);assert.ok(x.flashes.every(p=>p.y>140));}finally{x.close();}
});
test('blink cannot start from an incapacitated fighter or a clinch, and invalid direction spends nothing',()=>{
 for(const field of ['frozenT','stunT','sleepT','downedT','hitstop','grabState','grabbing']){const x=fixture();try{x.f[field]=1;assert.equal(performEvade(x.f,{x:1,z:0},x.game),false,field);assert.equal(x.f.ki,100);}finally{x.f[field]=0;x.close();}}
 const x=fixture();try{assert.equal(performEvade(x.f,{x:0,z:0},x.game),false);assert.equal(x.f.ki,100);}finally{x.close();}
});
test('teleport resolves a legal destination before spending energy',()=>{
 const x=fixture();try{
  x.game.intercept=null;x.game.world.cover=[{x:22,z:0,hx:5,hz:5,top:170}];
  assert.equal(performEvade(x.f,{x:1,z:0},x.game),true);assert.ok(x.f.pos.x<14.8,'must not land inside cover expanded by body radius');
  x.f.evadeCd=0;x.f.pos.set(235,140,0);performEvade(x.f,{x:1,z:0},x.game);assert.ok(x.f.pos.x<=236);
 }finally{x.close();}
});
test('three teleport degrees survive custom-character package validation with distinct reach and costs',()=>{
 const rows=[];
 for(const evade of ['blink-short','blink','blink-long']){
  const picks={...freshPicks(),name:'BLINK TEST',budget:'unbound',evade,slots:{...freshPicks().slots,lmb:'heatray',rmb:'kibolt'}},def=buildDef(picks,'cx_blinktest');
  const pack=validateCharacter(exportCharacter({picks,def},profileFromDef(def)));
  assert.equal(pack.picks.evade,evade);assert.equal(def.evade.kind,'blink');
  const x=fixture(def.evade);x.game.intercept=null;try{performEvade(x.f,{x:1,z:0},x.game);rows.push({range:x.f.pos.x,cost:100-x.f.ki,cd:x.f.evadeCd});}finally{x.close();}
 }
 assert.ok(rows[0].range<rows[1].range&&rows[1].range<rows[2].range);
 assert.ok(rows[0].cost<rows[1].cost&&rows[1].cost<rows[2].cost);
 assert.ok(rows[0].cd<rows[1].cd&&rows[1].cd<rows[2].cd);
});
test('blocked destinations do not consume a cooldown, and clear space beyond a wall is reachable',()=>{
 const x=fixture();try{
  x.f.pos.set(236,140,0);assert.equal(performEvade(x.f,{x:1,z:0},x.game),false);assert.equal(x.f.evadeCd,0);assert.equal(x.f.ki,100);assert.equal(x.flashes.length,0);
  x.f.pos.set(0,140,0);x.game.world.cover=[{x:10,z:0,hx:1,hz:8,top:180}];
  assert.equal(performEvade(x.f,{x:1,z:0},x.game),true);assert.equal(x.f.pos.x,22);
 }finally{x.close();}
});
test('blink respects interior walls, ceiling clearance and high terrain at arrival',()=>{
 for(const kind of ['wall','ceiling','terrain']){const x=fixture();try{
  if(kind==='terrain')x.game.world.heightAt=(xx)=>xx>10?150:0;
  else x.game.world.interiors=[{x:22,z:0,hx:6,hz:8,top:kind==='ceiling'?147:180,walls:kind==='wall'?[{x:22,z:0,hx:6,hz:8}]:[]}];
  assert.equal(performEvade(x.f,{x:1,z:0},x.game),true);assert.ok(x.f.pos.x<14,kind);assert.equal(x.f.pos.y,140);
 }finally{x.close();}}
});

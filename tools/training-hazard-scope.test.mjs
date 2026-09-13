import test from 'node:test';import assert from 'node:assert/strict';
import {TrainingHazardScope} from '../src/engine/training-hazard-scope.js';
import {Game} from '../src/engine/game.js';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';

test('native smoke training duration and blindness cannot mutate the suspended desert zone',()=>{
 const x=mainCombatFixture({mode:'powerworld'});
 try{
  const {g,p}=x;g._smoke=[{x:0,z:0,r:20,t:10}];g._fires=[{t:8}];g._sing=[{t:9}];
  const originals=[g._smoke,g._fires,g._sing],scope=new TrainingHazardScope(g);
  g.updateSmoke(1);assert.equal(p.blindT,0);assert.equal(originals[0][0].t,10);
  g.addSmoke(0,0,20,5,p);g.updateSmoke(1);assert.equal(g._smoke[0].t,4);assert.ok(p.blindT>0);
  scope.close();scope.close();assert.equal(g._smoke,originals[0]);assert.equal(g._fires,originals[1]);assert.equal(g._sing,originals[2]);
  assert.equal(g._smoke.length,1);assert.equal(g._smoke[0].t,10);
 }finally{x.close();}
});

test('delayed training callbacks execute inside their room, but never after exit or re-entry',async()=>{
 const g={_gen:2,_timers:new Set(),_threatRoom:{active:true},reportError(e){throw e;}};
 let hits=0;const room=g._threatRoom;
 Game.prototype.later.call(g,()=>hits++,1);
 await new Promise(r=>setTimeout(r,15));assert.equal(hits,1);assert.equal(room._effectTimers.size,0);
 Game.prototype.later.call(g,()=>hits++,1);g._threatRoom={active:true};
 await new Promise(r=>setTimeout(r,15));assert.equal(hits,1);assert.equal(g._timers.size,0);
 g._threatRoom=room;Game.prototype.later.call(g,()=>hits++,1);room.active=false;
 await new Promise(r=>setTimeout(r,15));assert.equal(hits,1);
 g._threatRoom=null;Game.prototype.later.call(g,()=>hits++,1);
 await new Promise(r=>setTimeout(r,15));assert.equal(hits,2);
 Game.prototype.later.call(g,()=>hits++,1);g._gen++;
 await new Promise(r=>setTimeout(r,15));assert.equal(hits,2);
});

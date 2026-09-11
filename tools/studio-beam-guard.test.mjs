import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';

function run(defense,drain=.28){
 const scene=new THREE.Scene(),world={scene,cover:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const c=new StudioCombat(scene,world),d=structuredClone(ROSTER.find(d=>d.id==='kano'));
 c.game.vfx.impactStar=()=>{}; // Canvas sprite creation needs a browser; contact/damage remain real.
 Object.assign(d.abilities.lmb,{guardDrain:drain,guardChip:.22});
 const f=new Fighter(d);f.pos.set(0,80,0);f._openSky=true;f.flying=true;f._flyPose=1;
 c.targetDefense=defense;c.reset(f,true,'beam');
 return {c,f,step(until){for(let t=1/60;t<=until+1e-8;t+=1/60)c.step(t,1/60);},close(){c.dispose();f.dispose();}};
}
test('Studio funded guard protects HP and spends energy and meter instead of merely posing the arms',()=>{
 const open=run('open'),guard=run('guard');try{
  guard.c.target.ki=guard.c.target.maxKi=10000;const energy=guard.c.target.ki;
  open.step(2.5);guard.step(2.5);
  assert.ok(open.c.damage>0);assert.equal(guard.c.damage,0,'Funded block protects all health');
  assert.ok(guard.c.target.ki<energy,'The reached stream spends real energy');
  assert.ok(guard.c.target.guardMeter<.99&&guard.c.target.guardMeter>0);
  assert.equal(guard.c.target.guarding,true);assert.ok(guard.c.blockedContacts>0);
 }finally{open.close();guard.close();}
});
test('Studio guard break really opens the target and resets on rehearsal restart',()=>{
 const x=run('guard',4);try{x.step(2.3);assert.ok(x.c.guardBreaks>0);assert.equal(x.c.target.guarding,false);assert.ok(x.c.target.staggerT>0);
  x.c.reset(x.f,true,'beam');assert.equal(x.c.guardBreaks,0);assert.equal(x.c.blockedContacts,0);assert.equal(x.c.target.guardMeter,1);
 }finally{x.close();}
});

test('paused guard inspection cannot regenerate meter or invent additional contacts',()=>{
 const x=run('guard');try{x.step(2.5);const before={meter:x.c.target.guardMeter,damage:x.c.damage,blocked:x.c.blockedContacts};
  for(let i=0;i<90;i++)x.c.step(2.5,0,1/60);
  assert.deepEqual({meter:x.c.target.guardMeter,damage:x.c.damage,blocked:x.c.blockedContacts},before);
 }finally{x.close();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {StudioCombat,supportsAttackRehearsal} from '../src/tool/studio-combat.js';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';

test('the existing Attack rehearsal accepts construct powers',()=>{
 assert.equal(supportsAttackRehearsal({type:'construct'}),true);
});
test('Studio runs the real wall construct and removes its cover on reset',()=>{
 const scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const stage=new StudioCombat(scene,world),f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='aurum')));
 stage.slot='q';scene.add(f.obj);f._openSky=true;f.invuln=0;
 try{
  stage.reset(f,true,'attack');assert.equal(stage.slot,'q','Keep the selected construct instead of silently switching to a projectile');
  for(let i=1;i<=60;i++)stage.step(i/60,1/60);
  assert.equal(stage.game.constructs.length,1);const c=stage.game.constructs[0];
  assert.equal(c.kind,'wall');assert.equal(world.cover.length,1);
  assert.deepEqual(c.policy,{mode:'timed',kiPerSec:0,kiPerDamage:0},'Unedited Studio sources keep the native timed branch');
  assert.equal(c.obj.position.y,7);assert.equal(f.pos.y,0,'Ground-anchored constructs are rehearsed on the ground');
  stage.clear();assert.equal(world.cover.length,0);assert.equal(c.obj.parent,null);
 }finally{stage.dispose();f.dispose();}
});

test('Studio legacy timed wall survives owner KO and owner removal clears protection',()=>{
 const scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const stage=new StudioCombat(scene,world),f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='aurum')));
 scene.add(f.obj);stage.slot='q';
 try{
  stage.reset(f,true,'attack');for(let i=1;i<=60;i++)stage.step(i/60,1/60);const c=stage.game.constructs[0];
  f._ko();assert.equal(c.dead,false);assert.equal(world.cover.length,1);
  f.dispose();assert.equal(c.dead,true);assert.equal(world.cover.length,0);assert.equal(c.obj.parent,null);
 }finally{stage.dispose();f.dispose();}
});

for(const slot of ['lmb','rmb','q','e'])test(`Studio ${slot} construct rehearses its full native lifecycle`,()=>{
 const scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const stage=new StudioCombat(scene,world),f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='aurum')));
 scene.add(f.obj);f._openSky=true;f.invuln=0;stage.slot=slot;stage.elevation=35;stage.motion='pass-left';
 try{
  stage.reset(f,true,'attack');
  for(let i=1;i<=840;i++){
   stage.step(i/60,1/60);
   assert.equal(stage.pathVelocity.y,0,'Ground-anchored construct stages cannot imply vertical target motion');
  }
  assert.equal(stage.game.constructs.length,0);assert.equal(world.cover.length,0);
  assert.equal(stage.target.grabbedBy,null,'Finished constructs release any held fighter');
 }finally{stage.dispose();f.dispose();}
});

test('charged beam rehearsal reports its actual charging phase',()=>{
 const scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const stage=new StudioCombat(scene,world),f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='kano')));
 scene.add(f.obj);f._openSky=true;f.invuln=0;
 stage.slot=Object.entries(f.slots).find(([,s])=>s.def.type==='beam'&&s.def.charge)[0];
 try{stage.reset(f,true,'attack');for(let i=1;i<=60;i++)stage.step(i/60,1/60);
  assert.equal(f.slots[stage.slot].charging,true);assert.equal(stage.phase,'charging');
 }finally{stage.dispose();f.dispose();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat,supportsAttackRehearsal} from '../src/tool/studio-combat.js';

test('Vega Rush Combo is an available native Studio attack with contact and recovery phases',()=>{
 const f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='vega'))),scene=new THREE.Scene();
 const world={scene,camera:new THREE.PerspectiveCamera(),cover:[],interiors:[],ARENA:900,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(scene,world),texture=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);
 combat.game.vfx._itex=texture;f._openSky=true;f.level=10;f.flying=true;f.gait='airborne';f.pos.y=80;scene.add(f.obj);
 try{
  assert.ok(supportsAttackRehearsal(f.slots.e.def));combat.reset(f,true,'attack');combat.slot='e';combat.distance=7;
  assert.ok(combat.slots.some(([key])=>key==='e'));
  for(let i=1;i<=85;i++)combat.step(i/120,1/120);
  assert.ok(f._abilityMeleePose,'native ability presentation was not driven');assert.equal(combat.phase,'striking');
  assert.ok(combat.contacts>0&&combat.damage>0,'rehearsal did not use actual Fighter damage');
  assert.equal(combat.nominalDamage,f.slots.e.def.damage);
  for(let i=86;i<=150;i++)combat.step(i/120,1/120);
  assert.equal(combat.phase,'recovered');assert.ok(!f._abilityMeleePose);
 }finally{combat.dispose();f.dispose();texture.dispose();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {meleeWeaponFor} from '../src/engine/weapon-grip.js';

test('AEGIS starts native light attack with her visible left-hand sword',()=>{
 const scene=new THREE.Scene(),world={scene,cover:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(scene,world),f=new Fighter(structuredClone(ROSTER.find(x=>x.id==='aegis')));
 f._openSky=true;scene.add(f.obj);combat.meleeSequence='combo';combat.meleeStage='grounded';combat.reset(f,true,'melee');
 try {
  for(let i=1;i<=25;i++)combat.step(i/60,1/60);
  assert.ok(f._meleeMotion,'native light strike started');
  assert.equal(f._meleeMotion.side,-1,'the hand holding the sword must lead');
  assert.equal(f._meleeMotion.weapon?.userData.weaponKind,'sword');
  assert.ok(!f._authoredStrike?.applied,'do not apply a bare-knuckle source clip to a sword');
 } finally {f.dispose();combat.target?.dispose();}
});

test('dual knives alternate hands; a hidden blade cannot claim an attack',()=>{
 const f=new Fighter(structuredClone(ROSTER.find(x=>x.id==='talon')));
 try {
  assert.equal(meleeWeaponFor(f,1).side,1);
  assert.equal(meleeWeaponFor(f,-1).side,-1);
  const left=meleeWeaponFor(f,-1).weapon;left.visible=false;
  assert.equal(meleeWeaponFor(f,-1).side,1);
  meleeWeaponFor(f,1).weapon.visible=false;
  assert.equal(meleeWeaponFor(f),null);
 }finally{f.dispose();}
});


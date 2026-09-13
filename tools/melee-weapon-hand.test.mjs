import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {meleeWeaponFor} from '../src/engine/weapon-grip.js';

test('AEGIS starts native light attack with her visible left-hand sword',()=>{
 const scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(scene,world),f=new Fighter(structuredClone(ROSTER.find(x=>x.id==='aegis')));
 f._openSky=true;scene.add(f.obj);combat.meleeSequence='combo';combat.meleeStage='grounded';combat.reset(f,true,'melee');
 try {
  for(let i=1;i<=25;i++)combat.step(i/60,1/60);
  assert.ok(f._meleeMotion,'native light strike started');
  assert.equal(f._meleeMotion.side,-1,'the hand holding the sword must lead');
  assert.equal(f._meleeMotion.weapon?.userData.weaponKind,'sword');
  assert.equal(f._meleeMotion.weaponFamily,'slash');
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

for(const id of ['aegis','stormcall','trench'])test(`${id}: native weapon motion reaches the stationary rehearsal target`,()=>{
 const scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(scene,world),f=new Fighter(structuredClone(ROSTER.find(x=>x.id===id)));
 f._openSky=true;scene.add(f.obj);combat.meleeSequence=id==='aegis'?'combo':'heavy';combat.meleeStage='grounded';combat.reset(f,true,'melee');
 try{
  combat.game.vfx.impact=()=>{}; // Canvas-only impact artwork is checked in browser captures.
  let lastTip=null;
  for(let i=1;i<=150;i++){
   combat.step(i/60,1/60);
   if(id==='trench'&&f.mstate==='active'){
    const tip=f._meleeMotion.weapon.localToWorld(new THREE.Vector3(0,-3.9,.16));
    if(lastTip)assert.ok(tip.distanceTo(lastTip)<.8,'spear must not snap sideways at the elbow reach limit');
    lastTip=tip;
   }
  }
  assert.ok(combat.contacts>0,`weapon motion missed: ${combat.damage} damage`);
 }finally{combat.dispose();f.dispose();}
});






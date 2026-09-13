import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {Fighter,buildWeapon} from '../src/engine/entity.js';import {ROSTER} from '../src/data/characters.js';
import {alignWeaponGrip} from '../src/engine/weapon-grip.js';import {StudioCombat} from '../src/tool/studio-combat.js';
for(const kind of ['bat','nodachi'])for(const body of ['procedural','superhero-male','superhero-female'])test(`${body}: registered ${kind} has a supported native swing`,()=>{
 const def=structuredClone(ROSTER.find(x=>x.id==='vega'));def.model={...def.model,body};
 const f=new Fighter(def),scene=new T.Scene(),world={scene,camera:new T.PerspectiveCamera(),cover:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(scene,world);f._openSky=true;scene.add(f.obj);
 const bat=buildWeapon(kind,{});alignWeaponGrip(bat,1);const hand=f.parts.armR.children[2];hand.add(bat);hand.userData.gripOccupied=true;hand.userData.gripKind='cylinder';
 combat.meleeSequence='heavy';combat.meleeStage='grounded';combat.reset(f,true,'melee');combat.game.vfx.impact=()=>{};
 let samples=0,worst=0,diagnostic=null;
 try{
  for(let i=1;i<=150;i++){
   combat.step(i/60,1/60);
   if(f.staggerT>0||f.stunT>0)continue;
   f.obj.updateMatrixWorld(true);
   const grip=f.parts.armL.children[2].localToWorld(new T.Vector3(0,-.25,.12)),socket=bat.getObjectByName('weapon-support-grip').getWorldPosition(new T.Vector3());
   if(grip.distanceTo(socket)>worst){worst=grip.distanceTo(socket);const arm=f.parts.armL;diagnostic={time:i/60,shoulder:arm.getWorldPosition(new T.Vector3()).toArray(),socket:socket.toArray(),grip:grip.toArray(),reach:arm.userData.upperLength+arm.userData.foreLength};}samples++;
  }
  assert.ok(samples>0,'native active frames were sampled');
  assert.ok(worst<.12,`support hand gap ${JSON.stringify({worst,diagnostic})}`);
  assert.ok(combat.contacts>0,'the bat barrel must reach the rehearsal target');
 }finally{combat.dispose();f.dispose();}
});



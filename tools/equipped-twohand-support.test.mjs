import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {Fighter} from '../src/engine/entity.js';import {Game} from '../src/engine/game.js';
import {ROSTER} from '../src/data/characters.js';import {bladeById} from '../src/data/armory.js';
import {TYPES} from '../src/engine/abilities.js';import {StudioCombat} from '../src/tool/studio-combat.js';
for(const hero of ['sarge','merc'])for(const kind of ['bat','nodachi'])for(const flying of [false,true])test(`${hero} ${kind} ${flying?'air':'ground'}: equipped ready and attack keep support contact`,()=>{
 const f=new Fighter(structuredClone(ROSTER.find(d=>d.id===hero))),scene=new T.Scene();
 const world={scene,camera:new T.PerspectiveCamera(),cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const c=new StudioCombat(scene,world),g=c.game;g.isHuman=()=>false;g.coneFoe=()=>null;g.trail=()=>{};
 try{
  f._openSky=true;f.flying=flying;f.gait=flying?'airborne':'grounded';f.pos.set(0,flying?80:0,0);f.aim.set(0,0,1);f.aim3.copy(f.aim);
  Game.prototype.equipFrom.call(g,f,bladeById(kind),{primary:true});
  let worst=0,at=0,active=0;
  for(let i=0;i<120;i++){
   const st=f.slots.lmb;TYPES.melee(f,st.def,st,g,{pressed:i===10||i===70,dt:1/60});f.update(1/60,g);f.obj.updateMatrixWorld(true);
   const m=f._abilityMeleePose;if(m&&m.elapsed>=m.startup&&m.elapsed<m.active)active++;
   const grip=f.parts.armL.children[2].localToWorld(new T.Vector3(0,-.25,.12));
   const socket=f._gearMesh.getObjectByName('weapon-support-grip').getWorldPosition(new T.Vector3());
   const gap=grip.distanceTo(socket);if(gap>worst){worst=gap;at=i;}
  }
  assert.ok(active>=12,'two accepted swings must reach active frames');
  assert.ok(worst<.12,`support gap ${worst} at frame ${at}`);
 }finally{c.dispose();f.dispose();}
});

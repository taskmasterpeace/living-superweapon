import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {Fighter} from '../src/engine/entity.js';import {Game} from '../src/engine/game.js';
import {ROSTER} from '../src/data/characters.js';import {bladeById} from '../src/data/armory.js';
import {TYPES} from '../src/engine/abilities.js';import {snapshotWeaponSurface} from '../src/engine/melee-weapon-contact.js';
import {fistContact} from '../src/engine/melee-pose.js';import {StudioCombat} from '../src/tool/studio-combat.js';
for(const body of ['procedural','superhero-male','superhero-female'])for(const flying of [false,true])test(`${body} ${flying?'air':'ground'}: both claw sets clear torso through two swings`,()=>{
 const def=structuredClone(ROSTER.find(d=>d.id==='merc'));def.model={...def.model,body};const f=new Fighter(def),scene=new T.Scene();
 const world={scene,camera:new T.PerspectiveCamera(),cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const c=new StudioCombat(scene,world),g=c.game;g.isHuman=()=>false;g.coneFoe=()=>null;g.trail=()=>{};
 try{
  f._openSky=true;f.flying=flying;f.gait=flying?'airborne':'grounded';f.pos.set(0,flying?80:0,0);f.aim.set(0,0,1);f.aim3.copy(f.aim);
  Game.prototype.equipFrom.call(g,f,bladeById('claws'),{primary:true});
  const collisions=[],sides=new Set();let activeSamples=0;
  for(let i=0;i<120;i++){
   const st=f.slots.lmb;TYPES.melee(f,st.def,st,g,{pressed:i===10||i===70,dt:1/60});f.update(1/60,g);f.obj.updateMatrixWorld(true);
   const motion=f._abilityMeleePose;if(motion){sides.add(motion.side);if(motion.elapsed>=motion.startup&&motion.elapsed<motion.active)activeSamples++;}
   for(const [side,w]of [[1,f._gearMesh],[-1,f._gearPair]]){const surface=snapshotWeaponSurface(w);for(const p of surface.points){
    if(fistContact(p,p,f.parts.torso,surface.radius,new T.Vector3())!==Infinity){collisions.push({i,side,phase:f._abilityMeleePose?.elapsed});break;}
   }
   }
  }
  assert.equal(collisions.length,0,JSON.stringify(collisions.slice(0,12)));
  assert.deepEqual([...sides],[1,-1]);assert.ok(activeSamples>=12,'both active attack windows were sampled');
 }finally{c.dispose();f.dispose();}
});


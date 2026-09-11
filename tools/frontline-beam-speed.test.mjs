import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ROSTER} from '../src/data/characters.js';
import {Fighter} from '../src/engine/entity.js';
import {StudioCombat} from '../src/tool/studio-combat.js';

test('stock superhero beams cross full range in under 0.55 seconds, but retain finite authored travel',()=>{
 for(const hero of ROSTER)for(const def of Object.values(hero.abilities))if(def.type==='beam'){
  assert.ok(Number.isFinite(def.tipSpeed)&&def.tipSpeed>0);
  assert.ok(def.maxLen/def.tipSpeed<.55,`${hero.id} ${def.name}: ${def.maxLen/def.tipSpeed}s travel`);
 }
});

test('Studio shared native spawn uses exact authored speed and packets cannot hit before travel',()=>{
 const scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],interiors:[],ARENA:900,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(scene,world),g=combat.game,f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='vega')));
 const impactTexture=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);g.vfx._itex=impactTexture;
 const victim=new Fighter(structuredClone(ROSTER.find(d=>d.id==='kano'))),dt=1/120;
 f._openSky=true;f.flying=true;f.gait='airborne';f.pos.set(0,80,0);f.aim.set(0,0,1);f.aim3.copy(f.aim);f._game=g;
 victim.pos.set(0,80,110);victim.team=2;f.team=1;victim.invuln=0;
 scene.add(f.obj,victim.obj);g.entities=[f,victim];
 try{
  for(let i=0;i<60;i++){f.advanceActionPose(dt);f._animate(dt);}victim._animate(dt);
  const def=f.slots.rmb.def,beam=g.spawnBeamFor(f,def);f.slots.rmb.active=beam;
  assert.equal(beam.tipSpeed,def.tipSpeed);
  const initial=victim.hp;
  for(let i=0;i<8;i++){f.advanceActionPose(dt);f._animate(dt);g.projectiles.update(dt,g);}
  assert.equal(victim.hp,initial,'energy damaged a distant body before traveling');
  assert.ok(beam.tipDist<50&&beam.tipDist>=0);
  let elapsed=8*dt;
  while(victim.hp===initial&&elapsed<.7){f.advanceActionPose(dt);f._animate(dt);g.projectiles.update(dt,g);elapsed+=dt;}
  assert.ok(victim.hp<initial,'traveling stream never reached the body');
  assert.ok(elapsed<.55,`native first contact took ${elapsed}s`);
 }finally{combat.dispose();f.dispose();victim.dispose();impactTexture.dispose();}
});

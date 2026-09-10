import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {Game} from '../src/engine/game.js';
import {possess,releasePossession} from '../src/engine/systems2.js';
const make=(surface,body='superhero-male')=>new Fighter({...structuredClone(ROSTER.find(d=>d.id==='vega')),model:{surface,body}});

test('field boot materials follow native hologram and possession cloning and retirement',()=>{
 const caster=make('field'),victim=make('standard'),game={scene:new THREE.Scene(),time:0,humans:[{fighter:caster}],player:caster,isHuman:f=>f===caster,vfx:{ring(){},flash(){}},audio:{teleport(){}}};
 try{
  const original=caster.parts.legL.userData.boot.material;
  const d=Game.prototype.spawnDecoy.call(game,caster,.1);let clones=0,disposed=0;
  d.grp.traverse(o=>{if(o.material){clones++;assert.equal(o.material.opacity,.62);o.material.addEventListener('dispose',()=>disposed++);}});
  Game.prototype.updateDecoys.call(game,.2);assert.equal(game._decoys.length,0);assert.equal(disposed,clones);assert.equal(original.opacity,1);
  assert.equal(possess(caster,victim,.1,game),true);assert.equal(game.player,victim);
  const spectral=caster._possessing.spectral;let spectralMaterials=0,spectralDisposed=0;
  spectral.traverse(o=>{if(o.material){spectralMaterials++;assert.equal(o.material.opacity,.4);o.material.addEventListener('dispose',()=>spectralDisposed++);}});
  releasePossession(caster,game);assert.equal(game.player,caster);assert.equal(spectralDisposed,spectralMaterials);assert.equal(original.opacity,1);
 }finally{caster.dispose();victim.dispose();}
});
test('field boots are synchronous authored geometry on the same native foot drivers',()=>{
 for(const body of ['superhero-male','procedural']){
  const f=make('field',body);try{for(const leg of [f.parts.legL,f.parts.legR]){
   const boot=leg.userData.boot;assert.equal(boot.geometry.name,'field-boot');assert.equal(boot.parent,leg.userData.knee);
   const pieces=[];boot.traverse(o=>{if(o.isMesh)pieces.push(o);});assert.equal(pieces.length,3);assert.ok(pieces.every(p=>p.material.isMaterial&&!Array.isArray(p.material)));assert.ok(boot.visible);
   boot.geometry.computeBoundingBox();const b=boot.geometry.boundingBox;assert.ok(b.min.y>=-.381&&b.max.y<=.381);assert.ok(b.min.x>=-.321&&b.max.x<=.321);assert.ok(b.max.z<.84);
  }
  f.flying=true;f._openSky=true;f.pos.y=150;f.vel.set(0,0,60);f.aim.set(0,0,1);f.aim3.copy(f.aim);for(let i=0;i<120;i++)f._animate(1/60);
  for(const leg of [f.parts.legL,f.parts.legR])assert.ok(leg.userData.boot.getWorldPosition(new THREE.Vector3()).toArray().every(Number.isFinite));
 }finally{f.dispose();}}
});
test('standard boot fallback stays intact and field assets retire with their fighter',()=>{
 const standard=make('standard');try{assert.notEqual(standard.parts.legL.userData.boot.geometry.name,'field-boot');assert.ok(!Array.isArray(standard.parts.legL.userData.boot.material));}finally{standard.dispose();}
 const f=make('field');let geos=0,mats=0;const boots=[f.parts.legL.userData.boot,f.parts.legR.userData.boot],materials=new Set();
 for(const boot of boots)boot.traverse(o=>{if(o.geometry)o.geometry.addEventListener('dispose',()=>geos++);if(o.material)materials.add(o.material);});
 for(const m of materials)m.addEventListener('dispose',()=>mats++);
 f.dispose();assert.equal(geos,6);assert.equal(mats,materials.size);
});

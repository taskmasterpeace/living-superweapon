import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {beamVisualFamily,createBeamMaterials} from '../src/engine/beam-surface.js';
import {ROSTER} from '../src/data/characters.js';
import {Fighter} from '../src/engine/entity.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {TYPES} from '../src/engine/abilities.js';
import {Particles3D} from '../src/engine/particles3d.js';

test('thermal eye ray stays optical; flame, ice and energy retain distinct identities',()=>{
 assert.equal(beamVisualFamily({dtype:'fire',faceOrigin:true}),'energy');
 assert.equal(beamVisualFamily({dtype:'fire'}),'fire');
 assert.equal(beamVisualFamily({dtype:'cold'}),'ice');
 assert.equal(beamVisualFamily({dtype:'acid',temper:'roil'}),'energy');
 const fire=createBeamMaterials('#ff6a1a','#ffd24a',true,true,'fire');
 const energy=createBeamMaterials('#7fd4ff','#ffffff',true,true,'energy');
 const ice=createBeamMaterials('#7fd4ff','#ffffff',true,true,'ice');
 assert.notEqual(fire.core.customProgramCacheKey(),energy.core.customProgramCacheKey());
 assert.equal(ice.core.customProgramCacheKey(),energy.core.customProgramCacheKey(),'retain existing cold shader until separate frost review');
 assert.equal(fire.glow.blending,THREE.NormalBlending,'smoke must absorb, never add dark light');
 for(const set of [fire,energy,ice])for(const key of ['core','glow','tip','detail'])set[key]?.dispose();
});

function simulate(family){
 const scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],interiors:[],ARENA:900,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(scene,world),g=combat.game;
 const f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='torch')));
 f._openSky=true;f._game=g;f.pos.set(0,80,0);f.aim.set(0,0,1);f.aim3.copy(f.aim);f.flying=true;f.gait='airborne';
 scene.add(f.obj);g.entities=[f];
 try{
  for(let i=0;i<30;i++){f.advanceActionPose(1/60);f._animate(1/60);}
  const beam=g.spawnBeamFor(f,f.slots.lmb.def);beam.visualFamily=family;f.slots.lmb.active=beam;
  for(let i=0;i<90;i++){g.time+=1/60;f.ki=f.maxKi;f.advanceActionPose(1/60);f._animate(1/60);g.projectiles.update(1/60,g);}
  assert.ok(beam.core.geometry.attributes.position.array.every(Number.isFinite));
  return {path:Array.from(beam.path),velocity:Array.from(beam.pvel),dps:beam.dps,radius:beam.radius,ki:beam.kiPerSec,pn:beam.pn};
 }finally{combat.dispose();f.dispose();}
}
test('fire visual turbulence leaves traveled path, packet velocity and damage envelope unchanged',()=>{
 assert.deepEqual(simulate('fire'),simulate('energy'));
});

test('fire cone spends the same energy and emits 90 tapered particles/second at 30/60/120Hz',()=>{
 for(const hz of [30,60,120]){
  const emitted=[],c={ki:100,vel:new THREE.Vector3(),pos:new THREE.Vector3(),aim:new THREE.Vector3(0,0,1),muzzle:v=>v.set(0,6,2)},st={};
  const g={entities:[],particles:{spawn:p=>emitted.push(p)},audio:{sustain:()=>null}};
  for(let n=0;n<hz;n++)TYPES.cone(c,{dtype:'fire',kiPerSec:18,range:34,arc:1},st,g,{held:true,dt:1/hz});
  assert.equal(emitted.length,90);assert.ok(emitted.every(p=>p.shape==='flame'));
  assert.ok(Math.abs(c.ki-82)<1e-8);
 }
});
test('recycled flame particles cannot turn ordinary energy sparks into flames',()=>{
 const scene=new THREE.Scene(),p=new Particles3D(scene,1);
 p.spawn({x:0,y:5,z:0,shape:'flame'});assert.equal(p.shape[0],1);p.update(.01);
 assert.equal(p.flamePoints.visible,true);assert.equal(p.flameMat.blending,THREE.NormalBlending);
 assert.equal(p.flamePoints.geometry,p.points.geometry);
 p.spawn({x:0,y:5,z:0});assert.equal(p.shape[0],0);p.update(.01);assert.equal(p.flamePoints.visible,false);
 p.geo.dispose();p.mat.dispose();p.flameMat.dispose();p.points.removeFromParent();p.flamePoints.removeFromParent();
});

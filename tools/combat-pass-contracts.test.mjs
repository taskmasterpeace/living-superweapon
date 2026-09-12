import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {MeleeSystem} from '../src/engine/melee.js';
import {ROSTER} from '../src/data/characters.js';
import {impactMaterial,presentMaterialHit} from '../src/engine/impact-material.js';
import {meleeApproach} from '../src/data/melee-approaches.js';

test('approach distance stays a distance, not velocity multiplied by distance',()=>{
 const f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='webline'))),noop=()=>{};
 const game={audio:{swing:noop},trail:noop};const melee=new MeleeSystem(game);
 try{f._openSky=true;f.pos.set(0,0,0);f.hasAimWorld=true;f.center(f.aimWorld);f.aimWorld.z+=20;f.aim3.set(0,0,1);
 melee._beginStrike(f,'jab','light');assert.equal(f._meleeMotion.family,'pounce');assert.ok(f._meleeMotion.approachDistance>15&&f._meleeMotion.approachDistance<17);
 assert.equal(f._meleeMotion.point.z,20,'committed point stays fixed');assert.ok(f.vel.y>0);
 }finally{f.dispose();}
});
test('one shared profile per movement family, with explicit character override',()=>{
 assert.equal(meleeApproach({id:'sarge'}).family,'step');assert.equal(meleeApproach({id:'rage'}).family,'bound');assert.equal(meleeApproach({id:'sol'},true).family,'flight');assert.equal(meleeApproach({id:'custom',meleeApproach:'pounce'}).family,'pounce');
});

for(const hz of [30,60,120])test(`flight strike brakes into its committed 3D approach at ${hz}Hz`,()=>{
 const f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='sol'))),noop=()=>{};
 const melee=new MeleeSystem({audio:{swing:noop},trail:noop});
 try{
  f._openSky=true;f.flying=true;f.gait='airborne';f.pos.set(0,80,0);f.vel.set(0,-240,320);f.hasAimWorld=true;
  f.center(f.aimWorld);f.aimWorld.add(new THREE.Vector3(0,12,16));f.aim3.set(0,.6,.8);
  melee._beginStrike(f,'jab','light');
  assert.equal(f._momSpd,400,'impact retains earned speed');
  assert.ok(Math.abs(f._meleeMotion.approachDistance-16.2)<1e-6,'budget includes vertical distance');
  const start=f.pos.clone(),direction=new THREE.Vector3(0,.6,.8);
  for(let i=0;i<hz;i++){
   f.move({x:0,y:0,z:1},1/hz);f.pos.addScaledVector(f.vel,1/hz);
   assert.ok(f.pos.clone().sub(start).dot(direction)<=16.200001,'approach cannot cross its committed stop point');
  }
  assert.ok(f.pos.y>start.y,'entry follows upward target, not incoming dive');
  assert.equal(f.flying,true);assert.ok(f.vel.length()<1e-5,'brakes at reach without disabling flight');
 }finally{f.dispose();}
});

test('jumping preserves grounded roster identities instead of granting flyer approach',()=>{
 for(const [id,family]of [['sarge','step'],['webline','pounce'],['rage','bound']]){
  const def=ROSTER.find(d=>d.id===id);assert.equal(def.flightTier,0);
  assert.equal(meleeApproach(def,true).family,family);
 }
 for(const id of ['sol','rime'])assert.equal(meleeApproach(ROSTER.find(d=>d.id===id),true).family,'flight');
});
test('real fist obstacle contact damages a vehicle once through its existing owner',()=>{
 const f=new Fighter(structuredClone(ROSTER[0])),hits=[],noop=()=>{};
 try{f._openSky=true;f.pos.set(0,0,0);f.obj.updateMatrixWorld(true);const fist=f.parts.armR.children[2].getWorldPosition(new THREE.Vector3());
 const vehicle={frontlineVehicle:true,projectileShape:'box',x:fist.x,z:fist.z,hx:1,hz:1,bottom:0,top:15,h:15,hp:100};
 const game={entities:[f],isFoe:()=>false,world:{cover:[vehicle]},damageBlock:(...args)=>hits.push(args),audio:{meleeHit:noop},vfx:{contact:noop}};const m=new MeleeSystem(game);
 f.mId='jab';f.mKind='light';f.mstate='active';f.mT=.07;f.strikeIdx=0;f.strikeHit=new Set();f._meleeMotion={side:1,previous:fist.clone(),current:new THREE.Vector3(),impact:new THREE.Vector3(),dt:0};
 m.resolveContact(f);m.resolveContact(f);assert.equal(hits.length,1);assert.equal(hits[0][0],vehicle);assert.ok(hits[0][1]>0);assert.equal(hits[0][3],f);
 }finally{f.dispose();}
});
test('material feedback distinguishes metal and flesh without turning blocks into blood',()=>{
 const calls=[],game={time:1,vfx:{contact:()=>calls.push('spark')},audio:{land:()=>calls.push('metal')},particles:{burst:()=>calls.push('blood')}},point=new THREE.Vector3();
 const metal={def:{metal:true},center:()=>point},flesh={def:{},center:()=>point};assert.equal(impactMaterial(metal),'metal');assert.equal(impactMaterial(flesh),'flesh');
 presentMaterialHit(game,metal,10,{strike:true},false,{healthLost:10});presentMaterialHit(game,flesh,10,{strike:true},true,{healthLost:0});assert.deepEqual(calls,['spark','metal']);
 presentMaterialHit(game,flesh,10,{strike:true},false,{healthLost:10});assert.deepEqual(calls,['spark','metal','blood']);
});

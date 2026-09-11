import test from 'node:test';
import assert from 'node:assert/strict';
import {ChargeGather} from '../src/engine/charge-gather.js';
import {VFX} from '../src/engine/vfx.js';
import * as THREE from 'three';

test('authoring can disable charge detail and two charges remain independent',()=>{
 const a=new ChargeGather('#ffd24a',{intensity:0}),b=new ChargeGather('#55df8c',{intensity:1});
 try{a.update(.5,.4);b.update(.5,.4);assert.equal(a.visible,false);assert.equal(b.visible,true);
  const old=Array.from(b.geometry.attributes.position.array);a.update(.8,.9);assert.deepEqual(Array.from(b.geometry.attributes.position.array),old);
 }finally{a.dispose();b.dispose();}
});
test('ready charge exposes a concentrated readiness ring only near full charge',()=>{
 const a=new ChargeGather('#ffd24a');try{
  a.update(.1,.05);assert.ok(a.readyRing,'Charge needs a visible readiness stage');assert.equal(a.readyRing.visible,false);
  a.update(1,1);assert.equal(a.readyRing.visible,true);assert.ok(a.readyRing.material.opacity>0);
  assert.ok(Array.from(a.geometry.attributes.position.array).every(Number.isFinite));
 }finally{a.dispose();}
});

test('maximum authored intensity keeps charge opacity bounded',()=>{
 const a=new ChargeGather('#ffd24a',{intensity:2});try{
  a.update(1,1);assert.ok(a.readyRing.material.opacity<=1);
 }finally{a.dispose();}
});
test('beam pressure contact sprays back toward the source, not through the body',()=>{
 const particles=[],scene=new THREE.Scene(),vfx=new VFX({scene,camMode:'iso'}, {spawn:p=>particles.push(p)});
 vfx.impactStar=()=>{};
 try{vfx.contact(new THREE.Vector3(0,5,20),new THREE.Vector3(0,0,1),{pressure:true,power:1});
  assert.ok(particles.length>0);assert.ok(particles.every(p=>p.vz<0),'The body surface rejects the incoming stream');
 }finally{for(const fx of vfx.fx)fx.dispose();}
});

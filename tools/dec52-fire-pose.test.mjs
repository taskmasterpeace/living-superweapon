import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createDec52Animator} from '../src/engine/dec52-motion-library.js';

for(const hand of ['left','right'])test(`Dec-52 ${hand} fire aims level and recoils back`,async()=>{
 const b=await fs.readFile('public/models/dec52/mech/model.glb');
 const {scene}=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const a=createDec52Animator(scene,'mech'),suffix=hand==='left'?'--1':'-1';
 const shoulder=scene.getObjectByName('nanite-shoulder'+suffix),fist=scene.getObjectByName('nanite-fist'+suffix);
 const sample=t=>{a.pose('fire-'+hand,t);return fist.getWorldPosition(new T.Vector3()).sub(shoulder.getWorldPosition(new T.Vector3()));};
 try{
  const aimed=sample(.18),recoil=sample(.23);
  assert.ok(Math.abs(aimed.y)<.4,`aim is ${aimed.y} units below shoulder`);
  assert.ok(aimed.z>3,'firing arm must point forward');
  assert.ok(recoil.z<aimed.z-.04,'recoil should retract the firing hand');
  const rest=sample(0),end=sample(.5);assert.ok(rest.distanceTo(end)<1e-6);
  assert.ok(sample(.18).distanceTo(aimed)<1e-6,'seeking back from the endpoint must restore the requested pose');
 }finally{a.dispose();}
});

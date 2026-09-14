import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Fighter} from '../src/engine/entity.js';
import {loadModularCharacter} from '../src/engine/modular-character.js';
import {ROSTER} from '../src/data/characters.js';
import {resolveAnimationClip} from '../src/data/animation-catalog.js';
import {samplePoseFrame,applyAuthoredPose} from '../src/engine/authored-pose.js';
globalThis.ProgressEvent??=class{constructor(type,data){Object.assign(this,{type},data);}};
test('sampled library jab moves visible modular hand and direct seeking is repeatable',async()=>{
 const bytes=await fs.readFile('public/models/modular-hero/modular-hero.glb');
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const f=new Fighter({...ROSTER.find(d=>d.id==='vega'),model:{body:'legacy'}});
 const c=await loadModularCharacter(Object.assign(f,{def:{...f.def,model:{body:'faceted-v1'}}}),{load:async()=>gltf});
 const base=[];f.obj.traverse(o=>{if(o!==c.actor&&!c.actor.getObjectById(o.id))base.push({o,p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone()});});
 const clip=resolveAnimationClip('strike/jab'),frame=new Float64Array(45);
 const sample=t=>{for(const b of base){b.o.position.copy(b.p);b.o.quaternion.copy(b.q);b.o.scale.copy(b.s);}samplePoseFrame(clip,t,frame,false);applyAuthoredPose(f,frame,1,{legs:true,hips:true,support:true});c.poseFromNative();return c.actor.getObjectByName('DEF-handL').quaternion.clone().normalize();};
 const start=sample(0),contact=sample(.32),again=sample(0);
 assert.ok(start.angleTo(contact)>.1,'visible hand remains static');assert.ok(start.angleTo(again)<1e-6,'scrubbing depends on previous pose '+start.angleTo(again));f.dispose();
});



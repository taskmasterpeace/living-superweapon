import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {actionDraft} from '../src/engine/character-action-drafts.js';
import {samplePose} from '../src/engine/character-authoring.js';
globalThis.ProgressEvent??=class{};

test('combat candidates reach anteriorly on the actual Idle_Loop rig, on both sides',async()=>{
 const b=await fs.readFile('public/models/modular-hero/modular-hero.glb');
 const g=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const actor=g.scene,mixer=new T.AnimationMixer(actor);
 mixer.clipAction(g.animations.find(c=>c.name==='Idle_Loop')).play();mixer.setTime(0);
 const base={};actor.traverse(o=>{if(o.isBone)base[o.name]=o.quaternion.toArray();});
 const point=n=>actor.getObjectByName(n).getWorldPosition(new T.Vector3());
 for(const side of ['right','left']){
  const suffix=side==='right'?'R':'L';
  for(const action of ['Front kick','Roundhouse kick','Knee strike','Throwing axe','Boomerang throw']){
   const name=action.includes('kick')||action==='Knee strike'?action+' / '+side:action+(side==='left'?' / left':'');
   const motion=actionDraft(name,base),time=action.includes('throw')||action==='Throwing axe'?motion.markers.release:motion.markers.contact;
   for(const [n,q]of Object.entries(samplePose(motion,time)))actor.getObjectByName(n).quaternion.fromArray(q);
   actor.updateMatrixWorld(true);
   const target=action==='Knee strike'?'DEF-shin':action.includes('kick')?'DEF-foot':'DEF-hand';
   assert.ok(point(target+suffix).z>point('DEF-hips').z+.12,name+' must reach in front of the hips');
  }
 }
 for(const name of ['Front clinch entry','Rear body lock entry','Side grab entry','Neck hold / free right hand']){
  const motion=actionDraft(name,base);assert.ok(motion.markers.contact<=.2,name+' entry should be responsive');
  for(const [n,q]of Object.entries(samplePose(motion,motion.markers.contact)))actor.getObjectByName(n).quaternion.fromArray(q);
  actor.updateMatrixWorld(true);
  for(const side of name.startsWith('Neck')?['L']:['L','R'])assert.ok(point('DEF-hand'+side).z>point('DEF-hips').z+.12,name+' hands must reach anteriorly');
 }
});

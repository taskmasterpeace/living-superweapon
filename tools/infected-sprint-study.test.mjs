import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
globalThis.ProgressEvent??=class{};

test('infected sprint preserves source cadence and loops its bounded asymmetric arm derivative',async()=>{
 const sourcePath='assets-src/modular-character/source/AnimationLibrary_Godot_Standard.gltf';
 const doc=JSON.parse(await fs.readFile(sourcePath));
 for(const buffer of doc.buffers){const bytes=await fs.readFile(path.join(path.dirname(sourcePath),buffer.uri));buffer.uri='data:application/octet-stream;base64,'+bytes.toString('base64');}
 const source=await new GLTFLoader().parseAsync(JSON.stringify(doc),'');
 const bank=JSON.parse(await fs.readFile('public/models/modular-hero/motion-bank.json'));
 const entry=bank.entries.find(e=>e.take==='Infected_Sprint_Loop'),clip=T.AnimationClip.parse(entry.clip);
 const original=source.animations.find(c=>c.name==='Sprint_Loop');
 assert.equal(clip.duration,original.duration);assert.equal(entry.source.take,'Sprint_Loop');
 assert.ok(entry.derivation.includes('Visual review pending'));
 const arm=/^DEF-(upper_arm|forearm)[RL]\.quaternion$/;
 const modified=t=>arm.test(t.name)||/^DEF-(head|spine003)\.quaternion$/.test(t.name);
 for(const track of original.tracks.filter(t=>!modified(t))){
  const saved=clip.tracks.find(t=>t.name===track.name);assert.ok(saved,track.name);
  assert.deepEqual(saved.times,track.times,track.name+' timing');
  assert.deepEqual(saved.values,track.values,track.name+' original source values');
 }
 const arms=clip.tracks.filter(t=>arm.test(t.name));assert.equal(arms.length,4);
 for(const track of arms){
  assert.deepEqual(track.values.slice(0,4),track.values.slice(-4),track.name+' loop seam');
  assert.ok(track.times.length>=60,'flail needs full-cycle samples');
 }
 const bytes=await fs.readFile('public/models/modular-hero/modular-hero.glb');
 const {scene,animations}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const mixer=new T.AnimationMixer(scene);
 // The authored arm baseline is the same Idle_Loop(0) used by the editor.
 mixer.clipAction(animations.find(c=>c.name==='Idle_Loop')).play();mixer.setTime(0);mixer.stopAllAction();
 mixer.clipAction(clip).play();
 const point=n=>scene.getObjectByName(n).getWorldPosition(new T.Vector3());
 let minFlex=Infinity,maxFlex=0;
 for(let i=0;i<120;i++){
  mixer.setTime(i/120*clip.duration);scene.updateMatrixWorld(true);
  const hips=point('DEF-hips');
  for(const side of ['L','R']){
   const hand=point('DEF-hand'+side),elbow=point('DEF-forearm'+side),shoulder=point('DEF-upper_arm'+side);
   assert.ok(hand.z-hips.z>.1,'wrist crossed behind body at sample '+i+' '+side);
   const flex=Math.PI-shoulder.sub(elbow).angleTo(hand.sub(elbow));
   minFlex=Math.min(minFlex,flex);maxFlex=Math.max(maxFlex,flex);
   assert.ok(flex>.6&&flex<1.6,'elbow exceeded bounded flexion at sample '+i+' '+side);
  }
 }
 assert.ok(maxFlex-minFlex>.3,'arms should vary through the loop');
 mixer.stopAllAction();mixer.uncacheRoot(scene);
});

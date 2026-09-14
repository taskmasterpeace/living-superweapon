import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {MeleeRecording,applyReviewPose} from '../src/engine/melee-recording.js';
globalThis.ProgressEvent??=class{};
test('delayed real modular attachment replaces bound template before capturing any fallback frame',async()=>{
 let resolve;const ready=new Promise(r=>resolve=r),obj=new T.Group(),old=new T.Group();old.name='old-procedural';obj.add(old);
 const f={obj,hp:100,ki:100,alive:true,_modularReady:ready},r=new MeleeRecording();r.bind([f]);r.capture(0);assert.equal(r.frames.length,0,'pending modular load must not record old body');
 const b=await fs.readFile('public/models/modular-hero/modular-hero.glb'),g=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');old.visible=false;obj.add(g.scene);f._modularCharacter={model:g.scene};resolve();await ready;
 r.capture(.1);const model=r.actors[0].template.model;assert.ok(model.getObjectByName('DEF-handR'),'template includes loaded bones');assert.equal(model.getObjectByName('old-procedural').visible,false);
 g.scene.getObjectByName('DEF-handR').rotation.x+=.3;r.capture(.2);const nodes=r.actors[0].template.nodes;
 assert.equal(r.frames[0].actors[0].pose.length,nodes.length*12);applyReviewPose(nodes,r.frames[0].actors[0].pose,r.frames[1].actors[0].pose,1);
 assert.ok(nodes.every(n=>n.position.toArray().every(Number.isFinite)));assert.notEqual(model.getObjectByName('DEF-handR'),g.scene.getObjectByName('DEF-handR'));
 // Replacement cannot mix old skeleton indices with a new appearance.
 f._modularCharacter={model:g.scene};r.capture(.3);assert.equal(r.frames.length,1);assert.equal(r.frames[0].time,.3);f._modularCharacter=null;f._modularError='load failed';r.capture(.4);assert.equal(r.frames.length,0);assert.equal(r.status,'model-load-failed');r.clear();
});

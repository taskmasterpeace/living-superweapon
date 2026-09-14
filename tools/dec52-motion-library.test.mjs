import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {buildDec52Clips,createDec52Animator} from '../src/engine/dec52-motion-library.js';
for(const family of ['rat','hound','mech'])test(family+' clips retain pivots, loop endpoints and diagonal gait',async()=>{
 const b=await fs.readFile('public/models/dec52/'+family+'/model.glb'),g=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');const clips=buildDec52Clips(g.scene,family);assert.ok(clips.length>=5);
 const positions=new Map();g.scene.traverse(o=>positions.set(o,o.position.clone()));const animator=createDec52Animator(g.scene,family);
 for(const clip of clips){assert.ok(clip.validate());for(const t of clip.tracks){assert.ok(g.scene.getObjectByName(t.name.split('.')[0]));if(clip.userData.loop)assert.ok(new T.Quaternion().fromArray(t.values,0).normalize().angleTo(new T.Quaternion().fromArray(t.values,t.values.length-4).normalize())<1e-5);}
 for(const phase of [0,.25,.5,.75,1]){animator.pose(clip.userData.action,phase*clip.duration);for(const [o,p]of positions){assert.ok(o.position.distanceTo(p)<1e-8);assert.ok(o.matrixWorld.elements.every(Number.isFinite));}}
 }
 if(family!=='mech'){animator.pose('walk',.3);const front=g.scene.getObjectByName('nanite-hip--1-true'),rear=g.scene.getObjectByName('nanite-hip--1-false');assert.ok(front.rotation.x*rear.rotation.x<0,'front/rear on same side must alternate');}
 animator.dispose();
});

import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {actionDraft} from '../src/engine/character-action-drafts.js';
globalThis.ProgressEvent??=class{constructor(type,data){Object.assign(this,{type},data);}};
test('ground pickup derives body lowering from the actual foot anchors',async()=>{
 const b=await fs.readFile('public/models/modular-hero/modular-hero.glb'),g=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),''),actor=g.scene,pose={};
 actor.traverse(o=>{if(o.isBone)pose[o.name]=o.quaternion.toArray();});const hips=actor.getObjectByName('DEF-hips'),original=hips.position.clone(),root=actor.position.clone();
 const m=actionDraft('Ground pickup',pose,actor);assert.ok(m.keys.every(k=>k.bodyPosition),'grounded keys lack body translation');
 assert.ok(hips.position.equals(original));assert.ok(actor.position.equals(root));
 let floor;
 for(const key of m.keys){for(const [name,q]of Object.entries(key.pose))actor.getObjectByName(name).quaternion.fromArray(q);hips.position.fromArray(key.bodyPosition);actor.updateMatrixWorld(true);
  const y=Math.min(...['DEF-footL','DEF-footR'].map(n=>actor.getObjectByName(n).getWorldPosition(new T.Vector3()).y));floor??=y;assert.ok(Math.abs(y-floor)<1e-5,'foot anchor lost its support plane');
 }
});

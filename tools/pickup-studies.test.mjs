import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {actionDraft} from '../src/engine/character-action-drafts.js';
import {samplePose} from '../src/engine/character-authoring.js';
import {Quaternion} from 'three';
globalThis.ProgressEvent??=class{constructor(type,data){Object.assign(this,{type},data);}};
test('pickup studies articulate both arms and lower body on the production rig',async()=>{
 const b=await fs.readFile('public/models/modular-hero/modular-hero.glb');
 const g=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const base={};g.scene.traverse(o=>{if(o.isBone)base[o.name]=o.quaternion.toArray();});
 for(const name of ['Ground pickup','Flying pickup']){
  const m=actionDraft(name,base),contact=samplePose(m,m.markers.contact);
  for(const bone of ['DEF-upper_armL','DEF-upper_armR','DEF-thighL','DEF-thighR']){
   assert.ok(new Quaternion().fromArray(base[bone]).angleTo(new Quaternion().fromArray(contact[bone]))>.1,`${name}: ${bone} stayed at idle`);
  }
  assert.deepEqual(samplePose(m,m.duration),base,'exit returns to the supplied pose');
  assert.equal(m.status,'candidate');
 }
});

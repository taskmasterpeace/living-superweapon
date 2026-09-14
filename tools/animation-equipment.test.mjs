import {THROW_BODY_STUDIES} from '../src/engine/character-combat-studies.js';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {createAnimationEquipment,recommendationForTake} from '../src/tool/animation-equipment.js';
globalThis.ProgressEvent??=class{};
test('exact source recommendations avoid guessing ambiguous throwing takes',()=>{
 for(const [name,study]of Object.entries(THROW_BODY_STUDIES)){const pick=recommendationForTake(name);assert.notEqual(pick.weapon,'none',name);assert.equal(pick.hand,study.hand||'right',name);}
 assert.equal(recommendationForTake('Sword_Regular_A').weapon,'sword');assert.equal(recommendationForTake('Throw').weapon,'none');assert.equal(recommendationForTake('Throwing axe / left').hand,'left');assert.equal(recommendationForTake('Boomerang throw / left').weapon,'boomerang');
});
test('actual GLB props follow chosen hand without changing pose and dispose owned resources',async()=>{
 const b=await fs.readFile('public/models/modular-hero/modular-hero.glb'),g=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const actor=g.scene,base=new Map();actor.traverse(n=>{if(n.isBone)base.set(n,n.quaternion.clone());});const api=createAnimationEquipment(actor);
 for(const hand of ['left','right'])for(const weapon of ['sword','axe','boomerang','rifle','pistol']){
  const result=api.set({weapon,hand,shield:false}),node=actor.getObjectByName(['sword','axe'].includes(weapon)?'review-'+weapon:'animation-preview-'+weapon),bone=actor.getObjectByName('DEF-hand'+(hand==='left'?'L':'R'));
  assert.equal(node.parent,bone);assert.equal(node.visible,true);actor.updateMatrixWorld(true);const before=node.getWorldPosition(new T.Vector3());bone.rotation.x+=.2;actor.updateMatrixWorld(true);assert.ok(node.getWorldPosition(new T.Vector3()).distanceTo(before)>.001);bone.quaternion.copy(base.get(bone));
  if(weapon==='rifle')assert.match(result.warning,/unproven/);
 }
 api.set({weapon:'auto',hand:'auto'},'Throwing axe / left');assert.equal(api.state.hand,'left');api.set({weapon:'none',hand:'left',shield:true});assert.equal(actor.getObjectByName('review-shield').visible,true);assert.equal(actor.getObjectByName('review-shield').parent,actor.getObjectByName('DEF-handL'));
 for(const [bone,q]of base)assert.deepEqual(bone.quaternion.toArray(),q.toArray(),'preview did not author pose');
 let disposed=0;actor.getObjectByName('animation-preview-rifle').traverse(n=>n.geometry?.addEventListener('dispose',()=>disposed++));api.dispose();api.dispose();assert.ok(disposed>0);assert.equal(actor.getObjectByName('review-sword'),undefined);assert.equal(actor.getObjectByName('animation-preview-rifle'),undefined);assert.ok(actor.getObjectByName('DEF-handR'));
});


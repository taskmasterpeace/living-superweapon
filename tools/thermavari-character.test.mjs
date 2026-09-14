import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createCreatureActor,CREATURE_RECIPES} from '../src/engine/creature-character.js';
import {unitsToMeters} from '../src/core/world-units.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
test('Thermavari has separate digitigrade joints, correct scale and playable candidate clips',async()=>{
 const c=await createCreatureActor(CREATURE_RECIPES.thermavari);
 try{
  c.sample('Idle',0);const b=new T.Box3().setFromObject(c.actor);
  assert.ok(Math.abs(unitsToMeters(b.max.y-b.min.y)-2.286)<1e-5);
  assert.ok(Math.abs(b.min.y)<1e-6);
  for(const side of ['L','R']){
   const knee=c.actor.getObjectByName('therma-knee'+side),hock=c.actor.getObjectByName('therma-hock'+side),foot=c.actor.getObjectByName('therma-foot'+side);
   assert.equal(hock.parent,knee);assert.equal(foot.parent,hock);
   assert.ok(hock.position.z<0&&foot.position.z>0,'hock must bend back before toe returns forward');
   assert.ok(c.actor.getObjectByName('socket-weapon'+side));
  }
  const root=c.root.position.clone();
  for(const [name,clip]of c.clips){
   assert.equal(clip.userData.status,'candidate');assert.ok(clip.validate());
   for(const phase of [0,.25,.5,.75,1]){
    c.sample(name,phase);assert.ok(c.root.position.equals(root));
    c.actor.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));
   }
  }
 }finally{c.dispose();}
});

test('Thermavari animated GLB roundtrip preserves joints and five clips',async()=>{
 const previous=globalThis.FileReader;
 globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();});}};
 const c=await createCreatureActor(CREATURE_RECIPES.thermavari);
 try{
  c.sample('Idle',0);
  const data=await new GLTFExporter().parseAsync(c.root,{binary:true,animations:[...c.clips.values()]});
  const loaded=await new GLTFLoader().parseAsync(data,'');
  assert.equal(loaded.animations.length,5);
  for(const name of ['therma-hockL','therma-hockR','socket-weaponL','socket-weaponR'])assert.ok(loaded.scene.getObjectByName(name));
  const mixer=new T.AnimationMixer(loaded.scene);mixer.clipAction(loaded.animations.find(c=>c.name==='Walk')).play();mixer.update(.3);
  assert.ok(Math.abs(loaded.scene.getObjectByName('therma-hipL').rotation.x)>.1);
  mixer.stopAllAction();mixer.uncacheRoot(loaded.scene);
 }finally{c.dispose();if(previous)globalThis.FileReader=previous;else delete globalThis.FileReader;}
});

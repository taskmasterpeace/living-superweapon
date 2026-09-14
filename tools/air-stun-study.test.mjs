import fs from 'node:fs/promises';import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {actionDraft} from '../src/engine/character-action-drafts.js';import {samplePose} from '../src/engine/character-authoring.js';
globalThis.ProgressEvent??=class{};
test('Air stunned uses whole body on Idle_Loop without stretching or reversing elbows',async()=>{
 const b=await fs.readFile('public/models/modular-hero/modular-hero.glb'),g=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const mixer=new T.AnimationMixer(g.scene);mixer.clipAction(g.animations.find(c=>c.name==='Idle_Loop')).play();mixer.setTime(0);g.scene.updateMatrixWorld(true);
 const base={},positions={},scales={},frames={};g.scene.traverse(o=>{if(o.isBone){base[o.name]=o.quaternion.toArray();positions[o.name]=o.position.clone();scales[o.name]=o.scale.clone();}});
 for(const side of ['L','R'])frames[side]=g.scene.getObjectByName('DEF-upper_arm'+side).parent.getWorldQuaternion(new T.Quaternion());
 const root=g.scene.position.clone(),motion=actionDraft('Air stunned',base,g.scene);
 assert.equal(motion.status,'candidate');assert.equal(motion.duration,2);assert.equal(motion.markers.release,1.5);
 for(const phase of [0,.25,.5,.75,1]){
  const pose=samplePose(motion,phase*motion.duration);
  for(const [name,q]of Object.entries(pose))g.scene.getObjectByName(name).quaternion.fromArray(q);g.scene.updateMatrixWorld(true);
  for(const name of ['DEF-hips','DEF-neck','DEF-upper_armL','DEF-upper_armR','DEF-thighL','DEF-thighR','DEF-shinL','DEF-shinR'])assert.ok(new T.Quaternion().fromArray(base[name]).angleTo(g.scene.getObjectByName(name).quaternion)>.1,`${phase}: ${name} unarticulated`);
  for(const side of ['L','R']){
   const bone=n=>g.scene.getObjectByName('DEF-'+n+side),pos=n=>bone(n).getWorldPosition(new T.Vector3()),shoulder=pos('upper_arm'),elbow=pos('forearm'),hand=pos('hand');
   const forward=new T.Vector3(0,0,1).applyQuaternion(bone('upper_arm').parent.getWorldQuaternion(new T.Quaternion()).multiply(frames[side].clone().invert()));
   assert.ok(hand.clone().sub(elbow).dot(forward)>-.03,`${phase}/${side}: elbow bends backwards`);
   const bend=elbow.clone().sub(shoulder).angleTo(hand.clone().sub(elbow));assert.ok(bend>.3&&bend<1.6,'soft elbow rather than rigid/hyperfolded arm');
  }
  for(const [name,position]of Object.entries(positions)){const bone=g.scene.getObjectByName(name);assert.deepEqual(bone.position,position);assert.deepEqual(bone.scale,scales[name]);}
  assert.deepEqual(g.scene.position,root);assert.ok(motion.keys.every(k=>!k.bodyPosition),'no authored launch trajectory');
 }
 assert.notDeepEqual(samplePose(motion,.5)['DEF-shinR'],samplePose(motion,1.5)['DEF-shinR'],'limbs softly trail over time');
});

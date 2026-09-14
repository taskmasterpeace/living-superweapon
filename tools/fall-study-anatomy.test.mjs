import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {fullBodyStudy} from '../src/engine/character-full-body-studies.js';
import {samplePose} from '../src/engine/character-authoring.js';
globalThis.ProgressEvent??=class{constructor(type,data){Object.assign(this,{type},data);}};

test('fall candidates keep wrists anterior and elbows flexed on the real rig at quarter phases',async()=>{
 for(const baseline of ['bind','Idle_Loop']){
  const b=await fs.readFile('public/models/modular-hero/modular-hero.glb');
  const gltf=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
  const actor=gltf.scene;
  if(baseline==='Idle_Loop'){const mixer=new T.AnimationMixer(actor);mixer.clipAction(gltf.animations.find(c=>c.name===baseline)).play();mixer.setTime(0);}
  const base={};actor.traverse(o=>{if(o.isBone)base[o.name]=o.quaternion.toArray();});
  const position=name=>actor.getObjectByName(name).getWorldPosition(new T.Vector3());
  const root=actor.position.clone();
  for(const name of ['Flailing fall','Curled backward fall']){
   const motion=fullBodyStudy(name,base);
   for(const phase of [.25,.5,.75,1]){
    for(const [bone,q]of Object.entries(samplePose(motion,phase*motion.duration)))actor.getObjectByName(bone).quaternion.fromArray(q);
    actor.updateMatrixWorld(true);
    const chest=actor.getObjectByName('DEF-spine003');
    for(const side of ['L','R']){
     const shoulder=position('DEF-upper_arm'+side),elbow=position('DEF-forearm'+side),hand=position('DEF-hand'+side);
     const label=`${baseline} / ${name} / ${phase} / ${side}`;
     const frontHand=chest.worldToLocal(hand.clone()),frontElbow=chest.worldToLocal(elbow.clone());
     assert.ok(frontHand.z>0,label+' wrist behind torso');
     assert.ok(frontHand.z-frontElbow.z>.05,label+' wrist bends backward behind elbow');
     const bend=elbow.clone().sub(shoulder).angleTo(hand.clone().sub(elbow));
     assert.ok(bend>.15&&bend<2.5,label+' elbow straight or overfolded');
     assert.ok(Math.abs(hand.distanceTo(elbow)-.273)<.01,label+' forearm stretched');
    }
    assert.ok(actor.position.equals(root),'study must not move simulation root');
   }
  }
 }
});

test('grapple study keeps catch hand overhead while free limbs articulate on the real idle rig',async()=>{
 const b=await fs.readFile('public/models/modular-hero/modular-hero.glb');
 const gltf=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const actor=gltf.scene,mixer=new T.AnimationMixer(actor);
 mixer.clipAction(gltf.animations.find(c=>c.name==='Idle_Loop')).play();mixer.setTime(0);
 const base={};actor.traverse(o=>{if(o.isBone)base[o.name]=o.quaternion.toArray();});
 const motion=fullBodyStudy('Grappling hook deploy and hang',base),positions=[];
 const point=name=>actor.getObjectByName(name).getWorldPosition(new T.Vector3());
 for(const phase of [.25,.5,.75]){
  for(const [bone,q]of Object.entries(samplePose(motion,phase*motion.duration)))actor.getObjectByName(bone).quaternion.fromArray(q);
  actor.updateMatrixWorld(true);
  const hand=point('DEF-handR'),shoulder=point('DEF-upper_armR');
  assert.ok(hand.y-shoulder.y>.2,`${phase}: catch hand no longer overhead`);
  assert.ok(hand.z-shoulder.z>.15,`${phase}: catch hand fell behind body`);
  positions.push({hand:point('DEF-handL'),leg:point('DEF-footL')});
 }
 assert.ok(positions[0].hand.distanceTo(positions[1].hand)>.04,'free arm frozen through hang');
 assert.ok(positions[0].leg.distanceTo(positions[1].leg)>.04,'legs frozen through hang');
 const start=samplePose(motion,0),end=samplePose(motion,motion.duration);
 for(const bone of Object.keys(base))assert.deepEqual(end[bone],start[bone],'release must return to baseline');
});

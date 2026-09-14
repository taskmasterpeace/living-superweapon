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

test('actual rig: cough hand stays at face, burn hand stays in front at quarter samples',async()=>{
 const b=await fs.readFile('public/models/modular-hero/modular-hero.glb'),g=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const base={};g.scene.traverse(o=>{if(o.isBone)base[o.name]=o.quaternion.toArray();});
 const {Vector3}=await import('three');
 for(const name of ['Poison / gas','Burn / acid']){
  const motion=actionDraft(name,base,g.scene);
  for(const fraction of [0,.25,.5,.75]){
   for(const [n,q]of Object.entries(samplePose(motion,motion.duration*fraction)))g.scene.getObjectByName(n).quaternion.fromArray(q);
   g.scene.updateMatrixWorld(true);
   const hand=g.scene.getObjectByName('DEF-handR').getWorldPosition(new Vector3()),head=g.scene.getObjectByName('DEF-head').getWorldPosition(new Vector3());
   assert.ok(hand.z>.1,`${name}/${fraction}: hand behind body`);
   if(name==='Poison / gas')assert.ok(hand.distanceTo(head)<.22,`cough hand too far from face at ${fraction}`);
   else assert.ok(hand.y>1.15&&hand.y<1.45,`burn hand outside torso at ${fraction}`);
  }
 }
});
test('actual rig: flying pickup opens before capture; ground pickup lowers then raises both hands overhead',async()=>{
 const b=await fs.readFile('public/models/modular-hero/modular-hero.glb'),g=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const base={};g.scene.traverse(o=>{if(o.isBone)base[o.name]=o.quaternion.toArray();});
 const {Vector3}=await import('three'),{sampleBodyPosition}=await import('../src/engine/character-authoring.js'),hips=g.scene.getObjectByName('DEF-hips'),rest=hips.position.clone();
 for(const name of ['Flying pickup','Ground pickup']){
  hips.position.copy(rest);const motion=actionDraft(name,base,g.scene),rows=[];
  for(const fraction of [0,.25,.5,.75]){
   for(const [n,q]of Object.entries(samplePose(motion,motion.duration*fraction)))g.scene.getObjectByName(n).quaternion.fromArray(q);
   hips.position.copy(rest);const body=sampleBodyPosition(motion,motion.duration*fraction);if(body)hips.position.fromArray(body);g.scene.updateMatrixWorld(true);
   const hand=g.scene.getObjectByName('DEF-handR').getWorldPosition(new Vector3()),left=g.scene.getObjectByName('DEF-handL').getWorldPosition(new Vector3()),head=g.scene.getObjectByName('DEF-head').getWorldPosition(new Vector3());rows.push({hand,left,head});
   assert.ok(hand.distanceTo(left)<1.1,`${name}/${fraction}: arms spread wider than carry`);
  }
  if(name==='Ground pickup'){
   assert.ok(rows[1].hand.y<rows[0].hand.y-.25,'pickup must visibly lower hands');
   assert.ok(rows[3].hand.y>rows[3].head.y+.2,'right hand reaches overhead');
   assert.ok(rows[3].left.y>rows[3].head.y+.2,'left hand reaches overhead');
  }else assert.ok(rows[2].hand.z>rows[0].hand.z,'flying pickup reaches forward');
 }
});

test('Idle_Loop baseline: flying pickup opens around payload then closes while reaching forward',async()=>{
 const b=await fs.readFile('public/models/modular-hero/modular-hero.glb'),g=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const {AnimationMixer,Vector3}=await import('three'),mixer=new AnimationMixer(g.scene);
 mixer.clipAction(g.animations.find(c=>c.name==='Idle_Loop')).play();mixer.setTime(0);
 const base={};g.scene.traverse(o=>{if(o.isBone)base[o.name]=o.quaternion.toArray();});
 const motion=actionDraft('Flying pickup',base,g.scene),rows=[];
 for(const t of [0,.144,motion.markers.contact,.6]){
  for(const [n,q]of Object.entries(samplePose(motion,t)))g.scene.getObjectByName(n).quaternion.fromArray(q);g.scene.updateMatrixWorld(true);
  const r=g.scene.getObjectByName('DEF-handR').getWorldPosition(new Vector3()),l=g.scene.getObjectByName('DEF-handL').getWorldPosition(new Vector3());rows.push({span:r.distanceTo(l),forward:(r.z+l.z)/2});
 }
 assert.ok(rows[0].span>.6&&rows[0].span<1.1,'open arms allow payload clearance without T-pose');
 assert.ok(rows[0].span>rows[2].span+.15,'arms close toward contact');
 assert.ok(rows[2].span>.25,'captured wrists are not together');
 assert.ok(rows[2].forward>rows[0].forward,'hands reach forward while closing');
 assert.deepEqual(samplePose(motion,motion.duration),base,'returns to actual idle');
});

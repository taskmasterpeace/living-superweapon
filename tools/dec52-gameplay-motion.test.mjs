import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {createDec52GameplayMotion} from '../src/engine/dec52-gameplay-motion.js';
test('real hound follows accepted actions, freezes hitstop and leaves root motion alone',async()=>{
 const b=await fs.readFile('public/models/dec52/hound/model.glb'),g=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const a=createDec52GameplayMotion(g.scene,'hound'),s={velocity:{x:0,z:2}},root=g.scene.position.clone();
 assert.equal(a.update(s,.1).action,'walk');s.velocity.z=6;assert.equal(a.update(s,.1).action,'run');
 s.attackToken=1;assert.equal(a.update(s,.1).action,'bite');const before=a.update(s,0).time;
 s.hitstop=true;assert.equal(a.update(s,1).time,before);s.hitstop=false;
 assert.equal(a.update(s,1).finished,true);assert.equal(a.update(s,.1).action,'run','held action token retriggered bite');
 s.attackToken=2;assert.equal(a.update(s,.1).action,'bite');s.incapacitated=true;a.update(s,.5);s.incapacitated=false;assert.equal(a.update(s,.1).action,'run');
 s.jumpToken=1;assert.equal(a.update(s,.1).action,'jump');a.update(s,2);s.flying=true;assert.equal(a.update(s,.1).action,'flight');
 assert.ok(root.equals(g.scene.position));assert.throws(()=>a.update(s,NaN));a.dispose();
});

test('Dec-52 hit interrupts attack and shutdown completes without restarting',async()=>{
 for(const family of ['rat','hound','mech']){
  const b=await fs.readFile(`public/models/dec52/${family}/model.glb`),g=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
  const a=createDec52GameplayMotion(g.scene,family),root=g.scene.position.clone(),s={attackToken:1,hitToken:1};
  assert.equal(a.update(s,.1).action,'hit');a.update(s,1);assert.equal(a.update(s,.1).action,'idle');
  s.dead=true;const first=a.update(s,.1);assert.equal(first.action,'shutdown');assert.equal(first.finished,false);
  assert.equal(a.update(s,2).finished,true);const last=a.update(s,.1);assert.equal(last.finished,true);assert.ok(last.time>first.time);
  assert.ok(root.equals(g.scene.position));a.dispose();
 }
});

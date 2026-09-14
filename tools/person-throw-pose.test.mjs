import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {beginPersonThrowPose,advancePersonThrowPose,animatePersonThrowPose,animatePersonThrowWindup} from '../src/engine/person-throw-pose.js';
function fighter(){const arm=()=>{const a=new T.Group();a.add(new T.Group());return a;};return {parts:{armL:arm(),armR:arm()},pos:new T.Vector3(1,2,3),vel:new T.Vector3(2,3,4)};}
test('release pose preserves initial arms, blends to base and leaves simulation untouched',()=>{
 const f=fighter();f.parts.armR.rotation.x=1.4;beginPersonThrowPose(f);f.parts.armR.rotation.x=0;animatePersonThrowPose(f);assert.ok(Math.abs(f.parts.armR.rotation.x-1.4)<1e-6);
 advancePersonThrowPose(f,.15);f.parts.armR.rotation.x=0;animatePersonThrowPose(f);assert.ok(Math.abs(f.parts.armR.rotation.x-.7)<1e-6);
 advancePersonThrowPose(f,.15);assert.equal(f._personThrowPose,null);assert.deepEqual(f.pos.toArray(),[1,2,3]);assert.deepEqual(f.vel.toArray(),[2,3,4]);
});
test('new actions and incapacitation cancel release recovery; hitstop freezes it',()=>{
 for(const state of [{state:'ko'},{stunT:1},{mstate:'startup'},{grabState:'startup'},{guarding:true}]){const f=fighter();beginPersonThrowPose(f);Object.assign(f,state);advancePersonThrowPose(f,.01);assert.equal(f._personThrowPose,null);}
 const f=fighter();beginPersonThrowPose(f);f.hitstop=.2;advancePersonThrowPose(f,.1);assert.equal(f._personThrowPose.remaining,.3);
});

test('windup torso bends without changing simulation or skeletal length',()=>{const f=fighter();f.parts.torso=new T.Group();f._personThrowWindup={elapsed:.1,duration:.2};const scale=f.parts.torso.scale.clone();animatePersonThrowWindup(f);assert.ok(Math.abs(f.parts.torso.rotation.x)>.1);assert.ok(f.parts.torso.scale.equals(scale));assert.deepEqual(f.pos.toArray(),[1,2,3]);assert.deepEqual(f.vel.toArray(),[2,3,4]);});

test('release extension follows committed direction through production modular rig without root motion',async()=>{
 const {mainCombatFixture}=await import('./helpers/main-combat-fixture.mjs');const {loadModularCharacter}=await import('../src/engine/modular-character.js');const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');const fs=await import('node:fs/promises');globalThis.ProgressEvent??=class{};
 const x=mainCombatFixture({hero:'sol',mode:'powerworld'});try{
  const f=x.p,b=await fs.readFile('public/models/modular-hero/modular-hero.glb');f.def={...f.def,model:{...f.def.model,body:'faceted-v1'}};await loadModularCharacter(f,{load:()=>new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')});
  for(const direction of [new T.Vector3(0,0,1),new T.Vector3(1,-1,0).normalize()]){
   f._animate(0,x.g);const root=f.pos.clone(),lengths=[f.parts.armL,f.parts.armR].map(a=>[a.userData.upperLength,a.userData.foreLength]);
   beginPersonThrowPose(f,direction);advancePersonThrowPose(f,.12);animatePersonThrowPose(f);f._modularCharacter.update();f.obj.updateMatrixWorld(true);
   for(const arm of [f.parts.armL,f.parts.armR]){const reach=arm.children[2].getWorldPosition(new T.Vector3()).sub(arm.getWorldPosition(new T.Vector3())).normalize();assert.ok(reach.dot(direction)>.65,'hand extends toward released direction');}
   assert.ok(f.pos.equals(root));assert.deepEqual([f.parts.armL,f.parts.armR].map(a=>[a.userData.upperLength,a.userData.foreLength]),lengths);assert.ok(f._modularCharacter.actor);
   f._personThrowPose=null;
  }
 }finally{x.close();}
});

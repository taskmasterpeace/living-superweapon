import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {beginPersonThrowPose,advancePersonThrowPose,animatePersonThrowPose} from '../src/engine/person-throw-pose.js';
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

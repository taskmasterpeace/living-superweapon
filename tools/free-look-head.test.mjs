import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {animateFreeLookHead,restoreFreeLookHead} from '../src/engine/free-look-head.js';
test('latched orbit and return blend leave the animation-owned head pose intact',()=>{
 const f={parts:{rig:{},head:new T.Object3D(),cowl:new T.Object3D()},_game:{world:{_freeLook:{yaw:1.8,pitch:.4,orbit:false}}}};f._game.player=f;
 f.parts.head.rotation.set(.1,.2,.3);f.parts.cowl.quaternion.copy(f.parts.head.quaternion);const base=f.parts.head.quaternion.clone();
 animateFreeLookHead(f);assert.ok(f.parts.head.quaternion.angleTo(base)>.1,'Held Alt still supports natural head glance');
 f._game.world._freeLook.orbit=true;animateFreeLookHead(f);assert.ok(f.parts.head.quaternion.angleTo(base)<1e-7,'Entering orbit retires previous glance');
 f._game.world._freeLook.yaw=-2;animateFreeLookHead(f);assert.ok(f.parts.head.quaternion.angleTo(base)<1e-7);
 restoreFreeLookHead(f);assert.ok(f.parts.head.quaternion.angleTo(base)<1e-7);
});

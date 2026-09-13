import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {alignWeaponGrip} from '../src/engine/weapon-grip.js';
for(const side of [-1,1])test(`sword grip crosses fingers on side ${side}`,()=>{
 const w=new T.Group();w.userData.weaponKind='sword';assert.equal(alignWeaponGrip(w,side),true);
 const center=new T.Vector3(0,-.25,.16).applyQuaternion(w.quaternion).add(w.position);
 assert.ok(center.distanceTo(new T.Vector3(0,-.25,.12))<1e-8);
 const blade=new T.Vector3(0,-1,0).applyQuaternion(w.quaternion);
 assert.ok(blade.dot(new T.Vector3(-side,0,0))>.999);
});
test('firearm alignment stays with firearm pose owner',()=>{const w=new T.Group();w.userData.weaponKind='rifle';assert.equal(alignWeaponGrip(w),false);assert.equal(w.quaternion.w,1);assert.equal(w.position.length(),0);});

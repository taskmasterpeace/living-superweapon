import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {transportRampBounds} from '../src/engine/transport-ramp.js';
const box={center:[0,2.85,29],half:[7,.25,.5]};
test('ramp collision follows hinge and vehicle transforms instead of remaining on ground',()=>{
 const root=new THREE.Group(),hinge=new THREE.Group();root.add(hinge);hinge.position.set(0,5.7,20);root.updateMatrixWorld(true);
 const open=transportRampBounds(box,root,hinge);assert.ok(Math.abs(open.min.z-28.5)<1e-6);assert.ok(Math.abs(open.max.y-3.1)<1e-6);
 hinge.rotation.x=-1.852;root.position.set(50,100,60);root.rotation.y=.7;root.updateMatrixWorld(true);
 const closed=transportRampBounds(box,root,hinge);
 const expected=new THREE.Vector3(0,box.center[1]-5.7,box.center[2]-20).applyMatrix4(hinge.matrixWorld);
 assert.ok(closed.getCenter(new THREE.Vector3()).distanceTo(expected)<1e-6);assert.ok(closed.min.y>110);
 hinge.rotation.x=0;root.updateMatrixWorld(true);const reopened=transportRampBounds(box,root,hinge);assert.ok(Math.abs(reopened.min.y-102.6)<1e-6);
});

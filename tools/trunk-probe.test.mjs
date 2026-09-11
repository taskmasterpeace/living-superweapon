import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {anatomyGeometry} from '../src/engine/hero-rig.js';
import {trunkProbe} from './helpers/trunk-probe.mjs';

test('surface probe tolerates floating-point round trips on the radial seam',()=>{
 const mesh=new THREE.Mesh(anatomyGeometry([[-.65,.62,.45],[-.2,1,.57],[.55,.88,.52]]));
 const inside=trunkProbe(mesh),inverse=new THREE.Matrix4();
 for(const x of [0,1e-17,-1e-17])assert.equal(inside(new THREE.Vector3(x,.25,.5208333),inverse),true);
 assert.equal(inside(new THREE.Vector3(.001,.25,.57),inverse),false);
 mesh.geometry.dispose();
});
test('surface probe tests updated rendered triangles, not a frozen bind-pose cache',()=>{
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(2,2,2)),inside=trunkProbe(mesh),inverse=new THREE.Matrix4();
 assert.equal(inside(new THREE.Vector3(.1,.2,.3),inverse),true);
 mesh.geometry.translate(5,0,0);
 assert.equal(inside(new THREE.Vector3(5.1,.2,.3),inverse),true);
 assert.equal(inside(new THREE.Vector3(.1,.2,.3),inverse),false);
 mesh.geometry.dispose();
});

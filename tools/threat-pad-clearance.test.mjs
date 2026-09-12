import test from 'node:test';
import assert from 'node:assert/strict';
import {ThreatDeployment} from '../src/engine/threat-deployment.js';
test('transport placement reserves clearance around deployment portal',()=>{
 const fixture={g:{world:{ARENA:900,cover:[],heightAt:()=>0}}};
 const p=ThreatDeployment.prototype.clearPad.call(fixture,0,0,45,[{x:0,z:0,r:28}]);
 assert.ok(p);assert.ok(Math.hypot(p.x,p.z)>=81);
});
import * as THREE from 'three';

test('ready preserves waiting formation instead of sending followers backward through queue',()=>{
 const player={},a={alive:true,pos:new THREE.Vector3(12,0,28)},b={alive:true,pos:new THREE.Vector3(0,0,40)};
 const op={state:'preparing',manifest:[player,a,b],g:{player},origin:new THREE.Vector3(),surface:{material:{}}};
 ThreatDeployment.prototype.ready.call(op);
 assert.deepEqual(op.queue,[a,b]);assert.deepEqual(a._deploymentTarget.toArray(),[12,0,28]);assert.deepEqual(b._deploymentTarget.toArray(),[0,0,40]);
 a.pos.x=20;assert.equal(a._deploymentTarget.x,12);
});

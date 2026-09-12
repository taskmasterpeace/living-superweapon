import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {coverBoxEntry} from '../src/engine/projectile-contact.js';
import {World} from '../src/engine/world.js';
import {transportRampPanelBounds} from '../src/engine/transport-ramp.js';
const walk={width:14,startZ:38,endZ:20,startY:.5,endY:5.7,steps:18};
test('closed ramp seals dense projectile rays across the opening at several vehicle headings',()=>{
 for(const yaw of [0,.4,Math.PI/2,2.3]){
  const root=new THREE.Group(),hinge=new THREE.Group();root.add(hinge);hinge.position.set(0,5.7,20);hinge.rotation.x=-1.852;root.rotation.y=yaw;root.position.set(30,40,50);root.updateMatrixWorld(true);
  const b=transportRampPanelBounds(walk,hinge),c={x:(b.min.x+b.max.x)/2,z:(b.min.z+b.max.z)/2,hx:(b.max.x-b.min.x)/2,hz:(b.max.z-b.min.z)/2,bottom:b.min.y,top:b.max.y,finiteBuilding:true};
  for(let x=-6;x<=6;x+=1.5)for(let h=7;h<=21;h+=.25){
   const a=root.localToWorld(new THREE.Vector3(x,h,30)),z=root.localToWorld(new THREE.Vector3(x,h,10));
   assert.ok(Number.isFinite(coverBoxEntry(a,z,c)));
   assert.ok(World.prototype.traceBox3(a.x,a.y,a.z,z.x,z.y,z.z,c)>=0,`gap yaw=${yaw} x=${x} h=${h}`);
  }
 }
});

import {SquadTransport} from '../src/engine/squad-transport.js';
test('ramp switches between walking risers and sealed panel without duplicates and removes both on teardown',()=>{
 const model=new THREE.Group(),hinge=new THREE.Group();model.add(hinge);hinge.position.set(0,5.7,20);
 const step={localBox:{ramp:true,center:[0,3,29],half:[7,.25,.5]}},panel={localBox:{rampPanel:true}};
 const t={model,hinge,manifest:{ramp:{entry:[0,0,40],walk}},entry:new THREE.Vector3(),covers:[step,panel],passengers:new Map(),g:{world:{cover:[step,panel],coverAll:[step,panel]}},stage:{_cover:[step,panel]}};
 const sync=()=>SquadTransport.prototype.sync.call(t);
 sync();assert.deepEqual(t.g.world.cover,[step]);
 hinge.rotation.x=-1.852;sync();sync();assert.deepEqual(t.g.world.cover,[panel]);assert.equal(panel.buildingRole,'wall');
 hinge.rotation.x=0;sync();assert.deepEqual(t.g.world.cover,[step]);
 SquadTransport.prototype.removeCover.call(t);assert.equal(t.g.world.cover.length,0);assert.equal(t.g.world.coverAll.length,0);assert.equal(t.stage._cover.length,0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,MeshBasicMaterial,Vector3} from 'three';
import {retireTrainingBeacons} from '../src/engine/training-beacons.js';
test('departure retires only anchors placed in this room without refilling charges',()=>{
 const room={},other={},scene=new Group(),geometry=new BoxGeometry(),material=new MeshBasicMaterial(),mesh=new Group();
 mesh.add(new Mesh(geometry,material),new Mesh(geometry,material));scene.add(mesh);
 let disposed=0;geometry.addEventListener('dispose',()=>disposed++);material.addEventListener('dispose',()=>disposed++);
 const placed={def:{kind:'beacon',cd:8},state:'deployed',mesh,pos:new Vector3(2,0,5),charges:1,cd:0,_trainingRoom:room};
 const saved={...placed,_trainingRoom:other},unused={def:{kind:'beacon'},state:'ready',charges:2};
 assert.equal(retireTrainingBeacons([{items:[placed,unused]},{items:[saved]}],room),1);
 assert.equal(disposed,2);assert.equal(mesh.parent,null);assert.equal(placed.mesh,null);assert.equal(placed.pos,null);
 assert.equal(placed.state,'cooldown');assert.equal(placed.cd,8);assert.equal(placed.charges,1);
 assert.equal(saved.state,'deployed');assert.equal(unused.state,'ready');assert.equal(retireTrainingBeacons([{items:[placed]}],room),0);
});

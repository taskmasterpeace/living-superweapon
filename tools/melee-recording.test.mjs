import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {MeleeRecording,cloneReviewActor,applyReviewPose,reviewFrame} from '../src/engine/melee-recording.js';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';

test('review interpolates real rig poses without altering native fighter or shared materials',()=>{
 const x=mainCombatFixture({hero:'rage'});try{
  const r=new MeleeRecording();r.bind([x.p]);r.capture(0);
  x.p.obj.position.x=10;x.p.parts.armR.rotation.x=.8;x.p.hp=23;x.p.parts.guardArc.material.opacity=1;r.capture(.1);
  const original=x.p.parts.armR.rotation.x,copy=cloneReviewActor(x.p.obj),{a,b,mix}=reviewFrame(r.frames,.05);
  applyReviewPose(copy.nodes,a.actors[0].pose,b.actors[0].pose,mix);
  assert.equal(copy.model.position.x,5);assert.equal(x.p.obj.position.x,10);assert.equal(x.p.parts.armR.rotation.x,original);assert.equal(x.p.hp,23);
  const guardIndex=r.actors[0].nodes.indexOf(x.p.parts.guardArc);assert.equal(copy.nodes[guardIndex].material.opacity,.5);assert.equal(x.p.parts.guardArc.material.opacity,1);
  let sourceMesh;x.p.obj.traverse(n=>{if(n.isMesh&&!sourceMesh)sourceMesh=n;});const targetMesh=copy.nodes.find(n=>n.isMesh);
  assert.equal(targetMesh.geometry,sourceMesh.geometry);assert.notEqual(targetMesh.material,sourceMesh.material);
  copy.dispose();assert.ok(x.p.obj.parent);assert.equal(r.frames[1].actors[0].hp,23);r.clear();
 }finally{x.close();}
});
test('history is bounded and transient effect nodes cannot erase the exchange',()=>{
 const obj=new THREE.Group(),f={obj,hp:100,ki:100,alive:true},r=new MeleeRecording({seconds:2,hz:30});r.bind([f]);
 for(let i=0;i<600;i++)r.capture(i/60);
 assert.ok(r.frames.length<=61);assert.ok(r.frames.at(-1).time-r.frames[0].time<=2);
 obj.add(new THREE.Object3D());r.capture(10);assert.ok(r.frames.length>1);assert.equal(r.frames.at(-1).actors[0].pose.length,12);assert.equal(r.actors[0].template.nodes.length,1);
 r.clear();assert.equal(r.actors.length,0);assert.equal(r.frames.length,0);
});
test('review skeleton binds to copied bones instead of the live skeleton',()=>{
 const root=new THREE.Group(),bone=new THREE.Bone();root.add(bone);const mesh=new THREE.SkinnedMesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial());root.add(mesh);mesh.bind(new THREE.Skeleton([bone]));
 const copy=cloneReviewActor(root),cm=copy.nodes.find(n=>n.isSkinnedMesh);assert.notEqual(cm.skeleton.bones[0],bone);assert.ok(copy.nodes.includes(cm.skeleton.bones[0]));copy.dispose();mesh.geometry.dispose();mesh.material.dispose();
});

test('review preserves disabled legacy render layers and enabled modular layers',()=>{
 const root=new THREE.Group(),legacy=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()),current=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());
 legacy.name='legacy';legacy.layers.disable(0);legacy.layers.enable(3);current.name='current';current.layers.enable(2);root.add(legacy,current);
 const copy=cloneReviewActor(root);
 assert.equal(copy.model.getObjectByName('legacy').layers.mask,legacy.layers.mask);
 assert.equal(copy.model.getObjectByName('current').layers.mask,current.layers.mask);
 assert.equal(copy.model.getObjectByName('legacy').layers.test(new THREE.Layers()),false,'hidden legacy body cannot appear in default camera');
 copy.dispose();legacy.geometry.dispose();legacy.material.dispose();current.geometry.dispose();current.material.dispose();
});

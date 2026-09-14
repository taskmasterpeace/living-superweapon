import test from 'node:test';
import assert from 'node:assert/strict';
import {cinematicReviewShot,throwReviewShot} from '../src/engine/melee-review-camera.js';

test('throw follow uses recorded flight direction and is stable under backward seeks',()=>{
 const frames=[{time:0,actors:[{},{}]},{time:1,actors:[{}, {thrown:true,velocity:[0,-100,0]}]},{time:2,actors:[{}, {thrown:false,velocity:[0,0,0]}]}];
 const before=JSON.stringify(frames);
 assert.equal(throwReviewShot(frames,.5),null);
 const shot=throwReviewShot(frames,1.5);assert.equal(shot.actor,1);assert.ok(shot.offset[1]<0);assert.ok(shot.offset[0]>0);
 assert.deepEqual(throwReviewShot(frames,2),shot);
 assert.deepEqual(throwReviewShot(frames,1.5),shot);
 assert.equal(JSON.stringify(frames),before);
});
test('contact edits are deterministic when scrubbing and rapid hits do not flicker',()=>{
 const events=[{time:1,kind:'phase'},{time:1.1,kind:'contact'},{time:1.15,kind:'contact'},{time:1.7,kind:'contact'}];
 assert.equal(cinematicReviewShot(events,1).index,0);
 assert.equal(cinematicReviewShot(events,1.2).index,1);
 assert.equal(cinematicReviewShot(events,2).index,2);
 assert.equal(cinematicReviewShot(events,1.2).index,1);
 assert.equal(cinematicReviewShot(events,2,1.5).index,1);
});
test('every edit keeps the same side of the fight and leaves events unchanged',()=>{
 const events=Array.from({length:10},(_,i)=>({time:i,kind:'contact'})),before=JSON.stringify(events);
 for(let time=0;time<10;time++)assert.ok(cinematicReviewShot(events,time).offset[0]>0);
 assert.equal(JSON.stringify(events),before);
});

test('group review frames distant teammate for wide and narrow views',async()=>{
 const THREE=await import('three');const {reviewGroupFrame}=await import('../src/engine/melee-review-camera.js');
 const points=[new THREE.Vector3(-40,0,0),new THREE.Vector3(30,15,10),new THREE.Vector3(140,80,-70)];
 for(const aspect of [.6,1,16/9])for(const direction of [[1,.25,0],[0,1,.015],[.4,.3,-1]]){
  const fit=reviewGroupFrame(points,45,aspect),center=new THREE.Vector3(...fit.center),camera=new THREE.PerspectiveCamera(45,aspect,.1,2000);
  camera.position.copy(center).add(new THREE.Vector3(...direction).normalize().multiplyScalar(fit.distance));camera.lookAt(center);camera.updateMatrixWorld();
  for(const p of points)for(const y of [0,12]){const projected=p.clone().add(new THREE.Vector3(0,y,0)).project(camera);assert.ok(Math.abs(projected.x)<1);assert.ok(Math.abs(projected.y)<1);}
 }
});

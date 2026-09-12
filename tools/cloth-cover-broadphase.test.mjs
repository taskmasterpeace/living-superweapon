import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {RagdollCape} from '../src/engine/ragdoll-cape.js';
function fixture(box){
 const cape=Object.create(RagdollCape.prototype);
 Object.assign(cape,{covers:[{box}],coverStamp:0,coverProbe:new T.Triangle(),coverBefore:new T.Triangle(),coverProbeBox:new T.Box3()});
 const face=[[-2,0,0],[-2,1,0],[-2,0,1]].map(v=>({pos:new T.Vector3(...v)}));
 for(const p of face)p.faces=[face];
 return {cape,face};
}
test('distant cover never reaches detailed cape triangle testing',()=>{
 const box=new T.Box3(new T.Vector3(100,100,100),new T.Vector3(110,110,110));
 let checks=0;const original=box.intersectsTriangle;box.intersectsTriangle=function(...args){checks++;return original.apply(this,args);};
 const {cape,face}=fixture(box);
 assert.equal(cape.safeCoverTargets(face,face.map(p=>p.pos.clone().addScalar(.1))),true);
 assert.equal(checks,0);
});
test('nearby cover still rejects a cape movement crossing the wall',()=>{
 const {cape,face}=fixture(new T.Box3(new T.Vector3(-.5,-1,-1),new T.Vector3(.5,2,2)));
 assert.equal(cape.safeCoverTargets(face,face.map(p=>p.pos.clone().setX(2))),false);
});

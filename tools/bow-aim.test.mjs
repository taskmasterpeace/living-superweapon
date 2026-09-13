import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {Fighter} from '../src/engine/entity.js';import {ROSTER} from '../src/data/characters.js';
for(const body of ['procedural','superhero-male','superhero-female'])test(`${body}: bow hand follows aim pitch while draw and arrow stay connected`,()=>{
 const heights=[];
 for(const pitch of [-.65,0,.65]){
  const def=structuredClone(ROSTER.find(d=>d.id==='gale'));def.model={...def.model,body};const f=new Fighter(def);
  try{
   f._openSky=true;f._bowDraw=f._bowDrawT=1;f.aim3.set(0,Math.sin(pitch),Math.cos(pitch));
   for(let i=0;i<30;i++)f._animate(1/60);f.obj.updateMatrixWorld(true);
   const hand=f.parts.armL.children[2],bow=hand.children.find(o=>o.userData.weaponKind==='bow');
   heights.push(hand.getWorldPosition(new T.Vector3()).y);
   const nock=bow.localToWorld(new T.Vector3().fromBufferAttribute(bow.getObjectByName('bow-string').geometry.attributes.position,1));
   const finger=f.parts.armR.children[2].localToWorld(new T.Vector3(0,-.25,.12));
   assert.ok(nock.distanceTo(finger)<1e-5);
   const arrow=bow.getObjectByName('bow-arrow'),axis=arrow.localToWorld(new T.Vector3(0,1,0)).sub(arrow.getWorldPosition(new T.Vector3())).normalize();
   assert.ok(axis.dot(f.aim3)>.9999,`axis dot ${axis.dot(f.aim3)} pitch ${pitch}`);
  }finally{f.dispose();}
 }
 assert.ok(heights[0]<heights[1]-.8&&heights[2]>heights[1]+.8,`bow must rise and lower with aim: ${heights}`);
});


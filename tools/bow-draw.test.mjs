import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {Fighter} from '../src/engine/entity.js';import {ROSTER} from '../src/data/characters.js';
for(const body of ['procedural','superhero-male','superhero-female'])test(`${body}: bow string follows the free draw hand then restores knife`,()=>{
 const def=structuredClone(ROSTER.find(d=>d.id==='gale'));def.model={...def.model,body};const f=new Fighter(def);
 try{
  f._openSky=true;const hand=f.parts.armR.children[2],knife=hand.children.find(o=>o.userData.weaponKind==='knife');
  const bow=f.parts.armL.children[2].children.find(o=>o.userData.weaponKind==='bow'),string=bow.getObjectByName('bow-string');
  for(let i=0;i<65;i++){
   f._bowDraw=Math.min(1,(i+1)/50);f._bowDrawT=f._bowDraw;f._animate(1/60);f.obj.updateMatrixWorld(true);
   assert.equal(knife.visible,false,'draw hand must release its knife');
   const finger=hand.localToWorld(new T.Vector3(0,-.25,.12));
   const nock=bow.localToWorld(new T.Vector3().fromBufferAttribute(string.geometry.attributes.position,1));
   assert.ok(finger.distanceTo(nock)<1e-5,'string nock must stay on the fingers');
  }
  f._bowDraw=f._bowDrawT=0;f._animate(1/60);
  assert.equal(knife.visible,true);assert.equal(hand.userData.gripOccupied,true);
  assert.ok(new T.Vector3().fromBufferAttribute(string.geometry.attributes.position,1).distanceTo(new T.Vector3(0,0,-.35))<1e-6);
 }finally{f.dispose();}
});

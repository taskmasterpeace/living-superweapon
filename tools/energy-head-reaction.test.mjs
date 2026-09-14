import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {Fighter} from '../src/engine/entity.js';import {ROSTER} from '../src/data/characters.js';
import {queueHitReaction,animateHitReaction,restoreHitReaction} from '../src/engine/hit-reaction.js';
test('energy impact adds a small head response beyond torso motion without moving the entity',()=>{
 const f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='vega')));
 try{
  f._openSky=true;f._animate(0);const root=f.pos.clone(),head=f.parts.head.quaternion.clone(),torso=f.parts.torso.quaternion.clone();
  queueHitReaction(f,12,{dtype:'energy',src:{pos:f.pos.clone().add(new T.Vector3(0,0,10))}});
  animateHitReaction(f,1/60);
  const h=f.parts.head.quaternion.clone().multiply(head.clone().invert()),b=f.parts.torso.quaternion.clone().multiply(torso.clone().invert());
  assert.ok(h.angleTo(b)>.005,'head must react beyond the rigid torso tilt');
  assert.ok(h.angleTo(b)<.15,'head response must stay subtle');assert.ok(f.pos.equals(root));
  restoreHitReaction(f);assert.ok(f.parts.head.quaternion.angleTo(head)<1e-6);
  f.grabbedBy={};animateHitReaction(f,1/60);assert.ok(f.parts.head.quaternion.angleTo(head)<1e-6,'held pose owns head');
 }finally{f.dispose();}
});

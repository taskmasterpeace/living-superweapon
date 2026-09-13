import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {Fighter} from '../src/engine/entity.js';import {ROSTER} from '../src/data/characters.js';
import {MeleeSystem} from '../src/engine/melee.js';import {fistContact} from '../src/engine/melee-pose.js';
import {snapshotWeaponSurface} from '../src/engine/melee-weapon-contact.js';

for(const state of ['active','startup','recover','hidden','detached','moving','interrupted'])test(`native sword contact: ${state}`,()=>{
 const a=new Fighter(structuredClone(ROSTER.find(x=>x.id==='aegis'))),b=new Fighter(structuredClone(ROSTER.find(x=>x.id==='kano')));
 const game={entities:[a,b],isFoe:(x,y)=>x!==y},m=new MeleeSystem(game),hits=[];
 try {
  for(const f of [a,b]){f._openSky=true;f.invuln=0;f._animate(1);}
  const hand=a.parts.armL.children[2],weapon=hand.children.find(x=>x.userData.weaponKind==='sword');
  const blade=snapshotWeaponSurface(weapon).points.at(-1),fist=hand.getWorldPosition(new T.Vector3());
  b.pos.add(blade.clone().sub(b.parts.torso.getWorldPosition(new T.Vector3())));b.obj.updateMatrixWorld(true);
  assert.equal(fistContact(fist,fist,b.parts.torso,.42,new T.Vector3()),Infinity,'fist alone cannot reach fixture');
  a.mId='jab';a.mKind='light';a.mstate=['startup','recover'].includes(state)?state:'active';a.mT=.04;a.strikeHit=new Set();
  a._meleeMotion={side:-1,weapon,previous:fist.clone(),current:new T.Vector3(),impact:new T.Vector3(),dt:1/60};
  m._resolveLight=(f,v)=>{hits.push(v);f.strikeHit.add(v);};
  if(state==='moving')b.pos.x-=4;
  m.beginContactFrame();
  if(state==='moving')b.pos.x+=8;
  if(state==='hidden')weapon.visible=false;
  if(state==='detached')weapon.removeFromParent();
  if(state==='interrupted')a.stunT=.5;
  m.resolveContact(a);m.endContactFrame();
  assert.equal(hits.length,['active','moving'].includes(state)?1:0,'blade contact obeys phase, motion and attachment ownership');
  if(state==='detached')hand.add(weapon);
 }finally{a.dispose();b.dispose();}
});

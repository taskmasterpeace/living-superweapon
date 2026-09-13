import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {Fighter,buildWeapon} from '../src/engine/entity.js';import {ROSTER} from '../src/data/characters.js';
import {alignWeaponGrip,meleeWeaponFor} from '../src/engine/weapon-grip.js';
for(const side of [-1,1])test(`bow ${side}: grip aligns with palm and string joins limb tips`,()=>{
 const bow=buildWeapon('bow',{}),hand=new T.Group();hand.add(bow);
 try{
  assert.equal(alignWeaponGrip(bow,side),true);
  const grip=bow.getObjectByName('weapon-primary-grip');assert.ok(grip);
  hand.updateMatrixWorld(true);
  assert.ok(grip.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(0,-.25,.12))<1e-6);
  const string=bow.getObjectByName('bow-string');assert.ok(string);
  const points=string.geometry.attributes.position;
  for(const [name,index]of [['bow-tip-top',0],['bow-tip-bottom',2]]){
   const tip=bow.getObjectByName(name);assert.ok(tip);
   assert.ok(tip.position.distanceTo(new T.Vector3().fromBufferAttribute(points,index))<1e-6);
  }
 }finally{bow.traverse(o=>{o.geometry?.dispose();for(const m of [].concat(o.material||[]))m.dispose();});}
});
test('GALE keeps the bow in the left palm without selecting it as a melee weapon',()=>{
 const f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='gale')));
 try{
  const hand=f.parts.armL.children[2],bow=hand.children.find(o=>o.userData.weaponKind==='bow');assert.ok(bow);
  assert.equal(hand.userData.gripKind,'cylinder');
  assert.equal(meleeWeaponFor(f)?.weapon.userData.weaponKind,'knife');
 }finally{f.dispose();}
});

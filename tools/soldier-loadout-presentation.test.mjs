import test from 'node:test';
import assert from 'node:assert/strict';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {forearmOccupied,firearmEmitter} from '../src/engine/weapon-emission.js';
import {updateSoldierLoadoutPresentation} from '../src/engine/soldier-loadout-presentation.js';
import {TYPES} from '../src/engine/abilities.js';
import {Game} from '../src/engine/game.js';
import {bladeById} from '../src/data/armory.js';
import {beginAbilityMeleePose} from '../src/engine/ability-melee-pose.js';
import {unmountHeldWeapon} from '../src/engine/weapon-emission.js';
const make=id=>new Fighter(structuredClone(ROSTER.find(d=>d.id===id)));

for(const id of ['claws','nodachi','katana','tomahawk'])test(`SARGE equipped ${id} does not draw an unrelated sword and unmount cancels its attack`,()=>{
 const f=make('sarge');try{
  f._openSky=true;updateSoldierLoadoutPresentation(f);
  const sword=f.parts.armL.children[2].children.find(w=>w.userData.weaponKind==='sword');
  const g={isHuman:()=>false};Game.prototype.equipFrom.call(g,f,bladeById(id),{primary:true});
  const st=f.slots.lmb;st.t=.24;beginAbilityMeleePose(f,st);updateSoldierLoadoutPresentation(f);
  assert.equal(sword.visible,false,'only the equipped slash weapon should appear');
  assert.ok(f._abilityMeleePose);unmountHeldWeapon(f,g);assert.equal(f._abilityMeleePose,null);assert.equal(st.t,0);
 }finally{f.dispose();}
});
test('SARGE stows sword and riot shield for two-hand rifle support, restores only active equipment',()=>{
 const f=make('sarge');try{const arm=f.parts.armL,shield=arm.userData.shield,sword=arm.children[2].children.find(o=>o.userData.weaponKind==='sword');
  updateSoldierLoadoutPresentation(f);assert.equal(sword.visible,false);assert.equal(shield.visible,false);assert.equal(arm.userData.shield,null);assert.equal(forearmOccupied(arm),false);
  f.guarding=true;updateSoldierLoadoutPresentation(f);assert.equal(shield.visible,true);assert.equal(arm.userData.shield,shield);assert.equal(sword.visible,false);
  f.guarding=false;f._abilityMeleePose={slot:f.slots.q};updateSoldierLoadoutPresentation(f);assert.equal(sword.visible,true);assert.equal(shield.visible,false);assert.equal(forearmOccupied(arm),true);
  f._abilityMeleePose=null;updateSoldierLoadoutPresentation(f);assert.equal(forearmOccupied(arm),false);assert.equal(sword.parent,arm.children[2],'never detach driven equipment');
 }finally{f.dispose();}
});
test('MERC pistol appears for its actual trigger window and the first shot keeps the pistol muzzle',()=>{
 const f=make('merc');try{const arm=f.parts.armL,pistol=arm.children[2].children.find(o=>o.userData.weaponKind==='pistol'),slot=Object.values(f.slots).find(s=>s.def.weapon==='pistol');
  updateSoldierLoadoutPresentation(f);assert.equal(pistol.visible,false);assert.equal(forearmOccupied(arm),false);
  slot._poseUntil=f.animT+.18;updateSoldierLoadoutPresentation(f);assert.equal(pistol.visible,true);assert.equal(firearmEmitter(f,slot.def).weapon,pistol);
  f.animT+=.2;updateSoldierLoadoutPresentation(f);assert.equal(pistol.visible,false);assert.equal(forearmOccupied(arm),false);
 }finally{f.dispose();}
});
test('non-soldier equipment is untouched and KO preserves the final equipment state',()=>{
 const f=make('aegis'),s=make('sarge');try{const shield=f.parts.armL.userData.shield;updateSoldierLoadoutPresentation(f);assert.equal(shield.visible,true);assert.equal(f.parts.armL.userData.shield,shield);
  s.guarding=true;updateSoldierLoadoutPresentation(s);const sh=s.parts.armL.userData.shield;s.state='ko';s.guarding=false;updateSoldierLoadoutPresentation(s);assert.equal(sh.visible,true);
 }finally{f.dispose();s.dispose();}
});

test('native firearm entry unhides the paid pistol before emitter selection',()=>{
 const f=make('merc');try{
  updateSoldierLoadoutPresentation(f);const slot=Object.values(f.slots).find(s=>s.def.weapon==='pistol'),shots=[];
  const g={projectiles:{spawnProjectile(owner,def){shots.push(def);}},audio:{gunshot(){}},noise(){}};
  TYPES.rifle(f,slot.def,slot,g,{held:true,dt:1/60});assert.equal(shots.length,1);
  assert.equal(shots[0].emitterSocket.parent.userData.weaponKind,'pistol','first round must not use fallback rifle while holstered');
 }finally{f.dispose();}
});

for(const id of ['sarge','merc'])test(`${id} native idle animation frees the off hand and establishes the actual rifle support grip`,()=>{
 const f=make(id);try{
  f._openSky=true;f.gait='grounded';f.flying=false;
  for(let i=0;i<90;i++){f.animT+=1/60;f._animate(1/60);}
  assert.equal(f.parts.armL.children[2].userData.gripOccupied,false);assert.ok(f._riflePose?.active,'native rifle hold must own both hands');
  f.obj.updateMatrixWorld(true);const support=f.obj.getObjectByName('weapon-support-grip');
  const hand=f.parts.armL.children[2];assert.ok(support.getWorldPosition(f.pos.clone()).distanceTo(hand.getWorldPosition(f.pos.clone()))<.045);
 }finally{f.dispose();}
});

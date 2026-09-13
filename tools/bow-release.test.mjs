import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';import {TYPES} from '../src/engine/abilities.js';
test('native bow release launches once from its final rendered arrow and no longer follows the hand',()=>{
 const x=mainCombatFixture({hero:'gale'}),{p,g}=x;
 try{
  p._openSky=true;p.hasAimWorld=true;p.aimWorld.set(8,10,70);p.aim3.copy(p.aimWorld).sub(p.pos).normalize();
  g.audio={...g.audio,bowLoose(){}};const st=Object.values(p.slots).find(st=>st.def.type==='bow');assert.ok(st);
  for(let i=0;i<40;i++){TYPES.bow(p,st.def,st,g,{pressed:i===0,held:true,dt:1/60});p.update(1/60,g);}
  const bow=p.parts.armL.children[2].children.find(o=>o.userData.weaponKind==='bow'),arrow=bow.getObjectByName('bow-arrow');
  assert.equal(arrow.visible,true);const energy=p.ki;
  TYPES.bow(p,st.def,st,g,{released:true,dt:1/60});p.update(1/60,g);
  const shot=g.projectiles.list.find(s=>s.arrow);assert.ok(shot);assert.equal(arrow.visible,false);
  shot.resolveLaunch(g);const at=bow.getObjectByName('bow-launch').getWorldPosition(new T.Vector3());
  assert.ok(shot.pos.distanceTo(at)<1e-5,'release must use final bow socket');
  assert.ok(shot.vel.clone().normalize().dot(p.aimWorld.clone().sub(at).normalize())>.99999);
  assert.ok(p.ki<energy);const launched=shot.pos.clone();p.pos.x+=20;p._animate(1/60);shot.resolveLaunch(g);
  assert.ok(shot.pos.equals(launched),'released arrow must not remain attached');
  assert.equal(g.projectiles.list.filter(s=>s.arrow).length,1);
 }finally{x.close();}
});


import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';import {TYPES} from '../src/engine/abilities.js';
for(const change of ['none','drawing','release'])test(`native bow ${change}: release uses current form and travels independently`,()=>{
 const x=mainCombatFixture({hero:'gale'}),{p,g}=x;
 try{
  p._openSky=true;p.hasAimWorld=true;p.aimWorld.set(8,10,70);p.aim3.copy(p.aimWorld).sub(p.pos).normalize();
  g.audio={...g.audio,bowLoose(){}};const st=Object.values(p.slots).find(st=>st.def.type==='bow');assert.ok(st);
  for(let i=0;i<40;i++){TYPES.bow(p,st.def,st,g,{pressed:i===0,held:true,dt:1/60});p.update(1/60,g);}
  const oldBow=p.parts.armL.children[2].children.find(o=>o.userData.weaponKind==='bow');
  if(change==='drawing'){assert.equal(p.applyForm({name:'Bow draw form',frame:{scale:1.2}}),true);p.update(1/60,g);}
  let bow=p.parts.armL.children[2].children.find(o=>o.userData.weaponKind==='bow'),arrow=bow.getObjectByName('bow-arrow');
  assert.equal(arrow.visible,true);const energy=p.ki;
  TYPES.bow(p,st.def,st,g,{released:true,dt:1/60});
  if(change==='release')assert.equal(p.applyForm({name:'Bow release form',frame:{scale:1.2}}),true);
  p.update(1/60,g);
  bow=p.parts.armL.children[2].children.find(o=>o.userData.weaponKind==='bow');arrow=bow.getObjectByName('bow-arrow');
  if(change!=='none')assert.notEqual(bow.uuid,oldBow.uuid,'fixture must replace the bow');
  const shot=g.projectiles.list.find(s=>s.arrow);assert.ok(shot);assert.equal(arrow.visible,false);
  shot.resolveLaunch(g);const at=bow.getObjectByName('bow-launch').getWorldPosition(new T.Vector3());
  assert.ok(shot.pos.distanceTo(at)<1e-5,'release must use final bow socket');
  assert.ok(shot.vel.clone().normalize().dot(p.aimWorld.clone().sub(at).normalize())>.99999);
  assert.ok(p.ki<energy);const launched=shot.pos.clone();p.pos.x+=20;p._animate(1/60);shot.resolveLaunch(g);
  assert.ok(shot.pos.equals(launched),'released arrow must not remain attached');
  assert.equal(g.projectiles.list.filter(s=>s.arrow).length,1);
 }finally{x.close();}
});

for(const hz of [30,60,120])test('bow release respects thin walls at '+hz+' Hz',()=>{
 const x=mainCombatFixture({hero:'gale'}),{p,g,w}=x;
 try{
  p._openSky=true;p.aim3.set(0,0,1);g.audio={...g.audio,bowLoose(){}};
  const st=Object.values(p.slots).find(s=>s.def.type==='bow');
  for(let i=0;i<40;i++){TYPES.bow(p,st.def,st,g,{pressed:i===0,held:true,dt:1/60});p.update(1/60,g);}
  const bow=p.parts.armL.children[2].children.find(o=>o.userData.weaponKind==='bow');
  const at=bow.getObjectByName('bow-launch').getWorldPosition(new T.Vector3());assert.ok(at.z>1);
  const wall={x:0,z:at.z*.5,hx:30,hz:.01,top:100};w.interiors=[{...wall,walls:[wall]}];
  const target=x.foe({z:30}),hp=target.hp;target.invuln=0;
  TYPES.bow(p,st.def,st,g,{released:true,dt:1/60});p.update(1/60,g);
  const shot=g.projectiles.list.find(s=>s.arrow);shot.resolveLaunch(g);
  assert.ok(shot.pos.z<wall.z,'a pose crossing cover must not spawn its arrow through the wall');
  for(let i=0;i<hz;i++)g.projectiles.update(1/hz,g);
  assert.equal(target.hp,hp,'the wall must protect the receiver');
  assert.ok(shot.dead,'blocked arrow must resolve against the wall');
 }finally{x.close();}
});


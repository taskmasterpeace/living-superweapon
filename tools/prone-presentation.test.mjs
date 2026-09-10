import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {earliestOrdinaryContact} from '../src/engine/attack-interception.js';
import {beamBodyContact} from '../src/engine/beam-body-contact.js';
import {sweepFighterEnvironment} from '../src/engine/fighter-environment-contact.js';
import {firearmAmmo,requestReload,updateFirearmReload} from '../src/engine/firearm-ammo.js';
import {firearmEmitter} from '../src/engine/weapon-emission.js';

test('RECON keeps its actual precision muzzle above ground through prone entry and firing hold',()=>{
 const x=mainCombatFixture({hero:'recon'}),f=x.p;
 try{
  f._openSky=true;f.onFoot=true;f._selSlot='q';f.hasAimWorld=true;f.aimWorld.set(0,6,200);f.aim3.set(0,0,1);
  for(let i=0;i<180;i++){
   f.prone=i>=30&&i<150;f.slots.q._poseUntil=f.animT+.2;f.animT+=1/60;f._animate(1/60);
   const e=firearmEmitter(f,f.slots.q.def),at=e.socket.getWorldPosition(new T.Vector3());
   assert.ok(at.y>.45,`precision muzzle below clearance at frame ${i}: ${at.y}`);
  }
 }finally{x.close();}
});

test('prone reload keeps magazine and arms above ground and recovers support',()=>{
 const x=mainCombatFixture({hero:'sarge'}),f=x.p;
 try{
  f._openSky=true;f.onFoot=true;f.prone=true;
  for(let i=0;i<120;i++){f.animT+=1/60;f._animate(1/60);}
  firearmAmmo(f.slots.lmb).loaded=12;requestReload(f,'lmb',x.g);
  for(let i=0;i<180;i++){
   updateFirearmReload(f,1/60,x.g);f.animT+=1/60;f._animate(1/60);f.obj.updateMatrixWorld(true);
   for(const arm of [f.parts.armL,f.parts.armR])assert.ok(new T.Box3().setFromObject(arm).min.y>=-.05,`reload arm/prop below floor at ${i/60}`);
  }
  assert.equal(f.slots.lmb.ammo.loaded,30);
 }finally{x.close();}
});

for(const hz of [30,60,120])test(`prone crawl overcomes ground friction at ${hz}Hz`,()=>{
 const x=mainCombatFixture({hero:'sarge'}),f=x.p;
 try{
  f._openSky=true;f.onFoot=true;f.prone=true;
  for(let i=0;i<hz;i++){f.move(new T.Vector3(0,0,1),1/hz);f._physics(1/hz,x.g);}
  assert.ok(f.pos.z>1.5,`crawl only travelled ${f.pos.z}`);
  assert.ok(f.pos.z<12,'crawl should remain slower than running');
 }finally{x.close();}
});

test('prone shot and finite beam contact use the lowered extended body, not the standing cylinder',()=>{
 const x=mainCombatFixture({hero:'sarge'}),f=x.p;
 try{
  f._openSky=true;f.onFoot=true;f.prone=true;
  for(let i=0;i<120;i++){f.animT+=1/60;f._animate(1/60);}
  const caster={team:999},y=f.center().y;
  x.g.isFoe=(a,b)=>a!==b;
  const shot=h=>earliestOrdinaryContact({caster,pos:new T.Vector3(0,h,-30),radius:.1,ground:false},new T.Vector3(0,h,30),.1,x.g);
  assert.equal(shot(8),null);assert.equal(shot(y)?.target,f);
  const out={point:new T.Vector3(),surface:new T.Vector3(),direction:new T.Vector3()};
  const beam={caster,radius:.1,pn:2,path:new Float32Array([0,8,-30,0,8,30]),pvel:new Float32Array(6)};
  assert.equal(beamBodyContact(beam,x.g,out),false);
  beam.path[1]=beam.path[4]=y;assert.equal(beamBodyContact(beam,x.g,out),true);assert.equal(out.fighter,f);
  assert.ok(out.point.z<f.pos.z-2,'beam must stop at the extended trailing body');
  beam.path[5]=-20;assert.equal(beamBodyContact(beam,x.g,out),false,'untraveled distance cannot hit');
 }finally{x.close();}
});

test('prone swept footprint stops the actual head before a thin wall',()=>{
 const x=mainCombatFixture({hero:'sarge'}),f=x.p;
 try{
  f._openSky=true;f.onFoot=true;f.prone=true;
  for(let i=0;i<120;i++){f.animT+=1/60;f._animate(1/60);}
  x.w.cover.push({x:0,z:20,hx:20,hz:.1,top:10});f.vel.set(0,0,1000);
  sweepFighterEnvironment(f,x.g,.1);
  assert.ok(f.pos.z+f._pronePose.bounds.max.z<=19.901,'head swept through wall');
 }finally{x.close();}
});

test('fixed native view angle lowers and restores camera with prone',()=>{
 const x=mainCombatFixture({hero:'sarge'}),f=x.p;
 try{
  f._openSky=true;f.onFoot=true;x.w.chase(f,null,1/60,'bfp');const y=x.w.camera.position.y;
  f.prone=true;for(let i=0;i<120;i++){f.animT+=1/60;f._animate(1/60);x.w.chase(f,null,1/60,'bfp');}
  assert.ok(x.w.camera.position.y<y-3);assert.equal(x.w._lookPitch,0);
  f.prone=false;for(let i=0;i<120;i++){f.animT+=1/60;f._animate(1/60);x.w.chase(f,null,1/60,'bfp');}
  assert.ok(Math.abs(x.w.camera.position.y-y)<.01);
 }finally{x.close();}
});

test('soldier Z toggles prone, holds without repeating, and cannot activate in flight',()=>{
 const x=mainCombatFixture({hero:'sarge',mode:'powerworld'}),{p:f,g}=x;
 try{
  g.ms.chaseCam=true;f._openSky=true;f.onFoot=true;x.control(0);
  g.input.justPressed.add('KeyZ');g.input.keys.add('KeyZ');x.control();assert.equal(f.prone,true);
  g.input.endFrame();x.control();assert.equal(f.prone,true);
  g.input.justPressed.add('KeyZ');x.control();assert.equal(f.prone,false);
  g.input.endFrame();f.flying=true;f.onFoot=false;g.input.justPressed.add('KeyZ');x.control();assert.equal(f.prone,false);
 }finally{x.close();}
});

for(const hz of [30,60,120])test(`prone lays the core on the ground and recovers without moving the root at ${hz}Hz`,()=>{
 const x=mainCombatFixture({hero:'sarge'}),f=x.p;f._openSky=true;f.onFoot=true;
 const step=()=>{f.animT+=1/hz;f._animate(1/hz);f.obj.updateMatrixWorld(true);};
 try{
  for(let i=0;i<hz;i++)step();const root=f.pos.clone(),standing=f.parts.head.getWorldPosition(new T.Vector3()).y;
  f.prone=true;for(let i=0;i<hz*2;i++)step();
  const core=new T.Box3().setFromObject(f.parts.torso),head=f.parts.head.getWorldPosition(new T.Vector3());
  assert.ok(core.max.y<3,'torso still upright');assert.ok(core.min.y>=-.05&&core.min.y<.35,'core must meet floor');assert.ok(head.y<3);
  assert.ok(f.pos.equals(root));
  for(let frame=0;frame<hz*2;frame++){
   f.vel.set(0,0,5);step();
   assert.ok(f._pronePose.bounds.min.y>=-.05,`prone leg penetrates floor ${f._pronePose.bounds.min.y}`);
   for(const arm of [f.parts.armL,f.parts.armR])assert.ok(new T.Box3().setFromObject(arm).min.y>=-.05,'supported arm/weapon penetrates the floor');
  }
  const gun=f.parts.armR.children[2].getObjectByName('weapon-rifle'),hand=f.parts.armL.children[2];
  assert.ok(hand.getWorldPosition(new T.Vector3()).distanceTo(gun.getObjectByName('weapon-support-grip').getWorldPosition(new T.Vector3()))<.08,'prone off-hand must support rifle');
  f.prone=false;f.vel.set(0,0,0);for(let i=0;i<hz*2;i++)step();assert.ok(Math.abs(standing-f.parts.head.getWorldPosition(new T.Vector3()).y)<.15);
 }finally{x.close();}
});

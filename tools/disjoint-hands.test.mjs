import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {disjointCombatFixture} from './helpers/disjoint-combat-fixture.mjs';
import {buildWeapon} from '../src/engine/entity.js';
import {cancelHeldAttacks,cancelHeldSlot} from '../src/engine/abilities.js';
import {trunkProbe} from './helpers/trunk-probe.mjs';

const normal=hand=>new THREE.Vector3(0,-1,0).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()));

for(const kind of ['beam','volley'])for(const order of ['normal','reverse'])
test(`independent left volley keeps an open, aimed hand beside right ${kind}, ${order} slot order`,()=>{
 const x=disjointCombatFixture({kind,order}),{f}=x;
 try{for(let i=0;i<30;i++)x.step();x.start('lmb');for(let i=0;i<40;i++)x.step();x.start('rmb');
  for(let i=0;i<100;i++){
   x.step();if(i<30)continue;
   const left=f.parts.armL.children[2],right=f.parts.armR.children[2];
   const target=f.aimWorld.clone().sub(left.getWorldPosition(new THREE.Vector3())).normalize();
   assert.ok(normal(left).dot(target)>.985,`Left emission comes from a hand pointing elsewhere: dot ${normal(left).dot(target)}`);
   assert.ok(left.morphTargetInfluences[0]>.9,'The secondary casting hand stayed clenched');
   if(kind==='beam')assert.ok(normal(right).dot(f.slots.lmb.active.dir)>.985,'The left volley stole the sustaining right beam');
   else{
    const rightTarget=f.aimWorld.clone().sub(right.getWorldPosition(new THREE.Vector3())).normalize();
    assert.ok(normal(right).dot(rightTarget)>.985,'The left volley stole the right volley pose');
    assert.ok(right.morphTargetInfluences[0]>.9,'The right casting hand stayed clenched');
   }
  }
 }finally{x.close();}
});

test('a gathering right charge cannot curl the independently firing left palm',()=>{
 const x=disjointCombatFixture({motion:'hover'}),{f}=x;
 try{
  f.slots.lmb.def.charge=2;
  for(let i=0;i<40;i++)x.step();x.start('lmb');x.start('rmb');
  for(let i=0;i<80;i++)x.step();
  assert.ok(f.slots.lmb.charging);assert.ok(f._combatAim.gather>.95);
  const hand=f.parts.armL.children[2];
  assert.ok(hand.morphTargetInfluences[0]>.95,'Other hand inherited the charge gather');
  assert.ok(normal(hand).dot(f.aimWorld.clone().sub(hand.getWorldPosition(new THREE.Vector3())).normalize())>.99);
  x.stop('lmb');for(let i=0;i<80;i++)x.step();
  assert.ok(f.slots.lmb.active?.emissionAge>0,'The gathered primary never released beside the left volley');
  assert.ok(hand.morphTargetInfluences[0]>.95);
 }finally{x.close();}
});

for(const order of ['normal','reverse'])test(`different guns keep their own final barrel, closed grip and aim (${order})`,()=>{
 const x=disjointCombatFixture({kind:'volley',order,motion:'hover'}),{f,g}=x;
 try{
  const emitted=[],spawn=g.projectiles.spawnProjectile.bind(g.projectiles);
  g.projectiles.spawnProjectile=(...args)=>{const shot=spawn(...args);emitted.push(shot);return shot;};
  const material=f.parts.armR.children[2].material,mats={armor:material,visorMat:material};
  for(const [key,arm,weapon]of [['lmb',f.parts.armR,'rifle'],['rmb',f.parts.armL,'pistol']]){
   Object.assign(f.slots[key].def,{type:'rifle',weapon,spread:0,recoil:0});
   arm.children[2].add(buildWeapon(weapon,mats));arm.children[2].userData.gripOccupied=true;
  }
  f.aimWorld.set(3,62,14);f.aim3.copy(f.aimWorld).sub(f.pos).normalize();
  for(let i=0;i<40;i++)x.step();x.start('lmb');x.start('rmb');
  for(let i=0;i<120;i++)x.step();
  const channels=f._combatAim.armChannels;
  assert.notEqual(channels[0].firearm.socket,channels[1].firearm.socket,'Shared emitter scratch aliased both guns');
  for(const [i,arm,weapon]of [[0,f.parts.armL,'pistol'],[1,f.parts.armR,'rifle']]){
   const hand=arm.children[2],socket=hand.getObjectByName(`weapon-${weapon}`).getObjectByName('weapon-muzzle');
   assert.equal(channels[i].firearm.socket,socket);
   assert.ok(normal(hand).dot(f.aimWorld.clone().sub(socket.getWorldPosition(new THREE.Vector3())).normalize())>.999);
   assert.ok(hand.morphTargetInfluences[0]<.001,'A weapon grip opened as an energy palm');
  }
  assert.ok(emitted.length>8&&emitted.every(p=>p.launchOrigin),'The fixture never resolved native firearm rounds');
 }finally{x.close();}
});

test('a free palm follows a new command independently of the slower sustaining hose',()=>{
 const x=disjointCombatFixture({motion:'fly'}),{f}=x;
 try{
  for(let i=0;i<40;i++)x.step();x.start('lmb');x.start('rmb');for(let i=0;i<90;i++)x.step();
  f.aimWorld.set(60,95,80);f.aim3.copy(f.aimWorld).sub(f.pos).normalize();
  for(let i=0;i<15;i++)x.step();
  const left=f.parts.armL.children[2],right=f.parts.armR.children[2];
  assert.ok(normal(left).dot(f.aimWorld.clone().sub(left.getWorldPosition(new THREE.Vector3())).normalize())>.995);
  assert.ok(normal(right).dot(f.slots.lmb.active.dir)>.985);
  assert.ok(normal(left).angleTo(normal(right))>.08,'Both palms inherited the same slow beam ray');
 }finally{x.close();}
});

for(const kind of ['slow-ray','gather'])test(`still-firing left hand preserves its history when the ${kind} primary ends`,()=>{
 const x=disjointCombatFixture({motion:'hover'}),{f}=x;
 try{
  if(kind==='gather')Object.assign(f.slots.lmb.def,{charge:true,maxCharge:10});else f.slots.lmb.def.steer=.3;
  for(let i=0;i<40;i++)x.step();x.start('lmb');x.start('rmb');for(let i=0;i<90;i++)x.step();
  f.aimWorld.set(60,72,40);f.aim3.copy(f.aimWorld).sub(f.pos).normalize();
  for(let i=0;i<24;i++)x.step();
  if(kind==='gather')cancelHeldSlot(f,'lmb',x.g);x.stop('lmb');
  const hand=f.parts.armL.children[2];
  for(let i=0;i<30;i++){
   x.step();const alignment=normal(hand).dot(f.aimWorld.clone().sub(hand.getWorldPosition(new THREE.Vector3())).normalize());
   assert.ok(alignment>.99,`Primary switch borrowed another hand's ray: ${alignment}`);
   assert.ok(hand.morphTargetInfluences[0]>.95,'Primary switch borrowed another hand\'s charge gather');
  }
 }finally{x.close();}
});

for(const motion of ['strafe','hover','fly'])for(const hz of [30,60,120])
test(`disjoint entry and recovery clear actual torso triangles: ${motion}, ${hz} Hz`,()=>{
 const x=disjointCombatFixture({motion,hz}),{f}=x,inside=trunkProbe(f.parts.torso);
 try{
  for(let i=0;i<hz;i++)x.step();x.start('lmb');
  for(let i=0;i<hz*3;i++){
   if(i===hz/2)x.start('rmb');if(i===hz*1.5)x.stop('rmb');if(i===hz*2)x.stop('lmb');x.step();
   const inverse=f.parts.torso.matrixWorld.clone().invert();
   for(const arm of [f.parts.armL,f.parts.armR])for(const mesh of [arm.children[1],arm.children[2]])
    for(let v=0;v<mesh.geometry.attributes.position.count;v++){
     const world=mesh.getVertexPosition(v,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
     assert.ok(!inside(world,inverse),`${mesh.name} penetrated the torso at ${i}/${hz}`);
    }
  }
 }finally{x.close();}
});

test('guard interruption closes and recovers both independently owned hands',()=>{
 const x=disjointCombatFixture(),{f}=x;
 try{
  for(let i=0;i<40;i++)x.step();x.start('lmb');x.start('rmb');for(let i=0;i<90;i++)x.step();
  x.stop('lmb');x.stop('rmb');cancelHeldAttacks(f);
  for(let i=0;i<90;i++){f.poseGuard=1;f.guarding=true;x.step();}
  for(const arm of [f.parts.armL,f.parts.armR])assert.ok(arm.children[2].morphTargetInfluences[0]<.001);
  assert.ok(f._combatAim.armChannels.every(c=>c.weight===0));
 }finally{x.close();}
});

test('a recovering off-hand gun rebinds to the current form, not a retired rig',()=>{
 const x=disjointCombatFixture({kind:'volley',motion:'hover'}),{f}=x;
 try{
  f.def.id='merc';f.applyForm({model:{costume:'plated'}});
  for(const [key,weapon]of [['lmb','rifle'],['rmb','pistol']])Object.assign(f.slots[key].def,{type:'rifle',weapon,spread:0});
  for(let i=0;i<40;i++)x.step();x.start('lmb');x.start('rmb');for(let i=0;i<90;i++)x.step();
  x.stop('rmb');for(let i=0;i<17;i++)x.step();
  const old=f.parts.armL.children[2];f.applyForm({model:{costume:'fitted'}});x.step();
  const hand=f.parts.armL.children[2],channel=f._combatAim.armChannels[0],socket=hand.getObjectByName('weapon-muzzle');
  assert.notEqual(old,hand);assert.ok(channel.weight>.1&&channel.independent,'Fixture must inspect a live recovery');
  assert.ok(channel.firearm.hand===hand,'Recovery still corrects a detached hand');
  assert.ok(channel.firearm.socket===socket,'Recovery aims from the retired barrel');
  assert.ok(normal(hand).dot(f.aimWorld.clone().sub(socket.getWorldPosition(new THREE.Vector3())).normalize())>.999);
 }finally{x.close();}
});

for(const motion of ['stand','walk','jog','strafe','hover','fly','rise','descend'])
test(`secondary hand entry/release remains continuous without changing ${motion} travel`,()=>{
 const x=disjointCombatFixture({motion}),{f,dt}=x;
 try{for(let i=0;i<30;i++)x.step();x.start('lmb');for(let i=0;i<60;i++)x.step();
  const position=f.pos.clone(),velocity=f.vel.clone();let previous=null;
  for(let i=0;i<220;i++){
   if(i===10)x.start('rmb');if(i===100)x.stop('rmb');x.step();
   const q=f.parts.torso.quaternion.clone().invert().multiply(f.parts.armL.quaternion);
   if(previous)assert.ok(q.angleTo(previous)<=12*dt+1e-6,'Secondary shoulder snapped through entry/release');previous=q;
   assert.ok(f.pos.distanceTo(position)<1e-8&&f.vel.distanceTo(velocity)<1e-8,'Articulation changed simulation travel');
   if(i===90)assert.ok(f.parts.armL.children[2].morphTargetInfluences[0]>.9,'Free left hand never joined the attack');
  }
  assert.ok(f.slots.lmb.active?.emissionAge>0,'Other hand release ended the beam');
  assert.ok(f.parts.armL.children[2].morphTargetInfluences[0]<.01,'Released off hand never recovered');
 }finally{x.close();}
});

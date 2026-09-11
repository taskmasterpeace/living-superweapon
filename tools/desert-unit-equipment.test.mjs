import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {Fighter} from '../src/engine/entity.js';
import {DesertSecurity} from '../src/engine/desert-security.js';
import {GUARD_DEF} from '../src/engine/police.js';
import {createAuthoredAssetLoader} from '../src/engine/authored-assets.js';
import {loadSoldierEquipment} from '../src/engine/clone-equipment.js';
import {requestReload,updateFirearmReload} from '../src/engine/firearm-ammo.js';
import {runSlot} from '../src/engine/abilities.js';

const assetLoader=()=>createAuthoredAssetLoader({baseUrl:'https://assets.test/',fetch:async url=>new Response(await readFile(resolve('public/authored-assets','.'+new URL(String(url)).pathname)))});
const at=o=>o.getWorldPosition(new THREE.Vector3());
function fixture(loader){
 const x=mainCombatFixture({mode:'powerworld'});x.w.ARENA=1800;x.g.hud=null;x.p.team=0;x.g._equipmentAssetLoader=loader;
 x.g.addFighter=(def,opts)=>{const f=new Fighter(def,opts);f._game=x.g;x.g.entities.push(f);x.g.scene.add(f.obj);return f;};
 const law=new DesertSecurity(x.g);return {...x,law,close(){law.dispose();x.close();}};
}

test('military response has a distinct issued Earth rifle without changing ladder combat values or player gear',async()=>{
 const x=fixture(assetLoader());try{
  const playerDef=JSON.stringify(x.p.def),playerSlots=x.p.slots;
  x.law.deploy(3,1);x.law.deploy(5,1);const military=x.law.cops.find(f=>f._responseTier===5),tactical=x.law.cops.find(f=>f._responseTier===3),officer=x.law.cops[0];
  assert.equal(military.def.abilities.lmb.armoryId,'kuchler');assert.equal(military.def.abilities.lmb.name,'Kuchler Mk I');assert.equal(military.def.model.equipment,'soldier');
  assert.equal(tactical.def.abilities.lmb.armoryId,'mp5');assert.equal(officer.def.abilities.lmb.armoryId,'p9');
  for(const key of ['damage','interval','speed','spread','radius'])assert.equal(military.def.abilities.lmb[key],GUARD_DEF.abilities.lmb[key],key);
  assert.equal(military.flightTier,0);assert.equal(military.slots.lmb.ammo.loaded,24);assert.equal(military.slots.lmb.ammo.reserve,96);
  assert.equal(await military._desertEquipmentReady,true);assert.ok(military.obj.getObjectByName('authored-rifle'));assert.equal(military._gearHeld,null);
  assert.equal(JSON.stringify(x.p.def),playerDef);assert.equal(x.p.slots,playerSlots);assert.equal(x.p._gearHeld,null);
 }finally{x.close();}
});

test('military fires fallback while loading; attachment never refunds ammunition and stale deployments retire once',async()=>{
 const source=await assetLoader().loadEquipmentInstance('equipment.kuchler-rifle@2');let resolveAsset;
 const x=fixture({loadEquipmentInstance:()=>new Promise(r=>resolveAsset=r)});try{
  x.law.deploy(5,1);const f=x.law.cops.find(f=>f._responseTier===5),pending=f._desertEquipmentReady;assert.ok(pending);
  const fallback=f.parts.armR.children[2].children.find(o=>o.userData.weaponKind==='rifle');assert.equal(fallback.visible,true);
  f.aim3.set(0,0,1);runSlot(f,'lmb',{pressed:true,held:true,dt:1/60},x.g);assert.equal(f.slots.lmb.ammo.loaded,23);
  assert.equal(requestReload(f,'lmb',x.g),true);updateFirearmReload(f,.25,x.g);const reload=f._firearmReload;
  resolveAsset(source);assert.equal(await pending,true);assert.equal(f.slots.lmb.ammo.loaded,23);assert.equal(f.slots.lmb.ammo.reserve,96);assert.equal(fallback.visible,false);
  assert.equal(f._firearmReload,reload,'attachment must retain the in-progress native reload');
  for(let i=0;i<180&&f._firearmReload;i++){updateFirearmReload(f,1/60,x.g);f.animT+=1/60;f._animate(1/60);}
  assert.equal(f.slots.lmb.ammo.loaded,24);assert.equal(f.slots.lmb.ammo.reserve,95,'only the native reload consumes one reserve round');
  let staleResolve;const stale=await assetLoader().loadEquipmentInstance('equipment.kuchler-rifle@2');let disposed=0;const dispose=stale.dispose;stale.dispose=()=>{disposed++;dispose();};
  x.g._equipmentAssetLoader={loadEquipmentInstance:()=>new Promise(r=>staleResolve=r)};x.law.deploy(5,1);const late=x.law.cops.at(-1),lateReady=late._desertEquipmentReady;
  x.law.dispose();staleResolve(stale);assert.equal(await lateReady,false);assert.equal(disposed,1);assert.equal(late._formDisposed,true);
 }finally{x.close();}
});

test('unavailable military package leaves the finite-ammo fallback ready',async()=>{
 const x=fixture({loadEquipmentInstance:async()=>{throw Error('offline source');}});try{
  x.law.deploy(5,1);const f=x.law.cops.find(f=>f._responseTier===5);assert.equal(await f._desertEquipmentReady,false);
  assert.equal(f.parts.armR.children[2].children.find(o=>o.userData.weaponKind==='rifle').visible,true);
  runSlot(f,'lmb',{pressed:true,held:true,dt:1/60},x.g);assert.equal(f.slots.lmb.ammo.loaded,23);assert.equal(f.slots.lmb.ammo.reserve,96);
 }finally{x.close();}
});

test('issued rifle and existing fitted helmet/carrier use native NPC grips, physical reload and muzzle',async t=>{
 const x=fixture(assetLoader());try{
  x.law.deploy(5,1);const f=x.law.cops.find(f=>f._responseTier===5);assert.equal(await f._desertEquipmentReady,true);
  // CPU fixtures omit the document-only constructor load. Parse the very same
  // shipping accessory GLB and run its production attachment method explicitly.
  const bytes=await readFile('public/models/frontline/clone-kit.glb');
  const kit=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  await loadSoldierEquipment(f,{loader:{loadAsync:async()=>kit}});
  assert.equal(f.parts.head.getObjectByName('clone_helmet_head').parent,f.parts.head);assert.equal(f.parts.torso.getObjectByName('clone_vest_torso').parent,f.parts.torso);
  const measure=root=>{let triangles=0,draws=0;root.traverseVisible(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;draws++;}});return {triangles,draws};};
  t.diagnostic(`Production NPC geometry (CPU counts): ${JSON.stringify(measure(f.obj))}; helmet/carrier ${JSON.stringify(measure(f.parts.head.getObjectByName('clone_helmet_head')))}/${JSON.stringify(measure(f.parts.torso.getObjectByName('clone_vest_torso')))}`);
  const rifle=f.obj.getObjectByName('authored-rifle'),support=rifle.getObjectByName('weapon-support-grip');f.hasAimWorld=true;f.slots.lmb._poseUntil=Infinity;
  for(const offset of [[0,12,80],[-35,30,60],[35,70,25],[0,1,30]]){
   f.aimWorld.copy(f.pos).add(new THREE.Vector3(...offset));for(let i=0;i<30;i++){f.animT+=1/60;f._animate(1/60);}
   f.obj.updateMatrixWorld(true);assert.ok(f._riflePose?.active);assert.ok(at(support).distanceTo(at(f.parts.armL.children[2]))<.05);
  }
  f.slots.lmb.ammo.loaded=2;assert.equal(requestReload(f,'lmb',x.g),true);const magazine=rifle.getObjectByName('weapon-magazine'),rest=magazine.position.clone();let moved=false;
  for(let i=0;i<180&&f._firearmReload;i++){updateFirearmReload(f,1/60,x.g);f.animT+=1/60;f._animate(1/60);moved||=magazine.position.distanceTo(rest)>.4;}
  assert.ok(moved);assert.equal(f.slots.lmb.ammo.loaded,24);assert.equal(f.slots.lmb.ammo.reserve,74);
  f.slots.lmb.cd=0;runSlot(f,'lmb',{pressed:true,held:true,dt:1/60},x.g);assert.equal(x.g.projectiles.list.at(-1).emitterSocket,rifle.getObjectByName('weapon-muzzle'));
 }finally{x.close();}
});

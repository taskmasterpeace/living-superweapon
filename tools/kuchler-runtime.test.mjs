import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import * as THREE from 'three';
import {createAuthoredAssetLoader} from '../src/engine/authored-assets.js';
import {createEquipmentMount,loadFighterEquipment} from '../src/engine/authored-equipment.js';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {requestReload,updateFirearmReload} from '../src/engine/firearm-ammo.js';
import {trunkProbe} from './helpers/trunk-probe.mjs';
import {firearmById} from '../src/data/armory.js';
import {runSlot} from '../src/engine/abilities.js';
const ROOT=resolve('public/authored-assets'),at=o=>o.getWorldPosition(new THREE.Vector3());
const loader=()=>createAuthoredAssetLoader({baseUrl:'https://assets.test/',fetch:async input=>{
 const path=resolve(ROOT,decodeURIComponent(new URL(String(input)).pathname.slice(1)));
 return new Response(await readFile(path));
}});

test('Kuchler mount keeps named physical action parts and socket-driven grips',async()=>{
 const asset=await loader().loadEquipmentInstance('equipment.kuchler-rifle@2'),mag=asset.root.getObjectByName('weapon-magazine'),bolt=asset.root.getObjectByName('weapon-charging-handle');
 const before=new THREE.Box3().setFromObject(asset.root),mount=createEquipmentMount(asset,{weaponKind:'rifle'});
 try{
  assert.equal(mount.getObjectByName('weapon-magazine'),mag);assert.equal(mount.getObjectByName('weapon-charging-handle'),bolt);
  const after=new THREE.Box3().setFromObject(mount);assert.ok(before.min.distanceTo(after.min)<1e-6&&before.max.distanceTo(after.max)<1e-6,'Pivot conversion moved geometry');
  for(const [part,socket]of [[mag.getObjectByName('magazine-grip'),'socket-magazine'],[bolt,'socket-charging-handle']])assert.ok(at(part).distanceTo(at(mount.getObjectByName(socket)))<1e-5);
  assert.ok(at(mount.getObjectByName('weapon-stock-contact')).distanceTo(at(mount.getObjectByName('socket-stock')))<1e-5);
  assert.ok(at(mount.getObjectByName('weapon-primary-grip')).length()<1e-8);
  const seen=new Set(),counts=new Map();mount.traverse(o=>{if(o.geometry&&!seen.has(o.geometry)){seen.add(o.geometry);o.geometry.addEventListener('dispose',()=>counts.set(o.geometry,(counts.get(o.geometry)||0)+1));}});
  mount.userData.disposeEquipment();mount.userData.disposeEquipment();for(const g of seen)assert.equal(counts.get(g),1);
 }finally{mount.userData.disposeEquipment();}
});

test('real soldier armory issue fires from Kuchler muzzle and drops its resources exactly once',async()=>{
 const x=mainCombatFixture({hero:'sarge'});try{
  const row=firearmById('kuchler');assert.ok(row,'Fitted Kuchler must be in the armory');assert.match(row.n,/KUCHLER/);assert.match(row.d,/fictional/i);
  x.g._equipmentAssetLoader=loader();x.g.equipFrom(x.p,row,{primary:true});assert.equal(await x.p._gearHeld.equipmentReady,true);
  const mount=x.p._gearMesh;assert.equal(mount.userData.authoredEquipment,true);
  x.p.aimWorld.set(0,12,70);x.p.hasAimWorld=true;x.p.aim3.set(0,0,1);x.p.slots.lmb.def.spread=0;
  runSlot(x.p,'lmb',{pressed:true,held:true,dt:1/60},x.g);x.p._animate(1/60);x.p.obj.updateMatrixWorld(true);
  const shot=x.g.projectiles.list.at(-1);assert.ok(shot);assert.equal(shot.emitterSocket,mount.getObjectByName('weapon-muzzle'));
  const seen=new Set(),counts=new Map();mount.traverse(o=>{if(o.geometry&&!seen.has(o.geometry)){seen.add(o.geometry);o.geometry.addEventListener('dispose',()=>counts.set(o.geometry,(counts.get(o.geometry)||0)+1));}});
  x.g.dropGear(x.p,false);x.p.dispose();for(const geometry of seen)assert.equal(counts.get(geometry),1);assert.equal(mount.parent,null);
 }finally{x.close();}
});

for(const why of ['swap','drop','dispose','form'])test(`native issuance rejects late Kuchler after ${why}`,async()=>{
 const x=mainCombatFixture({hero:'sarge'});let resolveAsset;try{
  const asset=await loader().loadEquipmentInstance('equipment.kuchler-rifle@2');let disposals=0;const original=asset.dispose;asset.dispose=()=>{disposals++;original();};
  x.g._equipmentAssetLoader={loadEquipmentInstance:()=>new Promise(resolve=>resolveAsset=resolve)};
  const row={...firearmById('m16'),equipmentAsset:'equipment.kuchler-rifle@2'};
  x.g.equipFrom(x.p,row,{primary:true});const pending=x.p._gearHeld.equipmentReady;assert.ok(pending,'Real issue did not start package load');
  if(why==='swap')x.g.equipFrom(x.p,firearmById('m16'),{primary:true});
  if(why==='drop')x.g.dropGear(x.p,false);
  if(why==='dispose')x.p.dispose();
  if(why==='form')x.p.applyForm({frame:{scale:1.1,bulk:1.1}});
  resolveAsset(asset);assert.equal(await pending,false);assert.equal(disposals,1);assert.notEqual(x.p._gearMesh?.userData.authoredEquipment,true);
 }finally{x.close();}
});

for(const held of [false,true])test(`native form replacement retires fixed equipment and preserves held=${held}`,async()=>{
 const x=mainCombatFixture({hero:'sarge'});try{
  const source=await loader().loadEquipmentInstance('equipment.kuchler-rifle@2'),resources=new Set(),counts=new Map();
  const observe=root=>root.traverse(o=>{for(const resource of [o.geometry,...[].concat(o.material||[])])if(resource&&!resources.has(resource)){resources.add(resource);resource.addEventListener('dispose',()=>counts.set(resource,(counts.get(resource)||0)+1));}});
  observe(source.root);x.g._equipmentAssetLoader={loadEquipmentInstance:async()=>source};
  if(held){x.g.equipFrom(x.p,firearmById('kuchler'),{primary:true});await x.p._gearHeld.equipmentReady;}
  else{x.p.def.model={...x.p.def.model,assets:{equipment:{rifle:'equipment.kuchler-rifle@2'}}};assert.equal(await loadFighterEquipment(x.p,{loader:x.g._equipmentAssetLoader}),true);}
  const mount=held?x.p._gearMesh:x.p.obj.getObjectByName('authored-rifle');observe(mount);
  x.p.applyForm({frame:{scale:1.13,bulk:1.08}});
  for(const resource of resources)assert.equal(counts.get(resource)||0,held?0:1,'form resource ownership');
  if(held){assert.equal(x.p._gearMesh,mount);assert.equal(mount.parent,x.p.parts.armR.children[2]);}
  x.g._equipmentAssetLoader=loader();x.g.equipFrom(x.p,firearmById('kuchler'),{primary:true});assert.equal(await x.p._gearHeld.equipmentReady,true,'reissue on new form');
  const fresh=x.p._gearMesh;assert.notEqual(fresh,mount);x.p.dispose();x.p.dispose();
  for(const resource of resources)assert.equal(counts.get(resource),1);assert.equal(fresh.parent,null);
 }finally{x.close();}
});

for(const frame of [{scale:1,bulk:1},{scale:1.16,bulk:1.3},{scale:.92,bulk:.78}])test(`Kuchler production carrier closes grip through aim/cover/reload ${JSON.stringify(frame)}`,async()=>{
 const x=mainCombatFixture({hero:'sarge'}),f=x.p;f.applyForm({frame});
 const mount=createEquipmentMount(await loader().loadEquipmentInstance('equipment.kuchler-rifle@2'),{weaponKind:'rifle'}),hand=f.parts.armR.children[2];
 hand.children.find(o=>o.userData.weaponKind==='rifle').visible=false;hand.add(mount);
 try{
  f.aimWorld.set(0,70,18);f.hasAimWorld=true;f.slots.lmb._poseUntil=Infinity;x.w.cover.push({x:0,z:4,hx:12,hz:.15,bottom:0,top:20});
  const inside=trunkProbe(f.parts.torso),support=mount.getObjectByName('weapon-support-grip');
  for(let i=0;i<100;i++){
   f.aimWorld.fromArray([[0,70,18],[0,0,12],[-20,18,18],[20,12,18]][Math.floor(i/25)]);f.animT+=1/60;f._animate(1/60);f.obj.updateMatrixWorld(true);
   const inverse=f.parts.torso.matrixWorld.clone().invert(),intrusions=[];
   mount.traverseVisible(mesh=>{if(!mesh.isMesh)return;for(let v=0;v<mesh.geometry.attributes.position.count;v++){const p=mesh.getVertexPosition(v,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);if(inside(p,inverse)){intrusions.push(mesh.name);break;}}});
   assert.deepEqual(intrusions,[],`body overlap frame ${i}`);assert.ok(at(support).distanceTo(at(f.parts.armL.children[2]))<.05,`support gap frame ${i}: ${at(support).distanceTo(at(f.parts.armL.children[2]))}, active ${f._riflePose?.active}`);
  }
  assert.ok(f._riflePose?.active);
  for(const arm of [f.parts.armL,f.parts.armR])assert.ok(at(arm).distanceTo(at(arm.children[2]))<arm.userData.upperLength+arm.userData.foreLength+.002);
  f.slots.lmb.ammo.loaded=3;assert.ok(requestReload(f,'lmb',x.g));let magazineMoved=false,boltMoved=false;
  const magazine=mount.getObjectByName('weapon-magazine'),bolt=mount.getObjectByName('weapon-charging-handle'),magRest=magazine.position.clone(),boltRest=bolt.position.clone();
  for(let i=0;i<180&&f._firearmReload;i++){updateFirearmReload(f,1/60,x.g);f.animT+=1/60;f._animate(1/60);f.obj.updateMatrixWorld(true);magazineMoved||=magazine.position.distanceTo(magRest)>.4;boltMoved||=bolt.position.distanceTo(boltRest)>.1;}
  assert.ok(magazineMoved&&boltMoved,`Physical reload parts never moved: magazine ${magazineMoved}, bolt ${boltMoved}, carrier ${f._riflePose?.active}`);assert.ok(at(support).distanceTo(at(f.parts.armL.children[2]))<.05);
  assert.ok(magazine.position.distanceTo(magRest)<1e-6&&bolt.position.distanceTo(boltRest)<1e-6);
 }finally{mount.userData.disposeEquipment();x.close();}
});

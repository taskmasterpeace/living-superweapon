import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import * as THREE from 'three';
import {createAuthoredAssetLoader} from '../src/engine/authored-assets.js';
import {createEquipmentMount,loadFighterEquipment,replaceHeldEquipment,invalidateEquipmentLoads} from '../src/engine/authored-equipment.js';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {requestReload,updateFirearmReload} from '../src/engine/firearm-ammo.js';
import {trunkProbe} from './helpers/trunk-probe.mjs';

const ROOT=resolve('public/authored-assets'),assetUrl='https://assets.test/';
const fileFetch=async input=>{const url=new URL(String(input)),path=resolve(ROOT,decodeURIComponent(url.pathname.replace(/^\//,'')));try{return new Response(await readFile(path),{status:200});}catch{return new Response('missing',{status:404});}};
const realLoader=()=>createAuthoredAssetLoader({fetch:fileFetch,baseUrl:assetUrl});
const at=o=>o.getWorldPosition(new THREE.Vector3());

test('actual carbine normalizes production grip and exposes physical action parts after mount reset',async()=>{
 const asset=await realLoader().loadEquipmentInstance('equipment.carbine@1'),mount=createEquipmentMount(asset,{weaponKind:'rifle'});
 try{
  mount.position.set(8,9,10);mount.quaternion.setFromEuler(new THREE.Euler(.4,.3,.2));mount.scale.setScalar(1.7);mount.position.set(0,0,0);mount.quaternion.identity();mount.scale.setScalar(1);mount.updateMatrixWorld(true);
  assert.ok(at(mount.getObjectByName('weapon-primary-grip')).length()<1e-7,'primary grip must remain the hand-local origin');
  for(const name of ['weapon-support-grip','weapon-muzzle'])assert.equal(mount.getObjectByName(name)?.parent,mount,`${name} must be a normalized wrapper alias`);
  for(const name of ['weapon-magazine','weapon-charging-handle'])assert.ok(mount.getObjectByName(name)?.isMesh,`${name} must be movable GLB geometry, not an invisible socket`);
  const stock=mount.getObjectByName('weapon-stock-contact');assert.equal(stock.parent,mount);assert.ok(stock.userData.derivedFromGeometry);
 }finally{mount.userData.disposeEquipment();}
});

test('sidearm mount remains one handed and does not invent stock or bolt contact',async()=>{
 const mount=createEquipmentMount(await realLoader().loadEquipmentInstance('equipment.sidearm@1'),{weaponKind:'pistol'});
 try{assert.equal(mount.userData.twoHanded,false);assert.equal(mount.getObjectByName('weapon-stock-contact'),undefined);assert.equal(mount.getObjectByName('weapon-charging-handle'),undefined);}finally{mount.userData.disposeEquipment();}
});

function deferredLoader(){let resolveLoad;const disposed=[];return {disposed,resolve(asset){resolveLoad(asset);},loadEquipmentInstance(){return new Promise(resolve=>resolveLoad=resolve);}};}
function fakeAsset(){const root=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());root.add(mesh);return {root,manifest:{equipment:{twoHanded:true},sockets:[{name:'grip',position:[0,0,0],rotation:[0,0,0,1]},{name:'support',position:[0,-1,0],rotation:[0,0,0,1]},{name:'muzzle',position:[0,-2,0],rotation:[0,0,0,1]}]},dispose(){root.userData.disposed=true;}};}
function fighter(){const hand=new THREE.Group(),old=new THREE.Group();old.userData.weaponKind='rifle';hand.add(old);return {parts:{rig:{},armR:{children:[null,null,hand]},armL:{children:[null,null,new THREE.Group()]}},def:{model:{assets:{equipment:{rifle:'equipment.carbine@1'}}}},slots:{},alive:true,state:'idle',_gearHeld:null,_soldierLoadoutPresentation:{cached:true}};}

for(const stale of ['equip swap','drop','form rebuild','KO','dispose'])test(`late equipment load is rejected after ${stale}`,async()=>{
 const f=fighter(),loader=deferredLoader(),pending=loadFighterEquipment(f,{loader});
 if(stale==='equip swap')f._gearHeld={other:true};
 if(stale==='drop')f._gearHeld={};
 if(stale==='form rebuild')f.parts={...f.parts,rig:{new:true}};
 if(stale==='KO')f.state='ko';
 if(stale==='dispose')f._formDisposed=true;
 const asset=fakeAsset();loader.resolve(asset);await pending;
 assert.equal(asset.root.userData.disposed,true);assert.ok(f.parts.armR.children[2]?.children?.some?.(o=>o.userData.weaponKind==='rifle')??true,'fallback attachment must survive stale completion');
});

test('exact held gear identity gates replacement and invalidation rejects an old generation',async()=>{
 const f=fighter(),expected=f._gearHeld={id:1},loader=deferredLoader(),pending=replaceHeldEquipment(f,'equipment.carbine@1',expected,{loader});
 invalidateEquipmentLoads(f);const asset=fakeAsset();loader.resolve(asset);assert.equal(await pending,false);assert.equal(asset.root.userData.disposed,true);
});

for(const frame of [{scale:1,bulk:1},{scale:1.16,bulk:1.3},{scale:.92,bulk:.78}])test(`actual carbine closes both production arms through steep aim, cover and reload on ${JSON.stringify(frame)}`,async()=>{
 const x=mainCombatFixture({hero:'sarge'}),f=x.p;f.applyForm({frame});
 const mount=createEquipmentMount(await realLoader().loadEquipmentInstance('equipment.carbine@1'),{weaponKind:'rifle'}),hand=f.parts.armR.children[2],old=hand.children.find(o=>o.userData.weaponKind==='rifle');old.visible=false;hand.add(mount);
 try{
  f.aimWorld.set(0,70,18);f.hasAimWorld=true;f.slots.lmb._poseUntil=Infinity;x.w.cover.push({x:0,z:4,hx:12,hz:.15,bottom:0,top:20});
  const inside=trunkProbe(f.parts.torso);
  for(let i=0;i<100;i++){
   f.aimWorld.fromArray([[0,70,18],[0,0,12],[-20,18,18],[20,12,18]][Math.floor(i/25)]);
   f.animT+=1/60;f._animate(1/60);f.obj.updateMatrixWorld(true);
   const inverse=f.parts.torso.matrixWorld.clone().invert(),intrusions=[];
   mount.traverseVisible(mesh=>{if(!mesh.isMesh)return;
    for(let v=0;v<mesh.geometry.attributes.position.count;v++){
     const p=mesh.getVertexPosition(v,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
     if(inside(p,inverse)){intrusions.push(mesh.name);break;}
    }
   });
   assert.deepEqual(intrusions,[],`authored weapon enters actual torso at frame${i}`);
   assert.ok(at(mount.getObjectByName('weapon-support-grip')).distanceTo(at(f.parts.armL.children[2]))<.05,`support contact lost during aim sweep at frame${i}`);
  }
  const support=mount.getObjectByName('weapon-support-grip');assert.ok(f._riflePose?.active,'real rifle must retain the two-hand carrier');
  assert.ok(Number.isFinite(f._riflePose.primaryPullback)&&f._riflePose.primaryPullback>=0&&f._riflePose.primaryPullback<=.9*frame.scale,'carrier must publish its bounded whole-rifle reach correction');
  assert.ok(at(support).distanceTo(at(f.parts.armL.children[2]))<.05,'support hand must close without arm stretching');
  for(const arm of [f.parts.armL,f.parts.armR]){const shoulder=at(arm),wrist=at(arm.children[2]),reach=arm.userData.upperLength+arm.userData.foreLength;assert.ok(shoulder.distanceTo(wrist)<reach+.002);}
  f.slots.lmb.ammo.loaded=3;assert.ok(requestReload(f,'lmb',x.g));for(let i=0;i<180&&f._firearmReload;i++){updateFirearmReload(f,1/60,x.g);f.animT+=1/60;f._animate(1/60);f.obj.updateMatrixWorld(true);}
  assert.ok(at(support).distanceTo(at(f.parts.armL.children[2]))<.05,'support contact must recover after reload');
 }finally{mount.userData.disposeEquipment();x.close();}
});

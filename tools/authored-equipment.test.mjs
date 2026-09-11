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

// Observe real BufferGeometry ownership; no replacement loader or fake mount.
function geometryLedger(){
 const created=new Set(),disposed=new Map(),proto=THREE.BufferGeometry.prototype;
 const setAttribute=proto.setAttribute,dispose=proto.dispose;
 proto.setAttribute=function(...args){created.add(this);return setAttribute.apply(this,args);};
 proto.dispose=function(){disposed.set(this,(disposed.get(this)||0)+1);return dispose.call(this);};
 return {created,disposed,restore(){proto.setAttribute=setAttribute;proto.dispose=dispose;}};
}

test('disposing an actual split carbine releases every generated geometry exactly once',async t=>{
 const asset=await realLoader().loadEquipmentInstance('equipment.carbine@1'),originals=new Set();asset.root.traverse(o=>{if(o.geometry)originals.add(o.geometry);});
 const ledger=geometryLedger();let mount;
 try{
  mount=createEquipmentMount(asset,{weaponKind:'rifle'});assert.ok(ledger.created.size>0);
  t.diagnostic(`Split carbine created ${ledger.created.size} geometries beyond the loaded source`);
  mount.userData.disposeEquipment();mount.userData.disposeEquipment();asset.dispose();
  const leaks=[...ledger.created].filter(g=>ledger.disposed.get(g)!==1);
  assert.equal(leaks.length,0,`${leaks.length}/${ledger.created.size} generated geometries were leaked or double-disposed`);
  for(const geometry of originals)assert.equal(ledger.disposed.get(geometry),1,'loader still owns original geometry');
  assert.equal(mount.parent,null);
 }finally{mount?.userData.disposeEquipment();asset.dispose();ledger.restore();}
});

test('repeated clone equipment retirement leaves another loaded carbine intact',async()=>{
 const loader=realLoader(),keeper=createEquipmentMount(await loader.loadEquipmentInstance('equipment.carbine@1'),{weaponKind:'rifle'});
 const keeperGeometry=keeper.getObjectByName('weapon-magazine').geometry;let keeperDisposals=0;keeperGeometry.addEventListener('dispose',()=>keeperDisposals++);
 try{
  for(let i=0;i<8;i++){
   const mount=createEquipmentMount(await loader.loadEquipmentInstance('equipment.carbine@1'),{weaponKind:'rifle'});
   assert.notEqual(mount.getObjectByName('weapon-magazine').geometry,keeperGeometry);
   mount.userData.disposeEquipment();assert.equal(keeperDisposals,0,'retiring another soldier must not dispose shared live equipment');
  }
  assert.ok(keeperGeometry.attributes.position.count>0);keeper.userData.disposeEquipment();assert.equal(keeperDisposals,1);
 }finally{keeper.userData.disposeEquipment();}
});

test('a carbine rejected after magazine extraction cleans partial geometry and source ownership',async()=>{
 const asset=await realLoader().loadEquipmentInstance('equipment.carbine@1');
 // Remove the physical bolt from the real input by moving only its vertices.
 // The magazine remains valid, so rejection happens after a successful split.
 asset.root.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position,index=o.geometry.index,remove=new Set();
  for(let i=0;i<(index?.count??a.count);i+=3){const ids=[0,1,2].map(k=>index?index.getX(i+k):i+k);
   const center=ids.reduce((p,j)=>p.add(new THREE.Vector3().fromBufferAttribute(a,j)),new THREE.Vector3()).multiplyScalar(1/3);
   if(center.x<-.2&&center.x>-.44&&center.y>-.23&&center.y<-.05&&center.z>-.04&&center.z<.13)ids.forEach(j=>remove.add(j));
  }
  for(const i of remove)a.setX(i,a.getX(i)-10);
 });
 const originals=new Set();asset.root.traverse(o=>{if(o.geometry)originals.add(o.geometry);});
 const ledger=geometryLedger();let mount;
 try{
  assert.throws(()=>{mount=createEquipmentMount(asset,{weaponKind:'rifle'});},/physical magazine or charging-handle/);
  assert.ok(ledger.created.size>0,'must reach partial extraction, not reject before allocation');
  for(const geometry of ledger.created)assert.equal(ledger.disposed.get(geometry),1,'partial mount geometry must be released');
  for(const geometry of originals)assert.equal(ledger.disposed.get(geometry),1,'failed mount must release source geometry');
  assert.equal(asset.root.parent,null);
 }finally{mount?.userData.disposeEquipment();asset.dispose();ledger.restore();}
});

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

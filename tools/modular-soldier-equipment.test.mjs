import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {createAuthoredAssetLoader} from '../src/engine/authored-assets.js';
import {createSoldierFamilyDefinition,soldierLoadout} from '../src/data/soldier-family.js';
import {loadModularCharacter} from '../src/engine/modular-character.js';
import {requestReload,cancelFirearmReload} from '../src/engine/firearm-ammo.js';
import {HighwallLoot} from '../src/engine/highwall-loot.js';
globalThis.ProgressEvent??=class{constructor(type,data){Object.assign(this,{type},data);}};
const root=resolve('public/authored-assets');
const loader=createAuthoredAssetLoader({baseUrl:'https://assets.test/',fetch:async input=>{try{return new Response(await readFile(resolve(root,new URL(input).pathname.slice(1))));}catch{return new Response('',{status:404});}}});
async function body(){const b=await readFile('public/models/modular-hero/modular-hero.glb');return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}

test('actual soldier gun sockets meet modular palms through idle and walking phases',async()=>{
 const x=mainCombatFixture({mode:'powerworld'});x.g._equipmentAssetLoader=loader;
 try{for(const role of ['rifleman','sidearm','heavy']){
  const def=createSoldierFamilyDefinition({role}),f=x.g.addFighter(def,{team:0,x:0,z:0});
  x.g.equipFrom(f,soldierLoadout(def),{primary:true});assert.equal(await f._gearHeld.equipmentReady,true);
  const c=await loadModularCharacter(f,{load:body}),weapon=f._gearMesh;
  assert.equal(weapon.userData.authoredEquipment,true);
  for(const speed of [0,14])for(const phase of [0,.25,.5,.75,.999,1.001]){
   f.animT=phase;f.vel.set(0,0,speed);f._animate(1/60);c.update();f.obj.updateMatrixWorld(true);
   for(const [side,name] of [['L','weapon-primary-grip'],['R','weapon-support-grip']]){
    if(side==='R'&&!weapon.userData.twoHanded)continue;
    const socket=weapon.getObjectByName(name);if(!socket)continue;
    const hand=c.actor.getObjectByName('DEF-hand'+side),palm=hand.localToWorld(new T.Vector3(0,.075,.028));
    const gap=palm.distanceTo(socket.getWorldPosition(new T.Vector3()));
    assert.ok(gap<.25,`${role} speed${speed} phase${phase} ${name} gap ${gap}`);
   }
  }
  if(weapon.userData.twoHanded){
   f.vel.set(0,0,0);f.slots.lmb.ammo.loaded=3;assert.ok(requestReload(f,'lmb',x.g));
   for(const phase of [0,.25,.5,.75,.95]){
    f._firearmReload.elapsed=phase*f._firearmReload.duration;f._animate(1/60);c.update();
    if(weapon.userData.reloadPresentation==='static-source-no-action-parts'){
     assert.equal(weapon.getObjectByName('weapon-magazine'),undefined,'Do not invent a detached magazine in a batched source');
     assert.equal(f._reloadPose?.applied,undefined);
     const palm=c.actor.getObjectByName('DEF-handR').localToWorld(new T.Vector3(0,.075,.028));
     assert.ok(palm.distanceTo(weapon.getObjectByName('weapon-support-grip').getWorldPosition(new T.Vector3()))<.3);
     continue;
    }
    assert.ok(f._reloadPose?.applied,`${role} requires the actual magazine reload driver`);
    const palm=c.actor.getObjectByName('DEF-handR').localToWorld(new T.Vector3(0,.075,.028));
    assert.ok(palm.distanceTo(f._reloadPose.contactWorld)<.3,`${role} reload${phase} palm must follow magazine/bolt timeline: gap${palm.distanceTo(f._reloadPose.contactWorld)}`);
   }
   cancelFirearmReload(f);
  }
 }}finally{x.close();}
});

test('authored gun moves from casualty A to soldier B through loot and real inventory equip',async()=>{
 const x=mainCombatFixture({mode:'powerworld'}),store=new HighwallLoot(x.g);x.g._equipmentAssetLoader=loader;
 try{for(const role of ['heavy','rifleman','sidearm']){
  const a=x.g.addFighter(createSoldierFamilyDefinition({role}),{team:0,x:3,z:0});
  const b=x.g.addFighter(createSoldierFamilyDefinition({role:'sidearm',appearance:'desert'}),{team:0,x:6,z:0});
  x.g.equipFrom(a,soldierLoadout(a.def),{primary:true});await a._gearHeld.equipmentReady;
  a.slots.lmb.ammo.loaded=7;a.slots.lmb.ammo.reserve=13;a.slots.lmb.cd=.2;a.state='ko';
  const box=store.dropDeath(a),entry=box.entries.find(e=>e.kind==='weapon');
  assert.equal(store.transfer(b,box.id,entry.id).ok,true);
  assert.ok(x.g.equipStoredWeapon(b,entry.id));assert.equal(await b._gearHeld.equipmentReady,true);
  assert.equal(b._gearHeld.inventoryRow.equipmentAsset,soldierLoadout(a.def).equipmentAsset);
  assert.equal(b._gearMesh.userData.authoredEquipment,true);assert.equal(b.slots.lmb.ammo.loaded,7);assert.equal(b.slots.lmb.ammo.reserve,13);assert.equal(b.slots.lmb.cd,.2);
  assert.equal(a._gearHeld,null);assert.equal(store.transfer(b,box.id,entry.id).ok,false);
  const c=await loadModularCharacter(b,{load:body});b._animate(1/60);c.update();
  const palm=c.actor.getObjectByName('DEF-handL').localToWorld(new T.Vector3(0,.075,.028));
  assert.ok(palm.distanceTo(b._gearMesh.getObjectByName('weapon-primary-grip').getWorldPosition(new T.Vector3()))<.25);
 }}finally{store.dispose();x.close();}
});

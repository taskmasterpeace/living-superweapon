import test from 'node:test';
import assert from 'node:assert/strict';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {HighwallLoot,snapshotInventory,restoreInventory} from '../src/engine/highwall-loot.js';
import {createSoldierFamilyDefinition,soldierLoadout} from '../src/data/soldier-family.js';
import {weaponById} from '../src/data/armory.js';
import {inventoryLayout,setHeldStowed} from '../src/engine/inventory-model.js';
const soldier=(g,x=3)=>{const d=createSoldierFamilyDefinition();return g.addFighter(d,{team:1,x,z:0});};
function drop(g,store){const f=soldier(g);g.equipFrom(f,weaponById('m16'),{primary:true});f.slots._gear.ammo.loaded=7;f.slots._gear.ammo.reserve=13;f.slots._gear.cd=.27;f.items=[{def:{kind:'medkit',name:'Field kit',charges:3},state:'cooldown',charges:1,cd:4,mesh:null,pos:null}];f.state='ko';return {f,c:store.dropDeath(f,{sourceId:'test-victim'})};}

test('death drops owned weapon/ammo/gadget once, not a default duplicate, independently of corpse',()=>{
 const x=mainCombatFixture({hero:'sarge'}),store=new HighwallLoot(x.g);try{
  const {f,c}=drop(x.g,store);assert.equal(c.entries.filter(e=>e.kind==='weapon').length,1);assert.equal(c.entries.find(e=>e.kind==='weapon').saved.ammo.loaded,7);
  assert.equal(c.entries.find(e=>e.kind==='gadget').item.charges,1);assert.equal(f._gearHeld,null);assert.equal(f.items.length,0);
  assert.equal(store.dropDeath(f,{sourceId:'test-victim'}),c);assert.equal(store.containers.size,1);
  f.obj.removeFromParent();f.dispose();assert.equal(store.containers.get(c.id),c);assert.ok(store.markers.has(c.id));
 }finally{store.dispose();x.close();}
});

test('player and AI share atomic capacity, state, distance and obstruction transfer rules',()=>{
 const x=mainCombatFixture({hero:'sarge'}),store=new HighwallLoot(x.g);try{
  const {c}=drop(x.g,store),entry=c.entries.find(e=>e.kind==='weapon'),p=x.p;
  p.items=Array.from({length:22},()=>({def:{kind:'medkit',name:'Kit'},state:'ready',charges:1,cd:0}));assert.equal(inventoryLayout(p).used,24);
  assert.match(store.transfer(p,c.id,entry.id).reason,/full/);assert.ok(c.entries.includes(entry));p.items=[];
  p.stunT=1;assert.equal(store.transfer(p,c.id,entry.id).ok,false);p.stunT=0;
  p.pos.x=100;assert.match(store.transfer(p,c.id,entry.id).reason,/closer/);p.pos.x=0;
  x.w.cover=[{x:1.5,z:0,hx:.5,hz:5,top:10}];assert.match(store.transfer(p,c.id,entry.id).reason,/obstructed/);x.w.cover=[];
  const ai=soldier(x.g,0);assert.equal(store.transfer(ai,c.id,entry.id).ok,true);assert.equal(ai._inventoryWeapons[0].ammo.loaded,7);
  assert.equal(store.transfer(p,c.id,entry.id).ok,false);assert.equal(ai._inventoryWeapons.length,1);
 }finally{store.dispose();x.close();}
});

test('taking a gun stores it; innate characters still cannot equip, explicit storage ban preserves loot',()=>{
 const x=mainCombatFixture({hero:'sol'}),store=new HighwallLoot(x.g);try{
  const {c}=drop(x.g,store),entry=c.entries.find(e=>e.kind==='weapon');
  x.p.def.equipment={personalWeapons:false,storeWeapons:false};assert.match(store.transfer(x.p,c.id,entry.id).reason,/cannot store/);
  x.p.def.equipment.storeWeapons=true;assert.equal(store.transfer(x.p,c.id,entry.id).ok,true);
  assert.equal(x.g.equipStoredWeapon(x.p,entry.id),null);assert.equal(x.p._inventoryWeapons.length,1);assert.equal(inventoryLayout(x.p).capacity,8);
 }finally{store.dispose();x.close();}
});

test('compatible ammunition transfers once to a needy equipped AI and leaves the empty owned weapon',()=>{
 const x=mainCombatFixture({hero:'sarge'}),store=new HighwallLoot(x.g);try{
  const {c}=drop(x.g,store),entry=c.entries.find(e=>e.kind==='weapon'),ai=soldier(x.g,0);x.g.equipFrom(ai,weaponById('m16'),{primary:true});ai.slots._gear.ammo.reserve=0;
  assert.equal(store.transfer(ai,c.id,entry.id,{ammoOnly:true}).amount,20);assert.equal(ai.slots._gear.ammo.reserve,20);
  assert.equal(store.transfer(ai,c.id,entry.id,{ammoOnly:true}).ok,false);assert.equal(entry.saved.ammo.loaded,0);assert.ok(c.entries.includes(entry));
 }finally{store.dispose();x.close();}
});

test('loot survives JSON save/resume with stable identities and no second death grant',()=>{
 const x=mainCombatFixture({hero:'sarge'}),store=new HighwallLoot(x.g);try{
  const {f,c}=drop(x.g,store),data=JSON.parse(JSON.stringify(store.snapshot()));store.restore(data);
  assert.equal(store.containers.size,1);assert.equal(store.containers.get(c.id).entries[0].id,c.entries[0].id);
  assert.equal(store.dropDeath(f,{sourceId:'test-victim'}).id,c.id);assert.equal(store.containers.size,1);
  const entry=store.containers.get(c.id).entries.find(e=>e.kind==='gadget');assert.equal(store.transfer(x.p,c.id,entry.id).ok,true);
  const again=JSON.parse(JSON.stringify(store.snapshot()));store.restore(again);assert.equal(store.transfer(x.p,c.id,entry.id).ok,false);
  assert.equal(x.p.items.at(-1).charges,1);assert.equal(x.p.items.at(-1).cd,4);
 }finally{store.dispose();x.close();}
});

test('inventory resume preserves held/stored ammo, cooldown and stowed hand claims',()=>{
 const x=mainCombatFixture({hero:'sarge'});try{
  const f=soldier(x.g);x.g.equipFrom(f,weaponById('p9'));f.slots._gear.ammo.loaded=2;f.slots._gear.ammo.reserve=8;
  x.g.equipFrom(f,soldierLoadout(f.def),{primary:true});f.slots._gear.ammo.loaded=3;f.slots._gear.cd=.17;assert.equal(setHeldStowed(f,true),true);
  const save=JSON.parse(JSON.stringify(snapshotInventory(f))),fresh=soldier(x.g,20);
  assert.equal(restoreInventory(x.g,fresh,save).ok,true);assert.equal(fresh.slots._gear.ammo.loaded,3);assert.equal(fresh.slots._gear.cd,.17);
  assert.equal(fresh._inventoryWeapons[0].ammo.loaded,2);assert.equal(fresh._inventoryStowed,true);assert.equal(fresh._heldMount.hand.userData.gripOccupied,false);
  assert.equal(restoreInventory(x.g,fresh,save).ok,false);
 }finally{x.close();}
});

test('native ammo also persists and active deployed gadgets cannot produce a broken resume',()=>{
 const x=mainCombatFixture({hero:'sarge'});try{
  const f=soldier(x.g);f.slots.lmb.ammo={loaded:4,reserve:9,capacity:30};f.slots.lmb.cd=.4;
  const save=JSON.parse(JSON.stringify(snapshotInventory(f))),fresh=soldier(x.g,20);
  assert.equal(restoreInventory(x.g,fresh,save).ok,true);assert.equal(fresh.slots.lmb.ammo.loaded,4);assert.equal(fresh.slots.lmb.ammo.reserve,9);
  f.items=[{def:{kind:'beacon'},state:'deployed',charges:1,cd:0}];assert.throws(()=>snapshotInventory(f),/Recall deployed/);
 }finally{x.close();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {weaponById} from '../src/data/armory.js';
import {inventoryLayout,setHeldStowed} from '../src/engine/inventory-model.js';
import {forearmOccupied} from '../src/engine/weapon-emission.js';

const row=id=>weaponById(id);
const savedFor=(f,id)=>(f._inventoryWeapons||[]).find(s=>s.gear.rowId===id);

test('Game swaps stored primary and sidearm repeatedly without duplication, ammo reset or alias loss',()=>{
 const x=mainCombatFixture({hero:'sarge'}),{g,p}=x,native=p.slots.lmb;
 try{
  assert.ok(g.equipFrom(p,row('m16'),{primary:true}));const rifleAmmo=p.slots._gear.ammo;rifleAmmo.loaded=3;rifleAmmo.reserve=19;p.slots._gear.cd=.27;
  assert.equal(p.slots.lmb,p.slots._gear);assert.equal(Object.keys(p.slots).includes('_gear'),false);
  assert.ok(g.equipFrom(p,row('p9')));const pistolAmmo=p.slots._gear.ammo;pistolAmmo.loaded=2;pistolAmmo.reserve=8;p.slots._gear.cd=.11;
  assert.equal(p.slots.lmb,native);assert.equal(p._inventoryWeapons.length,1);
  for(let i=0;i<4;i++){
   assert.ok(g.equipStoredWeapon(p,savedFor(p,'m16').id));assert.equal(p.slots.lmb,p.slots._gear);assert.equal(p._loadoutPrimary,native);assert.equal(p.slots._gear.ammo,rifleAmmo);assert.equal(p.slots._gear.cd,.27);
   assert.ok(g.equipStoredWeapon(p,savedFor(p,'p9').id));assert.equal(p.slots.lmb,native);assert.equal(p.slots._gear.ammo,pistolAmmo);assert.equal(p.slots._gear.cd,.11);assert.equal(p._inventoryWeapons.length,1);
   assert.equal(inventoryLayout(p).overflow.length,0);
  }
  assert.equal(rifleAmmo.loaded,3);assert.equal(pistolAmmo.loaded,2);g.dropGear(p,false);assert.equal(p.slots.lmb,native);assert.equal(p._gearHeld,null);assert.equal(p._inventoryWeapons.length,1);
 }finally{x.close();}
});

test('Game rejects full backpack acquisition without changing held weapon, ammo, or stored items',()=>{
 const x=mainCombatFixture({hero:'sarge'}),{g,p}=x;
 try{
  assert.ok(g.equipFrom(p,row('m16')));p.items=Array.from({length:19},()=>({def:{name:'Field kit'}}));
  const gear=p._gearHeld,ammo=p.slots._gear.ammo,mesh=p._gearMesh;assert.equal(inventoryLayout(p).used,24);
  assert.equal(g.equipFrom(p,row('p9')),null);assert.equal(p._gearHeld,gear);assert.equal(p.slots._gear.ammo,ammo);assert.equal(p._gearMesh,mesh);assert.equal((p._inventoryWeapons||[]).length,0);
 }finally{x.close();}
});

test('stowed weapon can be replaced and later restored; stow then drop clears claim and alias',()=>{
 const x=mainCombatFixture({hero:'sarge'}),{g,p}=x,native=p.slots.lmb;
 try{
  assert.ok(g.equipFrom(p,row('m16'),{primary:true}));const ammo=p.slots._gear.ammo;ammo.loaded=4;
  assert.equal(setHeldStowed(p,true),true);assert.equal(p._gearMesh.visible,false);assert.equal(forearmOccupied(p.parts.armR),false);
  assert.ok(g.equipFrom(p,row('p9')));assert.equal(p._inventoryStowed,false);assert.equal(p._gearMesh.visible,true);
  assert.ok(g.equipStoredWeapon(p,savedFor(p,'m16').id));assert.equal(p.slots._gear.ammo,ammo);assert.equal(p._inventoryStowed,false);assert.equal(forearmOccupied(p.parts.armR),true);
  assert.equal(setHeldStowed(p,true),true);g.dropGear(p,false);assert.equal(p._inventoryStowed,false);assert.equal(p._gearHeld,null);assert.equal(p.slots.lmb,native);assert.equal(p._heldMount,null);
 }finally{x.close();}
});

test('active weapon cannot be swapped into storage',()=>{
 const x=mainCombatFixture({hero:'sarge'}),{g,p}=x;
 try{
  assert.ok(g.equipFrom(p,row('m16')));const gear=p._gearHeld;p.slots._gear.charging=true;
  assert.equal(g.equipFrom(p,row('p9')),null);assert.equal(p._gearHeld,gear);assert.equal((p._inventoryWeapons||[]).length,0);
 }finally{x.close();}
});
test('swapping stored weapons in a completely full bag does not require extra capacity',()=>{
 const x=mainCombatFixture({hero:'sarge'}),{g,p}=x;
 try{
  assert.ok(g.equipFrom(p,row('m16')));assert.ok(g.equipFrom(p,row('p9')));p.items=Array.from({length:17},()=>({def:{name:'Kit'}}));
  assert.equal(inventoryLayout(p).used,24);
  for(let i=0;i<3;i++){
   assert.ok(g.equipStoredWeapon(p,savedFor(p,'m16').id));assert.equal(inventoryLayout(p).overflow.length,0);
   assert.ok(g.equipStoredWeapon(p,savedFor(p,'p9').id));assert.equal(inventoryLayout(p).overflow.length,0);
  }
 }finally{x.close();}
});

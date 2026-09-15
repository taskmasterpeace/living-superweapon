import {test} from 'node:test';
import assert from 'node:assert/strict';
import {equipmentPolicy,selectedGadget,equipmentActionReason} from '../src/engine/equipment-policy.js';
import {inventoryLayout,moveInventoryEntry,setHeldStowed,inventoryAdmission,captureHeldWeapon,storeWeaponSnapshot,consumeStoredWeapon,restoreWeaponState} from '../src/engine/inventory-model.js';

test('soldiers retain weapon access in flight; authored LSW specialists are eligible',()=>{
 assert.equal(equipmentPolicy({def:{archetype:'soldier',flightTier:3}}).personalWeapons,true);
 assert.equal(equipmentPolicy({def:{}}).personalWeapons,false);
 assert.equal(equipmentPolicy({def:{abilities:{lmb:{type:'rifle'}}}}).personalWeapons,true);
 assert.equal(equipmentPolicy({def:{weaponBased:true}}).personalWeapons,true);
 assert.equal(equipmentPolicy({def:{archetype:'soldier',equipment:{personalWeapons:false}}}).personalWeapons,false);
});
test('both classes have bags, soldiers have more room and LSW has two gadget slots',()=>{
 const items=[{id:1},{id:2},{id:3}],f={def:{},items,_selectedGadget:1};
 assert.equal(selectedGadget(f),items[1]);assert.equal(selectedGadget(f,2),null);assert.equal(selectedGadget(f,-1),null);
 const small=equipmentPolicy(f),large=equipmentPolicy({archetype:'soldier'});assert.ok(small.backpack&&large.backpack);assert.ok(large.columns*large.rows>small.columns*small.rows);
});
test('a held pistol denies two-hand beam, stowing preserves ammo and permits beam',()=>{
 const ab={type:'rifle',weapon:'pistol',oneHand:true},ammo={loaded:7},f={def:{},_gearHeld:{ab},slots:{_gear:{def:ab,ammo}},_gearMesh:{visible:true,getObjectByName(){return null;}}};
 assert.match(equipmentActionReason(f,{type:'beam',castStyle:'two-hand'},{handMask:3}),/Stow/);
 assert.equal(setHeldStowed(f,true),true);assert.equal(f.slots._gear.ammo,ammo);assert.equal(f._gearMesh.visible,false);
 assert.equal(equipmentActionReason(f,{type:'beam',castStyle:'two-hand'},{handMask:3}),null);
 assert.match(equipmentActionReason(f,ab,{handMask:2}),/Draw/);
 setHeldStowed(f,false);assert.equal(f._gearMesh.visible,true);
});
test('bike must explicitly allow a free right hand; two handed rifle and beam denied',()=>{
 const f={def:{},_fleetVehicle:{id:'motorcycle'}},pistol={type:'rifle',weapon:'pistol',oneHand:true};
 assert.match(equipmentActionReason(f,pistol),/does not permit/);
 f._fleetVehicle.personalWeaponHand='right';assert.equal(equipmentActionReason(f,pistol),null);
 assert.match(equipmentActionReason(f,{type:'rifle',weapon:'rifle'}),/one-handed/);
 assert.match(equipmentActionReason(f,{type:'beam',castStyle:'two-hand'}),/one-handed/);
});
test('grid move refuses overlap/out of bounds without dropping equipment',()=>{
 const f={def:{archetype:'soldier'},items:[0,1].map(i=>({def:{name:'Gadget '+i},charges:1})),_gearHeld:{ab:{name:'Rifle',type:'rifle'}}};
 const l=inventoryLayout(f);assert.equal(l.placed.length,4);assert.equal(moveInventoryEntry(f,'held',5,0),false);
 assert.equal(moveInventoryEntry(f,'gadget:1',0,0),false);assert.equal(moveInventoryEntry(f,'held',0,2),true);
 assert.equal(inventoryLayout(f).placed.find(e=>e.id==='held').y,2);assert.equal(f.items.length,2);
});
test('overflow is exposed and retained; mass is not invented',()=>{
 const f={def:{},items:Array.from({length:10},(_,i)=>({def:{name:String(i)}}))};const l=inventoryLayout(f);
 assert.equal(l.overflow.length,4);assert.equal(l.placed[0].massKg,null);assert.equal(f.items.length,10);
});

test('game device occupies real cells and new acquisitions cannot create overflow',()=>{
 const f={def:{},items:Array.from({length:6},()=>({def:{name:'Kit'}}))};
 const layout=inventoryLayout(f);assert.equal(layout.used,8);assert.equal(layout.placed.find(e=>e.kind==='device').width,2);
 assert.equal(inventoryAdmission(f,{type:'rifle',weapon:'pistol',oneHand:true}).ok,false);
});
test('stow denies active sustain or charge instead of hiding a live attack',()=>{
 const f={def:{},_gearHeld:{ab:{type:'rifle'}},_gearMesh:{visible:true,getObjectByName(){return null;}},slots:{lmb:{charging:true}}};
 assert.equal(setHeldStowed(f,true),false);assert.equal(f._gearMesh.visible,true);
 f.slots.lmb={active:{sustaining:true,dead:false}};assert.equal(setHeldStowed(f,true),false);
 f.slots.lmb={};assert.equal(setHeldStowed(f,true),true);
});
test('stored weapon snapshot preserves depleted ammunition across rebuild',()=>{
 const ammo={loaded:2,reserve:17},f={def:{archetype:'soldier'},_gearHeld:{ab:{type:'rifle',name:'Old rifle'},base:{type:'rifle'}},slots:{_gear:{ammo,cd:.2}}};
 const snapshot=captureHeldWeapon(f);storeWeaponSnapshot(f,snapshot);
 f._gearHeld={ab:{type:'rifle'}};f.slots._gear={ammo:{loaded:30},cd:0};
 assert.equal(consumeStoredWeapon(f,snapshot.id),snapshot);assert.equal(restoreWeaponState(f,snapshot),true);assert.equal(f.slots._gear.ammo,ammo);assert.equal(f.slots._gear.cd,.2);
});

test('shared hand claims require both hands for rifle and akimbo, preserve single pistol',async()=>{
 const {castHandMask}=await import('../src/engine/cast-channels.js');const f={def:{}};
 assert.equal(castHandMask(f,{type:'rifle',weapon:'rifle',twoHanded:true}),3);
 assert.equal(castHandMask(f,{type:'rifle',weapon:'pistol',akimbo:true}),3);
 assert.equal(castHandMask(f,{type:'rifle',weapon:'pistol',oneHand:true}),2);
 assert.equal(castHandMask(f,{type:'beam',faceOrigin:true}),0);
});
test('real fighter held grips release on stow and restore on draw, including paired offhand',async()=>{
 const {Fighter}=await import('../src/engine/entity.js');const {ROSTER}=await import('../src/data/characters.js');const {Group}=await import('three');
 const {mountHeldWeapon,forearmOccupied,unmountHeldWeapon}=await import('../src/engine/weapon-emission.js');
 const f=new Fighter(ROSTER.find(d=>d.id==='sol'));const weapon=new Group();weapon.userData={weaponKind:'pistol',paired:true};
 f._gearHeld={ab:{type:'rifle',weapon:'pistol',akimbo:true}};mountHeldWeapon(f,weapon);
 assert.equal(forearmOccupied(f.parts.armR),true);assert.equal(forearmOccupied(f.parts.armL),true);
 assert.equal(setHeldStowed(f,true),true);assert.equal(forearmOccupied(f.parts.armR),false);assert.equal(forearmOccupied(f.parts.armL),false);
 assert.equal(setHeldStowed(f,false),true);assert.equal(forearmOccupied(f.parts.armR),true);assert.equal(forearmOccupied(f.parts.armL),true);
 unmountHeldWeapon(f);f.dispose();
});
test('stow preserves a preexisting unrelated offhand claim',async()=>{
 const {Fighter}=await import('../src/engine/entity.js');const {ROSTER}=await import('../src/data/characters.js');const {Group}=await import('three');const {mountHeldWeapon,forearmOccupied,unmountHeldWeapon}=await import('../src/engine/weapon-emission.js');
 const f=new Fighter(ROSTER.find(d=>d.id==='sol'));const left=f.parts.armL.children[2];left.userData.gripOccupied=true;left.userData.gripKind='other-tool';
 const weapon=new Group();weapon.userData={weaponKind:'pistol',paired:true};f._gearHeld={ab:{type:'rifle',weapon:'pistol',akimbo:true}};mountHeldWeapon(f,weapon);
 assert.equal(setHeldStowed(f,true),true);assert.equal(forearmOccupied(f.parts.armL),true);assert.equal(left.userData.gripKind,'other-tool');
 unmountHeldWeapon(f);f.dispose();
});

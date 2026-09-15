import {castHandMask} from './cast-channels.js';
export function equipmentPolicy(f){
 const def=f?.def??f??{},soldier=def.archetype==='soldier';
 const nativeWeapon=Object.values(def.abilities||{}).some(a=>a.type==='rifle'||a.type==='bow'||a.type==='melee'&&a.weapon);
 const eligible=def.equipment?.personalWeapons??(soldier||def.weaponBased===true||nativeWeapon);
 return {soldier,personalWeapons:!!eligible,backpack:true,gadgetLimit:soldier?Infinity:2,
  columns:soldier?6:4,rows:soldier?4:2,
  weaponReason:eligible?null:'This character has no personal-weapon training. Authored weapon specialists can carry weapons.'};
}
export function selectedGadget(f,index=f?._selectedGadget??0){
 if(!Number.isInteger(index)||index<0||index>=equipmentPolicy(f).gadgetLimit)return null;
 return f?.items?.[index]??null;
}

// Occupancy is a capability query. Call it before payment/activation; never
// silently hide, drop or replace a held gun to make a conflicting power fit.
export function equipmentActionReason(f,def,{handMask}={}){
 if(!def)return null;
 const firearm=def.type==='rifle',one=def.oneHand===true||def.weapon==='pistol';
 const mask=handMask??castHandMask(f,def);
 const held=f._gearHeld?.ab;
 if(held===def&&f._inventoryStowed)return 'Draw the weapon from your backpack first.';
 if(held&&!f._inventoryStowed&&held!==def&&mask&&(mask&castHandMask(f,held)))return 'Stow the held weapon before using this hand action.';
 if((f._carry||f._personCarry)&&mask)return 'Hands occupied by the carried load.';
 const vehicle=f._fleetVehicle;
 if(vehicle&&mask){
  const motorcycle=vehicle.id==='motorcycle'||vehicle.def?.id==='motorcycle'||vehicle.row?.id==='motorcycle';
  if(!motorcycle)return 'Personal weapons are unavailable while operating this vehicle.';
  // A bike keeps the left hand on the controls; weapon use must explicitly be
  // allowed by its seat and use only the right hand. This is not a firing loop.
  if(vehicle.personalWeaponHand!=='right')return 'This riding position does not permit personal weapons.';
  if(!firearm||!one||mask!==2)return 'While riding, use a one-handed weapon in the free right hand.';
 }
 return null;
}

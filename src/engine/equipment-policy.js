export function equipmentPolicy(f){
 const def=f?.def??f??{},soldier=def.archetype==='soldier';
 const flyer=Number(def.flightTier)>0||Number(f?.flightTier)>0;
 return {soldier,personalWeapons:soldier&&!flyer,backpack:soldier,gadgetLimit:soldier?Infinity:2,
  weaponReason:!soldier?'Personal weapons are Soldier equipment.':flyer?'Flight-capable characters cannot carry personal weapons.':null};
}
export function selectedGadget(f,index=f?._selectedGadget??0){
 if(!Number.isInteger(index)||index<0||index>=equipmentPolicy(f).gadgetLimit)return null;
 return f?.items?.[index]??null;
}

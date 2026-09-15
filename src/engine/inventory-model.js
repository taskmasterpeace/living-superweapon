import {equipmentPolicy} from './equipment-policy.js';

export const INVENTORY_CATEGORIES=Object.freeze([
 {id:'weapons',label:'Weapons'},
 {id:'vehicles',label:'Vehicles'},
 {id:'dogs',label:'Dogs / companions',href:'character-families.html'},
 {id:'creatures',label:'Alien creatures',href:'character-families.html'},
]);
export const HANDHELD_DEVICE=Object.freeze({id:'handheld-game',name:'Game device',category:'devices',width:2,height:1,status:'coming-soon'});

// These are storage footprints, not fabricated kilograms. Unknown mass remains
// unknown until the content author supplies inventory.massKg.
export function itemFootprint(def={}){
 const authored=def.inventory||{};
 const gun=def.type==='rifle',long=gun&&!(def.oneHand||def.weapon==='pistol');
 return {width:Math.max(1,Math.min(4,Math.round(authored.width??(long?3:gun?2:1)))),height:Math.max(1,Math.min(4,Math.round(authored.height??1))),massKg:Number.isFinite(authored.massKg)&&authored.massKg>=0?authored.massKg:null};
}
export function inventoryEntries(f){
 const entries=[{...HANDHELD_DEVICE,kind:'device',massKg:null}];
 if(f._gearHeld)entries.push({id:'held',name:f._gearHeld.ab.name||'Carried weapon',kind:'weapon',def:f._gearHeld.ab,...itemFootprint(f._gearHeld.ab),held:!f._inventoryStowed});
 for(const saved of f._inventoryWeapons||[])entries.push({id:saved.id,name:saved.gear.ab.name||'Stored weapon',kind:'stored-weapon',saved,def:saved.gear.ab,...itemFootprint(saved.gear.ab),held:false});
 for(const [index,item]of(f.items||[]).entries())entries.push({id:`gadget:${index}`,name:item.def.name||item.def.kind,kind:'gadget',index,item,def:item.def,...itemFootprint(item.def)});
 return entries;
}
function fits(entry,x,y,placed,policy){
 return Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x+entry.width<=policy.columns&&y+entry.height<=policy.rows&&!placed.some(p=>x<p.x+p.width&&x+entry.width>p.x&&y<p.y+p.height&&y+entry.height>p.y);
}
export function inventoryLayout(f){
 const policy=equipmentPolicy(f),memory=f._inventoryLayout??={},placed=[],overflow=[];
 for(const entry of inventoryEntries(f)){
  let at=memory[entry.id];
  if(!at||!fits(entry,at.x,at.y,placed,policy)){
   at=null;
   for(let y=0;y<policy.rows&&!at;y++)for(let x=0;x<policy.columns&&!at;x++)if(fits(entry,x,y,placed,policy))at={x,y};
  }
  if(at){memory[entry.id]=at;placed.push({...entry,...at});}else overflow.push(entry);
 }
 f._inventoryLayout=memory;
 return {policy,placed,overflow,used:placed.reduce((n,e)=>n+e.width*e.height,0),capacity:policy.rows*policy.columns};
}
export function moveInventoryEntry(f,id,x,y){
 const layout=inventoryLayout(f),entry=[...layout.placed,...layout.overflow].find(e=>e.id===id);
 if(!entry||!fits(entry,x,y,layout.placed.filter(e=>e.id!==id),layout.policy))return false;
 f._inventoryLayout[id]={x,y};return true;
}
export function setHeldStowed(f,stowed){
 if(!f._gearHeld||f.alive===false||f.grabbedBy||f.grabbing||f._carry||f.meleeCharge>0||f._firearmReload||f.stunT>0||f.frozenT>0||f.staggerT>0||inventoryAttackActive(f))return false;
 const mount=f._heldMount;
 if(stowed&&mount&&!mount.inventoryStowClaims){
  mount.inventoryStowClaims=[mount,mount.off].filter(Boolean).map(claim=>{
   const hand=claim.hand,data=hand.userData;
   // The saved pre-mount flag may belong to a native weapon that this mount
   // hid. Preserve unrelated claims; only release occupancy owned by gear.
   const nativeWasVisible=mount.hidden.some(([object,visible])=>visible&&object.parent===hand&&object.userData.weaponKind);
   const occupied=!!claim.occupied&&!nativeWasVisible;
   const saved={hand,occupied:data.gripOccupied,kind:data.gripKind};
   data.gripOccupied=occupied;data.gripKind=occupied?claim.gripKind:undefined;
   return saved;
  });
 }else if(!stowed&&mount?.inventoryStowClaims){
  for(const saved of mount.inventoryStowClaims){saved.hand.userData.gripOccupied=saved.occupied;saved.hand.userData.gripKind=saved.kind;}
  delete mount.inventoryStowClaims;
 }
 f._inventoryStowed=!!stowed;
 if(f._gearMesh)f._gearMesh.visible=!stowed;
 if(f._gearPair)f._gearPair.visible=!stowed;
 return true;
}
export function inventoryAttackActive(f){
 return Object.values(f.slots||{}).some(s=>s.charging||s.active&&!s.active.dead||s.sustainT>0||(s._poseUntil??-1)>(f.animT??0))||!!f._abilityMeleePose||!!f.mstate;
}
// Admission uses the same footprints and occupied cells as the panel. Existing
// overflow survives migration; a new item never silently pushes more into it.
export function inventoryAdmission(f,def,{replaceHeld=false,removeId=null}={}){
 const layout=inventoryLayout(f),entry=itemFootprint(def);
 const occupied=layout.placed.filter(e=>!(replaceHeld&&e.id==='held')&&e.id!==removeId);
 if(layout.overflow.some(e=>!(replaceHeld&&e.id==='held')&&e.id!==removeId))return {ok:false,reason:'Backpack full. Make room before taking more equipment.'};
 for(let y=0;y<layout.policy.rows;y++)for(let x=0;x<layout.policy.columns;x++)if(fits(entry,x,y,occupied,layout.policy))return {ok:true,x,y};
 return {ok:false,reason:`Backpack full. This item needs ${entry.width} × ${entry.height} free cells.`};
}
// Snapshot slot state before game.dropGear tears down presentation. Consumers
// rebuild the mesh through game.equipFrom, then restore this SAME ammo object.
export function captureHeldWeapon(f){
 if(!f._gearHeld||inventoryAttackActive(f)||f._firearmReload)return null;
 return {id:`weapon:${(f._inventorySerial=(f._inventorySerial||0)+1)}`,gear:{...f._gearHeld},ammo:f.slots?._gear?.ammo??null,cd:f.slots?._gear?.cd??0};
}
export function storeWeaponSnapshot(f,snapshot){if(snapshot)(f._inventoryWeapons??=[]).push(snapshot);}
export function storedWeapon(f,id){return (f._inventoryWeapons||[]).find(s=>s.id===id)||null;}
export function consumeStoredWeapon(f,id){const list=f._inventoryWeapons||[],i=list.findIndex(s=>s.id===id);return i<0?null:list.splice(i,1)[0];}
export function restoreWeaponState(f,snapshot){
 if(!snapshot||!f._gearHeld||!f.slots?._gear)return false;
 f.slots._gear.ammo=snapshot.ammo;f.slots._gear.cd=Math.max(0,snapshot.cd||0);f._inventoryStowed=false;return true;
}

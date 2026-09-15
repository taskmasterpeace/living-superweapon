import * as THREE from 'three';
import {equipmentPolicy} from './equipment-policy.js';
import {inventoryAdmission,inventoryAttackActive,setHeldStowed,HANDHELD_DEVICE,logicalWeaponGear} from './inventory-model.js';

// Persist logical ownership, not scene graphs. Infinity is used by existing
// weapon lifetime/ammo rules and must survive JSON/localStorage round trips.
const encode=value=>JSON.parse(JSON.stringify(value,(_,v)=>v===Infinity?'@ww:infinity':v));
const decode=value=>JSON.parse(JSON.stringify(value),(_,v)=>v==='@ww:infinity'?Infinity:v);
const clone=value=>structuredClone(value);
function weaponSnapshot(gear,slot,id){return {id,gear:clone(logicalWeaponGear(gear)),ammo:clone(slot?.ammo??null),cd:slot?.cd??0};}
function gadgetSnapshot(it){return {itemId:it.itemId,def:clone(it.def),state:it.state,cd:it.cd||0,charges:it.charges??0,...(it.condition!==undefined?{condition:clone(it.condition)}:{}),...(it.attachments?{attachments:clone(it.attachments)}:{})};}
export function snapshotInventory(f,{allowDeployed=false}={}){
 if(!allowDeployed&&(f.items||[]).some(it=>it.state==='deployed'))throw Error('Recall deployed gadgets before saving Highwall.');
 const nativeSlots=Object.fromEntries(Object.entries(f.slots||{}).filter(([key,slot])=>key!=='_gear'&&slot!==f.slots._gear&&slot.ammo).map(([key,slot])=>[key,{ammo:clone(slot.ammo),cd:slot.cd||0}]));
 return encode({schema:1,device:f._inventoryDevice!==false&&f.def.vocalFamily!=='zombie',deviceId:f._inventoryDeviceId,
  held:f._gearHeld?weaponSnapshot(f._gearHeld,f.slots._gear,'held'):null,
  weapons:(f._inventoryWeapons||[]).map(saved=>weaponSnapshot(saved.gear,saved,saved.id)),items:(f.items||[]).map(gadgetSnapshot),
  nativeSlots,layout:clone(f._inventoryLayout||{}),serial:f._inventorySerial||0,stowed:!!f._inventoryStowed});
}
export function restoreInventory(game,f,input){
 const data=decode(input);if(data.schema!==1||!Array.isArray(data.weapons)||!Array.isArray(data.items))throw Error('Invalid inventory save');
 if(data.items.some(it=>it.state==='deployed'))return {ok:false,reason:'This save contains an unsupported deployed gadget. Recall it before saving.'};
 // Resume is for a fresh actor. Refuse destructive replacement of an existing
 // acquired loadout; the caller must construct the saved actor first.
 if(f._gearHeld||(f._inventoryWeapons||[]).length)return {ok:false,reason:'Restore inventory onto a fresh actor.'};
 if(data.held&&!equipmentPolicy(f).personalWeapons)return {ok:false,reason:'Saved weapon is not permitted for this character.'};
 const priorItems=f.items,priorDevice=f._inventoryDevice;
 f.items=[];f._inventoryDevice=data.device;f._inventoryDeviceId=data.deviceId;f._inventoryWeapons=[];
 if(data.held){
  const saved=data.held,gear=saved.gear,row=gear.inventoryRow||{id:gear.rowId,ab:gear.base||gear.ab};
  if(!game.equipFrom(f,row,{primary:!!gear.primary})){f.items=priorItems;f._inventoryDevice=priorDevice;return {ok:false,reason:'Saved weapon could not be equipped.'};}
  f.slots._gear.ammo=saved.ammo;f.slots._gear.cd=saved.cd;f._gearHeld.itemId=gear.itemId;
 }
 f._inventoryWeapons=data.weapons;f.items=data.items.map(it=>({...it,mesh:null,pos:null}));
 for(const [key,saved]of Object.entries(data.nativeSlots||{}))if(f.slots[key]&&f.slots[key]!==f.slots._gear){f.slots[key].ammo=saved.ammo;f.slots[key].cd=saved.cd;}
 f._inventoryLayout=data.layout;f._inventorySerial=data.serial;
 // Existing overflow is retained by inventoryLayout, never silently deleted.
 if(data.stowed)setHeldStowed(f,true);
 return {ok:true};
}

export class HighwallLoot {
 constructor(game,{range=16}={}){
  this.game=game;this.range=range;this.containers=new Map();this.markers=new Map();this.dropped=new Set();this.serial=0;this.lifeIds=new WeakMap();
  // A ground interaction marker, not an invented crate sitting over the body.
  this.geometry=new THREE.RingGeometry(2.8,3,4);this.geometry.rotateX(-Math.PI/2);this.material=new THREE.MeshBasicMaterial({color:'#b9a365',side:THREE.DoubleSide});
 }
 sourceOf(f){if(!this.lifeIds.has(f))this.lifeIds.set(f,`life:${++this.serial}`);return this.lifeIds.get(f);}
 marker(c){const mesh=new THREE.Mesh(this.geometry,this.material);mesh.position.set(c.pos.x,c.pos.y+.08,c.pos.z);mesh.userData.highwallLoot=c.id;this.game.scene.add(mesh);this.markers.set(c.id,mesh);}
 dropDeath(f,{sourceId=this.sourceOf(f)}={}){
  if(f.alive!==false)return null;
  if(this.dropped.has(sourceId))return [...this.containers.values()].find(c=>c.sourceId===sourceId)||null;
  const state=decode(snapshotInventory(f,{allowDeployed:true})),id=`loot:${++this.serial}`,entries=[];
  const add=(kind,data)=>{const itemId=data.gear?.itemId||data.item?.itemId||`${id}:${entries.length}`;entries.push({id:itemId,kind,...data});};
  if(state.held)add('weapon',{saved:state.held,gear:state.held.gear});
  for(const saved of state.weapons)add('weapon',{saved,gear:saved.gear});
  // Native physical guns count only when they own actual ammo. A replaced
  // primary backup is not another item. No default loadout is manufactured.
  for(const [key,slot]of Object.entries(f.slots||{}))if(key!=='_gear'&&slot!==f.slots._gear&&slot.ammo&&slot.def?.gear&&slot.def.type==='rifle'){
   add('weapon',{saved:weaponSnapshot({ab:slot.def,base:slot.def,primary:key==='lmb'},slot,key)});slot.ammo=null;
  }
  for(const it of state.items)add('gadget',{item:it});
  if(state.device)add('device',{device:{...HANDHELD_DEVICE},gear:{itemId:state.deviceId}});
  // Ownership is detached once; the game's normal death-drop path must skip
  // this actor. Reanimation then starts with its own empty zombie inventory.
  this.game.dropGear(f,false);f._inventoryWeapons=[];f._inventoryDevice=false;f._inventoryDeviceId=null;
  for(const it of f.items||[])if(it.mesh){it.mesh.removeFromParent();it.mesh.traverse(o=>{o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();});}
  f.items=[];this.dropped.add(sourceId);
  const c={id,sourceId,name:`${f.def.name||'Fallen unit'} · backpack`,pos:{x:f.pos.x,y:Math.max(this.game.world.heightAt?.(f.pos.x,f.pos.z)||0,f.groundY||0),z:f.pos.z},entries};
  // A deployed beacon is packed after its world device is removed; it cannot
  // retain a stale teleport destination. Charges and cooldown remain real.
  for(const e of entries)if(e.kind==='gadget'&&e.item.state==='deployed'){e.item.state='cooldown';e.item.cd=Math.max(e.item.cd,e.item.def.cd||0);}
  this.containers.set(id,c);if(entries.length)this.marker(c);return c;
 }
 access(f,id){
  const c=this.containers.get(id);
  if(!c)return {ok:false,reason:'This backpack is unavailable.'};
  if(!f?.alive||f.grabbedBy||f.grabbing||f.guarding||f.meleeCharge>0||f.sleepT>0||f.stunT>0||f.frozenT>0||f.staggerT>0||f.launchT>0||f._impactRecovery||f._carry||f._personCarry||f._fleetVehicle||f._aircraftVehicle||f._passengerTransport||inventoryAttackActive(f)||f._firearmReload)return {ok:false,reason:'Finish your current action before looting.'};
  if(f.def.equipment?.loot===false)return {ok:false,reason:'This character cannot loot equipment.'};
  if(Math.hypot(f.pos.x-c.pos.x,f.pos.y-c.pos.y,f.pos.z-c.pos.z)>this.range)return {ok:false,reason:'Move closer to the backpack.'};
  const w=this.game.world,from={x:f.pos.x,y:f.pos.y+3,z:f.pos.z},to={x:c.pos.x,y:c.pos.y+2,z:c.pos.z};
  if(w._camNearestT(from.x,from.y,from.z,to.x,to.y,to.z,.15)<.999)return {ok:false,reason:'The backpack is obstructed.'};
  return {ok:true,container:c};
 }
 nearby(f){return [...this.containers.values()].filter(c=>c.entries.length&&this.access(f,c.id).ok).sort((a,b)=>Math.hypot(f.pos.x-a.pos.x,f.pos.z-a.pos.z)-Math.hypot(f.pos.x-b.pos.x,f.pos.z-b.pos.z))[0]||null;}
 transfer(f,id,itemId,{ammoOnly=false}={}){
  const check=this.access(f,id);if(!check.ok)return check;const c=check.container,index=c.entries.findIndex(e=>e.id===itemId),entry=c.entries[index];
  if(!entry)return {ok:false,reason:'This item was already taken.'};
  if(ammoOnly)return this.takeAmmo(f,c,entry);
  if(entry.kind==='weapon'&&f.def.equipment?.storeWeapons===false)return {ok:false,reason:'This character cannot store firearms.'};
  if(entry.kind==='device'&&f._inventoryDevice!==false)return {ok:false,reason:'You already carry this device.'};
  const def=entry.kind==='weapon'?entry.saved.gear.ab:entry.kind==='gadget'?entry.item.def:{inventory:{width:2,height:1}};
  const admission=inventoryAdmission(f,def);if(!admission.ok)return admission;
  if(entry.kind==='weapon'){
   const saved=clone(entry.saved);saved.id=entry.id;saved.gear.itemId=entry.id;
   (f._inventoryWeapons??=[]).push(saved);f._inventoryLayout[saved.id]={x:admission.x,y:admission.y};
  }else if(entry.kind==='gadget'){
   const item=clone(entry.item);item.itemId=entry.id;f.items.push({...item,mesh:null,pos:null});
  }else{f._inventoryDevice=true;f._inventoryDeviceId=entry.id;}
  c.entries.splice(index,1);if(!c.entries.length){this.markers.get(id)?.removeFromParent();this.markers.delete(id);}
  return {ok:true,itemId:entry.id};
 }
 takeAmmo(f,c,entry){
  const held=f._gearHeld,source=entry.saved?.ammo,target=f.slots?._gear?.ammo;
  if(entry.kind!=='weapon'||!held||!source||!target||!held.rowId||held.rowId!==entry.saved.gear.rowId)return {ok:false,reason:'No equipped weapon uses this ammunition.'};
  const amount=Math.max(0,source.loaded||0)+Math.max(0,source.reserve||0);
  if(!Number.isFinite(amount)||amount<=0||!Number.isFinite(target.reserve))return {ok:false,reason:'No transferable ammunition.'};
  target.reserve+=amount;source.loaded=0;source.reserve=0;return {ok:true,amount,itemId:entry.id};
 }
 interact(f=this.game.player){const c=this.nearby(f);if(!c)return false;if(f===this.game.player)this.game.inventoryPanel?.openContainer(this,c.id);return true;}
 snapshot(){return encode({schema:1,serial:this.serial,dropped:[...this.dropped],containers:[...this.containers.values()]});}
 restore(input){
  const data=decode(input);if(data.schema!==1||!Array.isArray(data.containers)||!Array.isArray(data.dropped))throw Error('Invalid Highwall loot save');
  const ids=new Set(),items=new Set();
  for(const c of data.containers){if(ids.has(c.id)||!Array.isArray(c.entries)||![c.pos?.x,c.pos?.y,c.pos?.z].every(Number.isFinite))throw Error('Invalid loot container');ids.add(c.id);for(const e of c.entries){if(items.has(e.id)||!['weapon','gadget','device'].includes(e.kind))throw Error('Duplicate or invalid loot item');items.add(e.id);}}
  for(const marker of this.markers.values())marker.removeFromParent();this.markers.clear();this.containers.clear();
  this.serial=data.serial;this.dropped=new Set(data.dropped);
  for(const c of data.containers){this.containers.set(c.id,c);if(c.entries.length)this.marker(c);}
 }
 dispose(){for(const marker of this.markers.values())marker.removeFromParent();this.markers.clear();this.containers.clear();this.geometry.dispose();this.material.dispose();}
}

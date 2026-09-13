// A weapon is selected by its actual attachment, not by a guessed hand offset.
// Body powers never call this: carrying a gun cannot relocate an eye/chest beam.
import {updateSoldierLoadoutPresentation} from './soldier-loadout-presentation.js';
import {alignWeaponGrip} from './weapon-grip.js';
export function forearmOccupied(arm){
 const hand=arm?.children[2];return !!hand&&(!!hand.userData.gripOccupied||hand.children.some(o=>o.visible&&o.userData.weaponKind));
}
export function firearmEmitter(f,def,{includeStowed=false}={}){
 updateSoldierLoadoutPresentation(f);
 const out=f._firearmEmitter ||= {hand:null,socket:null,weapon:null,side:1};
 out.hand=f.parts?.armR?.children[2];out.socket=out.hand;out.weapon=null;out.side=1;
 if(f._gearMesh&&f.slots?._gear?.def===def){
  out.weapon=f._gearMesh;out.socket=out.weapon.getObjectByName('weapon-muzzle')||out.hand;return out;
 }
 let fallback=null;
 for(const side of [1,-1]){
  const hand=(side<0?f.parts?.armL:f.parts?.armR)?.children[2];
  for(const weapon of hand?.children||[]){
   // Input claims precede drawing a stowed soldier sidearm. Its attachment
   // still owns that hand; visibility must not redirect the claim to a rifle.
   // Ordinary emission and arbitrary hidden/replaced weapons stay excluded.
   const stowed=includeStowed&&f._soldierLoadoutPresentation?.weapons.includes(weapon)&&weapon.userData.weaponKind===def.weapon;
   if(!weapon.visible&&!stowed)continue;
   const socket=weapon.getObjectByName('weapon-muzzle');if(!socket)continue;
   const value={hand,socket,weapon,side};fallback ||= value;
   if(weapon.userData.weaponKind===def.weapon){Object.assign(out,value);return out;}
  }
 }
 if(fallback)Object.assign(out,fallback);return out;
}

export function unmountHeldWeapon(f,game=f._game,commitPending=true){
 const attack=f._abilityMeleePose;
 if(attack?.weapon&&(attack.weapon===f._gearMesh||attack.weapon===f._gearPair)){
  attack.slot.t=0;f._abilityMeleePose=null;
 }
 // A paid final shot can precede expiry/disarm in the same input interval.
 // Removal is the last visible pose of this attachment: commit pending rounds
 // before detaching it, rather than interpreting its local coordinates as world.
 if(commitPending&&f._gearMesh)for(const shot of game?.projectiles?.list||[]){
  let node=shot.emitterSocket;
  while(node&&node!==f._gearMesh)node=node.parent;
  if(node)shot.resolveLaunch(game);
 }
 const mount=f._heldMount;
 if(mount){
  if(mount.off){mount.off.hand.userData.gripOccupied=mount.off.occupied;mount.off.hand.userData.gripKind=mount.off.gripKind;}
  for(const [object,visible]of mount.hidden)object.visible=visible;
  mount.hand.userData.gripOccupied=mount.occupied;mount.hand.userData.gripKind=mount.gripKind;f._heldMount=null;
 }
 f._gearMesh?.removeFromParent();
 f._gearPair?.removeFromParent();f._gearPair=null;
}

export function mountHeldWeapon(f,weapon,transferring=false){
 unmountHeldWeapon(f,f._game,!transferring);
 const hand=f.parts?.armR?.children[2];if(!hand)return;
  const hidden=[];
  // A two-handed item owns the supporting hand too. Stow its native weapon
  // through the same reversible mount record, rather than denying the grip.
  if(weapon.userData.twoHanded||weapon.userData.paired)for(const object of f.parts.armL.children[2].children)
    if(object.userData.weaponKind){hidden.push([object,object.visible]);object.visible=false;}
 for(const object of hand.children)if(object.userData.weaponKind){hidden.push([object,object.visible]);object.visible=false;}
 f._heldMount={hand,hidden,occupied:hand.userData.gripOccupied,gripKind:hand.userData.gripKind};
 delete weapon._gripCoverBounds;
 hand.userData.gripOccupied=true;weapon.position.set(0,0,0);weapon.rotation.set(0,0,0);hand.add(weapon);f._gearMesh=weapon;
  hand.userData.gripKind=alignWeaponGrip(weapon,1)?weapon.userData.gripKind:undefined;
 if(weapon.userData.paired){
  const other=f.parts.armL.children[2],pair=weapon.clone(true);
  pair.userData.paired=false;alignWeaponGrip(pair,-1);
  f._heldMount.off={hand:other,occupied:other.userData.gripOccupied,gripKind:other.userData.gripKind};
  other.userData.gripOccupied=true;other.userData.gripKind=pair.userData.gripKind;other.add(pair);f._gearPair=pair;
 }
}

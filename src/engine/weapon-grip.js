import * as THREE from 'three';

// Legacy meshes point down -Y. Cylindrical handles belong across the curled
// fingers, with the working end on the thumb side, not along the forearm.
const centers={bat:[0,.15,0],nodachi:[0,.2,0],sword:[0,-.25,.16],knife:[0,-.15,.16],axe:[0,-.25,.16],spear:[0,-.25,.16],katana:[0,.2,0],baton:[0,.15,0]};
export function meleeWeaponFor(f,preferredSide=1){
 for(const side of [preferredSide,-preferredSide]){
  const hand=(side===1?f.parts.armR:f.parts.armL).children[2];
  const weapon=hand.children.find(o=>o.visible&&Object.hasOwn(centers,o.userData.weaponKind));
  if(weapon)return {weapon,side};
 }
 return null;
}
export function alignWeaponGrip(weapon,side=1){
 const center=centers[weapon.userData.weaponKind];
 if(!center)return false;
 weapon.rotation.set(0,0,-side*Math.PI/2);
 weapon.position.copy(new THREE.Vector3(...center).applyQuaternion(weapon.quaternion).negate()).add(new THREE.Vector3(0,-.25,.12));
 weapon.userData.gripKind='cylinder';
 return true;
}

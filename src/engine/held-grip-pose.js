import * as THREE from 'three';
import {reachArm} from './hero-rig.js';
const target=new THREE.Vector3(),holderLocal=new THREE.Vector3();
// Derive the contact from the driven torso geometry, excluding capes/equipment.
// This is visual reach only: carry roots and collision remain simulation-owned.
export function heldGripTarget(holder,receiver,arm,out){
 const torso=receiver.parts.torso;if(!torso.geometry.boundingBox)torso.geometry.computeBoundingBox();
 const box=torso.geometry.boundingBox;
 arm.getWorldPosition(out);torso.worldToLocal(out);
 holderLocal.copy(holder.pos);torso.worldToLocal(holderLocal);
 out.x=THREE.MathUtils.clamp(out.x,box.min.x*.65,box.max.x*.65);
 out.y=THREE.MathUtils.clamp(out.y,box.min.y+.15,box.max.y-.15);
 out.z=holderLocal.z>=0?box.max.z+.12:box.min.z-.12;
 return torso.localToWorld(out);
}
export function animateHeldGrip(f){
 const v=f.grabbing;
 if(!f.parts.rig||!v?.parts?.rig||v.grabbedBy!==f||f.grabState!=='clinch'||f._clinchFinisher)return;
 f.obj.updateMatrixWorld(true);v.obj.updateMatrixWorld(true);
 for(const [i,arm,side]of [[0,f.parts.armL,-1],[1,f.parts.armR,1]]){
  // The free hand keeps its native body-punch or active ranged channel.
  if(i===1&&f._clinchPunch||f._combatAim?.armChannels?.[i]?.weight>.01)continue;
  heldGripTarget(f,v,arm,target);arm.parent.worldToLocal(target);
  reachArm(arm,target,side);
  const hand=arm.children[2];if(hand.morphTargetInfluences&&!hand.userData.gripOccupied)hand.morphTargetInfluences[0]=.35;
 }
}

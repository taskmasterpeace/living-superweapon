import * as T from 'three';
import {solveModularArm} from './modular-held-pose.js';

// The gameplay weapon/muzzle stays authoritative. Correct the visible body's
// different proportions at its palms after source motion and native adaptation.
export function syncModularWeaponGrip(f,actor){
 const weapon=f._gearMesh;
 if(!weapon?.visible||f._inventoryStowed||!weapon.userData.authoredEquipment||f.grabbing||f.grabbedBy)return false;
 let applied=false;
 for(const [side,name]of [['L','weapon-primary-grip'],['R','weapon-support-grip']]){
  if(side==='R'&&!weapon.userData.twoHanded)continue;
  const socket=weapon.getObjectByName(name),hand=actor.getObjectByName('DEF-hand'+side);
  if(!socket||!hand)continue;
  const wristBase=hand.quaternion.clone();
  // Iterating compensates for the palm offset as IK rotates the wrist frame;
  // bone lengths, visual root and the weapon transform are never stretched.
  for(let i=0;i<8;i++){
   actor.updateWorldMatrix(true,true);weapon.updateWorldMatrix(true,true);
   const wrist=hand.getWorldPosition(new T.Vector3()),palm=hand.localToWorld(new T.Vector3(0,.075,.028));
   const contact=side==='R'&&f._firearmReload&&f._reloadPose?.applied&&f._reloadPose.contactWorld;
   const target=(contact?contact.clone():socket.getWorldPosition(new T.Vector3())).sub(palm.sub(wrist));
   const solution=solveModularArm(actor,side,target);
   if(solution&&!solution.reachable&&solution.gap>.03){
    // The palm is an end effector beyond the wrist. A modest wrist bend can
    // reach a magazine without stretching an arm to its old-body wrist point.
    actor.updateWorldMatrix(true,true);
    const at=hand.getWorldPosition(new T.Vector3()),from=hand.localToWorld(new T.Vector3(0,.075,.028)).sub(at).normalize();
    const to=(contact?contact.clone():socket.getWorldPosition(new T.Vector3())).sub(at).normalize();
    const delta=new T.Quaternion().setFromUnitVectors(from,to),world=hand.getWorldQuaternion(new T.Quaternion());
    delta.slerp(new T.Quaternion(),.65);world.premultiply(delta);
    hand.quaternion.copy(hand.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(world));
    const bend=wristBase.angleTo(hand.quaternion);if(bend>.7)hand.quaternion.copy(wristBase.clone().slerp(hand.quaternion,.7/bend));
   }
  }
  applied=true;
 }
 return applied;
}

import * as T from 'three';
import {reachArm} from './hero-rig.js';
const point=new T.Vector3(),rest=new T.Vector3(),finger=new T.Vector3();
const aim=new T.Vector3(),rotation=new T.Quaternion(),up=new T.Vector3(0,1,0);
const turn=new T.Quaternion(),pivot=new T.Vector3(),forward=new T.Vector3(0,0,1),pole=new T.Vector3();
const inverseFrame=new T.Matrix4();
export function bowEmitter(f){
 for(const side of [-1,1]){
  const hand=(side<0?f.parts?.armL:f.parts?.armR)?.children[2];
  const weapon=hand?.children.find(o=>o.visible&&o.userData.weaponKind==='bow');
  if(weapon)return {side,weapon,socket:weapon.getObjectByName('bow-launch')};
 }
 return null;
}
export function restoreBowEquipment(f){
 const state=f._bowEquipment;if(!state)return;
 for(const [mesh,visible]of state.hidden)mesh.visible=visible;
 state.hand.userData.gripOccupied=state.occupied;state.hand.userData.gripKind=state.kind;
 state.string.geometry.attributes.position.setXYZ(1,0,0,-.35);
 state.string.geometry.attributes.position.needsUpdate=true;
 state.string.geometry.computeBoundingSphere();f._bowEquipment=null;
 state.string.parent.getObjectByName('bow-arrow').visible=false;
}
// Draw contact is expressed through the same arm carriers as other weapon holds.
// Only presentation is owned here; the ability retains charge and release timing.
export function animateBowDraw(f){
 const p=f.parts,w=Math.min(1,Math.max(0,f._bowDraw||0));
 if(!f._openSky||!p.rig||!f.alive||w<.001||f.guarding||f.poseGuard>.02||f.staggerT>0||f.stunT>0||f.frozenT>0||f.sleepT>0||f.downedT>0||f.grabbedBy||f.grabState||f.mstate||f._abilityMeleePose){restoreBowEquipment(f);return false;}
 let bow,side;
 for(const s of [-1,1]){const h=(s<0?p.armL:p.armR).children[2];const b=h.children.find(o=>o.visible&&o.userData.weaponKind==='bow');if(b){bow=b;side=s;break;}}
 const string=bow?.getObjectByName('bow-string');if(!string){restoreBowEquipment(f);return false;}
 const arm=side<0?p.armL:p.armR,draw=side<0?p.armR:p.armL,hand=draw.children[2];
 if(f._bowEquipment?.hand!==hand)restoreBowEquipment(f);
 if(!f._bowEquipment){
  const hidden=hand.children.filter(o=>o.userData.weaponKind).map(o=>[o,o.visible]);
  f._bowEquipment={hand,string,hidden,occupied:hand.userData.gripOccupied,kind:hand.userData.gripKind};
 }
 for(const [mesh]of f._bowEquipment.hidden)mesh.visible=false;
 hand.userData.gripOccupied=false;hand.userData.gripKind=undefined;
 const s=p.rig.pivotHeight/4.6;
 arm.parent.getWorldQuaternion(rotation).invert();aim.copy(f.aim3).applyQuaternion(rotation).normalize();
 if(aim.lengthSq()<.5)aim.copy(forward);
 turn.setFromUnitVectors(forward,aim);pivot.set(0,arm.position.y,0);
 point.set(side*1.2*s,p.head.position.y-1.1*s,3.2*s).sub(pivot).applyQuaternion(turn).add(pivot);
 pole.set(side*.28,-1,-.12).applyQuaternion(turn);reachArm(arm,point,side,1,pole);
 f.obj.updateMatrixWorld(true);
 rest.set(0,0,-.35);bow.localToWorld(rest);draw.parent.worldToLocal(rest);
 point.set(-side*.65*s,p.head.position.y-.8*s,.65*s).sub(pivot).applyQuaternion(turn).add(pivot).lerp(rest,1-w);
 pole.set(-side*.28,-1,-.12).applyQuaternion(turn);reachArm(draw,point,-side,1,pole);
 updateBowAttachments(f);
 return true;
}
// Torso clearance and hand shaping can adjust carriers after the arm solve.
// Sample those final transforms before rendering or resolving a release.
export function updateBowAttachments(f){
 const state=f._bowEquipment;if(!state)return;
 const {hand,string}=state,bow=string.parent;
 f.obj.updateMatrixWorld(true);finger.set(0,-.25,.12);hand.localToWorld(finger);bow.worldToLocal(finger);
 string.geometry.attributes.position.setXYZ(1,finger.x,finger.y,finger.z);
 string.geometry.attributes.position.needsUpdate=true;string.geometry.computeBoundingSphere();
 const arrow=bow.getObjectByName('bow-arrow');
 aim.copy(f.aim3).transformDirection(inverseFrame.copy(bow.matrixWorld).invert());
 if(aim.lengthSq()<.5)aim.set(0,0,1);
 arrow.position.copy(finger).addScaledVector(aim,1.5);arrow.quaternion.setFromUnitVectors(up,aim);
 arrow.visible=f._bowDrawT>0;
}

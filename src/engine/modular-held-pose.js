import * as T from 'three';
const point=o=>o.getWorldPosition(new T.Vector3());
// Rotate joints only: authored lengths and simulation roots remain authoritative.
export function solveModularArm(actor,side,target){
 const upper=actor.getObjectByName('DEF-upper_arm'+side),fore=actor.getObjectByName('DEF-forearm'+side),hand=actor.getObjectByName('DEF-hand'+side);
 if(!upper||!fore||!hand)return null;
 actor.updateWorldMatrix(true,true);
 const s=point(upper),e=point(fore),w=point(hand),a=s.distanceTo(e),b=e.distanceTo(w),axis=target.clone().sub(s),distance=axis.length();
 if(distance<1e-6||a<1e-6||b<1e-6)return null;
 axis.normalize();const d=T.MathUtils.clamp(distance,Math.abs(a-b)+1e-5,a+b-1e-5),along=(a*a-b*b+d*d)/(2*d);
 const pole=e.clone().sub(s).addScaledVector(axis,-e.clone().sub(s).dot(axis));
 if(pole.lengthSq()<1e-8){pole.set(side==='L'?1:-1,0,0).applyQuaternion(actor.getWorldQuaternion(new T.Quaternion()));pole.addScaledVector(axis,-pole.dot(axis));}
 if(pole.lengthSq()<1e-8)pole.set(0,1,0).cross(axis);
 pole.normalize();const desiredElbow=s.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,a*a-along*along))),desiredHand=s.clone().addScaledVector(axis,d);
 const rotate=(bone,from,to)=>{const q=new T.Quaternion().setFromUnitVectors(from.normalize(),to.normalize()).multiply(bone.getWorldQuaternion(new T.Quaternion()));bone.quaternion.copy(bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));bone.updateWorldMatrix(false,true);};
 rotate(upper,e.clone().sub(s),desiredElbow.clone().sub(s));
 rotate(fore,point(hand).sub(point(fore)),desiredHand.clone().sub(point(fore)));
 return {gap:point(hand).distanceTo(target),reachable:distance<=a+b};
}
export function modularHoldTarget(receiver,side,friendly,out=new T.Vector3(),back=true){
 const actor=receiver?._modularCharacter?.actor;if(!actor)return null;
 actor.updateWorldMatrix(true,true);
 const bone=actor.getObjectByName(friendly||!back?'DEF-upper_arm'+side:'DEF-neck');if(!bone)return null;
 bone.getWorldPosition(out);
 const scale=actor.getWorldScale(new T.Vector3());
 // Neck side / axillary contact, not the center of the chest or root capsule.
 const offset=new T.Vector3(friendly||!back?0:(side==='L'?-.065:.065),friendly?-.065:back?-.01:-.04,friendly?0:back?.07:.03).multiply(scale).applyQuaternion(actor.getWorldQuaternion(new T.Quaternion()));
 return out.add(offset);
}
export function animateModularHeldGrip(f,actor){
 const v=f.grabbing;if(!v||v.grabbedBy!==f||f.grabState!=='clinch'||f._clinchFinisher)return false;
 const friendly=!!f._personCarry?.friendly||f.grabMode==='friendly',back=f.grabMode==='back';let solved=false;
 for(const [side,i]of [['R',0],['L',1]]){
  if(i===1&&f._clinchPunch||f._combatAim?.armChannels?.[i]?.weight>.01)continue;
  if(back&&!friendly&&i===1){
   // Native fallback grips with both arms; explicitly park the unused hand.
   const shoulder=actor.getObjectByName('DEF-upper_arm'+side);
   const scale=actor.getWorldScale(new T.Vector3());
   if(shoulder)solveModularArm(actor,side,point(shoulder).add(new T.Vector3(.04,-.32,.12).multiply(scale).applyQuaternion(actor.getWorldQuaternion(new T.Quaternion()))));
   continue;
  }
  const target=modularHoldTarget(v,side,friendly,new T.Vector3(),back);if(target){solveModularArm(actor,side,target);solved=true;}
 }
 return solved;
}

export function animateModularHeldReceiver(f,actor){
 const holder=f.grabbedBy;if(!holder||holder.grabbing!==f||holder.grabState!=='clinch')return false;
 const friendly=holder._personCarry?.friendly||holder.grabMode==='friendly';
 const neck=actor.getObjectByName('DEF-neck'),head=actor.getObjectByName('DEF-head');
 if(!neck||!head)return false;
 if(f.frozenT>0)return false;
 if(f.stunT>0||f.sleepT>0||f.state==='ko'){
  head.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(.25,0,0)));
  const scale=actor.getWorldScale(new T.Vector3()),rotation=actor.getWorldQuaternion(new T.Quaternion());
  for(const side of ['L','R']){const shoulder=actor.getObjectByName('DEF-upper_arm'+side);if(shoulder)solveModularArm(actor,side,point(shoulder).add(new T.Vector3(side==='L'?.035:-.035,-.35,.10).multiply(scale).applyQuaternion(rotation)));}
  return true;
 }
 if(friendly){
  // Supported passenger relaxes instead of fighting the carrier's grip.
  for(const side of ['L','R']){const fore=actor.getObjectByName('DEF-forearm'+side);fore?.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(.12,0,0)));}
 }else if(holder.grabMode==='back'){
  const t=f.animT||0;head.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(.05,Math.sin(t*4)*.06,Math.sin(t*3)*.04)));
  actor.updateWorldMatrix(true,true);
  const scale=actor.getWorldScale(new T.Vector3());
  for(const side of ['L','R']){const target=point(neck).add(new T.Vector3(side==='L'?.08:-.08,-.02,.08).multiply(scale).applyQuaternion(actor.getWorldQuaternion(new T.Quaternion())));solveModularArm(actor,side,target);}
 }
 actor.updateWorldMatrix(true,true);return true;
}

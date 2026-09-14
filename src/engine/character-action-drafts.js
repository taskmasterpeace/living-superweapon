import * as T from 'three';
import {FULL_BODY_STUDIES,fullBodyStudy} from './character-full-body-studies.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {samplePose,sampleBodyPosition} from './character-authoring.js';
export const ACTION_DRAFTS={
 ...FULL_BODY_STUDIES,
 'Dart throw':{duration:.65,contact:.05,release:.28,controlReturn:.55,joint:'DEF-forearmR',axis:'x',angle:-1.1},
 'Robot idle':{duration:2,contact:0,release:0,controlReturn:0,joint:'DEF-head',axis:'y',angle:.18},
 'Air stagger':{duration:.7,contact:.05,release:.2,controlReturn:.65,joint:'DEF-spine003',axis:'x',angle:-.5},
 'Air stunned':{duration:2,contact:0,release:1.5,controlReturn:2,joint:'DEF-neck',axis:'x',angle:.8},
 'Shock':{duration:.6,contact:0,release:.4,controlReturn:.6,joint:'DEF-spine003',axis:'z',angle:.2},
 'Drowsy':{duration:2.5,contact:0,release:2,controlReturn:2.5,joint:'DEF-neck',axis:'x',angle:.7},
 'Blind flight':{duration:1,contact:.1,release:.7,controlReturn:1,joint:'DEF-forearmR',axis:'x',angle:-1.4},
 'Burn / acid':{duration:1,contact:.15,release:.7,controlReturn:.9,joint:'DEF-upper_armR',axis:'z',angle:.65},
 'Poison / gas':{duration:1.3,contact:.1,release:.9,controlReturn:1.2,joint:'DEF-spine003',axis:'x',angle:.3},
};
export function actionDraft(name,pose){
 if(FULL_BODY_STUDIES[name])return fullBodyStudy(name,pose);
 const d=ACTION_DRAFTS[name];if(!d)throw Error('Unknown draft');const middle=structuredClone(pose),q=new T.Quaternion().fromArray(middle[d.joint]||[0,0,0,1]);q.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(...({x:[1,0,0],y:[0,1,0],z:[0,0,1]}[d.axis])),d.angle));middle[d.joint]=q.toArray();
 return {name,duration:d.duration,base:'Idle_Loop',source:'Power World procedural blocking study; needs animation polish',status:'candidate',markers:{contact:d.contact,release:Math.min(d.release,d.controlReturn),controlReturn:d.controlReturn},keys:[{time:0,pose:structuredClone(pose)},{time:d.duration*.45,pose:middle},{time:d.duration,pose:structuredClone(pose)}]};
}
/** Preview contact only: authority owns approach, reach eligibility and release velocity. */
export function createContactRehearsal(actor,scene){
 const prop=new T.Mesh(new T.BoxGeometry(.6,.4,.25),new T.MeshStandardMaterial({color:'#e4ba52'}));prop.visible=false;scene.add(prop);
 const other=clone(actor);other.name='Interaction partner preview';other.visible=false;scene.add(other);
 // Remove added accessories copied from the current editor; only the shared rig is needed.
 other.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});
 let mode='none',partnerScale=1,air=false;
 return {set(next,scale=1,flying=false){mode=next;partnerScale=scale;air=flying;if(mode==='none'){prop.visible=false;other.visible=false;}},update(time,motion){
  prop.visible=mode==='prop';other.visible=mode==='partner';if(mode==='none')return;
  const hand=actor.getObjectByName(motion?.hand==='left'?'DEF-handL':'DEF-handR');if(!hand||!motion)return;actor.updateMatrixWorld(true);
  const contactStyle=motion.contactStyle||'carry',socketName=contactStyle==='neck'?'DEF-neck':'DEF-spine003';
  const target=mode==='prop'?prop:other,handPos=hand.getWorldPosition(new T.Vector3());
  if(mode==='partner'){
   // Start from the study's reference pose, not the editor's current attack frame.
   // Absolute assignment makes direct seeks and repeated samples deterministic.
   for(const [name,q]of Object.entries(motion.keys?.[0]?.pose||{})){
    const bone=other.getObjectByName(name);if(bone?.isBone)bone.quaternion.fromArray(q);
   }
   other.scale.copy(actor.scale).multiplyScalar(partnerScale);
   other.quaternion.copy(actor.quaternion).multiply(new T.Quaternion().setFromAxisAngle(contactStyle==='carry'?new T.Vector3(0,0,1):new T.Vector3(0,1,0),contactStyle==='carry'||contactStyle==='side'?Math.PI/2:contactStyle==='rear'?0:Math.PI));
  }
  const root=actor.getWorldPosition(new T.Vector3());target.position.copy(root).add(new T.Vector3(1.7,air?2:0,1.5));
  if(time<motion.markers.release){const approach=target.position.clone(),u=Math.min(1,time/Math.max(.001,motion.markers.contact)),smooth=u*u*(3-2*u);target.position.copy(handPos);if(mode==='partner'){
   // Align partner upper torso to the carrier hand; scale does not change the contact.
   const socket=other.getObjectByName(socketName);other.updateMatrixWorld(true);if(socket){const offset=socket.getWorldPosition(new T.Vector3()).sub(other.position);other.position.sub(offset);}
  }target.position.lerp(approach,1-smooth);}else if(time>=motion.markers.release){
   // Sample the exact release pose, independent of playback or scrub history.
   const saved=[];for(const [name,q]of Object.entries(motion.keys?.length?samplePose(motion,motion.markers.release):{})){const bone=actor.getObjectByName(name);if(bone){saved.push([bone,bone.quaternion.clone()]);bone.quaternion.fromArray(q);}}
   const hips=actor.getObjectByName('DEF-hips'),savedHips=hips?.position.clone(),bodyPosition=motion.keys?.length?sampleBodyPosition(motion,motion.markers.release):null;
   if(bodyPosition&&hips)hips.position.fromArray(bodyPosition);
   actor.updateMatrixWorld(true);hand.getWorldPosition(handPos);
   for(const [bone,q]of saved)bone.quaternion.copy(q);if(savedHips)hips.position.copy(savedHips);actor.updateMatrixWorld(true);
   target.position.copy(handPos);
   if(mode==='partner'){other.updateMatrixWorld(true);const socket=other.getObjectByName(socketName);if(socket)target.position.sub(socket.getWorldPosition(new T.Vector3()).sub(other.position));}
   const elapsed=time-motion.markers.release;target.position.add(new T.Vector3(0,-4.9*elapsed*elapsed,elapsed*3));
  }
  target.updateMatrixWorld(true);
 },dispose(){prop.removeFromParent();prop.geometry.dispose();prop.material.dispose();other.removeFromParent();}};
}

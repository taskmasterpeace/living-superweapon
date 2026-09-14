import * as T from 'three';
import {FULL_BODY_STUDIES,fullBodyStudy} from './character-full-body-studies.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {samplePose,sampleBodyPosition} from './character-authoring.js';
import {groundStudyKeys} from './grounded-study.js';
// Production modular-hero arm bind rotations. These poses were authored against
// A_TPose; do not add them to Idle_Loop's already-lowered arms (crosses wrists).
const pickupArmReference={
 'DEF-upper_armL':[.180269539,.683849871,-.179836527,.683747888],
 'DEF-upper_armR':[.180269584,-.683849990,.179836467,.683747709],
 'DEF-forearmL':[.017182229,-.000020216,.000000561,.999852419],
 'DEF-forearmR':[.017182352,.000020466,-.000000349,.999852419],
};
// Multi-joint status candidates: hands stay on the visible front of the body.
const cough=(bend)=>({'DEF-spine003':[bend,0,0],'DEF-neck':[-.12,0,0],'DEF-upper_armR':[.785,1.475,.475],'DEF-forearmR':[1.56,.5,1],'DEF-upper_armL':[1,.49,-1.09],'DEF-forearmL':[.89,.13,-.42]});
const pat=(high)=>({'DEF-spine003':[.08,0,high?.06:-.06],'DEF-neck':[.12,0,0],'DEF-upper_armR':[.715,-1.24,-.94],'DEF-forearmR':[high?1.75:1.55,-.37,-.5],'DEF-upper_armL':[1,.49,-1.09],'DEF-forearmL':[.89,.13,-.42]});
// Air stun is a slack whole-body candidate, not a standing neck nod. Small
// asymmetric changes suggest drag; world trajectory/velocity remain simulation-owned.
const airLimp=(phase)=>({
 'DEF-hips':[.75+Math.sin(phase)*.08,0,.12],
 'DEF-spine003':[.16,0,-.07],'DEF-neck':[.45,Math.sin(phase)*.08,0],
 'DEF-upper_armR':[.85,-.25,.85],'DEF-forearmR':[.75+Math.sin(phase)*.1,-.1,.25],
 'DEF-upper_armL':[1.05,.3,-.65],'DEF-forearmL':[.9-Math.sin(phase)*.1,.1,-.2],
 'DEF-thighR':[-.3,0,.12],'DEF-shinR':[.65+Math.sin(phase)*.12,0,0],
 'DEF-thighL':[-.15,0,-.08],'DEF-shinL':[.4-Math.sin(phase)*.08,0,0],
});
const statusPoses={
 'Air stunned':[0,1,2,3,4].map(i=>({time:i/4,joints:airLimp(i*Math.PI/2)})),
 'Poison / gas':[{time:0,joints:cough(.02)},{time:.25,joints:cough(.2)},{time:.5,joints:cough(.07)},{time:.75,joints:cough(.18)},{time:1,joints:{}}],
 'Burn / acid':[{time:0,joints:pat(false)},{time:.25,joints:pat(true)},{time:.5,joints:pat(false)},{time:.75,joints:pat(true)},{time:1,joints:{}}],
};
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
export function actionDraft(name,pose,actor=null){
 if(FULL_BODY_STUDIES[name]){const pickup=name==='Ground pickup'||name==='Flying pickup',m=fullBodyStudy(name,pickup?{...pose,...pickupArmReference}:pose);if(pickup)m.keys.at(-1).pose=structuredClone(pose);return actor&&FULL_BODY_STUDIES[name].grounded?groundStudyKeys(actor,m):m;}
 const d=ACTION_DRAFTS[name];if(!d)throw Error('Unknown draft');
 if(statusPoses[name]){
  const keys=statusPoses[name].map(k=>{const next=structuredClone(pose);for(const [bone,angles]of Object.entries(k.joints)){
   if(!next[bone])throw Error('Missing status study bone '+bone);
   next[bone]=new T.Quaternion().fromArray(pickupArmReference[bone]||next[bone]).multiply(new T.Quaternion().setFromEuler(new T.Euler(...angles))).normalize().toArray();
  }return {time:k.time*d.duration,pose:next};});
  return {name,duration:d.duration,base:'Idle_Loop',source:'Power World multi-joint status study; visual review pending',status:'candidate',markers:{contact:d.contact,release:d.release,controlReturn:d.controlReturn},keys};
 }
const middle=structuredClone(pose),q=new T.Quaternion().fromArray(middle[d.joint]||[0,0,0,1]);q.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(...({x:[1,0,0],y:[0,1,0],z:[0,0,1]}[d.axis])),d.angle));middle[d.joint]=q.toArray();
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
  const otherHand=motion.hand==='both'?actor.getObjectByName('DEF-handL'):null;
  const handContact=out=>{hand.getWorldPosition(out);if(otherHand)out.lerp(otherHand.getWorldPosition(new T.Vector3()),.5);return out;};
  const contactStyle=motion.contactStyle||'carry',socketName=contactStyle==='neck'?'DEF-neck':'DEF-spine003';
  const target=mode==='prop'?prop:other,handPos=handContact(new T.Vector3());
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
   actor.updateMatrixWorld(true);handContact(handPos);
   for(const [bone,q]of saved)bone.quaternion.copy(q);if(savedHips)hips.position.copy(savedHips);actor.updateMatrixWorld(true);
   target.position.copy(handPos);
   if(mode==='partner'){other.updateMatrixWorld(true);const socket=other.getObjectByName(socketName);if(socket)target.position.sub(socket.getWorldPosition(new T.Vector3()).sub(other.position));}
   const elapsed=time-motion.markers.release;target.position.add(new T.Vector3(0,-4.9*elapsed*elapsed,elapsed*3));
  }
  target.updateMatrixWorld(true);
 },dispose(){prop.removeFromParent();prop.geometry.dispose();prop.material.dispose();other.removeFromParent();}};
}

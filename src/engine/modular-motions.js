import * as T from 'three';
let bankPromise;
// Shared full-skeleton source catalog for the workshop and Animation Library.
// Import lazily: the source bank is intentionally not in the initial game bundle.
export function loadModularMotionBank(){return bankPromise??=fetch('/models/modular-hero/motion-bank.json').then(r=>{if(!r.ok)throw Error('Motion bank failed to load');return r.json();}).catch(e=>{bankPromise=null;throw e;});}
export async function addModularMotions(gltf){
 const bank=await loadModularMotionBank();for(const e of bank.entries)if(!gltf.animations.some(c=>c.name===e.take)){const clip=T.AnimationClip.parse(e.clip);clip.userData={source:e.source,id:e.id,loop:e.loop,status:e.status};gltf.animations.push(clip);}return bank;
}
// Appearance-state overlay, applied AFTER native flight. It never changes
// flight input, velocity, energy, target or the original healthy flight pose.
export function poseInfectedFlight(actor){
 const down=new T.Vector3(0,-1,0),axis=new T.Vector3(),q=new T.Quaternion(),swing=new T.Quaternion();
 actor.updateMatrixWorld(true);
 for(const side of ['L','R'])for(const part of ['upper_arm','forearm','hand']){
  const b=actor.getObjectByName(T.PropertyBinding.sanitizeNodeName(`DEF-${part}.${side}`));if(!b)continue;
  b.getWorldQuaternion(q);axis.set(0,1,0).applyQuaternion(q);swing.setFromUnitVectors(axis,down);q.premultiply(swing);
  b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));b.updateMatrixWorld(true);
 }
}
// Appearance overlay is allowed only when no action owns the hands.
export function canPoseInfectedFlight(f,infection){
 return ['sick','hollow'].includes(infection)&&(f.flying||f.gliding)&&!f.ragdoll&&!['hit','ko','cast'].includes(f.state)&&
 ![f.stunT,f.staggerT,f.frozenT,f.sleepT,f.shockT].some(v=>v>0)&&
 ![f.mstate,f.grabbing,f.grabbedBy,f.grabState,f.guarding,f._carry,f._grapple,f.hanging,f._firearmReload,f._throwAction,f._personThrowPose,f._zombieLimbs].some(Boolean)&&
 !(f.meleeCharge>0)&&!(f.strikeActive>0)&&!Object.values(f.slots||{}).some(s=>s.active||s.charging||s.drawing||s.building);
}

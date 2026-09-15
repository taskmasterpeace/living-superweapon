import * as T from 'three';

let pending;
const parsedBanks=new WeakMap();
export function validatePaidBank(bank){
 if(!bank||!Array.isArray(bank.entries))throw Error('Purchased motion bank has no entries');
 const names=new Set();
 for(const entry of bank.entries){
  const clip=entry.clip;
  if(!entry.take||names.has(entry.take)||!Number.isFinite(entry.duration)||entry.duration<=0||!clip?.tracks?.length)throw Error('Invalid purchased clip '+entry.take);
  names.add(entry.take);
  for(const track of clip.tracks){
   const size=track.type==='quaternion'?4:track.type==='vector'?3:0;
   if(!size||!track.times?.length||track.values?.length!==track.times.length*size||!track.times.every(Number.isFinite)||!track.values.every(Number.isFinite))throw Error('Invalid purchased track '+track.name);
   if(track.times.some((v,i)=>v<0||(i&&v<track.times[i-1])))throw Error('Unordered purchased track '+track.name);
  }
 }
 return bank;
}
export function loadPaidMotionBank(){
 return pending??=fetch('/models/modular-hero/paid-motion-bank.json').then(r=>{if(!r.ok)throw Error('Purchased motion bank unavailable');return r.json();}).then(validatePaidBank).catch(e=>{pending=null;throw e;});
}
export function attachPaidMotionBank(f,c,bank){
 let clips=parsedBanks.get(bank);
 if(!clips){validatePaidBank(bank);clips=bank.entries.map(e=>[e.take,T.AnimationClip.parse(e.clip)]);parsedBanks.set(bank,clips);}
 // AnimationClip tracks are immutable source data; mixers/actions remain per
 // actor. A crowd must not parse and duplicate the same bank for every body.
 for(const [take,clip]of clips)if(!c.clips.has(take))c.clips.set(take,clip);
 f._paidMotionBank=bank;
 return bank.entries.length;
}

// Only freely reacting receiver limbs are admitted initially. Holder contact,
// strike trajectories and recovery support continue to use their proven drivers.
export function paidMotionChoice(f){
 if(!f||f.alive===false||f.def?.model?.paidMotions==='off'||f.ragdoll||f.state==='ko'||f.stunT>0||f.sleepT>0||f.frozenT>0||f.shockT>0)return null;
 const h=f.grabbedBy;
 if(h?.alive!==false&&h?.grabbing===f&&h.grabState==='clinch'&&(h.flying||h.gliding)&&!h._personThrowWindup&&!h._clinchFinisher&&!h._clinchPunch){
  if(h._personCarry?.friendly||h.grabMode==='friendly')return null;
  return {role:Math.hypot(h.vel?.x||0,h.vel?.z||0)>8?'aerial-travel-receiver':'aerial-hold-receiver',time:h._clinchElapsed||0,loop:true};
 }
 return null;
}

export function applyPaidMotion(f,c,choice=paidMotionChoice(f)){
 const previous=f._paidMotionActive;
 f._paidMotionActive=null;
 if(!choice)return false;
 const e=f._paidMotionBank?.entries.find(e=>e.role===choice.role);
 if(!e||!c.clips.has(e.take))return false;
 const keep=[];
 c.actor.traverse(b=>{if(b.isBone)keep.push([b,b.position.clone(),b.quaternion.clone(),b.scale.clone()]);});
 const phase=f.hitstop>0&&previous?.take===e.take?previous.phase:choice.loop?(choice.time%e.duration)/e.duration:T.MathUtils.clamp(choice.time/e.duration,0,1);
 c.pose(e.take,phase);
 for(const [b,p,q,s]of keep){
  // No stretch, no root displacement. Keep neck/head and torso orientation from
  // the actual held body. Source elbows/knees/fingers supply receiver motion.
  b.position.copy(p);b.scale.copy(s);
  const leg=/thigh|shin|foot|toe/.test(b.name),arm=/upper_arm|forearm|hand|thumb|f_index|f_middle|f_ring|f_pinky/.test(b.name);
  if(!leg&&!arm)b.quaternion.copy(q);
  // The source was carried horizontally. Preserve our upright receiver's
  // defensive reach toward the grabbing arm; add restrained struggling rather
  // than transplanting its full overhead arm pose onto a vertical neck hold.
  else b.quaternion.slerp(q,leg?.4:.82);
 }
 c.actor.updateWorldMatrix(true,true);
 f._paidMotionActive={role:choice.role,take:e.take,phase,status:'runtime-assigned-contact-overlay'};
 return true;
}

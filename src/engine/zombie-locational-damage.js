import {queueHitReaction} from './hit-reaction.js';
// Explicit encounter rule; other bodies and weapon classes keep normal defenses.
export function zombieRifleHit(f,amount,opts){
 if(f.def.zombieProfile!=='common'&&f.def.zombieProfile!=='sprinter')return null;
 if(!opts.ballistic||opts.weapon!=='rifle'||!(amount>0)||!['head','torso','armL','armR','legL','legR'].includes(opts.zone))return null;
 if(f.state==='ko')return 0;
 const zone=opts.zone,limb=zone.startsWith('arm')||zone.startsWith('leg'),before=f.hp,statuses=[];
 if(limb){
  const limbs=f._zombieLimbs??={},part=limbs[zone]??={hits:0,disabled:false};part.hits++;
  const wasDisabled=part.disabled;part.disabled=part.hits>=(zone.startsWith('arm')?4:2);
  f.staggerT=Math.max(f.staggerT||0,.35);f.mstate=null;f.mId=null;f.strikeActive=0;f.meleeCharge=0;
  for(const slot of Object.values(f.slots||{}))if(slot.def.type==='melee'){slot.active=null;slot.charging=false;}
  statuses.push('staggered');if(!wasDisabled&&part.disabled)statuses.push(zone.startsWith('arm')?'arm-disabled':'crippled');
 }else f.hp=zone==='head'?0:Math.max(0,f.hp-50);
 f.hitFlash=1;f.state='hit';f.stateT=0;
 if(opts.src){f.lastHitBy=opts.src;f.lastHitT=0;}
 if(f.hp<=0)f._ko(opts);else queueHitReaction(f,limb?8:50,opts);
 const lost=before-f.hp;
 f._game?.onHit?.(f,lost,opts,false,Object.freeze({dtype:'ballistic',attackClass:'bullet',healthLost:lost,resistance:1,absorbed:Object.freeze({plate:0,armor:0,shield:0,nanite:0}),guard:'none',knockedOut:f.state==='ko',statusesAdded:Object.freeze(statuses),zone,contact:opts.contactPoint?{...opts.contactPoint}:null}));
 return lost;
}
export function zombieLegSpeed(f){const l=f._zombieLimbs;return l?.legL?.disabled||l?.legR?.disabled? .35:1;}
export function zombieHasDisabledLimb(f){return Object.values(f._zombieLimbs||{}).some(limb=>limb.disabled);}
export function zombieArmsDisabled(f){return !!(f._zombieLimbs?.armL?.disabled&&f._zombieLimbs?.armR?.disabled);}
export function poseZombieInjuries(f){
 const l=f._zombieLimbs;if(!l||f.ragdoll)return;
 for(const side of ['L','R']){const arm=f.parts['arm'+side],leg=f.parts['leg'+side];
  if(l['arm'+side]?.disabled&&arm){arm.rotation.set(.15,0,side==='L'?-.12:.12);}
  if(l['leg'+side]?.disabled&&leg){leg.rotation.x=-.18;leg.userData.knee.rotation.x=.65;}
 }
}

export function zombieCannotGrab(f){return !!(f._zombieLimbs?.armL?.disabled||f._zombieLimbs?.armR?.disabled);}

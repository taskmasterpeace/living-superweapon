import {MathUtils} from 'three';
import {animatePronePose} from './prone-pose.js';
// Nonlethal thrown impact recovery. Separate from near-death second wind/downedT.
export function beginImpactRecovery(f){
 if(!f.alive||f.state==='ko'||f.ragdoll||f.downedT>0)return false;
 f._impactRecovery={elapsed:0,contactAge:0,duration:1.1};
 f.flying=f.gliding=f.flyHeld=f.descendHeld=false;f.guarding=false;f.meleeCharge=0;
 f.vel.x=f.vel.z=0;f.staggerT=Math.max(f.staggerT,1.1*(f.sheet?.ccRecover||1));
 return true;
}
export function updateImpactRecovery(f,dt){
 const s=f._impactRecovery;if(!s)return;
 if(!f.alive||f.state==='ko'||f.ragdoll||f.grabbedBy||f.pos.y-f.groundY>.6||f.vel.y>5){f._impactRecovery=null;return;}
 f.staggerT=Math.max(f.staggerT,(s.duration-s.elapsed+dt)*(f.sheet?.ccRecover||1));
 // Settling into the supported source pose continues during stun/sleep;
 // recovery progress and control remain paused. Freeze/hitstop freeze both.
 if(f.frozenT>0||f.hitstop>0)return;
 s.contactAge=(s.contactAge||0)+Math.max(0,dt);
 if(f.stunT>0||f.sleepT>0)return;
 s.elapsed=Math.min(s.duration,s.elapsed+Math.max(0,dt));
 if(s.elapsed>=s.duration){f._impactRecovery=null;return;}
 // Existing action gates share stagger's countdown; keep this timer authoritative.
 f.staggerT=Math.max(f.staggerT,(s.duration-s.elapsed+dt)*(f.sheet?.ccRecover||1));
}
export function poseImpactRecovery(f){
 const s=f._impactRecovery;if(!s)return false;
 const rise=MathUtils.clamp((s.elapsed-.25)/.85,0,1),weight=1-rise*rise*(3-2*rise);
 animatePronePose(f,0,weight);return true;
}




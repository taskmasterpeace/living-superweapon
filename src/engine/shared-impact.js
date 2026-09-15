import {physicalBodyWeightLb} from '../data/body-mass.js';
// Ordinary body contacts share one normal-impulse model. World units are game
// units: injury thresholds/caps are tuning, not a medical or SI simulation.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const impactMass=physicalBodyWeightLb;
export function impactTolerance(f){
 const rank=f.def?.resilience??f.def?.attrs?.vig??f.sheet?.attrs?.vig??5;
 return 14+clamp(Number.isFinite(rank)?rank:5,1,10)*3;
}
export function impactInjury(f,deltaSpeed){return Math.min(28,Math.max(0,deltaSpeed-impactTolerance(f))*.22);}
function brace(f,axis,toward){
 if(!f.guarding||f.staggerT>0||f.chargingKi||f.phase||(!f.energyInfinite&&!(f.ki>0)))return 1;
 if(f.def?.guardType!=='barrier'&&(axis==='y'||(f.aim?.[axis]||0)*toward<=.25))return 1;
 // External support from planted legs or controlled flight; this changes
 // response compliance, not authored mass. A loose falling body has no anchor.
 if(!(f.flying||f.onFoot||f.grounded))return 1;
 const drive=clamp(Number.isFinite(f.def?.impactDrive)?f.def.impactDrive:2*(f.flightTier??f.def?.flightTier??3),0,10);
 return 1/(1+clamp(f.strength??5,1,10)*.16*(f.flying?drive/10:1));
}
function owned(f){return f._thrownT>0||f.launchT>0||f.mstate||f._abilityMeleePose?.physicalContact||f.grabState;}
export function resolveSharedImpact(game,a,b,contact){
 if(owned(a)||owned(b)||!game.isFoe?.(a,b))return false;
 if(!(a.flying||b.flying||a.burstT>0||b.burstT>0||a.sprintT>0||b.sprintT>0||a._slideT>0||b._slideT>0))return false;
 const {axis,sign}=contact,closing=(a.vel[axis]-b.vel[axis])*sign;
 if(closing<=24)return false;
 // A pair may be revisited by the solver or continuously pushed together by
 // movement thrust. Keep momentum response but admit injury at most per .65s.
 const registry=game._sharedImpactPairs ||= new WeakMap();
 let peers=registry.get(a);if(!peers){peers=new WeakMap();registry.set(a,peers);}
 let reverse=registry.get(b);if(!reverse){reverse=new WeakMap();registry.set(b,reverse);}
 const now=game.time||0,last=peers.get(b)??-Infinity,injure=now<last||now-last>=.65;
 const invA=brace(a,axis,sign)/impactMass(a),invB=brace(b,axis,-sign)/impactMass(b);
 const impulse=closing*1.08/(invA+invB),da=impulse*invA,db=impulse*invB;
 a.vel[axis]-=sign*da;b.vel[axis]+=sign*db;
 if(injure){
  peers.set(b,now);reverse.set(a,now);
  // No kb/launch: the impulse above is already applied. The regular damage
  // pipeline owns energy guard, armor, injury, hit reaction and source credit.
  for(const [f,src,delta]of [[a,b,da],[b,a,db]]){
   const amount=impactInjury(f,delta);
   if(amount>0)f.takeDamage(amount,{src,slam:true,bodyImpact:true,hitstop:.06,dtype:'physical'});
  }
 }
 return true;
}

// Surface normal points from hull toward fighter. Read pre-bounce velocities;
// tangential travel and same-speed following contribute no contact speed.
export function vehicleContactSpeed(f,cover,axis,normal){
 const body=cover?._impactBody,velocity=cover?.construct?.actor?.velocity;
 const hull=velocity?.[axis]??body?.[`v${axis}`]??0;
 return Math.max(0,-((f.vel?.[axis]||0)-hull)*normal);
}
export function vehicleImpactDamage(f,speed){return speed*.55*clamp(impactMass(f)/180,.5,3);}

import * as THREE from 'three';
import {fighterPathFraction} from './fighter-environment-contact.js';
// One launch impulse; native Fighter physics owns gravity, translation and contact.
const blocked=f=>!f.alive||f.launchT>0||f.staggerT>0||f.stunT>0||f.frozenT>0||f.grabbedBy||f.grabbing||f._carry||f._grapple||f.hanging||f._mount||f._scoutVehicle||f._aircraftVehicle||f._passengerTransport||f.mstate||f.meleeCharge>0||f.guarding||Object.values(f.slots||{}).some(s=>s.active||s.charging);
export function cancelInterruptedTraversalLeap(f){if(f._traversalLeap&&blocked(f))f._traversalLeap=null;}
export function traversalLeapLaunch(f){
 const p=f.def.traversalLeap,s=f._traversalLeap;
 const fraction=Math.min(1,s.charge/p.chargeTime,Math.max(0,f.ki)/p.cost);
 const dx=f._mvX||0,dz=f._mvZ||0,yaw=Math.hypot(dx,dz)>.01?Math.atan2(dx,dz):f.facing;
 const forward=p.forwardMin+(p.forwardMax-p.forwardMin)*fraction;
 return {fraction,cost:p.cost*fraction,velocity:new THREE.Vector3(Math.sin(yaw)*forward,p.upMin+(p.upMax-p.upMin)*fraction,Math.cos(yaw)*forward)};
}
export function previewTraversalLeap(f,world){
 if(!f._traversalLeap||f._traversalLeap.active||blocked(f))return null;
 const launch=traversalLeapLaunch(f),velocity=launch.velocity.clone(),position=f.pos.clone(),points=[position.clone()],dt=1/60;
 let contact=false;
 for(let i=0;i<300;i++){
  velocity.x*=Math.exp(-.12*dt);velocity.z*=Math.exp(-.12*dt);velocity.y=Math.max(-160,velocity.y-60*dt);
  const next=position.clone().addScaledVector(velocity,dt);let fraction=fighterPathFraction(f,world,position,next);
  if(Number.isFinite(world.ARENA))for(const axis of ['x','z']){const bound=world.ARENA-4;if(Math.abs(next[axis])>bound)fraction=Math.min(fraction,Math.max(0,(Math.sign(next[axis])*bound-position[axis])/(next[axis]-position[axis])));}
  position.lerp(next,fraction);points.push(position.clone());
  if(fraction<1){contact=true;break;}
 }
 return {...launch,points,contact};
}
export function updateTraversalLeap(f,dt,canFly){
 const p=f.def.traversalLeap;
 if(!p||!f._openSky||canFly||f.flying||blocked(f)){f._traversalLeap=null;return false;}
 let s=f._traversalLeap;
 const version=f._game?.input?.cancelVersion;
 if(s&&s.version!==version){f._traversalLeap=null;return true;}
 if(s?.active){if(f.onFoot&&f.vel.y<=0)f._traversalLeap=null;return true;}
 if(f.flyHeld&&!f._flyPrev&&f.onFoot&&f._landT<=0)s=f._traversalLeap={charge:0,active:false,version};
 if(!s)return true;
 if(f.flyHeld){s.charge=Math.min(p.chargeTime,s.charge+dt);return true;}
 const launch=traversalLeapLaunch(f),fraction=launch.fraction;
 if(!f.spendKi(launch.cost)){f._traversalLeap=null;return true;}
 f.vel.copy(launch.velocity);
 f._jumpT=f.vel.y/60;f._liftFx=.25;s.active=true;s.turnLeft=p.turnBudget;s.charge=fraction;
 f._game?.hud?.feed?.(`LEAP · ${Math.round(fraction*100)}% · ${Math.round(p.cost*fraction)} energy`,'#ffd24a');
 return true;
}
export function steerTraversalLeap(f,dir,dt){
 const s=f._traversalLeap,p=f.def.traversalLeap;if(!s?.active)return false;
 if(blocked(f)||f.flying){f._traversalLeap=null;return false;}
 const speed=Math.hypot(f.vel.x,f.vel.z);if(speed<.01)return true;
 if(Math.hypot(dir?.x||0,dir?.z||0)>.01){
  const yaw=Math.atan2(f.vel.x,f.vel.z),target=Math.atan2(dir.x,dir.z),delta=Math.atan2(Math.sin(target-yaw),Math.cos(target-yaw));
  const turn=Math.sign(delta)*Math.min(Math.abs(delta),s.turnLeft,p.turnRate*dt);s.turnLeft-=Math.abs(turn);
  f.vel.x=Math.sin(yaw+turn)*speed;f.vel.z=Math.cos(yaw+turn)*speed;
 }
 return true;
}

export function planTraversalLeap(f,target,world){
 if(!f.def.traversalLeap||!target?.alive)return null;
 const dx=target.pos.x-f.pos.x,dz=target.pos.z-f.pos.z,distance=Math.hypot(dx,dz);
 if(distance<45||distance>400)return null;
 const probe=Object.create(f);probe._mvX=dx/distance;probe._mvZ=dz/distance;
 let best=null;
 for(const fraction of [.15,.25,.4,.55,.7,.85,1]){
  if(fraction*f.def.traversalLeap.cost>f.ki)continue;
  probe._traversalLeap={charge:fraction*f.def.traversalLeap.chargeTime,active:false};
  const cue=previewTraversalLeap(probe,world);if(!cue?.contact)continue;
  const end=cue.points.at(-1),ground=world.heightAt(end.x,end.z);
  if(Math.abs(end.y-ground)>3)continue; // Do not deliberately land against a vertical wall.
  const error=Math.hypot(end.x-target.pos.x,end.z-target.pos.z);
  if(error>Math.min(35,distance*.35))continue;
  if(!best||error<best.error)best={error,chargeTime:fraction*f.def.traversalLeap.chargeTime,move:{x:dx/distance,z:dz/distance}};
 }
 return best;
}
export function driveTraversalLeapAI(f,it,g,dt){
 if(!f.def.traversalLeap||!f._openSky||f.flightTier>0||f.flying||blocked(f)){f._aiTraversalLeap=null;return false;}
 if(f._traversalLeap?.active){f._aiTraversalLeap=null;return false;}
 let plan=f._aiTraversalLeap;
 if(!plan&&f.onFoot&&(g.time||0)>=(f._aiLeapNext||0)&&it.target&&g.canSee(f,it.target)){
  f._aiLeapNext=(g.time||0)+2;plan=planTraversalLeap(f,it.target,g.world);
  if(plan){plan.remaining=plan.chargeTime;f._aiTraversalLeap=plan;}
 }
 if(!plan)return false;
 // Commit a visible target direction, not continuous target homing.
 it.move=plan.move;it.aimDir=plan.move;it.slots={};it.fly=plan.remaining>0;plan.remaining-=dt;
 if(!it.fly)f._aiTraversalLeap=null;
 return true;
}

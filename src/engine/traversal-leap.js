// One launch impulse; native Fighter physics owns gravity, translation and contact.
const blocked=f=>!f.alive||f.launchT>0||f.staggerT>0||f.stunT>0||f.frozenT>0||f.grabbedBy||f.grabbing||f._carry||f._grapple||f.hanging||f._mount||f._scoutVehicle||f._aircraftVehicle||f._passengerTransport||f.mstate||f.meleeCharge>0||f.guarding||Object.values(f.slots||{}).some(s=>s.active||s.charging);
export function cancelInterruptedTraversalLeap(f){if(f._traversalLeap&&blocked(f))f._traversalLeap=null;}
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
 const fraction=Math.min(1,s.charge/p.chargeTime,Math.max(0,f.ki)/p.cost);
 if(!f.spendKi(p.cost*fraction)){f._traversalLeap=null;return true;}
 const dx=f._mvX||0,dz=f._mvZ||0,length=Math.hypot(dx,dz);
 const yaw=length>.01?Math.atan2(dx,dz):f.facing;
 const forward=p.forwardMin+(p.forwardMax-p.forwardMin)*fraction;
 f.vel.set(Math.sin(yaw)*forward,p.upMin+(p.upMax-p.upMin)*fraction,Math.cos(yaw)*forward);
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

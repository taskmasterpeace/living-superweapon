const interrupted=f=>!f.alive||f.launchT>0||f.staggerT>0||f.stunT>0||f.frozenT>0||f.grabbedBy||f._grapple||f.hanging||f.mstate||f.meleeCharge>0;
export function canMomentumGlide(f){
 const p=f.def.momentumGlide;return !!(p&&!f.flying&&!interrupted(f)&&f.flyHeld&&!f.descendHeld&&f.vel.y<2&&f.pos.y-(f.groundY||0)>2.5&&Math.hypot(f.vel.x,f.vel.z)>=p.minSpeed);
}
export function steerMomentumGlide(f,dir,dt){
 // onFoot includes coyote-time jump permission after leaving a surface. It
 // must not let the walking speed clamp consume a speedster's launch momentum.
 const supported=f.onBlock||f.pos.y<=(f.groundY||0)+.02;
 const p=f.def.momentumGlide;if(!p||!f._openSky||supported||f.flying||interrupted(f))return false;
 const speed=Math.hypot(f.vel.x,f.vel.z);if(speed<.01)return true;
 if(Math.hypot(dir?.x||0,dir?.z||0)>.01){
  const yaw=Math.atan2(f.vel.x,f.vel.z),wanted=Math.atan2(dir.x,dir.z),delta=Math.atan2(Math.sin(wanted-yaw),Math.cos(wanted-yaw));
  const turn=Math.sign(delta)*Math.min(Math.abs(delta),p.turnRate*dt);
  f.vel.x=Math.sin(yaw+turn)*speed;f.vel.z=Math.cos(yaw+turn)*speed;
 }
 return true; // Input redirects existing momentum; it never creates speed aloft.
}

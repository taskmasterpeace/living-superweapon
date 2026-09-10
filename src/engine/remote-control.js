// Shared authority for second-press attacks. This is data/intent only: production
// projectiles retain responsibility for trajectory, damage and disposal.
export function remoteInterrupted(c){
  return c.frozenT>0 || c.stunT>0 || c.staggerT>0 || !!c.grabbedBy;
}

export function remoteAttack(c,st){
  if(!st?.def.remoteDetonate)return null;
  const beam=st.def.type==='beam',shot=beam?st.active:st.remoteShot;
  if(!shot || shot.dead || shot.pendingLaunch || (beam && shot.sustaining===false) || shot.caster!==c || typeof shot.detonate!=='function'){
    if(!beam)st.remoteShot=null;
    return null;
  }
  return shot;
}

// Caller must have acquired a visible target. This never searches the world or
// reads a hidden foe; the AI's existing sight/acquisition branch owns perception.
export function remoteInRange(c,st,target){
  const shot=remoteAttack(c,st);
  if(!shot || !target?.alive || shot.clashing)return false;
  const beam=st.def.type==='beam',i=Math.max(0,(shot.pn||1)-1)*3;
  const x=beam?shot.path[i]:shot.pos.x;
  const y=beam?shot.path[i+1]:shot.pos.y;
  const z=beam?shot.path[i+2]:shot.pos.z;
  const radius=beam?shot.detonateRadius:shot.blast;
  return radius>0 && Math.hypot(x-target.pos.x,y-target.pos.y-5,z-target.pos.z)<=radius*.6;
}

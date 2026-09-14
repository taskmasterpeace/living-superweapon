// Visual release continuity only. The simulation owns launch velocity and control locks.
export function beginPersonThrowPose(f){
 const nodes=[f.parts.armL,f.parts.armR].flatMap(a=>[a,...a.children]);
 f._personThrowPose={remaining:.3,duration:.3,rig:f.parts,keys:nodes.map(node=>({node,position:node.position.clone(),quaternion:node.quaternion.clone()}))};
}
export function advancePersonThrowPose(f,dt){
 const s=f._personThrowPose;if(!s)return;
 if(s.rig!==f.parts||f.state==='ko'||f.state==='hit'||f.stunT>0||f.staggerT>0||f.frozenT>0||f.grabState||f.mstate||f.guarding||f.state==='cast'){f._personThrowPose=null;return;}
 if(f.hitstop>0)return;
 s.remaining=Math.max(0,s.remaining-dt);if(!s.remaining)f._personThrowPose=null;
}
export function animatePersonThrowPose(f){
 const s=f._personThrowPose;if(!s||s.rig!==f.parts)return false;
 const t=s.remaining/s.duration,w=t*t*(3-2*t);
 for(const k of s.keys){k.node.position.lerp(k.position,w);k.node.quaternion.slerp(k.quaternion,w);}
 return true;
}

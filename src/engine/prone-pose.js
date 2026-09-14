import * as T from 'three';
const box=new T.Box3(),rotation=new T.Quaternion(),axis=new T.Vector3(),point=new T.Vector3(),angles=new T.Euler();
// Authored procedural ground action, not an imported crawl take. The simulation
// root stays on the ground; only the visual carrier rotates around the pelvis.
export function restorePronePose(f){
 const s=f._pronePose;if(!s?.applied)return;
 if(s.rig===f.parts.rig)for(const b of s.base){b.part.position.copy(b.position);b.part.quaternion.copy(b.quaternion);}
 s.applied=false;
}
export function animatePronePose(f,dt,recoveryWeight=null){
 const p=f.parts;if(!p.rig||!f._openSky)return;let s=f._pronePose;
 if(!s&&!f.prone&&recoveryWeight===null)return;
 if(!s||s.rig!==p.rig)s=f._pronePose={rig:p.rig,weight:0,phase:0,drop:0,bounds:new T.Box3(),center:new T.Vector3(),
  base:[p.body,p.torso,p.head,p.cowl,p.legL,p.legR,p.legL.userData.knee,p.legR.userData.knee,p.legL.userData.boot,p.legR.userData.boot].map(part=>({part,position:new T.Vector3(),quaternion:new T.Quaternion()}))};
 const eligible=(recoveryWeight!==null||f.gait==='grounded')&&!f.flying&&!f.gliding&&f.alive&&!f.grabbedBy&&!f.hanging&&!f.ragdoll;
 s.weight=eligible?(recoveryWeight??T.MathUtils.damp(s.weight,f.prone?1:0,8,Math.max(0,dt))):0;s.drop=0;
 if(s.weight<.0001){s.weight=0;s.bounds.makeEmpty();return;}
 for(const b of s.base){b.position.copy(b.part.position);b.quaternion.copy(b.part.quaternion);}s.applied=true;
 const w=s.weight,h=p.rig.pivotHeight,scale=h/4.6,angle=1.48;
 const speed=Math.hypot(f.vel.x,f.vel.z),moving=Math.min(1,speed/(5*scale));
 if(f.hitstop<=0)s.phase=(s.phase+speed/(6*scale)*Math.max(0,dt))%1;
 const stride=Math.sin(s.phase*Math.PI*2)*moving;
 p.body.quaternion.slerp(rotation.setFromAxisAngle(axis.set(1,0,0),angle),w);
 point.set(0,1.25*scale-Math.cos(angle)*h,-Math.sin(angle)*h);p.body.position.lerp(point,w);
 p.torso.quaternion.slerp(rotation.identity(),w);
 p.head.quaternion.slerp(rotation.setFromAxisAngle(axis.set(1,0,0),-1.22),w);
 for(const [leg,side]of [[p.legL,-1],[p.legR,1]]){
  rotation.setFromEuler(angles.set(.05+side*stride*.12,0,side*(.13+Math.max(0,side*stride)*.12)));
  leg.quaternion.slerp(rotation,w);leg.userData.knee.rotation.x=T.MathUtils.lerp(leg.userData.knee.rotation.x,.45+Math.max(0,side*stride)*.45,w);
  leg.userData.boot.quaternion.slerp(rotation.setFromAxisAngle(axis.set(1,0,0),-.7),w);
 }
 // Support is the chest/pelvis, not a stray toe masking a floating body.
 p.g.updateMatrixWorld(true);box.setFromObject(p.torso);const shift=(f.pos.y+.12*scale-box.min.y)*w;
 point.set(0,shift,0).applyQuaternion(p.g.getWorldQuaternion(rotation).invert());p.body.position.add(point);
 s.drop=(5.4-1.5*scale)*w;
}
export function updateProneBounds(f){
 const s=f._pronePose;if(!s?.weight)return;const p=f.parts;s.bounds.makeEmpty();p.g.updateMatrixWorld(true);
 for(const part of [p.torso,p.pelvis,p.head,p.legL.userData.thigh,p.legR.userData.thigh,p.legL.userData.shin,p.legR.userData.shin,p.legL.userData.boot,p.legR.userData.boot]){
  if(!part?.geometry)continue;if(!part.geometry.boundingBox)part.geometry.computeBoundingBox();
  box.copy(part.geometry.boundingBox).applyMatrix4(part.matrixWorld);s.bounds.union(box);
 }
 s.bounds.getCenter(s.center);s.center.sub(f.pos);s.bounds.translate(point.copy(f.pos).negate());
}

const axes=['x','y','z'];
export function proneBoxTime(f,a,b,radius=0){
 const bounds=f._pronePose?.bounds;if(!f._pronePose?.weight||bounds.isEmpty())return Infinity;
 let enter=0,exit=1;
 for(const key of axes){
  const low=f.pos[key]+bounds.min[key]-radius,high=f.pos[key]+bounds.max[key]+radius,d=b[key]-a[key];
  if(Math.abs(d)<1e-10){if(a[key]<low||a[key]>high)return Infinity;continue;}
  const t0=(low-a[key])/d,t1=(high-a[key])/d;enter=Math.max(enter,Math.min(t0,t1));exit=Math.min(exit,Math.max(t0,t1));if(enter>exit)return Infinity;
 }
 return enter;
}
export function proneSurface(f,position,out){
 const bounds=f._pronePose.bounds;for(const key of axes)out[key]=T.MathUtils.clamp(position[key],f.pos[key]+bounds.min[key],f.pos[key]+bounds.max[key]);return out;
}

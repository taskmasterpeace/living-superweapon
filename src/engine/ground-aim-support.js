import * as THREE from 'three';
import {GAIT} from '../core/util.js';

const clamp=THREE.MathUtils.clamp;
const origin=new THREE.Vector3(),ray=new THREE.Vector3(),forward=new THREE.Vector3(),axis=new THREE.Vector3();
const hip=new THREE.Vector3(),pivot=new THREE.Vector3(),before=new THREE.Vector3(),point=new THREE.Vector3();
const reach=new THREE.Vector3(),pole=new THREE.Vector3(),upper=new THREE.Vector3();
const bx=new THREE.Vector3(),by=new THREE.Vector3(),bz=new THREE.Vector3(),matrix=new THREE.Matrix4();
const wanted=new THREE.Quaternion(),parentQ=new THREE.Quaternion(),inverse=new THREE.Quaternion(),turn=new THREE.Quaternion();
const limited=new THREE.Quaternion(),identity=new THREE.Quaternion();

export function restoreGroundAimSupport(f){
 const s=f._groundAimSupport;if(!s?.applied||s.rig!==f.parts.rig)return;
 for(const b of s.base){b.part.position.copy(b.position);b.part.quaternion.copy(b.quaternion);}
 s.applied=false;
}

// The feet retain the source stride, not an invented planted stance. Only the
// visual pelvis/body takes the support lean; fixed-length legs bridge to the
// same captured boot transforms. Power readiness and travel stay simulation-owned.
export function animateGroundAimSupport(f,dt,slot,blocked){
 const p=f.parts;if(!f._openSky||!p.rig)return;
 let s=f._groundAimSupport;
 if(!s||s.rig!==p.rig){
  if(!slot)return;
  const legs=[p.legL,p.legR];
  s=f._groundAimSupport={rig:p.rig,rotation:new THREE.Quaternion(),applied:false,
   base:[p.body,...legs,...legs.map(l=>l.userData.knee),...legs.map(l=>l.userData.boot)]
    .map(part=>({part,position:new THREE.Vector3(),quaternion:new THREE.Quaternion()})),
   feet:legs.map(leg=>({leg,position:new THREE.Vector3(),quaternion:new THREE.Quaternion(),
    knee:new THREE.Vector3(),pole:new THREE.Vector3(),length:0}))};
 }
 if(blocked){s.rotation.identity();return;}
 const ground=f.gait===GAIT.GROUNDED&&!f.flying&&!f.gliding;
 wanted.identity();p.g.updateMatrixWorld(true);
 if(ground&&slot){
  const beam=slot.active?.sustaining?slot.active:null;
  if(beam?.predictDirection){beam.sampleMuzzle(origin);beam.predictDirection(ray,dt,origin);}
  else{p.torso.getWorldPosition(origin);ray.copy(f.hasAimWorld?f.aimWorld:f.aim3);if(f.hasAimWorld)ray.sub(origin);ray.normalize();}
  p.pelvis.getWorldQuaternion(inverse);forward.set(0,0,1).applyQuaternion(inverse);
  const elevation=Math.atan2(ray.y,Math.hypot(ray.x,ray.z));
  const pelvisElevation=Math.atan2(forward.y,Math.hypot(forward.x,forward.z));
  const difference=elevation-pelvisElevation;
  const amount=clamp(Math.sign(difference)*Math.max(0,Math.abs(difference)-.9),-.65,.65);
  axis.set(ray.z,0,-ray.x);
  if(axis.lengthSq()<1e-6)axis.set(Math.cos(f.facing),0,-Math.sin(f.facing));
  wanted.setFromAxisAngle(axis.normalize(),-amount);
 }
 // New airborne poses never request ground support. A takeoff can still fade
 // the previous support out instead of snapping the pelvis back in one frame.
 s.rotation.rotateTowards(wanted,4*Math.max(0,dt));
 if(s.rotation.angleTo(identity)<1e-6)return;
 for(const b of s.base){b.position.copy(b.part.position);b.quaternion.copy(b.part.quaternion);}
 if(ground)for(const foot of s.feet){
  const {leg}=foot,{knee,boot}=leg.userData;
  leg.getWorldPosition(hip);knee.getWorldPosition(foot.knee);boot.getWorldPosition(foot.position);boot.getWorldQuaternion(foot.quaternion);
  foot.length=hip.distanceTo(foot.knee)+foot.knee.distanceTo(foot.position);
  leg.getWorldQuaternion(inverse);foot.pole.set(0,0,1).applyQuaternion(inverse);
 }
 p.body.parent.getWorldQuaternion(parentQ);inverse.copy(parentQ).invert();
 supportBody(p.body,s,s.rotation);
 if(ground){
  let drop=groundDrop(s);
  if(!Number.isFinite(drop)){
   // Lowering cannot solve horizontal overreach. Retain only the amount of
   // support that both fixed-length legs can carry; never clamp a boot away
   // from its captured source target to make an impossible lean look valid.
   let low=0,high=1;
   for(let i=0;i<12;i++){
    const fraction=(low+high)*.5;limited.copy(identity).slerp(s.rotation,fraction);
    supportBody(p.body,s,limited);
    if(Number.isFinite(groundDrop(s)))low=fraction;else high=fraction;
   }
   s.rotation.slerp(identity,1-low);supportBody(p.body,s,s.rotation);drop=groundDrop(s);
  }
  if(drop>0)p.body.position.add(point.set(0,-drop,0).applyQuaternion(inverse));
  p.g.updateMatrixWorld(true);
  for(const foot of s.feet)placeLeg(p.body,foot);
 }
 s.applied=true;
}

function supportBody(body,s,rotation){
 const base=s.base[0];body.position.copy(base.position);body.quaternion.copy(base.quaternion);
 turn.copy(inverse).multiply(rotation).multiply(parentQ);
 pivot.set(0,s.rig.pivotHeight,0);before.copy(pivot).applyQuaternion(body.quaternion);
 body.quaternion.premultiply(turn);point.copy(pivot).applyQuaternion(body.quaternion);
 body.position.add(before.sub(point));body.updateWorldMatrix(true,false);
}

function groundDrop(s){
 let low=0,high=Infinity;
 for(const foot of s.feet){
  foot.leg.getWorldPosition(hip);
  const horizontal=(hip.x-foot.position.x)**2+(hip.z-foot.position.z)**2;
  if(horizontal>foot.length**2)return Infinity;
  const rise=Math.sqrt(foot.length**2-horizontal),dy=hip.y-foot.position.y;
  low=Math.max(low,dy-rise);high=Math.min(high,dy+rise);
 }
 return low<=high?low:Infinity;
}

function placeLeg(body,foot){
 const {leg}=foot,{knee,boot}=leg.userData;
 body.worldToLocal(point.copy(foot.position));reach.copy(point).sub(leg.position);
 // Native size powers scale the leg group, not its local joint offsets. The
 // reach is in body space, so both bone lengths must use that same scale.
 const scale=leg.scale.y,u=knee.position.length()*scale,v=boot.position.length()*scale;
 const distance=clamp(reach.length(),Math.abs(u-v)+1e-7,u+v);
 reach.normalize();
 // Keep the source knee's front, including at full extension. Projecting the
 // knee position onto a nearly straight leg makes the bend plane flip 180°.
 body.getWorldQuaternion(inverse).invert();pole.copy(foot.pole).applyQuaternion(inverse);
 pole.addScaledVector(reach,-pole.dot(reach));
 pole.normalize();
 const along=(distance*distance+u*u-v*v)/(2*distance),height=Math.sqrt(Math.max(0,u*u-along*along));
 upper.copy(reach).multiplyScalar(along).addScaledVector(pole,height).normalize();
 by.copy(upper).negate();bx.crossVectors(by,pole).normalize();bz.crossVectors(bx,by).normalize();
 leg.quaternion.setFromRotationMatrix(matrix.makeBasis(bx,by,bz));
 // The boot socket has a small forward offset in this rig; include its rest
 // angle instead of treating the shin/ankle as a purely negative-Y segment.
 const bend=Math.acos(clamp((distance*distance-u*u-v*v)/(2*u*v),-1,1));
 knee.rotation.set(bend+Math.atan2(boot.position.z,-boot.position.y),0,0);
 knee.updateWorldMatrix(true,false);knee.getWorldQuaternion(inverse).invert();boot.quaternion.copy(inverse).multiply(foot.quaternion);
}

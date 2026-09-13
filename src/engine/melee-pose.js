import * as THREE from 'three';
import {STRIKES} from '../data/martial.js';
import {reachArm} from './hero-rig.js';
import {animateGuard} from './guard-pose.js';
import {animateAuthoredStrike} from './strike-motion.js';
import {animateAbilityMeleePose} from './ability-melee-pose.js';
import {animateWeaponStrike} from './melee-weapon-pose.js';

const point=new THREE.Vector3(),guard=new THREE.Vector3(),direction=new THREE.Vector3(),elbowPole=new THREE.Vector3();
const rotation=new THREE.Quaternion(),inverse=new THREE.Quaternion();
const forward=new THREE.Vector3(0,0,1);
const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};

// Applied after the combat layer snapshots its base. That layer removes these
// quaternions on the next frame; flat-FK hand/forearm transforms are reset by flight.
export function animateMelee(f) {
  if(animateAbilityMeleePose(f))return;
  const p=f.parts,m=f._meleeMotion,S=STRIKES[f.mId];
  if(f._openSky&&p.rig&&f.poseGuard>.001&&!f.mstate&&!f.grabState){animateGuard(f);return;}
  if(f._openSky&&p.rig&&f.grabState==='clinch'&&f.grabbing){animateClinch(f);return;}
  if(!f._openSky||!p.rig||!m||!S||!f.mstate)return;
  const pace=f.def.meleePace||1;
  const duration=f.mstate==='startup'?(m.startupDuration||S.startup/pace):S[f.mstate]/pace;
  const t=1-Math.max(0,f.mT)/duration;
  const startup=f.mstate==='startup',recovery=f.mstate==='recover';
  const extension=startup?smooth((t-.55)/.45):recovery?1-smooth(t/.7):1;
  const weight=startup?smooth(t/.3):recovery?1-smooth((t-.55)/.45):1;
  if(animateWeaponStrike(f,THREE.MathUtils.clamp(t,0,1),weight))return;
  const side=m.side,arm=side===1?p.armR:p.armL,off=side===1?p.armL:p.armR;
  const scale=p.rig.pivotHeight/4.6;
  // Counter-rotation sells the cross/power without moving the entity root or stretching limbs.
  const strong=THREE.MathUtils.clamp((f.def.strength??5)/10,0,1);
  const authored=animateAuthoredStrike(f,THREE.MathUtils.clamp(t,0,1),weight);
  if(!authored){
    p.body.rotation.y+=side*(f.mId==='jab'?.16:.32+strong*.12)*(1-2*extension)*weight;
    if(f.mId==='power')p.body.rotation.x+=(-.09*(1-extension)+.12*extension)*weight;
  }
  p.g.updateMatrixWorld(true);
  // Shared low tackle entry; native fist contact still owns damage.
  if(m.family==='tackle'&&m.approachDistance>9&&startup){
    p.body.rotation.x+=.38*Math.sin(Math.PI*THREE.MathUtils.clamp(t,0,1))*weight;
    p.g.updateMatrixWorld(true);
  }
  point.copy(m.point);p.body.worldToLocal(point);
  if(authored){arm.children[2].getWorldPosition(guard);p.body.worldToLocal(guard);}
  else guard.copy(arm.position).add(new THREE.Vector3(side*.25*scale,-.7*scale,(f.mId==='power'?-.35:.65)*scale));
  // ReachArm solves a fixed-length two-bone chain. Extension aims at the committed
  // point, not a homing victim; a target falling away can genuinely evade the punch.
  point.lerp(guard,1-extension);
  if(authored){
    // The source elbow becomes parallel to a fully extended contact reach. Its
    // projected pole then has no stable twist, so finish into an anatomical
    // outward/downward pole as the committed punch extends.
    direction.set(0,-1,0).applyQuaternion(arm.quaternion);
    direction.lerp(elbowPole.set(side,-.6,-.2).normalize(),smooth(extension)).normalize();
  }
  reachArm(arm,point,side,weight,authored?direction:undefined);
  if(!authored){guard.copy(off.position).add(new THREE.Vector3(-side*.25*scale,-.8*scale,1.1*scale));reachArm(off,guard,-side,weight);}
  else if(off.userData.shield||off.children[2].userData.gripOccupied){
    // Bare-knuckle source guards cross the chest. An occupied off-hand carries
    // its real attachment forward with a tucked elbow instead of burying it.
    guard.set(-side*1.4*scale,p.head.position.y-1.3*scale,2.8*scale);
    direction.set(-side*.28,-1,-.12);reachArm(off,guard,-side,weight,direction);
  }
  p.head.getWorldPosition(direction);direction.copy(m.point).sub(direction).normalize();
  p.head.parent.getWorldQuaternion(inverse).invert();direction.applyQuaternion(inverse);
  direction.z=Math.max(.1,direction.z);direction.normalize();
  rotation.setFromUnitVectors(forward,direction);p.head.quaternion.slerp(rotation,weight*.8);
  p.cowl.quaternion.copy(p.head.quaternion);
}

function animateClinch(f) {
    const p=f.parts,v=f.grabbing,punch=f._clinchPunch;
    if(f._personCarry)p.body.rotation.y+=f._personCarry.angle;
  const windup=f._clinchFinisher?Math.min(1,f._clinchFinisher.t/f._clinchFinisher.duration):0;
  const extension=punch?(punch.t<.12?smooth(punch.t/.12):1-smooth((punch.t-.18)/.12)):0;
  p.body.rotation.y+=punch?.28*(1-2*extension):0;
  p.body.rotation.x-=windup*.16;
  p.g.updateMatrixWorld(true);
  // One hand keeps the grip while the other works the body. Both hands support
  // the hoist, so the victim does not levitate independently of the holder.
  v.center(point);point.y-=.25;
  direction.set(f.aim.z,0,-f.aim.x);
  point.addScaledVector(direction,-.85);p.body.worldToLocal(point);
  reachArm(p.armL,point,-1,1);
  v.center(point);point.y-=punch?.8:.25;
  if(!punch)point.addScaledVector(direction,.85);
  p.body.worldToLocal(point);
  guard.copy(p.armR.position).add(new THREE.Vector3(.35,-1.2,-.25));
  if(punch)point.lerp(guard,1-extension);
  reachArm(p.armR,point,1,1);
}

const start=new THREE.Vector3(),end=new THREE.Vector3(),delta=new THREE.Vector3();
const matrix=new THREE.Matrix4(),box=new THREE.Box3(),scale=new THREE.Vector3();
// Earliest swept fist contact with a driven mesh, in its own local frame. The
// small padded box accounts for the physical glove, not an invisible attack cone.
export function fistContact(from,to,part,radius,out,previousMatrix=null) {
  if(!part?.geometry)return Infinity;
  part.updateWorldMatrix(true,false);
  if(!part.geometry.boundingBox)part.geometry.computeBoundingBox();
  matrix.copy(part.matrixWorld).invert();
  end.copy(to).applyMatrix4(matrix);
  // Evaluate relative motion in the driven part's frame, including body travel.
  // The contact point still lies on the actual fist segment in world space.
  if(previousMatrix)matrix.copy(previousMatrix).invert();
  start.copy(from).applyMatrix4(matrix);delta.copy(end).sub(start);
  part.getWorldScale(scale);box.copy(part.geometry.boundingBox);
  scale.set(radius/Math.abs(scale.x),radius/Math.abs(scale.y),radius/Math.abs(scale.z));
  box.min.sub(scale);box.max.add(scale);
  let lo=0,hi=1;
  for(const axis of ['x','y','z']) {
    if(Math.abs(delta[axis])<1e-8){if(start[axis]<box.min[axis]||start[axis]>box.max[axis])return Infinity;continue;}
    const a=(box.min[axis]-start[axis])/delta[axis],b=(box.max[axis]-start[axis])/delta[axis];
    lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));if(lo>hi)return Infinity;
  }
  out.copy(from).lerp(to,lo);return lo;
}

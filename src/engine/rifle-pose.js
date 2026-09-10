// Procedural armed hold over the native carriers. No input claims, root motion,
// projectile timing, or reparenting: the primary fist still owns the gun.
import * as THREE from 'three';
import {reachArm} from './hero-rig.js';
import {firearmEmitter,forearmOccupied} from './weapon-emission.js';
import {rangedPoseChannels} from './cast-channels.js';
import {constrainWeaponCover} from './weapon-cover.js';

const point=new THREE.Vector3(),pole=new THREE.Vector3(),command=new THREE.Vector3(),direction=new THREE.Vector3();
const readyDirection=new THREE.Vector3();
const longitudinal=new THREE.Vector3(),up=new THREE.Vector3(0,1,0),right=new THREE.Vector3(),back=new THREE.Vector3(),offset=new THREE.Vector3();
const frame=new THREE.Matrix4(),rotation=new THREE.Quaternion(),parent=new THREE.Quaternion(),gunRotation=new THREE.Quaternion();
const carrier=new THREE.Quaternion(),carrierAngles=new THREE.Euler(0,0,0,'XYZ'),pivot=new THREE.Vector3(),stockTarget=new THREE.Vector3();
const busy=f=>!f.alive||f.state==='ko'||f._abilityMeleePose||f.poseStrike>.02||f.poseGrab>.02||f.meleeCharge>0||f.mstate||f.grabState||f.grabbedBy||f.grabbing||f._carry||f.hanging||f.staggerT>0||f.stunT>0||f.frozenT>0||f.downedT>0||f.sleepT>0;

function select(f){
 // This contact family is an armed ground hold. Powered flight keeps its
 // authored aerial carrier and existing emitter solve, not a standing stock brace.
 if(!f.parts.rig||f.flying||f.gliding||f.airborne||busy(f))return null;
 const channels=rangedPoseChannels(f);
 if(channels.head||channels.torso)return null;
 for(const slot of Object.values(f.slots)){
  if(slot.def.type!=='rifle')continue;
  const emitter=firearmEmitter(f,slot.def),{weapon,side}=emitter;
  if(!weapon?.userData.rifleContact)continue;
  const primary=side<0?0:1,other=primary?0:1,arm=other?f.parts.armR:f.parts.armL;
  if(forearmOccupied(arm)||arm.userData.shield)continue;
  let occupied=false;for(const view of f.parts.nanites?.values()||[])if(view.arm===arm)occupied=true;
  if(occupied)continue;
  if(channels.arms[other]||channels.arms[primary]&&channels.arms[primary]!==slot)continue;
  if(f.hasAimWorld&&(slot._poseUntil??-1)>=f.animT&&!f.guarding){
   // A point inside the gun's own length is not a feasible shouldered aim.
   // Leave the established one-hand emitter path authoritative in that case.
   const primaryArm=primary?f.parts.armR:f.parts.armL;
   primaryArm.getWorldPosition(point);
   const stock=weapon.getObjectByName('weapon-stock-contact'),muzzle=weapon.getObjectByName('weapon-muzzle');
   stock.getWorldPosition(stockTarget);muzzle.getWorldPosition(offset);
   if(point.distanceTo(f.aimWorld)<stockTarget.distanceTo(offset)+.35)continue;
  }
  return Object.assign(f._rifleEmitter ||= {},emitter,{slot});
 }
 return null;
}

export function restoreRiflePose(f){
 const s=f._riflePose;if(!s?.applied)return;
 if(s.rig===f.parts.rig)for(const b of s.base){b.part.position.copy(b.position);b.part.quaternion.copy(b.quaternion);}
 s.applied=false;
}

function barrelFrame(f){
 if(direction.lengthSq()<1e-8){direction.copy(f.aim3);if(direction.lengthSq()<1e-8)direction.set(0,0,1);direction.normalize();}
 up.set(0,1,0).applyQuaternion(f.parts.torso.getWorldQuaternion(rotation));
 right.crossVectors(up,direction);
 if(right.lengthSq()<1e-6){right.set(1,0,0).applyQuaternion(rotation);right.addScaledVector(direction,-right.dot(direction));}
 right.normalize();back.crossVectors(right,direction).negate().normalize();
 frame.makeBasis(right,longitudinal.copy(direction).negate(),back);
 return gunRotation.setFromRotationMatrix(frame);
}

function aimWrist(f,emitter,aimWeight){
 const arm=emitter.side<0?f.parts.armL:f.parts.armR;
 for(let i=0;i<3;i++){
  // Socket getters update their ancestor chain. A full fighter traversal here
  // would redundantly visit every skin bone three times before the final skin sync.
  if(aimWeight>0){emitter.socket.getWorldPosition(point);direction.copy(command).sub(point).normalize().multiplyScalar(aimWeight).addScaledVector(readyDirection,1-aimWeight).normalize();}
  else direction.copy(readyDirection);
  // Full barrel frame: deterministic upright roll, not just a shortest-arc ray.
  barrelFrame(f);
  arm.getWorldQuaternion(parent).invert();emitter.hand.quaternion.copy(parent).multiply(gunRotation);
 }
}

export function animateRiflePose(f,dt){
 const p=f.parts,emitter=select(f);let s=f._riflePose;
 if(!emitter){if(s)s.active=false;return;}
 if(!s||s.rig!==p.rig||s.weapon!==emitter.weapon)s=f._riflePose={rig:p.rig,weapon:emitter.weapon,active:false,applied:false,
  grip:new THREE.Vector3(),base:[p.torso,p.head,p.cowl,p.armL,p.armR,...p.armL.children.slice(1,3),...p.armR.children.slice(1,3)].map(part=>({part,position:new THREE.Vector3(),quaternion:new THREE.Quaternion()}))};
 for(const b of s.base){b.position.copy(b.part.position);b.quaternion.copy(b.part.quaternion);}s.applied=true;
 if(f._pronePose?.weight>0){
  const side=emitter.side,arm=side<0?p.armL:p.armR,off=side<0?p.armR:p.armL,scale=p.rig.pivotHeight/4.6;
  direction.copy(f.aim3).normalize();up.set(0,1,0);right.crossVectors(up,direction);
  if(right.lengthSq()<1e-6)right.set(1,0,0);right.normalize();back.crossVectors(right,direction).negate().normalize();
  frame.makeBasis(right,longitudinal.copy(direction).negate(),back);gunRotation.setFromRotationMatrix(frame);
  // Roll the magazine well outboard before extraction in a low stance. An
  // upright reload would drive the magazine and free hand into the ground.
  if(f._firearmReload){
   const t=f._firearmReload.elapsed/f._firearmReload.duration;
   const w=THREE.MathUtils.smoothstep(t,0,.18)*(1-THREE.MathUtils.smoothstep(t,.82,1));
   gunRotation.premultiply(rotation.setFromAxisAngle(direction,-side*Math.PI*.5*w));
  }
  arm.getWorldPosition(stockTarget);stockTarget.addScaledVector(direction,.25*scale).addScaledVector(up,.25*scale).addScaledVector(right,-side*1.1*scale);
  const stock=emitter.weapon.getObjectByName('weapon-stock-contact');
  point.copy(stock.position).multiply(emitter.hand.scale).applyQuaternion(gunRotation).negate().add(stockTarget);arm.parent.worldToLocal(point);
  pole.set(side,0,.5);reachArm(arm,point,side,1,pole);
  arm.getWorldQuaternion(parent).invert();emitter.hand.quaternion.copy(parent).multiply(gunRotation);
  constrainWeaponCover(f,emitter,pole);
  const support=emitter.weapon.getObjectByName('weapon-support-grip');support.getWorldPosition(point);off.parent.worldToLocal(point);
  pole.set(-side,0,.5);reachArm(off,point,-side,1,pole);
  off.getWorldQuaternion(parent).invert();support.getWorldQuaternion(rotation);off.children[2].quaternion.copy(parent).multiply(rotation);
  s.active=true;s.aimWeight=0;return;
 }
 const side=emitter.side,arm=side<0?p.armL:p.armR,off=side<0?p.armR:p.armL,scale=p.rig.pivotHeight/4.6;
 const aiming=(emitter.slot._poseUntil??-1)>=f.animT&&!f.guarding;
 // Dry fire/reload clears the firing channel immediately, but a supported
 // weapon must lower continuously. Blend the whole shoulder/barrel carrier,
 // not just the support hand (which must stay on the rigid grip).
 s.aimWeight=s.aimWeight===undefined?(aiming?1:0):THREE.MathUtils.damp(s.aimWeight,aiming?1:0,12,Math.max(0,dt));
 const aimWeight=s.aimWeight;
 // Low-ready follows the already articulated upper body, not the legs' travel
 // frame. Independent-heading locomotion can otherwise turn the barrel away
 // from the support shoulder and exceed the second arm's reach every stride.
 readyDirection.set(0,-.2,1).normalize().applyQuaternion(p.torso.getWorldQuaternion(rotation));
 if(f.hasAimWorld)command.copy(f.aimWorld);else command.copy(f.pos).addScaledVector(f.aim3,100);
 // A bladed shoulder carrier places the firing shoulder behind the support
 // shoulder. This is upper-body articulation, not entity heading or locomotion.
 // Without it the source body's off-hand cannot reach an outside-shoulder stock.
 direction.copy(command).sub(f.pos);p.body.getWorldQuaternion(parent).invert();direction.applyQuaternion(parent);
 const elevation=aimWeight*Math.atan2(direction.y-p.rig.pivotHeight,Math.hypot(direction.x,direction.z));
 const downward=Math.max(0,-elevation),upward=Math.max(0,elevation);
 // The body/locomotion heading may still be turning. Fit to the remaining
 // local aim yaw, subtracting any earlier directional carrier, so the first
 // cross-body shot does not pull the support forearm through the carrier vest.
 offset.set(0,0,1).applyQuaternion(p.torso.quaternion);
 const aimHeading=aimWeight*(Math.atan2(direction.x,direction.z)-Math.atan2(offset.x,offset.z));
 // Fit shoulder projection to the real opposite arm's reach. A wider soldier
 // cannot use the old narrow-frame yaw: at high elevation the far hand ends up
 // outside its workspace even though the weapon is correctly shouldered.
 const shoulderSpan=arm.position.distanceTo(off.position),armReach=off.userData.upperLength+off.userData.foreLength;
 const blade=Math.max(.62,Math.acos(Math.min(1,armReach*.72/Math.max(.01,shoulderSpan))));
 // Lean toward the fighter's forward target AFTER blading the shoulders; a
 // yaw-local lean sweeps the whole shoulder line sideways on steep low shots.
 carrier.setFromEuler(carrierAngles.set(Math.min(.72,downward*.72)-Math.min(.65,upward*.46),side*(blade+Math.min(.2,downward*.2)),0));
 carrier.premultiply(parent.setFromAxisAngle(up.set(0,1,0),aimHeading));pivot.set(0,p.rig.pivotHeight,0);
 for(const part of [p.torso,p.armL,p.armR]){part.position.sub(pivot).applyQuaternion(carrier).add(pivot);part.quaternion.premultiply(carrier);}
 for(const part of [p.head,p.cowl])part.position.sub(pivot).applyQuaternion(carrier).add(pivot);
 // The physical butt is anchored at the outside/front of the firing shoulder.
 // Elevating the barrel lifts the hands about this contact instead of rotating
 // a long stock down through the chest. No weapon/socket is moved independently.
 const stock=emitter.weapon.getObjectByName('weapon-stock-contact');
 arm.getWorldPosition(stockTarget);
 // Depth includes the shipped plate carrier, not just the naked torso. Keep
 // this in body-depth units so broad frames retain a real forward grip lane.
 offset.set(side*.03*scale,-.18*scale,.94*p.torso.scale.z).applyQuaternion(p.torso.getWorldQuaternion(rotation));stockTarget.add(offset);
 if(f._firearmReload){
  // Reload is not a shouldered firing hold: bring the rigid rifle into the
  // shared workspace so the free hand can extract a magazine below its well.
  const t=f._firearmReload.elapsed/f._firearmReload.duration;
  const ease=n=>{n=THREE.MathUtils.clamp(n,0,1);return n*n*(3-2*n);};
  const weight=ease(t/.15)*(1-ease((t-.92)/.08));
  offset.set(-side*.8,0,.35).multiplyScalar(scale*weight).applyQuaternion(p.body.getWorldQuaternion(rotation));stockTarget.add(offset);
 }
 direction.copy(command).sub(stockTarget).normalize().multiplyScalar(aimWeight).addScaledVector(readyDirection,1-aimWeight).normalize();
 barrelFrame(f);
 const age=f.animT-(emitter.slot.handShots?.[side]??-100),recoil=aiming&&age>=0&&age<.25?.055*Math.exp(-age*18):0;
 point.copy(stock.position).multiply(emitter.hand.scale).applyQuaternion(gunRotation).negate().add(stockTarget).addScaledVector(direction,-recoil*scale);
 arm.parent.worldToLocal(point);
 // Ready already inherits the continuous authored stride. Filtering its grip
 // a second time lets the shoulders outrun the support hand at phase changes.
 if(!s.active||aimWeight<.001)s.grip.copy(point);else s.grip.lerp(point,1-Math.exp(-18*Math.max(0,dt)));
 s.active=true;
 pole.set(side,-.8,.7).applyQuaternion(carrier);reachArm(arm,s.grip,side,1,pole);
 aimWrist(f,emitter,aimWeight);
 for(let i=0;i<5;i++){
  if(!constrainWeaponCover(f,emitter,pole))break;
  aimWrist(f,emitter,aimWeight);
 }
 const support=emitter.weapon.getObjectByName('weapon-support-grip');support.getWorldPosition(point);off.parent.worldToLocal(point);
 if(point.distanceTo(off.position)>off.userData.upperLength+off.userData.foreLength-.001){
  // No stretched arm or floating second grip when a fast aim/cover correction
  // leaves the shared workspace. Paid shots keep their original one-hand pose.
  restoreRiflePose(f);s.active=false;return;
 }
 pole.set(-side,-1,1.1).applyQuaternion(carrier);reachArm(off,point,-side,1,pole);
 // This contact follows the FINAL gun frame, including cover retraction.
 off.getWorldQuaternion(parent).invert();support.getWorldQuaternion(rotation);
 off.children[2].quaternion.copy(parent).multiply(rotation);
 if(off.children[2].morphTargetInfluences)off.children[2].morphTargetInfluences[0]=0;
}

// A bounded final forearm adapter over the native body/action carriers. It
// changes neither root motion nor offensive hand-speed measurements.
import * as THREE from 'three';
import {reachArm} from './hero-rig.js';
import {naniteEmitter} from './nanite-forearms.js';
import {forearmOccupied} from './weapon-emission.js';
import {OBB} from 'three/addons/math/OBB.js';
import {sweepSplitObstacle} from './projectile-contact.js';

const point=new THREE.Vector3(),direction=new THREE.Vector3(),elbow=new THREE.Vector3(),pole=new THREE.Vector3(),hand=new THREE.Vector3();
const parentRotation=new THREE.Quaternion();
const normal=new THREE.Vector3(),longitudinal=new THREE.Vector3(),cross=new THREE.Vector3(),basis=new THREE.Matrix4(),foreRotation=new THREE.Quaternion();
const shieldTarget=new THREE.Quaternion(),shieldLocal=new THREE.Quaternion();
const unit=new THREE.Box3(new THREE.Vector3(-.5,-.5,-.5),new THREE.Vector3(.5,.5,.5)),obstacleBox=new THREE.Box3(),cellMatrix=new THREE.Matrix4(),cellOBB=new OBB(),bodyOBB=new OBB(),corner=new THREE.Vector3(),apertureContact={};
const busy=f=>f._carry||f.hanging||f.grabbedBy||f.grabbing||f.grabState||f.mstate||f.state==='ko'||f.stunT>0||f.frozenT>0||f.staggerT>0;
// Conservative OBBs come from the literal cell boxes and sampled, driver-local
// torso/head/pelvis surfaces. Cache skin sampling at figure construction, never
// per frame. Beveled cells retain the documented <= .03 body-scale tolerance.
export function naniteEnvelopeClear(f,view){
 f.obj.updateMatrixWorld(true);const world=f._game?.world;
 if(view.socket&&world){view.socket.getWorldPosition(corner);if(corner.y<(world.heightAt?.(corner.x,corner.z)??0)||sweepSplitObstacle(world,corner,corner,0,apertureContact,false))return false;}
 const intersects=(c,top=c.top??c.h??0,bottom=c.bottom??-1e6)=>{
  const hx=c.hx??c.r??0,hz=c.hz??c.r??0;
  obstacleBox.min.set(c.x-hx,bottom,c.z-hz);obstacleBox.max.set(c.x+hx,top,c.z+hz);return cellOBB.intersectsBox3(obstacleBox);
 };
 for(const cell of view.layout){
  cellMatrix.copy(view.root.matrixWorld).multiply(cell.matrix);cellOBB.fromBox3(unit).applyMatrix4(cellMatrix);
  for(const c of world?.cover||[])if(intersects(c))return false;
  for(const room of world?.interiors||[])for(const wall of room.walls||[])if(intersects(wall,room.top))return false;
  for(const volume of f.parts.naniteBodyVolumes||[])if(cellOBB.intersectsOBB(bodyOBB.fromBox3(volume.box).applyMatrix4(volume.driver.matrixWorld)))return false;
  for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5]){
   corner.set(x,y,z).applyMatrix4(cellMatrix);if(corner.y<(world?.heightAt?.(corner.x,corner.z)??0)-1e-6)return false;
  }
 }
 return true;
}
export function naniteUseReason(f,slot,target=f.hasAimWorld?f.aimWorld:null){
 const m=f._nanites?.modules.get(slot),v=f.parts?.nanites?.get(slot);
 if(!m||!v||m.retired||!m.unlocked||!m.deployed||m.assemblyT+1e-10<m.config.naniteAssemblyTime)return 'assembling';
 if(m.cells.some(c=>c.broken))return 'reforming';
 if(!naniteEmitter(f,slot,m.epoch))return 'assembling';
 if(busy(f)||forearmOccupied(v.arm))return 'occupied';
 if(target){
  v.arm.getWorldPosition(point);direction.copy(target).sub(point);
  if(direction.length()<v.arm.userData.foreLength||direction.x*Math.sin(f.facing)+direction.z*Math.cos(f.facing)<-.05)return 'obstructed';
 }
 if(!naniteEnvelopeClear(f,v))return 'obstructed';
 return null;
}
export function restoreNanitePose(f){
 const state=f._nanitePose;if(!state?.applied)return;
 for(const [object,position,quaternion]of state.base){object.position.copy(position);object.quaternion.copy(quaternion);}
 state.applied=false;
}
export function poseNaniteForearms(f,dt=0){
 if(!f._nanites||busy(f)){f._nanitePose?.shields?.clear();return;}
 let state=f._nanitePose;
 if(!state||state.rig!==f.parts.rig)state=f._nanitePose={rig:f.parts.rig,applied:false,base:[],shields:new Map()};
 state.base.length=0;
 for(const [slot,m]of f._nanites.modules){
  const view=f.parts.nanites.get(slot);
  if(m.config.naniteForm==='shield'){
   if(!view||!m.ready||!f.guarding||!(f.poseGuard>0)||forearmOccupied(view.arm)){state.shields.delete(slot);continue;}
   const arm=view.arm,side=m.config.naniteAttachment==='right-forearm'?-1:1;
   for(const object of [arm,arm.children[1],arm.children[2]])state.base.push([object,object.position.clone(),object.quaternion.clone()]);
   normal.copy(f.aim3).normalize();arm.parent.getWorldQuaternion(parentRotation).invert();normal.applyQuaternion(parentRotation);
   // Raise the actual sleeve in front of the shoulder. Its long axis lies in
   // the shield plane; its +Z panel normal, not the sibling palm, faces aim.
   longitudinal.set(0,1,0).addScaledVector(normal,-normal.y).normalize();
   if(longitudinal.lengthSq()<.01)longitudinal.set(side,0,0);
   longitudinal.negate();cross.crossVectors(longitudinal,normal).normalize();normal.crossVectors(cross,longitudinal).normalize();basis.makeBasis(cross,longitudinal,normal);
   shieldTarget.setFromRotationMatrix(basis).premultiply(shieldLocal.copy(parentRotation).invert());
   let held=state.shields.get(slot);
   if(!held||held.view!==view||held.epoch!==m.epoch){held={view,epoch:m.epoch,rotation:view.root.getWorldQuaternion(new THREE.Quaternion())};state.shields.set(slot,held);}
   // The actual full panel frame follows the native guard angular budget. A
   // raw aim edge (especially across the up/down pole) cannot rotate hardware
   // in zero pose time or flip the long axis while its normal barely changes.
   if(Number.isFinite(dt)&&dt>0)held.rotation.rotateTowards(shieldTarget,8*dt);
   shieldLocal.copy(parentRotation).multiply(held.rotation);
   longitudinal.set(0,-1,0).applyQuaternion(shieldLocal);
   // Keep the ordinary compact brace when aligned. If the native body turns
   // faster than this physical panel, its fixed-length elbow moves outboard
   // until orientation catches up. Use CURRENT carrier/plate alignment, never
   // raw target aim, so a zero-time command cannot reposition the sleeve.
   normal.set(0,0,1).applyQuaternion(shieldLocal);
   const clearance=THREE.MathUtils.clamp((normal.angleTo(direction.set(0,0,1))-.2)/.5,0,1);
   // A wide fitted sleeve on a short or narrow-shouldered rig cannot use the
   // compact elbow without burying its panel in the torso. Raise that brace
   // from immutable measured radii/lengths, not a per-frame clipping toggle.
   const broadSleeve=THREE.MathUtils.clamp(Math.max((view.fit.skinRadius/arm.userData.foreLength-.3)/.3,(view.fit.skinRadius/view.fit.shoulderOffset-.25)/.15),0,1);
   pole.set(side*.42,-.72,.55).lerp(elbow.set(side,0,0),clearance).lerp(elbow.set(side*1.5,1,.4),broadSleeve).normalize();elbow.copy(arm.position).addScaledVector(pole,arm.userData.upperLength);
   hand.copy(elbow).addScaledVector(longitudinal,arm.userData.foreLength);reachArm(arm,hand,side,1,pole);
   foreRotation.copy(shieldLocal).premultiply(parentRotation.copy(arm.quaternion).invert());
   arm.children[1].quaternion.copy(foreRotation);arm.children[2].quaternion.copy(foreRotation);f.obj.updateMatrixWorld(true);state.applied=true;continue;
  }
  const s=f.slots[slot],emitter=naniteEmitter(f,slot,m.epoch);if(!s||!emitter||forearmOccupied(emitter.arm))continue;
  const pending=f._game?.projectiles?.list.find(p=>!p.dead&&!p._launchResolved&&p.caster===f&&p._powerOrigin?.naniteForm==='cannon'&&p._powerOrigin.slot===slot);
  if(!s.charging&&!pending&&!((s._poseUntil??-1)>=f.animT))continue;
  const arm=emitter.arm;
  // This source braces a cannon, not an open palm cast. Reuse the native closed
  // shape (also driving source-skin finger bones); normal hands own the next
  // frame again when charge, pending launch and bounded recovery have ended.
  if(arm.children[2].morphTargetInfluences)arm.children[2].morphTargetInfluences[0]=0;
  for(const object of [arm,arm.children[1],arm.children[2]])state.base.push([object,object.position.clone(),object.quaternion.clone()]);
  const target=pending?pending._launchTarget:f.hasAimWorld?f.aimWorld:null;
  for(let i=0;i<3;i++){
   emitter.socket.getWorldPosition(point);if(target)direction.copy(target).sub(point);else direction.copy(f.aim3);
   direction.normalize();arm.parent.getWorldQuaternion(parentRotation).invert();direction.applyQuaternion(parentRotation);
   // An outward/downward elbow keeps the upper arm beside the actual torso.
   // reachArm supplies its existing fixed-length FK and matching elbow pole.
   pole.set(emitter.side*.65,-.72,.22).normalize();elbow.copy(arm.position).addScaledVector(pole,arm.userData.upperLength);
   hand.copy(elbow).addScaledVector(direction,arm.userData.foreLength);reachArm(arm,hand,emitter.side,1,pole);
   f.obj.updateMatrixWorld(true);
  }
  state.applied=true;
 }
}

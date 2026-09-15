import * as THREE from 'three';
import {earliestOrdinaryContact} from './attack-interception.js';
import {sweepSplitObstacle} from './projectile-contact.js';
import {reachArm} from './hero-rig.js';
import {rangedPoseChannels} from './cast-channels.js';

const forward=new THREE.Vector3(0,0,1),aim=new THREE.Vector3(),point=new THREE.Vector3(),pole=new THREE.Vector3();
const rotation=new THREE.Quaternion(),inverse=new THREE.Quaternion();
const number=(v,f,min,max)=>THREE.MathUtils.clamp(Number.isFinite(v)?v:f,min,max);
const incapacitated=f=>!f.alive||f.state==='ko'||f.staggerT>0||f.stunT>0||f.frozenT>0||f.sleepT>0||f.downedT>0||f.grabbedBy;
const busy=f=>incapacitated(f)||f.grabbing||f.grabState||f.mstate||f.guarding||f.hanging||f._carry||f._throwAction||f._firearmReload||f._abilityMeleePose||f.meleeCharge>0||f._disarmT>0||f._scoutVehicle||f._aircraftVehicle;
function tell(s,message){if(s.game.isHuman?.(s.caster))s.game.hud?.feed?.(message,'#dca3aa');}
function handFor(f,s=null){
 if(busy(f))return null;
 const claims=rangedPoseChannels(f).arms;
 for(const side of [s?.side||1,-(s?.side||1)]){
  const hand=(side===1?f.parts?.armR:f.parts?.armL)?.children?.[2];if(!hand||claims[side===1?1:0])continue;
  if(hand.userData._guidedSpear===s&&s)return {hand,side};
  if(hand.userData.gripOccupied||hand.children.some(o=>o.visible&&o.userData.weaponKind))continue;
  return {hand,side};
 }
 return null;
}
function mesh(){
 const root=new THREE.Group();root.name='guided-black-spear';root.userData.weaponKind='spear';
 const black=new THREE.MeshStandardMaterial({color:'#17191d',roughness:.47,metalness:.75});
 const red=new THREE.MeshStandardMaterial({color:'#bd2337',roughness:.35,metalness:.65});
 const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.075,.105,6.3,8),black);shaft.rotation.x=Math.PI/2;shaft.position.z=-3.55;shaft.name='spear-black-shaft';
 const tip=new THREE.Mesh(new THREE.ConeGeometry(.3,1.05,4),red);tip.rotation.x=Math.PI/2;tip.position.z=-.525;tip.name='spear-crimson-tip';
 const collar=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,.2,8),red);collar.rotation.x=Math.PI/2;collar.position.z=-1.15;
 root.add(shaft,tip,collar);
 for(const side of [-1,1]){const fin=new THREE.Mesh(new THREE.ConeGeometry(.21,.8,3),red);fin.name=side<0?'spear-crimson-barb-left':'spear-crimson-barb-right';fin.rotation.set(Math.PI/2,side*.9,0);fin.position.set(side*.24,0,-.8);root.add(fin);}
 root.traverse(o=>{if(o.isMesh)o.castShadow=true;});return root;
}
export class GuidedSpear {
 constructor(caster,slot,game,grip){
  this.caster=caster;this.slot=slot;this.def=slot.def;this.game=game;this.team=caster.team;this.state='held';this.dead=false;this.obj=mesh();
  this.pos=new THREE.Vector3();this.vel=new THREE.Vector3();this.end=new THREE.Vector3();this.radius=.12;this.ground=true;this.life=Infinity;
  this.side=grip.side;this.hand=null;this.steering=false;this.travel=0;this.attachment=null;this.waitReason=null;
  this.speed=number(this.def.speed,110,20,600);this.returnSpeed=number(this.def.returnSpeed,150,20,600);this.steer=number(this.def.steer,3,.1,12);
  this.range=number(this.def.range,180,20,800);this.damage=number(this.def.damage,22,1,300);this.windup=number(this.def.throwWindup,.38,.2,1.5);this.recovery=number(this.def.throwRecovery,.3,.1,1);
  this.obj.children[0].material.color.set(this.def.color||'#17191d');this.obj.children[1].material.color.set(this.def.color2||'#bd2337');
  this.mount(grip);caster._guidedSpear=this;slot.spear=this;game.projectiles.list.push(this);
 }
 mount({hand,side}){
  this.unhand();this.hand=hand;this.side=side;this.occupied=hand.userData.gripOccupied;hand.userData._guidedSpear=this;hand.userData.gripOccupied=true;
  hand.add(this.obj);this.obj.position.set(0,3.2,0);this.obj.rotation.set(-Math.PI/2,0,0);this.obj.scale.setScalar(1);this.state='held';this.vel.set(0,0,0);this.obj.getWorldPosition(this.pos);
 }
 unhand(){if(this.hand?.userData._guidedSpear===this){delete this.hand.userData._guidedSpear;this.hand.userData.gripOccupied=this.occupied;}this.hand=null;}
 start(){
  if(this.dead||this.state!=='held')return false;const grip=handFor(this.caster,this);if(!grip)return false;if(grip.hand!==this.hand)this.mount(grip);
  this.state='windup';this.travel=0;this.attachment=null;this.waitReason=null;
  this.caster._guidedSpearPose={spear:this,elapsed:0,released:false,parts:this.caster.parts};
  return true;
 }
 command(inp){
  this.steering=!!inp.held&&!inp.released;
  if(inp.pressed&&['outbound','embedded','dropped','blocked','waiting'].includes(this.state)){
   // A surface hit rests slightly outside its boundary. No obstacle is ignored
   // during return; attempting to recall through its far side must stop again.
   this.state='returning';this.attachment=null;this.waitReason=null;this.steering=false;return true;
  }
  return false;
 }
 resolveLaunch(){
  const pose=this.caster._guidedSpearPose;
  if(this.state!=='windup'||pose?.spear!==this||pose.elapsed+1e-8<this.windup)return;
  if(busy(this.caster)||rangedPoseChannels(this.caster).arms[this.side===1?1:0]){this.state='held';this.caster._guidedSpearPose=null;return;}
  this.obj.updateWorldMatrix(true,true);this.obj.getWorldPosition(this.pos);this.game.scene.attach(this.obj);this.unhand();
  this.vel.copy(this.caster.aim3||this.caster.aim).normalize().multiplyScalar(this.speed);this.orient();this.state='outbound';pose.released=true;
  tell(this,'SPEAR AWAY · hold to guide · press again to recall');
 }
 orient(){if(this.vel.lengthSq()>1e-10)this.obj.quaternion.setFromUnitVectors(forward,aim.copy(this.vel).normalize());this.obj.position.copy(this.pos);}
 valid(){return this.caster.alive&&!this.caster._formDisposed&&Object.values(this.caster.slots||{}).includes(this.slot)&&this.slot.def===this.def;}
 update(dt,game){
  if(this.dead)return false;if(!this.valid()){this._dispose();return false;}
  if(!(dt>0)||game.paused||game.combatOverlayOpen)return true;
  if(this.state==='held'||this.state==='windup'){
   const live=(this.side===1?this.caster.parts?.armR:this.caster.parts?.armL)?.children?.[2];
   if(live!==this.hand){const grip=handFor(this.caster,this);if(grip){this.mount(grip);this.caster._guidedSpearPose=null;}else{this._dispose();return false;}}
   this.obj.getWorldPosition(this.pos);return true;
  }
  if(this.state==='embedded'){
   const a=this.attachment;
   if(a?.fighter){if(!a.fighter.alive||!game.entities.includes(a.fighter)){this.attachment=null;this.state='dropped';}
    else{a.fighter.obj.updateWorldMatrix(true,true);this.pos.copy(a.local);a.fighter.obj.localToWorld(this.pos);a.fighter.obj.getWorldQuaternion(rotation);this.obj.quaternion.copy(rotation).multiply(a.rotation);this.obj.position.copy(this.pos);}}
   else if(a?.cover){
    if(a.cover.destroyed||a.cover.hp<=0||!game.world.cover.includes(a.cover)){this.attachment=null;this.state='dropped';}
    else if(a.obj){a.obj.updateWorldMatrix(true,true);this.pos.copy(a.local);a.obj.localToWorld(this.pos);a.obj.getWorldQuaternion(rotation);this.obj.quaternion.copy(rotation).multiply(a.rotation);this.obj.position.copy(this.pos);}
    else{this.pos.copy(a.local).add(point.set(a.cover.x,a.cover.bottom??a.cover.top??a.cover.h??0,a.cover.z));this.obj.position.copy(this.pos);}
   }
   return true;
  }
  if(this.state==='blocked'||this.state==='dropped')return true;
  if(this.state==='returning'||this.state==='waiting'){
   const grip=handFor(this.caster,this),hand=grip?.hand||(this.side===1?this.caster.parts?.armR:this.caster.parts?.armL)?.children?.[2];
   if(!hand){this._dispose();return false;}hand.updateWorldMatrix(true,false);this.end.set(0,3.2,0);hand.localToWorld(this.end);
   const distance=this.pos.distanceTo(this.end);
   if(distance<1.2&&!grip){this.state='waiting';this.vel.set(0,0,0);if(this.waitReason!=='hand'){tell(this,'SPEAR WAITING · free a hand to catch');this.waitReason='hand';}return true;}
   const step=Math.min(distance,this.returnSpeed*dt);this.vel.copy(this.end).sub(this.pos).normalize().multiplyScalar(this.returnSpeed);this.end.copy(this.pos).addScaledVector(this.vel,step/this.returnSpeed);
   const hit={};if(sweepSplitObstacle(game.world,this.pos,this.end,this.radius,hit,true,this.radius)){
    this.pos.lerp(this.end,Math.max(0,hit.t-.0001));this.orient();this.vel.set(0,0,0);this.state='blocked';tell(this,'SPEAR BLOCKED · move clear and press recall');return true;
   }
   this.pos.copy(this.end);this.orient();if(distance<=step+1e-6&&grip){this.mount(grip);tell(this,'SPEAR CAUGHT');}else this.state='returning';return true;
  }
  if(this.state==='outbound'){
   if(this.steering&&!incapacitated(this.caster)){
    const direction=aim.copy(this.vel).normalize(),goal=(this.caster.aim3||this.caster.aim).clone().normalize();rotation.setFromUnitVectors(direction,goal);
    inverse.identity().rotateTowards(rotation,this.steer*dt);this.vel.copy(direction.applyQuaternion(inverse)).multiplyScalar(this.speed);
   }
   const travel=Math.min(this.speed*dt,Math.max(0,this.range-this.travel));this.end.copy(this.pos).addScaledVector(this.vel,travel/this.speed);
   const ignored=new Set((game.entities||[]).filter(f=>f.phase||f.invuln>0));
   const hit=earliestOrdinaryContact(this,this.end,travel/this.speed,game,ignored);
   if(hit){
    this.pos.lerp(this.end,Math.max(0,hit.t-.0001));this.orient();this.state='embedded';this.vel.set(0,0,0);this.steering=false;
    if(hit.kind==='foe'){
     const f=hit.target;f.takeDamage(this.damage*(this.caster.powerBuff||1),{src:this.caster,dtype:'physical',dmgClass:'pierce',contactPoint:this.pos,naniteContact:hit.naniteContact,hitstop:.04});
     f.obj.updateWorldMatrix(true,true);const local=f.obj.worldToLocal(this.pos.clone());f.obj.getWorldQuaternion(rotation);
     this.attachment={fighter:f,local,rotation:rotation.invert().multiply(this.obj.quaternion).clone()};
    }else{
     this.attachment={cover:hit.kind==='cover'?hit.target:null};
     if(hit.kind==='cover'){
      const a=this.attachment,c=hit.target;a.obj=c.mesh||c.construct?.actor?.obj;
      if(a.obj?.isObject3D){a.obj.updateWorldMatrix(true,true);a.local=a.obj.worldToLocal(this.pos.clone());a.obj.getWorldQuaternion(rotation);a.rotation=rotation.invert().multiply(this.obj.quaternion).clone();}
      else{a.obj=null;a.local=this.pos.clone().sub(point.set(c.x,c.bottom??c.top??c.h??0,c.z));}
      game.damageBlock(c,this.damage*(this.caster.powerBuff||1),this.pos,this.caster);
     }
    }
    tell(this,'SPEAR EMBEDDED · press to recall');return true;
   }
   this.travel+=travel;this.pos.copy(this.end);this.orient();
   if(this.travel>=this.range-1e-6){this.state='dropped';this.vel.set(0,0,0);tell(this,'SPEAR AT RANGE · press to recall');}
  }
  return true;
 }
 _dispose(){
  if(this.dead)return;this.dead=true;this.unhand();this.obj.removeFromParent();const resources=new Set();this.obj.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);});for(const r of resources)r.dispose();
  if(this.slot.spear===this)this.slot.spear=null;if(this.caster._guidedSpear===this)this.caster._guidedSpear=null;if(this.caster._guidedSpearPose?.spear===this)this.caster._guidedSpearPose=null;
 }
}
export function beginGuidedSpear(c,slot,game){
 let spear=slot.spear;if(spear?.dead)spear=null;
 if(!spear){if(c._guidedSpear&&!c._guidedSpear.dead){tell(c._guidedSpear,'Only one signature spear can be owned');return false;}const grip=handFor(c);if(!grip){if(game.isHuman?.(c))game.hud?.feed?.('SPEAR · free a hand first','#dca3aa');return false;}spear=new GuidedSpear(c,slot,game,grip);}
 return spear.start();
}
export function cancelGuidedSpearInput(c,slot){
 const s=slot.spear;if(!s)return;s.steering=false;if(s.state==='windup'){s.state='held';c._guidedSpearPose=null;}
}
export function advanceGuidedSpearPose(f,dt){
 const p=f._guidedSpearPose;if(!p)return;
 if(busy(f)||p.parts!==f.parts||!p.released&&rangedPoseChannels(f).arms[p.spear.side===1?1:0]){cancelGuidedSpearInput(f,p.spear.slot);f._guidedSpearPose=null;return;}
 if(!(dt>0)||f.hitstop>0)return;p.elapsed=Math.min(p.elapsed+dt,p.released?Infinity:p.spear.windup);
 if(p.released&&p.elapsed>=p.spear.windup+p.spear.recovery)f._guidedSpearPose=null;
}
export function restoreGuidedSpearPose(f){const s=f._guidedSpearOverlay;if(!s?.applied)return;if(s.parts===f.parts)for(const b of s.base){b.part.position.copy(b.position);b.part.quaternion.copy(b.quaternion);}s.applied=false;}
export function animateGuidedSpearPose(f){
 const p=f._guidedSpearPose;if(!p||!f.parts.rig)return;const arm=p.spear.side===1?f.parts.armR:f.parts.armL;
 let s=f._guidedSpearOverlay;if(!s||s.parts!==f.parts||s.arm!==arm)s=f._guidedSpearOverlay={parts:f.parts,arm,base:[arm,...arm.children].map(part=>({part,position:new THREE.Vector3(),quaternion:new THREE.Quaternion()}))};
 for(const b of s.base){b.position.copy(b.part.position);b.quaternion.copy(b.part.quaternion);}s.applied=true;
 const t=Math.min(1,p.elapsed/p.spear.windup),cast=THREE.MathUtils.smoothstep(t,.4,1),recovery=THREE.MathUtils.smoothstep((p.elapsed-p.spear.windup)/p.spear.recovery,0,1);
 point.copy(arm.position).add(aim.set(p.spear.side*.65,1.9-1.4*cast,-1+4.4*cast).multiplyScalar(f.parts.rig.pivotHeight/4.6));pole.set(p.spear.side,.3,-.25);
 reachArm(arm,point,p.spear.side,1-recovery,pole);
 if(!p.released){
  const hand=arm.children[2];hand.updateWorldMatrix(true,false);hand.getWorldQuaternion(inverse).invert();
  point.set(0,1,0).lerp(f.aim3||f.aim,cast).normalize();rotation.setFromUnitVectors(forward,point);
  p.spear.obj.quaternion.copy(inverse).multiply(rotation);
  p.spear.obj.position.set(0,0,3.2).applyQuaternion(p.spear.obj.quaternion);
 }
}

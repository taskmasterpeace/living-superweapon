import {Vector3,Quaternion} from 'three';
import {cancelHeldAttacks} from './abilities.js';
import {canPilotVehicle} from './mobility-policy.js';
import {soldierControlsActive} from '../core/soldier-controls.js';
import {SCOUT_DRIVE,stepGroundDrive,haltDrive} from './ground-driving.js';

// Deliberately bounded arcade ground driving: no suspension, seat animation,
// ramming damage or player gun input. Native actor remains the chase target.
const AXLE=new Vector3(1,0,0),UP=new Vector3(0,1,0),spinQ=new Quaternion(),steerQ=new Quaternion();
const WHEELS=[[-4.9395,7.9],[4.9395,7.9],[-4.9395,-8.5],[4.9395,-8.5]];
export class ScoutDriving {
 constructor(convoy){this.convoy=convoy;this.game=convoy.game;this.vehicle=null;this.throttle=0;this.steer=0;this.brake=false;this._exit=new Vector3();}
 handleInput(input){
  const g=this.game,p=g.player;
  if(g.paused||g.running===false||g.matchOver||g.hud?.titleOpen||g.combatOverlayOpen){this.throttle=this.steer=0;this.brake=true;return !!this.vehicle;}
  const use=input?.pressed?.('KeyJ')?'KeyJ':soldierControlsActive(p,g)&&input?.pressed?.('KeyE')?'KeyE':null;
  if(use){
   if(this.vehicle){input.justPressed?.delete(use);this.exit();return true;}
   if(canPilotVehicle(p)){
    let nearest=null,distance=Infinity;
    for(const v of this.convoy.vehicles){
     if(v.destroyed||v.occupant)continue;const c=v.cover,dx=Math.max(0,Math.abs(p.pos.x-c.x)-c.hx),dz=Math.max(0,Math.abs(p.pos.z-c.z)-c.hz),d=Math.hypot(dx,dz);
     if(d<=7&&Math.abs(p.pos.y-v.ground)<8&&d<distance&&this._accessClear(p,v)){nearest=v;distance=d;}
    }
    if(nearest){input.justPressed?.delete(use);this.enter(nearest,p);return true;}
   }
  }
  if(!this.vehicle)return false;
  this.throttle=Number(!!input?.down?.('KeyW'))-Number(!!input?.down?.('KeyS'));
  this.steer=Number(!!input?.down?.('KeyD'))-Number(!!input?.down?.('KeyA'));this.brake=!!input?.down?.('Space');return true;
 }
 enter(v,p){
  if(!canPilotVehicle(p)||v.destroyed||v.occupant)return false;
  cancelHeldAttacks(p);this.vehicle=v;v.occupant=p;p._scoutVehicle=v;v.speed=0;v.vx=0;v.vz=0;v.yawVel=0;v.steerSmooth=0;
  v._priorNoCam=v.cover.noCam;v.cover.noCam=true;this.game.world._chaseSnap=true;
  this.throttle=this.steer=0;this.brake=false;v._occupantVisible=p.obj.visible;
  p.flying=false;p.flyHeld=p.descendHeld=false;p.guarding=p.prone=p.crouching=p.sprintHeld=false;p.moveDir={x:0,z:0};p.vel.set(0,0,0);p.obj.visible=false;this._seat();
 }
 _seat(){const v=this.vehicle,p=v?.occupant;if(!p)return;p.pos.set(v.cover.x,v.mesh.position.y+3,v.cover.z);p.vel.set(0,0,0);p.obj.position.copy(p.pos);p.obj.visible=false;}
 _accessClear(p,v){
  const dx=v.cover.x-p.pos.x,dz=v.cover.z-p.pos.z,steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)));
  for(let i=0;i<=steps;i++)if(!this._clear(p.pos.x+dx*i/steps,p.pos.z+dz*i/steps,p.radius||2,v.cover,p.pos.y,p.pos.y+8))return false;
  return true;
 }
 _clear(x,z,r,ignore,bottom=-Infinity,top=Infinity){
  const w=this.game.world;if(Number.isFinite(w.ARENA)&&(Math.abs(x)+r>w.ARENA||Math.abs(z)+r>w.ARENA))return false;
  for(const c of w.cover||[]){if(c===ignore||c.hp<=0||top<(c.bottom??0)||bottom>(c.top??c.h??Infinity))continue;
   const dx=Math.max(0,Math.abs(x-c.x)-(c.hx??c.r??0)),dz=Math.max(0,Math.abs(z-c.z)-(c.hz??c.r??0));if(dx*dx+dz*dz<r*r)return false;
  }
  return true;
 }
 _surface(x,z,yaw){
  const w=this.game.world,s=Math.sin(yaw),c=Math.cos(yaw),heights=[];
  for(const [dx,dz]of WHEELS){const px=x+c*dx+s*dz,pz=z-s*dx+c*dz,h=w.heightAt?.(px,pz)??0;if(!Number.isFinite(h)||w.waterAt?.(px,pz))return null;heights.push(h);}
  if(Math.max(...heights)-Math.min(...heights)>5)return null;
  return heights.reduce((a,b)=>a+b,0)/4;
 }
 // Wheelbase grade sampled in the vehicle's heading, positive uphill.
 _grade(v){
  const w=this.game.world,s=Math.sin(v.yaw),c=Math.cos(v.yaw);
  const h=(dx,dz)=>w.heightAt?.(v.cover.x+c*dx+s*dz,v.cover.z-s*dx+c*dz)??0;
  const grade=(h(...WHEELS[0])+h(...WHEELS[1])-h(...WHEELS[2])-h(...WHEELS[3]))/(2*16.4);
  return Number.isFinite(grade)?grade:0;
 }
 // Cosmetic rotation reads accepted displacement, so a blocked car does not spin tires.
 _wheels(v,distance=0){
  if(!v.mesh?.getObjectByName)return;
  if(!v._driveWheels)v._driveWheels=['FL','FR','RL','RR'].map(name=>{
   const node=v.mesh.getObjectByName('wheels_'+name);return node?{node,rest:node.quaternion.clone(),front:name[0]==='F'}:null;
  });
  v._wheelSpin=((v._wheelSpin||0)+distance/Math.max(.001,.65*Math.abs(v.mesh.scale?.x||1)))%(Math.PI*2);
  spinQ.setFromAxisAngle(AXLE,v._wheelSpin);
  steerQ.setFromAxisAngle(UP,-(v.steerSmooth||0)*.5);
  for(const wheel of v._driveWheels){if(!wheel)continue;wheel.node.quaternion.copy(wheel.rest);if(wheel.front)wheel.node.quaternion.multiply(steerQ);wheel.node.quaternion.multiply(spinQ);}
 }
 update(dt){
  const v=this.vehicle;if(!v)return;
  if(v.destroyed||!v.occupant?.alive||v.occupant!==this.game.player||v.occupant._formDisposed){this.exit(true);return;}
  if(this.game.paused||this.game.running===false||!Number.isFinite(dt)||dt<=0)return;
  if(this.game.matchOver||this.game.hud?.titleOpen||this.game.combatOverlayOpen||this.game._frontlinePreparing){haltDrive(v);this.throttle=this.steer=0;return;}
  dt=Math.min(dt,.1);
  // Shape the frame's kinematics (accel/brake/steer/traction) in the pure model,
  // then SWEEP the resulting travel in <=1.25u steps so fast motion can never
  // tunnel through cover, a cliff or water — the anti-tunnel guard is unchanged.
  this.advance(v,{throttle:this.throttle,steer:this.steer,brake:this.brake},dt);
  this._seat();
 }
 // Manual and mission drivers share movement, support and collision ownership.
 advance(v,intent,dt){
  if(v.destroyed||!Number.isFinite(dt)||dt<=0)return;
  dt=Math.min(dt,.1);
  stepGroundDrive(v,{...intent,grade:this._grade(v)},dt,SCOUT_DRIVE);
  let travelled=0;
  const dx=v.vx*dt,dz=v.vz*dt,dist=Math.hypot(dx,dz);
  const steps=Math.max(1,Math.ceil(dist/1.25)),sx=dx/steps,sz=dz/steps;
  for(let i=0;i<steps;i++){
   const x=v.cover.x+sx,z=v.cover.z+sz,h=this._surface(x,z,v.yaw),r=v.driveRadius;
   if(h===null||Math.abs(h-v.ground)>3||!this._clear(x,z,r,v.cover,v.cover.bottom,v.cover.top)){haltDrive(v);break;}
   travelled+=Math.hypot(sx,sz);
   v.cover.x=x;v.cover.z=z;v.mesh.position.x=x;v.mesh.position.z=z;v.terrain=[];
  }
  this._wheels(v,travelled*Math.sign(v.speed||((dx*Math.sin(v.yaw)+dz*Math.cos(v.yaw)))));
  this.convoy._ground(v);
 }
 exit(force=false){
  const v=this.vehicle,p=v?.occupant;if(!p)return false;
  let found=false;const r=p.radius||2;
  for(let ring=0;ring<3&&!found;ring++)for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){
   const x=v.cover.x+dx*(v.cover.hx+r+3+ring*5),z=v.cover.z+dz*(v.cover.hz+r+3+ring*5),h=this.game.world.heightAt?.(x,z)??0;
   if(!Number.isFinite(h)||this.game.world.waterAt?.(x,z)||!this._clear(x,z,r,v.cover,h,h+8))continue;
   if((this.game.entities||[]).some(f=>f!==p&&f.alive&&Math.hypot(f.pos.x-x,f.pos.z-z)<r+(f.radius||2)))continue;
   this._exit.set(x,h,z);found=true;break;
  }
  if(!found&&!force)return false;
  if(!found)this._exit.set(v.cover.x,v.cover.top+.2,v.cover.z);
  p.pos.copy(this._exit);p.obj.position.copy(p.pos);p.vel.set(0,0,0);p.obj.visible=v._occupantVisible!==false;p._scoutVehicle=null;v.occupant=null;v.speed=0;v.vx=0;v.vz=0;v.yawVel=0;v.steerSmooth=0;
  v.cover.noCam=v._priorNoCam;this.game.world._chaseSnap=true;
  this._wheels(v,0);
  this.vehicle=null;this.throttle=this.steer=0;this.brake=false;return true;
 }
 dispose(){this.exit(true);}
}

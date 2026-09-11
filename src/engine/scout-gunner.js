import * as THREE from 'three';
import {sweepSplitObstacle} from './projectile-contact.js';
// Original game-specific control policy. No CWR implementation is copied here.
export class ScoutFireControl{
 constructor(){this.acquired=0;this.cooldown=0;this.remaining=0;this.state='search';}
 update(dt,s){
  if(!Number.isFinite(dt)||dt<=0||dt>.25)return false;
  this.cooldown=Math.max(0,this.cooldown-dt);
  const eligible=s.enabled&&s.alive&&s.visible&&s.aligned&&s.range>=22&&s.range<=260&&s.elevation>=-.08&&s.elevation<=.52;
  if(!eligible){this.acquired=0;this.remaining=0;this.state=s.alive?'search':'disabled';return false;}
  if(this.cooldown>0){this.state=this.remaining?'burst':'reload';return false;}
  this.acquired+=dt;this.state='acquire';
  if(this.acquired<1.1)return false;
  if(!this.remaining)this.remaining=3;
  this.remaining--;this.cooldown=this.remaining?.18:2.4;
  if(!this.remaining)this.acquired=0;
  this.state='fire';return true;
 }
}

const approach=(value,target,step)=>value+THREE.MathUtils.clamp(Math.atan2(Math.sin(target-value),Math.cos(target-value)),-step,step);
export class ScoutGunner{
 constructor(game,vehicle){
  this.game=game;this.vehicle=vehicle;this.turret=vehicle.mesh.getObjectByName('turret');this.barrel=vehicle.mesh.getObjectByName('barrel');
  this.control=new ScoutFireControl();this.shots=0;
  this.source={name:'CLONE SCOUT',team:1,pos:new THREE.Vector3(),powerBuff:1,alive:true,_frontlineVehicle:true};
  this.muzzle=new THREE.Vector3();this.target=new THREE.Vector3();this.local=new THREE.Vector3();this.direction=new THREE.Vector3();this.bore=new THREE.Vector3();this.quat=new THREE.Quaternion();this.friend=new THREE.Vector3();
  this.sightWorld=Object.create(game.world);this.sightWorld.cover=[];this.contact={};
 }
 update(dt,enabled){
  const g=this.game,v=this.vehicle;let p=g.player;
  this.source.team=v.occupant?.team??1;
  if(v.occupant){
   p=null;let distance=260*260;
   for(const f of g.entities||[]){if(!f.alive||f.team===this.source.team||f.isDummy)continue;
    const d=f.pos.distanceToSquared(v.mesh.position);if(d<distance){distance=d;p=f;}
   }
  }
  this.source.alive=!v.destroyed;this.source.pos.copy(v.mesh.position);
  if(!this.turret||!this.barrel||!Number.isFinite(dt)||dt<=0||dt>.25||g.paused||g.running===false)return;
  if(!p?.alive||!enabled||v.destroyed){this.control.update(dt,{alive:!v.destroyed,enabled:false});return;}
  this.target.copy(p.pos);this.target.y+=5;
  v.mesh.updateWorldMatrix(true,true);this.barrel.localToWorld(this.muzzle.set(0,.01,1.34));
  this.direction.subVectors(this.target,this.muzzle);const range=this.direction.length();this.direction.normalize();
  // Use the actual terrain/interior/cover sweep, omitting only our own hull.
  const cover=this.sightWorld.cover;cover.length=0;for(const c of g.world.cover||[])if(c!==v.cover)cover.push(c);
  let visible=!sweepSplitObstacle(this.sightWorld,this.muzzle,this.target,.3,this.contact);
  for(const f of g.entities||[]){
   if(!visible)break;if(!f.alive||f===p||f===v.occupant||f.team!==this.source.team)continue;
   this.friend.copy(f.pos);this.friend.y+=5;this.friend.sub(this.muzzle);
   const t=this.friend.dot(this.direction);
   if(t>0&&t<range&&this.friend.addScaledVector(this.direction,-t).lengthSq()<25)visible=false;
  }
  // No tracking through walls. Both axes have finite slew and mechanical stops.
  this.local.copy(this.target);this.turret.parent.worldToLocal(this.local);this.local.sub(this.turret.position);
  const elevation=Math.atan2(this.local.y,Math.hypot(this.local.x,this.local.z));
  if(visible&&range<=260){
   this.turret.rotation.y=approach(this.turret.rotation.y,Math.atan2(this.local.x,this.local.z),dt*1.2);
   this.turret.updateWorldMatrix(true,true);
   this.local.copy(this.target);this.turret.worldToLocal(this.local);this.local.sub(this.barrel.position);
   const pitch=-Math.atan2(this.local.y,Math.hypot(this.local.x,this.local.z));
   this.barrel.rotation.x=approach(this.barrel.rotation.x,THREE.MathUtils.clamp(pitch,-.52,.08),dt*.8);
  }
  this.barrel.updateWorldMatrix(true,true);this.barrel.localToWorld(this.muzzle.set(0,.01,1.34));
  this.barrel.getWorldQuaternion(this.quat);this.bore.set(0,0,1).applyQuaternion(this.quat).normalize();
  this.direction.subVectors(this.target,this.muzzle).normalize();
  const aligned=this.bore.dot(this.direction)>.9995;
  if(!this.control.update(dt,{enabled,alive:true,visible,aligned,range,elevation}))return;
  this.shots++;
  g.projectiles.spawnProjectile(this.source,{pos:this.muzzle.clone(),vel:this.bore.clone().multiplyScalar(220),bullet:true,ballistic:true,damage:4,radius:.25,blast:.6,life:1.25,homing:0,grav:0,weapon:'rifle',dtype:'ballistic',color:'#f8cf85',launchCover:v.cover});
  g.audio?.soundLibrary?.play('scout-gunshot',{pos:this.muzzle});
  g.particles?.burst(this.muzzle.x,this.muzzle.y,this.muzzle.z,{count:3,speed:5,life:.09,size:1.1,color:['#ffe3a1','#ffac52'],up:0,grav:0});
 }
}

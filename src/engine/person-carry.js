import * as THREE from 'three';
import {fighterPathFraction} from './fighter-environment-contact.js';

export const isTransportingPerson=f=>!!(f?._personCarry&&f._personCarry.victim===f.grabbing&&f.grabbing?.grabbedBy===f&&f.grabState==='clinch');
export function friendlyPickupTarget(f,g,reach){
 if(g.modeId!=='powerworld'||f.team==null)return null;
 const origin=f.center(new THREE.Vector3()),aim=f.aim3.clone().normalize();let found=null,best=reach;
 for(const v of g.entities){
  if(v===f||!v.alive||v.isDummy||v.team!==f.team||v.grabbedBy||v.grabbing||v._mount||v._aircraftVehicle||v._passengerTransport||v._scoutVehicle||v.phase)continue;
  const delta=v.center(new THREE.Vector3()).sub(origin),distance=delta.length();
  if(distance>best||distance<.001||delta.normalize().dot(aim)<.58)continue;
  if(fighterPathFraction({radius:0,sizeScale:1},g.world,origin,v.center(new THREE.Vector3()))<1)continue;
  found=v;best=distance;
 }
 return found;
}
export const personCarrySpeed=f=>isTransportingPerson(f)?f._personCarry.speedScale:1;
export const personThrowSpeed=(f,base)=>isTransportingPerson(f)?Math.min(180,base*(1.35+.75*Math.min(1,f._personCarry.whirlT/1.2))):base;
export function personThrowCue(f,g){
  if(!isTransportingPerson(f))return null;
  const v=f.grabbing,from=v.pos.clone(),dir=f.aim3.clone();if(dir.lengthSq()<.01)dir.copy(f.aim);dir.normalize();
  const end=from.clone().addScaledVector(dir,45),fraction=fighterPathFraction(v,g.world,from,end);
  end.lerpVectors(from,end,fraction);
  return {from,end,blocked:fraction<1,height:6*(v.sizeScale||1)};
}
export function beginPersonCarry(f,v,massRatio){
  // The held body is now the payload. Tracking its orbit would steer both
  // camera and throw aim in a feedback loop while the player whirls it.
  const g=f._game;
  if(g?.isHuman(f)){
    if(g.hardLock===v)g.hardLock=null;
    if(g.lockTarget===v)g.lockTarget=null;
  }
  f._personCarry={victim:v,speedScale:Math.max(.45,1-.5*massRatio),angle:0,whirlT:0,whirling:false,
    holder:f.pos.clone(),held:v.pos.clone(),cancelVersion:f._game?.input?.cancelVersion};
}
export function syncPersonCarry(f,g){
  if(!isTransportingPerson(f))return false;
  const s=f._personCarry,v=s.victim,c=Math.cos(s.angle),n=Math.sin(s.angle);
  const dx=f.aim.x*c+f.aim.z*n,dz=f.aim.z*c-f.aim.x*n;
  const target=new THREE.Vector3(f.pos.x+dx*3.3,f.pos.y+1.8,f.pos.z+dz*3.3);
  const t=Math.min(fighterPathFraction(f,g.world,s.holder,f.pos),fighterPathFraction(v,g.world,s.held,target));
  const safe=t<1?Math.max(0,t-1e-5):1;
  f.pos.lerpVectors(s.holder,f.pos,safe);v.pos.lerpVectors(s.held,target,safe);
  if(t<1)f.vel.set(0,0,0);
  v.vel.set(0,0,0);v.state='hit';v.faceDir(-dx,-dz);
  s.holder.copy(f.pos);s.held.copy(v.pos);v._sync();
  return t===1;
}
export function advancePersonCarry(f,g,dt){
  const s=f._personCarry;
  if(!isTransportingPerson(f))return false;
  if(g.isHuman(f)&&s.cancelVersion!==g.input?.cancelVersion)return false;
  if(!f.spendKi((3+4*(1-s.speedScale)+(s.whirling?8:0))*dt))return false;
  if(s.whirling&&!f._clinchPunch&&!f._clinchFinisher){
    // Fixed angular substeps bound the actual swept arc even on a long frame.
    const turn=Math.min(dt,.1)*5,steps=Math.max(1,Math.ceil(turn/.08));
    for(let i=0;i<steps;i++){
      const old=s.angle;s.angle+=turn/steps;
      if(!syncPersonCarry(f,g)){s.angle=old;s.whirling=false;break;}
      s.whirlT=Math.min(1.2,s.whirlT+Math.min(dt,.1)/steps);
    }
  }else syncPersonCarry(f,g);
  return true;
}
export function personSetdownPoint(f,g){
  if(!isTransportingPerson(f))return null;
  const v=f.grabbing,ground=g.world.heightAt(f.pos.x,f.pos.z);
  if(f.pos.y-ground>2.5)return null;
  const d=f.radius+v.radius+.2,target=v.pos.clone().set(f.pos.x+f.aim.x*d,0,f.pos.z+f.aim.z*d);
  target.y=g.world.heightAt(target.x,target.z);
  if(Math.abs(target.y-ground)>2.5||fighterPathFraction(v,g.world,v.pos,target)<1)return null;
  for(const other of g.entities)if(other!==f&&other!==v&&other.alive&&other.pos.distanceTo(target)<other.radius+v.radius)return null;
  return target;
}

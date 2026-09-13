import * as THREE from 'three';
import {liftCapacityOf,bodyWeight} from './entity.js';
import {isTransportingPerson,personThrowSpeed} from './person-carry.js';
import {fallingGravity,thrownDrag} from './body-ballistics.js';
import {prepareWindBody,applyBodyWind} from './weather-body.js';
import {sweepFighterEnvironment} from './fighter-environment-contact.js';

export const THROW_WINDOW=1.35;
export function personThrowLaunch(holder,victim){
 const back=holder.grabMode==='back',transport=isTransportingPerson(holder);
 const ratio=Math.max(.45,Math.min(1.2,.75+.15*Math.log2(liftCapacityOf(holder.def)/Math.max(.05,bodyWeight(victim.def)))));
 const speed=personThrowSpeed(holder,((back?60:48)+(holder.def.strength??5)*4.6)*ratio);
 const direction=holder.aim3.clone();if(direction.lengthSq()<.01)direction.set(holder.aim.x,0,holder.aim.z);direction.normalize();
 return {back,transport,direction,damage:(back?16:10)*holder.powerBuff,velocity:new THREE.Vector3(direction.x*speed,(direction.y+(transport?0:.22))*speed,direction.z*speed)};
}
// Snapshot prediction ends at the first physical contact or control recovery.
// It never calls Fighter.update, damage, AI, audio, or resource mutation.
export function previewPersonThrow(holder,g,{dt=1/120}={}){
 if(!isTransportingPerson(holder)||holder._personCarry.friendly)return null;
 const v=holder.grabbing,launch=personThrowLaunch(holder,v),points=[v.pos.clone()];
 if(v.hp<=launch.damage)return {points,contact:false,reason:'RELEASE MAY KO'};
 const f={...v,pos:v.pos.clone(),vel:launch.velocity.clone(),alive:true,flying:false,flyHeld:false,gliding:false,prone:false,crouching:false,onBlock:false,
 launchT:THROW_WINDOW,_thrownT:THROW_WINDOW,_weatherBody:{},_windCarry:{x:0,z:0},_pronePose:null};
 let contact=false;
 f._wallContact=()=>{contact=true;};
 const step=Math.max(1/240,Math.min(1/30,dt));
 for(let t=0;t<THROW_WINDOW-1e-8;){
  const delta=Math.min(step,THROW_WINDOW-t);t+=delta;f.launchT=THROW_WINDOW-t;f._thrownT=f.launchT;
  if(f.pos.y>0||f.vel.y>0)f.vel.y-=fallingGravity(f,g)*delta;
  f.groundY=g.world.heightAt?.(f.pos.x,f.pos.z)||0;
  const wind=prepareWindBody(f,g),drag=wind.driven?1:Math.exp(-thrownDrag(f)*delta);
  f.vel.x*=drag;f.vel.z*=drag;applyBodyWind(f,wind,delta);f.vel.y=Math.max(-160,Math.min(70,f.vel.y));
  const expected=f.pos.clone().addScaledVector(f.vel,delta);
  sweepFighterEnvironment(f,g,delta);
  const ground=g.world.heightAt?.(f.pos.x,f.pos.z)||0;
  if(f.pos.y<=ground&&f.vel.y<=0){f.pos.y=ground;contact=true;}
  if(f.pos.distanceToSquared(expected)>1e-8)contact=true;
  points.push(f.pos.clone());if(contact)break;
 }
 return {points,contact,reason:contact?'PREDICTED IMPACT':'CONTROL RECOVERY'};
}

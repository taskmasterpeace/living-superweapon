import * as THREE from 'three';
import {damp} from '../core/util.js';
import {firearmEmitter} from './weapon-emission.js';

// The strongest hand channel still owns the shared body carrier. An independently
// available hand has its own entry, aim, recoil clock and gather/release weight.
// These are presentation histories only; they never hold or redirect paid shots.
export function updateIndependentHands(f,channels,dt,blocked){
 const state=f._combatAim,primary=channels.dominant;
 const hands=state.armChannels ||= Array.from({length:2},()=>({weight:0,gather:0,point:new THREE.Vector3(),slot:null,independent:false,firearm:null}));
 for(let i=0;i<2;i++){
  const hand=hands[i],owner=channels.arms[i];
  if(owner){
   hand.slot=owner;hand.independent=owner!==primary;
   if(!hand.independent){
    hand.weight=state.weight;hand.gather=state.gather;hand.point.copy(state.point);hand.firearm=state.firearm;continue;
   }
  }
  // firearmEmitter returns shared scratch fields; each lane owns its snapshot.
  // Refresh recovery too: a form/equipment change can retire the previous rig
  // after its trigger was released but before the arm has reached its rest pose.
  hand.firearm=hand.slot?.def.type==='rifle'?Object.assign(hand._firearm ||= {},firearmEmitter(f,hand.slot.def)):null;
  hand.gather=damp(hand.gather,owner?.charging?1:0,owner?.charging?14:20,dt);
  const command=hand.command ||= new THREE.Vector3();
  if(f.hasAimWorld)command.copy(f.aimWorld);else command.copy(f.pos).addScaledVector(f.aim3,100);
  const beam=owner?.active?.sustaining&&!owner.active.dead?owner.active:null;
  if(beam?.predictDirection){
   const origin=hand.origin ||= new THREE.Vector3(),direction=hand.direction ||= new THREE.Vector3();
   f.parts.g.updateMatrixWorld(true);beam.sampleMuzzle(origin);beam.predictDirection(direction,dt,origin);
   if(beam.pendingLaunch&&beam._launchTarget)hand.point.copy(beam._launchTarget);
   else hand.point.copy(origin).addScaledVector(direction,100);
  }else if(hand.weight<.0001)hand.point.copy(command);
  else hand.point.lerp(command,1-Math.exp(-24*dt));
  hand.weight=blocked?0:damp(hand.weight,owner?1:0,owner?18:12,dt);
 }
 return hands;
}

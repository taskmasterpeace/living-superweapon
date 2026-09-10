import * as THREE from 'three';
import {MeleeSystem} from '../engine/melee.js';
import {Game} from '../engine/game.js';

export const MELEE_SEQUENCES={combo:'Light combination',heavy:'Charged heavy',crush:'Heavy vs guard',block:'Block incoming punch',break:'Receive guard-breaking heavy',body:'Body blow → throw',throw:'Clinch → aimed throw',slam:'Clinch → drive down'};
export const defensiveSequence=sequence=>sequence==='block'||sequence==='break';
const still=new THREE.Vector3();

// Only input choreography belongs to the editor. Contact, resistance, hold
// duration, hitstop, escapes, physics and recovery are the live engine's rules.
export function resetMelee(stage) {
  const {game:g,fighter:f,target:t}=stage;
  g.melee??=new MeleeSystem(g);
  Object.assign(g,{coneFoe:Game.prototype.coneFoe,onBlockedStrike:Game.prototype.onBlockedStrike,
    trail:()=>{},heroYell:()=>{},afterimage:()=>{},onSlam:Game.prototype.onSlam});
  stage.meleeSequence??='combo';
  const grounded=stage.meleeStage==='grounded',height=grounded?0:80;
  f.pos.set(0,height,0);t.pos.set(0,height,4.8);
  for(const actor of [f,t]) {
    actor.vel.set(0,0,0);actor.invuln=0;actor.flying=!grounded;actor.gait=grounded?'grounded':'airborne';actor._flyPose=grounded?0:1;actor.hitstop=0;actor._chaseKb=true;
    actor.isDummy=true;actor.hasAimWorld=true;actor._animate(1);actor.obj.updateMatrixWorld(true);
  }
  f.faceDir(0,1);t.faceDir(0,-1);f.aim3.set(0,0,1);
  t.guarding=stage.meleeSequence==='crush';t._guardUpT=2;
  if(defensiveSequence(stage.meleeSequence)){g.melee.guard(f,true);f._guardUpT=2;}
  t.center(f.aimWorld);f.center(t.aimWorld);
  stage.previous=0;stage.phase='ready';
}

export function stepMelee(stage,time,dt) {
  const {game:g,fighter:f,target:t,meleeSequence:sequence}=stage;
  g.time=time;g.dt=dt||1/60;
  if(dt>0) {
    const crossed=at=>stage.previous<at&&time>=at;
    t.center(f.aimWorld);f.aim3.copy(f.aimWorld).sub(f.center(new THREE.Vector3())).normalize();
    f.faceDir(t.pos.x-f.pos.x,t.pos.z-f.pos.z);
    if(defensiveSequence(sequence)) {
      g.melee.guard(f,time<2.3);
      f.center(t.aimWorld);t.aim3.copy(t.aimWorld).sub(t.center(new THREE.Vector3())).normalize();
      t.faceDir(f.pos.x-t.pos.x,f.pos.z-t.pos.z);
      if(crossed(.7))g.melee.chargeStart(t);
      if(crossed(sequence==='block'?.745:1.45))g.melee.chargeRelease(t);
    } else if(sequence==='combo')for(const start of [.3,.72,1.14]) {
      if(crossed(start))g.melee.chargeStart(f);if(crossed(start+.045))g.melee.chargeRelease(f);
    }
    else if(sequence==='heavy'||sequence==='crush') {
      if(crossed(.3))g.melee.chargeStart(f);if(crossed(1.05))g.melee.chargeRelease(f);
    } else {
      if(crossed(.3))g.melee.grab(f);
      if(sequence==='throw'&&crossed(.85))g.melee.grab(f);
      if(sequence==='body') {if(crossed(.62))g.melee.chargeStart(f);if(crossed(.65))g.melee.chargeRelease(f);if(crossed(1.3))g.melee.grab(f);}
      if(sequence==='slam') {if(crossed(.62))g.melee.chargeStart(f);if(crossed(1.24))g.melee.chargeRelease(f);}
    }
    f.move(still,dt);t.move(still,dt);
    g.melee.beginContactFrame();
    g.beginBodyContactFrame();
    f.update(dt,g);t.update(dt,g);
    g.resolveBodies();
    g.melee.endContactFrame();
    g.particles.update(dt);g.vfx.update(dt);stage.previous=time;
  } else {
    f._animate(0);t._animate(0);f.obj.updateMatrixWorld(true);t.obj.updateMatrixWorld(true);
  }
  const last=stage.meleeEvents.at(-1),impact=last?.move==='surface'&&time-last.time<.25;
  const aboveSurface=t.pos.y>(t.groundY||0)+.1;
  stage.phase=f._clinchFinisher?'hoist':f._clinchPunch?'body-blow':f.meleeCharge>0?'windup':f.mstate||f.grabState||(impact?'surface-impact':t.launchT>0&&aboveSurface?'launched':!t.flying&&aboveSurface?'falling':time<.3?'ready':'recovered');
  if(defensiveSequence(sequence))stage.phase=f.staggerT>0?'guard-broken':f._blocked>0?'blocked':f.guarding?'braced':'recovered';
}

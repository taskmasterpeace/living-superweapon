import {hasStrike,STRIKES} from '../data/martial.js';
import * as THREE from 'three';
import {ROSTER} from '../data/characters.js';
import {performEvade} from './abilities.js';
import {MeleeRecording} from './melee-recording.js';
import {openMeleeReview} from './melee-review.js';
export function meleeLesson(def){
 const combo=hasStrike(def,'jab')||hasStrike(def,'cross');
 return (combo?'V tap: punch; repeat for combo':'V tap: heavy slam')+' · hold/release V: charge heavy · Q: frontal guard · E: grab · double-tap direction: dodge';
}
export const MELEE_TRIALS=['stationary','retreat','guard','dodge','defend'];
export function trialLesson(kind,def){
 const lesson={stationary:'Face the target and tap V inside your approach range.',retreat:'Tap V to commit an approach. Walking retreat should not outrun the entry; a sideways dodge can.',guard:'This target blocks. Try a punch, charged heavy, then E grab: compare energy absorption and guard break.',dodge:'This target dodges sideways. Time your approach after its dodge rather than expecting the strike to home.',defend:'Face the incoming fighter and hold Q. Funded frontal guard spends energy before health. Release and reposition between attacks.'};
 return lesson[kind]+' '+meleeLesson(def);
}
// Scripted decisions use native motion, defense and damage; no target teleporting.
export class MeleeTrial {
 constructor(g,origin){this.g=g;this.origin=origin.clone();this.records=[];this.index=-1;this.recording=new MeleeRecording();}
 start(kind='stationary'){
  if(!MELEE_TRIALS.includes(kind))throw Error('Unknown melee trial');
  this.clear();this.attempt=null;this.phaseKey=null;this.kind=kind;this.index=MELEE_TRIALS.indexOf(kind);this.elapsed=0;this.dodgeAt=1;this.attackAt=1;this.releaseAt=null;
  const base=ROSTER.find(d=>d.id==='merc')||ROSTER[0];
  const f=this.g.addFighter({...base,name:'Trial '+kind,abilities:{},items:[],holo:true},{team:this.g.player.team===0?1:0,dummy:true,x:this.origin.x,z:this.origin.z});
  f.pos.y=this.g.world.heightAt(f.pos.x,f.pos.z);f._chaseKb=true;f._openSky=true;f.noRespawn=true;f._meleeTrial=this;this.target=f;this.startHp=f.hp;
  this.recording.bind([this.g.player,f]);
  this.g.hud?.feed?.(kind.toUpperCase()+' · '+trialLesson(kind,this.g.player.def),'#ffd24a');return f;
 }
 control(f,dt){
  if(!f.alive||f.grabbedBy||f.frozenT>0||f.staggerT>0)return;
  this.elapsed+=dt;const dir=new THREE.Vector3().subVectors(this.g.player.pos,f.pos);dir.y=0;const d=dir.length();dir.normalize();f.faceDir(dir.x,dir.z);f.aim.copy(dir);f.aim3.copy(dir);
  this.g.melee.guard(f,this.kind==='guard');const move=new THREE.Vector3();
  if(this.kind==='retreat'&&d<40&&f.pos.distanceTo(this.origin)<65)move.copy(dir).negate();f.move(move,dt,1);
  if(this.kind==='dodge'&&this.elapsed>=this.dodgeAt){this.dodgeAt=this.elapsed+1.5;performEvade(f,{x:-dir.z,z:dir.x},this.g);}
  if(this.kind==='defend'){
   if(this.releaseAt!==null&&this.elapsed>=this.releaseAt){this.g.melee.chargeRelease(f);this.releaseAt=null;}
   else if(this.elapsed>=this.attackAt&&this.releaseAt===null&&!f.mstate&&f.strikeCd<=0){
    this.attackAt=this.elapsed+2;this.releaseAt=this.elapsed+.06;this.g.melee.chargeStart(f);
   }
   if(d>7&&!f.mstate)f.move(dir,dt,1);
  }
 }
 repeat(){return this.start(this.kind||'stationary');}
 capture(){if(this.target&&!this.review){
  const f=this.g.player,phase=f.mstate||f.grabState||(f.staggerT>0?'staggered':f.strikeCd>0?'cooldown':f.guarding?'guard':'ready');
  if(phase!==this.phaseKey){this.phaseKey=phase;this.recording.mark(this.g.time,{label:({recover:'Recovery',active:'Strike active',clinch:'Holding target',startup:'Wind-up',staggered:'Staggered',cooldown:'Attack cooldown',guard:'Guard raised',ready:'Ready'})[phase]||phase,kind:'phase'});}
  this.recording.capture(this.g.time);
 }}
 openReview(){
  if(this.review||this.g.ms?.threatLab?.state!=='preparing')return;
  if(this.recording.frames.length<2){this.g.hud?.feed?.('Start a melee trial, then return here to review the exchange','#ffd24a');return;}
  this.review=openMeleeReview(this.g,this.recording,()=>{this.review=null;});
 }
 resetPractice(){
  const g=this.g,f=g.player;
  // Preparation-only refill. Keep the actual player object, loadout and stock:
  // replacing the actor here would invalidate the deployment manifest.
  if(g.ms?.threatLab?.state!=='preparing'||!f?.alive)return false;
  if(f._mount||f._scoutVehicle||f._aircraftVehicle||f._passengerTransport||f._carry||f.hanging||f._grapple||Object.values(f.slots||{}).some(s=>s.active||s.charging||s.sustainT>0)){
   g.hud?.feed?.('Finish your power or leave the vehicle before resetting practice','#ffd24a');return false;
  }
  if((f.grabbing&&f.grabbing!==this.target)||(f.grabbedBy&&f.grabbedBy!==this.target))return false;
  this.attempt=null;
  if(f.grabbing||f.grabbedBy)g.melee.release(f.grabbing?f:f.grabbedBy);
  g.melee._endStrike(f);g.melee.guard(f,false);
  f.clearDot();f.clotBleed(null,true);
  for(const key of ['hitstop','staggerT','stunT','frozenT','frost','guardBreakT','strikeCd','comboWin','strikeIdx','evadeCd','launchT','_thrownT','_slamCd','sleepT','blindT','shockT','downedT','_heavyT','drainedT'])f[key]=0;
  f.hp=f.maxHp;f.ki=f.maxKi;f.guardMeter=1;f.armor=f.armorMax;
  f._wounds={arm:0,leg:0,torso:0};f._woundT={arm:0,leg:0,torso:0};
  f.state='idle';f.stateT=0;f.vel.set(0,0,0);
  if(f.parts.ice)f.parts.ice.visible=false;
  this.repeat();
  g.hud?.feed?.('PRACTICE RESET · Health, energy, armor and guard restored · target reset','#ffd24a');
  return true;
 }
 strikeStarted(f){
  if(f!==this.g.player||!this.target)return;
  this.attempt={trial:this.kind,kind:f.mId,time:this.elapsed,contacts:0,approach:!!f._meleeMotion?.approachEnabled,distance:f.pos.distanceTo(this.target.pos),startup:STRIKES[f.mId].startup/(f.def.meleePace||1),active:STRIKES[f.mId].active/(f.def.meleePace||1),recovery:STRIKES[f.mId].recover/(f.def.meleePace||1)};
 }
 strikeEnded(f){
  if(f!==this.g.player||!this.attempt)return;
  const a=this.attempt;a.result=a.contacts?'contact':'no contact';this.records.push(a);if(this.records.length>100)this.records.shift();
  this.g.hud?.feed?.(a.result.toUpperCase()+' · '+a.kind.toUpperCase()+' · '+(a.approach?'approach engaged':'no approach')+' · start '+a.distance.toFixed(1)+'u · recovery '+Math.round(a.recovery*1000)+'ms','#ffd24a');this.attempt=null;
 }
 grabContact(holder,victim){if(holder!==this.g.player||victim!==this.target)return;this.recording.mark(this.g.time,{label:'Grab connected',kind:'grab'});this.g.hud?.feed?.('GRAB CONNECTED · tap V: body blow · hold V: slam · E again: aimed throw · act before the hold expires','#ffd24a');}
 hit(target,amount,opts,blocked,outcome=null){
  const incoming=target===this.g.player&&opts.src===this.target;
  if(!incoming&&target!==this.target)return;
  if(this.attempt&&opts.src===this.g.player)this.attempt.contacts++;
  const healthLost=outcome?.healthLost??amount,energySpent=outcome?.guardEnergySpent??0;
  const result=outcome?.guard==='broken'?'GUARD BROKEN':outcome?.guard==='blocked'?'BLOCK':blocked?'ABSORBED':'CONTACT';
  const label=(incoming?'YOU · ':'TARGET · ')+result+' · '+healthLost.toFixed(1)+' HP · '+energySpent.toFixed(1)+' guard energy';
  const record={trial:this.kind,time:this.elapsed,amount,blocked:!!blocked,hp:target.hp,playerKi:this.g.player.ki,healthLost,guardEnergySpent:energySpent,result,incoming,move:opts.meleeMove||'hit'};
  this.records.push(record);if(this.records.length>100)this.records.shift();this.recording.mark(this.g.time,{...record,label,kind:'contact'});
  this.g.hud?.feed?.(label,'#ffd24a');
 }
 clear(){this.review?.close();this.review=null;this.recording.clear();const f=this.target;if(!f)return;if(f.grabbedBy)this.g.melee.release(f.grabbedBy);if(f.grabbing)this.g.melee.release(f);for(const key of ['hardLock','lockTarget'])if(this.g[key]===f)this.g[key]=null;f._meleeTrial=null;f.dispose();f.obj.removeFromParent();const i=this.g.entities.indexOf(f);if(i>=0)this.g.entities.splice(i,1);this.target=null;}
 dispose(){this.clear();}
}

import {meleeLessonScheme,trialPrompt,approachLesson} from './combat-lesson-controls.js';
import {meleeEntryEligibility} from './melee-entry-target.js';
import {meleeApproach} from '../data/melee-approaches.js';
import {retirePracticeActor} from './practice-actor-retirement.js';
import {Fighter} from './entity.js';
import {hasStrike,STRIKES} from '../data/martial.js';
import * as THREE from 'three';
import {ROSTER} from '../data/characters.js';
import {performEvade} from './abilities.js';
import {MeleeRecording} from './melee-recording.js';
import {openMeleeReview} from './melee-review.js';
import {meleePhase,phaseLabel} from './melee-phase.js';
import {AerialGrabDemo,AerialStunDemo} from './aerial-grab-demo.js';
export function meleeLesson(def,scheme='kbm'){
 const combo=hasStrike(def,'jab')||hasStrike(def,'cross');
 if(scheme==='touch')return (combo?'Tap Punch; repeat for combo':'Tap Punch: heavy slam')+' · hold/release Punch: charged heavy · hold Block: frontal guard · Grab: grab or interact · Evade: dodge';
 if(scheme==='pad')return (combo?'Tap Strike; repeat for combo':'Tap Strike: heavy slam')+' · hold/release Strike: charged heavy · hold Guard: frontal guard · Grab: grab or interact · Evade: dodge';
 return (combo?'V tap: punch; repeat for combo':'V tap: heavy slam')+' · hold/release V: charge heavy · Q: frontal guard · E: grab · double-tap direction: dodge';
}
export const GUARD_LESSON='Hold guard while facing the attacker: it stays up through ordinary blocked hits. Energy pays for damage; an empty energy pool lets unpaid damage through. The guard meter also wears down. Heavy guard crush breaks it; grabs bypass it. You cannot guard while attacking, carrying, stunned or recovering from a break. Release to recover the guard meter; turn or dodge attacks from behind.';
export const MELEE_TRIALS=['stationary','retreat','guard','dodge','defend','airborne','air-defense'];
export function trialLesson(kind,def,scheme='kbm'){
 const lesson={stationary:'Face the target and tap V inside your approach range.',retreat:'Tap V to commit an approach. Walking retreat should not outrun the entry; a sideways dodge can.',guard:'This target blocks. Try a punch, charged heavy, then E grab: compare energy absorption and guard break.',dodge:'This target dodges sideways. Time your approach after its dodge rather than expecting the strike to home.',defend:'Face the incoming fighter and hold Q. Funded frontal guard spends energy before health. Release and reposition between attacks.'};
 lesson.airborne='The target takes off and hovers. Fly up with F/Space, face it and tap V for an aerial approach; try E grab and an aimed throw. Grounded fighters need a reachable target: this drill does not grant flight.';
 lesson['air-defense']='Fly up to the trainer. Face its approach and hold Q to block; release and double-tap sideways between punches. Watch energy spent and recovery in the review. It waits for you to reach the air.';
 let text=lesson[kind];
 if(scheme==='touch')text=text.replaceAll('tap V','tap Punch').replaceAll('Tap V','Tap Punch').replaceAll('hold Q','hold Block').replaceAll('E grab','Grab').replaceAll('F/Space','Rise').replaceAll('double-tap sideways','use Evade sideways');
 if(scheme==='pad')text=text.replaceAll('tap V','tap Strike').replaceAll('Tap V','Tap Strike').replaceAll('hold Q','hold Guard').replaceAll('E grab','Grab').replaceAll('F/Space','Fly / Rise').replaceAll('double-tap sideways','use Evade sideways');
 if(kind==='defend'||kind==='air-defense'||kind==='guard')text+=' '+GUARD_LESSON;
 return approachLesson(def,scheme,['airborne','air-defense'].includes(kind))+' '+text+' '+meleeLesson(def,scheme);
}
export {meleeLessonScheme,grabLesson} from './combat-lesson-controls.js';
// Scripted decisions use native motion, defense and damage; no target teleporting.
export class MeleeTrial {
 constructor(g,origin){this.g=g;this.origin=origin.clone();this.records=[];this.index=-1;this.recording=new MeleeRecording();}
 prepareAerialDemo(kind='grab'){
  if(!['grab','stun'].includes(kind))throw Error('Choose grab or stun demonstration');
  const g=this.g,p=g.player;
  if(g.ms?.threatLab?.state!=='preparing'||!p?.alive||!(p.def.flightTier>0))throw Error('Choose a flying character in the Threat Room');
  if(p.grabbing||p.grabbedBy||p._carry||p._mount||p.mstate||!g.melee.canAct(p))throw Error('Finish the current action before preparing the demonstration');
  const v=this.start('stationary',ROSTER.find(d=>d.id==='kano'));
  p.pos.copy(this.origin).add(new THREE.Vector3(0,0,-12));p.pos.y=g.world.heightAt(p.pos.x,p.pos.z);p.vel.set(0,0,0);p.flying=false;p.flyHeld=false;p.faceDir(0,1);p.aim3.set(0,0,1);
  v.pos.y=g.world.heightAt(v.pos.x,v.pos.z)+(kind==='stun'?18:8);v.faceDir(0,1);v.toggleFlight();v.invuln=0;
  p.invuln=0;g.world._lookYaw=0;g.world._lookPitch=0;g.world._chaseSnap=true;
  this.recording.seconds=15;this.demo=kind==='stun'?new AerialStunDemo(this):new AerialGrabDemo(this);return this.demo;
 }
 startBag(difficulty='passive',hover=false){
  if(this.g.ms?.threatLab?.state!=='preparing')return false;
  if(!['passive','guard','sparring'].includes(difficulty))throw Error('Choose passive, guard or sparring');
  this.selectedThreat=null;
  const base=ROSTER.find(d=>d.id==='sol');
  const kind=hover?(difficulty==='sparring'?'air-defense':'airborne'):(difficulty==='guard'?'guard':difficulty==='sparring'?'defend':'stationary');
  const f=this.start(kind,{...base,id:'practice-bag',name:'TRAINING OPPONENT',hp:250,model:{...base.model,body:'faceted-v1'},colors:{...base.colors,primary:'#eeeeee',secondary:'#dddddd',accent:'#bbbbbb'},metal:false});
  this.bag={difficulty,hover,resetT:0};
  f._modularReady?.then(()=>{if(this.target!==f)return;for(const mesh of f._modularCharacter?.meshes||[]){if(mesh.name.toLowerCase().includes('expression'))continue;mesh.material.color.set('#eeeeee');mesh.material.map=null;mesh.material.needsUpdate=true;}});
  return f;
 }
 previewThreat(id,announce=true){
  if(this.g.ms?.threatLab?.state!=='preparing')return false;
  const def=ROSTER.find(d=>d.id===id);if(!def)throw Error('Unknown threat character');
  this.clear();this.selectedThreat=id;
  const f=this.previewActor=new Fighter(def,{rimK:.14});f.pos.copy(this.origin);f.pos.y=this.g.world.heightAt(f.pos.x,f.pos.z);f.obj.position.copy(f.pos);f.faceDir(0,-1);this.g.scene.add(f.obj);
  if(announce)this.g.hud?.feed?.(def.name+' · '+(def.archetype==='soldier'?'SOLDIER':'LSW')+' · '+def.threat+' · preview only; start a drill to fight','#ffd24a');return f;
 }
 clearPreview(){if(this.previewActor){this.previewActor.obj.removeFromParent();this.previewActor.dispose();this.previewActor=null;}}
 startSelected(){if(!this.selectedThreat)return false;return this.start(this.kind==='encounter'?'stationary':this.kind||'stationary');}
 startEncounter(){
  if(this.selectedAlly&&!ROSTER.some(d=>d.id===this.selectedAlly))return false;
  if(!this.selectedThreat||this.g.ms?.threatLab?.state!=='preparing'||!this.g.player.alive)return false;
  this.clear();this.attempt=null;this.phaseKey=null;this.kind='encounter';this.elapsed=0;
  const f=this.g.spawnEnemy(this.selectedThreat,{team:this.g.player.team===0?1:0,x:this.origin.x,z:this.origin.z,noRespawn:true});
  f.pos.y=this.g.world.heightAt(f.pos.x,f.pos.z);f._openSky=true;f._chaseKb=true;f.faceDir(0,-1);this.target=f;this.startHp=f.hp;
  if(this.selectedAlly){const a=this.ally=this.g.spawnEnemy(this.selectedAlly,{team:this.g.player.team,x:this.origin.x+24,z:this.origin.z-30,noRespawn:true});a.pos.y=this.g.world.heightAt(a.pos.x,a.pos.z);a._openSky=true;a._chaseKb=true;a._squadLeader=this.g.player;}
  this.recording.bind([this.g.player,f,...(this.ally?[this.ally]:[])]);
  this.g.hud?.feed?.('LIVE THREAT · '+f.def.name+' · Native powers and AI active. Reset practice to repeat.','#ffd24a');return f;
 }
 start(kind='stationary',trainingDefinition=null){
  if(!MELEE_TRIALS.includes(kind))throw Error('Unknown melee trial');
  const selected=ROSTER.find(d=>d.id===this.selectedThreat);if((kind==='airborne'||kind==='air-defense')&&selected&&!(selected.flightTier>0)){this.g.hud?.feed?.('Choose a flying target for an airborne drill. This character stays grounded.','#ffd24a');return false;}
  this.clear();this.attempt=null;this.phaseKey=null;this.kind=kind;this.index=MELEE_TRIALS.indexOf(kind);this.elapsed=0;this.dodgeAt=1;this.attackAt=1;this.releaseAt=null;
  const base=trainingDefinition||ROSTER.find(d=>d.id===this.selectedThreat)||ROSTER.find(d=>d.id===(kind==='airborne'||kind==='air-defense'?'sol':'merc'))||ROSTER[0];
  const f=this.g.addFighter({...base,name:base.name+' · '+kind,abilities:{},items:[],holo:true},{team:this.g.player.team===0?1:0,dummy:true,x:this.origin.x,z:this.origin.z});
  f.pos.y=this.g.world.heightAt(f.pos.x,f.pos.z);f._chaseKb=true;f._openSky=true;f.noRespawn=true;f._meleeTrial=this;this.target=f;this.startHp=f.hp;
  this.recording.bind([this.g.player,f]);
  this.g.hud?.feed?.(trialPrompt(kind,meleeLessonScheme(this.g)),'#ffd24a');return f;
 }
 startMachine(mode='still'){
  mode=mode===true?'moving':mode===false?'still':mode;
  if(!['still','moving','airborne'].includes(mode))throw Error('Unknown machine drill');
  if(this.g.ms?.threatLab?.state!=='preparing')return false;
  const machineDef={...ROSTER.find(d=>d.id==='merc'),name:'TRAINING MACHINE',metal:true,body:'metal',armor:0};const f=this.start('stationary',machineDef);
  f.armor=f.armorMax=0;this.machineMode=mode;f.def={...f.def,name:'TRAINING MACHINE',metal:true};f.pos.set(140,0,-85);this.machineTime=0;this.machineLastHit=null;
  if(mode==='airborne'){f.pos.y=2;f.vel.set(22,100,0);f.launchT=4;f.flying=false;}

  const machine=new THREE.Group();machine.name='training-machine';
  const plate=new THREE.Mesh(new THREE.BoxGeometry(7,11,3),new THREE.MeshStandardMaterial({color:0x526879,metalness:.6,roughness:.5}));plate.position.y=8;machine.add(plate);
  const bull=new THREE.Mesh(new THREE.TorusGeometry(2.2,.35,8,32),new THREE.MeshBasicMaterial({color:0xffd24a}));bull.position.set(0,9,1.6);machine.add(bull);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(3,4,2,12),new THREE.MeshStandardMaterial({color:0x283640}));base.position.y=1;machine.add(base);f.obj.add(machine);this.machine=machine;
  for(const child of f.obj.children)child.visible=child===machine;this.recording.bind([this.g.player,f]);
  this.g.hud?.feed?.('TARGET MACHINE · '+(mode==='airborne'?'AIRBORNE LAUNCH':mode==='moving'?'LEFT / RIGHT motion':'STATIONARY')+' · native damage and armor · E at range station toggles mode','#ffd24a');return f;
 }
 control(f,dt){
  if(this.demo&&(this.demo.active||this.demo.phase==='ready')&&f===this.target){this.demo.controlTarget(f,dt);return;}
  if(this.machine&&f===this.target){for(const child of f.obj.children)child.visible=child===this.machine;this.machineTime+=dt;this.elapsed+=dt;if(this.machineMode==='airborne')return;if(f.alive&&!f.grabbedBy&&f.launchT<=0){const dx=this.machineMode==='moving'?Math.cos(this.machineTime*.6):0;f.faceDir(0,1);f.move(new THREE.Vector3(dx,0,0),dt,.5);}return;}

  if(!f.alive||f.grabbedBy||f.frozenT>0||f.staggerT>0||f.stunT>0||f.launchT>0){f.flyHeld=false;f.descendHeld=false;return;}
  if(this.bag?.difficulty==='guard'&&this.bag.hover)this.g.melee.guard(f,true);
  this.elapsed+=dt;const dir=new THREE.Vector3().subVectors(this.g.player.pos,f.pos);dir.y=0;const d=dir.length();dir.normalize();f.faceDir(dir.x,dir.z);f.aim.copy(dir);f.aim3.copy(dir);
  this.g.melee.guard(f,this.kind==='guard'||this.bag?.difficulty==='guard');const move=new THREE.Vector3();
  if(this.kind==='airborne'||this.kind==='air-defense'){
   // Native held rise performs jump -> takeoff; native flight then owns hover.
   const altitude=f.pos.y-this.g.world.heightAt(f.pos.x,f.pos.z);
   const height=this.kind==='air-defense'?Math.max(24,Math.min(80,this.g.player.pos.y-this.g.world.heightAt(f.pos.x,f.pos.z))):24;
   f.flyHeld=altitude<height-1;f.descendHeld=altitude>height+3;
   f.aim3.subVectors(this.g.player.pos,f.pos).normalize();
  }
  if(this.bag&&this.bag.difficulty!=='sparring'&&f.pos.distanceTo(this.origin)>12){move.subVectors(this.origin,f.pos);move.y=0;move.normalize();}
  if(this.kind==='retreat'&&d<Math.max(40,meleeApproach(this.g.player.def,this.g.player.airborne).range+5)&&f.pos.distanceTo(this.origin)<65)move.copy(dir).negate();f.move(move,dt,1);
  if(this.kind==='dodge'&&this.elapsed>=this.dodgeAt){this.dodgeAt=this.elapsed+1.5;performEvade(f,{x:-dir.z,z:dir.x},this.g);}
  if(this.kind==='defend'||this.kind==='air-defense'){
   if(this.kind==='air-defense'&&(!f.flying||!this.g.player.airborne||Math.abs(f.pos.y-this.g.player.pos.y)>8))return;
   if(this.releaseAt!==null&&this.elapsed>=this.releaseAt){this.g.melee.chargeRelease(f);this.releaseAt=null;}
   else if(this.elapsed>=this.attackAt&&this.releaseAt===null&&!f.mstate&&f.strikeCd<=0){
    this.attackAt=this.elapsed+2;this.releaseAt=this.elapsed+.06;this.g.melee.chargeStart(f);
   }
   if(d>7&&!f.mstate)f.move(dir,dt,1);
  }
 }
 repeat(){if(this.machine)return this.startMachine(this.machineMode);return this.kind==='encounter'?this.startEncounter():this.start(this.kind||'stationary');}
 capture(){if(this.target&&!this.review){
  if(this.demo?.active&&!this.g.player?.alive)this.demo.stop('Demonstration stopped: player defeated');
  if(this.demo?.outcome==='complete')return;
  if(this.bag&&!this.target.alive){
   this.bag.resetT??=0;if(!this.bag.resetAt)this.bag.resetAt=this.g.time+3;
   if(this.g.time>=this.bag.resetAt){const {difficulty,hover}=this.bag,records=this.records.slice();this.startBag(difficulty,hover);this.records=records;this.g.hud?.feed?.('Training opponent reset · previous damage retained','#eeeeee');return;}
  }

  const f=this.g.player;this.phaseKey??=[];
  for(const [actor,fighter]of [f,this.target,...(this.ally?[this.ally]:[])].entries()){
   const state=meleePhase(fighter);if(state.phase!==this.phaseKey[actor]){this.phaseKey[actor]=state.phase;this.recording.mark(this.g.time,{label:`${actor===2?'Teammate':actor?'Target':'You'} · ${phaseLabel(state.phase)}`,kind:'phase',actor,...state});}
  }
  this.recording.capture(this.g.time);
  if(this.canRecoverKO()&&f.koT>=1&&typeof document!=='undefined')this.openReview();
 }}
 ownsPracticeActor(f){const seen=new Set();while(f&&!seen.has(f)){if(f===this.target||f===this.ally)return true;seen.add(f);f=f._dupeOf;}return false;}
 ownsThreat(f){const seen=new Set();while(f&&!seen.has(f)){if(f===this.target)return true;seen.add(f);f=f._dupeOf;}return false;}
 canRecoverKO(){const f=this.g.player;return this.g.ms?.threatLab?.state==='preparing'&&f?.state==='ko'&&this.ownsThreat(f.lastHitBy)&&this.g.entities.includes(f);}
 openReview(){
  if(this.review||this.g.ms?.threatLab?.state!=='preparing')return;
  if(this.recording.frames.length<2){this.g.hud?.feed?.('Start a melee trial, then return here to review the exchange','#ffd24a');return;}
  const recover=this.canRecoverKO();
  this.review=openMeleeReview(this.g,this.recording,()=>{this.review=null;if(recover)this.resetPractice();},{recover});
 }
 resetPractice(){
  const g=this.g,f=g.player;
  // Preparation-only refill. Keep the actual player object, loadout and stock:
  // replacing the actor here would invalidate the deployment manifest.
  const recover=this.canRecoverKO();
  if(g.ms?.threatLab?.state!=='preparing'||(!f?.alive&&!recover))return false;
  const props=g.ms.threatLab.practiceProps;
  if(props?.busy()){g.hud?.feed?.('Release the practice rock and let the throw finish before resetting','#ffd24a');return false;}
  if(f._mount||f._scoutVehicle||f._aircraftVehicle||f._passengerTransport||f._carry||f.hanging||f._grapple||Object.values(f.slots||{}).some(s=>s.active||s.charging||s.sustainT>0)){
   g.hud?.feed?.('Finish your power or leave the vehicle before resetting practice','#ffd24a');return false;
  }
  if((f.grabbing&&f.grabbing!==this.target)||(f.grabbedBy&&f.grabbedBy!==this.target))return false;
  this.attempt=null;
  if(recover){f._updateKO(4,g,{practice:true});f._remove=false;f._wasAlive=true;f.lastHitBy=null;f.lastHitT=99;f.pos.copy(this.origin).add(new THREE.Vector3(0,0,-14));f.pos.y=g.world.heightAt(f.pos.x,f.pos.z);f.groundY=f.pos.y;f.koT=0;f.faceDir(0,1);f.aim3.set(0,0,1);g.world._lookYaw=0;g.world._lookPitch=0;g.world._chaseSnap=true;}
  if(f.grabbing||f.grabbedBy)g.melee.release(f.grabbing?f:f.grabbedBy);
  g.melee._endStrike(f);g.melee.guard(f,false);
  f.clearDot();f.clotBleed(null,true);
  for(const key of ['hitstop','staggerT','stunT','frozenT','frost','guardBreakT','strikeCd','comboWin','strikeIdx','evadeCd','launchT','_thrownT','_slamCd','sleepT','blindT','shockT','downedT','_heavyT','drainedT'])f[key]=0;
  f.hp=f.maxHp;f.ki=f.maxKi;f.guardMeter=1;f.armor=f.armorMax;
  f._wounds={arm:0,leg:0,torso:0};f._woundT={arm:0,leg:0,torso:0};
  f.state='idle';f.stateT=0;f.vel.set(0,0,0);
  f._traversalLeap=null;
  if(f.parts.ice)f.parts.ice.visible=false;
  props?.reset();
  this.repeat();
  g.hud?.feed?.('PRACTICE RESET · Health, energy, armor and guard restored · target and practice rocks reset','#ffd24a');
  return true;
 }
 strikeStarted(f){
  if(f!==this.g.player||!this.target)return;
  const profile=meleeApproach(f.def,f.airborne),entry=meleeEntryEligibility(this.g,f,this.target,profile.range);
  this.attempt={entryReason:entry.reason,entryRange:profile.range,entryFamily:profile.family,trial:this.kind,kind:f.mId,time:Math.max(0,(this.g.time||0)-(this.startedAt||0)),contacts:0,approach:!!f._meleeMotion?.approachEnabled,distance:f.pos.distanceTo(this.target.pos),startup:f._meleeMotion?.startupDuration??STRIKES[f.mId].startup/(f.def.meleePace||1),active:STRIKES[f.mId].active/(f.def.meleePace||1),recovery:STRIKES[f.mId].recover/(f.def.meleePace||1)};
 }
 strikeEnded(f,{interrupted=false}={}){
  if(f!==this.g.player||!this.attempt)return;
  const a=this.attempt;
  // Native strikeHit owns the swing result. Concurrent projectiles, beams and
  // throws can hit during its lifetime without making this punch connect.
  a.contacts=f.strikeHit?.has(this.target?.id)?1:0;
  a.interrupted=!!interrupted;a.result=a.contacts?'contact':interrupted?'interrupted':'no contact';
  a.reason=a.contacts?(f._meleeBlocked?'BLOCKED':'TARGET CONTACT'):interrupted?'INTERRUPTED':!a.approach?a.entryReason:'FIST DID NOT CONNECT';
  this.records.push(a);if(this.records.length>100)this.records.shift();
  const hint=interrupted?'Wait for control to return, then approach again.':!a.contacts&&!a.approach?'Face the target and move into the shown approach range.':!a.contacts?'Re-aim after the target moves; an approach does not guarantee a hit.':'';
  this.recording.mark(this.g.time,{kind:'strike-result',actor:0,label:a.kind.toUpperCase()+' · '+a.reason,result:a.result,reason:a.reason});
  this.g.hud?.feed?.(a.reason+' · '+a.kind.toUpperCase()+' · start '+a.distance.toFixed(1)+'u · recovery '+Math.round(a.recovery*1000)+'ms'+(hint?' · '+hint:''),'#ffd24a');this.attempt=null;
 }
 grabContact(holder,victim){if(holder!==this.g.player||victim!==this.target)return;this.recording.mark(this.g.time,{label:'Grab connected',kind:'grab'});}
 hit(target,amount,opts,blocked,outcome=null){
  const incoming=target===this.g.player&&opts.src===this.target;
  if(!incoming&&target!==this.target&&target!==this.ally)return;
  const healthLost=outcome?.healthLost??amount,energySpent=outcome?.guardEnergySpent??0;
  const result=outcome?.guard==='broken'?'GUARD BROKEN':outcome?.guard==='blocked'?'BLOCK':blocked?'ABSORBED':opts.slam?'TERRAIN IMPACT':opts.meleeMove==='throw'?'THROW':'CONTACT';
  const guardBreakReason=outcome?.guardBreakReason??null;
  const reasonLabel={'heavy-crush':'HEAVY CRUSH','energy-exhausted':'ENERGY EMPTY','meter-depleted':'GUARD METER EMPTY'}[guardBreakReason];
  const label=(incoming?'YOU · ':target===this.ally?'TEAMMATE · ':'TARGET · ')+result+(reasonLabel?' · '+reasonLabel:'')+' · '+healthLost.toFixed(1)+' HP · '+energySpent.toFixed(1)+' guard energy';
  const record={trial:this.kind,time:Math.max(0,(this.g.time||0)-(this.startedAt||0)),amount,blocked:!!blocked,hp:target.hp,playerKi:this.g.player.ki,healthLost,guardEnergySpent:energySpent,guardBreakReason,result,incoming,actor:incoming?0:target===this.ally?2:1,move:opts.meleeMove||'hit'};
  if(this.machine)this.machineLastHit=record;this.g._threatRoom?.rangeDrill?.contact(target,opts.src,healthLost);
  if(this.machine&&healthLost>0)this.g.news?.highlight('bighit','TRAINING MACHINE · '+healthLost.toFixed(1)+' DAMAGE',{actor:opts.src,target,focus:target.pos,priority:1});
  this.records.push(record);if(this.records.length>100)this.records.shift();this.recording.mark(this.g.time,{...record,label,kind:'contact'});
  this.g.hud?.feed?.(label,'#ffd24a');
 }
 clear(){if(this.demo?.active)this.demo.stop();this.demo=null;this.bag=null;this.records.length=0;this.startedAt=this.g.time||0;this.machine=null;this.machineMode=null;this.clearPreview();this.review?.close();this.review=null;this.recording.clear();for(const f of [this.target,this.ally])if(f)retirePracticeActor(this.g,f);this.target=null;this.ally=null;}
 dispose(){this.clear();}
}

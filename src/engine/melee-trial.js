import * as THREE from 'three';
import {ROSTER} from '../data/characters.js';
import {performEvade} from './abilities.js';
export const MELEE_TRIALS=['stationary','retreat','guard','dodge'];
// Scripted decisions use native motion, defense and damage; no target teleporting.
export class MeleeTrial {
 constructor(g,origin){this.g=g;this.origin=origin.clone();this.records=[];this.index=-1;}
 start(kind='stationary'){
  if(!MELEE_TRIALS.includes(kind))throw Error('Unknown melee trial');
  this.clear();this.kind=kind;this.index=MELEE_TRIALS.indexOf(kind);this.elapsed=0;this.dodgeAt=1;
  const base=ROSTER.find(d=>d.id==='merc')||ROSTER[0];
  const f=this.g.addFighter({...base,name:'Trial '+kind,abilities:{},items:[],holo:true},{team:this.g.player.team===0?1:0,dummy:true,x:this.origin.x,z:this.origin.z});
  f.pos.y=this.g.world.heightAt(f.pos.x,f.pos.z);f._chaseKb=true;f._openSky=true;f.noRespawn=true;f._meleeTrial=this;this.target=f;this.startHp=f.hp;
  this.g.hud?.feed?.(kind.toUpperCase()+' · V punch / hold heavy · Q guard · E grab · double-tap direction dodge','#ffd24a');return f;
 }
 control(f,dt){
  if(!f.alive||f.grabbedBy||f.frozenT>0||f.staggerT>0)return;
  this.elapsed+=dt;const dir=new THREE.Vector3().subVectors(this.g.player.pos,f.pos);dir.y=0;const d=dir.length();dir.normalize();f.faceDir(dir.x,dir.z);f.aim.copy(dir);f.aim3.copy(dir);
  this.g.melee.guard(f,this.kind==='guard');const move=new THREE.Vector3();
  if(this.kind==='retreat'&&d<40&&f.pos.distanceTo(this.origin)<65)move.copy(dir).negate();f.move(move,dt,1);
  if(this.kind==='dodge'&&this.elapsed>=this.dodgeAt){this.dodgeAt=this.elapsed+1.5;performEvade(f,{x:-dir.z,z:dir.x},this.g);}
 }
 strikeStarted(f){
  if(f!==this.g.player||!this.target)return;
  this.attempt={trial:this.kind,kind:f.mId,time:this.elapsed,contacts:0,approach:!!f._meleeMotion?.approachEnabled,distance:f.pos.distanceTo(this.target.pos)};
 }
 strikeEnded(f){
  if(f!==this.g.player||!this.attempt)return;
  const a=this.attempt;a.result=a.contacts?'contact':'no contact';this.records.push(a);if(this.records.length>100)this.records.shift();
  this.g.hud?.feed?.(a.result.toUpperCase()+' · '+a.kind.toUpperCase()+' · '+(a.approach?'approach engaged':'no approach')+' · start '+a.distance.toFixed(1)+'u','#ffd24a');this.attempt=null;
 }
 hit(target,amount,opts,blocked){
  if(target!==this.target)return;
  if(this.attempt&&opts.src===this.g.player)this.attempt.contacts++;
  this.records.push({trial:this.kind,time:this.elapsed,amount,blocked:!!blocked,hp:target.hp,playerKi:this.g.player.ki});if(this.records.length>100)this.records.shift();
  this.g.hud?.feed?.((blocked?'BLOCK':'CONTACT')+' · HP lost '+Math.max(0,this.startHp-target.hp).toFixed(1)+' · energy now '+this.g.player.ki.toFixed(1),'#ffd24a');
 }
 clear(){const f=this.target;if(!f)return;if(f.grabbedBy)this.g.melee._breakFree(f.grabbedBy);if(this.g.hardLock===f)this.g.hardLock=null;f._meleeTrial=null;f.dispose();f.obj.removeFromParent();const i=this.g.entities.indexOf(f);if(i>=0)this.g.entities.splice(i,1);this.target=null;}
 dispose(){this.clear();}
}

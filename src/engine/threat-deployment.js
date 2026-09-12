import {ROSTER} from '../data/characters.js';
import {MeleeTrial,MELEE_TRIALS} from './melee-trial.js';
import * as THREE from 'three';
import {SquadTransport} from './squad-transport.js';
import {operationSound} from './operation-audio.js';
import {DeploymentStock} from './deployment-stock.js';
import {createDeploymentAnchor} from './deployment-anchor.js';
import {PracticeProps} from './practice-props.js';

// One preparation session owns its portal, interaction and finite manifest.
// Actors retain their normal movement/collision on the approach to the portal.
export class ThreatDeployment {
  constructor(game){this.g=game;this.state='loading';this.deployed=new Set();this.queue=[];this.group=null;this.handle=null;}
  clearPad(x,z,r=30,reserved=[]){
    const w=this.g.world;
    for(let ring=0;ring<12;ring++)for(let i=0;i<16;i++){
      const px=x+Math.cos(i*Math.PI/8)*ring*18,pz=z+Math.sin(i*Math.PI/8)*ring*18;
      if(reserved.some(p=>Math.hypot(px-p.x,pz-p.z)<r+p.r+8))continue;
      if(Math.abs(px)>w.ARENA-r||Math.abs(pz)>w.ARENA-r)continue;
      if(w.cover.some(c=>Math.abs(px-c.x)<(c.hx??c.r??0)+r&&Math.abs(pz-c.z)<(c.hz??c.r??0)+r))continue;
      const y=w.heightAt(px,pz),ys=[[r,0],[-r,0],[0,r],[0,-r]].map(([dx,dz])=>w.heightAt(px+dx,pz+dz));
      if(Number.isFinite(y)&&ys.every(v=>Math.abs(v-y)<1.5))return new THREE.Vector3(px,y,pz);
    }
    return null;
  }
  prepare(stage){
    const s=stage.researchLab.site;
    this.origin=this.clearPad(s.x,s.z+90);this.destination=this.clearPad(30,50);
    if(!this.origin||!this.destination){this.state='placement-error';this.g.hud?.announce?.('Threat Lab: no clear deployment pad');return;}
    const g=this.g;
    this.manifest=[g.player,...(g.ms.squad?.members||[])];
    const counts={soldier:0,lsw:0};for(const f of this.manifest)counts[f.def.archetype==='soldier'?'soldier':'lsw']++;
    // Initial bodies consume stock too. Replacement issuance is a separate action.
    this.stock=new DeploymentStock({soldier:counts.soldier+(counts.soldier?(g.ms.squad.soldierReserves??2):0),lsw:counts.lsw+(counts.lsw?(g.ms.squad.lswReserves??2):0)});
    this.manifest.forEach((f,i)=>{f.pos.copy(this.origin).add(new THREE.Vector3((i%3-1)*12,1,16+Math.floor(i/3)*12));f.vel.set(0,0,0);f.flying=false;});
    const dx=this.origin.x-g.player.pos.x,dz=this.origin.z-g.player.pos.z;
    g.world._lookYaw=Math.atan2(dx,dz);g.world._lookPitch=0;g.player.faceDir(dx,dz);
    this.group=new THREE.Group();this.group.name='threat-lab-deployment';g.scene.add(this.group);
    this.anchors={};
    const kinds=['soldier','lsw'].filter(kind=>counts[kind]);
    kinds.forEach((kind,i)=>{const anchor=createDeploymentAnchor(kind);anchor.position.copy(this.destination);if(kinds.length>1)anchor.position.x+=(i?1:-1)*16;this.group.add(anchor);this.anchors[kind]=anchor;});
    const portalMaterial=new THREE.MeshBasicMaterial({color:0xe9b83f,transparent:true,opacity:.35,side:THREE.DoubleSide,depthWrite:false});
    const ring=new THREE.Mesh(new THREE.TorusGeometry(10,.55,8,40),new THREE.MeshStandardMaterial({color:0xdfb54f,emissive:0x735014,roughness:.55}));
    ring.position.copy(this.origin).y+=11;this.group.add(ring);
    this.surface=new THREE.Mesh(new THREE.CircleGeometry(9.5,40),portalMaterial);this.surface.position.copy(ring.position);this.group.add(this.surface);
    const pad=new THREE.Mesh(new THREE.CylinderGeometry(28,28,.35,40),new THREE.MeshStandardMaterial({color:0x514b3b,roughness:1}));pad.position.copy(this.origin);pad.position.y+=.1;this.group.add(pad);
    // Same native rock owner as desert pickups: lift restrictions and throw damage apply.
    this.practiceProps=new PracticeProps(stage,this.origin);
    this.handle=g.registerInteractable({id:'threat-lab-ready',pos:this.origin.clone().add(new THREE.Vector3(0,5,8)),r:20,label:'SQUAD DEPLOYMENT',verb:'READY',priority:3,enabled:f=>f===g.player&&this.state==='preparing',onUse:()=>this.ready()});
    this.reserveHandle=g.registerInteractable({id:'deployment-reserves',pos:this.destination.clone().add(new THREE.Vector3(0,5,0)),r:22,label:'SQUAD RESERVES',verb:'REINFORCE',priority:3,enabled:f=>f===g.player&&this.state==='field',onUse:()=>this.requestReplacement()});
    this.state='preparing';g.hud?.announce?.('THREAT LAB · Test your gear, then READY at the portal');
    const trialPad=this.clearPad(this.origin.x+70,this.origin.z,18,[{x:this.origin.x,z:this.origin.z,r:28}]);
    if(trialPad){
      this.meleeTrial=new MeleeTrial(g,trialPad);
      this.threatPickIndex=-1;
      this.threatPickHandle=g.registerInteractable({id:'threat-pick-character',pos:trialPad.clone().add(new THREE.Vector3(-18,3,-15)),r:8,label:'PREVIEW ROSTER CHARACTER · NEXT',verb:'CHOOSE DRILL TARGET',priority:3,enabled:f=>f===g.player&&this.state==='preparing',onUse:()=>{this.threatPickIndex=(this.threatPickIndex+1)%ROSTER.length;this.meleeTrial.previewThreat(ROSTER[this.threatPickIndex].id);}});
      this.threatStartHandle=g.registerInteractable({id:'threat-start-selected',pos:trialPad.clone().add(new THREE.Vector3(18,3,-15)),r:8,label:'USE PREVIEW CHARACTER IN CURRENT DRILL',verb:'START SELECTED DRILL',priority:3,enabled:f=>f===g.player&&this.state==='preparing'&&!!this.meleeTrial.selectedThreat,onUse:()=>this.meleeTrial.startSelected()});
      for(const x of [-18,18]){const pad=new THREE.Mesh(new THREE.TorusGeometry(3,.25,6,24),new THREE.MeshBasicMaterial({color:0xffd24a}));pad.rotation.x=Math.PI/2;pad.position.copy(trialPad).add(new THREE.Vector3(x,.3,-15));this.group.add(pad);}
      this.trialReviewHandle=g.registerInteractable({id:'threat-melee-review',pos:trialPad.clone().add(new THREE.Vector3(-18,3,15)),r:8,label:'FRONT / SIDE / OVERHEAD · SLOW MOTION',verb:'REVIEW EXCHANGE',priority:3,enabled:f=>f===g.player&&this.state==='preparing',onUse:()=>this.meleeTrial.openReview()});
      const reviewMarker=new THREE.Mesh(new THREE.TorusGeometry(3,.25,6,24),new THREE.MeshBasicMaterial({color:0xe8e2d6}));reviewMarker.rotation.x=Math.PI/2;reviewMarker.position.copy(trialPad).add(new THREE.Vector3(-18,.3,15));this.group.add(reviewMarker);
      this.trialHandle=g.registerInteractable({id:'threat-melee-trial',pos:trialPad.clone().add(new THREE.Vector3(0,3,15)),r:12,label:'MELEE TRIAL · STATIONARY / RETREAT / GUARD / DODGE',verb:'NEXT TRIAL',priority:3,enabled:f=>f===g.player&&this.state==='preparing',onUse:()=>this.meleeTrial.start(MELEE_TRIALS[(this.meleeTrial.index+1)%MELEE_TRIALS.length])});
      this.trialRepeatHandle=g.registerInteractable({id:'threat-melee-repeat',pos:trialPad.clone().add(new THREE.Vector3(18,3,15)),r:8,label:'RESTORE FIGHTER AND MELEE TARGET',verb:'RESET PRACTICE',priority:3,enabled:f=>f===g.player&&this.state==='preparing',onUse:()=>this.meleeTrial.resetPractice()});
      const repeatMarker=new THREE.Mesh(new THREE.TorusGeometry(3,.25,6,24),new THREE.MeshBasicMaterial({color:0x7fe6ff}));repeatMarker.rotation.x=Math.PI/2;repeatMarker.position.copy(trialPad).add(new THREE.Vector3(18,.3,15));this.group.add(repeatMarker);
      const marker=new THREE.Mesh(new THREE.TorusGeometry(8,.2,6,40),new THREE.MeshBasicMaterial({color:0xe9b83f}));marker.rotation.x=Math.PI/2;marker.position.copy(trialPad);marker.position.y+=.3;this.group.add(marker);
    }
    const transportPad=this.clearPad(s.x-90,s.z+85,45,[{x:this.origin.x,z:this.origin.z,r:28}]);if(transportPad&&!stage.transport)stage.transport=new SquadTransport(stage,transportPad);
  }
  ready(){
    if(this.state!=='preparing')return;
    this.meleeTrial?.dispose();
    this.queue=this.manifest.filter(f=>f!==this.g.player&&f.alive);this.state='deploying';
    // Preserve the spaced staging formation. Marching every waiting actor to a
    // fixed single-file slot creates opposing traffic as the queue advances.
    this.queue.forEach(f=>{f._deploymentTarget=f.pos.clone();});
    this.surface.material.opacity=.7;
    operationSound(this.g,'op.portal.ready',this.origin);
    this.g.hud?.announce?.('SQUAD READY · Approach the portal to deploy');
  }
  transfer(f){
    if(this.deployed.has(f))return;
    const i=this.manifest.indexOf(f);
    if(i<0||!f.alive)return;
    if(!this.stock.commit(f,f.def.archetype==='soldier'?'soldier':'lsw')){this.g.hud?.feed?.('Deployment stock exhausted','#d5bd80');return;}
    f.pos.copy(this.destination).add(new THREE.Vector3((i%3-1)*12,1,Math.floor(i/3)*12));f.vel.set(0,0,0);f.flying=false;f._deploymentTarget=f===this.g.player?null:f.pos.clone();
    this.deployed.add(f);this.g.vfx.flash(f.pos.clone().setY(f.pos.y+5),f.def.colors.accent,10,.35);
    operationSound(this.g,'op.portal.cross',f.pos);
  }
  requestReplacement(){
    const g=this.g,members=g.ms.squad?.members||[];
    if(this.state!=='field'||!g.player.alive||g.matchOver)return false;
    const index=members.findIndex(f=>!f.alive);if(index<0){g.hud?.feed?.('Squad is at full strength','#d5bd80');return false;}
    const old=members[index],kind=old.def.archetype==='soldier'?'soldier':'lsw';
    if(!this.stock.remaining[kind]){g.hud?.feed?.('No '+kind.toUpperCase()+' reserves remaining','#d5bd80');return false;}
    const anchor=this.anchors?.[kind]?.position||this.destination;
    const at=this.clearPad(anchor.x,anchor.z,8);
    if(!at||g.entities.some(f=>f.alive&&Math.hypot(f.pos.x-at.x,f.pos.z-at.z)<(f.radius||3)+4)){g.hud?.feed?.('Deployment point blocked — stock retained','#d5bd80');return false;}
    const replacement=g.spawnEnemy(old.def.id,{team:g.player.team,x:at.x,z:at.z,aiLevel:1.15,noRespawn:true});
    replacement.pos.copy(at);replacement.vel.set(0,0,0);replacement.flying=false;replacement._squadLeader=g.player;
    this.stock.commit(replacement,kind);members[index]=replacement;
    const slot=this.manifest.indexOf(old);if(slot>=0)this.manifest[slot]=replacement;
    this.deployed.delete(old);this.deployed.add(replacement);
    g.hud?.feed?.(old.def.id.toUpperCase()+' redeployed · '+this.stock.remaining[kind]+' '+kind.toUpperCase()+' reserves left','#d5bd80');
    return true;
  }
  update(){
    if(this.threatPickHandle&&this.meleeTrial?.selectedThreat)this.threatPickHandle.label='PREVIEW · '+ROSTER.find(d=>d.id===this.meleeTrial.selectedThreat)?.name+' · NEXT CHARACTER';
    if(this.trialHandle&&this.meleeTrial)this.trialHandle.label='MELEE TRIAL · '+(this.meleeTrial.kind||'stationary').toUpperCase()+' · NEXT';
    if(this.trialRepeatHandle&&this.meleeTrial)this.trialRepeatHandle.label='RESTORE FIGHTER + '+(this.meleeTrial.kind||'stationary').toUpperCase()+' TARGET';
    if(this.reserveHandle&&this.stock){const r=this.stock.remaining;this.reserveHandle.label=`RESERVES · SOLDIER ${r.soldier} · LSW ${r.lsw}`;}
    if(this.state==='loading'){
      const stage=this.g.pwStage;
      if(stage?.frontlineReady&&stage.researchLab&&!stage.outpostError)this.prepare(stage);
      return;
    }
    if(this.state!=='deploying')return;
    this.queue=this.queue.filter(f=>f.alive&&!this.deployed.has(f));
    const next=this.queue[0];
    if(next){next._deploymentTarget=this.origin;if(Math.hypot(next.pos.x-this.origin.x,next.pos.z-this.origin.z)<5&&Math.abs(next.pos.y-this.origin.y)<12)this.transfer(next);}
    const player=this.g.player;
    if(player.alive&&!this.deployed.has(player)&&Math.hypot(player.pos.x-this.origin.x,player.pos.z-this.origin.z)<5&&Math.abs(player.pos.y-this.origin.y)<12)this.transfer(player);
    if(this.deployed.has(player)&&this.queue.every(f=>this.deployed.has(f))){this.state='field';this.queue=[];if(this.manifest.length>1&&this.manifest.every(f=>f.alive&&this.deployed.has(f)))operationSound(this.g,'op.squad.ready');for(const f of this.manifest)f._deploymentTarget=null;this.g.hud?.announce?.('SQUAD DEPLOYED');}
  }
  dispose(){
    this.practiceProps?.dispose();
    if(this.threatPickHandle)this.g.unregisterInteractable(this.threatPickHandle);if(this.threatStartHandle)this.g.unregisterInteractable(this.threatStartHandle);
    if(this.trialReviewHandle)this.g.unregisterInteractable(this.trialReviewHandle);
    this.meleeTrial?.dispose();if(this.trialRepeatHandle)this.g.unregisterInteractable(this.trialRepeatHandle);if(this.trialHandle)this.g.unregisterInteractable(this.trialHandle);
    for(const f of this.manifest||[])f._deploymentTarget=null;
    if(this.handle)this.g.unregisterInteractable(this.handle);
    if(this.reserveHandle)this.g.unregisterInteractable(this.reserveHandle);
    this.group?.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});this.group?.removeFromParent();this.state='disposed';
  }
}

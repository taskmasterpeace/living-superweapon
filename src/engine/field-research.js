import * as THREE from 'three';
// Operation-local recovery. No training harvest, persistent unlock or reserve minting.
export class FieldResearch{
 constructor(g){this.g=g;this.samples=[];this.seen=new WeakSet();this.ranks=0;this.applied=new Map();this.carried=null;this.events=[];this.handles=[];this.group=new THREE.Group();g.scene.add(this.group);}
 active(){return this.g.ms.threatLab?.state==='field'&&!this.g.matchOver&&!this.g._threatRoom?.active;}
 inReach(pos,r){const f=this.g.player;return f.pos.distanceTo(pos)<=r&&this.g.canSee(f,{pos});}
 event(kind,data={}){this.events.push({kind,time:this.g.time,...data});if(this.events.length>100)this.events.shift();}
 interact(options){const h=this.g.registerInteractable(options);this.handles.push(h);return h;}
 onKO(v,k){
  if(v===this.g.player&&this.carried){this.event('sample-lost');this.carried=null;}
  if(!this.active()||v.alive||!k||k.team!==this.g.player.team||v.team===k.team||v.isDummy||v.def.metal||v.def.id==='operation-scientist'||this.seen.has(v)||this.ranks>=3)return;
  this.seen.add(v);if(this.samples.length>=8)this.remove(this.samples[0]);
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,2.4,8),new THREE.MeshStandardMaterial({color:0xb72d36,emissive:0x451016}));mesh.position.copy(v.pos);mesh.position.y=this.g.world.heightAt(v.pos.x,v.pos.z)+1.2;this.group.add(mesh);
  const s={name:v.def.name,left:90,mesh};this.samples.push(s);
  s.handle=this.interact({id:'blood-sample-'+this.g.time+'-'+this.samples.length,pos:mesh.position,r:9,label:'RECOVER SAMPLE · '+s.name,verb:'COLLECT',priority:3,
   enabled:f=>f===this.g.player&&f.alive&&this.active()&&!this.carried&&this.samples.includes(s)&&this.g.canSee(f,{pos:mesh.position}),onUse:()=>this.collect(s)});
  this.event('sample-dropped',{name:s.name});this.g.hud?.feed?.('SAMPLE AVAILABLE · E to recover before it degrades','#ffd24a');
 }
 remove(s){const i=this.samples.indexOf(s);if(i<0)return;this.samples.splice(i,1);this.g.unregisterInteractable(s.handle);this.handles=this.handles.filter(h=>h!==s.handle);s.mesh.removeFromParent();s.mesh.geometry.dispose();s.mesh.material.dispose();}
 collect(s){if(!this.active()||!this.g.player.alive||this.carried||!this.samples.includes(s)||s.left<=0||!this.inReach(s.mesh.position,9))return false;this.carried={name:s.name,left:s.left};this.remove(s);this.event('sample-collected',{name:s.name});this.g.hud?.feed?.('SAMPLE RECOVERED · Return to the research lab before degradation','#ffd24a');return true;}
 deliver(){if(!this.active()||!this.g.player.alive||!this.carried||this.carried.left<=0||this.ranks>=3||!this.terminal||!this.inReach(this.terminal.pos,8))return false;const name=this.carried.name;this.carried=null;this.ranks++;this.apply();this.event('research-upgrade',{name,rank:this.ranks});this.g.hud?.announce?.('RESEARCH UPGRADE',`Energy capacity +10 · ${this.ranks}/3 · this operation`);return true;}
 apply(){const f=this.g.player;if(!f)return;const previous=this.applied.get(f)||0,bonus=this.ranks*10;if(previous===bonus)return;f.maxKi+=bonus-previous;this.applied.set(f,bonus);}
 update(dt){
  if(!this.active())return;this.apply();
  const lab=this.g.pwStage?.researchLab?.site;
  if(lab&&!this.terminal){
   const mesh=new THREE.Mesh(new THREE.BoxGeometry(4,3,3),new THREE.MeshStandardMaterial({color:0x354651,emissive:0x17251e}));mesh.position.set(lab.x-8,lab.y+1.5,lab.z+5);this.group.add(mesh);this.terminalMesh=mesh;
   this.terminal=this.interact({id:'field-research-terminal',pos:mesh.position,r:8,label:'RESEARCH LAB · Bring a recovered sample',verb:'ANALYZE',priority:3,enabled:f=>f===this.g.player&&f.alive&&this.active()&&this.g.canSee(f,{pos:mesh.position}),onUse:()=>{if(!this.deliver())this.g.hud?.feed?.(this.ranks>=3?'RESEARCH COMPLETE · +30 energy capacity this operation':'Bring a fresh enemy sample to upgrade energy capacity','#ffd24a');}});
  }
  for(const s of [...this.samples]){s.left-=dt;s.handle.label=`RECOVER ${s.name} SAMPLE · ${Math.ceil(Math.max(0,s.left))}s remaining`;if(s.left<=0)this.remove(s);}
  if(this.carried){this.carried.left-=dt;if(this.carried.left<=0){this.carried=null;this.event('sample-expired');this.g.hud?.feed?.('SAMPLE DEGRADED · Recover another enemy sample','#ffd24a');}}
  if(this.terminal)this.terminal.label=this.carried?`ANALYZE ${this.carried.name} · ${Math.ceil(this.carried.left)}s · +10 ENERGY CAPACITY`:`RESEARCH LAB · ${this.ranks}/3 upgrades · recover a sample`;
 }
 dispose(){for(const s of [...this.samples])this.remove(s);for(const h of this.handles)this.g.unregisterInteractable(h);for(const [f,bonus]of this.applied){f.maxKi-=bonus;f.ki=Math.min(f.ki,f.maxKi);}this.applied.clear();this.terminalMesh?.geometry.dispose();this.terminalMesh?.material.dispose();this.group.removeFromParent();this.carried=null;this.handles=[];}
}

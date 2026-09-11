import * as THREE from 'three';
import {RainField} from './rain-field.js';
import {WeatherLightning,weatherSurface} from './weather-lightning.js';

export const MAX_STORM_LAYERS=4;
const bounded=(n,fallback,min,max)=>Math.max(min,Math.min(max,Number.isFinite(n)?n:fallback));
const finitePoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z);

// A single owned domain, hosted by Weather. It never writes the map's weather,
// camera, named state, sky uniforms, or another owner's audio/light leases.
export class StormLayer {
 static accepts(src){return !!src&&src.alive!==false&&!src._formDisposed&&!src.noPowers&&finitePoint(src.pos);}
 constructor(game,options){
  const {src,center,slot=null}=options;this.g=game;this.owner=src;this.slot=slot;
  this.formKey=src._formKey;this.slotDef=slot?.def;this.ownerDef=src.def;
  this.radius=bounded(options.radius,65,12,120);this.range=bounded(options.range,100,0,180);
  this.center=new THREE.Vector3().copy(src.pos);
  if(finitePoint(center)){
   const dx=center.x-src.pos.x,dz=center.z-src.pos.z,d=Math.hypot(dx,dz),scale=d>0?Math.min(1,this.range/d):0;
   this.center.x+=dx*scale;this.center.z+=dz*scale;
  }
  this.center.y=weatherSurface(game.world,this.center.x,this.center.z);
  this.duration=bounded(options.dur,12,1.1,60);this.kiPerSec=bounded(options.kiPerSec,0,0,30);
  this.rain=bounded(options.rain,0,0,1);this.cloud=bounded(options.cloud,.8,0,1);this.wind=bounded(options.wind,0,0,1.6);this.storm=bounded(options.storm,0,0,1);
  this.windDir=Math.atan2(src.aim?.z??0,src.aim?.x??1);
  this.age=0;this.fade=1;this.state='building';this.disposed=false;this.boltT=0;
  this.group=new THREE.Group();this.group.name='weather-domain';this.group.position.copy(this.center);game.scene.add(this.group);
  const geometry=new THREE.SphereGeometry(1,12,8),material=new THREE.MeshBasicMaterial({color:'#586a79',transparent:true,opacity:0,depthWrite:false});
  this.cloudMesh=new THREE.InstancedMesh(geometry,material,9);this.cloudMesh.frustumCulled=false;this.group.add(this.cloudMesh);
  const transform=new THREE.Object3D();
  for(let i=0;i<9;i++){
   const angle=i*Math.PI*2/9,r=i===0?0:this.radius*.52;
   transform.position.set(Math.cos(angle)*r,90+Math.sin(i*2)*5,Math.sin(angle)*r);
   transform.scale.set(this.radius*.4,9,this.radius*.4);transform.updateMatrix();this.cloudMesh.setMatrixAt(i,transform.matrix);
  }
 }
 interrupted(){
  const s=this.owner;
  return !StormLayer.accepts(s)||s.def!==this.ownerDef||s._formKey!==this.formKey||s.staggerT>0||s.stunT>0||s.frozenT>0||s.sleepT>0||s.downedT>0||s.grabbedBy||
   this.slot&&(this.slot.def!==this.slotDef||!Object.values(s.slots||{}).includes(this.slot));
 }
 weightAt(pos){
  if(this.disposed||!pos)return 0;
  const d=Math.hypot(pos.x-this.center.x,pos.z-this.center.z)/this.radius;
  return Math.max(0,Math.min(1,(1-d)*4))*Math.min(1,this.age)*this.fade;
 }
 addWind(pos,out){const n=this.weightAt(pos)*this.wind*42;out.x+=Math.cos(this.windDir)*n;out.z+=Math.sin(this.windDir)*n;return out;}
 end(){
  this.state='dissipating';this.fadeAge=0;this.lightning?.cancel();this.thunder=null;
  this.thunderVoice?.stop();this.thunderVoice=null;
 }
 update(dt){
  if(this.interrupted()){this.dispose();return;}
  if(this.state!=='dissipating'){
   const activeDt=Math.min(dt,Math.max(0,this.duration-this.age)),cost=this.kiPerSec*activeDt;
   if(cost>0&&!this.owner.energyInfinite){
    const available=Math.max(0,this.owner.ki||0);
    if(available<=cost){this.owner.ki=0;this.g.onDrained?.(this.owner);this.dispose();return;}
    if(this.owner.spendKi)this.owner.spendKi(cost);else this.owner.ki-=cost;
   }
   this.age+=dt;
   if(this.age>=this.duration-1e-8)this.end();
   else if(this.age>=1)this.state='active';
  }else{
   this.fadeAge+=dt;this.fade=Math.max(0,1-this.fadeAge/.8);
   if(this.fade<=0){this.dispose();return;}
  }
  this.cloudMesh.material.opacity=this.cloud*.6*Math.min(1,this.age)*this.fade;
  if(this.age>=1&&this.rain>.02)this.updateRain(dt);
  let started=false;
  if(this.state==='active'&&this.storm>.6&&this.cloud>.6){
   this.boltT-=dt;
   if(this.boltT<=0){
    this.boltT=4+Math.random()*4;
    const angle=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*(this.radius-10);
    const pos=new THREE.Vector3(this.center.x+Math.cos(angle)*r,0,this.center.z+Math.sin(angle)*r);
    pos.y=weatherSurface(this.g.world,pos.x,pos.z);
    this.lightning ||= new WeatherLightning(this.g);
    this.lightning.start(pos,{warning:true,reduced:globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true});
    started=true;
   }
  }
  if(this.state==='active'&&this.lightning?.update(started?0:dt)){
   const pos=this.lightning.position.clone(),listener=this.g.world.camera?.position||pos;
   this.thunder={pos,delay:.18+Math.min(1.8,pos.distanceTo(listener)/220)};
   this.strike(pos);
  }
  if(this.thunder){
   this.thunder.delay-=dt;
   if(this.thunder.delay<=0){this.thunderVoice?.stop();this.thunderVoice=this.g.audio?.soundLibrary?.play('weather-domain-thunder',{pos:this.thunder.pos});this.thunder=null;}
  }
 }
 strike(pos){
  // Direct receivers retain native guard/resistance/KO accounting. A roof blocks
  // the overhead strike even if a short roof lies inside its radial hit volume.
  for(const f of this.g.entities||[]){
   if(!f.alive||!this.g.isFoe?.(this.owner,f)||this.weightAt(f.pos)<=0)continue;
   const y=f.pos.y+5,d=Math.hypot(f.pos.x-pos.x,y-pos.y,f.pos.z-pos.z);
   if(d>9+(f.radius||0)||weatherSurface(this.g.world,f.pos.x,f.pos.z)>y)continue;
   const fall=1-Math.min(1,d/(9+(f.radius||0)))*.6;
   f.takeDamage(26*fall*(this.owner.powerBuff||1),{src:this.owner,dtype:'energy',hitstop:.05});
  }
 }
 updateRain(dt){
  if(!this.rainField){
   // Reuse the native surface-aware rain solver with a fixed local viewpoint.
   const world=this.g.world,anchor=this.center.clone();anchor.y+=45;
   this.rainField=new RainField({camera:{position:anchor},heightAt:(x,z)=>world.heightAt?.(x,z),get cover(){return world.cover;},get interiors(){return world.interiors;}});
   this.g.scene.add(this.rainField.mesh);this.rainField.mesh.name='weather-domain-rain';
  }
  this.rainField.update(dt,this.rain*this.fade,this.wind*this.fade,this.windDir);
  const attr=this.rainField.mesh.geometry.attributes.position,a=attr.array;
  // Native rain has a square camera volume; clip both endpoints to this domain.
  for(let i=0;i<a.length;i+=6){
   const dx=a[i]-this.center.x,dz=a[i+2]-this.center.z,tx=a[i+3]-this.center.x,tz=a[i+5]-this.center.z;
   if(Math.hypot(dx,dz)>this.radius||Math.hypot(tx,tz)>this.radius){
    const angle=Math.atan2(dz,dx),r=Math.random()*this.radius;
    a[i]=a[i+3]=this.center.x+Math.cos(angle)*r;a[i+2]=a[i+5]=this.center.z+Math.sin(angle)*r;
    a[i+1]=a[i+4]=weatherSurface(this.g.world,a[i],a[i+2])+1;
   }
  }
  this.rainField.mesh.material.opacity*=this.fade;
  const library=this.g.audio?.soundLibrary;
  if(this.rainVoice&&library?.active&&!library.active.has(this.rainVoice))this.rainVoice=null;
  this.rainVoice ||= library?.play('weather-domain-rain',{pos:this.center,gain:.45});
  const listener=this.g.world.camera?.position||this.center;
  const shelter=weatherSurface(this.g.world,listener.x,listener.z)>listener.y ? .18 : 1;
  this.rainVoice?.set(this.rain*this.weightAt(listener)*shelter);
 }
 dispose(){
  if(this.disposed)return;this.disposed=true;this.fade=0;
  this.lightning?.dispose();this.thunder=null;this.thunderVoice?.stop();this.rainVoice?.stop();
  // InstancedMesh attributes have their own renderer disposal event; disposing
  // geometry alone does not release instance matrices on refreshed domains.
  this.lightning?.core.dispose();this.lightning?.glow.dispose();this.cloudMesh.dispose();
  this.rainField?.dispose();this.group.removeFromParent();this.cloudMesh.geometry.dispose();this.cloudMesh.material.dispose();
 }
}

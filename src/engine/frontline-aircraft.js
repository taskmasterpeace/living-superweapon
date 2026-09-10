import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {FrontlineContrails} from './frontline-contrails.js';
import {AircraftCombat} from './aircraft-combat.js';
import {AircraftPiloting} from './aircraft-piloting.js';
import {OUTPOST_AIRCRAFT_PARKS} from './frontline-outpost-layout.js';

export const AIRCRAFT_ASSETS=Object.freeze({helicopter:'./models/frontline/attack-helicopter.glb',jet:'./models/frontline/patrol-jet.glb'});

// Distinct support flight envelopes. The Front Line helicopter gains a native
// damageable gun station; the jet remains explicitly unarmed presentation.
export function sampleAircraft(kind,time,origin={x:0,z:0},out={}){
 const jet=kind==='jet',angle=time*(jet?.20:.056)+(jet?.23:1.8),rx=jet?1800:300,rz=jet?2200:200;
 const dx=-rx*Math.sin(angle),dz=rz*Math.cos(angle);
 // The inner oval passes through the open valley, not the new 245–325u cliffs.
 // At native 5u/m the close pass reads larger without enlarging the aircraft.
 out.x=origin.x+(jet?0:-20)+Math.cos(angle)*rx;out.z=origin.z+(jet?0:60)+Math.sin(angle)*rz;
 const a=((angle%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
 // Rise gently over the western 175u shoulder, then settle for the close pass.
 // Smooth ramps keep the path continuous at both joins and the orbit wrap.
 const lift=12*THREE.MathUtils.smoothstep(a,2.4,2.7)*(1-THREE.MathUtils.smoothstep(a,4.4,4.7));
 out.y=jet?440+20*Math.sin(time*.15):195+3*Math.sin(time*.25)+lift;
 out.yaw=Math.atan2(dx,dz);out.pitch=jet?-.025:.04;out.roll=jet?.32:.09;
 return out;
}

export function disposeAircraftAsset(root){
 const geometries=new Set(),materials=new Set(),textures=new Set();
 root.traverse(object=>{
  if(object.geometry)geometries.add(object.geometry);
  for(const material of Array.isArray(object.material)?object.material:object.material?[object.material]:[]){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);}
 });
 for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();for(const texture of textures)texture.dispose();
}

export class FrontlineAircraft {
 constructor(game,{loader=new GLTFLoader()}={}){
  this.game=game;this.time=0;this._lastGameTime=game.time||0;this.disposed=false;this.ready=false;this.error=null;
  this.origin={x:-40,z:-40};this.actors=[];this.departure=null;
  this.piloting=new AircraftPiloting(this);
  this.group=new THREE.Group();this.group.name='frontline-air-support';this.group.userData.nonTargetable=true;
  game.scene.add(this.group);
  const requests=Object.entries(AIRCRAFT_ASSETS).map(([kind,url])=>({kind,url,pilotable:false}));
  if(game.world?.heightAt)for(const [kind,url]of Object.entries(AIRCRAFT_ASSETS))requests.push({kind,url,pilotable:true});
  this.loading=Promise.all(requests.map(async({kind,url,pilotable})=>{
   const asset=await loader.loadAsync(url);
   if(this.disposed){disposeAircraftAsset(asset.scene);return;}
   const model=asset.scene;model.updateMatrixWorld(true);
   const center=new THREE.Box3().setFromObject(model,true).getCenter(new THREE.Vector3());
   // Source coordinates are metres; our native ~10u human is approximately 1.8m.
   const units=5;model.scale.multiplyScalar(units);model.position.sub(center.multiplyScalar(units));
   const wrapper=new THREE.Group();wrapper.name=`frontline-${kind}`;wrapper.rotation.order='YXZ';wrapper.add(model);
   wrapper.userData.nonTargetable=true;model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
   this.group.add(wrapper);
   const mixer=asset.animations.length?new THREE.AnimationMixer(model):null;
   // The original gunship clip carries 180 rpm at 1x; 1.5x yields 270 rpm.
   // Keep asset-specific playback instead of quadrupling every imported clip.
   if(mixer){mixer.clipAction(asset.animations[0]).play();mixer.timeScale=kind==='helicopter'?1.5:4;}
   const bounds=new THREE.Box3().setFromObject(wrapper,true),size=bounds.getSize(new THREE.Vector3());
   const actor={kind,wrapper,model,mixer,frame:{},sound:null,pilotable,parked:pilotable,groundOffset:Math.max(1,-bounds.min.y),bodyRadius:Math.max(10,Math.hypot(size.x,size.z)*.5),velocity:new THREE.Vector3(),yaw:0,speed:0};
   if(pilotable){
    const spot=this._parkingSpot(kind,actor.bodyRadius);
    if(!spot){disposeAircraftAsset(model);wrapper.removeFromParent();return;}
    actor.ground=spot.y;actor.yaw=spot.yaw;wrapper.rotation.y=spot.yaw;wrapper.position.set(spot.x,spot.y+actor.groundOffset,spot.z);wrapper.userData.pilotable=true;wrapper.name=`frontline-parked-${kind}`;
   }else this._pose(actor);
   this.actors.push(actor);
   if(kind==='jet'&&!pilotable)this.contrails=new FrontlineContrails(this.group,(time,out)=>sampleAircraft('jet',time,this.origin,out));
  })).then(()=>{if(!this.disposed)this.ready=true;}).catch(error=>{
   if(!this.disposed){this.error=error.message;console.error('Frontline aircraft assets',error);}
  });
 }
 _parkingSpot(kind,r){
  const w=this.game.world,{x:cx,z:cz}=OUTPOST_AIRCRAFT_PARKS[kind];
  const encounter=this.game.ms?.frontline;
  const clearArea=(x,z,padding=0)=>{
   if((w.cover||[]).some(c=>c.hp!==0&&Math.abs(x-c.x)<r+padding+(c.hx??c.r??0)&&Math.abs(z-c.z)<r+padding+(c.hz??c.r??0)))return false;
   if(this.actors.some(a=>a.pilotable&&Math.hypot(a.wrapper.position.x-x,a.wrapper.position.z-z)<r+a.bodyRadius+10))return false;
   if((this.game.entities||[]).some(f=>f.alive&&Math.hypot(f.pos.x-x,f.pos.z-z)<r+16))return false;
   if([encounter?.casePosition,encounter?.extractionPosition].some(p=>p&&Math.hypot(p.x-x,p.z-z)<r+32))return false;
   return true;
  };
  // Find a real, gently graded landing footprint; never drop a parked craft on
  // a talus pile, a cover volume, water, or another vehicle's parking position.
  for(let ring=0;ring<8;ring++)for(const [dx,dz]of ring?[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1]]:[[0,0]]){
   const x=cx+dx*ring*36,z=cz+dz*ring*36,heights=[];let clear=true;
   for(const [sx,sz]of [[0,0],[-1,-1],[1,-1],[-1,1],[1,1]]){const px=x+sx*r,pz=z+sz*r,h=w.heightAt(px,pz);if(!Number.isFinite(h)||w.waterAt?.(px,pz)){clear=false;break;}heights.push(h);}
   if(!clear||Math.max(...heights)-Math.min(...heights)>3)continue;
   if(!clearArea(x,z))continue;
   let yaw=0;
   if(kind==='jet'){
    const direction=[0,Math.PI].find(angle=>{
     for(let d=30;d<=210;d+=30){const px=x+Math.sin(angle)*d,pz=z+Math.cos(angle)*d,h=w.heightAt(px,pz);if(!clearArea(px,pz)||!Number.isFinite(h)||Math.abs(h-heights[0])>3||w.waterAt?.(px,pz))return false;}return true;
    });if(direction===undefined)continue;yaw=direction;
   }
   return {x,y:Math.max(...heights),z,yaw};
  }return null;
 }
 _pose(actor){
  const f=sampleAircraft(actor.kind,this.time,this.origin,actor.frame);
  if(actor.kind==='helicopter'&&this.departure){
   const t=Math.max(0,this.time-this.departure.time);
   // Stay on the verified valley oval while climbing: the additive lift begins
   // with zero velocity, preserving the patrol's position and velocity exactly.
   f.y+=200*THREE.MathUtils.smoothstep(t,0,14);
   if(t>14){
    const exit=this.departure.exit??=sampleAircraft('helicopter',this.departure.time+14,this.origin);
    const elapsed=t-14,u=Math.min(1,elapsed/4),blend=u*u*u*(u*(u*6-15)+10),blendRate=30*u*u*(u-1)*(u-1)/4;
    const exitAngle=(this.departure.time+14)*.056+1.8,angle=this.time*.056+1.8;
    const speed=.056*Math.hypot(300*Math.sin(exitAngle),200*Math.cos(exitAngle));
    // Match the oval's tangent speed, then accelerate smoothly toward 65u/s.
    const decay=Math.exp(-elapsed/2),distance=speed*elapsed+(65-speed)*(elapsed-2+2*decay),velocity=speed+(65-speed)*(1-decay);
    const sx=Math.sin(exit.yaw),sz=Math.cos(exit.yaw),x=exit.x+sx*distance,z=exit.z+sz*distance;
    const vx=(1-blend)*(-300*.056*Math.sin(angle))+blend*sx*velocity+blendRate*(x-f.x);
    const vz=(1-blend)*(200*.056*Math.cos(angle))+blend*sz*velocity+blendRate*(z-f.z);
    // At clearance altitude, ease from the continuing oval into its exit tangent.
    // Quintic blending keeps position/velocity and heading continuous at joins.
    f.x=THREE.MathUtils.lerp(f.x,x,blend);f.z=THREE.MathUtils.lerp(f.z,z,blend);
    f.y=THREE.MathUtils.lerp(f.y,exit.y+200,blend);f.yaw=Math.atan2(vx,vz);
    f.pitch=THREE.MathUtils.lerp(f.pitch,-.08,blend);f.roll=THREE.MathUtils.lerp(f.roll,0,blend);
   }
  }
  actor.wrapper.position.set(f.x,f.y,f.z);actor.wrapper.rotation.set(f.pitch,f.yaw,f.roll);
 }
 update(dt=Math.max(0,(this.game.time||0)-this._lastGameTime)){
  this._lastGameTime=this.game.time||0;
  if(this.disposed||this.game.paused||this.game.running===false||!Number.isFinite(dt)||dt<=0)return;
  dt=Math.min(dt,.1);this.time+=dt;
  if(!this.departure&&this.game.ms?.frontline?.phase==='complete'){
   const f=sampleAircraft('helicopter',this.time,this.origin);
   this.departure={time:this.time,x:f.x,y:f.y,z:f.z,yaw:f.yaw};
  }
  const library=this.game.audio?.soundLibrary;
  this.piloting.update(dt);
  for(const actor of this.actors){
   if(actor.combat?.dead)continue;
   if(!actor.pilotable)this._pose(actor);actor.mixer?.update(dt);
   if((actor.pilotable||(actor.kind==='helicopter'&&this.game.ms?.frontline&&!this.departure))&&this.game.world?.cover&&this.game.projectiles&&!actor.combat)actor.combat=new AircraftCombat(this.game,actor);
   actor.combat?.update(dt,!actor.pilotable&&!this.departure);
   if(library){
    if(!actor.sound||!library.active.has(actor.sound))actor.sound=library.play(actor.kind==='helicopter'?'rotor':'jet',{pos:actor.wrapper.position,gain:actor.kind==='helicopter'?.18:.10,loop:true});
    actor.sound?.set(actor.pilotable&&!actor.occupant?.alive ? .18:1,actor.wrapper.position);
   }
  }
  this.contrails?.update(this.time,this.game.world?.camera);
 }
 dispose(){
  if(this.disposed)return;this.disposed=true;this.ready=false;
  this.piloting.dispose();
  this.group.removeFromParent();
  this.contrails?.dispose();this.contrails=null;
  for(const actor of this.actors){actor.combat?.dispose();actor.sound?.stop();actor.mixer?.stopAllAction();actor.mixer?.uncacheRoot(actor.model);disposeAircraftAsset(actor.model);}
  this.actors.length=0;this.group.clear();
 }
}

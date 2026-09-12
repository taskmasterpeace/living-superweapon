import * as THREE from 'three';
import {planConvoyRoute} from './convoy-route.js';
import {ROSTER} from '../data/characters.js';
import {haltDrive} from './ground-driving.js';
import {IndustrialDepot} from './industrial-depot.js';
import {WoodlandCorridor} from './woodland-corridor.js';
import {operationGuidance} from './operation-guidance.js';

export class ConvoyOperation{
 constructor(game){this.g=game;this.id=crypto.randomUUID();this.state='loading';this.assignment=game.ms.squad?.assignment||'escort';this.group=new THREE.Group();game.scene.add(this.group);this.handles=[];this.finished=false;this.cargoOwner=null;this.cache=false;this.blockedFor=0;}
 interact(options){const h=this.g.registerInteractable(options);this.handles.push(h);return h;}
 routeError(message){
  this.state='route-error';this.message=message;
  this.g.hud?.announce?.('CONVOY ROUTE UNAVAILABLE');
  if(!this.hud){this.hud=document.createElement('div');this.hud.className='convoy-objective';this.hud.style.cssText='position:fixed;top:64px;left:16px;max-width:min(320px,40vw);padding:10px 16px;background:#111510ed;color:#edddac;border-left:3px solid #d5ae46;z-index:12';document.body.append(this.hud);}
  this.hud.textContent=message+' Return to the menu and retry. No supplies were charged.';
 }
 setup(){
  const g=this.g,stage=g.pwStage,deploy=g.ms.threatLab;
  if(!stage?.convoy?.ready||!stage.researchLab||deploy?.state!=='field')return;
  this.convoy=stage.convoy;this.vehicle=this.convoy.vehicles.find(v=>!v.destroyed&&!v.occupant);if(!this.vehicle)return;
  const lab=stage.researchLab.site,start=deploy.clearPad(lab.x+70,lab.z+65,34),end=deploy.clearPad(-40,650,40);
  if(!start||!end){this.routeError('No clear convoy terminal.');return;}
  const v=this.vehicle;v.cover.x=start.x;v.cover.z=start.z;v.mesh.position.x=start.x;v.mesh.position.z=start.z;v.terrain=[];this.convoy._ground(v);
  this.route=planConvoyRoute(this.convoy.driving,v,start,end);
  if(!this.route){this.routeError('No drivable laboratory route.');return;}
  this.destination=end;this.routeIndex=1;this.buildRoute();
  this.depot=new IndustrialDepot(g,end,this.route);
  this.woodland=new WoodlandCorridor(g,this.route,[{...deploy.origin,r:30},{...deploy.destination,r:30}]);
  this.events=[];
  const base=ROSTER.find(d=>d.id==='sarge');
  this.scientist=g.addFighter({...base,id:'operation-scientist',name:'RESEARCH SCIENTIST',abilities:{},items:[],hp:80,colors:{primary:'#dfdac6',secondary:'#454c52',accent:'#e7c56a'},flightTier:0},{team:this.assignment==='escort'?g.player.team:1,x:lab.x+12,z:lab.z+34});
  this.scientist.noRespawn=true;this.scientist._openSky=true;
  this.marker=new THREE.Mesh(new THREE.OctahedronGeometry(2),new THREE.MeshBasicMaterial({color:0xffd24a}));this.group.add(this.marker);
  this.cacheMesh=new THREE.Mesh(new THREE.BoxGeometry(5,3,4),new THREE.MeshStandardMaterial({color:0x655941,roughness:.7,metalness:.2}));this.cacheMesh.position.set(lab.x+8,lab.y+2,lab.z-8);this.cacheMesh.castShadow=true;this.group.add(this.cacheMesh);
  const cacheBand=new THREE.Mesh(new THREE.BoxGeometry(5.1,.5,4.1),new THREE.MeshStandardMaterial({color:0xd4b256,emissive:0x403311,roughness:.6}));this.cacheMesh.add(cacheBand);
  const contact=this.route[Math.floor(this.route.length*.45)];
  this.opponents=[];
  for(let i=0;i<3;i++){
   const at=deploy.clearPad(contact.x+45,contact.z+(i-1)*22,5);if(!at)continue;
   this.opponents.push(g.spawnEnemy(i===1?'merc':'sarge',{team:1,x:at.x,z:at.z,aiLevel:1,noRespawn:true}));
  }
  this.interact({id:'scientist-escort',pos:this.scientist.pos,r:15,label:'RESEARCH SCIENTIST',verb:'ESCORT',priority:3,enabled:f=>f===g.player&&this.scientist.alive&&this.scientistLeader!==g.player&&!this.scientist._scoutVehicle&&!this.finished,onUse:()=>this.recruitScientist()});
  this.interact({id:'research-cache',pos:new THREE.Vector3(lab.x+8,lab.y+4,lab.z-8),r:10,label:'OPTIONAL RESEARCH CACHE',verb:'COLLECT',priority:2,enabled:f=>f===g.player&&!this.cache&&!this.finished&&Math.abs(f.pos.y-lab.y)<7&&g.canSee(f,{pos:this.cacheMesh.position}),onUse:()=>{this.cache=true;this.cacheMesh.visible=false;g.hud?.announce?.('RESEARCH CACHE SECURED');}});
  this.interact({id:'convoy-cargo',pos:v.mesh.position,r:24,label:'RESEARCH CARGO',verb:'SECURE',priority:2,enabled:f=>f===g.player&&!this.cargoOwner&&(v.destroyed||Math.abs(v.speed)<2)&&!this.finished,onUse:()=>{this.cargoOwner=g.player;g.hud?.announce?.('CARGO SECURED · Bring it to extraction');}});
  this.interact({id:'convoy-start',pos:v.mesh.position,r:28,label:'RESEARCH CONVOY',verb:'DISPATCH',priority:1,enabled:f=>f===g.player&&this.scientist._scoutVehicle===v&&this.state==='loaded',onUse:()=>{this.state='travel';}});
  this.state='waiting';this.message='Find the scientist at the laboratory. Escort them to the convoy.';
  if(this.assignment==='ambush'){this.scientistLeader={alive:true,pos:v.mesh.position};this.state='boarding';}
  this.hud=document.createElement('div');this.hud.className='convoy-objective';this.hud.style.cssText='position:fixed;top:64px;left:16px;max-width:min(320px,40vw);padding:10px 16px;background:#111510dd;color:#edddac;border-left:3px solid #d5ae46;font:600 14px var(--f-display,system-ui);z-index:12;pointer-events:none';document.body.append(this.hud);
 }
 buildRoute(){
  const material=new THREE.MeshStandardMaterial({color:0x756b55,roughness:1});
  for(let i=1;i<this.route.length;i++){
   const a=this.route[i-1],b=this.route[i],length=Math.hypot(b.x-a.x,b.z-a.z),geo=new THREE.PlaneGeometry(26,length,1,12);geo.rotateX(-Math.PI/2);geo.rotateY(Math.atan2(b.x-a.x,b.z-a.z));
   const p=geo.attributes.position;
   for(let j=0;j<p.count;j++){const x=p.getX(j)+(a.x+b.x)/2,z=p.getZ(j)+(a.z+b.z)/2;p.setXYZ(j,x,this.g.world.heightAt(x,z)+.13,z);}geo.computeVertexNormals();
   const mesh=new THREE.Mesh(geo,material);mesh.receiveShadow=true;this.group.add(mesh);
  }
  const ring=new THREE.Mesh(new THREE.TorusGeometry(22,.5,6,40),new THREE.MeshBasicMaterial({color:0xffd24a}));ring.rotation.x=-Math.PI/2;ring.position.copy(this.destination);ring.position.y+=.3;this.group.add(ring);
 }
 seat(){const f=this.scientist,v=this.vehicle;f._scoutVehicle=v;f.pos.set(v.cover.x,v.ground+3,v.cover.z);f.vel.set(0,0,0);f.obj.visible=false;}
 release(){
  const f=this.scientist,v=this.vehicle;if(!f?._scoutVehicle)return true;
  for(let ring=0;ring<4;ring++)for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){
   const x=v.cover.x+dx*(v.cover.hx+6+ring*5),z=v.cover.z+dz*(v.cover.hz+6+ring*5),y=this.g.world.heightAt(x,z);
   if(!Number.isFinite(y)||this.g.world.waterAt?.(x,z)||!this.convoy.driving._clear(x,z,f.radius||2,v.cover,y,y+10))continue;
   f._scoutVehicle=null;f.pos.set(x,y,z);f.obj.visible=true;f.vel.set(0,0,0);return true;
  }
  return false;
 }
 stop(){haltDrive(this.vehicle);this.state='disabled';this.release();this.scientistLeader=null;}
 recruitScientist(){
  this.scientistLeader=this.g.player;
  this.scientist.team=this.g.player.team;
  // Captured researchers follow the recovery team to extraction; they must not
  // automatically board and dispatch the hostile convoy again.
  this.state=this.assignment==='ambush'||this.vehicle.destroyed?'disabled':'boarding';
 }
 resolveArrival(){
  haltDrive(this.vehicle);this.state='disembarking';
  if(!this.release())return;
  if(this.assignment==='escort'){
   this.cargoOwner=this.g.player;this.finish(true,'Scientist and cargo delivered.');
  }else this.finish(false,'The research convoy reached the depot.');
 }
 resolveDestroyedPassenger(){
  const v=this.vehicle,f=this.scientist;
  if(!v.destroyed||!f._scoutVehicle)return;
  this.state='disabled';this.scientistLeader=null;
  // A blocked exit may take several frames to clear. The crash is one event,
  // independent of how many times we search for a safe disembark position.
  if(!this.passengerCrashResolved){
   this.passengerCrashResolved=true;
   f.takeDamage(25,{dtype:'physical'});
  }
  this.release();
 }
 update(dt){
  if(this.finished)return;if(this.state==='loading'){this.setup();return;}if(this.state==='route-error')return;
  if(this.pendingOutcome){
   this.saveRetryIn=Math.max(0,(this.saveRetryIn||0)-dt);
   if(this.saveRetryIn===0)this.finish();
   return;
  }
  const g=this.g,v=this.vehicle,f=this.scientist,p=g.player;
  if(this.lastLogged!==this.state){this.lastLogged=this.state;this.events.push({time:g.time,state:this.state,scientistHp:f.hp,cargoSecured:!!this.cargoOwner,vehicleHp:v.cover.hp});}
  this.marker.position.copy(f.pos);this.marker.position.y+=15;this.marker.rotation.y+=dt;
  const camera=g.world.camera,viewHeight=g.world.renderer?.domElement?.clientHeight||900;
  if(camera?.isPerspectiveCamera){
   const distance=camera.position.distanceTo(this.marker.position);
   // The octahedron is 4 world units tall; cap its projection at ~22px.
   this.marker.scale.setScalar(Math.max(.02,Math.min(1,22*distance*Math.tan(camera.fov*Math.PI/360)/(2*viewHeight))));
  }
  if(!p.alive){this.finish(false,'Your team lost this attempt.');return;}
  if(!f.alive){this.release();this.finish(false,'Scientist lost. Live recovery failed.');return;}
  if(this.assignment==='ambush'&&this.state==='travel'&&v.occupant?.team===p.team)this.stop();
  this.resolveDestroyedPassenger();
  if(this.state==='disembarking'){
   this.resolveArrival();
   if(!this.finished&&this.hud)this.hud.textContent='DEPOT ARRIVAL · Clear space around the convoy so the scientist can disembark.';
   return;
  }
  if(f._scoutVehicle)this.seat();
  else if(this.scientistLeader?.alive){
   this.followScientist(dt);
   if(!v.destroyed&&Math.hypot(f.pos.x-v.cover.x,f.pos.z-v.cover.z)<v.driveRadius+8&&this.state==='boarding'){this.seat();this.state=this.assignment==='ambush'?'travel':'loaded';}
  }
  if(this.state==='travel'&&!v.destroyed&&!v.occupant){
   const target=this.route[this.routeIndex],dx=target.x-v.cover.x,dz=target.z-v.cover.z,d=Math.hypot(dx,dz);
   if(d<10){this.routeIndex++;if(this.routeIndex>=this.route.length){this.resolveArrival();return;}}
   else {const desired=Math.atan2(dx,dz),angle=Math.atan2(Math.sin(desired-v.yaw),Math.cos(desired-v.yaw));const before=v.mesh.position.clone();this.convoy.driving.advance(v,{throttle:Math.abs(v.speed)>18?0:.55,steer:Math.max(-1,Math.min(1,angle*2)),brake:Math.abs(angle)>1&&Math.abs(v.speed)>8},dt);this.blockedFor=v.mesh.position.distanceTo(before)<.01?this.blockedFor+dt:0;if(this.blockedFor>4)this.stop();}
  }
  if(this.cargoOwner===p&&this.scientistLeader===p&&!f._scoutVehicle&&Math.hypot(p.pos.x-this.destination.x,p.pos.z-this.destination.z)<24&&f.pos.distanceTo(p.pos)<24){this.finish(true,'Scientist and recovered cargo extracted.');return;}
  if(this.hud)this.hud.textContent=`${this.assignment.toUpperCase()} · ${this.state.toUpperCase()} — ${this.state==='waiting'?'Find and escort the scientist at the lab':this.state==='loaded'?'DISPATCH at the convoy':this.state==='disabled'?'Convoy stopped: escort the scientist and secure the cargo':this.state==='travel'?'Convoy moving to the depot': 'Escort scientist to convoy'} · ${operationGuidance(this)} · Cargo ${this.cargoOwner?'secured':'aboard'} · Scientist ${Math.ceil(f.hp)} HP`;
 }
 followScientist(dt){
  const f=this.scientist,v=this.vehicle;
  let leader=this.scientistLeader;
  // Once the escort reaches the vehicle, finish boarding instead of stopping
  // eight units behind them just outside the passenger admission radius.
  if(this.state==='boarding'&&v&&!v.destroyed&&Math.hypot(leader.pos.x-v.cover.x,leader.pos.z-v.cover.z)<v.driveRadius+18)
   leader={pos:{x:v.cover.x,z:v.cover.z}};
  const dx=leader.pos.x-f.pos.x,dz=leader.pos.z-f.pos.z,d=Math.hypot(dx,dz);
  const motion=leader.moveDir;
  f.moveDir=d>8?{x:dx/d,z:dz/d}:{x:0,z:0};
  // Yield when the leader turns back through the follower's stopping point.
  if(d>.01&&d<=8&&motion&&Math.hypot(motion.x,motion.z)>.2&&(-dx*motion.x-dz*motion.z)/d>.25)
   f.moveDir={x:motion.z,z:-motion.x};
  f.move(f.moveDir,dt);if(d>8)f.faceDir(dx,dz);
 }
 finish(win,reason){
  if(this.finished)return;
  // Lock the earned result before storage: later combat cannot change a pending win.
  this.pendingOutcome??={win,reason,reward:{supplies:win?70:this.cargoOwner?20:0,research:win?30+(this.cache?15:0):this.cache?15:0}};
  ({win,reason}=this.pendingOutcome);
  const {reward}=this.pendingOutcome;
  try{this.g.campaign.award(this.id,reward);}catch(e){
   this.state='saving';this.saveRetryIn=1;
   if(this.vehicle)haltDrive(this.vehicle);
   if(this.hud)this.hud.textContent=`RESULT PENDING — Save failed: ${e.message}. Retrying automatically; keep this page open.`;
   return;
  }
  this.finished=true;this.state=win?'complete':'failed';this.events.push({time:this.g.time,state:this.state,reason,reward});
  if(this.hud)this.hud.hidden=true;
  this.g.endMatch({operation:'research-convoy',win,title:win?'RESEARCH SECURED':'OPERATION FAILED',winner:win?this.g.player:null,lines:[reason,`Supplies +${reward.supplies} · Research +${reward.research}`,'Progress saved locally. Rematch starts a new operation.']});
 }
 dispose(){this.release?.();this.depot?.dispose();this.woodland?.dispose();for(const h of this.handles)this.g.unregisterInteractable(h);this.hud?.remove();const mats=new Set();this.group.traverse(o=>{o.geometry?.dispose();if(o.material)mats.add(o.material);});for(const m of mats)m.dispose();this.group.removeFromParent();}
}

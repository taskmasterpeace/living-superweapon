import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {cancelHeldAttacks} from './abilities.js';
import {transportShellPieces} from './transport-shell.js';
import {transportRampBounds,transportRampPanelBounds} from './transport-ramp.js';

const BASE='./models/squad-transport/';
export class SquadTransport{
 constructor(stage,position){
  this.stage=stage;this.g=stage.g;this.state='loading';this.passengers=new Map();this.covers=[];this.home=position.clone();this.handles=[];this.disposed=false;
  this.loading=Promise.all([new GLTFLoader().loadAsync(BASE+'transport.v1.glb'),fetch(BASE+'manifest.json').then(r=>r.json())]).then(([asset,manifest])=>{
   if(this.disposed){this.disposeAsset(asset.scene);return;}
   this.model=asset.scene;this.manifest=manifest;this.model.position.copy(position);this.model.name='squad-passenger-transport';this.g.scene.add(this.model);
   this.hinge=this.model.getObjectByName(manifest.ramp.node);this.model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
   this.originalMaterials=new Set();
   this.model.traverse(o=>{
    if(!o.isMesh||!/^side_shell|^cabin_roof|^rear_jamb|^rear_header|^rear_ramp$/.test(o.name))return;
    const old=[].concat(o.material);for(const m of old)this.originalMaterials.add(m);
    const copies=old.map(m=>{const c=m.clone();c.transparent=true;return c;});o.material=Array.isArray(o.material)?copies:copies[0];
    o.onBeforeRender=(_r,_s,camera)=>{const cut=camera===this.g.world.camera&&this.g.player?._passengerTransport===this;for(const m of copies){m.opacity=cut?.12:1;m.depthWrite=!cut;}};
    o.onAfterRender=()=>{for(const m of copies){m.opacity=1;m.depthWrite=true;}};
   });
   const shell=transportShellPieces(manifest.collisionShell).map(box=>({...box,role:box.center[1]===5?'step':box.role}));
   // Small finite risers support the authored slope without a solid fuselage collider.
   const walk=manifest.ramp.walk;
   if(walk)for(let i=0;i<walk.steps;i++){const depth=(walk.startZ-walk.endZ)/walk.steps,top=walk.startY+(i+1)*(walk.endY-walk.startY)/walk.steps;shell.push({center:[0,top-.25,walk.startZ-(i+.5)*depth],half:[walk.width/2,.25,depth/2],role:'step',ramp:true});}
   if(walk)shell.push({center:[0,0,0],half:[0,0,0],rampPanel:true,role:'wall'});
   for(const box of shell){const c={x:0,z:0,hx:box.half[0],hz:box.half[2],hp:400,maxHp:400,bottom:0,top:0,h:0,finiteBuilding:true,standable:true,buildingRole:box.role,noCam:true,localBox:box,mesh:this.model,onShatter:()=>this.destroy()};this.covers.push(c);this.g.world.cover.push(c);this.g.world.coverAll.push(c);stage._cover.push(c);}
   this.entry=new THREE.Vector3();this.sync();this.state='parked';
   this.cabin=new THREE.Vector3();this.sync();
   this.handles.push(this.g.registerInteractable({id:'squad-transport-board',pos:this.cabin,r:36,requiresFacing:false,label:'PASSENGER SEAT',verb:'SIT',priority:3,enabled:f=>f===this.g.player&&this.state==='parked'&&!f._passengerTransport&&this.insideCabin(f),onUse:f=>this.board(f)}));
  }).catch(e=>{this.error=e.message;this.state='error';console.error('Squad transport',e);});
 }
 disposeAsset(model){const geometry=new Set(),materials=new Set();model.traverse(o=>{if(o.geometry)geometry.add(o.geometry);for(const m of [].concat(o.material||[]))materials.add(m);});for(const g of geometry)g.dispose();for(const m of materials)m.dispose();model.removeFromParent();}
 sync(){
  const p=this.model.position;this.model.updateMatrixWorld(true);this.entry.set(...this.manifest.ramp.entry);this.model.localToWorld(this.entry);
  if(this.cabin){this.cabin.set(0,5.7,12);this.model.localToWorld(this.cabin);}
  const cs=Math.abs(Math.cos(this.model.rotation.y)),sn=Math.abs(Math.sin(this.model.rotation.y));
  for(const c of this.covers){
   if((c.localBox.ramp||c.localBox.rampPanel)&&this.hinge){
    const raised=Math.abs(this.hinge.rotation.x)>.05,active=c.localBox.rampPanel?raised:!raised;
    if(c._transportActive!==active){
     c._transportActive=active;
     for(const list of [this.g.world.cover,this.g.world.coverAll,this.stage._cover]){const i=list.indexOf(c);if(active&&i<0)list.push(c);else if(!active&&i>=0)list.splice(i,1);}
    }
    if(!active)continue;
    const bounds=c.localBox.rampPanel?transportRampPanelBounds(this.manifest.ramp.walk,this.hinge):transportRampBounds(c.localBox,this.model,this.hinge);
    c.x=(bounds.min.x+bounds.max.x)/2;c.z=(bounds.min.z+bounds.max.z)/2;
    c.hx=(bounds.max.x-bounds.min.x)/2;c.hz=(bounds.max.z-bounds.min.z)/2;
    c.bottom=bounds.min.y;c.top=c.h=bounds.max.y;
    c.buildingRole=Math.abs(this.hinge.rotation.x)<.05?'step':'wall';
    c.standable=c.buildingRole==='step';continue;
   }
   const b=c.localBox,center=this.model.localToWorld(new THREE.Vector3(...b.center));c.x=center.x;c.z=center.z;c.hx=cs*b.half[0]+sn*b.half[2];c.hz=sn*b.half[0]+cs*b.half[2];c.bottom=p.y+b.center[1]-b.half[1];c.top=c.h=p.y+b.center[1]+b.half[1];}
  this.g.world.refreshFogBoxes?.();
  for(const [f,seat]of this.passengers){
   f.pos.set(...seat.position);this.model.localToWorld(f.pos);f.obj.position.copy(f.pos);f.obj.rotation.set(0,this.model.rotation.y+seat.yaw,0);f.vel.set(0,0,0);f.obj.visible=true;
   for(const leg of [f.parts.legL,f.parts.legR])if(leg){leg.rotation.x=-1.35;if(leg.userData.knee)leg.userData.knee.rotation.x=1.45;}
   for(const arm of [f.parts.armL,f.parts.armR])if(arm)arm.rotation.x=-.55;
  }
 }
 boardingTarget(f){const p=this.model.worldToLocal(f.pos.clone());return Math.abs(p.x)<7&&p.z>=-17&&p.z<=42?this.cabin:this.entry;}
 insideCabin(f){const p=this.model.worldToLocal(f.pos.clone());return Math.abs(p.x)<7&&p.z>=-17&&p.z<=17&&Math.abs(p.y-5.7)<2.5;}
 board(f){
  if(this.state!=='parked'||!f.alive||f._carry||f.grabbedBy||f.grabbing||f._scoutVehicle||f._aircraftVehicle||f._passengerTransport)return false;
  if(f.radius>3.8||f.obj.scale.y>1.3){if(f===this.g.player)this.g.hud?.feed('This body is too large for the passenger cabin','#d5bd80');return false;}
  if(!this.insideCabin(f))return false;
  const used=new Set([...this.passengers.values()].map(s=>s.id)),seat=this.manifest.seats.find(s=>!used.has(s.id));if(!seat)return false;
  cancelHeldAttacks(f);f._passengerPose=[];
  for(const part of [f.parts.legL,f.parts.legR,f.parts.armL,f.parts.armR,f.parts.legL?.userData.knee,f.parts.legR?.userData.knee])if(part)f._passengerPose.push([part,part.rotation.clone()]);
  f._passengerTransport=this;f._deploymentTarget=null;f.flying=false;f.flyHeld=f.descendHeld=false;f.guarding=false;f.moveDir={x:0,z:0};this.passengers.set(f,seat);this.sync();
  if(f===this.g.player){document.body.classList.add('transport-passenger');this.g.retireCombatViewInput();this.g.hud?.announce?.('PASSENGER · Enter: fly to depot · J: exit while parked');}
  return true;
 }
 cancelBoarding(){for(const f of this.g.ms?.squad?.members||[])if(f._deploymentTarget&&(f._deploymentTarget===this.entry||f._deploymentTarget===this.cabin))f._deploymentTarget=null;}
 exit(f,force=false){
  if(!this.passengers.has(f)||(!force&&this.state!=='parked'))return false;
  let at=null;
  for(let ring=0;ring<5&&!at;ring++)for(const dx of [0,-8,8,-16,16]){
   const x=this.entry.x+dx,z=this.entry.z+5+ring*5,y=this.g.world.heightAt(x,z);
   if(!Number.isFinite(y)||this.g.world.waterAt?.(x,z))continue;
   if(this.g.world.cover.some(c=>!this.covers.includes(c)&&y<c.top&&y+10>(c.bottom??0)&&Math.abs(x-c.x)<(c.hx??c.r??0)+3&&Math.abs(z-c.z)<(c.hz??c.r??0)+3))continue;
   if(this.g.entities.some(e=>e!==f&&e.alive&&!e._passengerTransport&&Math.hypot(e.pos.x-x,e.pos.z-z)<6))continue;
   at=new THREE.Vector3(x,y,z);break;
  }
  if(!at&&!force)return false;
  this.passengers.delete(f);f._passengerTransport=null;
  for(const [part,rotation]of f._passengerPose||[])part.rotation.copy(rotation);f._passengerPose=null;
  f.pos.copy(force?this.entry:at);f.obj.position.copy(f.pos);f.obj.rotation.set(0,0,0);f.vel.set(0,0,0);f.obj.visible=true;
  if(f===this.g.player){this.cancelBoarding();this.g.world._chaseSnap=true;document.body.classList.remove('transport-passenger');}
  if(f===this.g.player&&!force)for(const member of [...this.passengers.keys()])this.exit(member);
  return true;
 }
 launch(){
  if(this.state!=='parked'||!this.passengers.has(this.g.player))return false;
  if((this.g.ms.squad?.members||[]).some(f=>f.alive&&!this.passengers.has(f))){this.g.hud?.feed('Waiting for your squad to board','#d5bd80');return false;}
  const goal=this.g.ms.convoyOperation?.destination;if(!goal){this.g.hud?.feed('Deploy through the portal first to establish the operation route','#d5bd80');return false;}
  const dest=this.g.ms.threatLab.clearPad(goal.x+70,goal.z,45);if(!dest)return false;
  this.from=this.model.position.clone();this.to=dest;this.elapsed=0;this.duration=Math.max(12,this.from.distanceTo(this.to)/60);
  this.cruise=Math.max(this.from.y,this.to.y)+100;
  for(let i=0;i<=60;i++){const x=this.from.x+(this.to.x-this.from.x)*i/60,z=this.from.z+(this.to.z-this.from.z)*i/60;for(const dx of [-35,0,35])this.cruise=Math.max(this.cruise,this.g.world.heightAt(x+dx,z)+70);}
  this.model.rotation.y=Math.atan2(this.from.x-this.to.x,this.from.z-this.to.z);this.state='closing';return true;
 }
 handleInput(input){
  const f=this.g.player;if(f?._passengerTransport!==this)return false;
  if(input.pressed?.('KeyJ')||this.g.pad?.pressed('transportExit')){input.justPressed?.delete('KeyJ');if(!this.exit(f))this.g.hud?.feed('Remain seated until landing','#d5bd80');}
  if(input.pressed?.('Enter')||this.g.pad?.pressed('transportDepart')){input.justPressed?.delete('Enter');this.launch();}
  return true;
 }
 update(dt){
  if(!this.model||this.disposed||this.state==='destroyed'||this.g.paused||this.g.matchOver)return;
  if(this.state==='parked'&&this.passengers.has(this.g.player)){
   for(const f of this.g.ms.squad?.members||[])if(f.alive&&!this.passengers.has(f)){
    f._deploymentTarget=this.boardingTarget(f);this.board(f);
   }
  }
  for(const f of this.passengers.keys())if(!f.alive)this.exit(f,true);
  if(this.state==='closing'){this.elapsed+=dt;if(this.hinge)this.hinge.rotation.x=this.manifest.ramp.closedAngle*Math.min(1,this.elapsed/1.2);if(this.elapsed>=1.2){this.state='flying';this.elapsed=0;}}
  if(this.state==='flying'){
   this.elapsed+=dt;const t=Math.min(1,this.elapsed/this.duration),travel=Math.max(0,Math.min(1,(t-.2)/.6)),smooth=travel*travel*(3-2*travel);this.model.position.lerpVectors(this.from,this.to,smooth);
   this.model.position.y=t<.2?THREE.MathUtils.lerp(this.from.y,this.cruise,t/.2):t>.8?THREE.MathUtils.lerp(this.cruise,this.to.y,(t-.8)/.2):this.cruise;
   if(t===1){this.state='opening';this.elapsed=0;this.home.copy(this.to);}
  }
  if(this.state==='opening'){this.elapsed+=dt;if(this.hinge)this.hinge.rotation.x=this.manifest.ramp.closedAngle*(1-Math.min(1,this.elapsed/1.2));if(this.elapsed>=1.2){this.state='parked';this.g.hud?.announce?.('TRANSPORT LANDED · J to disembark');}}
  this.sync();
 }
 destroy(){if(this.state==='destroyed')return;this.cancelBoarding();this.state='destroyed';for(const f of [...this.passengers.keys()]){this.exit(f,true);f.takeDamage(40,{dtype:'physical'});f.launchT=1;}this.model.visible=false;this.removeCover();}
 removeCover(){for(const c of this.covers)for(const list of [this.g.world.cover,this.g.world.coverAll,this.stage._cover]){const i=list.indexOf(c);if(i>=0)list.splice(i,1);}this.covers=[];this.g.world.refreshFogBoxes?.();}
 dispose(){this.disposed=true;this.cancelBoarding();for(const f of [...this.passengers.keys()])this.exit(f,true);for(const h of this.handles)this.g.unregisterInteractable(h);this.removeCover();if(this.model)this.disposeAsset(this.model);for(const m of this.originalMaterials||[])m.dispose();}
}

// Bounded native construct locomotion, not a vehicle/driver or pathfinding system.
import * as THREE from 'three';
import {coverBoxEntry,sweepSplitObstacle} from './projectile-contact.js';
import {ConstructSurface} from './construct-surface.js';

const HALF_WIDTH=5,HALF_LENGTH=7,HEIGHT=8,BARREL_LENGTH=14.5;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angle=v=>Math.atan2(Math.sin(v),Math.cos(v));
function bounded(def,key,fallback,min,max){
 const v=def[key]===undefined?fallback:def[key];
 if(!Number.isFinite(v)||v<min||v>max)throw new RangeError(`Invalid tank ${key}`);
 return v;
}
export function tankSettings(def){
 return {moveSpeed:bounded(def,'moveSpeed',12,1,40),turnRate:bounded(def,'turnRate',1.8,.1,6),
  damage:bounded(def,'damage',18,1,120),interval:bounded(def,'interval',1.2,.1,6),speed:bounded(def,'speed',90,20,180),
  range:bounded(def,'range',90,10,160),blast:bounded(def,'blast',6,1,30)};
}
function bounds(x,y,z,yaw){
 const co=Math.abs(Math.cos(yaw)),si=Math.abs(Math.sin(yaw));
 return {x,z,hx:co*HALF_WIDTH+si*HALF_LENGTH,hz:si*HALF_WIDTH+co*HALF_LENGTH,bottom:y,top:y+HEIGHT,h:y+HEIGHT};
}
function overlap(a,b,bottom=b.bottom??-Infinity,top=b.top??b.h){
 return a.bottom<top&&a.top>bottom&&Math.abs(a.x-b.x)<a.hx+(b.hx??b.r)&&Math.abs(a.z-b.z)<a.hz+(b.hz??b.r);
}
function clearPlacement(game,box,own=null){
 const world=game.world,limit=world.ARENA??240;
 if(!Object.values(box).every(Number.isFinite)||Math.abs(box.x)+box.hx>limit||Math.abs(box.z)+box.hz>limit)return false;
 for(const c of world.cover||[])if(c!==own&&overlap(box,c))return false;
 for(const room of world.interiors||[]){
  if(!overlap(box,room))continue;
  for(const wall of room.walls||[])if(overlap(box,wall,room.bottom??-Infinity,room.top))return false;
 }
 for(const f of game.entities||[]){
  if(!f.alive||f._remove)continue;
  const r=f.radius??2.2;
  if(overlap(box,{x:f.pos.x,z:f.pos.z,hx:r,hz:r},f.pos.y,f.pos.y+11*(f.obj?.scale.y??1)))return false;
 }
 return true;
}
function barrelClear(game,x,y,z,yaw,pitch,own=null){
 // Collision clearance only, never armor: a conservative capsule around the
 // actual fixed barrel. Reuse native cover/interior shapes and top padding.
 const pivot=new THREE.Vector3(x,y+6.5,z),co=Math.cos(pitch);
 const tip=pivot.clone().add(new THREE.Vector3(Math.sin(yaw)*co,Math.sin(pitch),Math.cos(yaw)*co).multiplyScalar(BARREL_LENGTH));
 const lane={cover:(game.world.cover||[]).filter(c=>c!==own),interiors:game.world.interiors||[]};
 return !sweepSplitObstacle(lane,pivot,tip,.62,{},false,.62);
}
export function tankPlacement(game,owner){
 const n=Math.hypot(owner.aim?.x,owner.aim?.z);
 if(!Number.isFinite(n)||n<.001)return null;
 const x=owner.pos.x+owner.aim.x/n*16,z=owner.pos.z+owner.aim.z/n*16,y=game.world.heightAt?.(x,z)??0,yaw=Math.atan2(owner.aim.x,owner.aim.z);
 return clearPlacement(game,bounds(x,y,z,yaw))&&barrelClear(game,x,y,z,yaw,0)?{x,y,z,yaw}:null;
}
export function buildTank(c,group,material,placement){
 const mesh=(name,geo,x,y,z,parent=group)=>{
  const m=new THREE.Mesh(geo,material);m.name=name;m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;
 };
 const hull=mesh('construct-tank-hull',new THREE.BoxGeometry(7.4,3.2,12),0,3.2,0);
 mesh('construct-tank-deck',new THREE.BoxGeometry(8,1.2,9.5),0,5.1,-.4);
 c.trackWheels=[];
 for(const side of [-1,1]){
  mesh(`construct-tank-track-${side<0?'left':'right'}`,new THREE.BoxGeometry(2.2,3.4,14),side*3.9,1.7,0);
  for(let i=0;i<6;i++){
   const wheel=mesh('construct-tank-roadwheel',new THREE.CylinderGeometry(1.15,1.15,.3,10),side*4.85,1.6,-5.4+i*2.16);wheel.rotation.z=Math.PI/2;c.trackWheels.push(wheel);
  }
  for(let i=0;i<9;i++)mesh('construct-tank-tread',new THREE.BoxGeometry(2.2,.18,.55),side*3.9,3.42,-6.3+i*1.575);
 }
 const turret=new THREE.Group();turret.name='construct-tank-turret';turret.position.y=6.5;group.add(turret);c.turret=turret;
 const shell=mesh('construct-tank-turret-shell',new THREE.CylinderGeometry(2.8,3.2,2.8,10),0,0,0,turret);
 // Root skin excludes articulation. Each moving shell owns a separate native
 // skin and solid material, so sampled geometry follows its driven transform
 // without resampling or multiplying opacity through shared material writes.
 shell.userData.constructSurfaceExclude=true;shell.material=material.clone();c.turretShell=shell;
 const pitch=new THREE.Group();pitch.name='construct-tank-barrel-pitch';turret.add(pitch);c.barrelPitchPivot=pitch;
 const barrel=mesh('construct-tank-barrel',new THREE.CylinderGeometry(.42,.62,BARREL_LENGTH,10),0,0,BARREL_LENGTH/2,pitch);
 barrel.rotation.x=Math.PI/2;barrel.userData.constructSurfaceExclude=true;barrel.material=material.clone();c.barrel=barrel;
 const muzzle=new THREE.Object3D();muzzle.name='construct-tank-muzzle';muzzle.position.z=BARREL_LENGTH;pitch.add(muzzle);c.muzzle=muzzle;
 c.pos.set(placement.x,placement.y,placement.z);group.position.copy(c.pos);group.rotation.y=placement.yaw;
 c.turretYaw=placement.yaw;c.state='holding';c._tankFogClock=0;c._tankFogDirty=false;
 // Hull+turret only: conservative AABB around rotated corners. The protruding
 // fixed barrel is not protection; its visible tip must clear this entire box.
 c._cover={...bounds(placement.x,placement.y,placement.z,placement.yaw),r:Math.hypot(5,7),projectileShape:'box',mesh:hull,construct:c};
 c.game.world.cover.push(c._cover);c.game.world.refreshFogBoxes?.();return hull;
}
export function tankSurfaces(c,options){
 // Fixed tank geometry uses three draws. Share the authored density budget,
 // keeping their combined count below the original 2048-particle ceiling.
 const density=Number.isFinite(options.density)?clamp(options.density,0,2):1;
 const settings={...options,density:density*.2},main=new ConstructSurface(c.obj,settings);
 c.articulatedSurfaceFx=[c.turretShell,c.barrel].map(root=>{
  root.userData.constructSurfaceExclude=false;
  const skin=new ConstructSurface(root,settings);
  root.userData.constructSurfaceExclude=true;return skin;
 });
 return main;
}
function destination(c,game){
 if(game.player===c.owner)return game.aimPoint;
 const o=c.owner,n=Math.hypot(o.aim.x,o.aim.z)||1;
 return {x:o.pos.x+o.aim.x/n*26,z:o.pos.z+o.aim.z/n*26};
}
export function stepTank(c,dt,game){
 if(!Number.isFinite(dt)||dt<=0)return;
 // Start from the actual articulated pose. A no-target frame must not leave a
 // stale world-yaw cache for acquisition to jump back to after the hull turns.
 c.turretYaw=angle(c.obj.rotation.y+c.turret.rotation.y);
 const settings=c.tank,goal=destination(c,game),steps=Math.ceil(Math.max(settings.moveSpeed*dt/.5,settings.turnRate*dt/.05,1)),h=dt/steps;
 let moved=false;c.state='holding';
 for(let i=0;i<steps;i++){
  const dx=goal.x-c.pos.x,dz=goal.z-c.pos.z,dist=Math.hypot(dx,dz);
  if(!Number.isFinite(dist)||dist<=2+1e-9)break;
  const wanted=Math.atan2(dx,dz),oldYaw=c.obj.rotation.y,yaw=oldYaw+clamp(angle(wanted-oldYaw),-settings.turnRate*h,settings.turnRate*h);
  const travel=Math.abs(angle(wanted-yaw))<=.35?Math.min(settings.moveSpeed*h,dist-2):0;
  const x=c.pos.x+Math.sin(yaw)*travel,z=c.pos.z+Math.cos(yaw)*travel,y=game.world.heightAt?.(x,z)??0;
  const box=bounds(x,y,z,yaw);
  if(Math.abs(y-c.pos.y)>1||!clearPlacement(game,box,c._cover)||!barrelClear(game,x,y,z,c.turretYaw,-c.barrelPitchPivot.rotation.x,c._cover)){c.state='blocked';break;}
  if(travel>0)moved=true;
  if(travel>0||Math.abs(yaw-oldYaw)>1e-12)c._tankFogDirty=true;
  c.pos.set(x,y,z);c.obj.position.copy(c.pos);c.obj.rotation.y=yaw;Object.assign(c._cover,box,{r:Math.hypot(box.hx,box.hz)});
  c.turret.rotation.y=angle(c.turretYaw-yaw); // independently world-stabilized
  c.state=Math.hypot(goal.x-x,goal.z-z)<=2+1e-9?'holding':'moving';
  for(const wheel of c.trackWheels)wheel.rotation.x+=travel/1.15;
 }
 c._tankFogClock+=dt;
 if(c._tankFogDirty&&(c._tankFogClock>=.1-1e-9||c.state!=='moving')){
  game.world.refreshFogBoxes?.();c._tankFogClock=0;c._tankFogDirty=false;
 }
 c.obj.updateMatrixWorld(true);
 c.fireCd-=dt;
 // Use native hostility/range selection, excluding decoys: this cannon targets
 // real Fighters only, not a new damage/target framework for constructs.
 const target=game.nearestFoe.call({entities:game.entities,_decoys:[],isFoe:game.isFoe.bind(game)},c.owner,c.pos,settings.range);
 if(!target)return;
 const pivot=c.turret.getWorldPosition(new THREE.Vector3()),aimAt=target.pos.clone().setY(target.pos.y+5);
 const desired=aimAt.clone().sub(pivot),yaw=Math.atan2(desired.x,desired.z),pitch=Math.atan2(desired.y,Math.hypot(desired.x,desired.z));
 const oldPitch=-c.barrelPitchPivot.rotation.x,dyaw=clamp(angle(yaw-c.turretYaw),-3*dt,3*dt),dpitch=clamp(clamp(pitch,-.2,.6)-oldPitch,-3*dt,3*dt);
 const turns=Math.max(1,Math.ceil(Math.max(Math.abs(dyaw),Math.abs(dpitch))/.02));
 for(let i=0;i<turns;i++){
  const nextYaw=c.turretYaw+dyaw/turns,nextPitch=-c.barrelPitchPivot.rotation.x+dpitch/turns;
  if(!barrelClear(game,c.pos.x,c.pos.y,c.pos.z,nextYaw,nextPitch,c._cover))break;
  c.turretYaw=nextYaw;c.turret.rotation.y=angle(c.turretYaw-c.obj.rotation.y);c.barrelPitchPivot.rotation.x=-nextPitch;
 }
 c.obj.updateMatrixWorld(true);
 if(moved||c.state==='moving'||c.fireCd>1e-9||pitch<-.2||pitch>.6||Math.abs(angle(yaw-c.turretYaw))>.08)return;
 const muzzle=c.muzzle.getWorldPosition(new THREE.Vector3()),aim=c.barrelPitchPivot.getWorldDirection(new THREE.Vector3());
 if(aim.dot(desired.clone().normalize())<Math.cos(.08))return;
 // The target's near surface must be ahead of the real muzzle. A fixed long
 // barrel cannot shoot a close foe behind its tip; leave this opportunity ready.
 if(aimAt.clone().sub(muzzle).dot(aim)<=(target.radius??2.2)+1)return;
 if(Number.isFinite(coverBoxEntry(muzzle,muzzle,c._cover,1.2,1.2)))return;
 // Check the whole barrel-to-target lane, not only space after its tip: a long
 // barrel may not project a shot through a nearer obstacle. Own cover alone is ignored.
 const lane={cover:(game.world.cover||[]).filter(b=>b!==c._cover),interiors:game.world.interiors||[]};
 const barrelEnd=pivot.clone().addScaledVector(aim,Math.max(BARREL_LENGTH,desired.length()));
 if(sweepSplitObstacle(lane,pivot,aimAt,1,{},false)||sweepSplitObstacle(lane,pivot,barrelEnd,1,{},false))return;
 game.projectiles.spawnProjectile(c.owner,{pos:muzzle,vel:aim.multiplyScalar(settings.speed),radius:1,damage:settings.damage,blast:settings.blast,color:c.color,color2:'#fff'});
 c.fireCd=settings.interval;game.audio.blast(600,.1,muzzle);
}

import * as THREE from 'three';
import {sweepSplitObstacle} from './projectile-contact.js';
import {earliestOrdinaryContact} from './attack-interception.js';

// Deliberately slower than infantry: a visible 1.6s acquisition, two rounds,
// then four seconds of breathing room. Losing sight cancels the burst.
export class AircraftFireControl{
 constructor(){this.acquired=0;this.cooldown=0;this.remaining=0;this.state='search';}
 update(dt,eligible){
  if(!Number.isFinite(dt)||dt<=0||dt>.25)return false;
  this.cooldown=Math.max(0,this.cooldown-dt);
  if(!eligible){this.acquired=0;this.remaining=0;this.state='search';return false;}
  if(this.cooldown>0){this.state=this.remaining?'burst':'reload';return false;}
  this.acquired+=dt;this.state='acquire';if(this.acquired<1.6)return false;
  if(!this.remaining)this.remaining=2;this.remaining--;this.cooldown=this.remaining?.28:4;
  if(!this.remaining)this.acquired=0;this.state='fire';return true;
 }
}
const approach=(a,b,s)=>a+THREE.MathUtils.clamp(Math.atan2(Math.sin(b-a),Math.cos(b-a)),-s,s);

// A native finite-volume receiver, not an invisible Fighter. The shared
// construct-hit admission handles bullets, reached beam tips and splash once.
export class AircraftCombat{
 constructor(game,actor){
  this.game=game;this.actor=actor;this.dead=false;this.disposed=false;this.control=new AircraftFireControl();this.shots=0;
  this.source={name:'CLONE GUNSHIP',team:1,pos:new THREE.Vector3(),powerBuff:1,alive:true,_frontlineVehicle:true};
  this.pilotCooldown=0;
  this.pilotSolution={origin:new THREE.Vector3(),velocity:new THREE.Vector3(),point:new THREE.Vector3(),kind:null,range:0};
  this.aimGame=Object.create(game);this.aimGame.entities=[];
  this.mount=new THREE.Group();this.mount.name='frontline-chin-gun';this.mount.position.set(0,-.9,3.8);actor.model.add(this.mount);
  this.pitch=new THREE.Group();this.mount.add(this.pitch);
  const material=new THREE.MeshStandardMaterial({color:'#41463b',roughness:.65,metalness:.45});
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.085,.13,1.5,8),material);barrel.rotation.x=Math.PI/2;barrel.position.z=.75;this.pitch.add(barrel);
  const base=new THREE.Mesh(new THREE.SphereGeometry(.28,8,6),material);this.mount.add(base);
  this.lamp=new THREE.Mesh(new THREE.SphereGeometry(.1,6,4),new THREE.MeshBasicMaterial({color:'#ffbb52'}));this.lamp.position.set(.22,.1,.15);this.mount.add(this.lamp);this.lamp.visible=false;
  this.cover={mesh:actor.wrapper,hp:160,maxHp:160,frontlineAircraft:true,frontlineVehicle:true,projectileShape:'box',noCam:true,construct:this,blastBounds:new THREE.Box3()};
  this.cover.onConstructHit=(amount,o={})=>this.hit(amount,o.src);this.cover.onShatter=(_g,_c,src)=>this.destroy(src);
  this.hull=actor.model.getObjectByName('hull')||actor.model;this.box=new THREE.Box3();this.center=new THREE.Vector3();this.muzzle=new THREE.Vector3();this.target=new THREE.Vector3();this.local=new THREE.Vector3();this.bore=new THREE.Vector3();this.direction=new THREE.Vector3();this.friend=new THREE.Vector3();this.quat=new THREE.Quaternion();
  this.sightWorld=Object.create(game.world);this.sightWorld.cover=[];this.contact={};
  game.world.cover.push(this.cover);game.world.coverAll.push(this.cover);this.syncBounds();game.world.refreshFogBoxes?.();
 }
 syncBounds(){
  this.actor.wrapper.updateWorldMatrix(true,true);const c=this.cover,b=c.blastBounds.setFromObject(this.hull,false).union(this.box.setFromObject(this.mount,false));b.getCenter(this.center);
  c.x=this.center.x;c.z=this.center.z;c.hx=(b.max.x-b.min.x)/2;c.hz=(b.max.z-b.min.z)/2;c.r=Math.hypot(c.hx,c.hz);c.bottom=b.min.y;c.top=c.h=b.max.y;
  c.y0=this.actor.wrapper.position.y;
  this.source.pos.copy(this.actor.wrapper.position);
  this.source.team=this.actor.occupant?.team??(this.actor.pilotable?0:1);
 }
 update(dt,enabled=true){
  const g=this.game,p=g.player;if(this.disposed||this.dead||g.paused||g.running===false||!Number.isFinite(dt)||dt<=0||dt>.25)return;
  this.syncBounds();const active=enabled&&g.ms?.frontline&&g.ms.frontline.phase!=='complete'&&p?.alive;
  if(!active){this.control.update(dt,false);this.lamp.visible=false;return;}
  this.target.copy(p.pos);this.target.y+=5;this.pitch.localToWorld(this.muzzle.set(0,0,1.55));this.direction.subVectors(this.target,this.muzzle);const range=this.direction.length();this.direction.normalize();
  this.local.copy(this.target);this.mount.parent.worldToLocal(this.local);this.local.sub(this.mount.position);
  const yaw=Math.atan2(this.local.x,this.local.z),elevation=Math.atan2(this.local.y,Math.hypot(this.local.x,this.local.z)),arc=Math.abs(yaw)<1.4&&elevation> -1.15&&elevation<.15;
  // Weapon eligibility is cheaper than a full terrain/cover/friendly-fire sweep.
  // Keep hull movement and cooldowns live: distant craft remain hittable and
  // returning targets must earn a fresh acquisition, never inherit a stale burst.
  if(!(range>=70&&range<=330&&arc)){this.control.update(dt,false);this.lamp.visible=false;return;}
  const covers=this.sightWorld.cover;covers.length=0;for(const c of g.world.cover)if(c!==this.cover)covers.push(c);
  let visible=!sweepSplitObstacle(this.sightWorld,this.muzzle,this.target,.3,this.contact);
  for(const f of g.entities||[]){if(!visible)break;if(!f.alive||f===p||f.team!==1)continue;this.friend.copy(f.pos);this.friend.y+=5;this.friend.sub(this.muzzle);const t=this.friend.dot(this.direction);if(t>0&&t<range&&this.friend.addScaledVector(this.direction,-t).lengthSq()<36)visible=false;}
  if(visible&&range>=70&&range<=330&&arc){this.mount.rotation.y=approach(this.mount.rotation.y,yaw,dt*.9);this.pitch.rotation.x=approach(this.pitch.rotation.x,-elevation,dt*.7);}
  this.actor.wrapper.updateWorldMatrix(true,true);this.pitch.localToWorld(this.muzzle.set(0,0,1.55));this.pitch.getWorldQuaternion(this.quat);this.bore.set(0,0,1).applyQuaternion(this.quat);this.direction.subVectors(this.target,this.muzzle).normalize();
  const old=this.control.state,fire=this.control.update(dt,visible&&arc&&range>=70&&range<=330&&this.bore.dot(this.direction)>.999);
  this.lamp.visible=this.control.state==='acquire'||this.control.state==='burst';
  if(this.control.state==='acquire'&&old!=='acquire')g.hud?.feed?.('GUNSHIP ACQUIRING — BREAK SIGHT','#ffbb52');
  this.syncBounds();if(!fire)return;this.shots++;
  g.projectiles.spawnProjectile(this.source,{pos:this.muzzle.clone(),vel:this.bore.clone().multiplyScalar(190),bullet:true,ballistic:true,damage:5,radius:.25,blast:.6,life:1.85,homing:0,grav:0,weapon:'rifle',dtype:'ballistic',color:'#f8cf85',launchCover:this.cover});
  g.audio?.soundLibrary?.play('scout-gunshot',{pos:this.muzzle});g.particles?.burst(this.muzzle.x,this.muzzle.y,this.muzzle.z,{count:4,speed:6,life:.1,size:1.3,color:['#ffe3a1','#ffac52'],up:0,grav:0});
 }
 pilotFire(dt,held){
  if(this.dead||this.disposed||!Number.isFinite(dt)||dt<=0||this.game.paused||this.game.running===false)return;
  this.pilotCooldown=Math.max(0,this.pilotCooldown-dt);
  if(!held||!this.actor.occupant?.alive||this.pilotCooldown>0)return;
  this.pilotCooldown=.2;this.shots++;
  const solution=this.pilotTrajectory();
  this.game.projectiles.spawnProjectile(this.source,{pos:solution.origin.clone(),vel:solution.velocity.clone(),bullet:true,ballistic:true,damage:12,radius:.35,blast:1.2,life:2.2,homing:0,grav:0,weapon:'rifle',dtype:'ballistic',color:'#f8cf85',launchCover:this.cover});
  this.game.audio?.soundLibrary?.play('scout-gunshot',{pos:solution.origin});
  this.game.particles?.burst(solution.origin.x,solution.origin.y,solution.origin.z,{count:4,speed:6,life:.1,size:1.3,color:['#ffe3a1','#ffac52'],up:0,grav:0});
 }
 // The HUD and actual round share this solution. No mouse ray, target lock or
 // lead assist can silently steer a fixed forward cannon away from the craft.
 pilotTrajectory(){
  this.syncBounds();const solution=this.pilotSolution;
  this.actor.wrapper.getWorldQuaternion(this.quat);this.bore.set(0,0,1).applyQuaternion(this.quat);
  // Start ahead of the full hull, not inside the cockpit or rear-mounted asset origin.
  const box=this.cover.blastBounds,extent=Math.max(box.max.x-box.min.x,box.max.z-box.min.z)*.5+3;
  solution.origin.copy(this.actor.wrapper.position).addScaledVector(this.bore,extent);
  solution.velocity.copy(this.bore).multiplyScalar(290);if(this.actor.velocity)solution.velocity.add(this.actor.velocity);
  return solution;
 }
 pilotAim(){
  if(this.dead||this.disposed||!this.actor.occupant?.alive)return null;
  const solution=this.pilotTrajectory(),entities=this.aimGame.entities;entities.length=0;
  for(const f of this.game.entities||[])if((f._vis??1)>.4&&!(this.actor.occupant.blindT>0))entities.push(f);
  solution.point.copy(solution.origin).addScaledVector(solution.velocity,2.2);
  const query={pos:solution.origin,radius:.35,life:2.2,ground:true,caster:this.source,launchCaster:this.source,launchCover:this.cover};
  const contact=earliestOrdinaryContact(query,solution.point,2.2,this.aimGame);
  if(contact)solution.point.copy(solution.origin).addScaledVector(solution.velocity,2.2*contact.t);
  solution.kind=contact?.kind||'expiry';solution.range=solution.point.distanceTo(solution.origin);
  return solution;
 }
 hit(amount,src){
  const team=this.actor.occupant?.team??(this.actor.pilotable?0:1);
  if(this.dead||this.disposed||!Number.isFinite(amount)||amount<=0||src?.team===team)return 0;
  const damage=Math.min(this.cover.hp,amount);this.cover.hp-=damage;if(this.cover.hp<=0)this.destroy(src);return damage;
 }
 retire(){
  const w=this.game.world;for(const a of [w.cover,w.coverAll]){const i=a.indexOf(this.cover);if(i>=0)a.splice(i,1);}w.refreshFogBoxes?.();
 }
 destroy(src){
  if(this.dead||this.disposed)return;this.dead=true;this.source.alive=false;this.cover.hp=0;this.retire();this.actor.wrapper.visible=false;this.actor.sound?.stop();this.actor.mixer?.stopAllAction();
  const g=this.game,p=this.actor.wrapper.position.clone();g.vfx?.flash?.(p,'#ffb85c',22,.6);g.particles?.burst(p.x,p.y,p.z,{count:36,speed:24,life:1.2,size:5,color:['#ffbc68','#39352e'],up:8,grav:12});g.audio?.soundLibrary?.play('vehicle-explosion',{pos:p});g.news?.highlight?.('car','GUNSHIP DISABLED',{dur:2.2,priority:2,focus:p});
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.source.alive=false;this.retire();this.mount.removeFromParent();const materials=new Set();this.mount.traverse(o=>{o.geometry?.dispose();if(o.material)materials.add(o.material);});for(const m of materials)m.dispose();}
}

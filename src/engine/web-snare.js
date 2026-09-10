import * as THREE from 'three';
import {coverBoxEntry,terrainEntry} from './projectile-contact.js';
import {reachArm} from './hero-rig.js';

const from=new THREE.Vector3(),to=new THREE.Vector3(),delta=new THREE.Vector3(),point=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
const interrupted=f=>!f.alive||f._formDisposed||f.staggerT>0||f.stunT>0||f.frozenT>0||f.downedT>0||f.sleepT>0||f.grabbedBy||f._vehicle||f._grapple;
function blocked(world,a,b){
 if(terrainEntry(world,a,b,.04)<1)return true;
 for(const c of world.cover||[]){
  if(c.destroyed||c.hp<=0)continue;
  const box={...c,hx:c.hx??c.r,hz:c.hz??c.r};
  if(coverBoxEntry(a,b,box,.05)<1)return true;
 }
 return false;
}

export function beginWebSnare(c,def,slot,g){
 if(c._webSnare||interrupted(c))return false;
 c.center(from);let target=null,nearest=def.range||38;
 const aim=c.aim3.clone().normalize();
 for(const f of g.entities||[]){
  if(!g.isFoe(c,f)||!f.alive||f.phase||f.invuln>0||f.grabbedBy||f._vis<.4)continue;
  f.center(to);delta.subVectors(to,from);const distance=delta.length();
  if(distance>nearest||distance<.1||delta.multiplyScalar(1/distance).dot(aim)<Math.cos(def.arc??.45)||blocked(g.world,from,to))continue;
  target=f;nearest=distance;
 }
 if(!target)return false;
 const geometry=new THREE.CylinderGeometry(.065,.065,1,7,1,true),material=new THREE.MeshBasicMaterial({color:def.color||'#eaffff'});
 const line=new THREE.Mesh(geometry,material);line.name='web-snare-strand';line.frustumCulled=false;g.scene.add(line);
 c.parts.armR.children[2].getWorldPosition(from);
 c._webSnare={def,slot,target,line,rig:c.parts.rig,tip:from.clone(),age:0,phase:'reach',hold:0};
 slot.phase='reach';c.state='cast';c.stateT=0;c._castPoseRanged=false;
 g.audio.zap(780,c.pos);updateWebSnareVisual(c);return true;
}

export function clearWebSnare(c){
 const s=c._webSnare;if(!s)return;
 if(s.target.grabbedBy===c){s.target.grabbedBy=null;if(s.target.state==='hit')s.target.state='idle';}
 s.slot.phase=null;s.slot.foe=null;
 s.line.removeFromParent();s.line.geometry.dispose();s.line.material.dispose();c._webSnare=null;
}

// Simulation clock owns the web independently of held input. Releasing LMB
// cannot abandon a seized victim; interruption and form retirement always free it.
export function updateWebSnare(c,dt,g){
 const s=c._webSnare;if(!s)return;
 const f=s.target;
 if(interrupted(c)||s.rig!==c.parts.rig||!Object.values(c.slots).includes(s.slot)||!f.alive||f.phase||f._formDisposed||s.phase==='hold'&&f.grabbedBy!==c){clearWebSnare(c);return;}
 if(c.hitstop>0||f.hitstop>0)return;
 c.parts.armR.children[2].getWorldPosition(from);f.center(to);
 if(from.distanceTo(to)>(s.def.range||38)+12||blocked(g.world,from,to)){clearWebSnare(c);return;}
 s.age+=dt;
 if(s.phase==='reach'){
  delta.subVectors(to,s.tip);const distance=delta.length(),step=(s.def.webSpeed||100)*dt;
  if(distance>step){s.tip.addScaledVector(delta,step/distance);return;}
  if(f.invuln>0||f.grabbedBy){clearWebSnare(c);return;}
  s.tip.copy(to);s.phase=s.slot.phase='hold';f.grabbedBy=c;f.state='hit';f.vel.set(0,0,0);g.audio.hit(180,f.pos);
 }
 s.hold+=dt;s.tip.copy(to);
 // Pull through the existing body's swept cover/terrain physics, never assign
 // a target position through a wall. Stop short of the attacker's body.
 delta.subVectors(c.pos,f.pos);const distance=delta.length(),separation=(c.radius||3)+(f.radius||3)+2;
 const speed=Math.min(60,Math.max(0,distance-separation)*7);
 if(distance>.01)f.vel.copy(delta).multiplyScalar(speed/distance);
 f.burstT=Math.max(f.burstT||0,.1);
 if(f.teleEscape&&f.ki>=14&&s.hold>(s.def.holdT||.5)*.5){f.ki-=14;f.invuln=Math.max(f.invuln,.35);g.audio.teleport();clearWebSnare(c);return;}
 if(s.hold<(s.def.holdT||.5))return;
 const damage=(s.def.damage||13)*c.powerBuff,impact=to.clone();
 clearWebSnare(c);
 f.takeDamage(damage,{src:c,unblockable:true,strike:true,hitstop:.1,kb:{x:c.aim.x*(s.def.throwSpeed||86)*.55,y:18,z:c.aim.z*(s.def.throwSpeed||86)*.55}});
 g.vfx.impact(impact,c.aim,{color:s.def.color||'#eaffff',power:1.1});g.audio.impact(.85,impact);g.world.shake(.7);
}

export function poseWebSnare(c){
 const s=c._webSnare;if(!s||s.rig!==c.parts.rig)return;
 const arm=c.parts.armR;arm.getWorldPosition(from);s.target.center(to);
 delta.subVectors(to,from).normalize().multiplyScalar((arm.userData.upperLength+arm.userData.foreLength)*.88);
 point.copy(from).add(delta);arm.parent.worldToLocal(point);reachArm(arm,point,1);
}

export function updateWebSnareVisual(c){
 const s=c._webSnare;if(!s)return;
 c.parts.armR.children[2].getWorldPosition(from);if(s.phase==='hold')s.target.center(s.tip);
 delta.subVectors(s.tip,from);const length=delta.length();
 s.line.visible=c.obj.visible&&length>.01;s.line.position.copy(from).lerp(s.tip,.5);s.line.scale.set(1,length,1);
 if(length>.01)s.line.quaternion.setFromUnitVectors(up,delta.multiplyScalar(1/length));
}

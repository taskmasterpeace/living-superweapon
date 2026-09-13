import {slotUnlocked} from '../data/progression.js';
import {updateTetherChain} from './tether-chain.js';
import * as THREE from 'three';
import {handEmissionPosition} from './hand-emission.js';
import {reachArm} from './hero-rig.js';

// A tethered point-to-surface reel, deliberately not pendulum/web swinging.
const origin=new THREE.Vector3(),direction=new THREE.Vector3(),next=new THREE.Vector3(),hand=new THREE.Vector3();
const live=c=>!c.destroyed&&!(c.hp<=0)&&c.mesh?.visible!==false;
function bounds(c){return [c.x-(c.hx??c.r),c.x+(c.hx??c.r),c.bottom??0,c.top??c.h,c.z-(c.hz??c.r),c.z+(c.hz??c.r)];}
function rayBox(o,d,c,range){
 const b=bounds(c);if(!b.every(Number.isFinite))return null;
 let near=0,far=range,normal=null;
 for(const [axis,lo,hi]of [['x',b[0],b[1]],['y',b[2],b[3]],['z',b[4],b[5]]]){
  if(Math.abs(d[axis])<1e-8){if(o[axis]<lo||o[axis]>hi)return null;continue;}
  let a=(lo-o[axis])/d[axis],z=(hi-o[axis])/d[axis],sign=-1;
  if(a>z){[a,z]=[z,a];sign=1;}
  if(a>near){near=a;normal={x:0,y:0,z:0};normal[axis]=sign;}
  far=Math.min(far,z);if(near>far)return null;
 }
 return near>.05&&normal?{t:near,normal}:null;
}
export function findWebZipAnchor(f,world,range=150){
 origin.copy(f.pos);origin.y+=5.2;direction.copy(f.aim3||f.aim);
 if(!Number.isFinite(direction.lengthSq())||direction.lengthSq()<1e-8)return null;direction.normalize();
 let best=null;
 for(const c of world.cover||[]){if(!live(c))continue;const hit=rayBox(origin,direction,c,range);if(hit&&(!best||hit.t<best.t))best={...hit,anchor:c};}
 // Moving hulls block the line but cannot serve as a stationary world anchor.
 if(!best||best.anchor.frontlineVehicle||best.anchor.frontlineAircraft||best.anchor.construct||best.t<8)return null;
 const a=best.anchor;
 return {...best,x:origin.x+direction.x*best.t,y:origin.y+direction.y*best.t,z:origin.z+direction.z*best.t,top:a.top??a.h};
}
export function webZipDestination(f,hit){
 const n=hit.normal,pad=(f.radius||3)+.5;
 const dest={x:hit.x+n.x*pad,y:hit.y-6.6,z:hit.z+n.z*pad};
 if(n.y>.5)dest.y=hit.y+.08;
 dest.y=Math.max(f._game?.world?.heightAt?.(dest.x,dest.z)??0,dest.y);
 return dest;
}
export function beginWebZip(f,hit,def){
 const dest=webZipDestination(f,hit);
 f._grapple={...hit,zip:true,dest,color:def.color||'#eaffff',speed:def.zipSpeed||90,maxT:(def.range||150)/(def.zipSpeed||90)+1,t:0};
 f.flying=f.gliding=false;f.vel.set(0,0,0);f._flyPrev=!!f.flyHeld;
}
function clearBody(f,p,world){
 const r=f.radius||3,h=12*(f.sizeScale||1),limit=(world.ARENA??900)-r;
 if(Math.abs(p.x)>limit||Math.abs(p.z)>limit)return false;
 if(p.y<(world.heightAt?.(p.x,p.z)??0)-.05)return false;
 for(const c of world.cover||[]){if(!live(c))continue;const b=bounds(c);if(p.y>=b[3]-.02||p.y+h<=b[2])continue;
  if(p.x>b[0]-r&&p.x<b[1]+r&&p.z>b[4]-r&&p.z<b[5]+r)return false;
 }return true;
}
function ropeClear(f,G,world){
 origin.copy(f.pos);origin.y+=6.6;direction.set(G.x-origin.x,G.y-origin.y,G.z-origin.z);const range=direction.length();direction.normalize();
 for(const c of world.cover||[]){if(c===G.anchor||!live(c))continue;if(rayBox(origin,direction,c,range-.1))return false;}return true;
}
export function updateWebZip(f,dt,game){
 const G=f._grapple?.zip?f._grapple:f.hanging?.zip?f.hanging:null;if(!G)return false;
 if(!(dt>0)||!Number.isFinite(dt))return true;
 const w=game.world;
 if(!f.alive||f._formDisposed||f.staggerT>.25||f.frozenT>0||f.stunT>0||f.grabbedBy||!live(G.anchor)||!w.cover.includes(G.anchor)||!ropeClear(f,G,w)){
  f.releaseHang();f.vel.set(0,0,0);return true;
 }
 f.flying=f.gliding=false;
 if(f.descendHeld||(f.flyHeld&&!f._flyPrev)){
  const jump=f.flyHeld&&!f._flyPrev;f.releaseHang();f.vel.set(G.normal.x*12,jump?30:0,G.normal.z*12);f._flyPrev=!!f.flyHeld;return true;
 }
 f._flyPrev=!!f.flyHeld;
 if(f.hanging){f.pos.set(G.dest.x,G.dest.y,G.dest.z);f.vel.set(0,0,0);return true;}
 G.t+=dt;if(G.t>G.maxT){f.releaseHang();f.vel.set(0,0,0);return true;}
 if(!f._grapLoop&&game.audio?.sustain)f._grapLoop=game.audio.sustain('bow',f.pos);f._grapLoop?.set(.6,f.pos);
 const delta=direction.set(G.dest.x-f.pos.x,G.dest.y-f.pos.y,G.dest.z-f.pos.z),distance=delta.length();
 const travel=Math.min(distance,G.speed*Math.min(dt,.1)),steps=Math.max(1,Math.ceil(travel/.5));delta.normalize();
 for(let i=0;i<steps;i++){
  next.copy(f.pos).addScaledVector(delta,travel/steps);
  if(!clearBody(f,next,w)){f.releaseHang();f.vel.set(0,0,0);return true;}
  f.pos.copy(next);
 }
 f.vel.copy(delta).multiplyScalar(G.speed);f.groundY=w.heightAt?.(f.pos.x,f.pos.z)??0;f.onBlock=false;
 if(distance-travel<.05){
  f.vel.set(0,0,0);f._grapLoop?.stop();f._grapLoop=null;f._grapple=null;
  if(G.normal.y>.5){f.onBlock=true;f.releaseHang();}else{f.hanging=G;game.hud?.feed?.('WEB HOLD · SPACE leap away · CTRL drop · SHIFT release',G.color);}
 }
 return true;
}
export function presentWebZip(f){
 const G=f._grapple?.zip?f._grapple:f.hanging?.zip?f.hanging:null;
 if(!G)return false;
 const arm=f.parts?.armR;
 if(arm){f.obj.updateWorldMatrix(true,true);hand.set(G.x,G.y,G.z);arm.parent.worldToLocal(hand);reachArm(arm,hand,1,Math.min(1,G.t*12));f.obj.updateWorldMatrix(true,true);}
 if(!f._grapLine){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(6),3));
  f._grapLine=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:G.color,transparent:true,opacity:.95}));f._grapLine.frustumCulled=false;f._game.scene.add(f._grapLine);}
 handEmissionPosition(f,1,hand);const positions=f._grapLine.geometry.attributes.position;
 positions.setXYZ(0,hand.x,hand.y,hand.z);positions.setXYZ(1,G.x,G.y,G.z);positions.needsUpdate=true;
 next.set(G.x,G.y,G.z);updateTetherChain(f._grapLine,hand,next,G.color);
 f._grapLine.material.opacity=.25;f._grapLine.material.color.set(G.color);f._grapLine.visible=true;return true;
}

export function planWebZipAI(f,target,world){
 if(!target?.alive||f.noPowers)return null;
 const entry=Object.entries(f.slots||{}).find(([key,s])=>s.def.zip&&slotUnlocked(f,key)&&s.cd<=0&&f.ki>=(s.def.cost||0));if(!entry)return null;
 const distance=f.pos.distanceTo(target.pos);if(distance<45)return null;
 const aim=target.pos.clone().sub(f.pos).normalize(),probe=Object.create(f);probe.aim3=aim;
 const [key,slot]=entry,hit=findWebZipAnchor(probe,world,slot.def.range||150);if(!hit)return null;
 const dest=webZipDestination(f,hit),error=Math.hypot(dest.x-target.pos.x,dest.y-target.pos.y,dest.z-target.pos.z);if(error>distance*.65)return null;
 const p=new THREE.Vector3(),end=new THREE.Vector3(dest.x,dest.y,dest.z);for(let i=1;i<=24;i++){p.copy(f.pos).lerp(end,i/24);if(!clearBody(f,p,world))return null;}
 return {key,hit};
}
export function driveWebZipAI(f,it,g){
 const zip=f._grapple?.zip||f.hanging?.zip;
 if(zip){it.move={x:0,z:0};it.slots={};it.fly=false;if(f.hanging){f._aiZipReleaseAt??=(g.time||0)+.35;it.fly=(g.time||0)>=f._aiZipReleaseAt;}return true;}
 f._aiZipReleaseAt=null;
 if(!f._openSky||f.flying||f._grapple||f.hanging||f.launchT>0||!f.alive||f.staggerT>0||f.stunT>0||f.frozenT>0||f.grabbedBy||f.grabbing||f._carry||f.guarding||f.meleeCharge>0||f.strikeActive>0||f._traversalLeap?.active||Object.values(f.slots||{}).some(s=>s.active||s.charging))return false;
 if((g.time||0)<(f._aiZipNext||0)||!it.target||!g.canSee(f,it.target))return false;
 f._aiZipNext=(g.time||0)+1.5;const plan=planWebZipAI(f,it.target,g.world);if(!plan)return false;
 it.move={x:0,z:0};it.fly=false;it.aimAt={x:plan.hit.x,y:plan.hit.y-4.6,z:plan.hit.z};it.slots={[plan.key]:{pressed:true,held:false,released:false}};return true;
}

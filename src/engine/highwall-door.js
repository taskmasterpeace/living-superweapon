import * as THREE from 'three';
import {buildFortificationKit} from './fortification-kit.js';

function intersectsActors(box,actors){
 return actors.some(f=>{
  // Use the same footprint that stopped the actor against the closed leaf.
  // An inflated minimum falsely obstructs opening from the interaction face.
  const radius=Number.isFinite(f.radius)&&f.radius>0?f.radius:3.5;
  return f.alive&&f.pos&&Math.abs(f.pos.x-box.x)<box.hx+radius&&Math.abs(f.pos.z-box.z)<box.hz+radius&&f.pos.y<box.top&&f.pos.y+12*(f.sizeScale||1)>box.bottom;
 });
}

/** One leaf, one mutable world collider. Publish bounds to nav without rebuilding scenery. */
export class HighwallDoor {
 constructor({scene,box,open=false,actors=()=>[],onProgress=()=>{},onBlocked=()=>{}}){
  this.closed={...box};this.actors=actors;this.onProgress=onProgress;this.onBlocked=onBlocked;this.fraction=open?1:0;this.targetOpen=!!open;this.duration=.65;
  this.height=box.top-(box.bottom||0);this.travel=this.height+2;
  this.collider={...box,id:box.id||'service-gate',kind:'gate',finiteBuilding:true,projectileShape:'box',hp:Infinity,maxHp:Infinity};
  this.group=new THREE.Group();this.group.name='HIGHWALL / moving service gate';
  this.leaf=buildFortificationKit([{id:'moving-leaf',moduleId:'tall-closed-gate',y:-this.height/2,span:box.hx*2,height:this.height,depth:box.hz*2}]);this.group.add(this.leaf);
  const gold=new THREE.MeshStandardMaterial({color:0xd9b54d,roughness:.9});
  this.stripe=new THREE.Mesh(new THREE.BoxGeometry(box.hx*2,.7,box.hz*2+.02),gold);this.stripe.visible=false;this.group.add(this.stripe);
  scene?.add(this.group);this.apply();
 }
 get open(){return this.targetOpen;}
 get moving(){return Math.abs(this.fraction-(this.targetOpen?1:0))>1e-6;}
 request(open){
  if(this.disposed)return false;
  if(!open&&intersectsActors(this.closed,this.actors())){this.onBlocked('Gate blocked: occupied threshold');return false;}
  this.targetOpen=!!open;return true;
 }
 apply(){
  const lift=this.fraction*this.travel,bottom=(this.closed.bottom||0)+lift;
  this.collider.bottom=bottom;this.collider.top=bottom+this.height;this.collider.h=this.collider.top;
  this.leaf.position.set(this.closed.x,bottom+this.height/2,this.closed.z);
  this.stripe.position.set(this.closed.x,bottom+this.height-3,this.closed.z);
  this.onProgress(this.fraction,this.targetOpen,this.collider);
 }
 tick(dt){
  if(this.disposed||!this.moving)return;
  const step=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0))/this.duration;
  const raw=Math.max(0,Math.min(1,this.fraction+(this.targetOpen?step:-step)));
  const next=Math.abs(raw-(this.targetOpen?1:0))<1e-6?(this.targetOpen?1:0):raw;
  const bottom=(this.closed.bottom||0)+next*this.travel;
  const sweep={...this.collider,bottom:Math.min(bottom,this.collider.bottom),top:Math.max(bottom+this.height,this.collider.top)};
  if(intersectsActors(sweep,this.actors())){
   // Never move into bodies. A closing leaf reverses; a rising leaf waits for overhead clearance.
   if(!this.targetOpen)this.targetOpen=true;
   if(!this.blocked)this.onBlocked('Gate obstructed: waiting for clearance');this.blocked=true;return;
  }
  this.blocked=false;this.fraction=next;this.apply();
 }
 snapshot(){return {fraction:this.fraction,targetOpen:this.targetOpen};}
 dispose(){if(this.disposed)return;this.disposed=true;this.group.removeFromParent();this.leaf.userData.dispose();this.stripe.geometry.dispose();this.stripe.material.dispose();}
}

import * as THREE from 'three';
import {ShieldSurfaceMaterial} from './shield-surface.js';

// Bounded pose history, independent of input, damage and animation evaluation.
// The hierarchy includes skinned bones as well as the procedural rig pivots.
export class MeleeRecording {
 constructor({seconds=8,hz=30}={}){this.seconds=seconds;this.interval=1/hz;this.frames=[];this.events=[];this.actors=[];this.last=-Infinity;}
 mark(time,event){this.events.push({...event,time});if(this.events.length>128)this.events.shift();}
 bind(actors){this.clear();this.actors=actors.map(f=>{const nodes=[];f.obj.traverse(n=>nodes.push(n));return {fighter:f,nodes,template:cloneReviewActor(f.obj)};});}
 capture(time){
  if(time-this.last<this.interval-1e-6||!this.actors.length)return;
  // Keep the recorded rig stable when live contact effects add/remove children.
  // Each session owns a visual template, and indexes source node references.
  this.last=time;
  const actors=this.actors.map(({fighter:f,nodes})=>({pose:Float32Array.from(nodes.flatMap(n=>[...n.position.toArray(),...n.quaternion.toArray(),...n.scale.toArray(),+n.visible,n.material?.opacity??1])),hp:f.hp,ki:f.ki,phase:f.mstate||f.grabState||(f.grabbedBy?'held':f.staggerT>0?'staggered':f.guarding?'guard':f.alive?'ready':'ko')}));
  this.frames.push({time,actors});while(this.frames.length>1&&time-this.frames[0].time>this.seconds)this.frames.shift();
  this.events=this.events.filter(e=>e.time>=this.frames[0].time);
 }
 clear(){for(const a of this.actors)a.template?.dispose();this.frames=[];this.events=[];this.actors=[];this.last=-Infinity;}
}

// Copy only rendering data. Object3D.userData contains live gameplay references
// and callbacks, so ordinary deep cloning is inappropriate for a review actor.
export function cloneReviewActor(root){
 const map=new Map(),materials=new Map();
 const material=m=>{if(!materials.has(m))materials.set(m,m instanceof ShieldSurfaceMaterial?new ShieldSurfaceMaterial(m.color).copy(m):m.clone());return materials.get(m);};
 function copy(n){
  const m=n.material?(Array.isArray(n.material)?n.material.map(material):material(n.material)):null;
  const c=n.isSkinnedMesh?new THREE.SkinnedMesh(n.geometry,m):n.isMesh?new THREE.Mesh(n.geometry,m):n.isBone?new THREE.Bone():n.isSprite?new THREE.Sprite(m):new THREE.Object3D();
  c.name=n.name;c.position.copy(n.position);c.quaternion.copy(n.quaternion);c.scale.copy(n.scale);c.visible=n.visible;c.renderOrder=n.renderOrder;c.frustumCulled=false;
  if(n.morphTargetInfluences)c.morphTargetInfluences=[...n.morphTargetInfluences];
  map.set(n,c);for(const child of n.children)c.add(copy(child));return c;
 }
 const model=copy(root);
 root.traverse(n=>{if(n.isSkinnedMesh){const c=map.get(n);c.bindMode=n.bindMode;c.bind(new THREE.Skeleton(n.skeleton.bones.map(b=>map.get(b)),n.skeleton.boneInverses.map(m=>m.clone())),n.bindMatrix);c.bindMatrixInverse.copy(n.bindMatrixInverse);}});
 const nodes=[];model.traverse(n=>nodes.push(n));
 return {model,nodes,dispose(){model.removeFromParent();for(const m of materials.values())m.dispose();model.traverse(n=>n.skeleton?.dispose());}};
}

export function applyReviewPose(nodes,a,b,mix){
 const q=new THREE.Quaternion(),v=new THREE.Vector3();
 for(let i=0;i<nodes.length;i++){
  const n=nodes[i],k=i*12;n.position.fromArray(a,k).lerp(v.fromArray(b,k),mix);
  n.quaternion.fromArray(a,k+3).slerp(q.fromArray(b,k+3),mix);
  n.scale.fromArray(a,k+7).lerp(v.fromArray(b,k+7),mix);n.visible=!!(mix<.5?a:b)[k+10];
  if(n.material&&!Array.isArray(n.material))n.material.opacity=THREE.MathUtils.lerp(a[k+11],b[k+11],mix);
 }
}

export function reviewFrame(frames,time){
 let i=0;while(i<frames.length-1&&frames[i+1].time<time)i++;
 const a=frames[i],b=frames[Math.min(i+1,frames.length-1)];return {a,b,mix:a===b?0:THREE.MathUtils.clamp((time-a.time)/(b.time-a.time),0,1)};
}

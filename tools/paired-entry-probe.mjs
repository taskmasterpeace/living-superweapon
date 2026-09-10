import * as THREE from 'three';
import {pairedCombatFixture} from './helpers/paired-combat-fixture.mjs';
import {updateLimbSurfaces} from '../src/engine/hero-limb-surface.js';
import {trunkProbe} from './helpers/trunk-probe.mjs';

const hz=Number(process.argv[2]||60),entry=Math.round(hz*.2);
const x=pairedCombatFixture({hz}),{f}=x,inside=trunkProbe(f.parts.torso),point=new THREE.Vector3();
for(let i=0;i<hz*1.5;i++)x.step();for(let i=0;i<entry;i++)x.sequence(i);
const previousTorso=f.parts.torso.quaternion.clone();
const prev=[f.parts.armL,f.parts.armR].map(a=>({q:previousTorso.clone().invert().multiply(a.quaternion),elbow:-a.children[1].rotation.x})),pre=[];
for(const [index,arm]of [f.parts.armL,f.parts.armR].entries()){
 const fn=arm.quaternion.slerpQuaternions;
 arm.quaternion.slerpQuaternions=function(a,b,t){
  const stack=new Error().stack;
  if(stack.includes('constrainArmTorso')&&!pre[index])pre[index]={q:a.clone(),elbow:-arm.children[1].rotation.x};
  return fn.call(this,a,b,t);
 };
}
x.sequence(entry);
const post=[f.parts.armL,f.parts.armR].map(a=>a.quaternion.clone());
for(let i=0;i<2;i++){
 const arm=[f.parts.armL,f.parts.armR][i];
 if(pre[i])arm.quaternion.copy(pre[i].q);
}
updateLimbSurfaces(f.parts,true);const inverse=f.parts.torso.matrixWorld.clone().invert(),crossings=[];
for(let a=0;a<2;a++){
 const arm=[f.parts.armL,f.parts.armR][a],surface=f.parts.rig.limbSurfaces.find(s=>s.upper===arm.children[0]),vertices=surface.mesh.geometry.attributes.position;
 const join=surface.rows.findIndex(row=>row.driver===arm.children[0]);
 for(let row=0;row<=join;row++)for(let j=0;j<surface.segments;j++){
  point.fromBufferAttribute(vertices,row*surface.segments+j).applyMatrix4(surface.mesh.matrixWorld);
  if(inside(point,inverse))crossings.push({arm:a,row,j});
 }
}
console.log(JSON.stringify({hz,pre:pre.map((p,i)=>({elbow:p.elbow,limitedRate:prev[i].q.angleTo(f.parts.torso.quaternion.clone().invert().multiply(p.q))*hz,projection:p.q.angleTo(post[i])})),crossings},null,2));x.close();

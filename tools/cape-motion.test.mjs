import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {figure} from '../src/engine/figure.js';
import {animateCape} from '../src/engine/hero-rig.js';
import {Fighter} from '../src/engine/entity.js';
import {queueHitReaction} from '../src/engine/hit-reaction.js';
import {ROSTER} from '../src/data/characters.js';
const sol=ROSTER.find(d=>d.id==='sol');
function withRig(run,def=sol){const p=figure(def);try{run(p);}finally{p.g.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m?.dispose();});}}
function row(p,fraction,world=false){const a=p.cape.geometry.attributes.position,r=p.cape.userData.rest,max=Math.max(...Array.from(r).filter((_,i)=>i%3===1)),min=Math.min(...Array.from(r).filter((_,i)=>i%3===1)),out=[];p.g.updateMatrixWorld(true);for(let i=0;i<a.count;i++)if(Math.abs((max-r[i*3+1])/(max-min)-fraction)<.01){const v=new Vector3().fromBufferAttribute(a,i);out.push(world?p.cape.localToWorld(v):v);}return out;}
const mean=points=>points.reduce((a,b)=>a.add(b),new Vector3()).divideScalar(points.length);

test('hover cloth has crosswise folds rather than a nearly flat panel',()=>withRig(p=>{
 animateCape(p,0,0,new Vector3());const mid=row(p,.5),depth=mid.map(v=>v.z);
 assert.ok(Math.max(...depth)-Math.min(...depth)>.2,'mid-cape must have readable folded volume at rest');
}));
test('cape attachment stays behind the framed chest instead of cutting through it',()=>withRig(p=>{
 animateCape(p,0,0,new Vector3());p.g.updateMatrixWorld(true);
 const seam=row(p,0,true).map(v=>p.torso.worldToLocal(v));
 assert.ok(seam.every(v=>v.z<-.82),'cape seam must clear the chest back including bulk scaling');
}));
test('custom-sized capes attach at the shoulder and retain body-relative length',()=>{
 for(const scale of [.65,1.5])withRig(p=>{
  animateCape(p,0,0,new Vector3());const seam=mean(row(p,0,true)),hem=mean(row(p,1,true));
  const shoulder=p.torso.localToWorld(new Vector3(0,1.18,-.8));
  assert.ok(Math.abs(seam.y-shoulder.y)<.15*scale,`scale ${scale}: seam misses shoulder by ${seam.y-shoulder.y}`);
  assert.ok((seam.y-hem.y)/scale>4.5&&(seam.y-hem.y)/scale<5.4,'cloth length must scale with the body');
 },{...sol,frame:{scale,bulk:1.65}});
});
test('small speed changes do not reset flutter phase late in a match',()=>withRig(p=>{
 animateCape(p,10000,30,new Vector3(0,0,30));const before=p.cape.geometry.attributes.position.array.slice();
 animateCape(p,10000+1/60,30.1,new Vector3(0,0,30.1));const after=p.cape.geometry.attributes.position.array;
 let jump=0;for(let i=0;i<after.length;i+=3)jump=Math.max(jump,Math.hypot(after[i]-before[i],after[i+1]-before[i+1],after[i+2]-before[i+2]));
 assert.ok(jump<.12,`tiny velocity change caused ${jump.toFixed(3)} units of cloth teleport`);
}));
test('lateral airflow trails opposite travel on either side without moving attachment',()=>withRig(p=>{
 const tops=[];for(const side of [-1,1]){animateCape(p,1,65,new Vector3(side*65,0,0));const top=mean(row(p,0)),tail=mean(row(p,1));tops.push(top);assert.ok((tail.x-top.x)*side<-.35,'hem must trail against lateral motion');}
 assert.ok(tops[0].distanceTo(tops[1])<1e-6,'shoulder seam must stay attached');
}));
test('repeated seeks reproduce cape vertices without accumulated drift',()=>withRig(p=>{
 animateCape(p,1,65,new Vector3(0,0,65));const expected=p.cape.geometry.attributes.position.array.slice();
 animateCape(p,42,10,new Vector3(10,0,0));animateCape(p,1,65,new Vector3(0,0,65));
 assert.deepEqual(p.cape.geometry.attributes.position.array,expected);
}));
test('cape airflow uses world direction after the carrier turns',()=>withRig(p=>{
 animateCape(p,2,65,new Vector3(65,0,0));const baseline=p.cape.geometry.attributes.position.array.slice();
 p.g.rotation.y=Math.PI/2;animateCape(p,2,65,new Vector3(0,0,-65));
 const turned=p.cape.geometry.attributes.position.array;for(let i=0;i<turned.length;i++)assert.ok(Math.abs(turned[i]-baseline[i])<1e-5,'equivalent local wind must give equivalent cloth');
}));
test('animated cloth remains in its culling bounds across velocity reversals',()=>withRig(p=>{
 p.cape.geometry.computeBoundingBox();
 for(const v of [new Vector3(),new Vector3(210,80,0),new Vector3(-210,-80,0),new Vector3(0,0,-120)]){
  animateCape(p,3,v.length(),v);const g=p.cape.geometry,s=g.boundingSphere;
  assert.ok(s,'animated geometry needs current culling bounds');
  for(let i=0;i<g.attributes.position.count;i++){const at=new Vector3().fromBufferAttribute(g.attributes.position,i);assert.ok(at.distanceTo(s.center)<=s.radius+1e-5,'hem cannot escape its culling sphere');assert.ok(g.boundingBox.clone().expandByScalar(1e-5).containsPoint(at),'cached authoring bounds must follow the deformed cloth');}
 }
}));
test('the eight-second authoring loop wraps without a cloth pop',()=>withRig(p=>{
 animateCape(p,8-1/120,0,new Vector3());const before=p.cape.geometry.attributes.position.array.slice();
 animateCape(p,0,0,new Vector3());const after=p.cape.geometry.attributes.position.array;
 let jump=0;for(let i=0;i<after.length;i+=3)jump=Math.max(jump,Math.hypot(after[i]-before[i],after[i+1]-before[i+1],after[i+2]-before[i+2]));
 assert.ok(jump<.03,`preview loop jumps ${jump.toFixed(3)} units at its wrap`);
}));
test('production recoil leaves cape airflow solved in the final displayed carrier',()=>{
 const f=new Fighter(sol);try{
  Object.assign(f,{_openSky:true,flying:true,gait:'airborne',_flyPose:1,animT:2});f.pos.set(0,80,0);f.vel.set(40,0,40);
  for(let i=0;i<60;i++)f._animate(1/60);
  queueHitReaction(f,50,{kb:new Vector3(60,30,0)});f._animate(1/30);
  const actual=f.parts.cape.geometry.attributes.position.array.slice();
  // Same time/velocity and current final transforms: another cloth solve must be a no-op.
  // This catches the production integration applying recoil AFTER solving the cloth.
  animateCape(f.parts,f.animT,f.vel.length(),f.vel);
  const settled=f.parts.cape.geometry.attributes.position.array;let error=0;
  for(let i=0;i<actual.length;i++)error=Math.max(error,Math.abs(actual[i]-settled[i]));
  assert.ok(error<1e-5,`production cloth used a stale carrier (${error.toFixed(3)} units)`);
 }finally{f.dispose();}
});

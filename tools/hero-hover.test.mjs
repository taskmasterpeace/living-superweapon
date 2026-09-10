import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {profileFromDef,applyProfile,validateProfile,resetFlightStyle} from '../src/tool/studio-profile.js';

const base=ROSTER.find(d=>d.id==='sol');
function fixture(profile=profileFromDef(base)){
 const f=new Fighter(applyProfile(base,profile));Object.assign(f,{_openSky:true,flying:true,gait:'airborne',_flyPose:1});f.pos.set(12,80,-20);
 return f;
}
const world=o=>o.getWorldPosition(new THREE.Vector3());
function sample(f){
 f.obj.updateMatrixWorld(true);const p=f.parts;
 return {hands:[world(p.armL.children[2]),world(p.armR.children[2])],shoulders:[world(p.armL),world(p.armR)],pelvis:world(p.pelvis),boots:[world(p.legL.userData.boot),world(p.legR.userData.boot)]};
}
// Probe rendered volume, not just elbow/weapon centerlines or overlapping AABBs.
function surfaceInVolume(mesh,body){
 const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),hit=new THREE.Vector3(),ray=new THREE.Ray();
 const direction=new THREE.Vector3(.872,.391,.294).normalize(),position=mesh.geometry.attributes.position,index=mesh.geometry.index,samples=[];
 for(let i=0;i<position.count;i++)samples.push(new THREE.Vector3().fromBufferAttribute(position,i));
 for(let i=0;i<(index?index.count:position.count);i+=3)samples.push(new THREE.Vector3().fromBufferAttribute(position,index?index.getX(i):i).add(a.fromBufferAttribute(position,index?index.getX(i+1):i+1)).add(b.fromBufferAttribute(position,index?index.getX(i+2):i+2)).multiplyScalar(1/3));
 const bp=body.geometry.attributes.position,bi=body.geometry.index;
 return samples.filter(point=>{
  body.worldToLocal(point.applyMatrix4(mesh.matrixWorld));ray.set(point,direction);const intersections=[];
  for(let i=0;i<(bi?bi.count:bp.count);i+=3){
   a.fromBufferAttribute(bp,bi?bi.getX(i):i);b.fromBufferAttribute(bp,bi?bi.getX(i+1):i+1);c.fromBufferAttribute(bp,bi?bi.getX(i+2):i+2);
   if(ray.intersectTriangle(a,b,c,false,hit)){const distance=hit.distanceTo(point);if(distance>1e-5&&!intersections.some(d=>Math.abs(d-distance)<1e-4))intersections.push(distance);}
  }
  return intersections.length%2===1;
 }).length;
}

for(const bulk of [.79,1.2,1.65])test(`hero hover keeps an authored bow outside the thigh volumes at bulk ${bulk}`,()=>{
 const def=ROSTER.find(d=>d.id==='gale'),profile=resetFlightStyle(profileFromDef(def),'hero');profile.frame.bulk=bulk;
 const f=new Fighter(applyProfile(def,profile));
 try{Object.assign(f,{_openSky:true,flying:true,gait:'airborne',_flyPose:1});f.pos.set(0,80,0);
  for(let i=0;i<240;i++){f.animT=i/120;f._animate(1/120);}f.obj.updateMatrixWorld(true);
  const bows=[];for(const root of f.parts.armL.children[2].children)root.traverse(o=>{if(o.isMesh&&o.geometry.type==='TorusGeometry')bows.push(o);});
  assert.equal(bows.length,1);for(const leg of [f.parts.legL,f.parts.legR])assert.equal(surfaceInVolume(bows[0],leg.userData.thigh),0,'bow penetrates a thigh');
 }finally{f.dispose();}
});

for(const hz of [30,60,120])test(`hero hover lowers fists and distinguishes tucked/long legs at ${hz}Hz`,()=>{
 const f=fixture();try{const root=f.pos.toArray(),scale=f.def.frame.scale;
  for(let i=0;i<hz*2;i++){f.animT=i/hz;f._animate(1/hz);}
  const p=sample(f);
  for(let i=0;i<2;i++){
   assert.ok(p.hands[i].y<p.pelvis.y+.7*scale,'relaxed fist stays too high');
   assert.ok(p.hands[i].z-p.shoulders[i].z<1*scale,'hero is holding both forearms forward instead of lowering fists');
   assert.ok((p.hands[i].x-p.shoulders[i].x)*(i?1:-1)>.2*scale,'lowered fist crosses inside its shoulder');
  }
  assert.ok(Math.abs(p.boots[0].y-p.boots[1].y)>.5*scale,'hover needs a readable tucked and long leg');
  assert.ok(p.boots[0].distanceTo(p.boots[1])>1.2*scale,'boot volumes converge');
  for(const arm of [f.parts.armL,f.parts.armR])assert.ok(arm.children[2].morphTargetInfluences[0]<.01,'idle hero fists must close');
  assert.deepEqual(f.pos.toArray(),root);assert.deepEqual(f.obj.scale.toArray(),[1,1,1]);assert.equal(f.obj.rotation.order,'YXZ');
 }finally{f.dispose();}
});

test('explicit saved hover joints remain authoritative through validation and production',()=>{
 const profile=profileFromDef(base);Object.assign(profile.poses.hover,{armLx:-.42,armRx:-.24,elbowL:.87,elbowR:.65,kneeL:.55,kneeR:.32});
 const saved=JSON.stringify(profile),f=fixture(validateProfile(JSON.parse(saved)));
 try{for(let i=0;i<120;i++)f._animate(1/60);
  for(const [actual,expected] of [[f.parts.armL.rotation.x,-.42],[f.parts.armR.rotation.x,-.24],[f.parts.legL.userData.knee.rotation.x,.55]])assert.ok(Math.abs(actual-expected)<.001);
  assert.equal(JSON.stringify(profile),saved);
 }finally{f.dispose();}
});

test('hero flight/brake/hover/guard transitions retain continuous joints and fixed limb lengths',()=>{
 const f=fixture();try{
  const snapshots=[],p=f.parts,root=f.pos.toArray(),joints=[p.armL,p.armR,p.legL,p.legR,p.legL.userData.knee,p.legR.userData.knee];
  for(let i=0;i<600;i++){
   const t=i/60;f.animT=t;f.vel.set(0,0,t<2?80:0);f._flightBrake=t>=2&&t<2.5?1:0;
   f.guarding=t>=5&&t<6;f.poseGuard=THREE.MathUtils.damp(f.poseGuard,f.guarding?1:0,14,1/60);f._animate(1/60);f.obj.updateMatrixWorld(true);
   const row=joints.map(j=>j.quaternion.clone());if(i>1){const previous=snapshots.at(-1);for(let j=0;j<row.length;j++)assert.ok(previous[j].angleTo(row[j])<.65,`joint ${j} snaps at ${t}`);}snapshots.push(row);
   for(const arm of [p.armL,p.armR]){
    const {upperLength:u,foreLength:v}=arm.userData,angle=-arm.children[1].rotation.x;
    const elbow=new THREE.Vector3(0,-u,0),hand=arm.children[2].position;
    assert.ok(Math.abs(elbow.distanceTo(hand)-v)<1e-6,'forearm length changed');assert.ok(Number.isFinite(angle));
   }
  }
  const last=sample(f);f.animT=0;f._animate(1/60);const wrap=sample(f);
  assert.ok(last.hands.every((v,i)=>v.distanceTo(wrap.hands[i])<.02),'hover loop wrap resets arms');
  assert.deepEqual(f.pos.toArray(),root);
 }finally{f.dispose();}
});

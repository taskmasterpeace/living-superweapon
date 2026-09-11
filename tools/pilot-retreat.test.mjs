import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';

const RETREAT = Object.freeze({hipL:-.78, hipR:-.4, kneeL:1.2, kneeR:.8});
const joints = f => ({
  hipL:f.parts.legL.rotation.x,
  hipR:f.parts.legR.rotation.x,
  kneeL:f.parts.legL.userData.knee.rotation.x,
  kneeR:f.parts.legR.userData.knee.rotation.x,
});

function fixture(hz=60, poses) {
  const def=structuredClone(ROSTER.find(d=>d.id==='sol'));
  if(poses)def.model={...(def.model||{}),poses};
  const f=new Fighter(def),dt=1/hz;
  Object.assign(f,{_openSky:true,flying:true,gait:'airborne',_flyPose:1,hasAimWorld:true});
  f.pos.set(0,70,0);f.obj.position.copy(f.pos);f.faceDir(0,1);
  f.aim3.set(0,0,1);f.aimWorld.set(0,77,100);
  const step=(velocity,cast=false)=>{
    f.vel.copy(velocity);f.castPose=cast?1:0;
    const beam=f.slots.lmb;
    beam.active=cast?{sustaining:true,power:1,emissionAge:1}:null;
    f.animT+=dt;f._animate(dt);f.obj.updateMatrixWorld(true);
  };
  const run=(seconds,velocity,cast=false)=>{
    for(let i=0;i<Math.round(seconds*hz);i++)step(velocity,cast);
  };
  return {f,dt,step,run,close:()=>f.dispose()};
}

function assertRetreat(f, label) {
  const actual=joints(f);
  const target=f._flightJointPose;
  assert.equal(f._flightPoseState,'backward',`${label}: retreat state was not selected`);
  for(const [key,want] of Object.entries(RETREAT))
    assert.ok(Math.abs(target[key]-want)<.002,`${label}: ${key} target ${target[key]} did not settle at ${want}`);
  assert.ok(actual.hipL<actual.hipR-.3,`${label}: hips lost the asymmetric lift`);
  assert.ok(actual.kneeL>actual.kneeR+.3,`${label}: knees lost the asymmetric brace`);
  assert.ok(Math.abs(f.obj.rotation.y)<.002,`${label}: retreat turned away from the threat`);
  const left=new THREE.Box3().setFromObject(f.parts.legL.userData.boot);
  const right=new THREE.Box3().setFromObject(f.parts.legR.userData.boot);
  assert.ok(left.max.x<right.min.x,`${label}: rendered boot volumes crossed`);
}

for(const hz of [30,60,120])for(const [motion,velocity,cast] of [
  ['level',new THREE.Vector3(0,0,-65),false],
  ['ascending',new THREE.Vector3(0,34,-65),false],
  ['descending',new THREE.Vector3(0,-34,-65),false],
  ['ranged casting',new THREE.Vector3(0,0,-65),true],
])test(`retreat uses a bent asymmetric threat-facing brace at ${hz}Hz while ${motion}`,()=>{
  const x=fixture(hz);
  try{x.run(2,velocity,cast);assertRetreat(x.f,`${hz}Hz ${motion}`);}
  finally{x.close();}
});

for(const hz of [30,60,120])test(`forward/reverse flight transitions stay continuous and settle at ${hz}Hz`,()=>{
  const x=fixture(hz),forward=new THREE.Vector3(0,0,65),reverse=new THREE.Vector3(0,0,-65);
  try{
    x.run(1,forward);assert.equal(x.f._flightPoseState,'forward');
    let previous=joints(x.f);
    for(let i=0;i<hz;i++){
      x.step(reverse);const current=joints(x.f);
      for(const key of Object.keys(current))
        assert.ok(Math.abs(current[key]-previous[key])<12*x.dt+.005,`${key} snapped entering retreat at ${hz}Hz`);
      previous=current;
    }
    x.run(1,reverse);assertRetreat(x.f,`${hz}Hz reverse transition`);
    previous=joints(x.f);
    for(let i=0;i<hz;i++){
      x.step(forward);const current=joints(x.f);
      for(const key of Object.keys(current))
        assert.ok(Math.abs(current[key]-previous[key])<12*x.dt+.005,`${key} snapped returning forward at ${hz}Hz`);
      previous=current;
    }
    x.run(1,forward);assert.equal(x.f._flightPoseState,'forward');
  }finally{x.close();}
});

test('authored backward leg overrides remain authoritative during ranged retreat',()=>{
  const authored={hipL:-1.02,hipR:-.17,kneeL:1.52,kneeR:.53};
  const x=fixture(60,{backward:authored});
  try{
    x.run(2,new THREE.Vector3(0,-24,-65),true);
    const actual=x.f._flightJointPose;
    for(const [key,want] of Object.entries(authored))
      assert.ok(Math.abs(actual[key]-want)<.002,`${key} authored ${want}, got ${actual[key]}`);
  }finally{x.close();}
});

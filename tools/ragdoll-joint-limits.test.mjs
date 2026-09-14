import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {RagdollJointLimits} from '../src/engine/ragdoll-joint-limits.js';
function fixture(){const coords={chest:[0,3,0],pelvis:[0,1,0]};for(const side of ['L','R']){const s=side==='L'?-1:1;Object.assign(coords,{['sh'+side]:[s,3,0],['el'+side]:[s,2,-.2],['ha'+side]:[s,1,0],['hi'+side]:[s*.5,1,0],['knee'+side]:[s*.5,0,.2],['ft'+side]:[s*.5,-1,0]});}return Object.fromEntries(Object.entries(coords).map(([k,v])=>[k,{pos:new T.Vector3(...v),prev:new T.Vector3(...v)}]));}
test('hinges reject backward knee and elbow bends while preserving both bone lengths',()=>{
 const p=fixture(),limit=new RagdollJointLimits(p);p.kneeL.pos.z=-2;p.kneeR.pos.z=-2;p.elL.pos.z=2;p.elR.pos.z=2;limit.solve();
 assert.ok(p.kneeL.pos.z>0&&p.kneeR.pos.z>0);assert.ok(p.elL.pos.z<0&&p.elR.pos.z<0);
 for(const s of limit.chains){assert.ok(Math.abs(p[s.a].pos.distanceTo(p[s.b].pos)-s.l1)<1e-6);assert.ok(Math.abs(p[s.b].pos.distanceTo(p[s.c].pos)-s.l2)<1e-6);}
});
test('hinge flexion is bounded during core rotations and collapsed endpoints recover finitely',()=>{
 for(const angle of [0,.5,1.5,Math.PI]){const p=fixture(),limit=new RagdollJointLimits(p),q=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,1,0).normalize(),angle);for(const a of Object.values(p)){a.pos.applyQuaternion(q);a.prev.copy(a.pos);}p.ftL.pos.copy(p.hiL.pos);limit.solve();
  for(const s of limit.chains){const u=new T.Vector3().subVectors(p[s.b].pos,p[s.a].pos).normalize(),v=new T.Vector3().subVectors(p[s.c].pos,p[s.b].pos).normalize();assert.ok(u.angleTo(v)<=150*Math.PI/180+1e-6);assert.ok(p[s.b].pos.toArray().every(Number.isFinite));}
 }
});

 test('hips reject folded-back thighs and crossed legs in the moving torso frame',()=>{
 const p=fixture(),limit=new RagdollJointLimits(p);
 p.kneeL.pos.set(1,2,0);p.ftL.pos.set(1,3,0);p.kneeR.pos.set(-1,2,0);p.ftR.pos.set(-1,3,0);
 limit.solve();
 for(const side of ['L','R']){
  const sign=side==='L'?-1:1,hip=p['hi'+side].pos,knee=p['knee'+side].pos,foot=p['ft'+side].pos;
  assert.ok((knee.x-hip.x)*sign>=-1e-6,'thigh crossed inward');
  assert.ok((foot.x-hip.x)*sign>=-1e-6,'shin crossed inward');
  assert.ok(new T.Vector3().subVectors(knee,hip).normalize().dot(new T.Vector3(0,-1,0))>=Math.cos(100*Math.PI/180)-1e-6,'thigh folded into chest');
 }
});
 test('hip span cannot twist independently through the trunk',()=>{
 const p=fixture(),limit=new RagdollJointLimits(p);p.hiL.pos.set(.5,1,0);p.hiR.pos.set(-.5,1,0);limit.solve();
 assert.ok(new T.Vector3().subVectors(p.hiR.pos,p.hiL.pos).normalize().dot(new T.Vector3(1,0,0))>=Math.cos(Math.PI/6)-1e-6);
});

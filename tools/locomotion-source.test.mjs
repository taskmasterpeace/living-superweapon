import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

test('real licensed locomotion is sampled with exact takes, stable loops and unit anatomical directions',async()=>{
 const api=await import('./lib/quaternius-source.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return null;throw e;});
 assert.ok(api,'A real source sampler is required; a procedural pose cannot stand in for imported motion');
 const source=await api.loadSource(),bank=api.bakeLocomotion(source);
 const bind=api.sampleSource(source,'A_TPose',0);
 assert.ok(bind.points.toeL.z>bind.points.footL.z,'Source toes face the same +Z as the fighter');
 assert.ok(bind.points.shoulderL.x<0,'Left slot matches the target negative-X arm contract');
 assert.throws(()=>api.sampleSource(source,'missing',0),/Unknown/);
 for(const [key,duration] of Object.entries({idle:2.5,walk:4/3,jog:11/12,sprint:2/3})){
  const clip=bank.clips[key];assert.ok(Math.abs(clip.duration-duration)<1e-6,key);
  assert.equal(clip.frames.length,Math.round(duration*60)+1);
  for(const frame of clip.frames){
   assert.equal(frame.length,45);assert.ok(frame.every(Number.isFinite));
   for(let i=0;i<24;i+=3)assert.ok(Math.abs(Math.hypot(...frame.slice(i,i+3))-1)<.00002,`${key} normalized limb`);
  }
  const a=clip.frames[0],b=clip.frames.at(-1);
  for(let i=0;i<24;i++)assert.ok(Math.abs(a[i]-b[i])<.035,`${key} wrap direction ${i}`);
  assert.ok(!('rootMotion' in clip),'The bank must not author simulation translation');
 }
 const start=api.sampleSource(source,'Walk_Loop',0),half=api.sampleSource(source,'Walk_Loop',2/3);
 assert.ok(start.points.kneeL.distanceTo(half.points.kneeL)>.1,'Actual source legs must move');
 assert.ok(bank.source.license==='CC0-1.0'&&bank.source.sha256.gltf.length===64);
 assert.ok(bank.clips.walk.frames[33][44]<.01,'Heel lift with planted toes must not create whole-body suspension');
 const lastWalk=api.sampleSource(source,'Walk_Loop',4/3*78/80);
 const sourceShin=lastWalk.points.footL.clone().sub(lastWalk.points.kneeL).normalize();
 assert.ok(sourceShin.distanceTo(new THREE.Vector3().fromArray(bank.clips.walk.frames[78],15))<.00001,'An already-closed source loop must retain its final stride, not ease prematurely into frame zero');
});
test('the retarget carrier follows the source torso volume axis, not one sharply bent spine bone',async()=>{
 const {loadSource,sampleSource,bakeLocomotion}=await import('./lib/quaternius-source.mjs');
 const source=await loadSource(),bank=bakeLocomotion(source);
 // The target's rigid torso rests on Y; the source bind leans forward 6.5 degrees.
 const restUp=new THREE.Vector3(0,1,0);
 for(const key of ['walk','jog','sprint']){
  const pose=sampleSource(source,bank.clips[key].take,0),up=pose.points.chest.clone().sub(pose.points.hip).normalize();
  const retarget=restUp.clone().applyQuaternion(new THREE.Quaternion().fromArray(bank.clips[key].frames[0],28));
  assert.ok(retarget.angleTo(up)<.01,`${key}: a spine bone's local bend must not become the whole body's lean`);
 }
});

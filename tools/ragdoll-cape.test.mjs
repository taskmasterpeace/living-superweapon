import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {Ragdoll} from '../src/engine/ragdoll.js';
import {trunkProbe} from './helpers/trunk-probe.mjs';
import {Game} from '../src/engine/game.js';
import {RagdollCape} from '../src/engine/ragdoll-cape.js';

const world={ARENA:240,cover:[],heightAt:()=>0};
function fixture(frame){
 const f=new Fighter({...ROSTER.find(d=>d.id==='sol'),...(frame?{frame}:{})});f.animT=0;f._openSky=true;f.flying=true;f.gait='airborne';
 f.pos.set(20,50,-15);f.vel.set(14,0,45);f.facing=.9;f.aimWorld.set(65,25,90);f.hasAimWorld=true;
 for(let i=0;i<90;i++){f.animT+=1/60;f._animate(1/60);}f.obj.updateMatrixWorld(true);return f;
}
function vertices(cape){const a=cape.geometry.attributes.position;cape.updateWorldMatrix(true,false);return Array.from({length:a.count},(_,i)=>new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(cape.matrixWorld));}
function average(v){return v.reduce((a,b)=>a.add(b),new T.Vector3()).divideScalar(v.length);}

test('a resting contact does not manufacture inward Verlet velocity',()=>{
 const f=fixture();try{
  const cloth=new RagdollCape(f.parts,new T.Vector3());
  const box=new T.Box3(new T.Vector3(0,0,0),new T.Vector3(2,2,2));
  cloth.colliders=[{box,worldBox:box.clone(),matrix:new T.Matrix4(),inverse:new T.Matrix4()}];
  const point={pos:new T.Vector3(1.99,1,1),prev:new T.Vector3(2.003,1,1)};
  cloth.collide(point,world);
  assert.ok(point.pos.distanceTo(point.prev)<1e-9,'projecting a resting vertex onto its surface injected velocity');
 }finally{f.dispose();}
});

test('cloth material dimensions come from the garment, not transient flight flutter',()=>{
 const f=fixture();try{
  const cloth=new RagdollCape(f.parts,new T.Vector3());
  const bind=cloth.points.map((_,i)=>new T.Vector3().fromArray(f.parts.cape.userData.rest,i*3).applyMatrix4(f.parts.cape.matrixWorld));
  for(const link of cloth.links)assert.ok(Math.abs(link.length-bind[link.a].distanceTo(bind[link.b]))<1e-7,'animation became permanent material stretch');
 }finally{f.dispose();}
});

// The old KO branch never advances cape vertices; these tests reject that frozen garment.
test('a cape keeps its exact captured shape when entering ragdoll without a physics step',()=>{
 const f=fixture();try{
  const before=vertices(f.parts.cape),rag=new Ragdoll(f,new T.Vector3(35,25,18));rag.apply(f);
  const after=vertices(f.parts.cape);for(let i=0;i<before.length;i++)assert.ok(after[i].distanceTo(before[i])<1e-5,'cape popped at ownership change');
 }finally{f.dispose();}
});
for(const hz of [30,60,120])test(`cape falls under world gravity even after the ragdoll body sleeps: ${hz} Hz`,()=>{
 const f=fixture();try{
  const rag=new Ragdoll(f,new T.Vector3()),center=rag.P.chest.pos.clone(),q=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),Math.PI);
  for(const pt of Object.values(rag.P)){pt.pos.sub(center).applyQuaternion(q).add(center);pt.prev.copy(pt.pos);}
  rag.apply(f);rag.asleep=true;
  for(let i=0;i<hz*5;i++){rag.step(1/hz,{world});rag.apply(f);}
  const v=vertices(f.parts.cape),columns=f.parts.cape.geometry.parameters.widthSegments+1;
  const seam=average(v.slice(0,columns)),hem=average(v.slice(-columns));
  assert.ok(hem.y<seam.y-.75,`cape remains a rigid flight flag: hem is ${(hem.y-seam.y).toFixed(3)} above seam`);
 }finally{f.dispose();}
});
test('actual fall keeps cape attachments, floor contact, finite bounds and exact restoration',()=>{
 const f=fixture();try{
  const cape=f.parts.cape,rest=cape.geometry.attributes.position.array.slice(),columns=cape.geometry.parameters.widthSegments+1;
  const pins=Array.from({length:columns},(_,i)=>new T.Vector3().fromBufferAttribute(cape.geometry.attributes.position,i));
  const rag=new Ragdoll(f,new T.Vector3(35,25,18));let changed=false;
  for(let frame=0;frame<480;frame++){
   rag.step(1/60,{world});rag.apply(f);const v=vertices(cape),a=cape.geometry.attributes.position;
   for(let i=0;i<columns;i++)assert.ok(v[i].distanceTo(pins[i].clone().applyMatrix4(cape.matrixWorld))<1e-5,'shoulder seam detached');
   for(let i=columns;i<v.length;i++){
    assert.ok(Number.isFinite(v[i].length()),'non-finite cloth');assert.ok(v[i].y>=-.015,`cape penetrated terrain by ${-v[i].y} at frame ${frame}`);
    if(Math.abs(a.getY(i)-rest[i*3+1])>.1)changed=true;
   }
  }
  assert.ok(changed,'cape never left its captured flight shape');
  rag.restore();assert.deepEqual(cape.geometry.attributes.position.array,rest,'respawn retained dead cloth deformation');
 }finally{f.dispose();}
});

test('cape free vertices remain outside actual head and trunk meshes throughout a seeded fall',()=>{
 const f=fixture();try{
  const random=Math.random;let rag;try{Math.random=()=>.5;rag=new Ragdoll(f,new T.Vector3(35,25,18));}finally{Math.random=random;}
  const meshes=[f.parts.torso,f.parts.pelvis,f.parts.head],inside=meshes.map(trunkProbe),columns=f.parts.cape.geometry.parameters.widthSegments+1;
  for(let frame=0;frame<360;frame++){
   rag.step(1/60,{world});rag.apply(f);
   const v=vertices(f.parts.cape),inverse=meshes.map(m=>m.matrixWorld.clone().invert());
   for(let i=columns;i<v.length;i++)for(let k=0;k<meshes.length;k++)assert.ok(!inside[k](v[i],inverse[k]),`cape vertex ${i} penetrated ${['torso','pelvis','head'][k]} on frame ${frame}`);
  }
 }finally{f.dispose();}
});

for(const [label,frame]of [['normal',null],['tall and broad',{scale:1.5,bulk:1.65,head:1.4,neck:1.6,broad:1.6,stance:1.4}]])test(`${label}: rendered cape triangle interiors do not bridge through the head or trunk`,()=>{
 const f=fixture(frame);try{
  const random=Math.random;let rag;try{Math.random=()=>.5;rag=new Ragdoll(f,new T.Vector3(35,25,18));}finally{Math.random=random;}
  const meshes=[f.parts.torso,f.parts.pelvis,f.parts.head],inside=meshes.map(trunkProbe),cape=f.parts.cape,index=cape.geometry.index;
  for(let frame=0;frame<300;frame++){
   rag.step(1/60,{world});rag.apply(f);
   const v=vertices(cape),inverse=meshes.map(m=>m.matrixWorld.clone().invert());
   for(let i=0;i<index.count;i+=3){
    const a=v[index.getX(i)],b=v[index.getX(i+1)],c=v[index.getX(i+2)];
    for(const point of [a.clone().add(b).add(c).divideScalar(3),a.clone().lerp(b,.5),b.clone().lerp(c,.5),c.clone().lerp(a,.5)])
     for(let k=0;k<meshes.length;k++)assert.ok(!inside[k](point,inverse[k]),`cape triangle ${i/3} crossed ${['torso','pelvis','head'][k]} on frame ${frame}`);
   }
  }
 }finally{f.dispose();}
});

test('settled cloth stops uploading unchanged geometry and wakes when its attachment moves',()=>{
 const f=fixture();try{
  const random=Math.random;let rag;try{Math.random=()=>.5;rag=new Ragdoll(f,new T.Vector3(35,25,18));}finally{Math.random=random;}
  for(let i=0;i<900;i++){rag.step(1/60,{world});rag.apply(f);}
  const attribute=f.parts.cape.geometry.attributes.position,version=attribute.version;
  for(let i=0;i<120;i++){rag.step(1/60,{world});rag.apply(f);}
  assert.equal(attribute.version,version,'settled garment continues CPU solves and GPU uploads');
  for(const pt of Object.values(rag.P)){pt.pos.x+=3;pt.prev.x+=3;}
  rag.step(1/60,{world});rag.apply(f);assert.ok(attribute.version>version,'moving corpse left sleeping cape behind');
 }finally{f.dispose();}
});

for(const hz of [30,120])test(`a landed cape dissipates contact jitter at ${hz} Hz without freezing its fall`,()=>{
 const f=fixture();try{
  const random=Math.random;let rag;try{Math.random=()=>.5;rag=new Ragdoll(f,new T.Vector3(35,25,18));}finally{Math.random=random;}
  let moved=false;const initial=vertices(f.parts.cape);
  for(let frame=0;frame<hz*15;frame++){
   rag.step(1/hz,{world});rag.apply(f);
   if(frame===hz)moved=vertices(f.parts.cape).some((p,i)=>p.distanceTo(initial[i])>1);
  }
  assert.ok(moved,'cloth was frozen before its fall');
  assert.ok(rag.capePose.asleep,'contact solver keeps a landed cape moving');
  const before=vertices(f.parts.cape),version=f.parts.cape.geometry.attributes.position.version;
  for(let frame=0;frame<hz;frame++){rag.step(1/hz,{world});rag.apply(f);}
  const after=vertices(f.parts.cape);
  assert.equal(f.parts.cape.geometry.attributes.position.version,version,'sleep still uploads geometry');
  for(let i=0;i<after.length;i++)assert.ok(after[i].distanceTo(before[i])<1e-7,'sleep still moves the surface');
 }finally{f.dispose();}
});

test('a pre-KO hologram owns its cape snapshot while the live cape falls, then disposes only its copy',()=>{
 const f=fixture(),g={scene:new T.Scene(),vfx:{ring(){},flash(){}},audio:{teleport(){}},time:0};
 try{
  const cape=f.parts.cape;cape.name='test-cape';const d=Game.prototype.spawnDecoy.call(g,f,.5),copy=d.grp.getObjectByName('test-cape');
  const snapshot=copy.geometry.attributes.position.array.slice(),rag=new Ragdoll(f,new T.Vector3(35,25,18));
  for(let i=0;i<30;i++){rag.step(1/60,{world});rag.apply(f);}
  assert.deepEqual(copy.geometry.attributes.position.array,snapshot,'static hologram borrowed the changing garment');
  let ownDisposed=0,sourceDisposed=0;copy.geometry.addEventListener('dispose',()=>ownDisposed++);cape.geometry.addEventListener('dispose',()=>sourceDisposed++);
  Game.prototype.updateDecoys.call(g,1);assert.equal(ownDisposed,1);assert.equal(sourceDisposed,0);
 }finally{f.dispose();}
});

for(const [name,c]of [['thin wall',{x:45,z:0,hx:.15,hz:30,top:80}],['raised platform',{x:52,z:3,hx:4,hz:4,top:4}]])test(`cape surface remains outside ${name} throughout a production fall`,()=>{
 const f=fixture();try{
  const random=Math.random;let rag;try{Math.random=()=>.5;rag=new Ragdoll(f,new T.Vector3(35,25,18));}finally{Math.random=random;}
  const box=new T.Box3(new T.Vector3(c.x-c.hx+.001,-10000,c.z-c.hz+.001),new T.Vector3(c.x+c.hx-.001,c.top-.001,c.z+c.hz-.001));
  const cape=f.parts.cape,index=cape.geometry.index,columns=cape.geometry.parameters.widthSegments+1;
  for(let frame=0;frame<300;frame++){
   rag.step(1/60,{world:{...world,cover:[c]}});rag.apply(f);if(frame%3)continue;
   const v=vertices(cape);
   for(let i=columns;i<v.length;i++)assert.ok(!box.containsPoint(v[i]),`${name} contains cape vertex ${i} at frame ${frame}`);
   for(let i=0;i<index.count;i+=3){const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)];if(ids.some(j=>j<columns))continue;
    const a=v[ids[0]],b=v[ids[1]],c=v[ids[2]];
    for(const p of [a.clone().add(b).add(c).divideScalar(3),a.clone().lerp(b,.5),b.clone().lerp(c,.5),c.clone().lerp(a,.5)])assert.ok(!box.containsPoint(p),`${name} contains cape triangle ${i/3} at frame ${frame}`);
   }
  }
 }finally{f.dispose();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {queueHitReaction} from '../src/engine/hit-reaction.js';
import {trunkProbe} from './helpers/trunk-probe.mjs';

// Real procedural body and final apply order. The already-existing traveling
// beam/contact suite owns damage acceptance; this file inspects the reaction.
function fixture({hero='sol',air=false,move=false,scale=1,field=false}={}){
 const def=structuredClone(ROSTER.find(d=>d.id===hero));
 def.frame={...def.frame,scale};
 const f=new Fighter(def);f._openSky=!field;if(field)f._game={modeId:'powerworld'};f.animT=0;f.invuln=0;
 f.pos.set(0,air?40:0,0);f.vel.set(move?8:0,0,move?10:0);f.flying=air;f.gait=air?'airborne':'grounded';f._flyPose=air?1:0;
 f.faceDir(0,1);f.aim3.set(0,0,1);f.obj.position.copy(f.pos);
 const src={pos:new THREE.Vector3(0,f.pos.y,30)};
 const step=dt=>{f.animT+=dt;f._animate(dt);f.obj.updateMatrixWorld(true);};
 for(let i=0;i<120;i++)step(1/60);
 const pulse=()=>queueHitReaction(f,4.32,{src,dot:true,beamContact:true,kb:{x:0,y:0,z:-1}});
 const localHand=()=>f.parts.armL.children[2].getWorldPosition(new THREE.Vector3()).applyMatrix4(f.parts.torso.matrixWorld.clone().invert());
 return {f,src,step,pulse,localHand,close:()=>f.dispose()};
}

// A repeated punch spring cannot satisfy either held-arm height or a stable
// torso: removing the pressure-to-brace seam must fail this real-mesh behavior.
for(const hz of [30,60,120])test(`a strong fighter holds one forearm up under sustained pressure at ${hz}Hz`,()=>{
 const x=fixture(),control=fixture(),{f}=x;f.strength=10;const root=f.pos.clone(),velocity=f.vel.clone(),start=x.localHand().y;
 try{
  const heights=[],leans=[];let next=0;
  for(let i=0;i<hz*2;i++){
   if(i/hz>=next-1e-8){x.pulse();next=i/hz+.18;}x.step(1/hz);control.step(1/hz);
   if(i>hz){heights.push(x.localHand().y);leans.push(f.parts.torso.quaternion.clone());}
  }
  assert.ok(Math.min(...heights)>start+1.5,'The threatened forearm never rises into a held brace');
  assert.ok(Math.max(...leans.map(q=>q.angleTo(leans[0])))<.009,'Repeated contact still bobs the torso like repeated punches');
  assert.equal(f.guarding,false,'A cosmetic brace must not grant a free block');
  assert.equal(f.hitstop,0);assert.equal(f.stunT,0);assert.equal(f.staggerT,0);
  assert.ok(f.pos.equals(root)&&f.vel.equals(velocity),'Presentation must not steer or stop the fighter');
  assert.ok(Math.abs(f._handSpd-control.f._handSpd)<1e-6,'A defensive gesture must not boost outgoing punch damage over the same base gait');
  // Recovery returns to the current idle/gait phase, not the hand's position
  // four seconds earlier. Keep the unhit control on the same animation clock.
  for(let i=0;i<hz*2;i++){x.step(1/hz);control.step(1/hz);}
  assert.equal(f._hitReaction,null,'A released pressure brace must retire');
  assert.ok(x.localHand().distanceTo(control.localHand())<1e-6,'The raised arm never returns to locomotion');
  assert.ok(f.parts.armL.quaternion.angleTo(control.f.parts.armL.quaternion)<1e-6,'Recovery leaves a shoulder offset');
 }finally{x.close();control.close();}
});

for(const air of [false,true])for(const move of [false,true])for(const field of air?[false]:[false,true])test(`beam brace preserves body clearance in ${field?'grounded field':air?'air':'ground'} ${move?'travel':'idle'}`,()=>{
 const x=fixture({air,move,field}),{f}=x,inside=trunkProbe(f.parts.torso),v=new THREE.Vector3();
 try{
  for(let i=0;i<180;i++){
   if(i<100&&i%10===0)x.pulse();x.step(1/60);
   const arm=f.parts.armL,surface=f.parts.rig.limbSurfaces.find(s=>s.upper===arm.children[0]),pos=surface.mesh.geometry.attributes.position,inverse=f.parts.torso.matrixWorld.clone().invert();
   const join=surface.rows.findIndex(row=>row.driver===arm.children[0]);
   for(let row=0;row<=join;row++)for(let j=0;j<surface.segments;j++){
    v.fromBufferAttribute(pos,row*surface.segments+j).applyMatrix4(surface.mesh.matrixWorld);
    assert.ok(!inside(v,inverse),`frame ${i} rendered elbow/forearm row ${row} crosses torso`);
   }
  }
 }finally{x.close();}
});

for(const action of ['guard','strike','grab','frozen','stun','two-hand'])test(`pressure does not steal ${action} articulation`,()=>{
 const a=fixture(),b=fixture();try{
  for(const {f}of [a,b]){
   if(action==='guard'){f.guarding=true;f.poseGuard=1;}
   if(action==='strike')f.mstate='strike';
   if(action==='grab')f.grabbedBy={};
   if(action==='frozen')f.frozenT=2;
   if(action==='stun')f.stunT=2;
   if(action==='two-hand'){
    f.slots={lmb:{def:{type:'beam',castStyle:'two-hand'},active:{sustaining:true,dir:new THREE.Vector3(0,0,1),emissionAge:2,radius:1},chargeT:0}};
    f.state='cast';f._castPoseRanged=true;
   }
  }
  for(let i=0;i<60;i++){if(i%10===0)a.pulse();a.step(1/60);b.step(1/60);}
  for(const key of ['head','torso','armL','armR'])assert.ok(a.f.parts[key].quaternion.angleTo(b.f.parts[key].quaternion)<1e-6,`${action} ${key} is stolen by automatic defense`);
 }finally{a.close();b.close();}
});

test('repeated zero-time posing does not accumulate a brace or bend the equipped wrist',()=>{
 const x=fixture();try{
  for(let i=0;i<60;i++){if(i%10===0)x.pulse();x.step(1/60);}
  const before=x.localHand(),q=x.f.parts.armL.quaternion.clone();
  for(let i=0;i<30;i++)x.step(0);
  assert.ok(before.distanceTo(x.localHand())<1e-6);assert.ok(q.angleTo(x.f.parts.armL.quaternion)<1e-6);
 }finally{x.close();}
});

for(const air of [false,true])test(`changing costume removes the entire temporary brace before copying the ${air?'air':'ground'} rig`,()=>{
 const a=fixture({air}),b=fixture({air});try{
  for(let i=0;i<60;i++){if(i%10===0)a.pulse();a.step(1/60);b.step(1/60);}
  a.f.applyForm({model:{costume:'plated'}});b.f.applyForm({model:{costume:'plated'}});
  for(const key of ['armL','armR'])for(let i=0;i<3;i++)assert.ok(a.f.parts[key].children[i].quaternion.angleTo(b.f.parts[key].children[i].quaternion)<1e-6,`a temporary ${key} child ${i} became the replacement costume's bind pose`);
 }finally{a.close();b.close();}
});

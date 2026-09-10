import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {runSlot} from '../src/engine/abilities.js';
import {attackFields,setAttackOverride} from '../src/data/attack-tuning.js';
import {profileFromDef,applyProfile,validateProfile} from '../src/tool/studio-profile.js';
import {StudioPreview} from '../src/tool/studio-preview.js';
import {trunkProbe} from './helpers/trunk-probe.mjs';

const dt=1/60;
function fixture(motion='strafe',order='eyes',hand={}){
 const def=structuredClone(ROSTER.find(d=>d.id==='sol'));
 const eyes={type:'beam',name:'Optic channel',faceOrigin:true,castStyle:'optic-focus',cost:1,dps:1,kiPerSec:1,steer:4,color:'#ff6249'};
 const palm={type:'beam',name:'Palm channel',castStyle:'palm',cost:1,dps:1,kiPerSec:1,steer:12,color:'#ffd64a',...hand};
 def.abilities=order==='eyes'?{lmb:eyes,rmb:palm}:{rmb:palm,lmb:eyes};
 const f=new Fighter(def),scene=new THREE.Scene(),world={scene,cover:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(scene,world),g=combat.game;g.entities=[f];f._game=g;f._openSky=true;f.energyInfinite=true;
 f.animT=0;f.hasAimWorld=true;f.aimWorld.set(0,motion==='strafe'?18:68,100);f.facing=0;f.aim.set(0,0,1);
 f.pos.set(0,motion==='strafe'?0:50,0);f.obj.position.copy(f.pos);scene.add(f.obj);
 f.flying=motion!=='strafe';f.gait=f.flying?'airborne':'grounded';
 f.vel.set(motion==='hover'?0:14,motion==='rise'?12:motion==='descend'?-12:0,motion==='fly'?36:0);
 f.aim3.copy(f.aimWorld).sub(f.pos).normalize();
 const animate=(step=dt)=>{f.advanceActionPose(step);f.animT+=step;f._animate(step);f.obj.updateMatrixWorld(true);};
 const start=key=>runSlot(f,key,{pressed:true,held:true,released:false,dt},g);
 const step=(time=dt)=>{animate(time);g.projectiles.update(time,g);};
 const stop=key=>runSlot(f,key,{pressed:false,held:false,released:true,dt},g);
 return {f,g,start,step,animate,stop,close(){combat.dispose();f.dispose();}};
}

for(const motion of ['strafe','hover','fly','rise','descend'])for(const order of ['eyes','hands'])
test(`concurrent eyes and palm retain their own moving emitter poses: ${motion}, ${order} first`,()=>{
 const {f,start,step,stop,close}=fixture(motion,order);
 try{
  start('lmb');start('rmb');
  for(let i=0;i<180;i++){
   if(i>90){f.aimWorld.x=Math.sin((i-90)/90)*40;f.facing=Math.atan2(f.aimWorld.x,100);}
   step();if(i<70)continue;
   const hand=f.parts.armR.children[2],hp=hand.getWorldPosition(new THREE.Vector3());
   const handRay=new THREE.Vector3(0,-1,0).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()));
   const headRay=new THREE.Vector3(0,0,1).applyQuaternion(f.parts.head.getWorldQuaternion(new THREE.Quaternion()));
   assert.ok(handRay.dot(f.slots.rmb.active.dir)>.985,`Palm lost its firing channel: ${handRay.dot(f.slots.rmb.active.dir)}`);
   assert.ok(headRay.dot(f.slots.lmb.active.dir)>.985,`Eyes lost their firing channel: ${headRay.dot(f.slots.lmb.active.dir)}`);
   assert.ok(hp.distanceTo(f.parts.head.getWorldPosition(new THREE.Vector3()))>2,'Optic-focus cannot occupy a hand already firing');
   assert.ok(hand.morphTargetInfluences[0]>.9,'A concurrent palm must open');
   if(motion==='strafe')assert.ok(f._groundMotion?.weight>.9,'Source gait cannot be replaced by a standing cast');
  }
  stop('rmb');for(let i=0;i<70;i++)step();assert.ok(f.slots.lmb.active.sustaining);
  stop('lmb');for(let i=0;i<150;i++){
   step();if(motion==='strafe')assert.ok(f._groundMotion.weight>.9,'Release cannot drop the moving source gait '+JSON.stringify({i,weight:f._groundMotion.weight,cast:f.castPose,state:f.state,stateT:f.stateT,overlay:f._combatAim.weight}));
  }assert.ok(f._combatAim.weight<.001,'Both released channels recover');
 }finally{close();}
});

for(const hz of [30,60,120])test(`sustaining two beams cannot multiply hidden velocity drag at ${hz} Hz`,()=>{
 const {f,start,step,close}=fixture('fly');
 try{start('lmb');start('rmb');const v=f.vel.clone();for(let i=0;i<hz;i++)step(1/hz);assert.ok(f.vel.distanceTo(v)<1e-8,`Beam updates changed movement by ${f.vel.distanceTo(v)}`);}
 finally{close();}
});

for(const motion of ['strafe','fly'])test(`combined two-hand beam samples the final palm midpoint while ${motion}`,()=>{
 const {f,start,step,close}=fixture(motion,'eyes',{castStyle:'two-hand'});
 try{
  start('rmb');
  for(let i=0;i<180;i++){
   step();const beam=f.slots.rmb.active;
   const midpoint=f.parts.armL.children[2].getWorldPosition(new THREE.Vector3()).add(f.parts.armR.children[2].getWorldPosition(new THREE.Vector3())).multiplyScalar(.5);
   assert.ok(beam.muzzle.distanceTo(midpoint)<.001,`Combined beam is ${beam.muzzle.distanceTo(midpoint)}u off the paired palms`);
  }
 }finally{close();}
});

for(const extra of [{castStyle:'two-hand'},{faceOrigin:true,castStyle:'optic-focus'},{chest:true,castStyle:'chest-brace'}])
test(`zero-steer ${extra.castStyle} starts on the commanded ray from its final source`,()=>{
 const {f,start,animate,g,close}=fixture('hover','eyes',{...extra,steer:0});
 try{
  f.aimWorld.set(0,56,12);f.aim3.copy(f.aimWorld).sub(f.muzzle(new THREE.Vector3())).normalize();
  const commanded=f.aimWorld.clone();start('rmb');const beam=f.slots.rmb.active;
  animate();f.aimWorld.set(80,70,90); // A later cursor sample cannot rewrite launch intent.
  g.projectiles.update(dt,g);
  for(let i=0;beam.pendingLaunch&&i<18;i++){animate();g.projectiles.update(dt,g);}
  assert.ok(beam.emissionAge>0&&!beam.pendingLaunch,'Final source never reaches its first emission');
  const expected=commanded.sub(beam.muzzle).normalize();assert.ok(beam.dir.dot(expected)>.999999,`${extra.castStyle} still uses the wrong emitter ray: ${beam.dir.angleTo(expected)*180/Math.PI}°`);
  const firstPacket=new THREE.Vector3().fromArray(beam.pvel,3).normalize();
  assert.ok(firstPacket.dot(expected)>.999999,'Physical launch packet lost its captured target');
 }finally{close();}
});

test('casting movement restriction is explicit, non-stacking and portable through Studio',()=>{
 const {f,start,close}=fixture('strafe');
 try{
  const field=attackFields(f.def,'lmb').find(x=>x.key==='castMoveScale');assert.equal(field?.value,1);
  const profile=profileFromDef(f.def);profile.attacks=setAttackOverride(profile.attacks,f.def,'lmb',{castMoveScale:.5});
  assert.equal(applyProfile(f.def,validateProfile(JSON.parse(JSON.stringify(profile)))).abilities.lmb.castMoveScale,.5);
  assert.throws(()=>setAttackOverride(profile.attacks,f.def,'lmb',{castMoveScale:1.1}),/castMoveScale/);
  start('lmb');start('rmb');f.slots.lmb.def.castMoveScale=.5;f.slots.rmb.def.castMoveScale=.5;
  const run=()=>{f.vel.set(0,0,0);for(let i=0;i<120;i++)f.move({x:1,y:0,z:0},dt);return f.vel.x;};
  const restricted=run();f.slots.lmb.active.end();f.slots.rmb.active.end();const normal=run();
  assert.ok(Math.abs(restricted/normal-.5)<.001,`Two half-speed powers must mean .5, not .25 (${restricted/normal})`);
 }finally{close();}
});

test('optic sustain cannot hide alternating-hand recoil and successful-emission ownership',()=>{
 const {f,g,start,step,stop,close}=fixture('strafe','eyes',{type:'volley',handPattern:'alternate',interval:.12,cost:1});
 try{
  start('lmb');f.ki=10000;
  for(let i=0;i<160;i++){
   if(i%8===0){f.slots.rmb.cd=0;start('rmb');}
   step();if(i<60)continue;
   for(const arm of [f.parts.armL,f.parts.armR]){
    const hand=arm.children[2],at=hand.getWorldPosition(new THREE.Vector3());
    const ray=new THREE.Vector3(0,-1,0).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()));
    assert.ok(ray.dot(f.aimWorld.clone().sub(at).normalize())>.99);assert.ok(hand.morphTargetInfluences[0]>.9);
   }
   assert.equal(f._combatAim.handPattern,'alternate');
  }
  stop('lmb');assert.ok(g.projectiles.list.length>0,'Already-fired energy survives a released pose');
 }finally{close();}
});

test('Studio rehearses two actual powers and releases both without changing their saved definitions',()=>{
 const {f,g,close}=fixture(),combat=f._game;
 // Use the public preview combat fixture, not manual slot activation.
 const scene=f.obj.parent,world=g.world,review=new StudioCombat(scene,world),before=JSON.stringify(f.def);
 try{
  review.game.vfx._itex=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);
  review.secondarySlot='rmb';review.reset(f,true,'attack');review.shooterMotion='ground-right';
  for(let i=1;i<=70;i++)review.step(i/60,dt);
  assert.ok(f.slots.lmb.active?.sustaining&&f.slots.rmb.active?.sustaining,'Both selected powers must run through production runSlot');
  assert.equal(f._combatAim.source,'hand');assert.ok(review.contacts>0,'Real target contact, not a visual-only duplicate');
  for(let i=71;i<=390;i++)review.step(i/60,dt);
  assert.ok(!f.slots.lmb.active?.sustaining&&!f.slots.rmb.active?.sustaining);assert.ok(f._combatAim.weight<.001);
  assert.equal(JSON.stringify(f.def),before,'Rehearsal must not rewrite saved hero attacks');
 }finally{review.dispose();f._game=combat;close();}
});

test('Studio co-fire selection validates the slot and cannot double-trigger the primary',()=>{
 const preview=Object.create(StudioPreview.prototype),f=fixture();
 try{
  const combat=new StudioCombat(f.f.obj.parent,f.g.world);combat.fighter=f.f;combat.slot='lmb';combat.mode='attack';
  preview.combat=combat;preview.time=0;preview.seek=()=>{};
  assert.equal(preview.setCombat({secondarySlot:'rmb'}),true);assert.equal(combat.secondarySlot,'rmb');
  assert.equal(preview.setCombat({secondarySlot:'missing'}),false);assert.equal(combat.secondarySlot,'rmb');
  assert.equal(preview.setCombat({slot:'rmb'}),true);assert.equal(combat.secondarySlot,null);
  combat.dispose();
 }finally{f.close();}
});

test('Studio timeline includes a long secondary charge release and its recovery',()=>{
 const {f,g,close}=fixture('hover','eyes',{type:'charge',maxCharge:20,kiPerSec:1}),review=new StudioCombat(f.obj.parent,g.world);
 const preview=Object.create(StudioPreview.prototype);Object.assign(preview,{state:'attack',fighter:f,combat:review});
 try{
  review.game.vfx._itex=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);
  review.chargeHold=10;review.secondarySlot='rmb';review.reset(f,true,'attack');
  assert.ok(preview.duration>=16.6,'The loop cannot reset before the secondary charge releases and recovers');
  let launched=false;
  for(let i=1;i<=Math.round(preview.duration*60);i++){
   review.step(i/60,dt);launched ||= review.game.projectiles.list.some(p=>p.caster===f&&p.sustaining===undefined);
  }
  assert.ok(launched,'A co-fired long charge must actually release its production projectile');assert.ok(!f.slots.rmb.charging);
  assert.ok(f._combatAim.weight<.001,'Extended timeline includes recovery');
 }finally{review.dispose();close();}
});

test('Studio identifies a denied co-fire slot without calling its sustaining primary denied',()=>{
 const {f,g,close}=fixture('hover','eyes',{type:'projectile',cost:9999}),review=new StudioCombat(f.obj.parent,g.world);
 try{
  f.energyInfinite=false;review.secondarySlot='rmb';review.reset(f,true,'attack');
  for(let i=1;i<=45;i++)review.step(i/60,dt);
  assert.ok(f.slots.lmb.active?.sustaining);assert.equal(review.denied,false,'Primary was paid and is still firing');
  assert.match(review.phase,/rmb.*denied/,'The co-fire resource failure must identify its slot');
 }finally{review.dispose();close();}
});

for(const motion of ['strafe','hover','fly'])for(const style of ['palm','two-hand'])for(const initialPhase of [0,4.4688715047124985])for(const hz of motion==='fly'?[30,60,120]:[60])
test(`concurrent ${style} and optic entry/sustain/recovery keep rendered arms outside the ${motion} trunk (phase ${initialPhase}, ${hz} Hz)`,()=>{
 const {f,start,step,stop,close}=fixture(motion,'eyes',{castStyle:style}),inside=trunkProbe(f.parts.torso),crossings=[],point=new THREE.Vector3();
 f.animT=initialPhase;const timeStep=1/hz,velocity=f.vel.clone(),position=f.pos.clone();let previous;
 try{
  // Inspect a settled source cycle, not an unposed freshly constructed bind rig.
  for(let i=0;i<hz*1.5;i++)step(timeStep);
  for(let i=0;i<hz*4;i++){
   if(i===Math.round(hz*.2)){start('lmb');start('rmb');}if(i===Math.round(hz*100/60))stop('rmb');if(i===Math.round(hz*155/60))stop('lmb');step(timeStep);
   const joints=[f.parts.armL,f.parts.armR].map(arm=>({rotation:f.parts.torso.quaternion.clone().invert().multiply(arm.quaternion),elbow:-arm.children[1].rotation.x}));
   // Entry, sustained turning, channel handoff and recovery are one continuous
   // articulation. Clearance must not jump after the shoulder/elbow limiter.
   if(previous&&i>=Math.round(hz*.2))for(let a=0;a<2;a++){
    const travel=Math.max(previous[a].rotation.angleTo(joints[a].rotation),Math.abs(previous[a].elbow-joints[a].elbow));
    assert.ok(travel<=12*timeStep+1e-7,`Frame ${i}: clearance caused a ${travel/timeStep} rad/s shoulder/elbow snap`);
   }
   previous=joints;
   const inverse=f.parts.torso.matrixWorld.clone().invert();
   for(const [name,arm]of [['left',f.parts.armL],['right',f.parts.armR]]){
    // Drivers have drawRange=0. Check the visible connected forearm + elbow
    // fillet, and refresh the torso as its waist seam deforms each frame.
    const surface=f.parts.rig.limbSurfaces.find(s=>s.upper===arm.children[0]),vertices=surface.mesh.geometry.attributes.position;
    const join=surface.rows.findIndex(row=>row.driver===arm.children[0]);
    for(let row=0;row<=join;row++)for(let j=0;j<surface.segments;j++){
     point.fromBufferAttribute(vertices,row*surface.segments+j).applyMatrix4(surface.mesh.matrixWorld);
     if(inside(point,inverse)){crossings.push({frame:i,arm:name,mesh:'rendered elbow/forearm',row,column:j});break;}
    }
    const indices=surface.mesh.geometry.index,centroid=new THREE.Vector3();
    for(let index=0;index<indices.count;index+=3){
     const triangle=[indices.getX(index),indices.getX(index+1),indices.getX(index+2)];
     if(triangle.some(v=>v>=(join+1)*surface.segments))continue;
     centroid.set(0,0,0);
     for(const v of triangle)centroid.add(point.fromBufferAttribute(vertices,v));
     centroid.multiplyScalar(1/3).applyMatrix4(surface.mesh.matrixWorld);
     if(inside(centroid,inverse)){crossings.push({frame:i,arm:name,mesh:'rendered elbow/forearm triangle',triangle});break;}
    }
    const hand=arm.children[2];
    for(let v=0;v<hand.geometry.attributes.position.count;v++){
     hand.getVertexPosition(v,point).applyMatrix4(hand.matrixWorld);
     if(inside(point,inverse)){crossings.push({frame:i,arm:name,mesh:'morphed palm',vertex:v});break;}
    }
   }
  }
  assert.ok(f.vel.distanceTo(velocity)<1e-8&&f.pos.distanceTo(position)<1e-8,'Recovery must not redirect travel');
  assert.deepEqual(crossings.slice(0,8),[],`initial animT=${initialPhase}; first crossings=${JSON.stringify(crossings.slice(0,8))}`);
 }finally{close();}
});

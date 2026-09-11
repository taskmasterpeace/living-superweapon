import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {runSlot,clearSlotFx} from '../src/engine/abilities.js';
import {requestReload} from '../src/engine/firearm-ammo.js';
import {trunkProbe} from './helpers/trunk-probe.mjs';
import {setAttackOverride,applyAttackOverrides} from '../src/data/attack-tuning.js';

function fixture(){
 const x=mainCombatFixture({hero:'sarge',mode:'powerworld'});x.p._openSky=true;
 x.cues=[];x.g.audio={...x.g.audio,soundLibrary:{play(id){x.cues.push(id);}}};
 x.start=()=>runSlot(x.p,'rmb',{pressed:true,held:false,released:true,dt:1/60},x.g);
 x.tick=(dt=1/60)=>{x.p.animT+=dt;x.p.advanceActionPose(dt);x.p._animate(dt);x.g.projectiles.resolveLaunches(x.g);};
 return x;
}
test('grenade winds up in a hand, releases once at the pose, and recovers without changing selection',()=>{
 const x=fixture();try{
  x.start();assert.equal(x.g.projectiles.list.length,0,'Grenade appeared before any throw motion');
  assert.ok(x.p._throwAction);const motion=x.p._throwAction;
  for(let i=0;i<10;i++)x.tick();assert.equal(x.g.projectiles.list.length,0);
  assert.ok(motion.prop.parent,'Visible hand-held prop missing during anticipation');
  while(!motion.released)x.tick();
  const shot=x.g.projectiles.list[0];assert.ok(shot.canister);
  assert.equal(shot.obj,motion.prop,'Release swapped in a differently sized grenade');
  assert.ok(shot.pos.distanceTo(motion.releasePosition)<1e-6,'Projectile detached from the release hand');
  assert.ok(shot.vel.y>0,'Neutral aimed throw needs an upward ballistic lob');
  for(let i=0;i<60;i++)x.tick();
  assert.equal(x.g.projectiles.list.length,1);assert.equal(x.p._throwAction,null);
  assert.deepEqual(x.cues,['grenade-prepare','grenade-release']);
 }finally{x.close();}
});
test('interrupted preparation cannot fire later; reload and another attack cannot overlap the throwing hand',()=>{
 const x=fixture();try{
  x.start();assert.ok(x.p._throwAction);x.tick();
  x.p.slots.lmb.ammo={loaded:2,capacity:30,reserve:60};
  assert.equal(requestReload(x.p,'lmb',x.g),false);
  runSlot(x.p,'lmb',{pressed:true,held:true,dt:1/60},x.g);assert.equal(x.g.projectiles.list.length,0);
  x.p.staggerT=.5;x.tick();assert.equal(x.p._throwAction,null);
  x.p.staggerT=0;for(let i=0;i<60;i++)x.tick();assert.equal(x.g.projectiles.list.length,0);
  assert.deepEqual(x.cues,['grenade-prepare']);
 }finally{x.close();}
});
test('zero-dt inspection freezes throw; clearing the kit removes the attached prop',()=>{
 const x=fixture();try{x.start();assert.ok(x.p._throwAction);x.tick();
  const m=x.p._throwAction,t=m.elapsed;x.tick(0);assert.equal(m.elapsed,t);
  clearSlotFx(x.p);assert.equal(x.p._throwAction,null);assert.equal(m.prop.parent,null);
 }finally{x.close();}
});

test('native freeze branch cancels preparation before its early animation return',()=>{
 const x=fixture();try{x.start();x.p.frozenT=1;x.p.update(1/60,x.g);assert.equal(x.p._throwAction,null);assert.equal(x.g.projectiles.list.length,0);}finally{x.close();}
});

test('release transfers resource lifetime to the projectile, not the recovering hand',()=>{
 const x=fixture();try{x.start();const m=x.p._throwAction;let disposed=0;m.prop.geometry.addEventListener('dispose',()=>disposed++);
  for(let i=0;i<25;i++)x.tick();clearSlotFx(x.p);assert.equal(disposed,0);assert.equal(m.prop.parent,x.g.scene);
  const shot=x.g.projectiles.list[0];shot._dispose(x.g);shot._dispose(x.g);assert.equal(disposed,1);assert.equal(m.prop.parent,null);
 }finally{x.close();}
});

test('Studio timing overrides control the actual hand action, not just inspector values',()=>{
 const x=fixture();try{
  const authored=applyAttackOverrides(x.p.def,setAttackOverride({},x.p.def,'rmb',{throwWindup:.8,throwRecovery:.6}));
  x.p.slots.rmb.def=authored.abilities.rmb;x.start();
  for(let i=0;i<40;i++)x.tick();assert.equal(x.g.projectiles.list.length,0);
  for(let i=0;i<10;i++)x.tick();assert.equal(x.g.projectiles.list.length,1);assert.ok(x.p._throwAction.released);
  for(let i=0;i<40;i++)x.tick();assert.equal(x.p._throwAction,null);
  assert.throws(()=>setAttackOverride({},x.p.def,'rmb',{throwWindup:0}));
 }finally{x.close();}
});

test('remote grenade retains detonation and split data after a hand release',()=>{
 const x=fixture();try{
  Object.assign(x.p.slots.rmb.def,{remoteDetonate:true,splitCount:3,splitSpread:.4});x.start();
  for(let i=0;i<25;i++)x.tick();const shot=x.p.slots.rmb.remoteShot;
  assert.ok(shot&&x.p._throwAction?.released);assert.equal(shot.splitCount,3);
  runSlot(x.p,'rmb',{pressed:true,held:false,released:true,dt:1/60},x.g);
  assert.ok(shot.dead,'Recovery must not swallow control of an already thrown remote grenade');
 }finally{x.close();}
});

test('Studio remote grenade rehearsal waits for the hand release before its detonation input',()=>{
 const x=fixture();try{
  Object.assign(x.p.slots.rmb.def,{remoteDetonate:true,splitCount:3});x.combat.slot='rmb';x.combat.reset(x.p,true,'attack');
  for(let i=0;i<110;i++)x.combat.step(i/60,1/60);
  assert.equal(x.combat.remoteDetonations,1,'Preview detonation edge ran before delayed hand release');
 }finally{x.close();}
});

for(const hz of [30,60,120])test(`real throwing arm clears torso and returns to rifle support at ${hz} Hz`,()=>{
 const x=fixture();try{
  const f=x.p,arm=f.parts.armL,hand=arm.children[2],inside=trunkProbe(f.parts.torso);
  for(let i=0;i<hz;i++)x.tick(1/hz);
  const root=f.pos.clone(),rest=hand.getWorldPosition(new THREE.Vector3()),positions=[];
  x.start();let previous=rest.clone(),maximumStep=0,maximumFrame=0,peak=rest.y;
  for(let i=0;i<hz*1.2;i++){
   x.tick(1/hz);f.obj.updateMatrixWorld(true);
   const p=hand.getWorldPosition(new THREE.Vector3());positions.push(p);peak=Math.max(peak,p.y);if(p.distanceTo(previous)>maximumStep){maximumStep=p.distanceTo(previous);maximumFrame=i;}previous=p;
   const inverse=f.parts.torso.matrixWorld.clone().invert();
   const surface=f.parts.rig.limbSurfaces.find(s=>s.upper===arm.children[0]);
   for(const [mesh,limb] of [[hand,null],[surface.mesh,surface]]){
    const vertices=mesh.geometry.attributes.position;
    for(let v=0;v<vertices.count;v++){
     if(limb&&limb.rows[Math.floor(v/limb.segments)]?.driver!==arm.children[1])continue;
     assert.ok(!inside(mesh.getVertexPosition(v,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld),inverse),`torso clipping at frame ${i}, ${mesh.name}`);
    }
   }
  }
  assert.ok(peak-rest.y>.9,'No visible arm wind-up');
  assert.ok(maximumStep<70/hz,`Hand snaps by ${maximumStep}u at ${maximumFrame/hz}s`);
  assert.ok(previous.distanceTo(rest)<.15,'Arm did not recover to rifle support');assert.ok(f.pos.equals(root));
 }finally{x.close();}
});

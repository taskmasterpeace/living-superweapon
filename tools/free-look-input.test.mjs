import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Input} from '../src/core/input.js';
import {HUD} from '../src/engine/hud.js';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {createFreeLook,advanceFreeLook,FREE_LOOK_DEFAULTS} from '../src/core/free-look.js';

const view=w=>w.camera.getWorldDirection(new THREE.Vector3());
function setup(hero='sarge',air=false){
 const x=mainCombatFixture({hero,mode:'powerworld'});x.g.ms.chaseCam=true;x.p._openSky=true;
 if(air){x.p.gait='airborne';x.p.flying=true;x.p.pos.y=80;}
 x.control(0);x.g.input.keys.add('KeyW');x.control(0);return x;
}
for(const air of [false,true])test(`Alt composes a rear-side view during ${air?'flight':'ground travel'}`,()=>{
 const x=setup(air?'sol':'sarge',air);try{
  const heading=x.w._lookYaw,pitch=x.w._lookPitch,aim=x.p.aim3.clone(),move={...x.p.moveDir},basis=x.w.camBasis.clone(),eye=x.w.camera.position.clone(),before=view(x.w);
  x.g.input.keys.add('AltLeft');x.g.input.mouse.dx=220;x.g.input.mouse.dy=-60;x.control(1/60);
  assert.equal(x.w._lookYaw,heading,'Alt mouse delta steered travel');assert.equal(x.w._lookPitch,pitch);
  assert.deepEqual(x.p.moveDir,move);assert.ok(x.p.aim3.angleTo(aim)<1e-7,'Alt redirected fire');
  assert.ok(x.w.camBasis.distanceTo(basis)<1e-9);assert.ok(x.w.camera.position.distanceTo(eye)>1,'Alt did not slide the camera');
  const turn=view(x.w).angleTo(before);assert.ok(turn>.05&&turn<.45,`Rear-side turn ${turn} was not slight`);
 }finally{x.close();}
});
test('vertical shoulder limits, sensitivity and frame-independent return are explicit',()=>{
 assert.ok(FREE_LOOK_DEFAULTS.yawLimit>75*Math.PI/180&&FREE_LOOK_DEFAULTS.yawLimit<=85*Math.PI/180,'Alt yaw should extend only slightly beyond the previous 75 degree limit');
 const state=createFreeLook();advanceFreeLook(state,{held:true,dx:100,dy:-100,sensitivity:.001});
 assert.equal(state.yaw,-.1);assert.equal(state.pitch,.1);
 advanceFreeLook(state,{held:true,dy:-1e6});assert.equal(state.pitch,FREE_LOOK_DEFAULTS.pitchLimit);
 advanceFreeLook(state,{held:true,dy:1e6});assert.equal(state.pitch,-FREE_LOOK_DEFAULTS.pitchLimit);
 const offsets=[30,60,120].map(hz=>{const s=createFreeLook();s.yaw=1;for(let i=0;i<hz/2;i++)advanceFreeLook(s,{dt:1/hz});return s.yaw;});
 assert.ok(Math.max(...offsets)-Math.min(...offsets)<1e-12);
});
test('the player head follows Alt yaw and pitch, then settles back with the camera',()=>{
 const x=setup('vega'),neutral=setup('vega');try{
  x.p._animate(1/60);neutral.p._animate(1/60);x.p.obj.updateMatrixWorld(true);
  const forward=()=>new THREE.Vector3(0,0,1).applyQuaternion(x.p.parts.head.quaternion).normalize();
  const before=forward();
  x.g.input.keys.add('AltLeft');x.g.input.mouse.dx=-260;x.g.input.mouse.dy=-150;x.control(1/60);
  x.p._animate(1/60);x.p.obj.updateMatrixWorld(true);
  const looking=forward();
  assert.ok(looking.angleTo(before)>.08,'Head did not visibly follow independent look');
  assert.ok(looking.y>before.y+.03,'Looking up did not lift the face');
  assert.ok(looking.x>before.x+.03,'Looking sideways did not turn the face');
  const firstTurn=x.p._freeLookHead.head.angleTo(x.p.parts.head.quaternion);
  x.p._animate(1/60);x.p.obj.updateMatrixWorld(true);
  const repeatedTurn=x.p._freeLookHead.head.angleTo(x.p.parts.head.quaternion);
  assert.ok(Math.abs(repeatedTurn-firstTurn)<.01,'A held Alt look accumulated neck rotation every frame');
  x.g.input.endFrame();x.g.input.keys.delete('AltLeft');
  for(let i=0;i<90;i++){x.control(1/60);x.p._animate(1/60);neutral.control(1/60);neutral.p._animate(1/60);}
  x.p.obj.updateMatrixWorld(true);
  const neutralForward=new THREE.Vector3(0,0,1).applyQuaternion(neutral.p.parts.head.quaternion).normalize();
  const settled=forward().angleTo(neutralForward);
  assert.ok(settled<.015,`Head did not settle back after Alt release (${settled}; offsets ${x.w._freeLook.yaw}, ${x.w._freeLook.pitch})`);
 }finally{x.close();neutral.close();}
});
test('pitched flight and a sustained native beam keep their original direction through Alt look',()=>{
 const x=setup('sol',true);try{
  x.w._lookPitch=.35;x.control(0);x.g.input.mouse.left=true;x.g.input.mouse.leftEdge=true;x.control(1/60);x.g.input.endFrame();
  const beam=x.p.slots.lmb.active;assert.ok(beam,'Native held beam did not start');
  const move={...x.p.moveDir},before=beam.predictDirection(new THREE.Vector3(),1/60);
  assert.ok(move.y>.3,'Fixture did not establish pitched flight');
  x.g.input.keys.add('AltLeft');x.g.input.mouse.dx=250;x.g.input.mouse.dy=140;x.control(1/60);
  assert.equal(x.p.slots.lmb.active,beam);assert.deepEqual(x.p.moveDir,move);
  assert.ok(beam.predictDirection(new THREE.Vector3(),1/60).angleTo(before)<1e-7,'Sustained beam steered with head-look');
 }finally{x.close();}
});
test('native pointer-lock event deltas reach only the Alt view through the production controller',()=>{
 const x=setup(),oldAdd=globalThis.addEventListener,oldDoc=globalThis.document,win={},doc={},events={};
 globalThis.addEventListener=(name,fn)=>win[name]=fn;globalThis.document={addEventListener:(name,fn)=>doc[name]=fn,pointerLockElement:null};
 const canvas={width:1600,height:900,getBoundingClientRect:()=>({left:0,top:0,width:1600,height:900}),addEventListener:(name,fn)=>events[name]=fn};
 try{
  x.g.input.bind(canvas);document.pointerLockElement=canvas;doc.pointerlockchange();
  win.keydown({code:'AltLeft',preventDefault(){}});
  events.mousemove({clientX:800,clientY:450,movementX:150,movementY:-60});
  const aim=x.p.aim3.clone();x.control(1/60);
  assert.equal(x.w._lookYaw,0);assert.equal(x.w._lookPitch,0);assert.ok(x.p.aim3.angleTo(aim)<1e-7);
  assert.ok(Math.abs(x.w._freeLook.yaw+.36)<1e-9);assert.equal(x.g.input.mouse.locked,true);
  x.g.input.endFrame();document.pointerLockElement=null;doc.pointerlockchange();x.control(0);
  assert.equal(x.w.freeLooking,false,'Actual capture loss retained the Alt view');
  assert.equal(x.g.input.down('AltLeft'),false);assert.equal(x.g.input.cancelVersion,1);
  doc.pointerlockchange();assert.equal(x.g.input.cancelVersion,1,'Denied capture should preserve fallback input');
 }finally{globalThis.addEventListener=oldAdd;globalThis.document=oldDoc;x.close();}
});
for(const hz of [30,60,120])test(`shoulder bounds and smooth return preserve aim at ${hz}Hz`,()=>{
 const x=setup('sol',true);try{
  const original=view(x.w),eye=x.w.camera.position.clone(),heading=x.w._lookYaw,aim=x.p.aim3.clone();
  x.g.input.keys.add('AltRight');x.g.input.mouse.dx=1e5;x.control(1/hz);x.g.input.endFrame();
  const angle=view(x.w).angleTo(original);assert.equal(Math.abs(x.w._freeLook.yaw),FREE_LOOK_DEFAULTS.yawLimit);assert.ok(angle>.1&&angle<.4,`rear-side yaw ${angle}`);
  assert.ok(x.w.camera.position.distanceTo(eye)>FREE_LOOK_DEFAULTS.sideShift*.9);
  x.g.input.keys.delete('AltRight');x.control(1/hz);
  assert.ok(view(x.w).angleTo(original)>0,'Release snapped the camera');assert.ok(view(x.w).angleTo(original)<angle);
  for(let i=1;i<hz;i++)x.control(1/hz);
  assert.ok(view(x.w).angleTo(original)<.001,'Camera did not return');assert.equal(x.w._lookYaw,heading);assert.ok(x.p.aim3.angleTo(aim)<1e-7);
 }finally{x.close();}
});
test('free look preserves hard lock and its target-owned aim',()=>{
 const x=setup();try{
  const foe=x.foe({x:25,z:80});x.g.hardLock=foe;x.w.snapChase();x.control(0);
  const before=x.p.aim3.clone(),basis=x.w.camBasis.clone(),heading=x.w._lookYaw;
  x.g.input.keys.add('AltLeft');x.g.input.mouse.dx=180;x.control(0);
  assert.equal(x.g.hardLock,foe);assert.equal(x.w._lookYaw,heading);assert.ok(x.p.aim3.angleTo(before)<1e-7);assert.ok(x.w.camBasis.distanceTo(basis)<1e-9);
  const player=x.p.center(new THREE.Vector3()).project(x.w.camera),locked=foe.center(new THREE.Vector3()).project(x.w.camera);
  assert.ok(Math.abs(player.x)<.9&&Math.abs(player.y)<.9,'Player left the composed frame');
  assert.ok(Math.abs(locked.x)<.9&&Math.abs(locked.y)<.9,'Locked target left the composed frame');
 }finally{x.close();}
});
for(const boundary of ['blur','pause','KO','map'])test(`${boundary} clears independent look without a held latch`,()=>{
 const x=setup();try{
  x.g.input.keys.add('AltLeft');x.g.input.mouse.dx=150;x.control();x.g.input.endFrame();
  assert.ok(Math.abs(x.w._freeLook?.yaw??0)>.3,'No independent offset to clear');
  if(boundary==='blur'){x.g.input.keys.clear();x.g.input.cancelVersion++;}
  if(boundary==='pause')x.g.running=false;
  if(boundary==='KO')x.p.state='ko';
  if(boundary==='map')x.g.mapCam={};
  x.g.prepareCombatView(0);assert.equal(x.w._freeLook?.yaw??0,0);assert.equal(x.w._freeLook?.pitch??0,0);assert.equal(x.w._freeLook?.held??false,false);
 }finally{x.close();}
});
test('existing HUD projects the preserved combat aim inside the composed Alt view',()=>{
 const x=setup();try{
  const cross={style:{setProperty(k,v){this[k]=v;}},dataset:{},classList:{toggle(){}}},hud={syncCombatView:()=>true,el:{cross},_lkCls:false};
  x.g.input.keys.add('AltLeft');x.g.input.mouse.dx=100;x.control(0);
  HUD.prototype.updateCrosshair.call(hud,x.g);assert.notEqual(cross.style.transform,'translate(0px, 0px)','False center reticle while aiming elsewhere');
  assert.ok(Math.abs(hud._csx)>20);
  x.g.input.mouse.dx=1e5;x.control(0);HUD.prototype.updateCrosshair.call(hud,x.g);
  assert.notEqual(cross.style.visibility,'hidden');
  assert.ok(Math.abs(hud._csx)<=innerWidth/2-40&&Math.abs(hud._csy)<=innerHeight/2-40);
  const local=new THREE.Vector3(-20,0,50);x.g._aim3pt.copy(local.applyMatrix4(x.w.camera.matrixWorld));
  HUD.prototype.updateCrosshair.call(hud,x.g);assert.equal(cross.dataset.label,'AIM BEHIND');assert.ok(hud._csx<0,'Behind-left aim mirrored to the right');
  x.g.input.keys.delete('AltLeft');x.control(2);HUD.prototype.updateCrosshair.call(hud,x.g);
  assert.notEqual(cross.dataset.aimMode,'free-look-edge');assert.equal(cross.style.transform,'translate(0px, 0px)');
 }finally{x.close();}
});
test('native Alt events suppress menu activation only in captured combat and blur releases them',()=>{
 const oldAdd=globalThis.addEventListener,oldDoc=globalThis.document,win={},doc={},events={};
 globalThis.addEventListener=(name,fn)=>win[name]=fn;globalThis.document={addEventListener:(name,fn)=>doc[name]=fn,pointerLockElement:null};
 const canvas={width:800,height:600,getBoundingClientRect:()=>({left:0,top:0,width:800,height:600}),addEventListener:(name,fn)=>events[name]=fn};
 try{
  const input=new Input();input.bind(canvas);let prevented=0;
  const alt={code:'AltLeft',repeat:false,preventDefault(){prevented++;}};
  win.keydown(alt);win.keyup(alt);assert.equal(prevented,0);
  input.pointerLock=true;win.keydown(alt);win.keyup(alt);assert.equal(prevented,2);
  win.keydown(alt);assert.equal(input.down('AltLeft'),true);win.blur();assert.equal(input.down('AltLeft'),false);
 }finally{globalThis.addEventListener=oldAdd;globalThis.document=oldDoc;}
});

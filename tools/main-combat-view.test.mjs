import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import * as THREE from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {SETTINGS} from '../src/core/settings.js';
import {HUD} from '../src/engine/hud.js';

const policyPath=new URL('../src/engine/combat-view.js',import.meta.url);
const policy=existsSync(policyPath)?await import(policyPath):{};
const state=()=>({modeId:'freeroam',running:true,mode:{},ms:{roam:true},player:{alive:true},humans:[{}],hud:{titleOpen:false}});
test('city view policy is independent of fighter/world simulation identity',()=>{
 assert.equal(typeof policy.combatView,'function','Missing camera-only view policy');
 const g=state(),before=structuredClone(g);
 assert.equal(policy.combatView(g),'bfp');assert.equal(policy.combatLookActive(g),true);assert.deepEqual(g,before);
 assert.equal(policy.combatView(null),'legacy','HUD initialization has no game yet');
});
for(const [name,patch,want] of [
 ['two local humans',{humans:[{},{}]},'shared'],['dead second human',{humans:[{}, {fighter:{alive:false}}]},'shared'],
 ['map override',{mapCam:{}},'override'],['dead player',{player:{alive:false}},'legacy'],['missing player',{player:null},'legacy'],
 ['specialist room',{modeId:'boxing'},'legacy'],['PowerWorld',{modeId:'powerworld',ms:{chaseCam:true,powerworld:true}},'bfp'],
])test(`view ownership preserves ${name}`,()=>{
 assert.equal(typeof policy.combatView,'function','Missing camera-only view policy');
 assert.equal(policy.combatView({...state(),...patch}),want);
});
for(const [name,patch] of [['pause',{running:false}],['title',{hud:{titleOpen:true}}],['overlay',{combatOverlayOpen:true}],['end',{matchOver:true}]])
 test(`${name} cannot capture combat input`,()=>{
  assert.equal(typeof policy.combatLookActive,'function','Missing capture ownership policy');
  assert.equal(policy.combatLookActive({...state(),...patch}),false);
 });

test('explicit native BFP camera keeps city simulation and authored fixed framing',()=>{
 const x=mainCombatFixture();try{
  const {w,p}=x,before={pos:p.pos.toArray(),vel:p.vel.toArray(),flying:p.flying,flightTier:p.flightTier,open:p._openSky};
  w.chase(p,null,0,'bfp');
  assert.equal(w._bfpCameraActive,true,'Explicit style ignored for a city subject');
  assert.equal(w.camera.isPerspectiveCamera,true);assert.equal(w.camera.fov,73.74);
  assert.ok(w.camera.position.distanceTo(new THREE.Vector3(0,14.4,-25.5))<1e-8);
  assert.deepEqual({pos:p.pos.toArray(),vel:p.vel.toArray(),flying:p.flying,flightTier:p.flightTier,open:p._openSky},before);
 }finally{x.close();}
});

test('first native city control traces the new perspective eye even without mouse movement',()=>{
 const x=mainCombatFixture();try{
  const {w,p,g}=x;x.control(0);
  assert.equal(w.camera.isPerspectiveCamera,true,'Controller still uses the initial ortho view');
  const ray=w.camera.getWorldDirection(new THREE.Vector3()),eyeToPoint=g._aim3pt.clone().sub(w.camera.position).normalize();
  assert.ok(ray.angleTo(eyeToPoint)<1e-7);assert.ok(p.aimWorld.distanceTo(g._aim3pt)<1e-9);
  assert.equal(p._openSky,undefined);assert.equal(g.hardLock,null);
 }finally{x.close();}
});

test('final native city camera arbiter does not revert the prepared perspective view to iso',()=>{
 const x=mainCombatFixture();try{x.control();x.g.cameraDrive(1/60);assert.equal(x.w.camMode,'chase');assert.equal(x.w.camera.fov,73.74);}
 finally{x.close();}
});

for(const mode of ['freeroam','powerworld'])test(`${mode} enemy knockout cannot steal a living player's view or held attack`,()=>{
 const x=mainCombatFixture({mode,hero:'kano'});try{
  if(mode==='powerworld')x.g.ms.chaseCam=true;
  x.control(0);x.p.slots.lmb.charging=true;x.p.slots.lmb.chargeT=.5;x.g.input.mouse.left=true;
  const victim=x.foe();victim.lastHitBy=x.p;victim.state='ko';
  x.g.startKoCam(victim);x.g.updateKoCam(1/60);x.g.cameraDrive(1/60);x.g.prepareCombatView(0);
  assert.equal(x.g.mapCam??null,null,'Enemy KO replaced the live aiming camera');
  assert.equal(x.g.input.pointerLock,true);assert.equal(x.g.input.mouse.left,true);
  assert.equal(x.p.slots.lmb.charging,true);assert.equal(x.w.camMode,'chase');
 }finally{x.close();}
});

test('own knockout still permits the non-interactive ragdoll camera',()=>{
 const x=mainCombatFixture();try{
  x.control(0);x.p.state='ko';x.g.startKoCam(x.p);x.g.updateKoCam(1/60);
  assert.ok(x.g.mapCam);x.g.prepareCombatView(0);assert.equal(x.g.input.pointerLock,false);
 }finally{x.close();}
});
test('native mouse flick orbits the eye before aim and firing never acquires a lock',()=>{
 const x=mainCombatFixture();try{
  x.control(0);x.g.input.mouse.dx=180;x.control(0);
  const ray=x.w.camera.getWorldDirection(new THREE.Vector3()),direction=x.g._aim3pt.clone().sub(x.w.camera.position).normalize();
  assert.ok(ray.angleTo(direction)<1e-7);assert.ok(Math.abs(x.w._lookYaw+.432)<1e-9);
  const foe=x.foe();x.g._hoverPick=foe;x.g.input.mouse.leftEdge=true;x.g.input.mouse.left=true;x.control(0);
  assert.equal(x.g.hardLock,null);
 }finally{x.close();}
});
for(const kind of ['visible','ally','hidden','cover'])test(`native chase T lock respects ${kind} physical target`,()=>{
 const x=mainCombatFixture();try{
  x.control(0);const f=x.foe({y:9,team:kind==='ally'?x.p.team:2});
  if(kind==='hidden')f._vis=0;
  if(kind==='cover')x.w.cover.push({x:0,z:35,hx:8,hz:2,top:30});
  x.g.input.justPressed.add('KeyT');x.control(0);
  assert.equal(x.g.hardLock,kind==='visible'?f:null);
  if(kind==='visible'){x.g.input.endFrame();x.g.input.justPressed.add('KeyT');x.control(0);assert.equal(x.g.hardLock,null);}
  if(kind==='ally'){assert.equal(x.g.lockTarget,null);assert.equal(x.g._aimHit.ent,f,'Ally remains a physical aim surface');}
 }finally{x.close();}
});
test('camera-relative city walk follows current view while remaining planar and ground-only heroes cannot fly',()=>{
 const old=SETTINGS.moveRelative,x=mainCombatFixture({hero:'sarge'});try{
  SETTINGS.moveRelative='camera';x.control(0);x.w._lookYaw=Math.PI/2;x.w._lookPitch=.5;
  x.g.input.keys.add('KeyW');x.g.input.justPressed.add('KeyF');x.control(0);
  assert.ok(x.p.moveDir.x>.999&&Math.abs(x.p.moveDir.z)<1e-7);assert.equal(x.p.moveDir.y??0,0);
  assert.equal(x.p.flying,false);assert.equal(x.p._openSky,undefined);
 }finally{SETTINGS.moveRelative=old;x.close();}
});
for(const hz of [30,60,120])test(`native one-player pad look holds heading on release at ${hz}Hz`,()=>{
 const x=mainCombatFixture();try{
  x.pad.active=true;x.pad.rx=.5;x.pad.ry=-.25;
  for(let i=0;i<hz;i++)x.control(1/hz);
  assert.ok(Math.abs(x.w._lookYaw+1.2)<1e-8);assert.ok(Math.abs(x.w._lookPitch-.6)<1e-8);
  x.pad.rx=x.pad.ry=0;const before=x.w.camera.quaternion.clone();x.control(1/hz);
  assert.ok(before.angleTo(x.w.camera.quaternion)<1e-7);
  x.g.input.mouse.dx=10;x.control(1/hz);assert.ok(Math.abs(x.w._lookYaw+1.224)<1e-8,'Neutral active pad swallowed mouse handoff');
 }finally{x.close();}
});
for(const boundary of ['pause','overlay','map','KO','replacement'])test(`native ${boundary} retires charge and held view input at zero time`,()=>{
 const x=mainCombatFixture();try{
  x.control(0);x.p.slots.lmb.charging=true;x.p.slots.lmb.chargeT=.5;x.p.meleeCharge=.4;
  x.g.input.mouse.left=true;x.g.input.mouse.dx=40;x.pad.cur={lmb:true,item:true};
  if(boundary==='pause')x.g.running=false;
  if(boundary==='overlay')x.g.hud={overlayOpen:()=>true};
  if(boundary==='map')x.g.mapCam={x:0,z:0,yaw:0,pitch:.8,zoom:78};
  if(boundary==='KO')x.p.state='ko';
  if(boundary==='replacement'){const f=x.foe();x.g.player=f;x.g.humans=[{fighter:f,scheme:'kbm'}];}
  x.g.prepareCombatView(0);
  assert.equal(x.p.slots.lmb.charging,false);assert.equal(x.p.meleeCharge,0);assert.equal(x.g.input.mouse.left,false);assert.equal(x.g.input.mouse.dx,0);
  if(boundary!=='replacement')assert.equal(x.g.input.pointerLock,false);
  assert.equal(x.pad.down('lmb'),false);assert.equal(x.pad.down('item'),false);
 }finally{x.close();}
});
for(const firstRelease of ['guard','item'])test(`L1 plus R3 keeps guard and consumes item through ${firstRelease}-first release`,()=>{
 const x=mainCombatFixture();try{
  assert.equal(typeof x.pad.sampleCombatLock,'function');
  x.pad.prev={guard:true};x.pad.cur={guard:true,item:true};
  assert.equal(x.pad.sampleCombatLock(true),true);assert.equal(x.pad.down('guard'),true);assert.equal(x.pad.down('item'),false);
  x.pad.prev={...x.pad.cur};x.pad.cur[firstRelease]=false;
  assert.equal(x.pad.sampleCombatLock(true),false);assert.equal(x.pad.pressed('item'),false);assert.equal(x.pad.released('item'),false);
  x.pad.prev={...x.pad.cur};x.pad.cur={};x.pad.sampleCombatLock(false);assert.equal(x.pad.released('item'),false);
  x.pad.prev={};x.pad.sampleCombatLock(true);x.pad.cur={item:true};
  assert.equal(x.pad.sampleCombatLock(true),false);assert.equal(x.pad.pressed('item'),true);
  x.pad.cur={descend:true};assert.equal(x.pad.down('descend'),true);
 }finally{x.close();}
});

test('native HUD separates compact chase presentation from city identity and retires it for overlays',()=>{
 const doc=globalThis.document,x=mainCombatFixture(),classes=new Set();
 globalThis.document={body:{classList:{toggle(k,on){if(on)classes.add(k);else classes.delete(k);},contains:k=>classes.has(k)}}};
 const hud=Object.create(HUD.prototype);hud.el={cross:{style:{},dataset:{}}};
 try{
  hud.updateCrosshair(x.g);
  assert.ok(classes.has('combat-chase'),'Native city crosshair/layout remains disabled');assert.ok(!classes.has('powerworld'));
  assert.notEqual(hud.el.cross.style.visibility,'hidden');
  x.g.combatOverlayOpen=true;hud.updateCrosshair(x.g);
  assert.ok(!classes.has('combat-chase'));assert.equal(hud.el.cross.style.visibility,'hidden');
  x.g.combatOverlayOpen=false;x.g.modeId='powerworld';x.g.ms.chaseCam=true;hud.updateCrosshair(x.g);
  assert.ok(classes.has('combat-chase'));assert.ok(classes.has('powerworld'));
  x.g.modeId='freeroam';x.g.humans.push({fighter:{alive:false}});hud.updateCrosshair(x.g);
  assert.ok(!classes.has('combat-chase'));assert.ok(!classes.has('powerworld'));
 }finally{globalThis.document=doc;x.close();}
});

test('native city chase hides duplicate ground and floating reticles',()=>{
 const x=mainCombatFixture();try{
  x.g.reticle=new THREE.Object3D();x.g.redTri=new THREE.Object3D();x.g.reticle.visible=x.g.redTri.visible=true;
  x.g.hardLock=x.foe();
  x.g.updateReticle(0);assert.equal(x.g.reticle.visible,false);assert.equal(x.g.redTri.visible,false);
 }finally{x.close();}
});

test('native chase R3 spends a carried medkit once, while L1 plus R3 only locks and guards',()=>{
 const x=mainCombatFixture();try{
  x.control(0);x.p.hp=10;x.p.items=[{def:{kind:'medkit',heal:20,charges:2},charges:2,state:'ready'}];
  x.pad.active=true;x.pad.cur={item:true};x.control(0);
  assert.ok(x.p.hp>10,'Standalone native R3 never reaches useItem');assert.equal(x.p.items[0].charges,1);
  x.pad.prev=x.pad.cur;x.pad.cur={};x.control(0);x.pad.prev={};x.control(0);
  x.p.items[0].state='ready';const hp=x.p.hp,ki=x.p.ki;const target=x.foe({y:9});
  x.pad.cur={guard:true,item:true};x.control(0);
  assert.equal(x.g.hardLock,target);assert.equal(x.p.guarding,true);assert.equal(x.p.hp,hp);assert.equal(x.p.items[0].charges,1);
  assert.equal(x.p.ki,ki);assert.equal(x.g.projectiles.list.length,0);
 }finally{x.close();}
});

test('native floor discovery supports the elevated city BFP eye without a synthetic ballistic pose',()=>{
 const x=mainCombatFixture({height:18});try{
  x.p.groundY=0;
  for(let i=0;i<120;i++)x.p.update(1/60,x.g);
  assert.equal(x.p.groundY,18);assert.equal(x.p.gait,'grounded');assert.equal(x.p.pos.y,18);
  x.w._lookActive=true;x.w._lookPitch=Math.PI/3;x.w.chase(x.p,null,0,'bfp');
  const ray=new THREE.Raycaster(x.w.camera.position,x.w.camera.getWorldDirection(new THREE.Vector3()),.6,30);
  const hits=ray.intersectObject(x.p.parts.body,true).filter(hit=>{
   for(let o=hit.object;o;o=o.parent)if(!o.visible)return false;
   return [].concat(hit.object.material).some(m=>!m.transparent);
  });
  assert.equal(hits.length,0);
 }finally{x.close();}
});

test('native three-argument camera compatibility and map/shared ownership remain isometric',()=>{
 const x=mainCombatFixture();try{
  x.w.chase(x.p,null,0);assert.equal(x.w._bfpCameraActive,false);
  x.control(0);const p2=x.foe({x:40});x.g.humans.push({fighter:p2,scheme:'pad'});
  x.g.prepareCombatView(0);x.g.cameraDrive(0);assert.equal(x.w.camMode,'iso');assert.equal(x.g.input.pointerLock,false);
  p2.state='ko';x.g.cameraDrive(0);assert.equal(x.w.camMode,'iso');
  x.g.humans.pop();x.control(0);x.g.mapCam={x:4,z:8,yaw:1,pitch:.8,zoom:78};
  x.g.prepareCombatView(0);x.g.cameraDrive(0);assert.equal(x.w.camMode,'iso');assert.equal(x.g.input.pointerLock,false);
  x.g.mapCam=null;x.control(0);assert.equal(x.w.camMode,'chase');assert.equal(x.w.camera.fov,73.74);
 }finally{x.close();}
});

test('native double-tap evade follows the same flat camera basis as city walking',()=>{
 const old=SETTINGS.moveRelative,x=mainCombatFixture({hero:'sarge'});try{
  SETTINGS.moveRelative='camera';x.control(0);x.w._lookYaw=Math.PI/2;
  x.g._tapT={KeyW:performance.now()/1000-.1};x.g.input.justPressed.add('KeyW');x.control(0);
  assert.ok(x.p.vel.x>20);assert.ok(Math.abs(x.p.vel.z)<1e-7);assert.equal(x.p._openSky,undefined);
 }finally{SETTINGS.moveRelative=old;x.close();}
});

test('native form rebind and KO/respawn retire prior life input before a zero-time control',()=>{
 const x=mainCombatFixture();try{
  x.control(0);x.p.slots.lmb.charging=true;x.g.input.mouse.left=true;const old=x.p.parts;
  x.p.applyForm({frame:{scale:1.2}});assert.notEqual(x.p.parts,old);x.g.prepareCombatView(0);
  assert.equal(x.p.slots.lmb.charging,false);assert.equal(x.g.input.mouse.left,false);
  x.p._ko();x.g.prepareCombatView(0);assert.equal(x.g.input.pointerLock,false);
  x.pad.cur={lmb:true};x.g.prepareCombatView(0);x.p.koT=3.5;x.p._updateKO(0,x.g);
  assert.equal(x.p.alive,true);x.control(0);assert.equal(x.pad.down('lmb'),false);
  assert.equal(x.p.slots.lmb.charging,false);assert.equal(x.g.projectiles.list.length,0);
 }finally{x.close();}
});

for(const firstRelease of ['guard','item'])test(`actual standard pad polling suppresses a paused ${firstRelease}-first chord until physical release`,()=>{
 const desc=Object.getOwnPropertyDescriptor(globalThis,'navigator'),x=mainCombatFixture();
 const gp={connected:true,axes:[0,0,.62,-.43],buttons:Array.from({length:16},()=>({pressed:false}))};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>[gp]}});
 try{
  x.pad.update();x.control(1/60);
  assert.ok(Math.abs(x.pad.rx-.5)<1e-9);assert.ok(Math.abs(x.pad.ry+.25)<1e-9);
  const yaw=x.w._lookYaw;gp.axes=[0,0,.1,-.1];x.pad.update();x.control(1/60);assert.equal(x.w._lookYaw,yaw);
  x.p.hp=10;x.p.items=[{def:{kind:'medkit',heal:20,charges:2},charges:2,state:'ready'}];
  gp.buttons[4].pressed=gp.buttons[11].pressed=true;x.pad.update();x.control(0);
  assert.equal(x.p.items[0].charges,2);assert.equal(x.p.guarding,true);
  x.g.running=false;x.pad.update();x.g.prepareCombatView(0);
  gp.buttons[firstRelease==='guard'?4:11].pressed=false;x.pad.update();x.g.prepareCombatView(0);
  x.g.running=true;x.pad.update();x.control(0);assert.equal(x.p.items[0].charges,2);
  gp.buttons[4].pressed=gp.buttons[11].pressed=false;x.pad.update();x.control(0);x.pad.update();x.control(0);
  gp.buttons[11].pressed=true;x.pad.update();x.control(0);assert.equal(x.p.items[0].charges,1);
  gp.buttons[11].pressed=false;gp.buttons[10].pressed=true;x.pad.update();x.control(0);assert.equal(x.p.descendHeld,true);
 }finally{if(desc)Object.defineProperty(globalThis,'navigator',desc);else delete globalThis.navigator;x.close();}
});

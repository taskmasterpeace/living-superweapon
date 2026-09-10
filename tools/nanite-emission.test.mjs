import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {runSlot,cancelHeldSlot,clearSlotFx} from '../src/engine/abilities.js';
import {castHandMask} from '../src/engine/cast-channels.js';
import {advanceNanites,damageNanite} from '../src/engine/nanite-state.js';
import {presentNanites} from '../src/engine/nanite-forearms.js';
import {naniteUseReason,naniteEnvelopeClear} from '../src/engine/nanite-pose.js';
import {Game} from '../src/engine/game.js';
import {MeleeSystem} from '../src/engine/melee.js';
import {queueHitReaction} from '../src/engine/hit-reaction.js';
import {Input} from '../src/core/input.js';
import {SETTINGS,keymap} from '../src/core/settings.js';
import {POWERS,buildDef,freshPicks} from '../src/data/creator.js';
import {applyAttackOverrides,setAttackOverride} from '../src/data/attack-tuning.js';

const CANNON={type:'charge',name:'Private Nanite Cannon',naniteForm:'cannon',naniteAttachment:'right-forearm',cost:6,cd:1.2,kiPerSec:12,maxCharge:1.8,minR:.55,maxR:1.8,dmgMin:20,dmgMax:64,maxBlast:18,speedMin:65,speedMax:105,chargePower:2.2,color:'#ffd97a',color2:'#ffffff'};
const SHIELD={type:'naniteShield',name:'Private Nanite Shield',naniteForm:'shield',naniteAttachment:'left-forearm',cost:0,cd:.2};
function fixture({side='right',body='procedural',motion='ground',fps=60,assembled=true,extra={},frame,definition}={}){
 const def=structuredClone(definition||ROSTER.find(d=>d.id==='sol'));if(!definition)def.id='private-nanite-emission';def.model={...def.model,body,costume:'martial'};
 if(!definition)def.abilities={lmb:{...CANNON,naniteAttachment:`${side}-forearm`,...extra},q:{...SHIELD,naniteAttachment:`${side==='right'?'left':'right'}-forearm`}};
 if(frame)def.frame=frame;
 const f=new Fighter(def),scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const stage=new StudioCombat(scene,world),g=stage.game;g.entities=[f];scene.add(f.obj);f._game=g;f._openSky=true;f.level=10;f.ki=100;f.maxKi=100;f.animT=0;
 f._altTag=()=>{}; // Canvas-only altitude label; native body/attachment animation remains real.
 f.pos.set(0,motion==='ground'?0:45,0);f.flying=motion!=='ground';f.gait=f.flying?'airborne':'grounded';f.vel.set(8,0,motion==='fly'?30:0);
 f.hasAimWorld=true;f.aimWorld.set(4,f.pos.y+9,60);f.aim.set(0,0,1);f.aim3.copy(f.aimWorld).sub(new THREE.Vector3(0,f.pos.y+6,0)).normalize();f.facing=0;
 const events={denied:0,feed:[],release:0,punch:0,shake:0,flash:0,charge:0,stop:0};g.isHuman=()=>true;g.onNoKi=()=>events.denied++;g.hud={feed:t=>events.feed.push(t)};
 g.audio={...g.audio,charge(){events.charge++;return {ramp(){},stop(){events.stop++;}};},kiRelease(){events.release++;}};
 world.punch=()=>events.punch++;world.shake=()=>events.shake++;g.vfx.flash=()=>events.flash++;
 const dt=1/fps,animate=(step=dt)=>{f.advanceActionPose(step);f.animT+=step;f._animate(step);f.obj.updateMatrixWorld(true);};
 for(let i=0;i<fps;i++)animate();if(assembled){advanceNanites(f._nanites,.65,new Set(['lmb','q']));presentNanites(f);}
 const input=(held,pressed=false,key='lmb')=>runSlot(f,key,{held,pressed,released:!held,dt},g);
 const charge=(seconds=.5)=>{for(let i=0;i<Math.ceil(seconds/dt);i++){input(true,i===0);animate();}};
 const release=()=>{input(false);const shot=g.projectiles.list.at(-1);animate();return shot;};
 return {f,g,world,events,dt,animate,input,charge,release,close(){clearSlotFx(f);stage.dispose();f.dispose();}};
}
const axis=f=>new THREE.Vector3(0,-1,0).transformDirection(f.parts.nanites.get('lmb').socket.matrixWorld);
const aperture=f=>f.parts.nanites.get('lmb').socket.getWorldPosition(new THREE.Vector3());

for(const side of ['right','left'])test(`raw ${side} cannon reserves its actual anatomical forearm`,()=>{
 const x=fixture({side});try{assert.equal(castHandMask(x.f,x.f.slots.lmb.def),side==='right'?1:2);}finally{x.close();}
});
test('unassembled native press is structurally denied before payment, cooldown, input stamping or preparation',()=>{
 const x=fixture({assembled:false});try{const {f,input,events,g}=x;f.ki=0;input(true,true);
  assert.equal(f.slots.lmb.charging,false);assert.equal(f.slots.lmb.cd,0);assert.equal(f.slots.lmb.orb,undefined);assert.equal(f._slotUse?.lmb,undefined);assert.equal(g.projectiles.list.length,0);assert.equal(events.denied,0);assert.ok(events.feed.some(t=>/assembling/i.test(t)));
  advanceNanites(f._nanites,.65,new Set(['lmb','q']));presentNanites(f);f.ki=100;input(true);assert.equal(f.slots.lmb.charging,false,'denied hold must not queue a shot after readiness');
  input(true,true);assert.equal(f.slots.lmb.charging,true);assert.ok(f.ki<94);
 }finally{x.close();}
});
for(const side of ['right','left'])test(`${side} real forearm aims and clear native finite sphere launches from final aperture`,()=>{
 const x=fixture({side});try{const {f,g,charge,release,events}=x;charge();
  const at=aperture(f),wanted=f.aimWorld.clone().sub(at).normalize();assert.ok(axis(f).angleTo(wanted)<=Math.PI/60,'actual parent forearm is not aligned with target');
  const orb=f.slots.lmb.orb;assert.ok(orb.position.distanceTo(at.clone().addScaledVector(wanted,orb.scale.x))<1e-5);
  const shot=release();assert.ok(shot);assert.equal(events.release,0,'release sound must await final validation');
  const final=aperture(f),direction=f.aimWorld.clone().sub(final).normalize();shot.resolveLaunch(g);
  assert.equal(shot.dead,false);assert.ok(shot.launchOrigin.distanceTo(final.addScaledVector(direction,shot.radius))<1e-5);assert.ok(axis(f).angleTo(shot.vel.clone().normalize())<=Math.PI/60);assert.equal(events.release,1);
 }finally{x.close();}
});
test('invalid pending cannon after KO is terminal even through direct resolver/update and new-life repair',()=>{
 const x=fixture();try{const {f,g,charge,release,events}=x;charge();const shot=release();f._ko();
  assert.equal(shot.dead,true,'KO cleanup must retire unresolved cannon energy before final resolution');
  const feedback={release:events.release,flash:events.flash};shot.resolveLaunch(g);assert.equal(shot.update(1/60,g),false);assert.deepEqual({release:events.release,flash:events.flash},feedback);assert.equal(shot.obj.parent,null);
 }finally{x.close();}
});
test('critical break cancellation permanently retires pending shot but never already traveling energy',()=>{
 const x=fixture();try{const {f,g,charge,release}=x;charge();const traveling=release();traveling.resolveLaunch(g);f.slots.lmb.cd=0;charge();const pending=release(),m=f._nanites.modules.get('lmb');
  const result=damageNanite(f._nanites,{slot:'lmb',epoch:m.epoch,cell:0,point:aperture(f),normal:{x:0,y:1,z:0}},20,false);cancelHeldSlot(f,result.disabledSlot);
  assert.equal(pending.dead,true);assert.equal(traveling.dead,false);advanceNanites(f._nanites,1.15,new Set(['lmb','q']));presentNanites(f);pending.resolveLaunch(g);assert.equal(pending.dead,true);assert.equal(pending.obj.parent,null);
 }finally{x.close();}
});
test('pending cancellation works after slot deletion and does not require its retired epoch to match',()=>{
 const x=fixture();try{const {f,g,charge,release}=x;charge();const shot=release();delete f.slots.lmb;f.update(0,g);assert.equal(shot.dead,true);shot.resolveLaunch(g);assert.equal(shot.obj.parent,null);}finally{x.close();}
});

for(const kind of ['cover','interior','ground'])test(`actual barrel ${kind} overlap terminally denies the paid final launch`,()=>{
 const x=fixture();try{const {f,g,world,charge,release,events}=x;charge();const shot=release(),v=f.parts.nanites.get('lmb'),p=v.layout[2].center.clone().applyMatrix4(v.root.matrixWorld);
  if(kind==='cover')world.cover.push({x:p.x,z:p.z,hx:.015,hz:.015,bottom:p.y-.015,top:p.y+.015,projectileShape:'box'});
  else if(kind==='interior')world.interiors.push({x:p.x,z:p.z,hx:5,hz:5,top:p.y+.1,walls:[{x:p.x,z:p.z,hx:.015,hz:.015}]});
  else world.heightAt=()=>p.y+.1;
  const cues={release:events.release,flash:events.flash};shot.resolveLaunch(g);assert.equal(shot.dead,true);assert.equal(f.slots.lmb._naniteDenied,'obstructed');assert.deepEqual({release:events.release,flash:events.flash},cues);
  world.cover.length=0;world.interiors.length=0;world.heightAt=()=>0;shot.resolveLaunch(g);assert.equal(shot.dead,true,'removed obstacle must not revive the shot');
 }finally{x.close();}
});
test('actual torso volume at a barrel cannot be replaced by an accurate independent ray',()=>{
 const x=fixture();try{const {f,g,charge,release}=x;charge();const shot=release(),v=f.parts.nanites.get('lmb');
  const p=v.layout[0].center.clone().applyMatrix4(v.root.matrixWorld);f.parts.torso.parent.worldToLocal(p);f.parts.torso.position.copy(p);f.obj.updateMatrixWorld(true);
  assert.equal(naniteUseReason(f,'lmb'),'obstructed');shot.resolveLaunch(g);assert.equal(shot.dead,true);
 }finally{x.close();}
});
test('behind-body and inside-aperture command targets do not launch energy',()=>{
 for(const target of [new THREE.Vector3(0,6,-10),new THREE.Vector3(0,6,0)]){const x=fixture();try{x.f.aimWorld.copy(target);x.charge();const shot=x.release();if(shot)shot.resolveLaunch(x.g);assert.ok(!shot||shot.dead);assert.equal(x.events.release,0);}finally{x.close();}}
});
test('a mounted weapon owns its forearm even when its native grip flag is absent',()=>{
 const x=fixture();try{const hand=x.f.parts.armL.children[2],weapon=new THREE.Group();weapon.userData.weaponKind='rifle';hand.add(weapon);delete hand.userData.gripOccupied;
  x.input(true,true);assert.equal(x.f.slots.lmb.charging,false);assert.equal(x.f.slots.lmb._naniteDenied,'occupied');assert.equal(x.f.ki,100);
 }finally{x.close();}
});

test('configured native charge stages drive nozzle gather, bounded vent closure and compressed core',()=>{
 const x=fixture({extra:{naniteStage1:.15,naniteStage2:.45}});try{const {f,input,animate}=x,v=f.parts.nanites.get('lmb');input(true,true);
  const poseAt=ratio=>{f.slots.lmb.chargeT=ratio*1.8;animate(0);return f.slots.lmb.orb;};
  let orb=poseAt(.1);assert.equal(v.chargeStage,0);assert.equal(v.vents.visible,false);assert.equal(orb.children[0].visible,false);assert.ok(f.slots.lmb.gather.visible);
  orb=poseAt(.2);assert.equal(v.chargeStage,1);assert.equal(v.vents.visible,true);assert.equal(orb.children[0].visible,false);
  orb=poseAt(.5);assert.equal(v.chargeStage,2);assert.equal(orb.children[0].visible,true);assert.ok(orb.scale.x<=v.fit.barrelHalfWidth*1.5);assert.equal(v.hull.material.opacity,1);
  const held=f.ki,s=x.release();s.resolveLaunch(x.g);assert.equal(s.radius,.55+.5*1.25);assert.equal(f.ki,held);assert.equal(v.vents.visible,false);
 }finally{x.close();}
});
test('private shield toggles without healing and keeps native guard semantics unchanged',()=>{
 const x=fixture();try{const {f,input}=x,m=f._nanites.modules.get('q'),guardType=f.def.guardType;m.cells[3].hp=5;
  input(true,true,'q');assert.equal(m.deployed,false);assert.equal(f.ki,100);assert.equal(f.slots.q.cd,.2*f.sheet.cdMult);f.slots.q.cd=0;
  input(true,true,'q');assert.equal(m.deployed,true);assert.equal(m.assemblyT,0);assert.equal(m.cells[3].hp,5);assert.equal(f.def.guardType,guardType);
 }finally{x.close();}
});
for(const side of ['right','left'])test(`${side} private shield follows native Guard normal, not a fist-only rotation`,()=>{
 const x=fixture({side});try{const {f,animate}=x;f.guarding=true;f.poseGuard=1;for(let i=0;i<30;i++)animate();const v=f.parts.nanites.get('q');
  const normal=new THREE.Vector3(0,0,1).transformDirection(v.root.matrixWorld),wanted=f.aim3.clone().normalize();assert.ok(normal.angleTo(wanted)<=Math.PI/60);assert.ok(naniteEnvelopeClear(f,v));assert.equal(f.slots.lmb.charging,false);
 }finally{x.close();}
});
test('real pad Guard masks new cannon/toggle input but releases the already paid charge exactly once',()=>{
 const x=fixture();try{const {f,g,dt,animate}=x,held=new Set(),pressed=new Set(),released=new Set();
  g.melee=new MeleeSystem(g);g.fwd=new THREE.Vector3(0,0,1);g.right=new THREE.Vector3(1,0,0);g.pad={lx:0,ly:0,rx:0,ry:0,aiming:false,down:k=>held.has(k),pressed:k=>pressed.has(k),released:k=>released.has(k)};
  const step=()=>{Game.prototype.controlPad.call(g,f,dt);animate();pressed.clear();released.clear();};
  held.add('guard');held.add('lmb');held.add('q');pressed.add('lmb');pressed.add('q');step();assert.equal(f.guarding,true);assert.equal(f.slots.lmb.charging,false);assert.equal(f._nanites.modules.get('q').deployed,true);assert.equal(f.ki,100);
  held.clear();step();held.add('lmb');pressed.add('lmb');for(let i=0;i<30;i++)step();assert.equal(f.slots.lmb.charging,true);const paid=f.ki;
  held.add('guard');step();assert.equal(f.guarding,true);assert.equal(f.slots.lmb.charging,false);assert.equal(f.ki,paid);assert.equal(g.projectiles.list.length,1);const shot=g.projectiles.list[0];shot.resolveLaunch(g);assert.equal(shot.dead,false);
  for(let i=0;i<30;i++)step();assert.equal(g.projectiles.list.length,1);held.clear();step();f.slots.lmb.cd=0;held.add('lmb');pressed.add('lmb');step();assert.equal(f.slots.lmb.charging,true);
 }finally{x.close();}
});

test('a tiny obstacle inside the open aperture is invalid even without touching a stave',()=>{
 const x=fixture();try{x.charge();const shot=x.release(),p=aperture(x.f);x.world.cover.push({x:p.x,z:p.z,hx:.001,hz:.001,bottom:p.y-.001,top:p.y+.001,projectileShape:'box'});shot.resolveLaunch(x.g);assert.equal(shot.dead,true);}finally{x.close();}
});
test('final form socket is reacquired and the captured command target survives a later aim input',()=>{
 const x=fixture();try{const {f,g,charge,release,animate}=x;charge();const shot=release(),target=f.aimWorld.clone(),old=f.parts.nanites.get('lmb').socket,epoch=f._nanites.modules.get('lmb').epoch;
  f.applyForm({name:'Native rebind',frame:{scale:1.2,bulk:1.1}});f.pos.x+=2;animate();assert.notEqual(f.parts.nanites.get('lmb').socket,old);assert.equal(f._nanites.modules.get('lmb').epoch,epoch);
  const expected=aperture(f),dir=target.clone().sub(expected).normalize();f.aimWorld.set(0,6,-80);shot.resolveLaunch(g);assert.equal(shot.dead,false);assert.ok(shot.launchOrigin.distanceTo(expected.addScaledVector(dir,shot.radius))<1e-5);
  const committed=shot.pos.clone();shot.pos.addScalar(100);f.pos.x-=8;animate();shot.resolveLaunch(g);assert.ok(shot.pos.distanceTo(committed.clone().addScalar(100))<1e-5,'committed/portal energy was dragged back');
 }finally{x.close();}
});
for(const fps of [30,60,120])for(const side of ['left','right'])for(const body of ['procedural','superhero-male','superhero-female'])
test(`${fps} Hz ${side} ${body}: moving target/recoil and zero-dt preserve fitted actual forearm aim`,()=>{
 for(const motion of ['ground','hover','fly']){const x=fixture({fps,side,body,motion});try{const {f,input,animate,dt}=x;const velocity=f.vel.clone();
  for(let i=0;i<Math.ceil(fps*.5);i++){f.aimWorld.x=4+Math.sin(i*dt*2)*8;f.pos.x+=dt*2;input(true,i===0);if(i===3)queueHitReaction(f,6,{kb:{x:2,y:0,z:-1}});animate();
   assert.equal(f.slots.lmb.charging,true,`${motion} denied: ${f.slots.lmb._naniteDenied}`);assert.ok(axis(f).angleTo(f.aimWorld.clone().sub(aperture(f)).normalize())<=Math.PI/60);assert.ok(naniteEnvelopeClear(f,f.parts.nanites.get('lmb')));
  }
  assert.deepEqual(f.vel.toArray(),velocity.toArray());const before=[...f.parts.nanites.get('lmb').socket.matrixWorld.elements];const state=JSON.stringify([...f._nanites.modules.values()]);for(let i=0;i<20;i++)animate(0);
  assert.ok(before.every((n,i)=>Math.abs(n-f.parts.nanites.get('lmb').socket.matrixWorld.elements[i])<1e-7));assert.equal(JSON.stringify([...f._nanites.modules.values()]),state);
  const s=x.release();s.resolveLaunch(x.g);assert.equal(s.dead,false);
 }finally{x.close();}}
});
for(const infinite of [false,true])test(`${infinite?'infinite':'finite'} core retains native partial/full/tiny charge cost and radius`,()=>{
 for(const seconds of [.05,.5,1.8]){const x=fixture();try{x.f.energyInfinite=infinite;x.charge(seconds);const held=Math.ceil(seconds/x.dt)*x.dt,shot=x.release(),tiny=held/1.8<.12;
  assert.equal(!!shot,!tiny);if(shot){shot.resolveLaunch(x.g);assert.equal(shot.dead,false);assert.ok(Math.abs(shot.radius-(.55+Math.min(1,held/1.8)*1.25))<1e-6);}
  assert.ok(Math.abs(x.f.ki-(infinite?100:100-held*12-(tiny?0:6)))<1e-6);assert.equal(x.events.stop,1);
 }finally{x.close();}}
});
test('native player keyboard Guard applies the mask and the paid release without a direct runSlot bypass',()=>{
 const x=fixture();try{const {f,g,world,dt,animate}=x,inp=new Input();g.player=f;g.humans=[{fighter:f}];g.input=inp;g.melee=new MeleeSystem(g);g._aim3pt=new THREE.Vector3();g._tapT={};g.aimPoint=new THREE.Vector3();g.fwd=new THREE.Vector3(0,0,1);g.right=new THREE.Vector3(1,0,0);
  g.pad={active:false,down:()=>false,pressed:()=>false,released:()=>false};g.hud.selectSlot=()=>{};g.validateLock=()=>{};world.aimTrace=out=>{out.point.set(4,9,60);return null;};
  const KM=keymap(SETTINGS.scheme),step=()=>{Game.prototype.controlPlayer.call(g,dt);animate();inp.endFrame();};
  inp.keys.add(KM.guard);inp.keys.add('KeyQ');inp.justPressed.add('KeyQ');step();assert.equal(f.guarding,true);assert.equal(f._nanites.modules.get('q').deployed,true);
  inp.keys.clear();step();inp.mouse.left=true;inp.mouse.leftEdge=true;for(let i=0;i<30;i++)step();assert.equal(f.slots.lmb.charging,true);
  const paid=f.ki;inp.keys.add(KM.guard);step();assert.equal(f.slots.lmb.charging,false);assert.equal(f.ki,paid);assert.equal(g.projectiles.list.length,1);g.projectiles.list[0].resolveLaunch(g);assert.equal(g.projectiles.list[0].dead,false);
 }finally{x.close();}
});

test('native bot busy dispatch stays skipped instead of gaining the player transition-release policy',()=>{
 const x=fixture();try{const {f,g,dt,animate}=x;g.melee=new MeleeSystem(g);g.incomingBeam=()=>null;g.incomingProjectile=()=>null;f.items=[];
  const intent={move:{x:0,z:0},aimDir:{x:0,z:1},aimAt:{x:4,y:4,z:60},slots:{lmb:{pressed:true,held:true}}};f.ai={intent:()=>intent,observeThreat:()=>false};
  Game.prototype.controlBot.call(g,f,dt);animate();intent.slots.lmb.pressed=false;for(let i=0;i<29;i++){Game.prototype.controlBot.call(g,f,dt);animate();}
  const energy=f.ki,time=f.slots.lmb.chargeT;f._guardT=1;Game.prototype.controlBot.call(g,f,dt);animate();assert.equal(f.guarding,true);assert.equal(f.slots.lmb.charging,true);assert.equal(f.slots.lmb.chargeT,time);assert.equal(f.ki,energy);assert.equal(g.projectiles.list.length,0);
  f._guardT=0;intent.slots.lmb={held:false,released:true};Game.prototype.controlBot.call(g,f,dt);animate();assert.equal(f.slots.lmb.charging,false);g.projectiles.list[0].resolveLaunch(g);assert.equal(g.projectiles.list[0].dead,false);
 }finally{x.close();}
});
test('dry native charge releases current investment while a structural interruption never refunds it',()=>{
 const x=fixture();try{x.charge();const paid=x.f.ki;x.f.ki=.1;let drained=0;x.g.onDrained=()=>drained++;x.input(true);x.animate();const shot=x.g.projectiles.list[0];assert.ok(shot);shot.resolveLaunch(x.g);assert.equal(shot.dead,false);assert.equal(drained,1);assert.ok(x.f.ki>=0);
  x.f.slots.lmb.cd=0;x.f.ki=paid;x.charge();const before=x.f.ki,m=x.f._nanites.modules.get('lmb');const r=damageNanite(x.f._nanites,{slot:'lmb',epoch:m.epoch,cell:1,point:aperture(x.f),normal:{x:0,y:1,z:0}},20,false);cancelHeldSlot(x.f,r.disabledSlot);
  assert.equal(x.f.ki,before);assert.equal(x.f.slots.lmb.orb,null);assert.equal(x.f.slots.lmb.sfx,null);assert.equal(shot.dead,false);advanceNanites(x.f._nanites,1.15,new Set(['lmb','q']));presentNanites(x.f);x.input(true);assert.equal(x.f.slots.lmb.charging,false);
 }finally{x.close();}
});
test('cannon does not steal an opposite arm charge and same-arm conflict remains unpaid',()=>{
 const x=fixture();try{const {f,input,animate}=x;f.slots.rmb={def:{...CANNON,naniteForm:undefined,naniteAttachment:undefined,castHand:'left'},cd:0,charging:false};input(true,true);input(true,true,'rmb');animate();for(let i=0;i<29;i++){input(true);input(true,false,'rmb');animate();}assert.equal(f.slots.lmb.charging,true);assert.equal(f.slots.rmb.charging,true);
  const s=x.release();s.resolveLaunch(x.g);assert.equal(s.dead,false);assert.equal(f.slots.rmb.charging,true);
  cancelHeldSlot(f,'rmb');f.slots.lmb.cd=0;f.slots.rmb.cd=0;f.slots.rmb.def.castHand='right';input(true,true);const ki=f.ki;input(true,true,'rmb');assert.equal(f.ki,ki);assert.equal(f.slots.rmb.charging,false);
 }finally{x.close();}
});
test('barrel-clear but cramped full sphere preserves native clip/contact rather than structural denial',()=>{
 const x=fixture();try{x.charge(1.8);const shot=x.release(),p=aperture(x.f),d=axis(x.f),wall=p.clone().addScaledVector(d,shot.radius*.8);x.world.cover.push({x:wall.x,z:wall.z,hx:3,hz:.01,bottom:p.y-3,top:p.y+3,projectileShape:'box'});
  assert.equal(naniteUseReason(x.f,'lmb'),null);const full=p.clone().addScaledVector(d,shot.radius);shot.resolveLaunch(x.g);assert.equal(shot.dead,false);assert.ok(Math.abs(shot.radius-1.8)<1e-10);assert.ok(shot.pos.distanceTo(p)<full.distanceTo(p));assert.equal(shot.update(1/60,x.g),false);
 }finally{x.close();}
});
test('final root movement checks current parallax and cannot release a >3-degree misaligned ray',()=>{
 const x=fixture();try{x.charge();const shot=x.release();x.f.pos.x+=8;shot.resolveLaunch(x.g);assert.equal(shot.dead,true);assert.equal(x.events.release,0);assert.ok(x.events.feed.includes('Muzzle obstructed'));}finally{x.close();}
});
for(const busy of ['_carry','hanging','grabbing'])test(`${busy} cannot take forearm ownership or spend charge energy`,()=>{
 const x=fixture();try{x.f[busy]={};x.input(true,true);assert.equal(x.f.slots.lmb.charging,false);assert.equal(x.f.ki,100);assert.equal(x.g.projectiles.list.length,0);x.f[busy]=null;}finally{x.close();}
});
for(const body of ['procedural','superhero-male','superhero-female'])for(const side of ['left','right'])
test(`${body} ${side}: accepted frame and template extremes keep the posed barrel outside real body bounds`,()=>{
 for(const [scale,bulk]of [[.65,.65],[1.5,1.65]])for(const size of [.8,1.2]){const x=fixture({body,side,frame:{scale,bulk},extra:{naniteLength:size,naniteWidth:size,naniteOffset:size===.8?-.15:.15}});try{x.charge();assert.equal(x.f.slots.lmb.charging,true,x.f.slots.lmb._naniteDenied);assert.ok(naniteEnvelopeClear(x.f,x.f.parts.nanites.get('lmb')));const s=x.release();s.resolveLaunch(x.g);assert.equal(s.dead,false);}finally{x.close();}}
});
test('pending cancellation returns its pooled light and each owned material once without touching another caster',()=>{
 const x=fixture(),y=fixture();try{x.charge();const shot=x.release();y.charge();const other=y.release();const counts=new Map();for(const material of shot._ownMats||[])material.addEventListener('dispose',()=>counts.set(material,(counts.get(material)||0)+1));
  let returns=0;const light=shot.light,original=x.g.vfx.returnLight.bind(x.g.vfx);x.g.vfx.returnLight=l=>{if(l===light)returns++;original(l);};cancelHeldSlot(x.f,'lmb');clearSlotFx(x.f);shot.resolveLaunch(x.g);x.g.projectiles.update(1/60,x.g);
  assert.equal(shot.dead,true);assert.equal(other.dead,false);assert.equal(returns,light?1:0);for(const n of counts.values())assert.equal(n,1);assert.equal(x.g.projectiles.list.length,0);
 }finally{x.close();y.close();}
});
test('source replacement before full Fighter.update cannot authorize a pending shot or repair the capability',()=>{
 const x=fixture();try{x.charge();const shot=x.release();x.f.slots.lmb.def={...x.f.slots.lmb.def,naniteWidth:1.2};shot.resolveLaunch(x.g);assert.equal(shot.dead,true);assert.equal(x.events.release,0);x.f.slots.lmb.def={...CANNON};shot.resolveLaunch(x.g);assert.equal(shot.dead,true);}finally{x.close();}
});
test('missing private shield panels preserve ordinary Guard and lowering restores without zero-dt drift',()=>{
 const x=fixture();try{const {f,g,animate}=x;g.melee=new MeleeSystem(g);const type=f.def.guardType,strong=f.def.guardStrong;f._nanites.modules.get('q').cells[0].broken=true;
  g.melee.guard(f,true);for(let i=0;i<30;i++)animate();assert.equal(f.guarding,true);assert.equal(f.def.guardType,type);assert.equal(f.def.guardStrong,strong);
  g.melee.guard(f,false);for(let i=0;i<60;i++)animate();const v=f.parts.nanites.get('q'),m=[...v.root.matrixWorld.elements];for(let i=0;i<20;i++)animate(0);assert.ok(m.every((n,i)=>Math.abs(n-v.root.matrixWorld.elements[i])<1e-7));
 }finally{x.close();}
});
test('forearm aiming does not feed presentation correction into the offensive fist speed',()=>{
 const x=fixture({side:'left'});try{const {f,animate}=x;x.charge();const before=f._handSpd,mat=[...f.parts.nanites.get('lmb').root.matrixWorld.elements];f.aimWorld.x+=15;animate(0);assert.equal(f._handSpd,before);assert.ok(mat.some((n,i)=>Math.abs(n-f.parts.nanites.get('lmb').root.matrixWorld.elements[i])>1e-4));}finally{x.close();}
});
for(const side of ['left','right'])test(`published ORIGIN ${side} cannon reconstructs its genuine native source, pays only after assembly and launches`,()=>{
 const source=POWERS.find(p=>p.id==='nanite-cannon');assert.ok(source);assert.equal(source.cost,28);assert.equal(source.cat,'charge');assert.equal(POWERS.find(p=>p.id==='nanite-shield')?.ab.naniteForm,'shield');
 const picks=freshPicks();picks.name='Cannon gate';picks.slots.lmb=source.id;const raw=buildDef(picks,'cx_nanite_gate');const definition=applyAttackOverrides(raw,setAttackOverride({},raw,'lmb',{naniteAttachment:`${side}-forearm`}));
 assert.equal(definition.abilities.lmb.naniteForm,'cannon');const x=fixture({definition,assembled:false});try{x.input(true,true);assert.equal(x.f.ki,100);assert.equal(x.f.slots.lmb.charging,false);advanceNanites(x.f._nanites,.65,new Set(['lmb']));presentNanites(x.f);x.charge();const shot=x.release();shot.resolveLaunch(x.g);assert.equal(shot.dead,false);assert.equal(castHandMask(x.f,x.f.slots.lmb.def),side==='right'?1:2);}finally{x.close();}
});

// Real grapple physics enters the hanging state; pad input then owns the release.
// Only ki regeneration is disabled so interruption cannot hide an entry refund.
function nativeHang(x){
 const {f,g,dt}=x;g.melee=new MeleeSystem(g);g.fwd=new THREE.Vector3(0,0,1);g.right=new THREE.Vector3(1,0,0);f.sheet.kiRegenMult=0;
 let release=true;g.pad={lx:0,ly:0,rx:0,ry:0,aiming:false,down:()=>false,pressed:()=>false,released:k=>release&&k==='lmb'};
 f._grapple={x:f.pos.x+.1,y:f.pos.y+5.2,z:f.pos.z,top:f.pos.y+7,mantle:false,t:0};f.update(dt,g);assert.ok(f.hanging,'native grapple must reach the ledge');
 return ()=>{Game.prototype.controlPad.call(g,f,dt);f.update(dt,g);release=false;};
}
for(const phase of ['during hang','after dropping'])test(`native ledge interruption retires paid cannon ${phase} without a late shot`,()=>{
 const x=fixture({motion:'hover'});try{x.charge();const {f,g,events}=x,paid=f.ki,step=nativeHang(x);for(let i=0;i<5;i++)step();
  if(phase==='after dropping'){f.releaseHang();for(let i=0;i<5;i++){step();g.projectiles.resolveLaunches(g);}assert.equal(g.projectiles.list.filter(p=>!p.dead).length,0,'released cannon must not fire after leaving the ledge');}
  assert.equal(f.slots.lmb.charging,false,'hanging must not strand cannon preparation');assert.equal(f.slots.lmb.orb,null);assert.equal(f.slots.lmb.gather,null);assert.equal(f.slots.lmb.sfx,null);assert.equal(events.stop,1);assert.equal(events.release,0);assert.equal(f.ki,paid,'interruption neither spends more nor refunds investment');
 }finally{x.close();}
});
test('native ledge gate retains the existing untagged two-hand charge policy',()=>{
 const definition=structuredClone(ROSTER.find(d=>d.id==='sol'));definition.abilities={lmb:{...CANNON,naniteForm:undefined,naniteAttachment:undefined}};
 const x=fixture({definition,motion:'hover'});try{x.charge();const st=x.f.slots.lmb,time=st.chargeT,orb=st.orb,step=nativeHang(x);for(let i=0;i<5;i++)step();
  assert.equal(st.charging,true);assert.equal(st.chargeT,time);assert.equal(st.orb,orb);assert.equal(x.events.stop,0);assert.equal(x.g.projectiles.list.length,0);
 }finally{x.close();}
});

for(const body of ['procedural','superhero-male','superhero-female'])for(const side of ['left','right'])
test(`${body} ${side}: own cannon uses a firm native fist through charge, pending and recovery only`,()=>{
 const x=fixture({body,side});try{const {f,input,animate,g}=x;
  f.slots.rmb={def:{...CANNON,naniteForm:undefined,naniteAttachment:undefined,castHand:side==='right'?'left':'right'},cd:0,charging:false};
  for(let i=0;i<30;i++){input(true,i===0);input(true,i===0,'rmb');animate();}
  const closed=()=>{
   const arm=f.parts.nanites.get('lmb').arm,hand=arm.children[2],other=(arm===f.parts.armL?f.parts.armR:f.parts.armL).children[2];
   assert.equal(hand.morphTargetInfluences[0],0,'source cannon must close its actual native fingers');assert.ok(other.morphTargetInfluences[0]>.1,'independent opposite palm must remain open');
   for(const r of f.parts.skin?.records||[])if(!r.driver&&r.hand===hand){const rotation=r.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(r.curlAxis,r.amount)),expected=new THREE.Matrix4().compose(r.position,rotation,r.scale),actual=f.parts.skin.skeleton.bones[r.i].matrix;assert.ok(expected.elements.every((n,i)=>Math.abs(n-actual.elements[i])<1e-6),'actual source finger matrices must carry the closed shape');}
  };
  closed();for(let i=0;i<20;i++){animate(0);closed();}
  const shot=x.release();closed();assert.equal(shot._launchResolved,false);
  f.applyForm({name:'Fist rebind',frame:{scale:1.1,bulk:1.05}});animate();closed();shot.resolveLaunch(g);assert.equal(shot.dead,false);animate();assert.equal(shot._launchResolved,true);assert.ok(f.slots.lmb._poseUntil>=f.animT);closed();
  cancelHeldSlot(f,'rmb');f.slots.rmb.cd=0;
  // After the bounded cannon recovery expires, an ordinary charge on that same
  // hand must own its existing open-palm shape without any nanite override.
  f.slots.rmb.def.castHand=side;for(let i=0;i<90;i++)animate();
  for(let i=0;i<30;i++){input(true,i===0,'rmb');animate();}
  assert.equal(f.slots.rmb.charging,true);assert.ok(f.parts.nanites.get('lmb').arm.children[2].morphTargetInfluences[0]>.1,'normal hand shape must resume after cannon recovery');
 }finally{x.close();}
});

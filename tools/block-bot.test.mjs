import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {MeleeSystem} from '../src/engine/melee.js';
import {AI} from '../src/engine/ai.js';
import {Game} from '../src/engine/game.js';
import {ROSTER} from '../src/data/characters.js';

function fixture(run) {
 const a=new Fighter(structuredClone(ROSTER[0])),b=new Fighter(structuredClone(ROSTER[1])),noop=()=>{},hits=[];
 const game={entities:[a,b],player:b,time:0,dt:1/60,scene:new THREE.Scene(),_flung:[],
  world:{heightAt:()=>0,ARENA:240,cover:[],interiors:[],shake:noop,punch:noop},
  audio:{swing:noop,hit:noop,zap:noop,meleeHit:noop,grunt:noop,impact:noop,land:noop},
  vfx:{ring:noop,impact:noop,impactStar:noop,flash:noop,flightWake:noop},particles:{spawn:noop,burst:noop},
  hud:null,isHuman:()=>false,isFoe:(x,y)=>x!==y,canSee:()=>true,
  nearestFoe:(f,p,r)=>{const other=f===a?b:a;return f.pos.distanceTo(other.pos)<r?other:null;},
  incomingBeam:()=>null,incomingProjectile:()=>null,trail:noop,heroYell:noop,slowmo:noop,
  projectiles:{list:[]},onHit:(f,n,o,blocked)=>hits.push({f,n,o,blocked})};
 game.melee=new MeleeSystem(game);game.coneFoe=Game.prototype.coneFoe;game.onBlockedStrike=Game.prototype.onBlockedStrike;
 for(const f of [a,b]){f._game=game;f.invuln=0;f.isDummy=true;f.hp=f.maxHp=10000;game.scene.add(f.obj);}
 a.team=1;b.team=2;a.pos.set(0,0,0);b.pos.set(0,0,5);a.faceDir(0,1);b.faceDir(0,-1);a.aim3.set(0,0,1);
 const random=Math.random;Math.random=()=>.1;
 try{run({a,b,game,hits,m:game.melee});}finally{Math.random=random;a.dispose();b.dispose();}
}

for(const openSky of [true,false])test(`holding block at range stays defensive for ${openSky?'air-capable':'grounded'} PowerWorld actors`,()=>fixture(({a,b,game,m,hits})=>{
 a._openSky=openSky;game.modeId='powerworld';a.ki=0;b.pos.z=100;
 for(let i=0;i<60;i++){m.guard(a,true);a.update(1/60,game);}
 assert.equal(a.chargingKi,false);assert.equal(a.guarding,true);
 a.takeDamage(10,{src:b,hitstop:0});assert.equal(hits.at(-1).blocked,true);
 assert.equal(a.hp,a.maxHp);
}));
test('disabled or occupied bodies cannot raise or retain block',()=>{
 for(const state of ['frozenT','stunT','sleepT','downedT','_carry'])fixture(({a,m})=>{
  m.guard(a,true);a[state]=1;m.guard(a,true);assert.equal(a.guarding,false,state);
 });
});
test('a held block survives hitstop but not grabs or a guard crush',()=>fixture(({a,b,m,hits})=>{
 m.guard(a,true);a.hitstop=.1;m.guard(a,true);assert.equal(a.guarding,true);
 a.takeDamage(10,{src:b,strike:true});assert.equal(hits.at(-1).blocked,true);
 a.hitstop=0;a.staggerT=.7;m.guard(a,true);assert.equal(a.guarding,false);
}));
test('bots cannot start point-blank melee before acquisition or without sight',()=>{
 for(const visible of [true,false])fixture(({a,game})=>{
  a.ai=new AI(a,1);a.noPowers=true;game.canSee=()=>visible;
  Game.prototype.controlBot.call(game,a,1/60);
  assert.equal(!!a.mstate,false);assert.equal(!!a.grabState,false);assert.equal(a.meleeCharge,0);
 });
});

for(const [family,distance,expected] of [['tackle',54,true],['tackle',70,false],['pounce',54,true],['bound',66,true],['step',24,false],['pounce',75,false]])
test(`native bot ${family} approach at ${distance} uses the shared strike admission`,()=>fixture(({a,b,game})=>{
 a._openSky=true;a.def.meleeApproach=family;a.noPowers=true;b.pos.z=distance;
 a.ai=new AI(a,1);a.ai.style='rusher';a.ai.intent=()=>({ready:true,target:b,aimAt:{x:0,y:0,z:distance},aimDir:{x:0,z:1},move:{x:0,z:0},slots:{},fly:false});
 Game.prototype.controlBot.call(game,a,1/60);
 assert.equal(!!a.mstate,expected);assert.equal(!!a.grabState,false,'Approach must not extend grab range');
 if(expected){assert.equal(a._meleeMotion.family,family);assert.ok(a._meleeMotion.approachDistance<=distance+12);assert.ok(a._meleeMotion.point.z>=distance&&a._meleeMotion.point.z<=distance+12);assert.equal(a._meleeMotion.point.x,0);}
}));
test('the emitted aim point turns with the bot, including during held attacks',()=>fixture(({a,b,game})=>{
 a.ai=new AI(a,1);b.pos.z=20;for(let i=0;i<60;i++)a.ai.intent(1/60,game);
 b.pos.set(20,0,0);const out=a.ai.intent(1/60,game);
 const bearing=Math.atan2(out.aimAt.x-a.pos.x,out.aimAt.z-a.pos.z);
 assert.ok(Math.abs(bearing)<.2,'shot direction must not snap 90 degrees ahead of its body');
}));
test('a new target needs its own acquisition window',()=>fixture(({a,b,game})=>{
 const ai=a.ai=new AI(a,1);b.pos.z=20;
 for(let i=0;i<60;i++)ai.intent(1/60,game);
 const c=new Fighter(structuredClone(b.def));c.pos.copy(b.pos);c.team=b.team;game.player=c;game.entities.push(c);
 try {const out=ai.intent(1/60,game);assert.equal(out.ready,false);assert.ok(ai._acq>.15);}finally{c.dispose();game.entities.pop();}
}));
test('defensive decisions require one visible threat long enough, not frame-by-frame rerolls',()=>fixture(({a,game})=>{
 const ai=a.ai=new AI(a,1),threat={pos:new THREE.Vector3(0,5,15)},other={pos:threat.pos.clone()};let actions=0;
 for(let i=0;i<10;i++)actions+=ai.observeThreat?.(threat,1/60,game)?1:0;
 assert.equal(actions,0);
 for(let i=0;i<10;i++)actions+=ai.observeThreat?.(other,1/60,game)?1:0;
 assert.equal(actions,0,'a different projectile cannot inherit the last threat age');
 for(let i=0;i<120;i++)actions+=ai.observeThreat?.(other,1/60,game)?1:0;
 assert.equal(actions,1,'one defensive decision for a continuously visible threat');
 game.canSee=()=>false;assert.equal(!!ai.observeThreat?.(threat,1,game),false);
}));
test('defensive reaction timing is independent of frame rate',()=>{
 for(const hz of [30,60,120])fixture(({a,game})=>{
  const ai=new AI(a,1),threat={pos:new THREE.Vector3(0,5,15)};let first=null;
  for(let i=1;i<=hz;i++)if(ai.observeThreat?.(threat,1/hz,game)&&first===null)first=i/hz;
  assert.ok(first>=.3&&first<=.42,`${hz} Hz: ${first}`);
 });
});

test('a nearby visible beam earns defense even when its caster is beyond sight range',()=>fixture(({a,game})=>{
 const ai=new AI(a,1),beam={muzzle:new THREE.Vector3(0,5.2,200),sustaining:true,pn:2,
  path:new Float32Array([0,5.2,200,0,5.2,15])};
 let responses=0;for(let i=0;i<60;i++)responses+=ai.observeThreat(beam,1/60,game)?1:0;
 assert.equal(responses,1,'Observe nearby light, not the distant invisible caster');
 game.canSee=()=>false;assert.equal(ai.observeThreat(beam,1,game),false);
 assert.equal(ai._threat,null,'Occluded energy does not retain earned sight');
}));
test('blocking has a bent-elbow superhero silhouette instead of straight raised arms',()=>fixture(({a,game,m})=>{
 a._openSky=true;m.guard(a,true);for(let i=0;i<45;i++)a.update(1/60,game);
 for(const arm of [a.parts.armL,a.parts.armR])assert.ok(-arm.children[1].rotation.x>.65,'forearm folds in front of the head/chest');
 assert.ok(a.parts.body.rotation.x>.04,'torso braces into the attack');
}));
test('a bot retains its chosen guard against a continuing visible beam',()=>fixture(({a,b,game})=>{
 a.ai=new AI(a,1);a.noPowers=true;a._counterCd=20;b.pos.z=40;
 const beam={muzzle:new THREE.Vector3(0,5,40)};game.incomingBeam=()=>beam;
 for(let i=0;i<180;i++){Game.prototype.controlBot.call(game,a,1/60);if(i>40)assert.equal(a.guarding,true,`frame ${i}`);}
 game.canSee=()=>false;for(let i=0;i<90;i++)Game.prototype.controlBot.call(game,a,1/60);
 assert.equal(a.guarding,false,'occluded or departed threats do not maintain guard forever');
}));

test('a vertical traveled beam earns an actual bot guard only after its reflex window',()=>fixture(({a,b,game})=>{
 a.ai=new AI(a,1);a.noPowers=true;a._counterCd=20;b.pos.set(0,50,0);
 const beam={team:2,caster:b,muzzle:new THREE.Vector3(0,55.2,0),dir:new THREE.Vector3(0,-1,0),
  sustaining:true,radius:1,maxLen:100,tipSpeed:100,pn:2,
  path:new Float32Array([0,55.2,0,0,25.2,0]),pvel:new Float32Array([0,-100,0,0,-100,0])};
 game.projectiles.list.push(beam);game.incomingBeam=Game.prototype.incomingBeam;
 for(let i=0;i<8;i++){Game.prototype.controlBot.call(game,a,1/60);assert.equal(a.guarding,false);}
 for(let i=0;i<40;i++)Game.prototype.controlBot.call(game,a,1/60);
 assert.equal(a.guarding,true);
}));
test('visible incoming shots are observed before entering point-blank range',()=>{
 for(const speed of [70,100,150])fixture(({a,b,game})=>{
  a.ai=new AI(a,1);a.noPowers=true;a.evadeCd=99;b.pos.z=100;
  const shot={pos:new THREE.Vector3(0,5,100),vel:new THREE.Vector3(0,0,-speed),team:2};
  game.projectiles.list.push(shot);game.incomingProjectile=Game.prototype.incomingProjectile;
  let blocked=false;
  for(let i=0;i<120&&shot.pos.z>2;i++){Game.prototype.controlBot.call(game,a,1/60);blocked ||= a.guarding;shot.pos.addScaledVector(shot.vel,1/60);}
  assert.ok(blocked,`${speed}u/s shot must allow an earned defensive response`);
 });
});
test('shots passing above the bot are not incoming threats',()=>fixture(({a,game})=>{
 game.projectiles.list.push({pos:new THREE.Vector3(0,50,20),vel:new THREE.Vector3(0,0,-100),team:2});
 assert.equal(Game.prototype.incomingProjectile.call(game,a,130),null);
}));
test('barrier guard presents an open palm without opening an occupied weapon grip',()=>fixture(({a,game,m})=>{
 a._openSky=true;a.def.guardType='barrier';m.guard(a,true);
 for(let i=0;i<45;i++)a.update(1/60,game);
 const hand=a.parts.armL.children[2];assert.ok(hand.morphTargetInfluences[0]>.8);
 hand.userData.gripOccupied=true;for(let i=0;i<45;i++)a.update(1/60,game);
 assert.ok(hand.morphTargetInfluences[0]<.01);
}));
test('fist guard tucks the elbows below the shoulders instead of flaring horizontally',()=>fixture(({a,game,m})=>{
 a._openSky=true;m.guard(a,true);for(let i=0;i<45;i++)a.update(1/60,game);
 for(const arm of [a.parts.armL,a.parts.armR]){
  const elbow=new THREE.Vector3(0,-arm.userData.upperLength,0).applyQuaternion(arm.quaternion);
  assert.ok(elbow.y<-.8,`elbow drop ${elbow.y}`);
 }
}));
test('guard transitions preserve fixed limbs, clear the face and recover at 30/60/120 Hz',()=>{
 for(const hz of [30,60,120])for(const type of ['block','deflect','barrier'])fixture(({a,game,m})=>{
  a._openSky=true;a.def.guardType=type;a.flying=true;a.pos.y=80;a.gait='airborne';
  for(let i=0;i<hz;i++)a.update(1/hz,game);
  for(let i=0;i<hz*3;i++){
   const time=i/hz;m.guard(a,time>=.2&&time<1.5);if(i===hz)a._blocked=.16;
   a.update(1/hz,game);a.obj.updateMatrixWorld(true);
   for(const arm of [a.parts.armL,a.parts.armR]){
    const hand=arm.children[2],u=arm.userData.upperLength,v=arm.userData.foreLength;
    assert.ok(Math.abs(hand.position.distanceTo(new THREE.Vector3(0,-u,0))-v)<.001,'forearm length');
    assert.ok(arm.quaternion.toArray().every(Number.isFinite));
    if(time>.5&&time<1.4)assert.ok(hand.getWorldPosition(new THREE.Vector3()).distanceTo(a.parts.head.getWorldPosition(new THREE.Vector3()))>1,'hand stays outside the face');
   }
  }
  assert.ok(a.poseGuard<.001,'release recovers from guard');
  assert.ok(a.parts.armL.children[2].morphTargetInfluences[0]<.01,'barrier hand recloses');
 });
});
test('lethal chip through a block enters KO and credits its actual attacker',()=>fixture(({a,b,m})=>{
 a.hp=.1;m.guard(a,true);a.takeDamage(10,{src:b,strike:true});
 assert.equal(a.alive,false,'holding block cannot leave a living fighter at zero HP');
 assert.equal(a.lastHitBy,b);assert.ok(a.ragdoll,'the blocked KO uses the real ragdoll lifecycle');
}));
test('default human lethal damage enters KO without a forced rally lock',()=>{
 for(const blocked of [false,true])fixture(({a,b,m,game})=>{
  a.isDummy=false;game.isHuman=f=>f===a;a.hp=.1;
  if(blocked)m.guard(a,true);
  a.takeDamage(10,{src:b,strike:true});
  assert.equal(a.alive,false);assert.equal(a.downedT,0);
  assert.equal(a._secondWindUsed,false);assert.equal(a.lastHitBy,b);
  assert.ok(a.ragdoll,'normal KO still presents its ragdoll');
 });
});
test('explicit Second Wind trait preserves the human-only rally',()=>fixture(({a,b,m,game})=>{
 a.def.secondWind=true;a.isDummy=false;game.isHuman=f=>f===a;a.hp=.1;m.guard(a,true);
 a.takeDamage(10,{src:b,strike:true});
 assert.ok(a.downedT>0);assert.equal(a.hp,1);assert.equal(a.guarding,false);assert.equal(a.alive,true);
 assert.equal(a.lastHitBy,b);assert.equal(a._secondWindUsed,true);
}));
test('mutual lethal ripostes resolve each KO exactly once',()=>fixture(({a,b,m})=>{
 const counts=[0,0];for(const [i,f] of [a,b].entries()){
  f.hp=.1;f._riposte={dmg:10,used:false};m.guard(f,true);
  const ko=f._ko.bind(f);f._ko=(...args)=>{counts[i]++;return ko(...args);};
 }
 a.takeDamage(10,{src:b,strike:true});
 assert.deepEqual(counts,[1,1]);assert.equal(a.alive,false);assert.equal(b.alive,false);
}));

test('bot approach consumes the authored profile field through native control',()=>fixture(({a,b,game})=>{
 a._openSky=true;a.def.combat={groundApproach:'tackle'};a.noPowers=true;b.pos.z=54;
 a.ai=new AI(a,1);a.ai.style='rusher';a.ai.intent=()=>({ready:true,target:b,aimAt:{x:0,y:0,z:54},aimDir:{x:0,z:1},move:{x:0,z:0},slots:{},fly:false});
 Game.prototype.controlBot.call(game,a,1/60);
 assert.equal(a._meleeMotion?.family,'tackle');assert.equal(a.mstate,'startup');assert.equal(!!a.grabState,false);
}));

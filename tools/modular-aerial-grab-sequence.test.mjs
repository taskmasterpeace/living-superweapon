import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';import {loadModularCharacter} from '../src/engine/modular-character.js';
// Uses the production simulation and modular renderer; only audio/altitude-label output is stubbed.
// Verifies procedural prone recovery and control return after a nonlethal thrown impact.
globalThis.ProgressEvent??=class{};
for(const hz of [30,60,120])test(`native modular aerial grab-to-impact sequence ${hz}Hz`,async()=>{
 const x=mainCombatFixture({hero:'sol',mode:'powerworld'}),{p,g}=x,dt=1/hz;
 try{
  g.ms.chaseCam=true;p._openSky=true;p.invuln=0;g.vfx._itex=new T.Texture();g.audio={...g.audio,yell:()=>{}};
  const v=x.foe({z:12,y:8});v._openSky=true;v.invuln=0;v.faceDir(0,1);v.toggleFlight();
  const bytes=await fs.readFile('public/models/modular-hero/modular-hero.glb');const load=()=>new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  for(const f of [p,v]){f._altTag=()=>{};f.def={...f.def,model:{...f.def.model,body:'faceted-v1'}};await loadModularCharacter(f,{load});}
  const step=()=>{g.time+=dt;p.update(dt,g);v.update(dt,g);};
  p.toggleFlight();p.flyHeld=true;
  for(let i=0;i<hz*3&&p.pos.distanceTo(v.pos)>4;i++){const d=v.pos.clone().sub(p.pos).normalize();p.move(d,dt);step();}
  assert.ok(p.pos.y>2,'native takeoff did not rise');
  p.move({x:0,y:0,z:0},dt);p.faceDir(0,1);p.aim3.copy(v.pos).sub(p.pos).normalize();
  g.melee.grab(p);for(let i=0;i<Math.ceil(.2*hz);i++)step();
  assert.equal(p.grabbing,v,'aerial approach did not connect');assert.equal(p.grabMode,'back');assert.ok(g.melee.liftPerson(p));
  const before=p.pos.clone();for(let i=0;i<hz*.2;i++){p.move({x:0,y:.3,z:1},dt);step();}assert.ok(p.pos.distanceTo(before)>.5,'carry movement stayed rooted');
  p.aim3.set(0,-1,0);g.melee.grab(p);g.melee.releaseGrab(p);assert.equal(v.grabbedBy,p);for(let i=0;i<Math.ceil(.2*hz)+1&&p._personThrowWindup;i++)step();assert.equal(v.grabbedBy,null);assert.ok(v.vel.y<0);
  const hp=v.hp;let impact=false,landing=false,airReaction=false,proneRecovery=false,rising=false;const original=g.onSlam;g.onSlam=function(...args){if(args[0]===v)impact=true;return original.apply(this,args);};
  for(let i=0;i<hz*4;i++){step();landing||=v._landT>0;airReaction||=v._lostControlPose?.weight>0;if(v._impactRecovery){assert.equal(g.melee.canAct(v),false,JSON.stringify({s:v._impactRecovery,stagger:v.staggerT,cc:v.sheet.ccRecover,hit:v.hitstop,stun:v.stunT,sleep:v.sleepT,frozen:v.frozenT}));assert.equal(v.downedT,0);proneRecovery||=v._pronePose?.weight>.9;rising||=v._pronePose?.weight>.1&&v._pronePose?.weight<.7;}}
  assert.ok(impact&&v.hp<hp,'terrain impact did not damage thrown actor');assert.ok(landing,'no landing recovery presentation');assert.ok(v.alive,'fixture unexpectedly defeated target');assert.ok(g.melee.canAct(v),'control never returned');assert.equal(v.lastHitBy,p,'impact lost attacker attribution');assert.ok(airReaction,'no airborne reaction presented');assert.ok(proneRecovery&&rising,'missing prone-to-standing recovery');assert.equal(v._impactRecovery,null);
  const recovered=v.pos.clone();for(let i=0;i<hz*.2;i++){v.move({x:1,y:0,z:0},dt);step();}assert.ok(v.pos.distanceTo(recovered)>.2,'recovered fighter cannot move');
 }finally{x.close();}
});





import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {AerialGrabDemo} from '../src/engine/aerial-grab-demo.js';

for(const hz of [30,60,120])test(`repeatable demo executes native capture, carry, damage and recovery at ${hz}Hz`,()=>{
 const x=mainCombatFixture({hero:'sol',mode:'powerworld'}),{g,p}=x,dt=1/hz;
 try{
  g.ms={chaseCam:true,threatLab:{state:'preparing'}};g.vfx._itex=new T.Texture();g.audio={...g.audio,yell:()=>{}};
  p._openSky=true;p.invuln=0;p._altTag=()=>{};
  const v=x.foe({z:12,y:8});v._openSky=true;v.invuln=0;v._altTag=()=>{};v.faceDir(0,1);v.toggleFlight();
  const trial={g,target:v,recording:{mark(){}}};const demo=new AerialGrabDemo(trial);demo.start();
  const beforeCamera=p.pos.clone();demo.frameCamera();assert.deepEqual(p.pos.toArray(),beforeCamera.toArray(),'review camera cannot move gameplay actor');
  for(let i=0;i<hz*13&&demo.active;i++){g.time+=dt;demo.update(dt);demo.controlTarget(v,dt);g.beginBodyContactFrame();p.update(dt,g);v.update(dt,g);g.resolveBodies();}
  assert.equal(demo.phase,'complete',JSON.stringify(demo.summary()));assert.ok(demo.damage>0);assert.ok(g.melee.canAct(v));assert.equal(v.lastHitBy,p);
  assert.ok(demo.events.some(e=>e.label==='Rear hold / moving carry'));assert.ok(demo.events.some(e=>e.label==='Aimed downward release'));
  const anticipation=demo.events.find(e=>e.label==='Attached throw anticipation'),release=demo.events.find(e=>e.label==='Aimed downward release');
  assert.ok(anticipation&&release.time-anticipation.time>=.2-dt,'release evidence must follow the attached windup');
  assert.equal(demo.summary().outcome,'complete');assert.equal(demo.frameCamera(),false,'camera must relinquish control when demonstration ends');
 }finally{x.close();}
});

import fs from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {loadModularCharacter} from '../src/engine/modular-character.js';
import {AerialStunDemo} from '../src/engine/aerial-grab-demo.js';
globalThis.ProgressEvent??=class{};
for(const hz of [30,60,120])test(`modular airborne stun demo uses gravity and restores control ${hz}Hz`,async()=>{
 const x=mainCombatFixture({hero:'sol',mode:'powerworld'}),{g,p}=x,dt=1/hz;
 try{
  g.ms={chaseCam:true,threatLab:{state:'preparing'}};g.vfx._itex=new T.Texture();g.audio={...g.audio,yell:()=>{}};
  p._openSky=true;p.invuln=0;p._altTag=()=>{};
  const v=x.foe({z:12,y:18});v._openSky=true;v.invuln=0;v._altTag=()=>{};v.toggleFlight();
  const b=await fs.readFile('public/models/modular-hero/modular-hero.glb');
  for(const f of [p,v]){f.def={...f.def,model:{...f.def.model,body:'faceted-v1'}};await loadModularCharacter(f,{load:()=>new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')});}
  const demo=new AerialStunDemo({g,target:v,recording:{mark(){}}});demo.start();let downward=false,proneLock=false,rising=false;
  for(let i=0;i<hz*13&&demo.active;i++){g.time+=dt;demo.update(dt);demo.controlTarget(v,dt);p.update(dt,g);v.update(dt,g);downward||=v.stunT>0&&v.vel.y<0;if(v._impactRecovery){proneLock||=v.stunT>0&&v._impactRecovery.elapsed===0&&v._pronePose?.weight>.9;rising||=v._impactRecovery.elapsed>.4;assert.equal(g.melee.canAct(v),false);}}
  assert.ok(proneLock,'stunned arrival never held prone');assert.ok(rising,'stunned arrival never played get-up');assert.equal(demo.outcome,'complete',JSON.stringify(demo.summary()));assert.ok(demo.flightReleased&&demo.limpObserved&&downward);assert.ok(v.alive&&g.melee.canAct(v));assert.ok(v.pos.y<=.1);assert.equal(v._modularCharacter.actor.visible,true);
 }finally{x.close();}
});

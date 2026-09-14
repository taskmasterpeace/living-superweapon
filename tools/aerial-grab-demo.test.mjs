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
  assert.equal(demo.summary().outcome,'complete');assert.equal(demo.frameCamera(),false,'camera must relinquish control when demonstration ends');
 }finally{x.close();}
});

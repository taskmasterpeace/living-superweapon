import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {fistContact} from '../src/engine/melee-pose.js';
import {MeleeSystem} from '../src/engine/melee.js';

test('a moving rendered torso cannot tunnel through a committed fist at legal flight speed',()=>{
 const f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='kano')));
 try{
  f.pos.set(-3.5,0,5);f.obj.updateMatrixWorld(true);const previous=f.parts.torso.matrixWorld.clone();
  f.pos.x=3.5;f.obj.updateMatrixWorld(true);
  const from=new THREE.Vector3(0,6.45,4.5),to=new THREE.Vector3(0,6.45,5),point=new THREE.Vector3();
  assert.equal(fistContact(from,to,f.parts.torso,.42,point),Infinity,'fixture must miss the endpoint-only body');
  const t=fistContact(from,to,f.parts.torso,.42,point,previous);
  assert.ok(t>=0&&t<=1,`moving torso crossed the fist but returned ${t}`);
  assert.ok(point.distanceTo(from.clone().lerp(to,t))<1e-7,'impact remains on the real fist path');
  from.y=to.y=30;assert.equal(fistContact(from,to,f.parts.torso,.42,point,previous),Infinity,'motion must not turn an altitude miss into a hit');
 }finally{f.dispose();}
});

test('production contact frames wait for both final poses and discard old teleport history',()=>{
 const a=new Fighter(structuredClone(ROSTER[0])),b=new Fighter(structuredClone(ROSTER[1]));
 const m=new MeleeSystem({entities:[a,b],isFoe:(x,y)=>x!==y});
 try{
  a._meleeMotion={side:1};b.pos.x=-3.5;
  m.beginContactFrame();m.resolveContact(a);b.pos.x=3.5;
  let captured=null;m._resolveContact=(f,frame)=>{captured=frame;assert.equal(f,a);assert.equal(b.pos.x,3.5);};
  assert.equal(captured,null,'must not resolve before the other fighter finishes');
  m.endContactFrame();assert.equal(captured.targets.get(b).position.x,-3.5);
  b.pos.x=70;m.beginContactFrame();m.resolveContact(a);
  m._resolveContact=(f,frame)=>{assert.equal(frame.targets.get(b).position.x,70,'a teleport before this physics frame is not swept across the arena');};
  m.endContactFrame();assert.equal(m._contactFrame,null);
 }finally{a.dispose();b.dispose();}
});

test('the production resolver catches moving victims in either entity order, but not blinks or interruptions',()=>{
 for(const reverse of [false,true])for(const mode of ['travel','blink','interrupt','form']){
  const a=new Fighter(structuredClone(ROSTER[0])),b=new Fighter(structuredClone(ROSTER[1]));
  const game={entities:reverse?[b,a]:[a,b],isFoe:(x,y)=>x!==y},m=new MeleeSystem(game),hits=[];
  try{
   for(const f of [a,b]){f._openSky=true;f.invuln=0;f.flying=true;f.gait='airborne';f.pos.y=80;f._animate(1);}
   const fist=a.parts.armR.children[2].getWorldPosition(new THREE.Vector3()),center=b.parts.torso.getWorldPosition(new THREE.Vector3());
   b.pos.add(fist.clone().sub(center));b.pos.x-=3.5;
   a.mId='jab';a.mKind='light';a.mstate='active';a.mT=.001;a.strikeHit=new Set();
   a._meleeMotion={side:1,previous:fist.clone(),current:new THREE.Vector3(),impact:new THREE.Vector3(),dt:1/30};
   m._resolveLight=(f,v)=>{hits.push(v);f.strikeHit.add(v);};
   if(mode==='blink')b.pos.x+=7;
   m.beginContactFrame();
   if(mode!=='blink')b.pos.x+=7;
   if(mode==='interrupt')a.stunT=.5;
   if(mode==='form')a.applyForm({frame:{scale:1.2}});
   for(const f of game.entities)m.resolveContact(f);m.endContactFrame();
   assert.equal(hits.length,mode==='travel'?1:0,`${mode}, reversed=${reverse}`);
   assert.equal(a.mstate,mode==='interrupt'?null:'recover','interrupts cancel; other last active segments resolve before recovery');
   if(mode==='interrupt'){assert.equal(a._meleeMotion,null);assert.equal(a.strikeActive,0);}
  }finally{a.dispose();b.dispose();}
 }
});

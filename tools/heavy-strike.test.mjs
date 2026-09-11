import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import * as ingest from './lib/quaternius-source.mjs';
import {Fighter} from '../src/engine/entity.js';
import {MeleeSystem} from '../src/engine/melee.js';
import {ROSTER} from '../src/data/characters.js';
import {STRIKES} from '../src/data/martial.js';
import {profileFromDef,validateProfile,applyProfile} from '../src/tool/studio-profile.js';

function fighter(id='sol',body='procedural'){
 const def=structuredClone(ROSTER.find(d=>d.id===id));def.model={...def.model,body};
 const f=new Fighter(def);f._openSky=true;f.flying=false;f.gait='grounded';f.animT=0;
 f.mId='power';f.mstate='startup';f.mT=.17;f.poseStrike=1;f._meleeMotion={side:1,point:new THREE.Vector3(0,7,5)};
 return f;
}

test('heavy ingestion samples the actual hook and recovery, without substituting the old cross',async()=>{
 assert.equal(typeof ingest.loadHeavySource,'function','the licensed UAL2 file must be loaded');
 const source=await ingest.loadHeavySource(),bank=ingest.bakeHeavyStrikes(source),clip=bank.clips.power;
 assert.deepEqual(clip.segments.map(s=>s.take),['Melee_Hook','Melee_Hook_Rec']);
 assert.ok(Math.abs(clip.duration-64/60)<1e-6);assert.equal(clip.frames.length,65);
 assert.equal(bank.source.license,'CC0-1.0');assert.equal(bank.source.file,'UAL2_Standard.glb');
 assert.equal(bank.source.sha256.glb,'8cee20ab1bc55130092447e810e26df22dd2803eccc54f52137a7d54d7ab88a8','source replacement requires a new visual/provenance review');
 assert.equal(await readFile(new URL('../src/data/heavy-strike-bank.json',import.meta.url),'utf8'),JSON.stringify(bank),'runtime must ship the reproducible output of the reviewed source');
 for(const frame of clip.frames){assert.equal(frame.length,45);assert.ok(frame.every(Number.isFinite));}
 // Independent source end pose must survive concatenation; no loop-closing blend.
 const end=ingest.sampleSource(source,'Melee_Hook_Rec',.6).points;
 assert.ok(new THREE.Vector3().fromArray(clip.frames.at(-1),3).distanceTo(end.handL.clone().sub(end.elbowL).normalize())<2e-6);
 const contact=ingest.sampleSource(source,'Melee_Hook',clip.contactStart).points;
 assert.ok(contact.handL.z>1&&contact.handR.z<.4,'the chosen contact landmark must be the actual striking hand');
});

test('bare-handed power uses the hook while occupied grips retain their weapon-compatible motion',()=>{
 for(const id of ['sol','sarge','stormcall']){
  const f=fighter(id);try{
   for(let i=0;i<30;i++)f._animate(1/60);
   if(id==='sol')assert.match(f._authoredStrike?.take??'',/Melee_Hook/);
   else assert.equal(f._authoredStrike?.applied??false,false,'a bare-knuckle hook must not carry a sword or axe through the trunk');
  }finally{f.dispose();}
 }
});

test('heavy preference is independent from light punches and survives validated custom profiles',()=>{
 const profile=profileFromDef(ROSTER.find(d=>d.id==='sol'));profile.model.heavyStrikes='procedural';profile.model.strikes='authored';
 const def=applyProfile(ROSTER.find(d=>d.id==='sol'),validateProfile(JSON.parse(JSON.stringify(profile))));
 assert.equal(def.model.heavyStrikes,'procedural');assert.equal(def.model.strikes,'authored');
 profile.model.heavyStrikes='untrusted';assert.throws(()=>validateProfile(profile),/heavy/i);
 const f=fighter();try{
  f.def.model.heavyStrikes='procedural';for(let i=0;i<30;i++)f._animate(1/60);assert.equal(f._authoredStrike?.applied??false,false);
  f.def.model.heavyStrikes='authored';f.def.model.strikes='procedural';for(let i=0;i<30;i++)f._animate(1/60);assert.match(f._authoredStrike?.take??'',/Melee_Hook/);
 }finally{f.dispose();}
});

test('heavy source keeps root authority, fixed arm lengths and planted feet through startup, contact and recovery',()=>{
 for(const body of ['procedural','superhero-male','superhero-female'])for(const side of [-1,1]){
  const f=fighter('sol',body);f._meleeMotion.side=side;const root=f.pos.clone();let previous=null;
  try{for(const state of ['startup','active','recover'])for(let i=0;i<=60;i++){
   f.mstate=state;f.mT=STRIKES.power[state]*(1-i/60)/(f.def.meleePace||1);f._animate(1/120);f.obj.updateMatrixWorld(true);
   assert.ok(f.pos.equals(root));assert.ok(f.parts.g.scale.equals(new THREE.Vector3(1,1,1)));assert.equal(f.parts.g.rotation.order,'YXZ');
   for(const arm of [f.parts.armL,f.parts.armR])assert.ok(Math.abs(arm.children[2].position.distanceTo(new THREE.Vector3(0,-arm.userData.upperLength,0))-arm.userData.foreLength)<1e-5);
   if(state==='active'){
    assert.ok(Math.min(...[f.parts.legL,f.parts.legR].map(l=>new THREE.Box3().setFromObject(l.userData.boot).min.y))>=-.025,'hook contact must not sink its support feet');
    if(i%15===0&&f.parts.skin){
     let low=Infinity;const v=new THREE.Vector3();
     for(const mesh of f.parts.skin.meshes.filter(m=>m.name==='hero-skin-body'))for(let j=0;j<mesh.geometry.attributes.position.count;j++){
      mesh.getVertexPosition(j,v).applyMatrix4(mesh.matrixWorld);low=Math.min(low,v.y);
     }
     assert.ok(low>=-.025,`the actual ${body} surface penetrates the stage at ${low}, despite supported driver boots`);
    }
   }
   const parts=[f.parts.body,f.parts.pelvis,f.parts.armL,f.parts.armR,f.parts.legL,f.parts.legR];
   if(previous)for(let j=0;j<parts.length;j++)assert.ok(previous[j].angleTo(parts[j].quaternion)<.6,`hook pole/reset discontinuity ${body} ${side} ${state} ${i} part ${j}`);
   previous=parts.map(p=>p.quaternion.clone());
  }}finally{f.dispose();}
 }
});

test('aerial heavy motion keeps flight legs and converges to the same source phase at 30/60/120 Hz',()=>{
 const samples=[];
 for(const hz of [30,60,120]){
  const f=fighter(),base=fighter();base.def.model.heavyStrikes='procedural';
  try{
   for(const a of [f,base]){a.flying=true;a.gait='airborne';a._flyPose=1;a.pos.y=80;a.mstate='active';a.mT=.045;}
   for(let i=0;i<hz;i++){f._animate(1/hz);base._animate(1/hz);}
   for(const key of ['legL','legR'])assert.ok(f.parts[key].quaternion.angleTo(base.parts[key].quaternion)<.002,'aerial heavy must retain the hero flight leg channels');
   samples.push(f.parts.armR.quaternion.clone());
  }finally{f.dispose();base.dispose();}
 }
 for(const q of samples)assert.ok(q.angleTo(samples[0])<.002,'frame rate must not pick a different heavy source pose');
});

test('real Fighter and melee updates freeze the active heavy clock during hitstop, then resume it',()=>{
 for(const hz of [30,60,120]){
  const f=fighter(),noop=()=>{};
  const game={time:0,entities:[f],isFoe:()=>false,coneFoe:()=>null,isHuman:()=>false,
   world:{ARENA:240,cover:[],interiors:[],heightAt:()=>0,shake:noop,punch:noop},
   audio:{swing:noop,land:noop},vfx:{flightWake:noop,ring:noop},particles:{spawn:noop,burst:noop},
   trail:noop,heroYell:noop,slowmo:noop,afterimage:noop};
  game.melee=new MeleeSystem(game);f._game=game;f.isDummy=true;f.flying=true;f.gait='airborne';f.pos.y=80;f.mstate=null;f._meleeMotion=null;
  try{
   game.melee._beginHeavy(f,'power',1,true);
   const update=()=>{game.time+=1/hz;game.melee.beginContactFrame();f.update(1/hz,game);game.melee.endContactFrame();};
   for(let i=0;i<hz&&f.mstate!=='active';i++)update();assert.equal(f.mstate,'active');
   const clock=f.mT;f.hitstop=.25;
   // Resolve renders before the active timer consumes its frame. The first
   // frozen render presents that resulting clock; subsequent frozen updates
   // must not consume time, contact again or drift through the source take.
   update();const sourceTime=f._authoredStrike.time;
   for(let i=0;i<Math.floor(hz*.1);i++){
    update();assert.equal(f.mT,clock);assert.equal(f._authoredStrike.time,sourceTime);assert.equal(f.mstate,'active');
   }
   for(let i=0;i<hz&&f.hitstop>0;i++)update();update();
   assert.ok(f.mstate!=='active'||f.mT<clock,'unfrozen production time must resume');
  }finally{f.dispose();}
 }
});

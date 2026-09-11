import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Weather} from '../src/engine/systems.js';
import {runSlot,clearSlotFx} from '../src/engine/abilities.js';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {prepareWindBody} from '../src/engine/weather-body.js';
import {SoundLibrary} from '../src/core/sound-library.js';

function fixture(state='rain'){
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();camera.position.set(0,35,0);
 const voices=[],lights=[],world={scene,camera,heightAt:()=>0,cover:[],interiors:[]};
 const owner=(x=0)=>({pos:new THREE.Vector3(x,0,0),aim:new THREE.Vector3(0,0,1),alive:true,ki:100,powerBuff:1,def:{},_formKey:'base',spendKi(n){if(this.ki<n)return false;this.ki-=n;return true;}});
 const src=owner(),game={world,scene,player:src,entities:[],audio:{soundLibrary:{play(id,opts){const v={id,opts,stopped:false,set(gain){this.gain=gain;},stop(){this.stopped=true;}};voices.push(v);return v;}}},vfx:{borrowLight(){const l=new THREE.PointLight();l.userData.vfxLease=1;lights.push(l);return l;},returnLight(l){l.intensity=0;}},isFoe:(s,f)=>s!==f&&f.alive,onDrained(){game.drained=(game.drained||0)+1;}};
 const weather=new Weather(game);game.weather=weather;weather.set(state,{instant:true});
 const step=(seconds)=>{for(let t=0;t<seconds-1e-7;t+=1/60)weather.update(Math.min(1/60,seconds-t));};
 return {game,world,weather,src,owner,voices,lights,step};
}

test('owner command and expiry preserve live ambient rain, target, direction and audio lease',()=>{
 const x=fixture();try{
  x.step(.02);const target=x.weather._target,rain=x.weather._rainField,voice=x.weather._rainVoice;
  x.weather.command({src:x.src,rain:1,wind:1,cloud:1,storm:1,dur:2,radius:40});
  assert.equal(x.weather.stateId,'rain');assert.equal(x.weather._target,target);assert.equal(x.weather.windDir,0);
  x.step(4);assert.equal(x.weather.layers.size,0);assert.equal(x.weather.stateId,'rain');
  assert.equal(x.weather._rainField,rain);assert.equal(x.weather._rainVoice,voice);assert.equal(voice.stopped,false);assert.equal(x.weather.rain,.8);
 }finally{x.weather.reset();}
});

test('ambient vortex, lightning and delayed thunder survive owner entry and cancellation',()=>{
 const x=fixture('tornado');try{
  x.step(.02);const vortex=x.weather._vortex,bolt=x.weather._lightning,thunder=x.weather._thunder;
  x.weather.command({src:x.src,storm:1,cloud:1,dur:10});x.weather.cancelCommand(x.src);
  assert.equal(x.weather._vortex,vortex);assert.equal(x.weather._lightning,bolt);assert.equal(bolt.active,true);assert.equal(x.weather._thunder,thunder);
  x.step(3);assert.equal(x.voices.filter(v=>v.id==='weather-thunder').length,1);assert.equal(vortex.group.parent,x.game.scene);
 }finally{x.weather.reset();}
});

test('two owners expire independently while an ambient edit evolves underneath',()=>{
 const x=fixture('storm');try{
  const a=x.weather.command({src:x.src,dur:2,rain:1,cloud:1}),other=x.owner(300),b=x.weather.command({src:other,dur:9,rain:1,cloud:1});
  x.step(1);x.weather.set('drizzle');x.step(3);
  assert.equal(x.weather.layers.has(x.src),false);assert.equal(x.weather.layers.get(other),b);assert.equal(a.disposed,true);
  assert.equal(x.weather.stateId,'drizzle');const evolving=x.weather.rain;assert.ok(evolving<1&&evolving>.35);
  x.weather.cancelCommand(other);assert.equal(x.weather.stateId,'drizzle');assert.equal(x.weather.rain,evolving);
 }finally{x.weather.reset();}
});

test('storm center is snapshotted, range bounded, rain and wind remain within its radius',()=>{
 const x=fixture('clear');try{
  const layer=x.weather.command({src:x.src,center:new THREE.Vector3(1000,0,0),range:60,radius:35,wind:1,rain:1,cloud:1});
  assert.equal(layer.center.x,60);x.src.pos.x=900;x.game.player.pos.z=700;x.step(2);
  assert.equal(layer.center.x,60);assert.equal(layer.center.z,0);
  const baseline=x.weather.windSpeed,inside=x.weather.sampleBodyWind(layer.center,{}),outside=x.weather.sampleBodyWind({x:500,y:0,z:0},{});
  assert.ok(Math.hypot(inside.x,inside.z)>baseline+10);assert.equal(Math.hypot(outside.x,outside.z),baseline);
  const points=layer.rainField.mesh.geometry.attributes.position;
  for(let i=0;i<points.count;i++)assert.ok(Math.hypot(points.getX(i)-60,points.getZ(i))<=35.001);
  assert.deepEqual(x.weather.force('energy',{},layer.center),{x:0,y:0,z:0});
  const matter=x.weather.force('ballistic',{},layer.center),distant=x.weather.force('ballistic',{},new THREE.Vector3(500,0,0));
  assert.ok(Math.hypot(matter.x,matter.z)>Math.hypot(distant.x,distant.z));
 }finally{x.weather.reset();}
});

test('layer wind follows authored cardinal aim without introducing an unrelated sideways force',()=>{
 const x=fixture('none');try{
  const layer=x.weather.command({src:x.src,wind:1,cloud:1});x.step(1.2);
  const wind=x.weather.sampleBodyWind(layer.center,{});assert.ok(Math.abs(wind.x)<1e-8);assert.ok(wind.z>40);
 }finally{x.weather.reset();}
});

test('a long frame cannot consume a newly created lightning warning',()=>{
 const x=fixture('clear');try{
  const layer=x.weather.command({src:x.src,cloud:1,storm:1});x.weather.update(2);
  assert.ok(layer.lightning.active);assert.ok(layer.lightning.age<0,'warning was skipped by a long frame');
 }finally{x.weather.reset();}
});

test('native lightning damages an exposed foe once, respects an intact low roof, and remains owner bounded',()=>{
 const x=mainCombatFixture({hero:'tempest'});x.g.weather=new Weather(x.g);x.g.weather.set('clear',{instant:true});try{
  const exposed=x.foe({x:0,z:0}),sheltered=x.foe({x:5,z:0}),outside=x.foe({x:80,z:0});
  x.w.cover.push({x:5,z:0,hx:2,hz:2,top:7});
  const layer=x.g.weather.command({src:x.p,cloud:1,storm:1,radius:40});
  for(let i=0;i<65;i++)x.g.weather.update(1/60);
  layer.boltT=100;layer.lightning.start(new THREE.Vector3(0,.04,0),{warning:true});
  const hp=exposed.hp,safe=sheltered.hp,far=outside.hp;
  for(let i=0;i<30;i++)x.g.weather.update(1/60);assert.equal(exposed.hp,hp);
  for(let i=0;i<60;i++)x.g.weather.update(1/60);assert.ok(exposed.hp<hp);assert.equal(sheltered.hp,safe);assert.equal(outside.hp,far);
  const hitHp=exposed.hp;for(let i=0;i<60;i++)x.g.weather.update(1/60);assert.equal(exposed.hp,hitHp);
  assert.equal(exposed.lastHitBy,x.p);
 }finally{x.g.weather.reset();x.close();}
});

test('build precedes rain and warnings; draining and expiry stop harmful effects before dissipation',()=>{
 const x=fixture('clear');try{
  const layer=x.weather.command({src:x.src,rain:1,cloud:1,storm:1,dur:2,kiPerSec:5});
  x.step(.5);assert.equal(layer.state,'building');assert.ok(!layer.rainField);assert.ok(!layer.lightning);
  assert.ok(Math.abs(x.src.ki-97.5)<1e-8);x.step(.6);assert.equal(layer.state,'active');assert.ok(layer.lightning.age<0);
  x.step(.9);assert.equal(layer.state,'dissipating');assert.equal(layer.lightning.active,false);
  const ki=x.src.ki;x.step(1);assert.equal(x.src.ki,ki);assert.equal(x.weather.layers.size,0);
 }finally{x.weather.reset();}
});

test('depletion, interruption, form change and KO remove only their own resources',()=>{
 for(const end of ['energy','stagger','form','ko','disposed','suppressed']){
  const x=fixture();try{
   const other=x.owner(300),a=x.weather.command({src:x.src,rain:1,cloud:1,storm:1,kiPerSec:3}),b=x.weather.command({src:other,rain:1,cloud:1,storm:1});x.step(1.2);
   if(end==='energy')x.src.ki=.001;if(end==='stagger')x.src.staggerT=1;if(end==='form')x.src._formKey='new';if(end==='ko')x.src.alive=false;if(end==='disposed')x.src._formDisposed=true;if(end==='suppressed')x.src.noPowers=true;
   x.step(.02);assert.equal(x.weather.layers.has(x.src),false,end);assert.equal(a.disposed,true);assert.equal(x.weather.layers.get(other),b);assert.equal(x.weather.stateId,'rain');
   if(end==='energy'){assert.equal(x.src.ki,0);assert.equal(x.game.drained,1);}
  }finally{x.weather.reset();}
 }
});

test('disposing a domain releases instanced GPU buffers as well as its geometries once',()=>{
 const x=fixture('clear');try{
  const layer=x.weather.command({src:x.src,cloud:1,storm:1});x.step(1.2);
  const objects=[layer.cloudMesh,layer.cloudMesh.geometry,layer.lightning.core,layer.lightning.glow,layer.lightning.geometry];
  const counts=objects.map(()=>0);objects.forEach((o,i)=>o.addEventListener('dispose',()=>counts[i]++));
  x.weather.cancelCommand(x.src);layer.dispose();assert.deepEqual(counts,[1,1,1,1,1]);
 }finally{x.weather.reset();}
});

test('rain respects roofs and local audio attenuates outside the domain; reset frees every resource',()=>{
 const x=fixture('clear');x.world.cover.push({x:0,z:0,hx:60,hz:60,top:50});try{
  const layer=x.weather.command({src:x.src,rain:1,cloud:1,storm:1,radius:35});x.step(1.2);
  const geometry=layer.rainField.mesh.geometry,storage=geometry.attributes.position.array;
  for(let i=1;i<storage.length;i+=3)assert.ok(storage[i]>=50);
  const voice=layer.rainVoice;assert.ok(voice);const near=voice.gain;
  x.world.camera.position.x=1000;x.step(.1);assert.ok(voice.gain<near);assert.equal(layer.rainField.mesh.geometry,geometry);assert.equal(geometry.attributes.position.array,storage);
  x.weather.reset();assert.equal(x.weather.layers.size,0);assert.equal(x.game.scene.children.length,0);assert.ok(x.voices.every(v=>v.stopped));assert.ok(x.lights.every(l=>l.intensity===0));
 }finally{x.weather.reset();}
});

test('layer count is capped, refresh replaces only that owner, invalid sources allocate nothing',()=>{
 const x=fixture();try{
  assert.equal(x.weather.command({}),null);assert.equal(x.game.scene.children.length,0);
  for(let i=0;i<20;i++)x.weather.command({src:x.owner(i*100),rain:1,cloud:1});
  assert.equal(x.weather.layers.size,4);
  const src=[...x.weather.layers.keys()][0],old=x.weather.layers.get(src),next=x.weather.command({src,rain:1,cloud:1});
  assert.equal(old.disposed,true);assert.equal(x.weather.layers.get(src),next);assert.equal(x.weather.layers.size,4);
 }finally{x.weather.reset();}
});

test('native TEMPEST Storm Domain runs through the real slot, keeps distinct attacks and cleans on slot disposal',()=>{
 const x=mainCombatFixture({hero:'tempest'});x.g.weather=new Weather(x.g);x.g.weather.set('rain',{instant:true});try{
  const def=x.p.slots.f.def;assert.equal(def.type,'weather');
  const attacks=Object.fromEntries(['lmb','rmb','q','e','r'].map(k=>[k,x.p.slots[k]]));
  x.g.aimPoint.set(5000,0,0);const ki=x.p.ki;
  runSlot(x.p,'f',{pressed:true,held:true,dt:1/60},x.g);
  const layer=x.g.weather.layers.get(x.p);assert.ok(layer);assert.equal(x.p.ki,ki-def.cost);assert.equal(x.g.weather.stateId,'rain');
  assert.ok(layer.center.distanceTo(x.p.pos)<=def.range+.01);assert.equal(layer.radius,def.radius);
  for(const [k,slot] of Object.entries(attacks))assert.equal(x.p.slots[k],slot);
  clearSlotFx(x.p);assert.equal(x.g.weather.layers.size,0);
 }finally{x.g.weather.reset();x.close();}
});

test('native body response sees domain wind even when ambient is clear',()=>{
 const x=mainCombatFixture({hero:'sarge'});x.g.weather=new Weather(x.g);x.g.weather.set('clear',{instant:true});try{
  x.g.weather.command({src:x.p,wind:1.5,cloud:1,radius:40});for(let i=0;i<90;i++)x.g.weather.update(1/60);
  assert.ok(prepareWindBody(x.p,x.g).pressure>100);x.p.pos.x=1000;assert.equal(prepareWindBody(x.p,x.g).driven,false);
 }finally{x.g.weather.reset();x.close();}
});

test('native projectiles receive spatial matter wind and energy shots remain exempt',()=>{
 const x=mainCombatFixture({hero:'tempest'});x.g.weather=new Weather(x.g);x.g.weather.set('none',{instant:true});try{
  x.g.weather.command({src:x.p,wind:1,cloud:1,radius:40});for(let i=0;i<70;i++)x.g.weather.update(1/60);
  const shots=[{ballistic:true,x:0},{ballistic:true,x:150},{ballistic:false,x:0}].map(({ballistic,x:at})=>x.g.projectiles.spawnProjectile(x.p,{pos:new THREE.Vector3(at,30,0),vel:new THREE.Vector3(30,0,0),radius:.25,ballistic,ground:false}));
  x.g.projectiles.update(.1,x.g);
  assert.ok(shots[0].vel.z>1);assert.equal(shots[1].vel.z,0);assert.equal(shots[2].vel.z,0);
 }finally{x.g.weather.reset();x.close();}
});

test('TEMPEST can cancel a cooling domain without another payment and entry cancels a held beam',()=>{
 const x=mainCombatFixture({hero:'tempest'});x.g.weather=new Weather(x.g);x.g.weather.set('rain',{instant:true});try{
  runSlot(x.p,'lmb',{pressed:true,held:true,dt:1/60},x.g);
  const beam=x.p.slots.lmb.active;assert.ok(beam);
  runSlot(x.p,'f',{pressed:true,held:true,dt:1/60},x.g);assert.equal(beam.sustaining,false);
  const ki=x.p.ki;assert.ok(x.p.slots.f.cd>0);
  runSlot(x.p,'f',{pressed:true,held:true,dt:1/60},x.g);assert.equal(x.g.weather.layers.size,0);assert.equal(x.p.ki,ki);assert.equal(x.g.weather.stateId,'rain');
 }finally{x.g.weather.reset();x.close();}
});

test('a bot casts toward its own aim and cannot read another human cursor',()=>{
 const x=mainCombatFixture({hero:'tempest'});x.g.weather=new Weather(x.g);try{
  x.g.humans=[];x.p.pos.set(300,0,400);x.p.aim3.set(0,0,-1);x.g.aimPoint.set(-500,0,-500);
  runSlot(x.p,'f',{pressed:true,held:true,dt:1/60},x.g);
  const layer=x.g.weather.layers.get(x.p);assert.equal(layer.center.x,300);assert.equal(layer.center.z,300);
 }finally{x.g.weather.reset();x.close();}
});

test('real sound admission keeps ambient rain/thunder and four domain voices independently owned',()=>{
 const x=fixture('rain');
 const param=()=>({setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}});
 const node=()=>({connect(){},disconnect(){},start(){},stop(){},frequency:param()});
 const ctx={state:'running',currentTime:0,sampleRate:32,destination:{},createGain:()=>({...node(),gain:param()}),createOscillator:node,createBufferSource:node,createBiquadFilter:node,createBuffer:(_,n)=>({getChannelData:()=>new Float32Array(n)})};
 const audio={ctx,_sus:new Set()},library=new SoundLibrary({audio,storage:null});x.game.audio.soundLibrary=library;
 try{
  x.step(.1);const ambientRain=x.weather._rainVoice;
  const layers=Array.from({length:4},()=>x.weather.command({src:x.owner(),rain:1,cloud:1,storm:1}));x.step(1.2);
  assert.equal([...library.active].filter(h=>h.loop).length,5,'domain rain was denied by the ambient cue cap');
  assert.ok(library.active.has(ambientRain));assert.ok(layers.every(l=>library.active.has(l.rainVoice)));
  x.weather.set('storm',{instant:true});x.step(2);
  const ambientThunder=x.weather._thunderVoice;assert.ok(library.active.has(ambientThunder));
  assert.ok(layers.every(l=>library.active.has(l.thunderVoice)),'another caster or ambient thunder consumed a domain cue admission');
  x.weather.cancelCommand(layers[0].owner);assert.ok(library.active.has(ambientRain));assert.ok(library.active.has(ambientThunder));
  assert.ok(layers.slice(1).every(l=>library.active.has(l.rainVoice)&&library.active.has(l.thunderVoice)));
  x.weather.reset();assert.equal(library.active.size,0);assert.equal(audio._sus.size,0);
 }finally{x.weather.reset();library.stop();}
});

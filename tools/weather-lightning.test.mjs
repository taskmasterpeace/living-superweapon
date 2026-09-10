import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Weather} from '../src/engine/systems.js';
import {SOUND_CUE_BY_ID} from '../src/data/sound-library.js';
import {WeatherLightning,weatherSurface} from '../src/engine/weather-lightning.js';

function fixture(){
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();camera.position.set(0,350,0);
 const calls=[],lights=[],world={scene,camera,heightAt:()=>300,cover:[{x:0,z:0,hx:1000,hz:1000,top:340}],interiors:[]};
 const game={world,scene,entities:[],player:{pos:new THREE.Vector3(0,340,0)},audio:{soundLibrary:{play:(id)=>{const h={id,stopped:false,set(){},stop(){this.stopped=true;}};calls.push(h);return h;}}},
  vfx:{lightning(){},borrowLight:()=>{const light=new THREE.PointLight();light.userData.vfxLease=1;lights.push(light);return light;},returnLight:l=>{l.intensity=0;}},later(){},areaDamage:()=>calls.push({id:'damage'})};
 const weather=new Weather(game);weather.set('storm',{instant:true});return {game,weather,calls,lights};
}
test('storm bolt reaches elevated shelter, flashes the sky and schedules one thunder cue',()=>{
 const {weather,game,calls}=fixture();try{
  weather.update(.016);
  assert.ok(weather._lightning,'weather still uses the ground-level combat spark');
  assert.equal(weather._lightning.position.y,340.04);
  assert.ok(game.world.weatherFlash>0);
  assert.equal(calls.filter(c=>c.id==='weather-thunder').length,0,'thunder preceded distance delay');
  for(let i=0;i<180;i++)weather.update(1/60);
  assert.equal(calls.filter(c=>c.id==='weather-thunder').length,1);
  assert.equal(calls.filter(c=>c.id==='damage').length,0,'natural weather dealt untelegraphed damage');
 }finally{weather.reset();}
});
test('clearing weather cancels delayed thunder, visuals and owned ambience',()=>{
 const {weather,game,calls,lights}=fixture();weather.update(.016);
 const rain=calls.find(c=>c.id==='weather-rain');assert.ok(rain);
 weather.clear();for(let i=0;i<120;i++)weather.update(1/60);
 assert.equal(calls.filter(c=>c.id==='weather-thunder').length,0);
 assert.equal(game.world.weatherFlash,0);assert.ok(lights.every(l=>l.intensity===0));
 weather.reset();assert.equal(game.scene.children.length,0);assert.ok(rain.stopped);
});
test('commanded harmful lightning warns before impact and clearing cancels damage',()=>{
 const {weather,game,calls}=fixture();const src={alive:true};weather.command({rain:1,cloud:1,storm:1,src});
 weather.update(.016);assert.equal(calls.filter(c=>c.id==='damage').length,0);
 for(let i=0;i<30;i++)weather.update(1/60);
 assert.equal(calls.filter(c=>c.id==='damage').length,0);
 weather.clear();for(let i=0;i<90;i++)weather.update(1/60);
 assert.equal(calls.filter(c=>c.id==='damage').length,0);weather.reset();
});
test('weather sounds have replacement-ready phase briefs in the existing harness',()=>{
 for(const id of ['weather-rain','weather-thunder','weather-vortex']){
  const cue=SOUND_CUE_BY_ID.get(id);assert.ok(cue,`missing ${id}`);
  assert.ok(cue.wiring.startsWith('native'));assert.ok(cue.generationPrompt.length>60);
 }
});

test('weather selection owns one vortex, waits for clouds and clears its voice and field',()=>{
 const {weather,game,calls}=fixture();try{
  weather.set('tornado',{instant:true});weather.cloud=.2;weather.update(.016);
  assert.ok(!weather._vortex,'vortex appeared before its storm ceiling');
  weather.cloud=1;weather.update(.016);const vortex=weather._vortex;assert.ok(vortex);
  for(let i=0;i<480;i++)weather.update(1/60);
  assert.equal(weather._vortex,vortex,'weather recreated the vortex during its lifetime');
  assert.equal(game.scene.children.filter(c=>c.name==='weather-tornado').length,1);
  assert.equal(calls.filter(c=>c.id==='weather-vortex').length,1);
  weather.clear();assert.equal(weather._vortex,null);assert.equal(vortex.group.parent,null);
  assert.ok(calls.find(c=>c.id==='weather-vortex').stopped);
  for(let i=0;i<60;i++)weather.update(1/60);
  assert.equal(game.scene.children.filter(c=>c.name==='weather-tornado').length,0);
 }finally{weather.reset();}
});

test('energy beams remain wind-exempt even in hurricane weather',()=>{
 const {weather}=fixture();try{
  weather.set('hurricane',{instant:true});assert.deepEqual(weather.force('energy'),{x:0,y:0,z:0});
  assert.ok(Math.hypot(weather.force('ballistic').x,weather.force('ballistic').z)>0);
 }finally{weather.reset();}
});
test('a warned commanded strike damages exactly once after its warning',()=>{
 const {weather,calls}=fixture();weather.command({rain:1,cloud:1,storm:1,src:{alive:true}});
 try{for(let i=0;i<120;i++)weather.update(1/60);assert.equal(calls.filter(c=>c.id==='damage').length,1);}
 finally{weather.reset();}
});
test('lightning honors removed roofs, keeps its storage and leaves a stolen light alone',()=>{
 const {game,weather,lights}=fixture(),bolt=new WeatherLightning(game);
 try{
  game.world.cover[0].destroyed=true;assert.equal(weatherSurface(game.world,0,0),300.04);
  const geometry=bolt.core.geometry,storage=bolt.core.instanceMatrix.array;
  for(let i=0;i<5;i++){bolt.start(new THREE.Vector3(0,300.04,0));bolt.update(.016);bolt.update(.5);}
  assert.equal(bolt.core.geometry,geometry);assert.equal(bolt.core.instanceMatrix.array,storage);assert.equal(bolt.core.count,42);
  bolt.start(new THREE.Vector3(0,300.04,0));bolt.update(.016);
  const light=lights.at(-1);light.userData.vfxLease++;light.intensity=55;bolt.update(.01);bolt.cancel();assert.equal(light.intensity,55);
 }finally{bolt.dispose();weather.reset();}
});
test('reduced-motion lightning is one soft pulse and reset removes all strike state',()=>{
 const {game,weather}=fixture(),bolt=new WeatherLightning(game);
 bolt.start(new THREE.Vector3(0,300,0),{reduced:true});let max=0;
 for(let i=0;i<60;i++){bolt.update(.01);max=Math.max(max,bolt.flash);if(i>25)assert.equal(bolt.flash,0);}
 assert.ok(max<=.16);assert.equal(bolt.active,false);bolt.dispose();weather.reset();
 assert.equal(game.scene.children.length,0);assert.equal(game.world.weatherFlash,0);
});

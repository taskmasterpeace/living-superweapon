import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Weather} from '../src/engine/systems.js';
import {World} from '../src/engine/world.js';

function fixture(y=20){
 const world=Object.create(World.prototype);
 Object.assign(world,{camera:new THREE.PerspectiveCamera(),_gseg:1,_ghArena:1000,_gh:new Float32Array([30,110,30,110]),_ghTriangles:true,cover:[],interiors:[]});
 world.camera.position.set(0,y,0);
 const game={world,scene:new THREE.Scene(),entities:[]};
 const weather=new Weather(game);weather.set('rain',{instant:true});return {world,game,weather};
}
function points(weather){const a=weather._mesh.geometry.attributes.position;return Array.from({length:a.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(a,i));}
test('rain starts around a high flying camera and follows long teleports immediately',()=>{
 const {world,weather}=fixture(3000);try{
  weather.update(1/60);
  assert.ok(points(weather).every(p=>p.y>2900&&p.y<3150),'rain remained at world-zero height');
  world.camera.position.set(4000,5000,-3000);weather.update(1/60);
  assert.ok(points(weather).every(p=>Math.abs(p.x-4000)<=150&&Math.abs(p.z+3000)<=150&&p.y>4900&&p.y<5150));
 }finally{weather.dispose();}
});
test('rain cannot occupy terrain or intact roofs, including cutaway interiors',()=>{
 const {world,weather}=fixture(130);world.cover.push({x:0,z:0,hx:60,hz:60,top:160});
 world.interiors.push({x:90,z:0,hx:25,hz:65,top:180,meshes:[]});
 try{for(let frame=0;frame<100;frame++){
  weather.update(1/60);
  for(const p of points(weather)){
   assert.ok(p.y>=70+p.x*.04-1e-4,'rain below sloped terrain');
   if(Math.abs(p.x)<=60&&Math.abs(p.z)<=60)assert.ok(p.y>=160,'rain inside intact roof');
   if(Math.abs(p.x-90)<=25&&Math.abs(p.z)<=65)assert.ok(p.y>=180,'rain inside cutaway building');
  }
 }}finally{weather.dispose();}
});
test('destroyed cover no longer shelters rain; buffers stay bounded through wind and travel',()=>{
 const {world,weather}=fixture(130),roof={x:0,z:0,hx:1000,hz:1000,top:160};world.cover.push(roof);
 try{weather.update(1/60);const mesh=weather._mesh,array=mesh.geometry.attributes.position.array;
  roof.destroyed=true;weather.wind=2;weather._target.wind=2;
  for(let i=0;i<120;i++)weather.update(1/60);
  assert.ok(points(weather).some(p=>p.y<150),'removed roof still blocks rainfall');
  assert.equal(weather._mesh,mesh);assert.equal(mesh.geometry.attributes.position.array,array);
  assert.ok(array.length<=1400*6&&points(weather).every(p=>Number.isFinite(p.y)&&Math.abs(p.x)<=150&&Math.abs(p.z)<=150));
 }finally{weather.dispose();}
});
test('match reset removes weather and cannot recreate old rain on the next update',()=>{
 const {game,weather}=fixture();weather.update(.016);assert.equal(game.scene.children.length,1);
 assert.equal(typeof weather.reset,'function');weather.reset();weather.update(.016);
 assert.equal(game.scene.children.length,0);assert.equal(weather.rain,0);assert.equal(weather._src,null);
});
test('rain publishes cloud cover to the lighting owner and reset restores clear presentation',()=>{
 const {world,weather}=fixture();try{weather.update(.016);assert.ok(world.weatherCloud>.5);
  weather.reset();assert.equal(world.weatherCloud,0);
 }finally{weather.dispose();}
});

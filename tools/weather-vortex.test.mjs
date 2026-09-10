import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WeatherVortex} from '../src/engine/weather-vortex.js';

function fixture(kind='tornado'){
 const scene=new THREE.Scene(),game={scene,world:{heightAt:()=>70},audio:{soundLibrary:{play:()=>({set(){},stop(){}})}}};
 return {game,v:new WeatherVortex(game,{kind,x:0,z:0,radius:60,height:180})};
}
test('tornado warns, then pulls and lifts; low-force center is not an instant damage zone',()=>{
 const {v}=fixture(),out={};try{
  v.sample({x:40,y:70,z:0},out);assert.equal(out.x,0);assert.equal(out.y,0);
  v.update(6);v.sample({x:40,y:70,z:0},out);assert.ok(out.x<0&&out.z>0&&out.y>60);
  const ring=Math.hypot(out.x,out.z);v.sample({x:0,y:70,z:0},out);assert.ok(Math.hypot(out.x,out.z)<ring*.2);
  v.sample({x:500,y:70,z:0},out);assert.equal(out.y,0);assert.equal(out.x,0);
 }finally{v.dispose();}
});
test('top outflow ejects instead of trapping bodies above the funnel',()=>{
 const {v}=fixture(),out={};try{v.update(8);v.sample({x:40,y:230,z:0},out);assert.ok(out.x>0);assert.ok(out.y<30);}finally{v.dispose();}
});
test('hurricane has a broad eye and eyewall without tornado updraft',()=>{
 const {v}=fixture('hurricane'),out={};try{
  v.update(8);v.sample({x:0,y:70,z:0},out);assert.equal(out.y,0);assert.equal(out.x,0);
  v.sample({x:42,y:70,z:0},out);assert.ok(Math.hypot(out.x,out.z)>40);assert.equal(out.y,0);
 }finally{v.dispose();}
});
test('visual storage stays bounded and disposal removes all owned scene objects',()=>{
 const {v,game}=fixture();const count=game.scene.children.length;
 for(let i=0;i<600;i++)v.update(1/60);
 assert.equal(game.scene.children.length,count);assert.ok(v.group.children.length<=4);
 v.dispose();assert.equal(game.scene.children.length,0);
});
